import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  ErrorCodeSchema,
  formatProtocolError,
  ProtocolErrorPayloadSchema,
} from '../errors.js';

describe('Protocol Errors', () => {
  it('defines standard error codes from PLAN.md', () => {
    expect(ERROR_CODES.NAME_TAKEN).toBe('NAME_TAKEN');
    expect(ERROR_CODES.SESSION_CLOSED).toBe('SESSION_CLOSED');
    expect(ERROR_CODES.BAD_CODE).toBe('BAD_CODE');
    expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
  });

  it('validates known error codes with ErrorCodeSchema', () => {
    expect(ErrorCodeSchema.parse('NAME_TAKEN')).toBe('NAME_TAKEN');
    expect(ErrorCodeSchema.parse('BAD_CODE')).toBe('BAD_CODE');
    expect(ErrorCodeSchema.parse('SESSION_CLOSED')).toBe('SESSION_CLOSED');
    expect(ErrorCodeSchema.parse('FORBIDDEN')).toBe('FORBIDDEN');
    expect(() => ErrorCodeSchema.parse('UNKNOWN_ERROR_CODE')).toThrow();
  });

  it('validates ProtocolErrorPayloadSchema', () => {
    const payload = {
      code: 'NAME_TAKEN',
      message: 'Tên này đang có bạn dùng trong phiên.',
      details: { requestedName: 'Nguyễn Văn A' },
    };
    const parsed = ProtocolErrorPayloadSchema.parse(payload);
    expect(parsed.code).toBe('NAME_TAKEN');
    expect(parsed.message).toBe('Tên này đang có bạn dùng trong phiên.');
  });

  it('formats protocol error with default Vietnamese message', () => {
    const errorPayload = formatProtocolError('NAME_TAKEN');
    expect(errorPayload.code).toBe('NAME_TAKEN');
    expect(typeof errorPayload.message).toBe('string');
    expect(errorPayload.message.length).toBeGreaterThan(0);
  });

  it('allows custom message override when formatting error', () => {
    const custom = 'Tên bị chiếm, vui lòng báo giáo viên';
    const errorPayload = formatProtocolError('NAME_TAKEN', custom);
    expect(errorPayload.message).toBe(custom);
  });
});
