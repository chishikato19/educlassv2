import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const MINI_GAMES = [
    {
        icon: '🃏',
        name: 'Lật thẻ bài',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-400/40 text-amber-200',
    },
    {
        icon: '🎁',
        name: 'Hộp quà bí mật',
        color: 'from-pink-500/20 to-rose-500/20 border-pink-400/40 text-pink-200',
    },
    {
        icon: '🎰',
        name: 'Máy quay số',
        color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-200',
    },
    {
        icon: '📜',
        name: 'Cuộn họ tên',
        color: 'from-sky-500/20 to-indigo-500/20 border-sky-400/40 text-sky-200',
    },
    {
        icon: '🎈',
        name: 'Bắn bóng bay',
        color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/40 text-purple-200',
    },
    {
        icon: '🔮',
        name: 'Bài ma thuật',
        color: 'from-violet-500/20 to-indigo-500/20 border-violet-400/40 text-violet-200',
    },
    {
        icon: '🦆',
        name: 'Đua vịt',
        color: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/40 text-yellow-200',
    },
    {
        icon: '🎯',
        name: 'Bắn vịt',
        color: 'from-red-500/20 to-orange-500/20 border-red-400/40 text-red-200',
    },
    {
        icon: '⚔️',
        name: 'Sinh tồn',
        color: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/40 text-cyan-200',
    },
    {
        icon: '⚪',
        name: 'Đua bi Pinball',
        color: 'from-slate-500/20 to-indigo-500/20 border-slate-400/40 text-slate-200',
    },
];
export const RandomWelcomeStage = ({ candidates = [], isFullscreen = false, }) => {
    return (_jsxs("div", { className: `w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center px-4 transition-all ${isFullscreen ? 'py-8 sm:py-12' : 'py-6 sm:py-8'}`, children: [_jsxs("div", { className: "relative mb-5 group", children: [_jsx("div", { className: "absolute -inset-4 bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse" }), _jsxs("div", { className: "relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-indigo-800/80 to-slate-900/90 border-2 border-amber-400/60 shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform", children: [_jsx("span", { className: "text-6xl sm:text-7xl select-none animate-bounce", style: { animationDuration: '2.5s' }, children: "\uD83C\uDFB2" }), _jsx("span", { className: "absolute -top-2 -right-2 text-xl animate-spin-slow", children: "\u2728" }), _jsx("span", { className: "absolute -bottom-1 -left-2 text-lg animate-pulse", children: "\uD83C\uDF1F" })] })] }), _jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 shadow-inner mb-3", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-ping" }), _jsx("span", { className: "text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300", children: "Ch\u1EBF \u0111\u1ED9 Ng\u1EABu nhi\u00EAn \u2014 M\u1ED7i l\u01B0\u1EE3t 1 tr\u00F2 ch\u01A1i b\u1EA5t ng\u1EDD" })] }), _jsx("h2", { className: "text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md", children: "S\u1EB5n S\u00E0ng Kh\u1EDFi \u0110\u1ED9ng V\u00F2ng Quay B\u00ED \u1EA8n!" }), _jsxs("p", { className: "text-sm sm:text-base text-indigo-200/90 max-w-xl mt-2 leading-relaxed font-medium", children: ["M\u1ED7i l\u1EA7n b\u1EA5m g\u1ECDi, h\u1EC7 th\u1ED1ng s\u1EBD t\u1EF1 \u0111\u1ED9ng b\u1ED1c ng\u1EABu nhi\u00EAn 1 trong 10 tr\u00F2 ch\u01A1i h\u1EA5p d\u1EABn. Th\u1EA7y/C\u00F4 h\u00E3y b\u1EA5m n\u00FAt ", _jsx("span", { className: "text-amber-300 font-bold", children: "\"H\u1ECDc sinh \u0111\u1EA7u ti\u00EAn\"" }), " b\u00EAn d\u01B0\u1EDBi \u0111\u1EC3 m\u1EDF m\u00E0n!"] }), _jsxs("div", { className: "mt-6 w-full max-w-3xl", children: [_jsxs("div", { className: "text-[11px] font-bold uppercase tracking-widest text-indigo-300/80 mb-2.5", children: ["10 Mini-game s\u1EB5n s\u00E0ng trong danh s\u00E1ch (", candidates.length, " h\u1ECDc sinh)"] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5", children: MINI_GAMES.map(game => (_jsxs("div", { className: `flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${game.color} border backdrop-blur-sm shadow-sm transition hover:scale-105`, children: [_jsx("span", { className: "text-lg select-none", children: game.icon }), _jsx("span", { className: "text-xs font-bold truncate", children: game.name })] }, game.name))) })] })] }));
};
//# sourceMappingURL=RandomWelcomeStage.js.map