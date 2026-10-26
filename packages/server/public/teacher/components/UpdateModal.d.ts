import React from 'react';
export interface UpdateInfoResult {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseNotes?: string | null;
    releaseDate?: string;
    devMode?: boolean;
    message?: string;
    error?: string;
}
export interface UpdateProgress {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
}
export interface ElectronUpdateApi {
    checkForUpdate?: () => Promise<UpdateInfoResult>;
    startDownloadUpdate?: () => Promise<{
        success: boolean;
        error?: string;
    }>;
    quitAndInstall?: () => Promise<void>;
    onUpdateDownloadProgress?: (callback: (progress: UpdateProgress) => void) => () => void;
    onUpdateDownloaded?: (callback: (info: {
        version: string;
    }) => void) => () => void;
}
interface UpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentVersion: string;
}
export declare const UpdateModal: React.FC<UpdateModalProps>;
export {};
//# sourceMappingURL=UpdateModal.d.ts.map