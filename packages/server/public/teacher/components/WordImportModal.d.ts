import React from 'react';
import { type Question } from '@educlass/question-kit';
export interface WordImportWarning {
    questionIndex: number;
    questionNumberStr?: string | undefined;
    rawText: string;
    reason: string;
}
export interface WordParsedData {
    questions: Question[];
    warnings: WordImportWarning[];
    totalDetected: number;
    successCount: number;
}
export interface WordImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownloadTemplate?: () => void;
    onParseDocx?: (file: File) => Promise<WordParsedData>;
    initialParsedResult?: WordParsedData | undefined;
    onSaveQuestions: (data: {
        setInfo: {
            title: string;
            subject: string;
            grade: number;
            tags: string[];
        };
        questions: Question[];
    }) => Promise<void> | void;
}
export declare const WordImportModal: React.FC<WordImportModalProps>;
//# sourceMappingURL=WordImportModal.d.ts.map