import dgram from 'node:dgram';
import { describe, expect, it, afterEach } from 'vitest';
import { BeaconListener } from '../beacon-listener.js';
import type { DiscoveryBeaconPayload } from '@educlass/protocol';

describe('BeaconListener', () => {
  let listener: BeaconListener | null = null;
  let testSender: dgram.Socket | null = null;

  afterEach(async () => {
    if (listener) {
      await listener.stop();
      listener = null;
    }
    if (testSender) {
      await new Promise<void>((resolve) => {
        testSender?.close(() => resolve());
      });
      testSender = null;
    }
  });

  it('lắng nghe và phân tích chính xác gói tin SESSION_OPEN và SESSION_CLOSED', async () => {
    const testPort = 54387;
    listener = new BeaconListener({ port: testPort, address: '127.0.0.1' });

    const openedEvents: DiscoveryBeaconPayload[] = [];
    const closedEvents: DiscoveryBeaconPayload[] = [];

    listener.on('session-opened', (p) => openedEvents.push(p));
    listener.on('session-closed', (p) => closedEvents.push(p));

    await listener.start();
    expect(listener.isListening()).toBe(true);

    testSender = dgram.createSocket('udp4');

    // 1. Gửi gói SESSION_OPEN
    const openPacket: DiscoveryBeaconPayload = {
      v: 1,
      type: 'SESSION_OPEN',
      sessionId: 'sess_100',
      joinCode: '654321',
      serverUrl: 'http://127.0.0.1:3000',
      teacherName: 'Thầy Hưng',
      className: 'Lớp 8C',
      timestamp: Date.now(),
    };
    const openMsg = Buffer.from(JSON.stringify(openPacket));
    await new Promise<void>((resolve) => {
      testSender!.send(openMsg, 0, openMsg.length, testPort, '127.0.0.1', () => resolve());
    });

    // 2. Gửi gói SESSION_CLOSED
    const closePacket: DiscoveryBeaconPayload = {
      v: 1,
      type: 'SESSION_CLOSED',
      sessionId: 'sess_100',
      joinCode: '654321',
      serverUrl: 'http://127.0.0.1:3000',
      timestamp: Date.now(),
    };
    const closeMsg = Buffer.from(JSON.stringify(closePacket));
    await new Promise<void>((resolve) => {
      testSender!.send(closeMsg, 0, closeMsg.length, testPort, '127.0.0.1', () => resolve());
    });

    // Chờ 200ms để các event kích hoạt
    await new Promise((r) => setTimeout(r, 200));

    expect(openedEvents.length).toBe(1);
    expect(openedEvents[0]?.sessionId).toBe('sess_100');
    expect(openedEvents[0]?.joinCode).toBe('654321');
    expect(openedEvents[0]?.teacherName).toBe('Thầy Hưng');

    expect(closedEvents.length).toBe(1);
    expect(closedEvents[0]?.sessionId).toBe('sess_100');
  });

  it('bỏ qua gói tin không hợp lệ', async () => {
    const testPort = 54386;
    listener = new BeaconListener({ port: testPort, address: '127.0.0.1' });

    let received = false;
    listener.on('session-opened', () => { received = true; });

    await listener.start();
    testSender = dgram.createSocket('udp4');

    const garbageMsg = Buffer.from('NOT_A_VALID_JSON');
    await new Promise<void>((resolve) => {
      testSender!.send(garbageMsg, 0, garbageMsg.length, testPort, '127.0.0.1', () => resolve());
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toBe(false);
  });
});
