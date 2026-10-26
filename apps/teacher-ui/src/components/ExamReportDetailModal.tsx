import React, { useEffect, useMemo, useState } from 'react';
import type { ExamDetailDto, ExamRecordDto } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { StudentExamReviewModal } from './StudentExamReviewModal.js';

export interface ExamReportDetailModalProps {
  examId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

type SortField = 'stt' | 'name' | 'batch' | 'status' | 'score' | 'time' | 'submittedAt';
type SortOrder = 'asc' | 'desc';

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

function formatDateTime(ts: number): string {
  if (!ts || ts <= 0) return '—';
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const dd = pad(d.getDate());
  const mo = pad(d.getMonth() + 1);
  return `${hh}:${mm}:${ss} ${dd}/${mo}`;
}

function getGradeClassification(score: number): { label: string; color: string; bg: string } {
  if (score >= 8.0) {
    return { label: 'Tốt (Giỏi)', color: '#166534', bg: '#DCFCE7' };
  }
  if (score >= 6.5) {
    return { label: 'Khá', color: '#1E40AF', bg: '#DBEAFE' };
  }
  if (score >= 5.0) {
    return { label: 'Đạt (TB)', color: '#92400E', bg: '#FEF3C7' };
  }
  return { label: 'Chưa đạt', color: '#991B1B', bg: '#FEE2E2' };
}

export const ExamReportDetailModal: React.FC<ExamReportDetailModalProps> = ({
  examId,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [exam, setExam] = useState<ExamDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('stt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeTab, setActiveTab] = useState<'roster' | 'questions'>('roster');
  const [reviewRecord, setReviewRecord] = useState<ExamRecordDto | null>(null);

  const onShowToastRef = React.useRef(onShowToast);
  onShowToastRef.current = onShowToast;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const fetchDetail = React.useCallback(
    (silent = false) => {
      if (!examId) return;
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      api
        .getExamDetail(examId)
        .then((data) => {
          setExam(data);
        })
        .catch(() => {
          if (!silent) {
            onShowToastRef.current('Không thể tải chi tiết bài thi. Vui lòng thử lại.');
            onCloseRef.current();
          }
        })
        .finally(() => {
          if (!silent) setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [examId]
  );

  useEffect(() => {
    if (!isOpen || !examId) {
      setExam(null);
      return;
    }

    // Nạp lần đầu khi mở modal
    fetchDetail(false);

    // Tự động làm mới dữ liệu ngầm mỗi 5 giây, cập nhật tại chỗ không giật màn hình
    const interval = setInterval(() => {
      fetchDetail(true);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, examId, fetchDetail]);

  // Danh sách các ca thi có trong dữ liệu
  const availableBatches = useMemo(() => {
    if (!exam || !exam.records) return [1];
    const set = new Set<number>();
    for (const r of exam.records) {
      if (r.status !== 'not_started') {
        set.add(r.batchIndex);
      }
    }
    if (set.size === 0) set.add(1);
    return Array.from(set).sort((a, b) => a - b);
  }, [exam]);

  // Điểm tối đa chuẩn của bài thi
  const examMaxScore = useMemo(() => {
    if (exam?.stats?.maxScore) return exam.stats.maxScore;
    if (exam?.questions && exam.questions.length > 0) {
      const sum = exam.questions.reduce((acc, q) => acc + (typeof q['points'] === 'number' ? q['points'] : 1), 0);
      if (sum > 0) return Math.round(sum * 100) / 100;
    }
    if (exam?.records && exam.records.length > 0 && exam.records[0]?.maxScore) {
      return exam.records[0].maxScore;
    }
    return 10;
  }, [exam]);

  // Ngưỡng điểm phân loại động theo thang điểm của bài thi
  const scoreThresholds = useMemo(() => {
    const pTot = Math.round(0.8 * examMaxScore * 10) / 10;
    const pKha = Math.round(0.65 * examMaxScore * 10) / 10;
    const pDat = Math.round(0.5 * examMaxScore * 10) / 10;
    return {
      totLabel: `Giỏi / Tốt (≥ ${pTot})`,
      khaLabel: `Khá (${pKha} – ${Math.round((pTot - 0.1) * 10) / 10})`,
      datLabel: `Đạt (${pDat} – ${Math.round((pKha - 0.1) * 10) / 10})`,
      chuaDatLabel: `Chưa đạt (< ${pDat})`,
    };
  }, [examMaxScore]);

  // Lọc và sắp xếp danh sách bài thi
  const filteredRecords = useMemo(() => {
    if (!exam || !exam.records) return [];
    let list = [...exam.records];

    if (batchFilter !== 'all') {
      const bIndex = parseInt(batchFilter, 10);
      list = list.filter((r) => r.batchIndex === bIndex);
    }

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          (r.studentCode?.toLowerCase().includes(q) ?? false)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.studentName.localeCompare(b.studentName, 'vi');
      } else if (sortField === 'score') {
        cmp = a.score - b.score;
      } else if (sortField === 'batch') {
        cmp = a.batchIndex - b.batchIndex;
      } else if (sortField === 'status') {
        const orderWeight: Record<string, number> = { submitted: 1, in_progress: 2, not_started: 3 };
        cmp = (orderWeight[a.status] ?? 99) - (orderWeight[b.status] ?? 99);
      } else if (sortField === 'time') {
        cmp = a.timeSpentSeconds - b.timeSpentSeconds;
      } else if (sortField === 'submittedAt') {
        cmp = a.submittedAt - b.submittedAt;
      } else {
        // Mặc định sắp xếp theo tên hoặc id
        cmp = a.studentName.localeCompare(b.studentName, 'vi');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [exam, batchFilter, statusFilter, searchStudent, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDownloadExcel = async () => {
    if (!examId) return;
    try {
      onShowToast(`📥 Đang tải bảng điểm Excel "${exam?.title ?? ''}"...`);
      await api.downloadExamExcel(examId, exam?.title);
      onShowToast(`✓ Tải bảng điểm "${exam?.title ?? ''}" thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải file báo cáo Excel';
      onShowToast(`Lỗi: ${msg}`);
    }
  };

  if (!isOpen) return null;

  const totalSubmitted = exam?.records ? exam.records.filter((r) => r.status === 'submitted').length : 0;
  const inProgressCount = exam?.records ? exam.records.filter((r) => r.status === 'in_progress').length : 0;
  const notStartedCount = exam?.records ? exam.records.filter((r) => r.status === 'not_started').length : 0;
  const totalStudents = exam?.totalStudents ?? (exam?.records ? exam.records.length : 0);
  const percentComplete = totalStudents > 0 ? Math.round((totalSubmitted / totalStudents) * 100) : 0;
  const stats = exam?.stats;
  const gradeDist = stats?.gradeDistribution;

  return (
    <>
      <Modal
        isOpen={isOpen}
      maxWidth="1020px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }}>
                {exam ? exam.title : 'Chi tiết kỳ thi'}
              </div>
              {exam && (
                <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, fontWeight: 500, marginTop: '2px' }}>
                  {exam.className ? `Lớp: ${exam.className}` : ''} {exam.subject ? `• Môn: ${exam.subject}` : ''} •
                  Thời gian: {exam.durationMinutes} phút • Ca hiện tại: Ca {exam.currentBatch}
                </div>
              )}
            </div>
          </div>
          {exam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="ghost"
                onClick={() => fetchDetail(true)}
                disabled={isLoading || isRefreshing}
                style={{
                  minHeight: UI_SPACING.minTouchTarget,
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '8px 12px',
                  backgroundColor: '#F1F5F9',
                  borderColor: '#CBD5E1',
                  color: '#334155',
                }}
              >
                {isRefreshing ? '⏳ Đang tải...' : '🔄 Làm mới'}
              </Button>
              <Button
                variant="primary"
                onClick={handleDownloadExcel}
                disabled={totalSubmitted === 0}
                style={{
                  minHeight: UI_SPACING.minTouchTarget,
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📥 Tải bảng điểm Excel
              </Button>
            </div>
          )}
        </div>
      }
      onClose={onClose}
    >
      {isLoading && !exam ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: UI_COLORS.textMuted }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Đang nạp dữ liệu bảng điểm & phổ điểm...</div>
        </div>
      ) : !exam ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: UI_COLORS.textMuted }}>
          Không tìm thấy dữ liệu kỳ thi.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
          {/* 1. Hàng Thẻ Tóm tắt Số liệu */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            {/* Tiến độ nộp bài */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }}>
                ĐÃ NỘP BÀI
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                {totalSubmitted}/{totalStudents}{' '}
                <span style={{ fontSize: '13px', fontWeight: 600 }}>({percentComplete}%)</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '3px',
                  marginTop: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(percentComplete, 100)}%`,
                    height: '100%',
                    backgroundColor: '#16A34A',
                  }}
                />
              </div>
            </div>

            {/* Đang làm bài thi */}
            <div
              style={{
                backgroundColor: inProgressCount > 0 ? '#EFF6FF' : '#F8FAFC',
                border: `1px solid ${inProgressCount > 0 ? '#BFDBFE' : UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: inProgressCount > 0 ? '#1E40AF' : UI_COLORS.textMuted }}>
                ĐANG LÀM BÀI
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: inProgressCount > 0 ? '#2563EB' : UI_COLORS.text, marginTop: '2px' }}>
                {inProgressCount} <span style={{ fontSize: '13px', fontWeight: 600 }}>học sinh</span>
              </div>
              <div style={{ fontSize: '11px', color: inProgressCount > 0 ? '#3B82F6' : UI_COLORS.textMuted, marginTop: '4px' }}>
                {inProgressCount > 0 ? '⚡ Đang làm bài trực tiếp' : 'Không có HS đang thi'}
              </div>
            </div>

            {/* Chưa thi */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }}>
                CHƯA LÀM BÀI
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#64748B', marginTop: '2px' }}>
                {notStartedCount} <span style={{ fontSize: '13px', fontWeight: 600 }}>học sinh</span>
              </div>
              <div style={{ fontSize: '11px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
                Chờ ca sau hoặc vắng
              </div>
            </div>

            {/* Điểm trung bình */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }}>
                ĐIỂM TRUNG BÌNH
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {stats && totalSubmitted > 0 ? `${stats.averageScore} / ${examMaxScore}` : '—'}
              </div>
              <div style={{ fontSize: '11px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
                Thang điểm {examMaxScore}.0
              </div>
            </div>

            {/* Điểm cao nhất */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: UI_RADII.card,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
                ĐIỂM CAO NHẤT
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                {stats && totalSubmitted > 0 ? `${stats.highestScore}` : '—'}
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                🌟 Tốt nhất lớp
              </div>
            </div>

            {/* Điểm thấp nhất */}
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: UI_RADII.card,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B' }}>
                ĐIỂM THẤP NHẤT
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                {stats && totalSubmitted > 0 ? `${stats.lowestScore}` : '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px' }}>
                Cần quan tâm bồi dưỡng
              </div>
            </div>
          </div>

          {/* 2. Biểu đồ Phân bố Phổ điểm (Grade Distribution) */}
          {gradeDist && totalSubmitted > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                padding: '16px 20px',
                boxShadow: UI_SHADOWS.card,
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '12px' }}>
                📈 Phân bố phổ điểm toàn lớp ({totalSubmitted} bài đã nộp)
              </div>

              {/* Thanh phổ điểm ngang (Stacked Bar) */}
              <div
                style={{
                  display: 'flex',
                  height: '14px',
                  borderRadius: '7px',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  backgroundColor: '#E2E8F0',
                }}
              >
                {gradeDist.tot > 0 && (
                  <div
                    title={`Tốt: ${gradeDist.tot} HS`}
                    style={{
                      width: `${(gradeDist.tot / totalSubmitted) * 100}%`,
                      backgroundColor: '#16A34A',
                    }}
                  />
                )}
                {gradeDist.kha > 0 && (
                  <div
                    title={`Khá: ${gradeDist.kha} HS`}
                    style={{
                      width: `${(gradeDist.kha / totalSubmitted) * 100}%`,
                      backgroundColor: '#2563EB',
                    }}
                  />
                )}
                {gradeDist.dat > 0 && (
                  <div
                    title={`Đạt: ${gradeDist.dat} HS`}
                    style={{
                      width: `${(gradeDist.dat / totalSubmitted) * 100}%`,
                      backgroundColor: '#F59E0B',
                    }}
                  />
                )}
                {gradeDist.chuaDat > 0 && (
                  <div
                    title={`Chưa đạt: ${gradeDist.chuaDat} HS`}
                    style={{
                      width: `${(gradeDist.chuaDat / totalSubmitted) * 100}%`,
                      backgroundColor: '#DC2626',
                    }}
                  />
                )}
              </div>

              {/* 4 Nhóm xếp loại */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#16A34A',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                      {scoreThresholds.totLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                    {gradeDist.tot}{' '}
                    <small style={{ fontWeight: 500, fontSize: '11px' }}>
                      ({Math.round((gradeDist.tot / totalSubmitted) * 100)}%)
                    </small>
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#2563EB',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                      {scoreThresholds.khaLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF' }}>
                    {gradeDist.kha}{' '}
                    <small style={{ fontWeight: 500, fontSize: '11px' }}>
                      ({Math.round((gradeDist.kha / totalSubmitted) * 100)}%)
                    </small>
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                      {scoreThresholds.datLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                    {gradeDist.dat}{' '}
                    <small style={{ fontWeight: 500, fontSize: '11px' }}>
                      ({Math.round((gradeDist.dat / totalSubmitted) * 100)}%)
                    </small>
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#DC2626',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                      {scoreThresholds.chuaDatLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>
                    {gradeDist.chuaDat}{' '}
                    <small style={{ fontWeight: 500, fontSize: '11px' }}>
                      ({Math.round((gradeDist.chuaDat / totalSubmitted) * 100)}%)
                    </small>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Chuyển đổi xem: Bảng điểm danh sách lớp vs Phân tích câu hỏi */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${UI_COLORS.border}`, paddingBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'roster' ? UI_COLORS.primary : 'transparent',
                color: activeTab === 'roster' ? '#FFFFFF' : UI_COLORS.textMuted,
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              📋 Bảng điểm học sinh ({filteredRecords.length})
            </button>
            {stats?.questionAnalysis && stats.questionAnalysis.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'questions' ? UI_COLORS.primary : 'transparent',
                  color: activeTab === 'questions' ? '#FFFFFF' : UI_COLORS.textMuted,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🔍 Phân tích độ đúng từng câu ({stats.questionAnalysis.length} câu)
              </button>
            )}
          </div>

          {activeTab === 'roster' && (
            <>
              {/* Thanh lọc & tìm kiếm học sinh */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Lọc theo Ca thi */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: UI_COLORS.textMuted }}>
                      Ca thi:
                    </span>
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: UI_RADII.input,
                        border: `1px solid ${UI_COLORS.border}`,
                        fontSize: '13px',
                        color: UI_COLORS.text,
                        minHeight: '36px',
                      }}
                    >
                      <option value="all">Tất cả các ca</option>
                      {availableBatches.map((b) => (
                        <option key={b} value={b.toString()}>
                          Ca {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lọc theo Trạng thái */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: UI_COLORS.textMuted }}>
                      Trạng thái:
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: UI_RADII.input,
                        border: `1px solid ${UI_COLORS.border}`,
                        fontSize: '13px',
                        color: UI_COLORS.text,
                        minHeight: '36px',
                      }}
                    >
                      <option value="all">Tất cả ({exam.records.length})</option>
                      <option value="submitted">✓ Đã nộp bài ({totalSubmitted})</option>
                      <option value="in_progress">⏳ Đang làm bài ({inProgressCount})</option>
                      <option value="not_started">⚪ Chưa thi ({notStartedCount})</option>
                    </select>
                  </div>
                </div>

                {/* Tìm kiếm học sinh */}
                <div style={{ minWidth: '220px', flex: '0 1 300px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Tìm theo tên hoặc mã HS..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '6px 12px',
                      borderRadius: UI_RADII.input,
                      border: `1px solid ${UI_COLORS.border}`,
                      fontSize: '13px',
                      minHeight: '36px',
                    }}
                  />
                </div>
              </div>

              {/* Bảng điểm chi tiết */}
              {filteredRecords.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 16px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    color: UI_COLORS.textMuted,
                  }}
                >
                  {exam.records.length === 0
                    ? 'Chưa có học sinh nào nộp bài thi.'
                    : 'Không tìm thấy học sinh phù hợp với bộ lọc.'}
                </div>
              ) : (
                <div
                  style={{
                    overflowX: 'auto',
                    border: `1px solid ${UI_COLORS.border}`,
                    borderRadius: UI_RADII.card,
                    maxHeight: '440px',
                    overflowY: 'auto',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderBottom: `2px solid ${UI_COLORS.border}`,
                          color: '#334155',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                        }}
                      >
                        <th
                          style={{ padding: '10px 12px', width: '48px', cursor: 'pointer' }}
                          onClick={() => handleSort('stt')}
                        >
                          STT {sortField === 'stt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th
                          style={{ padding: '10px 12px', cursor: 'pointer' }}
                          onClick={() => handleSort('name')}
                        >
                          Họ và tên {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th
                          style={{ padding: '10px 12px', width: '80px', cursor: 'pointer' }}
                          onClick={() => handleSort('batch')}
                        >
                          Ca thi {sortField === 'batch' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th
                          style={{ padding: '10px 12px', width: '130px', cursor: 'pointer' }}
                          onClick={() => handleSort('status')}
                        >
                          Trạng thái {sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ padding: '10px 12px', width: '100px' }}>Số câu đúng</th>
                        <th
                          style={{ padding: '10px 12px', width: '90px', cursor: 'pointer' }}
                          onClick={() => handleSort('score')}
                        >
                          Điểm số {sortField === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ padding: '10px 12px', width: '110px' }}>Xếp loại</th>
                        <th
                          style={{ padding: '10px 12px', width: '110px', cursor: 'pointer' }}
                          onClick={() => handleSort('time')}
                        >
                          Làm bài {sortField === 'time' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th
                          style={{ padding: '10px 12px', width: '140px', cursor: 'pointer' }}
                          onClick={() => handleSort('submittedAt')}
                        >
                          Nộp lúc {sortField === 'submittedAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center' }}>
                          Bài làm
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r, index) => {
                        const isSubmitted = r.status === 'submitted';
                        const isInProgress = r.status === 'in_progress';
                        const isNotStarted = r.status === 'not_started';
                        const grade = getGradeClassification(r.score);

                        return (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: `1px solid ${UI_COLORS.border}`,
                              backgroundColor: isInProgress
                                ? '#F0F9FF'
                                : index % 2 === 0
                                ? '#FFFFFF'
                                : '#F8FAFC',
                              cursor: isSubmitted || isInProgress ? 'pointer' : 'default',
                            }}
                            onClick={() => (isSubmitted || isInProgress) && setReviewRecord(r)}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: UI_COLORS.textMuted }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: isSubmitted ? '#1D4ED8' : UI_COLORS.text, textDecoration: isSubmitted ? 'underline' : 'none' }}>
                                {r.studentName}
                              </div>
                              {r.studentCode && (
                                <div style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                                  Mã: {r.studentCode}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {isNotStarted ? (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1E40AF',
                                    border: '1px solid #BFDBFE',
                                  }}
                                >
                                  Ca {r.batchIndex}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {isSubmitted ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#DCFCE7',
                                    color: '#166534',
                                    border: '1px solid #BBF7D0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  ✓ Đã nộp bài
                                </span>
                              ) : isInProgress ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E',
                                    border: '1px solid #FDE68A',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  ⏳ Đang làm bài
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#64748B',
                                    border: '1px solid #E2E8F0',
                                  }}
                                >
                                  ⚪ Chưa thi
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: UI_COLORS.text }}>
                              {isSubmitted ? (
                                <>
                                  <strong>{r.correctCount}</strong> / {r.totalQuestions}{' '}
                                  <span style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                                    ({r.percentage}%)
                                  </span>
                                </>
                              ) : isInProgress ? (
                                <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: 600 }}>
                                  {r.correctCount > 0 ? `${r.correctCount}/${r.totalQuestions}` : 'Đang làm...'}
                                </span>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {isSubmitted ? (
                                <span
                                  style={{
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    color: r.score >= 5 ? '#15803D' : '#DC2626',
                                  }}
                                >
                                  {r.score}
                                </span>
                              ) : isInProgress ? (
                                <span style={{ color: '#D97706', fontSize: '12px', fontWeight: 700 }}>
                                  Đang chấm
                                </span>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {isSubmitted ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: grade.bg,
                                    color: grade.color,
                                  }}
                                >
                                  {grade.label}
                                </span>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {isSubmitted || (isInProgress && r.timeSpentSeconds > 0) ? (
                                <>⏱️ {formatSeconds(r.timeSpentSeconds)}</>
                              ) : isInProgress ? (
                                <span style={{ fontSize: '12px', color: '#2563EB' }}>Vừa vào</span>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748B', fontSize: '12px' }}>
                              {isSubmitted ? (
                                formatDateTime(r.submittedAt)
                              ) : isInProgress ? (
                                <span style={{ color: '#D97706', fontWeight: 600 }}>Đang thi...</span>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {isSubmitted ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewRecord(r);
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #BFDBFE',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  }}
                                  title="Nhấn để xem trực tiếp các câu hỏi và đáp án học sinh đã chọn"
                                >
                                  👁️ Xem bài
                                </button>
                              ) : isInProgress ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewRecord(r);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #FDE68A',
                                    backgroundColor: '#FFFBEB',
                                    color: '#B45309',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Xem các câu học sinh đã trả lời"
                                >
                                  👁️ Xem dở
                                </button>
                              ) : (
                                <span style={{ color: UI_COLORS.textMuted, fontSize: '11px' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'questions' && stats?.questionAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: UI_COLORS.textMuted }}>
                Thống kê tỉ lệ trả lời đúng theo từng câu hỏi trong đề thi. Màu đỏ/cam biểu thị câu hỏi có tỉ lệ sai
                cao cần chú ý ôn tập.
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                {stats.questionAnalysis.map((q) => {
                  let barColor = '#16A34A';
                  if (q.correctRatio < 50) barColor = '#DC2626';
                  else if (q.correctRatio < 70) barColor = '#F59E0B';

                  return (
                    <div
                      key={q.questionId}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '14px', color: UI_COLORS.text }}>
                          Câu {q.order}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: barColor }}>
                          {q.correctRatio}%
                        </span>
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: `${q.correctRatio}%`,
                            height: '100%',
                            backgroundColor: barColor,
                          }}
                        />
                      </div>

                      <div style={{ fontSize: '11px', color: UI_COLORS.textMuted }}>
                        Đúng: <strong>{q.correctCount}</strong> / {q.totalAnswered} lượt
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>

    {/* Modal Xem Trực Tiếp Chi Tiết Bài Làm & Lựa Chọn Của Học Sinh */}
    <StudentExamReviewModal
      isOpen={Boolean(reviewRecord)}
      onClose={() => setReviewRecord(null)}
      record={reviewRecord}
      questions={exam?.questions || []}
      className={exam?.className}
      examTitle={exam?.title}
    />
  </>
  );
};
