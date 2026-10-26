import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * Quy tắc so khớp số học kèm dung sai sai phân
 */
export const NumericRuleSchema = z.object({
  /** Giá trị số đúng */
  value: z.number(),
  /** Dung sai cho phép (|giá_trị_nhập - value| <= tolerance). Mặc định: 0 */
  tolerance: z.number().nonnegative().optional().default(0),
});
export type NumericRule = z.infer<typeof NumericRuleSchema>;

/**
 * 4. SHORT (Trả lời ngắn / Điền số / Tự luận ngắn)
 */
export const ShortQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('short'),
  stem: RichTextSchema,
  placeholder: z.string().optional(),
  /** Danh sách các đáp án chữ được chấp nhận (ít nhất 1 đáp án) */
  accepted: z.array(z.string().min(1)).min(1),
  /** Có phân biệt chữ hoa / chữ thường hay không (mặc định false) */
  caseSensitive: z.boolean().optional(),
  /** Có tự động cắt khoảng trắng thừa đầu/cuối hay không (mặc định true) */
  trimWhitespace: z.boolean().optional(),
  /** Cấu hình so khớp số học tùy chọn nếu là câu hỏi đáp án số */
  numeric: NumericRuleSchema.optional(),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type ShortQuestion = z.infer<typeof ShortQuestionSchema>;

/**
 * Câu hỏi SHORT công khai gửi cho học sinh (đã loại bỏ accepted và numeric)
 */
export const ShortPublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('short'),
  stem: RichTextSchema,
  placeholder: z.string().optional(),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type ShortPublicQuestion = z.infer<typeof ShortPublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi SHORT
 */
export const ShortAnswerSchema = z.object({
  type: z.literal('short'),
  questionId: z.string().min(1),
  text: z.string(),
});
export type ShortAnswer = z.infer<typeof ShortAnswerSchema>;
