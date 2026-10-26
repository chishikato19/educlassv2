import type {
  ActivityRunSelect,
  ActivityResultSelect,
  ParticipantSelect,
  RewardLogSelect,
  TeamSelect,
} from '@educlass/db';
import type {
  AvatarConfig,
  SessionDifficultQuestionItem,
  SessionGamificationSummary,
  SessionReportSummary,
  SessionStudentScoreItem,
} from '@educlass/protocol';

export interface GenerateAnalyticsParams {
  participants: ParticipantSelect[];
  teams?: TeamSelect[] | Array<{ id: string; name: string }>;
  activityRuns: ActivityRunSelect[];
  resultsByRun: Map<string, ActivityResultSelect[]>;
  rewardLogs: RewardLogSelect[];
  studentAvatars?: Map<string, AvatarConfig>;
  titlesAwarded?: Array<{
    studentId: string;
    studentName: string;
    titleKey: string;
    titleName: string;
    iconKey: string;
  }>;
}

export interface GeneratedSessionAnalytics {
  scoreboard: SessionStudentScoreItem[];
  difficultQuestions: SessionDifficultQuestionItem[];
  summary: SessionReportSummary;
  gamification: SessionGamificationSummary;
}

/**
 * Tổng hợp các chỉ số báo cáo nâng cao của phiên học:
 * 1. Scoreboard (Bảng điểm học sinh: tổng điểm, số câu đúng, độ chính xác, EXP nhận được, xếp hạng)
 * 2. Difficult Questions (Danh sách câu hỏi sai nhiều: số lượt làm, số lượt sai, tỉ lệ sai %, xếp giảm dần)
 * 3. Summary (Tổng số câu hỏi, điểm trung bình, độ chính xác trung bình, tổng EXP đã trao)
 */
export function generateSessionAnalytics(
  params: GenerateAnalyticsParams
): GeneratedSessionAnalytics {
  const {
    participants,
    teams = [],
    activityRuns,
    resultsByRun,
    rewardLogs,
    studentAvatars,
    titlesAwarded = [],
  } = params;

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  // 1. Gom điểm thưởng EXP của từng người tham gia trong phiên
  const expByParticipant = new Map<string, number>();
  let totalExpAwarded = 0;
  for (const log of rewardLogs) {
    const current = expByParticipant.get(log.participantId) ?? 0;
    expByParticipant.set(log.participantId, current + log.exp);
    totalExpAwarded += log.exp;
  }

  // 2. Gom điểm và số câu đúng/tổng câu từ tất cả lượt chạy hoạt động
  interface ParticipantRunTotals {
    score: number;
    correctCount: number;
    totalQuestions: number;
  }
  const totalsByParticipant = new Map<string, ParticipantRunTotals>();

  for (const p of participants) {
    totalsByParticipant.set(p.id, { score: 0, correctCount: 0, totalQuestions: 0 });
  }

  for (const run of activityRuns) {
    const results = resultsByRun.get(run.id) ?? [];
    for (const res of results) {
      let parsedScore: { score?: number; correctCount?: number; totalQuestions?: number } = {};
      try {
        parsedScore = JSON.parse(res.scoreJson) as {
          score?: number;
          correctCount?: number;
          totalQuestions?: number;
        };
      } catch {
        // bỏ qua lỗi JSON hỏng
      }
      const current = totalsByParticipant.get(res.participantId) ?? {
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
      };
      current.score += Number(parsedScore.score ?? 0);
      current.correctCount += Number(parsedScore.correctCount ?? 0);
      current.totalQuestions += Number(parsedScore.totalQuestions ?? 0);
      totalsByParticipant.set(res.participantId, current);
    }
  }

  // 3. Tính toán Bảng điểm chi tiết (Scoreboard)
  const rawScoreboard: Array<Omit<SessionStudentScoreItem, 'rank'>> = participants.map((p) => {
    const totals = totalsByParticipant.get(p.id) ?? {
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
    };
    const expEarned = expByParticipant.get(p.id) ?? 0;
    const accuracy =
      totals.totalQuestions > 0
        ? Math.round((totals.correctCount / totals.totalQuestions) * 100)
        : 0;
    const avatar = p.studentId && studentAvatars ? studentAvatars.get(p.studentId) : undefined;

    return {
      participantId: p.id,
      displayName: p.displayName,
      identityLevel: p.identityLevel as 'account' | 'roster' | 'guest',
      teamName: (p.teamId ? teamMap.get(p.teamId) : null) ?? null,
      score: totals.score,
      correctCount: totals.correctCount,
      totalQuestions: totals.totalQuestions,
      accuracy,
      expEarned,
      avatar,
    };
  });

  // Sắp xếp thứ hạng theo tổng điểm -> số câu đúng -> EXP
  rawScoreboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return b.expEarned - a.expEarned;
  });

  const scoreboard: SessionStudentScoreItem[] = rawScoreboard.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  // 4. Phân tích Câu hỏi sai nhiều (Difficult Questions)
  interface QuestionStatTracker {
    questionId: string;
    activityId: string;
    stem: string;
    activityTitle: string;
    totalAttempts: number;
    incorrectCount: number;
  }

  const questionStatsMap = new Map<string, QuestionStatTracker>();

  for (const run of activityRuns) {
    let title = run.activityId;
    let questions: Array<{ id?: string; stem?: string }> = [];

    try {
      const config = JSON.parse(run.configJson) as {
        title?: string;
        questions?: Array<{ id?: string; stem?: string }>;
      };
      if (config.title) title = config.title;
      if (Array.isArray(config.questions)) questions = config.questions;
    } catch {
      // bỏ qua lỗi JSON hỏng
    }

    const results = resultsByRun.get(run.id) ?? [];

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx]!;
      const qId = q.id ?? `q-${qIdx}`;
      const stem = q.stem ?? `Câu hỏi ${qIdx + 1}`;
      const mapKey = `${run.id}_${qId}`;

      let totalAttempts = 0;
      let incorrectCount = 0;

      for (const res of results) {
        try {
          const scoreData = JSON.parse(res.scoreJson) as {
            answers?: Record<string, { isCorrect?: boolean }>;
          };
          if (scoreData.answers) {
            const answer = scoreData.answers[String(qIdx)] ?? scoreData.answers[qId];
            if (answer) {
              totalAttempts++;
              if (answer.isCorrect === false) {
                incorrectCount++;
              }
            }
          }
        } catch {
          // bỏ qua lỗi JSON hỏng
        }
      }

      if (totalAttempts > 0) {
        questionStatsMap.set(mapKey, {
          questionId: qId,
          activityId: run.activityId,
          stem,
          activityTitle: title,
          totalAttempts,
          incorrectCount,
        });
      }
    }
  }

  const difficultQuestions: SessionDifficultQuestionItem[] = Array.from(
    questionStatsMap.values()
  )
    .map((stat) => {
      const errorRate =
        stat.totalAttempts > 0
          ? Math.round((stat.incorrectCount / stat.totalAttempts) * 100)
          : 0;
      return {
        questionId: stat.questionId,
        activityId: stat.activityId,
        activityName: stat.activityTitle,
        stem: stat.stem,
        totalAttempts: stat.totalAttempts,
        correctCount: stat.totalAttempts - stat.incorrectCount,
        incorrectCount: stat.incorrectCount,
        errorRate,
      };
    })
    .sort((a, b) => b.errorRate - a.errorRate || b.incorrectCount - a.incorrectCount);

  // 5. Tính toán Tóm tắt chỉ số phiên (Summary)
  let totalQuestionsInSession = 0;
  for (const run of activityRuns) {
    try {
      const config = JSON.parse(run.configJson) as { questions?: unknown[] };
      if (Array.isArray(config.questions)) {
        totalQuestionsInSession += config.questions.length;
      }
    } catch {
      // bỏ qua
    }
  }

  const totalParticipantsWithScore = scoreboard.length;
  const totalScoreSum = scoreboard.reduce((sum, item) => sum + item.score, 0);
  const totalAccuracySum = scoreboard.reduce((sum, item) => sum + item.accuracy, 0);

  const averageScore =
    totalParticipantsWithScore > 0
      ? Math.round(totalScoreSum / totalParticipantsWithScore)
      : 0;

  const averageAccuracy =
    totalParticipantsWithScore > 0
      ? Math.round(totalAccuracySum / totalParticipantsWithScore)
      : 0;

  const summary: SessionReportSummary = {
    totalQuestions: totalQuestionsInSession,
    averageScore,
    averageAccuracy,
    totalExpAwarded,
  };

  // 6. Tính toán Khung Game hóa & Tổng kết toàn lớp cho GV (Task 5.4)
  const topPodium = scoreboard.slice(0, 3).map((item) => ({
    rank: item.rank,
    participantId: item.participantId,
    displayName: item.displayName,
    score: item.score,
    expEarned: item.expEarned,
    accuracy: item.accuracy,
    identityLevel: item.identityLevel,
    teamName: item.teamName,
    avatar: item.avatar,
  }));

  const accountCount = participants.filter((p) => p.identityLevel === 'account').length;
  const rosterCount = participants.filter((p) => p.identityLevel === 'roster').length;
  const guestCount = participants.filter((p) => p.identityLevel === 'guest').length;

  let persistedExpTotal = 0;
  let unpersistedExpTotal = 0;
  for (const log of rewardLogs) {
    if (log.persisted) {
      persistedExpTotal += log.exp;
    } else {
      unpersistedExpTotal += log.exp;
    }
  }

  const participantStudentIdMap = new Map(participants.map((p) => [p.id, p.studentId]));

  const rosterNeedingPin = scoreboard
    .filter((item) => item.identityLevel === 'roster' && item.expEarned > 0)
    .map((item) => ({
      studentId: participantStudentIdMap.get(item.participantId) ?? null,
      displayName: item.displayName,
      expEarned: item.expEarned,
    }));

  const gamification: SessionGamificationSummary = {
    topPodium,
    newTitlesAwarded: titlesAwarded,
    identityStats: {
      accountCount,
      rosterCount,
      guestCount,
      persistedExpTotal,
      unpersistedExpTotal,
    },
    rosterNeedingPin,
  };

  return {
    scoreboard,
    difficultQuestions,
    summary,
    gamification,
  };
}
