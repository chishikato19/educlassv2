import React from 'react';
import { UI_COLORS, UI_RADII, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

export type BannerType = 'warning' | 'error' | 'info' | 'success';

export interface BannerProps {
  type?: BannerType | undefined;
  message: string;
  actionText?: string | undefined;
  onAction?: (() => void) | undefined;
}

export const Banner: React.FC<BannerProps> = ({
  type = 'warning',
  message,
  actionText,
  onAction,
}) => {
  let bgColor: string = UI_COLORS.warning;
  const textColor = '#FFFFFF';
  let icon = '⚡';

  switch (type) {
    case 'error':
      bgColor = UI_COLORS.error;
      icon = '⚠️';
      break;
    case 'info':
      bgColor = UI_COLORS.primary;
      icon = 'ℹ️';
      break;
    case 'success':
      bgColor = UI_COLORS.success;
      icon = '✓';
      break;
  }

  return (
    <div
      role="banner"
      style={{
        width: '100%',
        backgroundColor: bgColor,
        color: textColor,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        fontSize: UI_TYPOGRAPHY.bodySizeStudent,
        fontWeight: 600,
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ textAlign: 'center' }}>{message}</span>
      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            minHeight: UI_SPACING.minTouchTarget,
            padding: '6px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: UI_RADII.sm,
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
