// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import {
  QuickPollActivity,
  QuickPollStudentView,
  QuickPollTeacherPanel,
  type QuickPollState,
} from '../index.js';

describe('QuickPoll Activity Plugin (@educlass/activity-quick-poll)', () => {
  const mockCtx: ActivityContext = {
    sessionId: 'sess_1',
    runId: 'run_1',
    now: () => 1728000000000,
    rng: () => 0.5,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };

  it('handles server lifecycle correctly: onStart, onStudentIntent, onTeacherIntent, onEnd', () => {
    // 1. onStart
    const initialState = QuickPollActivity.server.onStart(mockCtx, {
      question: 'Bạn có thích học lập trình?',
      options: ['Rất thích', 'Bình thường', 'Không thích'],
      allowMultiple: false,
    });

    expect(initialState.question).toBe('Bạn có thích học lập trình?');
    expect(initialState.options).toHaveLength(3);
    expect(initialState.isLocked).toBe(false);
    expect(Object.keys(initialState.votes)).toHaveLength(0);

    // 2. onStudentIntent: vote
    const votedState = QuickPollActivity.server.onStudentIntent(mockCtx, initialState, 'p_1', {
      type: 'vote',
      choices: [0],
    });

    expect('ok' in votedState).toBe(false);
    const validState = votedState as QuickPollState;
    expect(validState.votes['p_1']).toEqual([0]);
    expect(mockCtx.grantReward).toHaveBeenCalledWith('p_1', 'participation', 5);

    // 3. onTeacherIntent: toggle_lock
    const lockedState = QuickPollActivity.server.onTeacherIntent(mockCtx, validState, {
      type: 'toggle_lock',
    });
    expect(lockedState.isLocked).toBe(true);

    // 4. onStudentIntent when locked -> rejects
    const rejected = QuickPollActivity.server.onStudentIntent(mockCtx, lockedState, 'p_2', {
      type: 'vote',
      choices: [1],
    });
    expect('ok' in rejected).toBe(true);
    if ('ok' in rejected) {
      expect(rejected.ok).toBe(false);
      expect(rejected.code).toBe('POLL_LOCKED');
    }

    // 5. onEnd
    const results = QuickPollActivity.server.onEnd(mockCtx, validState);
    expect(results).toHaveLength(1);
    expect(results[0]?.participantId).toBe('p_1');
    expect(results[0]?.choices).toEqual([0]);
  });

  it('renders QuickPollStudentView and triggers onSendIntent on option click', () => {
    const handleSendIntent = vi.fn();
    const state: QuickPollState = {
      question: 'Món ăn yêu thích của bạn?',
      options: ['Phở', 'Bánh mì', 'Cơm tấm'],
      votes: {},
      allowMultiple: false,
      isLocked: false,
    };

    render(
      <QuickPollStudentView
        runId="run_1"
        state={state}
        participantId="p_test"
        onSendIntent={handleSendIntent}
      />
    );

    expect(screen.getByText('Món ăn yêu thích của bạn?')).toBeDefined();
    expect(screen.getByText('Phở')).toBeDefined();

    const opt0 = screen.getByTestId('poll-option-0');
    act(() => {
      fireEvent.click(opt0);
    });

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'vote',
      choices: [0],
    });
  });

  it('renders QuickPollTeacherPanel with live statistics and controls', () => {
    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();
    const state: QuickPollState = {
      question: 'Đánh giá tiết học',
      options: ['Tốt', 'Khá', 'Cần cải thiện'],
      votes: {
        p_1: [0],
        p_2: [0],
        p_3: [1],
      },
      allowMultiple: false,
      isLocked: false,
    };

    render(
      <QuickPollTeacherPanel
        runId="run_1"
        state={state}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
      />
    );

    expect(screen.getByText(/3 người đã bình chọn/i)).toBeDefined();
    expect(screen.getByText(/2 phiếu/i)).toBeDefined();

    const lockBtn = screen.getByTestId('btn-toggle-poll-lock');
    act(() => {
      fireEvent.click(lockBtn);
    });
    expect(handleSendIntent).toHaveBeenCalledWith({ type: 'toggle_lock' });

    const endBtn = screen.getByTestId('btn-end-poll-activity');
    act(() => {
      fireEvent.click(endBtn);
    });
    expect(handleEndActivity).toHaveBeenCalled();
  });
});
