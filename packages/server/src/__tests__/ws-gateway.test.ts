import { WebSocket } from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createEnvelope, type Envelope } from '@educlass/protocol';
import { buildServer } from '../app.js';

describe('WebSocket Gateway', () => {
  let app: FastifyInstance;
  let serverAddress: string;

  beforeAll(async () => {
    app = await buildServer({ fastifyOptions: { logger: false } });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('Server address not available');
    }
    serverAddress = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterAll(async () => {
    await app.close();
  });

  function waitForOpen(ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
  }

  function waitForMessage(ws: WebSocket): Promise<Envelope> {
    return new Promise((resolve, reject) => {
      ws.once('message', data => {
        try {
          const parsed = JSON.parse(data.toString());
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
      ws.once('error', reject);
    });
  }

  it('connects to /ws and responds to ping envelope with pong', async () => {
    const ws = new WebSocket(serverAddress);
    await waitForOpen(ws);

    const pingEnvelope = createEnvelope({
      id: 'ping-1',
      type: 'ping',
      sessionId: null,
      payload: { hello: 'server' },
    });

    ws.send(JSON.stringify(pingEnvelope));
    const response = await waitForMessage(ws);

    expect(response.v).toBe(1);
    expect(response.type).toBe('pong');
    expect(response.payload).toEqual({ hello: 'server' });

    ws.close();
  });

  it('rejects invalid envelope messages with INVALID_PAYLOAD error envelope', async () => {
    const ws = new WebSocket(serverAddress);
    await waitForOpen(ws);

    // Gửi dữ liệu không theo chuẩn Envelope (thiếu v, id, type, ts)
    ws.send(JSON.stringify({ bad: 'data' }));
    const response = (await waitForMessage(ws)) as Envelope<{ code: string; message: string }>;

    expect(response.v).toBe(1);
    expect(response.type).toBe('error');
    expect(response.payload?.code).toBe('INVALID_PAYLOAD');

    ws.close();
  });

  it('broadcasts messages to all connected clients in the same session', async () => {
    // Client 1 kết nối vào session-xyz
    const ws1 = new WebSocket(`${serverAddress}?sessionId=session-xyz`);
    // Client 2 kết nối vào session-xyz
    const ws2 = new WebSocket(`${serverAddress}?sessionId=session-xyz`);
    await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);

    // Client 1 gửi tin nhắn broadcast
    const broadcastMsg = createEnvelope({
      id: 'bcast-1',
      type: 'broadcast_test',
      sessionId: 'session-xyz',
      payload: { message: 'hello all' },
    });

    // Lắng nghe trên ws2
    const msgPromise = waitForMessage(ws2);
    ws1.send(JSON.stringify(broadcastMsg));
    const received = await msgPromise;

    expect(received.type).toBe('broadcast_test');
    expect(received.sessionId).toBe('session-xyz');
    expect(received.payload).toEqual({ message: 'hello all' });

    ws1.close();
    ws2.close();
  });
});
