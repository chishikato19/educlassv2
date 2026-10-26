import React from 'react';
import { UI_COLORS, UI_RADII, UI_SHADOWS, UI_TYPOGRAPHY } from '../tokens/index.js';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode | undefined;
  subtitle?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  footer,
  children,
  style,
  className = '',
  ...props
}) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: UI_COLORS.surface,
    borderRadius: UI_RADII.card,
    boxShadow: UI_SHADOWS.card,
    border: `1px solid ${UI_COLORS.border}`,
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: UI_TYPOGRAPHY.fontFamily,
    color: UI_COLORS.text,
    ...style,
  };

  return (
    <div style={cardStyle} className={`educlass-card ${className}`} {...props}>
      {title && (
        <div style={{ marginBottom: subtitle ? '4px' : '16px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: UI_TYPOGRAPHY.titleSizeSmall,
              fontWeight: 700,
              color: UI_COLORS.text,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: '4px 0 16px 0', fontSize: '14px', color: UI_COLORS.textMuted }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="educlass-card-body">{children}</div>
      {footer && (
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: `1px solid ${UI_COLORS.border}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
