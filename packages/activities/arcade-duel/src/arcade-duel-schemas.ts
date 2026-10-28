import { z } from 'zod';
import { ActiveEffectSchema, CombatEventSchema, PowerUpInventorySchema } from '@educlass/protocol';

/**
 * 2 chế độ thi đấu của Đối Kháng 1vs1
 */
export const DuelModeSchema = z.enum([
  'sync_turn', // Cùng trả lời câu hỏi (Màn hình chia 3, đấu trí từng câu)
  'speed_race', // Đua tốc độ (Màn hình chia đôi 50/50 dọc, độc lập tiến độ)
]);
export type DuelMode = z.infer<typeof DuelModeSchema>;

/**
 * Cấu hình phím bấm điều khiển cho 2 bên
 */
export const KeyBindingsSchema = z.object({
  blueKeys: z.object({
    option1: z.string().default('KeyA'),
    option2: z.string().default('KeyS'),
    option3: z.string().default('KeyD'),
    option4: z.string().default('KeyF'),
    powerUp: z.string().default('KeyQ'),
  }),
  redKeys: z.object({
    option1: z.string().default('Digit1'),
    option2: z.string().default('Digit2'),
    option3: z.string().default('Digit3'),
    option4: z.string().default('Digit4'),
    powerUp: z.string().default('Digit5'),
  }),
});
export type KeyBindings = z.infer<typeof KeyBindingsSchema>;

/**
 * Cấu hình câu hỏi dùng trong Đối Kháng 1vs1
 */
export const DuelQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  image: z.string().optional(),
  options: z.array(z.string()).min(2).max(4),
  correctAnswer: z.number().int().min(0).max(3),
  points: z.number().int().default(100),
  explanation: z.string().optional(),
});
export type DuelQuestion = z.infer<typeof DuelQuestionSchema>;

/**
 * Cấu hình khi khởi chạy hoạt động Đối Kháng 1vs1
 */
export const ArcadeDuelConfigSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên trận đấu'),
  mode: DuelModeSchema.default('sync_turn'),
  questions: z.array(DuelQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi'),
  timeLimitPerQuestion: z.number().int().min(5).max(60).default(15),
  totalTimeLimit: z.number().int().min(30).max(600).default(90),
  shuffleOptions: z.boolean().default(true),
  enablePowerUps: z.boolean().default(true),
  keyBindings: KeyBindingsSchema.default({
    blueKeys: {
      option1: 'KeyA',
      option2: 'KeyS',
      option3: 'KeyD',
      option4: 'KeyF',
      powerUp: 'KeyQ',
    },
    redKeys: {
      option1: 'Digit1',
      option2: 'Digit2',
      option3: 'Digit3',
      option4: 'Digit4',
      powerUp: 'Digit5',
    },
  }),
  inventoryCapacity: z.union([z.literal(2), z.literal(3)]).default(2),
  dropCondition: z.union([z.literal(1), z.literal(2)]).default(2),
  freezePenaltyMs: z.number().int().default(1500),
  blueTeamName: z.string().default('Đội Xanh'),
  redTeamName: z.string().default('Đội Đỏ'),
});
export type ArcadeDuelConfig = z.infer<typeof ArcadeDuelConfigSchema>;

/**
 * Trạng thái của từng đội trong trận đấu
 */
export const PlayerDuelStateSchema = z.object({
  teamId: z.enum(['blue', 'red']),
  teamName: z.string(),
  score: z.number().default(0),
  streak: z.number().default(0),
  currentQuestionIndex: z.number().default(0),
  // Danh sách các phương án hiển thị (đã đảo hoặc gốc)
  currentOptions: z.array(z.string()).default([]),
  // Chỉ số đáp án đúng tương ứng trong currentOptions
  currentCorrectIndex: z.number().default(0),
  // Các phương án bị loại bỏ (do dùng Kính 50/50)
  eliminatedIndices: z.array(z.number()).default([]),
  // Lựa chọn hiện tại của người chơi
  selectedOptionIndex: z.number().nullable().default(null),
  isLockedIn: z.boolean().default(false),
  isCorrect: z.boolean().nullable().default(null),
  inventory: PowerUpInventorySchema,
  activeEffects: z.array(ActiveEffectSchema).default([]),
  penaltyUntil: z.number().nullable().default(null), // Đóng băng 1.5s khi chọn sai
  isCompleted: z.boolean().default(false),
});
export type PlayerDuelState = z.infer<typeof PlayerDuelStateSchema>;

/**
 * Trạng thái đồng bộ thời gian thực của toàn bộ trận đấu
 */
export const ArcadeDuelStateSchema = z.object({
  title: z.string(),
  mode: DuelModeSchema,
  status: z.enum(['waiting', 'in_question', 'question_review', 'finished']),
  currentQuestionIndex: z.number().default(0),
  totalQuestions: z.number(),
  questions: z.array(DuelQuestionSchema),
  questionStartedAt: z.number(),
  timeLimit: z.number(),
  timeRemaining: z.number(),
  bluePlayer: PlayerDuelStateSchema,
  redPlayer: PlayerDuelStateSchema,
  combatFeed: z.array(CombatEventSchema).default([]),
  winnerTeamId: z.enum(['blue', 'red', 'draw']).nullable().default(null),
  config: ArcadeDuelConfigSchema,
});
export type ArcadeDuelState = z.infer<typeof ArcadeDuelStateSchema>;

/**
 * Kết quả trả về của hoạt động khi kết thúc
 */
export const ArcadeDuelResultSchema = z.object({
  winnerTeamId: z.enum(['blue', 'red', 'draw']),
  blueScore: z.number(),
  redScore: z.number(),
  totalQuestions: z.number(),
  durationSeconds: z.number(),
});
export type ArcadeDuelResult = z.infer<typeof ArcadeDuelResultSchema>;
