import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createEnvelope,
  createEnvelopeSchema,
  EnvelopeSchema,
  PROTOCOL_VERSION,
} from '../envelope.js';

describe('Protocol Envelope', () => {
  it('validates standard envelope format {v: 1, id, type, sessionId, ts, payload}', () => {
    const raw = {
      v: 1,
      id: 'msg-01H7X9',
      type: 'intent:join',
      sessionId: 'sess-01H7X9',
      ts: 1718000000000,
      payload: { code: '123456' },
    };

    const parsed = EnvelopeSchema.parse(raw);
    expect(parsed.v).toBe(1);
    expect(parsed.id).toBe('msg-01H7X9');
    expect(parsed.type).toBe('intent:join');
    expect(parsed.sessionId).toBe('sess-01H7X9');
    expect(parsed.ts).toBe(1718000000000);
    expect(parsed.payload).toEqual({ code: '123456' });
  });

  it('allows nullable sessionId when not yet associated with a session', () => {
    const raw = {
      v: 1,
      id: 'msg-01',
      type: 'ping',
      sessionId: null,
      ts: Date.now(),
      payload: {},
    };

    const parsed = EnvelopeSchema.parse(raw);
    expect(parsed.sessionId).toBeNull();
  });

  it('rejects envelope with invalid version', () => {
    const raw = {
      v: 2,
      id: 'msg-01',
      type: 'ping',
      sessionId: null,
      ts: Date.now(),
      payload: {},
    };

    expect(() => EnvelopeSchema.parse(raw)).toThrow();
  });

  it('rejects envelope with empty id or empty type', () => {
    expect(() =>
      EnvelopeSchema.parse({
        v: 1,
        id: '',
        type: 'ping',
        sessionId: null,
        ts: Date.now(),
        payload: {},
      })
    ).toThrow();

    expect(() =>
      EnvelopeSchema.parse({
        v: 1,
        id: 'msg-01',
        type: '',
        sessionId: null,
        ts: Date.now(),
        payload: {},
      })
    ).toThrow();
  });

  it('supports typed payload validation with createEnvelopeSchema', () => {
    const CustomPayloadSchema = z.object({
      answerIndex: z.number().int().min(0).max(3),
    });

    const CustomEnvelopeSchema = createEnvelopeSchema(CustomPayloadSchema);

    const valid = {
      v: 1,
      id: 'msg-ans-1',
      type: 'intent:submit_answer',
      sessionId: 'sess-1',
      ts: Date.now(),
      payload: { answerIndex: 2 },
    };

    const parsed = CustomEnvelopeSchema.parse(valid);
    expect(parsed.payload.answerIndex).toBe(2);

    const invalid = {
      ...valid,
      payload: { answerIndex: 5 },
    };

    expect(() => CustomEnvelopeSchema.parse(invalid)).toThrow();
  });

  it('createEnvelope factory function creates valid envelope with current timestamp', () => {
    const env = createEnvelope({
      id: 'msg-test-1',
      type: 'intent:ping',
      sessionId: 'sess-123',
      payload: { foo: 'bar' },
    });

    expect(env.v).toBe(PROTOCOL_VERSION);
    expect(env.id).toBe('msg-test-1');
    expect(env.type).toBe('intent:ping');
    expect(env.sessionId).toBe('sess-123');
    expect(env.payload).toEqual({ foo: 'bar' });
    expect(typeof env.ts).toBe('number');
    expect(env.ts).toBeGreaterThan(0);
  });
});
