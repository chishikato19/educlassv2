import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';
import { TokenService } from '../auth/token-service.js';

describe('Chat Server Routes & Realtime Flow (Task 5.2)', () => {
  it('supports public/private chat, chat locking by teacher, and hand raise requests', async () => {
    const tokenService = new TokenService();
    const app = await buildServer({
      tokenService,
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập Giáo viên và mở một phiên học
      const teacher = await app.userRepo.create({
        username: 'gv_chat_test',
        passwordHash: 'hash',
        displayName: 'Thầy Đức',
        role: 'teacher',
      });
      const teacherToken = tokenService.createToken(teacher);

      const session = await app.sessionRepo.create({
        ownerId: teacher.id,
        joinCode: '654321',
        identityMode: 'guest_only',
        openedAt: Date.now(),
      });

      // 2. Hai học sinh tham gia phiên
      const hs1 = await app.participantRepo.create({
        sessionId: session.id,
        displayName: 'Học sinh Tuấn',
        identityLevel: 'guest',
        joinedAt: Date.now(),
      });
      const hs1Token = tokenService.createParticipantToken({
        participantId: hs1.id,
        sessionId: session.id,
        identityLevel: 'guest',
      });

      const hs2 = await app.participantRepo.create({
        sessionId: session.id,
        displayName: 'Học sinh Hương',
        identityLevel: 'guest',
        joinedAt: Date.now(),
      });
      const hs2Token = tokenService.createParticipantToken({
        participantId: hs2.id,
        sessionId: session.id,
        identityLevel: 'guest',
      });

      // 3. Kiểm tra trạng thái ban đầu: Mặc định là khóa chat (Task 5.2 update)
      const initialStatusRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/status`,
      });
      expect(initialStatusRes.statusCode).toBe(200);
      expect(JSON.parse(initialStatusRes.body).chatLocked).toBe(true);
      expect(JSON.parse(initialStatusRes.body).chatMode).toBe('locked');

      // GV mở chat cả lớp
      await app.inject({
        method: 'PATCH',
        url: `/api/sessions/${session.id}/chat/lock`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { chatMode: 'open' },
      });

      // GV gửi tin nhắn chung cả lớp
      const gvMsgRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { text: 'Chào các em, chúng ta bắt đầu tiết học!' },
      });
      expect(gvMsgRes.statusCode).toBe(201);
      const gvMsg = JSON.parse(gvMsgRes.body).message;
      expect(gvMsg.fromTeacher).toBe(true);
      expect(gvMsg.fromParticipantName).toBe('Thầy/Cô');
      expect(gvMsg.toParticipantId).toBeNull();

      // 4. HS 1 gửi tin nhắn chung cả lớp (khi mode: open)
      const hs1MsgRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs1Token}` },
        payload: { text: 'Dạ chúng em đã sẵn sàng ạ!' },
      });
      expect(hs1MsgRes.statusCode).toBe(201);
      const hs1Msg = JSON.parse(hs1MsgRes.body).message;
      expect(hs1Msg.fromTeacher).toBe(false);
      expect(hs1Msg.fromParticipantName).toBe('Học sinh Tuấn');

      // 5. HS 1 gửi tin riêng cho GV
      const hs1PrivRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs1Token}` },
        payload: {
          text: 'Thầy ơi em chưa hiểu bài tập số 3.',
          toParticipantId: 'teacher', // đánh dấu gửi riêng cho GV
        },
      });
      expect(hs1PrivRes.statusCode).toBe(201);
      const hs1Priv = JSON.parse(hs1PrivRes.body).message;
      expect(hs1Priv.toParticipantId).toBe(hs1.id);

      // 6. GV gửi tin riêng trả lời cho HS 1
      const gvPrivRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          text: 'Tuấn chú ý đọc lại công thức ở slide 4 nhé.',
          toParticipantId: hs1.id,
        },
      });
      expect(gvPrivRes.statusCode).toBe(201);

      // 7. Kiểm tra tính bảo mật khi xem tin nhắn:
      // a. GV xem được tất cả 4 tin
      const gvListRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });
      expect(gvListRes.statusCode).toBe(200);
      expect(JSON.parse(gvListRes.body).total).toBe(4);

      // b. HS 1 xem được 4 tin (tin chung + tin riêng của mình)
      const hs1ListRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs1Token}` },
      });
      expect(hs1ListRes.statusCode).toBe(200);
      expect(JSON.parse(hs1ListRes.body).total).toBe(4);

      // c. HS 2 chỉ xem được 2 tin chung, KHÔNG thấy tin riêng của HS 1
      const hs2ListRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs2Token}` },
      });
      expect(hs2ListRes.statusCode).toBe(200);
      const hs2Messages = JSON.parse(hs2ListRes.body).messages;
      expect(hs2Messages).toHaveLength(2);
      expect(hs2Messages.some((m: { text: string }) => m.text.includes('slide 4'))).toBe(false);

      // 8. GV Khóa chat
      const lockRes = await app.inject({
        method: 'PATCH',
        url: `/api/sessions/${session.id}/chat/lock`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { locked: true },
      });
      expect(lockRes.statusCode).toBe(200);
      expect(JSON.parse(lockRes.body).chatLocked).toBe(true);

      // 9. HS cố gửi tin khi bị khóa -> Bị từ chối 403 CHAT_LOCKED
      const hsBlockedRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs2Token}` },
        payload: { text: 'Em nói leo trong giờ' },
      });
      expect(hsBlockedRes.statusCode).toBe(403);
      expect(JSON.parse(hsBlockedRes.body).error.code).toBe('CHAT_LOCKED');

      // 10. Nút ✋ Giơ tay xin giúp: HS vẫn bấm được ngay cả khi chat bị khóa!
      const handRaiseRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/hand-raise`,
        headers: { authorization: `Bearer ${hs2Token}` },
        payload: { message: 'Máy em bị mất tiếng' },
      });
      expect(handRaiseRes.statusCode).toBe(200);
      expect(JSON.parse(handRaiseRes.body).success).toBe(true);

      // 11. GV kiểm tra danh sách giơ tay
      const statusRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/status`,
      });
      expect(statusRes.statusCode).toBe(200);
      const statusData = JSON.parse(statusRes.body);
      expect(statusData.chatLocked).toBe(true);
      expect(statusData.activeHandRaises).toHaveLength(1);
      expect(statusData.activeHandRaises[0].participantName).toBe('Học sinh Hương');

      // 12. GV hạ tay học sinh sau khi đã giải quyết
      const resolveRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/hand-raise/resolve`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { participantId: hs2.id },
      });
      expect(resolveRes.statusCode).toBe(200);

      // Kiểm tra lại trạng thái giơ tay đã rỗng
      const statusAfterResolve = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/chat/status`,
      });
      expect(JSON.parse(statusAfterResolve.body).activeHandRaises).toHaveLength(0);

      // 13. GV chuyển sang chế độ "Chỉ chat với giáo viên" (teacher_only)
      const teacherOnlyRes = await app.inject({
        method: 'PATCH',
        url: `/api/sessions/${session.id}/chat/lock`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { chatMode: 'teacher_only' },
      });
      expect(teacherOnlyRes.statusCode).toBe(200);
      expect(JSON.parse(teacherOnlyRes.body).chatMode).toBe('teacher_only');

      // HS gửi tin ở mode teacher_only -> Tự động bảo mật thành tin riêng tới GV
      const hsPrivModeRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/chat/messages`,
        headers: { authorization: `Bearer ${hs1Token}` },
        payload: { text: 'Em chào riêng thầy trong chế độ bảo mật ạ!' },
      });
      expect(hsPrivModeRes.statusCode).toBe(201);
      const hsPrivMsg = JSON.parse(hsPrivModeRes.body).message;
      expect(hsPrivMsg.toParticipantId).toBe(hs1.id);
    } finally {
      await app.close();
    }
  });
});
