import { Container } from 'pixi.js';
import type { DuckEntity } from './types.js';
export declare const DUCK_PALETTES: {
    body: number;
    wing: number;
    beak: number;
}[];
export interface DuckDisplayNode {
    container: Container;
    update: (x: number, y: number, wobble: number, isSpeeding: boolean) => void;
    setTargetGlow: (active: boolean) => void;
    entity: DuckEntity;
}
/**
 * Tạo một chú vịt cao su kèm biển tên học sinh hiển thị trên Pixi.js
 */
export declare function createDuckDisplayNode(entity: DuckEntity): DuckDisplayNode;
//# sourceMappingURL=duck-graphics.d.ts.map