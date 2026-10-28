import React, { useState, useEffect } from 'react';
import type { TerritoryWarState } from '../territory-schemas.js';
import { TerritoryGrid } from './TerritoryGrid.js';
import { getLeaderboardByTeam, getParticipantScore } from '../territory-logic.js';

export interface ProjectorViewProps {
  runId?: string;
  state: TerritoryWarState;
}

export const TerritoryProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

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

  const { blueCommanders, redCommanders, allRanked } = getLeaderboardByTeam(state.participants);
  const [leaderboardTab, setLeaderboardTab] = useState<'two_teams' | 'all' | 'blue' | 'red'>(
    'two_teams'
  );

  const totalLand = state.totalCells || 49;
  const bluePercent = Math.round((state.blueCellCount / totalLand) * 100);
  const redPercent = Math.round((state.redCellCount / totalLand) * 100);

  // 1. MÀN HÌNH TỔNG KẾT CHIẾN THẮNG & ĐIỂM SỐ TỪNG NGƯỜI CHƠI (FINISHED)
  if (state.status === 'finished') {
    const winner = state.winnerTeam;
    const isBlueWin = winner === 'blue';
    const isRedWin = winner === 'red';

    return (
      <div
        className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-start text-center space-y-6 select-none"
        data-testid="territory-projector-finished"
      >
        {/* Banner Vinh Danh Phe Thắng */}
        <div className="space-y-2 mt-2">
          <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-400 text-black shadow-lg">
            EduClass v2 • Trận Đại Chiến Kết Thúc
          </span>
          <h1
            className={`text-3xl md:text-5xl font-black drop-shadow-xl ${
              isBlueWin ? 'text-blue-400' : isRedWin ? 'text-red-400' : 'text-amber-300'
            }`}
          >
            {isBlueWin
              ? '👑 PHE XANH ĐÃ TOÀN THẮNG!'
              : isRedWin
                ? '👑 PHE ĐỎ ĐÃ TOÀN THẮNG!'
                : '🤝 HAI PHE HÒA ĐIỂM!'}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            {state.winReason || 'Hai phe đã cống hiến một trận đại chiến vô cùng kịch tính!'}
          </p>
        </div>

        {/* Điểm số chung cuộc 2 phe */}
        <div className="flex items-center justify-center gap-6 w-full max-w-3xl bg-slate-900/90 border-2 border-slate-700 p-4 md:p-5 rounded-3xl shadow-2xl">
          <div
            className={`text-center flex-1 p-3 rounded-2xl ${isBlueWin ? 'bg-blue-950/60 border border-blue-500/50' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-black text-blue-400">🔵 PHE XANH</span>
              {isBlueWin && (
                <span className="text-xs bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">
                  THẮNG
                </span>
              )}
            </div>
            <span className="text-4xl md:text-5xl font-black text-white font-mono block my-1">
              {state.blueScore}
            </span>
            <span className="text-xs text-slate-400 block">
              {state.blueCellCount} ô đất ({bluePercent}%) • {blueCommanders.length} quân
            </span>
          </div>

          <div className="text-2xl font-black text-slate-500">VS</div>

          <div
            className={`text-center flex-1 p-3 rounded-2xl ${isRedWin ? 'bg-red-950/60 border border-red-500/50' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-black text-red-400">🔴 PHE ĐỎ</span>
              {isRedWin && (
                <span className="text-xs bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">
                  THẮNG
                </span>
              )}
            </div>
            <span className="text-4xl md:text-5xl font-black text-white font-mono block my-1">
              {state.redScore}
            </span>
            <span className="text-xs text-slate-400 block">
              {state.redCellCount} ô đất ({redPercent}%) • {redCommanders.length} quân
            </span>
          </div>
        </div>

        {/* Thanh Điều Hướng Chế Độ Xem Bảng Điểm Từng Người Chơi */}
        <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5 px-2">
              <span>📊</span> Bảng Điểm Từng Người Chơi
            </span>
            <span className="text-xs text-slate-400">({allRanked.length} học sinh)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setLeaderboardTab('two_teams')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                leaderboardTab === 'two_teams'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              ◫ Song Song 2 Phe
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                leaderboardTab === 'all'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              🏆 Toàn Bộ Lớp ({allRanked.length})
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardTab('blue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                leaderboardTab === 'blue'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-blue-300 hover:bg-slate-800'
              }`}
            >
              🔵 Phe Xanh ({blueCommanders.length})
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardTab('red')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                leaderboardTab === 'red'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-red-300 hover:bg-slate-800'
              }`}
            >
              🔴 Phe Đỏ ({redCommanders.length})
            </button>
          </div>
        </div>

        {/* Nội Dung Bảng Điểm Từng Người Chơi */}
        <div className="w-full max-w-5xl text-left">
          {/* Chế độ xem song song 2 phe */}
          {leaderboardTab === 'two_teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cột Điểm Phe Xanh */}
              <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-900/60">
                  <h3 className="text-sm font-black text-blue-300 uppercase flex items-center gap-2">
                    <span>🔵</span> Tướng Lĩnh Phe Xanh ({blueCommanders.length})
                  </h3>
                  <span className="text-xs text-blue-400 font-bold">{state.blueScore} điểm</span>
                </div>
                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {blueCommanders.map((cmd, idx) => {
                    const pScore = getParticipantScore(cmd);
                    return (
                      <div
                        key={cmd.participantId}
                        className="flex items-center justify-between bg-blue-900/25 hover:bg-blue-900/40 p-2.5 rounded-xl border border-blue-800/40 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-black shadow'
                                : idx === 1
                                  ? 'bg-slate-300 text-black shadow'
                                  : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-blue-500/30 text-blue-200'
                            }`}
                          >
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-sm text-white block truncate">
                              {cmd.displayName}
                            </span>
                            <span className="text-[11px] text-blue-300 block">
                              🏰 {cmd.capturedCount} • 🛡️ {cmd.fortifiedCount} • ✓{' '}
                              {cmd.correctCount}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-sm font-black text-amber-300 font-mono block">
                            +{pScore} đ
                          </span>
                          <span className="text-[10px] text-slate-400">đóng góp</span>
                        </div>
                      </div>
                    );
                  })}
                  {blueCommanders.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center italic">
                      Chưa có thành viên nào ghi điểm
                    </p>
                  )}
                </div>
              </div>

              {/* Cột Điểm Phe Đỏ */}
              <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-red-900/60">
                  <h3 className="text-sm font-black text-red-300 uppercase flex items-center gap-2">
                    <span>🔴</span> Tướng Lĩnh Phe Đỏ ({redCommanders.length})
                  </h3>
                  <span className="text-xs text-red-400 font-bold">{state.redScore} điểm</span>
                </div>
                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {redCommanders.map((cmd, idx) => {
                    const pScore = getParticipantScore(cmd);
                    return (
                      <div
                        key={cmd.participantId}
                        className="flex items-center justify-between bg-red-900/25 hover:bg-red-900/40 p-2.5 rounded-xl border border-red-800/40 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-black shadow'
                                : idx === 1
                                  ? 'bg-slate-300 text-black shadow'
                                  : idx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-red-500/30 text-red-200'
                            }`}
                          >
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-sm text-white block truncate">
                              {cmd.displayName}
                            </span>
                            <span className="text-[11px] text-red-300 block">
                              🏰 {cmd.capturedCount} • 🛡️ {cmd.fortifiedCount} • ✓{' '}
                              {cmd.correctCount}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-sm font-black text-amber-300 font-mono block">
                            +{pScore} đ
                          </span>
                          <span className="text-[10px] text-slate-400">đóng góp</span>
                        </div>
                      </div>
                    );
                  })}
                  {redCommanders.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center italic">
                      Chưa có thành viên nào ghi điểm
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chế độ xem toàn bộ lớp (Rank 1..N) hoặc lọc 1 phe */}
          {leaderboardTab !== 'two_teams' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {(leaderboardTab === 'all'
                  ? allRanked
                  : leaderboardTab === 'blue'
                    ? blueCommanders
                    : redCommanders
                ).map((cmd, idx) => {
                  const pScore = getParticipantScore(cmd);
                  const isBlue = cmd.team === 'blue';
                  const isWinnerTeam = cmd.team === winner;

                  return (
                    <div
                      key={cmd.participantId}
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        isBlue
                          ? 'bg-blue-950/30 border-blue-900/50 hover:bg-blue-900/30'
                          : 'bg-red-950/30 border-red-900/50 hover:bg-red-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-black shadow-lg text-sm'
                              : idx === 1
                                ? 'bg-slate-200 text-black shadow'
                                : idx === 2
                                  ? 'bg-amber-700 text-white shadow'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </span>

                        <span className="text-lg shrink-0">{isBlue ? '🔵' : '🔴'}</span>

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              {cmd.displayName}
                            </span>
                            {cmd.groupName && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                                {cmd.groupName}
                              </span>
                            )}
                            {isWinnerTeam && (
                              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/40">
                                🏆 Phe Thắng
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Chiếm: <b className="text-white">{cmd.capturedCount} ô</b> • Gia cố:{' '}
                            <b className="text-white">{cmd.fortifiedCount}</b> • Trả lời đúng:{' '}
                            <b className="text-emerald-400">{cmd.correctCount}</b>/
                            {cmd.totalQuestions}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span className="text-base font-black text-amber-300 font-mono block">
                          +{pScore} điểm
                        </span>
                        <span className="text-[11px] text-slate-400">cá nhân</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH TRÌNH CHIẾU THỜI GIAN THỰC (WAITING HOẶC IN_PROGRESS)
  return (
    <div
      className="min-h-screen bg-slate-950 text-white p-4 md:p-6 flex flex-col justify-between select-none"
      data-testid="territory-projector-main"
    >
      {/* 2.1. TOP BAR CHIẾN TRƯỜNG */}
      <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-4 shadow-2xl mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Phe Xanh */}
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500 flex items-center justify-center text-2xl font-black shadow">
              🔵
            </span>
            <div>
              <span className="text-xs uppercase font-bold text-blue-400">PHE XANH</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-blue-300">
                  {state.blueScore}
                </span>
                <span className="text-xs text-slate-400">điểm ({bluePercent}%)</span>
              </div>
            </div>
          </div>

          {/* Đồng hồ chính tâm */}
          <div className="text-center">
            <div className="inline-block px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-2xl shadow">
              <span className="text-xs text-slate-400 uppercase font-bold block">Thời Gian</span>
              <span className="text-2xl font-mono font-black text-amber-400">
                ⏱️ {timeLeftStr || '00:00'}
              </span>
            </div>
          </div>

          {/* Phe Đỏ */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-xs uppercase font-bold text-red-400">PHE ĐỎ</span>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-xs text-slate-400">({redPercent}%)</span>
                <span className="text-3xl font-black font-mono text-red-300">{state.redScore}</span>
                <span className="text-xs text-slate-400">điểm</span>
              </div>
            </div>
            <span className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500 flex items-center justify-center text-2xl font-black shadow">
              🔴
            </span>
          </div>
        </div>

        {/* Thanh Kéo Co Lãnh Thổ (Tug-of-war Bar) */}
        <div className="mt-3 w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner border border-slate-700">
          <div
            className="bg-blue-600 transition-all duration-500 ease-out h-full"
            style={{ width: `${bluePercent}%` }}
          />
          <div
            className="bg-slate-700 transition-all duration-500 ease-out h-full"
            style={{ width: `${Math.max(0, 100 - bluePercent - redPercent)}%` }}
          />
          <div
            className="bg-red-600 transition-all duration-500 ease-out h-full"
            style={{ width: `${redPercent}%` }}
          />
        </div>
      </div>

      {/* 2.2. KHU VỰC CHÍNH: BẢN ĐỒ CHIẾN SỰ (~3/5 DIỆN TÍCH MÀN HÌNH) + BẢNG TƯỚNG LĨNH */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-0">
        {/* Cột Trái: Bản đồ chiến sự SVG chiếm ~3/5 màn hình (col-span-8 = 66.7%) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-between shadow-xl">
          <div className="w-full flex-1 flex items-center justify-center min-h-[500px] max-h-[76vh] p-2">
            <TerritoryGrid
              mapSize={state.mapSize}
              cells={state.cells}
              interactive={false}
              className="w-full max-w-[min(62vw,74vh)] max-h-[74vh] aspect-square"
            />
          </div>

          {/* Dòng Ticker Thông báo chiến sự (Live Battle Feed) */}
          <div className="w-full mt-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 px-4 flex items-center gap-3">
            <span className="text-base animate-pulse">🔥</span>
            <span className="text-xs font-bold text-amber-300 truncate">
              {state.logs[0]?.text || 'Chiến trường đang yên tĩnh, quân đội hai bên đang dàn trận!'}
            </span>
          </div>
        </div>

        {/* Cột Phải: Bảng Xếp Hạng Tướng Lĩnh & Quân Lực Hai Phe */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h2 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <span>🏆</span> BẢNG XẾP HẠNG TƯỚNG LĨNH
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {Object.keys(state.participants).length} chiến binh
              </span>
            </div>

            {/* Phe Xanh */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                <span>🔵 TƯỚNG PHE XANH</span>
                <span className="font-mono text-[11px] text-slate-400">Đất / Giáp / Đúng</span>
              </div>
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {blueCommanders.slice(0, 5).map((cmd, idx) => (
                  <div
                    key={cmd.participantId}
                    className="flex items-center justify-between bg-blue-950/40 border border-blue-900/50 p-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-blue-400 w-4">{idx + 1}.</span>
                      <span className="font-bold text-white truncate max-w-[120px]">
                        {cmd.displayName}
                      </span>
                    </div>
                    <span className="font-mono text-blue-300 shrink-0">
                      🏰{cmd.capturedCount} 🛡️{cmd.fortifiedCount} ✓{cmd.correctCount}
                    </span>
                  </div>
                ))}
                {blueCommanders.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-1">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            {/* Phe Đỏ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-300">
                <span>🔴 TƯỚNG PHE ĐỎ</span>
                <span className="font-mono text-[11px] text-slate-400">Đất / Giáp / Đúng</span>
              </div>
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {redCommanders.slice(0, 5).map((cmd, idx) => (
                  <div
                    key={cmd.participantId}
                    className="flex items-center justify-between bg-red-950/40 border border-red-900/50 p-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-red-400 w-4">{idx + 1}.</span>
                      <span className="font-bold text-white truncate max-w-[120px]">
                        {cmd.displayName}
                      </span>
                    </div>
                    <span className="font-mono text-red-300 shrink-0">
                      🏰{cmd.capturedCount} 🛡️{cmd.fortifiedCount} ✓{cmd.correctCount}
                    </span>
                  </div>
                ))}
                {redCommanders.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic p-1">Chưa có dữ liệu</p>
                )}
              </div>
            </div>
          </div>

          {/* Hướng dẫn hiển thị */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            ⚡ <span className="text-amber-400 font-bold">Sudden Death:</span> Chiếm được{' '}
            <span className="text-white font-bold">Lâu Đài Lớn (🏰)</span> hoặc{' '}
            <span className="text-white font-bold">Cả 2 Lâu Đài Cánh (🏯)</span> sẽ phân định thắng
            ngay lập tức!
          </div>
        </div>
      </div>
    </div>
  );
};
