import { describe, expect, it } from 'vitest';
import { calculateLevel, getCumulativeExpForLevel, getExpProgress } from '../levels/levels.js';

describe('Level & EXP Calculation (core/levels)', () => {
  it('calculates cumulative exp for levels according to PLAN 6 default formula', () => {
    // Level 1: 0 EXP
    expect(getCumulativeExpForLevel(1)).toBe(0);
    expect(getCumulativeExpForLevel(0)).toBe(0);
    expect(getCumulativeExpForLevel(-1)).toBe(0);

    // Level 2: 50 * 1 * 2 / 2 = 50
    expect(getCumulativeExpForLevel(2)).toBe(50);

    // Level 3: 50 * 2 * 3 / 2 = 150
    expect(getCumulativeExpForLevel(3)).toBe(150);

    // Level 4: 50 * 3 * 4 / 2 = 300
    expect(getCumulativeExpForLevel(4)).toBe(300);

    // Level 5: 50 * 4 * 5 / 2 = 500
    expect(getCumulativeExpForLevel(5)).toBe(500);

    // Level 10: 50 * 9 * 10 / 2 = 2250
    expect(getCumulativeExpForLevel(10)).toBe(2250);
  });

  it('calculates level accurately from total exp', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(25)).toBe(1);
    expect(calculateLevel(49)).toBe(1);

    expect(calculateLevel(50)).toBe(2);
    expect(calculateLevel(99)).toBe(2);
    expect(calculateLevel(149)).toBe(2);

    expect(calculateLevel(150)).toBe(3);
    expect(calculateLevel(299)).toBe(3);

    expect(calculateLevel(300)).toBe(4);
    expect(calculateLevel(499)).toBe(4);

    expect(calculateLevel(500)).toBe(5);
    expect(calculateLevel(2250)).toBe(10);
  });

  it('computes exp progress and percentage towards next level', () => {
    const progressAt0 = getExpProgress(0);
    expect(progressAt0.currentLevel).toBe(1);
    expect(progressAt0.nextLevel).toBe(2);
    expect(progressAt0.currentLevelBaseExp).toBe(0);
    expect(progressAt0.nextLevelRequiredExp).toBe(50);
    expect(progressAt0.expIntoCurrentLevel).toBe(0);
    expect(progressAt0.expNeededForNextLevel).toBe(50);
    expect(progressAt0.progressPercent).toBe(0);

    const progressAt25 = getExpProgress(25);
    expect(progressAt25.currentLevel).toBe(1);
    expect(progressAt25.progressPercent).toBe(50);

    const progressAt100 = getExpProgress(100);
    // Level 2 (50 to 150): 100 is 50 exp in, out of 100 needed -> 50%
    expect(progressAt100.currentLevel).toBe(2);
    expect(progressAt100.expIntoCurrentLevel).toBe(50);
    expect(progressAt100.expNeededForNextLevel).toBe(100);
    expect(progressAt100.progressPercent).toBe(50);
  });
});
