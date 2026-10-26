import React, { useState, useEffect, useRef } from 'react';
import type { CircuitParticipant, TrackTile, BananaTrap } from '../circuit-schemas.js';

interface CircuitTrackViewProps {
  track: TrackTile[];
  participants: Record<string, CircuitParticipant>;
  bananaTraps?: BananaTrap[];
  currentUserId?: string;
  isProjector?: boolean;
}

const TILES_PER_ROW = 10;

export const CircuitTrackView: React.FC<CircuitTrackViewProps> = ({
  track,
  participants,
  bananaTraps = [],
  currentUserId,
  isProjector = false,
}) => {
  const pList = Object.values(participants);

  // Animated positions for step-by-step movement
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of pList) {
      init[p.participantId] = p.position;
    }
    return init;
  });

  const [hoppingPlayers, setHoppingPlayers] = useState<Record<string, boolean>>({});
  const animRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if any participant needs stepping
    const needsAnimation = pList.some(p => {
      const current = animatedPositions[p.participantId] ?? p.position;
      return current !== p.position;
    });

    if (!needsAnimation) {
      if (Object.keys(hoppingPlayers).length > 0) {
        setHoppingPlayers({});
      }
      return;
    }

    if (animRef.current) clearInterval(animRef.current);

    animRef.current = setInterval(() => {
      setAnimatedPositions(prev => {
        let changed = false;
        const next = { ...prev };
        const hopping: Record<string, boolean> = {};

        for (const p of pList) {
          const target = p.position;
          const current = next[p.participantId] ?? target;

          if (current < target) {
            next[p.participantId] = current + 1;
            hopping[p.participantId] = true;
            changed = true;
          } else if (current > target) {
            next[p.participantId] = current - 1;
            hopping[p.participantId] = true;
            changed = true;
          }
        }

        setHoppingPlayers(hopping);

        if (!changed && animRef.current) {
          clearInterval(animRef.current);
          animRef.current = null;
        }

        return next;
      });
    }, 220); // 220ms per step creates a smooth, energetic hopping cadence

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [participants]);

  // Group participants by their current animated tile
  const participantsByTile: Record<number, CircuitParticipant[]> = {};
  for (const p of pList) {
    const pos = animatedPositions[p.participantId] ?? p.position;
    if (!participantsByTile[pos]) participantsByTile[pos] = [];
    participantsByTile[pos]?.push(p);
  }

  // Group banana traps by tile
  const trapsByTile: Record<number, BananaTrap[]> = {};
  for (const t of bananaTraps) {
    if (!trapsByTile[t.tileIndex]) trapsByTile[t.tileIndex] = [];
    trapsByTile[t.tileIndex]?.push(t);
  }

  // Chunk track into rows of TILES_PER_ROW for 2D winding track
  const rows: TrackTile[][] = [];
  for (let i = 0; i < track.length; i += TILES_PER_ROW) {
    rows.push(track.slice(i, i + TILES_PER_ROW));
  }

  return (
    <div
      style={{
        width: '100%',
        padding: isProjector ? '20px 16px' : '12px 10px',
        background: 'linear-gradient(180deg, #F0F7FF 0%, #E6F0FA 100%)',
        borderRadius: isProjector ? '24px' : '16px',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: isProjector ? '20px' : '12px',
        boxSizing: 'border-box',
      }}
    >
      {rows.map((rowTiles, rowIndex) => {
        const isReverse = rowIndex % 2 === 1; // Snake pattern: odd rows reverse direction
        const displayTiles = isReverse ? [...rowTiles].reverse() : rowTiles;
        const isLastRow = rowIndex === rows.length - 1;

        return (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* The Row of Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${TILES_PER_ROW}, 1fr)`,
                gap: isProjector ? '10px' : '6px',
                alignItems: 'end',
              }}
            >
              {displayTiles.map(tile => {
                const playersHere = participantsByTile[tile.index] ?? [];
                const trapsHere = trapsByTile[tile.index] ?? [];
                const isFinish = tile.index === track.length - 1;
                const isStart = tile.index === 0;

                let tileBg = '#FFFFFF';
                let borderColor = '#D0E2FF';
                let tileIcon = '';

                if (isStart) {
                  tileBg = '#E8F5E9';
                  borderColor = '#2ECC8F';
                  tileIcon = '🏁';
                } else if (isFinish) {
                  tileBg = '#FFF8E1';
                  borderColor = '#FFB020';
                  tileIcon = '🏆';
                } else if (tile.type === 'boost') {
                  tileBg = '#E0F2FE';
                  borderColor = '#38BDF8';
                  tileIcon = '🚀';
                } else if (tile.type === 'mud') {
                  tileBg = '#FEF3C7';
                  borderColor = '#F59E0B';
                  tileIcon = '🕳️';
                } else if (tile.type === 'mystery') {
                  tileBg = '#F3E8FF';
                  borderColor = '#A855F7';
                  tileIcon = '🎁';
                } else if (tile.type === 'checkpoint') {
                  tileBg = '#FEE2E2';
                  borderColor = '#EF4444';
                  tileIcon = '🛑';
                }

                const hasCurrentUser = playersHere.some(p => p.participantId === currentUserId);

                return (
                  <div
                    key={tile.index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Floating player avatars on this tile */}
                    <div
                      style={{
                        minHeight: isProjector ? '48px' : '36px',
                        display: 'flex',
                        flexWrap: 'wrap-reverse',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '2px',
                        marginBottom: '4px',
                        width: '100%',
                      }}
                    >
                      {trapsHere.length > 0 && (
                        <span
                          title="Bẫy vỏ chuối"
                          style={{ fontSize: isProjector ? '18px' : '13px' }}
                        >
                          🍌
                        </span>
                      )}
                      {playersHere.slice(0, 3).map(p => {
                        const isMe = p.participantId === currentUserId;
                        const isHopping = Boolean(hoppingPlayers[p.participantId]);

                        return (
                          <div
                            key={p.participantId}
                            title={`${p.displayName} (Ô ${tile.index})`}
                            style={{
                              padding: isProjector ? '3px 6px' : '2px 4px',
                              background: isMe ? '#FFB020' : '#4F8CFF',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: isProjector ? '12px' : '9px',
                              borderRadius: '10px',
                              boxShadow: isMe
                                ? '0 0 0 2px #FFFFFF, 0 0 0 4px #FFB020'
                                : '0 2px 4px rgba(0,0,0,0.15)',
                              whiteSpace: 'nowrap',
                              maxWidth: isProjector ? '80px' : '52px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              transform: isHopping
                                ? 'translateY(-8px) scale(1.18)'
                                : 'translateY(0) scale(1)',
                              transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              zIndex: isHopping ? 10 : 2,
                            }}
                          >
                            {p.hasShield && <span>🛡️</span>}
                            {p.mudTrapped && <span>🕳️</span>}
                            <span>{p.displayName.slice(0, 5)}</span>
                          </div>
                        );
                      })}
                      {playersHere.length > 3 && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: '#4F8CFF',
                            background: '#FFFFFF',
                            borderRadius: '8px',
                            padding: '1px 3px',
                          }}
                        >
                          +{playersHere.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Tile block */}
                    <div
                      style={{
                        width: '100%',
                        height: isProjector ? '56px' : '42px',
                        backgroundColor: tileBg,
                        border: `2.5px solid ${hasCurrentUser ? '#FFB020' : borderColor}`,
                        borderRadius: isProjector ? '14px' : '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontWeight: 800,
                        fontSize: isProjector ? '13px' : '10px',
                        color: '#334155',
                        boxShadow: hasCurrentUser
                          ? '0 4px 12px rgba(255,176,32,0.45)'
                          : '0 2px 4px rgba(0,0,0,0.04)',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tileIcon && (
                        <span style={{ fontSize: isProjector ? '16px' : '11px', lineHeight: 1 }}>
                          {tileIcon}
                        </span>
                      )}
                      <span>
                        {tile.index === 0 ? 'X.Phát' : isFinish ? 'ĐÍCH' : tile.index}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual turn indicator between rows */}
            {!isLastRow && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: isReverse ? 'flex-start' : 'flex-end',
                  padding: '2px 14px',
                  color: '#94A3B8',
                  fontSize: isProjector ? '14px' : '11px',
                  fontWeight: 900,
                }}
              >
                {isReverse ? '↙️ Vòng cua tiếp' : 'Vòng cua tiếp ↘️'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
