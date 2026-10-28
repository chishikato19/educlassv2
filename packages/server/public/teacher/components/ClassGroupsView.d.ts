import React from 'react';
import type { StudentDto } from '@educlass/protocol';
export interface ClassGroupsViewProps {
    classId: string;
    className: string;
    students: StudentDto[];
    onShowToast: (msg: string) => void;
}
export declare const ClassGroupsView: React.FC<ClassGroupsViewProps>;
//# sourceMappingURL=ClassGroupsView.d.ts.map