import { z } from 'zod';
import { DifficultyLevelSchema, QuestionTypeSchema } from './enums.js';

/**
 * DTO bản ghi câu hỏi trong Ngân hàng câu hỏi (bank_questions)
 */
export const BankQuestionDtoSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  lesson: z.string().min(1),
  difficulty: DifficultyLevelSchema,
  type: QuestionTypeSchema,
  contentJson: z.string(),
  answerJson: z.string(),
  points: z.number().int().positive().default(10),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type BankQuestionDto = z.infer<typeof BankQuestionDtoSchema>;

/**
 * Request tạo mới một câu hỏi vào Ngân hàng
 */
export const CreateBankQuestionRequestSchema = z.object({
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1).max(100),
  chapter: z.string().min(1).max(255),
  lesson: z.string().min(1).max(255),
  difficulty: DifficultyLevelSchema,
  type: QuestionTypeSchema,
  contentJson: z.string().min(1),
  answerJson: z.string().min(1),
  points: z.coerce.number().int().positive().default(10),
});
export type CreateBankQuestionRequest = z.infer<typeof CreateBankQuestionRequestSchema>;

/**
 * Request thêm hàng loạt câu hỏi vào Ngân hàng
 */
export const BatchCreateBankQuestionRequestSchema = z.object({
  questions: z.array(CreateBankQuestionRequestSchema).min(1, 'Cần ít nhất 1 câu hỏi'),
});
export type BatchCreateBankQuestionRequest = z.infer<typeof BatchCreateBankQuestionRequestSchema>;

/**
 * Request cập nhật câu hỏi trong Ngân hàng
 */
export const UpdateBankQuestionRequestSchema = z.object({
  grade: z.coerce.number().int().min(1).max(12).optional(),
  subject: z.string().min(1).max(100).optional(),
  chapter: z.string().min(1).max(255).optional(),
  lesson: z.string().min(1).max(255).optional(),
  difficulty: DifficultyLevelSchema.optional(),
  type: QuestionTypeSchema.optional(),
  contentJson: z.string().min(1).optional(),
  answerJson: z.string().min(1).optional(),
  points: z.coerce.number().int().positive().optional(),
});
export type UpdateBankQuestionRequest = z.infer<typeof UpdateBankQuestionRequestSchema>;

/**
 * Số lượng câu hỏi theo 4 mức độ nhận thức
 */
export const MatrixCountsSchema = z.object({
  nb: z.coerce.number().int().nonnegative().default(0),
  th: z.coerce.number().int().nonnegative().default(0),
  vd: z.coerce.number().int().nonnegative().default(0),
  vdc: z.coerce.number().int().nonnegative().default(0),
});
export type MatrixCounts = z.infer<typeof MatrixCountsSchema>;

/**
 * Dòng cấu hình ma trận cho một bài học
 */
export const MatrixLessonRowSchema = z.object({
  chapter: z.string().min(1),
  lesson: z.string().min(1),
  counts: MatrixCountsSchema,
});
export type MatrixLessonRow = z.infer<typeof MatrixLessonRowSchema>;

/**
 * Yêu cầu sinh bộ đề từ ma trận câu hỏi
 */
export const MatrixGenerateRequestSchema = z.object({
  title: z.string().min(1).max(255),
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1).max(100),
  matrix: z.array(MatrixLessonRowSchema).min(1, 'Cần chọn ít nhất 1 bài học'),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
});
export type MatrixGenerateRequest = z.infer<typeof MatrixGenerateRequestSchema>;

/**
 * Request lấy thống kê số câu sẵn có theo ma trận
 */
export const MatrixStatsRequestSchema = z.object({
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(1),
  lessons: z.array(z.string()).default([]),
});
export type MatrixStatsRequest = z.infer<typeof MatrixStatsRequestSchema>;

/**
 * Số câu sẵn có của một bài học
 */
export const LessonAvailableCountsSchema = z.object({
  chapter: z.string(),
  lesson: z.string(),
  available: MatrixCountsSchema,
  total: z.number().int().nonnegative(),
});
export type LessonAvailableCounts = z.infer<typeof LessonAvailableCountsSchema>;

/**
 * Response thống kê ma trận số câu sẵn có
 */
export const MatrixStatsResponseSchema = z.object({
  stats: z.record(z.string(), LessonAvailableCountsSchema),
});
export type MatrixStatsResponse = z.infer<typeof MatrixStatsResponseSchema>;

/**
 * Cây phân cấp bài học kèm số lượng câu hỏi
 */
export const BankCurriculumTreeNodeSchema = z.object({
  chapter: z.string(),
  lessons: z.array(
    z.object({
      lesson: z.string(),
      totalQuestions: z.number().int().nonnegative(),
      countsByDifficulty: MatrixCountsSchema,
    }),
  ),
  totalQuestions: z.number().int().nonnegative(),
});
export type BankCurriculumTreeNode = z.infer<typeof BankCurriculumTreeNodeSchema>;
