import { describe, expect, it, vi } from 'vitest';
import {
  grantReward,
  rewards,
  type GrantRewardParticipant,
  type GrantRewardStudentState,
  type RewardStorageAdapter,
} from '../rewards/grant.js';

describe('Reward Grant Logic (core/rewards.grant - Task 1.9)', () => {
  it('tier 1: "account" identity — grants and persists EXP to student, updates level', async () => {
    const participant: GrantRewardParticipant = {
      id: 'p_acc',
      sessionId: 'sess_1',
      identityLevel: 'account',
      studentId: 'st_1',
    };

    const studentState: GrantRewardStudentState = {
      id: 'st_1',
      exp: 30,
      level: 1,
    };

    const mockStorage: RewardStorageAdapter = {
      saveReward: vi.fn().mockResolvedValue(undefined),
    };

    // Thưởng 25 EXP -> tổng 55 EXP -> lên Level 2!
    const result = await rewards.grant(
      {
        participant,
        studentState,
        exp: 25,
        reason: 'Trả lời nhanh và đúng',
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.expGranted).toBe(25);
    expect(result.studentId).toBe('st_1');
    expect(result.previousExp).toBe(30);
    expect(result.newTotalExp).toBe(55);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(true);

    // Kiểm tra rewardLog
    expect(result.rewardLog).toEqual({
      sessionId: 'sess_1',
      participantId: 'p_acc',
      studentId: 'st_1',
      exp: 25,
      reason: 'Trả lời nhanh và đúng',
      persisted: true,
      ts: expect.any(Number),
    });

    // Kiểm tra studentUpdate
    expect(result.studentUpdate).toEqual({
      studentId: 'st_1',
      exp: 55,
      level: 2,
    });

    // Kiểm tra storage adapter được gọi với transaction data
    expect(mockStorage.saveReward).toHaveBeenCalledWith({
      rewardLog: result.rewardLog,
      studentUpdate: result.studentUpdate,
    });
  });

  it('tier 2: "roster" identity — records to reward_log with persisted=false, DOES NOT update student EXP', async () => {
    const participant: GrantRewardParticipant = {
      id: 'p_roster',
      sessionId: 'sess_1',
      identityLevel: 'roster',
      studentId: 'st_roster_1', // Có liên kết với danh sách lớp nhưng không có mật khẩu/PIN (D6)
    };

    const mockStorage: RewardStorageAdapter = {
      saveReward: vi.fn().mockResolvedValue(undefined),
    };

    const result = await grantReward(
      {
        participant,
        exp: 50,
        reason: 'Hăng hái phát biểu',
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.persisted).toBe(false);
    expect(result.expGranted).toBe(50);
    expect(result.studentId).toBeNull();
    expect(result.previousExp).toBeNull();
    expect(result.newTotalExp).toBeNull();
    expect(result.previousLevel).toBeNull();
    expect(result.newLevel).toBeNull();
    expect(result.leveledUp).toBe(false);
    expect(result.studentUpdate).toBeUndefined();

    // rewardLog vẫn được ghi nhận trong phiên
    expect(result.rewardLog).toEqual({
      sessionId: 'sess_1',
      participantId: 'p_roster',
      studentId: null,
      exp: 50,
      reason: 'Hăng hái phát biểu',
      persisted: false,
      ts: expect.any(Number),
    });

    expect(mockStorage.saveReward).toHaveBeenCalledWith({
      rewardLog: result.rewardLog,
      studentUpdate: undefined,
    });
  });

  it('tier 3: "guest" identity — records to reward_log with persisted=false, NO student record', async () => {
    const participant: GrantRewardParticipant = {
      id: 'p_guest',
      sessionId: 'sess_1',
      identityLevel: 'guest',
      studentId: null,
    };

    const mockStorage: RewardStorageAdapter = {
      saveReward: vi.fn().mockResolvedValue(undefined),
    };

    const result = await grantReward(
      {
        participant,
        exp: 15,
        reason: 'Tham gia trò chơi',
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.persisted).toBe(false);
    expect(result.expGranted).toBe(15);
    expect(result.studentId).toBeNull();
    expect(result.newTotalExp).toBeNull();
    expect(result.leveledUp).toBe(false);
    expect(result.studentUpdate).toBeUndefined();

    expect(result.rewardLog.persisted).toBe(false);
    expect(result.rewardLog.studentId).toBeNull();

    expect(mockStorage.saveReward).toHaveBeenCalledWith({
      rewardLog: result.rewardLog,
      studentUpdate: undefined,
    });
  });

  it('rejects invalid exp amounts (<= 0)', async () => {
    const participant: GrantRewardParticipant = {
      id: 'p_1',
      sessionId: 'sess_1',
      identityLevel: 'account',
      studentId: 'st_1',
    };

    await expect(
      grantReward({
        participant,
        exp: 0,
      })
    ).rejects.toThrow(/lớn hơn 0/);

    await expect(
      grantReward({
        participant,
        exp: -10,
      })
    ).rejects.toThrow(/lớn hơn 0/);
  });
});
