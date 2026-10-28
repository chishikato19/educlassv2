import React from 'react';
import type { StudentSessionSummaryItem } from '@educlass/protocol';
import { UI_COLORS, UI_RADII, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';
import { Button } from './Button.js';
import { Card } from './Card.js';
import { ExpLevelBar } from './ExpLevelBar.js';
import { StudentAvatar } from './StudentAvatar.js';
import { TitleBadge } from './TitleBadge.js';

export interface StudentSessionSummaryViewProps {
  summary: StudentSessionSummaryItem;
  onRejoin?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * Màn tổng kết cuối tiết cho Học sinh (Task 5.3)
 * Hiển thị EXP nhận được trong phiên, danh hiệu mới, level bar,
 * và banner nhắc nhở "Đăng nhập bằng PIN để lưu EXP lần sau" cho học sinh roster/guest.
 */
export const StudentSessionSummaryView: React.FC<StudentSessionSummaryViewProps> = ({
  summary,
  onRejoin,
  className = '',
}) => {
  const isAccount = summary.identityLevel === 'account';

  return (
    <div
      data-testid="student-session-summary-view"
      className={`student-session-summary flex flex-col gap-4 w-full max-w-md mx-auto ${className}`}
      style={{
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        color: UI_COLORS.text,
      }}
    >
      <div data-testid="student-session-summary" style={{ width: '100%' }}>
        <Card>
          {/* 1. Header: Avatar & Tên học sinh */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '6px 14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '16px',
                color: UI_COLORS.primary,
                fontSize: '14px',
                fontWeight: 700,
              }}
              data-testid="summary-session-badge"
            >
              🎉 Tiết học đã kết thúc! Tổng kết tiết học #{summary.sessionCode}
            </div>

            <div
              data-testid="summary-student-avatar"
              style={{ position: 'relative', marginTop: '4px' }}
            >
              <StudentAvatar config={summary.avatar} size="xl" />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 800,
                  color: UI_COLORS.text,
                }}
                data-testid="summary-student-name"
              >
                {summary.displayName}
              </h2>

              <div
                style={{
                  fontSize: '13px',
                  color: UI_COLORS.textMuted,
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>
                  {isAccount
                    ? '⭐ Tài khoản chính thức'
                    : summary.identityLevel === 'roster'
                      ? '📋 Học sinh trong danh sách'
                      : '👤 Khách tự do'}
                </span>
                {summary.teamName && (
                  <span style={{ fontWeight: 600, color: UI_COLORS.secondary }}>
                    • Đội: {summary.teamName}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Thẻ EXP nhận được trong phiên */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#FFFBEB',
                border: `2px solid ${UI_COLORS.warning}`,
                borderRadius: UI_RADII.card,
                padding: '16px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'center',
              }}
              data-testid="summary-exp-card"
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#B45309' }}>
                EXP NHẬN ĐƯỢC TRONG TIẾT HỌC
              </span>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                data-testid="summary-exp-earned"
              >
                <span>⚡</span>
                <span>+{summary.totalExpEarned} EXP</span>
              </div>

              {summary.leveledUp && (
                <div
                  style={{
                    backgroundColor: '#D1FAE5',
                    color: UI_COLORS.success,
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                  data-testid="summary-levelup-badge"
                >
                  🚀 Chúc mừng! Bạn đã thăng cấp lên Level {summary.currentLevel}!
                </div>
              )}

              {/* Thanh tiến độ Level nếu là tài khoản có lưu trữ */}
              {isAccount && (
                <div data-testid="summary-exp-bar" style={{ marginTop: '4px' }}>
                  <ExpLevelBar
                    currentExp={summary.totalAccumulatedExp}
                    level={summary.currentLevel}
                  />
                  <div style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '6px' }}>
                    Tổng EXP tích lũy tài khoản: <strong>{summary.totalAccumulatedExp} EXP</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Chi tiết các lần nhận thưởng EXP */}
            {summary.expBreakdown.length > 0 && (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  textAlign: 'left',
                }}
                data-testid="summary-exp-breakdown"
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: UI_COLORS.textMuted }}>
                  Chi tiết thành tích đạt được:
                </span>
                <div
                  style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {summary.expBreakdown.map((item, idx) => (
                    <div
                      key={`${item.ts}_${idx}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        fontSize: '13px',
                        border: `1px solid ${UI_COLORS.border}`,
                      }}
                      data-testid={`exp-breakdown-item-${idx}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎁</span>
                        <span style={{ fontWeight: 500 }}>{item.reason}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: UI_COLORS.success }}>
                        +{item.exp} EXP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Danh hiệu mới đạt được (nếu có) */}
            {summary.newTitlesAwarded.length > 0 && (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'left',
                  padding: '12px',
                  backgroundColor: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  borderRadius: UI_RADII.card,
                  boxSizing: 'border-box',
                }}
                data-testid="summary-titles-section"
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#7E22CE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🏆</span>
                  <span>Danh hiệu mới đạt được:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {summary.newTitlesAwarded.map(title => (
                    <TitleBadge
                      key={title.key}
                      id={title.key}
                      name={title.name}
                      iconKey={title.iconKey}
                      size="md"
                      unlocked={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 5. Khối Nhắc nhở Đăng nhập bằng PIN cho Roster & Guest (Quy chuẩn Task 5.3 & D6) */}
            {summary.reminderPinLogin ? (
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#FEF3C7',
                  border: `2px solid ${UI_COLORS.warning}`,
                  borderRadius: UI_RADII.card,
                  padding: '14px 16px',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
                data-testid="reminder-pin-login-card"
              >
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  data-testid="reminder-pin-login-banner"
                >
                  <span>🔑</span>
                  <span>Đăng nhập bằng PIN để lưu EXP lần sau!</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#78350F',
                    lineHeight: '1.5',
                  }}
                >
                  Bạn đang tham gia với tư cách{' '}
                  <strong>
                    {summary.identityLevel === 'roster' ? 'Học sinh chưa có PIN' : 'Khách tự do'}
                  </strong>
                  . Số điểm <strong>+{summary.totalExpEarned} EXP</strong>{' '}
                  {summary.newTitlesAwarded.length > 0 ? 'và danh hiệu đạt được ' : ''}
                  trong tiết học này chỉ mang tính tạm thời và không được lưu vĩnh viễn vào hệ
                  thống.
                </p>
                <div
                  style={{ fontSize: '13px', color: '#92400E', fontWeight: 600, marginTop: '2px' }}
                >
                  👉 Hãy nhờ thầy/cô cấp mã PIN hoặc đăng nhập bằng mã PIN ở các tiết sau để lưu trữ
                  EXP, lên cấp và mở khóa trang phục nhé!
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#ECFDF5',
                  border: `1px solid ${UI_COLORS.success}`,
                  borderRadius: UI_RADII.card,
                  padding: '12px 16px',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                data-testid="account-exp-saved-card"
              >
                <span style={{ fontSize: '20px' }}>✅</span>
                <span
                  style={{ fontSize: '13px', color: '#065F46', fontWeight: 600 }}
                  data-testid="persisted-exp-banner"
                >
                  Toàn bộ EXP đã được lưu vĩnh viễn vào tài khoản của bạn!
                </span>
              </div>
            )}

            {/* 6. Nút hành động chính (Tối đa 1 hành động theo PLAN 7.2) */}
            <div style={{ width: '100%', marginTop: '8px' }}>
              <Button
                variant="primary"
                fullWidth
                onClick={onRejoin}
                style={{
                  minHeight: UI_SPACING.minTouchTarget,
                  fontSize: '16px',
                  fontWeight: 700,
                }}
                data-testid="btn-rejoin-new-session"
              >
                🚀 Vào phiên học khác
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
