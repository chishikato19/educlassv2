import { describe, it, expect } from 'vitest';
import {
  determinePoolCount,
  distributeIntoPools,
  generatePoolSchedule,
  calculatePoolStandings,
} from '../volleyball-pools.js';
import { generatePlacementBrackets, advanceBracketFinals } from '../volleyball-brackets.js';
import { checkVolleyballAnswerCorrectness, evaluateMatchupResult } from '../volleyball-scoring.js';
import type {
  VolleyballMatchup,
  VolleyballParticipantState,
  VolleyballPool,
  VolleyballQuestion,
} from '../volleyball-schemas.js';

describe('Volleyball Pools Logic', () => {
  it('determines correct pool count based on participants and mode', () => {
    expect(determinePoolCount(16, 'auto')).toBe(4);
    expect(determinePoolCount(23, 'auto')).toBe(4);
    expect(determinePoolCount(24, 'auto')).toBe(8);
    expect(determinePoolCount(36, 'auto')).toBe(8);
    expect(determinePoolCount(40, '4_pools')).toBe(4);
    expect(determinePoolCount(16, '8_pools')).toBe(8);
  });

  it('distributes participants evenly into pools', () => {
    const participants = Array.from({ length: 18 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Học sinh ${i + 1}`,
    }));

    const pools = distributeIntoPools(participants, 4);
    expect(Object.keys(pools)).toEqual(['A', 'B', 'C', 'D']);

    const counts = Object.values(pools).map(p => p.playerIds.length);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(18);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('generates 3 rounds of matchups for pools', () => {
    const participants = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Học sinh ${i + 1}`,
    }));

    const pools = distributeIntoPools(participants, 4);
    const schedule = generatePoolSchedule(pools);

    expect(schedule.length).toBe(3);
    for (const roundMatches of schedule) {
      // 4 bảng x 2 bàn = 8 bàn mỗi lượt
      expect(roundMatches.length).toBe(8);
    }
  });

  it('calculates pool standings with points and tie-breaking', () => {
    const pool: VolleyballPool = {
      id: 'A',
      name: 'Bảng A',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      standings: [],
    };

    const completedMatches: VolleyballMatchup[] = [
      {
        tableNumber: 1,
        stage: 'pool',
        poolId: 'A',
        matchType: 'round_robin',
        player1Id: 'p1',
        player2Id: 'p2',
        player1Score: 2,
        player2Score: 0,
        player1Answered: true,
        player2Answered: true,
        player1Answers: {},
        player2Answers: {},
        player1Results: {},
        player2Results: {},
        player1TimeMs: 1200,
        player2TimeMs: 2500,
        result: 'player1_win',
      },
    ];

    const participantsMap: Record<string, VolleyballParticipantState> = {
      p1: {
        participantId: 'p1',
        displayName: 'Nam',
        poolId: 'A',
        rankInPool: 0,
        tournamentPoints: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        correctCount: 0,
        totalTimeMs: 0,
        currentTable: null,
        tier: null,
        finalRank: null,
        isByeThisRound: false,
      },
      p2: {
        participantId: 'p2',
        displayName: 'An',
        poolId: 'A',
        rankInPool: 0,
        tournamentPoints: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        correctCount: 0,
        totalTimeMs: 0,
        currentTable: null,
        tier: null,
        finalRank: null,
        isByeThisRound: false,
      },
    };

    const standings = calculatePoolStandings(pool, completedMatches, participantsMap);
    expect(standings[0]?.participantId).toBe('p1');
    expect(standings[0]?.tournamentPoints).toBe(2);
    expect(standings[0]?.rankInPool).toBe(1);
    expect(standings[1]?.participantId).toBe('p2');
    expect(standings[1]?.rankInPool).toBe(2);
  });
});

describe('Volleyball Brackets Logic', () => {
  it('generates 4 placement tiers from pool standings', () => {
    const pools: Record<string, VolleyballPool> = {
      A: {
        id: 'A',
        name: 'Bảng A',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p1',
            displayName: 'P1',
            tournamentPoints: 6,
            matchesWon: 3,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 6,
            totalTimeMs: 1000,
          },
          {
            rankInPool: 2,
            participantId: 'p2',
            displayName: 'P2',
            tournamentPoints: 4,
            matchesWon: 2,
            matchesDrawn: 0,
            matchesLost: 1,
            correctCount: 4,
            totalTimeMs: 1200,
          },
          {
            rankInPool: 3,
            participantId: 'p3',
            displayName: 'P3',
            tournamentPoints: 2,
            matchesWon: 1,
            matchesDrawn: 0,
            matchesLost: 2,
            correctCount: 2,
            totalTimeMs: 1400,
          },
          {
            rankInPool: 4,
            participantId: 'p4',
            displayName: 'P4',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 3,
            correctCount: 0,
            totalTimeMs: 1600,
          },
        ],
      },
      B: {
        id: 'B',
        name: 'Bảng B',
        playerIds: ['p5', 'p6', 'p7', 'p8'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p5',
            displayName: 'P5',
            tournamentPoints: 6,
            matchesWon: 3,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 6,
            totalTimeMs: 1000,
          },
          {
            rankInPool: 2,
            participantId: 'p6',
            displayName: 'P6',
            tournamentPoints: 4,
            matchesWon: 2,
            matchesDrawn: 0,
            matchesLost: 1,
            correctCount: 4,
            totalTimeMs: 1200,
          },
          {
            rankInPool: 3,
            participantId: 'p7',
            displayName: 'P7',
            tournamentPoints: 2,
            matchesWon: 1,
            matchesDrawn: 0,
            matchesLost: 2,
            correctCount: 2,
            totalTimeMs: 1400,
          },
          {
            rankInPool: 4,
            participantId: 'p8',
            displayName: 'P8',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 3,
            correctCount: 0,
            totalTimeMs: 1600,
          },
        ],
      },
    };

    const brackets = generatePlacementBrackets(pools);
    expect(brackets.diamond!.playerIds).toEqual(['p1', 'p5']);
    expect(brackets.gold!.playerIds).toEqual(['p2', 'p6']);
    expect(brackets.silver!.playerIds).toEqual(['p3', 'p7']);
    expect(brackets.bronze!.playerIds).toEqual(['p4', 'p8']);
  });

  it('advances winners to final and losers to third place', () => {
    const pools: Record<string, VolleyballPool> = {
      A: {
        id: 'A',
        name: 'A',
        playerIds: ['p1'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p1',
            displayName: 'P1',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 0,
            totalTimeMs: 0,
          },
        ],
      },
      B: {
        id: 'B',
        name: 'B',
        playerIds: ['p2'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p2',
            displayName: 'P2',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 0,
            totalTimeMs: 0,
          },
        ],
      },
      C: {
        id: 'C',
        name: 'C',
        playerIds: ['p3'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p3',
            displayName: 'P3',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 0,
            totalTimeMs: 0,
          },
        ],
      },
      D: {
        id: 'D',
        name: 'D',
        playerIds: ['p4'],
        standings: [
          {
            rankInPool: 1,
            participantId: 'p4',
            displayName: 'P4',
            tournamentPoints: 0,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 0,
            correctCount: 0,
            totalTimeMs: 0,
          },
        ],
      },
    };

    const brackets = generatePlacementBrackets(pools);
    const semiFinals: VolleyballMatchup[] = [
      {
        tableNumber: 1,
        stage: 'bracket',
        tier: 'diamond',
        matchType: 'semi_final',
        player1Id: 'p1',
        player2Id: 'p4',
        player1Score: 2,
        player2Score: 1,
        player1Answered: true,
        player2Answered: true,
        player1Answers: {},
        player2Answers: {},
        player1Results: {},
        player2Results: {},
        player1TimeMs: 1000,
        player2TimeMs: 1200,
        result: 'player1_win',
      },
      {
        tableNumber: 2,
        stage: 'bracket',
        tier: 'diamond',
        matchType: 'semi_final',
        player1Id: 'p2',
        player2Id: 'p3',
        player1Score: 1,
        player2Score: 2,
        player1Answered: true,
        player2Answered: true,
        player1Answers: {},
        player2Answers: {},
        player1Results: {},
        player2Results: {},
        player1TimeMs: 1200,
        player2TimeMs: 900,
        result: 'player2_win',
      },
    ];

    const finals = advanceBracketFinals(brackets, semiFinals);
    expect(finals.length).toBe(2);

    const champ = finals.find(m => m.matchType === 'final');
    expect(champ).toBeDefined();
    // Winners: p1 and p3
    expect([champ?.player1Id, champ?.player2Id].sort()).toEqual(['p1', 'p3'].sort());

    const third = finals.find(m => m.matchType === 'third_place');
    expect(third).toBeDefined();
    // Losers: p4 and p2
    expect([third?.player1Id, third?.player2Id].sort()).toEqual(['p2', 'p4'].sort());
  });
});

describe('Volleyball Scoring Logic', () => {
  const mcq: VolleyballQuestion = {
    id: 'q1',
    type: 'mcq4',
    stem: 'Test',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    timeLimit: 30,
  };

  it('checks mcq answers accurately', () => {
    expect(checkVolleyballAnswerCorrectness(mcq, 1)).toBe(true);
    expect(checkVolleyballAnswerCorrectness(mcq, 'B')).toBe(true);
    expect(checkVolleyballAnswerCorrectness(mcq, 0)).toBe(false);
    expect(checkVolleyballAnswerCorrectness(mcq, null)).toBe(false);
  });

  it('evaluates matchup results', () => {
    expect(evaluateMatchupResult(2, 1)).toBe('player1_win');
    expect(evaluateMatchupResult(0, 1)).toBe('player2_win');
    expect(evaluateMatchupResult(1, 1)).toBe('draw');
  });
});
