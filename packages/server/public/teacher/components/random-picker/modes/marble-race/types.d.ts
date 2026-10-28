import type { PickerStudent } from '@educlass/protocol';
export type MarbleRaceScenario = 'chaos_bottleneck' | 'wire_to_wire' | 'comeback' | 'duel';
export interface MarbleEntity {
    id: string;
    student: PickerStudent;
    displayName: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    secondaryColor: string;
    isTarget: boolean;
    isRival?: boolean;
    rank: number;
    hasFinished: boolean;
    finishTime: number | null;
    trail: Array<{
        x: number;
        y: number;
        alpha: number;
    }>;
    turboUntil?: number;
}
export interface PegObstacle {
    x: number;
    y: number;
    radius: number;
    glowColor?: string;
    lastHitTime?: number;
}
export interface BumperObstacle {
    x: number;
    y: number;
    radius: number;
    color: string;
    pulseScale: number;
    lastHitTime?: number;
}
export interface SpinnerObstacle {
    x: number;
    y: number;
    armLength: number;
    angle: number;
    angularVelocity: number;
}
export interface VortexObstacle {
    x: number;
    y: number;
    radius: number;
    pullStrength: number;
    rotationSpeed: number;
    angle: number;
    color: string;
}
export interface SeeSawObstacle {
    x: number;
    y: number;
    length: number;
    thickness: number;
    angle: number;
    angularVelocity: number;
    maxAngle: number;
    color: string;
}
export interface TurboPadObstacle {
    id: string;
    x: number;
    y: number;
    length: number;
    thickness: number;
    angle: number;
    color: string;
    glowColor: string;
    boostMultiplier: number;
    lastHitTime?: number;
}
export interface WallSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness: number;
    color: string;
}
export interface MarbleRaceTrack {
    width: number;
    height: number;
    startGateY: number;
    finishLineY: number;
    pegs: PegObstacle[];
    bumpers: BumperObstacle[];
    spinners: SpinnerObstacle[];
    vortices: VortexObstacle[];
    seeSaws: SeeSawObstacle[];
    walls: WallSegment[];
    turboPads: TurboPadObstacle[];
}
export interface StageMarker {
    y: number;
    label: string;
    color: string;
}
export interface MarbleMapTheme {
    bgGradient: [string, string, string];
    gridColor: string;
    wallColor: string;
    accentColor: string;
}
export type MarbleMapId = 'neon_pinball' | 'gear_canyon';
export interface MarbleMapDefinition {
    id: MarbleMapId;
    name: string;
    icon: string;
    subtitle: string;
    theme: MarbleMapTheme;
    stages: StageMarker[];
    buildTrack: () => MarbleRaceTrack;
}
//# sourceMappingURL=types.d.ts.map