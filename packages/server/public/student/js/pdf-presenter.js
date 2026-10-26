/**
 * EduClass v2 — Student Portal PDF / Word Presenter View
 * Hiển thị toàn bộ các trang tài liệu PDF/Word (Mô hình A: Cắt dãn khoảng trống & Đồng bộ bút viết)
 */

import { state } from './state.js';

const imageCache = new Map();
const BASE_PAGE_WIDTH = 800;
const BASE_PAGE_HEIGHT = 1130;

/**
 * Vẽ hoa văn nền khoảng trống (Mô hình A)
 */
function drawGapPattern(ctx, x, y, width, height, pattern = 'grid') {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, width, height);

  if (pattern === 'grid') {
    const gridSize = 24;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E0EEF9';
    ctx.beginPath();
    for (let gx = x; gx <= x + width; gx += gridSize) {
      ctx.moveTo(gx + 0.5, y);
      ctx.lineTo(gx + 0.5, y + height);
    }
    for (let gy = y; gy <= y + height; gy += gridSize) {
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = '#C9E2F5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let gy = y; gy <= y + height; gy += gridSize * 4) {
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
    }
    ctx.stroke();
  } else if (pattern === 'lines') {
    const lineSpacing = 30;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gy = y + lineSpacing; gy < y + height; gy += lineSpacing) {
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
    }
    ctx.stroke();
  }

  // Viền nét đứt
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + width, y + 0.5);
  ctx.moveTo(x, y + height - 0.5);
  ctx.lineTo(x + width, y + height - 0.5);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(`✂️ Khoảng trống chữa bài (${Math.round(height)}px)`, x + 12, y + 18);
  ctx.restore();
}

/**
 * Vẽ các nét bút của giáo viên lên canvas
 */
function renderStrokes(ctx, strokes, canvasWidth, canvasHeight) {
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    ctx.save();
    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = stroke.opacity ?? 0.4;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(8, (stroke.size || 18));
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = (stroke.size || 4) * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1.5, stroke.size || 3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    const pts = stroke.points;
    const getPointY = (p) => {
      return p.y <= 1.0001 ? p.y * canvasHeight : p.y * (canvasWidth / BASE_PAGE_WIDTH);
    };

    if (pts.length === 1) {
      const p = pts[0];
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(p.x * canvasWidth, getPointY(p), ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      const first = pts[0];
      ctx.moveTo(first.x * canvasWidth, getPointY(first));
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const midX = ((prev.x + curr.x) / 2) * canvasWidth;
        const midY = (getPointY(prev) + getPointY(curr)) / 2;
        ctx.quadraticCurveTo(prev.x * canvasWidth, getPointY(prev), midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * canvasWidth, getPointY(last));
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Vẽ 1 trang hoàn chỉnh (Cắt dãn khoảng trống + Đẩy phần đề dưới dạt xuống + Nét bút)
 */
function renderSinglePage(canvas, img, gaps, strokes, laserPointer, pageNumber) {
  const origW = BASE_PAGE_WIDTH;
  const origH = BASE_PAGE_HEIGHT;

  const sortedGaps = [...gaps].sort((a, b) => a.splitYRatio - b.splitYRatio);
  const totalGapPx = sortedGaps.reduce((acc, g) => acc + g.gapHeightPx, 0);
  const targetW = origW;
  const targetH = origH + totalGapPx;

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  let currentSrcY = 0;
  let currentTargetY = 0;

  for (const gap of sortedGaps) {
    const splitSrcY = Math.round(gap.splitYRatio * origH);
    const sliceHeight = splitSrcY - currentSrcY;

    if (sliceHeight > 0) {
      if (img && img.complete) {
        ctx.drawImage(img, 0, currentSrcY, origW, sliceHeight, 0, currentTargetY, targetW, sliceHeight);
      }
      currentTargetY += sliceHeight;
      currentSrcY = splitSrcY;
    }

    drawGapPattern(ctx, 0, currentTargetY, targetW, gap.gapHeightPx, gap.pattern);
    currentTargetY += gap.gapHeightPx;
  }

  const remainingSrcH = origH - currentSrcY;
  if (remainingSrcH > 0 && img && img.complete) {
    ctx.drawImage(img, 0, currentSrcY, origW, remainingSrcH, 0, currentTargetY, targetW, remainingSrcH);
  }

  renderStrokes(ctx, strokes, targetW, targetH);

  if (laserPointer && laserPointer.visible && laserPointer.pageNumber === pageNumber) {
    const px = laserPointer.x * targetW;
    const py = laserPointer.y * targetH;

    ctx.save();
    ctx.fillStyle = '#EF4444';
    ctx.shadowColor = '#DC2626';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Xử lý cập nhật trạng thái hoạt động PDF Presenter từ Server
 */
export function handlePdfPresenterUpdate(runId, presenterState) {
  state.activeActivityRunId = runId;
  state.activeActivityType = 'pdf-presenter';

  // 1. Chuyển màn hình sang pdf-presenter-view
  const view = document.getElementById('pdf-presenter-view');
  if (!view) return;

  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');
  document.getElementById('assignment-view')?.classList.add('hidden');
  document.getElementById('territory-war-view')?.classList.add('hidden');
  document.getElementById('object-camera-view')?.classList.add('hidden');

  view.classList.remove('hidden');

  const isBroadcastEnabled = presenterState?.isStudentBroadcastEnabled ?? true;
  const pausedBox = document.getElementById('pdf-presenter-paused');
  const stageBox = document.getElementById('pdf-presenter-stage');

  // 2. Nếu Giáo viên tạm dừng chiếu
  if (!isBroadcastEnabled) {
    if (pausedBox) pausedBox.classList.remove('hidden');
    if (stageBox) stageBox.classList.add('hidden');
    return;
  }

  if (pausedBox) pausedBox.classList.add('hidden');
  if (stageBox) stageBox.classList.remove('hidden');

  // 3. Cập nhật tiêu đề tài liệu
  const doc = presenterState?.document;
  const totalPages = doc?.totalPages || 1;
  const pageImages = doc?.pageImages || [];

  const titleEl = document.getElementById('pdf-presenter-header-title');
  if (titleEl) {
    titleEl.textContent = doc?.title || 'Chiếu & Chữa bài PDF/Word';
  }

  const subtitleEl = document.getElementById('pdf-presenter-header-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `${totalPages} trang • Đang đồng bộ trực tiếp`;
  }

  // 4. Hiển thị cuộn liên tục TẤT CẢ các trang (Yêu cầu 3)
  const pagesContainer = document.getElementById('pdf-presenter-pages-container');
  if (!pagesContainer) return;

  for (let p = 1; p <= totalPages; p++) {
    const pageGaps = (presenterState?.gaps || []).filter((g) => g.pageNumber === p);
    const pageStrokes = (presenterState?.strokes || []).filter((s) => s.pageNumber === p);
    const pageImageUrl = pageImages[p - 1];

    let pageCard = document.getElementById(`student-pdf-page-${p}`);
    if (!pageCard) {
      pageCard = document.createElement('div');
      pageCard.id = `student-pdf-page-${p}`;
      pageCard.style.cssText =
        'position: relative; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); width: 100%; max-width: 800px; margin-bottom: 20px;';
      pageCard.innerHTML = `
        <div style="padding: 6px 12px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #334155;">
          <span style="background: #2563eb; color: #ffffff; padding: 2px 8px; border-radius: 9999px;">Trang ${p} / ${totalPages}</span>
          <span id="student-pdf-gap-count-${p}" style="color: #64748b; font-weight: 400;"></span>
        </div>
        <div style="width: 100%; overflow: hidden; display: flex; justify-content: center; background: #ffffff;">
          <canvas id="student-pdf-canvas-${p}" style="width: 100%; height: auto; display: block;"></canvas>
        </div>
      `;
      pagesContainer.appendChild(pageCard);
    }

    const gapCountEl = document.getElementById(`student-pdf-gap-count-${p}`);
    if (gapCountEl) {
      gapCountEl.textContent = pageGaps.length > 0 ? `${pageGaps.length} chỗ sửa bài` : '';
    }

    const canvas = document.getElementById(`student-pdf-canvas-${p}`);
    if (canvas) {
      if (pageImageUrl) {
        let img = imageCache.get(pageImageUrl);
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            renderSinglePage(canvas, img, pageGaps, pageStrokes, presenterState?.teacherPointer, p);
          };
          img.src = pageImageUrl;
          imageCache.set(pageImageUrl, img);
        } else {
          renderSinglePage(canvas, img, pageGaps, pageStrokes, presenterState?.teacherPointer, p);
        }
      } else {
        renderSinglePage(canvas, null, pageGaps, pageStrokes, presenterState?.teacherPointer, p);
      }
    }
  }

  // Dọn dẹp các trang dư thừa nếu số trang giảm
  const existingCards = pagesContainer.querySelectorAll('[id^="student-pdf-page-"]');
  existingCards.forEach((c) => {
    const pNum = parseInt(c.id.replace('student-pdf-page-', ''), 10);
    if (pNum > totalPages) {
      c.remove();
    }
  });
}
