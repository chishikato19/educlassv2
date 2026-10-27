import { z } from 'zod';

export const VolleyballQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  type: z.enum(['mcq4', 'tf', 'short']).default('mcq4'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.unknown(),
  image: z.string().optional(),
  timeLimit: z.number().default(30),
  explanation: z.string().optional(),
});
export type VolleyballQuestion = z.infer<typeof VolleyballQuestionSchema>;

export const VolleyballMatchupResultSchema = z.enum([
  'player1_win',
  'player2_win',
  'draw',
  'in_progress',
]);
export type VolleyballMatchupResult = z.infer<typeof VolleyballMatchupResultSchema>;

export const VolleyballMatchupSchema = z.object({
  tableNumber: z.number(),
  stage: z.enum(['pool', 'bracket']),
  poolId: z.string().optional(),
  tier: z.enum(['diamond', 'gold', 'silver', 'bronze']).optional(),
  matchType: z.enum(['round_robin', 'semi_final', 'final', 'third_place']),
  player1Id: z.string(),
  player2Id: z.string(),
  player1Score: z.number().default(0),
  player2Score: z.number().default(0),
  player1Answered: z.boolean().default(false),
  player2Answered: z.boolean().default(false),
  player1Answers: z.record(z.unknown()).default({}),
  player2Answers: z.record(z.unknown()).default({}),
  player1Results: z.record(z.boolean()).default({}),
  player2Results: z.record(z.boolean()).default({}),
  player1TimeMs: z.number().default(0),
  player2TimeMs: z.number().default(0),
  result: VolleyballMatchupResultSchema.default('in_progress'),
});
export type VolleyballMatchup = z.infer<typeof VolleyballMatchupSchema>;

export const PoolStandingEntrySchema = z.object({
  rankInPool: z.number(),
  participantId: z.string(),
  displayName: z.string(),
  tournamentPoints: z.number().default(0),
  matchesWon: z.number().default(0),
  matchesDrawn: z.number().default(0),
  matchesLost: z.number().default(0),
  correctCount: z.number().default(0),
  totalTimeMs: z.number().default(0),
});
export type PoolStandingEntry = z.infer<typeof PoolStandingEntrySchema>;

export const VolleyballPoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  playerIds: z.array(z.string()),
  standings: z.array(PoolStandingEntrySchema).default([]),
});
export type VolleyballPool = z.infer<typeof VolleyballPoolSchema>;

export const VolleyballPlacementBracketSchema = z.object({
  tier: z.enum(['diamond', 'gold', 'silver', 'bronze']),
  name: z.string(),
  playerIds: z.array(z.string()),
  semiFinalMatchups: z.array(VolleyballMatchupSchema).default([]),
  finalMatchups: z.array(VolleyballMatchupSchema).default([]),
});
export type VolleyballPlacementBracket = z.infer<typeof VolleyballPlacementBracketSchema>;

export const VolleyballParticipantStateSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  poolId: z.string().default('A'),
  rankInPool: z.number().default(0),
  tournamentPoints: z.number().default(0),
  matchesWon: z.number().default(0),
  matchesDrawn: z.number().default(0),
  matchesLost: z.number().default(0),
  correctCount: z.number().default(0),
  totalTimeMs: z.number().default(0),
  currentTable: z.number().nullable().default(null),
  tier: z.enum(['diamond', 'gold', 'silver', 'bronze']).nullable().default(null),
  finalRank: z.number().nullable().default(null),
  isByeThisRound: z.boolean().default(false),
});
export type VolleyballParticipantState = z.infer<typeof VolleyballParticipantStateSchema>;

export const VolleyballConfigSchema = z.object({
  title: z.string().min(1).default('Giải Đấu Bóng Chuyền (thử nghiệm)'),
  poolMode: z.enum(['auto', '4_pools', '8_pools']).default('auto'),
  questions: z.array(VolleyballQuestionSchema).min(2),
  pointsWin: z.number().default(2),
  pointsDraw: z.number().default(1),
  pointsLoss: z.number().default(0),
  timeLimitPerQuestion: z.number().min(5).max(120).default(30),
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleOptions: z.boolean().optional().default(true),
});
export type VolleyballConfig = z.infer<typeof VolleyballConfigSchema>;

export const FinalStandingEntrySchema = z.object({
  rank: z.number(),
  participantId: z.string(),
  displayName: z.string(),
  tier: z.enum(['diamond', 'gold', 'silver', 'bronze']),
  tournamentPoints: z.number(),
  correctCount: z.number(),
});
export type FinalStandingEntry = z.infer<typeof FinalStandingEntrySchema>;

export const VolleyballTournamentStateSchema = z.object({
  title: z.string(),
  status: z.enum(['lobby', 'pool_stage', 'pool_stage_intermission', 'bracket_stage', 'finished']),
  poolMode: z.enum(['auto', '4_pools', '8_pools']).default('auto'),
  poolCount: z.number().default(4),
  currentRound: z.number().default(0),
  totalPoolRounds: z.number().default(3),
  totalBracketRounds: z.number().default(2),
  currentStage: z.enum(['pools', 'brackets']).default('pools'),
  pools: z.record(VolleyballPoolSchema).default({}),
  brackets: z.record(VolleyballPlacementBracketSchema).default({}),
  participants: z.record(VolleyballParticipantStateSchema).default({}),
  activeMatchups: z.array(VolleyballMatchupSchema).default([]),
  roundQuestions: z.array(VolleyballQuestionSchema).default([]),
  roundStartedAt: z.number().nullable().default(null),
  countdownEndsAt: z.number().nullable().default(null),
  finalStandings: z.array(FinalStandingEntrySchema).default([]),
});
export type VolleyballTournamentState = z.infer<typeof VolleyballTournamentStateSchema>;

export const VolleyballIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join_tournament'),
    displayName: z.string().optional(),
  }),
  z.object({
    type: z.literal('submit_answer'),
    questionId: z.string(),
    answer: z.unknown(),
    timeRemainingMs: z.number().optional(),
  }),
  z.object({
    type: z.literal('next_round'),
  }),
  z.object({
    type: z.literal('start_brackets'),
  }),
  z.object({
    type: z.literal('force_finish'),
  }),
]);
export type VolleyballIntent = z.infer<typeof VolleyballIntentSchema>;

export const VolleyballResultSchema = z.object({
  participantId: z.string(),
  rank: z.number(),
  score: z.number(),
  details: z.record(z.unknown()).optional(),
});
export type VolleyballResult = z.infer<typeof VolleyballResultSchema>;
