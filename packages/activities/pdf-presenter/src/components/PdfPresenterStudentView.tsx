import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PdfPresenterState, PageGap, AnnotationStroke } from '../pdf-presenter-schemas.js';
import { renderCanvasWithGapsAndStrokes } from '../converters/canvas-gap-engine.js';
import { BASE_PAGE_WIDTH, BASE_PAGE_HEIGHT } from '../converters/document-loader.js';

export interface PdfPresenterStudentViewProps {
  runId: string;
  state: PdfPresenterState;
  participantId: string;
  onSendIntent: (intent: unknown) => void;
}

interface StudentSinglePageProps {
  pageNumber: number;
  totalPages: number;
  pageImageUrl?: string | undefined;
  gaps: PageGap[];
  strokes: AnnotationStroke[];
  laserPointer?: { pageNumber: number; x: number; y: number; visible: boolean };
}

const StudentSinglePage: React.FC<StudentSinglePageProps> = ({
  pageNumber,
  totalPages,
  pageImageUrl,
  gaps,
  strokes,
  laserPointer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!pageImageUrl) {
      imageRef.current = null;
      setImageLoaded(true);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      imageRef.current = null;
      setImageLoaded(true);
    };
    img.src = pageImageUrl;
  }, [pageImageUrl]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderCanvasWithGapsAndStrokes({
      sourceImage: imageRef.current,
      sourceWidth: BASE_PAGE_WIDTH,
      sourceHeight: BASE_PAGE_HEIGHT,
      targetCanvas: canvas,
      gaps,
      strokes,
      scale: 1,
    });

    // Vẽ Laser Pointer của giáo viên nếu đang trỏ vào trang này
    if (laserPointer?.visible && laserPointer.pageNumber === pageNumber) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const px = laserPointer.x * canvas.width;
        const py = laserPointer.y * canvas.height;

        ctx.save();
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#DC2626';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [gaps, strokes, laserPointer, pageNumber, imageLoaded]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="relative bg-white shadow-xl rounded-lg border border-slate-300 flex flex-col mb-6 overflow-hidden w-full max-w-[800px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 text-slate-700 select-none text-[11px] font-bold border-b border-slate-200">
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full">
          Trang {pageNumber} / {totalPages}
        </span>
        <span className="text-slate-500 font-normal">
          {gaps.length > 0 ? `${gaps.length} chỗ sửa bài` : ''}
        </span>
      </div>
      <div className="w-full overflow-hidden flex justify-center bg-white">
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
    </div>
  );
};

export const PdfPresenterStudentView: React.FC<PdfPresenterStudentViewProps> = ({ state }) => {
  const isBroadcastEnabled = state.isStudentBroadcastEnabled ?? true;
  const totalPages = state.document?.totalPages || 1;
  const pageImages = state.document?.pageImages || [];

  // Màn hình khi giáo viên TẠM DỪNG chiếu
  if (!isBroadcastEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-100 p-6 text-center select-none">
        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl mb-4 animate-pulse">
          ⏸️
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Thầy/Cô đang tạm dừng chiếu</h2>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Vui lòng đợi giây lát, thầy/cô đang chuẩn bị bài giảng hoặc trang tiếp theo nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      {/* Header gọn gàng trên điện thoại học sinh */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <div className="truncate max-w-[200px]">
            <h1 className="text-xs font-bold text-white truncate">
              {state.document?.title || 'Tài liệu bài học'}
            </h1>
            <p className="text-[10px] text-slate-400">{totalPages} trang • Cuộn xem toàn bộ</p>
          </div>
        </div>

        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-white"></span>
          Trực tiếp
        </span>
      </div>

      {/* Danh sách cuộn liên tục TẤT CẢ các trang */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 flex flex-col items-center">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => {
          const pageGaps = state.gaps.filter(g => g.pageNumber === pNum);
          const pageStrokes = state.strokes.filter(s => s.pageNumber === pNum);
          const pageImg = pageImages[pNum - 1];

          return (
            <StudentSinglePage
              key={pNum}
              pageNumber={pNum}
              totalPages={totalPages}
              pageImageUrl={pageImg}
              gaps={pageGaps}
              strokes={pageStrokes}
              laserPointer={state.teacherPointer}
            />
          );
        })}
      </div>
    </div>
  );
};
