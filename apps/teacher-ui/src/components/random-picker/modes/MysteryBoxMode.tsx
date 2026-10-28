import React from 'react';
import type { MysteryBoxItem, RandomPickerModeProps } from '../types.js';

const BOX_THEMES = [
  {
    id: 1,
    name: 'Hộp Đỏ May Mắn',
    gradient: 'from-rose-600 via-red-600 to-rose-800',
    border: 'border-rose-400',
    ribbon: 'bg-amber-300',
    accentText: 'text-amber-300',
    glow: 'shadow-rose-500/50',
    lidGradient: 'from-rose-500 to-red-700',
  },
  {
    id: 2,
    name: 'Hộp Vàng Hoàng Gia',
    gradient: 'from-amber-500 via-yellow-500 to-amber-700',
    border: 'border-yellow-300',
    ribbon: 'bg-indigo-900',
    accentText: 'text-yellow-200',
    glow: 'shadow-yellow-500/50',
    lidGradient: 'from-amber-400 to-yellow-600',
  },
  {
    id: 3,
    name: 'Hộp Xanh Kỳ Diệu',
    gradient: 'from-emerald-600 via-teal-600 to-emerald-800',
    border: 'border-emerald-300',
    ribbon: 'bg-amber-200',
    accentText: 'text-emerald-200',
    glow: 'shadow-emerald-500/50',
    lidGradient: 'from-emerald-500 to-teal-700',
  },
];

export const MysteryBoxMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  boxes = [],
  onSelectBox,
  isWaitingForBoxSelection = false,
}) => {
  // Dự phòng nếu boxes rỗng
  const displayBoxes: MysteryBoxItem[] =
    boxes.length === 3
      ? boxes
      : [
          { id: 1, student: null, status: 'idle', isTarget: false },
          { id: 2, student: null, status: 'idle', isTarget: false },
          { id: 3, student: null, status: 'idle', isTarget: false },
        ];

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 select-none">
      {/* 3 Hộp quà */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full max-w-4xl px-4 justify-items-center">
        {displayBoxes.map((box, idx) => {
          const theme = BOX_THEMES[idx] || BOX_THEMES[0]!;
          const isSelected = box.status === 'selected';
          const isOpenedLoser = box.status === 'opened_loser';
          const isOpenedWinner = box.status === 'opened_winner';
          const isClosed = box.status === 'idle' || box.status === 'selected';

          const canClick = !isPicking && (isWaitingForBoxSelection || box.status === 'idle');

          return (
            <div
              key={box.id}
              onClick={() => {
                if (canClick && onSelectBox) {
                  onSelectBox(idx);
                }
              }}
              className={`relative w-48 sm:w-56 h-64 sm:h-72 flex flex-col items-center justify-end transition-all duration-500 ${
                canClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
              } ${isSelected ? 'scale-110 -translate-y-3' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`Hộp quà số ${idx + 1}`}
            >
              {/* Vầng hào quang phía sau khi thắng */}
              {isOpenedWinner && (
                <div className="absolute inset-0 -top-12 bg-amber-400/25 rounded-full blur-2xl animate-pulse pointer-events-none" />
              )}

              {/* NỘI DUNG BÊN TRONG HỘP QUÀ KHI MỞ */}
              {!isClosed && (
                <div
                  className={`absolute -top-6 w-full flex flex-col items-center z-20 transition-all duration-700 ${
                    isOpenedWinner ? 'animate-bounce' : 'opacity-80 scale-95'
                  }`}
                >
                  {isOpenedWinner ? (
                    // Học sinh trúng thưởng bay vọt lên
                    <div className="bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 border-4 border-white p-3 rounded-2xl shadow-2xl text-center text-slate-900 w-44 sm:w-48 ring-4 ring-amber-400/60">
                      <div className="w-14 h-14 mx-auto rounded-full bg-indigo-900 text-amber-300 font-black text-2xl flex items-center justify-center mb-1.5 shadow-md">
                        {box.student?.name ? box.student.name.charAt(0).toUpperCase() : '★'}
                      </div>
                      <div className="text-xs uppercase font-extrabold tracking-wider text-amber-950 bg-amber-200/80 rounded-full px-2 py-0.5 mb-1">
                        🎯 ĐƯỢC CHỌN!
                      </div>
                      <div className="font-black text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">
                        {box.student?.name || selectedStudent?.name || 'Học sinh'}
                      </div>
                      {box.student?.code && (
                        <div className="text-[10px] font-mono font-bold text-amber-950 mt-0.5">
                          {box.student.code}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 2 Hộp phụ mở trước (Suýt trúng / Bỏ lỡ)
                    <div className="bg-slate-800/90 border border-slate-600 p-2.5 rounded-xl shadow-lg text-center text-slate-300 w-36 sm:w-40 animate-fade-in">
                      <span className="text-xl">💨</span>
                      <div className="text-xs font-bold text-rose-300 mt-0.5">
                        {box.student ? box.student.name : 'Suýt trúng rồi!'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {box.student ? 'Ứng viên khác' : 'Hộp không có quà'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* HỘP QUÀ VẬT LÝ 3D */}
              <div
                className={`relative w-40 sm:w-48 h-36 sm:h-40 rounded-2xl shadow-2xl border-2 ${
                  theme.border
                } bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center transition-all duration-500 ${
                  isSelected ? 'ring-4 ring-amber-300 shadow-2xl ' + theme.glow : ''
                } ${box.status === 'opened_loser' ? 'opacity-50 grayscale-40' : ''}`}
              >
                {/* Dây ruy băng nơ ngang & dọc */}
                <div
                  className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 sm:w-8 ${theme.ribbon} shadow-sm z-0 opacity-90`}
                />
                <div
                  className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 sm:h-8 ${theme.ribbon} shadow-sm z-0 opacity-90`}
                />

                {/* NẮP HỘP QUÀ */}
                <div
                  className={`absolute -top-4 w-44 sm:w-52 h-10 rounded-xl bg-gradient-to-r ${
                    theme.lidGradient
                  } border-2 ${theme.border} shadow-lg z-10 flex items-center justify-center transition-all duration-700 ${
                    isOpenedWinner
                      ? '-translate-y-16 rotate-12 opacity-80'
                      : isOpenedLoser
                        ? '-translate-y-8 -rotate-6 opacity-60'
                        : isSelected
                          ? 'animate-pulse'
                          : ''
                  }`}
                >
                  {/* Cục nơ hoa trên nắp */}
                  <div className="absolute -top-3 w-8 h-8 rounded-full bg-amber-300 border border-amber-400 shadow flex items-center justify-center text-xs">
                    🎀
                  </div>
                </div>

                {/* Huy hiệu số thứ tự hộp quà ở giữa */}
                <div className="z-10 w-12 h-12 rounded-full bg-slate-950/80 border-2 border-amber-300/80 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xs text-amber-300 font-mono font-black">#{idx + 1}</span>
                </div>

                {/* Nhãn trạng thái bên dưới hộp */}
                <div className="absolute bottom-2 z-10 text-[10px] font-black uppercase tracking-wider text-white drop-shadow">
                  {isOpenedWinner
                    ? '✨ MỞ HỘP ✨'
                    : isOpenedLoser
                      ? 'ĐÃ MỞ'
                      : isSelected
                        ? '👉 ĐÃ CHỌN'
                        : theme.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
