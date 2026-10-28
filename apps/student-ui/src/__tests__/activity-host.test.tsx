// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityHost } from '../components/ActivityHost.js';

describe('ActivityHost UI Component (apps/student-ui)', () => {
  it('renders idle state when no active activity', () => {
    render(<ActivityHost activeActivity={null} participantId="p_1" onSendIntent={vi.fn()} />);

    expect(screen.getByTestId('activity-host-idle')).toBeDefined();
    expect(screen.getByText('Đang chờ hoạt động mới')).toBeDefined();
  });

  it('renders session closed message when isSessionClosed is true', () => {
    render(
      <ActivityHost
        activeActivity={null}
        participantId="p_1"
        onSendIntent={vi.fn()}
        isSessionClosed={true}
      />
    );

    expect(screen.getByTestId('activity-host-closed')).toBeDefined();
    expect(screen.getByText('Tiết học đã kết thúc')).toBeDefined();
  });

  it('renders registered student view when active activity exists', () => {
    const handleSendIntent = vi.fn();
    render(
      <ActivityHost
        activeActivity={{
          runId: 'run_100',
          activityId: 'quick-poll',
          state: {
            question: 'Bạn có thích học trực quan?',
            options: ['Rất thích', 'Thích'],
            votes: {},
            allowMultiple: false,
            isLocked: false,
          },
        }}
        participantId="p_1"
        onSendIntent={handleSendIntent}
      />
    );

    expect(screen.getByTestId('activity-host-running')).toBeDefined();
    expect(screen.getByText('Bạn có thích học trực quan?')).toBeDefined();
    expect(screen.getByText('Rất thích')).toBeDefined();
  });

  it('renders unsupported message when activityId is unknown', () => {
    render(
      <ActivityHost
        activeActivity={{
          runId: 'run_999',
          activityId: 'unknown-mystery-game',
          state: {},
        }}
        participantId="p_1"
        onSendIntent={vi.fn()}
      />
    );

    expect(screen.getByTestId('activity-host-unsupported')).toBeDefined();
    expect(screen.getByText('Hoạt động chưa được hỗ trợ')).toBeDefined();
  });

  it('renders ExamStudentView when activityId is exam in progress', () => {
    const handleSendIntent = vi.fn();
    render(
      <ActivityHost
        activeActivity={{
          runId: 'run_exam_1',
          activityId: 'exam',
          state: {
            title: 'Khảo Sát Toán 12',
            durationMinutes: 45,
            hasPassword: false,
            shuffleQuestions: false,
            shuffleOptions: false,
            status: 'in_progress',
            startedAt: Date.now(),
            expiresAt: Date.now() + 45 * 60 * 1000,
            totalQuestions: 1,
            publicQuestions: [
              {
                id: 'q1',
                type: 'mcq4',
                stem: { text: 'Tập xác định của hàm số là gì?', images: [] },
                options: [
                  { text: 'R', images: [] },
                  { text: 'R \\ {0}', images: [] },
                  { text: '[0; +vô cùng)', images: [] },
                  { text: '(0; +vô cùng)', images: [] },
                ],
                points: 10,
              },
            ],
            participants: {
              p_student: {
                participantId: 'p_student',
                displayName: 'Học sinh Mai',
                authenticated: true,
                startedAt: Date.now(),
                submittedAt: null,
                isSubmitted: false,
                answers: {},
                questionOrder: ['q1'],
                optionOrders: {},
              },
            },
          },
        }}
        participantId="p_student"
        onSendIntent={handleSendIntent}
      />
    );

    expect(screen.getByText('Khảo Sát Toán 12')).toBeDefined();
    expect(screen.getByText('Tập xác định của hàm số là gì?')).toBeDefined();
    expect(screen.getByText('R \\ {0}')).toBeDefined();
    expect(screen.getByText('Nộp bài')).toBeDefined();
  });
});
