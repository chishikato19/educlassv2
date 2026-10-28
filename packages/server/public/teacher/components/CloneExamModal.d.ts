import React from 'react';
import type { ClassDto, ExamListItemDto } from '@educlass/protocol';
export interface CloneExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    exam: ExamListItemDto | null;
    classes: ClassDto[];
    onShowToast: (message: string) => void;
    onSuccess: () => void;
}
export declare const CloneExamModal: React.FC<CloneExamModalProps>;
//# sourceMappingURL=CloneExamModal.d.ts.map