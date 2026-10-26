import { describe, expect, it } from 'vitest';
import type { Question } from '@educlass/question-kit';
import { gradeQuestion, toRichText } from '@educlass/question-kit';
import {
  createSeededRandom,
  generateStudentExamVariant,
  shuffleArray,
  unmapStudentAnswer,
} from '../exam-shuffler.js';

describe('Exam Shuffler & Deterministic Per-Student Variant (Task 4.1)', () => {
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      type: 'mcq4',
      stem: toRichText('2 + 2 = ?'),
      options: [
        toRichText('A. 3'),
        toRichText('B. 4'), // Đáp án đúng: vị trí 1
        toRichText('C. 5'),
        toRichText('D. 6'),
      ],
      correct: 1,
      points: 2.5,
    },
    {
      id: 'q2',
      type: 'tf',
      stem: toRichText('Mặt Trời mọc ở hướng Đông.'),
      correct: true, // Đúng
      points: 2.5,
    },
    {
      id: 'q3',
      type: 'short',
      stem: toRichText('Thủ đô của Việt Nam là gì?'),
      accepted: ['Hà Nội', 'Ha Noi'],
      points: 2.5,
    },
    {
      id: 'q4',
      type: 'tf_group',
      stem: toRichText('Xét tính đúng sai của các mệnh đề số học:'),
      items: [
        { text: toRichText('1 là số nguyên tố'), correct: false },
        { text: toRichText('2 là số nguyên tố chẵn duy nhất'), correct: true },
        { text: toRichText('Số 0 là số nguyên dương'), correct: false },
        { text: toRichText('Tổng 2 số lẻ là một số chẵn'), correct: true },
      ],
      points: 2.5,
    },
  ];

  it('generates deterministic pseudorandom numbers given the same seed', () => {
    const rng1 = createSeededRandom('exam-session-123-student-A');
    const rng2 = createSeededRandom('exam-session-123-student-A');
    const rng3 = createSeededRandom('exam-session-123-student-B');

    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];
    const seq3 = [rng3(), rng3(), rng3()];

    expect(seq1).toEqual(seq2);
    expect(seq1).not.toEqual(seq3);
  });

  it('shuffles arrays idempotently with given rng', () => {
    const arr = [1, 2, 3, 4, 5];
    const rng1 = createSeededRandom(42);
    const shuffled1 = shuffleArray(arr, rng1);

    const rng2 = createSeededRandom(42);
    const shuffled2 = shuffleArray(arr, rng2);

    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1.length).toBe(arr.length);
  });

  it('shuffles questions and options per student while completely stripping answer keys', () => {
    const variantA = generateStudentExamVariant(sampleQuestions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: 'student-A',
    });

    const variantB = generateStudentExamVariant(sampleQuestions, {
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: 'student-B',
    });

    // 1. Kiểm tra toàn bộ câu hỏi công khai không chứa đáp án đúng
    for (const q of variantA.publicQuestions) {
      expect((q as Record<string, unknown>).correct).toBeUndefined();
      expect((q as Record<string, unknown>).accepted).toBeUndefined();
      if (q.type === 'tf_group') {
        for (const itm of q.items) {
          expect((itm as Record<string, unknown>).correct).toBeUndefined();
        }
      }
    }

    // 2. Thứ tự câu hỏi giữa 2 học sinh có thể khác nhau
    expect(variantA.questionOrder).toHaveLength(4);
    expect(variantB.questionOrder).toHaveLength(4);

    // 3. Với câu mcq4 (q1): optionOrders lưu bảng hoán vị 4 phần tử
    expect(variantA.optionOrders['q1']).toHaveLength(4);
    expect(new Set(variantA.optionOrders['q1']).size).toBe(4);
  });

  it('accurately unmaps student answers to original and grades against original question', () => {
    // Giả sử variant của student X có bảng hoán vị câu mcq4:
    // Option gốc [0: '3', 1: '4' (đúng), 2: '5', 3: '6']
    // OptionOrders[q1] = [2, 3, 1, 0]
    // Nghĩa là:
    // Trên đề HS:
    // Vị trí 0 -> option gốc 2 ('5')
    // Vị trí 1 -> option gốc 3 ('6')
    // Vị trí 2 -> option gốc 1 ('4' - Đúng!)
    // Vị trí 3 -> option gốc 0 ('3')
    const optionOrder = [2, 3, 1, 0];

    // Học sinh chọn vị trí 2 trên đề của mình
    const studentChoice = 2;

    const origQ1 = sampleQuestions[0]!;
    const mapped = unmapStudentAnswer(origQ1, studentChoice, optionOrder);

    expect(mapped).toEqual({
      type: 'mcq4',
      questionId: 'q1',
      selected: 1, // Ánh xạ chuẩn xác về option gốc 1 ('4')
    });

    // Chấm điểm bằng grader chuẩn của EduClass
    const gradeResult = gradeQuestion(origQ1, mapped);
    expect(gradeResult.isCorrect).toBe(true);
    expect(gradeResult.pointsEarned).toBe(2.5);

    // Nếu học sinh chọn vị trí 0 ('5') -> sai
    const wrongMapped = unmapStudentAnswer(origQ1, 0, optionOrder);
    const wrongGrade = gradeQuestion(origQ1, wrongMapped);
    expect(wrongGrade.isCorrect).toBe(false);
    expect(wrongGrade.pointsEarned).toBe(0);
  });
});
