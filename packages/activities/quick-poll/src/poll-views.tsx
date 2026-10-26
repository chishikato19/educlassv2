import React, { useState } from 'react';
import type { QuickPollState } from './poll-activity.js';

/**
 * Giao diện dành cho Học sinh (StudentView)
 */
export interface QuickPollStudentViewProps {
  runId: string;
  state: QuickPollState;
  participantId: string;
  onSendIntent: (intent: unknown) => void;
  disabled?: boolean;
}

export const QuickPollStudentView: React.FC<QuickPollStudentViewProps> = ({
  state,
  participantId,
  onSendIntent,
  disabled = false,
}) => {
  const myVotes = state.votes[participantId] ?? [];
  const [selectedChoices, setSelectedChoices] = useState<number[]>(myVotes);

  const handleSelect = (idx: number) => {
    if (state.isLocked || disabled) return;

    let newChoices: number[];
    if (state.allowMultiple) {
      if (selectedChoices.includes(idx)) {
        newChoices = selectedChoices.filter(c => c !== idx);
      } else {
        newChoices = [...selectedChoices, idx];
      }
    } else {
      newChoices = [idx];
    }
    setSelectedChoices(newChoices);
    onSendIntent({ type: 'vote', choices: newChoices });
  };

  const hasVoted = myVotes.length > 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4" data-testid="quick-poll-student-view">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center space-y-2">
        <span className="text-3xl">📊</span>
        <h3 className="text-xl font-bold text-gray-800">{state.question}</h3>
        <p className="text-xs text-gray-500">
          {state.allowMultiple ? 'Có thể chọn nhiều phương án' : 'Chọn 1 phương án duy nhất'}
          {state.isLocked && <span className="text-red-500 font-semibold block mt-1">Đã khóa bình chọn</span>}
        </p>
      </div>

      <div className="space-y-2.5">
        {state.options.map((opt, idx) => {
          const isSelected = selectedChoices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={state.isLocked || disabled}
              onClick={() => handleSelect(idx)}
              data-testid={`poll-option-${idx}`}
              className={`w-full min-h-[52px] p-3.5 rounded-xl font-medium text-base text-left transition-all flex items-center justify-between border-2 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
              } ${state.isLocked || disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span>{opt}</span>
              <span className="text-lg">{isSelected ? '✅' : '⚪'}</span>
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <div className="text-center p-3 bg-green-50 text-green-800 text-sm font-medium rounded-xl border border-green-200">
          ✓ Lựa chọn của bạn đã được ghi nhận
        </div>
      )}
    </div>
  );
};

/**
 * Giao diện dành cho Giáo viên (TeacherPanel)
 */
export interface QuickPollTeacherPanelProps {
  runId: string;
  state: QuickPollState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
}

export const QuickPollTeacherPanel: React.FC<QuickPollTeacherPanelProps> = ({
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const totalVotes = Object.keys(state.votes).length;

  // Tính số phiếu cho từng phương án
  const optionCounts = state.options.map((_, idx) => {
    let count = 0;
    for (const choices of Object.values(state.votes)) {
      if (choices.includes(idx)) count++;
    }
    return count;
  });

  return (
    <div className="p-6 bg-white rounded-2xl shadow border border-gray-100 space-y-6 max-w-2xl mx-auto" data-testid="quick-poll-teacher-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-xl font-bold text-gray-800">Bình Chọn Nhanh</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {totalVotes} người đã bình chọn
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 mt-1">{state.question}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSendIntent({ type: 'toggle_lock' })}
            data-testid="btn-toggle-poll-lock"
            className="min-h-[44px] px-3.5 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
          >
            {state.isLocked ? '🔓 Mở lại' : '🔒 Khóa bình chọn'}
          </button>
          <button
            type="button"
            onClick={onEndActivity}
            data-testid="btn-end-poll-activity"
            className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm"
          >
            ⏹️ Kết thúc
          </button>
        </div>
      </div>

      {/* Biểu đồ thanh tiến trình thống kê kết quả */}
      <div className="space-y-4">
        {state.options.map((opt, idx) => {
          const count = optionCounts[idx] ?? 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <span>{opt}</span>
                <span>
                  {count} phiếu ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
