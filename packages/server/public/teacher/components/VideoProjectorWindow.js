import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { getYouTubeEmbedUrl } from '@educlass/protocol';
export const VideoProjectorWindow = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const youtubeId = searchParams.get('youtubeId');
    const title = searchParams.get('title') || 'Trình Chiếu Video Học Liệu';
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            }
            else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
        catch {
            // Bỏ qua lỗi nếu trình duyệt chặn fullscreen
        }
    };
    if (!youtubeId) {
        return (_jsx("div", { className: "flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-white font-sans", children: _jsxs("div", { className: "max-w-md rounded-2xl bg-slate-900 border border-red-500/30 p-8 text-center shadow-2xl", children: [_jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl text-red-400", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "text-xl font-bold text-red-200", children: "Kh\u00F4ng t\u00ECm th\u1EA5y video" }), _jsx("p", { className: "mt-2 text-sm text-slate-400", children: "Li\u00EAn k\u1EBFt kh\u00F4ng ch\u1EE9a m\u00E3 nh\u1EADn d\u1EA1ng YouTube ID h\u1EE3p l\u1EC7. Vui l\u00F2ng \u0111\u00F3ng c\u1EEDa s\u1ED5 v\u00E0 th\u1EED l\u1EA1i." }), _jsx("button", { onClick: () => window.close(), className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition", children: "\u0110\u00F3ng c\u1EEDa s\u1ED5" })] }) }));
    }
    const embedUrl = getYouTubeEmbedUrl(youtubeId, true);
    return (_jsxs("div", { className: "relative flex h-screen w-screen flex-col bg-black overflow-hidden font-sans select-none", children: [_jsxs("header", { className: "z-10 flex h-14 w-full items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-md", children: [_jsxs("div", { className: "flex items-center gap-3 overflow-hidden", children: [_jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600/30 text-red-400 text-lg", children: "\uD83C\uDFAC" }), _jsx("h1", { className: "truncate text-base font-semibold text-white", title: title, children: title }), _jsx("span", { className: "hidden sm:inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30", children: "Kh\u00F4ng qu\u1EA3ng c\u00E1o theo d\u00F5i" })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { onClick: toggleFullscreen, className: "flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition", title: "B\u1EADt/T\u1EAFt to\u00E0n m\u00E0n h\u00ECnh", children: isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình ⛶' }), _jsx("button", { onClick: () => window.close(), className: "flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500 hover:text-white transition", title: "\u0110\u00F3ng c\u1EEDa s\u1ED5", children: "\u0110\u00F3ng \u2715" })] })] }), _jsx("div", { className: "relative flex-1 w-full h-full bg-black", children: _jsx("iframe", { src: embedUrl, title: title, allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen", allowFullScreen: true, className: "absolute inset-0 h-full w-full border-0" }) })] }));
};
//# sourceMappingURL=VideoProjectorWindow.js.map