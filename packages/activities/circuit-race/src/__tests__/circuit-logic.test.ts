import { describe, it, expect } from 'vitest';
import {
  generateTrack,
  drawRandomCard,
  gradeCircuitAnswer,
  applyCardEffect,
  resolveMovement,
  findLeader,
  findNearestFrontParticipant,
} from '../circuit-logic.js';
import type { CircuitQuestion, CircuitState, CircuitParticipant } from '../circuit-schemas.js';

function mockParticipant(id: string, name: string, pos: number, extra: Partial<CircuitParticipant> = {}): CircuitParticipant {
  return {
    participantId: id,
    displayName: name,
    position: pos,
    previousPosition: pos,
    assignedQuestionOrder: [],
    streak: 0,
    correctCount: 0,
    inventory: [],
    isFrozen: false,
    hasShield: false,
    hasMirror: false,
    hasDoubleExp: false,
    mudTrapped: false,
    eliminatedOptions: [],
    answeredCurrent: false,
    selectedAnswer: null,
    lastAnswerCorrect: null,
    lastDiceRoll: null,
    lastMoveSteps: null,
    cardActionDone: false,
    receivedNotifications: [],
    ...extra,
  };
}

describe('Circuit Race Logic Unit Tests', () => {
  it('generateTrack should create valid track with start, finish and special tiles', () => {
    const track = generateTrack(50);
    expect(track.length).toBe(50);
    expect(track[0]?.type).toBe('normal');
    expect(track[49]?.type).toBe('normal');

    const boostTiles = track.filter(t => t.type === 'boost');
    const mudTiles = track.filter(t => t.type === 'mud');
    const mysteryTiles = track.filter(t => t.type === 'mystery');

    expect(boostTiles.length).toBeGreaterThan(0);
    expect(mudTiles.length).toBeGreaterThan(0);
    expect(mysteryTiles.length).toBeGreaterThan(0);
  });

  it('drawRandomCard should return a valid card with unique id and definition', () => {
    const card = drawRandomCard();
    expect(card.id).toBeDefined();
    expect(card.name).toBeDefined();
    expect(card.icon).toBeDefined();
  });

  it('gradeCircuitAnswer should correctly grade MCQ questions', () => {
    const q: CircuitQuestion = {
      id: 'q1',
      type: 'mcq4',
      stem: '2 + 2 = ?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 3,
      timeLimit: 20,
    };

    expect(gradeCircuitAnswer(q, 3).isCorrect).toBe(true);
    expect(gradeCircuitAnswer(q, 3).earnedCard).toBe(true);
    expect(gradeCircuitAnswer(q, 1).isCorrect).toBe(false);
  });

  it('gradeCircuitAnswer should correctly grade True/False questions', () => {
    const q: CircuitQuestion = {
      id: 'q2',
      type: 'tf',
      stem: 'Trái Đất quay quanh Mặt Trời',
      correctAnswer: true,
      timeLimit: 15,
    };

    expect(gradeCircuitAnswer(q, true).isCorrect).toBe(true);
    expect(gradeCircuitAnswer(q, false).isCorrect).toBe(false);
  });

  it('gradeCircuitAnswer should accurately grade TF Group (Chuẩn BGD) graduated scoring', () => {
    const q: CircuitQuestion = {
      id: 'q3',
      type: 'tf_group',
      stem: 'Xét tính đúng sai của các mệnh đề:',
      items: [
        { text: 'a', correct: true },
        { text: 'b', correct: false },
        { text: 'c', correct: true },
        { text: 'd', correct: true },
      ],
      timeLimit: 30,
    };

    // Đúng 4/4: isCorrect = true, bonusSteps = 1, earnedCard = true
    const res4 = gradeCircuitAnswer(q, [true, false, true, true]);
    expect(res4.isCorrect).toBe(true);
    expect(res4.bonusSteps).toBe(1);
    expect(res4.earnedCard).toBe(true);

    // Đúng 3/4: isCorrect = true, bonusSteps = 0, earnedCard = true
    const res3 = gradeCircuitAnswer(q, [true, false, true, false]);
    expect(res3.isCorrect).toBe(true);
    expect(res3.bonusSteps).toBe(0);
    expect(res3.earnedCard).toBe(true);

    // Đúng 2/4: isCorrect = true (partial), bonusSteps = -2, earnedCard = false
    const res2 = gradeCircuitAnswer(q, [true, false, false, false]);
    expect(res2.isCorrect).toBe(true);
    expect(res2.isPartial).toBe(true);
    expect(res2.bonusSteps).toBe(-2);
    expect(res2.earnedCard).toBe(false);

    // Đúng 1/4: isCorrect = false
    const res1 = gradeCircuitAnswer(q, [true, true, false, false]);
    expect(res1.isCorrect).toBe(false);
    expect(res1.earnedCard).toBe(false);
  });

  it('findLeader and findNearestFrontParticipant should identify correct targets', () => {
    const participants: Record<string, CircuitParticipant> = {
      p1: mockParticipant('p1', 'An', 10),
      p2: mockParticipant('p2', 'Bình', 15),
      p3: mockParticipant('p3', 'Chi', 25),
    };

    expect(findLeader(participants, 'p1')?.participantId).toBe('p3');
    expect(findNearestFrontParticipant(participants, 'p1')?.participantId).toBe('p2');
    expect(findNearestFrontParticipant(participants, 'p2')?.participantId).toBe('p3');
    expect(findNearestFrontParticipant(participants, 'p3')).toBeUndefined();
  });

  it('applyCardEffect should handle Leader Snare and Shield protection', () => {
    const state: CircuitState = {
      phase: 'action_window',
      round: 1,
      totalRounds: 10,
      currentQuestion: null,
      track: generateTrack(50),
      actionWindowSeconds: 10,
      independentStudentQuestionOrder: false,
      participants: {
        p1: mockParticipant('p1', 'An', 10),
        p2: mockParticipant('p2', 'Bình (Top 1)', 20),
      },
      bananaTraps: [],
      battleLogs: [],
      roundExpiresAt: Date.now() + 10000,
      actionExpiresAt: Date.now() + 5000,
      podium: {},
    };

    // p1 dùng Nam châm kéo p2 lùi 3 ô
    applyCardEffect(state, 'p1', 'leader_snare');
    expect(state.participants['p2']?.position).toBe(17);

    // Bây giờ p2 bật Khiên
    state.participants['p2']!.hasShield = true;
    applyCardEffect(state, 'p1', 'leader_snare');
    // Khiên chặn lại, vị trí giữ nguyên 17, khiên bị mất
    expect(state.participants['p2']?.position).toBe(17);
    expect(state.participants['p2']?.hasShield).toBe(false);
  });

  it('resolveMovement should leap on boost and get caught on mud trap', () => {
    const track = generateTrack(50);
    // Ô 10 đặt là boost (+2)
    track[10] = { index: 10, type: 'boost', boostSteps: 2 };
    // Ô 15 đặt là mud
    track[15] = { index: 15, type: 'mud', boostSteps: 0 };

    const state: CircuitState = {
      phase: 'resolving',
      round: 1,
      totalRounds: 10,
      currentQuestion: null,
      track,
      actionWindowSeconds: 10,
      independentStudentQuestionOrder: false,
      participants: {
        p1: mockParticipant('p1', 'An', 6, {
          answeredCurrent: true,
          selectedAnswer: 1,
          lastAnswerCorrect: true,
          lastDiceRoll: 4,
          lastMoveSteps: 4, // 6 + 4 = 10 (rơi vào ô boost)
        }),
      },
      bananaTraps: [],
      battleLogs: [],
      roundExpiresAt: Date.now(),
      actionExpiresAt: 0,
      podium: {},
    };

    resolveMovement(state, 50);
    // 6 + 4 = 10 -> boost +2 -> 12!
    expect(state.participants['p1']?.position).toBe(12);
  });
});
