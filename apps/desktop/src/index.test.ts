import { describe, expect, it } from 'vitest';
import {
  DESKTOP_APP_NAME,
  generateQrDataUrl,
  getDesktopAppInfo,
  getLanIpAddress,
  startEmbeddedServer,
} from './index.js';

describe('desktop app exports', () => {
  it('returns desktop info', () => {
    const info = getDesktopAppInfo();
    expect(info.appName).toBe(DESKTOP_APP_NAME);
    expect(info.serverInfo.server).toBe('educlass-server');
  });

  it('exports network, qr, and server runner utilities', () => {
    expect(getLanIpAddress).toBeDefined();
    expect(generateQrDataUrl).toBeDefined();
    expect(startEmbeddedServer).toBeDefined();
  });
});
