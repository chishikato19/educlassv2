import React, { useEffect, useState } from 'react';
import type { ExamListItemDto } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { normalizeFolderPath, saveCustomFolder } from '../utils/exam-folders.js';

export interface MoveExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamListItemDto | null;
  allFolders: string[];
  onShowToast: (message: string) => void;
  onSuccess: () => void;
}

export const MoveExamModal: React.FC<MoveExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  allFolders,
  onShowToast,
  onSuccess,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && exam) {
      setSelectedFolder(normalizeFolderPath(exam.folder));
      setIsCreatingNew(false);
      setNewFolderName('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;

    let targetPath = selectedFolder;
    if (isCreatingNew) {
      const trimmed = newFolderName.trim();
      if (!trimmed) {
        setError('Vui lòng nhập tên thư mục mới');
        return;
      }
      targetPath = selectedFolder ? `${selectedFolder}/${trimmed}` : trimmed;
      saveCustomFolder(targetPath);
    }

    setIsSubmitting(true);
    try {
      await api.updateExam(exam.id, {
        config: {
          folder: targetPath ? targetPath : null,
        },
      });

      const destName = targetPath ? `thư mục "${targetPath}"` : 'Thư mục gốc (Chưa phân loại)';
      onShowToast(`📁 Đã chuyển kỳ thi "${exam.title}" sang ${destName}!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể di chuyển kỳ thi';
      setError(msg);
      onShowToast(`Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !exam) return null;

  const currentNorm = normalizeFolderPath(exam.folder);

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="520px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📁</span>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }}>
              Di Chuyển Kỳ Thi Vào Thư Mục
            </div>
            <div style={{ fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Chọn thư mục lưu trữ mới hoặc tạo thư mục con cho bài thi
            </div>
          </div>
        </div>
      }
      onClose={() => !isSubmitting && onClose()}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
        {/* Thông tin bài thi & thư mục hiện tại */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: UI_RADII.card,
            padding: '12px 14px',
            fontSize: '13px',
          }}
        >
          <div style={{ color: UI_COLORS.textMuted, fontSize: '11.5px', fontWeight: 600 }}>KỲ THI ĐANG CHUYỂN:</div>
          <div style={{ fontWeight: 700, color: UI_COLORS.text, fontSize: '14.5px', marginTop: '2px' }}>
            {exam.title}
          </div>
          <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#475569' }}>
            Vị trí hiện tại: <strong>{currentNorm ? `📁 ${currentNorm}` : '🏠 Thư mục gốc (Chưa phân loại)'}</strong>
          </div>
        </div>

        {/* Chọn thư mục đích */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
            Chọn thư mục đích <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: `1px solid ${UI_COLORS.border}`,
              borderRadius: UI_RADII.input,
              backgroundColor: '#FFFFFF',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {/* Tùy chọn Thư mục gốc */}
            <div
              onClick={() => setSelectedFolder('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selectedFolder === '' ? '#EEF4FF' : 'transparent',
                color: selectedFolder === '' ? UI_COLORS.primary : UI_COLORS.text,
                fontWeight: selectedFolder === '' ? 700 : 500,
                fontSize: '13.5px',
              }}
            >
              <span>🏠</span>
              <span>Thư mục gốc (Không phân loại)</span>
            </div>

            {/* Danh sách các thư mục hiện có (phân cấp thụt lề) */}
            {allFolders.map((f) => {
              const depth = f.split('/').length - 1;
              const leafName = f.split('/').pop() || f;
              const isSelected = selectedFolder === f;

              return (
                <div
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    paddingLeft: `${10 + depth * 20}px`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#EEF4FF' : 'transparent',
                    color: isSelected ? UI_COLORS.primary : UI_COLORS.text,
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13.5px',
                  }}
                >
                  <span>{depth > 0 ? '📂' : '📁'}</span>
                  <span>{leafName}</span>
                  <span style={{ fontSize: '11px', color: UI_COLORS.textMuted, marginLeft: 'auto' }}>
                    {f}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tùy chọn tạo nhanh thư mục con mới */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: UI_COLORS.text }}>
            <input
              type="checkbox"
              checked={isCreatingNew}
              onChange={(e) => setIsCreatingNew(e.target.checked)}
              style={{ accentColor: UI_COLORS.primary }}
            />
            <span>➕ Tạo thư mục con mới bên trong vị trí đã chọn</span>
          </label>

          {isCreatingNew && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Nhập tên thư mục con mới (VD: Giữa HK1)..."
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  if (error) setError('');
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: UI_RADII.input,
                  border: `1px solid ${error ? '#DC2626' : UI_COLORS.border}`,
                  fontSize: '13px',
                }}
              />
              <div style={{ fontSize: '11.5px', color: UI_COLORS.textMuted, marginTop: '4px' }}>
                Đường dẫn sẽ tạo: <strong>{selectedFolder ? `${selectedFolder}/${newFolderName || '...'}` : newFolderName || '...'}</strong>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ fontSize: '12px', color: '#DC2626' }}>
            {error}
          </div>
        )}

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
              padding: '10px 22px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            {isSubmitting ? 'Đang chuyển...' : '📁 Xác nhận di chuyển'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
