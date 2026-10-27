import React from 'react';
import type { VolleyballTournamentState } from '../volleyball-schemas.js';

export interface ProjectorViewProps {
  state: VolleyballTournamentState;
}

export const VolleyballProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const isFinished = state.status === 'finished';

  // 1. Màn hình Vinh danh khi KẾT THÚC GIẢI
  if (isFinished) {
    const d1 = state.finalStandings.find(s => s.tier === 'diamond' && s.rank === 1);
    const d2 = state.finalStandings.find(s => s.tier === 'diamond' && s.rank === 2);
    const d3 = state.finalStandings.find(s => s.tier === 'diamond' && s.rank === 3);
    const g1 = state.finalStandings.find(s => s.tier === 'gold' && s.rank === 5);
    const s1 = state.finalStandings.find(s => s.tier === 'silver');
    const b1 = state.finalStandings.find(s => s.tier === 'bronze');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-8 select-none">
        <div className="text-5xl md:text-6xl mb-4 animate-bounce">🏐🏆✨</div>
        <h1 className="text-3xl md:text-5xl font-black text-amber-300 tracking-wider mb-2 uppercase">
          TỔNG KẾT & VINH DANH GIẢI ĐẤU
        </h1>
        <p className="text-lg text-slate-300 mb-10">{state.title}</p>

        {/* Bục Vinh Danh Top 3 Toàn Lớp (Cúp Kim Cương) */}
        <div className="flex items-end justify-center gap-6 max-w-4xl w-full mb-12">
          {/* Hạng 2 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-xl font-bold text-slate-200 mb-2 truncate max-w-[180px]">
              {d2?.displayName || 'Á Quân'}
            </div>
            <div className="w-full bg-slate-700/80 border-t-4 border-slate-300 rounded-t-2xl h-44 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-slate-200">#2</span>
              <span className="text-xs text-slate-300 font-semibold mt-1">Á Quân Cúp Kim Cương</span>
            </div>
          </div>

          {/* Hạng 1 (Quán Quân) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-1">👑</div>
            <div className="text-2xl font-black text-amber-300 mb-2 truncate max-w-[220px]">
              {d1?.displayName || 'Vô Địch'}
            </div>
            <div className="w-full bg-gradient-to-t from-amber-600/90 to-yellow-500 border-t-4 border-amber-200 rounded-t-2xl h-60 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-5xl font-black text-amber-950">#1</span>
              <span className="text-sm font-black text-amber-950 mt-1 uppercase tracking-wider">
                QUÁN QUÂN TOÀN LỚP
              </span>
            </div>
          </div>

          {/* Hạng 3 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-xl font-bold text-amber-600/90 mb-2 truncate max-w-[180px]">
              {d3?.displayName || 'Hạng Ba'}
            </div>
            <div className="w-full bg-amber-950/80 border-t-4 border-amber-700 rounded-t-2xl h-36 flex flex-col items-center justify-center shadow-lg">
              <span className="text-2xl font-black text-amber-300">#3</span>
              <span className="text-xs text-amber-200/80 font-semibold mt-1">Hạng Ba Kim Cương</span>
            </div>
          </div>
        </div>

        {/* Vinh danh Quán quân các Cúp khác */}
        <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-yellow-400/30 text-center">
            <div className="text-xs text-yellow-300 font-bold uppercase tracking-wider mb-1">
              Vô Địch Cúp Vàng
            </div>
            <div className="text-lg font-bold text-white truncate">{g1?.displayName || '—'}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-slate-300/30 text-center">
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">
              Vô Địch Cúp Bạc
            </div>
            <div className="text-lg font-bold text-white truncate">{s1?.displayName || '—'}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-orange-400/30 text-center">
            <div className="text-xs text-orange-300 font-bold uppercase tracking-wider mb-1">
              Vô Địch Cúp Đồng
            </div>
            <div className="text-lg font-bold text-white truncate">{b1?.displayName || '—'}</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Màn hình THI ĐẤU TRỰC TIẾP (Vòng Bảng & Vòng Playoff)
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white p-6 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🏐</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-blue-400 uppercase">
              {state.title}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {state.currentStage === 'pools' ? 'Giai đoạn 1: Thi Đấu Vòng Bảng' : 'Giai đoạn 2: Vòng Bắt Cặp Xếp Hạng 4 Cúp'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Tiến trình</div>
            <div className="text-lg font-black text-amber-400">LƯỢT {state.currentRound}/5</div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1">
        {state.currentStage === 'pools' ? (
          /* Vòng Bảng: Hiển thị các cột Bảng A, B, C, D... */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.values(state.pools).map(pool => (
              <div
                key={pool.id}
                className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
                    <span className="text-xl font-black text-amber-300">{pool.name}</span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-2.5 py-1 rounded-full border border-blue-400/30">
                      {pool.playerIds.length} bạn
                    </span>
                  </div>

                  {/* BXH nội bộ bảng */}
                  <div className="space-y-2 mb-6">
                    {pool.standings.map(s => (
                      <div
                        key={s.participantId}
                        className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl text-sm border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                            #{s.rankInPool}
                          </span>
                          <span className="font-semibold text-slate-200">{s.displayName}</span>
                        </div>
                        <span className="font-black text-amber-400">{s.tournamentPoints}đ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Các bàn đấu đang diễn ra trong bảng */}
                <div className="pt-3 border-t border-slate-700">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Các trận lượt này
                  </div>
                  <div className="space-y-2">
                    {state.activeMatchups
                      .filter(m => m.poolId === pool.id)
                      .map(m => {
                        const p1 = state.participants[m.player1Id];
                        const p2 = state.participants[m.player2Id];
                        const done = m.player1Answered && m.player2Answered;
                        return (
                          <div
                            key={m.tableNumber}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              done
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="font-bold text-slate-300">
                              {p1?.displayName} vs {p2?.displayName}
                            </span>
                            <span className="font-black text-sm px-2 py-0.5 rounded bg-black/30">
                              {done ? `${m.player1Score} - ${m.player2Score}` : 'Đang đấu'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vòng Bắt Cặp Xếp Hạng 4 Cúp */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['diamond', 'gold', 'silver', 'bronze'] as const).map(tierKey => {
              const tierName =
                tierKey === 'diamond'
                  ? 'CÚP KIM CƯƠNG'
                  : tierKey === 'gold'
                  ? 'CÚP VÀNG'
                  : tierKey === 'silver'
                  ? 'CÚP BẠC'
                  : 'CÚP ĐỒNG';
              const tierBorder =
                tierKey === 'diamond'
                  ? 'border-amber-400/60 bg-amber-950/20'
                  : tierKey === 'gold'
                  ? 'border-yellow-400/40 bg-yellow-950/20'
                  : tierKey === 'silver'
                  ? 'border-slate-400/40 bg-slate-900/40'
                  : 'border-orange-500/40 bg-orange-950/20';

              return (
                <div
                  key={tierKey}
                  className={`border-2 rounded-3xl p-5 shadow-2xl flex flex-col justify-between ${tierBorder}`}
                >
                  <div>
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-700">
                      <span className="text-2xl">🏆</span>
                      <span className="text-lg font-black tracking-wide text-amber-300">
                        {tierName}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {state.activeMatchups
                        .filter(m => m.tier === tierKey)
                        .map(m => {
                          const p1 = state.participants[m.player1Id];
                          const p2 = state.participants[m.player2Id];
                          const done = m.player1Answered && m.player2Answered;
                          return (
                            <div
                              key={m.tableNumber}
                              className="bg-slate-900/90 border border-slate-700 rounded-2xl p-3 text-xs"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 uppercase font-bold">
                                <span>Bàn {m.tableNumber}</span>
                                <span className="text-amber-400">
                                  {m.matchType === 'final'
                                    ? 'Chung Kết'
                                    : m.matchType === 'third_place'
                                    ? 'Tranh Hạng 3'
                                    : 'Bán Kết'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between font-bold text-sm text-slate-200">
                                <span>{p1?.displayName || 'P1'}</span>
                                <span className="text-amber-400 text-base font-black px-2">
                                  {done ? `${m.player1Score} - ${m.player2Score}` : 'vs'}
                                </span>
                                <span>{p2?.displayName || 'P2'}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
