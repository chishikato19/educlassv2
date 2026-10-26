import React from 'react';
import type { PickerStudent } from './types.js';
import { Button, Modal } from '@educlass/ui-kit';

export interface ResultModalProps {
  isOpen: boolean;
  student: PickerStudent | null;
  expReward: number;
  onCorrect: () => void;
  onWrong: () => void;
  onQueue: () => void;
  onSkip: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  student,
  expReward,
  onCorrect,
  onWrong,
  onQueue,
  onSkip,
}) => {
  if (!isOpen || !student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onSkip} title="🎉 KẾT QUẢ GỌI HỌC SINH">
      <div className="flex flex-col items-center justify-center p-2 text-center">
        {/* Avatar lớn */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center text-4xl font-extrabold shadow-xl ring-4 ring-amber-200">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-1 -right-1 text-2xl">🎯</span>
        </div>

        {/* Tên học sinh */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-1">
          {student.name}
        </h2>

        {/* Thông tin phụ: Mã học sinh (nếu có), không hiển thị học lực */}
        {student.code && (
          <div className="flex items-center justify-center gap-3 text-sm text-slate-500 mb-6">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
              Mã: {student.code}
            </span>
          </div>
        )}
        {!student.code && <div className="mb-4" />}

        {/* Các nút hành động chính */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Button
            variant="primary"
            onClick={onCorrect}
            className="w-full py-3 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>Trả lời đúng (+{expReward} EXP)</span>
          </Button>

          <Button
            variant="secondary"
            onClick={onWrong}
            className="w-full py-3 text-base font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-2"
          >
            <span>❌</span>
            <span>Trả lời sai (0 EXP)</span>
          </Button>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={onQueue}
            className="w-full py-2.5 text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-1.5"
          >
            <span>⏳</span>
            <span>Cho vào hàng chờ (Lên bảng)</span>
          </Button>

          <Button
            variant="secondary"
            onClick={onSkip}
            className="w-full py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5"
          >
            <span>⏭️</span>
            <span>Bỏ qua lượt này</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
