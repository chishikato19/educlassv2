import { describe, expect, it } from 'vitest';
import { generateJoinCode, isValidJoinCode } from '../session/join-code.js';

describe('Join Code Generator & Validator (Task 1.5)', () => {
  it('validates 6-digit codes correctly', () => {
    expect(isValidJoinCode('123456')).toBe(true);
    expect(isValidJoinCode('999999')).toBe(true);
    expect(isValidJoinCode('100000')).toBe(true);

    expect(isValidJoinCode('12345')).toBe(false); // 5 digits
    expect(isValidJoinCode('1234567')).toBe(false); // 7 digits
    expect(isValidJoinCode('12345a')).toBe(false); // contains letter
    expect(isValidJoinCode('')).toBe(false);
  });

  it('generates a valid 6-digit join code within [100000, 999999]', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode();
      expect(isValidJoinCode(code)).toBe(true);
      const num = Number(code);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('avoids colliding with existing active session codes', () => {
    const code1 = String(Math.floor(0.1 * 900000) + 100000); // '190000'
    const code2 = String(Math.floor(0.5 * 900000) + 100000); // '550000'
    const existing = new Set([code1]);

    let call = 0;
    const mockRng = () => {
      call++;
      if (call === 1) return 0.1; // Trùng với code1 trong existing
      return 0.5; // Mã mới code2
    };

    const code = generateJoinCode(existing, mockRng);
    expect(code).toBe(code2);
    expect(existing.has(code)).toBe(false);
  });
});
