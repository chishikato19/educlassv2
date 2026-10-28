import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickStudentFromCandidates, } from '@educlass/protocol';
import { Button, Card } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
import { FireworksCanvas } from './effects/FireworksCanvas.js';
import { PICKER_MODES } from './modes/index.js';
import { QueueBar } from './QueueBar.js';
import { ResultModal } from './ResultModal.js';
import { soundManager } from './sound.js';
// Toàn bộ các trò chơi hợp lệ trong Chế độ Ngẫu nhiên
const ALL_RANDOM_SUB_MODES = [
    'card_flip',
    'mystery_box',
    'slot_machine',
    'name_roller',
    'balloon_pop',
    'magic_deck',
    'duck_race',
    'duck_hunt',
    'elimination_grid',
    'ball_elimination',
    'marble_race',
];
// Các trò chơi hỗ trợ định trước kết quả học sinh giỏi (loại trừ Pinball marble_race và Bắn vịt duck_hunt)
const BIAS_GOOD_COMPATIBLE_SUB_MODES = [
    'card_flip',
    'mystery_box',
    'slot_machine',
    'name_roller',
    'balloon_pop',
    'magic_deck',
    'duck_race',
    'elimination_grid',
    'ball_elimination',
];
export const RandomPickerTab = ({ classes, selectedClassId, students, activeSessionId, participants = [], onShowToast, initialSettings, }) => {
    // 1. Nguồn danh sách học sinh: 'class' hoặc 'excel'
    const [sourceType, setSourceType] = useState('class');
    const [currentClassId, setCurrentClassId] = useState(selectedClassId || classes[0]?.id || '');
    const [excelText, setExcelText] = useState('');
    // 2. Cài đặt quay - Mặc định là Chế độ Ngẫu nhiên
    const [settings, setSettings] = useState({
        mode: 'random_mode',
        correctExp: 10,
        excludeCalled: true,
        soundEnabled: true,
        animationDurationMs: 1500,
        ...initialSettings,
    });
    // Trò chơi con hiện tại trong chế độ Ngẫu nhiên (null nếu chưa quay lượt nào -> hiện sân khấu chào đón ban đầu)
    const [activeRandomSubMode, setActiveRandomSubMode] = useState(null);
    // Ghi nhớ trò chơi của lượt trước để không lặp lại ở lượt kế tiếp
    const [lastPlayedMode, setLastPlayedMode] = useState(null);
    // 3. Danh sách học sinh trong pool quay
    const [pickerStudents, setPickerStudents] = useState([]);
    const [queue, setQueue] = useState([]);
    // 4. Trạng thái quá trình quay
    const [isPicking, setIsPicking] = useState(false);
    const [hasCalledAny, setHasCalledAny] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    // Trạng thái chờ giáo viên tự tay bấm lật thẻ (Chế độ Card Flip)
    const [isWaitingForManualFlip, setIsWaitingForManualFlip] = useState(false);
    const [pendingPick, setPendingPick] = useState(null);
    // 5. Thẻ bài cho chế độ Card Flip (5 lá)
    const [cards, setCards] = useState([
        { id: 1, student: null, isRevealed: false, isTarget: false },
        { id: 2, student: null, isRevealed: false, isTarget: false },
        { id: 3, student: null, isRevealed: false, isTarget: false },
        { id: 4, student: null, isRevealed: false, isTarget: false },
        { id: 5, student: null, isRevealed: false, isTarget: false },
    ]);
    // 6. Hộp quà bí mật cho chế độ Mystery Box (3 hộp)
    const [boxes, setBoxes] = useState([
        { id: 1, student: null, status: 'idle', isTarget: false },
        { id: 2, student: null, status: 'idle', isTarget: false },
        { id: 3, student: null, status: 'idle', isTarget: false },
    ]);
    const [isWaitingForBoxSelection, setIsWaitingForBoxSelection] = useState(false);
    const [pendingMysteryPick, setPendingMysteryPick] = useState(null);
    // 7. Máy quay số cho chế độ Slot Machine (2 số: Hàng chục & Đơn vị)
    const [slotState, setSlotState] = useState({
        tens: 0,
        units: 0,
        studentNumber: 0,
        targetStudent: null,
        isSpinningTens: false,
        isSpinningUnits: false,
    });
    // 8. Bắn bóng bay (Balloon Pop)
    const [balloons, setBalloons] = useState([]);
    const [isWaitingForBalloon, setIsWaitingForBalloon] = useState(false);
    const [pendingBalloonPick, setPendingBalloonPick] = useState(null);
    // 9. Bộ bài ma thuật (Magic Card Deck 3x3)
    const [magicCards, setMagicCards] = useState([]);
    const [isWaitingForMagicCard, setIsWaitingForMagicCard] = useState(false);
    const [isShufflingMagicDeck, setIsShufflingMagicDeck] = useState(false);
    const [pendingMagicPick, setPendingMagicPick] = useState(null);
    const arenaRef = useRef(null);
    const channelRef = useRef(null);
    // Khởi tạo BroadcastChannel để đồng bộ với Màn hình 2
    useEffect(() => {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const ch = new BroadcastChannel('educlass_random_picker');
            channelRef.current = ch;
            ch.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === 'TRIGGER_PICK') {
                    // Projector kích hoạt
                }
                else if (msg.type === 'CONFIRM_RESULT') {
                    handleConfirmStudentResult(msg.payload.studentId, msg.payload.action, msg.payload.expGained);
                }
            };
            return () => {
                ch.close();
            };
        }
        return undefined;
    }, []);
    // Lắng nghe sự kiện fullscreen toàn màn hình của trình duyệt
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    // Broadcast state sang máy chiếu
    const broadcastState = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'SYNC_STATE',
                payload: {
                    students: pickerStudents,
                    queue,
                    settings,
                    selectedStudent,
                    isPicking,
                    isCompleted: !isPicking && selectedStudent !== null,
                    cards,
                    boxes,
                    slotState,
                    balloons,
                    magicCards,
                    showFireworks,
                },
            });
        }
    }, [
        pickerStudents,
        queue,
        settings,
        selectedStudent,
        isPicking,
        cards,
        boxes,
        slotState,
        balloons,
        magicCards,
        showFireworks,
    ]);
    useEffect(() => {
        broadcastState();
    }, [broadcastState]);
    // Cập nhật pool học sinh khi đổi nguồn từ Lớp học
    useEffect(() => {
        if (sourceType === 'class') {
            const pool = students.map(s => ({
                id: s.id,
                name: s.fullName,
                code: s.code || undefined,
                academicPerformance: s.academicPerformance || 'dat',
                alreadyCalled: false,
                score: 0,
            }));
            setPickerStudents(pool);
            setHasCalledAny(false);
            setSelectedStudent(null);
            setIsWaitingForManualFlip(false);
            setIsWaitingForBoxSelection(false);
            setPendingPick(null);
            setPendingMysteryPick(null);
            setActiveRandomSubMode(null);
            setLastPlayedMode(null);
            resetAllModes();
        }
    }, [students, sourceType]);
    // Phân tích dữ liệu copy dán từ Excel
    const handleParseExcel = () => {
        if (!excelText.trim()) {
            onShowToast('Vui lòng dán danh sách học sinh từ Excel');
            return;
        }
        const lines = excelText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
        const parsed = [];
        lines.forEach((line, index) => {
            const parts = line
                .split('\t')
                .map(p => p.trim())
                .filter(Boolean);
            let name = '';
            let code = '';
            let academicPerformance = 'dat';
            if (parts.length >= 3) {
                code = parts[0] ?? '';
                name = parts[1] ?? '';
                const perfRaw = (parts[2] ?? '').toLowerCase();
                if (perfRaw.includes('tốt') || perfRaw === 'tot')
                    academicPerformance = 'tot';
                else if (perfRaw.includes('khá') || perfRaw === 'kha')
                    academicPerformance = 'kha';
                else if (perfRaw.includes('chưa') || perfRaw === 'chua_dat')
                    academicPerformance = 'chua_dat';
            }
            else if (parts.length === 2) {
                code = parts[0] ?? '';
                name = parts[1] ?? '';
            }
            else {
                const single = parts[0] ?? '';
                const match = single.match(/^(\d+)[.\s-]+(.+)$/);
                if (match && match[2]) {
                    code = `HS${match[1]}`;
                    name = match[2].trim();
                }
                else {
                    name = single;
                    code = `HS${index + 1}`;
                }
            }
            if (name) {
                parsed.push({
                    id: `excel_${index}_${Date.now()}`,
                    name,
                    code,
                    academicPerformance,
                    alreadyCalled: false,
                    score: 0,
                });
            }
        });
        if (parsed.length === 0) {
            onShowToast('Không nhận diện được học sinh nào từ văn bản đã dán');
            return;
        }
        setPickerStudents(parsed);
        setHasCalledAny(false);
        setSelectedStudent(null);
        setIsWaitingForManualFlip(false);
        setIsWaitingForBoxSelection(false);
        setPendingPick(null);
        setPendingMysteryPick(null);
        setActiveRandomSubMode(null);
        setLastPlayedMode(null);
        resetAllModes();
        onShowToast(`Đã nạp ${parsed.length} học sinh từ bảng Excel!`);
    };
    const resetCards = () => {
        setCards([
            { id: 1, student: null, isRevealed: false, isTarget: false },
            { id: 2, student: null, isRevealed: false, isTarget: false },
            { id: 3, student: null, isRevealed: false, isTarget: false },
            { id: 4, student: null, isRevealed: false, isTarget: false },
            { id: 5, student: null, isRevealed: false, isTarget: false },
        ]);
    };
    const resetBoxes = () => {
        setBoxes([
            { id: 1, student: null, status: 'idle', isTarget: false },
            { id: 2, student: null, status: 'idle', isTarget: false },
            { id: 3, student: null, status: 'idle', isTarget: false },
        ]);
    };
    const resetSlot = () => {
        setSlotState({
            tens: 0,
            units: 0,
            studentNumber: 0,
            targetStudent: null,
            isSpinningTens: false,
            isSpinningUnits: false,
        });
    };
    const resetBalloons = () => {
        const colors = [
            'from-rose-500 via-red-500 to-rose-700',
            'from-sky-400 via-blue-500 to-indigo-600',
            'from-emerald-400 via-green-500 to-emerald-700',
            'from-amber-400 via-yellow-500 to-amber-600',
            'from-purple-400 via-violet-500 to-purple-700',
            'from-pink-400 via-rose-400 to-pink-600',
            'from-orange-400 via-amber-500 to-orange-600',
            'from-teal-400 via-cyan-500 to-teal-700',
        ];
        setBalloons(Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            color: colors[i % colors.length] || '',
            student: null,
            isPopped: false,
            isTarget: false,
        })));
        setIsWaitingForBalloon(false);
        setPendingBalloonPick(null);
    };
    const resetMagicCards = () => {
        setMagicCards(Array.from({ length: 9 }, (_, i) => ({
            id: i + 1,
            student: null,
            isRevealed: false,
            isTarget: false,
            positionIndex: i,
        })));
        setIsWaitingForMagicCard(false);
        setIsShufflingMagicDeck(false);
        setPendingMagicPick(null);
    };
    const resetAllModes = () => {
        resetCards();
        resetBoxes();
        resetSlot();
        resetBalloons();
        resetMagicCards();
        setSelectedStudent(null);
        setIsWaitingForManualFlip(false);
        setIsWaitingForBoxSelection(false);
        setIsWaitingForBalloon(false);
        setIsWaitingForMagicCard(false);
        setIsShufflingMagicDeck(false);
        setPendingPick(null);
        setPendingMysteryPick(null);
        setPendingBalloonPick(null);
        setPendingMagicPick(null);
        setShowFireworks(false);
    };
    // Tính toán số lượng còn lại
    const availableStudents = useMemo(() => {
        if (!settings.excludeCalled)
            return pickerStudents;
        return pickerStudents.filter(s => !s.alreadyCalled);
    }, [pickerStudents, settings.excludeCalled]);
    const calledCount = useMemo(() => {
        return pickerStudents.filter(s => s.alreadyCalled).length;
    }, [pickerStudents]);
    // Thuật toán chọn trò chơi ngẫu nhiên cho từng lượt (đáp ứng luật không lặp lại trò của lượt trước và loại trừ Pinball/Bắn vịt khi chọn học sinh giỏi)
    const pickRandomSubMode = useCallback((strategy) => {
        const basePool = strategy === 'bias_good' ? BIAS_GOOD_COMPATIBLE_SUB_MODES : ALL_RANDOM_SUB_MODES;
        let candidatePool = basePool;
        if (lastPlayedMode && basePool.length > 1) {
            const filtered = basePool.filter(m => m !== lastPlayedMode);
            if (filtered.length > 0) {
                candidatePool = filtered;
            }
        }
        const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)] ?? 'card_flip';
        return chosen;
    }, [lastPlayedMode]);
    // Điều hướng nút Quay theo từng Mode
    const handleTriggerPick = (strategy = 'normal') => {
        let modeToExecute = settings.mode;
        if (settings.mode === 'random_mode') {
            const chosenSubMode = pickRandomSubMode(strategy);
            setLastPlayedMode(chosenSubMode);
            setActiveRandomSubMode(chosenSubMode);
            modeToExecute = chosenSubMode;
            resetAllModes();
        }
        switch (modeToExecute) {
            case 'mystery_box':
                handleTriggerPickMysteryBox(strategy);
                break;
            case 'slot_machine':
                handleTriggerSpinSlot(strategy);
                break;
            case 'name_roller':
                handleTriggerPickNameRoller(strategy);
                break;
            case 'balloon_pop':
                handleTriggerPickBalloon(strategy);
                break;
            case 'magic_deck':
                handleTriggerPickMagicDeck(strategy);
                break;
            case 'duck_race':
                handleTriggerPickDuckRace(strategy);
                break;
            case 'duck_hunt':
                handleTriggerPickDuckHunt(strategy);
                break;
            case 'elimination_grid':
                handleTriggerPickEliminationGrid(strategy);
                break;
            case 'ball_elimination':
                handleTriggerPickBallElimination(strategy);
                break;
            case 'marble_race':
                handleTriggerPickMarbleRace(strategy);
                break;
            case 'card_flip':
            default:
                handleTriggerPickCardFlip(strategy);
                break;
        }
    };
    // ==================== MODE 1: LẬT THẺ BÀI (CARD FLIP) ====================
    const handleTriggerPickCardFlip = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        const others = pickerStudents.filter(s => s.id !== target.id);
        const dummyStudents = [];
        for (let i = 0; i < 4; i++) {
            if (others.length > 0) {
                const randOther = others[Math.floor(Math.random() * others.length)];
                if (randOther)
                    dummyStudents.push(randOther);
            }
        }
        resetCards();
        setSelectedStudent(null);
        setShowFireworks(false);
        setIsWaitingForManualFlip(true);
        setPendingPick({ target, dummyStudents, strategy });
        if (settings.soundEnabled) {
            soundManager.playCardFlip();
        }
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: target,
                    targetCardIndex: -1,
                    dummyStudents,
                },
            });
        }
    };
    const handleFlipCardManual = (cardIndex) => {
        if (isPicking)
            return;
        const clickedCard = cards[cardIndex];
        if (clickedCard?.isRevealed)
            return;
        let pick = pendingPick;
        if (!pick) {
            if (pickerStudents.length === 0) {
                onShowToast('Chưa có học sinh nào trong danh sách quay!');
                return;
            }
            const target = pickStudentFromCandidates(pickerStudents, 'normal', settings.excludeCalled);
            if (!target) {
                onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
                return;
            }
            const others = pickerStudents.filter(s => s.id !== target.id);
            const dummyStudents = [];
            for (let i = 0; i < 4; i++) {
                if (others.length > 0) {
                    const randOther = others[Math.floor(Math.random() * others.length)];
                    if (randOther)
                        dummyStudents.push(randOther);
                }
            }
            pick = { target, dummyStudents, strategy: 'normal' };
        }
        setIsPicking(true);
        setIsWaitingForManualFlip(false);
        setSelectedStudent(pick.target);
        setHasCalledAny(true);
        setPendingPick(null);
        setShowFireworks(true);
        if (settings.soundEnabled) {
            soundManager.playWinner();
            soundManager.playFireworkBurst();
        }
        let dummyPtr = 0;
        const nextCards = Array.from({ length: 5 }, (_, i) => {
            const isTgt = i === cardIndex;
            return {
                id: i + 1,
                student: isTgt ? pick.target : pick.dummyStudents[dummyPtr++] || null,
                isRevealed: true,
                isTarget: isTgt,
            };
        });
        setCards(nextCards);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'CARD_FLIPPED',
                payload: { cardIndex },
            });
        }
        const delay = Math.min(settings.animationDurationMs, 800);
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, delay);
    };
    // ==================== MODE 2: HỘP QUÀ BÍ MẬT (MYSTERY BOX) ====================
    const handleTriggerPickMysteryBox = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        const others = pickerStudents.filter(s => s.id !== target.id);
        const dummyStudents = [];
        for (let i = 0; i < 2; i++) {
            if (others.length > 0) {
                const randOther = others[Math.floor(Math.random() * others.length)];
                if (randOther)
                    dummyStudents.push(randOther);
            }
        }
        resetBoxes();
        setSelectedStudent(null);
        setShowFireworks(false);
        setIsWaitingForBoxSelection(true);
        setPendingMysteryPick({ target, dummyStudents, strategy });
        if (settings.soundEnabled) {
            soundManager.playClick();
        }
    };
    const handleSelectMysteryBox = (boxIndex) => {
        if (isPicking)
            return;
        const clickedBox = boxes[boxIndex];
        if (clickedBox && clickedBox.status !== 'idle')
            return;
        let pick = pendingMysteryPick;
        if (!pick) {
            if (pickerStudents.length === 0) {
                onShowToast('Chưa có học sinh nào trong danh sách quay!');
                return;
            }
            const target = pickStudentFromCandidates(pickerStudents, 'normal', settings.excludeCalled);
            if (!target) {
                onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
                return;
            }
            const others = pickerStudents.filter(s => s.id !== target.id);
            const dummyStudents = [];
            for (let i = 0; i < 2; i++) {
                if (others.length > 0) {
                    const randOther = others[Math.floor(Math.random() * others.length)];
                    if (randOther)
                        dummyStudents.push(randOther);
                }
            }
            pick = { target, dummyStudents, strategy: 'normal' };
        }
        setIsPicking(true);
        setIsWaitingForBoxSelection(false);
        setHasCalledAny(true);
        if (settings.soundEnabled) {
            soundManager.playBoxSelect();
        }
        // Đánh dấu hộp giáo viên chọn
        setBoxes(prev => prev.map((b, i) => i === boxIndex
            ? { ...b, status: 'selected', isTarget: true, student: pick.target }
            : { ...b, isTarget: false }));
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'BOX_SELECTED',
                payload: { boxIndex },
            });
        }
        // Nhịp 1: Sau 700ms, 2 hộp KHÔNG được chọn rung và mở trước
        window.setTimeout(() => {
            let dummyPtr = 0;
            setBoxes(prev => prev.map((b, i) => {
                if (i === boxIndex)
                    return b;
                return {
                    ...b,
                    status: 'opened_loser',
                    student: pick.dummyStudents[dummyPtr++] || null,
                };
            }));
            if (settings.soundEnabled) {
                soundManager.playBoxOpenLoser();
            }
        }, 700);
        // Nhịp 2: Sau 1800ms, hộp trúng thưởng BẬT TUNG NẮP và nổ pháo hoa!
        window.setTimeout(() => {
            setBoxes(prev => prev.map((b, i) => (i === boxIndex ? { ...b, status: 'opened_winner' } : b)));
            setSelectedStudent(pick.target);
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playBoxOpenWinner();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 1800);
        // Nhịp 3: Sau 2800ms, mở ResultModal cho điểm
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
            setPendingMysteryPick(null);
        }, 2800);
    };
    // ==================== MODE 3: MÁY QUAY SỐ (SLOT MACHINE) ====================
    const handleTriggerSpinSlot = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        const targetIdx = pickerStudents.findIndex(s => s.id === target.id);
        const studentNum = targetIdx >= 0 ? targetIdx + 1 : Math.floor(Math.random() * 99) + 1;
        const numToDisplay = studentNum % 100;
        const targetTens = Math.floor(numToDisplay / 10);
        const targetUnits = numToDisplay % 10;
        setIsPicking(true);
        setSelectedStudent(null);
        setShowFireworks(false);
        setHasCalledAny(true);
        setSlotState({
            tens: targetTens,
            units: targetUnits,
            studentNumber: studentNum,
            targetStudent: target,
            isSpinningTens: true,
            isSpinningUnits: true,
        });
        let tickTimer = null;
        if (settings.soundEnabled) {
            tickTimer = setInterval(() => {
                soundManager.playSlotSpin();
            }, 100);
        }
        // Nhịp 1: Sau 2500ms, Hàng chục phanh lại theo GSAP
        window.setTimeout(() => {
            if (settings.soundEnabled) {
                soundManager.playSlotStop();
            }
        }, 2500);
        // Nhịp 2: Sau 3800ms, Hàng đơn vị phanh lại theo GSAP -> Chốt số & nổ pháo hoa
        window.setTimeout(() => {
            if (tickTimer)
                clearInterval(tickTimer);
            setSlotState(prev => ({
                ...prev,
                isSpinningTens: false,
                isSpinningUnits: false,
            }));
            setSelectedStudent(target);
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playSlotStop();
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 3800);
        // Nhịp 3: Sau 4800ms, mở ResultModal
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 4800);
    };
    // ==================== MODE 4: QUAY TÊN CHẬM DẦN (NAME ROLLER) ====================
    const handleTriggerPickNameRoller = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        setIsPicking(true);
        setSelectedStudent(target);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (settings.soundEnabled) {
            soundManager.playSlotSpin();
        }
        // Sau 5600ms GSAP 3 nhịp kịch tính hoàn tất -> nổ pháo hoa và âm thanh chúc mừng
        window.setTimeout(() => {
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 5600);
        // Sau 6800ms mở ResultModal
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 6800);
    };
    // ==================== MODE 5: BẮN BÓNG BAY (BALLOON POP) ====================
    const handleTriggerPickBalloon = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        resetBalloons();
        setSelectedStudent(null);
        setShowFireworks(false);
        setIsWaitingForBalloon(true);
        setPendingBalloonPick({ target, strategy });
        if (settings.soundEnabled) {
            soundManager.playClick();
        }
    };
    const handlePopBalloon = (balloonIndex) => {
        if (isPicking)
            return;
        const clickedBalloon = balloons[balloonIndex];
        if (clickedBalloon && clickedBalloon.isPopped)
            return;
        let pick = pendingBalloonPick;
        if (!pick) {
            if (pickerStudents.length === 0) {
                onShowToast('Chưa có học sinh nào trong danh sách quay!');
                return;
            }
            const target = pickStudentFromCandidates(pickerStudents, 'normal', settings.excludeCalled);
            if (!target) {
                onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
                return;
            }
            pick = { target, strategy: 'normal' };
        }
        setIsPicking(true);
        setIsWaitingForBalloon(false);
        setHasCalledAny(true);
        if (settings.soundEnabled) {
            soundManager.playBalloonPop();
        }
        // Làm nổ quả bóng được chọn và gắn học sinh trúng
        setBalloons(prev => prev.map((b, i) => i === balloonIndex ? { ...b, isPopped: true, isTarget: true, student: pick.target } : b));
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'BALLOON_POPPED',
                payload: { balloonIndex },
            });
        }
        // Sau 800ms nổ pháo hoa
        window.setTimeout(() => {
            setSelectedStudent(pick.target);
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 800);
        // Sau 1800ms mở ResultModal
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
            setPendingBalloonPick(null);
        }, 1800);
    };
    // ==================== MODE 6: BỘ BÀI MA THUẬT (MAGIC DECK 3x3) ====================
    const handleTriggerPickMagicDeck = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        const others = pickerStudents.filter(s => s.id !== target.id);
        const dummyStudents = [];
        for (let i = 0; i < 8; i++) {
            if (others.length > 0) {
                const randOther = others[Math.floor(Math.random() * others.length)];
                if (randOther)
                    dummyStudents.push(randOther);
            }
        }
        resetMagicCards();
        setSelectedStudent(null);
        setShowFireworks(false);
        setIsShufflingMagicDeck(true);
        setIsWaitingForMagicCard(false);
        setPendingMagicPick({ target, dummyStudents, strategy });
        if (settings.soundEnabled) {
            soundManager.playCardShuffle();
        }
        // Thời gian xào bài và chia bài trong MagicDeckMode là 2800ms
        window.setTimeout(() => {
            setIsShufflingMagicDeck(false);
            setIsWaitingForMagicCard(true);
        }, 2800);
    };
    const handleSelectMagicCard = (cardIndex) => {
        if (isPicking || isShufflingMagicDeck)
            return;
        const clickedCard = magicCards[cardIndex];
        if (clickedCard && clickedCard.isRevealed)
            return;
        let pick = pendingMagicPick;
        if (!pick) {
            if (pickerStudents.length === 0) {
                onShowToast('Chưa có học sinh nào trong danh sách quay!');
                return;
            }
            const target = pickStudentFromCandidates(pickerStudents, 'normal', settings.excludeCalled);
            if (!target) {
                onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
                return;
            }
            const others = pickerStudents.filter(s => s.id !== target.id);
            const dummyStudents = [];
            for (let i = 0; i < 8; i++) {
                if (others.length > 0) {
                    const randOther = others[Math.floor(Math.random() * others.length)];
                    if (randOther)
                        dummyStudents.push(randOther);
                }
            }
            pick = { target, dummyStudents, strategy: 'normal' };
        }
        setIsPicking(true);
        setIsWaitingForMagicCard(false);
        setHasCalledAny(true);
        if (settings.soundEnabled) {
            soundManager.playCardFlip();
        }
        let dummyPtr = 0;
        setMagicCards(prev => prev.map((c, i) => {
            if (i === cardIndex) {
                return { ...c, isRevealed: true, isTarget: true, student: pick.target };
            }
            return {
                ...c,
                student: pick.dummyStudents[dummyPtr++] || null,
            };
        }));
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'MAGIC_CARD_SELECTED',
                payload: { cardIndex },
            });
        }
        // Sau 800ms nổ pháo hoa
        window.setTimeout(() => {
            setSelectedStudent(pick.target);
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 800);
        // Sau 1800ms mở ResultModal
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
            setPendingMagicPick(null);
        }, 1800);
    };
    // ==================== MODE 7: ĐUA VỊT (DUCK RACE) ====================
    const handleTriggerPickDuckRace = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        setIsPicking(true);
        setSelectedStudent(target);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: target,
                    targetCardIndex: -1,
                    dummyStudents: [],
                },
            });
        }
        // Nhịp 1: Sau 9100ms (vịt chạm đích), nổ pháo hoa và âm thanh chiến thắng
        window.setTimeout(() => {
            setShowFireworks(true);
            if (settings.soundEnabled) {
                soundManager.playWinner();
                soundManager.playFireworkBurst();
            }
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
            }
        }, 9100);
        // Nhịp 2: Sau 10500ms, mở ResultModal để thầy cô chấm điểm EXP hoặc đưa vào hàng chờ
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 10500);
    };
    // ==================== MODE 8: BẮN VỊT (DUCK HUNT) ====================
    const handleDuckHuntComplete = useCallback((winnerStudent) => {
        setSelectedStudent(winnerStudent);
        setShowFireworks(true);
        if (settings.soundEnabled) {
            soundManager.playWinner();
            soundManager.playFireworkBurst();
        }
        if (channelRef.current) {
            channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
        }
        // Mở ResultModal để thầy cô chấm điểm EXP hoặc đưa vào hàng chờ
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 1500);
    }, [settings.soundEnabled]);
    const handleTriggerPickDuckHunt = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        // Không chọn trước người được chọn, để DuckHuntMode tự quét và ngắm bắn đúng chú vịt đang bơi trên màn hình
        setIsPicking(true);
        setSelectedStudent(null);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: null,
                    targetCardIndex: -1,
                    dummyStudents: [],
                },
            });
        }
    };
    // ==================== MODE 9: ĐẤU TRƯỜNG SINH TỒN (ELIMINATION GRID) ====================
    const handleEliminationComplete = useCallback(() => {
        setShowFireworks(true);
        if (channelRef.current) {
            channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
        }
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 1500);
    }, []);
    const handleTriggerPickEliminationGrid = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        setIsPicking(true);
        setSelectedStudent(target);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: target,
                    targetCardIndex: -1,
                    dummyStudents: [],
                },
            });
        }
    };
    // ==================== MODE 10: DÃY BÓNG SỐ (BALL ELIMINATION) ====================
    const handleTriggerPickBallElimination = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        setIsPicking(true);
        setSelectedStudent(target);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: target,
                    targetCardIndex: -1,
                    dummyStudents: [],
                },
            });
        }
    };
    // ==================== MODE 11: ĐUA BI RƠI PINBALL (MARBLE RACE) ====================
    const handleMarbleRaceComplete = useCallback((winnerStudent) => {
        // Cập nhật chính xác học sinh của viên bi về đích đầu tiên thực tế
        setSelectedStudent(winnerStudent);
        setShowFireworks(true);
        if (channelRef.current) {
            channelRef.current.postMessage({ type: 'TRIGGER_FIREWORKS' });
        }
        // Chờ 2200ms sau khi bi ĐÃ CHẠM VẠCH ĐÍCH THẬT SỰ trên màn hình rồi mới mở ResultModal
        window.setTimeout(() => {
            setIsPicking(false);
            setIsResultModalOpen(true);
        }, 2200);
    }, []);
    const handleTriggerPickMarbleRace = (strategy = 'normal') => {
        if (isPicking)
            return;
        if (pickerStudents.length === 0) {
            onShowToast('Chưa có học sinh nào trong danh sách quay!');
            return;
        }
        const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
        if (!target) {
            onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
            return;
        }
        setIsPicking(true);
        setSelectedStudent(target);
        setShowFireworks(false);
        setHasCalledAny(true);
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'TRIGGER_PICK',
                payload: {
                    strategy,
                    targetStudent: target,
                    targetCardIndex: -1,
                    dummyStudents: [],
                },
            });
        }
    };
    // Xác nhận kết quả từ Modal hoặc từ Queue
    const handleConfirmStudentResult = async (studentId, action, expGained) => {
        const student = pickerStudents.find(s => s.id === studentId);
        if (!student)
            return;
        if (action === 'correct') {
            const exp = expGained ?? settings.correctExp;
            // Cộng EXP trên máy chủ nếu đang có phiên học online
            if (activeSessionId) {
                const participant = participants.find(p => p.studentId === student.id ||
                    p.displayName.trim().toLowerCase() === student.name.trim().toLowerCase());
                if (participant) {
                    try {
                        await api.grantReward(activeSessionId, participant.id, exp, 'Trả lời đúng khi gọi ngẫu nhiên');
                        onShowToast(`Đã thưởng +${exp} EXP cho ${student.name}!`);
                    }
                    catch {
                        onShowToast(`Đã ghi nhận điểm cho ${student.name}`);
                    }
                }
                else {
                    onShowToast(`Đã ghi nhận +${exp} EXP cho ${student.name}!`);
                }
            }
            else {
                onShowToast(`Đã ghi nhận +${exp} EXP cho ${student.name}!`);
            }
            // Đánh dấu đã gọi và cộng điểm
            setPickerStudents(prev => prev.map(s => s.id === studentId ? { ...s, alreadyCalled: true, score: (s.score || 0) + exp } : s));
        }
        else if (action === 'wrong') {
            setPickerStudents(prev => prev.map(s => (s.id === studentId ? { ...s, alreadyCalled: true } : s)));
            onShowToast(`Đã ghi nhận câu trả lời của ${student.name}.`);
        }
        else if (action === 'queue') {
            // Đưa vào hàng chờ lên bảng
            const newItem = {
                id: `queue_${Date.now()}_${student.id}`,
                student,
                queuedAt: Date.now(),
            };
            setQueue(prev => [...prev, newItem]);
            setPickerStudents(prev => prev.map(s => (s.id === studentId ? { ...s, alreadyCalled: true } : s)));
            onShowToast(`Đã đưa ${student.name} vào hàng chờ lên bảng!`);
        }
        setIsResultModalOpen(false);
    };
    // Xử lý từ hàng chờ
    const handleGradeFromQueue = (item, isCorrect) => {
        setQueue(prev => prev.filter(q => q.id !== item.id));
        void handleConfirmStudentResult(item.student.id, isCorrect ? 'correct' : 'wrong', settings.correctExp);
    };
    const handleRemoveFromQueue = (queueItemId) => {
        setQueue(prev => prev.filter(q => q.id !== queueItemId));
        onShowToast('Đã xóa học sinh khỏi hàng chờ.');
    };
    // Đặt lại lượt quay
    const handleResetSession = () => {
        setPickerStudents(prev => prev.map(s => ({ ...s, alreadyCalled: false })));
        setHasCalledAny(false);
        setSelectedStudent(null);
        setIsWaitingForManualFlip(false);
        setIsWaitingForBoxSelection(false);
        setPendingPick(null);
        setPendingMysteryPick(null);
        setQueue([]);
        resetAllModes();
        setActiveRandomSubMode(null);
        setLastPlayedMode(null);
        onShowToast('Đã đặt lại toàn bộ lượt gọi học sinh!');
    };
    // Mở cửa sổ trình chiếu độc lập (Màn hình 2 / Máy chiếu)
    const handleOpenProjector = () => {
        const url = `/teacher/?window=random-picker`;
        const win = window.open(url, 'EduClass_RandomPicker_Projector', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        if (!win) {
            onShowToast('⚠️ Cửa sổ bị chặn popup bởi trình duyệt! Vui lòng cho phép popup để mở màn hình chiếu.');
        }
        else {
            win.focus();
        }
    };
    // Toggle toàn màn hình cho DUY NHẤT khu vực arena lật thẻ (Yêu cầu 5)
    const toggleFullscreen = () => {
        if (!arenaRef.current)
            return;
        if (!document.fullscreenElement) {
            void arenaRef.current.requestFullscreen();
            setIsFullscreen(true);
        }
        else {
            void document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    const effectiveMode = settings.mode === 'random_mode' ? (activeRandomSubMode ?? 'random_mode') : settings.mode;
    const CurrentModeComponent = PICKER_MODES[effectiveMode]?.component || PICKER_MODES.card_flip.component;
    return (_jsxs("div", { className: "space-y-6 bg-slate-50 min-h-screen p-2 sm:p-4 rounded-2xl", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-3xl", children: "\uD83C\uDFB2" }), _jsx("h1", { className: "text-2xl font-black text-slate-800 tracking-tight", children: "Quay S\u1ED1 Ng\u1EABu Nhi\u00EAn \u2014 G\u1ECDi H\u1ECDc Sinh" })] }), _jsx("p", { className: "text-sm text-slate-500 mt-1", children: "L\u1EADt th\u1EBB b\u00E0i th\u1EA7n b\u00ED, g\u1ECDi h\u1ECDc sinh ng\u1EABu nhi\u00EAn c\u00F4ng b\u1EB1ng, h\u1ED7 tr\u1EE3 h\u00E0ng ch\u1EDD l\u00EAn b\u1EA3ng & c\u1ED9ng \u0111i\u1EC3m EXP." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: toggleFullscreen, className: "flex items-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200", title: "To\u00E0n m\u00E0n h\u00ECnh khu v\u1EF1c quay th\u1EBB", children: _jsx("span", { children: isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình' }) }), _jsxs(Button, { variant: "primary", onClick: handleOpenProjector, className: "flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md", title: "M\u1EDF c\u1EEDa s\u1ED5 tr\u00ECnh chi\u1EBFu ra m\u00E1y chi\u1EBFu / M\u00E0n h\u00ECnh 2", children: [_jsx("span", { children: "\uD83D\uDCFA" }), _jsx("span", { children: "M\u1EDF M\u00E0n H\u00ECnh M\u00E1y Chi\u1EBFu" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: [_jsxs(Card, { className: "p-4 bg-white shadow-sm border border-slate-200 lg:col-span-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 border-b pb-2", children: [_jsxs("span", { className: "font-bold text-slate-800 text-sm flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83D\uDCCB" }), " Ngu\u1ED3n danh s\u00E1ch h\u1ECDc sinh"] }), _jsxs("div", { className: "flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold", children: [_jsx("button", { type: "button", onClick: () => setSourceType('class'), className: `px-3 py-1 rounded-lg transition ${sourceType === 'class'
                                                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                                                    : 'text-slate-600'}`, children: "\uD83C\uDFEB T\u1EEB L\u1EDBp H\u1ECDc" }), _jsx("button", { type: "button", onClick: () => setSourceType('excel'), className: `px-3 py-1 rounded-lg transition ${sourceType === 'excel'
                                                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                                                    : 'text-slate-600'}`, children: "\uD83D\uDCCB D\u00E1n T\u1EEB Excel" })] })] }), sourceType === 'class' ? (_jsxs("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs font-semibold text-slate-600 mb-1 block", children: "Ch\u1ECDn l\u1EDBp h\u1ECDc:" }), _jsx("select", { value: currentClassId, onChange: e => setCurrentClassId(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500", children: classes.map(c => (_jsxs("option", { value: c.id, children: [c.name, " (", c.year ? `Năm học ${c.year}` : 'Chung', ")"] }, c.id))) })] }), _jsx("div", { className: "flex items-end pt-2 sm:pt-0", children: _jsxs("div", { className: "text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-2 rounded-xl", children: ["\u0110\u00E3 t\u1EA3i ", _jsx("b", { children: pickerStudents.length }), " h\u1ECDc sinh trong l\u1EDBp"] }) })] })) : (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-semibold text-slate-600 block", children: "D\u00E1n c\u1ED9t h\u1ECD t\u00EAn h\u1ECDc sinh t\u1EEB Excel v\u00E0o \u0111\u00E2y (m\u1ED7i d\u00F2ng m\u1ED9t h\u1ECDc sinh):" }), _jsx("textarea", { value: excelText, onChange: e => setExcelText(e.target.value), placeholder: "1. Nguy\u1EC5n V\u0103n An\n2. Tr\u1EA7n Th\u1ECB B\u00ECnh\n3. L\u00EA V\u0103n C\u01B0\u1EDDng...", rows: 3, className: "w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { variant: "secondary", onClick: handleParseExcel, className: "text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100", children: "\u26A1 N\u1EA1p Danh S\u00E1ch H\u1ECDc Sinh" }) })] }))] }), _jsxs(Card, { className: "p-4 bg-white shadow-sm border border-slate-200", children: [_jsxs("span", { className: "font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-3 border-b pb-2", children: [_jsx("span", { children: "\u2699\uFE0F" }), " C\u00E0i \u0111\u1EB7t & Th\u1ED1ng k\u00EA"] }), _jsxs("div", { className: "space-y-2.5 text-xs text-slate-700", children: [_jsxs("div", { className: "flex items-center justify-between pb-2 mb-1 border-b border-slate-100", children: [_jsx("span", { className: "font-semibold text-slate-800", children: "Ch\u1EBF \u0111\u1ED9 quay:" }), _jsxs("select", { value: settings.mode, onChange: e => {
                                                    const newMode = e.target.value;
                                                    setSettings(prev => ({ ...prev, mode: newMode }));
                                                    setActiveRandomSubMode(null);
                                                    setLastPlayedMode(null);
                                                    resetAllModes();
                                                }, className: "bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer", children: [_jsx("option", { value: "random_mode", children: "\uD83C\uDFB2 Ng\u1EABu nhi\u00EAn" }), _jsx("option", { value: "card_flip", children: "\uD83C\uDCCF L\u1EADt th\u1EBB b\u00E0i" }), _jsx("option", { value: "mystery_box", children: "\uD83C\uDF81 H\u1ED9p qu\u00E0 b\u00ED m\u1EADt" }), _jsx("option", { value: "slot_machine", children: "\uD83C\uDFB0 M\u00E1y quay s\u1ED1" }), _jsx("option", { value: "name_roller", children: "\uD83D\uDCDC Cu\u1ED9n h\u1ECD t\u00EAn" }), _jsx("option", { value: "balloon_pop", children: "\uD83C\uDF88 B\u1EAFn b\u00F3ng bay" }), _jsx("option", { value: "magic_deck", children: "\uD83D\uDD2E B\u1ED9 b\u00E0i ma thu\u1EADt" }), _jsx("option", { value: "duck_race", children: "\uD83E\uDD86 \u0110ua v\u1ECBt" }), _jsx("option", { value: "duck_hunt", children: "\uD83C\uDFAF B\u1EAFn v\u1ECBt" }), _jsx("option", { value: "elimination_grid", children: "\u2694\uFE0F \u0110\u1EA5u tr\u01B0\u1EDDng sinh t\u1ED3n" }), _jsx("option", { value: "marble_race", children: "\u26AA \u0110ua bi r\u01A1i Pinball" })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-semibold", children: "M\u1EE9c th\u01B0\u1EDFng EXP khi \u0111\u00FAng:" }), _jsx("input", { type: "number", min: 0, max: 500, value: settings.correctExp, onChange: e => setSettings(prev => ({
                                                    ...prev,
                                                    correctExp: Math.max(0, parseInt(e.target.value, 10) || 0),
                                                })), className: "w-16 text-center border border-slate-300 rounded-lg py-1 font-bold text-indigo-600" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-semibold", children: "Lo\u1EA1i tr\u1EEB h\u1ECDc sinh \u0111\u00E3 g\u1ECDi:" }), _jsx("input", { type: "checkbox", checked: settings.excludeCalled, onChange: e => setSettings(prev => ({ ...prev, excludeCalled: e.target.checked })), className: "w-4 h-4 accent-indigo-600 rounded cursor-pointer" })] }), _jsxs("div", { className: "flex items-center justify-between pt-1 border-t border-slate-100", children: [_jsx("span", { className: "text-slate-500", children: "\u0110\u00E3 g\u1ECDi / T\u1ED5ng s\u1ED1:" }), _jsxs("span", { className: "font-mono font-bold text-indigo-700", children: [calledCount, " / ", pickerStudents.length, " (C\u00F2n ", availableStudents.length, ")"] })] }), _jsx("div", { className: "pt-2", children: _jsx(Button, { variant: "secondary", onClick: handleResetSession, className: "w-full text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50", children: "\uD83D\uDD04 \u0110\u1EB7t L\u1EA1i Danh S\u00E1ch Quay" }) })] })] })] }), _jsxs("div", { ref: arenaRef, className: `bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center transition-all ${isFullscreen
                    ? 'w-full h-screen p-2 rounded-none'
                    : effectiveMode === 'duck_race' ||
                        effectiveMode === 'marble_race' ||
                        effectiveMode === 'duck_hunt'
                        ? 'rounded-3xl p-2 sm:p-3 border-4 border-indigo-900/60 min-h-[580px] w-full'
                        : effectiveMode === 'elimination_grid'
                            ? 'rounded-3xl p-3 sm:p-4 border-4 border-indigo-900/60 min-h-[580px] w-full'
                            : 'rounded-3xl p-6 border-4 border-indigo-900/60 min-h-[440px]'}`, children: [_jsx("button", { type: "button", onClick: toggleFullscreen, className: "absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 flex items-center gap-1.5 transition-all shadow-md cursor-pointer", title: isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình arena', children: _jsx("span", { children: isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình' }) }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" }), _jsx(FireworksCanvas, { active: showFireworks, onFinish: () => setShowFireworks(false) }), !(isFullscreen && effectiveMode === 'duck_hunt') &&
                        (isWaitingForManualFlip && effectiveMode === 'card_flip' ? (_jsx("div", { className: "z-10 text-center mb-2 animate-bounce", children: _jsx("span", { className: "text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg", children: "\uD83D\uDC49 Th\u1EA7y/C\u00F4 h\u00E3y ch\u1ECDn v\u00E0 b\u1EA5m v\u00E0o 1 l\u00E1 b\u00E0i \u0111\u1EC3 l\u1EADt m\u1EDF!" }) })) : isWaitingForBoxSelection && effectiveMode === 'mystery_box' ? (_jsx("div", { className: "z-10 text-center mb-2 animate-bounce", children: _jsx("span", { className: "text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg", children: "\uD83D\uDC49 Th\u1EA7y/C\u00F4 ho\u1EB7c h\u1ECDc sinh h\u00E3y b\u1EA5m ch\u1ECDn 1 h\u1ED9p qu\u00E0 b\u00ED m\u1EADt!" }) })) : isWaitingForBalloon && effectiveMode === 'balloon_pop' ? (_jsx("div", { className: "z-10 text-center mb-2 animate-bounce", children: _jsx("span", { className: "text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg", children: "\uD83C\uDF88 H\u00E3y ch\u1ECDn v\u00E0 b\u1EA5m v\u00E0o 1 qu\u1EA3 b\u00F3ng \u0111\u1EC3 n\u1ED5 tung!" }) })) : isWaitingForMagicCard && effectiveMode === 'magic_deck' ? (_jsx("div", { className: "z-10 text-center mb-2 animate-bounce", children: _jsx("span", { className: "text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg", children: "\uD83D\uDD2E H\u00E3y ch\u1ECDn 1 trong 9 l\u00E1 b\u00E0i ma thu\u1EADt \u0111\u1EC3 l\u1EADt m\u1EDF!" }) })) : isShufflingMagicDeck && effectiveMode === 'magic_deck' ? (_jsx("div", { className: "z-10 text-center mb-2 animate-pulse", children: _jsx("span", { className: "text-sm font-black text-indigo-300 bg-indigo-950/80 border-2 border-indigo-400 px-4 py-1.5 rounded-full shadow-lg", children: "\u2728 \u0110ang x\u00E0o b\u00E0i ma thu\u1EADt..." }) })) : (_jsxs("div", { className: "z-10 text-center mb-1", children: [_jsx("span", { className: "text-xs uppercase tracking-widest font-extrabold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm", children: settings.mode === 'random_mode' && activeRandomSubMode
                                        ? `🎲 Ngẫu nhiên ➜ ${PICKER_MODES[activeRandomSubMode]?.name}`
                                        : PICKER_MODES[effectiveMode]?.name || '🃏 Lật Thẻ Bài' }), _jsx("p", { className: "text-indigo-200 text-xs mt-1 opacity-80", children: effectiveMode === 'random_mode'
                                        ? 'Mỗi lượt gọi sẽ bốc ngẫu nhiên 1 trong 10 trò chơi mini-game kịch tính'
                                        : effectiveMode === 'card_flip'
                                            ? cards.some(c => c.isRevealed)
                                                ? 'Bấm nút bên dưới để bắt đầu lượt gọi tiếp theo'
                                                : 'Bấm nút bên dưới để xốc bài, sau đó tự tay bấm vào lá bài để lật mở'
                                            : effectiveMode === 'mystery_box'
                                                ? 'Bấm quay rồi chọn 1 hộp quà: 2 hộp phụ sẽ mở trước, hộp trúng mở sau cùng'
                                                : effectiveMode === 'slot_machine'
                                                    ? 'Bấm nút quay hoặc giật cần gạt để cuộn số hàng chục và hàng đơn vị'
                                                    : effectiveMode === 'name_roller'
                                                        ? 'Cuộn lướt qua các tên học sinh và dừng chậm dần ở người may mắn'
                                                        : effectiveMode === 'balloon_pop'
                                                            ? 'Bấm quay rồi chạm vào 1 quả bóng bay bồng bềnh để nổ tung'
                                                            : effectiveMode === 'magic_deck'
                                                                ? 'Bấm quay để bộ bài ma thuật xào xáo và chia ra lưới 3x3'
                                                                : effectiveMode === 'elimination_grid'
                                                                    ? 'Tất cả học sinh xuất hiện trên các ô chữ nhật, các ô biến mất dần: còn 5 ô -> còn 3 ô -> còn 1 ô chiến thắng'
                                                                    : effectiveMode === 'ball_elimination'
                                                                        ? '1 dãy 10 quả bóng số 0-9 lộn xộn, nổ ngẫu nhiên từng quả và dừng lại ở 2 (hoặc 1) quả cuối cùng để ghép thành STT học sinh'
                                                                        : effectiveMode === 'duck_hunt'
                                                                            ? 'Trường bắn súng săn hội chợ, khóa mục tiêu và bắn hạ chú vịt may mắn'
                                                                            : 'Đàn vịt rẽ sóng bơi đua gay cấn, chú vịt chạm vạch đích sẽ được xướng tên' })] }))), _jsx("div", { className: `w-full z-10 ${isFullscreen ? 'flex-1 flex flex-col items-center justify-center min-h-0' : 'my-2'}`, children: _jsx(CurrentModeComponent, { isPicking: isPicking, selectedStudent: selectedStudent, candidates: pickerStudents, cards: cards, onFlipCard: handleFlipCardManual, boxes: boxes, onSelectBox: handleSelectMysteryBox, isWaitingForBoxSelection: isWaitingForBoxSelection, slotState: slotState, onTriggerSpin: handleTriggerPick, balloons: balloons, onPopBalloon: handlePopBalloon, isWaitingForBalloon: isWaitingForBalloon, magicCards: magicCards, onSelectMagicCard: handleSelectMagicCard, isWaitingForMagicCard: isWaitingForMagicCard, isShufflingMagicDeck: isShufflingMagicDeck, onEliminationComplete: handleEliminationComplete, onMarbleRaceComplete: handleMarbleRaceComplete, onDuckHuntComplete: handleDuckHuntComplete, isCompleted: !isPicking && selectedStudent !== null, isFullscreen: isFullscreen }) }), settings.mode !== 'duck_hunt' && (_jsx("div", { className: "z-10 mt-4 flex flex-col items-center", children: _jsxs("div", { className: "inline-flex items-stretch rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all hover:border-amber-300 hover:shadow-amber-500/30", children: [_jsxs("button", { type: "button", onClick: () => handleTriggerPick('normal'), disabled: isPicking || pickerStudents.length === 0, className: "px-8 sm:px-10 py-4 font-black text-lg sm:text-xl text-white tracking-wide flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer", children: [_jsx("span", { className: "text-2xl animate-spin-slow", children: "\uD83C\uDFB2" }), _jsx("span", { children: hasCalledAny ? 'Học sinh tiếp theo' : 'Học sinh đầu tiên' })] }), _jsx("button", { type: "button", onClick: () => handleTriggerPick('bias_good'), disabled: isPicking || pickerStudents.length === 0, title: "", className: "w-9 sm:w-11 border-l border-white/20 bg-amber-600/40 hover:bg-amber-600/70 text-amber-100 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 group", "aria-label": "Ch\u1ECDn ng\u1EABu nhi\u00EAn", children: _jsx("span", { className: "text-xs select-none opacity-40 group-hover:opacity-90", children: "\u2726" }) })] }) })), isFullscreen && queue.length > 0 && (_jsx("div", { className: "z-20 w-full max-w-4xl mx-auto mt-auto pt-4 pb-2 px-4", children: _jsxs("div", { className: "bg-slate-900/90 border-2 border-indigo-500/60 backdrop-blur-md rounded-2xl p-3 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-800/60", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base animate-pulse", children: "\u23F3" }), _jsxs("span", { className: "font-extrabold text-amber-300 text-sm", children: ["H\u00E0ng ch\u1EDD l\u00EAn b\u1EA3ng l\u00E0m b\u00E0i (", queue.length, " h\u1ECDc sinh):"] })] }), _jsx("span", { className: "text-[11px] text-indigo-300", children: "B\u1EA5m ch\u1EA5m \u0111i\u1EC3m ngay khi h\u1ECDc sinh ho\u00E0n th\u00E0nh b\u00E0i l\u00E0m" })] }), _jsx("div", { className: "flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin", children: queue.map(item => (_jsxs("div", { className: "flex items-center gap-2 bg-indigo-950/80 border border-indigo-400/40 rounded-xl px-3 py-1.5 shadow-md shrink-0", children: [_jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-black text-white text-xs", children: item.student.name }), item.student.code && (_jsx("div", { className: "text-[10px] text-indigo-300 font-mono", children: item.student.code }))] }), _jsxs("div", { className: "flex items-center gap-1 ml-2", children: [_jsxs("button", { type: "button", onClick: () => handleGradeFromQueue(item, true), className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow transition cursor-pointer", title: "Tr\u1EA3 l\u1EDDi \u0111\u00FAng", children: ["\u2713 +", settings.correctExp] }), _jsx("button", { type: "button", onClick: () => handleGradeFromQueue(item, false), className: "px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer", title: "Tr\u1EA3 l\u1EDDi sai", children: "\u2715 Sai" }), _jsx("button", { type: "button", onClick: () => handleRemoveFromQueue(item.id), className: "px-1.5 py-1 text-slate-400 hover:text-white text-xs rounded transition cursor-pointer", title: "X\u00F3a kh\u1ECFi h\u00E0ng ch\u1EDD", children: "\u2715" })] })] }, item.id))) })] }) })), _jsx(ResultModal, { isOpen: isResultModalOpen, student: selectedStudent, expReward: settings.correctExp, onCorrect: () => {
                            if (selectedStudent) {
                                void handleConfirmStudentResult(selectedStudent.id, 'correct', settings.correctExp);
                            }
                        }, onWrong: () => {
                            if (selectedStudent) {
                                void handleConfirmStudentResult(selectedStudent.id, 'wrong', 0);
                            }
                        }, onQueue: () => {
                            if (selectedStudent) {
                                void handleConfirmStudentResult(selectedStudent.id, 'queue');
                            }
                        }, onSkip: () => {
                            if (selectedStudent) {
                                void handleConfirmStudentResult(selectedStudent.id, 'skip');
                            }
                        } })] }), !isFullscreen && (_jsx(QueueBar, { queue: queue, expReward: settings.correctExp, onGradeStudent: handleGradeFromQueue, onRemoveFromQueue: handleRemoveFromQueue }))] }));
};
//# sourceMappingURL=RandomPickerTab.js.map