import React, { useState, useEffect } from 'react';
import type {
  TerritoryTeacherIntent,
  TerritoryWarState,
} from '../territory-schemas.js';
import { TerritoryGrid } from './TerritoryGrid.js';
import { TerritoryProjectorView } from './TerritoryProjectorView.js';
import { getLeaderboardByTeam, getParticipantScore } from '../territory-logic.js';

export interface TeacherPanelProps {
  runId: string;
  state: TerritoryWarState;
  onSendIntent: (intent: TerritoryTeacherIntent) => void;
  onEndActivity: () => void;
}

export const TerritoryTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isProjectorOpen, setIsProjectorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (state.status === 'in_progress' && state.endTime) {
      const updateTimer = () => {
        const remainMs = Math.max(0, state.endTime! - Date.now());
        const totalSec = Math.floor(remainMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setTimeLeftStr(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.status, state.endTime]);

  const { allRanked } = getLeaderboardByTeam(state.participants);
  const blueMembers = Object.values(state.participants).filter(p => p.team === 'blue');
  const redMembers = Object.values(state.participants).filter(p => p.team === 'red');

  const totalLand = state.totalCells || 49;
  const bluePercent = Math.round((state.blueCellCount / totalLand) * 100);
  const redPercent = Math.round((state.redCellCount / totalLand) * 100);

  return (
    <div
      className="p-4 md:p-6 bg-slate-900 text-white min-h-[600px] rounded-3xl border-2 border-slate-700 shadow-2xl space-y-6 max-w-6xl mx-auto select-none"
      data-testid="territory-teacher-panel"
    >
      {/* 1. Header Bảng Điều Khiển */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/90 p-4 rounded-2xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-3xl">
            🏰
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-400 text-black">
                Đại Chiến Lãnh Thổ
              </span>
              <span className="text-xs text-slate-300">
                Bản đồ {state.mapSize}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  state.status === 'in_progress'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : state.status === 'finished'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {state.status === 'in_progress'
                  ? 'Đang Chiến Đấu'
                  : state.status === 'finished'
                  ? 'Đã Kết Thúc'
                  : 'Chờ Bắt Đầu'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Thời gian còn lại:{' '}
              <span className="font-mono font-bold text-amber-300">
                {timeLeftStr || '00:00'}
              </span>
            </p>
          </div>
        </div>

        {/* Nút hành động của giáo viên */}
        <div className="flex flex-wrap items-center gap-2">
          {state.status === 'waiting' && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'start_game' })}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg cursor-pointer transition active:scale-95"
            >
              📢 BẮT ĐẦU TRẬN CHIẾN
            </button>
          )}

          {state.status === 'in_progress' && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'finish_game' })}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow cursor-pointer transition active:scale-95"
            >
              🏁 Kết Thúc Sớm
            </button>
          )}

          {/* Nút cộng thêm thời gian */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-bold">+Giờ:</span>
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'add_time', minutes: 1 })}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg cursor-pointer"
            >
              +1p
            </button>
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'add_time', minutes: 2 })}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg cursor-pointer"
            >
              +2p
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSendIntent({ type: 'reset_game' })}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 rounded-xl cursor-pointer"
            title="Thiết lập lại trận đấu"
          >
            🔄 Reset
          </button>

          <button
            type="button"
            onClick={() => setIsProjectorOpen(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
            title="Mở giao diện Màn chiếu lớp học"
          >
            <span>🪟</span>
            <span>Màn Chiếu</span>
          </button>

          <button
            type="button"
            onClick={onEndActivity}
            className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-xs text-red-200 rounded-xl cursor-pointer"
          >
            Đóng Tiện Ích
          </button>
        </div>
      </div>

      {/* 2. Thanh Điểm Số & Kéo Co Lãnh Thổ */}
      <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-blue-400">
            🔵 Phe Xanh: {state.blueScore} điểm ({bluePercent}% đất)
          </span>
          <span className="text-slate-400">
            Tổng cộng: {state.totalCells} ô chiến lược
          </span>
          <span className="text-red-400">
            🔴 Phe Đỏ: {state.redScore} điểm ({redPercent}% đất)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-700">
          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${bluePercent}%` }} />
          <div className="bg-slate-700 h-full transition-all duration-300" style={{ width: `${Math.max(0, 100 - bluePercent - redPercent)}%` }} />
          <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${redPercent}%` }} />
        </div>
      </div>

      {/* 2.1. BẢNG TỔNG KẾT KHI KẾT THÚC TRẬN ĐẤU */}
      {state.status === 'finished' && (
        <div className="bg-slate-800/90 border-2 border-amber-400/40 p-4 rounded-2xl space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-amber-400 block">
                Tổng Kết Trận Đấu
              </span>
              <h2 className="text-xl font-black text-white">
                {state.winnerTeam === 'blue'
                  ? '👑 PHE XANH ĐÃ TOÀN THẮNG!'
                  : state.winnerTeam === 'red'
                  ? '👑 PHE ĐỎ ĐÃ TOÀN THẮNG!'
                  : '🤝 HAI PHE HÒA ĐIỂM!'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {state.winReason || 'Trận chiến đã kết thúc trọn vẹn!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsProjectorOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
            >
              <span>🪟 Mở Màn Chiếu Lớp Học</span>
            </button>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center justify-between">
              <span>🏆 Bảng Điểm Đóng Góp Từng Người Chơi ({allRanked.length} HS):</span>
              <span className="text-[11px] text-amber-400">Chiếm thành: 5đ • Gia cố: 2đ • Đúng: 1đ</span>
            </h4>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {allRanked.map((p, idx) => {
                const score = getParticipantScore(p);
                const isBlue = p.team === 'blue';
                return (
                  <div
                    key={p.participantId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isBlue ? 'bg-blue-950/40 border-blue-800/50' : 'bg-red-950/40 border-red-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </span>
                      <span className="text-sm shrink-0">{isBlue ? '🔵' : '🔴'}</span>
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{p.displayName}</span>
                        {p.groupName && <span className="text-[10px] text-slate-400 block truncate">{p.groupName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        🏰 {p.capturedCount} • 🛡️ {p.fortifiedCount} • ✓ {p.correctCount}
                      </span>
                      <span className="text-sm font-black text-amber-300 font-mono">
                        +{score} đ
                      </span>
                    </div>
                  </div>
                );
              })}
              {allRanked.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-2">Chưa có người chơi nào tham gia ghi điểm</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Phân Lực Lượng Quân Đội & Bản Đồ Chiến Sự (~3/5 diện tích) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bản đồ chiến sự: Chiếm 7/12 (~60% chiều ngang màn hình) */}
        <div className="lg:col-span-7 bg-slate-800/40 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center">
          <div className="flex items-center justify-between w-full mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
              <span>🗺️</span> Bản Đồ Chiến Sự (Bản đồ {state.mapSize})
            </h3>
            <span className="text-[11px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
              Chiếm {state.blueCellCount + state.redCellCount}/{state.totalCells} ô chiến lược
            </span>
          </div>
          <div className="w-full flex items-center justify-center py-1">
            <TerritoryGrid
              mapSize={state.mapSize}
              cells={state.cells}
              interactive={false}
              className="w-full max-w-[560px] aspect-square"
            />
          </div>
        </div>

        {/* Quản lý 2 Đội & Phân Quân: Chiếm 5/12 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <span>👥</span> Quân Lực ({Object.keys(state.participants).length} HS)
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'auto_balance_teams' })}
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg cursor-pointer transition active:scale-95"
                title="Tự động chia đều 50/50 học sinh vào 2 phe"
              >
                ⚖️ Cân Bằng
              </button>
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'swap_teams' })}
                className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold rounded-lg cursor-pointer transition active:scale-95"
                title="Hoán đổi toàn bộ người chơi giữa 2 phe"
              >
                🔄 Đổi Phe
              </button>
            </div>
          </div>

          {/* QUẢN LÝ & CHUYỂN ĐỔI THEO NHÓM (Nếu có nhóm) */}
          {(() => {
            const distinctGroups = Array.from(
              new Set(
                Object.values(state.participants)
                  .map(p => p.groupName)
                  .filter((g): g is string => Boolean(g && g.trim()))
              )
            );

            if (distinctGroups.length === 0) return null;

            return (
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase flex items-center justify-between">
                  <span>🏷️ Chuyển đổi theo Nhóm học sinh:</span>
                  <span className="text-slate-400 font-normal">{distinctGroups.length} nhóm</span>
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {distinctGroups.map(gName => {
                    const groupMembers = Object.values(state.participants).filter(p => p.groupName === gName);
                    const bCount = groupMembers.filter(p => p.team === 'blue').length;
                    const rCount = groupMembers.filter(p => p.team === 'red').length;

                    return (
                      <div
                        key={gName}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-700/80 p-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="font-bold text-white truncate" title={gName}>
                            {gName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({groupMembers.length} HS)
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSendIntent({ type: 'assign_group_team', groupName: gName, team: 'blue' })}
                            disabled={bCount === groupMembers.length}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                              bCount === groupMembers.length
                                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                                : 'bg-blue-900/40 hover:bg-blue-800 text-blue-200 border-blue-700/60'
                            }`}
                            title={`Chuyển cả nhóm ${gName} sang Phe Xanh`}
                          >
                            ◀ Xanh ({bCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendIntent({ type: 'assign_group_team', groupName: gName, team: 'red' })}
                            disabled={rCount === groupMembers.length}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                              rCount === groupMembers.length
                                ? 'bg-red-600/30 text-red-300 border-red-500/50'
                                : 'bg-red-900/40 hover:bg-red-800 text-red-200 border-red-700/60'
                            }`}
                            title={`Chuyển cả nhóm ${gName} sang Phe Đỏ`}
                          >
                            Đỏ ({rCount}) ➔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Hai Cột Danh Sách Quân Lực (Phe Xanh & Phe Đỏ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cột Quân Xanh */}
            <div className="bg-blue-950/30 border border-blue-900/60 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-300 pb-1 border-b border-blue-900/40">
                <span>🔵 PHE XANH ({blueMembers.length})</span>
                <span className="text-[10px] text-blue-400">Đổi</span>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {blueMembers.map(m => (
                  <div
                    key={m.participantId}
                    className="flex items-center justify-between bg-blue-900/20 border border-blue-800/30 p-2 rounded-xl text-xs"
                  >
                    <div className="truncate max-w-[95px]">
                      <span className="font-bold text-white block truncate" title={m.displayName}>
                        {m.displayName}
                      </span>
                      {m.groupName && (
                        <span className="text-[9px] text-blue-300 block truncate">
                          {m.groupName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-blue-300 font-mono">
                        🏰{m.capturedCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSendIntent({ type: 'assign_team', participantId: m.participantId, team: 'red' })}
                        className="px-1.5 py-0.5 bg-red-900/50 hover:bg-red-800 text-[10px] text-red-200 rounded-md border border-red-700/50 cursor-pointer transition active:scale-95"
                        title="Chuyển học sinh này sang Phe Đỏ"
                      >
                        Đỏ ➔
                      </button>
                    </div>
                  </div>
                ))}
                {blueMembers.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-1">Chưa có học sinh</p>
                )}
              </div>
            </div>

            {/* Cột Quân Đỏ */}
            <div className="bg-red-950/30 border border-red-900/60 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-300 pb-1 border-b border-red-900/40">
                <span>🔴 PHE ĐỎ ({redMembers.length})</span>
                <span className="text-[10px] text-red-400">Đổi</span>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {redMembers.map(m => (
                  <div
                    key={m.participantId}
                    className="flex items-center justify-between bg-red-900/20 border border-red-800/30 p-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                      <button
                        type="button"
                        onClick={() => onSendIntent({ type: 'assign_team', participantId: m.participantId, team: 'blue' })}
                        className="px-1.5 py-0.5 bg-blue-900/50 hover:bg-blue-800 text-[10px] text-blue-200 rounded-md border border-blue-700/50 cursor-pointer transition active:scale-95 shrink-0"
                        title="Chuyển học sinh này sang Phe Xanh"
                      >
                        ◀ Xanh
                      </button>
                      <div className="truncate">
                        <span className="font-bold text-white block truncate" title={m.displayName}>
                          {m.displayName}
                        </span>
                        {m.groupName && (
                          <span className="text-[9px] text-red-300 block truncate">
                            {m.groupName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-red-300 font-mono shrink-0">
                      🏰{m.capturedCount}
                    </span>
                  </div>
                ))}
                {redMembers.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-1">Chưa có học sinh</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Modal Trình chiếu Projector View toàn màn hình */}
      {isProjectorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto flex flex-col">
          <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xs border-b border-slate-800 p-2.5 px-4 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <span>🪟</span>
              <span>Đang mở Màn Chiếu Lớp Học (Projector Mode)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsProjectorOpen(false)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition active:scale-95"
            >
              ✕ Đóng Màn Chiếu
            </button>
          </div>
          <div className="flex-1">
            <TerritoryProjectorView state={state} />
          </div>
        </div>
      )}
    </div>
  );
};
