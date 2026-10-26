import { describe, expect, it } from 'vitest';
import type { SwissParticipantState, SwissQuestion } from '../swiss-schemas.js';
import {
  calculateBuchholz,
  calculateSwissLeaderboard,
  checkSwissAnswerCorrectness,
  evaluateMatchupResult,
  shuffleList,
  shuffleQuestionOptions,
} from '../swiss-scoring.js';

describe('Swiss Scoring & Evaluation (Đấu Cờ Thụy Sỹ)', () => {
  it('đánh giá câu trả lời đúng cho mcq4, tf, short', () => {
    const qMcq: SwissQuestion = {
      id: 'q1',
      stem: 'Thủ đô của Việt Nam là gì?',
      type: 'mcq4',
      options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'TP HCM'],
      correctAnswer: 0,
      timeLimit: 30,
    };
    expect(checkSwissAnswerCorrectness(qMcq, 0)).toBe(true);
    expect(checkSwissAnswerCorrectness(qMcq, 'A')).toBe(true);
    expect(checkSwissAnswerCorrectness(qMcq, 1)).toBe(false);

    const qTf: SwissQuestion = {
      id: 'q2',
      stem: 'Mặt trời mọc ở hướng đông',
      type: 'tf',
      correctAnswer: true,
      timeLimit: 15,
    };
    expect(checkSwissAnswerCorrectness(qTf, true)).toBe(true);
    expect(checkSwissAnswerCorrectness(qTf, 'đúng')).toBe(true);
    expect(checkSwissAnswerCorrectness(qTf, false)).toBe(false);

    const qShort: SwissQuestion = {
      id: 'q3',
      stem: 'Số nguyên tố chẵn duy nhất là số mấy?',
      type: 'short',
      correctAnswer: ['2', 'hai'],
      timeLimit: 20,
    };
    expect(checkSwissAnswerCorrectness(qShort, '2')).toBe(true);
    expect(checkSwissAnswerCorrectness(qShort, ' hai ')).toBe(true);
    expect(checkSwissAnswerCorrectness(qShort, '3')).toBe(false);
  });

  it('xác định kết quả trận đấu 2 câu: Bằng nhau là Hòa tuyệt đối', () => {
    // Player 1 đúng 2, Player 2 đúng 1 -> P1 Thắng
    expect(evaluateMatchupResult(2, 1)).toBe('player1_win');
    // Player 1 đúng 0, Player 2 đúng 1 -> P2 Thắng
    expect(evaluateMatchupResult(0, 1)).toBe('player2_win');

    // Bằng nhau là Hòa tuyệt đối
    expect(evaluateMatchupResult(2, 2)).toBe('draw');
    expect(evaluateMatchupResult(1, 1)).toBe('draw');
    expect(evaluateMatchupResult(0, 0)).toBe('draw');
  });

  it('tính toán hệ số Buchholz và xếp hạng chính xác', () => {
    const participants: Record<string, SwissParticipantState> = {
      p1: {
        participantId: 'p1',
        displayName: 'Nguyễn An',
        tournamentPoints: 4,
        correctCount: 4,
        matchesWon: 2,
        matchesDrawn: 0,
        matchesLost: 0,
        streak: 2,
        byeCount: 0,
        history: ['p2', 'p3'], // Đã gặp p2 (2đ) và p3 (1đ) -> Buchholz = 3
        currentTable: null,
        isByeThisRound: false,
      },
      p2: {
        participantId: 'p2',
        displayName: 'Trần Bình',
        tournamentPoints: 2,
        correctCount: 2,
        matchesWon: 1,
        matchesDrawn: 0,
        matchesLost: 1,
        streak: 0,
        byeCount: 0,
        history: ['p1'],
        currentTable: null,
        isByeThisRound: false,
      },
      p3: {
        participantId: 'p3',
        displayName: 'Lê Cường',
        tournamentPoints: 1,
        correctCount: 1,
        matchesWon: 0,
        matchesDrawn: 1,
        matchesLost: 1,
        streak: 0,
        byeCount: 0,
        history: ['p1'],
        currentTable: null,
        isByeThisRound: false,
      },
    };

    const buchholzP1 = calculateBuchholz(participants.p1!, participants);
    expect(buchholzP1).toBe(3); // 2 + 1 = 3

    const leaderboard = calculateSwissLeaderboard(participants);
    expect(leaderboard[0]?.participantId).toBe('p1');
    expect(leaderboard[0]?.rank).toBe(1);
    expect(leaderboard[1]?.participantId).toBe('p2');
    expect(leaderboard[1]?.rank).toBe(2);
    expect(leaderboard[2]?.participantId).toBe('p3');
    expect(leaderboard[2]?.rank).toBe(3);
  });

  it('shuffleList xáo trộn mảng nhưng giữ nguyên các phần tử', () => {
    const list = ['A', 'B', 'C', 'D'];
    const shuffled = shuffleList(list, () => 0.3);
    expect(shuffled.length).toBe(4);
    expect(shuffled).toContain('A');
    expect(shuffled).toContain('B');
    expect(shuffled).toContain('C');
    expect(shuffled).toContain('D');
  });

  it('shuffleQuestionOptions xáo trộn options và cập nhật correctAnswer tương ứng', () => {
    const q: SwissQuestion = {
      id: 'q1',
      stem: 'Thủ đô Việt Nam là gì?',
      type: 'mcq4',
      options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'Sài Gòn'],
      correctAnswer: 0, // 'Hà Nội'
      timeLimit: 30,
    };

    // Khi xáo trộn với rng cố định
    const shuffledQ = shuffleQuestionOptions(q, () => 0.7);
    expect(shuffledQ.options?.length).toBe(4);
    expect(shuffledQ.options).toContain('Hà Nội');

    // Vị trí correctAnswer mới phải trỏ đúng vào 'Hà Nội'
    const newIdx = typeof shuffledQ.correctAnswer === 'number' ? shuffledQ.correctAnswer : -1;
    expect(newIdx).toBeGreaterThanOrEqual(0);
    expect(shuffledQ.options?.[newIdx]).toBe('Hà Nội');
    expect(checkSwissAnswerCorrectness(shuffledQ, newIdx)).toBe(true);
  });
});
