import React from 'react';
import { QuickPollTeacherPanel } from '@educlass/activity-quick-poll';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component riêng biệt cho Bình chọn nhanh (Quick Poll)
 */
const QuickPollHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <QuickPollTeacherPanel
      runId={runId}
      state={state as Parameters<typeof QuickPollTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const quickPollPlugin: ActivityHostPlugin = {
  id: 'quick-poll',
  name: 'Bình chọn nhanh',
  icon: '📊',
  description: 'Thăm dò ý kiến và biểu quyết thời gian thực với biểu đồ trực quan',
  component: QuickPollHostComponent,
};
