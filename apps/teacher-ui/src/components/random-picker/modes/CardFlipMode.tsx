import React from 'react';
import type { RandomPickerModeProps } from '../types.js';

export const CardFlipMode: React.FC<RandomPickerModeProps> = ({ isPicking, cards, onFlipCard }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-6 select-none">
      {/* Container 5 thẻ bài */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 w-full max-w-5xl px-4 justify-items-center">
        {cards.map((card, idx) => {
          const isFlipped = card.isRevealed;
          const isTarget = card.isTarget;

          return (
            <div
              key={card.id}
              onClick={() => {
                if (!isFlipped && !isPicking) {
                  onFlipCard(idx);
                }
              }}
              className={`relative w-36 h-56 sm:w-44 sm:h-64 cursor-pointer perspective-1000 transition-transform duration-300 ${
                !isFlipped && !isPicking
                  ? 'hover:-translate-y-2 hover:scale-105 active:scale-95'
                  : ''
              } ${isPicking ? 'animate-pulse' : ''}`}
              style={{ perspective: '1000px' }}
              role="button"
              tabIndex={0}
              aria-label={`Lá bài số ${idx + 1}`}
            >
              {/* Thẻ 3D lật */}
              <div
                className="w-full h-full relative rounded-2xl shadow-xl transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* MẶT SAU THẺ BÀI (Úp mặt) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-4 border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-950 text-white shadow-2xl hover:border-amber-400/60 transition-colors"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <div className="w-full flex justify-between items-center text-indigo-300 text-xs font-mono">
                    <span>★ ★ ★</span>
                    <span>#{idx + 1}</span>
                  </div>

                  {/* Biểu tượng thần bí ở giữa mặt úp */}
                  <div className="flex flex-col items-center justify-center my-auto">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-indigo-300/40 flex items-center justify-center bg-indigo-950/60 shadow-inner group-hover:scale-110 transition-transform">
                      <span className="text-3xl filter drop-shadow">🃏</span>
                    </div>
                    <span className="mt-2 text-xs font-semibold tracking-widest text-indigo-200 uppercase">
                      Lật Thẻ
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-center text-indigo-300 text-xs font-mono">
                    <span>EduClass</span>
                    <span>★ ★ ★</span>
                  </div>
                </div>

                {/* MẶT TRƯỚC THẺ BÀI (Sau khi lật mở) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-4 shadow-2xl ${
                    isTarget
                      ? 'border-4 border-amber-300 bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-amber-950 shadow-amber-400/80 ring-4 ring-amber-300/60'
                      : 'border-2 border-slate-200 bg-white text-slate-700 shadow-md'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Header thẻ mở */}
                  <div className="w-full flex justify-between items-center text-xs font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        isTarget
                          ? 'bg-amber-950/80 text-amber-200 font-extrabold shadow-sm'
                          : 'bg-slate-100 text-slate-500 font-medium'
                      }`}
                    >
                      {isTarget ? '🎯 ĐƯỢC CHỌN' : 'Ứng viên'}
                    </span>
                    <span className={isTarget ? 'text-amber-900 font-bold' : 'text-slate-400'}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Nội dung học sinh */}
                  <div className="flex flex-col items-center justify-center my-auto text-center px-1">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black mb-2 shadow-md ${
                        isTarget
                          ? 'bg-amber-500 text-white ring-4 ring-white shadow-amber-600/40'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {card.student ? card.student.name.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div
                      className={`font-black text-base sm:text-lg leading-tight line-clamp-2 ${
                        isTarget ? 'text-amber-950 drop-shadow-sm' : 'text-slate-800'
                      }`}
                    >
                      {card.student ? card.student.name : 'Chưa xác định'}
                    </div>

                    {card.student?.code && (
                      <div
                        className={`text-xs mt-1 font-mono font-semibold ${
                          isTarget
                            ? 'text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded'
                            : 'text-slate-400'
                        }`}
                      >
                        {card.student.code}
                      </div>
                    )}
                  </div>

                  {/* Footer thẻ */}
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isTarget ? 'text-amber-900 font-extrabold' : 'text-slate-300'
                    }`}
                  >
                    {isTarget ? '✨ Chúc mừng em! ✨' : 'EduClass'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
