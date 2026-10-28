import React from 'react';
import type { CircuitState } from '../circuit-schemas.js';
import { CircuitTrackView } from './CircuitTrackView.js';

export interface ProjectorViewProps {
  state: CircuitState;
}

export const CircuitProjectorView: React.FC<ProjectorViewProps> = ({ state }) => {
  const pList = Object.values(state.participants);
  const sortedParticipants = [...pList].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position;
    return b.correctCount - a.correctCount;
  });

  const latestLog = state.battleLogs[0];
  const isQuestionPhase = state.phase === 'question';
  const isActionWindow = state.phase === 'action_window';
  const isPodium = state.phase === 'podium';
  const targetExpiresAt = isActionWindow ? state.actionExpiresAt : state.roundExpiresAt;
  const remainingSeconds = Math.max(0, Math.ceil((targetExpiresAt - Date.now()) / 1000));

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: '#FFFFFF',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'Nunito, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Màn Chiếu Lớn */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          padding: '12px 24px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '32px' }}>🏎️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
                ĐƯỜNG ĐUA TRI THỨC
              </h1>
              <span
                style={{
                  background: isActionWindow ? '#F59E0B' : isQuestionPhase ? '#38BDF8' : '#10B981',
                  color: '#0F172A',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 900,
                }}
              >
                {isActionWindow
                  ? `⚡ DÙNG THẺ: CÒN ${remainingSeconds}S`
                  : isQuestionPhase
                    ? `📝 LÀM BÀI: CÒN ${remainingSeconds}S`
                    : '🏆 ĐÃ VỀ ĐÍCH'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
              Chặng đua {state.round}/{state.totalRounds} • {pList.length} tay đua đang tranh tài
            </div>
          </div>
        </div>

        {/* Live Ticker Chiến Sự mới nhất */}
        {latestLog && (
          <div
            style={{
              background: 'rgba(245,158,11,0.2)',
              border: '1.5px solid #F59E0B',
              borderRadius: '14px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#FDE68A',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '500px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span>⚔️</span>
            <span>{latestLog.message}</span>
          </div>
        )}
      </div>

      {/* 2. Bố cục chính: Cột trái (1/5 diện tích) = BXH & Sự kiện | Cột phải (4/5 diện tích) = Bản đồ đường đua */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1.1fr) 4fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Cột trái (1/5): Bảng Xếp Hạng & Dòng sự kiện chiến sự */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Rankings */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: '#FDE68A',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>🏆 BẢNG XẾP HẠNG</span>
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>{pList.length} HS</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '340px',
                overflowY: 'auto',
              }}
            >
              {sortedParticipants.slice(0, 10).map((p, idx) => (
                <div
                  key={p.participantId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background:
                      idx === 0
                        ? 'rgba(245,158,11,0.25)'
                        : idx === 1
                          ? 'rgba(148,163,184,0.2)'
                          : idx === 2
                            ? 'rgba(180,83,9,0.2)'
                            : 'rgba(255,255,255,0.04)',
                    border: idx === 0 ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '160px',
                    }}
                  >
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}{' '}
                    {p.displayName}
                  </span>
                  <span style={{ color: '#38BDF8', fontWeight: 900 }}>Ô {p.position}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dòng sự kiện chiến sự */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div
              style={{ fontSize: '14px', fontWeight: 900, color: '#FDE68A', marginBottom: '10px' }}
            >
              ⚔️ DIỄN BIẾN ĐƯỜNG ĐUA
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              {state.battleLogs.slice(0, 10).map(log => (
                <div
                  key={log.id}
                  style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    lineHeight: '1.4',
                  }}
                >
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải (4/5): Toàn bộ diện tích là Bản đồ đường đua */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '24px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <CircuitTrackView
            track={state.track}
            participants={state.participants}
            bananaTraps={state.bananaTraps}
            isProjector={true}
          />
        </div>
      </div>

      {/* 3. Bục Vinh Quang (Podium) khi về đích */}
      {isPodium && (
        <div
          style={{
            position: 'fixed',
            inset: '30px',
            background: 'rgba(15,23,42,0.96)',
            borderRadius: '28px',
            padding: '40px',
            textAlign: 'center',
            border: '2px solid #F59E0B',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🏆</div>
          <h2 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 24px 0', color: '#FDE68A' }}>
            VINH DANH NHÀ VÔ ĐỊCH ĐƯỜNG ĐUA
          </h2>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: '24px',
              maxWidth: '800px',
              width: '100%',
            }}
          >
            {/* Rank 2 */}
            {state.podium.rank2 && (
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(180deg, #94A3B8 0%, #475569 100%)',
                  borderRadius: '20px 20px 0 0',
                  padding: '24px 16px',
                  height: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '36px' }}>🥈</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px' }}>
                  {state.podium.rank2}
                </div>
                <div style={{ fontSize: '14px', color: '#CBD5E1' }}>Á Quân</div>
              </div>
            )}

            {/* Rank 1 */}
            {state.podium.rank1 && (
              <div
                style={{
                  flex: 1.2,
                  background: 'linear-gradient(180deg, #F59E0B 0%, #B45309 100%)',
                  borderRadius: '24px 24px 0 0',
                  padding: '32px 16px',
                  height: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 0 40px rgba(245,158,11,0.5)',
                }}
              >
                <div style={{ fontSize: '52px' }}>🥇</div>
                <div
                  style={{ fontSize: '24px', fontWeight: 900, marginTop: '8px', color: '#FFFFFF' }}
                >
                  {state.podium.rank1}
                </div>
                <div style={{ fontSize: '16px', color: '#FEF3C7', fontWeight: 700 }}>
                  QUÁN QUÂN ĐƯỜNG ĐUA
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {state.podium.rank3 && (
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(180deg, #B45309 0%, #78350F 100%)',
                  borderRadius: '20px 20px 0 0',
                  padding: '24px 16px',
                  height: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '32px' }}>🥉</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px' }}>
                  {state.podium.rank3}
                </div>
                <div style={{ fontSize: '14px', color: '#FDE68A' }}>Hạng Ba</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
