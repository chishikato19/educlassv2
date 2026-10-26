import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { MagicCardItem, RandomPickerModeProps } from '../types.js';

export const MagicDeckMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  magicCards = [],
  onSelectMagicCard,
  isWaitingForMagicCard = false,
  isShufflingMagicDeck = false,
  onTriggerSpin,
  isCompleted,
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const leftHalfRef = useRef<HTMLDivElement>(null);
  const rightHalfRef = useRef<HTMLDivElement>(null);

  // Kiểm tra xem đã có lá bài nào lật mở chưa
  const hasRevealedCard = magicCards.some((c) => c.isRevealed);

  // Tạo danh sách 9 lá bài mặc định
  const displayCards: MagicCardItem[] =
    magicCards.length === 9
      ? magicCards
      : Array.from({ length: 9 }, (_, i) => ({
          id: i + 1,
          student: null,
          isRevealed: false,
          isTarget: false,
          positionIndex: i,
        }));

  // Điều khiển animation xào bài ở tụ bài trung tâm rồi chia ra 9 lá
  useEffect(() => {
    if (isShufflingMagicDeck) {
      // 1. Animation xào bài tại tụ bài giữa (Riffle Shuffle)
      if (leftHalfRef.current && rightHalfRef.current) {
        const tl = gsap.timeline();

        // Tách tụ bài làm 2 nửa
        tl.to(leftHalfRef.current, {
          x: -90,
          rotation: -18,
          scale: 1.05,
          duration: 0.45,
          ease: 'power2.out',
        }).to(
          rightHalfRef.current,
          {
            x: 90,
            rotation: 18,
            scale: 1.05,
            duration: 0.45,
            ease: 'power2.out',
          },
          '<'
        );

        // Chẻ bài đan xen vào nhau nhịp 1
        tl.to(leftHalfRef.current, {
          x: 40,
          rotation: 6,
          duration: 0.35,
          ease: 'sine.inOut',
        }).to(
          rightHalfRef.current,
          {
            x: -40,
            rotation: -6,
            duration: 0.35,
            ease: 'sine.inOut',
          },
          '<'
        );

        // Tách ra nhịp 2
        tl.to(leftHalfRef.current, {
          x: -70,
          rotation: -12,
          duration: 0.3,
          ease: 'power2.inOut',
        }).to(
          rightHalfRef.current,
          {
            x: 70,
            rotation: 12,
            duration: 0.3,
            ease: 'power2.inOut',
          },
          '<'
        );

        // Gom khít tụ bài về tâm
        tl.to([leftHalfRef.current, rightHalfRef.current], {
          x: 0,
          rotation: 0,
          scale: 1,
          duration: 0.35,
          ease: 'power3.out',
        });
      }
    }
  }, [isShufflingMagicDeck]);

  // Khi chuyển từ xào bài sang chờ chọn lá bài (dealing animation ra 9 lá)
  useEffect(() => {
    if (isWaitingForMagicCard && gridContainerRef.current) {
      const cardEls = gridContainerRef.current.querySelectorAll('.magic-card-item');
      if (cardEls.length > 0) {
        // Từng lá bài từ trung tâm phóng bay ra 9 vị trí ô lưới 3x3
        gsap.fromTo(
          cardEls,
          {
            scale: 0.15,
            opacity: 0,
            rotation: () => (Math.random() - 0.5) * 60,
          },
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.55,
            stagger: 0.08,
            ease: 'back.out(1.5)',
          }
        );
      }
    }
  }, [isWaitingForMagicCard]);

  // GIAI ĐOẠN 1 & 2: Chưa xào hoặc đang xào bài -> Hiển thị 1 BỘ BÀI DUY NHẤT Ở GIỮA
  const showSingleDeck = !isWaitingForMagicCard && !hasRevealedCard && !isCompleted;

  if (showSingleDeck) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6 select-none min-h-[420px]">
        {/* KHU VỰC TỤ BÀI MA THUẬT DUY NHẤT Ở GIỮA */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Vòng tròn ma pháp phát sáng dưới chân cỗ bài */}
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border-2 border-dashed border-purple-400/50 animate-spin-slow pointer-events-none bg-radial from-purple-900/30 via-indigo-950/20 to-transparent" />

          {/* 1 BỘ BÀI MA THUẬT XẾP CHỒNG 3D */}
          <div
            ref={deckRef}
            className="relative w-36 h-52 sm:w-44 sm:h-64 flex items-center justify-center"
          >
            {/* Lớp bóng độ dày các lá bài phía dưới */}
            <div className="absolute inset-0 rounded-2xl bg-slate-950 border-2 border-purple-900/60 shadow-2xl translate-x-3 translate-y-3 rotate-6 opacity-60" />
            <div className="absolute inset-0 rounded-2xl bg-indigo-950 border-2 border-purple-800/70 shadow-xl translate-x-1.5 translate-y-1.5 rotate-3 opacity-80" />

            {/* NỬA BÀI TRÁI KHI XÀO */}
            <div
              ref={leftHalfRef}
              className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-950 via-slate-900 to-indigo-950 border-2 border-purple-400/80 shadow-[0_15px_35px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-3"
            >
              <div className="w-full flex justify-between text-[10px] text-purple-300">
                <span>✧</span>
                <span>EduClass</span>
                <span>✧</span>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-indigo-950/90 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                <span className="text-3xl sm:text-4xl">🔮</span>
              </div>
              <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
                MA THUẬT
              </div>
            </div>

            {/* NỬA BÀI PHẢI KHI XÀO */}
            <div
              ref={rightHalfRef}
              className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-950 via-slate-900 to-indigo-950 border-2 border-amber-400/80 shadow-[0_20px_45px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between p-3"
            >
              <div className="w-full flex justify-between text-[10px] text-purple-300">
                <span>✦</span>
                <span className="font-mono">52 Cards</span>
                <span>✦</span>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-indigo-950/90 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                <span className="text-3xl sm:text-4xl">🔮</span>
              </div>
              <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
                BỘ BÀI MA THUẬT
              </div>
            </div>
          </div>

          {/* Dòng chữ trạng thái hoặc nút bấm xào bài */}
          <div className="mt-8 flex flex-col items-center text-center z-10">
            {isShufflingMagicDeck ? (
              <div className="flex items-center gap-2 bg-purple-950/90 border-2 border-purple-400/60 px-5 py-2 rounded-full shadow-lg animate-pulse">
                <span className="text-xl">✨</span>
                <span className="text-sm font-black text-amber-300">
                  Đang xào bài ma thuật... Chuẩn bị chia 9 lá!
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-indigo-300 font-medium">
                  Cỗ bài Tarot ma thuật đang tụ hợp ở giữa bàn
                </span>
                {onTriggerSpin && (
                  <button
                    type="button"
                    onClick={() => onTriggerSpin('normal')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl border-2 border-amber-300 active:scale-95 transition cursor-pointer flex items-center gap-2"
                  >
                    <span>🔮</span>
                    <span>XÀO BÀI & CHIA 9 LÁ MA THUẬT</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GIAI ĐOẠN 3 & 4: Đã chia bài -> Hiển thị LƯỚI 3x3 VÀ CHỜ CHỌN / LẬT BÀI
  return (
    <div
      ref={gridContainerRef}
      className="w-full flex flex-col items-center justify-center py-4 select-none"
    >
      {/* LƯỚI 3x3 BỘ BÀI MA THUẬT (9 LÁ BÀI ĐÃ ĐƯỢC CHIA TỪ TỤ BÀI) */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl px-2 sm:px-4 justify-items-center">
        {displayCards.map((card, idx) => {
          const isFlipped = card.isRevealed;
          const isTarget = card.isTarget;
          const canClick = !isPicking && (isWaitingForMagicCard || !isFlipped);

          return (
            <div
              key={card.id}
              onClick={() => {
                if (canClick && onSelectMagicCard) {
                  onSelectMagicCard(idx);
                }
              }}
              className={`magic-card-item relative w-24 h-36 sm:w-32 sm:h-48 cursor-pointer transition-transform duration-300 ${
                canClick ? 'hover:-translate-y-2 hover:scale-105 active:scale-95' : ''
              } ${isTarget ? 'z-30 scale-110 sm:scale-115' : ''}`}
              style={{ perspective: '1000px' }}
              role="button"
              tabIndex={0}
              aria-label={`Lá bài ma thuật số ${idx + 1}`}
            >
              {/* Thẻ bài 3D xoay lật */}
              <div
                className="w-full h-full relative rounded-2xl shadow-2xl transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* MẶT SAU THẺ BÀI MA THUẬT (Úp mặt) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-2.5 sm:p-3 border-2 border-purple-400/50 bg-gradient-to-b from-purple-950 via-slate-900 to-indigo-950 text-amber-300 shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <div className="w-full flex justify-between items-center text-[10px] text-purple-300 font-mono">
                    <span>✧</span>
                    <span>#{idx + 1}</span>
                    <span>✧</span>
                  </div>

                  <div className="relative flex flex-col items-center justify-center my-auto">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-amber-400/60 flex items-center justify-center bg-indigo-950/80 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      <span className="text-xl sm:text-2xl filter drop-shadow">🔮</span>
                    </div>
                    <span className="mt-1 text-[9px] uppercase tracking-widest font-black text-purple-200">
                      Ma Pháp
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-center text-[10px] text-purple-300 font-mono">
                    <span>EduClass</span>
                    <span>✧</span>
                  </div>
                </div>

                {/* MẶT TRƯỚC THẺ BÀI MA THUẬT (Lật mở - Tên học sinh) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-2.5 sm:p-3 shadow-2xl ${
                    isTarget
                      ? 'border-4 border-amber-300 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 text-amber-950 shadow-amber-400/80 ring-4 ring-amber-300/60'
                      : 'border-2 border-slate-200 bg-white text-slate-700'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="w-full flex justify-between items-center text-[9px] font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded-full ${
                        isTarget
                          ? 'bg-amber-950 text-amber-200 font-black'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isTarget ? '🎯 CHỌN' : 'Ứng viên'}
                    </span>
                    <span className="font-mono">#{idx + 1}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto text-center px-1">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-black mb-1 shadow-md ${
                        isTarget
                          ? 'bg-amber-600 text-white ring-2 ring-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {card.student ? card.student.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div
                      className={`font-black text-sm sm:text-base leading-tight drop-shadow truncate max-w-[100px] sm:max-w-[120px] ${
                        isTarget ? 'text-slate-950' : 'text-slate-800'
                      }`}
                    >
                      {card.student ? card.student.name : 'Đang chọn...'}
                    </div>
                    {card.student?.code && (
                      <span className="text-[10px] font-mono font-bold text-amber-900 mt-0.5">
                        {card.student.code}
                      </span>
                    )}
                  </div>

                  <div className="w-full text-center text-[8px] font-mono opacity-60">
                    Lá bài số #{idx + 1}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BANNER VINH DANH HỌC SINH SAU KHI LẬT BÀI */}
      {isCompleted && selectedStudent && (
        <div className="mt-6 z-20 animate-bounce">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white px-8 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 ring-4 ring-amber-400/60">
            <div className="w-14 h-14 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-2xl font-black shadow-inner">
              {selectedStudent.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-full inline-block mb-1">
                🔮 LÁ BÀI ĐÃ CHỌN! 🔮
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {selectedStudent.name}
              </div>
              {selectedStudent.code && (
                <div className="text-xs font-mono font-bold text-amber-950">
                  Mã: {selectedStudent.code}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
