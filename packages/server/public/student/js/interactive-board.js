/**
 * EduClass v2 — Student Portal Interactive Board (Bảng Tương Tác Lớp Học)
 * Hỗ trợ học sinh nộp bài (chữ, nét vẽ tay, hình ảnh nén), duyệt bài, thả tim/like,
 * bình luận và chấm điểm chéo (peer grading).
 *
 * Chống giật lag/reset:
 * - So sánh trạng thái (state hash/JSON) để không re-render khi không có thay đổi từ server.
 * - Cô lập Form nộp bài: Khi học sinh đang gõ chữ hoặc vẽ nét, giữ nguyên DOM của Form,
 *   không xóa canvas và textarea của học sinh.
 * - Lưu draft tự động theo thời gian thực (real-time draft).
 * - Gửi intent qua HTTP REST /api/sessions/:id/activities/student-intent chuẩn EduClass v2.
 */

import { state } from './state.js';
import { renderMath } from './utils.js';

let lastRenderedStateJson = '';
let isSubmissionFormOpen = false;

// Draft bài nộp đang soạn
let draftTab = 'text'; // 'worksheet' | 'text' | 'draw' | 'image'
let draftColor = 'yellow'; // 'yellow' | 'mint' | 'blue' | 'pink' | 'purple'
let draftText = '';
let draftDrawingDataUrl = '';
let draftImageDataUrl = '';
let draftWorksheetAnswers = {};

function getQuestionText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && 'text' in val) return String(val.text || '');
  return '';
}

// Drawing canvas variables
let boardCanvas = null;
let boardCtx = null;
let isDrawing = false;
let currentPenColor = '#1e293b';
let currentPenSize = 4;

const NOTE_COLORS = {
  yellow: { label: 'Vàng', bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
  mint: { label: 'Bạc hà', bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
  blue: { label: 'Xanh dương', bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  pink: { label: 'Hồng', bg: '#fdf2f8', border: '#f472b6', text: '#9d174d' },
  purple: { label: 'Tím', bg: '#faf5ff', border: '#c084fc', text: '#6b21a8' },
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gửi Intent của học sinh lên máy chủ qua HTTP REST chuẩn
 */
async function sendBoardIntent(intent) {
  if (!state.sessionData || !state.interactiveBoardRunId) {
    alert('Chưa có thông tin phiên hoạt động!');
    return { ok: false, reason: 'Chưa vào phiên' };
  }

  try {
    const res = await fetch(`/api/sessions/${state.sessionData.id}/activities/student-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantToken: state.participantToken,
        runId: state.interactiveBoardRunId,
        intent,
      }),
    });

    if (!res.ok) {
      let reason = 'Không thể gửi yêu cầu';
      try {
        const errData = await res.json();
        reason = errData.reason || errData.message || reason;
      } catch {}
      return { ok: false, reason };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'Mất kết nối máy chủ phòng học. Vui lòng kiểm tra lại sóng WiFi!',
    };
  }
}

/**
 * Điểm vào khi nhận cập nhật trạng thái từ WebSocket hoặc Poller
 */
export function handleInteractiveBoardUpdate(runId, boardState) {
  state.interactiveBoardRunId = runId;
  state.interactiveBoardState = boardState;

  if (typeof document === 'undefined') return;

  // 1. Chống reset: Nếu dữ liệu giống hệt lần render trước thì bỏ qua, không làm gián đoạn HS
  const currentJson = JSON.stringify(boardState);
  if (currentJson === lastRenderedStateJson) {
    return;
  }

  // 2. Ẩn tất cả các view khác
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('assignment-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');
  document.getElementById('territory-war-view')?.classList.add('hidden');
  document.getElementById('object-camera-view')?.classList.add('hidden');
  document.getElementById('pdf-presenter-view')?.classList.add('hidden');
  document.getElementById('project-grading-view')?.classList.add('hidden');

  const viewEl = document.getElementById('interactive-board-view');
  if (!viewEl) return;
  viewEl.classList.remove('hidden');

  // Lưu lại bản nháp người dùng đang gõ dở nếu form đang mở trước khi render lại
  saveCurrentFormDraft();

  lastRenderedStateJson = currentJson;
  renderInteractiveBoardView(runId, boardState);
}

/**
 * Lưu các giá trị HS đang gõ/vẽ dở vào bộ nhớ đệm
 */
function saveCurrentFormDraft() {
  if (!isSubmissionFormOpen) return;
  const textEl = document.getElementById('board-text-content');
  if (textEl) {
    draftText = textEl.value;
  }
  if (boardCanvas && draftTab === 'draw') {
    try {
      draftDrawingDataUrl = boardCanvas.toDataURL('image/png');
    } catch {}
  }
}

/**
 * Render toàn bộ giao diện Bảng Tương Tác
 */
function renderInteractiveBoardView(runId, boardState) {
  const container = document.getElementById('interactive-board-container');
  if (!container) return;

  if (!boardState || !boardState.config) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: #64748b;">
        <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
        <div style="font-size: 14px; font-weight: 700;">Đang tải dữ liệu Bảng Tương Tác...</div>
      </div>
    `;
    return;
  }

  const { config, status, isGlobalMuted, mutedParticipants, posts } = boardState;
  const participantId = state?.participantId || '';
  const isMuted = isGlobalMuted || (mutedParticipants && mutedParticipants.includes(participantId));

  const postsObj = posts || {};
  const allPostsList = Object.values(postsObj);
  const myPost = participantId ? postsObj[participantId] : null; // Mỗi học sinh 1 bài nộp
  const hasSubmitted = Boolean(
    myPost && (myPost.text || myPost.imageUrl || myPost.drawingDataUrl || myPost.worksheetResult)
  );
  const approvedPosts = allPostsList.filter(
    (p) => p.status === 'approved' || (participantId && p.participantId === participantId)
  );

  let statusBadgeText = '🟢 Đang nhận bài';
  let statusBadgeStyle = 'background: #dcfce7; color: #15803d;';
  if (status === 'discussion_only') {
    statusBadgeText = '💬 Chỉ thảo luận';
    statusBadgeStyle = 'background: #e0f2fe; color: #0369a1;';
  } else if (status === 'ended') {
    statusBadgeText = '🏁 Đã kết thúc';
    statusBadgeStyle = 'background: #f1f5f9; color: #64748b;';
  }

  let html = `
    <!-- Header: Tiêu đề & Trạng thái -->
    <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="flex: 1;">
          <h2 style="font-size: 19px; font-weight: 800; margin: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span>📌</span> <span>${escapeHtml(config.title)}</span>
          </h2>
          ${
            config.prompt
              ? `<div style="font-size: 13px; color: #475569; margin-top: 6px; background: #f8fafc; border-left: 3px solid #3b82f6; padding: 8px 12px; border-radius: 6px; line-height: 1.4;">
                  ${renderMath(escapeHtml(config.prompt))}
                </div>`
              : ''
          }
        </div>
        <span style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 99px; white-space: nowrap; ${statusBadgeStyle}">
          ${statusBadgeText}
        </span>
      </div>
    </div>
  `;

  // Cảnh báo nếu bị cấm bình luận
  if (isMuted) {
    html += `
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 10px; padding: 8px 12px; margin-bottom: 14px; font-size: 12px; color: #991b1b; font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <span>🔇</span> <span>Thầy/Cô đang tạm khóa tính năng gửi bình luận của bạn.</span>
      </div>
    `;
  }

  // Khối Bài làm của tôi (My Post)
  html += `
    <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 14px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
          <span>👤</span> Bài làm của tôi
        </span>
  `;

  if (!myPost) {
    if (status === 'accepting') {
      html += `
        <button type="button" onclick="window.toggleBoardSubmissionForm()" style="background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
          ✍️ ${isSubmissionFormOpen ? 'Đóng lại' : 'Nộp bài tham gia'}
        </button>
      </div>
      <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">
        Bạn chưa gửi bài lên bảng. Bấm nút <strong>"Nộp bài tham gia"</strong> để soạn chữ, vẽ tay hoặc chụp ảnh!
      </p>
      `;
    } else {
      html += `</div><p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Thầy/Cô đã dừng nhận bài nộp mới.</p>`;
    }
  } else {
    // Đã có bài nộp
    let myStatusText = '⏳ Đang chờ giáo viên duyệt';
    let myStatusStyle = 'background: #fef3c7; color: #92400e;';
    if (myPost.status === 'approved') {
      myStatusText = '✅ Đã được duyệt lên bảng';
      myStatusStyle = 'background: #dcfce7; color: #15803d;';
    } else if (myPost.status === 'rejected') {
      myStatusText = '⚠️ Cần sửa lại';
      myStatusStyle = 'background: #fee2e2; color: #991b1b;';
    }

    html += `
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 99px; ${myStatusStyle}">
            ${myStatusText}
          </span>
          ${
            status === 'accepting'
              ? `<button type="button" onclick="window.toggleBoardSubmissionForm()" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  ✏️ Sửa bài
                </button>`
              : ''
          }
        </div>
      </div>
    `;

    if (myPost.status === 'rejected' && myPost.rejectionReason) {
      html += `
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; font-size: 12px; color: #be123c;">
          <strong>Lời nhắc từ Thầy/Cô:</strong> ${escapeHtml(myPost.rejectionReason)}
        </div>
      `;
    }

    // Hiển thị nội dung xem trước bài làm của mình
    const noteColor = NOTE_COLORS[myPost.color] || NOTE_COLORS.yellow;
    html += `
      <div style="background: ${noteColor.bg}; border: 1.5px solid ${noteColor.border}; border-radius: 10px; padding: 12px; margin-top: 8px;">
        ${renderPostContentHtml(myPost)}
      </div>
    `;
  }

  // Khung Form Soạn Bài (Nằm độc lập, không bị reset ngầm)
  html += `
    <div id="board-submission-form-wrapper" style="display: ${isSubmissionFormOpen && status === 'accepting' ? 'block' : 'none'};">
      ${renderSubmissionFormHtml(config)}
    </div>
  `;

  html += `</div>`; // Đóng khối Bài làm của tôi

  // Khối Bảng trưng bày chung (Approved Posts)
  html += `
    <div style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 6px;">
          <span>🎨</span> <span>Bảng Trưng Bày Cả Lớp ${hasSubmitted ? `(${approvedPosts.length})` : '(Đang khóa)'}</span>
        </h3>
      </div>
  `;

  if (!hasSubmitted) {
    html += `
      <div style="text-align: center; padding: 36px 16px; background: #fffbeb; border: 2px dashed #fcd34d; border-radius: 14px;">
        <div style="font-size: 38px; margin-bottom: 8px;">🔒</div>
        <div style="font-size: 15px; font-weight: 800; color: #92400e;">Nội dung bài làm của cả lớp đang tạm ẩn</div>
        <div style="font-size: 13px; color: #b45309; margin-top: 6px; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          Bạn cần <strong>nộp bài làm của mình</strong> trước thì mới mở khóa xem bài của các bạn khác và cùng tham gia thả tim, góp ý, chấm điểm!
        </div>
        ${
          status === 'accepting'
            ? `<button type="button" onclick="window.toggleBoardSubmissionForm()" style="margin-top: 14px; background: #2563eb; color: #ffffff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                ✍️ Nộp bài ngay để mở khóa
              </button>`
            : ''
        }
      </div>
    `;
  } else if (approvedPosts.length === 0) {
    html += `
      <div style="text-align: center; padding: 32px 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 14px;">
        <div style="font-size: 32px; margin-bottom: 8px;">👀</div>
        <div style="font-size: 14px; font-weight: 700; color: #475569;">Chưa có bài nào được duyệt lên bảng</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Các bài nộp sau khi được Thầy/Cô duyệt sẽ hiển thị tại đây để cả lớp cùng xem và góp ý!</div>
      </div>
    `;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 14px;">`;
    for (const post of approvedPosts) {
      html += renderApprovedPostCardHtml(post, config, participantId, isMuted, status, hasSubmitted);
    }
    html += `</div>`;
  }

  html += `</div>`; // Đóng gallery

  // Modal Chấm Điểm Chéo
  html += renderPeerGradingModalHtml(boardState);

  // Modal Xem Chi Tiết Điểm Chấm
  html += renderPeerGradesDetailModalHtml(boardState);

  container.innerHTML = html;

  // Khôi phục lại Canvas và giá trị Form nếu form đang mở
  if (isSubmissionFormOpen && status === 'accepting') {
    restoreFormDraft();
  }
}

/**
 * Khôi phục bản nháp vào các ô nhập liệu Form
 */
function restoreFormDraft() {
  const textEl = document.getElementById('board-text-content');
  if (textEl && draftText) {
    textEl.value = draftText;
  }

  if (draftTab === 'draw') {
    setupDrawingCanvas();
    if (draftDrawingDataUrl && boardCtx && boardCanvas) {
      const img = new Image();
      img.onload = () => {
        boardCtx.drawImage(img, 0, 0);
      };
      img.src = draftDrawingDataUrl;
    }
  }

  if (draftTab === 'image' && draftImageDataUrl) {
    const previewImg = document.getElementById('board-image-preview');
    const previewContainer = document.getElementById('board-image-preview-container');
    if (previewImg && previewContainer) {
      previewImg.src = draftImageDataUrl;
      previewContainer.style.display = 'block';
    }
  }
}

/**
 * Render thẻ bài làm đã được duyệt
 */
function renderApprovedPostCardHtml(post, config, participantId, isMuted, boardStatus, hasSubmitted) {
  const isMine = post.participantId === participantId;
  const authorName = config.anonymousMode
    ? isMine
      ? 'Bạn (Ẩn danh)'
      : 'Học sinh ẩn danh'
    : post.authorName || 'Học sinh';

  const likesList = post.likes || [];
  const heartsList = post.hearts || [];
  const likeCount = likesList.length;
  const heartCount = heartsList.length;
  const hasLiked = likesList.includes(participantId);
  const hasHeart = heartsList.includes(participantId);

  // Tính điểm trung bình chấm chéo
  const peerGradesList = Object.values(post.peerGrades || {});
  const avgPeerScore =
    post.peerAverageScore !== null && post.peerAverageScore !== undefined
      ? post.peerAverageScore.toFixed(1)
      : peerGradesList.length > 0
      ? (peerGradesList.reduce((s, g) => s + g.score, 0) / peerGradesList.length).toFixed(1)
      : null;

  const myGivenGrade = post.peerGrades ? post.peerGrades[participantId] : null;
  const commentsList = post.comments || [];
  const noteColor = NOTE_COLORS[post.color] || NOTE_COLORS.yellow;

  // Xử lý che nội dung nếu học sinh chưa nộp bài (Server-side Gating)
  if ((!hasSubmitted || post.isLocked) && !isMine) {
    return `
      <div style="background: #f1f5f9; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 18px; text-align: center; color: #64748b;">
        <div style="font-size: 24px; margin-bottom: 4px;">🔒</div>
        <div style="font-size: 13px; font-weight: 700; color: #334155;">Bài làm bị ẩn</div>
        <div style="font-size: 11px; margin-top: 2px;">Hãy nộp bài làm của bạn để mở khóa xem bài của các bạn khác!</div>
      </div>
    `;
  }

  return `
    <div style="background: ${noteColor.bg}; border: 1.5px solid ${noteColor.border}; border-radius: 14px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
      <!-- Header bài viết -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isMine ? '#2563eb' : '#475569'}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800;">
            ${escapeHtml(authorName.charAt(0).toUpperCase())}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #1e293b;">
              ${escapeHtml(authorName)} ${isMine ? '<span style="font-size: 11px; color: #2563eb; font-weight: 700;">(Bạn)</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              ${new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <!-- Huy hiệu điểm/thưởng của Giáo viên -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          ${
            post.teacherGrade !== null && post.teacherGrade !== undefined
              ? `<span style="background: #ffffff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 99px;">
                  💯 Điểm GV: ${post.teacherGrade}/${config.maxGrade}
                </span>`
              : ''
          }
          ${
            post.rankAward
              ? `<span style="background: #ffffff; color: #b45309; border: 1px solid #fde68a; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 99px;">
                  🏆 ${post.rankAward === 'top1' ? 'Quán quân (Top 1)' : post.rankAward === 'top2' ? 'Á quân (Top 2)' : post.rankAward === 'top3' ? 'Quý quân (Top 3)' : 'Sáng tạo'}
                </span>`
              : ''
          }
        </div>
      </div>

      <!-- Nội dung bài làm -->
      <div style="background: #ffffff; border-radius: 10px; padding: 10px; margin-bottom: 12px; border: 1px solid rgba(0,0,0,0.05);">
        ${renderPostContentHtml(post)}
      </div>

      <!-- Lời nhận xét của Giáo viên (nếu có) -->
      ${
        post.teacherFeedback
          ? `<div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 8px 10px; border-radius: 4px; font-size: 12px; color: #065f46; margin-bottom: 12px; line-height: 1.4;">
              <strong>👨‍🏫 Lời khen của Thầy/Cô:</strong> ${escapeHtml(post.teacherFeedback)}
            </div>`
          : ''
      }

      <!-- Thanh tương tác: Tim, Like, Chấm điểm -->
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.08); margin-bottom: 10px;">
        ${
          config.allowReactions
            ? `
            <button type="button" onclick="window.toggleBoardReaction('${post.id}', 'heart')" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; border: 1px solid ${hasHeart ? '#f43f5e' : '#cbd5e1'}; background: ${hasHeart ? '#ffe4e6' : '#ffffff'}; color: ${hasHeart ? '#e11d48' : '#475569'}; cursor: pointer;">
              ❤️ <span>${heartCount}</span>
            </button>
            <button type="button" onclick="window.toggleBoardReaction('${post.id}', 'like')" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; border: 1px solid ${hasLiked ? '#3b82f6' : '#cbd5e1'}; background: ${hasLiked ? '#eff6ff' : '#ffffff'}; color: ${hasLiked ? '#2563eb' : '#475569'}; cursor: pointer;">
              👍 <span>${likeCount}</span>
            </button>
          `
            : ''
        }

        ${
          config.allowPeerGrades
            ? `
            <div style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
              ${
                avgPeerScore !== null
                  ? `<button type="button" onclick="window.openPeerGradesDetailModal('${post.id}')" title="Bấm để xem ai đã chấm mấy điểm" style="background: #fffbeb; border: 1px solid #fde68a; color: #b45309; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                      ⭐ <span>${avgPeerScore}/${config.maxGrade}</span>
                      <span style="font-size: 10px; font-weight: 600; color: #d97706;">(${peerGradesList.length} bạn)</span>
                    </button>`
                  : ''
              }
              ${
                !isMine && boardStatus !== 'ended'
                  ? `<button type="button" onclick="window.openPeerGradingModal('${post.id}')" style="background: ${myGivenGrade ? '#dcfce7' : '#2563eb'}; color: ${myGivenGrade ? '#15803d' : '#ffffff'}; border: 1px solid ${myGivenGrade ? '#86efac' : '#2563eb'}; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
                      ${myGivenGrade ? `⭐ Đã chấm ${myGivenGrade.score}đ` : '⭐ Chấm điểm'}
                    </button>`
                  : ''
              }
            </div>
          `
            : ''
        }
      </div>

      <!-- Khu vực Bình luận & Góp ý -->
      ${
        config.allowComments
          ? `
          <div style="background: #ffffff; border-radius: 10px; padding: 10px; margin-top: 8px; border: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 6px;">
              💬 Nhận xét & Góp ý (${commentsList.length})
            </div>

            ${
              commentsList.length > 0
                ? `<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; max-height: 180px; overflow-y: auto;">
                    ${commentsList
                      .map(
                        (c) => `
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                          <strong style="color: ${c.isTeacher ? '#b45309' : '#1e293b'};">${c.isTeacher ? '⭐ ' : ''}${escapeHtml(c.authorName)}:</strong>
                          <span style="font-size: 10px; color: #94a3b8;">${new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style="color: #334155; word-break: break-word;">${renderMath(escapeHtml(c.content))}</div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : `<div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-bottom: 8px;">Chưa có nhận xét nào. Hãy gửi lời góp ý động viên bạn!</div>`
            }

            <!-- Ô nhập bình luận -->
            ${
              !isMuted && boardStatus !== 'ended'
                ? `
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="board-comment-input-${post.id}" placeholder="Viết nhận xét, góp ý..." style="flex: 1; min-height: 36px; padding: 4px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none;" onkeydown="if(event.key==='Enter') window.submitBoardComment('${post.id}')" />
                  <button type="button" onclick="window.submitBoardComment('${post.id}')" style="background: #3b82f6; color: #ffffff; border: none; border-radius: 8px; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer;">
                    Gửi
                  </button>
                </div>
              `
                : ''
            }
          </div>
        `
          : ''
      }
    </div>
  `;
}

/**
 * Hiển thị nội dung văn bản, nét vẽ hoặc ảnh
 */
function renderPostContentHtml(post) {
  let inner = '';
  if (post.worksheetResult) {
    inner += `
      <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 15px;">📋</span>
          <div>
            <span style="font-size: 12px; font-weight: 800; color: #1e40af;">Phiếu bài tập</span>
            <span style="font-size: 11px; color: #3b82f6; margin-left: 4px;">(Đúng ${post.worksheetResult.correctCount}/${post.worksheetResult.totalCount} câu)</span>
          </div>
        </div>
        <div style="background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 99px; font-size: 12px; font-weight: 800;">
          ${post.worksheetResult.autoScore.toFixed(1)}/${post.worksheetResult.maxScore} đ
        </div>
      </div>
    `;
  }
  if (post.text) {
    inner += `<div style="font-size: 14px; color: #1e293b; line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin-bottom: 8px;">${renderMath(escapeHtml(post.text))}</div>`;
  }
  if (post.drawingDataUrl) {
    inner += `
      <div style="text-align: center; margin-bottom: 8px;">
        <img src="${post.drawingDataUrl}" alt="Nét vẽ tay" style="max-width: 100%; max-height: 280px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff;" />
      </div>
    `;
  }
  if (post.imageUrl) {
    inner += `
      <div style="text-align: center;">
        <img src="${post.imageUrl}" alt="Ảnh bài làm" style="max-width: 100%; max-height: 280px; border-radius: 8px; border: 1px solid #e2e8f0;" />
      </div>
    `;
  }
  return inner || '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">Chưa có nội dung</div>';
}

/**
 * Render danh sách câu hỏi Phiếu học tập tương tác cho học sinh làm bài
 */
function renderWorksheetQuestionsHtml(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return '<div style="font-size: 13px; color: #64748b; padding: 12px; text-align: center;">Phiếu bài tập chưa có câu hỏi nào.</div>';
  }

  return questions
    .map((q, idx) => {
      const qStem = renderMath(escapeHtml(getQuestionText(q.stem)));
      let body = '';

      if (q.type === 'mcq4' && Array.isArray(q.options)) {
        const currentAns = draftWorksheetAnswers[q.id]?.selected;
        body = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-top: 8px;">
            ${q.options
              .map((opt, oIdx) => {
                const isSelected = currentAns === oIdx;
                const letter = String.fromCharCode(65 + oIdx);
                const optText = renderMath(escapeHtml(getQuestionText(opt)));
                return `
                  <button type="button" onclick="window.setBoardWorksheetAnswer('${q.id}', { selected: ${oIdx} })" style="padding: 10px; border-radius: 8px; border: 1.5px solid ${isSelected ? '#2563eb' : '#cbd5e1'}; background: ${isSelected ? '#eff6ff' : '#ffffff'}; color: ${isSelected ? '#1d4ed8' : '#334155'}; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isSelected ? '#2563eb' : '#f1f5f9'}; color: ${isSelected ? '#ffffff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; shrink: 0;">${letter}</span>
                    <span style="flex: 1; word-break: break-word;">${optText}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        `;
      } else if (q.type === 'tf') {
        const currentAns = draftWorksheetAnswers[q.id]?.selected;
        body = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            <button type="button" onclick="window.setBoardWorksheetAnswer('${q.id}', { selected: true })" style="padding: 10px; border-radius: 8px; border: 1.5px solid ${currentAns === true ? '#16a34a' : '#cbd5e1'}; background: ${currentAns === true ? '#f0fdf4' : '#ffffff'}; color: ${currentAns === true ? '#15803d' : '#334155'}; font-size: 13px; font-weight: 700; cursor: pointer;">
              ✅ Đúng
            </button>
            <button type="button" onclick="window.setBoardWorksheetAnswer('${q.id}', { selected: false })" style="padding: 10px; border-radius: 8px; border: 1.5px solid ${currentAns === false ? '#dc2626' : '#cbd5e1'}; background: ${currentAns === false ? '#fef2f2' : '#ffffff'}; color: ${currentAns === false ? '#b91c1c' : '#334155'}; font-size: 13px; font-weight: 700; cursor: pointer;">
              ❌ Sai
            </button>
          </div>
        `;
      } else if (q.type === 'matching' && Array.isArray(q.leftItems) && Array.isArray(q.rightItems)) {
        const pairs = draftWorksheetAnswers[q.id]?.pairs || {};
        body = `
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Ghép từng mục Cột A với mục tương ứng ở Cột B:</div>
            ${q.leftItems
              .map((left, lIdx) => {
                const currentRightId = pairs[left.id] || '';
                const leftText = renderMath(escapeHtml(getQuestionText(left.text)));
                return `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${lIdx + 1}. ${leftText}</div>
                    <select onchange="window.setBoardMatchingPair('${q.id}', '${left.id}', this.value)" style="padding: 6px 10px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #334155; background: #ffffff;">
                      <option value="">-- Ghép với Cột B --</option>
                      ${q.rightItems
                        .map((right, rIdx) => {
                          const letter = String.fromCharCode(65 + rIdx);
                          const rightText = escapeHtml(getQuestionText(right.text));
                          return `<option value="${right.id}" ${currentRightId === right.id ? 'selected' : ''}>${letter}. ${rightText}</option>`;
                        })
                        .join('')}
                    </select>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      } else if (q.type === 'cloze_drag' && Array.isArray(q.blanks) && Array.isArray(q.wordBank)) {
        const filled = draftWorksheetAnswers[q.id]?.filled || {};
        body = `
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Ngân hàng từ khóa -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Từ khóa lựa chọn:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${q.wordBank
                  .map(
                    (w) =>
                      `<span style="background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #334155;">${escapeHtml(w)}</span>`
                  )
                  .join('')}
              </div>
            </div>

            <!-- Đoạn văn bản mẫu -->
            <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 10px; font-size: 13px; color: #854d0e; line-height: 1.5;">
              ${renderMath(escapeHtml(q.template))}
            </div>

            <!-- Điền các ô trống -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${q.blanks
                .map((b) => {
                  const currentVal = filled[b.id] || '';
                  return `
                    <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px;">
                      <span style="font-size: 12px; font-weight: 700; color: #475569; min-width: 60px;">Ô [${escapeHtml(b.id)}]:</span>
                      <select onchange="window.setBoardClozeBlank('${q.id}', '${b.id}', this.value)" style="flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #334155;">
                        <option value="">-- Chọn từ điền vào --</option>
                        ${q.wordBank
                          .map(
                            (w) =>
                              `<option value="${escapeHtml(w)}" ${currentVal === w ? 'selected' : ''}>${escapeHtml(w)}</option>`
                          )
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

      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: #1e293b;">
              <span style="color: #2563eb; font-weight: 800;">Câu ${idx + 1}.</span> ${qStem}
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">
              ${q.points || 10}đ
            </span>
          </div>
          ${body}
        </div>
      `;
    })
    .join('');
}

/**
 * Render Form nộp bài với các tabs: Phiếu bài tập, Văn bản, Vẽ tay, Hình ảnh
 */
function renderSubmissionFormHtml(config) {
  const hasWorksheet = Boolean(
    config.worksheet?.enabled &&
      Array.isArray(config.worksheet.questions) &&
      config.worksheet.questions.length > 0
  );

  if (
    hasWorksheet &&
    draftTab === 'text' &&
    !draftText &&
    !draftDrawingDataUrl &&
    !draftImageDataUrl &&
    Object.keys(draftWorksheetAnswers).length === 0
  ) {
    draftTab = 'worksheet';
  }

  return `
    <div style="margin-top: 14px; padding-top: 14px; border-top: 1.5px dashed #cbd5e1;">
      <!-- Chọn màu giấy ghi chú (Note Color) -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 12px; font-weight: 700; color: #475569;">Màu giấy:</span>
        <div style="display: flex; gap: 6px;">
          ${Object.entries(NOTE_COLORS)
            .map(
              ([key, val]) => `
            <button type="button" onclick="window.setBoardPostColor('${key}')" style="width: 26px; height: 26px; border-radius: 50%; background: ${val.bg}; border: 2.5px solid ${draftColor === key ? '#2563eb' : val.border}; cursor: pointer;" title="${val.label}"></button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Chọn tab loại bài nộp -->
      <div style="display: flex; gap: 6px; margin-bottom: 12px;">
        ${
          hasWorksheet
            ? `<button type="button" onclick="window.switchBoardTab('worksheet')" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid ${draftTab === 'worksheet' ? '#2563eb' : '#e2e8f0'}; background: ${draftTab === 'worksheet' ? '#eff6ff' : '#ffffff'}; color: ${draftTab === 'worksheet' ? '#1d4ed8' : '#64748b'}; cursor: pointer;">
                📋 Bài tập (${config.worksheet.questions.length})
              </button>`
            : ''
        }
        <button type="button" onclick="window.switchBoardTab('text')" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid ${draftTab === 'text' ? '#2563eb' : '#e2e8f0'}; background: ${draftTab === 'text' ? '#eff6ff' : '#ffffff'}; color: ${draftTab === 'text' ? '#1d4ed8' : '#64748b'}; cursor: pointer;">
          📝 Văn bản
        </button>
        ${
          config.allowDraw
            ? `<button type="button" onclick="window.switchBoardTab('draw')" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid ${draftTab === 'draw' ? '#2563eb' : '#e2e8f0'}; background: ${draftTab === 'draw' ? '#eff6ff' : '#ffffff'}; color: ${draftTab === 'draw' ? '#1d4ed8' : '#64748b'}; cursor: pointer;">
                🎨 Vẽ tay
              </button>`
            : ''
        }
        ${
          config.allowImage
            ? `<button type="button" onclick="window.switchBoardTab('image')" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid ${draftTab === 'image' ? '#2563eb' : '#e2e8f0'}; background: ${draftTab === 'image' ? '#eff6ff' : '#ffffff'}; color: ${draftTab === 'image' ? '#1d4ed8' : '#64748b'}; cursor: pointer;">
                📷 Hình ảnh
              </button>`
            : ''
        }
      </div>

      <!-- Tab 0: Phiếu bài tập -->
      ${
        hasWorksheet
          ? `<div id="board-tab-worksheet-container" style="display: ${draftTab === 'worksheet' ? 'block' : 'none'}; margin-bottom: 12px;">
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af;">
                  ${escapeHtml(config.worksheet.questionSetTitle || 'Phiếu bài tập tương tác')}
                </span>
                <span style="font-size: 11px; font-weight: 800; color: #2563eb; background: #ffffff; padding: 2px 8px; border-radius: 99px;">
                  ${Object.keys(draftWorksheetAnswers).length}/${config.worksheet.questions.length} đã làm
                </span>
              </div>
              ${renderWorksheetQuestionsHtml(config.worksheet.questions)}
            </div>`
          : ''
      }

      <!-- Tab 1: Nhập văn bản -->
      <div id="board-tab-text-container" style="display: ${draftTab === 'text' ? 'block' : 'none'}; margin-bottom: 10px;">
        <textarea id="board-text-content" rows="4" placeholder="Nhập câu trả lời, ý tưởng, tóm tắt bài học... (hỗ trợ công thức Toán kẹp giữa $...$)" style="width: 100%; padding: 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box;" oninput="window.handleBoardTextInput(this.value)">${escapeHtml(draftText)}</textarea>
      </div>

      <!-- Tab 2: Vẽ tay Canvas -->
      <div id="board-tab-draw-container" style="display: ${draftTab === 'draw' ? 'block' : 'none'}; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${['#1e293b', '#ef4444', '#2563eb', '#16a34a', '#eab308', '#ffffff']
              .map(
                (c) => `
              <button type="button" onclick="window.setBoardDrawingColor('${c}')" style="width: 24px; height: 24px; border-radius: 50%; background: ${c}; border: 2px solid ${currentPenColor === c ? '#2563eb' : '#cbd5e1'}; cursor: pointer; padding: 0;" title="${c === '#ffffff' ? 'Tẩy' : 'Màu'}"></button>
            `
              )
              .join('')}
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" onclick="window.clearBoardCanvas()" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: #475569; cursor: pointer;">
              🗑 Xóa hết
            </button>
          </div>
        </div>

        <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; touch-action: none; position: relative;">
          <canvas id="board-drawing-canvas" width="500" height="280" style="width: 100%; height: 240px; display: block; cursor: crosshair;"></canvas>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Dùng ngón tay hoặc bút cảm ứng vẽ trực tiếp lên bảng.</div>
      </div>

      <!-- Tab 3: Tải ảnh (tự nén qua Canvas) -->
      <div id="board-tab-image-container" style="display: ${draftTab === 'image' ? 'block' : 'none'}; margin-bottom: 10px;">
        <input type="file" id="board-image-file" accept="image/*" onchange="window.handleBoardImageSelect(this)" style="display: none;" />
        <div onclick="document.getElementById('board-image-file').click()" style="border: 2px dashed #93c5fd; background: #f0fdf4; border-radius: 10px; padding: 18px; text-align: center; cursor: pointer;">
          <div style="font-size: 28px; margin-bottom: 4px;">📷</div>
          <div style="font-size: 13px; font-weight: 700; color: #1e40af;">Bấm để chụp ảnh hoặc chọn ảnh bài làm</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tự động nén dung lượng tải nhanh qua mạng WiFi lớp học</div>
        </div>

        <div id="board-image-preview-container" style="display: ${draftImageDataUrl ? 'block' : 'none'}; margin-top: 8px; text-align: center;">
          <img id="board-image-preview" src="${draftImageDataUrl}" style="max-height: 200px; max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" />
        </div>
      </div>

      <!-- Nút Gửi bài -->
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
        <button type="button" onclick="window.toggleBoardSubmissionForm()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
          Hủy
        </button>
        <button type="button" id="board-submit-post-btn" onclick="window.submitInteractiveBoardPost()" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">
          🚀 Gửi lên Thầy/Cô duyệt
        </button>
      </div>
    </div>
  `;
}

/**
 * Khởi tạo touch/mouse canvas vẽ tay mượt mà
 */
function setupDrawingCanvas() {
  const canvas = document.getElementById('board-drawing-canvas');
  if (!canvas) return;

  boardCanvas = canvas;
  boardCtx = canvas.getContext('2d');
  if (!boardCtx) return;

  boardCtx.lineCap = 'round';
  boardCtx.lineJoin = 'round';
  boardCtx.strokeStyle = currentPenColor;
  boardCtx.lineWidth = currentPenSize;

  const getCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing = true;
    const { x, y } = getCanvasCoords(e);
    boardCtx.beginPath();
    boardCtx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    boardCtx.strokeStyle = currentPenColor;
    boardCtx.lineWidth = currentPenSize;
    boardCtx.lineTo(x, y);
    boardCtx.stroke();
  };

  const stopDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    isDrawing = false;
    // Lưu ngay nét vẽ vào draft để chống mất
    try {
      draftDrawingDataUrl = canvas.toDataURL('image/png');
    } catch {}
  };

  canvas.onmousedown = startDraw;
  canvas.onmousemove = draw;
  canvas.onmouseup = stopDraw;
  canvas.onmouseleave = stopDraw;

  canvas.ontouchstart = startDraw;
  canvas.ontouchmove = draw;
  canvas.ontouchend = stopDraw;
  canvas.ontouchcancel = stopDraw;
}

/**
 * Render Modal Chấm Điểm Chéo
 */
function renderPeerGradingModalHtml(boardState) {
  const postId = state.interactiveBoardPostToGrade;
  if (!postId || !boardState.posts[postId]) {
    return `<div id="board-peer-grading-modal" class="hidden"></div>`;
  }

  const post = boardState.posts[postId];
  const maxGrade = boardState.config.maxGrade || 10;
  const myExistingGrade = post.peerGrades ? post.peerGrades[state.participantId] : null;
  const initialScore = myExistingGrade ? myExistingGrade.score : Math.round(maxGrade * 0.8);

  return `
    <div id="board-peer-grading-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10001; display: flex; justify-content: center; align-items: center; padding: 16px;">
      <div style="background: #ffffff; border-radius: 18px; width: 100%; max-width: 400px; padding: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0;">
            ⭐ Chấm điểm bài bạn học
          </h4>
          <button type="button" onclick="window.closeBoardModal()" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">✕</button>
        </div>

        <div style="font-size: 13px; color: #475569; margin-bottom: 14px;">
          Bài làm của: <strong>${escapeHtml(post.authorName)}</strong>
        </div>

        <!-- Thanh chọn điểm (Slider & Con số) -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 14px;">
          <div style="font-size: 32px; font-weight: 900; color: #2563eb;" id="board-grade-score-display">
            ${initialScore}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">thang điểm tối đa ${maxGrade}</div>

          <input type="range" id="board-grade-slider" min="1" max="${maxGrade}" step="1" value="${initialScore}" style="width: 100%; margin-top: 14px; cursor: pointer;" oninput="document.getElementById('board-grade-score-display').textContent = this.value" />
        </div>

        <!-- Lời nhận xét / góp ý -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
            Nhận xét góp ý cho bạn (tùy chọn):
          </label>
          <textarea id="board-grade-feedback" rows="2" placeholder="Bài làm rất sáng tạo, lập luận rõ ràng..." style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-family: inherit; box-sizing: border-box; outline: none;"></textarea>
        </div>

        <!-- Nút Xác nhận -->
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" onclick="window.closeBoardModal()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
            Đóng
          </button>
          <button type="button" id="board-peer-grade-submit-btn" onclick="window.submitPeerGrade('${postId}')" style="background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 8px 18px; font-size: 12px; font-weight: 800; cursor: pointer;">
            Gửi điểm chấm
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Modal Chi Tiết Điểm Chấm (Ai chấm mấy điểm)
 */
function renderPeerGradesDetailModalHtml(boardState) {
  const postId = state.interactiveBoardPostDetailGrades;
  if (!postId || !boardState.posts[postId]) {
    return `<div id="board-peer-detail-modal" class="hidden"></div>`;
  }

  const post = boardState.posts[postId];
  const grades = Object.values(post.peerGrades || {});
  const avg =
    post.peerAverageScore !== null && post.peerAverageScore !== undefined
      ? post.peerAverageScore.toFixed(1)
      : grades.length > 0
      ? (grades.reduce((s, g) => s + g.score, 0) / grades.length).toFixed(1)
      : '0';

  return `
    <div id="board-peer-detail-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10001; display: flex; justify-content: center; align-items: center; padding: 16px;">
      <div style="background: #ffffff; border-radius: 18px; width: 100%; max-width: 420px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: left;">
        <div style="background: #2563eb; color: #ffffff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 15px; font-weight: 800; margin: 0;">
              📊 Danh Sách Chấm Điểm
            </h4>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">
              Điểm trung bình: ${avg}/${boardState.config.maxGrade} (${grades.length} lượt chấm)
            </div>
          </div>
          <button type="button" onclick="window.closeBoardModal()" style="background: none; border: none; font-size: 20px; color: #ffffff; cursor: pointer;">✕</button>
        </div>

        <div style="padding: 14px; overflow-y: auto; flex: 1;">
          ${
            grades.length === 0
              ? `<div style="text-align: center; color: #64748b; font-size: 13px; padding: 20px;">Chưa có bạn nào chấm điểm bài này.</div>`
              : `<div style="display: flex; flex-direction: column; gap: 8px;">
                  ${grades
                    .map(
                      (g) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px;">
                      <div>
                        <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${escapeHtml(g.authorName || 'Bạn học')}</div>
                      </div>
                      <div style="background: #dbeafe; color: #1d4ed8; font-weight: 800; font-size: 14px; padding: 3px 10px; border-radius: 8px;">
                        ⭐ ${g.score}
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>`
          }
        </div>

        <div style="padding: 10px 14px; border-top: 1px solid #e2e8f0; text-align: right;">
          <button type="button" onclick="window.closeBoardModal()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
}

// Gắn handlers toàn cục lên window để gọi từ inline HTML
if (typeof window !== 'undefined') {
  window.handleBoardTextInput = (val) => {
    draftText = val;
  };

  window.setBoardPostColor = (color) => {
    draftColor = color;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.toggleBoardSubmissionForm = () => {
    isSubmissionFormOpen = !isSubmissionFormOpen;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.switchBoardTab = (tab) => {
    saveCurrentFormDraft();
    draftTab = tab;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.setBoardDrawingColor = (color) => {
    currentPenColor = color;
    if (color === '#ffffff') {
      currentPenSize = 16; // Tẩy nét to
    } else {
      currentPenSize = 4;
    }
    // Không cần render lại cả view, chỉ cập nhật style
    const canvas = document.getElementById('board-drawing-canvas');
    if (canvas) {
      setupDrawingCanvas();
    }
  };

  window.clearBoardCanvas = () => {
    if (boardCtx && boardCanvas) {
      boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
      draftDrawingDataUrl = '';
    }
  };

  window.handleBoardImageSelect = (input) => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tự động nén ảnh kích thước tối đa 1200x1200, chất lượng JPEG 0.8
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        draftImageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        const previewImg = document.getElementById('board-image-preview');
        const previewContainer = document.getElementById('board-image-preview-container');
        if (previewImg && previewContainer) {
          previewImg.src = draftImageDataUrl;
          previewContainer.style.display = 'block';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.setBoardWorksheetAnswer = (qId, val) => {
    draftWorksheetAnswers[qId] = val;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.setBoardMatchingPair = (qId, leftId, rightId) => {
    if (!draftWorksheetAnswers[qId] || typeof draftWorksheetAnswers[qId] !== 'object') {
      draftWorksheetAnswers[qId] = { pairs: {} };
    }
    const pairs = draftWorksheetAnswers[qId].pairs || (draftWorksheetAnswers[qId].pairs = {});
    if (rightId) {
      pairs[leftId] = rightId;
    } else {
      delete pairs[leftId];
    }
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.setBoardClozeBlank = (qId, blankId, val) => {
    if (!draftWorksheetAnswers[qId] || typeof draftWorksheetAnswers[qId] !== 'object') {
      draftWorksheetAnswers[qId] = { filled: {} };
    }
    const filled = draftWorksheetAnswers[qId].filled || (draftWorksheetAnswers[qId].filled = {});
    if (val) {
      filled[blankId] = val;
    } else {
      delete filled[blankId];
    }
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.submitInteractiveBoardPost = async () => {
    saveCurrentFormDraft();

    const textToSubmit = draftText.trim();
    const drawingToSubmit = draftDrawingDataUrl;
    const imageToSubmit = draftImageDataUrl;
    const hasWorksheetAnswers = Object.keys(draftWorksheetAnswers).length > 0;

    if (!textToSubmit && !drawingToSubmit && !imageToSubmit && !hasWorksheetAnswers) {
      alert('Vui lòng làm bài tập, nhập văn bản, vẽ tay hoặc chụp ảnh trước khi gửi bài!');
      return;
    }

    const submitBtn = document.getElementById('board-submit-post-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Đang gửi bài...';
    }

    const res = await sendBoardIntent({
      type: 'submit_post',
      text: textToSubmit,
      drawingDataUrl: drawingToSubmit || undefined,
      imageUrl: imageToSubmit || undefined,
      color: draftColor,
      authorName: state.studentName || 'Học sinh',
      worksheetAnswers: hasWorksheetAnswers ? draftWorksheetAnswers : undefined,
    });

    if (!res.ok) {
      alert(res.reason || 'Không thể gửi bài lên Thầy/Cô. Vui lòng thử lại!');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 Gửi lên Thầy/Cô duyệt';
      }
      return;
    }

    // Nộp thành công
    isSubmissionFormOpen = false;
    draftText = '';
    draftDrawingDataUrl = '';
    draftImageDataUrl = '';
    draftWorksheetAnswers = {};
    lastRenderedStateJson = ''; // Buộc cập nhật giao diện ngay
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.toggleBoardReaction = async (postId, reaction) => {
    await sendBoardIntent({
      type: 'react_post',
      postId,
      reaction, // 'like' | 'heart'
    });
  };

  window.submitBoardComment = async (postId) => {
    const input = document.getElementById(`board-comment-input-${postId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    input.disabled = true;
    const res = await sendBoardIntent({
      type: 'add_comment',
      postId,
      content,
      authorName: state.studentName || 'Học sinh',
    });

    if (res.ok) {
      input.value = '';
    } else {
      alert(res.reason || 'Không thể gửi bình luận');
    }
    input.disabled = false;
  };

  window.openPeerGradingModal = (postId) => {
    state.interactiveBoardPostToGrade = postId;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.openPeerGradesDetailModal = (postId) => {
    state.interactiveBoardPostDetailGrades = postId;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.closeBoardModal = () => {
    state.interactiveBoardPostToGrade = null;
    state.interactiveBoardPostDetailGrades = null;
    lastRenderedStateJson = '';
    if (state.interactiveBoardRunId && state.interactiveBoardState) {
      renderInteractiveBoardView(state.interactiveBoardRunId, state.interactiveBoardState);
    }
  };

  window.submitPeerGrade = async (postId) => {
    const slider = document.getElementById('board-grade-slider');
    const feedback = document.getElementById('board-grade-feedback')?.value?.trim() || undefined;
    const score = slider ? parseInt(slider.value, 10) : 10;

    const submitBtn = document.getElementById('board-peer-grade-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Đang gửi...';
    }

    const res = await sendBoardIntent({
      type: 'grade_peer_post',
      postId,
      score,
      feedback,
      authorName: state.studentName || 'Bạn học',
    });

    if (!res.ok) {
      alert(res.reason || 'Không thể gửi điểm chấm');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Gửi điểm chấm';
      }
      return;
    }

    window.closeBoardModal();
  };
}
