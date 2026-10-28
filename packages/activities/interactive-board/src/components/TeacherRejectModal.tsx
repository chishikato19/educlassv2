import React, { useState } from 'react';
import type { BoardPost } from '@educlass/protocol';

export interface TeacherRejectModalProps {
  post: BoardPost;
  onReject: (reason?: string | undefined) => void;
  onClose: () => void;
}

const QUICK_REASONS = [
  'Ảnh chụp bị mờ / thiếu sáng, em hãy chụp lại nhé',
  'Bài làm chưa đầy đủ các bước giải',
  'Chưa đúng yêu cầu trọng tâm của đề bài',
  'Cần bổ sung hình vẽ / sơ đồ giải thích',
];

export const TeacherRejectModal: React.FC<TeacherRejectModalProps> = ({
  post,
  onReject,
  onClose,
}) => {
  const [reason, setReason] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReject(reason.trim() ? reason.trim() : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-rose-50 p-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-lg">
            <span>⚠️</span>
            <span>Yêu cầu chỉnh sửa bài nộp</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Học sinh
            </span>
            <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{post.authorName}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bài sẽ được gửi trả về cho học sinh kèm lý do để các em chỉnh sửa và nộp lại.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              CHỌN NHANH LÝ DO
            </label>
            <div className="space-y-1.5">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition border ${
                    reason === r
                      ? 'bg-rose-50 text-rose-800 border-rose-300 font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              HOẶC NHẬP LÝ DO RIÊNG
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Nhập hướng dẫn cụ thể để học sinh sửa bài..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm text-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[48px] rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition"
            >
              Gửi yêu cầu sửa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
