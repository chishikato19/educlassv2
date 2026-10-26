import { describe, expect, it } from 'vitest';
import {
  hasLatexFormula,
  Mcq4QuestionSchema,
  QuestionPublicSchema,
  QuestionSchema,
  RichTextSchema,
  ShortQuestionSchema,
  stripAnswerKey,
  TfGroupQuestionSchema,
  TfQuestionSchema,
  toRichText,
} from '../index.js';

describe('Question Schemas & Sanitization (Task 2.1)', () => {
  it('validates RichText and detects LaTeX formulas correctly', () => {
    const plain = toRichText('Câu hỏi đơn giản');
    expect(plain).toEqual({ text: 'Câu hỏi đơn giản', images: [] });
    expect(hasLatexFormula(plain)).toBe(false);

    const withLatex = toRichText('Giải phương trình $x^2 - 4x + 3 = 0$');
    expect(hasLatexFormula(withLatex)).toBe(true);

    const withBlockLatex = toRichText('Tính tích phân: $$\\int_0^1 x^2 dx$$');
    expect(hasLatexFormula(withBlockLatex)).toBe(true);

    const withBrackets = toRichText('Hàm số \\[f(x) = \\sin(x)\\]');
    expect(hasLatexFormula(withBrackets)).toBe(true);

    const parsed = RichTextSchema.parse({
      text: 'Có ảnh đính kèm',
      images: ['hash_123', 'hash_456'],
    });
    expect(parsed.images).toHaveLength(2);
  });

  it('validates MCQ4 question schema and rejects invalid options or indices', () => {
    const validMcq4 = {
      id: 'q_mcq_1',
      type: 'mcq4',
      stem: { text: 'Thủ đô của Việt Nam là gì?', images: [] },
      options: [
        { text: 'Hà Nội', images: [] },
        { text: 'Huế', images: [] },
        { text: 'Đà Nẵng', images: [] },
        { text: 'TP. Hồ Chí Minh', images: [] },
      ],
      correct: 0,
      points: 10,
    };

    expect(Mcq4QuestionSchema.safeParse(validMcq4).success).toBe(true);
    expect(QuestionSchema.safeParse(validMcq4).success).toBe(true);

    // Bị lỗi nếu options không đủ 4
    const invalidOptions = {
      ...validMcq4,
      options: [
        { text: 'A', images: [] },
        { text: 'B', images: [] },
      ],
    };
    expect(Mcq4QuestionSchema.safeParse(invalidOptions).success).toBe(false);

    // Bị lỗi nếu correct ngoài khoảng 0..3
    const invalidCorrect = { ...validMcq4, correct: 4 };
    expect(Mcq4QuestionSchema.safeParse(invalidCorrect).success).toBe(false);
  });

  it('validates TF question schema', () => {
    const validTf = {
      id: 'q_tf_1',
      type: 'tf',
      stem: { text: 'Nước sôi ở 100 độ C ở áp suất khí quyển tiêu chuẩn.', images: [] },
      correct: true,
      points: 10,
    };

    expect(TfQuestionSchema.safeParse(validTf).success).toBe(true);
    expect(QuestionSchema.safeParse(validTf).success).toBe(true);

    const invalidTf = { ...validTf, correct: 'yes' };
    expect(TfQuestionSchema.safeParse(invalidTf).success).toBe(false);
  });

  it('validates TF_GROUP question schema with 4 items and graduated scale', () => {
    const validTfGroup = {
      id: 'q_tfg_1',
      type: 'tf_group',
      stem: { text: 'Cho hàm số $y = x^3 - 3x$. Xét tính đúng sai của các khẳng định sau:', images: [] },
      items: [
        { text: { text: 'a) Hàm số đồng biến trên $(1; +\\infty)$', images: [] }, correct: true },
        { text: { text: 'b) Điểm cực đại của đồ thị hàm số là $(1; -2)$', images: [] }, correct: false },
        { text: { text: 'c) Giá trị nhỏ nhất của hàm số trên $[0; 2]$ bằng $-2$', images: [] }, correct: true },
        { text: { text: 'd) Đồ thị hàm số đi qua gốc tọa độ $O$', images: [] }, correct: true },
      ],
      points: 10,
    };

    expect(TfGroupQuestionSchema.safeParse(validTfGroup).success).toBe(true);
    expect(QuestionSchema.safeParse(validTfGroup).success).toBe(true);

    // Không đủ 4 items
    const invalidItems = {
      ...validTfGroup,
      items: [
        { text: { text: 'a', images: [] }, correct: true },
      ],
    };
    expect(TfGroupQuestionSchema.safeParse(invalidItems).success).toBe(false);
  });

  it('validates SHORT question schema with text and numeric tolerance', () => {
    const textShort = {
      id: 'q_short_1',
      type: 'short',
      stem: { text: 'Khí gì duy trì sự sống và sự cháy?', images: [] },
      accepted: ['O2', 'khí oxy', 'oxy', 'oxygen'],
      points: 10,
    };
    expect(ShortQuestionSchema.safeParse(textShort).success).toBe(true);

    const numericShort = {
      id: 'q_short_2',
      type: 'short',
      stem: { text: 'Tính giá trị của số Pi làm tròn 2 chữ số thập phân:', images: [] },
      accepted: ['3.14', '3,14'],
      numeric: { value: 3.14, tolerance: 0.01 },
      points: 10,
    };
    expect(ShortQuestionSchema.safeParse(numericShort).success).toBe(true);

    // Dung sai âm bị từ chối
    const invalidNumeric = {
      ...numericShort,
      numeric: { value: 3.14, tolerance: -0.5 },
    };
    expect(ShortQuestionSchema.safeParse(invalidNumeric).success).toBe(false);
  });

  it('stripAnswerKey sanitizes all 4 question types safely for students', () => {
    // 1. MCQ4
    const mcq = Mcq4QuestionSchema.parse({
      id: 'q_1',
      type: 'mcq4',
      stem: { text: 'Câu 1', images: [] },
      options: [
        { text: 'A', images: [] },
        { text: 'B', images: [] },
        { text: 'C', images: [] },
        { text: 'D', images: [] },
      ],
      correct: 2,
      explanation: { text: 'Bởi vì C đúng', images: [] },
      points: 10,
    });
    const publicMcq = stripAnswerKey(mcq);
    expect(QuestionPublicSchema.safeParse(publicMcq).success).toBe(true);
    expect(publicMcq).not.toHaveProperty('correct');
    expect(publicMcq).not.toHaveProperty('explanation');

    // 2. TF
    const tf = TfQuestionSchema.parse({
      id: 'q_2',
      type: 'tf',
      stem: { text: 'Câu 2', images: [] },
      correct: true,
      explanation: { text: 'Giải thích', images: [] },
      points: 10,
    });
    const publicTf = stripAnswerKey(tf);
    expect(QuestionPublicSchema.safeParse(publicTf).success).toBe(true);
    expect(publicTf).not.toHaveProperty('correct');
    expect(publicTf).not.toHaveProperty('explanation');

    // 3. TF_GROUP
    const tfGroup = TfGroupQuestionSchema.parse({
      id: 'q_3',
      type: 'tf_group',
      stem: { text: 'Câu 3', images: [] },
      items: [
        { text: { text: 'a', images: [] }, correct: true },
        { text: { text: 'b', images: [] }, correct: false },
        { text: { text: 'c', images: [] }, correct: true },
        { text: { text: 'd', images: [] }, correct: false },
      ],
      points: 10,
    });
    const publicTfGroup = stripAnswerKey(tfGroup);
    expect(QuestionPublicSchema.safeParse(publicTfGroup).success).toBe(true);
    expect(publicTfGroup.type).toBe('tf_group');
    if (publicTfGroup.type === 'tf_group') {
      for (const item of publicTfGroup.items) {
        expect(item).not.toHaveProperty('correct');
      }
    }

    // 4. SHORT
    const short = ShortQuestionSchema.parse({
      id: 'q_4',
      type: 'short',
      stem: { text: 'Câu 4', images: [] },
      accepted: ['Đáp án bí mật'],
      numeric: { value: 100, tolerance: 1 },
      points: 10,
    });
    const publicShort = stripAnswerKey(short);
    expect(QuestionPublicSchema.safeParse(publicShort).success).toBe(true);
    expect(publicShort).not.toHaveProperty('accepted');
    expect(publicShort).not.toHaveProperty('numeric');
  });
});
