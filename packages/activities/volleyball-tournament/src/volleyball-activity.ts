import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type VolleyballConfig,
  VolleyballConfigSchema,
  VolleyballIntentSchema,
  type VolleyballMatchup,
  type VolleyballQuestion,
  type VolleyballResult,
  VolleyballResultSchema,
  type VolleyballTournamentState,
  VolleyballTournamentStateSchema,
} from './volleyball-schemas.js';
import {
  checkVolleyballAnswerCorrectness,
  evaluateMatchupResult,
  shuffleList,
  shuffleQuestionOptions,
} from './volleyball-scoring.js';
import {
  calculatePoolStandings,
  determinePoolCount,
  distributeIntoPools,
  generatePoolSchedule,
} from './volleyball-pools.js';
import {
  advanceBracketFinals,
  calculateFinalStandings,
  generatePlacementBrackets,
} from './volleyball-brackets.js';

const activeRunQuestions = new Map<string, VolleyballQuestion[]>();
const activePoolSchedules = new Map<string, VolleyballMatchup[][]>();

function stripAnswerKeys(questions: VolleyballQuestion[]): VolleyballQuestion[] {
  return questions.map(q => ({
    ...q,
    correctAnswer: undefined,
    explanation: undefined,
  }));
}

function getQuestionsForRound(
  allQuestions: VolleyballQuestion[],
  roundIndex: number
): VolleyballQuestion[] {
  if (allQuestions.length === 0) return [];
  const startIndex = (roundIndex * 2) % allQuestions.length;
  const q1 = allQuestions[startIndex]!;
  const q2 = allQuestions[(startIndex + 1) % allQuestions.length]!;
  return [q1, q2];
}

function resolveMatchupResults(
  ctx: ActivityContext,
  st: VolleyballTournamentState,
  forceAll = false
): VolleyballTournamentState {
  const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
  const roundQuestions = getQuestionsForRound(rawQuestions, st.currentRound - 1);

  for (const m of st.activeMatchups) {
    if (m.result !== 'in_progress' && !forceAll) continue;

    const bothAnswered = m.player1Answered && m.player2Answered;
    if (bothAnswered || forceAll) {
      // Đánh giá điểm từng câu cho player 1
      let score1 = 0;
      const res1: Record<string, boolean> = {};
      for (const q of roundQuestions) {
        const isOk = checkVolleyballAnswerCorrectness(q, m.player1Answers[q.id]);
        res1[q.id] = isOk;
        if (isOk) score1++;
      }
      m.player1Score = score1;
      m.player1Results = res1;

      // Đánh giá điểm từng câu cho player 2
      let score2 = 0;
      const res2: Record<string, boolean> = {};
      for (const q of roundQuestions) {
        const isOk = checkVolleyballAnswerCorrectness(q, m.player2Answers[q.id]);
        res2[q.id] = isOk;
        if (isOk) score2++;
      }
      m.player2Score = score2;
      m.player2Results = res2;

      m.result = evaluateMatchupResult(score1, score2);

      const p1 = st.participants[m.player1Id];
      const p2 = st.participants[m.player2Id];

      if (p1 && p2) {
        p1.correctCount += score1;
        p2.correctCount += score2;

        if (m.result === 'player1_win') {
          p1.tournamentPoints += 2;
          p1.matchesWon += 1;
          p2.matchesLost += 1;
          void ctx.grantReward(p1.participantId, 'match_win', 10);
        } else if (m.result === 'player2_win') {
          p2.tournamentPoints += 2;
          p2.matchesWon += 1;
          p1.matchesLost += 1;
          void ctx.grantReward(p2.participantId, 'match_win', 10);
        } else {
          p1.tournamentPoints += 1;
          p1.matchesDrawn += 1;
          p2.tournamentPoints += 1;
          p2.matchesDrawn += 1;
        }
      }
    }
  }

  // Cập nhật lại BXH các bảng nếu đang ở vòng bảng
  if (st.currentStage === 'pools') {
    for (const pool of Object.values(st.pools)) {
      pool.standings = calculatePoolStandings(pool, st.activeMatchups, st.participants);
    }
  }

  return st;
}

export const VolleyballTournamentActivity: ActivityDefinition<
  VolleyballConfig,
  VolleyballTournamentState,
  VolleyballResult
> = {
  id: 'volleyball-tournament',
  name: 'Giải Đấu Bóng Chuyền (thử nghiệm)',
  version: 1,
  icon: '🏐',
  description:
    'Thi đấu vòng bảng sau đó bắt cặp xếp hạng 4 Cúp theo thể thức bóng chuyền học đường',
  capabilities: ['screen'],
  rewardTriggers: [
    'match_win',
    'correct_answer',
    'podium_diamond_1',
    'podium_diamond_2',
    'podium_diamond_3',
    'podium_gold_1',
    'podium_silver_1',
    'podium_bronze_1',
  ],
  configSchema: VolleyballConfigSchema,
  stateSchema: VolleyballTournamentStateSchema,
  resultSchema: VolleyballResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: VolleyballConfig): VolleyballTournamentState {
      let questions = [...cfg.questions];
      if (cfg.shuffleQuestions ?? true) {
        questions = shuffleList(questions, ctx.rng);
      }
      if (cfg.shuffleOptions ?? true) {
        questions = questions.map(q => shuffleQuestionOptions(q, ctx.rng));
      }

      activeRunQuestions.set(ctx.runId, questions);

      const roundQuestions = getQuestionsForRound(questions, 0);
      const perQuestionTime = cfg.timeLimitPerQuestion || 30;
      const roundDurationMs = perQuestionTime * 2 * 1000;

      return {
        title: cfg.title,
        status: 'pool_stage',
        poolMode: cfg.poolMode,
        poolCount: 4,
        currentRound: 1,
        totalPoolRounds: 3,
        totalBracketRounds: 2,
        currentStage: 'pools',
        pools: {},
        brackets: {},
        participants: {},
        activeMatchups: [],
        roundQuestions: stripAnswerKeys(roundQuestions),
        roundStartedAt: ctx.now(),
        countdownEndsAt: ctx.now() + roundDurationMs,
        finalStandings: [],
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: VolleyballTournamentState,
      participantId: string,
      intent: unknown
    ): VolleyballTournamentState | ActivityReject {
      const parsed = VolleyballIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return { ok: false, reason: 'Dữ liệu không hợp lệ', code: 'INVALID_INTENT' };
      }

      const data = parsed.data;

      // Đăng ký học sinh vào giải nếu chưa có
      if (!st.participants[participantId]) {
        const studentName =
          'displayName' in data && data.displayName
            ? data.displayName
            : `Vận động viên ${participantId.slice(0, 4)}`;

        st.participants[participantId] = {
          participantId,
          displayName: studentName,
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
        };

        // Ở lượt 1 vòng bảng: Tự động phân bảng lại khi có học sinh vào và chưa ai hoàn thành
        const isRound1 = st.currentRound === 1 && st.currentStage === 'pools';
        const noOneFinishedYet =
          st.activeMatchups.length === 0 ||
          st.activeMatchups.every(m => !m.player1Answered && !m.player2Answered);
        const participantCount = Object.keys(st.participants).length;

        if (isRound1 && noOneFinishedYet && participantCount >= 2) {
          const poolCount = determinePoolCount(participantCount, st.poolMode);
          st.poolCount = poolCount;
          st.pools = distributeIntoPools(
            Object.values(st.participants).map(p => ({ id: p.participantId, name: p.displayName })),
            poolCount,
            ctx.rng
          );

          for (const pool of Object.values(st.pools)) {
            for (const pid of pool.playerIds) {
              if (st.participants[pid]) {
                st.participants[pid]!.poolId = pool.id;
              }
            }
          }

          const schedule = generatePoolSchedule(st.pools);
          activePoolSchedules.set(ctx.runId, schedule);
          const round1Matchups = schedule[0] || [];
          st.activeMatchups = round1Matchups;

          for (const p of Object.values(st.participants)) {
            p.currentTable = null;
          }
          for (const m of round1Matchups) {
            if (st.participants[m.player1Id])
              st.participants[m.player1Id]!.currentTable = m.tableNumber;
            if (st.participants[m.player2Id])
              st.participants[m.player2Id]!.currentTable = m.tableNumber;
          }
        }
      }

      if (data.type === 'join_tournament') {
        return { ...st };
      }

      if (data.type !== 'submit_answer') {
        return st;
      }

      const matchup = st.activeMatchups.find(
        m => m.player1Id === participantId || m.player2Id === participantId
      );
      if (!matchup) {
        return {
          ok: false,
          reason: 'Bạn không có trận đấu trong lượt này',
          code: 'NO_ACTIVE_MATCHUP',
        };
      }

      const isPlayer1 = matchup.player1Id === participantId;
      const answers = isPlayer1 ? matchup.player1Answers : matchup.player2Answers;
      answers[data.questionId] = data.answer;

      // Kiểm tra câu trả lời
      const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
      const currentQ = rawQuestions.find(q => q.id === data.questionId);
      if (currentQ) {
        const isCorrect = checkVolleyballAnswerCorrectness(currentQ, data.answer);
        if (isPlayer1) {
          matchup.player1Results[data.questionId] = isCorrect;
        } else {
          matchup.player2Results[data.questionId] = isCorrect;
        }
        if (isCorrect) {
          void ctx.grantReward(participantId, 'correct_answer', 2);
        }
      }

      if (Object.keys(answers).length >= st.roundQuestions.length) {
        if (isPlayer1) matchup.player1Answered = true;
        else matchup.player2Answered = true;
      }

      // Đánh giá bàn đấu nếu cả 2 xong
      return resolveMatchupResults(ctx, st, false);
    },

    onTeacherIntent(
      ctx: ActivityContext,
      st: VolleyballTournamentState,
      intent: unknown
    ): VolleyballTournamentState {
      const parsed = VolleyballIntentSchema.safeParse(intent);
      if (!parsed.success) return st;

      const data = parsed.data;
      const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
      const schedule = activePoolSchedules.get(ctx.runId) || [];

      if (data.type === 'next_round') {
        // Chốt kết quả lượt hiện tại trước khi chuyển
        resolveMatchupResults(ctx, st, true);

        if (st.currentStage === 'pools') {
          if (st.currentRound < st.totalPoolRounds) {
            // Sang lượt tiếp theo của vòng bảng
            const nextRound = st.currentRound + 1;
            const nextMatchups = schedule[nextRound - 1] || [];
            const nextQuestions = getQuestionsForRound(rawQuestions, nextRound - 1);

            for (const p of Object.values(st.participants)) {
              p.currentTable = null;
            }
            for (const m of nextMatchups) {
              if (st.participants[m.player1Id])
                st.participants[m.player1Id]!.currentTable = m.tableNumber;
              if (st.participants[m.player2Id])
                st.participants[m.player2Id]!.currentTable = m.tableNumber;
            }

            st.currentRound = nextRound;
            st.activeMatchups = nextMatchups;
            st.roundQuestions = stripAnswerKeys(nextQuestions);
            st.roundStartedAt = ctx.now();
            st.countdownEndsAt = ctx.now() + 60000;
          } else {
            // Hết 3 lượt vòng bảng -> sang giải lao chờ chuyển nhánh
            st.status = 'pool_stage_intermission';
            st.countdownEndsAt = null;
            for (const pool of Object.values(st.pools)) {
              pool.standings = calculatePoolStandings(pool, st.activeMatchups, st.participants);
            }
          }
        } else if (st.currentStage === 'brackets') {
          if (st.currentRound === 4) {
            // Từ Bán kết chuyển sang Chung kết & Tranh hạng ba
            const finalMatchups = advanceBracketFinals(st.brackets, st.activeMatchups);
            const nextQuestions = getQuestionsForRound(rawQuestions, 4);

            for (const p of Object.values(st.participants)) {
              p.currentTable = null;
            }
            for (const m of finalMatchups) {
              if (st.participants[m.player1Id])
                st.participants[m.player1Id]!.currentTable = m.tableNumber;
              if (st.participants[m.player2Id])
                st.participants[m.player2Id]!.currentTable = m.tableNumber;
            }

            st.currentRound = 5;
            st.activeMatchups = finalMatchups;
            st.roundQuestions = stripAnswerKeys(nextQuestions);
            st.roundStartedAt = ctx.now();
            st.countdownEndsAt = ctx.now() + 60000;
          } else {
            // Kết thúc lượt 5 -> FINISHED
            st.status = 'finished';
            st.countdownEndsAt = null;
            st.finalStandings = calculateFinalStandings(
              st.brackets,
              st.activeMatchups,
              st.participants
            );

            // Trao thưởng EXP theo chuẩn D8
            const d1 = st.finalStandings.find(s => s.tier === 'diamond' && s.rank === 1);
            const d2 = st.finalStandings.find(s => s.tier === 'diamond' && s.rank === 2);
            const d3 = st.finalStandings.find(s => s.tier === 'diamond' && s.rank === 3);
            const g1 = st.finalStandings.find(s => s.tier === 'gold' && s.rank === 5);
            const s1 = st.finalStandings.find(s => s.tier === 'silver');
            const b1 = st.finalStandings.find(s => s.tier === 'bronze');

            if (d1) void ctx.grantReward(d1.participantId, 'podium_diamond_1', 60);
            if (d2) void ctx.grantReward(d2.participantId, 'podium_diamond_2', 45);
            if (d3) void ctx.grantReward(d3.participantId, 'podium_diamond_3', 35);
            if (g1) void ctx.grantReward(g1.participantId, 'podium_gold_1', 30);
            if (s1) void ctx.grantReward(s1.participantId, 'podium_silver_1', 25);
            if (b1) void ctx.grantReward(b1.participantId, 'podium_bronze_1', 20);
          }
        }
      } else if (data.type === 'start_brackets') {
        // Giáo viên bấm chuyển sang Vòng Playoff
        st.currentStage = 'brackets';
        st.status = 'bracket_stage';
        st.currentRound = 4;

        // Sinh 4 Cúp & cặp đấu Bán kết
        st.brackets = generatePlacementBrackets(st.pools);

        const semiMatchups: VolleyballMatchup[] = [];
        for (const b of Object.values(st.brackets)) {
          semiMatchups.push(...b.semiFinalMatchups);
        }

        for (const p of Object.values(st.participants)) {
          p.currentTable = null;
        }
        for (const m of semiMatchups) {
          if (st.participants[m.player1Id])
            st.participants[m.player1Id]!.currentTable = m.tableNumber;
          if (st.participants[m.player2Id])
            st.participants[m.player2Id]!.currentTable = m.tableNumber;
        }

        const semiQuestions = getQuestionsForRound(rawQuestions, 3);
        st.activeMatchups = semiMatchups;
        st.roundQuestions = stripAnswerKeys(semiQuestions);
        st.roundStartedAt = ctx.now();
        st.countdownEndsAt = ctx.now() + 60000;
      } else if (data.type === 'force_finish') {
        st.status = 'finished';
        st.countdownEndsAt = null;
        st.finalStandings = calculateFinalStandings(
          st.brackets,
          st.activeMatchups,
          st.participants
        );
      }

      return st;
    },

    onEnd(_ctx: ActivityContext, st: VolleyballTournamentState): VolleyballResult[] {
      return Object.values(st.participants).map(p => ({
        participantId: p.participantId,
        rank: p.finalRank || p.rankInPool || 1,
        score: p.tournamentPoints,
        details: {
          tier: p.tier,
          correctCount: p.correctCount,
          matchesWon: p.matchesWon,
        },
      }));
    },
  },
};
