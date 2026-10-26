/**
 * EduClass v2 — Student Assignment Hub Module
 * Quản lý hoạt động Thu - Phát bài tập (Tải tài liệu GV phát & Nộp bài làm)
 */

import { state } from './state.js';

let lastMaterialIds = new Set();

export function renderAssignmentUI(assignmentState) {
  // 1. Cập nhật Tiêu đề và trạng thái khóa
  const titleEl = document.getElementById('assignment-title');
  if (titleEl) {
    titleEl.textContent = assignmentState.title || 'Thu - phát bài tập';
  }

  const badgeEl = document.getElementById('assignment-badge-status');
  if (badgeEl) {
    if (assignmentState.isLocked) {
      badgeEl.textContent = '🔒 Cổng nộp bài đã đóng';
      badgeEl.style.background = '#fef3c7';
      badgeEl.style.color = '#92400e';
    } else {
      badgeEl.textContent = '🟢 Đang mở cổng nộp bài';
      badgeEl.style.background = '#dcfce7';
      badgeEl.style.color = '#166534';
    }
  }

  const studentNameEl = document.getElementById('assignment-student-name');
  if (studentNameEl) {
    const stName = state.studentName || state.selectedStudent?.fullName || 'Học sinh';
    studentNameEl.textContent = `• HS: ${stName}`;
  }

  // 2. Hướng dẫn của giáo viên
  const instrBox = document.getElementById('assignment-instructions-box');
  const instrText = document.getElementById('assignment-instructions-text');
  if (instrBox && instrText) {
    if (assignmentState.instructions && assignmentState.instructions.trim()) {
      instrText.textContent = assignmentState.instructions;
      instrBox.classList.remove('hidden');
    } else {
      instrBox.classList.add('hidden');
    }
  }

  // 3. Danh sách tài liệu phát xuống (Phương án A)
  const matBox = document.getElementById('assignment-materials-box');
  const matCount = document.getElementById('assignment-materials-count');
  const matList = document.getElementById('assignment-materials-list');

  const materials = assignmentState.materials || [];
  if (matBox && matCount && matList) {
    if (materials.length > 0) {
      matBox.classList.remove('hidden');
      matCount.textContent = `${materials.length} tệp`;

      // Kiểm tra có tài liệu mới xuất hiện không để báo popup
      const currentIds = new Set(materials.map((m) => m.id));
      const newItems = materials.filter((m) => !lastMaterialIds.has(m.id));
      if (lastMaterialIds.size > 0 && newItems.length > 0) {
        showMaterialAlertPopup(newItems[0]);
      }
      lastMaterialIds = currentIds;

      matList.innerHTML = materials
        .map(
          (m) => `
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div style="min-width:0; padding-right:8px;">
            <div style="font-size:13px; font-weight:700; color:#1e3a8a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📄 ${escapeHtml(m.name)}</div>
            <div style="font-size:11px; color:#64748b;">${formatFileSize(m.size)}</div>
          </div>
          <div style="display:flex; gap:6px; shrink:0;">
            <a href="${m.url}" target="_blank" class="btn" style="padding:6px 10px; font-size:12px; min-height:34px; background:#eff6ff; color:#1d4ed8; text-decoration:none; border-radius:8px; font-weight:700; border:1px solid #bfdbfe;">👁️ Mở</a>
            <a href="${m.url}" download="${escapeHtml(m.name)}" class="btn" style="padding:6px 12px; font-size:12px; min-height:34px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700;">⬇️ Tải</a>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      matBox.classList.add('hidden');
      matList.innerHTML = '';
      lastMaterialIds.clear();
    }
  }

  // Cập nhật gợi ý định dạng ở dropzone
  const hintEl = document.getElementById('assignment-drop-hint');
  if (hintEl) {
    let hint = `Dung lượng tối đa: ${assignmentState.maxFileSizeMb || 50}MB`;
    if (assignmentState.allowedExtensions && assignmentState.allowedExtensions.length > 0) {
      hint += ` • Định dạng: ${assignmentState.allowedExtensions.join(', ')}`;
    } else {
      hint += ` • Định dạng: Mọi loại tệp`;
    }
    hintEl.textContent = hint;
  }

  // 4. Kiểm tra trạng thái bài nộp của học sinh
  const mySub = assignmentState.submissions?.[state.participantId];
  const submittedBox = document.getElementById('assignment-submitted-box');
  const uploadBox = document.getElementById('assignment-upload-box');
  const myFileNameEl = document.getElementById('assignment-my-filename');
  const mySubTimeEl = document.getElementById('assignment-my-subtime');
  const myDownloadLink = document.getElementById('assignment-my-downloadlink');
  const resubmitSection = document.getElementById('assignment-resubmit-section');

  if (mySub) {
    if (submittedBox) submittedBox.classList.remove('hidden');
    if (uploadBox && !state.isShowingResubmitForm) uploadBox.classList.add('hidden');

    if (myFileNameEl) myFileNameEl.textContent = `📄 ${mySub.fileName}`;
    if (mySubTimeEl) {
      const timeStr = new Date(mySub.submittedAt).toLocaleTimeString('vi-VN');
      mySubTimeEl.textContent = `Đã nộp lúc: ${timeStr} • ${formatFileSize(mySub.fileSize)}`;
    }
    if (myDownloadLink) {
      myDownloadLink.href = mySub.downloadUrl;
      myDownloadLink.download = mySub.fileName;
    }

    if (resubmitSection) {
      if (assignmentState.allowResubmit && !assignmentState.isLocked) {
        resubmitSection.classList.remove('hidden');
      } else {
        resubmitSection.classList.add('hidden');
      }
    }
  } else {
    state.isShowingResubmitForm = false;
    if (submittedBox) submittedBox.classList.add('hidden');
    if (uploadBox) {
      if (assignmentState.isLocked) {
        uploadBox.classList.add('hidden');
      } else {
        uploadBox.classList.remove('hidden');
      }
    }
  }
}

export function switchToAssignmentView() {
  state.activeView = 'assignment';
  state.userChosenActivity = 'assignment';

  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('waiting-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');

  const assignmentView = document.getElementById('assignment-view');
  if (assignmentView) {
    assignmentView.classList.remove('hidden');
  }

  if (state.assignmentState) {
    renderAssignmentUI(state.assignmentState);
  }

  // Nút chuyển về Kỳ thi và Nút Đổi hoạt động
  const backToExamBtn = document.getElementById('assignment-back-to-exam-btn');
  const backToExamText = document.getElementById('assignment-back-to-exam-text');
  const assBtnChange = document.getElementById('assignment-btn-change-activity');

  if (state.examState && state.examState.status !== 'closed') {
    backToExamBtn?.classList.remove('hidden');
    assBtnChange?.classList.remove('hidden');
    if (backToExamText) {
      backToExamText.textContent = state.examIsSubmitted ? 'Xem kết quả thi' : 'Sang làm bài thi';
    }
  } else {
    backToExamBtn?.classList.add('hidden');
    assBtnChange?.classList.add('hidden');
  }
}

export function switchBackToExamView() {
  state.activeView = 'exam';
  state.userChosenActivity = 'exam';
  document.getElementById('assignment-view')?.classList.add('hidden');
  const examView = document.getElementById('exam-view');
  if (examView) {
    examView.classList.remove('hidden');
  }
  if (state.examRunId && state.examState) {
    import('./exam.js').then(m => m.handleExamUpdate(state.examRunId, state.examState)).catch(() => {});
  }
}

export function handleAssignmentUpdate(runId, assignmentState) {
  state.assignmentRunId = runId;
  state.assignmentState = assignmentState;

  // Cập nhật DOM của assignment-view trong background
  renderAssignmentUI(assignmentState);

  // Cập nhật thẻ thông báo ở phòng chờ Lobby (nếu học sinh đang ở Lobby)
  const lobbyBanner = document.getElementById('lobby-assignment-banner');
  const lobbyTitle = document.getElementById('lobby-assignment-title');
  if (lobbyBanner && lobbyTitle) {
    lobbyTitle.textContent = assignmentState.title || 'Thu - phát bài tập';
    lobbyBanner.classList.remove('hidden');
  }

  // QUY TẮC ĐA NHIỆM SONG SONG:
  // Nếu đang có cả Kì thi và Thu bài cùng chạy:
  if (state.examState && state.examState.status !== 'closed') {
    // 1. Học sinh đang chọn thi: không cướp màn hình
    if (state.userChosenActivity === 'exam') {
      const toAssBtnBox = document.getElementById('exam-to-assignment-box');
      if (toAssBtnBox && state.examIsSubmitted) toAssBtnBox.classList.remove('hidden');
      return;
    }
    // 2. Học sinh mới vào và chưa chọn hoạt động: không cướp màn hình, giữ ở bảng chọn
    if (state.userChosenActivity === null) {
      return;
    }
  }

  // Nếu học sinh đã nộp bài thi trắc nghiệm và đang ở màn hình thi: giữ màn hình kết quả thi trừ khi đã chọn assignment
  if (state.examIsSubmitted && state.activeView === 'exam' && state.userChosenActivity !== 'assignment') {
    const toAssBtnBox = document.getElementById('exam-to-assignment-box');
    if (toAssBtnBox) toAssBtnBox.classList.remove('hidden');
    return;
  }

  // Nếu đang ở màn hình khác hoặc học sinh đã chọn xem assignment:
  switchToAssignmentView();
}

export function handleStudentFileSelected(files) {
  const file = files?.[0];
  if (!file) return;

  const errEl = document.getElementById('assignment-upload-error');
  if (errEl) errEl.classList.add('hidden');

  const ast = state.assignmentState;
  const maxBytes = (ast?.maxFileSizeMb || 50) * 1024 * 1024;

  if (file.size > maxBytes) {
    showError(`Tệp quá lớn (${formatFileSize(file.size)}). Giới hạn tối đa là ${ast?.maxFileSizeMb || 50}MB.`);
    return;
  }

  if (ast?.allowedExtensions && ast.allowedExtensions.length > 0) {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isAllowed = ast.allowedExtensions.some(
      a => a.toLowerCase() === ext || a.toLowerCase() === ext.replace('.', '')
    );
    if (!isAllowed) {
      showError(`Định dạng "${ext}" không được chấp nhận. Chỉ nhận: ${ast.allowedExtensions.join(', ')}`);
      return;
    }
  }

  state.assignmentSelectedFile = file;

  const infoEl = document.getElementById('assignment-selected-info');
  const nameEl = document.getElementById('assignment-selected-name');
  const sizeEl = document.getElementById('assignment-selected-size');
  const submitBtn = document.getElementById('assignment-submit-btn');

  if (infoEl) infoEl.classList.remove('hidden');
  if (nameEl) nameEl.textContent = `📄 ${file.name}`;
  if (sizeEl) sizeEl.textContent = formatFileSize(file.size);
  if (submitBtn) submitBtn.classList.remove('hidden');
}

export function handleClearSelectedStudentFile() {
  state.assignmentSelectedFile = null;
  const infoEl = document.getElementById('assignment-selected-info');
  const submitBtn = document.getElementById('assignment-submit-btn');
  const inputEl = document.getElementById('assignment-file-input');

  if (infoEl) infoEl.classList.add('hidden');
  if (submitBtn) submitBtn.classList.add('hidden');
  if (inputEl) inputEl.value = '';
}

export function handleShowResubmitForm() {
  state.isShowingResubmitForm = true;
  const uploadBox = document.getElementById('assignment-upload-box');
  if (uploadBox) {
    uploadBox.classList.remove('hidden');
    uploadBox.scrollIntoView({ behavior: 'smooth' });
  }
}

export async function handleUploadAndSubmitAssignment() {
  const file = state.assignmentSelectedFile;
  if (!file) {
    showError('Vui lòng chọn tệp trước khi nộp.');
    return;
  }

  const submitBtn = document.getElementById('assignment-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang tải bài lên máy chủ...';
  }

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const sessionId = state.sessionData?.id || state.sessionData?.session?.id || 'active';
        const runId = state.assignmentRunId || state.currentRunId || 'current';

        const res = await fetch(`/api/sessions/${sessionId}/activities/${runId}/assignment/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: state.participantId,
            displayName: state.studentName,
            studentCode: state.selectedStudent?.studentCode || state.selectedStudent?.code || undefined,
            filename: file.name,
            fileSize: file.size,
            mime: file.type || 'application/octet-stream',
            base64: base64Data,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Nộp bài thất bại');
        }

        const data = await res.json();
        handleClearSelectedStudentFile();
        state.isShowingResubmitForm = false;

        // Cập nhật lại giao diện đã nộp
        if (state.assignmentState) {
          state.assignmentState.submissions = state.assignmentState.submissions || {};
          state.assignmentState.submissions[state.participantId] = data.submission;
          handleAssignmentUpdate(runId, state.assignmentState);
        }

        alert('🎉 Chúc mừng bạn đã nộp bài thành công!');
      } catch (err) {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('failed to fetch')) {
          showError('Không thể gửi tệp lên máy chủ (Có thể tệp quá lớn hoặc kết nối mạng bị gián đoạn).');
        } else {
          showError(msg || 'Lỗi khi tải bài nộp lên.');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Xác nhận nộp bài';
        }
      }
    };

    reader.onerror = () => {
      showError('Không thể đọc tệp trên thiết bị này.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Xác nhận nộp bài';
      }
    };

    reader.readAsDataURL(file);
  } catch (err) {
    showError(err.message || 'Lỗi xử lý tệp.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 Xác nhận nộp bài';
    }
  }
}

function showMaterialAlertPopup(material) {
  // Hiển thị thông báo nổi bật cho học sinh biết có tài liệu phát xuống (Phương án A)
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e3a8a;
    color: #ffffff;
    padding: 14px 20px;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 90vw;
    width: 420px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    animation: fadeIn 0.3s ease-out;
  `;

  banner.innerHTML = `
    <div style="min-width:0;">
      <div style="font-weight:800; font-size:14px;">📢 TÀI LIỆU MỚI TỪ THẦY/CÔ!</div>
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.9;">${escapeHtml(material.name)}</div>
    </div>
    <div style="display:flex; gap:6px; shrink:0;">
      <a href="${material.url}" download="${escapeHtml(material.name)}" style="background:#22c55e; color:#fff; padding:6px 12px; border-radius:8px; font-weight:700; text-decoration:none;">Tải về</a>
      <button type="button" style="background:transparent; border:none; color:#fff; font-size:16px; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;

  document.body.appendChild(banner);
  setTimeout(() => {
    if (banner.parentElement) banner.remove();
  }, 10000);
}

function showError(msg) {
  const errEl = document.getElementById('assignment-upload-error');
  if (errEl) {
    errEl.textContent = `⚠️ ${msg}`;
    errEl.classList.remove('hidden');
  } else {
    alert(msg);
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
