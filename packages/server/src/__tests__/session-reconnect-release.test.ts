import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Session Reconnect, Participants List & Release Name (Task 1.7)', () => {
  it('supports resuming session with participantToken, listing online/offline participants, and releasing taken names', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo 2 GV: GV Tuấn và GV Hùng
    await userRepo.create({
      username: 'teacher_tuan',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Tuấn',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'teacher_hung',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Hùng',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'admin',
      passwordHash: await hasher.hash('AdminPassword123!'),
      displayName: 'Quản trị viên',
      role: 'admin',
    });

    const app = await buildServer({ db: conn.db });

    try {
      // Đăng nhập GV Tuấn
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_tuan', password: 'pass123' },
      });
      const tokenTuan = JSON.parse(loginRes.body).token as string;

      // Đăng nhập GV Hùng
      const loginHungRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_hung', password: 'pass123' },
      });
      const tokenHung = JSON.parse(loginHungRes.body).token as string;

      // Đăng nhập Admin
      const loginAdminRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'AdminPassword123!' },
      });
      const tokenAdmin = JSON.parse(loginAdminRes.body).token as string;

      // GV Tuấn tạo lớp 10A1 và mở phiên
      const clsRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenTuan}` },
        payload: { name: '10A1', year: 2026 },
      });
      const classId = JSON.parse(clsRes.body).class.id as string;

      // Tạo học sinh "Hoàng Văn Nam" trong lớp 10A1
      const stRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenTuan}` },
        payload: { fullName: 'Hoàng Văn Nam' },
      });
      const studentId = JSON.parse(stRes.body).student.id as string;

      // Mở phiên học
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenTuan}` },
        payload: {
          classId,
          identityMode: 'roster_or_guest',
          allowTeams: true,
        },
      });
      const session = JSON.parse(sessionRes.body).session;
      const joinCode = session.joinCode as string;
      const sessionId = session.id as string;

      // 2. Học sinh 1 vào lớp (chọn tên trong lớp)
      const joinRes1 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentId,
          teamName: 'Đội Tia Chớp',
        },
      });
      expect(joinRes1.statusCode).toBe(200);
      const joinData1 = JSON.parse(joinRes1.body);
      const participant1Token = joinData1.participantToken as string;
      const participant1Id = joinData1.participant.id as string;

      // Học sinh 2 vào lớp (khách tự do)
      const joinRes2 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Khách Minh',
        },
      });
      expect(joinRes2.statusCode).toBe(200);
      const joinData2 = JSON.parse(joinRes2.body);
      const participant2Id = joinData2.participant.id as string;

      // 3. GV kiểm tra danh sách người tham gia: GET /api/sessions/:id/participants
      // GV Tuấn (chủ sở hữu) xem danh sách:
      const partListRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/participants`,
        headers: { authorization: `Bearer ${tokenTuan}` },
      });
      expect(partListRes.statusCode).toBe(200);
      const partListBody = JSON.parse(partListRes.body);
      expect(partListBody.totalCount).toBe(2);
      expect(partListBody.onlineCount).toBe(2);
      expect(partListBody.offlineCount).toBe(0);
      expect(partListBody.participants).toHaveLength(2);

      // GV Hùng cố xem danh sách của GV Tuấn -> 403 FORBIDDEN (Owner Guard D5)
      const partListHungRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/participants`,
        headers: { authorization: `Bearer ${tokenHung}` },
      });
      expect(partListHungRes.statusCode).toBe(403);
      expect(JSON.parse(partListHungRes.body).code).toBe('FORBIDDEN');

      // Admin xem danh sách -> 200 OK
      const partListAdminRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/participants`,
        headers: { authorization: `Bearer ${tokenAdmin}` },
      });
      expect(partListAdminRes.statusCode).toBe(200);

      // 4. Test Reconnect (Resume):
      // Giả lập HS 1 bị ngắt kết nối (offline)
      const participantRepo = app.participantRepo;
      await participantRepo.update(participant1Id, { status: 'offline', leftAt: Date.now() });

      // Kiểm tra lại danh sách GV: 1 online, 1 offline
      const checkOfflineRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/participants`,
        headers: { authorization: `Bearer ${tokenTuan}` },
      });
      const checkOfflineBody = JSON.parse(checkOfflineRes.body);
      expect(checkOfflineBody.onlineCount).toBe(1);
      expect(checkOfflineBody.offlineCount).toBe(1);

      // HS 1 gọi POST /api/sessions/resume với participant1Token
      const resumeRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/resume',
        payload: { participantToken: participant1Token },
      });
      expect(resumeRes.statusCode).toBe(200);
      const resumeBody = JSON.parse(resumeRes.body);
      expect(resumeBody.participant.id).toBe(participant1Id);
      expect(resumeBody.participant.status).toBe('online');
      expect(resumeBody.participant.teamName).toBe('Đội Tia Chớp');

      // Thử resume với token không hợp lệ -> 401 UNAUTHORIZED
      const resumeInvalidRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/resume',
        payload: { participantToken: 'invalid.token.xyz' },
      });
      expect(resumeInvalidRes.statusCode).toBe(401);
      expect(JSON.parse(resumeInvalidRes.body).code).toBe('UNAUTHORIZED');

      // 5. Test GV "mở lại tên" (Release Name - D7):
      // Người khác cố vào bằng tên "Khách Minh" khi HS 2 đang online -> 409 NAME_TAKEN
      const duplicateJoinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname: 'Khách Minh' },
      });
      expect(duplicateJoinRes.statusCode).toBe(409);
      expect(JSON.parse(duplicateJoinRes.body).code).toBe('NAME_TAKEN');

      // GV Hùng cố mở lại tên của HS 2 trong phiên GV Tuấn -> 403 FORBIDDEN
      const releaseForbiddenRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/participants/${participant2Id}/release`,
        headers: { authorization: `Bearer ${tokenHung}` },
      });
      expect(releaseForbiddenRes.statusCode).toBe(403);

      // GV Tuấn bấm "Mở lại tên" cho HS 2 (Khách Minh)
      const releaseRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/participants/${participant2Id}/release`,
        headers: { authorization: `Bearer ${tokenTuan}` },
      });
      expect(releaseRes.statusCode).toBe(200);
      const releaseBody = JSON.parse(releaseRes.body);
      expect(releaseBody.success).toBe(true);
      expect(releaseBody.status).toBe('offline');

      // Sau khi được GV mở lại tên, người khác vào lại bằng tên "Khách Minh" -> 200 OK
      const rejoinAfterReleaseRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname: 'Khách Minh' },
      });
      expect(rejoinAfterReleaseRes.statusCode).toBe(200);

      // 6. Khi phiên đã đóng -> Resume bị từ chối với SESSION_CLOSED
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/close`,
        headers: { authorization: `Bearer ${tokenTuan}` },
      });

      const resumeAfterCloseRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/resume',
        payload: { participantToken: participant1Token },
      });
      expect(resumeAfterCloseRes.statusCode).toBe(400);
      expect(JSON.parse(resumeAfterCloseRes.body).code).toBe('SESSION_CLOSED');
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  });
});
