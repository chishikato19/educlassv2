import React, { useState, useRef, useEffect } from 'react';
import type {
  ObjectCameraState,
  ObjectCameraTeacherIntent,
  ObjectCameraPhoto,
  AnnotationToolType,
  CropRect,
  DocumentImageFilter,
} from '../object-camera-schemas.js';

export interface ParticipantInfo {
  id: string;
  displayName: string;
  isOnline?: boolean;
}

export interface ObjectCameraTeacherPanelProps {
  state: ObjectCameraState;
  onSendIntent: (intent: ObjectCameraTeacherIntent) => void;
  participants?: ParticipantInfo[];
}

export const ObjectCameraTeacherPanel: React.FC<ObjectCameraTeacherPanelProps> = ({
  state,
  onSendIntent,
  participants = [],
}) => {
  // Công cụ vẽ & chú thích
  const [activeTool, setActiveTool] = useState<AnnotationToolType | 'pan' | 'crop'>('pen');
  const [penColor, setPenColor] = useState<string>('#EF4444'); // Mặc định mực đỏ sửa bài
  const [penSize, setPenSize] = useState<number>(4);
  const [highlighterColor] = useState<string>('#FBBF24'); // Vàng neon

  // Mục tiêu đang tương tác khi ở chế độ so sánh: 'primary' (ảnh 1) hoặc 'secondary' (ảnh 2)
  const [activeTarget, setActiveTarget] = useState<'primary' | 'secondary'>('primary');

  // Trạng thái vẽ
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Trạng thái kéo rê (Pan)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Trạng thái cắt ảnh (Crop)
  const [cropSelection, setCropSelection] = useState<CropRect | null>(null);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal hiển thị QR kết nối điện thoại
  const [showQrModal, setShowQrModal] = useState(false);
  const [connectInfo, setConnectInfo] = useState<{
    lanIp: string;
    port: string;
    snapUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [expNotice, setExpNotice] = useState<string | null>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRefPrimary = useRef<HTMLCanvasElement>(null);
  const canvasRefSecondary = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePhoto = state.photos.find((p) => p.id === state.activePhotoId) || null;
  const comparePhoto = state.photos.find((p) => p.id === state.comparePhotoId) || null;

  // Lấy danh sách nét vẽ cho từng ảnh
  const annotationsPrimary = state.annotations.filter(
    (a) => a.photoId === (activePhoto?.id || '')
  );
  const annotationsSecondary = state.annotations.filter(
    (a) => a.photoId === (comparePhoto?.id || '')
  );

  // Helper lấy viewport riêng cho từng slot (Ảnh 1 hay Ảnh 2)
  const getSlotViewport = (slot: 'primary' | 'secondary') => {
    return slot === 'secondary'
      ? (state.compareViewport || state.viewport)
      : state.viewport;
  };

  // Viewport của khung đang được chọn chỉnh sửa
  const currentViewport = getSlotViewport(activeTarget);

  // Lấy thông tin kết nối LAN và mã QR offline sẵn ngay khi có token
  useEffect(() => {
    if (state.uploadToken) {
      fetch(`/api/object-camera/connect-info?token=${encodeURIComponent(state.uploadToken)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ok) {
            setConnectInfo(data);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi lấy thông tin kết nối LAN:', err);
        });
    }
  }, [state.uploadToken]);

  // Link kết nối cho điện thoại của giáo viên (từ endpoint LAN)
  const captureUrl = connectInfo?.snapUrl || '';

  // Tự động chọn ảnh đầu tiên nếu có ảnh nhưng chưa chọn
  useEffect(() => {
    if (!state.activePhotoId && state.photos.length > 0 && state.photos[0]) {
      onSendIntent({
        type: 'SELECT_PHOTO',
        photoId: state.photos[0].id,
      });
    }
  }, [state.activePhotoId, state.photos, onSendIntent]);

  // Hàm render 1 bức ảnh lên canvas tương ứng
  const renderCanvasPhoto = (
    canvas: HTMLCanvasElement | null,
    photo: ObjectCameraPhoto | null,
    annotations: typeof state.annotations,
    viewport: typeof state.viewport,
    isCurrentActiveSlot: boolean
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
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Áp dụng bộ lọc tài liệu nếu có
      if (viewport.filter === 'high_contrast') {
        ctx.filter = 'contrast(1.6) brightness(1.1)';
      } else if (viewport.filter === 'black_white') {
        ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.05)';
      } else {
        ctx.filter = 'none';
      }

      // Tâm xoay và dịch chuyển riêng của slot này
      const centerX = canvas.width / 2 + viewport.panX;
      const centerY = canvas.height / 2 + viewport.panY;
      ctx.translate(centerX, centerY);
      ctx.rotate((viewport.rotation * Math.PI) / 180);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Tính kích thước vẽ phù hợp tỉ lệ ảnh (tối đa diện tích khung nhìn)
      const scale = Math.min((canvas.width * 0.98) / img.width, (canvas.height * 0.98) / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = -drawWidth / 2;
      const drawY = -drawHeight / 2;

      // Xử lý vẽ có hoặc không có Cắt (Crop)
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

      ctx.filter = 'none'; // Bỏ filter cho nét vẽ

      // Vẽ các nét vẽ đã lưu
      const drawStrokeList = [...annotations];
      if (isCurrentActiveSlot && isDrawing && currentPoints.length > 0) {
        drawStrokeList.push({
          id: 'temp-stroke',
          photoId: photo.id,
          tool: activeTool as AnnotationToolType,
          color: activeTool === 'highlighter' ? highlighterColor : penColor,
          size: activeTool === 'highlighter' ? 16 : penSize,
          opacity: activeTool === 'highlighter' ? 0.45 : 1,
          points: currentPoints,
          createdAt: Date.now(),
        });
      }

      for (const stroke of drawStrokeList) {
        if (!stroke.points || stroke.points.length === 0) continue;

        ctx.save();
        ctx.globalAlpha = stroke.opacity;

        if (stroke.tool.startsWith('stamp_')) {
          const pt = stroke.points[0];
          if (!pt) continue;
          const stampX = drawX + pt.x * drawWidth;
          const stampY = drawY + pt.y * drawHeight;

          ctx.font = 'bold 36px sans-serif';
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

      // Vẽ khung Cắt nếu đang ở chế độ Crop trên slot này
      if (isCurrentActiveSlot && activeTool === 'crop' && cropSelection) {
        ctx.save();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';

        const selX = drawX + cropSelection.x * drawWidth;
        const selY = drawY + cropSelection.y * drawHeight;
        const selW = cropSelection.width * drawWidth;
        const selH = cropSelection.height * drawHeight;

        ctx.fillRect(selX, selY, selW, selH);
        ctx.strokeRect(selX, selY, selW, selH);
        ctx.restore();
      }

      ctx.restore();
    };
  };

  // Lắng nghe thay đổi kích thước cửa sổ / toàn màn hình để vẽ lại Canvas vừa khít
  useEffect(() => {
    const handleResize = () => {
      setResizeTick((prev) => prev + 1);
    };

    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(stageRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Render Canvas chính
  useEffect(() => {
    renderCanvasPhoto(
      canvasRefPrimary.current,
      activePhoto,
      annotationsPrimary,
      state.viewport,
      activeTarget === 'primary'
    );
  }, [
    activePhoto,
    annotationsPrimary,
    state.viewport,
    isDrawing,
    currentPoints,
    activeTool,
    penColor,
    penSize,
    highlighterColor,
    cropSelection,
    activeTarget,
    resizeTick,
  ]);

  // Render Canvas so sánh (nếu có)
  useEffect(() => {
    if (state.displayMode !== 'single') {
      renderCanvasPhoto(
        canvasRefSecondary.current,
        comparePhoto,
        annotationsSecondary,
        state.compareViewport || state.viewport,
        activeTarget === 'secondary'
      );
    }
  }, [
    comparePhoto,
    annotationsSecondary,
    state.compareViewport,
    state.viewport,
    isDrawing,
    currentPoints,
    activeTool,
    penColor,
    penSize,
    highlighterColor,
    cropSelection,
    activeTarget,
    state.displayMode,
    resizeTick,
  ]);

  // Xử lý chuyển đổi tọa độ chuột sang tỉ lệ ảnh (0..1)
  const getNormalizedPoint = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    targetPhoto: ObjectCameraPhoto | null,
    viewport: typeof state.viewport
  ) => {
    if (!canvas || !targetPhoto) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = canvas.width / 2 + viewport.panX;
    const centerY = canvas.height / 2 + viewport.panY;

    const dx = (mouseX - centerX) / viewport.zoom;
    const dy = (mouseY - centerY) / viewport.zoom;

    const rad = (-viewport.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

    const scale = Math.min((canvas.width * 0.94) / targetPhoto.width, (canvas.height * 0.94) / targetPhoto.height);
    const drawWidth = targetPhoto.width * scale;
    const drawHeight = targetPhoto.height * scale;

    const normX = (rx + drawWidth / 2) / drawWidth;
    const normY = (ry + drawHeight / 2) / drawHeight;

    return {
      x: Math.max(0, Math.min(1, normX)),
      y: Math.max(0, Math.min(1, normY)),
    };
  };

  // Thao tác chuột chung cho cả 2 canvas
  const handleCanvasMouseDown = (
    e: React.MouseEvent<HTMLCanvasElement>,
    targetSlot: 'primary' | 'secondary'
  ) => {
    setActiveTarget(targetSlot);
    const currentPhoto = targetSlot === 'primary' ? activePhoto : comparePhoto;
    const canvas = targetSlot === 'primary' ? canvasRefPrimary.current : canvasRefSecondary.current;
    const slotViewport = getSlotViewport(targetSlot);

    if (!currentPhoto) return;

    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - slotViewport.panX, y: e.clientY - slotViewport.panY });
      return;
    }

    const normPt = getNormalizedPoint(e, canvas, currentPhoto, slotViewport);
    if (!normPt) return;

    if (activeTool === 'crop') {
      setIsCropDragging(true);
      setCropStart(normPt);
      setCropSelection({ x: normPt.x, y: normPt.y, width: 0.05, height: 0.05 });
      return;
    }

    if (activeTool.startsWith('stamp_')) {
      onSendIntent({
        type: 'ADD_STROKE',
        stroke: {
          id: `stroke-${Date.now()}`,
          photoId: currentPhoto.id,
          tool: activeTool as AnnotationToolType,
          color: activeTool === 'stamp_check' ? '#10B981' : activeTool === 'stamp_cross' ? '#EF4444' : '#F59E0B',
          size: 32,
          opacity: 1,
          points: [normPt],
          createdAt: Date.now(),
        },
      });
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentPoints([normPt]);
    }
  };

  const handleCanvasMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement>,
    targetSlot: 'primary' | 'secondary'
  ) => {
    if (isPanning) {
      const nextPanX = e.clientX - panStart.x;
      const nextPanY = e.clientY - panStart.y;
      onSendIntent({
        type: 'UPDATE_VIEWPORT',
        viewport: { panX: nextPanX, panY: nextPanY },
        target: targetSlot,
      });
      return;
    }

    const currentPhoto = targetSlot === 'primary' ? activePhoto : comparePhoto;
    const canvas = targetSlot === 'primary' ? canvasRefPrimary.current : canvasRefSecondary.current;
    const slotViewport = getSlotViewport(targetSlot);

    if (isCropDragging && cropStart) {
      const normPt = getNormalizedPoint(e, canvas, currentPhoto, slotViewport);
      if (!normPt) return;
      const minX = Math.min(cropStart.x, normPt.x);
      const minY = Math.min(cropStart.y, normPt.y);
      const width = Math.max(0.05, Math.abs(normPt.x - cropStart.x));
      const height = Math.max(0.05, Math.abs(normPt.y - cropStart.y));
      setCropSelection({ x: minX, y: minY, width, height });
      return;
    }

    if (isDrawing) {
      const normPt = getNormalizedPoint(e, canvas, currentPhoto, slotViewport);
      if (normPt) {
        setCurrentPoints((prev) => [...prev, normPt]);
      }
    }
  };

  const handleCanvasMouseUp = (targetSlot: 'primary' | 'secondary') => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isCropDragging) {
      setIsCropDragging(false);
      return;
    }

    const currentPhoto = targetSlot === 'primary' ? activePhoto : comparePhoto;
    if (isDrawing && currentPhoto && currentPoints.length > 0) {
      setIsDrawing(false);
      onSendIntent({
        type: 'ADD_STROKE',
        stroke: {
          id: `stroke-${Date.now()}`,
          photoId: currentPhoto.id,
          tool: activeTool as AnnotationToolType,
          color: activeTool === 'highlighter' ? highlighterColor : penColor,
          size: activeTool === 'highlighter' ? 16 : penSize,
          opacity: activeTool === 'highlighter' ? 0.45 : 1,
          points: currentPoints,
          createdAt: Date.now(),
        },
      });
      setCurrentPoints([]);
    }
  };

  // Lăn chuột để zoom độc lập cho từng ảnh
  const handleWheel = (e: React.WheelEvent, targetSlot: 'primary' | 'secondary') => {
    e.preventDefault();
    setActiveTarget(targetSlot);
    const slotViewport = getSlotViewport(targetSlot);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const nextZoom = Math.max(0.2, Math.min(5, Number((slotViewport.zoom * zoomFactor).toFixed(2))));
    onSendIntent({
      type: 'UPDATE_VIEWPORT',
      viewport: { zoom: nextZoom },
      target: targetSlot,
    });
  };

  // Xử lý xóa 1 ảnh: xóa trong state và xóa vĩnh viễn file vật lý trên máy
  const handleDeletePhoto = (photo: ObjectCameraPhoto) => {
    // 1. Gửi intent xóa trong state
    onSendIntent({ type: 'DELETE_PHOTO', photoId: photo.id });

    // 2. Nếu là file ảnh tạm trên server, gọi API xóa ngay lập tức khỏi ổ đĩa máy tính
    if (photo.url && photo.url.includes('/api/object-camera/files/')) {
      fetch('/api/object-camera/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: photo.url }),
      }).catch((err) => {
        console.warn('Lỗi khi xóa file tạm vật lý:', err);
      });
    }
  };

  // Xử lý dọn sạch tất cả ảnh tạm chưa ghim: xóa trong state và dọn sạch ổ đĩa
  const handleClearAllPhotos = () => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn dọn sạch tất cả ảnh tạm chưa được ghim?')) {
      return;
    }

    // Lấy danh sách URL các ảnh đã ghim cần giữ lại
    const keepUrls = state.photos.filter((p) => p.isPinned).map((p) => p.url);

    // 1. Gửi intent xóa trong state
    onSendIntent({ type: 'CLEAR_ALL_PHOTOS' });

    // 2. Gọi API dọn sạch các file ảnh tạm chưa ghim trên ổ đĩa máy tính
    fetch('/api/object-camera/cleanup-unpinned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepUrls }),
    }).catch((err) => {
      console.warn('Lỗi khi dọn rác file tạm:', err);
    });
  };

  // Xử lý nạp danh sách file ảnh vào hệ thống (hỗ trợ nhiều ảnh đồng thời)
  const processFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    fileList.forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        if (!base64Url) return;

        // Nếu có uploadToken, upload lên server để lưu vào file tạm quản lý thống nhất và tiết kiệm băng thông WS
        if (state.uploadToken) {
          try {
            const res = await fetch('/api/object-camera/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: state.uploadToken,
                base64: base64Url,
                filename: file.name.replace(/\.[^/.]+$/, ''),
                studentId: selectedStudentId || undefined,
                studentName: participants.find((p) => p.id === selectedStudentId)?.displayName,
              }),
            });
            if (res.ok) {
              return;
            }
          } catch (uploadErr) {
            console.warn('Không thể upload ảnh qua API, chuyển sang nạp trực tiếp:', uploadErr);
          }
        }

        // Fallback nạp ảnh cục bộ nếu không upload được
        const img = new Image();
        img.onload = () => {
          const newPhoto: ObjectCameraPhoto = {
            id: `photo-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: base64Url,
            width: img.width,
            height: img.height,
            capturedAt: Date.now() + index,
            studentId: selectedStudentId || undefined,
            studentName: participants.find((p) => p.id === selectedStudentId)?.displayName,
            isPinned: false,
          };

          onSendIntent({
            type: 'ADD_PHOTO',
            photo: newPhoto,
          });
        };
        img.src = base64Url;
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload file từ máy tính qua File Dialog
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Kéo & Thả ảnh trực tiếp từ File Explorer vào giao diện
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Áp dụng Cắt ảnh cho khung đang chọn
  const applyCrop = () => {
    if (!cropSelection) return;
    onSendIntent({
      type: 'UPDATE_VIEWPORT',
      viewport: { crop: cropSelection },
      target: activeTarget,
    });
    setActiveTool('pen');
    setCropSelection(null);
  };

  // Hủy Cắt ảnh cho khung đang chọn
  const resetCrop = () => {
    onSendIntent({
      type: 'UPDATE_VIEWPORT',
      viewport: { crop: null },
      target: activeTarget,
    });
    setCropSelection(null);
  };

  // Thưởng EXP cho học sinh
  const handleAwardExp = (expAmount: number) => {
    const activeCurrentPhoto = activeTarget === 'primary' ? activePhoto : (comparePhoto || activePhoto);
    const targetStudentId = activeCurrentPhoto?.studentId || selectedStudentId;
    const targetStudentName =
      activeCurrentPhoto?.studentName ||
      participants.find((p) => p.id === targetStudentId)?.displayName ||
      'Học sinh';

    if (!targetStudentId) {
      setExpNotice('Vui lòng chọn học sinh nhận thưởng!');
      setTimeout(() => setExpNotice(null), 3000);
      return;
    }

    onSendIntent({
      type: 'AWARD_EXP',
      studentId: targetStudentId,
      studentName: targetStudentName,
      exp: expAmount,
      reason: 'Khen ngợi bài làm xuất sắc trên Camera vật thể',
    });

    setExpNotice(`🎉 Đã thưởng +${expAmount} EXP cho bạn ${targetStudentName}!`);
    setTimeout(() => setExpNotice(null), 3000);
  };

  // Xuất ảnh kèm nét vẽ về máy tính
  const exportAnnotatedImage = () => {
    const canvas = activeTarget === 'primary' ? canvasRefPrimary.current : (canvasRefSecondary.current || canvasRefPrimary.current);
    const photoToExport = activeTarget === 'primary' ? activePhoto : (comparePhoto || activePhoto);
    if (!canvas || !photoToExport) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `chua_bai_${photoToExport.name}_${Date.now()}.png`;
    a.click();
  };

  // Xử lý click thumbnail trên Khay ảnh
  const handleThumbnailClick = (photoId: string) => {
    if (state.displayMode === 'single') {
      onSendIntent({ type: 'SELECT_PHOTO', photoId });
    } else {
      // Trong chế độ so sánh: gán vào khung đang được chọn
      if (activeTarget === 'primary') {
        onSendIntent({ type: 'SELECT_PHOTO', photoId });
      } else {
        onSendIntent({ type: 'SELECT_COMPARE_PHOTO', photoId });
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full min-h-0 bg-slate-900 text-slate-100 select-none overflow-hidden relative"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. THANH ĐIỀU KHIỂN TRÊN CÙNG (TOP HEADER) */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📷</span>
          <div>
            <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
              Camera vật thể
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">
                Soi bài & Chấm bài trực tiếp
              </span>
            </h2>
          </div>
        </div>

        {/* Nút thao tác chính & Công tắc Chiếu HS */}
        <div className="flex items-center gap-2">
          {/* CÔNG TẮC CHIẾU XUỐNG MÀN HÌNH HỌC SINH */}
          <button
            onClick={() => onSendIntent({ type: 'TOGGLE_STUDENT_BROADCAST' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border ${
              state.isStudentBroadcastEnabled
                ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-400'
            }`}
            title="Bật/Tắt phát sóng màn hình và nét bút xuống học sinh"
          >
            <span>{state.isStudentBroadcastEnabled ? '📡' : '⏸️'}</span>
            <span>{state.isStudentBroadcastEnabled ? 'Chiếu HS: BẬT' : 'Tạm dừng chiếu HS'}</span>
          </button>

          {/* Nút Kết nối điện thoại / Quét QR */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm"
            title="Mở mã QR cho điện thoại giáo viên chụp"
          >
            <span>📱</span> Quét mã chụp ảnh
            {state.isCaptureLocked && (
              <span className="text-[10px] px-1 py-0.2 bg-red-800 text-red-200 rounded">Khóa</span>
            )}
          </button>

          {/* Nút Thêm ảnh từ máy tính */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            title="Chọn file ảnh từ máy tính (JPG, PNG) để đưa vào khay ảnh"
          >
            <span>📁</span> Thêm ảnh từ máy
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* Nút Xuất ảnh đã chữa */}
          {activePhoto && (
            <button
              onClick={exportAnnotatedImage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition"
              title="Lưu ảnh bài chữa về máy"
            >
              <span>💾</span> Lưu ảnh
            </button>
          )}

          {/* Nút Dọn sạch ảnh tạm */}
          {state.photos.length > 0 && (
            <button
              onClick={handleClearAllPhotos}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-medium transition border border-red-700/50"
              title="Xóa nhanh và dọn sạch tất cả ảnh tạm chưa ghim khỏi máy tính"
            >
              <span>🗑️</span> Dọn rác
            </button>
          )}
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ VẼ & CHẾ ĐỘ SO SÁNH (SUB-TOOLBAR) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-850 border-b border-slate-700/80 text-xs overflow-x-auto gap-4 shrink-0">
        {/* Nhóm công cụ vẽ */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Vẽ chữa:</span>

          <button
            onClick={() => setActiveTool('pen')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
              activeTool === 'pen' ? 'bg-red-600 text-white shadow' : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
            }`}
          >
            ✏️ Bút mực
          </button>

          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 ml-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              {['#EF4444', '#3B82F6', '#10B981', '#111827'].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border ${penColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="range"
                min="2"
                max="12"
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="w-12 h-1 ml-1 accent-red-500 cursor-pointer"
                title={`Cỡ nét: ${penSize}px`}
              />
            </div>
          )}

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
              activeTool === 'highlighter' ? 'bg-amber-500 text-slate-900 shadow font-bold' : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🖍️ Dạ quang
          </button>

          {/* Con dấu sư phạm */}
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            <button
              onClick={() => setActiveTool('stamp_check')}
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                activeTool === 'stamp_check' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-slate-700'
              }`}
            >
              ✓ Đúng
            </button>
            <button
              onClick={() => setActiveTool('stamp_cross')}
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                activeTool === 'stamp_cross' ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-slate-700'
              }`}
            >
              ✗ Sai
            </button>
            <button
              onClick={() => setActiveTool('stamp_star')}
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                activeTool === 'stamp_star' ? 'bg-amber-500 text-slate-900' : 'text-amber-400 hover:bg-slate-700'
              }`}
            >
              ★ Khen
            </button>
          </div>

          <button
            onClick={() => onSendIntent({ type: 'UNDO_STROKE', photoId: activeTarget === 'primary' ? activePhoto?.id : comparePhoto?.id })}
            className="p-1 px-1.5 rounded hover:bg-slate-700 text-slate-300 text-xs ml-1"
            title="Hoàn tác nét vẽ (Undo)"
          >
            ↩ Hoàn tác
          </button>
          <button
            onClick={() => onSendIntent({ type: 'CLEAR_ANNOTATIONS', photoId: activeTarget === 'primary' ? activePhoto?.id : comparePhoto?.id })}
            className="p-1 px-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 text-xs"
            title="Xóa hết nét vẽ trên ảnh này"
          >
            🧹 Xóa nét
          </button>
        </div>

        {/* Nhóm CHẾ ĐỘ HIỂN THỊ & SO SÁNH 2 ẢNH */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 px-1 rounded-lg border border-slate-700">
          <span className="text-[11px] text-slate-400 font-semibold uppercase mr-1">Chế độ:</span>
          <button
            onClick={() => onSendIntent({ type: 'SET_DISPLAY_MODE', mode: 'single' })}
            className={`px-2 py-0.5 rounded text-xs font-bold transition ${
              state.displayMode === 'single' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Chiếu 1 ảnh đơn lớn ở giữa"
          >
            🖼️ 1 Ảnh
          </button>
          <button
            onClick={() => onSendIntent({ type: 'SET_DISPLAY_MODE', mode: 'compare_vertical' })}
            className={`px-2 py-0.5 rounded text-xs font-bold transition ${
              state.displayMode === 'compare_vertical' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="So sánh 2 ảnh chia đôi theo chiều dọc (Trái | Phải)"
          >
            ◫ So sánh Dọc
          </button>
          <button
            onClick={() => onSendIntent({ type: 'SET_DISPLAY_MODE', mode: 'compare_horizontal' })}
            className={`px-2 py-0.5 rounded text-xs font-bold transition ${
              state.displayMode === 'compare_horizontal' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="So sánh 2 ảnh chia đôi theo chiều ngang (Trên | Dưới)"
          >
            ⬓ So sánh Ngang
          </button>
        </div>

        {/* Nhóm CHỌN KHUNG ĐANG CHỈNH SỬA KHI SO SÁNH */}
        {state.displayMode !== 'single' && (
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 px-1.5 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Chỉnh:</span>
            <button
              onClick={() => setActiveTarget('primary')}
              className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                activeTarget === 'primary' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'
              }`}
              title="Đang điều khiển Phóng to / Xoay / Di chuyển cho Ảnh 1"
            >
              <span>1️⃣</span> <span>Ảnh 1</span>
            </button>
            <button
              onClick={() => setActiveTarget('secondary')}
              className={`px-2 py-0.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                activeTarget === 'secondary' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'
              }`}
              title="Đang điều khiển Phóng to / Xoay / Di chuyển cho Ảnh 2"
            >
              <span>2️⃣</span> <span>Ảnh 2</span>
            </button>
          </div>
        )}

        {/* Nhóm công cụ Xử lý ảnh (Xoay, Cắt, Lọc, Zoom) tác động lên khung đang chọn */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const nextRot = ((currentViewport.rotation + 90) % 360) as 0 | 90 | 180 | 270;
              onSendIntent({
                type: 'UPDATE_VIEWPORT',
                viewport: { rotation: nextRot },
                target: activeTarget,
              });
            }}
            className="p-1 px-2 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            title={`Xoay ảnh ${activeTarget === 'primary' ? '1' : '2'} thêm 90 độ`}
          >
            🔄 Xoay 90° ({currentViewport.rotation}°)
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'crop' ? 'pen' : 'crop')}
            className={`p-1 px-2 rounded text-xs font-medium transition ${
              activeTool === 'crop' ? 'bg-blue-600 text-white' : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200'
            }`}
          >
            ✂️ Cắt ảnh
          </button>

          {activeTool === 'crop' && (
            <div className="flex items-center gap-1 bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-700 text-xs">
              {cropSelection && (
                <button
                  onClick={applyCrop}
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                >
                  Xác nhận
                </button>
              )}
              {currentViewport.crop && (
                <button
                  onClick={resetCrop}
                  className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
                >
                  Gốc
                </button>
              )}
            </div>
          )}

          <select
            value={currentViewport.filter}
            onChange={(e) =>
              onSendIntent({
                type: 'UPDATE_VIEWPORT',
                viewport: { filter: e.target.value as DocumentImageFilter },
                target: activeTarget,
              })
            }
            className="bg-slate-800 text-xs text-slate-200 rounded px-1.5 py-1 border border-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="none">Lọc: Bình thường</option>
            <option value="high_contrast">Tăng tương phản (Rõ nét)</option>
            <option value="black_white">Trắng đen (Scan)</option>
          </select>

          {/* Zoom & Pan cho khung đang chọn */}
          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            <button
              onClick={() => setActiveTool(activeTool === 'pan' ? 'pen' : 'pan')}
              className={`p-0.5 px-1 rounded text-xs ${activeTool === 'pan' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
              title="Công cụ bàn tay để kéo di chuyển ảnh"
            >
              ✋ Kéo
            </button>
            <button
              onClick={() =>
                onSendIntent({
                  type: 'UPDATE_VIEWPORT',
                  viewport: { zoom: Math.max(0.2, Number((currentViewport.zoom - 0.2).toFixed(1))) },
                  target: activeTarget,
                })
              }
              className="px-1 hover:bg-slate-700 text-slate-300 font-bold"
              title="Thu nhỏ"
            >
              -
            </button>
            <span className="text-[11px] font-mono text-slate-300 min-w-8 text-center" title="Tỉ lệ phóng to">
              {Math.round(currentViewport.zoom * 100)}%
            </span>
            <button
              onClick={() =>
                onSendIntent({
                  type: 'UPDATE_VIEWPORT',
                  viewport: { zoom: Math.min(5, Number((currentViewport.zoom + 0.2).toFixed(1))) },
                  target: activeTarget,
                })
              }
              className="px-1 hover:bg-slate-700 text-slate-300 font-bold"
              title="Phóng to"
            >
              +
            </button>
            <button
              onClick={() => onSendIntent({ type: 'RESET_VIEWPORT', target: activeTarget })}
              className="px-1.5 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-[11px] font-bold"
              title="Khôi phục ảnh này vừa vặn toàn màn hình (Fit 100%)"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC CHIẾU HÌNH ẢNH Ở GIỮA (CENTRAL STAGE — CHIẾM TOÀN BỘ KHÔNG GIAN CÒN LẠI) */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 relative bg-slate-950 overflow-hidden flex"
      >
        {/* Lớp phủ trực quan khi kéo file ảnh thả vào */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-900/60 border-4 border-dashed border-blue-400 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm pointer-events-none">
            <span className="text-5xl mb-3 animate-bounce">📥</span>
            <span className="text-base font-bold">Thả ảnh vào đây để nạp vào khay ảnh</span>
          </div>
        )}
        {state.displayMode === 'single' ? (
          // Chế độ 1 ảnh đơn lớn ở giữa
          <div
            onClick={() => setActiveTarget('primary')}
            className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden"
          >
            {activePhoto ? (
              <canvas
                ref={canvasRefPrimary}
                onMouseDown={(e) => handleCanvasMouseDown(e, 'primary')}
                onMouseMove={(e) => handleCanvasMouseMove(e, 'primary')}
                onMouseUp={() => handleCanvasMouseUp('primary')}
                onWheel={(e) => handleWheel(e, 'primary')}
                className="w-full h-full block cursor-crosshair"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl mb-3 shadow-inner">
                  📷
                </div>
                <h3 className="text-base font-bold text-slate-200 mb-1">Chưa có ảnh nào được tải lên</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Bấm <strong className="text-emerald-400">"Quét mã chụp ảnh"</strong> trên điện thoại hoặc tải ảnh từ máy tính để bắt đầu chữa bài.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-md"
                  >
                    📱 Mở mã QR kết nối
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition"
                  >
                    📁 Chọn ảnh từ máy
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Chế độ So sánh 2 ảnh: Chia đôi dọc (Trái | Phải) hoặc Chia đôi ngang (Trên | Dưới)
          <div
            className={`flex-1 w-full h-full flex ${
              state.displayMode === 'compare_vertical' ? 'flex-row divide-x divide-slate-700' : 'flex-col divide-y divide-slate-700'
            }`}
          >
            {/* Khung 1 (Ảnh A) */}
            <div
              onClick={() => setActiveTarget('primary')}
              className={`flex-1 relative flex items-center justify-center overflow-hidden transition ${
                activeTarget === 'primary' ? 'ring-2 ring-blue-500/80 bg-slate-900/40' : 'bg-slate-950'
              }`}
            >
              <div className="absolute top-2 left-2 z-10 bg-slate-900/90 border border-slate-700 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                <span className="font-bold text-blue-400">Ảnh 1:</span>
                <span className="truncate max-w-[140px]">{activePhoto?.studentName || activePhoto?.name || 'Chưa chọn ảnh'}</span>
                {activeTarget === 'primary' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Đang tương tác ảnh này" />}
              </div>

              {activePhoto ? (
                <canvas
                  ref={canvasRefPrimary}
                  onMouseDown={(e) => handleCanvasMouseDown(e, 'primary')}
                  onMouseMove={(e) => handleCanvasMouseMove(e, 'primary')}
                  onMouseUp={() => handleCanvasMouseUp('primary')}
                  onWheel={(e) => handleWheel(e, 'primary')}
                  className="w-full h-full block cursor-crosshair"
                />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  <span>Bấm vào ảnh trên Khay ảnh để gán vào Khung 1</span>
                </div>
              )}
            </div>

            {/* Khung 2 (Ảnh B) */}
            <div
              onClick={() => setActiveTarget('secondary')}
              className={`flex-1 relative flex items-center justify-center overflow-hidden transition ${
                activeTarget === 'secondary' ? 'ring-2 ring-emerald-500/80 bg-slate-900/40' : 'bg-slate-950'
              }`}
            >
              <div className="absolute top-2 left-2 z-10 bg-slate-900/90 border border-slate-700 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow">
                <span className="font-bold text-emerald-400">Ảnh 2:</span>
                <span className="truncate max-w-[140px]">{comparePhoto?.studentName || comparePhoto?.name || 'Chưa chọn ảnh'}</span>
                {activeTarget === 'secondary' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Đang tương tác ảnh này" />}
              </div>

              {comparePhoto ? (
                <canvas
                  ref={canvasRefSecondary}
                  onMouseDown={(e) => handleCanvasMouseDown(e, 'secondary')}
                  onMouseMove={(e) => handleCanvasMouseMove(e, 'secondary')}
                  onMouseUp={() => handleCanvasMouseUp('secondary')}
                  onWheel={(e) => handleWheel(e, 'secondary')}
                  className="w-full h-full block cursor-crosshair"
                />
              ) : (
                <div className="text-center p-4 text-xs text-slate-500">
                  <span>Bấm vào ảnh trên Khay ảnh để gán vào Khung 2</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông báo thưởng EXP nổi lên */}
        {expNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-lg text-xs animate-bounce flex items-center gap-1.5 z-20">
            {expNotice}
          </div>
        )}
      </div>

      {/* 4. KHAY ẢNH (FILMSTRIP CAROUSEL) — NẰM NGAY TRÊN THANH ĐÁY */}
      {state.photos.length > 0 && (
        <div className="h-20 bg-slate-900/95 border-t border-slate-800 px-4 py-1.5 flex items-center gap-3 overflow-x-auto shrink-0 z-10">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex flex-col justify-center min-w-14 shrink-0">
            <span>Khay ảnh</span>
            <span className="text-[10px] text-slate-500 font-normal">({state.photos.length} ảnh)</span>
          </div>

          <div className="flex items-center gap-2 h-full">
            {/* Nút Thêm ảnh từ máy tính trực tiếp trên khay ảnh */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-16 w-20 rounded-lg border-2 border-dashed border-slate-600 hover:border-blue-400 bg-slate-800/80 hover:bg-slate-800 flex flex-col items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0 gap-1 shadow-sm"
              title="Chọn thêm ảnh từ máy tính (hoặc kéo thả ảnh vào)"
            >
              <span className="text-base leading-none">➕</span>
              <span className="text-[10px] font-bold">Thêm ảnh</span>
            </button>

            {state.photos.map((photo) => {
              const isPrimarySelected = photo.id === state.activePhotoId;
              const isSecondarySelected = state.displayMode !== 'single' && photo.id === state.comparePhotoId;

              return (
                <div
                  key={photo.id}
                  onClick={() => handleThumbnailClick(photo.id)}
                  className={`group relative h-16 w-20 rounded-lg overflow-hidden border-2 cursor-pointer transition shrink-0 bg-slate-950 ${
                    isPrimarySelected
                      ? 'border-blue-500 ring-2 ring-blue-500/50 scale-102'
                      : isSecondarySelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-102'
                      : 'border-slate-700 hover:border-slate-500 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />

                  {/* Huy hiệu ảnh 1 / ảnh 2 */}
                  {isPrimarySelected && (
                    <span className="absolute top-1 left-1 px-1 bg-blue-600 text-[9px] font-bold text-white rounded">
                      1
                    </span>
                  )}
                  {isSecondarySelected && (
                    <span className="absolute top-1 left-1 px-1 bg-emerald-600 text-[9px] font-bold text-white rounded">
                      2
                    </span>
                  )}

                  {/* Nút Xóa ảnh [X] */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600/90 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-500 transition shadow"
                    title="Xóa vĩnh viễn ảnh này khỏi máy tính"
                  >
                    ×
                  </button>

                  {/* Nút Ghim ảnh [📌] */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendIntent({ type: 'PIN_PHOTO', photoId: photo.id, isPinned: !photo.isPinned });
                    }}
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition shadow ${
                      photo.isPinned ? 'bg-amber-500 text-slate-900' : 'bg-slate-800/80 text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                    title={photo.isPinned ? 'Bỏ ghim ảnh' : 'Ghim lưu trữ tư liệu'}
                  >
                    📌
                  </button>

                  {/* Tên học sinh */}
                  {photo.studentName && (
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-[9px] text-white px-1 truncate">
                      {photo.studentName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. THANH BÀI LÀM CỦA HỌC SINH & THƯỞNG NÓNG (GHIM SÁT DƯỚI ĐÁY MÀN HÌNH) */}
      <div className="h-11 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Bài làm của:</span>
          <select
            value={
              activeTarget === 'primary'
                ? activePhoto?.studentId || selectedStudentId
                : comparePhoto?.studentId || selectedStudentId
            }
            onChange={(e) => {
              const studentIdVal = e.target.value;
              setSelectedStudentId(studentIdVal);
              const sName = participants.find((p) => p.id === studentIdVal)?.displayName;
              const targetPhoto = activeTarget === 'primary' ? activePhoto : (comparePhoto || activePhoto);
              if (targetPhoto) {
                onSendIntent({
                  type: 'ADD_PHOTO',
                  photo: {
                    ...targetPhoto,
                    studentId: studentIdVal,
                    studentName: sName,
                  },
                });
              }
            }}
            className="bg-slate-800 text-white px-2.5 py-1 rounded border border-slate-700 text-xs cursor-pointer focus:outline-none"
          >
            <option value="">-- Chọn học sinh sở hữu bài --</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} {p.isOnline ? '🟢' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Nút cộng điểm thưởng EXP */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Thưởng nóng:</span>
          <button
            onClick={() => handleAwardExp(10)}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-900 border border-amber-500/40 font-bold text-xs transition"
          >
            ⭐ +10 EXP
          </button>
          <button
            onClick={() => handleAwardExp(20)}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-900 border border-amber-500/40 font-bold text-xs transition"
          >
            🌟 +20 EXP
          </button>
          <button
            onClick={() => handleAwardExp(50)}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-900 border border-amber-500/40 font-bold text-xs transition"
          >
            👑 +50 EXP
          </button>
        </div>
      </div>

      {/* 6. MODAL QUÉT MÃ QR KẾT NỐI ĐIỆN THOẠI */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">📱</span>
              <div>
                <h3 className="text-base font-bold text-white">Kết nối điện thoại chụp bài</h3>
                <p className="text-xs text-slate-400">
                  Dành riêng cho Giáo viên • Quét mã để mở camera chụp ngay
                </p>
              </div>
            </div>

            {/* Thông tin Mạng LAN */}
            <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700 mb-3 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400">Địa chỉ LAN:</span>
                <strong className="text-emerald-400 font-mono text-[13px]">
                  {connectInfo?.lanIp ? `${connectInfo.lanIp}:${connectInfo.port}` : 'Đang lấy IP mạng LAN...'}
                </strong>
              </div>
              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-700/80">Offline LAN</span>
            </div>

            {/* Khung hiển thị mã QR (Offline base64 PNG) */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-inner my-2">
              {connectInfo?.qrDataUrl ? (
                <img
                  src={connectInfo.qrDataUrl}
                  alt="Mã QR kết nối điện thoại chụp bài"
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span>Đang tạo mã QR offline...</span>
                </div>
              )}
            </div>

            {/* Đường dẫn kết nối rõ ràng & Nút sao chép link */}
            <div className="mt-3 mb-4">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Đường dẫn trực tiếp (nếu gõ tay trên điện thoại):
              </label>
              <div className="flex items-center gap-1.5 bg-slate-800 p-2 rounded-lg border border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={captureUrl || '⏳ Đang lấy địa chỉ mạng LAN...'}
                  className="bg-transparent flex-1 text-xs font-mono text-emerald-300 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (captureUrl) {
                      navigator.clipboard.writeText(captureUrl);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition shrink-0 ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                  title="Sao chép đường dẫn kết nối"
                >
                  {isCopied ? '✅ Đã chép' : '📋 Sao chép'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                💡 <strong className="text-slate-300">Lưu ý:</strong> Điện thoại và máy tính cần kết nối chung một mạng Wi-Fi của lớp học.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => onSendIntent({ type: 'REGENERATE_TOKEN' })}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  🔄 Đổi mã bảo mật
                </button>
                <button
                  onClick={() => onSendIntent({ type: 'TOGGLE_LOCK_CAPTURE' })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    state.isCaptureLocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-800 hover:bg-red-700 text-red-200'
                  }`}
                >
                  {state.isCaptureLocked ? '🔓 Mở cổng nhận' : '🔒 Khóa cổng nhận'}
                </button>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
