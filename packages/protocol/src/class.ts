import { z } from 'zod';

/**
 * DTO dữ liệu lớp học trả về cho người dùng
 */
export const ClassDtoSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int(),
  createdAt: z.number().int().positive(),
});

export type ClassDto = z.infer<typeof ClassDtoSchema>;

/**
 * Yêu cầu tạo lớp học mới
 */
export const CreateClassRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên lớp học')
    .max(100, 'Tên lớp học tối đa 100 ký tự'),
  year: z.coerce
    .number()
    .int()
    .min(2000, 'Năm học không hợp lệ')
    .max(2100, 'Năm học không hợp lệ')
    .default(() => new Date().getFullYear()),
});

export type CreateClassRequest = z.infer<typeof CreateClassRequestSchema>;

/**
 * Yêu cầu cập nhật thông tin lớp học
 */
export const UpdateClassRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên lớp học không được để trống')
    .max(100, 'Tên lớp học tối đa 100 ký tự')
    .optional(),
  year: z.coerce
    .number()
    .int()
    .min(2000, 'Năm học không hợp lệ')
    .max(2100, 'Năm học không hợp lệ')
    .optional(),
});

export type UpdateClassRequest = z.infer<typeof UpdateClassRequestSchema>;

/**
 * Danh sách lớp học trả về
 */
export const ClassListResponseSchema = z.object({
  classes: z.array(ClassDtoSchema),
});

export type ClassListResponse = z.infer<typeof ClassListResponseSchema>;
