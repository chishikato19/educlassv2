import type {
  Card,
  CardType,
  CircuitParticipant,
  CircuitQuestion,
  CircuitState,
  TrackTile,
} from './circuit-schemas.js';

export const CARD_DEFINITIONS: Record<
  CardType,
  { name: string; icon: string; description: string; targetRequired: boolean }
> = {
  leader_snare: {
    name: 'Nam châm hút Top 1',
    icon: '🧲',
    description: 'Kéo học sinh đang dẫn đầu lùi lại 3 ô',
    targetRequired: false,
  },
  front_hook: {
    name: 'Móc câu người trước mặt',
    icon: '🎣',
    description: 'Kéo người chơi gần nhất ngay trước bạn lùi lại 2 ô',
    targetRequired: false,
  },
  banana_trap: {
    name: 'Bẫy vỏ chuối',
    icon: '🍌',
    description: 'Đặt bẫy tại ô bạn rời đi. Ai dẫm phải sẽ bị trượt lùi 2 ô',
    targetRequired: false,
  },
  whirlwind: {
    name: 'Cơn lốc đẩy lùi',
    icon: '🌪️',
    description: 'Thổi lùi toàn bộ đối thủ trong phạm vi 2 ô xung quanh lùi 1 ô',
    targetRequired: false,
  },
  freeze: {
    name: 'Đóng băng đối thủ',
    icon: '🧊',
    description: 'Đối thủ được chọn ở vòng sau chỉ được đi tối đa 2 ô',
    targetRequired: true,
  },
  swap: {
    name: 'Hoán đổi vị trí',
    icon: '🔄',
    description: 'Đổi chỗ cho người đứng ngay trước mặt bạn (cự ly ≤ 3 ô)',
    targetRequired: false,
  },
  shield: {
    name: 'Khiên hộ mệnh',
    icon: '🛡️',
    description: 'Miễn nhiễm mọi thẻ tấn công và bẫy sa lầy trong vòng này',
    targetRequired: false,
  },
  mirror: {
    name: 'Gương phản đòn',
    icon: '🪞',
    description: 'Tự động phản ngược chiêu thức của bất kỳ ai nhắm vào bạn',
    targetRequired: false,
  },
  nitro: {
    name: 'Bình Nitro tăng tốc',
    icon: '🚀',
    description: 'Cộng thêm +2 bước đi sau khi gieo xúc xắc',
    targetRequired: false,
  },
  handbrake: {
    name: 'Phanh khẩn cấp',
    icon: '🛑',
    description: 'Giảm 1-2 bước đi để né tránh ô nguy hiểm phía trước',
    targetRequired: false,
  },
  reroll: {
    name: 'Xúc xắc ma thuật',
    icon: '🎲',
    description: 'Gieo lại xúc xắc một lần nữa để tìm kiếm số điểm cao hơn',
    targetRequired: false,
  },
  lucky_six: {
    name: 'Xúc xắc hoàng gia',
    icon: '👑',
    description: 'Cố định kết quả xúc xắc vòng này luôn là 6 điểm',
    targetRequired: false,
  },
  lifeline_5050: {
    name: 'Phao cứu sinh',
    icon: '💡',
    description: 'Loại bỏ 2 đáp án sai ở câu hỏi trắc nghiệm tiếp theo',
    targetRequired: false,
  },
  double_exp: {
    name: 'Nhân đôi EXP',
    icon: '💎',
    description: 'Nhân 2 toàn bộ số điểm kinh nghiệm nhận được trong vòng này',
    targetRequired: false,
  },
};

/**
 * Xáo trộn một mảng thuần túy theo thuật toán Fisher-Yates
 */
export function shuffleList<T>(list: T[], rng: () => number = Math.random): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Đảo các phương án trắc nghiệm A, B, C, D kèm cập nhật lại đáp án đúng
 */
export function shuffleQuestionOptions(
  question: CircuitQuestion,
  rng: () => number = Math.random
): CircuitQuestion {
  if (question.type !== 'mcq4' || !question.options || question.options.length === 0) {
    return question;
  }

  const rawCorrectIdx = Number(question.correctAnswer ?? 0);
  const correctText = question.options[rawCorrectIdx] ?? question.options[0];

  const shuffledOptions = shuffleList(question.options, rng);
  const newCorrectIdx = shuffledOptions.findIndex(opt => opt === correctText);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : 0,
  };
}

/**
 * Sinh bản đồ đường đua uốn lượn với các ô sự kiện cân bằng
 */
export function generateTrack(length: number): TrackTile[] {
  const tiles: TrackTile[] = [];
  for (let i = 0; i < length; i++) {
    if (i === 0 || i === length - 1) {
      tiles.push({ index: i, type: 'normal', boostSteps: 0 });
      continue;
    }
    if (i % 20 === 0) {
      tiles.push({ index: i, type: 'checkpoint', boostSteps: 0 });
    } else if (i % 8 === 3) {
      tiles.push({ index: i, type: 'boost', boostSteps: 2 });
    } else if (i % 11 === 7) {
      tiles.push({ index: i, type: 'mud', boostSteps: 0 });
    } else if (i % 7 === 5) {
      tiles.push({ index: i, type: 'mystery', boostSteps: 0 });
    } else {
      tiles.push({ index: i, type: 'normal', boostSteps: 0 });
    }
  }
  return tiles;
}

/**
 * Rút ngẫu nhiên một thẻ bổ trợ
 */
export function drawRandomCard(rng: () => number = Math.random): Card {
  const cardTypes = Object.keys(CARD_DEFINITIONS) as CardType[];
  const idx = Math.floor(rng() * cardTypes.length);
  const selectedType = cardTypes[idx] ?? 'nitro';
  const def = CARD_DEFINITIONS[selectedType];
  const cardId = `card_${Date.now()}_${Math.floor(rng() * 10000)}`;

  return {
    id: cardId,
    type: selectedType,
    name: def.name,
    icon: def.icon,
    description: def.description,
    targetRequired: def.targetRequired,
  };
}

/**
 * Chấm điểm câu hỏi theo từng loại (MCQ, Đúng/Sai, Chùm Đúng/Sai chuẩn BGD, Trả lời ngắn)
 */
export function gradeCircuitAnswer(
  question: CircuitQuestion,
  studentAnswer: unknown
): {
  isCorrect: boolean;
  isPartial: boolean;
  bonusSteps: number;
  earnedCard: boolean;
  explanation: string;
} {
  const explanation = question.explanation ?? '';

  if (question.type === 'mcq4') {
    const isCorrect = studentAnswer === question.correctAnswer;
    return {
      isCorrect,
      isPartial: false,
      bonusSteps: 0,
      earnedCard: isCorrect,
      explanation,
    };
  }

  if (question.type === 'tf') {
    const isCorrect = Boolean(studentAnswer) === Boolean(question.correctAnswer);
    return {
      isCorrect,
      isPartial: false,
      bonusSteps: 0,
      earnedCard: isCorrect,
      explanation,
    };
  }

  if (question.type === 'tf_group') {
    const items = question.items ?? [];
    if (!Array.isArray(studentAnswer) || items.length === 0) {
      return { isCorrect: false, isPartial: false, bonusSteps: 0, earnedCard: false, explanation };
    }

    let correctCount = 0;
    for (let i = 0; i < Math.min(items.length, studentAnswer.length); i++) {
      if (studentAnswer[i] === items[i]?.correct) {
        correctCount++;
      }
    }

    if (correctCount === 4) {
      return { isCorrect: true, isPartial: false, bonusSteps: 1, earnedCard: true, explanation };
    }
    if (correctCount === 3) {
      return { isCorrect: true, isPartial: false, bonusSteps: 0, earnedCard: true, explanation };
    }
    if (correctCount === 2) {
      // Đúng 2/4 ý: bước đi giảm 1 nửa, không nhận thẻ
      return { isCorrect: true, isPartial: true, bonusSteps: -2, earnedCard: false, explanation };
    }
    return { isCorrect: false, isPartial: false, bonusSteps: 0, earnedCard: false, explanation };
  }

  if (question.type === 'short') {
    const rawAnswer = String(studentAnswer ?? '').trim().toLowerCase();
    let isCorrect = false;

    if (Array.isArray(question.correctAnswer)) {
      isCorrect = (question.correctAnswer as string[]).some(
        ans => String(ans).trim().toLowerCase() === rawAnswer
      );
    } else {
      isCorrect = String(question.correctAnswer ?? '').trim().toLowerCase() === rawAnswer;
    }

    return {
      isCorrect,
      isPartial: false,
      bonusSteps: 0,
      earnedCard: isCorrect,
      explanation,
    };
  }

  return { isCorrect: false, isPartial: false, bonusSteps: 0, earnedCard: false, explanation };
}

/**
 * Tìm người đứng đầu hiện tại (Rank 1) loại trừ người gọi
 */
export function findLeader(
  participants: Record<string, CircuitParticipant>,
  excludeId: string
): CircuitParticipant | undefined {
  let leader: CircuitParticipant | undefined;
  let maxPos = -1;

  for (const p of Object.values(participants)) {
    if (p.participantId === excludeId) continue;
    if (p.position > maxPos) {
      maxPos = p.position;
      leader = p;
    }
  }
  return leader;
}

/**
 * Tìm người chơi gần nhất đang đứng phía trước mình
 */
export function findNearestFrontParticipant(
  participants: Record<string, CircuitParticipant>,
  myId: string
): CircuitParticipant | undefined {
  const me = participants[myId];
  if (!me) return undefined;

  let nearest: CircuitParticipant | undefined;
  let minDiff = Infinity;

  for (const p of Object.values(participants)) {
    if (p.participantId === myId) continue;
    const diff = p.position - me.position;
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nearest = p;
    }
  }
  return nearest;
}

/**
 * Thực thi hiệu ứng thẻ bổ trợ
 */
export function applyCardEffect(
  state: CircuitState,
  sourceId: string,
  cardType: CardType,
  targetId?: string,
  option?: number
): { success: boolean; message: string } {
  const source = state.participants[sourceId];
  if (!source) return { success: false, message: 'Người chơi không tồn tại' };

  const now = Date.now();

  // 1. Bình Nitro tăng tốc
  if (cardType === 'nitro') {
    source.lastMoveSteps = (source.lastMoveSteps ?? 0) + 2;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} bật Nitro tăng tốc thêm +2 ô!`,
    });
    return { success: true, message: 'Đã kích hoạt Nitro +2 ô' };
  }

  // 2. Phanh khẩn cấp
  if (cardType === 'handbrake') {
    const brakeSteps = option === 2 ? 2 : 1;
    source.lastMoveSteps = Math.max(0, (source.lastMoveSteps ?? 0) - brakeSteps);
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} đạp phanh giảm ${brakeSteps} bước để né bẫy!`,
    });
    return { success: true, message: `Đã giảm ${brakeSteps} bước` };
  }

  // 3. Xúc xắc hoàng gia
  if (cardType === 'lucky_six') {
    source.lastDiceRoll = 6;
    source.lastMoveSteps = 6;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} dùng Xúc xắc hoàng gia nhận 6 điểm tuyệt đối!`,
    });
    return { success: true, message: 'Xúc xắc đã được đặt thành 6' };
  }

  // 4. Xúc xắc ma thuật (Reroll)
  if (cardType === 'reroll') {
    const newRoll = Math.floor(Math.random() * 6) + 1;
    source.lastDiceRoll = newRoll;
    source.lastMoveSteps = newRoll;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} gieo lại xúc xắc ma thuật được ${newRoll} điểm!`,
    });
    return { success: true, message: `Gieo lại được ${newRoll} điểm` };
  }

  // 5. Khiên hộ mệnh
  if (cardType === 'shield') {
    source.hasShield = true;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} kích hoạt Khiên hộ mệnh miễn nhiễm mọi đòn đánh!`,
    });
    return { success: true, message: 'Đã bật Khiên hộ mệnh' };
  }

  // 6. Gương phản đòn
  if (cardType === 'mirror') {
    source.hasMirror = true;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} trang bị Gương phản đòn!`,
    });
    return { success: true, message: 'Đã trang bị Gương phản đòn' };
  }

  // 7. Nhân đôi EXP
  if (cardType === 'double_exp') {
    source.hasDoubleExp = true;
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} kích hoạt Nhân đôi EXP vòng này!`,
    });
    return { success: true, message: 'Đã kích hoạt Nhân đôi EXP' };
  }

  // 8. Phao cứu sinh (50/50)
  if (cardType === 'lifeline_5050') {
    source.eliminatedOptions = [1, 3]; // Loại 2 phương án sai
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} sử dụng Phao cứu sinh loại 2 đáp án sai!`,
    });
    return { success: true, message: 'Đã loại 2 phương án sai ở câu tiếp theo' };
  }

  // 9. Bẫy vỏ chuối
  if (cardType === 'banana_trap') {
    state.bananaTraps.push({
      tileIndex: source.position,
      placedBy: sourceId,
      placedByName: source.displayName,
      turnsLeft: 3,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} đặt một chiếc Bẫy vỏ chuối tại ô ${source.position}!`,
    });
    return { success: true, message: `Đã đặt bẫy vỏ chuối tại ô ${source.position}` };
  }

  // 10. Cơn lốc đẩy lùi
  if (cardType === 'whirlwind') {
    let affectedCount = 0;
    for (const p of Object.values(state.participants)) {
      if (p.participantId === sourceId) continue;
      const dist = Math.abs(p.position - source.position);
      if (dist <= 2) {
        if (p.hasShield) {
          p.hasShield = false;
          p.receivedNotifications.unshift({
            id: `notif_${now}`,
            message: `Khiên hộ mệnh đã đỡ Cơn lốc của ${source.displayName}!`,
            timestamp: now,
            isAlert: false,
          });
        } else {
          p.position = Math.max(0, p.position - 1);
          p.receivedNotifications.unshift({
            id: `notif_${now}`,
            message: `Bạn bị Cơn lốc của ${source.displayName} thổi lùi 1 ô!`,
            timestamp: now,
            isAlert: true,
          });
          affectedCount++;
        }
      }
    }
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      cardType,
      message: `${source.displayName} tung Cơn lốc đẩy lùi ${affectedCount} đối thủ xung quanh!`,
    });
    return { success: true, message: `Cơn lốc đã thổi lùi ${affectedCount} bạn` };
  }

  // CÁC THẺ CẦN ĐỐI TƯỢNG (TARGET)
  let target: CircuitParticipant | undefined;

  if (cardType === 'leader_snare') {
    target = findLeader(state.participants, sourceId);
    if (!target) return { success: false, message: 'Bạn đang dẫn đầu hoặc không có ai phía trước!' };
  } else if (cardType === 'front_hook') {
    target = findNearestFrontParticipant(state.participants, sourceId);
    if (!target) return { success: false, message: 'Không có ai đang đứng phía trước bạn!' };
  } else if (cardType === 'swap') {
    target = findNearestFrontParticipant(state.participants, sourceId);
    if (!target || target.position - source.position > 3) {
      return { success: false, message: 'Không có đối thủ trong cự ly 3 ô trước mặt để đổi chỗ!' };
    }
  } else if (cardType === 'freeze') {
    target = targetId ? state.participants[targetId] : findLeader(state.participants, sourceId);
    if (!target) return { success: false, message: 'Không tìm thấy đối thủ mục tiêu!' };
  }

  if (!target) return { success: false, message: 'Mục tiêu không hợp lệ!' };

  // Xử lý Gương phản đòn
  if (target.hasMirror) {
    target.hasMirror = false;
    source.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `${target.displayName} có Gương phản đòn! Bạn đã bị trúng chính chiêu của mình!`,
      timestamp: now,
      isAlert: true,
    });
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Gương phản đòn đã bật ngược chiêu của ${source.displayName}!`,
      timestamp: now,
      isAlert: false,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🪞 Gương phản đòn của ${target.displayName} đã phản ngược chiêu thức về ${source.displayName}!`,
    });
    // Phản ngược lại source
    if (cardType === 'leader_snare') source.position = Math.max(0, source.position - 3);
    if (cardType === 'front_hook') source.position = Math.max(0, source.position - 2);
    if (cardType === 'freeze') source.isFrozen = true;
    return { success: true, message: 'Chiêu thức bị phản ngược lại bạn!' };
  }

  // Xử lý Khiên hộ mệnh
  if (target.hasShield) {
    target.hasShield = false;
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Khiên hộ mệnh đã chặn đứng chiêu của ${source.displayName}!`,
      timestamp: now,
      isAlert: false,
    });
    source.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `${target.displayName} đã dùng Khiên chặn đứng chiêu thức!`,
      timestamp: now,
      isAlert: true,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🛡️ ${target.displayName} dùng Khiên hộ mệnh chặn đứng đòn đánh của ${source.displayName}!`,
    });
    return { success: true, message: `${target.displayName} có Khiên bảo vệ` };
  }

  // Thi hành tác động cụ thể lên target
  if (cardType === 'leader_snare') {
    target.position = Math.max(0, target.position - 3);
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Báo động! Bạn vừa bị ${source.displayName} dùng Nam châm kéo lùi 3 ô!`,
      timestamp: now,
      isAlert: true,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🧲 ${source.displayName} dùng Nam châm kéo ${target.displayName} lùi 3 ô!`,
    });
    return { success: true, message: `Đã kéo ${target.displayName} lùi 3 ô!` };
  }

  if (cardType === 'front_hook') {
    target.position = Math.max(0, target.position - 2);
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Ái chà! Bạn vừa bị ${source.displayName} phóng Móc câu kéo lùi 2 ô!`,
      timestamp: now,
      isAlert: true,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🎣 ${source.displayName} dùng Móc câu kéo ${target.displayName} lùi 2 ô!`,
    });
    return { success: true, message: `Đã kéo ${target.displayName} lùi 2 ô!` };
  }

  if (cardType === 'swap') {
    const tempPos = source.position;
    source.position = target.position;
    target.position = tempPos;
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Bất ngờ! ${source.displayName} đã dùng thẻ Hoán đổi vị trí với bạn!`,
      timestamp: now,
      isAlert: true,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🔄 ${source.displayName} đã đổi chỗ cho ${target.displayName}!`,
    });
    return { success: true, message: `Đã đổi chỗ với ${target.displayName}!` };
  }

  if (cardType === 'freeze') {
    target.isFrozen = true;
    target.receivedNotifications.unshift({
      id: `notif_${now}`,
      message: `Lạnh cóng! Bạn đã bị ${source.displayName} Đóng băng cho vòng sau!`,
      timestamp: now,
      isAlert: true,
    });
    state.battleLogs.unshift({
      id: `log_${now}`,
      timestamp: now,
      sourceId,
      sourceName: source.displayName,
      targetId: target.participantId,
      targetName: target.displayName,
      cardType,
      message: `🧊 ${source.displayName} đã Đóng băng ${target.displayName}!`,
    });
    return { success: true, message: `Đã đóng băng ${target.displayName} thành công!` };
  }

  return { success: false, message: 'Thẻ chưa được hỗ trợ' };
}

/**
 * Xử lý bước di chuyển và kích hoạt ô đặc biệt / bẫy vỏ chuối
 */
export function resolveMovement(state: CircuitState, trackLength: number): void {
  const now = Date.now();

  for (const p of Object.values(state.participants)) {
    if (!p.lastAnswerCorrect) {
      // Trả lời sai: nếu đang sa lầy thì giữ nguyên, ngược lại đứng yên
      continue;
    }

    // Nếu đang bị sa lầy mà trả lời đúng: thoát sa lầy!
    if (p.mudTrapped) {
      p.mudTrapped = false;
      p.receivedNotifications.unshift({
        id: `notif_${now}`,
        message: 'Xuất sắc! Bạn đã vượt qua câu hỏi và thoát khỏi vũng bùn lầy!',
        timestamp: now,
        isAlert: false,
      });
    }

    let steps = p.lastMoveSteps ?? p.lastDiceRoll ?? 0;
    if (p.isFrozen) {
      steps = Math.min(2, steps);
      p.isFrozen = false; // Hết đóng băng
    }

    let nextPos = Math.min(trackLength - 1, p.position + steps);

    // Kiểm tra Bẫy vỏ chuối trên đường đi hoặc tại điểm đến
    const trapIndex = state.bananaTraps.findIndex(t => t.tileIndex === nextPos);
    if (trapIndex >= 0) {
      const trap = state.bananaTraps[trapIndex];
      if (trap && !p.hasShield) {
        nextPos = Math.max(0, nextPos - 2);
        p.receivedNotifications.unshift({
          id: `notif_${now}`,
          message: `Ối trượt chân! Bạn dẫm phải Vỏ chuối do ${trap.placedByName} đặt và bị lùi 2 ô!`,
          timestamp: now,
          isAlert: true,
        });
        state.battleLogs.unshift({
          id: `log_${now}`,
          timestamp: now,
          sourceId: trap.placedBy,
          sourceName: trap.placedByName,
          targetId: p.participantId,
          targetName: p.displayName,
          cardType: 'banana_trap',
          message: `🍌 ${p.displayName} dẫm phải Vỏ chuối của ${trap.placedByName} bị trượt lùi 2 ô!`,
        });
        state.bananaTraps.splice(trapIndex, 1);
      }
    }

    // Kiểm tra ô đặc biệt tại điểm đến
    const landingTile = state.track[nextPos];
    if (landingTile) {
      if (landingTile.type === 'boost') {
        nextPos = Math.min(trackLength - 1, nextPos + landingTile.boostSteps);
        p.receivedNotifications.unshift({
          id: `notif_${now}`,
          message: `Vút bay! Ô Tăng tốc giúp xe bạn phóng thêm +${landingTile.boostSteps} ô!`,
          timestamp: now,
          isAlert: false,
        });
      } else if (landingTile.type === 'mud' && !p.hasShield) {
        p.mudTrapped = true;
        p.receivedNotifications.unshift({
          id: `notif_${now}`,
          message: 'Sa lầy! Xe bạn bị lún bùn. Vòng sau hãy trả lời đúng để vượt qua nhé!',
          timestamp: now,
          isAlert: true,
        });
      } else if (landingTile.type === 'mystery') {
        if (p.inventory.length < 2) {
          const bonusCard = drawRandomCard();
          p.inventory.push(bonusCard);
          p.receivedNotifications.unshift({
            id: `notif_${now}`,
            message: `Mở Rương may mắn! Bạn nhận được thẻ [${bonusCard.name}]!`,
            timestamp: now,
            isAlert: false,
          });
        }
      }
    }

    p.previousPosition = p.position;
    p.position = nextPos;
  }

  // Giảm thời gian tồn tại của các bẫy chuối
  state.bananaTraps = state.bananaTraps
    .map(t => ({ ...t, turnsLeft: t.turnsLeft - 1 }))
    .filter(t => t.turnsLeft > 0);
}
