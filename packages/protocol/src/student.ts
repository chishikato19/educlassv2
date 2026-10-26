import { z } from 'zod';
import { AvatarConfigSchema } from './gamification.js';

/**
 * Phân loại học lực học sinh
 */
export const AcademicPerformanceSchema = z.enum(['tot', 'kha', 'dat', 'chua_dat']);
export type AcademicPerformance = z.infer<typeof AcademicPerformanceSchema>;

export const ACADEMIC_PERFORMANCE_LABELS: Record<AcademicPerformance, string> = {
  tot: 'Tốt',
  kha: 'Khá',
  dat: 'Đạt',
  chua_dat: 'Chưa đạt',
};

/**
 * DTO thông tin học sinh
 */
export const StudentDtoSchema = z.object({
  id: z.string().min(1),
  classId: z.string().min(1),
  groupId: z.string().nullable().optional(),
  fullName: z.string().min(1),
  code: z.string().nullable().optional(),
  hasPin: z.boolean(),
  exp: z.number().int(),
  level: z.number().int(),
  academicPerformance: AcademicPerformanceSchema.default('dat'),
  avatarJson: z.string().nullable().optional(),
  avatar: AvatarConfigSchema.optional(),
  createdAt: z.number().int().positive(),
});

export type StudentDto = z.infer<typeof StudentDtoSchema>;

/**
 * Danh sách học sinh trong lớp
 */
export const StudentListResponseSchema = z.object({
  students: z.array(StudentDtoSchema),
  total: z.number().int(),
});

export type StudentListResponse = z.infer<typeof StudentListResponseSchema>;

/**
 * Yêu cầu tạo học sinh mới bằng tay
 */
export const CreateStudentRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ và tên học sinh')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  code: z.string().trim().max(50, 'Mã học sinh tối đa 50 ký tự').optional(),
  academicPerformance: AcademicPerformanceSchema.optional(),
  pin: z
    .string()
    .trim()
    .min(4, 'Mã PIN tối thiểu 4 ký tự')
    .max(20, 'Mã PIN tối đa 20 ký tự')
    .optional(),
});

export type CreateStudentRequest = z.infer<typeof CreateStudentRequestSchema>;

/**
 * Yêu cầu cập nhật học sinh
 */
export const UpdateStudentRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Họ và tên không được để trống')
    .max(100, 'Họ và tên tối đa 100 ký tự')
    .optional(),
  code: z.string().trim().max(50, 'Mã học sinh tối đa 50 ký tự').nullable().optional(),
  academicPerformance: AcademicPerformanceSchema.optional(),
});

export type UpdateStudentRequest = z.infer<typeof UpdateStudentRequestSchema>;

/**
 * Yêu cầu đặt hoặc reset PIN cho học sinh
 */
export const SetStudentPinRequestSchema = z.object({
  pin: z
    .string()
    .trim()
    .min(4, 'Mã PIN tối thiểu 4 ký tự')
    .max(20, 'Mã PIN tối đa 20 ký tự')
    .nullable(),
});

export type SetStudentPinRequest = z.infer<typeof SetStudentPinRequestSchema>;

/**
 * Dòng dữ liệu học sinh đọc từ clipboard hoặc file Excel
 */
export const StudentImportRowSchema = z.object({
  fullName: z.string().trim(),
  code: z.string().trim().optional(),
  academicPerformance: AcademicPerformanceSchema.optional(),
  pin: z.string().trim().optional(),
});

export type StudentImportRow = z.infer<typeof StudentImportRowSchema>;

/**
 * Từng mục trong danh sách xem trước (Preview)
 */
export const StudentPreviewItemSchema = z.object({
  rowIndex: z.number().int(),
  fullName: z.string(),
  code: z.string().optional(),
  academicPerformance: AcademicPerformanceSchema.optional(),
  pin: z.string().optional(),
  status: z.enum(['valid', 'warning', 'error']),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type StudentPreviewItem = z.infer<typeof StudentPreviewItemSchema>;

/**
 * Phản hồi xem trước danh sách import từ Excel hoặc dán
 */
export const StudentImportPreviewResponseSchema = z.object({
  total: z.number().int(),
  validCount: z.number().int(),
  warningCount: z.number().int(),
  errorCount: z.number().int(),
  items: z.array(StudentPreviewItemSchema),
});

export type StudentImportPreviewResponse = z.infer<typeof StudentImportPreviewResponseSchema>;

/**
 * Yêu cầu xem trước dữ liệu dán từ clipboard
 */
export const PreviewPasteRequestSchema = z.object({
  text: z.string(),
});

export type PreviewPasteRequest = z.infer<typeof PreviewPasteRequestSchema>;

/**
 * Yêu cầu xem trước dữ liệu tải lên từ file Excel (Base64)
 */
export const PreviewXlsxRequestSchema = z.object({
  fileBase64: z.string().min(1, 'Tập tin không được để trống'),
});

export type PreviewXlsxRequest = z.infer<typeof PreviewXlsxRequestSchema>;

/**
 * Yêu cầu xác nhận (commit) import học sinh vào lớp
 */
export const CommitStudentImportRequestSchema = z.object({
  students: z.array(CreateStudentRequestSchema).min(1, 'Danh sách học sinh không được rỗng'),
  skipDuplicates: z.boolean().default(true),
});

export type CommitStudentImportRequest = z.infer<typeof CommitStudentImportRequestSchema>;
