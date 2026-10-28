import React from 'react';
import type { PowerUpInventory } from '@educlass/protocol';

interface PowerUpQueueBarProps {
  inventory: PowerUpInventory;
  keyLabel: string;
  themeColor: 'blue' | 'red';
  onUsePowerUp: () => void;
}

export const PowerUpQueueBar: React.FC<PowerUpQueueBarProps> = ({
  inventory,
  keyLabel,
  themeColor,
  onUsePowerUp,
}) => {
  const queue = inventory.queue;
  const max = inventory.maxCapacity;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Túi đồ:</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, idx) => {
          const item = queue[idx];
          const isNext = idx === 0 && item !== undefined;

          if (!item) {
            return (
              <div
                key={idx}
                className="w-10 h-10 rounded-xl border border-dashed border-slate-600/70 bg-slate-800/40 flex items-center justify-center text-slate-600 text-xs font-mono"
              >
                {idx + 1}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={isNext ? onUsePowerUp : undefined}
              title={`${item.name}: ${item.description}`}
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-transform ${
                isNext
                  ? themeColor === 'blue'
                    ? 'bg-blue-600/80 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105 animate-bounce'
                    : 'bg-red-600/80 border-red-400 text-white shadow-lg shadow-red-500/30 scale-105 animate-bounce'
                  : 'bg-slate-800 border-slate-600 opacity-80'
              }`}
            >
              <span>{item.icon}</span>
              {isNext && (
                <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                  {keyLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
