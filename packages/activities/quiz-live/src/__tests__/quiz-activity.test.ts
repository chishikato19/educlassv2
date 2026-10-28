import { describe, expect, it, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import { QuizLiveActivity } from '../quiz-activity.js';
import type { QuizLiveConfig } from '../quiz-schemas.js';

function createMockContext(runId = 'run_test_quiz'): ActivityContext {
  const currentTime = 10000;
  return {
    sessionId: 'session_test_1',
    runId,
    now: () => currentTime,
    rng: () => 0.42,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };
}

const mockQuizConfig: QuizLiveConfig = {
  title: 'Đố vui Toán học',
  mode: 'kahoot',
  speedScoring: true,
  streakBonus: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  questions: [
    {
      id: 'q1',
      type: 'mcq4',
      stem: '1 + 1 bằng mấy?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1, // '2'
      timeLimit: 20,
      points: 1000,
    },
    {
      id: 'q2',
      type: 'tf',
      stem: 'Mặt trời mọc ở hướng Đông đúng không?',
      correctAnswer: true,
      timeLimit: 15,
      points: 1000,
    },
    {
      id: 'q3',
      type: 'short',
      stem: 'Thủ đô của Việt Nam là gì?',
      correctAnswer: ['Hà Nội', 'Ha Noi'],
      timeLimit: 30,
      points: 1000,
    },
  ],
};

describe('Quiz Live Activity Server Lifecycle (Task 3.3)', () => {
  it('initializes state onStart, hiding correct answers from sanitized questions', () => {
    const ctx = createMockContext();
    const state = QuizLiveActivity.server.onStart(ctx, mockQuizConfig);

    expect(state.title).toBe('Đố vui Toán học');
    expect(state.mode).toBe('kahoot');
    expect(state.status).toBe('in_question');
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.totalQuestions).toBe(3);
    expect(state.questions).toHaveLength(3);
    expect(state.currentCorrectAnswer).toBeUndefined();

    // Đảm bảo không để lộ trường correctAnswer trong state công khai
    expect((state.questions[0] as Record<string, unknown>).correctAnswer).toBeUndefined();
  });

  it('handles student answer submission in Kahoot mode with speed scoring and streak rewards', () => {
    const ctx = createMockContext('run_kahoot_scoring');
    let state = QuizLiveActivity.server.onStart(ctx, mockQuizConfig);

    // Học sinh A trả lời đúng ngay tức thì (100ms)
    const resA = QuizLiveActivity.server.onStudentIntent(ctx, state, 'student_a', {
      type: 'submit_answer',
      answer: 1, // đúng
      responseTimeMs: 100,
      displayName: 'Nguyễn Văn A',
    });

    expect('ok' in resA && !resA.ok).toBe(false);
    state = resA as typeof state;

    const progA = state.participants['student_a'];
    expect(progA).toBeDefined();
    expect(progA?.correctCount).toBe(1);
    expect(progA?.currentStreak).toBe(1);
    expect(progA?.score).toBeGreaterThanOrEqual(995);

    // Xác nhận đã gọi thưởng EXP trả lời đúng
    expect(ctx.grantReward).toHaveBeenCalledWith('student_a', 'quiz_correct', 10);

    // Học sinh B trả lời sai
    const resB = QuizLiveActivity.server.onStudentIntent(ctx, state, 'student_b', {
      type: 'submit_answer',
      answer: 0, // sai
      responseTimeMs: 200,
      displayName: 'Trần Thị B',
    });
    state = resB as typeof state;

    const progB = state.participants['student_b'];
    expect(progB?.correctCount).toBe(0);
    expect(progB?.currentStreak).toBe(0);
    expect(progB?.score).toBe(0);

    // Học sinh A cố nộp lại câu 1 -> bị từ chối
    const resReAnswer = QuizLiveActivity.server.onStudentIntent(ctx, state, 'student_a', {
      type: 'submit_answer',
      answer: 2,
    });
    expect('ok' in resReAnswer && resReAnswer.ok === false).toBe(true);
    if ('code' in resReAnswer) {
      expect(resReAnswer.code).toBe('ALREADY_ANSWERED');
    }

    // Kiểm tra Bảng xếp hạng: A đứng thứ 1, B đứng thứ 2
    expect(state.leaderboard).toHaveLength(2);
    expect(state.leaderboard[0]?.participantId).toBe('student_a');
    expect(state.leaderboard[0]?.rank).toBe(1);
    expect(state.leaderboard[1]?.participantId).toBe('student_b');
    expect(state.leaderboard[1]?.rank).toBe(2);
  });

  it('supports teacher pacing intents in Kahoot mode: show_review, show_leaderboard, next_question', () => {
    const ctx = createMockContext('run_kahoot_pacing');
    let state = QuizLiveActivity.server.onStart(ctx, mockQuizConfig);

    // 1. GV bấm Khóa câu & xem đáp án
    state = QuizLiveActivity.server.onTeacherIntent(ctx, state, { type: 'show_review' });
    expect(state.status).toBe('question_review');
    expect(state.currentCorrectAnswer).toBe(1); // Đáp án đúng là lựa chọn 1

    // Khi đã khóa, học sinh mới gửi bài sẽ bị từ chối
    const lateSubmit = QuizLiveActivity.server.onStudentIntent(ctx, state, 'student_late', {
      type: 'submit_answer',
      answer: 1,
    });
    expect('ok' in lateSubmit && lateSubmit.ok === false).toBe(true);

    // 2. GV bấm Xem bảng xếp hạng
    state = QuizLiveActivity.server.onTeacherIntent(ctx, state, { type: 'show_leaderboard' });
    expect(state.status).toBe('leaderboard');

    // 3. GV chuyển sang câu tiếp theo
    state = QuizLiveActivity.server.onTeacherIntent(ctx, state, { type: 'next_question' });
    expect(state.status).toBe('in_question');
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.currentCorrectAnswer).toBeUndefined();
  });

  it('supports Quizizz mode (self-paced) and awards podium finish EXP onEnd', () => {
    const quizizzConfig: QuizLiveConfig = {
      ...mockQuizConfig,
      mode: 'quizizz',
    };

    const ctx = createMockContext('run_quizizz_mode');
    let state = QuizLiveActivity.server.onStart(ctx, quizizzConfig);

    // Học sinh 1 tự làm liên tục 3 câu và đúng cả 3 (đạt streak 3)
    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_1', {
      type: 'submit_answer',
      questionIndex: 0,
      answer: 1,
      displayName: 'HS Siêu Cấp',
    }) as typeof state;

    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_1', {
      type: 'submit_answer',
      questionIndex: 1,
      answer: true,
      displayName: 'HS Siêu Cấp',
    }) as typeof state;

    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_1', {
      type: 'submit_answer',
      questionIndex: 2,
      answer: 'Hà Nội',
      displayName: 'HS Siêu Cấp',
    }) as typeof state;

    const prog1 = state.participants['hs_1'];
    expect(prog1?.correctCount).toBe(3);
    expect(prog1?.currentStreak).toBe(3);
    expect(prog1?.isCompleted).toBe(true);

    // Kiểm tra thưởng chuỗi khi streak = 3
    expect(ctx.grantReward).toHaveBeenCalledWith('hs_1', 'streak', 5);

    // Học sinh 2 làm 2 câu
    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_2', {
      type: 'submit_answer',
      questionIndex: 0,
      answer: 1,
      displayName: 'HS Nhì',
    }) as typeof state;

    // Kết thúc vòng thi onEnd
    const results = QuizLiveActivity.server.onEnd(ctx, state);
    expect(results).toHaveLength(2);
    expect(results[0]?.participantId).toBe('hs_1');
    expect(results[0]?.rank).toBe(1);
    expect(results[0]?.accuracy).toBe(100);

    // Xác nhận trao thưởng top1 và finish
    expect(ctx.grantReward).toHaveBeenCalledWith('hs_1', 'top1', 50);
    expect(ctx.grantReward).toHaveBeenCalledWith('hs_2', 'top2', 30);
    expect(ctx.grantReward).toHaveBeenCalledWith('hs_1', 'finish', 20);
    expect(ctx.grantReward).toHaveBeenCalledWith('hs_2', 'finish', 20);
  });

  it('provides correct answers and explanations after each answer in quizizz mode when showCorrectAnswer is enabled', () => {
    const ctx = createMockContext('run_quizizz_feedback');
    const quizizzConfig: QuizLiveConfig = {
      ...mockQuizConfig,
      mode: 'quizizz',
      showCorrectAnswer: true,
      questions: [
        {
          id: 'q1',
          type: 'mcq4',
          stem: 'Thủ đô của Việt Nam?',
          options: ['Hà Nội', 'Đà Nẵng', 'Huế', 'TP.HCM'],
          correctAnswer: 0,
          timeLimit: 20,
          points: 1000,
          explanation: 'Hà Nội là thủ đô của CHXHCN Việt Nam từ năm 1976.',
        },
      ],
    };

    let state = QuizLiveActivity.server.onStart(ctx, quizizzConfig);
    expect(state.showCorrectAnswer).toBe(true);
    // Sanitize ẩn đáp án gốc
    expect((state.questions[0] as Record<string, unknown>)['correctAnswer']).toBeUndefined();

    // Học sinh submit câu trả lời sai (chọn 1 = Đà Nẵng)
    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_quizizz_1', {
      type: 'submit_answer',
      questionIndex: 0,
      answer: 1,
      displayName: 'Học sinh An',
    }) as typeof state;

    const prog = state.participants['hs_quizizz_1'];
    expect(prog).toBeDefined();
    expect(prog?.lastAnswer?.isCorrect).toBe(false);
    expect(prog?.lastAnswer?.correctAnswer).toBe(0);
    expect(prog?.lastAnswer?.selectedAnswer).toBe(1);
    expect(prog?.lastAnswer?.explanation).toBe('Hà Nội là thủ đô của CHXHCN Việt Nam từ năm 1976.');
    expect(prog?.answers['0']?.correctAnswer).toBe(0);
    expect(prog?.answers['0']?.explanation).toBe(
      'Hà Nội là thủ đô của CHXHCN Việt Nam từ năm 1976.'
    );
  });

  it('allows students to restart and replay quiz in quizizz mode when allowReplay is enabled', () => {
    const ctx = createMockContext('run_quizizz_replay');
    const replayConfig: QuizLiveConfig = {
      ...mockQuizConfig,
      mode: 'quizizz',
      allowReplay: true,
      questions: [
        {
          id: 'q1',
          type: 'mcq4',
          stem: '1 + 1 = ?',
          options: ['1', '2'],
          correctAnswer: 1,
          timeLimit: 20,
          points: 1000,
        },
      ],
    };

    let state = QuizLiveActivity.server.onStart(ctx, replayConfig);
    expect(state.allowReplay).toBe(true);

    // Học sinh hoàn thành câu 1
    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_replay', {
      type: 'submit_answer',
      questionIndex: 0,
      answer: 1,
      displayName: 'Học sinh Bảo',
    }) as typeof state;

    let p = state.participants['hs_replay'];
    expect(p?.isCompleted).toBe(true);
    expect(p?.currentIndex).toBe(1);
    expect(p?.score).toBeGreaterThan(0);
    const firstScore = p?.score ?? 0;

    // Học sinh bấm chơi lại
    state = QuizLiveActivity.server.onStudentIntent(ctx, state, 'hs_replay', {
      type: 'restart_quiz',
    }) as typeof state;

    p = state.participants['hs_replay'];
    expect(p?.isCompleted).toBe(false);
    expect(p?.currentIndex).toBe(0);
    expect(p?.score).toBe(0);
    expect(p?.replayCount).toBe(1);
    expect(p?.bestScore).toBe(firstScore);
    expect(p?.answers).toEqual({});
  });
});
