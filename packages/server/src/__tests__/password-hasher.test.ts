import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('hashes a password and verifies correctly', async () => {
    const raw = 'mySecretPassword123';
    const hash = await hasher.hash(raw);

    expect(hash.startsWith('scrypt:')).toBe(true);
    const isValid = await hasher.verify(raw, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const raw = 'correctPassword';
    const hash = await hasher.hash(raw);

    const isWrong = await hasher.verify('wrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('handles invalid or corrupted hash format safely', async () => {
    expect(await hasher.verify('test', 'not_a_valid_hash')).toBe(false);
    expect(await hasher.verify('test', 'scrypt:short')).toBe(false);
    expect(await hasher.verify('test', 'scrypt:bad_salt:bad_key')).toBe(false);
  });
});
