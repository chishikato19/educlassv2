import React from 'react';
import { AssignmentTeacherPanel } from '@educlass/activity-assignment-hub';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component riêng biệt cho Thu - phát bài tập (Assignment Hub)
 */
const AssignmentHubHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <AssignmentTeacherPanel
      runId={runId}
      state={state as Parameters<typeof AssignmentTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const assignmentHubPlugin: ActivityHostPlugin = {
  id: 'assignment-hub',
  name: 'Thu - phát bài tập',
  icon: '📁',
  description: 'Mở cổng thu bài tập của học sinh, tải tài liệu phát và xem trước bài nộp trực tiếp',
  component: AssignmentHubHostComponent,
};
