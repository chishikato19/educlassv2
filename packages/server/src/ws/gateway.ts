import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import {
  createEnvelope,
  EnvelopeSchema,
  formatProtocolError,
  type Envelope,
} from '@educlass/protocol';
import { generateId, type ParticipantRepository } from '@educlass/db';
import type { ActivityEngine } from '../activity/engine.js';

export interface ConnectedClient {
  id: string;
  socket: WebSocket;
  sessionId: string | null;
  participantId?: string | null;
  connectedAt: number;
}

export class WsGatewayManager {
  private clients = new Map<string, ConnectedClient>();

  addClient(
    socket: WebSocket,
    sessionId: string | null = null,
    participantId: string | null = null
  ): ConnectedClient {
    const client: ConnectedClient = {
      id: generateId(),
      socket,
      sessionId,
      participantId,
      connectedAt: Date.now(),
    };
    this.clients.set(client.id, client);
    return client;
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  isParticipantConnected(sessionId: string, participantId: string): boolean {
    for (const client of this.clients.values()) {
      if (
        client.sessionId === sessionId &&
        client.participantId === participantId &&
        client.socket.readyState === client.socket.OPEN
      ) {
        return true;
      }
    }
    return false;
  }

  getConnectedParticipantIds(sessionId: string): Set<string> {
    const ids = new Set<string>();
    for (const client of this.clients.values()) {
      if (
        client.sessionId === sessionId &&
        client.participantId &&
        client.socket.readyState === client.socket.OPEN
      ) {
        ids.add(client.participantId);
      }
    }
    return ids;
  }

  send(clientId: string, envelope: Envelope): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== client.socket.OPEN) {
      return false;
    }
    client.socket.send(JSON.stringify(envelope));
    return true;
  }

  broadcast(envelope: Envelope, filter?: (client: ConnectedClient) => boolean): void {
    const raw = JSON.stringify(envelope);
    for (const client of this.clients.values()) {
      if (client.socket.readyState === client.socket.OPEN) {
        if (!filter || filter(client)) {
          client.socket.send(raw);
        }
      }
    }
  }

  broadcastToSession(sessionId: string, envelope: Envelope, excludeClientId?: string): void {
    this.broadcast(envelope, client => {
      if (excludeClientId && client.id === excludeClientId) {
        return false;
      }
      return client.sessionId === sessionId;
    });
  }

  /**
   * Đóng toàn bộ kết nối của một phiên học, phát thông điệp thông báo nếu có
   */
  terminateSession(sessionId: string, closeEnvelope?: Envelope): void {
    if (closeEnvelope) {
      this.broadcastToSession(sessionId, closeEnvelope);
    }
    for (const [clientId, client] of this.clients.entries()) {
      if (client.sessionId === sessionId) {
        try {
          client.socket.close(1000, 'Session closed');
        } catch {
          // Bỏ qua lỗi nếu socket đã bị ngắt từ trước
        }
        this.clients.delete(clientId);
      }
    }
  }
}

export interface WsGatewayOptions {
  manager?: WsGatewayManager | undefined;
  participantRepo?: ParticipantRepository | undefined;
  activityEngine?: ActivityEngine | undefined;
}

interface WsQuery {
  sessionId?: string;
  participantId?: string;
}

export const wsGatewayRoutes: FastifyPluginAsync<WsGatewayOptions> = async (fastify, options) => {
  const manager = options.manager ?? new WsGatewayManager();

  // Đăng ký route /ws
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const query = req.query as WsQuery;
    const initialSessionId =
      typeof query?.sessionId === 'string' && query.sessionId ? query.sessionId : null;
    const initialParticipantId =
      typeof query?.participantId === 'string' && query.participantId ? query.participantId : null;
    const client = manager.addClient(socket, initialSessionId, initialParticipantId);

    if (initialSessionId && initialParticipantId) {
      options.activityEngine
        ?.handleParticipantOnline(initialSessionId, initialParticipantId)
        .catch(() => {});
    }

    socket.on('message', (messageBuffer: Buffer) => {
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(messageBuffer.toString());
      } catch {
        const errorEnv = createEnvelope({
          id: generateId(),
          type: 'error',
          sessionId: client.sessionId,
          payload: formatProtocolError(
            'INVALID_PAYLOAD',
            'Tin nhắn không phải định dạng JSON hợp lệ'
          ),
        });
        socket.send(JSON.stringify(errorEnv));
        return;
      }

      // Kiểm tra định dạng Envelope chuẩn
      const parseResult = EnvelopeSchema.safeParse(rawJson);
      if (!parseResult.success) {
        const errorEnv = createEnvelope({
          id: generateId(),
          type: 'error',
          sessionId: client.sessionId,
          payload: formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu không đúng quy cách phong bì Envelope {v: 1, id, type, sessionId, ts, payload}'
          ),
        });
        socket.send(JSON.stringify(errorEnv));
        return;
      }

      const envelope = parseResult.data;

      // Cập nhật sessionId của client nếu có
      if (envelope.sessionId) {
        client.sessionId = envelope.sessionId;
      }

      // Cập nhật participantId nếu có trong payload
      const p = envelope.payload as Record<string, unknown> | null;
      if (p) {
        const participantObj = p.participant as Record<string, unknown> | null;
        const candidatePId = (participantObj?.id || p.participantId) as string | undefined;
        if (candidatePId && typeof candidatePId === 'string') {
          client.participantId = candidatePId;
          if (client.sessionId) {
            options.activityEngine
              ?.handleParticipantOnline(client.sessionId, candidatePId)
              .catch(() => {});
          }
        }
      }

      // Xử lý các loại tin nhắn cơ bản
      if (envelope.type === 'ping') {
        const pongEnv = createEnvelope({
          id: generateId(),
          type: 'pong',
          sessionId: envelope.sessionId,
          payload: envelope.payload ?? null,
        });
        socket.send(JSON.stringify(pongEnv));
        return;
      }

      // Xử lý broadcast tin nhắn trong phiên
      if (envelope.sessionId) {
        manager.broadcastToSession(envelope.sessionId, envelope, client.id);
      }
    });

    socket.on('close', async () => {
      manager.removeClient(client.id);
      if (client.sessionId && client.participantId) {
        const sId = client.sessionId;
        const pId = client.participantId;
        const isStillConnected = manager.isParticipantConnected(sId, pId);
        if (!isStillConnected) {
          try {
            if (options.participantRepo) {
              await options.participantRepo.update(pId, {
                status: 'offline',
                leftAt: Date.now(),
              });
            }
          } catch {
            // Bỏ qua lỗi cập nhật CSDL nếu đã xử lý
          }
          options.activityEngine?.handleParticipantOffline(sId, pId).catch(() => {});
          manager.broadcastToSession(
            sId,
            createEnvelope({
              id: generateId(),
              type: 'participant_left',
              sessionId: sId,
              payload: {
                participantId: pId,
                status: 'offline',
                leftAt: Date.now(),
              },
            })
          );
        }
      }
    });

    socket.on('error', () => {
      manager.removeClient(client.id);
    });
  });
};
