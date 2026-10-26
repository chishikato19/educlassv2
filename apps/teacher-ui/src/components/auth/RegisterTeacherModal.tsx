import React, { useState } from 'react';
import type { UserDto } from '@educlass/protocol';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';

export interface RegisterTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserDto) => void;
}

export const RegisterTeacherModal: React.FC<RegisterTeacherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [subject, setSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Gợi ý tự động sinh username khi gõ tên hiển thị
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setDisplayName(name);
    setErrorMsg(null);

    // Nếu username chưa sửa hoặc trống, gợi ý username không dấu
    if (!username || username === sanitizeUsername(displayName)) {
      setUsername(sanitizeUsername(name));
    }
  };

  const sanitizeUsername = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên giáo viên');
      return;
    }
    if (!username.trim() || username.length < 2) {
      setErrorMsg('Tên đăng nhập phải có ít nhất 2 ký tự');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = await api.registerTeacher({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        subject: subject.trim() || undefined,
      });
      // Reset form
      setDisplayName('');
      setUsername('');
      setSubject('');
      onSuccess(user);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm Tài Khoản Giáo Viên Mới">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Họ và tên giáo viên <span className="text-red-500">*</span>
          </label>
          <Input
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="VD: Cô Nguyễn Mai, Thầy Lê Nam..."
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Tên đăng nhập (viết liền không dấu) <span className="text-red-500">*</span>
          </label>
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="VD: mai.toan, nam.ly..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Môn học phụ trách (tùy chọn)
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="VD: Toán học, Vật lý, Ngữ văn, Tin học..."
          />
        </div>

        {/* Chú thích mã PIN mặc định */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
          <span className="text-base">ℹ️</span>
          <div>
            Mã PIN khởi tạo mặc định sẽ là <strong>1234</strong>. Thầy/Cô có thể đổi mã PIN cá nhân bất cứ lúc nào trong phần Cài đặt sau khi đăng nhập.
          </div>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-500 font-semibold p-2 bg-red-50 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
