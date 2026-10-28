import React, { useState } from 'react';
import type { BoardPost } from '@educlass/protocol';

export interface PeerGradingModalProps {
  post: BoardPost;
  currentParticipantId: string;
  maxGrade: number;
  onGrade: (score: number) => void;
  onClose: () => void;
}

export const PeerGradingModal: React.FC<PeerGradingModalProps> = ({
  post,
  currentParticipantId,
  maxGrade,
  onGrade,
  onClose,
}) => {
  const existingGrade =
    (post.peerGrades || {})[currentParticipantId]?.score ?? Math.min(8, maxGrade);
  const [score, setScore] = useState<number>(existingGrade);

  // Sinh các nút điểm nhanh tiện lợi
  const quickScores = maxGrade === 10 ? [5, 6, 7, 8, 9, 10] : [50, 60, 70, 80, 90, 100];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score >= 0 && score <= maxGrade) {
      onGrade(score);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 font-bold">
            <span className="text-xl">⭐</span>
            <span>Chấm điểm bài bạn học</span>
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
            <span className="text-xs text-slate-500 uppercase font-semibold">Bài làm của</span>
            <h4 className="text-lg font-extrabold text-slate-800">{post.authorName}</h4>
          </div>

          {/* Ô hiển thị điểm số lớn */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-5xl font-black text-amber-500 tracking-tight flex items-baseline">
              <span>{score}</span>
              <span className="text-lg text-slate-400 font-bold ml-1">/{maxGrade}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">điểm đánh giá</p>
          </div>

          {/* Các nút bấm chọn điểm nhanh */}
          <div className="grid grid-cols-3 gap-2">
            {quickScores.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setScore(val)}
                className={`min-h-[48px] rounded-xl font-bold text-base transition flex items-center justify-center border ${
                  score === val
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {val} đ
              </button>
            ))}
          </div>

          {/* Thanh trượt tinh chỉnh điểm nếu cần */}
          <div className="pt-2">
            <input
              type="range"
              min="0"
              max={maxGrade}
              step={maxGrade === 10 ? '0.5' : '1'}
              value={score}
              onChange={e => setScore(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* 2 nút thao tác dưới */}
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
              className="min-h-[48px] rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition"
            >
              Gửi điểm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
