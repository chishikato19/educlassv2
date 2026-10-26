import React from 'react';
import type { ArcadeDuelState } from '../arcade-duel-schemas.js';
import { CombatFeedBar } from './CombatFeedBar.js';
import { PowerUpQueueBar } from './PowerUpQueueBar.js';
import { isPlayerFrozen, isPlayerSmoked, hasActiveShield } from '@educlass/core';

interface SpeedRaceViewProps {
  state: ArcadeDuelState;
  onSelectOption: (teamId: 'blue' | 'red', optionIndex: number) => void;
  onUsePowerUp: (teamId: 'blue' | 'red') => void;
}

export const SpeedRaceView: React.FC<SpeedRaceViewProps> = ({
  state,
  onSelectOption,
  onUsePowerUp,
}) => {
  const now = Date.now();

  const bluePlayer = state.bluePlayer;
  const redPlayer = state.redPlayer;

  const blueFrozen = isPlayerFrozen(bluePlayer.activeEffects, now);
  const redFrozen = isPlayerFrozen(redPlayer.activeEffects, now);

  const blueSmoked = isPlayerSmoked(bluePlayer.activeEffects, now);
  const redSmoked = isPlayerSmoked(redPlayer.activeEffects, now);

  const blueHasShield = hasActiveShield(bluePlayer.activeEffects, now);
  const redHasShield = hasActiveShield(redPlayer.activeEffects, now);

  const bluePenalty = bluePlayer.penaltyUntil && bluePlayer.penaltyUntil > now;
  const redPenalty = redPlayer.penaltyUntil && redPlayer.penaltyUntil > now;

  const blueQ = state.questions[bluePlayer.currentQuestionIndex];
  const redQ = state.questions[redPlayer.currentQuestionIndex];

  // Tính tỷ lệ thanh giằng co (Tug of war)
  const totalScore = bluePlayer.score + redPlayer.score;
  const bluePercent = totalScore > 0 ? Math.round((bluePlayer.score / totalScore) * 100) : 50;
  const redPercent = 100 - bluePercent;

  const blueKeyLabels = ['A', 'S', 'D', 'F'];
  const redKeyLabels = ['1', '2', '3', '4'];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* 1. THANH TIÊU ĐỀ & THANH GIẰNG CO (TUG-OF-WAR) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-xs font-black uppercase tracking-wider text-white shadow-xs">
              🏎️ ĐUA TỐC ĐỘ 1VS1
            </span>
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-slate-300">
              <span>⏱️ Thời gian:</span>
              <span className="text-amber-400 font-extrabold">{state.timeRemaining}s</span>
            </div>
          </div>

          <div className="flex-1 max-w-xl">
            <CombatFeedBar
              events={state.combatFeed}
              enablePowerUps={state.config.enablePowerUps !== false}
            />
          </div>

          <div className="text-xs font-bold text-slate-400">
            Gói {state.totalQuestions} câu hỏi
          </div>
        </div>

        {/* Thanh Giằng Co Tỉ Số */}
        <div className="w-full flex items-center gap-2">
          <span className="text-xs font-black font-mono text-blue-400 w-12 text-left">
            {bluePercent}%
          </span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner border border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 h-full"
              style={{ width: `${bluePercent}%` }}
            />
            <div
              className="bg-gradient-to-l from-red-600 to-red-400 transition-all duration-300 h-full"
              style={{ width: `${redPercent}%` }}
            />
          </div>
          <span className="text-xs font-black font-mono text-red-400 w-12 text-right">
            {redPercent}%
          </span>
        </div>
      </div>

      {/* 2. KHÔNG GIAN THI ĐẤU: CHIA ĐÔI 50/50 THEO CHIỀU DỌC */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
        {/* ================= NỬA TRÁI: ĐỘI XANH ================= */}
        <div
          className={`flex flex-col p-5 bg-gradient-to-b from-blue-950/20 to-slate-950 relative overflow-y-auto ${
            blueHasShield ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10' : ''
          }`}
        >
          {/* Lớp phủ đóng băng từ đối thủ */}
          {blueFrozen.frozen && (
            <div className="absolute inset-0 z-30 bg-cyan-950/70 backdrop-blur-[2px] border-2 border-cyan-400 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl animate-bounce">❄️</span>
              <p className="text-cyan-200 font-extrabold text-lg">
                BỊ ĐÓNG BĂNG ({Math.ceil(blueFrozen.remainingMs / 1000)}s)
              </p>
              <p className="text-cyan-300 text-xs">Bàn phím tạm dừng nhận lệnh!</p>
            </div>
          )}

          {/* Lớp phủ phạt khi làm sai 1.5s */}
          {bluePenalty && (
            <div className="absolute inset-0 z-30 bg-red-950/80 backdrop-blur-[2px] border-4 border-red-500 flex flex-col items-center justify-center gap-2 animate-pulse">
              <span className="text-5xl">⚠️</span>
              <p className="text-red-200 font-black text-xl">CHỌN SAI! TẠM DỪNG 1.5S</p>
              <p className="text-red-300 text-xs">Đang chuyển sang câu tiếp theo...</p>
            </div>
          )}

          {/* Lớp phủ bom khói */}
          {blueSmoked.smoked && (
            <div className="absolute inset-0 z-20 bg-slate-900/85 backdrop-blur-md flex items-center justify-center">
              <p className="text-slate-300 font-bold text-sm animate-pulse">
                🌫️ Màn khói che mờ tầm nhìn!
              </p>
            </div>
          )}

          {/* Header & Tiến độ Đội Xanh */}
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
                <h3 className="font-extrabold text-lg text-blue-300">
                  {bluePlayer.teamName}
                </h3>
                {bluePlayer.streak > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    🔥 x{bluePlayer.streak}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tiến độ: <span className="font-bold text-blue-300">{bluePlayer.currentQuestionIndex}</span> / {state.totalQuestions} câu
              </p>
            </div>
            <div className="text-3xl font-black font-mono text-blue-400">
              {bluePlayer.score} <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>

          {/* Túi đồ Đội Xanh */}
          {state.config.enablePowerUps !== false && (
            <div className="py-2.5">
              <PowerUpQueueBar
                inventory={bluePlayer.inventory}
                keyLabel="Q"
                themeColor="blue"
                onUsePowerUp={() => onUsePowerUp('blue')}
              />
            </div>
          )}

          {/* Nội dung câu hỏi Đội Xanh */}
          {bluePlayer.isCompleted ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/50 rounded-2xl border border-blue-500/30">
              <span className="text-5xl mb-2">🏁</span>
              <h4 className="text-xl font-black text-blue-300">ĐÃ HOÀN THÀNH BÀI THI!</h4>
              <p className="text-xs text-slate-400 mt-1">Đang chờ đối thủ về đích...</p>
            </div>
          ) : blueQ ? (
            <div className="flex-1 flex flex-col mt-2">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center mb-3">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
                  Câu {bluePlayer.currentQuestionIndex + 1}
                </span>
                <p className="text-lg font-bold text-white leading-relaxed">
                  {blueQ.stem}
                </p>
                {blueQ.image && (
                  <img
                    src={blueQ.image}
                    alt="Hình"
                    className="mt-2 max-h-24 mx-auto rounded-lg object-contain"
                  />
                )}
              </div>

              {/* 4 Phương án */}
              <div className="grid grid-cols-1 gap-2.5">
                {bluePlayer.currentOptions.map((opt, idx) => {
                  const isEliminated = bluePlayer.eliminatedIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      disabled={isEliminated || bluePenalty || blueFrozen.frozen}
                      onClick={() => onSelectOption('blue', idx)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left ${
                        isEliminated
                          ? 'opacity-25 line-through border-transparent bg-slate-900 text-slate-600'
                          : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-blue-400 hover:bg-blue-950/40 active:scale-98'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 font-mono font-black text-sm flex items-center justify-center border border-blue-500/40 shrink-0">
                        {blueKeyLabels[idx]}
                      </span>
                      <span className="font-semibold text-sm flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* ================= NỬA PHẢI: ĐỘI ĐỎ ================= */}
        <div
          className={`flex flex-col p-5 bg-gradient-to-b from-red-950/20 to-slate-950 relative overflow-y-auto ${
            redHasShield ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10' : ''
          }`}
        >
          {/* Lớp phủ đóng băng từ đối thủ */}
          {redFrozen.frozen && (
            <div className="absolute inset-0 z-30 bg-cyan-950/70 backdrop-blur-[2px] border-2 border-cyan-400 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl animate-bounce">❄️</span>
              <p className="text-cyan-200 font-extrabold text-lg">
                BỊ ĐÓNG BĂNG ({Math.ceil(redFrozen.remainingMs / 1000)}s)
              </p>
              <p className="text-cyan-300 text-xs">Bàn phím tạm dừng nhận lệnh!</p>
            </div>
          )}

          {/* Lớp phủ phạt khi làm sai 1.5s */}
          {redPenalty && (
            <div className="absolute inset-0 z-30 bg-red-950/80 backdrop-blur-[2px] border-4 border-red-500 flex flex-col items-center justify-center gap-2 animate-pulse">
              <span className="text-5xl">⚠️</span>
              <p className="text-red-200 font-black text-xl">CHỌN SAI! TẠM DỪNG 1.5S</p>
              <p className="text-red-300 text-xs">Đang chuyển sang câu tiếp theo...</p>
            </div>
          )}

          {/* Lớp phủ bom khói */}
          {redSmoked.smoked && (
            <div className="absolute inset-0 z-20 bg-slate-900/85 backdrop-blur-md flex items-center justify-center">
              <p className="text-slate-300 font-bold text-sm animate-pulse">
                🌫️ Màn khói che mờ tầm nhìn!
              </p>
            </div>
          )}

          {/* Header & Tiến độ Đội Đỏ */}
          <div className="flex items-center justify-between pb-3 border-b border-red-900/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
                <h3 className="font-extrabold text-lg text-red-300">
                  {redPlayer.teamName}
                </h3>
                {redPlayer.streak > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    🔥 x{redPlayer.streak}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tiến độ: <span className="font-bold text-red-300">{redPlayer.currentQuestionIndex}</span> / {state.totalQuestions} câu
              </p>
            </div>
            <div className="text-3xl font-black font-mono text-red-400">
              {redPlayer.score} <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>

          {/* Túi đồ Đội Đỏ */}
          {state.config.enablePowerUps !== false && (
            <div className="py-2.5">
              <PowerUpQueueBar
                inventory={redPlayer.inventory}
                keyLabel="5"
                themeColor="red"
                onUsePowerUp={() => onUsePowerUp('red')}
              />
            </div>
          )}

          {/* Nội dung câu hỏi Đội Đỏ */}
          {redPlayer.isCompleted ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/50 rounded-2xl border border-red-500/30">
              <span className="text-5xl mb-2">🏁</span>
              <h4 className="text-xl font-black text-red-300">ĐÃ HOÀN THÀNH BÀI THI!</h4>
              <p className="text-xs text-slate-400 mt-1">Đang chờ đối thủ về đích...</p>
            </div>
          ) : redQ ? (
            <div className="flex-1 flex flex-col mt-2">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center mb-3">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">
                  Câu {redPlayer.currentQuestionIndex + 1}
                </span>
                <p className="text-lg font-bold text-white leading-relaxed">
                  {redQ.stem}
                </p>
                {redQ.image && (
                  <img
                    src={redQ.image}
                    alt="Hình"
                    className="mt-2 max-h-24 mx-auto rounded-lg object-contain"
                  />
                )}
              </div>

              {/* 4 Phương án */}
              <div className="grid grid-cols-1 gap-2.5">
                {redPlayer.currentOptions.map((opt, idx) => {
                  const isEliminated = redPlayer.eliminatedIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      disabled={isEliminated || redPenalty || redFrozen.frozen}
                      onClick={() => onSelectOption('red', idx)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left ${
                        isEliminated
                          ? 'opacity-25 line-through border-transparent bg-slate-900 text-slate-600'
                          : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-red-400 hover:bg-red-950/40 active:scale-98'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 font-mono font-black text-sm flex items-center justify-center border border-red-500/40 shrink-0">
                        {redKeyLabels[idx]}
                      </span>
                      <span className="font-semibold text-sm flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
