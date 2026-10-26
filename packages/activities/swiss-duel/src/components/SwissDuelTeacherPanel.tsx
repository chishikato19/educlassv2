import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SwissDuelIntent, SwissDuelState } from '../swiss-schemas.js';
import {
  CHESS_PIECES,
  CHESS_SCALE_MAP,
  ChessWoodCard,
  calculateOptimalBoardGrid,
  getChessTitleBadge,
} from './ChessTheme.js';

export interface TeacherPanelProps {
  runId: string;
  state: SwissDuelState;
  onSendIntent: (intent: SwissDuelIntent) => void;
  onEndActivity: () => void;
}

export const SwissDuelTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const [remainingCountdown, setRemainingCountdown] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<'tables' | 'standings'>('tables');
  const [tournamentTimeLeft, setTournamentTimeLeft] = useState<string>('');
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  // Đếm ngược 10s khi sang round_review & Tự động bốc thăm vòng kế tiếp khi hết giờ
  useEffect(() => {
    if (state.status === 'round_review' && state.countdownEndsAt) {
      const updateTimer = () => {
        const diff = Math.max(0, Math.ceil((state.countdownEndsAt! - Date.now()) / 1000));
        setRemainingCountdown(diff);
        if (diff <= 0) {
          onSendIntent({ type: 'next_round' });
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.status, state.countdownEndsAt, onSendIntent]);

  // Đếm ngược thời gian toàn bộ giải đấu ở chế độ time mode
  useEffect(() => {
    if (state.mode === 'time' && state.endTime && state.status !== 'finished') {
      const updateTournamentTimer = () => {
        const diffMs = state.endTime! - Date.now();
        if (diffMs <= 0) {
          setTournamentTimeLeft('00:00');
          setIsTimeExpired(true);
        } else {
          setIsTimeExpired(false);
          const totalSec = Math.floor(diffMs / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          setTournamentTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }
      };
      updateTournamentTimer();
      const interval = setInterval(updateTournamentTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setIsTimeExpired(false);
    }
    return undefined;
  }, [state.mode, state.endTime, state.status]);

  const completedTables = state.matchups.filter(
    m => m.player1Answered && m.player2Answered
  ).length;
  const totalTables = state.matchups.length;

  const byeStudent = state.byePlayerId ? state.participants[state.byePlayerId] : null;

  const unpairedStudents = Object.values(state.participants).filter(
    p =>
      !state.matchups.some(m => m.player1Id === p.participantId || m.player2Id === p.participantId) &&
      state.byePlayerId !== p.participantId
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setDimensions({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [activeTab]);

  const gridLayout = useMemo(() => {
    return calculateOptimalBoardGrid(
      state.matchups.length,
      dimensions.width,
      dimensions.height
    );
  }, [state.matchups.length, dimensions.width, dimensions.height]);

  return (
    <div
      className="p-2.5 md:p-4 bg-[#180e07] text-[#f4ecd8] w-full h-full flex flex-col flex-1 min-h-0 rounded-2xl md:rounded-3xl border-2 md:border-4 border-[#5e381d] shadow-2xl space-y-2.5 overflow-hidden select-none"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
    >
      {/* 1. Header Bảng điều khiển */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#25150b] px-3.5 py-2.5 rounded-2xl border border-[#5c351b] shadow-lg shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl shrink-0">
            ♟️
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-black shrink-0">
                Thể thức Thụy Sỹ
              </span>
              <span className="text-[11px] text-amber-200/80 truncate">
                {state.mode === 'questions' ? 'Theo kho câu hỏi' : 'Theo thời gian'}
              </span>
              {state.mode === 'time' && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${isTimeExpired ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse' : 'bg-amber-950 border-amber-400 text-amber-300'}`}>
                    ⏱️ {tournamentTimeLeft || '00:00'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSendIntent({ type: 'add_time', minutes: 2 })}
                    className="px-1.5 py-0.5 bg-amber-800/80 hover:bg-amber-700 text-[10px] font-bold text-amber-100 rounded border border-amber-500/40 cursor-pointer transition"
                    title="Cộng thêm 2 phút"
                  >
                    +2p
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendIntent({ type: 'add_time', minutes: 5 })}
                    className="px-1.5 py-0.5 bg-amber-800/80 hover:bg-amber-700 text-[10px] font-bold text-amber-100 rounded border border-amber-500/40 cursor-pointer transition"
                    title="Cộng thêm 5 phút"
                  >
                    +5p
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-amber-300 truncate">
                {state.title}
              </h2>
              {state.shuffleQuestions && (
                <span className="text-[10px] bg-amber-950/80 border border-amber-600/40 text-amber-300 px-1.5 py-0.5 rounded font-medium shrink-0">
                  🔀 Đảo câu
                </span>
              )}
              {state.shuffleOptions && (
                <span className="text-[10px] bg-amber-950/80 border border-amber-600/40 text-amber-300 px-1.5 py-0.5 rounded font-medium shrink-0">
                  🔀 Đảo đáp án
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cụm nút điều khiển nhịp giải đấu */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {state.status === 'round_review' && (
            <>
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'skip_countdown' })}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Vòng tiếp theo ngay</span>
                <span className="text-xs font-mono">({remainingCountdown}s) ➡</span>
              </button>

              {state.countdownEndsAt ? (
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'pause_countdown' })}
                  className="px-3 py-2 bg-black/40 hover:bg-black/60 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  ⏸ Tạm dừng
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'resume_countdown' })}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  ▶ Tiếp tục đếm
                </button>
              )}
            </>
          )}

          {state.status === 'in_round' && (
            <>
              {completedTables === 0 && (
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'repair_round' })}
                  className="px-3 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                  title="Bốc thăm lại nếu có thêm học sinh vừa vào lớp"
                >
                  🎲 Bốc thăm lại vòng
                </button>
              )}
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'next_round' })}
                className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                ⏩ Bỏ qua vòng & Bốc thăm tiếp
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onEndActivity}
            className="px-3 py-2 bg-rose-800 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            ⏹ Kết thúc giải đấu
          </button>
        </div>
      </div>

      {/* 2. Thanh thông số & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#442512] py-1.5 px-1 text-xs md:text-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-amber-300 font-bold">
            Vòng hiện tại: <span className="text-base text-white font-black">{state.currentRound} / {state.totalRounds}</span>
          </div>
          <div className="text-amber-200/80">
            Tiến độ: <span className="font-bold text-white">{completedTables} / {totalTables} bàn đã xong</span>
          </div>
        </div>

        {/* Chuyển đổi tab */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1 rounded-xl font-bold text-xs border transition cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-amber-500 text-black border-amber-300 shadow'
                : 'bg-[#25150b] text-amber-200 border-[#5c351b]'
            }`}
          >
            ♟️ Các Bàn Đấu ({totalTables})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`px-3 py-1 rounded-xl font-bold text-xs border transition cursor-pointer ${
              activeTab === 'standings'
                ? 'bg-amber-500 text-black border-amber-300 shadow'
                : 'bg-[#25150b] text-amber-200 border-[#5c351b]'
            }`}
          >
            🏆 Bảng Xếp Hạng ({state.leaderboard.length})
          </button>
        </div>
      </div>

      {/* 3. Hiển thị thông tin suất BYE nếu có */}
      {byeStudent && (
        <div className="px-3 py-1.5 bg-amber-950/70 border border-amber-500/50 rounded-xl flex items-center justify-between text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👑</span>
            <span>
              Suất <b>BYE (Miễn đấu)</b> Vòng {state.currentRound}:{' '}
              <b className="text-amber-300 font-bold">{byeStudent.displayName}</b> (+2đ)
            </span>
          </div>
          <span className="text-[10px] text-amber-200/70 hidden sm:inline">
            (Ưu tiên nhóm điểm thấp chưa từng nhận BYE)
          </span>
        </div>
      )}

      {/* 3.1 Hiển thị học sinh vào trễ đang chờ bốc thăm vòng kế tiếp */}
      {unpairedStudents.length > 0 && state.status === 'in_round' && (
        <div className="px-3 py-1.5 bg-blue-950/70 border border-blue-500/50 rounded-xl flex items-center justify-between text-xs text-blue-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">⏳</span>
            <span>
              Có <b>{unpairedStudents.length} học sinh</b> vừa vào phòng đấu:{' '}
              <b className="text-blue-300 font-bold">{unpairedStudents.map(p => p.displayName).join(', ')}</b>.
              Sẽ tự động được xếp bàn ở <b>Vòng {state.currentRound + 1}</b>!
            </span>
          </div>
          {completedTables === 0 && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'repair_round' })}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
            >
              🎲 Bốc thăm lại ngay
            </button>
          )}
        </div>
      )}

      {/* 4. Tab 1: Sơ đồ các Bàn đấu cờ (Tables Matrix) */}
      {activeTab === 'tables' && (
        <div ref={containerRef} className="flex-1 min-h-0 w-full overflow-y-auto pr-0.5">
          {state.matchups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-amber-200/60 space-y-2">
              <span className="text-5xl opacity-40">♟️</span>
              <p className="text-sm font-semibold text-amber-300/80">Chưa có bàn đấu nào được khởi tạo</p>
              <p className="text-xs text-amber-200/50 max-w-md">
                Khi có học sinh tham gia và bốc thăm vòng đấu, các bàn cờ sẽ được tự động chia tỉ lệ hiển thị vừa vặn trên toàn màn hình.
              </p>
            </div>
          ) : (
            <div
              className="w-full h-full"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridLayout.rows}, minmax(${gridLayout.minRowHeight}px, 1fr))`,
                gap: `${gridLayout.gap}px`,
              }}
            >
              {state.matchups.map(m => {
                const p1 = state.participants[m.player1Id];
                const p2 = state.participants[m.player2Id];
                const isCompleted = m.player1Answered && m.player2Answered;
                const p1Win = isCompleted && m.result === 'player1_win';
                const p2Win = isCompleted && m.result === 'player2_win';
                const isDraw = isCompleted && m.result === 'draw';
                const st = CHESS_SCALE_MAP[gridLayout.scale];

                return (
                  <ChessWoodCard
                    key={m.tableNumber}
                    className={`border transition-all flex flex-col justify-between overflow-hidden ${st.cardPadding} ${
                      isCompleted
                        ? 'border-emerald-600/70 bg-[#1f281b]/80 shadow-emerald-950/30'
                        : 'border-[#613b1f] hover:border-amber-400/80 bg-[#1e130b]'
                    }`}
                  >
                    {/* Header bàn đấu */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 shrink-0">
                      <span className={`text-amber-300 truncate ${st.headerText}`}>
                        Bàn #{m.tableNumber}
                      </span>
                      <span
                        className={`rounded font-bold shrink-0 ${st.badgePadding} ${st.badgeText} ${
                          isCompleted
                            ? 'bg-emerald-900/90 text-emerald-200'
                            : 'bg-amber-950 text-amber-300 animate-pulse'
                        }`}
                      >
                        {isCompleted ? 'Xong ✓' : 'Đang đấu... ⏳'}
                      </span>
                    </div>

                    {/* Cặp đấu 2 bên */}
                    <div className={`flex-1 flex flex-col justify-center min-h-0 ${st.rowGap}`}>
                      {/* Player 1 (Quân Trắng) */}
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <span className={`shrink-0 ${st.pieceText}`}>{CHESS_PIECES.whiteKing}</span>
                          <span
                            className={`truncate ${st.nameText} ${p1Win ? 'text-amber-300 font-bold' : 'text-white'}`}
                            title={p1?.displayName || 'P1'}
                          >
                            {p1?.displayName || 'P1'}
                          </span>
                          {p1Win && <span className="text-[10px] shrink-0" title="Chiến thắng">👑</span>}
                        </div>
                        <span className={`font-mono font-bold shrink-0 ${st.scoreText} ${p1Win ? 'text-amber-300' : 'text-amber-200/90'}`}>
                          {m.player1Score}/2
                        </span>
                      </div>

                      {/* Player 2 (Quân Đen) */}
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <span className={`shrink-0 ${st.pieceText}`}>{CHESS_PIECES.blackKing}</span>
                          <span
                            className={`truncate ${st.nameText} ${p2Win ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                            title={p2?.displayName || 'P2'}
                          >
                            {p2?.displayName || 'P2'}
                          </span>
                          {p2Win && <span className="text-[10px] shrink-0" title="Chiến thắng">👑</span>}
                        </div>
                        <span className={`font-mono font-bold shrink-0 ${st.scoreText} ${p2Win ? 'text-amber-300' : 'text-amber-200/90'}`}>
                          {m.player2Score}/2
                        </span>
                      </div>
                    </div>

                    {/* Footer kết quả */}
                    {isCompleted && (
                      st.showFooter ? (
                        <div className={`mt-1 pt-0.5 border-t border-white/10 text-center font-bold text-emerald-300 truncate shrink-0 ${st.footerText}`}>
                          {p1Win && `🏆 ${p1?.displayName || 'P1'} Thắng (+2đ)`}
                          {p2Win && `🏆 ${p2?.displayName || 'P2'} Thắng (+2đ)`}
                          {isDraw && '🤝 Hai bên Hòa nhau (+1đ)'}
                        </div>
                      ) : (
                        <div className="mt-0.5 pt-0.5 border-t border-white/10 text-center text-[8px] font-bold text-emerald-300 truncate shrink-0">
                          {p1Win && `${p1?.displayName || 'P1'} Thắng`}
                          {p2Win && `${p2?.displayName || 'P2'} Thắng`}
                          {isDraw && 'Hòa trận'}
                        </div>
                      )
                    )}
                  </ChessWoodCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Bảng Xếp Hạng Thụy Sỹ (Swiss Standings) */}
      {activeTab === 'standings' && (
        <div className="flex-1 min-h-0 bg-[#24160c] border border-[#5c371d] rounded-2xl p-3 shadow-xl overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-amber-900/60 text-amber-400 uppercase text-[10px] tracking-wider">
                <th className="py-2 px-3 text-center w-12">Hạng</th>
                <th className="py-2 px-3">Kỳ Thủ</th>
                <th className="py-2 px-3 text-center">Danh Hiệu</th>
                <th className="py-2 px-3 text-center">Điểm Cờ</th>
                <th className="py-2 px-3 text-center">Hệ số Buchholz</th>
                <th className="py-2 px-3 text-center">Thắng/Hòa/Thua</th>
                <th className="py-2 px-3 text-center">Số câu đúng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d2413]">
              {state.leaderboard.map(entry => {
                const badge = getChessTitleBadge(entry.tournamentPoints, entry.streak);
                return (
                  <tr key={entry.participantId} className="hover:bg-amber-950/30 transition">
                    <td className="py-2.5 px-3 text-center font-black text-amber-300">
                      #{entry.rank}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {entry.displayName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-200">
                      <span>{badge.icon} {badge.title}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-amber-400 text-sm">
                      {entry.tournamentPoints} đ
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {entry.buchholz}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300 font-medium">
                      {entry.matchesWon}T - {entry.matchesDrawn}H - {entry.matchesLost}B
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                      {entry.correctCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Modal / Cảnh báo khi hết thời gian giải đấu */}
      {isTimeExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#24150a] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="text-5xl animate-bounce">⏰</div>
            <div>
              <h3 className="text-xl font-black text-amber-300 uppercase tracking-wide">
                Hết Giờ Thi Đấu Giải Đấu!
              </h3>
              <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                Thời gian thi đấu quy định đã kết thúc. Thầy/Cô muốn kết thúc giải đấu để xem tổng kết, hay muốn cộng thêm thời gian cho các kỳ thủ thi đấu tiếp?
              </p>
            </div>

            <div className="p-3.5 bg-amber-950/60 rounded-2xl border border-amber-500/40 space-y-2">
              <span className="text-xs font-bold text-amber-300 block">➕ Cộng thêm thời gian thi đấu:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'add_time', minutes: 1 })}
                  className="py-2.5 px-3 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition active:scale-95"
                >
                  +1 Phút
                </button>
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'add_time', minutes: 2 })}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition active:scale-95"
                >
                  +2 Phút
                </button>
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'add_time', minutes: 5 })}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow cursor-pointer transition active:scale-95"
                >
                  +5 Phút
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'finish_tournament' })}
                className="w-full py-3.5 bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-600 hover:to-rose-700 text-white font-black text-sm rounded-2xl shadow-xl cursor-pointer transition active:scale-95"
              >
                🏁 KẾT THÚC GIẢI ĐẤU NGAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
