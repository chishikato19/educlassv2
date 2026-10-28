import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const CardFlipMode = ({ isPicking, cards, onFlipCard }) => {
    return (_jsx("div", { className: "w-full flex flex-col items-center justify-center py-6 select-none", children: _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 w-full max-w-5xl px-4 justify-items-center", children: cards.map((card, idx) => {
                const isFlipped = card.isRevealed;
                const isTarget = card.isTarget;
                return (_jsx("div", { onClick: () => {
                        if (!isFlipped && !isPicking) {
                            onFlipCard(idx);
                        }
                    }, className: `relative w-36 h-56 sm:w-44 sm:h-64 cursor-pointer perspective-1000 transition-transform duration-300 ${!isFlipped && !isPicking
                        ? 'hover:-translate-y-2 hover:scale-105 active:scale-95'
                        : ''} ${isPicking ? 'animate-pulse' : ''}`, style: { perspective: '1000px' }, role: "button", tabIndex: 0, "aria-label": `Lá bài số ${idx + 1}`, children: _jsxs("div", { className: "w-full h-full relative rounded-2xl shadow-xl transition-transform duration-700", style: {
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }, children: [_jsxs("div", { className: "absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-4 border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-950 text-white shadow-2xl hover:border-amber-400/60 transition-colors", style: {
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                }, children: [_jsxs("div", { className: "w-full flex justify-between items-center text-indigo-300 text-xs font-mono", children: [_jsx("span", { children: "\u2605 \u2605 \u2605" }), _jsxs("span", { children: ["#", idx + 1] })] }), _jsxs("div", { className: "flex flex-col items-center justify-center my-auto", children: [_jsx("div", { className: "w-16 h-16 rounded-full border-2 border-dashed border-indigo-300/40 flex items-center justify-center bg-indigo-950/60 shadow-inner group-hover:scale-110 transition-transform", children: _jsx("span", { className: "text-3xl filter drop-shadow", children: "\uD83C\uDCCF" }) }), _jsx("span", { className: "mt-2 text-xs font-semibold tracking-widest text-indigo-200 uppercase", children: "L\u1EADt Th\u1EBB" })] }), _jsxs("div", { className: "w-full flex justify-between items-center text-indigo-300 text-xs font-mono", children: [_jsx("span", { children: "EduClass" }), _jsx("span", { children: "\u2605 \u2605 \u2605" })] })] }), _jsxs("div", { className: `absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-4 shadow-2xl ${isTarget
                                    ? 'border-4 border-amber-300 bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-amber-950 shadow-amber-400/80 ring-4 ring-amber-300/60'
                                    : 'border-2 border-slate-200 bg-white text-slate-700 shadow-md'}`, style: {
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                }, children: [_jsxs("div", { className: "w-full flex justify-between items-center text-xs font-bold", children: [_jsx("span", { className: `px-2 py-0.5 rounded-full ${isTarget
                                                    ? 'bg-amber-950/80 text-amber-200 font-extrabold shadow-sm'
                                                    : 'bg-slate-100 text-slate-500 font-medium'}`, children: isTarget ? '🎯 ĐƯỢC CHỌN' : 'Ứng viên' }), _jsxs("span", { className: isTarget ? 'text-amber-900 font-bold' : 'text-slate-400', children: ["#", idx + 1] })] }), _jsxs("div", { className: "flex flex-col items-center justify-center my-auto text-center px-1", children: [_jsx("div", { className: `w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black mb-2 shadow-md ${isTarget
                                                    ? 'bg-amber-500 text-white ring-4 ring-white shadow-amber-600/40'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'}`, children: card.student ? card.student.name.charAt(0).toUpperCase() : '?' }), _jsx("div", { className: `font-black text-base sm:text-lg leading-tight line-clamp-2 ${isTarget ? 'text-amber-950 drop-shadow-sm' : 'text-slate-800'}`, children: card.student ? card.student.name : 'Chưa xác định' }), card.student?.code && (_jsx("div", { className: `text-xs mt-1 font-mono font-semibold ${isTarget
                                                    ? 'text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded'
                                                    : 'text-slate-400'}`, children: card.student.code }))] }), _jsx("div", { className: `text-[10px] uppercase font-bold tracking-wider ${isTarget ? 'text-amber-900 font-extrabold' : 'text-slate-300'}`, children: isTarget ? '✨ Chúc mừng em! ✨' : 'EduClass' })] })] }) }, card.id));
            }) }) }));
};
//# sourceMappingURL=CardFlipMode.js.map