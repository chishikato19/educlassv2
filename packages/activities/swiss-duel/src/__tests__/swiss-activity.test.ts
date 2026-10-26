import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import { SwissDuelConfigSchema, type SwissDuelConfig, type SwissDuelState } from '../swiss-schemas.js';
import { SwissDuelActivity } from '../swiss-activity.js';

describe('SwissDuelActivity Lifecycle', () => {
  const mockQuestions = [
    { id: 'q1', stem: 'Câu hỏi 1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, timeLimit: 30, type: 'mcq4' as const },
    { id: 'q2', stem: 'Câu hỏi 2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 1, timeLimit: 30, type: 'mcq4' as const },
    { id: 'q3', stem: 'Câu hỏi 3?', options: ['A', 'B', 'C', 'D'], correctAnswer: 2, timeLimit: 30, type: 'mcq4' as const },
    { id: 'q4', stem: 'Câu hỏi 4?', options: ['A', 'B', 'C', 'D'], correctAnswer: 3, timeLimit: 30, type: 'mcq4' as const },
  ];

  const mockConfig: SwissDuelConfig = {
    title: 'Giải Đấu Cờ Thụy Sỹ',
    mode: 'questions',
    timeLimitMinutes: 10,
    questions: mockQuestions,
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
    timeLimitPerQuestion: 30,
    shuffleQuestions: false,
    shuffleOptions: false,
  };

  const createMockContext = (): ActivityContext => {
    let mockTime = 1000000;
    return {
      runId: 'run_swiss_1',
      sessionId: 'sess_1',
      now: () => mockTime++,
      rng: () => 0.5,
      broadcast: vi.fn(),
      sendToParticipant: vi.fn(),
      grantReward: vi.fn(),
    };
  };

  it('khởi tạo thành công vòng 1 và tự động ghép bàn khi có 2 học sinh tham gia', () => {
    const ctx = createMockContext();
    let state = SwissDuelActivity.server.onStart(ctx, mockConfig);

    expect(state.title).toBe('Giải Đấu Cờ Thụy Sỹ');
    expect(state.status).toBe('in_round');
    expect(state.currentRound).toBe(1);
    expect(state.roundQuestions.length).toBe(2);
    expect(state.matchups.length).toBe(0);

    // Học sinh 1 tham gia
    const res1 = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    });
    expect('ok' in res1 && !res1.ok).toBe(false);
    state = res1 as SwissDuelState;

    // Học sinh 2 tham gia -> tự động xếp bàn đấu
    const res2 = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    });
    expect('ok' in res2 && !res2.ok).toBe(false);
    state = res2 as SwissDuelState;

    expect(state.matchups.length).toBe(1);
    expect(state.matchups[0]?.tableNumber).toBe(1);

    // Học sinh 3 và 4 tham gia -> tự động tái xếp bàn thành 2 bàn đấu cho cả 4 em
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p3', {
      type: 'join_tournament',
      displayName: 'Học sinh Cường',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p4', {
      type: 'join_tournament',
      displayName: 'Học sinh Dũng',
    }) as SwissDuelState;

    expect(Object.keys(state.participants).length).toBe(4);
    expect(state.matchups.length).toBe(2);
    expect(state.matchups[0]?.tableNumber).toBe(1);
    expect(state.matchups[1]?.tableNumber).toBe(2);
  });

  it('xử lý nộp bài với submit_round không bị tăng điểm khi gửi lại', () => {
    const ctx = createMockContext();
    let state = SwissDuelActivity.server.onStart(ctx, mockConfig);
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    }) as SwissDuelState;

    const matchup = state.matchups[0]!;
    const p1Id = matchup.player1Id;

    // Nộp cả vòng: câu 0 đúng (0), câu 1 đúng (1)
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, p1Id, {
      type: 'submit_round',
      answers: { 0: 0, 1: 1 },
    }) as SwissDuelState;

    expect(state.participants[p1Id]?.correctCount).toBe(2);
    expect(state.matchups[0]?.player1Score).toBe(2);
    expect(state.matchups[0]?.player1Answered).toBe(true);

    // Thử gửi lại submit_round -> không tăng điểm lần 2
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, p1Id, {
      type: 'submit_round',
      answers: { 0: 0, 1: 1 },
    }) as SwissDuelState;

    expect(state.participants[p1Id]?.correctCount).toBe(2);
    expect(state.matchups[0]?.player1Score).toBe(2);
  });

  it('xử lý nộp bài 2 câu và tự động kích hoạt đếm ngược 10s khi tất cả các bàn hoàn thành', () => {
    const ctx = createMockContext();
    let state = SwissDuelActivity.server.onStart(ctx, mockConfig);

    // Cho 2 học sinh tham gia
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    }) as SwissDuelState;

    const matchup = state.matchups[0]!;
    const p1Id = matchup.player1Id;
    const p2Id = matchup.player2Id;

    // P1 nộp bài cả vòng (câu 0: 0 [đúng], câu 1: 1 [đúng]) -> 2/2 điểm
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, p1Id, {
      type: 'submit_round',
      answers: { 0: 0, 1: 1 },
    }) as SwissDuelState;

    // P2 nộp bài cả vòng (câu 0: 0 [đúng], câu 1: 0 [sai]) -> 1/2 điểm
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, p2Id, {
      type: 'submit_round',
      answers: { 0: 0, 1: 0 },
    }) as SwissDuelState;

    // Bàn đấu đã xong: P1 đúng 2/2, P2 đúng 1/2 -> P1 thắng (+2đ), P2 thua (0đ)
    expect(state.matchups[0]?.result).toBe('player1_win');
    expect(state.participants[p1Id]?.tournamentPoints).toBe(2);
    expect(state.participants[p2Id]?.tournamentPoints).toBe(0);

    // Vì tất cả các bàn đã xong -> trạng thái chuyển sang round_review và có countdownEndsAt
    expect(state.status).toBe('round_review');
    expect(state.countdownEndsAt).toBeGreaterThan(0);
  });

  it('giáo viên bỏ qua đếm ngược và sang vòng tiếp theo', () => {
    const ctx = createMockContext();
    let state = SwissDuelActivity.server.onStart(ctx, mockConfig);
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    }) as SwissDuelState;

    state.status = 'round_review';
    state.countdownEndsAt = 1000000 + 10000;

    state = SwissDuelActivity.server.onTeacherIntent(ctx, state, { type: 'skip_countdown' });

    expect(state.currentRound).toBe(2);
    expect(state.status).toBe('in_round');
    expect(state.countdownEndsAt).toBeNull();
  });

  it('kết thúc giải đấu và trao thưởng kết quả onEnd', () => {
    const ctx = createMockContext();
    let state = SwissDuelActivity.server.onStart(ctx, mockConfig);
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(ctx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    }) as SwissDuelState;

    state.participants['p1']!.tournamentPoints = 4;
    state.participants['p2']!.tournamentPoints = 2;

    const results = SwissDuelActivity.server.onEnd(ctx, state);
    expect(results.length).toBe(2);
    expect(results[0]?.participantId).toBe('p1');
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.participantId).toBe('p2');
    expect(results[1]?.rank).toBe(2);
    expect(ctx.grantReward).toHaveBeenCalled();
  });

  it('hỗ trợ tùy chọn đảo câu hỏi và đáp án với giá trị mặc định là true', () => {
    const ctx = createMockContext();
    // Khởi tạo không truyền shuffleQuestions & shuffleOptions -> schema tự gán mặc định là true
    const rawConfig = {
      title: 'Giải Đấu Cờ Thụy Sỹ',
      mode: 'questions' as const,
      timeLimitMinutes: 10,
      questions: mockQuestions,
      pointsWin: 2,
      pointsDraw: 1,
      pointsLoss: 0,
      timeLimitPerQuestion: 30,
    };
    const parsedConfig = SwissDuelConfigSchema.parse(rawConfig);
    expect(parsedConfig.shuffleQuestions).toBe(true);
    expect(parsedConfig.shuffleOptions).toBe(true);

    const state = SwissDuelActivity.server.onStart(ctx, parsedConfig);
    expect(state.shuffleQuestions).toBe(true);
    expect(state.shuffleOptions).toBe(true);
  });

  it('xử lý đảo câu hỏi và đảo đáp án chính xác khi nộp bài', () => {
    // Giả lập ctx.rng trả về dãy số cố định để kiểm tra
    let rngCall = 0;
    const rngSequence = [0.9, 0.1, 0.4, 0.7, 0.2, 0.8];
    const customCtx: ActivityContext = {
      runId: 'run_swiss_shuffle',
      sessionId: 'sess_shuffle',
      now: () => 1000000,
      rng: () => {
        const val = rngSequence[rngCall % rngSequence.length]!;
        rngCall++;
        return val;
      },
      broadcast: vi.fn(),
      sendToParticipant: vi.fn(),
      grantReward: vi.fn(),
    };

    const shuffleConfig: SwissDuelConfig = {
      title: 'Giải Đấu Cờ Thụy Sỹ',
      mode: 'questions',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          stem: 'Thủ đô Việt Nam?',
          options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'Sài Gòn'],
          correctAnswer: 0, // 'Hà Nội'
          timeLimit: 30,
          type: 'mcq4',
        },
        {
          id: 'q2',
          stem: '1 + 1 = ?',
          options: ['1', '2', '3', '4'],
          correctAnswer: 1, // '2'
          timeLimit: 30,
          type: 'mcq4',
        },
      ],
      pointsWin: 2,
      pointsDraw: 1,
      pointsLoss: 0,
      timeLimitPerQuestion: 30,
      shuffleQuestions: false,
      shuffleOptions: true,
    };

    let state = SwissDuelActivity.server.onStart(customCtx, shuffleConfig);
    expect(state.roundQuestions.length).toBe(2);

    // Kiểm tra câu 1: 'Hà Nội' vẫn nằm trong options nhưng vị trí đã có thể thay đổi
    const q1Opts = state.roundQuestions[0]!.options!;
    expect(q1Opts).toContain('Hà Nội');
    const correctIdxQ1 = q1Opts.indexOf('Hà Nội');

    // Kiểm tra câu 2: '2' vẫn nằm trong options
    const q2Opts = state.roundQuestions[1]!.options!;
    expect(q2Opts).toContain('2');
    const correctIdxQ2 = q2Opts.indexOf('2');

    // Ghép cặp học sinh
    state = SwissDuelActivity.server.onStudentIntent(customCtx, state, 'p1', {
      type: 'join_tournament',
      displayName: 'Học sinh An',
    }) as SwissDuelState;
    state = SwissDuelActivity.server.onStudentIntent(customCtx, state, 'p2', {
      type: 'join_tournament',
      displayName: 'Học sinh Bình',
    }) as SwissDuelState;

    // Học sinh 1 nộp đúng vị trí mới đã đảo
    state = SwissDuelActivity.server.onStudentIntent(customCtx, state, 'p1', {
      type: 'submit_round',
      answers: {
        0: correctIdxQ1,
        1: correctIdxQ2,
      },
    }) as SwissDuelState;

    const matchup = state.matchups[0]!;
    expect(matchup.player1Score).toBe(2);
    expect(matchup.player1Results[0]).toBe(true);
    expect(matchup.player1Results[1]).toBe(true);
  });
});
