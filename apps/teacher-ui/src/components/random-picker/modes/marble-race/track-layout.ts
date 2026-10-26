import type {
  BumperObstacle,
  MarbleMapDefinition,
  MarbleMapId,
  MarbleRaceTrack,
  PegObstacle,
  SeeSawObstacle,
  SpinnerObstacle,
  TurboPadObstacle,
  VortexObstacle,
  WallSegment,
} from './types.js';

export const TRACK_WIDTH = 900;
export const TRACK_HEIGHT = 5000;
export const START_GATE_Y = 220;
export const FINISH_LINE_Y = 4780;
export const FINISH_NECK_X_LEFT = 390;
export const FINISH_NECK_X_RIGHT = 510;

/**
 * BẢN ĐỒ 1: VƯƠNG QUỐC PINBALL (NEON ARCADE)
 * Đặc trưng: Rừng đinh Pachinko, Phễu lốc xoáy đôi, Nấm nảy & Cánh quạt, Cầu bập bênh liên hoàn, Slalom, Máng trượt zíc-zắc
 */
export function buildNeonPinballTrack(): MarbleRaceTrack {
  const pegs: PegObstacle[] = [];
  const bumpers: BumperObstacle[] = [];
  const spinners: SpinnerObstacle[] = [];
  const vortices: VortexObstacle[] = [];
  const seeSaws: SeeSawObstacle[] = [];
  const walls: WallSegment[] = [];
  const turboPads: TurboPadObstacle[] = [];

  // ==================== TƯỜNG BIÊN NGOÀI TOÀN TUYẾN ====================
  walls.push({ x1: 60, y1: 50, x2: 60, y2: 4420, thickness: 14, color: '#4338ca' });
  walls.push({ x1: 840, y1: 50, x2: 840, y2: 4420, thickness: 14, color: '#4338ca' });

  // Tường phễu dẫn hướng ở Chặng 7
  walls.push({ x1: 60, y1: 4420, x2: FINISH_NECK_X_LEFT, y2: 4700, thickness: 14, color: '#4f46e5' });
  walls.push({ x1: 840, y1: 4420, x2: FINISH_NECK_X_RIGHT, y2: 4700, thickness: 14, color: '#4f46e5' });

  // Ống cổ chai thẳng xuống vạch đích
  walls.push({ x1: FINISH_NECK_X_LEFT, y1: 4700, x2: FINISH_NECK_X_LEFT, y2: 4950, thickness: 14, color: '#eab308' });
  walls.push({ x1: FINISH_NECK_X_RIGHT, y1: 4700, x2: FINISH_NECK_X_RIGHT, y2: 4950, thickness: 14, color: '#eab308' });

  // Đáy hố hứng bi
  walls.push({ x1: FINISH_NECK_X_LEFT, y1: 4950, x2: FINISH_NECK_X_RIGHT, y2: 4950, thickness: 16, color: '#ca8a04' });

  // ==================== CHẶNG 1: RỪNG ĐINH CẢN PACHINKO (Y: 280 -> 840) ====================
  const pegRows = 9;
  const pegStartY = 310;
  const rowSpacing = 60;

  for (let row = 0; row < pegRows; row++) {
    const y = pegStartY + row * rowSpacing;
    const isOdd = row % 2 === 1;
    const startX = isOdd ? 130 : 90;
    const endX = isOdd ? 770 : 810;
    const stepX = 74;

    for (let x = startX; x <= endX; x += stepX) {
      pegs.push({
        x,
        y,
        radius: 8,
        glowColor: row % 3 === 0 ? '#38bdf8' : row % 3 === 1 ? '#a855f7' : '#f59e0b',
        lastHitTime: 0,
      });
    }
  }

  // Góc vát hất bi về 2 cổng phễu lốc xoáy
  walls.push({ x1: 60, y1: 840, x2: 170, y2: 920, thickness: 12, color: '#6366f1' });
  walls.push({ x1: 840, y1: 840, x2: 730, y2: 920, thickness: 12, color: '#6366f1' });
  walls.push({ x1: 450, y1: 860, x2: 450, y2: 940, thickness: 12, color: '#6366f1' });

  // ==================== CHẶNG 2: PHỄU LỐC XOÁY ĐÔI (Y: 920 -> 1500) ====================
  vortices.push({
    x: 280,
    y: 1180,
    radius: 125,
    pullStrength: 0.16,
    rotationSpeed: 0.05,
    angle: 0,
    color: '#06b6d4',
  });
  vortices.push({
    x: 620,
    y: 1180,
    radius: 125,
    pullStrength: 0.16,
    rotationSpeed: -0.05,
    angle: 0,
    color: '#3b82f6',
  });

  walls.push({ x1: 60, y1: 1080, x2: 160, y2: 1180, thickness: 12, color: '#0284c7' });
  walls.push({ x1: 840, y1: 1080, x2: 740, y2: 1180, thickness: 12, color: '#0284c7' });
  walls.push({ x1: 450, y1: 1020, x2: 450, y2: 1320, thickness: 12, color: '#0284c7' });

  walls.push({ x1: 160, y1: 1300, x2: 360, y2: 1460, thickness: 12, color: '#0ea5e9' });
  walls.push({ x1: 740, y1: 1300, x2: 540, y2: 1460, thickness: 12, color: '#0ea5e9' });

  // ==================== CHẶNG 3: NẤM NẢY PINBALL & CÁNH QUẠT (Y: 1540 -> 2240) ====================
  bumpers.push({ x: 260, y: 1680, radius: 44, color: '#ec4899', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 640, y: 1680, radius: 44, color: '#ec4899', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 450, y: 1880, radius: 48, color: '#f59e0b', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 240, y: 2100, radius: 42, color: '#8b5cf6', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 660, y: 2100, radius: 42, color: '#8b5cf6', pulseScale: 1, lastHitTime: 0 });

  spinners.push({
    x: 450,
    y: 1660,
    armLength: 85,
    angle: 0,
    angularVelocity: 0.038,
  });
  spinners.push({
    x: 320,
    y: 1960,
    armLength: 78,
    angle: Math.PI / 4,
    angularVelocity: -0.042,
  });
  spinners.push({
    x: 580,
    y: 1960,
    armLength: 78,
    angle: Math.PI / 3,
    angularVelocity: 0.042,
  });

  walls.push({ x1: 60, y1: 1820, x2: 150, y2: 1890, thickness: 12, color: '#a855f7' });
  walls.push({ x1: 840, y1: 1820, x2: 750, y2: 1890, thickness: 12, color: '#a855f7' });

  // ==================== CHẶNG 4: CẦU BẬP BÊNH LIÊN HOÀN (Y: 2280 -> 2980) ====================
  // 3 Cầu bập bênh bản dài xoay quanh trục tạo cảm giác lướt cầu treo hoành tráng
  seeSaws.push({
    x: 450,
    y: 2400,
    length: 460,
    thickness: 16,
    angle: -0.15,
    angularVelocity: 0,
    maxAngle: 0.32,
    color: '#f97316',
  });
  seeSaws.push({
    x: 320,
    y: 2660,
    length: 420,
    thickness: 16,
    angle: 0.18,
    angularVelocity: 0,
    maxAngle: 0.32,
    color: '#eab308',
  });
  seeSaws.push({
    x: 580,
    y: 2880,
    length: 420,
    thickness: 16,
    angle: -0.18,
    angularVelocity: 0,
    maxAngle: 0.32,
    color: '#f97316',
  });

  walls.push({ x1: 60, y1: 2480, x2: 190, y2: 2560, thickness: 12, color: '#f97316' });
  walls.push({ x1: 840, y1: 2480, x2: 710, y2: 2560, thickness: 12, color: '#f97316' });

  // ==================== CHẶNG 5: MA TRẬN GỜ GIẢM TỐC SLALOM (Y: 3020 -> 3680) ====================
  const bumpRows = 6;
  const bumpStartY = 3080;
  for (let r = 0; r < bumpRows; r++) {
    const y = bumpStartY + r * 95;
    const isOdd = r % 2 === 1;
    const xList = isOdd ? [180, 360, 540, 720] : [270, 450, 630];

    xList.forEach((x) => {
      bumpers.push({
        x,
        y,
        radius: 32,
        color: '#10b981',
        pulseScale: 1,
        lastHitTime: 0,
      });
    });
  }

  walls.push({ x1: 60, y1: 3260, x2: 150, y2: 3340, thickness: 12, color: '#059669' });
  walls.push({ x1: 840, y1: 3260, x2: 750, y2: 3340, thickness: 12, color: '#059669' });
  walls.push({ x1: 60, y1: 3560, x2: 180, y2: 3660, thickness: 14, color: '#059669' });
  walls.push({ x1: 840, y1: 3560, x2: 720, y2: 3660, thickness: 14, color: '#059669' });

  // ==================== CHẶNG 6: MÁNG DỐC ZÍC-ZẮC CAO TỐC (Y: 3720 -> 4380) ====================
  // Ba máng trượt kết hợp "Khe rơi đường tắt" (Shortcut Gap) & "Vạch tăng tốc Turbo Neon"
  // Máng 1: Tách đôi tạo khe rơi tắt ở giữa x: 360 -> 450
  walls.push({ x1: 60, y1: 3760, x2: 360, y2: 3860, thickness: 16, color: '#10b981' });
  walls.push({ x1: 450, y1: 3890, x2: 670, y2: 3965, thickness: 16, color: '#10b981' });
  turboPads.push({
    id: 'm1_turbo_1',
    x: 560,
    y: 3925,
    length: 85,
    thickness: 18,
    angle: 0.33,
    color: '#06b6d4',
    glowColor: '#22d3ee',
    boostMultiplier: 1.85,
  });

  // Máng 2: Tách đôi tạo khe rơi tắt ở giữa x: 540 -> 450
  walls.push({ x1: 840, y1: 4020, x2: 540, y2: 4120, thickness: 16, color: '#3b82f6' });
  walls.push({ x1: 450, y1: 4150, x2: 230, y2: 4225, thickness: 16, color: '#3b82f6' });
  turboPads.push({
    id: 'm1_turbo_2',
    x: 340,
    y: 4185,
    length: 85,
    thickness: 18,
    angle: Math.PI - 0.33,
    color: '#ec4899',
    glowColor: '#f472b6',
    boostMultiplier: 1.85,
  });

  // Máng 3: Tách đôi tạo khe rơi tắt ở giữa x: 360 -> 450 dẫn thẳng vào phễu
  walls.push({ x1: 60, y1: 4260, x2: 360, y2: 4355, thickness: 16, color: '#8b5cf6' });
  walls.push({ x1: 450, y1: 4385, x2: 660, y2: 4455, thickness: 16, color: '#8b5cf6' });
  turboPads.push({
    id: 'm1_turbo_3',
    x: 550,
    y: 4420,
    length: 85,
    thickness: 18,
    angle: 0.32,
    color: '#a855f7',
    glowColor: '#c084fc',
    boostMultiplier: 1.95,
  });

  return {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    startGateY: START_GATE_Y,
    finishLineY: FINISH_LINE_Y,
    pegs,
    bumpers,
    spinners,
    vortices,
    seeSaws,
    walls,
    turboPads,
  };
}

/**
 * BẢN ĐỒ 2: HẺM NÚI BÁNH RĂNG (GEAR CANYON - CƠ KHÍ STEAMPUNK)
 * Đặc trưng: Máng Slalom đan chéo, Bánh răng khổng lồ, Rừng đinh Kim Cương đồng thau, Bộ ba Tuabin lốc xoáy, Cầu bập bênh đôi, Ma trận Nấm nảy liên hoàn
 */
export function buildGearCanyonTrack(): MarbleRaceTrack {
  const pegs: PegObstacle[] = [];
  const bumpers: BumperObstacle[] = [];
  const spinners: SpinnerObstacle[] = [];
  const vortices: VortexObstacle[] = [];
  const seeSaws: SeeSawObstacle[] = [];
  const walls: WallSegment[] = [];
  const turboPads: TurboPadObstacle[] = [];

  // ==================== TƯỜNG BIÊN NGOÀI TOÀN TUYẾN ====================
  walls.push({ x1: 60, y1: 50, x2: 60, y2: 4420, thickness: 14, color: '#b45309' });
  walls.push({ x1: 840, y1: 50, x2: 840, y2: 4420, thickness: 14, color: '#b45309' });

  // Tường phễu dẫn hướng ở Chặng 7
  walls.push({ x1: 60, y1: 4420, x2: FINISH_NECK_X_LEFT, y2: 4700, thickness: 14, color: '#d97706' });
  walls.push({ x1: 840, y1: 4420, x2: FINISH_NECK_X_RIGHT, y2: 4700, thickness: 14, color: '#d97706' });

  // Ống cổ chai thẳng xuống vạch đích
  walls.push({ x1: FINISH_NECK_X_LEFT, y1: 4700, x2: FINISH_NECK_X_LEFT, y2: 4950, thickness: 14, color: '#f59e0b' });
  walls.push({ x1: FINISH_NECK_X_RIGHT, y1: 4700, x2: FINISH_NECK_X_RIGHT, y2: 4950, thickness: 14, color: '#f59e0b' });

  // Đáy hố hứng bi
  walls.push({ x1: FINISH_NECK_X_LEFT, y1: 4950, x2: FINISH_NECK_X_RIGHT, y2: 4950, thickness: 16, color: '#92400e' });

  // ==================== CHẶNG 1: MÁNG TRƯỢT SLALOM ĐAN CHÉO (Y: 280 -> 880) ====================
  // Ba máng trượt kết hợp "Khe rơi đường tắt" (Shortcut Gap) & "Vạch tăng tốc Turbo Neon"
  // Máng 1: Tách đôi tạo khe rơi tắt ở giữa x: 360 -> 450
  walls.push({ x1: 60, y1: 340, x2: 360, y2: 435, thickness: 15, color: '#ea580c' });
  walls.push({ x1: 450, y1: 465, x2: 670, y2: 535, thickness: 15, color: '#ea580c' });
  turboPads.push({
    id: 'm2_turbo_1',
    x: 560,
    y: 500,
    length: 85,
    thickness: 18,
    angle: 0.31,
    color: '#f59e0b',
    glowColor: '#fbbf24',
    boostMultiplier: 1.85,
  });

  // Máng 2: Tách đôi tạo khe rơi tắt ở giữa x: 540 -> 450
  walls.push({ x1: 840, y1: 560, x2: 540, y2: 655, thickness: 15, color: '#d97706' });
  walls.push({ x1: 450, y1: 685, x2: 230, y2: 755, thickness: 15, color: '#d97706' });
  turboPads.push({
    id: 'm2_turbo_2',
    x: 340,
    y: 720,
    length: 85,
    thickness: 18,
    angle: Math.PI - 0.31,
    color: '#10b981',
    glowColor: '#34d399',
    boostMultiplier: 1.85,
  });

  // Máng 3: Tách đôi tạo khe rơi tắt ở giữa x: 360 -> 450
  walls.push({ x1: 60, y1: 770, x2: 360, y2: 865, thickness: 15, color: '#ea580c' });
  walls.push({ x1: 450, y1: 895, x2: 670, y2: 965, thickness: 15, color: '#ea580c' });
  turboPads.push({
    id: 'm2_turbo_3',
    x: 560,
    y: 930,
    length: 85,
    thickness: 18,
    angle: 0.31,
    color: '#f59e0b',
    glowColor: '#fde047',
    boostMultiplier: 1.95,
  });

  // ==================== CHẶNG 2: BÁNH RĂNG KHỔNG LỒ SONG HÀNH (Y: 920 -> 1540) ====================
  // 2 Cánh quạt bánh răng cỡ lớn quay ngược chiều nhau (sải cánh dài 105px)
  spinners.push({
    x: 310,
    y: 1180,
    armLength: 105,
    angle: 0,
    angularVelocity: 0.044,
  });
  spinners.push({
    x: 590,
    y: 1290,
    armLength: 105,
    angle: Math.PI / 4,
    angularVelocity: -0.044,
  });

  // Vách hướng dòng vào bánh răng
  walls.push({ x1: 60, y1: 1040, x2: 170, y2: 1140, thickness: 12, color: '#d97706' });
  walls.push({ x1: 840, y1: 1140, x2: 730, y2: 1240, thickness: 12, color: '#d97706' });

  // 2 Nấm nảy ở hông bánh răng bật bi trở lại guồng quay
  bumpers.push({ x: 140, y: 1260, radius: 38, color: '#f59e0b', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 760, y: 1370, radius: 38, color: '#f59e0b', pulseScale: 1, lastHitTime: 0 });

  // Vách dẫn thoát khỏi chặng bánh răng
  walls.push({ x1: 170, y1: 1440, x2: 360, y2: 1540, thickness: 12, color: '#b45309' });
  walls.push({ x1: 730, y1: 1440, x2: 540, y2: 1540, thickness: 12, color: '#b45309' });

  // ==================== CHẶNG 3: RỪNG ĐINH KIM CƯƠNG ĐỒNG THAU (Y: 1580 -> 2220) ====================
  // Ma trận đinh kim cương đồng thau mở rộng từ tâm ra 2 cánh rồi thu hẹp lại
  const diamondLayout = [
    { y: 1630, xList: [330, 410, 490, 570] },
    { y: 1700, xList: [250, 330, 410, 490, 570, 650] },
    { y: 1770, xList: [170, 250, 330, 410, 490, 570, 650, 730] },
    { y: 1840, xList: [130, 210, 290, 370, 450, 530, 610, 690, 770] },
    { y: 1910, xList: [170, 250, 330, 410, 490, 570, 650, 730] },
    { y: 1980, xList: [250, 330, 410, 490, 570, 650] },
    { y: 2050, xList: [330, 410, 490, 570] },
    { y: 2120, xList: [290, 370, 450, 530, 610] },
  ];

  diamondLayout.forEach((row, rIdx) => {
    row.xList.forEach((x, cIdx) => {
      pegs.push({
        x,
        y: row.y,
        radius: 8.5,
        glowColor: (rIdx + cIdx) % 2 === 0 ? '#fbbf24' : '#f59e0b',
        lastHitTime: 0,
      });
    });
  });

  // 2 Nấm nảy ở hai góc cánh kim cương
  bumpers.push({ x: 105, y: 1870, radius: 40, color: '#ea580c', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 795, y: 1870, radius: 40, color: '#ea580c', pulseScale: 1, lastHitTime: 0 });

  // ==================== CHẶNG 4: BỘ BA TUABIN HÚT LỐC XOÁY (Y: 2260 -> 2960) ====================
  // Ba tuabin lốc xoáy tạo thành thế trận tam giác
  // Tuabin 1 bên trái
  vortices.push({
    x: 270,
    y: 2440,
    radius: 120,
    pullStrength: 0.16,
    rotationSpeed: 0.055,
    angle: 0,
    color: '#ea580c',
  });
  // Tuabin 2 bên phải
  vortices.push({
    x: 630,
    y: 2440,
    radius: 120,
    pullStrength: 0.16,
    rotationSpeed: -0.055,
    angle: 0,
    color: '#f59e0b',
  });
  // Tuabin 3 lớn trung tâm hứng bi rơi từ trên xuống
  vortices.push({
    x: 450,
    y: 2760,
    radius: 130,
    pullStrength: 0.18,
    rotationSpeed: 0.06,
    angle: 0,
    color: '#10b981',
  });

  // Tường phễu dẫn dòng vào bộ ba tuabin
  walls.push({ x1: 60, y1: 2340, x2: 160, y2: 2440, thickness: 12, color: '#d97706' });
  walls.push({ x1: 840, y1: 2340, x2: 740, y2: 2440, thickness: 12, color: '#d97706' });
  walls.push({ x1: 450, y1: 2300, x2: 450, y2: 2560, thickness: 12, color: '#d97706' });

  // Máng thoát dẫn bi xả xuống cầu bập bênh
  walls.push({ x1: 60, y1: 2680, x2: 280, y2: 2840, thickness: 12, color: '#059669' });
  walls.push({ x1: 840, y1: 2680, x2: 620, y2: 2840, thickness: 12, color: '#059669' });

  // ==================== CHẶNG 5: CẦU BẬP BÊNH ĐÔI ĐỐI XỨNG (Y: 3000 -> 3680) ====================
  // Hai cầu bập bênh bản dài xoay quanh trục tạo cảm giác lướt cầu treo hoành tráng
  seeSaws.push({
    x: 350,
    y: 3200,
    length: 460,
    thickness: 18,
    angle: -0.16,
    angularVelocity: 0,
    maxAngle: 0.30,
    color: '#d97706',
  });
  seeSaws.push({
    x: 550,
    y: 3480,
    length: 460,
    thickness: 18,
    angle: 0.16,
    angularVelocity: 0,
    maxAngle: 0.30,
    color: '#ea580c',
  });

  walls.push({ x1: 60, y1: 3080, x2: 170, y2: 3150, thickness: 12, color: '#b45309' });
  walls.push({ x1: 840, y1: 3080, x2: 730, y2: 3150, thickness: 12, color: '#b45309' });
  walls.push({ x1: 60, y1: 3360, x2: 170, y2: 3430, thickness: 12, color: '#b45309' });
  walls.push({ x1: 840, y1: 3360, x2: 730, y2: 3430, thickness: 12, color: '#b45309' });

  // ==================== CHẶNG 6: MA TRẬN NẤM NẢY PINBALL BUMPER (Y: 3720 -> 4380) ====================
  // 8 Nấm nảy Pinball cỡ lớn xếp so le 3 tầng
  bumpers.push({ x: 260, y: 3820, radius: 44, color: '#10b981', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 450, y: 3820, radius: 46, color: '#fbbf24', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 640, y: 3820, radius: 44, color: '#10b981', pulseScale: 1, lastHitTime: 0 });

  bumpers.push({ x: 180, y: 4020, radius: 42, color: '#f59e0b', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 360, y: 4020, radius: 44, color: '#ea580c', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 540, y: 4020, radius: 44, color: '#ea580c', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 720, y: 4020, radius: 42, color: '#f59e0b', pulseScale: 1, lastHitTime: 0 });

  bumpers.push({ x: 300, y: 4220, radius: 46, color: '#10b981', pulseScale: 1, lastHitTime: 0 });
  bumpers.push({ x: 600, y: 4220, radius: 46, color: '#10b981', pulseScale: 1, lastHitTime: 0 });

  // Cánh quạt nhỏ quét trung tâm chặng 6
  spinners.push({
    x: 450,
    y: 4220,
    armLength: 74,
    angle: 0,
    angularVelocity: 0.040,
  });

  walls.push({ x1: 60, y1: 4320, x2: 180, y2: 4420, thickness: 14, color: '#d97706' });
  walls.push({ x1: 840, y1: 4320, x2: 720, y2: 4420, thickness: 14, color: '#d97706' });

  return {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    startGateY: START_GATE_Y,
    finishLineY: FINISH_LINE_Y,
    pegs,
    bumpers,
    spinners,
    vortices,
    seeSaws,
    walls,
    turboPads,
  };
}

/**
 * ĐỊNH NGHĨA DANH SÁCH BẢN ĐỒ VÀ THÔNG SỐ ĐỒ HỌA
 */
export const MAP_DEFINITIONS: Record<MarbleMapId, MarbleMapDefinition> = {
  neon_pinball: {
    id: 'neon_pinball',
    name: 'Vương Quốc Pinball',
    icon: '🔮',
    subtitle: 'Phong cách Neon Arcade rực rỡ, lốc xoáy & gờ giảm tốc',
    theme: {
      bgGradient: ['#020617', '#0f172a', '#020617'],
      gridColor: 'rgba(99, 102, 241, 0.08)',
      wallColor: '#4338ca',
      accentColor: '#a855f7',
    },
    stages: [
      { y: 280, label: 'CHẶNG 1: RỪNG ĐINH CẢN PACHINKO', color: '#38bdf8' },
      { y: 920, label: 'CHẶNG 2: PHỄU LỐC XOÁY ĐÔI', color: '#06b6d4' },
      { y: 1540, label: 'CHẶNG 3: NẤM NẢY PINBALL & CÁNH QUẠT', color: '#ec4899' },
      { y: 2280, label: 'CHẶNG 4: CẦU BẬP BÊNH LIÊN HOÀN', color: '#f97316' },
      { y: 3020, label: 'CHẶNG 5: MA TRẬN GỜ GIẢM TỐC SLALOM', color: '#10b981' },
      { y: 3720, label: 'CHẶNG 6: MÁNG DỐC ZÍC-ZẮC CAO TỐC', color: '#8b5cf6' },
      { y: 4420, label: 'CHẶNG 7: PHỄU CỔ CHAI & VẠCH ĐÍCH', color: '#fbbf24' },
    ],
    buildTrack: buildNeonPinballTrack,
  },
  gear_canyon: {
    id: 'gear_canyon',
    name: 'Hẻm Núi Bánh Răng',
    icon: '⚙️',
    subtitle: 'Phong cách Cơ khí Steampunk, bánh răng khổng lồ & bộ 3 tuabin',
    theme: {
      bgGradient: ['#0c0a09', '#1c1917', '#0c0a09'],
      gridColor: 'rgba(245, 158, 11, 0.07)',
      wallColor: '#b45309',
      accentColor: '#f59e0b',
    },
    stages: [
      { y: 280, label: 'CHẶNG 1: MÁNG TRƯỢT SLALOM ĐAN CHÉO', color: '#f97316' },
      { y: 920, label: 'CHẶNG 2: BÁNH RĂNG KHỔNG LỒ SONG HÀNH', color: '#f59e0b' },
      { y: 1580, label: 'CHẶNG 3: RỪNG ĐINH KIM CƯƠNG ĐỒNG THAU', color: '#fbbf24' },
      { y: 2260, label: 'CHẶNG 4: BỘ BA TUABIN HÚT LỐC XOÁY', color: '#10b981' },
      { y: 3000, label: 'CHẶNG 5: CẦU BẬP BÊNH ĐÔI ĐỐI XỨNG', color: '#ea580c' },
      { y: 3720, label: 'CHẶNG 6: MA TRẬN NẤM NẢY PINBALL BUMPER', color: '#10b981' },
      { y: 4420, label: 'CHẶNG 7: PHỄU CỔ CHAI & VẠCH ĐÍCH', color: '#f59e0b' },
    ],
    buildTrack: buildGearCanyonTrack,
  },
};

export const MARBLE_MAP_LIST: MarbleMapDefinition[] = [
  MAP_DEFINITIONS.neon_pinball,
  MAP_DEFINITIONS.gear_canyon,
];

/**
 * Lấy ngẫu nhiên một bản đồ từ danh sách
 */
export function getRandomMarbleMap(): MarbleMapDefinition {
  const idx = Math.floor(Math.random() * MARBLE_MAP_LIST.length);
  return MARBLE_MAP_LIST[idx] ?? MAP_DEFINITIONS.neon_pinball;
}

/**
 * Lấy bản đồ theo ID cụ thể
 */
export function getMarbleMapById(id: MarbleMapId): MarbleMapDefinition {
  return MAP_DEFINITIONS[id] ?? MAP_DEFINITIONS.neon_pinball;
}

/**
 * Hàm dựng track tương thích ngược
 */
export function buildMarbleTrack(mapId: MarbleMapId = 'neon_pinball'): MarbleRaceTrack {
  const mapDef = MAP_DEFINITIONS[mapId] ?? MAP_DEFINITIONS.neon_pinball;
  return mapDef.buildTrack();
}
