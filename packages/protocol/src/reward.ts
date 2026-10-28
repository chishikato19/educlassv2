import { z } from 'zod';
import { RewardScopeSchema } from './enums.js';

/**
 * Yêu cầu tặng thưởng EXP cho người tham gia phiên học
 */
export const GrantRewardRequestSchema = z.object({
  participantId: z.string().min(1),
  exp: z.number().int().positive(),
  reason: z.string().min(1).default('Thưởng từ giáo viên'),
});
export type GrantRewardRequest = z.infer<typeof GrantRewardRequestSchema>;

/**
 * DTO đại diện cho một bản ghi nhật ký thưởng trong reward_log
 */
export const RewardLogDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  participantId: z.string().min(1),
  studentId: z.string().nullable().optional(),
  exp: z.number().int(),
  reason: z.string(),
  persisted: z.boolean(),
  ts: z.number().int().positive(),
});
export type RewardLogDto = z.infer<typeof RewardLogDtoSchema>;

/**
 * Phản hồi sau khi tặng thưởng EXP
 */
export const GrantRewardResponseSchema = z.object({
  success: z.literal(true),
  persisted: z.boolean(),
  expGranted: z.number().int().positive(),
  studentId: z.string().nullable().optional(),
  newTotalExp: z.number().int().nonnegative().nullable().optional(),
  newLevel: z.number().int().positive().nullable().optional(),
  leveledUp: z.boolean(),
  rewardLog: RewardLogDtoSchema,
});
export type GrantRewardResponse = z.infer<typeof GrantRewardResponseSchema>;

/**
 * Nội dung thông điệp realtime phát tới học sinh khi được cộng thưởng
 */
export const RewardNotificationPayloadSchema = z.object({
  participantId: z.string().min(1),
  exp: z.number().int().positive(),
  reason: z.string(),
  persisted: z.boolean(),
  newTotalExp: z.number().int().nonnegative().nullable().optional(),
  newLevel: z.number().int().positive().nullable().optional(),
  leveledUp: z.boolean(),
  ts: z.number().int().positive(),
});
export type RewardNotificationPayload = z.infer<typeof RewardNotificationPayloadSchema>;

/**
 * DTO đại diện cho một quy tắc thưởng trong reward_rules
 */
export const RewardRuleDtoSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().nullable().optional(),
  scope: RewardScopeSchema,
  activityId: z.string().nullable().optional(),
  trigger: z.string().min(1),
  exp: z.number().int().nonnegative(),
  enabled: z.boolean(),
});
export type RewardRuleDto = z.infer<typeof RewardRuleDtoSchema>;

/**
 * Mục quy tắc cấu hình khi giáo viên thiết lập / cập nhật
 */
export const RewardRuleItemInputSchema = z.object({
  activityId: z.string().nullable().optional(),
  trigger: z.string().min(1),
  exp: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
});
export type RewardRuleItemInput = z.infer<typeof RewardRuleItemInputSchema>;

/**
 * Yêu cầu lưu danh sách quy tắc thưởng của giáo viên
 */
export const SetRewardRulesRequestSchema = z.object({
  rules: z.array(RewardRuleItemInputSchema),
});
export type SetRewardRulesRequest = z.infer<typeof SetRewardRulesRequestSchema>;

/**
 * Dữ liệu trả về khi lấy cài đặt quy tắc thưởng
 */
export const GetRewardRulesResponseSchema = z.object({
  globalRules: z.array(RewardRuleDtoSchema),
  teacherRules: z.array(RewardRuleDtoSchema),
  effectiveRules: z.array(RewardRuleDtoSchema),
  sessionCap: z.number().int().nonnegative().nullable(),
  activityCaps: z.record(z.string(), z.number().int().nonnegative()),
});
export type GetRewardRulesResponse = z.infer<typeof GetRewardRulesResponseSchema>;

/**
 * Phản hồi khi khôi phục quy tắc thưởng về mặc định
 */
export const ResetRewardRulesResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  effectiveRules: z.array(RewardRuleDtoSchema),
});
export type ResetRewardRulesResponse = z.infer<typeof ResetRewardRulesResponseSchema>;
