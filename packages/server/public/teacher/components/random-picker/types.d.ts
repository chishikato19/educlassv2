import type { AcademicPerformance, PickerQueueItem, PickerSelectionStrategy, PickerStudent, RandomPickerModeId, RandomPickerSettings } from '@educlass/protocol';
export type { AcademicPerformance, PickerQueueItem, PickerSelectionStrategy, PickerStudent, RandomPickerModeId, RandomPickerSettings, };
/**
 * Trạng thái hộp quà bí mật
 */
export type MysteryBoxStatus = 'idle' | 'selected' | 'opened_loser' | 'opened_winner';
export interface MysteryBoxItem {
    id: number;
    student: PickerStudent | null;
    status: MysteryBoxStatus;
    isTarget: boolean;
}
/**
 * Trạng thái máy quay số Slot Machine
 */
export interface SlotMachineState {
    tens: number;
    units: number;
    studentNumber: number;
    targetStudent: PickerStudent | null;
    isSpinningTens: boolean;
    isSpinningUnits: boolean;
}
/**
 * Trạng thái quả bóng bay
 */
export interface BalloonItem {
    id: number;
    color: string;
    student: PickerStudent | null;
    isPopped: boolean;
    isTarget: boolean;
}
/**
 * Trạng thái lá bài ma thuật (Lưới 3x3)
 */
export interface MagicCardItem {
    id: number;
    student: PickerStudent | null;
    isRevealed: boolean;
    isTarget: boolean;
    positionIndex: number;
}
/**
 * Thuộc tính chung cho một Mode quay ngẫu nhiên
 */
export interface RandomPickerModeProps {
    isPicking: boolean;
    selectedStudent: PickerStudent | null;
    candidates: PickerStudent[];
    cards: Array<{
        id: number;
        student: PickerStudent | null;
        isRevealed: boolean;
        isTarget: boolean;
    }>;
    onFlipCard: (cardIndex: number) => void;
    isCompleted: boolean;
    isFullscreen?: boolean;
    boxes?: MysteryBoxItem[];
    onSelectBox?: (boxIndex: number) => void;
    isWaitingForBoxSelection?: boolean;
    slotState?: SlotMachineState;
    onTriggerSpin?: (strategy?: PickerSelectionStrategy) => void;
    balloons?: BalloonItem[];
    onPopBalloon?: (balloonIndex: number) => void;
    isWaitingForBalloon?: boolean;
    magicCards?: MagicCardItem[];
    onSelectMagicCard?: (cardIndex: number) => void;
    isWaitingForMagicCard?: boolean;
    isShufflingMagicDeck?: boolean;
    onEliminationComplete?: () => void;
    onMarbleRaceComplete?: (winnerStudent: PickerStudent) => void;
    onDuckHuntComplete?: (winnerStudent: PickerStudent) => void;
}
/**
 * Message truyền qua BroadcastChannel để đồng bộ giữa màn hình Giáo viên và Máy chiếu
 */
export type RandomPickerSyncMessage = {
    type: 'SYNC_STATE';
    payload: {
        students: PickerStudent[];
        queue: PickerQueueItem[];
        settings: RandomPickerSettings;
        selectedStudent: PickerStudent | null;
        isPicking: boolean;
        isCompleted: boolean;
        cards: Array<{
            id: number;
            student: PickerStudent | null;
            isRevealed: boolean;
            isTarget: boolean;
        }>;
        boxes?: MysteryBoxItem[];
        slotState?: SlotMachineState;
        balloons?: BalloonItem[];
        magicCards?: MagicCardItem[];
        showFireworks?: boolean;
    };
} | {
    type: 'TRIGGER_PICK';
    payload: {
        strategy: PickerSelectionStrategy;
        targetStudent: PickerStudent;
        targetCardIndex: number;
        dummyStudents: PickerStudent[];
    };
} | {
    type: 'CARD_FLIPPED';
    payload: {
        cardIndex: number;
    };
} | {
    type: 'BOX_SELECTED';
    payload: {
        boxIndex: number;
    };
} | {
    type: 'TRIGGER_FIREWORKS';
} | {
    type: 'CONFIRM_RESULT';
    payload: {
        studentId: string;
        action: 'correct' | 'wrong' | 'queue' | 'skip';
        expGained?: number;
    };
} | {
    type: 'RESET';
};
//# sourceMappingURL=types.d.ts.map