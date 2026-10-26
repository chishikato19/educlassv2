import { z } from 'zod';
import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';

/**
 * Cấu hình khi giáo viên khởi chạy Bình Chọn Nhanh
 */
export const QuickPollConfigSchema = z.object({
  question: z.string().min(1, 'Vui lòng nhập câu hỏi'),
  options: z.array(z.string().min(1)).min(2, 'Cần ít nhất 2 phương án lựa chọn'),
  allowMultiple: z.boolean().optional().default(false),
});
export type QuickPollConfig = z.infer<typeof QuickPollConfigSchema>;

/**
 * Trạng thái thời gian thực được đồng bộ giữa server và các clients
 */
export const QuickPollStateSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  votes: z.record(z.string(), z.array(z.number())), // participantId -> mảng các chỉ số lựa chọn
  allowMultiple: z.boolean(),
  isLocked: z.boolean(),
});
export type QuickPollState = z.infer<typeof QuickPollStateSchema>;

/**
 * Kết quả của từng người tham gia khi kết thúc lượt bình chọn
 */
export const QuickPollResultSchema = z.object({
  participantId: z.string(),
  choices: z.array(z.number()),
  points: z.number().default(1),
});
export type QuickPollResult = z.infer<typeof QuickPollResultSchema>;

/**
 * Activity Module Server Implementation
 */
export const QuickPollActivity: ActivityDefinition<
  QuickPollConfig,
  QuickPollState,
  QuickPollResult
> = {
  id: 'quick-poll',
  name: 'Bình Chọn Nhanh',
  version: 1,
  icon: '📊',
  description: 'Thăm dò ý kiến và biểu quyết thời gian thực trong lớp học',
  capabilities: ['screen'],
  rewardTriggers: ['participation', 'finish'],
  configSchema: QuickPollConfigSchema,
  stateSchema: QuickPollStateSchema,
  resultSchema: QuickPollResultSchema,

  server: {
    onStart(_ctx: ActivityContext, cfg: QuickPollConfig): QuickPollState {
      return {
        question: cfg.question,
        options: [...cfg.options],
        votes: {},
        allowMultiple: Boolean(cfg.allowMultiple),
        isLocked: false,
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: QuickPollState,
      participantId: string,
      intent: unknown
    ): QuickPollState | ActivityReject {
      if (st.isLocked) {
        return {
          ok: false,
          reason: 'Bình chọn đã bị khóa bởi giáo viên',
          code: 'POLL_LOCKED',
        };
      }

      const voteIntentSchema = z.object({
        type: z.literal('vote'),
        choices: z.array(z.number().int().nonnegative()),
      });

      const parsed = voteIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Ý định bình chọn không hợp lệ',
          code: 'INVALID_INTENT',
        };
      }

      const { choices } = parsed.data;

      // Kiểm tra chỉ số phương án hợp lệ
      const validChoices = choices.filter(c => c >= 0 && c < st.options.length);
      if (validChoices.length === 0) {
        return {
          ok: false,
          reason: 'Lựa chọn không hợp lệ',
          code: 'INVALID_CHOICE',
        };
      }

      const finalChoices = st.allowMultiple ? validChoices : [validChoices[0]!];

      // Thưởng EXP chuyên cần tham gia nếu là lần đầu bình chọn
      const isFirstVote = !st.votes[participantId];
      if (isFirstVote) {
        void ctx.grantReward(participantId, 'participation', 5);
      }

      return {
        ...st,
        votes: {
          ...st.votes,
          [participantId]: finalChoices,
        },
      };
    },

    onTeacherIntent(
      _ctx: ActivityContext,
      st: QuickPollState,
      intent: unknown
    ): QuickPollState {
      const teacherIntentSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('toggle_lock') }),
        z.object({ type: z.literal('reset_votes') }),
      ]);

      const parsed = teacherIntentSchema.safeParse(intent);
      if (!parsed.success) return st;

      if (parsed.data.type === 'toggle_lock') {
        return {
          ...st,
          isLocked: !st.isLocked,
        };
      }

      if (parsed.data.type === 'reset_votes') {
        return {
          ...st,
          votes: {},
        };
      }

      return st;
    },

    onEnd(_ctx: ActivityContext, st: QuickPollState): QuickPollResult[] {
      return Object.entries(st.votes).map(([participantId, choices]) => ({
        participantId,
        choices,
        points: choices.length > 0 ? 1 : 0,
      }));
    },
  },
};
