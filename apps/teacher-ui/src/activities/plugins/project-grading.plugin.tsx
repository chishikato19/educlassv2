import React from 'react';
import { ProjectGradingTeacherPanel } from '@educlass/activity-project-grading';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho hoạt động Chấm điểm Dự án đa chiều
 */
const ProjectGradingHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <ProjectGradingTeacherPanel
      runId={runId}
      state={state as Parameters<typeof ProjectGradingTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent as Parameters<typeof ProjectGradingTeacherPanel>[0]['onSendIntent']}
      onEndActivity={onEndActivity}
    />
  );
};

export const projectGradingPlugin: ActivityHostPlugin = {
  id: 'project-grading',
  name: 'Chấm Điểm Dự Án',
  icon: '📋',
  description: 'Đánh giá dự án đa chiều 4 cột điểm: Tự chấm, Tổ chấm, Chéo nhóm và Giáo viên',
  component: ProjectGradingHostComponent,
};
