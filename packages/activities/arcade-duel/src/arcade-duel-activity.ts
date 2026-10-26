import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  ArcadeDuelConfigSchema,
  ArcadeDuelResultSchema,
  ArcadeDuelStateSchema,
  type ArcadeDuelConfig,
  type ArcadeDuelResult,
  type ArcadeDuelState,
} from './arcade-duel-schemas.js';
import {
  advanceToNextSyncQuestion,
  handleOptionSelection,
  handleUsePowerUp,
  initArcadeDuelState,
} from './arcade-duel-logic.js';

export const ArcadeDuelActivity: ActivityDefinition<
  ArcadeDuelConfig,
  ArcadeDuelState,
  ArcadeDuelResult
> = {
  id: 'arcade-duel',
  name: 'Đối Kháng 1vs1',
  version: 1,
  icon: '⚔️',
  description:
    'Đấu trường 1-1 trên màn hình GV với 2 chế độ (cùng trả lời / tốc độ), bàn phím chia đôi và hệ thống vật phẩm',
  capabilities: ['screen'],
  rewardTriggers: ['win', 'draw', 'participation'],
  configSchema: ArcadeDuelConfigSchema,
  stateSchema: ArcadeDuelStateSchema,
  resultSchema: ArcadeDuelResultSchema,

  server: {
    onStart(_ctx: ActivityContext, cfg: ArcadeDuelConfig): ArcadeDuelState {
      return initArcadeDuelState(cfg);
    },

    onStudentIntent(
      _ctx: ActivityContext,
      st: ArcadeDuelState,
      _participantId: string,
      _intent: unknown
    ): ArcadeDuelState | ActivityReject {
      // Học sinh gửi cổ vũ
      return st;
    },

    onTeacherIntent(
      _ctx: ActivityContext,
      st: ArcadeDuelState,
      intent: unknown
    ): ArcadeDuelState {
      const parsed = intent as {
        type: string;
        teamId?: 'blue' | 'red';
        optionIndex?: number;
      };

      if (parsed.type === 'SELECT_OPTION' && parsed.teamId && parsed.optionIndex !== undefined) {
        return handleOptionSelection(st, parsed.teamId, parsed.optionIndex);
      }

      if (parsed.type === 'USE_POWERUP' && parsed.teamId) {
        return handleUsePowerUp(st, parsed.teamId);
      }

      if (parsed.type === 'NEXT_SYNC_QUESTION') {
        return advanceToNextSyncQuestion(st);
      }

      return st;
    },

    onEnd(_ctx: ActivityContext, st: ArcadeDuelState): ArcadeDuelResult[] {
      const winner = st.winnerTeamId ?? 'draw';
      return [
        {
          winnerTeamId: winner,
          blueScore: st.bluePlayer.score,
          redScore: st.redPlayer.score,
          totalQuestions: st.totalQuestions,
          durationSeconds: Math.round((Date.now() - st.questionStartedAt) / 1000),
        },
      ];
    },
  },
};
