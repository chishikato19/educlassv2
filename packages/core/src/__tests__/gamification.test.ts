import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TITLES,
  evaluateStudentTitleRules,
  isCostumeUnlocked,
  isTitleEligible,
  BASE_AVATARS,
  HEADWEAR_ITEMS,
  GLASSES_ITEMS,
  OUTFIT_ITEMS,
} from '../index.js';
import type { StudentGamificationStats } from '@educlass/protocol';

describe('Gamification Core: Costumes & Avatar Items', () => {
  it('định nghĩa đầy đủ 8 loại nhân vật cơ bản', () => {
    expect(BASE_AVATARS).toHaveLength(8);
    const cat = BASE_AVATARS.find(b => b.id === 'cat');
    expect(cat).toBeDefined();
    expect(cat?.unlockLevel).toBe(1);

    const dragon = BASE_AVATARS.find(b => b.id === 'dragon');
    expect(dragon).toBeDefined();
    expect(dragon?.unlockLevel).toBe(8);
  });

  it('kiểm tra mở khóa trang phục theo level', () => {
    const defaultItem = { unlockLevel: 3 };
    expect(isCostumeUnlocked(defaultItem, 1, [])).toBe(false);
    expect(isCostumeUnlocked(defaultItem, 2, [])).toBe(false);
    expect(isCostumeUnlocked(defaultItem, 3, [])).toBe(true);
    expect(isCostumeUnlocked(defaultItem, 5, [])).toBe(true);
  });

  it('kiểm tra mở khóa trang phục bằng danh hiệu đặc biệt', () => {
    const specialHat = {
      unlockLevel: 10,
      unlockTitleKey: 'dai_su',
    };

    // Khi chưa đạt cấp 10 nhưng có danh hiệu thì vẫn mở khóa
    expect(isCostumeUnlocked(specialHat, 2, ['dai_su'])).toBe(true);
    // Khi chưa đủ cấp và chưa có danh hiệu thì khóa
    expect(isCostumeUnlocked(specialHat, 2, ['other_title'])).toBe(false);
  });

  it('có đủ danh mục phụ kiện nón, kính và áo', () => {
    expect(HEADWEAR_ITEMS.length).toBeGreaterThanOrEqual(5);
    expect(GLASSES_ITEMS.length).toBeGreaterThanOrEqual(3);
    expect(OUTFIT_ITEMS.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Gamification Core: Title Rules Evaluator', () => {
  it('DEFAULT_TITLES chứa 8 danh hiệu mặc định hợp lệ', () => {
    expect(DEFAULT_TITLES).toHaveLength(8);
    for (const title of DEFAULT_TITLES) {
      expect(title.key).toBeTruthy();
      expect(title.name).toBeTruthy();
      expect(title.iconKey).toBeTruthy();
      expect(title.rule.conditions.length).toBeGreaterThan(0);
    }
  });

  it('đánh giá điều kiện min_exp và min_level', () => {
    const rookieTitle = DEFAULT_TITLES.find(t => t.key === 'tan_binh')!;
    const expertTitle = DEFAULT_TITLES.find(t => t.key === 'dai_su')!;

    const stats1: StudentGamificationStats = {
      exp: 10,
      level: 1,
      examHighScores: 0,
      examPerfects: 0,
      quizStreak: 0,
      attendanceSessions: 0,
    };
    expect(isTitleEligible(stats1, rookieTitle.rule)).toBe(true);
    expect(isTitleEligible(stats1, expertTitle.rule)).toBe(false);

    const statsHigh: StudentGamificationStats = {
      exp: 2500,
      level: 10,
      examHighScores: 0,
      examPerfects: 0,
      quizStreak: 0,
      attendanceSessions: 0,
    };
    expect(isTitleEligible(statsHigh, expertTitle.rule)).toBe(true);
  });

  it('đánh giá điều kiện bài thi và chuỗi trắc nghiệm', () => {
    const topScorer = DEFAULT_TITLES.find(t => t.key === 'thu_khoa')!;
    const lightning = DEFAULT_TITLES.find(t => t.key === 'vua_toc_do')!;

    const statsExam: StudentGamificationStats = {
      exp: 100,
      level: 2,
      examHighScores: 3,
      examPerfects: 1,
      quizStreak: 5,
      attendanceSessions: 2,
    };

    expect(isTitleEligible(statsExam, topScorer.rule)).toBe(true);
    expect(isTitleEligible(statsExam, lightning.rule)).toBe(true);
  });

  it('evaluateStudentTitleRules lọc ra đúng các danh hiệu đủ điều kiện', () => {
    const stats: StudentGamificationStats = {
      exp: 600,
      level: 3,
      examHighScores: 3,
      examPerfects: 0,
      quizStreak: 5,
      attendanceSessions: 1,
    };

    const eligible = evaluateStudentTitleRules(stats, DEFAULT_TITLES);
    expect(eligible).toContain('tan_binh');
    expect(eligible).toContain('cham_chi');
    expect(eligible).toContain('sieu_cap');
    expect(eligible).toContain('hoc_ba');
    expect(eligible).toContain('thu_khoa');
    expect(eligible).toContain('vua_toc_do');
    // Chưa đủ điểm 10 hoàn hảo
    expect(eligible).not.toContain('diem_muoi');
  });
});
