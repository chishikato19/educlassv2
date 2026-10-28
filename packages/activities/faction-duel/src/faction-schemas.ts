import { z } from 'zod';

/**
 * Schema cho Câu hỏi trong Đại Chiến Xanh Đỏ
 */
export const FactionQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean().optional(),
});
export type FactionQuestionOption = z.infer<typeof FactionQuestionOptionSchema>;

export const FactionQuestionSchema = z.object({
  id: z.string(),
  stem: z.object({
    text: z.string(),
    images: z.array(z.string()).optional(),
  }),
  type: z.enum(['mcq4', 'tf', 'short']).default('mcq4'),
  options: z.array(FactionQuestionOptionSchema).optional(),
  correctAnswer: z.unknown().optional(),
  explanation: z.string().optional(),
  timeLimitSeconds: z.number().int().positive().optional(),
});
export type FactionQuestion = z.infer<typeof FactionQuestionSchema>;

/**
 * Thành viên tham gia phe Xanh hoặc phe Đỏ
 */
export const FactionMemberSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  elo: z.number().int().default(1000),
  team: z.enum(['blue', 'red']),
  isClone: z.boolean().optional(),
});
export type FactionMember = z.infer<typeof FactionMemberSchema>;

/**
 * Bài làm của học sinh cho 1 câu hỏi trong trận 1v1
 */
export const FactionMatchupAnswerSchema = z.object({
  answer: z.unknown(),
  timeMs: z.number().int().nonnegative().default(0),
  isCorrect: z.boolean().optional(),
  answeredAt: z.number().optional(),
});
export type FactionMatchupAnswer = z.infer<typeof FactionMatchupAnswerSchema>;

/**
 * Dữ liệu một bàn đấu 1v1 giữa 1 người phe Xanh và 1 người phe Đỏ
 */
export const FactionMatchupSchema = z.object({
  id: z.string(),
  roundIndex: z.number().int().nonnegative(),
  blueParticipantId: z.string(),
  redParticipantId: z.string(),
  isCloneMatch: z.boolean().optional(),

  // Bản ghi đáp án theo questionId
  blueAnswers: z.record(FactionMatchupAnswerSchema).default({}),
  redAnswers: z.record(FactionMatchupAnswerSchema).default({}),

  status: z.enum(['in_progress', 'completed']).default('in_progress'),
  winner: z.enum(['blue', 'red', 'draw']).optional(),
  awardedPoints: z
    .object({
      blue: z.number().nonnegative().default(0),
      red: z.number().nonnegative().default(0),
    })
    .default({ blue: 0, red: 0 }),
  isUnderdogWin: z.boolean().optional(),
});
export type FactionMatchup = z.infer<typeof FactionMatchupSchema>;

/**
 * Pha Chọn Đấu Thủ 15 Giây
 */
export const FactionPickPhaseSchema = z.object({
  attackingTeam: z.enum(['blue', 'red']),
  expiresAt: z.number(),
  claimedTargetIds: z.array(z.string()).default([]),
  pairs: z
    .array(
      z.object({
        attackerId: z.string(),
        targetId: z.string(),
      })
    )
    .default([]),
});
export type FactionPickPhase = z.infer<typeof FactionPickPhaseSchema>;

/**
 * Trạng thái State toàn cục của hoạt động Đại Chiến Xanh Đỏ
 */
export const FactionDuelStateSchema = z.object({
  status: z
    .enum(['lobby', 'team_reveal', 'round_active', 'round_eval', 'pick_phase', 'finished'])
    .default('lobby'),

  title: z.string().default('Đại Chiến Xanh Đỏ (thử nghiệm)'),
  currentRound: z.number().int().nonnegative().default(0),
  totalRounds: z.number().int().positive().default(5),
  questionsPerMatch: z.number().int().min(1).max(5).default(2),

  teamBlue: z.array(FactionMemberSchema).default([]),
  teamRed: z.array(FactionMemberSchema).default([]),

  scoreBlue: z.number().nonnegative().default(0),
  scoreRed: z.number().nonnegative().default(0),

  currentMatchups: z.array(FactionMatchupSchema).default([]),
  matchHistory: z
    .array(
      z.object({
        round: z.number().int(),
        p1: z.string(),
        p2: z.string(),
      })
    )
    .default([]),

  pickPhase: FactionPickPhaseSchema.optional(),
  currentQuestions: z.array(FactionQuestionSchema).default([]),
  roundStartTime: z.number().optional(),
  roundEndTime: z.number().optional(),
  cloneParticipantId: z.string().optional(),

  // Tùy chọn cấu hình hoạt động
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  allowQuestionRecycle: z.boolean().default(true),
  answerTimeSeconds: z.number().int().positive().default(20),
  pickPhaseSeconds: z.number().int().positive().default(15),
});
export type FactionDuelState = z.infer<typeof FactionDuelStateSchema>;

/**
 * Cấu hình giáo viên gửi khi bắt đầu hoạt động
 */
export const FactionDuelConfigSchema = z.object({
  title: z.string().optional().default('Đại Chiến Xanh Đỏ (thử nghiệm)'),
  totalRounds: z.number().int().min(1).max(20).default(5),
  questionsPerMatch: z.number().int().min(1).max(5).default(2),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  allowQuestionRecycle: z.boolean().default(true),
  answerTimeSeconds: z.number().int().min(5).max(120).default(20),
  pickPhaseSeconds: z.number().int().min(5).max(60).default(15),
  questions: z.array(FactionQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi'),
});
export type FactionDuelConfig = z.infer<typeof FactionDuelConfigSchema>;

/**
 * Intents từ Học sinh và Giáo viên
 */
export const FactionDuelIntentSchema = z.discriminatedUnion('type', [
  // Học sinh trả lời câu hỏi
  z.object({
    type: z.literal('submit_answer'),
    questionId: z.string(),
    answer: z.unknown(),
    timeMs: z.number().int().nonnegative().default(0),
  }),
  // Học sinh phe thắng chọn đối thủ
  z.object({
    type: z.literal('select_opponent'),
    targetParticipantId: z.string(),
  }),
  // Giáo viên bắt đầu trận
  z.object({
    type: z.literal('start_activity'),
  }),
  // Giáo viên qua vòng tiếp theo
  z.object({
    type: z.literal('next_round'),
  }),
  // Giáo viên bỏ qua thời gian pick phase
  z.object({
    type: z.literal('skip_pick_phase'),
  }),
  // Giáo viên cộng thêm thời gian
  z.object({
    type: z.literal('add_time'),
    seconds: z.number().int().positive(),
  }),
  // Giáo viên kết thúc hoạt động
  z.object({
    type: z.literal('finish'),
  }),
]);
export type FactionDuelIntent = z.infer<typeof FactionDuelIntentSchema>;

/**
 * Kết quả tổng kết trận đấu của từng học sinh
 */
export const FactionDuelResultSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  team: z.enum(['blue', 'red']),
  teamWon: z.boolean(),
  matchesPlayed: z.number().int().nonnegative(),
  matchesWon: z.number().int().nonnegative(),
  matchesDrawn: z.number().int().nonnegative(),
  matchesLost: z.number().int().nonnegative(),
  pointsContributed: z.number().nonnegative(),
  underdogWins: z.number().int().nonnegative(),
  isMvp: z.boolean().optional(),
  rank: z.number().int().positive(),
});
export type FactionDuelResult = z.infer<typeof FactionDuelResultSchema>;
