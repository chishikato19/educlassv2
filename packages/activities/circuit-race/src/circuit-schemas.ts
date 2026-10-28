import { z } from 'zod';

export const CardTypeSchema = z.enum([
  'leader_snare', // 🧲 Kéo Top 1 lùi 3 ô
  'front_hook', // 🎣 Móc câu kéo người trước mặt lùi 2 ô
  'banana_trap', // 🍌 Bẫy vỏ chuối đặt tại ô rời đi
  'whirlwind', // 🌪️ Lốc xoáy đẩy lùi xung quanh 1 ô
  'freeze', // 🧊 Đóng băng người khác vòng sau
  'swap', // 🔄 Đổi vị trí với người trước mặt (cự ly <= 3)
  'shield', // 🛡️ Khiên hộ mệnh miễn nhiễm đòn & sa lầy
  'mirror', // 🪞 Gương phản đòn
  'nitro', // 🚀 Bình Nitro +2 bước đi
  'handbrake', // 🛑 Phanh khẩn cấp giảm 1-2 bước
  'reroll', // 🎲 Xúc xắc ma thuật gieo lại
  'lucky_six', // 👑 Xúc xắc hoàng gia luôn ra 6
  'lifeline_5050', // 💡 Phao cứu sinh loại 2 đáp án sai
  'double_exp', // 💎 Nhân đôi EXP vòng này
]);
export type CardType = z.infer<typeof CardTypeSchema>;

export const CardSchema = z.object({
  id: z.string(),
  type: CardTypeSchema,
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  targetRequired: z.boolean().default(false),
});
export type Card = z.infer<typeof CardSchema>;

export const TileTypeSchema = z.enum([
  'normal', // Ô thường
  'boost', // 🚀 Tăng tốc (+2 ô)
  'mud', // 🕳️ Sa lầy
  'mystery', // 🎁 Rương may mắn (nhận thêm thẻ)
  'checkpoint', // 🛑 Trạm kiểm soát
]);
export type TileType = z.infer<typeof TileTypeSchema>;

export const TrackTileSchema = z.object({
  index: z.number(),
  type: TileTypeSchema,
  boostSteps: z.number().default(0),
});
export type TrackTile = z.infer<typeof TrackTileSchema>;

export const BananaTrapSchema = z.object({
  tileIndex: z.number(),
  placedBy: z.string(),
  placedByName: z.string(),
  turnsLeft: z.number().default(2),
});
export type BananaTrap = z.infer<typeof BananaTrapSchema>;

export const CircuitQuestionTypeSchema = z.enum(['mcq4', 'tf', 'tf_group', 'short']);
export type CircuitQuestionType = z.infer<typeof CircuitQuestionTypeSchema>;

export const CircuitQuestionSchema = z.object({
  id: z.string(),
  type: CircuitQuestionTypeSchema,
  stem: z.string(),
  image: z.string().optional(),
  options: z.array(z.string()).optional(),
  items: z.array(z.object({ text: z.string(), correct: z.boolean() })).optional(),
  correctAnswer: z.unknown().optional(),
  explanation: z.string().optional(),
  timeLimit: z.number().default(20),
});
export type CircuitQuestion = z.infer<typeof CircuitQuestionSchema>;

export const ParticipantNotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.number(),
  isAlert: z.boolean().default(false),
});
export type ParticipantNotification = z.infer<typeof ParticipantNotificationSchema>;

export const CircuitParticipantSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  avatarJson: z.string().nullable().optional(),
  position: z.number().default(0),
  previousPosition: z.number().default(0),
  assignedQuestionOrder: z.array(z.number()).default([]),
  assignedQuestion: CircuitQuestionSchema.nullable().optional(),
  streak: z.number().default(0),
  correctCount: z.number().default(0),
  inventory: z.array(CardSchema).default([]),
  isFrozen: z.boolean().default(false),
  hasShield: z.boolean().default(false),
  hasMirror: z.boolean().default(false),
  hasDoubleExp: z.boolean().default(false),
  mudTrapped: z.boolean().default(false),
  eliminatedOptions: z.array(z.number()).default([]),
  answeredCurrent: z.boolean().default(false),
  selectedAnswer: z.unknown().nullable().default(null),
  lastAnswerCorrect: z.boolean().nullable().default(null),
  lastDiceRoll: z.number().nullable().default(null),
  lastMoveSteps: z.number().nullable().default(null),
  cardActionDone: z.boolean().default(false),
  receivedNotifications: z.array(ParticipantNotificationSchema).default([]),
});
export type CircuitParticipant = z.infer<typeof CircuitParticipantSchema>;

export const BattleLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sourceId: z.string(),
  sourceName: z.string(),
  targetId: z.string().optional(),
  targetName: z.string().optional(),
  cardType: CardTypeSchema,
  message: z.string(),
});
export type BattleLogEntry = z.infer<typeof BattleLogEntrySchema>;

export const CircuitConfigSchema = z.object({
  title: z.string().default('Đường Đua Tri Thức'),
  trackLength: z.number().min(30).max(100).default(50),
  timePerQuestion: z.number().min(10).max(60).default(20),
  actionWindowSeconds: z.number().min(3).max(30).default(10),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  independentStudentQuestionOrder: z.boolean().default(false),
  questions: z.array(CircuitQuestionSchema).min(1),
});
export type CircuitConfig = z.infer<typeof CircuitConfigSchema>;

export const CircuitPhaseSchema = z.enum([
  'waiting',
  'question',
  'action_window',
  'resolving',
  'podium',
]);
export type CircuitPhase = z.infer<typeof CircuitPhaseSchema>;

export const CircuitStateSchema = z.object({
  phase: CircuitPhaseSchema,
  round: z.number().default(0),
  totalRounds: z.number(),
  currentQuestion: CircuitQuestionSchema.nullable(),
  track: z.array(TrackTileSchema),
  participants: z.record(z.string(), CircuitParticipantSchema),
  bananaTraps: z.array(BananaTrapSchema).default([]),
  battleLogs: z.array(BattleLogEntrySchema).default([]),
  roundExpiresAt: z.number(),
  actionExpiresAt: z.number().default(0),
  actionWindowSeconds: z.number().default(10),
  independentStudentQuestionOrder: z.boolean().default(false),
  podium: z
    .object({
      rank1: z.string().optional(),
      rank2: z.string().optional(),
      rank3: z.string().optional(),
    })
    .default({}),
});
export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const CircuitResultParticipantSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  finalPosition: z.number(),
  correctCount: z.number(),
  rank: z.number(),
  expEarned: z.number(),
});
export type CircuitResultParticipant = z.infer<typeof CircuitResultParticipantSchema>;

export const CircuitResultSchema = z.object({
  summary: z.string(),
  rankings: z.array(CircuitResultParticipantSchema),
});
export type CircuitResult = z.infer<typeof CircuitResultSchema>;
