import crypto from 'node:crypto';
import type { UserRole } from '@educlass/protocol';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export class TokenService {
  private readonly secretKey: Buffer;
  private readonly defaultTtlMs: number;

  constructor(secretKeyString?: string, defaultTtlMs = 7 * 24 * 60 * 60 * 1000) {
    // Nếu không truyền secretKeyString, sinh khóa ngẫu nhiên cho tiến trình hiện tại
    const key = secretKeyString ?? crypto.randomBytes(32).toString('hex');
    this.secretKey = Buffer.from(key, 'utf-8');
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Tạo token ký điện tử HMAC-SHA256 cho người dùng
   */
  createToken(
    user: { id: string; username: string; role: UserRole },
    expiresInMs?: number
  ): string {
    const now = Date.now();
    const ttl = expiresInMs ?? this.defaultTtlMs;

    const payload: AuthTokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + ttl,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadEncoded = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    const signature = this.createSignature(payloadEncoded);

    return `${payloadEncoded}.${signature}`;
  }

  /**
   * Xác minh tính hợp lệ và thời hạn của token
   */
  verifyToken(token: string): AuthTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return null;
      }

      const payloadEncoded = parts[0];
      const signature = parts[1];
      if (!payloadEncoded || !signature) {
        return null;
      }

      const expectedSignature = this.createSignature(payloadEncoded);
      const sigBuf = Buffer.from(signature, 'utf-8');
      const expectedSigBuf = Buffer.from(expectedSignature, 'utf-8');

      if (sigBuf.length !== expectedSigBuf.length) {
        return null;
      }

      if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
        return null;
      }

      const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson) as AuthTokenPayload;

      // Kiểm tra thời hạn hết hạn
      if (Date.now() > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Tạo token ký điện tử cho học sinh tham gia phiên (Participant Token)
   */
  createParticipantToken(
    data: { participantId: string; sessionId: string; identityLevel: string },
    expiresInMs = 24 * 60 * 60 * 1000
  ): string {
    const now = Date.now();
    const payload = {
      ...data,
      iat: now,
      exp: now + expiresInMs,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadEncoded = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    const signature = this.createSignature(payloadEncoded);

    return `${payloadEncoded}.${signature}`;
  }

  /**
   * Xác minh tính hợp lệ của participant token
   */
  verifyParticipantToken(
    token: string
  ): { participantId: string; sessionId: string; identityLevel: string; exp: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;

      const payloadEncoded = parts[0];
      const signature = parts[1];
      if (!payloadEncoded || !signature) return null;

      const expectedSignature = this.createSignature(payloadEncoded);
      const sigBuf = Buffer.from(signature, 'utf-8');
      const expectedSigBuf = Buffer.from(expectedSignature, 'utf-8');

      if (sigBuf.length !== expectedSigBuf.length) return null;
      if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return null;

      const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson) as {
        participantId: string;
        sessionId: string;
        identityLevel: string;
        exp: number;
      };

      if (Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private createSignature(data: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('base64url');
  }
}
