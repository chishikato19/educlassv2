import React from 'react';
import type { BoardPost } from '@educlass/protocol';

export interface TeacherAwardModalProps {
  post: BoardPost;
  onAward: (rank: 'top1' | 'top2' | 'top3' | 'creative' | null) => void;
  onClose: () => void;
}

const AWARDS: { id: 'top1' | 'top2' | 'top3' | 'creative'; title: string; subtitle: string; icon: string; bg: string; border: string }[] = [
  {
    id: 'top1',
    title: 'Quán quân (Top 1)',
    subtitle: 'Bài làm xuất sắc và toàn diện nhất lớp (+50 EXP)',
    icon: '🏆',
    bg: 'bg-amber-50 hover:bg-amber-100',
    border: 'border-amber-300',
  },
  {
    id: 'top2',
    title: 'Á quân (Top 2)',
    subtitle: 'Bài làm chất lượng cao và trình bày tốt (+30 EXP)',
    icon: '🥈',
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-300',
  },
  {
    id: 'top3',
    title: 'Quý quân (Top 3)',
    subtitle: 'Ý kiến sắc sảo và đóng góp tích cực (+20 EXP)',
    icon: '🥉',
    bg: 'bg-orange-50 hover:bg-orange-100',
    border: 'border-orange-300',
  },
  {
    id: 'creative',
    title: 'Ý tưởng Sáng tạo',
    subtitle: 'Cách tiếp cận độc đáo, đột phá và bất ngờ (+15 EXP)',
    icon: '💡',
    bg: 'bg-purple-50 hover:bg-purple-100',
    border: 'border-purple-300',
  },
];

export const TeacherAwardModal: React.FC<TeacherAwardModalProps> = ({
  post,
  onAward,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-lg">
            <span>🎖️</span>
            <span>Trao giải danh hiệu bài làm</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-center">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tác giả</span>
            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{post.authorName}</h3>
          </div>

          <div className="space-y-2">
            {AWARDS.map((award) => {
              const isSelected = post.rankAward === award.id;
              return (
                <button
                  key={award.id}
                  type="button"
                  onClick={() => {
                    onAward(award.id);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center gap-3.5 ${award.bg} ${
                    isSelected ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : award.border
                  }`}
                >
                  <span className="text-3xl">{award.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-sm">{award.title}</span>
                      {isSelected && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Đang chọn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{award.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {post.rankAward && (
            <button
              type="button"
              onClick={() => {
                onAward(null);
                onClose();
              }}
              className="w-full min-h-[44px] rounded-xl text-rose-600 font-bold text-sm bg-rose-50 hover:bg-rose-100 transition"
            >
              Hủy giải thưởng hiện tại
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
