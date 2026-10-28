/**
 * Hệ thống âm thanh tổng hợp bằng Web Audio API (100% offline, không cần file bên ngoài)
 */
class SoundSynthesizer {
    ctx = null;
    getContext() {
        if (typeof window === 'undefined')
            return null;
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext ||
                    window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                void this.ctx.resume();
            }
            return this.ctx;
        }
        catch {
            return null;
        }
    }
    /**
     * Âm thanh lật bài (Whoosh/Shimmer)
     */
    playCardFlip() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh chọn trúng / chúc mừng (Fanfare Chime)
     */
    playWinner() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            // Hợp âm C-E-G-C (Đô - Mi - Sol - Đố)
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const noteStart = now + idx * 0.08;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteStart);
                gain.gain.setValueAtTime(0, noteStart);
                gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteStart);
                osc.stop(noteStart + 0.6);
            });
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh click nhẹ
     */
    playClick() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh chọn hộp quà (ting cao vui tươi)
     */
    playBoxSelect() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh mở hộp phụ trượt (boing nhẹ)
     */
    playBoxOpenLoser() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh mở hộp quà trúng đích (Hào quang bùng nổ)
     */
    playBoxOpenWinner() {
        this.playWinner();
        this.playFireworkBurst();
    }
    /**
     * Âm thanh quay bánh xe Slot machine (tiếng lách cách tick-tick)
     */
    playSlotSpin() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(750 + Math.random() * 200, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh dừng 1 trục bánh số Slot machine (tiếng chốt kim loại đanh chắc)
     */
    playSlotStop() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh pháo hoa bùng nổ (tiếng vút lên + tiếng nổ trầm + lách cách tàn pháo)
     */
    playFireworkBurst() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            // 1. Tiếng nổ trầm (Boom)
            const boomOsc = ctx.createOscillator();
            const boomGain = ctx.createGain();
            boomOsc.type = 'sine';
            boomOsc.frequency.setValueAtTime(180, now);
            boomOsc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
            boomGain.gain.setValueAtTime(0.35, now);
            boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            boomOsc.connect(boomGain);
            boomGain.connect(ctx.destination);
            boomOsc.start(now);
            boomOsc.stop(now + 0.45);
            // 2. Tiếng nổ lách cách tàn sao (Sparkle crackles)
            for (let i = 0; i < 3; i++) {
                const crackleStart = now + 0.15 + i * 0.08;
                const crackleOsc = ctx.createOscillator();
                const crackleGain = ctx.createGain();
                crackleOsc.type = 'triangle';
                crackleOsc.frequency.setValueAtTime(1200 + Math.random() * 800, crackleStart);
                crackleGain.gain.setValueAtTime(0.12, crackleStart);
                crackleGain.gain.exponentialRampToValueAtTime(0.001, crackleStart + 0.08);
                crackleOsc.connect(crackleGain);
                crackleGain.connect(ctx.destination);
                crackleOsc.start(crackleStart);
                crackleOsc.stop(crackleStart + 0.08);
            }
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh xào bài ma thuật (tiếng lạo xạo xốc bài)
     */
    playCardShuffle() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            for (let i = 0; i < 8; i++) {
                const time = now + i * 0.04;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(350 + Math.random() * 300, time);
                osc.frequency.exponentialRampToValueAtTime(150, time + 0.04);
                gain.gain.setValueAtTime(0.12, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(time);
                osc.stop(time + 0.04);
            }
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh bóng bay nổ (tiếng BÙM! / POP sắc nét)
     */
    playBalloonPop() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh con lăn trôi qua một mục (tiếng tick đanh nhẹ)
     */
    playReelTick() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 150, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.03);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh còi trọng tài xuất phát cuộc đua (tiếng còi tuýt cao, giòn giã)
     */
    playWhistle() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(2350, now);
            osc2.frequency.setValueAtTime(2480, now);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
            gain.gain.setValueAtTime(0.25, now + 0.28);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.45);
            osc2.stop(now + 0.45);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh tiếng vịt kêu quác quác (quack) vui nhộn
     */
    playQuack() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.18);
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100, now);
            filter.Q.setValueAtTime(4.0, now);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh bọt nước rẽ sóng bì bõm (water splash)
     */
    playWaterSplash() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const bufferSize = ctx.sampleRate * 0.12;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, now);
            filter.frequency.exponentialRampToValueAtTime(400, now + 0.12);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            whiteNoise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            whiteNoise.start(now);
            whiteNoise.stop(now + 0.12);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh súng săn nổ vang rền (Shotgun Blast)
     */
    playGunshot() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            // 1. Tiếng va đập kích nổ (Initial punch: white noise burst)
            const bufferSize = Math.floor(ctx.sampleRate * 0.35);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            // 2. Tiếng nổ trầm dội lại (Low-end sub boom)
            const subOsc = ctx.createOscillator();
            const subGain = ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(160, now);
            subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            subGain.gain.setValueAtTime(0.35, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            subOsc.connect(subGain);
            subGain.connect(ctx.destination);
            subOsc.start(now);
            subOsc.stop(now + 0.3);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh bốc hơi / loại bỏ một ô học sinh trong Đấu Trường Sinh Tồn
     */
    playEliminationTick() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh nhịp tim hồi hộp kịch tính (Lub-dub suspense heartbeat)
     */
    playHeartbeat() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            // Nhịp 1 (Lub)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(65, now);
            osc1.frequency.exponentialRampToValueAtTime(38, now + 0.12);
            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);
            // Nhịp 2 (Dub - sau 0.18s)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(55, now + 0.18);
            osc2.frequency.exponentialRampToValueAtTime(32, now + 0.32);
            gain2.gain.setValueAtTime(0.4, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.18);
            osc2.stop(now + 0.32);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh va đập kịch tính khi loại một ô trong Top 5 / Top 3 (Dramatic hit)
     */
    playDramaticHit() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    lastBounceTime = 0;
    /**
     * Âm thanh va đập đinh cản Pachinko / Pegboard (leng keng nhẹ vui tai)
     */
    playMarblePegBounce() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            if (now - this.lastBounceTime < 0.035)
                return; // Giới hạn tần suất tránh quá tải
            this.lastBounceTime = now;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const freqs = [780, 880, 988, 1046, 1175, 1318];
            const freq = freqs[Math.floor(Math.random() * freqs.length)] || 880;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.05);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh nấm nảy lò xo Pinball Bumper (boing arcade)
     */
    playPinballBumper() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh mở cổng thả bi (còi hiệu xuất phát)
     */
    playMarbleDropStart() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(660, now + 0.08);
            osc.frequency.setValueAtTime(880, now + 0.16);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
    /**
     * Âm thanh vạch tăng tốc Turbo Boost (Whoosh tốc độ cao)
     */
    playTurboBoost() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(980, now + 0.12);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        }
        catch {
            // Bỏ qua lỗi audio
        }
    }
}
export const soundManager = new SoundSynthesizer();
//# sourceMappingURL=sound.js.map