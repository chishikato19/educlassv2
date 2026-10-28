import React from 'react';
import type { CombatEvent } from '@educlass/protocol';

interface CombatFeedBarProps {
  events: CombatEvent[];
  enablePowerUps?: boolean;
}

export const CombatFeedBar: React.FC<CombatFeedBarProps> = ({ events, enablePowerUps = true }) => {
  const latestEvent = events[0];

  if (!latestEvent) {
    return (
      <div className="h-9 px-4 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-inner">
        <span>⚔️</span>
        <span>
          {enablePowerUps
            ? 'Sàn đấu sẵn sàng! Bấm phím để chọn đáp án hoặc dùng vật phẩm.'
            : 'Sàn đấu sẵn sàng! Bấm phím để chọn đáp án.'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`h-9 px-4 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-2 border shadow-md transition-all duration-300 animate-pulse ${
        latestEvent.blocked
          ? 'bg-amber-950/90 text-amber-200 border-amber-500'
          : latestEvent.powerUpType === 'freeze'
            ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400'
            : latestEvent.powerUpType === 'double_points'
              ? 'bg-yellow-950/90 text-yellow-200 border-yellow-400'
              : 'bg-indigo-950/90 text-indigo-200 border-indigo-400'
      }`}
    >
      <span className="text-sm">💥</span>
      <span className="truncate max-w-xl">{latestEvent.message}</span>
    </div>
  );
};
