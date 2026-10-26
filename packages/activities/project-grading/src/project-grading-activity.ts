import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type ProjectGradingConfig,
  ProjectGradingConfigSchema,
  ProjectGradingStateSchema,
  type ProjectGradingState,
  type ProjectGradingStudentResult,
  ProjectGradingStudentResultSchema,
  ProjectGradingStudentIntentSchema,
  ProjectGradingTeacherIntentSchema,
} from '@educlass/protocol';
import {
  calculateAllFinalScores,
  findGroupByParticipantId,
  isParticipantLeader,
  validateScore,
} from './project-grading-logic.js';

export const ProjectGradingActivity: ActivityDefinition<
  ProjectGradingConfig,
  ProjectGradingState,
  ProjectGradingStudentResult
> = {
  id: 'project-grading',
  name: 'Chấm Điểm Dự Án',
  version: 1,
  icon: '📋',
  description: 'Đánh giá dự án đa chiều 4 cột điểm: Tự chấm, Tổ chấm, Chéo nhóm và Giáo viên',
  capabilities: ['screen'],
  rewardTriggers: ['participation', 'finish', 'top3'],
  configSchema: ProjectGradingConfigSchema,
  stateSchema: ProjectGradingStateSchema,
  resultSchema: ProjectGradingStudentResultSchema,

  server: {
    /**
     * Khởi tạo trạng thái ban đầu của hoạt động chấm điểm dự án
     */
    onStart(_ctx: ActivityContext, cfg: ProjectGradingConfig): ProjectGradingState {
      return {
        status: 'grading',
        config: {
          title: cfg.title || 'Chấm điểm Dự án',
          maxScore: cfg.maxScore || 10,
          stepScore: cfg.stepScore || 0.1,
          weights: {
            self: cfg.weights?.self ?? 10,
            teamMember: cfg.weights?.teamMember ?? 20,
            crossTeam: cfg.weights?.crossTeam ?? 20,
            teacher: cfg.weights?.teacher ?? 50,
          },
          groups: cfg.groups || [],
          allowFeedbackComment: cfg.allowFeedbackComment ?? true,
        },
        selfGrades: {},
        teamMemberGrades: {},
        crossTeamGrades: {},
        teacherGroupGrades: {},
        teacherStudentGrades: {},
      };
    },

    /**
     * Xử lý các intent nhập điểm từ phía Học sinh và Nhóm trưởng
     */
    onStudentIntent(
      ctx: ActivityContext,
      st: ProjectGradingState,
      participantId: string,
      intent: unknown
    ): ProjectGradingState | ActivityReject {
      // 1. Kiểm tra trạng thái phiên chấm
      if (st.status === 'frozen' || st.status === 'ended') {
        return {
          ok: false,
          reason: 'Phiên chấm điểm hiện đang tạm khóa hoặc đã kết thúc',
          code: 'GRADING_LOCKED',
        };
      }

      // 2. Parse intent hợp lệ
      const parsed = ProjectGradingStudentIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Dữ liệu gửi lên không đúng định dạng',
          code: 'INVALID_INTENT',
        };
      }

      const intentData = parsed.data;
      const now = ctx.now();
      const maxScore = st.config.maxScore;

      // Xử lý nhánh [1]: Tự chấm điểm cá nhân
      if (intentData.type === 'submit_self_grade') {
        if (!validateScore(intentData.score, maxScore)) {
          return {
            ok: false,
            reason: `Điểm số không hợp lệ (phải từ 0 đến ${maxScore})`,
            code: 'INVALID_SCORE',
          };
        }

        // Thưởng EXP tham gia tự đánh giá nếu là lần đầu gửi
        const isFirstSelfGrade = !st.selfGrades[participantId];
        if (isFirstSelfGrade) {
          void ctx.grantReward(participantId, 'participation', 5);
        }

        return {
          ...st,
          selfGrades: {
            ...st.selfGrades,
            [participantId]: {
              score: intentData.score,
              comment: intentData.comment,
              updatedAt: now,
            },
          },
        };
      }

      // Xử lý nhánh [2]: Nhóm trưởng chấm điểm thành viên trong nhóm
      if (intentData.type === 'submit_team_member_grade') {
        if (!validateScore(intentData.score, maxScore)) {
          return {
            ok: false,
            reason: `Điểm số không hợp lệ (phải từ 0 đến ${maxScore})`,
            code: 'INVALID_SCORE',
          };
        }

        const myGroup = findGroupByParticipantId(st.config.groups, participantId);
        if (!myGroup || !isParticipantLeader(myGroup, participantId)) {
          return {
            ok: false,
            reason: 'Chỉ nhóm trưởng mới có quyền chấm điểm thành viên nhóm',
            code: 'NOT_A_LEADER',
          };
        }

        // Kiểm tra thành viên mục tiêu có trong nhóm không
        const isMemberInGroup =
          myGroup.memberParticipantIds.includes(intentData.memberParticipantId) ||
          myGroup.leaderParticipantId === intentData.memberParticipantId;

        if (!isMemberInGroup) {
          return {
            ok: false,
            reason: 'Học sinh được chấm không thuộc nhóm của bạn',
            code: 'STUDENT_NOT_IN_GROUP',
          };
        }

        const currentLeaderGrades = st.teamMemberGrades[participantId] || {};
        return {
          ...st,
          teamMemberGrades: {
            ...st.teamMemberGrades,
            [participantId]: {
              ...currentLeaderGrades,
              [intentData.memberParticipantId]: {
                score: intentData.score,
                comment: intentData.comment,
                updatedAt: now,
              },
            },
          },
        };
      }

      // Xử lý nhánh [3]: Nhóm trưởng chấm chéo nhóm khác
      if (intentData.type === 'submit_cross_team_grade') {
        if (!validateScore(intentData.score, maxScore)) {
          return {
            ok: false,
            reason: `Điểm số không hợp lệ (phải từ 0 đến ${maxScore})`,
            code: 'INVALID_SCORE',
          };
        }

        const myGroup = findGroupByParticipantId(st.config.groups, participantId);
        if (!myGroup || !isParticipantLeader(myGroup, participantId)) {
          return {
            ok: false,
            reason: 'Chỉ nhóm trưởng mới có quyền chấm chéo nhóm bạn',
            code: 'NOT_A_LEADER',
          };
        }

        // Không được tự chấm chéo nhóm của chính mình
        if (myGroup.id === intentData.targetGroupId) {
          return {
            ok: false,
            reason: 'Nhóm trưởng không thể tự chấm chéo nhóm của mình',
            code: 'CANNOT_GRADE_OWN_GROUP',
          };
        }

        // Kiểm tra nhóm mục tiêu có tồn tại
        const targetGroup = st.config.groups.find((g) => g.id === intentData.targetGroupId);
        if (!targetGroup) {
          return {
            ok: false,
            reason: 'Nhóm mục tiêu không tồn tại trong cấu hình',
            code: 'GROUP_NOT_FOUND',
          };
        }

        const currentCrossGrades = st.crossTeamGrades[participantId] || {};
        return {
          ...st,
          crossTeamGrades: {
            ...st.crossTeamGrades,
            [participantId]: {
              ...currentCrossGrades,
              [intentData.targetGroupId]: {
                score: intentData.score,
                comment: intentData.comment,
                updatedAt: now,
              },
            },
          },
        };
      }

      return st;
    },

    /**
     * Xử lý các intent từ Giáo viên (nhập điểm GV, khóa / mở chấm)
     */
    onTeacherIntent(
      ctx: ActivityContext,
      st: ProjectGradingState,
      intent: unknown
    ): ProjectGradingState {
      const parsed = ProjectGradingTeacherIntentSchema.safeParse(intent);
      if (!parsed.success) return st;

      const intentData = parsed.data;
      const now = ctx.now();

      // [1] Thay đổi trạng thái khóa/mở chấm
      if (intentData.type === 'set_grading_status') {
        return {
          ...st,
          status: intentData.status,
        };
      }

      // [2] Giáo viên nhập điểm
      if (intentData.type === 'submit_teacher_grade') {
        if (!validateScore(intentData.score, st.config.maxScore)) {
          return st;
        }

        if (intentData.targetType === 'group') {
          return {
            ...st,
            teacherGroupGrades: {
              ...st.teacherGroupGrades,
              [intentData.targetId]: {
                score: intentData.score,
                comment: intentData.comment,
                updatedAt: now,
              },
            },
          };
        }

        if (intentData.targetType === 'student') {
          return {
            ...st,
            teacherStudentGrades: {
              ...st.teacherStudentGrades,
              [intentData.targetId]: {
                score: intentData.score,
                comment: intentData.comment,
                updatedAt: now,
              },
            },
          };
        }
      }

      return st;
    },

    /**
     * Tổng hợp kết quả xếp hạng và khen thưởng khi kết thúc hoạt động
     */
    onEnd(
      ctx: ActivityContext,
      st: ProjectGradingState
    ): ProjectGradingStudentResult[] {
      const results = calculateAllFinalScores(st);

      // Trao thưởng EXP khi kết thúc
      for (const res of results) {
        // Thưởng hoàn thành (finish) nếu học sinh đã tham gia tự chấm
        if (res.selfScore !== null) {
          void ctx.grantReward(res.participantId, 'finish', 10);
        }

        // Thưởng Top 3 chung cuộc
        if (res.rank === 1) {
          void ctx.grantReward(res.participantId, 'top3', 15);
        } else if (res.rank === 2) {
          void ctx.grantReward(res.participantId, 'top3', 10);
        } else if (res.rank === 3) {
          void ctx.grantReward(res.participantId, 'top3', 5);
        }
      }

      return results;
    },
  },
};
