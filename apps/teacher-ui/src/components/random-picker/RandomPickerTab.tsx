import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ClassDto,
  ParticipantDto,
  StudentDto,
} from '@educlass/protocol';
import {
  pickStudentFromCandidates,
  type PickerQueueItem,
  type PickerSelectionStrategy,
  type PickerStudent,
  type RandomPickerModeId,
  type RandomPickerSettings,
} from '@educlass/protocol';
import { Button, Card } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
import { FireworksCanvas } from './effects/FireworksCanvas.js';
import { PICKER_MODES } from './modes/index.js';
import { QueueBar } from './QueueBar.js';
import { ResultModal } from './ResultModal.js';
import { soundManager } from './sound.js';
import type {
  BalloonItem,
  MagicCardItem,
  MysteryBoxItem,
  RandomPickerSyncMessage,
  SlotMachineState,
} from './types.js';

export interface RandomPickerTabProps {
  classes: ClassDto[];
  selectedClassId?: string | undefined;
  students: StudentDto[];
  activeSessionId?: string | null | undefined;
  participants?: ParticipantDto[] | undefined;
  onShowToast: (message: string) => void;
  initialSettings?: Partial<RandomPickerSettings> | undefined;
}

// Toàn bộ các trò chơi hợp lệ trong Chế độ Ngẫu nhiên
const ALL_RANDOM_SUB_MODES: RandomPickerModeId[] = [
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
const BIAS_GOOD_COMPATIBLE_SUB_MODES: RandomPickerModeId[] = [
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

export const RandomPickerTab: React.FC<RandomPickerTabProps> = ({
  classes,
  selectedClassId,
  students,
  activeSessionId,
  participants = [],
  onShowToast,
  initialSettings,
}) => {
  // 1. Nguồn danh sách học sinh: 'class' hoặc 'excel'
  const [sourceType, setSourceType] = useState<'class' | 'excel'>('class');
  const [currentClassId, setCurrentClassId] = useState<string>(selectedClassId || classes[0]?.id || '');
  const [excelText, setExcelText] = useState<string>('');

  // 2. Cài đặt quay - Mặc định là Chế độ Ngẫu nhiên
  const [settings, setSettings] = useState<RandomPickerSettings>({
    mode: 'random_mode',
    correctExp: 10,
    excludeCalled: true,
    soundEnabled: true,
    animationDurationMs: 1500,
    ...initialSettings,
  });

  // Trò chơi con hiện tại trong chế độ Ngẫu nhiên (null nếu chưa quay lượt nào -> hiện sân khấu chào đón ban đầu)
  const [activeRandomSubMode, setActiveRandomSubMode] = useState<RandomPickerModeId | null>(null);
  // Ghi nhớ trò chơi của lượt trước để không lặp lại ở lượt kế tiếp
  const [lastPlayedMode, setLastPlayedMode] = useState<RandomPickerModeId | null>(null);

  // 3. Danh sách học sinh trong pool quay
  const [pickerStudents, setPickerStudents] = useState<PickerStudent[]>([]);
  const [queue, setQueue] = useState<PickerQueueItem[]>([]);

  // 4. Trạng thái quá trình quay
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [hasCalledAny, setHasCalledAny] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<PickerStudent | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFireworks, setShowFireworks] = useState<boolean>(false);

  // Trạng thái chờ giáo viên tự tay bấm lật thẻ (Chế độ Card Flip)
  const [isWaitingForManualFlip, setIsWaitingForManualFlip] = useState<boolean>(false);
  const [pendingPick, setPendingPick] = useState<{
    target: PickerStudent;
    dummyStudents: PickerStudent[];
    strategy: PickerSelectionStrategy;
  } | null>(null);

  // 5. Thẻ bài cho chế độ Card Flip (5 lá)
  const [cards, setCards] = useState<
    Array<{
      id: number;
      student: PickerStudent | null;
      isRevealed: boolean;
      isTarget: boolean;
    }>
  >([
    { id: 1, student: null, isRevealed: false, isTarget: false },
    { id: 2, student: null, isRevealed: false, isTarget: false },
    { id: 3, student: null, isRevealed: false, isTarget: false },
    { id: 4, student: null, isRevealed: false, isTarget: false },
    { id: 5, student: null, isRevealed: false, isTarget: false },
  ]);

  // 6. Hộp quà bí mật cho chế độ Mystery Box (3 hộp)
  const [boxes, setBoxes] = useState<MysteryBoxItem[]>([
    { id: 1, student: null, status: 'idle', isTarget: false },
    { id: 2, student: null, status: 'idle', isTarget: false },
    { id: 3, student: null, status: 'idle', isTarget: false },
  ]);
  const [isWaitingForBoxSelection, setIsWaitingForBoxSelection] = useState<boolean>(false);
  const [pendingMysteryPick, setPendingMysteryPick] = useState<{
    target: PickerStudent;
    dummyStudents: PickerStudent[];
    strategy: PickerSelectionStrategy;
  } | null>(null);

  // 7. Máy quay số cho chế độ Slot Machine (2 số: Hàng chục & Đơn vị)
  const [slotState, setSlotState] = useState<SlotMachineState>({
    tens: 0,
    units: 0,
    studentNumber: 0,
    targetStudent: null,
    isSpinningTens: false,
    isSpinningUnits: false,
  });

  // 8. Bắn bóng bay (Balloon Pop)
  const [balloons, setBalloons] = useState<BalloonItem[]>([]);
  const [isWaitingForBalloon, setIsWaitingForBalloon] = useState<boolean>(false);
  const [pendingBalloonPick, setPendingBalloonPick] = useState<{
    target: PickerStudent;
    strategy: PickerSelectionStrategy;
  } | null>(null);

  // 9. Bộ bài ma thuật (Magic Card Deck 3x3)
  const [magicCards, setMagicCards] = useState<MagicCardItem[]>([]);
  const [isWaitingForMagicCard, setIsWaitingForMagicCard] = useState<boolean>(false);
  const [isShufflingMagicDeck, setIsShufflingMagicDeck] = useState<boolean>(false);
  const [pendingMagicPick, setPendingMagicPick] = useState<{
    target: PickerStudent;
    dummyStudents: PickerStudent[];
    strategy: PickerSelectionStrategy;
  } | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Khởi tạo BroadcastChannel để đồng bộ với Màn hình 2
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const ch = new BroadcastChannel('educlass_random_picker');
      channelRef.current = ch;

      ch.onmessage = (event: MessageEvent<RandomPickerSyncMessage>) => {
        const msg = event.data;
        if (msg.type === 'TRIGGER_PICK') {
          // Projector kích hoạt
        } else if (msg.type === 'CONFIRM_RESULT') {
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
  }, [pickerStudents, queue, settings, selectedStudent, isPicking, cards, boxes, slotState, balloons, magicCards, showFireworks]);

  useEffect(() => {
    broadcastState();
  }, [broadcastState]);

  // Cập nhật pool học sinh khi đổi nguồn từ Lớp học
  useEffect(() => {
    if (sourceType === 'class') {
      const pool: PickerStudent[] = students.map((s) => ({
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

    const lines = excelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: PickerStudent[] = [];

    lines.forEach((line, index) => {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);

      let name = '';
      let code = '';
      let academicPerformance: PickerStudent['academicPerformance'] = 'dat';

      if (parts.length >= 3) {
        code = parts[0] ?? '';
        name = parts[1] ?? '';
        const perfRaw = (parts[2] ?? '').toLowerCase();
        if (perfRaw.includes('tốt') || perfRaw === 'tot') academicPerformance = 'tot';
        else if (perfRaw.includes('khá') || perfRaw === 'kha') academicPerformance = 'kha';
        else if (perfRaw.includes('chưa') || perfRaw === 'chua_dat') academicPerformance = 'chua_dat';
      } else if (parts.length === 2) {
        code = parts[0] ?? '';
        name = parts[1] ?? '';
      } else {
        const single = parts[0] ?? '';
        const match = single.match(/^(\d+)[.\s-]+(.+)$/);
        if (match && match[2]) {
          code = `HS${match[1]}`;
          name = match[2].trim();
        } else {
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
    setBalloons(
      Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        color: colors[i % colors.length] || '',
        student: null,
        isPopped: false,
        isTarget: false,
      }))
    );
    setIsWaitingForBalloon(false);
    setPendingBalloonPick(null);
  };

  const resetMagicCards = () => {
    setMagicCards(
      Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        student: null,
        isRevealed: false,
        isTarget: false,
        positionIndex: i,
      }))
    );
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
    if (!settings.excludeCalled) return pickerStudents;
    return pickerStudents.filter((s) => !s.alreadyCalled);
  }, [pickerStudents, settings.excludeCalled]);

  const calledCount = useMemo(() => {
    return pickerStudents.filter((s) => s.alreadyCalled).length;
  }, [pickerStudents]);

  // Thuật toán chọn trò chơi ngẫu nhiên cho từng lượt (đáp ứng luật không lặp lại trò của lượt trước và loại trừ Pinball/Bắn vịt khi chọn học sinh giỏi)
  const pickRandomSubMode = useCallback(
    (strategy: PickerSelectionStrategy): RandomPickerModeId => {
      const basePool =
        strategy === 'bias_good'
          ? BIAS_GOOD_COMPATIBLE_SUB_MODES
          : ALL_RANDOM_SUB_MODES;

      let candidatePool = basePool;
      if (lastPlayedMode && basePool.length > 1) {
        const filtered = basePool.filter((m) => m !== lastPlayedMode);
        if (filtered.length > 0) {
          candidatePool = filtered;
        }
      }

      const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)] ?? 'card_flip';
      return chosen;
    },
    [lastPlayedMode]
  );

  // Điều hướng nút Quay theo từng Mode
  const handleTriggerPick = (strategy: PickerSelectionStrategy = 'normal') => {
    let modeToExecute: RandomPickerModeId = settings.mode;

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
  const handleTriggerPickCardFlip = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
    if (pickerStudents.length === 0) {
      onShowToast('Chưa có học sinh nào trong danh sách quay!');
      return;
    }

    const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
    if (!target) {
      onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
      return;
    }

    const others = pickerStudents.filter((s) => s.id !== target.id);
    const dummyStudents: PickerStudent[] = [];
    for (let i = 0; i < 4; i++) {
      if (others.length > 0) {
        const randOther = others[Math.floor(Math.random() * others.length)];
        if (randOther) dummyStudents.push(randOther);
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

  const handleFlipCardManual = (cardIndex: number) => {
    if (isPicking) return;
    const clickedCard = cards[cardIndex];
    if (clickedCard?.isRevealed) return;

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
      const others = pickerStudents.filter((s) => s.id !== target.id);
      const dummyStudents: PickerStudent[] = [];
      for (let i = 0; i < 4; i++) {
        if (others.length > 0) {
          const randOther = others[Math.floor(Math.random() * others.length)];
          if (randOther) dummyStudents.push(randOther);
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
  const handleTriggerPickMysteryBox = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
    if (pickerStudents.length === 0) {
      onShowToast('Chưa có học sinh nào trong danh sách quay!');
      return;
    }

    const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
    if (!target) {
      onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
      return;
    }

    const others = pickerStudents.filter((s) => s.id !== target.id);
    const dummyStudents: PickerStudent[] = [];
    for (let i = 0; i < 2; i++) {
      if (others.length > 0) {
        const randOther = others[Math.floor(Math.random() * others.length)];
        if (randOther) dummyStudents.push(randOther);
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

  const handleSelectMysteryBox = (boxIndex: number) => {
    if (isPicking) return;
    const clickedBox = boxes[boxIndex];
    if (clickedBox && clickedBox.status !== 'idle') return;

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
      const others = pickerStudents.filter((s) => s.id !== target.id);
      const dummyStudents: PickerStudent[] = [];
      for (let i = 0; i < 2; i++) {
        if (others.length > 0) {
          const randOther = others[Math.floor(Math.random() * others.length)];
          if (randOther) dummyStudents.push(randOther);
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
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIndex
          ? { ...b, status: 'selected', isTarget: true, student: pick.target }
          : { ...b, isTarget: false }
      )
    );

    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'BOX_SELECTED',
        payload: { boxIndex },
      });
    }

    // Nhịp 1: Sau 700ms, 2 hộp KHÔNG được chọn rung và mở trước
    window.setTimeout(() => {
      let dummyPtr = 0;
      setBoxes((prev) =>
        prev.map((b, i) => {
          if (i === boxIndex) return b;
          return {
            ...b,
            status: 'opened_loser',
            student: pick.dummyStudents[dummyPtr++] || null,
          };
        })
      );
      if (settings.soundEnabled) {
        soundManager.playBoxOpenLoser();
      }
    }, 700);

    // Nhịp 2: Sau 1800ms, hộp trúng thưởng BẬT TUNG NẮP và nổ pháo hoa!
    window.setTimeout(() => {
      setBoxes((prev) =>
        prev.map((b, i) => (i === boxIndex ? { ...b, status: 'opened_winner' } : b))
      );
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
  const handleTriggerSpinSlot = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
    if (pickerStudents.length === 0) {
      onShowToast('Chưa có học sinh nào trong danh sách quay!');
      return;
    }

    const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
    if (!target) {
      onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
      return;
    }

    const targetIdx = pickerStudents.findIndex((s) => s.id === target.id);
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

    let tickTimer: ReturnType<typeof setInterval> | null = null;
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
      if (tickTimer) clearInterval(tickTimer);
      setSlotState((prev) => ({
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
  const handleTriggerPickNameRoller = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
  const handleTriggerPickBalloon = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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

  const handlePopBalloon = (balloonIndex: number) => {
    if (isPicking) return;
    const clickedBalloon = balloons[balloonIndex];
    if (clickedBalloon && clickedBalloon.isPopped) return;

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
    setBalloons((prev) =>
      prev.map((b, i) =>
        i === balloonIndex
          ? { ...b, isPopped: true, isTarget: true, student: pick.target }
          : b
      )
    );

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
  const handleTriggerPickMagicDeck = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
    if (pickerStudents.length === 0) {
      onShowToast('Chưa có học sinh nào trong danh sách quay!');
      return;
    }

    const target = pickStudentFromCandidates(pickerStudents, strategy, settings.excludeCalled);
    if (!target) {
      onShowToast('Đã gọi hết học sinh! Vui lòng bấm "Đặt lại danh sách quay".');
      return;
    }

    const others = pickerStudents.filter((s) => s.id !== target.id);
    const dummyStudents: PickerStudent[] = [];
    for (let i = 0; i < 8; i++) {
      if (others.length > 0) {
        const randOther = others[Math.floor(Math.random() * others.length)];
        if (randOther) dummyStudents.push(randOther);
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

  const handleSelectMagicCard = (cardIndex: number) => {
    if (isPicking || isShufflingMagicDeck) return;
    const clickedCard = magicCards[cardIndex];
    if (clickedCard && clickedCard.isRevealed) return;

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
      const others = pickerStudents.filter((s) => s.id !== target.id);
      const dummyStudents: PickerStudent[] = [];
      for (let i = 0; i < 8; i++) {
        if (others.length > 0) {
          const randOther = others[Math.floor(Math.random() * others.length)];
          if (randOther) dummyStudents.push(randOther);
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
    setMagicCards((prev) =>
      prev.map((c, i) => {
        if (i === cardIndex) {
          return { ...c, isRevealed: true, isTarget: true, student: pick.target };
        }
        return {
          ...c,
          student: pick.dummyStudents[dummyPtr++] || null,
        };
      })
    );

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
  const handleTriggerPickDuckRace = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
  const handleDuckHuntComplete = useCallback((winnerStudent: PickerStudent) => {
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

  const handleTriggerPickDuckHunt = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
          targetStudent: null as unknown as PickerStudent,
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

  const handleTriggerPickEliminationGrid = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
  const handleTriggerPickBallElimination = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
  const handleMarbleRaceComplete = useCallback((winnerStudent: PickerStudent) => {
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

  const handleTriggerPickMarbleRace = (strategy: PickerSelectionStrategy = 'normal') => {
    if (isPicking) return;
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
  const handleConfirmStudentResult = async (
    studentId: string,
    action: 'correct' | 'wrong' | 'queue' | 'skip',
    expGained?: number
  ) => {
    const student = pickerStudents.find((s) => s.id === studentId);
    if (!student) return;

    if (action === 'correct') {
      const exp = expGained ?? settings.correctExp;

      // Cộng EXP trên máy chủ nếu đang có phiên học online
      if (activeSessionId) {
        const participant = participants.find(
          (p) => p.studentId === student.id || p.displayName.trim().toLowerCase() === student.name.trim().toLowerCase()
        );
        if (participant) {
          try {
            await api.grantReward(
              activeSessionId,
              participant.id,
              exp,
              'Trả lời đúng khi gọi ngẫu nhiên'
            );
            onShowToast(`Đã thưởng +${exp} EXP cho ${student.name}!`);
          } catch {
            onShowToast(`Đã ghi nhận điểm cho ${student.name}`);
          }
        } else {
          onShowToast(`Đã ghi nhận +${exp} EXP cho ${student.name}!`);
        }
      } else {
        onShowToast(`Đã ghi nhận +${exp} EXP cho ${student.name}!`);
      }

      // Đánh dấu đã gọi và cộng điểm
      setPickerStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? { ...s, alreadyCalled: true, score: (s.score || 0) + exp }
            : s
        )
      );
    } else if (action === 'wrong') {
      setPickerStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, alreadyCalled: true } : s))
      );
      onShowToast(`Đã ghi nhận câu trả lời của ${student.name}.`);
    } else if (action === 'queue') {
      // Đưa vào hàng chờ lên bảng
      const newItem: PickerQueueItem = {
        id: `queue_${Date.now()}_${student.id}`,
        student,
        queuedAt: Date.now(),
      };
      setQueue((prev) => [...prev, newItem]);
      setPickerStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, alreadyCalled: true } : s))
      );
      onShowToast(`Đã đưa ${student.name} vào hàng chờ lên bảng!`);
    }

    setIsResultModalOpen(false);
  };

  // Xử lý từ hàng chờ
  const handleGradeFromQueue = (item: PickerQueueItem, isCorrect: boolean) => {
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    void handleConfirmStudentResult(
      item.student.id,
      isCorrect ? 'correct' : 'wrong',
      settings.correctExp
    );
  };

  const handleRemoveFromQueue = (queueItemId: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== queueItemId));
    onShowToast('Đã xóa học sinh khỏi hàng chờ.');
  };

  // Đặt lại lượt quay
  const handleResetSession = () => {
    setPickerStudents((prev) => prev.map((s) => ({ ...s, alreadyCalled: false })));
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
    const win = window.open(
      url,
      'EduClass_RandomPicker_Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (!win) {
      onShowToast('⚠️ Cửa sổ bị chặn popup bởi trình duyệt! Vui lòng cho phép popup để mở màn hình chiếu.');
    } else {
      win.focus();
    }
  };

  // Toggle toàn màn hình cho DUY NHẤT khu vực arena lật thẻ (Yêu cầu 5)
  const toggleFullscreen = () => {
    if (!arenaRef.current) return;
    if (!document.fullscreenElement) {
      void arenaRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const effectiveMode: RandomPickerModeId =
    settings.mode === 'random_mode'
      ? (activeRandomSubMode ?? 'random_mode')
      : settings.mode;

  const CurrentModeComponent =
    PICKER_MODES[effectiveMode]?.component || PICKER_MODES.card_flip.component;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 sm:p-4 rounded-2xl">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎲</span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Quay Số Ngẫu Nhiên — Gọi Học Sinh
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Lật thẻ bài thần bí, gọi học sinh ngẫu nhiên công bằng, hỗ trợ hàng chờ lên bảng & cộng điểm EXP.
          </p>
        </div>

        {/* Nút hành động ngoài header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200"
            title="Toàn màn hình khu vực quay thẻ"
          >
            <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenProjector}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            title="Mở cửa sổ trình chiếu ra máy chiếu / Màn hình 2"
          >
            <span>📺</span>
            <span>Mở Màn Hình Máy Chiếu</span>
          </Button>
        </div>
      </div>

      {/* 2. Cài đặt nguồn học sinh & Tuỳ chọn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Nguồn danh sách */}
        <Card className="p-4 bg-white shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span>📋</span> Nguồn danh sách học sinh
            </span>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSourceType('class')}
                className={`px-3 py-1 rounded-lg transition ${
                  sourceType === 'class' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                🏫 Từ Lớp Học
              </button>
              <button
                type="button"
                onClick={() => setSourceType('excel')}
                className={`px-3 py-1 rounded-lg transition ${
                  sourceType === 'excel' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                📋 Dán Từ Excel
              </button>
            </div>
          </div>

          {sourceType === 'class' ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Chọn lớp học:
                </label>
                <select
                  value={currentClassId}
                  onChange={(e) => setCurrentClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.year ? `Năm học ${c.year}` : 'Chung'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pt-2 sm:pt-0">
                <div className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-2 rounded-xl">
                  Đã tải <b>{pickerStudents.length}</b> học sinh trong lớp
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">
                Dán cột họ tên học sinh từ Excel vào đây (mỗi dòng một học sinh):
              </label>
              <textarea
                value={excelText}
                onChange={(e) => setExcelText(e.target.value)}
                placeholder="1. Nguyễn Văn An&#10;2. Trần Thị Bình&#10;3. Lê Văn Cường..."
                rows={3}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={handleParseExcel}
                  className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  ⚡ Nạp Danh Sách Học Sinh
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Card Cài đặt quay */}
        <Card className="p-4 bg-white shadow-sm border border-slate-200">
          <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-3 border-b pb-2">
            <span>⚙️</span> Cài đặt & Thống kê
          </span>

          <div className="space-y-2.5 text-xs text-slate-700">
            {/* Chế độ quay */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100">
              <span className="font-semibold text-slate-800">Chế độ quay:</span>
              <select
                value={settings.mode}
                onChange={(e) => {
                  const newMode = e.target.value as RandomPickerModeId;
                  setSettings((prev) => ({ ...prev, mode: newMode }));
                  setActiveRandomSubMode(null);
                  setLastPlayedMode(null);
                  resetAllModes();
                }}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="random_mode">🎲 Ngẫu nhiên</option>
                <option value="card_flip">🃏 Lật thẻ bài</option>
                <option value="mystery_box">🎁 Hộp quà bí mật</option>
                <option value="slot_machine">🎰 Máy quay số</option>
                <option value="name_roller">📜 Cuộn họ tên</option>
                <option value="balloon_pop">🎈 Bắn bóng bay</option>
                <option value="magic_deck">🔮 Bộ bài ma thuật</option>
                <option value="duck_race">🦆 Đua vịt</option>
                <option value="duck_hunt">🎯 Bắn vịt</option>
                <option value="elimination_grid">⚔️ Đấu trường sinh tồn</option>
                <option value="marble_race">⚪ Đua bi rơi Pinball</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Mức thưởng EXP khi đúng:</span>
              <input
                type="number"
                min={0}
                max={500}
                value={settings.correctExp}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    correctExp: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className="w-16 text-center border border-slate-300 rounded-lg py-1 font-bold text-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Loại trừ học sinh đã gọi:</span>
              <input
                type="checkbox"
                checked={settings.excludeCalled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, excludeCalled: e.target.checked }))
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500">Đã gọi / Tổng số:</span>
              <span className="font-mono font-bold text-indigo-700">
                {calledCount} / {pickerStudents.length} (Còn {availableStudents.length})
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={handleResetSession}
                className="w-full text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50"
              >
                🔄 Đặt Lại Danh Sách Quay
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. KHU VỰC CHÍNH: ARENA QUAY SỐ (Chỉ vùng này hiển thị khi Fullscreen - Yêu cầu 5) */}
      <div
        ref={arenaRef}
        className={`bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center transition-all ${
          isFullscreen
            ? 'w-full h-screen p-2 rounded-none'
            : effectiveMode === 'duck_race' || effectiveMode === 'marble_race' || effectiveMode === 'duck_hunt'
            ? 'rounded-3xl p-2 sm:p-3 border-4 border-indigo-900/60 min-h-[580px] w-full'
            : effectiveMode === 'elimination_grid'
            ? 'rounded-3xl p-3 sm:p-4 border-4 border-indigo-900/60 min-h-[580px] w-full'
            : 'rounded-3xl p-6 border-4 border-indigo-900/60 min-h-[440px]'
        }`}
      >
        {/* Nút bật / thoát Fullscreen trực tiếp trong khung trò chơi */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình arena'}
        >
          <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
        </button>

        {/* Nền hiệu ứng sao mờ ảo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />

        {/* Pháo hoa nổ chúc mừng */}
        <FireworksCanvas active={showFireworks} onFinish={() => setShowFireworks(false)} />

        {/* Tiêu đề chế độ hoặc Thông báo chờ lật (Ẩn khi Fullscreen ở chế độ bắn vịt để không chiếm diện tích trên) */}
        {!(isFullscreen && effectiveMode === 'duck_hunt') && (
          isWaitingForManualFlip && effectiveMode === 'card_flip' ? (
            <div className="z-10 text-center mb-2 animate-bounce">
              <span className="text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg">
                👉 Thầy/Cô hãy chọn và bấm vào 1 lá bài để lật mở!
              </span>
            </div>
          ) : isWaitingForBoxSelection && effectiveMode === 'mystery_box' ? (
            <div className="z-10 text-center mb-2 animate-bounce">
              <span className="text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg">
                👉 Thầy/Cô hoặc học sinh hãy bấm chọn 1 hộp quà bí mật!
              </span>
            </div>
          ) : isWaitingForBalloon && effectiveMode === 'balloon_pop' ? (
            <div className="z-10 text-center mb-2 animate-bounce">
              <span className="text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg">
                🎈 Hãy chọn và bấm vào 1 quả bóng để nổ tung!
              </span>
            </div>
          ) : isWaitingForMagicCard && effectiveMode === 'magic_deck' ? (
            <div className="z-10 text-center mb-2 animate-bounce">
              <span className="text-sm font-black text-amber-300 bg-amber-950/80 border-2 border-amber-400 px-4 py-1.5 rounded-full shadow-lg">
                🔮 Hãy chọn 1 trong 9 lá bài ma thuật để lật mở!
              </span>
            </div>
          ) : isShufflingMagicDeck && effectiveMode === 'magic_deck' ? (
            <div className="z-10 text-center mb-2 animate-pulse">
              <span className="text-sm font-black text-indigo-300 bg-indigo-950/80 border-2 border-indigo-400 px-4 py-1.5 rounded-full shadow-lg">
                ✨ Đang xào bài ma thuật...
              </span>
            </div>
          ) : (
            <div className="z-10 text-center mb-1">
              <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm">
                {settings.mode === 'random_mode' && activeRandomSubMode
                  ? `🎲 Ngẫu nhiên ➜ ${PICKER_MODES[activeRandomSubMode]?.name}`
                  : PICKER_MODES[effectiveMode]?.name || '🃏 Lật Thẻ Bài'}
              </span>
              <p className="text-indigo-200 text-xs mt-1 opacity-80">
                {effectiveMode === 'random_mode'
                  ? 'Mỗi lượt gọi sẽ bốc ngẫu nhiên 1 trong 10 trò chơi mini-game kịch tính'
                  : effectiveMode === 'card_flip'
                  ? cards.some((c) => c.isRevealed)
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
                  : 'Đàn vịt rẽ sóng bơi đua gay cấn, chú vịt chạm vạch đích sẽ được xướng tên'}
              </p>
            </div>
          )
        )}

        {/* Khu vực trò chơi tương ứng theo Mode */}
        <div className={`w-full z-10 ${isFullscreen ? 'flex-1 flex flex-col items-center justify-center min-h-0' : 'my-2'}`}>
          <CurrentModeComponent
            isPicking={isPicking}
            selectedStudent={selectedStudent}
            candidates={pickerStudents}
            cards={cards}
            onFlipCard={handleFlipCardManual}
            boxes={boxes}
            onSelectBox={handleSelectMysteryBox}
            isWaitingForBoxSelection={isWaitingForBoxSelection}
            slotState={slotState}
            onTriggerSpin={handleTriggerPick}
            balloons={balloons}
            onPopBalloon={handlePopBalloon}
            isWaitingForBalloon={isWaitingForBalloon}
            magicCards={magicCards}
            onSelectMagicCard={handleSelectMagicCard}
            isWaitingForMagicCard={isWaitingForMagicCard}
            isShufflingMagicDeck={isShufflingMagicDeck}
            onEliminationComplete={handleEliminationComplete}
            onMarbleRaceComplete={handleMarbleRaceComplete}
            onDuckHuntComplete={handleDuckHuntComplete}
            isCompleted={!isPicking && selectedStudent !== null}
            isFullscreen={isFullscreen}
          />
        </div>

        {/* NÚT QUAY CHÍNH Ở NGOÀI: Luôn hiển thị trừ khi người dùng chọn cố định chế độ Bắn Vịt (có nút riêng trên trường bắn) */}
        {settings.mode !== 'duck_hunt' && (
          <div className="z-10 mt-4 flex flex-col items-center">
            <div className="inline-flex items-stretch rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all hover:border-amber-300 hover:shadow-amber-500/30">
              {/* Nút quay chính */}
              <button
                type="button"
                onClick={() => handleTriggerPick('normal')}
                disabled={isPicking || pickerStudents.length === 0}
                className="px-8 sm:px-10 py-4 font-black text-lg sm:text-xl text-white tracking-wide flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span className="text-2xl animate-spin-slow">🎲</span>
                <span>{hasCalledAny ? 'Học sinh tiếp theo' : 'Học sinh đầu tiên'}</span>
              </button>

              {/* Nút ẩn bí mật liền mạch mép phải (gọi học sinh có học lực tốt) */}
              <button
                type="button"
                onClick={() => handleTriggerPick('bias_good')}
                disabled={isPicking || pickerStudents.length === 0}
                title=""
                className="w-9 sm:w-11 border-l border-white/20 bg-amber-600/40 hover:bg-amber-600/70 text-amber-100 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 group"
                aria-label="Chọn ngẫu nhiên"
              >
                <span className="text-xs select-none opacity-40 group-hover:opacity-90">✦</span>
              </button>
            </div>
          </div>
        )}
        {/* HÀNG CHỜ HỌC SINH TRONG CHẾ ĐỘ FULLSCREEN (Luôn ghim ở dưới cùng) */}
        {isFullscreen && queue.length > 0 && (
          <div className="z-20 w-full max-w-4xl mx-auto mt-auto pt-4 pb-2 px-4">
            <div className="bg-slate-900/90 border-2 border-indigo-500/60 backdrop-blur-md rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-base animate-pulse">⏳</span>
                  <span className="font-extrabold text-amber-300 text-sm">
                    Hàng chờ lên bảng làm bài ({queue.length} học sinh):
                  </span>
                </div>
                <span className="text-[11px] text-indigo-300">
                  Bấm chấm điểm ngay khi học sinh hoàn thành bài làm
                </span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-400/40 rounded-xl px-3 py-1.5 shadow-md shrink-0"
                  >
                    <div className="text-left">
                      <div className="font-black text-white text-xs">{item.student.name}</div>
                      {item.student.code && (
                        <div className="text-[10px] text-indigo-300 font-mono">{item.student.code}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleGradeFromQueue(item, true)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow transition cursor-pointer"
                        title="Trả lời đúng"
                      >
                        ✓ +{settings.correctExp}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGradeFromQueue(item, false)}
                        className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                        title="Trả lời sai"
                      >
                        ✕ Sai
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="px-1.5 py-1 text-slate-400 hover:text-white text-xs rounded transition cursor-pointer"
                        title="Xóa khỏi hàng chờ"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL KẾT QUẢ QUAY (Nằm bên trong arenaRef để hiển thị khi Fullscreen - Yêu cầu 1) */}
        <ResultModal
          isOpen={isResultModalOpen}
          student={selectedStudent}
          expReward={settings.correctExp}
          onCorrect={() => {
            if (selectedStudent) {
              void handleConfirmStudentResult(selectedStudent.id, 'correct', settings.correctExp);
            }
          }}
          onWrong={() => {
            if (selectedStudent) {
              void handleConfirmStudentResult(selectedStudent.id, 'wrong', 0);
            }
          }}
          onQueue={() => {
            if (selectedStudent) {
              void handleConfirmStudentResult(selectedStudent.id, 'queue');
            }
          }}
          onSkip={() => {
            if (selectedStudent) {
              void handleConfirmStudentResult(selectedStudent.id, 'skip');
            }
          }}
        />
      </div>

      {/* 4. HÀNG CHỜ HỌC SINH LÊN BẢNG (Chế độ xem thông thường) */}
      {!isFullscreen && (
        <QueueBar
          queue={queue}
          expReward={settings.correctExp}
          onGradeStudent={handleGradeFromQueue}
          onRemoveFromQueue={handleRemoveFromQueue}
        />
      )}
    </div>
  );
};
