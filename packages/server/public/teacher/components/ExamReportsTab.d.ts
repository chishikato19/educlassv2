import React from 'react';
import type { ClassDto, SessionDetailResponse } from '@educlass/protocol';
export interface ExamReportsTabProps {
    classes: ClassDto[];
    activeSession: SessionDetailResponse | null;
    onShowToast: (message: string) => void;
    onViewDetails?: (examId: string) => void;
    onCreateExam?: () => void;
    onSessionCreatedAndStartExam?: (session: SessionDetailResponse) => void | Promise<void>;
    onSwitchToSessionTab?: () => void;
}
export declare const ExamReportsTab: React.FC<ExamReportsTabProps>;
//# sourceMappingURL=ExamReportsTab.d.ts.map