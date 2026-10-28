// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ExamState } from '../exam-schemas.js';
import { ExamStudentView, ExamTeacherPanel } from '../exam-views.js';

describe('Exam Views (React Components)', () => {
  const baseState: ExamState = {
    title: 'Kỳ Thi Học Kỳ 1',
    durationMinutes: 45,
    hasPassword: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    status: 'ready',
    startedAt: null,
    expiresAt: null,
    totalQuestions: 10,
    participants: {
      'hs-1': {
        participantId: 'hs-1',
        displayName: 'Trần Văn An',
        authenticated: false,
        startedAt: null,
        submittedAt: null,
        isSubmitted: false,
        answers: {},
        questionOrder: [],
        optionOrders: {},
      },
    },
    publicQuestions: [],
  };

  it('renders ExamTeacherPanel with ready status and triggers open_exam', () => {
    const sendIntent = vi.fn();
    render(<ExamTeacherPanel state={baseState} sendIntent={sendIntent} />);

    expect(screen.getByText('Kỳ Thi Học Kỳ 1')).toBeDefined();
    expect(screen.getByText('Chờ bắt đầu')).toBeDefined();
    expect(screen.getByText(/Mở đề & Bắt đầu tính giờ/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Mở đề & Bắt đầu tính giờ/i));
    expect(sendIntent).toHaveBeenCalledWith({ type: 'open_exam' });
  });

  it('renders ExamTeacherPanel in progress status with extend and close options', () => {
    const sendIntent = vi.fn();
    const inProgressState: ExamState = {
      ...baseState,
      status: 'in_progress',
      startedAt: Date.now(),
      expiresAt: Date.now() + 45 * 60 * 1000,
    };

    render(<ExamTeacherPanel state={inProgressState} sendIntent={sendIntent} />);

    expect(screen.getAllByText('Đang làm bài').length).toBeGreaterThan(0);
    expect(screen.getByText('+5 phút (Toàn lớp)')).toBeDefined();
    expect(screen.getByText(/Thu bài.*Khóa thi/i)).toBeDefined();

    fireEvent.click(screen.getByText('+5 phút (Toàn lớp)'));
    expect(sendIntent).toHaveBeenCalledWith({ type: 'extend_time', addMinutes: 5 });

    fireEvent.click(screen.getByText(/Thu bài.*Khóa thi/i));
    expect(sendIntent).toHaveBeenCalledWith({ type: 'close_exam' });
  });

  it('renders ExamStudentView password unlock form when not authenticated', () => {
    const sendIntent = vi.fn();
    render(<ExamStudentView state={baseState} participantId="hs-1" sendIntent={sendIntent} />);

    expect(screen.getByPlaceholderText('Nhập mật khẩu kỳ thi...')).toBeDefined();
    expect(screen.getByText('Mở đề thi')).toBeDefined();

    const input = screen.getByPlaceholderText('Nhập mật khẩu kỳ thi...');
    fireEvent.change(input, { target: { value: 'Secret123' } });
    fireEvent.click(screen.getByText('Mở đề thi'));

    expect(sendIntent).toHaveBeenCalledWith({
      type: 'unlock_exam',
      password: 'Secret123',
    });
  });

  it('renders ExamStudentView waiting screen when authenticated and exam is ready', () => {
    const sendIntent = vi.fn();
    const authenticatedState: ExamState = {
      ...baseState,
      participants: {
        'hs-1': {
          ...baseState.participants['hs-1']!,
          authenticated: true,
        },
      },
    };

    render(
      <ExamStudentView state={authenticatedState} participantId="hs-1" sendIntent={sendIntent} />
    );

    expect(screen.getByText('Đã sẵn sàng · Chờ giáo viên mở đề thi...')).toBeDefined();
  });

  it('renders full exam UI in progress, supports auto-saving answers, bookmarking, and 2-step submit', () => {
    const sendIntent = vi.fn();
    const inProgressState: ExamState = {
      ...baseState,
      status: 'in_progress',
      startedAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // còn 30 phút
      totalQuestions: 2,
      publicQuestions: [
        {
          id: 'q1',
          type: 'mcq4',
          stem: { text: '1 + 1 bằng mấy?', images: [] },
          options: [
            { text: 'Một', images: [] },
            { text: 'Hai', images: [] },
            { text: 'Ba', images: [] },
            { text: 'Bốn', images: [] },
          ],
          points: 5,
        },
        {
          id: 'q2',
          type: 'tf',
          stem: { text: 'Trái Đất quay quanh Mặt Trời.', images: [] },
          points: 5,
        },
      ],
      participants: {
        'hs-1': {
          participantId: 'hs-1',
          displayName: 'Trần Văn An',
          authenticated: true,
          startedAt: Date.now(),
          submittedAt: null,
          isSubmitted: false,
          answers: {},
          questionOrder: ['q1', 'q2'],
          optionOrders: { q1: [0, 1, 2, 3] },
        },
      },
    };

    render(
      <ExamStudentView state={inProgressState} participantId="hs-1" sendIntent={sendIntent} />
    );

    // 1. Kiểm tra hiển thị tiêu đề, đồng hồ và lưới câu
    expect(screen.getByText('Kỳ Thi Học Kỳ 1')).toBeDefined();
    expect(screen.getByText('1 + 1 bằng mấy?')).toBeDefined();
    expect(screen.getByText('Trái Đất quay quanh Mặt Trời.')).toBeDefined();

    // 2. Kiểm tra tự lưu từng lần chọn (Auto-save on select cho MCQ4)
    // Chọn đáp án B (chỉ số 1: 'Hai')
    const optionBButton = screen.getByText('Hai');
    fireEvent.click(optionBButton);

    expect(sendIntent).toHaveBeenCalledWith({
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    });

    // 3. Kiểm tra tự lưu câu hỏi Đúng / Sai (TF)
    const trueButton = screen.getByText('Đúng');
    fireEvent.click(trueButton);

    expect(sendIntent).toHaveBeenCalledWith({
      type: 'save_answer',
      questionId: 'q2',
      answer: true,
    });

    // 4. Kiểm tra nút Đánh dấu xem lại (Bookmark)
    const bookmarkButtons = screen.getAllByText('Đánh dấu');
    expect(bookmarkButtons.length).toBeGreaterThan(0);
    fireEvent.click(bookmarkButtons[0]!);

    expect(screen.getByText('Đã đánh dấu')).toBeDefined();

    // 5. Kiểm tra Nộp bài 2 bước:
    // Bước 1: Bấm nút Nộp bài trên header
    const submitBtn = screen.getAllByText('Nộp bài')[0]!;
    fireEvent.click(submitBtn);

    // Bước 2: Hiển thị Modal xác nhận nộp bài
    expect(screen.getByText('Xác nhận nộp bài thi?')).toBeDefined();
    expect(screen.getByText('Tiếp tục làm bài')).toBeDefined();
    expect(screen.getByText('Xác nhận nộp')).toBeDefined();

    // Bấm Xác nhận nộp trong modal
    fireEvent.click(screen.getByText('Xác nhận nộp'));
    expect(sendIntent).toHaveBeenCalledWith({ type: 'submit_exam' });
  });

  it('auto-submits exam when countdown timer expires (time up)', () => {
    const sendIntent = vi.fn();
    const expiredState: ExamState = {
      ...baseState,
      status: 'in_progress',
      startedAt: Date.now() - 3600 * 1000,
      expiresAt: Date.now() - 1000, // Đã quá giờ
      totalQuestions: 1,
      publicQuestions: [
        {
          id: 'q1',
          type: 'short',
          stem: { text: 'Điền số', images: [] },
          points: 10,
        },
      ],
      participants: {
        'hs-1': {
          participantId: 'hs-1',
          displayName: 'Trần Văn An',
          authenticated: true,
          startedAt: Date.now() - 3600 * 1000,
          submittedAt: null,
          isSubmitted: false,
          answers: {},
          questionOrder: ['q1'],
          optionOrders: {},
        },
      },
    };

    render(<ExamStudentView state={expiredState} participantId="hs-1" sendIntent={sendIntent} />);

    // Tự động gọi submit_exam khi hết giờ
    expect(sendIntent).toHaveBeenCalledWith({ type: 'submit_exam' });
  });

  it('renders ExamTeacherPanel with live monitoring: focus warnings, idle alert, force submit and extend time buttons (Task 4.3)', () => {
    const sendIntent = vi.fn();
    const liveMonitoringState: ExamState = {
      ...baseState,
      status: 'in_progress',
      startedAt: Date.now() - 600 * 1000,
      expiresAt: Date.now() + 20 * 60 * 1000,
      totalQuestions: 10,
      participants: {
        'hs-alert': {
          participantId: 'hs-alert',
          displayName: 'Lê Thảo My',
          authenticated: true,
          startedAt: Date.now() - 600 * 1000,
          submittedAt: null,
          isSubmitted: false,
          answers: { q1: 1, q2: true },
          questionOrder: ['q1', 'q2', 'q3'],
          optionOrders: {},
          currentQuestionIndex: 2,
          currentQuestionId: 'q3',
          answeredCount: 2,
          progressPercent: 20,
          focusLostCount: 3,
          isFocusLost: true,
          lastActiveAt: Date.now() - 150 * 1000, // 2.5 phút trước (idle)
          extendedMinutes: 0,
          individualExpiresAt: null,
        },
      },
    };

    // Mock window.confirm để tự động trả về true khi bấm Thu bài hộ
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ExamTeacherPanel state={liveMonitoringState} sendIntent={sendIntent} />);

    // Kiểm tra tên học sinh và cảnh báo hiển thị trên bảng live
    expect(screen.getByText('Lê Thảo My')).toBeDefined();
    expect(screen.getByText('Câu 3/10')).toBeDefined();
    expect(screen.getByText('Đang rời màn hình!')).toBeDefined();
    expect(screen.getByText(/Đứng im/)).toBeDefined();

    // Bấm nút Thu bài
    const forceSubmitBtn = screen.getByTitle('Chủ động thu bài của thí sinh');
    fireEvent.click(forceSubmitBtn);
    expect(sendIntent).toHaveBeenCalledWith({
      type: 'force_submit_student',
      participantId: 'hs-alert',
    });

    // Bấm nút +5 phút (cộng giờ riêng cho thí sinh)
    const extendStudentBtn = screen.getByTitle('Cộng thêm 5 phút riêng cho thí sinh này');
    fireEvent.click(extendStudentBtn);
    expect(sendIntent).toHaveBeenCalledWith({
      type: 'extend_student_time',
      participantId: 'hs-alert',
      addMinutes: 5,
    });
  });

  it('handles window blur and focus events in ExamStudentView to report focus lost (Task 4.3)', () => {
    const sendIntent = vi.fn();
    const inProgressState: ExamState = {
      ...baseState,
      status: 'in_progress',
      startedAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      totalQuestions: 1,
      publicQuestions: [
        {
          id: 'q1',
          type: 'tf',
          stem: { text: 'Test focus', images: [] },
          points: 10,
        },
      ],
      participants: {
        'hs-1': {
          participantId: 'hs-1',
          displayName: 'Trần Văn An',
          authenticated: true,
          startedAt: Date.now(),
          submittedAt: null,
          isSubmitted: false,
          answers: {},
          questionOrder: ['q1'],
          optionOrders: {},
        },
      },
    };

    render(
      <ExamStudentView state={inProgressState} participantId="hs-1" sendIntent={sendIntent} />
    );

    // Bắn sự kiện blur (rời cửa sổ)
    fireEvent(window, new Event('blur'));
    expect(sendIntent).toHaveBeenCalledWith({
      type: 'report_status',
      isFocusLost: true,
    });

    // Thấy banner cảnh báo mất focus
    expect(screen.getByText(/Bạn vừa rời khỏi màn hình làm bài thi/)).toBeDefined();

    // Bắn sự kiện focus (quay lại)
    fireEvent(window, new Event('focus'));
    expect(sendIntent).toHaveBeenCalledWith({
      type: 'report_status',
      isFocusLost: false,
    });
  });

  it('renders ExamTeacherPanel Report tab with Score Distribution and Question Analysis (Task 4.4)', () => {
    const closedState: ExamState = {
      ...baseState,
      status: 'closed',
      totalQuestions: 2,
      publicQuestions: [
        {
          id: 'q1',
          type: 'mcq4',
          stem: { text: '2 + 2 = ?', images: [] },
          options: [
            { text: '3', images: [] },
            { text: '4', images: [] },
            { text: '5', images: [] },
            { text: '6', images: [] },
          ],
          points: 5,
        },
        {
          id: 'q2',
          type: 'tf',
          stem: { text: 'Nước sôi ở 100 độ C', images: [] },
          points: 5,
        },
      ],
      participants: {
        'hs-1': {
          participantId: 'hs-1',
          displayName: 'Học sinh Giỏi',
          authenticated: true,
          isSubmitted: true,
          submittedAt: Date.now(),
          answers: { q1: 1, q2: true },
          questionOrder: ['q1', 'q2'],
          optionOrders: { q1: [0, 1, 2, 3] },
        },
        'hs-2': {
          participantId: 'hs-2',
          displayName: 'Học sinh Khá',
          authenticated: true,
          isSubmitted: true,
          submittedAt: Date.now(),
          answers: { q1: 1, q2: false },
          questionOrder: ['q1', 'q2'],
          optionOrders: { q1: [0, 1, 2, 3] },
        },
      },
      results: [
        {
          participantId: 'hs-1',
          displayName: 'Học sinh Giỏi',
          score: 10,
          maxScore: 10,
          percentage: 100,
          correctCount: 2,
          totalQuestions: 2,
          rank: 1,
          submittedAt: Date.now(),
        },
        {
          participantId: 'hs-2',
          displayName: 'Học sinh Khá',
          score: 5,
          maxScore: 10,
          percentage: 50,
          correctCount: 1,
          totalQuestions: 2,
          rank: 2,
          submittedAt: Date.now(),
        },
      ],
    };

    render(<ExamTeacherPanel state={closedState} />);

    // Kiểm tra có nút chuyển tab Báo cáo & Phổ điểm
    const reportTabBtn = screen.getByText(/Báo cáo & Phổ điểm/);
    expect(reportTabBtn).toBeDefined();

    // Vì status là closed, mặc định mở tab report hoặc ta click vào tab report
    fireEvent.click(reportTabBtn);

    // Kiểm tra hiển thị tiêu đề các phần của Báo cáo
    expect(screen.getByText('Điểm trung bình')).toBeDefined();
    expect(screen.getByText('Điểm cao nhất')).toBeDefined();
    expect(screen.getByText('Điểm thấp nhất')).toBeDefined();
    expect(screen.getByText(/Tỷ lệ đạt/)).toBeDefined();

    // Kiểm tra Biểu đồ phổ điểm
    expect(screen.getByText(/Phổ điểm kỳ thi/)).toBeDefined();

    // Kiểm tra Phân tích câu hỏi
    expect(screen.getByText(/Phân tích câu hỏi/)).toBeDefined();

    // Kiểm tra Bảng điểm thí sinh
    expect(screen.getByText(/Bảng điểm thí sinh/)).toBeDefined();
    expect(screen.getByText('Học sinh Giỏi')).toBeDefined();
    expect(screen.getByText('Học sinh Khá')).toBeDefined();

    // Kiểm tra có nút Xuất Excel
    const exportBtn = screen.getAllByText(/Xuất Excel \(\.xlsx\)/)[0];
    expect(exportBtn).toBeDefined();
  });
});
