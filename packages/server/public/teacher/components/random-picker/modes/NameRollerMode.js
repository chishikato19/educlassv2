import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
const NAME_ITEM_HEIGHT = 130; // Chiều cao mỗi thẻ tên học sinh (px) - Phóng to nổi bật
export const NameRollerMode = ({ isPicking, selectedStudent, candidates, onTriggerSpin, isCompleted, }) => {
    const rollerStripRef = useRef(null);
    const timelineRef = useRef(null);
    // Tạo dải tên 3 nhịp: cuộn nhanh -> chậm dần -> nín thở -> chốt tên
    const reelList = useMemo(() => {
        if (!candidates || candidates.length === 0)
            return [];
        const pool = [...candidates];
        const repeated = [];
        // Lặp lại pool ít nhất 35-40 mục để cuộn tốc độ cao
        for (let c = 0; c < 5; c++) {
            repeated.push(...pool);
        }
        // Thêm các bạn hồi hộp ở nhịp cuối (3 tên trôi chậm trước khi chốt)
        if (selectedStudent) {
            const others = pool.filter(s => s.id !== selectedStudent.id);
            if (others.length >= 3) {
                repeated.push(others[0], others[1], others[2]);
            }
            else if (others.length > 0) {
                repeated.push(others[0], others[0], others[0]);
            }
            else {
                repeated.push(selectedStudent, selectedStudent, selectedStudent);
            }
            // Vị trí cuối cùng là học sinh được CHỐT
            repeated.push(selectedStudent);
        }
        return repeated;
    }, [candidates, selectedStudent]);
    // Điều khiển GSAP timeline 3 nhịp kịch tính
    useEffect(() => {
        if (!rollerStripRef.current || reelList.length === 0)
            return;
        if (isPicking && selectedStudent) {
            const targetIndex = reelList.length - 1;
            // Hủy timeline cũ nếu có
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
            gsap.killTweensOf(rollerStripRef.current);
            // Đặt lại vị trí ban đầu
            gsap.set(rollerStripRef.current, { y: 0 });
            // Tạo timeline 3 nhịp kịch tích
            const tl = gsap.timeline();
            timelineRef.current = tl;
            // NHỊP 1: Tăng tốc cực nhanh (1.5 giây) — Cuộn tít mù qua khung nhìn
            tl.to(rollerStripRef.current, {
                y: -(targetIndex - 6) * NAME_ITEM_HEIGHT,
                duration: 1.5,
                ease: 'power2.in',
            });
            // NHỊP 2: Giảm tốc từ từ (2.0 giây) — Tên từng học sinh bắt đầu đọc được rõ ràng
            tl.to(rollerStripRef.current, {
                y: -(targetIndex - 2) * NAME_ITEM_HEIGHT,
                duration: 2.0,
                ease: 'power1.out',
            });
            // NHỊP 3: Cực chậm & Nín thở (1.4 giây) — Từng cái tên trượt qua thật chậm, khựng lại ở tên trước
            tl.to(rollerStripRef.current, {
                y: -(targetIndex - 0.7) * NAME_ITEM_HEIGHT,
                duration: 1.4,
                ease: 'power2.out',
            });
            // NHỊP 3 (Cú chốt): Bánh xe trôi thêm một nhịp nhẹ cuối cùng và CHỐT CHÍNH XÁC (0.7 giây)
            tl.to(rollerStripRef.current, {
                y: -targetIndex * NAME_ITEM_HEIGHT,
                duration: 0.7,
                ease: 'power1.inOut',
            });
        }
        else if (!isPicking && !selectedStudent) {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
            gsap.killTweensOf(rollerStripRef.current);
            gsap.set(rollerStripRef.current, { y: 0 });
        }
        return () => {
            if (timelineRef.current)
                timelineRef.current.kill();
            if (rollerStripRef.current)
                gsap.killTweensOf(rollerStripRef.current);
        };
    }, [isPicking, selectedStudent, reelList.length]);
    return (_jsxs("div", { className: "w-full flex flex-col items-center justify-center py-4 select-none", children: [_jsxs("div", { className: "relative w-full max-w-4xl lg:max-w-5xl px-3 sm:px-6 flex flex-col items-center", children: [_jsxs("div", { className: "relative w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-5 sm:p-8 rounded-3xl border-4 border-amber-400 shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col items-center ring-4 ring-amber-500/20", children: [_jsxs("div", { className: "w-full flex justify-between items-center px-6 py-2 mb-4 bg-black/70 rounded-full border border-amber-400/50 shadow-inner", children: [_jsxs("span", { className: "flex items-center gap-2 text-xs sm:text-sm text-amber-300 font-extrabold uppercase tracking-widest", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-amber-400 animate-ping" }), "\u2605 V\u00D2NG QUAY G\u1ECCI T\u00CAN H\u1ECCC SINH \u2605"] }), _jsxs("span", { className: "text-xs sm:text-sm text-indigo-300 font-mono font-bold", children: ["S\u0129 s\u1ED1: ", candidates.length, " b\u1EA1n"] })] }), _jsxs("div", { className: "relative w-full rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden shadow-[inset_0_10px_30px_rgba(0,0,0,0.8)]", style: { height: `${NAME_ITEM_HEIGHT}px` }, children: [_jsx("div", { className: "absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-10 pointer-events-none" }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10 pointer-events-none" }), _jsx("div", { ref: rollerStripRef, className: "flex flex-col will-change-transform", children: reelList.length > 0 ? (reelList.map((st, idx) => (_jsxs("div", { className: "flex items-center justify-center gap-6 sm:gap-8 px-6 text-center", style: { height: `${NAME_ITEM_HEIGHT}px` }, children: [_jsx("div", { className: "w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 text-slate-950 font-black text-2xl sm:text-4xl flex items-center justify-center shadow-lg border-2 border-white shrink-0", children: st.name.charAt(0).toUpperCase() }), _jsx("div", { className: "text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] truncate max-w-[650px]", children: st.name }), st.code && (_jsx("span", { className: "text-xs sm:text-sm font-mono font-black text-amber-300 bg-amber-950/90 px-3 py-1.5 rounded-xl border border-amber-400/50 shadow shrink-0", children: st.code }))] }, `roller-${idx}`)))) : (_jsx("div", { className: "flex items-center justify-center text-slate-400 font-semibold text-lg", style: { height: `${NAME_ITEM_HEIGHT}px` }, children: "Ch\u01B0a c\u00F3 h\u1ECDc sinh trong danh s\u00E1ch quay" })) })] }), _jsx("div", { className: "flex gap-3 sm:gap-4 mt-5", children: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (_jsx("span", { className: `w-3 h-3 rounded-full ${isPicking
                                        ? i % 2 === 0
                                            ? 'bg-amber-400 animate-pulse'
                                            : 'bg-rose-400 animate-ping'
                                        : 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'}` }, i))) })] }), !isPicking && !isCompleted && onTriggerSpin && (_jsx("div", { className: "mt-5 flex flex-col items-center", children: _jsxs("button", { type: "button", onClick: () => onTriggerSpin('normal'), className: "px-10 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xl rounded-2xl shadow-2xl border-2 border-amber-300 active:scale-95 transition cursor-pointer flex items-center gap-3", children: [_jsx("span", { className: "text-2xl", children: "\uD83C\uDFB2" }), _jsx("span", { children: "QUAY T\u00CAN NG\u1EAAU NHI\u00CAN" })] }) }))] }), isCompleted && selectedStudent && (_jsx("div", { className: "mt-6 z-10 animate-bounce", children: _jsxs("div", { className: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white px-10 py-4 rounded-2xl shadow-2xl flex items-center gap-5 ring-4 ring-amber-400/60", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-3xl font-black shadow-inner", children: selectedStudent.name.charAt(0).toUpperCase() }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/90 px-3 py-0.5 rounded-full inline-block mb-1", children: "\u2728 H\u1ECCC SINH \u0110\u01AF\u1EE2C CH\u1ECCN! \u2728" }), _jsx("div", { className: "text-2xl sm:text-4xl font-black text-slate-900 leading-tight", children: selectedStudent.name }), selectedStudent.code && (_jsxs("div", { className: "text-sm font-mono font-bold text-amber-950 mt-0.5", children: ["M\u00E3: ", selectedStudent.code] }))] })] }) }))] }));
};
//# sourceMappingURL=NameRollerMode.js.map