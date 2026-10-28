import React, { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { normalizeFolderPath, saveCustomFolder } from '../utils/exam-folders.js';

export interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParentPath?: string;
  allFolders: string[];
  onShowToast: (message: string) => void;
  onSuccess: (newFolderPath: string) => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  initialParentPath = '',
  allFolders,
  onShowToast,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setParentPath(normalizeFolderPath(initialParentPath));
      setError('');
    }
  }, [isOpen, initialParentPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderName.trim().replace(/[/\\?%*:|"<>]/g, '');
    if (!trimmed) {
      setError('Vui lòng nhập tên thư mục hợp lệ');
      return;
    }

    const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
    saveCustomFolder(fullPath);
    onShowToast(`📁 Đã tạo thư mục "${fullPath}" thành công!`);
    onSuccess(fullPath);
    onClose();
  };

  if (!isOpen) return null;

  const previewPath = parentPath
    ? `${parentPath}/${folderName.trim() || '...'}`
    : folderName.trim() || '...';

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="480px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📁</span>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }}>
              Tạo Thư Mục Kỳ Thi Mới
            </div>
            <div style={{ fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              Tạo thư mục hoặc thư mục con để sắp xếp các bài kiểm tra ngăn nắp
            </div>
          </div>
        </div>
      }
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}
      >
        {/* Vị trí thư mục cha */}
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
            Vị trí (Thư mục cha)
          </label>
          <select
            value={parentPath}
            onChange={e => setParentPath(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: UI_RADII.input,
              border: `1px solid ${UI_COLORS.border}`,
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: UI_COLORS.text,
              minHeight: '44px',
              cursor: 'pointer',
            }}
          >
            <option value="">🏠 [Thư mục gốc]</option>
            {allFolders.map(f => {
              const depth = f.split('/').length - 1;
              const leaf = f.split('/').pop() || f;
              return (
                <option key={f} value={f}>
                  {'\u00A0'.repeat(depth * 3)}📂 {leaf} ({f})
                </option>
              );
            })}
          </select>
        </div>

        {/* Tên thư mục mới */}
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
            Tên thư mục mới <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="VD: Giữa HK1, 15 Phút, Tin học 10..."
            value={folderName}
            onChange={e => {
              setFolderName(e.target.value);
              if (error) setError('');
            }}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: UI_RADII.input,
              border: `1px solid ${error ? '#DC2626' : UI_COLORS.border}`,
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

        {/* Xem trước đường dẫn */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '12.5px',
            color: '#1E40AF',
          }}
        >
          Đường dẫn thư mục sẽ tạo:{' '}
          <strong style={{ color: UI_COLORS.primary }}>📁 {previewPath}</strong>
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
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              fontWeight: 700,
              padding: '10px 22px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            ➕ Tạo thư mục
          </Button>
        </div>
      </form>
    </Modal>
  );
};
