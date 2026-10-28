import React from 'react';
import type { EduclassPackage } from '@educlass/protocol';
import type { Question } from '@educlass/question-kit';
import type { QuestionSetItem } from '../api/client.js';
export type { QuestionSetItem };
export interface QuestionBankTabProps {
    questionSets: QuestionSetItem[];
    isLoading?: boolean | undefined;
    onRefresh?: (() => void) | undefined;
    onCreateQuestionSet: (data: {
        title: string;
        subject: string;
        grade: number;
        tags: string[];
    }) => Promise<void> | void;
    onUpdateQuestionSet?: (id: string, data: {
        title?: string;
        subject?: string;
        grade?: number;
        tags?: string[];
    }) => Promise<void> | void;
    onDeleteQuestionSet: (id: string) => Promise<void> | void;
    onCloneQuestionSet: (id: string, newTitle?: string) => Promise<void> | void;
    onExportQuestionSet: (id: string) => Promise<void> | void;
    onImportQuestionSet: (pkg: EduclassPackage) => Promise<void> | void;
    onOpenQuestionEditor?: ((questionSet: QuestionSetItem) => void) | undefined;
    onImportWordQuestions?: ((data: {
        setInfo: {
            title: string;
            subject: string;
            grade: number;
            tags: string[];
        };
        questions: Question[];
    }) => Promise<void> | void) | undefined;
}
export declare const QuestionBankTab: React.FC<QuestionBankTabProps>;
//# sourceMappingURL=QuestionBankTab.d.ts.map