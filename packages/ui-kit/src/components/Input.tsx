import React from 'react';
import { UI_COLORS, UI_RADII, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  fullWidth?: boolean | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      disabled = false,
      style,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const isError = Boolean(error);
    const reactGeneratedId = React.useId();
    const inputId = id || reactGeneratedId;

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: UI_TYPOGRAPHY.fontFamily,
      boxSizing: 'border-box',
      pointerEvents: 'auto',
    };

    const inputStyle: React.CSSProperties = {
      minHeight: UI_SPACING.minTouchTarget,
      borderRadius: UI_RADII.input,
      border: `2px solid ${isError ? UI_COLORS.error : UI_COLORS.border}`,
      padding: '10px 16px',
      fontSize: UI_TYPOGRAPHY.bodySizeStudent,
      fontFamily: UI_TYPOGRAPHY.fontFamily,
      color: UI_COLORS.text,
      backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
      outline: 'none',
      boxSizing: 'border-box',
      width: '100%',
      transition: 'border-color 150ms ease-in-out',
      cursor: disabled ? 'not-allowed' : 'text',
      pointerEvents: 'auto',
      userSelect: 'text',
      WebkitUserSelect: 'text',
      ...style,
    };

    return (
      <div style={containerStyle} className="educlass-input-container">
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: UI_COLORS.text,
              cursor: 'pointer',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          style={inputStyle}
          className={`educlass-input ${className}`}
          {...props}
        />
        {error && (
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: UI_COLORS.error,
            }}
            role="alert"
          >
            {error}
          </span>
        )}
        {!error && helperText && (
          <span
            style={{
              fontSize: '14px',
              color: UI_COLORS.textMuted,
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
