import React from 'react';
import type { ClassDto, ParticipantDto, StudentDto } from '@educlass/protocol';
import { type RandomPickerSettings } from '@educlass/protocol';
export interface RandomPickerTabProps {
    classes: ClassDto[];
    selectedClassId?: string | undefined;
    students: StudentDto[];
    activeSessionId?: string | null | undefined;
    participants?: ParticipantDto[] | undefined;
    onShowToast: (message: string) => void;
    initialSettings?: Partial<RandomPickerSettings> | undefined;
}
export declare const RandomPickerTab: React.FC<RandomPickerTabProps>;
//# sourceMappingURL=RandomPickerTab.d.ts.map