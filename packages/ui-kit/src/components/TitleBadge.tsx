import React from 'react';
import { UI_COLORS, UI_RADII, UI_TYPOGRAPHY } from '../tokens/index.js';

export interface TitleBadgeProps {
  /** Mã danh hiệu hoặc key định danh */
  id?: string | undefined;
  /** Tên hiển thị của danh hiệu (ví dụ: 'Học sinh chăm chỉ') */
  name: string;
  /** Mã biểu tượng ('star' | 'sparkles' | 'trophy' | 'target' | 'bolt' | 'book' | 'flame' | 'crown') */
  iconKey?: string | undefined;
  /** Mô tả chi tiết hoặc điều kiện đạt */
  description?: string | undefined;
  /** Đã mở khóa chưa (mặc định: true) */
  unlocked?: boolean | undefined;
  /** Kích thước badge */
  size?: 'sm' | 'md' | 'lg' | undefined;
  /** Hiển thị mô tả bên dưới */
  showDescription?: boolean | undefined;
  /** Tương tác click */
  onClick?: (() => void) | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * Render vector SVG icon độc lập cho từng mã biểu tượng
 */
const renderTitleIcon = (iconKey?: string, isUnlocked: boolean = true) => {
  if (!isUnlocked) {
    // Biểu tượng ổ khóa
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  switch (iconKey) {
    case 'trophy':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
          <path d="M6 2h12v3a6 6 0 0 1-5 5.92V14h3a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1h3v-3.08A6 6 0 0 1 6 5V2zm-2 2H2v2a4 4 0 0 0 4 4V8a2 2 0 0 1-2-2V4zm18 0h-2v2a2 2 0 0 1-2 2v2a4 4 0 0 0 4-4V4zm-7 15H9v2h6v-2z" />
        </svg>
      );
    case 'target':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-emerald-500">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'bolt':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-yellow-500">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-blue-500">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A4.5 4.5 0 0 0 2 7.5v12a2.5 2.5 0 0 0 2 0z" />
          <path d="M6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 18.5V17a2.5 2.5 0 0 1 2.5 0z" />
        </svg>
      );
    case 'flame':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-rose-500">
          <path d="M12 2c-.5 2.5-3 4.5-3 7 0 2.8 2.2 5 5 5s5-2.2 5-5c0-1.5-.5-3-1.5-4 1.5 2 2.5 4 2.5 6 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-3.5 2-6.5 5-8.5.5 1.5 1.5 2.5 3 2.5z" />
        </svg>
      );
    case 'crown':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
          <path d="M2 20h20v2H2v-2zm1-5l3.5-9 5.5 5 5.5-5 3.5 9H3z" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-purple-500">
          <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2zm7 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" />
        </svg>
      );
    case 'star':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-400">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
};

const sizeStyles = {
  sm: {
    padding: '4px 8px',
    iconSize: 14,
    fontSize: '12px',
    gap: '4px',
  },
  md: {
    padding: '6px 12px',
    iconSize: 18,
    fontSize: '13px',
    gap: '6px',
  },
  lg: {
    padding: '8px 16px',
    iconSize: 22,
    fontSize: '15px',
    gap: '8px',
  },
};

/**
 * Component Huy hiệu danh hiệu (TitleBadge)
 * Hiển thị danh hiệu cá nhân kèm biểu tượng vector, phân biệt trạng thái đã mở hoặc còn khóa
 */
export const TitleBadge: React.FC<TitleBadgeProps> = ({
  id,
  name,
  iconKey = 'star',
  description,
  unlocked = true,
  size = 'md',
  showDescription = false,
  onClick,
  className = '',
  style,
}) => {
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      data-testid={id ? `title-badge-${id}` : undefined}
      onClick={onClick}
      className={`educlass-title-badge inline-flex items-center select-none transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: currentSize.padding,
        gap: currentSize.gap,
        borderRadius: UI_RADII.full,
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        fontSize: currentSize.fontSize,
        fontWeight: 600,
        backgroundColor: unlocked ? '#F0FDF4' : '#F1F5F9',
        border: `1px solid ${unlocked ? '#BBF7D0' : '#CBD5E1'}`,
        color: unlocked ? '#166534' : UI_COLORS.textMuted,
        opacity: unlocked ? 1 : 0.75,
        ...style,
      }}
      title={description || name}
    >
      {/* Icon vector */}
      <span
        className="shrink-0 flex items-center justify-center"
        style={{
          width: `${currentSize.iconSize}px`,
          height: `${currentSize.iconSize}px`,
        }}
      >
        {renderTitleIcon(iconKey, unlocked)}
      </span>

      {/* Nội dung danh hiệu */}
      <span className="truncate max-w-[200px]">{name}</span>

      {/* Mô tả phụ nếu bật */}
      {showDescription && description && (
        <span
          className="text-xs font-normal ml-1"
          style={{ color: UI_COLORS.textMuted }}
        >
          ({description})
        </span>
      )}
    </div>
  );
};
