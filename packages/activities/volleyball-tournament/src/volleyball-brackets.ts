import type {
  FinalStandingEntry,
  VolleyballMatchup,
  VolleyballParticipantState,
  VolleyballPlacementBracket,
  VolleyballPool,
} from './volleyball-schemas.js';

export function generatePlacementBrackets(
  pools: Record<string, VolleyballPool>
): Record<string, VolleyballPlacementBracket> {
  const brackets: Record<string, VolleyballPlacementBracket> = {
    diamond: {
      tier: 'diamond',
      name: 'Cúp Kim Cương (Tranh Vô Địch)',
      playerIds: [],
      semiFinalMatchups: [],
      finalMatchups: [],
    },
    gold: {
      tier: 'gold',
      name: 'Cúp Vàng',
      playerIds: [],
      semiFinalMatchups: [],
      finalMatchups: [],
    },
    silver: {
      tier: 'silver',
      name: 'Cúp Bạc',
      playerIds: [],
      semiFinalMatchups: [],
      finalMatchups: [],
    },
    bronze: {
      tier: 'bronze',
      name: 'Cúp Đồng',
      playerIds: [],
      semiFinalMatchups: [],
      finalMatchups: [],
    },
  };

  const poolList = Object.values(pools).sort((a, b) => a.id.localeCompare(b.id));

  // Thu thập học sinh theo vị trí thứ hạng vòng bảng
  for (const pool of poolList) {
    const s = pool.standings;
    const rank1 = s.find(entry => entry.rankInPool === 1);
    const rank2 = s.find(entry => entry.rankInPool === 2);
    const rank3 = s.find(entry => entry.rankInPool === 3);
    const rank4Plus = s.filter(entry => entry.rankInPool >= 4);

    if (rank1) brackets.diamond!.playerIds.push(rank1.participantId);
    if (rank2) brackets.gold!.playerIds.push(rank2.participantId);
    if (rank3) brackets.silver!.playerIds.push(rank3.participantId);
    for (const r of rank4Plus) {
      brackets.bronze!.playerIds.push(r.participantId);
    }
  }

  // Khởi tạo các cặp đấu Bán kết cho từng Cúp
  let currentTable = 1;
  for (const tierKey of ['diamond', 'gold', 'silver', 'bronze'] as const) {
    const b = brackets[tierKey]!;
    const p = b.playerIds;
    const matchups: VolleyballMatchup[] = [];

    if (p.length === 2) {
      // Chỉ có 2 bạn -> Đấu trận Chung kết luôn
      matchups.push({
        tableNumber: currentTable++,
        stage: 'bracket',
        tier: tierKey,
        matchType: 'final',
        player1Id: p[0]!,
        player2Id: p[1]!,
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
    } else if (p.length === 4) {
      // 4 bạn (từ 4 bảng A, B, C, D) -> 2 trận Bán kết
      // BK 1: p0 vs p3 (Nhất A vs Nhất D)
      // BK 2: p1 vs p2 (Nhất B vs Nhất C)
      matchups.push({
        tableNumber: currentTable++,
        stage: 'bracket',
        tier: tierKey,
        matchType: 'semi_final',
        player1Id: p[0]!,
        player2Id: p[3]!,
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
      matchups.push({
        tableNumber: currentTable++,
        stage: 'bracket',
        tier: tierKey,
        matchType: 'semi_final',
        player1Id: p[1]!,
        player2Id: p[2]!,
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
    } else if (p.length >= 6) {
      // 8 bạn (từ 8 bảng A..H) -> 4 cặp Tứ kết / Bán kết
      const half = Math.floor(p.length / 2);
      for (let i = 0; i < half; i++) {
        matchups.push({
          tableNumber: currentTable++,
          stage: 'bracket',
          tier: tierKey,
          matchType: 'semi_final',
          player1Id: p[i]!,
          player2Id: p[p.length - 1 - i]!,
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

    b.semiFinalMatchups = matchups;
  }

  return brackets;
}

/**
 * Sinh danh sách trận đấu Chung kết & Tranh hạng ba từ kết quả Bán kết
 */
export function advanceBracketFinals(
  brackets: Record<string, VolleyballPlacementBracket>,
  completedSemiFinals: VolleyballMatchup[]
): VolleyballMatchup[] {
  const finals: VolleyballMatchup[] = [];
  let currentTable = 1;

  for (const tierKey of ['diamond', 'gold', 'silver', 'bronze'] as const) {
    const b = brackets[tierKey]!;
    const semiMatches = completedSemiFinals.filter(
      m => m.tier === tierKey && m.matchType === 'semi_final'
    );

    if (semiMatches.length === 2) {
      const m1 = semiMatches[0]!;
      const m2 = semiMatches[1]!;

      // Xác định người thắng & người thua BK1
      const winner1 = m1.result === 'player1_win' ? m1.player1Id : m1.player2Id;
      const loser1 = m1.result === 'player1_win' ? m1.player2Id : m1.player1Id;

      // Xác định người thắng & người thua BK2
      const winner2 = m2.result === 'player1_win' ? m2.player1Id : m2.player2Id;
      const loser2 = m2.result === 'player1_win' ? m2.player2Id : m2.player1Id;

      // Trận CHUNG KẾT CÚP (Tranh Vô địch Cúp)
      const champMatch: VolleyballMatchup = {
        tableNumber: currentTable++,
        stage: 'bracket',
        tier: tierKey,
        matchType: 'final',
        player1Id: winner1,
        player2Id: winner2,
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
      };

      // Trận TRANH HẠNG BA CÚP
      const thirdMatch: VolleyballMatchup = {
        tableNumber: currentTable++,
        stage: 'bracket',
        tier: tierKey,
        matchType: 'third_place',
        player1Id: loser1,
        player2Id: loser2,
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
      };

      b.finalMatchups = [champMatch, thirdMatch];
      finals.push(champMatch, thirdMatch);
    } else if (b.semiFinalMatchups.length === 1 && b.semiFinalMatchups[0]?.matchType === 'final') {
      // Đã đấu trận chung kết ở lượt trước
      b.finalMatchups = b.semiFinalMatchups;
    }
  }

  return finals;
}

/**
 * Tính toán thứ hạng chung cuộc từ kết quả các trận Chung kết và Vòng bảng
 */
export function calculateFinalStandings(
  brackets: Record<string, VolleyballPlacementBracket>,
  completedFinals: VolleyballMatchup[],
  allParticipants: Record<string, VolleyballParticipantState>
): FinalStandingEntry[] {
  const finalLeaderboard: FinalStandingEntry[] = [];
  let currentRank = 1;

  for (const tierKey of ['diamond', 'gold', 'silver', 'bronze'] as const) {
    const tierMatches = completedFinals.filter(m => m.tier === tierKey);
    const champMatch = tierMatches.find(m => m.matchType === 'final');
    const thirdMatch = tierMatches.find(m => m.matchType === 'third_place');

    const tierRanked: string[] = [];

    if (champMatch && champMatch.result !== 'in_progress') {
      const win = champMatch.result === 'player1_win' ? champMatch.player1Id : champMatch.player2Id;
      const lose = champMatch.result === 'player1_win' ? champMatch.player2Id : champMatch.player1Id;
      tierRanked.push(win, lose);
    }

    if (thirdMatch && thirdMatch.result !== 'in_progress') {
      const win = thirdMatch.result === 'player1_win' ? thirdMatch.player1Id : thirdMatch.player2Id;
      const lose = thirdMatch.result === 'player1_win' ? thirdMatch.player2Id : thirdMatch.player1Id;
      tierRanked.push(win, lose);
    }

    // Với bất kỳ người chơi nào trong tier chưa có thứ hạng (ví dụ hòa hoặc chưa đấu xong)
    const b = brackets[tierKey];
    if (b) {
      for (const pid of b.playerIds) {
        if (!tierRanked.includes(pid)) {
          tierRanked.push(pid);
        }
      }
    }

    for (const pid of tierRanked) {
      const p = allParticipants[pid];
      if (p) {
        p.finalRank = currentRank;
        p.tier = tierKey;
      }
      finalLeaderboard.push({
        rank: currentRank++,
        participantId: pid,
        displayName: p?.displayName || 'Học sinh',
        tier: tierKey,
        tournamentPoints: p?.tournamentPoints || 0,
        correctCount: p?.correctCount || 0,
      });
    }
  }

  return finalLeaderboard;
}
