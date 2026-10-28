import React from 'react';
import type { ClassDto, CreateClassRequest, CreateStudentRequest, StudentDto, AcademicPerformance } from '@educlass/protocol';
export interface ClassTabProps {
    classes: ClassDto[];
    selectedClassId?: string | undefined;
    students: StudentDto[];
    onSelectClass: (classId: string) => void;
    onCreateClass: (data: CreateClassRequest) => Promise<void>;
    onUpdateClass?: ((classId: string, name: string) => Promise<void>) | undefined;
    onDeleteClass?: ((classId: string) => Promise<void>) | undefined;
    onCreateStudent: (classId: string, data: CreateStudentRequest) => Promise<void>;
    onUpdateStudent?: ((studentId: string, fullName: string, code?: string, academicPerformance?: AcademicPerformance) => Promise<void>) | undefined;
    onSetStudentPin: (studentId: string, pin: string | null) => Promise<void>;
    onDeleteStudent: (studentId: string) => Promise<void>;
    onImportStudents: (classId: string, students: CreateStudentRequest[], skipDuplicates: boolean) => Promise<void>;
}
export declare const ClassTab: React.FC<ClassTabProps>;
//# sourceMappingURL=ClassTab.d.ts.map