import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { QuickPollActivity } from '@educlass/activity-quick-poll';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';
import { ActivityRegistry } from '../activity/registry.js';

describe('Reward Rules REST Routes & Engine Caps Integration (Task 3.2)', () => {
  it('manages teacher reward rules, priority override, and reset to defaults', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo 2 giáo viên (GV A và GV B)
    await userRepo.create({
      username: 'teacher_exp_a',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Tuấn',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'teacher_exp_b',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Cô Hương',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // Đăng nhập GV A
      const loginARes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_exp_a', password: 'pass123' },
      });
      expect(loginARes.statusCode).toBe(200);
      const tokenA = JSON.parse(loginARes.body).token as string;

      // Đăng nhập GV B
      const loginBRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_exp_b', password: 'pass123' },
      });
      expect(loginBRes.statusCode).toBe(200);
      const tokenB = JSON.parse(loginBRes.body).token as string;

      // 2. GET /api/reward-rules mà không có token -> 401 UNAUTHORIZED
      const unauthRes = await app.inject({
        method: 'GET',
        url: '/api/reward-rules',
      });
      expect(unauthRes.statusCode).toBe(401);

      // 3. GV A lấy danh sách luật ban đầu (chưa tùy biến -> teacherRules = [])
      const getInitialRes = await app.inject({
        method: 'GET',
        url: '/api/reward-rules',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(getInitialRes.statusCode).toBe(200);
      const initialData = JSON.parse(getInitialRes.body);
      expect(initialData.globalRules.length).toBeGreaterThan(5);
      expect(initialData.teacherRules).toHaveLength(0);
      expect(initialData.sessionCap).toBe(200);

      // 4. GV A tùy biến cài đặt: tăng quiz_live correct lên 30, đặt quiz activity_cap = 60, session_cap = 150
      const putRes = await app.inject({
        method: 'PUT',
        url: '/api/reward-rules',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          rules: [
            { activityId: 'quiz_live', trigger: 'correct', exp: 30, enabled: true },
            { activityId: 'quiz_live', trigger: 'activity_cap', exp: 60, enabled: true },
            { activityId: null, trigger: 'session_cap', exp: 150, enabled: true },
          ],
        },
      });
      expect(putRes.statusCode).toBe(200);
      const putData = JSON.parse(putRes.body);
      expect(putData.teacherRules).toHaveLength(3);
      expect(putData.sessionCap).toBe(150);
      expect(putData.activityCaps.quiz_live).toBe(60);

      const effectiveQuizRule = putData.effectiveRules.find(
        (r: { activityId: string | null; trigger: string }) =>
          r.activityId === 'quiz_live' && r.trigger === 'correct'
      );
      expect(effectiveQuizRule.exp).toBe(30);
      expect(effectiveQuizRule.scope).toBe('teacher');

      // 5. Kiểm tra cách ly giáo viên: GV B lấy luật vẫn ở trạng thái mặc định của GV B
      const getBRes = await app.inject({
        method: 'GET',
        url: '/api/reward-rules',
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(getBRes.statusCode).toBe(200);
      const dataB = JSON.parse(getBRes.body);
      expect(dataB.teacherRules).toHaveLength(0); // GV B chưa có rule riêng
      expect(dataB.sessionCap).toBe(200); // Vẫn là trần mặc định 200

      // 6. GV A khôi phục cài đặt mặc định (POST /api/reward-rules/reset)
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/reward-rules/reset',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(resetRes.statusCode).toBe(200);
      const resetData = JSON.parse(resetRes.body);
      expect(resetData.success).toBe(true);

      // GV A lấy lại cài đặt -> teacherRules đã rỗng
      const getAfterReset = await app.inject({
        method: 'GET',
        url: '/api/reward-rules',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const dataAfterReset = JSON.parse(getAfterReset.body);
      expect(dataAfterReset.teacherRules).toHaveLength(0);
      expect(dataAfterReset.sessionCap).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('enforces activity and session caps during activity execution in ActivityEngine', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    await userRepo.create({
      username: 'teacher_poll_cap',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Cường',
      role: 'teacher',
    });

    const registry = new ActivityRegistry();
    registry.register(QuickPollActivity);

    const app = await buildServer({
      db: conn.db,
      activityRegistry: registry,
      autoSeedAdmin: true,
    });

    try {
      // Đăng nhập GV
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_poll_cap', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;

      // 1. GV đặt trần cho quick-poll là 15 EXP, mỗi lần tham gia được 10 EXP (mặc định gốc là 5)
      const setRulesRes = await app.inject({
        method: 'PUT',
        url: '/api/reward-rules',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          rules: [
            { activityId: 'quick-poll', trigger: 'participation', exp: 10, enabled: true },
            { activityId: 'quick-poll', trigger: 'activity_cap', exp: 15, enabled: true },
            { activityId: null, trigger: 'session_cap', exp: 25, enabled: true },
          ],
        },
      });
      expect(setRulesRes.statusCode).toBe(200);

      // 2. Tạo phiên học qua API
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          identityMode: 'guest_only',
          allowTeams: false,
        },
      });
      expect(sessionRes.statusCode).toBe(201);
      const sessionData = JSON.parse(sessionRes.body).session;
      const sessionId = sessionData.id as string;
      const joinCode = sessionData.joinCode as string;

      // Học sinh tham gia
      const joinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Học sinh Cap Test',
        },
      });
      expect(joinRes.statusCode).toBe(200);
      const joinData = JSON.parse(joinRes.body);
      const participantId = joinData.participant.id as string;
      const participantToken = joinData.participantToken as string;

      // 3. Khởi động lượt chạy 1 của Quick Poll
      const startRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/start`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          activityId: 'quick-poll',
          config: {
            question: 'Bạn thích môn nào?',
            options: ['Toán', 'Lý'],
          },
        },
      });
      expect(startRes1.statusCode).toBe(200);
      const runId1 = JSON.parse(startRes1.body).run.id as string;

      // Lần 1: Bỏ phiếu -> Thưởng 10 EXP theo quy tắc GV (chưa chạm trần activity 15)
      const voteRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId: runId1,
          intent: { type: 'vote', choices: [0] },
        },
      });
      expect(voteRes1.statusCode).toBe(200);

      // GV kết thúc lượt chạy 1
      const endRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/end`,
        headers: { authorization: `Bearer ${token}` },
        payload: { runId: runId1 },
      });
      expect(endRes1.statusCode).toBe(200);

      // Kiểm tra tổng EXP nhận được sau lượt 1: 10 EXP
      const totals1 = await app.rewardRepo.getParticipantExpTotals(
        sessionId,
        participantId,
        'quick-poll'
      );
      expect(totals1.activityExp).toBe(10);
      expect(totals1.sessionExp).toBe(10);

      // 4. Khởi động lượt chạy 2 của Quick Poll
      const startRes2 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/start`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          activityId: 'quick-poll',
          config: {
            question: 'Bạn có hiểu bài không?',
            options: ['Có', 'Chưa'],
          },
        },
      });
      expect(startRes2.statusCode).toBe(200);
      const runId2 = JSON.parse(startRes2.body).run.id as string;

      // Lần 2: Bỏ phiếu -> GV quy định 10 EXP nhưng trần activity_cap là 15, đã tích lũy 10
      // -> Chỉ được nhận thêm 5 EXP (áp trần chống lạm phát)
      const voteRes2 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId: runId2,
          intent: { type: 'vote', choices: [0] },
        },
      });
      expect(voteRes2.statusCode).toBe(200);

      // GV kết thúc lượt chạy 2
      const endRes2 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/end`,
        headers: { authorization: `Bearer ${token}` },
        payload: { runId: runId2 },
      });
      expect(endRes2.statusCode).toBe(200);

      // Kiểm tra tổng EXP sau lượt 2: 15 EXP (chạm đúng trần activity_cap)
      const totals2 = await app.rewardRepo.getParticipantExpTotals(
        sessionId,
        participantId,
        'quick-poll'
      );
      expect(totals2.activityExp).toBe(15);
      expect(totals2.sessionExp).toBe(15);
    } finally {
      await app.close();
    }
  });
});
