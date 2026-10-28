import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type SwissDuelConfig,
  SwissDuelConfigSchema,
  SwissDuelIntentSchema,
  type SwissDuelResult,
  SwissDuelResultSchema,
  type SwissDuelState,
  SwissDuelStateSchema,
  type SwissQuestion,
} from './swiss-schemas.js';
import {
  calculateSwissLeaderboard,
  checkSwissAnswerCorrectness,
  evaluateMatchupResult,
  shuffleList,
  shuffleQuestionOptions,
} from './swiss-scoring.js';
import { generateSwissPairings } from './swiss-pairing.js';

// Lưu trữ danh sách câu hỏi gốc kèm đáp án đúng cho từng lượt chạy theo runId
const activeRunQuestions = new Map<string, SwissQuestion[]>();

/**
 * Lọc bỏ đáp án đúng khi phát thanh câu hỏi xuống client học sinh
 */
function stripAnswerKeys(questions: SwissQuestion[]): SwissQuestion[] {
  return questions.map(q => ({
    ...q,
    correctAnswer: undefined,
    explanation: undefined,
  }));
}

/**
 * Lấy 2 câu hỏi cho vòng đấu hiện tại
 */
function getQuestionsForRound(
  allQuestions: SwissQuestion[],
  roundIndex: number, // 0-indexed
  mode: 'questions' | 'time'
): SwissQuestion[] {
  if (allQuestions.length === 0) return [];

  if (mode === 'questions') {
    const startIndex = (roundIndex * 2) % allQuestions.length;
    const q1 = allQuestions[startIndex]!;
    const q2 = allQuestions[(startIndex + 1) % allQuestions.length]!;
    return [q1, q2];
  }

  // Chế độ 'time': Xáo trộn ngẫu nhiên lặp lại
  const total = allQuestions.length;
  const idx1 = (roundIndex * 2) % total;
  const idx2 = (roundIndex * 2 + 1) % total;
  return [allQuestions[idx1]!, allQuestions[idx2]!];
}

function advanceRound(ctx: ActivityContext, st: SwissDuelState): SwissDuelState {
  const isTimeMode = st.mode === 'time';
  const isTimeUp = isTimeMode && st.endTime !== null && ctx.now() >= st.endTime;
  const isQuestionsFinished = !isTimeMode && st.currentRound >= st.totalRounds;

  if (isTimeUp || isQuestionsFinished) {
    st.status = 'finished';
    st.leaderboard = calculateSwissLeaderboard(st.participants);
    st.countdownEndsAt = null;

    const top1 = st.leaderboard[0];
    const top2 = st.leaderboard[1];
    const top3 = st.leaderboard[2];
    if (top1) void ctx.grantReward(top1.participantId, 'podium_top1', 50);
    if (top2) void ctx.grantReward(top2.participantId, 'podium_top2', 30);
    if (top3) void ctx.grantReward(top3.participantId, 'podium_top3', 20);

    return { ...st };
  }

  const nextRound = st.currentRound + 1;
  const allowRematch = isTimeMode;

  const { matchups, byePlayerId, updatedParticipants } = generateSwissPairings(
    st.participants,
    allowRematch,
    2
  );

  const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
  const roundQuestions = getQuestionsForRound(rawQuestions, nextRound - 1, st.mode);
  const publicRoundQuestions = stripAnswerKeys(roundQuestions);

  return {
    ...st,
    currentRound: nextRound,
    status: 'in_round',
    roundQuestions: publicRoundQuestions,
    roundStartedAt: ctx.now(),
    countdownEndsAt: null,
    matchups,
    byePlayerId,
    participants: updatedParticipants,
    leaderboard: calculateSwissLeaderboard(updatedParticipants),
  };
}

/**
 * Tự động chốt điểm cho những bàn chưa nộp bài khi hết thời gian vòng đấu (do học sinh rớt mạng hoặc thoát ra)
 */
function checkAndFinalizeRoundTimeout(ctx: ActivityContext, st: SwissDuelState): SwissDuelState {
  if (st.status !== 'in_round' || !st.roundStartedAt) return st;

  const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
  const roundOrigQ = getQuestionsForRound(rawQuestions, st.currentRound - 1, st.mode);
  const roundTotalSeconds =
    (st.roundQuestions || []).reduce(
      (acc, q) => acc + (q.timeLimit || st.timeLimitPerQuestion || 30),
      0
    ) ||
    st.timeLimitPerQuestion * 2 ||
    60;

  // 3s độ trễ mạng dự phòng
  const deadline = st.roundStartedAt + (roundTotalSeconds + 3) * 1000;
  if (ctx.now() < deadline) {
    return st;
  }

  let anyUnfinished = false;
  for (const matchup of st.matchups) {
    if (!matchup.player1Answered || !matchup.player2Answered) {
      anyUnfinished = true;

      // Chốt player 1 nếu chưa nộp
      if (!matchup.player1Answered) {
        let p1Score = 0;
        const p1Results: Record<number, boolean> = {};
        [0, 1].forEach(qIdx => {
          const q = roundOrigQ[qIdx];
          const ans = matchup.player1Answers[qIdx];
          const isCorrect = q && ans !== undefined ? checkSwissAnswerCorrectness(q, ans) : false;
          p1Results[qIdx] = isCorrect;
          if (isCorrect) p1Score += 1;
        });
        matchup.player1Score = p1Score;
        matchup.player1Results = p1Results;
        matchup.player1Answered = true;
        const p1 = st.participants[matchup.player1Id];
        if (p1) {
          p1.correctCount += p1Score;
          if (p1Score > 0) void ctx.grantReward(p1.participantId, 'correct_answer', p1Score * 5);
        }
      }

      // Chốt player 2 nếu chưa nộp
      if (!matchup.player2Answered) {
        let p2Score = 0;
        const p2Results: Record<number, boolean> = {};
        [0, 1].forEach(qIdx => {
          const q = roundOrigQ[qIdx];
          const ans = matchup.player2Answers[qIdx];
          const isCorrect = q && ans !== undefined ? checkSwissAnswerCorrectness(q, ans) : false;
          p2Results[qIdx] = isCorrect;
          if (isCorrect) p2Score += 1;
        });
        matchup.player2Score = p2Score;
        matchup.player2Results = p2Results;
        matchup.player2Answered = true;
        const p2 = st.participants[matchup.player2Id];
        if (p2) {
          p2.correctCount += p2Score;
          if (p2Score > 0) void ctx.grantReward(p2.participantId, 'correct_answer', p2Score * 5);
        }
      }

      // Đánh giá kết quả bàn đấu
      if (matchup.result === 'in_progress') {
        matchup.result = evaluateMatchupResult(matchup.player1Score, matchup.player2Score);
        const p1 = st.participants[matchup.player1Id];
        const p2 = st.participants[matchup.player2Id];

        if (p1 && p2) {
          if (matchup.result === 'player1_win') {
            p1.tournamentPoints += 2;
            p1.matchesWon += 1;
            p1.streak += 1;
            p2.matchesLost += 1;
            p2.streak = 0;
            void ctx.grantReward(p1.participantId, 'win_match', 15);
          } else if (matchup.result === 'player2_win') {
            p2.tournamentPoints += 2;
            p2.matchesWon += 1;
            p2.streak += 1;
            p1.matchesLost += 1;
            p1.streak = 0;
            void ctx.grantReward(p2.participantId, 'win_match', 15);
          } else {
            p1.tournamentPoints += 1;
            p1.matchesDrawn += 1;
            p2.tournamentPoints += 1;
            p2.matchesDrawn += 1;
            void ctx.grantReward(p1.participantId, 'draw_match', 8);
            void ctx.grantReward(p2.participantId, 'draw_match', 8);
          }
        }
      }
    }
  }

  if (
    anyUnfinished ||
    (st.matchups.length > 0 && st.matchups.every(m => m.player1Answered && m.player2Answered))
  ) {
    st.status = 'round_review';
    st.countdownEndsAt = ctx.now() + 10000;
    st.leaderboard = calculateSwissLeaderboard(st.participants);
    st.roundQuestions = roundOrigQ;
  }

  return st;
}

export const SwissDuelActivity: ActivityDefinition<
  SwissDuelConfig,
  SwissDuelState,
  SwissDuelResult
> = {
  id: 'swiss-duel',
  name: 'Đấu Cờ Thụy Sỹ',
  version: 1,
  icon: '♟️',
  description:
    'Đấu trí 1v1 theo thể thức Thụy Sỹ cổ điển: so tài 2 câu/vòng, thắng 2đ, hòa 1đ, tự động xếp bàn',
  capabilities: ['screen'],
  rewardTriggers: [
    'win_match',
    'draw_match',
    'correct_answer',
    'podium_top1',
    'podium_top2',
    'podium_top3',
    'finish',
  ],
  configSchema: SwissDuelConfigSchema,
  stateSchema: SwissDuelStateSchema,
  resultSchema: SwissDuelResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: SwissDuelConfig): SwissDuelState {
      const shuffleQuestions = cfg.shuffleQuestions ?? true;
      const shuffleOptions = cfg.shuffleOptions ?? true;

      let questionsToUse = [...cfg.questions];

      // 1. Đảo câu hỏi nếu được bật (mặc định là đảo)
      if (shuffleQuestions) {
        questionsToUse = shuffleList(questionsToUse, ctx.rng);
      }

      // 2. Đảo phương án lựa chọn nếu được bật (mặc định là đảo)
      if (shuffleOptions) {
        questionsToUse = questionsToUse.map(q => shuffleQuestionOptions(q, ctx.rng));
      }

      activeRunQuestions.set(ctx.runId, questionsToUse);

      const totalRounds =
        cfg.mode === 'questions' ? Math.max(1, Math.floor(questionsToUse.length / 2)) : 10;

      const roundQuestions = getQuestionsForRound(questionsToUse, 0, cfg.mode);
      const publicRoundQuestions = stripAnswerKeys(roundQuestions);

      const endTime = cfg.mode === 'time' ? ctx.now() + cfg.timeLimitMinutes * 60 * 1000 : null;

      return {
        title: cfg.title,
        mode: cfg.mode,
        status: 'in_round',
        currentRound: 1,
        totalRounds,
        roundQuestions: publicRoundQuestions,
        roundStartedAt: ctx.now(),
        countdownEndsAt: null,
        matchups: [],
        byePlayerId: null,
        participants: {},
        leaderboard: [],
        timeLimitPerQuestion: cfg.timeLimitPerQuestion,
        endTime,
        shuffleQuestions,
        shuffleOptions,
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: SwissDuelState,
      participantId: string,
      intent: unknown
    ): SwissDuelState | ActivityReject {
      // 0.1 Tự động chốt bàn và chuyển sang round_review nếu đã hết thời gian hiệp đấu
      st = checkAndFinalizeRoundTimeout(ctx, st);

      // 0.2 Tự động chuyển vòng nếu hết thời gian đếm ngược 10s
      if (st.status === 'round_review' && st.countdownEndsAt && ctx.now() >= st.countdownEndsAt) {
        return advanceRound(ctx, st);
      }

      const parsed = SwissDuelIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Lệnh từ học sinh không hợp lệ',
          code: 'INVALID_INTENT',
        };
      }

      // Khởi tạo học sinh vào danh sách nếu chưa có
      if (!st.participants[participantId]) {
        const studentName =
          'displayName' in parsed.data && parsed.data.displayName
            ? parsed.data.displayName
            : `Kỳ thủ ${participantId.slice(0, 4)}`;

        st.participants[participantId] = {
          participantId,
          displayName: studentName,
          tournamentPoints: 0,
          correctCount: 0,
          matchesWon: 0,
          matchesDrawn: 0,
          matchesLost: 0,
          streak: 0,
          byeCount: 0,
          history: [],
          currentTable: null,
          isByeThisRound: false,
        };

        // Ở Vòng 1: Nếu chưa có bàn nào hoàn thành bài thi, tự động re-pair lại cho toàn bộ học sinh
        const isRound1 = st.currentRound === 1;
        const noOneFinishedYet = st.matchups.every(m => !m.player1Answered && !m.player2Answered);
        if (isRound1 && noOneFinishedYet && Object.keys(st.participants).length >= 2) {
          const { matchups, byePlayerId, updatedParticipants } = generateSwissPairings(
            st.participants,
            st.mode === 'time',
            2
          );
          st.matchups = matchups;
          st.byePlayerId = byePlayerId;
          st.participants = updatedParticipants;
          st.leaderboard = calculateSwissLeaderboard(updatedParticipants);
        }
      }

      if (parsed.data.type === 'join_tournament') {
        return { ...st };
      }

      // 1. Nộp bài cả vòng (SUBMIT ROUND ANSWERS)
      if (parsed.data.type === 'submit_round') {
        if (st.status !== 'in_round') {
          return {
            ok: false,
            reason: 'Vòng đấu hiện tại không nhận bài làm',
            code: 'ROUND_NOT_ACTIVE',
          };
        }

        const matchup = st.matchups.find(
          m => m.player1Id === participantId || m.player2Id === participantId
        );
        if (!matchup) {
          return {
            ok: false,
            reason: 'Bạn không có bàn đấu ở vòng này (hoặc đã nhận suất BYE)',
            code: 'NO_MATCHUP',
          };
        }

        const isP1 = matchup.player1Id === participantId;
        // Nếu đã nộp rồi thì không cho nộp lại, bảo vệ không tăng điểm trùng lặp
        if (isP1 && matchup.player1Answered) return { ...st };
        if (!isP1 && matchup.player2Answered) return { ...st };

        const rawQuestions = activeRunQuestions.get(ctx.runId) || [];
        const roundOrigQ = getQuestionsForRound(rawQuestions, st.currentRound - 1, st.mode);
        const submittedAnswers = parsed.data.answers;

        let score = 0;
        const results: Record<number, boolean> = {};

        [0, 1].forEach(qIdx => {
          const q = roundOrigQ[qIdx];
          if (q) {
            const ans = submittedAnswers[qIdx];
            const isCorrect = checkSwissAnswerCorrectness(q, ans);
            results[qIdx] = isCorrect;
            if (isCorrect) {
              score += 1;
            }
          }
        });

        if (isP1) {
          matchup.player1Answers = submittedAnswers;
          matchup.player1Results = results;
          matchup.player1Score = score;
          matchup.player1Answered = true;
          st.participants[participantId]!.correctCount += score;
          if (score > 0) void ctx.grantReward(participantId, 'correct_answer', score * 5);
        } else {
          matchup.player2Answers = submittedAnswers;
          matchup.player2Results = results;
          matchup.player2Score = score;
          matchup.player2Answered = true;
          st.participants[participantId]!.correctCount += score;
          if (score > 0) void ctx.grantReward(participantId, 'correct_answer', score * 5);
        }

        // Nếu cả 2 bạn trong bàn đều đã nộp bài -> Đánh giá kết quả bàn đấu
        if (
          matchup.player1Answered &&
          matchup.player2Answered &&
          matchup.result === 'in_progress'
        ) {
          matchup.result = evaluateMatchupResult(matchup.player1Score, matchup.player2Score);

          const p1 = st.participants[matchup.player1Id]!;
          const p2 = st.participants[matchup.player2Id]!;

          if (matchup.result === 'player1_win') {
            p1.tournamentPoints += 2;
            p1.matchesWon += 1;
            p1.streak += 1;
            p2.matchesLost += 1;
            p2.streak = 0;
            void ctx.grantReward(p1.participantId, 'win_match', 15);
          } else if (matchup.result === 'player2_win') {
            p2.tournamentPoints += 2;
            p2.matchesWon += 1;
            p2.streak += 1;
            p1.matchesLost += 1;
            p1.streak = 0;
            void ctx.grantReward(p2.participantId, 'win_match', 15);
          } else {
            p1.tournamentPoints += 1;
            p1.matchesDrawn += 1;
            p2.tournamentPoints += 1;
            p2.matchesDrawn += 1;
            void ctx.grantReward(p1.participantId, 'draw_match', 8);
            void ctx.grantReward(p2.participantId, 'draw_match', 8);
          }
        }

        // Kiểm tra xem tất cả các bàn đã hoàn thành chưa
        const allMatchesDone =
          st.matchups.length > 0 && st.matchups.every(m => m.player1Answered && m.player2Answered);

        if (allMatchesDone) {
          st.status = 'round_review';
          st.countdownEndsAt = ctx.now() + 10000;
          st.leaderboard = calculateSwissLeaderboard(st.participants);
          // Gửi kèm câu hỏi gốc đầy đủ đáp án để học sinh xem lại sau vòng
          st.roundQuestions = roundOrigQ;
        }

        return { ...st };
      }

      // 2. Nộp câu trả lời đơn lẻ (lưu nháp tạm thời)
      if (parsed.data.type === 'submit_answer') {
        if (st.status !== 'in_round') return { ...st };

        const matchup = st.matchups.find(
          m => m.player1Id === participantId || m.player2Id === participantId
        );
        if (!matchup) return { ...st };

        const isP1 = matchup.player1Id === participantId;
        if (isP1 && matchup.player1Answered) return { ...st };
        if (!isP1 && matchup.player2Answered) return { ...st };

        const qIndex = parsed.data.questionIndex;
        if (isP1) {
          matchup.player1Answers[qIndex] = parsed.data.answer;
        } else {
          matchup.player2Answers[qIndex] = parsed.data.answer;
        }

        return { ...st };
      }

      return { ...st };
    },

    onTeacherIntent(ctx: ActivityContext, st: SwissDuelState, intent: unknown): SwissDuelState {
      // Tự động chốt bàn nếu hết thời gian hiệp đấu
      st = checkAndFinalizeRoundTimeout(ctx, st);

      // Tự động chuyển vòng nếu hết thời gian đếm ngược
      if (st.status === 'round_review' && st.countdownEndsAt && ctx.now() >= st.countdownEndsAt) {
        return advanceRound(ctx, st);
      }

      const parsed = SwissDuelIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return st;
      }

      switch (parsed.data.type) {
        case 'repair_round': {
          // Bốc thăm lại cho vòng hiện tại nếu chưa ai làm xong
          const { matchups, byePlayerId, updatedParticipants } = generateSwissPairings(
            st.participants,
            st.mode === 'time',
            2
          );
          st.matchups = matchups;
          st.byePlayerId = byePlayerId;
          st.participants = updatedParticipants;
          st.leaderboard = calculateSwissLeaderboard(updatedParticipants);
          return { ...st };
        }

        case 'skip_countdown':
        case 'next_round': {
          return advanceRound(ctx, st);
        }

        case 'pause_countdown': {
          return {
            ...st,
            countdownEndsAt: null,
          };
        }

        case 'resume_countdown': {
          return {
            ...st,
            countdownEndsAt: ctx.now() + 10000,
          };
        }

        case 'finish_tournament': {
          return {
            ...st,
            status: 'finished',
            leaderboard: calculateSwissLeaderboard(st.participants),
            countdownEndsAt: null,
          };
        }

        case 'add_time': {
          const extraMs = parsed.data.minutes * 60 * 1000;
          const base = Math.max(ctx.now(), st.endTime ?? ctx.now());
          return {
            ...st,
            endTime: base + extraMs,
            status: st.status === 'finished' ? 'in_round' : st.status,
          };
        }

        default:
          return st;
      }
    },

    onEnd(ctx: ActivityContext, st: SwissDuelState): SwissDuelResult[] {
      const standings = calculateSwissLeaderboard(st.participants);

      // Trao thưởng Top 1, Top 2, Top 3
      if (standings.length > 0) {
        const top1 = standings[0];
        if (top1 && top1.tournamentPoints > 0) {
          void ctx.grantReward(top1.participantId, 'podium_top1', 50);
        }
        const top2 = standings[1];
        if (top2 && top2.tournamentPoints > 0) {
          void ctx.grantReward(top2.participantId, 'podium_top2', 30);
        }
        const top3 = standings[2];
        if (top3 && top3.tournamentPoints > 0) {
          void ctx.grantReward(top3.participantId, 'podium_top3', 20);
        }
      }

      // Thưởng hoàn thành cho tất cả học sinh
      for (const p of Object.values(st.participants)) {
        void ctx.grantReward(p.participantId, 'finish', 15);
      }

      activeRunQuestions.delete(ctx.runId);

      return standings.map(s => ({
        participantId: s.participantId,
        displayName: s.displayName,
        tournamentPoints: s.tournamentPoints,
        correctCount: s.correctCount,
        matchesWon: s.matchesWon,
        matchesDrawn: s.matchesDrawn,
        matchesLost: s.matchesLost,
        buchholz: s.buchholz,
        rank: s.rank,
      }));
    },
  },
};
