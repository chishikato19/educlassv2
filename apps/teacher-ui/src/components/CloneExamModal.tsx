import React, { useEffect, useState } from 'react';
import type { ClassDto, ExamListItemDto } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';

export interface CloneExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamListItemDto | null;
  classes: ClassDto[];
  onShowToast: (message: string) => void;
  onSuccess: () => void;
}

export const CloneExamModal: React.FC<CloneExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  classes,
  onShowToast,
  onSuccess,
}) => {
  const [targetClassId, setTargetClassId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Khi modal mở, khởi tạo lớp nhận khác với lớp hiện tại (nếu có)
  useEffect(() => {
    if (isOpen && exam) {
      // Ưu tiên chọn lớp khác lớp gốc
      const otherClass = classes.find(c => c.id !== exam.classId) || classes[0];
      const initialClassId = otherClass ? otherClass.id : exam.classId;
      setTargetClassId(initialClassId);

      const targetClassName = classes.find(c => c.id === initialClassId)?.name;
      setNewTitle(
        targetClassName ? `${exam.title} - ${targetClassName}` : `${exam.title} (Bản sao)`
      );
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, exam, classes]);

  // Cập nhật tiêu đề gợi ý khi đổi lớp nhận
  const handleClassChange = (selectedId: string) => {
    setTargetClassId(selectedId);
    if (exam) {
      const cls = classes.find(c => c.id === selectedId);
      setNewTitle(cls ? `${exam.title} - ${cls.name}` : `${exam.title} (Bản sao)`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    if (!targetClassId) {
      setError('Vui lòng chọn lớp học nhận kỳ thi');
      return;
    }
    if (!newTitle.trim()) {
      setError('Vui lòng nhập tiêu đề kỳ thi mới');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.cloneExam(exam.id, {
        targetClassId,
        newTitle: newTitle.trim(),
      });
      const clsName = classes.find(c => c.id === targetClassId)?.name || 'lớp mới';
      onShowToast(`📋 Đã sao chép kỳ thi sang ${clsName} thành công!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể sao chép kỳ thi';
      setError(msg);
      onShowToast(`Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !exam) return null;

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="540px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📋</span>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }}>
              Sao Chép Kỳ Thi Sang Lớp Khác
            </div>
            <div style={{ fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Nhân bản toàn bộ câu hỏi, mức điểm từng câu và thiết lập sang một lớp học mới
            </div>
          </div>
        </div>
      }
      onClose={() => !isSubmitting && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}
      >
        {/* Thông tin kỳ thi gốc */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: UI_RADII.card,
            padding: '12px 14px',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: UI_COLORS.textMuted, fontSize: '12px', fontWeight: 600 }}>
            KỲ THI GỐC:
          </div>
          <div
            style={{ fontWeight: 700, color: UI_COLORS.text, fontSize: '14px', marginTop: '2px' }}
          >
            {exam.title}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '6px',
              color: '#475569',
              fontSize: '12.5px',
            }}
          >
            <span>
              🏫 Lớp: <strong>{exam.className || 'Chưa rõ'}</strong>
            </span>
            <span>
              ⏱️ <strong>{exam.durationMinutes} phút</strong>
            </span>
            {exam.subject && (
              <span>
                📖 Môn: <strong>{exam.subject}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Chọn lớp nhận */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: UI_COLORS.text,
              marginBottom: '6px',
            }}
          >
            Lớp học nhận kỳ thi sao chép <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            value={targetClassId}
            onChange={e => handleClassChange(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: UI_RADII.input,
              border: `1px solid ${error && !targetClassId ? '#DC2626' : UI_COLORS.border}`,
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: UI_COLORS.text,
              minHeight: '44px',
              cursor: 'pointer',
            }}
          >
            {classes.length === 0 ? (
              <option value="">Chưa có lớp học nào trong hệ thống</option>
            ) : (
              classes.map(c => (
                <option key={c.id} value={c.id}>
                  🏫 {c.name} {c.id === exam.classId ? '(Lớp hiện tại)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Tiêu đề kỳ thi mới */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: UI_COLORS.text,
              marginBottom: '6px',
            }}
          >
            Tiêu đề kỳ thi mới <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={e => {
              setNewTitle(e.target.value);
              if (error) setError('');
            }}
            disabled={isSubmitting}
            placeholder="VD: Kiểm tra 1 tiết Tin học - Lớp 10A2"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: UI_RADII.input,
              border: `1px solid ${error && !newTitle.trim() ? '#DC2626' : UI_COLORS.border}`,
              fontSize: '14px',
              minHeight: '44px',
            }}
          />
          {error && (
            <span
              style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}
            >
              {error}
            </span>
          )}
        </div>

        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '12.5px',
            color: '#1E40AF',
            lineHeight: 1.4,
          }}
        >
          💡 <strong>Lợi ích:</strong> Bài thi mới được tạo ở trạng thái <em>Chưa kích hoạt</em>,
          giữ nguyên toàn bộ ngân hàng câu hỏi, thang điểm từng câu và các tùy chọn xáo trộn/xem
          điểm để thầy cô tổ chức thi cho lớp khác mà không cần nhập lại từ đầu.
        </div>

        {/* Nút hành động */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              backgroundColor: '#F1F5F9',
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            Hủy bỏ
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || classes.length === 0}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              fontWeight: 700,
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            {isSubmitting ? 'Đang sao chép...' : '📋 Xác nhận sao chép'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
