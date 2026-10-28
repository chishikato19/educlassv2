import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { soundManager } from '../sound.js';
import { FINISH_LINE_Y, FINISH_NECK_X_LEFT, FINISH_NECK_X_RIGHT, getRandomMarbleMap, START_GATE_Y, TRACK_HEIGHT, TRACK_WIDTH, } from './marble-race/track-layout.js';
import { initializeMarbles, SCENARIO_LABELS, updateMarblePhysics, } from './marble-race/physics-engine.js';
const SCENARIOS = ['chaos_bottleneck', 'wire_to_wire', 'comeback', 'duel'];
export const MarbleRaceMode = ({ isPicking, selectedStudent, candidates = [], onTriggerSpin, isCompleted, onMarbleRaceComplete, }) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    // Chọn ngẫu nhiên bản đồ đua khi tải hoặc khi chơi
    const [currentMap, setCurrentMap] = useState(() => getRandomMarbleMap());
    const track = useMemo(() => currentMap.buildTrack(), [currentMap]);
    const marblesRef = useRef([]);
    const cameraYRef = useRef(0);
    const animFrameRef = useRef(null);
    const hasFinishedRef = useRef(false);
    const [actualWinner, setActualWinner] = useState(null);
    // Kịch bản cuộc đua
    const [scenario, setScenario] = useState(() => {
        return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? 'chaos_bottleneck';
    });
    // Bảng tổng sắp trực tiếp Top 5 dẫn đầu
    const [leaderboard, setLeaderboard] = useState([]);
    const [raceProgress, setRaceProgress] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(640);
    // Tính toán chiều cao linh hoạt (kéo dài màn hình khi full màn hình)
    useEffect(() => {
        const updateSize = () => {
            if (document.fullscreenElement) {
                setViewportHeight(Math.max(window.innerHeight - 130, 720));
            }
            else {
                setViewportHeight(640);
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        document.addEventListener('fullscreenchange', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            document.removeEventListener('fullscreenchange', updateSize);
        };
    }, []);
    const prevIsPickingRef = useRef(false);
    // Khởi tạo các viên bi tại vạch xuất phát ban đầu khi chưa đua
    useEffect(() => {
        if (!isPicking && !actualWinner) {
            marblesRef.current = initializeMarbles(candidates, selectedStudent, scenario);
            cameraYRef.current = 0;
            hasFinishedRef.current = false;
        }
    }, [candidates]);
    // Đổi ngẫu nhiên kịch bản và bản đồ mới CHỈ KHI bắt đầu một cuộc đua mới (isPicking: false -> true)
    useEffect(() => {
        if (isPicking && !prevIsPickingRef.current) {
            hasFinishedRef.current = false;
            setActualWinner(null);
            // Chọn ngẫu nhiên kịch bản
            const nextScenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? 'chaos_bottleneck';
            setScenario(nextScenario);
            // Chọn ngẫu nhiên bản đồ đua
            const nextMap = getRandomMarbleMap();
            setCurrentMap(nextMap);
            marblesRef.current = initializeMarbles(candidates, selectedStudent, nextScenario);
            cameraYRef.current = 0;
            soundManager.playMarbleDropStart();
        }
        prevIsPickingRef.current = isPicking;
    }, [isPicking, candidates, selectedStudent]);
    // Vòng lặp render mô phỏng vật lý 60 FPS
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let isRunning = true;
        let lastHudUpdateTime = 0;
        const renderLoop = (timestamp) => {
            if (!isRunning)
                return;
            // 1. Cập nhật vật lý
            const { winner } = updateMarblePhysics(marblesRef.current, track, isPicking, timestamp, true, scenario);
            // CHỈ kích hoạt kết quả khi viên bi ĐÃ CHẠM VẠCH ĐÍCH THẬT SỰ
            if (winner && !hasFinishedRef.current) {
                hasFinishedRef.current = true;
                setActualWinner(winner.student); // Lưu chính xác học sinh của viên bi cán đích đầu tiên
                soundManager.playWinner();
                soundManager.playFireworkBurst();
                if (onMarbleRaceComplete) {
                    onMarbleRaceComplete(winner.student);
                }
            }
            // 2. Cập nhật Camera bám theo bi dẫn đầu hoặc dừng cố định ở vạch đích khi đã có quán quân
            let targetCameraY = 0;
            if (hasFinishedRef.current || actualWinner) {
                // Sau khi đã có quán quân cán đích, khóa camera tại vạch đích để vinh danh người chiến thắng
                targetCameraY = FINISH_LINE_Y - viewportHeight * 0.48;
            }
            else {
                const activeMarbles = marblesRef.current.filter(m => !m.hasFinished);
                if (activeMarbles.length > 0) {
                    const leadMarble = activeMarbles.reduce((max, m) => (m.y > max.y ? m : max), activeMarbles[0]);
                    targetCameraY = leadMarble.y - viewportHeight * 0.38;
                }
                else {
                    targetCameraY = FINISH_LINE_Y - viewportHeight * 0.48;
                }
            }
            // Giới hạn camera trong đường đua
            targetCameraY = Math.max(0, Math.min(TRACK_HEIGHT - viewportHeight, targetCameraY));
            cameraYRef.current += (targetCameraY - cameraYRef.current) * 0.085;
            const camY = cameraYRef.current;
            // 3. Cập nhật HUD định kỳ (mỗi 80ms)
            if (timestamp - lastHudUpdateTime > 80) {
                lastHudUpdateTime = timestamp;
                const top5 = [...marblesRef.current].sort((a, b) => a.rank - b.rank).slice(0, 5);
                setLeaderboard(top5);
                const deepestY = marblesRef.current.reduce((max, m) => Math.max(max, m.y), 0);
                const progress = Math.min(100, Math.max(0, Math.round(((deepestY - START_GATE_Y) / (FINISH_LINE_Y - START_GATE_Y)) * 100)));
                setRaceProgress(progress);
            }
            // 4. Vẽ nền và các thành phần
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(0, -camY);
            // Nền lưới điện tử Arcade / Mech theo theme của map
            drawTrackBackground(ctx, camY, viewportHeight, currentMap.theme);
            // Vẽ tường bao & máng trượt
            drawWalls(ctx, track);
            // Vẽ cổng xuất phát
            drawStartGate(ctx, isPicking);
            // Vẽ các biển tên chặng dọc đường đua của map
            drawStageMarkers(ctx, currentMap.stages);
            // Vẽ các chướng ngại vật của map hiện tại
            drawPegs(ctx, track, timestamp);
            drawVortices(ctx, track, timestamp);
            drawBumpers(ctx, track, timestamp);
            drawSpinners(ctx, track);
            drawSeeSaws(ctx, track);
            drawTurboPads(ctx, track, timestamp);
            drawShortcutGaps(ctx, currentMap.id);
            // Vẽ vạch đích
            drawFinishLine(ctx);
            // Vẽ từng viên bi với kích thước to và tên nổi bật phẳng
            drawMarbles(ctx, marblesRef.current, timestamp);
            ctx.restore();
            animFrameRef.current = requestAnimationFrame(renderLoop);
        };
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return () => {
            isRunning = false;
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [track, isPicking, scenario, viewportHeight, currentMap, actualWinner]);
    const activeScenarioInfo = SCENARIO_LABELS[scenario];
    return (_jsxs("div", { ref: containerRef, className: "relative w-full max-w-5xl mx-auto flex flex-col items-center select-none", children: [_jsxs("div", { className: "w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-indigo-900/60 rounded-t-2xl text-white text-xs z-10 gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "text-2xl", children: currentMap.icon }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "font-black text-amber-400 tracking-wide uppercase text-sm sm:text-base", children: "\u0110ua Bi R\u01A1i Pinball" }), _jsxs("span", { className: "px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold text-[10px]", children: [candidates.length, " h\u1ECDc sinh"] })] }), _jsxs("p", { className: "text-[11px] text-slate-300 font-medium", children: ["B\u1EA3n \u0111\u1ED3: ", _jsx("span", { className: "text-amber-300 font-bold", children: currentMap.name }), " \u2014", ' ', currentMap.subtitle] })] })] }), _jsxs("div", { className: "flex-1 max-w-sm mx-2 hidden md:block", children: [_jsxs("div", { className: "flex justify-between text-[10px] text-slate-400 mb-1 font-semibold", children: [_jsx("span", { children: "Xu\u1EA5t ph\u00E1t" }), _jsx("span", { children: "7 Ch\u1EB7ng ch\u01B0\u1EDBng ng\u1EA1i" }), _jsx("span", { children: "V\u1EA1ch \u0111\u00EDch" })] }), _jsx("div", { className: "w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner", children: _jsx("div", { className: "h-full bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500 transition-all duration-150", style: { width: `${raceProgress}%` } }) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", disabled: isPicking, onClick: () => {
                                    if (!isPicking) {
                                        const nextMap = getRandomMarbleMap();
                                        setCurrentMap(nextMap);
                                    }
                                }, title: !isPicking ? 'Bấm để đổi ngẫu nhiên bản đồ khác' : undefined, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow text-left transition-all ${!isPicking ? 'hover:bg-indigo-900/40 cursor-pointer' : 'cursor-default'} bg-slate-900/90 border-amber-500/40`, children: [_jsx("span", { className: "text-base", children: currentMap.icon }), _jsxs("div", { children: [_jsxs("span", { className: "text-[9px] uppercase tracking-wider text-amber-400 font-black block", children: ["B\u1EA3n \u0111\u1ED3 \u0111ua ", !isPicking && '🎲'] }), _jsx("span", { className: "font-bold text-slate-100 text-xs truncate max-w-[110px] block", children: currentMap.name })] })] }), _jsxs("div", { className: "flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1.5 rounded-xl shadow", children: [_jsx("span", { className: "text-base", children: activeScenarioInfo.icon }), _jsxs("div", { className: "text-left", children: [_jsx("span", { className: "text-[9px] uppercase tracking-wider text-indigo-300 font-black block", children: "K\u1ECBch b\u1EA3n \u0111ua" }), _jsx("span", { className: "font-bold text-amber-300 text-xs truncate max-w-[120px] block", children: activeScenarioInfo.name })] })] })] })] }), _jsxs("div", { className: "relative w-full bg-slate-950 border-x border-b border-indigo-900/60 rounded-b-2xl overflow-hidden shadow-2xl flex justify-center", children: [_jsx("canvas", { ref: canvasRef, width: TRACK_WIDTH, height: viewportHeight, className: "w-full object-cover block", style: { height: `${viewportHeight}px` } }), _jsx("div", { className: "absolute top-4 right-4 z-20 pointer-events-none", children: _jsxs("div", { className: "bg-slate-950/85 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-2.5 shadow-2xl min-w-[170px] sm:min-w-[190px]", children: [_jsxs("div", { className: "flex items-center justify-between pb-1.5 border-b border-indigo-800/50 mb-2", children: [_jsxs("span", { className: "text-[10px] uppercase font-black tracking-wider text-amber-400 flex items-center gap-1", children: [_jsx("span", { children: "\uD83C\uDFC6" }), " B\u1EA2NG T\u1ED4NG S\u1EAEP"] }), _jsx("span", { className: "text-[9px] text-indigo-300 font-semibold", children: "Tr\u1EF1c ti\u1EBFp" })] }), _jsx("div", { className: "flex flex-col gap-1.5", children: leaderboard.map((m, idx) => (_jsxs("div", { className: `flex items-center justify-between px-2 py-1 rounded-xl border text-xs font-bold transition-all ${idx === 0
                                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                                            : idx === 1
                                                ? 'bg-slate-300/20 border-slate-300 text-slate-200'
                                                : idx === 2
                                                    ? 'bg-amber-700/20 border-amber-600 text-amber-400'
                                                    : 'bg-indigo-950/50 border-indigo-900/50 text-indigo-200'}`, children: [_jsxs("div", { className: "flex items-center gap-1.5 truncate", children: [_jsx("span", { className: "text-xs", children: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}` }), _jsx("span", { className: "w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white/60", style: { backgroundColor: m.color } }), _jsx("span", { className: "truncate max-w-[95px] sm:max-w-[105px]", children: m.student.name })] }), _jsx("span", { className: "text-[10px] text-slate-400 font-mono ml-1", children: m.hasFinished ? '🏁' : `${Math.round(m.y / 50)}m` })] }, m.id))) })] }) }), !isPicking && !isCompleted && !actualWinner && onTriggerSpin && (_jsxs("div", { className: "absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-20", children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("span", { className: "text-5xl", children: currentMap.icon }), _jsx("h3", { className: "text-2xl sm:text-3xl font-black text-white mt-2 drop-shadow", children: "S\u1EB5n S\u00E0ng M\u1EDF C\u1ED5ng Th\u1EA3 Bi!" }), _jsxs("p", { className: "text-sm text-indigo-200 max-w-md mt-1 font-medium", children: ["B\u1EA3n \u0111\u1ED3: ", _jsx("strong", { className: "text-amber-400", children: currentMap.name }), " (", currentMap.subtitle, ")"] }), _jsxs("p", { className: "text-xs text-slate-300 max-w-md mt-0.5", children: ["K\u1ECBch b\u1EA3n: ", _jsx("strong", { className: "text-amber-300", children: activeScenarioInfo.name }), " \u2014", ' ', activeScenarioInfo.desc, "."] })] }), _jsx("button", { type: "button", onClick: () => onTriggerSpin('normal'), className: "px-9 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-lg sm:text-xl shadow-2xl shadow-amber-500/40 border-2 border-amber-300 transform active:scale-95 transition-all cursor-pointer", children: "\uD83D\uDE80 M\u1EDE C\u1ED4NG TH\u1EA2 BI NGAY!" })] })), actualWinner && (_jsx("div", { className: "absolute top-5 left-1/2 -translate-x-1/2 z-30 animate-bounce", children: _jsxs("div", { className: "px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-white shadow-2xl text-slate-950 flex items-center gap-3.5", children: [_jsx("span", { className: "text-3xl sm:text-4xl", children: "\uD83D\uDC51" }), _jsxs("div", { className: "text-left", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] uppercase font-black tracking-widest text-slate-800 block", children: "Qu\u00E1n Qu\u00E2n V\u1EC1 \u0110\u00EDch S\u1ED1 1" }), _jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 font-bold text-[10px]", children: currentMap.name })] }), _jsx("span", { className: "text-xl sm:text-2xl font-black text-slate-950 drop-shadow-sm block", children: actualWinner.name })] })] }) })), !isPicking && (actualWinner || isCompleted) && onTriggerSpin && (_jsx("div", { className: "absolute bottom-6 left-1/2 -translate-x-1/2 z-30", children: _jsxs("button", { type: "button", onClick: () => onTriggerSpin('normal'), className: "px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base sm:text-lg shadow-2xl shadow-emerald-500/40 border-2 border-emerald-300 transform active:scale-95 transition-all cursor-pointer flex items-center gap-2.5", children: [_jsx("span", { children: "\uD83C\uDFC1" }), _jsx("span", { children: "\u0110UA V\u00D2NG M\u1EDAI (B\u1EA2N \u0110\u1ED2 NG\u1EAAU NHI\u00CAN)" })] }) }))] })] }));
};
// ==================== HÀM VẼ CANVAS ĐỒ HỌA ARCADE / MECH ====================
function drawTrackBackground(ctx, camY, viewHeight, theme) {
    const bgGrad = ctx.createLinearGradient(0, camY, 0, camY + viewHeight);
    bgGrad.addColorStop(0, theme.bgGradient[0]);
    bgGrad.addColorStop(0.5, theme.bgGradient[1]);
    bgGrad.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, camY, TRACK_WIDTH, viewHeight);
    // Đường lưới dọc mờ theo chủ đề bản đồ
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    for (let x = 60; x <= 840; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, camY);
        ctx.lineTo(x, camY + viewHeight);
        ctx.stroke();
    }
}
function drawWalls(ctx, track) {
    ctx.lineCap = 'round';
    track.walls.forEach(w => {
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.thickness;
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
    });
    ctx.shadowBlur = 0;
}
function drawStartGate(ctx, isPicking) {
    ctx.save();
    if (!isPicking) {
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(60, START_GATE_Y);
        ctx.lineTo(840, START_GATE_Y);
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛔ CỔNG XUẤT PHÁT (ĐANG KHÓA)', TRACK_WIDTH / 2, START_GATE_Y - 14);
    }
    else {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(60, START_GATE_Y);
        ctx.lineTo(840, START_GATE_Y);
        ctx.stroke();
    }
    ctx.restore();
}
function drawStageMarkers(ctx, stages) {
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    stages.forEach(st => {
        ctx.fillStyle = st.color;
        ctx.shadowColor = st.color;
        ctx.shadowBlur = 8;
        ctx.fillText(`🚩 ${st.label}`, 80, st.y);
    });
    ctx.restore();
}
function drawPegs(ctx, track, now) {
    track.pegs.forEach(peg => {
        const isLit = peg.lastHitTime && now - peg.lastHitTime < 180;
        ctx.save();
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        if (isLit) {
            ctx.shadowColor = peg.glowColor || '#38bdf8';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffffff';
        }
        else {
            ctx.fillStyle = peg.glowColor || '#64748b';
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    });
}
function drawVortices(ctx, track, _now) {
    track.vortices.forEach(vt => {
        ctx.save();
        ctx.translate(vt.x, vt.y);
        // Vòng ngoài mờ
        ctx.beginPath();
        ctx.arc(0, 0, vt.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
        ctx.strokeStyle = vt.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        // Các vòng xoáy quay
        ctx.rotate(vt.angle);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, vt.radius * (0.35 + i * 0.25), 0, Math.PI * 1.4);
            ctx.strokeStyle = vt.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.rotate((Math.PI * 2) / 3);
        }
        // Tâm xoáy hút
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = vt.color;
        ctx.fill();
        ctx.restore();
    });
}
function drawBumpers(ctx, track, now) {
    track.bumpers.forEach(bp => {
        const isLit = bp.lastHitTime && now - bp.lastHitTime < 220;
        const r = bp.radius * bp.pulseScale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
        ctx.shadowColor = bp.color;
        ctx.shadowBlur = isLit ? 25 : 12;
        ctx.fillStyle = isLit ? '#ffffff' : bp.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}
function drawSpinners(ctx, track) {
    track.spinners.forEach(sp => {
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
            const angle = sp.angle + (i * Math.PI) / 2;
            ctx.save();
            ctx.rotate(angle);
            const grad = ctx.createLinearGradient(0, 0, sp.armLength, 0);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#06b6d4');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(0, -6, sp.armLength, 12, 6);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    });
}
function drawSeeSaws(ctx, track) {
    track.seeSaws.forEach(ss => {
        ctx.save();
        ctx.translate(ss.x, ss.y);
        ctx.rotate(ss.angle);
        // Cầu bập bênh bo tròn
        ctx.shadowColor = ss.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = ss.color;
        ctx.beginPath();
        ctx.roundRect(-ss.length / 2, -ss.thickness / 2, ss.length, ss.thickness, 8);
        ctx.fill();
        // Viền sáng
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Trục đỡ tam giác giữa
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(ss.x - 14, ss.y + 24);
        ctx.lineTo(ss.x + 14, ss.y + 24);
        ctx.lineTo(ss.x, ss.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}
function drawTurboPads(ctx, track, now) {
    if (!track.turboPads)
        return;
    track.turboPads.forEach(pad => {
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.rotate(pad.angle);
        // Nền dải tăng tốc phát sáng
        ctx.shadowColor = pad.glowColor;
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = pad.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-pad.length / 2, -pad.thickness / 2, pad.length, pad.thickness, 6);
        ctx.fill();
        ctx.stroke();
        // Các mũi tên neon di chuyển >>>
        const arrowCount = 3;
        const animOffset = (now * 0.004) % 1; // 0 -> 1 loop
        for (let i = 0; i < arrowCount; i++) {
            const progress = (i / arrowCount + animOffset) % 1;
            const arrowX = -pad.length / 2 + 10 + progress * (pad.length - 20);
            ctx.strokeStyle = pad.glowColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(arrowX - 5, -pad.thickness / 3.2);
            ctx.lineTo(arrowX + 5, 0);
            ctx.lineTo(arrowX - 5, pad.thickness / 3.2);
            ctx.stroke();
        }
        // Nhãn TURBO phát sáng nhỏ
        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = pad.glowColor;
        ctx.shadowBlur = 8;
        ctx.fillText('⚡TURBO', 0, -pad.thickness / 2 - 8);
        ctx.restore();
    });
}
function drawShortcutGaps(ctx, mapId) {
    // Tọa độ các khe hở đường tắt cho từng map
    const shortcutLocations = mapId === 'gear_canyon'
        ? [
            { x: 405, y: 448 },
            { x: 495, y: 670 },
            { x: 405, y: 880 },
        ]
        : [
            { x: 405, y: 3875 },
            { x: 495, y: 4135 },
            { x: 405, y: 4370 },
        ];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    shortcutLocations.forEach(loc => {
        ctx.fillText('🕳️ ĐƯỜNG TẮT ⬇', loc.x, loc.y - 12);
    });
    ctx.restore();
}
function drawFinishLine(ctx) {
    ctx.save();
    const y = FINISH_LINE_Y;
    const x1 = FINISH_NECK_X_LEFT;
    const x2 = FINISH_NECK_X_RIGHT;
    const width = x2 - x1;
    const blockSize = 12;
    for (let x = x1; x < x2; x += blockSize) {
        const isBlack = Math.floor((x - x1) / blockSize) % 2 === 0;
        ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
        ctx.fillRect(x, y - 8, blockSize, 8);
        ctx.fillStyle = isBlack ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, blockSize, 8);
    }
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(x1, y - 8, width, 16);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'black 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁 FINISH 🏁', (x1 + x2) / 2, y + 30);
    ctx.restore();
}
function drawMarbles(ctx, marbles, now) {
    const sorted = [...marbles].sort((a, b) => a.y - b.y);
    sorted.forEach(m => {
        ctx.save();
        // 0. Hiệu ứng hào quang Turbo Boost khi đang bứt tốc
        if (m.turboUntil && m.turboUntil > now) {
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', m.x - m.radius - 6, m.y - m.radius);
        }
        // 1. Thân quả banh màu phẳng rõ nét (Solid color, không bóng đổ theo sau, không hiệu ứng chói sáng)
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        // 2. Viền phân cách trắng tinh tế rõ ràng
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // 3. Nếu là quán quân đã cán đích: Vương miện và viền vàng kim
        if (m.hasFinished && m.rank === 1) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', m.x, m.y - m.radius - 8);
        }
        // 4. Tên học sinh hiển thị to, rõ nét, font đậm tương phản cao
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 4;
        ctx.fillText(m.displayName, m.x, m.y);
        ctx.restore();
    });
}
//# sourceMappingURL=MarbleRaceMode.js.map