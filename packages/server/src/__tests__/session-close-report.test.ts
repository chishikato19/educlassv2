import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  ParticipantRepository,
  runMigrations,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';
import { WsGatewayManager } from '../ws/gateway.js';

describe('Session Closing, Report Snapshots & Participant Logout (Task 1.8)', () => {
  it('closes session following FSM (closing -> report snapshot -> closed), marks participants offline, and serves report', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });

    const hasher = new ScryptPasswordHasher();
    const userRepo = new UserRepository(conn.db);
    const participantRepo = new ParticipantRepository(conn.db);

    // Tạo GV 1 (sở hữu), GV 2 (khác), Admin
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

    const wsManager = new WsGatewayManager();
    const app = await buildServer({ db: conn.db, wsManager });

    try {
      // 1. Đăng nhập
      const login1 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_tuan', password: 'pass123' },
      });
      const token1 = JSON.parse(login1.body).token as string;

      const login2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_hung', password: 'pass123' },
      });
      const token2 = JSON.parse(login2.body).token as string;

      const loginAdmin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'AdminPassword123!' },
      });
      const tokenAdmin = JSON.parse(loginAdmin.body).token as string;

      // 2. GV 1 tạo lớp và mở phiên
      const clsRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: '10A1', year: 2026 },
      });
      const classId = JSON.parse(clsRes.body).class.id as string;

      const stRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { fullName: 'Nguyễn Văn An' },
      });
      const studentId = JSON.parse(stRes.body).student.id as string;

      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          classId,
          identityMode: 'roster_or_guest',
          allowTeams: true,
        },
      });
      const session = JSON.parse(sessionRes.body).session;
      const sessionId = session.id as string;
      const joinCode = session.joinCode as string;

      // 3. Hai học sinh tham gia
      // HS 1: danh sách lớp
      const join1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentId,
          teamName: 'Đội Rồng Bay',
        },
      });
      expect(join1Res.statusCode).toBe(200);
      const participant1 = JSON.parse(join1Res.body);
      const participantToken1 = participant1.participantToken as string;

      // HS 2: khách tự do
      const join2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Khách Minh',
          teamName: 'Đội Rồng Bay',
        },
      });
      expect(join2Res.statusCode).toBe(200);

      // Kiểm tra trạng thái hiện tại: 2 online
      const partsBefore = await participantRepo.findOnlineBySessionId(sessionId);
      expect(partsBefore).toHaveLength(2);

      // 4. GV 2 cố đóng phiên của GV 1 -> 403 FORBIDDEN (Owner Guard D5)
      const closeForbidden = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/close`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(closeForbidden.statusCode).toBe(403);

      // 5. GV 1 thực hiện đóng phiên: POST /api/sessions/:id/close
      const closeRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/close`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { reason: 'Kết thúc buổi học hôm nay.' },
      });
      expect(closeRes.statusCode).toBe(200);
      const closeBody = JSON.parse(closeRes.body);

      // Xác nhận phiên chuyển sang closed
      expect(closeBody.session.status).toBe('closed');
      expect(closeBody.session.closedAt).toBeDefined();

      // Xác nhận báo cáo tổng kết snapshot được tạo đầy đủ
      const report = closeBody.report;
      expect(report).toBeDefined();
      expect(report.sessionId).toBe(sessionId);
      expect(report.snapshot.sessionCode).toBe(joinCode);
      expect(report.snapshot.className).toBe('10A1');
      expect(report.snapshot.totalParticipants).toBe(2);
      expect(report.snapshot.participants).toHaveLength(2);
      expect(report.snapshot.teams).toHaveLength(1);
      expect(report.snapshot.teams[0]?.name).toBe('Đội Rồng Bay');
      expect(report.snapshot.gamification).toBeDefined();
      expect(report.snapshot.gamification?.identityStats.guestCount).toBe(1);
      expect(report.snapshot.gamification?.identityStats.rosterCount).toBe(1);
      expect(report.snapshot.gamification?.identityStats.accountCount).toBe(0);

      // 6. Kiểm tra CSDL: Tất cả học sinh bị đăng xuất về 'offline' (D10)
      const onlinePartsAfter = await participantRepo.findOnlineBySessionId(sessionId);
      expect(onlinePartsAfter).toHaveLength(0);

      const allPartsAfter = await participantRepo.listBySessionId(sessionId);
      expect(allPartsAfter.every((p) => p.status === 'offline')).toBe(true);
      expect(allPartsAfter.every((p) => p.leftAt !== null)).toBe(true);

      // 7. Học sinh cố resume bằng participantToken sau khi phiên đóng -> 400 SESSION_CLOSED
      const resumeRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/resume',
        payload: { participantToken: participantToken1 },
      });
      expect(resumeRes.statusCode).toBe(400);
      expect(JSON.parse(resumeRes.body).code).toBe('SESSION_CLOSED');

      // 8. Tra cứu báo cáo: GET /api/sessions/:id/report
      // GV 1 (chủ sở hữu) xem báo cáo -> 200 OK
      const getReportRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/report`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(getReportRes.statusCode).toBe(200);
      const fetchedReport = JSON.parse(getReportRes.body).report;
      expect(fetchedReport.id).toBe(report.id);
      expect(fetchedReport.snapshot.totalParticipants).toBe(2);

      // GV 2 xem báo cáo của GV 1 -> 403 FORBIDDEN
      const getReportForbidden = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/report`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(getReportForbidden.statusCode).toBe(403);

      // Admin xem báo cáo của GV 1 -> 200 OK (D5)
      const getReportAdmin = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/report`,
        headers: { authorization: `Bearer ${tokenAdmin}` },
      });
      expect(getReportAdmin.statusCode).toBe(200);

      // 9. Tra cứu tổng kết cho học sinh: GET /api/sessions/:id/student-summary/:participantId (Task 5.3)
      // HS 2 (khách) tra cứu tổng kết
      const p2 = JSON.parse(join2Res.body).participant;
      const summaryRes2 = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/student-summary/${p2.id}`,
      });
      expect(summaryRes2.statusCode).toBe(200);
      const studentSummary2 = JSON.parse(summaryRes2.body).summary;
      expect(studentSummary2.displayName).toBe('Khách Minh');
      expect(studentSummary2.identityLevel).toBe('guest');
      expect(studentSummary2.persistedExp).toBe(false);
      expect(studentSummary2.reminderPinLogin).toBe(true);
      expect(studentSummary2.sessionCode).toBe(joinCode);
    } finally {
      await app.close();
    }
  });
});
