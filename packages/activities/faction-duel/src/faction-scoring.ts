import type {
  FactionQuestion,
  FactionMatchup,
  FactionMember,
  FactionDuelResult,
} from './faction-schemas.js';
import { shuffleArray } from './faction-draft.js';

/**
 * Kiểm tra tính đúng/sai của câu trả lời học sinh
 */
export function checkAnswerCorrectness(question: FactionQuestion, answer: unknown): boolean {
  if (answer === undefined || answer === null) return false;

  if (question.type === 'mcq4') {
    if (question.options && question.options.length > 0) {
      const correctOpt = question.options.find(o => o.isCorrect === true);
      if (correctOpt) {
        return String(answer) === correctOpt.id || String(answer) === correctOpt.text;
      }
    }
    if (question.correctAnswer !== undefined) {
      return String(answer) === String(question.correctAnswer);
    }
    return false;
  }

  if (question.type === 'tf') {
    const boolAnswer =
      typeof answer === 'boolean'
        ? answer
        : String(answer).toLowerCase() === 'true' || String(answer) === '1';
    const boolCorrect =
      typeof question.correctAnswer === 'boolean'
        ? question.correctAnswer
        : String(question.correctAnswer).toLowerCase() === 'true';
    return boolAnswer === boolCorrect;
  }

  if (question.type === 'short') {
    const strAnswer = String(answer).trim().toLowerCase();
    const strCorrect = String(question.correctAnswer ?? '').trim().toLowerCase();
    return strAnswer.length > 0 && strAnswer === strCorrect;
  }

  return false;
}

/**
 * Đảo thứ tự các phương án lựa chọn (A, B, C, D) độc lập
 */
export function shuffleQuestionOptions(
  q: FactionQuestion,
  rng: () => number = Math.random
): FactionQuestion {
  if (q.type !== 'mcq4' || !q.options || q.options.length <= 1) {
    return q;
  }
  return {
    ...q,
    options: shuffleArray(q.options, rng),
  };
}

/**
 * Lấy danh sách câu hỏi cho lượt đấu:
 * - Hỗ trợ tùy chọn số câu mỗi trận (`countPerMatch`).
 * - Tự động xoay vòng lấy lại câu cũ khi hết kho đề (`allowRecycle`).
 * - Đảo ngẫu nhiên thứ tự câu hỏi và phương án A/B/C/D.
 */
export function getQuestionsForRound(
  pool: FactionQuestion[],
  roundIndex: number,
  countPerMatch: number,
  options?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    allowRecycle?: boolean;
    rng?: () => number;
  }
): FactionQuestion[] {
  if (pool.length === 0) return [];
  const rng = options?.rng ?? Math.random;
  const allowRecycle = options?.allowRecycle !== false;
  const shouldShuffleQ = options?.shuffleQuestions !== false;
  const shouldShuffleOpt = options?.shuffleOptions !== false;

  const selected: FactionQuestion[] = [];
  const totalInPool = pool.length;

  for (let i = 0; i < countPerMatch; i++) {
    const rawIndex = roundIndex * countPerMatch + i;
    const finalIndex = allowRecycle ? rawIndex % totalInPool : Math.min(rawIndex, totalInPool - 1);
    selected.push(pool[finalIndex]!);
  }

  const finalQuestions = shouldShuffleQ ? shuffleArray(selected, rng) : selected;

  return finalQuestions.map(q => (shouldShuffleOpt ? shuffleQuestionOptions(q, rng) : q));
}

/**
 * Tính điểm trận đấu có trọng số Elo:
 * - Kèo dưới thắng người hơn mình > 100 Elo: +3 điểm (Lật kèo!)
 * - Cân kèo (chênh lệch trong khoảng ±100 Elo): +2 điểm
 * - Kèo trên thắng người kém mình > 100 Elo: +1 điểm
 * - Hòa trận: +0.5 điểm mỗi bên
 */
export function calculateMatchPoints(
  winnerElo: number,
  loserElo: number,
  isDraw: boolean
): { winnerPoints: number; loserPoints: number; isUnderdog: boolean } {
  if (isDraw) {
    return { winnerPoints: 0.5, loserPoints: 0.5, isUnderdog: false };
  }

  const eloDiff = winnerElo - loserElo;
  if (eloDiff < -100) {
    // Kèo dưới lật kèo
    return { winnerPoints: 3.0, loserPoints: 0.0, isUnderdog: true };
  } else if (eloDiff <= 100) {
    // Cân kèo
    return { winnerPoints: 2.0, loserPoints: 0.0, isUnderdog: false };
  } else {
    // Kèo trên thắng
    return { winnerPoints: 1.0, loserPoints: 0.0, isUnderdog: false };
  }
}

/**
 * Đánh giá kết quả của 1 cặp đấu 1v1
 */
export function evaluateFactionMatchup(
  matchup: FactionMatchup,
  questions: FactionQuestion[],
  teamBlue: FactionMember[],
  teamRed: FactionMember[]
): FactionMatchup {
  const blueMember = teamBlue.find(m => m.participantId === matchup.blueParticipantId);
  const redMember = teamRed.find(m => m.participantId === matchup.redParticipantId);

  const blueElo = blueMember?.elo ?? 1000;
  const redElo = redMember?.elo ?? 1000;

  let blueCorrectCount = 0;
  let redCorrectCount = 0;
  let blueTotalTimeMs = 0;
  let redTotalTimeMs = 0;

  for (const q of questions) {
    const bAns = matchup.blueAnswers[q.id];
    const rAns = matchup.redAnswers[q.id];

    const isBlueCorrect = bAns ? checkAnswerCorrectness(q, bAns.answer) : false;
    const isRedCorrect = rAns ? checkAnswerCorrectness(q, rAns.answer) : false;

    if (bAns) bAns.isCorrect = isBlueCorrect;
    if (rAns) rAns.isCorrect = isRedCorrect;

    if (isBlueCorrect) {
      blueCorrectCount++;
      blueTotalTimeMs += bAns?.timeMs ?? 0;
    }
    if (isRedCorrect) {
      redCorrectCount++;
      redTotalTimeMs += rAns?.timeMs ?? 0;
    }
  }

  let winner: 'blue' | 'red' | 'draw';

  if (blueCorrectCount > redCorrectCount) {
    winner = 'blue';
  } else if (redCorrectCount > blueCorrectCount) {
    winner = 'red';
  } else {
    // Bằng số câu đúng: So sánh thời gian làm bài (nhanh hơn thắng)
    if (blueCorrectCount > 0) {
      if (blueTotalTimeMs < redTotalTimeMs) {
        winner = 'blue';
      } else if (redTotalTimeMs < blueTotalTimeMs) {
        winner = 'red';
      } else {
        winner = 'draw';
      }
    } else {
      // Cùng đúng 0 câu
      winner = 'draw';
    }
  }

  let awardedBlue = 0;
  let awardedRed = 0;
  let isUnderdogWin = false;

  if (winner === 'blue') {
    const pts = calculateMatchPoints(blueElo, redElo, false);
    awardedBlue = pts.winnerPoints;
    isUnderdogWin = pts.isUnderdog;
  } else if (winner === 'red') {
    const pts = calculateMatchPoints(redElo, blueElo, false);
    awardedRed = pts.winnerPoints;
    isUnderdogWin = pts.isUnderdog;
  } else {
    const pts = calculateMatchPoints(blueElo, redElo, true);
    awardedBlue = pts.winnerPoints;
    awardedRed = pts.loserPoints;
  }

  return {
    ...matchup,
    status: 'completed',
    winner,
    awardedPoints: { blue: awardedBlue, red: awardedRed },
    isUnderdogWin,
  };
}

/**
 * Tổng hợp điểm cộng thêm của mỗi phe từ các trận đã hoàn thành trong vòng
 */
export function aggregateTeamScores(
  matchups: FactionMatchup[]
): { addBlue: number; addRed: number } {
  let addBlue = 0;
  let addRed = 0;
  for (const m of matchups) {
    if (m.status === 'completed') {
      addBlue += m.awardedPoints.blue;
      addRed += m.awardedPoints.red;
    }
  }
  return { addBlue, addRed };
}

/**
 * Tính bảng xếp hạng kết quả cuối cùng cho toàn bộ học sinh
 */
export function calculateFinalLeaderboard(
  teamBlue: FactionMember[],
  teamRed: FactionMember[],
  allCompletedMatchups: FactionMatchup[],
  winningTeam: 'blue' | 'red' | 'draw'
): FactionDuelResult[] {
  const allMembers = [...teamBlue, ...teamRed];
  const statsMap = new Map<
    string,
    {
      matchesPlayed: number;
      matchesWon: number;
      matchesDrawn: number;
      matchesLost: number;
      pointsContributed: number;
      underdogWins: number;
    }
  >();

  for (const m of allMembers) {
    statsMap.set(m.participantId, {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      pointsContributed: 0,
      underdogWins: 0,
    });
  }

  for (const matchup of allCompletedMatchups) {
    const blueStat = statsMap.get(matchup.blueParticipantId);
    const redStat = statsMap.get(matchup.redParticipantId);

    if (blueStat) {
      blueStat.matchesPlayed++;
      blueStat.pointsContributed += matchup.awardedPoints.blue;
      if (matchup.winner === 'blue') {
        blueStat.matchesWon++;
        if (matchup.isUnderdogWin) blueStat.underdogWins++;
      } else if (matchup.winner === 'red') {
        blueStat.matchesLost++;
      } else {
        blueStat.matchesDrawn++;
      }
    }

    if (redStat) {
      redStat.matchesPlayed++;
      redStat.pointsContributed += matchup.awardedPoints.red;
      if (matchup.winner === 'red') {
        redStat.matchesWon++;
        if (matchup.isUnderdogWin) redStat.underdogWins++;
      } else if (matchup.winner === 'blue') {
        redStat.matchesLost++;
      } else {
        redStat.matchesDrawn++;
      }
    }
  }

  const results: FactionDuelResult[] = allMembers.map(member => {
    const stat = statsMap.get(member.participantId)!;
    const isTeamWon = member.team === winningTeam;

    return {
      participantId: member.participantId,
      displayName: member.displayName,
      team: member.team,
      teamWon: isTeamWon,
      matchesPlayed: stat.matchesPlayed,
      matchesWon: stat.matchesWon,
      matchesDrawn: stat.matchesDrawn,
      matchesLost: stat.matchesLost,
      pointsContributed: Number(stat.pointsContributed.toFixed(1)),
      underdogWins: stat.underdogWins,
      rank: 1, // Sẽ tính sau khi sort
    };
  });

  // Sắp xếp: Ưu tiên điểm đóng góp -> Số trận thắng -> Số trận lật kèo
  results.sort((a, b) => {
    if (b.pointsContributed !== a.pointsContributed) {
      return b.pointsContributed - a.pointsContributed;
    }
    if (b.matchesWon !== a.matchesWon) {
      return b.matchesWon - a.matchesWon;
    }
    return b.underdogWins - a.underdogWins;
  });

  // Đánh dấu MVP cho người có điểm đóng góp cao nhất
  if (results.length > 0 && results[0]!.pointsContributed > 0) {
    results[0]!.isMvp = true;
  }

  // Gán thứ hạng
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
}
