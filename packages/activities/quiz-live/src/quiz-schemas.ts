import { z } from 'zod';
import {
  ActiveEffectSchema,
  CombatEventSchema,
  PersonalCombatNotificationSchema,
  PowerUpInventorySchema,
} from '@educlass/protocol';

export const QuizLiveModeSchema = z.enum(['kahoot', 'quizizz']);
export type QuizLiveMode = z.infer<typeof QuizLiveModeSchema>;

export const QuizQuestionTypeSchema = z.enum([
  'mcq4',
  'tf',
  'tf_group',
  'short',
  'matching',
  'cloze_drag',
]);
export type QuizQuestionType = z.infer<typeof QuizQuestionTypeSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: QuizQuestionTypeSchema,
  stem: z.string().min(1, 'Nội dung câu hỏi không được để trống'),
  image: z.string().optional(),
  options: z.array(z.string()).optional(), // Dành cho mcq4 (2-4 phương án)
  optionImages: z.array(z.string().nullable().optional()).optional(), // Ảnh kèm cho từng phương án mcq4
  correctAnswer: z.union([
    z.number(),
    z.boolean(),
    z.string(),
    z.array(z.string()),
    z.array(z.boolean()),
    z.record(z.string(), z.string()),
    z.record(z.string(), z.boolean()),
  ]),
  timeLimit: z.number().int().min(5).max(300).optional().default(20),
  points: z.number().int().min(100).max(5000).optional().default(1000),
  explanation: z.string().optional(),
  leftItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  rightItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  template: z.string().optional(),
  blanks: z.array(z.object({ id: z.string(), position: z.number().optional() })).optional(),
  wordBank: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.union([z.string(), z.object({ text: z.string() })]),
        correct: z.boolean().optional(),
      })
    )
    .optional(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

/**
 * Cấu hình khi giáo viên khởi chạy Quiz Live
 */
export const QuizLiveConfigSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên bài Quiz'),
  mode: QuizLiveModeSchema.default('kahoot'),
  questions: z.array(QuizQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi để bắt đầu Quiz'),
  speedScoring: z.boolean().optional().default(true),
  streakBonus: z.boolean().optional().default(true),
  shuffleQuestions: z.boolean().optional().default(false),
  shuffleOptions: z.boolean().optional().default(false),
  enablePowerUps: z.boolean().optional(),
  powerUpCapacity: z.number().int().min(1).max(5).optional(),
  powerUpDropCondition: z.union([z.literal(1), z.literal(2)]).optional(),
  showCorrectAnswer: z.boolean().optional(),
  allowReplay: z.boolean().optional(),
});
export type QuizLiveConfig = z.infer<typeof QuizLiveConfigSchema>;

export const ParticipantAnswerRecordSchema = z.object({
  selectedAnswer: z.unknown(),
  isCorrect: z.boolean(),
  pointsEarned: z.number(),
  responseTimeMs: z.number(),
  correctAnswer: z.unknown().optional(),
  explanation: z.string().optional(),
});
export type ParticipantAnswerRecord = z.infer<typeof ParticipantAnswerRecordSchema>;

export const ParticipantQuizProgressSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  score: z.number(),
  correctCount: z.number(),
  currentStreak: z.number(),
  maxStreak: z.number(),
  currentIndex: z.number(), // Chỉ số câu hiện tại cho chế độ Quizizz
  isCompleted: z.boolean(),
  answers: z.record(z.string(), ParticipantAnswerRecordSchema),
  lastAnswer: z
    .object({
      questionIndex: z.number(),
      isCorrect: z.boolean(),
      pointsEarned: z.number(),
      newStreak: z.number(),
      selectedAnswer: z.unknown().optional(),
      correctAnswer: z.unknown().optional(),
      explanation: z.string().optional(),
    })
    .nullable(),
  inventory: PowerUpInventorySchema.optional(),
  activeEffects: z.array(ActiveEffectSchema).optional(),
  personalNotification: PersonalCombatNotificationSchema.nullable().optional(),
  hiddenOptions: z.array(z.number()).optional(),
  replayCount: z.number().optional(),
  bestScore: z.number().optional(),
});
export type ParticipantQuizProgress = z.infer<typeof ParticipantQuizProgressSchema>;

export const LeaderboardEntrySchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  score: z.number(),
  rank: z.number(),
  correctCount: z.number(),
  currentStreak: z.number(),
  isCompleted: z.boolean(),
  activeShield: z.boolean().optional(),
  activeReflectShield: z.boolean().optional(),
  isFrozen: z.boolean().optional(),
  isDoublePoints: z.boolean().optional(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const QuizLiveStatusSchema = z.enum([
  'waiting',
  'in_question',
  'question_review',
  'leaderboard',
  'finished',
]);
export type QuizLiveStatus = z.infer<typeof QuizLiveStatusSchema>;

export const QuestionStatsSchema = z.object({
  totalResponses: z.number(),
  optionCounts: z.record(z.string(), z.number()),
  correctCount: z.number(),
});
export type QuestionStats = z.infer<typeof QuestionStatsSchema>;

/**
 * Trạng thái thời gian thực được đồng bộ giữa server và các clients
 */
export const QuizLiveStateSchema = z.object({
  title: z.string(),
  mode: QuizLiveModeSchema,
  status: QuizLiveStatusSchema,
  currentQuestionIndex: z.number(),
  totalQuestions: z.number(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: QuizQuestionTypeSchema,
      stem: z.string(),
      image: z.string().optional(),
      options: z.array(z.string()).optional(),
      optionImages: z.array(z.string().nullable().optional()).optional(),
      timeLimit: z.number(),
      points: z.number(),
      leftItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
      rightItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
      template: z.string().optional(),
      blanks: z.array(z.object({ id: z.string(), position: z.number().optional() })).optional(),
      wordBank: z.array(z.string()).optional(),
      items: z
        .array(
          z.object({
            id: z.string().optional(),
            text: z.union([z.string(), z.object({ text: z.string() })]),
          })
        )
        .optional(),
    })
  ),
  currentCorrectAnswer: z.unknown().optional(),
  questionStartedAt: z.number(),
  timeLimit: z.number(),
  participants: z.record(z.string(), ParticipantQuizProgressSchema),
  leaderboard: z.array(LeaderboardEntrySchema),
  questionStats: QuestionStatsSchema.nullable(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  enablePowerUps: z.boolean().optional(),
  powerUpCapacity: z.number().optional(),
  powerUpDropCondition: z.union([z.literal(1), z.literal(2)]).optional(),
  combatFeed: z.array(CombatEventSchema).optional(),
  showCorrectAnswer: z.boolean().optional(),
  allowReplay: z.boolean().optional(),
});
export type QuizLiveState = z.infer<typeof QuizLiveStateSchema>;

/**
 * Kết quả của từng người tham gia khi kết thúc bài Quiz Live
 */
export const QuizLiveResultSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
  score: z.number(),
  correctCount: z.number(),
  totalQuestions: z.number(),
  accuracy: z.number(),
  maxStreak: z.number(),
  rank: z.number(),
  answers: z.record(z.string(), ParticipantAnswerRecordSchema).optional(),
});
export type QuizLiveResult = z.infer<typeof QuizLiveResultSchema>;
