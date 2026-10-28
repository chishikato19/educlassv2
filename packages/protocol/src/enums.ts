import { z } from 'zod';

/**
 * Vai trò người dùng (giáo viên hoặc quản trị viên)
 */
export const UserRoleSchema = z.enum(['admin', 'teacher']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Trạng thái phiên (FSM: open -> closing -> closed)
 */
export const SessionStatusSchema = z.enum(['open', 'closing', 'closed']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Cài đặt chế độ danh tính của phiên
 */
export const IdentityModeSchema = z.enum(['roster_only', 'roster_or_guest', 'guest_only']);
export type IdentityMode = z.infer<typeof IdentityModeSchema>;

/**
 * Cấp bậc danh tính của học sinh / người tham gia
 * - account: có tài khoản + PIN/mật khẩu -> lưu EXP vĩnh viễn
 * - roster: chọn tên từ danh sách -> không lưu vĩnh viễn
 * - guest: tự nhập nickname -> không lưu vĩnh viễn
 */
export const IdentityLevelSchema = z.enum(['account', 'roster', 'guest']);
export type IdentityLevel = z.infer<typeof IdentityLevelSchema>;

/**
 * Trạng thái kết nối của người tham gia
 */
export const ParticipantStatusSchema = z.enum(['online', 'offline']);
export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;

/**
 * Trạng thái một lượt chạy Activity
 */
export const ActivityRunStatusSchema = z.enum(['ready', 'running', 'ended']);
export type ActivityRunStatus = z.infer<typeof ActivityRunStatusSchema>;

/**
 * Loại câu hỏi chuẩn
 */
export const QuestionTypeSchema = z.enum([
  'mcq4',
  'tf',
  'tf_group',
  'short',
  'matching',
  'cloze_drag',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

/**
 * Phạm vi áp dụng luật thưởng EXP
 */
export const RewardScopeSchema = z.enum(['global', 'teacher']);
export type RewardScope = z.infer<typeof RewardScopeSchema>;

/**
 * Trạng thái kỳ thi lâu dài (hỗ trợ tổ chức theo ca)
 */
export const ExamStatusSchema = z.enum(['ready', 'in_progress', 'waiting_next_batch', 'finished']);
export type ExamStatus = z.infer<typeof ExamStatusSchema>;

/**
 * Trạng thái bài làm của thí sinh trong kỳ thi
 */
export const ExamRecordStatusSchema = z.enum(['not_started', 'in_progress', 'submitted']);
export type ExamRecordStatus = z.infer<typeof ExamRecordStatusSchema>;

/**
 * 4 mức độ nhận thức chuẩn của Bộ GD&ĐT
 * - nb: Nhận biết
 * - th: Thông hiểu
 * - vd: Vận dụng
 * - vdc: Vận dụng cao
 */
export const DifficultyLevelSchema = z.enum(['nb', 'th', 'vd', 'vdc']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
