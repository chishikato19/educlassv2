import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ChatRepository } from '../repositories/chat-repository.js';
import { ParticipantRepository } from '../repositories/participant-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('ChatRepository (Task 5.2)', () => {
  it('creates and lists messages with security filtering between teacher and students', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const sessionRepo = new SessionRepository(db);
      const participantRepo = new ParticipantRepository(db);
      const chatRepo = new ChatRepository(db);

      // 1. Tạo giáo viên và mở phiên học
      const teacher = await userRepo.create({
        username: 'gv_loan',
        passwordHash: 'hash',
        displayName: 'Cô Loan',
        role: 'teacher',
      });

      const session = await sessionRepo.create({
        ownerId: teacher.id,
        joinCode: '123456',
        identityMode: 'guest_only',
        openedAt: Date.now(),
      });

      // 2. Tạo 2 học sinh tham gia phiên
      const hs1 = await participantRepo.create({
        sessionId: session.id,
        displayName: 'Học sinh An',
        identityLevel: 'guest',
        joinedAt: Date.now(),
      });

      const hs2 = await participantRepo.create({
        sessionId: session.id,
        displayName: 'Học sinh Bình',
        identityLevel: 'guest',
        joinedAt: Date.now(),
      });

      // 3. Tạo các tin nhắn:
      // a. Tin chung của GV gửi cả lớp
      await chatRepo.createMessage({
        sessionId: session.id,
        fromTeacher: true,
        text: 'Chào cả lớp, các em ổn định chỗ ngồi nhé!',
      });

      // b. Tin chung của HS 1 gửi cả lớp
      await chatRepo.createMessage({
        sessionId: session.id,
        fromParticipantId: hs1.id,
        fromTeacher: false,
        text: 'Em chào cô ạ!',
      });

      // c. Tin riêng của HS 1 gửi riêng cho GV
      await chatRepo.createMessage({
        sessionId: session.id,
        fromParticipantId: hs1.id,
        toParticipantId: hs1.id, // cuộc hội thoại riêng của HS 1 với GV
        fromTeacher: false,
        text: 'Cô ơi em bị mờ mắt không thấy rõ đề.',
      });

      // d. Tin riêng của GV trả lời riêng cho HS 1
      await chatRepo.createMessage({
        sessionId: session.id,
        fromTeacher: true,
        toParticipantId: hs1.id,
        text: 'Để cô phóng to máy chiếu cho An nhé.',
      });

      // e. Tin riêng của GV gửi riêng cho HS 2
      await chatRepo.createMessage({
        sessionId: session.id,
        fromTeacher: true,
        toParticipantId: hs2.id,
        text: 'Bình làm bài tập số 2 chưa em?',
      });

      // 4. Kiểm tra quyền xem của Giáo viên (isTeacher: true)
      const teacherMessages = await chatRepo.listMessages(session.id, { isTeacher: true });
      expect(teacherMessages).toHaveLength(5); // Giáo viên xem được tất cả 5 tin

      // 5. Kiểm tra quyền xem của HS 1:
      // HS 1 thấy tin chung (a, b) + tin riêng liên quan đến HS 1 (c, d). KHÔNG thấy tin (e) của HS 2.
      const hs1Messages = await chatRepo.listMessages(session.id, { forParticipantId: hs1.id });
      expect(hs1Messages).toHaveLength(4);
      expect(hs1Messages.some(m => m.text.includes('Bình làm bài tập số 2'))).toBe(false);

      // 6. Kiểm tra quyền xem của HS 2:
      // HS 2 thấy tin chung (a, b) + tin riêng gửi cho HS 2 (e). KHÔNG thấy tin (c, d) của HS 1.
      const hs2Messages = await chatRepo.listMessages(session.id, { forParticipantId: hs2.id });
      expect(hs2Messages).toHaveLength(3);
      expect(hs2Messages.some(m => m.text.includes('Bình làm bài tập số 2'))).toBe(true);
      expect(hs2Messages.some(m => m.text.includes('mờ mắt'))).toBe(false);
    } finally {
      close();
    }
  });

  it('manages chat lock state and hand raise requests', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const chatRepo = new ChatRepository(db);
      const sessionId = 'session_test_123';

      // Khóa chat mặc định là true (mặc định khóa chat)
      expect(chatRepo.isChatLocked(sessionId)).toBe(true);
      expect(chatRepo.getChatMode(sessionId)).toBe('locked');

      // GV mở chế độ chỉ chat với GV
      chatRepo.setChatMode(sessionId, 'teacher_only');
      expect(chatRepo.isChatLocked(sessionId)).toBe(false);
      expect(chatRepo.getChatMode(sessionId)).toBe('teacher_only');

      // GV khóa lại chat
      chatRepo.setChatLocked(sessionId, true);
      expect(chatRepo.isChatLocked(sessionId)).toBe(true);
      expect(chatRepo.getChatMode(sessionId)).toBe('locked');

      // HS giơ tay xin trợ giúp
      chatRepo.addHandRaise(sessionId, {
        participantId: 'p_1',
        participantName: 'Em Hùng',
        requestedAt: Date.now(),
        message: 'Em không tải được hình ảnh',
      });

      chatRepo.addHandRaise(sessionId, {
        participantId: 'p_2',
        participantName: 'Em Lan',
        requestedAt: Date.now() + 10,
      });

      let handRaises = chatRepo.getActiveHandRaises(sessionId);
      expect(handRaises).toHaveLength(2);
      expect(handRaises[0]?.participantName).toBe('Em Hùng');

      // GV hạ tay học sinh đã giải quyết
      const resolved = chatRepo.resolveHandRaise(sessionId, 'p_1');
      expect(resolved).toBe(true);

      handRaises = chatRepo.getActiveHandRaises(sessionId);
      expect(handRaises).toHaveLength(1);
      expect(handRaises[0]?.participantId).toBe('p_2');

      // Dọn dẹp phiên
      chatRepo.clearSessionState(sessionId);
      expect(chatRepo.getActiveHandRaises(sessionId)).toHaveLength(0);
    } finally {
      close();
    }
  });
});
