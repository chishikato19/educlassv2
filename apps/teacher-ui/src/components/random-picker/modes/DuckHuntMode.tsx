import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import type { PickerSelectionStrategy, PickerStudent, RandomPickerModeProps } from '../types.js';
import { soundManager } from '../sound.js';

const GALLERY_WIDTH = 1200;
const GALLERY_HEIGHT = 600;
const LANE_Y_POSITIONS = [150, 300, 450];
const LANE_DIRECTIONS = [1, -1, 1]; // Hàng 1 sang phải, Hàng 2 sang trái, Hàng 3 sang phải
const LANE_BASE_SPEEDS = [0.9, -1.1, 1.2]; // Tốc độ vừa vặn, êm ái, bơi thong dong

// Giới hạn an toàn để tâm ngắm LUÔN LUÔN nằm trọn vẹn trong màn hình, cách rất xa rèm viền
const MIN_CROSSHAIR_X = 140;
const MAX_CROSSHAIR_X = GALLERY_WIDTH - 140; // 1060
const MIN_CROSSHAIR_Y = 100;
const MAX_CROSSHAIR_Y = GALLERY_HEIGHT - 90; // 510

const clampCrosshairX = (x: number) => Math.max(MIN_CROSSHAIR_X, Math.min(MAX_CROSSHAIR_X, x));
const clampCrosshairY = (y: number) => Math.max(MIN_CROSSHAIR_Y, Math.min(MAX_CROSSHAIR_Y, y));

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// Tạo texture ánh đèn rọi spotlight 3200x3200 bao phủ trọn vẹn mọi góc màn hình không bao giờ bị hở mép
let cachedSpotlightTexture: Texture | null = null;
function getSpotlightTexture(): Texture {
  if (cachedSpotlightTexture) return cachedSpotlightTexture;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 3200;
  canvas.height = 3200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  const cx = 1600;
  const cy = 1600;

  // 1. Phủ đen sẫm toàn bộ diện tích 3200x3200 che kín tuyệt đối
  ctx.fillStyle = 'rgba(0, 0, 0, 0.93)';
  ctx.fillRect(0, 0, 3200, 3200);

  // 2. Dùng destination-out để khoét lỗ mềm mại mờ dần quanh tâm ngắm
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const grad = ctx.createRadialGradient(cx, cy, 80, cx, cy, 210);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Khoét trong suốt 100% ở tâm r <= 80
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.95)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Ngoài r=210 giữ nguyên màu đen sẫm
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Vành kính ngắm quang học vàng ấm quanh lỗ ngắm
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 100, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Vòng quang học mờ phụ trợ tăng độ điện ảnh
  ctx.beginPath();
  ctx.arc(cx, cy, 145, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  cachedSpotlightTexture = Texture.from(canvas);
  return cachedSpotlightTexture;
}

// 10 phong cách / màu sắc vịt khác nhau cho mỗi học sinh
interface DuckSkin {
  name: string;
  bodyColor: number;
  wingColor: number;
  headColor: number;
  beakColor: number;
  accessory: 'sunglasses' | 'bow' | 'crown' | 'cap' | 'tophat' | 'scarf' | 'none';
}

const DUCK_SKINS: DuckSkin[] = [
  {
    name: 'Vàng cổ điển',
    bodyColor: 0xffc837,
    wingColor: 0xf59e0b,
    headColor: 0xffc837,
    beakColor: 0xff6b35,
    accessory: 'none',
  },
  {
    name: 'Thiên nga trắng',
    bodyColor: 0xf8fafc,
    wingColor: 0xe2e8f0,
    headColor: 0xf8fafc,
    beakColor: 0xf59e0b,
    accessory: 'crown', // Vương miện vàng
  },
  {
    name: 'Vịt cổ xanh',
    bodyColor: 0x78350f,
    wingColor: 0x1e3a8a,
    headColor: 0x0d9488, // Đầu xanh ngọc
    beakColor: 0xeab308,
    accessory: 'scarf', // Vòng cổ trắng
  },
  {
    name: 'Hồng kẹo ngọt',
    bodyColor: 0xf472b6,
    wingColor: 0xec4899,
    headColor: 0xf472b6,
    beakColor: 0xdb2777,
    accessory: 'bow', // Nơ hồng
  },
  {
    name: 'Xanh da trời',
    bodyColor: 0x38bdf8,
    wingColor: 0x0284c7,
    headColor: 0x38bdf8,
    beakColor: 0xfb923c,
    accessory: 'sunglasses', // Kính râm đen ngầu
  },
  {
    name: 'Xanh cốm',
    bodyColor: 0xa3e635,
    wingColor: 0x65a30d,
    headColor: 0xa3e635,
    beakColor: 0xf97316,
    accessory: 'cap', // Mũ lưỡi trai
  },
  {
    name: 'Tím mộng mơ',
    bodyColor: 0xc084fc,
    wingColor: 0x9333ea,
    headColor: 0xc084fc,
    beakColor: 0xfbbf24,
    accessory: 'tophat', // Mũ ảo thuật
  },
  {
    name: 'Cam hoàng hôn',
    bodyColor: 0xfb923c,
    wingColor: 0xea580c,
    headColor: 0xfb923c,
    beakColor: 0xef4444,
    accessory: 'none',
  },
  {
    name: 'Ngọc lam biển',
    bodyColor: 0x2dd4bf,
    wingColor: 0x0f766e,
    headColor: 0x2dd4bf,
    beakColor: 0xfacc15,
    accessory: 'sunglasses',
  },
  {
    name: 'Socola nâu',
    bodyColor: 0xa8a29e,
    wingColor: 0x57534e,
    headColor: 0xa8a29e,
    beakColor: 0xd97706,
    accessory: 'none',
  },
];

interface DuckDisplayItem {
  container: Container;
  student: PickerStudent;
  laneIdx: number;
  speed: number;
  isDead: boolean;
  baseY: number;
  bobPhase: number;
  nameLabel: Text;
  tagBg: Graphics;
  duckBody: Graphics;
  laneTrackLength: number;
}

export const DuckHuntMode: React.FC<RandomPickerModeProps> = ({
  isPicking,
  candidates = [],
  onTriggerSpin,
  isCompleted,
  isFullscreen = false,
  onDuckHuntComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const stageRootRef = useRef<Container | null>(null);
  const ducksRef = useRef<DuckDisplayItem[]>([]);
  const crosshairRef = useRef<Container | null>(null);
  const spotlightSpriteRef = useRef<Sprite | null>(null);
  const trackingDuckRef = useRef<DuckDisplayItem | null>(null);
  const isHuntingRef = useRef<boolean>(false);
  const activeTweensRef = useRef<gsap.core.Tween[]>([]);
  const abortHuntRef = useRef<boolean>(false);
  const borderHitRef = useRef<boolean>(false);
  const pendingHuntRef = useRef<boolean>(false);

  // Tùy chọn hiển thị ẩn danh hay hiện tên trực tiếp
  const [hideNames, setHideNames] = useState<boolean>(false);
  const [huntingStatus, setHuntingStatus] = useState<string>('Sẵn sàng');
  const [winnerStudent, setWinnerStudent] = useState<PickerStudent | null>(null);

  // Hàm tạo từng chú vịt với skin màu sắc & phụ kiện riêng biệt
  const createDuckNode = (
    student: PickerStudent,
    laneIdx: number,
    startX: number,
    skinIndex: number,
    isHidden: boolean,
    laneTrackLength: number
  ): DuckDisplayItem => {
    const skin = DUCK_SKINS[skinIndex % DUCK_SKINS.length]!;
    const container = new Container();
    container.zIndex = 10 + laneIdx * 5;
    container.x = startX;
    container.y = LANE_Y_POSITIONS[laneIdx]!;

    const direction = LANE_DIRECTIONS[laneIdx] || 1;
    const speed = LANE_BASE_SPEEDS[laneIdx] || 1;

    // A. Thân vịt bằng Graphics
    const duckBody = new Graphics();

    // Đế gắn lò xo vào ray trượt
    duckBody.roundRect(-12, 26, 24, 8, 2).fill({ color: 0x334155 });
    duckBody.rect(-4, 15, 8, 13).fill({ color: 0x64748b });

    // Thân vịt theo màu skin
    duckBody.ellipse(0, 2, 46, 28).fill({ color: skin.bodyColor });
    // Cánh vịt
    duckBody.ellipse(-10 * direction, 3, 24, 15).fill({ color: skin.wingColor });

    // Đầu vịt
    const headX = 26 * direction;
    duckBody.circle(headX, -22, 18).fill({ color: skin.headColor });

    // Mỏ vịt
    if (direction > 0) {
      duckBody.roundRect(headX + 11, -24, 18, 10, 3).fill({ color: skin.beakColor });
      duckBody.circle(headX + 6, -26, 3.2).fill({ color: 0x111111 }); // Mắt
      duckBody.circle(headX + 7, -27, 1.2).fill({ color: 0xffffff }); // Đốm sáng
    } else {
      duckBody.roundRect(headX - 29, -24, 18, 10, 3).fill({ color: skin.beakColor });
      duckBody.circle(headX - 6, -26, 3.2).fill({ color: 0x111111 });
      duckBody.circle(headX - 5, -27, 1.2).fill({ color: 0xffffff });
    }

    // Vẽ phụ kiện độc đáo cho từng chú vịt
    if (skin.accessory === 'sunglasses') {
      if (direction > 0) {
        duckBody.roundRect(headX + 2, -29, 16, 8, 2).fill({ color: 0x111827 });
        duckBody.rect(headX - 4, -27, 6, 2).fill({ color: 0x111827 });
      } else {
        duckBody.roundRect(headX - 18, -29, 16, 8, 2).fill({ color: 0x111827 });
        duckBody.rect(headX - 2, -27, 6, 2).fill({ color: 0x111827 });
      }
    } else if (skin.accessory === 'crown') {
      duckBody.poly([
        headX - 8, -40,
        headX - 11, -48,
        headX - 4, -43,
        headX, -50,
        headX + 4, -43,
        headX + 11, -48,
        headX + 8, -40,
      ]).fill({ color: 0xfbbf24 }).stroke({ width: 1, color: 0xb45309 });
    } else if (skin.accessory === 'bow') {
      duckBody.ellipse(headX - 6 * direction, -40, 7, 5).fill({ color: 0xf43f5e });
      duckBody.ellipse(headX + 6 * direction, -40, 7, 5).fill({ color: 0xf43f5e });
      duckBody.circle(headX, -40, 3.5).fill({ color: 0xffffff });
    } else if (skin.accessory === 'cap') {
      duckBody.ellipse(headX, -38, 16, 5.5).fill({ color: 0x2563eb });
      duckBody.rect(headX + (direction > 0 ? 6 : -20), -38, 14, 3).fill({ color: 0x1d4ed8 });
    } else if (skin.accessory === 'tophat') {
      duckBody.rect(headX - 11, -52, 22, 16).fill({ color: 0x1e1b4b });
      duckBody.rect(headX - 15, -38, 30, 3).fill({ color: 0x1e1b4b });
      duckBody.rect(headX - 11, -42, 22, 3).fill({ color: 0xd97706 });
    } else if (skin.accessory === 'scarf') {
      duckBody.roundRect(headX - 10, -7, 20, 6, 2).fill({ color: 0xf8fafc });
    }

    container.addChild(duckBody);

    // B. Thẻ tên học sinh rõ nét
    const tagBg = new Graphics();
    tagBg
      .roundRect(-58, 10, 116, 28, 6)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0x1e293b });
    container.addChild(tagBg);

    const displayName = isHidden ? '?' : student.name;
    const nameLabel = new Text({
      text: displayName,
      style: new TextStyle({
        fill: isHidden ? '#dc2626' : '#0f172a',
        fontSize: isHidden ? 22 : 13,
        fontWeight: 'bold',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }),
    });
    nameLabel.anchor.set(0.5);
    nameLabel.x = 0;
    nameLabel.y = 24;
    container.addChild(nameLabel);

    return {
      container,
      student,
      laneIdx,
      speed,
      isDead: false,
      baseY: LANE_Y_POSITIONS[laneIdx]!,
      bobPhase: Math.random() * Math.PI * 2,
      nameLabel,
      tagBg,
      duckBody,
      laneTrackLength,
    };
  };

  // Tái dựng đàn vịt: Phân bổ đều từng hàng, khoảng cách an toàn KHÔNG BAO GIỜ đè lên nhau
  const rebuildDucks = (
    root: Container,
    studentList: PickerStudent[],
    isHidden: boolean
  ) => {
    ducksRef.current.forEach((item) => {
      try {
        if (item.container.parent) {
          item.container.parent.removeChild(item.container);
        }
        item.container.destroy({ children: true });
      } catch {
        // Bỏ qua lỗi dọn dẹp container
      }
    });
    ducksRef.current = [];

    if (studentList.length === 0) return;

    // Phân nhóm học sinh theo từng hàng ray
    const laneStudents: PickerStudent[][] = [[], [], []];
    studentList.forEach((st, idx) => {
      laneStudents[idx % 3]!.push(st);
    });

    laneStudents.forEach((laneSts, laneIdx) => {
      if (laneSts.length === 0) return;
      const count = laneSts.length;
      // Chiều dài thanh ray tuần hoàn đảm bảo mọi chú vịt cách nhau tối thiểu 210px
      const laneTrackLength = Math.max(GALLERY_WIDTH + 420, count * 220);
      const spacing = laneTrackLength / count;

      laneSts.forEach((student, i) => {
        const startX = -100 + i * spacing;
        const duck = createDuckNode(
          student,
          laneIdx,
          startX,
          i + laneIdx * 3,
          isHidden,
          laneTrackLength
        );
        root.addChild(duck.container);
        ducksRef.current.push(duck);
      });
    });
  };

  // 1. Khởi tạo PixiJS Application
  useEffect(() => {
    let isDestroyed = false;

    async function initPixi() {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;

      const app = new Application();
      await app.init({
        canvas,
        width: GALLERY_WIDTH,
        height: GALLERY_HEIGHT,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
      });

      if (isDestroyed) {
        try {
          app.destroy(true);
        } catch {
          // Bỏ qua lỗi dọn dẹp app pixi
        }
        return;
      }

      // Ép CSS trực tiếp trên thẻ canvas để phủ kín 100% diện tích khung, không bị co lại bên trái
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      pixiAppRef.current = app;

      const stageRoot = new Container();
      stageRoot.sortableChildren = true;
      app.stage.addChild(stageRoot);
      stageRootRef.current = stageRoot;

      // Vẽ bối cảnh trường bắn hội chợ (1200x600 tràn viền hoàn mỹ)
      drawCarnivalGallery(stageRoot);

      // Tạo lớp phủ Spotlight (bóng tối xung quanh tâm ngắm)
      const spotlightSprite = new Sprite(getSpotlightTexture());
      spotlightSprite.anchor.set(0.5);
      spotlightSprite.x = GALLERY_WIDTH / 2;
      spotlightSprite.y = GALLERY_HEIGHT / 2;
      spotlightSprite.alpha = 0; // Khi chưa bắn thì ẩn
      spotlightSprite.zIndex = 95;
      stageRoot.addChild(spotlightSprite);
      spotlightSpriteRef.current = spotlightSprite;

      // Tạo tâm ngắm súng săn
      createCrosshair(stageRoot);

      // Dựng đàn vịt ngay lập tức
      rebuildDucks(stageRoot, candidates, hideNames);

      // Nếu đã có lệnh bắn đang chờ (do isPicking = true trước khi init xong)
      if (pendingHuntRef.current || isPicking) {
        pendingHuntRef.current = false;
        window.setTimeout(() => {
          if (!isHuntingRef.current) {
            void executeHuntSequence('normal');
          }
        }, 300);
      }

      // Rê chuột điều khiển tâm ngắm mượt mà khi rảnh tay
      if (canvasRef.current) {
        canvasRef.current.addEventListener('mousemove', handleMouseMove);
      }

      // Ticker bơi ngang có chu kỳ wrap toán học không bao giờ đè lên nhau
      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        const now = performance.now() * 0.003;

        ducksRef.current.forEach((item) => {
          if (!item.isDead) {
            item.container.x += item.speed * delta;
            item.container.y = item.baseY + Math.sin(now + item.bobPhase) * 3;

            // Bọc vòng tuần hoàn theo đúng chu kỳ trackLength của hàng
            if (item.speed > 0 && item.container.x > GALLERY_WIDTH + 180) {
              item.container.x -= item.laneTrackLength;
            } else if (item.speed < 0 && item.container.x < -180) {
              item.container.x += item.laneTrackLength;
            }
          }
        });

        // BÁM SÁT VỊT (DYNAMIC TRACKING): Ticker gán trực tiếp tọa độ vịt bơi cho tâm ngắm & spotlight
        const tracking = trackingDuckRef.current;
        if (tracking && !tracking.isDead) {
          const rawX = tracking.container.x;
          // Nếu vịt bơi chạm vùng gần mép biên sân khấu, báo cờ borderHit và ngắt tracking
          // để executeHuntSequence lập tức chuyển ngắm sang vịt khác, tâm không bao giờ dừng lại ở biên!
          if (
            (tracking.speed > 0 && rawX > MAX_CROSSHAIR_X - 60) ||
            (tracking.speed < 0 && rawX < MIN_CROSSHAIR_X + 60)
          ) {
            borderHitRef.current = true;
            trackingDuckRef.current = null;
          } else {
            const duckX = clampCrosshairX(rawX);
            const duckY = clampCrosshairY(tracking.container.y - 12);
            if (crosshairRef.current) {
              crosshairRef.current.x = duckX;
              crosshairRef.current.y = duckY;
            }
            if (spotlightSpriteRef.current) {
              spotlightSpriteRef.current.x = duckX;
              spotlightSpriteRef.current.y = duckY;
            }
          }
        }
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHuntingRef.current && crosshairRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = GALLERY_WIDTH / rect.width;
        const scaleY = GALLERY_HEIGHT / rect.height;
        const mx = clampCrosshairX((e.clientX - rect.left) * scaleX);
        const my = clampCrosshairY((e.clientY - rect.top) * scaleY);
        crosshairRef.current.x = mx;
        crosshairRef.current.y = my;
        if (spotlightSpriteRef.current) {
          spotlightSpriteRef.current.x = mx;
          spotlightSpriteRef.current.y = my;
        }
      }
    };

    void initPixi();

    return () => {
      isDestroyed = true;
      abortHuntRef.current = true;
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      activeTweensRef.current.forEach((t) => {
        try {
          t.kill();
        } catch {
          // Bỏ qua lỗi dừng tween
        }
      });
      activeTweensRef.current = [];
      if (pixiAppRef.current) {
        try {
          pixiAppRef.current.destroy(true, { children: true });
        } catch {
          // Bỏ qua lỗi dọn dẹp app pixi
        }
        pixiAppRef.current = null;
      }
    };
  }, []);

  // 2. Cập nhật vịt khi candidates hoặc hideNames thay đổi
  useEffect(() => {
    if (stageRootRef.current) {
      rebuildDucks(stageRootRef.current, candidates, hideNames);
    }
  }, [candidates, hideNames]);

  // 3. Vẽ bối cảnh trường bắn hội chợ (1200x600 tràn viền, không bị khoảng hở)
  const drawCarnivalGallery = (root: Container) => {
    const bgGraphics = new Graphics();
    bgGraphics.zIndex = 1;
    root.addChild(bgGraphics);

    // Nền gỗ nâu ấm áp
    bgGraphics.rect(0, 0, GALLERY_WIDTH, GALLERY_HEIGHT).fill({ color: 0x22130c });
    // Nan gỗ dọc
    for (let x = 0; x < GALLERY_WIDTH; x += 60) {
      bgGraphics.rect(x, 0, 3, GALLERY_HEIGHT).fill({ color: 0x140a06, alpha: 0.65 });
    }

    // 3 thanh ray gỗ trượt ngang
    LANE_Y_POSITIONS.forEach((y) => {
      // Bóng đổ dưới ray
      bgGraphics.rect(0, y + 42, GALLERY_WIDTH, 14).fill({ color: 0x0c0604, alpha: 0.85 });
      // Ván gỗ ray
      bgGraphics.roundRect(0, y + 26, GALLERY_WIDTH, 18, 4).fill({ color: 0x452511 });
      // Ray kim loại vàng
      bgGraphics.rect(0, y + 27, GALLERY_WIDTH, 4.5).fill({ color: 0xf59e0b, alpha: 0.9 });
    });

    // Rèm đỏ hội chợ cổ điển (Drape)
    const drape = new Graphics();
    drape.zIndex = 50;
    root.addChild(drape);

    const scallopWidth = 60;
    const scallopCount = Math.ceil(GALLERY_WIDTH / scallopWidth);

    // Rèm trên đỉnh
    drape.rect(0, 0, GALLERY_WIDTH, 26).fill({ color: 0x991b1b });
    for (let i = 0; i < scallopCount; i++) {
      const cx = i * scallopWidth + scallopWidth / 2;
      drape
        .ellipse(cx, 26, scallopWidth / 2, 26)
        .fill({ color: i % 2 === 0 ? 0xb91c1c : 0xdc2626 })
        .stroke({ width: 2, color: 0x7f1d1d });
    }

    for (let i = 0; i < scallopCount; i++) {
      const cx = i * scallopWidth + scallopWidth / 2;
      drape.circle(cx, 48, 5.5).fill({ color: 0xfef08a }).stroke({ width: 1.5, color: 0xeab308 });
    }

    // Hai cột rèm đỏ bên trái và phải phủ kín biên
    drape.roundRect(0, 0, 48, GALLERY_HEIGHT, 10).fill({ color: 0x991b1b });
    drape.roundRect(0, 0, 48, GALLERY_HEIGHT, 10).stroke({ width: 2, color: 0xb45309 });

    drape.roundRect(GALLERY_WIDTH - 48, 0, 48, GALLERY_HEIGHT, 10).fill({ color: 0x991b1b });
    drape.roundRect(GALLERY_WIDTH - 48, 0, 48, GALLERY_HEIGHT, 10).stroke({ width: 2, color: 0xb45309 });
  };

  // 4. Tạo tâm ngắm súng săn
  const createCrosshair = (root: Container) => {
    const crosshair = new Container();
    crosshair.zIndex = 100;
    crosshair.x = GALLERY_WIDTH / 2;
    crosshair.y = GALLERY_HEIGHT / 2;

    const g = new Graphics();
    g.circle(0, 0, 30).stroke({ width: 3, color: 0xef4444 });
    g.circle(0, 0, 13).stroke({ width: 1.5, color: 0xef4444, alpha: 0.8 });
    g.circle(0, 0, 4).fill({ color: 0xff0000 });
    g.moveTo(-40, 0).lineTo(-15, 0).stroke({ width: 2.5, color: 0xef4444 });
    g.moveTo(15, 0).lineTo(40, 0).stroke({ width: 2.5, color: 0xef4444 });
    g.moveTo(0, -40).lineTo(0, -15).stroke({ width: 2.5, color: 0xef4444 });
    g.moveTo(0, 15).lineTo(0, 40).stroke({ width: 2.5, color: 0xef4444 });

    crosshair.addChild(g);
    root.addChild(crosshair);
    crosshairRef.current = crosshair;
  };

  // Kiểm tra xem chú vịt có đang bơi sát mép biên hay không
  const isDuckNearBorder = (duck: DuckDisplayItem): boolean => {
    const x = duck.container.x;
    if (duck.speed > 0 && x > MAX_CROSSHAIR_X - 60) return true;
    if (duck.speed < 0 && x < MIN_CROSSHAIR_X + 60) return true;
    return false;
  };

  // Helper: Di chuyển tâm ngắm đón đầu con vịt đang bơi mượt mà từng frame
  const animateCrosshairToDuck = (
    targetItem: DuckDisplayItem,
    duration: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (abortHuntRef.current) {
        resolve();
        return;
      }
      const tracker = { p: 0 };
      const startX = crosshairRef.current ? crosshairRef.current.x : GALLERY_WIDTH / 2;
      const startY = crosshairRef.current ? crosshairRef.current.y : GALLERY_HEIGHT / 2;

      let hasResolved = false;
      const done = () => {
        if (!hasResolved) {
          hasResolved = true;
          resolve();
        }
      };

      const tw = gsap.to(tracker, {
        p: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (abortHuntRef.current) {
            done();
            return;
          }
          // Nếu vịt mục tiêu này bơi chạm biên trong lúc tâm ngắm đang bay tới, lập tức hoàn tất sớm để đổi vịt!
          if (isDuckNearBorder(targetItem)) {
            borderHitRef.current = true;
            tw.kill();
            done();
            return;
          }
          const progress = tracker.p;
          const curDuckX = clampCrosshairX(targetItem.container.x);
          const curDuckY = clampCrosshairY(targetItem.container.y - 12);
          const interpX = startX + (curDuckX - startX) * progress;
          const interpY = startY + (curDuckY - startY) * progress;

          if (crosshairRef.current) {
            crosshairRef.current.x = interpX;
            crosshairRef.current.y = interpY;
          }
          if (spotlightSpriteRef.current) {
            spotlightSpriteRef.current.x = interpX;
            spotlightSpriteRef.current.y = interpY;
          }
        },
        onComplete: done,
      });
      activeTweensRef.current.push(tw);
    });
  };

  const runTween = (target: object, vars: gsap.TweenVars): Promise<void> => {
    return new Promise((resolve) => {
      if (abortHuntRef.current) {
        resolve();
        return;
      }
      const tw = gsap.to(target, {
        ...vars,
        onComplete: () => {
          if (typeof vars.onComplete === 'function') {
            vars.onComplete();
          }
          resolve();
        },
      });
      activeTweensRef.current.push(tw);
    });
  };

  // Lấy các chú vịt bơi an toàn ở khu vực trung tâm, tuyệt đối không chọn vịt đang bơi sát biên hoặc sắp khuất vào rèm
  const getSafeDucks = (excludeDuck?: DuckDisplayItem | null): DuckDisplayItem[] => {
    const safeList = ducksRef.current.filter((d) => {
      if (d.isDead) return false;
      if (excludeDuck && d === excludeDuck) return false;
      const x = d.container.x;
      // Bơi sang phải: phải còn cách mép phải ít nhất 260px (x <= 940) và đã vào trong mép trái (x >= 180)
      if (d.speed > 0) {
        return x >= 180 && x <= 940;
      }
      // Bơi sang trái: phải còn cách mép trái ít nhất 260px (x >= 260) và đã vào trong mép phải (x <= 1020)
      if (d.speed < 0) {
        return x >= 260 && x <= 1020;
      }
      return x >= 260 && x <= 940;
    });

    if (safeList.length > 0) return safeList;

    // Dự phòng an toàn nếu số lượng vịt ít
    return ducksRef.current.filter(
      (d) =>
        !d.isDead &&
        (!excludeDuck || d !== excludeDuck) &&
        d.container.x >= 180 &&
        d.container.x <= GALLERY_WIDTH - 180
    );
  };

  // Lấy các chú vịt có hành lang bơi dài nhất để khóa mục tiêu và bắn trúng
  const getSafeTargetDucks = (excludeDuck?: DuckDisplayItem | null): DuckDisplayItem[] => {
    const primePool = ducksRef.current.filter((d) => {
      if (d.isDead) return false;
      if (excludeDuck && d === excludeDuck) return false;
      const x = d.container.x;
      // Bơi sang phải: vịt ở dải x từ 200 đến 750 (còn trên 400px đường bơi thênh thang sang phải)
      if (d.speed > 0) {
        return x >= 200 && x <= 750;
      }
      // Bơi sang trái: vịt ở dải x từ 450 đến 1000 (còn trên 400px đường bơi thênh thang sang trái)
      if (d.speed < 0) {
        return x >= 450 && x <= 1000;
      }
      return x >= 350 && x <= 850;
    });

    if (primePool.length > 0) return primePool;
    return getSafeDucks(excludeDuck);
  };

  // 5. THUẬT TOÁN SĂN BẮN THỰC THẾ (KHÔNG CHỌN TRƯỚC, CHỈ BẮN VỊT TRÊN MÀN HÌNH):
  // Quét trực tiếp các chú vịt đang bơi, lướt qua từ 5 đến 10 vịt, không bao giờ khuyết vịt
  const executeHuntSequence = useCallback(
    async (strategy: PickerSelectionStrategy = 'normal') => {
      if (isHuntingRef.current) return;
      if (ducksRef.current.length === 0) return;

      const root = stageRootRef.current;
      const crosshair = crosshairRef.current;
      const spotlightSprite = spotlightSpriteRef.current;
      if (!root || !crosshair || !spotlightSprite) return;

      isHuntingRef.current = true;
      abortHuntRef.current = false;
      setWinnerStudent(null);

      // Bật spotlight rọi sáng dần (làm tối xung quanh)
      void runTween(spotlightSprite, {
        alpha: 0.95,
        duration: 0.35,
        ease: 'power2.out',
      });

      // Số lượt di chuyển qua các chú vịt: dao động từ 5 tới 10 vịt theo đúng yêu cầu
      const totalVisits = Math.floor(Math.random() * 6) + 5; // [5..10]
      const decoyCount = totalVisits - 1; // [4..9] chú vịt mồi

      let currentDuck: DuckDisplayItem | null = null;

      // 1. LƯỚT QUA CÁC CHÚ VỊT MỒI TRÊN MÀN HÌNH (Giai đoạn rà soát)
      for (let i = 0; i < decoyCount; i++) {
        if (abortHuntRef.current) return;

        // Chọn chú vịt an toàn tiếp theo tại ĐÚNG THỜI ĐIỂM NÀY
        const safePool = getSafeDucks(currentDuck);
        if (safePool.length === 0) break;

        const nextDuck = safePool[Math.floor(Math.random() * safePool.length)]!;
        currentDuck = nextDuck;

        // Tốc độ lướt nhịp nhàng (0.28s - 0.4s)
        const hopDuration = 0.28 + (i / decoyCount) * 0.12;
        borderHitRef.current = false;
        await animateCrosshairToDuck(nextDuck, hopDuration);
        if (abortHuntRef.current) return;

        // Nếu vừa chạm biên lúc lướt tới, bỏ qua dwell và chuyển ngay sang vịt khác (tâm không bao giờ ở lại biên)
        if (borderHitRef.current || isDuckNearBorder(nextDuck)) {
          continue;
        }

        // Bám theo chú vịt
        trackingDuckRef.current = nextDuck;
        soundManager.playReelTick();

        const displayLabel = hideNames ? '???' : nextDuck.student.name;
        setHuntingStatus(`Đang rà qua: ${displayLabel} (${i + 1}/${totalVisits})`);

        // Hiệu ứng phóng to nhẹ chú vịt khi tâm ngắm rọi trúng
        void runTween(nextDuck.container.scale, {
          x: 1.15,
          y: 1.15,
          duration: 0.12,
          yoyo: true,
          repeat: 1,
        });

        // Bám theo tối đa 220ms; nếu vịt chạm biên trong lúc bám theo, ngắt sớm ngay để chuyển ngắm vịt khác!
        let dwellElapsed = 0;
        while (dwellElapsed < 220) {
          if (abortHuntRef.current) return;
          if (borderHitRef.current || isDuckNearBorder(nextDuck)) {
            // Vịt chạm biên -> ngắt ngay lập tức để chuyển ngắm vịt khác!
            break;
          }
          await wait(20);
          dwellElapsed += 20;
        }

        trackingDuckRef.current = null;
      }

      if (abortHuntRef.current) return;

      // 2. KHÓA MỤC TIÊU VÀO CHÚ VỊT THỨ `totalVisits` (CHÍNH LÀ NGƯỜI CHIẾN THẮNG)
      // Lấy danh sách các chú vịt có hành lang an toàn cực rộng ở trung tâm
      const targetPool = getSafeTargetDucks(currentDuck);
      const uncalledTargetPool = targetPool.filter((d) => !d.student.alreadyCalled);
      const finalCandidatePool = uncalledTargetPool.length > 0 ? uncalledTargetPool : targetPool;

      let targetDuck: DuckDisplayItem;
      if (strategy === 'bias_good') {
        const sorted = [...finalCandidatePool].sort((a, b) => {
          const rankA =
            a.student.academicPerformance === 'tot'
              ? 3
              : a.student.academicPerformance === 'kha'
              ? 2
              : a.student.score || 0;
          const rankB =
            b.student.academicPerformance === 'tot'
              ? 3
              : b.student.academicPerformance === 'kha'
              ? 2
              : b.student.score || 0;
          return rankB - rankA;
        });
        targetDuck = sorted[0] || finalCandidatePool[0]!;
      } else {
        targetDuck = finalCandidatePool[Math.floor(Math.random() * finalCandidatePool.length)]!;
      }

      // Đảm bảo targetDuck tuyệt đối không ở gần biên
      if (isDuckNearBorder(targetDuck)) {
        const freshSafe = getSafeTargetDucks(null).filter((d) => !isDuckNearBorder(d));
        if (freshSafe.length > 0) {
          targetDuck = freshSafe[0]!;
        }
      }

      const targetStudent = targetDuck.student;

      // Tâm ngắm lướt tới khóa chặt chú vịt mục tiêu
      borderHitRef.current = false;
      await animateCrosshairToDuck(targetDuck, 0.42);
      if (abortHuntRef.current) return;

      // Nếu trong trường hợp hy hữu targetDuck bị chạm biên, đổi ngay sang chú vịt an toàn khác
      if (isDuckNearBorder(targetDuck)) {
        const fallbackSafe = getSafeTargetDucks(null).filter((d) => !isDuckNearBorder(d));
        if (fallbackSafe.length > 0) {
          targetDuck = fallbackSafe[0]!;
          await animateCrosshairToDuck(targetDuck, 0.35);
        }
      }

      trackingDuckRef.current = targetDuck;
      soundManager.playClick();
      setHuntingStatus(
        `🎯 KHÓA MỤC TIÊU: ${hideNames ? '???' : targetStudent.name} (${totalVisits}/${totalVisits})!`
      );

      // Tâm ngắm co bóp nhấp nháy đỏ báo hiệu chuẩn bị nổ súng
      await runTween(crosshair.scale, {
        x: 0.72,
        y: 0.72,
        duration: 0.1,
        repeat: 3,
        yoyo: true,
        ease: 'power2.inOut',
      });
      await wait(180);

      if (abortHuntRef.current) return;

      // 3. NỔ SÚNG! (ĐOÀNG!)
      trackingDuckRef.current = null;
      soundManager.playGunshot();

      const shotX = clampCrosshairX(targetDuck.container.x);
      const shotY = clampCrosshairY(targetDuck.container.y - 12);
      if (crosshairRef.current) {
        crosshairRef.current.x = shotX;
        crosshairRef.current.y = shotY;
      }
      spawnMuzzleFlash(root, shotX, shotY);
      spawnFeathers(root, shotX, shotY);

      setHuntingStatus(`🏆 BẮN TRÚNG: ${targetStudent.name}`);
      setWinnerStudent(targetStudent);

      // Hiển thị tên rõ ràng trên thẻ tên của chú vịt và viền vàng rực rỡ
      targetDuck.nameLabel.text = targetStudent.name;
      targetDuck.nameLabel.style.fill = '#92400e';
      targetDuck.tagBg
        .clear()
        .roundRect(-58, 10, 116, 28, 6)
        .fill({ color: 0xfef08a })
        .stroke({ width: 2.5, color: 0xf59e0b });

      // Rung giật màn hình chân thực
      void runTween(root, {
        x: 12,
        y: 8,
        duration: 0.04,
        repeat: 5,
        yoyo: true,
        ease: 'none',
        onComplete: () => {
          root.x = 0;
          root.y = 0;
        },
      });

      // KHÔNG LÀM KHUYẾT VỊT (YÊU CẦU 3):
      // Chú vịt bị trúng đạn: ngửa người ra sau và thụt xuống một chút (như bia cơ học trúng đạn)
      // Vẫn tiếp tục bơi trên ray (container.x vẫn chạy đều theo lane), sau 750ms bật lò xo dựng đứng dậy tiếp tục bơi!
      void runTween(targetDuck.duckBody, {
        rotation: 0.8,
        y: 22,
        duration: 0.22,
        ease: 'power2.out',
      });

      await wait(750);
      if (abortHuntRef.current) return;

      // Chú vịt bật lò xo dựng thẳng đứng dậy (pop back upright), đàn vịt vẫn luôn trọn vẹn, không bị khuyết bất kỳ con nào!
      void runTween(targetDuck.duckBody, {
        rotation: 0,
        y: 0,
        duration: 0.45,
        ease: 'back.out(2.5)',
      });

      // Tắt spotlight mờ dần và phát âm thanh chiến thắng
      void runTween(spotlightSprite, {
        alpha: 0,
        duration: 0.5,
        ease: 'power1.out',
        onStart: () => {
          soundManager.playWinner();
        },
      });

      isHuntingRef.current = false;
      if (onDuckHuntComplete) {
        onDuckHuntComplete(targetStudent);
      }
    },
    [hideNames, onDuckHuntComplete]
  );

  // Kích hoạt khi isPicking chuyển sang true từ bên ngoài
  useEffect(() => {
    if (isPicking && !isHuntingRef.current) {
      if (stageRootRef.current && ducksRef.current.length > 0) {
        void executeHuntSequence('normal');
      } else {
        pendingHuntRef.current = true;
      }
    }
  }, [isPicking, executeHuntSequence]);

  // Tạo hiệu ứng tia lửa nòng súng (Muzzle Flash)
  const spawnMuzzleFlash = (root: Container, x: number, y: number) => {
    const flash = new Graphics();
    flash.zIndex = 90;
    flash.x = x;
    flash.y = y;
    flash.circle(0, 0, 75).fill({ color: 0xfef08a, alpha: 0.95 });
    flash.circle(0, 0, 40).fill({ color: 0xffffff });
    root.addChild(flash);

    gsap.to(flash, {
      alpha: 0,
      scaleX: 2.4,
      scaleY: 2.4,
      duration: 0.25,
      onComplete: () => {
        try {
          if (flash.parent) flash.parent.removeChild(flash);
          flash.destroy();
        } catch {
          // Bỏ qua lỗi dọn dẹp flash
        }
      },
    });
  };

  // Tạo chùm lông vũ văng ra khi trúng đạn
  const spawnFeathers = (root: Container, x: number, y: number) => {
    for (let i = 0; i < 18; i++) {
      const feather = new Graphics();
      feather.zIndex = 80;
      feather.x = x;
      feather.y = y;
      feather.ellipse(0, 0, 9, 4.5).fill({ color: Math.random() > 0.4 ? 0xffe066 : 0xffffff });
      root.addChild(feather);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 90 + 35;

      gsap.to(feather, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 50,
        rotation: Math.random() * 6,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => {
          try {
            if (feather.parent) feather.parent.removeChild(feather);
            feather.destroy();
          } catch {
            // Bỏ qua lỗi dọn dẹp lông vũ
          }
        },
      });
    }
  };

  // Tính toán chiều rộng khung trường bắn theo tỉ lệ 2:1 (1200/600)
  // Cân đối hoàn mỹ giữa màn hình, không bị lệch và không để trống bên phải
  const containerWidthStyle = isFullscreen
    ? { width: 'min(96vw, calc((100vh - 125px) * 2))' }
    : { width: 'min(96vw, 1200px)' };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 mx-auto">
      {/* Khung trường bắn hoàn chỉnh: Header + Canvas khép kín cùng chiều rộng tuyệt đối, căn giữa hoàn hảo */}
      <div
        className="flex flex-col items-center shadow-2xl transition-all mx-auto"
        style={containerWidthStyle}
      >
        {/* 1. Thanh thông tin trạng thái & Tùy chọn (vừa khít 100% với Canvas) */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/95 text-white rounded-t-2xl border-t border-x border-amber-600/40 text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-xs sm:text-sm">
              🎯 TRƯỜNG BẮN HỘI CHỢ
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-200 font-semibold">{huntingStatus}</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-amber-300 transition select-none">
              <input
                type="checkbox"
                checked={hideNames}
                onChange={(e) => setHideNames(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-800 border-slate-600 cursor-pointer"
              />
              <span className="font-medium">Chế độ ẩn (Dấu ?)</span>
            </label>

            <span className="text-slate-300">
              Tổng vịt: <strong className="text-amber-300 font-mono text-sm">{candidates.length}</strong>
            </span>
          </div>
        </div>

        {/* 2. Khung Canvas PixiJS: Phủ kín 100% diện tích, tràn viền không hở mép */}
        <div className="relative w-full aspect-[2/1] rounded-b-2xl overflow-hidden border-b border-x border-amber-600/40 bg-[#1e120c] shadow-2xl">
          <canvas
            ref={canvasRef}
            onClick={() => {
              if (!isHuntingRef.current) {
                if (onTriggerSpin && !isPicking) {
                  onTriggerSpin('normal');
                } else {
                  void executeHuntSequence('normal');
                }
              }
            }}
            style={{ width: '100%', height: '100%', display: 'block' }}
            className="select-none cursor-crosshair"
          />

          {/* Thông báo kết quả nổi bật khi bắn xong (Đúng 100% học sinh của con vịt bị bắn) */}
          {(winnerStudent || (isCompleted && winnerStudent)) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-950/95 border-2 border-amber-400 text-amber-200 px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3.5 backdrop-blur-md animate-bounce z-20">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-amber-400 font-extrabold">
                  Học sinh trúng giải
                </div>
                <div className="text-2xl font-black text-white">
                  {winnerStudent.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Cụm nút bấm điều khiển Bắn Ngẫu Nhiên (nằm ngay sát dưới sân khấu) */}
      {!isHuntingRef.current && !isCompleted && !winnerStudent && (
        <div className="mt-3 sm:mt-4 flex flex-col items-center z-10">
          <div className="inline-flex items-stretch rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all hover:border-amber-300 hover:shadow-amber-500/30">
            {/* Nút quay chính */}
            <button
              type="button"
              onClick={() => {
                if (!isHuntingRef.current) {
                  if (onTriggerSpin && !isPicking) {
                    onTriggerSpin('normal');
                  } else {
                    void executeHuntSequence('normal');
                  }
                }
              }}
              disabled={isHuntingRef.current || candidates.length === 0}
              className="px-8 sm:px-10 py-3.5 font-black text-lg sm:text-xl text-white tracking-wide flex items-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span className="text-2xl">🎯</span>
              <span>BẮN NGẪU NHIÊN</span>
            </button>

            {/* Nút ẩn bí mật mép phải (chọn học sinh học lực tốt) */}
            <button
              type="button"
              onClick={() => {
                if (!isHuntingRef.current) {
                  if (onTriggerSpin && !isPicking) {
                    onTriggerSpin('bias_good');
                  } else {
                    void executeHuntSequence('bias_good');
                  }
                }
              }}
              disabled={isHuntingRef.current || candidates.length === 0}
              title=""
              className="w-10 border-l border-white/20 bg-amber-600/40 hover:bg-amber-600/70 text-amber-100 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 group"
              aria-label="Chọn ngẫu nhiên"
            >
              <span className="text-xs select-none opacity-40 group-hover:opacity-90">✦</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
