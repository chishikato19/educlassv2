import React from 'react';
import { CircuitTeacherPanel } from '@educlass/activity-circuit-race';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho hoạt động Đường Đua Tri Thức
 */
const CircuitRaceHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <CircuitTeacherPanel
      runId={runId}
      state={state as Parameters<typeof CircuitTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const circuitRacePlugin: ActivityHostPlugin = {
  id: 'circuit-race',
  name: 'Đường Đua Tri Thức',
  icon: '🏎️',
  description: 'Trò chơi đua cờ đường đua gamification tương tác thời gian thực với thẻ bổ trợ và xúc xắc',
  component: CircuitRaceHostComponent,
};
