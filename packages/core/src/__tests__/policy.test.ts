import { describe, expect, it } from 'vitest';
import { getOwnerFilterId, hasResourceAccess } from '../auth/policy.js';

describe('Policy Access Control (D5 PLAN.md)', () => {
  const teacherA = { id: 'teacher_a_id', role: 'teacher' as const };
  const teacherB = { id: 'teacher_b_id', role: 'teacher' as const };
  const admin = { id: 'admin_id', role: 'admin' as const };

  const resourceOfA = { ownerId: 'teacher_a_id' };
  const resourceOfB = { ownerId: 'teacher_b_id' };

  describe('hasResourceAccess', () => {
    it('allows teacher to access their own resource', () => {
      expect(hasResourceAccess(teacherA, resourceOfA)).toBe(true);
      expect(hasResourceAccess(teacherB, resourceOfB)).toBe(true);
    });

    it('DENIES teacher from accessing another teacher resource (cross-access)', () => {
      expect(hasResourceAccess(teacherA, resourceOfB)).toBe(false);
      expect(hasResourceAccess(teacherB, resourceOfA)).toBe(false);
    });

    it('ALLOWS admin to access ANY resource (D5: admin thấy tất cả)', () => {
      expect(hasResourceAccess(admin, resourceOfA)).toBe(true);
      expect(hasResourceAccess(admin, resourceOfB)).toBe(true);
    });
  });

  describe('getOwnerFilterId', () => {
    it('returns own user ID for teachers to filter their own data', () => {
      expect(getOwnerFilterId(teacherA)).toBe('teacher_a_id');
      expect(getOwnerFilterId(teacherB)).toBe('teacher_b_id');
    });

    it('returns undefined for admin to query all data without filter', () => {
      expect(getOwnerFilterId(admin)).toBeUndefined();
    });
  });
});
