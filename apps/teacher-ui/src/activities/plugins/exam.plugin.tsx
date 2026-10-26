import React from 'react';
import { ExamTeacherPanel } from '@educlass/activity-exam';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component riêng biệt cho Kỳ thi (Exam)
 */
const ExamHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <ExamTeacherPanel
      runId={runId}
      state={state as Parameters<typeof ExamTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const examPlugin: ActivityHostPlugin = {
  id: 'exam',
  name: 'Kỳ thi Trực tiếp',
  icon: '📝',
  description: 'Tổ chức kỳ thi với đồng hồ đếm ngược, xáo đề, giám sát làm bài và xuất Excel',
  component: ExamHostComponent,
};
