/**
 * levels.ts — Quản lý công thức Level & EXP tích lũy của EduClass v2
 * Theo PLAN mục 6: mặc định level n cần 50*n*(n+1)/2 EXP tích lũy.
 */

/**
 * Tính tổng số EXP tích lũy tối thiểu cần thiết để đạt đến một cấp độ cụ thể (Level >= 1)
 *
 * Mặc định:
 * - Level 1: 0 EXP
 * - Level 2: 50 EXP (cần 50 EXP tích lũy)
 * - Level 3: 150 EXP (thêm 100 EXP)
 * - Level 4: 300 EXP (thêm 150 EXP)
 * - Level n (n >= 2): 50 * (n - 1) * n / 2
 */
export function getCumulativeExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (50 * (level - 1) * level) / 2;
}

/**
 * Tính cấp độ (Level >= 1) tương ứng với tổng số EXP tích lũy
 *
 * Dựa trên giải phương trình bậc hai:
 * (n - 1) * n <= 2 * totalExp / 50 = totalExp / 25
 * n^2 - n - (totalExp / 25) <= 0
 * n = floor((1 + sqrt(1 + 4 * (totalExp / 25))) / 2)
 */
export function calculateLevel(totalExp: number): number {
  if (totalExp <= 0) return 1;
  const delta = 1 + (4 * totalExp) / 25;
  const n = Math.floor((1 + Math.sqrt(delta)) / 2);
  return Math.max(1, n);
}

export interface ExpProgress {
  /** Tổng EXP tích lũy hiện tại */
  totalExp: number;
  /** Cấp độ hiện tại */
  currentLevel: number;
  /** Cấp độ tiếp theo */
  nextLevel: number;
  /** Mốc EXP bắt đầu của cấp độ hiện tại */
  currentLevelBaseExp: number;
  /** Mốc EXP cần đạt để lên cấp độ tiếp theo */
  nextLevelRequiredExp: number;
  /** Số EXP đã tích lũy trong cấp độ hiện tại */
  expIntoCurrentLevel: number;
  /** Số EXP cần tích lũy thêm để lên cấp độ tiếp theo */
  expNeededForNextLevel: number;
  /** Phần trăm tiến độ (0 - 100) */
  progressPercent: number;
}

/**
 * Tính toán chi tiết tiến độ lên cấp độ tiếp theo
 */
export function getExpProgress(totalExp: number): ExpProgress {
  const safeExp = Math.max(0, totalExp);
  const currentLevel = calculateLevel(safeExp);
  const nextLevel = currentLevel + 1;
  const currentLevelBaseExp = getCumulativeExpForLevel(currentLevel);
  const nextLevelRequiredExp = getCumulativeExpForLevel(nextLevel);
  const expIntoCurrentLevel = safeExp - currentLevelBaseExp;
  const expNeededForNextLevel = nextLevelRequiredExp - currentLevelBaseExp;
  const progressPercent =
    expNeededForNextLevel > 0
      ? Math.min(100, Math.round((expIntoCurrentLevel / expNeededForNextLevel) * 100))
      : 100;

  return {
    totalExp: safeExp,
    currentLevel,
    nextLevel,
    currentLevelBaseExp,
    nextLevelRequiredExp,
    expIntoCurrentLevel,
    expNeededForNextLevel,
    progressPercent,
  };
}
