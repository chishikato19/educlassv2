import type {
  PoolStandingEntry,
  VolleyballMatchup,
  VolleyballParticipantState,
  VolleyballPool,
} from './volleyball-schemas.js';
import { shuffleList } from './volleyball-scoring.js';

export function determinePoolCount(
  participantCount: number,
  poolMode: 'auto' | '4_pools' | '8_pools'
): number {
  if (poolMode === '4_pools') return 4;
  if (poolMode === '8_pools') return 8;
  return participantCount <= 23 ? 4 : 8;
}

export function distributeIntoPools(
  participants: Array<{ id: string; name: string }>,
  poolCount: number,
  rng: () => number = Math.random
): Record<string, VolleyballPool> {
  const pools: Record<string, VolleyballPool> = {};
  const poolIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, poolCount);

  for (const id of poolIds) {
    pools[id] = {
      id,
      name: `Bảng ${id}`,
      playerIds: [],
      standings: [],
    };
  }

  const shuffled = shuffleList(participants, rng);
  shuffled.forEach((p, idx) => {
    const targetPoolId = poolIds[idx % poolCount]!;
    pools[targetPoolId]!.playerIds.push(p.id);
  });

  return pools;
}

/**
 * Tạo lịch thi đấu 3 lượt vòng bảng cho một nhóm người chơi (3 - 5 người)
 */
function getRoundRobinPairs(players: string[], roundIndex: number): Array<[string, string]> {
  const n = players.length;
  if (n < 2) return [];

  if (n === 2) {
    // Chỉ có 2 người -> gặp nhau ở lượt 0, các lượt sau có thể rematch
    return [[players[0]!, players[1]!]];
  }

  if (n === 3) {
    const [p0, p1, p2] = players as [string, string, string];
    if (roundIndex === 0) return [[p0, p1]];
    if (roundIndex === 1) return [[p0, p2]];
    return [[p1, p2]];
  }

  if (n === 4) {
    const [p0, p1, p2, p3] = players as [string, string, string, string];
    if (roundIndex === 0) return [[p0, p1], [p2, p3]];
    if (roundIndex === 1) return [[p0, p2], [p1, p3]];
    return [[p0, p3], [p1, p2]];
  }

  if (n === 5) {
    const [p0, p1, p2, p3, p4] = players as [string, string, string, string, string];
    if (roundIndex === 0) return [[p0, p1], [p2, p3]];
    if (roundIndex === 1) return [[p0, p2], [p3, p4]];
    return [[p0, p4], [p1, p3]];
  }

  // Trường hợp n > 5 (nếu có): thuật toán Berger chuẩn
  const list = [...players];
  if (list.length % 2 !== 0) list.push('__BYE__');
  const count = list.length;
  const half = count / 2;
  const shift = roundIndex % (count - 1);
  const rotated = [list[0]!, ...list.slice(1 + shift), ...list.slice(1, 1 + shift)];

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < half; i++) {
    const a = rotated[i]!;
    const b = rotated[count - 1 - i]!;
    if (a !== '__BYE__' && b !== '__BYE__') {
      pairs.push([a, b]);
    }
  }
  return pairs;
}

/**
 * Sinh danh sách trận đấu cho 3 lượt vòng bảng
 */
export function generatePoolSchedule(
  pools: Record<string, VolleyballPool>
): VolleyballMatchup[][] {
  const rounds: VolleyballMatchup[][] = [[], [], []];

  for (let r = 0; r < 3; r++) {
    let currentTable = 1;
    for (const pool of Object.values(pools)) {
      const pairs = getRoundRobinPairs(pool.playerIds, r);
      for (const [p1, p2] of pairs) {
        rounds[r]!.push({
          tableNumber: currentTable++,
          stage: 'pool',
          poolId: pool.id,
          matchType: 'round_robin',
          player1Id: p1,
          player2Id: p2,
          player1Score: 0,
          player2Score: 0,
          player1Answered: false,
          player2Answered: false,
          player1Answers: {},
          player2Answers: {},
          player1Results: {},
          player2Results: {},
          player1TimeMs: 0,
          player2TimeMs: 0,
          result: 'in_progress',
        });
      }
    }
  }

  return rounds;
}

/**
 * Tính toán bảng xếp hạng nội bộ cho từng bảng đấu
 */
export function calculatePoolStandings(
  pool: VolleyballPool,
  completedMatchups: VolleyballMatchup[],
  allParticipants: Record<string, VolleyballParticipantState>
): PoolStandingEntry[] {
  const poolMatches = completedMatchups.filter(
    m => m.stage === 'pool' && m.poolId === pool.id && m.result !== 'in_progress'
  );

  const statsMap = new Map<string, PoolStandingEntry>();
  for (const pid of pool.playerIds) {
    const p = allParticipants[pid];
    statsMap.set(pid, {
      rankInPool: 1,
      participantId: pid,
      displayName: p?.displayName || 'Học sinh',
      tournamentPoints: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      correctCount: 0,
      totalTimeMs: 0,
    });
  }

  for (const m of poolMatches) {
    const s1 = statsMap.get(m.player1Id);
    const s2 = statsMap.get(m.player2Id);

    if (s1) {
      s1.correctCount += m.player1Score;
      s1.totalTimeMs += m.player1TimeMs;
      if (m.result === 'player1_win') {
        s1.tournamentPoints += 2;
        s1.matchesWon += 1;
      } else if (m.result === 'draw') {
        s1.tournamentPoints += 1;
        s1.matchesDrawn += 1;
      } else if (m.result === 'player2_win') {
        s1.matchesLost += 1;
      }
    }

    if (s2) {
      s2.correctCount += m.player2Score;
      s2.totalTimeMs += m.player2TimeMs;
      if (m.result === 'player2_win') {
        s2.tournamentPoints += 2;
        s2.matchesWon += 1;
      } else if (m.result === 'draw') {
        s2.tournamentPoints += 1;
        s2.matchesDrawn += 1;
      } else if (m.result === 'player1_win') {
        s2.matchesLost += 1;
      }
    }
  }

  const list = Array.from(statsMap.values());

  // Sắp xếp:
  // 1. tournamentPoints giảm dần
  // 2. correctCount giảm dần
  // 3. Đối đầu trực tiếp (head-to-head)
  // 4. totalTimeMs tăng dần (nhanh hơn xếp trên)
  list.sort((a, b) => {
    if (b.tournamentPoints !== a.tournamentPoints) {
      return b.tournamentPoints - a.tournamentPoints;
    }
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }

    // Kiểm tra đối đầu trực tiếp giữa a và b
    const headToHead = poolMatches.find(
      m =>
        (m.player1Id === a.participantId && m.player2Id === b.participantId) ||
        (m.player1Id === b.participantId && m.player2Id === a.participantId)
    );
    if (headToHead) {
      if (headToHead.player1Id === a.participantId && headToHead.result === 'player1_win') return -1;
      if (headToHead.player1Id === a.participantId && headToHead.result === 'player2_win') return 1;
      if (headToHead.player1Id === b.participantId && headToHead.result === 'player1_win') return 1;
      if (headToHead.player1Id === b.participantId && headToHead.result === 'player2_win') return -1;
    }

    return a.totalTimeMs - b.totalTimeMs;
  });

  list.forEach((entry, idx) => {
    entry.rankInPool = idx + 1;
  });

  return list;
}
