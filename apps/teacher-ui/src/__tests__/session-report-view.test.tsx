// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionReportDto } from '@educlass/protocol';
import { SessionReportView } from '../components/SessionReportView.js';

describe('SessionReportView Component (Task 3.4)', () => {
  const mockReport: SessionReportDto = {
    id: 'rep-1',
    sessionId: 'sess-100',
    createdAt: 2000,
    snapshot: {
      sessionId: 'sess-100',
      sessionCode: 'ABC888',
      className: 'Lớp 11B2',
      identityMode: 'roster_or_guest',
      allowTeams: false,
      openedAt: 1000,
      closedAt: 2000,
      totalParticipants: 3,
      onlineParticipants: 0,
      offlineParticipants: 3,
      participants: [
        {
          id: 'p-1',
          studentId: 'HS01',
          displayName: 'Nguyễn Văn An',
          identityLevel: 'roster',
          teamName: null,
          joinedAt: 1010,
          leftAt: 2000,
        },
        {
          id: 'p-2',
          studentId: 'HS02',
          displayName: 'Trần Thị Bình',
          identityLevel: 'roster',
          teamName: null,
          joinedAt: 1020,
          leftAt: 2000,
        },
      ],
      teams: [],
      scoreboard: [
        {
          participantId: 'p-1',
          displayName: 'Nguyễn Văn An',
          identityLevel: 'roster',
          teamName: null,
          score: 1800,
          correctCount: 9,
          totalQuestions: 10,
          accuracy: 90,
          expEarned: 50,
          rank: 1,
        },
        {
          participantId: 'p-2',
          displayName: 'Trần Thị Bình',
          identityLevel: 'roster',
          teamName: null,
          score: 1200,
          correctCount: 6,
          totalQuestions: 10,
          accuracy: 60,
          expEarned: 30,
          rank: 2,
        },
      ],
      difficultQuestions: [
        {
          questionId: 'q-5',
          activityId: 'quiz-live',
          activityName: 'Quiz Khởi Động',
          stem: 'Thủ đô của nước Úc là thành phố nào?',
          totalAttempts: 3,
          correctCount: 1,
          incorrectCount: 2,
          errorRate: 67,
        },
      ],
      summary: {
        totalQuestions: 10,
        averageScore: 1500,
        averageAccuracy: 75,
        totalExpAwarded: 80,
      },
    },
  };

  it('renders report header, summary metrics, and scoreboard correctly', () => {
    render(<SessionReportView report={mockReport} />);

    // Header & Info
    expect(screen.getByText('Báo cáo phiên học: Lớp 11B2')).toBeDefined();
    expect(screen.getByText('ABC888')).toBeDefined();

    // Summary cards
    expect(screen.getByTestId('report-stat-total').textContent).toBe('3');
    expect(screen.getByTestId('report-stat-avg-score').textContent).toBe('1500');
    expect(screen.getByTestId('report-stat-avg-accuracy').textContent).toBe('75%');
    expect(screen.getByTestId('report-stat-total-exp').textContent).toBe('+80');

    // Scoreboard tab default
    expect(screen.getByTestId('scoreboard-row-p-1')).toBeDefined();
    expect(screen.getByText(/Nguyễn Văn An/)).toBeDefined();
    expect(screen.getByText(/1[,.]800/)).toBeDefined();
    expect(screen.getByText(/\+50/)).toBeDefined();

    expect(screen.getByTestId('scoreboard-row-p-2')).toBeDefined();
    expect(screen.getByText(/Trần Thị Bình/)).toBeDefined();
    expect(screen.getByText(/1[,.]200/)).toBeDefined();
    expect(screen.getByText(/\+30/)).toBeDefined();
  });

  it('switches to difficult questions tab and displays severe question warnings', () => {
    render(<SessionReportView report={mockReport} />);

    const tabDifficult = screen.getByTestId('tab-difficult-questions');
    act(() => {
      fireEvent.click(tabDifficult);
    });

    expect(screen.getByTestId('difficult-questions-content')).toBeDefined();
    expect(screen.getByText('Thủ đô của nước Úc là thành phố nào?')).toBeDefined();
    expect(screen.getByTestId('error-rate-q-5').textContent).toContain('67%');
    expect(
      screen.getByText('⚠️ Khuyến nghị: Giáo viên nên giảng lại hoặc cho cả lớp ôn tập kiến thức này.')
    ).toBeDefined();
  });

  it('triggers onExportExcel when clicking export button', async () => {
    const handleExport = vi.fn().mockResolvedValue(undefined);
    render(<SessionReportView report={mockReport} onExportExcel={handleExport} />);

    const exportBtn = screen.getByTestId('btn-export-excel');
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(handleExport).toHaveBeenCalledWith('sess-100');
  });

  it('renders participants list when scoreboard is empty and shows empty difficult questions state', () => {
    const emptyReport: SessionReportDto = {
      ...mockReport,
      snapshot: {
        ...mockReport.snapshot,
        scoreboard: [],
        difficultQuestions: [],
      },
    };

    render(<SessionReportView report={emptyReport} />);

    // Hiển thị danh sách người tham gia thay vì trống
    expect(screen.getByTestId('report-participant-p-1')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();

    const tabDifficult = screen.getByTestId('tab-difficult-questions');
    act(() => {
      fireEvent.click(tabDifficult);
    });

    expect(screen.getByTestId('difficult-empty-state')).toBeDefined();
  });

  it('renders gamification summary and projector mode (Task 5.4)', () => {
    const reportWithGamification: SessionReportDto = {
      ...mockReport,
      snapshot: {
        ...mockReport.snapshot,
        gamification: {
          topPodium: [
            {
              rank: 1,
              participantId: 'p-1',
              displayName: 'Nguyễn Văn An',
              score: 1800,
              expEarned: 50,
              accuracy: 90,
              identityLevel: 'roster',
              teamName: null,
            },
          ],
          newTitlesAwarded: [
            {
              studentId: 'HS01',
              studentName: 'Nguyễn Văn An',
              titleKey: 'star_student',
              titleName: 'Ngôi sao sáng',
              iconKey: 'star',
            },
          ],
          identityStats: {
            accountCount: 0,
            rosterCount: 2,
            guestCount: 0,
            persistedExpTotal: 0,
            unpersistedExpTotal: 80,
          },
          rosterNeedingPin: [
            {
              studentId: 'HS01',
              displayName: 'Nguyễn Văn An',
              expEarned: 50,
            },
          ],
        },
      },
    };

    render(<SessionReportView report={reportWithGamification} defaultTab="gamification" />);

    expect(screen.getByTestId('podium-item-rank-1')).toBeDefined();
    expect(screen.getByTestId('spotlight-title-star_student')).toBeDefined();
    expect(screen.getByTestId('roster-needing-pin-list')).toBeDefined();

    // Toggle Projector Mode
    const btnProjector = screen.getByTestId('btn-projector-mode');
    act(() => {
      fireEvent.click(btnProjector);
    });
    expect(screen.getByTestId('projector-overlay')).toBeDefined();

    const btnExit = screen.getByTestId('btn-exit-projector');
    act(() => {
      fireEvent.click(btnExit);
    });
    expect(screen.queryByTestId('projector-overlay')).toBeNull();
  });
});

