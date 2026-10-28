import React from 'react';
import type { FactionDuelState } from '../faction-schemas.js';

export interface TeacherPanelProps {
  runId: string;
  state: FactionDuelState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
}

export const FactionDuelTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const completedMatchups = state.currentMatchups.filter(m => m.status === 'completed');
  const totalMatchups = state.currentMatchups.length;

  const handleNextRound = () => {
    onSendIntent({ type: 'next_round' });
  };

  const handleSkipPick = () => {
    onSendIntent({ type: 'skip_pick_phase' });
  };

  const handleAddTime = (seconds: number) => {
    onSendIntent({ type: 'add_time', seconds });
  };

  const handleFinish = () => {
    if (
      window.confirm(
        'Thầy/Cô có chắc chắn muốn kết thúc trận Đại Chiến Xanh Đỏ ngay bây giờ không?'
      )
    ) {
      onSendIntent({ type: 'finish' });
      onEndActivity();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white max-w-5xl mx-auto shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl">
            ⚔️
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{state.title || 'Đại Chiến Xanh Đỏ'}</h2>
            <p className="text-xs text-slate-400">
              Lượt {state.currentRound}/{state.totalRounds} • {state.questionsPerMatch} câu/trận •
              Trạng thái:{' '}
              <span className="font-bold text-amber-400">
                {state.status === 'round_active'
                  ? 'Đang làm bài'
                  : state.status === 'pick_phase'
                    ? 'Đang chọn đối thủ'
                    : state.status === 'round_eval'
                      ? 'Tổng kết lượt'
                      : state.status === 'finished'
                        ? 'Đã kết thúc'
                        : state.status}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {state.status === 'pick_phase' && (
            <button
              onClick={handleSkipPick}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs transition active:scale-95 shadow-md"
            >
              ⏩ Bỏ qua 15s (Vào đấu ngay)
            </button>
          )}

          {state.status === 'round_active' && (
            <button
              onClick={handleNextRound}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-md"
            >
              ⚡ Thu bài & Đánh giá ngay
            </button>
          )}

          {(state.status === 'round_eval' || state.status === 'pick_phase') && (
            <button
              onClick={handleNextRound}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-md"
            >
              ▶️ Sang Lượt Tiếp Theo
            </button>
          )}

          <button
            onClick={() => handleAddTime(30)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition border border-slate-700"
          >
            +30s
          </button>

          <button
            onClick={handleFinish}
            className="px-3.5 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition active:scale-95"
          >
            🏁 Kết Thúc Trận
          </button>
        </div>
      </div>

      {/* Score Tug-of-War Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5">
        <div className="flex items-center justify-between text-sm font-black mb-2">
          <span className="text-blue-400">🔵 PHE XANH: {state.scoreBlue.toFixed(1)}đ</span>
          <span className="text-xs text-slate-400 font-normal">
            Tiến độ hoàn thành: {completedMatchups.length}/{totalMatchups} bàn
          </span>
          <span className="text-red-400">🔴 PHE ĐỎ: {state.scoreRed.toFixed(1)}đ</span>
        </div>
      </div>

      {/* Live Matchups List */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Danh sách các bàn đấu 1v1 lượt này ({state.currentMatchups.length} bàn)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {state.currentMatchups.map((m, idx) => {
            const blue = state.teamBlue.find(p => p.participantId === m.blueParticipantId);
            const red = state.teamRed.find(p => p.participantId === m.redParticipantId);
            const isDone = m.status === 'completed';

            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                  isDone ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex-1 truncate">
                  <p className="font-bold text-blue-300 truncate">{blue?.displayName || 'Xanh'}</p>
                  <p className="text-[10px] text-slate-400">Elo {blue?.elo}</p>
                </div>

                <div className="px-2 text-center shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono block">Bàn {idx + 1}</span>
                  {isDone ? (
                    <span className="font-black text-amber-400 text-[11px]">
                      {m.winner === 'blue' ? 'Xanh thắng' : m.winner === 'red' ? 'Đỏ thắng' : 'Hòa'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Đang làm bài</span>
                  )}
                </div>

                <div className="flex-1 text-right truncate">
                  <p className="font-bold text-red-300 truncate">{red?.displayName || 'Đỏ'}</p>
                  <p className="text-[10px] text-slate-400">Elo {red?.elo}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
