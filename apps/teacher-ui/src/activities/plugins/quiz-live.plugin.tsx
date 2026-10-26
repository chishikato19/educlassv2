import React from 'react';
import { QuizLiveTeacherPanel } from '@educlass/activity-quiz-live';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component riêng biệt cho Quiz Live (Kahoot & Quizizz)
 */
const QuizLiveHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <QuizLiveTeacherPanel
      runId={runId}
      state={state as Parameters<typeof QuizLiveTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const quizLivePlugin: ActivityHostPlugin = {
  id: 'quiz-live',
  name: 'Quiz Live (Kahoot & Quizizz)',
  icon: '🎮',
  description: 'Trò chơi trắc nghiệm trực tiếp dạng Kahoot hoặc Quizizz với âm thanh và bảng xếp hạng',
  component: QuizLiveHostComponent,
};
