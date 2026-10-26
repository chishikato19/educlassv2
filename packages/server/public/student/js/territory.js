/**
 * EduClass v2 — Student Portal Territory War
 * Quản lý hoạt động Đại Chiến Lãnh Thổ (Territory War) trên thiết bị Học Sinh
 */

import { state } from './state.js';

// Âm thanh tổng hợp Web Audio API (Offline 100%, không cần file mp3 ngoài)
const audioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}

const territorySound = {
  attack() {
    playTone(440, 0.12, 'sawtooth', 0.1);
    setTimeout(() => playTone(587, 0.15, 'sawtooth', 0.12), 60);
  },
  capture() {
    playTone(523, 0.1, 'triangle', 0.15);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.15), 80);
    setTimeout(() => playTone(784, 0.25, 'triangle', 0.2), 160);
  },
  error() {
    playTone(220, 0.2, 'square', 0.12);
    setTimeout(() => playTone(180, 0.25, 'square', 0.12), 120);
  },
  victory() {
    playTone(523, 0.12, 'triangle', 0.15);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.15), 100);
    setTimeout(() => playTone(784, 0.15, 'triangle', 0.18), 200);
    setTimeout(() => playTone(1046, 0.4, 'triangle', 0.22), 320);
  },
};

/**
 * Kiểm tra 2 ô có liền kề theo 4 hướng (Đông - Tây - Nam - Bắc)
 */
function isOrthogonalAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * Kiểm tra phe học sinh có quyền tương tác với ô này hay không
 */
function canTeamTargetCell(cells, team, targetCellId) {
  const target = cells[targetCellId];
  if (!target) return { allowed: false, reason: 'Ô không tồn tại' };

  // 1. Ô của phe mình: cho phép gia cố nếu chưa max
  if (target.owner === team) {
    if (target.reinforceLevel >= target.maxReinforce) {
      return { allowed: false, reason: 'Ô này đã đạt cấp gia cố tối đa' };
    }
    return { allowed: true, actionType: 'reinforce' };
  }

  // 2. Ô trung lập hoặc của địch: phải liền kề với ít nhất 1 ô phe mình
  const hasAdjacentFriendly = Object.values(cells).some(c => {
    return c.owner === team && isOrthogonalAdjacent(c, target);
  });

  if (!hasAdjacentFriendly) {
    return { allowed: false, reason: 'Chỉ được tấn công ô liền kề lãnh thổ phe mình' };
  }

  return { allowed: true, actionType: 'attack' };
}

/**
 * Gửi Intent của học sinh lên Server
 */
async function sendStudentIntent(intent) {
  if (!state.sessionData || !state.territoryRunId) return null;

  // 1. Thử qua WebSocket
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    try {
      state.ws.send(
        JSON.stringify({
          type: 'student_intent',
          payload: {
            runId: state.territoryRunId,
            intent,
          },
        })
      );
    } catch {}
  }

  // 2. REST fallback
  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.territoryRunId,
        intent,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi gửi intent học sinh Đại Chiến Lãnh Thổ:', err);
    return null;
  }
}

/**
 * Cập nhật trạng thái Đại Chiến Lãnh Thổ khi nhận dữ liệu từ server
 */
export function handleTerritoryWarUpdate(runId, territoryState) {
  state.territoryRunId = runId;
  state.territoryState = territoryState;
  state.activeView = 'territory-war';

  if (typeof document === 'undefined') return;

  // Ẩn toàn bộ các view khác
  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');
  document.getElementById('assignment-view')?.classList.add('hidden');
  document.getElementById('object-camera-view')?.classList.add('hidden');

  const territoryView = document.getElementById('territory-war-view');
  if (!territoryView) return;
  territoryView.classList.remove('hidden');

  const me = territoryState.participants ? territoryState.participants[state.participantId] : null;
  const myTeam = me ? me.team : 'blue';
  const isFinished = territoryState.status === 'finished';

  // 1. Top Bar: Huy hiệu đội của học sinh
  const teamBadgeEl = document.getElementById('tw-my-team-badge');
  if (teamBadgeEl) {
    if (myTeam === 'blue') {
      teamBadgeEl.textContent = '🔵 PHE XANH';
      teamBadgeEl.style.backgroundColor = '#1d4ed8';
      teamBadgeEl.style.color = '#ffffff';
    } else {
      teamBadgeEl.textContent = '🔴 PHE ĐỎ';
      teamBadgeEl.style.backgroundColor = '#b91c1c';
      teamBadgeEl.style.color = '#ffffff';
    }
  }

  // 2. Điểm số & Kéo co lãnh thổ
  const blueScoreEl = document.getElementById('tw-blue-score');
  const redScoreEl = document.getElementById('tw-red-score');
  if (blueScoreEl) blueScoreEl.textContent = `${territoryState.blueScore || 0}`;
  if (redScoreEl) redScoreEl.textContent = `${territoryState.redScore || 0}`;

  const totalLand = territoryState.totalCells || 49;
  const bluePercent = Math.round(((territoryState.blueCellCount || 0) / totalLand) * 100);
  const redPercent = Math.round(((territoryState.redCellCount || 0) / totalLand) * 100);
  const neutralPercent = Math.max(0, 100 - bluePercent - redPercent);

  const blueBar = document.getElementById('tw-bar-blue');
  const neutralBar = document.getElementById('tw-bar-neutral');
  const redBar = document.getElementById('tw-bar-red');
  if (blueBar) blueBar.style.width = `${bluePercent}%`;
  if (neutralBar) neutralBar.style.width = `${neutralPercent}%`;
  if (redBar) redBar.style.width = `${redPercent}%`;

  // 3. Đếm ngược thời gian trận đấu
  const timerEl = document.getElementById('tw-timer-text');
  if (timerEl) {
    if (territoryState.endTime && territoryState.status === 'in_progress') {
      const remainMs = Math.max(0, territoryState.endTime - Date.now());
      const totalSec = Math.floor(remainMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      timerEl.textContent = `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else if (isFinished) {
      timerEl.textContent = '🏁 Hết giờ';
    } else {
      timerEl.textContent = '⏱️ Chuẩn bị';
    }
  }

  // 4. Hồi chiêu cá nhân nếu trả lời sai
  const cooldownBox = document.getElementById('tw-cooldown-box');
  const cooldownText = document.getElementById('tw-cooldown-text');
  const isCooldown = Boolean(me && me.cooldownUntil && me.cooldownUntil > Date.now());
  if (cooldownBox && cooldownText) {
    if (isCooldown) {
      const secLeft = Math.ceil((me.cooldownUntil - Date.now()) / 1000);
      cooldownText.textContent = `⏳ Đang hồi phục thể lực, sẵn sàng sau ${secLeft}s nữa!`;
      cooldownBox.classList.remove('hidden');
    } else {
      cooldownBox.classList.add('hidden');
    }
  }

  // 5. Màn hình Kết Thúc trận đấu
  const finishedBox = document.getElementById('tw-finished-container');
  const battleBox = document.getElementById('tw-battle-container');

  if (isFinished && finishedBox && battleBox) {
    battleBox.classList.add('hidden');
    finishedBox.classList.remove('hidden');

    const winner = territoryState.winnerTeam;
    const isWinner = winner === myTeam;
    const isDraw = winner === 'draw';

    const titleEl = document.getElementById('tw-finished-title');
    if (titleEl) {
      titleEl.textContent = isWinner
        ? '👑 PHE CỦA BẠN ĐÃ TOÀN THẮNG!'
        : isDraw
        ? '🤝 HAI PHE BẤT PHÂN THẮNG BẠI!'
        : '🛡️ PHE ĐỐI PHƯƠNG ĐÃ CHIẾN THẮNG!';
      titleEl.style.color = isWinner ? '#38bdf8' : isDraw ? '#facc15' : '#f87171';
    }

    const reasonEl = document.getElementById('tw-finished-reason');
    if (reasonEl) {
      reasonEl.textContent = territoryState.winReason || 'Trận đại chiến đã kết thúc!';
    }

    const myContribEl = document.getElementById('tw-finished-my-stats');
    if (myContribEl && me) {
      const myScore = me.capturedCount * 5 + me.fortifiedCount * 2 + me.correctCount;
      myContribEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 8px 12px; margin-bottom: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">Đóng góp của bạn:</span>
          <span style="font-size: 16px; font-weight: 900; color: #facc15; font-family: monospace;">+${myScore} điểm</span>
        </div>
        <div style="display: flex; justify-content: space-around; gap: 8px; font-size: 12px; font-weight: 700; color: #cbd5e1;">
          <span>🏰 Chiếm: <b style="color: #34d399;">${me.capturedCount}</b> ô</span>
          <span>🛡️ Gia cố: <b style="color: #fbbf24;">${me.fortifiedCount}</b> lần</span>
          <span>✓ Đúng: <b style="color: #60a5fa;">${me.correctCount}</b> câu</span>
        </div>
      `;
    }

    const leaderboardEl = document.getElementById('tw-finished-leaderboard');
    if (leaderboardEl && territoryState.participants) {
      const participants = Object.values(territoryState.participants);
      participants.sort((a, b) => {
        const scoreA = a.capturedCount * 5 + a.fortifiedCount * 2 + a.correctCount;
        const scoreB = b.capturedCount * 5 + b.fortifiedCount * 2 + b.correctCount;
        return scoreB - scoreA;
      });

      let lbHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #334155;">
          <span style="font-size: 12px; font-weight: 800; color: #f8fafc;">🏆 BẢNG ĐIỂM TƯỚNG LĨNH (${participants.length} HS)</span>
          <span style="font-size: 11px; font-weight: 700; color: #facc15;">🔵${territoryState.blueScore || 0}đ - 🔴${territoryState.redScore || 0}đ</span>
        </div>
        <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px;">
      `;

      participants.forEach((p, idx) => {
        const pScore = p.capturedCount * 5 + p.fortifiedCount * 2 + p.correctCount;
        const isMe = p.participantId === state.participantId;
        const isBlue = p.team === 'blue';
        const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

        lbHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 10px; background: ${isMe ? 'rgba(245, 158, 11, 0.2)' : isBlue ? 'rgba(37, 99, 235, 0.15)' : 'rgba(220, 38, 38, 0.15)'}; border: 1px solid ${isMe ? '#f59e0b' : isBlue ? '#1d4ed8' : '#991b1b'}; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
              <span style="font-weight: 800; font-size: 11px; color: ${idx < 3 ? '#facc15' : '#94a3b8'}; width: 22px; text-align: center;">${rankMedal}</span>
              <span style="font-size: 13px;">${isBlue ? '🔵' : '🔴'}</span>
              <span style="font-weight: 700; color: ${isMe ? '#facc15' : '#ffffff'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;">
                ${p.displayName} ${isMe ? '(Bạn)' : ''}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; shrink: 0;">
              <span style="font-size: 10px; color: #94a3b8;">🏰${p.capturedCount} ✓${p.correctCount}</span>
              <span style="font-weight: 900; font-family: monospace; color: #facc15; font-size: 12px;">+${pScore}đ</span>
            </div>
          </div>
        `;
      });

      if (participants.length === 0) {
        lbHtml += `<div style="font-size: 11px; color: #64748b; text-align: center; padding: 8px;">Chưa có dữ liệu ghi điểm</div>`;
      }

      lbHtml += `</div>`;
      leaderboardEl.innerHTML = lbHtml;
    }
    return;
  }

  if (finishedBox) finishedBox.classList.add('hidden');
  if (battleBox) battleBox.classList.remove('hidden');

  // 6. Vẽ Bản đồ chiến sự SVG
  renderTerritoryGridSvg(territoryState, myTeam, me, isCooldown);

  // 7. Popup Câu hỏi khi đang công thành
  renderTerritoryQuestionModal(territoryState, me);
}

/**
 * Vẽ bản đồ SVG tương tác trên thiết bị học sinh
 */
function renderTerritoryGridSvg(territoryState, myTeam, me, isCooldown) {
  const container = document.getElementById('tw-grid-svg-container');
  if (!container) return;

  const size = territoryState.mapSize === '5x5' ? 5 : territoryState.mapSize === '7x7' ? 7 : 9;
  const cellSize = 80;
  const gap = 8;
  const padding = 12;
  const totalWidth = size * cellSize + (size - 1) * gap + padding * 2;
  const totalHeight = totalWidth;

  const cells = territoryState.cells || {};
  const myLockedCellId = me ? me.currentLockCellId : null;
  const isQuestionOpen = Boolean(myLockedCellId && cells[myLockedCellId]?.lockedBy?.question);

  let svgHtml = `
    <svg viewBox="0 0 ${totalWidth} ${totalHeight}" style="width: 100%; max-width: 420px; aspect-ratio: 1/1; border-radius: 20px; background: #0b1329; border: 3px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); touch-action: manipulation;">
      <defs>
        <linearGradient id="tw-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <linearGradient id="tw-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#b91c1c" />
        </linearGradient>
        <linearGradient id="tw-neutral" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
  `;

  for (const cell of Object.values(cells)) {
    const posX = padding + cell.x * (cellSize + gap);
    const posY = padding + cell.y * (cellSize + gap);

    const isMyLock = myLockedCellId === cell.id;
    const isLockedByOther = Boolean(cell.lockedBy && cell.lockedBy.participantId !== state.participantId);

    const targetCheck = canTeamTargetCell(cells, myTeam, cell.id);
    const isTargetable = targetCheck.allowed && !isCooldown && !isQuestionOpen && !isLockedByOther && territoryState.status === 'in_progress';

    let fillUrl = 'url(#tw-neutral)';
    let strokeColor = '#475569';
    let strokeWidth = 2;

    if (cell.owner === 'blue') {
      fillUrl = 'url(#tw-blue)';
      strokeColor = '#60a5fa';
      strokeWidth = 3;
    } else if (cell.owner === 'red') {
      fillUrl = 'url(#tw-red)';
      strokeColor = '#f87171';
      strokeWidth = 3;
    }

    if (isTargetable) {
      strokeColor = '#f59e0b';
      strokeWidth = 3.5;
    }

    if (isMyLock) {
      strokeColor = '#10b981';
      strokeWidth = 4;
    }

    let terrainIcon = '🌾';
    let iconSize = 22;
    if (cell.terrain === 'big_castle') {
      terrainIcon = '🏰';
      iconSize = 30;
    } else if (cell.terrain === 'small_castle') {
      terrainIcon = '🏯';
      iconSize = 26;
    } else if (cell.terrain === 'watchtower') {
      terrainIcon = '🗼';
      iconSize = 24;
    }

    svgHtml += `
      <g transform="translate(${posX}, ${posY})" style="cursor: ${isTargetable ? 'pointer' : 'default'};" onclick="window.handleSelectTerritoryCell('${cell.id}')">
        <rect width="${cellSize}" height="${cellSize}" rx="14" fill="${fillUrl}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
        <text x="${cellSize / 2}" y="${cell.terrain === 'plain' ? cellSize / 2 + 7 : cellSize / 2 - 3}" text-anchor="middle" font-size="${iconSize}" fill="#ffffff" style="pointer-events: none; user-select: none;">
          ${terrainIcon}
        </text>
    `;

    // HP & Giáp
    if (cell.terrain !== 'plain') {
      let hpLabel = `HP ${cell.currentHp}/${cell.maxHp}`;
      if (cell.owner === 'neutral') {
        if (cell.tugOfWarHp > 0) hpLabel = `🔵+${cell.tugOfWarHp}`;
        else if (cell.tugOfWarHp < 0) hpLabel = `🔴${cell.tugOfWarHp}`;
        else hpLabel = `HP ${cell.maxHp}`;
      } else if (cell.reinforceLevel > 0) {
        hpLabel += ` 🛡️+${cell.reinforceLevel}`;
      }

      svgHtml += `
        <text x="${cellSize / 2}" y="${cellSize - 10}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff" style="pointer-events: none;">
          ${hpLabel}
        </text>
      `;
    } else if (cell.reinforceLevel > 0) {
      svgHtml += `
        <text x="${cellSize / 2}" y="${cellSize - 10}" text-anchor="middle" font-size="10" font-weight="bold" fill="#fef08a" style="pointer-events: none;">
          🛡️+1
        </text>
      `;
    }

    // Đang có người khóa ô
    if (cell.lockedBy) {
      const lockName = cell.lockedBy.displayName || 'Chiến binh';
      svgHtml += `
        <rect x="4" y="4" width="${cellSize - 8}" height="${cellSize - 8}" rx="10" fill="rgba(0, 0, 0, 0.65)" style="pointer-events: none;" />
        <text x="${cellSize / 2}" y="${cellSize / 2 - 2}" text-anchor="middle" font-size="16" style="pointer-events: none;">⚔️</text>
        <text x="${cellSize / 2}" y="${cellSize / 2 + 15}" text-anchor="middle" font-size="9" font-weight="bold" fill="${isMyLock ? '#34d399' : '#fca5a5'}" style="pointer-events: none;">
          ${isMyLock ? 'Bạn đang đánh' : lockName.slice(0, 6)}
        </text>
      `;
    }

    // Chấm vàng nhấp nháy cho ô có thể đánh
    if (isTargetable && !cell.lockedBy) {
      svgHtml += `
        <circle cx="${cellSize - 12}" cy="12" r="5.5" fill="#f59e0b" style="pointer-events: none;" />
      `;
    }

    svgHtml += `</g>`;
  }

  svgHtml += `</svg>`;
  container.innerHTML = svgHtml;
}

/**
 * Hiển thị Modal Câu Hỏi khi học sinh đang công thành
 */
function renderTerritoryQuestionModal(territoryState, me) {
  const modal = document.getElementById('tw-question-modal');
  if (!modal) return;

  const myLockedCellId = me ? me.currentLockCellId : null;
  const cell = myLockedCellId && territoryState.cells ? territoryState.cells[myLockedCellId] : null;
  const question = cell && cell.lockedBy?.participantId === state.participantId ? cell.lockedBy.question : null;

  if (!question) {
    modal.classList.add('hidden');
    return;
  }

  modal.classList.remove('hidden');

  const stemEl = document.getElementById('tw-modal-stem');
  if (stemEl) stemEl.textContent = question.stem || 'Câu hỏi công thành:';

  const optionsContainer = document.getElementById('tw-modal-options');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';

  let opts = [];
  if (question.type === 'tf') {
    opts = ['Đúng', 'Sai'];
  } else if (Array.isArray(question.options)) {
    opts = question.options;
  }

  opts.forEach((optText, oIdx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.style.cssText = `
      width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 14px;
      font-size: 15px; font-weight: 700; text-align: left; cursor: pointer;
      border: 2px solid #334155; background-color: #1e293b; color: #ffffff;
      transition: all 0.15s ease;
    `;
    btn.textContent = `${String.fromCharCode(65 + oIdx)}. ${optText}`;

    btn.onclick = () => {
      territorySound.attack();
      btn.style.borderColor = '#38bdf8';
      btn.style.backgroundColor = '#0369a1';
      window.handleSubmitTerritoryAnswer(question.type === 'tf' ? optText === 'Đúng' : optText);
    };

    optionsContainer.appendChild(btn);
  });
}

/**
 * Handler khi học sinh chạm chọn ô trên bản đồ
 */
export async function handleSelectTerritoryCell(cellId) {
  if (!state.territoryState || state.territoryState.status !== 'in_progress') return;

  const me = state.territoryState.participants ? state.territoryState.participants[state.participantId] : null;
  if (me?.cooldownUntil && me.cooldownUntil > Date.now()) return;

  territorySound.attack();
  await sendStudentIntent({ type: 'lock_cell', cellId });
}

/**
 * Handler nộp câu trả lời công thành
 */
export async function handleSubmitTerritoryAnswer(answer) {
  if (!state.territoryState) return;

  const me = state.territoryState.participants ? state.territoryState.participants[state.participantId] : null;
  if (!me?.currentLockCellId) return;

  const cellId = me.currentLockCellId;
  const res = await sendStudentIntent({ type: 'submit_answer', cellId, answer });

  // Đóng modal câu hỏi
  const modal = document.getElementById('tw-question-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Handler hủy ô không tấn công nữa
 */
export async function handleCancelTerritoryCell() {
  if (!state.territoryState) return;

  const me = state.territoryState.participants ? state.territoryState.participants[state.participantId] : null;
  if (!me?.currentLockCellId) return;

  const cellId = me.currentLockCellId;
  await sendStudentIntent({ type: 'cancel_cell', cellId });

  const modal = document.getElementById('tw-question-modal');
  if (modal) modal.classList.add('hidden');
}
