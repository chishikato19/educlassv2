import dgram from 'node:dgram';
import {
  DEFAULT_DISCOVERY_PORT,
  DiscoveryBeaconPayload,
  DiscoveryBeaconPayloadSchema,
  DiscoveryBeaconType,
} from '@educlass/protocol';

export interface BeaconServiceOptions {
  port?: number | undefined;
  broadcastAddress?: string | undefined;
  heartbeatIntervalMs?: number | undefined;
  enabled?: boolean | undefined;
}

export interface ActiveBeaconSessionInfo {
  sessionId: string;
  joinCode: string;
  serverUrl: string;
  teacherName?: string | undefined;
  className?: string | null | undefined;
  currentActivityId?: string | null | undefined;
  activityRunId?: string | null | undefined;
}

/**
 * Service phát sóng gói tin UDP Discovery Beacon qua mạng LAN nội bộ
 * Giúp các máy học sinh phòng máy tính (chạy nền) tự động phát hiện phiên và nạp giao diện vào lớp
 */
export class BeaconService {
  private readonly port: number;
  private readonly broadcastAddress: string;
  private readonly heartbeatIntervalMs: number;
  private readonly enabled: boolean;

  private socket: dgram.Socket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingTimeouts: NodeJS.Timeout[] = [];
  private activeSession: ActiveBeaconSessionInfo | null = null;

  constructor(options: BeaconServiceOptions = {}) {
    this.port = options.port ?? DEFAULT_DISCOVERY_PORT;
    this.broadcastAddress = options.broadcastAddress ?? '255.255.255.255';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5000;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Khởi tạo socket UDP và cấu hình cờ broadcast
   */
  private ensureSocket(): dgram.Socket | null {
    if (!this.enabled) return null;
    if (this.socket) return this.socket;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', err => {
        console.warn('[BeaconService] Lỗi socket UDP:', err.message);
      });

      // Bind cổng ngẫu nhiên ở phía phát, bật broadcast
      this.socket.bind(0, () => {
        try {
          this.socket?.setBroadcast(true);
        } catch (err) {
          console.warn('[BeaconService] Không thể bật cờ setBroadcast:', err);
        }
      });

      return this.socket;
    } catch (err) {
      console.warn('[BeaconService] Khởi tạo socket UDP thất bại:', err);
      return null;
    }
  }

  /**
   * Gửi một gói tin UDP Beacon tới địa chỉ broadcast
   */
  public sendPacket(type: DiscoveryBeaconType, session: ActiveBeaconSessionInfo): void {
    if (!this.enabled) return;

    const socket = this.ensureSocket();
    if (!socket) return;

    const payload: DiscoveryBeaconPayload = {
      v: 1,
      type,
      sessionId: session.sessionId,
      joinCode: session.joinCode,
      serverUrl: session.serverUrl,
      teacherName: session.teacherName,
      className: session.className,
      currentActivityId: session.currentActivityId,
      activityRunId: session.activityRunId,
      timestamp: Date.now(),
    };

    const validated = DiscoveryBeaconPayloadSchema.safeParse(payload);
    if (!validated.success) {
      console.warn('[BeaconService] Dữ liệu beacon không hợp lệ:', validated.error);
      return;
    }

    const message = Buffer.from(JSON.stringify(validated.data), 'utf-8');

    try {
      socket.send(message, 0, message.length, this.port, this.broadcastAddress, err => {
        if (err) {
          // Bỏ qua lỗi mạng nội bộ tạm thời để không ảnh hưởng server chính
        }
      });
    } catch {
      // Bỏ qua lỗi gửi socket bất thường
    }
  }

  /**
   * Bắt đầu phát sóng cho một phiên học vừa mở (Wake-on-Session)
   * - Bắn ngay chùm 3 gói tin SESSION_OPEN
   * - Bật nhịp tim định kỳ SESSION_HEARTBEAT mỗi 5 giây
   */
  public startSessionBeacon(info: ActiveBeaconSessionInfo): void {
    if (!this.enabled) return;

    this.stopHeartbeat();
    this.activeSession = { ...info };

    // Bắn chùm 3 gói tin SESSION_OPEN cách nhau 120ms để chống rớt gói trên WiFi/LAN
    this.sendPacket('SESSION_OPEN', info);
    const t1 = setTimeout(() => this.sendPacket('SESSION_OPEN', info), 120);
    const t2 = setTimeout(() => this.sendPacket('SESSION_OPEN', info), 240);
    this.pendingTimeouts.push(t1, t2);

    // Kích hoạt nhịp tim phát định kỳ
    this.heartbeatTimer = setInterval(() => {
      if (this.activeSession) {
        this.sendPacket('SESSION_HEARTBEAT', this.activeSession);
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Gửi thông báo phiên học đã đóng để máy học sinh tự động đóng cửa sổ ứng dụng
   */
  public sendSessionClosed(info: { sessionId: string; joinCode: string; serverUrl: string }): void {
    if (!this.enabled) return;

    this.stopHeartbeat();

    const closedInfo: ActiveBeaconSessionInfo = {
      sessionId: info.sessionId,
      joinCode: info.joinCode,
      serverUrl: info.serverUrl,
      teacherName: this.activeSession?.teacherName,
      className: this.activeSession?.className,
    };

    // Bắn chùm 3 gói tin SESSION_CLOSED cách nhau 120ms
    this.sendPacket('SESSION_CLOSED', closedInfo);
    const t1 = setTimeout(() => this.sendPacket('SESSION_CLOSED', closedInfo), 120);
    const t2 = setTimeout(() => this.sendPacket('SESSION_CLOSED', closedInfo), 240);
    this.pendingTimeouts.push(t1, t2);

    if (this.activeSession?.sessionId === info.sessionId) {
      this.activeSession = null;
    }
  }

  /**
   * Dừng timer nhịp tim và các timeout đang chờ
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const t of this.pendingTimeouts) {
      clearTimeout(t);
    }
    this.pendingTimeouts = [];
  }

  /**
   * Cập nhật hoạt động đang chạy và phát ngay chùm gói tin để máy học sinh tự động bung cửa sổ lên lại
   */
  public notifyActivityStarted(info: { activityId: string; runId?: string | undefined }): void {
    if (!this.enabled || !this.activeSession) return;
    this.activeSession.currentActivityId = info.activityId;
    this.activeSession.activityRunId = info.runId;

    // Bắn chùm 2 gói tin heartbeat cập nhật hoạt động mới
    this.sendPacket('SESSION_HEARTBEAT', this.activeSession);
    const t = setTimeout(() => {
      if (this.activeSession) this.sendPacket('SESSION_HEARTBEAT', this.activeSession);
    }, 120);
    this.pendingTimeouts.push(t);
  }

  /**
   * Xóa trạng thái hoạt động khi hoạt động kết thúc
   */
  public notifyActivityEnded(): void {
    if (!this.enabled || !this.activeSession) return;
    this.activeSession.currentActivityId = null;
    this.activeSession.activityRunId = null;
  }

  /**
   * Lấy thông tin phiên học đang phát sóng hiện tại
   */
  public getActiveSession(): ActiveBeaconSessionInfo | null {
    return this.activeSession;
  }

  /**
   * Dừng toàn bộ service và đóng socket UDP an toàn
   */
  public stop(): Promise<void> {
    this.stopHeartbeat();
    this.activeSession = null;

    return new Promise(resolve => {
      if (!this.socket) {
        resolve();
        return;
      }

      try {
        this.socket.close(() => {
          this.socket = null;
          resolve();
        });
      } catch {
        this.socket = null;
        resolve();
      }
    });
  }
}
