import React from 'react';
import { KAHOOT_SHAPES, UI_COLORS, UI_RADII, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost'
  | 'kahoot_red'
  | 'kahoot_blue'
  | 'kahoot_yellow'
  | 'kahoot_green';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  loading?: boolean | undefined;
  fullWidth?: boolean | undefined;
  symbol?: string | undefined;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  symbol,
  disabled = false,
  children,
  style,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  // Lấy màu và ký hiệu hình khối tương ứng
  let bgColor: string = UI_COLORS.primary;
  let textColor = '#FFFFFF';
  let defaultSymbol: string | null = null;
  let borderColor = 'transparent';

  switch (variant) {
    case 'secondary':
      bgColor = UI_COLORS.secondary;
      break;
    case 'success':
      bgColor = UI_COLORS.success;
      break;
    case 'danger':
      bgColor = UI_COLORS.error;
      break;
    case 'ghost':
      bgColor = 'transparent';
      textColor = UI_COLORS.text;
      borderColor = UI_COLORS.border;
      break;
    case 'kahoot_red':
      bgColor = KAHOOT_SHAPES.red.color;
      defaultSymbol = KAHOOT_SHAPES.red.symbol;
      break;
    case 'kahoot_blue':
      bgColor = KAHOOT_SHAPES.blue.color;
      defaultSymbol = KAHOOT_SHAPES.blue.symbol;
      break;
    case 'kahoot_yellow':
      bgColor = KAHOOT_SHAPES.yellow.color;
      defaultSymbol = KAHOOT_SHAPES.yellow.symbol;
      break;
    case 'kahoot_green':
      bgColor = KAHOOT_SHAPES.green.color;
      defaultSymbol = KAHOOT_SHAPES.green.symbol;
      break;
  }

  const activeSymbol = symbol ?? defaultSymbol;

  const buttonStyle: React.CSSProperties = {
    minHeight: UI_SPACING.minTouchTarget,
    minWidth: fullWidth ? '100%' : UI_SPACING.minTouchTarget,
    width: fullWidth ? '100%' : 'auto',
    borderRadius: UI_RADII.button,
    fontFamily: UI_TYPOGRAPHY.fontFamily,
    fontSize: UI_TYPOGRAPHY.bodySizeStudent,
    fontWeight: 600,
    backgroundColor: bgColor,
    color: textColor,
    border: `2px solid ${borderColor}`,
    padding: '12px 24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    boxShadow: variant === 'ghost' ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 150ms ease-in-out',
    userSelect: 'none',
    boxSizing: 'border-box',
    ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
  };

  return (
    <button
      disabled={isDisabled}
      style={buttonStyle}
      className={`educlass-btn ${className}`}
      {...props}
    >
      {loading && <span style={{ marginRight: '6px' }}>⏳</span>}
      {activeSymbol && (
        <span
          style={{
            fontSize: '20px',
            lineHeight: 1,
            display: 'inline-block',
          }}
          aria-hidden="true"
        >
          {activeSymbol}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
};
