import { describe, expect, it } from 'vitest';
import {
  ClassRepository,
  createDatabaseConnection,
  ExamRecordRepository,
  ExamRepository,
  runMigrations,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Multi-Batch Exam End-to-End Simulation (Task 5.2)', () => {
  it('simulates 40 students across 2 batches, gate locking, unified report, and excel export', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });

    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const examRepo = new ExamRepository(conn.db);
    const examRecordRepo = new ExamRecordRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo giáo viên và Lớp 8A với 40 học sinh
    const teacher = await userRepo.create({
      username: 'gv_toan8',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Cô Nguyễn Thị Mai',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: 'Lớp 8A',
      year: 2026,
    });

    // Tạo 40 học sinh
    const allStudents = [];
    for (let i = 1; i <= 40; i++) {
      const code = `HS${i < 10 ? '0' : ''}${i}`;
      const name = `Học sinh ${i < 10 ? '0' : ''}${i}`;
      const stu = await studentRepo.create({
        classId: cls.id,
        fullName: name,
        code,
      });
      allStudents.push(stu);
    }
    expect(allStudents).toHaveLength(40);

    const batch1Students = allStudents.slice(0, 20); // 20 em Ca 1 (HS01 - HS20)
    const batch2Students = allStudents.slice(20, 40); // 20 em Ca 2 (HS21 - HS40)

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
        payload: { username: 'gv_toan8', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;
      const authHeader = { authorization: `Bearer ${token}` };

      // 2. Tạo kỳ thi với bộ đề 5 câu hỏi trắc nghiệm
      const questions = [
        {
          id: 'q1',
          type: 'mcq4',
          stem: { text: '1 + 1 bằng mấy?' },
          options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
          correct: 0,
          points: 2,
        },
        {
          id: 'q2',
          type: 'mcq4',
          stem: { text: 'Hình vuông có mấy cạnh?' },
          options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
          correct: 1,
          points: 2,
        },
        {
          id: 'q3',
          type: 'mcq4',
          stem: { text: '2 x 3 bằng mấy?' },
          options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
          correct: 1,
          points: 2,
        },
        {
          id: 'q4',
          type: 'mcq4',
          stem: { text: 'Số nguyên tố chẵn duy nhất là?' },
          options: [{ text: '0' }, { text: '1' }, { text: '2' }, { text: '4' }],
          correct: 2,
          points: 2,
        },
        {
          id: 'q5',
          type: 'mcq4',
          stem: { text: '10 chia 2 bằng?' },
          options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '7' }],
          correct: 1,
          points: 2,
        },
      ];

      const createExamRes = await app.inject({
        method: 'POST',
        url: '/api/exams',
        headers: authHeader,
        payload: {
          classId: cls.id,
          title: 'Kiểm tra 45 phút Giữa HK1',
          subject: 'Toán học',
          durationMinutes: 45,
          questions,
          config: {
            shuffleQuestions: false,
            shuffleOptions: false,
            allowViewScore: true,
            allowViewReview: true,
          },
        },
      });
      expect(createExamRes.statusCode).toBe(201);
      const examId = JSON.parse(createExamRes.body).exam.id as string;

      // ==========================================
      // GIAI ĐOẠN CA 1: TIẾT 1 CHO 20 HỌC SINH ĐẦU
      // ==========================================
      const session1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: authHeader,
        payload: { classId: cls.id, identityMode: 'roster_only', allowTeams: false },
      });
      const session1Id = JSON.parse(session1Res.body).session.id as string;
      const session1JoinCode = JSON.parse(session1Res.body).session.joinCode as string;

      // Giáo viên phát động Ca 1
      const startBatch1Res = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/start-batch`,
        headers: authHeader,
        payload: { sessionId: session1Id, batchIndex: 1 },
      });
      expect(startBatch1Res.statusCode).toBe(200);

      const run1Res = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session1Id}/activities/current`,
      });
      const runId1 = JSON.parse(run1Res.body).run.id as string;

      // Giáo viên mở đề thi Ca 1
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/activities/teacher-intent`,
        headers: authHeader,
        payload: { runId: runId1, intent: { type: 'open_exam' } },
      });

      // 20 học sinh Ca 1 tham gia và nộp bài
      for (const [idx, stu] of batch1Students.entries()) {
        const joinRes = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: { joinCode: session1JoinCode, studentId: stu.id },
        });
        expect(joinRes.statusCode).toBe(200);
        const pToken = JSON.parse(joinRes.body).participantToken as string;

        // Lấy đề
        await app.inject({
          method: 'POST',
          url: `/api/sessions/${session1Id}/activities/student-intent`,
          payload: { participantToken: pToken, runId: runId1, intent: { type: 'get_paper' } },
        });

        // Điền đáp án (các em làm đúng tùy theo index)
        const correctAnswers = [0, 1, 1, 2, 1];
        for (let qIdx = 0; qIdx < 5; qIdx++) {
          const ans = idx % 2 === 0 ? correctAnswers[qIdx] : (correctAnswers[qIdx]! + 1) % 4;
          await app.inject({
            method: 'POST',
            url: `/api/sessions/${session1Id}/activities/student-intent`,
            payload: {
              participantToken: pToken,
              runId: runId1,
              intent: { type: 'save_answer', questionId: `q${qIdx + 1}`, answer: ans },
            },
          });
        }

        // Nộp bài
        const submitRes = await app.inject({
          method: 'POST',
          url: `/api/sessions/${session1Id}/activities/student-intent`,
          payload: { participantToken: pToken, runId: runId1, intent: { type: 'submit_exam' } },
        });
        expect(submitRes.statusCode).toBe(200);
      }

      // Kiểm tra sau Ca 1: Đã lưu đúng 20 bản ghi
      const recordsAfterBatch1 = await examRecordRepo.listByExam(examId);
      expect(recordsAfterBatch1).toHaveLength(20);

      // Hết Tiết 1: Giáo viên tạm dừng Ca 1
      const pauseBatch1Res = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/pause-batch`,
        headers: authHeader,
        payload: { reason: 'Hết tiết 1 - Chuyển ca máy' },
      });
      expect(pauseBatch1Res.statusCode).toBe(200);
      expect(JSON.parse(pauseBatch1Res.body).exam.status).toBe('waiting_next_batch');

      // Đóng phiên Tiết 1
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session1Id}/close`,
        headers: authHeader,
      });

      // ==========================================
      // GIAI ĐOẠN CA 2: TIẾT 2 CHO 20 HỌC SINH SAU
      // ==========================================
      const session2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: authHeader,
        payload: { classId: cls.id, identityMode: 'roster_only', allowTeams: false },
      });
      const session2Id = JSON.parse(session2Res.body).session.id as string;
      const session2JoinCode = JSON.parse(session2Res.body).session.joinCode as string;

      // Giáo viên phát động Ca 2
      const startBatch2Res = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/start-batch`,
        headers: authHeader,
        payload: { sessionId: session2Id },
      });
      expect(startBatch2Res.statusCode).toBe(200);
      expect(JSON.parse(startBatch2Res.body).exam.currentBatch).toBe(2);

      // KIỂM TRA CỔNG CHỌN TÊN: GET /api/sessions/code/:code/roster
      const rosterRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/code/${session2JoinCode}/roster`,
      });
      expect(rosterRes.statusCode).toBe(200);
      const rosterStudents = JSON.parse(rosterRes.body).students as Array<{
        id: string;
        fullName: string;
        isCompletedExam?: boolean;
      }>;

      // 20 học sinh Ca 1 PHẢI có isCompletedExam: true
      for (const stu of batch1Students) {
        const found = rosterStudents.find(s => s.id === stu.id);
        expect(found?.isCompletedExam).toBe(true);
      }
      // 20 học sinh Ca 2 PHẢI có isCompletedExam: false hoặc undefined
      for (const stu of batch2Students) {
        const found = rosterStudents.find(s => s.id === stu.id);
        expect(Boolean(found?.isCompletedExam)).toBe(false);
      }

      // KIỂM TRA BẢO VỆ CẤP MÁY CHỦ: Nếu học sinh Ca 1 cố tình join, bị từ chối ALREADY_SUBMITTED!
      const blockedJoinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: session2JoinCode, studentId: batch1Students[0]!.id },
      });
      expect(blockedJoinRes.statusCode).toBe(400);
      expect(JSON.parse(blockedJoinRes.body).code).toBe('ALREADY_SUBMITTED');

      // Mở đề thi Ca 2
      const run2Res = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session2Id}/activities/current`,
      });
      const runId2 = JSON.parse(run2Res.body).run.id as string;

      await app.inject({
        method: 'POST',
        url: `/api/sessions/${session2Id}/activities/teacher-intent`,
        headers: authHeader,
        payload: { runId: runId2, intent: { type: 'open_exam' } },
      });

      // 20 học sinh Ca 2 tham gia và nộp bài
      for (const stu of batch2Students) {
        const joinRes = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: { joinCode: session2JoinCode, studentId: stu.id },
        });
        expect(joinRes.statusCode).toBe(200);
        const pToken = JSON.parse(joinRes.body).participantToken as string;

        // Lấy đề
        await app.inject({
          method: 'POST',
          url: `/api/sessions/${session2Id}/activities/student-intent`,
          payload: { participantToken: pToken, runId: runId2, intent: { type: 'get_paper' } },
        });

        // Điền đáp án và nộp
        for (let qIdx = 0; qIdx < 5; qIdx++) {
          await app.inject({
            method: 'POST',
            url: `/api/sessions/${session2Id}/activities/student-intent`,
            payload: {
              participantToken: pToken,
              runId: runId2,
              intent: { type: 'save_answer', questionId: `q${qIdx + 1}`, answer: 0 },
            },
          });
        }

        const submitRes = await app.inject({
          method: 'POST',
          url: `/api/sessions/${session2Id}/activities/student-intent`,
          payload: { participantToken: pToken, runId: runId2, intent: { type: 'submit_exam' } },
        });
        expect(submitRes.statusCode).toBe(200);
      }

      // ==========================================
      // GIAI ĐOẠN HOÀN TẤT & XÁC MINH TOÀN DIỆN
      // ==========================================

      // 1. Chốt hoàn tất kỳ thi
      const finishRes = await app.inject({
        method: 'POST',
        url: `/api/exams/${examId}/finish`,
        headers: authHeader,
        payload: { confirm: true },
      });
      expect(finishRes.statusCode).toBe(200);
      expect(JSON.parse(finishRes.body).exam.status).toBe('finished');

      // 2. Tra cứu chi tiết kỳ thi: GET /api/exams/:id
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/exams/${examId}`,
        headers: authHeader,
      });
      expect(detailRes.statusCode).toBe(200);
      const detail = JSON.parse(detailRes.body).exam;

      // Tổng số 40 học sinh, nộp đủ 40 em (100%)
      expect(detail.totalStudents).toBe(40);
      expect(detail.submittedCount).toBe(40);
      expect(detail.records).toHaveLength(40);

      // Phân bổ đúng 20 em Ca 1 và 20 em Ca 2
      const batch1Records = detail.records.filter(
        (r: { batchIndex: number }) => r.batchIndex === 1
      );
      const batch2Records = detail.records.filter(
        (r: { batchIndex: number }) => r.batchIndex === 2
      );
      expect(batch1Records).toHaveLength(20);
      expect(batch2Records).toHaveLength(20);

      // Phổ điểm và phân tích câu hỏi
      expect(detail.stats.averageScore).toBeGreaterThan(0);
      expect(detail.stats.gradeDistribution).toBeDefined();
      expect(detail.stats.questionAnalysis).toHaveLength(5);

      // 3. Xuất file Excel bảng điểm tổng hợp: GET /api/exams/:id/export-excel
      const excelRes = await app.inject({
        method: 'GET',
        url: `/api/exams/${examId}/export-excel`,
        headers: authHeader,
      });
      expect(excelRes.statusCode).toBe(200);
      expect(excelRes.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(excelRes.headers['content-disposition']).toContain(`BangDiem_${examId}.xlsx`);

      // Kiểm tra file buffer hợp lệ (Magic bytes PK zip format của .xlsx)
      const buffer = excelRes.rawPayload;
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);

      // Xác thực trạng thái trong CSDL
      const finalExam = await examRepo.findById(examId);
      expect(finalExam?.status).toBe('finished');
    } finally {
      await app.close();
    }
  });
});
