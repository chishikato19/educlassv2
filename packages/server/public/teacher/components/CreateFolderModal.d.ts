import React from 'react';
export interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialParentPath?: string;
    allFolders: string[];
    onShowToast: (message: string) => void;
    onSuccess: (newFolderPath: string) => void;
}
export declare const CreateFolderModal: React.FC<CreateFolderModalProps>;
//# sourceMappingURL=CreateFolderModal.d.ts.map