// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionReportDto } from '@educlass/protocol';
import { TeacherSessionSummaryView } from '../components/TeacherSessionSummaryView.js';

describe('TeacherSessionSummaryView Component (Task 5.4)', () => {
  const mockReportWithGamification: SessionReportDto = {
    id: 'rep-1',
    sessionId: 'sess-100',
    createdAt: 2000,
    snapshot: {
      sessionId: 'sess-100',
      sessionCode: 'ABC888',
      className: 'Lớp 11B2',
      identityMode: 'roster_or_guest',
      allowTeams: true,
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
          teamName: 'Đội Rồng Lửa',
          joinedAt: 1010,
          leftAt: 2000,
        },
        {
          id: 'p-2',
          studentId: 'HS02',
          displayName: 'Trần Thị Bình',
          identityLevel: 'roster',
          teamName: 'Đội Hổ Trắng',
          joinedAt: 1020,
          leftAt: 2000,
        },
        {
          id: 'p-3',
          studentId: 'HS03',
          displayName: 'Lê Hoàng Cường',
          identityLevel: 'account',
          teamName: 'Đội Rồng Lửa',
          joinedAt: 1030,
          leftAt: 2000,
        },
      ],
      teams: [
        { id: 't-1', name: 'Đội Rồng Lửa', memberCount: 2 },
        { id: 't-2', name: 'Đội Hổ Trắng', memberCount: 1 },
      ],
      scoreboard: [
        {
          participantId: 'p-1',
          displayName: 'Nguyễn Văn An',
          identityLevel: 'roster',
          teamName: 'Đội Rồng Lửa',
          score: 1800,
          correctCount: 9,
          totalQuestions: 10,
          accuracy: 90,
          expEarned: 50,
          rank: 1,
          avatar: { base: 'dragon', color: '#EF4444', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
        },
        {
          participantId: 'p-2',
          displayName: 'Trần Thị Bình',
          identityLevel: 'roster',
          teamName: 'Đội Hổ Trắng',
          score: 1200,
          correctCount: 6,
          totalQuestions: 10,
          accuracy: 60,
          expEarned: 30,
          rank: 2,
          avatar: { base: 'fox', color: '#3B82F6', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
        },
        {
          participantId: 'p-3',
          displayName: 'Lê Hoàng Cường',
          identityLevel: 'account',
          teamName: 'Đội Rồng Lửa',
          score: 1000,
          correctCount: 5,
          totalQuestions: 10,
          accuracy: 50,
          expEarned: 20,
          rank: 3,
          avatar: { base: 'bear', color: '#10B981', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
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
        averageScore: 1333,
        averageAccuracy: 67,
        totalExpAwarded: 100,
      },
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
            teamName: 'Đội Rồng Lửa',
            avatar: { base: 'dragon', color: '#EF4444', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
          },
          {
            rank: 2,
            participantId: 'p-2',
            displayName: 'Trần Thị Bình',
            score: 1200,
            expEarned: 30,
            accuracy: 60,
            identityLevel: 'roster',
            teamName: 'Đội Hổ Trắng',
            avatar: { base: 'fox', color: '#3B82F6', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
          },
          {
            rank: 3,
            participantId: 'p-3',
            displayName: 'Lê Hoàng Cường',
            score: 1000,
            expEarned: 20,
            accuracy: 50,
            identityLevel: 'account',
            teamName: 'Đội Rồng Lửa',
            avatar: { base: 'bear', color: '#10B981', headwear: 'none', glasses: 'none', outfit: 'default', wings: 'none', held: 'none' },
          },
        ],
        newTitlesAwarded: [
          {
            studentId: 'HS01',
            studentName: 'Nguyễn Văn An',
            titleKey: 'quiz_champion',
            titleName: 'Quán quân Quiz',
            iconKey: 'crown',
          },
        ],
        identityStats: {
          accountCount: 1,
          rosterCount: 2,
          guestCount: 0,
          persistedExpTotal: 20,
          unpersistedExpTotal: 80,
        },
        rosterNeedingPin: [
          {
            studentId: 'HS01',
            displayName: 'Nguyễn Văn An',
            expEarned: 50,
          },
          {
            studentId: 'HS02',
            displayName: 'Trần Thị Bình',
            expEarned: 30,
          },
        ],
      },
    },
  };

  it('renders gamification overview with Podium, Titles Spotlight, and Identity Stats by default', () => {
    render(<TeacherSessionSummaryView report={mockReportWithGamification} />);

    // Header & Summary stats
    expect(screen.getByText('Báo cáo phiên học: Lớp 11B2')).toBeDefined();
    expect(screen.getByTestId('report-stat-total').textContent).toBe('3');
    expect(screen.getByTestId('report-stat-total-exp').textContent).toBe('+100');

    // Tab Gamification
    expect(screen.getByTestId('gamification-content')).toBeDefined();

    // Podium checks
    expect(screen.getByTestId('podium-item-rank-1')).toBeDefined();
    expect(screen.getByTestId('podium-item-rank-2')).toBeDefined();
    expect(screen.getByTestId('podium-item-rank-3')).toBeDefined();
    expect(screen.getByText('BỤC VINH DANH TOÀN LỚP (TOP 3 XUẤT SẮC NHẤT)')).toBeDefined();

    // Spotlight New Titles
    expect(screen.getByTestId('spotlight-title-quiz_champion')).toBeDefined();
    expect(screen.getByText('Vừa đạt danh hiệu Quán quân Quiz')).toBeDefined();

    // Identity stats & Roster needing PIN
    expect(screen.getByText(/1 HS \(Đã lưu vào DB\)/)).toBeDefined();
    expect(screen.getByText(/2 HS \(Lưu tạm thời\)/)).toBeDefined();
    expect(screen.getByTestId('roster-needing-pin-list')).toBeDefined();
    expect(screen.getByTestId('roster-pin-item-0')).toBeDefined();
  });

  it('switches between tabs (Scoreboard, Difficult questions, Gamification)', () => {
    render(<TeacherSessionSummaryView report={mockReportWithGamification} />);

    // Switch to Scoreboard
    const tabScoreboard = screen.getByTestId('tab-scoreboard');
    act(() => {
      fireEvent.click(tabScoreboard);
    });
    expect(screen.getByTestId('scoreboard-content')).toBeDefined();
    expect(screen.getByTestId('scoreboard-row-p-1')).toBeDefined();

    // Switch to Difficult questions
    const tabDifficult = screen.getByTestId('tab-difficult-questions');
    act(() => {
      fireEvent.click(tabDifficult);
    });
    expect(screen.getByTestId('difficult-questions-content')).toBeDefined();
    expect(screen.getByTestId('difficult-question-row-q-5')).toBeDefined();

    // Switch back to Gamification
    const tabGamification = screen.getByTestId('tab-gamification');
    act(() => {
      fireEvent.click(tabGamification);
    });
    expect(screen.getByTestId('gamification-content')).toBeDefined();
  });

  it('toggles Projector Mode presentation view and handles ESC key', () => {
    render(<TeacherSessionSummaryView report={mockReportWithGamification} />);

    // Click Projector Mode button
    const btnProjector = screen.getByTestId('btn-projector-mode');
    act(() => {
      fireEvent.click(btnProjector);
    });

    // Check Projector Overlay exists
    expect(screen.getByTestId('projector-overlay')).toBeDefined();
    expect(screen.getByText('EduClass Live • Lễ Vinh Danh Tiết Học')).toBeDefined();
    expect(screen.getByText('LỚP 11B2')).toBeDefined();

    // Press Escape to exit
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByTestId('projector-overlay')).toBeNull();

    // Re-open and exit using button
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

  it('handles empty gamification and empty roster pin gracefully', () => {
    const emptyReport: SessionReportDto = {
      ...mockReportWithGamification,
      snapshot: {
        ...mockReportWithGamification.snapshot,
        scoreboard: [],
        gamification: {
          topPodium: [],
          newTitlesAwarded: [],
          identityStats: {
            accountCount: 0,
            rosterCount: 0,
            guestCount: 0,
            persistedExpTotal: 0,
            unpersistedExpTotal: 0,
          },
          rosterNeedingPin: [],
        },
      },
    };

    render(
      <TeacherSessionSummaryView
        report={emptyReport}
        defaultTab="gamification"
      />
    );

    expect(screen.getByTestId('podium-empty')).toBeDefined();
    expect(screen.getByTestId('titles-spotlight-empty')).toBeDefined();
    expect(screen.getByTestId('roster-pin-empty')).toBeDefined();
  });

  it('triggers onExportExcel and onNewSession callbacks when clicked', async () => {
    const handleExport = vi.fn().mockResolvedValue(undefined);
    const handleNewSession = vi.fn();

    render(
      <TeacherSessionSummaryView
        report={mockReportWithGamification}
        onExportExcel={handleExport}
        onNewSession={handleNewSession}
      />
    );

    const btnExport = screen.getByTestId('btn-export-excel');
    await act(async () => {
      fireEvent.click(btnExport);
    });
    expect(handleExport).toHaveBeenCalledWith('sess-100');

    const btnNew = screen.getByTestId('btn-new-session-from-report');
    act(() => {
      fireEvent.click(btnNew);
    });
    expect(handleNewSession).toHaveBeenCalledTimes(1);
  });
});
