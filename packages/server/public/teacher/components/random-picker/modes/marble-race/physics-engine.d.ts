import type { PickerStudent } from '@educlass/protocol';
import type { MarbleEntity, MarbleRaceScenario, MarbleRaceTrack } from './types.js';
export declare const SCENARIO_LABELS: Record<MarbleRaceScenario, {
    name: string;
    desc: string;
    icon: string;
}>;
/**
 * Trích xuất tên gọi ngắn gọn của học sinh để vẽ lên viên bi
 */
export declare function getShortDisplayName(fullName: string): string;
/**
 * Khởi tạo danh sách các viên bi tại vạch xuất phát
 */
export declare function initializeMarbles(candidates: PickerStudent[], targetStudent: PickerStudent | null, scenario?: MarbleRaceScenario): MarbleEntity[];
/**
 * Cập nhật 1 bước mô phỏng vật lý (60 FPS) với tốc độ vừa phải & kịch bản thông minh
 */
export declare function updateMarblePhysics(marbles: MarbleEntity[], track: MarbleRaceTrack, isGateOpen: boolean, now: number, soundEnabled: boolean, scenario?: MarbleRaceScenario): {
    winner: MarbleEntity | null;
};
//# sourceMappingURL=physics-engine.d.ts.map