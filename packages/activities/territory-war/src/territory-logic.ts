import type {
  TerrainType,
  TerritoryCell,
  TerritoryParticipant,
  TerritoryQuestion,
  TerritoryWarConfig,
} from './territory-schemas.js';

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
 * Khởi tạo toàn bộ lưới ô vuông bản đồ chiến sự (5x5, 7x7, 9x9)
 */
export function generateMapCells(mapSize: '5x5' | '7x7' | '9x9'): Record<string, TerritoryCell> {
  const size = mapSize === '5x5' ? 5 : mapSize === '7x7' ? 7 : 9;
  const mid = Math.floor(size / 2);
  const cells: Record<string, TerritoryCell> = {};

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const id = `${x}_${y}`;
      let terrain: TerrainType = 'plain';
      let maxHp = 1;
      let maxReinforce = 1;

      // 1. Lâu đài lớn tại chính tâm bản đồ
      if (x === mid && y === mid) {
        terrain = 'big_castle';
        maxHp = 5;
        maxReinforce = 4;
      }
      // 2. Hai tháp canh ở trên và dưới lâu đài lớn (cùng cột mid)
      else if (x === mid && (y === 0 || y === size - 1)) {
        terrain = 'watchtower';
        maxHp = 2;
        maxReinforce = 2;
      }
      // 3. Hai lâu đài nhỏ ở hai bên trái & phải của lâu đài lớn (cùng hàng mid)
      else if (
        y === mid &&
        ((size === 5 && (x === mid - 1 || x === mid + 1)) ||
          (size === 7 && (x === mid - 1 || x === mid + 1)) ||
          (size === 9 && (x === mid - 2 || x === mid + 2)))
      ) {
        terrain = 'small_castle';
        maxHp = 3;
        maxReinforce = 3;
      }

      // Xác định căn cứ xuất phát 2 phe
      let owner: 'neutral' | 'blue' | 'red' = 'neutral';
      if (x === 0) {
        // Cạnh trái: Căn cứ Xanh
        owner = 'blue';
        terrain = 'plain';
        maxHp = 1;
        maxReinforce = 1;
      } else if (x === size - 1) {
        // Cạnh phải: Căn cứ Đỏ
        owner = 'red';
        terrain = 'plain';
        maxHp = 1;
        maxReinforce = 1;
      }

      cells[id] = {
        id,
        x,
        y,
        terrain,
        owner,
        maxHp,
        currentHp: maxHp,
        tugOfWarHp: 0,
        reinforceLevel: 0,
        maxReinforce,
        lockedBy: null,
      };
    }
  }

  return cells;
}

/**
 * Kiểm tra 2 ô có liền kề nhau theo 4 hướng (Đông - Tây - Nam - Bắc) hay không
 */
export function isOrthogonalAdjacent(
  a: { x: number; y: number },
  b: { x: number; y: number }
): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * Kiểm tra phe (blue / red) có quyền tương tác với ô mục tiêu hay không:
 * - Nếu ô của phe mình: được phép nếu chưa đạt max cấp gia cố.
 * - Nếu ô trung lập hoặc ô của địch: phải liền kề với ít nhất 1 ô phe mình đang chiếm.
 */
export function canTeamTargetCell(
  cells: Record<string, TerritoryCell>,
  team: 'blue' | 'red',
  targetCellId: string
): { allowed: boolean; reason?: string; actionType?: 'reinforce' | 'attack' } {
  const target = cells[targetCellId];
  if (!target) {
    return { allowed: false, reason: 'Ô không tồn tại' };
  }

  // 1. Gia cố ô phe mình
  if (target.owner === team) {
    if (target.reinforceLevel >= target.maxReinforce) {
      return { allowed: false, reason: 'Ô này đã đạt cấp gia cố tối đa' };
    }
    return { allowed: true, actionType: 'reinforce' };
  }

  // 2. Tấn công ô trung lập hoặc ô của địch
  const hasAdjacentFriendlyCell = Object.values(cells).some(c => {
    return c.owner === team && isOrthogonalAdjacent(c, target);
  });

  if (!hasAdjacentFriendlyCell) {
    return {
      allowed: false,
      reason: 'Chỉ được tấn công các ô liền kề (4 hướng) với lãnh thổ phe mình',
    };
  }

  return { allowed: true, actionType: 'attack' };
}

/**
 * Chấm điểm câu trả lời của học sinh
 */
export function checkTerritoryAnswerCorrectness(
  question: TerritoryQuestion,
  userAnswer: unknown
): boolean {
  if (userAnswer === undefined || userAnswer === null) return false;

  const rawCorrect = question.correctAnswer;

  // Trắc nghiệm MCQ
  if (question.type === 'mcq4') {
    // Nếu đáp án đúng là số index (0..3)
    if (typeof rawCorrect === 'number') {
      if (typeof userAnswer === 'number') return userAnswer === rawCorrect;
      if (typeof userAnswer === 'string') {
        const parsed = parseInt(userAnswer, 10);
        return !isNaN(parsed) && parsed === rawCorrect;
      }
    }
    // So khớp chuỗi nội dung đáp án
    const strAns = String(userAnswer).trim().toLowerCase();
    const strCor = String(rawCorrect).trim().toLowerCase();
    return strAns === strCor;
  }

  // Đúng / Sai (tf)
  if (question.type === 'tf') {
    const bUser =
      userAnswer === true ||
      userAnswer === 'true' ||
      userAnswer === 1 ||
      String(userAnswer).toLowerCase() === 'đúng';
    const bCor =
      rawCorrect === true ||
      rawCorrect === 'true' ||
      rawCorrect === 1 ||
      String(rawCorrect).toLowerCase() === 'đúng';
    return bUser === bCor;
  }

  // Câu trả lời ngắn (short text)
  const normUser = String(userAnswer).trim().toLowerCase();
  if (Array.isArray(rawCorrect)) {
    return rawCorrect.some(c => String(c).trim().toLowerCase() === normUser);
  }
  const normCor = String(rawCorrect).trim().toLowerCase();
  return normUser === normCor;
}

/**
 * Xử lý tác động công phá hoặc gia cố lên một ô đất khi trả lời đúng
 */
export function applyAttackToCell(
  cell: TerritoryCell,
  attackerTeam: 'blue' | 'red',
  isCorrect: boolean
): {
  cell: TerritoryCell;
  event: 'captured' | 'fortified' | 'damaged' | 'failed' | 'defended';
  pointsGained: number;
} {
  const updated: TerritoryCell = { ...cell };

  if (!isCorrect) {
    return { cell: updated, event: 'failed', pointsGained: 0 };
  }

  // TRƯỜNG HỢP 1: Ô thuộc phe mình -> Gia cố phòng thủ
  if (updated.owner === attackerTeam) {
    if (updated.reinforceLevel < updated.maxReinforce) {
      updated.reinforceLevel += 1;
      return { cell: updated, event: 'fortified', pointsGained: 1 };
    }
    return { cell: updated, event: 'defended', pointsGained: 0 };
  }

  // TRƯỜNG HỢP 2: Ô còn Trung Lập -> Tính năng giằng co (Tug-of-War)
  if (updated.owner === 'neutral') {
    if (attackerTeam === 'blue') {
      updated.tugOfWarHp += 1;
      if (updated.tugOfWarHp >= updated.maxHp) {
        // Xanh chính thức chiếm ô!
        updated.owner = 'blue';
        updated.currentHp = updated.maxHp;
        updated.tugOfWarHp = 0;
        updated.reinforceLevel = 0;
        return {
          cell: updated,
          event: 'captured',
          pointsGained: getTerrainBasePoints(updated.terrain),
        };
      }
    } else {
      updated.tugOfWarHp -= 1;
      if (updated.tugOfWarHp <= -updated.maxHp) {
        // Đỏ chính thức chiếm ô!
        updated.owner = 'red';
        updated.currentHp = updated.maxHp;
        updated.tugOfWarHp = 0;
        updated.reinforceLevel = 0;
        return {
          cell: updated,
          event: 'captured',
          pointsGained: getTerrainBasePoints(updated.terrain),
        };
      }
    }
    return { cell: updated, event: 'damaged', pointsGained: 0 };
  }

  // TRƯỜNG HỢP 3: Ô đã thuộc phe ĐỊCH -> Công phá không còn giằng co, hết máu là thuộc phe tấn công
  // 1. Phá giáp gia cố trước
  if (updated.reinforceLevel > 0) {
    updated.reinforceLevel -= 1;
    return { cell: updated, event: 'damaged', pointsGained: 1 };
  }

  // 2. Trừ máu gốc của thành
  updated.currentHp -= 1;
  if (updated.currentHp <= 0) {
    // ĐÃ HẠ THÀNH! Lập tức chuyển chủ quyền cho phe tấn công
    updated.owner = attackerTeam;
    updated.currentHp = 1; // Khởi đầu với 1 máu
    updated.reinforceLevel = 0;
    updated.tugOfWarHp = 0;
    return {
      cell: updated,
      event: 'captured',
      pointsGained: getTerrainBasePoints(updated.terrain),
    };
  }

  return { cell: updated, event: 'damaged', pointsGained: 0 };
}

export function getTerrainBasePoints(terrain: TerrainType): number {
  switch (terrain) {
    case 'big_castle':
      return 20;
    case 'small_castle':
      return 10;
    case 'watchtower':
      return 5;
    case 'plain':
    default:
      return 1;
  }
}

/**
 * Tính toán điểm số hiện tại và tỉ lệ đất chiếm được của hai phe
 */
export function calculateScoresAndDominance(
  cells: Record<string, TerritoryCell>,
  config: Partial<TerritoryWarConfig>
): {
  blueScore: number;
  redScore: number;
  blueCellCount: number;
  redCellCount: number;
  totalCells: number;
  bluePercent: number;
  redPercent: number;
} {
  let blueScore = 0;
  let redScore = 0;
  let blueCellCount = 0;
  let redCellCount = 0;
  const totalCells = Object.keys(cells).length;

  const ptsBig = config.pointsBigCastle ?? 20;
  const ptsSmall = config.pointsSmallCastle ?? 10;
  const ptsTower = config.pointsWatchtower ?? 5;
  const ptsPlain = config.pointsPlain ?? 1;
  const ptsReinforce = config.pointsReinforce ?? 1;

  for (const c of Object.values(cells)) {
    const basePts =
      c.terrain === 'big_castle'
        ? ptsBig
        : c.terrain === 'small_castle'
          ? ptsSmall
          : c.terrain === 'watchtower'
            ? ptsTower
            : ptsPlain;

    const reinforcePts = c.reinforceLevel * ptsReinforce;

    if (c.owner === 'blue') {
      blueCellCount++;
      blueScore += basePts + reinforcePts;
    } else if (c.owner === 'red') {
      redCellCount++;
      redScore += basePts + reinforcePts;
    }
  }

  const bluePercent = totalCells > 0 ? Math.round((blueCellCount / totalCells) * 100) : 0;
  const redPercent = totalCells > 0 ? Math.round((redCellCount / totalCells) * 100) : 0;

  return {
    blueScore,
    redScore,
    blueCellCount,
    redCellCount,
    totalCells,
    bluePercent,
    redPercent,
  };
}

/**
 * Kiểm tra điều kiện thắng Sudden Death:
 * - Chiếm được Lâu Đài Lớn (Big Castle)
 * - Chiếm được CẢ 2 Lâu Đài Nhỏ (Small Castles)
 */
export function checkSuddenDeath(
  cells: Record<string, TerritoryCell>,
  enableSuddenDeath: boolean
): {
  triggered: boolean;
  winner: 'blue' | 'red' | null;
  reason: string | null;
} {
  if (!enableSuddenDeath) {
    return { triggered: false, winner: null, reason: null };
  }

  const bigCastle = Object.values(cells).find(c => c.terrain === 'big_castle');
  if (bigCastle) {
    if (bigCastle.owner === 'blue') {
      return {
        triggered: true,
        winner: 'blue',
        reason: 'Phe Xanh đã công phá thành công Đại Bản Doanh Lâu Đài Lớn!',
      };
    }
    if (bigCastle.owner === 'red') {
      return {
        triggered: true,
        winner: 'red',
        reason: 'Phe Đỏ đã công phá thành công Đại Bản Doanh Lâu Đài Lớn!',
      };
    }
  }

  const smallCastles = Object.values(cells).filter(c => c.terrain === 'small_castle');
  if (smallCastles.length === 2) {
    const sc1 = smallCastles[0]!;
    const sc2 = smallCastles[1]!;
    if (sc1.owner === 'blue' && sc2.owner === 'blue') {
      return {
        triggered: true,
        winner: 'blue',
        reason: 'Phe Xanh đã thâu tóm cả 2 Lâu Đài Cánh!',
      };
    }
    if (sc1.owner === 'red' && sc2.owner === 'red') {
      return {
        triggered: true,
        winner: 'red',
        reason: 'Phe Đỏ đã thâu tóm cả 2 Lâu Đài Cánh!',
      };
    }
  }

  return { triggered: false, winner: null, reason: null };
}

/**
 * Tính điểm số đóng góp tướng lĩnh của từng người chơi
 * Mỗi ô đất chiếm được: 5 điểm, Mỗi lần gia cố: 2 điểm, Mỗi câu đúng: 1 điểm
 */
export function getParticipantScore(p: TerritoryParticipant): number {
  return p.capturedCount * 5 + p.fortifiedCount * 2 + p.correctCount;
}

/**
 * Bảng xếp hạng tướng lĩnh đóng góp theo từng phe và toàn bộ người chơi
 */
export function getLeaderboardByTeam(participants: Record<string, TerritoryParticipant>): {
  blueCommanders: TerritoryParticipant[];
  redCommanders: TerritoryParticipant[];
  allRanked: TerritoryParticipant[];
} {
  const list = Object.values(participants);
  const sorter = (a: TerritoryParticipant, b: TerritoryParticipant) => {
    const scoreA = getParticipantScore(a);
    const scoreB = getParticipantScore(b);
    return scoreB - scoreA;
  };

  const allRanked = [...list].sort(sorter);
  const blueCommanders = list.filter(p => p.team === 'blue').sort(sorter);
  const redCommanders = list.filter(p => p.team === 'red').sort(sorter);

  return { blueCommanders, redCommanders, allRanked };
}
