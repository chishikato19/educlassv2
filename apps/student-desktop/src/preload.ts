import { contextBridge, ipcRenderer } from 'electron';

export interface StudentDesktopBridge {
  onSessionDetected: (
    callback: (session: {
      serverUrl: string;
      joinCode: string;
      teacherName?: string;
      className?: string | null;
    }) => void
  ) => void;
  onSessionClosed: (callback: () => void) => void;
  manualConnect: (urlOrIp: string, joinCode?: string) => void;
  getAppVersion: () => Promise<string>;
  lockKioskMode: () => void;
  unlockKioskMode: () => void;
  isKioskLocked: () => Promise<boolean>;
  onKioskStatusChanged: (callback: (locked: boolean) => void) => void;
  bringToFront: () => void;
}

const bridge: StudentDesktopBridge = {
  onSessionDetected: (callback) => {
    ipcRenderer.on('session-detected', (_event, session) => {
      callback(session);
    });
  },
  onSessionClosed: (callback) => {
    ipcRenderer.on('session-closed', () => {
      callback();
    });
  },
  manualConnect: (urlOrIp: string, joinCode?: string) => {
    ipcRenderer.send('manual-connect', { urlOrIp, joinCode });
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  lockKioskMode: () => {
    ipcRenderer.send('kiosk-lock');
  },
  unlockKioskMode: () => {
    ipcRenderer.send('kiosk-unlock');
  },
  isKioskLocked: () => ipcRenderer.invoke('kiosk-is-locked'),
  onKioskStatusChanged: (callback) => {
    ipcRenderer.on('kiosk-status-changed', (_event, locked) => {
      callback(locked);
    });
  },
  bringToFront: () => {
    ipcRenderer.send('bring-to-front');
  },
};

contextBridge.exposeInMainWorld('educlassStudent', bridge);
