import React from 'react';
export interface ExamReportDetailModalProps {
    examId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onShowToast: (message: string) => void;
}
export declare const ExamReportDetailModal: React.FC<ExamReportDetailModalProps>;
//# sourceMappingURL=ExamReportDetailModal.d.ts.map