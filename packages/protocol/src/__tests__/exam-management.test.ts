import { describe, expect, it } from 'vitest';
import {
  CreateExamRequestSchema,
  ExamConfigDtoSchema,
  ExamDetailDtoSchema,
  ExamListItemDtoSchema,
  ExamRecordDtoSchema,
  StartExamBatchRequestSchema,
  StudentExamEligibilityDtoSchema,
} from '../exam-management.js';

describe('Exam Management DTO & Zod Schemas (Task 1.2)', () => {
  it('validates CreateExamRequest successfully', () => {
    const validData = {
      classId: 'class_01',
      title: 'Kiểm tra 1 tiết Toán',
      subject: 'Toán học',
      durationMinutes: 45,
      config: {
        shuffleQuestions: true,
        shuffleOptions: true,
        allowViewScore: true,
        allowViewReview: true,
      },
    };

    const parsed = CreateExamRequestSchema.parse(validData);
    expect(parsed.classId).toBe('class_01');
    expect(parsed.durationMinutes).toBe(45);
    expect(parsed.config?.shuffleQuestions).toBe(true);

    // Kiểm tra validation lỗi khi thiếu tiêu đề
    expect(() =>
      CreateExamRequestSchema.parse({
        classId: 'class_01',
        title: '',
      })
    ).toThrow();
  });

  it('validates ExamRecordDto for individual student result', () => {
    const record = {
      id: 'rec_01',
      examId: 'exam_01',
      studentId: 'stu_01',
      studentName: 'Nguyễn Văn An',
      studentCode: 'HS01',
      batchIndex: 1,
      status: 'submitted' as const,
      score: 9.5,
      maxScore: 10,
      percentage: 95,
      correctCount: 19,
      totalQuestions: 20,
      answers: { q1: 2, q2: 0 },
      result: { q1: { correct: true } },
      timeSpentSeconds: 1800,
      submittedAt: Date.now(),
    };

    const parsed = ExamRecordDtoSchema.parse(record);
    expect(parsed.id).toBe('rec_01');
    expect(parsed.score).toBe(9.5);
    expect(parsed.batchIndex).toBe(1);
    expect(parsed.status).toBe('submitted');
  });

  it('validates ExamListItemDto and ExamDetailDto', () => {
    const now = Date.now();
    const listItem = {
      id: 'exam_01',
      ownerId: 'teacher_01',
      classId: 'class_01',
      className: '8A1',
      title: 'Khảo sát chất lượng',
      subject: 'Vật lý',
      durationMinutes: 30,
      status: 'waiting_next_batch' as const,
      currentBatch: 1,
      activeSessionId: null,
      totalStudents: 40,
      submittedCount: 20,
      averageScore: 7.8,
      createdAt: now,
      updatedAt: now,
    };

    const parsedList = ExamListItemDtoSchema.parse(listItem);
    expect(parsedList.submittedCount).toBe(20);
    expect(parsedList.totalStudents).toBe(40);
    expect(parsedList.status).toBe('waiting_next_batch');

    const detail = {
      ...listItem,
      config: ExamConfigDtoSchema.parse({}),
      records: [],
      questions: [{ id: 'q1', type: 'mcq4' }],
      stats: {
        averageScore: 7.8,
        highestScore: 10,
        lowestScore: 5,
        gradeDistribution: {
          tot: 10,
          kha: 8,
          dat: 2,
          chuaDat: 0,
        },
      },
    };

    const parsedDetail = ExamDetailDtoSchema.parse(detail);
    expect(parsedDetail.questions).toHaveLength(1);
    expect(parsedDetail.stats?.gradeDistribution.tot).toBe(10);
  });

  it('validates StartExamBatchRequest and StudentExamEligibilityDto', () => {
    const batchReq = StartExamBatchRequestSchema.parse({
      sessionId: 'sess_123',
      batchIndex: 2,
    });
    expect(batchReq.batchIndex).toBe(2);

    const eligibility = StudentExamEligibilityDtoSchema.parse({
      studentId: 'stu_01',
      fullName: 'Trần Văn B',
      code: 'HS02',
      alreadySubmitted: true,
      batchIndex: 1,
      score: 8.5,
    });
    expect(eligibility.alreadySubmitted).toBe(true);
    expect(eligibility.batchIndex).toBe(1);
  });
});
