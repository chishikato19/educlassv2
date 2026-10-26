import { z } from 'zod';
import { DifficultyLevelSchema } from '@educlass/protocol';
import { RichTextSchema } from '../rich-text.js';

/**
 * Từng ý trong nhóm 4 ý Đúng/Sai (chuẩn đề thi THPT Bộ GD&ĐT)
 */
export const TfGroupItemSchema = z.object({
  text: RichTextSchema,
  correct: z.boolean(),
});
export type TfGroupItem = z.infer<typeof TfGroupItemSchema>;

export const TfGroupItemPublicSchema = z.object({
  text: RichTextSchema,
});
export type TfGroupItemPublic = z.infer<typeof TfGroupItemPublicSchema>;

export const TfGroupItemsSchema = z.tuple([
  TfGroupItemSchema,
  TfGroupItemSchema,
  TfGroupItemSchema,
  TfGroupItemSchema,
]);
export type TfGroupItems = z.infer<typeof TfGroupItemsSchema>;

export const TfGroupItemsPublicSchema = z.tuple([
  TfGroupItemPublicSchema,
  TfGroupItemPublicSchema,
  TfGroupItemPublicSchema,
  TfGroupItemPublicSchema,
]);
export type TfGroupItemsPublic = z.infer<typeof TfGroupItemsPublicSchema>;

/**
 * Cấu hình hệ số điểm bậc thang cho câu hỏi tf_group
 * Theo chuẩn Bộ Giáo dục & Đào tạo Việt Nam:
 * - Đúng 1 ý: 0.1 của điểm câu (10%)
 * - Đúng 2 ý: 0.25 của điểm câu (25%)
 * - Đúng 3 ý: 0.5 của điểm câu (50%)
 * - Đúng 4 ý: 1.0 của điểm câu (100%)
 */
export const TfGroupScaleSchema = z.object({
  0: z.number().min(0).max(1).default(0.0),
  1: z.number().min(0).max(1).default(0.1),
  2: z.number().min(0).max(1).default(0.25),
  3: z.number().min(0).max(1).default(0.5),
  4: z.number().min(0).max(1).default(1.0),
});
export type TfGroupScale = z.infer<typeof TfGroupScaleSchema>;

export const DEFAULT_TF_GROUP_SCALE: TfGroupScale = {
  0: 0.0,
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 1.0,
};

/**
 * Câu hỏi TF_GROUP đầy đủ trên máy chủ
 */
export const TfGroupQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('tf_group'),
  stem: RichTextSchema,
  items: TfGroupItemsSchema,
  points: z.number().positive().default(10),
  /** Điểm bậc thang tùy chỉnh (nếu muốn ghi đè mặc định của BGD) */
  scale: TfGroupScaleSchema.optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  explanation: RichTextSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type TfGroupQuestion = z.infer<typeof TfGroupQuestionSchema>;

/**
 * Câu hỏi TF_GROUP công khai gửi cho học sinh (đã loại bỏ correct của từng ý)
 */
export const TfGroupPublicQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('tf_group'),
  stem: RichTextSchema,
  items: TfGroupItemsPublicSchema,
  points: z.number().positive().default(10),
  orderIndex: z.number().int().nonnegative().optional(),
  difficulty: DifficultyLevelSchema.optional(),
  chapter: z.string().optional(),
  lesson: z.string().optional(),
});
export type TfGroupPublicQuestion = z.infer<typeof TfGroupPublicQuestionSchema>;

/**
 * Câu trả lời của học sinh cho câu hỏi TF_GROUP:
 * Mảng 4 giá trị lựa chọn boolean hoặc null nếu chưa chọn cho từng ý a, b, c, d
 */
export const TfGroupAnswerSchema = z.object({
  type: z.literal('tf_group'),
  questionId: z.string().min(1),
  selected: z.tuple([
    z.boolean().nullable(),
    z.boolean().nullable(),
    z.boolean().nullable(),
    z.boolean().nullable(),
  ]),
});
export type TfGroupAnswer = z.infer<typeof TfGroupAnswerSchema>;
