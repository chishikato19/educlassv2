import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { PdfPresenterState, PageGap, AnnotationStroke } from '../pdf-presenter-schemas.js';
import {
  calculateExpandedHeight,
  renderCanvasWithGapsAndStrokes,
} from '../converters/canvas-gap-engine.js';
import { BASE_PAGE_WIDTH, BASE_PAGE_HEIGHT } from '../converters/document-loader.js';

export interface PdfPresenterProjectorViewProps {
  state: PdfPresenterState;
}

interface ProjectorSinglePageProps {
  pageNumber: number;
  totalPages: number;
  pageImageUrl?: string | undefined;
  gaps: PageGap[];
  strokes: AnnotationStroke[];
  laserPointer?: { pageNumber: number; x: number; y: number; visible: boolean };
}

const ProjectorSinglePage: React.FC<ProjectorSinglePageProps> = ({
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

  const expandedHeight = calculateExpandedHeight(BASE_PAGE_HEIGHT, gaps);

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
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [gaps, strokes, laserPointer, pageNumber, imageLoaded]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="relative bg-white shadow-2xl rounded-lg border border-slate-700 flex flex-col mb-10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white select-none text-xs font-bold border-b border-slate-700">
        <span className="bg-blue-600 px-2.5 py-0.5 rounded-full">
          Trang {pageNumber} / {totalPages}
        </span>
        <span className="text-slate-400 font-normal">
          {gaps.length > 0 ? `Đã nới rộng ${gaps.length} khoảng trống chữa bài` : ''}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: BASE_PAGE_WIDTH, height: expandedHeight }}
        className="block"
      />
    </div>
  );
};

export const PdfPresenterProjectorView: React.FC<PdfPresenterProjectorViewProps> = ({
  state,
}) => {
  const totalPages = state.document?.totalPages || 1;
  const pageImages = state.document?.pageImages || [];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      {/* Header Projector (Tối giản chuẩn máy chiếu) */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📽️</span>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              {state.document?.title || 'Màn chiếu bài giảng'}
            </h1>
            <p className="text-xs text-slate-400">
              Tổng số {totalPages} trang • Chế độ cuộn liên tục
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full animate-pulse bg-white"></span>
            Đang chiếu trực tiếp
          </span>
        </div>
      </div>

      {/* Vùng Cuộn Liên Tục Toàn Bộ Trang Trên Máy Chiếu */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col items-center">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
          const pageGaps = state.gaps.filter((g) => g.pageNumber === pNum);
          const pageStrokes = state.strokes.filter((s) => s.pageNumber === pNum);
          const pageImg = pageImages[pNum - 1];

          return (
            <ProjectorSinglePage
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
