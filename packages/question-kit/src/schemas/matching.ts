import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * Mục ghép nối trong một cột (Cột A hoặc Cột B)
 */
export const MatchingItemSchema = z.object({
  id: z.string().min(1),
  text: RichTextSchema,
});
export type MatchingItem = z.infer<typeof MatchingItemSchema>;

/**
 * Câu hỏi ghép nối đầy đủ trên máy chủ (chứa cặp ghép nối đúng)
 */
export const MatchingQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('matching'),
  stem: RichTextSchema,
  leftItems: z.array(MatchingItemSchema).min(2, 'Cần tối thiểu 2 mục ghép ở cột trái'),
  rightItems: z.array(MatchingItemSchema).min(2, 'Cần tối thiểu 2 mục ghép ở cột phải'),
  /**
   * Cặp ghép nối chuẩn: { [leftId: string]: rightId }
   */
  correctPairs: z.record(z.string()),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type MatchingQuestion = z.infer<typeof MatchingQuestionSchema>;

/**
 * Câu hỏi ghép nối công khai gửi cho học sinh (đã loại bỏ đáp án đúng)
 */
export const MatchingPublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('matching'),
  stem: RichTextSchema,
  leftItems: z.array(MatchingItemSchema).min(2),
  rightItems: z.array(MatchingItemSchema).min(2),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type MatchingPublicQuestion = z.infer<typeof MatchingPublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi ghép nối
 */
export const MatchingAnswerSchema = z.object({
  type: z.literal('matching'),
  questionId: z.string().min(1),
  /**
   * Các cặp mà học sinh đã nối: { [leftId: string]: rightId | null }
   */
  pairs: z.record(z.string().nullable()).default({}),
});
export type MatchingAnswer = z.infer<typeof MatchingAnswerSchema>;
