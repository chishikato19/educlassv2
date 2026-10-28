import React from 'react';
import { SwissDuelTeacherPanel } from '@educlass/activity-swiss-duel';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component riêng biệt cho Đấu Cờ Thụy Sỹ (Swiss Duel)
 */
const SwissDuelHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <SwissDuelTeacherPanel
      runId={runId}
      state={state as Parameters<typeof SwissDuelTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const swissDuelPlugin: ActivityHostPlugin = {
  id: 'swiss-duel',
  name: 'Đấu Cờ Thụy Sỹ',
  icon: '♟️',
  description:
    'Đấu trí đối kháng 1v1 theo thể thức Thụy Sỹ cổ điển: so tài 2 câu/vòng, thắng 2đ, hòa 1đ',
  component: SwissDuelHostComponent,
};
