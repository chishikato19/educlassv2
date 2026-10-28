import type { PickerStudent } from '@educlass/protocol';
import type { DuckEntity, DuckRaceScenario } from './types.js';
export declare const TRACK_START_X = 140;
export declare const TRACK_FINISH_X = 2600;
export declare const TOTAL_TRACK_DISTANCE: number;
/**
 * Xây dựng bản đồ tên rút gọn (chỉ hiển thị TÊN chính của học sinh, ví dụ "An", "Bình", "Cường")
 * Nếu trong lớp có học sinh trùng tên, tự động kèm chữ cái đầu của họ/lót để phân biệt (ví dụ "An (N.)")
 */
export declare function buildStudentDisplayNameMap(students: PickerStudent[]): Map<string, string>;
/**
 * Khởi tạo danh sách các chú vịt cho cuộc đua
 * - Không tô màu đặc biệt cho vịt nhất từ trước (tất cả vịt có màu ngẫu nhiên/tuần tự công bằng)
 * - Tách họ tên, chỉ hiển thị tên ngắn gọn trên đầu vịt
 * - Phân bố làn bơi zíc zắc rộng rãi theo chiều cao sông (580px)
 */
export declare function initializeDuckFlock(students: PickerStudent[], targetStudent: PickerStudent, scenario: DuckRaceScenario, riverHeight: number): DuckEntity[];
/**
 * Tính toán vị trí X của chú vịt theo tiến trình thời gian cuộc đua (0.0 đến 1.0)
 * dựa trên 5 KỊCH BẢN kịch tính khác nhau
 *
 * NGUYÊN TẮC VÀNG:
 * 1. Chuyển động tăng đơn điệu liên tục (vịt luôn bơi tiến lên, không bao giờ dừng khựng lại).
 * 2. Không có bất kỳ chú vịt nào tới vạch đích trước hoặc phải dừng lại đợi vịt nhất!
 * 3. Đàn vịt phân tán tự nhiên dọc theo chiều dài sông (không dồn thành 1 cột dọc đứng)!
 * 4. Chú vịt về nhất chỉ cán đích đầu tiên tại thời điểm p = 1.0, các chú vịt khác bám sát phía sau.
 */
export declare function calculateDuckX(duck: DuckEntity, globalProgress: number, // 0.0 -> 1.0
scenario: DuckRaceScenario): {
    x: number;
    isSpeeding: boolean;
};
//# sourceMappingURL=race-director.d.ts.map