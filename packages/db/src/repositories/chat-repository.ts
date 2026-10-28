import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ChatMessageDto, ChatMode, HandRaiseItem } from '@educlass/protocol';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import {
  chatMessages,
  participants,
  type ChatMessageInsert,
  type ChatMessageSelect,
} from '../schema/index.js';

export class ChatRepository {
  /**
   * Lưu trạng thái khóa chat theo từng phiên học (mặc định: true = khóa)
   */
  private readonly sessionChatLocks = new Map<string, boolean>();

  /**
   * Lưu chế độ chat: 'locked' | 'teacher_only' | 'open' (mặc định: 'locked')
   */
  private readonly sessionChatModes = new Map<string, ChatMode>();

  /**
   * Danh sách học sinh đang giơ tay xin giúp đỡ trong từng phiên
   */
  private readonly sessionHandRaises = new Map<string, Map<string, HandRaiseItem>>();

  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một tin nhắn mới trong phòng học
   */
  async createMessage(data: {
    id?: string | undefined;
    sessionId: string;
    fromParticipantId?: string | null | undefined;
    toParticipantId?: string | null | undefined;
    fromTeacher: boolean;
    text: string;
    ts?: number | undefined;
  }): Promise<ChatMessageSelect> {
    const id = data.id ?? generateId();
    const ts = data.ts ?? Date.now();

    const payload: ChatMessageInsert = {
      id,
      sessionId: data.sessionId,
      fromParticipantId: data.fromParticipantId ?? null,
      toParticipantId: data.toParticipantId ?? null,
      fromTeacher: data.fromTeacher,
      text: data.text,
      ts,
    };

    await this.db.insert(chatMessages).values(payload);

    const created = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, id))
      .limit(1);

    return created[0]!;
  }

  /**
   * Lấy danh sách tin nhắn trong phiên học (có lọc bảo mật theo đối tượng GV / HS)
   */
  async listMessages(
    sessionId: string,
    options?: {
      forParticipantId?: string | undefined;
      isTeacher?: boolean | undefined;
      limit?: number | undefined;
    }
  ): Promise<ChatMessageDto[]> {
    const fromParticipant = alias(participants, 'from_p');
    const toParticipant = alias(participants, 'to_p');

    const limit = options?.limit ?? 200;

    // Thiết lập điều kiện lọc dựa theo quyền xem
    let filterCondition = eq(chatMessages.sessionId, sessionId);

    if (!options?.isTeacher && options?.forParticipantId) {
      const pid = options.forParticipantId;
      // Học sinh chỉ thấy:
      // 1. Tin chung (toParticipantId IS NULL)
      // 2. Tin riêng gửi đến chính học sinh này (toParticipantId = pid)
      // 3. Tin riêng do chính học sinh này gửi đi (fromParticipantId = pid)
      filterCondition = and(
        eq(chatMessages.sessionId, sessionId),
        or(isNull(chatMessages.toParticipantId), eq(chatMessages.toParticipantId, pid))
      )!;
    }

    const rows = await this.db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        fromParticipantId: chatMessages.fromParticipantId,
        toParticipantId: chatMessages.toParticipantId,
        fromTeacher: chatMessages.fromTeacher,
        text: chatMessages.text,
        ts: chatMessages.ts,
        fromParticipantName: fromParticipant.displayName,
        toParticipantName: toParticipant.displayName,
      })
      .from(chatMessages)
      .leftJoin(fromParticipant, eq(chatMessages.fromParticipantId, fromParticipant.id))
      .leftJoin(toParticipant, eq(chatMessages.toParticipantId, toParticipant.id))
      .where(filterCondition)
      .orderBy(desc(chatMessages.ts))
      .limit(limit);

    // Trả về thứ tự thời gian tăng dần để UI render từ trên xuống dưới
    const sorted = rows.reverse();

    return sorted.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      fromParticipantId: row.fromParticipantId,
      fromParticipantName: row.fromParticipantName ?? (row.fromTeacher ? 'Thầy/Cô' : null),
      toParticipantId: row.toParticipantId,
      toParticipantName: row.toParticipantName,
      fromTeacher: Boolean(row.fromTeacher),
      kind: row.text.startsWith('✋') ? ('hand_raise' as const) : ('text' as const),
      text: row.text,
      ts: row.ts,
    }));
  }

  /**
   * Kiểm tra xem chat trong phiên có đang bị khóa hay không (mặc định: true = khóa)
   */
  isChatLocked(sessionId: string): boolean {
    return this.sessionChatLocks.get(sessionId) ?? true;
  }

  /**
   * Lấy chế độ chat hiện tại trong phiên học (mặc định: 'locked')
   */
  getChatMode(sessionId: string): ChatMode {
    return this.sessionChatModes.get(sessionId) ?? 'locked';
  }

  /**
   * Cập nhật chế độ chat từ Giáo viên ('locked' | 'teacher_only' | 'open')
   */
  setChatMode(sessionId: string, mode: ChatMode): void {
    this.sessionChatModes.set(sessionId, mode);
    this.sessionChatLocks.set(sessionId, mode === 'locked');
  }

  /**
   * Cập nhật trạng thái khóa chat từ Giáo viên (hỗ trợ tương thích ngược boolean)
   */
  setChatLocked(sessionId: string, locked: boolean): void {
    this.sessionChatLocks.set(sessionId, locked);
    this.sessionChatModes.set(sessionId, locked ? 'locked' : 'teacher_only');
  }

  /**
   * Học sinh giơ tay xin trợ giúp (Nút ✋)
   */
  addHandRaise(sessionId: string, item: HandRaiseItem): void {
    let map = this.sessionHandRaises.get(sessionId);
    if (!map) {
      map = new Map<string, HandRaiseItem>();
      this.sessionHandRaises.set(sessionId, map);
    }
    map.set(item.participantId, item);
  }

  /**
   * Giáo viên hạ tay / đã giải quyết yêu cầu trợ giúp của học sinh
   */
  resolveHandRaise(sessionId: string, participantId: string): boolean {
    const map = this.sessionHandRaises.get(sessionId);
    if (!map) return false;
    const removed = map.delete(participantId);
    return removed;
  }

  /**
   * Lấy danh sách học sinh đang giơ tay xin trợ giúp trong phiên
   */
  getActiveHandRaises(sessionId: string): HandRaiseItem[] {
    const map = this.sessionHandRaises.get(sessionId);
    if (!map) return [];
    return Array.from(map.values()).sort((a, b) => a.requestedAt - b.requestedAt);
  }

  /**
   * Dọn dẹp dữ liệu khi phiên kết thúc
   */
  clearSessionState(sessionId: string): void {
    this.sessionChatLocks.delete(sessionId);
    this.sessionChatModes.delete(sessionId);
    this.sessionHandRaises.delete(sessionId);
  }
}
