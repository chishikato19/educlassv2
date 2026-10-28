/**
 * Hệ thống âm thanh tổng hợp bằng Web Audio API (100% offline, không cần file bên ngoài)
 */
declare class SoundSynthesizer {
    private ctx;
    private getContext;
    /**
     * Âm thanh lật bài (Whoosh/Shimmer)
     */
    playCardFlip(): void;
    /**
     * Âm thanh chọn trúng / chúc mừng (Fanfare Chime)
     */
    playWinner(): void;
    /**
     * Âm thanh click nhẹ
     */
    playClick(): void;
    /**
     * Âm thanh chọn hộp quà (ting cao vui tươi)
     */
    playBoxSelect(): void;
    /**
     * Âm thanh mở hộp phụ trượt (boing nhẹ)
     */
    playBoxOpenLoser(): void;
    /**
     * Âm thanh mở hộp quà trúng đích (Hào quang bùng nổ)
     */
    playBoxOpenWinner(): void;
    /**
     * Âm thanh quay bánh xe Slot machine (tiếng lách cách tick-tick)
     */
    playSlotSpin(): void;
    /**
     * Âm thanh dừng 1 trục bánh số Slot machine (tiếng chốt kim loại đanh chắc)
     */
    playSlotStop(): void;
    /**
     * Âm thanh pháo hoa bùng nổ (tiếng vút lên + tiếng nổ trầm + lách cách tàn pháo)
     */
    playFireworkBurst(): void;
    /**
     * Âm thanh xào bài ma thuật (tiếng lạo xạo xốc bài)
     */
    playCardShuffle(): void;
    /**
     * Âm thanh bóng bay nổ (tiếng BÙM! / POP sắc nét)
     */
    playBalloonPop(): void;
    /**
     * Âm thanh con lăn trôi qua một mục (tiếng tick đanh nhẹ)
     */
    playReelTick(): void;
    /**
     * Âm thanh còi trọng tài xuất phát cuộc đua (tiếng còi tuýt cao, giòn giã)
     */
    playWhistle(): void;
    /**
     * Âm thanh tiếng vịt kêu quác quác (quack) vui nhộn
     */
    playQuack(): void;
    /**
     * Âm thanh bọt nước rẽ sóng bì bõm (water splash)
     */
    playWaterSplash(): void;
    /**
     * Âm thanh súng săn nổ vang rền (Shotgun Blast)
     */
    playGunshot(): void;
    /**
     * Âm thanh bốc hơi / loại bỏ một ô học sinh trong Đấu Trường Sinh Tồn
     */
    playEliminationTick(): void;
    /**
     * Âm thanh nhịp tim hồi hộp kịch tính (Lub-dub suspense heartbeat)
     */
    playHeartbeat(): void;
    /**
     * Âm thanh va đập kịch tính khi loại một ô trong Top 5 / Top 3 (Dramatic hit)
     */
    playDramaticHit(): void;
    private lastBounceTime;
    /**
     * Âm thanh va đập đinh cản Pachinko / Pegboard (leng keng nhẹ vui tai)
     */
    playMarblePegBounce(): void;
    /**
     * Âm thanh nấm nảy lò xo Pinball Bumper (boing arcade)
     */
    playPinballBumper(): void;
    /**
     * Âm thanh mở cổng thả bi (còi hiệu xuất phát)
     */
    playMarbleDropStart(): void;
    /**
     * Âm thanh vạch tăng tốc Turbo Boost (Whoosh tốc độ cao)
     */
    playTurboBoost(): void;
}
export declare const soundManager: SoundSynthesizer;
export {};
//# sourceMappingURL=sound.d.ts.map