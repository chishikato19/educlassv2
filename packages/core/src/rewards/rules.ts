import type { RewardScope } from '@educlass/protocol';

export interface RewardRuleItem {
  readonly id?: string | undefined;
  readonly ownerId?: string | null | undefined;
  readonly scope?: RewardScope | undefined;
  readonly activityId?: string | null | undefined;
  readonly trigger: string;
  readonly exp: number;
  readonly enabled?: boolean | undefined;
}

/**
 * Danh sách quy tắc thưởng EXP mặc định của hệ thống theo PLAN.md mục 6
 */
export const DEFAULT_GLOBAL_REWARD_RULES: readonly RewardRuleItem[] = [
  // 1. Chuyên cần / Điểm danh
  {
    activityId: null,
    trigger: 'attendance',
    exp: 5,
    enabled: true,
    scope: 'global',
  },
  // 2. Trần EXP toàn phiên (Session Cap)
  {
    activityId: null,
    trigger: 'session_cap',
    exp: 200,
    enabled: true,
    scope: 'global',
  },
  // 3. Quiz Live
  {
    activityId: 'quiz_live',
    trigger: 'correct',
    exp: 10,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quiz_live',
    trigger: 'complete',
    exp: 20,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_1',
    exp: 50,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_2',
    exp: 30,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_3',
    exp: 20,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quiz_live',
    trigger: 'activity_cap',
    exp: 100,
    enabled: true,
    scope: 'global',
  },
  // 4. Quick Poll (Bình chọn nhanh)
  {
    activityId: 'quick_poll',
    trigger: 'participate',
    exp: 10,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'quick_poll',
    trigger: 'activity_cap',
    exp: 30,
    enabled: true,
    scope: 'global',
  },
  // 5. Kỳ thi (Exam)
  {
    activityId: 'exam',
    trigger: 'complete',
    exp: 30,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'exam',
    trigger: 'exam_finish',
    exp: 30,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'exam',
    trigger: 'score_high',
    exp: 20,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'exam',
    trigger: 'exam_high_score',
    exp: 20,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'exam',
    trigger: 'exam_perfect',
    exp: 50,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'exam',
    trigger: 'activity_cap',
    exp: 100,
    enabled: true,
    scope: 'global',
  },
  // 6. Vòng quay may mắn (Wheel)
  {
    activityId: 'wheel',
    trigger: 'correct',
    exp: 15,
    enabled: true,
    scope: 'global',
  },
  {
    activityId: 'wheel',
    trigger: 'activity_cap',
    exp: 50,
    enabled: true,
    scope: 'global',
  },
];

/**
 * Sinh khóa định danh duy nhất cho một quy tắc dựa trên activityId và trigger
 */
export function getRuleKey(activityId: string | null | undefined, trigger: string): string {
  const normActivity = activityId && activityId.trim() !== '' ? activityId.trim() : '__global__';
  return `${normActivity}::${trigger.trim()}`;
}

/**
 * Hợp nhất và giải quyết thứ tự ưu tiên quy tắc thưởng:
 * Luật của giáo viên (teacher scope) ghi đè luật mặc định toàn cục (global scope)
 */
export function resolveEffectiveRewardRules(
  globalRules: readonly RewardRuleItem[],
  teacherRules: readonly RewardRuleItem[]
): RewardRuleItem[] {
  const teacherMap = new Map<string, RewardRuleItem>();
  for (const tr of teacherRules) {
    const key = getRuleKey(tr.activityId, tr.trigger);
    teacherMap.set(key, tr);
  }

  const effective: RewardRuleItem[] = [];
  const processedKeys = new Set<string>();

  // 1. Duyệt qua luật toàn cục: nếu có luật của giáo viên thì ghi đè
  for (const gr of globalRules) {
    const key = getRuleKey(gr.activityId, gr.trigger);
    processedKeys.add(key);

    const teacherOverride = teacherMap.get(key);
    if (teacherOverride) {
      effective.push({
        ...teacherOverride,
        scope: 'teacher',
      });
    } else {
      effective.push({
        ...gr,
        scope: 'global',
      });
    }
  }

  // 2. Thêm bất kỳ luật giáo viên mới nào không có trong luật toàn cục
  for (const tr of teacherRules) {
    const key = getRuleKey(tr.activityId, tr.trigger);
    if (!processedKeys.has(key)) {
      processedKeys.add(key);
      effective.push({
        ...tr,
        scope: 'teacher',
      });
    }
  }

  return effective;
}

/**
 * Tìm quy tắc hiệu lực cho một activity và trigger cụ thể
 */
export function findEffectiveRule(
  rules: readonly RewardRuleItem[],
  activityId: string | null | undefined,
  trigger: string
): RewardRuleItem | undefined {
  const key = getRuleKey(activityId, trigger);
  return rules.find(r => getRuleKey(r.activityId, r.trigger) === key);
}

/**
 * Trích xuất mức trần EXP từ danh sách quy tắc hiệu lực
 */
export function extractRewardCaps(rules: readonly RewardRuleItem[]): {
  sessionCap: number | null;
  activityCaps: Record<string, number>;
} {
  let sessionCap: number | null = null;
  const activityCaps: Record<string, number> = {};

  for (const rule of rules) {
    if (rule.enabled === false) continue;

    if ((!rule.activityId || rule.activityId === '__global__') && rule.trigger === 'session_cap') {
      sessionCap = rule.exp > 0 ? rule.exp : null;
    } else if (rule.activityId && rule.trigger === 'activity_cap') {
      if (rule.exp > 0) {
        activityCaps[rule.activityId] = rule.exp;
      }
    }
  }

  return { sessionCap, activityCaps };
}

export interface CalculateCappedExpParams {
  readonly expToGrant: number;
  readonly currentSessionExp: number;
  readonly sessionCap?: number | null | undefined;
  readonly currentActivityExp: number;
  readonly activityCap?: number | null | undefined;
}

export interface CalculateCappedExpResult {
  readonly allowedExp: number;
  readonly isCapped: boolean;
  readonly capReason?: 'session_cap' | 'activity_cap' | 'both' | undefined;
}

/**
 * Tính toán số EXP thực sự được nhận sau khi áp trần chống lạm phát
 * theo PLAN.md mục 6:
 * - Trần activity_cap: tổng EXP trong activity không vượt quá mức cho phép
 * - Trần session_cap: tổng EXP trong toàn bộ phiên không vượt quá mức cho phép
 */
export function calculateCappedExp(params: CalculateCappedExpParams): CalculateCappedExpResult {
  const { expToGrant, currentSessionExp, sessionCap, currentActivityExp, activityCap } = params;

  if (expToGrant <= 0) {
    return {
      allowedExp: 0,
      isCapped: false,
    };
  }

  let allowed = expToGrant;
  let cappedByActivity = false;
  let cappedBySession = false;

  // 1. Kiểm tra trần Activity
  if (activityCap != null && activityCap > 0) {
    const remainActivity = Math.max(0, activityCap - currentActivityExp);
    if (allowed > remainActivity) {
      allowed = remainActivity;
      cappedByActivity = true;
    }
  }

  // 2. Kiểm tra trần Phiên
  if (sessionCap != null && sessionCap > 0) {
    const remainSession = Math.max(0, sessionCap - currentSessionExp);
    if (allowed > remainSession) {
      allowed = remainSession;
      cappedBySession = true;
    }
  }

  let capReason: 'session_cap' | 'activity_cap' | 'both' | undefined = undefined;
  if (cappedByActivity && cappedBySession) {
    capReason = 'both';
  } else if (cappedByActivity) {
    capReason = 'activity_cap';
  } else if (cappedBySession) {
    capReason = 'session_cap';
  }

  return {
    allowedExp: allowed,
    isCapped: allowed < expToGrant,
    capReason,
  };
}
