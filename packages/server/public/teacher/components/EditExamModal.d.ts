import React from 'react';
import type { ExamListItemDto } from '@educlass/protocol';
export interface EditExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    exam: ExamListItemDto | null;
    existingFolders: string[];
    onShowToast: (message: string) => void;
    onSuccess: () => void;
}
export declare const EditExamModal: React.FC<EditExamModalProps>;
//# sourceMappingURL=EditExamModal.d.ts.map