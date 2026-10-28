import React, { useEffect, useRef, useState } from 'react';
import type {
  PickerQueueItem,
  PickerSelectionStrategy,
  PickerStudent,
  RandomPickerSettings,
} from '@educlass/protocol';
import { FireworksCanvas } from './effects/FireworksCanvas.js';
import { PICKER_MODES } from './modes/index.js';
import { soundManager } from './sound.js';
import type {
  BalloonItem,
  MagicCardItem,
  MysteryBoxItem,
  RandomPickerSyncMessage,
  SlotMachineState,
} from './types.js';

export const RandomPickerProjectorWindow: React.FC = () => {
  const [students, setStudents] = useState<PickerStudent[]>([]);
  const [queue, setQueue] = useState<PickerQueueItem[]>([]);
  const [settings, setSettings] = useState<RandomPickerSettings>({
    mode: 'card_flip',
    correctExp: 10,
    excludeCalled: true,
    soundEnabled: true,
    animationDurationMs: 1500,
  });
  const [selectedStudent, setSelectedStudent] = useState<PickerStudent | null>(null);
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [hasCalledAny, setHasCalledAny] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFireworks, setShowFireworks] = useState<boolean>(false);

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

  const [boxes, setBoxes] = useState<MysteryBoxItem[]>([
    { id: 1, student: null, status: 'idle', isTarget: false },
    { id: 2, student: null, status: 'idle', isTarget: false },
    { id: 3, student: null, status: 'idle', isTarget: false },
  ]);

  const [slotState, setSlotState] = useState<SlotMachineState>({
    tens: 0,
    units: 0,
    studentNumber: 0,
    targetStudent: null,
    isSpinningTens: false,
    isSpinningUnits: false,
  });

  const [balloons, setBalloons] = useState<BalloonItem[]>([]);
  const [magicCards, setMagicCards] = useState<MagicCardItem[]>([]);

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const ch = new BroadcastChannel('educlass_random_picker');
      channelRef.current = ch;

      ch.onmessage = (event: MessageEvent<RandomPickerSyncMessage>) => {
        const msg = event.data;
        if (msg.type === 'SYNC_STATE') {
          setStudents(msg.payload.students);
          setQueue(msg.payload.queue);
          setSettings(msg.payload.settings);
          setSelectedStudent(msg.payload.selectedStudent);
          setIsPicking(msg.payload.isPicking);
          setCards(msg.payload.cards);
          if (msg.payload.boxes) setBoxes(msg.payload.boxes);
          if (msg.payload.slotState) setSlotState(msg.payload.slotState);
          if (msg.payload.balloons) setBalloons(msg.payload.balloons);
          if (msg.payload.magicCards) setMagicCards(msg.payload.magicCards);
          if (typeof msg.payload.showFireworks === 'boolean') {
            setShowFireworks(msg.payload.showFireworks);
          }
        } else if (msg.type === 'TRIGGER_PICK') {
          handleExecutePick(
            msg.payload.targetStudent,
            msg.payload.targetCardIndex,
            msg.payload.dummyStudents
          );
        } else if (msg.type === 'TRIGGER_FIREWORKS') {
          setShowFireworks(true);
          setIsPicking(false);
        } else if (msg.type === 'RESET') {
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

  const handleExecutePick = (
    target: PickerStudent,
    targetIndex: number,
    dummyStudents: PickerStudent[]
  ) => {
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

  const handleTriggerPickProjector = (strategy: PickerSelectionStrategy = 'normal') => {
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
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const CurrentModeComponent =
    PICKER_MODES[settings.mode]?.component || PICKER_MODES.card_flip.component;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-6 select-none overflow-hidden relative">
      {/* Sao mờ nền */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.2),transparent_70%)] pointer-events-none" />

      {/* Pháo hoa nổ chúc mừng */}
      <FireworksCanvas active={showFireworks} onFinish={() => setShowFireworks(false)} />

      {/* Header máy chiếu */}
      <div className="z-10 flex items-center justify-between border-b border-indigo-900/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎲</span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow">
              EduClass — Quay Số Gọi Học Sinh
            </h1>
            <p className="text-sm text-indigo-300 font-medium">
              Chế độ trình chiếu máy chiếu & màn hình tương tác
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="px-4 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 font-semibold text-sm transition"
        >
          {isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình F11'}
        </button>
      </div>

      {/* Khu vực trung tâm theo Mode */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center my-4">
        <div className="mb-4 text-center">
          <span className="text-base uppercase tracking-widest font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-5 py-1.5 rounded-full shadow-lg">
            {PICKER_MODES[settings.mode]?.name || '🃏 Lật Thẻ Bài Thần Bí'}
          </span>
        </div>

        <CurrentModeComponent
          isPicking={isPicking}
          selectedStudent={selectedStudent}
          candidates={students}
          cards={cards}
          onFlipCard={() => {}}
          boxes={boxes}
          slotState={slotState}
          balloons={balloons}
          magicCards={magicCards}
          onEliminationComplete={() => {
            setShowFireworks(true);
            setIsPicking(false);
          }}
          onMarbleRaceComplete={winnerStudent => {
            setSelectedStudent(winnerStudent);
            setShowFireworks(true);
            if (settings.soundEnabled) {
              soundManager.playWinner();
              soundManager.playFireworkBurst();
            }
            window.setTimeout(() => {
              setIsPicking(false);
            }, 2200);
          }}
          onDuckHuntComplete={winnerStudent => {
            setSelectedStudent(winnerStudent);
            setShowFireworks(true);
            if (settings.soundEnabled) {
              soundManager.playWinner();
              soundManager.playFireworkBurst();
            }
            window.setTimeout(() => {
              setIsPicking(false);
            }, 1500);
          }}
          isCompleted={!isPicking && selectedStudent !== null}
          isFullscreen={true}
        />

        {/* Nút bấm quay (hỗ trợ bấm trực tiếp trên màn hình tương tác Smart Board, ẩn khi là duck_hunt) */}
        {settings.mode !== 'duck_hunt' && (
          <div className="mt-8 flex flex-col items-center">
            <div className="inline-flex items-stretch rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all hover:border-amber-300">
              <button
                type="button"
                onClick={() => handleTriggerPickProjector('normal')}
                disabled={isPicking}
                className="px-10 py-4 font-black text-2xl text-white tracking-wide flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span className="text-3xl">🎲</span>
                <span>{hasCalledAny ? 'Học sinh tiếp theo' : 'Học sinh đầu tiên'}</span>
              </button>

              {/* Nút ẩn bí mật mép phải */}
              <button
                type="button"
                onClick={() => handleTriggerPickProjector('bias_good')}
                disabled={isPicking}
                className="w-12 border-l border-white/20 bg-amber-600/40 hover:bg-amber-600/70 text-amber-100 flex items-center justify-center cursor-pointer disabled:opacity-50"
                aria-label="Chọn ngẫu nhiên"
              >
                <span className="text-xs opacity-40">✦</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer máy chiếu: hàng chờ nếu có */}
      <div className="z-10 border-t border-indigo-900/60 pt-3 flex items-center justify-between text-xs text-indigo-400">
        <div>
          {queue.length > 0 ? (
            <span className="text-indigo-200 font-medium">
              ⏳ Đang có {queue.length} bạn trên bảng làm bài:{' '}
              {queue.map(q => q.student.name).join(', ')}
            </span>
          ) : (
            <span>EduClass v2 — Phần mềm tương tác lớp học offline</span>
          )}
        </div>
        <div className="font-mono text-indigo-400">Trạng thái: Đã kết nối với máy giáo viên</div>
      </div>
    </div>
  );
};
