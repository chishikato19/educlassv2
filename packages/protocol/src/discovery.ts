import { z } from 'zod';

/**
 * Cổng phát sóng UDP mặc định cho tính năng Discovery mạng LAN
 */
export const DEFAULT_DISCOVERY_PORT = 54321;

/**
 * Loại thông điệp phát sóng tìm kiếm / đánh thức trong mạng LAN (UDP Beacon)
 * - SESSION_OPEN: Bắn liên tục khi giáo viên vừa bấm mở phiên
 * - SESSION_HEARTBEAT: Bắn định kỳ để máy bật sau/vào muộn tự động bắt được phiên
 * - SESSION_CLOSED: Bắn khi giáo viên kết thúc phiên để máy học sinh tự đóng cửa sổ
 */
export const DiscoveryBeaconTypeSchema = z.enum([
  'SESSION_OPEN',
  'SESSION_HEARTBEAT',
  'SESSION_CLOSED',
]);
export type DiscoveryBeaconType = z.infer<typeof DiscoveryBeaconTypeSchema>;

/**
 * Cấu trúc gói tin UDP Beacon phát sóng trong mạng nội bộ LAN
 */
export const DiscoveryBeaconPayloadSchema = z.object({
  v: z.literal(1),
  type: DiscoveryBeaconTypeSchema,
  sessionId: z.string(),
  joinCode: z.string(),
  serverUrl: z.string().url(),
  teacherName: z.string().optional(),
  className: z.string().nullable().optional(),
  currentActivityId: z.string().nullable().optional(),
  activityRunId: z.string().nullable().optional(),
  timestamp: z.number(),
});
export type DiscoveryBeaconPayload = z.infer<typeof DiscoveryBeaconPayloadSchema>;
