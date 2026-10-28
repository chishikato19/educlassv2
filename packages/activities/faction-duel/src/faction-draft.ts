import { balanceTwoTeamsByElo, DEFAULT_ELO, type CandidateForBalancing } from '@educlass/core';
import type {
  FactionMember,
  FactionMatchup,
  FactionPickPhase,
  FactionDuelState,
} from './faction-schemas.js';

export interface ParticipantCandidate extends CandidateForBalancing {
  participantId: string;
}

/**
 * Xáo trộn mảng ngẫu nhiên (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Khởi tạo phân chia 2 phe Xanh - Đỏ cân bằng Elo
 */
export function initTeamsFromParticipants(
  participants: Array<{ id: string; displayName: string; elo?: number }>,
  options?: { rng?: () => number }
): { teamBlue: FactionMember[]; teamRed: FactionMember[] } {
  const rng = options?.rng ?? Math.random;
  const candidates: ParticipantCandidate[] = participants.map(p => ({
    id: p.id,
    participantId: p.id,
    displayName: p.displayName,
    elo: p.elo ?? DEFAULT_ELO,
  }));

  const balanced = balanceTwoTeamsByElo(candidates, {
    balanceMethod: 'elo',
    jitter: true,
    rng,
  });

  const teamBlue: FactionMember[] = balanced.blue.map(b => ({
    participantId: b.participantId,
    displayName: b.displayName,
    elo: b.elo ?? DEFAULT_ELO,
    team: 'blue',
  }));

  const teamRed: FactionMember[] = balanced.red.map(r => ({
    participantId: r.participantId,
    displayName: r.displayName,
    elo: r.elo ?? DEFAULT_ELO,
    team: 'red',
  }));

  return { teamBlue, teamRed };
}

/**
 * Chọn ngẫu nhiên một thành viên bên phe ít người hơn làm Clone Song Hành
 */
export function selectRandomClone(
  smallerTeam: FactionMember[],
  previousCloneIds: string[],
  rng: () => number = Math.random
): FactionMember | undefined {
  if (smallerTeam.length === 0) return undefined;

  // Ưu tiên chọn những bạn chưa từng làm clone ở các vòng trước
  const freshCandidates = smallerTeam.filter(m => !previousCloneIds.includes(m.participantId));
  const pool = freshCandidates.length > 0 ? freshCandidates : smallerTeam;
  const chosenIndex = Math.floor(rng() * pool.length);
  return pool[chosenIndex];
}

/**
 * Tạo danh sách cặp đấu ngẫu nhiên 1-1 cho Lượt 1
 */
export function generateRound1Pairings(
  teamBlue: FactionMember[],
  teamRed: FactionMember[],
  roundIndex: number,
  rng: () => number = Math.random
): {
  matchups: FactionMatchup[];
  cloneId?: string | undefined;
  historyEntries: Array<{ round: number; p1: string; p2: string }>;
} {
  const blueShuffled = shuffleArray(teamBlue, rng);
  const redShuffled = shuffleArray(teamRed, rng);

  const matchups: FactionMatchup[] = [];
  const historyEntries: Array<{ round: number; p1: string; p2: string }> = [];

  let cloneId: string | undefined = undefined;

  if (blueShuffled.length === redShuffled.length) {
    // Sĩ số bằng nhau
    for (let i = 0; i < blueShuffled.length; i++) {
      const b = blueShuffled[i]!;
      const r = redShuffled[i]!;
      matchups.push({
        id: `match_r${roundIndex}_${i + 1}`,
        roundIndex,
        blueParticipantId: b.participantId,
        redParticipantId: r.participantId,
        blueAnswers: {},
        redAnswers: {},
        status: 'in_progress',
        awardedPoints: { blue: 0, red: 0 },
      });
      historyEntries.push({ round: roundIndex, p1: b.participantId, p2: r.participantId });
    }
  } else if (blueShuffled.length < redShuffled.length) {
    // Phe Xanh ít hơn Phe Đỏ -> Clone 1 bạn phe Xanh
    const clone = selectRandomClone(blueShuffled, [], rng);
    cloneId = clone?.participantId;

    // Ghép 1-1 cho các bạn đầu
    for (let i = 0; i < blueShuffled.length; i++) {
      const b = blueShuffled[i]!;
      const r = redShuffled[i]!;
      matchups.push({
        id: `match_r${roundIndex}_${i + 1}`,
        roundIndex,
        blueParticipantId: b.participantId,
        redParticipantId: r.participantId,
        blueAnswers: {},
        redAnswers: {},
        status: 'in_progress',
        awardedPoints: { blue: 0, red: 0 },
      });
      historyEntries.push({ round: roundIndex, p1: b.participantId, p2: r.participantId });
    }

    // Bạn Đỏ còn dư ghép với Clone Xanh
    if (clone) {
      for (let i = blueShuffled.length; i < redShuffled.length; i++) {
        const r = redShuffled[i]!;
        matchups.push({
          id: `match_r${roundIndex}_${i + 1}_clone`,
          roundIndex,
          blueParticipantId: clone.participantId,
          redParticipantId: r.participantId,
          isCloneMatch: true,
          blueAnswers: {},
          redAnswers: {},
          status: 'in_progress',
          awardedPoints: { blue: 0, red: 0 },
        });
        historyEntries.push({ round: roundIndex, p1: clone.participantId, p2: r.participantId });
      }
    }
  } else {
    // Phe Đỏ ít hơn Phe Xanh -> Clone 1 bạn phe Đỏ
    const clone = selectRandomClone(redShuffled, [], rng);
    cloneId = clone?.participantId;

    for (let i = 0; i < redShuffled.length; i++) {
      const b = blueShuffled[i]!;
      const r = redShuffled[i]!;
      matchups.push({
        id: `match_r${roundIndex}_${i + 1}`,
        roundIndex,
        blueParticipantId: b.participantId,
        redParticipantId: r.participantId,
        blueAnswers: {},
        redAnswers: {},
        status: 'in_progress',
        awardedPoints: { blue: 0, red: 0 },
      });
      historyEntries.push({ round: roundIndex, p1: b.participantId, p2: r.participantId });
    }

    if (clone) {
      for (let i = redShuffled.length; i < blueShuffled.length; i++) {
        const b = blueShuffled[i]!;
        matchups.push({
          id: `match_r${roundIndex}_${i + 1}_clone`,
          roundIndex,
          blueParticipantId: b.participantId,
          redParticipantId: clone.participantId,
          isCloneMatch: true,
          blueAnswers: {},
          redAnswers: {},
          status: 'in_progress',
          awardedPoints: { blue: 0, red: 0 },
        });
        historyEntries.push({ round: roundIndex, p1: b.participantId, p2: clone.participantId });
      }
    }
  }

  return { matchups, cloneId, historyEntries };
}

/**
 * Khởi động Pha Chọn Đấu Thủ 15 Giây
 */
export function startPickPhase(
  scoreBlue: number,
  scoreRed: number,
  pickPhaseSeconds: number,
  nowMs: number,
  rng: () => number = Math.random
): FactionPickPhase {
  let attackingTeam: 'blue' | 'red';
  if (scoreBlue > scoreRed) {
    attackingTeam = 'blue';
  } else if (scoreRed > scoreBlue) {
    attackingTeam = 'red';
  } else {
    // Hòa điểm: Bốc thăm ngẫu nhiên 50/50 phe ưu tiên chọn
    attackingTeam = rng() < 0.5 ? 'blue' : 'red';
  }

  return {
    attackingTeam,
    expiresAt: nowMs + pickPhaseSeconds * 1000,
    claimedTargetIds: [],
    pairs: [],
  };
}

/**
 * Xử lý khi học sinh phe thắng bấm chọn đối thủ (Khóa mục tiêu FCFS & kiểm tra luật không lặp)
 */
export function handleSelectOpponent(
  state: FactionDuelState,
  attackerId: string,
  targetId: string
): { success: boolean; reason?: string; nextState?: FactionDuelState } {
  if (state.status !== 'pick_phase' || !state.pickPhase) {
    return { success: false, reason: 'Chưa tới lượt chọn đối thủ' };
  }

  const { attackingTeam, claimedTargetIds, pairs } = state.pickPhase;

  // Xác thực attacker thuộc phe thắng
  const attackerTeamMembers = attackingTeam === 'blue' ? state.teamBlue : state.teamRed;
  const isAttackerValid = attackerTeamMembers.some(m => m.participantId === attackerId);
  if (!isAttackerValid) {
    return { success: false, reason: 'Bạn không thuộc phe được chọn đối thủ' };
  }

  // Xác thực attacker chưa từng chọn ai trong pha này
  const alreadyPicked = pairs.some(p => p.attackerId === attackerId);
  if (alreadyPicked) {
    return { success: false, reason: 'Bạn đã chọn đối thủ rồi' };
  }

  // Xác thực target thuộc phe bị thách đấu
  const targetTeamMembers = attackingTeam === 'blue' ? state.teamRed : state.teamBlue;
  const targetMember = targetTeamMembers.find(m => m.participantId === targetId);
  if (!targetMember) {
    return { success: false, reason: 'Đối thủ không hợp lệ' };
  }

  // Xác thực target chưa bị ai khóa
  if (claimedTargetIds.includes(targetId)) {
    return { success: false, reason: 'Đối thủ này vừa bị bạn khác chọn' };
  }

  // Kiểm tra luật không lặp lại đối thủ đã từng đấu
  const hasFoughtBefore = state.matchHistory.some(
    h => (h.p1 === attackerId && h.p2 === targetId) || (h.p1 === targetId && h.p2 === attackerId)
  );

  if (hasFoughtBefore) {
    // Chỉ cho phép nếu tất cả các đối thủ còn lại chưa bị chọn đều đã từng đấu với attacker
    const unclaimedOpponents = targetTeamMembers.filter(
      m => !claimedTargetIds.includes(m.participantId)
    );
    const hasUnfoughtOpponent = unclaimedOpponents.some(
      opp =>
        !state.matchHistory.some(
          h =>
            (h.p1 === attackerId && h.p2 === opp.participantId) ||
            (h.p1 === opp.participantId && h.p2 === attackerId)
        )
    );

    if (hasUnfoughtOpponent) {
      return {
        success: false,
        reason: 'Bạn đã từng đấu với bạn này rồi. Hãy chọn đối thủ mới!',
      };
    }
  }

  // Cập nhật cặp đấu đã chọn
  const updatedPickPhase: FactionPickPhase = {
    ...state.pickPhase,
    claimedTargetIds: [...claimedTargetIds, targetId],
    pairs: [...pairs, { attackerId, targetId }],
  };

  return {
    success: true,
    nextState: {
      ...state,
      pickPhase: updatedPickPhase,
    },
  };
}

/**
 * Xử lý khi hết 15 giây hoặc kết thúc Pick Phase: Ghép ngẫu nhiên các bạn còn lại
 */
export function resolvePickPhaseTimeout(
  state: FactionDuelState,
  roundIndex: number,
  rng: () => number = Math.random
): {
  matchups: FactionMatchup[];
  cloneId?: string | undefined;
  historyEntries: Array<{ round: number; p1: string; p2: string }>;
} {
  const pickPhase = state.pickPhase;
  const attackingTeam = pickPhase?.attackingTeam ?? 'blue';
  const existingPairs = pickPhase?.pairs ?? [];

  const attackers = attackingTeam === 'blue' ? state.teamBlue : state.teamRed;
  const defenders = attackingTeam === 'blue' ? state.teamRed : state.teamBlue;

  // Lọc ra danh sách những người chưa được ghép
  const pairedAttackerIds = new Set(existingPairs.map(p => p.attackerId));
  const pairedDefenderIds = new Set(existingPairs.map(p => p.targetId));

  const remainingAttackers = shuffleArray(
    attackers.filter(a => !pairedAttackerIds.has(a.participantId)),
    rng
  );
  const remainingDefenders = shuffleArray(
    defenders.filter(d => !pairedDefenderIds.has(d.participantId)),
    rng
  );

  const finalPairs: Array<{ blueId: string; redId: string; isClone?: boolean }> = [];
  const historyEntries: Array<{ round: number; p1: string; p2: string }> = [];

  // 1. Thêm các cặp đã tự chọn thành công
  for (const pair of existingPairs) {
    const blueId = attackingTeam === 'blue' ? pair.attackerId : pair.targetId;
    const redId = attackingTeam === 'blue' ? pair.targetId : pair.attackerId;
    finalPairs.push({ blueId, redId });
    historyEntries.push({ round: roundIndex, p1: blueId, p2: redId });
  }

  // 2. Ghép 1-1 những bạn còn lại
  const minRemaining = Math.min(remainingAttackers.length, remainingDefenders.length);
  for (let i = 0; i < minRemaining; i++) {
    const att = remainingAttackers[i]!;
    const def = remainingDefenders[i]!;
    const blueId = attackingTeam === 'blue' ? att.participantId : def.participantId;
    const redId = attackingTeam === 'blue' ? def.participantId : att.participantId;
    finalPairs.push({ blueId, redId });
    historyEntries.push({ round: roundIndex, p1: blueId, p2: redId });
  }

  // 3. Xử lý trường hợp lẻ sĩ số nếu còn người dư
  let cloneId: string | undefined = undefined;
  if (state.teamBlue.length !== state.teamRed.length) {
    const isBlueSmaller = state.teamBlue.length < state.teamRed.length;
    const smallerTeam = isBlueSmaller ? state.teamBlue : state.teamRed;
    const largerTeam = isBlueSmaller ? state.teamRed : state.teamBlue;

    // Tìm xem ai bên đội lớn chưa được ghép
    const allAssignedBlue = new Set(finalPairs.map(p => p.blueId));
    const allAssignedRed = new Set(finalPairs.map(p => p.redId));

    const unassignedLarger = largerTeam.filter(
      m => !(isBlueSmaller ? allAssignedRed : allAssignedBlue).has(m.participantId)
    );

    if (unassignedLarger.length > 0) {
      // Chọn clone ngẫu nhiên bên đội nhỏ
      const clone = selectRandomClone(smallerTeam, [], rng);
      cloneId = clone?.participantId;

      if (clone) {
        for (const unassigned of unassignedLarger) {
          const blueId = isBlueSmaller ? clone.participantId : unassigned.participantId;
          const redId = isBlueSmaller ? unassigned.participantId : clone.participantId;
          finalPairs.push({ blueId, redId, isClone: true });
          historyEntries.push({ round: roundIndex, p1: blueId, p2: redId });
        }
      }
    }
  }

  // 4. Tạo FactionMatchup objects
  const matchups: FactionMatchup[] = finalPairs.map((p, idx) => ({
    id: `match_r${roundIndex}_${idx + 1}${p.isClone ? '_clone' : ''}`,
    roundIndex,
    blueParticipantId: p.blueId,
    redParticipantId: p.redId,
    isCloneMatch: p.isClone,
    blueAnswers: {},
    redAnswers: {},
    status: 'in_progress',
    awardedPoints: { blue: 0, red: 0 },
  }));

  return { matchups, cloneId, historyEntries };
}
