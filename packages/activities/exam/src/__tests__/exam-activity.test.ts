import { describe, expect, it } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import { type Question, toRichText } from '@educlass/question-kit';
import { ExamActivity } from '../exam-activity.js';
import type { ExamConfig, ExamState } from '../exam-schemas.js';

interface MockExamContext extends ActivityContext {
  _advanceTime: (ms: number) => void;
  _getRewards: () => Array<{ participantId: string; trigger: string; qty: number }>;
}

function createMockContext(runId = 'exam-run-1'): MockExamContext {
  let currentTime = 1700000000000;
  const rewardsGranted: Array<{ participantId: string; trigger: string; qty: number }> = [];

  return {
    sessionId: 'session-100',
    runId,
    now: () => currentTime,
    rng: () => 0.5,
    broadcast: () => {},
    sendToParticipant: () => {},
    grantReward: async (participantId: string, trigger: string, qty = 10) => {
      rewardsGranted.push({ participantId, trigger, qty });
    },
    // Helper tùy chỉnh để tua thời gian trong test
    _advanceTime: (ms: number) => {
      currentTime += ms;
    },
    _getRewards: () => rewardsGranted,
  } as ActivityContext & {
    _advanceTime: (ms: number) => void;
    _getRewards: () => Array<{ participantId: string; trigger: string; qty: number }>;
  };
}

describe('ExamActivity Plugin Lifecycle & Behavior (Task 4.1)', () => {
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      type: 'mcq4',
      stem: toRichText('2 + 2 = ?'),
      options: [toRichText('3'), toRichText('4'), toRichText('5'), toRichText('6')],
      correct: 1, // '4'
      points: 5,
    },
    {
      id: 'q2',
      type: 'tf',
      stem: toRichText('Nước sôi ở 100 độ C ở áp suất chuẩn.'),
      correct: true,
      points: 5,
    },
  ];

  const examConfigWithPassword: ExamConfig = {
    title: 'Kỳ Thi Khảo Sát Toán 10',
    durationMinutes: 45,
    shuffleQuestions: true,
    shuffleOptions: true,
    password: 'PassWord123',
    questions: sampleQuestions,
  };

  it('initializes in ready state with sanitized questions and password flag', () => {
    const ctx = createMockContext();
    const state = ExamActivity.server.onStart(ctx, examConfigWithPassword);

    expect(state.title).toBe('Kỳ Thi Khảo Sát Toán 10');
    expect(state.durationMinutes).toBe(45);
    expect(state.status).toBe('ready');
    expect(state.hasPassword).toBe(true);
    expect(state.startedAt).toBeNull();
    expect(state.expiresAt).toBeNull();
    expect(state.publicQuestions).toHaveLength(2);

    // Không gửi mật khẩu thật hoặc đáp án đúng trong state
    expect((state as Record<string, unknown>).password).toBeUndefined();
    expect((state.publicQuestions[0] as Record<string, unknown>).correct).toBeUndefined();
  });

  it('rejects incorrect password and unlocks when correct password is provided', () => {
    const ctx = createMockContext();
    let state = ExamActivity.server.onStart(ctx, examConfigWithPassword);

    // 1. Học sinh thử nhập mật khẩu sai
    const reject = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'unlock_exam',
      password: 'SaiMatKhau',
      displayName: 'Học sinh An',
    });
    expect(reject).toEqual({
      ok: false,
      code: 'INCORRECT_PASSWORD',
      reason: 'Mật khẩu kỳ thi không chính xác. Vui lòng kiểm tra lại.',
    });

    // 2. Học sinh nhập đúng mật khẩu
    const unlocked = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'unlock_exam',
      password: 'PassWord123',
      displayName: 'Học sinh An',
    });
    expect('ok' in unlocked && unlocked.ok === false).toBe(false);
    state = unlocked as ExamState;

    const p = state.participants['hs-01']!;
    expect(p.authenticated).toBe(true);
    expect(p.displayName).toBe('Học sinh An');
    expect(p.questionOrder).toHaveLength(2);
    expect(p.optionOrders['q1']).toHaveLength(4);
  });

  it('supports teacher lifecycle: open_exam, extend_time, close_exam', () => {
    const ctx = createMockContext();
    let state = ExamActivity.server.onStart(ctx, examConfigWithPassword);

    // Mở đề: bắt đầu tính giờ
    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });
    expect(state.status).toBe('in_progress');
    expect(state.startedAt).toBe(1700000000000);
    expect(state.expiresAt).toBe(1700000000000 + 45 * 60 * 1000);

    // Cộng thêm 5 phút
    state = ExamActivity.server.onTeacherIntent(ctx, state, {
      type: 'extend_time',
      addMinutes: 5,
    });
    expect(state.durationMinutes).toBe(50);
    expect(state.expiresAt).toBe(1700000000000 + 50 * 60 * 1000);

    // Đóng đề
    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'close_exam' });
    expect(state.status).toBe('closed');
  });

  it('enforces exam timing, allows saving answers, submitting exam, and prevents modifications after submit', () => {
    const ctx = createMockContext();
    let state = ExamActivity.server.onStart(ctx, {
      ...examConfigWithPassword,
      password: null, // Không có mật khẩu
    });

    // HS cố lưu đáp án khi kỳ thi chưa mở (ready) -> từ chối
    const rejectNotStarted = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    });
    expect(rejectNotStarted).toEqual({
      ok: false,
      code: 'EXAM_NOT_IN_PROGRESS',
      reason: 'Kỳ thi chưa bắt đầu hoặc đã kết thúc.',
    });

    // GV mở kỳ thi
    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });

    // HS nhận đề
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'get_paper',
      displayName: 'Học sinh An',
    }) as ExamState;

    // HS lưu câu trả lời câu 1
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    }) as ExamState;
    expect(state.participants['hs-01']?.answers['q1']).toBe(1);

    // HS nộp bài thi
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'submit_exam',
    }) as ExamState;
    expect(state.participants['hs-01']?.isSubmitted).toBe(true);

    // HS cố sửa câu trả lời sau khi nộp -> từ chối
    const rejectAfterSubmit = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 0,
    });
    expect(rejectAfterSubmit).toEqual({
      ok: false,
      code: 'ALREADY_SUBMITTED',
      reason: 'Bạn đã nộp bài thi rồi và không thể sửa đáp án.',
    });
  });

  it('grades against original questions, grants EXP rewards, and ranks students upon onEnd', async () => {
    const ctx = createMockContext('run-eval');
    let state = ExamActivity.server.onStart(ctx, {
      title: 'Thi Thử',
      durationMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: false,
      password: null,
      questions: sampleQuestions,
    });

    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });

    // HS 1 nộp đúng cả 2 câu (10/10)
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'get_paper',
      displayName: 'Học sinh Xuất Sắc',
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1, // đúng (4)
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q2',
      answer: true, // đúng
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'submit_exam',
    }) as ExamState;

    // HS 2 chỉ đúng câu 1 (5/10)
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-02', {
      type: 'get_paper',
      displayName: 'Học sinh Bình Thường',
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-02', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1, // đúng
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-02', {
      type: 'save_answer',
      questionId: 'q2',
      answer: false, // sai
    }) as ExamState;
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-02', {
      type: 'submit_exam',
    }) as ExamState;

    // Kết thúc kỳ thi
    const results = ExamActivity.server.onEnd(ctx, state);

    expect(results).toHaveLength(2);

    // HS 1 đạt điểm tuyệt đối 10/10, rank 1
    const res1 = results.find(r => r.participantId === 'hs-01')!;
    expect(res1.score).toBe(10);
    expect(res1.percentage).toBe(100);
    expect(res1.correctCount).toBe(2);
    expect(res1.rank).toBe(1);

    // HS 2 đạt 5/10, rank 2
    const res2 = results.find(r => r.participantId === 'hs-02')!;
    expect(res2.score).toBe(5);
    expect(res2.percentage).toBe(50);
    expect(res2.correctCount).toBe(1);
    expect(res2.rank).toBe(2);

    // Kiểm tra trao thưởng EXP:
    // HS 1: hoàn thành (30) + điểm giỏi (20) + điểm tuyệt đối (50) = 3 lần grantReward
    const rewards = (ctx as unknown as { _getRewards: () => Array<{ participantId: string; trigger: string }> })._getRewards();
    const hs1Rewards = rewards.filter(r => r.participantId === 'hs-01');
    expect(hs1Rewards.map(r => r.trigger)).toContain('exam_finish');
    expect(hs1Rewards.map(r => r.trigger)).toContain('exam_high_score');
    expect(hs1Rewards.map(r => r.trigger)).toContain('exam_perfect');

    // HS 2: chỉ nhận 'exam_finish'
    const hs2Rewards = rewards.filter(r => r.participantId === 'hs-02');
    expect(hs2Rewards.map(r => r.trigger)).toEqual(['exam_finish']);
  });

  it('monitors live status, handles force submit and individual student time extension (Task 4.3)', () => {
    const ctx = createMockContext('run-live');
    let state = ExamActivity.server.onStart(ctx, {
      title: 'Thi Giám Sát',
      durationMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: false,
      password: null,
      questions: sampleQuestions,
    });

    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });

    // HS 1 nhận đề
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'get_paper',
      displayName: 'Học sinh An',
    }) as ExamState;

    // 1. HS 1 báo cáo mất focus (blur tab) và câu đang làm
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'report_status',
      currentQuestionId: 'q2',
      currentQuestionIndex: 1,
      isFocusLost: true,
    }) as ExamState;

    let p1 = state.participants['hs-01']!;
    expect(p1.isFocusLost).toBe(true);
    expect(p1.focusLostCount).toBe(1);
    expect(p1.currentQuestionId).toBe('q2');
    expect(p1.currentQuestionIndex).toBe(1);

    // HS 1 quay lại tab (focus)
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'report_status',
      isFocusLost: false,
    }) as ExamState;

    p1 = state.participants['hs-01']!;
    expect(p1.isFocusLost).toBe(false);
    expect(p1.focusLostCount).toBe(1); // không tăng count khi false

    // HS 1 trả lời câu 1: tiến độ tự động cập nhật
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    }) as ExamState;

    p1 = state.participants['hs-01']!;
    expect(p1.answeredCount).toBe(1);
    expect(p1.progressPercent).toBe(50); // 1/2 câu = 50%

    // 2. Giáo viên cộng thêm giờ riêng cho HS 1 (+5 phút)
    state = ExamActivity.server.onTeacherIntent(ctx, state, {
      type: 'extend_student_time',
      participantId: 'hs-01',
      addMinutes: 5,
    });

    p1 = state.participants['hs-01']!;
    expect(p1.extendedMinutes).toBe(5);
    const expectedExpiry = 1700000000000 + (10 + 5) * 60 * 1000;
    expect(p1.individualExpiresAt).toBe(expectedExpiry);

    // 3. Giáo viên thu bài hộ HS 1
    state = ExamActivity.server.onTeacherIntent(ctx, state, {
      type: 'force_submit_student',
      participantId: 'hs-01',
    });

    p1 = state.participants['hs-01']!;
    expect(p1.isSubmitted).toBe(true);
    expect(p1.submittedAt).toBeDefined();

    // HS 1 sau khi bị thu bài hộ cố lưu đáp án -> bị từ chối
    const rejectSave = ExamActivity.server.onStudentIntent(ctx, state, 'hs-01', {
      type: 'save_answer',
      questionId: 'q2',
      answer: true,
    });
    expect(rejectSave).toEqual({
      ok: false,
      code: 'ALREADY_SUBMITTED',
      reason: 'Bạn đã nộp bài thi rồi và không thể sửa đáp án.',
    });
  });

  it('satisfies Stage 4 DoD: restores all saved student answers seamlessly when browser is closed/disconnected and resumed', () => {
    const ctx = createMockContext('run-dod-recovery');
    let state = ExamActivity.server.onStart(ctx, {
      title: 'Thi Khôi Phục Kết Nối (DoD Chặng 4)',
      durationMinutes: 15,
      shuffleQuestions: true,
      shuffleOptions: true,
      password: null,
      questions: sampleQuestions,
    });

    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });

    // 1. HS nhận đề lần đầu
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-reconnect', {
      type: 'get_paper',
      displayName: 'Học sinh Kiên Cường',
    }) as ExamState;

    const initialOrder = [...state.participants['hs-reconnect']!.questionOrder];
    const initialOptions = { ...state.participants['hs-reconnect']!.optionOrders };

    // 2. HS làm câu q1
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-reconnect', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    }) as ExamState;

    expect(state.participants['hs-reconnect']?.answers['q1']).toBe(1);
    expect(state.participants['hs-reconnect']?.answeredCount).toBe(1);

    // 3. Giả lập HS bị rớt mạng / đóng trình duyệt và vào lại (kết nối lại và gọi get_paper)
    const reconnectedState = ExamActivity.server.onStudentIntent(ctx, state, 'hs-reconnect', {
      type: 'get_paper',
      displayName: 'Học sinh Kiên Cường',
    }) as ExamState;

    const recovered = reconnectedState.participants['hs-reconnect']!;

    // Xác minh toàn bộ thứ tự câu, thứ tự đáp án và câu trả lời đã lưu được bảo toàn 100%
    expect(recovered.questionOrder).toEqual(initialOrder);
    expect(recovered.optionOrders).toEqual(initialOptions);
    expect(recovered.answers['q1']).toBe(1);
    expect(recovered.answeredCount).toBe(1);
    expect(recovered.isSubmitted).toBe(false);

    // 4. HS tiếp tục làm câu q2 và nộp bài
    state = ExamActivity.server.onStudentIntent(ctx, reconnectedState, 'hs-reconnect', {
      type: 'save_answer',
      questionId: 'q2',
      answer: true,
    }) as ExamState;

    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-reconnect', {
      type: 'submit_exam',
    }) as ExamState;

    expect(state.participants['hs-reconnect']?.isSubmitted).toBe(true);
    expect(state.participants['hs-reconnect']?.answers['q1']).toBe(1);
    expect(state.participants['hs-reconnect']?.answers['q2']).toBe(true);

    // 5. Kết thúc kỳ thi và chấm điểm
    const results = ExamActivity.server.onEnd(ctx, state);
    const finalScore = results.find(r => r.participantId === 'hs-reconnect')!;
    expect(finalScore.score).toBe(10);
    expect(finalScore.percentage).toBe(100);
    expect(finalScore.correctCount).toBe(2);
  });

  it('allows late-joining students full exam duration calculated from their own start time', () => {
    const ctx = createMockContext();
    const config: ExamConfig = {
      title: 'Kỳ Thi Khảo Sát 15 Phút',
      durationMinutes: 15,
      shuffleQuestions: false,
      shuffleOptions: false,
      questions: sampleQuestions,
    };

    // 1. Giáo viên mở đề lúc t = 0
    let state = ExamActivity.server.onStart(ctx, config);
    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });
    expect(state.startedAt).toBe(1700000000000);
    expect(state.expiresAt).toBe(1700000000000 + 15 * 60 * 1000);

    // Học sinh 1 vào thi từ đầu
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-early', {
      type: 'get_paper',
      displayName: 'Học sinh Vào Sớm',
    }) as ExamState;
    expect(state.participants['hs-early']?.startedAt).toBe(1700000000000);
    expect(state.participants['hs-early']?.individualExpiresAt).toBe(1700000000000 + 15 * 60 * 1000);

    // 2. Thời gian trôi qua 10 phút (học sinh 2 vào muộn 10 phút)
    ctx._advanceTime(10 * 60 * 1000);
    const lateStartTime = ctx.now(); // 1700000000000 + 10 phút

    // Học sinh 2 mở đề thi
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-late', {
      type: 'get_paper',
      displayName: 'Học sinh Vào Muộn',
    }) as ExamState;

    const lateStudent = state.participants['hs-late']!;
    expect(lateStudent.startedAt).toBe(lateStartTime);
    // Học sinh 2 phải được hưởng đủ 15 phút tính từ lúc bạn ấy vào (tổng 25 phút từ lúc mở phòng)
    expect(lateStudent.individualExpiresAt).toBe(lateStartTime + 15 * 60 * 1000);

    // 3. Thời gian trôi qua thêm 6 phút (tổng 16 phút từ lúc mở phòng -> hết 15 phút ban đầu của cả phòng)
    ctx._advanceTime(6 * 60 * 1000);
    expect(ctx.now()).toBeGreaterThan(state.expiresAt!); // Đã quá giờ ban đầu của phòng

    // Học sinh vào muộn vẫn làm bài và lưu đáp án bình thường vì chưa hết 15 phút của riêng em ấy
    const saveResult = ExamActivity.server.onStudentIntent(ctx, state, 'hs-late', {
      type: 'save_answer',
      questionId: 'q1',
      answer: 1,
    });
    expect('ok' in saveResult && saveResult.ok === false).toBe(false);
    state = saveResult as ExamState;
    expect(state.participants['hs-late']?.answers['q1']).toBe(1);

    // 4. Khi thời gian trôi qua vượt quá hạn riêng của học sinh 2 (tua thêm 10 phút nữa)
    ctx._advanceTime(10 * 60 * 1000);
    const expiredResult = ExamActivity.server.onStudentIntent(ctx, state, 'hs-late', {
      type: 'save_answer',
      questionId: 'q2',
      answer: true,
    });
    expect(expiredResult).toEqual({
      ok: false,
      code: 'EXAM_EXPIRED',
      reason: 'Thời gian làm bài thi đã kết thúc.',
    });
  });

  it('orders reviewData and rendered options to match student shuffled variant', () => {
    const ctx = createMockContext('run-shuffle');
    const fourQuestions: Question[] = [
      {
        id: 'q-a',
        type: 'mcq4',
        stem: toRichText('Câu hỏi A'),
        options: [toRichText('Opt 0'), toRichText('Opt 1'), toRichText('Opt 2'), toRichText('Opt 3')],
        correct: 2, // 'Opt 2'
        points: 2.5,
      },
      {
        id: 'q-b',
        type: 'mcq4',
        stem: toRichText('Câu hỏi B'),
        options: [toRichText('Opt 0'), toRichText('Opt 1'), toRichText('Opt 2'), toRichText('Opt 3')],
        correct: 0,
        points: 2.5,
      },
      {
        id: 'q-c',
        type: 'tf',
        stem: toRichText('Câu hỏi C'),
        correct: true,
        points: 2.5,
      },
      {
        id: 'q-d',
        type: 'short',
        stem: toRichText('Câu hỏi D'),
        accepted: ['test'],
        points: 2.5,
      },
    ];

    let state = ExamActivity.server.onStart(ctx, {
      title: 'Thi xáo đề',
      durationMinutes: 30,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowViewReview: true,
      questions: fourQuestions,
    });

    state = ExamActivity.server.onTeacherIntent(ctx, state, { type: 'open_exam' });

    // HS 1 lấy đề
    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-shuffle-1', {
      type: 'get_paper',
      displayName: 'Học sinh 1',
    }) as ExamState;

    const p1 = state.participants['hs-shuffle-1']!;
    expect(p1.questionOrder).toHaveLength(4);
    expect(p1.optionOrders['q-a']).toHaveLength(4);

    // Học sinh chọn phương án đúng trên đề đã xáo:
    // Với q-a, đáp án gốc là 2. Vị trí trên đề học sinh là optionOrders['q-a'].indexOf(2)
    const qaOptionOrder = p1.optionOrders['q-a']!;
    const studentChoicePos = qaOptionOrder.indexOf(2);

    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-shuffle-1', {
      type: 'save_answer',
      questionId: 'q-a',
      answer: studentChoicePos,
    }) as ExamState;

    state = ExamActivity.server.onStudentIntent(ctx, state, 'hs-shuffle-1', {
      type: 'submit_exam',
    }) as ExamState;

    const p1After = state.participants['hs-shuffle-1']!;
    expect(p1After.isSubmitted).toBe(true);
    expect(p1After.reviewData).toBeDefined();
    expect(p1After.reviewData).toHaveLength(4);

    // Thứ tự trong reviewData phải khớp chính xác với p1.questionOrder
    const reviewQIds = p1After.reviewData!.map(r => r['questionId']);
    expect(reviewQIds).toEqual(p1.questionOrder);

    // Kiểm tra câu q-a trong reviewData
    const qaReview = p1After.reviewData!.find(r => r['questionId'] === 'q-a')!;
    expect(qaReview['isCorrect']).toBe(true);
    expect(qaReview['pointsEarned']).toBe(2.5);

    // Các lựa chọn trong reviewData phải khớp với optionOrder và có nhãn A, B, C, D
    const options = qaReview['options'] as Array<{ index: number; label: string; text: string }>;
    expect(options).toHaveLength(4);
    expect(options[0]!.label).toBe('A');
    expect(options[studentChoicePos]!.text).toBe('Opt 2');
    expect(qaReview['correctChoiceLabel']).toBe(['A', 'B', 'C', 'D'][studentChoicePos]);
    expect(qaReview['studentChoiceLabel']).toBe(['A', 'B', 'C', 'D'][studentChoicePos]);
  });
});
