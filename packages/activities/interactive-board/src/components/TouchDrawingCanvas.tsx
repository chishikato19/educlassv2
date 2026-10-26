import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface TouchDrawingCanvasProps {
  initialDataUrl?: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
  disabled?: boolean | undefined;
}

type ToolType = 'pen' | 'eraser';
type StrokeWidth = 3 | 6 | 12;

const COLORS = [
  { label: 'Đen', value: '#1E293B' },
  { label: 'Đỏ', value: '#EF4444' },
  { label: 'Xanh dương', value: '#2563EB' },
  { label: 'Xanh lá', value: '#10B981' },
];

export const TouchDrawingCanvas: React.FC<TouchDrawingCanvasProps> = ({
  initialDataUrl,
  onChange,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#1E293B');
  const [lineWidth, setLineWidth] = useState<StrokeWidth>(6);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialDataUrl));
  const [history, setHistory] = useState<string[]>(initialDataUrl ? [initialDataUrl] : []);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Khởi tạo kích thước canvas vừa vặn với container
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 320;
    const height = Math.floor(rect.height) || 280;

    // Lưu lại nội dung hiện tại trước khi đổi kích thước (nếu có)
    const currentData = canvas.toDataURL();
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Nếu có dữ liệu ban đầu
    const targetUrl = initialDataUrl || (hasDrawn ? currentData : null);
    if (targetUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = targetUrl;
    }
  }, [initialDataUrl, hasDrawn]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  // Lưu lịch sử để hỗ trợ Hoàn tác (Undo)
  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setHistory((prev) => [...prev.slice(-15), dataUrl]); // Giữ tối đa 15 bước gần nhất
    setHasDrawn(true);
    onChange(dataUrl);
  };

  // Lấy tọa độ chuẩn xác tương đối với canvas
  const getCanvasCoordinates = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (clientX: number, clientY: number) => {
    if (disabled) return;
    const pt = getCanvasCoordinates(clientX, clientY);
    if (!pt) return;

    isDrawingRef.current = true;
    lastPointRef.current = pt;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (tool === 'eraser' ? lineWidth * 2.5 : lineWidth) / 2, 0, Math.PI * 2);
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.fill();
    }
  };

  const drawMove = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || disabled) return;
    const pt = getCanvasCoordinates(clientX, clientY);
    const last = lastPointRef.current;
    if (!pt || !last) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 2.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }

    ctx.stroke();
    lastPointRef.current = pt;
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveStateToHistory();
  };

  // Hoàn tác bước vẽ trước (Undo)
  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear();
      return;
    }

    const nextHistory = history.slice(0, -1);
    const prevDataUrl = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !prevDataUrl) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(prevDataUrl);
    };
    img.src = prevDataUrl;
  };

  // Xóa sạch toàn bộ nét vẽ
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHasDrawn(false);
    onChange(undefined);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden select-none">
      {/* Thanh công cụ vẽ (Vùng bấm tối thiểu 48px) */}
      <div className="flex items-center justify-between p-2.5 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
        {/* Bộ chọn Công cụ: Bút / Tẩy */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
              tool === 'pen'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Bút vẽ"
          >
            <span>✏️</span> Bút
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
              tool === 'eraser'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Tẩy xóa"
          >
            <span>🧹</span> Tẩy
          </button>
        </div>

        {/* Bộ chọn Màu sắc (khi dùng Bút) */}
        {tool === 'pen' && (
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`min-h-[44px] min-w-[44px] w-9 h-9 rounded-full border-2 transition transform ${
                  color === c.value ? 'scale-110 border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-white'
                }`}
                aria-label={`Chọn màu ${c.label}`}
              />
            ))}
          </div>
        )}

        {/* Bộ chọn Cỡ nét: 3px, 6px, 12px */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          {[3, 6, 12].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setLineWidth(size as StrokeWidth)}
              className={`min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold flex items-center justify-center transition ${
                lineWidth === size
                  ? 'bg-blue-100 text-blue-700 font-extrabold border border-blue-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className="rounded-full bg-current"
                style={{ width: `${size + 2}px`, height: `${size + 2}px` }}
              />
            </button>
          ))}
        </div>

        {/* Nút Hoàn tác & Xóa sạch */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-xl text-sm font-medium transition flex items-center gap-1"
            title="Hoàn tác nét vẽ trước"
          >
            <span>↩️</span> Hoàn tác
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 text-slate-700 rounded-xl text-sm font-medium transition flex items-center gap-1"
            title="Xóa trắng bảng vẽ"
          >
            <span>🗑️</span> Xóa hết
          </button>
        </div>
      </div>

      {/* Vùng vẽ Canvas cảm ứng (Touch / Pointer) */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-white cursor-crosshair overflow-hidden touch-none"
        style={{ minHeight: '260px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
          onMouseMove={(e) => drawMove(e.clientX, e.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              const touch = e.touches[0]!;
              startDrawing(touch.clientX, touch.clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 1) {
              const touch = e.touches[0]!;
              drawMove(touch.clientX, touch.clientY);
            }
          }}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="w-full h-full block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
            <span className="text-3xl mb-1">✍️</span>
            <span className="text-xs font-medium">Vẽ tay trực tiếp bằng ngón tay hoặc bút Stylus tại đây</span>
          </div>
        )}
      </div>
    </div>
  );
};
