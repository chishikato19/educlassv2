import { describe, expect, it } from 'vitest';
import { checkCoreProtocolCompatibility } from './index.js';

describe('checkCoreProtocolCompatibility', () => {
  it('returns true for compatible protocol version', () => {
    expect(checkCoreProtocolCompatibility(1)).toBe(true);
  });

  it('returns false for invalid version', () => {
    expect(checkCoreProtocolCompatibility(999)).toBe(false);
  });
});
