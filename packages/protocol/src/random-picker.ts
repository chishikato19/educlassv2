import { z } from 'zod';
import { AcademicPerformanceSchema } from './student.js';

/**
 * Học sinh trong danh sách quay số ngẫu nhiên
 */
export const PickerStudentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  code: z.string().optional(),
  academicPerformance: AcademicPerformanceSchema.default('dat'),
  alreadyCalled: z.boolean().default(false),
  score: z.number().optional(),
  notes: z.string().optional(),
});
export type PickerStudent = z.infer<typeof PickerStudentSchema>;

/**
 * Các chế độ quay ngẫu nhiên được hỗ trợ
 */
export const RandomPickerModeIdSchema = z.enum([
  'random_mode', // Chế độ ngẫu nhiên: mỗi lần lấy ngẫu nhiên 1 trong các chế độ khác
  'card_flip', // Lật thẻ bài (5 lá úp xuống, lật 1 lá)
  'mystery_box', // Hộp quà bí mật (3 hộp quà)
  'slot_machine', // Máy quay số (hàng chục & hàng đơn vị)
  'name_roller', // Cuộn họ tên (1 ô chứa tên, quay chậm dần)
  'balloon_pop', // Bắn bóng bay (chọn bóng nổ ra tên)
  'magic_deck', // Bộ bài ma thuật (xào bài -> lưới 3x3 -> lật 1 lá)
  'duck_race', // Đua vịt (Pixi.js WebGL, 3 kịch bản, vịt đè lên nhau)
  'duck_hunt', // Bắn vịt (Stopwatch Carnival Shooting Gallery, Pixi.js v8 + GSAP)
  'elimination_grid', // Đấu trường sinh tồn (các ô biến mất dần: còn 5 ô -> 3 ô -> 1 ô)
  'ball_elimination', // Dãy bóng số sinh tồn (1 dãy 10 quả bóng 0-9 nổ dần, còn 2 hoặc 1 quả ghép STT)
  'wheel', // Vòng quay may mắn (dự phòng nâng cấp)
  'marble_race', // Đua bi rơi Pinball (rơi liên hoàn qua nhiều chặng chướng ngại vật)
]);
export type RandomPickerModeId = z.infer<typeof RandomPickerModeIdSchema>;

/**
 * Cấu hình tiện ích quay ngẫu nhiên
 */
export const RandomPickerSettingsSchema = z.object({
  mode: RandomPickerModeIdSchema.default('random_mode'),
  correctExp: z.number().int().min(0).max(1000).default(10),
  excludeCalled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  animationDurationMs: z.number().int().min(500).max(10000).default(2000),
});
export type RandomPickerSettings = z.infer<typeof RandomPickerSettingsSchema>;

/**
 * Học sinh trong hàng chờ (chờ lên bảng làm bài xong mới chấm điểm)
 */
export const PickerQueueItemSchema = z.object({
  id: z.string().min(1),
  student: PickerStudentSchema,
  queuedAt: z.number(),
  questionText: z.string().optional(),
});
export type PickerQueueItem = z.infer<typeof PickerQueueItemSchema>;

/**
 * Chiến lược chọn ứng viên khi quay
 */
export type PickerSelectionStrategy = 'normal' | 'bias_good';

/**
 * Thuật toán chọn học sinh từ danh sách ứng viên
 * - 'normal': Chọn hoàn toàn ngẫu nhiên công bằng giữa các học sinh hợp lệ
 * - 'bias_good': Chọn ngẫu nhiên trong nhóm học sinh có học lực tốt ('tot')
 */
export function pickStudentFromCandidates(
  students: PickerStudent[],
  strategy: PickerSelectionStrategy = 'normal',
  excludeCalled = true
): PickerStudent | null {
  if (!students || students.length === 0) return null;

  // Lọc theo trạng thái đã gọi nếu bật loại trừ
  let pool = excludeCalled ? students.filter(s => !s.alreadyCalled) : [...students];

  // Nếu tất cả đã được gọi nhưng vẫn cần quay, tái lập pool từ danh sách ban đầu
  if (pool.length === 0) {
    pool = [...students];
  }

  // Nếu là chế độ ẩn: ưu tiên chọn học sinh có học lực tốt
  if (strategy === 'bias_good') {
    const goodStudents = pool.filter(s => s.academicPerformance === 'tot');
    if (goodStudents.length > 0) {
      const randomIndex = Math.floor(Math.random() * goodStudents.length);
      return goodStudents[randomIndex] ?? null;
    }
    // Nếu trong pool hiện tại không còn 'tot', thử tìm 'kha'
    const fairStudents = pool.filter(s => s.academicPerformance === 'kha');
    if (fairStudents.length > 0) {
      const randomIndex = Math.floor(Math.random() * fairStudents.length);
      return fairStudents[randomIndex] ?? null;
    }
  }

  // Chế độ bình thường: random đều
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? null;
}
