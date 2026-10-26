import type {
  ActiveEffect,
  CombatEvent,
} from '@educlass/protocol';
import {
  applyScoreModifiers,
  createEmptyInventory,
  grantPowerUp,
  isPlayerFrozen,
  popNextPowerUp,
  resolveAttackWithShield,
} from '@educlass/core';
import type {
  ArcadeDuelConfig,
  ArcadeDuelState,
  DuelQuestion,
  PlayerDuelState,
} from './arcade-duel-schemas.js';

/**
 * Đảo thứ tự các phương án và tính toán lại vị trí đáp án đúng
 */
export function shuffleQuestionOptions(
  question: DuelQuestion,
  rng: () => number = Math.random
): { options: string[]; correctIndex: number } {
  const originalOptions = question.options;
  const originalCorrectText = originalOptions[question.correctAnswer] ?? originalOptions[0] ?? '';

  // Tạo mảng chỉ số [0, 1, 2, 3] và đảo ngẫu nhiên
  const indices = originalOptions.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = temp;
  }

  const shuffledOptions = indices.map(idx => originalOptions[idx] ?? '');
  const newCorrectIndex = shuffledOptions.indexOf(originalCorrectText);

  return {
    options: shuffledOptions,
    correctIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

/**
 * Khởi tạo trạng thái ban đầu cho 1 người chơi
 */
export function initPlayerState(
  teamId: 'blue' | 'red',
  teamName: string,
  firstQuestion: DuelQuestion | undefined,
  shuffleOptions: boolean,
  inventoryCapacity: 2 | 3
): PlayerDuelState {
  let options: string[] = [];
  let correctIndex = 0;

  if (firstQuestion) {
    if (shuffleOptions) {
      const shuffled = shuffleQuestionOptions(firstQuestion);
      options = shuffled.options;
      correctIndex = shuffled.correctIndex;
    } else {
      options = [...firstQuestion.options];
      correctIndex = firstQuestion.correctAnswer;
    }
  }

  return {
    teamId,
    teamName,
    score: 0,
    streak: 0,
    currentQuestionIndex: 0,
    currentOptions: options,
    currentCorrectIndex: correctIndex,
    eliminatedIndices: [],
    selectedOptionIndex: null,
    isLockedIn: false,
    isCorrect: null,
    inventory: createEmptyInventory(inventoryCapacity),
    activeEffects: [],
    penaltyUntil: null,
    isCompleted: false,
  };
}

/**
 * Khởi tạo State toàn trận
 */
export function initArcadeDuelState(config: ArcadeDuelConfig): ArcadeDuelState {
  const firstQuestion = config.questions[0];
  const bluePlayer = initPlayerState(
    'blue',
    config.blueTeamName,
    firstQuestion,
    config.shuffleOptions,
    config.inventoryCapacity
  );
  const redPlayer = initPlayerState(
    'red',
    config.redTeamName,
    firstQuestion,
    config.shuffleOptions,
    config.inventoryCapacity
  );

  const timeLimit =
    config.mode === 'sync_turn' ? config.timeLimitPerQuestion : config.totalTimeLimit;

  return {
    title: config.title,
    mode: config.mode,
    status: 'in_question',
    currentQuestionIndex: 0,
    totalQuestions: config.questions.length,
    questions: config.questions,
    questionStartedAt: Date.now(),
    timeLimit,
    timeRemaining: timeLimit,
    bluePlayer,
    redPlayer,
    combatFeed: [],
    winnerTeamId: null,
    config,
  };
}

/**
 * Xử lý khi một người chơi bấm phím chọn phương án
 */
export function handleOptionSelection(
  state: ArcadeDuelState,
  teamId: 'blue' | 'red',
  optionIndex: number,
  now: number = Date.now()
): ArcadeDuelState {
  if (state.status === 'finished') return state;

  const player = teamId === 'blue' ? state.bluePlayer : state.redPlayer;

  // 1. Kiểm tra nếu đang bị khóa hoặc bị đóng băng
  if (player.isCompleted) return state;
  if (player.isLockedIn && state.mode === 'sync_turn') return state;

  // Kiểm tra hiệu ứng đóng băng từ đối thủ
  const freezeCheck = isPlayerFrozen(player.activeEffects, now);
  if (freezeCheck.frozen) {
    return state; // Đang bị đóng băng, phím không ăn
  }

  // Kiểm tra án phạt dừng 1.5s khi chọn sai trước đó
  if (player.penaltyUntil && player.penaltyUntil > now) {
    return state;
  }

  // Không cho chọn phương án đã bị Kính 50/50 loại bỏ
  if (player.eliminatedIndices.includes(optionIndex)) {
    return state;
  }

  const isCorrect = optionIndex === player.currentCorrectIndex;
  const currentQ = state.questions[player.currentQuestionIndex];
  const basePoints = currentQ ? currentQ.points : 100;

  // ============================================
  // A. CHẾ ĐỘ 1: CÙNG TRẢ LỜI CÂU HỎI (SYNC TURN)
  // ============================================
  if (state.mode === 'sync_turn') {
    // Khóa đáp án bí mật (Blind Lock-in)
    const updatedPlayer: PlayerDuelState = {
      ...player,
      selectedOptionIndex: optionIndex,
      isLockedIn: true,
      isCorrect, // Tạm ghi nhận, chưa tiết lộ cho đến khi lật bài
    };

    const newBlue = teamId === 'blue' ? updatedPlayer : state.bluePlayer;
    const newRed = teamId === 'red' ? updatedPlayer : state.redPlayer;

    // Kiểm tra nếu CẢ 2 BÊN đều đã chốt đáp án -> Chuyển sang Question Review (Lật bài)
    if (newBlue.isLockedIn && newRed.isLockedIn) {
      return revealTurnResults({ ...state, bluePlayer: newBlue, redPlayer: newRed }, now);
    }

    return {
      ...state,
      bluePlayer: newBlue,
      redPlayer: newRed,
    };
  }

  // ============================================
  // B. CHẾ ĐỘ 2: ĐUA TỐC ĐỘ (SPEED RACE)
  // ============================================
  if (isCorrect) {
    // Trả lời ĐÚNG:
    // 1. Áp dụng x2 điểm nếu có
    const scoreResult = applyScoreModifiers(basePoints, player.activeEffects, now);
    const newScore = player.score + scoreResult.finalPoints;
    const newStreak = player.streak + 1;

    // 2. Tặng vật phẩm nếu đạt điều kiện streak (chỉ khi bật vật phẩm)
    let updatedInventory = player.inventory;
    let newCombatFeed = [...state.combatFeed];

    if (state.config.enablePowerUps !== false) {
      const powerUpResult = grantPowerUp(
        player.inventory,
        newStreak,
        state.config.dropCondition
      );
      updatedInventory = powerUpResult.inventory;

      if (powerUpResult.grantedItem) {
        const feedItem: CombatEvent = {
          id: `feed_${now}_${Math.random()}`,
          timestamp: now,
          sourceName: player.teamName,
          targetName: player.teamName,
          powerUpType: powerUpResult.grantedItem.type,
          blocked: false,
          message: `🎁 ${player.teamName} đạt chuỗi ${newStreak} đúng, nhận [${powerUpResult.grantedItem.name}]!`,
        };
        newCombatFeed = [feedItem, ...newCombatFeed.slice(0, 9)];
      }
    }

    // 3. Chuyển sang câu tiếp theo
    const nextQIndex = player.currentQuestionIndex + 1;
    const isCompleted = nextQIndex >= state.totalQuestions;

    let nextOptions: string[] = [];
    let nextCorrectIndex = 0;
    const nextQuestion = state.questions[nextQIndex];

    if (nextQuestion) {
      if (state.config.shuffleOptions) {
        const sh = shuffleQuestionOptions(nextQuestion);
        nextOptions = sh.options;
        nextCorrectIndex = sh.correctIndex;
      } else {
        nextOptions = [...nextQuestion.options];
        nextCorrectIndex = nextQuestion.correctAnswer;
      }
    }

    const updatedPlayer: PlayerDuelState = {
      ...player,
      score: newScore,
      streak: newStreak,
      currentQuestionIndex: nextQIndex,
      currentOptions: nextOptions,
      currentCorrectIndex: nextCorrectIndex,
      eliminatedIndices: [],
      selectedOptionIndex: null,
      isLockedIn: false,
      isCorrect: null,
      inventory: updatedInventory,
      activeEffects: scoreResult.remainingEffects,
      penaltyUntil: null,
      isCompleted,
    };

    const newBlue = teamId === 'blue' ? updatedPlayer : state.bluePlayer;
    const newRed = teamId === 'red' ? updatedPlayer : state.redPlayer;

    // Nếu cả 2 đều xong hoặc 1 bên đã xong và bên kia cũng hoàn thành
    const bothFinished = newBlue.isCompleted && newRed.isCompleted;

    return {
      ...state,
      status: bothFinished ? 'finished' : state.status,
      winnerTeamId: bothFinished ? determineWinner(newBlue.score, newRed.score) : state.winnerTeamId,
      bluePlayer: newBlue,
      redPlayer: newRed,
      combatFeed: newCombatFeed,
    };
  } else {
    // Trả lời SAI ở Đua tốc độ:
    // Đóng băng 1.5s (hoặc theo cấu hình freezePenaltyMs)
    const penaltyDuration = state.config.freezePenaltyMs;
    const penaltyUntil = now + penaltyDuration;

    // Chuẩn bị tự động chuyển câu tiếp theo sau khi hết án phạt
    const nextQIndex = player.currentQuestionIndex + 1;
    const isCompleted = nextQIndex >= state.totalQuestions;

    let nextOptions: string[] = [];
    let nextCorrectIndex = 0;
    const nextQuestion = state.questions[nextQIndex];

    if (nextQuestion) {
      if (state.config.shuffleOptions) {
        const sh = shuffleQuestionOptions(nextQuestion);
        nextOptions = sh.options;
        nextCorrectIndex = sh.correctIndex;
      } else {
        nextOptions = [...nextQuestion.options];
        nextCorrectIndex = nextQuestion.correctAnswer;
      }
    }

    const updatedPlayer: PlayerDuelState = {
      ...player,
      streak: 0, // Gãy chuỗi
      selectedOptionIndex: optionIndex,
      isCorrect: false,
      penaltyUntil,
      // Sau 1.5s câu hỏi tự nhảy tiếp
      currentQuestionIndex: nextQIndex,
      currentOptions: nextOptions,
      currentCorrectIndex: nextCorrectIndex,
      eliminatedIndices: [],
      isCompleted,
    };

    const newBlue = teamId === 'blue' ? updatedPlayer : state.bluePlayer;
    const newRed = teamId === 'red' ? updatedPlayer : state.redPlayer;

    const bothFinished = newBlue.isCompleted && newRed.isCompleted;

    return {
      ...state,
      status: bothFinished ? 'finished' : state.status,
      winnerTeamId: bothFinished ? determineWinner(newBlue.score, newRed.score) : state.winnerTeamId,
      bluePlayer: newBlue,
      redPlayer: newRed,
    };
  }
}

/**
 * Lật bài khi kết thúc lượt ở Chế độ Cùng trả lời (Sync Turn)
 */
export function revealTurnResults(state: ArcadeDuelState, now: number = Date.now()): ArcadeDuelState {
  const currentQ = state.questions[state.currentQuestionIndex];
  const basePoints = currentQ ? currentQ.points : 100;

  // Tính điểm cho Đội Xanh
  let blueScore = state.bluePlayer.score;
  let blueStreak = state.bluePlayer.streak;
  let blueInv = state.bluePlayer.inventory;
  let blueEffects = [...state.bluePlayer.activeEffects];

  if (state.bluePlayer.isCorrect) {
    const mod = applyScoreModifiers(basePoints, blueEffects, now);
    blueScore += mod.finalPoints;
    blueStreak += 1;
    blueEffects = mod.remainingEffects;

    if (state.config.enablePowerUps !== false) {
      const grant = grantPowerUp(blueInv, blueStreak, state.config.dropCondition);
      blueInv = grant.inventory;
    }
  } else {
    blueStreak = 0;
  }

  // Tính điểm cho Đội Đỏ
  let redScore = state.redPlayer.score;
  let redStreak = state.redPlayer.streak;
  let redInv = state.redPlayer.inventory;
  let redEffects = [...state.redPlayer.activeEffects];

  if (state.redPlayer.isCorrect) {
    const mod = applyScoreModifiers(basePoints, redEffects, now);
    redScore += mod.finalPoints;
    redStreak += 1;
    redEffects = mod.remainingEffects;

    if (state.config.enablePowerUps !== false) {
      const grant = grantPowerUp(redInv, redStreak, state.config.dropCondition);
      redInv = grant.inventory;
    }
  } else {
    redStreak = 0;
  }

  return {
    ...state,
    status: 'question_review',
    bluePlayer: {
      ...state.bluePlayer,
      score: blueScore,
      streak: blueStreak,
      inventory: blueInv,
      activeEffects: blueEffects,
    },
    redPlayer: {
      ...state.redPlayer,
      score: redScore,
      streak: redStreak,
      inventory: redInv,
      activeEffects: redEffects,
    },
  };
}

/**
 * Xử lý khi người chơi bấm phím kích hoạt vật phẩm (Q cho Xanh, 5 cho Đỏ)
 */
export function handleUsePowerUp(
  state: ArcadeDuelState,
  teamId: 'blue' | 'red',
  now: number = Date.now()
): ArcadeDuelState {
  if (state.config.enablePowerUps === false) {
    return state;
  }

  const player = teamId === 'blue' ? state.bluePlayer : state.redPlayer;
  const opponent = teamId === 'blue' ? state.redPlayer : state.bluePlayer;

  // Lấy vật phẩm đầu tiên trong hàng đợi (FIFO)
  const popResult = popNextPowerUp(player.inventory);
  if (!popResult.nextItem) {
    return state; // Túi đồ rỗng
  }

  const item = popResult.nextItem;
  const updatedPlayer: PlayerDuelState = {
    ...player,
    inventory: popResult.inventory,
  };
  const updatedOpponent: PlayerDuelState = { ...opponent };
  let newFeed = [...state.combatFeed];

  // 1. VẬT PHẨM: 🛡️ KHIÊN HỘ THỂ
  if (item.type === 'shield') {
    const shieldEffect: ActiveEffect = {
      powerUpType: 'shield',
      activatedAt: now,
      expiresAt: now + (item.durationMs ?? 15000),
      fromName: player.teamName,
    };
    updatedPlayer.activeEffects = [...updatedPlayer.activeEffects, shieldEffect];

    newFeed = [
      {
        id: `feed_${now}_${Math.random()}`,
        timestamp: now,
        sourceName: player.teamName,
        targetName: player.teamName,
        powerUpType: 'shield',
        blocked: false,
        message: `🛡️ ${player.teamName} đã giương [Khiên Hộ Thể] sẵn sàng chặn đòn!`,
      },
      ...newFeed.slice(0, 9),
    ];
  }

  // 2. VẬT PHẨM: ⚡ SẤM SÉT x2
  else if (item.type === 'double_points') {
    const doubleEffect: ActiveEffect = {
      powerUpType: 'double_points',
      activatedAt: now,
      expiresAt: now + (item.durationMs ?? 12000),
      fromName: player.teamName,
    };
    updatedPlayer.activeEffects = [...updatedPlayer.activeEffects, doubleEffect];

    newFeed = [
      {
        id: `feed_${now}_${Math.random()}`,
        timestamp: now,
        sourceName: player.teamName,
        targetName: player.teamName,
        powerUpType: 'double_points',
        blocked: false,
        message: `⚡ ${player.teamName} nạp [Sấm Sét x2], sẵn sàng nhân đôi điểm!`,
      },
      ...newFeed.slice(0, 9),
    ];
  }

  // 3. VẬT PHẨM: 🎯 KÍNH SOI 50/50
  else if (item.type === 'eraser_5050') {
    const correctIdx = player.currentCorrectIndex;
    const totalOpts = player.currentOptions.length;
    // Tìm các phương án sai
    const wrongIndices = Array.from({ length: totalOpts }, (_, i) => i).filter(
      i => i !== correctIdx
    );
    // Chọn 2 phương án sai ngẫu nhiên để loại
    const toEliminate = wrongIndices.slice(0, 2);
    updatedPlayer.eliminatedIndices = toEliminate;

    newFeed = [
      {
        id: `feed_${now}_${Math.random()}`,
        timestamp: now,
        sourceName: player.teamName,
        targetName: player.teamName,
        powerUpType: 'eraser_5050',
        blocked: false,
        message: `🎯 ${player.teamName} dùng [Kính Soi 50/50], loại bỏ 2 đáp án sai!`,
      },
      ...newFeed.slice(0, 9),
    ];
  }

  // 4. VẬT PHẨM TẤN CÔNG: ❄️ ĐÓNG BĂNG, 🌫️ BOM KHÓI
  else if (item.type === 'freeze' || item.type === 'smoke') {
    const attackResult = resolveAttackWithShield({
      attackerName: player.teamName,
      defenderName: opponent.teamName,
      item,
      defenderActiveEffects: opponent.activeEffects,
      now,
    });

    updatedOpponent.activeEffects = attackResult.newDefenderEffects;
    newFeed = [attackResult.combatEvent, ...newFeed.slice(0, 9)];
  }

  // 5. VẬT PHẨM: 🧲 NAM CHÂM HÚT ĐIỂM
  else if (item.type === 'drain') {
    const attackResult = resolveAttackWithShield({
      attackerName: player.teamName,
      defenderName: opponent.teamName,
      item,
      defenderActiveEffects: opponent.activeEffects,
      now,
    });

    if (attackResult.blocked) {
      updatedOpponent.activeEffects = attackResult.newDefenderEffects;
      newFeed = [attackResult.combatEvent, ...newFeed.slice(0, 9)];
    } else {
      const drainAmount = Math.min(opponent.score, 100);
      updatedOpponent.score = Math.max(0, opponent.score - drainAmount);
      updatedPlayer.score += drainAmount;

      newFeed = [
        {
          id: `feed_${now}_${Math.random()}`,
          timestamp: now,
          sourceName: player.teamName,
          targetName: opponent.teamName,
          powerUpType: 'drain',
          blocked: false,
          message: `🧲 ${player.teamName} dùng [Nam Châm Hút Điểm], cướp ${drainAmount} điểm từ ${opponent.teamName}!`,
        },
        ...newFeed.slice(0, 9),
      ];
    }
  }

  return {
    ...state,
    bluePlayer: teamId === 'blue' ? updatedPlayer : updatedOpponent,
    redPlayer: teamId === 'red' ? updatedPlayer : updatedOpponent,
    combatFeed: newFeed,
  };
}

/**
 * Chuyển sang câu hỏi tiếp theo ở chế độ Cùng trả lời (Sync Turn)
 */
export function advanceToNextSyncQuestion(
  state: ArcadeDuelState,
  now: number = Date.now()
): ArcadeDuelState {
  const nextQIndex = state.currentQuestionIndex + 1;
  if (nextQIndex >= state.totalQuestions) {
    return {
      ...state,
      status: 'finished',
      winnerTeamId: determineWinner(state.bluePlayer.score, state.redPlayer.score),
    };
  }

  const nextQuestion = state.questions[nextQIndex];
  if (!nextQuestion) return state;

  // Chuẩn bị phương án cho cả 2 bên (đảo độc lập)
  let blueOpts = [...nextQuestion.options];
  let blueCorrect = nextQuestion.correctAnswer;
  let redOpts = [...nextQuestion.options];
  let redCorrect = nextQuestion.correctAnswer;

  if (state.config.shuffleOptions) {
    const shBlue = shuffleQuestionOptions(nextQuestion);
    blueOpts = shBlue.options;
    blueCorrect = shBlue.correctIndex;

    const shRed = shuffleQuestionOptions(nextQuestion);
    redOpts = shRed.options;
    redCorrect = shRed.correctIndex;
  }

  return {
    ...state,
    status: 'in_question',
    currentQuestionIndex: nextQIndex,
    questionStartedAt: now,
    timeRemaining: state.config.timeLimitPerQuestion,
    bluePlayer: {
      ...state.bluePlayer,
      currentQuestionIndex: nextQIndex,
      currentOptions: blueOpts,
      currentCorrectIndex: blueCorrect,
      eliminatedIndices: [],
      selectedOptionIndex: null,
      isLockedIn: false,
      isCorrect: null,
    },
    redPlayer: {
      ...state.redPlayer,
      currentQuestionIndex: nextQIndex,
      currentOptions: redOpts,
      currentCorrectIndex: redCorrect,
      eliminatedIndices: [],
      selectedOptionIndex: null,
      isLockedIn: false,
      isCorrect: null,
    },
  };
}

export function determineWinner(blueScore: number, redScore: number): 'blue' | 'red' | 'draw' {
  if (blueScore > redScore) return 'blue';
  if (redScore > blueScore) return 'red';
  return 'draw';
}
