import type {
  SwissLeaderboardEntry,
  SwissMatchupResult,
  SwissParticipantState,
  SwissQuestion,
} from './swiss-schemas.js';

export function toOptionIndex(val: unknown): number {
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

/**
 * Xáo trộn mảng ngẫu nhiên (Fisher-Yates)
 */
export function shuffleList<T>(array: T[], rng: () => number = Math.random): T[] {
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
 * Xáo trộn các phương án trả lời của câu hỏi (mcq4) và cập nhật lại correctAnswer tương ứng
 */
export function shuffleQuestionOptions(
  question: SwissQuestion,
  rng: () => number = Math.random
): SwissQuestion {
  if (question.type !== 'mcq4' || !question.options || question.options.length <= 1) {
    return question;
  }

  const origIdx = toOptionIndex(question.correctAnswer);
  const origText = typeof question.correctAnswer === 'string'
    ? question.correctAnswer.trim().toLowerCase()
    : undefined;

  const paired = question.options.map((text, index) => {
    const isCorrect =
      origIdx >= 0
        ? index === origIdx
        : origText !== undefined && text.trim().toLowerCase() === origText;
    return { text, isCorrect };
  });

  // Fisher-Yates shuffle
  for (let i = paired.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = paired[i]!;
    paired[i] = paired[j]!;
    paired[j] = temp;
  }

  const shuffledOptions = paired.map(p => p.text);
  const newCorrectIdx = paired.findIndex(p => p.isCorrect);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : question.correctAnswer,
  };
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
 * Kiểm tra tính chính xác của câu trả lời học sinh
 */
export function checkSwissAnswerCorrectness(
  question: SwissQuestion,
  studentAnswer: unknown
): boolean {
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
    case 'short': {
      const cleanStudent = String(studentAnswer).trim().toLowerCase();
      if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer.some(
          ans => String(ans).trim().toLowerCase() === cleanStudent
        );
      }
      return String(question.correctAnswer).trim().toLowerCase() === cleanStudent;
    }
    default:
      return false;
  }
}

/**
 * Xác định kết quả trận đấu 2 câu giữa Player 1 và Player 2:
 * Bằng nhau là Hòa tuyệt đối.
 */
export function evaluateMatchupResult(
  player1Correct: number,
  player2Correct: number
): SwissMatchupResult {
  if (player1Correct > player2Correct) {
    return 'player1_win';
  }
  if (player2Correct > player1Correct) {
    return 'player2_win';
  }
  return 'draw';
}

/**
 * Tính toán hệ số Buchholz cho từng học sinh:
 * Buchholz = tổng điểm giải đấu (tournamentPoints) của các đối thủ từng gặp.
 */
export function calculateBuchholz(
  participant: SwissParticipantState,
  allParticipants: Record<string, SwissParticipantState>
): number {
  let total = 0;
  for (const oppId of participant.history) {
    const opp = allParticipants[oppId];
    if (opp) {
      total += opp.tournamentPoints;
    }
  }
  return total;
}

/**
 * Tính toán và sắp xếp Bảng Xếp Hạng Thụy Sỹ
 */
export function calculateSwissLeaderboard(
  participants: Record<string, SwissParticipantState>
): SwissLeaderboardEntry[] {
  const list = Object.values(participants);

  const entries: SwissLeaderboardEntry[] = list.map(p => {
    const buchholz = calculateBuchholz(p, participants);
    return {
      rank: 0,
      participantId: p.participantId,
      displayName: p.displayName,
      tournamentPoints: p.tournamentPoints,
      correctCount: p.correctCount,
      buchholz,
      streak: p.streak,
      matchesWon: p.matchesWon,
      matchesDrawn: p.matchesDrawn,
      matchesLost: p.matchesLost,
      isBye: p.isByeThisRound,
    };
  });

  // Tiêu chí sắp xếp chuẩn Thụy Sỹ:
  // 1. Điểm giải đấu (Thắng 2, Hòa 1, Thua 0)
  // 2. Hệ số phụ Buchholz (chất lượng các đối thủ đã gặp)
  // 3. Tổng số câu đúng
  // 4. Chuỗi streak
  // 5. Tên hiển thị
  entries.sort((a, b) => {
    if (b.tournamentPoints !== a.tournamentPoints) {
      return b.tournamentPoints - a.tournamentPoints;
    }
    if (b.buchholz !== a.buchholz) {
      return b.buchholz - a.buchholz;
    }
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    if (b.streak !== a.streak) {
      return b.streak - a.streak;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}
