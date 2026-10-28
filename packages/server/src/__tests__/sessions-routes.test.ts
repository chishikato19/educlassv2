import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Sessions REST Routes & Multi-Session Flow (Task 1.5)', () => {
  it('supports creating sessions (with class or free-form), 6-digit code, QR, multi-sessions concurrently, lookup, and guard', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // Tạo 2 giáo viên: GV A và GV B
    await userRepo.create({
      username: 'teacher_a',
      passwordHash: await hasher.hash('password123'),
      displayName: 'Thầy Tuấn',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'teacher_b',
      passwordHash: await hasher.hash('password123'),
      displayName: 'Cô Mai',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // Đăng nhập GV A
      const loginARes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_a', password: 'password123' },
      });
      expect(loginARes.statusCode).toBe(200);
      const tokenA = JSON.parse(loginARes.body).token as string;

      // Đăng nhập GV B
      const loginBRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_b', password: 'password123' },
      });
      expect(loginBRes.statusCode).toBe(200);
      const tokenB = JSON.parse(loginBRes.body).token as string;

      // GV A tạo lớp 10A1
      const createClassRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '10A1', year: 2026 },
      });
      expect(createClassRes.statusCode).toBe(201);
      const classA1 = JSON.parse(createClassRes.body).class;

      // 1. GV A mở phiên chọn lớp 10A1 (roster_only)
      const openSessionARes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          classId: classA1.id,
          identityMode: 'roster_only',
          allowTeams: false,
        },
      });
      expect(openSessionARes.statusCode).toBe(201);
      const sessionDetailA = JSON.parse(openSessionARes.body);

      expect(sessionDetailA.session.status).toBe('open');
      expect(sessionDetailA.session.joinCode).toMatch(/^\d{6}$/);
      expect(sessionDetailA.className).toBe('10A1');
      expect(sessionDetailA.joinUrl).toContain(sessionDetailA.session.joinCode);
      expect(sessionDetailA.qrDataUrl).toMatch(/^data:image\/png;base64,/);

      // 2. GV B mở phiên tự do song song (guest_only, không chọn lớp) -> D4: nhiều phiên đồng thời
      const openSessionBRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          classId: null,
          identityMode: 'guest_only',
          allowTeams: true,
        },
      });
      expect(openSessionBRes.statusCode).toBe(201);
      const sessionDetailB = JSON.parse(openSessionBRes.body);

      expect(sessionDetailB.session.status).toBe('open');
      expect(sessionDetailB.session.joinCode).toMatch(/^\d{6}$/);
      expect(sessionDetailB.session.joinCode).not.toBe(sessionDetailA.session.joinCode);
      expect(sessionDetailB.className).toBeNull();

      // 3. GV A cố tình mở phiên thứ hai khi phiên cũ vẫn đang mở -> 409 Conflict
      const openSecondSessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          identityMode: 'guest_only',
        },
      });
      expect(openSecondSessionRes.statusCode).toBe(409);
      expect(JSON.parse(openSecondSessionRes.body).code).toBe('TEACHER_ALREADY_HAS_ACTIVE_SESSION');

      // 4. GV cố mở phiên roster_only mà không chọn lớp -> 400 Bad Request
      // Trước hết đóng phiên B để test validation mở phiên mới
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionDetailB.session.id}/close`,
        headers: { authorization: `Bearer ${tokenB}` },
      });

      const invalidRosterRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          identityMode: 'roster_only',
          // Không truyền classId
        },
      });
      expect(invalidRosterRes.statusCode).toBe(400);

      // 5. GV B cố mở phiên chọn lớp 10A1 của GV A -> 403 Forbidden
      const crossClassRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          classId: classA1.id,
          identityMode: 'roster_only',
        },
      });
      expect(crossClassRes.statusCode).toBe(403);
      expect(JSON.parse(crossClassRes.body).code).toBe('FORBIDDEN');

      // 6. Học sinh tra cứu công khai theo mã 6 số (GET /api/sessions/lookup/:code)
      const lookupValidRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/lookup/${sessionDetailA.session.joinCode}`,
      });
      expect(lookupValidRes.statusCode).toBe(200);
      const lookupData = JSON.parse(lookupValidRes.body);
      expect(lookupData.sessionId).toBe(sessionDetailA.session.id);
      expect(lookupData.className).toBe('10A1');
      expect(lookupData.identityMode).toBe('roster_only');

      // Học sinh tra cứu với mã không tồn tại -> 404 BAD_CODE
      const lookupInvalidRes = await app.inject({
        method: 'GET',
        url: '/api/sessions/lookup/999999',
      });
      expect(lookupInvalidRes.statusCode).toBe(404);
      expect(JSON.parse(lookupInvalidRes.body).code).toBe('BAD_CODE');

      // 7. Học sinh lấy danh sách phiên đang mở trên LAN (GET /api/sessions/open-list)
      const openListRes = await app.inject({
        method: 'GET',
        url: '/api/sessions/open-list',
      });
      expect(openListRes.statusCode).toBe(200);
      const openList = JSON.parse(openListRes.body).sessions;
      expect(openList).toHaveLength(1); // Do phiên B đã đóng ở bước 4
      expect(openList[0].teacherName).toBe('Thầy Tuấn');
      expect(openList[0].joinCode).toBe(sessionDetailA.session.joinCode);

      // 8. GV A lấy phiên active của mình
      const activeARes = await app.inject({
        method: 'GET',
        url: '/api/sessions/active',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(activeARes.statusCode).toBe(200);
      expect(JSON.parse(activeARes.body).session.id).toBe(sessionDetailA.session.id);

      // 9. GV A đóng phiên
      const closeRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionDetailA.session.id}/close`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(closeRes.statusCode).toBe(200);
      expect(JSON.parse(closeRes.body).session.status).toBe('closed');

      // Sau khi đóng, học sinh tra cứu mã cũ sẽ báo BAD_CODE
      const lookupAfterCloseRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/lookup/${sessionDetailA.session.joinCode}`,
      });
      expect(lookupAfterCloseRes.statusCode).toBe(404);
    } finally {
      await app.close();
      conn.close();
    }
  });
});
