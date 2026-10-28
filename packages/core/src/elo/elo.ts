/**
 * Hệ thống Điểm Trình Độ Ẩn (Hidden Elo / MMR Rating System)
 * Phục vụ cân bằng đội hình (Matchmaking & Team Balancing) trong lớp học
 */

export const DEFAULT_ELO = 1000;
export const MIN_ELO = 100;
export const MAX_ELO = 3000;
export const K_FACTOR_STANDARD = 24; // Dành cho bài thi / Quiz cá nhân
export const K_FACTOR_TEAM = 32; // Dành cho thi đấu đồng đội (Đại Chiến Lãnh Thổ)

/**
 * Tính xác suất thắng / điểm kỳ vọng (Expected Score) theo công thức Elo chuẩn:
 * E_A = 1 / (1 + 10 ^ ((R_B - R_A) / 400))
 */
export function getExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Giới hạn điểm Elo trong biên độ hợp lệ [MIN_ELO, MAX_ELO]
 */
export function clampElo(elo: number): number {
  return Math.max(MIN_ELO, Math.min(MAX_ELO, Math.round(elo)));
}

/**
 * Tính biến động Elo cho trò chơi cá nhân (Quizizz, Kahoot, Quiz Live, Trắc nghiệm)
 *
 * @param currentElo Điểm Elo hiện tại của học sinh
 * @param scorePercentage Tỉ lệ điểm đạt được của học sinh (0.0 đến 1.0, ví dụ đúng 8/10 câu = 0.8)
 * @param classAveragePercentage Tỉ lệ điểm trung bình của cả lớp (0.0 đến 1.0, ví dụ 0.6)
 * @param options Tùy chọn hệ số K
 * @returns Điểm Elo mới sau khi cập nhật
 */
export function calculateIndividualGameElo(
  currentElo: number,
  scorePercentage: number,
  classAveragePercentage: number = 0.5,
  options?: { kFactor?: number }
): { newElo: number; delta: number } {
  const k = options?.kFactor ?? K_FACTOR_STANDARD;
  const safeCurrentElo = currentElo > 0 ? currentElo : DEFAULT_ELO;

  // Điểm kỳ vọng dựa trên tương quan Elo của học sinh so với mốc trung bình lớp (giả định 1000)
  const expectedPerformance = getExpectedScore(safeCurrentElo, DEFAULT_ELO);

  // Hiệu suất thực tế: Kết hợp giữa điểm số cá nhân và tương quan so với trung bình lớp
  // Nếu đề thi quá khó (cả lớp thấp), bạn làm 60% vẫn được đánh giá cao
  const relativePerformance = Math.max(
    0,
    Math.min(1, scorePercentage + (0.5 - classAveragePercentage) * 0.5)
  );

  // Delta Elo = K * (Actual - Expected)
  const delta = Math.round(k * (relativePerformance - expectedPerformance));
  const newElo = clampElo(safeCurrentElo + delta);

  return { newElo, delta: newElo - safeCurrentElo };
}

export interface TeamMemberEloInput {
  id: string;
  elo: number;
  contribution: number; // Điểm đóng góp trong trận (ô chiếm * 5 + gia cố * 2 + câu đúng)
}

/**
 * Tính biến động Elo cho trận đấu đồng đội 2 phe (Đại Chiến Lãnh Thổ)
 *
 * - Đội thắng được cộng điểm, đội thua bị trừ điểm dựa trên chênh lệch Elo trung bình.
 * - Thành viên có đóng góp cao (MVP) được tăng thưởng / giảm phạt.
 * - Thành viên không có đóng góp gì (0 điểm) bị giảm thưởng.
 */
export function calculateTeamMatchElo(
  teamBlue: TeamMemberEloInput[],
  teamRed: TeamMemberEloInput[],
  winner: 'blue' | 'red' | 'draw',
  options?: { kFactor?: number }
): Record<string, { newElo: number; delta: number }> {
  const k = options?.kFactor ?? K_FACTOR_TEAM;
  const result: Record<string, { newElo: number; delta: number }> = {};

  if (teamBlue.length === 0 && teamRed.length === 0) {
    return result;
  }

  // 1. Tính Elo trung bình của 2 đội
  const blueAvgElo =
    teamBlue.length > 0
      ? teamBlue.reduce((sum, m) => sum + (m.elo || DEFAULT_ELO), 0) / teamBlue.length
      : DEFAULT_ELO;

  const redAvgElo =
    teamRed.length > 0
      ? teamRed.reduce((sum, m) => sum + (m.elo || DEFAULT_ELO), 0) / teamRed.length
      : DEFAULT_ELO;

  // 2. Điểm kỳ vọng của mỗi đội
  const expectedBlue = getExpectedScore(blueAvgElo, redAvgElo);
  const expectedRed = 1 - expectedBlue;

  // 3. Kết quả thực tế (Actual score S)
  let actualBlue = 0.5;
  let actualRed = 0.5;
  if (winner === 'blue') {
    actualBlue = 1.0;
    actualRed = 0.0;
  } else if (winner === 'red') {
    actualBlue = 0.0;
    actualRed = 1.0;
  }

  // 4. Base delta của mỗi phe
  const baseDeltaBlue = k * (actualBlue - expectedBlue);
  const baseDeltaRed = k * (actualRed - expectedRed);

  // 5. Tính tổng đóng góp của mỗi phe
  const totalBlueContrib = teamBlue.reduce((sum, m) => sum + Math.max(0, m.contribution), 0);
  const totalRedContrib = teamRed.reduce((sum, m) => sum + Math.max(0, m.contribution), 0);

  // 6. Áp dụng điều chỉnh cá nhân hóa cho từng thành viên
  const applyTeamMembers = (
    members: TeamMemberEloInput[],
    baseDelta: number,
    totalContrib: number
  ) => {
    const memberCount = members.length;
    const avgContrib = memberCount > 0 ? totalContrib / memberCount : 0;

    for (const member of members) {
      const curElo = member.elo || DEFAULT_ELO;
      let personalModifier = 1.0;

      if (avgContrib > 0) {
        // Tỷ lệ đóng góp so với mức trung bình đội (dao động từ 0.5 đến 1.5)
        const ratio = member.contribution / avgContrib;
        personalModifier = Math.max(0.6, Math.min(1.4, ratio));
      } else if (member.contribution === 0) {
        personalModifier = 0.7; // Không đóng góp
      }

      // Delta cá nhân = baseDelta * personalModifier
      let memberDelta = Math.round(baseDelta * personalModifier);

      // Nếu hòa mà đóng góp cao vẫn có thể được +1 hoặc +2 nhẹ
      if (winner === 'draw' && member.contribution > avgContrib && avgContrib > 0) {
        memberDelta = Math.max(memberDelta, 2);
      }

      const newElo = clampElo(curElo + memberDelta);
      result[member.id] = {
        newElo,
        delta: newElo - curElo,
      };
    }
  };

  applyTeamMembers(teamBlue, baseDeltaBlue, totalBlueContrib);
  applyTeamMembers(teamRed, baseDeltaRed, totalRedContrib);

  return result;
}

export interface CandidateForBalancing {
  id: string;
  displayName: string;
  elo?: number | undefined;
  groupName?: string | null | undefined;
}

export interface BalancedTeamsResult<T> {
  blue: T[];
  red: T[];
  blueAvgElo: number;
  redAvgElo: number;
  deltaElo: number;
}

/**
 * Thuật toán chia đều học sinh vào 2 phe Xanh - Đỏ cân bằng nhất theo Elo ẩn
 *
 * Kết hợp:
 * 1. Sắp xếp theo Elo giảm dần (kèm jitter nhẹ để tạo biến số tự nhiên).
 * 2. Phân bổ kiểu Snake Draft (ABBA BAAB...)
 * 3. Tinh chỉnh Greedy Partitioning (Swap) để chênh lệch Elo 2 bên là nhỏ nhất.
 */
export function balanceTwoTeamsByElo<T extends CandidateForBalancing>(
  candidates: T[],
  options?: {
    balanceMethod?: 'elo' | 'random';
    jitter?: boolean;
    rng?: () => number;
  }
): BalancedTeamsResult<T> {
  if (candidates.length === 0) {
    return { blue: [], red: [], blueAvgElo: 0, redAvgElo: 0, deltaElo: 0 };
  }

  const rng = options?.rng ?? Math.random;
  const balanceMethod = options?.balanceMethod ?? 'elo';

  // Chế độ may rủi ngẫu nhiên hoàn toàn
  if (balanceMethod === 'random') {
    const shuffled = [...candidates].sort(() => rng() - 0.5);
    const blue: T[] = [];
    const red: T[] = [];
    shuffled.forEach((c, idx) => {
      if (idx % 2 === 0) {
        blue.push(c);
      } else {
        red.push(c);
      }
    });

    const blueTotal = blue.reduce((s, c) => s + (c.elo || DEFAULT_ELO), 0);
    const redTotal = red.reduce((s, c) => s + (c.elo || DEFAULT_ELO), 0);
    const blueAvg = blue.length > 0 ? Math.round(blueTotal / blue.length) : 0;
    const redAvg = red.length > 0 ? Math.round(redTotal / red.length) : 0;

    return {
      blue,
      red,
      blueAvgElo: blueAvg,
      redAvgElo: redAvg,
      deltaElo: Math.abs(blueAvg - redAvg),
    };
  }

  // Chế độ Cân bằng theo Elo:
  // Thêm jitter nhẹ (±15 điểm) nếu bật, để 2 bạn ngang trình độ không bị phân cố định
  const withScore = candidates.map(c => {
    const baseElo = c.elo && c.elo > 0 ? c.elo : DEFAULT_ELO;
    const jitterVal = options?.jitter ? (rng() - 0.5) * 30 : 0;
    return {
      item: c,
      sortScore: baseElo + jitterVal,
      effectiveElo: baseElo,
    };
  });

  // Sắp xếp giảm dần theo điểm trình độ
  withScore.sort((a, b) => b.sortScore - a.sortScore);

  const blueList: typeof withScore = [];
  const redList: typeof withScore = [];

  // Snake draft distribution (AB BA AB BA...)
  withScore.forEach((entry, idx) => {
    const cycle = Math.floor(idx / 2);
    if (cycle % 2 === 0) {
      if (idx % 2 === 0) blueList.push(entry);
      else redList.push(entry);
    } else {
      if (idx % 2 === 0) redList.push(entry);
      else blueList.push(entry);
    }
  });

  // Tinh chỉnh Greedy Swap: Tìm cặp hoán đổi giúp giảm độ lệch tổng Elo
  let blueSum = blueList.reduce((s, x) => s + x.effectiveElo, 0);
  let redSum = redList.reduce((s, x) => s + x.effectiveElo, 0);
  let minDiff = Math.abs(blueSum - redSum);

  let improved = true;
  let iterations = 0;
  while (improved && iterations < 15) {
    improved = false;
    iterations++;

    for (let i = 0; i < blueList.length; i++) {
      for (let j = 0; j < redList.length; j++) {
        const itemB = blueList[i]!;
        const itemR = redList[j]!;

        const newBlueSum = blueSum - itemB.effectiveElo + itemR.effectiveElo;
        const newRedSum = redSum - itemR.effectiveElo + itemB.effectiveElo;
        const newDiff = Math.abs(newBlueSum - newRedSum);

        if (newDiff < minDiff) {
          blueList[i] = itemR;
          redList[j] = itemB;
          blueSum = newBlueSum;
          redSum = newRedSum;
          minDiff = newDiff;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const blue = blueList.map(x => x.item);
  const red = redList.map(x => x.item);
  const blueAvgElo = blue.length > 0 ? Math.round(blueSum / blue.length) : 0;
  const redAvgElo = red.length > 0 ? Math.round(redSum / red.length) : 0;

  return {
    blue,
    red,
    blueAvgElo,
    redAvgElo,
    deltaElo: Math.abs(blueAvgElo - redAvgElo),
  };
}

/**
 * Thuật toán chia đều học sinh vào N nhóm theo Elo (Snake draft)
 */
export function balanceNTeamsByElo<T extends CandidateForBalancing>(
  candidates: T[],
  groupCount: number,
  options?: { jitter?: boolean; rng?: () => number }
): Array<{ groupIndex: number; members: T[]; avgElo: number; totalElo: number }> {
  if (groupCount <= 0) return [];
  const count = Math.min(groupCount, Math.max(1, candidates.length));
  const groups: Array<{ groupIndex: number; members: T[]; avgElo: number; totalElo: number }> =
    Array.from({ length: count }, (_, idx) => ({
      groupIndex: idx,
      members: [],
      avgElo: 0,
      totalElo: 0,
    }));

  if (candidates.length === 0) return groups;

  const rng = options?.rng ?? Math.random;
  const sorted = [...candidates].map(c => {
    const baseElo = c.elo && c.elo > 0 ? c.elo : DEFAULT_ELO;
    const jitterVal = options?.jitter ? (rng() - 0.5) * 30 : 0;
    return {
      item: c,
      sortScore: baseElo + jitterVal,
      effectiveElo: baseElo,
    };
  });

  sorted.sort((a, b) => b.sortScore - a.sortScore);

  // Snake draft qua N nhóm
  sorted.forEach((entry, idx) => {
    const round = Math.floor(idx / count);
    const posInRound = idx % count;
    const targetGroup = round % 2 === 0 ? posInRound : count - 1 - posInRound;
    groups[targetGroup]!.members.push(entry.item);
  });

  for (const g of groups) {
    const total = g.members.reduce((s, m) => s + (m.elo || DEFAULT_ELO), 0);
    g.totalElo = total;
    g.avgElo = g.members.length > 0 ? Math.round(total / g.members.length) : 0;
  }

  return groups;
}
