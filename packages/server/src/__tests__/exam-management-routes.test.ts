import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  ClassRepository,
  createDatabaseConnection,
  ExamRecordRepository,
  runMigrations,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Exam Management REST Routes (Task 2.1)', () => {
  it('supports full exam lifecycle: create, list, detail, start-batch, pause-batch, finish, and eligibility', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo tài khoản giáo viên & Lớp học & 2 học sinh
    const teacher = await userRepo.create({
      username: 'gv_hoa',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Cô Hóa',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: '8A2',
      year: 2026,
    });

    const stu1 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Nguyễn Văn Minh',
      code: 'HS01',
    });
    const stu2 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Lê Thị Thu',
      code: 'HS02',
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
        payload: { username: 'gv_hoa', password: 'pass123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const token = JSON.parse(loginRes.body).token as string;
      const authHeader = { authorization: `Bearer ${token}` };

      // 2. Tạo kỳ thi mới: POST /api/exams
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/exams',
        headers: authHeader,
        payload: {
          classId: cls.id,
          title: 'Kiểm tra 15 phút Hóa học 8',
          subject: 'Hóa học',
          durationMinutes: 15,
          config: {
            shuffleQuestions: true,
            shuffleOptions: true,
            allowViewScore: true,
            allowViewReview: true,
          },
          questions: [
            {
              id: 'q1',
              type: 'mcq4',
              stem: { text: 'Nguyên tử khối của Oxi là bao nhiêu?' },
              options: [{ text: '16' }, { text: '12' }, { text: '14' }, { text: '32' }],
              correct: 0,
              points: 10,
            },
          ],
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createdExam = JSON.parse(createRes.body).exam;
      expect(createdExam.id).toBeDefined();
      expect(createdExam.status).toBe('ready');
      expect(createdExam.currentBatch).toBe(1);

      // 3. Lấy danh sách kỳ thi: GET /api/exams
      const getListRes = await app.inject({
        method: 'GET',
        url: '/api/exams',
        headers: authHeader,
      });
      expect(getListRes.statusCode).toBe(200);
      const examsList = JSON.parse(getListRes.body).exams;
      expect(examsList).toHaveLength(1);
      expect(examsList[0].totalStudents).toBe(2);
      expect(examsList[0].submittedCount).toBe(0);

      // 4. Kiểm tra điều kiện thi: GET /api/exams/:id/eligibility
      const eligRes = await app.inject({
        method: 'GET',
        url: `/api/exams/${createdExam.id}/eligibility`,
        headers: authHeader,
      });
      expect(eligRes.statusCode).toBe(200);
      const eligStudents = JSON.parse(eligRes.body).students;
      expect(eligStudents).toHaveLength(2);
      expect(eligStudents[0].alreadySubmitted).toBe(false);
      const studentIds = eligStudents.map((s: { studentId: string }) => s.studentId);
      expect(studentIds).toContain(stu1.id);
      expect(studentIds).toContain(stu2.id);

      // 5. Mở phiên học mới
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: authHeader,
        payload: { classId: cls.id, identityMode: 'roster_only', allowTeams: false },
      });
      expect(sessionRes.statusCode).toBe(201);
      const sessionId = JSON.parse(sessionRes.body).session.id as string;

      // 6. Phát động Ca 1 trong phiên: POST /api/exams/:id/start-batch
      const startBatchRes = await app.inject({
        method: 'POST',
        url: `/api/exams/${createdExam.id}/start-batch`,
        headers: authHeader,
        payload: { sessionId, batchIndex: 1 },
      });
      expect(startBatchRes.statusCode).toBe(200);
      const startedExam = JSON.parse(startBatchRes.body).exam;
      expect(startedExam.status).toBe('in_progress');
      expect(startedExam.activeSessionId).toBe(sessionId);

      // 7. Tạm dừng ca thi: POST /api/exams/:id/pause-batch
      const pauseRes = await app.inject({
        method: 'POST',
        url: `/api/exams/${createdExam.id}/pause-batch`,
        headers: authHeader,
        payload: { reason: 'Hết tiết 1' },
      });
      expect(pauseRes.statusCode).toBe(200);
      const pausedExam = JSON.parse(pauseRes.body).exam;
      expect(pausedExam.status).toBe('waiting_next_batch');
      expect(pausedExam.activeSessionId).toBeNull();

      // 8. Xem chi tiết kỳ thi: GET /api/exams/:id
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/exams/${createdExam.id}`,
        headers: authHeader,
      });
      expect(detailRes.statusCode).toBe(200);
      const detail = JSON.parse(detailRes.body).exam;
      expect(detail.status).toBe('waiting_next_batch');
      expect(detail.questions).toHaveLength(1);
      expect(detail.totalStudents).toBe(2);

      // 9. Hoàn tất toàn bộ kỳ thi: POST /api/exams/:id/finish
      const finishRes = await app.inject({
        method: 'POST',
        url: `/api/exams/${createdExam.id}/finish`,
        headers: authHeader,
        payload: { confirm: true },
      });
      expect(finishRes.statusCode).toBe(200);
      const finishedExam = JSON.parse(finishRes.body).exam;
      expect(finishedExam.status).toBe('finished');
    } finally {
      await app.close();
    }
  });

  it('exports comprehensive Excel exam report with 3 sheets (Task 2.2)', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const examRecordRepo = new ExamRecordRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    const teacher = await userRepo.create({
      username: 'gv_toan',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Toán',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: '9A1',
      year: 2026,
    });

    const stu1 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Trần Văn Nam',
      code: 'HS01',
    });
    const stu2 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Phạm Thị Lan',
      code: 'HS02',
    });

    const app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
      fastifyOptions: { logger: false },
    });

    try {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'gv_toan', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;
      const authHeader = { authorization: `Bearer ${token}` };

      // Tạo kỳ thi
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/exams',
        headers: authHeader,
        payload: {
          classId: cls.id,
          title: 'Khảo sát chất lượng Toán 9',
          subject: 'Toán học',
          durationMinutes: 45,
          questions: [
            {
              id: 'q1',
              type: 'mcq4',
              stem: { text: 'Căn bậc hai của 16 là?' },
              options: [{ text: '4' }, { text: '-4' }, { text: '16' }, { text: '8' }],
              correct: 0,
              points: 10,
            },
          ],
        },
      });
      expect(createRes.statusCode).toBe(201);
      const examId = JSON.parse(createRes.body).exam.id as string;

      // Giả lập ghi nhận kết quả cho stu1 (đã nộp ở Ca 1)
      await examRecordRepo.upsert({
        examId,
        studentId: stu1.id,
        studentName: stu1.fullName,
        batchIndex: 1,
        status: 'submitted',
        score: 10,
        maxScore: 10,
        percentage: 100,
        correctCount: 1,
        totalQuestions: 1,
        answersJson: JSON.stringify({ q1: 0 }),
        resultJson: JSON.stringify({ q1: { correct: true, score: 10 } }),
        timeSpentSeconds: 350,
        submittedAt: Date.now(),
      });

      // Xuất Excel: GET /api/exams/:id/export-excel
      const exportRes = await app.inject({
        method: 'GET',
        url: `/api/exams/${examId}/export-excel`,
        headers: authHeader,
      });

      expect(exportRes.statusCode).toBe(200);
      expect(exportRes.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(exportRes.headers['content-disposition']).toContain(`BangDiem_${examId}.xlsx`);

      // Kiểm tra nội dung Excel
      const rawPayload = exportRes.rawPayload;
      expect(rawPayload.length).toBeGreaterThan(0);

      const wb = XLSX.read(rawPayload, { type: 'buffer' });
      expect(wb.SheetNames).toEqual(['Bảng điểm lớp', 'Phổ điểm', 'Phân tích câu hỏi']);

      // Kiểm tra sheet Bảng điểm lớp có thông tin của cả 2 học sinh
      const gradeSheet = wb.Sheets['Bảng điểm lớp'];
      expect(gradeSheet).toBeDefined();
      const csv = XLSX.utils.sheet_to_csv(gradeSheet!);
      expect(csv).toContain(stu1.fullName);
      expect(csv).toContain(stu2.fullName);
      expect(csv).toContain('Đã hoàn thành');
      expect(csv).toContain('Chưa dự thi');
    } finally {
      await app.close();
    }
  });
});
