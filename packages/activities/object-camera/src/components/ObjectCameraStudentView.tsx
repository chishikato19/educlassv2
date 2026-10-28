import React, { useRef, useEffect } from 'react';
import type { ObjectCameraState, ObjectCameraPhoto } from '../object-camera-schemas.js';

export interface ObjectCameraStudentViewProps {
  runId: string;
  state: ObjectCameraState;
  participantId: string;
  onSendIntent: (intent: unknown) => void;
}

export const ObjectCameraStudentView: React.FC<ObjectCameraStudentViewProps> = ({
  state,
  participantId,
}) => {
  const canvasRefPrimary = useRef<HTMLCanvasElement>(null);
  const canvasRefSecondary = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePhoto = state.photos.find(p => p.id === state.activePhotoId) || null;
  const comparePhoto = state.photos.find(p => p.id === state.comparePhotoId) || null;

  const annotationsPrimary = state.annotations.filter(a => a.photoId === (activePhoto?.id || ''));
  const annotationsSecondary = state.annotations.filter(
    a => a.photoId === (comparePhoto?.id || '')
  );

  // Hàm render 1 ảnh và các nét bút của giáo viên lên canvas
  const renderStudentCanvas = (
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
      canvas.width = canvas.parentElement?.clientWidth || 360;
      canvas.height = canvas.parentElement?.clientHeight || 560;

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

      // Kích thước vẽ vừa vặn màn hình học sinh
      const scale = Math.min(
        (canvas.width * 0.95) / img.width,
        (canvas.height * 0.95) / img.height
      );
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = -drawWidth / 2;
      const drawY = -drawHeight / 2;

      // Xử lý cắt xén (Crop)
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

          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.size;
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

  // Render ảnh 1
  useEffect(() => {
    if (state.isStudentBroadcastEnabled) {
      renderStudentCanvas(
        canvasRefPrimary.current,
        activePhoto,
        annotationsPrimary,
        state.viewport
      );
    }
  }, [activePhoto, annotationsPrimary, state.viewport, state.isStudentBroadcastEnabled]);

  // Render ảnh 2 (khi ở chế độ so sánh)
  useEffect(() => {
    if (state.isStudentBroadcastEnabled && state.displayMode !== 'single') {
      renderStudentCanvas(
        canvasRefSecondary.current,
        comparePhoto,
        annotationsSecondary,
        state.compareViewport || state.viewport
      );
    }
  }, [
    comparePhoto,
    annotationsSecondary,
    state.compareViewport,
    state.viewport,
    state.displayMode,
    state.isStudentBroadcastEnabled,
  ]);

  const isMeAwarded = state.lastAwardedStudent?.studentId === participantId;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative select-none"
    >
      {/* Thanh đầu trang thông báo bài giảng */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-base">📷</span>
          <span className="font-bold text-white truncate max-w-[180px]">
            {state.displayMode !== 'single'
              ? 'So sánh 2 bài làm'
              : activePhoto
                ? activePhoto.name
                : 'Camera vật thể'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {state.isStudentBroadcastEnabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-medium text-[11px]">Đang chiếu trực tiếp</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-400 font-medium text-[11px]">Tạm dừng chiếu</span>
            </>
          )}
        </div>
      </div>

      {/* Vùng hiển thị trực tiếp */}
      <div className="flex-1 relative flex overflow-hidden">
        {!state.isStudentBroadcastEnabled ? (
          // Màn hình khi giáo viên TẠM DỪNG CHIẾU
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xs mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">
              ⏸️
            </div>
            <h3 className="text-base font-bold text-amber-400 mb-1">Thầy/Cô đang chấm bài</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thầy/Cô đang xử lý và chuẩn bị bài chữa. Hãy chú ý lắng nghe và nhìn lên bảng nhé!
            </p>
          </div>
        ) : state.displayMode === 'single' ? (
          // Chế độ 1 ảnh
          <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
            {activePhoto ? (
              <canvas ref={canvasRefPrimary} className="w-full h-full block" />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">
                  📷
                </div>
                <h3 className="text-base font-bold text-slate-200 mb-1">
                  Thầy/Cô đang chuẩn bị bài làm
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hình ảnh bài tập và từng nét chữa của Thầy/Cô sẽ tự động xuất hiện trên màn hình
                  của em.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Chế độ so sánh 2 ảnh (dọc hoặc ngang)
          <div
            className={`flex-1 w-full h-full flex ${
              state.displayMode === 'compare_vertical'
                ? 'flex-row divide-x divide-slate-800'
                : 'flex-col divide-y divide-slate-800'
            }`}
          >
            {/* Ảnh 1 */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-slate-900/90 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-blue-400 font-bold shadow">
                Ảnh 1: {activePhoto?.studentName || activePhoto?.name || 'Chưa chọn'}
              </div>
              <canvas ref={canvasRefPrimary} className="w-full h-full block" />
            </div>

            {/* Ảnh 2 */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-slate-900/90 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-emerald-400 font-bold shadow">
                Ảnh 2: {comparePhoto?.studentName || comparePhoto?.name || 'Chưa chọn'}
              </div>
              <canvas ref={canvasRefSecondary} className="w-full h-full block" />
            </div>
          </div>
        )}

        {/* Thông báo chúc mừng học sinh nhận điểm thưởng EXP */}
        {state.lastAwardedStudent && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-4 py-1.5 rounded-full shadow-xl font-bold text-xs flex items-center gap-1.5 animate-bounce z-30">
            <span>🎉</span>
            <span>
              {isMeAwarded ? 'Em được' : `${state.lastAwardedStudent.studentName} được`} Thầy/Cô
              thưởng +{state.lastAwardedStudent.exp} EXP!
            </span>
          </div>
        )}

        {/* Huy hiệu tên học sinh ở chế độ 1 ảnh */}
        {state.displayMode === 'single' && activePhoto?.studentName && (
          <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-sm border border-slate-700 text-white px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-1.5 z-10">
            <span>📝</span>
            <span>
              Bài của: <strong>{activePhoto.studentName}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
