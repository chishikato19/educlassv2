import React from 'react';
import type { ExamRecordDto } from '@educlass/protocol';
export interface StudentExamReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: ExamRecordDto | null;
    questions: Array<Record<string, unknown>>;
    className?: string | undefined;
    examTitle?: string | undefined;
}
export declare const StudentExamReviewModal: React.FC<StudentExamReviewModalProps>;
//# sourceMappingURL=StudentExamReviewModal.d.ts.map