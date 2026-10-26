import { describe, expect, it } from 'vitest';
import { buildServer, getServerStatus, SERVER_NAME, WsGatewayManager } from './index.js';

describe('server module', () => {
  it('returns server status correctly', () => {
    const status = getServerStatus();
    expect(status.server).toBe(SERVER_NAME);
    expect(status.db).toBe('db');
    expect(status.qkVersion).toBe(1);
  });

  it('exports buildServer and WsGatewayManager', () => {
    expect(buildServer).toBeDefined();
    expect(WsGatewayManager).toBeDefined();
  });
});
