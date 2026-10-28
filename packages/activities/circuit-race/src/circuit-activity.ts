import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type CircuitConfig,
  CircuitConfigSchema,
  type CircuitParticipant,
  type CircuitQuestion,
  type CircuitResult,
  CircuitResultSchema,
  type CircuitState,
  CircuitStateSchema,
} from './circuit-schemas.js';
import {
  applyCardEffect,
  drawRandomCard,
  generateTrack,
  gradeCircuitAnswer,
  resolveMovement,
  shuffleList,
  shuffleQuestionOptions,
} from './circuit-logic.js';

// Lưu trữ danh sách câu hỏi gốc kèm đáp án đúng cho từng lượt chạy theo runId
const activeRunQuestions = new Map<string, CircuitQuestion[]>();
const activeRunConfigs = new Map<string, CircuitConfig>();

/**
 * Lọc bỏ đáp án đúng khi phát sóng câu hỏi xuống client học sinh
 */
function stripAnswer(question: CircuitQuestion | null): CircuitQuestion | null {
  if (!question) return null;
  return {
    ...question,
    correctAnswer: undefined,
    explanation: undefined,
    items: question.items?.map(it => ({
      text: it.text,
      correct: false, // Ẩn đáp án đúng của từng ý
    })),
  };
}

/**
 * Tự động chuyển vòng: Thực hiện di chuyển, kiểm tra về đích và chuyển sang câu mới
 */
function advanceCircuitRound(
  ctx: ActivityContext,
  st: CircuitState,
  cfg: CircuitConfig
): CircuitState {
  const now = ctx.now();
  const trackLength = cfg.trackLength ?? 50;

  // Thực hiện di chuyển cho vòng hiện tại
  resolveMovement(st, trackLength);

  // Kiểm tra điều kiện về đích (Có ai chạm hoặc vượt ô cuối cùng hoặc hết câu hỏi)
  const finishers = Object.values(st.participants).filter(p => p.position >= trackLength - 1);
  const isLastRound = st.round >= st.totalRounds;

  if (finishers.length > 0 || isLastRound) {
    // KẾT THÚC VÀ TRAO THƯỞNG
    st.phase = 'podium';
    const sorted = Object.values(st.participants).sort((a, b) => {
      if (b.position !== a.position) return b.position - a.position;
      return b.correctCount - a.correctCount;
    });

    if (sorted[0]) {
      st.podium.rank1 = sorted[0].displayName;
      ctx.grantReward(sorted[0].participantId, 'podium_win', 50);
    }
    if (sorted[1]) {
      st.podium.rank2 = sorted[1].displayName;
      ctx.grantReward(sorted[1].participantId, 'podium_win', 30);
    }
    if (sorted[2]) {
      st.podium.rank3 = sorted[2].displayName;
      ctx.grantReward(sorted[2].participantId, 'podium_win', 20);
    }

    for (const p of sorted) {
      ctx.grantReward(p.participantId, 'race_finish', 15);
    }

    st.battleLogs.unshift({
      id: `finish_${now}`,
      timestamp: now,
      sourceId: 'system',
      sourceName: 'Hệ thống',
      cardType: 'lucky_six',
      message: `🏁 Cuộc đua kết thúc! Chúc mừng ${sorted[0]?.displayName ?? 'nhà vô địch'} đã đoạt cúp!`,
    });

    return st;
  }

  // CHUYỂN SANG VÒNG MỚI
  const nextRoundNum = st.round + 1;
  const questions = activeRunQuestions.get(ctx.runId) ?? [];
  const nextGlobalQ = questions[nextRoundNum - 1] ?? null;

  st.round = nextRoundNum;
  st.phase = 'question';
  st.currentQuestion = stripAnswer(nextGlobalQ);
  st.roundExpiresAt = now + (nextGlobalQ?.timeLimit ?? cfg.timePerQuestion ?? 20) * 1000;
  st.actionExpiresAt = 0;

  // Reset trạng thái từng vòng cho học sinh
  for (const p of Object.values(st.participants)) {
    p.answeredCurrent = false;
    p.selectedAnswer = null;
    p.lastAnswerCorrect = null;
    p.lastDiceRoll = null;
    p.lastMoveSteps = null;
    p.cardActionDone = false;
    p.hasShield = false;
    p.hasMirror = false;
    p.hasDoubleExp = false;

    // Cập nhật câu hỏi riêng nếu bật chế độ thứ tự độc lập
    if (cfg.independentStudentQuestionOrder && p.assignedQuestionOrder.length > 0) {
      const qIdx = p.assignedQuestionOrder[(nextRoundNum - 1) % questions.length] ?? 0;
      p.assignedQuestion = stripAnswer(questions[qIdx] ?? null);
    }
  }

  return st;
}

/**
 * Kiểm tra các mốc thời gian tự động (Auto-advance FSM)
 */
function checkAndAdvanceCircuitState(ctx: ActivityContext, st: CircuitState): CircuitState {
  if (st.phase === 'podium' || st.phase === 'waiting') return st;

  const now = ctx.now();
  const cfg = activeRunConfigs.get(ctx.runId);
  if (!cfg) return st;

  const pList = Object.values(st.participants);

  // 1. Nếu đang ở pha Question: kiểm tra hết giờ làm bài hoặc tất cả đã nộp
  if (st.phase === 'question') {
    const allAnswered = pList.length > 0 && pList.every(p => p.answeredCurrent);
    const timeUp = now >= st.roundExpiresAt;

    if (allAnswered || timeUp) {
      // Chuyển sang Cửa sổ dùng thẻ (Action Window)
      st.phase = 'action_window';
      const actionSecs = cfg.actionWindowSeconds ?? 10;
      st.actionExpiresAt = now + actionSecs * 1000;
    }
    return st;
  }

  // 2. Nếu đang ở pha Action Window (10s dùng thẻ)
  if (st.phase === 'action_window') {
    const timeUp = now >= st.actionExpiresAt;
    const allCardsDone =
      pList.length > 0 &&
      pList.every(p => !p.lastAnswerCorrect || p.cardActionDone || p.inventory.length === 0);

    if (timeUp || allCardsDone) {
      // Tự động chuyển vòng!
      return advanceCircuitRound(ctx, st, cfg);
    }
    return st;
  }

  return st;
}

export const CircuitRaceActivity: ActivityDefinition<CircuitConfig, CircuitState, CircuitResult> = {
  id: 'circuit-race',
  name: 'Đường Đua Tri Thức',
  version: 1,
  icon: '🏎️',
  description:
    'Trò chơi đua cờ đường đua gamification tương tác thời gian thực với thẻ bổ trợ và xúc xắc',
  rewardTriggers: ['correct_answer', 'podium_win', 'streak_3', 'race_finish'],
  configSchema: CircuitConfigSchema,
  stateSchema: CircuitStateSchema,
  resultSchema: CircuitResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: CircuitConfig): CircuitState {
      let processedQuestions = [...cfg.questions];

      // Đảo thứ tự câu hỏi nếu bật
      if (cfg.shuffleQuestions) {
        processedQuestions = shuffleList(processedQuestions, ctx.rng);
      }

      // Đảo thứ tự các phương án lựa chọn A, B, C, D nếu bật
      if (cfg.shuffleOptions) {
        processedQuestions = processedQuestions.map(q => shuffleQuestionOptions(q, ctx.rng));
      }

      activeRunQuestions.set(ctx.runId, processedQuestions);
      activeRunConfigs.set(ctx.runId, cfg);

      const track = generateTrack(cfg.trackLength);
      const firstQ = processedQuestions[0] ?? null;
      const now = ctx.now();

      return {
        phase: 'question',
        round: 1,
        totalRounds: processedQuestions.length,
        currentQuestion: stripAnswer(firstQ),
        track,
        participants: {},
        bananaTraps: [],
        battleLogs: [
          {
            id: `start_${now}`,
            timestamp: now,
            sourceId: 'system',
            sourceName: 'Hệ thống',
            cardType: 'nitro',
            message: '🚦 Cuộc đua Đường Đua Tri Thức đã chính thức bắt đầu!',
          },
        ],
        roundExpiresAt: now + (firstQ?.timeLimit ?? cfg.timePerQuestion) * 1000,
        actionExpiresAt: 0,
        actionWindowSeconds: cfg.actionWindowSeconds ?? 10,
        independentStudentQuestionOrder: Boolean(cfg.independentStudentQuestionOrder),
        podium: {},
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: CircuitState,
      participantId: string,
      intent: unknown
    ): CircuitState | ActivityReject {
      const cfg = activeRunConfigs.get(ctx.runId);
      const questions = activeRunQuestions.get(ctx.runId) ?? [];

      const rawIntent = intent as {
        type?: string;
        questionId?: string;
        answer?: unknown;
        cardId?: string;
        targetParticipantId?: string;
        option?: number;
      };

      // Đăng ký người chơi nếu chưa có trong state
      let participant: CircuitParticipant = st.participants[participantId] ?? {
        participantId,
        displayName: `HS_${participantId.slice(0, 4)}`,
        avatarJson: null,
        position: 0,
        previousPosition: 0,
        assignedQuestionOrder: [],
        assignedQuestion: null,
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
      };

      // Khởi tạo thứ tự câu hỏi độc lập cho học sinh nếu bật
      if (cfg?.independentStudentQuestionOrder && participant.assignedQuestionOrder.length === 0) {
        const indices = Array.from({ length: questions.length }, (_, i) => i);
        participant.assignedQuestionOrder = shuffleList(indices, ctx.rng);
        const qIdx = participant.assignedQuestionOrder[0] ?? 0;
        participant.assignedQuestion = stripAnswer(questions[qIdx] ?? null);
      }

      // 1. INTENT: Đăng ký thông tin học sinh (Join / Update Name)
      if (rawIntent.type === 'register_info') {
        const dName = (rawIntent as { displayName?: string }).displayName;
        const av = (rawIntent as { avatarJson?: string }).avatarJson;
        if (dName) participant.displayName = dName;
        if (av) participant.avatarJson = av;
        st.participants[participantId] = participant;
        return checkAndAdvanceCircuitState(ctx, st);
      }

      // 2. INTENT: Nộp câu trả lời
      if (rawIntent.type === 'submit_answer') {
        if (st.phase !== 'question') {
          return {
            ok: false,
            code: 'INVALID_PHASE',
            reason: 'Không trong thời gian nhận câu trả lời',
          };
        }
        if (participant.answeredCurrent) {
          return {
            ok: false,
            code: 'ALREADY_ANSWERED',
            reason: 'Bạn đã nộp câu trả lời cho vòng này rồi',
          };
        }

        // Lấy đúng câu hỏi của học sinh này (nếu độc lập hoặc chung)
        let originalQ: CircuitQuestion | null = null;
        if (cfg?.independentStudentQuestionOrder && participant.assignedQuestionOrder.length > 0) {
          const qIdx = participant.assignedQuestionOrder[(st.round - 1) % questions.length] ?? 0;
          originalQ = questions[qIdx] ?? null;
        } else {
          originalQ = questions[st.round - 1] ?? null;
        }

        if (!originalQ) {
          return { ok: false, code: 'QUESTION_NOT_FOUND', reason: 'Không tìm thấy câu hỏi' };
        }

        const grade = gradeCircuitAnswer(originalQ, rawIntent.answer);
        participant.answeredCurrent = true;
        participant.selectedAnswer = rawIntent.answer;
        participant.lastAnswerCorrect = grade.isCorrect;

        if (grade.isCorrect) {
          participant.streak += 1;
          participant.correctCount += 1;
          const expQty = participant.hasDoubleExp ? 20 : 10;
          ctx.grantReward(participantId, 'correct_answer', expQty);

          if (participant.streak === 3) {
            ctx.grantReward(participantId, 'streak_3', 15);
          }

          // Nhận thẻ bổ trợ nếu đạt yêu cầu và túi còn chỗ
          if (grade.earnedCard && participant.inventory.length < 2) {
            const newCard = drawRandomCard(ctx.rng);
            participant.inventory.push(newCard);
          }

          // Tự động gieo xúc xắc (1-6)
          const diceRoll = Math.floor(ctx.rng() * 6) + 1;
          participant.lastDiceRoll = diceRoll;
          participant.lastMoveSteps = Math.max(0, diceRoll + grade.bonusSteps);
        } else {
          participant.streak = 0;
          participant.lastDiceRoll = null;
          participant.lastMoveSteps = 0;
        }

        st.participants[participantId] = participant;

        // Kiểm tra xem có chuyển sang action_window ngay không
        return checkAndAdvanceCircuitState(ctx, st);
      }

      // 3. INTENT: Sử dụng thẻ bổ trợ
      if (rawIntent.type === 'use_card') {
        if (st.phase !== 'action_window') {
          return {
            ok: false,
            code: 'INVALID_PHASE',
            reason: 'Chỉ được dùng thẻ trong thời gian dùng thẻ',
          };
        }
        if (!participant.answeredCurrent || !participant.lastAnswerCorrect) {
          return {
            ok: false,
            code: 'NOT_ELIGIBLE',
            reason: 'Bạn cần trả lời đúng để sử dụng thẻ bổ trợ',
          };
        }

        const cardIdx = participant.inventory.findIndex(c => c.id === rawIntent.cardId);
        if (cardIdx < 0) {
          return { ok: false, code: 'CARD_NOT_FOUND', reason: 'Không tìm thấy thẻ trong túi đồ' };
        }

        const card = participant.inventory[cardIdx]!;
        const result = applyCardEffect(
          st,
          participantId,
          card.type,
          rawIntent.targetParticipantId,
          rawIntent.option
        );

        if (result.success) {
          participant.inventory.splice(cardIdx, 1);
          participant.cardActionDone = true;
          st.participants[participantId] = participant;
        }

        return checkAndAdvanceCircuitState(ctx, st);
      }

      // 4. INTENT: Bỏ qua dùng thẻ
      if (rawIntent.type === 'skip_card') {
        participant.cardActionDone = true;
        st.participants[participantId] = participant;
        return checkAndAdvanceCircuitState(ctx, st);
      }

      // 5. INTENT: Vứt bỏ thẻ cũ
      if (rawIntent.type === 'discard_card') {
        const cardIdx = participant.inventory.findIndex(c => c.id === rawIntent.cardId);
        if (cardIdx >= 0) {
          participant.inventory.splice(cardIdx, 1);
          ctx.grantReward(participantId, 'correct_answer', 5); // Thưởng bù 5 EXP
          st.participants[participantId] = participant;
        }
        return checkAndAdvanceCircuitState(ctx, st);
      }

      return checkAndAdvanceCircuitState(ctx, st);
    },

    onTeacherIntent(ctx: ActivityContext, st: CircuitState, intent: unknown): CircuitState {
      const cfg = activeRunConfigs.get(ctx.runId);
      const trackLength = cfg?.trackLength ?? 50;
      const raw = intent as { type?: string };

      // 1. Nhịp tim đồng bộ định kỳ 1s (Auto-advance check)
      if (raw.type === 'sync_tick') {
        return checkAndAdvanceCircuitState(ctx, st);
      }

      // 2. Chuyển sang Cửa sổ dùng thẻ (Action Window) thủ công
      if (raw.type === 'open_action_window') {
        st.phase = 'action_window';
        st.actionExpiresAt = ctx.now() + (cfg?.actionWindowSeconds ?? 10) * 1000;
        return st;
      }

      // 3. Chuyển ngay sang vòng tiếp theo
      if (raw.type === 'next_round') {
        if (!cfg) return st;
        return advanceCircuitRound(ctx, st, cfg);
      }

      // 4. Kết thúc sớm cuộc đua
      if (raw.type === 'end_game') {
        resolveMovement(st, trackLength);
        st.phase = 'podium';
        const sorted = Object.values(st.participants).sort((a, b) => b.position - a.position);
        if (sorted[0]) st.podium.rank1 = sorted[0].displayName;
        if (sorted[1]) st.podium.rank2 = sorted[1].displayName;
        if (sorted[2]) st.podium.rank3 = sorted[2].displayName;
        return st;
      }

      return st;
    },

    onEnd(_ctx: ActivityContext, st: CircuitState): CircuitResult[] {
      const sorted = Object.values(st.participants).sort((a, b) => {
        if (b.position !== a.position) return b.position - a.position;
        return b.correctCount - a.correctCount;
      });

      const rankings = sorted.map((p, idx) => ({
        participantId: p.participantId,
        displayName: p.displayName,
        finalPosition: p.position,
        correctCount: p.correctCount,
        rank: idx + 1,
        expEarned: p.correctCount * 10 + (idx < 3 ? 30 : 10),
      }));

      return [
        {
          summary: `Đường Đua Tri Thức kết thúc với ${rankings.length} tay đua tham dự`,
          rankings,
        },
      ];
    },
  },
};
