import React from 'react';
import { VolleyballTeacherPanel } from '@educlass/activity-volleyball-tournament';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho Giải Đấu Bóng Chuyền (thử nghiệm)
 */
const VolleyballTournamentHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <VolleyballTeacherPanel
      runId={runId}
      state={state as Parameters<typeof VolleyballTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const volleyballTournamentPlugin: ActivityHostPlugin = {
  id: 'volleyball-tournament',
  name: 'Đấu Bóng Chuyền (thử nghiệm)',
  icon: '🏐',
  description:
    'Thi đấu vòng bảng và bắt cặp xếp hạng 4 Cúp phân tầng theo thể thức bóng chuyền chuyên nghiệp',
  component: VolleyballTournamentHostComponent,
};
