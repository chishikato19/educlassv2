import React from 'react';
import type { TeacherPublicProfile, UserDto } from '@educlass/protocol';
export interface PinModalProps {
    teacher: TeacherPublicProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: UserDto) => void;
}
export declare const PinModal: React.FC<PinModalProps>;
//# sourceMappingURL=PinModal.d.ts.map