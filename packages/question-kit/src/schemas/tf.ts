import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * 2. TF (Đúng / Sai đơn lẻ)
 * Một nhận định kèm đáp án đúng là true hoặc false
 */
export const TfQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('tf'),
  stem: RichTextSchema,
  /** Đáp án đúng: true (Đúng) hoặc false (Sai) */
  correct: z.boolean(),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type TfQuestion = z.infer<typeof TfQuestionSchema>;

/**
 * Câu hỏi TF công khai gửi cho học sinh (đã loại bỏ đáp án đúng)
 */
export const TfPublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('tf'),
  stem: RichTextSchema,
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type TfPublicQuestion = z.infer<typeof TfPublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi TF
 */
export const TfAnswerSchema = z.object({
  type: z.literal('tf'),
  questionId: z.string().min(1),
  /** Học sinh chọn true/false hoặc null nếu chưa chọn */
  selected: z.boolean().nullable(),
});
export type TfAnswer = z.infer<typeof TfAnswerSchema>;
