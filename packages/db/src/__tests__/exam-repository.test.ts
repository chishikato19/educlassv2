import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ExamRepository } from '../repositories/exam-repository.js';
import { ExamRecordRepository } from '../repositories/exam-record-repository.js';
import { classes, sessions, students, users } from '../schema/index.js';

describe('ExamRepository & ExamRecordRepository (Task 1.1)', () => {
  it('creates, attaches session, records student attempts and lists results', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      // 1. Chạy migrations để khởi tạo toàn bộ cấu trúc DB
      const migResult = runMigrations({ sqlite });
      expect(migResult.appliedMigrations.length).toBeGreaterThan(0);

      const examRepo = new ExamRepository(db);
      const examRecordRepo = new ExamRecordRepository(db);

      // 2. Tạo User (GV) và Class (Lớp học 8A)
      const teacherId = '01H7XTESTTEACHER0000000001';
      await db.insert(users).values({
        id: teacherId,
        username: 'gv_toan',
        passwordHash: 'hash123',
        displayName: 'Cô Lan',
        role: 'teacher',
        createdAt: Date.now(),
      });

      const classId = '01H7XTESTCLASS00000000001';
      await db.insert(classes).values({
        id: classId,
        ownerId: teacherId,
        name: '8A',
        year: 2026,
        createdAt: Date.now(),
      });

      // Tạo 2 học sinh đại diện cho Ca 1 và Ca 2
      const student1Id = '01H7XTESTSTUDENT000000001';
      const student2Id = '01H7XTESTSTUDENT000000002';
      await db.insert(students).values([
        {
          id: student1Id,
          classId,
          fullName: 'Nguyễn Văn An',
          code: 'HS01',
          createdAt: Date.now(),
        },
        {
          id: student2Id,
          classId,
          fullName: 'Trần Thị Bình',
          code: 'HS02',
          createdAt: Date.now(),
        },
      ]);

      // 3. Tạo kỳ thi mới (Trạng thái mặc định: ready)
      const exam = await examRepo.create({
        ownerId: teacherId,
        classId,
        title: 'Kiểm tra 1 tiết Toán 8A',
        subject: 'Toán học',
        durationMinutes: 45,
        configJson: JSON.stringify({ shuffleQuestions: true, shuffleOptions: true }),
        questionsSnapshotJson: JSON.stringify([{ id: 'q1', type: 'mcq4', points: 10 }]),
      });

      expect(exam.id).toBeDefined();
      expect(exam.status).toBe('ready');
      expect(exam.currentBatch).toBe(1);

      // 4. Mở Ca 1 trong phiên học Session 1
      const sessionId1 = '01H7XTESTSESSION000000001';
      await db.insert(sessions).values({
        id: sessionId1,
        ownerId: teacherId,
        classId,
        joinCode: 'TEST01',
        status: 'open',
        identityMode: 'roster_only',
        openedAt: Date.now(),
      });
      const attachedExam = await examRepo.attachSession(exam.id, sessionId1, 1);
      expect(attachedExam?.status).toBe('in_progress');
      expect(attachedExam?.activeSessionId).toBe(sessionId1);
      expect(attachedExam?.currentBatch).toBe(1);

      // 5. Học sinh 1 (Ca 1) nộp bài thi
      const record1 = await examRecordRepo.upsert({
        examId: exam.id,
        studentId: student1Id,
        studentName: 'Nguyễn Văn An',
        batchIndex: 1,
        status: 'submitted',
        score: 10,
        maxScore: 10,
        percentage: 100,
        correctCount: 1,
        totalQuestions: 1,
        answersJson: JSON.stringify({ q1: 0 }),
        resultJson: JSON.stringify({ q1: { correct: true, pointsEarned: 10 } }),
        timeSpentSeconds: 1200,
      });

      expect(record1.id).toBeDefined();
      expect(record1.score).toBe(10);
      expect(record1.percentage).toBe(100);
      expect(record1.batchIndex).toBe(1);

      // 6. Hết tiết 1: Tạm dừng kỳ thi (chuyển sang waiting_next_batch)
      const pausedExam = await examRepo.detachSession(exam.id, 'waiting_next_batch');
      expect(pausedExam?.status).toBe('waiting_next_batch');
      expect(pausedExam?.activeSessionId).toBeNull();

      // 7. Sang tiết 2: Mở Ca 2 trong phiên học Session 2
      const sessionId2 = '01H7XTESTSESSION000000002';
      await db.insert(sessions).values({
        id: sessionId2,
        ownerId: teacherId,
        classId,
        joinCode: 'TEST02',
        status: 'open',
        identityMode: 'roster_only',
        openedAt: Date.now(),
      });
      const resumedExam = await examRepo.attachSession(exam.id, sessionId2, 2);
      expect(resumedExam?.status).toBe('in_progress');
      expect(resumedExam?.activeSessionId).toBe(sessionId2);
      expect(resumedExam?.currentBatch).toBe(2);

      // Học sinh 2 (Ca 2) nộp bài thi
      const record2 = await examRecordRepo.upsert({
        examId: exam.id,
        studentId: student2Id,
        studentName: 'Trần Thị Bình',
        batchIndex: 2,
        status: 'submitted',
        score: 8,
        maxScore: 10,
        percentage: 80,
        correctCount: 1,
        totalQuestions: 1,
        answersJson: JSON.stringify({ q1: 1 }),
        resultJson: JSON.stringify({ q1: { correct: true, pointsEarned: 8 } }),
        timeSpentSeconds: 1500,
      });

      expect(record2.batchIndex).toBe(2);
      expect(record2.score).toBe(8);

      // 8. Kiểm tra danh sách kết quả của kỳ thi: phải có đủ cả 2 học sinh của Ca 1 và Ca 2!
      const allRecords = await examRecordRepo.listByExam(exam.id);
      expect(allRecords).toHaveLength(2);
      const studentIds = allRecords.map(r => r.studentId);
      expect(studentIds).toContain(student1Id);
      expect(studentIds).toContain(student2Id);

      // 9. Kết thúc kỳ thi
      const finishedExam = await examRepo.detachSession(exam.id, 'finished');
      expect(finishedExam?.status).toBe('finished');
    } finally {
      close();
    }
  });
});
