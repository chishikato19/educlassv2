import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * 1. MCQ4 (Trắc nghiệm 4 lựa chọn, chọn 1 đáp án đúng)
 * Nội dung câu hỏi: stem + chính xác 4 lựa chọn (options 0..3)
 */
export const Mcq4OptionsSchema = z.tuple([
  RichTextSchema,
  RichTextSchema,
  RichTextSchema,
  RichTextSchema,
]);
export type Mcq4Options = z.infer<typeof Mcq4OptionsSchema>;

/**
 * Câu hỏi MCQ4 đầy đủ trên máy chủ (chứa đáp án đúng)
 */
export const Mcq4QuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('mcq4'),
  stem: RichTextSchema,
  options: Mcq4OptionsSchema,
  /** Chỉ số đáp án đúng (0, 1, 2, 3 tương ứng A, B, C, D) */
  correct: z.number().int().min(0).max(3),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type Mcq4Question = z.infer<typeof Mcq4QuestionSchema>;

/**
 * Câu hỏi MCQ4 công khai gửi cho học sinh (đã loại bỏ đáp án đúng)
 */
export const Mcq4PublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('mcq4'),
  stem: RichTextSchema,
  options: Mcq4OptionsSchema,
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type Mcq4PublicQuestion = z.infer<typeof Mcq4PublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi MCQ4
 */
export const Mcq4AnswerSchema = z.object({
  type: z.literal('mcq4'),
  questionId: z.string().min(1),
  /** Chỉ số phương án học sinh chọn: 0..3 hoặc null nếu chưa chọn/bỏ chọn */
  selected: z.number().int().min(0).max(3).nullable(),
});
export type Mcq4Answer = z.infer<typeof Mcq4AnswerSchema>;
