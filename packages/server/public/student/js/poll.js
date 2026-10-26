/**
 * EduClass v2 — Student Portal Quick Poll
 * Quản lý hoạt động Bình chọn nhanh (Quick Poll)
 */

import { state } from './state.js';

export function handleQuickPollUpdate(runId, pollState) {
  state.currentRunId = runId;
  state.pollAllowMultiple = Boolean(pollState.allowMultiple);

  if (typeof document === 'undefined') return;

  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  const swissView = document.getElementById('swiss-duel-view');
  if (swissView) swissView.classList.add('hidden');
  document.getElementById('poll-view')?.classList.remove('hidden');

  const questionEl = document.getElementById('poll-question');
  if (questionEl) questionEl.textContent = pollState.question || 'Bình chọn lớp học';
  const instructionEl = document.getElementById('poll-instruction');
  if (instructionEl) {
    instructionEl.textContent = state.pollAllowMultiple
      ? 'Có thể chọn nhiều phương án'
      : 'Nhấn chọn 1 phương án bên dưới';
  }

  const myVotes = (pollState.votes && state.participantId && pollState.votes[state.participantId]) || [];
  const isLocked = Boolean(pollState.isLocked);

  const container = document.getElementById('poll-options-container');
  if (!container) return;
  container.innerHTML = '';

  const feedback = document.getElementById('poll-feedback');
  const submitBtn = document.getElementById('poll-submit-btn');

  if (feedback && submitBtn) {
    if (isLocked) {
      feedback.textContent = '🔒 Bình chọn đã bị khóa bởi thầy cô.';
      feedback.style.background = '#fef3c7';
      feedback.style.color = '#92400e';
      feedback.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    } else if (myVotes.length > 0) {
      feedback.textContent = '✓ Đã ghi nhận ý kiến bình chọn của bạn!';
      feedback.style.background = '#dcfce7';
      feedback.style.color = '#15803d';
      feedback.classList.remove('hidden');
    } else {
      feedback.classList.add('hidden');
    }
  }

  (pollState.options || []).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = myVotes.includes(idx) || state.pollChoices.includes(idx);
    btn.style.cssText = `
      width: 100%; min-height: 52px; padding: 12px 16px; border-radius: 14px;
      font-size: 16px; font-weight: 700; text-align: left; cursor: ${isLocked ? 'not-allowed' : 'pointer'};
      display: flex; align-items: center; justify-content: space-between;
      border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'};
      background-color: ${isSelected ? '#eff6ff' : '#ffffff'};
      color: ${isSelected ? 'var(--color-primary)' : 'var(--color-text)'};
      transition: all 0.15s ease;
    `;
    btn.disabled = isLocked;

    btn.innerHTML = `
      <span>${opt}</span>
      <span style="font-size: 18px;">${isSelected ? '✔' : ''}</span>
    `;

    btn.onclick = () => {
      if (isLocked) return;
      if (state.pollAllowMultiple) {
        if (state.pollChoices.includes(idx)) {
          state.pollChoices = state.pollChoices.filter((c) => c !== idx);
        } else {
          state.pollChoices.push(idx);
        }
        handleQuickPollUpdate(runId, pollState);
        submitBtn?.classList.remove('hidden');
      } else {
        state.pollChoices = [idx];
        submitPollVote([idx]);
      }
    };

    container.appendChild(btn);
  });

  if (submitBtn) {
    if (state.pollAllowMultiple && !isLocked && myVotes.length === 0) {
      submitBtn.classList.remove('hidden');
    } else {
      submitBtn.classList.add('hidden');
    }
  }
}

export async function submitPollVote(choices) {
  if (!state.currentRunId || !state.sessionData) return;
  try {
    await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'vote',
          choices,
        },
      }),
    });
    if (typeof document !== 'undefined') {
      const feedback = document.getElementById('poll-feedback');
      if (feedback) {
        feedback.textContent = '✓ Đã ghi nhận bình chọn của bạn!';
        feedback.style.background = '#dcfce7';
        feedback.style.color = '#15803d';
        feedback.classList.remove('hidden');
      }
      document.getElementById('poll-submit-btn')?.classList.add('hidden');
    }
  } catch {}
}

export function handleSubmitPollMultiple() {
  if (state.pollChoices.length === 0) {
    alert('Vui lòng chọn ít nhất 1 phương án');
    return;
  }
  submitPollVote(state.pollChoices);
}
