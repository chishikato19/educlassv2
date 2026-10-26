import { z } from 'zod';

/**
 * File tài liệu do giáo viên phát xuống cho học sinh
 */
export const MaterialFileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Tên file tài liệu không được để trống'),
  size: z.number().int().nonnegative(),
  mime: z.string().default('application/octet-stream'),
  url: z.string().min(1),
  uploadedAt: z.number(),
});
export type MaterialFile = z.infer<typeof MaterialFileSchema>;

/**
 * Thông tin bài nộp của học sinh
 */
export const StudentSubmissionSchema = z.object({
  participantId: z.string(),
  studentName: z.string(),
  studentCode: z.string().optional(),
  fileName: z.string().min(1, 'Tên file bài nộp không được để trống'),
  storedPath: z.string().optional(),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().default('application/octet-stream'),
  submittedAt: z.number(),
  downloadUrl: z.string(),
  status: z.enum(['submitted', 'late']).default('submitted'),
  comment: z.string().optional(),
});
export type StudentSubmission = z.infer<typeof StudentSubmissionSchema>;

/**
 * Cấu hình khởi tạo đợt thu - phát bài tập từ giáo viên
 */
export const AssignmentConfigSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').default('Thu - phát bài tập'),
  instructions: z.string().default(''),
  targetDirectory: z.string().default(''),
  materials: z.array(MaterialFileSchema).default([]),
  allowedExtensions: z.array(z.string()).default([]), // [] = cho phép tất cả các loại file
  maxFileSizeMb: z.number().int().min(1).max(500).default(50),
  allowResubmit: z.boolean().default(true),
  deadlineMinutes: z.number().nullable().default(null),
});
export type AssignmentConfig = z.infer<typeof AssignmentConfigSchema>;

/**
 * Trạng thái thời gian thực của đợt thu bài (Server State)
 */
export const AssignmentStateSchema = z.object({
  title: z.string(),
  instructions: z.string(),
  targetDirectory: z.string(),
  materials: z.array(MaterialFileSchema).default([]),
  allowedExtensions: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().default(50),
  allowResubmit: z.boolean().default(true),
  deadlineAt: z.number().nullable().default(null),
  isLocked: z.boolean().default(false),
  submissions: z.record(StudentSubmissionSchema).default({}),
  startedAt: z.number(),
});
export type AssignmentState = z.infer<typeof AssignmentStateSchema>;

/**
 * Ý định từ giáo viên (Teacher Intent)
 */
export const AssignmentTeacherIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('toggle_lock'),
    isLocked: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('add_material'),
    material: MaterialFileSchema,
  }),
  z.object({
    type: z.literal('remove_material'),
    materialId: z.string(),
  }),
  z.object({
    type: z.literal('update_target_directory'),
    targetDirectory: z.string(),
  }),
  z.object({
    type: z.literal('update_instructions'),
    instructions: z.string(),
  }),
]);
export type AssignmentTeacherIntent = z.infer<typeof AssignmentTeacherIntentSchema>;

/**
 * Ý định từ học sinh (Student Intent)
 */
export const AssignmentStudentIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('submit_assignment'),
    submission: StudentSubmissionSchema,
  }),
]);
export type AssignmentStudentIntent = z.infer<typeof AssignmentStudentIntentSchema>;

/**
 * Kết quả tổng kết khi kết thúc đợt thu bài (Snapshot Result)
 */
export const AssignmentResultSchema = z.object({
  participantId: z.string(),
  studentName: z.string(),
  submitted: z.boolean(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  submittedAt: z.number().optional(),
  status: z.enum(['submitted', 'late', 'missing']).default('missing'),
});
export type AssignmentResult = z.infer<typeof AssignmentResultSchema>;
