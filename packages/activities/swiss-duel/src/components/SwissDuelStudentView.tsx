import React, { useState, useEffect } from 'react';
import type { SwissDuelIntent, SwissDuelState } from '../swiss-schemas.js';
import {
  CHESS_PIECES,
  ChessWoodCard,
  getChessTitleBadge,
  renderLatexInText,
} from './ChessTheme.js';

export interface StudentViewProps {
  runId: string;
  state: SwissDuelState;
  participantId: string;
  onSendIntent: (intent: SwissDuelIntent) => void;
}

export const SwissDuelStudentView: React.FC<StudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, unknown>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [remainingCountdown, setRemainingCountdown] = useState<number>(10);
  const [roundTimeLeft, setRoundTimeLeft] = useState<string>('');

  const myState = state.participants[participantId];
  const isByeThisRound = state.byePlayerId === participantId || Boolean(myState?.isByeThisRound);

  // Tìm bàn đấu của học sinh này
  const myMatchup = state.matchups.find(
    m => m.player1Id === participantId || m.player2Id === participantId
  );
  const isPlayer1 = myMatchup?.player1Id === participantId;
  const opponentId = isPlayer1 ? myMatchup?.player2Id : myMatchup?.player1Id;
  const opponentState = opponentId ? state.participants[opponentId] : null;

  // Trạng thái nộp bài
  const myAnswers = isPlayer1 ? myMatchup?.player1Answers : myMatchup?.player2Answers;
  const myResults = isPlayer1 ? myMatchup?.player1Results : myMatchup?.player2Results;
  const myAnsweredAll = isPlayer1 ? myMatchup?.player1Answered : myMatchup?.player2Answered;
  const opponentAnsweredAll = isPlayer1 ? myMatchup?.player2Answered : myMatchup?.player1Answered;

  // Đồng bộ selectedAnswers với myAnswers từ server nếu đã có
  useEffect(() => {
    if (myAnswers && Object.keys(myAnswers).length > 0) {
      setSelectedAnswers(prev => ({ ...prev, ...myAnswers }));
    }
  }, [myAnswers]);

  // Báo danh vào giải đấu nếu chưa có trong danh sách
  useEffect(() => {
    if (!myState) {
      onSendIntent({
        type: 'join_tournament',
      });
    }
  }, [myState, onSendIntent]);

  // Cập nhật đếm ngược 10s khi sang round_review
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

  // Đếm ngược tổng thời gian của các câu hỏi trong vòng đấu hiện tại (không hiện thời gian cả giải đấu)
  useEffect(() => {
    if (state.status === 'in_round' && state.roundStartedAt) {
      const roundTotalSeconds =
        (state.roundQuestions || []).reduce(
          (acc, q) => acc + (q.timeLimit || state.timeLimitPerQuestion || 30),
          0
        ) || (state.timeLimitPerQuestion * 2) || 60;

      const deadline = state.roundStartedAt + roundTotalSeconds * 1000;

      const updateRoundTimer = () => {
        const diffMs = deadline - Date.now();
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

  // Reset câu trả lời chọn tạm khi đổi vòng
  useEffect(() => {
    setSelectedAnswers({});
    setActiveQuestionIndex(0);
  }, [state.currentRound]);

  // Chọn đáp án tạm thời (chưa tính điểm cho đến khi bấm nộp bài)
  const handlePickAnswer = (qIndex: number, answerVal: unknown) => {
    if (myAnsweredAll) return; // Đã nộp rồi thì khóa
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: answerVal }));
  };

  // Nộp bài thi của hiệp này
  const handleSubmitRound = () => {
    if (myAnsweredAll) return;
    onSendIntent({
      type: 'submit_round',
      answers: selectedAnswers,
      displayName: myState?.displayName,
    });
  };

  const myBadge = getChessTitleBadge(myState?.tournamentPoints || 0, myState?.streak || 0);

  const fontStyle = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' };

  // 1. MÀN HÌNH KẾT THÚC GIẢI ĐẤU
  if (state.status === 'finished') {
    const myRank = state.leaderboard.find(e => e.participantId === participantId)?.rank || 1;

    return (
      <div
        className="min-h-screen bg-[#1c1108] text-[#f4ecd8] p-4 flex flex-col justify-center items-center select-none"
        style={fontStyle}
      >
        <ChessWoodCard className="p-6 max-w-sm w-full text-center space-y-5 border-2 border-amber-500/60">
          <div className="text-5xl animate-bounce">🏆</div>
          <div>
            <h2 className="text-2xl font-bold text-amber-300 uppercase">
              Tổng Kết Giải Đấu
            </h2>
            <p className="text-xs text-amber-200/80 mt-1">Đấu Cờ Thụy Sỹ • {state.title}</p>
          </div>

          <div className="p-4 bg-black/40 rounded-xl border border-amber-500/30 space-y-2">
            <div className="text-sm text-amber-200">Thứ Hạng Chung Cuộc</div>
            <div className="text-4xl font-black text-amber-400">
              #{myRank}
            </div>
            <div className="text-xs text-amber-300 font-bold">
              Danh hiệu: {myBadge.icon} {myBadge.title}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-2.5 bg-black/30 rounded-lg border border-amber-900/40">
              <span className="text-slate-400 block">Điểm cờ</span>
              <strong className="text-xl text-amber-300">{myState?.tournamentPoints || 0} đ</strong>
            </div>
            <div className="p-2.5 bg-black/30 rounded-lg border border-amber-900/40">
              <span className="text-slate-400 block">Số câu đúng</span>
              <strong className="text-xl text-emerald-400">{myState?.correctCount || 0} câu</strong>
            </div>
          </div>

          <p className="text-xs text-amber-200/60 italic pt-2">
            Thầy cô đã tổng kết điểm và trao thưởng EXP vào hồ sơ của bạn.
          </p>
        </ChessWoodCard>
      </div>
    );
  }

  // 2. MÀN HÌNH NHẬN SUẤT BYE (NGHỈ NGƠI NHẬN ĐIỂM DANH DỰ)
  if (isByeThisRound) {
    return (
      <div
        className="min-h-screen bg-[#1c1108] text-[#f4ecd8] p-4 flex flex-col justify-center items-center select-none"
        style={fontStyle}
      >
        <ChessWoodCard className="p-6 max-w-sm w-full text-center space-y-5 border-2 border-amber-400">
          <div className="text-5xl">👑</div>
          <div className="space-y-1">
            <span className="text-xs uppercase text-amber-400 font-bold">
              Vòng {state.currentRound} / {state.totalRounds}
            </span>
            <h2 className="text-xl font-bold text-amber-300">
              Suất Nghỉ Ngơi Danh Dự!
            </h2>
          </div>

          <div className="p-4 bg-amber-950/60 rounded-xl border border-amber-500/50 text-amber-100 text-xs leading-relaxed">
            Bạn may mắn nhận được suất <b>Miễn đấu (BYE)</b> ở vòng này!
            <div className="text-2xl font-black text-amber-400 my-2">
              +2 ĐIỂM CHIẾN THẮNG
            </div>
            Hãy thư giãn và sẵn sàng cho vòng so tài tiếp theo.
          </div>

          {state.status === 'round_review' && (
            <div className="p-3 bg-black/50 rounded-xl border border-amber-400/40 text-center animate-pulse">
              <span className="text-xs text-amber-200 block">Chuẩn bị bốc thăm vòng kế tiếp</span>
              <strong className="text-2xl text-amber-300 font-mono font-bold">
                {remainingCountdown}s
              </strong>
            </div>
          )}
        </ChessWoodCard>
      </div>
    );
  }

  // 2.5. MÀN HÌNH CHỜ BỐC THĂM VÒNG KẾ TIẾP (KHI VÀO TRỄ GIỮA VÒNG ĐẤU)
  if (!myMatchup) {
    return (
      <div
        className="min-h-screen bg-[#1c1108] text-[#f4ecd8] p-4 flex flex-col justify-center items-center select-none"
        style={fontStyle}
      >
        <ChessWoodCard className="p-6 max-w-sm w-full text-center space-y-4 border-2 border-amber-500/60 shadow-2xl">
          <div className="text-5xl animate-bounce">⏳</div>
          <div className="space-y-1">
            <span className="text-xs uppercase text-amber-400 font-bold block">
              Vòng {state.currentRound} / {state.totalRounds}
            </span>
            <h2 className="text-xl font-bold text-amber-300">
              Bạn Vừa Vào Phòng Đấu!
            </h2>
          </div>

          <div className="p-4 bg-amber-950/60 rounded-xl border border-amber-500/40 text-amber-100 text-xs leading-relaxed space-y-2">
            <p>
              Hiệp đấu Vòng <b>{state.currentRound}</b> đang diễn ra.
            </p>
            <p className="text-amber-300 font-semibold">
              Hệ thống sẽ tự động bốc thăm xếp bàn cờ cho bạn ở <b>VÒNG KẾ TIẾP</b>!
            </p>
          </div>

          {roundTimeLeft && (
            <div className="p-2.5 bg-black/40 rounded-xl border border-amber-400/30 text-xs text-amber-300 font-mono">
              ⏱️ Thời gian hiệp còn lại: <b>{roundTimeLeft}</b>
            </div>
          )}

          {state.status === 'round_review' && (
            <div className="p-3 bg-black/50 rounded-xl border border-amber-400/40 text-center animate-pulse">
              <span className="text-xs text-amber-200 block">Sắp bốc thăm vòng kế tiếp sau:</span>
              <strong className="text-2xl text-amber-300 font-mono font-bold">
                {remainingCountdown}s
              </strong>
            </div>
          )}

          <p className="text-[11px] text-amber-200/60 italic">
            Hãy sẵn sàng so tài cùng các bạn ở vòng đấu tiếp theo nhé!
          </p>
        </ChessWoodCard>
      </div>
    );
  }

  // 3. MÀN HÌNH THI ĐẤU ĐỐI KHÁNG 1V1
  const currentQ = state.roundQuestions[activeQuestionIndex];
  const myScoreInMatch = isPlayer1 ? (myMatchup?.player1Score ?? 0) : (myMatchup?.player2Score ?? 0);
  const oppScoreInMatch = isPlayer1 ? (myMatchup?.player2Score ?? 0) : (myMatchup?.player1Score ?? 0);

  const answeredCount = [0, 1].filter(idx => selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== '').length;

  return (
    <div
      className="min-h-screen bg-[#170e06] text-[#f5eedc] flex flex-col justify-between p-3 sm:p-4 select-none max-w-md mx-auto"
      style={fontStyle}
    >
      {/* 3.1 Header Bàn đấu cờ */}
      <div className="bg-[#24160c] border border-[#5c371d] rounded-2xl p-3 shadow-lg flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl text-amber-400">{isPlayer1 ? CHESS_PIECES.whiteKnight : CHESS_PIECES.blackKnight}</span>
          <div>
            <span className="font-bold text-amber-300 block">
              Bàn #{myMatchup?.tableNumber || 1} • Vòng {state.currentRound}
            </span>
            <span className="text-[10px] text-amber-200/70">
              {isPlayer1 ? 'Quân Trắng (Đi trước)' : 'Quân Đen (Hậu thủ)'}
            </span>
          </div>
        </div>

        <div className="text-right flex items-center gap-3">
          {roundTimeLeft && (
            <div className="text-right">
              <span className="text-[10px] text-amber-300/80 block">Thời gian hiệp</span>
              <span className="text-xs font-mono font-bold text-amber-300">⏱️ {roundTimeLeft}</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Điểm cờ</span>
            <span className="text-sm font-black text-amber-400">{myState?.tournamentPoints || 0} đ</span>
          </div>
        </div>
      </div>

      {/* 3.2 Thanh so găng đối kháng 2 bên */}
      <div className="my-2 bg-[#2d1b0f] border-2 border-[#7a4927] rounded-2xl p-3 shadow-md">
        <div className="flex items-center justify-between text-xs">
          {/* Bạn */}
          <div className="flex-1 text-left">
            <span className="text-[10px] text-amber-300 uppercase font-bold block">Bạn</span>
            <strong className="text-sm text-white truncate block max-w-[120px]">
              {myState?.displayName || 'Bạn'}
            </strong>
            <span className="text-xs text-amber-400 font-bold">
              {myAnsweredAll ? `Đã nộp (${myScoreInMatch}/2)` : `${answeredCount}/2 câu đã chọn`}
            </span>
          </div>

          {/* VS Tỉ số */}
          <div className="px-3 py-1 bg-black/40 rounded-xl border border-amber-500/40 text-center shrink-0">
            <span className="text-[10px] text-amber-400 block font-bold">TỶ SỐ</span>
            <span className="text-base font-black text-amber-300 font-mono">
              {myAnsweredAll && opponentAnsweredAll ? `${myScoreInMatch} - ${oppScoreInMatch}` : `? - ?`}
            </span>
          </div>

          {/* Đối thủ */}
          <div className="flex-1 text-right">
            <span className="text-[10px] text-rose-300 uppercase font-bold block">Đối thủ</span>
            <strong className="text-sm text-slate-200 truncate block max-w-[120px] ml-auto">
              {opponentState?.displayName || 'Đối thủ'}
            </strong>
            <span className="text-xs text-slate-400 font-medium">
              {opponentAnsweredAll ? 'Đã nộp ✓' : 'Đang làm... ⏳'}
            </span>
          </div>
        </div>
      </div>

      {/* 3.3 Hiển thị khi cả 2 đã nộp bài: Xem kết quả và đáp án chi tiết */}
      {myAnsweredAll && opponentAnsweredAll ? (
        <div className="my-auto py-4 text-center space-y-3">
          <ChessWoodCard className="p-5 border-2 border-amber-400">
            {myMatchup?.result === (isPlayer1 ? 'player1_win' : 'player2_win') ? (
              <div className="space-y-1">
                <span className="text-4xl block animate-bounce">🏆</span>
                <h3 className="text-xl font-bold text-emerald-400 uppercase">
                  Chiến Thắng! (+2đ)
                </h3>
                <p className="text-xs text-amber-200">
                  Bạn đúng {myScoreInMatch}/2 câu, đối thủ đúng {oppScoreInMatch}/2 câu.
                </p>
              </div>
            ) : myMatchup?.result === 'draw' ? (
              <div className="space-y-1">
                <span className="text-4xl block">🤝</span>
                <h3 className="text-xl font-bold text-amber-300 uppercase">
                  Hòa Trận! (+1đ)
                </h3>
                <p className="text-xs text-amber-200">
                  Cả hai đều trả lời đúng {myScoreInMatch}/2 câu.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-4xl block">♟️</span>
                <h3 className="text-xl font-bold text-rose-400 uppercase">
                  Thua Cuộc (+0đ)
                </h3>
                <p className="text-xs text-slate-300">
                  Bạn đúng {myScoreInMatch}/2 câu, đối thủ đúng {oppScoreInMatch}/2 câu.
                </p>
              </div>
            )}

            {/* Chi tiết đáp án đúng / sai 2 câu */}
            <div className="mt-4 pt-3 border-t border-amber-900/60 text-left space-y-2 text-xs">
              <span className="font-bold text-amber-300 block text-center">Chi tiết đáp án vòng này:</span>
              {[0, 1].map(qIdx => {
                const q = state.roundQuestions[qIdx];
                const isRight = myResults ? myResults[qIdx] : false;
                const myAns = myAnswers ? myAnswers[qIdx] : selectedAnswers[qIdx];
                return (
                  <div key={qIdx} className={`p-2 rounded-xl border ${isRight ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200' : 'bg-rose-950/60 border-rose-600/60 text-rose-200'}`}>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Câu {qIdx + 1}: {isRight ? 'ĐÚNG ✓' : 'SAI ✗'}</span>
                      {q?.correctAnswer !== undefined && (
                        <span className="text-amber-300 font-mono">Đ/A: {String(q.correctAnswer)}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Bạn đã chọn: <b className="text-white">{myAns !== undefined ? String(myAns) : '(Chưa chọn)'}</b>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Đồng hồ đếm ngược 10s */}
            {state.status === 'round_review' && (
              <div className="mt-4 pt-3 border-t border-amber-800/60">
                <span className="text-xs text-amber-300 block mb-1">
                  Đếm ngược bốc thăm Vòng tiếp theo:
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono animate-pulse">
                  {remainingCountdown}s
                </span>
              </div>
            )}
          </ChessWoodCard>
        </div>
      ) : myAnsweredAll ? (
        // Đã nộp bài nhưng đối thủ chưa xong
        <div className="my-auto py-8 text-center space-y-3">
          <ChessWoodCard className="p-6 border-amber-600/50">
            <span className="text-4xl block animate-spin-slow">⏳</span>
            <h3 className="text-lg font-bold text-amber-300">
              Bạn đã nộp bài thành công!
            </h3>
            <p className="text-xs text-amber-200/80 mt-1">
              Đang đợi đối thủ <b>{opponentState?.displayName || 'đối thủ'}</b> hoàn thành nước đi để phân định kết quả...
            </p>
          </ChessWoodCard>
        </div>
      ) : (
        // 3.4 Khung làm bài (2 câu hỏi)
        <div className="flex-1 flex flex-col justify-between my-2 space-y-3">
          {/* Nút chuyển đổi câu 1 / câu 2 */}
          <div className="flex gap-2">
            {[0, 1].map(qIdx => {
              const isPicked = selectedAnswers[qIdx] !== undefined && selectedAnswers[qIdx] !== '';
              return (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => setActiveQuestionIndex(qIdx)}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                    activeQuestionIndex === qIdx
                      ? 'bg-amber-500 text-black border-amber-300 shadow-md'
                      : isPicked
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                      : 'bg-[#24160c] text-amber-200 border-[#5c371d]'
                  }`}
                >
                  Câu {qIdx + 1} {isPicked && '✓'}
                </button>
              );
            })}
          </div>

          {currentQ ? (
            <div className="flex-1 flex flex-col justify-between space-y-3">
              {/* Nội dung câu hỏi */}
              <div className="bg-[#26150b] border border-[#6b3f20] rounded-2xl p-4 shadow-md">
                <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                  Nước cờ #{activeQuestionIndex + 1}
                </span>
                <p
                  className="text-base sm:text-lg font-bold leading-relaxed text-[#f7f0e1]"
                  dangerouslySetInnerHTML={{ __html: renderLatexInText(currentQ.stem) }}
                />
                {currentQ.image && (
                  <div className="mt-2 max-h-36 flex justify-center">
                    <img
                      src={currentQ.image}
                      alt="Hình câu hỏi"
                      className="max-h-36 object-contain rounded-xl border border-amber-900/60"
                    />
                  </div>
                )}
              </div>

              {/* Tùy chọn trả lời: Short text / MCQ / Đúng sai */}
              <div className="space-y-2">
                {currentQ.type === 'short' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      disabled={Boolean(myAnsweredAll)}
                      value={String(selectedAnswers[activeQuestionIndex] ?? '')}
                      onChange={e => handlePickAnswer(activeQuestionIndex, e.target.value)}
                      placeholder="Nhập câu trả lời ngắn của bạn..."
                      className="w-full p-3.5 rounded-xl bg-[#2b190d] border border-amber-500/50 text-amber-100 placeholder-amber-200/40 text-sm focus:border-amber-300 outline-none"
                    />
                  </div>
                ) : currentQ.options && currentQ.options.length > 0 ? (
                  currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[activeQuestionIndex] === optIdx;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={Boolean(myAnsweredAll)}
                        onClick={() => handlePickAnswer(activeQuestionIndex, optIdx)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-300 shadow-lg scale-[1.01]'
                            : 'bg-[#2b190d] hover:bg-[#382112] text-[#f2e7d3] border-[#5e381d] active:scale-[0.99]'
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-black/30 border border-amber-500/30 flex items-center justify-center text-xs font-bold shrink-0 text-amber-300">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span
                          className="text-sm font-semibold leading-snug flex-1"
                          dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                        />
                      </button>
                    );
                  })
                ) : (
                  // Đúng / Sai fallback
                  <div className="grid grid-cols-2 gap-3">
                    {['Đúng', 'Sai'].map((label, bIdx) => {
                      const val = bIdx === 0;
                      const isSelected = selectedAnswers[activeQuestionIndex] === val;
                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={Boolean(myAnsweredAll)}
                          onClick={() => handlePickAnswer(activeQuestionIndex, val)}
                          className={`py-4 rounded-xl font-bold text-base cursor-pointer border transition ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-300 shadow-lg'
                              : 'bg-[#2b190d] hover:bg-[#3d2413] text-amber-200 border-[#5e381d]'
                          } disabled:opacity-75 disabled:cursor-not-allowed`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* NÚT NỘP BÀI THI - Nổi bật và cố định ở đáy */}
              <div className="sticky bottom-0 bg-[#170e06]/95 backdrop-blur-xs pt-3 pb-2 z-20">
                <button
                  type="button"
                  disabled={Boolean(myAnsweredAll)}
                  onClick={handleSubmitRound}
                  className={`w-full py-4 text-black font-black text-sm sm:text-base rounded-2xl shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 border-2 ${
                    myAnsweredAll
                      ? 'bg-slate-700 text-slate-300 border-slate-600 opacity-60 cursor-not-allowed'
                      : answeredCount === 2
                      ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 border-amber-200 animate-pulse scale-[1.01]'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border-amber-400'
                  }`}
                >
                  <span>
                    {myAnsweredAll
                      ? '✓ ĐÃ NỘP BÀI (ĐANG CHỜ ĐỐI THỦ)'
                      : `✓ XÁC NHẬN NỘP BÀI (${answeredCount}/2 CÂU)`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-amber-200 py-8">
              Đang tải câu hỏi...
            </div>
          )}
        </div>
      )}

      {/* 3.5 Footer thông tin */}
      <div className="text-center text-[10px] text-amber-200/50 pt-2 shrink-0 border-t border-[#3d2413]">
        Đấu Cờ Thụy Sỹ • Thắng +2đ • Hòa +1đ • Thua +0đ
      </div>
    </div>
  );
};
