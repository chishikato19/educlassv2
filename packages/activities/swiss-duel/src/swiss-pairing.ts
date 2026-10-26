import type { SwissMatchup, SwissParticipantState } from './swiss-schemas.js';

export interface PairingResult {
  matchups: SwissMatchup[];
  byePlayerId: string | null;
  updatedParticipants: Record<string, SwissParticipantState>;
}

/**
 * Thuật toán Bắt Cặp Thụy Sỹ (Swiss Pairing Algorithm):
 * - Xử lý suất BYE: Chọn trong nhóm điểm thấp nhất. Nếu nhóm cuối đều đã nhận BYE -> reset lại suất nhận BYE, cho nhận lại.
 * - Phân nhóm điểm từ cao xuống thấp (Down-float).
 * - Ghép cặp theo bàn đấu.
 */
export function generateSwissPairings(
  currentParticipants: Record<string, SwissParticipantState>,
  allowRematch: boolean,
  pointsWin = 2
): PairingResult {
  // Clone danh sách để xử lý
  const participants: Record<string, SwissParticipantState> = {};
  for (const [id, p] of Object.entries(currentParticipants)) {
    participants[id] = {
      ...p,
      isByeThisRound: false,
      currentTable: null,
    };
  }

  const pList = Object.values(participants);
  if (pList.length === 0) {
    return { matchups: [], byePlayerId: null, updatedParticipants: participants };
  }

  let byePlayerId: string | null = null;

  // 1. XỬ LÝ KHI TỔNG SỐ HỌC SINH LẺ (Trao suất BYE)
  if (pList.length % 2 !== 0) {
    // Tìm điểm số thấp nhất hiện tại
    const lowestPoints = Math.min(...pList.map(p => p.tournamentPoints));
    const lowestGroup = pList.filter(p => p.tournamentPoints === lowestPoints);

    // Lọc những bạn ở nhóm cuối chưa từng nhận BYE (byeCount === 0)
    let eligibleForBye = lowestGroup.filter(p => p.byeCount === 0);

    // NẾU TẤT CẢ các bạn trong nhóm cuối đều đã nhận BYE -> Reset lại suất nhận BYE của nhóm cuối
    if (eligibleForBye.length === 0) {
      // Tìm số lần nhận bye nhỏ nhất trong nhóm cuối
      const minByeInGroup = Math.min(...lowestGroup.map(p => p.byeCount));
      eligibleForBye = lowestGroup.filter(p => p.byeCount === minByeInGroup);
    }

    // Chọn 1 bạn ngẫu nhiên trong danh sách hợp lệ
    const chosenOne = eligibleForBye[Math.floor(Math.random() * eligibleForBye.length)]!;
    byePlayerId = chosenOne.participantId;

    // Cập nhật điểm và trạng thái cho bạn nhận BYE
    const p = participants[byePlayerId]!;
    p.isByeThisRound = true;
    p.byeCount += 1;
    p.tournamentPoints += pointsWin; // Thắng danh dự (+2 điểm)
    p.matchesWon += 1;
    p.streak += 1;
  }

  // Danh sách các bạn cần ghép cặp thi đấu (loại trừ bạn nhận BYE)
  const pool = Object.values(participants).filter(p => p.participantId !== byePlayerId);

  // 2. PHÂN NHÓM THEO ĐIỂM SỐ TỪ CAO XUỐNG THẤP
  // Nhóm theo tournamentPoints
  const scoreMap = new Map<number, SwissParticipantState[]>();
  for (const p of pool) {
    const pts = p.tournamentPoints;
    if (!scoreMap.has(pts)) {
      scoreMap.set(pts, []);
    }
    scoreMap.get(pts)!.push(p);
  }

  // Sắp xếp các mức điểm từ cao xuống thấp
  const sortedScores = Array.from(scoreMap.keys()).sort((a, b) => b - a);

  // Danh sách cặp đấu cuối cùng
  const paired: Array<[SwissParticipantState, SwissParticipantState]> = [];
  const assigned = new Set<string>();

  // 3. THUẬT TOÁN GHÉP CẶP DOWN-FLOAT (Từ trên xuống dưới)
  let floaters: SwissParticipantState[] = [];

  for (const score of sortedScores) {
    let group = [...(scoreMap.get(score) || []), ...floaters];
    floaters = []; // Đã đưa floaters vào nhóm này

    // Xáo trộn ngẫu nhiên các học sinh trong cùng mức điểm
    group = group.filter(p => !assigned.has(p.participantId));
    group.sort(() => Math.random() - 0.5);

    // Ghép cặp trong nhóm
    const remainingInGroup: SwissParticipantState[] = [];

    while (group.length > 0) {
      const p1 = group.shift()!;
      if (assigned.has(p1.participantId)) continue;

      // Tìm đối thủ thích hợp cho p1
      let opponentIndex = -1;

      // Tiêu chí 1: Chưa từng gặp nhau (hoặc allowRematch = false)
      for (let i = 0; i < group.length; i++) {
        const candidate = group[i]!;
        if (!assigned.has(candidate.participantId)) {
          const hasPlayed = p1.history.includes(candidate.participantId);
          if (!hasPlayed) {
            opponentIndex = i;
            break;
          }
        }
      }

      // Tiêu chí 2: Nếu không tìm thấy người chưa gặp và được phép Rematch (hoặc buộc phải ghép)
      if (opponentIndex === -1 && (allowRematch || group.length === 1)) {
        for (let i = 0; i < group.length; i++) {
          const candidate = group[i]!;
          if (!assigned.has(candidate.participantId)) {
            opponentIndex = i;
            break;
          }
        }
      }

      if (opponentIndex !== -1) {
        const p2 = group.splice(opponentIndex, 1)[0]!;
        assigned.add(p1.participantId);
        assigned.add(p2.participantId);
        paired.push([p1, p2]);
      } else {
        // Không ghép được trong nhóm này -> thành floater đẩy xuống nhóm dưới (Down-float)
        remainingInGroup.push(p1);
      }
    }

    // Các bạn dư ở nhóm này sẽ được đẩy xuống nhóm tiếp theo
    floaters = remainingInGroup;
  }

  // Nếu vẫn còn floaters ở nhóm cuối cùng chưa được ghép (do số lượng hoặc cấm trùng)
  while (floaters.length >= 2) {
    const p1 = floaters.shift()!;
    const p2 = floaters.shift()!;
    assigned.add(p1.participantId);
    assigned.add(p2.participantId);
    paired.push([p1, p2]);
  }

  // 4. TẠO CÁC BÀN ĐẤU (Tables)
  const matchups: SwissMatchup[] = [];
  paired.forEach(([p1, p2], index) => {
    const tableNumber = index + 1;

    // Cập nhật currentTable và ghi nhớ đối thủ vào history
    p1.currentTable = tableNumber;
    p2.currentTable = tableNumber;
    p1.history.push(p2.participantId);
    p2.history.push(p1.participantId);

    matchups.push({
      tableNumber,
      player1Id: p1.participantId,
      player2Id: p2.participantId,
      player1Score: 0,
      player2Score: 0,
      player1Answered: false,
      player2Answered: false,
      player1Answers: {},
      player2Answers: {},
      player1Results: {},
      player2Results: {},
      result: 'in_progress',
    });
  });

  return {
    matchups,
    byePlayerId,
    updatedParticipants: participants,
  };
}
