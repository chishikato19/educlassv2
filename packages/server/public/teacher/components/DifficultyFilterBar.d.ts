import React from 'react';
import type { DifficultyLevel, MatrixCounts } from '@educlass/protocol';
export interface DifficultyBadgeInfo {
    key: DifficultyLevel;
    label: string;
    shortLabel: string;
    shapeIcon: string;
    badgeClass: string;
    activeBtnClass: string;
    inactiveBtnClass: string;
}
export declare const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyBadgeInfo>;
export declare function getDifficultyBadgeInfo(diff: DifficultyLevel): DifficultyBadgeInfo;
export interface DifficultyFilterBarProps {
    selectedDifficulty: DifficultyLevel | 'all';
    onSelectDifficulty: (difficulty: DifficultyLevel | 'all') => void;
    counts?: MatrixCounts | undefined;
    totalCount?: number | undefined;
    className?: string | undefined;
    compact?: boolean | undefined;
}
export declare const DifficultyFilterBar: React.FC<DifficultyFilterBarProps>;
//# sourceMappingURL=DifficultyFilterBar.d.ts.map