import React from 'react';
import type { PickerQueueItem } from './types.js';
export interface QueueBarProps {
    queue: PickerQueueItem[];
    expReward: number;
    onGradeStudent: (queueItem: PickerQueueItem, isCorrect: boolean) => void;
    onRemoveFromQueue: (queueItemId: string) => void;
}
export declare const QueueBar: React.FC<QueueBarProps>;
//# sourceMappingURL=QueueBar.d.ts.map