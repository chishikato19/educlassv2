import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Admin REST Routes', () => {
  it('enforces RBAC and allows admin to create, lock, unlock, and reset teacher password', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập với admin
      const adminLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'admin123',
        },
      });
      const adminToken = JSON.parse(adminLoginRes.body).token;

      // 2. Admin tạo tài khoản giáo viên mới
      const createTeacherRes = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          username: 'gv_huong',
          password: 'teacherPass123',
          displayName: 'Cô Hường',
          role: 'teacher',
        },
      });
      expect(createTeacherRes.statusCode).toBe(201);
      const teacherUser = JSON.parse(createTeacherRes.body).user;
      expect(teacherUser.username).toBe('gv_huong');

      // 3. Giáo viên đăng nhập
      const teacherLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'gv_huong',
          password: 'teacherPass123',
        },
      });
      expect(teacherLoginRes.statusCode).toBe(200);
      const teacherToken = JSON.parse(teacherLoginRes.body).token;

      // 4. Giáo viên KHÔNG ĐƯỢC PHÉP truy cập API Admin -> 403 Forbidden
      const forbiddenRes = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${teacherToken}`,
        },
      });
      expect(forbiddenRes.statusCode).toBe(403);
      const forbiddenBody = JSON.parse(forbiddenRes.body);
      expect(forbiddenBody.error.code).toBe('FORBIDDEN');

      // 5. Admin lấy danh sách người dùng -> 200
      const listUsersRes = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(listUsersRes.statusCode).toBe(200);
      const listBody = JSON.parse(listUsersRes.body);
      expect(listBody.users.length).toBeGreaterThanOrEqual(2);

      // 6. Admin khóa tài khoản giáo viên
      const lockRes = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${teacherUser.id}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          active: false,
        },
      });
      expect(lockRes.statusCode).toBe(200);
      expect(JSON.parse(lockRes.body).user.active).toBe(false);

      // 7. Giáo viên bị khóa cố gắng đăng nhập -> 403 ACCOUNT_LOCKED
      const lockedLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'gv_huong',
          password: 'teacherPass123',
        },
      });
      expect(lockedLoginRes.statusCode).toBe(403);
      expect(JSON.parse(lockedLoginRes.body).error.code).toBe('ACCOUNT_LOCKED');

      // 8. Admin mở khóa và reset mật khẩu cho giáo viên
      const unlockRes = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${teacherUser.id}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          active: true,
        },
      });
      expect(unlockRes.statusCode).toBe(200);

      const resetPassRes = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${teacherUser.id}/reset-password`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          newPassword: 'resetNewPass999',
        },
      });
      expect(resetPassRes.statusCode).toBe(200);

      // 9. Giáo viên đăng nhập thành công bằng mật khẩu đã được admin reset
      const postResetLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'gv_huong',
          password: 'resetNewPass999',
        },
      });
      expect(postResetLoginRes.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
