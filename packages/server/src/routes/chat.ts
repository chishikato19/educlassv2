import type { FastifyPluginAsync } from 'fastify';
import type { ChatRepository, ParticipantRepository, SessionRepository } from '@educlass/db';
import {
  createEnvelope,
  formatProtocolError,
  HandRaiseRequestSchema,
  ResolveHandRaiseRequestSchema,
  SendChatMessageRequestSchema,
  ToggleChatLockRequestSchema,
  type ChatMessageDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import type { TokenService } from '../auth/token-service.js';
import type { WsGatewayManager } from '../ws/gateway.js';

export interface ChatRoutesOptions {
  chatRepo: ChatRepository;
  sessionRepo: SessionRepository;
  participantRepo: ParticipantRepository;
  authService: AuthService;
  tokenService: TokenService;
  wsManager: WsGatewayManager;
}

export const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (fastify, options) => {
  const { chatRepo, sessionRepo, participantRepo, authService, tokenService, wsManager } = options;

  /**
   * Helper kiểm tra xem request có phải do Giáo viên sở hữu phiên gửi hay không
   */
  async function resolveTeacher(request: {
    headers: { authorization?: string | undefined };
  }): Promise<{ isTeacher: boolean; teacherId?: string }> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isTeacher: false };
    }
    const token = authHeader.slice(7);
    const user = await authService.validateSession(token);
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      return { isTeacher: true, teacherId: user.id };
    }
    return { isTeacher: false };
  }

  /**
   * Helper xác định người tham gia từ token hoặc header
   */
  function resolveParticipantId(request: { headers: Record<string, unknown> }): string | undefined {
    // 1. Kiểm tra header x-participant-id
    const pHeader = request.headers['x-participant-id'];
    if (typeof pHeader === 'string' && pHeader.trim().length > 0) {
      return pHeader.trim();
    }

    // 2. Kiểm tra participantToken trong authorization nếu là token học sinh
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const verified = tokenService.verifyParticipantToken(token);
      if (verified?.participantId) {
        return verified.participantId;
      }
    }

    return undefined;
  }

  /**
   * GET /api/sessions/:sessionId/chat/status
   * Lấy trạng thái phòng chat (khóa/mở và danh sách các bạn đang giơ tay ✋)
   */
  fastify.get<{ Params: { sessionId: string } }>(
    '/api/sessions/:sessionId/chat/status',
    async (request, reply) => {
      const { sessionId } = request.params;
      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return reply.status(404).send({
          error: formatProtocolError('SESSION_NOT_FOUND'),
        });
      }

      const chatLocked = chatRepo.isChatLocked(sessionId);
      const chatMode = chatRepo.getChatMode(sessionId);
      const activeHandRaises = chatRepo.getActiveHandRaises(sessionId);

      return reply.status(200).send({
        sessionId,
        chatLocked,
        chatMode,
        activeHandRaises,
      });
    }
  );

  /**
   * GET /api/sessions/:sessionId/chat/messages
   * Lấy lịch sử tin nhắn phòng học (có bảo mật tin riêng)
   */
  fastify.get<{
    Params: { sessionId: string };
    Querystring: { participantId?: string };
  }>('/api/sessions/:sessionId/chat/messages', async (request, reply) => {
    const { sessionId } = request.params;
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: formatProtocolError('SESSION_NOT_FOUND'),
      });
    }

    const { isTeacher } = await resolveTeacher(request);
    const participantId = request.query.participantId || resolveParticipantId(request);

    const messages = await chatRepo.listMessages(sessionId, {
      isTeacher,
      forParticipantId: participantId,
    });

    const chatLocked = chatRepo.isChatLocked(sessionId);
    const chatMode = chatRepo.getChatMode(sessionId);

    return reply.status(200).send({
      messages,
      total: messages.length,
      chatLocked,
      chatMode,
    });
  });

  /**
   * POST /api/sessions/:sessionId/chat/messages
   * Gửi tin nhắn mới vào phòng học (hỗ trợ tin chung và tin riêng GV↔HS)
   */
  fastify.post<{
    Params: { sessionId: string };
    Body: unknown;
  }>('/api/sessions/:sessionId/chat/messages', async (request, reply) => {
    const { sessionId } = request.params;
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: formatProtocolError('SESSION_NOT_FOUND'),
      });
    }

    if (session.status === 'closed') {
      return reply.status(400).send({
        error: formatProtocolError('SESSION_CLOSED'),
      });
    }

    const parseResult = SendChatMessageRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Tin nhắn không hợp lệ',
          parseResult.error.format()
        ),
      });
    }

    const { text, toParticipantId, kind } = parseResult.data;
    const { isTeacher } = await resolveTeacher(request);
    const participantId = resolveParticipantId(request);

    // Kiểm tra quyền gửi khi chat bị khóa:
    // Nếu chat bị khóa và người gửi không phải là giáo viên, từ chối tin nhắn thường
    const currentMode = chatRepo.getChatMode(sessionId);
    if (!isTeacher && kind !== 'hand_raise' && currentMode === 'locked') {
      return reply.status(403).send({
        error: formatProtocolError('CHAT_LOCKED'),
      });
    }

    let createdRecord;
    let senderName = 'Thầy/Cô';
    let targetParticipantName: string | null = null;

    if (isTeacher) {
      // Tin do Giáo viên gửi
      if (toParticipantId) {
        const targetP = await participantRepo.findById(toParticipantId);
        targetParticipantName = targetP?.displayName ?? null;
      }

      createdRecord = await chatRepo.createMessage({
        sessionId,
        fromTeacher: true,
        toParticipantId: toParticipantId ?? null,
        text,
      });
    } else {
      // Tin do Học sinh gửi
      if (!participantId) {
        return reply.status(401).send({
          error: formatProtocolError('UNAUTHORIZED', 'Thiếu thông tin người tham gia.'),
        });
      }

      const p = await participantRepo.findById(participantId);
      if (!p) {
        return reply.status(404).send({
          error: formatProtocolError('PARTICIPANT_NOT_FOUND'),
        });
      }
      senderName = p.displayName;

      // Nếu chế độ là 'teacher_only' hoặc học sinh chọn gửi riêng cho GV:
      // Cuộc hội thoại riêng tư được gắn toParticipantId = participantId (học sinh khác không thấy)
      const isPrivateToTeacher = currentMode === 'teacher_only' || Boolean(toParticipantId);
      const finalToParticipantId = isPrivateToTeacher ? participantId : null;

      createdRecord = await chatRepo.createMessage({
        sessionId,
        fromParticipantId: participantId,
        fromTeacher: false,
        toParticipantId: finalToParticipantId,
        text,
      });
    }

    const messageDto: ChatMessageDto = {
      id: createdRecord.id,
      sessionId: createdRecord.sessionId,
      fromParticipantId: createdRecord.fromParticipantId,
      fromParticipantName: senderName,
      toParticipantId: createdRecord.toParticipantId,
      toParticipantName: targetParticipantName,
      fromTeacher: Boolean(createdRecord.fromTeacher),
      kind: (kind as ChatMessageDto['kind']) ?? 'text',
      text: createdRecord.text,
      ts: createdRecord.ts,
    };

    // Phát sóng realtime qua WebSocket Gateway:
    // Nếu là tin nhắn riêng: CHỈ phát sóng tới Giáo viên và học sinh liên quan, học sinh khác KHÔNG THẤY
    const envelope = createEnvelope({
      id: createdRecord.id,
      type: 'chat:new_message',
      sessionId,
      payload: messageDto,
    });

    if (createdRecord.toParticipantId) {
      wsManager.broadcast(envelope, client => {
        if (client.sessionId !== sessionId) return false;
        // Giáo viên (không có participantId trong socket) luôn nhận được tin
        if (!client.participantId) return true;
        // Học sinh chỉ nhận được nếu là chính người nhận hoặc người gửi
        return (
          client.participantId === createdRecord.toParticipantId ||
          client.participantId === createdRecord.fromParticipantId
        );
      });
    } else {
      // Tin nhắn công khai toàn lớp
      wsManager.broadcastToSession(sessionId, envelope);
    }

    return reply.status(201).send({
      success: true,
      message: messageDto,
    });
  });

  /**
   * PATCH /api/sessions/:sessionId/chat/lock
   * Giáo viên Bật/Tắt khóa chat hoặc thay đổi chế độ trò chuyện trong phòng
   */
  fastify.patch<{
    Params: { sessionId: string };
    Body: unknown;
  }>('/api/sessions/:sessionId/chat/lock', async (request, reply) => {
    const { sessionId } = request.params;
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: formatProtocolError('SESSION_NOT_FOUND'),
      });
    }

    const { isTeacher } = await resolveTeacher(request);
    if (!isTeacher) {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Chỉ giáo viên mới có quyền khóa/mở chat.'),
      });
    }

    const parseResult = ToggleChatLockRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu khóa chat không hợp lệ.'),
      });
    }

    const { locked, chatMode } = parseResult.data;
    if (chatMode) {
      chatRepo.setChatMode(sessionId, chatMode);
    } else if (locked !== undefined) {
      chatRepo.setChatLocked(sessionId, locked);
    }

    const currentLocked = chatRepo.isChatLocked(sessionId);
    const currentMode = chatRepo.getChatMode(sessionId);

    // Phát sóng trạng thái khóa chat tới tất cả người tham gia
    const lockEnvelope = createEnvelope({
      id: `${sessionId}-lock-${Date.now()}`,
      type: 'chat:lock_state',
      sessionId,
      payload: { locked: currentLocked, chatMode: currentMode },
    });
    wsManager.broadcastToSession(sessionId, lockEnvelope);

    return reply.status(200).send({
      success: true,
      chatLocked: currentLocked,
      chatMode: currentMode,
    });
  });

  /**
   * POST /api/sessions/:sessionId/chat/hand-raise
   * Học sinh bấm nút ✋ xin trợ giúp từ thầy/cô
   */
  fastify.post<{
    Params: { sessionId: string };
    Body: unknown;
  }>('/api/sessions/:sessionId/chat/hand-raise', async (request, reply) => {
    const { sessionId } = request.params;
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: formatProtocolError('SESSION_NOT_FOUND'),
      });
    }

    const participantId = resolveParticipantId(request);
    if (!participantId) {
      return reply.status(401).send({
        error: formatProtocolError('UNAUTHORIZED', 'Thiếu thông tin người tham gia.'),
      });
    }

    const p = await participantRepo.findById(participantId);
    if (!p) {
      return reply.status(404).send({
        error: formatProtocolError('PARTICIPANT_NOT_FOUND'),
      });
    }

    const parseResult = HandRaiseRequestSchema.safeParse(request.body ?? {});
    const customMessage = parseResult.success ? parseResult.data.message : undefined;

    const handRaiseItem = {
      participantId,
      participantName: p.displayName,
      requestedAt: Date.now(),
      message: customMessage,
    };

    chatRepo.addHandRaise(sessionId, handRaiseItem);

    // Tạo tin nhắn thông báo riêng cho thầy/cô
    const alertText = `✋ ${p.displayName} đang xin trợ giúp!${
      customMessage ? ` ("${customMessage}")` : ''
    }`;
    const msg = await chatRepo.createMessage({
      sessionId,
      fromParticipantId: participantId,
      fromTeacher: false,
      toParticipantId: participantId, // tin riêng với GV
      text: alertText,
    });

    const handRaiseEnvelope = createEnvelope({
      id: msg.id,
      type: 'chat:hand_raise',
      sessionId,
      payload: handRaiseItem,
    });
    wsManager.broadcastToSession(sessionId, handRaiseEnvelope);

    return reply.status(200).send({
      success: true,
      handRaise: handRaiseItem,
    });
  });

  /**
   * POST /api/sessions/:sessionId/chat/hand-raise/resolve
   * Giáo viên đã hỗ trợ xong và hạ tay học sinh
   */
  fastify.post<{
    Params: { sessionId: string };
    Body: unknown;
  }>('/api/sessions/:sessionId/chat/hand-raise/resolve', async (request, reply) => {
    const { sessionId } = request.params;
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({
        error: formatProtocolError('SESSION_NOT_FOUND'),
      });
    }

    const { isTeacher } = await resolveTeacher(request);
    if (!isTeacher) {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Chỉ giáo viên mới có quyền hạ tay học sinh.'),
      });
    }

    const parseResult = ResolveHandRaiseRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Thiếu participantId cần hạ tay.'),
      });
    }

    const { participantId } = parseResult.data;
    const resolved = chatRepo.resolveHandRaise(sessionId, participantId);

    // Phát sóng trạng thái đã giải quyết
    const resolveEnvelope = createEnvelope({
      id: `${sessionId}-resolved-${participantId}-${Date.now()}`,
      type: 'chat:hand_raise_resolved',
      sessionId,
      payload: { participantId },
    });
    wsManager.broadcastToSession(sessionId, resolveEnvelope);

    return reply.status(200).send({
      success: true,
      resolved,
    });
  });
};
