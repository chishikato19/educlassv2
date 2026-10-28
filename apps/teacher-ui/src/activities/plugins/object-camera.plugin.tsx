import React from 'react';
import {
  ObjectCameraTeacherPanel,
  type ObjectCameraState,
  type ObjectCameraTeacherIntent,
} from '@educlass/activity-object-camera';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho Tiện ích Camera vật thể
 */
const ObjectCameraHostComponent: React.FC<ActivityHostProps> = ({ state, onSendIntent }) => {
  return (
    <ObjectCameraTeacherPanel
      state={state as ObjectCameraState}
      onSendIntent={intent => onSendIntent(intent as ObjectCameraTeacherIntent)}
    />
  );
};

export const objectCameraPlugin: ActivityHostPlugin = {
  id: 'object-camera',
  name: 'Camera vật thể',
  icon: '📷',
  description:
    'Biến điện thoại thành máy chiếu vật thể thông minh. Quét mã QR chụp bài, xoay cắt zoom, sửa bài trực tiếp và đồng bộ tới học sinh & máy chiếu.',
  component: ObjectCameraHostComponent,
};
