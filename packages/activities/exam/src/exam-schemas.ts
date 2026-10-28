import { z } from 'zod';
import { QuestionPublicSchema, QuestionSchema } from '@educlass/question-kit';

/**
 * Cấu hình khi giáo viên khởi tạo Kỳ thi (Task 4.1)
 */
export const ExamConfigSchema = z.object({
  title: z.string().min(1, 'Tiêu đề kỳ thi không được để trống'),
  durationMinutes: z.number().int().min(1, 'Thời gian làm bài tối thiểu 1 phút').default(45),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  password: z.string().optional().nullable(),
  questionSetId: z.string().optional().nullable(),
  allowViewScore: z.boolean().default(true).optional(),
  allowViewReview: z.boolean().default(true).optional(),
  examId: z.string().optional().nullable(),
  batchIndex: z.number().int().positive().optional(),
  completedStudentIds: z.array(z.string()).optional(),
  questions: z.array(QuestionSchema).min(1, 'Kỳ thi phải có ít nhất 1 câu hỏi'),
});
export type ExamConfig = z.infer<typeof ExamConfigSchema>;

/**
 * Kết quả bài thi của từng học sinh sau khi kết thúc / chấm điểm
 */
export const ExamResultSchema = z.object({
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  score: z.number().nonnegative().default(0),
  maxScore: z.number().positive().default(10),
  percentage: z.number().min(0).max(100).default(0),
  correctCount: z.number().int().nonnegative().default(0),
  totalQuestions: z.number().int().positive().default(1),
  rank: z.number().int().positive().nullable().default(null),
  submittedAt: z.number().int().positive().nullable().default(null),
});
export type ExamResult = z.infer<typeof ExamResultSchema>;

/**
 * Trạng thái làm bài của từng thí sinh trong kỳ thi
 */
export const ParticipantExamStatusSchema = z.object({
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  authenticated: z.boolean().default(true),
  startedAt: z.number().int().positive().nullable().optional(),
  submittedAt: z.number().int().positive().nullable().optional(),
  isSubmitted: z.boolean().default(false),
  answers: z.record(z.string(), z.unknown()).default({}), // questionId -> studentAnswer
  questionOrder: z.array(z.string()).default([]), // Danh sách questionId theo thứ tự của HS này
  optionOrders: z.record(z.string(), z.array(z.number())).default({}), // questionId -> [2, 0, 3, 1]

  // Giám sát Live (Task 4.3): câu đang làm, % hoàn thành, mất focus, đứng im, cộng giờ
  currentQuestionIndex: z.number().int().nonnegative().nullable().optional(),
  currentQuestionId: z.string().nullable().optional(),
  answeredCount: z.number().int().nonnegative().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  focusLostCount: z.number().int().nonnegative().optional(),
  isFocusLost: z.boolean().optional(),
  lastActiveAt: z.number().int().positive().nullable().optional(),
  extendedMinutes: z.number().int().nonnegative().optional(),
  individualExpiresAt: z.number().int().positive().nullable().optional(),

  // Kết quả và Dữ liệu xem lại sau thi
  result: ExamResultSchema.optional(),
  reviewData: z.array(z.record(z.string(), z.unknown())).optional(),
  rewardGranted: z.boolean().optional(),
});
export type ParticipantExamStatus = z.infer<typeof ParticipantExamStatusSchema>;

/**
 * Trạng thái thời gian thực của Kỳ thi (đồng bộ giữa Server và Clients)
 */
export const ExamStateSchema = z.object({
  title: z.string(),
  durationMinutes: z.number().int().positive(),
  hasPassword: z.boolean(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  allowViewScore: z.boolean().default(true).optional(),
  allowViewReview: z.boolean().default(true).optional(),
  examId: z.string().optional().nullable(),
  batchIndex: z.number().int().positive().optional(),
  completedStudentIds: z.array(z.string()).optional(),
  status: z.enum(['ready', 'in_progress', 'closed']),
  startedAt: z.number().int().positive().nullable(),
  expiresAt: z.number().int().positive().nullable(),
  totalQuestions: z.number().int().nonnegative(),
  participants: z.record(z.string(), ParticipantExamStatusSchema),
  publicQuestions: z.array(QuestionPublicSchema),
  results: z.array(ExamResultSchema).optional(),
  questionAnalysis: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ExamState = z.infer<typeof ExamStateSchema>;
