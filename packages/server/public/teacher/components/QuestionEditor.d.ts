import React from 'react';
import type { Question } from '@educlass/question-kit';
export interface QuestionEditorProps {
    initialQuestion?: Question | undefined;
    onSave: (question: Question) => void;
    onCancel?: () => void;
}
export declare const QuestionEditor: React.FC<QuestionEditorProps>;
//# sourceMappingURL=QuestionEditor.d.ts.map