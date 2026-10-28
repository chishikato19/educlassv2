import React from 'react';
import { UI_COLORS, UI_RADII, UI_TYPOGRAPHY } from '../tokens/index.js';

export interface ExpLevelBarProps {
  /** Cấp độ hiện tại (Level >= 1) */
  level: number;
  /** Điểm EXP trong cấp độ hiện tại (tùy chọn) */
  currentExp?: number | undefined;
  /** Điểm EXP cần đạt của cấp độ này (tùy chọn) */
  maxExp?: number | undefined;
  /** Phần trăm tiến độ (0 - 100), nếu không truyền sẽ tính từ currentExp / maxExp */
  progressPercent?: number | undefined;
  /** Kích thước thanh */
  size?: 'sm' | 'md' | 'lg' | undefined;
  /** Hiển thị chữ EXP (vd: 80 / 100 EXP) */
  showExpLabel?: boolean | undefined;
  /** Hiển thị nhãn Level (vd: Lv. 3) */
  showLevelBadge?: boolean | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

const heightMap = {
  sm: { barH: 8, badgeSize: 26, fontSize: '11px', badgeFont: '11px' },
  md: { barH: 14, badgeSize: 34, fontSize: '12px', badgeFont: '13px' },
  lg: { barH: 20, badgeSize: 42, fontSize: '14px', badgeFont: '15px' },
};

/**
 * Component hiển thị Cấp độ (Level) và Thanh tiến độ kinh nghiệm (EXP Bar)
 * Thiết kế thân thiện, màu sắc gradient rực rỡ, bo tròn viền
 */
export const ExpLevelBar: React.FC<ExpLevelBarProps> = ({
  level,
  currentExp,
  maxExp,
  progressPercent,
  size = 'md',
  showExpLabel = true,
  showLevelBadge = true,
  className = '',
  style,
}) => {
  // Tính % tiến độ
  let percent = 0;
  if (typeof progressPercent === 'number') {
    percent = Math.min(100, Math.max(0, Math.round(progressPercent)));
  } else if (typeof currentExp === 'number' && typeof maxExp === 'number' && maxExp > 0) {
    percent = Math.min(100, Math.max(0, Math.round((currentExp / maxExp) * 100)));
  }

  const { barH, badgeSize, fontSize, badgeFont } = heightMap[size] || heightMap.md;

  return (
    <div
      className={`educlass-exp-level-bar flex items-center gap-2 select-none ${className}`}
      style={{
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        ...style,
      }}
    >
      {/* Huy hiệu Level */}
      {showLevelBadge && (
        <div
          className="shrink-0 flex items-center justify-center font-bold text-white rounded-full shadow-xs"
          style={{
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            fontSize: badgeFont,
            background: `linear-gradient(135deg, ${UI_COLORS.primary} 0%, ${UI_COLORS.purple} 100%)`,
            border: `2px solid ${UI_COLORS.surface}`,
            boxShadow: '0 2px 6px rgba(79, 140, 255, 0.35)',
          }}
          title={`Cấp độ ${level}`}
        >
          {level}
        </div>
      )}

      {/* Cụm thanh tiến độ và nhãn */}
      <div className="flex-1 min-w-[80px]">
        {showExpLabel && (
          <div
            className="flex justify-between items-center mb-1 text-xs font-semibold"
            style={{ fontSize, color: UI_COLORS.textMuted }}
          >
            <span>Cấp {level}</span>
            <span>
              {typeof currentExp === 'number' && typeof maxExp === 'number'
                ? `${currentExp} / ${maxExp} EXP`
                : `${percent}%`}
            </span>
          </div>
        )}

        {/* Khung thanh tiến độ */}
        <div
          className="w-full relative overflow-hidden bg-slate-100 rounded-full"
          style={{
            height: `${barH}px`,
            backgroundColor: '#E2E8F0',
            borderRadius: UI_RADII.full,
          }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Thanh fill */}
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${percent}%`,
              background: `linear-gradient(90deg, ${UI_COLORS.secondary} 0%, ${UI_COLORS.primary} 100%)`,
              borderRadius: UI_RADII.full,
              boxShadow: '0 1px 3px rgba(255, 176, 32, 0.4)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
