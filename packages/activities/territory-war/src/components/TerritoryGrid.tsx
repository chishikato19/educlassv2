import React from 'react';
import type { TerritoryCell } from '../territory-schemas.js';
import { TERRAIN_META } from './TerritoryTheme.js';
import { canTeamTargetCell } from '../territory-logic.js';

export interface TerritoryGridProps {
  mapSize: '5x5' | '7x7' | '9x9';
  cells: Record<string, TerritoryCell>;
  interactive?: boolean | undefined;
  viewerTeam?: 'blue' | 'red' | null | undefined;
  currentLockedCellId?: string | null | undefined;
  onSelectCell?: ((cellId: string) => void) | undefined;
  className?: string | undefined;
}

export const TerritoryGrid: React.FC<TerritoryGridProps> = ({
  mapSize,
  cells,
  interactive = false,
  viewerTeam = null,
  currentLockedCellId = null,
  onSelectCell,
  className = 'w-full max-w-[min(65vw,78vh)] aspect-square',
}) => {
  const size = mapSize === '5x5' ? 5 : mapSize === '7x7' ? 7 : 9;
  const cellSize = 90;
  const gap = 8;
  const padding = 12;
  const totalWidth = size * cellSize + (size - 1) * gap + padding * 2;
  const totalHeight = totalWidth;

  return (
    <div className="w-full flex items-center justify-center select-none overflow-hidden p-1">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className={`${className} rounded-2xl shadow-2xl bg-slate-900 border-4 border-slate-700 touch-manipulation`}
      >
        <defs>
          {/* Gradient Xanh */}
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Gradient Đỏ */}
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* Gradient Trung lập */}
          <linearGradient id="neutralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Hào quang khi có thể tấn công */}
          <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Vẽ từng ô lưới */}
        {Object.values(cells).map(cell => {
          const posX = padding + cell.x * (cellSize + gap);
          const posY = padding + cell.y * (cellSize + gap);

          const isTargetable =
            interactive &&
            viewerTeam &&
            canTeamTargetCell(cells, viewerTeam, cell.id).allowed;

          const isLocked = cell.lockedBy !== null;
          const isMyLock = currentLockedCellId === cell.id;

          let fillUrl = 'url(#neutralGradient)';
          let strokeColor = '#475569';
          let strokeWidth = 2;

          if (cell.owner === 'blue') {
            fillUrl = 'url(#blueGradient)';
            strokeColor = '#60a5fa';
            strokeWidth = 3;
          } else if (cell.owner === 'red') {
            fillUrl = 'url(#redGradient)';
            strokeColor = '#f87171';
            strokeWidth = 3;
          }

          if (isTargetable) {
            strokeColor = '#f59e0b';
            strokeWidth = 3.5;
          }

          if (isMyLock) {
            strokeColor = '#10b981';
            strokeWidth = 4;
          }

          const meta = TERRAIN_META[cell.terrain] || TERRAIN_META['plain']!;

          return (
            <g
              key={cell.id}
              transform={`translate(${posX}, ${posY})`}
              className={`transition-all duration-200 ${
                isTargetable ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
              }`}
              onClick={() => {
                if (interactive && isTargetable && onSelectCell) {
                  onSelectCell(cell.id);
                }
              }}
            >
              {/* Nền ô */}
              <rect
                width={cellSize}
                height={cellSize}
                rx={14}
                fill={fillUrl}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={isTargetable ? 'url(#glowGold)' : undefined}
                className={isTargetable ? 'animate-pulse' : undefined}
              />

              {/* Tên & Biểu tượng địa hình */}
              <text
                x={cellSize / 2}
                y={cell.terrain === 'plain' ? cellSize / 2 + 6 : cellSize / 2 - 2}
                textAnchor="middle"
                fontSize={cell.terrain === 'big_castle' ? 32 : cell.terrain === 'small_castle' ? 26 : cell.terrain === 'watchtower' ? 24 : 18}
                fill="#ffffff"
                className="pointer-events-none select-none"
              >
                {meta.icon}
              </text>

              {/* Thông tin Máu & Giáp */}
              {cell.terrain !== 'plain' && (
                <text
                  x={cellSize / 2}
                  y={cellSize - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#ffffff"
                  className="pointer-events-none select-none drop-shadow"
                >
                  {cell.owner === 'neutral' ? (
                    // Giằng co máu khi trung lập
                    cell.tugOfWarHp > 0 ? (
                      `🔵 +${cell.tugOfWarHp}/${cell.maxHp}`
                    ) : cell.tugOfWarHp < 0 ? (
                      `🔴 ${cell.tugOfWarHp}/${cell.maxHp}`
                    ) : (
                      `HP ${cell.maxHp}`
                    )
                  ) : (
                    // Đã chiếm
                    `HP ${cell.currentHp}/${cell.maxHp}${cell.reinforceLevel > 0 ? ` 🛡️+${cell.reinforceLevel}` : ''}`
                  )}
                </text>
              )}

              {/* Hiển thị gia cố ô đất thường nếu có */}
              {cell.terrain === 'plain' && cell.reinforceLevel > 0 && (
                <text
                  x={cellSize / 2}
                  y={cellSize - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#fef08a"
                  className="pointer-events-none select-none drop-shadow"
                >
                  🛡️+1
                </text>
              )}

              {/* Đang có người khóa ô giao tranh */}
              {isLocked && (
                <g className="pointer-events-none">
                  <rect
                    x={4}
                    y={4}
                    width={cellSize - 8}
                    height={cellSize - 8}
                    rx={10}
                    fill="rgba(0, 0, 0, 0.65)"
                  />
                  <text
                    x={cellSize / 2}
                    y={cellSize / 2 - 4}
                    textAnchor="middle"
                    fontSize="18"
                    className="select-none pointer-events-none drop-shadow"
                  >
                    ⚔️
                  </text>
                  <text
                    x={cellSize / 2}
                    y={cellSize / 2 + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill={cell.lockedBy?.team === 'blue' ? '#93c5fd' : '#fca5a5'}
                  >
                    {cell.lockedBy?.displayName?.slice(0, 7) ?? 'Đang đánh'}
                  </text>
                </g>
              )}

              {/* Dấu hiệu ô có thể đánh của tôi */}
              {isTargetable && !isLocked && (
                <circle
                  cx={cellSize - 12}
                  cy={12}
                  r={6}
                  fill="#f59e0b"
                  className="animate-ping"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
