import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import {
  DEFAULT_DISCOVERY_PORT,
  DiscoveryBeaconPayload,
  DiscoveryBeaconPayloadSchema,
} from '@educlass/protocol';

export interface BeaconListenerOptions {
  port?: number | undefined;
  address?: string | undefined;
}

export interface BeaconListenerEvents {
  'session-opened': (payload: DiscoveryBeaconPayload) => void;
  'session-heartbeat': (payload: DiscoveryBeaconPayload) => void;
  'session-closed': (payload: DiscoveryBeaconPayload) => void;
  error: (err: Error) => void;
  listening: (port: number) => void;
}

/**
 * Khối lắng nghe UDP Discovery Beacon trên máy học sinh
 * Giúp ứng dụng tự động phát hiện lớp học khi thầy cô mở phiên (Wake-on-Session)
 */
export class BeaconListener extends EventEmitter {
  private readonly port: number;
  private readonly address: string;
  private socket: dgram.Socket | null = null;
  private listening = false;

  constructor(options: BeaconListenerOptions = {}) {
    super();
    this.port = options.port ?? DEFAULT_DISCOVERY_PORT;
    this.address = options.address ?? '0.0.0.0';
  }

  /**
   * Bắt đầu lắng nghe gói tin phát sóng từ mạng LAN
   */
  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        resolve(this.port);
        return;
      }

      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket = socket;

        socket.on('error', err => {
          this.emit('error', err);
        });

        socket.on('message', msg => {
          this.handleIncomingMessage(msg);
        });

        socket.on('listening', () => {
          this.listening = true;
          this.emit('listening', this.port);
          resolve(this.port);
        });

        socket.bind(this.port, this.address);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Phân tích và chuyển tiếp gói tin Beacon hợp lệ
   */
  private handleIncomingMessage(msg: Buffer): void {
    try {
      const rawText = msg.toString('utf-8');
      const json = JSON.parse(rawText) as unknown;
      const result = DiscoveryBeaconPayloadSchema.safeParse(json);

      if (!result.success) {
        return; // Bỏ qua gói tin không đúng chuẩn
      }

      const payload = result.data;
      if (payload.type === 'SESSION_OPEN') {
        this.emit('session-opened', payload);
      } else if (payload.type === 'SESSION_HEARTBEAT') {
        this.emit('session-heartbeat', payload);
      } else if (payload.type === 'SESSION_CLOSED') {
        this.emit('session-closed', payload);
      }
    } catch {
      // Bỏ qua lỗi parse JSON từ các gói tin rác trong mạng LAN
    }
  }

  /**
   * Kiểm tra trạng thái đang lắng nghe
   */
  public isListening(): boolean {
    return this.listening;
  }

  /**
   * Dừng lắng nghe và giải phóng socket UDP an toàn
   */
  public stop(): Promise<void> {
    return new Promise(resolve => {
      if (!this.socket) {
        this.listening = false;
        resolve();
        return;
      }

      try {
        this.socket.close(() => {
          this.socket = null;
          this.listening = false;
          resolve();
        });
      } catch {
        this.socket = null;
        this.listening = false;
        resolve();
      }
    });
  }
}
