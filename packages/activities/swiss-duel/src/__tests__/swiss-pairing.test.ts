import { describe, expect, it } from 'vitest';
import type { SwissParticipantState } from '../swiss-schemas.js';
import { generateSwissPairings } from '../swiss-pairing.js';

function createMockParticipant(
  id: string,
  name: string,
  points = 0,
  byeCount = 0,
  history: string[] = []
): SwissParticipantState {
  return {
    participantId: id,
    displayName: name,
    tournamentPoints: points,
    correctCount: 0,
    matchesWon: 0,
    matchesDrawn: 0,
    matchesLost: 0,
    streak: 0,
    byeCount,
    history,
    currentTable: null,
    isByeThisRound: false,
  };
}

describe('Swiss Pairing Algorithm (Đấu Cờ Thụy Sỹ)', () => {
  it('bắt cặp chính xác khi tổng số học sinh là chẵn (không có suất BYE)', () => {
    const participants: Record<string, SwissParticipantState> = {
      p1: createMockParticipant('p1', 'Nguyễn An', 2),
      p2: createMockParticipant('p2', 'Trần Bình', 2),
      p3: createMockParticipant('p3', 'Lê Cường', 0),
      p4: createMockParticipant('p4', 'Phạm Dũng', 0),
    };

    const { matchups, byePlayerId, updatedParticipants } = generateSwissPairings(
      participants,
      false,
      2
    );

    expect(byePlayerId).toBeNull();
    expect(matchups.length).toBe(2);

    // Bàn 1 và Bàn 2
    expect(matchups[0]?.tableNumber).toBe(1);
    expect(matchups[1]?.tableNumber).toBe(2);

    // Cả 4 học sinh đều có bàn đấu
    expect(updatedParticipants.p1?.currentTable).not.toBeNull();
    expect(updatedParticipants.p2?.currentTable).not.toBeNull();
    expect(updatedParticipants.p3?.currentTable).not.toBeNull();
    expect(updatedParticipants.p4?.currentTable).not.toBeNull();
  });

  it('chọn suất BYE từ nhóm điểm THẤP NHẤT khi tổng số học sinh bị lẻ', () => {
    const participants: Record<string, SwissParticipantState> = {
      top1: createMockParticipant('top1', 'Học sinh Giỏi 1', 4, 0),
      top2: createMockParticipant('top2', 'Học sinh Giỏi 2', 4, 0),
      mid1: createMockParticipant('mid1', 'Học sinh Khá 1', 2, 0),
      mid2: createMockParticipant('mid2', 'Học sinh Khá 2', 2, 0),
      bot1: createMockParticipant('bot1', 'Học sinh Yếu 1', 0, 0), // Nhóm điểm thấp nhất
    };

    const { matchups, byePlayerId, updatedParticipants } = generateSwissPairings(
      participants,
      false,
      2
    );

    // Suất BYE phải thuộc về bot1 (nhóm điểm thấp nhất)
    expect(byePlayerId).toBe('bot1');
    expect(updatedParticipants.bot1?.isByeThisRound).toBe(true);
    expect(updatedParticipants.bot1?.tournamentPoints).toBe(2); // +2 điểm danh dự
    expect(updatedParticipants.bot1?.byeCount).toBe(1);

    // 4 bạn còn lại ghép thành 2 bàn
    expect(matchups.length).toBe(2);
  });

  it('reset lại suất nhận BYE khi TẤT CẢ các bạn trong nhóm cuối đều đã từng nhận BYE', () => {
    // Kịch bản: Cả 3 bạn ở nhóm 0 điểm đều đã nhận BYE 1 lần trước đó
    const participants: Record<string, SwissParticipantState> = {
      p1: createMockParticipant('p1', 'An', 4, 0),
      p2: createMockParticipant('p2', 'Bình', 4, 0),
      low1: createMockParticipant('low1', 'Cúc', 0, 1), // Đã nhận bye 1 lần
      low2: createMockParticipant('low2', 'Dương', 0, 1), // Đã nhận bye 1 lần
      low3: createMockParticipant('low3', 'Em', 0, 1), // Đã nhận bye 1 lần
    };

    const { byePlayerId, updatedParticipants } = generateSwissPairings(participants, false, 2);

    // Suất bye vẫn phải chọn được 1 bạn trong nhóm cuối và tăng byeCount lên 2
    expect(byePlayerId).not.toBeNull();
    expect(['low1', 'low2', 'low3']).toContain(byePlayerId);
    expect(updatedParticipants[byePlayerId!]?.byeCount).toBe(2);
    expect(updatedParticipants[byePlayerId!]?.tournamentPoints).toBe(2);
  });

  it('thực hiện Down-float khi nhóm điểm bị lẻ người', () => {
    // 3 bạn 4 điểm, 3 bạn 2 điểm -> Nhóm 4đ lẻ 1 bạn -> đẩy xuống nhóm 2đ
    const participants: Record<string, SwissParticipantState> = {
      p1: createMockParticipant('p1', 'An', 4),
      p2: createMockParticipant('p2', 'Bình', 4),
      p3: createMockParticipant('p3', 'Cường', 4),
      p4: createMockParticipant('p4', 'Dũng', 2),
      p5: createMockParticipant('p5', 'Giang', 2),
      p6: createMockParticipant('p6', 'Hà', 2),
    };

    const { matchups } = generateSwissPairings(participants, false, 2);

    expect(matchups.length).toBe(3);
    // Kiểm tra có ít nhất 1 trận đấu giữa bạn 4đ và bạn 2đ (Down-float thành công)
    const hasCrossBracketMatch = matchups.some(m => {
      const score1 = participants[m.player1Id]?.tournamentPoints;
      const score2 = participants[m.player2Id]?.tournamentPoints;
      return (score1 === 4 && score2 === 2) || (score1 === 2 && score2 === 4);
    });
    expect(hasCrossBracketMatch).toBe(true);
  });

  it('tránh gặp lại đối thủ cũ khi allowRematch = false', () => {
    const participants: Record<string, SwissParticipantState> = {
      p1: createMockParticipant('p1', 'An', 2, 0, ['p2']), // p1 đã từng gặp p2
      p2: createMockParticipant('p2', 'Bình', 2, 0, ['p1']),
      p3: createMockParticipant('p3', 'Cường', 2, 0, ['p4']), // p3 đã từng gặp p4
      p4: createMockParticipant('p4', 'Dũng', 2, 0, ['p3']),
    };

    const { matchups } = generateSwissPairings(participants, false, 2);

    // Không được có trận p1 gặp p2 hoặc p3 gặp p4
    for (const m of matchups) {
      const isP1P2 =
        (m.player1Id === 'p1' && m.player2Id === 'p2') ||
        (m.player1Id === 'p2' && m.player2Id === 'p1');
      const isP3P4 =
        (m.player1Id === 'p3' && m.player2Id === 'p4') ||
        (m.player1Id === 'p4' && m.player2Id === 'p3');
      expect(isP1P2).toBe(false);
      expect(isP3P4).toBe(false);
    }
  });
});
