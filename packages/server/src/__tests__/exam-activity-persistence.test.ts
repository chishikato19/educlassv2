import { describe, expect, it } from 'vitest';
import {
  ClassRepository,
  createDatabaseConnection,
  ExamRecordRepository,
  ExamRepository,
  RewardRepository,
  runMigrations,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Exam Activity Persistence & Multi-batch Integration (Task 3.1)', () => {
  it('automatically persists exam_records on student submit and locks previous batch participants', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });

    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const examRepo = new ExamRepository(conn.db);
    const examRecordRepo = new ExamRecordRepository(conn.db);
    const rewardRepo = new RewardRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo giáo viên & Lớp học & 2 học sinh
    const teacher = await userRepo.create({
      username: 'gv_vatly',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Vật Lý',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: '10A1',
      year: 2026,
    });

    const stu1 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Nguyễn Hải Đăng',
      code: 'HS101',
      passwordHash: await hasher.hash('1234'),
    });
    const stu2 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Trần Bích Phương',
      code: 'HS102',
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
        payload: { username: 'gv_vatly', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;
      const authHeader = { authorization: `Bearer ${token}` };

      // 2. Tạo kỳ thi mới: 1 câu hỏi mcq4
      const createExamRes = await app.inject({
        method: 'POST',
        url: '/api/exams',
        headers: authHeader,
        payload: {
          classId: cls.id,
          title: 'Kiểm tra 15 phút Cơ học',
          subject: 'Vật lý',
          durationMinutes: 15,
          questions: [
            {
              id: 'q1',
              type: 'mcq4',
              stem: { text: 'Vận tốc là đại lượng?' },
              options: [
                { text: 'Vectơ' },
                { text: 'Vô hướng' },
                { text: 'Không đổi' },
                { text: 'Bằng 0' },
              ],
              correct: 0,
              points: 10,
            },
          ],
        },
      });
      expect(createExamRes.statusCode).toBe(201);
      const examId = JSON.parse(createExamRes.body).exam.id as string;

      // 3. Mở phiên học Tiết 1
      const session1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: authHeader,
        payload: { classId: cls.id, identityMode: 'roster_only', allowTeams: false },
      });
      const session1Id = JSON.parse(session1Res.body).session.id as string;
      const session1JoinCode = JSON.parse(session1Res.body).session.joinCode as string;

      // Học sinh 1 tham gia phiên Tiết 1
      const join1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: session1JoinCode, studentId: stu1.id, pin: '1234' },
      });
      expect(join1Res.statusCode).toBe(200);
      const participant1 = JSON.parse(join1Res.body).participant;
      expect(participant1.id).toBeDefined();
      const participant1Token = JSON.parse(join1Res.body).participantToken as string;

      // 4. Phát động Ca 1: POST /api/exams/:id/start-batch
      const startBatch1Res = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/start-batch`,
        headers: authHeader,
        payload: { sessionId: session1Id, batchIndex: 1 },
      });
      expect(startBatch1Res.statusCode).toBe(200);

      // Lấy runId hiện tại của phiên
      const currentRunRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session1Id}/activities/current`,
      });
      const runId1 = JSON.parse(currentRunRes.body).run.id as string;

      // 5. Giáo viên mở đề thi (open_exam)
      const openIntentRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/activities/teacher-intent`,
        headers: authHeader,
        payload: { runId: runId1, intent: { type: 'open_exam' } },
      });
      expect(openIntentRes.statusCode).toBe(200);

      // 6. HS1 lấy đề thi (get_paper)
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/activities/student-intent`,
        payload: {
          participantToken: participant1Token,
          runId: runId1,
          intent: { type: 'get_paper' },
        },
      });

      // 7. HS1 làm đúng câu 1 (chọn option 0)
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/activities/student-intent`,
        payload: {
          participantToken: participant1Token,
          runId: runId1,
          intent: { type: 'save_answer', questionId: 'q1', answer: 0 },
        },
      });

      // 8. HS1 nộp bài (submit_exam)
      const submitRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/activities/student-intent`,
        payload: {
          participantToken: participant1Token,
          runId: runId1,
          intent: { type: 'submit_exam' },
        },
      });
      expect(submitRes.statusCode).toBe(200);

      // 9. Xác thực tự động lưu vào exam_records:
      const recordsAfterSubmit = await examRecordRepo.listByExam(examId);
      expect(recordsAfterSubmit).toHaveLength(1);
      const rec1 = recordsAfterSubmit[0]!;
      expect(rec1.studentId).toBe(stu1.id);
      expect(rec1.batchIndex).toBe(1);
      expect(rec1.status).toBe('submitted');
      expect(rec1.score).toBe(10);
      expect(rec1.percentage).toBe(100);
      expect(rec1.correctCount).toBe(1);

      // Xác thực EXP đã được trao cho HS1
      const student1Updated = await studentRepo.findById(stu1.id);
      expect(student1Updated?.exp).toBeGreaterThan(0);
      const rewardsList = await rewardRepo.listBySessionId(session1Id);
      expect(rewardsList.length).toBeGreaterThan(0);
      expect(rewardsList.some(r => r.studentId === stu1.id)).toBe(true);

      // 10. Giáo viên tạm dừng Ca 1 (Hết tiết 1)
      const pauseRes = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/pause-batch`,
        headers: authHeader,
        payload: { reason: 'Hết tiết 1' },
      });
      expect(pauseRes.statusCode).toBe(200);

      // Đóng phiên Tiết 1
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/close`,
        headers: authHeader,
      });

      // 11. Mở phiên mới cho Tiết 2
      const session2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: authHeader,
        payload: { classId: cls.id, identityMode: 'roster_only', allowTeams: false },
      });
      const session2Id = JSON.parse(session2Res.body).session.id as string;
      const session2JoinCode = JSON.parse(session2Res.body).session.joinCode as string;

      // HS1 và HS2 tham gia phiên Tiết 2
      const join2_stu1 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: session2JoinCode, studentId: stu1.id, pin: '1234' },
      });
      const participant1_session2_Token = JSON.parse(join2_stu1.body).participantToken as string;

      const join2_stu2 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: session2JoinCode, studentId: stu2.id },
      });
      const participant2_session2_Token = JSON.parse(join2_stu2.body).participantToken as string;

      // 12. Phát động Ca 2 trong phiên Tiết 2
      const startBatch2Res = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/start-batch`,
        headers: authHeader,
        payload: { sessionId: session2Id },
      });
      expect(startBatch2Res.statusCode).toBe(200);
      expect(JSON.parse(startBatch2Res.body).exam.currentBatch).toBe(2);

      const run2Res = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session2Id}/activities/current`,
      });
      const runId2 = JSON.parse(run2Res.body).run.id as string;

      // Giáo viên mở đề thi Ca 2
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/teacher-intent`,
        headers: authHeader,
        payload: { runId: runId2, intent: { type: 'open_exam' } },
      });

      // 13. HS1 (đã nộp ở Ca 1) cố tình gửi intent làm bài ở Ca 2 -> BỊ TỪ CHỐI ALREADY_SUBMITTED!
      const cheatAttempt = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/student-intent`,
        payload: {
          participantToken: participant1_session2_Token,
          runId: runId2,
          intent: { type: 'get_paper' },
        },
      });
      expect(cheatAttempt.statusCode).toBe(400);
      expect(JSON.parse(cheatAttempt.body).code).toBe('ALREADY_SUBMITTED');

      // 14. HS2 (chưa thi) làm bài bình thường ở Ca 2
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/student-intent`,
        payload: {
          participantToken: participant2_session2_Token,
          runId: runId2,
          intent: { type: 'get_paper' },
        },
      });
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/student-intent`,
        payload: {
          participantToken: participant2_session2_Token,
          runId: runId2,
          intent: { type: 'save_answer', questionId: 'q1', answer: 0 },
        },
      });
      const submit2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/student-intent`,
        payload: {
          participantToken: participant2_session2_Token,
          runId: runId2,
          intent: { type: 'submit_exam' },
        },
      });
      expect(submit2Res.statusCode).toBe(200);

      // 15. Kiểm tra exam_records: đã có đủ 2 học sinh từ 2 ca thi!
      const finalRecords = await examRecordRepo.listByExam(examId);
      expect(finalRecords).toHaveLength(2);
      const stu2Record = finalRecords.find(r => r.studentId === stu2.id);
      expect(stu2Record).toBeDefined();
      expect(stu2Record?.batchIndex).toBe(2);
      expect(stu2Record?.status).toBe('submitted');

      // 16. Chốt hoàn tất kỳ thi
      await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/finish`,
        headers: authHeader,
        payload: { confirm: true },
      });

      const finalExam = await examRepo.findById(examId);
      expect(finalExam?.status).toBe('finished');
    } finally {
      await app.close();
    }
  });
});
