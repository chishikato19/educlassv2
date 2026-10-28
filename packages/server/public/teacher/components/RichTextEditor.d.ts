import React from 'react';
import type { RichText } from '@educlass/question-kit';
export interface RichTextEditorProps {
    label?: string;
    value: RichText;
    onChange: (value: RichText) => void;
    placeholder?: string;
    testIdPrefix?: string;
    minRows?: number;
    required?: boolean;
}
export declare const RichTextEditor: React.FC<RichTextEditorProps>;
//# sourceMappingURL=RichTextEditor.d.ts.map