import type { IdentityLevel } from '@educlass/protocol';
import { calculateLevel } from '../levels/levels.js';

export interface GrantRewardParticipant {
  readonly id: string;
  readonly sessionId: string;
  readonly identityLevel: IdentityLevel;
  readonly studentId?: string | null | undefined;
}

export interface GrantRewardStudentState {
  readonly id: string;
  readonly exp: number;
  readonly level: number;
}

export interface GrantRewardOptions {
  readonly participant: GrantRewardParticipant;
  readonly studentState?: GrantRewardStudentState | null | undefined;
  readonly exp: number;
  readonly reason?: string | undefined;
  readonly timestamp?: number | undefined;
}

export interface RewardLogEntry {
  readonly id?: string | undefined;
  readonly sessionId: string;
  readonly participantId: string;
  readonly studentId: string | null;
  readonly exp: number;
  readonly reason: string;
  readonly persisted: boolean;
  readonly ts: number;
}

export interface StudentExpUpdate {
  readonly studentId: string;
  readonly exp: number;
  readonly level: number;
}

export interface GrantRewardResult {
  readonly success: true;
  readonly persisted: boolean;
  readonly expGranted: number;
  readonly studentId: string | null;
  readonly previousExp: number | null;
  readonly newTotalExp: number | null;
  readonly previousLevel: number | null;
  readonly newLevel: number | null;
  readonly leveledUp: boolean;
  readonly rewardLog: RewardLogEntry;
  readonly studentUpdate?: StudentExpUpdate | undefined;
}

export interface RewardStorageAdapter {
  saveReward(data: {
    rewardLog: RewardLogEntry;
    studentUpdate?: StudentExpUpdate | undefined;
  }): Promise<void> | void;
}

/**
 * Cấp thưởng EXP theo đúng nguyên tắc D6 & D8 của EduClass v2:
 * - Cấp danh tính `account` (có tài khoản/PIN): `persisted = true`, EXP và Level được cập nhật vĩnh viễn vào DB.
 * - Cấp danh tính `roster` hoặc `guest`: `persisted = false`, chỉ ghi vào reward_log của phiên, KHÔNG cộng vào DB của học sinh.
 */
export async function grantReward(
  options: GrantRewardOptions,
  storage?: RewardStorageAdapter
): Promise<GrantRewardResult> {
  const {
    participant,
    studentState,
    exp,
    reason = 'Thưởng từ giáo viên',
    timestamp = Date.now(),
  } = options;

  if (exp <= 0) {
    throw new Error(`Số lượng EXP thưởng phải là số dương lớn hơn 0 (nhận được: ${exp})`);
  }

  const isAccount = participant.identityLevel === 'account' && Boolean(participant.studentId);
  const studentId = isAccount ? participant.studentId! : null;

  let previousExp: number | null = null;
  let newTotalExp: number | null = null;
  let previousLevel: number | null = null;
  let newLevel: number | null = null;
  let leveledUp = false;
  let studentUpdate: StudentExpUpdate | undefined = undefined;

  if (isAccount && studentId) {
    previousExp = studentState?.exp ?? 0;
    previousLevel = studentState?.level ?? 1;
    newTotalExp = previousExp + exp;
    newLevel = calculateLevel(newTotalExp);
    leveledUp = newLevel > previousLevel;
    studentUpdate = {
      studentId,
      exp: newTotalExp,
      level: newLevel,
    };
  }

  const rewardLog: RewardLogEntry = {
    sessionId: participant.sessionId,
    participantId: participant.id,
    studentId,
    exp,
    reason,
    persisted: isAccount,
    ts: timestamp,
  };

  if (storage) {
    await storage.saveReward({
      rewardLog,
      studentUpdate,
    });
  }

  return {
    success: true,
    persisted: isAccount,
    expGranted: exp,
    studentId,
    previousExp,
    newTotalExp,
    previousLevel,
    newLevel,
    leveledUp,
    rewardLog,
    studentUpdate,
  };
}

export const rewards = {
  grant: grantReward,
};
