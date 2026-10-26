import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ActivityDefinition } from '../activity/types.js';
import {
  validateActivityConfig,
  validateActivityResults,
  validateActivityState,
} from '../activity/validator.js';

describe('Activity Validators (packages/core)', () => {
  const dummyActivity: ActivityDefinition<
    { durationSec: number },
    { counter: number },
    { participantId: string; totalClicks: number }
  > = {
    id: 'clicker',
    name: 'Bấm Nút',
    version: 1,
    icon: '🔘',
    rewardTriggers: ['finish'],
    configSchema: z.object({ durationSec: z.number().min(5) }),
    stateSchema: z.object({ counter: z.number().int().nonnegative() }),
    resultSchema: z.object({
      participantId: z.string(),
      totalClicks: z.number().int().nonnegative(),
    }),
    server: {
      onStart: vi.fn(),
      onStudentIntent: vi.fn(),
      onTeacherIntent: vi.fn(),
      onEnd: vi.fn(),
    },
  };

  it('validates config schema successfully', () => {
    const config = validateActivityConfig(dummyActivity, { durationSec: 15 });
    expect(config.durationSec).toBe(15);
  });

  it('rejects invalid config schema', () => {
    expect(() => validateActivityConfig(dummyActivity, { durationSec: 1 })).toThrow();
  });

  it('validates state schema successfully', () => {
    const state = validateActivityState(dummyActivity, { counter: 42 });
    expect(state.counter).toBe(42);
  });

  it('rejects invalid state schema', () => {
    expect(() => validateActivityState(dummyActivity, { counter: -5 })).toThrow();
  });

  it('validates results list successfully', () => {
    const results = validateActivityResults(dummyActivity, [
      { participantId: 'p_1', totalClicks: 10 },
      { participantId: 'p_2', totalClicks: 20 },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]?.totalClicks).toBe(10);
  });

  it('rejects invalid results', () => {
    expect(() =>
      validateActivityResults(dummyActivity, [{ participantId: 'p_1', totalClicks: -1 }])
    ).toThrow();
  });
});
