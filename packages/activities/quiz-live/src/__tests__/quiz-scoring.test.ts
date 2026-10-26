import { describe, expect, it } from 'vitest';
import { calculateQuizScore } from '../quiz-scoring.js';

describe('Quiz Live Speed & Streak Scoring', () => {
  it('returns 0 points and resets streak to 0 when answer is incorrect', () => {
    const result = calculateQuizScore({
      isCorrect: false,
      responseTimeMs: 2000,
      timeLimitSeconds: 20,
      currentStreak: 5,
    });

    expect(result.pointsEarned).toBe(0);
    expect(result.speedPoints).toBe(0);
    expect(result.streakBonusPoints).toBe(0);
    expect(result.newStreak).toBe(0);
  });

  it('gives maximum speed points when answered immediately', () => {
    const result = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 100, // 0.1s
      timeLimitSeconds: 20,
      basePoints: 1000,
      speedScoring: true,
      currentStreak: 0,
      streakBonus: false,
    });

    // 1000 * (1 - 0.1 / 40) ≈ 1000 * 0.9975 ≈ 998 ~ 1000
    expect(result.speedPoints).toBeGreaterThanOrEqual(995);
    expect(result.newStreak).toBe(1);
    expect(result.pointsEarned).toBe(result.speedPoints);
  });

  it('gives minimum 50% speed points when answered at the deadline', () => {
    const result = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 20000, // đúng 20s
      timeLimitSeconds: 20,
      basePoints: 1000,
      speedScoring: true,
      currentStreak: 0,
      streakBonus: false,
    });

    // 1000 * (1 - 20 / 40) = 500
    expect(result.speedPoints).toBe(500);
    expect(result.pointsEarned).toBe(500);
  });

  it('gives exact base points when speed scoring is disabled', () => {
    const result = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 15000,
      timeLimitSeconds: 20,
      basePoints: 1000,
      speedScoring: false,
      currentStreak: 0,
      streakBonus: false,
    });

    expect(result.speedPoints).toBe(1000);
    expect(result.pointsEarned).toBe(1000);
  });

  it('calculates streak bonus correctly and caps at +500', () => {
    // Chuỗi đúng lần 1 (newStreak = 1) -> Chưa có bonus
    const res1 = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 0,
      timeLimitSeconds: 20,
      basePoints: 1000,
      currentStreak: 0,
      streakBonus: true,
    });
    expect(res1.newStreak).toBe(1);
    expect(res1.streakBonusPoints).toBe(0);

    // Chuỗi đúng lần 2 (newStreak = 2) -> +100
    const res2 = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 0,
      timeLimitSeconds: 20,
      basePoints: 1000,
      currentStreak: 1,
      streakBonus: true,
    });
    expect(res2.newStreak).toBe(2);
    expect(res2.streakBonusPoints).toBe(100);
    expect(res2.pointsEarned).toBe(1100);

    // Chuỗi đúng lần 3 (newStreak = 3) -> +200
    const res3 = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 0,
      timeLimitSeconds: 20,
      basePoints: 1000,
      currentStreak: 2,
      streakBonus: true,
    });
    expect(res3.newStreak).toBe(3);
    expect(res3.streakBonusPoints).toBe(200);

    // Chuỗi đúng lần 7 (newStreak = 7) -> (7-1)*100 = 600 -> trần 500
    const res7 = calculateQuizScore({
      isCorrect: true,
      responseTimeMs: 0,
      timeLimitSeconds: 20,
      basePoints: 1000,
      currentStreak: 6,
      streakBonus: true,
    });
    expect(res7.newStreak).toBe(7);
    expect(res7.streakBonusPoints).toBe(500);
  });
});
