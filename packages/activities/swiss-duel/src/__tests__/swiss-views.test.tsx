// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SwissDuelState } from '../swiss-schemas.js';
import {
  SwissDuelProjectorView,
  SwissDuelStudentView,
  SwissDuelTeacherPanel,
} from '../swiss-views.js';

const mockState: SwissDuelState = {
  title: 'Kỳ Thủ Tranh Tài',
  mode: 'questions',
  status: 'in_round',
  currentRound: 1,
  totalRounds: 3,
  shuffleQuestions: true,
  shuffleOptions: true,
  roundQuestions: [
    {
      id: 'q1',
      stem: 'Nước Việt Nam có bao nhiêu tỉnh thành?',
      type: 'mcq4',
      options: ['63', '64', '62', '65'],
      timeLimit: 30,
      correctAnswer: 0,
    },
    {
      id: 'q2',
      stem: 'Đỉnh Phan Xi Păng cao bao nhiêu mét?',
      type: 'mcq4',
      options: ['3143m', '3147m', '3142m', '3140m'],
      timeLimit: 30,
      correctAnswer: 0,
    },
  ],
  roundStartedAt: 1000,
  countdownEndsAt: null,
  matchups: [
    {
      tableNumber: 1,
      player1Id: 'p1',
      player2Id: 'p2',
      player1Score: 0,
      player2Score: 0,
      player1Answered: false,
      player2Answered: false,
      player1Answers: {},
      player2Answers: {},
      player1Results: {},
      player2Results: {},
      result: 'in_progress',
    },
  ],
  byePlayerId: null,
  participants: {
    p1: {
      participantId: 'p1',
      displayName: 'Học sinh An',
      tournamentPoints: 0,
      correctCount: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      streak: 0,
      byeCount: 0,
      history: ['p2'],
      currentTable: 1,
      isByeThisRound: false,
    },
    p2: {
      participantId: 'p2',
      displayName: 'Học sinh Bình',
      tournamentPoints: 0,
      correctCount: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      streak: 0,
      byeCount: 0,
      history: ['p1'],
      currentTable: 1,
      isByeThisRound: false,
    },
  },
  leaderboard: [
    {
      rank: 1,
      participantId: 'p1',
      displayName: 'Học sinh An',
      tournamentPoints: 0,
      correctCount: 0,
      buchholz: 0,
      streak: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      isBye: false,
    },
    {
      rank: 2,
      participantId: 'p2',
      displayName: 'Học sinh Bình',
      tournamentPoints: 0,
      correctCount: 0,
      buchholz: 0,
      streak: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      isBye: false,
    },
  ],
  timeLimitPerQuestion: 30,
  endTime: null,
};

describe('Swiss Duel React Views', () => {
  it('renders SwissDuelStudentView and sends submit_answer intent', () => {
    const handleSendIntent = vi.fn();

    render(
      <SwissDuelStudentView
        runId="run_1"
        state={mockState}
        participantId="p1"
        onSendIntent={handleSendIntent}
      />
    );

    // Kiểm tra câu hỏi hiển thị
    expect(screen.getByText('Nước Việt Nam có bao nhiêu tỉnh thành?')).toBeDefined();
    expect(screen.getByText('63')).toBeDefined();
    expect(screen.getByText('Bàn #1 • Vòng 1')).toBeDefined();

    // Bấm chọn đáp án 63
    const optionA = screen.getByText('63');
    fireEvent.click(optionA);

    // Bấm nút Nộp bài
    const submitBtn = screen.getByText(/XÁC NHẬN NỘP BÀI/i);
    fireEvent.click(submitBtn);

    expect(handleSendIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'submit_round',
        answers: { 0: 0 },
      })
    );
  });

  it('renders SwissDuelTeacherPanel with table matrix', () => {
    const handleSendIntent = vi.fn();
    const handleEndActivity = vi.fn();

    render(
      <SwissDuelTeacherPanel
        runId="run_1"
        state={mockState}
        onSendIntent={handleSendIntent}
        onEndActivity={handleEndActivity}
      />
    );

    expect(screen.getByText('Kỳ Thủ Tranh Tài')).toBeDefined();
    expect(screen.getByText('Bàn #1')).toBeDefined();
    expect(screen.getByText('Học sinh An')).toBeDefined();
    expect(screen.getByText('Học sinh Bình')).toBeDefined();

    // Bấm Kết thúc giải đấu
    const endBtn = screen.getByText('⏹ Kết thúc giải đấu');
    fireEvent.click(endBtn);
    expect(handleEndActivity).toHaveBeenCalledTimes(1);
  });

  it('renders SwissDuelProjectorView in finished state with podium', () => {
    const finishedState: SwissDuelState = {
      ...mockState,
      status: 'finished',
      leaderboard: [
        {
          rank: 1,
          participantId: 'p1',
          displayName: 'Quán Quân An',
          tournamentPoints: 6,
          correctCount: 6,
          buchholz: 4,
          streak: 3,
          matchesWon: 3,
          matchesDrawn: 0,
          matchesLost: 0,
          isBye: false,
        },
        {
          rank: 2,
          participantId: 'p2',
          displayName: 'Á Quân Bình',
          tournamentPoints: 4,
          correctCount: 4,
          buchholz: 4,
          streak: 2,
          matchesWon: 2,
          matchesDrawn: 0,
          matchesLost: 1,
          isBye: false,
        },
      ],
    };

    render(<SwissDuelProjectorView state={finishedState} />);

    expect(screen.getByText(/BẢNG VÀNG ĐẠI KIỆN TƯỚNG/i)).toBeDefined();
    expect(screen.getByText('Quán Quân An')).toBeDefined();
    expect(screen.getByText('6 điểm cờ')).toBeDefined();
    expect(screen.getByText('Á Quân Bình')).toBeDefined();
  });
});
