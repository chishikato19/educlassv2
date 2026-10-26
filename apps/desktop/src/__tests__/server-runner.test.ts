import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startEmbeddedServer, type EmbeddedServerInstance } from '../server-runner.js';

describe('Embedded Server Runner', () => {
  let serverInstance: EmbeddedServerInstance;

  beforeAll(async () => {
    // Khởi động với cổng 0 để tránh xung đột cổng khi test
    serverInstance = await startEmbeddedServer({
      port: 0,
      host: '127.0.0.1',
    });
  });

  afterAll(async () => {
    await serverInstance.stop();
  });

  it('starts server and returns valid ports and LAN access URLs', () => {
    expect(serverInstance.port).toBeGreaterThan(0);
    expect(serverInstance.lanIp).toBeDefined();
    expect(serverInstance.studentUrl).toContain(String(serverInstance.port));
    expect(serverInstance.teacherUrl).toContain('/teacher');
    expect(serverInstance.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('serves /health endpoint successfully', async () => {
    const res = await fetch(`http://127.0.0.1:${serverInstance.port}/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; v: number };
    expect(body.status).toBe('ok');
    expect(body.v).toBe(1);
  });
});
