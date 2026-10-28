import React, { useState, useEffect } from 'react';
import { renderLatexInText } from '@educlass/question-kit';
import type { TerritoryStudentIntent, TerritoryWarState } from '../territory-schemas.js';
import { TerritoryGrid } from './TerritoryGrid.js';
import { territorySound } from './TerritorySound.js';
import { getLeaderboardByTeam, getParticipantScore } from '../territory-logic.js';

export interface StudentViewProps {
  runId: string;
  state: TerritoryWarState;
  participantId: string;
  onSendIntent: (intent: TerritoryStudentIntent) => void;
}

export const TerritoryStudentView: React.FC<StudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
}) => {
  const me = state.participants[participantId];
  const myTeam = me?.team ?? 'blue';
  const myLockedCellId = me?.currentLockCellId;
  const myCell = myLockedCellId ? state.cells[myLockedCellId] : null;
  const currentQuestion = myCell?.lockedBy?.question;

  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [shortAnswerInput, setShortAnswerInput] = useState<string>('');

  // Đếm ngược thời gian trận đấu
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

  // Đếm ngược hồi chiêu cá nhân
  useEffect(() => {
    if (me?.cooldownUntil && me.cooldownUntil > Date.now()) {
      const updateCd = () => {
        const diff = Math.max(0, Math.ceil((me.cooldownUntil! - Date.now()) / 1000));
        setCooldownSec(diff);
      };
      updateCd();
      const interval = setInterval(updateCd, 500);
      return () => clearInterval(interval);
    } else {
      setCooldownSec(0);
    }
    return undefined;
  }, [me?.cooldownUntil]);

  const handleSelectCell = (cellId: string) => {
    if (cooldownSec > 0) return;
    territorySound.playAttack();
    onSendIntent({ type: 'lock_cell', cellId });
  };

  const handleSubmitAnswer = (answer: unknown) => {
    if (!myLockedCellId) return;
    territorySound.playCapture();
    onSendIntent({ type: 'submit_answer', cellId: myLockedCellId, answer });
    setShortAnswerInput('');
  };

  const handleCancelCell = () => {
    if (!myLockedCellId) return;
    onSendIntent({ type: 'cancel_cell', cellId: myLockedCellId });
    setShortAnswerInput('');
  };

  // 1. MÀN HÌNH KẾT THÚC TRẬN ĐẤU
  if (state.status === 'finished') {
    const isWinner = state.winnerTeam === myTeam;
    const isDraw = state.winnerTeam === 'draw';
    const { allRanked } = getLeaderboardByTeam(state.participants);
    const myScore = me ? getParticipantScore(me) : 0;

    return (
      <div
        className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-start text-center space-y-4 select-none"
        data-testid="territory-student-finished"
      >
        <div className="text-5xl mt-2">{isWinner ? '🏆' : isDraw ? '🤝' : '🛡️'}</div>
        <div className="space-y-1">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isWinner ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'
            }`}
          >
            {isWinner ? 'Toàn Thắng Lãnh Thổ' : isDraw ? 'Hòa Điểm' : 'Hết Trận'}
          </span>
          <h1 className="text-2xl font-black text-amber-300">
            {isWinner
              ? 'PHE BẠN ĐÃ CHIẾN THẮNG!'
              : isDraw
                ? 'HAI PHE BẤT PHÂN THẮNG BẠI'
                : 'PHE BẠN ĐÃ CHIẾN ĐẤU QUẢ CẢM!'}
          </h1>
          <p className="text-xs text-slate-300 max-w-xs mx-auto">
            {state.winReason || 'Trận chiến đã khép lại với nhiều dấu ấn xuất sắc!'}
          </p>
        </div>

        {/* Điểm số cá nhân & Tỉ số chung cuộc */}
        {me && (
          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl w-full max-w-sm space-y-2.5">
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
              <span className="text-xs font-bold text-slate-300">Đóng Góp Của Bạn:</span>
              <span className="text-lg font-black text-amber-400 font-mono">+{myScore} điểm</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Chiếm đất</span>
                <span className="text-sm font-black text-emerald-400">{me.capturedCount} ô</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Gia cố</span>
                <span className="text-sm font-black text-amber-400">{me.fortifiedCount} lần</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl">
                <span className="text-[11px] text-slate-400 block">Đúng</span>
                <span className="text-sm font-black text-blue-400">{me.correctCount} câu</span>
              </div>
            </div>
          </div>
        )}

        {/* Bảng Xếp Hạng Điểm Từng Người Chơi */}
        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl w-full max-w-sm space-y-2 text-left">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1 border-b border-slate-700">
            <span>🏆 Bảng Điểm Tướng Lĩnh ({allRanked.length} HS):</span>
            <span className="text-[10px] text-amber-400">
              🔵{state.blueScore}đ - 🔴{state.redScore}đ
            </span>
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {allRanked.map((p, idx) => {
              const pScore = getParticipantScore(p);
              const isMe = p.participantId === participantId;
              const isBlue = p.team === 'blue';
              return (
                <div
                  key={p.participantId}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                    isMe
                      ? 'bg-amber-500/20 border-amber-400/60 ring-1 ring-amber-400/40'
                      : isBlue
                        ? 'bg-blue-950/40 border-blue-900/40'
                        : 'bg-red-950/40 border-red-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[11px] text-slate-400 w-4 text-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="shrink-0">{isBlue ? '🔵' : '🔴'}</span>
                    <span
                      className={`font-bold truncate ${isMe ? 'text-amber-300' : 'text-white'}`}
                    >
                      {p.displayName} {isMe && '(Bạn)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-1">
                    <span className="text-[10px] text-slate-400">
                      🏰{p.capturedCount} ✓{p.correctCount}
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-xs">+{pScore}đ</span>
                  </div>
                </div>
              );
            })}
            {allRanked.length === 0 && (
              <p className="text-[11px] text-slate-500 italic text-center py-2">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH CHỜ BẮT ĐẦU
  if (state.status === 'waiting') {
    return (
      <div
        className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-center text-center space-y-5 select-none"
        data-testid="territory-student-waiting"
      >
        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl animate-pulse">
          🏰
        </div>
        <div className="space-y-1">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              myTeam === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {myTeam === 'blue' ? '🔵 BẠN THUỘC PHE XANH' : '🔴 BẠN THUỘC PHE ĐỎ'}
          </span>
          <h2 className="text-xl font-bold text-white mt-2">Sẵn Sàng Xuất Kích</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            Thầy/Cô đang sắp xếp quân đội hai phe. Hãy quan sát bản đồ chiến lược bên dưới!
          </p>
        </div>

        <div className="w-full max-w-xs">
          <TerritoryGrid
            mapSize={state.mapSize}
            cells={state.cells}
            interactive={false}
            viewerTeam={myTeam}
          />
        </div>
      </div>
    );
  }

  // 3. MÀN HÌNH ĐANG CHIẾN ĐẤU (IN_PROGRESS)
  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-3 select-none"
      data-testid="territory-student-fighting"
    >
      {/* Top Banner Thông tin */}
      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase shadow ${
              myTeam === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {myTeam === 'blue' ? '🔵 PHE XANH' : '🔴 PHE ĐỎ'}
          </span>
          <span className="text-xs font-mono font-bold text-amber-400">
            ⏱️ {timeLeftStr || '00:00'}
          </span>
        </div>

        {/* Điểm số 2 phe */}
        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <span className="text-blue-400">X: {state.blueScore}</span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400">Đ: {state.redScore}</span>
        </div>
      </div>

      {/* Thông báo phạt hồi chiêu nếu có */}
      {cooldownSec > 0 && (
        <div className="my-1.5 p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center text-xs text-amber-300 font-bold animate-pulse">
          ⏳ Quân bạn đang hồi phục thể lực, sẵn sàng sau {cooldownSec}s nữa!
        </div>
      )}

      {/* Lưới Bản Đồ */}
      <div className="flex-1 flex items-center justify-center my-2">
        <TerritoryGrid
          mapSize={state.mapSize}
          cells={state.cells}
          interactive={cooldownSec === 0 && !currentQuestion}
          viewerTeam={myTeam}
          currentLockedCellId={myLockedCellId}
          onSelectCell={handleSelectCell}
        />
      </div>

      {/* Footer gợi ý chiến thuật */}
      <div className="text-center text-[11px] text-slate-400 pb-1">
        💡 <span className="text-amber-300 font-bold">Chạm ô nhấp nháy vàng</span> liền kề để công
        thành hoặc gia cố!
      </div>

      {/* MODAL CÂU HỎI KHI ĐANG CÔNG THÀNH */}
      {currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-400 text-black">
                ⚔️ CÔNG THÀNH TRẮC NGHIỆM
              </span>
              <button
                type="button"
                onClick={handleCancelCell}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-slate-700 cursor-pointer"
              >
                ✕ Hủy ô
              </button>
            </div>

            {/* Câu hỏi */}
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
              <h3
                className="text-base font-bold text-white leading-snug break-words rich-content"
                dangerouslySetInnerHTML={{ __html: renderLatexInText(currentQuestion.stem) }}
              />
              {currentQuestion.image && (
                <div className="mt-3 flex justify-center">
                  <img
                    src={currentQuestion.image}
                    alt="Hình ảnh câu hỏi"
                    className="max-h-40 object-contain rounded-xl border border-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Các nút phương án A B C D chuẩn Kahoot */}
            {currentQuestion.type === 'mcq4' && currentQuestion.options && (
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const colors = [
                    'bg-red-600 hover:bg-red-500 border-red-400',
                    'bg-blue-600 hover:bg-blue-500 border-blue-400',
                    'bg-amber-600 hover:bg-amber-500 border-amber-400',
                    'bg-emerald-600 hover:bg-emerald-500 border-emerald-400',
                  ];
                  const shapes = ['▲', '◆', '●', '■'];
                  const colorClass = colors[idx % 4]!;
                  const shape = shapes[idx % 4]!;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSubmitAnswer(opt)}
                      className={`w-full min-h-[52px] p-3 text-left rounded-2xl font-bold text-sm text-white border-2 shadow-lg cursor-pointer transition active:scale-98 flex items-center gap-3 ${colorClass}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-black/25 flex items-center justify-center text-base font-black shrink-0">
                        {shape}
                      </span>
                      <span
                        className="flex-1 leading-tight break-words"
                        dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Câu hỏi Đúng / Sai */}
            {currentQuestion.type === 'tf' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer(true)}
                  className="min-h-[56px] bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-black text-base rounded-2xl shadow-lg cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>✓</span> ĐÚNG
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer(false)}
                  className="min-h-[56px] bg-rose-600 hover:bg-rose-500 border-2 border-rose-400 text-white font-black text-base rounded-2xl shadow-lg cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>✕</span> SAI
                </button>
              </div>
            )}

            {/* Câu hỏi ngắn */}
            {currentQuestion.type === 'short' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={e => setShortAnswerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && shortAnswerInput.trim()) {
                      e.preventDefault();
                      handleSubmitAnswer(shortAnswerInput);
                    }
                  }}
                  placeholder="Nhập câu trả lời..."
                  className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-white text-sm focus:border-amber-400 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer(shortAnswerInput)}
                  disabled={!shortAnswerInput.trim()}
                  className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow cursor-pointer transition active:scale-95"
                >
                  XÁC NHẬN TẤN CÔNG
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
