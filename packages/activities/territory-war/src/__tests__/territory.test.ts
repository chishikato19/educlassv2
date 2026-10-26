import { describe, it, expect } from 'vitest';
import {
  generateMapCells,
  isOrthogonalAdjacent,
  canTeamTargetCell,
  applyAttackToCell,
  checkSuddenDeath,
  checkTerritoryAnswerCorrectness,
  calculateScoresAndDominance,
} from '../territory-logic.js';
import { TerritoryWarConfigSchema } from '../territory-schemas.js';
import { TerritoryWarActivity } from '../territory-activity.js';

describe('Đại Chiến Lãnh Thổ - Logic Bản Đồ & Trận Chiến', () => {
  it('Khởi tạo bản đồ 7x7 với đúng vị trí lâu đài và tháp canh', () => {
    const cells = generateMapCells('7x7');
    expect(Object.keys(cells).length).toBe(49);

    // Căn cứ Xanh ở cột 0, Căn cứ Đỏ ở cột 6
    expect(cells['0_0']?.owner).toBe('blue');
    expect(cells['0_3']?.owner).toBe('blue');
    expect(cells['6_3']?.owner).toBe('red');

    // Lâu đài lớn ở chính tâm (3, 3)
    const bigCastle = cells['3_3'];
    expect(bigCastle?.terrain).toBe('big_castle');
    expect(bigCastle?.maxHp).toBe(5);
    expect(bigCastle?.owner).toBe('neutral');

    // 2 Tháp canh ở trên (3, 0) và dưới (3, 6)
    const towerTop = cells['3_0'];
    const towerBottom = cells['3_6'];
    expect(towerTop?.terrain).toBe('watchtower');
    expect(towerTop?.maxHp).toBe(2);
    expect(towerBottom?.terrain).toBe('watchtower');

    // 2 Lâu đài nhỏ ở (2, 3) và (4, 3)
    const smallLeft = cells['2_3'];
    const smallRight = cells['4_3'];
    expect(smallLeft?.terrain).toBe('small_castle');
    expect(smallLeft?.maxHp).toBe(3);
    expect(smallRight?.terrain).toBe('small_castle');
  });

  it('Kiểm tra quy tắc di chuyển liền kề 4 hướng (Đông Tây Nam Bắc)', () => {
    expect(isOrthogonalAdjacent({ x: 2, y: 3 }, { x: 3, y: 3 })).toBe(true);
    expect(isOrthogonalAdjacent({ x: 3, y: 2 }, { x: 3, y: 3 })).toBe(true);
    // Đi chéo không được tính
    expect(isOrthogonalAdjacent({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false);
    // Quá xa không được tính
    expect(isOrthogonalAdjacent({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(false);
  });

  it('Kiểm tra quyền chọn ô mục tiêu (canTeamTargetCell)', () => {
    const cells = generateMapCells('7x7');
    // Phe Xanh chiếm cột 0 -> Ô (1, 0) liền kề cột 0 nên Xanh tấn công được
    const check1 = canTeamTargetCell(cells, 'blue', '1_0');
    expect(check1.allowed).toBe(true);

    // Ô (3, 3) ở tâm cách xa cột 0 -> Xanh chưa thể tấn công được
    const checkFar = canTeamTargetCell(cells, 'blue', '3_3');
    expect(checkFar.allowed).toBe(false);

    // Ô (0, 0) của phe Xanh -> Cho phép gia cố
    const checkReinforce = canTeamTargetCell(cells, 'blue', '0_0');
    expect(checkReinforce.allowed).toBe(true);
    expect(checkReinforce.actionType).toBe('reinforce');
  });

  it('Cơ chế giằng co khi ô còn trung lập và chiếm thành công khi đủ máu', () => {
    const cells = generateMapCells('7x7');
    const castle = cells['2_3']!; // Lâu đài nhỏ, 3 HP, trung lập
    expect(castle.owner).toBe('neutral');

    // Lần 1: Xanh đúng -> tugOfWarHp = 1
    const r1 = applyAttackToCell(castle, 'blue', true);
    expect(r1.cell.tugOfWarHp).toBe(1);
    expect(r1.cell.owner).toBe('neutral');

    // Lần 2: Đỏ phản công đúng -> tugOfWarHp về 0
    const r2 = applyAttackToCell(r1.cell, 'red', true);
    expect(r2.cell.tugOfWarHp).toBe(0);
    expect(r2.cell.owner).toBe('neutral');

    // Lần 3 & 4 & 5: Xanh đánh trúng 3 lần liên tiếp -> Chiếm thành công!
    const r3 = applyAttackToCell(r2.cell, 'blue', true);
    const r4 = applyAttackToCell(r3.cell, 'blue', true);
    const r5 = applyAttackToCell(r4.cell, 'blue', true);
    expect(r5.cell.owner).toBe('blue');
    expect(r5.event).toBe('captured');
    expect(r5.pointsGained).toBe(10);
  });

  it('Ô đã thuộc 1 phe thì không còn giằng co, bị đánh hết máu là đổi chủ ngay', () => {
    const cells = generateMapCells('7x7');
    const castle = cells['2_3']!;
    castle.owner = 'blue';
    castle.currentHp = 2;
    castle.reinforceLevel = 1; // Có 1 lớp giáp gia cố

    // Đỏ đánh lần 1: Phá lớp giáp gia cố
    const r1 = applyAttackToCell(castle, 'red', true);
    expect(r1.cell.reinforceLevel).toBe(0);
    expect(r1.cell.currentHp).toBe(2);
    expect(r1.cell.owner).toBe('blue');

    // Đỏ đánh lần 2: Trừ 1 máu gốc (còn 1 HP)
    const r2 = applyAttackToCell(r1.cell, 'red', true);
    expect(r2.cell.currentHp).toBe(1);
    expect(r2.cell.owner).toBe('blue');

    // Đỏ đánh lần 3: Máu về 0 -> THUỘC LUÔN VỀ PHE ĐỎ
    const r3 = applyAttackToCell(r2.cell, 'red', true);
    expect(r3.cell.owner).toBe('red');
    expect(r3.cell.currentHp).toBe(1);
    expect(r3.event).toBe('captured');
  });

  it('Kiểm tra điều kiện thắng Sudden Death khi chiếm Lâu Đài Lớn hoặc 2 Lâu Đài Nhỏ', () => {
    const cells = generateMapCells('7x7');
    // Chưa ai chiếm
    expect(checkSuddenDeath(cells, true).triggered).toBe(false);

    // Xanh chiếm Lâu Đài Lớn -> Thắng ngay
    cells['3_3']!.owner = 'blue';
    const sd1 = checkSuddenDeath(cells, true);
    expect(sd1.triggered).toBe(true);
    expect(sd1.winner).toBe('blue');

    // Reset Lâu Đài Lớn
    cells['3_3']!.owner = 'neutral';

    // Đỏ chiếm cả 2 Lâu Đài Nhỏ (2,3) và (4,3) -> Thắng ngay
    cells['2_3']!.owner = 'red';
    cells['4_3']!.owner = 'red';
    const sd2 = checkSuddenDeath(cells, true);
    expect(sd2.triggered).toBe(true);
    expect(sd2.winner).toBe('red');
  });

  it('Chấm điểm trắc nghiệm mcq4, tf, short text chính xác', () => {
    const mcq = {
      id: 'q1',
      stem: '1+1=?',
      type: 'mcq4' as const,
      options: ['1', '2', '3', '4'],
      correctAnswer: '2',
      timeLimit: 30,
    };
    expect(checkTerritoryAnswerCorrectness(mcq, '2')).toBe(true);
    expect(checkTerritoryAnswerCorrectness(mcq, '3')).toBe(false);

    const tf = {
      id: 'q2',
      stem: 'Mặt trời mọc ở hướng Đông',
      type: 'tf' as const,
      correctAnswer: true,
      timeLimit: 30,
    };
    expect(checkTerritoryAnswerCorrectness(tf, true)).toBe(true);
    expect(checkTerritoryAnswerCorrectness(tf, false)).toBe(false);
  });

  it('Tính điểm và tỉ lệ kiểm soát lãnh thổ chính xác', () => {
    const cells = generateMapCells('7x7');
    const dominance = calculateScoresAndDominance(cells, {
      title: 'Test',
      mapSize: '7x7',
      timeLimitMinutes: 5,
      enableSuddenDeath: true,
      shuffleQuestions: true,
      shuffleAnswers: true,
      allowLoopQuestions: true,
      questions: [],
      pointsPlain: 1,
      pointsWatchtower: 5,
      pointsSmallCastle: 10,
      pointsBigCastle: 20,
      pointsReinforce: 1,
      initialParticipants: [],
    });

    // Ban đầu cột 0 (7 ô đất) cho Xanh, cột 6 (7 ô đất) cho Đỏ
    expect(dominance.blueCellCount).toBe(7);
    expect(dominance.redCellCount).toBe(7);
    expect(dominance.blueScore).toBe(7);
    expect(dominance.redScore).toBe(7);
    expect(dominance.totalCells).toBe(49);
    expect(dominance.bluePercent).toBe(14);
  });

  it('Cho phép khởi tạo với cấu hình rỗng {} mà không gặp lỗi Zod questions required', () => {
    const parsed = TerritoryWarConfigSchema.parse({});
    expect(parsed.title).toBe('Đại Chiến Lãnh Thổ');
    expect(parsed.mapSize).toBe('7x7');
    expect(parsed.questions).toEqual([]);

    const mockCtx = {
      sessionId: 'sess_1',
      runId: 'run_1',
      now: () => 100000,
      rng: () => 0.5,
      broadcast: () => {},
      sendToParticipant: () => {},
      grantReward: () => {},
    };

    const initial = TerritoryWarActivity.server.onStart(mockCtx, parsed);
    expect(initial.status).toBe('waiting');
    expect(initial.totalCells).toBe(49);
    expect(initial.blueScore).toBe(7);
    expect(initial.enableSuddenDeath).toBe(false);
  });

  it('Tự động chia quân ban đầu và hỗ trợ giáo viên chuyển đổi cả nhóm học sinh / hoán đổi đội', () => {
    const mockCtx = {
      sessionId: 'sess_1',
      runId: 'run_1',
      now: () => 100000,
      rng: () => 0.5,
      broadcast: () => {},
      sendToParticipant: () => {},
      grantReward: () => {},
    };

    const cfg = TerritoryWarConfigSchema.parse({
      initialParticipants: [
        { id: 'hs_1', displayName: 'Học sinh 1', team: 'blue', groupName: 'Nhóm A' },
        { id: 'hs_2', displayName: 'Học sinh 2', team: 'blue', groupName: 'Nhóm A' },
        { id: 'hs_3', displayName: 'Học sinh 3', team: 'red', groupName: 'Nhóm B' },
      ],
    });

    let state = TerritoryWarActivity.server.onStart(mockCtx, cfg);
    expect(Object.keys(state.participants).length).toBe(3);
    expect(state.participants['hs_1']?.team).toBe('blue');
    expect(state.participants['hs_1']?.groupName).toBe('Nhóm A');
    expect(state.participants['hs_3']?.team).toBe('red');

    // Giáo viên chuyển toàn bộ Nhóm A sang Đỏ
    state = TerritoryWarActivity.server.onTeacherIntent!(mockCtx, state, {
      type: 'assign_group_team',
      groupName: 'Nhóm A',
      team: 'red',
    });
    expect(state.participants['hs_1']?.team).toBe('red');
    expect(state.participants['hs_2']?.team).toBe('red');

    // Giáo viên hoán đổi 2 đội (swap_teams)
    state = TerritoryWarActivity.server.onTeacherIntent!(mockCtx, state, {
      type: 'swap_teams',
    });
    expect(state.participants['hs_1']?.team).toBe('blue');
    expect(state.participants['hs_2']?.team).toBe('blue');
    expect(state.participants['hs_3']?.team).toBe('blue'); // hs_3 was red before swap, now blue
  });
});
