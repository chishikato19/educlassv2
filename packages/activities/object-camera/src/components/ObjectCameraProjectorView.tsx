import React, { useRef, useEffect } from 'react';
import type { ObjectCameraState, ObjectCameraPhoto } from '../object-camera-schemas.js';

export interface ObjectCameraProjectorViewProps {
  state: ObjectCameraState;
}

export const ObjectCameraProjectorView: React.FC<ObjectCameraProjectorViewProps> = ({
  state,
}) => {
  const canvasRefPrimary = useRef<HTMLCanvasElement>(null);
  const canvasRefSecondary = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePhoto = state.photos.find((p) => p.id === state.activePhotoId) || null;
  const comparePhoto = state.photos.find((p) => p.id === state.comparePhotoId) || null;

  const annotationsPrimary = state.annotations.filter(
    (a) => a.photoId === (activePhoto?.id || '')
  );
  const annotationsSecondary = state.annotations.filter(
    (a) => a.photoId === (comparePhoto?.id || '')
  );

  // Render ảnh và nét bút giáo viên lên Máy chiếu
  const renderProjectorCanvas = (
    canvas: HTMLCanvasElement | null,
    photo: ObjectCameraPhoto | null,
    annotations: typeof state.annotations,
    viewport: typeof state.viewport
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!photo) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.url;

    img.onload = () => {
      canvas.width = canvas.parentElement?.clientWidth || 1920;
      canvas.height = canvas.parentElement?.clientHeight || 1080;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Áp dụng bộ lọc tài liệu theo giáo viên
      if (viewport.filter === 'high_contrast') {
        ctx.filter = 'contrast(1.6) brightness(1.1)';
      } else if (viewport.filter === 'black_white') {
        ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.05)';
      } else {
        ctx.filter = 'none';
      }

      // Tâm xoay và dịch chuyển theo giáo viên
      const centerX = canvas.width / 2 + viewport.panX;
      const centerY = canvas.height / 2 + viewport.panY;
      ctx.translate(centerX, centerY);
      ctx.rotate((viewport.rotation * Math.PI) / 180);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Kích thước vẽ lớn tối đa trên máy chiếu
      const scale = Math.min((canvas.width * 0.96) / img.width, (canvas.height * 0.96) / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = -drawWidth / 2;
      const drawY = -drawHeight / 2;

      // Cắt xén (Crop)
      if (viewport.crop) {
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

      ctx.filter = 'none';

      // Vẽ toàn bộ các nét bút và con dấu của giáo viên
      for (const stroke of annotations) {
        if (!stroke.points || stroke.points.length === 0) continue;

        ctx.save();
        ctx.globalAlpha = stroke.opacity;

        if (stroke.tool.startsWith('stamp_')) {
          const pt = stroke.points[0];
          if (!pt) continue;
          const stampX = drawX + pt.x * drawWidth;
          const stampY = drawY + pt.y * drawHeight;

          ctx.font = 'bold 54px sans-serif';
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

          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.size * 1.5;
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
  };

  useEffect(() => {
    renderProjectorCanvas(canvasRefPrimary.current, activePhoto, annotationsPrimary, state.viewport);
  }, [activePhoto, annotationsPrimary, state.viewport]);

  useEffect(() => {
    if (state.displayMode !== 'single') {
      renderProjectorCanvas(
        canvasRefSecondary.current,
        comparePhoto,
        annotationsSecondary,
        state.compareViewport || state.viewport
      );
    }
  }, [comparePhoto, annotationsSecondary, state.compareViewport, state.viewport, state.displayMode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-950 text-white flex items-center justify-center relative overflow-hidden select-none"
    >
      {state.displayMode === 'single' ? (
        activePhoto ? (
          <canvas ref={canvasRefPrimary} className="w-full h-full block" />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-28 h-28 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-6xl mb-6 shadow-2xl">
              📷
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100 mb-2">Camera Vật Thể</h2>
            <p className="text-lg text-slate-400">Đang sẵn sàng kết nối và trình chiếu bài giảng...</p>
          </div>
        )
      ) : (
        // Chế độ so sánh 2 ảnh
        <div
          className={`w-full h-full flex ${
            state.displayMode === 'compare_vertical' ? 'flex-row divide-x-2 divide-slate-800' : 'flex-col divide-y-2 divide-slate-800'
          }`}
        >
          {/* Ảnh 1 */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-xl text-base font-bold text-blue-400 shadow-xl flex items-center gap-2">
              <span>📖 Bài 1:</span>
              <span>{activePhoto?.studentName || activePhoto?.name || 'Chưa chọn'}</span>
            </div>
            <canvas ref={canvasRefPrimary} className="w-full h-full block" />
          </div>

          {/* Ảnh 2 */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-xl text-base font-bold text-emerald-400 shadow-xl flex items-center gap-2">
              <span>📖 Bài 2:</span>
              <span>{comparePhoto?.studentName || comparePhoto?.name || 'Chưa chọn'}</span>
            </div>
            <canvas ref={canvasRefSecondary} className="w-full h-full block" />
          </div>
        </div>
      )}

      {/* Tên học sinh hiển thị góc màn hình ở chế độ 1 ảnh */}
      {state.displayMode === 'single' && activePhoto?.studentName && (
        <div className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-6 py-2.5 rounded-2xl text-lg font-bold shadow-2xl flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <span>Bài làm của em: <span className="text-blue-400">{activePhoto.studentName}</span></span>
        </div>
      )}

      {/* Banner Vinh danh khen thưởng EXP trên máy chiếu */}
      {state.lastAwardedStudent && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-2xl px-10 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce z-30">
          <span className="text-4xl">🌟</span>
          <span>
            Chúc mừng em <span className="underline">{state.lastAwardedStudent.studentName}</span> được Thầy/Cô thưởng +
            {state.lastAwardedStudent.exp} EXP!
          </span>
          <span className="text-4xl">🌟</span>
        </div>
      )}
    </div>
  );
};
