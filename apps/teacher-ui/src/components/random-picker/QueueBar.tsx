import React from 'react';
import type { PickerQueueItem } from './types.js';
import { ACADEMIC_PERFORMANCE_LABELS } from '@educlass/protocol';
import { Button } from '@educlass/ui-kit';

export interface QueueBarProps {
  queue: PickerQueueItem[];
  expReward: number;
  onGradeStudent: (queueItem: PickerQueueItem, isCorrect: boolean) => void;
  onRemoveFromQueue: (queueItemId: string) => void;
}

export const QueueBar: React.FC<QueueBarProps> = ({
  queue,
  expReward,
  onGradeStudent,
  onRemoveFromQueue,
}) => {
  if (queue.length === 0) {
    return (
      <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-400">
        <span className="mr-2">⏳</span>
        Hàng chờ học sinh lên bảng hiện đang trống. Khi gọi học sinh lên bảng làm bài, bạn có thể bấm &quot;Cho vào hàng chờ&quot; để chấm điểm sau.
      </div>
    );
  }

  const formatWaitTime = (queuedAt: number): string => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - queuedAt) / 1000));
    if (elapsedSeconds < 60) return `${elapsedSeconds}s trước`;
    const minutes = Math.floor(elapsedSeconds / 60);
    return `${minutes}p trước`;
  };

  return (
    <div className="w-full bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏳</span>
          <h3 className="font-bold text-slate-800 text-base">
            Học sinh đang lên bảng làm bài ({queue.length})
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Bấm chấm điểm ngay khi học sinh hoàn thành bài làm
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {queue.map((item) => {
          const perf = item.student.academicPerformance;
          const perfLabel = ACADEMIC_PERFORMANCE_LABELS[perf];

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-100 rounded-xl p-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold text-slate-800 text-sm leading-snug">
                    {item.student.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.student.code && (
                      <span className="text-xs font-mono text-slate-500">
                        {item.student.code}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        perf === 'tot'
                          ? 'bg-emerald-100 text-emerald-800'
                          : perf === 'kha'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {perfLabel}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatWaitTime(item.queuedAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveFromQueue(item.id)}
                  className="text-slate-400 hover:text-red-500 text-sm p-1 rounded transition"
                  title="Xóa khỏi hàng chờ"
                >
                  ✕
                </button>
              </div>

              {/* Nút chấm điểm nhanh */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <Button
                  variant="primary"
                  onClick={() => onGradeStudent(item, true)}
                  className="flex-1 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  ✓ Đúng (+{expReward} EXP)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onGradeStudent(item, false)}
                  className="flex-1 text-xs py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 font-bold"
                >
                  ✕ Sai (0)
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
