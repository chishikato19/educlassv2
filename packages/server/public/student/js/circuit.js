/**
 * EduClass v2 — Student Portal Circuit Race Activity
 * Quản lý hoạt động Đường Đua Tri Thức trên trình duyệt Học Sinh
 */

import { state } from './state.js';
import { renderMath } from './utils.js';

let localSelectedMcq = null;
let localSelectedTf = null;
let localTfGroupSelected = [null, null, null, null];

/**
 * Gửi intent của học sinh lên máy chủ
 */
function sendCircuitIntent(type, payload = {}) {
  if (!state.sessionData || !state.circuitRunId) return;
  fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantToken: state.participantToken,
      runId: state.circuitRunId,
      intent: { type, ...payload },
    }),
  }).catch(() => {});
}

export function handleSelectCircuitMcq(optIdx) {
  localSelectedMcq = optIdx;
  sendCircuitIntent('submit_answer', { answer: optIdx });
}

export function handleSelectCircuitTf(boolVal) {
  localSelectedTf = boolVal;
  sendCircuitIntent('submit_answer', { answer: boolVal });
}

export function handleSelectCircuitTfGroupItem(itemIdx, boolVal) {
  localTfGroupSelected[itemIdx] = boolVal;
  renderCircuitView();
  if (localTfGroupSelected.every(v => v !== null)) {
    sendCircuitIntent('submit_answer', { answer: [...localTfGroupSelected] });
  }
}

export function handleSubmitCircuitShort() {
  const inputEl = document.getElementById('circuit-short-input');
  const val = inputEl ? inputEl.value.trim() : '';
  if (!val) return;
  sendCircuitIntent('submit_answer', { answer: val });
}

export function handleUseCircuitCard(cardId) {
  sendCircuitIntent('use_card', { cardId });
}

export function handleDiscardCircuitCard(cardId) {
  sendCircuitIntent('discard_card', { cardId });
}

export function handleSkipCircuitCard() {
  sendCircuitIntent('skip_card');
}

/**
 * Nhận gói cập nhật từ WebSocket hoặc Polling
 */
export function handleCircuitRaceUpdate(runId, circuitStateData) {
  if (!circuitStateData) return;
  state.circuitRunId = runId;
  state.circuitState = circuitStateData;

  // Tự động đăng ký thông tin nếu vừa vào
  if (!circuitStateData.participants?.[state.participantId] && state.sessionData) {
    sendCircuitIntent('register_info', {
      displayName: state.studentName,
      avatarJson: state.avatarConfig ? JSON.stringify(state.avatarConfig) : null,
    });
  }

  // Đổi round -> reset lựa chọn
  if (circuitStateData.round && circuitStateData.round !== state.circuitLastRound) {
    state.circuitLastRound = circuitStateData.round;
    localSelectedMcq = null;
    localSelectedTf = null;
    localTfGroupSelected = [null, null, null, null];
  }

  renderCircuitView();
}

/**
 * Render toàn bộ giao diện Đường Đua Tri Thức
 */
function renderCircuitView() {
  const circuitStateData = state.circuitState;
  if (!circuitStateData || typeof document === 'undefined') return;

  // Ẩn các màn hình khác
  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');
  document.getElementById('territory-war-view')?.classList.add('hidden');

  const view = document.getElementById('circuit-race-view');
  if (!view) return;
  view.classList.remove('hidden');

  const me = circuitStateData.participants?.[state.participantId] || {
    position: 0,
    streak: 0,
    inventory: [],
    answeredCurrent: false,
    lastAnswerCorrect: null,
    lastDiceRoll: null,
    lastMoveSteps: null,
    cardActionDone: false,
    hasShield: false,
    mudTrapped: false,
    receivedNotifications: [],
  };

  // Header thông tin
  const roundEl = document.getElementById('circuit-round-label');
  if (roundEl) roundEl.textContent = `Vòng ${circuitStateData.round}/${circuitStateData.totalRounds || '?'}`;
  const posEl = document.getElementById('circuit-my-pos');
  if (posEl) posEl.textContent = `Ô ${me.position}/${circuitStateData.track?.length - 1 || 50}`;

  const streakBadge = document.getElementById('circuit-streak-badge');
  if (streakBadge) {
    if (me.streak >= 2) {
      streakBadge.classList.remove('hidden');
      streakBadge.textContent = `🔥 Chuỗi ${me.streak}`;
    } else {
      streakBadge.classList.add('hidden');
    }
  }

  const shieldBadge = document.getElementById('circuit-shield-badge');
  if (shieldBadge) {
    shieldBadge.classList.toggle('hidden', !me.hasShield);
  }

  const mudBadge = document.getElementById('circuit-mud-badge');
  if (mudBadge) {
    mudBadge.classList.toggle('hidden', !me.mudTrapped);
  }

  // Thông báo mới nhất
  const notifEl = document.getElementById('circuit-notif-box');
  const latestNotif = me.receivedNotifications?.[0];
  if (notifEl) {
    if (latestNotif) {
      notifEl.classList.remove('hidden');
      notifEl.textContent = `${latestNotif.isAlert ? '⚠️' : '🔔'} ${latestNotif.message}`;
    } else {
      notifEl.classList.add('hidden');
    }
  }

  // Đường đua mini
  const trackContainer = document.getElementById('circuit-mini-track');
  if (trackContainer && circuitStateData.track) {
    trackContainer.innerHTML = '';
    const track = circuitStateData.track;
    const playersByTile = {};
    Object.values(circuitStateData.participants || {}).forEach(p => {
      if (!playersByTile[p.position]) playersByTile[p.position] = [];
      playersByTile[p.position].push(p);
    });

    track.forEach(tile => {
      const tileDiv = document.createElement('div');
      tileDiv.style.minWidth = '48px';
      tileDiv.style.height = '48px';
      tileDiv.style.borderRadius = '12px';
      tileDiv.style.display = 'flex';
      tileDiv.style.flexDirection = 'column';
      tileDiv.style.alignItems = 'center';
      tileDiv.style.justifyContent = 'center';
      tileDiv.style.fontWeight = '800';
      tileDiv.style.fontSize = '11px';
      tileDiv.style.border = tile.index === me.position ? '2.5px solid #FFB020' : '1px solid #CBD5E1';
      tileDiv.style.background = tile.index === me.position ? '#FEF3C7' : '#FFFFFF';

      let icon = '';
      if (tile.type === 'boost') icon = '🚀';
      else if (tile.type === 'mud') icon = '🕳️';
      else if (tile.type === 'mystery') icon = '🎁';
      else if (tile.type === 'checkpoint') icon = '🛑';
      else if (tile.index === track.length - 1) icon = '🏁';

      tileDiv.innerHTML = `<span>${icon}</span><span>${tile.index}</span>`;
      trackContainer.appendChild(tileDiv);
    });
  }

  // Bục vinh quang (Podium)
  const podiumBox = document.getElementById('circuit-podium-box');
  const qBox = document.getElementById('circuit-question-box');

  if (circuitStateData.phase === 'podium') {
    if (podiumBox) {
      podiumBox.classList.remove('hidden');
      const r1 = document.getElementById('circuit-podium-r1');
      if (r1) r1.textContent = circuitStateData.podium?.rank1 || '---';
    }
    if (qBox) qBox.classList.add('hidden');
    return;
  }

  if (podiumBox) podiumBox.classList.add('hidden');
  if (qBox) qBox.classList.remove('hidden');

  // Thân câu hỏi (ưu tiên câu hỏi được giao riêng cho học sinh nếu bật chế độ đảo thứ tự câu)
  const currentQ = me.assignedQuestion || circuitStateData.currentQuestion;
  const stemEl = document.getElementById('circuit-q-stem');
  if (stemEl && currentQ) {
    stemEl.textContent = currentQ.stem || '';
  }

  const optContainer = document.getElementById('circuit-q-options');
  if (optContainer && currentQ) {
    optContainer.innerHTML = '';

    // Dạng MCQ4
    if (currentQ.type === 'mcq4' && currentQ.options) {
      currentQ.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-opt';
        btn.disabled = me.answeredCurrent;
        btn.style.width = '100%';
        btn.style.minHeight = '48px';
        btn.style.padding = '10px 14px';
        btn.style.marginBottom = '8px';
        btn.style.borderRadius = '12px';
        btn.style.border = localSelectedMcq === idx ? '2px solid #2563EB' : '1px solid #E2E8F0';
        btn.style.background = localSelectedMcq === idx ? '#4F8CFF' : '#F8FAFC';
        btn.style.color = localSelectedMcq === idx ? '#FFFFFF' : '#1E293B';
        btn.style.fontWeight = '700';
        btn.style.textAlign = 'left';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '8px';
        btn.innerHTML = `<span style="width:24px;height:24px;border-radius:6px;background:${localSelectedMcq === idx ? '#fff' : '#e2e8f0'};color:${localSelectedMcq === idx ? '#4f8cff' : '#475569'};display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">${String.fromCharCode(65 + idx)}</span><span>${opt}</span>`;
        btn.onclick = () => handleSelectCircuitMcq(idx);
        optContainer.appendChild(btn);
      });
    }

    // Dạng Đúng / Sai (TF)
    else if (currentQ.type === 'tf') {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';

      const btnT = document.createElement('button');
      btnT.type = 'button';
      btnT.disabled = me.answeredCurrent;
      btnT.style.flex = '1';
      btnT.style.minHeight = '50px';
      btnT.style.borderRadius = '12px';
      btnT.style.border = '2px solid #2ECC8F';
      btnT.style.background = localSelectedTf === true ? '#2ECC8F' : '#E8F5E9';
      btnT.style.color = localSelectedTf === true ? '#FFFFFF' : '#15803D';
      btnT.style.fontWeight = '800';
      btnT.textContent = '✓ ĐÚNG';
      btnT.onclick = () => handleSelectCircuitTf(true);

      const btnF = document.createElement('button');
      btnF.type = 'button';
      btnF.disabled = me.answeredCurrent;
      btnF.style.flex = '1';
      btnF.style.minHeight = '50px';
      btnF.style.borderRadius = '12px';
      btnF.style.border = '2px solid #FF6B6B';
      btnF.style.background = localSelectedTf === false ? '#FF6B6B' : '#FEE2E2';
      btnF.style.color = localSelectedTf === false ? '#FFFFFF' : '#B91C1C';
      btnF.style.fontWeight = '800';
      btnF.textContent = '✕ SAI';
      btnF.onclick = () => handleSelectCircuitTf(false);

      row.appendChild(btnT);
      row.appendChild(btnF);
      optContainer.appendChild(row);
    }

    // Dạng Chùm Đúng / Sai (TF Group)
    else if (currentQ.type === 'tf_group' && currentQ.items) {
      currentQ.items.forEach((it, idx) => {
        const itemBox = document.createElement('div');
        itemBox.style.background = '#F8FAFC';
        itemBox.style.border = '1px solid #E2E8F0';
        itemBox.style.borderRadius = '10px';
        itemBox.style.padding = '8px 12px';
        itemBox.style.marginBottom = '8px';

        itemBox.innerHTML = `
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;"><strong>${String.fromCharCode(97 + idx)})</strong> ${it.text}</div>
          <div style="display:flex;gap:8px;">
            <button type="button" ${me.answeredCurrent ? 'disabled' : ''} onclick="handleSelectCircuitTfGroupItem(${idx}, true)" style="flex:1;min-height:36px;border-radius:8px;border:1.5px solid #2ECC8F;background:${localTfGroupSelected[idx] === true ? '#2ECC8F' : '#fff'};color:${localTfGroupSelected[idx] === true ? '#fff' : '#15803d'};font-weight:800;font-size:12px;">Đúng</button>
            <button type="button" ${me.answeredCurrent ? 'disabled' : ''} onclick="handleSelectCircuitTfGroupItem(${idx}, false)" style="flex:1;min-height:36px;border-radius:8px;border:1.5px solid #FF6B6B;background:${localTfGroupSelected[idx] === false ? '#FF6B6B' : '#fff'};color:${localTfGroupSelected[idx] === false ? '#fff' : '#b91c1c'};font-weight:800;font-size:12px;">Sai</button>
          </div>
        `;
        optContainer.appendChild(itemBox);
      });
    }

    // Dạng Điền ngắn (Short)
    else if (currentQ.type === 'short') {
      const form = document.createElement('div');
      form.style.display = 'flex';
      form.style.gap = '8px';
      form.innerHTML = `
        <input type="text" id="circuit-short-input" ${me.answeredCurrent ? 'disabled' : ''} placeholder="Nhập đáp án ngắn..." style="flex:1;min-height:48px;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:12px;font-size:14px;font-weight:600;" />
        <button type="button" ${me.answeredCurrent ? 'disabled' : ''} onclick="handleSubmitCircuitShort()" style="min-height:48px;padding:0 16px;background:#4F8CFF;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;">Gửi</button>
      `;
      optContainer.appendChild(form);
    }
  }

  // Kết quả sau khi nộp
  const resBox = document.getElementById('circuit-dice-res');
  if (resBox) {
    if (me.answeredCurrent) {
      resBox.classList.remove('hidden');
      resBox.style.background = me.lastAnswerCorrect ? '#ECFDF5' : '#FFF1F2';
      resBox.style.border = `1.5px solid ${me.lastAnswerCorrect ? '#A7F3D0' : '#FECDD3'}`;
      resBox.innerHTML = `
        <div style="font-size:13px;font-weight:800;color:${me.lastAnswerCorrect ? '#065F46' : '#9F1239'}">
          ${me.lastAnswerCorrect ? `🎲 Xúc xắc: ${me.lastDiceRoll || 0} nút ➔ Tiến ${me.lastMoveSteps || 0} ô` : '✕ Trả lời chưa chính xác. Bạn dừng bánh vòng này!'}
        </div>
      `;
    } else {
      resBox.classList.add('hidden');
    }
  }

  // Túi đồ (Inventory)
  const invBox = document.getElementById('circuit-inventory-list');
  const isActionWindow = circuitStateData.phase === 'action_window';
  if (invBox) {
    invBox.innerHTML = '';
    const items = me.inventory || [];
    if (items.length === 0) {
      invBox.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px;text-align:center;">Chưa có thẻ bổ trợ nào</div>';
    } else {
      items.forEach(card => {
        const cDiv = document.createElement('div');
        cDiv.style.flex = '1';
        cDiv.style.background = isActionWindow ? '#FEF3C7' : '#F8FAFC';
        cDiv.style.border = isActionWindow ? '2px solid #F59E0B' : '1px solid #CBD5E1';
        cDiv.style.borderRadius = '12px';
        cDiv.style.padding = '8px';
        cDiv.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:18px;">${card.icon}</span><span style="font-size:12px;font-weight:800;">${card.name}</span></div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">${card.description}</div>
          <div style="display:flex;gap:4px;margin-top:6px;">
            <button type="button" ${!isActionWindow ? 'disabled' : ''} onclick="handleUseCircuitCard('${card.id}')" style="flex:1;min-height:34px;background:${isActionWindow ? '#F59E0B' : '#E2E8F0'};color:${isActionWindow ? '#fff' : '#94a3b8'};border:none;border-radius:6px;font-weight:800;font-size:11px;cursor:${isActionWindow ? 'pointer' : 'not-allowed'};">Dùng</button>
            <button type="button" onclick="handleDiscardCircuitCard('${card.id}')" style="min-width:30px;min-height:34px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:6px;font-size:11px;cursor:pointer;">🗑️</button>
          </div>
        `;
        invBox.appendChild(cDiv);
      });
    }
  }

  // Nút bỏ qua thẻ
  const skipBtn = document.getElementById('circuit-skip-card-btn');
  if (skipBtn) {
    skipBtn.classList.toggle('hidden', !(isActionWindow && me.lastAnswerCorrect && !me.cardActionDone));
  }

  renderMath();
}
