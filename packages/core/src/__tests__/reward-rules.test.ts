import { describe, expect, it } from 'vitest';
import {
  calculateCappedExp,
  DEFAULT_GLOBAL_REWARD_RULES,
  extractRewardCaps,
  findEffectiveRule,
  resolveEffectiveRewardRules,
  type RewardRuleItem,
} from '../rewards/rules.js';

describe('Reward Rules & Priority & Caps (Task 3.2 Core)', () => {
  it('contains comprehensive default global reward rules from PLAN section 6', () => {
    expect(DEFAULT_GLOBAL_REWARD_RULES.length).toBeGreaterThan(5);

    // Kiểm tra có đầy đủ các activity cốt lõi
    const sessionCap = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, null, 'session_cap');
    expect(sessionCap).toBeDefined();
    expect(sessionCap?.exp).toBe(200);

    const quizCorrect = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, 'quiz_live', 'correct');
    expect(quizCorrect?.exp).toBe(10);

    const quizRank1 = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, 'quiz_live', 'rank_1');
    expect(quizRank1?.exp).toBe(50);

    const pollParticipate = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, 'quick_poll', 'participate');
    expect(pollParticipate?.exp).toBe(10);

    const examScoreHigh = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, 'exam', 'score_high');
    expect(examScoreHigh?.exp).toBe(20);

    const attendance = findEffectiveRule(DEFAULT_GLOBAL_REWARD_RULES, null, 'attendance');
    expect(attendance?.exp).toBe(5);
  });

  it('correctly resolves priority: teacher rules override global rules, retains unmodified globals', () => {
    const teacherOverrides: RewardRuleItem[] = [
      // GV tăng điểm đúng câu Quiz từ 10 lên 25
      {
        activityId: 'quiz_live',
        trigger: 'correct',
        exp: 25,
        enabled: true,
      },
      // GV tắt thưởng rank_3
      {
        activityId: 'quiz_live',
        trigger: 'rank_3',
        exp: 0,
        enabled: false,
      },
      // GV thêm luật riêng mới
      {
        activityId: 'custom_game',
        trigger: 'bonus',
        exp: 99,
        enabled: true,
      },
    ];

    const effective = resolveEffectiveRewardRules(DEFAULT_GLOBAL_REWARD_RULES, teacherOverrides);

    // 1. Luật quiz_live correct đã bị ghi đè thành 25 và scope teacher
    const effectiveQuizCorrect = findEffectiveRule(effective, 'quiz_live', 'correct');
    expect(effectiveQuizCorrect?.exp).toBe(25);
    expect(effectiveQuizCorrect?.scope).toBe('teacher');

    // 2. Luật quiz_live rank_3 đã bị tắt
    const effectiveRank3 = findEffectiveRule(effective, 'quiz_live', 'rank_3');
    expect(effectiveRank3?.enabled).toBe(false);

    // 3. Luật chưa tùy biến vẫn giữ nguyên từ global
    const effectiveRank1 = findEffectiveRule(effective, 'quiz_live', 'rank_1');
    expect(effectiveRank1?.exp).toBe(50);
    expect(effectiveRank1?.scope).toBe('global');

    // 4. Luật mới của GV xuất hiện trong effective
    const customRule = findEffectiveRule(effective, 'custom_game', 'bonus');
    expect(customRule?.exp).toBe(99);
    expect(customRule?.scope).toBe('teacher');
  });

  it('restores strictly to default global rules when teacher rules are empty (reset to defaults)', () => {
    const effective = resolveEffectiveRewardRules(DEFAULT_GLOBAL_REWARD_RULES, []);
    expect(effective).toHaveLength(DEFAULT_GLOBAL_REWARD_RULES.length);

    const quizCorrect = findEffectiveRule(effective, 'quiz_live', 'correct');
    expect(quizCorrect?.exp).toBe(10);
    expect(quizCorrect?.scope).toBe('global');
  });

  it('extracts session cap and activity caps properly', () => {
    const rules: RewardRuleItem[] = [
      { activityId: null, trigger: 'session_cap', exp: 150, enabled: true },
      { activityId: 'quiz_live', trigger: 'activity_cap', exp: 80, enabled: true },
      { activityId: 'quick_poll', trigger: 'activity_cap', exp: 40, enabled: true },
      { activityId: 'exam', trigger: 'activity_cap', exp: 50, enabled: false }, // Bị tắt -> không tính
    ];

    const caps = extractRewardCaps(rules);
    expect(caps.sessionCap).toBe(150);
    expect(caps.activityCaps.quiz_live).toBe(80);
    expect(caps.activityCaps.quick_poll).toBe(40);
    expect(caps.activityCaps.exam).toBeUndefined();
  });

  describe('calculateCappedExp (Anti-Inflation Caps)', () => {
    it('grants full EXP when within caps or without caps', () => {
      const res = calculateCappedExp({
        expToGrant: 20,
        currentSessionExp: 50,
        sessionCap: 200,
        currentActivityExp: 10,
        activityCap: 50,
      });

      expect(res.allowedExp).toBe(20);
      expect(res.isCapped).toBe(false);
      expect(res.capReason).toBeUndefined();
    });

    it('caps by activity cap when remaining activity allowance is less than expToGrant', () => {
      // Activity cap: 50. Hiện tại đã có 40. Thưởng 20 -> chỉ được nhận thêm 10.
      const res = calculateCappedExp({
        expToGrant: 20,
        currentSessionExp: 40,
        sessionCap: 200,
        currentActivityExp: 40,
        activityCap: 50,
      });

      expect(res.allowedExp).toBe(10);
      expect(res.isCapped).toBe(true);
      expect(res.capReason).toBe('activity_cap');
    });

    it('caps by session cap when remaining session allowance is less than expToGrant', () => {
      // Session cap: 100. Hiện tại session đã có 95. Activity cap: 50 (mới có 10).
      // Thưởng 20 -> chỉ được nhận thêm 5.
      const res = calculateCappedExp({
        expToGrant: 20,
        currentSessionExp: 95,
        sessionCap: 100,
        currentActivityExp: 10,
        activityCap: 50,
      });

      expect(res.allowedExp).toBe(5);
      expect(res.isCapped).toBe(true);
      expect(res.capReason).toBe('session_cap');
    });

    it('caps to 0 when participant has already reached session or activity cap', () => {
      const resActivityFull = calculateCappedExp({
        expToGrant: 15,
        currentSessionExp: 50,
        sessionCap: 200,
        currentActivityExp: 50,
        activityCap: 50,
      });

      expect(resActivityFull.allowedExp).toBe(0);
      expect(resActivityFull.isCapped).toBe(true);
      expect(resActivityFull.capReason).toBe('activity_cap');

      const resSessionFull = calculateCappedExp({
        expToGrant: 15,
        currentSessionExp: 200,
        sessionCap: 200,
        currentActivityExp: 10,
        activityCap: 50,
      });

      expect(resSessionFull.allowedExp).toBe(0);
      expect(resSessionFull.isCapped).toBe(true);
      expect(resSessionFull.capReason).toBe('session_cap');
    });

    it('handles negative or zero expToGrant safely', () => {
      const resZero = calculateCappedExp({
        expToGrant: 0,
        currentSessionExp: 0,
        currentActivityExp: 0,
      });
      expect(resZero.allowedExp).toBe(0);
      expect(resZero.isCapped).toBe(false);
    });
  });
});
