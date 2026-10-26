import { describe, expect, it } from 'vitest';
import type {
  ActivityRunSelect,
  ActivityResultSelect,
  ParticipantSelect,
  RewardLogSelect,
} from '@educlass/db';
import { generateSessionAnalytics } from '../services/session-report-generator.js';

describe('generateSessionAnalytics', () => {
  const mockParticipants: ParticipantSelect[] = [
    {
      id: 'p1',
      sessionId: 'sess-1',
      studentId: 'HS01',
      studentIdsJson: null,
      displayName: 'Nguyễn Văn An',
      identityLevel: 'roster',
      teamId: null,
      status: 'online',
      joinedAt: 1000,
      leftAt: null,
    },
    {
      id: 'p2',
      sessionId: 'sess-1',
      studentId: 'HS02',
      studentIdsJson: null,
      displayName: 'Trần Thị Bích',
      identityLevel: 'roster',
      teamId: null,
      status: 'online',
      joinedAt: 1000,
      leftAt: null,
    },
  ];

  const mockRuns: ActivityRunSelect[] = [
    {
      id: 'run-1',
      sessionId: 'sess-1',
      activityId: 'quiz-live',
      configJson: JSON.stringify({
        title: 'Quiz Khởi Động',
        questions: [
          { id: 'q1', stem: '1 + 1 bằng mấy?' },
          { id: 'q2', stem: 'Thủ đô của Việt Nam là gì?' },
        ],
      }),
      status: 'ended',
      startedAt: 1100,
      endedAt: 1500,
    },
  ];

  const resultsByRun = new Map<string, ActivityResultSelect[]>([
    [
      'run-1',
      [
        {
          id: 'res-1',
          runId: 'run-1',
          participantId: 'p1',
          scoreJson: JSON.stringify({
            score: 1800,
            correctCount: 2,
            totalQuestions: 2,
            answers: {
              '0': { isCorrect: true },
              '1': { isCorrect: true },
            },
          }),
          rank: 1,
        },
        {
          id: 'res-2',
          runId: 'run-1',
          participantId: 'p2',
          scoreJson: JSON.stringify({
            score: 900,
            correctCount: 1,
            totalQuestions: 2,
            answers: {
              '0': { isCorrect: true },
              '1': { isCorrect: false },
            },
          }),
          rank: 2,
        },
      ],
    ],
  ]);

  const mockRewardLogs: RewardLogSelect[] = [
    {
      id: 'rw-1',
      sessionId: 'sess-1',
      participantId: 'p1',
      studentId: 'HS01',
      exp: 50,
      reason: 'quiz_top1',
      persisted: true,
      ts: 1600,
    },
    {
      id: 'rw-2',
      sessionId: 'sess-1',
      participantId: 'p2',
      studentId: 'HS02',
      exp: 20,
      reason: 'quiz_finish',
      persisted: true,
      ts: 1600,
    },
  ];

  it('correctly calculates scoreboard, difficult questions, and summary', () => {
    const analytics = generateSessionAnalytics({
      participants: mockParticipants,
      activityRuns: mockRuns,
      resultsByRun,
      rewardLogs: mockRewardLogs,
    });

    // 1. Kiểm tra Scoreboard
    expect(analytics.scoreboard).toHaveLength(2);
    expect(analytics.scoreboard[0]).toEqual({
      participantId: 'p1',
      displayName: 'Nguyễn Văn An',
      identityLevel: 'roster',
      teamName: null,
      score: 1800,
      correctCount: 2,
      totalQuestions: 2,
      accuracy: 100,
      expEarned: 50,
      rank: 1,
    });
    expect(analytics.scoreboard[1]).toEqual({
      participantId: 'p2',
      displayName: 'Trần Thị Bích',
      identityLevel: 'roster',
      teamName: null,
      score: 900,
      correctCount: 1,
      totalQuestions: 2,
      accuracy: 50,
      expEarned: 20,
      rank: 2,
    });

    // 2. Kiểm tra Difficult Questions
    // q2 bị sai 1/2 lượt (50%), q1 sai 0/2 (0%)
    expect(analytics.difficultQuestions).toHaveLength(2);
    expect(analytics.difficultQuestions[0]?.questionId).toBe('q2');
    expect(analytics.difficultQuestions[0]?.activityId).toBe('quiz-live');
    expect(analytics.difficultQuestions[0]?.activityName).toBe('Quiz Khởi Động');
    expect(analytics.difficultQuestions[0]?.errorRate).toBe(50);
    expect(analytics.difficultQuestions[0]?.incorrectCount).toBe(1);
    expect(analytics.difficultQuestions[0]?.totalAttempts).toBe(2);

    expect(analytics.difficultQuestions[1]?.questionId).toBe('q1');
    expect(analytics.difficultQuestions[1]?.errorRate).toBe(0);

    // 3. Kiểm tra Summary
    expect(analytics.summary.totalQuestions).toBe(2);
    expect(analytics.summary.averageScore).toBe(1350); // (1800 + 900) / 2
    expect(analytics.summary.averageAccuracy).toBe(75); // (100 + 50) / 2
    expect(analytics.summary.totalExpAwarded).toBe(70); // 50 + 20

    // 4. Kiểm tra Gamification & Tổng kết toàn lớp (Task 5.4)
    expect(analytics.gamification).toBeDefined();
    expect(analytics.gamification.topPodium).toHaveLength(2);
    expect(analytics.gamification.topPodium[0]?.displayName).toBe('Nguyễn Văn An');
    expect(analytics.gamification.topPodium[0]?.rank).toBe(1);
    expect(analytics.gamification.identityStats.rosterCount).toBe(2);
    expect(analytics.gamification.identityStats.persistedExpTotal).toBe(70);
    expect(analytics.gamification.identityStats.unpersistedExpTotal).toBe(0);
    expect(analytics.gamification.rosterNeedingPin).toHaveLength(2);
    expect(analytics.gamification.rosterNeedingPin[0]?.displayName).toBe('Nguyễn Văn An');
  });

  it('handles empty participants and activities gracefully', () => {
    const analytics = generateSessionAnalytics({
      participants: [],
      activityRuns: [],
      resultsByRun: new Map(),
      rewardLogs: [],
    });

    expect(analytics.scoreboard).toEqual([]);
    expect(analytics.difficultQuestions).toEqual([]);
    expect(analytics.summary).toEqual({
      totalQuestions: 0,
      averageScore: 0,
      averageAccuracy: 0,
      totalExpAwarded: 0,
    });
  });
});
