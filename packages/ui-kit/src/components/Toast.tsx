import React, { useEffect } from 'react';
import { UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType | undefined;
  message: string;
  onClose?: (() => void) | undefined;
  duration?: number | undefined;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (!onClose || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  let bgColor: string = UI_COLORS.primary;
  let icon = 'ℹ️';

  switch (type) {
    case 'success':
      bgColor = UI_COLORS.success;
      icon = '🎉';
      break;
    case 'error':
      bgColor = UI_COLORS.error;
      icon = '⚠️';
      break;
    case 'warning':
      bgColor = UI_COLORS.warning;
      icon = '🔔';
      break;
  }

  return (
    <div
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: bgColor,
        color: '#FFFFFF',
        padding: '12px 16px',
        borderRadius: UI_RADII.input,
        boxShadow: UI_SHADOWS.card,
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        fontSize: UI_TYPOGRAPHY.bodySizeStudent,
        fontWeight: 600,
        boxSizing: 'border-box',
        maxWidth: '90vw',
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          aria-label="Tắt"
          onClick={onClose}
          style={{
            minWidth: UI_SPACING.minTouchTarget,
            minHeight: UI_SPACING.minTouchTarget,
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
