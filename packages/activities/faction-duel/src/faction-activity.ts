import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type FactionDuelConfig,
  FactionDuelConfigSchema,
  FactionDuelIntentSchema,
  type FactionDuelResult,
  FactionDuelResultSchema,
  type FactionDuelState,
  FactionDuelStateSchema,
  type FactionQuestion,
} from './faction-schemas.js';
import {
  initTeamsFromParticipants,
  generateRound1Pairings,
  startPickPhase,
  handleSelectOpponent,
  resolvePickPhaseTimeout,
} from './faction-draft.js';
import {
  getQuestionsForRound,
  evaluateFactionMatchup,
  aggregateTeamScores,
  calculateFinalLeaderboard,
} from './faction-scoring.js';

// Lưu trữ danh sách câu hỏi gốc đầy đủ (kèm đáp án) theo runId
const activeRunRawQuestions = new Map<string, FactionQuestion[]>();

// Lưu trữ tất cả các trận đấu đã hoàn thành qua các vòng để tính kết quả cuối cùng
const activeRunCompletedMatchups = new Map<
  string,
  typeof FactionDuelStateSchema._type.currentMatchups
>();

/**
 * Ẩn đáp án đúng khi gửi câu hỏi xuống học sinh
 */
function sanitizeQuestionsForClient(questions: FactionQuestion[]): FactionQuestion[] {
  return questions.map(q => ({
    ...q,
    correctAnswer: undefined,
    explanation: undefined,
    options: q.options?.map(o => ({
      id: o.id,
      text: o.text,
    })),
  }));
}

/**
 * Bắt đầu 1 vòng đấu mới (Round Active)
 */
function startNewRound(
  ctx: ActivityContext,
  st: FactionDuelState,
  roundIndex: number,
  matchups: typeof FactionDuelStateSchema._type.currentMatchups,
  cloneId?: string
): FactionDuelState {
  const rawPool = activeRunRawQuestions.get(ctx.runId) ?? [];
  const roundQuestions = getQuestionsForRound(rawPool, roundIndex, st.questionsPerMatch, {
    shuffleQuestions: st.shuffleQuestions,
    shuffleOptions: st.shuffleOptions,
    allowRecycle: st.allowQuestionRecycle,
    rng: ctx.rng,
  });

  const clientQuestions = sanitizeQuestionsForClient(roundQuestions);
  const now = ctx.now();
  const roundDurationMs = st.answerTimeSeconds * st.questionsPerMatch * 1000;

  return {
    ...st,
    status: 'round_active',
    currentRound: roundIndex + 1,
    currentMatchups: matchups,
    currentQuestions: clientQuestions,
    roundStartTime: now,
    roundEndTime: now + roundDurationMs,
    cloneParticipantId: cloneId,
    pickPhase: undefined,
  };
}

/**
 * Kiểm tra xem tất cả các cặp đấu đã hoàn thành bài làm chưa
 */
function areAllMatchupsDone(
  matchups: typeof FactionDuelStateSchema._type.currentMatchups,
  questionCount: number
): boolean {
  if (matchups.length === 0) return true;

  for (const m of matchups) {
    const blueAnsweredCount = Object.keys(m.blueAnswers).length;
    const redAnsweredCount = Object.keys(m.redAnswers).length;
    if (blueAnsweredCount < questionCount || redAnsweredCount < questionCount) {
      return false;
    }
  }
  return true;
}

/**
 * Đánh giá kết thúc vòng làm bài (Round Eval)
 */
function evaluateCurrentRound(ctx: ActivityContext, st: FactionDuelState): FactionDuelState {
  const rawPool = activeRunRawQuestions.get(ctx.runId) ?? [];
  // Lấy câu hỏi đầy đủ đáp án của vòng này
  const fullQuestions = getQuestionsForRound(rawPool, st.currentRound - 1, st.questionsPerMatch, {
    shuffleQuestions: false,
    shuffleOptions: false,
    allowRecycle: st.allowQuestionRecycle,
  });

  const evaluatedMatchups = st.currentMatchups.map(m =>
    evaluateFactionMatchup(m, fullQuestions, st.teamBlue, st.teamRed)
  );

  const { addBlue, addRed } = aggregateTeamScores(evaluatedMatchups);
  const newScoreBlue = Number((st.scoreBlue + addBlue).toFixed(1));
  const newScoreRed = Number((st.scoreRed + addRed).toFixed(1));

  // Lưu lại các trận đã hoàn thành vào bộ nhớ tích lũy
  const history = activeRunCompletedMatchups.get(ctx.runId) ?? [];
  activeRunCompletedMatchups.set(ctx.runId, [...history, ...evaluatedMatchups]);

  // Kiểm tra nếu đã hết số vòng đấu -> Kết thúc hoạt động
  if (st.currentRound >= st.totalRounds) {
    return {
      ...st,
      status: 'finished',
      scoreBlue: newScoreBlue,
      scoreRed: newScoreRed,
      currentMatchups: evaluatedMatchups,
    };
  }

  // Nếu chưa hết vòng -> Bắt đầu Pha Chọn Đấu Thủ 15 Giây (Pick Phase)
  const pickPhase = startPickPhase(
    newScoreBlue,
    newScoreRed,
    st.pickPhaseSeconds,
    ctx.now(),
    ctx.rng
  );

  return {
    ...st,
    status: 'pick_phase',
    scoreBlue: newScoreBlue,
    scoreRed: newScoreRed,
    currentMatchups: evaluatedMatchups,
    pickPhase,
  };
}

export const FactionDuelActivity: ActivityDefinition<
  FactionDuelConfig,
  FactionDuelState,
  FactionDuelResult
> = {
  id: 'faction-duel',
  name: 'Đại Chiến Xanh Đỏ (thử nghiệm)',
  version: 1,
  icon: '⚔️',
  description:
    'Đại chiến chia 2 phe Xanh - Đỏ cân bằng theo Elo, cơ chế 15s chọn đối thủ và tính điểm trọng số lật kèo',
  configSchema: FactionDuelConfigSchema,
  stateSchema: FactionDuelStateSchema,
  resultSchema: FactionDuelResultSchema,
  rewardTriggers: ['team_win', 'mvp', 'underdog_win', 'participation'],
  capabilities: ['screen'],

  server: {
    onStart(ctx: ActivityContext, cfg: FactionDuelConfig): FactionDuelState {
      activeRunRawQuestions.set(ctx.runId, cfg.questions);
      activeRunCompletedMatchups.set(ctx.runId, []);

      // 1. Phân chia 2 phe Xanh - Đỏ cân bằng Elo
      const participantsList =
        (ctx as { participants?: Array<{ id: string; displayName: string; elo?: number }> })
          .participants ?? [];
      const { teamBlue, teamRed } = initTeamsFromParticipants(
        participantsList.map((p: { id: string; displayName: string; elo?: number }) => ({
          id: p.id,
          displayName: p.displayName,
          elo: p.elo ?? 1000,
        })),
        { rng: ctx.rng }
      );

      // 2. Tạo cặp đấu Lượt 1 ngẫu nhiên
      const { matchups, cloneId, historyEntries } = generateRound1Pairings(
        teamBlue,
        teamRed,
        0,
        ctx.rng
      );

      const baseState: FactionDuelState = {
        status: 'team_reveal',
        title: cfg.title ?? 'Đại Chiến Xanh Đỏ (thử nghiệm)',
        currentRound: 0,
        totalRounds: cfg.totalRounds,
        questionsPerMatch: cfg.questionsPerMatch,
        teamBlue,
        teamRed,
        scoreBlue: 0,
        scoreRed: 0,
        currentMatchups: matchups,
        matchHistory: historyEntries,
        currentQuestions: [],
        shuffleQuestions: cfg.shuffleQuestions,
        shuffleOptions: cfg.shuffleOptions,
        allowQuestionRecycle: cfg.allowQuestionRecycle,
        answerTimeSeconds: cfg.answerTimeSeconds,
        pickPhaseSeconds: cfg.pickPhaseSeconds,
        cloneParticipantId: cloneId,
      };

      // Tự động chuyển sang Lượt 1
      return startNewRound(ctx, baseState, 0, matchups, cloneId);
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: FactionDuelState,
      participantId: string,
      intent: unknown
    ): FactionDuelState | ActivityReject {
      const parsed = FactionDuelIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return { ok: false, reason: 'Dữ liệu không hợp lệ', code: 'INVALID_INTENT' };
      }

      const action = parsed.data;

      // 1. Học sinh gửi câu trả lời trong lúc đang làm bài
      if (action.type === 'submit_answer') {
        if (st.status !== 'round_active') {
          return {
            ok: false,
            reason: 'Vòng thi đấu chưa bắt đầu hoặc đã kết thúc',
            code: 'ROUND_NOT_ACTIVE',
          };
        }

        const targetMatchups = st.currentMatchups.filter(
          m => m.blueParticipantId === participantId || m.redParticipantId === participantId
        );

        if (targetMatchups.length === 0) {
          return {
            ok: false,
            reason: 'Bạn không có trong cặp đấu hiện tại',
            code: 'NOT_IN_MATCHUP',
          };
        }

        const updatedMatchups = st.currentMatchups.map(m => {
          if (m.blueParticipantId === participantId) {
            return {
              ...m,
              blueAnswers: {
                ...m.blueAnswers,
                [action.questionId]: {
                  answer: action.answer,
                  timeMs: action.timeMs,
                  answeredAt: ctx.now(),
                },
              },
            };
          }
          if (m.redParticipantId === participantId) {
            return {
              ...m,
              redAnswers: {
                ...m.redAnswers,
                [action.questionId]: {
                  answer: action.answer,
                  timeMs: action.timeMs,
                  answeredAt: ctx.now(),
                },
              },
            };
          }
          return m;
        });

        // Kiểm tra xem tất cả các cặp đã hoàn thành hết số câu chưa
        const allDone = areAllMatchupsDone(updatedMatchups, st.questionsPerMatch);

        const nextSt: FactionDuelState = {
          ...st,
          currentMatchups: updatedMatchups,
        };

        if (allDone) {
          return evaluateCurrentRound(ctx, nextSt);
        }

        return nextSt;
      }

      // 2. Học sinh phe thắng chọn đối thủ trong pha 15s
      if (action.type === 'select_opponent') {
        const result = handleSelectOpponent(st, participantId, action.targetParticipantId);
        if (!result.success || !result.nextState) {
          return {
            ok: false,
            reason: result.reason ?? 'Không thể chọn đối thủ',
            code: 'SELECTION_REJECTED',
          };
        }
        return result.nextState;
      }

      return st;
    },

    onTeacherIntent(ctx: ActivityContext, st: FactionDuelState, intent: unknown): FactionDuelState {
      const parsed = FactionDuelIntentSchema.safeParse(intent);
      if (!parsed.success) return st;

      const action = parsed.data;

      switch (action.type) {
        case 'next_round': {
          if (st.status === 'round_eval' || st.status === 'pick_phase') {
            const nextRoundIndex = st.currentRound;
            const { matchups, cloneId, historyEntries } = resolvePickPhaseTimeout(
              st,
              nextRoundIndex,
              ctx.rng
            );
            const nextSt = {
              ...st,
              matchHistory: [...st.matchHistory, ...historyEntries],
            };
            return startNewRound(ctx, nextSt, nextRoundIndex, matchups, cloneId);
          }
          if (st.status === 'round_active') {
            // Giáo viên ép hoàn thành vòng sớm
            return evaluateCurrentRound(ctx, st);
          }
          return st;
        }

        case 'skip_pick_phase': {
          if (st.status === 'pick_phase') {
            const nextRoundIndex = st.currentRound;
            const { matchups, cloneId, historyEntries } = resolvePickPhaseTimeout(
              st,
              nextRoundIndex,
              ctx.rng
            );
            const nextSt = {
              ...st,
              matchHistory: [...st.matchHistory, ...historyEntries],
            };
            return startNewRound(ctx, nextSt, nextRoundIndex, matchups, cloneId);
          }
          return st;
        }

        case 'add_time': {
          const extraMs = action.seconds * 1000;
          return {
            ...st,
            roundEndTime: (st.roundEndTime ?? ctx.now()) + extraMs,
          };
        }

        case 'finish': {
          return {
            ...st,
            status: 'finished',
          };
        }

        default:
          return st;
      }
    },

    onEnd(ctx: ActivityContext, st: FactionDuelState): FactionDuelResult[] {
      const allCompleted = activeRunCompletedMatchups.get(ctx.runId) ?? st.currentMatchups;
      let winningTeam: 'blue' | 'red' | 'draw' = 'draw';
      if (st.scoreBlue > st.scoreRed) winningTeam = 'blue';
      else if (st.scoreRed > st.scoreBlue) winningTeam = 'red';

      const leaderboard = calculateFinalLeaderboard(
        st.teamBlue,
        st.teamRed,
        allCompleted,
        winningTeam
      );

      // Trao thưởng EXP theo chuẩn D8
      for (const res of leaderboard) {
        // 1. Thưởng tham gia hoàn thành trận
        void ctx.grantReward(res.participantId, 'participation', 15);

        // 2. Thưởng phe chiến thắng
        if (res.teamWon && winningTeam !== 'draw') {
          void ctx.grantReward(res.participantId, 'team_win', 30);
        }

        // 3. Thưởng MVP cá nhân
        if (res.isMvp) {
          void ctx.grantReward(res.participantId, 'mvp', 50);
        }

        // 4. Thưởng cho các pha lật kèo Underdog
        if (res.underdogWins > 0) {
          void ctx.grantReward(res.participantId, 'underdog_win', res.underdogWins * 15);
        }
      }

      // Giải phóng bộ nhớ tạm
      activeRunRawQuestions.delete(ctx.runId);
      activeRunCompletedMatchups.delete(ctx.runId);

      return leaderboard;
    },
  },
};
