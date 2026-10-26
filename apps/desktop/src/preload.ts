import { contextBridge, ipcRenderer } from 'electron';

export interface UpdateInfoResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string | null;
  releaseDate?: string;
  error?: string;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  onServerInfo: (callback: (info: unknown) => void) => {
    ipcRenderer.on('server-info', (_, data) => callback(data));
  },
  openExternal: (url?: string) => {
    ipcRenderer.send('open-external', url);
  },
  openTeacherWindow: (url?: string) => {
    ipcRenderer.send('open-teacher-window', url);
  },
  copyText: (text: string) => ipcRenderer.invoke('copy-text', text),

  // Quản lý cập nhật phiên bản (Auto-Update)
  checkForUpdate: (): Promise<UpdateInfoResult> => ipcRenderer.invoke('check-for-update'),
  startDownloadUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('start-download-update'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('quit-and-install'),
  onUpdateDownloadProgress: (callback: (progress: UpdateProgress) => void) => {
    const handler = (_: unknown, data: UpdateProgress) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler);
    };
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_: unknown, data: { version: string }) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
});
