/**
 * EduClass v2 — Student Portal Session & Roster Management
 * Quản lý phiên học: Vào lớp theo mã / danh sách lớp, chọn danh tính, WebSocket & Polling
 */

import { state } from './state.js';
import {
  handleIncomingChatMessage,
  updateChatLockState,
  loadStudentChatHistory,
  closeStudentChatModal,
  updateChatBadge,
} from './chat.js';
import { resetQuizState, handleActivityStateUpdate } from './quiz.js';
import { handleQuickPollUpdate } from './poll.js';
import { handleExamUpdate } from './exam.js';
import { handleSwissDuelUpdate } from './swiss.js';
import { handleAssignmentUpdate, switchBackToExamView } from './assignment.js';
import { handleObjectCameraUpdate } from './object-camera.js';
import { handleTerritoryWarUpdate } from './territory.js';
import { handlePdfPresenterUpdate } from './pdf-presenter.js';
import { handleProjectGradingUpdate } from './project-grading.js';
import { handleInteractiveBoardUpdate } from './interactive-board.js';
import { handleCircuitRaceUpdate } from './circuit.js';
import { updateStudentMascotDisplays } from './avatar.js';


export function onSessionCodeInput(val) {
  const cleanCode = val.trim().toUpperCase();
  if (typeof document !== 'undefined') {
    const inputEl = document.getElementById('session-code');
    if (inputEl) inputEl.value = cleanCode;
  }
  if (cleanCode.length === 6) {
    clearTimeout(state.debounceCodeTimer);
    state.debounceCodeTimer = setTimeout(() => {
      loadSessionRoster(cleanCode);
    }, 200);
  } else {
    state.currentRosterData = null;
    state.selectedStudent = null;
    if (typeof document !== 'undefined') {
      document.getElementById('roster-selection-group')?.classList.add('hidden');
      document.getElementById('guest-name-group')?.classList.remove('hidden');
      document.getElementById('guest-roster-toggle')?.classList.add('hidden');
    }
  }
}

export async function loadSessionRoster(code) {
  try {
    const res = await fetch(`/api/sessions/code/${code}/roster`);
    if (!res.ok) {
      state.currentRosterData = null;
      if (typeof document !== 'undefined') {
        document.getElementById('roster-selection-group')?.classList.add('hidden');
        document.getElementById('guest-name-group')?.classList.remove('hidden');
      }
      return;
    }
    const data = await res.json();
    state.currentRosterData = data;
    if (data.students && data.students.length > 0) {
      state.isGuestModeActive = false;
      if (typeof document !== 'undefined') {
        const badgeEl = document.getElementById('roster-class-badge');
        if (badgeEl) badgeEl.textContent = data.className || 'Danh sách lớp';
        document.getElementById('roster-selection-group')?.classList.remove('hidden');
        document.getElementById('guest-name-group')?.classList.add('hidden');

        if (data.identityMode === 'roster_or_guest') {
          document.getElementById('roster-guest-toggle')?.classList.remove('hidden');
          document.getElementById('guest-roster-toggle')?.classList.remove('hidden');
        } else {
          document.getElementById('roster-guest-toggle')?.classList.add('hidden');
          document.getElementById('guest-roster-toggle')?.classList.add('hidden');
        }
      }

      renderRosterStudents(data.students);
    } else {
      if (typeof document !== 'undefined') {
        document.getElementById('roster-selection-group')?.classList.add('hidden');
        document.getElementById('guest-name-group')?.classList.remove('hidden');
      }
    }
  } catch {
    if (typeof document !== 'undefined') {
      document.getElementById('roster-selection-group')?.classList.add('hidden');
      document.getElementById('guest-name-group')?.classList.remove('hidden');
    }
  }
}

export function renderRosterStudents(students) {
  if (typeof document === 'undefined') return;
  const listEl = document.getElementById('roster-student-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!students || students.length === 0) {
    listEl.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; color: var(--color-muted); padding: 12px; font-size: 13px;">Không tìm thấy học sinh nào</div>';
    return;
  }

  students.forEach((st) => {
    const card = document.createElement('div');
    const isSelected = state.selectedStudent && state.selectedStudent.id === st.id;
    card.className = 'roster-card' + (st.isTaken ? ' taken' : '') + (isSelected ? ' selected' : '');
    card.setAttribute('data-sid', st.id);
    card.setAttribute('data-name', st.fullName.toLowerCase());

    let badgeHtml = '';
    if (st.isTaken) {
      badgeHtml = '<span style="font-size: 10px; color: #dc2626; font-weight: 700; margin-top: 2px;">(Đã vào)</span>';
    } else if (st.hasPin) {
      badgeHtml = '<span style="font-size: 10px; color: #d97706; font-weight: 700; margin-top: 2px;">🔒 Có PIN</span>';
    }

    card.innerHTML = `
      <div style="font-weight: 800; line-height: 1.2;">${st.fullName}</div>
      ${badgeHtml}
    `;

    if (!st.isTaken) {
      card.onclick = () => selectRosterStudent(st);
    }
    listEl.appendChild(card);
  });
}

export function selectRosterStudent(st) {
  state.selectedStudent = st;
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.roster-card').forEach((c) => {
    if (c.getAttribute('data-sid') === st.id) {
      c.classList.add('selected');
    } else {
      c.classList.remove('selected');
    }
  });

  const pinGroup = document.getElementById('roster-pin-group');
  const pinInput = document.getElementById('roster-pin-input');
  if (st.hasPin) {
    pinGroup?.classList.remove('hidden');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  } else {
    pinGroup?.classList.add('hidden');
    if (pinInput) pinInput.value = '';
  }
}

export function filterRosterStudents(keyword) {
  if (typeof document === 'undefined') return;
  const kw = keyword.trim().toLowerCase();
  document.querySelectorAll('.roster-card').forEach((card) => {
    const name = card.getAttribute('data-name') || '';
    if (!kw || name.includes(kw)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

export function toggleGuestMode(toGuest) {
  state.isGuestModeActive = toGuest;
  if (typeof document === 'undefined') return;
  if (toGuest) {
    document.getElementById('roster-selection-group')?.classList.add('hidden');
    document.getElementById('guest-name-group')?.classList.remove('hidden');
    document.getElementById('student-name')?.focus();
  } else {
    document.getElementById('guest-name-group')?.classList.add('hidden');
    document.getElementById('roster-selection-group')?.classList.remove('hidden');
  }
}

export async function handleJoin(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (typeof document === 'undefined') return;

  const codeInput = document.getElementById('session-code');
  const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
  const errEl = document.getElementById('join-error');
  if (errEl) errEl.classList.add('hidden');

  const payload = { joinCode: code };

  if (state.currentRosterData && state.currentRosterData.students?.length > 0 && !state.isGuestModeActive) {
    if (!state.selectedStudent) {
      if (errEl) {
        errEl.textContent = 'Vui lòng nhấn chọn tên của bạn trong danh sách lớp.';
        errEl.classList.remove('hidden');
      }
      return;
    }
    payload.studentId = state.selectedStudent.id;
    state.studentName = state.selectedStudent.fullName;

    if (state.selectedStudent.hasPin) {
      const pinInput = document.getElementById('roster-pin-input');
      const pin = pinInput ? pinInput.value.trim() : '';
      if (!pin) {
        if (errEl) {
          errEl.textContent = 'Tài khoản của bạn có mã PIN, vui lòng nhập mã PIN.';
          errEl.classList.remove('hidden');
        }
        return;
      }
      payload.pin = pin;
    }
  } else {
    const nameInput = document.getElementById('student-name');
    state.studentName = nameInput ? nameInput.value.trim() : '';
    if (!state.studentName) {
      if (errEl) {
        errEl.textContent = 'Vui lòng nhập họ và tên của bạn.';
        errEl.classList.remove('hidden');
      }
      return;
    }
    payload.nickname = state.studentName;
  }

  try {
    // 1. Gọi REST Join để lấy Token và Thông tin Session
    const res = await fetch('/api/sessions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Không thể vào lớp với thông tin này.');
    }

    state.participantToken = data.participantToken;
    state.participantId = data.participant?.id;
    state.sessionData = data.session;
    state.examSubmittedDismissed = false;

    // 2. Chuyển sang Lobby
    showLobby(state.studentName);

    // 3. Kết nối WebSocket
    connectWebSocket(code, state.sessionData.id, data.participant);

    // 4. Bật Polling kiểm tra Activity Quiz
    startActivityPoller();
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  }
}

export function showLobby(name) {
  if (state.examTimerInterval) clearInterval(state.examTimerInterval);
  if (state.swissCountdownInterval) clearInterval(state.swissCountdownInterval);
  resetQuizState();

  if (typeof document !== 'undefined') {
    document.getElementById('join-view')?.classList.add('hidden');
    document.getElementById('quiz-view')?.classList.add('hidden');
    document.getElementById('quiz-finished-view')?.classList.add('hidden');
    document.getElementById('poll-view')?.classList.add('hidden');
    document.getElementById('exam-view')?.classList.add('hidden');
    document.getElementById('assignment-view')?.classList.add('hidden');
    const swissView = document.getElementById('swiss-duel-view');
    if (swissView) swissView.classList.add('hidden');
    document.getElementById('object-camera-view')?.classList.add('hidden');
    document.getElementById('pdf-presenter-view')?.classList.add('hidden');
    document.getElementById('territory-war-view')?.classList.add('hidden');
    document.getElementById('circuit-race-view')?.classList.add('hidden');
    document.getElementById('lobby-view')?.classList.remove('hidden');
    const welcomeEl = document.getElementById('lobby-welcome');
    if (welcomeEl) welcomeEl.textContent = `Học sinh: ${name}`;

    updateStudentMascotDisplays();

    // Bật nút Trò chuyện & Trợ giúp và tải lịch sử tin nhắn
    const fab = document.getElementById('student-chat-fab');
    if (fab) fab.classList.remove('hidden');

    // Cập nhật thẻ thông báo Hộp bài tập nếu đang mở song song
    const lobbyBanner = document.getElementById('lobby-assignment-banner');
    const lobbyTitle = document.getElementById('lobby-assignment-title');
    if (lobbyBanner && lobbyTitle) {
      if (state.assignmentState) {
        lobbyTitle.textContent = state.assignmentState.title || 'Thu - phát bài tập';
        lobbyBanner.classList.remove('hidden');
      } else {
        lobbyBanner.classList.add('hidden');
      }
    }
  }

  loadStudentChatHistory();
  checkAndRenderActivityChooser();
}

/**
 * Kiểm tra và hiển thị Bảng Lựa Chọn Hoạt Động khi có 2 hoạt động chạy song song
 */
export function checkAndRenderActivityChooser() {
  if (typeof document === 'undefined') return false;

  const hasExam = Boolean(state.examState && state.examState.status !== 'closed');
  const hasAssignment = Boolean(state.assignmentState);
  const chooserBox = document.getElementById('activity-chooser-box');
  const cardExam = document.getElementById('chooser-card-exam');
  const cardAssignment = document.getElementById('chooser-card-assignment');
  const lobbyBanner = document.getElementById('lobby-assignment-banner');

  const examParallelBar = document.getElementById('exam-parallel-assignment-bar');
  const examParallelTitle = document.getElementById('exam-parallel-assignment-title');
  const examBtnChange = document.getElementById('exam-btn-change-activity');
  const assBtnChange = document.getElementById('assignment-btn-change-activity');
  const assBackExamBtn = document.getElementById('assignment-back-to-exam-btn');
  const assBackExamText = document.getElementById('assignment-back-to-exam-text');

  if (hasExam && hasAssignment) {
    if (examParallelBar) {
      examParallelBar.classList.remove('hidden');
      if (examParallelTitle) examParallelTitle.textContent = state.assignmentState.title || 'Thu - phát bài tập';
    }
    if (examBtnChange) examBtnChange.classList.remove('hidden');
    if (assBtnChange) assBtnChange.classList.remove('hidden');
    if (assBackExamBtn) {
      assBackExamBtn.classList.remove('hidden');
      if (assBackExamText) {
        assBackExamText.textContent = state.examIsSubmitted ? 'Xem kết quả thi' : 'Sang làm bài thi';
      }
    }

    // Nếu học sinh chưa chọn hoạt động nào (vừa vào lớp):
    if (state.userChosenActivity === null) {
      showLobby(state.studentName);
      if (chooserBox) chooserBox.classList.remove('hidden');
      if (lobbyBanner) lobbyBanner.classList.add('hidden');

      if (cardExam) {
        cardExam.classList.remove('hidden');
        const examTitleEl = document.getElementById('chooser-exam-title');
        const examDescEl = document.getElementById('chooser-exam-desc');
        if (examTitleEl) examTitleEl.textContent = state.examState.title || 'Kỳ Thi Trắc Nghiệm';
        if (examDescEl) {
          examDescEl.textContent = `Thời lượng: ${state.examState.durationMinutes || 45} phút · ${state.examState.totalQuestions || 0} câu hỏi`;
        }
      }

      if (cardAssignment) {
        cardAssignment.classList.remove('hidden');
        const assTitleEl = document.getElementById('chooser-assignment-title');
        const assDescEl = document.getElementById('chooser-assignment-desc');
        if (assTitleEl) assTitleEl.textContent = state.assignmentState.title || 'Thu - phát bài tập';
        if (assDescEl) {
          assDescEl.textContent = state.assignmentState.instructions || 'Tải tài liệu và nộp tệp bài làm thực hành (Word, Excel...)';
        }
      }
      return true;
    }
  } else {
    if (chooserBox) chooserBox.classList.add('hidden');
    if (examParallelBar) examParallelBar.classList.add('hidden');
    if (examBtnChange) examBtnChange.classList.add('hidden');
    if (assBtnChange) assBtnChange.classList.add('hidden');

    if (!hasExam) {
      if (assBackExamBtn) assBackExamBtn.classList.add('hidden');
    } else {
      if (assBackExamBtn) {
        assBackExamBtn.classList.remove('hidden');
        if (assBackExamText) {
          assBackExamText.textContent = state.examIsSubmitted ? 'Xem kết quả thi' : 'Sang làm bài thi';
        }
      }
    }

    if (hasExam && !hasAssignment) {
      if (state.userChosenActivity === null) state.userChosenActivity = 'exam';
    } else if (hasAssignment && !hasExam) {
      if (state.userChosenActivity === null) state.userChosenActivity = 'assignment';
    }
  }

  return false;
}

/**
 * Học sinh chủ động bấm chọn hoạt động khi có nhiều hoạt động song song
 */
export function chooseActivity(type) {
  state.userChosenActivity = type;
  const chooserBox = document.getElementById('activity-chooser-box');
  if (chooserBox) chooserBox.classList.add('hidden');

  if (type === 'exam') {
    if (state.examRunId && state.examState) {
      handleExamUpdate(state.examRunId, state.examState);
    }
  } else if (type === 'assignment') {
    switchToAssignmentView();
  }
}

/**
 * Quay lại Bảng Lựa Chọn Hoạt Động để đổi sang hoạt động khác
 */
export function openActivityChooser() {
  state.userChosenActivity = null;
  showLobby(state.studentName);
  checkAndRenderActivityChooser();
}

export function backToLobby() {
  showLobby(state.studentName);
}

export function handleDismissSubmittedExam() {
  state.examSubmittedDismissed = true;
  showLobby(state.studentName);
}

export function connectWebSocket(code, sId, participant) {
  try {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    const pId = participant?.id || state.participantId;
    const wsUrl = `${protocol}//${host}/ws?sessionId=${sId}&participantId=${pId}`;
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      const envelope = {
        v: 1,
        id: 'msg_' + Date.now(),
        type: 'participant_joined',
        sessionId: sId,
        ts: Date.now(),
        payload: {
          joinCode: code,
          participantId: pId,
          participant: participant || {
            id: pId,
            displayName: state.studentName,
            identityLevel: 'guest',
            status: 'online',
          },
        },
      };
      state.ws.send(JSON.stringify(envelope));
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chat:new_message' || msg.type === 'chat_message') {
          handleIncomingChatMessage(msg.payload);
        } else if (msg.type === 'chat:lock_state' || msg.type === 'chat_locked') {
          updateChatLockState(msg.payload?.locked, msg.payload?.chatMode);
        } else if ((msg.type === 'activity_state' || msg.type === 'activity_start') && msg.payload) {
          // Tự động bung cửa sổ học sinh lên trên cùng khi giáo viên mở bất kỳ hoạt động nào
          try {
            window.educlassStudent?.bringToFront?.();
          } catch {}

          if (
            msg.payload.activityId === 'object-camera' ||
            (msg.payload.state && msg.payload.state.photos !== undefined)
          ) {
            handleObjectCameraUpdate(msg.payload.runId, msg.payload.state);
          } else if (msg.payload.activityId === 'exam') {
            handleExamUpdate(msg.payload.runId, msg.payload.state);
          } else if (
            msg.payload.activityId === 'quick-poll' ||
            (msg.payload.state && msg.payload.state.votes !== undefined)
          ) {
            handleQuickPollUpdate(msg.payload.runId, msg.payload.state);
          } else if (
            msg.payload.activityId === 'swiss-duel' ||
            (msg.payload.state && msg.payload.state.matchups !== undefined)
          ) {
            handleSwissDuelUpdate(msg.payload.runId, msg.payload.state);
          } else if (
            msg.payload.activityId === 'assignment-hub' ||
            (msg.payload.state && msg.payload.state.submissions !== undefined)
          ) {
            handleAssignmentUpdate(msg.payload.runId, msg.payload.state);
          } else if (msg.payload.activityId === 'territory-war') {
            handleTerritoryWarUpdate(msg.payload.runId, msg.payload.state);
          } else if (
            msg.payload.activityId === 'pdf-presenter' ||
            (msg.payload.state && (msg.payload.state.gaps !== undefined || msg.payload.state.document !== undefined))
          ) {
            handlePdfPresenterUpdate(msg.payload.runId, msg.payload.state);
          } else if (msg.payload.activityId === 'project-grading') {
            handleProjectGradingUpdate(msg.payload.runId, msg.payload.state);
          } else if (msg.payload.activityId === 'interactive-board') {
            handleInteractiveBoardUpdate(msg.payload.runId, msg.payload.state);
          } else if (msg.payload.activityId === 'circuit-race') {
            handleCircuitRaceUpdate(msg.payload.runId, msg.payload.state);
          } else {
            handleActivityStateUpdate(msg.payload.runId, msg.payload.state);
          }
        } else if (msg.type === 'activity_end' || msg.type === 'activity_ended') {
          const endedActivityId = msg.payload?.activityId;
          const endedRunId = msg.payload?.runId;
          if (endedActivityId === 'territory-war' || endedRunId === state.territoryRunId) {
            state.territoryRunId = null;
            state.territoryState = null;
            document.getElementById('territory-war-view')?.classList.add('hidden');
            showLobby(state.studentName);
          } else if (endedActivityId === 'pdf-presenter' || endedRunId === state.activeActivityRunId) {
            state.activeActivityRunId = null;
            document.getElementById('pdf-presenter-view')?.classList.add('hidden');
            showLobby(state.studentName);
          } else if (endedActivityId === 'project-grading' || endedRunId === state.projectGradingRunId) {
            state.projectGradingRunId = null;
            state.projectGradingState = null;
            document.getElementById('project-grading-view')?.classList.add('hidden');
            showLobby(state.studentName);
          } else if (endedActivityId === 'interactive-board' || endedRunId === state.interactiveBoardRunId) {
            state.interactiveBoardRunId = null;
            state.interactiveBoardState = null;
            document.getElementById('interactive-board-view')?.classList.add('hidden');
            showLobby(state.studentName);
          } else if (endedActivityId === 'circuit-race' || endedRunId === state.circuitRunId) {
            state.circuitRunId = null;
            state.circuitState = null;
            document.getElementById('circuit-race-view')?.classList.add('hidden');
            showLobby(state.studentName);
          } else if (endedActivityId === 'assignment-hub' || endedRunId === state.assignmentRunId) {
            state.assignmentRunId = null;
            state.assignmentState = null;
            document.getElementById('lobby-assignment-banner')?.classList.add('hidden');
            document.getElementById('exam-to-assignment-box')?.classList.add('hidden');
            const assignmentView = document.getElementById('assignment-view');
            if (assignmentView && !assignmentView.classList.contains('hidden')) {
              if (state.examIsSubmitted) {
                switchBackToExamView();
              } else {
                showLobby(state.studentName);
              }
            }
          } else {
            state.currentRunId = null;
            if (state.assignmentState && state.activeView === 'assignment') {
              document.getElementById('assignment-back-to-exam-btn')?.classList.add('hidden');
            } else {
              showLobby(state.studentName);
            }
          }
        } else if (msg.type === 'SESSION_CLOSED') {
          alert('Thầy cô đã kết thúc tiết học.');
          handleLeaveSession();
        }
      } catch {}
    };
  } catch {}
}

export function startActivityPoller() {
  if (state.activityPoller) clearInterval(state.activityPoller);
  state.activityPoller = setInterval(async () => {
    if (!state.sessionData) return;
    try {
      const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/active`);
      if (res.ok) {
        const data = await res.json();
        const activeRuns = data.activeRuns || [];
        if (activeRuns.length > 0) {
          const runIds = activeRuns.map((r) => r.run?.id).filter(Boolean);
          const hasNewRun = runIds.some((id) => !state.lastPolledRunIds?.has(id));
          if (hasNewRun) {
            state.lastPolledRunIds = new Set(runIds);
            try {
              window.educlassStudent?.bringToFront?.();
            } catch {}
          }
          for (const item of activeRuns) {
            const { run, state: runState } = item;
            if (!run || !runState) continue;
            if (run.activityId === 'object-camera') {
              handleObjectCameraUpdate(run.id, runState);
            } else if (run.activityId === 'quiz-live') {
              handleActivityStateUpdate(run.id, runState);
            } else if (run.activityId === 'quick-poll') {
              handleQuickPollUpdate(run.id, runState);
            } else if (run.activityId === 'exam') {
              handleExamUpdate(run.id, runState);
            } else if (run.activityId === 'swiss-duel') {
              handleSwissDuelUpdate(run.id, runState);
            } else if (run.activityId === 'assignment-hub') {
              handleAssignmentUpdate(run.id, runState);
            } else if (run.activityId === 'territory-war') {
              handleTerritoryWarUpdate(run.id, runState);
            } else if (run.activityId === 'pdf-presenter') {
              handlePdfPresenterUpdate(run.id, runState);
            } else if (run.activityId === 'project-grading') {
              handleProjectGradingUpdate(run.id, runState);
            } else if (run.activityId === 'interactive-board') {
              handleInteractiveBoardUpdate(run.id, runState);
            }
          }

          const hasAssignment = activeRuns.some((r) => r.run.activityId === 'assignment-hub');
          if (!hasAssignment && state.assignmentRunId) {
            state.assignmentRunId = null;
            state.assignmentState = null;
            document.getElementById('lobby-assignment-banner')?.classList.add('hidden');
            document.getElementById('exam-to-assignment-box')?.classList.add('hidden');
          }

          checkAndRenderActivityChooser();
        } else if (state.currentRunId || state.assignmentRunId || state.projectGradingRunId || state.interactiveBoardRunId) {
          state.assignmentRunId = null;
          state.assignmentState = null;
          state.objectCameraState = null;
          state.projectGradingRunId = null;
          state.projectGradingState = null;
          state.interactiveBoardRunId = null;
          state.interactiveBoardState = null;
          state.userChosenActivity = null;
          document.getElementById('project-grading-view')?.classList.add('hidden');
          document.getElementById('interactive-board-view')?.classList.add('hidden');
          showLobby(state.studentName);
          state.currentRunId = null;
        }
      }
    } catch {}
  }, 1200);
}

export async function handleLeaveSession() {
  if (!state.sessionData) return;
  try {
    await fetch(`/api/sessions/${state.sessionData.id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: state.participantId, participantToken: state.participantToken }),
    });
  } catch {}
  if (state.ws) {
    try {
      state.ws.close();
    } catch {}
  }
  state.sessionData = null;
  state.participantToken = '';
  state.participantId = '';
  state.currentRunId = null;
  state.myQuizQuestionOrder = null;
  state.examSubmittedDismissed = false;
  state.selectedStudent = null;

  // Xóa sạch trạng thái bài thi, quiz và swiss duel
  state.examAnswers = {};
  state.examState = null;
  state.examIsSubmitted = false;
  state.swissState = null;
  state.swissAnswers = {};
  state.projectGradingRunId = null;
  state.projectGradingState = null;
  state.interactiveBoardRunId = null;
  state.interactiveBoardState = null;
  if (state.swissCountdownInterval) clearInterval(state.swissCountdownInterval);
  resetQuizState();

  if (typeof document !== 'undefined') {
    const qListEl = document.getElementById('exam-questions-list');
    if (qListEl) qListEl.innerHTML = '';
    const navGridEl = document.getElementById('exam-nav-grid');
    if (navGridEl) navGridEl.innerHTML = '';
    const reviewBox = document.getElementById('exam-review-container');
    if (reviewBox) {
      reviewBox.innerHTML = '';
      reviewBox.classList.add('hidden');
    }
  }

  if (state.activityPoller) clearInterval(state.activityPoller);
  if (state.examTimerInterval) clearInterval(state.examTimerInterval);

  // Ẩn nút Chat và đóng modal chat
  closeStudentChatModal();
  if (typeof document !== 'undefined') {
    const chatFab = document.getElementById('student-chat-fab');
    if (chatFab) chatFab.classList.add('hidden');
  }
  state.studentChatMessages = [];
  state.unreadChatCount = 0;
  updateChatBadge();

  state.territoryRunId = null;
  state.territoryState = null;
  state.userChosenActivity = null;

  if (typeof document !== 'undefined') {
    document.getElementById('lobby-view')?.classList.add('hidden');
    document.getElementById('quiz-view')?.classList.add('hidden');
    document.getElementById('quiz-finished-view')?.classList.add('hidden');
    document.getElementById('poll-view')?.classList.add('hidden');
    document.getElementById('exam-view')?.classList.add('hidden');
    document.getElementById('assignment-view')?.classList.add('hidden');
    document.getElementById('territory-war-view')?.classList.add('hidden');
    document.getElementById('project-grading-view')?.classList.add('hidden');
    document.getElementById('interactive-board-view')?.classList.add('hidden');
    const swissView = document.getElementById('swiss-duel-view');
    if (swissView) swissView.classList.add('hidden');
    document.getElementById('join-view')?.classList.remove('hidden');

    // Tải lại danh sách học sinh của mã hiện tại nếu có
    const codeInput = document.getElementById('session-code');
    const currentCode = codeInput ? codeInput.value.trim() : '';
    if (currentCode.length === 6) {
      loadSessionRoster(currentCode);
    }
  }
}
