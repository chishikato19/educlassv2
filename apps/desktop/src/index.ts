import { getServerStatus } from '@educlass/server';

export * from './network.js';
export * from './qr.js';
export * from './server-runner.js';

export const DESKTOP_APP_NAME = 'EduClass Desktop';

export function getDesktopAppInfo(): {
  appName: string;
  serverInfo: ReturnType<typeof getServerStatus>;
} {
  return {
    appName: DESKTOP_APP_NAME,
    serverInfo: getServerStatus(),
  };
}
