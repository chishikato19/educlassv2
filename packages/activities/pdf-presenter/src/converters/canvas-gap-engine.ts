import type { PageGap, AnnotationStroke, GapPattern } from '../pdf-presenter-schemas.js';

export interface RenderCanvasOptions {
  sourceCanvas?: HTMLCanvasElement;
  sourceImage?: CanvasImageSource | null;
  sourceWidth?: number;
  sourceHeight?: number;
  targetCanvas: HTMLCanvasElement;
  gaps: PageGap[];
  strokes: AnnotationStroke[];
  scale?: number;
  highlightGapId?: string | null;
}

/**
 * Tính tổng chiều cao của trang sau khi đã chèn thêm các khoảng trống (gaps)
 */
export function calculateExpandedHeight(originalHeight: number, gaps: PageGap[]): number {
  const totalGapPx = gaps.reduce((sum, g) => sum + g.gapHeightPx, 0);
  return originalHeight + totalGapPx;
}

/**
 * Vẽ hoa văn nền cho vùng khoảng trống (Mô hình A)
 */
export function drawGapPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pattern: GapPattern = 'grid',
  isHighlighted = false
): void {
  ctx.save();

  // Nền trắng cơ bản
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, width, height);

  if (pattern === 'grid') {
    // Vẽ lưới ô ly tập học sinh (Caro xanh nhạt chuẩn vở ô ly tiểu học/THCS)
    const gridSize = 24;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E0EEF9'; // Xanh pastel ô ly nhạt

    ctx.beginPath();
    // Đường dọc
    for (let gx = x; gx <= x + width; gx += gridSize) {
      ctx.moveTo(gx + 0.5, y);
      ctx.lineTo(gx + 0.5, y + height);
    }
    // Đường ngang
    for (let gy = y; gy <= y + height; gy += gridSize) {
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
    }
    ctx.stroke();

    // Dòng kẻ đậm chính mỗi 4 ô (vở 4 ô ly)
    ctx.strokeStyle = '#C9E2F5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let gy = y; gy <= y + height; gy += gridSize * 4) {
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
    }
    ctx.stroke();
  } else if (pattern === 'lines') {
    // Kẻ dòng ngang (Ruled notebook lines)
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

  // Viền nét đứt phân tách vị trí cắt và chèn
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = isHighlighted ? '#3B82F6' : '#94A3B8';
  ctx.lineWidth = isHighlighted ? 2 : 1;

  ctx.beginPath();
  // Viền trên
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + width, y + 0.5);
  // Viền dưới
  ctx.moveTo(x, y + height - 0.5);
  ctx.lineTo(x + width, y + height - 0.5);
  ctx.stroke();

  // Nhãn biểu thị khoảng trống sửa bài
  ctx.setLineDash([]);
  ctx.fillStyle = isHighlighted ? '#2563EB' : '#64748B';
  ctx.font = 'bold 11px system-ui, sans-serif';
  const labelText = `✂️ Khoảng trống chữa bài (${Math.round(height)}px)`;
  ctx.fillText(labelText, x + 12, y + 18);

  ctx.restore();
}

/**
 * Cắt lát trang PDF Canvas theo chiều dọc và chèn các khoảng trống (gaps)
 * Sau đó render các nét vẽ vector đè lên chính xác từng pixel.
 */
export function renderCanvasWithGapsAndStrokes({
  sourceCanvas,
  sourceImage,
  sourceWidth,
  sourceHeight,
  targetCanvas,
  gaps,
  strokes,
  scale = 1,
  highlightGapId = null,
}: RenderCanvasOptions): void {
  const src = sourceImage ?? sourceCanvas;
  let origW = 800;
  if (typeof sourceWidth === 'number' && sourceWidth > 0) {
    origW = sourceWidth;
  } else if (src && 'width' in src && typeof (src as { width: unknown }).width === 'number') {
    origW = (src as { width: number }).width || 800;
  }

  let origH = 1130;
  if (typeof sourceHeight === 'number' && sourceHeight > 0) {
    origH = sourceHeight;
  } else if (src && 'height' in src && typeof (src as { height: unknown }).height === 'number') {
    origH = (src as { height: number }).height || 1130;
  }

  // Sắp xếp các gap theo thứ tự từ trên xuống dưới theo vị trí cắt splitYRatio
  const sortedGaps = [...gaps].sort((a, b) => a.splitYRatio - b.splitYRatio);

  // Tính chiều cao mới
  const totalGapPxScaled = sortedGaps.reduce((acc, g) => acc + g.gapHeightPx * scale, 0);
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale + totalGapPxScaled);

  targetCanvas.width = targetW;
  targetCanvas.height = targetH;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  // 1. Cắt ghép các lát ảnh từ source sang targetCanvas
  let currentSrcY = 0;
  let currentTargetY = 0;

  for (const gap of sortedGaps) {
    const splitSrcY = Math.round(gap.splitYRatio * origH);
    const sliceHeight = splitSrcY - currentSrcY;

    if (sliceHeight > 0) {
      if (src) {
        ctx.drawImage(
          src,
          0,
          currentSrcY,
          origW,
          sliceHeight,
          0,
          currentTargetY,
          targetW,
          Math.round(sliceHeight * scale)
        );
      }
      currentTargetY += Math.round(sliceHeight * scale);
      currentSrcY = splitSrcY;
    }

    // Vẽ vùng khoảng trống chèn thêm
    const gapHeightScaled = Math.round(gap.gapHeightPx * scale);
    drawGapPattern(
      ctx,
      0,
      currentTargetY,
      targetW,
      gapHeightScaled,
      gap.pattern,
      gap.id === highlightGapId
    );
    currentTargetY += gapHeightScaled;
  }

  // Vẽ lát ảnh cuối cùng từ splitY cuối cùng đến đáy của source (phần đề bên dưới chỗ cắt di chuyển xuống)
  const remainingSrcH = origH - currentSrcY;
  if (remainingSrcH > 0) {
    if (src) {
      ctx.drawImage(
        src,
        0,
        currentSrcY,
        origW,
        remainingSrcH,
        0,
        currentTargetY,
        targetW,
        Math.round(remainingSrcH * scale)
      );
    }
  }

  // 2. Vẽ đè các nét vẽ vector (Strokes)
  renderStrokesOnCanvas(ctx, strokes, targetW, targetH, scale);
}

/**
 * Vẽ các nét vẽ vector AnnotationStrokes lên context 2D
 */
export function renderStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: AnnotationStroke[],
  canvasWidth: number,
  canvasHeight: number,
  scale = 1
): void {
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length < 1) continue;

    ctx.save();

    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = stroke.opacity ?? 0.4;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(8, stroke.size * scale * 3);
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else if (stroke.tool === 'eraser') {
      // Công cụ tẩy (chế độ xóa điểm ảnh)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * scale * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      // Bút viết (Pen)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1.5, stroke.size * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    const pts = stroke.points;
    const getPointY = (p: { y: number }) => {
      // Nếu y <= 1.0001 (chuẩn hóa tương đối kiểu cũ), tính theo canvasHeight
      // Nếu y > 1 (pixel logic cố định), giữ nguyên tọa độ pixel logic tuyệt đối (nhân scale)
      return p.y <= 1.0001 ? p.y * canvasHeight : p.y * scale;
    };

    if (pts.length === 1) {
      // Chỉ có 1 điểm chấm
      const p = pts[0]!;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(p.x * canvasWidth, getPointY(p), ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      const first = pts[0]!;
      ctx.moveTo(first.x * canvasWidth, getPointY(first));

      // Nối mượt các điểm qua quadratic curves
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]!;
        const curr = pts[i]!;
        const midX = ((prev.x + curr.x) / 2) * canvasWidth;
        const midY = (getPointY(prev) + getPointY(curr)) / 2;
        ctx.quadraticCurveTo(prev.x * canvasWidth, getPointY(prev), midX, midY);
      }

      const last = pts[pts.length - 1]!;
      ctx.lineTo(last.x * canvasWidth, getPointY(last));
      ctx.stroke();
    }

    ctx.restore();
  }
}
