import React, { useCallback, useEffect, useState } from 'react';
import type { TeacherPublicProfile, UserDto } from '@educlass/protocol';
import { Button, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';

export interface PinModalProps {
  teacher: TeacherPublicProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserDto) => void;
}

export const PinModal: React.FC<PinModalProps> = ({ teacher, isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Reset state khi mở modal với giáo viên mới
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setShowResetConfirm(false);
      setResetSuccessMsg(null);
      setIsLoading(false);
    }
  }, [isOpen, teacher]);

  const handleSubmitPin = useCallback(
    async (pinToSubmit: string) => {
      if (!teacher || isLoading) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await api.login(teacher.username, pinToSubmit);
        onSuccess(res.user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Mã PIN không chính xác';
        setErrorMsg(
          message.includes('Mật khẩu') || message.includes('CREDENTIALS')
            ? 'Mã PIN không đúng (Mặc định: 1234).'
            : message
        );
        setPin('');
      } finally {
        setIsLoading(false);
      }
    },
    [teacher, isLoading, onSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4 && !isLoading) {
        const newPin = pin + digit;
        setPin(newPin);
        setErrorMsg(null);
        if (newPin.length === 4) {
          handleSubmitPin(newPin);
        }
      }
    },
    [pin, isLoading, handleSubmitPin]
  );

  const handleDelete = useCallback(() => {
    if (pin.length > 0 && !isLoading) {
      setPin(prev => prev.slice(0, -1));
      setErrorMsg(null);
    }
  }, [pin, isLoading]);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMsg(null);
  }, []);

  // Lắng nghe bàn phím vật lý
  useEffect(() => {
    if (!isOpen || showResetConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showResetConfirm, handleDigit, handleDelete, onClose]);

  // Xử lý Quên mã PIN (Phương án 2: xác nhận 1 chạm)
  const handleConfirmReset = async () => {
    if (!teacher) return;
    setIsLoading(true);
    try {
      await api.resetPin(teacher.id);
      setShowResetConfirm(false);
      setResetSuccessMsg('Đã đặt lại mã PIN về 1234. Vui lòng nhập 1234 để vào tiết dạy.');
      setPin('');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Không thể đặt lại mã PIN. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!teacher) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhập mã PIN Giáo viên">
      <div className="flex flex-col items-center p-2 text-center">
        {/* Thông tin giáo viên */}
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-black mb-2 shadow-sm border border-blue-200">
          {teacher.displayName.charAt(0).toUpperCase()}
        </div>
        <h3 className="text-xl font-bold text-gray-800">{teacher.displayName}</h3>
        {teacher.subject && (
          <span className="text-sm px-2.5 py-0.5 mt-1 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100">
            {teacher.subject}
          </span>
        )}

        {/* Chế độ xác nhận reset PIN (Phương án 2) */}
        {showResetConfirm ? (
          <div className="w-full mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
            <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
              <span className="text-xl">⚠️</span> Đặt lại mã PIN về mặc định?
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Mã PIN của tài khoản <strong>{teacher.displayName}</strong> sẽ được đặt lại về{' '}
              <strong>1234</strong>.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={handleConfirmReset}
                disabled={isLoading}
              >
                {isLoading ? 'Đang đặt lại...' : 'Xác nhận đặt lại về 1234'}
              </Button>
              <Button
                variant="ghost"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => setShowResetConfirm(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Hiển thị các chấm PIN */}
            <div className="flex gap-3 my-6 justify-center">
              {[0, 1, 2, 3].map(index => {
                const isFilled = index < pin.length;
                return (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-150 border-2 ${
                      isFilled
                        ? 'bg-blue-500 border-blue-500 text-white shadow-md scale-105'
                        : 'bg-white border-gray-300 text-transparent'
                    }`}
                  >
                    {isFilled ? '●' : ''}
                  </div>
                );
              })}
            </div>

            {/* Thông báo thông tin / lỗi */}
            {errorMsg && (
              <div className="text-sm text-red-500 font-semibold mb-3 animate-bounce">
                {errorMsg}
              </div>
            )}
            {resetSuccessMsg && (
              <div className="text-sm text-emerald-600 font-semibold mb-3 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                {resetSuccessMsg}
              </div>
            )}

            {/* Bàn phím số cảm ứng (Numpad) */}
            <div className="grid grid-cols-3 gap-2.5 w-64 max-w-full mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  disabled={isLoading}
                  className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-gray-50 hover:bg-red-50 text-sm font-bold text-gray-500 hover:text-red-600 border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Xóa hết
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-gray-50 hover:bg-amber-50 text-xl font-bold text-gray-600 hover:text-amber-600 border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                title="Xóa ký tự cuối"
              >
                ⌫
              </button>
            </div>

            {/* Nút Quên mã PIN */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
              >
                Quên mã PIN? (Đặt lại về 1234)
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
