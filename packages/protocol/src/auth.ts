import { z } from 'zod';
import { UserRoleSchema } from './enums.js';

/**
 * DTO dữ liệu người dùng (giáo viên hoặc admin) trả về cho client (không chứa password hash)
 */
export const UserDtoSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  subject: z.string().optional(),
  avatar: z.string().optional(),
  role: UserRoleSchema,
  active: z.boolean(),
  createdAt: z.number().int().positive(),
});

export type UserDto = z.infer<typeof UserDtoSchema>;

/**
 * Yêu cầu đăng nhập tài khoản giáo viên/admin
 */
export const LoginRequestSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Phản hồi sau khi đăng nhập thành công
 */
export const LoginResponseSchema = z.object({
  token: z.string().min(1),
  user: UserDtoSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Yêu cầu đổi mật khẩu hoặc mã PIN cá nhân
 */
export const ChangePasswordRequestSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ / mã PIN cũ'),
  newPassword: z.string().min(4, 'Mã PIN / Mật khẩu mới phải có ít nhất 4 ký tự'),
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

/**
 * Yêu cầu của Admin: Tạo tài khoản giáo viên/admin mới
 */
export const AdminCreateUserRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50, 'Tên đăng nhập không được vượt quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  displayName: z.string().trim().min(1, 'Vui lòng nhập tên hiển thị').max(100, 'Tên hiển thị tối đa 100 ký tự'),
  role: UserRoleSchema.default('teacher'),
});

export type AdminCreateUserRequest = z.infer<typeof AdminCreateUserRequestSchema>;

/**
 * Yêu cầu của Admin: Khóa hoặc kích hoạt tài khoản
 */
export const AdminUpdateUserStatusRequestSchema = z.object({
  active: z.boolean(),
});

export type AdminUpdateUserStatusRequest = z.infer<typeof AdminUpdateUserStatusRequestSchema>;

/**
 * Yêu cầu của Admin: Đặt lại mật khẩu cho tài khoản người dùng
 */
export const AdminResetPasswordRequestSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export type AdminResetPasswordRequest = z.infer<typeof AdminResetPasswordRequestSchema>;

/**
 * Phản hồi danh sách người dùng cho Admin
 */
export const AdminUsersListResponseSchema = z.object({
  users: z.array(UserDtoSchema),
});

export type AdminUsersListResponse = z.infer<typeof AdminUsersListResponseSchema>;

/**
 * Hồ sơ công khai của giáo viên hiển thị ở màn hình đăng nhập (không chứa thông tin nhạy cảm)
 */
export const TeacherPublicProfileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  subject: z.string().optional(),
  avatar: z.string().optional(),
  role: UserRoleSchema,
});

export type TeacherPublicProfile = z.infer<typeof TeacherPublicProfileSchema>;

/**
 * Phản hồi danh sách giáo viên công khai cho màn hình chọn hồ sơ
 */
export const TeachersListResponseSchema = z.object({
  teachers: z.array(TeacherPublicProfileSchema),
});

export type TeachersListResponse = z.infer<typeof TeachersListResponseSchema>;

/**
 * Yêu cầu đăng ký nhanh tài khoản giáo viên mới (PIN mặc định: 1234)
 */
export const RegisterTeacherRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Tên đăng nhập phải có ít nhất 2 ký tự')
    .max(50, 'Tên đăng nhập không được vượt quá 50 ký tự')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới'),
  displayName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100, 'Họ và tên tối đa 100 ký tự'),
  subject: z.string().trim().max(100, 'Tên môn học tối đa 100 ký tự').optional(),
});

export type RegisterTeacherRequest = z.infer<typeof RegisterTeacherRequestSchema>;

/**
 * Yêu cầu đặt lại mã PIN về mặc định 1234 (Phương án 2)
 */
export const ResetTeacherPinRequestSchema = z.object({
  userId: z.string().min(1, 'Thiếu ID người dùng'),
});

export type ResetTeacherPinRequest = z.infer<typeof ResetTeacherPinRequestSchema>;

