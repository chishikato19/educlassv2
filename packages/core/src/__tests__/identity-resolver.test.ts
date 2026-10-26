import { describe, expect, it } from 'vitest';
import {
  isNameTaken,
  resolveIdentityLevel,
} from '../identity/identity-resolver.js';

describe('Identity Resolver & Name Collision Check (D6 & D7, Task 1.6)', () => {
  describe('resolveIdentityLevel', () => {
    it('resolves to account when student has account, has PIN, and PIN verified', () => {
      const level = resolveIdentityLevel({
        hasStudentAccount: true,
        hasPin: true,
        isPinVerified: true,
        isGuest: false,
      });
      expect(level).toBe('account');
    });

    it('throws error when student has PIN but PIN is not verified', () => {
      expect(() =>
        resolveIdentityLevel({
          hasStudentAccount: true,
          hasPin: true,
          isPinVerified: false,
          isGuest: false,
        })
      ).toThrow(/Mã PIN không chính xác/i);
    });

    it('resolves to roster when student has account but no PIN configured', () => {
      const level = resolveIdentityLevel({
        hasStudentAccount: true,
        hasPin: false,
        isPinVerified: false,
        isGuest: false,
      });
      expect(level).toBe('roster');
    });

    it('resolves to guest when student is guest', () => {
      const level = resolveIdentityLevel({
        hasStudentAccount: false,
        hasPin: false,
        isPinVerified: false,
        isGuest: true,
      });
      expect(level).toBe('guest');
    });
  });

  describe('isNameTaken', () => {
    const participants = [
      { displayName: 'Nguyễn Văn An', status: 'online' as const },
      { displayName: 'Trần Thị Bích', status: 'offline' as const },
      { displayName: 'Lê Cường', status: 'online' as const },
    ];

    it('returns true when online participant has matching name (case-insensitive & whitespace-normalized)', () => {
      expect(isNameTaken('Nguyễn Văn An', participants)).toBe(true);
      expect(isNameTaken('  nguyễn   văn   an  ', participants)).toBe(true);
      expect(isNameTaken('Lê Cường', participants)).toBe(true);
    });

    it('returns false when participant with same name is offline', () => {
      // Học sinh Trần Thị Bích đang offline -> tên không bị chiếm, có thể vào lại
      expect(isNameTaken('Trần Thị Bích', participants)).toBe(false);
    });

    it('returns false for completely different name', () => {
      expect(isNameTaken('Phạm Văn Đạt', participants)).toBe(false);
    });
  });
});
