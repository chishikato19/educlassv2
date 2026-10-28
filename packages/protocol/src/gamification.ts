import { z } from 'zod';

/**
 * Cấu hình nhân vật Avatar SVG của học sinh
 */
export const AvatarBaseTypeSchema = z.enum([
  'cat',
  'fox',
  'bear',
  'owl',
  'rabbit',
  'dragon',
  'robot',
  'penguin',
]);
export type AvatarBaseType = z.infer<typeof AvatarBaseTypeSchema>;

export const HeadwearTypeSchema = z.enum([
  'none',
  'straw',
  'cap',
  'headphones',
  'grad_cap',
  'crown',
  'headband',
]);
export type HeadwearType = z.infer<typeof HeadwearTypeSchema>;

export const GlassesTypeSchema = z.enum(['none', 'glasses', 'sunglasses', 'blush_star']);
export type GlassesType = z.infer<typeof GlassesTypeSchema>;

export const OutfitTypeSchema = z.enum([
  'default',
  'school_uniform',
  'hoodie',
  'jersey',
  'wizard_robe',
]);
export type OutfitType = z.infer<typeof OutfitTypeSchema>;

export const WingsTypeSchema = z.enum(['none', 'angel', 'bat']);
export type WingsType = z.infer<typeof WingsTypeSchema>;

export const HeldTypeSchema = z.enum(['none', 'pencil', 'wand']);
export type HeldType = z.infer<typeof HeldTypeSchema>;

export const AvatarConfigSchema = z.object({
  base: AvatarBaseTypeSchema.default('cat'),
  color: z.string().default('#4F8CFF'),
  headwear: HeadwearTypeSchema.default('none'),
  glasses: GlassesTypeSchema.default('none'),
  outfit: OutfitTypeSchema.default('default'),
  wings: WingsTypeSchema.optional().default('none'),
  held: HeldTypeSchema.optional().default('none'),
});
export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const UpdateAvatarRequestSchema = z.object({
  avatar: AvatarConfigSchema,
});
export type UpdateAvatarRequest = z.infer<typeof UpdateAvatarRequestSchema>;

/**
 * Điều kiện cấp danh hiệu (Luật dạng dữ liệu)
 */
export const TitleConditionTypeSchema = z.enum([
  'min_exp',
  'min_level',
  'exam_high_scores',
  'exam_perfect',
  'quiz_streak',
  'attendance_sessions',
]);
export type TitleConditionType = z.infer<typeof TitleConditionTypeSchema>;

export const TitleConditionSchema = z.object({
  type: TitleConditionTypeSchema,
  threshold: z.number().int().positive(),
  description: z.string(),
});
export type TitleCondition = z.infer<typeof TitleConditionSchema>;

export const TitleRuleSchema = z.object({
  conditions: z.array(TitleConditionSchema).min(1),
  description: z.string().optional(),
});
export type TitleRule = z.infer<typeof TitleRuleSchema>;

/**
 * DTO Danh hiệu game hóa
 */
export const TitleDtoSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  iconKey: z.string().min(1),
  rule: TitleRuleSchema,
  awardedAt: z.number().int().positive().nullable().optional(),
  isUnlocked: z.boolean().optional(),
});
export type TitleDto = z.infer<typeof TitleDtoSchema>;

/**
 * Danh sách danh hiệu
 */
export const TitleListResponseSchema = z.object({
  titles: z.array(TitleDtoSchema),
  total: z.number().int(),
});
export type TitleListResponse = z.infer<typeof TitleListResponseSchema>;

/**
 * DTO Thống kê hoạt động của học sinh để đánh giá danh hiệu
 */
export const StudentGamificationStatsSchema = z.object({
  exp: z.number().int().nonnegative().default(0),
  level: z.number().int().positive().default(1),
  examHighScores: z.number().int().nonnegative().default(0),
  examPerfects: z.number().int().nonnegative().default(0),
  quizStreak: z.number().int().nonnegative().default(0),
  attendanceSessions: z.number().int().nonnegative().default(0),
});
export type StudentGamificationStats = z.infer<typeof StudentGamificationStatsSchema>;

/**
 * DTO Hồ sơ nhân vật & Game hóa của học sinh
 */
export const StudentProfileResponseSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  exp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  avatar: AvatarConfigSchema,
  titles: z.array(TitleDtoSchema),
  activeTitle: z.string().nullable().optional(),
});
export type StudentProfileResponse = z.infer<typeof StudentProfileResponseSchema>;
