import React from 'react';
import {
  PdfPresenterTeacherPanel,
  type PdfPresenterState,
  type PdfPresenterTeacherIntent,
} from '@educlass/activity-pdf-presenter';
import type { ActivityHostPlugin, ActivityHostProps } from '../types.js';

/**
 * Host Component cho Chiếu & Chữa bài PDF/Word (Mô hình A: Cắt dãn khoảng trống)
 */
const PdfPresenterHostComponent: React.FC<ActivityHostProps> = ({
  state,
  onSendIntent,
}) => {
  return (
    <PdfPresenterTeacherPanel
      state={state as PdfPresenterState}
      onSendIntent={(intent) => onSendIntent(intent as PdfPresenterTeacherIntent)}
    />
  );
};

export const pdfPresenterPlugin: ActivityHostPlugin = {
  id: 'pdf-presenter',
  name: 'Chiếu & Chữa bài PDF/Word',
  icon: '📄',
  description:
    'Chiếu tài liệu, chèn khoảng trống sửa bài (Mô hình A), vẽ lên đề bài và phát sóng đồng bộ cho học sinh',
  component: PdfPresenterHostComponent,
};
