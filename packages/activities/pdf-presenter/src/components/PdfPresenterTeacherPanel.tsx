import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  PdfPresenterState,
  PdfPresenterTeacherIntent,
  PageGap,
  AnnotationStroke,
  GapPattern,
} from '../pdf-presenter-schemas.js';
import {
  calculateExpandedHeight,
  renderCanvasWithGapsAndStrokes,
} from '../converters/canvas-gap-engine.js';
import {
  loadPdfPages,
  loadDocxPages,
  loadSampleDocumentPages,
  BASE_PAGE_WIDTH,
  BASE_PAGE_HEIGHT,
} from '../converters/document-loader.js';

export interface PdfPresenterTeacherPanelProps {
  state: PdfPresenterState;
  onSendIntent: (intent: PdfPresenterTeacherIntent) => void;
  participants?: Array<{ id: string; displayName: string; isOnline?: boolean }>;
}

/**
 * Component hiển thị một trang tài liệu đơn lẻ trong danh sách cuộn liên tục
 */
interface SinglePageCanvasProps {
  pageNumber: number;
  totalPages: number;
  pageImageUrl?: string | undefined;
  gaps: PageGap[];
  strokes: AnnotationStroke[];
  activeTool: 'pen' | 'highlighter' | 'eraser' | 'gap' | 'laser';
  penColor: string;
  penSize: number;
  highlighterColor: string;
  gapPattern: GapPattern;
  zoom: number;
  isDrawing: boolean;
  drawingPage: number | null;
  currentStrokePoints: Array<{ x: number; y: number }>;
  hoverGap: { pageNumber: number; yRatio: number } | null;
  onSetHoverGap: (hover: { pageNumber: number; yRatio: number } | null) => void;
  onStartDrawing: (pageNumber: number, pt: { x: number; y: number }) => void;
  onMoveDrawing: (pageNumber: number, pt: { x: number; y: number }) => void;
  onEndDrawing: () => void;
  onInsertGap: (pageNumber: number, splitYRatio: number) => void;
  onUpdateGapHeight: (gapId: string, heightPx: number) => void;
  onUpdateGapPattern: (gapId: string, pattern: GapPattern) => void;
  onRemoveGap: (gapId: string) => void;
  onClearStrokes: (pageNumber: number) => void;
  onRemoveStrokes: (strokeIds: string[], pageNumber: number) => void;
  onLaserPointer: (pageNumber: number, x: number, y: number, visible: boolean) => void;
}

const SinglePageCanvas: React.FC<SinglePageCanvasProps> = ({
  pageNumber,
  totalPages,
  pageImageUrl,
  gaps,
  strokes,
  activeTool,
  penColor,
  penSize,
  highlighterColor,
  zoom,
  isDrawing,
  drawingPage,
  currentStrokePoints,
  hoverGap,
  onSetHoverGap,
  onStartDrawing,
  onMoveDrawing,
  onEndDrawing,
  onInsertGap,
  onUpdateGapHeight,
  onUpdateGapPattern,
  onRemoveGap,
  onClearStrokes,
  onRemoveStrokes,
  onLaserPointer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [eraseBox, setEraseBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [collapsedGapIds, setCollapsedGapIds] = useState<Record<string, boolean>>({});

  const toggleCollapseGap = (gapId: string) => {
    setCollapsedGapIds(prev => ({
      ...prev,
      [gapId]: !prev[gapId],
    }));
  };

  const expandedHeight = calculateExpandedHeight(BASE_PAGE_HEIGHT, gaps);

  // Tải trước ảnh của trang này
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

  // Vẽ Canvas: Slices + Gaps (Mô hình A) + Nét bút
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Chuẩn bị các nét vẽ
    const liveStrokes = [...strokes];
    if (isDrawing && drawingPage === pageNumber && currentStrokePoints.length > 0) {
      liveStrokes.push({
        id: 'preview',
        pageNumber,
        tool:
          activeTool === 'highlighter' ? 'highlighter' : activeTool === 'eraser' ? 'eraser' : 'pen',
        color: activeTool === 'highlighter' ? highlighterColor : penColor,
        size: activeTool === 'highlighter' ? 18 : penSize,
        opacity: activeTool === 'highlighter' ? 0.4 : 1,
        points: currentStrokePoints,
        createdAt: Date.now(),
      });
    }

    renderCanvasWithGapsAndStrokes({
      sourceImage: imageRef.current,
      sourceWidth: BASE_PAGE_WIDTH,
      sourceHeight: BASE_PAGE_HEIGHT,
      targetCanvas: canvas,
      gaps,
      strokes: liveStrokes,
      scale: 1,
    });

    // Vẽ khung chữ nhật tẩy chọn vùng (Area / Box Eraser)
    if (eraseBox) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const x1 = Math.min(eraseBox.startX, eraseBox.currentX) * canvas.width;
        const y1 = Math.min(eraseBox.startY, eraseBox.currentY);
        const w = Math.abs(eraseBox.currentX - eraseBox.startX) * canvas.width;
        const h = Math.abs(eraseBox.currentY - eraseBox.startY);

        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.fillRect(x1, y1, w, h);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x1, y1, w, h);
        ctx.restore();
      }
    }
  }, [
    strokes,
    isDrawing,
    drawingPage,
    pageNumber,
    currentStrokePoints,
    activeTool,
    highlighterColor,
    penColor,
    penSize,
    gaps,
    imageLoaded,
    eraseBox,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Xử lý tọa độ chuột
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, yRatio: 0, rawY: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rawY = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, yRatio, rawY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, yRatio, rawY } = getCanvasCoords(e);

    if (activeTool === 'gap') {
      // Tính vị trí cắt tương ứng trên trang gốc (bỏ qua các khoảng trống đã có phía trên)
      const sortedGaps = [...gaps].sort((a, b) => a.splitYRatio - b.splitYRatio);
      let origY = rawY;
      for (const g of sortedGaps) {
        const gapStartPx = g.splitYRatio * BASE_PAGE_HEIGHT;
        if (origY > gapStartPx) {
          origY -= g.gapHeightPx;
        }
      }
      const splitRatio = Math.max(0.05, Math.min(0.95, origY / BASE_PAGE_HEIGHT));
      onInsertGap(pageNumber, Number(splitRatio.toFixed(3)));
      return;
    }

    if (activeTool === 'laser') {
      onLaserPointer(pageNumber, x, yRatio, true);
      return;
    }

    if (activeTool === 'eraser') {
      setEraseBox({ startX: x, startY: rawY, currentX: x, currentY: rawY });
      return;
    }

    // Nét vẽ mới: lưu y theo pixel logic Y cố định (rawY) để không bị trôi khi thêm gap hoặc bấm +60px
    onStartDrawing(pageNumber, { x, y: Number(rawY.toFixed(1)) });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, yRatio, rawY } = getCanvasCoords(e);

    if (activeTool === 'gap') {
      onSetHoverGap({ pageNumber, yRatio });
      return;
    }

    if (activeTool === 'laser') {
      onLaserPointer(pageNumber, x, yRatio, true);
      return;
    }

    if (activeTool === 'eraser') {
      if (eraseBox) {
        setEraseBox(prev => (prev ? { ...prev, currentX: x, currentY: rawY } : null));
      }
      return;
    }

    if (isDrawing && drawingPage === pageNumber) {
      onMoveDrawing(pageNumber, { x, y: Number(rawY.toFixed(1)) });
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'laser') {
      onLaserPointer(pageNumber, 0, 0, false);
      return;
    }

    if (activeTool === 'eraser') {
      if (eraseBox) {
        const canvas = canvasRef.current;
        const canvasWidth = canvas?.width || BASE_PAGE_WIDTH;
        const canvasHeight = canvas?.height || expandedHeight;

        let boxMinX = Math.min(eraseBox.startX, eraseBox.currentX);
        let boxMaxX = Math.max(eraseBox.startX, eraseBox.currentX);
        let boxMinY = Math.min(eraseBox.startY, eraseBox.currentY);
        let boxMaxY = Math.max(eraseBox.startY, eraseBox.currentY);

        const widthPx = (boxMaxX - boxMinX) * canvasWidth;
        const heightPx = boxMaxY - boxMinY;

        // Nếu click nhẹ một điểm (< 10px), mở rộng vùng quét quanh điểm click ~20px để dễ xóa
        if (widthPx < 10 && heightPx < 10) {
          boxMinX = Math.max(0, eraseBox.startX - 20 / canvasWidth);
          boxMaxX = Math.min(1, eraseBox.startX + 20 / canvasWidth);
          boxMinY = Math.max(0, eraseBox.startY - 20);
          boxMaxY = eraseBox.startY + 20;
        }

        // Lọc các nét vẽ (chữ viết & dạ quang) có điểm chạm vào vùng chọn
        const idsToDelete = strokes
          .filter(s =>
            s.points.some(p => {
              const ptY = p.y <= 1.0001 ? p.y * canvasHeight : p.y;
              return p.x >= boxMinX && p.x <= boxMaxX && ptY >= boxMinY && ptY <= boxMaxY;
            })
          )
          .map(s => s.id);

        if (idsToDelete.length > 0) {
          onRemoveStrokes(idsToDelete, pageNumber);
        }
        setEraseBox(null);
      }
      return;
    }

    onEndDrawing();
  };

  return (
    <div
      id={`page-container-${pageNumber}`}
      className="relative bg-white shadow-2xl rounded-lg border border-slate-300 flex flex-col mb-8 transition-transform"
      style={{
        width: BASE_PAGE_WIDTH * zoom,
        minHeight: expandedHeight * zoom,
      }}
    >
      {/* Thanh đầu trang: Hiển thị số trang & Thao tác nhanh */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 select-none rounded-t-lg text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold">
            Trang {pageNumber} / {totalPages}
          </span>
          <span className="text-slate-400 font-normal">
            {gaps.length > 0 ? `(${gaps.length} khoảng trống sửa bài)` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onInsertGap(pageNumber, 0.45)}
            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-bold cursor-pointer transition"
            title="Thêm khoảng trống sửa bài ở giữa trang này"
          >
            ✂️ Thêm chỗ sửa bài
          </button>
          <button
            type="button"
            onClick={() => onClearStrokes(pageNumber)}
            className="px-2 py-1 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded cursor-pointer transition"
            title="Xóa toàn bộ nét bút trên trang này"
          >
            🧹 Xóa nét trang này
          </button>
        </div>
      </div>

      {/* Vùng Canvas chính của trang */}
      <div className="relative overflow-hidden flex-1 bg-white">
        <canvas
          ref={canvasRef}
          className={`block w-full h-full ${activeTool === 'gap' ? 'cursor-row-resize' : 'cursor-crosshair'}`}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (activeTool === 'gap') onSetHoverGap(null);
            handleMouseUp();
          }}
        />

        {/* Đường kẻ đứt xem trước vị trí cắt khi rê chuột với công cụ ✂️ Gap */}
        {activeTool === 'gap' && hoverGap?.pageNumber === pageNumber && (
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-emerald-500 pointer-events-none flex items-center justify-center z-10"
            style={{ top: `${hoverGap.yRatio * 100}%` }}
          >
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md">
              ✂️ Bấm chuột để tạo khoảng trống sửa bài tại đây (phần đề bên dưới sẽ di chuyển xuống)
            </span>
          </div>
        )}

        {/* Bộ điều khiển co dãn cho từng khoảng trống đã tạo (Mô hình A) - Hỗ trợ thu gọn/mở rộng */}
        {gaps.map((gap, gIdx) => {
          // Tính vị trí hiển thị pixel của khoảng trống trên canvas
          const prevGapsHeight = gaps
            .filter(g => g.splitYRatio < gap.splitYRatio)
            .reduce((sum, g) => sum + g.gapHeightPx, 0);
          const gapTopPx = gap.splitYRatio * BASE_PAGE_HEIGHT + prevGapsHeight;
          const isCollapsed = Boolean(collapsedGapIds[gap.id]);

          if (isCollapsed) {
            return (
              <button
                key={gap.id}
                type="button"
                onClick={() => toggleCollapseGap(gap.id)}
                className="absolute right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white border border-slate-300 hover:border-blue-400 rounded-lg shadow-md px-2 py-0.5 z-20 text-xs backdrop-blur-sm select-none cursor-pointer transition text-slate-700 hover:text-blue-600 font-bold group"
                style={{ top: (gapTopPx + 8) * zoom }}
                title="Bấm để mở rộng bảng công cụ điều chỉnh chỗ sửa bài này"
              >
                <span>✂️ Chỗ #{gIdx + 1}</span>
                <span className="text-[11px] font-mono text-slate-400 font-normal">
                  ({gap.gapHeightPx}px)
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-blue-600 transition">
                  ▾
                </span>
              </button>
            );
          }

          return (
            <div
              key={gap.id}
              className="absolute right-3 flex items-center gap-1.5 bg-white/95 border border-slate-300 rounded-lg shadow-lg px-2.5 py-1 z-20 text-xs backdrop-blur-sm select-none transition"
              style={{ top: (gapTopPx + 8) * zoom }}
            >
              <button
                type="button"
                onClick={() => toggleCollapseGap(gap.id)}
                className="flex items-center gap-1 font-bold text-slate-800 hover:text-blue-600 cursor-pointer bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition"
                title="Thu gọn thanh công cụ này lại để không che chữ"
              >
                <span>✂️ Chỗ #{gIdx + 1}:</span>
                <span className="text-[10px] text-slate-500 font-bold">▲</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateGapHeight(gap.id, gap.gapHeightPx + 60)}
                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded cursor-pointer transition"
                title="Tăng thêm 60px để có nhiều chỗ viết hơn (đề dưới dạt xuống tiếp)"
              >
                +60px
              </button>
              <button
                type="button"
                onClick={() => onUpdateGapHeight(gap.id, Math.max(80, gap.gapHeightPx - 60))}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer transition"
                title="Giảm bớt 60px khoảng trống"
              >
                -60px
              </button>
              <span className="text-slate-500 font-mono text-[11px]">{gap.gapHeightPx}px</span>

              {/* Đổi kiểu hoa văn nền */}
              <select
                value={gap.pattern}
                onChange={e => onUpdateGapPattern(gap.id, e.target.value as GapPattern)}
                className="text-[11px] bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-slate-700 cursor-pointer outline-none"
              >
                <option value="grid">Ô ly</option>
                <option value="lines">Dòng kẻ</option>
                <option value="blank">Trắng</option>
              </select>

              <button
                type="button"
                onClick={() => onRemoveGap(gap.id)}
                className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded cursor-pointer ml-0.5 transition"
                title="Xóa khoảng trống này, đề bài bên dưới lập tức khép lại vị trí cũ"
              >
                ✕ Xóa
              </button>

              {/* Nút thu gọn riêng biệt rõ ràng */}
              <button
                type="button"
                onClick={() => toggleCollapseGap(gap.id)}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded cursor-pointer transition ml-0.5 flex items-center gap-0.5"
                title="Thu gọn thanh công cụ này lại để không che chữ"
              >
                <span>▲</span>
                <span className="text-[10px]">Ẩn</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PdfPresenterTeacherPanel: React.FC<PdfPresenterTeacherPanelProps> = ({
  state,
  onSendIntent,
}) => {
  // Bộ công cụ vẽ & thao tác
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser' | 'gap' | 'laser'>(
    'pen'
  );
  const [penColor, setPenColor] = useState('#DC2626'); // Đỏ mặc định để chữa bài
  const [penSize, setPenSize] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState('#FDE047'); // Vàng dạ quang
  const [gapPattern, setGapPattern] = useState<GapPattern>('grid');
  const [zoom, setZoom] = useState(1);

  // Loading indicator khi tải PDF/Word
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Trạng thái vẽ thời gian thực
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPage, setDrawingPage] = useState<number | null>(null);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{ x: number; y: number }>>(
    []
  );
  const [hoverGap, setHoverGap] = useState<{ pageNumber: number; yRatio: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const documentInfo = state.document;
  const totalPages = documentInfo?.totalPages || 1;
  const pageImages = documentInfo?.pageImages || [];

  // Tự động nạp đề ôn tập mẫu nếu lúc mở chưa có tài liệu nào
  useEffect(() => {
    if (!documentInfo) {
      void handleLoadSampleDocument();
    }
  }, []);

  // 1. Xử lý nạp file từ máy tính (PDF hoặc DOCX)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    setIsLoadingDocument(true);
    setLoadingStatus(`Đang đọc và chuyển đổi tài liệu (${file.name})...`);

    try {
      const buffer = await file.arrayBuffer();

      if (ext === 'docx' || ext === 'doc') {
        setLoadingStatus('Đang trích xuất nội dung văn bản Word (.docx)...');
        const docResult = await loadDocxPages(buffer, file.name);

        onSendIntent({
          type: 'load_document',
          document: {
            id: docResult.id,
            title: docResult.title,
            fileType: docResult.fileType,
            fileUrl: docResult.fileUrl,
            totalPages: docResult.totalPages,
            pageImages: docResult.pageImages,
            docxHtml: docResult.docxHtml,
            pageSize: docResult.pageSize,
            uploadedAt: Date.now(),
          },
        });
      } else {
        // Mặc định xử lý PDF qua PDF.js
        setLoadingStatus('Đang kết xuất các trang PDF với độ phân giải cao...');
        const docResult = await loadPdfPages(buffer, file.name);

        onSendIntent({
          type: 'load_document',
          document: {
            id: docResult.id,
            title: docResult.title,
            fileType: docResult.fileType,
            fileUrl: docResult.fileUrl,
            totalPages: docResult.totalPages,
            pageImages: docResult.pageImages,
            pageSize: docResult.pageSize,
            uploadedAt: Date.now(),
          },
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải tài liệu:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Không thể mở tài liệu: ${errMsg}. Vui lòng kiểm tra lại file PDF/Word.`);
    } finally {
      setIsLoadingDocument(false);
      setLoadingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 2. Nạp đề ôn tập mẫu có sẵn (2 trang toán học chuẩn)
  const handleLoadSampleDocument = async () => {
    setIsLoadingDocument(true);
    setLoadingStatus('Đang nạp đề ôn tập toán học mẫu (2 trang)...');
    try {
      const docResult = await loadSampleDocumentPages();
      onSendIntent({
        type: 'load_document',
        document: {
          id: docResult.id,
          title: docResult.title,
          fileType: docResult.fileType,
          fileUrl: docResult.fileUrl,
          totalPages: docResult.totalPages,
          pageImages: docResult.pageImages,
          docxHtml: docResult.docxHtml,
          pageSize: docResult.pageSize,
          uploadedAt: Date.now(),
        },
      });
    } catch (err) {
      console.error('Lỗi nạp đề mẫu:', err);
    } finally {
      setIsLoadingDocument(false);
      setLoadingStatus('');
    }
  };

  // 3. Thao tác vẽ bút
  const handleStartDrawing = (pageNumber: number, pt: { x: number; y: number }) => {
    setIsDrawing(true);
    setDrawingPage(pageNumber);
    setCurrentStrokePoints([pt]);
  };

  const handleMoveDrawing = (pageNumber: number, pt: { x: number; y: number }) => {
    if (!isDrawing || drawingPage !== pageNumber) return;
    setCurrentStrokePoints(prev => [...prev, pt]);
  };

  const handleEndDrawing = () => {
    if (!isDrawing || drawingPage === null || currentStrokePoints.length < 1) {
      setIsDrawing(false);
      setDrawingPage(null);
      setCurrentStrokePoints([]);
      return;
    }

    const newStroke: AnnotationStroke = {
      id: `stroke-${Date.now()}`,
      pageNumber: drawingPage,
      tool:
        activeTool === 'highlighter' ? 'highlighter' : activeTool === 'eraser' ? 'eraser' : 'pen',
      color: activeTool === 'highlighter' ? highlighterColor : penColor,
      size: activeTool === 'highlighter' ? 18 : penSize,
      opacity: activeTool === 'highlighter' ? 0.4 : 1,
      points: currentStrokePoints,
      createdAt: Date.now(),
    };

    onSendIntent({ type: 'add_stroke', stroke: newStroke });
    setIsDrawing(false);
    setDrawingPage(null);
    setCurrentStrokePoints([]);
  };

  // 4. Thao tác chèn khoảng trống (Mô hình A)
  const handleInsertGap = (pageNumber: number, splitYRatio: number) => {
    const newGap: PageGap = {
      id: `gap-${Date.now()}`,
      pageNumber,
      splitYRatio,
      gapHeightPx: 260, // Chiều cao mặc định vừa đủ viết 4-5 dòng lời giải
      pattern: gapPattern,
    };

    onSendIntent({ type: 'insert_gap', gap: newGap });
    setActiveTool('pen'); // Tự động chuyển về bút để GV viết bài giải ngay!
    setHoverGap(null);
  };

  // 5. Thao tác xóa nét đã chọn bằng công cụ Tẩy vùng
  const handleRemoveStrokes = (strokeIds: string[], pageNumber: number) => {
    onSendIntent({
      type: 'remove_strokes',
      strokeIds,
      pageNumber,
    });
  };

  // 6. Laser pointer
  const handleLaserPointer = (pageNumber: number, x: number, y: number, visible: boolean) => {
    onSendIntent({
      type: 'sync_view',
      pointer: { pageNumber, x, y, visible },
    });
  };

  // Cuộn mượt tới một trang bất kỳ
  const scrollToPage = (pageNumber: number) => {
    const el = document.getElementById(`page-container-${pageNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none overflow-hidden relative font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header Toolbar Chính */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0 shadow-md">
        {/* Left: Tên tài liệu & Nút Mở file */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide truncate max-w-sm">
                {documentInfo?.title || 'Chưa mở tài liệu'}
              </h1>
              <span className="text-[11px] font-semibold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                {totalPages} trang
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Chiếu & Chữa bài (Mô hình A: Cắt dãn khoảng trống)
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow flex items-center gap-1.5"
            >
              <span>📁</span>
              <span>Mở file PDF / Word</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleDocument}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition flex items-center gap-1.5"
              title="Nạp đề thi mẫu Toán học 2 trang để chữa bài ngay"
            >
              <span>📝</span>
              <span>Đề mẫu</span>
            </button>
          </div>
        </div>

        {/* Center: Công cụ vẽ, viết & chèn khoảng trống */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTool === 'pen'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>✏️</span>
            <span>Bút viết</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>🖍️</span>
            <span>Dạ quang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('gap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTool === 'gap'
                ? 'bg-emerald-600 text-white shadow animate-pulse'
                : 'text-emerald-300 hover:bg-slate-800'
            }`}
            title="Bấm vào trang để chèn khoảng trống sửa bài, đề dưới sẽ dạt xuống"
          >
            <span>✂️</span>
            <span>Thêm chỗ sửa bài</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              activeTool === 'eraser'
                ? 'bg-rose-700 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Kéo chuột quét chọn vùng để xóa chữ viết & vệt dạ quang trong vùng đó"
          >
            <span>🧹</span>
            <span>Tẩy vùng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('laser')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
              activeTool === 'laser'
                ? 'bg-rose-700 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>🔴</span>
            <span>Laser</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-700 mx-1"></div>

          {/* Nút Hoàn tác / Undo */}
          <button
            type="button"
            onClick={() => onSendIntent({ type: 'undo_stroke' })}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Hoàn tác nét vẽ vừa viết"
          >
            ↩️
          </button>
        </div>

        {/* Right: Công tắc Chiếu Học Sinh & Zoom */}
        <div className="flex items-center gap-3">
          {/* CÔNG TẮC CHIẾU XUỐNG HỌC SINH (Yêu cầu 2) */}
          <button
            type="button"
            onClick={() => onSendIntent({ type: 'toggle_student_broadcast' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border cursor-pointer ${
              state.isStudentBroadcastEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
            }`}
            title={
              state.isStudentBroadcastEnabled
                ? 'Đang phát sóng tài liệu xuống màn hình học sinh. Bấm để tạm dừng.'
                : 'Đang tạm dừng phát sóng. Bấm để phát sóng xuống học sinh.'
            }
          >
            <span className="w-2 h-2 rounded-full animate-pulse bg-white"></span>
            <span>
              {state.isStudentBroadcastEnabled ? '📡 Chiếu HS: BẬT' : '⏸️ Tạm dừng chiếu HS'}
            </span>
          </button>

          {/* Phóng to / Thu nhỏ */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
              className="px-1 text-slate-300 hover:text-white cursor-pointer"
              title="Thu nhỏ"
            >
              -
            </button>
            <span className="w-10 text-center font-bold text-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.8, Number((z + 0.1).toFixed(1))))}
              className="px-1 text-slate-300 hover:text-white cursor-pointer"
              title="Phóng to"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Sub-toolbar: Tùy chỉnh màu sắc & hoa văn */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-xs shrink-0">
        <div className="flex items-center gap-4">
          {activeTool === 'pen' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Màu bút:</span>
              {[
                { label: 'Đỏ', hex: '#DC2626' },
                { label: 'Xanh dương', hex: '#2563EB' },
                { label: 'Xanh lá', hex: '#16A34A' },
                { label: 'Đen', hex: '#0F172A' },
                { label: 'Tím', hex: '#9333EA' },
              ].map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setPenColor(c.hex)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                    penColor === c.hex
                      ? 'border-white scale-125 shadow-md'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}

              <span className="text-slate-400 ml-3">Cỡ nét:</span>
              {[2, 3, 5].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPenSize(sz)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    penSize === sz
                      ? 'bg-slate-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          )}

          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Màu dạ quang:</span>
              {[
                { label: 'Vàng neon', hex: '#FDE047' },
                { label: 'Xanh neon', hex: '#86EFAC' },
                { label: 'Hồng neon', hex: '#F472B6' },
                { label: 'Cam neon', hex: '#FDBA74' },
              ].map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setHighlighterColor(c.hex)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                    highlighterColor === c.hex
                      ? 'border-white scale-125 shadow-md'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          )}

          {activeTool === 'gap' && (
            <div className="flex items-center gap-3 bg-emerald-950/70 px-3 py-1 rounded-lg border border-emerald-800">
              <span className="text-emerald-300 font-semibold">
                👉 Click vào bất kỳ vị trí nào trên đề bài để chèn chỗ sửa bài:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Hoa văn:</span>
                <button
                  type="button"
                  onClick={() => setGapPattern('grid')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    gapPattern === 'grid' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300'
                  }`}
                >
                  📐 Ô ly tập
                </button>
                <button
                  type="button"
                  onClick={() => setGapPattern('lines')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    gapPattern === 'lines'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  📝 Dòng kẻ
                </button>
                <button
                  type="button"
                  onClick={() => setGapPattern('blank')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    gapPattern === 'blank'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  ⬜ Trắng
                </button>
              </div>
            </div>
          )}

          {activeTool === 'eraser' && (
            <div className="flex items-center gap-2 bg-rose-950/70 px-3 py-1 rounded-lg border border-rose-800 text-rose-300">
              <span className="font-semibold">
                🧹 Kéo chuột quét một vùng hình chữ nhật để xóa toàn bộ chữ viết & dạ quang trong
                vùng đó (hoặc click vào nét cần xóa)
              </span>
            </div>
          )}
        </div>

        {/* Thanh Nhảy Trang Nhanh (Yêu cầu 3) */}
        <div className="flex items-center gap-1 text-slate-300 font-semibold">
          <span className="text-slate-400 mr-1">Nhảy nhanh:</span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
            <button
              key={pNum}
              type="button"
              onClick={() => scrollToPage(pNum)}
              className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-blue-600 hover:text-white transition cursor-pointer text-[11px]"
            >
              Trang {pNum}
            </button>
          ))}
        </div>
      </div>

      {/* Banner Loading khi tải và chuyển đổi file */}
      {isLoadingDocument && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white font-bold text-base">{loadingStatus}</div>
          <div className="text-slate-400 text-xs">Vui lòng đợi giây lát...</div>
        </div>
      )}

      {/* Vùng Cuộn Liên Tục TẤT CẢ CÁC TRANG (Yêu cầu 3 & 4) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 py-8 px-4 flex flex-col items-center relative"
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => {
          const pageGaps = state.gaps.filter(g => g.pageNumber === pNum);
          const pageStrokes = state.strokes.filter(s => s.pageNumber === pNum);
          const pageImg = pageImages[pNum - 1];

          return (
            <SinglePageCanvas
              key={pNum}
              pageNumber={pNum}
              totalPages={totalPages}
              pageImageUrl={pageImg}
              gaps={pageGaps}
              strokes={pageStrokes}
              activeTool={activeTool}
              penColor={penColor}
              penSize={penSize}
              highlighterColor={highlighterColor}
              gapPattern={gapPattern}
              zoom={zoom}
              isDrawing={isDrawing}
              drawingPage={drawingPage}
              currentStrokePoints={currentStrokePoints}
              hoverGap={hoverGap}
              onSetHoverGap={setHoverGap}
              onStartDrawing={handleStartDrawing}
              onMoveDrawing={handleMoveDrawing}
              onEndDrawing={handleEndDrawing}
              onInsertGap={handleInsertGap}
              onUpdateGapHeight={(gapId, h) =>
                onSendIntent({ type: 'update_gap', gapId, gapHeightPx: h })
              }
              onUpdateGapPattern={(gapId, p) =>
                onSendIntent({ type: 'update_gap', gapId, gapHeightPx: 260, pattern: p })
              }
              onRemoveGap={gapId => onSendIntent({ type: 'remove_gap', gapId })}
              onClearStrokes={p => onSendIntent({ type: 'clear_page_strokes', pageNumber: p })}
              onRemoveStrokes={handleRemoveStrokes}
              onLaserPointer={handleLaserPointer}
            />
          );
        })}
      </div>
    </div>
  );
};
