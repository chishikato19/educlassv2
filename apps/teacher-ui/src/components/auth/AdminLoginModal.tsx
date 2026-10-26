import React, { useState } from 'react';
import type { UserDto } from '@educlass/protocol';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';

export interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserDto) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(username.trim(), password);
      onSuccess(res.user);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không đúng');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng nhập Quản trị viên (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Tên đăng nhập</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu quản trị viên"
          />
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
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
