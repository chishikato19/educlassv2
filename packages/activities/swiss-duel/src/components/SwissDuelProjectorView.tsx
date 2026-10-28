import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SwissDuelState } from '../swiss-schemas.js';
import { formatSwissAccuracy } from '../swiss-scoring.js';
import {
  CHESS_PIECES,
  CHESS_SCALE_MAP,
  ChessWoodCard,
  calculateOptimalBoardGrid,
  getChessTitleBadge,
} from './ChessTheme.js';

export interface ProjectorViewProps {
  runId?: string;
  state: SwissDuelState;
}

export const SwissDuelProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const [remainingCountdown, setRemainingCountdown] = useState<number>(10);
  const [tournamentTimeLeft, setTournamentTimeLeft] = useState<string>('');
  const [roundTimeLeft, setRoundTimeLeft] = useState<string>('');

  useEffect(() => {
    if (state.status === 'round_review' && state.countdownEndsAt) {
      const updateTimer = () => {
        const diff = Math.max(0, Math.ceil((state.countdownEndsAt! - Date.now()) / 1000));
        setRemainingCountdown(diff);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.status, state.countdownEndsAt]);

  // Đếm ngược thời gian của ván đấu khi đang trong hiệp đấu
  useEffect(() => {
    if (state.status === 'in_round' && state.roundStartedAt) {
      const totalSec =
        (state.roundQuestions || []).reduce(
          (acc, q) => acc + (q.timeLimit || state.timeLimitPerQuestion || 30),
          0
        ) ||
        state.timeLimitPerQuestion * 2 ||
        60;
      const deadlineRound = state.roundStartedAt + totalSec * 1000;

      const updateRoundTimer = () => {
        const diffMs = deadlineRound - Date.now();
        const remainSec = Math.max(0, Math.ceil(diffMs / 1000));
        const mins = Math.floor(remainSec / 60);
        const secs = remainSec % 60;
        setRoundTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      };

      updateRoundTimer();
      const interval = setInterval(updateRoundTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setRoundTimeLeft('');
    }
    return undefined;
  }, [state.status, state.roundStartedAt, state.roundQuestions, state.timeLimitPerQuestion]);

  useEffect(() => {
    if (state.mode === 'time' && state.endTime && state.status !== 'finished') {
      const updateTournamentTimer = () => {
        const remainMs = Math.max(0, state.endTime! - Date.now());
        const totalSec = Math.floor(remainMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setTournamentTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      };
      updateTournamentTimer();
      const interval = setInterval(updateTournamentTimer, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.mode, state.endTime, state.status]);

  // 1. MÀN HÌNH VINH DANH PODIUM TOP 3 KHI HOÀN THÀNH
  if (state.status === 'finished') {
    const top1 = state.leaderboard[0];
    const top2 = state.leaderboard[1];
    const top3 = state.leaderboard[2];

    return (
      <div
        className="min-h-screen bg-gradient-to-b from-[#1a0f07] via-[#2c1a0e] to-[#120a05] text-[#f4ecd8] p-8 flex flex-col items-center justify-center select-none space-y-8"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
      >
        <div className="text-center space-y-2">
          <span className="text-xs uppercase text-amber-400 font-bold">
            Hoàng Gia Cờ Vua • EduClass v2
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-amber-300 drop-shadow-md">
            🏆 BẢNG VÀNG ĐẠI KIỆN TƯỚNG 🏆
          </h1>
          <p className="text-sm text-amber-200/80">
            Tổng kết {state.currentRound} vòng đối kháng thể thức Thụy Sỹ
          </p>
        </div>

        {/* Bục vinh danh Podium 3 bậc */}
        <div className="flex items-end justify-center gap-6 w-full max-w-3xl pt-8">
          {/* Hạng 2 */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-4xl mb-2">🥈</span>
            <p className="font-bold text-lg text-slate-200 truncate max-w-[180px]">
              {top2?.displayName ?? '—'}
            </p>
            <p className="text-sm text-amber-300 font-black">
              {top2?.tournamentPoints ?? 0} điểm cờ
            </p>
            <div className="w-full h-36 bg-gradient-to-t from-[#3d2716] to-[#5a381f] border-2 border-slate-400/60 rounded-t-2xl flex items-center justify-center text-3xl font-black text-slate-200 shadow-2xl mt-3">
              2
            </div>
          </div>

          {/* Hạng 1 */}
          <div className="flex-1 flex flex-col items-center scale-105">
            <span className="text-5xl mb-2 animate-bounce">👑</span>
            <p className="font-black text-2xl text-amber-300 truncate max-w-[200px]">
              {top1?.displayName ?? '—'}
            </p>
            <p className="text-base text-amber-400 font-black">
              {top1?.tournamentPoints ?? 0} điểm cờ
            </p>
            <div className="w-full h-48 bg-gradient-to-t from-[#61410d] to-[#b37d1d] border-2 border-amber-300 rounded-t-2xl flex items-center justify-center text-4xl font-black text-amber-100 shadow-2xl mt-3">
              1
            </div>
          </div>

          {/* Hạng 3 */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-4xl mb-2">🥉</span>
            <p className="font-bold text-lg text-amber-200 truncate max-w-[180px]">
              {top3?.displayName ?? '—'}
            </p>
            <p className="text-sm text-amber-300 font-black">
              {top3?.tournamentPoints ?? 0} điểm cờ
            </p>
            <div className="w-full h-28 bg-gradient-to-t from-[#331c0d] to-[#4d2a13] border-2 border-amber-700/60 rounded-t-2xl flex items-center justify-center text-2xl font-black text-amber-300 shadow-xl mt-3">
              3
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH XEM LẠI VÒNG ĐẤU & ĐẾM NGƯỢC 10S
  if (state.status === 'round_review') {
    return (
      <div
        className="min-h-screen bg-[#1c1007] text-[#f4ecd8] p-6 flex flex-col justify-between select-none space-y-4"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
      >
        {/* Header với đồng hồ 10s */}
        <div className="flex items-center justify-between border-b border-[#5e381d] pb-4">
          <div>
            <span className="text-xs uppercase text-amber-400 font-bold block">
              Kết Quả Vòng {state.currentRound} / {state.totalRounds}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-300">
              BẢNG XẾP HẠNG THỤY SỸ TẠM THỜI
            </h2>
          </div>

          <div className="flex items-center gap-3 bg-[#2b180c] border-2 border-amber-400 px-5 py-2.5 rounded-2xl shadow-xl">
            <span className="text-xs text-amber-200 uppercase font-bold">
              Bốc thăm vòng mới sau:
            </span>
            <span className="text-3xl font-black text-amber-300 font-mono animate-pulse">
              {remainingCountdown}s
            </span>
          </div>
        </div>

        {/* Bảng xếp hạng Top 10 nổi bật trên máy chiếu */}
        <div className="flex-1 overflow-y-auto bg-[#24160c] border border-[#5c371d] rounded-2xl p-4 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.leaderboard.slice(0, 12).map(entry => {
              const badge = getChessTitleBadge(entry.tournamentPoints, entry.streak);
              return (
                <div
                  key={entry.participantId}
                  className="flex items-center justify-between p-3 bg-[#2d1b0f] hover:bg-[#382112] border border-[#5e381d] rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-sm shadow">
                      #{entry.rank}
                    </span>
                    <div>
                      <span className="font-bold text-base text-white block">
                        {entry.displayName}
                      </span>
                      <span className="text-xs text-amber-200/80">
                        {badge.icon} {badge.title} •{' '}
                        {formatSwissAccuracy(
                          entry.correctCount,
                          entry.totalQuestions,
                          entry.accuracy
                        )}{' '}
                        đúng
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {entry.tournamentPoints} đ
                    </span>
                    <span className="text-[10px] text-slate-400 block">BH: {entry.buchholz}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. MÀN HÌNH ĐANG TRONG VÒNG ĐẤU: SƠ ĐỒ CÁC BÀN CỜ ĐANG TRANH TÀI
  const byeStudent = state.byePlayerId ? state.participants[state.byePlayerId] : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

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
  }, [state.status]);

  const gridLayout = useMemo(() => {
    return calculateOptimalBoardGrid(state.matchups.length, dimensions.width, dimensions.height);
  }, [state.matchups.length, dimensions.width, dimensions.height]);

  return (
    <div
      className="h-screen w-screen bg-[#1c1007] text-[#f4ecd8] p-3 md:p-5 flex flex-col justify-between select-none space-y-2 overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
    >
      {/* Header máy chiếu */}
      <div className="flex items-center justify-between border-b border-[#5e381d] pb-2 shrink-0">
        <div>
          <span className="text-[11px] uppercase text-amber-400 font-bold block">
            {state.title} • Thể thức Thụy Sỹ
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-amber-300">
            VÒNG ĐẤU #{state.currentRound} / {state.totalRounds}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {state.status === 'in_round' && roundTimeLeft && (
            <div className="px-3.5 py-1.5 bg-amber-950/90 border border-amber-500 rounded-xl text-sm text-amber-300 font-mono font-bold shadow-md">
              ⏱️ Thời gian ván: {roundTimeLeft}
            </div>
          )}
          {state.mode === 'time' && tournamentTimeLeft && (
            <div className="px-3 py-1.5 bg-amber-950 border border-amber-400 rounded-xl text-xs text-amber-300 font-mono font-bold">
              ⏱️ Toàn giải: {tournamentTimeLeft}
            </div>
          )}
          {byeStudent && (
            <div className="px-3 py-1.5 bg-amber-950/80 border border-amber-400/50 rounded-xl text-xs text-amber-200">
              👑 Suất BYE: <b className="text-amber-300">{byeStudent.displayName}</b> (+2đ)
            </div>
          )}
          <div className="px-3 py-1.5 bg-[#2b180c] border border-amber-500/40 rounded-xl text-xs text-amber-200 font-bold">
            Tổng số: {state.matchups.length} bàn đấu
          </div>
        </div>
      </div>

      {/* Lưới các bàn cờ 16:9 chiếu lên máy chiếu - tỉ lệ tối ưu */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full overflow-y-auto pr-0.5">
        {state.matchups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-amber-200/60 space-y-2">
            <span className="text-5xl opacity-40">♟️</span>
            <p className="text-sm font-semibold text-amber-300/80">Đang chuẩn bị vòng đấu...</p>
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
              const isDone = m.player1Answered && m.player2Answered;
              const p1Win = isDone && m.result === 'player1_win';
              const p2Win = isDone && m.result === 'player2_win';
              const isDraw = isDone && m.result === 'draw';
              const st = CHESS_SCALE_MAP[gridLayout.scale];

              return (
                <ChessWoodCard
                  key={m.tableNumber}
                  className={`border-2 transition-all flex flex-col justify-between overflow-hidden ${st.cardPadding} ${
                    isDone
                      ? 'border-emerald-500/80 bg-[#1f281b]/90 shadow-emerald-950/50'
                      : 'border-[#613b1f] hover:border-amber-400/80 bg-[#1e130b]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 shrink-0">
                    <span className={`text-amber-300 font-bold truncate ${st.headerText}`}>
                      Bàn #{m.tableNumber}
                    </span>
                    <span
                      className={`rounded font-bold shrink-0 ${st.badgePadding} ${st.badgeText} ${
                        isDone
                          ? 'bg-emerald-900 text-emerald-200'
                          : 'bg-amber-950 text-amber-300 animate-pulse'
                      }`}
                    >
                      {isDone ? 'Xong ✓' : 'Đang đấu ⏳'}
                    </span>
                  </div>

                  <div
                    className={`space-y-1 flex-1 flex flex-col justify-center min-h-0 ${st.rowGap}`}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                        <span className={`shrink-0 ${st.pieceText}`}>{CHESS_PIECES.whitePawn}</span>
                        <strong
                          className={`truncate ${st.nameText} ${p1Win ? 'text-amber-300 font-bold' : 'text-white'}`}
                          title={p1?.displayName || 'P1'}
                        >
                          {p1?.displayName || 'P1'}
                        </strong>
                        {p1Win && (
                          <span className="text-[10px] shrink-0" title="Chiến thắng">
                            👑
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 ${st.scoreText} ${p1Win ? 'text-amber-300' : 'text-amber-200/90'}`}
                      >
                        {m.player1Score}/2
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                        <span className={`shrink-0 ${st.pieceText}`}>{CHESS_PIECES.blackPawn}</span>
                        <strong
                          className={`truncate ${st.nameText} ${p2Win ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                          title={p2?.displayName || 'P2'}
                        >
                          {p2?.displayName || 'P2'}
                        </strong>
                        {p2Win && (
                          <span className="text-[10px] shrink-0" title="Chiến thắng">
                            👑
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 ${st.scoreText} ${p2Win ? 'text-amber-300' : 'text-amber-200/90'}`}
                      >
                        {m.player2Score}/2
                      </span>
                    </div>
                  </div>

                  {isDone &&
                    (st.showFooter ? (
                      <div
                        className={`mt-1 pt-0.5 border-t border-white/10 text-center font-bold text-emerald-300 truncate shrink-0 ${st.footerText}`}
                      >
                        {p1Win && `${p1?.displayName} Thắng 🏆`}
                        {p2Win && `${p2?.displayName} Thắng 🏆`}
                        {isDraw && 'Hòa trận 🤝'}
                      </div>
                    ) : (
                      <div className="mt-0.5 pt-0.5 border-t border-white/10 text-center text-[8px] font-bold text-emerald-300 truncate shrink-0">
                        {p1Win && `${p1?.displayName} Thắng`}
                        {p2Win && `${p2?.displayName} Thắng`}
                        {isDraw && 'Hòa trận'}
                      </div>
                    ))}
                </ChessWoodCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
