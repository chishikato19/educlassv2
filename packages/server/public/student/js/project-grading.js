/**
 * EduClass v2 — Student Portal Project Grading (Chấm điểm Dự án Đa chiều)
 * Hỗ trợ học sinh tự chấm, nhóm trưởng chấm thành viên & chấm chéo, và đổi người dùng chung máy (Kiosk)
 */

import { state } from './state.js';

let activeLeaderTab = 'self'; // 'self' | 'members' | 'cross'

export function handleProjectGradingUpdate(runId, gradingState) {
  state.projectGradingRunId = runId;
  state.projectGradingState = gradingState;

  if (typeof document === 'undefined') return;

  // Ẩn tất cả các màn hình khác
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('assignment-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');
  document.getElementById('territory-war-view')?.classList.add('hidden');
  document.getElementById('object-camera-view')?.classList.add('hidden');
  document.getElementById('pdf-presenter-view')?.classList.add('hidden');

  const viewEl = document.getElementById('project-grading-view');
  if (!viewEl) return;
  viewEl.classList.remove('hidden');

  renderProjectGradingView(runId, gradingState);
}

function renderProjectGradingView(runId, gradingState) {
  const container = document.getElementById('project-grading-container');
  if (!container) return;

  const { config, status, selfGrades, teamMemberGrades, crossTeamGrades, teacherGroupGrades } = gradingState;
  const participantId = state.participantId;
  const isFrozen = status === 'frozen';
  const isEnded = status === 'ended';

  // Xác định nhóm và vai trò của học sinh hiện tại
  const myGroup = config.groups.find((g) =>
    g.memberParticipantIds.includes(participantId) || g.leaderParticipantId === participantId
  );
  const isLeader = myGroup?.leaderParticipantId === participantId;

  // Điểm tự chấm của bản thân
  const mySelfGrade = selfGrades[participantId];

  let html = `
    <!-- Tiêu đề dự án & Trọng số -->
    <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div>
          <h2 style="font-size: 19px; font-weight: 800; margin: 0; color: #1e293b;">
            📋 ${escapeHtml(config.title)}
          </h2>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
            Trọng số: Tự chấm ${config.weights.self}% • Tổ chấm ${config.weights.teamMember}% • Chéo ${config.weights.crossTeam}% • GV ${config.weights.teacher}%
          </div>
        </div>
        <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 99px; ${
          isEnded
            ? 'background: #f1f5f9; color: #64748b;'
            : isFrozen
            ? 'background: #fef08a; color: #854d0e;'
            : 'background: #dcfce7; color: #15803d;'
        }">
          ${isEnded ? '🏁 Đã kết thúc' : isFrozen ? '🔒 Tạm khóa chấm' : '🟢 Đang mở chấm'}
        </span>
      </div>

      <!-- Thẻ thông tin nhóm của học sinh -->
      <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px;">
        <span style="font-size: 13px; font-weight: 700; color: #334155;">
          ${myGroup ? `🏢 ${escapeHtml(myGroup.name)}` : '⚠️ Chưa phân nhóm'}
        </span>
        <span style="font-size: 12px; font-weight: 700; color: ${isLeader ? '#d97706' : '#2563eb'};">
          ${isLeader ? '⭐ Nhóm trưởng' : '👤 Thành viên'}
        </span>
      </div>
    </div>
  `;

  if (isFrozen) {
    html += `
      <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #854d0e; font-weight: 600; text-align: center;">
        🔒 Thầy cô đang tạm chốt / khóa lượt chấm để tổng hợp điểm. Vui lòng quan sát màn chiếu!
      </div>
    `;
  }

  // Nếu là Nhóm trưởng: Hiển thị 3 Tabs
  if (isLeader) {
    html += `
      <div style="display: flex; gap: 6px; margin-bottom: 16px; background: #f1f5f9; padding: 4px; border-radius: 12px;">
        <button type="button" class="btn" style="flex: 1; min-height: 40px; font-size: 12px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; ${
          activeLeaderTab === 'self'
            ? 'background: #ffffff; color: #2563eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
            : 'background: transparent; color: #64748b;'
        }" onclick="window.switchProjectGradingTab('self')">
          👤 Tự chấm
        </button>
        <button type="button" class="btn" style="flex: 1; min-height: 40px; font-size: 12px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; ${
          activeLeaderTab === 'members'
            ? 'background: #ffffff; color: #9333ea; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
            : 'background: transparent; color: #64748b;'
        }" onclick="window.switchProjectGradingTab('members')">
          👥 Thành viên (${myGroup?.memberParticipantIds.filter((id) => id !== participantId).length || 0})
        </button>
        <button type="button" class="btn" style="flex: 1; min-height: 40px; font-size: 12px; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; ${
          activeLeaderTab === 'cross'
            ? 'background: #ffffff; color: #16a34a; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
            : 'background: transparent; color: #64748b;'
        }" onclick="window.switchProjectGradingTab('cross')">
          🔄 Nhóm bạn (${config.groups.filter((g) => g.id !== myGroup?.id).length})
        </button>
      </div>
    `;
  }

  // TAB 1: Tự chấm cá nhân (Áp dụng cho mọi học sinh hoặc tab 'self' của Leader)
  if (!isLeader || activeLeaderTab === 'self') {
    const currentScore = mySelfGrade?.score ?? 9.0;
    const currentComment = mySelfGrade?.comment ?? '';

    html += `
      <div style="background: #ffffff; border: 1.5px solid ${mySelfGrade ? '#86efac' : '#cbd5e1'}; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 15px; font-weight: 800; color: #1e293b;">
            1. Tự đánh giá bản thân (Trọng số: ${config.weights.self}%)
          </span>
          ${
            mySelfGrade
              ? `<span style="font-size: 12px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 8px;">✓ Đã lưu: ${mySelfGrade.score}đ</span>`
              : `<span style="font-size: 12px; font-weight: 600; color: #d97706;">Chưa gửi điểm</span>`
          }
        </div>

        <!-- Nhập điểm số -->
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            Điểm tự chấm (Thang điểm ${config.maxScore}):
          </label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn" style="width: 44px; height: 44px; font-size: 20px; font-weight: 800; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; cursor: pointer;" onclick="window.stepSelfScore(-0.5, ${config.maxScore})">-</button>
            <input type="number" id="pg-self-score-input" step="${config.stepScore}" min="0" max="${config.maxScore}" value="${currentScore}" style="flex: 1; height: 44px; text-align: center; font-size: 22px; font-weight: 800; color: #2563eb; border: 1.5px solid #cbd5e1; border-radius: 10px;" />
            <button type="button" class="btn" style="width: 44px; height: 44px; font-size: 20px; font-weight: 800; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; cursor: pointer;" onclick="window.stepSelfScore(0.5, ${config.maxScore})">+</button>
          </div>
        </div>

        <!-- Chips chọn nhanh -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
          ${[7, 8, 8.5, 9, 9.5, 10]
            .map(
              (s) => `
            <button type="button" style="padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff;" onclick="window.setSelfScoreDirect(${s})">${s}đ</button>
          `
            )
            .join('')}
        </div>

        <!-- Ô nhận xét đóng góp -->
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            Phần việc đã đóng góp & Tự nhận xét:
          </label>
          <textarea id="pg-self-comment-input" rows="2" placeholder="VD: Em đã hoàn thành tìm kiếm tài liệu và thiết kế 5 slide..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 10px;">${escapeHtml(currentComment)}</textarea>
        </div>

        <button type="button" class="btn btn-primary" style="width: 100%; min-height: 48px; font-size: 15px; font-weight: 800; border-radius: 12px;" onclick="window.submitSelfGrade()" ${isFrozen || isEnded ? 'disabled' : ''}>
          💾 ${mySelfGrade ? 'Cập nhật điểm tự chấm' : 'Xác nhận & Lưu điểm tự chấm'}
        </button>
      </div>
    `;
  }

  // TAB 2: Nhóm trưởng chấm thành viên nội bộ
  if (isLeader && activeLeaderTab === 'members') {
    const otherMembers = myGroup ? myGroup.memberParticipantIds.filter((id) => id !== participantId) : [];

    html += `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">
          2. Chấm điểm thành viên trong nhóm (Trọng số: ${config.weights.teamMember}%)
        </div>
    `;

    if (otherMembers.length === 0) {
      html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 13px; color: #64748b; text-align: center;">
          Nhóm của bạn hiện tại không có thành viên nào khác.
        </div>
      `;
    } else {
      otherMembers.forEach((mId) => {
        const saved = teamMemberGrades[participantId]?.[mId];
        const memScore = saved?.score ?? 8.5;
        const memComment = saved?.comment ?? '';

        html += `
          <div style="background: #ffffff; border: 1px solid ${saved ? '#86efac' : '#cbd5e1'}; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 14px; font-weight: 800; color: #1e293b;">👤 Bạn: ${escapeHtml(mId)}</span>
              ${
                saved
                  ? `<span style="font-size: 11px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 6px;">Đã chấm: ${saved.score}đ</span>`
                  : `<span style="font-size: 11px; color: #d97706; font-weight: 600;">Chưa chấm</span>`
              }
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <input type="number" id="pg-mem-score-${mId}" step="0.1" min="0" max="${config.maxScore}" value="${memScore}" style="width: 80px; height: 38px; text-align: center; font-size: 18px; font-weight: 800; border: 1px solid #cbd5e1; border-radius: 8px; color: #9333ea;" />
              <input type="text" id="pg-mem-comment-${mId}" placeholder="Nhận xét mức độ đóng góp..." value="${escapeHtml(memComment)}" style="flex: 1; height: 38px; padding: 0 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px;" />
            </div>

            <button type="button" class="btn" style="width: 100%; min-height: 40px; font-size: 13px; font-weight: 700; background: #9333ea; color: #ffffff; border-radius: 8px; border: none; cursor: pointer;" onclick="window.submitMemberGrade('${mId}')" ${isFrozen || isEnded ? 'disabled' : ''}>
              💾 Lưu điểm cho bạn này
            </button>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  // TAB 3: Nhóm trưởng chấm chéo nhóm khác
  if (isLeader && activeLeaderTab === 'cross') {
    const otherGroups = config.groups.filter((g) => g.id !== myGroup?.id);

    html += `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">
          3. Chấm chéo sản phẩm & thuyết trình nhóm bạn (Trọng số: ${config.weights.crossTeam}%)
        </div>
    `;

    if (otherGroups.length === 0) {
      html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 13px; color: #64748b; text-align: center;">
          Lớp chỉ có 1 nhóm, không có nhóm khác để chấm chéo.
        </div>
      `;
    } else {
      otherGroups.forEach((g) => {
        const saved = crossTeamGrades[participantId]?.[g.id];
        const gScore = saved?.score ?? 8.5;
        const gComment = saved?.comment ?? '';

        html += `
          <div style="background: #ffffff; border: 1px solid ${saved ? '#86efac' : '#cbd5e1'}; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 14px; font-weight: 800; color: #1e293b;">🏢 ${escapeHtml(g.name)} (${g.memberParticipantIds.length} HS)</span>
              ${
                saved
                  ? `<span style="font-size: 11px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 6px;">Đã chấm: ${saved.score}đ</span>`
                  : `<span style="font-size: 11px; color: #d97706; font-weight: 600;">Chưa chấm</span>`
              }
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <input type="number" id="pg-cross-score-${g.id}" step="0.1" min="0" max="${config.maxScore}" value="${gScore}" style="width: 80px; height: 38px; text-align: center; font-size: 18px; font-weight: 800; border: 1px solid #cbd5e1; border-radius: 8px; color: #16a34a;" />
              <input type="text" id="pg-cross-comment-${g.id}" placeholder="Nhận xét sản phẩm / thuyết trình nhóm bạn..." value="${escapeHtml(gComment)}" style="flex: 1; height: 38px; padding: 0 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px;" />
            </div>

            <button type="button" class="btn" style="width: 100%; min-height: 40px; font-size: 13px; font-weight: 700; background: #16a34a; color: #ffffff; border-radius: 8px; border: none; cursor: pointer;" onclick="window.submitCrossGrade('${g.id}')" ${isFrozen || isEnded ? 'disabled' : ''}>
              💾 Lưu điểm nhóm này
            </button>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  // NÚT KIOSK: Hoàn thành & Đổi học sinh khác
  html += `
    <div style="border-top: 1.5px dashed #cbd5e1; padding-top: 16px; margin-top: 20px; text-align: center;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        Thiết bị dùng chung trong phòng thực hành hoặc máy của tổ?
      </div>
      <button type="button" class="btn" style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; font-size: 14px; font-weight: 800; min-height: 48px; width: 100%; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25);" onclick="window.handleKioskSwitchStudent()">
        🔁 Hoàn thành & Đổi học sinh khác vào đánh giá
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function sendGradingIntent(intentPayload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    alert('Mất kết nối tới máy chủ. Vui lòng tải lại trang!');
    return;
  }
  const envelope = {
    v: 1,
    id: 'intent_' + Date.now(),
    type: 'intent',
    sessionId: state.sessionData?.id || '',
    runId: state.projectGradingRunId || '',
    ts: Date.now(),
    payload: intentPayload,
  };
  state.ws.send(JSON.stringify(envelope));
}

// Gắn handlers toàn cục lên window
if (typeof window !== 'undefined') {
  window.switchProjectGradingTab = (tab) => {
    activeLeaderTab = tab;
    if (state.projectGradingRunId && state.projectGradingState) {
      renderProjectGradingView(state.projectGradingRunId, state.projectGradingState);
    }
  };

  window.stepSelfScore = (delta, maxScore) => {
    const input = document.getElementById('pg-self-score-input');
    if (!input) return;
    const cur = parseFloat(input.value) || 0;
    const next = Math.max(0, Math.min(maxScore, Math.round((cur + delta) * 10) / 10));
    input.value = next;
  };

  window.setSelfScoreDirect = (val) => {
    const input = document.getElementById('pg-self-score-input');
    if (input) input.value = val;
  };

  window.submitSelfGrade = () => {
    const input = document.getElementById('pg-self-score-input');
    const commentInput = document.getElementById('pg-self-comment-input');
    if (!input) return;
    const score = parseFloat(input.value);
    if (Number.isNaN(score)) {
      alert('Vui lòng nhập điểm số hợp lệ');
      return;
    }
    const comment = commentInput ? commentInput.value.trim() : '';
    sendGradingIntent({
      type: 'submit_self_grade',
      score,
      comment: comment || undefined,
    });
    alert('✓ Đã gửi điểm tự đánh giá của bạn lên máy chủ!');
  };

  window.submitMemberGrade = (memberParticipantId) => {
    const input = document.getElementById(`pg-mem-score-${memberParticipantId}`);
    const commentInput = document.getElementById(`pg-mem-comment-${memberParticipantId}`);
    if (!input) return;
    const score = parseFloat(input.value);
    if (Number.isNaN(score)) {
      alert('Vui lòng nhập điểm số hợp lệ');
      return;
    }
    const comment = commentInput ? commentInput.value.trim() : '';
    sendGradingIntent({
      type: 'submit_team_member_grade',
      memberParticipantId,
      score,
      comment: comment || undefined,
    });
    alert('✓ Đã lưu điểm thành viên!');
  };

  window.submitCrossGrade = (targetGroupId) => {
    const input = document.getElementById(`pg-cross-score-${targetGroupId}`);
    const commentInput = document.getElementById(`pg-cross-comment-${targetGroupId}`);
    if (!input) return;
    const score = parseFloat(input.value);
    if (Number.isNaN(score)) {
      alert('Vui lòng nhập điểm số hợp lệ');
      return;
    }
    const comment = commentInput ? commentInput.value.trim() : '';
    sendGradingIntent({
      type: 'submit_cross_team_grade',
      targetGroupId,
      score,
      comment: comment || undefined,
    });
    alert('✓ Đã lưu điểm chấm chéo nhóm bạn!');
  };

  window.handleKioskSwitchStudent = () => {
    if (confirm('Bạn có chắc muốn thoát để học sinh khác vào chấm điểm?')) {
      if (typeof window.handleLeaveSession === 'function') {
        window.handleLeaveSession();
      }
    }
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
