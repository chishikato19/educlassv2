import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { type Question, toRichText } from '@educlass/question-kit';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Exam Server Integration & REST Routes (Task 4.1)', () => {
  it('supports creating exam, timing, per-student shuffling, password protection, open/close, and grading against original', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo tài khoản giáo viên
    await userRepo.create({
      username: 'teacher_exam',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Khảo Thí',
      role: 'teacher',
    });

    const app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
      fastifyOptions: { logger: false },
    });

    try {
      // Đăng nhập giáo viên
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_exam', password: 'pass123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const teacherToken = JSON.parse(loginRes.body).token as string;

      // 2. Mở phiên học
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { identityMode: 'guest_only', allowTeams: false },
      });
      expect(sessionRes.statusCode).toBe(201);
      const session = JSON.parse(sessionRes.body).session;
      const sessionId = session.id as string;
      const joinCode = session.joinCode as string;

      // 3. Hai học sinh tham gia phòng
      const joinRes1 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname: 'Học sinh An' },
      });
      expect(joinRes1.statusCode).toBe(200);
      const joinData1 = JSON.parse(joinRes1.body);
      const token1 = joinData1.participantToken as string;
      const pid1 = joinData1.participant.id as string;

      const joinRes2 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, nickname: 'Học sinh Bình' },
      });
      expect(joinRes2.statusCode).toBe(200);
      const joinData2 = JSON.parse(joinRes2.body);
      const token2 = joinData2.participantToken as string;
      const pid2 = joinData2.participant.id as string;

      // 4. Danh sách đề thi mẫu với câu hỏi đa dạng
      const examQuestions: Question[] = [
        {
          id: 'q1',
          type: 'mcq4',
          stem: toRichText('Nước Việt Nam có bao nhiêu tỉnh/thành phố trực thuộc TW?'),
          options: [toRichText('61'), toRichText('62'), toRichText('63'), toRichText('64')],
          correct: 2, // '63' (vị trí 2 gốc)
          points: 5,
        },
        {
          id: 'q2',
          type: 'tf',
          stem: toRichText('Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.'),
          correct: true,
          points: 5,
        },
      ];

      // 5. Giáo viên khởi tạo Kỳ thi (activityId = 'exam') với mật khẩu 'KyThi2026' và xáo câu/đáp án
      const startExamRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/start`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          activityId: 'exam',
          config: {
            title: 'Kỳ Thi Khảo Sát Năng Lực',
            durationMinutes: 45,
            shuffleQuestions: true,
            shuffleOptions: true,
            password: 'KyThi2026',
            questions: examQuestions,
          },
        },
      });
      expect(startExamRes.statusCode).toBe(200);
      const startData = JSON.parse(startExamRes.body);
      const runId = startData.run.id as string;
      expect(startData.state.status).toBe('ready');
      expect(startData.state.hasPassword).toBe(true);
      expect(startData.state.startedAt).toBeNull();

      // 6. Học sinh 1 thử mở đề với mật khẩu SAI -> Bị từ chối
      const wrongPassRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: {
            type: 'unlock_exam',
            password: 'SaiMatKhauRoi',
          },
        },
      });
      expect(wrongPassRes.statusCode).toBe(400);
      expect(JSON.parse(wrongPassRes.body).code).toBe('INCORRECT_PASSWORD');

      // 7. Học sinh 1 mở đề với mật khẩu ĐÚNG -> Thành công
      const unlockRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: {
            type: 'unlock_exam',
            password: 'KyThi2026',
            displayName: 'Học sinh An',
          },
        },
      });
      expect(unlockRes1.statusCode).toBe(200);
      const stateAfterUnlock1 = JSON.parse(unlockRes1.body).state;
      const p1 = stateAfterUnlock1.participants[pid1];
      expect(p1.authenticated).toBe(true);
      expect(p1.questionOrder).toHaveLength(2);
      expect(p1.optionOrders['q1']).toBeDefined();

      // Học sinh 2 cũng mở đề với mật khẩu đúng
      const unlockRes2 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token2,
          runId,
          intent: {
            type: 'unlock_exam',
            password: 'KyThi2026',
            displayName: 'Học sinh Bình',
          },
        },
      });
      expect(unlockRes2.statusCode).toBe(200);

      // 8. Học sinh cố lưu bài khi giáo viên CHƯA mở đề (vẫn đang ready) -> Bị từ chối
      const saveEarlyRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: {
            type: 'save_answer',
            questionId: 'q1',
            answer: 0,
          },
        },
      });
      expect(saveEarlyRes.statusCode).toBe(400);
      expect(JSON.parse(saveEarlyRes.body).code).toBe('EXAM_NOT_IN_PROGRESS');

      // 9. Giáo viên phát lệnh Mở kỳ thi (open_exam) -> bắt đầu tính giờ làm bài
      const openRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/teacher-intent`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          runId,
          intent: { type: 'open_exam' },
        },
      });
      expect(openRes.statusCode).toBe(200);
      const stateAfterOpen = JSON.parse(openRes.body).state;
      expect(stateAfterOpen.status).toBe('in_progress');
      expect(stateAfterOpen.startedAt).toBeDefined();
      expect(stateAfterOpen.expiresAt).toBeDefined();
      expect(stateAfterOpen.expiresAt).toBeGreaterThan(stateAfterOpen.startedAt);

      // 10. Học sinh 1 trả lời câu hỏi:
      // Tìm vị trí của đáp án đúng '63' (vị trí gốc 2) trên đề thi xáo của HS 1
      const p1OptionOrder = stateAfterOpen.participants[pid1].optionOrders['q1'] as number[];
      // p1OptionOrder là [chỉ số gốc ở pos 0, pos 1, pos 2, pos 3]
      const correctPosForHS1 = p1OptionOrder.indexOf(2); // Vị trí chứa đáp án '63' trên đề HS 1
      expect(correctPosForHS1).toBeGreaterThanOrEqual(0);

      // HS 1 lưu câu trả lời câu 1 (chọn đúng)
      const save1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: {
            type: 'save_answer',
            questionId: 'q1',
            answer: correctPosForHS1,
          },
        },
      });
      expect(save1Res.statusCode).toBe(200);

      // HS 1 lưu câu trả lời câu 2 (chọn true -> đúng)
      const save2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: {
            type: 'save_answer',
            questionId: 'q2',
            answer: true,
          },
        },
      });
      expect(save2Res.statusCode).toBe(200);

      // HS 1 nộp bài thi
      const submitRes1 = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token1,
          runId,
          intent: { type: 'submit_exam' },
        },
      });
      expect(submitRes1.statusCode).toBe(200);
      expect(JSON.parse(submitRes1.body).state.participants[pid1].isSubmitted).toBe(true);

      // HS 2 chỉ trả lời câu 2 (đúng) và câu 1 bỏ trống, sau đó nộp bài
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token2,
          runId,
          intent: {
            type: 'save_answer',
            questionId: 'q2',
            answer: true,
          },
        },
      });
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/student-intent`,
        payload: {
          participantToken: token2,
          runId,
          intent: { type: 'submit_exam' },
        },
      });

      // 11. Giáo viên cộng thêm 5 phút thi (extend_time)
      const extendRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/teacher-intent`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          runId,
          intent: { type: 'extend_time', addMinutes: 5 },
        },
      });
      expect(extendRes.statusCode).toBe(200);
      expect(JSON.parse(extendRes.body).state.durationMinutes).toBe(50);

      // 12. Giáo viên khóa / đóng kỳ thi (close_exam)
      const closeExamRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/teacher-intent`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          runId,
          intent: { type: 'close_exam' },
        },
      });
      expect(closeExamRes.statusCode).toBe(200);
      expect(JSON.parse(closeExamRes.body).state.status).toBe('closed');

      // 13. Giáo viên kết thúc kỳ thi và chấm điểm (endActivity)
      const endRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/activities/end`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { runId },
      });
      expect(endRes.statusCode).toBe(200);
      const endBody = JSON.parse(endRes.body);
      const results = endBody.results as Array<{
        participantId: string;
        score: number;
        percentage: number;
        rank: number;
      }>;
      expect(results).toHaveLength(2);

      // Kiểm tra chấm điểm theo bản gốc:
      // HS 1: đúng cả 2 câu -> 10/10 điểm, 100%, xếp hạng 1
      const res1 = results.find(r => r.participantId === pid1)!;
      expect(res1.score).toBe(10);
      expect(res1.percentage).toBe(100);
      expect(res1.rank).toBe(1);

      // HS 2: chỉ đúng câu 2 -> 5/10 điểm, 50%, xếp hạng 2
      const res2 = results.find(r => r.participantId === pid2)!;
      expect(res2.score).toBe(5);
      expect(res2.percentage).toBe(50);
      expect(res2.rank).toBe(2);
    } finally {
      await app.close();
    }
  });
});
