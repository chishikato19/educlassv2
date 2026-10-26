import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ClassDto,
  ExamListItemDto,
  SessionDetailResponse,
} from '@educlass/protocol';
import { Button, Card, Modal, UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { ExamReportDetailModal } from './ExamReportDetailModal.js';
import { CreateExamModal } from './CreateExamModal.js';
import { EditExamModal } from './EditExamModal.js';
import { CloneExamModal } from './CloneExamModal.js';
import { MoveExamModal } from './MoveExamModal.js';
import { CreateFolderModal } from './CreateFolderModal.js';
import {
  getAllExamFolders,
  getBreadcrumbs,
  getImmediateSubFolders,
  countExamsInFolder,
  normalizeFolderPath,
} from '../utils/exam-folders.js';

export interface ExamReportsTabProps {
  classes: ClassDto[];
  activeSession: SessionDetailResponse | null;
  onShowToast: (message: string) => void;
  onViewDetails?: (examId: string) => void;
  onCreateExam?: () => void;
  onSessionCreatedAndStartExam?: (session: SessionDetailResponse) => void | Promise<void>;
  onSwitchToSessionTab?: () => void;
}

type StatusFilter = 'all' | 'in_progress' | 'waiting_next_batch' | 'ready' | 'finished';

function getSessionId(sessionData: SessionDetailResponse | null | undefined): string {
  if (!sessionData) return '';
  if (sessionData.session?.id) return sessionData.session.id;
  const raw = sessionData as unknown as { id?: string };
  return raw.id ?? '';
}

function getSessionJoinCode(sessionData: SessionDetailResponse | null | undefined): string {
  if (!sessionData) return '';
  if (sessionData.session?.joinCode) return sessionData.session.joinCode;
  const raw = sessionData as unknown as { joinCode?: string };
  return raw.joinCode ?? '';
}

export const ExamReportsTab: React.FC<ExamReportsTabProps> = ({
  classes,
  activeSession,
  onShowToast,
  onViewDetails,
  onCreateExam,
  onSessionCreatedAndStartExam,
  onSwitchToSessionTab,
}) => {
  const [exams, setExams] = useState<ExamListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog xác nhận hành động
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'start_batch' | 'pause_batch' | 'finish' | 'delete' | null;
    exam: ExamListItemDto | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    type: null,
    exam: null,
    isSubmitting: false,
  });

  // Modal xem báo cáo & bảng điểm chi tiết
  const [detailModalExamId, setDetailModalExamId] = useState<string | null>(null);

  // Modal tạo kỳ thi mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal chỉnh sửa & sao chép kỳ thi
  const [editingExam, setEditingExam] = useState<ExamListItemDto | null>(null);
  const [cloningExam, setCloningExam] = useState<ExamListItemDto | null>(null);

  // Quản lý & Di chuyển Thư mục đa cấp
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
  const [movingExam, setMovingExam] = useState<ExamListItemDto | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [folderModalParentPath, setFolderModalParentPath] = useState('');

  // Danh sách toàn bộ các thư mục (gộp từ exams và localStorage)
  const allFolders = useMemo(() => {
    return getAllExamFolders(exams);
  }, [exams]);

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbs(currentFolderPath);
  }, [currentFolderPath]);

  const subFolders = useMemo(() => {
    return getImmediateSubFolders(currentFolderPath, allFolders);
  }, [currentFolderPath, allFolders]);

  const activeSessionId = useMemo(() => getSessionId(activeSession), [activeSession]);
  const activeSessionCode = useMemo(() => getSessionJoinCode(activeSession), [activeSession]);

  // Nạp danh sách kỳ thi
  const loadExams = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const list = await api.getExams({
        classId: selectedClassId !== 'all' ? selectedClassId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setExams(list);
    } catch {
      if (!silent) onShowToast('Không thể tải danh sách kỳ thi. Vui lòng thử lại.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [selectedClassId, statusFilter, onShowToast]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  // Tự động làm mới danh sách kỳ thi định kỳ để cập nhật tiến độ nộp bài trực tiếp (Vấn đề 4)
  useEffect(() => {
    const hasActiveExam = exams.some((e) => e.status === 'in_progress');
    const intervalTime = hasActiveExam ? 4000 : 10000;
    const interval = setInterval(() => {
      void loadExams(true);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [exams, loadExams]);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalExamId(null);
  }, []);

  // Lọc tìm kiếm theo tên đề thi, môn, thư mục và vị trí cây thư mục hiện tại
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const eNormFolder = normalizeFolderPath(e.folder);

      // 1. Nếu người dùng chọn lọc theo dropdown Thư mục cụ thể:
      if (selectedFolder !== 'all') {
        if (selectedFolder === '__none__') {
          if (eNormFolder) return false;
        } else if (eNormFolder !== normalizeFolderPath(selectedFolder)) {
          return false;
        }
      } else if (!searchQuery.trim()) {
        // 2. Khi đang duyệt theo Breadcrumb (và không có từ khóa tìm kiếm):
        if (!currentFolderPath) {
          // Thư mục gốc: chỉ hiển thị các đề thi ở thư mục gốc (chưa phân loại)
          if (eNormFolder) return false;
        } else {
          // Thư mục con: chỉ hiển thị các đề thi thuộc thư mục này
          if (eNormFolder !== currentFolderPath) return false;
        }
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchSubject = e.subject?.toLowerCase().includes(q) ?? false;
      const matchClass = e.className?.toLowerCase().includes(q) ?? false;
      const matchFolder = e.folder?.toLowerCase().includes(q) ?? false;
      return matchTitle || matchSubject || matchClass || matchFolder;
    });
  }, [exams, searchQuery, selectedFolder, currentFolderPath]);

  // Xử lý mở ca thi trong phiên hiện tại hoặc tự động tạo phiên mới
  const handleOpenStartBatchDialog = (exam: ExamListItemDto) => {
    setConfirmModal({
      isOpen: true,
      type: 'start_batch',
      exam,
      isSubmitting: false,
    });
  };

  // Xử lý tạm dừng ca thi
  const handleOpenPauseBatchDialog = (exam: ExamListItemDto) => {
    setConfirmModal({
      isOpen: true,
      type: 'pause_batch',
      exam,
      isSubmitting: false,
    });
  };

  // Xử lý hoàn tất kỳ thi
  const handleOpenFinishDialog = (exam: ExamListItemDto) => {
    setConfirmModal({
      isOpen: true,
      type: 'finish',
      exam,
      isSubmitting: false,
    });
  };

  // Xử lý xóa kỳ thi
  const handleOpenDeleteDialog = (exam: ExamListItemDto) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      exam,
      isSubmitting: false,
    });
  };

  // Thực thi hành động sau khi xác nhận trong Modal
  const handleConfirmAction = async () => {
    const { type, exam } = confirmModal;
    if (!type || !exam) return;

    setConfirmModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      if (type === 'start_batch') {
        const nextBatch = exam.status === 'waiting_next_batch' ? exam.currentBatch + 1 : exam.currentBatch;
        if (!activeSessionId) {
          // Chưa có phiên mở: Tự động mở phiên mới theo đúng lớp của kỳ thi (1-click)
          const newSession = await api.createSession({
            classId: exam.classId,
            identityMode: 'roster_only',
            allowTeams: false,
          });
          const sId = getSessionId(newSession);
          const sCode = getSessionJoinCode(newSession);
          await api.startExamBatch(exam.id, {
            sessionId: sId,
            batchIndex: nextBatch,
          });
          onShowToast(`🎉 Đã mở phòng học ${sCode} (Lớp ${exam.className}) và kích hoạt Ca ${nextBatch} của "${exam.title}"!`);
          if (onSessionCreatedAndStartExam) {
            await onSessionCreatedAndStartExam(newSession);
          }
        } else {
          // Đã có phiên mở: Khởi chạy vào phiên hiện tại
          await api.startExamBatch(exam.id, {
            sessionId: activeSessionId,
            batchIndex: nextBatch,
          });
          onShowToast(`🎉 Đã kích hoạt Ca ${nextBatch} của "${exam.title}" trong phòng ${activeSessionCode}!`);
          onSwitchToSessionTab?.();
        }
      } else if (type === 'pause_batch') {
        await api.pauseExamBatch(exam.id);
        onShowToast(`⏸ Đã tạm dừng Ca ${exam.currentBatch}. Kết quả của học sinh đã thi được lưu an toàn.`);
      } else if (type === 'finish') {
        await api.finishExam(exam.id);
        onShowToast(`🏁 Đã hoàn tất kỳ thi "${exam.title}". Sổ điểm đã được khóa an toàn.`);
      } else if (type === 'delete') {
        await api.deleteExam(exam.id);
        onShowToast(`🗑 Đã xóa kỳ thi "${exam.title}".`);
      }
      setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false });
      void loadExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi thực hiện hành động. Vui lòng thử lại.';
      onShowToast(`Lỗi: ${msg}`);
      setConfirmModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Tải file Excel
  const handleDownloadExcel = async (examId: string, examTitle: string) => {
    try {
      onShowToast(`📥 Đang xuất file Excel bảng điểm "${examTitle}"...`);
      await api.downloadExamExcel(examId, examTitle);
      onShowToast(`✓ Tải bảng điểm "${examTitle}" thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải file báo cáo Excel';
      onShowToast(`Lỗi: ${msg}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Thanh điều khiển */}
      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: UI_COLORS.text,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📝</span> Quản Lý & Báo Cáo Kỳ Thi Theo Ca
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: UI_COLORS.textMuted }}>
              Lưu trữ báo cáo kỳ thi lâu dài. Hỗ trợ chia ca thi (Tiết 1 / Tiết 2) chung một bảng điểm tổng hợp.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => void loadExams(false)}
              disabled={isLoading}
              style={{ minHeight: UI_SPACING.minTouchTarget }}
            >
              🔄 Làm mới
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateModalOpen(true);
                onCreateExam?.();
              }}
              style={{ minHeight: UI_SPACING.minTouchTarget, fontWeight: 600 }}
            >
              ➕ Tạo kỳ thi mới
            </Button>
          </div>
        </div>

        {/* Thanh lọc & Tìm kiếm */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: `1px solid ${UI_COLORS.border}`,
          }}
        >
          {/* Lọc Lớp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>Lớp học:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: UI_COLORS.text,
                minHeight: '40px',
                cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả các lớp ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{
                padding: '8px 12px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: UI_COLORS.text,
                minHeight: '40px',
                cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_progress">🟢 Đang mở ca</option>
              <option value="waiting_next_batch">⏸ Chờ ca tiếp theo</option>
              <option value="ready">○ Chưa kích hoạt</option>
              <option value="finished">✓ Đã hoàn thành</option>
            </select>
          </div>

          {/* Lọc Thư mục */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }}>Thư mục:</span>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: UI_COLORS.text,
                minHeight: '40px',
                cursor: 'pointer',
              }}
            >
              <option value="all">📁 Tất cả thư mục ({allFolders.length})</option>
              {allFolders.map((f) => {
                const count = countExamsInFolder(f, exams, true);
                const depth = f.split('/').length - 1;
                const leaf = f.split('/').pop() || f;
                return (
                  <option key={f} value={f}>
                    {'\u00A0'.repeat(depth * 3)}📂 {leaf} ({count} đề)
                  </option>
                );
              })}
              <option value="__none__">
                📄 Chưa phân loại ({exams.filter((ex) => !ex.folder).length})
              </option>
            </select>
          </div>

          {/* Ô tìm kiếm */}
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên bài thi, môn học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '40px',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Thông tin phiên học hiện tại nếu có */}
      {activeSession ? (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: UI_RADII.card,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <span style={{ fontSize: '14px', color: '#1E40AF' }}>
              Phiên học đang mở:{' '}
              <strong style={{ color: UI_COLORS.primary }}>Phòng {activeSessionCode}</strong>.
              Thầy/Cô có thể bấm <strong>"▶ Mở ca thi trong phiên này"</strong> trên bất kỳ kỳ thi nào để học sinh vào làm bài.
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: UI_RADII.card,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>ℹ️</span>
          <span style={{ fontSize: '14px', color: '#92400E' }}>
            Hiện chưa có phiên học nào mở. Để tổ chức ca thi cho học sinh, Thầy/Cô vui lòng chuyển sang tab{' '}
            <strong>"Phiên học & Hoạt động"</strong> để mở phiên học trước.
          </span>
        </div>
      )}

      {/* 1.5 Thanh Điều Hướng Thư Mục Đa Cấp & Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${UI_COLORS.border}`,
          borderRadius: UI_RADII.card,
          padding: '12px 16px',
          boxShadow: UI_SHADOWS.card,
        }}
      >
        {/* Hàng Breadcrumb và Nút Tạo Thư Mục Mới */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <span style={{ color: '#94A3B8', fontWeight: 700, margin: '0 2px' }}>›</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFolderPath(crumb.path);
                      setSelectedFolder('all');
                    }}
                    style={{
                      background: isLast ? '#EEF4FF' : 'none',
                      border: isLast ? '1px solid #BFDBFE' : 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: isLast ? UI_COLORS.primary : '#475569',
                      fontWeight: isLast ? 800 : 500,
                      fontSize: '13.5px',
                      cursor: isLast ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {idx === 0 ? '' : '📁 '}
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setFolderModalParentPath(currentFolderPath);
              setIsCreateFolderModalOpen(true);
            }}
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: '#F8FAFC',
              borderColor: '#CBD5E1',
              color: '#334155',
              padding: '6px 12px',
              minHeight: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            📁+ Thư mục mới
          </Button>
        </div>

        {/* Danh sách Thư mục con trực tiếp (Sub-folder Tiles) */}
        {subFolders.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
              paddingTop: '6px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            {subFolders.map((sub) => {
              const count = countExamsInFolder(sub.fullPath, exams, true);
              return (
                <div
                  key={sub.fullPath}
                  onClick={() => {
                    setCurrentFolderPath(sub.fullPath);
                    setSelectedFolder('all');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                    e.currentTarget.style.borderColor = '#BFDBFE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '18px' }}>📂</span>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        color: UI_COLORS.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={sub.name}
                    >
                      {sub.name}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: UI_COLORS.textMuted,
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                      flexShrink: 0,
                    }}
                  >
                    {count} đề
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Danh sách Thẻ Kỳ thi */}
      {isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 16px', color: UI_COLORS.textMuted }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Đang tải danh sách kỳ thi...</div>
          </div>
        </Card>
      ) : filteredExams.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 16px', color: UI_COLORS.textMuted }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: UI_COLORS.text, margin: '0 0 8px 0' }}>
              {exams.length === 0 ? 'Chưa có kỳ thi nào' : 'Không tìm thấy kỳ thi phù hợp'}
            </h3>
            <p style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
              {exams.length === 0
                ? 'Thầy/Cô hãy bấm nút "Tạo kỳ thi mới" để thiết lập bài kiểm tra 1 tiết hoặc thi học kỳ chia theo nhiều ca máy.'
                : 'Thầy/Cô vui lòng kiểm tra lại bộ lọc lớp hoặc từ khóa tìm kiếm.'}
            </p>
            {exams.length === 0 && (
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  onCreateExam?.();
                }}
                style={{ minHeight: UI_SPACING.minTouchTarget, fontWeight: 600 }}
              >
                ➕ Tạo kỳ thi đầu tiên ngay
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredExams.map((exam) => {
            const total = exam.totalStudents || 0;
            const submitted = exam.submittedCount || 0;
            const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;

            // Xác định màu sắc badge và thanh tiến độ
            let statusBadge = {
              text: '○ Chưa kích hoạt (Ca 1)',
              bg: '#F3E8FF',
              color: '#6B21A8',
              border: '#D8B4FE',
            };
            if (exam.status === 'in_progress') {
              statusBadge = {
                text: `● Đang mở Ca ${exam.currentBatch}${exam.activeSessionJoinCode ? ` (Phòng ${exam.activeSessionJoinCode})` : ''}`,
                bg: '#DCFCE7',
                color: '#166534',
                border: '#86EFAC',
              };
            } else if (exam.status === 'waiting_next_batch') {
              statusBadge = {
                text: `⏸ Chờ ca tiếp theo (Đã thi Ca ${exam.currentBatch})`,
                bg: '#FEF3C7',
                color: '#92400E',
                border: '#FDE68A',
              };
            } else if (exam.status === 'finished') {
              statusBadge = {
                text: '✓ Đã hoàn thành kỳ thi',
                bg: '#DBEAFE',
                color: '#1E40AF',
                border: '#93C5FD',
              };
            }

            let progressColor: string = UI_COLORS.primary;
            if (percent === 100) {
              progressColor = '#16A34A';
            } else if (percent < 50) {
              progressColor = '#F59E0B';
            }

            const canStartBatch =
              exam.status === 'ready' || exam.status === 'waiting_next_batch';

            return (
              <div
                key={exam.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: UI_RADII.card,
                  border: `1px solid ${exam.status === 'in_progress' ? '#86EFAC' : UI_COLORS.border}`,
                  boxShadow: exam.status === 'in_progress' ? '0 4px 14px rgba(34, 197, 94, 0.15)' : UI_SHADOWS.card,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                }}
              >
                {/* Dòng Header thẻ: Tên bài thi & Badge trạng thái */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: 700,
                        color: UI_COLORS.text,
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {exam.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        title="Chỉnh sửa thiết lập kỳ thi"
                        onClick={() => setEditingExam(exam)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          color: '#334155',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        ✏️ Sửa
                      </button>

                      <button
                        type="button"
                        title="Sao chép kỳ thi sang lớp khác"
                        onClick={() => setCloningExam(exam)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          color: '#334155',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        📋 Copy
                      </button>

                      <button
                        type="button"
                        title="Di chuyển kỳ thi vào thư mục khác"
                        onClick={() => setMovingExam(exam)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          color: '#334155',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        📁 Chuyển
                      </button>

                      <button
                        type="button"
                        title="Xóa kỳ thi"
                        onClick={() => handleOpenDeleteDialog(exam)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          color: '#94A3B8',
                          fontSize: '14px',
                          borderRadius: '4px',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                      }}
                    >
                      {statusBadge.text}
                    </span>

                    {exam.folder && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F3E8FF',
                          color: '#7E22CE',
                          border: '1px solid #E9D5FF',
                        }}
                      >
                        📁 {exam.folder}
                      </span>
                    )}

                    {exam.className && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        🏫 {exam.className}
                      </span>
                    )}

                    {exam.subject && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        📖 {exam.subject}
                      </span>
                    )}

                    <span style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                      ⏱️ {exam.durationMinutes} phút
                    </span>
                  </div>
                </div>

                {/* Thanh tiến độ làm bài */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: UI_COLORS.text }}>
                      Tiến độ hoàn thành:
                    </span>
                    <span style={{ fontWeight: 700, color: progressColor }}>
                      {submitted}/{total} HS ({percent}%)
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                        height: '100%',
                        backgroundColor: progressColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: UI_COLORS.textMuted,
                      marginTop: '8px',
                    }}
                  >
                    <span>
                      Điểm trung bình:{' '}
                      <strong style={{ color: exam.averageScore != null ? UI_COLORS.text : UI_COLORS.textMuted }}>
                        {exam.averageScore != null ? `${exam.averageScore} / ${exam.maxScore ?? 10}` : 'Chưa có'}
                      </strong>
                    </span>
                    <span>Ca hiện tại: <strong>Ca {exam.currentBatch}</strong></span>
                  </div>

                  {exam.status === 'in_progress' && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#1E40AF',
                        fontWeight: 600,
                      }}
                    >
                      <span>⚡ Đang làm bài thi:</span>
                      <strong style={{ color: '#2563EB' }}>
                        {exam.inProgressCount ?? 0} học sinh
                      </strong>
                    </div>
                  )}
                </div>

                {/* Các nút hành động chính */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  {/* Điều khiển ca thi */}
                  {exam.status === 'in_progress' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenPauseBatchDialog(exam)}
                        style={{
                          flex: 1,
                          minHeight: UI_SPACING.minTouchTarget,
                          borderColor: '#FDE68A',
                          color: '#B45309',
                          fontWeight: 700,
                          backgroundColor: '#FFFBEB',
                        }}
                      >
                        ⏸ Tạm dừng ca {exam.currentBatch}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenFinishDialog(exam)}
                        style={{
                          minHeight: UI_SPACING.minTouchTarget,
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          backgroundColor: '#FEF2F2',
                          fontWeight: 700,
                        }}
                      >
                        🏁 Kết thúc kỳ thi
                      </Button>
                    </div>
                  ) : exam.status !== 'finished' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="primary"
                        onClick={() => handleOpenStartBatchDialog(exam)}
                        disabled={!canStartBatch}
                        style={{
                          flex: 1,
                          minHeight: UI_SPACING.minTouchTarget,
                          fontWeight: 700,
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                        }}
                      >
                        {exam.status === 'waiting_next_batch'
                          ? (!activeSessionId
                              ? `🚀 Tiếp tục Ca ${exam.currentBatch + 1} (Tự động mở phiên)`
                              : `▶ Mở Ca ${exam.currentBatch + 1} trong phiên này`)
                          : (!activeSessionId
                              ? '🚀 Bắt đầu Ca 1 (Tự động mở phiên)'
                              : '▶ Mở Ca 1 trong phiên này')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenFinishDialog(exam)}
                        style={{
                          minHeight: UI_SPACING.minTouchTarget,
                          fontSize: '13px',
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          backgroundColor: '#FEF2F2',
                          fontWeight: 600,
                        }}
                      >
                        🏁 Hoàn tất
                      </Button>
                    </div>
                  ) : null}

                  {/* Nút xem báo cáo & tải Excel */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDetailModalExamId(exam.id);
                        onViewDetails?.(exam.id);
                      }}
                      style={{
                        flex: 1,
                        minHeight: '40px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#EFF6FF',
                        borderColor: '#BFDBFE',
                        color: '#1D4ED8',
                      }}
                    >
                      📊 Xem bảng điểm & Phân tích
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDownloadExcel(exam.id, exam.title)}
                      disabled={submitted === 0}
                      title={submitted === 0 ? 'Chưa có bài thi nào nộp để xuất bảng điểm' : 'Tải file Excel'}
                      style={{
                        minHeight: '40px',
                        fontSize: '13px',
                        padding: '8px 12px',
                        fontWeight: 600,
                        backgroundColor: submitted === 0 ? '#F1F5F9' : '#ECFDF5',
                        borderColor: submitted === 0 ? '#CBD5E1' : '#A7F3D0',
                        color: submitted === 0 ? '#94A3B8' : '#047857',
                      }}
                    >
                      📥 Excel
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Modal xác nhận hành động */}
      {confirmModal.isOpen && confirmModal.exam && (
        <Modal
          isOpen={confirmModal.isOpen}
          title={
            confirmModal.type === 'start_batch'
              ? `Xác nhận mở Ca ${confirmModal.exam.status === 'waiting_next_batch' ? confirmModal.exam.currentBatch + 1 : 1}`
              : confirmModal.type === 'pause_batch'
              ? `Tạm dừng Ca ${confirmModal.exam.currentBatch}`
              : confirmModal.type === 'finish'
              ? 'Hoàn tất toàn bộ kỳ thi'
              : 'Xóa kỳ thi'
          }
          onClose={() =>
            !confirmModal.isSubmitting &&
            setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false })
          }
        >
          <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {confirmModal.type === 'start_batch' && (
              <>
                {!activeSessionId ? (
                  <>
                    <p style={{ margin: 0, fontSize: '15px', color: UI_COLORS.text }}>
                      Thầy/Cô có muốn <strong>tự động mở phiên học mới cho lớp "{confirmModal.exam.className || 'Lớp học'}"</strong> và bắt đầu{' '}
                      <strong>
                        {confirmModal.exam.status === 'waiting_next_batch'
                          ? `Ca ${confirmModal.exam.currentBatch + 1}`
                          : 'Ca 1'}
                      </strong>{' '}
                      của kỳ thi <strong>"{confirmModal.exam.title}"</strong> ngay bây giờ không?
                    </p>
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #BFDBFE',
                        fontSize: '13px',
                        color: '#1E40AF',
                        lineHeight: 1.5,
                      }}
                    >
                      🚀 <strong>Tự động 1-chạm (1-click):</strong> Hệ thống sẽ tự động tạo một phiên học mới theo đúng danh sách lớp, cấp mã PIN phòng học và kích hoạt ca thi ngay lập tức. Thầy/Cô không cần phải ra ngoài tạo phiên học thủ công trước!
                    </div>
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: 1.4,
                      }}
                    >
                      🛡️ <strong>Khóa thí sinh ca trước:</strong> Những học sinh đã hoàn thành bài thi ở các ca trước sẽ tự động bị khóa danh tính, chỉ những học sinh chưa thi mới được vào làm bài.
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '15px', color: UI_COLORS.text }}>
                      Thầy/Cô có chắc chắn muốn mở{' '}
                      <strong>
                        {confirmModal.exam.status === 'waiting_next_batch'
                          ? `Ca ${confirmModal.exam.currentBatch + 1}`
                          : 'Ca 1'}
                      </strong>{' '}
                      của bài thi <strong>"{confirmModal.exam.title}"</strong> vào phòng học{' '}
                      <strong style={{ color: UI_COLORS.primary }}>{activeSessionCode}</strong> không?
                    </p>
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #BFDBFE',
                        fontSize: '13px',
                        color: '#1E40AF',
                        lineHeight: 1.5,
                      }}
                    >
                      🛡️ <strong>Cơ chế khóa an toàn:</strong> Những học sinh đã hoàn thành bài thi ở các ca trước sẽ tự
                      động bị khóa trên cổng chọn tên. Chỉ những học sinh chưa làm bài mới có thể chọn tên và tham gia làm
                      bài thi trọn vẹn {confirmModal.exam.durationMinutes} phút.
                    </div>
                  </>
                )}
              </>
            )}

            {confirmModal.type === 'pause_batch' && (
              <>
                <p style={{ margin: 0, fontSize: '15px', color: UI_COLORS.text }}>
                  Thầy/Cô có chắc chắn muốn tạm dừng <strong>Ca {confirmModal.exam.currentBatch}</strong> của bài thi{' '}
                  <strong>"{confirmModal.exam.title}"</strong> không?
                </p>
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #FDE68A',
                    fontSize: '13px',
                    color: '#92400E',
                    lineHeight: 1.5,
                  }}
                >
                  💾 Toàn bộ kết quả bài nộp của học sinh Ca {confirmModal.exam.currentBatch} đã được ghi nhận an toàn
                  vào hệ thống. Thầy/Cô có thể yên tâm kết thúc tiết học này, sang tiết sau mở phiên mới và bấm{' '}
                  <strong>"▶ Mở Ca {confirmModal.exam.currentBatch + 1}"</strong> để tiếp tục cho học sinh ca sau.
                </div>
              </>
            )}

            {confirmModal.type === 'finish' && (
              <>
                <p style={{ margin: 0, fontSize: '15px', color: UI_COLORS.text }}>
                  Thầy/Cô có chắc chắn muốn <strong>chốt hoàn tất kỳ thi "{confirmModal.exam.title}"</strong> không?
                </p>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    fontSize: '13px',
                    color: '#991B1B',
                    lineHeight: 1.5,
                  }}
                >
                  ⚠️ Sau khi chốt hoàn tất, kỳ thi sẽ chuyển sang trạng thái kết thúc và không thể mở thêm ca mới.
                  Thầy/Cô vẫn có thể xem lại báo cáo chi tiết và tải file Excel bất kỳ lúc nào.
                </div>
              </>
            )}

            {confirmModal.type === 'delete' && (
              <>
                <p style={{ margin: 0, fontSize: '15px', color: UI_COLORS.text }}>
                  Thầy/Cô có chắc chắn muốn <strong>xóa vĩnh viễn</strong> kỳ thi{' '}
                  <strong>"{confirmModal.exam.title}"</strong> cùng toàn bộ bài nộp liên quan không?
                </p>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    fontSize: '13px',
                    color: '#991B1B',
                  }}
                >
                  ⚠️ Hành động này không thể hoàn tác!
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button
                variant="ghost"
                disabled={confirmModal.isSubmitting}
                onClick={() =>
                  setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false })
                }
                style={{
                  minHeight: '44px',
                  backgroundColor: '#F1F5F9',
                  borderColor: '#CBD5E1',
                  color: '#334155',
                  fontWeight: 600,
                }}
              >
                Hủy bỏ
              </Button>
              <Button
                variant={
                  confirmModal.type === 'delete' || confirmModal.type === 'finish'
                    ? 'danger'
                    : 'primary'
                }
                disabled={confirmModal.isSubmitting}
                onClick={handleConfirmAction}
                style={{
                  backgroundColor:
                    confirmModal.type === 'delete' || confirmModal.type === 'finish'
                      ? '#DC2626'
                      : '#2563EB',
                  borderColor:
                    confirmModal.type === 'delete' || confirmModal.type === 'finish'
                      ? '#DC2626'
                      : '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  minHeight: '44px',
                  padding: '10px 24px',
                  boxShadow:
                    confirmModal.type === 'delete' || confirmModal.type === 'finish'
                      ? '0 4px 12px rgba(220, 38, 38, 0.25)'
                      : '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                {confirmModal.isSubmitting
                  ? 'Đang xử lý...'
                  : confirmModal.type === 'delete'
                  ? '🗑️ Xác nhận xóa'
                  : confirmModal.type === 'finish'
                  ? '🏁 Xác nhận hoàn tất'
                  : confirmModal.type === 'pause_batch'
                  ? '⏸️ Xác nhận tạm dừng'
                  : !activeSessionId
                  ? '🚀 Mở phiên mới & Bắt đầu Ca thi'
                  : '▶️ Xác nhận mở Ca thi'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Modal Xem Báo cáo & Bảng điểm Chi tiết */}
      <ExamReportDetailModal
        examId={detailModalExamId}
        isOpen={Boolean(detailModalExamId)}
        onClose={handleCloseDetailModal}
        onShowToast={onShowToast}
      />

      {/* 5. Modal Tạo Kỳ Thi Mới */}
      <CreateExamModal
        isOpen={isCreateModalOpen}
        classes={classes}
        initialClassId={selectedClassId !== 'all' ? selectedClassId : undefined}
        activeSession={activeSession}
        existingFolders={allFolders}
        onClose={() => setIsCreateModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => {
          void loadExams();
        }}
      />

      {/* 6. Modal Chỉnh Sửa Kỳ Thi */}
      <EditExamModal
        isOpen={Boolean(editingExam)}
        exam={editingExam}
        existingFolders={allFolders}
        onClose={() => setEditingExam(null)}
        onShowToast={onShowToast}
        onSuccess={() => {
          void loadExams();
        }}
      />

      {/* 7. Modal Sao Chép Kỳ Thi Sang Lớp Khác */}
      <CloneExamModal
        isOpen={Boolean(cloningExam)}
        exam={cloningExam}
        classes={classes}
        onClose={() => setCloningExam(null)}
        onShowToast={onShowToast}
        onSuccess={() => {
          void loadExams();
        }}
      />

      {/* 8. Modal Di Chuyển Kỳ Thi Vào Thư Mục */}
      <MoveExamModal
        isOpen={Boolean(movingExam)}
        exam={movingExam}
        allFolders={allFolders}
        onClose={() => setMovingExam(null)}
        onShowToast={onShowToast}
        onSuccess={() => {
          void loadExams();
        }}
      />

      {/* 9. Modal Tạo Thư Mục Mới */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        initialParentPath={folderModalParentPath}
        allFolders={allFolders}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={(newPath) => {
          setCurrentFolderPath(newPath);
          setSelectedFolder('all');
          void loadExams();
        }}
      />
    </div>
  );
};
