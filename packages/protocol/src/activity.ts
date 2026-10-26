import { z } from 'zod';
import { ActivityRunStatusSchema } from './enums.js';

/**
 * Các năng lực đặc biệt của một Activity (tùy chọn)
 */
export const ActivityCapabilitySchema = z.enum(['files', 'screen', 'chat-lock']);
export type ActivityCapability = z.infer<typeof ActivityCapabilitySchema>;

/**
 * Thông tin siêu dữ liệu (Metadata) của Activity
 */
export const ActivityMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  icon: z.string().min(1),
  description: z.string().optional(),
  capabilities: z.array(ActivityCapabilitySchema).optional().default([]),
  rewardTriggers: z.array(z.string()).default([]),
});
export type ActivityMeta = z.infer<typeof ActivityMetaSchema>;

/**
 * Phản hồi từ chối intent không hợp lệ từ học sinh hoặc giáo viên
 */
export const ActivityRejectSchema = z.object({
  ok: z.literal(false),
  reason: z.string(),
  code: z.string().optional(),
});
export type ActivityReject = z.infer<typeof ActivityRejectSchema>;

/**
 * DTO đại diện cho một lượt chạy Activity trong phiên
 */
export const ActivityRunDtoSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  activityId: z.string(),
  config: z.unknown(),
  status: ActivityRunStatusSchema,
  startedAt: z.number(),
  endedAt: z.number().nullable().optional(),
});
export type ActivityRunDto = z.infer<typeof ActivityRunDtoSchema>;

/**
 * DTO kết quả snapshot bất biến của người tham gia sau khi kết thúc lượt chạy
 */
export const ActivityResultDtoSchema = z.object({
  id: z.string(),
  runId: z.string(),
  participantId: z.string(),
  score: z.unknown(),
  rank: z.number().int().positive().nullable().optional(),
});
export type ActivityResultDto = z.infer<typeof ActivityResultDtoSchema>;

/**
 * Payload thông báo bắt đầu lượt chạy Activity (WS Message: activity_start)
 */
export const ActivityStartPayloadSchema = z.object({
  runId: z.string(),
  activityId: z.string(),
  config: z.unknown(),
  startedAt: z.number(),
});
export type ActivityStartPayload = z.infer<typeof ActivityStartPayloadSchema>;

/**
 * Payload phát sóng trạng thái lượt chạy Activity (WS Message: activity_state)
 */
export const ActivityStatePayloadSchema = z.object({
  runId: z.string(),
  activityId: z.string(),
  state: z.unknown(),
  revision: z.number().int().nonnegative().default(0),
  ts: z.number(),
});
export type ActivityStatePayload = z.infer<typeof ActivityStatePayloadSchema>;

/**
 * Payload gửi ý định hành động từ Client lên Server (WS Message: activity_intent)
 */
export const ActivityIntentPayloadSchema = z.object({
  runId: z.string(),
  intent: z.unknown(),
});
export type ActivityIntentPayload = z.infer<typeof ActivityIntentPayloadSchema>;

/**
 * Payload thông báo kết thúc lượt chạy Activity kèm kết quả (WS Message: activity_end)
 */
export const ActivityEndPayloadSchema = z.object({
  runId: z.string(),
  activityId: z.string(),
  results: z.array(z.unknown()),
  endedAt: z.number(),
});
export type ActivityEndPayload = z.infer<typeof ActivityEndPayloadSchema>;

/**
 * REST: Bắt đầu Activity mới
 */
export const StartActivityRequestSchema = z.object({
  activityId: z.string().min(1),
  config: z.unknown().optional().default({}),
});
export type StartActivityRequest = z.infer<typeof StartActivityRequestSchema>;

export const StartActivityResponseSchema = z.object({
  run: ActivityRunDtoSchema,
  state: z.unknown(),
});
export type StartActivityResponse = z.infer<typeof StartActivityResponseSchema>;

/**
 * REST: Ý định từ giáo viên
 */
export const TeacherIntentRequestSchema = z.object({
  runId: z.string().min(1),
  intent: z.unknown(),
});
export type TeacherIntentRequest = z.infer<typeof TeacherIntentRequestSchema>;

/**
 * REST: Ý định từ học sinh
 */
export const StudentIntentRequestSchema = z.object({
  participantToken: z.string().min(1),
  runId: z.string().min(1),
  intent: z.unknown(),
});
export type StudentIntentRequest = z.infer<typeof StudentIntentRequestSchema>;

/**
 * REST: Kết thúc Activity
 */
export const EndActivityRequestSchema = z.object({
  runId: z.string().min(1),
});
export type EndActivityRequest = z.infer<typeof EndActivityRequestSchema>;

export const EndActivityResponseSchema = z.object({
  runId: z.string(),
  activityId: z.string(),
  results: z.array(z.unknown()),
  endedAt: z.number(),
});
export type EndActivityResponse = z.infer<typeof EndActivityResponseSchema>;

/**
 * REST: Lấy thông tin lượt chạy Activity hiện tại của phiên
 */
export const CurrentActivityResponseSchema = z.object({
  run: ActivityRunDtoSchema.nullable(),
  state: z.unknown().nullable(),
});
export type CurrentActivityResponse = z.infer<typeof CurrentActivityResponseSchema>;

/**
 * REST: Lấy danh sách tất cả các lượt chạy Activity đang hoạt động trong phiên (hỗ trợ chạy song song)
 */
export const ActiveActivitiesResponseSchema = z.object({
  activeRuns: z.array(
    z.object({
      run: ActivityRunDtoSchema,
      state: z.unknown(),
    })
  ),
});
export type ActiveActivitiesResponse = z.infer<typeof ActiveActivitiesResponseSchema>;

/**
 * REST: Danh sách Activity có sẵn trong hệ thống
 */
export const ActivityListResponseSchema = z.object({
  activities: z.array(ActivityMetaSchema),
});
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
