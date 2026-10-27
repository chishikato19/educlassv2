import React from 'react';
import type { FactionDuelState } from '../faction-schemas.js';

export interface ProjectorViewProps {
  runId: string;
  state: FactionDuelState;
}

export const FactionDuelProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const totalScore = state.scoreBlue + state.scoreRed;
  const blueRatio = totalScore > 0 ? Math.round((state.scoreBlue / totalScore) * 100) : 50;
  const redRatio = 100 - blueRatio;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* 1. Header & Stage Info */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl shadow-lg">
            ⚔️
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">
              {state.title || 'ĐẠI CHIẾN XANH ĐỎ'}
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              Lượt {state.currentRound} / {state.totalRounds} • Mỗi trận {state.questionsPerMatch} câu
            </p>
          </div>
        </div>

        {/* Phase Indicator Badge */}
        <div className="flex items-center gap-3">
          {state.status === 'pick_phase' && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-400/50 px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 animate-pulse">
              <span>🎯 PHA CHỌN ĐỐI THỦ</span>
            </div>
          )}
          {state.status === 'round_active' && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>ĐỒNG LOẠT LÀM BÀI</span>
            </div>
          )}
          {state.status === 'finished' && (
            <div className="bg-amber-400 text-slate-950 px-4 py-1.5 rounded-full text-sm font-black shadow-lg">
              🏆 TỔNG KẾT CHIẾN TRƯỜNG
            </div>
          )}
        </div>
      </div>

      {/* 2. Tug-of-War Score Bar (Thanh Kéo Co Điểm Số) */}
      <div className="my-6">
        <div className="flex items-center justify-between mb-2 px-2">
          {/* Blue team info */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-blue-400 tracking-wider">
              {state.scoreBlue.toFixed(1)}
            </span>
            <div>
              <span className="text-sm font-black text-blue-300 uppercase tracking-widest block">
                PHE XANH DƯƠNG
              </span>
              <span className="text-xs text-slate-400">{state.teamBlue.length} đấu thủ</span>
            </div>
          </div>

          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            KÉO CO NĂNG LƯỢNG
          </span>

          {/* Red team info */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-sm font-black text-red-300 uppercase tracking-widest block">
                PHE ĐỎ HỎA DIỆM
              </span>
              <span className="text-xs text-slate-400">{state.teamRed.length} đấu thủ</span>
            </div>
            <span className="text-3xl font-black text-red-400 tracking-wider">
              {state.scoreRed.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Thanh kéo co */}
        <div className="h-8 w-full bg-slate-900 rounded-2xl overflow-hidden p-1 border-2 border-slate-800 flex shadow-2xl relative">
          <div
            className="h-full bg-linear-to-r from-blue-600 to-cyan-400 rounded-l-xl transition-all duration-700 ease-out flex items-center justify-start pl-3 text-xs font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            style={{ width: `${blueRatio}%` }}
          >
            {blueRatio > 15 && `${blueRatio}%`}
          </div>
          <div
            className="h-full bg-linear-to-r from-rose-500 to-red-600 rounded-r-xl transition-all duration-700 ease-out flex items-center justify-end pr-3 text-xs font-black text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
            style={{ width: `${redRatio}%` }}
          >
            {redRatio > 15 && `${redRatio}%`}
          </div>
          {/* Kim chỉ trung tâm */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/70 shadow-[0_0_8px_white] -translate-x-1/2" />
        </div>
      </div>

      {/* 3. Lưới Các Bàn Đấu 1v1 (Live Matchups Grid) */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {state.currentMatchups.map((match, idx) => {
            const bluePlayer = state.teamBlue.find(m => m.participantId === match.blueParticipantId);
            const redPlayer = state.teamRed.find(m => m.participantId === match.redParticipantId);

            const isDone = match.status === 'completed';
            const blueAnswerCount = Object.keys(match.blueAnswers).length;
            const redAnswerCount = Object.keys(match.redAnswers).length;

            return (
              <div
                key={match.id}
                className={`p-3.5 rounded-2xl border transition relative overflow-hidden ${
                  isDone
                    ? match.winner === 'blue'
                      ? 'bg-blue-950/40 border-blue-500/40'
                      : match.winner === 'red'
                      ? 'bg-red-950/40 border-red-500/40'
                      : 'bg-slate-900 border-slate-700'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Underdog indicator */}
                {match.isUnderdogWin && (
                  <div className="absolute top-1 right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs animate-bounce">
                    🔥 LẬT KÈO +3đ
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold">Bàn {idx + 1}</span>
                  {match.isCloneMatch && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded-md">
                      Clone Song Hành
                    </span>
                  )}
                  {isDone ? (
                    <span className="text-[11px] font-bold text-amber-300">
                      {match.winner === 'blue'
                        ? '🔵 Xanh thắng'
                        : match.winner === 'red'
                        ? '🔴 Đỏ thắng'
                        : '🤝 Hòa'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Đang đấu...</span>
                  )}
                </div>

                {/* Matchup row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Blue side */}
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-blue-300 truncate">
                      {bluePlayer?.displayName || 'Xanh'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-slate-400">Elo {bluePlayer?.elo}</span>
                      {!isDone && (
                        <span className="text-[10px] text-blue-400 font-mono">
                          ({blueAnswerCount}/{state.questionsPerMatch})
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-600 px-1">vs</span>

                  {/* Red side */}
                  <div className="flex-1 text-right truncate">
                    <p className="text-xs font-bold text-red-300 truncate">
                      {redPlayer?.displayName || 'Đỏ'}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {!isDone && (
                        <span className="text-[10px] text-red-400 font-mono">
                          ({redAnswerCount}/{state.questionsPerMatch})
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">Elo {redPlayer?.elo}</span>
                    </div>
                  </div>
                </div>

                {/* Điểm được cộng */}
                {isDone && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-blue-400 font-bold">+{match.awardedPoints.blue}đ</span>
                    <span className="text-red-400 font-bold">+{match.awardedPoints.red}đ</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Footer Note */}
      <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-800">
        Đại Chiến Xanh Đỏ • EduClass v2 Realtime Classroom
      </div>
    </div>
  );
};
