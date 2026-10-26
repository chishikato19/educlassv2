import { z } from 'zod';

/**
 * 6 loại vật phẩm tinh hoa trong hệ thống EduClass
 */
export const PowerUpTypeSchema = z.enum([
  'shield',         // 🛡️ Khiên Hộ Thể (Chặn đòn tấn công đối thủ trong 45s)
  'reflect_shield', // 🪞 Khiên Phản Đòn (Chặn và dội ngược đòn tấn công trong 45s)
  'double_points',  // ⚡ Sấm Sét x2 (Nhân đôi điểm câu tiếp theo)
  'eraser_5050',    // 🎯 Kính Soi 50/50 (Ẩn 2 đáp án sai)
  'freeze',         // ❄️ Đóng Băng (Khóa thao tác đối thủ trong 2s)
  'smoke',          // 🌫️ Bom Khói (Che mờ màn hình đối thủ trong 3s)
  'drain',          // 🧲 Nam Châm Hút Điểm (Cướp 100 điểm từ đối thủ)
]);
export type PowerUpType = z.infer<typeof PowerUpTypeSchema>;

/**
 * 5 phạm vi tác động của vật phẩm (tái sử dụng từ 1vs1 đến toàn lớp Quizizz)
 */
export const TargetScopeSchema = z.enum([
  'self',          // Tác động bản thân (Khiên, x2 điểm, 50/50)
  'opponent',      // Đối thủ trực tiếp (Đối kháng 1vs1)
  'leader',        // Người đang dẫn đầu bảng xếp hạng
  'neighbors',     // Những người xếp hạng xung quanh (ngay trên, ngay dưới)
  'all_opponents', // Toàn bộ đối thủ trong phòng
]);
export type TargetScope = z.infer<typeof TargetScopeSchema>;

/**
 * Định nghĩa một vật phẩm cụ thể
 */
export const PowerUpItemSchema = z.object({
  id: z.string(),
  type: PowerUpTypeSchema,
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  targetScope: TargetScopeSchema,
  durationMs: z.number().optional(),
});
export type PowerUpItem = z.infer<typeof PowerUpItemSchema>;

/**
 * Hiệu ứng đang tác động lên người chơi
 */
export const ActiveEffectSchema = z.object({
  powerUpType: PowerUpTypeSchema,
  activatedAt: z.number(),
  expiresAt: z.number().optional(),
  fromName: z.string().optional(),
});
export type ActiveEffect = z.infer<typeof ActiveEffectSchema>;

/**
 * Túi đồ của người chơi / đội chơi (Hàng đợi FIFO)
 */
export const PowerUpInventorySchema = z.object({
  maxCapacity: z.number().int().min(1).max(5).default(2),
  queue: z.array(PowerUpItemSchema),
});
export type PowerUpInventory = z.infer<typeof PowerUpInventorySchema>;

/**
 * Bản tin chiến sự khi một vật phẩm được kích hoạt
 */
export const CombatEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sourceName: z.string(),
  targetName: z.string(),
  powerUpType: PowerUpTypeSchema,
  blocked: z.boolean(),
  reflected: z.boolean().optional(),
  message: z.string(),
});
export type CombatEvent = z.infer<typeof CombatEventSchema>;

/**
 * Thông báo chiến sự cá nhân hiển thị ở thanh dưới cùng màn hình người chơi
 */
export const PersonalCombatNotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: z.enum(['info', 'attack', 'defense', 'reflected']),
  timestamp: z.number(),
});
export type PersonalCombatNotification = z.infer<typeof PersonalCombatNotificationSchema>;
