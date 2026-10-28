import React, { useState } from 'react';
import type { CircuitState, CircuitParticipant } from '../circuit-schemas.js';
import { CircuitTrackView } from './CircuitTrackView.js';
import { CircuitCardInventory } from './CircuitCardInventory.js';

export interface StudentViewProps {
  runId: string;
  participantId: string;
  state: CircuitState;
  onSendIntent: (intent: unknown) => void;
}

export const CircuitStudentView: React.FC<StudentViewProps> = ({
  participantId,
  state,
  onSendIntent,
}) => {
  const me: CircuitParticipant = state.participants[participantId] ?? {
    participantId,
    displayName: 'Bạn',
    position: 0,
    previousPosition: 0,
    assignedQuestionOrder: [],
    streak: 0,
    correctCount: 0,
    inventory: [],
    isFrozen: false,
    hasShield: false,
    hasMirror: false,
    hasDoubleExp: false,
    mudTrapped: false,
    eliminatedOptions: [],
    answeredCurrent: false,
    selectedAnswer: null,
    lastAnswerCorrect: null,
    lastDiceRoll: null,
    lastMoveSteps: null,
    cardActionDone: false,
    receivedNotifications: [],
  };

  const currentQ = me.assignedQuestion || state.currentQuestion;
  const isActionWindow = state.phase === 'action_window';
  const isQuestionPhase = state.phase === 'question';

  // State cục bộ cho dạng câu hỏi
  const [selectedMcq, setSelectedMcq] = useState<number | null>(null);
  const [selectedTf, setSelectedTf] = useState<boolean | null>(null);
  const [tfGroupAnswers, setTfGroupAnswers] = useState<
    [boolean | null, boolean | null, boolean | null, boolean | null]
  >([null, null, null, null]);
  const [shortText, setShortText] = useState('');

  // Nộp câu trả lời MCQ
  const handleSelectMcq = (idx: number) => {
    if (me.answeredCurrent || !isQuestionPhase) return;
    setSelectedMcq(idx);
    onSendIntent({ type: 'submit_answer', answer: idx });
  };

  // Nộp câu trả lời TF
  const handleSelectTf = (val: boolean) => {
    if (me.answeredCurrent || !isQuestionPhase) return;
    setSelectedTf(val);
    onSendIntent({ type: 'submit_answer', answer: val });
  };

  // Nộp câu trả lời TF Group
  const handleTfGroupItem = (itemIdx: number, val: boolean) => {
    if (me.answeredCurrent || !isQuestionPhase) return;
    const next = [...tfGroupAnswers] as [
      boolean | null,
      boolean | null,
      boolean | null,
      boolean | null,
    ];
    next[itemIdx] = val;
    setTfGroupAnswers(next);

    // Nếu đã chọn đủ cả 4 ý, tự động nộp bài
    if (next.every(v => v !== null)) {
      onSendIntent({ type: 'submit_answer', answer: next });
    }
  };

  // Nộp câu trả lời ngắn
  const handleSubmitShort = (e: React.FormEvent) => {
    e.preventDefault();
    if (me.answeredCurrent || !shortText.trim() || !isQuestionPhase) return;
    onSendIntent({ type: 'submit_answer', answer: shortText.trim() });
  };

  // Dùng thẻ
  const handleUseCard = (cardId: string) => {
    onSendIntent({ type: 'use_card', cardId });
  };

  // Vứt thẻ
  const handleDiscardCard = (cardId: string) => {
    onSendIntent({ type: 'discard_card', cardId });
  };

  // Bỏ qua dùng thẻ
  const handleSkipCard = () => {
    onSendIntent({ type: 'skip_card' });
  };

  // Lấy thông báo mới nhất
  const latestNotification = me.receivedNotifications[0];

  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#FFF9F0',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'Nunito, system-ui, sans-serif',
      }}
    >
      {/* 1. Header Mini-HUD */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🏎️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
              {me.displayName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Vị trí: <strong>Ô {me.position}</strong>/{state.track.length - 1}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {me.streak >= 2 && (
            <span
              style={{
                background: '#FEF3C7',
                color: '#D97706',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              🔥 Chuỗi {me.streak}
            </span>
          )}
          {me.hasShield && (
            <span
              style={{
                background: '#DCFCE7',
                color: '#15803D',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              🛡️ Có Khiên
            </span>
          )}
          {me.mudTrapped && (
            <span
              style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              🕳️ Bị Sa Lầy
            </span>
          )}
        </div>
      </div>

      {/* 2. Banner Thông Báo Tác Động Tương Tác */}
      {latestNotification && (
        <div
          style={{
            background: latestNotification.isAlert ? '#FEE2E2' : '#E0F2FE',
            border: `1px solid ${latestNotification.isAlert ? '#F87171' : '#38BDF8'}`,
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: latestNotification.isAlert ? '#991B1B' : '#0369A1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <span>{latestNotification.isAlert ? '⚠️' : '🔔'}</span>
          <span>{latestNotification.message}</span>
        </div>
      )}

      {/* 3. Đường đua thu nhỏ (Mini Track) */}
      <CircuitTrackView
        track={state.track}
        participants={state.participants}
        bananaTraps={state.bananaTraps}
        currentUserId={participantId}
        isProjector={false}
      />

      {/* 4. Màn hình Vinh danh (Podium) */}
      {state.phase === 'podium' && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 16px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 12px 0' }}>
            Cuộc Đua Đã Kết Thúc!
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {state.podium.rank1 && (
              <div
                style={{
                  background: '#FEF3C7',
                  border: '2px solid #F59E0B',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 800,
                  color: '#92400E',
                }}
              >
                🥇 Hạng 1: {state.podium.rank1}
              </div>
            )}
            {state.podium.rank2 && (
              <div
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '8px',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                🥈 Hạng 2: {state.podium.rank2}
              </div>
            )}
            {state.podium.rank3 && (
              <div
                style={{
                  background: '#FFF7ED',
                  border: '1px solid #FDBA74',
                  borderRadius: '12px',
                  padding: '8px',
                  fontWeight: 700,
                  color: '#9A3412',
                }}
              >
                🥉 Hạng 3: {state.podium.rank3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Vùng Câu Hỏi & Xúc Xắc */}
      {state.phase !== 'podium' && currentQ && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header Câu Hỏi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                background: '#4F8CFF',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              Vòng {state.round}/{state.totalRounds}
            </span>

            {me.answeredCurrent ? (
              <span
                style={{
                  color: me.lastAnswerCorrect ? '#16A34A' : '#DC2626',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                {me.lastAnswerCorrect ? '✓ Trả lời đúng!' : '✕ Chưa chính xác'}
              </span>
            ) : (
              <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '13px' }}>
                ⏱️ Đang diễn ra
              </span>
            )}
          </div>

          {/* Thân câu hỏi */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', lineHeight: '1.4' }}>
            {currentQ.stem}
          </div>

          {currentQ.image && (
            <img
              src={currentQ.image}
              alt="Minh họa"
              style={{
                width: '100%',
                maxHeight: '180px',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          )}

          {/* DẠNG 1: Trắc nghiệm 4 lựa chọn (MCQ4) */}
          {currentQ.type === 'mcq4' && currentQ.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(currentQ.options as string[]).map((opt: string, idx: number) => {
                const isSelected = selectedMcq === idx || me.selectedAnswer === idx;
                const isEliminated = (me.eliminatedOptions as number[]).includes(idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={me.answeredCurrent || isEliminated}
                    onClick={() => handleSelectMcq(idx)}
                    style={{
                      minHeight: '48px',
                      padding: '10px 14px',
                      background: isEliminated ? '#F1F5F9' : isSelected ? '#4F8CFF' : '#F8FAFC',
                      color: isEliminated ? '#94A3B8' : isSelected ? '#FFFFFF' : '#1E293B',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: me.answeredCurrent || isEliminated ? 'not-allowed' : 'pointer',
                      opacity: isEliminated ? 0.4 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: isSelected ? '#FFFFFF' : '#E2E8F0',
                        color: isSelected ? '#4F8CFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* DẠNG 2: Đúng / Sai đơn (TF) */}
          {currentQ.type === 'tf' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={me.answeredCurrent}
                onClick={() => handleSelectTf(true)}
                style={{
                  flex: 1,
                  minHeight: '52px',
                  background: selectedTf === true ? '#2ECC8F' : '#E8F5E9',
                  color: selectedTf === true ? '#FFFFFF' : '#15803D',
                  border: '2px solid #2ECC8F',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: me.answeredCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                ✓ ĐÚNG
              </button>
              <button
                type="button"
                disabled={me.answeredCurrent}
                onClick={() => handleSelectTf(false)}
                style={{
                  flex: 1,
                  minHeight: '52px',
                  background: selectedTf === false ? '#FF6B6B' : '#FEE2E2',
                  color: selectedTf === false ? '#FFFFFF' : '#B91C1C',
                  border: '2px solid #FF6B6B',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: me.answeredCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                ✕ SAI
              </button>
            </div>
          )}

          {/* DẠNG 3: Chùm Đúng / Sai (TF Group - Chuẩn BGD 4 ý) */}
          {currentQ.type === 'tf_group' && currentQ.items && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentQ.items as Array<{ text: string; correct: boolean }>).map(
                (it, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      <strong>{String.fromCharCode(97 + idx)})</strong> {it.text}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={me.answeredCurrent}
                        onClick={() => handleTfGroupItem(idx, true)}
                        style={{
                          flex: 1,
                          minHeight: '38px',
                          background: tfGroupAnswers[idx] === true ? '#2ECC8F' : '#FFFFFF',
                          color: tfGroupAnswers[idx] === true ? '#FFFFFF' : '#15803D',
                          border: '1.5px solid #2ECC8F',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        disabled={me.answeredCurrent}
                        onClick={() => handleTfGroupItem(idx, false)}
                        style={{
                          flex: 1,
                          minHeight: '38px',
                          background: tfGroupAnswers[idx] === false ? '#FF6B6B' : '#FFFFFF',
                          color: tfGroupAnswers[idx] === false ? '#FFFFFF' : '#B91C1C',
                          border: '1.5px solid #FF6B6B',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}
                      >
                        Sai
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* DẠNG 4: Trả lời ngắn (Short Answer) */}
          {currentQ.type === 'short' && (
            <form onSubmit={handleSubmitShort} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                disabled={me.answeredCurrent}
                value={shortText}
                onChange={e => setShortText(e.target.value)}
                placeholder="Nhập câu trả lời ngắn..."
                style={{
                  flex: 1,
                  minHeight: '48px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              />
              <button
                type="submit"
                disabled={me.answeredCurrent || !shortText.trim()}
                style={{
                  minHeight: '48px',
                  padding: '0 16px',
                  background: '#4F8CFF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: me.answeredCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                Gửi
              </button>
            </form>
          )}

          {/* HIỂN THỊ KẾT QUẢ GIEO XÚC XẮC */}
          {me.answeredCurrent && (
            <div
              style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: '14px',
                background: me.lastAnswerCorrect ? '#ECFDF5' : '#FFF1F2',
                border: `1.5px solid ${me.lastAnswerCorrect ? '#A7F3D0' : '#FECDD3'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: me.lastAnswerCorrect ? '#065F46' : '#9F1239',
                  }}
                >
                  {me.lastAnswerCorrect
                    ? `🎲 Xúc xắc: ${me.lastDiceRoll ?? 0} nút ➔ Tiến ${me.lastMoveSteps ?? 0} ô`
                    : 'Dừng bánh vòng này để học lại lời giải!'}
                </div>
                {currentQ.explanation && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    💡 {currentQ.explanation}
                  </div>
                )}
              </div>

              {me.lastDiceRoll && (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#2ECC8F',
                    color: '#FFFFFF',
                    fontSize: '20px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(46,204,143,0.4)',
                  }}
                >
                  {me.lastDiceRoll}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Túi đồ thẻ bổ trợ */}
      <CircuitCardInventory
        inventory={me.inventory}
        isActionWindowOpen={isActionWindow && me.lastAnswerCorrect === true && !me.cardActionDone}
        onUseCard={handleUseCard}
        onDiscardCard={handleDiscardCard}
      />

      {/* Nút bỏ qua dùng thẻ khi action window đang mở */}
      {isActionWindow && me.lastAnswerCorrect === true && !me.cardActionDone && (
        <button
          type="button"
          onClick={handleSkipCard}
          style={{
            minHeight: '44px',
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            fontWeight: 700,
            color: '#475569',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Không dùng thẻ ➔ Giữ nguyên bước đi
        </button>
      )}
    </div>
  );
};
