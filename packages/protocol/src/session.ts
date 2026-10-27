import { z } from 'zod';
import {
  IdentityLevelSchema,
  IdentityModeSchema,
  ParticipantStatusSchema,
  SessionStatusSchema,
} from './enums.js';
import { AvatarConfigSchema } from './gamification.js';

/**
 * Các loại sự kiện kích hoạt chuyển trạng thái trong FSM của Session
 */
export const SessionFsmEventTypeSchema = z.enum([
  'INITIATE_CLOSING',
  'COMPLETE_CLOSING',
  'FORCE_CLOSE',
]);
export type SessionFsmEventType = z.infer<typeof SessionFsmEventTypeSchema>;

/**
 * Cấu hình phiên học dạng JSON
 */
export const SessionSettingsSchema = z.object({
  maxParticipants: z.number().int().positive().optional(),
  allowChat: z.boolean().default(true),
  allowLateJoin: z.boolean().default(true),
  allowPairing: z.boolean().optional(),
  maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
});
export type SessionSettings = z.infer<typeof SessionSettingsSchema>;

/**
 * DTO đại diện cho một Phiên học (Session)
 */
export const SessionDtoSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  classId: z.string().nullable().optional(),
  joinCode: z.string().length(6),
  status: SessionStatusSchema,
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  allowPairing: z.boolean().optional(),
  maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
  settings: SessionSettingsSchema.optional(),
  openedAt: z.number().int().positive(),
  closingAt: z.number().int().positive().nullable().optional(),
  closedAt: z.number().int().positive().nullable().optional(),
  closeReason: z.string().nullable().optional(),
});
export type SessionDto = z.infer<typeof SessionDtoSchema>;

/**
 * Yêu cầu mở phiên học mới
 */
export const CreateSessionRequestSchema = z
  .object({
    classId: z.string().min(1).nullable().optional(),
    identityMode: IdentityModeSchema,
    allowTeams: z.boolean().default(false),
    allowPairing: z.boolean().optional(),
    maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
    settings: SessionSettingsSchema.optional(),
  })
  .refine(
    (data) => {
      // Khi chọn chế độ roster_only thì bắt buộc phải có lớp học
      if (data.identityMode === 'roster_only' && !data.classId) {
        return false;
      }
      return true;
    },
    {
      message: 'Chế độ bắt buộc chọn tên (roster_only) yêu cầu phải chọn một lớp học.',
      path: ['classId'],
    }
  );
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

/**
 * Phản hồi chi tiết phiên học (kèm link và mã QR)
 */
export const SessionDetailResponseSchema = z.object({
  session: SessionDtoSchema,
  className: z.string().nullable().optional(),
  joinUrl: z.string().optional(),
  qrDataUrl: z.string().optional(),
});
export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;

/**
 * Phản hồi tra cứu thông tin phiên theo mã 6 ký tự
 */
export const JoinCodeLookupResponseSchema = z.object({
  sessionId: z.string().min(1),
  joinCode: z.string().length(6),
  status: SessionStatusSchema,
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  allowPairing: z.boolean().optional(),
  maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
  className: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
});
export type JoinCodeLookupResponse = z.infer<typeof JoinCodeLookupResponseSchema>;

/**
 * Danh sách các phiên đang mở trên toàn hệ thống LAN
 */
export const ActiveSessionItemSchema = z.object({
  id: z.string().min(1),
  joinCode: z.string().length(6),
  teacherName: z.string(),
  className: z.string().nullable().optional(),
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  allowPairing: z.boolean().optional(),
  maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
  openedAt: z.number().int().positive(),
});
export type ActiveSessionItem = z.infer<typeof ActiveSessionItemSchema>;

export const ActiveSessionsListResponseSchema = z.object({
  sessions: z.array(ActiveSessionItemSchema),
});
export type ActiveSessionsListResponse = z.infer<typeof ActiveSessionsListResponseSchema>;

/**
 * Từng học sinh trong danh sách lớp của phiên (cho màn chọn tên của HS)
 */
export const StudentRosterItemSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  code: z.string().optional(),
  hasPin: z.boolean(),
  isTaken: z.boolean(),
  isCompletedExam: z.boolean().optional(),
});
export type StudentRosterItem = z.infer<typeof StudentRosterItemSchema>;

/**
 * Phản hồi danh sách học sinh của phiên cho HS chọn
 */
export const SessionRosterResponseSchema = z.object({
  sessionId: z.string().min(1),
  className: z.string().nullable().optional(),
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  allowPairing: z.boolean().optional(),
  maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
  students: z.array(StudentRosterItemSchema),
});
export type SessionRosterResponse = z.infer<typeof SessionRosterResponseSchema>;

/**
 * DTO đại diện cho một người tham gia phiên (Participant)
 */
export const ParticipantDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  studentId: z.string().nullable().optional(),
  studentIds: z.array(z.string()).optional(),
  displayName: z.string().min(1),
  identityLevel: IdentityLevelSchema,
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  elo: z.number().int().optional(),
  status: ParticipantStatusSchema,
  joinedAt: z.number().int().positive(),
});
export type ParticipantDto = z.infer<typeof ParticipantDtoSchema>;

/**
 * Yêu cầu học sinh vào lớp (Student Join Request)
 */
export const StudentJoinRequestSchema = z
  .object({
    joinCode: z.string().length(6),
    studentId: z.string().min(1).optional(),
    studentIds: z.array(z.string().min(1)).optional(),
    nickname: z.string().min(1).max(50).optional(),
    pin: z.string().optional(),
    pins: z.record(z.string(), z.string()).optional(),
    teamName: z.string().min(1).max(30).optional(),
  })
  .refine(
    (data) => Boolean(data.studentId || (data.studentIds && data.studentIds.length > 0) || data.nickname),
    {
      message: 'Vui lòng chọn tên trong danh sách hoặc nhập nickname.',
      path: ['nickname'],
    }
  );
export type StudentJoinRequest = z.infer<typeof StudentJoinRequestSchema>;

/**
 * Phản hồi sau khi học sinh vào lớp thành công
 */
export const StudentJoinResponseSchema = z.object({
  participant: ParticipantDtoSchema,
  participantToken: z.string().min(1),
  session: z.object({
    id: z.string().min(1),
    joinCode: z.string().length(6),
    status: SessionStatusSchema,
    className: z.string().nullable().optional(),
    allowTeams: z.boolean(),
    allowPairing: z.boolean().optional(),
    maxStudentsPerDevice: z.number().int().min(2).max(3).optional(),
  }),
});
export type StudentJoinResponse = z.infer<typeof StudentJoinResponseSchema>;

/**
 * DTO cho Đội / Nhóm trong phiên học (Team)
 */
export const TeamDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  name: z.string().min(1),
  memberCount: z.number().int().nonnegative().default(0),
});
export type TeamDto = z.infer<typeof TeamDtoSchema>;

/**
 * Yêu cầu khôi phục kết nối / tham gia lại phiên (Resume/Reconnect)
 */
export const StudentResumeRequestSchema = z.object({
  participantToken: z.string().min(1),
});
export type StudentResumeRequest = z.infer<typeof StudentResumeRequestSchema>;

/**
 * Danh sách người tham gia phiên học (dành cho GV theo dõi online/offline)
 */
export const SessionParticipantsResponseSchema = z.object({
  sessionId: z.string().min(1),
  onlineCount: z.number().int().nonnegative(),
  offlineCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  participants: z.array(ParticipantDtoSchema),
});
export type SessionParticipantsResponse = z.infer<typeof SessionParticipantsResponseSchema>;

/**
 * Phản hồi khi giáo viên mở lại tên / ngắt kết nối một học sinh
 */
export const ReleaseParticipantResponseSchema = z.object({
  success: z.boolean(),
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  status: ParticipantStatusSchema,
});
export type ReleaseParticipantResponse = z.infer<typeof ReleaseParticipantResponseSchema>;

/**
 * Mục điểm số chi tiết của từng học sinh trong báo cáo phiên
 */
export const SessionStudentScoreItemSchema = z.object({
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  identityLevel: IdentityLevelSchema,
  teamName: z.string().nullable().optional(),
  score: z.number().default(0),
  correctCount: z.number().int().nonnegative().default(0),
  totalQuestions: z.number().int().nonnegative().default(0),
  accuracy: z.number().min(0).max(100).default(0),
  expEarned: z.number().int().nonnegative().default(0),
  rank: z.number().int().positive().default(1),
  avatar: AvatarConfigSchema.optional(),
});
export type SessionStudentScoreItem = z.infer<typeof SessionStudentScoreItemSchema>;

/**
 * Thống kê các câu hỏi có tỷ lệ học sinh làm sai cao trong phiên
 */
export const SessionDifficultQuestionItemSchema = z.object({
  questionId: z.string().min(1),
  activityId: z.string().min(1),
  activityName: z.string().default('Quiz'),
  stem: z.string().min(1),
  totalAttempts: z.number().int().nonnegative().default(0),
  correctCount: z.number().int().nonnegative().default(0),
  incorrectCount: z.number().int().nonnegative().default(0),
  errorRate: z.number().min(0).max(100).default(0),
});
export type SessionDifficultQuestionItem = z.infer<typeof SessionDifficultQuestionItemSchema>;

/**
 * Tóm tắt tổng quan kết quả học tập của phiên
 */
export const SessionReportSummarySchema = z.object({
  totalQuestions: z.number().int().nonnegative().default(0),
  averageScore: z.number().default(0),
  averageAccuracy: z.number().default(0),
  totalExpAwarded: z.number().int().nonnegative().default(0),
});
export type SessionReportSummary = z.infer<typeof SessionReportSummarySchema>;

/**
 * Thống kê Game hóa & Báo cáo tổng kết toàn lớp cho GV (Task 5.4)
 */
export const SessionGamificationSummarySchema = z.object({
  topPodium: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        participantId: z.string().min(1),
        displayName: z.string().min(1),
        score: z.number().default(0),
        expEarned: z.number().int().nonnegative().default(0),
        accuracy: z.number().default(0),
        identityLevel: IdentityLevelSchema,
        teamName: z.string().nullable().optional(),
        avatar: AvatarConfigSchema.optional(),
      })
    )
    .default([]),
  newTitlesAwarded: z
    .array(
      z.object({
        studentId: z.string().min(1),
        studentName: z.string().min(1),
        titleKey: z.string().min(1),
        titleName: z.string().min(1),
        iconKey: z.string().min(1),
      })
    )
    .default([]),
  identityStats: z
    .object({
      accountCount: z.number().int().nonnegative().default(0),
      rosterCount: z.number().int().nonnegative().default(0),
      guestCount: z.number().int().nonnegative().default(0),
      persistedExpTotal: z.number().int().nonnegative().default(0),
      unpersistedExpTotal: z.number().int().nonnegative().default(0),
    })
    .default({
      accountCount: 0,
      rosterCount: 0,
      guestCount: 0,
      persistedExpTotal: 0,
      unpersistedExpTotal: 0,
    }),
  rosterNeedingPin: z
    .array(
      z.object({
        studentId: z.string().nullable().optional(),
        displayName: z.string().min(1),
        expEarned: z.number().int().positive(),
      })
    )
    .default([]),
});
export type SessionGamificationSummary = z.infer<typeof SessionGamificationSummarySchema>;

/**
 * Tóm tắt kết quả một lần thi Quizizz trong phiên học
 */
export const QuizSummaryReportSchema = z.object({
  sessionId: z.string().min(1),
  sessionCode: z.string().optional(),
  className: z.string().nullable().optional(),
  runId: z.string().optional(),
  runIndex: z.number().int().positive().optional(),
  title: z.string().default('Quizizz Live'),
  totalQuestions: z.number().int().nonnegative().default(0),
  totalParticipants: z.number().int().nonnegative().default(0),
  averageScore: z.number().default(0),
  averageAccuracy: z.number().default(0),
  scoreboard: z.array(SessionStudentScoreItemSchema).default([]),
  difficultQuestions: z.array(SessionDifficultQuestionItemSchema).optional().default([]),
  startedAt: z.number().int().positive().optional(),
  endedAt: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
export type QuizSummaryReport = z.infer<typeof QuizSummaryReportSchema>;

export const QuizSummaryReportResponseSchema = z.object({
  summary: QuizSummaryReportSchema.nullable(),
});
export type QuizSummaryReportResponse = z.infer<typeof QuizSummaryReportResponseSchema>;

export const QuizRunsListResponseSchema = z.object({
  runs: z.array(QuizSummaryReportSchema),
});
export type QuizRunsListResponse = z.infer<typeof QuizRunsListResponseSchema>;

/**
 * Snapshot tổng kết phiên học khi đóng phiên (D10 / PLAN mục 3, Task 3.4 & Task 5.4)
 */
export const SessionReportSnapshotSchema = z.object({
  sessionId: z.string().min(1),
  sessionCode: z.string().length(6),
  className: z.string().nullable().optional(),
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  openedAt: z.number().int().positive(),
  closedAt: z.number().int().positive(),
  totalParticipants: z.number().int().nonnegative(),
  onlineParticipants: z.number().int().nonnegative(),
  offlineParticipants: z.number().int().nonnegative(),
  participants: z.array(
    z.object({
      id: z.string().min(1),
      studentId: z.string().nullable().optional(),
      displayName: z.string().min(1),
      identityLevel: IdentityLevelSchema,
      teamName: z.string().nullable().optional(),
      joinedAt: z.number().int().positive(),
      leftAt: z.number().int().positive().nullable().optional(),
      avatar: AvatarConfigSchema.optional(),
    })
  ),
  teams: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      memberCount: z.number().int().nonnegative(),
    })
  ),
  scoreboard: z.array(SessionStudentScoreItemSchema).optional().default([]),
  difficultQuestions: z.array(SessionDifficultQuestionItemSchema).optional().default([]),
  summary: SessionReportSummarySchema.optional(),
  gamification: SessionGamificationSummarySchema.optional(),
  quizRuns: z.array(QuizSummaryReportSchema).optional(),
});
export type SessionReportSnapshot = z.infer<typeof SessionReportSnapshotSchema>;

/**
 * DTO đại diện cho một bản ghi Session Report lưu trong CSDL
 */
export const SessionReportDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  snapshot: SessionReportSnapshotSchema,
  createdAt: z.number().int().positive(),
});
export type SessionReportDto = z.infer<typeof SessionReportDtoSchema>;

/**
 * Yêu cầu đóng phiên học
 */
export const CloseSessionRequestSchema = z.object({
  reason: z.string().optional(),
});
export type CloseSessionRequest = z.infer<typeof CloseSessionRequestSchema>;

/**
 * Phản hồi sau khi đóng phiên học (trả về phiên đã đóng và báo cáo snapshot)
 */
export const CloseSessionResponseSchema = z.object({
  session: SessionDtoSchema,
  report: SessionReportDtoSchema,
});
export type CloseSessionResponse = z.infer<typeof CloseSessionResponseSchema>;

/**
 * Phản hồi tra cứu báo cáo tổng kết phiên học
 */
export const SessionReportResponseSchema = z.object({
  report: SessionReportDtoSchema,
});
export type SessionReportResponse = z.infer<typeof SessionReportResponseSchema>;

/**
 * Nội dung gói tin WebSocket thông báo phiên học đã đóng tới học sinh
 */
export const SessionClosedPayloadSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().optional(),
  message: z.string(),
  reportId: z.string().optional(),
  closedAt: z.number().int().positive(),
});
export type SessionClosedPayload = z.infer<typeof SessionClosedPayloadSchema>;

/**
 * Tóm tắt kết quả phiên học cho từng học sinh (Task 5.3)
 * Bao gồm EXP nhận trong phiên, chi tiết các lần cộng, danh hiệu mới,
 * và cảnh báo đăng nhập bằng PIN đối với học sinh roster/guest.
 */
export const StudentSessionSummaryItemSchema = z.object({
  sessionId: z.string().min(1),
  sessionCode: z.string().length(6),
  participantId: z.string().min(1),
  studentId: z.string().nullable().optional(),
  displayName: z.string().min(1),
  identityLevel: IdentityLevelSchema,
  teamName: z.string().nullable().optional(),
  totalExpEarned: z.number().int().nonnegative().default(0),
  persistedExp: z.boolean(),
  currentLevel: z.number().int().positive().default(1),
  totalAccumulatedExp: z.number().int().nonnegative().default(0),
  leveledUp: z.boolean().default(false),
  expBreakdown: z
    .array(
      z.object({
        reason: z.string(),
        exp: z.number().int(),
        ts: z.number().int().positive(),
      })
    )
    .default([]),
  newTitlesAwarded: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        iconKey: z.string(),
      })
    )
    .default([]),
  avatar: AvatarConfigSchema.optional(),
  reminderPinLogin: z.boolean().default(false),
});
export type StudentSessionSummaryItem = z.infer<typeof StudentSessionSummaryItemSchema>;

export const StudentSessionSummaryResponseSchema = z.object({
  summary: StudentSessionSummaryItemSchema,
});
export type StudentSessionSummaryResponse = z.infer<typeof StudentSessionSummaryResponseSchema>;

/**
 * Đại diện cho một mục trong danh sách lịch sử báo cáo phiên học
 */
export const SessionReportListItemSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  sessionCode: z.string(),
  className: z.string().nullable().optional(),
  createdAt: z.number().int().positive(),
  openedAt: z.number().int().positive().optional(),
  closedAt: z.number().int().positive().nullable().optional(),
  totalParticipants: z.number().int().nonnegative(),
  quizTitle: z.string().optional(),
  summary: SessionReportSummarySchema.optional(),
  scoreboard: z.array(SessionStudentScoreItemSchema).default([]),
  snapshot: SessionReportSnapshotSchema.optional(),
  quizRuns: z.array(QuizSummaryReportSchema).optional(),
});
export type SessionReportListItem = z.infer<typeof SessionReportListItemSchema>;

export const SessionReportsListResponseSchema = z.object({
  reports: z.array(SessionReportListItemSchema),
});
export type SessionReportsListResponse = z.infer<typeof SessionReportsListResponseSchema>;


