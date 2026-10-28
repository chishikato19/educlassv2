import React from 'react';
import type { ArcadeDuelState } from '../arcade-duel-schemas.js';
import { CombatFeedBar } from './CombatFeedBar.js';
import { PowerUpQueueBar } from './PowerUpQueueBar.js';
import { isPlayerFrozen, isPlayerSmoked, hasActiveShield } from '@educlass/core';

interface SyncTurnViewProps {
  state: ArcadeDuelState;
  onSelectOption: (teamId: 'blue' | 'red', optionIndex: number) => void;
  onUsePowerUp: (teamId: 'blue' | 'red') => void;
  onNextQuestion: () => void;
}

export const SyncTurnView: React.FC<SyncTurnViewProps> = ({
  state,
  onSelectOption,
  onUsePowerUp,
  onNextQuestion,
}) => {
  const currentQ = state.questions[state.currentQuestionIndex];
  const isReview = state.status === 'question_review';
  const now = Date.now();

  const blueFrozen = isPlayerFrozen(state.bluePlayer.activeEffects, now);
  const redFrozen = isPlayerFrozen(state.redPlayer.activeEffects, now);

  const blueSmoked = isPlayerSmoked(state.bluePlayer.activeEffects, now);
  const redSmoked = isPlayerSmoked(state.redPlayer.activeEffects, now);

  const blueHasShield = hasActiveShield(state.bluePlayer.activeEffects, now);
  const redHasShield = hasActiveShield(state.redPlayer.activeEffects, now);

  const blueKeyLabels = ['A', 'S', 'D', 'F'];
  const redKeyLabels = ['1', '2', '3', '4'];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* 1. THANH TIÊU ĐỀ & COMBAT FEED */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-xs font-black uppercase tracking-wider text-white shadow-xs">
            1VS1 CÙNG TRẢ LỜI
          </span>
          <span className="text-sm font-bold text-slate-300">
            Câu {state.currentQuestionIndex + 1} / {state.totalQuestions}
          </span>
        </div>

        <div className="flex-1 max-w-2xl">
          <CombatFeedBar
            events={state.combatFeed}
            enablePowerUps={state.config.enablePowerUps !== false}
          />
        </div>

        {/* ĐỒNG HỒ ĐẾM NGƯỢC */}
        <div className="flex items-center gap-3">
          {isReview ? (
            <button
              onClick={onNextQuestion}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-500/30 flex items-center gap-1.5 transition-all transform hover:scale-105"
            >
              <span>Câu tiếp theo</span>
              <span>➔</span>
            </button>
          ) : (
            <div
              className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 font-mono font-black text-sm ${
                state.timeRemaining <= 5
                  ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-amber-300'
              }`}
            >
              <span>⏱️</span>
              <span>{state.timeRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. PHẦN TRÊN: CÂU HỎI CHUNG (CHIẾM ~35% CHIỀU CAO) */}
      <div className="p-6 bg-slate-900/60 border-b border-slate-800 flex flex-col items-center justify-center text-center shrink-0 min-h-[160px]">
        {currentQ ? (
          <>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed max-w-4xl">
              {currentQ.stem}
            </h2>
            {currentQ.image && (
              <img
                src={currentQ.image}
                alt="Hình minh họa"
                className="mt-3 max-h-36 rounded-lg object-contain shadow-md"
              />
            )}
          </>
        ) : (
          <p className="text-slate-400">Đang tải câu hỏi...</p>
        )}
      </div>

      {/* 3. PHẦN DƯỚI: CHIA ĐÔI CHO 2 ĐỘI (CHIẾM ~65% CHIỀU CAO) */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
        {/* ================= CỘT TRÁI: ĐỘI XANH ================= */}
        <div
          className={`flex flex-col p-5 bg-gradient-to-b from-blue-950/20 to-slate-950 relative transition-all ${
            blueHasShield ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10' : ''
          }`}
        >
          {/* Lớp phủ đóng băng hoặc khói */}
          {blueFrozen.frozen && (
            <div className="absolute inset-0 z-30 bg-cyan-950/70 backdrop-blur-[2px] border-2 border-cyan-400 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl animate-bounce">❄️</span>
              <p className="text-cyan-200 font-extrabold text-lg">
                ĐANG BỊ ĐÓNG BĂNG ({Math.ceil(blueFrozen.remainingMs / 1000)}s)
              </p>
              <p className="text-cyan-300 text-xs">Bàn phím tạm thời bị khóa!</p>
            </div>
          )}
          {blueSmoked.smoked && (
            <div className="absolute inset-0 z-20 bg-slate-900/85 backdrop-blur-md flex items-center justify-center">
              <p className="text-slate-300 font-bold text-sm animate-pulse">
                🌫️ Màn khói che mờ tầm nhìn!
              </p>
            </div>
          )}

          {/* Header Đội Xanh */}
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
              <h3 className="font-extrabold text-lg text-blue-300">{state.bluePlayer.teamName}</h3>
              {state.bluePlayer.streak > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  🔥 x{state.bluePlayer.streak}
                </span>
              )}
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {state.bluePlayer.score} <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>

          {/* Túi đồ Đội Xanh */}
          {state.config.enablePowerUps !== false && (
            <div className="py-2.5">
              <PowerUpQueueBar
                inventory={state.bluePlayer.inventory}
                keyLabel="Q"
                themeColor="blue"
                onUsePowerUp={() => onUsePowerUp('blue')}
              />
            </div>
          )}

          {/* 4 Phương án Đội Xanh */}
          <div className="flex-1 grid grid-cols-1 gap-2.5 mt-2">
            {state.bluePlayer.currentOptions.map((opt, idx) => {
              const isEliminated = state.bluePlayer.eliminatedIndices.includes(idx);
              const isSelected = state.bluePlayer.selectedOptionIndex === idx;
              const isCorrectOpt = idx === state.bluePlayer.currentCorrectIndex;

              let btnClass =
                'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-blue-500 hover:bg-blue-950/40';

              if (isEliminated) {
                btnClass =
                  'opacity-30 line-through border-transparent bg-slate-900 text-slate-600 pointer-events-none';
              } else if (isReview) {
                if (isCorrectOpt) {
                  btnClass =
                    'border-emerald-500 bg-emerald-950/80 text-emerald-200 ring-2 ring-emerald-500/50';
                } else if (isSelected) {
                  btnClass = 'border-red-500 bg-red-950/80 text-red-200 line-through';
                }
              } else if (isSelected) {
                btnClass = 'border-blue-400 bg-blue-600/60 text-white ring-2 ring-blue-400';
              }

              return (
                <button
                  key={idx}
                  disabled={isEliminated || state.bluePlayer.isLockedIn || isReview}
                  onClick={() => onSelectOption('blue', idx)}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left group relative ${btnClass}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 font-mono font-black text-sm flex items-center justify-center border border-blue-500/40 shrink-0">
                    {blueKeyLabels[idx]}
                  </span>
                  <span className="font-semibold text-base flex-1">{opt}</span>
                  {isSelected && !isReview && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400 text-blue-950 font-bold">
                      🔒 Đã chốt
                    </span>
                  )}
                  {isReview && isCorrectOpt && <span className="text-emerald-400 text-lg">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= CỘT PHẢI: ĐỘI ĐỎ ================= */}
        <div
          className={`flex flex-col p-5 bg-gradient-to-b from-red-950/20 to-slate-950 relative transition-all ${
            redHasShield ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10' : ''
          }`}
        >
          {/* Lớp phủ đóng băng hoặc khói */}
          {redFrozen.frozen && (
            <div className="absolute inset-0 z-30 bg-cyan-950/70 backdrop-blur-[2px] border-2 border-cyan-400 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl animate-bounce">❄️</span>
              <p className="text-cyan-200 font-extrabold text-lg">
                ĐANG BỊ ĐÓNG BĂNG ({Math.ceil(redFrozen.remainingMs / 1000)}s)
              </p>
              <p className="text-cyan-300 text-xs">Bàn phím tạm thời bị khóa!</p>
            </div>
          )}
          {redSmoked.smoked && (
            <div className="absolute inset-0 z-20 bg-slate-900/85 backdrop-blur-md flex items-center justify-center">
              <p className="text-slate-300 font-bold text-sm animate-pulse">
                🌫️ Màn khói che mờ tầm nhìn!
              </p>
            </div>
          )}

          {/* Header Đội Đỏ */}
          <div className="flex items-center justify-between pb-3 border-b border-red-900/40">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
              <h3 className="font-extrabold text-lg text-red-300">{state.redPlayer.teamName}</h3>
              {state.redPlayer.streak > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  🔥 x{state.redPlayer.streak}
                </span>
              )}
            </div>
            <div className="text-2xl font-black font-mono text-red-400">
              {state.redPlayer.score} <span className="text-xs text-slate-400">điểm</span>
            </div>
          </div>

          {/* Túi đồ Đội Đỏ */}
          {state.config.enablePowerUps !== false && (
            <div className="py-2.5">
              <PowerUpQueueBar
                inventory={state.redPlayer.inventory}
                keyLabel="5"
                themeColor="red"
                onUsePowerUp={() => onUsePowerUp('red')}
              />
            </div>
          )}

          {/* 4 Phương án Đội Đỏ */}
          <div className="flex-1 grid grid-cols-1 gap-2.5 mt-2">
            {state.redPlayer.currentOptions.map((opt, idx) => {
              const isEliminated = state.redPlayer.eliminatedIndices.includes(idx);
              const isSelected = state.redPlayer.selectedOptionIndex === idx;
              const isCorrectOpt = idx === state.redPlayer.currentCorrectIndex;

              let btnClass =
                'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-red-500 hover:bg-red-950/40';

              if (isEliminated) {
                btnClass =
                  'opacity-30 line-through border-transparent bg-slate-900 text-slate-600 pointer-events-none';
              } else if (isReview) {
                if (isCorrectOpt) {
                  btnClass =
                    'border-emerald-500 bg-emerald-950/80 text-emerald-200 ring-2 ring-emerald-500/50';
                } else if (isSelected) {
                  btnClass = 'border-red-500 bg-red-950/80 text-red-200 line-through';
                }
              } else if (isSelected) {
                btnClass = 'border-red-400 bg-red-600/60 text-white ring-2 ring-red-400';
              }

              return (
                <button
                  key={idx}
                  disabled={isEliminated || state.redPlayer.isLockedIn || isReview}
                  onClick={() => onSelectOption('red', idx)}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left group relative ${btnClass}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 font-mono font-black text-sm flex items-center justify-center border border-red-500/40 shrink-0">
                    {redKeyLabels[idx]}
                  </span>
                  <span className="font-semibold text-base flex-1">{opt}</span>
                  {isSelected && !isReview && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-400 text-red-950 font-bold">
                      🔒 Đã chốt
                    </span>
                  )}
                  {isReview && isCorrectOpt && <span className="text-emerald-400 text-lg">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
