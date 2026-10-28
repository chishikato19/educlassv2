import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  ErrorCodeSchema,
  EnvelopeSchema,
  IdentityLevelSchema,
  IdentityModeSchema,
  ParticipantStatusSchema,
  ProtocolVersionSchema,
  SessionStatusSchema,
  UserRoleSchema,
  APP_VERSION,
  EDUCLASS_VERSION,
  DEFAULT_DISCOVERY_PORT,
  DiscoveryBeaconPayloadSchema,
} from './index.js';

describe('packages/protocol exports', () => {
  it('exports all core schemas and enums', () => {
    expect(ProtocolVersionSchema).toBeDefined();
    expect(EnvelopeSchema).toBeDefined();
    expect(UserRoleSchema).toBeDefined();
    expect(SessionStatusSchema).toBeDefined();
    expect(IdentityModeSchema).toBeDefined();
    expect(IdentityLevelSchema).toBeDefined();
    expect(ParticipantStatusSchema).toBeDefined();
    expect(ErrorCodeSchema).toBeDefined();
    expect(ERROR_CODES.BAD_CODE).toBe('BAD_CODE');
    expect(APP_VERSION).toBe('2.2.22');
    expect(EDUCLASS_VERSION).toBe('2.2.22');
    expect(DEFAULT_DISCOVERY_PORT).toBe(54321);
    expect(DiscoveryBeaconPayloadSchema).toBeDefined();

    const validBeacon = {
      v: 1,
      type: 'SESSION_OPEN',
      sessionId: 'sess_123',
      joinCode: '123456',
      serverUrl: 'http://192.168.1.15:3000',
      teacherName: 'Thầy Tuấn',
      className: 'Lớp 8A',
      timestamp: Date.now(),
    };
    expect(DiscoveryBeaconPayloadSchema.safeParse(validBeacon).success).toBe(true);
  });
});
