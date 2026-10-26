// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { QuizLiveState } from '../quiz-schemas.js';
import {
  QuizLiveProjectorView,
  QuizLiveStudentView,
  QuizLiveTeacherPanel,
} from '../quiz-views.js';

const mockState: QuizLiveState = {
  title: 'Thử thách Tri thức',
  mode: 'kahoot',
  status: 'in_question',
  currentQuestionIndex: 0,
  totalQuestions: 2,
  questions: [
    {
      id: 'q1',
      type: 'mcq4',
      stem: 'Đơn vị đo cường độ dòng điện là gì?',
      options: ['Ampe', 'Vôn', 'Ohm', 'Watt'],
      timeLimit: 20,
      points: 1000,
    },
    {
      id: 'q2',
      type: 'tf',
      stem: 'Nước sôi ở 100 độ C ở áp suất tiêu chuẩn.',
      timeLimit: 15,
      points: 1000,
    },
  ],
  questionStartedAt: 1000,
  timeLimit: 20,
  participants: {
    student_1: {
      participantId: 'student_1',
      displayName: 'Học sinh Tuấn',
      score: 950,
      correctCount: 1,
      currentStreak: 1,
      maxStreak: 1,
      currentIndex: 0,
      isCompleted: false,
      answers: {},
      lastAnswer: null,
    },
  },
  leaderboard: [
    {
      participantId: 'student_1',
      displayName: 'Học sinh Tuấn',
      score: 950,
      rank: 1,
      correctCount: 1,
      currentStreak: 1,
      isCompleted: false,
    },
  ],
  questionStats: {
    totalResponses: 1,
    optionCounts: { '0': 1 },
    correctCount: 1,
  },
};

describe('Quiz Live React Views (Task 3.3)', () => {
  it('renders QuizLiveStudentView with Kahoot color shapes and sends submit_answer intent', () => {
    const handleSendIntent = vi.fn();

    render(
      <QuizLiveStudentView
        runId="run_1"
        state={mockState}
        participantId="student_new"
        onSendIntent={handleSendIntent}
      />
    );

    // Kiểm tra câu hỏi hiển thị
    expect(screen.getByText('Đơn vị đo cường độ dòng điện là gì?')).toBeDefined();

    // Kiểm tra các phương án Kahoot
    expect(screen.getByText('Ampe')).toBeDefined();
    expect(screen.getByText('Vôn')).toBeDefined();

    // Click vào đáp án Ampe (phương án đầu tiên)
    const btnAmpe = screen.getByRole('button', { name: /Lựa chọn ▲: Ampe/i });
    fireEvent.click(btnAmpe);

    expect(handleSendIntent).toHaveBeenCalledWith({
      type: 'submit_answer',
      questionIndex: 0,
      answer: 0,
    });
  });

  it('renders QuizLiveTeacherPanel with controls and question distribution stats', () => {
    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();

    render(
      <QuizLiveTeacherPanel
        runId="run_1"
        state={mockState}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
      />
    );

    // Kiểm tra thông tin hiển thị
    expect(screen.getByText(/Thử thách Tri thức/i)).toBeDefined();
    expect(screen.getByText(/Đã nộp: 1 học sinh/i)).toBeDefined();

    // Click nút Khóa & Xem đáp án
    const reviewBtn = screen.getByText('Khóa & Xem đáp án');
    fireEvent.click(reviewBtn);

    expect(handleSendIntent).toHaveBeenCalledWith({ type: 'show_review' });

    // Click nút Kết thúc Quiz
    const endBtn = screen.getByText(/Kết thúc Quiz/i);
    fireEvent.click(endBtn);

    expect(handleEndActivity).toHaveBeenCalledTimes(1);
  });

  it('renders QuizLiveProjectorView in finished state showing Podium top 3', () => {
    const finishedState: QuizLiveState = {
      ...mockState,
      status: 'finished',
      leaderboard: [
        {
          participantId: 'p1',
          displayName: 'Quán Quân An',
          score: 2800,
          rank: 1,
          correctCount: 3,
          currentStreak: 3,
          isCompleted: true,
        },
        {
          participantId: 'p2',
          displayName: 'Á Quân Bình',
          score: 2400,
          rank: 2,
          correctCount: 2,
          currentStreak: 2,
          isCompleted: true,
        },
      ],
    };

    render(<QuizLiveProjectorView runId="run_1" state={finishedState} />);

    expect(screen.getByText(/BẢNG VÀNG VINH DANH/i)).toBeDefined();
    expect(screen.getByText('Quán Quân An')).toBeDefined();
    expect(screen.getByText('2800 pts')).toBeDefined();
    expect(screen.getByText('Á Quân Bình')).toBeDefined();
  });

  it('renders student immediate feedback with correct answer and explanation in quizizz mode when showCorrectAnswer is enabled', () => {
    const quizizzFeedbackState: QuizLiveState = {
      ...mockState,
      mode: 'quizizz',
      showCorrectAnswer: true,
      participants: {
        student_test: {
          participantId: 'student_test',
          displayName: 'Học sinh Thử nghiệm',
          score: 800,
          correctCount: 0,
          currentStreak: 0,
          maxStreak: 0,
          currentIndex: 1,
          isCompleted: false,
          answers: {
            '0': {
              selectedAnswer: 1, // Vôn (Sai)
              isCorrect: false,
              pointsEarned: 0,
              responseTimeMs: 1200,
              correctAnswer: 0, // Ampe (Đúng)
              explanation: 'Ampe (A) là đơn vị đo cường độ dòng điện trong hệ SI.',
            },
          },
          lastAnswer: {
            questionIndex: 0,
            isCorrect: false,
            pointsEarned: 0,
            newStreak: 0,
            selectedAnswer: 1,
            correctAnswer: 0,
            explanation: 'Ampe (A) là đơn vị đo cường độ dòng điện trong hệ SI.',
          },
        },
      },
    };

    const handleSendIntent = vi.fn();

    render(
      <QuizLiveStudentView
        runId="run_1"
        state={quizizzFeedbackState}
        participantId="student_test"
        onSendIntent={handleSendIntent}
      />
    );

    // Kiểm tra thông báo chưa chính xác
    expect(screen.getByText(/Tiếc quá, chưa chính xác!/i)).toBeDefined();

    // Kiểm tra có badge đáp án đúng và bạn đã chọn
    expect(screen.getByText(/✔ ĐÁP ÁN ĐÚNG/i)).toBeDefined();
    expect(screen.getByText(/✖ BẠN ĐÃ CHỌN/i)).toBeDefined();

    // Kiểm tra hiển thị lời giải thích
    expect(
      screen.getByText(/Ampe \(A\) là đơn vị đo cường độ dòng điện trong hệ SI\./i)
    ).toBeDefined();

    // Bấm nút Câu tiếp theo
    const nextBtn = screen.getByRole('button', { name: /Câu tiếp theo/i });
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn);

    // Sau khi bấm tiếp tục, màn hình chuyển sang câu thứ 2 (câu q2: Nước sôi ở 100 độ C...)
    expect(screen.getByText(/Nước sôi ở 100 độ C ở áp suất tiêu chuẩn\./i)).toBeDefined();
  });
});
