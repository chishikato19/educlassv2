import type {
  ActiveEffect,
  CombatEvent,
  PowerUpInventory,
  PowerUpItem,
  PowerUpType,
} from '@educlass/protocol';
import { createPowerUpItem } from './powerup-registry.js';

const ALL_POWERUP_TYPES: PowerUpType[] = [
  'shield',
  'reflect_shield',
  'double_points',
  'eraser_5050',
  'freeze',
  'smoke',
  'drain',
];

/**
 * Khởi tạo túi đồ rỗng
 */
export function createEmptyInventory(maxCapacity: number = 2): PowerUpInventory {
  return {
    maxCapacity: Math.max(1, Math.min(maxCapacity, 5)),
    queue: [],
  };
}

/**
 * Kiểm tra và tặng vật phẩm ngẫu nhiên khi đạt điều kiện streak
 * @param condition: 1 (đúng 1 câu là tặng) hoặc 2 (cứ đúng 2 câu liên tiếp là tặng)
 */
export function grantPowerUp(
  inventory: PowerUpInventory,
  streakCount: number,
  condition: 1 | 2 = 2,
  rng: () => number = Math.random
): { inventory: PowerUpInventory; grantedItem?: PowerUpItem | undefined } {
  // Điều kiện tặng: streak > 0 và chia hết cho condition
  if (streakCount <= 0 || streakCount % condition !== 0) {
    return { inventory };
  }

  // Nếu túi đồ đã đầy theo sức chứa
  if (inventory.queue.length >= inventory.maxCapacity) {
    return { inventory };
  }

  // Chọn ngẫu nhiên 1 trong các loại vật phẩm
  const randomIndex = Math.floor(rng() * ALL_POWERUP_TYPES.length);
  const selectedType = ALL_POWERUP_TYPES[randomIndex] ?? 'shield';
  const newItem = createPowerUpItem(selectedType);

  return {
    inventory: {
      ...inventory,
      queue: [...inventory.queue, newItem],
    },
    grantedItem: newItem,
  };
}

/**
 * Lấy ra vật phẩm đầu tiên trong hàng đợi (FIFO) để kích hoạt
 */
export function popNextPowerUp(
  inventory: PowerUpInventory
): { inventory: PowerUpInventory; nextItem?: PowerUpItem | undefined } {
  if (inventory.queue.length === 0) {
    return { inventory };
  }

  const firstItem = inventory.queue[0];
  if (!firstItem) {
    return { inventory };
  }

  return {
    inventory: {
      ...inventory,
      queue: inventory.queue.slice(1),
    },
    nextItem: firstItem,
  };
}

/**
 * Xóa các hiệu ứng đã hết hạn thời gian
 */
export function cleanupExpiredEffects(
  activeEffects: ActiveEffect[],
  now: number = Date.now()
): ActiveEffect[] {
  return activeEffects.filter(eff => {
    if (!eff.expiresAt) return true;
    return eff.expiresAt > now;
  });
}

/**
 * Kiểm tra xem người chơi có đang được bảo vệ bởi Khiên (Khiên Hộ Thể hoặc Khiên Phản Đòn) không
 */
export function hasActiveShield(activeEffects: ActiveEffect[], now: number = Date.now()): boolean {
  const validEffects = cleanupExpiredEffects(activeEffects, now);
  return validEffects.some(
    eff => eff.powerUpType === 'shield' || eff.powerUpType === 'reflect_shield'
  );
}

/**
 * Kiểm tra riêng xem có đang bật Khiên Phản Đòn không
 */
export function hasActiveReflectShield(
  activeEffects: ActiveEffect[],
  now: number = Date.now()
): boolean {
  const validEffects = cleanupExpiredEffects(activeEffects, now);
  return validEffects.some(eff => eff.powerUpType === 'reflect_shield');
}

/**
 * Xử lý khi bị đối thủ tấn công (Đóng băng, Bom khói, Hút điểm)
 * Ưu tiên 1: Nếu người bị hại có Khiên Phản Đòn -> Dội ngược đòn đánh về chính kẻ tấn công!
 * Ưu tiên 2: Nếu người bị hại có Khiên Hộ Thể -> Chặn đứng đòn đánh và vỡ khiên
 * Không có khiên: Đòn đánh trúng đích
 */
export function resolveAttackWithShield(params: {
  attackerName: string;
  defenderName: string;
  item: PowerUpItem;
  defenderActiveEffects: ActiveEffect[];
  now?: number;
}): {
  blocked: boolean;
  reflected: boolean;
  newDefenderEffects: ActiveEffect[];
  attackerPenaltyEffect?: ActiveEffect | undefined;
  combatEvent: CombatEvent;
} {
  const now = params.now ?? Date.now();
  const currentEffects = cleanupExpiredEffects(params.defenderActiveEffects, now);
  const reflectIndex = currentEffects.findIndex(eff => eff.powerUpType === 'reflect_shield');
  const shieldIndex = currentEffects.findIndex(eff => eff.powerUpType === 'shield');

  const durationMs = params.item.durationMs ?? (params.item.type === 'freeze' ? 2000 : 3000);

  // TRƯỜNG HỢP 1: KHIÊN PHẢN ĐÒN 🪞 DỘI NGƯỢC ĐÒN ĐÁNH!
  if (reflectIndex !== -1) {
    const newDefenderEffects = currentEffects.filter((_, idx) => idx !== reflectIndex);
    const attackerPenaltyEffect: ActiveEffect = {
      powerUpType: params.item.type,
      activatedAt: now,
      expiresAt: now + durationMs,
      fromName: params.defenderName,
    };

    const combatEvent: CombatEvent = {
      id: `combat_${now}_${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      sourceName: params.defenderName,
      targetName: params.attackerName,
      powerUpType: params.item.type,
      blocked: true,
      reflected: true,
      message: `🪞 [Khiên Phản Đòn] của ${params.defenderName} đã dội ngược [${params.item.name}] về ${params.attackerName}!`,
    };

    return {
      blocked: true,
      reflected: true,
      newDefenderEffects,
      attackerPenaltyEffect,
      combatEvent,
    };
  }

  // TRƯỜNG HỢP 2: KHIÊN HỘ THỂ 🛡️ CHẶN ĐỨNG ĐÒN ĐÁNH
  if (shieldIndex !== -1) {
    const newDefenderEffects = currentEffects.filter((_, idx) => idx !== shieldIndex);
    const combatEvent: CombatEvent = {
      id: `combat_${now}_${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      sourceName: params.attackerName,
      targetName: params.defenderName,
      powerUpType: params.item.type,
      blocked: true,
      reflected: false,
      message: `🛡️ [Khiên Hộ Thể] của ${params.defenderName} đã chặn đứng đòn [${params.item.name}] từ ${params.attackerName}!`,
    };

    return {
      blocked: true,
      reflected: false,
      newDefenderEffects,
      combatEvent,
    };
  }

  // TRƯỜNG HỢP 3: Đòn tấn công trúng đích
  const newEffect: ActiveEffect = {
    powerUpType: params.item.type,
    activatedAt: now,
    expiresAt: now + durationMs,
    fromName: params.attackerName,
  };

  const combatEvent: CombatEvent = {
    id: `combat_${now}_${Math.floor(Math.random() * 1000)}`,
    timestamp: now,
    sourceName: params.attackerName,
    targetName: params.defenderName,
    powerUpType: params.item.type,
    blocked: false,
    reflected: false,
    message: `${params.item.icon} ${params.attackerName} đã phóng [${params.item.name}] lên ${params.defenderName}!`,
  };

  return {
    blocked: false,
    reflected: false,
    newDefenderEffects: [...currentEffects, newEffect],
    combatEvent,
  };
}

/**
 * Áp dụng bổ trợ điểm số (ví dụ: Sấm sét x2)
 */
export function applyScoreModifiers(
  basePoints: number,
  activeEffects: ActiveEffect[],
  now: number = Date.now()
): {
  finalPoints: number;
  isDouble: boolean;
  remainingEffects: ActiveEffect[];
} {
  const currentEffects = cleanupExpiredEffects(activeEffects, now);
  const doubleIndex = currentEffects.findIndex(eff => eff.powerUpType === 'double_points');

  if (doubleIndex !== -1) {
    // Sử dụng x2 điểm cho câu này rồi tiêu thụ hiệu ứng
    const remainingEffects = currentEffects.filter((_, idx) => idx !== doubleIndex);
    return {
      finalPoints: basePoints * 2,
      isDouble: true,
      remainingEffects,
    };
  }

  return {
    finalPoints: basePoints,
    isDouble: false,
    remainingEffects: currentEffects,
  };
}

/**
 * Kiểm tra xem người chơi có đang bị đóng băng không
 */
export function isPlayerFrozen(
  activeEffects: ActiveEffect[],
  now: number = Date.now()
): { frozen: boolean; remainingMs: number } {
  const currentEffects = cleanupExpiredEffects(activeEffects, now);
  const freezeEffect = currentEffects.find(eff => eff.powerUpType === 'freeze');

  if (!freezeEffect || !freezeEffect.expiresAt || freezeEffect.expiresAt <= now) {
    return { frozen: false, remainingMs: 0 };
  }

  return {
    frozen: true,
    remainingMs: freezeEffect.expiresAt - now,
  };
}

/**
 * Kiểm tra xem người chơi có đang bị phủ khói không
 */
export function isPlayerSmoked(
  activeEffects: ActiveEffect[],
  now: number = Date.now()
): { smoked: boolean; remainingMs: number } {
  const currentEffects = cleanupExpiredEffects(activeEffects, now);
  const smokeEffect = currentEffects.find(eff => eff.powerUpType === 'smoke');

  if (!smokeEffect || !smokeEffect.expiresAt || smokeEffect.expiresAt <= now) {
    return { smoked: false, remainingMs: 0 };
  }

  return {
    smoked: true,
    remainingMs: smokeEffect.expiresAt - now,
  };
}
