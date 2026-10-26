import React from 'react';
import {
  ArcadeDuelTeacherPanel,
  type ArcadeDuelConfig,
  type ArcadeDuelState,
} from '@educlass/activity-arcade-duel';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho hoạt động Đối Kháng 1vs1
 */
const ArcadeDuelHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <ArcadeDuelTeacherPanel
      runId={runId}
      initialState={state as ArcadeDuelState}
      config={state ? (state as { config?: ArcadeDuelConfig }).config : undefined}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const arcadeDuelPlugin: ActivityHostPlugin = {
  id: 'arcade-duel',
  name: 'Đối Kháng 1vs1',
  icon: '⚔️',
  description:
    'Đấu trường 1-1 trên màn hình GV với 2 chế độ (cùng trả lời / tốc độ), bàn phím chia đôi và hệ thống vật phẩm',
  component: ArcadeDuelHostComponent,
};
