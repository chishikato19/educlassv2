import React from 'react';
import type { Card } from '../circuit-schemas.js';

interface CircuitCardInventoryProps {
  inventory: Card[];
  isActionWindowOpen: boolean;
  onUseCard: (cardId: string) => void;
  onDiscardCard: (cardId: string) => void;
}

export const CircuitCardInventory: React.FC<CircuitCardInventoryProps> = ({
  inventory,
  isActionWindowOpen,
  onUseCard,
  onDiscardCard,
}) => {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '12px 14px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        border: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
          🎒 Túi đồ chiến thuật ({inventory.length}/2 thẻ)
        </span>
        {isActionWindowOpen && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#EF4444',
              animation: 'pulse 1.5s infinite',
            }}
          >
            ⚡ Thời gian dùng thẻ!
          </span>
        )}
      </div>

      {inventory.length === 0 ? (
        <div
          style={{
            padding: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#94A3B8',
            background: '#F8FAFC',
            borderRadius: '12px',
            border: '1px dashed #CBD5E1',
          }}
        >
          Chưa có thẻ nào. Hãy trả lời đúng câu hỏi để nhận thẻ ngẫu nhiên!
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          {inventory.map(card => (
            <div
              key={card.id}
              style={{
                flex: 1,
                background: isActionWindowOpen ? '#FEF3C7' : '#F8FAFC',
                border: isActionWindowOpen ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                borderRadius: '14px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      lineHeight: '1.2',
                    }}
                  >
                    {card.name}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    marginTop: '4px',
                    lineHeight: '1.3',
                  }}
                >
                  {card.description}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  disabled={!isActionWindowOpen}
                  onClick={() => onUseCard(card.id)}
                  style={{
                    flex: 1,
                    minHeight: '38px',
                    background: isActionWindowOpen ? '#F59E0B' : '#E2E8F0',
                    color: isActionWindowOpen ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: isActionWindowOpen ? 'pointer' : 'not-allowed',
                  }}
                >
                  Dùng
                </button>
                <button
                  type="button"
                  title="Vứt thẻ này để nhận 5 EXP"
                  onClick={() => onDiscardCard(card.id)}
                  style={{
                    minWidth: '32px',
                    minHeight: '38px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#64748B',
                    borderRadius: '8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
