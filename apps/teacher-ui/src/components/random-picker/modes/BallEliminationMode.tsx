import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RandomPickerModeProps } from '../types.js';
import { soundManager } from '../sound.js';

interface BallItem {
  id: number;
  digit: number;
  isAlive: boolean;
  isPopping: boolean;
  isTarget: boolean;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}

// Bảng màu 10 quả bóng số sống động, tương phản sắc nét theo phong cách hiện đại
const BALL_PALETTES = [
  // 0: Đỏ Ruby
  {
    bg: 'from-rose-500 via-red-600 to-rose-800',
    border: 'border-rose-300',
    text: 'text-white',
    glow: 'shadow-rose-500/50',
  },
  // 1: Xanh Dương Đại Dương
  {
    bg: 'from-sky-500 via-blue-600 to-indigo-800',
    border: 'border-sky-300',
    text: 'text-white',
    glow: 'shadow-blue-500/50',
  },
  // 2: Xanh Lục Bảo
  {
    bg: 'from-emerald-400 via-green-600 to-teal-800',
    border: 'border-emerald-300',
    text: 'text-white',
    glow: 'shadow-emerald-500/50',
  },
  // 3: Vàng Hổ Phách
  {
    bg: 'from-amber-400 via-amber-500 to-orange-700',
    border: 'border-yellow-200',
    text: 'text-amber-950',
    glow: 'shadow-amber-500/50',
  },
  // 4: Tím Thạch Anh
  {
    bg: 'from-purple-500 via-violet-600 to-indigo-900',
    border: 'border-purple-300',
    text: 'text-white',
    glow: 'shadow-purple-500/50',
  },
  // 5: Hồng Neon
  {
    bg: 'from-pink-400 via-rose-500 to-pink-800',
    border: 'border-pink-200',
    text: 'text-white',
    glow: 'shadow-pink-500/50',
  },
  // 6: Xanh Ngọc Cyan
  {
    bg: 'from-cyan-400 via-teal-500 to-cyan-800',
    border: 'border-cyan-200',
    text: 'text-white',
    glow: 'shadow-cyan-500/50',
  },
  // 7: Cam Rực Rỡ
  {
    bg: 'from-orange-400 via-amber-600 to-red-700',
    border: 'border-orange-200',
    text: 'text-white',
    glow: 'shadow-orange-500/50',
  },
  // 8: Xanh Chanh Lime
  {
    bg: 'from-lime-400 via-emerald-500 to-green-800',
    border: 'border-lime-200',
    text: 'text-emerald-950',
    glow: 'shadow-lime-500/50',
  },
  // 9: Tím Fuchsia Huyền Bí
  {
    bg: 'from-fuchsia-500 via-pink-600 to-purple-900',
    border: 'border-fuchsia-300',
    text: 'text-white',
    glow: 'shadow-fuchsia-500/50',
  },
];

type Phase = 'idle' | 'ready' | 'eliminating' | 'suspense' | 'merging' | 'revealed';

/**
 * Trộn mảng ngẫu nhiên (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export const BallEliminationMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  candidates = [],
  isCompleted,
  onEliminationComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [balls, setBalls] = useState<BallItem[]>([]);
  const [targetDigits, setTargetDigits] = useState<number[]>([]);
  const [targetStudentNum, setTargetStudentNum] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Sẵn sàng khởi động Dãy Bóng Số');
  const timeoutsRef = useRef<number[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(t => window.clearTimeout(t));
    timeoutsRef.current = [];
  };

  const addTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  // Khởi tạo dãy bóng mẫu ngẫu nhiên khi chưa quay
  useEffect(() => {
    if (!isPicking && !selectedStudent) {
      clearAllTimeouts();
      setPhase('idle');
      // Tạo 10 quả bóng từ 0 đến 9 lộn xộn
      const initialDigits = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const initialBalls: BallItem[] = initialDigits.map((digit, idx) => ({
        id: idx + 1,
        digit,
        isAlive: true,
        isPopping: false,
        isTarget: false,
        colorTheme: BALL_PALETTES[digit % BALL_PALETTES.length]!,
      }));
      setBalls(initialBalls);
      setTargetDigits([]);
      setTargetStudentNum(0);
      setStatusMessage('Dãy 10 quả bóng đánh số lộn xộn từ 0 tới 9');
    }
  }, [isPicking, selectedStudent]);

  // Khi đã hoàn thành quay xong từ trước
  useEffect(() => {
    if (!isPicking && selectedStudent && isCompleted && phase !== 'revealed') {
      setPhase('revealed');
      setStatusMessage(`🎉 Số thứ tự được chọn: ${selectedStudent.name}`);
    }
  }, [isPicking, selectedStudent, isCompleted, phase]);

  // Quy trình chính: Bắt đầu nổ bóng khi isPicking và selectedStudent có giá trị
  useEffect(() => {
    if (!isPicking || !selectedStudent) return;

    clearAllTimeouts();
    setPhase('ready');

    // 1. Xác định số thứ tự của học sinh trúng đích trong danh sách
    const targetIdx = candidates.findIndex(s => s.id === selectedStudent.id);
    const studentNum = targetIdx >= 0 ? targetIdx + 1 : 1;
    setTargetStudentNum(studentNum);

    // 2. Xác định các chữ số mục tiêu:
    // Nếu STT < 10 (vd: 7): mục tiêu là 1 quả bóng [7]
    // Nếu STT >= 10 (vd: 27 hoặc 22): mục tiêu là 2 quả bóng [2, 7] hoặc [2, 2] (hỗ trợ trùng số!)
    let requiredDigits: number[] = [];
    if (studentNum < 10) {
      requiredDigits = [studentNum];
    } else {
      const tens = Math.floor((studentNum % 100) / 10);
      const units = (studentNum % 100) % 10;
      requiredDigits = [tens, units];
    }
    setTargetDigits(requiredDigits);

    // 3. Tạo 10 quả bóng ban đầu:
    // Chắc chắn chứa requiredDigits (được đánh dấu isTarget = true)
    // Các quả còn lại là ngẫu nhiên 0..9
    const remainingCount = 10 - requiredDigits.length;
    const dummyPool: number[] = [];
    for (let i = 0; i < remainingCount; i++) {
      dummyPool.push(Math.floor(Math.random() * 10));
    }

    const allDigits = [
      ...requiredDigits.map(d => ({ digit: d, isTarget: true })),
      ...dummyPool.map(d => ({ digit: d, isTarget: false })),
    ];

    // Xáo trộn vị trí 10 quả bóng hoàn toàn ngẫu nhiên
    const shuffled = shuffleArray(allDigits);
    const generatedBalls: BallItem[] = shuffled.map((item, idx) => ({
      id: idx + 1,
      digit: item.digit,
      isAlive: true,
      isPopping: false,
      isTarget: item.isTarget,
      colorTheme: BALL_PALETTES[item.digit % BALL_PALETTES.length]!,
    }));

    setBalls(generatedBalls);
    setStatusMessage('🎯 Bắt đầu chuỗi nổ bóng ngẫu nhiên...');

    // 4. Kích hoạt chuỗi nổ từng quả một
    // Danh sách các quả bóng cần nổ = những quả có isTarget === false
    const dummyBallIds = generatedBalls.filter(b => !b.isTarget).map(b => b.id);
    // Xáo trộn thứ tự nổ ngẫu nhiên
    const popOrder = shuffleArray(dummyBallIds);

    // Bắt đầu chuỗi nổ sau 500ms
    let accumulatedDelay = 500;

    popOrder.forEach((ballIdToPop, stepIndex) => {
      // Nhịp nổ: các quả đầu nhanh hơn (350-450ms), các quả cuối chậm dần (600-900ms) để dồn nén kịch tính
      let stepDuration = 400;
      if (stepIndex >= popOrder.length - 3) {
        stepDuration = 600;
      }
      if (stepIndex >= popOrder.length - 2) {
        stepDuration = 800;
      }
      if (stepIndex === popOrder.length - 1) {
        stepDuration = 1000;
      }

      accumulatedDelay += stepDuration;

      addTimeout(() => {
        setPhase('eliminating');
        const remainingCount = popOrder.length - stepIndex;
        setStatusMessage(
          `💥 Đang nổ bóng ngẫu nhiên... Còn ${remainingCount + requiredDigits.length} quả`
        );

        // Đánh dấu quả bóng đang nổ
        setBalls(prev => prev.map(b => (b.id === ballIdToPop ? { ...b, isPopping: true } : b)));

        soundManager.playBalloonPop();
        soundManager.playEliminationTick();

        // Sau 180ms biến mất hoàn toàn
        addTimeout(() => {
          setBalls(prev =>
            prev.map(b => (b.id === ballIdToPop ? { ...b, isAlive: false, isPopping: false } : b))
          );
        }, 180);
      }, accumulatedDelay);
    });

    // 5. Giai đoạn Hồi hộp (Suspense): Khi chỉ còn lại 2 (hoặc 1) quả bóng cuối cùng
    accumulatedDelay += 900;
    addTimeout(() => {
      setPhase('suspense');
      if (requiredDigits.length === 2) {
        setStatusMessage('⏳ NÍN THỞ: Còn lại đúng 2 quả bóng cuối cùng!');
      } else {
        setStatusMessage('⏳ NÍN THỞ: Còn lại duy nhất 1 quả bóng số!');
      }
      soundManager.playHeartbeat();
    }, accumulatedDelay);

    // 6. Giai đoạn Ghép số (Merging): 2 quả bóng trôi về giữa màn hình
    accumulatedDelay += 1400;
    addTimeout(() => {
      setPhase('merging');
      setStatusMessage('✨ Đang ghép thành Số Thứ Tự học sinh...');
      soundManager.playWhistle();
    }, accumulatedDelay);

    // 7. Giai đoạn Công bố (Revealed)
    accumulatedDelay += 1200;
    addTimeout(() => {
      setPhase('revealed');
      setStatusMessage(
        `👑 CHIẾN THẮNG: STT ${studentNum < 10 ? `0${studentNum}` : studentNum} — ${selectedStudent.name}!`
      );
      soundManager.playWinner();
      soundManager.playFireworkBurst();

      // Báo tab cha kết thúc để mở modal kết quả
      onEliminationComplete?.();
    }, accumulatedDelay);

    return () => clearAllTimeouts();
  }, [isPicking, selectedStudent]);

  // Lọc các quả bóng còn sống
  const survivingBalls = useMemo(() => {
    return balls.filter(b => b.isAlive);
  }, [balls]);

  const displayStudentNumFormatted =
    targetStudentNum > 0
      ? targetStudentNum < 10
        ? `0${targetStudentNum}`
        : `${targetStudentNum}`
      : '--';

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 select-none min-h-[460px] relative px-2">
      {/* 1. THANH TRẠNG THÁI TIẾN TRÌNH */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/80 border border-slate-700/80 text-white shadow-xl backdrop-blur-md">
          <span className="text-xl">
            {phase === 'idle' && '🎱'}
            {phase === 'ready' && '🎯'}
            {phase === 'eliminating' && '💥'}
            {phase === 'suspense' && '💓'}
            {phase === 'merging' && '✨'}
            {phase === 'revealed' && '👑'}
          </span>
          <span className="font-bold text-sm sm:text-base tracking-wide text-slate-100">
            {statusMessage}
          </span>
        </div>

        {/* Thông tin số lượng bóng còn lại */}
        {phase === 'eliminating' && (
          <div className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-3 py-1 rounded-full">
            Bóng sống sót: {survivingBalls.length} / 10
          </div>
        )}
      </div>

      {/* 2. KHU VỰC SÂN KHẤU DÃY BÓNG (IDLE, READY, ELIMINATING, SUSPENSE) */}
      {phase !== 'revealed' && phase !== 'merging' && (
        <div className="w-full max-w-5xl bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center min-h-[280px]">
          {/* Hàng 10 quả bóng dàn ngang */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 w-full">
            {balls.map(ball => {
              if (!ball.isAlive && !ball.isPopping) {
                // Quả bóng đã nổ hoàn toàn: Giữ chỗ mờ tàn tích
                return (
                  <div
                    key={ball.id}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border border-dashed border-slate-800/60 bg-slate-950/20 flex items-center justify-center opacity-30 scale-75 transition-all duration-300"
                  >
                    <span className="text-xs text-slate-600 font-mono">✕</span>
                  </div>
                );
              }

              const isSuspenseTarget = phase === 'suspense' && ball.isTarget;

              return (
                <div
                  key={ball.id}
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 select-none
                    w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
                    bg-gradient-to-br ${ball.colorTheme.bg}
                    border-2 sm:border-3 ${ball.colorTheme.border}
                    shadow-lg ${ball.colorTheme.glow}
                    ${ball.isPopping ? 'scale-125 opacity-70 animate-ping' : ''}
                    ${isSuspenseTarget ? 'scale-115 ring-4 ring-amber-400/80 animate-bounce' : 'hover:scale-105'}
                  `}
                  style={{
                    boxShadow: isSuspenseTarget
                      ? '0 0 30px rgba(251, 191, 36, 0.7), inset 0 2px 6px rgba(255, 255, 255, 0.6)'
                      : '0 8px 20px rgba(0, 0, 0, 0.35), inset 0 2px 6px rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {/* Điểm sáng bóng 3D bóng bẩy phía trên góc 10h */}
                  <div className="absolute top-1.5 left-2 sm:top-2 sm:left-3 w-4 h-2.5 sm:w-5 sm:h-3 rounded-full bg-white/40 blur-[1px] pointer-events-none transform -rotate-30" />

                  {/* Chữ số hiển thị trên bóng */}
                  <span
                    className={`font-black text-2xl sm:text-3xl md:text-4xl ${ball.colorTheme.text} drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}
                  >
                    {ball.digit}
                  </span>

                  {/* Hiệu ứng hạt nổ văng ra khi isPopping */}
                  {ball.isPopping && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-amber-400/80 animate-ping" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dòng chú thích bên dưới dãy bóng */}
          <div className="mt-8 text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <span>✨</span>
            <span>
              Mỗi lượt nổ ngẫu nhiên 1 quả bóng. 2 quả (hoặc 1 quả) cuối cùng sẽ ghép thành STT!
            </span>
          </div>
        </div>
      )}

      {/* 3. KHU VỰC GHÉP SỐ VÀ CÔNG BỐ (MERGING & REVEALED) */}
      {(phase === 'merging' || phase === 'revealed') && (
        <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-950/95 border-2 border-amber-400/60 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <div className="text-amber-400 text-xs sm:text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span>✨</span>
            <span>
              {phase === 'merging' ? 'HAI QUẢ BÓNG SỐ HỢP NHẤT' : 'SỐ THỨ TỰ HỌC SINH CHIẾN THẮNG'}
            </span>
            <span>✨</span>
          </div>

          {/* Hai quả bóng sống sót bay sát vào nhau tạo thành STT */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 my-4">
            {targetDigits.map((digit, idx) => {
              const palette = BALL_PALETTES[digit % BALL_PALETTES.length]!;
              return (
                <div
                  key={`survivor-${idx}`}
                  className={`relative flex items-center justify-center rounded-full
                    w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28
                    bg-gradient-to-br ${palette.bg}
                    border-4 ${palette.border}
                    shadow-2xl ${palette.glow}
                    ring-4 ring-amber-300/60 animate-bounce
                  `}
                  style={{
                    boxShadow:
                      '0 0 35px rgba(251, 191, 36, 0.6), inset 0 3px 8px rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {/* Điểm sáng 3D */}
                  <div className="absolute top-2 left-3 sm:top-2.5 sm:left-4 w-6 h-3.5 sm:w-8 sm:h-4 rounded-full bg-white/50 blur-[1px] pointer-events-none transform -rotate-30" />
                  <span className="font-black text-4xl sm:text-5xl md:text-6xl text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">
                    {digit}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nhãn ghép số STT */}
          <div className="mt-3 inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-xl sm:text-2xl tracking-wider">
            STT: {displayStudentNumFormatted}
          </div>

          {/* Thẻ học sinh trúng đích công bố hoành tráng */}
          {selectedStudent && (
            <div className="mt-6 w-full bg-slate-900/90 border border-amber-400/40 rounded-2xl p-5 text-center shadow-xl">
              <div className="text-xs uppercase font-bold text-slate-400 mb-1">
                Học sinh được gọi lên bảng
              </div>
              <div className="font-black text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200">
                {selectedStudent.name}
              </div>
              {selectedStudent.code && (
                <div className="mt-1 text-sm font-semibold text-slate-400">
                  Mã học sinh: {selectedStudent.code}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
