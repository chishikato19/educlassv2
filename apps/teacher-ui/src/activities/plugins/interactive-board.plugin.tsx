import React from 'react';
import { InteractiveBoardProjectorView } from '@educlass/activity-interactive-board';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho Bảng Tương Tác trên Màn Chiếu Lớp Học (Cửa sổ trình chiếu độc lập)
 */
const InteractiveBoardHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
}) => {
  return (
    <InteractiveBoardProjectorView
      runId={runId}
      state={state as Parameters<typeof InteractiveBoardProjectorView>[0]['state']}
      onSendIntent={onSendIntent as Parameters<typeof InteractiveBoardProjectorView>[0]['onSendIntent']}
    />
  );
};

export const interactiveBoardPlugin: ActivityHostPlugin = {
  id: 'interactive-board',
  name: 'Bảng Tương Tác (Màn Chiếu)',
  icon: '📌',
  description:
    'Màn chiếu cộng tác và triển lãm sản phẩm học tập: chữ, nét vẽ tay, hình ảnh, chấm điểm chéo và tiêu điểm chữa bài',
  component: InteractiveBoardHostComponent,
};

