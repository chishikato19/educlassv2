import React, { useState } from 'react';
import { getYouTubeEmbedUrl } from '@educlass/protocol';

export const VideoProjectorWindow: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const youtubeId = searchParams.get('youtubeId');
  const title = searchParams.get('title') || 'Trình Chiếu Video Học Liệu';
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Bỏ qua lỗi nếu trình duyệt chặn fullscreen
    }
  };

  if (!youtubeId) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-white font-sans">
        <div className="max-w-md rounded-2xl bg-slate-900 border border-red-500/30 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl text-red-400">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-red-200">Không tìm thấy video</h2>
          <p className="mt-2 text-sm text-slate-400">
            Liên kết không chứa mã nhận dạng YouTube ID hợp lệ. Vui lòng đóng cửa sổ và thử lại.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(youtubeId, true);

  return (
    <div className="relative flex h-screen w-screen flex-col bg-black overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="z-10 flex h-14 w-full items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600/30 text-red-400 text-lg">
            🎬
          </span>
          <h1 className="truncate text-base font-semibold text-white" title={title}>
            {title}
          </h1>
          <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">
            Không quảng cáo theo dõi
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            title="Bật/Tắt toàn màn hình"
          >
            {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình ⛶'}
          </button>
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500 hover:text-white transition"
            title="Đóng cửa sổ"
          >
            Đóng ✕
          </button>
        </div>
      </header>

      {/* Main Video Embed Container */}
      <div className="relative flex-1 w-full h-full bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
};
