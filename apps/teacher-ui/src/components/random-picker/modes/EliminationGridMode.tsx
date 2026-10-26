import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RandomPickerModeProps } from '../types.js';
import { soundManager } from '../sound.js';

type EliminationPhase =
  | 'idle'
  | 'ready'        // Thời gian đợi 1 giây trước khi bắt đầu (tất cả học sinh hiển thị đầy đủ)
  | 'stage1'       // Loại dần về 5 ô
  | 'top5_pause'   // Dừng công bố TOP 5
  | 'stage2'       // Loại từ 5 về 3 ô
  | 'top3_pause'   // Dừng công bố TOP 3
  | 'stage3'       // Loại từ 3 về 1 ô
  | 'winner';      // Vinh quang còn 1 ô duy nhất

// Bảng màu gradient phong phú cho các ô học sinh
const CARD_COLOR_PALETTES = [
  'from-indigo-900/90 to-blue-900/90 border-indigo-500/60 text-indigo-100',
  'from-emerald-900/90 to-teal-900/90 border-emerald-500/60 text-emerald-100',
  'from-purple-900/90 to-violet-900/90 border-purple-500/60 text-purple-100',
  'from-rose-900/90 to-pink-900/90 border-rose-500/60 text-rose-100',
  'from-amber-900/90 to-orange-900/90 border-amber-500/60 text-amber-100',
  'from-cyan-900/90 to-sky-900/90 border-cyan-500/60 text-cyan-100',
  'from-fuchsia-900/90 to-purple-900/90 border-fuchsia-500/60 text-fuchsia-100',
  'from-slate-800/90 to-slate-900/90 border-slate-600/60 text-slate-100',
];

/**
 * Trích xuất tên chính của học sinh (từ cuối cùng), hỗ trợ cả tên có tiền tố dân tộc (K', H', v.v.)
 */
function getGivenName(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;

  // Nếu từ kế cuối là tiền tố người đồng bào dân tộc thiểu số (K', H', Ya, v.v.)
  const secondToLast = parts[parts.length - 2] || '';
  if (/^[KkHhYy]['’]/i.test(secondToLast)) {
    return `${secondToLast} ${parts[parts.length - 1]}`;
  }

  return parts[parts.length - 1] || trimmed;
}

/**
 * Tính toán font size (px) tự động co giãn theo từng tên học sinh,
 * đảm bảo tên dài (5-7 ký tự) KHÔNG BAO GIỜ bị cắt thành dấu "..." trên màn hình nhỏ.
 */
function getStudentFontSizePx(name: string, cellW: number, cellH: number): number {
  const len = Math.max(2, name.length);
  // Chiều rộng khả dụng trừ padding 2 bên (khoảng 8-10px)
  const availW = Math.max(20, cellW - 10);
  // Chiều cao khả dụng cho phần chữ (trừ thanh số thứ tự ở trên)
  const availH = Math.max(16, cellH - 20);

  // Hệ số chiều rộng trung bình mỗi ký tự tiếng Việt chữ đậm (~0.58 đến 0.67 lần fontSize)
  const charFactor = len <= 3 ? 0.58 : len <= 5 ? 0.63 : 0.68;
  const maxFontByW = Math.floor(availW / (len * charFactor));
  const maxFontByH = Math.floor(availH * 0.95);

  // Giới hạn trong khoảng an toàn (tối thiểu 11px, tối đa 32px)
  return Math.max(11, Math.min(maxFontByW, maxFontByH, 32));
}

export const EliminationGridMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  candidates,
  isCompleted,
  onEliminationComplete,
}) => {
  // Trạng thái theo dõi các ô
  const [phase, setPhase] = useState<EliminationPhase>('idle');
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [eliminatingIds, setEliminatingIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string>('Sẵn sàng khởi động Đấu Trường');

  // Ref đo kích thước thực tế vùng bàn cờ để tính toán kích thước ô không bị tràn màn hình
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({
    width: 900,
    height: 440,
  });

  // Quản lý timeout để dọn dẹp an toàn
  const timeoutsRef = useRef<number[]>([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  };

  const addTimeout = (cb: () => void, ms: number) => {
    const id = window.setTimeout(cb, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  // Cập nhật kích thước vùng chứa thông qua ResizeObserver
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBoardSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Reset về trạng thái ban đầu khi dừng quay hoặc không có học sinh
  useEffect(() => {
    if (!isPicking && !selectedStudent) {
      clearAllTimeouts();
      setPhase('idle');
      setEliminatedIds(new Set());
      setEliminatingIds(new Set());
      setStatusMessage('Sẵn sàng khởi động Đấu Trường');
    }
  }, [isPicking, selectedStudent]);

  // Khi có kết quả đã hoàn thành mà không phải đang trong vòng quay
  useEffect(() => {
    if (!isPicking && selectedStudent && isCompleted) {
      setPhase('winner');
      // Giữ người chiến thắng là ô duy nhất không bị loại
      const allExceptWinner = new Set(
        candidates.filter((s) => s.id !== selectedStudent.id).map((s) => s.id)
      );
      setEliminatedIds(allExceptWinner);
      setEliminatingIds(new Set());
      setStatusMessage(`👑 CHIẾN THẮNG: ${selectedStudent.name}!`);
    }
  }, [isPicking, selectedStudent, isCompleted, candidates]);

  // Quy trình kích hoạt các đợt loại bỏ chậm rãi, kịch tính
  useEffect(() => {
    if (!isPicking || !selectedStudent) return;

    clearAllTimeouts();
    setEliminatedIds(new Set());
    setEliminatingIds(new Set());
    setPhase('ready');
    setStatusMessage('⚔️ ĐẤU TRƯỜNG SINH TỒN: Chuẩn bị khởi tranh...');

    const pool = candidates && candidates.length > 0 ? candidates : [selectedStudent];
    const totalCount = pool.length;

    // Danh sách học sinh thua cuộc (loại trừ người chiến thắng)
    const losers = pool.filter((s) => s.id !== selectedStudent.id);

    // Xáo trộn ngẫu nhiên danh sách losers
    const shuffledLosers = [...losers].sort(() => Math.random() - 0.5);

    // Tính toán số lượng cần loại ở từng giai đoạn:
    // Giai đoạn 1: Loại để còn lại tối đa 5 ô
    const targetStage1Remaining = Math.min(totalCount, 5);
    const stage1EliminationCount = Math.max(0, totalCount - targetStage1Remaining);
    const stage1Losers = shuffledLosers.slice(0, stage1EliminationCount);

    // Còn lại sau Stage 1: 5 người (trong đó có 4 losers và 1 winner)
    const remainingLosersAfterStage1 = shuffledLosers.slice(stage1EliminationCount);

    // Giai đoạn 2: Loại tiếp để còn lại tối đa 3 ô (loại thêm tối đa 2 người)
    const currentCountAfterStage1 = totalCount - stage1EliminationCount;
    const targetStage2Remaining = Math.min(currentCountAfterStage1, 3);
    const stage2EliminationCount = Math.max(0, currentCountAfterStage1 - targetStage2Remaining);
    const stage2Losers = remainingLosersAfterStage1.slice(0, stage2EliminationCount);

    // Giai đoạn 3: Loại tiếp để còn đúng 1 ô (người chiến thắng)
    const stage3Losers = remainingLosersAfterStage1.slice(stage2EliminationCount);

    // =========================================================================
    // TÍNH TOÁN THỜI LƯỢNG: ĐỢI 1 GIÂY TRƯỚC KHI BẮT ĐẦU -> TỔNG THỜI GIAN ~10 GIÂY
    // =========================================================================
    // Thời gian đợi 1 giây (1000ms) trước khi bắt đầu loại học sinh
    let cumulativeTime = 1000;

    if (totalCount > 5) {
      // Trường hợp lớp đông (> 5 học sinh):
      // Đợi khởi động: 1.0s (0.0s - 1.0s, toàn bộ học sinh hiển thị đầy đủ)
      // Vòng 1: từ 1.0s tới 6.0s (kéo dài 5.0s = 5000ms, kết thúc đúng mốc 6 giây)
      // Dừng Top 5: 0.7s (6.0s - 6.7s, giảm 0.4s từ 1.1s)
      // Vòng 2: 1.2s (6.7s - 7.9s, giảm 0.4s từ 1.6s)
      // Dừng Top 3: 0.8s (7.9s - 8.7s, giảm 0.4s từ 1.2s)
      // Vòng 3 (Chung kết): 1.6s (8.7s - 10.3s, giảm 0.4s từ 2.0s)
      // -> Kết thúc chạm mốc chiến thắng tại ~10.3s
      const stage1Duration = 5000;
      const stepDelay = Math.max(50, Math.floor(stage1Duration / stage1Losers.length));
      const flashDuration = Math.min(100, Math.max(30, Math.floor(stepDelay * 0.55)));

      addTimeout(() => {
        setPhase('stage1');
        setStatusMessage(`⚡ VÒNG 1: Loại bão táp — Tìm TOP 5 sống sót!`);
      }, cumulativeTime);

      stage1Losers.forEach((loser, index) => {
        const timeToStart = cumulativeTime + index * stepDelay;

        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playEliminationTick();
          const remainingCount = totalCount - (index + 1);
          setStatusMessage(`⚡ VÒNG 1: Còn lại ${remainingCount} bạn...`);
        }, timeToStart);

        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, timeToStart + flashDuration);
      });

      // Kết thúc chính xác Vòng 1 ở mốc 6.0 giây
      cumulativeTime = 6000;

      // DỪNG CÔNG BỐ TOP 5: 0.7 giây (đạt mốc 6.7s, giảm 0.4s từ 1.1s)
      addTimeout(() => {
        setPhase('top5_pause');
        setStatusMessage('🔥 ĐÃ XÁC ĐỊNH TOP 5: Tranh vé vào TOP 3!');
        soundManager.playDramaticHit();
        soundManager.playHeartbeat();
      }, cumulativeTime);
      cumulativeTime += 700;

      // VÒNG 2: RÚT GỌN VỀ 3 Ô: 1.2 giây (đạt mốc 7.9s, giảm 0.4s từ 1.6s)
      addTimeout(() => {
        setPhase('stage2');
        setStatusMessage('⚔️ VÒNG 2: Quyết chiến vào TOP 3!');
      }, cumulativeTime);

      stage2Losers.forEach((loser, index) => {
        const eliminationTime = cumulativeTime + 200 + index * 500;

        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playDramaticHit();
          const remaining = 5 - (index + 1);
          setStatusMessage(`⚔️ VÒNG 2: Còn lại ${remaining} bạn!`);
        }, eliminationTime);

        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, eliminationTime + 180);
      });

      cumulativeTime += 1200;

      // DỪNG CÔNG BỐ TOP 3: 0.8 giây (đạt mốc 8.7s, giảm 0.4s từ 1.2s)
      addTimeout(() => {
        setPhase('top3_pause');
        setStatusMessage('✨ TOP 3 BẢN LĨNH: Chuẩn bị bước vào CHUNG KẾT!');
        soundManager.playHeartbeat();
      }, cumulativeTime);
      cumulativeTime += 800;

      // VÒNG 3: CHUNG KẾT VỀ 1 Ô: 1.6 giây (đạt mốc 10.3s, giảm 0.4s từ 2.0s)
      addTimeout(() => {
        setPhase('stage3');
        setStatusMessage('👑 CHUNG KẾT: Tìm ra 1 người may mắn nhất!');
      }, cumulativeTime);

      stage3Losers.forEach((loser, index) => {
        // Ô đầu loại ở +200ms (đưa về 1 vs 1 duel)
        // Ô thứ hai loại ở +1000ms (chốt người chiến thắng)
        const delayBeforeThis = index === 0 ? 200 : 1000;
        const eliminationTime = cumulativeTime + delayBeforeThis;

        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playDramaticHit();
          if (index === 0 && stage3Losers.length > 1) {
            setStatusMessage('💥 ĐỐI ĐẦU 1 VS 1: Ai sẽ là người chiến thắng?!');
          }
        }, eliminationTime);

        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, eliminationTime + 200);
      });

      cumulativeTime += 1600;
    } else if (totalCount >= 4) {
      // Trường hợp 4 - 5 học sinh: đợi 1s, sau đó phân bổ đến 10s
      addTimeout(() => {
        setPhase('top5_pause');
        setStatusMessage('🔥 BẮT ĐẦU VÒNG ĐẤU: Tranh vé vào TOP 3!');
        soundManager.playDramaticHit();
        soundManager.playHeartbeat();
      }, cumulativeTime);
      cumulativeTime += 1500;

      addTimeout(() => {
        setPhase('stage2');
        setStatusMessage('⚔️ VÒNG 2: Quyết chiến vào TOP 3!');
      }, cumulativeTime);

      stage2Losers.forEach((loser, index) => {
        const eliminationTime = cumulativeTime + 400 + index * 1200;
        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playDramaticHit();
        }, eliminationTime);
        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, eliminationTime + 250);
      });
      cumulativeTime += 3000;

      addTimeout(() => {
        setPhase('top3_pause');
        setStatusMessage('✨ TOP 3 BẢN LĨNH: Chuẩn bị bước vào CHUNG KẾT!');
        soundManager.playHeartbeat();
      }, cumulativeTime);
      cumulativeTime += 1800;

      addTimeout(() => {
        setPhase('stage3');
        setStatusMessage('👑 CHUNG KẾT: Tìm ra 1 người may mắn nhất!');
      }, cumulativeTime);

      stage3Losers.forEach((loser, index) => {
        const eliminationTime = cumulativeTime + (index === 0 ? 500 : 2000);
        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playDramaticHit();
          if (index === 0 && stage3Losers.length > 1) {
            setStatusMessage('💥 ĐỐI ĐẦU 1 VS 1: Ai sẽ là người chiến thắng?!');
          }
        }, eliminationTime);
        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, eliminationTime + 300);
      });
      cumulativeTime += 3200;
    } else if (totalCount >= 2) {
      // Trường hợp 2 - 3 học sinh: đợi 1s, sau đó đối đầu 1v1 gay cấn
      addTimeout(() => {
        setPhase('top3_pause');
        setStatusMessage('✨ ĐỐI ĐẦU TRỰC TIẾP: Chuẩn bị tìm ra người chiến thắng!');
        soundManager.playHeartbeat();
      }, cumulativeTime);
      cumulativeTime += 2400;

      addTimeout(() => {
        setPhase('stage3');
        setStatusMessage('💥 ĐỐI ĐẦU NGHẸT THỞ: Ai sẽ được chọn?!');
      }, cumulativeTime);

      stage3Losers.forEach((loser, index) => {
        const eliminationTime = cumulativeTime + (index === 0 && stage3Losers.length > 1 ? 2500 : 5500);
        addTimeout(() => {
          setEliminatingIds((prev) => new Set(prev).add(loser.id));
          soundManager.playDramaticHit();
        }, eliminationTime);
        addTimeout(() => {
          setEliminatingIds((prev) => {
            const next = new Set(prev);
            next.delete(loser.id);
            return next;
          });
          setEliminatedIds((prev) => new Set(prev).add(loser.id));
        }, eliminationTime + 350);
      });
      cumulativeTime += 7000;
    }

    // ==========================================
    // CHÍNH XÁC MỐC 10 GIÂY: CÔNG BỐ NGƯỜI ĐƯỢC CHỌN!
    // ==========================================
    addTimeout(() => {
      setPhase('winner');
      setStatusMessage(`🎉 CHÚC MỪNG: ${selectedStudent.name}!`);
      soundManager.playWinner();
      soundManager.playFireworkBurst();
      onEliminationComplete?.();
    }, cumulativeTime);

    return () => {
      clearAllTimeouts();
    };
  }, [isPicking, selectedStudent, candidates, onEliminationComplete]);

  // Danh sách học sinh ứng viên
  const studentPool = useMemo(() => {
    return candidates && candidates.length > 0 ? candidates : selectedStudent ? [selectedStudent] : [];
  }, [candidates, selectedStudent]);

  // Số lượng ô còn sống sót hiện tại
  const survivingStudents = useMemo(() => {
    return studentPool.filter((s) => !eliminatedIds.has(s.id));
  }, [studentPool, eliminatedIds]);

  // =========================================================================
  // TÍNH TOÁN BỐ CỤC LƯỚI HÌNH GẦN VUÔNG (TỶ LỆ ~1.15 : 1.35)
  // Ưu tiên chiều rộng ô đủ lớn để tên tiếng Việt không bao giờ bị cắt "..."
  // Đồng thời tổng kích thước không vượt quá màn hình, không sinh thanh cuộn
  // =========================================================================
  const { cols, rows, cellWidth, cellHeight } = useMemo(() => {
    const count = studentPool.length;
    if (count <= 0) {
      return { cols: 1, rows: 1, cellWidth: 80, cellHeight: 65 };
    }

    const w = Math.max(300, boardSize.width || 900);
    const h = Math.max(260, boardSize.height || 440);
    const gap = count > 32 ? 6 : 8;

    let bestCols = 1;
    let bestRows = count;
    let bestScore = 0;
    let bestW = 60;
    let bestH = 50;

    // Duyệt qua số cột khả thi từ 1 đến min(count, 14)
    const maxCols = Math.min(count, 14);
    for (let c = 1; c <= maxCols; c++) {
      const r = Math.ceil(count / c);
      const availW = w - (c - 1) * gap;
      const availH = h - (r - 1) * gap;
      if (availW <= 0 || availH <= 0) continue;

      const rawW = availW / c;
      const rawH = availH / r;

      // Chiều cao không được vượt quá rawW / 1.1 (tránh ô dạng dọc làm hẹp chiều ngang chữ)
      const maxHAllowed = rawW / 1.1;
      const effectiveH = Math.min(rawH, maxHAllowed);

      // Chiều rộng trong khoảng gần vuông (từ 1.1 đến 1.38 lần chiều cao)
      const maxWAllowed = effectiveH * 1.38;
      const effectiveW = Math.min(rawW, maxWAllowed);

      // Điểm số ưu tiên ô có chiều rộng tốt (>= 75px) để hiển thị trọn vẹn tên tiếng Việt
      const widthBonus = effectiveW >= 80 ? 1.3 : effectiveW >= 70 ? 1.15 : 1.0;
      const score = effectiveW * effectiveH * widthBonus;

      if (score > bestScore) {
        bestScore = score;
        bestCols = c;
        bestRows = r;
        bestW = effectiveW;
        bestH = effectiveH;
      }
    }

    const finalW = Math.max(54, Math.min(150, Math.floor(bestW)));
    const finalH = Math.max(44, Math.min(125, Math.floor(bestH)));

    return {
      cols: bestCols,
      rows: bestRows,
      cellWidth: finalW,
      cellHeight: finalH,
    };
  }, [studentPool.length, boardSize.width, boardSize.height]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between select-none">
      {/* 1. THANH TRẠNG THÁI & HUY HIỆU VÒNG ĐẤU */}
      <div className="w-full max-w-4xl mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-indigo-900/60 backdrop-blur-md shadow-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl animate-pulse">
            {phase === 'winner' ? '🏆' : phase === 'stage3' ? '👑' : phase === 'top3_pause' ? '⚡' : phase === 'top5_pause' ? '🔥' : '⚔️'}
          </span>
          <span className="font-extrabold text-sm sm:text-base text-amber-300 tracking-wide drop-shadow">
            {statusMessage}
          </span>
        </div>

        {/* Huy hiệu đếm số lượng ô còn lại */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-300 font-medium">Còn lại:</span>
          <span
            className={`px-3 py-0.5 rounded-xl font-black text-sm transition-all duration-300 shadow-md ${
              survivingStudents.length === 1
                ? 'bg-amber-500 text-slate-950 ring-2 ring-yellow-300 animate-bounce'
                : survivingStudents.length <= 3
                ? 'bg-amber-600/90 text-white ring-2 ring-amber-400'
                : survivingStudents.length <= 5
                ? 'bg-cyan-600/90 text-white ring-2 ring-cyan-400'
                : 'bg-indigo-950 text-indigo-200 border border-indigo-700/60'
            }`}
          >
            {survivingStudents.length} / {studentPool.length} ô
          </span>
        </div>
      </div>

      {/* 2. VÙNG BÀN CỜ LƯỚI Ô VUÔNG (ĐƯỢC ĐO KÍCH THƯỚC CHUẨN ĐỂ KHÔNG TRÀN KHỎI MÀN HÌNH) */}
      <div
        ref={boardRef}
        className="w-full flex-1 min-h-[300px] max-h-[66vh] flex items-center justify-center p-1 sm:p-2 overflow-hidden"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
            gap: `${studentPool.length > 32 ? 6 : 8}px`,
            justifyContent: 'center',
            alignContent: 'center',
          }}
          className="transition-all duration-300"
        >
          {studentPool.map((student, index) => {
            const isEliminated = eliminatedIds.has(student.id);
            const isEliminating = eliminatingIds.has(student.id);
            const isWinner = (phase === 'winner' || isCompleted) && selectedStudent?.id === student.id;
            const isTop3 = survivingStudents.length <= 3 && !isEliminated;
            const isTop5 = survivingStudents.length <= 5 && survivingStudents.length > 3 && !isEliminated;

            // QUY TẮC GIỮ NGUYÊN VỊ TRÍ:
            // Khi ô biến mất, vẫn giữ nguyên khối placeholder để lưới KHÔNG bị dồn lại
            if (isEliminated) {
              return (
                <div
                  key={student.id}
                  style={{ width: `${cellWidth}px`, height: `${cellHeight}px` }}
                  className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] opacity-0 pointer-events-none transition-all duration-300"
                  aria-hidden="true"
                />
              );
            }

            const colorClass = CARD_COLOR_PALETTES[index % CARD_COLOR_PALETTES.length] ?? '';
            const givenName = getGivenName(student.name);
            const fontSizePx = getStudentFontSizePx(givenName, cellWidth, cellHeight);

            // Định dạng phong cách ô gần vuông theo từng giai đoạn
            let cardStyle = `bg-gradient-to-br ${colorClass} border shadow-lg hover:border-white/50`;
            if (isEliminating) {
              cardStyle = 'bg-rose-950/95 border-rose-500 ring-4 ring-rose-500 text-white scale-90 opacity-70 animate-pulse';
            } else if (isWinner) {
              cardStyle = 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 border-yellow-200 text-slate-950 ring-4 ring-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.95)] scale-110 z-20 animate-bounce';
            } else if (isTop3) {
              cardStyle = 'bg-gradient-to-br from-amber-950/95 via-orange-900/90 to-amber-900/95 border-amber-400 text-amber-100 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105 z-10';
            } else if (isTop5) {
              cardStyle = 'bg-gradient-to-br from-sky-950/95 via-indigo-900/90 to-cyan-950/95 border-cyan-400 text-cyan-100 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]';
            }

            return (
              <div
                key={student.id}
                style={{ width: `${cellWidth}px`, height: `${cellHeight}px` }}
                title={`${index + 1}. ${student.name}`}
                className={`relative rounded-xl flex flex-col items-center justify-between p-1 transition-all duration-300 cursor-default select-none overflow-hidden ${cardStyle}`}
              >
                {/* 1. Phần đầu: Số thứ tự */}
                <div className="w-full flex items-center justify-between px-0.5 shrink-0 mb-0.5">
                  <span
                    className={`font-black rounded flex items-center justify-center shrink-0 shadow-sm leading-none ${
                      cellHeight >= 85
                        ? 'text-xs px-1.5 py-0.5'
                        : cellHeight >= 65
                        ? 'text-[10px] px-1 py-0.2'
                        : 'text-[9px] px-0.5 py-0'
                    } ${
                      isWinner
                        ? 'bg-slate-950 text-amber-300'
                        : isTop3
                        ? 'bg-amber-400 text-slate-950'
                        : isTop5
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-black/40 text-white/90'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  {/* Huy hiệu vòng thi nhỏ gọn góc trên */}
                  {isWinner ? (
                    <span className="text-xs sm:text-sm">👑</span>
                  ) : isTop3 ? (
                    <span className="text-[8px] font-black uppercase text-amber-300">TOP 3</span>
                  ) : isTop5 ? (
                    <span className="text-[8px] font-black uppercase text-cyan-300">TOP 5</span>
                  ) : null}
                </div>

                {/* 2. Phần trung tâm: Tên học sinh (font size tính tự động cho từng tên, chống cắt thành '...') */}
                <div className="flex-1 w-full flex items-center justify-center px-0.5 overflow-hidden">
                  <span
                    style={{
                      fontSize: `${fontSizePx}px`,
                      lineHeight: 1.1,
                    }}
                    className={`font-black text-center tracking-tight whitespace-nowrap overflow-hidden select-none drop-shadow-sm ${
                      isWinner
                        ? 'text-slate-950 font-black'
                        : isTop3
                        ? 'text-amber-100 font-black'
                        : isTop5
                        ? 'text-cyan-100 font-black'
                        : 'text-white font-extrabold'
                    }`}
                  >
                    {givenName}
                  </span>
                </div>

                {/* 3. Hiệu ứng nổ nhỏ khi đang loại */}
                {isEliminating && (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl animate-spin pointer-events-none">
                    💥
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MÀN HÌNH CHÚC MỪNG KHI CÒN 1 Ô DUY NHẤT */}
      {phase === 'winner' && selectedStudent && (
        <div className="mt-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-yellow-400/60 backdrop-blur-md flex flex-col items-center animate-fade-in shadow-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl animate-bounce">👑</span>
            <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight drop-shadow-md">
              {selectedStudent.name}
            </h2>
          </div>
          <p className="text-xs text-yellow-100 font-medium mt-0.5">
            Thí sinh trụ lại cuối cùng trên Đấu Trường Sinh Tồn!
          </p>
        </div>
      )}
    </div>
  );
};
