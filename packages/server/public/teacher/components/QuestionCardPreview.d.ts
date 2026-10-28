import React from 'react';
import type { Question } from '@educlass/question-kit';
export interface QuestionCardPreviewProps {
    question: Question;
    index: number;
    showAnswers?: boolean;
    onEdit: () => void;
    onDelete: () => void;
}
export declare const QuestionCardPreview: React.FC<QuestionCardPreviewProps>;
//# sourceMappingURL=QuestionCardPreview.d.ts.map