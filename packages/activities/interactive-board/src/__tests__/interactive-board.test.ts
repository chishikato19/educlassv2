import { describe, it, expect, vi } from 'vitest';
import type { ActivityContext } from '@educlass/core';
import type { BoardConfig, BoardPost, BoardState } from '@educlass/protocol';
import {
  calculatePeerAverage,
  canStudentComment,
  canStudentGrade,
  maskStateForStudent,
} from '../interactive-board-logic.js';
import { InteractiveBoardActivity } from '../interactive-board-activity.js';

describe('Bảng Tương Tác - Logic Thuần Túy', () => {
  it('calculatePeerAverage: tính điểm trung bình chính xác và làm tròn 1 chữ số thập phân', () => {
    expect(calculatePeerAverage({})).toBeNull();

    const grades1 = {
      p1: { participantId: 'p1', authorName: 'Học sinh 1', score: 9, createdAt: 1000 },
      p2: { participantId: 'p2', authorName: 'Học sinh 2', score: 8, createdAt: 1001 },
    };
    expect(calculatePeerAverage(grades1)).toBe(8.5);

    const grades2 = {
      p1: { participantId: 'p1', authorName: 'A', score: 8, createdAt: 1000 },
      p2: { participantId: 'p2', authorName: 'B', score: 7, createdAt: 1001 },
      p3: { participantId: 'p3', authorName: 'C', score: 7, createdAt: 1002 },
    };
    // (8 + 7 + 7) / 3 = 22 / 3 = 7.3333... -> 7.3
    expect(calculatePeerAverage(grades2)).toBe(7.3);
  });

  it('canStudentGrade: chặn tự chấm bài của chính mình và chặn chấm bài chưa duyệt', () => {
    const mockState: BoardState = {
      config: {
        title: 'Bảng Tương Tác',
        prompt: 'Thảo luận',
        maxGrade: 10,
        allowDraw: true,
        allowImage: true,
        allowComments: true,
        allowReactions: true,
        allowPeerGrades: true,
        requireApproval: true,
        anonymousMode: false,
      },
      status: 'accepting',
      isGlobalMuted: false,
      mutedParticipants: [],
      posts: {},
      startedAt: 1000,
    };

    const myPost: BoardPost = {
      id: 'p1',
      participantId: 'p1',
      authorName: 'Học sinh 1',
      color: 'yellow',
      text: 'Bài làm của tôi',
      status: 'approved',
      likes: [],
      hearts: [],
      peerGrades: {},
      peerAverageScore: null,
      comments: [],
      teacherGrade: null,
      rankAward: null,
      isSpotlight: false,
      isPinned: false,
      createdAt: 1000,
    };

    // Tự chấm điểm chính mình -> không cho phép
    const resSelf = canStudentGrade(mockState, 'p1', myPost, 9);
    expect(resSelf.ok).toBe(false);
    expect(resSelf.reason).toContain('tự chấm điểm');

    // Chấm điểm bài bạn khác nhưng bài chưa duyệt -> không cho phép
    const unapprovedPost: BoardPost = { ...myPost, participantId: 'p2', status: 'pending' };
    const resUnapproved = canStudentGrade(mockState, 'p1', unapprovedPost, 8);
    expect(resUnapproved.ok).toBe(false);

    // Chấm điểm bài bạn khác đã duyệt với điểm hợp lệ -> cho phép
    const approvedPost: BoardPost = { ...myPost, participantId: 'p2', status: 'approved' };
    const resValid = canStudentGrade(mockState, 'p1', approvedPost, 9.5);
    expect(resValid.ok).toBe(true);

    // Điểm vượt quá thang tối đa (11 > 10) -> không cho phép
    const resOver = canStudentGrade(mockState, 'p1', approvedPost, 11);
    expect(resOver.ok).toBe(false);
  });

  it('canStudentComment: kiểm tra khóa chat toàn lớp và cấm chat cá nhân', () => {
    const baseState: BoardState = {
      config: {
        title: 'Bảng Tương Tác',
        prompt: 'Thảo luận',
        maxGrade: 10,
        allowDraw: true,
        allowImage: true,
        allowComments: true,
        allowReactions: true,
        allowPeerGrades: true,
        requireApproval: true,
        anonymousMode: false,
      },
      status: 'accepting',
      isGlobalMuted: false,
      mutedParticipants: ['bad_student'],
      posts: {},
      startedAt: 1000,
    };

    // Học sinh bình thường -> được bình luận
    expect(canStudentComment(baseState, 'good_student').ok).toBe(true);

    // Học sinh bị cấm chat -> không được bình luận
    expect(canStudentComment(baseState, 'bad_student').ok).toBe(false);

    // Cả lớp bị khóa chat -> không ai được bình luận
    const mutedAllState: BoardState = { ...baseState, isGlobalMuted: true };
    expect(canStudentComment(mutedAllState, 'good_student').ok).toBe(false);
  });

  it('maskStateForStudent: che nội dung nếu học sinh chưa nộp bài, mở khóa khi đã nộp', () => {
    const fullState: BoardState = {
      config: {
        title: 'Bảng Tương Tác',
        prompt: 'Thảo luận',
        maxGrade: 10,
        allowDraw: true,
        allowImage: true,
        allowComments: true,
        allowReactions: true,
        allowPeerGrades: true,
        requireApproval: true,
        anonymousMode: false,
      },
      status: 'accepting',
      isGlobalMuted: false,
      mutedParticipants: [],
      posts: {
        p2: {
          id: 'p2',
          participantId: 'p2',
          authorName: 'Bạn B',
          color: 'blue',
          text: 'Bí mật bài giải 123',
          imageUrl: '/assets/sample.png',
          status: 'approved',
          likes: ['p3'],
          hearts: [],
          peerGrades: {
            p3: { participantId: 'p3', authorName: 'C', score: 9, createdAt: 1000 },
          },
          peerAverageScore: 9,
          comments: [
            {
              id: 'c1',
              participantId: 'p3',
              authorName: 'C',
              isTeacher: false,
              content: 'Hay quá',
              createdAt: 1000,
            },
          ],
          teacherGrade: 9.5,
          rankAward: null,
          isSpotlight: false,
          isPinned: false,
          createdAt: 1000,
        },
      },
      startedAt: 1000,
    };

    // Học sinh p1 chưa nộp bài -> bài của bạn p2 bị che
    const masked = maskStateForStudent(fullState, 'p1');
    const maskedP2 = masked.posts['p2'];
    expect(maskedP2).toBeDefined();
    expect(maskedP2!.isLocked).toBe(true);
    expect(maskedP2!.text).toBe('');
    expect(maskedP2!.imageUrl).toBeUndefined();
    expect(maskedP2!.comments).toEqual([]);
    expect(maskedP2!.peerGrades).toEqual({}); // Che chi tiết người chấm

    // Giờ p1 đã nộp bài của mình
    const submittedState: BoardState = {
      ...fullState,
      posts: {
        ...fullState.posts,
        p1: {
          id: 'p1',
          participantId: 'p1',
          authorName: 'Bạn A',
          color: 'yellow',
          text: 'Bài của A đã nộp',
          status: 'pending',
          likes: [],
          hearts: [],
          peerGrades: {},
          peerAverageScore: null,
          comments: [],
          teacherGrade: null,
          rankAward: null,
          isSpotlight: false,
          isPinned: false,
          createdAt: 2000,
        },
      },
    };

    // p1 xem lại -> bài của p2 được mở khóa hiển thị đầy đủ!
    const unmasked = maskStateForStudent(submittedState, 'p1');
    const unmaskedP2 = unmasked.posts['p2'];
    expect(unmaskedP2).toBeDefined();
    expect(unmaskedP2!.isLocked).toBe(false);
    expect(unmaskedP2!.text).toBe('Bí mật bài giải 123');
    expect(unmaskedP2!.imageUrl).toBe('/assets/sample.png');
    expect(unmaskedP2!.comments.length).toBe(1);
    expect(unmaskedP2!.peerGrades['p3']!.score).toBe(9);
  });
});

describe('Bảng Tương Tác - Xử Lý Activity Server', () => {
  const mockCtx: ActivityContext = {
    sessionId: 'sess_123',
    runId: 'run_123',
    now: () => 100000,
    rng: () => 0.5,
    broadcast: vi.fn(),
    sendToParticipant: vi.fn(),
    grantReward: vi.fn(),
  };

  const initialConfig: BoardConfig = {
    title: 'Bảng Thảo Luận',
    prompt: 'Nêu suy nghĩ của em về bảo vệ môi trường',
    maxGrade: 10,
    allowDraw: true,
    allowImage: true,
    allowComments: true,
    allowReactions: true,
    allowPeerGrades: true,
    requireApproval: true,
    anonymousMode: false,
  };

  it('Học sinh nộp bài -> Giáo viên duyệt -> Học sinh khác chấm điểm và thả tim', () => {
    // 1. Khởi tạo phiên
    let state = InteractiveBoardActivity.server.onStart(mockCtx, initialConfig);
    expect(state.status).toBe('accepting');

    // 2. Học sinh p1 nộp bài (chữ + màu)
    const submitRes = InteractiveBoardActivity.server.onStudentIntent(mockCtx, state, 'p1', {
      type: 'submit_post',
      text: 'Trồng thêm nhiều cây xanh',
      color: 'mint',
    });
    expect('ok' in submitRes).toBe(false);
    state = submitRes as BoardState;
    const postP1 = state.posts['p1'];
    expect(postP1).toBeDefined();
    expect(postP1!.status).toBe('pending'); // Cần GV duyệt
    expect(postP1!.color).toBe('mint');

    // 3. Giáo viên phê duyệt bài của p1
    state = InteractiveBoardActivity.server.onTeacherIntent(mockCtx, state, {
      type: 'approve_post',
      postId: 'p1',
    });
    expect(state.posts['p1']!.status).toBe('approved');

    // 4. Học sinh p2 thả tim bài của p1
    const reactRes = InteractiveBoardActivity.server.onStudentIntent(mockCtx, state, 'p2', {
      type: 'react_post',
      postId: 'p1',
      reaction: 'heart',
    });
    state = reactRes as BoardState;
    expect(state.posts['p1']!.hearts).toContain('p2');

    // 5. Học sinh p2 chấm 9 điểm cho bài của p1
    const gradeRes = InteractiveBoardActivity.server.onStudentIntent(mockCtx, state, 'p2', {
      type: 'grade_peer_post',
      postId: 'p1',
      score: 9,
    });
    state = gradeRes as BoardState;
    expect(state.posts['p1']!.peerGrades['p2']!.score).toBe(9);
    expect(state.posts['p1']!.peerAverageScore).toBe(9);

    // 6. Giáo viên chấm 10 điểm & trao giải Quán quân (Top 1)
    state = InteractiveBoardActivity.server.onTeacherIntent(mockCtx, state, {
      type: 'grade_post',
      postId: 'p1',
      grade: 10,
      feedback: 'Ý tưởng xuất sắc!',
    });
    state = InteractiveBoardActivity.server.onTeacherIntent(mockCtx, state, {
      type: 'award_rank',
      postId: 'p1',
      rank: 'top1',
    });
    expect(state.posts['p1']!.teacherGrade).toBe(10);
    expect(state.posts['p1']!.rankAward).toBe('top1');

    // 7. Kết thúc phiên và tính thưởng EXP
    const results = InteractiveBoardActivity.server.onEnd(mockCtx, state);
    expect(results.length).toBe(1);
    const resP1 = results[0]!;
    expect(resP1.participantId).toBe('p1');
    expect(resP1.rankAward).toBe('top1');
    expect(resP1.expEarned).toBeGreaterThanOrEqual(80); // 10 (submit) + 20 (>=8đ) + 50 (top1)
    expect(mockCtx.grantReward).toHaveBeenCalledWith('p1', 'submit', 10);
    expect(mockCtx.grantReward).toHaveBeenCalledWith('p1', 'grade_excellent', 20);
    expect(mockCtx.grantReward).toHaveBeenCalledWith('p1', 'top3', 50);
  });
});
