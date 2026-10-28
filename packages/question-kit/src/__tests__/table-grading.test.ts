import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TF_GROUP_SCALE,
  gradeMcq4,
  gradeQuestion,
  gradeShort,
  gradeTf,
  gradeTfGroup,
  type Mcq4Answer,
  type Mcq4Question,
  type ShortAnswer,
  type ShortQuestion,
  type TfAnswer,
  type TfGroupAnswer,
  type TfGroupQuestion,
  type TfQuestion,
} from '../index.js';

describe('Table-Driven Grading Tests (Task 2.1)', () => {
  // =========================================================================
  // 1. BẢNG TEST CHẤM ĐIỂM MCQ4
  // =========================================================================
  describe('MCQ4 Grading Table', () => {
    const mcqQuestion: Mcq4Question = {
      id: 'mcq_test_1',
      type: 'mcq4',
      stem: { text: 'Chọn đáp án đúng (B là đúng):', images: [] },
      options: [
        { text: 'Phương án A', images: [] },
        { text: 'Phương án B', images: [] },
        { text: 'Phương án C', images: [] },
        { text: 'Phương án D', images: [] },
      ],
      correct: 1, // B là đáp án đúng
      points: 10,
    };

    const mcqCases: Array<{
      desc: string;
      selected: number | null;
      expectedPoints: number;
      expectedRatio: number;
      expectedIsCorrect: boolean;
    }> = [
      {
        desc: 'Chọn đúng đáp án B (index 1)',
        selected: 1,
        expectedPoints: 10,
        expectedRatio: 1.0,
        expectedIsCorrect: true,
      },
      {
        desc: 'Chọn sai đáp án A (index 0)',
        selected: 0,
        expectedPoints: 0,
        expectedRatio: 0.0,
        expectedIsCorrect: false,
      },
      {
        desc: 'Chọn sai đáp án C (index 2)',
        selected: 2,
        expectedPoints: 0,
        expectedRatio: 0.0,
        expectedIsCorrect: false,
      },
      {
        desc: 'Chọn sai đáp án D (index 3)',
        selected: 3,
        expectedPoints: 0,
        expectedRatio: 0.0,
        expectedIsCorrect: false,
      },
      {
        desc: 'Bỏ trống không chọn (null)',
        selected: null,
        expectedPoints: 0,
        expectedRatio: 0.0,
        expectedIsCorrect: false,
      },
    ];

    mcqCases.forEach(({ desc, selected, expectedPoints, expectedRatio, expectedIsCorrect }) => {
      it(`MCQ4: ${desc}`, () => {
        const answer: Mcq4Answer = {
          type: 'mcq4',
          questionId: mcqQuestion.id,
          selected,
        };
        const result = gradeMcq4(mcqQuestion, answer);
        expect(result.pointsEarned).toBe(expectedPoints);
        expect(result.ratio).toBe(expectedRatio);
        expect(result.isCorrect).toBe(expectedIsCorrect);
        expect(result.isPartial).toBe(false);
      });
    });

    it('handles missing answer gracefully', () => {
      const result = gradeMcq4(mcqQuestion, null);
      expect(result.pointsEarned).toBe(0);
      expect(result.isCorrect).toBe(false);
    });
  });

  // =========================================================================
  // 2. BẢNG TEST CHẤM ĐIỂM TF (ĐÚNG / SAI ĐƠN LẺ)
  // =========================================================================
  describe('TF Grading Table', () => {
    const tfQuestionTrue: TfQuestion = {
      id: 'tf_test_true',
      type: 'tf',
      stem: { text: 'Mặt trời mọc ở hướng Đông.', images: [] },
      correct: true,
      points: 8,
    };

    const tfQuestionFalse: TfQuestion = {
      id: 'tf_test_false',
      type: 'tf',
      stem: { text: '1 + 1 = 3.', images: [] },
      correct: false,
      points: 8,
    };

    const tfCases: Array<{
      desc: string;
      question: TfQuestion;
      selected: boolean | null;
      expectedPoints: number;
      expectedIsCorrect: boolean;
    }> = [
      {
        desc: 'Đúng: chọn true cho câu true',
        question: tfQuestionTrue,
        selected: true,
        expectedPoints: 8,
        expectedIsCorrect: true,
      },
      {
        desc: 'Sai: chọn false cho câu true',
        question: tfQuestionTrue,
        selected: false,
        expectedPoints: 0,
        expectedIsCorrect: false,
      },
      {
        desc: 'Đúng: chọn false cho câu false',
        question: tfQuestionFalse,
        selected: false,
        expectedPoints: 8,
        expectedIsCorrect: true,
      },
      {
        desc: 'Sai: chọn true cho câu false',
        question: tfQuestionFalse,
        selected: true,
        expectedPoints: 0,
        expectedIsCorrect: false,
      },
      {
        desc: 'Bỏ trống (null)',
        question: tfQuestionTrue,
        selected: null,
        expectedPoints: 0,
        expectedIsCorrect: false,
      },
    ];

    tfCases.forEach(({ desc, question, selected, expectedPoints, expectedIsCorrect }) => {
      it(`TF: ${desc}`, () => {
        const answer: TfAnswer = {
          type: 'tf',
          questionId: question.id,
          selected,
        };
        const result = gradeTf(question, answer);
        expect(result.pointsEarned).toBe(expectedPoints);
        expect(result.isCorrect).toBe(expectedIsCorrect);
      });
    });
  });

  // =========================================================================
  // 3. BẢNG TEST CHẤM ĐIỂM TF_GROUP (BẬC THANG BỘ GIÁO DỤC & ĐÀO TẠO)
  // =========================================================================
  describe('TF_GROUP Graduated Scale Table (BGD Standard: 0.1 -> 0.25 -> 0.5 -> 1.0)', () => {
    // Câu hỏi chuẩn với đáp án [True, False, True, False]
    const tfGroupQuestion: TfGroupQuestion = {
      id: 'tfg_test_1',
      type: 'tf_group',
      stem: { text: 'Xét các mệnh đề sau:', images: [] },
      items: [
        { text: { text: 'Ý 1 (Đúng)', images: [] }, correct: true },
        { text: { text: 'Ý 2 (Sai)', images: [] }, correct: false },
        { text: { text: 'Ý 3 (Đúng)', images: [] }, correct: true },
        { text: { text: 'Ý 4 (Sai)', images: [] }, correct: false },
      ],
      points: 10, // Điểm câu là 10
    };

    const tfGroupCases: Array<{
      desc: string;
      selected: [boolean | null, boolean | null, boolean | null, boolean | null];
      expectedCorrectCount: number;
      expectedRatio: number;
      expectedPoints: number;
      expectedIsCorrect: boolean;
      expectedIsPartial: boolean;
    }> = [
      {
        desc: 'Đúng cả 4 ý (100% điểm)',
        selected: [true, false, true, false],
        expectedCorrectCount: 4,
        expectedRatio: 1.0,
        expectedPoints: 10.0,
        expectedIsCorrect: true,
        expectedIsPartial: false,
      },
      {
        desc: 'Đúng 3 ý (50% điểm theo quy chế BGD)',
        selected: [true, false, true, true], // Sai ý 4
        expectedCorrectCount: 3,
        expectedRatio: 0.5,
        expectedPoints: 5.0,
        expectedIsCorrect: false,
        expectedIsPartial: true,
      },
      {
        desc: 'Đúng 2 ý (25% điểm theo quy chế BGD)',
        selected: [true, true, true, true], // Đúng ý 1, 3; Sai ý 2, 4
        expectedCorrectCount: 2,
        expectedRatio: 0.25,
        expectedPoints: 2.5,
        expectedIsCorrect: false,
        expectedIsPartial: true,
      },
      {
        desc: 'Đúng 1 ý (10% điểm theo quy chế BGD)',
        selected: [true, true, false, true], // Chỉ đúng ý 1; Sai ý 2, 3, 4
        expectedCorrectCount: 1,
        expectedRatio: 0.1,
        expectedPoints: 1.0,
        expectedIsCorrect: false,
        expectedIsPartial: true,
      },
      {
        desc: 'Đúng 0 ý (0% điểm)',
        selected: [false, true, false, true], // Sai tất cả 4 ý
        expectedCorrectCount: 0,
        expectedRatio: 0.0,
        expectedPoints: 0.0,
        expectedIsCorrect: false,
        expectedIsPartial: false,
      },
      {
        desc: 'Bỏ trống toàn bộ 4 ý (0% điểm)',
        selected: [null, null, null, null],
        expectedCorrectCount: 0,
        expectedRatio: 0.0,
        expectedPoints: 0.0,
        expectedIsCorrect: false,
        expectedIsPartial: false,
      },
      {
        desc: 'Làm một phần: chỉ làm 2 ý và đúng cả 2 ý đã làm (đúng 2 ý -> 25%)',
        selected: [true, false, null, null],
        expectedCorrectCount: 2,
        expectedRatio: 0.25,
        expectedPoints: 2.5,
        expectedIsCorrect: false,
        expectedIsPartial: true,
      },
    ];

    tfGroupCases.forEach(
      ({
        desc,
        selected,
        expectedCorrectCount,
        expectedRatio,
        expectedPoints,
        expectedIsCorrect,
        expectedIsPartial,
      }) => {
        it(`TF_GROUP BGD: ${desc}`, () => {
          const answer: TfGroupAnswer = {
            type: 'tf_group',
            questionId: tfGroupQuestion.id,
            selected,
          };
          const result = gradeTfGroup(tfGroupQuestion, answer);
          expect(result.pointsEarned).toBe(expectedPoints);
          expect(result.ratio).toBe(expectedRatio);
          expect(result.isCorrect).toBe(expectedIsCorrect);
          expect(result.isPartial).toBe(expectedIsPartial);

          if (result.details.type === 'tf_group') {
            expect(result.details.correctCount).toBe(expectedCorrectCount);
            expect(result.details.appliedScale).toEqual(DEFAULT_TF_GROUP_SCALE);
          }
        });
      }
    );

    it('supports custom graduated scale (e.g., linear 0.25 per item)', () => {
      const linearScale = { 0: 0.0, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1.0 };
      const answer: TfGroupAnswer = {
        type: 'tf_group',
        questionId: tfGroupQuestion.id,
        selected: [true, false, true, true], // Đúng 3 ý
      };

      const result = gradeTfGroup(tfGroupQuestion, answer, linearScale);
      expect(result.ratio).toBe(0.75);
      expect(result.pointsEarned).toBe(7.5);
      expect(result.isPartial).toBe(true);
    });
  });

  // =========================================================================
  // 4. BẢNG TEST CHẤM ĐIỂM SHORT (TEXT MATCHING & NUMERIC TOLERANCE)
  // =========================================================================
  describe('SHORT Grading Table', () => {
    // 4.1 Text matching
    const shortTextQuestion: ShortQuestion = {
      id: 'short_text_1',
      type: 'short',
      stem: { text: 'Điền tên thủ đô Việt Nam:', images: [] },
      accepted: ['Hà Nội', 'Ha Noi'],
      caseSensitive: false,
      trimWhitespace: true,
      points: 10,
    };

    const shortTextCaseSensitive: ShortQuestion = {
      ...shortTextQuestion,
      id: 'short_text_cs',
      caseSensitive: true,
    };

    const textCases: Array<{
      desc: string;
      question: ShortQuestion;
      text: string;
      expectedPoints: number;
      expectedIsCorrect: boolean;
      expectedMatchedBy: 'text' | 'none';
    }> = [
      {
        desc: 'Khớp chính xác (Hà Nội)',
        question: shortTextQuestion,
        text: 'Hà Nội',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'text',
      },
      {
        desc: 'Khớp không dấu trong accepted (Ha Noi)',
        question: shortTextQuestion,
        text: 'Ha Noi',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'text',
      },
      {
        desc: 'Khớp chữ thường khi không phân biệt hoa thường (hà nội)',
        question: shortTextQuestion,
        text: 'hà nội',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'text',
      },
      {
        desc: 'Tự động cắt khoảng trắng thừa (  Hà Nội  )',
        question: shortTextQuestion,
        text: '  Hà Nội  ',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'text',
      },
      {
        desc: 'Sai nội dung (Đà Nẵng)',
        question: shortTextQuestion,
        text: 'Đà Nẵng',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
      {
        desc: 'Phân biệt hoa thường: viết hoa đúng (Hà Nội)',
        question: shortTextCaseSensitive,
        text: 'Hà Nội',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'text',
      },
      {
        desc: 'Phân biệt hoa thường: viết thường sai (hà nội)',
        question: shortTextCaseSensitive,
        text: 'hà nội',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
      {
        desc: 'Chuỗi rỗng',
        question: shortTextQuestion,
        text: '',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
      {
        desc: 'Chỉ có khoảng trắng',
        question: shortTextQuestion,
        text: '   ',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
    ];

    textCases.forEach(
      ({ desc, question, text, expectedPoints, expectedIsCorrect, expectedMatchedBy }) => {
        it(`SHORT Text: ${desc}`, () => {
          const answer: ShortAnswer = {
            type: 'short',
            questionId: question.id,
            text,
          };
          const result = gradeShort(question, answer);
          expect(result.pointsEarned).toBe(expectedPoints);
          expect(result.isCorrect).toBe(expectedIsCorrect);
          if (result.details.type === 'short') {
            expect(result.details.matchedBy).toBe(expectedMatchedBy);
          }
        });
      }
    );

    // 4.2 Numeric matching with tolerance
    const shortNumericQuestion: ShortQuestion = {
      id: 'short_num_1',
      type: 'short',
      stem: { text: 'Tính tốc độ (m/s):', images: [] },
      accepted: ['15'],
      numeric: {
        value: 15.0,
        tolerance: 0.1, // Chấp nhận [14.9, 15.1]
      },
      points: 10,
    };

    const numericCases: Array<{
      desc: string;
      text: string;
      expectedPoints: number;
      expectedIsCorrect: boolean;
      expectedMatchedBy: 'numeric' | 'text' | 'none';
    }> = [
      {
        desc: 'Khớp số chính xác (15)',
        text: '15',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Khớp số thập phân (15.0)',
        text: '15.0',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Khớp số có dấu phẩy kiểu Việt Nam (15,05)',
        text: '15,05',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Trong dung sai (14.95)',
        text: '14.95',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Ở đúng biên trên dung sai (15.10)',
        text: '15.10',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Ở đúng biên dưới dung sai (14.90)',
        text: '14.90',
        expectedPoints: 10,
        expectedIsCorrect: true,
        expectedMatchedBy: 'numeric',
      },
      {
        desc: 'Vượt dung sai phía trên (15.15)',
        text: '15.15',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
      {
        desc: 'Vượt dung sai phía dưới (14.85)',
        text: '14.85',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
      {
        desc: 'Ký tự chữ không phải số',
        text: 'không biết',
        expectedPoints: 0,
        expectedIsCorrect: false,
        expectedMatchedBy: 'none',
      },
    ];

    numericCases.forEach(({ desc, text, expectedPoints, expectedIsCorrect, expectedMatchedBy }) => {
      it(`SHORT Numeric: ${desc}`, () => {
        const answer: ShortAnswer = {
          type: 'short',
          questionId: shortNumericQuestion.id,
          text,
        };
        const result = gradeShort(shortNumericQuestion, answer);
        expect(result.pointsEarned).toBe(expectedPoints);
        expect(result.isCorrect).toBe(expectedIsCorrect);
        if (result.details.type === 'short') {
          expect(result.details.matchedBy).toBe(expectedMatchedBy);
        }
      });
    });
  });

  // =========================================================================
  // 5. TEST HÀM CHẤM TỔNG HỢP gradeQuestion
  // =========================================================================
  describe('Unified gradeQuestion Function', () => {
    it('dispatches correctly to each question type', () => {
      const qMcq: Mcq4Question = {
        id: 'q_uni_1',
        type: 'mcq4',
        stem: { text: 'Stem', images: [] },
        options: [
          { text: '1', images: [] },
          { text: '2', images: [] },
          { text: '3', images: [] },
          { text: '4', images: [] },
        ],
        correct: 0,
        points: 10,
      };
      const res = gradeQuestion(qMcq, { type: 'mcq4', questionId: 'q_uni_1', selected: 0 });
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(10);
    });

    it('rejects answers with mismatched type or questionId', () => {
      const qTf: TfQuestion = {
        id: 'q_uni_2',
        type: 'tf',
        stem: { text: 'Stem', images: [] },
        correct: true,
        points: 10,
      };
      // Gửi type khác (mcq4 thay vì tf)
      const resMismatchType = gradeQuestion(qTf, {
        type: 'mcq4',
        questionId: 'q_uni_2',
        selected: 0,
      });
      expect(resMismatchType.isCorrect).toBe(false);
      expect(resMismatchType.pointsEarned).toBe(0);

      // Gửi sai questionId
      const resWrongId = gradeQuestion(qTf, { type: 'tf', questionId: 'wrong_id', selected: true });
      expect(resWrongId.isCorrect).toBe(false);
      expect(resWrongId.pointsEarned).toBe(0);
    });
  });
});
