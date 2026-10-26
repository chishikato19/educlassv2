import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { RandomPickerModeProps } from '../types.js';

// Dải số lặp lại 3 chu kỳ (30 số) để tạo hiệu ứng cuộn dài mượt mà
const REEL_NUMBERS = [
  ...Array.from({ length: 10 }, (_, i) => i),
  ...Array.from({ length: 10 }, (_, i) => i),
  ...Array.from({ length: 10 }, (_, i) => i),
];

const ITEM_HEIGHT = 150; // Chiều cao mỗi ô số (px) - Phóng to nổi bật trên màn chiếu

export const SlotMachineMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  slotState,
  onTriggerSpin,
  isCompleted,
}) => {
  const [leverPulled, setLeverPulled] = useState(false);
  const tensReelRef = useRef<HTMLDivElement>(null);
  const unitsReelRef = useRef<HTMLDivElement>(null);
  const isSpinningRef = useRef(false);

  // Kích hoạt GSAP cuộn chậm dần đều 1 lần duy nhất, loại bỏ hiện tượng chạy lại lần 2
  useEffect(() => {
    if (!slotState) return;

    const targetTens = slotState.tens;
    const targetUnits = slotState.units;

    if (isPicking && (slotState.isSpinningTens || slotState.isSpinningUnits)) {
      if (isSpinningRef.current) return; // Đang chạy animation thì không re-trigger
      isSpinningRef.current = true;

      // 1. CUỘN HÀNG CHỤC: Chạy nhanh rồi giảm tốc đều, dừng chính xác tại targetTens sau 2.5 giây
      if (tensReelRef.current) {
        const finalIndexTens = 10 + targetTens; // Vòng 2
        const finalYTens = -finalIndexTens * ITEM_HEIGHT;

        gsap.killTweensOf(tensReelRef.current);
        gsap.fromTo(
          tensReelRef.current,
          { y: 0 },
          {
            y: finalYTens,
            duration: 2.5,
            ease: 'power3.out', // Chậm dần đều êm ái
          }
        );
      }

      // 2. CUỘN HÀNG ĐƠN VỊ: Chậm dần đều kéo dài suốt 3.8 giây, dừng chính xác giữa tâm targetUnits
      if (unitsReelRef.current) {
        const finalIndexUnits = 20 + targetUnits; // Vòng 3
        const finalYUnits = -finalIndexUnits * ITEM_HEIGHT;

        gsap.killTweensOf(unitsReelRef.current);
        gsap.fromTo(
          unitsReelRef.current,
          { y: 0 },
          {
            y: finalYUnits,
            duration: 3.8,
            ease: 'power4.out', // Chậm dần đều mượt mà tới tận vạch cuối, không giật cục
            onComplete: () => {
              isSpinningRef.current = false;
            },
          }
        );
      }
    } else if (!isPicking) {
      isSpinningRef.current = false;
      // Khi không quay, đặt đúng vị trí số đã chốt căn giữa hoàn hảo
      const finalIndexTens = 10 + targetTens;
      const finalIndexUnits = 20 + targetUnits;

      if (tensReelRef.current) {
        gsap.killTweensOf(tensReelRef.current);
        gsap.set(tensReelRef.current, { y: -finalIndexTens * ITEM_HEIGHT });
      }
      if (unitsReelRef.current) {
        gsap.killTweensOf(unitsReelRef.current);
        gsap.set(unitsReelRef.current, { y: -finalIndexUnits * ITEM_HEIGHT });
      }
    }

    return () => {
      if (tensReelRef.current) gsap.killTweensOf(tensReelRef.current);
      if (unitsReelRef.current) gsap.killTweensOf(unitsReelRef.current);
    };
  }, [isPicking, slotState?.tens, slotState?.units, slotState?.isSpinningTens, slotState?.isSpinningUnits]);

  const handlePullLever = () => {
    if (isPicking) return;
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 400);
    if (onTriggerSpin) {
      onTriggerSpin('normal');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 select-none">
      {/* KHUNG MÁY KÉO SỐ PHÓNG TO HOÀNH TRÁNG */}
      <div className="relative flex items-center justify-center">
        {/* THÂN MÁY LỚN */}
        <div className="relative bg-gradient-to-b from-amber-600 via-yellow-700 to-amber-950 p-6 sm:p-9 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-4 border-amber-300 w-96 sm:w-[500px] md:w-[560px] flex flex-col items-center ring-4 ring-amber-400/30">
          {/* MÁI VÒM MÁY VỚI ĐÈN LED */}
          <div className="w-full flex justify-between items-center px-6 py-2 mb-5 bg-slate-950/90 rounded-full border border-amber-400/70 shadow-inner">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-sm uppercase font-black tracking-widest text-amber-300 drop-shadow">
              ★ LUCKY WHEEL ★
            </span>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* 2 CỬA SỔ QUAY SỐ LỚN (HÀNG CHỤC & HÀNG ĐƠN VỊ - ĐÃ BỎ ĐƯỜNG ĐỎ Ở GIỮA) */}
          <div className="flex items-center gap-6 sm:gap-8 bg-slate-950 p-5 sm:p-7 rounded-2xl border-4 border-amber-400/90 shadow-[inset_0_10px_30px_rgba(0,0,0,0.9)]">
            {/* Cột 1: HÀNG CHỤC */}
            <div className="flex flex-col items-center">
              <span className="text-xs sm:text-sm uppercase font-black tracking-wider text-amber-300 mb-2">
                HÀNG CHỤC
              </span>
              <div
                className="relative w-32 sm:w-44 md:w-48 rounded-2xl border-4 border-slate-400 bg-gradient-to-b from-slate-200 via-white to-slate-200 overflow-hidden shadow-2xl"
                style={{ height: `${ITEM_HEIGHT}px` }}
              >
                {/* Vệt bóng đổ gương 3D kính trên và dưới (KHÔNG CÓ ĐƯỜNG ĐỎ Ở GIỮA) */}
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

                {/* Dải cuộn số bằng GSAP */}
                <div ref={tensReelRef} className="flex flex-col will-change-transform">
                  {REEL_NUMBERS.map((num, idx) => (
                    <div
                      key={`tens-${idx}`}
                      className="flex items-center justify-center font-black font-mono text-7xl sm:text-8xl md:text-9xl text-slate-900 leading-none select-none"
                      style={{ height: `${ITEM_HEIGHT}px` }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dấu gạch nối phong cách slot */}
            <div className="text-4xl sm:text-5xl font-black text-amber-400 opacity-70 self-center mt-6">
              :
            </div>

            {/* Cột 2: HÀNG ĐƠN VỊ (CĂN GIỮA CHUẨN XÁC, CHẬM DẦN ĐỀU, BỎ ĐƯỜNG ĐỎ) */}
            <div className="flex flex-col items-center">
              <span className="text-xs sm:text-sm uppercase font-black tracking-wider text-amber-300 mb-2">
                HÀNG ĐƠN VỊ
              </span>
              <div
                className="relative w-32 sm:w-44 md:w-48 rounded-2xl border-4 border-slate-400 bg-gradient-to-b from-slate-200 via-white to-slate-200 overflow-hidden shadow-2xl"
                style={{ height: `${ITEM_HEIGHT}px` }}
              >
                {/* Vệt bóng đổ gương 3D kính trên và dưới (KHÔNG CÓ ĐƯỜNG ĐỎ Ở GIỮA) */}
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

                {/* Dải cuộn số bằng GSAP */}
                <div ref={unitsReelRef} className="flex flex-col will-change-transform">
                  {REEL_NUMBERS.map((num, idx) => (
                    <div
                      key={`units-${idx}`}
                      className="flex items-center justify-center font-black font-mono text-7xl sm:text-8xl md:text-9xl text-slate-900 leading-none select-none"
                      style={{ height: `${ITEM_HEIGHT}px` }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* DẢI ĐÈN LED CHÂN MÁY */}
          <div className="flex gap-4 mt-5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full ${
                  isPicking
                    ? i % 2 === 0
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-400 animate-ping'
                    : 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CẦN GẠT TƯƠNG TÁC BÊN PHẢI MÁY */}
        <div className="ml-3 sm:ml-5 flex flex-col items-center">
          <div className="w-4 sm:w-5 h-24 sm:h-32 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-full shadow-lg relative flex items-center justify-center">
            {/* Núm cần gạt tròn màu đỏ giật xuống khi quay */}
            <button
              type="button"
              onClick={handlePullLever}
              disabled={isPicking}
              title="Giật cần gạt để quay số!"
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 border-4 border-white shadow-2xl flex items-center justify-center transition-all cursor-pointer ${
                leverPulled
                  ? 'translate-y-12 scale-95 shadow-inner'
                  : 'hover:scale-110 active:translate-y-8'
              } disabled:opacity-50`}
            >
              <span className="text-amber-200 text-xl font-black drop-shadow">⚡</span>
            </button>
          </div>
        </div>
      </div>

      {/* HIỂN THỊ HỌC SINH TƯƠNG ỨNG VỚI SỐ KHI ĐÃ CHỐT */}
      {isCompleted && selectedStudent && (
        <div className="mt-6 z-10 animate-bounce">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white px-9 py-3.5 rounded-2xl shadow-2xl flex items-center gap-5 ring-4 ring-amber-400/60">
            <div className="w-16 h-16 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-3xl font-black shadow-inner">
              {slotState ? slotState.tens * 10 + slotState.units : '#'}
            </div>
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/90 px-3 py-0.5 rounded-full inline-block mb-1">
                🎉 SỐ TRÚNG THƯỞNG! 🎉
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {selectedStudent.name}
              </div>
              {selectedStudent.code && (
                <div className="text-sm font-mono font-bold text-amber-950">
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
