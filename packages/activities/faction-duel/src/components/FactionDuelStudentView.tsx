import React, { useState, useEffect } from 'react';
import type { FactionDuelState, FactionQuestion } from '../faction-schemas.js';

export interface StudentViewProps {
  runId: string;
  state: FactionDuelState;
  participantId: string;
  studentName?: string | undefined;
  onSendIntent: (intent: unknown) => void;
  onSwitchStudent?: (() => void) | undefined;
}

export const FactionDuelStudentView: React.FC<StudentViewProps> = ({
  state,
  participantId,
  studentName,
  onSendIntent,
}) => {
  // Tìm thông tin của mình
  const myMember =
    state.teamBlue.find(m => m.participantId === participantId) ||
    state.teamRed.find(m => m.participantId === participantId);

  const myTeam = myMember?.team ?? 'blue';
  const isBlue = myTeam === 'blue';

  // Tìm trận đấu hiện tại của mình
  const currentMatch = state.currentMatchups.find(
    m => m.blueParticipantId === participantId || m.redParticipantId === participantId
  );

  const opponentId = currentMatch
    ? isBlue
      ? currentMatch.redParticipantId
      : currentMatch.blueParticipantId
    : undefined;

  const opponentMember = opponentId
    ? (isBlue ? state.teamRed : state.teamBlue).find(m => m.participantId === opponentId)
    : undefined;

  // Quản lý câu hỏi hiện tại đang làm (nếu có 2 câu)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, unknown>>({});
  const [textAnswer, setTextAnswer] = useState('');

  // Reset khi sang round mới
  useEffect(() => {
    setActiveQuestionIdx(0);
    setSelectedAnswers({});
    setTextAnswer('');
  }, [state.currentRound, state.status]);

  // Đồng hồ đếm ngược cho pha 15s
  const [pickSecondsLeft, setPickSecondsLeft] = useState(15);
  useEffect(() => {
    if (state.status !== 'pick_phase' || !state.pickPhase) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.pickPhase!.expiresAt - Date.now()) / 1000));
      setPickSecondsLeft(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [state.status, state.pickPhase]);

  // Gửi câu trả lời
  const handleAnswer = (question: FactionQuestion, answer: unknown) => {
    if (selectedAnswers[question.id] !== undefined) return; // Đã trả lời

    setSelectedAnswers(prev => ({ ...prev, [question.id]: answer }));

    const timeSpentMs = state.roundStartTime
      ? Math.max(0, Date.now() - state.roundStartTime)
      : 1000;

    onSendIntent({
      type: 'submit_answer',
      questionId: question.id,
      answer,
      timeMs: timeSpentMs,
    });

    // Chuyển sang câu tiếp theo nếu còn
    if (activeQuestionIdx + 1 < state.currentQuestions.length) {
      setActiveQuestionIdx(prev => prev + 1);
      setTextAnswer('');
    }
  };

  // Chọn đối thủ trong pha 15s
  const handleSelectOpponent = (targetId: string) => {
    onSendIntent({
      type: 'select_opponent',
      targetParticipantId: targetId,
    });
  };

  // 1. Màn hình Chờ / Kết Thúc
  if (state.status === 'finished') {
    const isTeamWon =
      (isBlue && state.scoreBlue > state.scoreRed) || (!isBlue && state.scoreRed > state.scoreBlue);
    const isDraw = state.scoreBlue === state.scoreRed;

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-5xl mb-4 shadow-xl border-4 border-amber-400 animate-bounce">
          {isDraw ? '🤝' : isTeamWon ? '🏆' : '🎖️'}
        </div>
        <h1 className="text-2xl font-black mb-2">
          {isDraw ? 'TRẬN ĐẤU BẤT PHÂN THẮNG BẠI!' : isTeamWon ? 'PHE BẠN ĐÃ CHIẾN THẮNG!' : 'PHE BẠN ĐÃ CHIẾN ĐẤU HẾT MÌNH!'}
        </h1>
        <p className="text-slate-300 text-sm mb-6">
          Điểm số chung cuộc: <span className="text-blue-400 font-bold">Xanh {state.scoreBlue}</span> -{' '}
          <span className="text-red-400 font-bold">Đỏ {state.scoreRed}</span>
        </p>
        <div className="bg-slate-800 p-4 rounded-2xl w-full max-w-sm border border-slate-700">
          <p className="text-xs text-slate-400">Học sinh</p>
          <p className="text-lg font-bold text-amber-300">{studentName || myMember?.displayName}</p>
          <div className="mt-2 text-xs text-slate-300 bg-slate-700/50 py-1.5 px-3 rounded-lg">
            Phe: {isBlue ? '🔵 Xanh Dương' : '🔴 Đỏ Hỏa Diệm'} • Elo: {myMember?.elo}
          </div>
        </div>
      </div>
    );
  }

  // 2. Màn hình Pha Chọn Đấu Thủ 15 Giây (Pick Phase)
  if (state.status === 'pick_phase' && state.pickPhase) {
    const isAttacker = state.pickPhase.attackingTeam === myTeam;
    const opposingTeamMembers = isBlue ? state.teamRed : state.teamBlue;
    const claimedIds = state.pickPhase.claimedTargetIds;
    const myPair = state.pickPhase.pairs.find(p => p.attackerId === participantId);

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isBlue ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {isBlue ? '🔵 Phe Xanh' : '🔴 Phe Đỏ'}
            </span>
            <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black border border-amber-500/40 animate-pulse">
              ⏱️ {pickSecondsLeft}s
            </div>
          </div>

          <h2 className="text-lg font-black text-center mb-1">
            {isAttacker ? '🎯 CHỌN ĐỐI THỦ CỦA BẠN!' : '🛡️ ĐANG CHỜ ĐỐI THỦ THÁCH ĐẤU...'}
          </h2>
          <p className="text-xs text-slate-400 text-center mb-4">
            {isAttacker
              ? 'Phe bạn dẫn trước! Hãy bấm chọn 1 đối thủ bên dưới trước khi hết 15s.'
              : 'Phe bạn đang bị thách đấu. Hãy chuẩn bị tinh thần phản đòn!'}
          </p>

          {/* Nếu là phe tấn công: Hiện danh sách đối thủ */}
          {isAttacker ? (
            myPair ? (
              <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-2xl text-center my-6">
                <div className="text-3xl mb-2">⚔️</div>
                <p className="text-sm font-bold text-emerald-300">ĐÃ CHỐT ĐỐI THỦ!</p>
                <p className="text-xs text-slate-300 mt-1">
                  Bạn sẽ so tài cùng{' '}
                  <span className="font-bold text-white">
                    {opposingTeamMembers.find(m => m.participantId === myPair.targetId)?.displayName}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-2">Vòng đấu sẽ bắt đầu khi hết 15 giây...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {opposingTeamMembers.map(opp => {
                  const isClaimed = claimedIds.includes(opp.participantId);
                  const eloDiff = (myMember?.elo ?? 1000) - opp.elo;
                  let bonusTag = '+2đ';
                  let bonusColor = 'bg-slate-700 text-slate-300';
                  if (eloDiff < -100) {
                    bonusTag = '+3đ (Lật kèo!)';
                    bonusColor = 'bg-amber-500 text-slate-950 font-black';
                  } else if (eloDiff > 100) {
                    bonusTag = '+1đ (Kèo trên)';
                    bonusColor = 'bg-blue-600/60 text-white';
                  }

                  return (
                    <button
                      key={opp.participantId}
                      disabled={isClaimed}
                      onClick={() => handleSelectOpponent(opp.participantId)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition min-h-[90px] ${
                        isClaimed
                          ? 'bg-slate-900/60 border-slate-800 opacity-40 cursor-not-allowed'
                          : 'bg-slate-800/90 border-slate-700 active:scale-95 hover:border-amber-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white truncate max-w-[100px]">
                            {opp.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400">Elo {opp.elo}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md inline-block ${bonusColor}`}>
                          {isClaimed ? 'Đã bị chọn' : bonusTag}
                        </span>
                      </div>
                      {!isClaimed && (
                        <div className="mt-2 text-right">
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/30">
                            Thách Đấu ⚔️
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            // Phe bị thách đấu
            <div className="flex flex-col items-center justify-center my-12 text-center">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-red-500 animate-spin flex items-center justify-center mb-4">
                <span className="text-3xl">🛡️</span>
              </div>
              <p className="text-sm font-bold text-red-300">ĐANG ĐỢI BỊ THÁCH ĐẤU...</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Nếu thắng đối thủ kèo trên, bạn sẽ đem về tới <span className="text-amber-400 font-bold">+3 điểm</span>{' '}
                cho phe nhà!
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          Tỉ số: Xanh {state.scoreBlue} - {state.scoreRed} Đỏ
        </div>
      </div>
    );
  }

  // 3. Màn hình Thi Đấu 1v1 Đồng Loạt (Round Active)
  const currentQ = state.currentQuestions[activeQuestionIdx];
  const totalQ = state.currentQuestions.length;
  const isDoneAll = Object.keys(selectedAnswers).length >= totalQ && totalQ > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4">
      {/* Top Header Matchup Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isBlue ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`}
            />
            <span className="text-xs font-bold text-slate-200">
              Lượt {state.currentRound}/{state.totalRounds}
            </span>
          </div>
          <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
            {isBlue ? 'XANH' : 'ĐỎ'} {isBlue ? state.scoreBlue : state.scoreRed} :{' '}
            {isBlue ? state.scoreRed : state.scoreBlue} {!isBlue ? 'XANH' : 'ĐỎ'}
          </span>
        </div>

        {/* Cặp đấu 1v1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 max-w-[40%]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isBlue ? 'bg-blue-600' : 'bg-red-600'}`}>
              {myMember?.displayName?.slice(0, 1) || 'B'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{myMember?.displayName}</p>
              <p className="text-[10px] text-slate-400">Elo {myMember?.elo}</p>
            </div>
          </div>

          <span className="text-xs font-black text-slate-500">VS</span>

          <div className="flex items-center gap-2 max-w-[40%] text-right justify-end">
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{opponentMember?.displayName || 'Đối thủ'}</p>
              <p className="text-[10px] text-slate-400">Elo {opponentMember?.elo ?? 1000}</p>
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${!isBlue ? 'bg-blue-600' : 'bg-red-600'}`}>
              {opponentMember?.displayName?.slice(0, 1) || 'Đ'}
            </div>
          </div>
        </div>

        {/* Nội dung câu hỏi */}
        {isDoneAll ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl mb-3 animate-pulse">
              ✓
            </div>
            <p className="text-base font-bold text-emerald-300">ĐÃ GỬI BÀI LÀM!</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Đang đợi đối thủ và cả lớp hoàn thành để chấm điểm và phân định thắng thua...
            </p>
          </div>
        ) : currentQ ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Câu hỏi {activeQuestionIdx + 1}/{totalQ}</span>
              {currentQ.timeLimitSeconds && <span>⏱️ {currentQ.timeLimitSeconds}s</span>}
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-4 shadow-inner">
              <p className="text-sm font-semibold text-white leading-relaxed">{currentQ.stem.text}</p>
            </div>

            {/* Các lựa chọn trả lời */}
            {currentQ.type === 'mcq4' && currentQ.options && (
              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const letter = letters[idx] || '';
                  const isSelected = selectedAnswers[currentQ.id] === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(currentQ, opt.id)}
                      disabled={selectedAnswers[currentQ.id] !== undefined}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3 transition min-h-[48px] active:scale-[0.98] ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                          : 'bg-slate-800/80 border-slate-700/80 text-white hover:border-slate-500'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center text-xs font-black shrink-0">
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-tight">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ.type === 'tf' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => handleAnswer(currentQ, true)}
                  disabled={selectedAnswers[currentQ.id] !== undefined}
                  className="p-4 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-center border border-emerald-400 active:scale-95 min-h-[48px]"
                >
                  ✓ ĐÚNG
                </button>
                <button
                  onClick={() => handleAnswer(currentQ, false)}
                  disabled={selectedAnswers[currentQ.id] !== undefined}
                  className="p-4 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-center border border-red-400 active:scale-95 min-h-[48px]"
                >
                  ✕ SAI
                </button>
              </div>
            )}

            {currentQ.type === 'short' && (
              <div className="space-y-3 mt-4">
                <input
                  type="text"
                  placeholder="Nhập câu trả lời..."
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-white text-sm focus:outline-hidden focus:border-amber-400 min-h-[48px]"
                />
                <button
                  onClick={() => handleAnswer(currentQ, textAnswer)}
                  disabled={!textAnswer.trim() || selectedAnswers[currentQ.id] !== undefined}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm disabled:opacity-50 min-h-[48px]"
                >
                  Xác nhận câu trả lời
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="text-center text-[11px] text-slate-500 pt-3">
        Đại Chiến Xanh Đỏ • EduClass v2
      </div>
    </div>
  );
};
