import React from 'react';
import type { PickerStudent } from './types.js';
export interface ResultModalProps {
    isOpen: boolean;
    student: PickerStudent | null;
    expReward: number;
    onCorrect: () => void;
    onWrong: () => void;
    onQueue: () => void;
    onSkip: () => void;
}
export declare const ResultModal: React.FC<ResultModalProps>;
//# sourceMappingURL=ResultModal.d.ts.map