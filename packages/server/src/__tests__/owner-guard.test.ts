import { describe, expect, it } from 'vitest';
import { AuthError } from '../auth/auth-error.js';
import { assertOwnerAccess } from '../auth/owner-guard.js';

describe('assertOwnerAccess (Unit Test)', () => {
  const teacherA = {
    id: 'gv_a_id',
    username: 'gv_a',
    displayName: 'Cô A',
    role: 'teacher' as const,
    active: true,
    createdAt: Date.now(),
  };

  const teacherB = {
    id: 'gv_b_id',
    username: 'gv_b',
    displayName: 'Thầy B',
    role: 'teacher' as const,
    active: true,
    createdAt: Date.now(),
  };

  const admin = {
    id: 'admin_id',
    username: 'admin',
    displayName: 'Quản trị viên',
    role: 'admin' as const,
    active: true,
    createdAt: Date.now(),
  };

  const resourceOfA = { ownerId: 'gv_a_id' };
  const resourceOfB = { ownerId: 'gv_b_id' };

  it('allows teacher to access own resource', () => {
    expect(() => assertOwnerAccess(teacherA, resourceOfA)).not.toThrow();
    expect(() => assertOwnerAccess(teacherB, resourceOfB)).not.toThrow();
  });

  it('throws 403 FORBIDDEN when teacher attempts cross-access to another teacher resource', () => {
    expect(() => assertOwnerAccess(teacherA, resourceOfB)).toThrowError(AuthError);
    try {
      assertOwnerAccess(teacherA, resourceOfB);
    } catch (err) {
      const authErr = err as AuthError;
      expect(authErr.code).toBe('FORBIDDEN');
      expect(authErr.statusCode).toBe(403);
    }
  });

  it('allows admin to access any teacher resource (D5 PLAN.md)', () => {
    expect(() => assertOwnerAccess(admin, resourceOfA)).not.toThrow();
    expect(() => assertOwnerAccess(admin, resourceOfB)).not.toThrow();
  });

  it('throws 404 when resource does not exist', () => {
    expect(() => assertOwnerAccess(teacherA, null)).toThrowError(AuthError);
    try {
      assertOwnerAccess(teacherA, null);
    } catch (err) {
      const authErr = err as AuthError;
      expect(authErr.statusCode).toBe(404);
    }
  });
});
