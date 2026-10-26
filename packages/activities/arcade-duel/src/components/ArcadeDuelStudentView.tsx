import React, { useState } from 'react';
import type { ArcadeDuelState } from '../arcade-duel-schemas.js';

export interface ArcadeDuelStudentViewProps {
  runId: string;
  state: ArcadeDuelState;
  participantId?: string;
  onSendIntent?: (intent: unknown) => void;
}

export const ArcadeDuelStudentView: React.FC<ArcadeDuelStudentViewProps> = ({ state }) => {
  const [cheerCount, setCheerCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string }[]>([]);

  const handleCheer = (emoji: string) => {
    setCheerCount(prev => prev + 1);
    const newId = Date.now() + Math.random();
    setFloatingEmojis(prev => [...prev.slice(-6), { id: newId, emoji }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newId));
    }, 1500);
  };

  const blue = state.bluePlayer;
  const red = state.redPlayer;

  return (
    <div className="relative min-h-[500px] max-w-md mx-auto p-5 bg-slate-950 text-white rounded-3xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-xl select-none">
      {/* Hiệu ứng emoji bay lên khi cổ vũ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floatingEmojis.map(item => (
          <span
            key={item.id}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce"
            style={{
              animationDuration: '1.2s',
              left: `${40 + Math.random() * 20}%`,
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="text-center pb-4 border-b border-slate-800">
        <span className="px-3 py-1 rounded-full bg-indigo-900/60 text-indigo-300 text-xs font-bold border border-indigo-700/50">
          👀 KHÁN ĐÀI THEO DÕI TRỰC TIẾP
        </span>
        <h3 className="text-xl font-black mt-2 text-white">ĐỐI KHÁNG 1VS1</h3>
        <p className="text-xs text-slate-400 mt-1">
          Hãy theo dõi màn hình máy chiếu của thầy/cô!
        </p>
      </div>

      {/* Tỷ số trận đấu */}
      <div className="my-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40">
            <span className="text-xs font-bold text-blue-300 block mb-1">
              🔵 {blue.teamName}
            </span>
            <span className="text-3xl font-black font-mono text-blue-400">
              {blue.score}đ
            </span>
            {blue.streak > 1 && (
              <span className="text-[10px] text-amber-300 block mt-1">
                🔥 x{blue.streak} streak
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40">
            <span className="text-xs font-bold text-red-300 block mb-1">
              🔴 {red.teamName}
            </span>
            <span className="text-3xl font-black font-mono text-red-400">
              {red.score}đ
            </span>
            {red.streak > 1 && (
              <span className="text-[10px] text-amber-300 block mt-1">
                🔥 x{red.streak} streak
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Khu vực bấm nút Cổ vũ */}
      <div className="text-center pt-4 border-t border-slate-800/80">
        <p className="text-xs text-slate-400 mb-3 font-semibold">
          Bấm để cổ vũ cho đội của bạn! (Đã cổ vũ: {cheerCount})
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleCheer('👏')}
            className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-2xl flex items-center justify-center shadow-md transition-transform"
          >
            👏
          </button>
          <button
            onClick={() => handleCheer('❤️')}
            className="w-14 h-14 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 border border-rose-800/50 text-2xl flex items-center justify-center shadow-md transition-transform"
          >
            ❤️
          </button>
          <button
            onClick={() => handleCheer('🔥')}
            className="w-14 h-14 rounded-2xl bg-amber-950/60 hover:bg-amber-900/80 active:scale-95 border border-amber-800/50 text-2xl flex items-center justify-center shadow-md transition-transform"
          >
            🔥
          </button>
          <button
            onClick={() => handleCheer('🎉')}
            className="w-14 h-14 rounded-2xl bg-purple-950/60 hover:bg-purple-900/80 active:scale-95 border border-purple-800/50 text-2xl flex items-center justify-center shadow-md transition-transform"
          >
            🎉
          </button>
        </div>
      </div>
    </div>
  );
};
