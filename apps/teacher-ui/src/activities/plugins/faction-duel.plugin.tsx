import React from 'react';
import { FactionDuelTeacherPanel } from '@educlass/activity-faction-duel';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho Đại Chiến Xanh Đỏ (thử nghiệm)
 */
const FactionDuelHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <FactionDuelTeacherPanel
      runId={runId}
      state={state as Parameters<typeof FactionDuelTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const factionDuelPlugin: ActivityHostPlugin = {
  id: 'faction-duel',
  name: 'Đại Chiến Xanh Đỏ (thử nghiệm)',
  icon: '⚔️',
  description: 'Đại chiến chia 2 phe Xanh - Đỏ cân bằng theo Elo, cơ chế 15s chọn đối thủ và tính điểm trọng số lật kèo',
  component: FactionDuelHostComponent,
};
