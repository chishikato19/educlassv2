/**
 * EduClass v2 — Student Portal Object Camera View
 * Module hiển thị bài giảng / soi bài trực tiếp từ Camera vật thể của giáo viên xuống học sinh
 */

import { state } from './state.js';

let resizeListenerAttached = false;
const imageCache = new Map();

/**
 * Vẽ một bức ảnh và các nét bút của giáo viên lên canvas của học sinh
 */
function renderStudentCanvas(canvas, photo, annotations, viewport) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const parent = canvas.parentElement;
  const parentW = (parent && parent.clientWidth) || 360;
  const parentH = (parent && parent.clientHeight) || 560;

  canvas.width = parentW;
  canvas.height = parentH;

  if (!photo || !photo.url) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Đang chuẩn bị ảnh bài làm...', canvas.width / 2, canvas.height / 2);
    return;
  }

  let img = imageCache.get(photo.url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.url;
    imageCache.set(photo.url, img);
  }

  const drawNow = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // 1. Áp dụng bộ lọc tài liệu theo giáo viên
    const filter = (viewport && viewport.filter) || 'none';
    if (filter === 'high_contrast') {
      ctx.filter = 'contrast(1.6) brightness(1.1)';
    } else if (filter === 'black_white') {
      ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.05)';
    } else {
      ctx.filter = 'none';
    }

    // 2. Tâm xoay và dịch chuyển theo giáo viên
    const panX = (viewport && viewport.panX) || 0;
    const panY = (viewport && viewport.panY) || 0;
    const rotation = (viewport && viewport.rotation) || 0;
    const zoom = (viewport && viewport.zoom) || 1;

    const centerX = canvas.width / 2 + panX;
    const centerY = canvas.height / 2 + panY;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // 3. Tính toán tỉ lệ co giãn vừa vặn màn hình học sinh
    const scale = Math.min((canvas.width * 0.96) / img.width, (canvas.height * 0.96) / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = -drawWidth / 2;
    const drawY = -drawHeight / 2;

    // 4. Vẽ ảnh (có cắt Crop hoặc toàn ảnh)
    if (viewport && viewport.crop) {
      const { x, y, width, height } = viewport.crop;
      ctx.drawImage(
        img,
        x * img.width,
        y * img.height,
        width * img.width,
        height * img.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
    } else {
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    ctx.filter = 'none'; // Bỏ filter cho nét vẽ vector

    // 5. Vẽ toàn bộ các nét bút và con dấu chữa bài của giáo viên
    const strokes = annotations || [];
    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      ctx.save();
      ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1;

      if (stroke.tool && stroke.tool.startsWith('stamp_')) {
        const pt = stroke.points[0];
        if (!pt) continue;
        const stampX = drawX + pt.x * drawWidth;
        const stampY = drawY + pt.y * drawHeight;

        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (stroke.tool === 'stamp_check') {
          ctx.fillStyle = '#10B981';
          ctx.fillText('✓', stampX, stampY);
        } else if (stroke.tool === 'stamp_cross') {
          ctx.fillStyle = '#EF4444';
          ctx.fillText('✗', stampX, stampY);
        } else if (stroke.tool === 'stamp_star') {
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('★', stampX, stampY);
        }
      } else {
        const firstPt = stroke.points[0];
        if (!firstPt) continue;

        ctx.strokeStyle = stroke.color || '#EF4444';
        ctx.lineWidth = stroke.size || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(drawX + firstPt.x * drawWidth, drawY + firstPt.y * drawHeight);

        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          if (p) {
            ctx.lineTo(drawX + p.x * drawWidth, drawY + p.y * drawHeight);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  };

  if (img.complete && img.naturalWidth > 0) {
    drawNow();
  } else {
    img.onload = drawNow;
  }
}

/**
 * Xử lý khi nhận được bản cập nhật trạng thái Camera vật thể từ WebSocket hoặc Poller
 */
export function handleObjectCameraUpdate(runId, camState) {
  if (!camState) return;

  state.currentRunId = runId;
  state.objectCameraState = camState;

  if (typeof document === 'undefined') return;

  // 1. Chuyển đổi màn hình hiển thị sang Camera vật thể
  document.getElementById('join-view')?.classList.add('hidden');
  document.getElementById('lobby-view')?.classList.add('hidden');
  document.getElementById('quiz-view')?.classList.add('hidden');
  document.getElementById('quiz-finished-view')?.classList.add('hidden');
  document.getElementById('poll-view')?.classList.add('hidden');
  document.getElementById('exam-view')?.classList.add('hidden');
  document.getElementById('assignment-view')?.classList.add('hidden');
  document.getElementById('swiss-duel-view')?.classList.add('hidden');

  const camView = document.getElementById('object-camera-view');
  if (!camView) return;
  camView.classList.remove('hidden');

  // Đảm bảo nút chat & trợ giúp vẫn hiện
  document.getElementById('student-chat-fab')?.classList.remove('hidden');

  const pausedBox = document.getElementById('object-camera-paused');
  const stageBox = document.getElementById('object-camera-stage');
  const headerSubtitle = document.getElementById('object-camera-header-subtitle');

  // 2. Kiểm tra cờ phát sóng từ giáo viên
  if (!camState.isStudentBroadcastEnabled) {
    if (pausedBox) pausedBox.classList.remove('hidden');
    if (stageBox) stageBox.classList.add('hidden');
    if (headerSubtitle) headerSubtitle.textContent = 'Thầy/cô đang tạm dừng chiếu màn hình';
    return;
  }

  // 3. Đang phát sóng -> Hiển thị stage
  if (pausedBox) pausedBox.classList.add('hidden');
  if (stageBox) stageBox.classList.remove('hidden');

  const photos = camState.photos || [];
  const activePhoto = photos.find((p) => p.id === camState.activePhotoId) || null;
  const comparePhoto = photos.find((p) => p.id === camState.comparePhotoId) || null;

  const annotations = camState.annotations || [];
  const annotationsPrimary = annotations.filter((a) => a.photoId === (activePhoto ? activePhoto.id : ''));
  const annotationsSecondary = annotations.filter((a) => a.photoId === (comparePhoto ? comparePhoto.id : ''));

  // Cập nhật tiêu đề bài làm
  if (headerSubtitle) {
    if (camState.displayMode === 'single') {
      headerSubtitle.textContent = activePhoto
        ? `Bài làm: ${activePhoto.studentName || activePhoto.name}`
        : 'Đang chuẩn bị bài làm...';
    } else {
      headerSubtitle.textContent = 'Đang so sánh 2 bài làm';
    }
  }

  const singleContainer = document.getElementById('object-camera-single-container');
  const splitContainer = document.getElementById('object-camera-split-container');
  const canvasSingle = document.getElementById('object-camera-canvas-single');
  const canvas1 = document.getElementById('object-camera-canvas-1');
  const canvas2 = document.getElementById('object-camera-canvas-2');
  const label1 = document.getElementById('object-camera-label-1');
  const label2 = document.getElementById('object-camera-label-2');

  if (camState.displayMode === 'single') {
    if (singleContainer) singleContainer.classList.remove('hidden');
    if (splitContainer) splitContainer.classList.add('hidden');

    renderStudentCanvas(canvasSingle, activePhoto, annotationsPrimary, camState.viewport);
  } else {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (splitContainer) {
      splitContainer.classList.remove('hidden');
      if (camState.displayMode === 'compare_vertical') {
        splitContainer.style.flexDirection = 'row';
      } else {
        splitContainer.style.flexDirection = 'column';
      }
    }

    if (label1) {
      label1.textContent = activePhoto
        ? `1: ${activePhoto.studentName || activePhoto.name}`
        : 'Ảnh 1: Chưa chọn';
    }
    if (label2) {
      label2.textContent = comparePhoto
        ? `2: ${comparePhoto.studentName || comparePhoto.name}`
        : 'Ảnh 2: Chưa chọn';
    }

    renderStudentCanvas(canvas1, activePhoto, annotationsPrimary, camState.viewport);
    renderStudentCanvas(canvas2, comparePhoto, annotationsSecondary, camState.compareViewport || camState.viewport);
  }

  // Gắn sự kiện thay đổi kích thước cửa sổ một lần duy nhất
  if (!resizeListenerAttached && typeof window !== 'undefined') {
    resizeListenerAttached = true;
    window.addEventListener('resize', () => {
      if (state.objectCameraState && !camView.classList.contains('hidden')) {
        handleObjectCameraUpdate(state.currentRunId, state.objectCameraState);
      }
    });
  }
}
