import { z } from 'zod';

/**
 * Màu nền của thẻ ghi chú trên Bảng Tương Tác
 */
export const BoardColorSchema = z.enum(['yellow', 'mint', 'blue', 'pink', 'purple']);
export type BoardColor = z.infer<typeof BoardColorSchema>;

/**
 * 2 loại phản hồi cảm xúc duy nhất: Thích (👍) và Thả tim (❤️)
 */
export const BoardReactionTypeSchema = z.enum(['like', 'heart']);
export type BoardReactionType = z.infer<typeof BoardReactionTypeSchema>;

/**
 * Đánh giá / Chấm điểm từ bạn học (Peer Grade)
 * Lưu rõ ràng danh tính người chấm và điểm số để học sinh bấm vào xem chi tiết
 */
export const PeerGradeSchema = z.object({
  participantId: z.string(),
  authorName: z.string(),
  score: z.number().min(0),
  createdAt: z.number(),
});
export type PeerGrade = z.infer<typeof PeerGradeSchema>;

/**
 * Bình luận / Góp ý trên bài làm của học sinh
 * Luôn gắn kèm danh tính học sinh hoặc huy hiệu Giáo viên
 */
export const BoardCommentSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  authorName: z.string(),
  isTeacher: z.boolean().default(false),
  content: z.string().min(1, 'Nội dung nhận xét không được để trống').max(500, 'Tối đa 500 ký tự'),
  createdAt: z.number(),
});
export type BoardComment = z.infer<typeof BoardCommentSchema>;

/**
 * Thẻ bài đăng của học sinh trên Bảng Tương Tác
 */
export const BoardPostSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  authorName: z.string(),
  studentCode: z.string().optional(),
  color: BoardColorSchema.default('yellow'),
  text: z.string().default(''),
  drawingDataUrl: z.string().optional(), // Chuỗi ảnh nét vẽ tay (PNG / Base64)
  imageUrl: z.string().optional(), // Đường dẫn ảnh chụp vở hoặc tài liệu tải lên
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  rejectionReason: z.string().optional(),

  // Cảm xúc & Bình luận
  likes: z.array(z.string()).default([]), // Danh sách participantId đã bấm 👍
  hearts: z.array(z.string()).default([]), // Danh sách participantId đã bấm ❤️
  comments: z.array(BoardCommentSchema).default([]),

  // Chấm điểm từ bạn học (Peer Grading)
  peerGrades: z.record(PeerGradeSchema).default({}), // key: participantId người chấm
  peerAverageScore: z.number().nullable().default(null), // Điểm trung bình cộng

  // Đánh giá từ Giáo viên
  teacherGrade: z.number().nullable().default(null),
  teacherFeedback: z.string().optional(),
  rankAward: z.enum(['top1', 'top2', 'top3', 'creative']).nullable().optional().default(null),

  // Điều phối & Trình chiếu
  isSpotlight: z.boolean().default(false), // Phóng to trung tâm trên màn chiếu
  isPinned: z.boolean().default(false), // Ghim đầu bảng

  createdAt: z.number(),
  updatedAt: z.number().optional(),

  // Thuộc tính che nội dung (Server-side Gating) khi học sinh chưa nộp bài
  isLocked: z.boolean().optional(),

  // Kết quả làm Phiếu học tập (nếu Bảng tương tác bật chế độ Worksheet)
  worksheetResult: z
    .object({
      autoScore: z.number().default(0),
      maxScore: z.number().default(10),
      correctCount: z.number().default(0),
      totalCount: z.number().default(0),
      answers: z.record(z.unknown()).default({}),
    })
    .optional(),
});
export type BoardPost = z.infer<typeof BoardPostSchema>;

/**
 * Cấu hình Phiếu học tập đính kèm Bảng Tương Tác
 */
export const BoardWorksheetConfigSchema = z.object({
  enabled: z.boolean().default(false),
  questionSetId: z.string().optional(),
  questionSetTitle: z.string().optional(),
  questions: z.array(z.record(z.string(), z.unknown())).default([]),
});
export type BoardWorksheetConfig = z.infer<typeof BoardWorksheetConfigSchema>;

/**
 * Cấu hình đợt hoạt động Bảng Tương Tác từ Giáo viên
 */
export const BoardConfigSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').default('Bảng Tương Tác Lớp Học'),
  prompt: z.string().min(1, 'Chủ đề / Đề bài không được để trống'),
  maxGrade: z.number().min(1).max(100).default(10), // Thang điểm tối đa (10 hoặc 100)
  allowDraw: z.boolean().default(true), // Cho phép nét vẽ tay
  allowImage: z.boolean().default(true), // Cho phép chụp / tải ảnh
  allowComments: z.boolean().default(true), // Cho phép bình luận, nhận xét
  allowReactions: z.boolean().default(true), // Cho phép thả tim, thích
  allowPeerGrades: z.boolean().default(true), // Cho phép học sinh chấm điểm lẫn nhau
  requireApproval: z.boolean().default(true), // Duyệt bài trước khi hiển thị cho cả lớp
  anonymousMode: z.boolean().default(false), // Chế độ ẩn danh (nếu cần)
  worksheet: BoardWorksheetConfigSchema.optional(), // Phiếu bài tập kèm theo (nếu có)
});
export type BoardConfig = z.infer<typeof BoardConfigSchema>;

/**
 * Trạng thái thời gian thực của Bảng Tương Tác (Server State)
 */
export const BoardStateSchema = z.object({
  config: BoardConfigSchema,
  status: z.enum(['accepting', 'discussion_only', 'ended']).default('accepting'),
  isGlobalMuted: z.boolean().default(false), // Cấm bình luận toàn lớp
  mutedParticipants: z.array(z.string()).default([]), // Danh sách học sinh bị cấm bình luận
  posts: z.record(BoardPostSchema).default({}), // Key: postId (thường là participantId)
  startedAt: z.number(),
});
export type BoardState = z.infer<typeof BoardStateSchema>;

/**
 * Ý định từ phía Học sinh (Student Intent)
 */
export const BoardStudentIntentSchema = z.discriminatedUnion('type', [
  // 1. Nộp bài hoặc cập nhật bài làm
  z.object({
    type: z.literal('submit_post'),
    text: z.string().default(''),
    drawingDataUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    color: BoardColorSchema.default('yellow'),
    authorName: z.string().optional(),
    worksheetAnswers: z.record(z.unknown()).optional(),
  }),
  // 2. Thả cảm xúc (Thích hoặc Thả tim)
  z.object({
    type: z.literal('react_post'),
    postId: z.string(),
    reaction: BoardReactionTypeSchema,
  }),
  // 3. Gửi bình luận nhận xét bài của bạn
  z.object({
    type: z.literal('add_comment'),
    postId: z.string(),
    content: z.string().min(1).max(500),
    authorName: z.string().optional(),
  }),
  // 4. Chấm điểm bài làm của bạn học
  z.object({
    type: z.literal('grade_peer_post'),
    postId: z.string(),
    score: z.number().min(0),
    feedback: z.string().optional(),
    authorName: z.string().optional(),
  }),
]);
export type BoardStudentIntent = z.infer<typeof BoardStudentIntentSchema>;

/**
 * Ý định từ phía Giáo viên (Teacher Intent)
 */
export const BoardTeacherIntentSchema = z.discriminatedUnion('type', [
  // Phê duyệt 1 bài
  z.object({
    type: z.literal('approve_post'),
    postId: z.string(),
  }),
  // Phê duyệt tất cả các bài đang chờ
  z.object({
    type: z.literal('approve_all'),
  }),
  // Từ chối bài (yêu cầu làm lại)
  z.object({
    type: z.literal('reject_post'),
    postId: z.string(),
    reason: z.string().optional(),
  }),
  // Xóa bài đăng rác / vi phạm
  z.object({
    type: z.literal('delete_post'),
    postId: z.string(),
  }),
  // Xóa 1 bình luận vi phạm
  z.object({
    type: z.literal('delete_comment'),
    postId: z.string(),
    commentId: z.string(),
  }),
  // Giáo viên viết nhận xét nổi bật
  z.object({
    type: z.literal('teacher_comment'),
    postId: z.string(),
    content: z.string().min(1).max(500),
  }),
  // Giáo viên chấm điểm bài làm
  z.object({
    type: z.literal('grade_post'),
    postId: z.string(),
    grade: z.number().min(0),
    feedback: z.string().optional(),
  }),
  // Giáo viên vinh danh xếp hạng
  z.object({
    type: z.literal('award_rank'),
    postId: z.string(),
    rank: z.enum(['top1', 'top2', 'top3', 'creative']).nullable(),
  }),
  // Bật/tắt chiếu Spotlight lên màn chiếu lớn
  z.object({
    type: z.literal('toggle_spotlight'),
    postId: z.string(),
  }),
  // Ghim bài lên đầu
  z.object({
    type: z.literal('toggle_pin'),
    postId: z.string(),
  }),
  // Cấm/Bỏ cấm bình luận 1 học sinh
  z.object({
    type: z.literal('toggle_mute_student'),
    participantId: z.string(),
  }),
  // Khóa/Mở bình luận toàn lớp
  z.object({
    type: z.literal('toggle_global_mute'),
    isMuted: z.boolean().optional(),
  }),
  // Thay đổi trạng thái hoạt động (nhận bài, chỉ thảo luận, kết thúc)
  z.object({
    type: z.literal('toggle_status'),
    status: z.enum(['accepting', 'discussion_only', 'ended']),
  }),
]);
export type BoardTeacherIntent = z.infer<typeof BoardTeacherIntentSchema>;

/**
 * Kết quả tổng kết hoạt động cho từng học sinh
 */
export const BoardStudentResultSchema = z.object({
  participantId: z.string(),
  studentName: z.string(),
  hasPost: z.boolean(),
  status: z.enum(['pending', 'approved', 'rejected', 'none']),
  likesCount: z.number().default(0),
  heartsCount: z.number().default(0),
  peerAverageScore: z.number().nullable().default(null),
  peerGradesCount: z.number().default(0),
  teacherGrade: z.number().nullable().default(null),
  rankAward: z.enum(['top1', 'top2', 'top3', 'creative']).nullable().default(null),
  expEarned: z.number().default(0),
});
export type BoardStudentResult = z.infer<typeof BoardStudentResultSchema>;
