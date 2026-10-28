import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { PickerStudent, RandomPickerModeProps } from '../types.js';
import { soundManager } from '../sound.js';
import { createDuckDisplayNode, type DuckDisplayNode } from './duck-race/duck-graphics.js';
import {
  calculateDuckX,
  initializeDuckFlock,
  TRACK_FINISH_X,
  TRACK_START_X,
} from './duck-race/race-director.js';
import type { DuckRaceScenario } from './duck-race/types.js';

const SCENARIO_KEYS: DuckRaceScenario[] = [
  'comeback',
  'duel',
  'wire_to_wire',
  'chaos_pack',
  'triple_threat',
];
const RIVER_HEIGHT = 580; // Mở rộng chiều cao dòng sông, chiếm 4/5 tầm mắt
const RACE_DURATION_SECONDS = 7.5; // Tổng thời gian đua vàng

export const DuckRaceMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  selectedStudent,
  candidates = [],
  onTriggerSpin,
  isCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const raceContainerRef = useRef<Container | null>(null);
  const duckNodesRef = useRef<DuckDisplayNode[]>([]);
  const isRacingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const pendingStartRaceRef = useRef<{ target: PickerStudent; scenario: DuckRaceScenario } | null>(
    null
  );

  // Chọn ngẫu nhiên 1 trong 5 kịch bản kịch tính
  const [scenario, setScenario] = useState<DuckRaceScenario>(() => {
    return SCENARIO_KEYS[Math.floor(Math.random() * SCENARIO_KEYS.length)] || 'comeback';
  });

  const [countdown, setCountdown] = useState<number | null>(null);

  // Hàm tạo đàn vịt tại vạch xuất phát
  const spawnFlock = (container: Container, target: PickerStudent, sc: DuckRaceScenario) => {
    duckNodesRef.current.forEach(node => {
      try {
        container.removeChild(node.container);
        node.container.destroy({ children: true });
      } catch {
        // Bỏ qua lỗi dọn dẹp vịt đua
      }
    });
    duckNodesRef.current = [];

    if (candidates.length === 0) return;

    const entities = initializeDuckFlock(candidates, target, sc, RIVER_HEIGHT);
    duckNodesRef.current = entities.map(entity => {
      const node = createDuckDisplayNode(entity);
      container.addChild(node.container);
      node.update(entity.currentX, entity.currentY, 0, false);
      return node;
    });

    container.x = 0;
  };

  // Hàm kích hoạt cuộc đua
  const startRaceSequence = (container: Container, target: PickerStudent, sc: DuckRaceScenario) => {
    spawnFlock(container, target, sc);

    // Đếm ngược 3... 2... 1... GO!
    setCountdown(3);
    soundManager.playClick();

    window.setTimeout(() => {
      setCountdown(2);
      soundManager.playClick();
    }, 500);

    window.setTimeout(() => {
      setCountdown(1);
      soundManager.playClick();
    }, 1000);

    window.setTimeout(() => {
      setCountdown(0);
      soundManager.playWhistle(); // Tiếng còi xuất phát vang dội
      isRacingRef.current = true;
      startTimeRef.current = performance.now();
    }, 1500);

    window.setTimeout(() => {
      setCountdown(null);
    }, 2200);
  };

  // 1. Khởi tạo Pixi Application v8
  useEffect(() => {
    let isDestroyed = false;

    async function initPixi() {
      if (!canvasRef.current) return;

      const app = new Application();
      await app.init({
        canvas: canvasRef.current,
        width: 1400,
        height: RIVER_HEIGHT,
        backgroundColor: 0x0284c7, // Nước xanh sông biếc
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isDestroyed) {
        app.destroy(true);
        return;
      }

      pixiAppRef.current = app;

      // Container cuộn toàn cảnh đường đua theo Camera
      const raceContainer = new Container();
      raceContainer.sortableChildren = true;
      app.stage.addChild(raceContainer);
      raceContainerRef.current = raceContainer;

      // Vẽ dòng sông và vạch xuất phát / vạch đích
      drawRiverEnvironment(raceContainer);

      // Nếu đã có lệnh đua đang chờ khởi động (do isPicking = true từ trước khi init xong):
      if (pendingStartRaceRef.current) {
        const { target, scenario: sc } = pendingStartRaceRef.current;
        pendingStartRaceRef.current = null;
        startRaceSequence(raceContainer, target, sc);
      } else {
        // Khởi tạo đàn vịt đậu tại vạch xuất phát
        const defaultTarget = selectedStudent || candidates[0]!;
        if (defaultTarget) {
          spawnFlock(raceContainer, defaultTarget, scenario);
        }
      }
    }

    void initPixi();

    return () => {
      isDestroyed = true;
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true });
        pixiAppRef.current = null;
      }
    };
  }, []);

  // 2. Vẽ bối cảnh dòng sông (Bờ sông rộng rãi, Vạch xuất phát, Vạch đích)
  const drawRiverEnvironment = (container: Container) => {
    const bg = new Graphics();
    container.addChild(bg);

    const fullTrackWidth = TRACK_FINISH_X + 600;

    // Mặt nước sông xanh biếc mênh mông
    bg.rect(0, 32, fullTrackWidth, RIVER_HEIGHT - 64).fill({ color: 0x0284c7 });

    // Bờ cỏ xanh trên và dưới
    bg.rect(0, 0, fullTrackWidth, 32).fill({ color: 0x16a34a });
    bg.rect(0, RIVER_HEIGHT - 32, fullTrackWidth, 32).fill({ color: 0x15803d });

    // Viền mép nước
    bg.rect(0, 28, fullTrackWidth, 4).fill({ color: 0x86efac, alpha: 0.8 });
    bg.rect(0, RIVER_HEIGHT - 32, fullTrackWidth, 4).fill({ color: 0x86efac, alpha: 0.8 });

    // Vạch xuất phát (Cọc phao nổi trải đều khắp chiều rộng sông)
    for (let y = 38; y < RIVER_HEIGHT - 38; y += 24) {
      bg.roundRect(TRACK_START_X - 10, y, 12, 18, 4)
        .fill({ color: (y / 24) % 2 === 0 ? 0xef4444 : 0xffffff })
        .stroke({ width: 1.5, color: 0x000000, alpha: 0.4 });
    }

    // Biển chữ "START"
    const startText = new Text({
      text: 'START ▶',
      style: {
        fontFamily: 'system-ui',
        fontSize: 14,
        fontWeight: '900',
        fill: 0xffffff,
      },
    });
    startText.x = TRACK_START_X - 65;
    startText.y = 8;
    container.addChild(startText);

    // Vạch đích (Dải băng caro đen trắng trải dài hết lòng sông)
    for (let y = 32; y < RIVER_HEIGHT - 32; y += 18) {
      const isBlack = Math.floor(y / 18) % 2 === 0;
      bg.rect(TRACK_FINISH_X, y, 16, 18).fill({ color: isBlack ? 0x000000 : 0xffffff });
      bg.rect(TRACK_FINISH_X + 16, y, 16, 18).fill({ color: isBlack ? 0xffffff : 0x000000 });
    }

    // Biển chữ "FINISH"
    const finishText = new Text({
      text: '🏁 FINISH 🏁',
      style: {
        fontFamily: 'system-ui',
        fontSize: 15,
        fontWeight: '900',
        fill: 0xfde047,
      },
    });
    finishText.x = TRACK_FINISH_X - 25;
    finishText.y = 8;
    container.addChild(finishText);
  };

  // 3. Khởi tạo / cập nhật đàn vịt khi danh sách học sinh thay đổi và chưa đua
  useEffect(() => {
    if (!raceContainerRef.current || candidates.length === 0 || isRacingRef.current) return;
    const target = selectedStudent || candidates[0]!;
    spawnFlock(raceContainerRef.current, target, scenario);
  }, [candidates.length, scenario]);

  // 4. Kích hoạt cuộc đua khi isPicking = true
  useEffect(() => {
    if (!isPicking || !selectedStudent || candidates.length === 0) return;

    // Chọn ngẫu nhiên kịch bản mới cho mỗi lần đua
    const newScenario =
      SCENARIO_KEYS[Math.floor(Math.random() * SCENARIO_KEYS.length)] || 'comeback';
    setScenario(newScenario);

    if (raceContainerRef.current) {
      startRaceSequence(raceContainerRef.current, selectedStudent, newScenario);
    } else {
      // Pixi chưa init xong -> lưu vào pending để init xong tự động đua ngay!
      pendingStartRaceRef.current = { target: selectedStudent, scenario: newScenario };
    }
  }, [isPicking, selectedStudent]);

  // 5. Game Loop điều khiển vịt bơi và Camera tracking
  useEffect(() => {
    const app = pixiAppRef.current;
    if (!app) return;

    let soundTick = 0;

    const tickerCallback = () => {
      if (!isRacingRef.current || !raceContainerRef.current) return;

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / RACE_DURATION_SECONDS, 1.0);

      // Phát âm thanh tiếng vịt kêu và bọt nước ngẫu nhiên
      soundTick++;
      if (soundTick % 70 === 0 && progress < 0.9) {
        if (Math.random() > 0.4) {
          soundManager.playQuack();
        } else {
          soundManager.playWaterSplash();
        }
      }

      let leadX = 0;

      // Cập nhật từng chú vịt
      duckNodesRef.current.forEach(node => {
        const { x, isSpeeding } = calculateDuckX(node.entity, progress, scenario);
        const bob = Math.sin(elapsed * 6 + node.entity.bobPhase) * 4.5;
        const wobble = Math.sin(elapsed * 8 + node.entity.bobPhase) * 0.08;

        node.entity.currentX = x;
        node.entity.currentY = node.entity.laneY + bob;

        node.update(x, node.entity.currentY, wobble, isSpeeding);

        if (x > leadX) {
          leadX = x;
        }
      });

      // CAMERA TRACKING: Camera trượt mượt mà theo chú vịt dẫn đầu
      const targetCamX = -Math.max(leadX - 420, 0);
      // Giữ camera trong giới hạn đường đua
      const maxCamX = -(TRACK_FINISH_X - 520);
      raceContainerRef.current.x = Math.max(targetCamX, maxCamX);

      // Khi chạm đích 100% (cắt băng khánh thành vạch đích)
      if (progress >= 1.0) {
        isRacingRef.current = false;
        duckNodesRef.current.find(n => n.entity.isTarget)?.setTargetGlow(true);
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      try {
        if (app && app.ticker) {
          app.ticker.remove(tickerCallback);
        }
      } catch {
        // Ticker already destroyed
      }
    };
  }, [scenario]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-1 select-none">
      {/* KHUNG CHÍNH PIXI.JS CANVAS ĐƯỜNG ĐUA - CHIẾM 4/5 MÀN HÌNH HOÀNH TRÁNG */}
      <div className="relative w-full max-w-[96vw] xl:max-w-[1550px] rounded-3xl overflow-hidden border-4 border-amber-400 shadow-[0_20px_60px_rgba(0,0,0,0.85)] bg-sky-800 my-1">
        <canvas
          ref={canvasRef}
          className="w-full h-[520px] sm:h-[580px] xl:h-[620px] block cursor-pointer"
        />

        {/* ĐẾM NGƯỢC XUẤT PHÁT 3... 2... 1... GO! */}
        {countdown !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
            <div className="text-center animate-bounce">
              <span className="font-black text-6xl sm:text-8xl text-amber-300 drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] tracking-widest">
                {countdown === 0 ? '🏁 GO! 🏁' : countdown}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* NÚT XUẤT PHÁT CUỘC ĐUA NẾU CHƯA BẮT ĐẦU */}
      {!isPicking && !isCompleted && onTriggerSpin && (
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            onClick={() => onTriggerSpin('normal')}
            className="px-9 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-black text-lg rounded-2xl shadow-xl border-2 border-amber-300 active:scale-95 transition cursor-pointer flex items-center gap-3"
          >
            <span className="text-2xl">🦆</span>
            <span>XUẤT PHÁT ĐUA VỊT</span>
          </button>
        </div>
      )}

      {/* BANNER VINH DANH HỌC SINH CÁN ĐÍCH VÔ ĐỊCH */}
      {isCompleted && selectedStudent && (
        <div className="mt-5 z-20 animate-bounce">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white px-9 py-3.5 rounded-2xl shadow-2xl flex items-center gap-5 ring-4 ring-amber-400/70">
            {/* Cúp vàng / Vịt vô địch */}
            <div className="w-16 h-16 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-3xl font-black shadow-inner border-2 border-amber-300">
              🏆
            </div>
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/90 px-3 py-0.5 rounded-full inline-block mb-1 shadow-sm">
                🦆 QUÁN QUÂN ĐƯỜNG ĐUA! 🦆
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">
                {selectedStudent.name}
              </div>
              {selectedStudent.code && (
                <div className="text-xs font-mono font-bold text-amber-950 mt-0.5">
                  Mã số: {selectedStudent.code}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
