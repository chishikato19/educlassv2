import React from 'react';
import type { UserDto } from '@educlass/protocol';
export interface RegisterTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: UserDto) => void;
}
export declare const RegisterTeacherModal: React.FC<RegisterTeacherModalProps>;
//# sourceMappingURL=RegisterTeacherModal.d.ts.map