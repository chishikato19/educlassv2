import { z } from 'zod';
import { ExamRecordStatusSchema, ExamStatusSchema } from './enums.js';

/**
 * Cấu hình tổ chức kỳ thi dạng JSON
 */
export const ExamConfigDtoSchema = z.object({
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  allowViewScore: z.boolean().default(true),
  allowViewReview: z.boolean().default(true),
  password: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
});
export type ExamConfigDto = z.infer<typeof ExamConfigDtoSchema>;

/**
 * Yêu cầu tạo mới kỳ thi
 */
export const CreateExamRequestSchema = z.object({
  classId: z.string().min(1, 'Lớp học không được để trống'),
  title: z.string().min(1, 'Tiêu đề kỳ thi không được để trống'),
  subject: z.string().optional().nullable(),
  questionSetId: z.string().min(1).optional().nullable(),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
  durationMinutes: z.number().int().min(1, 'Thời gian làm bài tối thiểu 1 phút').default(45),
  config: ExamConfigDtoSchema.optional(),
});
export type CreateExamRequest = z.infer<typeof CreateExamRequestSchema>;

/**
 * Yêu cầu cập nhật kỳ thi
 */
export const UpdateExamRequestSchema = z.object({
  title: z.string().min(1).optional(),
  subject: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  config: ExamConfigDtoSchema.partial().optional(),
});
export type UpdateExamRequest = z.infer<typeof UpdateExamRequestSchema>;

/**
 * Yêu cầu kích hoạt một ca thi trong một phiên học
 */
export const StartExamBatchRequestSchema = z.object({
  sessionId: z.string().min(1, 'Mã phiên học không được để trống'),
  batchIndex: z.number().int().positive().optional(),
});
export type StartExamBatchRequest = z.infer<typeof StartExamBatchRequestSchema>;

/**
 * Yêu cầu tạm dừng ca thi hiện tại
 */
export const PauseExamBatchRequestSchema = z.object({
  reason: z.string().optional(),
});
export type PauseExamBatchRequest = z.infer<typeof PauseExamBatchRequestSchema>;

/**
 * Yêu cầu hoàn tất toàn bộ kỳ thi
 */
export const FinishExamRequestSchema = z.object({
  confirm: z.boolean().default(true),
});
export type FinishExamRequest = z.infer<typeof FinishExamRequestSchema>;

/**
 * Yêu cầu sao chép kỳ thi sang lớp khác
 */
export const CloneExamRequestSchema = z.object({
  targetClassId: z.string().min(1, 'Lớp học nhận kỳ thi không được để trống'),
  newTitle: z.string().optional(),
});
export type CloneExamRequest = z.infer<typeof CloneExamRequestSchema>;

/**
 * DTO bản ghi bài làm của một học sinh trong kỳ thi
 */
export const ExamRecordDtoSchema = z.object({
  id: z.string().min(1),
  examId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentCode: z.string().nullable().optional(),
  batchIndex: z.number().int().positive().default(1),
  status: ExamRecordStatusSchema,
  score: z.number().nonnegative(),
  maxScore: z.number().positive().default(10),
  percentage: z.number().min(0).max(100),
  correctCount: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
  answers: z.record(z.string(), z.unknown()).default({}),
  result: z.unknown().nullable().optional(),
  timeSpentSeconds: z.number().int().nonnegative().default(0),
  submittedAt: z.number().int().nonnegative().default(0),
});
export type ExamRecordDto = z.infer<typeof ExamRecordDtoSchema>;

/**
 * DTO tóm tắt kỳ thi trong danh sách
 */
export const ExamListItemDtoSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  classId: z.string().min(1),
  className: z.string().optional(),
  title: z.string().min(1),
  subject: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  status: ExamStatusSchema,
  currentBatch: z.number().int().positive(),
  activeSessionId: z.string().nullable().optional(),
  activeSessionJoinCode: z.string().nullable().optional(),
  totalStudents: z.number().int().nonnegative(),
  submittedCount: z.number().int().nonnegative(),
  inProgressCount: z.number().int().nonnegative().optional(),
  averageScore: z.number().nullable().optional(),
  maxScore: z.number().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
export type ExamListItemDto = z.infer<typeof ExamListItemDtoSchema>;

/**
 * Phân bố phổ điểm
 */
export const ExamGradeDistributionSchema = z.object({
  tot: z.number().int().nonnegative(), // Điểm >= 8.0 (hoặc >= 80% thang điểm)
  kha: z.number().int().nonnegative(), // 6.5 <= Điểm < 8.0 (hoặc 65% - 80%)
  dat: z.number().int().nonnegative(), // 5.0 <= Điểm < 6.5 (hoặc 50% - 65%)
  chuaDat: z.number().int().nonnegative(), // Điểm < 5.0 (hoặc < 50%)
});
export type ExamGradeDistribution = z.infer<typeof ExamGradeDistributionSchema>;

/**
 * Thống kê mức độ làm đúng từng câu hỏi
 */
export const QuestionAnalysisItemSchema = z.object({
  questionId: z.string(),
  order: z.number().int().positive(),
  correctRatio: z.number().min(0).max(100),
  correctCount: z.number().int().nonnegative(),
  totalAnswered: z.number().int().nonnegative(),
});
export type QuestionAnalysisItem = z.infer<typeof QuestionAnalysisItemSchema>;

/**
 * Thống kê tổng hợp kỳ thi
 */
export const ExamStatsSchema = z.object({
  averageScore: z.number().nonnegative(),
  highestScore: z.number().nonnegative(),
  lowestScore: z.number().nonnegative(),
  maxScore: z.number().optional(),
  gradeDistribution: ExamGradeDistributionSchema,
  questionAnalysis: z.array(QuestionAnalysisItemSchema).optional(),
});
export type ExamStats = z.infer<typeof ExamStatsSchema>;

/**
 * DTO chi tiết kỳ thi
 */
export const ExamDetailDtoSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  classId: z.string().min(1),
  className: z.string().optional(),
  title: z.string().min(1),
  subject: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  config: ExamConfigDtoSchema,
  status: ExamStatusSchema,
  currentBatch: z.number().int().positive(),
  activeSessionId: z.string().nullable().optional(),
  activeSessionJoinCode: z.string().nullable().optional(),
  totalStudents: z.number().int().nonnegative(),
  submittedCount: z.number().int().nonnegative(),
  records: z.array(ExamRecordDtoSchema),
  questions: z.array(z.record(z.string(), z.unknown())),
  stats: ExamStatsSchema.optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
export type ExamDetailDto = z.infer<typeof ExamDetailDtoSchema>;

/**
 * Trạng thái điều kiện thi của từng học sinh trong danh sách lớp
 */
export const StudentExamEligibilityDtoSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  code: z.string().nullable().optional(),
  alreadySubmitted: z.boolean(),
  batchIndex: z.number().int().positive().optional(),
  score: z.number().optional(),
});
export type StudentExamEligibilityDto = z.infer<typeof StudentExamEligibilityDtoSchema>;
