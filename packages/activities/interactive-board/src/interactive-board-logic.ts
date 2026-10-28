import type { BoardPost, BoardState, PeerGrade } from '@educlass/protocol';

/**
 * Tính điểm trung bình cộng do học sinh khác chấm (Peer Average Score)
 * Làm tròn 1 chữ số thập phân, trả về null nếu chưa có ai chấm
 */
export function calculatePeerAverage(peerGrades: Record<string, PeerGrade>): number | null {
  const grades = Object.values(peerGrades);
  if (grades.length === 0) {
    return null;
  }
  const sum = grades.reduce((acc, curr) => acc + curr.score, 0);
  return Math.round((sum / grades.length) * 10) / 10;
}

/**
 * Kiểm tra quyền bình luận / nhận xét của học sinh
 */
export function canStudentComment(
  state: BoardState,
  participantId: string
): { ok: boolean; reason?: string } {
  if (!state.config.allowComments) {
    return { ok: false, reason: 'Giáo viên hiện đang tắt tính năng bình luận' };
  }
  if (state.isGlobalMuted) {
    return { ok: false, reason: 'Giáo viên đã tạm khóa bình luận của cả lớp' };
  }
  if (state.mutedParticipants.includes(participantId)) {
    return { ok: false, reason: 'Bạn đang bị giáo viên tạm khóa tính năng bình luận' };
  }
  return { ok: true };
}

/**
 * Kiểm tra tính hợp lệ khi học sinh chấm điểm bài của bạn (Peer Grading)
 */
export function canStudentGrade(
  state: BoardState,
  participantId: string,
  targetPost: BoardPost,
  score: number
): { ok: boolean; reason?: string } {
  if (!state.config.allowPeerGrades) {
    return { ok: false, reason: 'Giáo viên hiện đang tắt tính năng chấm điểm chéo' };
  }
  if (targetPost.participantId === participantId) {
    return { ok: false, reason: 'Bạn không thể tự chấm điểm bài làm của chính mình' };
  }
  if (targetPost.status !== 'approved') {
    return { ok: false, reason: 'Chỉ có thể chấm điểm bài đã được giáo viên phê duyệt' };
  }
  if (typeof score !== 'number' || isNaN(score) || score < 0 || score > state.config.maxGrade) {
    return {
      ok: false,
      reason: `Điểm số phải từ 0 đến thang điểm tối đa (${state.config.maxGrade})`,
    };
  }
  return { ok: true };
}

/**
 * Cơ chế che nội dung phía Server (Server-side Content Gating):
 * - Học sinh chỉ xem được nội dung bài của các bạn sau khi chính mình đã nộp bài.
 * - Nếu chưa nộp bài: các bài khác bị che toàn bộ nội dung (text, ảnh, nét vẽ, bình luận),
 *   chỉ hiển thị khối thẻ bị khóa để kích thích học sinh tự giác nộp bài trước.
 */
export function maskStateForStudent(fullState: BoardState, participantId: string): BoardState {
  const myPost = fullState.posts[participantId];
  const hasSubmitted = Boolean(
    myPost && (myPost.text || myPost.imageUrl || myPost.drawingDataUrl || myPost.worksheetResult)
  );

  const filteredPosts: Record<string, BoardPost> = {};

  for (const [postId, post] of Object.entries(fullState.posts)) {
    // 1. Bài của chính học sinh này: luôn xem được đầy đủ (kể cả khi đang chờ duyệt)
    if (post.participantId === participantId) {
      filteredPosts[postId] = { ...post, isLocked: false };
      continue;
    }

    // 2. Bài của học sinh khác nhưng chưa được giáo viên duyệt: hoàn toàn không hiển thị
    if (post.status !== 'approved') {
      continue;
    }

    // 3. Nếu học sinh này ĐÃ NỘP BÀI: mở khóa hiển thị đầy đủ bài của bạn
    if (hasSubmitted) {
      filteredPosts[postId] = {
        ...post,
        authorName: fullState.config.anonymousMode ? 'Học sinh' : post.authorName,
        isLocked: false,
      };
      continue;
    }

    // 4. Nếu học sinh này CHƯA NỘP BÀI: che nội dung bài làm của bạn
    filteredPosts[postId] = {
      ...post,
      authorName: fullState.config.anonymousMode ? 'Học sinh' : post.authorName,
      text: '',
      drawingDataUrl: undefined,
      imageUrl: undefined,
      comments: [],
      peerGrades: {}, // Che chi tiết ai chấm mấy điểm cho đến khi mở khóa
      worksheetResult: undefined,
      isLocked: true,
    };
  }

  return {
    ...fullState,
    posts: filteredPosts,
  };
}
