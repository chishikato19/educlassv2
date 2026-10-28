import React from 'react';
import type { ExamListItemDto } from '@educlass/protocol';
export interface MoveExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    exam: ExamListItemDto | null;
    allFolders: string[];
    onShowToast: (message: string) => void;
    onSuccess: () => void;
}
export declare const MoveExamModal: React.FC<MoveExamModalProps>;
//# sourceMappingURL=MoveExamModal.d.ts.map