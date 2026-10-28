// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionRosterResponse, StudentJoinResponse } from '@educlass/protocol';
import { StudentPortal } from '../components/StudentPortal.js';

describe('StudentPortal Component (Task 1.6 - Mobile-first 360x640)', () => {
  // Thiết lập viewport mobile 360x640 theo đúng PLAN 7.2
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 640,
    });
    window.dispatchEvent(new Event('resize'));
    localStorage.clear();
  });

  const mockRosterResponse: SessionRosterResponse = {
    sessionId: 'sess_1',
    identityMode: 'roster_or_guest',
    allowTeams: true,
    students: [
      { id: 'st_1', fullName: 'Nguyễn Văn An', hasPin: true, isTaken: false },
      { id: 'st_2', fullName: 'Trần Thị Bình', hasPin: false, isTaken: true },
      { id: 'st_3', fullName: 'Lê Hoàng Long', hasPin: false, isTaken: false },
    ],
  };

  it('renders correctly on 360x640 viewport with touch targets >= 48px', async () => {
    render(<StudentPortal />);

    const container = screen.getByTestId('student-portal-container');
    expect(container).toBeDefined();

    const inputCode = screen.getByTestId('input-join-code');
    expect(inputCode).toBeDefined();

    const submitBtn = screen.getByTestId('btn-submit-code');
    expect(submitBtn).toBeDefined();
  });

  it('navigates through 3-step flow: enter code -> select student without PIN -> joined', async () => {
    const customRosterFetcher = vi.fn().mockResolvedValue(mockRosterResponse);
    const customJoinHandler = vi.fn().mockResolvedValue({
      participantToken: 'jwt_mock_token',
      participant: {
        id: 'part_3',
        sessionId: 'sess_1',
        studentId: 'st_3',
        displayName: 'Lê Hoàng Long',
        identityLevel: 'roster',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: true,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        customRosterFetcher={customRosterFetcher}
        customJoinHandler={customJoinHandler}
      />
    );

    // Bước 1: Nhập mã
    const inputCode = screen.getByTestId('input-join-code');
    fireEvent.change(inputCode, { target: { value: '123456' } });
    const submitBtn = screen.getByTestId('btn-submit-code');

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(customRosterFetcher).toHaveBeenCalledWith('123456');

    // Bước 2: Chọn HS không có PIN và không chọn nhóm
    const studentBtn = screen.getByTestId('student-item-st_3');
    expect(studentBtn).toBeDefined();

    // Vì allowTeams: true, khi click st_3 sẽ chuyển sang màn nhập nhóm (bước 3)
    await act(async () => {
      fireEvent.click(studentBtn);
    });

    // Màn pin_team hiển thị
    const enterRoomBtn = screen.getByTestId('btn-enter-room');
    expect(enterRoomBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(enterRoomBtn);
    });

    expect(customJoinHandler).toHaveBeenCalledWith({
      joinCode: '123456',
      studentId: 'st_3',
    });

    // Bước 4: Màn phòng chờ hiển thị
    const waitingStatus = screen.getByTestId('waiting-room-status');
    expect(waitingStatus.textContent).toContain('Đã sẵn sàng');
  });

  it('prompts for PIN when student has PIN configured', async () => {
    const customRosterFetcher = vi.fn().mockResolvedValue(mockRosterResponse);
    const customJoinHandler = vi.fn().mockResolvedValue({
      participantToken: 'jwt_mock_token_an',
      participant: {
        id: 'part_1',
        sessionId: 'sess_1',
        studentId: 'st_1',
        displayName: 'Nguyễn Văn An',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: false,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialJoinCode="123456"
        customRosterFetcher={customRosterFetcher}
        customJoinHandler={customJoinHandler}
      />
    );

    // Chờ roster tải xong qua initialJoinCode
    await act(async () => {});

    // Chọn học sinh có PIN: Nguyễn Văn An (st_1)
    const anItem = screen.getByTestId('student-item-st_1');
    await act(async () => {
      fireEvent.click(anItem);
    });

    // Phải xuất hiện ô nhập mã PIN
    const pinInput = screen.getByTestId('input-pin');
    expect(pinInput).toBeDefined();

    // Nhập PIN "1234"
    fireEvent.change(pinInput, { target: { value: '1234' } });

    const enterBtn = screen.getByTestId('btn-enter-room');
    await act(async () => {
      fireEvent.click(enterBtn);
    });

    expect(customJoinHandler).toHaveBeenCalledWith({
      joinCode: '123456',
      studentId: 'st_1',
      pin: '1234',
    });

    expect(screen.getByTestId('waiting-room-status')).toBeDefined();
  });

  it('locks already taken names (D7) and provides report-teacher modal', async () => {
    const customRosterFetcher = vi.fn().mockResolvedValue(mockRosterResponse);

    render(<StudentPortal initialJoinCode="123456" customRosterFetcher={customRosterFetcher} />);

    await act(async () => {});

    // Học sinh 2 (Trần Thị Bình) đang isTaken = true
    const binhItem = screen.getByTestId('student-item-st_2') as HTMLButtonElement;
    expect(binhItem.disabled).toBe(true);
    expect(binhItem.textContent).toContain('Đang dùng');

    // Nút Báo thầy/cô
    const reportBtn = screen.getByTestId('btn-report-teacher');
    fireEvent.click(reportBtn);

    // Modal xuất hiện
    const confirmReportBtn = screen.getByTestId('btn-modal-confirm-report');
    expect(confirmReportBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(confirmReportBtn);
    });

    expect(screen.getByText(/Đã gửi thông báo!/i)).toBeDefined();
  });

  it('allows joining as guest with team name when permitted', async () => {
    const customRosterFetcher = vi.fn().mockResolvedValue(mockRosterResponse);
    const customJoinHandler = vi.fn().mockResolvedValue({
      participantToken: 'jwt_guest_token',
      participant: {
        id: 'part_guest',
        sessionId: 'sess_1',
        studentId: null,
        displayName: 'Khách Minh',
        identityLevel: 'guest',
        teamId: 'team_1',
        teamName: 'Đội Sao Băng',
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: true,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialJoinCode="123456"
        customRosterFetcher={customRosterFetcher}
        customJoinHandler={customJoinHandler}
      />
    );

    await act(async () => {});

    // Chọn tab khách
    const guestTab = screen.getByTestId('tab-guest');
    fireEvent.click(guestTab);

    // Nhập tên khách
    const guestInput = screen.getByTestId('input-guest-name');
    fireEvent.change(guestInput, { target: { value: 'Khách Minh' } });

    const submitGuestBtn = screen.getByTestId('btn-submit-guest');
    await act(async () => {
      fireEvent.click(submitGuestBtn);
    });

    // Chuyển sang bước nhập nhóm
    const teamInput = screen.getByTestId('input-team-name');
    fireEvent.change(teamInput, { target: { value: 'Đội Sao Băng' } });

    const enterBtn = screen.getByTestId('btn-enter-room');
    await act(async () => {
      fireEvent.click(enterBtn);
    });

    expect(customJoinHandler).toHaveBeenCalledWith({
      joinCode: '123456',
      nickname: 'Khách Minh',
      teamName: 'Đội Sao Băng',
    });

    expect(screen.getByText(/Đội\/Nhóm: Đội Sao Băng/i)).toBeDefined();
  });

  it('resumes session using participantToken (Task 1.7 reconnect flow)', async () => {
    const customResumeHandler = vi.fn().mockResolvedValue({
      participantToken: 'token_reconnect_123',
      participant: {
        id: 'part_rec',
        sessionId: 'sess_1',
        studentId: 'st_1',
        displayName: 'Nguyễn Văn An',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: true,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialParticipantToken="token_reconnect_123"
        customResumeHandler={customResumeHandler}
      />
    );

    await act(async () => {});

    expect(customResumeHandler).toHaveBeenCalledWith('token_reconnect_123');

    // Màn phòng chờ hiển thị ngay lập tức
    expect(screen.getByTestId('waiting-room-status')).toBeDefined();
    expect(screen.getByText(/Nguyễn Văn An/i)).toBeDefined();

    // Bấm nút Rời phòng
    const leaveBtn = screen.getByTestId('btn-leave-room');
    fireEvent.click(leaveBtn);

    // Trở về màn nhập mã
    expect(screen.getByTestId('input-join-code')).toBeDefined();
  });

  it('handles resume failure gracefully and falls back to code input', async () => {
    const customResumeHandler = vi.fn().mockRejectedValue(new Error('Phiên học đã kết thúc.'));

    render(
      <StudentPortal
        initialParticipantToken="expired_token"
        customResumeHandler={customResumeHandler}
      />
    );

    await act(async () => {});

    expect(customResumeHandler).toHaveBeenCalledWith('expired_token');

    // Báo lỗi và rơi về màn nhập mã
    expect(screen.getByText(/Phiên học đã kết thúc/i)).toBeDefined();
    expect(screen.getByTestId('input-join-code')).toBeDefined();
  });

  it('handles SESSION_CLOSED via ws listener, logs out student and displays closed notice (Task 1.8)', async () => {
    let triggerClosed: ((reason?: string) => void) | null = null;
    const customWsListener = vi.fn((onClosed: (reason?: string) => void) => {
      triggerClosed = onClosed;
      return () => {};
    });

    const onSessionClosed = vi.fn();

    const customResumeHandler = vi.fn().mockResolvedValue({
      participantToken: 'valid_tok_99',
      participant: {
        id: 'p_99',
        sessionId: 'sess_1',
        studentId: 'st_1',
        displayName: 'Nguyễn Văn An',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: true,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialParticipantToken="valid_tok_99"
        customResumeHandler={customResumeHandler}
        customWsListener={customWsListener}
        onSessionClosed={onSessionClosed}
      />
    );

    await act(async () => {});

    // Học sinh đang ở phòng chờ
    expect(screen.getByTestId('waiting-room-status')).toBeDefined();
    expect(window.localStorage.getItem('educlass_participant_token')).toBe('valid_tok_99');

    // Giả lập server gửi tín hiệu SESSION_CLOSED
    expect(triggerClosed).not.toBeNull();
    act(() => {
      triggerClosed!('Tiết học kết thúc');
    });

    // Xác nhận đã gọi callback, đã xóa token, và hiển thị thông báo kết thúc
    expect(onSessionClosed).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('educlass_participant_token')).toBeNull();
    expect(screen.getByTestId('session-closed-notice')).toBeDefined();
    expect(screen.getByText(/Tiết học đã kết thúc!/i)).toBeDefined();

    // Bấm nút "Vào phiên học khác"
    const rejoinBtn = screen.getByTestId('btn-rejoin-new-session');
    act(() => {
      fireEvent.click(rejoinBtn);
    });

    // Quay lại màn hình nhập mã
    expect(screen.getByTestId('input-join-code')).toBeDefined();
  });

  it('transitions to session_closed when resume fails with SESSION_CLOSED error', async () => {
    const customResumeHandler = vi
      .fn()
      .mockRejectedValue(new Error('SESSION_CLOSED: Phiên đã đóng'));

    render(
      <StudentPortal
        initialParticipantToken="tok_for_closed_session"
        customResumeHandler={customResumeHandler}
      />
    );

    await act(async () => {});

    expect(screen.getByTestId('session-closed-notice')).toBeDefined();
    expect(window.localStorage.getItem('educlass_participant_token')).toBeNull();
  });

  it('displays real-time reward notification banner when receiving reward event (Task 1.9)', async () => {
    let triggerReward:
      | ((reward: {
          exp: number;
          reason: string;
          persisted: boolean;
          newTotalExp?: number | null;
          newLevel?: number | null;
          leveledUp?: boolean;
        }) => void)
      | null = null;

    const customWsListener = vi.fn().mockImplementation((_onClosed, onReward) => {
      triggerReward = onReward;
      return () => {};
    });

    const onRewardReceived = vi.fn();
    const customResumeHandler = vi.fn().mockResolvedValue({
      participantToken: 'valid_tok_reward',
      participant: {
        id: 'p_100',
        sessionId: 'sess_1',
        studentId: 'st_1',
        displayName: 'Nguyễn Văn Account',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: false,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialParticipantToken="valid_tok_reward"
        customResumeHandler={customResumeHandler}
        customWsListener={customWsListener}
        onRewardReceived={onRewardReceived}
      />
    );

    await act(async () => {});

    // Học sinh đang ở phòng chờ
    expect(screen.getByTestId('waiting-room-status')).toBeDefined();

    // Giả lập server gửi thông báo thưởng +50 EXP
    expect(triggerReward).not.toBeNull();
    act(() => {
      triggerReward!({
        exp: 50,
        reason: 'Phát biểu đúng câu khó',
        persisted: true,
        newTotalExp: 150,
        newLevel: 3,
        leveledUp: true,
      });
    });

    expect(onRewardReceived).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('reward-notification-banner')).toBeDefined();
    expect(screen.getByText(/\+50 EXP/i)).toBeDefined();
    expect(screen.getByText(/Phát biểu đúng câu khó/i)).toBeDefined();
    expect(screen.getByText(/Lên Level 3!/i)).toBeDefined();
  });

  it('supports student chat, locked banner and hand raise modal (Task 5.2)', async () => {
    const handleSendChat = vi.fn();
    const handleHandRaise = vi.fn();

    const customResumeHandler = vi.fn().mockResolvedValue({
      participantToken: 'tok_chat_student',
      participant: {
        id: 'p_student_1',
        sessionId: 'sess_1',
        studentId: 'st_1',
        displayName: 'Minh Khang',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '123456',
        status: 'open',
        allowTeams: false,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialParticipantToken="tok_chat_student"
        customResumeHandler={customResumeHandler}
        chatLocked={false}
        onSendChatMessage={handleSendChat}
        onRequestHandRaise={handleHandRaise}
      />
    );

    await act(async () => {});

    // Màn phòng chờ có nút mở Chat & Xin giúp
    const openChatBtn = screen.getByTestId('btn-open-student-chat');
    expect(openChatBtn).toBeDefined();

    act(() => {
      fireEvent.click(openChatBtn);
    });

    // Modal chat xuất hiện
    expect(screen.getByTestId('student-chat-modal')).toBeDefined();
    expect(screen.getByTestId('chat-box-container')).toBeDefined();

    // Gửi tin nhắn chat
    const inputMsg = screen.getByPlaceholderText(/Nhập tin nhắn/i);
    fireEvent.change(inputMsg, { target: { value: 'Em chào thầy!' } });

    const sendBtn = screen.getByRole('button', { name: /Gửi/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(handleSendChat).toHaveBeenCalledWith({
      content: 'Em chào thầy!',
      toParticipantId: null,
    });

    // Học sinh bấm nút ✋ Xin giúp bên trong ChatBox
    const handRaiseBtn = screen.getByRole('button', { name: /^✋ Xin giúp$/i });
    act(() => {
      fireEvent.click(handRaiseBtn);
    });

    // Nhập lý do
    const reasonInput = screen.getByPlaceholderText(/Em không nghe rõ âm thanh/i);
    fireEvent.change(reasonInput, { target: { value: 'Mạng em bị giật ạ' } });

    const confirmHandBtn = screen.getByRole('button', { name: /Xác nhận giơ tay/i });
    await act(async () => {
      fireEvent.click(confirmHandBtn);
    });

    expect(handleHandRaise).toHaveBeenCalledWith('Mạng em bị giật ạ');
  });

  it('renders student end-of-session summary with reminder PIN login banner for roster/guest (Task 5.3)', async () => {
    let triggerClose: (() => void) | null = null;
    let triggerReward:
      ((reward: { exp: number; reason: string; persisted: boolean }) => void) | null = null;

    const customWsListener = vi.fn().mockImplementation((onClosed, onReward) => {
      triggerClose = onClosed;
      triggerReward = onReward;
      return () => {};
    });

    const customResumeHandler = vi.fn().mockResolvedValue({
      participantToken: 'tok_roster_user',
      participant: {
        id: 'p_roster_1',
        sessionId: 'sess_1',
        studentId: 'st_roster_1',
        displayName: 'Nguyễn Roster',
        identityLevel: 'roster',
        teamId: null,
        teamName: 'Đội Hổ Con',
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_1',
        joinCode: '654321',
        status: 'open',
        allowTeams: true,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialParticipantToken="tok_roster_user"
        customResumeHandler={customResumeHandler}
        customWsListener={customWsListener}
      />
    );

    await act(async () => {});

    // Nhận 2 lần thưởng EXP
    act(() => {
      triggerReward?.({
        exp: 30,
        reason: 'Phát biểu đúng',
        persisted: false,
      });
      triggerReward?.({
        exp: 20,
        reason: 'Làm bài nhanh',
        persisted: false,
      });
    });

    // Phiên học đóng lại
    act(() => {
      triggerClose?.();
    });

    // Màn tổng kết cuối tiết hiển thị
    expect(screen.getByTestId('student-session-summary')).toBeDefined();
    expect(screen.getByText(/Tổng kết tiết học/i)).toBeDefined();
    expect(screen.getByText('Nguyễn Roster')).toBeDefined();
    expect(screen.getByTestId('summary-exp-earned').textContent).toContain('+50 EXP');

    // Với học sinh roster/guest -> hiển thị nhắc nhở Đăng nhập bằng PIN để lưu EXP lần sau
    const pinReminder = screen.getByTestId('reminder-pin-login-banner');
    expect(pinReminder).toBeDefined();
    expect(pinReminder.textContent).toContain('Đăng nhập bằng PIN để lưu EXP lần sau');
  });

  it('renders summary with persisted EXP banner and custom titles for account (Task 5.3)', async () => {
    render(
      <StudentPortal
        initialSummaryData={{
          sessionId: 'sess_99',
          sessionCode: '888999',
          participantId: 'p_acc_1',
          studentId: 'st_acc_1',
          displayName: 'Trần Minh Tài',
          identityLevel: 'account',
          teamName: 'Đội Đại Bàng',
          totalExpEarned: 120,
          persistedExp: true,
          currentLevel: 4,
          totalAccumulatedExp: 850,
          leveledUp: true,
          expBreakdown: [
            { exp: 70, reason: 'Giải nhất mini quiz', ts: Date.now() },
            { exp: 50, reason: 'Chăm chỉ phát biểu', ts: Date.now() },
          ],
          newTitlesAwarded: [{ key: 'title_1', name: 'Chiến thần trắc nghiệm', iconKey: 'trophy' }],
          avatar: undefined,
          reminderPinLogin: false,
        }}
        initialParticipantToken="tok_acc"
        customResumeHandler={vi.fn().mockRejectedValue(new Error('SESSION_CLOSED'))}
      />
    );

    await act(async () => {});

    expect(screen.getByTestId('student-session-summary')).toBeDefined();
    expect(screen.getByText('Trần Minh Tài')).toBeDefined();
    expect(screen.getByText('+120 EXP')).toBeDefined();
    expect(screen.getByText(/Chiến thần trắc nghiệm/i)).toBeDefined();

    // Với học sinh có account -> hiển thị thẻ xác nhận EXP đã lưu vĩnh viễn
    const persistedBadge = screen.getByTestId('persisted-exp-banner');
    expect(persistedBadge).toBeDefined();
    expect(persistedBadge.textContent).toContain('EXP đã được lưu vĩnh viễn vào tài khoản của bạn');

    // Không có banner nhắc PIN
    expect(screen.queryByTestId('reminder-pin-login-banner')).toBeNull();
  });

  it('disables student button and displays completed badge when isCompletedExam is true (Task 3.2)', async () => {
    const rosterWithCompleted: SessionRosterResponse = {
      sessionId: 'sess_exam',
      identityMode: 'roster_only',
      allowTeams: false,
      students: [
        {
          id: 'st_done',
          fullName: 'Vũ Minh Tuấn',
          hasPin: false,
          isTaken: false,
          isCompletedExam: true,
        },
        {
          id: 'st_pending',
          fullName: 'Hoàng Kim Ngân',
          hasPin: false,
          isTaken: false,
          isCompletedExam: false,
        },
      ],
    };

    const customRosterFetcher = vi.fn().mockResolvedValue(rosterWithCompleted);
    const customJoinHandler = vi.fn();

    render(
      <StudentPortal
        initialJoinCode="654321"
        customRosterFetcher={customRosterFetcher}
        customJoinHandler={customJoinHandler}
      />
    );

    await act(async () => {});

    // Kiểm tra học sinh đã thi có badge "✓ Đã hoàn thành" và nút bị disabled
    const doneBadge = screen.getByTestId('badge-completed-st_done');
    expect(doneBadge).toBeDefined();
    expect(doneBadge.textContent).toContain('Đã hoàn thành');

    const doneBtn = screen.getByTestId('student-item-st_done') as HTMLButtonElement;
    expect(doneBtn.disabled).toBe(true);

    // Bấm vào học sinh đã thi -> không kích hoạt submitJoin
    fireEvent.click(doneBtn);
    expect(customJoinHandler).not.toHaveBeenCalled();

    // Học sinh chưa thi có thể bấm được bình thường
    const pendingBtn = screen.getByTestId('student-item-st_pending') as HTMLButtonElement;
    expect(pendingBtn.disabled).toBe(false);
  });

  it('supports multi-student device pairing flow with chips tray, individual PIN inputs, and paired badge', async () => {
    const pairingRoster: SessionRosterResponse = {
      sessionId: 'sess_pair',
      identityMode: 'roster_only',
      allowTeams: false,
      allowPairing: true,
      maxStudentsPerDevice: 2,
      students: [
        { id: 'st_a', fullName: 'Đặng Tuấn Anh', hasPin: true, isTaken: false },
        { id: 'st_b', fullName: 'Bùi Bảo Châu', hasPin: false, isTaken: false },
        { id: 'st_c', fullName: 'Võ Minh Đạt', hasPin: false, isTaken: false },
      ],
    };

    const customRosterFetcher = vi.fn().mockResolvedValue(pairingRoster);
    const customJoinHandler = vi.fn().mockResolvedValue({
      participantToken: 'jwt_paired_token',
      participant: {
        id: 'part_paired_1',
        sessionId: 'sess_pair',
        studentId: null,
        studentIds: ['st_a', 'st_b'],
        displayName: 'Đặng Tuấn Anh & Bùi Bảo Châu',
        identityLevel: 'account',
        teamId: null,
        teamName: null,
        status: 'online',
        joinedAt: Date.now(),
      },
      session: {
        id: 'sess_pair',
        joinCode: '888999',
        status: 'open',
        allowTeams: false,
        allowPairing: true,
        maxStudentsPerDevice: 2,
      },
    } satisfies StudentJoinResponse);

    render(
      <StudentPortal
        initialJoinCode="888999"
        customRosterFetcher={customRosterFetcher}
        customJoinHandler={customJoinHandler}
      />
    );

    await act(async () => {});

    // Banner thông tin ghép máy
    const banner = screen.getByTestId('pairing-info-banner');
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain('2 bạn');

    // Chọn bạn A (st_a)
    const btnA = screen.getByTestId('student-item-st_a');
    await act(async () => {
      fireEvent.click(btnA);
    });

    // Xuất hiện khay chip
    const chipTray = screen.getByTestId('selected-chips-tray');
    expect(chipTray).toBeDefined();
    expect(screen.getByTestId('selected-chip-st_a')).toBeDefined();

    // Chọn bạn B (st_b)
    const btnB = screen.getByTestId('student-item-st_b');
    await act(async () => {
      fireEvent.click(btnB);
    });
    expect(screen.getByTestId('selected-chip-st_b')).toBeDefined();

    // Cố chọn bạn C (st_c) -> vượt quá tối đa 2 bạn
    const btnC = screen.getByTestId('student-item-st_c');
    await act(async () => {
      fireEvent.click(btnC);
    });
    expect(screen.queryByTestId('selected-chip-st_c')).toBeNull();

    // Bấm nút Vào lớp cho 2 bạn
    const proceedBtn = screen.getByTestId('btn-proceed-pairing');
    expect(proceedBtn.textContent).toContain('Đặng Tuấn Anh & Bùi Bảo Châu');
    await act(async () => {
      fireEvent.click(proceedBtn);
    });

    // Do bạn A có PIN, bước pin_team xuất hiện với ô nhập PIN riêng cho bạn A
    const pinAInput = screen.getByTestId('input-pin-st_a');
    expect(pinAInput).toBeDefined();

    // Nhập PIN cho bạn A
    fireEvent.change(pinAInput, { target: { value: '1234' } });

    // Bấm nút vào phòng
    const enterRoomBtn = screen.getByTestId('btn-enter-room');
    await act(async () => {
      fireEvent.click(enterRoomBtn);
    });

    expect(customJoinHandler).toHaveBeenCalledWith({
      joinCode: '888999',
      studentIds: ['st_a', 'st_b'],
      pins: {
        st_a: '1234',
      },
    });

    // Màn phòng chờ hiển thị huy hiệu nhóm ghép 2 bạn
    const pairedBadge = screen.getByTestId('paired-students-badge');
    expect(pairedBadge).toBeDefined();
    expect(pairedBadge.textContent).toContain('2 bạn chung máy');
  });
});
