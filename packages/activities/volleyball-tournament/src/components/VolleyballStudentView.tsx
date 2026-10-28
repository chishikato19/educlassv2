import React, { useState, useEffect } from 'react';
import type { VolleyballIntent, VolleyballTournamentState } from '../volleyball-schemas.js';

export interface StudentViewProps {
  runId: string;
  state: VolleyballTournamentState;
  participantId: string;
  onSendIntent: (intent: VolleyballIntent) => void;
}

const OPTION_SHAPES = ['▲', '◆', '●', '■'];
const OPTION_COLORS = [
  'bg-red-500 hover:bg-red-600 text-white border-red-600',
  'bg-blue-500 hover:bg-blue-600 text-white border-blue-600',
  'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
  'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600',
];

export const VolleyballStudentView: React.FC<StudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, unknown>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  const myState = state.participants[participantId];
  const myMatchup = state.activeMatchups.find(
    m => m.player1Id === participantId || m.player2Id === participantId
  );
  const isPlayer1 = myMatchup?.player1Id === participantId;
  const opponentId = isPlayer1 ? myMatchup?.player2Id : myMatchup?.player1Id;
  const opponentState = opponentId ? state.participants[opponentId] : null;

  const currentQuestions = state.roundQuestions || [];
  const activeQ = currentQuestions[activeQuestionIndex];

  useEffect(() => {
    if (!myState) {
      onSendIntent({
        type: 'join_tournament',
      });
    }
  }, [myState, onSendIntent]);

  // Đồng bộ selectedAnswers với myAnswers từ server nếu đã có
  useEffect(() => {
    if (myMatchup) {
      const answers = isPlayer1 ? myMatchup.player1Answers : myMatchup.player2Answers;
      if (answers && Object.keys(answers).length > 0) {
        setSelectedAnswers(prev => ({ ...prev, ...answers }));
      }
    }
  }, [myMatchup, isPlayer1]);

  const handleSelectOption = (questionId: string, answerVal: unknown) => {
    if (selectedAnswers[questionId] !== undefined) return; // Đã chốt câu này

    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerVal }));
    onSendIntent({
      type: 'submit_answer',
      questionId,
      answer: answerVal,
    });

    // Tự động nhảy sang câu 2 nếu còn
    if (activeQuestionIndex === 0 && currentQuestions.length > 1) {
      setTimeout(() => setActiveQuestionIndex(1), 300);
    }
  };

  // 1. Màn hình FINISHED: Vinh danh giải đấu
  if (state.status === 'finished') {
    const myStanding = state.finalStandings.find(s => s.participantId === participantId);
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-4 text-center select-none">
        <div className="text-6xl mb-3 animate-bounce">🏐🏆</div>
        <h2 className="text-2xl font-black text-slate-800 mb-1">KẾT THÚC GIẢI ĐẤU</h2>
        <p className="text-sm text-slate-500 mb-6">{state.title}</p>

        {myStanding && (
          <div className="w-full max-w-sm bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 shadow-lg mb-6">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-700 bg-amber-200/60 px-3 py-1 rounded-full">
              Thành tích chung cuộc
            </span>
            <div className="text-4xl font-black text-amber-600 mt-3 mb-1">
              Hạng #{myStanding.rank}
            </div>
            <div className="text-sm font-semibold text-slate-700 capitalize">
              Cúp{' '}
              {myStanding.tier === 'diamond'
                ? 'Kim Cương'
                : myStanding.tier === 'gold'
                  ? 'Vàng'
                  : myStanding.tier === 'silver'
                    ? 'Bạc'
                    : 'Đồng'}
            </div>
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-amber-200 text-xs text-slate-600">
              <div>
                Điểm giải: <b className="text-slate-800">{myStanding.tournamentPoints}đ</b>
              </div>
              <div>
                Số câu đúng: <b className="text-slate-800">{myStanding.correctCount}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Màn hình GIẢI LAO VÒNG BẢNG (INTERMISSION)
  if (state.status === 'pool_stage_intermission') {
    const myPool = myState ? state.pools[myState.poolId] : null;
    return (
      <div className="flex flex-col items-center p-4 max-w-md mx-auto select-none">
        <div className="text-5xl mb-2">🏐📋</div>
        <h3 className="text-xl font-black text-slate-800">KẾT THÚC VÒNG BẢNG</h3>
        <p className="text-xs text-slate-500 mb-4">
          Chuẩn bị bước vào Vòng Bắt Cặp Xếp Hạng 4 Cúp!
        </p>

        {myPool && (
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-4">
            <div className="text-sm font-bold text-blue-600 mb-2 flex items-center justify-between">
              <span>{myPool.name} của bạn</span>
              <span className="text-xs text-slate-400 font-normal">Hạng nội bộ</span>
            </div>
            <div className="divide-y divide-slate-100">
              {myPool.standings.map(s => {
                const isMe = s.participantId === participantId;
                return (
                  <div
                    key={s.participantId}
                    className={`py-2 px-3 rounded-xl flex items-center justify-between text-sm ${
                      isMe ? 'bg-blue-50 font-bold text-blue-800' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                        #{s.rankInPool}
                      </span>
                      <span>
                        {s.displayName} {isMe && '(Bạn)'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-800">{s.tournamentPoints}đ</span> (
                      {s.correctCount} câu)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="text-xs text-slate-400 animate-pulse text-center">
          Thầy/cô đang chuẩn bị bốc thăm 4 Cúp...
        </div>
      </div>
    );
  }

  // 3. Màn hình THI ĐẤU (VÒNG BẢNG hoặc VÒNG PLAYOFF)
  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-3 select-none">
      {/* Header trạng thái trận đấu */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <span>🏐</span>
            {state.currentStage === 'pools' ? `BẢNG ${myState?.poolId || 'A'}` : 'VÒNG XẾP HẠNG'}
          </span>
          <span className="text-slate-500 font-medium">Lượt {state.currentRound}/5</span>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {myState?.displayName?.charAt(0) || 'B'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">Bạn</div>
              <div className="text-[10px] text-slate-400">
                {Object.keys(selectedAnswers).length}/{currentQuestions.length} câu
              </div>
            </div>
          </div>

          <div className="text-xs font-black text-slate-400 px-2">VS</div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {opponentState?.displayName || 'Đối thủ'}
              </div>
              <div className="text-[10px] text-slate-400">
                {myMatchup?.player2Answered ? 'Đã xong' : 'Đang làm...'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs">
              {opponentState?.displayName?.charAt(0) || 'Đ'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs chuyển câu hỏi 1 và 2 */}
      {currentQuestions.length > 1 && (
        <div className="flex gap-2 mb-3">
          {currentQuestions.map((q, idx) => {
            const isDone = selectedAnswers[q.id] !== undefined;
            const isCurrent = idx === activeQuestionIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveQuestionIndex(idx)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 border ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <span>Câu {idx + 1}</span>
                {isDone && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Nội dung câu hỏi */}
      {activeQ ? (
        <div className="flex-1 flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-3">
            <div className="text-sm font-bold text-slate-800 leading-relaxed">{activeQ.stem}</div>
            {activeQ.image && (
              <img
                src={activeQ.image}
                alt="Hình minh họa"
                className="mt-3 rounded-xl max-h-40 mx-auto object-contain"
              />
            )}
          </div>

          {/* Các nút bấm lựa chọn đáp án */}
          <div className="grid grid-cols-1 gap-2.5 mb-2">
            {activeQ.type === 'mcq4' && activeQ.options ? (
              activeQ.options.map((optText, optIdx) => {
                const isSelected = selectedAnswers[activeQ.id] === optIdx;
                const shape = OPTION_SHAPES[optIdx % 4];
                const colorClass = OPTION_COLORS[optIdx % 4];

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={selectedAnswers[activeQ.id] !== undefined}
                    onClick={() => handleSelectOption(activeQ.id, optIdx)}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl font-bold text-sm border-2 text-left flex items-center gap-3 transition-all active:scale-[0.98] ${
                      isSelected ? 'ring-4 ring-blue-300 ring-offset-1 ' + colorClass : colorClass
                    }`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center text-xs font-black shrink-0">
                      {shape}
                    </span>
                    <span className="flex-1 leading-snug">{optText}</span>
                  </button>
                );
              })
            ) : activeQ.type === 'tf' ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={selectedAnswers[activeQ.id] !== undefined}
                  onClick={() => handleSelectOption(activeQ.id, true)}
                  className="min-h-[64px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg border-2 border-emerald-600 active:scale-[0.98]"
                >
                  ĐÚNG
                </button>
                <button
                  type="button"
                  disabled={selectedAnswers[activeQ.id] !== undefined}
                  onClick={() => handleSelectOption(activeQ.id, false)}
                  className="min-h-[64px] bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-lg border-2 border-red-600 active:scale-[0.98]"
                >
                  SAI
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400">
                Dạng câu hỏi chưa được hỗ trợ trên mobile view.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
          Đang chờ câu hỏi từ máy chủ...
        </div>
      )}
    </div>
  );
};
