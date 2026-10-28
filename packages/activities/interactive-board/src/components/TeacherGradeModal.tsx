import React, { useState } from 'react';
import type { BoardPost } from '@educlass/protocol';

export interface TeacherGradeModalProps {
  post: BoardPost;
  maxGrade: number;
  onGrade: (grade: number, feedback?: string | undefined) => void;
  onClose: () => void;
}

export const TeacherGradeModal: React.FC<TeacherGradeModalProps> = ({
  post,
  maxGrade,
  onGrade,
  onClose,
}) => {
  const [grade, setGrade] = useState<number>(post.teacherGrade ?? Math.min(9, maxGrade));
  const [feedback, setFeedback] = useState<string>(post.teacherFeedback || '');

  const quickGrades = maxGrade === 10 ? [6, 7, 8, 8.5, 9, 9.5, 10] : [60, 70, 80, 85, 90, 95, 100];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grade >= 0 && grade <= maxGrade) {
      onGrade(grade, feedback.trim() ? feedback.trim() : undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-lg">
            <span>✍️</span>
            <span>Giáo viên chấm điểm bài làm</span>
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
          <div className="text-center">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Học sinh
            </span>
            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{post.authorName}</h3>
          </div>

          {/* Hiển thị & Nhập điểm số tùy chọn */}
          <div className="flex flex-col items-center justify-center py-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-2">
              <input
                id="custom-grade-input"
                type="number"
                min="0"
                max={maxGrade}
                step="0.1"
                value={grade}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setGrade(
                    isNaN(val) ? 0 : Math.min(maxGrade, Math.max(0, Math.round(val * 10) / 10))
                  );
                }}
                className="w-28 h-14 text-center text-4xl font-black text-emerald-700 bg-white border-2 border-emerald-400 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-200 shadow-inner"
              />
              <span className="text-2xl text-slate-400 font-black">/{maxGrade}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Nhập điểm số tùy ý (hỗ trợ số lẻ 0.1đ) hoặc dùng thanh trượt / chọn nhanh
            </p>

            {/* Thanh trượt điều chỉnh */}
            <div className="w-full px-6 mt-2.5">
              <input
                type="range"
                min="0"
                max={maxGrade}
                step={maxGrade === 10 ? '0.1' : '1'}
                value={grade}
                onChange={e => setGrade(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 rounded-lg"
              />
            </div>
          </div>

          {/* Các nút bấm chọn điểm nhanh */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              HOẶC CHỌN NHANH ĐIỂM SỐ
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickGrades.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGrade(val)}
                  className={`min-h-[44px] px-3 rounded-xl font-bold text-sm transition border ${
                    grade === val
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val} đ
                </button>
              ))}
            </div>
          </div>

          {/* Nhập lời nhận xét của giáo viên */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              LỜI NHẬN XÉT SƯ PHẠM (TÙY CHỌN)
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Nhập lời khen ngợi hoặc lưu ý cần cải thiện cho học sinh..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 resize-none"
            />
          </div>

          {/* Nút hành động */}
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
              className="min-h-[48px] rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition"
            >
              Lưu điểm & Nhận xét
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
