import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import type { ProjectGradingConfig, ProjectGradingState } from '@educlass/protocol';
import { ProjectGradingActivity } from '../project-grading-activity.js';
import {
  calculateAllFinalScores,
  calculateGradingProgress,
  roundScore,
  validateScore,
} from '../project-grading-logic.js';

function createMockContext(): ActivityContext {
  return {
    sessionId: 'sess-1',
    runId: 'run-1',
    now: () => 1700000000000,
    rng: () => 0.5,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };
}

describe('ProjectGradingActivity Module', () => {
  const sampleConfig: ProjectGradingConfig = {
    title: 'Báo cáo Dự án STEM',
    maxScore: 10,
    stepScore: 0.1,
    weights: {
      self: 10,
      teamMember: 20,
      crossTeam: 20,
      teacher: 50,
    },
    groups: [
      {
        id: 'group-1',
        name: 'Nhóm 1',
        leaderParticipantId: 'hs-1',
        leaderDisplayName: 'Nguyễn Văn A',
        memberParticipantIds: ['hs-1', 'hs-2', 'hs-3'],
      },
      {
        id: 'group-2',
        name: 'Nhóm 2',
        leaderParticipantId: 'hs-4',
        leaderDisplayName: 'Trần Thị B',
        memberParticipantIds: ['hs-4', 'hs-5'],
      },
    ],
    allowFeedbackComment: true,
  };

  it('1. onStart khởi tạo state đúng cấu hình', () => {
    const ctx = createMockContext();
    const state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    expect(state.status).toBe('grading');
    expect(state.config.title).toBe('Báo cáo Dự án STEM');
    expect(state.config.groups.length).toBe(2);
    expect(state.selfGrades).toEqual({});
    expect(state.teamMemberGrades).toEqual({});
    expect(state.crossTeamGrades).toEqual({});
    expect(state.teacherGroupGrades).toEqual({});
  });

  it('2. Học sinh tự chấm điểm cá nhân (Cột 1)', () => {
    const ctx = createMockContext();
    let state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    // Học sinh 2 tự chấm 9.0
    const res = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-2', {
      type: 'submit_self_grade',
      score: 9.0,
      comment: 'Em đã hoàn thành tốt phần thiết kế slide',
    });

    expect('ok' in res).toBe(false);
    state = res as ProjectGradingState;
    expect(state.selfGrades['hs-2']).toBeDefined();
    expect(state.selfGrades['hs-2']?.score).toBe(9.0);
    expect(state.selfGrades['hs-2']?.comment).toBe('Em đã hoàn thành tốt phần thiết kế slide');
    expect(ctx.grantReward).toHaveBeenCalledWith('hs-2', 'participation', 5);

    // Chấm điểm không hợp lệ (> 10)
    const invalidRes = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-2', {
      type: 'submit_self_grade',
      score: 11.5,
    });
    expect('ok' in invalidRes && !invalidRes.ok).toBe(true);
  });

  it('3. Nhóm trưởng chấm điểm thành viên trong nhóm (Cột 2)', () => {
    const ctx = createMockContext();
    let state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    // hs-1 là nhóm trưởng Nhóm 1, chấm cho hs-2 8.5
    const res = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-1', {
      type: 'submit_team_member_grade',
      memberParticipantId: 'hs-2',
      score: 8.5,
      comment: 'Làm việc nhóm tích cực',
    });

    expect('ok' in res).toBe(false);
    state = res as ProjectGradingState;
    expect(state.teamMemberGrades['hs-1']?.['hs-2']?.score).toBe(8.5);

    // hs-2 KHÔNG PHẢI nhóm trưởng, cố tình chấm thành viên khác -> từ chối
    const nonLeaderRes = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-2', {
      type: 'submit_team_member_grade',
      memberParticipantId: 'hs-3',
      score: 9.0,
    });
    expect('ok' in nonLeaderRes && !nonLeaderRes.ok).toBe(true);
    if ('code' in nonLeaderRes) {
      expect(nonLeaderRes.code).toBe('NOT_A_LEADER');
    }
  });

  it('4. Nhóm trưởng chấm chéo nhóm khác (Cột 3)', () => {
    const ctx = createMockContext();
    let state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    // hs-1 (Nhóm 1) chấm chéo cho Nhóm 2 điểm 8.0
    const res = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-1', {
      type: 'submit_cross_team_grade',
      targetGroupId: 'group-2',
      score: 8.0,
      comment: 'Mô hình đẹp, thuyết trình rõ',
    });

    expect('ok' in res).toBe(false);
    state = res as ProjectGradingState;
    expect(state.crossTeamGrades['hs-1']?.['group-2']?.score).toBe(8.0);

    // Nhóm trưởng không được tự chấm chéo nhóm của mình
    const selfGroupRes = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-1', {
      type: 'submit_cross_team_grade',
      targetGroupId: 'group-1',
      score: 10.0,
    });
    expect('ok' in selfGroupRes && !selfGroupRes.ok).toBe(true);
    if ('code' in selfGroupRes) {
      expect(selfGroupRes.code).toBe('CANNOT_GRADE_OWN_GROUP');
    }
  });

  it('5. Giáo viên chấm điểm nhóm và điểm riêng (Cột 4) & khóa chấm', () => {
    const ctx = createMockContext();
    let state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    // GV chấm cho cả Nhóm 1 điểm 9.0
    state = ProjectGradingActivity.server.onTeacherIntent(ctx, state, {
      type: 'submit_teacher_grade',
      targetType: 'group',
      targetId: 'group-1',
      score: 9.0,
      comment: 'Ý tưởng sáng tạo',
    });
    expect(state.teacherGroupGrades['group-1']?.score).toBe(9.0);

    // GV chấm riêng cho hs-3 điểm 9.5 (ghi đè điểm nhóm)
    state = ProjectGradingActivity.server.onTeacherIntent(ctx, state, {
      type: 'submit_teacher_grade',
      targetType: 'student',
      targetId: 'hs-3',
      score: 9.5,
      comment: 'Code xuất sắc',
    });
    expect(state.teacherStudentGrades['hs-3']?.score).toBe(9.5);

    // GV khóa chấm điểm
    state = ProjectGradingActivity.server.onTeacherIntent(ctx, state, {
      type: 'set_grading_status',
      status: 'frozen',
    });
    expect(state.status).toBe('frozen');

    // Sau khi khóa, học sinh gửi điểm bị từ chối
    const rejected = ProjectGradingActivity.server.onStudentIntent(ctx, state, 'hs-1', {
      type: 'submit_self_grade',
      score: 8.0,
    });
    expect('ok' in rejected && !rejected.ok).toBe(true);
    if ('code' in rejected) {
      expect(rejected.code).toBe('GRADING_LOCKED');
    }
  });

  it('6. Tính toán điểm tổng kết theo trọng số và xếp hạng onEnd', () => {
    const ctx = createMockContext();
    let state = ProjectGradingActivity.server.onStart(ctx, sampleConfig);

    // [Cột 1] Tự chấm:
    // hs-2 tự chấm 10.0
    state = {
      ...state,
      selfGrades: {
        'hs-2': { score: 10.0, updatedAt: 1 },
        'hs-5': { score: 7.0, updatedAt: 1 },
      },
      // [Cột 2] Nhóm trưởng chấm:
      // hs-1 chấm hs-2: 9.0
      teamMemberGrades: {
        'hs-1': {
          'hs-2': { score: 9.0, updatedAt: 1 },
        },
      },
      // [Cột 3] Chấm chéo:
      // hs-4 (NT Nhóm 2) chấm Nhóm 1: 8.0
      crossTeamGrades: {
        'hs-4': {
          'group-1': { score: 8.0, updatedAt: 1 },
        },
      },
      // [Cột 4] Giáo viên chấm:
      // GV chấm Nhóm 1: 8.5
      teacherGroupGrades: {
        'group-1': { score: 8.5, updatedAt: 1 },
      },
    };

    // Kiểm tra tính toán điểm cho hs-2:
    // S1 = 10 (W1 = 10%) -> 1.0
    // S2 = 9 (W2 = 20%) -> 1.8
    // S3 = 8 (W3 = 20%) -> 1.6
    // S4 = 8.5 (W4 = 50%) -> 4.25
    // Final = 1.0 + 1.8 + 1.6 + 4.25 = 8.65
    const directResults = calculateAllFinalScores(state);
    expect(directResults.length).toBe(5);

    const results = ProjectGradingActivity.server.onEnd(ctx, state);
    const hs2Result = results.find((r) => r.participantId === 'hs-2');
    expect(hs2Result).toBeDefined();
    expect(hs2Result?.selfScore).toBe(10.0);
    expect(hs2Result?.teamMemberScore).toBe(9.0);
    expect(hs2Result?.crossTeamScore).toBe(8.0);
    expect(hs2Result?.teacherScore).toBe(8.5);
    expect(hs2Result?.finalScore).toBe(8.65);

    // Xếp hạng: hs-2 đứng top 1
    expect(results[0]?.participantId).toBe('hs-2');
    expect(results[0]?.rank).toBe(1);

    // Trao thưởng Top 1: 15 EXP
    expect(ctx.grantReward).toHaveBeenCalledWith('hs-2', 'top3', 15);
    expect(ctx.grantReward).toHaveBeenCalledWith('hs-2', 'finish', 10);
  });

  it('7. Thống kê tiến độ chấm điểm calculateGradingProgress', () => {
    let state = ProjectGradingActivity.server.onStart(createMockContext(), sampleConfig);
    state = {
      ...state,
      selfGrades: {
        'hs-1': { score: 9.0, updatedAt: 1 },
      },
    };
    const progress = calculateGradingProgress(state);
    expect(progress.totalStudents).toBe(5);
    expect(progress.selfGrading.submitted).toBe(1);
    expect(progress.selfGrading.percentage).toBe(20);
  });

  it('8. Helper roundScore và validateScore', () => {
    expect(roundScore(8.66666)).toBe(8.67);
    expect(roundScore(9.10001)).toBe(9.1);
    expect(validateScore(10, 10)).toBe(true);
    expect(validateScore(0, 10)).toBe(true);
    expect(validateScore(-1, 10)).toBe(false);
    expect(validateScore(10.1, 10)).toBe(false);
  });
});
