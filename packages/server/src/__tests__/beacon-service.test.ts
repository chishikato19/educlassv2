import dgram from 'node:dgram';
import { describe, expect, it, afterEach } from 'vitest';
import { DiscoveryBeaconPayloadSchema, type DiscoveryBeaconPayload } from '@educlass/protocol';
import { BeaconService } from '../services/beacon-service.js';

describe('BeaconService', () => {
  let service: BeaconService | null = null;
  let testReceiver: dgram.Socket | null = null;

  afterEach(async () => {
    if (service) {
      await service.stop();
      service = null;
    }
    if (testReceiver) {
      await new Promise<void>((resolve) => {
        testReceiver?.close(() => resolve());
      });
      testReceiver = null;
    }
  });

  it('khởi tạo thành công với cấu hình mặc định và tracking active session', async () => {
    service = new BeaconService({ port: 54399, broadcastAddress: '127.0.0.1' });
    expect(service.getActiveSession()).toBeNull();

    service.startSessionBeacon({
      sessionId: 'sess_test_1',
      joinCode: '112233',
      serverUrl: 'http://127.0.0.1:3000',
      teacherName: 'Thầy Hùng',
      className: 'Lớp 9A',
    });

    const active = service.getActiveSession();
    expect(active).not.toBeNull();
    expect(active?.sessionId).toBe('sess_test_1');
    expect(active?.joinCode).toBe('112233');
    expect(active?.teacherName).toBe('Thầy Hùng');

    service.sendSessionClosed({
      sessionId: 'sess_test_1',
      joinCode: '112233',
      serverUrl: 'http://127.0.0.1:3000',
    });

    expect(service.getActiveSession()).toBeNull();
  });

  it('phát sóng gói tin UDP hợp lệ và nhận được qua socket lắng nghe', async () => {
    const testPort = 54398;
    const receivedPackets: DiscoveryBeaconPayload[] = [];

    // Tạo socket receiver giả lập Client học sinh lắng nghe trên 127.0.0.1
    testReceiver = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    await new Promise<void>((resolve) => {
      testReceiver!.bind(testPort, '127.0.0.1', () => {
        resolve();
      });
    });

    testReceiver.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString('utf-8')) as unknown;
        const result = DiscoveryBeaconPayloadSchema.safeParse(parsed);
        if (result.success) {
          receivedPackets.push(result.data);
        }
      } catch {
        // ignore
      }
    });

    service = new BeaconService({
      port: testPort,
      broadcastAddress: '127.0.0.1',
      heartbeatIntervalMs: 200,
    });

    service.startSessionBeacon({
      sessionId: 'sess_test_udp',
      joinCode: '888999',
      serverUrl: 'http://127.0.0.1:3000',
      teacherName: 'Cô Lan',
      className: 'Lớp 7B',
    });

    // Chờ 300ms để gói tin đến
    await new Promise((r) => setTimeout(r, 300));

    expect(receivedPackets.length).toBeGreaterThanOrEqual(1);
    const firstPacket = receivedPackets[0];
    expect(firstPacket?.type).toBe('SESSION_OPEN');
    expect(firstPacket?.sessionId).toBe('sess_test_udp');
    expect(firstPacket?.joinCode).toBe('888999');
    expect(firstPacket?.teacherName).toBe('Cô Lan');
    expect(firstPacket?.className).toBe('Lớp 7B');
  });
});
