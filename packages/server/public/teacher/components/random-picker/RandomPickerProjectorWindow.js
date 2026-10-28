import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { FireworksCanvas } from './effects/FireworksCanvas.js';
import { PICKER_MODES } from './modes/index.js';
import { soundManager } from './sound.js';
export const RandomPickerProjectorWindow = () => {
    const [students, setStudents] = useState([]);
    const [queue, setQueue] = useState([]);
    const [settings, setSettings] = useState({
        mode: 'card_flip',
        correctExp: 10,
        excludeCalled: true,
        soundEnabled: true,
        animationDurationMs: 1500,
    });
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isPicking, setIsPicking] = useState(false);
    const [hasCalledAny, setHasCalledAny] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [cards, setCards] = useState([
        { id: 1, student: null, isRevealed: false, isTarget: false },
        { id: 2, student: null, isRevealed: false, isTarget: false },
        { id: 3, student: null, isRevealed: false, isTarget: false },
        { id: 4, student: null, isRevealed: false, isTarget: false },
        { id: 5, student: null, isRevealed: false, isTarget: false },
    ]);
    const [boxes, setBoxes] = useState([
        { id: 1, student: null, status: 'idle', isTarget: false },
        { id: 2, student: null, status: 'idle', isTarget: false },
        { id: 3, student: null, status: 'idle', isTarget: false },
    ]);
    const [slotState, setSlotState] = useState({
        tens: 0,
        units: 0,
        studentNumber: 0,
        targetStudent: null,
        isSpinningTens: false,
        isSpinningUnits: false,
    });
    const [balloons, setBalloons] = useState([]);
    const [magicCards, setMagicCards] = useState([]);
    const channelRef = useRef(null);
    useEffect(() => {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const ch = new BroadcastChannel('educlass_random_picker');
            channelRef.current = ch;
            ch.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === 'SYNC_STATE') {
                    setStudents(msg.payload.students);
                    setQueue(msg.payload.queue);
                    setSettings(msg.payload.settings);
                    setSelectedStudent(msg.payload.selectedStudent);
                    setIsPicking(msg.payload.isPicking);
                    setCards(msg.payload.cards);
                    if (msg.payload.boxes)
                        setBoxes(msg.payload.boxes);
                    if (msg.payload.slotState)
                        setSlotState(msg.payload.slotState);
                    if (msg.payload.balloons)
                        setBalloons(msg.payload.balloons);
                    if (msg.payload.magicCards)
                        setMagicCards(msg.payload.magicCards);
                    if (typeof msg.payload.showFireworks === 'boolean') {
                        setShowFireworks(msg.payload.showFireworks);
                    }
                }
                else if (msg.type === 'TRIGGER_PICK') {
                    handleExecutePick(msg.payload.targetStudent, msg.payload.targetCardIndex, msg.payload.dummyStudents);
                }
                else if (msg.type === 'TRIGGER_FIREWORKS') {
                    setShowFireworks(true);
                    setIsPicking(false);
                }
                else if (msg.type === 'RESET') {
                    setSelectedStudent(null);
                    setIsPicking(false);
                    setHasCalledAny(false);
                    setShowFireworks(false);
                }
            };
            return () => {
                ch.close();
            };
        }
        return undefined;
    }, []);
    const handleExecutePick = (target, targetIndex, dummyStudents) => {
        setIsPicking(true);
        setSelectedStudent(target);
        setHasCalledAny(true);
        setShowFireworks(false);
        if (settings.mode === 'duck_race') {
            window.setTimeout(() => {
                setShowFireworks(true);
                if (settings.soundEnabled) {
                    soundManager.playWinner();
                    soundManager.playFireworkBurst();
                }
            }, 9100);
            window.setTimeout(() => {
                setIsPicking(false);
            }, 10500);
            return;
        }
        if (settings.mode === 'marble_race') {
            return;
        }
        if (settings.mode === 'duck_hunt') {
            return;
        }
        if (settings.mode === 'elimination_grid') {
            return;
        }
        if (settings.mode === 'ball_elimination') {
            return;
        }
        if (settings.soundEnabled) {
            soundManager.playCardFlip();
        }
        let dummyPtr = 0;
        const initialCards = Array.from({ length: 5 }, (_, i) => {
            const isTgt = i === targetIndex;
            return {
                id: i + 1,
                student: isTgt ? target : dummyStudents[dummyPtr++] || null,
                isRevealed: false,
                isTarget: isTgt,
            };
        });
        setCards(initialCards);
        window.setTimeout(() => {
            setCards(prev => prev.map((c, i) => (i === targetIndex ? { ...c, isRevealed: true } : c)));
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            setIsPicking(false);
        }, settings.animationDurationMs);
    };
    const handleTriggerPickProjector = (strategy = 'normal') => {
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: selectedStudent || {
                        id: 'demo',
                        name: 'Học sinh',
                        academicPerformance: 'dat',
                        alreadyCalled: false,
                    },
                    targetCardIndex: 2,
                    dummyStudents: [],
                },
            });
        }
    };
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            void document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        }
        else {
            void document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    const CurrentModeComponent = PICKER_MODES[settings.mode]?.component || PICKER_MODES.card_flip.component;
    return (_jsxs("div", { className: "w-screen h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-6 select-none overflow-hidden relative", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.2),transparent_70%)] pointer-events-none" }), _jsx(FireworksCanvas, { active: showFireworks, onFinish: () => setShowFireworks(false) }), _jsxs("div", { className: "z-10 flex items-center justify-between border-b border-indigo-900/60 pb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-4xl", children: "\uD83C\uDFB2" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-black tracking-tight text-white drop-shadow", children: "EduClass \u2014 Quay S\u1ED1 G\u1ECDi H\u1ECDc Sinh" }), _jsx("p", { className: "text-sm text-indigo-300 font-medium", children: "Ch\u1EBF \u0111\u1ED9 tr\u00ECnh chi\u1EBFu m\u00E1y chi\u1EBFu & m\u00E0n h\u00ECnh t\u01B0\u01A1ng t\u00E1c" })] })] }), _jsx("button", { type: "button", onClick: toggleFullscreen, className: "px-4 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 font-semibold text-sm transition", children: isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình F11' })] }), _jsxs("div", { className: "z-10 flex-1 flex flex-col items-center justify-center my-4", children: [_jsx("div", { className: "mb-4 text-center", children: _jsx("span", { className: "text-base uppercase tracking-widest font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-5 py-1.5 rounded-full shadow-lg", children: PICKER_MODES[settings.mode]?.name || '🃏 Lật Thẻ Bài Thần Bí' }) }), _jsx(CurrentModeComponent, { isPicking: isPicking, selectedStudent: selectedStudent, candidates: students, cards: cards, onFlipCard: () => { }, boxes: boxes, slotState: slotState, balloons: balloons, magicCards: magicCards, onEliminationComplete: () => {
                            setShowFireworks(true);
                            setIsPicking(false);
                        }, onMarbleRaceComplete: winnerStudent => {
                            setSelectedStudent(winnerStudent);
                            setShowFireworks(true);
                            if (settings.soundEnabled) {
                                soundManager.playWinner();
                                soundManager.playFireworkBurst();
                            }
                            window.setTimeout(() => {
                                setIsPicking(false);
                            }, 2200);
                        }, onDuckHuntComplete: winnerStudent => {
                            setSelectedStudent(winnerStudent);
                            setShowFireworks(true);
                            if (settings.soundEnabled) {
                                soundManager.playWinner();
                                soundManager.playFireworkBurst();
                            }
                            window.setTimeout(() => {
                                setIsPicking(false);
                            }, 1500);
                        }, isCompleted: !isPicking && selectedStudent !== null, isFullscreen: true }), settings.mode !== 'duck_hunt' && (_jsx("div", { className: "mt-8 flex flex-col items-center", children: _jsxs("div", { className: "inline-flex items-stretch rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all hover:border-amber-300", children: [_jsxs("button", { type: "button", onClick: () => handleTriggerPickProjector('normal'), disabled: isPicking, className: "px-10 py-4 font-black text-2xl text-white tracking-wide flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer", children: [_jsx("span", { className: "text-3xl", children: "\uD83C\uDFB2" }), _jsx("span", { children: hasCalledAny ? 'Học sinh tiếp theo' : 'Học sinh đầu tiên' })] }), _jsx("button", { type: "button", onClick: () => handleTriggerPickProjector('bias_good'), disabled: isPicking, className: "w-12 border-l border-white/20 bg-amber-600/40 hover:bg-amber-600/70 text-amber-100 flex items-center justify-center cursor-pointer disabled:opacity-50", "aria-label": "Ch\u1ECDn ng\u1EABu nhi\u00EAn", children: _jsx("span", { className: "text-xs opacity-40", children: "\u2726" }) })] }) }))] }), _jsxs("div", { className: "z-10 border-t border-indigo-900/60 pt-3 flex items-center justify-between text-xs text-indigo-400", children: [_jsx("div", { children: queue.length > 0 ? (_jsxs("span", { className: "text-indigo-200 font-medium", children: ["\u23F3 \u0110ang c\u00F3 ", queue.length, " b\u1EA1n tr\u00EAn b\u1EA3ng l\u00E0m b\u00E0i:", ' ', queue.map(q => q.student.name).join(', ')] })) : (_jsx("span", { children: "EduClass v2 \u2014 Ph\u1EA7n m\u1EC1m t\u01B0\u01A1ng t\u00E1c l\u1EDBp h\u1ECDc offline" })) }), _jsx("div", { className: "font-mono text-indigo-400", children: "Tr\u1EA1ng th\u00E1i: \u0110\u00E3 k\u1EBFt n\u1ED1i v\u1EDBi m\u00E1y gi\u00E1o vi\u00EAn" })] })] }));
};
//# sourceMappingURL=RandomPickerProjectorWindow.js.map