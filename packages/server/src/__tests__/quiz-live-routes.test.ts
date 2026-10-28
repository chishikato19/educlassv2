import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Quiz Live Server Integration & REST Routes (Task 3.3)', () => {
  it('supports starting Quiz Live, submitting speed answers, teacher pacing, and rewarding onEnd', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo giáo viên
    await userRepo.create({
      username: 'teacher_quiz',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Quiz',
      role: 'teacher',
    });

    const app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
    });

    try {
      // Đăng nhập giáo viên
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_quiz', password: 'pass123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const token = JSON.parse(loginRes.body).token as string;

      // 2. Mở phiên học
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token}` },
        payload: { identityMode: 'guest_only', allowTeams: false },
      });
      expect(sessionRes.statusCode).toBe(201);
      const session = JSON.parse(sessionRes.body).session;
      const sessionId = session.id as string;
      const joinCode = session.joinCode as string;

      // 3. Học sinh tham gia phiên
      const joinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname: 'Học sinh An' },
      });
      expect(joinRes.statusCode).toBe(200);
      const joinData = JSON.parse(joinRes.body);
      const participantToken = joinData.participantToken as string;
      const participantId = joinData.participant.id as string;

      // 4. Lấy danh sách activity: phải có 'quiz-live'
      const listActivitiesRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/activities`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(listActivitiesRes.statusCode).toBe(200);
      const activities = JSON.parse(listActivitiesRes.body).activities as Array<{ id: string }>;
      expect(activities.some(a => a.id === 'quiz-live')).toBe(true);

      // 5. Giáo viên khởi động Quiz Live (chế độ Kahoot)
      const startRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/start`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          activityId: 'quiz-live',
          config: {
            title: 'Quiz Khởi Động',
            mode: 'kahoot',
            questions: [
              {
                id: 'q1',
                type: 'mcq4',
                stem: '2 + 2 = ?',
                options: ['3', '4', '5', '6'],
                correctAnswer: 1, // '4'
                timeLimit: 20,
                points: 1000,
              },
              {
                id: 'q2',
                type: 'tf',
                stem: 'Trái Đất quay quanh Mặt Trời.',
                correctAnswer: true,
                timeLimit: 15,
                points: 1000,
              },
            ],
          },
        },
      });
      expect(startRes.statusCode).toBe(200);
      const startData = JSON.parse(startRes.body);
      expect(startData.run.activityId).toBe('quiz-live');
      expect(startData.state.currentQuestionIndex).toBe(0);
      const runId = startData.run.id as string;

      // 6. Học sinh gửi câu trả lời câu 1 (chọn đáp án 1 = '4' -> Đúng)
      const answerRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 0,
            answer: 1,
            responseTimeMs: 500, // 0.5s phản hồi rất nhanh
          },
        },
      });
      expect(answerRes1.statusCode).toBe(200);
      const answerState1 = JSON.parse(answerRes1.body).state;
      expect(answerState1.participants[participantId].correctCount).toBe(1);
      expect(answerState1.participants[participantId].currentStreak).toBe(1);
      expect(answerState1.participants[participantId].score).toBeGreaterThan(950);

      // 7. Giáo viên chuyển câu hỏi tiếp theo
      const nextQRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/teacher-intent`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          runId,
          intent: { type: 'next_question' },
        },
      });
      expect(nextQRes.statusCode).toBe(200);
      const nextState = JSON.parse(nextQRes.body).state;
      expect(nextState.currentQuestionIndex).toBe(1);

      // 8. Học sinh gửi câu trả lời câu 2 (chọn true -> Đúng câu 2 liên tiếp)
      const answerRes2 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken,
          runId,
          intent: {
            type: 'submit_answer',
            questionIndex: 1,
            answer: true,
            responseTimeMs: 1000,
          },
        },
      });
      expect(answerRes2.statusCode).toBe(200);
      const answerState2 = JSON.parse(answerRes2.body).state;
      expect(answerState2.participants[participantId].correctCount).toBe(2);
      expect(answerState2.participants[participantId].currentStreak).toBe(2);

      // 9. Giáo viên kết thúc Quiz Live
      const endRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/end`,
        headers: { authorization: `Bearer ${token}` },
        payload: { runId },
      });
      expect(endRes.statusCode).toBe(200);
      const endData = JSON.parse(endRes.body);
      expect(endData.runId).toBe(runId);
      expect(endData.results).toHaveLength(1);
      expect(endData.results[0].participantId).toBe(participantId);
      expect(endData.results[0].rank).toBe(1);
      expect(endData.results[0].accuracy).toBe(100);

      // 10. Xác nhận EXP đã được ghi nhận trong reward_logs
      const expTotals = await app.rewardRepo.getParticipantExpTotals(
        sessionId,
        participantId,
        'quiz-live'
      );
      expect(expTotals.activityExp).toBeGreaterThan(0);
      expect(expTotals.sessionExp).toBeGreaterThan(0);
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  });
});
