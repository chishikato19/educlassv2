import React, { useEffect, useState } from 'react';
import type { ExamListItemDto } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';

export interface EditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamListItemDto | null;
  existingFolders: string[];
  onShowToast: (message: string) => void;
  onSuccess: () => void;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  existingFolders,
  onShowToast,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [folder, setFolder] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);

  // Config states
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [allowViewScore, setAllowViewScore] = useState(true);
  const [allowViewReview, setAllowViewReview] = useState(true);
  const [password, setPassword] = useState('');

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Nạp dữ liệu cấu hình khi modal mở
  useEffect(() => {
    if (!isOpen || !exam) return;

    setTitle(exam.title);
    setSubject(exam.subject || '');
    setFolder(exam.folder || '');
    setDurationMinutes(exam.durationMinutes);
    setError('');

    let isMounted = true;
    setIsLoadingDetail(true);

    api
      .getExamDetail(exam.id)
      .then(detail => {
        if (!isMounted) return;
        const cfg = detail.config || {};
        if (cfg.folder !== undefined && cfg.folder !== null) {
          setFolder(String(cfg.folder));
        }
        setShuffleQuestions(Boolean(cfg.shuffleQuestions));
        setShuffleOptions(Boolean(cfg.shuffleOptions));
        setAllowViewScore(cfg.allowViewScore !== false);
        setAllowViewReview(cfg.allowViewReview !== false);
        setPassword(cfg.password ? String(cfg.password) : '');
      })
      .catch(() => {
        // Nếu không load được detail, giữ nguyên giá trị tóm tắt
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    if (!title.trim()) {
      setError('Tiêu đề kỳ thi không được để trống');
      return;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setError('Thời lượng làm bài tối thiểu là 1 phút');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateExam(exam.id, {
        title: title.trim(),
        subject: subject.trim() ? subject.trim() : null,
        durationMinutes,
        config: {
          shuffleQuestions,
          shuffleOptions,
          allowViewScore,
          allowViewReview,
          password: password.trim() ? password.trim() : null,
          folder: folder.trim() ? folder.trim() : null,
        },
      });

      onShowToast(`✏️ Đã cập nhật thiết lập kỳ thi "${title.trim()}" thành công!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật kỳ thi';
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
      maxWidth="620px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>✏️</span>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }}>
              Chỉnh Sửa Thiết Lập Kỳ Thi
            </div>
            <div style={{ fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Cập nhật tiêu đề, môn, thời gian làm bài, thư mục lưu trữ và tùy chọn thi
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
        {isLoadingDetail && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#EFF6FF',
              borderRadius: '6px',
              fontSize: '12.5px',
              color: '#1E40AF',
            }}
          >
            ⏳ Đang nạp thiết lập chi tiết của kỳ thi...
          </div>
        )}

        {/* 1. Tiêu đề kỳ thi */}
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
            Tiêu đề kỳ thi <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="VD: Kiểm tra 1 tiết Tin học"
            disabled={isSubmitting}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: UI_RADII.input,
              border: `1px solid ${error && !title.trim() ? '#DC2626' : UI_COLORS.border}`,
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

        {/* 2. Môn học & Thư mục */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: UI_COLORS.text,
                marginBottom: '6px',
              }}
            >
              Môn học
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="VD: Tin học, Toán..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: UI_COLORS.text,
                marginBottom: '6px',
              }}
            >
              📁 Thư mục lưu trữ
            </label>
            <input
              type="text"
              list="edit-exam-folder-datalist"
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="VD: Giữa HK1, 15 Phút..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
            <datalist id="edit-exam-folder-datalist">
              {existingFolders.map(f => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>

        {/* 3. Thời gian làm bài */}
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
            Thời lượng làm bài (phút) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              max={180}
              value={durationMinutes}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                setDurationMinutes(isNaN(val) ? 0 : val);
              }}
              disabled={isSubmitting}
              style={{
                width: '100px',
                padding: '10px 12px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                fontWeight: 700,
                minHeight: '40px',
              }}
            />
            {[15, 30, 45, 60, 90].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                disabled={isSubmitting}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${durationMinutes === mins ? UI_COLORS.primary : UI_COLORS.border}`,
                  backgroundColor: durationMinutes === mins ? '#EEF4FF' : '#F8FAFC',
                  color: durationMinutes === mins ? UI_COLORS.primary : '#475569',
                  fontWeight: durationMinutes === mins ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                {mins} phút
              </button>
            ))}
          </div>
        </div>

        {/* 4. Tùy chọn chống gian lận & Trả kết quả */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: UI_RADII.card,
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: UI_COLORS.text,
              marginBottom: '2px',
            }}
          >
            ⚙️ Tùy chọn thi & Trả kết quả
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13.5px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={e => setShuffleQuestions(e.target.checked)}
              disabled={isSubmitting}
              style={{ accentColor: UI_COLORS.primary }}
            />
            <span>Xáo trộn thứ tự câu hỏi</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13.5px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={e => setShuffleOptions(e.target.checked)}
              disabled={isSubmitting}
              style={{ accentColor: UI_COLORS.primary }}
            />
            <span>Xáo trộn thứ tự các lựa chọn đáp án (A, B, C, D)</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13.5px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={allowViewScore}
              onChange={e => setAllowViewScore(e.target.checked)}
              disabled={isSubmitting}
              style={{ accentColor: UI_COLORS.primary }}
            />
            <span>Cho học sinh xem điểm số sau khi nộp bài</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13.5px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={allowViewReview}
              onChange={e => setAllowViewReview(e.target.checked)}
              disabled={isSubmitting}
              style={{ accentColor: UI_COLORS.primary }}
            />
            <span>Cho xem lại đề và đáp án chi tiết sau khi nộp</span>
          </label>

          <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 600,
                color: UI_COLORS.text,
                marginBottom: '4px',
              }}
            >
              🔒 Mật khẩu vào thi (Để trống nếu không yêu cầu):
            </label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="VD: 123456"
              disabled={isSubmitting}
              style={{
                width: '100%',
                maxWidth: '220px',
                boxSizing: 'border-box',
                padding: '6px 10px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '13px',
              }}
            />
          </div>
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
            disabled={isSubmitting}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              fontWeight: 700,
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            {isSubmitting ? 'Đang lưu...' : '💾 Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
