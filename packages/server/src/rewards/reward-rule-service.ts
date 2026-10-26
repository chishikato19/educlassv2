import {
  calculateCappedExp,
  DEFAULT_GLOBAL_REWARD_RULES,
  extractRewardCaps,
  findEffectiveRule,
  resolveEffectiveRewardRules,
  type RewardRuleItem,
} from '@educlass/core';
import type { RewardRepository, RewardRuleSelect } from '@educlass/db';
import type { RewardRuleItemInput } from '@educlass/protocol';

export interface CalculatedExpResult {
  readonly expGranted: number;
  readonly baseExp: number;
  readonly isCapped: boolean;
  readonly capReason?: 'session_cap' | 'activity_cap' | 'both' | undefined;
  readonly isRuleDisabled: boolean;
}

export class RewardRuleService {
  private globalSeeded = false;

  constructor(private readonly rewardRepo: RewardRepository) {}

  /**
   * Đảm bảo các quy tắc mặc định toàn cục đã được khởi tạo trong CSDL
   */
  async ensureGlobalRulesSeeded(): Promise<RewardRuleSelect[]> {
    if (this.globalSeeded) {
      return this.rewardRepo.getGlobalRules();
    }
    const rules = await this.rewardRepo.seedGlobalRules(DEFAULT_GLOBAL_REWARD_RULES);
    this.globalSeeded = true;
    return rules;
  }

  /**
   * Lấy toàn bộ thông tin quy tắc thưởng cho một giáo viên:
   * bao gồm luật toàn cục, luật riêng, luật có hiệu lực (sau khi ghi đè), và các mức trần EXP
   */
  async getRulesForTeacher(teacherId: string): Promise<{
    globalRules: RewardRuleSelect[];
    teacherRules: RewardRuleSelect[];
    effectiveRules: RewardRuleItem[];
    sessionCap: number | null;
    activityCaps: Record<string, number>;
  }> {
    await this.ensureGlobalRulesSeeded();

    const globalRules = await this.rewardRepo.getGlobalRules();
    const teacherRules = await this.rewardRepo.getTeacherRules(teacherId);

    const effectiveRules = resolveEffectiveRewardRules(globalRules, teacherRules);
    const caps = extractRewardCaps(effectiveRules);

    return {
      globalRules,
      teacherRules,
      effectiveRules,
      sessionCap: caps.sessionCap,
      activityCaps: caps.activityCaps,
    };
  }

  /**
   * Lưu bộ quy tắc tùy biến của giáo viên
   */
  async saveTeacherRules(
    teacherId: string,
    rules: RewardRuleItemInput[]
  ): Promise<{
    globalRules: RewardRuleSelect[];
    teacherRules: RewardRuleSelect[];
    effectiveRules: RewardRuleItem[];
    sessionCap: number | null;
    activityCaps: Record<string, number>;
  }> {
    await this.ensureGlobalRulesSeeded();
    await this.rewardRepo.setTeacherRules(teacherId, rules);
    return this.getRulesForTeacher(teacherId);
  }

  /**
   * Khôi phục cài đặt EXP của giáo viên về mặc định hệ thống
   */
  async resetTeacherRules(teacherId: string): Promise<{
    globalRules: RewardRuleSelect[];
    teacherRules: RewardRuleSelect[];
    effectiveRules: RewardRuleItem[];
    sessionCap: number | null;
    activityCaps: Record<string, number>;
  }> {
    await this.ensureGlobalRulesSeeded();
    await this.rewardRepo.resetTeacherRules(teacherId);
    return this.getRulesForTeacher(teacherId);
  }

  /**
   * Tính toán số EXP được cấp theo bộ luật hiệu lực của giáo viên và kiểm tra trần EXP chống lạm phát
   */
  async calculateExpToGrant(params: {
    sessionId: string;
    participantId: string;
    teacherId?: string | null | undefined;
    activityId?: string | null | undefined;
    trigger: string;
    defaultExp?: number | undefined;
  }): Promise<CalculatedExpResult> {
    await this.ensureGlobalRulesSeeded();

    let effectiveRules: readonly RewardRuleItem[] = DEFAULT_GLOBAL_REWARD_RULES;
    if (params.teacherId) {
      const teacherInfo = await this.getRulesForTeacher(params.teacherId);
      effectiveRules = teacherInfo.effectiveRules;
    }

    const matchedRule = findEffectiveRule(effectiveRules, params.activityId, params.trigger);

    // Nếu quy tắc bị vô hiệu hóa
    if (matchedRule && matchedRule.enabled === false) {
      return {
        expGranted: 0,
        baseExp: matchedRule.exp,
        isCapped: false,
        isRuleDisabled: true,
      };
    }

    const baseExp = matchedRule ? matchedRule.exp : params.defaultExp ?? 10;
    if (baseExp <= 0) {
      return {
        expGranted: 0,
        baseExp: 0,
        isCapped: false,
        isRuleDisabled: false,
      };
    }

    // Trích xuất các mức trần
    const caps = extractRewardCaps(effectiveRules);
    const sessionCap = caps.sessionCap;
    const activityCap = params.activityId ? caps.activityCaps[params.activityId] : undefined;

    // Lấy tổng EXP hiện tại của participant trong session / activity
    const totals = await this.rewardRepo.getParticipantExpTotals(
      params.sessionId,
      params.participantId,
      params.activityId
    );

    const cappedResult = calculateCappedExp({
      expToGrant: baseExp,
      currentSessionExp: totals.sessionExp,
      sessionCap,
      currentActivityExp: totals.activityExp,
      activityCap,
    });

    return {
      expGranted: cappedResult.allowedExp,
      baseExp,
      isCapped: cappedResult.isCapped,
      capReason: cappedResult.capReason,
      isRuleDisabled: false,
    };
  }
}
