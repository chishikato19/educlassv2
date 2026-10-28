/**
 * EduClass v2 — Student Portal Exam Activity (Task 4)
 * Quản lý làm bài thi, phân phối đề cá nhân hóa, đồng hồ đếm ngược, lưu đáp án tức thì, nộp bài & xem lại
 */

import { state } from './state.js';
import { renderMath } from './utils.js';

export function handleExamUpdate(runId, examStateData) {
  if (state.currentRunId !== runId) {
    state.currentRunId = runId;
    state.examAnswers = {};
    if (typeof document !== 'undefined') {
      const qListEl = document.getElementById('exam-questions-list');
      if (qListEl) qListEl.innerHTML = '';
    }
  }
  state.examState = examStateData;

  const myStatus = examStateData.participants?.[state.participantId];
  state.examIsSubmitted = Boolean(myStatus?.isSubmitted || examStateData.status === 'closed');

  // Tự động đồng bộ tên thật và nhận đề thi cá nhân hóa (xáo câu & xáo đáp án)
  const isWaitingPassword = examStateData.hasPassword && (!myStatus || !myStatus.authenticated);
  const needsPaper =
    !isWaitingPassword &&
    (!myStatus ||
      !myStatus.questionOrder ||
      myStatus.questionOrder.length === 0 ||
      myStatus.displayName.startsWith('Thí sinh '));

  if (
    state.currentRunId &&
    state.sessionData &&
    state.participantToken &&
    needsPaper &&
    typeof window !== 'undefined' &&
    !window._fetchingExamPaper
  ) {
    window._fetchingExamPaper = true;
    fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'get_paper',
          displayName: state.studentName,
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.state) {
          handleExamUpdate(state.currentRunId, data.state);
        }
      })
      .catch(() => {})
      .finally(() => {
        window._fetchingExamPaper = false;
      });
  }

  if (typeof document === 'undefined') return;

  state.examRunId = runId;

  // QUY TẮC ĐA NHIỆM SONG SONG:
  // 1. Nếu học sinh đang chọn nộp bài thực hành: không giật màn hình
  if (state.assignmentState && state.userChosenActivity === 'assignment') {
    return;
  }
  // 2. Nếu học sinh mới vào và chưa chọn hoạt động: không tự ý đẩy vào kì thi, giữ ở bảng chọn
  if (state.assignmentState && state.userChosenActivity === null) {
    return;
  }

  // Trường hợp 1: Đã nộp bài hoặc kỳ thi đã kết thúc
  if (state.examIsSubmitted) {
    if (typeof window !== 'undefined' && window.educlassStudent?.unlockKioskMode) {
      window.educlassStudent.unlockKioskMode();
    }
    if (state.examSubmittedDismissed) {
      // Học sinh đã chủ động bấm "Về phòng chờ", không ép quay lại exam-view nữa!
      return;
    }
    if (state.activeView === 'assignment') {
      // Học sinh đã chuyển sang màn hình nộp bài thực hành!
      return;
    }

    document.getElementById('join-view')?.classList.add('hidden');
    document.getElementById('lobby-view')?.classList.add('hidden');
    document.getElementById('quiz-view')?.classList.add('hidden');
    document.getElementById('quiz-finished-view')?.classList.add('hidden');
    document.getElementById('poll-view')?.classList.add('hidden');
    const swissView = document.getElementById('swiss-duel-view');
    if (swissView) swissView.classList.add('hidden');
    document.getElementById('exam-view')?.classList.remove('hidden');

    document.getElementById('exam-password-box')?.classList.add('hidden');
    document.getElementById('exam-waiting-box')?.classList.add('hidden');
    document.getElementById('exam-paper-box')?.classList.add('hidden');
    document.getElementById('exam-submitted-box')?.classList.remove('hidden');

    // Cập nhật tên học sinh trên header & màn hình nộp bài
    const currentStudentName =
      state.studentName ||
      myStatus?.displayName ||
      state.selectedStudent?.fullName ||
      'Thí sinh';

    const studentBadgeName = document.getElementById('exam-student-name');
    if (studentBadgeName) studentBadgeName.textContent = currentStudentName;

    const submittedStudentName = document.getElementById('exam-submitted-student-name');
    if (submittedStudentName) submittedStudentName.textContent = currentStudentName;

    const scoreStudentName = document.getElementById('exam-score-student-name');
    if (scoreStudentName) scoreStudentName.textContent = `Thí sinh: ${currentStudentName}`;

    // Hiển thị Điểm số nếu cho phép
    const scoreCard = document.getElementById('exam-score-card');
    const scoreVal = document.getElementById('exam-score-val');
    const scoreDetail = document.getElementById('exam-score-detail');

    let res = myStatus?.result;
    if (!res && examStateData.results && examStateData.results.length > 0) {
      res = examStateData.results.find((r) => r.participantId === state.participantId);
    }

    const allowScore = examStateData.allowViewScore !== false;
    if (res && allowScore && scoreCard && scoreVal && scoreDetail) {
      scoreCard.classList.remove('hidden');
      scoreVal.textContent = `${res.score} / ${res.maxScore}`;
      scoreDetail.textContent = `Đúng ${res.correctCount}/${res.totalQuestions} câu (${res.percentage}%)`;
    } else if (scoreCard) {
      scoreCard.classList.add('hidden');
    }

    // Hiển thị Nút xem lại bài làm & đáp án nếu cho phép
    const reviewBtnBox = document.getElementById('exam-review-btn-box');
    const reviewContainer = document.getElementById('exam-review-container');
    const allowReview = examStateData.allowViewReview !== false;

    if (myStatus?.reviewData && myStatus.reviewData.length > 0 && allowReview) {
      reviewBtnBox?.classList.remove('hidden');
    } else {
      reviewBtnBox?.classList.add('hidden');
      reviewContainer?.classList.add('hidden');
    }

    // Hiển thị Nút chuyển sang nộp bài thực hành nếu có Assignment Hub đang mở song song
    const toAssBtnBox = document.getElementById('exam-to-assignment-box');
    if (toAssBtnBox) {
      if (state.assignmentState) {
        toAssBtnBox.classList.remove('hidden');
      } else {
        toAssBtnBox.classList.add('hidden');
      }
    }
    return;
  }

  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  const swissView = document.getElementById('swiss-duel-view');
  if (swissView) swissView.classList.add('hidden');
  document.getElementById('exam-view')?.classList.remove('hidden');

  const titleEl = document.getElementById('exam-title');
  if (titleEl) titleEl.textContent = examStateData.title || 'Kỳ Thi';
  const subTitleEl = document.getElementById('exam-subtitle');
  if (subTitleEl) {
    subTitleEl.textContent = `Thời lượng: ${examStateData.durationMinutes} phút · ${examStateData.totalQuestions} câu hỏi`;
  }

  // Cập nhật tên học sinh trên header & màn hình chờ
  const currentStudentName =
    state.studentName ||
    myStatus?.displayName ||
    state.selectedStudent?.fullName ||
    'Thí sinh';
  const studentBadgeName = document.getElementById('exam-student-name');
  if (studentBadgeName) studentBadgeName.textContent = currentStudentName;

  const waitingStudentName = document.getElementById('exam-waiting-student-name');
  if (waitingStudentName) waitingStudentName.textContent = currentStudentName;

  // Cập nhật banner chuyển sang Thu - phát bài nếu đang mở song song
  const examParallelBar = document.getElementById('exam-parallel-assignment-bar');
  const examParallelTitle = document.getElementById('exam-parallel-assignment-title');
  const examBtnChange = document.getElementById('exam-btn-change-activity');
  if (state.assignmentState) {
    examParallelBar?.classList.remove('hidden');
    if (examParallelTitle) {
      examParallelTitle.textContent = state.assignmentState.title || 'Thu - phát bài tập';
    }
    examBtnChange?.classList.remove('hidden');
  } else {
    examParallelBar?.classList.add('hidden');
    examBtnChange?.classList.add('hidden');
  }

  updateExamCountdown(examStateData);

  // Trường hợp 2: Có mật khẩu và học sinh chưa mở khóa
  if (examStateData.hasPassword && (!myStatus || !myStatus.authenticated)) {
    document.getElementById('exam-password-box')?.classList.remove('hidden');
    document.getElementById('exam-waiting-box')?.classList.add('hidden');
    document.getElementById('exam-paper-box')?.classList.add('hidden');
    document.getElementById('exam-submitted-box')?.classList.add('hidden');
    return;
  }

  // Trường hợp 3: Đang ở trạng thái chờ mở đề
  if (examStateData.status === 'ready') {
    document.getElementById('exam-password-box')?.classList.add('hidden');
    document.getElementById('exam-waiting-box')?.classList.remove('hidden');
    document.getElementById('exam-paper-box')?.classList.add('hidden');
    document.getElementById('exam-submitted-box')?.classList.add('hidden');
    return;
  }

  // Trường hợp 4: Đang làm bài (status === 'in_progress')
  if (typeof window !== 'undefined' && window.educlassStudent?.lockKioskMode) {
    window.educlassStudent.lockKioskMode();
  }
  document.getElementById('exam-password-box')?.classList.add('hidden');
  document.getElementById('exam-waiting-box')?.classList.add('hidden');
  document.getElementById('exam-submitted-box')?.classList.add('hidden');
  document.getElementById('exam-paper-box')?.classList.remove('hidden');

  // CHỈ LẤY ĐÁP ÁN CỦA HỌC SINH HIỆN TẠI, TUYỆT ĐỐI KHÔNG MERGE BÀI CŨ
  state.examAnswers = myStatus && myStatus.answers ? { ...myStatus.answers } : {};

  const studentQuestions = getStudentExamQuestions(examStateData);
  renderExamQuestions(examStateData);
  updateExamNavPalette(studentQuestions);
}

export function getStudentExamQuestions(examStateData) {
  const publicQuestions = examStateData?.publicQuestions || [];
  const myStatus = examStateData?.participants?.[state.participantId];
  const order = myStatus?.questionOrder;
  if (!order || !Array.isArray(order) || order.length === 0) {
    return publicQuestions;
  }
  const qMap = new Map();
  publicQuestions.forEach((q) => qMap.set(q.id, q));
  const result = [];
  for (const qId of order) {
    const found = qMap.get(qId);
    if (found) result.push(found);
  }
  for (const q of publicQuestions) {
    if (!result.some((r) => r.id === q.id)) result.push(q);
  }
  return result;
}

export function getStudentExamOptions(q, examStateData) {
  const baseOpts = q.options || ['A', 'B', 'C', 'D'];
  if (q.type !== 'mcq4') return baseOpts;
  const myStatus = examStateData?.participants?.[state.participantId];
  const optOrder = myStatus?.optionOrders?.[q.id];
  if (optOrder && Array.isArray(optOrder) && optOrder.length === 4) {
    return optOrder.map((origIdx) => baseOpts[origIdx]);
  }
  return baseOpts;
}

export function updateExamCountdown(examStateData) {
  if (state.examTimerInterval) clearInterval(state.examTimerInterval);
  if (typeof document === 'undefined') return;
  const timerEl = document.getElementById('exam-countdown');
  const myStatus = examStateData.participants?.[state.participantId];

  if (examStateData.status !== 'in_progress') {
    if (timerEl) timerEl.textContent = `⏱️ ${examStateData.durationMinutes} phút`;
    return;
  }

  // Ưu tiên thời gian riêng của thí sinh này
  const effectiveExpires =
    myStatus?.individualExpiresAt ||
    (myStatus?.startedAt
      ? myStatus.startedAt +
        examStateData.durationMinutes * 60 * 1000 +
        (myStatus.extendedMinutes || 0) * 60 * 1000
      : examStateData.expiresAt);

  if (!effectiveExpires) {
    if (timerEl) timerEl.textContent = `⏱️ ${examStateData.durationMinutes} phút`;
    return;
  }

  function tick() {
    const remainingMs = Math.max(0, effectiveExpires - Date.now());
    const totalSecs = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (timerEl) {
      timerEl.textContent = `⏳ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (remainingMs <= 0) {
      clearInterval(state.examTimerInterval);
      if (timerEl) timerEl.textContent = 'Hết giờ!';
      if (!state.examIsSubmitted) {
        handleSubmitExam(true);
      }
    }
  }
  tick();
  state.examTimerInterval = setInterval(tick, 1000);
}

// Cập nhật bảng câu hỏi đã làm / chưa làm (Question Palette)
export function updateExamNavPalette(qList) {
  if (typeof document === 'undefined') return;
  const grid = document.getElementById('exam-nav-grid');
  if (!grid) return;
  grid.innerHTML = '';
  let answeredCount = 0;
  const total = qList.length;

  qList.forEach((q, idx) => {
    const ans = state.examAnswers[q.id];
    let isAnswered = ans !== undefined && ans !== null && ans !== '';
    if (isAnswered) {
      if (q.type === 'matching') {
        const pairs = typeof ans === 'object' && ans !== null && 'pairs' in ans ? ans.pairs : ans;
        isAnswered = pairs ? Object.values(pairs).some(Boolean) : false;
      } else if (q.type === 'cloze_drag') {
        const filled = typeof ans === 'object' && ans !== null && 'filled' in ans ? ans.filled : ans;
        isAnswered = filled ? Object.values(filled).some(Boolean) : false;
      }
    }
    if (isAnswered) answeredCount++;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exam-nav-btn' + (isAnswered ? ' answered' : '');
    btn.innerHTML = `${idx + 1}${isAnswered ? ' ✓' : ''}`;
    btn.title = `Chuyển đến Câu ${idx + 1} (${isAnswered ? 'Đã làm' : 'Chưa làm'})`;
    btn.onclick = () => {
      const card = document.querySelector(`[data-qid="${q.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.transition = 'box-shadow 0.25s, border-color 0.25s';
        card.style.borderColor = '#3b82f6';
        card.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.4)';
        setTimeout(() => {
          card.style.borderColor = 'var(--color-border)';
          card.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
        }, 1200);
      }
    };
    grid.appendChild(btn);
  });

  const summaryEl = document.getElementById('exam-nav-summary');
  if (summaryEl) {
    summaryEl.textContent = `Đã làm: ${answeredCount}/${total} câu`;
    summaryEl.style.color = answeredCount === total ? '#15803d' : '#2563eb';
    summaryEl.style.background = answeredCount === total ? '#dcfce7' : '#eff6ff';
  }
}

export function renderExamQuestions(examStateData) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('exam-questions-list');
  if (!container) return;
  const qList = getStudentExamQuestions(examStateData);

  // Kiểm tra xem thứ tự hiển thị hiện tại có khớp với questionOrder hay không
  const currentOrderKey = qList.map((q) => q.id).join(',');
  const existingOrderKey = container.getAttribute('data-order-key');

  // Nếu số lượng thẻ khớp VÀ đúng thứ tự thì chỉ cập nhật trạng thái selected để tránh giật giao diện
  if (container.children.length === qList.length && qList.length > 0 && existingOrderKey === currentOrderKey) {
    qList.forEach((q) => {
      const curAns = state.examAnswers[q.id];
      const card = container.querySelector(`[data-qid="${q.id}"]`);
      if (!card) return;
      const optEls = card.querySelectorAll('.exam-q-opt');
      optEls.forEach((el, oIdx) => {
        const optVal = q.type === 'tf' ? oIdx === 0 : oIdx;
        if (curAns !== undefined && curAns === optVal) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    });
    return;
  }

  container.setAttribute('data-order-key', currentOrderKey);
  container.innerHTML = '';
  qList.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'exam-q-card';
    card.setAttribute('data-qid', q.id);

    const curAns = state.examAnswers[q.id];

    let optionsHtml = '';
    if (q.type === 'mcq4') {
      const opts = getStudentExamOptions(q, examStateData);
      optionsHtml = opts
        .map((opt, oIdx) => {
          const optText = typeof opt === 'object' && opt ? opt.text || '' : String(opt);
          const isSelected = curAns !== undefined && Number(curAns) === oIdx;
          const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);
          return `
            <div class="exam-q-opt ${isSelected ? 'selected' : ''}" onclick="handleSelectExamAnswer('${q.id}', ${oIdx})">
              <span style="display:inline-flex; width:26px; height:26px; border-radius:50%; background:#e2e8f0; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${letter}</span>
              <div style="flex:1;">${renderMath(optText)}</div>
            </div>
          `;
        })
        .join('');
    } else if (q.type === 'tf') {
      const isTrueSelected = curAns === true;
      const isFalseSelected = curAns === false;
      optionsHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="exam-q-opt ${isTrueSelected ? 'selected' : ''}" onclick="handleSelectExamAnswer('${q.id}', true)">
            <span style="font-weight:700;">✓ Đúng</span>
          </div>
          <div class="exam-q-opt ${isFalseSelected ? 'selected' : ''}" onclick="handleSelectExamAnswer('${q.id}', false)">
            <span style="font-weight:700;">✗ Sai</span>
          </div>
        </div>
      `;
    } else if (q.type === 'short') {
      const currentVal = curAns !== undefined ? String(curAns) : '';
      optionsHtml = `
        <input type="text" class="input-name" placeholder="Nhập câu trả lời ngắn của bạn..." value="${currentVal}"
          onchange="handleSelectExamAnswer('${q.id}', this.value)" style="margin-top:4px;" />
      `;
    } else if (q.type === 'matching') {
      const leftItems = Array.isArray(q.leftItems) ? q.leftItems : [];
      const rightItems = Array.isArray(q.rightItems) ? q.rightItems : [];
      const currentPairs =
        typeof curAns === 'object' && curAns !== null
          ? ('pairs' in curAns ? curAns.pairs : curAns)
          : {};

      optionsHtml = `
        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
            Ghép từng mục Cột A với mục tương ứng ở Cột B:
          </div>
          ${leftItems
            .map((left, lIdx) => {
              const leftText = typeof left.text === 'object' && left.text ? left.text.text : String(left.text || '');
              const selRight = currentPairs[left.id] || '';
              return `
                <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; gap: 6px;">
                  <div style="font-weight: 600; font-size: 14px; color: #1e293b;">
                    <strong>${lIdx + 1}.</strong> ${renderMath(leftText)}
                  </div>
                  <select onchange="window.handleSelectExamMatchingPair('${q.id}', '${left.id}', this.value)"
                    style="min-height: 44px; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; font-weight: 600; background: #fff;">
                    <option value="">-- Ghép với Cột B --</option>
                    ${rightItems
                      .map((right, rIdx) => {
                        const rightText = typeof right.text === 'object' && right.text ? right.text.text : String(right.text || '');
                        const isSel = selRight === right.id ? 'selected' : '';
                        const letter = String.fromCharCode(65 + rIdx);
                        return `<option value="${right.id}" ${isSel}>${letter}. ${rightText}</option>`;
                      })
                      .join('')}
                  </select>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    } else if (q.type === 'cloze_drag') {
      const wordBank = Array.isArray(q.wordBank) ? q.wordBank : [];
      const blanks = Array.isArray(q.blanks) ? q.blanks : [];
      const currentFilled =
        typeof curAns === 'object' && curAns !== null
          ? ('filled' in curAns ? curAns.filled : curAns)
          : {};

      optionsHtml = `
        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
          ${
            wordBank.length > 0
              ? `
            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Từ khóa gợi ý:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${wordBank.map((w) => `<span style="background: #fff; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #334155;">${w}</span>`).join('')}
              </div>
            </div>
          `
              : ''
          }
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b; font-weight: 500;">
            ${renderMath(q.template || '')}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${blanks
              .map((b) => {
                const curVal = currentFilled[b.id] || '';
                return `
                  <div style="display: flex; align-items: center; gap: 8px; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <span style="font-size: 13px; font-weight: 700; color: #475569; min-width: 65px;">Ô [${b.id}]:</span>
                    <select onchange="window.handleSelectExamClozeBlank('${q.id}', '${b.id}', this.value)"
                      style="flex: 1; min-height: 44px; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; font-weight: 600; background: #f8fafc;">
                      <option value="">-- Chọn từ điền --</option>
                      ${wordBank
                        .map((word) => {
                          const isSel = curVal === word ? 'selected' : '';
                          return `<option value="${word}" ${isSel}>${word}</option>`;
                        })
                        .join('')}
                    </select>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    const stemText = typeof q.stem === 'object' && q.stem ? q.stem.text || '' : String(q.stem || '');
    let imagesHtml = '';
    const qImages =
      q.stem && Array.isArray(q.stem.images) && q.stem.images.length > 0
        ? q.stem.images
        : Array.isArray(q.images) && q.images.length > 0
          ? q.images
          : [];
    if (qImages.length > 0) {
      imagesHtml = qImages
        .map(
          (imgUrl) => `
        <div style="text-align: center; margin: 8px 0;">
          <img src="${imgUrl}" alt="Hình ảnh câu hỏi" style="max-height: 220px; max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: contain;" />
        </div>
      `
        )
        .join('');
    }

    card.innerHTML = `
      <div class="exam-q-header">
        <span>Câu ${idx + 1}</span>
        <span>${q.points || 1} điểm</span>
      </div>
      <div class="exam-q-stem">${renderMath(stemText)}</div>
      ${imagesHtml}
      ${optionsHtml}
    `;
    container.appendChild(card);
  });
}

export async function handleSelectExamAnswer(questionId, answer) {
  state.examAnswers[questionId] = answer;

  if (typeof document !== 'undefined') {
    // Cập nhật ngay style cho lựa chọn
    const card = document.querySelector(`[data-qid="${questionId}"]`);
    if (card) {
      const optEls = card.querySelectorAll('.exam-q-opt');
      optEls.forEach((el, oIdx) => {
        const optVal = el.textContent.includes('Đúng') ? true : el.textContent.includes('Sai') ? false : oIdx;
        if (answer === optVal) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    }

    // Cập nhật bảng Question Palette ngay lập tức
    if (state.examState) {
      updateExamNavPalette(getStudentExamQuestions(state.examState));
    }
  }

  if (!state.currentRunId || !state.sessionData) return;
  try {
    await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'save_answer',
          questionId,
          answer,
          displayName: state.studentName,
        },
      }),
    });
  } catch {}
}

export function handleSelectExamMatchingPair(questionId, leftId, rightId) {
  const cur = state.examAnswers[questionId];
  const pairs = typeof cur === 'object' && cur !== null ? ('pairs' in cur ? { ...cur.pairs } : { ...cur }) : {};
  if (rightId) {
    pairs[leftId] = rightId;
  } else {
    delete pairs[leftId];
  }
  handleSelectExamAnswer(questionId, { pairs });
}

export function handleSelectExamClozeBlank(questionId, blankId, val) {
  const cur = state.examAnswers[questionId];
  const filled = typeof cur === 'object' && cur !== null ? ('filled' in cur ? { ...cur.filled } : { ...cur }) : {};
  if (val) {
    filled[blankId] = val;
  } else {
    delete filled[blankId];
  }
  handleSelectExamAnswer(questionId, { filled });
}

if (typeof window !== 'undefined') {
  window.handleSelectExamMatchingPair = handleSelectExamMatchingPair;
  window.handleSelectExamClozeBlank = handleSelectExamClozeBlank;
}

export async function handleSubmitExam(isAuto = false) {
  if (!isAuto) {
    const studentQuestions = getStudentExamQuestions(state.examState);
    const unanswered = [];
    studentQuestions.forEach((q, idx) => {
      const ans = state.examAnswers[q.id];
      let hasAns = false;
      if (ans !== undefined && ans !== null && ans !== '') {
        if (q.type === 'matching') {
          const pairs = typeof ans === 'object' && ans !== null && 'pairs' in ans ? ans.pairs : ans;
          hasAns = pairs ? Object.values(pairs).some(Boolean) : false;
        } else if (q.type === 'cloze_drag') {
          const filled = typeof ans === 'object' && ans !== null && 'filled' in ans ? ans.filled : ans;
          hasAns = filled ? Object.values(filled).some(Boolean) : false;
        } else {
          hasAns = true;
        }
      }
      if (!hasAns) {
        unanswered.push(idx + 1);
      }
    });

    if (unanswered.length > 0) {
      const firstUnansweredIdx = unanswered[0];
      const firstQ = studentQuestions[firstUnansweredIdx - 1];
      alert(
        `⚠️ Bạn chưa hoàn thành tất cả các câu hỏi!\n` +
          `Hiện còn ${unanswered.length}/${studentQuestions.length} câu chưa làm (Câu: ${unanswered.join(', ')}).\n` +
          `Vui lòng tiếp tục làm bài và hoàn thành tất cả các câu hỏi trước khi nộp bài.`
      );
      if (firstQ && typeof document !== 'undefined') {
        const card = document.querySelector(`[data-qid="${firstQ.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.transition = 'box-shadow 0.25s, border-color 0.25s';
          card.style.borderColor = '#ef4444';
          card.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.4)';
          setTimeout(() => {
            card.style.borderColor = 'var(--color-border)';
            card.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
          }, 1800);
        }
      }
      return;
    }

    if (
      !confirm(
        'Bạn đã hoàn thành đủ các câu hỏi! Bạn có chắc chắn muốn nộp bài thi không? Sau khi nộp sẽ không thể chỉnh sửa đáp án.'
      )
    ) {
      return;
    }
  }
  if (!state.currentRunId || !state.sessionData) return;
  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'submit_exam',
          displayName: state.studentName,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        handleExamUpdate(state.currentRunId, data.state);
      }
    }
  } catch {}
}

export function toggleExamReview() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('exam-review-container');
  const btnText = document.getElementById('exam-review-btn-text');
  if (!container) return;
  if (!container.classList.contains('hidden')) {
    container.classList.add('hidden');
    if (btnText) btnText.textContent = 'Xem lại bài làm & Đáp án đúng';
    return;
  }

  const myStatus = state.examState?.participants?.[state.participantId];
  const reviewData = myStatus?.reviewData || [];
  if (reviewData.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: var(--color-muted); padding: 12px;">Chưa có dữ liệu giải thích bài làm.</div>';
    container.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Ẩn xem lại bài làm';
    return;
  }

  const currentStudentName = state.studentName || myStatus?.displayName || state.selectedStudent?.fullName || 'Học sinh';
  container.innerHTML = `<div style="padding: 8px 12px; margin-bottom: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 13px; font-weight: 700; color: #1e40af;">👤 Bài làm của thí sinh: ${currentStudentName}</div>`;
  reviewData.forEach((rev, idx) => {
    const card = document.createElement('div');
    const isPartial = !rev.isCorrect && typeof rev.pointsEarned === 'number' && rev.pointsEarned > 0;
    const hasStudentAns =
      rev.studentAnswer !== undefined &&
      rev.studentAnswer !== null &&
      rev.studentAnswer !== '' &&
      rev.studentAnswer !== 'Chưa làm' &&
      (Array.isArray(rev.studentAnswer) ? rev.studentAnswer.some((x) => x !== null) : true);

    card.style.cssText = `
      padding: 12px; margin-bottom: 12px; border-radius: 12px; border: 1.5px solid ${
        rev.isCorrect
          ? '#86efac'
          : isPartial
            ? '#fcd34d'
            : hasStudentAns
              ? '#fca5a5'
              : '#e2e8f0'
      };
      background-color: ${
        rev.isCorrect
          ? '#f0fdf4'
          : isPartial
            ? '#fffbeb'
            : hasStudentAns
              ? '#fff1f2'
              : '#f8fafc'
      };
    `;

    let optionsHtml = '';
    if (rev.type === 'tf_group' && Array.isArray(rev.items)) {
      optionsHtml = `
        <div style="margin-top:6px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:11px; font-weight:700; color:#475569; margin-bottom:2px;">
            Mệnh đề Đúng / Sai (Barem Bộ Giáo dục 0.1 - 0.25 - 0.5 - 1.0):
          </div>
          ${rev.items
            .map((it) => {
              const itCorrect = Boolean(it.correctAnswer ?? it.correct);
              const itStudent = it.studentAnswer !== undefined ? it.studentAnswer : null;
              const itIsCorrect =
                it.isCorrect !== undefined
                  ? Boolean(it.isCorrect)
                  : itStudent !== null && itStudent === itCorrect;
              let imgStr = '';
              if (Array.isArray(it.images) && it.images.length > 0) {
                imgStr = it.images
                  .map(
                    (img) =>
                      `<img src="${img}" style="max-height:80px; max-width:100%; border-radius:4px; margin-top:4px;" />`
                  )
                  .join('');
              }
              const itemText =
                typeof it.text === 'object' && it.text ? it.text.text || '' : String(it.text || '');
              return `
              <div style="display:flex; flex-direction:column; gap:4px; padding:8px 10px; border-radius:8px; border:1px solid ${
                itIsCorrect ? '#86efac' : itStudent !== null ? '#fca5a5' : '#e2e8f0'
              }; background-color: ${
                itIsCorrect ? '#f0fdf4' : itStudent !== null ? '#fff1f2' : '#ffffff'
              }; font-size:12.5px;">
                <div style="display:flex; align-items:flex-start; gap:6px;">
                  <strong style="color:var(--color-text);">${it.label || ''})</strong>
                  <div style="flex:1;">${renderMath(itemText)}</div>
                </div>
                ${imgStr}
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11.5px; border-top:1px dashed #e2e8f0; padding-top:4px; margin-top:2px;">
                  <span>Bạn chọn: <strong style="color:${itStudent === true ? '#15803d' : itStudent === false ? '#b91c1c' : '#64748b'}">${itStudent === true ? 'Đúng' : itStudent === false ? 'Sai' : 'Chưa chọn'}</strong></span>
                  <span>Đáp án: <strong style="color:${itCorrect ? '#15803d' : '#b91c1c'}">${itCorrect ? 'Đúng' : 'Sai'}</strong></span>
                  <span style="font-weight:800; color:${itIsCorrect ? '#15803d' : '#b91c1c'}">${itIsCorrect ? '✓ Đúng' : itStudent !== null ? '✗ Sai' : '⚪'}</span>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;
    } else if (rev.type === 'tf') {
      const isStudentTrue = rev.studentChoiceLabel === 'Đúng' || rev.studentAnswer === true;
      const isStudentFalse = rev.studentChoiceLabel === 'Sai' || rev.studentAnswer === false;
      const isCorrectTrue = rev.correctChoiceLabel === 'Đúng' || rev.correctAnswer === true;
      const isCorrectFalse = rev.correctChoiceLabel === 'Sai' || rev.correctAnswer === false;

      optionsHtml = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
          <div style="padding:8px 10px; border-radius:8px; font-size:13px; border:1.5px solid ${
            isCorrectTrue ? '#86efac' : isStudentTrue ? '#fca5a5' : '#e2e8f0'
          }; background-color:${
            isCorrectTrue ? '#dcfce7' : isStudentTrue ? '#fee2e2' : '#ffffff'
          }; display:flex; align-items:center; justify-content:space-between;">
            <strong>✔ Đúng</strong>
            <span style="font-size:11px; font-weight:800; color:${isCorrectTrue ? '#15803d' : '#b91c1c'}">
              ${isCorrectTrue ? '✓ Đáp án đúng' : isStudentTrue ? '✗ Bạn đã chọn' : ''}
            </span>
          </div>
          <div style="padding:8px 10px; border-radius:8px; font-size:13px; border:1.5px solid ${
            isCorrectFalse ? '#86efac' : isStudentFalse ? '#fca5a5' : '#e2e8f0'
          }; background-color:${
            isCorrectFalse ? '#dcfce7' : isStudentFalse ? '#fee2e2' : '#ffffff'
          }; display:flex; align-items:center; justify-content:space-between;">
            <strong>✖ Sai</strong>
            <span style="font-size:11px; font-weight:800; color:${isCorrectFalse ? '#15803d' : '#b91c1c'}">
              ${isCorrectFalse ? '✓ Đáp án đúng' : isStudentFalse ? '✗ Bạn đã chọn' : ''}
            </span>
          </div>
        </div>
      `;
    } else if (rev.type === 'short') {
      const studentAnsText =
        rev.studentAnswer !== undefined &&
        rev.studentAnswer !== null &&
        String(rev.studentAnswer).trim() !== '' &&
        String(rev.studentAnswer) !== 'Chưa làm'
          ? String(rev.studentAnswer)
          : 'Chưa trả lời';
      const acceptedText =
        Array.isArray(rev.acceptedAnswers) && rev.acceptedAnswers.length > 0
          ? rev.acceptedAnswers.join(' hoặc ')
          : String(rev.correctAnswer ?? '—');

      optionsHtml = `
        <div style="font-size: 13px; padding: 10px 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #64748b; font-weight: 600;">Bạn đã trả lời:</span>
            <strong style="color: ${rev.isCorrect ? '#15803d' : '#b91c1c'}; background: ${rev.isCorrect ? '#dcfce7' : '#fee2e2'}; padding: 2px 8px; border-radius: 6px; font-size: 13px;">${studentAnsText}</strong>
            <span style="font-size: 11px; font-weight: 800; color: ${rev.isCorrect ? '#15803d' : '#b91c1c'}">${rev.isCorrect ? '✓ Chính xác (+điểm)' : '✗ Chưa đúng'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #64748b; font-weight: 600;">Đáp án chấp nhận:</span>
            <strong style="color: #15803d; font-size: 13px;">${acceptedText}</strong>
          </div>
        </div>
      `;
    } else if (rev.options && Array.isArray(rev.options) && rev.options.length > 0) {
      optionsHtml = rev.options
        .map((opt) => {
          const isPicked = rev.studentChoiceLabel === opt.label || rev.studentAnswer === opt.index;
          const isCorrectOpt = rev.correctChoiceLabel === opt.label;
          return `
          <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; margin-bottom:4px; border-radius:8px; font-size:13px; border:1px solid ${
            isCorrectOpt ? '#86efac' : isPicked ? '#fca5a5' : '#e2e8f0'
          }; background-color: ${
            isCorrectOpt ? '#dcfce7' : isPicked ? '#fee2e2' : '#ffffff'
          }; font-weight: ${isCorrectOpt || isPicked ? '700' : '400'};">
            <span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:#e2e8f0; align-items:center; justify-content:center; font-weight:800; font-size:11px;">${opt.label}</span>
            <div style="flex:1;">${renderMath(opt.text)}</div>
            ${isCorrectOpt ? '<span style="color:#15803d; font-size:11px; font-weight:800;">✓ Đáp án đúng</span>' : ''}
            ${isPicked && !isCorrectOpt ? '<span style="color:#b91c1c; font-size:11px; font-weight:800;">✗ Bạn đã chọn</span>' : ''}
          </div>
        `;
        })
        .join('');
    } else {
      optionsHtml = `
        <div style="font-size: 13px; padding: 6px 10px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 6px;">
          <div>Bạn đã chọn: <strong>${String(rev.studentAnswer ?? 'Chưa làm')}</strong></div>
          <div style="color: #15803d; font-weight: 700; margin-top: 2px;">Đáp án đúng: <strong>${String(rev.correctAnswer ?? '—')}</strong></div>
        </div>
      `;
    }

    let explainHtml = '';
    if (rev.explanation) {
      explainHtml = `
        <div style="margin-top: 8px; font-size: 12px; color: #475569; background: #fffbeb; padding: 8px 10px; border-radius: 8px; border: 1px solid #fde68a;">
          💡 <strong>Giải thích:</strong> ${renderMath(rev.explanation)}
        </div>
      `;
    }

    let imagesHtml = '';
    const revImages =
      Array.isArray(rev.stemImages) && rev.stemImages.length > 0
        ? rev.stemImages
        : Array.isArray(rev.images) && rev.images.length > 0
          ? rev.images
          : [];
    if (revImages.length > 0) {
      imagesHtml = revImages
        .map(
          (imgUrl) => `
        <div style="text-align: center; margin: 8px 0;">
          <img src="${imgUrl}" alt="Hình ảnh câu hỏi" style="max-height: 220px; max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: contain;" />
        </div>
      `
        )
        .join('');
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:800; margin-bottom:6px;">
        <span style="color: var(--color-text);">Câu ${rev.order || idx + 1} (${typeof rev.pointsEarned === 'number' && rev.pointsEarned > 0 ? `+${rev.pointsEarned}đ / ` : ''}${rev.points || 1} điểm)</span>
        <span style="padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800; color: ${
          rev.isCorrect
            ? '#15803d'
            : isPartial
              ? '#92400e'
              : hasStudentAns
                ? '#b91c1c'
                : '#64748b'
        }; background: ${
          rev.isCorrect
            ? '#dcfce7'
            : isPartial
              ? '#fef3c7'
              : hasStudentAns
                ? '#fee2e2'
                : '#e2e8f0'
        };">
          ${rev.isCorrect ? '✓ Đúng' : isPartial ? `✓ Đúng 1 phần (+${rev.pointsEarned}đ)` : hasStudentAns ? '✗ Sai' : '⚪ Chưa làm'}
        </span>
      </div>
      <div style="font-size:14px; font-weight:700; color:var(--color-text); margin-bottom:8px;">${renderMath(rev.stemText)}</div>
      ${imagesHtml}
      ${optionsHtml}
      ${explainHtml}
    `;
    container.appendChild(card);
  });

  container.classList.remove('hidden');
  if (btnText) btnText.textContent = 'Ẩn xem lại bài làm';
}

export async function handleUnlockExam() {
  if (typeof document === 'undefined') return;
  const pwd = document.getElementById('exam-input-password')?.value?.trim() || '';
  const errEl = document.getElementById('exam-password-error');
  if (errEl) errEl.classList.add('hidden');
  if (!pwd) {
    if (errEl) {
      errEl.textContent = 'Vui lòng nhập mật khẩu';
      errEl.classList.remove('hidden');
    }
    return;
  }
  if (!state.currentRunId || !state.sessionData) return;
  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'unlock_exam',
          password: pwd,
          displayName: state.studentName,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        handleExamUpdate(state.currentRunId, data.state);
      }
    } else if (errEl) {
      errEl.textContent = 'Mật khẩu đề thi chưa chính xác';
      errEl.classList.remove('hidden');
    }
  } catch {
    if (errEl) {
      errEl.textContent = 'Không thể kết nối đến máy chủ';
      errEl.classList.remove('hidden');
    }
  }
}
