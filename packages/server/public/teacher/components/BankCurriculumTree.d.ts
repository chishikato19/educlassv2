import React from 'react';
import type { BankCurriculumTreeNode } from '@educlass/protocol';
export declare const COMMON_SUBJECTS: string[];
export declare const GRADES: number[];
export interface BankCurriculumTreeProps {
    tree: BankCurriculumTreeNode[];
    currentGrade: number;
    currentSubject: string;
    selectedChapter: string | null;
    selectedLesson: string | null;
    onGradeChange: (grade: number) => void;
    onSubjectChange: (subject: string) => void;
    onSelectLesson: (chapter: string, lesson: string) => void;
    onSelectChapter?: (chapter: string) => void;
    onClearSelection: () => void;
    isLoading?: boolean | undefined;
    className?: string | undefined;
}
export declare const BankCurriculumTree: React.FC<BankCurriculumTreeProps>;
//# sourceMappingURL=BankCurriculumTree.d.ts.map