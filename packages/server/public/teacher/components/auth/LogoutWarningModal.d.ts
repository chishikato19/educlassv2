import React from 'react';
export interface LogoutWarningModalProps {
    isOpen: boolean;
    classNameTitle?: string | undefined;
    joinCode?: string | undefined;
    onClose: () => void;
    onCloseSessionAndLogout: () => Promise<void>;
    onKeepSessionAndLogout: () => Promise<void>;
}
export declare const LogoutWarningModal: React.FC<LogoutWarningModalProps>;
//# sourceMappingURL=LogoutWarningModal.d.ts.map