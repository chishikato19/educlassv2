import React from 'react';
import type { RandomPickerModeProps } from '../types.js';

const MINI_GAMES = [
  {
    icon: '🃏',
    name: 'Lật thẻ bài',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-400/40 text-amber-200',
  },
  {
    icon: '🎁',
    name: 'Hộp quà bí mật',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-400/40 text-pink-200',
  },
  {
    icon: '🎰',
    name: 'Máy quay số',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-200',
  },
  {
    icon: '📜',
    name: 'Cuộn họ tên',
    color: 'from-sky-500/20 to-indigo-500/20 border-sky-400/40 text-sky-200',
  },
  {
    icon: '🎈',
    name: 'Bắn bóng bay',
    color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/40 text-purple-200',
  },
  {
    icon: '🔮',
    name: 'Bài ma thuật',
    color: 'from-violet-500/20 to-indigo-500/20 border-violet-400/40 text-violet-200',
  },
  {
    icon: '🦆',
    name: 'Đua vịt',
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/40 text-yellow-200',
  },
  {
    icon: '🎯',
    name: 'Bắn vịt',
    color: 'from-red-500/20 to-orange-500/20 border-red-400/40 text-red-200',
  },
  {
    icon: '⚔️',
    name: 'Sinh tồn',
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/40 text-cyan-200',
  },
  {
    icon: '⚪',
    name: 'Đua bi Pinball',
    color: 'from-slate-500/20 to-indigo-500/20 border-slate-400/40 text-slate-200',
  },
];

export const RandomWelcomeStage: React.FC<RandomPickerModeProps> = ({
  candidates = [],
  isFullscreen = false,
}) => {
  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center px-4 transition-all ${
        isFullscreen ? 'py-8 sm:py-12' : 'py-6 sm:py-8'
      }`}
    >
      {/* Vòng hào quang xúc xắc 3D */}
      <div className="relative mb-5 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse" />
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-indigo-800/80 to-slate-900/90 border-2 border-amber-400/60 shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform">
          <span
            className="text-6xl sm:text-7xl select-none animate-bounce"
            style={{ animationDuration: '2.5s' }}
          >
            🎲
          </span>
          <span className="absolute -top-2 -right-2 text-xl animate-spin-slow">✨</span>
          <span className="absolute -bottom-1 -left-2 text-lg animate-pulse">🌟</span>
        </div>
      </div>

      {/* Huy hiệu và tiêu đề */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 shadow-inner mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
          Chế độ Ngẫu nhiên — Mỗi lượt 1 trò chơi bất ngờ
        </span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
        Sẵn Sàng Khởi Động Vòng Quay Bí Ẩn!
      </h2>

      <p className="text-sm sm:text-base text-indigo-200/90 max-w-xl mt-2 leading-relaxed font-medium">
        Mỗi lần bấm gọi, hệ thống sẽ tự động bốc ngẫu nhiên 1 trong 10 trò chơi hấp dẫn. Thầy/Cô hãy
        bấm nút <span className="text-amber-300 font-bold">"Học sinh đầu tiên"</span> bên dưới để mở
        màn!
      </p>

      {/* Lưới các mini-game có thể xuất hiện */}
      <div className="mt-6 w-full max-w-3xl">
        <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300/80 mb-2.5">
          10 Mini-game sẵn sàng trong danh sách ({candidates.length} học sinh)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {MINI_GAMES.map(game => (
            <div
              key={game.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${game.color} border backdrop-blur-sm shadow-sm transition hover:scale-105`}
            >
              <span className="text-lg select-none">{game.icon}</span>
              <span className="text-xs font-bold truncate">{game.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
