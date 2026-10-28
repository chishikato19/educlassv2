import React from 'react';
import type { UserDto } from '@educlass/protocol';
export interface AdminLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: UserDto) => void;
}
export declare const AdminLoginModal: React.FC<AdminLoginModalProps>;
//# sourceMappingURL=AdminLoginModal.d.ts.map