import { describe, expect, it } from 'vitest';
import { TokenService } from '../auth/token-service.js';

describe('TokenService', () => {
  const tokenService = new TokenService('test-secret-key-1234567890123456');

  it('creates and verifies a valid token', () => {
    const user = {
      id: '01HR0000000000000000000001',
      username: 'teacher_lan',
      role: 'teacher' as const,
    };

    const token = tokenService.createToken(user);
    expect(typeof token).toBe('string');
    expect(token.includes('.')).toBe(true);

    const verified = tokenService.verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(user.id);
    expect(verified?.username).toBe(user.username);
    expect(verified?.role).toBe(user.role);
  });

  it('rejects tampered token', () => {
    const user = {
      id: '01HR0000000000000000000002',
      username: 'admin',
      role: 'admin' as const,
    };

    const token = tokenService.createToken(user);
    const [payload, sig] = token.split('.');

    // Sửa signature
    const tamperedSig = sig!.slice(0, -2) + 'aa';
    expect(tokenService.verifyToken(`${payload}.${tamperedSig}`)).toBeNull();

    // Sửa payload
    const tamperedPayload = payload!.slice(0, -2) + 'bb';
    expect(tokenService.verifyToken(`${tamperedPayload}.${sig}`)).toBeNull();

    // Token không đúng định dạng
    expect(tokenService.verifyToken('invalid-token')).toBeNull();
  });

  it('rejects expired token', async () => {
    const user = {
      id: '01HR0000000000000000000003',
      username: 'teacher_expired',
      role: 'teacher' as const,
    };

    // Tạo token có hạn 10ms
    const shortLivedToken = tokenService.createToken(user, 10);
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(tokenService.verifyToken(shortLivedToken)).toBeNull();
  });
});
