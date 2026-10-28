import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
const BALLOON_COLORS = [
    {
        bg: 'from-rose-500 via-red-500 to-rose-700',
        border: 'border-rose-300',
        text: 'text-rose-100',
        knot: 'bg-rose-700',
    },
    {
        bg: 'from-sky-400 via-blue-500 to-indigo-600',
        border: 'border-sky-300',
        text: 'text-sky-100',
        knot: 'bg-indigo-700',
    },
    {
        bg: 'from-emerald-400 via-green-500 to-emerald-700',
        border: 'border-emerald-300',
        text: 'text-emerald-100',
        knot: 'bg-emerald-800',
    },
    {
        bg: 'from-amber-400 via-yellow-500 to-amber-600',
        border: 'border-yellow-200',
        text: 'text-amber-100',
        knot: 'bg-amber-700',
    },
    {
        bg: 'from-purple-400 via-violet-500 to-purple-700',
        border: 'border-purple-300',
        text: 'text-purple-100',
        knot: 'bg-purple-800',
    },
    {
        bg: 'from-pink-400 via-rose-400 to-pink-600',
        border: 'border-pink-200',
        text: 'text-pink-100',
        knot: 'bg-pink-700',
    },
    {
        bg: 'from-orange-400 via-amber-500 to-orange-600',
        border: 'border-orange-200',
        text: 'text-orange-100',
        knot: 'bg-orange-700',
    },
    {
        bg: 'from-teal-400 via-cyan-500 to-teal-700',
        border: 'border-teal-200',
        text: 'text-teal-100',
        knot: 'bg-teal-800',
    },
];
export const BalloonPopMode = ({ isPicking, selectedStudent, balloons = [], onPopBalloon, isWaitingForBalloon = false, }) => {
    const containerRef = useRef(null);
    const revealedNameCardRef = useRef(null);
    // Hiệu ứng GSAP bóng bay bồng bềnh lơ lửng ngẫu nhiên
    useEffect(() => {
        if (!containerRef.current)
            return;
        const balloonEls = containerRef.current.querySelectorAll('.balloon-item');
        balloonEls.forEach((el, i) => {
            gsap.to(el, {
                y: -10 - (i % 3) * 5,
                rotation: (i % 2 === 0 ? 1 : -1) * (3 + (i % 4)),
                duration: 2 + (i % 3) * 0.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: i * 0.15,
            });
        });
        return () => {
            balloonEls.forEach(el => gsap.killTweensOf(el));
        };
    }, [balloons.length]);
    // Hiệu ứng phóng to dần tên học sinh từ nhỏ xíu ra lớn khi bóng nổ
    const poppedTargetBalloon = balloons.find(b => b.isPopped && b.isTarget);
    const studentToDisplay = poppedTargetBalloon?.student || selectedStudent;
    useEffect(() => {
        if (poppedTargetBalloon && revealedNameCardRef.current) {
            // Bắt đầu từ chấm nhỏ xíu (scale 0.05, opacity 0) ngay tâm quả bóng
            gsap.fromTo(revealedNameCardRef.current, {
                scale: 0.05,
                opacity: 0,
                rotation: -15,
            }, {
                scale: 1,
                opacity: 1,
                rotation: 0,
                duration: 1.1,
                ease: 'elastic.out(1, 0.55)', // Phóng to dần và bung nhịp nảy cực đẹp
            });
        }
    }, [poppedTargetBalloon?.id]);
    // Tạo danh sách bóng bay hiển thị mặc định nếu chưa khởi tạo
    const displayBalloons = balloons.length > 0
        ? balloons
        : Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            color: BALLOON_COLORS[i % BALLOON_COLORS.length]?.bg ?? '',
            student: null,
            isPopped: false,
            isTarget: false,
        }));
    return (_jsxs("div", { ref: containerRef, className: "w-full flex flex-col items-center justify-center py-4 select-none min-h-[420px] relative", children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 w-full max-w-4xl px-4 justify-items-center", children: displayBalloons.map((balloon, idx) => {
                    const colorTheme = BALLOON_COLORS[idx % BALLOON_COLORS.length] || BALLOON_COLORS[0];
                    const canClick = !isPicking && (isWaitingForBalloon || !balloon.isPopped);
                    if (balloon.isPopped) {
                        // Khi bóng đã nổ: Hiện tàn tích nổ bùm và tia lửa
                        return (_jsxs("div", { className: "relative w-28 sm:w-36 h-44 sm:h-52 flex flex-col items-center justify-center", children: [_jsx("div", { className: "text-4xl animate-ping opacity-70", children: "\uD83D\uDCA5" }), _jsxs("div", { className: "text-[10px] font-mono font-bold text-amber-300 mt-2 bg-slate-900/80 px-2 py-0.5 rounded-full border border-amber-400/40", children: ["#", idx + 1, " \u0110\u00C3 N\u1ED4"] })] }, balloon.id));
                    }
                    return (_jsxs("div", { onClick: () => {
                            if (canClick && onPopBalloon) {
                                onPopBalloon(idx);
                            }
                        }, className: `balloon-item relative w-28 sm:w-36 h-44 sm:h-52 flex flex-col items-center justify-center transition-transform ${canClick ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}`, role: "button", tabIndex: 0, "aria-label": `Quả bóng bay số ${idx + 1}`, title: "B\u1EA5m \u0111\u1EC3 b\u1EAFn n\u1ED5 b\u00F3ng bay!", children: [_jsxs("div", { className: `relative w-24 sm:w-32 h-32 sm:h-40 rounded-[50%_50%_50%_50%/40%_40%_60%_60%] bg-gradient-to-tr ${colorTheme.bg} shadow-2xl border-2 ${colorTheme.border} flex flex-col items-center justify-center`, children: [_jsx("div", { className: "absolute top-3 left-3 w-5 sm:w-7 h-8 sm:h-12 rounded-[50%] bg-white/40 -rotate-45 blur-[1px] pointer-events-none" }), _jsxs("div", { className: "w-10 h-10 rounded-full bg-black/40 border border-white/40 flex items-center justify-center text-white font-black text-base shadow", children: ["#", idx + 1] }), _jsx("div", { className: `absolute -bottom-1.5 w-3.5 h-2.5 rounded-sm ${colorTheme.knot} shadow-sm` })] }), _jsx("div", { className: "w-[1.5px] h-10 bg-slate-400/60 -mt-0.5" })] }, balloon.id));
                }) }), studentToDisplay && poppedTargetBalloon && (_jsx("div", { ref: revealedNameCardRef, className: "mt-6 z-30 w-full max-w-xl px-4 will-change-transform", children: _jsxs("div", { className: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white p-6 sm:p-7 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-5 ring-4 ring-amber-400/70", children: [_jsx("div", { className: "w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-3xl sm:text-4xl font-black shadow-inner border-2 border-amber-300 shrink-0", children: studentToDisplay.name.charAt(0).toUpperCase() }), _jsxs("div", { className: "text-left flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: "text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/90 px-3 py-0.5 rounded-full inline-block shadow-sm", children: "\uD83C\uDF88 B\u1EAEN N\u1ED4 B\u00D3NG \u2014 TR\u00DANG H\u1ECCC SINH! \uD83C\uDF88" }) }), _jsx("div", { className: "text-2xl sm:text-4xl font-black text-slate-950 leading-tight drop-shadow truncate", children: studentToDisplay.name }), studentToDisplay.code && (_jsxs("div", { className: "text-sm font-mono font-bold text-amber-950 mt-1", children: ["M\u00E3 s\u1ED1: ", studentToDisplay.code] }))] })] }) }))] }));
};
//# sourceMappingURL=BalloonPopMode.js.map