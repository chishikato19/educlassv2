/**
 * EduClass v2 — Student Portal Swiss Duel Activity (v2.0.16 - v2.0.18)
 * Quản lý hoạt động Đấu Cờ Thụy Sỹ: 1v1 đối kháng, bốc thăm theo điểm, đếm ngược vòng đấu, nộp bài & bảng xếp hạng
 */

import { state } from './state.js';
import { renderMath } from './utils.js';

export function handleSwissDuelUpdate(runId, swissStateData) {
  if (!swissStateData) return;
  state.currentRunId = runId;
  state.swissState = swissStateData;

  // Reset câu trả lời khi sang vòng đấu mới
  if (swissStateData.currentRound && swissStateData.currentRound !== state.swissLastRound) {
    state.swissLastRound = swissStateData.currentRound;
    state.swissAnswers = {};
  }

  // Tự động tham gia nếu chưa có trong danh sách
  if (state.participantId && !swissStateData.participants?.[state.participantId] && state.sessionData) {
    void fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId,
        intent: { type: 'join_tournament', displayName: state.studentName },
      }),
    });
  }

  if (typeof document === 'undefined') return;

  // Ẩn tất cả các màn hình khác, hiện swiss-duel-view
  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  const swissView = document.getElementById('swiss-duel-view');
  swissView?.classList.remove('hidden');

  // Cập nhật Header
  const titleEl = document.getElementById('swiss-title');
  if (titleEl) titleEl.textContent = swissStateData.title || 'Đấu Cờ Thụy Sỹ';
  const roundText = `Vòng ${swissStateData.currentRound}/${swissStateData.totalRounds || '?'}`;
  const roundLabel = document.getElementById('swiss-round-label');
  if (roundLabel) roundLabel.textContent = roundText;

  const myParticipant = swissStateData.participants?.[state.participantId];
  const myPts = myParticipant?.tournamentPoints ?? 0;
  const myStreak = myParticipant?.streak ?? 0;
  const myPtsEl = document.getElementById('swiss-my-pts');
  if (myPtsEl) myPtsEl.textContent = String(myPts);
  const myStreakEl = document.getElementById('swiss-my-streak');
  if (myStreakEl) myStreakEl.textContent = String(myStreak);

  // Đồng hồ đếm ngược tổng thời gian các câu hỏi trong vòng đấu (không hiện thời gian cả giải đấu)
  const roundTimerBadge = document.getElementById('swiss-round-timer-badge');
  const roundTimerVal = document.getElementById('swiss-round-time-val');
  if (swissStateData.status === 'in_round' && swissStateData.roundStartedAt) {
    if (roundTimerBadge) roundTimerBadge.classList.remove('hidden');
    if (state.swissRoundInterval) clearInterval(state.swissRoundInterval);
    const roundTotalSec =
      (swissStateData.roundQuestions || []).reduce(
        (acc, q) => acc + (q.timeLimit || swissStateData.timeLimitPerQuestion || 30),
        0
      ) ||
      swissStateData.timeLimitPerQuestion * 2 ||
      60;
    const deadline = swissStateData.roundStartedAt + roundTotalSec * 1000;
    const updateRoundClock = () => {
      const diffMs = deadline - Date.now();
      const remain = Math.max(0, Math.ceil(diffMs / 1000));
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      if (roundTimerVal) {
        roundTimerVal.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    };
    updateRoundClock();
    state.swissRoundInterval = setInterval(updateRoundClock, 1000);
  } else {
    if (roundTimerBadge) roundTimerBadge.classList.add('hidden');
    if (state.swissRoundInterval) clearInterval(state.swissRoundInterval);
  }

  const byeBox = document.getElementById('swiss-bye-box');
  const matchBox = document.getElementById('swiss-match-box');
  const countdownBox = document.getElementById('swiss-countdown-box');
  const finishedBox = document.getElementById('swiss-finished-box');
  const submitContainer = document.getElementById('swiss-submit-container');

  if (swissStateData.status === 'finished') {
    byeBox?.classList.add('hidden');
    matchBox?.classList.add('hidden');
    countdownBox?.classList.add('hidden');
    submitContainer?.classList.add('hidden');
    finishedBox?.classList.remove('hidden');

    const myRank = swissStateData.leaderboard?.find((p) => p.participantId === state.participantId)?.rank ?? '-';
    const finalRankEl = document.getElementById('swiss-final-rank');
    if (finalRankEl) finalRankEl.textContent = `Hạng #${myRank}`;
    const finalDetailEl = document.getElementById('swiss-final-detail');
    if (finalDetailEl) {
      finalDetailEl.textContent = `${myPts} điểm • Thắng ${
        myParticipant?.matchesWon || 0
      } • Hòa ${myParticipant?.matchesDrawn || 0} • Thua ${myParticipant?.matchesLost || 0}`;
    }
    return;
  }

  finishedBox?.classList.add('hidden');

  // Tìm bàn đấu của học sinh
  const myMatchup = swissStateData.matchups?.find(
    (m) => m.player1Id === state.participantId || m.player2Id === state.participantId
  );
  const isBye = swissStateData.byePlayerId === state.participantId || Boolean(myParticipant?.isByeThisRound);

  if (isBye) {
    byeBox?.classList.remove('hidden');
    matchBox?.classList.add('hidden');
    submitContainer?.classList.add('hidden');
  } else {
    byeBox?.classList.add('hidden');
    matchBox?.classList.remove('hidden');

    if (myMatchup) {
      const tableNumEl = document.getElementById('swiss-table-num');
      if (tableNumEl) tableNumEl.textContent = String(myMatchup.tableNumber);
      const isP1 = myMatchup.player1Id === state.participantId;
      const oppId = isP1 ? myMatchup.player2Id : myMatchup.player1Id;
      const oppStudent = swissStateData.participants?.[oppId];
      const oppName =
        oppStudent?.displayName || (isP1 ? myMatchup.player2Name : myMatchup.player1Name) || 'Đối thủ';
      const oppNameEl = document.getElementById('swiss-opponent-name');
      if (oppNameEl) oppNameEl.textContent = oppName;

      const myScore = isP1 ? myMatchup.player1Score : myMatchup.player2Score;
      const oppScore = isP1 ? myMatchup.player2Score : myMatchup.player1Score;
      const myAnswered = isP1 ? myMatchup.player1Answered : myMatchup.player2Answered;
      const oppAnswered = isP1 ? myMatchup.player2Answered : myMatchup.player1Answered;

      const matchScoreEl = document.getElementById('swiss-match-score');
      if (matchScoreEl) {
        if (myAnswered && oppAnswered) {
          matchScoreEl.textContent = `${myScore} - ${oppScore}`;
        } else {
          matchScoreEl.textContent = `? - ?`;
        }
      }

      // Đồng bộ đáp án đã nộp từ server nếu có
      const myServerAnswers = isP1 ? myMatchup.player1Answers : myMatchup.player2Answers;
      if (myServerAnswers && typeof myServerAnswers === 'object' && Object.keys(myServerAnswers).length > 0) {
        state.swissAnswers = { ...myServerAnswers };
      }

      renderSwissQuestions(swissStateData.roundQuestions || [], Boolean(myAnswered));

      // Nút nộp bài - ĐẢM BẢO LUÔN HIỂN THỊ
      const btnSubmit = document.getElementById('swiss-btn-submit');
      submitContainer?.classList.remove('hidden');

      if (btnSubmit) {
        if (myAnswered) {
          btnSubmit.disabled = true;
          btnSubmit.style.opacity = '0.65';
          btnSubmit.style.cursor = 'not-allowed';
          btnSubmit.style.boxShadow = 'none';
          btnSubmit.textContent = oppAnswered ? '✓ VÁN ĐẤU ĐÃ HOÀN TẤT' : '⏳ ĐÃ NỘP BÀI - ĐỢI ĐỐI THỦ...';
        } else {
          btnSubmit.disabled = false;
          btnSubmit.style.opacity = '1';
          btnSubmit.style.cursor = 'pointer';
          const pickedCount = [0, 1].filter(
            (idx) => state.swissAnswers[idx] !== undefined && state.swissAnswers[idx] !== ''
          ).length;
          btnSubmit.textContent = `✓ XÁC NHẬN NỘP BÀI (${pickedCount}/2 câu)`;
          if (pickedCount === 2) {
            btnSubmit.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9)';
            btnSubmit.style.border = '2px solid #ffffff';
          } else {
            btnSubmit.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.4)';
            btnSubmit.style.border = '2px solid #ffd700';
          }
        }
      }

      // Hiển thị chi tiết đáp án khi cả 2 đã hoàn tất hoặc khi round_review
      const reviewBox = document.getElementById('swiss-answers-review-container');
      if (reviewBox) {
        if (myAnswered && oppAnswered) {
          reviewBox.classList.remove('hidden');
          renderSwissAnswersReview(myMatchup, isP1, swissStateData.roundQuestions || []);
        } else {
          reviewBox.classList.add('hidden');
        }
      }
    } else {
      const oppNameEl = document.getElementById('swiss-opponent-name');
      if (oppNameEl) oppNameEl.textContent = 'Chờ vòng sau...';
      const qContainer = document.getElementById('swiss-questions-container');
      if (qContainer) {
        qContainer.innerHTML = `
          <div style="text-align: center; color: #f4ecd8; padding: 24px 16px; background: rgba(30,19,11,0.85); border-radius: 16px; border: 1.5px solid #d4af37; margin: 12px 0;">
            <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
            <div style="font-size: 14px; font-weight: 800; color: #ffd700; margin-bottom: 6px;">BẠN VỪA THAM GIA PHÒNG ĐẤU!</div>
            <div style="font-size: 12px; color: #f8f4e9; line-height: 1.5; margin-bottom: 10px;">
              Hiệp đấu Vòng ${swissStateData.currentRound || 1} đang diễn ra.<br/>
              Hệ thống sẽ <b>tự động bốc thăm ghép bàn</b> cho bạn ở <b>VÒNG TIẾP THEO</b>!
            </div>
            <div style="font-size: 11px; color: #d4af37; opacity: 0.85;">Hãy chuẩn bị sẵn sàng so tài nhé!</div>
          </div>
        `;
      }
      submitContainer?.classList.add('hidden');
    }
  }

  // Xử lý đếm ngược 10 giây (round_review)
  if (swissStateData.status === 'round_review' && swissStateData.countdownEndsAt) {
    countdownBox?.classList.remove('hidden');
    updateSwissCountdown(swissStateData.countdownEndsAt);

    // Cập nhật banner kết quả ván đấu
    const banner = document.getElementById('swiss-round-result-banner');
    if (banner) {
      if (isBye) {
        banner.style.background = '#1e3a8a';
        banner.style.color = '#bfdbfe';
        banner.textContent = '👑 BẠN NHẬN SUẤT BYE: ĐƯỢC CỘNG THẲNG +2 ĐIỂM!';
      } else if (myMatchup && myMatchup.result !== 'in_progress') {
        const isP1 = myMatchup.player1Id === state.participantId;
        const won = (isP1 && myMatchup.result === 'player1_win') || (!isP1 && myMatchup.result === 'player2_win');
        const drawn = myMatchup.result === 'draw';
        if (won) {
          banner.style.background = '#14532d';
          banner.style.color = '#86efac';
          banner.textContent = '🎉 CHÚC MỪNG: BẠN ĐÃ CHIẾN THẮNG VÁN ĐẤU! (+2 ĐIỂM)';
        } else if (drawn) {
          banner.style.background = '#78350f';
          banner.style.color = '#fde68a';
          banner.textContent = '🤝 KẾT QUẢ HÒA TUYỆT ĐỐI! (+1 ĐIỂM CHO MỖI BÊN)';
        } else {
          banner.style.background = '#450a0a';
          banner.style.color = '#fca5a5';
          banner.textContent = '⚔️ BẠN ĐÃ THUA VÁN NÀY (0 ĐIỂM). CỐ GẮNG VÒNG SAU NHÉ!';
        }
      } else {
        banner.style.background = '#2b1f16';
        banner.style.color = '#ffd700';
        banner.textContent = '⏳ Vòng đấu vừa kết thúc, chuẩn bị bốc thăm vòng kế tiếp!';
      }
    }

    renderSwissMiniLeaderboard(swissStateData.leaderboard || []);
  } else {
    countdownBox?.classList.add('hidden');
    if (state.swissCountdownInterval) clearInterval(state.swissCountdownInterval);
  }
}

export function updateSwissCountdown(countdownEndsAt) {
  if (state.swissCountdownInterval) clearInterval(state.swissCountdownInterval);
  if (typeof document === 'undefined') return;
  const timerEl = document.getElementById('swiss-countdown-val');
  const tick = () => {
    const remain = Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000));
    if (timerEl) timerEl.textContent = `${remain}s`;
    if (remain <= 0) {
      clearInterval(state.swissCountdownInterval);
      // Sau khi hết 10s, kích hoạt poll để nhận state vòng mới ngay
      if (state.sessionData) {
        setTimeout(() => {
          void fetch(`/api/sessions/${state.sessionData.id}/activities/current`)
            .then((r) => r.json())
            .then((data) => {
              if (data?.activity?.state) {
                handleSwissDuelUpdate(data.activity.runId, data.activity.state);
              }
            })
            .catch(() => {});
        }, 600);
      }
    }
  };
  tick();
  state.swissCountdownInterval = setInterval(tick, 500);
}

export function renderSwissQuestions(questions, isLocked) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('swiss-questions-container');
  if (!container) return;
  container.innerHTML = '';

  questions.forEach((q, qIdx) => {
    const card = document.createElement('div');
    card.className = 'chess-parchment';
    const myAns = state.swissAnswers[qIdx];
    const hasChosen = myAns !== undefined && myAns !== '';

    const headerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 13px; font-weight: 800; color: #8b6508;">NƯỚC CỜ #${qIdx + 1} / 2</span>
        <span style="font-size: 12px; font-weight: 700; color: ${hasChosen ? '#16a34a' : '#b8860b'};">
          ${hasChosen ? '✓ Đã chọn đáp án' : 'Chưa chọn'}
        </span>
      </div>
      <div style="font-size: 15px; font-weight: 700; color: #201610; margin-bottom: 12px; line-height: 1.4;">
        ${renderMath(q.stem || '')}
      </div>
    `;

    let bodyHtml = '';

    // 1. Câu hỏi trả lời ngắn (short answer)
    if (q.type === 'short') {
      bodyHtml = `
        <div style="margin-top: 8px;">
          <input type="text"
            placeholder="Nhập câu trả lời của bạn..."
            value="${myAns !== undefined ? String(myAns).replace(/"/g, '&quot;') : ''}"
            ${isLocked ? 'disabled' : ''}
            style="width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; border: 2px solid #8b6508; font-size: 15px; font-weight: 700; color: #201610; background: #ffffff;"
            oninput="handleInputSwissShortAnswer(${qIdx}, this.value)"
          />
        </div>
      `;
    } else if (q.options && q.options.length > 0) {
      // 2. Trắc nghiệm MCQ
      const optLabels = ['A', 'B', 'C', 'D'];
      bodyHtml = '<div style="display: flex; flex-direction: column; gap: 6px;">';
      q.options.forEach((opt, optIdx) => {
        const isSelected = myAns === optIdx;
        bodyHtml += `
          <button type="button" class="chess-opt-btn ${isSelected ? 'selected' : ''}"
            ${isLocked ? 'disabled style="opacity: 0.8; cursor: not-allowed;"' : ''}
            onclick="handleSelectSwissLocalAnswer(${qIdx}, ${optIdx})">
            <span style="font-weight: 900; color: #b8860b; width: 22px;">${optLabels[optIdx]}.</span>
            <span style="flex: 1;">${renderMath(opt)}</span>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else {
      // 3. Đúng / Sai fallback
      bodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button type="button" class="chess-opt-btn ${myAns === true ? 'selected' : ''}"
            ${isLocked ? 'disabled style="opacity: 0.8; cursor: not-allowed;"' : ''}
            onclick="handleSelectSwissLocalAnswer(${qIdx}, true)">
            <span style="font-weight: 800; text-align: center; width: 100%;">ĐÚNG</span>
          </button>
          <button type="button" class="chess-opt-btn ${myAns === false ? 'selected' : ''}"
            ${isLocked ? 'disabled style="opacity: 0.8; cursor: not-allowed;"' : ''}
            onclick="handleSelectSwissLocalAnswer(${qIdx}, false)">
            <span style="font-weight: 800; text-align: center; width: 100%;">SAI</span>
          </button>
        </div>
      `;
    }

    card.innerHTML = headerHtml + bodyHtml;
    container.appendChild(card);
  });
}

export function handleSelectSwissLocalAnswer(questionIndex, answer) {
  state.swissAnswers[questionIndex] = answer;
  if (state.swissState?.roundQuestions) {
    renderSwissQuestions(state.swissState.roundQuestions, false);
  }
  updateSwissSubmitBtnState();
}

export function handleInputSwissShortAnswer(questionIndex, text) {
  state.swissAnswers[questionIndex] = text.trim();
  updateSwissSubmitBtnState();
}

export function updateSwissSubmitBtnState() {
  if (typeof document === 'undefined') return;
  const btnSubmit = document.getElementById('swiss-btn-submit');
  const submitContainer = document.getElementById('swiss-submit-container');
  if (submitContainer) submitContainer.classList.remove('hidden');
  if (btnSubmit) {
    const pickedCount = [0, 1].filter(
      (idx) => state.swissAnswers[idx] !== undefined && state.swissAnswers[idx] !== ''
    ).length;
    btnSubmit.textContent = `✓ XÁC NHẬN NỘP BÀI (${pickedCount}/2 câu)`;
    if (pickedCount === 2) {
      btnSubmit.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.95)';
      btnSubmit.style.border = '2px solid #ffffff';
      btnSubmit.style.transform = 'scale(1.01)';
    } else {
      btnSubmit.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.4)';
      btnSubmit.style.border = '2px solid #ffd700';
      btnSubmit.style.transform = 'none';
    }
  }
}

export async function handleSubmitSwissRound() {
  if (!state.currentRunId || !state.sessionData) return;
  const btnSubmit = typeof document !== 'undefined' ? document.getElementById('swiss-btn-submit') : null;
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = '⏳ Đang gửi bài...';
  }

  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.currentRunId,
        intent: {
          type: 'submit_round',
          answers: state.swissAnswers,
          displayName: state.studentName,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        handleSwissDuelUpdate(state.currentRunId, data.state);
      }
    }
  } catch {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Lỗi nộp bài, bấm thử lại';
    }
  }
}

export function renderSwissAnswersReview(matchup, isP1, questions) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('swiss-answers-review-container');
  if (!container) return;
  container.innerHTML =
    '<div style="font-weight: 800; font-size: 13px; color: #ffd700; margin-bottom: 4px;">🔍 CHI TIẾT ĐÁP ÁN VÁN ĐẤU:</div>';

  const myResults = isP1 ? matchup.player1Results : matchup.player2Results;
  const myAnsMap = isP1 ? matchup.player1Answers : matchup.player2Answers;

  [0, 1].forEach((qIdx) => {
    const q = questions[qIdx];
    const isRight = myResults ? myResults[qIdx] : false;
    const myAns = myAnsMap ? myAnsMap[qIdx] : state.swissAnswers[qIdx];

    const item = document.createElement('div');
    item.style.padding = '10px 12px';
    item.style.borderRadius = '10px';
    item.style.border = isRight ? '1px solid #16a34a' : '1px solid #dc2626';
    item.style.background = isRight ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)';
    item.style.fontSize = '12px';

    const optLabels = ['A', 'B', 'C', 'D'];
    let displayMyAns = myAns !== undefined ? String(myAns) : '(Chưa chọn)';
    if (typeof myAns === 'number' && optLabels[myAns]) {
      displayMyAns = `${optLabels[myAns]}`;
    }

    let displayCorrect = q?.correctAnswer !== undefined ? String(q.correctAnswer) : '';
    if (typeof q?.correctAnswer === 'number' && optLabels[q.correctAnswer]) {
      displayCorrect = `${optLabels[q.correctAnswer]}`;
    }

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 4px;">
        <span style="color: ${isRight ? '#86efac' : '#fca5a5'};">Câu ${qIdx + 1}: ${isRight ? 'ĐÚNG ✓ (+1 điểm)' : 'SAI ✗ (0 điểm)'}</span>
        ${displayCorrect ? `<span style="color: #ffd700; font-mono">Đáp án: ${displayCorrect}</span>` : ''}
      </div>
      <div style="color: #e2e8f0;">
        Lựa chọn của bạn: <b style="color: #ffffff;">${displayMyAns}</b>
      </div>
    `;
    container.appendChild(item);
  });
}

export function renderSwissMiniLeaderboard(leaderboard) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('swiss-mini-leaderboard');
  if (!container) return;
  container.innerHTML = '';

  leaderboard.slice(0, 8).forEach((entry) => {
    const isMe = entry.participantId === state.participantId;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '4px 8px';
    row.style.borderRadius = '8px';
    row.style.fontSize = '12px';
    row.style.background = isMe ? 'rgba(212, 175, 55, 0.25)' : 'transparent';
    row.style.border = isMe ? '1px solid #d4af37' : 'none';
    row.style.color = isMe ? '#ffd700' : '#fbf8ee';

    row.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-weight: 800; width: 20px;">#${entry.rank}</span>
        <span style="font-weight: 700;">${entry.displayName} ${isMe ? '(Bạn)' : ''}</span>
      </div>
      <div style="font-weight: 800; color: #ffd700;">
        ${entry.tournamentPoints} đ <span style="font-weight: 400; font-size: 10px; color: #94a3b8;">(${entry.matchesWon}T-${entry.matchesDrawn}H-${entry.matchesLost}B)</span>
      </div>
    `;
    container.appendChild(row);
  });
}
