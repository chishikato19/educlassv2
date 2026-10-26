// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentSessionSummaryItem } from '@educlass/protocol';
import { StudentSessionSummaryView } from '../components/StudentSessionSummaryView.js';

describe('StudentSessionSummaryView Component (Task 5.3 - Mobile-first 360x640)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 640 });
    window.dispatchEvent(new Event('resize'));
  });

  const baseAccountSummary: StudentSessionSummaryItem = {
    sessionId: 'sess_123',
    sessionCode: '654321',
    participantId: 'p_acc_1',
    studentId: 'st_1',
    displayName: 'Nguyễn Văn Minh',
    identityLevel: 'account',
    teamName: 'Đội Chiến Thắng',
    totalExpEarned: 120,
    persistedExp: true,
    currentLevel: 3,
    totalAccumulatedExp: 350,
    leveledUp: true,
    expBreakdown: [
      { reason: 'Trả lời đúng 3 câu Quiz Live', exp: 60, ts: 1700001000000 },
      { reason: 'Hoàn thành kỳ thi', exp: 40, ts: 1700002000000 },
      { reason: 'Thưởng phát biểu tích cực', exp: 20, ts: 1700003000000 },
    ],
    newTitlesAwarded: [
      { key: 'sieu_cap', name: 'Siêu cấp tiến bộ', iconKey: 'rocket' },
    ],
    avatar: {
      base: 'fox',
      color: '#FF6B6B',
      headwear: 'cap',
      glasses: 'sunglasses',
      outfit: 'hoodie',
      wings: 'none',
      held: 'none',
    },
    reminderPinLogin: false,
  };

  it('renders student summary correctly with avatar, EXP, breakdown and new titles for account', () => {
    const handleRejoin = vi.fn();
    render(
      <StudentSessionSummaryView
        summary={baseAccountSummary}
        onRejoin={handleRejoin}
      />
    );

    // Header info
    expect(screen.getByTestId('student-session-summary-view')).toBeDefined();
    expect(screen.getByText(/#654321/)).toBeDefined();
    expect(screen.getByText('Nguyễn Văn Minh')).toBeDefined();
    expect(screen.getByText(/Tài khoản chính thức/i)).toBeDefined();
    expect(screen.getByText(/Đội Chiến Thắng/i)).toBeDefined();

    // EXP Card
    expect(screen.getByTestId('summary-exp-earned').textContent).toContain('+120 EXP');
    expect(screen.getByTestId('summary-levelup-badge')).toBeDefined();
    expect(screen.getByText(/Thăng cấp lên Level 3/i)).toBeDefined();

    // Account exp saved confirmation card
    expect(screen.getByTestId('account-exp-saved-card')).toBeDefined();
    expect(screen.queryByTestId('reminder-pin-login-card')).toBeNull();

    // Breakdown
    expect(screen.getByTestId('summary-exp-breakdown')).toBeDefined();
    expect(screen.getByText(/Trả lời đúng 3 câu Quiz Live/i)).toBeDefined();
    expect(screen.getByText(/Hoàn thành kỳ thi/i)).toBeDefined();

    // New Title
    expect(screen.getByTestId('summary-titles-section')).toBeDefined();
    expect(screen.getByText('Siêu cấp tiến bộ')).toBeDefined();

    // Rejoin button click
    const rejoinBtn = screen.getByTestId('btn-rejoin-new-session');
    fireEvent.click(rejoinBtn);
    expect(handleRejoin).toHaveBeenCalledTimes(1);
  });

  it('displays PIN login reminder banner when student has roster identity without PIN', () => {
    const rosterSummary: StudentSessionSummaryItem = {
      sessionId: 'sess_123',
      sessionCode: '654321',
      participantId: 'p_roster_1',
      studentId: 'st_2',
      displayName: 'Trần Thị Mai',
      identityLevel: 'roster',
      totalExpEarned: 50,
      persistedExp: false,
      currentLevel: 1,
      totalAccumulatedExp: 0,
      leveledUp: false,
      expBreakdown: [{ reason: 'Điểm tham gia tiết học', exp: 50, ts: 1700001000000 }],
      newTitlesAwarded: [],
      reminderPinLogin: true,
    };

    render(<StudentSessionSummaryView summary={rosterSummary} />);

    // Kiểm tra banner nhắc nhở mã PIN theo đúng PLAN 5.3 & D6
    const reminderCard = screen.getByTestId('reminder-pin-login-card');
    expect(reminderCard).toBeDefined();
    expect(reminderCard.textContent).toContain('Đăng nhập bằng PIN để lưu EXP lần sau!');
    expect(reminderCard.textContent).toContain('Học sinh chưa có PIN');
    expect(reminderCard.textContent).toContain('không được lưu vĩnh viễn');
    expect(reminderCard.textContent).toContain('+50 EXP');

    // Không hiển thị thẻ xác nhận lưu vĩnh viễn
    expect(screen.queryByTestId('account-exp-saved-card')).toBeNull();
  });

  it('displays PIN login reminder banner when student has guest identity', () => {
    const guestSummary: StudentSessionSummaryItem = {
      sessionId: 'sess_123',
      sessionCode: '654321',
      participantId: 'p_guest_1',
      displayName: 'Khách Hoàng',
      identityLevel: 'guest',
      totalExpEarned: 30,
      persistedExp: false,
      currentLevel: 1,
      totalAccumulatedExp: 0,
      leveledUp: false,
      expBreakdown: [],
      newTitlesAwarded: [],
      reminderPinLogin: true,
    };

    render(<StudentSessionSummaryView summary={guestSummary} />);

    const reminderCard = screen.getByTestId('reminder-pin-login-card');
    expect(reminderCard).toBeDefined();
    expect(reminderCard.textContent).toContain('Khách tự do');
    expect(reminderCard.textContent).toContain('Đăng nhập bằng PIN để lưu EXP lần sau!');
  });
});
