import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * Ô trống cần điền trong câu hỏi kéo thả
 */
export const ClozeBlankSchema = z.object({
  id: z.string().min(1),
  /** Đáp án chuẩn cho ô trống này */
  answer: z.string().min(1),
  hint: z.string().optional(),
});
export type ClozeBlank = z.infer<typeof ClozeBlankSchema>;

/**
 * Ô trống công khai cho học sinh (không chứa đáp án)
 */
export const ClozeBlankPublicSchema = z.object({
  id: z.string().min(1),
  hint: z.string().optional(),
});
export type ClozeBlankPublic = z.infer<typeof ClozeBlankPublicSchema>;

/**
 * Câu hỏi Kéo thả từ vào ô trống đầy đủ trên máy chủ
 */
export const ClozeDragQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('cloze_drag'),
  stem: RichTextSchema,
  /**
   * Mẫu đoạn văn bản có chứa các thẻ đánh dấu ô trống, ví dụ:
   * "Thủ đô của Việt Nam là [blank_1] và thành phố cảng lớn nhất miền Bắc là [blank_2]."
   */
  template: z.string().min(1, 'Đoạn văn bản điền từ không được để trống'),
  blanks: z.array(ClozeBlankSchema).min(1, 'Cần tối thiểu 1 ô trống để điền từ'),
  /**
   * Ngân hàng từ khóa để học sinh chọn/kéo thả (chứa cả từ đúng và từ gây nhiễu)
   */
  wordBank: z.array(z.string().min(1)).min(1, 'Ngân hàng từ khóa không được để trống'),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type ClozeDragQuestion = z.infer<typeof ClozeDragQuestionSchema>;

/**
 * Câu hỏi Kéo thả từ vào ô trống công khai cho học sinh
 */
export const ClozeDragPublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('cloze_drag'),
  stem: RichTextSchema,
  template: z.string().min(1),
  blanks: z.array(ClozeBlankPublicSchema).min(1),
  wordBank: z.array(z.string().min(1)).min(1),
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type ClozeDragPublicQuestion = z.infer<typeof ClozeDragPublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi kéo thả từ
 */
export const ClozeDragAnswerSchema = z.object({
  type: z.literal('cloze_drag'),
  questionId: z.string().min(1),
  /**
   * Các từ mà học sinh đã điền vào từng ô: { [blankId: string]: string | null }
   */
  filled: z.record(z.string().nullable()).default({}),
});
export type ClozeDragAnswer = z.infer<typeof ClozeDragAnswerSchema>;
