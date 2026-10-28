import { z } from 'zod';
import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import {
  applyScoreModifiers,
  cleanupExpiredEffects,
  createEmptyInventory,
  grantPowerUp,
  hasActiveReflectShield,
  hasActiveShield,
  isPlayerFrozen,
  popNextPowerUp,
  resolveAttackWithShield,
} from '@educlass/core';
import type { ActivityReject, ActiveEffect, CombatEvent } from '@educlass/protocol';
import {
  type LeaderboardEntry,
  type ParticipantQuizProgress,
  type QuizLiveConfig,
  QuizLiveConfigSchema,
  type QuizLiveResult,
  QuizLiveResultSchema,
  type QuizLiveState,
  QuizLiveStateSchema,
  type QuizQuestion,
} from './quiz-schemas.js';
import { calculateQuizScore } from './quiz-scoring.js';

// Lưu trữ danh sách câu hỏi gốc kèm đáp án đúng cho từng lượt chạy theo runId
const activeRunQuestions = new Map<string, QuizQuestion[]>();

function toOptionIndex(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 };
    if (s in map) return map[s]!;
    const n = Number(s);
    if (!isNaN(n)) return n;
  }
  return -1;
}

function toBooleanVal(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === 'đúng' || s === 't' || s === '1') return true;
    if (s === 'false' || s === 'sai' || s === 'f' || s === '0') return false;
  }
  return Boolean(val);
}

/**
 * Kiểm tra xem đáp án học sinh gửi lên có chính xác không
 */
export function checkAnswerCorrectness(question: QuizQuestion, studentAnswer: unknown): boolean {
  if (studentAnswer === undefined || studentAnswer === null) {
    return false;
  }

  switch (question.type) {
    case 'mcq4': {
      const studentIdx = toOptionIndex(studentAnswer);
      const correctIdx = toOptionIndex(question.correctAnswer);
      return studentIdx >= 0 && studentIdx === correctIdx;
    }
    case 'tf': {
      return toBooleanVal(studentAnswer) === toBooleanVal(question.correctAnswer);
    }
    case 'tf_group': {
      let correctList: boolean[] = [];
      if (Array.isArray(question.correctAnswer)) {
        correctList = (question.correctAnswer as unknown[]).map(toBooleanVal);
      } else if (question.items && Array.isArray(question.items)) {
        correctList = question.items.map(it => Boolean(it.correct));
      }
      if (correctList.length === 0) return false;

      let studentList: unknown[] = [];
      if (Array.isArray(studentAnswer)) {
        studentList = studentAnswer;
      } else if (studentAnswer && typeof studentAnswer === 'object') {
        const obj = studentAnswer as Record<string, unknown>;
        if (Array.isArray(obj['selected'])) {
          studentList = obj['selected'];
        } else if (Array.isArray(obj['answers'])) {
          studentList = obj['answers'];
        } else {
          studentList = correctList.map((_, idx) => obj[String(idx)]);
        }
      }

      if (studentList.length !== correctList.length) return false;
      return correctList.every((expected, idx) => toBooleanVal(studentList[idx]) === expected);
    }
    case 'short': {
      const studentStr = String(studentAnswer).trim().toLowerCase();
      if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer.some(ans => String(ans).trim().toLowerCase() === studentStr);
      }
      return String(question.correctAnswer).trim().toLowerCase() === studentStr;
    }
    case 'matching': {
      const correctPairs =
        typeof question.correctAnswer === 'object' && question.correctAnswer !== null
          ? (question.correctAnswer as Record<string, string>)
          : {};
      const studentPairs =
        typeof studentAnswer === 'object' && studentAnswer !== null
          ? 'pairs' in studentAnswer
            ? (studentAnswer as { pairs: Record<string, string | null> }).pairs
            : (studentAnswer as Record<string, string | null>)
          : {};
      const leftKeys = Object.keys(correctPairs);
      if (leftKeys.length === 0) return false;
      return leftKeys.every(k => studentPairs[k] === correctPairs[k]);
    }
    case 'cloze_drag': {
      const correctFilled =
        typeof question.correctAnswer === 'object' && question.correctAnswer !== null
          ? (question.correctAnswer as Record<string, string>)
          : {};
      const studentFilled =
        typeof studentAnswer === 'object' && studentAnswer !== null
          ? 'filled' in studentAnswer
            ? (studentAnswer as { filled: Record<string, string | null> }).filled
            : (studentAnswer as Record<string, string | null>)
          : {};
      const blankKeys = Object.keys(correctFilled);
      if (blankKeys.length === 0) return false;
      return blankKeys.every(
        k =>
          String(studentFilled[k] || '')
            .trim()
            .toLowerCase() ===
          String(correctFilled[k] || '')
            .trim()
            .toLowerCase()
      );
    }
    default:
      return false;
  }
}

/**
 * Tính toán bảng xếp hạng sắp xếp theo điểm số và thời gian
 */
function buildLeaderboard(
  participants: Record<string, ParticipantQuizProgress> = {},
  now: number = Date.now()
): LeaderboardEntry[] {
  const list: LeaderboardEntry[] = Object.values(participants || {}).map(p => {
    const effects = cleanupExpiredEffects(p.activeEffects ?? [], now);
    const hasReflect = hasActiveReflectShield(effects, now);
    const hasShield = hasActiveShield(effects, now) && !hasReflect;
    const isFrozen = isPlayerFrozen(effects, now).frozen;
    const isDoublePoints = effects.some(e => e.powerUpType === 'double_points');
    const effectiveScore = p.bestScore !== undefined ? Math.max(p.bestScore, p.score) : p.score;

    return {
      participantId: p.participantId,
      displayName: p.displayName,
      score: effectiveScore,
      rank: 1,
      correctCount: p.correctCount,
      currentStreak: p.currentStreak,
      isCompleted: p.isCompleted,
      ...(hasShield ? { activeShield: true } : {}),
      ...(hasReflect ? { activeReflectShield: true } : {}),
      ...(isFrozen ? { isFrozen: true } : {}),
      ...(isDoublePoints ? { isDoublePoints: true } : {}),
    };
  });

  // Sắp xếp: điểm cao hơn xếp trên; nếu bằng điểm: số câu đúng nhiều hơn xếp trên
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  list.forEach((item, index) => {
    item.rank = index + 1;
  });

  return list;
}

export const QuizLiveActivity: ActivityDefinition<QuizLiveConfig, QuizLiveState, QuizLiveResult> = {
  id: 'quiz-live',
  name: 'Quiz Live',
  version: 1,
  icon: '⚡',
  description: 'Trò chơi trắc nghiệm trực tiếp chế độ Kahoot & Quizizz, bảng xếp hạng và màn chiếu',
  capabilities: ['screen'],
  rewardTriggers: ['quiz_correct', 'streak', 'top1', 'top2', 'top3', 'finish'],
  configSchema: QuizLiveConfigSchema,
  stateSchema: QuizLiveStateSchema,
  resultSchema: QuizLiveResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: QuizLiveConfig): QuizLiveState {
      // 1. Sao chép và xáo trộn câu hỏi nếu được yêu cầu
      let questionsToUse = [...cfg.questions];
      if (cfg.shuffleQuestions) {
        questionsToUse.sort(() => ctx.rng() - 0.5);
      }

      // Xáo trộn phương án lựa chọn nếu được cấu hình
      if (cfg.shuffleOptions) {
        questionsToUse = questionsToUse.map(q => {
          if (q.type === 'mcq4' && q.options && q.options.length > 0) {
            const correctOptText = q.options[Number(q.correctAnswer)] ?? '';
            const paired = q.options.map((opt, i) => ({
              opt,
              img: q.optionImages?.[i],
            }));
            paired.sort(() => ctx.rng() - 0.5);
            const shuffledOptions = paired.map(p => p.opt);
            const shuffledOptionImages = q.optionImages ? paired.map(p => p.img) : undefined;
            const newCorrectIndex = shuffledOptions.indexOf(correctOptText);
            return {
              ...q,
              options: shuffledOptions,
              optionImages: shuffledOptionImages,
              correctAnswer: newCorrectIndex >= 0 ? newCorrectIndex : q.correctAnswer,
            };
          }
          return q;
        });
      }

      // Lưu trữ bộ câu hỏi gốc có đáp án đúng
      activeRunQuestions.set(ctx.runId, questionsToUse);

      // Tạo phiên bản câu hỏi công khai (ẩn đáp án đúng cho client)
      const sanitizedQuestions = questionsToUse.map(q => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        image: q.image,
        options: q.options ? [...q.options] : undefined,
        optionImages: q.optionImages ? [...q.optionImages] : undefined,
        timeLimit: q.timeLimit ?? 20,
        points: q.points ?? 1000,
        leftItems: q.leftItems ? [...q.leftItems] : undefined,
        rightItems: q.rightItems ? [...q.rightItems] : undefined,
        template: q.template,
        blanks: q.blanks ? [...q.blanks] : undefined,
        wordBank: q.wordBank ? [...q.wordBank] : undefined,
        items: q.items ? q.items.map(it => ({ id: it.id, text: it.text })) : undefined,
      }));

      const firstQuestion = sanitizedQuestions[0];
      const timeLimit = firstQuestion ? firstQuestion.timeLimit : 20;

      return {
        title: cfg.title,
        mode: cfg.mode,
        status: 'in_question',
        currentQuestionIndex: 0,
        totalQuestions: sanitizedQuestions.length,
        questions: sanitizedQuestions,
        currentCorrectAnswer: undefined,
        questionStartedAt: ctx.now(),
        timeLimit,
        shuffleQuestions: cfg.shuffleQuestions ?? false,
        shuffleOptions: cfg.shuffleOptions ?? false,
        enablePowerUps: cfg.enablePowerUps ?? true,
        powerUpCapacity: cfg.powerUpCapacity ?? 2,
        powerUpDropCondition: cfg.powerUpDropCondition ?? 2,
        combatFeed: [],
        showCorrectAnswer: cfg.showCorrectAnswer ?? false,
        allowReplay: cfg.allowReplay ?? false,
        participants: {},
        leaderboard: [],
        questionStats: {
          totalResponses: 0,
          optionCounts: {},
          correctCount: 0,
        },
      };
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: QuizLiveState,
      participantId: string,
      intent: unknown
    ): QuizLiveState | ActivityReject {
      if (st.status === 'finished') {
        return {
          ok: false,
          reason: 'Bài Quiz đã kết thúc',
          code: 'QUIZ_FINISHED',
        };
      }

      const intentObj = intent as { type?: string };

      // 1. TẮT THÔNG BÁO CHIẾN SỰ CÁ NHÂN
      if (intentObj?.type === 'dismiss_notification') {
        const p = st.participants[participantId];
        if (!p) return st;
        return {
          ...st,
          participants: {
            ...st.participants,
            [participantId]: {
              ...p,
              personalNotification: null,
            },
          },
        };
      }

      // 1.1. CHƠI LẠI BÀI QUIZ (RESTART_QUIZ) Ở CHẾ ĐỘ QUIZIZZ
      if (intentObj?.type === 'restart_quiz') {
        if (st.mode !== 'quizizz') {
          return {
            ok: false,
            reason: 'Chức năng chơi lại chỉ áp dụng cho chế độ Quizizz',
            code: 'NOT_QUIZIZZ_MODE',
          };
        }
        if (!st.allowReplay) {
          return {
            ok: false,
            reason: 'Giáo viên chưa bật tùy chọn cho phép chơi lại bài Quiz',
            code: 'REPLAY_NOT_ALLOWED',
          };
        }

        const existingProgress = st.participants[participantId];
        if (!existingProgress) {
          return {
            ok: false,
            reason: 'Không tìm thấy người tham gia',
            code: 'PARTICIPANT_NOT_FOUND',
          };
        }

        const now = ctx.now();
        const currentScore = existingProgress.score;
        const currentBest = existingProgress.bestScore ?? currentScore;
        const newBestScore = Math.max(currentBest, currentScore);
        const newReplayCount = (existingProgress.replayCount ?? 0) + 1;

        const updatedPlayer: ParticipantQuizProgress = {
          ...existingProgress,
          score: 0,
          correctCount: 0,
          currentStreak: 0,
          maxStreak: existingProgress.maxStreak,
          currentIndex: 0,
          isCompleted: false,
          answers: {},
          lastAnswer: null,
          hiddenOptions: [],
          inventory: createEmptyInventory(st.powerUpCapacity ?? 2),
          activeEffects: [],
          personalNotification: {
            id: `notif_${now}`,
            message: `🔄 Đã bắt đầu lượt chơi thứ ${newReplayCount + 1}! Chúc bạn đạt điểm cao hơn nhé!`,
            type: 'info',
            timestamp: now,
          },
          replayCount: newReplayCount,
          bestScore: newBestScore,
        };

        const updatedParticipants = {
          ...st.participants,
          [participantId]: updatedPlayer,
        };

        const updatedLeaderboard = buildLeaderboard(updatedParticipants, now);

        return {
          ...st,
          participants: updatedParticipants,
          leaderboard: updatedLeaderboard,
        };
      }

      // 2. KÍCH HOẠT VẬT PHẨM (USE_POWERUP) TRONG CHẾ ĐỘ QUIZIZZ
      if (intentObj?.type === 'use_powerup') {
        if (st.mode !== 'quizizz' || st.enablePowerUps === false) {
          return {
            ok: false,
            reason: 'Vật phẩm chỉ khả dụng trong chế độ Quizizz có bật vật phẩm',
            code: 'POWERUPS_DISABLED',
          };
        }

        const existingProgress = st.participants[participantId];
        if (!existingProgress) {
          return {
            ok: false,
            reason: 'Không tìm thấy người tham gia',
            code: 'PARTICIPANT_NOT_FOUND',
          };
        }

        const now = ctx.now();
        const capacity = st.powerUpCapacity ?? 2;
        const currentInv = existingProgress.inventory ?? createEmptyInventory(capacity);

        // Lấy vật phẩm đầu tiên trong hàng đợi túi đồ (FIFO)
        const popResult = popNextPowerUp(currentInv);
        if (!popResult.nextItem) {
          return {
            ok: false,
            reason: 'Túi đồ của bạn đang trống!',
            code: 'INVENTORY_EMPTY',
          };
        }

        const item = popResult.nextItem;
        const updatedSender: ParticipantQuizProgress = {
          ...existingProgress,
          inventory: popResult.inventory,
          activeEffects: cleanupExpiredEffects(existingProgress.activeEffects ?? [], now),
        };
        const updatedParticipants: Record<string, ParticipantQuizProgress> = { ...st.participants };
        let newCombatFeed: CombatEvent[] = [...(st.combatFeed ?? [])];

        if (item.type === 'shield') {
          // 🛡️ Khiên Hộ Thể: 45 giây hoặc bị tấn công 1 lần
          const shieldEffect: ActiveEffect = {
            powerUpType: 'shield',
            activatedAt: now,
            expiresAt: now + (item.durationMs ?? 45000),
            fromName: existingProgress.displayName,
          };
          updatedSender.activeEffects = [...(updatedSender.activeEffects ?? []), shieldEffect];
          updatedSender.personalNotification = {
            id: `notif_${now}`,
            message: '🛡️ Đã kích hoạt [Khiên Hộ Thể] (45s)! Sẵn sàng chặn 1 đòn tấn công.',
            type: 'defense',
            timestamp: now,
          };
          newCombatFeed = [
            {
              id: `combat_${now}_${Math.floor(ctx.rng() * 10000)}`,
              timestamp: now,
              sourceName: existingProgress.displayName,
              targetName: existingProgress.displayName,
              powerUpType: 'shield',
              blocked: false,
              message: `🛡️ [${existingProgress.displayName}] đã giương Khiên Hộ Thể sẵn sàng chặn đòn!`,
            },
            ...newCombatFeed.slice(0, 19),
          ];
        } else if (item.type === 'reflect_shield') {
          // 🪞 Khiên Phản Đòn: 45 giây hoặc dội ngược 1 đòn tấn công
          const reflectEffect: ActiveEffect = {
            powerUpType: 'reflect_shield',
            activatedAt: now,
            expiresAt: now + (item.durationMs ?? 45000),
            fromName: existingProgress.displayName,
          };
          updatedSender.activeEffects = [...(updatedSender.activeEffects ?? []), reflectEffect];
          updatedSender.personalNotification = {
            id: `notif_${now}`,
            message:
              '🪞 Đã kích hoạt [Khiên Phản Đòn] (45s)! Sẵn sàng dội ngược đòn đánh của đối thủ!',
            type: 'defense',
            timestamp: now,
          };
          newCombatFeed = [
            {
              id: `combat_${now}_${Math.floor(ctx.rng() * 10000)}`,
              timestamp: now,
              sourceName: existingProgress.displayName,
              targetName: existingProgress.displayName,
              powerUpType: 'reflect_shield',
              blocked: false,
              message: `🪞 [${existingProgress.displayName}] đã kích hoạt Khiên Phản Đòn!`,
            },
            ...newCombatFeed.slice(0, 19),
          ];
        } else if (item.type === 'double_points') {
          // ⚡ Sấm Sét x2 điểm
          const doubleEffect: ActiveEffect = {
            powerUpType: 'double_points',
            activatedAt: now,
            expiresAt: now + (item.durationMs ?? 20000),
            fromName: existingProgress.displayName,
          };
          updatedSender.activeEffects = [...(updatedSender.activeEffects ?? []), doubleEffect];
          updatedSender.personalNotification = {
            id: `notif_${now}`,
            message: '⚡ Đã kích hoạt [Sấm Sét x2]! Trả lời đúng câu này sẽ nhân đôi điểm!',
            type: 'info',
            timestamp: now,
          };
          newCombatFeed = [
            {
              id: `combat_${now}_${Math.floor(ctx.rng() * 10000)}`,
              timestamp: now,
              sourceName: existingProgress.displayName,
              targetName: existingProgress.displayName,
              powerUpType: 'double_points',
              blocked: false,
              message: `⚡ [${existingProgress.displayName}] đã nạp Sấm Sét x2!`,
            },
            ...newCombatFeed.slice(0, 19),
          ];
        } else if (item.type === 'eraser_5050') {
          // 🎯 Kính Soi 50/50: Loại bỏ 2 phương án sai ở câu hiện tại
          const rawQuestions = activeRunQuestions.get(ctx.runId);
          const currentQIndex = existingProgress.currentIndex;
          const curRawQ = rawQuestions ? rawQuestions[currentQIndex] : undefined;
          let eliminated: number[] = [];
          if (curRawQ && curRawQ.type === 'mcq4' && curRawQ.options && curRawQ.options.length > 2) {
            const correctIdx = toOptionIndex(curRawQ.correctAnswer);
            const wrongIndices = Array.from({ length: curRawQ.options.length }, (_, i) => i).filter(
              i => i !== correctIdx
            );
            eliminated = wrongIndices.slice(0, 2);
          }
          updatedSender.hiddenOptions = eliminated;
          updatedSender.personalNotification = {
            id: `notif_${now}`,
            message: '🎯 [Kính Soi 50/50] đã loại bỏ 2 phương án sai!',
            type: 'info',
            timestamp: now,
          };
          newCombatFeed = [
            {
              id: `combat_${now}_${Math.floor(ctx.rng() * 10000)}`,
              timestamp: now,
              sourceName: existingProgress.displayName,
              targetName: existingProgress.displayName,
              powerUpType: 'eraser_5050',
              blocked: false,
              message: `🎯 [${existingProgress.displayName}] sử dụng Kính Soi 50/50!`,
            },
            ...newCombatFeed.slice(0, 19),
          ];
        } else if (item.type === 'freeze' || item.type === 'smoke' || item.type === 'drain') {
          // Vật phẩm tấn công: Đóng băng, Bom khói, Nam châm hút điểm -> Tự động nhắm đối thủ
          const currentLb = st.leaderboard;
          const myRankIndex = currentLb.findIndex(l => l.participantId === participantId);
          let targetEntry: LeaderboardEntry | undefined = undefined;

          if (currentLb.length > 1) {
            if (myRankIndex > 0) {
              // Nhắm vào đối thủ xếp ngay trên mình
              targetEntry = currentLb[myRankIndex - 1];
            } else {
              // Bản thân đang TOP 1 -> nhắm vào đối thủ bám đuổi TOP 2
              targetEntry = currentLb[1];
            }
          }

          if (!targetEntry || !updatedParticipants[targetEntry.participantId]) {
            updatedSender.personalNotification = {
              id: `notif_${now}`,
              message: 'ℹ️ Chưa tìm thấy đối thủ trong phòng để tấn công.',
              type: 'info',
              timestamp: now,
            };
          } else {
            const targetId = targetEntry.participantId;
            const targetPlayer = updatedParticipants[targetId]!;

            const attackRes = resolveAttackWithShield({
              attackerName: existingProgress.displayName,
              defenderName: targetPlayer.displayName,
              item,
              defenderActiveEffects: targetPlayer.activeEffects ?? [],
              now,
            });

            const updatedTarget: ParticipantQuizProgress = {
              ...targetPlayer,
              activeEffects: attackRes.newDefenderEffects,
            };

            if (attackRes.reflected) {
              // 🪞 KHIÊN PHẢN ĐÒN DỘI NGƯỢC LẠI KẺ TẤN CÔNG!
              if (attackRes.attackerPenaltyEffect) {
                updatedSender.activeEffects = [
                  ...(updatedSender.activeEffects ?? []),
                  attackRes.attackerPenaltyEffect,
                ];
              }

              if (item.type === 'drain') {
                const drainAmount = Math.min(updatedSender.score, 100);
                updatedSender.score = Math.max(0, updatedSender.score - drainAmount);
                updatedTarget.score += drainAmount;
              }

              // THÔNG BÁO CHO CẢ 2 PHÍA Ở HÀNG DƯỚI CÙNG
              updatedSender.personalNotification = {
                id: `notif_${now}`,
                message: `🪞 NGUY HIỂM! [Khiên Phản Đòn] của ${targetPlayer.displayName} đã dội ngược [${item.name}] về bạn!`,
                type: 'reflected',
                timestamp: now,
              };
              updatedTarget.personalNotification = {
                id: `notif_${now}`,
                message: `🪞 [Khiên Phản Đòn] của bạn đã dội ngược [${item.name}] về ${existingProgress.displayName}!`,
                type: 'reflected',
                timestamp: now,
              };
            } else if (attackRes.blocked) {
              // 🛡️ KHIÊN HỘ THỂ CHẶN ĐỨNG ĐÒN ĐÁNH!
              updatedSender.personalNotification = {
                id: `notif_${now}`,
                message: `🛡️ Đòn [${item.name}] của bạn đã bị [Khiên Hộ Thể] của ${targetPlayer.displayName} chặn đứng!`,
                type: 'defense',
                timestamp: now,
              };
              updatedTarget.personalNotification = {
                id: `notif_${now}`,
                message: `🛡️ [Khiên Hộ Thể] đã bảo vệ bạn khỏi đòn [${item.name}] của ${existingProgress.displayName}!`,
                type: 'defense',
                timestamp: now,
              };
            } else {
              // 🎯 ĐÒN TẤN CÔNG TRÚNG ĐÍCH!
              if (item.type === 'drain') {
                const drainAmount = Math.min(targetPlayer.score, 100);
                targetPlayer.score = Math.max(0, targetPlayer.score - drainAmount);
                updatedTarget.score = targetPlayer.score;
                updatedSender.score += drainAmount;
              }

              updatedSender.personalNotification = {
                id: `notif_${now}`,
                message: `🎯 Bạn đã phóng [${item.name}] trúng đích lên ${targetPlayer.displayName}!`,
                type: 'attack',
                timestamp: now,
              };
              updatedTarget.personalNotification = {
                id: `notif_${now}`,
                message: `⚠️ Bạn bị ${existingProgress.displayName} phóng [${item.name}]!`,
                type: 'attack',
                timestamp: now,
              };
            }

            updatedParticipants[targetId] = updatedTarget;
            newCombatFeed = [attackRes.combatEvent, ...newCombatFeed.slice(0, 19)];
          }
        }

        updatedParticipants[participantId] = updatedSender;
        const updatedLeaderboard = buildLeaderboard(updatedParticipants, now);

        return {
          ...st,
          participants: updatedParticipants,
          leaderboard: updatedLeaderboard,
          combatFeed: newCombatFeed,
        };
      }

      // 3. NỘP CÂU TRẢ LỜI (SUBMIT_ANSWER)
      const submitSchema = z.object({
        type: z.literal('submit_answer'),
        questionIndex: z.number().int().nonnegative().optional(),
        answer: z.unknown(),
        responseTimeMs: z.number().nonnegative().optional(),
        displayName: z.string().optional(),
      });

      const parsed = submitSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Dữ liệu nộp câu trả lời không hợp lệ',
          code: 'INVALID_INTENT',
        };
      }

      const rawQuestions = activeRunQuestions.get(ctx.runId);
      if (!rawQuestions || rawQuestions.length === 0) {
        return {
          ok: false,
          reason: 'Không tìm thấy bộ câu hỏi của lượt chạy',
          code: 'QUESTIONS_NOT_FOUND',
        };
      }

      // Kiểm tra xem người chơi có đang bị đối thủ đóng băng không
      const rawProgress: ParticipantQuizProgress | undefined = st.participants[participantId];
      const now = ctx.now();
      if (rawProgress) {
        const freezeCheck = isPlayerFrozen(rawProgress.activeEffects ?? [], now);
        if (freezeCheck.frozen) {
          return {
            ok: false,
            reason: `Bạn đang bị đóng băng! Chờ thêm ${(freezeCheck.remainingMs / 1000).toFixed(1)}s`,
            code: 'PLAYER_FROZEN',
          };
        }
      }

      // Xác định chỉ số câu hỏi cần chấm
      const qIndex =
        st.mode === 'kahoot' ? st.currentQuestionIndex : (parsed.data.questionIndex ?? 0);

      if (qIndex < 0 || qIndex >= rawQuestions.length) {
        return {
          ok: false,
          reason: 'Chỉ số câu hỏi không tồn tại',
          code: 'QUESTION_INDEX_OUT_OF_BOUNDS',
        };
      }

      // Chế độ Kahoot: Kiểm tra trạng thái đang trong câu hỏi
      if (st.mode === 'kahoot' && st.status !== 'in_question') {
        return {
          ok: false,
          reason: 'Thời gian làm câu hỏi này đã kết thúc',
          code: 'QUESTION_CLOSED',
        };
      }

      const currentTargetQuestion = rawQuestions[qIndex];
      if (!currentTargetQuestion) {
        return {
          ok: false,
          reason: 'Không tìm thấy câu hỏi tương ứng',
          code: 'QUESTION_NOT_FOUND',
        };
      }
      const targetQuestionSanitized = st.questions[qIndex];

      // Lấy hoặc khởi tạo tiến trình của học sinh
      const studentName =
        parsed.data.displayName ||
        rawProgress?.displayName ||
        `Học sinh ${participantId.slice(0, 4)}`;

      const existingProgress: ParticipantQuizProgress = rawProgress
        ? {
            ...rawProgress,
            displayName:
              parsed.data.displayName &&
              (!rawProgress.displayName || rawProgress.displayName.startsWith('Học sinh '))
                ? parsed.data.displayName
                : rawProgress.displayName,
          }
        : {
            participantId,
            displayName: studentName,
            score: 0,
            correctCount: 0,
            currentStreak: 0,
            maxStreak: 0,
            currentIndex: 0,
            isCompleted: false,
            answers: {},
            lastAnswer: null,
            inventory: createEmptyInventory(st.powerUpCapacity ?? 2),
            activeEffects: [],
            personalNotification: null,
            hiddenOptions: [],
          };

      const qKey = String(qIndex);
      if (existingProgress.answers[qKey]) {
        return {
          ok: false,
          reason: 'Bạn đã trả lời câu hỏi này rồi',
          code: 'ALREADY_ANSWERED',
        };
      }

      // Tính toán thời gian phản hồi (ms)
      const responseTimeMs = parsed.data.responseTimeMs ?? Math.max(0, now - st.questionStartedAt);

      // Chấm đúng / sai
      const isCorrect = checkAnswerCorrectness(currentTargetQuestion, parsed.data.answer);

      // Tính điểm tốc độ và chuỗi streak
      const scoreData = calculateQuizScore({
        isCorrect,
        responseTimeMs,
        timeLimitSeconds: targetQuestionSanitized ? targetQuestionSanitized.timeLimit : 20,
        basePoints: targetQuestionSanitized ? targetQuestionSanitized.points : 1000,
        speedScoring: true,
        currentStreak: existingProgress.currentStreak,
        streakBonus: true,
      });

      // Áp dụng bổ trợ điểm số (Sấm Sét x2)
      const scoreMod = applyScoreModifiers(
        scoreData.pointsEarned,
        existingProgress.activeEffects ?? [],
        now
      );
      const finalPointsEarned = scoreMod.finalPoints;
      const remainingEffects = scoreMod.remainingEffects;

      // Thưởng EXP nếu trả lời đúng
      if (isCorrect) {
        void ctx.grantReward(participantId, 'quiz_correct', 10);

        if (scoreData.newStreak >= 3) {
          void ctx.grantReward(participantId, 'streak', 5);
        }
      }

      // Rơi vật phẩm (Power-up Drop) khi trả lời đúng ở Quizizz
      let currentInv = existingProgress.inventory ?? createEmptyInventory(st.powerUpCapacity ?? 2);
      let currentNotif = existingProgress.personalNotification ?? null;

      if (st.mode === 'quizizz' && st.enablePowerUps !== false && isCorrect) {
        const dropCond = (st.powerUpDropCondition === 1 ? 1 : 2) as 1 | 2;
        const grant = grantPowerUp(currentInv, scoreData.newStreak, dropCond, ctx.rng);
        currentInv = grant.inventory;
        if (grant.grantedItem) {
          currentNotif = {
            id: `notif_${now}`,
            message: `🎁 Nhận vật phẩm: [${grant.grantedItem.name}] ${grant.grantedItem.icon}! Nhấn để dùng.`,
            type: 'info',
            timestamp: now,
          };
        }
      }

      // Cập nhật tiến trình học sinh
      const previousAnswerCount = Object.keys(existingProgress.answers).length;
      const isNewQuestionAnswered = !existingProgress.answers[qKey];
      const totalAnswered = previousAnswerCount + (isNewQuestionAnswered ? 1 : 0);

      const nextIndex = st.mode === 'quizizz' ? totalAnswered : qIndex + 1;
      const isCompleted =
        st.mode === 'quizizz'
          ? totalAnswered >= rawQuestions.length
          : nextIndex >= rawQuestions.length;

      const returnCorrectAnswer = st.showCorrectAnswer
        ? currentTargetQuestion.correctAnswer
        : undefined;
      const returnExplanation = st.showCorrectAnswer
        ? currentTargetQuestion.explanation
        : undefined;

      const updatedProgress: ParticipantQuizProgress = {
        ...existingProgress,
        score: existingProgress.score + finalPointsEarned,
        correctCount: existingProgress.correctCount + (isCorrect ? 1 : 0),
        currentStreak: isCorrect ? scoreData.newStreak : 0,
        maxStreak: Math.max(existingProgress.maxStreak, isCorrect ? scoreData.newStreak : 0),
        currentIndex: nextIndex,
        isCompleted,
        inventory: currentInv,
        activeEffects: remainingEffects,
        personalNotification: currentNotif,
        hiddenOptions: [],
        answers: {
          ...existingProgress.answers,
          [qKey]: {
            selectedAnswer: parsed.data.answer,
            isCorrect,
            pointsEarned: finalPointsEarned,
            responseTimeMs,
            ...(st.showCorrectAnswer
              ? { correctAnswer: returnCorrectAnswer, explanation: returnExplanation }
              : {}),
          },
        },
        lastAnswer: {
          questionIndex: qIndex,
          isCorrect,
          pointsEarned: finalPointsEarned,
          newStreak: isCorrect ? scoreData.newStreak : 0,
          selectedAnswer: parsed.data.answer,
          ...(st.showCorrectAnswer
            ? { correctAnswer: returnCorrectAnswer, explanation: returnExplanation }
            : {}),
        },
      };

      const updatedParticipants = {
        ...st.participants,
        [participantId]: updatedProgress,
      };

      // Cập nhật thống kê phân bổ lựa chọn của câu hỏi (questionStats)
      const currentStats = st.questionStats ?? {
        totalResponses: 0,
        optionCounts: {},
        correctCount: 0,
      };

      const optKey =
        currentTargetQuestion.type === 'mcq4'
          ? String(toOptionIndex(parsed.data.answer))
          : typeof parsed.data.answer === 'object'
            ? isCorrect
              ? 'correct'
              : 'wrong'
            : String(parsed.data.answer);
      const updatedStats = {
        totalResponses: currentStats.totalResponses + 1,
        optionCounts: {
          ...currentStats.optionCounts,
          [optKey]: (currentStats.optionCounts[optKey] ?? 0) + 1,
        },
        correctCount: currentStats.correctCount + (isCorrect ? 1 : 0),
      };

      const updatedLeaderboard = buildLeaderboard(updatedParticipants, now);

      return {
        ...st,
        participants: updatedParticipants,
        leaderboard: updatedLeaderboard,
        questionStats: updatedStats,
      };
    },

    onTeacherIntent(ctx: ActivityContext, st: QuizLiveState, intent: unknown): QuizLiveState {
      const teacherSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('next_question') }),
        z.object({ type: z.literal('show_review') }),
        z.object({ type: z.literal('show_leaderboard') }),
        z.object({ type: z.literal('finish_quiz') }),
      ]);

      const parsed = teacherSchema.safeParse(intent);
      if (!parsed.success) {
        return st;
      }

      const rawQuestions = activeRunQuestions.get(ctx.runId);

      switch (parsed.data.type) {
        case 'next_question': {
          const nextIndex = st.currentQuestionIndex + 1;
          if (nextIndex >= st.totalQuestions) {
            return {
              ...st,
              status: 'finished',
            };
          }
          const nextQ = st.questions[nextIndex];
          return {
            ...st,
            status: 'in_question',
            currentQuestionIndex: nextIndex,
            currentCorrectAnswer: undefined,
            questionStartedAt: ctx.now(),
            timeLimit: nextQ ? nextQ.timeLimit : 20,
            questionStats: {
              totalResponses: 0,
              optionCounts: {},
              correctCount: 0,
            },
          };
        }

        case 'show_review': {
          const rawQ = rawQuestions ? rawQuestions[st.currentQuestionIndex] : undefined;
          return {
            ...st,
            status: 'question_review',
            currentCorrectAnswer: rawQ ? rawQ.correctAnswer : undefined,
          };
        }

        case 'show_leaderboard': {
          return {
            ...st,
            status: 'leaderboard',
          };
        }

        case 'finish_quiz': {
          return {
            ...st,
            status: 'finished',
          };
        }

        default:
          return st;
      }
    },

    onEnd(ctx: ActivityContext, st: QuizLiveState): QuizLiveResult[] {
      const rawQuestions = activeRunQuestions.get(ctx.runId);
      const totalQuestions = rawQuestions ? rawQuestions.length : st.totalQuestions;

      const leaderboard = buildLeaderboard(st?.participants ?? {}, ctx.now());

      // Trao thưởng Top 1, Top 2, Top 3 và hoàn thành
      if (leaderboard.length > 0) {
        const top1 = leaderboard[0];
        if (top1 && top1.score > 0) {
          void ctx.grantReward(top1.participantId, 'top1', 50);
        }

        const top2 = leaderboard[1];
        if (top2 && top2.score > 0) {
          void ctx.grantReward(top2.participantId, 'top2', 30);
        }

        const top3 = leaderboard[2];
        if (top3 && top3.score > 0) {
          void ctx.grantReward(top3.participantId, 'top3', 20);
        }
      }

      // Thưởng hoàn thành cho tất cả thí sinh tham gia
      for (const p of Object.values(st?.participants ?? {})) {
        void ctx.grantReward(p.participantId, 'finish', 20);
      }

      // Dọn dẹp bộ câu hỏi trong bộ nhớ
      activeRunQuestions.delete(ctx.runId);

      return leaderboard.map(item => {
        const accuracy =
          totalQuestions > 0 ? Math.round((item.correctCount / totalQuestions) * 100) : 0;

        const participantProgress = st.participants[item.participantId];

        return {
          participantId: item.participantId,
          displayName: item.displayName,
          score: item.score,
          correctCount: item.correctCount,
          totalQuestions,
          accuracy,
          maxStreak: participantProgress ? participantProgress.maxStreak : 0,
          rank: item.rank,
          answers: participantProgress ? participantProgress.answers : {},
        };
      });
    },
  },
};
