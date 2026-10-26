import React, { useState } from 'react';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';

export interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin) {
      setErrorMsg('Vui lòng nhập mã PIN hiện tại');
      return;
    }
    if (newPin.length < 4) {
      setErrorMsg('Mã PIN mới phải có ít nhất 4 ký tự');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Mã PIN mới và xác nhận mã PIN không khớp nhau');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await api.changePassword(oldPin, newPin);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đổi mã PIN thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đổi Mã PIN Cá Nhân">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Mã PIN hiện tại <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            maxLength={10}
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value)}
            placeholder="Mặc định ban đầu là 1234"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Mã PIN mới (4 số) <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            maxLength={10}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="Nhập 4 số mới (VD: 5678)"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Xác nhận mã PIN mới <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            maxLength={10}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Nhập lại mã PIN mới"
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
            {isLoading ? 'Đang cập nhật...' : 'Lưu mã PIN mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
