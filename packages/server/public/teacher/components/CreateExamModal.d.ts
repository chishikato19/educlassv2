import React from 'react';
import type { ClassDto, SessionDetailResponse } from '@educlass/protocol';
import { type QuestionSetItem } from '../api/client.js';
export interface CreateExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    classes: ClassDto[];
    onShowToast: (message: string) => void;
    onSuccess: (createdExam: unknown) => void;
    initialClassId?: string | undefined;
    questionSets?: QuestionSetItem[] | undefined;
    activeSession?: SessionDetailResponse | null | undefined;
    existingFolders?: string[] | undefined;
}
export declare const CreateExamModal: React.FC<CreateExamModalProps>;
//# sourceMappingURL=CreateExamModal.d.ts.map