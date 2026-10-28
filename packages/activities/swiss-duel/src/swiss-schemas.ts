import { z } from 'zod';

export const SwissQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  type: z.enum(['mcq4', 'tf', 'short']).default('mcq4'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.unknown(),
  image: z.string().optional(),
  timeLimit: z.number().default(30),
  explanation: z.string().optional(),
});
export type SwissQuestion = z.infer<typeof SwissQuestionSchema>;

export const SwissMatchupResultSchema = z.enum([
  'player1_win',
  'player2_win',
  'draw',
  'in_progress',
]);
export type SwissMatchupResult = z.infer<typeof SwissMatchupResultSchema>;

export const SwissMatchupSchema = z.object({
  tableNumber: z.number(),
  player1Id: z.string(),
  player2Id: z.string(),
  player1Score: z.number().default(0), // Số câu đúng trong 2 câu của vòng
  player2Score: z.number().default(0), // Số câu đúng trong 2 câu của vòng
  player1Answered: z.boolean().default(false),
  player2Answered: z.boolean().default(false),
  player1Answers: z.record(z.unknown()).default({}),
  player2Answers: z.record(z.unknown()).default({}),
  player1Results: z.record(z.boolean()).default({}), // Kết quả đúng/sai từng câu của player 1
  player2Results: z.record(z.boolean()).default({}), // Kết quả đúng/sai từng câu của player 2
  result: SwissMatchupResultSchema.default('in_progress'),
});
export type SwissMatchup = z.infer<typeof SwissMatchupSchema>;

export const SwissParticipantStateSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  tournamentPoints: z.number().default(0), // Thắng 2, Hòa 1, Thua 0
  correctCount: z.number().default(0), // Tổng số câu đúng tích lũy
  matchesWon: z.number().default(0),
  matchesDrawn: z.number().default(0),
  matchesLost: z.number().default(0),
  streak: z.number().default(0),
  byeCount: z.number().default(0),
  history: z.array(z.string()).default([]), // Danh sách participantId đối thủ đã gặp
  currentTable: z.number().nullable().default(null),
  isByeThisRound: z.boolean().default(false),
});
export type SwissParticipantState = z.infer<typeof SwissParticipantStateSchema>;

export const SwissLeaderboardEntrySchema = z.object({
  rank: z.number(),
  participantId: z.string(),
  displayName: z.string(),
  tournamentPoints: z.number(),
  correctCount: z.number(),
  buchholz: z.number(), // Tổng điểm của các đối thủ đã từng gặp
  streak: z.number(),
  matchesWon: z.number(),
  matchesDrawn: z.number(),
  matchesLost: z.number(),
  isBye: z.boolean().default(false),
});
export type SwissLeaderboardEntry = z.infer<typeof SwissLeaderboardEntrySchema>;

export const SwissDuelConfigSchema = z.object({
  title: z.string().min(1).default('Đấu Cờ Thụy Sỹ'),
  mode: z.enum(['questions', 'time']).default('questions'),
  timeLimitMinutes: z.number().min(1).max(120).default(10),
  questions: z.array(SwissQuestionSchema).min(2),
  pointsWin: z.number().default(2),
  pointsDraw: z.number().default(1),
  pointsLoss: z.number().default(0),
  timeLimitPerQuestion: z.number().min(5).max(120).default(30),
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleOptions: z.boolean().optional().default(true),
});
export type SwissDuelConfig = z.infer<typeof SwissDuelConfigSchema>;

export const SwissDuelStatusSchema = z.enum(['waiting', 'in_round', 'round_review', 'finished']);
export type SwissDuelStatus = z.infer<typeof SwissDuelStatusSchema>;

export const SwissDuelStateSchema = z.object({
  title: z.string(),
  mode: z.enum(['questions', 'time']),
  status: SwissDuelStatusSchema.default('waiting'),
  currentRound: z.number().default(1),
  totalRounds: z.number().default(5),
  roundQuestions: z.array(SwissQuestionSchema).default([]), // 2 câu hỏi của vòng này
  roundStartedAt: z.number().default(0),
  countdownEndsAt: z.number().nullable().default(null), // Mốc thời gian kết thúc đếm ngược 10s
  matchups: z.array(SwissMatchupSchema).default([]),
  byePlayerId: z.string().nullable().default(null),
  participants: z.record(SwissParticipantStateSchema).default({}),
  leaderboard: z.array(SwissLeaderboardEntrySchema).default([]),
  timeLimitPerQuestion: z.number().default(30),
  endTime: z.number().nullable().default(null), // Cho mode 'time'
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleOptions: z.boolean().optional().default(true),
});
export type SwissDuelState = z.infer<typeof SwissDuelStateSchema>;

export const SwissDuelIntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join_tournament'),
    displayName: z.string().optional(),
  }),
  z.object({
    type: z.literal('submit_answer'),
    questionIndex: z.number().min(0).max(1),
    answer: z.unknown(),
    displayName: z.string().optional(),
  }),
  z.object({
    type: z.literal('submit_round'),
    answers: z.record(z.unknown()),
    displayName: z.string().optional(),
  }),
  z.object({
    type: z.literal('repair_round'),
  }),
  z.object({
    type: z.literal('skip_countdown'),
  }),
  z.object({
    type: z.literal('next_round'),
  }),
  z.object({
    type: z.literal('pause_countdown'),
  }),
  z.object({
    type: z.literal('resume_countdown'),
  }),
  z.object({
    type: z.literal('finish_tournament'),
  }),
  z.object({
    type: z.literal('add_time'),
    minutes: z.number().min(1).max(60),
  }),
]);
export type SwissDuelIntent = z.infer<typeof SwissDuelIntentSchema>;

export const SwissDuelResultSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  tournamentPoints: z.number(),
  correctCount: z.number(),
  matchesWon: z.number(),
  matchesDrawn: z.number(),
  matchesLost: z.number(),
  buchholz: z.number(),
  rank: z.number(),
});
export type SwissDuelResult = z.infer<typeof SwissDuelResultSchema>;
