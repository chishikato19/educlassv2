import { z } from 'zod';
import { StudentDtoSchema } from './student.js';

/**
 * DTO cơ bản của một nhóm học sinh trong lớp
 */
export const ClassGroupDtoSchema = z.object({
  id: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().min(1),
  orderIndex: z.number().int().default(0),
  leaderStudentId: z.string().nullable().optional(),
  createdAt: z.number().int().positive(),
  memberCount: z.number().int().optional(),
});

export type ClassGroupDto = z.infer<typeof ClassGroupDtoSchema>;

/**
 * DTO chi tiết của nhóm kèm danh sách thành viên và nhóm trưởng
 */
export const ClassGroupWithMembersDtoSchema = ClassGroupDtoSchema.extend({
  members: z.array(StudentDtoSchema),
  leader: StudentDtoSchema.nullable().optional(),
});

export type ClassGroupWithMembersDto = z.infer<typeof ClassGroupWithMembersDtoSchema>;

/**
 * Yêu cầu tạo nhóm mới trong lớp
 */
export const CreateClassGroupRequestSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên nhóm').max(100, 'Tên nhóm tối đa 100 ký tự'),
  orderIndex: z.number().int().optional(),
  leaderStudentId: z.string().nullable().optional(),
});

export type CreateClassGroupRequest = z.infer<typeof CreateClassGroupRequestSchema>;

/**
 * Yêu cầu cập nhật thông tin nhóm
 */
export const UpdateClassGroupRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhóm không được để trống')
    .max(100, 'Tên nhóm tối đa 100 ký tự')
    .optional(),
  orderIndex: z.number().int().optional(),
  leaderStudentId: z.string().nullable().optional(),
});

export type UpdateClassGroupRequest = z.infer<typeof UpdateClassGroupRequestSchema>;

/**
 * Yêu cầu chỉ định nhóm trưởng
 */
export const AssignGroupLeaderRequestSchema = z.object({
  studentId: z.string().nullable(),
});

export type AssignGroupLeaderRequest = z.infer<typeof AssignGroupLeaderRequestSchema>;

/**
 * Yêu cầu gán học sinh vào nhóm hoặc chuyển nhóm
 */
export const AssignStudentGroupRequestSchema = z.object({
  groupId: z.string().nullable(),
});

export type AssignStudentGroupRequest = z.infer<typeof AssignStudentGroupRequestSchema>;

/**
 * Yêu cầu chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh
 */
export const RandomizeGroupsRequestSchema = z.object({
  groupCount: z.coerce
    .number()
    .int()
    .min(2, 'Số nhóm tối thiểu là 2')
    .max(30, 'Số nhóm tối đa là 30')
    .default(4),
  groupNames: z.array(z.string().trim().min(1)).optional(),
  autoAssignLeader: z.boolean().default(true),
});

export type RandomizeGroupsRequest = z.infer<typeof RandomizeGroupsRequestSchema>;

/**
 * Phản hồi danh sách toàn bộ nhóm và học sinh chưa phân nhóm
 */
export const ClassGroupOverviewResponseSchema = z.object({
  groups: z.array(ClassGroupWithMembersDtoSchema),
  unassignedStudents: z.array(StudentDtoSchema),
  totalStudents: z.number().int(),
});

export type ClassGroupOverviewResponse = z.infer<typeof ClassGroupOverviewResponseSchema>;
