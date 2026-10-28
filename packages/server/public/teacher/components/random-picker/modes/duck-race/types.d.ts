import type { PickerStudent } from '@educlass/protocol';
export type DuckRaceScenario = 'comeback' | 'duel' | 'wire_to_wire' | 'chaos_pack' | 'triple_threat';
export interface DuckRaceScenarioInfo {
    id: DuckRaceScenario;
    name: string;
    description: string;
    badge: string;
}
export declare const DUCK_RACE_SCENARIOS: Record<DuckRaceScenario, DuckRaceScenarioInfo>;
export interface DuckEntity {
    id: string;
    student: PickerStudent;
    displayName: string;
    isTarget: boolean;
    isRival: boolean;
    isRival2?: boolean;
    laneY: number;
    currentX: number;
    currentY: number;
    progress: number;
    speedMultiplier: number;
    bobPhase: number;
    bodyColor: number;
    wingColor: number;
    beakColor: number;
}
//# sourceMappingURL=types.d.ts.map