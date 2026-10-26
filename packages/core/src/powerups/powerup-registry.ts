import type { PowerUpItem, PowerUpType } from '@educlass/protocol';

/**
 * Danh mục 6 vật phẩm chuẩn hóa trong hệ thống EduClass
 */
export const CORE_POWER_UPS: Record<PowerUpType, Omit<PowerUpItem, 'id'>> = {
  shield: {
    type: 'shield',
    name: 'Khiên Hộ Thể',
    icon: '🛡️',
    description: 'Bảo vệ bản thân, chặn đứng 1 đòn tấn công bất kỳ từ đối thủ (45 giây hoặc 1 lần bị tấn công)',
    targetScope: 'self',
    durationMs: 45000, // 45 giây
  },
  reflect_shield: {
    type: 'reflect_shield',
    name: 'Khiên Phản Đòn',
    icon: '🪞',
    description: 'Bảo vệ bản thân, chặn đứng và dội ngược đòn tấn công về kẻ xuất chiêu (45 giây hoặc 1 lần bị tấn công)',
    targetScope: 'self',
    durationMs: 45000, // 45 giây
  },
  double_points: {
    type: 'double_points',
    name: 'Sấm Sét x2',
    icon: '⚡',
    description: 'Nhận gấp đôi số điểm nếu trả lời đúng câu tiếp theo',
    targetScope: 'self',
    durationMs: 12000,
  },
  eraser_5050: {
    type: 'eraser_5050',
    name: 'Kính Soi 50/50',
    icon: '🎯',
    description: 'Loại bỏ ngay 2 phương án sai, chỉ còn 2 lựa chọn',
    targetScope: 'self',
  },
  freeze: {
    type: 'freeze',
    name: 'Đóng Băng',
    icon: '❄️',
    description: 'Khóa thao tác và bàn phím của đối thủ trong 2 giây',
    targetScope: 'opponent',
    durationMs: 2000,
  },
  smoke: {
    type: 'smoke',
    name: 'Bom Khói',
    icon: '🌫️',
    description: 'Thả khói che mờ 60% màn hình đối thủ trong 3 giây',
    targetScope: 'opponent',
    durationMs: 3000,
  },
  drain: {
    type: 'drain',
    name: 'Nam Châm Hút Điểm',
    icon: '🧲',
    description: 'Hút trực tiếp 100 điểm từ đối thủ chuyển sang cho đội mình',
    targetScope: 'opponent',
  },
};

/**
 * Tạo một vật phẩm cụ thể với ID duy nhất
 */
export function createPowerUpItem(type: PowerUpType, customId?: string): PowerUpItem {
  const meta = CORE_POWER_UPS[type];
  const id = customId ?? `item_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return {
    id,
    ...meta,
  };
}
