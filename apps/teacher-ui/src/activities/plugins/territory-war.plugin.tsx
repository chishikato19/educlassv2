import React from 'react';
import { TerritoryTeacherPanel } from '@educlass/activity-territory-war';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho hoạt động Đại Chiến Lãnh Thổ
 */
const TerritoryWarHostComponent: React.FC<ActivityHostProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  return (
    <TerritoryTeacherPanel
      runId={runId}
      state={state as Parameters<typeof TerritoryTeacherPanel>[0]['state']}
      onSendIntent={onSendIntent}
      onEndActivity={onEndActivity}
    />
  );
};

export const territoryWarPlugin: ActivityHostPlugin = {
  id: 'territory-war',
  name: 'Đại Chiến Lãnh Thổ',
  icon: '🏰',
  description: 'Tranh đoạt lãnh thổ chiến thuật chia 2 phe Xanh - Đỏ thời gian thực với bản đồ lâu đài và tháp canh',
  component: TerritoryWarHostComponent,
};
