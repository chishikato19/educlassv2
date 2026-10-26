import React, { useState } from 'react';
import { Button, Modal } from '@educlass/ui-kit';

export interface LogoutWarningModalProps {
  isOpen: boolean;
  classNameTitle?: string | undefined;
  joinCode?: string | undefined;
  onClose: () => void;
  onCloseSessionAndLogout: () => Promise<void>;
  onKeepSessionAndLogout: () => Promise<void>;
}

export const LogoutWarningModal: React.FC<LogoutWarningModalProps> = ({
  isOpen,
  classNameTitle,
  joinCode,
  onClose,
  onCloseSessionAndLogout,
  onKeepSessionAndLogout,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseSessionAndLogout = async () => {
    setIsLoading(true);
    try {
      await onCloseSessionAndLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepSessionAndLogout = async () => {
    setIsLoading(true);
    try {
      await onKeepSessionAndLogout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cảnh Báo: Tiết Dạy Đang Mở!">
      <div className="space-y-4 p-1">
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h4 className="font-bold text-amber-900 text-base">
              Tiết dạy vẫn đang hoạt động!
            </h4>
            <p className="text-sm text-gray-700 mt-1">
              Lớp:{' '}
              <strong>{classNameTitle || 'Tiết dạy tự do'}</strong>
              {joinCode && (
                <>
                  {' '}— Mã vào lớp: <strong className="tracking-wider text-blue-600 font-mono">{joinCode}</strong>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Học sinh vẫn đang kết nối trong phòng học. Thầy/Cô muốn xử lý phiên học này như thế nào trước khi đăng xuất?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          {/* Lựa chọn 1: Đóng tiết & Lưu kết quả */}
          <Button
            variant="danger"
            onClick={handleCloseSessionAndLogout}
            disabled={isLoading}
            className="w-full justify-center text-sm py-2.5"
          >
            {isLoading ? 'Đang đóng tiết & đăng xuất...' : '1. Đóng tiết, lưu kết quả & Đăng xuất'}
          </Button>

          {/* Lựa chọn 2: Vẫn giữ phiên mở */}
          <Button
            variant="secondary"
            onClick={handleKeepSessionAndLogout}
            disabled={isLoading}
            className="w-full justify-center text-sm py-2.5"
          >
            2. Vẫn giữ phiên chạy ngầm & Đăng xuất
          </Button>

          {/* Lựa chọn 3: Hủy bỏ */}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full justify-center text-sm py-2"
          >
            3. Quay lại tiếp tục dạy
          </Button>
        </div>
      </div>
    </Modal>
  );
};
