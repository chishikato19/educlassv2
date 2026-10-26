import { describe, expect, it } from 'vitest';
import { type Question, toRichText } from '@educlass/question-kit';
import {
  calculateQuestionAnalysis,
  calculateScoreDistribution,
  computeExamResults,
  exportExamExcelBuffer,
  generateExamExcelWorkbook,
} from '../exam-analytics.js';
import type { ExamResult, ParticipantExamStatus } from '../exam-schemas.js';

describe('Exam Analytics, Score Distribution & Excel Export (Task 4.4)', () => {
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      type: 'mcq4',
      stem: toRichText('1 + 1 = ?'),
      options: [toRichText('1'), toRichText('2'), toRichText('3'), toRichText('4')],
      correct: 1, // '2'
      points: 4,
    },
    {
      id: 'q2',
      type: 'tf',
      stem: toRichText('Trái Đất quay quanh Mặt Trời.'),
      correct: true,
      points: 3,
    },
    {
      id: 'q3',
      type: 'short',
      stem: toRichText('Thủ đô của Việt Nam là gì?'),
      accepted: ['Hà Nội', 'Ha Noi'],
      points: 3,
    },
  ];

  const sampleResults: ExamResult[] = [
    {
      participantId: 'hs-01',
      displayName: 'Nguyễn Văn An',
      score: 10,
      maxScore: 10,
      percentage: 100,
      correctCount: 3,
      totalQuestions: 3,
      rank: 1,
      submittedAt: 1700000000000,
    },
    {
      participantId: 'hs-02',
      displayName: 'Trần Thị Bích',
      score: 7,
      maxScore: 10,
      percentage: 70,
      correctCount: 2,
      totalQuestions: 3,
      rank: 2,
      submittedAt: 1700000001000,
    },
    {
      participantId: 'hs-03',
      displayName: 'Lê Văn Cường',
      score: 4,
      maxScore: 10,
      percentage: 40,
      correctCount: 1,
      totalQuestions: 3,
      rank: 3,
      submittedAt: 1700000002000,
    },
  ];

  it('calculates score distribution and statistical KPIs accurately', () => {
    const overview = calculateScoreDistribution(sampleResults);

    expect(overview.totalParticipants).toBe(3);
    expect(overview.submittedCount).toBe(3);
    // Điểm TB: (10 + 7 + 4) / 3 = 7.0
    expect(overview.averageScore).toBe(7);
    expect(overview.highestScore).toBe(10);
    expect(overview.lowestScore).toBe(4);
    expect(overview.medianScore).toBe(7);
    // Số đạt >= 5.0 là 2 em (An, Bích)
    expect(overview.passCount).toBe(2);
    expect(overview.passRate).toBe(67); // 2/3 = 66.67% -> 67%

    // Kiểm tra các dải điểm
    const under5 = overview.buckets.find(b => b.id === 'under_5')!;
    expect(under5.count).toBe(1);
    expect(under5.studentNames).toEqual(['Lê Văn Cường']);

    const bucket65to8 = overview.buckets.find(b => b.id === '6_5_to_8')!;
    expect(bucket65to8.count).toBe(1);
    expect(bucket65to8.studentNames).toEqual(['Trần Thị Bích']);

    const bucket9to10 = overview.buckets.find(b => b.id === '9_to_10')!;
    expect(bucket9to10.count).toBe(1);
    expect(bucket9to10.studentNames).toEqual(['Nguyễn Văn An']);
  });

  it('handles empty results safely in calculateScoreDistribution', () => {
    const overview = calculateScoreDistribution([]);
    expect(overview.totalParticipants).toBe(0);
    expect(overview.averageScore).toBe(0);
    expect(overview.passRate).toBe(0);
    expect(overview.buckets).toHaveLength(5);
    expect(overview.buckets.every(b => b.count === 0)).toBe(true);
  });

  it('analyzes question error rates and distractor options accurately', () => {
    const participants: Record<string, ParticipantExamStatus> = {
      'hs-01': {
        participantId: 'hs-01',
        displayName: 'Nguyễn Văn An',
        authenticated: true,
        isSubmitted: true,
        answers: {
          q1: 1, // đúng (4đ)
          q2: true, // đúng (3đ)
          q3: 'Hà Nội', // đúng (3đ)
        },
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [0, 1, 2, 3] },
      },
      'hs-02': {
        participantId: 'hs-02',
        displayName: 'Trần Thị Bích',
        authenticated: true,
        isSubmitted: true,
        answers: {
          q1: 1, // đúng (4đ)
          q2: false, // sai (0đ)
          q3: 'Hà Nội', // đúng (3đ)
        },
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [0, 1, 2, 3] },
      },
      'hs-03': {
        participantId: 'hs-03',
        displayName: 'Lê Văn Cường',
        authenticated: true,
        isSubmitted: true,
        answers: {
          q1: 2, // sai chọn '3' (0đ)
          q2: false, // sai (0đ)
          // q3 bỏ trống
        },
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [0, 1, 2, 3] },
      },
    };

    const analysis = calculateQuestionAnalysis(sampleQuestions, participants);
    expect(analysis).toHaveLength(3);

    // Câu 1: 3 lượt làm, 2 đúng, 1 sai -> tỷ lệ sai 33%
    const q1Analysis = analysis.find(a => a.questionId === 'q1')!;
    expect(q1Analysis.totalAttempts).toBe(3);
    expect(q1Analysis.correctCount).toBe(2);
    expect(q1Analysis.incorrectCount).toBe(1);
    expect(q1Analysis.errorRate).toBe(33);
    expect(q1Analysis.unansweredCount).toBe(0);
    expect(q1Analysis.options).toBeDefined();
    expect(q1Analysis.options?.[1]?.selectedCount).toBe(2); // phương án 1 ('2') có 2 bạn chọn

    // Câu 2: 3 lượt làm, 1 đúng (An), 2 sai (Bích, Cường) -> tỷ lệ sai 67%
    const q2Analysis = analysis.find(a => a.questionId === 'q2')!;
    expect(q2Analysis.totalAttempts).toBe(3);
    expect(q2Analysis.correctCount).toBe(1);
    expect(q2Analysis.incorrectCount).toBe(2);
    expect(q2Analysis.errorRate).toBe(67);

    // Câu 3: 2 lượt làm (An, Bích), 2 đúng, 1 bỏ trống (Cường)
    const q3Analysis = analysis.find(a => a.questionId === 'q3')!;
    expect(q3Analysis.totalAttempts).toBe(2);
    expect(q3Analysis.correctCount).toBe(2);
    expect(q3Analysis.incorrectCount).toBe(0);
    expect(q3Analysis.errorRate).toBe(0);
    expect(q3Analysis.unansweredCount).toBe(1);
  });

  it('computes exam results with unmapping and ranks students correctly', () => {
    const participants: Record<string, ParticipantExamStatus> = {
      'hs-01': {
        participantId: 'hs-01',
        displayName: 'Nguyễn Văn An',
        authenticated: true,
        isSubmitted: true,
        answers: { q1: 0, q2: true, q3: 'Hà Nội' }, // giả sử q1 bị xáo, vị trí 0 là '2'
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [1, 0, 2, 3] }, // option 0 của HS là option 1 gốc ('2')
      },
      'hs-02': {
        participantId: 'hs-02',
        displayName: 'Trần Thị Bích',
        authenticated: true,
        isSubmitted: true,
        answers: { q1: 0, q2: false, q3: 'Đà Nẵng' }, // sai câu 2 và 3
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [1, 0, 2, 3] },
      },
    };

    const results = computeExamResults(sampleQuestions, participants);
    expect(results).toHaveLength(2);

    expect(results[0]?.displayName).toBe('Nguyễn Văn An');
    expect(results[0]?.score).toBe(10);
    expect(results[0]?.rank).toBe(1);

    expect(results[1]?.displayName).toBe('Trần Thị Bích');
    expect(results[1]?.score).toBe(4); // chỉ đúng q1 (4 điểm)
    expect(results[1]?.rank).toBe(2);
  });

  it('generates professional multi-sheet Excel workbook and binary buffer', () => {
    const participants: Record<string, ParticipantExamStatus> = {
      'hs-01': {
        participantId: 'hs-01',
        displayName: 'Nguyễn Văn An',
        authenticated: true,
        isSubmitted: true,
        answers: { q1: 1, q2: true, q3: 'Hà Nội' },
        questionOrder: ['q1', 'q2', 'q3'],
        optionOrders: { q1: [0, 1, 2, 3] },
      },
    };

    const workbook = generateExamExcelWorkbook({
      examTitle: 'Kỳ thi Khảo sát Toán 10',
      durationMinutes: 45,
      questions: sampleQuestions,
      results: sampleResults,
      participants,
    });

    // Xác minh có đầy đủ 5 sheets chuyên nghiệp
    expect(workbook.SheetNames).toEqual([
      'Tổng quan & Phổ điểm',
      'Bảng điểm học sinh',
      'Tổng hợp',
      'Phân tích câu hỏi',
      'Ma trận làm bài',
    ]);

    // Xuất buffer nhị phân (.xlsx)
    const buffer = exportExamExcelBuffer({
      examTitle: 'Kỳ thi Khảo sát Toán 10',
      durationMinutes: 45,
      questions: sampleQuestions,
      results: sampleResults,
      participants,
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(100);
  });
});
