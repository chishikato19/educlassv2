import React, { useMemo } from 'react';
import type { AssignmentState } from '../assignment-schemas.js';

export interface AssignmentProjectorViewProps {
  state: AssignmentState;
  participants?: Array<{ id: string; displayName: string }>;
}

export const AssignmentProjectorView: React.FC<AssignmentProjectorViewProps> = ({
  state,
  participants = [],
}) => {
  const submissionsMap = state.submissions || {};
  const submittedCount = Object.keys(submissionsMap).length;
  const total = Math.max(participants.length, submittedCount);
  const percent = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

  const displayList = useMemo(() => {
    if (participants.length > 0) {
      return participants.map(p => ({
        id: p.id,
        name: p.displayName,
        submitted: Boolean(submissionsMap[p.id]),
        submittedAt: submissionsMap[p.id]?.submittedAt,
      }));
    }
    return Object.values(submissionsMap).map(s => ({
      id: s.participantId,
      name: s.studentName,
      submitted: true,
      submittedAt: s.submittedAt,
    }));
  }, [participants, submissionsMap]);

  return (
    <div className="w-full h-screen bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col p-6 md:p-10 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-3xl shadow-lg">
            📁
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{state.title || 'Thu - phát bài tập'}</h1>
            <p className="text-sm text-indigo-200/80 mt-0.5">
              {state.isLocked ? '🔒 Cổng nộp bài đã đóng' : '🟢 Đang mở cổng thu bài trực tiếp'}
            </p>
          </div>
        </div>

        {/* Big Progress Counter */}
        <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
          <div className="text-right">
            <span className="text-xs text-indigo-300 font-semibold block uppercase tracking-wider">Tiến độ nộp bài</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400">{percent}%</span>
          </div>
          <div className="h-10 w-px bg-white/15" />
          <div className="text-left">
            <span className="text-xs text-indigo-300 font-semibold block uppercase tracking-wider">Số học sinh</span>
            <span className="text-2xl md:text-3xl font-black text-white">
              {submittedCount} <span className="text-lg font-normal text-white/50">/ {total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-3 rounded-full mt-6 overflow-hidden p-0.5 border border-white/10 shrink-0">
        <div
          className="bg-linear-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Students Grid */}
      <div className="flex-1 mt-6 overflow-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayList.map((st, idx) => (
            <div
              key={st.id || idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                st.submitted
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 shadow-md scale-[1.02]'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    st.submitted ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {st.submitted ? '✓' : '…'}
                </span>
              </div>
              <p className="text-sm font-bold truncate text-white" title={st.name}>
                {st.name}
              </p>
              <p className="text-[11px] opacity-70 mt-1">
                {st.submitted ? 'Đã hoàn thành' : 'Đang làm bài...'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
