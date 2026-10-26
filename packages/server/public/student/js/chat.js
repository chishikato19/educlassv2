/**
 * EduClass v2 — Student Portal Chat & Help (Task 5.2)
 * Quản lý Trò chuyện & Trợ giúp của Học sinh
 */

import { state } from './state.js';

export function toggleStudentChatModal() {
  if (state.isStudentChatOpen) {
    closeStudentChatModal();
  } else {
    openStudentChatModal();
  }
}

export function openStudentChatModal() {
  state.isStudentChatOpen = true;
  state.unreadChatCount = 0;
  updateChatBadge();
  if (typeof document === 'undefined') return;
  const toastEl = document.getElementById('student-chat-toast');
  if (toastEl) toastEl.classList.add('hidden');
  if (state.toastHideTimer) clearTimeout(state.toastHideTimer);
  const modal = document.getElementById('student-chat-modal');
  if (modal) modal.classList.remove('hidden');
  renderStudentChatMessages();
  const input = document.getElementById('student-chat-input');
  if (input) setTimeout(() => input.focus(), 100);
}

export function closeStudentChatModal() {
  state.isStudentChatOpen = false;
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('student-chat-modal');
  if (modal) modal.classList.add('hidden');
}

export function updateChatBadge() {
  if (typeof document === 'undefined') return;
  const badge = document.getElementById('student-chat-badge');
  if (!badge) return;
  if (state.unreadChatCount > 0) {
    badge.textContent = state.unreadChatCount > 9 ? '9+' : String(state.unreadChatCount);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

export function showChatToast(text) {
  if (typeof document === 'undefined') return;
  const toastEl = document.getElementById('student-chat-toast');
  const toastText = document.getElementById('student-chat-toast-text');
  if (!toastEl || !toastText) return;
  toastText.textContent = text;
  toastEl.classList.remove('hidden');
  if (state.toastHideTimer) clearTimeout(state.toastHideTimer);
  state.toastHideTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 6000);
}

export function updateChatLockState(locked, chatMode) {
  if (chatMode) {
    state.currentChatMode = chatMode;
  } else if (locked !== undefined) {
    state.currentChatMode = locked ? 'locked' : 'teacher_only';
  }
  state.isChatLocked = state.currentChatMode === 'locked';

  if (typeof document === 'undefined') return;

  const statusEl = document.getElementById('student-chat-lock-status');
  const warnEl = document.getElementById('student-chat-locked-warning');
  const input = document.getElementById('student-chat-input');
  const cb = document.getElementById('student-chat-private-cb');
  const badge = document.getElementById('student-chat-mode-badge');

  if (state.currentChatMode === 'locked') {
    if (statusEl) statusEl.textContent = '🔒 Thầy/Cô tạm khóa trò chuyện';
    if (warnEl) warnEl.classList.remove('hidden');
    if (input) input.disabled = true;
    if (cb) {
      cb.checked = true;
      cb.disabled = true;
    }
    if (badge) {
      badge.textContent = 'Đã khóa';
      badge.style.background = '#fee2e2';
      badge.style.color = '#dc2626';
    }
  } else if (state.currentChatMode === 'teacher_only') {
    if (statusEl) statusEl.textContent = '👨‍🏫 Chế độ riêng tư: Chỉ Thầy/Cô thấy';
    if (warnEl) warnEl.classList.add('hidden');
    if (input) input.disabled = false;
    if (cb) {
      cb.checked = true;
      cb.disabled = true;
    }
    if (badge) {
      badge.textContent = 'Chỉ Thầy/Cô';
      badge.style.background = '#e0f2fe';
      badge.style.color = '#0369a1';
    }
  } else {
    if (statusEl) statusEl.textContent = '💬 Mở trò chuyện cả lớp';
    if (warnEl) warnEl.classList.add('hidden');
    if (input) input.disabled = false;
    if (cb) {
      cb.disabled = false;
    }
    if (badge) {
      badge.textContent = 'Mở cả lớp';
      badge.style.background = '#dcfce7';
      badge.style.color = '#16a34a';
    }
  }
}

export function renderStudentChatMessages() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('student-chat-messages-container');
  if (!container) return;
  if (state.studentChatMessages.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 20px 0;">Chưa có tin nhắn nào. Nhập tin nhắn bên dưới để trò chuyện cùng Thầy/Cô.</div>';
    return;
  }
  container.innerHTML = state.studentChatMessages
    .map((msg) => {
      const isFromTeacher = Boolean(msg.fromTeacher);
      const isMe = !isFromTeacher && (msg.fromParticipantId === state.participantId || !msg.fromParticipantId);
      const bg = isFromTeacher ? '#e0f2fe' : isMe ? '#2563eb' : '#f1f5f9';
      const color = isFromTeacher ? '#0369a1' : isMe ? '#ffffff' : '#334155';
      const align = isMe ? 'flex-end' : 'flex-start';
      const sender = isFromTeacher
        ? '👨‍🏫 Thầy/Cô'
        : isMe
          ? 'Bạn (Riêng tư)'
          : msg.fromParticipantName || 'Học sinh';

      return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; max-width: 85%; align-self: ${align};">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px;">${sender}</div>
          <div style="background: ${bg}; color: ${color}; padding: 8px 12px; border-radius: 14px; font-size: 13px; line-height: 1.4; word-break: break-word; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            ${msg.text}
          </div>
        </div>
      `;
    })
    .join('');
  container.scrollTop = container.scrollHeight;
}

export function handleIncomingChatMessage(payload) {
  if (!payload || !payload.text) return;
  // BẢO VỆ TIN NHẮN RIÊNG TƯ:
  // Nếu là tin nhắn riêng (toParticipantId != null):
  // Chỉ nhận nếu chính học sinh này là người gửi hoặc người nhận!
  if (payload.toParticipantId) {
    if (payload.toParticipantId !== state.participantId && payload.fromParticipantId !== state.participantId) {
      return; // Học sinh khác hoàn toàn KHÔNG THẤY tin nhắn này!
    }
  }
  if (state.studentChatMessages.some((m) => m.id === payload.id)) return;
  state.studentChatMessages.push(payload);
  renderStudentChatMessages();
  if (!state.isStudentChatOpen) {
    state.unreadChatCount++;
    updateChatBadge();
    if (payload.fromTeacher) {
      showChatToast(payload.text);
    }
  }
}

export async function handleStudentSendChatMessage() {
  if (state.isChatLocked && state.currentChatMode === 'locked') {
    alert('Thầy/Cô đang tạm khóa trò chuyện.');
    return;
  }
  if (typeof document === 'undefined') return;
  const input = document.getElementById('student-chat-input');
  const text = input ? input.value.trim() : '';
  if (!text || !state.sessionData) return;
  input.value = '';

  const cb = document.getElementById('student-chat-private-cb');
  const isPrivate = state.currentChatMode === 'teacher_only' || (cb ? cb.checked : true);

  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-participant-id': state.participantId,
        Authorization: 'Bearer ' + state.participantToken,
      },
      body: JSON.stringify({
        text: text,
        kind: 'text',
        toParticipantId: isPrivate ? state.participantId : null,
      }),
    });
    const data = await res.json();
    if (data.message) {
      if (!state.studentChatMessages.some((m) => m.id === data.message.id)) {
        state.studentChatMessages.push(data.message);
        renderStudentChatMessages();
      }
    }
  } catch {
    alert('Không thể gửi tin nhắn đến máy chủ');
  }
}

export async function handleStudentHandRaise() {
  if (!state.sessionData) return;
  const reason = prompt(
    'Nhập câu hỏi hoặc lý do cần trợ giúp (hoặc bấm OK để xin trợ giúp nhanh):',
    'Em cần thầy/cô trợ giúp ạ!'
  );
  if (reason === null) return;
  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/chat/hand-raise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-participant-id': state.participantId,
        Authorization: 'Bearer ' + state.participantToken,
      },
      body: JSON.stringify({ message: reason || undefined }),
    });
    if (res.ok) {
      alert('Đã gửi tín hiệu ✋ xin trợ giúp đến Thầy/Cô thành công!');
    }
  } catch {
    alert('Không thể gửi yêu cầu trợ giúp');
  }
}

export async function loadStudentChatHistory() {
  if (!state.sessionData || !state.participantId) return;
  try {
    const res = await fetch(
      `/api/sessions/${state.sessionData.id}/chat/messages?participantId=${state.participantId}`,
      {
        headers: {
          'x-participant-id': state.participantId,
          Authorization: 'Bearer ' + state.participantToken,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        state.studentChatMessages = data.messages;
        renderStudentChatMessages();
      }
      if (data.chatLocked !== undefined) {
        updateChatLockState(Boolean(data.chatLocked));
      }
    }
  } catch {}
}
