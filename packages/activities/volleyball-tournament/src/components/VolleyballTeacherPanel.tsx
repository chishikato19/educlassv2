import React from 'react';
import type { VolleyballIntent, VolleyballTournamentState } from '../volleyball-schemas.js';

export interface TeacherPanelProps {
  runId: string;
  state: VolleyballTournamentState;
  onSendIntent: (intent: VolleyballIntent) => void;
  onEndActivity?: () => void;
}

export const VolleyballTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const isIntermission = state.status === 'pool_stage_intermission';
  const isFinished = state.status === 'finished';

  const finishedMatchupsCount = state.activeMatchups.filter(
    m => m.player1Answered && m.player2Answered
  ).length;
  const totalMatchupsCount = state.activeMatchups.length;

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 select-none">
      {/* Top Banner Điều Khiển */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏐</span>
            <h2 className="text-lg font-black text-slate-800">{state.title}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {state.currentStage === 'pools' ? 'Vòng Bảng' : 'Vòng Xếp Hạng 4 Cúp'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
            <span>Lượt đấu: <b>{state.currentRound}/5</b></span>
            <span>Tiến độ bàn: <b>{finishedMatchupsCount}/{totalMatchupsCount} bàn xong</b></span>
          </div>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex items-center gap-2">
          {isIntermission ? (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'start_brackets' })}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>🏆</span>
              <span>BẮT ĐẦU VÒNG 4 CÚP</span>
            </button>
          ) : !isFinished ? (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'next_round' })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              {state.currentRound < 3
                ? 'Sang Lượt Sau'
                : state.currentRound === 3
                ? 'Tổng Kết Vòng Bảng'
                : state.currentRound === 4
                ? 'Vào Chung Kết Cúp'
                : 'Tổng Kết Chung Cuộc'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEndActivity}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              Đóng Hoạt Động & Lưu Điểm
            </button>
          )}

          {!isFinished && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'force_finish' })}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl"
            >
              Kết thúc sớm
            </button>
          )}
        </div>
      </div>

      {/* Nội dung chính: Tình hình các bảng hoặc các Cúp */}
      <div className="flex-1 overflow-y-auto">
        {state.currentStage === 'pools' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(state.pools).map(pool => (
              <div
                key={pool.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <span className="font-black text-slate-800 text-base">{pool.name}</span>
                    <span className="text-xs text-slate-400">{pool.playerIds.length} bạn</span>
                  </div>

                  {/* Danh sách học sinh và điểm vòng bảng */}
                  <div className="space-y-1.5 mb-4">
                    {pool.standings.map(s => (
                      <div
                        key={s.participantId}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50"
                      >
                        <span className="font-medium text-slate-700">
                          #{s.rankInPool} {s.displayName}
                        </span>
                        <span className="font-bold text-blue-600">{s.tournamentPoints}đ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Các cặp đấu của bảng này trong lượt hiện tại */}
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Bàn đấu lượt này
                  </div>
                  {state.activeMatchups
                    .filter(m => m.poolId === pool.id)
                    .map(m => {
                      const p1 = state.participants[m.player1Id];
                      const p2 = state.participants[m.player2Id];
                      const done = m.player1Answered && m.player2Answered;
                      return (
                        <div
                          key={m.tableNumber}
                          className={`py-1 px-2 rounded mb-1 text-[11px] flex items-center justify-between ${
                            done ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          <span>
                            Bàn {m.tableNumber}: {p1?.displayName} vs {p2?.displayName}
                          </span>
                          <span className="font-bold">
                            {done ? `${m.player1Score} - ${m.player2Score}` : '...'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Giai đoạn Vòng Xếp Hạng 4 Cúp */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['diamond', 'gold', 'silver', 'bronze'] as const).map(tierKey => {
              const tierName =
                tierKey === 'diamond'
                  ? 'Cúp Kim Cương (Vô địch)'
                  : tierKey === 'gold'
                  ? 'Cúp Vàng (Top 2)'
                  : tierKey === 'silver'
                  ? 'Cúp Bạc (Top 3)'
                  : 'Cúp Đồng (Khuyến khích)';
              const tierColor =
                tierKey === 'diamond'
                  ? 'border-amber-300 bg-amber-50/50'
                  : tierKey === 'gold'
                  ? 'border-yellow-200 bg-yellow-50/50'
                  : tierKey === 'silver'
                  ? 'border-slate-200 bg-slate-50/50'
                  : 'border-orange-200 bg-orange-50/50';

              return (
                <div
                  key={tierKey}
                  className={`border-2 rounded-2xl p-4 shadow-sm flex flex-col justify-between ${tierColor}`}
                >
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                      <span>🏆</span>
                      <span>{tierName}</span>
                    </h3>

                    {/* Danh sách trận đấu trong Cúp này */}
                    <div className="space-y-2">
                      {state.activeMatchups
                        .filter(m => m.tier === tierKey)
                        .map(m => {
                          const p1 = state.participants[m.player1Id];
                          const p2 = state.participants[m.player2Id];
                          const isDone = m.player1Answered && m.player2Answered;
                          return (
                            <div
                              key={m.tableNumber}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-xs"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span>Bàn {m.tableNumber}</span>
                                <span className="uppercase font-bold text-blue-600">
                                  {m.matchType === 'final'
                                    ? 'Chung Kết'
                                    : m.matchType === 'third_place'
                                    ? 'Tranh Hạng 3'
                                    : 'Bán Kết'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{p1?.displayName || 'P1'}</span>
                                <span className="text-blue-600 px-1">
                                  {isDone ? `${m.player1Score} - ${m.player2Score}` : 'vs'}
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
