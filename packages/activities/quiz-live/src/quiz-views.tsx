import React, { useState, useEffect } from 'react';
import { renderLatexInText } from '@educlass/question-kit';
import {
  hasActiveReflectShield,
  hasActiveShield,
  isPlayerFrozen,
  isPlayerSmoked,
} from '@educlass/core';
import type { QuizLiveState } from './quiz-schemas.js';

export interface StudentViewProps {
  runId: string;
  state: QuizLiveState;
  participantId: string;
  onSendIntent: (intent: unknown) => void;
  disabled?: boolean;
}

export interface TeacherPanelProps {
  runId: string;
  state: QuizLiveState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
}

export interface ProjectorViewProps {
  runId: string;
  state: QuizLiveState;
}

// 4 Màu Kahoot chuẩn và ký hiệu hình khối theo PLAN 7.1
const KAHOOT_THEMES = [
  {
    bg: 'bg-[#FF6B6B]',
    hover: 'hover:bg-[#E55A5A]',
    text: 'text-white',
    shape: '▲',
    label: 'Tam giác (Đỏ)',
  },
  {
    bg: 'bg-[#4F8CFF]',
    hover: 'hover:bg-[#3B75E6]',
    text: 'text-white',
    shape: '◆',
    label: 'Hình thoi (Xanh)',
  },
  {
    bg: 'bg-[#FFB020]',
    hover: 'hover:bg-[#E69E1C]',
    text: 'text-white',
    shape: '●',
    label: 'Hình tròn (Vàng)',
  },
  {
    bg: 'bg-[#2ECC8F]',
    hover: 'hover:bg-[#25B57A]',
    text: 'text-white',
    shape: '■',
    label: 'Hình vuông (Xanh lá)',
  },
];

/**
 * Tự động tính toán kích cỡ chữ cho câu hỏi dựa vào độ dài chuỗi ký tự (Auto Font Sizing - Yêu cầu 2)
 */
export function getQuestionStemClass(stem: string, hasImage = false): string {
  const cleanLen = (stem || '').replace(/<[^>]*>/g, '').length;
  if (hasImage) {
    if (cleanLen < 50) return 'text-xl md:text-2xl lg:text-3xl font-black';
    if (cleanLen < 120) return 'text-lg md:text-xl lg:text-2xl font-bold';
    return 'text-base md:text-lg font-bold';
  }
  if (cleanLen < 45) return 'text-3xl md:text-4xl lg:text-5xl font-black';
  if (cleanLen < 90) return 'text-2xl md:text-3xl lg:text-4xl font-black';
  if (cleanLen < 160) return 'text-xl md:text-2xl lg:text-3xl font-extrabold';
  if (cleanLen < 250) return 'text-lg md:text-xl lg:text-2xl font-bold';
  return 'text-base md:text-lg lg:text-xl font-bold';
}

/**
 * Tự động tính toán kích cỡ chữ cho các phương án đáp án dựa vào độ dài ký tự (Auto Font Sizing - Yêu cầu 2)
 */
export function getOptionTextClass(text: string): string {
  const cleanLen = (text || '').replace(/<[^>]*>/g, '').length;
  if (cleanLen < 25) return 'text-xl md:text-2xl lg:text-3xl font-black';
  if (cleanLen < 60) return 'text-lg md:text-xl lg:text-2xl font-bold';
  if (cleanLen < 110) return 'text-base md:text-lg lg:text-xl font-bold';
  return 'text-sm md:text-base lg:text-lg font-semibold';
}

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-purple-500 to-indigo-600',
  'from-yellow-400 to-amber-500',
  'from-cyan-400 to-blue-500',
];
const AVATAR_ICONS = ['🦁', '🦊', '🐼', '🐨', '🐯', '🦄', '🐲', '🐙', '🐸', '🦉', '🚀', '⭐'];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[hash] || 'from-indigo-500 to-purple-600';
}

export function getAvatarIcon(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_ICONS.length;
  return AVATAR_ICONS[hash] || '🐱';
}

/**
 * Thanh thông báo chiến sự cá nhân hiển thị cố định ở hàng dưới cùng
 * Dành cho cả người tấn công và người bị tấn công (Khiên 45s, Phản đòn, v.v.)
 */
export const PersonalNotificationBar: React.FC<{
  notification?: QuizLiveState['participants'][string]['personalNotification'];
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  return (
    <div
      className={`w-full py-2 px-3 rounded-2xl flex items-center justify-between gap-2 shadow-lg transition-all shrink-0 ${
        notification.type === 'reflected'
          ? 'bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-purple-100 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
          : notification.type === 'attack'
            ? 'bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-rose-100 border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
            : notification.type === 'defense'
              ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-emerald-100 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-blue-100 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xl shrink-0">
          {notification.type === 'reflected'
            ? '🪞'
            : notification.type === 'attack'
              ? '⚔️'
              : notification.type === 'defense'
                ? '🛡️'
                : '🎁'}
        </span>
        <p className="text-xs sm:text-sm font-black truncate leading-tight">
          {notification.message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center font-bold text-xs cursor-pointer"
        aria-label="Đóng thông báo"
      >
        ✕
      </button>
    </div>
  );
};

function parseOptionIdx(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 };
    if (s in map) return map[s]!;
    const n = Number(s);
    if (!isNaN(n)) return n;
  }
  return -1;
}

/**
 * QuizLiveStudentView - Màn hình dành cho học sinh (Mobile-first, viewport 360x640)
 */
export const QuizLiveStudentView: React.FC<StudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
  disabled = false,
}) => {
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [tfGroupSelected, setTfGroupSelected] = useState<Record<number, boolean>>({});
  const [dismissedFeedbackIndex, setDismissedFeedbackIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const myProgress = state.participants[participantId];
  const qIndex =
    state.mode === 'kahoot' ? state.currentQuestionIndex : myProgress ? myProgress.currentIndex : 0;

  const currentQ = state.questions[qIndex];
  const alreadyAnswered = myProgress ? Boolean(myProgress.answers[String(qIndex)]) : false;
  const lastAnswer = myProgress?.lastAnswer;

  const activeEffects = myProgress?.activeEffects ?? [];

  // Vòng lặp đếm ngược thời gian thực cho các hiệu ứng chiến đấu (Đóng băng, Bom khói, Khiên...)
  useEffect(() => {
    const hasExpiring = activeEffects.some(
      e => e.expiresAt !== undefined && e.expiresAt > Date.now()
    );
    if (!hasExpiring) return;

    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const stillHasExpiring = activeEffects.some(
        e => e.expiresAt !== undefined && e.expiresAt > current
      );
      if (!stillHasExpiring) {
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [activeEffects]);

  const freezeCheck = isPlayerFrozen(activeEffects, now);
  const smokeCheck = isPlayerSmoked(activeEffects, now);
  const hasReflect = hasActiveReflectShield(activeEffects, now);
  const hasShield = hasActiveShield(activeEffects, now) && !hasReflect;
  const isDouble = activeEffects.some(e => e.powerUpType === 'double_points');

  // Màn hình xem đáp án đúng sau mỗi câu (Chế độ Quizizz khi bật tùy chọn showCorrectAnswer)
  const shouldShowImmediateFeedback =
    state.mode === 'quizizz' &&
    Boolean(state.showCorrectAnswer) &&
    lastAnswer !== null &&
    lastAnswer !== undefined &&
    lastAnswer.questionIndex !== dismissedFeedbackIndex;

  if (shouldShowImmediateFeedback && lastAnswer) {
    const feedbackQ = state.questions[lastAnswer.questionIndex];
    const isCorrect = lastAnswer.isCorrect;
    const isLastQuestion = lastAnswer.questionIndex + 1 >= state.totalQuestions;
    const correctOptIdx = parseOptionIdx(lastAnswer.correctAnswer);
    const selectedOptIdx = parseOptionIdx(lastAnswer.selectedAnswer);

    return (
      <div className="p-3 sm:p-6 space-y-4 w-full max-w-4xl mx-auto flex flex-col justify-between min-h-[85vh]">
        {/* Header thông tin */}
        <div className="border-b pb-3 flex justify-between items-center text-base sm:text-lg font-bold text-gray-700 shrink-0">
          <span>
            Kết quả Câu {lastAnswer.questionIndex + 1}/{state.totalQuestions}
          </span>
          <span className="text-amber-600 font-extrabold">
            🔥 {lastAnswer.newStreak} | ⭐️ {myProgress?.score ?? 0} đ
          </span>
        </div>

        {/* Banner Đúng / Sai */}
        <div
          className={`p-4 sm:p-6 rounded-3xl text-center border-2 shadow-sm shrink-0 ${
            isCorrect
              ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
              : 'bg-rose-50 border-rose-400 text-rose-900'
          }`}
        >
          <div className="text-5xl sm:text-6xl mb-2">{isCorrect ? '🎉' : '❌'}</div>
          <h3 className="text-xl sm:text-3xl font-black">
            {isCorrect ? 'Chính xác tuyệt vời!' : 'Tiếc quá, chưa chính xác!'}
          </h3>
          <p className="text-base sm:text-lg font-bold mt-1">
            {isCorrect ? `+${lastAnswer.pointsEarned} Điểm` : '0 Điểm cho câu này'}
          </p>
          {isCorrect && lastAnswer.newStreak >= 2 && (
            <p className="text-sm sm:text-base font-extrabold text-amber-700 mt-1">
              🔥 Chuỗi đúng liên tiếp: {lastAnswer.newStreak} câu!
            </p>
          )}
        </div>

        {/* Khung nội dung câu hỏi và phân tích đáp án */}
        {feedbackQ && (
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[50vh] pr-1">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs text-center">
              <span className="text-xs sm:text-sm font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Nội dung câu hỏi
              </span>
              <div
                className="text-base sm:text-xl font-extrabold text-gray-800"
                dangerouslySetInnerHTML={{ __html: renderLatexInText(feedbackQ.stem) }}
              />
              {feedbackQ.image && (
                <div className="mt-3 max-h-36 sm:max-h-48 flex justify-center">
                  <img
                    src={feedbackQ.image}
                    alt="Ảnh câu hỏi"
                    className="max-h-36 sm:max-h-48 object-contain rounded-xl border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Chi tiết đáp án mcq4 */}
            {feedbackQ.type === 'mcq4' && feedbackQ.options && (
              <div className="space-y-2">
                <span className="text-xs sm:text-sm font-extrabold text-gray-500 uppercase tracking-wider block">
                  Đối chiếu đáp án:
                </span>
                {feedbackQ.options.map((opt, idx) => {
                  const isThisCorrect = idx === correctOptIdx;
                  const isThisSelected = idx === selectedOptIdx;
                  let cardStyle = 'border-gray-200 bg-gray-50/70 text-gray-600 opacity-60';
                  let badge = null;

                  if (isThisCorrect) {
                    cardStyle =
                      'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-sm';
                    badge = (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shrink-0">
                        ✔ ĐÁP ÁN ĐÚNG
                      </span>
                    );
                  } else if (isThisSelected) {
                    cardStyle =
                      'border-2 border-rose-400 bg-rose-50 text-rose-950 font-bold shadow-sm';
                    badge = (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shrink-0">
                        ✖ BẠN ĐÃ CHỌN
                      </span>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm sm:text-base ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm font-black shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span
                          className="truncate font-bold"
                          dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                        />
                      </div>
                      {badge}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chi tiết đáp án tf */}
            {feedbackQ.type === 'tf' && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Bạn đã chọn:</span>
                  <span
                    className={`font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {lastAnswer.selectedAnswer === true ||
                    String(lastAnswer.selectedAnswer).toLowerCase() === 'true'
                      ? 'Đúng'
                      : 'Sai'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Đáp án chính xác:</span>
                  <span className="font-black text-emerald-700">
                    {lastAnswer.correctAnswer === true ||
                    String(lastAnswer.correctAnswer).toLowerCase() === 'true'
                      ? 'Đúng'
                      : 'Sai'}
                  </span>
                </div>
              </div>
            )}

            {/* Chi tiết đáp án short */}
            {feedbackQ.type === 'short' && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-xs sm:text-sm space-y-1.5">
                <div>
                  <span className="text-gray-500 block text-[11px]">Câu trả lời của bạn:</span>
                  <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {String(lastAnswer.selectedAnswer ?? '') || '(Trống)'}
                  </span>
                </div>
                <div className="pt-1 border-t border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Đáp án chính xác:</span>
                  <span className="font-black text-emerald-700">
                    {Array.isArray(lastAnswer.correctAnswer)
                      ? lastAnswer.correctAnswer.join(' hoặc ')
                      : String(lastAnswer.correctAnswer ?? '')}
                  </span>
                </div>
              </div>
            )}

            {/* Chi tiết đáp án tf_group */}
            {feedbackQ.type === 'tf_group' && feedbackQ.items && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 text-xs sm:text-sm space-y-2">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">
                  Đối chiếu kết quả từng ý:
                </span>
                <div className="space-y-1.5">
                  {feedbackQ.items.map((it, idx) => {
                    const itText =
                      typeof it.text === 'object' && it.text ? it.text.text : String(it.text || '');
                    const letter = ['a', 'b', 'c', 'd'][idx] || `${idx + 1}`;
                    const cList = Array.isArray(lastAnswer.correctAnswer)
                      ? lastAnswer.correctAnswer
                      : [];
                    const expected = Boolean(cList[idx]);
                    const sList = Array.isArray(lastAnswer.selectedAnswer)
                      ? lastAnswer.selectedAnswer
                      : [];
                    const sVal = sList[idx];
                    const isItemCorrect = sVal === expected;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border flex flex-col gap-1 ${
                          isItemCorrect
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-gray-800 leading-snug">
                            <strong className="text-blue-600">{letter})</strong>{' '}
                            {renderLatexInText(itText)}
                          </span>
                          <span
                            className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                              isItemCorrect
                                ? 'bg-emerald-200 text-emerald-800'
                                : 'bg-rose-200 text-rose-800'
                            }`}
                          >
                            {isItemCorrect ? '✓ Khớp' : '✗ Sai'}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px] font-semibold text-gray-600">
                          <span>
                            Đáp án:{' '}
                            <strong className={expected ? 'text-emerald-700' : 'text-rose-700'}>
                              {expected ? 'ĐÚNG' : 'SAI'}
                            </strong>
                          </span>
                          <span>
                            Bạn chọn:{' '}
                            <strong
                              className={
                                sVal === true
                                  ? 'text-emerald-700'
                                  : sVal === false
                                    ? 'text-rose-700'
                                    : 'text-gray-400'
                              }
                            >
                              {sVal === true ? 'ĐÚNG' : sVal === false ? 'SAI' : 'Trống'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Giải thích nếu có */}
            {lastAnswer.explanation && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-0.5">
                <span className="font-black flex items-center gap-1 text-[11px] text-amber-800 uppercase">
                  <span>💡</span> Lời giải thích:
                </span>
                <p className="leading-relaxed">{lastAnswer.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Nút Tiếp tục */}
        <div className="pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setDismissedFeedbackIndex(lastAnswer.questionIndex)}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isLastQuestion ? 'Xem kết quả bài Quiz 🏆' : 'Câu tiếp theo'}</span>
            <span>➔</span>
          </button>
        </div>

        <PersonalNotificationBar
          notification={myProgress?.personalNotification}
          onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
        />
      </div>
    );
  }

  // Màn hình kết thúc bài Quiz
  if (state.status === 'finished' || (state.mode === 'quizizz' && myProgress?.isCompleted)) {
    const myRankEntry = state.leaderboard.find(l => l.participantId === participantId);
    return (
      <div className="p-4 flex flex-col justify-between min-h-[520px] max-w-sm mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-6xl animate-bounce">🏆</div>
          <h2 className="text-2xl font-black text-gray-800">Hoàn thành bài Quiz!</h2>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 w-full max-w-xs space-y-2">
            <p className="text-sm text-amber-800 font-semibold">Xếp hạng của bạn</p>
            <p className="text-4xl font-extrabold text-amber-600">
              #{myRankEntry ? myRankEntry.rank : '-'}
            </p>
            <div className="flex justify-around pt-2 border-t border-amber-200 text-sm">
              <div>
                <span className="block text-gray-500">Điểm số</span>
                <strong className="text-base text-gray-800">{myProgress?.score ?? 0}</strong>
              </div>
              <div>
                <span className="block text-gray-500">Đúng</span>
                <strong className="text-base text-gray-800">
                  {myProgress?.correctCount ?? 0}/{state.totalQuestions}
                </strong>
              </div>
              <div>
                <span className="block text-gray-500">Chuỗi 🔥</span>
                <strong className="text-base text-gray-800">{myProgress?.maxStreak ?? 0}</strong>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Chúc mừng bạn đã hoàn thành xuất sắc!</p>
          {state.mode === 'quizizz' &&
            Boolean(state.allowReplay) &&
            state.status !== 'finished' && (
              <button
                type="button"
                onClick={() => {
                  setDismissedFeedbackIndex(null);
                  onSendIntent({ type: 'restart_quiz' });
                }}
                className="w-full mt-2 min-h-[48px] px-4 py-3 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔄 Chơi lại lần nữa</span>
              </button>
            )}
        </div>
        <PersonalNotificationBar
          notification={myProgress?.personalNotification}
          onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
        />
      </div>
    );
  }

  // Màn hình xem lại kết quả câu vừa làm (Chế độ Kahoot sau khi khóa nhận bài)
  if (state.status === 'question_review') {
    const isCorrect = lastAnswer?.isCorrect ?? false;
    const points = lastAnswer?.pointsEarned ?? 0;
    const streak = lastAnswer?.newStreak ?? 0;

    return (
      <div className="p-4 flex flex-col justify-between min-h-[520px] max-w-sm mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-6xl">{isCorrect ? '🎉' : '❌'}</div>
          <h2 className={`text-2xl font-black ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isCorrect ? 'Chính xác tuyệt vời!' : 'Tiếc quá, chưa đúng!'}
          </h2>
          {isCorrect ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 w-full max-w-xs space-y-2">
              <p className="text-xl font-bold text-emerald-700">+{points} Điểm</p>
              {streak >= 2 && (
                <p className="text-sm font-semibold text-amber-600">
                  🔥 Chuỗi đúng liên tiếp: {streak} câu!
                </p>
              )}
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 w-full max-w-xs">
              <p className="text-sm text-rose-700">Hãy cố gắng ở câu tiếp theo nhé!</p>
            </div>
          )}
          <p className="text-sm text-gray-500 animate-pulse">
            Chờ thầy cô chuyển sang câu tiếp theo...
          </p>
        </div>
        <PersonalNotificationBar
          notification={myProgress?.personalNotification}
          onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
        />
      </div>
    );
  }

  // Màn hình bảng xếp hạng giữa hiệp (Kahoot Leaderboard)
  if (state.status === 'leaderboard') {
    const myRankEntry = state.leaderboard.find(l => l.participantId === participantId);
    return (
      <div className="p-4 flex flex-col justify-between min-h-[520px] max-w-sm mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h2 className="text-xl font-black text-gray-800">Bảng Xếp Hạng Tạm Thời</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full max-w-xs">
            <p className="text-sm text-blue-700">Vị trí của bạn</p>
            <p className="text-3xl font-extrabold text-blue-600">
              Hạng #{myRankEntry ? myRankEntry.rank : '-'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Tổng điểm: <strong>{myProgress?.score ?? 0}</strong>
            </p>
          </div>
          <p className="text-sm text-gray-500 animate-pulse">Sắp bắt đầu câu tiếp theo...</p>
        </div>
        <PersonalNotificationBar
          notification={myProgress?.personalNotification}
          onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
        />
      </div>
    );
  }

  // Khi học sinh đã trả lời câu hỏi hiện tại nhưng server vẫn chưa khóa câu
  if (alreadyAnswered) {
    return (
      <div className="p-4 flex flex-col justify-between min-h-[520px] max-w-sm mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-5xl animate-bounce">⏳</div>
          <h2 className="text-xl font-bold text-gray-800">Đã gửi câu trả lời!</h2>
          <p className="text-sm text-gray-600">
            Hãy chờ hết giờ hoặc thầy cô chuyển tiếp để xem kết quả.
          </p>
          <div className="bg-gray-100 rounded-xl p-3 text-xs text-gray-500 w-full max-w-xs">
            Điểm hiện tại của bạn: <strong>{myProgress?.score ?? 0}</strong>
          </div>
        </div>
        <PersonalNotificationBar
          notification={myProgress?.personalNotification}
          onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
        />
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Đang tải câu hỏi...</p>
      </div>
    );
  }

  // Gửi câu trả lời
  const handleSelectOption = (choice: unknown) => {
    if (disabled || alreadyAnswered || freezeCheck.frozen) return;
    onSendIntent({
      type: 'submit_answer',
      questionIndex: qIndex,
      answer: choice,
    });
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 w-full max-w-4xl mx-auto flex flex-col justify-between min-h-[85vh]">
      {/* Header: Chỉ số câu, điểm số và các trạng thái vật phẩm */}
      <div className="border-b pb-3 space-y-2 shrink-0">
        <div className="flex justify-between items-center text-base sm:text-lg font-bold text-gray-700">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-1 rounded-full">
            Câu {qIndex + 1}/{state.totalQuestions}
          </span>
          <span className="text-amber-600 font-extrabold bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full">
            🔥 {myProgress?.currentStreak ?? 0} | ⭐️ {myProgress?.score ?? 0} đ
          </span>
        </div>

        {/* Các hiệu ứng bảo vệ & bổ trợ đang kích hoạt */}
        {(hasReflect || hasShield || isDouble) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasReflect && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-100 border border-purple-400 text-purple-800 text-[11px] font-black flex items-center gap-1 shadow-sm animate-pulse">
                <span>🪞</span> Khiên Phản Đòn (45s)
              </span>
            )}
            {hasShield && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-800 text-[11px] font-black flex items-center gap-1 shadow-sm">
                <span>🛡️</span> Khiên Hộ Thể (45s)
              </span>
            )}
            {isDouble && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-400 text-amber-800 text-[11px] font-black flex items-center gap-1 shadow-sm">
                <span>⚡</span> x2 Điểm
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nội dung câu hỏi (Kèm hiệu ứng khói che mờ nếu trúng Bom Khói) */}
      <div className="relative bg-white rounded-3xl p-5 sm:p-8 border-2 border-gray-200 shadow-md text-center overflow-hidden shrink-0 min-h-[120px] flex flex-col items-center justify-center">
        {smokeCheck.smoked && (
          <div className="absolute inset-0 z-20 pointer-events-none bg-slate-900/60 backdrop-blur-md flex items-center justify-center text-center p-2">
            <span className="text-xs font-black text-white bg-black/70 px-3 py-1.5 rounded-xl border border-white/20">
              🌫️ BOM KHÓI ĐANG CHE MẮT ({Math.max(1, Math.ceil(smokeCheck.remainingMs / 1000))}s)!
            </span>
          </div>
        )}
        <h3
          className={`text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 leading-snug ${smokeCheck.smoked ? 'blur-sm select-none' : ''}`}
          dangerouslySetInnerHTML={{ __html: renderLatexInText(currentQ.stem) }}
        />
        {currentQ.image && (
          <div className="mt-4 max-h-[26vh] flex justify-center">
            <img
              src={currentQ.image}
              alt="Hình ảnh câu hỏi"
              className="max-h-[26vh] object-contain rounded-2xl border-2 border-gray-200 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Khu vực chọn đáp án theo loại câu hỏi */}
      <div className="relative flex-1 flex flex-col justify-end min-h-[240px]">
        {/* Lớp phủ Đóng Băng nếu người chơi đang bị dính Freeze */}
        {freezeCheck.frozen && (
          <div className="absolute inset-0 z-30 bg-cyan-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center border-2 border-cyan-400 shadow-2xl animate-pulse">
            <span className="text-5xl mb-2">❄️</span>
            <h4 className="text-lg font-black text-cyan-200">BẠN ĐANG BỊ ĐÓNG BĂNG!</h4>
            <p className="text-xs text-cyan-300 font-bold mt-1">
              Tạm dừng thao tác còn: {Math.max(1, Math.ceil(freezeCheck.remainingMs / 1000))}s
            </p>
          </div>
        )}

        {currentQ.type === 'mcq4' && currentQ.options && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {currentQ.options.map((opt, idx) => {
              const theme = KAHOOT_THEMES[idx % KAHOOT_THEMES.length]!;
              const isEliminated = (myProgress?.hiddenOptions ?? []).includes(idx);
              const isQuizizz = state.mode === 'quizizz';
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={disabled || alreadyAnswered || freezeCheck.frozen || isEliminated}
                  className={`min-h-[86px] sm:min-h-[110px] md:min-h-[130px] p-3 sm:p-5 rounded-2xl font-bold flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 shadow-md transition-all active:scale-95 text-left ${
                    isEliminated
                      ? 'opacity-20 grayscale pointer-events-none bg-gray-200 text-gray-400'
                      : `${theme.bg} ${theme.hover} ${theme.text}`
                  }`}
                  aria-label={
                    isQuizizz ? `Lựa chọn ${letter}: ${opt}` : `Lựa chọn ${theme.shape}: ${opt}`
                  }
                >
                  <span className="text-2xl sm:text-3xl md:text-4xl leading-none shrink-0 font-black">
                    {isEliminated ? '🚫' : isQuizizz ? letter : theme.shape}
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className={`text-base sm:text-lg md:text-xl font-bold line-clamp-3 ${isEliminated ? 'line-through' : ''}`}
                      dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                    />
                    {currentQ.optionImages?.[idx] && (
                      <img
                        src={currentQ.optionImages[idx]!}
                        alt={isQuizizz ? `Ảnh đáp án ${letter}` : `Ảnh đáp án ${theme.shape}`}
                        className="max-h-16 object-contain rounded-lg border border-white/40 shadow-xs mt-1 bg-white/20 p-1"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {currentQ.type === 'tf' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectOption(true)}
              disabled={disabled || alreadyAnswered || freezeCheck.frozen}
              className="min-h-[110px] sm:min-h-[140px] md:min-h-[170px] p-4 rounded-3xl font-black bg-[#2ECC8F] hover:bg-[#25B57A] text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-40"
            >
              <span className="text-4xl sm:text-5xl">✔</span>
              <span className="text-xl sm:text-2xl md:text-3xl">ĐÚNG</span>
            </button>
            <button
              onClick={() => handleSelectOption(false)}
              disabled={disabled || alreadyAnswered || freezeCheck.frozen}
              className="min-h-[110px] sm:min-h-[140px] md:min-h-[170px] p-4 rounded-3xl font-black bg-[#FF6B6B] hover:bg-[#E55A5A] text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-40"
            >
              <span className="text-4xl sm:text-5xl">✖</span>
              <span className="text-xl sm:text-2xl md:text-3xl">SAI</span>
            </button>
          </div>
        )}

        {currentQ.type === 'short' && (
          <div className="space-y-3">
            <input
              type="text"
              value={shortAnswerInput}
              onChange={e => setShortAnswerInput(e.target.value)}
              placeholder="Nhập câu trả lời của bạn..."
              className="w-full h-12 px-4 rounded-xl border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              disabled={disabled || alreadyAnswered || freezeCheck.frozen}
            />
            <button
              onClick={() => handleSelectOption(shortAnswerInput)}
              disabled={
                disabled || alreadyAnswered || freezeCheck.frozen || !shortAnswerInput.trim()
              }
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md disabled:opacity-50"
            >
              Nộp câu trả lời
            </button>
          </div>
        )}

        {currentQ.type === 'tf_group' && currentQ.items && (
          <div className="space-y-3">
            <span className="text-xs sm:text-sm font-extrabold text-gray-600 uppercase tracking-wider block">
              Chọn Đúng hoặc Sai cho từng ý:
            </span>
            <div className="space-y-2.5">
              {currentQ.items.map((it, idx) => {
                const itText =
                  typeof it.text === 'object' && it.text ? it.text.text : String(it.text || '');
                const letter = ['a', 'b', 'c', 'd'][idx] || `${idx + 1}`;
                const chosen = tfGroupSelected[idx];

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-gray-200 rounded-xl p-3 flex flex-col gap-2"
                  >
                    <div className="text-sm sm:text-base font-bold text-gray-800">
                      <strong className="text-blue-600 mr-1">{letter})</strong>{' '}
                      {renderLatexInText(itText)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTfGroupSelected(prev => ({ ...prev, [idx]: true }))}
                        disabled={disabled || alreadyAnswered || freezeCheck.frozen}
                        className={`h-10 rounded-lg font-black text-sm flex items-center justify-center gap-1 border-2 transition ${
                          chosen === true
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-800 ring-2 ring-emerald-300'
                            : 'bg-gray-50 border-gray-300 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        ✓ ĐÚNG
                      </button>
                      <button
                        type="button"
                        onClick={() => setTfGroupSelected(prev => ({ ...prev, [idx]: false }))}
                        disabled={disabled || alreadyAnswered || freezeCheck.frozen}
                        className={`h-10 rounded-lg font-black text-sm flex items-center justify-center gap-1 border-2 transition ${
                          chosen === false
                            ? 'bg-rose-100 border-rose-500 text-rose-800 ring-2 ring-rose-300'
                            : 'bg-gray-50 border-gray-300 text-rose-700 hover:bg-rose-50'
                        }`}
                      >
                        ✗ SAI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const answers = currentQ.items!.map((_, i) =>
                  typeof tfGroupSelected[i] === 'boolean' ? tfGroupSelected[i] : null
                );
                handleSelectOption(answers);
              }}
              disabled={disabled || alreadyAnswered || freezeCheck.frozen}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md disabled:opacity-50"
            >
              Gửi câu trả lời Đúng / Sai
            </button>
          </div>
        )}
      </div>

      {/* TÚI ĐỒ VẬT PHẨM (Chế độ Quizizz) */}
      {state.mode === 'quizizz' && state.enablePowerUps !== false && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 shadow-md flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span>🎒</span> Túi:
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: state.powerUpCapacity ?? 2 }).map((_, slotIdx) => {
                const item = myProgress?.inventory?.queue?.[slotIdx];
                const isNext = slotIdx === 0 && Boolean(item);
                return (
                  <div
                    key={slotIdx}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition ${
                      item
                        ? isNext
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_8px_rgba(251,191,36,0.5)] ring-2 ring-amber-400/50'
                          : 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-800/40 border-dashed border-slate-700 text-slate-500'
                    }`}
                    title={item ? `${item.name}: ${item.description}` : 'Ô trống'}
                  >
                    {item ? (
                      <span>{item.icon}</span>
                    ) : (
                      <span className="text-xs opacity-40">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSendIntent({ type: 'use_powerup' })}
            disabled={disabled || !myProgress?.inventory?.queue?.length || freezeCheck.frozen}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>⚡</span>
            <span>DÙNG</span>
          </button>
        </div>
      )}

      {/* THÔNG BÁO CHIẾN SỰ CÁ NHÂN Ở HÀNG DƯỚI CÙNG (BOTTOM ROW) */}
      <PersonalNotificationBar
        notification={myProgress?.personalNotification}
        onDismiss={() => onSendIntent({ type: 'dismiss_notification' })}
      />
    </div>
  );
};

/**
 * QuizLiveTeacherPanel - Màn hình điều khiển và giám sát dành cho giáo viên
 */
export const QuizLiveTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const [quizizzTab, setQuizizzTab] = useState<'leaderboard' | 'questions'>('leaderboard');
  const [showOnlyTop5, setShowOnlyTop5] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const currentQ = state.questions[state.currentQuestionIndex];
  const stats = state.questionStats;

  // Đếm tiến độ học sinh nộp bài cho chế độ Quizizz
  const participantList = Object.values(state.participants || {});
  const completedCount = participantList.filter(
    p => p.isCompleted || p.currentIndex >= state.totalQuestions
  ).length;
  const totalParticipants = participantList.length;

  // Thống kê Quizizz toàn bộ lớp (Yêu cầu 3)
  let totalClassCorrect = 0;
  let totalClassAnswered = 0;
  participantList.forEach(p => {
    totalClassCorrect += p.correctCount;
    totalClassAnswered += Object.keys(p.answers || {}).length;
  });
  const totalClassWrong = Math.max(0, totalClassAnswered - totalClassCorrect);
  const overallAccuracy =
    totalClassAnswered > 0 ? Math.round((totalClassCorrect / totalClassAnswered) * 100) : 0;

  const displayedLeaderboard = showOnlyTop5 ? state.leaderboard.slice(0, 5) : state.leaderboard;

  // Màn hình kết thúc hoàn chỉnh dành cho Giáo viên
  if (state.status === 'finished') {
    const top1 = state.leaderboard[0];
    const top2 = state.leaderboard[1];
    const top3 = state.leaderboard[2];

    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-md">
        <div className="text-center space-y-2 border-b pb-4">
          <span className="text-5xl block animate-bounce">🏆</span>
          <h2 className="text-2xl font-black text-gray-800">BÀI QUIZ ĐÃ KẾT THÚC THÀNH CÔNG!</h2>
          <p className="text-sm text-gray-500">
            {state.title} • Tổng cộng {state.totalQuestions} câu hỏi • {totalParticipants} học sinh
            tham gia
          </p>
        </div>

        {/* Vinh danh Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
            <span className="text-3xl mb-1">🥈</span>
            <span className="text-xs font-bold uppercase text-slate-500">Hạng Nhì</span>
            <strong className="text-lg text-gray-800 mt-1">{top2?.displayName ?? '—'}</strong>
            <span className="text-sm font-black text-blue-600">{top2?.score ?? 0} điểm</span>
          </div>

          <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col items-center scale-105 shadow-sm">
            <span className="text-4xl mb-1 animate-pulse">👑</span>
            <span className="text-xs font-black uppercase text-amber-700">Quán Quân (Top 1)</span>
            <strong className="text-xl text-gray-900 mt-1">{top1?.displayName ?? '—'}</strong>
            <span className="text-base font-black text-amber-600">{top1?.score ?? 0} điểm</span>
          </div>

          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col items-center">
            <span className="text-3xl mb-1">🥉</span>
            <span className="text-xs font-bold uppercase text-amber-800">Hạng Ba</span>
            <strong className="text-lg text-gray-800 mt-1">{top3?.displayName ?? '—'}</strong>
            <span className="text-sm font-black text-blue-600">{top3?.score ?? 0} điểm</span>
          </div>
        </div>

        {/* Các nút hành động chính: Thoát hoặc Quay lại chọn hoạt động khác */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onEndActivity}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <span>⏹️</span>
            <span>Thoát Bài Quiz & Về Bàn Làm Việc</span>
          </button>
          <button
            type="button"
            onClick={onEndActivity}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <span>🔄</span>
            <span>Quay Lại Chọn Hoạt Động Khác</span>
          </button>
        </div>

        {/* Bảng xếp hạng chi tiết */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-gray-700">Bảng kết quả toàn bộ học sinh:</h4>
          <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto border rounded-xl">
            {state.leaderboard.map(item => (
              <div
                key={item.participantId}
                className="p-3 flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs">
                    #{item.rank}
                  </span>
                  <span className="font-semibold text-gray-800">{item.displayName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">
                    ✔ {item.correctCount}/{state.totalQuestions}
                  </span>
                  <span className="text-blue-600 font-black text-sm">{item.score} đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Giao diện chế độ QUIZIZZ: Mô phỏng chuẩn như hình ảnh (Yêu cầu 3) - Bảng theo dõi Full Màn Hình
  if (state.mode === 'quizizz') {
    return (
      <div className="w-full h-full min-h-[500px] flex-1 flex flex-col min-h-0 select-none">
        <div className="w-full flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#0c091d] via-[#140f2d] to-[#0a0718] text-white p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 relative overflow-hidden">
          {/* Nền ánh trăng & sao vũ trụ mờ ảo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(129,140,248,0.18),transparent_60%)] pointer-events-none" />

          {/* 1. Header trên cùng: JOIN CODE & Nút chức năng */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">⚡</span>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-300 block">
                  EduClass Quizizz Live
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">{state.title}</h3>
              </div>
            </div>

            {/* JOIN CODE ở giữa nổi bật */}
            <div className="text-center mx-auto order-first sm:order-none w-full sm:w-auto">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block">
                JOIN CODE
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white tracking-widest font-mono drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]">
                {state.title.match(/\d{6}/)?.[0] || '740 794'}
              </span>
            </div>

            {/* Cụm nút công cụ: Âm thanh, Toàn màn hình, Thu bài & Kết thúc */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(prev => !prev)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-sm transition cursor-pointer"
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-sm transition cursor-pointer"
                title="Bật/Tắt Toàn màn hình (F11)"
              >
                ⛶
              </button>
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'finish_quiz' })}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>🏁</span>
                <span>Thu Bài & Tổng Kết</span>
              </button>
              <button
                type="button"
                onClick={onEndActivity}
                className="px-3 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                <span>⏹️</span>
              </button>
            </div>
          </div>

          {/* 2. THANH THỐNG KÊ ACCURACY TỔNG QUAN (Chuẩn xác như hình ảnh Quizizz) */}
          <div className="relative z-10 w-full max-w-5xl mx-auto py-1 sm:py-2 shrink-0">
            <div className="relative flex items-center justify-between">
              {/* Khối bên trái: Tổng số câu đúng cả lớp */}
              <div className="flex-1 flex items-center justify-start pr-3 sm:pr-4">
                <div className="w-full bg-[#1e293b]/80 border border-emerald-500/40 rounded-2xl p-1 flex items-center shadow-inner">
                  <div
                    className="h-10 bg-[#A7F3D0] text-[#065F46] font-black text-lg sm:text-2xl rounded-xl flex items-center px-4 shadow transition-all duration-700"
                    style={{ width: `${Math.max(25, overallAccuracy)}%`, minWidth: '80px' }}
                    title={`Tổng số câu đúng toàn lớp: ${totalClassCorrect}`}
                  >
                    <span>{totalClassCorrect}</span>
                  </div>
                </div>
              </div>

              {/* Vòng tròn Accuracy ở trung tâm (Hình mặt trăng huyền ảo) */}
              <div className="z-10 shrink-0 mx-2">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-indigo-900 via-slate-900 to-indigo-950 border-4 border-slate-700 flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(99,102,241,0.5)] relative">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.3),transparent_60%)]" />
                  <span className="text-xl sm:text-2xl font-black text-white relative z-10 leading-none">
                    {overallAccuracy}%
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-300 relative z-10 mt-1 uppercase tracking-tight">
                    Accuracy
                  </span>
                </div>
              </div>

              {/* Khối bên phải: Tổng số câu sai cả lớp */}
              <div className="flex-1 flex items-center justify-end pl-3 sm:pl-4">
                <div className="w-full bg-[#1e293b]/80 border border-rose-500/40 rounded-2xl p-1 flex items-center justify-end shadow-inner">
                  <div
                    className="h-10 bg-[#FF5252] text-white font-black text-lg sm:text-2xl rounded-xl flex items-center justify-end px-4 shadow transition-all duration-700"
                    style={{ width: `${Math.max(25, 100 - overallAccuracy)}%`, minWidth: '80px' }}
                    title={`Tổng số câu sai toàn lớp: ${totalClassWrong}`}
                  >
                    <span>{totalClassWrong}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BANNER CHIẾN SỰ VẬT PHẨM THỜI GIAN THỰC */}
          {state.combatFeed && state.combatFeed.length > 0 && (
            <div className="relative z-10 w-full max-w-5xl mx-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-2 overflow-hidden shadow-inner shrink-0">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span>⚡</span> Chiến sự:
              </span>
              <div className="flex-1 truncate text-xs font-bold text-slate-200">
                {state.combatFeed[0]?.message}
              </div>
            </div>
          )}

          {/* 3. TABS CHUYỂN ĐỔI: Leaderboard & Questions */}
          <div className="relative z-10 flex justify-center border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setQuizizzTab('leaderboard')}
                className={`pb-3 font-extrabold text-sm sm:text-base transition cursor-pointer relative ${
                  quizizzTab === 'leaderboard'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Leaderboard</span>
                {quizizzTab === 'leaderboard' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setQuizizzTab('questions')}
                className={`pb-3 font-extrabold text-sm sm:text-base transition cursor-pointer relative ${
                  quizizzTab === 'questions' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Questions</span>
                {quizizzTab === 'questions' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                )}
              </button>
            </div>
          </div>

          {/* 4. NỘI DUNG TAB LEADERBOARD (Bảng xếp hạng kèm thanh đúng/sai của từng học sinh) */}
          {quizizzTab === 'leaderboard' ? (
            <div className="relative z-10 flex-1 min-h-0 flex flex-col bg-[#120f26]/90 border border-slate-700/60 rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 shadow-2xl backdrop-blur-md space-y-3 overflow-hidden">
              {/* Header phụ */}
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-2 shrink-0">
                <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                  <span className="text-base">👥</span>
                  <span>
                    {totalParticipants} participants ({completedCount} hoàn thành)
                  </span>
                </span>

                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition font-medium">
                  <span>Show only top 5</span>
                  <input
                    type="checkbox"
                    checked={showOnlyTop5}
                    onChange={e => setShowOnlyTop5(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Tiêu đề các cột */}
              <div className="flex items-center gap-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                <span className="w-7 text-center shrink-0">Rank</span>
                <span className="w-10 shrink-0 text-center">Avatar</span>
                <span className="w-32 sm:w-48 truncate shrink-0">Name</span>
                <span className="flex-1 text-center">Tiến độ Đúng / Sai</span>
                <span className="w-24 text-right shrink-0">Points</span>
              </div>

              {/* Danh sách học sinh */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {displayedLeaderboard.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-slate-400 text-sm">
                    <span className="text-3xl mb-2 opacity-50">👥</span>
                    <span>Chưa có học sinh nào nộp câu trả lời.</span>
                  </div>
                ) : (
                  displayedLeaderboard.map(entry => {
                    const prog = state.participants[entry.participantId];
                    const answeredCount = Object.keys(prog?.answers || {}).length;
                    const correct = prog?.correctCount ?? 0;
                    const wrong = Math.max(0, answeredCount - correct);
                    const totalQ = Math.max(1, state.totalQuestions);

                    // Tỉ lệ % cho thanh bar đúng / sai
                    const correctPercent = Math.min(100, (correct / totalQ) * 100);
                    const wrongPercent = Math.min(100 - correctPercent, (wrong / totalQ) * 100);
                    const studentAcc =
                      answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : 0;

                    const avatarColor = getAvatarColor(entry.participantId);
                    const avatarIcon = getAvatarIcon(entry.participantId);

                    return (
                      <div
                        key={entry.participantId}
                        className="flex items-center gap-3 bg-[#181335]/80 hover:bg-[#201a45] border border-slate-700/50 rounded-2xl px-4 py-3 transition shadow-sm shrink-0"
                      >
                        {/* Cột 1: Thứ hạng */}
                        <span className="w-7 text-center font-black text-sm text-slate-200 shrink-0">
                          {entry.rank}
                        </span>

                        {/* Cột 2: Avatar ngộ nghĩnh */}
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-tr ${avatarColor} flex items-center justify-center text-lg shadow-md ring-2 ring-white/20 shrink-0`}
                        >
                          <span>{avatarIcon}</span>
                        </div>

                        {/* Cột 3: Tên học sinh & Status Badges */}
                        <div className="w-32 sm:w-48 truncate shrink-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-white text-sm truncate">
                              {entry.displayName}
                            </span>
                            {/* Badges vật phẩm đang kích hoạt */}
                            {entry.activeReflectShield && (
                              <span
                                title="Đang bật Khiên Phản Đòn (45s)"
                                className="text-sm shrink-0 animate-pulse"
                              >
                                🪞
                              </span>
                            )}
                            {entry.activeShield && (
                              <span
                                title="Đang bật Khiên Hộ Thể (45s)"
                                className="text-sm shrink-0"
                              >
                                🛡️
                              </span>
                            )}
                            {entry.isFrozen && (
                              <span
                                title="Đang bị Đóng Băng"
                                className="text-sm shrink-0 animate-bounce"
                              >
                                ❄️
                              </span>
                            )}
                            {entry.isDoublePoints && (
                              <span title="Đang bật x2 Điểm" className="text-sm shrink-0">
                                ⚡
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {correct}/{answeredCount} đúng ({studentAcc}%)
                          </span>
                        </div>

                        {/* Cột 4: Streak Badge & Thanh tiến độ đúng / sai 2 màu của từng học sinh */}
                        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-[120px]">
                          {/* Badge ngọn lửa streak */}
                          <div className="px-2 py-0.5 rounded-lg bg-orange-950/80 border border-orange-500/40 text-orange-400 font-black text-xs shrink-0 flex items-center gap-1 shadow-inner">
                            <span>🔥</span>
                            <span>{entry.currentStreak || 0}</span>
                          </div>

                          {/* THANH TIẾN ĐỘ ĐÚNG / SAI 2 MÀU CỦA HỌC SINH (Chuẩn thiết kế) */}
                          <div className="flex-1 h-3.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner border border-slate-700/50">
                            {/* Phần đúng (Xanh lá) */}
                            {correctPercent > 0 && (
                              <div
                                className="bg-[#2ECC8F] h-full transition-all duration-500"
                                style={{ width: `${correctPercent}%` }}
                                title={`Đúng: ${correct} câu`}
                              />
                            )}
                            {/* Phần sai (Đỏ hồng) */}
                            {wrongPercent > 0 && (
                              <div
                                className="bg-[#FF5252] h-full transition-all duration-500"
                                style={{ width: `${wrongPercent}%` }}
                                title={`Sai: ${wrong} câu`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Cột 5: Điểm số */}
                        <div className="w-24 text-right shrink-0">
                          <span className="font-black text-white text-base">{entry.score}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* 5. NỘI DUNG TAB QUESTIONS (Phân tích theo từng câu hỏi) */
            <div className="relative z-10 flex-1 min-h-0 flex flex-col bg-[#120f26]/90 border border-slate-700/60 rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 shadow-2xl backdrop-blur-md space-y-3 overflow-hidden">
              <h4 className="text-sm font-extrabold text-slate-300 shrink-0">
                Phân tích độ chính xác theo từng câu hỏi ({state.totalQuestions} câu):
              </h4>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                {state.questions.map((q, idx) => {
                  let qCorrectCount = 0;
                  let qTotalAnswers = 0;
                  participantList.forEach(p => {
                    const ans = p.answers[String(idx)];
                    if (ans) {
                      qTotalAnswers++;
                      if (ans.isCorrect) qCorrectCount++;
                    }
                  });
                  const qWrongCount = Math.max(0, qTotalAnswers - qCorrectCount);
                  const qAccuracy =
                    qTotalAnswers > 0 ? Math.round((qCorrectCount / qTotalAnswers) * 100) : 0;

                  return (
                    <div
                      key={q.id || idx}
                      className="bg-[#181335]/80 border border-slate-700/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shrink-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 font-bold text-xs">
                            Câu {idx + 1}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            Đã làm: {qTotalAnswers}/{totalParticipants} học sinh
                          </span>
                        </div>
                        <p
                          className="font-bold text-white text-sm line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: renderLatexInText(q.stem) }}
                        />
                      </div>

                      {/* Thanh tỉ lệ đúng sai của câu hỏi */}
                      <div className="w-full sm:w-64 flex flex-col gap-1.5 shrink-0">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-emerald-400">✔ {qCorrectCount} đúng</span>
                          <span className="text-white font-extrabold">{qAccuracy}%</span>
                          <span className="text-rose-400">✖ {qWrongCount} sai</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="bg-[#2ECC8F] h-full" style={{ width: `${qAccuracy}%` }} />
                          <div
                            className="bg-[#FF5252] h-full"
                            style={{ width: `${100 - qAccuracy}%` }}
                          />
                        </div>
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

  // Giao diện chế độ KAHOOT (Được tối ưu chiều cao 2/5 câu hỏi + 3/5 đáp án và tự động thu nhỏ size chữ)
  return (
    <div className="p-3 md:p-5 space-y-4 max-w-6xl mx-auto w-full">
      {/* Tiêu đề & Cụm nút điều khiển nhịp bài thi Kahoot */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 md:p-4 rounded-2xl border border-gray-200 shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
              Kahoot (Nhịp GV)
            </span>
            <span className="text-xs text-gray-400">{totalParticipants} học sinh</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">{state.title}</h2>
        </div>

        {/* Cụm nút điều khiển nhịp bài thi */}
        <div className="flex items-center gap-2">
          {state.status === 'in_question' && (
            <>
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'show_review' })}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow transition-all cursor-pointer"
              >
                Khóa & Xem đáp án
              </button>
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'show_leaderboard' })}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Tiếp theo: Bảng Xếp Hạng</span>
                <span className="text-base">📊</span>
              </button>
            </>
          )}

          {state.status === 'question_review' && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'show_leaderboard' })}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Tiếp theo: Bảng Xếp Hạng</span>
              <span className="text-base">📊</span>
            </button>
          )}

          {state.status === 'leaderboard' && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'next_question' })}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>
                {state.currentQuestionIndex + 1 < state.totalQuestions
                  ? 'Tiếp theo: Câu hỏi tiếp theo'
                  : 'Tiếp theo: Xem Kết Quả Chung Cuộc'}
              </span>
              <span className="text-base">
                {state.currentQuestionIndex + 1 < state.totalQuestions ? '➡' : '🏁'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onEndActivity}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow transition-all cursor-pointer"
          >
            ⏹️ Kết thúc Quiz
          </button>
        </div>
      </div>

      {/* Ở CHẾ ĐỘ KAHOOT: TÁCH RIÊNG CÂU HỎI VÀ BẢNG XẾP HẠNG (Yêu cầu 2 & 6) */}
      {(state.status === 'in_question' || state.status === 'question_review') && currentQ ? (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[560px] gap-3 select-none">
          {/* Khung câu hỏi chiếm 2/5 màn hình (~38vh), chữ tự co giãn (Yêu cầu 2) */}
          <div className="h-[38vh] min-h-[160px] max-h-[40vh] bg-white p-4 md:p-6 rounded-3xl border-2 border-indigo-200 shadow-lg text-center flex flex-col justify-between items-center shrink-0">
            <div className="flex justify-between items-center w-full text-xs md:text-sm font-semibold text-gray-500 border-b border-gray-100 pb-1.5 shrink-0">
              <span className="font-bold text-indigo-700 uppercase tracking-wide bg-indigo-50 px-3.5 py-0.5 rounded-full text-xs">
                Câu hỏi {state.currentQuestionIndex + 1} / {state.totalQuestions}
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-3.5 py-0.5 rounded-full text-xs font-bold">
                Đã nộp: {stats?.totalResponses ?? 0} học sinh
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-2 my-auto w-full">
              <h3
                className={`${getQuestionStemClass(currentQ.stem, Boolean(currentQ.image))} text-gray-900 leading-snug tracking-tight text-center max-w-4xl`}
                dangerouslySetInnerHTML={{ __html: renderLatexInText(currentQ.stem) }}
              />
              {currentQ.image && (
                <div className="mt-2 max-h-[16vh] flex justify-center">
                  <img
                    src={currentQ.image}
                    alt="Hình ảnh câu hỏi"
                    className="max-h-[16vh] object-contain rounded-xl border border-gray-200 shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Khung 4 đáp án to lấp đầy chiều cao còn lại (~52vh), chữ tự co giãn (Yêu cầu 2) */}
          {currentQ.options && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[220px]">
              {currentQ.options.map((opt, idx) => {
                const count = stats?.optionCounts[String(idx)] ?? 0;
                const theme = KAHOOT_THEMES[idx % KAHOOT_THEMES.length]!;
                const isCorrect =
                  state.currentCorrectAnswer !== undefined &&
                  Number(state.currentCorrectAnswer) === idx;

                return (
                  <div
                    key={idx}
                    className={`p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-between shadow-lg transition-all h-full ${theme.bg} text-white ${
                      isCorrect
                        ? 'ring-4 ring-amber-300 scale-[1.01] shadow-2xl'
                        : 'hover:opacity-95'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1 overflow-hidden">
                      <span className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black/20 flex items-center justify-center font-black text-xl md:text-3xl shrink-0 shadow-inner">
                        {theme.shape}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`${getOptionTextClass(opt)} leading-snug drop-shadow-sm flex-1 break-words block`}
                          dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                        />
                        {currentQ.optionImages?.[idx] && (
                          <img
                            src={currentQ.optionImages[idx]!}
                            alt={`Ảnh đáp án ${theme.shape}`}
                            className="max-h-20 object-contain rounded-xl border border-white/40 shadow-xs mt-1.5"
                          />
                        )}
                      </div>
                    </div>
                    {(state.status === 'question_review' || isCorrect) && (
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {isCorrect && <span className="text-xl md:text-2xl">✅</span>}
                        <span className="text-sm md:text-lg font-black bg-black/35 px-3 py-1 rounded-xl">
                          {count} lượt
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Thanh nút bấm hành động ở chân màn hình */}
          <div className="flex justify-center pt-1 shrink-0">
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'show_leaderboard' })}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base md:text-lg rounded-2xl shadow-xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Tiếp theo: Xem Bảng Xếp Hạng</span>
              <span className="text-xl">📊</span>
            </button>
          </div>
        </div>
      ) : state.status === 'leaderboard' ? (
        /* Ở CHẾ ĐỘ KAHOOT: KHI Ở BẢNG XẾP HẠNG, CHỈ HIỂN THỊ BẢNG XẾP HẠNG */
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-md space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4">
            <div>
              <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <span>🏆</span> BẢNG XẾP HẠNG TẠM THỜI
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Xếp hạng sau câu hỏi {state.currentQuestionIndex + 1}/{state.totalQuestions} • Tổng
                số {state.leaderboard.length} học sinh
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'next_question' })}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span>
                {state.currentQuestionIndex + 1 < state.totalQuestions
                  ? 'Tiếp theo: Câu hỏi tiếp theo'
                  : 'Tiếp theo: Tổng Kết & Trao Giải'}
              </span>
              <span className="text-lg">
                {state.currentQuestionIndex + 1 < state.totalQuestions ? '➡' : '🏁'}
              </span>
            </button>
          </div>

          {/* Top 3 Dẫn Đầu Nổi Bật */}
          {state.leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 text-center py-2">
              {/* Hạng 2 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
                <span className="text-3xl mb-1">🥈</span>
                <span className="text-xs font-bold text-slate-500 uppercase">Hạng 2</span>
                <strong className="text-base text-gray-800 mt-0.5 truncate max-w-full">
                  {state.leaderboard[1]?.displayName ?? '—'}
                </strong>
                <span className="text-sm font-black text-blue-600">
                  {state.leaderboard[1]?.score ?? 0} đ
                </span>
              </div>
              {/* Hạng 1 */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col items-center scale-105 shadow-md">
                <span className="text-4xl mb-1 animate-bounce">👑</span>
                <span className="text-xs font-black text-amber-700 uppercase">Dẫn Đầu</span>
                <strong className="text-lg text-gray-900 mt-0.5 truncate max-w-full">
                  {state.leaderboard[0]?.displayName ?? '—'}
                </strong>
                <span className="text-base font-black text-amber-600">
                  {state.leaderboard[0]?.score ?? 0} đ
                </span>
              </div>
              {/* Hạng 3 */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col items-center">
                <span className="text-3xl mb-1">🥉</span>
                <span className="text-xs font-bold text-amber-800 uppercase">Hạng 3</span>
                <strong className="text-base text-gray-800 mt-0.5 truncate max-w-full">
                  {state.leaderboard[2]?.displayName ?? '—'}
                </strong>
                <span className="text-sm font-black text-blue-600">
                  {state.leaderboard[2]?.score ?? 0} đ
                </span>
              </div>
            </div>
          )}

          {/* Toàn bộ danh sách lớp */}
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto border rounded-2xl">
            {state.leaderboard.map(entry => (
              <div
                key={entry.participantId}
                className="p-3.5 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-white'
                        : entry.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : entry.rank === 3
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <span className="font-bold text-gray-800 text-base">{entry.displayName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <span className="text-amber-600">🔥 {entry.currentStreak}</span>
                  <span className="text-emerald-600 font-bold">
                    ✔ {entry.correctCount}/{state.currentQuestionIndex + 1}
                  </span>
                  <span className="text-blue-600 font-black text-base">{entry.score} đ</span>
                </div>
              </div>
            ))}
            {state.leaderboard.length === 0 && (
              <p className="text-sm text-gray-400 py-6 text-center">
                Chưa có học sinh nào nộp câu trả lời
              </p>
            )}
          </div>

          {/* Nút hành động dưới chân */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'next_question' })}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>
                {state.currentQuestionIndex + 1 < state.totalQuestions
                  ? 'Tiếp theo: Câu hỏi tiếp theo'
                  : 'Tiếp theo: Tổng Kết & Trao Giải'}
              </span>
              <span className="text-2xl">
                {state.currentQuestionIndex + 1 < state.totalQuestions ? '➡' : '🏁'}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * QuizLiveProjectorView - Màn chiếu máy chiếu dành cho lớp học (Tỷ lệ 16:9, Chữ lớn)
 */
export const QuizLiveProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const currentQ = state.questions[state.currentQuestionIndex];
  const stats = state.questionStats;

  // Podium màn vinh danh Top 3 cuối cùng
  if (state.status === 'finished') {
    const top1 = state.leaderboard[0];
    const top2 = state.leaderboard[1];
    const top3 = state.leaderboard[2];

    return (
      <div className="p-8 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white min-h-[500px] flex flex-col items-center justify-center text-center space-y-8">
        <h1 className="text-4xl font-black tracking-wide text-amber-300 animate-pulse">
          🏆 BẢNG VÀNG VINH DANH 🏆
        </h1>

        <div className="flex items-end justify-center gap-6 w-full max-w-2xl pt-8">
          {/* Top 2 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-2">🥈</div>
            <p className="font-bold text-base text-gray-200">{top2?.displayName ?? '—'}</p>
            <p className="text-sm text-amber-300 font-extrabold">{top2?.score ?? 0} pts</p>
            <div className="w-full h-32 bg-slate-400 rounded-t-2xl flex items-center justify-center text-3xl font-black text-slate-800 shadow-lg mt-2">
              2
            </div>
          </div>

          {/* Top 1 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-4xl mb-2 animate-bounce">👑</div>
            <p className="font-extrabold text-lg text-amber-300">{top1?.displayName ?? '—'}</p>
            <p className="text-base text-amber-400 font-black">{top1?.score ?? 0} pts</p>
            <div className="w-full h-44 bg-amber-400 rounded-t-2xl flex items-center justify-center text-4xl font-black text-amber-900 shadow-xl mt-2">
              1
            </div>
          </div>

          {/* Top 3 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-2">🥉</div>
            <p className="font-bold text-base text-amber-200">{top3?.displayName ?? '—'}</p>
            <p className="text-sm text-amber-300 font-extrabold">{top3?.score ?? 0} pts</p>
            <div className="w-full h-24 bg-amber-700 rounded-t-2xl flex items-center justify-center text-2xl font-black text-amber-200 shadow-lg mt-2">
              3
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Màn hình bảng xếp hạng tạm thời Top 5
  if (state.status === 'leaderboard') {
    return (
      <div className="p-8 bg-slate-900 text-white min-h-[500px] flex flex-col justify-center items-center space-y-6">
        <h2 className="text-3xl font-extrabold text-amber-400">🔥 TOP 5 DẪN ĐẦU 🔥</h2>
        <div className="w-full max-w-xl space-y-3">
          {state.leaderboard.slice(0, 5).map(entry => (
            <div
              key={entry.participantId}
              className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex justify-between items-center text-lg"
            >
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-black flex items-center justify-center text-base">
                  #{entry.rank}
                </span>
                <span className="font-bold text-gray-100">{entry.displayName}</span>
                <div className="flex items-center gap-1.5">
                  {entry.activeReflectShield && (
                    <span title="Khiên Phản Đòn (45s)" className="animate-pulse">
                      🪞
                    </span>
                  )}
                  {entry.activeShield && <span title="Khiên Hộ Thể (45s)">🛡️</span>}
                  {entry.isFrozen && (
                    <span title="Bị Đóng Băng" className="animate-bounce">
                      ❄️
                    </span>
                  )}
                  {entry.isDoublePoints && <span title="x2 Điểm">⚡</span>}
                </div>
              </div>
              <span className="font-extrabold text-amber-300 text-xl">{entry.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="h-screen max-h-screen flex flex-col justify-between p-4 md:p-6 bg-slate-900 text-white gap-3 select-none overflow-hidden">
      {/* Header máy chiếu */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 shrink-0">
        <span className="text-base md:text-lg font-bold text-slate-400">
          Câu {state.currentQuestionIndex + 1} / {state.totalQuestions}
        </span>
        {state.combatFeed && state.combatFeed.length > 0 && (
          <div className="flex-1 mx-4 max-w-xl truncate text-center text-xs sm:text-sm font-bold text-amber-300 bg-slate-800/80 px-3 py-1 rounded-xl border border-amber-500/30 animate-pulse">
            ⚡ {state.combatFeed[0]?.message}
          </div>
        )}
        <span className="text-lg md:text-xl font-extrabold text-blue-400">
          Đã trả lời: {stats?.totalResponses ?? 0}
        </span>
      </div>

      {/* Nội dung câu hỏi chiếm ~2/5 màn hình (38vh), chữ tự co giãn */}
      <div className="h-[38vh] min-h-[160px] max-h-[40vh] text-center p-4 md:p-6 bg-slate-800/90 rounded-3xl border border-slate-700 shadow-2xl flex flex-col justify-center items-center shrink-0 overflow-y-auto">
        <h2
          className={`${getQuestionStemClass(currentQ.stem, Boolean(currentQ.image))} font-black text-white leading-relaxed max-w-5xl`}
          dangerouslySetInnerHTML={{ __html: renderLatexInText(currentQ.stem) }}
        />
        {currentQ.image && (
          <div className="mt-3 max-h-[16vh] flex justify-center">
            <img
              src={currentQ.image}
              alt="Hình ảnh câu hỏi"
              className="max-h-[16vh] object-contain rounded-2xl border border-slate-600 shadow-md"
            />
          </div>
        )}
      </div>

      {/* 4 Khối màu phương án chiếm ~3/5 màn hình, chiều cao vừa khít, chữ tự co giãn */}
      {currentQ.options && (
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-[220px]">
          {currentQ.options.map((opt, idx) => {
            const theme = KAHOOT_THEMES[idx % KAHOOT_THEMES.length]!;
            const count = stats?.optionCounts[String(idx)] ?? 0;
            const isCorrect =
              state.status === 'question_review' && Number(state.currentCorrectAnswer) === idx;

            return (
              <div
                key={idx}
                className={`p-4 md:p-6 rounded-3xl font-bold flex items-center justify-between text-xl md:text-2xl shadow-xl transition-all h-full ${theme.bg} ${theme.text} ${
                  isCorrect ? 'ring-4 ring-amber-300 scale-[1.01]' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <span className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-black/20 flex items-center justify-center font-black text-2xl md:text-4xl shrink-0 shadow-inner">
                    {theme.shape}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`${getOptionTextClass(opt)} font-bold leading-normal flex-1 break-words block`}
                      dangerouslySetInnerHTML={{ __html: renderLatexInText(opt) }}
                    />
                    {currentQ.optionImages?.[idx] && (
                      <img
                        src={currentQ.optionImages[idx]!}
                        alt={`Ảnh đáp án ${theme.shape}`}
                        className="max-h-24 object-contain rounded-2xl border border-white/40 shadow-xs mt-2"
                      />
                    )}
                  </div>
                </div>
                {state.status === 'question_review' && (
                  <span className="text-xl md:text-2xl font-black bg-black/35 px-4 py-2 rounded-2xl ml-2 shrink-0">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
