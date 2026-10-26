import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  QuizSummaryReport,
  SessionDetailResponse,
  SessionReportDto,
  SessionReportListItem,
  SessionReportSnapshot,
  SessionStudentScoreItem,
} from '@educlass/protocol';
import { Button, Card, UI_COLORS, UI_RADII, UI_SHADOWS } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { SessionReportView } from './SessionReportView.js';

export interface SessionReportsTabProps {
  activeSession?: SessionDetailResponse | null | undefined;
  currentSessionReport?: SessionReportDto | null | undefined;
  onNewSession?: (() => void) | undefined;
  onExportExcel?: ((sessionId: string) => void) | undefined;
}

export interface QuizReportEntry {
  key: string;
  type: 'quiz_run' | 'session_total';
  sessionId: string;
  sessionCode: string;
  className: string;
  runId?: string | undefined;
  runIndex?: number | undefined;
  title: string;
  timeStr: string;
  timestamp: number;
  totalParticipants: number;
  averageScore: number;
  averageAccuracy: number;
  totalQuestions: number;
  scoreboard: SessionStudentScoreItem[];
  isActive?: boolean | undefined;
  snapshot?: SessionReportSnapshot | undefined;
}

function getSessionId(sessionData: SessionDetailResponse | null | undefined): string {
  if (!sessionData) return '';
  if (sessionData.session?.id) return sessionData.session.id;
  const raw = sessionData as unknown as { id?: string };
  return raw.id ?? '';
}

function formatDateTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTimeOnly(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SessionReportsTab: React.FC<SessionReportsTabProps> = ({
  activeSession,
  currentSessionReport,
  onNewSession,
  onExportExcel,
}) => {
  const [reports, setReports] = useState<SessionReportListItem[]>([]);
  const [activeQuizRuns, setActiveQuizRuns] = useState<QuizSummaryReport[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'quiz_table' | 'full_report'>('quiz_table');

  const activeSessionId = getSessionId(activeSession);

  // 1. Tải danh sách báo cáo lịch sử và toàn bộ các lần thi Quizizz trong phiên hiện tại
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, activeRuns] = await Promise.all([
        api.getSessionReports(),
        activeSessionId ? api.getQuizRuns(activeSessionId) : Promise.resolve([]),
      ]);

      setReports(list);
      setActiveQuizRuns(activeRuns);

      // Tự động chọn mục đầu tiên nếu chưa chọn
      setSelectedKey((prevKey) => {
        if (prevKey) return prevKey;
        if (activeRuns.length > 0) {
          const lastActive = activeRuns[activeRuns.length - 1];
          return `active_${lastActive?.runId || 'last'}`;
        }
        if (list.length > 0 && list[0]) {
          const firstReport = list[0];
          if (firstReport.quizRuns && firstReport.quizRuns.length > 0) {
            return `${firstReport.id}_${firstReport.quizRuns[firstReport.quizRuns.length - 1]?.runId}`;
          }
          return firstReport.id;
        }
        return null;
      });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Cập nhật khi nhận report mới
  useEffect(() => {
    if (currentSessionReport) {
      void loadData();
    }
  }, [currentSessionReport, loadData]);

  // 2. Phẳng hóa toàn bộ các lần thi Quizizz thành danh sách có thể chọn riêng biệt
  const allEntries: QuizReportEntry[] = useMemo(() => {
    const entries: QuizReportEntry[] = [];

    // A. Các lần thi Quizizz trong phiên hiện tại đang mở
    if (activeSession && activeQuizRuns.length > 0) {
      activeQuizRuns.forEach((run, idx) => {
        entries.push({
          key: `active_${run.runId || idx}`,
          type: 'quiz_run',
          sessionId: activeSessionId,
          sessionCode: activeSession.session?.joinCode || '',
          className: activeSession.className || 'Tiết học hiện tại',
          runId: run.runId,
          runIndex: run.runIndex ?? (idx + 1),
          title: run.title || `Quizizz Lần ${idx + 1}`,
          timeStr: run.endedAt ? formatTimeOnly(run.endedAt) : (run.startedAt ? formatTimeOnly(run.startedAt) : 'Vừa xong'),
          timestamp: run.endedAt ?? run.startedAt ?? Date.now(),
          totalParticipants: run.totalParticipants,
          averageScore: run.averageScore,
          averageAccuracy: run.averageAccuracy,
          totalQuestions: run.totalQuestions,
          scoreboard: run.scoreboard,
          isActive: true,
        });
      });
    }

    // B. Các lần thi Quizizz trong các phiên đã đóng trong CSDL
    reports.forEach((r) => {
      const qRuns = r.quizRuns || [];

      if (qRuns.length > 0) {
        // Từng lần thi riêng biệt
        qRuns.forEach((run, idx) => {
          entries.push({
            key: `${r.id}_${run.runId || idx}`,
            type: 'quiz_run',
            sessionId: r.sessionId,
            sessionCode: r.sessionCode,
            className: r.className || 'Phiên học',
            runId: run.runId,
            runIndex: run.runIndex ?? (idx + 1),
            title: run.title || `Quizizz Lần ${idx + 1}`,
            timeStr: run.endedAt ? formatDateTime(run.endedAt) : formatDateTime(r.createdAt),
            timestamp: run.endedAt ?? r.createdAt,
            totalParticipants: run.totalParticipants,
            averageScore: run.averageScore,
            averageAccuracy: run.averageAccuracy,
            totalQuestions: run.totalQuestions,
            scoreboard: run.scoreboard,
            isActive: false,
          });
        });

        // Nếu có từ 2 lần thi trở lên trong phiên, thêm 1 mục Tổng hợp toàn phiên
        if (qRuns.length >= 2) {
          entries.push({
            key: `${r.id}_total`,
            type: 'session_total',
            sessionId: r.sessionId,
            sessionCode: r.sessionCode,
            className: r.className || 'Phiên học',
            title: `📊 Tổng kết cả phiên (${qRuns.length} lần thi)`,
            timeStr: formatDateTime(r.createdAt),
            timestamp: r.createdAt,
            totalParticipants: r.totalParticipants,
            averageScore: r.summary?.averageScore ?? 0,
            averageAccuracy: r.summary?.averageAccuracy ?? 0,
            totalQuestions: r.summary?.totalQuestions ?? 0,
            scoreboard: r.scoreboard,
            isActive: false,
            snapshot: r.snapshot,
          });
        }
      } else {
        // Phiên cũ chỉ có 1 snapshot tổng hợp
        entries.push({
          key: r.id,
          type: 'quiz_run',
          sessionId: r.sessionId,
          sessionCode: r.sessionCode,
          className: r.className || 'Phiên học',
          title: r.quizTitle || 'Quizizz Live',
          timeStr: formatDateTime(r.createdAt),
          timestamp: r.createdAt,
          totalParticipants: r.totalParticipants,
          averageScore: r.summary?.averageScore ?? 0,
          averageAccuracy: r.summary?.averageAccuracy ?? 0,
          totalQuestions: r.summary?.totalQuestions ?? 0,
          scoreboard: r.scoreboard,
          isActive: false,
          snapshot: r.snapshot,
        });
      }
    });

    return entries;
  }, [activeSession, activeSessionId, activeQuizRuns, reports]);

  // Lọc theo từ khóa tìm kiếm
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return allEntries;
    const q = searchQuery.toLowerCase();
    return allEntries.filter((item) => {
      const title = item.title.toLowerCase();
      const code = item.sessionCode.toLowerCase();
      const cls = item.className.toLowerCase();
      return title.includes(q) || code.includes(q) || cls.includes(q);
    });
  }, [allEntries, searchQuery]);

  // Mục báo cáo đang được chọn để hiển thị
  const selectedEntry = useMemo(() => {
    if (!selectedKey) return allEntries[0] || null;
    return allEntries.find((e) => e.key === selectedKey) || allEntries[0] || null;
  }, [allEntries, selectedKey]);

  // Xử lý xuất Excel cho lần thi đang chọn
  const handleExport = (entry: QuizReportEntry) => {
    if (entry.type === 'quiz_run' && entry.runId) {
      window.open(`/api/sessions/${entry.sessionId}/quiz-runs/${entry.runId}/export-excel`, '_blank');
      return;
    }
    if (onExportExcel) {
      onExportExcel(entry.sessionId);
    } else {
      window.open(`/api/sessions/${entry.sessionId}/export-excel`, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Tab Báo Cáo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: UI_RADII.card,
          boxShadow: UI_SHADOWS.card,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: UI_COLORS.text }}>
            📊 Báo Cáo & Tổng Kết Quizizz
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: UI_COLORS.textMuted }}>
            Lưu trữ chi tiết từng lần thi Quizizz trong phiên, bảo toàn bảng xếp hạng, điểm số và tỉ lệ chính xác.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            {isLoading ? 'Đang nạp...' : '🔄 Làm mới'}
          </Button>

          {selectedEntry && (
            <Button
              variant="primary"
              onClick={() => handleExport(selectedEntry)}
            >
              📥 Xuất file Excel lần thi này
            </Button>
          )}
        </div>
      </div>

      {/* 2. Bố cục 2 cột: Danh sách từng lần thi bên trái + Bảng tổng kết bên phải */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Cột trái: Danh sách từng lần thi Quizizz */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card>
            <div style={{ padding: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: UI_COLORS.text }}>
                  🎯 Danh sách các lần thi ({allEntries.length})
                </span>
                {activeQuizRuns.length > 1 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    Tiết này: {activeQuizRuns.length} lần thi
                  </span>
                )}
              </div>

              {/* Ô tìm kiếm */}
              <input
                type="text"
                placeholder="Tìm theo tên bài, mã phòng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${UI_COLORS.border}`,
                  fontSize: '13px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />

              {/* Danh sách các lần thi */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '560px',
                  overflowY: 'auto',
                }}
              >
                {filteredEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 8px', color: UI_COLORS.textMuted, fontSize: '13px' }}>
                    Chưa có lần thi Quizizz nào được lưu trữ.
                  </div>
                ) : (
                  filteredEntries.map((item) => {
                    const isSelected = selectedKey === item.key;
                    const isTotal = item.type === 'session_total';

                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          setSelectedKey(item.key);
                          setViewMode(isTotal ? 'full_report' : 'quiz_table');
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          border: isSelected
                            ? `2px solid ${item.isActive ? UI_COLORS.success : UI_COLORS.primary}`
                            : `1px solid ${UI_COLORS.border}`,
                          backgroundColor: isSelected
                            ? (item.isActive ? '#ECFDF5' : '#EFF6FF')
                            : (item.isActive ? '#F0FDF4' : isTotal ? '#F8FAFC' : '#FFFFFF'),
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {item.isActive ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  backgroundColor: '#10B981',
                                  color: '#FFFFFF',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                {item.runIndex ? `LẦN ${item.runIndex} (TIẾT NÀY)` : 'TIẾT NÀY'}
                              </span>
                            ) : item.runIndex ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: '#E2E8F0',
                                  color: '#475569',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                Lần {item.runIndex}
                              </span>
                            ) : null}

                            <span style={{ fontWeight: 700, fontSize: '12px', color: UI_COLORS.primary }}>
                              Mã: {item.sessionCode}
                            </span>
                          </div>

                          <span style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                            {item.timeStr}
                          </span>
                        </div>

                        <div
                          style={{
                            fontWeight: isTotal ? 700 : 600,
                            fontSize: '14px',
                            color: item.isActive ? '#065F46' : UI_COLORS.text,
                            marginTop: '6px',
                          }}
                        >
                          {item.title}
                        </div>

                        <div style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '3px' }}>
                          {item.className ? `${item.className} • ` : ''}
                          👥 {item.totalParticipants} học sinh • 🎯 ĐTB: {item.averageScore.toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Cột phải: Bảng Báo Cáo Tổng Kết Chi Tiết Của Lần Thi Đang Chọn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!selectedEntry ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 20px', color: UI_COLORS.textMuted }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: UI_COLORS.text }}>
                  Chưa có dữ liệu bài thi Quizizz
                </p>
                <p style={{ fontSize: '14px', maxWidth: '440px', margin: '8px auto 20px' }}>
                  Khi học sinh hoàn thành bất kỳ lần thi Quizizz nào trong tiết học, kết quả từng lần sẽ tự động được lưu và hiển thị riêng biệt tại đây.
                </p>
                {onNewSession && (
                  <Button variant="primary" onClick={onNewSession}>
                    Bắt đầu phiên học ngay
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {/* Thẻ Header Chi Tiết Lần Thi */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: UI_COLORS.text }}>
                        {selectedEntry.title}
                      </h3>
                      {selectedEntry.isActive && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            padding: '3px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          {selectedEntry.runIndex ? `Lần thi ${selectedEntry.runIndex} (Tiết này)` : 'Vừa làm xong'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
                      Mã phòng: <strong>{selectedEntry.sessionCode}</strong> • Lớp: <strong>{selectedEntry.className}</strong> • Thời gian: {selectedEntry.timeStr}
                    </div>
                  </div>

                  {/* Chuyển chế độ xem nếu có snapshot đầy đủ */}
                  {selectedEntry.snapshot && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant={viewMode === 'quiz_table' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('quiz_table')}
                      >
                        📋 Bảng điểm
                      </Button>
                      <Button
                        variant={viewMode === 'full_report' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('full_report')}
                      >
                        🏆 Vinh danh & Câu khó
                      </Button>
                    </div>
                  )}
                </div>

                {/* 4 thẻ chỉ số nhanh của LẦN THI NÀY */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${UI_COLORS.border}`,
                  }}
                >
                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>Số học sinh dự thi</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: UI_COLORS.primary, marginTop: '2px' }}>
                      {selectedEntry.totalParticipants}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>Điểm trung bình</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: UI_COLORS.text, marginTop: '2px' }}>
                      {selectedEntry.averageScore.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>Tỉ lệ đúng TB</div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: selectedEntry.averageAccuracy >= 70 ? UI_COLORS.success : UI_COLORS.warning,
                        marginTop: '2px',
                      }}
                    >
                      {selectedEntry.averageAccuracy}%
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>Tổng số câu</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: UI_COLORS.text, marginTop: '2px' }}>
                      {selectedEntry.totalQuestions > 0 ? selectedEntry.totalQuestions : (selectedEntry.scoreboard[0]?.totalQuestions || '—')}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chế độ xem Full Report nếu là phiên tổng kết */}
              {viewMode === 'full_report' && selectedEntry.snapshot && (
                <SessionReportView
                  report={{
                    id: selectedEntry.key,
                    sessionId: selectedEntry.sessionId,
                    snapshot: selectedEntry.snapshot,
                    createdAt: selectedEntry.timestamp,
                  }}
                  onExportExcel={() => handleExport(selectedEntry)}
                  onNewSession={onNewSession}
                />
              )}

              {/* Chế độ xem: BẢNG TỔNG KẾT QUIZIZZ CỦA LẦN THI ĐANG CHỌN (Họ tên, Điểm số, Tỉ lệ đúng, Vị thứ) */}
              {viewMode === 'quiz_table' && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: UI_COLORS.text }}>
                      📋 Bảng Điểm Chi Tiết ({selectedEntry.scoreboard.length} học sinh)
                    </div>
                    <div style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                      {selectedEntry.runIndex ? `Kết quả của Lần thi số ${selectedEntry.runIndex}` : 'Kết quả bài thi'}
                    </div>
                  </div>

                  {selectedEntry.scoreboard.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px', color: UI_COLORS.textMuted, backgroundColor: '#F8FAFC', borderRadius: '10px' }}>
                      Không có dữ liệu bài làm của học sinh trong lần thi này.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          textAlign: 'left',
                          fontSize: '14px',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: '#F1F5F9',
                              borderBottom: `2px solid ${UI_COLORS.border}`,
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '13px',
                            }}
                          >
                            <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>VỊ THỨ</th>
                            <th style={{ padding: '12px 14px' }}>HỌ VÀ TÊN</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', width: '150px' }}>ĐIỂM SỐ</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', width: '220px' }}>TỈ LỆ ĐÚNG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntry.scoreboard.map((item) => {
                            const isTop1 = item.rank === 1;
                            const isTop2 = item.rank === 2;
                            const isTop3 = item.rank === 3;

                            return (
                              <tr
                                key={item.participantId}
                                style={{
                                  borderBottom: `1px solid ${UI_COLORS.border}`,
                                  backgroundColor: isTop1
                                    ? '#FEFCE8'
                                    : isTop2
                                    ? '#F8FAFC'
                                    : isTop3
                                    ? '#FFF7ED'
                                    : '#FFFFFF',
                                  transition: 'background-color 0.15s ease',
                                }}
                              >
                                {/* 1. VỊ THỨ */}
                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      fontWeight: 800,
                                      fontSize: '15px',
                                      backgroundColor: isTop1
                                        ? '#F59E0B'
                                        : isTop2
                                        ? '#64748B'
                                        : isTop3
                                        ? '#D97706'
                                        : '#E2E8F0',
                                      color: isTop1 || isTop2 || isTop3 ? '#FFFFFF' : '#334155',
                                      boxShadow: isTop1 ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none',
                                    }}
                                  >
                                    {isTop1 ? '👑 1' : isTop2 ? '🥈 2' : isTop3 ? '🥉 3' : item.rank}
                                  </div>
                                </td>

                                {/* 2. HỌ VÀ TÊN */}
                                <td style={{ padding: '14px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 700, fontSize: '15px', color: UI_COLORS.text }}>
                                      {item.displayName}
                                    </span>
                                    <span style={{ fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
                                      {item.identityLevel === 'account' && '⭐ Có tài khoản'}
                                      {item.identityLevel === 'roster' && '📋 Danh sách lớp'}
                                      {item.identityLevel === 'guest' && '👤 Khách tự do'}
                                      {item.teamName && ` • Đội: ${item.teamName}`}
                                    </span>
                                  </div>
                                </td>

                                {/* 3. ĐIỂM SỐ */}
                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                  <div
                                    style={{
                                      fontSize: '17px',
                                      fontWeight: 800,
                                      color: isTop1 ? '#D97706' : UI_COLORS.primary,
                                    }}
                                  >
                                    {item.score.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 600 }}>điểm</span>
                                  </div>
                                  {item.expEarned > 0 && (
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: UI_COLORS.success }}>
                                      +{item.expEarned} EXP
                                    </div>
                                  )}
                                </td>

                                {/* 4. TỈ LỆ ĐÚNG */}
                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span
                                        style={{
                                          fontWeight: 800,
                                          fontSize: '15px',
                                          color: item.accuracy >= 70
                                            ? UI_COLORS.success
                                            : item.accuracy >= 50
                                            ? '#F59E0B'
                                            : UI_COLORS.error,
                                        }}
                                      >
                                        {item.accuracy}%
                                      </span>
                                      <span style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                                        (Đúng {item.correctCount}/{item.totalQuestions} câu)
                                      </span>
                                    </div>

                                    {/* Thanh tiến trình tỉ lệ đúng mini */}
                                    <div
                                      style={{
                                        width: '120px',
                                        height: '6px',
                                        backgroundColor: '#E2E8F0',
                                        borderRadius: '3px',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(100, Math.max(0, item.accuracy))}%`,
                                          height: '100%',
                                          backgroundColor: item.accuracy >= 70
                                            ? UI_COLORS.success
                                            : item.accuracy >= 50
                                            ? '#F59E0B'
                                            : UI_COLORS.error,
                                          borderRadius: '3px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
