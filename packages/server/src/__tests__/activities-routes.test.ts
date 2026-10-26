import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app.js';

describe('Activities Server Routes & Engine (Task 3.1)', () => {
  let app: FastifyInstance;
  let teacherToken: string;
  let sessionId: string;
  let participantToken: string;

  beforeEach(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });
    await app.ready();

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    const adminToken = JSON.parse(adminLogin.body).token;

    await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        username: 'teacher_activity_test',
        displayName: 'Thầy Thể Nghiệm',
        password: 'password123',
        role: 'teacher',
      },
    });

    const teacherLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'teacher_activity_test', password: 'password123' },
    });
    teacherToken = teacherLogin.json().token;

    // 2. Mở phiên
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        identityMode: 'roster_or_guest',
        allowTeams: false,
      },
    });
    expect(sessionRes.statusCode).toBe(201);
    const sessionData = sessionRes.json().session;
    sessionId = sessionData.id;
    const joinCode = sessionData.joinCode;

    // 3. Học sinh tham gia
    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/sessions/join',
      payload: {
        joinCode,
        nickname: 'Học sinh An',
      },
    });
    expect(joinRes.statusCode).toBe(200);
    participantToken = joinRes.json().participantToken;
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles activity registry listing, starting, intents, and ending flow', async () => {
    // 1. Lấy danh sách activity
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/activities`,
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listData = listRes.json();
    expect(listData.activities).toBeInstanceOf(Array);
    expect(listData.activities.some((a: { id: string }) => a.id === 'quick-poll')).toBe(true);

    // 2. Giáo viên khởi chạy activity quick-poll
    const startRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/start`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        activityId: 'quick-poll',
        config: {
          question: 'Bạn thích ăn gì nhất?',
          options: ['Phở', 'Bánh mì', 'Cơm tấm'],
          allowMultiple: false,
        },
      },
    });

    expect(startRes.statusCode).toBe(200);
    const startData = startRes.json();
    expect(startData.run.activityId).toBe('quick-poll');
    expect(startData.run.status).toBe('running');
    expect(startData.state.question).toBe('Bạn thích ăn gì nhất?');
    const runId = startData.run.id;

    // 3. Tra cứu activity hiện tại của phiên
    const curRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/activities/current`,
    });
    expect(curRes.statusCode).toBe(200);
    expect(curRes.json().run.id).toBe(runId);
    expect(curRes.json().state.options).toHaveLength(3);

    // 4. Học sinh gửi bình chọn (Student Intent)
    const voteRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: {
          type: 'vote',
          choices: [1], // Chọn 'Bánh mì'
        },
      },
    });

    expect(voteRes.statusCode).toBe(200);
    expect(voteRes.json().ok).toBe(true);
    expect(Object.keys(voteRes.json().state.votes)).toHaveLength(1);

    // 5. Giáo viên gửi lệnh khóa bình chọn (Teacher Intent)
    const lockRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/teacher-intent`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        runId,
        intent: { type: 'toggle_lock' },
      },
    });
    expect(lockRes.statusCode).toBe(200);
    expect(lockRes.json().state.isLocked).toBe(true);

    // 6. Học sinh bình chọn khi đã khóa -> bị từ chối
    const voteWhenLocked = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/student-intent`,
      payload: {
        participantToken,
        runId,
        intent: {
          type: 'vote',
          choices: [0],
        },
      },
    });
    expect(voteWhenLocked.statusCode).toBe(400);
    expect(voteWhenLocked.json().ok).toBe(false);
    expect(voteWhenLocked.json().code).toBe('POLL_LOCKED');

    // 7. Giáo viên kết thúc hoạt động
    const endRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/end`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { runId },
    });

    expect(endRes.statusCode).toBe(200);
    const endData = endRes.json();
    expect(endData.runId).toBe(runId);
    expect(endData.results).toHaveLength(1);
    expect(endData.results[0].choices).toEqual([1]);

    // 8. Kiểm tra không còn active run
    const curAfterEnd = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/activities/current`,
    });
    expect(curAfterEnd.statusCode).toBe(200);
    expect(curAfterEnd.json().run).toBeNull();
  });
});
