/**
 * EduClass v2 — Student Portal Application Entry Point
 * Điểm khởi chạy của cổng Học sinh, liên kết các module và gắn handler toàn cục
 */

import { state } from './state.js';
import { renderMath } from './utils.js';
import {
  toggleStudentChatModal,
  openStudentChatModal,
  closeStudentChatModal,
  updateChatBadge,
  showChatToast,
  updateChatLockState,
  renderStudentChatMessages,
  handleIncomingChatMessage,
  handleStudentSendChatMessage,
  handleStudentHandRaise,
  loadStudentChatHistory,
} from './chat.js';
import {
  resetQuizState,
  handleActivityStateUpdate,
  getStudentQuizQuestionOrder,
  showQuizQuestion,
  showQuizizzAnswerReview,
  handleSelectAnswer,
  showQuestionReview,
  showLeaderboardStatus,
  showQuizFinished,
  handleQuizReplay,
  handleSubmitQuizMatching,
  handleSubmitQuizCloze,
  handleSubmitQuizShort,
} from './quiz.js';
import { handleQuickPollUpdate, submitPollVote, handleSubmitPollMultiple } from './poll.js';
import {
  handleExamUpdate,
  getStudentExamQuestions,
  getStudentExamOptions,
  updateExamCountdown,
  updateExamNavPalette,
  renderExamQuestions,
  handleSelectExamAnswer,
  handleSubmitExam,
  toggleExamReview,
  handleUnlockExam,
  handleSelectExamMatchingPair,
  handleSelectExamClozeBlank,
} from './exam.js';
import {
  handleSwissDuelUpdate,
  updateSwissCountdown,
  renderSwissQuestions,
  handleSelectSwissLocalAnswer,
  handleInputSwissShortAnswer,
  updateSwissSubmitBtnState,
  handleSubmitSwissRound,
  renderSwissAnswersReview,
  renderSwissMiniLeaderboard,
} from './swiss.js';
import {
  handleAssignmentUpdate,
  handleStudentFileSelected,
  handleClearSelectedStudentFile,
  handleShowResubmitForm,
  handleUploadAndSubmitAssignment,
  switchToAssignmentView,
  switchBackToExamView,
} from './assignment.js';
import { handleObjectCameraUpdate } from './object-camera.js';
import { handlePdfPresenterUpdate } from './pdf-presenter.js';
import { handleInteractiveBoardUpdate } from './interactive-board.js';
import {
  handleTerritoryWarUpdate,
  handleSelectTerritoryCell,
  handleSubmitTerritoryAnswer,
  handleCancelTerritoryCell,
} from './territory.js';
import {
  handleCircuitRaceUpdate,
  handleSelectCircuitMcq,
  handleSelectCircuitTf,
  handleSelectCircuitTfGroupItem,
  handleSubmitCircuitShort,
  handleUseCircuitCard,
  handleDiscardCircuitCard,
  handleSkipCircuitCard,
} from './circuit.js';
import {
  onSessionCodeInput,
  loadSessionRoster,
  renderRosterStudents,
  selectRosterStudent,
  filterRosterStudents,
  toggleGuestMode,
  handleJoin,
  showLobby,
  backToLobby,
  handleDismissSubmittedExam,
  connectWebSocket,
  startActivityPoller,
  handleLeaveSession,
  chooseActivity,
  openActivityChooser,
} from './session.js';
import {
  openAvatarModal,
  closeAvatarModal,
  randomizeAvatar,
  confirmAvatarSave,
  initAvatar,
} from './avatar.js';

// Gắn toàn bộ các hàm xử lý tương tác lên window để các inline handler (onclick, oninput, onsubmit...) hoạt động trơn tru
if (typeof window !== 'undefined') {
  window.onSessionCodeInput = onSessionCodeInput;
  window.filterRosterStudents = filterRosterStudents;
  window.selectRosterStudent = selectRosterStudent;
  window.toggleGuestMode = toggleGuestMode;
  window.handleJoin = handleJoin;
  window.handleLeaveSession = handleLeaveSession;
  window.showLobby = showLobby;
  window.backToLobby = backToLobby;
  window.chooseActivity = chooseActivity;
  window.openActivityChooser = openActivityChooser;

  window.handleSelectAnswer = handleSelectAnswer;
  window.handleSubmitQuizMatching = handleSubmitQuizMatching;
  window.handleSubmitQuizCloze = handleSubmitQuizCloze;
  window.handleSubmitQuizShort = handleSubmitQuizShort;

  window.handleSubmitPollMultiple = handleSubmitPollMultiple;

  window.handleSelectExamAnswer = handleSelectExamAnswer;
  window.handleSelectExamMatchingPair = handleSelectExamMatchingPair;
  window.handleSelectExamClozeBlank = handleSelectExamClozeBlank;
  window.handleSubmitExam = handleSubmitExam;
  window.toggleExamReview = toggleExamReview;
  window.handleUnlockExam = handleUnlockExam;
  window.handleDismissSubmittedExam = handleDismissSubmittedExam;

  window.handleSelectSwissLocalAnswer = handleSelectSwissLocalAnswer;
  window.handleInputSwissShortAnswer = handleInputSwissShortAnswer;
  window.handleSubmitSwissRound = handleSubmitSwissRound;

  window.handleStudentFileSelected = handleStudentFileSelected;
  window.handleClearSelectedStudentFile = handleClearSelectedStudentFile;
  window.handleShowResubmitForm = handleShowResubmitForm;
  window.handleUploadAndSubmitAssignment = handleUploadAndSubmitAssignment;
  window.switchToAssignmentView = switchToAssignmentView;
  window.switchBackToExamView = switchBackToExamView;

  window.handleTerritoryWarUpdate = handleTerritoryWarUpdate;
  window.handleSelectTerritoryCell = handleSelectTerritoryCell;
  window.handleSubmitTerritoryAnswer = handleSubmitTerritoryAnswer;
  window.handleCancelTerritoryCell = handleCancelTerritoryCell;

  window.handleCircuitRaceUpdate = handleCircuitRaceUpdate;
  window.handleSelectCircuitMcq = handleSelectCircuitMcq;
  window.handleSelectCircuitTf = handleSelectCircuitTf;
  window.handleSelectCircuitTfGroupItem = handleSelectCircuitTfGroupItem;
  window.handleSubmitCircuitShort = handleSubmitCircuitShort;
  window.handleUseCircuitCard = handleUseCircuitCard;
  window.handleDiscardCircuitCard = handleDiscardCircuitCard;
  window.handleSkipCircuitCard = handleSkipCircuitCard;

  window.toggleStudentChatModal = toggleStudentChatModal;
  window.openStudentChatModal = openStudentChatModal;
  window.closeStudentChatModal = closeStudentChatModal;
  window.handleStudentSendChatMessage = handleStudentSendChatMessage;
  window.handleStudentHandRaise = handleStudentHandRaise;
  window.handleObjectCameraUpdate = handleObjectCameraUpdate;
  window.handlePdfPresenterUpdate = handlePdfPresenterUpdate;
  window.handleInteractiveBoardUpdate = handleInteractiveBoardUpdate;

  window.openAvatarModal = openAvatarModal;
  window.closeAvatarModal = closeAvatarModal;
  window.randomizeAvatar = randomizeAvatar;
  window.confirmAvatarSave = confirmAvatarSave;

  window.renderMath = renderMath;
  window.__EDUCLASS_STUDENT_STATE__ = state;

  // Tự động nhận diện mã phòng từ URL param (?code=ABCXYZ) khi quét mã QR & nạp Mascot
  const initApp = () => {
    initAvatar();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const codeInput = document.getElementById('session-code');
      if (codeInput) {
        codeInput.value = code.toUpperCase();
        onSessionCodeInput(codeInput.value);
      }
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }

  // Gửi tín hiệu rời phòng khi đóng tab / chuyển trang
  const sendLeaveBeacon = () => {
    if (state.sessionData && state.participantId) {
      try {
        navigator.sendBeacon(
          `/api/sessions/${state.sessionData.id}/leave`,
          JSON.stringify({ participantId: state.participantId, participantToken: state.participantToken })
        );
      } catch {}
    }
  };

  window.addEventListener('beforeunload', sendLeaveBeacon);
  window.addEventListener('pagehide', sendLeaveBeacon);
}

export {
  state,
  renderMath,
  toggleStudentChatModal,
  openStudentChatModal,
  closeStudentChatModal,
  updateChatBadge,
  showChatToast,
  updateChatLockState,
  renderStudentChatMessages,
  handleIncomingChatMessage,
  handleStudentSendChatMessage,
  handleStudentHandRaise,
  loadStudentChatHistory,
  resetQuizState,
  handleActivityStateUpdate,
  getStudentQuizQuestionOrder,
  showQuizQuestion,
  showQuizizzAnswerReview,
  handleSelectAnswer,
  showQuestionReview,
  showLeaderboardStatus,
  showQuizFinished,
  handleQuizReplay,
  handleQuickPollUpdate,
  submitPollVote,
  handleSubmitPollMultiple,
  handleDismissSubmittedExam,
  handleExamUpdate,
  getStudentExamQuestions,
  getStudentExamOptions,
  updateExamCountdown,
  updateExamNavPalette,
  renderExamQuestions,
  handleSelectExamAnswer,
  handleSubmitExam,
  toggleExamReview,
  handleUnlockExam,
  handleSwissDuelUpdate,
  updateSwissCountdown,
  renderSwissQuestions,
  handleSelectSwissLocalAnswer,
  handleInputSwissShortAnswer,
  updateSwissSubmitBtnState,
  handleSubmitSwissRound,
  renderSwissAnswersReview,
  renderSwissMiniLeaderboard,
  onSessionCodeInput,
  loadSessionRoster,
  renderRosterStudents,
  selectRosterStudent,
  filterRosterStudents,
  toggleGuestMode,
  handleJoin,
  showLobby,
  backToLobby,
  connectWebSocket,
  startActivityPoller,
  handleLeaveSession,
  switchToAssignmentView,
  switchBackToExamView,
  handleTerritoryWarUpdate,
  handleSelectTerritoryCell,
  handleSubmitTerritoryAnswer,
  handleCancelTerritoryCell,
};
