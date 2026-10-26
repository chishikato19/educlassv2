/**
 * EduClass v2 — Student Portal State
 * Quản lý tập trung toàn bộ trạng thái của cổng học sinh
 */

export const state = {
  // Kết nối & Danh tính
  ws: null,
  sessionData: null,
  participantToken: '',
  participantId: '',
  studentName: '',

  // Quản lý danh sách học sinh theo lớp (Roster Mode)
  currentRosterData: null,
  selectedStudent: null,
  isGuestModeActive: false,
  debounceCodeTimer: null,

  // Hoạt động & Vòng lặp kiểm tra
  currentRunId: null,
  activityPoller: null,

  // Trạng thái chơi Quiz Live
  currentQuestionIdx: -1,
  renderedQuestionIdx: -1,
  hasAnsweredCurrentQuestion: false,
  questionStartTime: Date.now(),
  myQuizQuestionOrder: null,
  isViewingQuizizzFeedback: false,
  pendingQuizizzState: null,

  // Trạng thái Kỳ thi (Exam)
  examSubmittedDismissed: false,
  examRunId: null,
  examState: null,
  examTimerInterval: null,
  examAnswers: {},
  examIsSubmitted: false,
  fetchingExamPaper: false,

  // Lựa chọn hoạt động khi chạy song song (đa nhiệm)
  userChosenActivity: null, // null (chưa chọn) | 'exam' | 'assignment'

  // Trạng thái Trò chuyện & Trợ giúp (Chat & Help) - Mặc định khóa chat
  studentChatMessages: [],
  isStudentChatOpen: false,
  unreadChatCount: 0,
  isChatLocked: true,
  currentChatMode: 'locked',
  toastHideTimer: null,

  // Trạng thái Quick Poll
  pollChoices: [],
  pollAllowMultiple: false,

  // Trạng thái Đấu Cờ Thụy Sỹ (Swiss Duel)
  swissState: null,
  swissAnswers: {},
  swissCountdownInterval: null,
  swissRoundInterval: null,
  swissLastRound: 0,

  // Trạng thái Thu - Phát bài tập (Assignment Hub) & Điều hướng màn hình
  activeView: 'lobby',
  assignmentRunId: null,
  assignmentState: null,
  assignmentSelectedFile: null,
  isShowingResubmitForm: false,

  // Trạng thái Camera vật thể
  objectCameraState: null,

  // Trạng thái Đại Chiến Lãnh Thổ (Territory War)
  territoryRunId: null,
  territoryState: null,

  // Trạng thái Chấm điểm Dự án (Project Grading)
  projectGradingRunId: null,
  projectGradingState: null,

  // Trạng thái Bảng Tương Tác (Interactive Board)
  interactiveBoardRunId: null,
  interactiveBoardState: null,
  interactiveBoardActiveTab: 'text',
  interactiveBoardDrawingColor: '#1e293b',
  interactiveBoardDrawingSize: 4,
  interactiveBoardPostToGrade: null,
  interactiveBoardPostDetailGrades: null,
};

