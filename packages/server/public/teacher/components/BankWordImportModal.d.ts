import React from 'react';
import type { DifficultyLevel } from '@educlass/protocol';
import { type Question } from '@educlass/question-kit';
export interface BankWordImportWarning {
    questionIndex: number;
    questionNumberStr?: string | undefined;
    rawText: string;
    reason: string;
}
export interface BankWordParsedData {
    questions: Array<Question & {
        difficulty?: DifficultyLevel | undefined;
        chapter?: string | undefined;
        lesson?: string | undefined;
    }>;
    warnings: BankWordImportWarning[];
    totalDetected: number;
    successCount: number;
}
export interface BankWordImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (count: number) => void;
    currentGrade?: number | undefined;
    currentSubject?: string | undefined;
    currentChapter?: string | null | undefined;
    currentLesson?: string | null | undefined;
}
export declare const BankWordImportModal: React.FC<BankWordImportModalProps>;
//# sourceMappingURL=BankWordImportModal.d.ts.map