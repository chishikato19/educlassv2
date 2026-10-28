import React from 'react';
export interface MatrixImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newSetId: string) => void;
    initialGrade?: number | undefined;
    initialSubject?: string | undefined;
}
export declare const MatrixImportModal: React.FC<MatrixImportModalProps>;
//# sourceMappingURL=MatrixImportModal.d.ts.map