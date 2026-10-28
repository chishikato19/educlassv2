import type { MarbleMapDefinition, MarbleMapId, MarbleRaceTrack } from './types.js';
export declare const TRACK_WIDTH = 900;
export declare const TRACK_HEIGHT = 5000;
export declare const START_GATE_Y = 220;
export declare const FINISH_LINE_Y = 4780;
export declare const FINISH_NECK_X_LEFT = 390;
export declare const FINISH_NECK_X_RIGHT = 510;
/**
 * BẢN ĐỒ 1: VƯƠNG QUỐC PINBALL (NEON ARCADE)
 * Đặc trưng: Rừng đinh Pachinko, Phễu lốc xoáy đôi, Nấm nảy & Cánh quạt, Cầu bập bênh liên hoàn, Slalom, Máng trượt zíc-zắc
 */
export declare function buildNeonPinballTrack(): MarbleRaceTrack;
/**
 * BẢN ĐỒ 2: HẺM NÚI BÁNH RĂNG (GEAR CANYON - CƠ KHÍ STEAMPUNK)
 * Đặc trưng: Máng Slalom đan chéo, Bánh răng khổng lồ, Rừng đinh Kim Cương đồng thau, Bộ ba Tuabin lốc xoáy, Cầu bập bênh đôi, Ma trận Nấm nảy liên hoàn
 */
export declare function buildGearCanyonTrack(): MarbleRaceTrack;
/**
 * ĐỊNH NGHĨA DANH SÁCH BẢN ĐỒ VÀ THÔNG SỐ ĐỒ HỌA
 */
export declare const MAP_DEFINITIONS: Record<MarbleMapId, MarbleMapDefinition>;
export declare const MARBLE_MAP_LIST: MarbleMapDefinition[];
/**
 * Lấy ngẫu nhiên một bản đồ từ danh sách
 */
export declare function getRandomMarbleMap(): MarbleMapDefinition;
/**
 * Lấy bản đồ theo ID cụ thể
 */
export declare function getMarbleMapById(id: MarbleMapId): MarbleMapDefinition;
/**
 * Hàm dựng track tương thích ngược
 */
export declare function buildMarbleTrack(mapId?: MarbleMapId): MarbleRaceTrack;
//# sourceMappingURL=track-layout.d.ts.map