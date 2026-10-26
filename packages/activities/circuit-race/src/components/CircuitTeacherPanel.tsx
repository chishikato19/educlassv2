import React, { useState, useEffect } from 'react';
import type { CircuitState } from '../circuit-schemas.js';
import { CircuitTrackView } from './CircuitTrackView.js';
import { CircuitProjectorView } from './CircuitProjectorView.js';

export interface TeacherPanelProps {
  runId: string;
  state: CircuitState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
}

export const CircuitTeacherPanel: React.FC<TeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const [showProjectorModal, setShowProjectorModal] = useState(false);

  // 1-second interval to drive auto-advance state synchronization
  useEffect(() => {
    if (state.phase === 'podium') return;

    const interval = setInterval(() => {
      onSendIntent({ type: 'sync_tick' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.phase, onSendIntent]);

  const pList = Object.values(state.participants);
  const totalStudents = pList.length;
  const answeredCount = pList.filter(p => p.answeredCurrent).length;
  const percentAnswered = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;

  const sortedParticipants = [...pList].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position;
    return b.correctCount - a.correctCount;
  });

  const handleOpenActionWindow = () => {
    onSendIntent({ type: 'open_action_window' });
  };

  const handleNextRound = () => {
    onSendIntent({ type: 'next_round' });
  };

  const handleEndGame = () => {
    onSendIntent({ type: 'end_game' });
  };

  const isQuestionPhase = state.phase === 'question';
  const isActionWindow = state.phase === 'action_window';
  const isPodium = state.phase === 'podium';

  // Calculate remaining seconds
  const targetExpiresAt = isActionWindow ? state.actionExpiresAt : state.roundExpiresAt;
  const remainingSeconds = Math.max(0, Math.ceil((targetExpiresAt - Date.now()) / 1000));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px',
        fontFamily: 'Nunito, system-ui, sans-serif',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Thanh điều khiển chính & Trạng thái chặng đua */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>🏎️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                Đường Đua Tri Thức • Vòng {state.round}/{state.totalRounds}
              </h2>
              {/* Badge Trạng thái & Đếm ngược */}
              {isQuestionPhase && (
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0369A1',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  📝 Làm bài: còn {remainingSeconds}s
                </span>
              )}
              {isActionWindow && (
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  ⚡ Thời gian dùng thẻ: còn {remainingSeconds}s
                </span>
              )}
              {isPodium && (
                <span
                  style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  🏆 Cuộc đua đã kết thúc
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Đã nộp: <strong>{answeredCount}/{totalStudents}</strong> học sinh ({percentAnswered}%) • Độ dài đường đua: <strong>{state.track.length} ô</strong>
            </div>
          </div>
        </div>

        {/* Nút hành động của giáo viên */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isQuestionPhase && (
            <button
              type="button"
              onClick={handleOpenActionWindow}
              style={{
                background: '#FFB020',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⚡ Mở dùng thẻ sớm
            </button>
          )}

          {!isPodium && (
            <button
              type="button"
              onClick={handleNextRound}
              style={{
                background: '#4F8CFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79,140,255,0.25)',
              }}
            >
              🏁 Lăn bánh & Sang vòng tiếp ➔
            </button>
          )}

          {!isPodium ? (
            <button
              type="button"
              onClick={handleEndGame}
              style={{
                background: '#F1F5F9',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Kết thúc sớm
            </button>
          ) : (
            <button
              type="button"
              onClick={onEndActivity}
              style={{
                background: '#2ECC8F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Đóng & Lưu kết quả
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowProjectorModal(true)}
            style={{
              background: '#0F172A',
              color: '#FDE68A',
              border: '1.5px solid #F59E0B',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📺</span>
            <span>Màn chiếu</span>
          </button>
        </div>
      </div>

      {/* 2. Bố cục 2 cột: Cột trái (1/5 diện tích) = BXH & Sự kiện | Cột phải (4/5 diện tích) = Bản đồ đường đua */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.1fr) 4fr',
          gap: '14px',
          alignItems: 'start',
        }}
      >
        {/* Cột Trái (~1/5): Bảng Xếp Hạng & Bảng Tin Chiến Sự */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Top BXH */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#334155',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>🏆 Top Dẫn Đầu</span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>{pList.length} HS</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {sortedParticipants.slice(0, 8).map((p, idx) => (
                <div
                  key={p.participantId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: idx === 0 ? '#FEF3C7' : '#F8FAFC',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}{' '}
                    {p.displayName}
                  </span>
                  <span style={{ color: '#4F8CFF', fontWeight: 800 }}>Ô {p.position}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng Tin Chiến Sự */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
              ⚔️ Bảng Tin Chiến Sự
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {state.battleLogs.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: '11px', textAlign: 'center', padding: '12px 0' }}>
                  Chưa có sự kiện nào
                </div>
              ) : (
                state.battleLogs.slice(0, 15).map(log => (
                  <div
                    key={log.id}
                    style={{
                      fontSize: '11px',
                      padding: '6px 8px',
                      background: '#F1F5F9',
                      borderRadius: '6px',
                      color: '#334155',
                      lineHeight: '1.35',
                    }}
                  >
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cột Phải (~4/5): Bản đồ đường đua chiếm đại đa số diện tích */}
        <div style={{ width: '100%' }}>
          <CircuitTrackView
            track={state.track}
            participants={state.participants}
            bananaTraps={state.bananaTraps}
            isProjector={false}
          />
        </div>
      </div>

      {/* 3. Modal Trình chiếu Projector toàn màn hình */}
      {showProjectorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0F172A',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              position: 'fixed',
              top: '16px',
              right: '20px',
              zIndex: 10000,
            }}
          >
            <button
              type="button"
              onClick={() => setShowProjectorModal(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✕ Đóng màn chiếu
            </button>
          </div>
          <CircuitProjectorView state={state} />
        </div>
      )}
    </div>
  );
};
