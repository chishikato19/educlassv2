import { z } from 'zod';

export const TerrainTypeSchema = z.enum([
  'plain',        // Đất thường (1 HP, 1 điểm, gia cố tối đa 1 lần)
  'watchtower',   // Tháp canh (2 HP, 5 điểm, gia cố tối đa 2 lần)
  'small_castle', // Lâu đài nhỏ (3 HP, 10 điểm, gia cố tối đa 3 lần)
  'big_castle',   // Lâu đài lớn (5 HP, 20 điểm, gia cố tối đa 4 lần)
  'mountain',     // Núi (Vật cản không thể đi qua - mở rộng)
  'river',        // Sông (Mở rộng địa hình)
]);
export type TerrainType = z.infer<typeof TerrainTypeSchema>;

export const CellOwnerSchema = z.enum(['neutral', 'blue', 'red']);
export type CellOwner = z.infer<typeof CellOwnerSchema>;

export const TeamIdSchema = z.enum(['blue', 'red']);
export type TeamId = z.infer<typeof TeamIdSchema>;

export const TerritoryQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  type: z.enum(['mcq4', 'tf', 'short']).default('mcq4'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.unknown(),
  image: z.string().optional(),
  timeLimit: z.number().default(30),
  explanation: z.string().optional(),
});
export type TerritoryQuestion = z.infer<typeof TerritoryQuestionSchema>;

export const CellLockInfoSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  team: TeamIdSchema,
  expiresAt: z.number(),
  question: TerritoryQuestionSchema.optional(), // Câu hỏi dành riêng cho người đang lock ô này
});
export type CellLockInfo = z.infer<typeof CellLockInfoSchema>;

export const TerritoryCellSchema = z.object({
  id: z.string(), // "x_y"
  x: z.number(),
  y: z.number(),
  terrain: TerrainTypeSchema.default('plain'),
  owner: CellOwnerSchema.default('neutral'),
  maxHp: z.number().default(1),
  currentHp: z.number().default(1),
  tugOfWarHp: z.number().default(0), // Khi neutral: >0 là nghiêng về xanh, <0 là nghiêng về đỏ
  reinforceLevel: z.number().default(0),
  maxReinforce: z.number().default(1),
  lockedBy: CellLockInfoSchema.nullable().default(null),
});
export type TerritoryCell = z.infer<typeof TerritoryCellSchema>;

export const TerritoryParticipantSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  team: TeamIdSchema.default('blue'),
  groupName: z.string().nullable().optional(),
  elo: z.number().default(1000),
  capturedCount: z.number().default(0),
  fortifiedCount: z.number().default(0),
  correctCount: z.number().default(0),
  totalQuestions: z.number().default(0),
  streak: z.number().default(0),
  currentLockCellId: z.string().nullable().default(null),
  cooldownUntil: z.number().nullable().default(null),
});
export type TerritoryParticipant = z.infer<typeof TerritoryParticipantSchema>;

export const TerritoryParticipantInitSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  team: TeamIdSchema,
  groupName: z.string().nullable().optional(),
  elo: z.number().optional(),
});
export type TerritoryParticipantInit = z.infer<typeof TerritoryParticipantInitSchema>;

export const TerritoryBattleLogSchema = z.object({
  id: z.string(),
  text: z.string(),
  team: z.enum(['blue', 'red', 'neutral']),
  ts: z.number(),
});
export type TerritoryBattleLog = z.infer<typeof TerritoryBattleLogSchema>;

export const TerritoryWarConfigSchema = z.object({
  title: z.string().min(1).default('Đại Chiến Lãnh Thổ'),
  mapSize: z.enum(['5x5', '7x7', '9x9']).default('7x7'),
  timeLimitMinutes: z.number().min(1).max(60).default(5),
  enableSuddenDeath: z.boolean().default(false), // Mặc định tắt Sudden Death
  shuffleQuestions: z.boolean().default(true),
  shuffleAnswers: z.boolean().default(true),
  allowLoopQuestions: z.boolean().default(true),
  questions: z.array(TerritoryQuestionSchema).default([]),
  initialParticipants: z.array(TerritoryParticipantInitSchema).default([]),
  pointsPlain: z.number().default(1),
  pointsWatchtower: z.number().default(5),
  pointsSmallCastle: z.number().default(10),
  pointsBigCastle: z.number().default(20),
  pointsReinforce: z.number().default(1),
});
export type TerritoryWarConfig = z.infer<typeof TerritoryWarConfigSchema>;

export const TerritoryWarStatusSchema = z.enum(['waiting', 'in_progress', 'finished']);
export type TerritoryWarStatus = z.infer<typeof TerritoryWarStatusSchema>;

export const TerritoryWarStateSchema = z.object({
  title: z.string(),
  status: TerritoryWarStatusSchema.default('waiting'),
  mapSize: z.enum(['5x5', '7x7', '9x9']).default('7x7'),
  cells: z.record(TerritoryCellSchema).default({}),
  participants: z.record(TerritoryParticipantSchema).default({}),
  blueScore: z.number().default(0),
  redScore: z.number().default(0),
  blueCellCount: z.number().default(0),
  redCellCount: z.number().default(0),
  totalCells: z.number().default(49),
  enableSuddenDeath: z.boolean().default(false),
  winnerTeam: z.enum(['blue', 'red', 'draw']).nullable().default(null),
  winReason: z.string().nullable().default(null),
  startedAt: z.number().default(0),
  endTime: z.number().nullable().default(null),
  logs: z.array(TerritoryBattleLogSchema).default([]),
});
export type TerritoryWarState = z.infer<typeof TerritoryWarStateSchema>;

export const TerritoryStudentIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('lock_cell'),
    cellId: z.string(),
  }),
  z.object({
    type: z.literal('submit_answer'),
    cellId: z.string(),
    answer: z.unknown(),
  }),
  z.object({
    type: z.literal('cancel_cell'),
    cellId: z.string(),
  }),
]);
export type TerritoryStudentIntent = z.infer<typeof TerritoryStudentIntentSchema>;

export const TerritoryTeacherIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('start_game'),
  }),
  z.object({
    type: z.literal('finish_game'),
  }),
  z.object({
    type: z.literal('assign_team'),
    participantId: z.string(),
    team: TeamIdSchema,
  }),
  z.object({
    type: z.literal('assign_group_team'),
    groupName: z.string(),
    team: TeamIdSchema,
  }),
  z.object({
    type: z.literal('auto_balance_teams'),
  }),
  z.object({
    type: z.literal('swap_teams'),
  }),
  z.object({
    type: z.literal('add_time'),
    minutes: z.number().min(1).max(60),
  }),
  z.object({
    type: z.literal('reset_game'),
  }),
]);
export type TerritoryTeacherIntent = z.infer<typeof TerritoryTeacherIntentSchema>;

export const TerritoryWarResultSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  team: TeamIdSchema,
  capturedCount: z.number(),
  fortifiedCount: z.number(),
  correctCount: z.number(),
  pointsContributed: z.number(),
  isWinner: z.boolean(),
  rank: z.number(),
});
export type TerritoryWarResult = z.infer<typeof TerritoryWarResultSchema>;
