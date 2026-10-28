export interface CalculateQuizScoreParams {
  isCorrect: boolean;
  responseTimeMs: number;
  timeLimitSeconds: number;
  basePoints?: number;
  speedScoring?: boolean;
  currentStreak: number;
  streakBonus?: boolean;
}

export interface QuizScoreResult {
  pointsEarned: number;
  speedPoints: number;
  streakBonusPoints: number;
  newStreak: number;
}

/**
 * Tính điểm câu hỏi Quiz Live dựa trên tính chính xác, tốc độ phản hồi và chuỗi trả lời đúng liên tiếp (streak)
 */
export function calculateQuizScore(params: CalculateQuizScoreParams): QuizScoreResult {
  const {
    isCorrect,
    responseTimeMs,
    timeLimitSeconds,
    basePoints = 1000,
    speedScoring = true,
    currentStreak,
    streakBonus = true,
  } = params;

  if (!isCorrect) {
    return {
      pointsEarned: 0,
      speedPoints: 0,
      streakBonusPoints: 0,
      newStreak: 0,
    };
  }

  const newStreak = currentStreak + 1;

  let speedPoints = basePoints;
  if (speedScoring && timeLimitSeconds > 0) {
    const elapsedSeconds = Math.max(0, responseTimeMs / 1000);
    // Tỷ lệ giảm dần tuyến tính từ 1.0 (trả lời tức thì) xuống tối thiểu 0.5 (ở giây cuối cùng của timeLimit)
    const ratio = Math.max(0.5, Math.min(1.0, 1.0 - elapsedSeconds / (timeLimitSeconds * 2)));
    speedPoints = Math.round(basePoints * ratio);
  }

  let streakBonusPoints = 0;
  if (streakBonus && newStreak >= 2) {
    // Thưởng chuỗi đúng liên tiếp: chuỗi 2 (+100), chuỗi 3 (+200)... tối đa +500 điểm
    streakBonusPoints = Math.min((newStreak - 1) * 100, 500);
  }

  const pointsEarned = speedPoints + streakBonusPoints;

  return {
    pointsEarned,
    speedPoints,
    streakBonusPoints,
    newStreak,
  };
}
