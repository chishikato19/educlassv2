import React from 'react';
import type { BoardPost } from '@educlass/protocol';

export interface PeerGradesDetailModalProps {
  post: BoardPost;
  maxGrade: number;
  onClose: () => void;
}

export const PeerGradesDetailModal: React.FC<PeerGradesDetailModalProps> = ({
  post,
  maxGrade,
  onClose,
}) => {
  const gradesList = Object.values(post.peerGrades || {});

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        {/* Tiêu đề modal */}
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <span className="text-xl">📊</span>
            <span>Chi tiết điểm bạn học chấm</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            ✕
          </button>
        </div>

        {/* Thống kê điểm trung bình tổng quan */}
        <div className="p-4 bg-gradient-to-b from-blue-50/50 to-white flex flex-col items-center justify-center border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium">Bài làm của {post.authorName}</span>
          <div className="text-4xl font-black text-blue-600 mt-1 flex items-baseline">
            <span>{post.peerAverageScore !== null ? post.peerAverageScore : 'Chưa có'}</span>
            <span className="text-base text-slate-400 font-bold ml-1">★ / {maxGrade}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng: <strong>{gradesList.length}</strong> bạn đã tham gia chấm
          </p>
        </div>

        {/* Danh sách chi tiết ai chấm mấy điểm */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {gradesList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <span className="text-2xl block mb-1">⏳</span>
              Chưa có bạn nào chấm điểm bài này
            </div>
          ) : (
            gradesList.map(item => (
              <div
                key={item.participantId}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {item.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{item.authorName}</span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-blue-600 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl">
                    {item.score} đ
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Nút Đóng */}
        <div className="p-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
