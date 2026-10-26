/**
 * EduClass v2 — Student Portal Quiz Live
 * Quản lý hoạt động Quiz Live (chế độ Kahoot nhịp GV & Quizizz tự tốc độ)
 */

import { state } from './state.js';
import { renderMath } from './utils.js';

export function resetQuizState() {
  state.currentQuestionIdx = -1;
  state.renderedQuestionIdx = -1;
  state.hasAnsweredCurrentQuestion = false;
  state.myQuizQuestionOrder = null;
  state.questionStartTime = Date.now();
  state.isViewingQuizizzFeedback = false;
  state.pendingQuizizzState = null;
  state.currentTfGroupAnswers = {};
  if (typeof document === 'undefined') return;

  const feedback = document.getElementById('quiz-feedback');
  if (feedback) {
    feedback.className = 'hidden';
    feedback.textContent = '';
  }
  const reviewBox = document.getElementById('quiz-review-box');
  if (reviewBox) {
    reviewBox.className = 'hidden quiz-review-container';
    reviewBox.innerHTML = '';
  }
  const optionsContainer = document.getElementById('quiz-options-container');
  if (optionsContainer) {
    optionsContainer.classList.remove('hidden');
  }
  document.querySelectorAll('.btn-kahoot').forEach((b) => {
    b.classList.remove('selected', 'disabled');
    b.disabled = false;
    b.style.outline = '';
    b.style.boxShadow = '';
    b.style.opacity = '';
  });
  const footerStatus = document.getElementById('quiz-footer-status');
  if (footerStatus) footerStatus.textContent = 'Nhấn nút màu tương ứng với đáp án đúng!';
  const streakBadge = document.getElementById('quiz-streak-badge');
  if (streakBadge) streakBadge.textContent = '🔥 Chuỗi: 0 | ⭐️ 0 đ';
  const progressFill = document.getElementById('quiz-progress-fill');
  if (progressFill) progressFill.style.width = '0%';

  const freezeOverlay = document.getElementById('quiz-freeze-overlay');
  if (freezeOverlay) freezeOverlay.classList.add('hidden');
  const smokeOverlay = document.getElementById('quiz-smoke-overlay');
  if (smokeOverlay) smokeOverlay.classList.add('hidden');
  const invBar = document.getElementById('quiz-inventory-bar');
  if (invBar) invBar.classList.add('hidden');
  const combatNotif = document.getElementById('quiz-combat-notification');
  if (combatNotif) combatNotif.classList.add('hidden');
  const activeBuffs = document.getElementById('quiz-active-buffs');
  if (activeBuffs) activeBuffs.classList.add('hidden');
}

export function handleActivityStateUpdate(runId, activityState) {
  state.quizState = activityState;
  if (state.currentRunId !== runId) {
    state.currentRunId = runId;
    resetQuizState();
  }

  // Nếu học sinh đang dừng lại xem đáp án đúng ở chế độ Quizizz,
  // chỉ lưu trạng thái mới nhất, TUYỆT ĐỐI KHÔNG tự động chuyển câu hỏi!
  if (state.isViewingQuizizzFeedback) {
    state.pendingQuizizzState = activityState;
    return;
  }

  if (activityState.status === 'in_question') {
    showQuizQuestion(activityState);
  } else if (activityState.status === 'question_review') {
    showQuestionReview(activityState);
  } else if (activityState.status === 'leaderboard') {
    showLeaderboardStatus(activityState);
  } else if (activityState.status === 'finished') {
    showQuizFinished(activityState);
  }
}

export function getStudentQuizQuestionOrder(totalQuestions, shuffle) {
  if (!shuffle) {
    return Array.from({ length: totalQuestions }, (_, i) => i);
  }
  if (state.myQuizQuestionOrder && state.myQuizQuestionOrder.length === totalQuestions) {
    return state.myQuizQuestionOrder;
  }
  const order = Array.from({ length: totalQuestions }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = order[i];
    order[i] = order[j];
    order[j] = temp;
  }
  state.myQuizQuestionOrder = order;
  return state.myQuizQuestionOrder;
}

export function showQuizQuestion(quizState) {
  const total = quizState.totalQuestions ?? (quizState.questions ? quizState.questions.length : 1);
  const myProgress = quizState.participants?.[state.participantId];

  // Nếu ở chế độ quizizz và học sinh đã làm xong hết các câu
  if (quizState.mode === 'quizizz' && myProgress && (myProgress.isCompleted || myProgress.currentIndex >= total)) {
    showQuizFinished(quizState);
    return;
  }

  if (typeof document === 'undefined') return;

  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  const swissView = document.getElementById('swiss-duel-view');
  if (swissView) swissView.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.remove('hidden');

  // Đảm bảo ẩn Review Box và hiện Options Container khi chuyển sang câu hỏi mới
  const reviewBox = document.getElementById('quiz-review-box');
  if (reviewBox) {
    reviewBox.className = 'hidden quiz-review-container';
    reviewBox.innerHTML = '';
  }
  const optionsContainer = document.getElementById('quiz-options-container');
  if (optionsContainer) {
    optionsContainer.classList.remove('hidden');
  }

  // Xác định câu hỏi hiện tại: Nếu quizizz -> lấy tiến độ riêng của học sinh; Nếu kahoot -> lấy theo nhịp GV
  const stepIdx =
    quizState.mode === 'quizizz'
      ? myProgress
        ? myProgress.currentIndex
        : 0
      : (quizState.currentQuestionIndex ?? 0);

  let qIdx = stepIdx;
  if (quizState.mode === 'quizizz' && quizState.shuffleQuestions) {
    const order = getStudentQuizQuestionOrder(total, true);
    qIdx = order[stepIdx] !== undefined ? order[stepIdx] : stepIdx;
  }

  if (state.currentQuestionIdx !== qIdx) {
    // Bắt đầu câu hỏi mới
    state.currentQuestionIdx = qIdx;
    state.hasAnsweredCurrentQuestion = false;
    state.questionStartTime = Date.now();
    state.currentTfGroupAnswers = {};

    // Reset feedback & nút
    document.getElementById('quiz-feedback')?.classList.add('hidden');
    document.querySelectorAll('.btn-kahoot').forEach((b) => {
      b.classList.remove('selected', 'disabled');
      b.disabled = false;
      b.style.outline = '';
      b.style.boxShadow = '';
      b.style.opacity = '';
    });
    const footerStatus = document.getElementById('quiz-footer-status');
    if (footerStatus) footerStatus.textContent = 'Nhấn nút màu tương ứng với đáp án đúng!';
  }

  const qIdxEl = document.getElementById('quiz-question-index');
  if (qIdxEl) {
    qIdxEl.textContent = quizState.mode === 'quizizz' ? `Câu ${stepIdx + 1} / ${total}` : `Câu ${qIdx + 1} / ${total}`;
  }

  // Cập nhật thanh tiến trình phần trăm (Progress bar)
  const progressPercent = Math.min(100, Math.round(((stepIdx) / total) * 100));
  const progressFill = document.getElementById('quiz-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  if (myProgress) {
    const streakEl = document.getElementById('quiz-streak-badge');
    if (streakEl) streakEl.textContent = `🔥 Chuỗi: ${myProgress.currentStreak ?? 0} | ⭐️ ${myProgress.score ?? 0} đ`;
  }

  // Cập nhật túi đồ và hiệu ứng chiến đấu (khiên, sấm sét x2, đóng băng, khói mù...)
  updateQuizCombatUI(quizState, myProgress);

  // Chống hiện tượng poller gọi định kỳ làm reset input đang gõ của học sinh
  if (state.renderedQuestionIdx === qIdx && optionsContainer && optionsContainer.children.length > 0) {
    return;
  }
  state.renderedQuestionIdx = qIdx;

  const q = quizState.questions?.[qIdx];
  if (q) {
    const stemEl = document.getElementById('quiz-stem');
    if (stemEl) stemEl.innerHTML = renderMath(q.stem || `Câu hỏi số ${qIdx + 1}`);

    // Hiển thị hình ảnh câu hỏi (nếu có)
    const imgWrap = document.getElementById('quiz-stem-image-wrap');
    const imgEl = document.getElementById('quiz-stem-image');
    const qImage = q.image || (q.stem && q.stem.images && q.stem.images[0]);
    if (imgWrap && imgEl) {
      if (qImage) {
        imgEl.src = qImage;
        imgWrap.classList.remove('hidden');
      } else {
        imgEl.src = '';
        imgWrap.classList.add('hidden');
      }
    }

    if (optionsContainer) {
      if (q.type === 'matching') {
        const leftItems = Array.isArray(q.leftItems) ? q.leftItems : [];
        const rightItems = Array.isArray(q.rightItems) ? q.rightItems : [];
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '12px';
        optionsContainer.innerHTML = `
          <div style="font-size: 15px; font-weight: 800; color: #475569; text-transform: uppercase;">
            Ghép mục Cột A với mục Cột B tương ứng:
          </div>
          ${leftItems
            .map((left, lIdx) => {
              const leftText = typeof left.text === 'object' && left.text ? left.text.text : String(left.text || '');
              return `
                <div style="padding: 14px 18px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-weight: 800; font-size: 16px; color: #1e293b;">
                    <strong>${lIdx + 1}.</strong> ${renderMath(leftText)}
                  </div>
                  <select id="quiz-match-left-${left.id}"
                    style="min-height: 52px; padding: 10px 14px; border-radius: 12px; border: 2px solid #cbd5e1; font-size: 15px; font-weight: 700; background: #fff; cursor: pointer;">
                    <option value="">-- Chọn đáp án ghép tương ứng --</option>
                    ${rightItems
                      .map((right, rIdx) => {
                        const rightText = typeof right.text === 'object' && right.text ? right.text.text : String(right.text || '');
                        const letter = String.fromCharCode(65 + rIdx);
                        return `<option value="${right.id}">${letter}. ${rightText}</option>`;
                      })
                      .join('')}
                  </select>
                </div>
              `;
            })
            .join('')}
          <button id="btn-submit-matching" type="button" onclick="handleSubmitQuizMatching()"
            class="btn-quiz-next-action">
            Gửi câu trả lời ghép đôi
          </button>
        `;
      } else if (q.type === 'cloze_drag') {
        const wordBank = Array.isArray(q.wordBank) ? q.wordBank : [];
        const blanks = Array.isArray(q.blanks) ? q.blanks : [];
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '12px';
        optionsContainer.innerHTML = `
          ${
            wordBank.length > 0
              ? `
            <div style="background: #f8fafc; padding: 14px; border-radius: 16px; border: 2px solid #e2e8f0;">
              <div style="font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase;">Từ khóa gợi ý:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${wordBank.map((w) => `<span style="background: #fff; border: 1.5px solid #cbd5e1; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 800; color: #334155;">${w}</span>`).join('')}
              </div>
            </div>
          `
              : ''
          }
          <div style="background: #fffbeb; border: 2px solid #fde68a; padding: 16px 20px; border-radius: 16px; font-size: 18px; line-height: 1.6; color: #1e293b; font-weight: 700;">
            ${renderMath(q.template || '')}
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${blanks
              .map((b) => {
                return `
                  <div style="display: flex; align-items: center; gap: 12px; background: #fff; padding: 10px 16px; border-radius: 14px; border: 2px solid #e2e8f0;">
                    <span style="font-size: 15px; font-weight: 800; color: #475569; min-width: 75px;">Ô [${b.id}]:</span>
                    <select id="quiz-cloze-blank-${b.id}"
                      style="flex: 1; min-height: 50px; padding: 10px 14px; border-radius: 10px; border: 2px solid #cbd5e1; font-size: 15px; font-weight: 700; background: #f8fafc; cursor: pointer;">
                      <option value="">-- Chọn từ điền thích hợp --</option>
                      ${wordBank.map((word) => `<option value="${word}">${word}</option>`).join('')}
                    </select>
                  </div>
                `;
              })
              .join('')}
          </div>
          <button id="btn-submit-cloze" type="button" onclick="handleSubmitQuizCloze()"
            class="btn-quiz-next-action">
            Gửi câu trả lời điền từ
          </button>
        `;
      } else if (q.type === 'tf') {
        optionsContainer.style.display = 'grid';
        optionsContainer.style.gridTemplateColumns = '1fr 1fr';
        optionsContainer.style.gap = 'clamp(14px, 2vw, 24px)';
        optionsContainer.innerHTML = `
          <button class="btn-kahoot btn-kahoot-large btn-kahoot-green" onclick="handleSelectAnswer(true)"
            style="justify-content: center; min-height: clamp(120px, 20vh, 220px);">
            <span class="btn-kahoot-shape" style="font-size: 44px;">✓</span>
            <span class="btn-kahoot-text" style="font-size: clamp(22px, 3.5vw, 36px); text-align: center; flex: none;">ĐÚNG</span>
          </button>
          <button class="btn-kahoot btn-kahoot-large btn-kahoot-red" onclick="handleSelectAnswer(false)"
            style="justify-content: center; min-height: clamp(120px, 20vh, 220px);">
            <span class="btn-kahoot-shape" style="font-size: 44px;">✗</span>
            <span class="btn-kahoot-text" style="font-size: clamp(22px, 3.5vw, 36px); text-align: center; flex: none;">SAI</span>
          </button>
        `;
      } else if (q.type === 'short') {
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '14px';
        optionsContainer.innerHTML = `
          <input id="quiz-short-input" type="text" placeholder="Nhập câu trả lời ngắn của bạn..."
            style="min-height: 56px; padding: 12px 18px; border-radius: 16px; border: 2.5px solid #cbd5e1; font-size: 18px; font-weight: 700; width: 100%; box-sizing: border-box;" />
          <button id="btn-submit-short" type="button" onclick="handleSubmitQuizShort()"
            class="btn-quiz-next-action">
            Gửi câu trả lời
          </button>
        `;
      } else if (q.type === 'tf_group') {
        const items = Array.isArray(q.items) ? q.items : [];
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '14px';
        optionsContainer.innerHTML = `
          <div style="font-size: 15px; font-weight: 800; color: #475569; text-transform: uppercase;">
            Chọn Đúng hoặc Sai cho từng ý dưới đây:
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${items
              .map((item, itIdx) => {
                const itText = typeof item.text === 'object' && item.text ? item.text.text : String(item.text || '');
                const letter = ['a', 'b', 'c', 'd'][itIdx] || `${itIdx + 1}`;
                return `
                  <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 16px; font-weight: 700; color: #1e293b; line-height: 1.5;">
                      <strong style="color: #2563eb; font-size: 17px;">${letter})</strong> ${renderMath(itText)}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      <button type="button" id="btn-tfgroup-${itIdx}-true"
                        onclick="handleSelectTfGroupItem(${itIdx}, true)"
                        style="min-height: 48px; border-radius: 12px; border: 2.5px solid #cbd5e1; background: #f8fafc; color: #166534; font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;">
                        <span>✓</span> ĐÚNG
                      </button>
                      <button type="button" id="btn-tfgroup-${itIdx}-false"
                        onclick="handleSelectTfGroupItem(${itIdx}, false)"
                        style="min-height: 48px; border-radius: 12px; border: 2.5px solid #cbd5e1; background: #f8fafc; color: #991b1b; font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;">
                        <span>✗</span> SAI
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
          <button id="btn-submit-tfgroup" type="button" onclick="handleSubmitQuizTfGroup()"
            class="btn-quiz-next-action">
            Gửi câu trả lời Đúng / Sai
          </button>
        `;
      } else {
        // mcq4 Layout mở rộng toàn màn hình
        optionsContainer.style.display = 'grid';
        optionsContainer.style.gridTemplateColumns = '1fr 1fr';
        optionsContainer.style.gap = 'clamp(12px, 1.8vw, 22px)';
        const options = q.options || ['A', 'B', 'C', 'D'];
        const optImages = Array.isArray(q.optionImages) ? q.optionImages : [];
        const symbols = ['▲', '◆', '●', '■'];
        const colors = ['btn-kahoot-red', 'btn-kahoot-blue', 'btn-kahoot-yellow', 'btn-kahoot-green'];
        optionsContainer.innerHTML = options
          .map((opt, idx) => {
            const optImg = optImages[idx];
            return `
              <button class="btn-kahoot btn-kahoot-large ${colors[idx % colors.length]}" onclick="handleSelectAnswer(${idx})">
                <span class="btn-kahoot-shape">${symbols[idx % symbols.length]}</span>
                ${optImg ? `<img src="${optImg}" class="btn-kahoot-opt-image" alt="Ảnh phương án" />` : ''}
                <span id="opt-text-${idx}" class="btn-kahoot-text">${renderMath(opt || String.fromCharCode(65 + idx))}</span>
              </button>
            `;
          })
          .join('');
      }
    }
  }

  // Áp dụng các hiệu ứng ẩn phương án (50/50), khóa nút nếu bị đóng băng...
  updateQuizCombatUI(quizState, myProgress);
}

export function handleSubmitQuizMatching() {
  const qIdx = state.currentQuestionIdx;
  const q = state.quizState?.questions?.[qIdx];
  if (!q) return;
  const leftItems = Array.isArray(q.leftItems) ? q.leftItems : [];
  const pairs = {};
  for (const left of leftItems) {
    const el = document.getElementById(`quiz-match-left-${left.id}`);
    if (el && el.value) {
      pairs[left.id] = el.value;
    }
  }
  handleSelectAnswer({ pairs });
}

export function handleSubmitQuizCloze() {
  const qIdx = state.currentQuestionIdx;
  const q = state.quizState?.questions?.[qIdx];
  if (!q) return;
  const blanks = Array.isArray(q.blanks) ? q.blanks : [];
  const filled = {};
  for (const b of blanks) {
    const el = document.getElementById(`quiz-cloze-blank-${b.id}`);
    if (el && el.value) {
      filled[b.id] = el.value;
    }
  }
  handleSelectAnswer({ filled });
}

export function handleSubmitQuizShort() {
  const el = document.getElementById('quiz-short-input');
  const val = el ? el.value.trim() : '';
  if (!val) {
    alert('Vui lòng nhập câu trả lời!');
    return;
  }
  handleSelectAnswer(val);
}

export function handleSelectTfGroupItem(itemIndex, isTrue) {
  if (state.hasAnsweredCurrentQuestion) return;
  if (!state.currentTfGroupAnswers) state.currentTfGroupAnswers = {};
  state.currentTfGroupAnswers[itemIndex] = isTrue;

  const btnTrue = document.getElementById(`btn-tfgroup-${itemIndex}-true`);
  const btnFalse = document.getElementById(`btn-tfgroup-${itemIndex}-false`);
  if (btnTrue && btnFalse) {
    if (isTrue) {
      btnTrue.style.background = '#dcfce7';
      btnTrue.style.borderColor = '#16a34a';
      btnTrue.style.color = '#15803d';
      btnTrue.style.boxShadow = '0 0 0 2px #86efac';

      btnFalse.style.background = '#f8fafc';
      btnFalse.style.borderColor = '#cbd5e1';
      btnFalse.style.color = '#991b1b';
      btnFalse.style.boxShadow = 'none';
    } else {
      btnFalse.style.background = '#fee2e2';
      btnFalse.style.borderColor = '#dc2626';
      btnFalse.style.color = '#b91c1c';
      btnFalse.style.boxShadow = '0 0 0 2px #fca5a5';

      btnTrue.style.background = '#f8fafc';
      btnTrue.style.borderColor = '#cbd5e1';
      btnTrue.style.color = '#166534';
      btnTrue.style.boxShadow = 'none';
    }
  }
}

export function handleSubmitQuizTfGroup() {
  const qIdx = state.currentQuestionIdx;
  const q = state.quizState?.questions?.[qIdx];
  if (!q) return;
  const items = Array.isArray(q.items) ? q.items : [];
  const selected = [];
  let unselectedCount = 0;
  for (let i = 0; i < items.length; i++) {
    const val = state.currentTfGroupAnswers?.[i];
    if (typeof val === 'boolean') {
      selected.push(val);
    } else {
      selected.push(null);
      unselectedCount++;
    }
  }
  if (unselectedCount > 0) {
    if (!confirm(`Bạn còn ${unselectedCount} ý chưa chọn Đúng/Sai. Bạn có chắc chắn muốn nộp câu này không?`)) {
      return;
    }
  }
  handleSelectAnswer(selected);
}

if (typeof window !== 'undefined') {
  window.handleSubmitQuizMatching = handleSubmitQuizMatching;
  window.handleSubmitQuizCloze = handleSubmitQuizCloze;
  window.handleSubmitQuizShort = handleSubmitQuizShort;
  window.handleSelectTfGroupItem = handleSelectTfGroupItem;
  window.handleSubmitQuizTfGroup = handleSubmitQuizTfGroup;
  window.handleSelectAnswer = handleSelectAnswer;
  window.handleUsePowerUp = handleUsePowerUp;
}

export function updateQuizCombatUI(quizState, myProgress) {
  if (typeof document === 'undefined') return;

  const invBar = document.getElementById('quiz-inventory-bar');
  const freezeOverlay = document.getElementById('quiz-freeze-overlay');
  const smokeOverlay = document.getElementById('quiz-smoke-overlay');
  const notifEl = document.getElementById('quiz-combat-notification');
  const buffsEl = document.getElementById('quiz-active-buffs');

  // Chỉ hiển thị ở chế độ Quizizz có bật vật phẩm
  const isQuizizzWithPowerUps = quizState?.mode === 'quizizz' && quizState?.enablePowerUps !== false;
  if (!isQuizizzWithPowerUps) {
    if (invBar) invBar.classList.add('hidden');
    if (freezeOverlay) freezeOverlay.classList.add('hidden');
    if (smokeOverlay) smokeOverlay.classList.add('hidden');
    if (notifEl) notifEl.classList.add('hidden');
    if (buffsEl) buffsEl.classList.add('hidden');
    return;
  }

  const now = Date.now();
  const activeEffects = Array.isArray(myProgress?.activeEffects) ? myProgress.activeEffects : [];
  const validEffects = activeEffects.filter(e => e.expiresAt > now);

  // 1. Kiểm tra Đóng Băng (Freeze)
  const freezeEffect = validEffects.find(e => e.powerUpType === 'freeze');
  const isFrozen = Boolean(freezeEffect);
  if (freezeOverlay) {
    if (isFrozen) {
      freezeOverlay.classList.remove('hidden');
      const remSec = Math.max(1, Math.ceil((freezeEffect.expiresAt - now) / 1000));
      const timerEl = document.getElementById('quiz-freeze-timer');
      if (timerEl) timerEl.textContent = `Đang giải băng sau ${remSec}s...`;
    } else {
      freezeOverlay.classList.add('hidden');
    }
  }

  // 2. Kiểm tra Bom Khói (Smoke)
  const smokeEffect = validEffects.find(e => e.powerUpType === 'smoke');
  const isSmoked = Boolean(smokeEffect);
  if (smokeOverlay) {
    if (isSmoked) {
      smokeOverlay.classList.remove('hidden');
      const remSec = Math.max(1, Math.ceil((smokeEffect.expiresAt - now) / 1000));
      const timerEl = document.getElementById('quiz-smoke-timer');
      if (timerEl) timerEl.textContent = `Khói mù tan dần sau ${remSec}s...`;
    } else {
      smokeOverlay.classList.add('hidden');
    }
  }

  // Khóa tương tác nếu đang bị đóng băng
  if (isFrozen) {
    document.querySelectorAll('.btn-kahoot').forEach(b => {
      b.classList.add('disabled');
      b.disabled = true;
    });
  }

  // 3. Hiển thị Buffs trạng thái (Khiên, Phản đòn, Sấm sét x2)
  if (buffsEl) {
    const hasShield = validEffects.some(e => e.powerUpType === 'shield');
    const hasReflect = validEffects.some(e => e.powerUpType === 'reflect_shield');
    const isDouble = validEffects.some(e => e.powerUpType === 'double_points');
    const buffList = [];

    if (hasReflect) {
      buffList.push('<span style="background: #581c87; color: #f3e8ff; border: 1.5px solid #a855f7; padding: 4px 10px; border-radius: 99px; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">🪞 Phản Đòn</span>');
    } else if (hasShield) {
      buffList.push('<span style="background: #064e3b; color: #a7f3d0; border: 1.5px solid #10b981; padding: 4px 10px; border-radius: 99px; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">🛡️ Khiên Hộ Thể</span>');
    }
    if (isDouble) {
      buffList.push('<span style="background: #78350f; color: #fde68a; border: 1.5px solid #f59e0b; padding: 4px 10px; border-radius: 99px; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">⚡ Sấm Sét x2</span>');
    }

    if (buffList.length > 0) {
      buffsEl.classList.remove('hidden');
      buffsEl.innerHTML = buffList.join(' ');
    } else {
      buffsEl.classList.add('hidden');
      buffsEl.innerHTML = '';
    }
  }

  // 4. Kính soi 50/50: Ẩn các option bị loại
  const hiddenOpts = Array.isArray(myProgress?.hiddenOptions) ? myProgress.hiddenOptions : [];
  if (hiddenOpts.length > 0) {
    document.querySelectorAll('.btn-kahoot').forEach((b, idx) => {
      if (hiddenOpts.includes(idx)) {
        b.style.opacity = '0.15';
        b.style.pointerEvents = 'none';
        b.style.transform = 'scale(0.95)';
        b.classList.add('disabled');
      }
    });
  }

  // 5. Cập nhật thanh Túi đồ (Inventory)
  if (invBar) {
    invBar.classList.remove('hidden');
    const capacity = quizState.powerUpCapacity || 2;
    const queue = myProgress?.inventory?.queue || [];
    const slotsEl = document.getElementById('quiz-inventory-slots');
    const useBtn = document.getElementById('btn-quiz-use-powerup');

    if (slotsEl) {
      let slotsHtml = '';
      for (let i = 0; i < capacity; i++) {
        const item = queue[i];
        const isNext = i === 0 && Boolean(item);
        if (item) {
          slotsHtml += `
            <div class="${isNext ? 'powerup-slot-next' : ''}" style="width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: all 0.2s ease; ${
              isNext
                ? 'background: rgba(245, 158, 11, 0.25); border: 2px solid #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);'
                : 'background: #1e293b; border: 1.5px solid #475569;'
            }" title="${item.name}: ${item.description || ''}">
              ${item.icon || '🎁'}
            </div>
          `;
        } else {
          slotsHtml += `
            <div style="width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #475569; background: rgba(30, 41, 59, 0.5); border: 1.5px dashed #334155;">
              +
            </div>
          `;
        }
      }
      slotsEl.innerHTML = slotsHtml;
    }

    if (useBtn) {
      const hasItem = queue.length > 0;
      const canUse = hasItem && !isFrozen && !state.hasAnsweredCurrentQuestion;
      useBtn.disabled = !canUse;
      useBtn.style.opacity = canUse ? '1' : '0.45';
      useBtn.style.cursor = canUse ? 'pointer' : 'not-allowed';
      if (hasItem) {
        useBtn.innerHTML = `<span>⚡</span> <span>DÙNG [${queue[0].name}]</span>`;
      } else {
        useBtn.innerHTML = `<span>⚡</span> <span>TÚI TRỐNG</span>`;
      }
    }
  }

  // 6. Thông báo cá nhân (Personal Notification)
  if (myProgress?.personalNotification && notifEl) {
    const notif = myProgress.personalNotification;
    if (now - notif.timestamp < 6000) {
      notifEl.classList.remove('hidden');
      notifEl.textContent = notif.message;
      if (notif.type === 'attack') {
        notifEl.style.background = '#881337';
        notifEl.style.color = '#ffe4e6';
        notifEl.style.borderColor = '#f43f5e';
      } else if (notif.type === 'defense') {
        notifEl.style.background = '#064e3b';
        notifEl.style.color = '#d1fae5';
        notifEl.style.borderColor = '#10b981';
      } else if (notif.type === 'reflected') {
        notifEl.style.background = '#3b0764';
        notifEl.style.color = '#f3e8ff';
        notifEl.style.borderColor = '#a855f7';
      } else {
        notifEl.style.background = '#1e293b';
        notifEl.style.color = '#f8fafc';
        notifEl.style.borderColor = '#38bdf8';
      }
    } else {
      notifEl.classList.add('hidden');
    }
  }
}

export async function handleUsePowerUp() {
  if (!state.currentRunId || !state.sessionData) return;
  const useBtn = document.getElementById('btn-quiz-use-powerup');
  if (useBtn) useBtn.disabled = true;

  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'use_powerup',
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        state.quizState = data.state;
        const myProg = data.state.participants?.[state.participantId];
        updateQuizCombatUI(data.state, myProg);
      }
    }
  } catch (err) {
    console.warn('[Quiz] Lỗi sử dụng vật phẩm:', err);
  }
}

export async function handleSelectAnswer(answer) {
  if (state.hasAnsweredCurrentQuestion || !state.currentRunId || !state.sessionData) return;

  state.hasAnsweredCurrentQuestion = true;
  const responseTimeMs = Date.now() - state.questionStartTime;

  if (typeof document !== 'undefined') {
    // Đánh dấu nút đã chọn hoặc disable form
    document.querySelectorAll('.btn-kahoot').forEach((b, idx) => {
      if (typeof answer === 'number' && idx === answer) {
        b.classList.add('selected');
      } else {
        b.classList.add('disabled');
      }
      b.disabled = true;
    });

    const submitBtn =
      document.getElementById('btn-submit-matching') ||
      document.getElementById('btn-submit-cloze') ||
      document.getElementById('btn-submit-tfgroup') ||
      document.getElementById('btn-submit-short');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }

    // Disable các nút chọn trong tf_group
    document.querySelectorAll('[id^="btn-tfgroup-"]').forEach((b) => {
      b.disabled = true;
      b.style.cursor = 'not-allowed';
    });

    const feedback = document.getElementById('quiz-feedback');
    if (feedback) {
      feedback.className = 'badge badge-warning';
      feedback.style.display = 'block';
      feedback.textContent = '✓ Đã ghi nhận câu trả lời! Đang chấm điểm...';
    }
    const footerStatus = document.getElementById('quiz-footer-status');
    if (footerStatus) footerStatus.textContent = 'Câu trả lời của bạn đã được gửi an toàn lên máy chủ.';
  }

  // Gửi Intent lên server kèm displayName thật của học sinh
  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'submit_answer',
          questionIndex: state.currentQuestionIdx,
          answer,
          responseTimeMs,
          displayName: state.studentName,
        },
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      const updatedState = resData.state;
      if (updatedState) {
        const myProg = updatedState.participants?.[state.participantId];
        const lastAns = myProg?.lastAnswer;

        // Cập nhật điểm và streak ngay lập tức
        if (myProg) {
          const streakEl = document.getElementById('quiz-streak-badge');
          if (streakEl) {
            streakEl.textContent = `🔥 Chuỗi: ${myProg.currentStreak ?? 0} | ⭐️ ${myProg.score ?? 0} đ`;
          }
        }

        // Ở chế độ Quizizz (tự tốc độ)
        if (updatedState.mode === 'quizizz') {
          if (updatedState.showCorrectAnswer && lastAns) {
            // DỪNG LẠI HOÀN TOÀN để học sinh xem đáp án đúng và phân tích!
            state.isViewingQuizizzFeedback = true;
            state.pendingQuizizzState = updatedState;
            showQuizizzAnswerReview(updatedState, lastAns, answer);
          } else {
            // Không bật xem đáp án -> Tạm dừng 1.2s để học sinh thấy hiệu ứng đúng/sai rồi mới sang câu
            state.isViewingQuizizzFeedback = true;
            if (lastAns && typeof document !== 'undefined') {
              const feedback = document.getElementById('quiz-feedback');
              if (feedback) {
                feedback.style.display = 'block';
                if (lastAns.isCorrect) {
                  feedback.style.background = '#dcfce7';
                  feedback.style.color = '#15803d';
                  feedback.textContent = `🎉 CHÍNH XÁC! (+${lastAns.pointsEarned} điểm)`;
                } else {
                  feedback.style.background = '#fee2e2';
                  feedback.style.color = '#b91c1c';
                  feedback.textContent = '❌ Chưa chính xác!';
                }
              }
            }
            setTimeout(() => {
              state.isViewingQuizizzFeedback = false;
              const nextState = state.pendingQuizizzState || updatedState;
              state.pendingQuizizzState = null;
              showQuizQuestion(nextState);
            }, 1200);
          }
        }
      }
    }
  } catch {}
}

/**
 * Hiển thị màn hình dừng lại xem đáp án đúng ở chế độ Quizizz
 * Học sinh đọc kỹ kết quả, đáp án đúng và giải thích, sau đó bấm nút "Câu tiếp theo ➔" để đi tiếp.
 */
export function showQuizizzAnswerReview(quizState, lastAns, selectedAnswer) {
  if (typeof document === 'undefined') return;

  const optionsContainer = document.getElementById('quiz-options-container');
  const reviewBox = document.getElementById('quiz-review-box');
  const feedback = document.getElementById('quiz-feedback');
  if (feedback) feedback.classList.add('hidden');

  if (!reviewBox) return;

  if (optionsContainer) optionsContainer.classList.add('hidden');
  reviewBox.classList.remove('hidden');

  const q = quizState.questions?.[lastAns.questionIndex];
  const isCorrect = Boolean(lastAns.isCorrect);
  const total = quizState.totalQuestions ?? (quizState.questions ? quizState.questions.length : 1);
  const isLastQuestion = (lastAns.questionIndex + 1) >= total;

  let detailsHtml = '';

  if (q && q.type === 'mcq4' && q.options) {
    const cIdx = Number(lastAns.correctAnswer);
    const sIdx = Number(selectedAnswer);
    const symbols = ['▲', '◆', '●', '■'];
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];

    detailsHtml = `
      <div style="font-size: 15px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
        Đối chiếu kết quả đáp án:
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${q.options
          .map((opt, idx) => {
            const isThisCorrect = idx === cIdx;
            const isThisSelected = idx === sIdx;
            let cardClass = 'quiz-review-card is-dimmed';
            let tagBadge = '';

            if (isThisCorrect) {
              cardClass = 'quiz-review-card is-correct';
              tagBadge = `<span style="font-size: 13px; font-weight: 800; color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 8px; margin-left: auto;">✔ ĐÁP ÁN ĐÚNG</span>`;
            } else if (isThisSelected && !isCorrect) {
              cardClass = 'quiz-review-card is-selected-wrong';
              tagBadge = `<span style="font-size: 13px; font-weight: 800; color: #b91c1c; background: #fee2e2; padding: 4px 10px; border-radius: 8px; margin-left: auto;">✖ BẠN ĐÃ CHỌN</span>`;
            }

            return `
              <div class="${cardClass}">
                <span style="font-size: 22px; color: ${colors[idx % colors.length]}; flex-shrink: 0;">${symbols[idx % symbols.length]}</span>
                <span style="font-size: 16px; font-weight: 800; color: #1e293b;">${renderMath(opt || String.fromCharCode(65 + idx))}</span>
                ${tagBadge}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (q && q.type === 'tf') {
    const cVal = lastAns.correctAnswer === true || String(lastAns.correctAnswer).toLowerCase() === 'true';
    const sVal = selectedAnswer === true || String(selectedAnswer).toLowerCase() === 'true';

    detailsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="quiz-review-card ${cVal ? 'is-correct' : 'is-dimmed'}">
          <span style="font-size: 24px; color: #16a34a;">✓</span>
          <span style="font-size: 18px; font-weight: 900;">ĐÚNG</span>
          ${cVal ? `<span style="font-size: 12px; font-weight: 800; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 6px; margin-left: auto;">ĐÁP ÁN</span>` : ''}
          ${!cVal && sVal ? `<span style="font-size: 12px; font-weight: 800; color: #b91c1c; background: #fee2e2; padding: 2px 8px; border-radius: 6px; margin-left: auto;">BẠN CHỌN</span>` : ''}
        </div>
        <div class="quiz-review-card ${!cVal ? 'is-correct' : 'is-dimmed'}">
          <span style="font-size: 24px; color: #dc2626;">✗</span>
          <span style="font-size: 18px; font-weight: 900;">SAI</span>
          ${!cVal ? `<span style="font-size: 12px; font-weight: 800; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 6px; margin-left: auto;">ĐÁP ÁN</span>` : ''}
          ${cVal && !sVal ? `<span style="font-size: 12px; font-weight: 800; color: #b91c1c; background: #fee2e2; padding: 2px 8px; border-radius: 6px; margin-left: auto;">BẠN CHỌN</span>` : ''}
        </div>
      </div>
    `;
  } else if (q && q.type === 'short') {
    const cVal = Array.isArray(lastAns.correctAnswer) ? lastAns.correctAnswer.join(' / ') : String(lastAns.correctAnswer ?? '');
    detailsHtml = `
      <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 16px;">
        <div style="font-size: 14px; font-weight: 700; color: #64748b;">Đáp án được chấp nhận:</div>
        <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-top: 4px;">${cVal}</div>
        <div style="font-size: 14px; font-weight: 700; color: #64748b; margin-top: 10px;">Câu trả lời của bạn:</div>
        <div style="font-size: 16px; font-weight: 800; color: ${isCorrect ? '#16a34a' : '#dc2626'}; margin-top: 4px;">${selectedAnswer || '(Để trống)'}</div>
      </div>
    `;
  } else if (q && q.type === 'tf_group') {
    const items = Array.isArray(q.items) ? q.items : [];
    let correctArr = [];
    if (Array.isArray(lastAns.correctAnswer)) {
      correctArr = lastAns.correctAnswer;
    }
    const studentArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];

    detailsHtml = `
      <div style="font-size: 15px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
        Đối chiếu kết quả từng ý Đúng / Sai:
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${items
          .map((it, idx) => {
            const itText = typeof it.text === 'object' && it.text ? it.text.text : String(it.text || '');
            const letter = ['a', 'b', 'c', 'd'][idx] || `${idx + 1}`;
            const expected = Boolean(correctArr[idx]);
            const sVal = studentArr[idx];
            const isThisItemCorrect = sVal === expected;

            return `
              <div style="background: #ffffff; border: 2px solid ${isThisItemCorrect ? '#86efac' : '#fca5a5'}; border-radius: 14px; padding: 12px 16px;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
                  <div style="font-size: 15px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                    <strong style="color: #2563eb;">${letter})</strong> ${renderMath(itText)}
                  </div>
                  <span style="flex-shrink: 0; font-size: 13px; font-weight: 800; padding: 3px 8px; border-radius: 6px; ${isThisItemCorrect ? 'background: #dcfce7; color: #15803d;' : 'background: #fee2e2; color: #b91c1c;'}">
                    ${isThisItemCorrect ? '✓ Khớp' : '✗ Sai'}
                  </span>
                </div>
                <div style="display: flex; gap: 16px; font-size: 14px; font-weight: 700; color: #475569;">
                  <div>Đáp án: <strong style="color: ${expected ? '#16a34a' : '#dc2626'};">${expected ? 'ĐÚNG' : 'SAI'}</strong></div>
                  <div>Bạn chọn: <strong style="color: ${sVal === true ? '#16a34a' : sVal === false ? '#dc2626' : '#94a3b8'};">${sVal === true ? 'ĐÚNG' : sVal === false ? 'SAI' : 'Chưa chọn'}</strong></div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  const explanationHtml = lastAns.explanation
    ? `
      <div style="font-size: 15px; color: #854d0e; background: #fef9c3; border: 2px solid #fde047; padding: 14px 18px; border-radius: 16px; line-height: 1.5;">
        💡 <strong>Lời giải thích chi tiết:</strong> ${lastAns.explanation}
      </div>
    `
    : '';

  reviewBox.innerHTML = `
    <!-- Banner Kết Quả Đúng / Sai -->
    <div class="quiz-review-banner ${isCorrect ? 'correct' : 'incorrect'}">
      <div style="font-size: 38px; margin-bottom: 4px;">${isCorrect ? '🎉' : '❌'}</div>
      <div style="font-size: clamp(20px, 2.5vw, 28px); font-weight: 900;">
        ${isCorrect ? `CHÍNH XÁC TUYỆT VỜI! (+${lastAns.pointsEarned} điểm)` : 'TIẾC QUÁ, CHƯA CHÍNH XÁC!'}
      </div>
      ${
        isCorrect && lastAns.newStreak >= 2
          ? `<div style="font-size: 15px; font-weight: 800; color: #b45309; margin-top: 4px;">🔥 Chuỗi đúng liên tiếp: ${lastAns.newStreak} câu!</div>`
          : ''
      }
      ${
        !isCorrect
          ? `<div style="font-size: 15px; font-weight: 700; color: #991b1b; margin-top: 4px;">Đừng nản lòng, hãy xem đáp án đúng bên dưới để rút kinh nghiệm nhé!</div>`
          : ''
      }
    </div>

    <!-- Chi tiết đối chiếu đáp án -->
    ${detailsHtml}

    <!-- Lời giải thích (nếu có) -->
    ${explanationHtml}

    <!-- Nút hành động chuyển câu chủ động do học sinh bấm -->
    <button id="btn-quiz-proceed-next" type="button" class="btn-quiz-next-action">
      ${isLastQuestion ? '🏆 Xem Kết Quả Cuối Bài ➔' : 'Câu Tiếp Theo ➔'}
    </button>
  `;

  // Gắn sự kiện chuyển câu cho nút bấm
  const proceedBtn = document.getElementById('btn-quiz-proceed-next');
  if (proceedBtn) {
    proceedBtn.onclick = () => {
      state.isViewingQuizizzFeedback = false;
      const nextState = state.pendingQuizizzState || quizState;
      state.pendingQuizizzState = null;
      showQuizQuestion(nextState);
    };
  }
}

export function showQuestionReview(quizState) {
  if (typeof document === 'undefined') return;
  const feedback = document.getElementById('quiz-feedback');
  if (feedback) feedback.classList.remove('hidden');

  // Tìm tiến trình của học sinh
  const myProgress = quizState.participants?.[state.participantId];
  if (myProgress && myProgress.lastAnswer && feedback) {
    const isCorrect = myProgress.lastAnswer.isCorrect;
    if (isCorrect) {
      feedback.style.background = '#dcfce7';
      feedback.style.color = '#15803d';
      feedback.textContent = `🎉 CHÍNH XÁC! (+${myProgress.lastAnswer.pointsEarned || 1000} điểm)`;
      const streakEl = document.getElementById('quiz-streak-badge');
      if (streakEl) streakEl.textContent = `🔥 Chuỗi: ${myProgress.currentStreak}`;
    } else {
      feedback.style.background = '#fee2e2';
      feedback.style.color = '#b91c1c';
      feedback.textContent = '❌ Chưa chính xác!';
      const streakEl = document.getElementById('quiz-streak-badge');
      if (streakEl) streakEl.textContent = `🔥 Chuỗi: 0`;
    }
  }
  const footerStatus = document.getElementById('quiz-footer-status');
  if (footerStatus) footerStatus.textContent = 'Thầy cô đang giải thích đáp án trên màn chiếu.';
}

export function showLeaderboardStatus(quizState) {
  if (typeof document === 'undefined') return;
  const myProgress = quizState.participants?.[state.participantId];
  const score = myProgress?.score ?? 0;
  const footerStatus = document.getElementById('quiz-footer-status');
  if (footerStatus) {
    footerStatus.textContent = `Điểm số hiện tại của bạn: ${score} điểm. Quan sát bảng xếp hạng trên màn chiếu!`;
  }
}

export function showQuizFinished(quizState) {
  if (typeof document === 'undefined') return;
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.remove('hidden');

  const myProgress = quizState.participants?.[state.participantId];
  const score = myProgress?.score ?? 0;
  const correctCount = myProgress?.correctCount ?? 0;
  const total = quizState.totalQuestions ?? 0;
  const myRank = quizState.leaderboard?.find((l) => l.participantId === state.participantId)?.rank;

  const finishScore = document.getElementById('finish-score');
  if (finishScore) finishScore.textContent = `${score} điểm`;
  const finishExp = document.getElementById('finish-exp');
  if (finishExp) {
    finishExp.textContent = `Đúng ${correctCount}/${total} câu • Xếp hạng #${myRank ?? '-'} • Chúc mừng bạn đã hoàn thành bài thi!`;
  }

  // Tùy chọn chơi lại ở chế độ Quizizz
  const btnReplay = document.getElementById('btn-quiz-replay');
  const replayStats = document.getElementById('finish-replay-stats');
  const canReplay = quizState.mode === 'quizizz' && Boolean(quizState.allowReplay) && quizState.status !== 'finished';

  if (canReplay && btnReplay) {
    btnReplay.classList.remove('hidden');
    if (replayStats) {
      if (myProgress?.replayCount && myProgress.replayCount > 0) {
        replayStats.classList.remove('hidden');
        replayStats.textContent = `🎯 Lượt chơi: ${myProgress.replayCount + 1} • Điểm cao nhất đạt được: ${myProgress.bestScore ?? score} đ`;
      } else {
        replayStats.classList.add('hidden');
      }
    }
  } else {
    btnReplay?.classList.add('hidden');
    replayStats?.classList.add('hidden');
  }
}

/**
 * Xử lý khi học sinh bấm "Chơi lại lần nữa"
 */
export async function handleQuizReplay() {
  if (!state.currentRunId || !state.sessionData) return;
  const btn = document.getElementById('btn-quiz-replay');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Đang khởi tạo lượt chơi mới...';
  }

  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'restart_quiz',
        },
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      resetQuizState();
      if (resData.state) {
        state.quizState = resData.state;
        showQuizQuestion(resData.state);
      }
    } else {
      alert('Không thể bắt đầu lượt chơi lại.');
    }
  } catch {
    alert('Lỗi kết nối khi khởi động lượt chơi lại.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Chơi lại lần nữa';
    }
  }
}

if (typeof window !== 'undefined') {
  window.handleQuizReplay = handleQuizReplay;
}
