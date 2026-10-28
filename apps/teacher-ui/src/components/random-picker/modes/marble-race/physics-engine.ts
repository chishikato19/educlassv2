import type { PickerStudent } from '@educlass/protocol';
import type {
  MarbleEntity,
  MarbleRaceScenario,
  MarbleRaceTrack,
  SeeSawObstacle,
  VortexObstacle,
  WallSegment,
} from './types.js';
import {
  FINISH_LINE_Y,
  FINISH_NECK_X_LEFT,
  FINISH_NECK_X_RIGHT,
  START_GATE_Y,
  TRACK_HEIGHT,
  TRACK_WIDTH,
} from './track-layout.js';
import { soundManager } from '../../sound.js';

export const SCENARIO_LABELS: Record<
  MarbleRaceScenario,
  { name: string; desc: string; icon: string }
> = {
  wire_to_wire: {
    name: 'Kẻ Thống Trị',
    desc: 'Bứt tốc dẫn đầu từ đầu đến cuối',
    icon: '👑',
  },
  chaos_bottleneck: {
    name: 'Hỗn Chiến Phút Chót',
    desc: 'Chen chúc ngang ngửa đến tận cổ chai',
    icon: '⚡',
  },
  comeback: {
    name: 'Cú Lội Ngược Dòng',
    desc: 'Khởi đầu ở sau, bứt phá chặng cuối',
    icon: '🚀',
  },
  duel: {
    name: 'Song Mã Tranh Hùng',
    desc: '2 viên bi so kè 1 chọi 1 nghẹt thở',
    icon: '⚔️',
  },
};

const MARBLE_PALETTES = [
  { main: '#f43f5e', sec: '#9f1239' }, // Đỏ hồng
  { main: '#3b82f6', sec: '#1e40af' }, // Xanh dương
  { main: '#10b981', sec: '#065f46' }, // Xanh ngọc
  { main: '#f59e0b', sec: '#92400e' }, // Cam vàng
  { main: '#8b5cf6', sec: '#5b21b6' }, // Tím
  { main: '#ec4899', sec: '#9d174d' }, // Hồng sen
  { main: '#06b6d4', sec: '#155e75' }, // Cyan
  { main: '#84cc16', sec: '#3f6212' }, // Xanh chanh
];

/**
 * Trích xuất tên gọi ngắn gọn của học sinh để vẽ lên viên bi
 */
export function getShortDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return 'HS';
  if (parts.length === 1) return parts[0] || 'HS';
  // Lấy từ cuối cùng (tên chính)
  const lastName = parts[parts.length - 1];
  return lastName || 'HS';
}

/**
 * Khởi tạo danh sách các viên bi tại vạch xuất phát
 */
export function initializeMarbles(
  candidates: PickerStudent[],
  targetStudent: PickerStudent | null,
  scenario: MarbleRaceScenario = 'chaos_bottleneck'
): MarbleEntity[] {
  if (candidates.length === 0) return [];

  const marbles: MarbleEntity[] = [];
  const count = candidates.length;
  const cols = Math.min(8, Math.ceil(Math.sqrt(count * 1.8)));
  const cellWidth = (TRACK_WIDTH - 240) / cols;
  const startX = 140;
  const startY = 70;

  // Chọn đối thủ cho kịch bản 'duel'
  const others = candidates.filter(s => s.id !== targetStudent?.id);
  const rivalId = others.length > 0 && scenario === 'duel' ? others[0]?.id : null;

  candidates.forEach((st, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const isTarget = targetStudent !== null && st.id === targetStudent.id;
    const isRival = st.id === rivalId;
    const palette = MARBLE_PALETTES[idx % MARBLE_PALETTES.length] ?? {
      main: '#f43f5e',
      sec: '#9f1239',
    };

    const jitterX = (Math.random() - 0.5) * (cellWidth * 0.3);
    const jitterY = (Math.random() - 0.5) * 12;

    marbles.push({
      id: st.id,
      student: st,
      displayName: getShortDisplayName(st.name),
      x: startX + col * cellWidth + cellWidth / 2 + jitterX,
      y: startY + row * 44 + jitterY,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0,
      radius: 23, // Kích thước bi to 46px dễ nhìn rõ tên
      color: palette.main,
      secondaryColor: palette.sec,
      isTarget,
      isRival,
      rank: idx + 1,
      hasFinished: false,
      finishTime: null,
      trail: [],
    });
  });

  return marbles;
}

/**
 * Va chạm giữa đường tròn (viên bi) và đoạn thẳng (tường chắn)
 */
function resolveMarbleVsWall(m: MarbleEntity, w: WallSegment): boolean {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  const t = Math.max(0, Math.min(1, ((m.x - w.x1) * dx + (m.y - w.y1) * dy) / lenSq));
  const projX = w.x1 + t * dx;
  const projY = w.y1 + t * dy;

  const distDx = m.x - projX;
  const distDy = m.y - projY;
  const distSq = distDx * distDx + distDy * distDy;
  const minDist = m.radius + w.thickness / 2;

  if (distSq < minDist * minDist) {
    const dist = Math.sqrt(distSq) || 0.001;
    const nx = distDx / dist;
    const ny = distDy / dist;

    const overlap = minDist - dist;
    m.x += nx * overlap;
    m.y += ny * overlap;

    const dot = m.vx * nx + m.vy * ny;
    if (dot < 0) {
      m.vx -= 1.62 * dot * nx;
      m.vy -= 1.62 * dot * ny;
    }

    // Nhận diện bức tường là máng trượt nghiêng (Slanted Ramp)
    const isSlantedRamp = Math.abs(dx) > 60 && Math.abs(dy) > 30;
    if (isSlantedRamp) {
      // Vector tiếp tuyến hướng dốc xuống dưới (ty luôn > 0)
      const len = Math.sqrt(lenSq);
      let tx = dx / len;
      let ty = dy / len;
      if (ty < 0) {
        tx = -tx;
        ty = -ty;
      }

      // GIA TỐC MÁNG TRƯỢT TỐC ĐỘ CAO: Đẩy bi lao vùn vụt, không bị hãm phanh
      const slideBoost = 0.58;
      m.vx += tx * slideBoost;
      m.vy += ty * slideBoost;

      // Giữ trọn đà trượt mượt mà (không nhân 0.95 làm nghẽn tốc độ)
      m.vx *= 0.995;
      m.vy *= 0.995;

      // Yếu tố bất ngờ, gay cấn: các viên bi chen chúc trên máng có độ xô lệch nhẹ tạo cơ hội vượt nhau
      if (Math.random() < 0.22) {
        m.vx += (Math.random() - 0.5) * 1.6;
        m.vy += Math.random() * 0.5;
      }
    } else {
      // Tường biên và tường đứng thông thường
      m.vx *= 0.95;
      m.vy *= 0.95;
    }
    return true;
  }
  return false;
}

/**
 * Tương tác vật lý với phễu lốc xoáy (Vortex Whirlpool)
 */
function applyVortexPhysics(m: MarbleEntity, v: VortexObstacle): void {
  const dx = m.x - v.x;
  const dy = m.y - v.y;
  const distSq = dx * dx + dy * dy;

  if (distSq < v.radius * v.radius) {
    const dist = Math.sqrt(distSq) || 0.001;
    const factor = 1 - dist / v.radius;
    // Hút nhẹ về trục X trung tâm
    m.vx -= (dx / dist) * factor * v.pullStrength;
    // Trục Y: luôn có lực đẩy trôi xuống dưới để không bị kẹt trong phễu
    m.vy += factor * 0.18;

    // Lực xoáy tiếp tuyến quanh phễu
    const swirl = factor * v.rotationSpeed * 8;
    m.vx += (-dy / dist) * swirl;
    m.vy += (dx / dist) * swirl * 0.3;
  }
}

/**
 * Tương tác vật lý với cầu bập bênh (See-Saw)
 */
function applySeeSawPhysics(m: MarbleEntity, ss: SeeSawObstacle): void {
  const halfLen = ss.length / 2;
  const cos = Math.cos(ss.angle);
  const sin = Math.sin(ss.angle);

  const x1 = ss.x - cos * halfLen;
  const y1 = ss.y - sin * halfLen;
  const x2 = ss.x + cos * halfLen;
  const y2 = ss.y + sin * halfLen;

  const wall: WallSegment = {
    x1,
    y1,
    x2,
    y2,
    thickness: ss.thickness,
    color: ss.color,
  };

  if (resolveMarbleVsWall(m, wall)) {
    // Bi đè lên một bên làm bập bênh chúi xuống
    const armDistance = m.x - ss.x;
    ss.angularVelocity += armDistance * 0.00015;
  }
}

/**
 * Cập nhật 1 bước mô phỏng vật lý (60 FPS) với tốc độ vừa phải & kịch bản thông minh
 */
export function updateMarblePhysics(
  marbles: MarbleEntity[],
  track: MarbleRaceTrack,
  isGateOpen: boolean,
  now: number,
  soundEnabled: boolean,
  scenario: MarbleRaceScenario = 'chaos_bottleneck'
): { winner: MarbleEntity | null } {
  let firstFinisher: MarbleEntity | null = null;
  // Tốc độ rơi êm ái, vừa mắt để quan sát tên học sinh (0.20 thay vì 0.38)
  const baseGravity = isGateOpen ? 0.2 : 0.015;

  // 1. Cập nhật góc quay các chướng ngại vật động
  track.spinners.forEach(sp => {
    sp.angle += sp.angularVelocity;
  });

  track.vortices.forEach(vt => {
    vt.angle += vt.rotationSpeed;
  });

  track.seeSaws.forEach(ss => {
    ss.angle += ss.angularVelocity;
    ss.angularVelocity *= 0.94; // Giảm chấn
    // Chặn góc nghiêng tối đa
    if (ss.angle > ss.maxAngle) {
      ss.angle = ss.maxAngle;
      ss.angularVelocity = -ss.angularVelocity * 0.3;
    } else if (ss.angle < -ss.maxAngle) {
      ss.angle = -ss.maxAngle;
      ss.angularVelocity = -ss.angularVelocity * 0.3;
    }
  });

  track.bumpers.forEach(bp => {
    if (bp.pulseScale > 1) {
      bp.pulseScale = Math.max(1, bp.pulseScale - 0.035);
    }
  });

  // Tìm vị trí dẫn đầu hiện tại để áp dụng kịch bản
  const currentLeadY = marbles.reduce((max, m) => (!m.hasFinished ? Math.max(max, m.y) : max), 0);

  // 2. Cập nhật từng viên bi
  marbles.forEach(m => {
    // Nếu chưa mở cổng xuất phát
    if (!isGateOpen) {
      m.vy += baseGravity;
      m.y += m.vy;
      m.x += m.vx;
      m.vx *= 0.9;
      m.vy *= 0.9;

      if (m.y + m.radius > START_GATE_Y) {
        m.y = START_GATE_Y - m.radius;
        m.vy = -m.vy * 0.3;
      }
      return;
    }

    // Nếu đã về đích
    if (m.hasFinished) {
      m.vy += 0.15;
      m.vy = Math.min(m.vy, 3);
      m.y += m.vy;
      m.x += m.vx;
      m.vx *= 0.85;

      if (m.y + m.radius > TRACK_HEIGHT - 35) {
        m.y = TRACK_HEIGHT - 35 - m.radius;
        m.vy = 0;
        m.vx = 0;
      }
      return;
    }

    // ==========================================
    // ĐIỀU PHỐI KỊCH BẢN ĐUA THEO TIẾN ĐỘ (Y)
    // ==========================================
    let marbleGravity = baseGravity;

    switch (scenario) {
      // Kịch bản 1: KẺ THỐNG TRỊ (Wire-to-Wire)
      case 'wire_to_wire': {
        if (m.isTarget) {
          marbleGravity += 0.035; // Lướt nhanh hơn đều đặn
          m.vx *= 0.996;
        } else {
          marbleGravity -= 0.01; // Cả đàn bám sát phía sau
        }
        break;
      }

      // Kịch bản 2: HỖN CHIẾN PHÚT CHÓT (Chaos Bottleneck)
      case 'chaos_bottleneck': {
        // Cả nhóm 5-8 viên bi dẫn đầu giữ tốc độ so kè ngang ngửa
        if (m.y < 4300) {
          const leadDiff = currentLeadY - m.y;
          if (leadDiff > 70) {
            marbleGravity += 0.025; // Kéo nhóm bám đuổi lên gần
          } else if (leadDiff < 10) {
            marbleGravity -= 0.01;
          }
        } else {
          // Đến phễu cổ chai (Y > 4300): Target bứt lên ở đoạn cuối
          if (m.isTarget) {
            marbleGravity += 0.06;
          }
        }
        break;
      }

      // Kịch bản 3: CÚ LỘI NGƯỢC DÒNG (Comeback)
      case 'comeback': {
        if (m.isTarget) {
          if (m.y < 2800) {
            // Chặng 1-4: chạy ở nhóm giữa
            marbleGravity -= 0.02;
          } else {
            // Chặng 5-7: bứt tốc ngoạn mục vượt lên
            marbleGravity += 0.08;
          }
        }
        break;
      }

      // Kịch bản 4: SONG MÃ TRANH HÙNG (Duel)
      case 'duel': {
        if (m.isTarget || m.isRival) {
          marbleGravity += 0.03; // 2 viên bi cùng bứt phá
          // Dao động hoán đổi vị trí qua lại
          const swing = Math.sin(m.y * 0.008) * 0.02;
          if (m.isTarget) {
            marbleGravity += swing;
          } else {
            marbleGravity -= swing;
          }

          // Đoạn cuối cùng (Y > 4400): Target rướn lên thắng
          if (m.y > 4400 && m.isTarget) {
            marbleGravity += 0.05;
          }
        }
        break;
      }
    }

    // Áp dụng trọng lực & lực cản không khí nhẹ nhàng
    m.vy += marbleGravity;
    m.vx *= 0.992;
    m.vy *= 0.994;

    // Giới hạn tốc độ tối đa hài hòa, mở rộng đột biến khi kích hoạt Turbo Boost
    const isTurboActive = Boolean(m.turboUntil && m.turboUntil > now);
    const maxVx = isTurboActive ? 13.5 : 9.0;
    const maxVy = isTurboActive ? 14.0 : 9.2;

    m.vx = Math.max(-maxVx, Math.min(maxVx, m.vx));
    m.vy = Math.max(-6, Math.min(maxVy, m.vy));

    // Cập nhật tọa độ
    m.x += m.vx;
    m.y += m.vy;

    // Lưu vết đường bay (trail) - kéo dài và rực rỡ hơn khi đang bứt tốc Turbo
    const isFast = Math.abs(m.vx) > 2.5 || Math.abs(m.vy) > 4.5 || isTurboActive;
    if (isFast) {
      m.trail.push({ x: m.x, y: m.y, alpha: isTurboActive ? 0.95 : 0.5 });
      const maxTrail = isTurboActive ? 9 : 5;
      if (m.trail.length > maxTrail) m.trail.shift();
    } else if (m.trail.length > 0) {
      m.trail.shift();
    }

    // 1. Tương tác với Tường
    track.walls.forEach(w => {
      resolveMarbleVsWall(m, w);
    });

    // 2. Tương tác với Đinh cản Pachinko
    track.pegs.forEach(peg => {
      const dx = m.x - peg.x;
      const dy = m.y - peg.y;
      const distSq = dx * dx + dy * dy;
      const minDist = m.radius + peg.radius;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;

        m.x = peg.x + nx * minDist;
        m.y = peg.y + ny * minDist;

        const dot = m.vx * nx + m.vy * ny;
        if (dot < 0) {
          m.vx -= 1.6 * dot * nx;
          m.vy -= 1.6 * dot * ny;
          m.vx += (Math.random() - 0.5) * 1.4;
        }

        peg.lastHitTime = now;
        if (soundEnabled) {
          soundManager.playMarblePegBounce();
        }
      }
    });

    // 3. Tương tác với Phễu lốc xoáy (Chặng 2 mới)
    track.vortices.forEach(vt => {
      applyVortexPhysics(m, vt);
    });

    // 4. Tương tác với Nấm nảy Pinball (Bumpers)
    track.bumpers.forEach(bp => {
      const dx = m.x - bp.x;
      const dy = m.y - bp.y;
      const distSq = dx * dx + dy * dy;
      const minDist = m.radius + bp.radius;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;

        m.x = bp.x + nx * (minDist + 2);
        m.y = bp.y + ny * (minDist + 2);

        // Nấm lò xo hất văng có kiểm soát
        const impulse = 8.5;
        m.vx = nx * impulse + (Math.random() - 0.5) * 1.5;
        m.vy = ny * impulse - 1.5;

        bp.pulseScale = 1.38;
        bp.lastHitTime = now;
        if (soundEnabled) {
          soundManager.playPinballBumper();
        }
      }
    });

    // 5. Tương tác với Cánh quạt xoay (Spinners)
    track.spinners.forEach(sp => {
      const armCount = 4;
      for (let i = 0; i < armCount; i++) {
        const armAngle = sp.angle + (i * Math.PI) / 2;
        const x2 = sp.x + Math.cos(armAngle) * sp.armLength;
        const y2 = sp.y + Math.sin(armAngle) * sp.armLength;

        const wall: WallSegment = {
          x1: sp.x,
          y1: sp.y,
          x2,
          y2,
          thickness: 10,
          color: '#ffffff',
        };

        if (resolveMarbleVsWall(m, wall)) {
          const tanVx = -Math.sin(armAngle) * sp.angularVelocity * 100;
          const tanVy = Math.cos(armAngle) * sp.angularVelocity * 100;
          m.vx += tanVx * 0.35;
          m.vy += tanVy * 0.35;
        }
      }
    });

    // 6. Tương tác với Cầu bập bênh (Chặng 4 mới)
    track.seeSaws.forEach(ss => {
      applySeeSawPhysics(m, ss);
    });

    // 7. Tương tác với Vạch tăng tốc Turbo Neon (Turbo Boost Pads)
    if (track.turboPads) {
      track.turboPads.forEach(pad => {
        const dx = m.x - pad.x;
        const dy = m.y - pad.y;
        const distSq = dx * dx + dy * dy;
        const triggerDist = m.radius + pad.length * 0.45;

        if (distSq < triggerDist * triggerDist) {
          // Tính vector hướng tăng tốc theo góc nghiêng của vạch
          const tx = Math.cos(pad.angle);
          const ty = Math.sin(pad.angle);

          // Cú hích gia tốc mạnh mẽ dọc theo chiều dốc
          const boost = 5.2 * pad.boostMultiplier;
          m.vx = tx * boost + (Math.random() - 0.5) * 1.5;
          m.vy = Math.max(m.vy, ty * boost);

          m.turboUntil = now + 480; // Kích hoạt trạng thái Turbo 480ms

          if (!pad.lastHitTime || now - pad.lastHitTime > 120) {
            pad.lastHitTime = now;
            if (soundEnabled) {
              soundManager.playTurboBoost();
            }
          }
        }
      });
    }

    // 7. Định hướng vào cổ chai về đích (Chặng 7)
    if (m.isTarget && m.y > 4250) {
      const targetCenter = (FINISH_NECK_X_LEFT + FINISH_NECK_X_RIGHT) / 2;
      const pullForce = (targetCenter - m.x) * 0.025;
      m.vx += pullForce;

      if (m.y > 4500 && m.y < FINISH_LINE_Y) {
        m.vy += 0.25;
      }
    }

    // 8. Cán vạch đích
    if (m.y >= FINISH_LINE_Y && !m.hasFinished) {
      m.hasFinished = true;
      m.finishTime = now;

      const alreadyFinishedCount = marbles.filter(item => item.hasFinished).length;
      m.rank = alreadyFinishedCount;

      if (alreadyFinishedCount === 1) {
        firstFinisher = m;
      }
    }
  });

  // Cập nhật thứ hạng hiện tại
  const sorted = [...marbles].sort((a, b) => {
    if (a.hasFinished && b.hasFinished) {
      return (a.finishTime || 0) - (b.finishTime || 0);
    }
    if (a.hasFinished) return -1;
    if (b.hasFinished) return 1;
    return b.y - a.y;
  });

  sorted.forEach((m, idx) => {
    if (!m.hasFinished) {
      m.rank = idx + 1;
    }
  });

  return { winner: firstFinisher };
}
