import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type AssignmentConfig,
  AssignmentConfigSchema,
  AssignmentResultSchema,
  type AssignmentResult,
  type AssignmentState,
  AssignmentStateSchema,
  AssignmentStudentIntentSchema,
  AssignmentTeacherIntentSchema,
} from './assignment-schemas.js';

export const AssignmentHubActivity: ActivityDefinition<
  AssignmentConfig,
  AssignmentState,
  AssignmentResult
> = {
  id: 'assignment-hub',
  name: 'Thu - phát bài tập',
  version: 1,
  icon: '📁',
  description: 'Thu bài làm học sinh lưu vào thư mục máy tính và phát tài liệu trực tiếp',
  capabilities: ['files'],
  rewardTriggers: ['submit_assignment', 'early_submit'],
  configSchema: AssignmentConfigSchema,
  stateSchema: AssignmentStateSchema,
  resultSchema: AssignmentResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: AssignmentConfig): AssignmentState {
      const now = ctx.now();
      const deadlineAt = cfg.deadlineMinutes ? now + cfg.deadlineMinutes * 60 * 1000 : null;

      return {
        title: cfg.title || 'Thu - phát bài tập',
        instructions: cfg.instructions || '',
        targetDirectory: cfg.targetDirectory || '',
        materials: cfg.materials || [],
        allowedExtensions: cfg.allowedExtensions || [],
        maxFileSizeMb: cfg.maxFileSizeMb || 50,
        allowResubmit: cfg.allowResubmit ?? true,
        deadlineAt,
        isLocked: false,
        submissions: {},
        startedAt: now,
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: AssignmentState,
      participantId: string,
      intent: unknown
    ): AssignmentState | ActivityReject {
      const parsed = AssignmentStudentIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Dữ liệu thao tác không hợp lệ: ' + parsed.error.issues[0]?.message,
          code: 'BAD_INTENT',
        };
      }

      const action = parsed.data;

      if (action.type === 'submit_assignment') {
        // Kiểm tra xem cổng nộp bài có bị khóa không
        if (st.isLocked) {
          return {
            ok: false,
            reason: 'Cổng thu bài đã được giáo viên đóng. Không thể nộp thêm.',
            code: 'SUBMISSION_LOCKED',
          };
        }

        // Kiểm tra xem đã nộp trước đó và có cho nộp lại không
        const existing = st.submissions[participantId];
        if (existing && !st.allowResubmit) {
          return {
            ok: false,
            reason: 'Bạn đã nộp bài rồi và giáo viên không cho phép nộp lại.',
            code: 'RESUBMIT_DISALLOWED',
          };
        }

        // Kiểm tra hạn nộp
        const isLate = st.deadlineAt !== null && ctx.now() > st.deadlineAt;
        const sub = action.submission;

        // Cập nhật trạng thái bài nộp
        const updatedSubmissions = {
          ...st.submissions,
          [participantId]: {
            ...sub,
            participantId,
            status: isLate ? ('late' as const) : ('submitted' as const),
            submittedAt: ctx.now(),
          },
        };

        // Trao EXP thưởng nộp bài (chỉ trao khi nộp lần đầu để tránh cày điểm)
        if (!existing) {
          void ctx.grantReward(participantId, 'submit_assignment', 10);
          if (!isLate) {
            void ctx.grantReward(participantId, 'early_submit', 5);
          }
        }

        return {
          ...st,
          submissions: updatedSubmissions,
        };
      }

      return st;
    },

    onTeacherIntent(
      _ctx: ActivityContext,
      st: AssignmentState,
      intent: unknown
    ): AssignmentState {
      const parsed = AssignmentTeacherIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return st;
      }

      const action = parsed.data;

      switch (action.type) {
        case 'toggle_lock': {
          const nextLock = action.isLocked !== undefined ? action.isLocked : !st.isLocked;
          return {
            ...st,
            isLocked: nextLock,
          };
        }

        case 'add_material': {
          const exists = st.materials.some(m => m.id === action.material.id);
          const materials = exists
            ? st.materials.map(m => (m.id === action.material.id ? action.material : m))
            : [...st.materials, action.material];
          return {
            ...st,
            materials,
          };
        }

        case 'remove_material': {
          return {
            ...st,
            materials: st.materials.filter(m => m.id !== action.materialId),
          };
        }

        case 'update_target_directory': {
          return {
            ...st,
            targetDirectory: action.targetDirectory,
          };
        }

        case 'update_instructions': {
          return {
            ...st,
            instructions: action.instructions,
          };
        }

        default:
          return st;
      }
    },

    onEnd(
      _ctx: ActivityContext,
      st: AssignmentState
    ): AssignmentResult[] {
      const results: AssignmentResult[] = [];

      for (const [participantId, sub] of Object.entries(st.submissions)) {
        results.push({
          participantId,
          studentName: sub.studentName,
          submitted: true,
          fileName: sub.fileName,
          fileSize: sub.fileSize,
          submittedAt: sub.submittedAt,
          status: sub.status,
        });
      }

      return results;
    },
  },
};
