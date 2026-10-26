import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Auth REST Routes', () => {
  it('handles login, /me, change password and logout flow', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Thử đăng nhập sai mật khẩu
      const wrongLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'incorrectPassword',
        },
      });
      expect(wrongLoginRes.statusCode).toBe(401);
      const wrongLoginBody = JSON.parse(wrongLoginRes.body);
      expect(wrongLoginBody.error.code).toBe('INVALID_CREDENTIALS');

      // 2. Đăng nhập đúng với admin mặc định (admin/admin123)
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'admin123',
        },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(loginRes.body);
      expect(loginBody.token).toBeDefined();
      expect(loginBody.user.username).toBe('admin');

      const token = loginBody.token;

      // 3. Gọi /api/auth/me không có token -> 401
      const unauthMe = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(unauthMe.statusCode).toBe(401);

      // 4. Gọi /api/auth/me có Bearer token -> 200
      const authMe = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(authMe.statusCode).toBe(200);
      const authMeBody = JSON.parse(authMe.body);
      expect(authMeBody.user.username).toBe('admin');

      // 5. Đổi mật khẩu cá nhân
      const changePassRes = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          oldPassword: 'admin123',
          newPassword: 'newAdminPassword99',
        },
      });
      expect(changePassRes.statusCode).toBe(200);
      const changePassBody = JSON.parse(changePassRes.body);
      expect(changePassBody.success).toBe(true);

      // 6. Đăng nhập lại với mật khẩu mới
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'newAdminPassword99',
        },
      });
      expect(newLoginRes.statusCode).toBe(200);

      // 7. Đăng xuất
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(logoutRes.statusCode).toBe(200);
      const logoutBody = JSON.parse(logoutRes.body);
      expect(logoutBody.success).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('supports teacher self-registration, PIN 1234 login, change PIN, and reset PIN to 1234', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Giáo viên tự đăng ký tài khoản mới (PIN mặc định: 1234)
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register-teacher',
        payload: {
          username: 'mai.toan',
          displayName: 'Cô Nguyễn Mai',
          subject: 'Toán học',
        },
      });
      expect(regRes.statusCode).toBe(201);
      const regBody = JSON.parse(regRes.body);
      expect(regBody.user.username).toBe('mai.toan');
      expect(regBody.user.displayName).toBe('Cô Nguyễn Mai');
      expect(regBody.user.subject).toBe('Toán học');
      expect(regBody.user.role).toBe('teacher');

      const teacherId = regBody.user.id;

      // 2. Lấy danh sách giáo viên công khai cho màn hình chọn hồ sơ
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/auth/teachers',
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      expect(Array.isArray(listBody.teachers)).toBe(true);
      const found = listBody.teachers.find((t: { id: string }) => t.id === teacherId);
      expect(found).toBeDefined();
      expect(found.displayName).toBe('Cô Nguyễn Mai');
      expect(found.subject).toBe('Toán học');

      // 3. Đăng nhập bằng mã PIN mặc định 1234
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'mai.toan',
          password: '1234',
        },
      });
      expect(loginRes.statusCode).toBe(200);
      const loginBody = JSON.parse(loginRes.body);
      expect(loginBody.token).toBeDefined();
      expect(loginBody.user.displayName).toBe('Cô Nguyễn Mai');

      const teacherToken = loginBody.token;

      // 4. Giáo viên đổi mã PIN sang 5678
      const changePinRes = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          authorization: `Bearer ${teacherToken}`,
        },
        payload: {
          oldPassword: '1234',
          newPassword: '5678',
        },
      });
      expect(changePinRes.statusCode).toBe(200);

      // Đăng nhập lại bằng PIN mới 5678
      const newPinLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'mai.toan',
          password: '5678',
        },
      });
      expect(newPinLoginRes.statusCode).toBe(200);

      // PIN cũ 1234 giờ không dùng được nữa
      const oldPinLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'mai.toan',
          password: '1234',
        },
      });
      expect(oldPinLoginRes.statusCode).toBe(401);

      // 5. Quên mã PIN -> Đặt lại mã PIN về mặc định 1234 (Phương án 2)
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-pin',
        payload: {
          userId: teacherId,
        },
      });
      expect(resetRes.statusCode).toBe(200);
      const resetBody = JSON.parse(resetRes.body);
      expect(resetBody.success).toBe(true);

      // 6. Đăng nhập lại với mã PIN 1234 sau khi reset thành công
      const resetLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'mai.toan',
          password: '1234',
        },
      });
      expect(resetLoginRes.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
