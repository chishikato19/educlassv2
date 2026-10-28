import { describe, expect, it } from 'vitest';
import {
  GetRewardRulesResponseSchema,
  GrantRewardRequestSchema,
  GrantRewardResponseSchema,
  ResetRewardRulesResponseSchema,
  RewardLogDtoSchema,
  RewardNotificationPayloadSchema,
  RewardRuleDtoSchema,
  SetRewardRulesRequestSchema,
} from '../reward.js';

describe('Reward Protocol Schemas', () => {
  it('validates GrantRewardRequestSchema', () => {
    const valid = GrantRewardRequestSchema.parse({
      participantId: 'p_123',
      exp: 20,
      reason: 'Phát biểu đúng',
    });
    expect(valid.participantId).toBe('p_123');
    expect(valid.exp).toBe(20);
    expect(valid.reason).toBe('Phát biểu đúng');

    // Default reason
    const withDefault = GrantRewardRequestSchema.parse({
      participantId: 'p_123',
      exp: 15,
    });
    expect(withDefault.reason).toBe('Thưởng từ giáo viên');

    // Reject negative or zero exp
    expect(() => GrantRewardRequestSchema.parse({ participantId: 'p_1', exp: 0 })).toThrow();
    expect(() => GrantRewardRequestSchema.parse({ participantId: 'p_1', exp: -10 })).toThrow();
  });

  it('validates RewardLogDtoSchema', () => {
    const validLog = RewardLogDtoSchema.parse({
      id: 'log_1',
      sessionId: 'sess_1',
      participantId: 'p_1',
      studentId: 'st_1',
      exp: 50,
      reason: 'Hoàn thành xuất sắc',
      persisted: true,
      ts: 1700000000000,
    });
    expect(validLog.persisted).toBe(true);
    expect(validLog.studentId).toBe('st_1');

    const nonPersisted = RewardLogDtoSchema.parse({
      id: 'log_2',
      sessionId: 'sess_1',
      participantId: 'p_2',
      studentId: null,
      exp: 30,
      reason: 'Khách tự do',
      persisted: false,
      ts: 1700000000000,
    });
    expect(nonPersisted.persisted).toBe(false);
  });

  it('validates GrantRewardResponseSchema', () => {
    const res = GrantRewardResponseSchema.parse({
      success: true,
      persisted: true,
      expGranted: 25,
      studentId: 'st_1',
      newTotalExp: 125,
      newLevel: 2,
      leveledUp: true,
      rewardLog: {
        id: 'log_1',
        sessionId: 'sess_1',
        participantId: 'p_1',
        studentId: 'st_1',
        exp: 25,
        reason: 'Thưởng nhanh',
        persisted: true,
        ts: 1700000000000,
      },
    });
    expect(res.leveledUp).toBe(true);
    expect(res.newTotalExp).toBe(125);
  });

  it('validates RewardNotificationPayloadSchema', () => {
    const notification = RewardNotificationPayloadSchema.parse({
      participantId: 'p_1',
      exp: 10,
      reason: 'Đúng câu hỏi',
      persisted: true,
      newTotalExp: 60,
      newLevel: 2,
      leveledUp: false,
      ts: 1700000000000,
    });
    expect(notification.exp).toBe(10);
  });

  it('validates RewardRuleDtoSchema, SetRewardRulesRequestSchema and GetRewardRulesResponseSchema', () => {
    const rule = {
      id: 'rule_1',
      ownerId: 'teacher_1',
      scope: 'teacher' as const,
      activityId: 'quiz_live',
      trigger: 'correct',
      exp: 15,
      enabled: true,
    };
    const parsedRule = RewardRuleDtoSchema.parse(rule);
    expect(parsedRule.exp).toBe(15);
    expect(parsedRule.scope).toBe('teacher');

    const setRequest = SetRewardRulesRequestSchema.parse({
      rules: [
        { activityId: 'quiz_live', trigger: 'correct', exp: 20, enabled: true },
        { activityId: null, trigger: 'session_cap', exp: 150, enabled: true },
      ],
    });
    expect(setRequest.rules).toHaveLength(2);

    const getResponse = GetRewardRulesResponseSchema.parse({
      globalRules: [
        {
          id: 'rule_g1',
          ownerId: null,
          scope: 'global',
          activityId: 'quiz_live',
          trigger: 'correct',
          exp: 10,
          enabled: true,
        },
      ],
      teacherRules: [parsedRule],
      effectiveRules: [parsedRule],
      sessionCap: 150,
      activityCaps: { quiz_live: 100 },
    });
    expect(getResponse.sessionCap).toBe(150);
    expect(getResponse.activityCaps.quiz_live).toBe(100);

    const resetResponse = ResetRewardRulesResponseSchema.parse({
      success: true,
      message: 'Đã khôi phục cài đặt EXP về mặc định',
      effectiveRules: getResponse.globalRules,
    });
    expect(resetResponse.success).toBe(true);
  });
});
