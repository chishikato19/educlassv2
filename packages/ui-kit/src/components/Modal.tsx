import React, { useEffect } from 'react';
import { UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

export interface ModalProps {
  isOpen: boolean;
  title?: React.ReactNode | undefined;
  onClose: () => void;
  footer?: React.ReactNode | undefined;
  children: React.ReactNode;
  maxWidth?: string | number | undefined;
  contentStyle?: React.CSSProperties | undefined;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  footer,
  children,
  maxWidth,
  contentStyle,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return () => {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Tự động focus vào ô input/textarea có autofocus hoặc input đầu tiên khi mở modal
  useEffect(() => {
    if (!isOpen) return () => {};
    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const targetEl = dialogRef.current.querySelector<HTMLElement>(
        '[autofocus], [data-autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled])'
      );
      if (targetEl) {
        targetEl.focus();
        if (targetEl instanceof HTMLInputElement && (targetEl.type === 'text' || !targetEl.type)) {
          targetEl.select();
        }
      }
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: UI_COLORS.surface,
          borderRadius: UI_RADII.modal,
          boxShadow: UI_SHADOWS.modal,
          maxWidth: maxWidth ?? '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          fontFamily: UI_TYPOGRAPHY.fontFamily,
          boxSizing: 'border-box',
          position: 'relative',
          pointerEvents: 'auto',
          ...contentStyle,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: UI_TYPOGRAPHY.titleSizeSmall,
                fontWeight: 700,
                color: UI_COLORS.text,
              }}
            >
              {title}
            </h2>
          )}
          <button
            aria-label="Đóng"
            onClick={onClose}
            style={{
              minWidth: UI_SPACING.minTouchTarget,
              minHeight: UI_SPACING.minTouchTarget,
              border: 'none',
              background: 'transparent',
              fontSize: '22px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: UI_RADII.sm,
              color: UI_COLORS.textMuted,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            fontSize: UI_TYPOGRAPHY.bodySizeStudent,
            color: UI_COLORS.text,
            overflowY: 'auto',
            flex: 1,
            paddingRight: '4px',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
