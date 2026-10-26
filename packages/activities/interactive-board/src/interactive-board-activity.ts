import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  type BoardConfig,
  BoardConfigSchema,
  type BoardPost,
  type BoardState,
  BoardStateSchema,
  type BoardStudentResult,
  BoardStudentResultSchema,
  BoardStudentIntentSchema,
  BoardTeacherIntentSchema,
} from '@educlass/protocol';
import {
  calculatePeerAverage,
  canStudentComment,
  canStudentGrade,
} from './interactive-board-logic.js';
import { gradeQuestion, type Question, type StudentAnswer } from '@educlass/question-kit';

export const InteractiveBoardActivity: ActivityDefinition<
  BoardConfig,
  BoardState,
  BoardStudentResult
> = {
  id: 'interactive-board',
  name: 'Bảng Tương Tác',
  version: 1,
  icon: '📌',
  description:
    'Bảng cộng tác và triển lãm sản phẩm học tập: chữ, nét vẽ tay, hình ảnh, chấm điểm chéo, kiểm duyệt và thưởng EXP',
  capabilities: ['screen', 'files'],
  rewardTriggers: ['submit', 'approved', 'grade_excellent', 'top3', 'popular', 'top_reviewer'],
  configSchema: BoardConfigSchema,
  stateSchema: BoardStateSchema,
  resultSchema: BoardStudentResultSchema,

  server: {
    /**
     * Khởi tạo trạng thái ban đầu của Bảng Tương Tác
     */
    onStart(ctx: ActivityContext, cfg: BoardConfig): BoardState {
      return {
        config: {
          title: cfg.title || 'Bảng Tương Tác Lớp Học',
          prompt: cfg.prompt || '',
          maxGrade: cfg.maxGrade ?? 10,
          allowDraw: cfg.allowDraw ?? true,
          allowImage: cfg.allowImage ?? true,
          allowComments: cfg.allowComments ?? true,
          allowReactions: cfg.allowReactions ?? true,
          allowPeerGrades: cfg.allowPeerGrades ?? true,
          requireApproval: cfg.requireApproval ?? true,
          anonymousMode: cfg.anonymousMode ?? false,
          worksheet: cfg.worksheet,
        },
        status: 'accepting',
        isGlobalMuted: false,
        mutedParticipants: [],
        posts: {},
        startedAt: ctx.now(),
      };
    },

    /**
     * Xử lý các tương tác gửi lên từ Học sinh
     */
    onStudentIntent(
      ctx: ActivityContext,
      st: BoardState,
      participantId: string,
      intent: unknown
    ): BoardState | ActivityReject {
      // 1. Kiểm tra trạng thái hoạt động
      if (st.status === 'ended') {
        return {
          ok: false,
          reason: 'Bảng tương tác đã kết thúc, không thể thực hiện thêm thao tác',
          code: 'ACTIVITY_ENDED',
        };
      }

      // 2. Parse dữ liệu intent
      const parsed = BoardStudentIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          reason: 'Dữ liệu tương tác không đúng định dạng',
          code: 'INVALID_INTENT',
        };
      }

      const intentData = parsed.data;
      const now = ctx.now();

      // [A] Nộp bài hoặc chỉnh sửa bài làm
      if (intentData.type === 'submit_post') {
        if (st.status === 'discussion_only') {
          return {
            ok: false,
            reason: 'Giáo viên đã dừng nhận bài nộp mới để chuyển sang giai đoạn thảo luận',
            code: 'SUBMISSION_CLOSED',
          };
        }

        const existingPost = st.posts[participantId];

        // Tự động chấm điểm Phiếu học tập (nếu Bảng tương tác bật chế độ Worksheet)
        let worksheetResult: BoardPost['worksheetResult'] = existingPost?.worksheetResult;
        if (
          st.config.worksheet?.enabled &&
          Array.isArray(st.config.worksheet.questions) &&
          st.config.worksheet.questions.length > 0
        ) {
          const submittedAnswers = intentData.worksheetAnswers || {};
          let totalEarned = 0;
          let totalPossible = 0;
          let correctCount = 0;
          const questions = st.config.worksheet.questions as unknown as Question[];

          for (const q of questions) {
            totalPossible += q.points || 10;
            const ansData = submittedAnswers[q.id];
            let answerPayload: StudentAnswer | null = null;
            if (ansData !== undefined && ansData !== null) {
              if (q.type === 'mcq4') {
                const selected =
                  typeof ansData === 'number'
                    ? ansData
                    : (ansData as { selected?: number | null }).selected ?? null;
                answerPayload = { type: 'mcq4', questionId: q.id, selected };
              } else if (q.type === 'tf') {
                const selected =
                  typeof ansData === 'boolean'
                    ? ansData
                    : (ansData as { selected?: boolean | null }).selected ?? null;
                answerPayload = { type: 'tf', questionId: q.id, selected };
              } else if (q.type === 'matching') {
                const pairs =
                  typeof ansData === 'object' && ansData !== null && 'pairs' in ansData
                    ? (ansData as { pairs: Record<string, string | null> }).pairs
                    : (ansData as Record<string, string | null>);
                answerPayload = { type: 'matching', questionId: q.id, pairs: pairs || {} };
              } else if (q.type === 'cloze_drag') {
                const filled =
                  typeof ansData === 'object' && ansData !== null && 'filled' in ansData
                    ? (ansData as { filled: Record<string, string | null> }).filled
                    : (ansData as Record<string, string | null>);
                answerPayload = { type: 'cloze_drag', questionId: q.id, filled: filled || {} };
              } else {
                answerPayload = {
                  type: q.type,
                  questionId: q.id,
                  ...(typeof ansData === 'object' ? ansData : {}),
                } as StudentAnswer;
              }
            }
            const res = gradeQuestion(q, answerPayload);
            totalEarned += res.pointsEarned;
            if (res.isCorrect) {
              correctCount++;
            }
          }

          const maxGrade = st.config.maxGrade || 10;
          const scaledScore =
            totalPossible > 0
              ? Number(((totalEarned / totalPossible) * maxGrade).toFixed(1))
              : 0;

          worksheetResult = {
            autoScore: scaledScore,
            maxScore: maxGrade,
            correctCount,
            totalCount: questions.length,
            answers: submittedAnswers,
          };
        }

        const newPost: BoardPost = {
          id: existingPost?.id || participantId,
          participantId,
          authorName: intentData.authorName || existingPost?.authorName || 'Học sinh',
          studentCode: existingPost?.studentCode,
          color: intentData.color,
          text: intentData.text.trim(),
          drawingDataUrl: intentData.drawingDataUrl ?? existingPost?.drawingDataUrl,
          imageUrl: intentData.imageUrl ?? existingPost?.imageUrl,
          worksheetResult,
          status: st.config.requireApproval ? 'pending' : 'approved',
          rejectionReason: undefined,
          likes: existingPost?.likes || [],
          hearts: existingPost?.hearts || [],
          peerGrades: existingPost?.peerGrades || {},
          peerAverageScore: existingPost?.peerAverageScore ?? null,
          comments: existingPost?.comments || [],
          teacherGrade: existingPost?.teacherGrade ?? null,
          teacherFeedback: existingPost?.teacherFeedback,
          rankAward: existingPost?.rankAward ?? null,
          isSpotlight: existingPost?.isSpotlight ?? false,
          isPinned: existingPost?.isPinned ?? false,
          createdAt: existingPost?.createdAt || now,
          updatedAt: now,
        };

        return {
          ...st,
          posts: {
            ...st.posts,
            [participantId]: newPost,
          },
        };
      }

      // [B] Thả cảm xúc (Thích 👍 hoặc Thả tim ❤️)
      if (intentData.type === 'react_post') {
        if (!st.config.allowReactions) {
          return { ok: false, reason: 'Tính năng thả cảm xúc đang bị tắt', code: 'FEATURE_DISABLED' };
        }

        const post = st.posts[intentData.postId];
        if (!post || post.status !== 'approved') {
          return { ok: false, reason: 'Không tìm thấy bài viết hợp lệ', code: 'POST_NOT_FOUND' };
        }

        const isHeart = intentData.reaction === 'heart';
        const targetList = isHeart ? [...post.hearts] : [...post.likes];
        const existingIdx = targetList.indexOf(participantId);

        if (existingIdx >= 0) {
          targetList.splice(existingIdx, 1); // Bấm lần 2 -> Hủy
        } else {
          targetList.push(participantId);
        }

        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              hearts: isHeart ? targetList : post.hearts,
              likes: isHeart ? post.likes : targetList,
            },
          },
        };
      }

      // [C] Bình luận nhận xét bài bạn bè
      if (intentData.type === 'add_comment') {
        const check = canStudentComment(st, participantId);
        if (!check.ok) {
          return { ok: false, reason: check.reason || 'Không thể bình luận', code: 'COMMENT_MUTED' };
        }

        const post = st.posts[intentData.postId];
        if (!post || post.status !== 'approved') {
          return { ok: false, reason: 'Không tìm thấy bài viết hợp lệ', code: 'POST_NOT_FOUND' };
        }

        const newComment = {
          id: `${now}_${Math.random().toString(36).slice(2, 7)}`,
          participantId,
          authorName: intentData.authorName || 'Học sinh',
          isTeacher: false,
          content: intentData.content.trim(),
          createdAt: now,
        };

        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              comments: [...post.comments, newComment],
            },
          },
        };
      }

      // [D] Chấm điểm bài làm của bạn học (Peer Grading)
      if (intentData.type === 'grade_peer_post') {
        const post = st.posts[intentData.postId];
        if (!post) {
          return { ok: false, reason: 'Không tìm thấy bài viết để chấm điểm', code: 'POST_NOT_FOUND' };
        }

        const check = canStudentGrade(st, participantId, post, intentData.score);
        if (!check.ok) {
          return { ok: false, reason: check.reason || 'Không thể chấm điểm', code: 'INVALID_GRADE' };
        }

        const updatedPeerGrades = {
          ...post.peerGrades,
          [participantId]: {
            participantId,
            authorName: intentData.authorName || 'Bạn học',
            score: intentData.score,
            createdAt: now,
          },
        };

        const peerAverageScore = calculatePeerAverage(updatedPeerGrades);

        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              peerGrades: updatedPeerGrades,
              peerAverageScore,
            },
          },
        };
      }

      return st;
    },

    /**
     * Xử lý các quyền kiểm duyệt & điều phối của Giáo viên
     */
    onTeacherIntent(ctx: ActivityContext, st: BoardState, intent: unknown): BoardState {
      const parsed = BoardTeacherIntentSchema.safeParse(intent);
      if (!parsed.success) {
        return st;
      }

      const intentData = parsed.data;
      const now = ctx.now();

      // [1] Duyệt bài
      if (intentData.type === 'approve_post') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              status: 'approved',
              rejectionReason: undefined,
            },
          },
        };
      }

      // [2] Duyệt tất cả các bài đang chờ
      if (intentData.type === 'approve_all') {
        const updatedPosts: Record<string, BoardPost> = {};
        for (const [id, post] of Object.entries(st.posts)) {
          if (post.status === 'pending') {
            updatedPosts[id] = { ...post, status: 'approved', rejectionReason: undefined };
          } else {
            updatedPosts[id] = post;
          }
        }
        return { ...st, posts: updatedPosts };
      }

      // [3] Từ chối bài viết
      if (intentData.type === 'reject_post') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              status: 'rejected',
              rejectionReason: intentData.reason,
            },
          },
        };
      }

      // [4] Xóa bài đăng
      if (intentData.type === 'delete_post') {
        const remaining = { ...st.posts };
        delete remaining[intentData.postId];
        return { ...st, posts: remaining };
      }

      // [5] Xóa bình luận vi phạm
      if (intentData.type === 'delete_comment') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              comments: post.comments.filter(c => c.id !== intentData.commentId),
            },
          },
        };
      }

      // [6] Giáo viên bình luận nhận xét nổi bật
      if (intentData.type === 'teacher_comment') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        const comment = {
          id: `t_${now}_${Math.random().toString(36).slice(2, 6)}`,
          participantId: 'teacher',
          authorName: 'Giáo viên',
          isTeacher: true,
          content: intentData.content.trim(),
          createdAt: now,
        };
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              comments: [...post.comments, comment],
            },
          },
        };
      }

      // [7] Giáo viên cho điểm
      if (intentData.type === 'grade_post') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              teacherGrade: intentData.grade,
              teacherFeedback: intentData.feedback,
            },
          },
        };
      }

      // [8] Trao xếp hạng danh hiệu
      if (intentData.type === 'award_rank') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              rankAward: intentData.rank,
            },
          },
        };
      }

      // [9] Spotlight (phóng to trung tâm trên máy chiếu)
      if (intentData.type === 'toggle_spotlight') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        const willBeSpotlight = !post.isSpotlight;
        const updatedPosts: Record<string, BoardPost> = {};
        for (const [id, p] of Object.entries(st.posts)) {
          updatedPosts[id] = {
            ...p,
            isSpotlight: id === intentData.postId ? willBeSpotlight : false,
          };
        }
        return { ...st, posts: updatedPosts };
      }

      // [10] Ghim bài lên đầu
      if (intentData.type === 'toggle_pin') {
        const post = st.posts[intentData.postId];
        if (!post) return st;
        return {
          ...st,
          posts: {
            ...st.posts,
            [intentData.postId]: {
              ...post,
              isPinned: !post.isPinned,
            },
          },
        };
      }

      // [11] Cấm/Bỏ cấm bình luận 1 học sinh
      if (intentData.type === 'toggle_mute_student') {
        const pId = intentData.participantId;
        const isMuted = st.mutedParticipants.includes(pId);
        return {
          ...st,
          mutedParticipants: isMuted
            ? st.mutedParticipants.filter(id => id !== pId)
            : [...st.mutedParticipants, pId],
        };
      }

      // [12] Khóa bình luận toàn lớp
      if (intentData.type === 'toggle_global_mute') {
        const nextState = intentData.isMuted ?? !st.isGlobalMuted;
        return {
          ...st,
          isGlobalMuted: nextState,
        };
      }

      // [13] Thay đổi trạng thái nhận bài
      if (intentData.type === 'toggle_status') {
        return {
          ...st,
          status: intentData.status,
        };
      }

      return st;
    },

    /**
     * Tổng kết hoạt động và tính thưởng EXP khi giáo viên kết thúc
     */
    onEnd(ctx: ActivityContext, st: BoardState): BoardStudentResult[] {
      const results: BoardStudentResult[] = [];

      // Tìm bài được yêu thích nhất (nhiều tim + like nhất)
      let maxReactions = 0;
      let mostPopularPostId: string | null = null;
      for (const [id, post] of Object.entries(st.posts)) {
        if (post.status === 'approved') {
          const totalReactions = post.likes.length + post.hearts.length;
          if (totalReactions > maxReactions) {
            maxReactions = totalReactions;
            mostPopularPostId = id;
          }
        }
      }

      // Đếm số lượt mỗi học sinh đã chấm điểm cho bạn
      const peerGradingCounts: Record<string, number> = {};
      for (const post of Object.values(st.posts)) {
        for (const reviewerId of Object.keys(post.peerGrades)) {
          peerGradingCounts[reviewerId] = (peerGradingCounts[reviewerId] || 0) + 1;
        }
      }

      for (const [pId, post] of Object.entries(st.posts)) {
        let exp = 0;

        // 1. Thưởng nộp bài được phê duyệt
        if (post.status === 'approved') {
          exp += 10;
          void ctx.grantReward(pId, 'submit', 10);
        }

        // 2. Thưởng bài đạt điểm giỏi từ giáo viên
        if (post.teacherGrade !== null && post.teacherGrade >= 8.0) {
          exp += 20;
          void ctx.grantReward(pId, 'grade_excellent', 20);
        }

        // 3. Thưởng danh hiệu Top
        if (post.rankAward === 'top1') {
          exp += 50;
          void ctx.grantReward(pId, 'top3', 50);
        } else if (post.rankAward === 'top2') {
          exp += 30;
          void ctx.grantReward(pId, 'top3', 30);
        } else if (post.rankAward === 'top3') {
          exp += 20;
          void ctx.grantReward(pId, 'top3', 20);
        } else if (post.rankAward === 'creative') {
          exp += 15;
          void ctx.grantReward(pId, 'top3', 15);
        }

        // 4. Thưởng bài được yêu thích nhất
        if (mostPopularPostId && mostPopularPostId === pId && maxReactions > 0) {
          exp += 15;
          void ctx.grantReward(pId, 'popular', 15);
        }

        // 5. Thưởng tham gia chấm điểm tích cực cho bạn bè
        const reviewedCount = peerGradingCounts[pId] || 0;
        if (reviewedCount >= 3) {
          exp += 10;
          void ctx.grantReward(pId, 'top_reviewer', 10);
        }

        results.push({
          participantId: pId,
          studentName: post.authorName,
          hasPost: true,
          status: post.status,
          likesCount: post.likes.length,
          heartsCount: post.hearts.length,
          peerAverageScore: post.peerAverageScore,
          peerGradesCount: Object.keys(post.peerGrades).length,
          teacherGrade: post.teacherGrade,
          rankAward: post.rankAward,
          expEarned: exp,
        });
      }

      return results;
    },
  },
};
