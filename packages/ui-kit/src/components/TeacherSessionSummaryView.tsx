import React, { useEffect, useState } from 'react';
import type {
  SessionDifficultQuestionItem,
  SessionGamificationSummary,
  SessionReportDto,
  SessionStudentScoreItem,
} from '@educlass/protocol';
import { UI_COLORS, UI_RADII, UI_TYPOGRAPHY } from '../tokens/index.js';
import { Button } from './Button.js';
import { Card } from './Card.js';
import { StudentAvatar } from './StudentAvatar.js';
import { TitleBadge } from './TitleBadge.js';

export interface TeacherSessionSummaryViewProps {
  report: SessionReportDto;
  defaultTab?: 'gamification' | 'scoreboard' | 'difficult' | undefined;
  onExportExcel?: ((sessionId: string) => Promise<void> | void) | undefined;
  onNewSession?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * Khung tổng kết phiên cho GV (toàn lớp) — Task 5.4
 * Bao gồm:
 * 1. Bục vinh danh Top 3 (Podium) hoành tráng với Avatar SVG, huy chương vàng/bạc/đồng.
 * 2. Spotlight danh hiệu mới mở khóa toàn lớp trong phiên (New Titles Awarded).
 * 3. Thống kê cấp danh tính & an toàn lưu EXP, danh sách nhắc nhở HS roster cần cấp PIN.
 * 4. Chế độ Màn chiếu lớp học (Projector Mode) toàn màn hình cho TV/máy chiếu.
 * 5. Tab Bảng điểm chi tiết & Phân tích câu hỏi sai nhiều.
 */
export const TeacherSessionSummaryView: React.FC<TeacherSessionSummaryViewProps> = ({
  report,
  defaultTab,
  onExportExcel,
  onNewSession,
  className = '',
}) => {
  // Phòng vệ nếu report bị bọc trong { session, report }
  const actualReport = (report && typeof report === 'object' && 'report' in (report as Record<string, unknown>))
    ? ((report as unknown as { report: SessionReportDto }).report)
    : report;

  const snapshot = actualReport?.snapshot ?? {
    totalStudents: 0,
    attendanceRate: 0,
    averageScore: 0,
    activityCount: 0,
    scoreboard: [],
    difficultQuestions: [],
    identityStats: { rosterSaved: 0, tempPinnedSaved: 0, guestEphemeral: 0, totalExpAwarded: 0 },
    gamification: { topPodium: [], unlockedTitles: [], studentTitles: {}, identityStats: { rosterSaved: 0, tempPinnedSaved: 0, guestEphemeral: 0, totalExpAwarded: 0 } },
  };
  const sessionId = actualReport?.sessionId ?? '';
  const gamification: SessionGamificationSummary | undefined = snapshot?.gamification;

  // Quyết định tab khởi đầu: nếu truyền defaultTab thì dùng;
  // nếu không truyền: nếu có gamification thì ưu tiên 'gamification', nếu không thì 'scoreboard'
  const initialTab =
    defaultTab ?? (gamification?.topPodium && gamification.topPodium.length > 0 ? 'gamification' : 'scoreboard');

  const [activeTab, setActiveTab] = useState<'gamification' | 'scoreboard' | 'difficult'>(initialTab);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>('');

  // Lắng nghe phím ESC để thoát chế độ màn chiếu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProjectorMode) {
        setIsProjectorMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectorMode]);

  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      if (onExportExcel) {
        await onExportExcel(sessionId);
      } else {
        window.open(`/api/sessions/${sessionId}/report/excel`, '_blank');
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Không thể xuất file Excel.');
    } finally {
      setExporting(false);
    }
  };

  const scoreboard: SessionStudentScoreItem[] = snapshot.scoreboard ?? [];
  const difficultQuestions: SessionDifficultQuestionItem[] = snapshot.difficultQuestions ?? [];
  const summary = snapshot.summary;

  // Top 3 Podium
  const topPodium = gamification?.topPodium ?? scoreboard.slice(0, 3);
  const rank1 = topPodium.find((p) => p.rank === 1);
  const rank2 = topPodium.find((p) => p.rank === 2);
  const rank3 = topPodium.find((p) => p.rank === 3);

  const newTitles = gamification?.newTitlesAwarded ?? [];
  const identityStats = gamification?.identityStats;
  const rosterNeedingPin = gamification?.rosterNeedingPin ?? [];

  return (
    <div
      data-testid="teacher-session-summary-view"
      className={`teacher-session-summary flex flex-col gap-6 w-full ${className}`}
      style={{
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        color: UI_COLORS.text,
      }}
    >
      <Card data-testid="session-report-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Header Báo Cáo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${UI_COLORS.border}`,
              paddingBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#F1F5F9',
                    color: UI_COLORS.textMuted,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  ✓ ĐÃ KẾT THÚC
                </span>
                <span style={{ fontSize: '14px', color: UI_COLORS.textMuted }}>
                  Mã vào lớp: <strong style={{ color: UI_COLORS.primary }}>{snapshot.sessionCode}</strong>
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '24px' }}>
                {snapshot.className
                  ? `Báo cáo phiên học: ${snapshot.className}`
                  : `Báo cáo phiên #${snapshot.sessionCode}`}
              </h2>
              <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
                Bắt đầu: {new Date(snapshot.openedAt).toLocaleTimeString('vi-VN')} • Kết thúc:{' '}
                {new Date(snapshot.closedAt).toLocaleTimeString('vi-VN')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Nút Chiếu lớp học (Projector Mode) */}
              <Button
                variant="secondary"
                onClick={() => setIsProjectorMode(true)}
                style={{
                  minHeight: '44px',
                  fontWeight: 700,
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  borderColor: '#6D28D9',
                }}
                data-testid="btn-projector-mode"
              >
                📽️ Chiếu lớp học
              </Button>

              <Button
                variant="ghost"
                onClick={() => void handleExport()}
                disabled={exporting}
                style={{
                  minHeight: '44px',
                  border: `1px solid ${UI_COLORS.primary}`,
                  color: UI_COLORS.primary,
                  fontWeight: 600,
                }}
                data-testid="btn-export-excel"
              >
                {exporting ? '⏳ Đang tạo file...' : '📥 Xuất Excel (.xlsx)'}
              </Button>

              {onNewSession && (
                <Button
                  variant="primary"
                  onClick={onNewSession}
                  style={{ minHeight: '44px' }}
                  data-testid="btn-new-session-from-report"
                >
                  Mở phiên học mới
                </Button>
              )}
            </div>
          </div>

          {exportError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: `1px solid ${UI_COLORS.error}`,
                borderRadius: UI_RADII.card,
                color: UI_COLORS.error,
                fontSize: '14px',
              }}
              data-testid="export-error-message"
            >
              {exportError}
            </div>
          )}

          {/* 2. Chỉ số tóm tắt (Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '14px',
            }}
          >
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: UI_COLORS.primary, fontWeight: 600 }}>Sĩ số tham gia</div>
              <div
                data-testid="report-stat-total"
                style={{ fontSize: '28px', fontWeight: 800, color: UI_COLORS.primary, marginTop: '4px' }}
              >
                {snapshot.totalParticipants}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: UI_COLORS.success, fontWeight: 600 }}>Trực tuyến khi đóng</div>
              <div
                data-testid="report-stat-online"
                style={{ fontSize: '28px', fontWeight: 800, color: UI_COLORS.success, marginTop: '4px' }}
              >
                {snapshot.onlineParticipants}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, fontWeight: 600 }}>Số đội / nhóm</div>
              <div
                data-testid="report-stat-teams"
                style={{ fontSize: '28px', fontWeight: 800, color: UI_COLORS.text, marginTop: '4px' }}
              >
                {snapshot.teams.length}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: UI_COLORS.primary, fontWeight: 600 }}>Điểm trung bình</div>
              <div
                data-testid="report-stat-avg-score"
                style={{ fontSize: '28px', fontWeight: 800, color: UI_COLORS.primary, marginTop: '4px' }}
              >
                {summary?.averageScore ?? 0}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#FAF5FF',
                border: '1px solid #E9D5FF',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: '#7E22CE', fontWeight: 600 }}>Độ chính xác TB</div>
              <div
                data-testid="report-stat-avg-accuracy"
                style={{ fontSize: '28px', fontWeight: 800, color: '#7E22CE', marginTop: '4px' }}
              >
                {summary?.averageAccuracy ?? 0}%
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: '#B45309', fontWeight: 600 }}>Tổng EXP đã trao</div>
              <div
                data-testid="report-stat-total-exp"
                style={{ fontSize: '28px', fontWeight: 800, color: '#B45309', marginTop: '4px' }}
              >
                +{summary?.totalExpAwarded ?? 0}
              </div>
            </div>
          </div>

          {/* 3. Tab Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: `2px solid ${UI_COLORS.border}`,
              paddingBottom: '2px',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('gamification')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'gamification' ? '#7C3AED' : UI_COLORS.textMuted,
                borderBottom: activeTab === 'gamification' ? '3px solid #7C3AED' : '3px solid transparent',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
              data-testid="tab-gamification"
            >
              🏆 Vinh danh & Game hóa
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scoreboard')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'scoreboard' ? UI_COLORS.primary : UI_COLORS.textMuted,
                borderBottom: activeTab === 'scoreboard' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
              data-testid="tab-scoreboard"
            >
              📊 Bảng điểm học sinh ({scoreboard.length > 0 ? scoreboard.length : snapshot.participants.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('difficult')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'difficult' ? UI_COLORS.error : UI_COLORS.textMuted,
                borderBottom: activeTab === 'difficult' ? `3px solid ${UI_COLORS.error}` : '3px solid transparent',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
              data-testid="tab-difficult-questions"
            >
              ⚠️ Câu hỏi sai nhiều ({difficultQuestions.length})
            </button>
          </div>

          {/* TAB 1: VINH DANH & GAME HÓA */}
          {activeTab === 'gamification' && (
            <div
              data-testid="gamification-content"
              style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
            >
              {/* Khối Bục Vinh Danh Top 3 (Podium) */}
              <div
                data-testid="podium-container"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: UI_RADII.card,
                  padding: '24px 16px',
                  border: `1px solid ${UI_COLORS.border}`,
                  textAlign: 'center',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 20px 0',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: UI_COLORS.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🎉</span>
                  <span>BỤC VINH DANH TOÀN LỚP (TOP 3 XUẤT SẮC NHẤT)</span>
                </h3>

                {topPodium.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      color: UI_COLORS.textMuted,
                      fontSize: '14px',
                    }}
                    data-testid="podium-empty"
                  >
                    Chưa có dữ liệu xếp hạng học sinh trong phiên này.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      gap: '16px',
                      maxWidth: '680px',
                      margin: '0 auto',
                      paddingTop: '20px',
                    }}
                  >
                    {/* Bục Rank 2 (Bạc) */}
                    <div
                      style={{
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        opacity: rank2 ? 1 : 0.4,
                      }}
                      data-testid="podium-item-rank-2"
                    >
                      {rank2 ? (
                        <>
                          <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <StudentAvatar config={rank2.avatar} size="lg" />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-6px',
                                right: '-6px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: '#64748B',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF',
                              }}
                            >
                              2
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '15px',
                              color: UI_COLORS.text,
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={rank2.displayName}
                          >
                            {rank2.displayName}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: UI_COLORS.primary }}>
                            {rank2.score.toLocaleString()} điểm
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: UI_COLORS.success }}>
                            +{rank2.expEarned} EXP
                          </div>
                          {/* Khối Cột Bục */}
                          <div
                            style={{
                              width: '100%',
                              height: '100px',
                              marginTop: '12px',
                              backgroundColor: '#E2E8F0',
                              borderTopLeftRadius: '12px',
                              borderTopRightRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '28px',
                              color: '#64748B',
                              border: '2px solid #CBD5E1',
                              borderBottom: 'none',
                            }}
                          >
                            🥈
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '140px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ color: UI_COLORS.textMuted, fontSize: '13px' }}>Trống</span>
                        </div>
                      )}
                    </div>

                    {/* Bục Rank 1 (Vàng - Cao Nhất) */}
                    <div
                      style={{
                        flex: '1.2',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transform: 'translateY(-12px)',
                      }}
                      data-testid="podium-item-rank-1"
                    >
                      {rank1 ? (
                        <>
                          <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '24px',
                              }}
                            >
                              👑
                            </div>
                            <StudentAvatar config={rank1.avatar} size="xl" />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-8px',
                                right: '-8px',
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: '#F59E0B',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              1
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '17px',
                              color: UI_COLORS.text,
                              maxWidth: '140px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={rank1.displayName}
                          >
                            {rank1.displayName}
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: UI_COLORS.primary }}>
                            {rank1.score.toLocaleString()} điểm
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: UI_COLORS.success }}>
                            +{rank1.expEarned} EXP
                          </div>
                          {/* Khối Cột Bục */}
                          <div
                            style={{
                              width: '100%',
                              height: '140px',
                              marginTop: '12px',
                              backgroundColor: '#FEF3C7',
                              borderTopLeftRadius: '14px',
                              borderTopRightRadius: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '36px',
                              color: '#D97706',
                              border: '2px solid #FCD34D',
                              borderBottom: 'none',
                              boxShadow: '0 -4px 12px rgba(245, 158, 11, 0.15)',
                            }}
                          >
                            🥇
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '180px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ color: UI_COLORS.textMuted, fontSize: '13px' }}>Trống</span>
                        </div>
                      )}
                    </div>

                    {/* Bục Rank 3 (Đồng) */}
                    <div
                      style={{
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        opacity: rank3 ? 1 : 0.4,
                      }}
                      data-testid="podium-item-rank-3"
                    >
                      {rank3 ? (
                        <>
                          <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <StudentAvatar config={rank3.avatar} size="lg" />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '-6px',
                                right: '-6px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: '#D97706',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF',
                              }}
                            >
                              3
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '15px',
                              color: UI_COLORS.text,
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={rank3.displayName}
                          >
                            {rank3.displayName}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: UI_COLORS.primary }}>
                            {rank3.score.toLocaleString()} điểm
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: UI_COLORS.success }}>
                            +{rank3.expEarned} EXP
                          </div>
                          {/* Khối Cột Bục */}
                          <div
                            style={{
                              width: '100%',
                              height: '75px',
                              marginTop: '12px',
                              backgroundColor: '#FFEDD5',
                              borderTopLeftRadius: '12px',
                              borderTopRightRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '28px',
                              color: '#B45309',
                              border: '2px solid #FDBA74',
                              borderBottom: 'none',
                            }}
                          >
                            🥉
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '115px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ color: UI_COLORS.textMuted, fontSize: '13px' }}>Trống</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Khối Spotlight Danh Hiệu Mới Mở Khóa */}
              <div
                data-testid="titles-spotlight-container"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: UI_RADII.card,
                  padding: '20px',
                  border: `1px solid ${UI_COLORS.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    borderBottom: '1px solid #F1F5F9',
                    paddingBottom: '10px',
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#6D28D9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🎖️</span>
                    <span>DANH HIỆU MỚI MỞ KHÓA TOÀN LỚP ({newTitles.length})</span>
                  </h4>
                  <span style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                    Tự động trao thưởng qua hệ thống luật
                  </span>
                </div>

                {newTitles.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: UI_COLORS.textMuted,
                      fontSize: '14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                    }}
                    data-testid="titles-spotlight-empty"
                  >
                    Chưa có học sinh nào mở khóa danh hiệu mới trong phiên học này.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '12px',
                    }}
                    data-testid="titles-spotlight-list"
                  >
                    {newTitles.map((t, idx) => (
                      <div
                        key={`${t.studentId}_${t.titleKey}_${idx}`}
                        data-testid={`spotlight-title-${t.titleKey}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#FAF5FF',
                          border: '1px solid #E9D5FF',
                        }}
                      >
                        <TitleBadge
                          name={t.titleName}
                          iconKey={t.iconKey}
                          size="md"
                          unlocked={true}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: UI_COLORS.text }}>
                            {t.studentName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#7E22CE', fontWeight: 600 }}>
                            Vừa đạt danh hiệu {t.titleName}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Khối Thống kê Danh tính & An toàn lưu EXP */}
              <div
                data-testid="identity-exp-stats-container"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Cột 1: Phân bổ 3 cấp danh tính */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: UI_RADII.card,
                    padding: '20px',
                    border: `1px solid ${UI_COLORS.border}`,
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 14px 0',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: UI_COLORS.text,
                    }}
                  >
                    🛡️ Phân bổ Danh tính & Lưu trữ EXP
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '10px',
                        border: '1px solid #BBF7D0',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>
                        ⭐ Tài khoản có PIN:
                      </div>
                      <div style={{ fontWeight: 800, color: UI_COLORS.success }}>
                        {identityStats?.accountCount ?? 0} HS (Đã lưu vào DB)
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#FFFBEB',
                        borderRadius: '10px',
                        border: '1px solid #FDE68A',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>
                        📋 Danh sách lớp (chưa PIN):
                      </div>
                      <div style={{ fontWeight: 800, color: '#B45309' }}>
                        {identityStats?.rosterCount ?? 0} HS (Lưu tạm thời)
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>
                        👤 Khách tự do:
                      </div>
                      <div style={{ fontWeight: 800, color: UI_COLORS.textMuted }}>
                        {identityStats?.guestCount ?? 0} HS
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: UI_COLORS.textMuted }}>Tổng EXP bảo lưu vĩnh viễn:</span>
                      <strong style={{ color: UI_COLORS.success }}>
                        +{identityStats?.persistedExpTotal ?? 0} EXP
                      </strong>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: UI_COLORS.textMuted }}>EXP tạm cần bảo lưu bằng PIN:</span>
                      <strong style={{ color: '#B45309' }}>
                        +{identityStats?.unpersistedExpTotal ?? 0} EXP
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Cảnh báo học sinh Roster cần cấp PIN */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: UI_RADII.card,
                    padding: '20px',
                    border: `1px solid ${UI_COLORS.border}`,
                  }}
                  data-testid="roster-needing-pin-container"
                >
                  <h4
                    style={{
                      margin: '0 0 14px 0',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: rosterNeedingPin.length > 0 ? '#B45309' : UI_COLORS.success,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{rosterNeedingPin.length > 0 ? '⚠️' : '✅'}</span>
                    <span>
                      HỌC SINH CẦN CẤP / NHẬP MÃ PIN ({rosterNeedingPin.length})
                    </span>
                  </h4>

                  {rosterNeedingPin.length === 0 ? (
                    <div
                      style={{
                        padding: '20px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '12px',
                        color: UI_COLORS.success,
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                      data-testid="roster-pin-empty"
                    >
                      Tuyệt vời! Toàn bộ học sinh tích lũy EXP đều đã có tài khoản bảo lưu an toàn.
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#B45309',
                          marginBottom: '12px',
                          lineHeight: '1.4',
                        }}
                      >
                        Các học sinh dưới đây đã tích lũy EXP nhưng chưa thiết lập hoặc chưa đăng nhập bằng mã PIN. Hãy
                        nhắc các em nhập mã PIN để không mất điểm ở các tiết học sau!
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                        }}
                        data-testid="roster-needing-pin-list"
                      >
                        {rosterNeedingPin.map((st, idx) => (
                          <div
                            key={`${st.studentId || st.displayName}_${idx}`}
                            data-testid={`roster-pin-item-${idx}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              fontSize: '13px',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: UI_COLORS.text }}>{st.displayName}</span>
                            <span style={{ fontWeight: 800, color: '#B45309' }}>+{st.expEarned} EXP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢNG ĐIỂM HỌC SINH */}
          {activeTab === 'scoreboard' && (
            <div data-testid="scoreboard-content">
              {scoreboard.length === 0 ? (
                snapshot.participants.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '32px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: UI_RADII.card,
                      color: UI_COLORS.textMuted,
                    }}
                  >
                    Không có học sinh nào tham gia phiên này.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                    }}
                    data-testid="participants-report-list"
                  >
                    {snapshot.participants.map((p) => (
                      <div
                        key={p.id}
                        data-testid={`report-participant-${p.id}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#F8FAFC',
                          border: `1px solid ${UI_COLORS.border}`,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: UI_COLORS.text }}>{p.displayName}</div>
                          <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                            {p.identityLevel === 'account' && '⭐ Có tài khoản'}
                            {p.identityLevel === 'roster' && '📋 Danh sách lớp'}
                            {p.identityLevel === 'guest' && '👤 Khách tự do'}
                            {p.teamName && ` • Đội: ${p.teamName}`}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                          Vào lúc: {new Date(p.joinedAt).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                  data-testid="scoreboard-list"
                >
                  {scoreboard.map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;

                    return (
                      <div
                        key={item.participantId}
                        data-testid={`scoreboard-row-${item.participantId}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: isTop1
                            ? '#FEF3C7'
                            : isTop2
                            ? '#F1F5F9'
                            : isTop3
                            ? '#FFEDD5'
                            : '#FFFFFF',
                          border: `1px solid ${
                            isTop1
                              ? '#FCD34D'
                              : isTop2
                              ? '#CBD5E1'
                              : isTop3
                              ? '#FDBA74'
                              : UI_COLORS.border
                          }`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '15px',
                              backgroundColor: isTop1
                                ? '#F59E0B'
                                : isTop2
                                ? '#64748B'
                                : isTop3
                                ? '#D97706'
                                : '#E2E8F0',
                              color: '#FFFFFF',
                            }}
                            data-testid={`rank-badge-${item.rank}`}
                          >
                            {item.rank}
                          </div>

                          {/* Avatar học sinh nếu có */}
                          {item.avatar && (
                            <StudentAvatar config={item.avatar} size="sm" showBorder={false} />
                          )}

                          <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: UI_COLORS.text }}>
                              {item.displayName}
                              {isTop1 && ' 👑'}
                            </div>
                            <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                              {item.teamName ? `Đội: ${item.teamName} • ` : ''}
                              Đúng {item.correctCount}/{item.totalQuestions} câu ({item.accuracy}%)
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: UI_COLORS.primary,
                            }}
                          >
                            {item.score.toLocaleString()} điểm
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: UI_COLORS.success,
                            }}
                          >
                            +{item.expEarned} EXP
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CÂU HỎI SAI NHIỀU */}
          {activeTab === 'difficult' && (
            <div data-testid="difficult-questions-content">
              {difficultQuestions.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '32px',
                    backgroundColor: '#F0FDF4',
                    borderRadius: UI_RADII.card,
                    color: UI_COLORS.success,
                    fontWeight: 600,
                  }}
                  data-testid="difficult-empty-state"
                >
                  🎉 Không có câu hỏi nào có tỷ lệ làm sai cao! Học sinh nắm bài rất tốt.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                  data-testid="difficult-questions-list"
                >
                  {difficultQuestions.map((q, idx) => {
                    const isSevere = q.errorRate >= 50;

                    return (
                      <div
                        key={`${q.activityId}_${q.questionId}_${idx}`}
                        data-testid={`difficult-question-row-${q.questionId}`}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          backgroundColor: isSevere ? '#FEF2F2' : '#FFFBEB',
                          border: `1px solid ${isSevere ? '#FCA5A5' : '#FDE68A'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: isSevere ? '#FEE2E2' : '#FEF3C7',
                              color: isSevere ? UI_COLORS.error : '#B45309',
                            }}
                          >
                            {q.activityName} • Câu {idx + 1}
                          </span>

                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: isSevere ? UI_COLORS.error : '#B45309',
                            }}
                            data-testid={`error-rate-${q.questionId}`}
                          >
                            Tỉ lệ sai: {q.errorRate}% ({q.incorrectCount}/{q.totalAttempts} HS)
                          </span>
                        </div>

                        <div style={{ fontSize: '15px', fontWeight: 600, color: UI_COLORS.text }}>{q.stem}</div>

                        {isSevere && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: UI_COLORS.error,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ⚠️ Khuyến nghị: Giáo viên nên giảng lại hoặc cho cả lớp ôn tập kiến thức này.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 4. CHẾ ĐỘ MÀN CHIẾU LỚP HỌC (PROJECTOR PRESENTATION MODE) */}
      {isProjectorMode && (
        <div
          data-testid="projector-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0F172A',
            backgroundImage: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0F172A 70%)',
            color: '#FFFFFF',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '32px 48px',
            overflowY: 'auto',
          }}
        >
          {/* Header Màn chiếu */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#A78BFA',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                EduClass Live • Lễ Vinh Danh Tiết Học
              </div>
              <h1
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                }}
              >
                {snapshot.className
                  ? snapshot.className.toUpperCase()
                  : `PHIÊN HỌC #${snapshot.sessionCode}`}
              </h1>
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsProjectorMode(false)}
              style={{
                minHeight: '48px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              data-testid="btn-exit-projector"
            >
              ✕ Đóng màn chiếu (ESC)
            </Button>
          </div>

          {/* Bục Vinh Danh Phóng To (Mega Podium) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: '32px',
                width: '100%',
                maxWidth: '900px',
              }}
            >
              {/* Rank 2 (Bạc) */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: rank2 ? 1 : 0.3,
                }}
              >
                {rank2 ? (
                  <>
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <StudentAvatar config={rank2.avatar} size="xl" />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          right: '-8px',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#94A3B8',
                          color: '#0F172A',
                          fontWeight: 900,
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px solid #0F172A',
                        }}
                      >
                        2
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#E2E8F0',
                        textAlign: 'center',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rank2.displayName}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                      {rank2.score.toLocaleString()} điểm
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#34D399' }}>
                      +{rank2.expEarned} EXP
                    </div>
                    {/* Bục Cột */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        marginTop: '16px',
                        backgroundColor: '#334155',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        border: '2px solid #64748B',
                        borderBottom: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '44px',
                      }}
                    >
                      🥈
                    </div>
                  </>
                ) : null}
              </div>

              {/* Rank 1 (Vàng - Cao nhất) */}
              <div
                style={{
                  flex: 1.3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translateY(-24px)',
                }}
              >
                {rank1 ? (
                  <>
                    <div style={{ position: 'relative', marginBottom: '14px' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: '-32px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '36px',
                        }}
                      >
                        👑
                      </div>
                      <StudentAvatar config={rank1.avatar} size="2xl" />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-10px',
                          right: '-10px',
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: '#F59E0B',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '4px solid #0F172A',
                          boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)',
                        }}
                      >
                        1
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        color: '#FDE047',
                        textAlign: 'center',
                        maxWidth: '260px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rank1.displayName}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#93C5FD', marginTop: '4px' }}>
                      {rank1.score.toLocaleString()} điểm
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#4ADE80' }}>
                      +{rank1.expEarned} EXP
                    </div>
                    {/* Bục Cột */}
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        marginTop: '16px',
                        backgroundColor: '#78350F',
                        backgroundImage: 'linear-gradient(to bottom, #B45309, #78350F)',
                        borderTopLeftRadius: '20px',
                        borderTopRightRadius: '20px',
                        border: '3px solid #FBBF24',
                        borderBottom: 'none',
                        boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '56px',
                      }}
                    >
                      🥇
                    </div>
                  </>
                ) : null}
              </div>

              {/* Rank 3 (Đồng) */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: rank3 ? 1 : 0.3,
                }}
              >
                {rank3 ? (
                  <>
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <StudentAvatar config={rank3.avatar} size="xl" />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          right: '-8px',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#B45309',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px solid #0F172A',
                        }}
                      >
                        3
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#FED7AA',
                        textAlign: 'center',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rank3.displayName}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                      {rank3.score.toLocaleString()} điểm
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#34D399' }}>
                      +{rank3.expEarned} EXP
                    </div>
                    {/* Bục Cột */}
                    <div
                      style={{
                        width: '100%',
                        height: '110px',
                        marginTop: '16px',
                        backgroundColor: '#431407',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        border: '2px solid #9A3412',
                        borderBottom: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '44px',
                      }}
                    >
                      🥉
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Footer Màn chiếu: Danh hiệu mới & Khích lệ cả lớp */}
          {newTitles.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                overflowX: 'auto',
              }}
            >
              <div style={{ fontWeight: 800, color: '#C4B5FD', fontSize: '16px', whiteSpace: 'nowrap' }}>
                🎖️ Danh hiệu mở khóa:
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'nowrap' }}>
                {newTitles.map((t, idx) => (
                  <div
                    key={`proj_${t.studentId}_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <strong>{t.studentName}</strong>: {t.titleName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
