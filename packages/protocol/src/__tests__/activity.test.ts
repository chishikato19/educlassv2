import { describe, expect, it } from 'vitest';
import {
  ActivityEndPayloadSchema,
  ActivityIntentPayloadSchema,
  ActivityMetaSchema,
  ActivityRejectSchema,
  ActivityRunDtoSchema,
  ActivityStartPayloadSchema,
  ActivityStatePayloadSchema,
  StartActivityRequestSchema,
} from '../activity.js';

describe('Activity Protocol Schemas (packages/protocol)', () => {
  it('validates ActivityMetaSchema correctly', () => {
    const meta = {
      id: 'quiz-live',
      name: 'Quiz Trực Tiếp',
      version: 1,
      icon: '⚡',
      description: 'Chơi câu hỏi trắc nghiệm tốc độ',
      capabilities: ['screen', 'chat-lock'],
      rewardTriggers: ['correct_answer', 'top3', 'finish'],
    };

    const parsed = ActivityMetaSchema.parse(meta);
    expect(parsed.id).toBe('quiz-live');
    expect(parsed.capabilities).toEqual(['screen', 'chat-lock']);
    expect(parsed.rewardTriggers).toContain('top3');
  });

  it('rejects invalid ActivityMetaSchema when missing required fields', () => {
    expect(() =>
      ActivityMetaSchema.parse({
        id: '',
        name: 'No icon',
      })
    ).toThrow();
  });

  it('validates ActivityRejectSchema and payload schemas', () => {
    const reject = ActivityRejectSchema.parse({
      ok: false,
      reason: 'Vòng chơi chưa bắt đầu',
      code: 'ROUND_NOT_STARTED',
    });
    expect(reject.ok).toBe(false);
    expect(reject.code).toBe('ROUND_NOT_STARTED');

    const startPayload = ActivityStartPayloadSchema.parse({
      runId: 'run_123',
      activityId: 'quiz-live',
      config: { timerSeconds: 30 },
      startedAt: Date.now(),
    });
    expect(startPayload.runId).toBe('run_123');

    const statePayload = ActivityStatePayloadSchema.parse({
      runId: 'run_123',
      activityId: 'quiz-live',
      state: { questionIndex: 0 },
      revision: 1,
      ts: Date.now(),
    });
    expect(statePayload.revision).toBe(1);

    const intentPayload = ActivityIntentPayloadSchema.parse({
      runId: 'run_123',
      intent: { type: 'submit_answer', answer: 2 },
    });
    expect(intentPayload.runId).toBe('run_123');

    const endPayload = ActivityEndPayloadSchema.parse({
      runId: 'run_123',
      activityId: 'quiz-live',
      results: [{ participantId: 'p_1', score: 100, rank: 1 }],
      endedAt: Date.now(),
    });
    expect(endPayload.results).toHaveLength(1);
  });

  it('validates ActivityRunDto and StartActivityRequest', () => {
    const runDto = ActivityRunDtoSchema.parse({
      id: 'run_abc',
      sessionId: 'sess_123',
      activityId: 'poll',
      config: {},
      status: 'running',
      startedAt: 1728000000000,
      endedAt: null,
    });
    expect(runDto.status).toBe('running');

    const req = StartActivityRequestSchema.parse({
      activityId: 'poll',
    });
    expect(req.activityId).toBe('poll');
    expect(req.config).toEqual({});
  });
});
