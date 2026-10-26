import { z } from 'zod';

/**
 * Trọng số 4 thành phần điểm (0 - 100)
 */
export const ProjectGradingWeightsSchema = z.object({
  self: z.number().min(0).max(100).default(10),
  teamMember: z.number().min(0).max(100).default(20),
  crossTeam: z.number().min(0).max(100).default(20),
  teacher: z.number().min(0).max(100).default(50),
});

export type ProjectGradingWeights = z.infer<typeof ProjectGradingWeightsSchema>;

/**
 * Cấu hình từng nhóm tham gia phiên chấm điểm
 */
export const ProjectGradingGroupConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  leaderParticipantId: z.string().nullable().optional(),
  leaderDisplayName: z.string().nullable().optional(),
  memberParticipantIds: z.array(z.string()),
});

export type ProjectGradingGroupConfig = z.infer<typeof ProjectGradingGroupConfigSchema>;

/**
 * Cấu hình toàn bộ hoạt động Chấm điểm Dự án
 */
export const ProjectGradingConfigSchema = z.object({
  title: z.string().trim().min(1).default('Chấm điểm Dự án'),
  maxScore: z.number().positive().default(10),
  stepScore: z.number().positive().default(0.1),
  weights: ProjectGradingWeightsSchema.default({
    self: 10,
    teamMember: 20,
    crossTeam: 20,
    teacher: 50,
  }),
  groups: z.array(ProjectGradingGroupConfigSchema).default([]),
  allowFeedbackComment: z.boolean().default(true),
});

export type ProjectGradingConfig = z.infer<typeof ProjectGradingConfigSchema>;

/**
 * Một bản ghi điểm chấm kèm nhận xét
 */
export const GradeEntrySchema = z.object({
  score: z.number().min(0),
  comment: z.string().optional(),
  updatedAt: z.number().int().positive(),
});

export type GradeEntry = z.infer<typeof GradeEntrySchema>;

/**
 * Trạng thái thời gian thực của hoạt động Chấm điểm Dự án (State Machine)
 */
export const ProjectGradingStateSchema = z.object({
  status: z.enum(['grading', 'frozen', 'ended']).default('grading'),
  config: ProjectGradingConfigSchema,

  // [1] Điểm cá nhân tự chấm: participantId -> GradeEntry
  selfGrades: z.record(GradeEntrySchema).default({}),

  // [2] Điểm tổ trưởng chấm thành viên: leaderParticipantId -> (memberParticipantId -> GradeEntry)
  teamMemberGrades: z.record(z.record(GradeEntrySchema)).default({}),

  // [3] Điểm nhóm trưởng chấm chéo nhóm khác: leaderParticipantId -> (targetGroupId -> GradeEntry)
  crossTeamGrades: z.record(z.record(GradeEntrySchema)).default({}),

  // [4] Điểm giáo viên chấm:
  // - Cho từng nhóm: targetGroupId -> GradeEntry
  teacherGroupGrades: z.record(GradeEntrySchema).default({}),
  // - Cho từng học sinh cá nhân (tùy chọn ghi đè): participantId -> GradeEntry
  teacherStudentGrades: z.record(GradeEntrySchema).default({}),
});

export type ProjectGradingState = z.infer<typeof ProjectGradingStateSchema>;

/**
 * Kết quả chấm điểm tổng kết của từng học sinh
 */
export const ProjectGradingStudentResultSchema = z.object({
  participantId: z.string(),
  studentId: z.string().nullable().optional(),
  displayName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  isLeader: z.boolean(),
  selfScore: z.number().nullable(),
  teamMemberScore: z.number().nullable(),
  crossTeamScore: z.number().nullable(),
  teacherScore: z.number().nullable(),
  finalScore: z.number(),
  rank: z.number().int().optional(),
  feedbackComments: z.array(z.string()).optional(),
});

export type ProjectGradingStudentResult = z.infer<typeof ProjectGradingStudentResultSchema>;

export const ProjectGradingResultSchema = z.object({
  results: z.array(ProjectGradingStudentResultSchema),
  completedAt: z.number().int().positive(),
});

export type ProjectGradingResult = z.infer<typeof ProjectGradingResultSchema>;

/**
 * Intent học sinh gửi: [1] Tự chấm điểm cá nhân
 */
export const SubmitSelfGradeIntentSchema = z.object({
  type: z.literal('submit_self_grade'),
  score: z.number().min(0),
  comment: z.string().optional(),
});

export type SubmitSelfGradeIntent = z.infer<typeof SubmitSelfGradeIntentSchema>;

/**
 * Intent nhóm trưởng gửi: [2] Chấm điểm thành viên trong nhóm
 */
export const SubmitTeamMemberGradeIntentSchema = z.object({
  type: z.literal('submit_team_member_grade'),
  memberParticipantId: z.string().min(1),
  score: z.number().min(0),
  comment: z.string().optional(),
});

export type SubmitTeamMemberGradeIntent = z.infer<typeof SubmitTeamMemberGradeIntentSchema>;

/**
 * Intent nhóm trưởng gửi: [3] Chấm điểm chéo nhóm bạn
 */
export const SubmitCrossTeamGradeIntentSchema = z.object({
  type: z.literal('submit_cross_team_grade'),
  targetGroupId: z.string().min(1),
  score: z.number().min(0),
  comment: z.string().optional(),
});

export type SubmitCrossTeamGradeIntent = z.infer<typeof SubmitCrossTeamGradeIntentSchema>;

/**
 * Intent giáo viên gửi: [4] Nhập điểm GV (cho nhóm hoặc cá nhân)
 */
export const SubmitTeacherGradeIntentSchema = z.object({
  type: z.literal('submit_teacher_grade'),
  targetType: z.enum(['group', 'student']),
  targetId: z.string().min(1),
  score: z.number().min(0),
  comment: z.string().optional(),
});

export type SubmitTeacherGradeIntent = z.infer<typeof SubmitTeacherGradeIntentSchema>;

/**
 * Intent giáo viên: Khóa / mở chấm
 */
export const SetGradingStatusIntentSchema = z.object({
  type: z.literal('set_grading_status'),
  status: z.enum(['grading', 'frozen']),
});

export type SetGradingStatusIntent = z.infer<typeof SetGradingStatusIntentSchema>;

/**
 * Tổng hợp các Intent từ Học sinh / Nhóm trưởng
 */
export const ProjectGradingStudentIntentSchema = z.discriminatedUnion('type', [
  SubmitSelfGradeIntentSchema,
  SubmitTeamMemberGradeIntentSchema,
  SubmitCrossTeamGradeIntentSchema,
]);

export type ProjectGradingStudentIntent = z.infer<typeof ProjectGradingStudentIntentSchema>;

/**
 * Tổng hợp các Intent từ Giáo viên
 */
export const ProjectGradingTeacherIntentSchema = z.discriminatedUnion('type', [
  SubmitTeacherGradeIntentSchema,
  SetGradingStatusIntentSchema,
]);

export type ProjectGradingTeacherIntent = z.infer<typeof ProjectGradingTeacherIntentSchema>;
