import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { AuthError } from '../auth/auth-error.js';
import { AuthService } from '../auth/auth-service.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';
import { TokenService } from '../auth/token-service.js';

describe('AuthService', () => {
  function setupTest() {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite });
    const userRepo = new UserRepository(db);
    const passwordHasher = new ScryptPasswordHasher();
    const tokenService = new TokenService('auth-test-secret-key-32charslong!');
    const authService = new AuthService(userRepo, passwordHasher, tokenService);
    return { userRepo, passwordHasher, tokenService, authService, close };
  }

  it('ensures initial admin on empty database', async () => {
    const { authService, userRepo, close } = setupTest();
    try {
      expect(await userRepo.countUsers()).toBe(0);

      const created = await authService.ensureInitialAdmin('adminPassword123');
      expect(created).not.toBeNull();
      expect(created?.username).toBe('admin');
      expect(created?.role).toBe('admin');

      // Gọi lần 2 không tạo thêm
      const secondCall = await authService.ensureInitialAdmin();
      expect(secondCall).toBeNull();
      expect(await userRepo.countUsers()).toBe(1);
    } finally {
      close();
    }
  });

  it('logs in successfully with valid credentials', async () => {
    const { authService, close } = setupTest();
    try {
      await authService.ensureInitialAdmin('adminPass123');

      const loginResult = await authService.login({
        username: 'admin',
        password: 'adminPass123',
      });

      expect(loginResult.token).toBeDefined();
      expect(loginResult.user.username).toBe('admin');
      expect(loginResult.user.role).toBe('admin');

      // Xác thực session bằng token vừa nhận
      const sessionUser = await authService.validateSession(loginResult.token);
      expect(sessionUser).not.toBeNull();
      expect(sessionUser?.id).toBe(loginResult.user.id);
    } finally {
      close();
    }
  });

  it('throws INVALID_CREDENTIALS for wrong password or non-existing username', async () => {
    const { authService, close } = setupTest();
    try {
      await authService.ensureInitialAdmin('correctPassword');

      await expect(
        authService.login({
          username: 'admin',
          password: 'wrongPassword',
        })
      ).rejects.toThrowError(AuthError);

      await expect(
        authService.login({
          username: 'non_existing_user',
          password: 'anyPassword',
        })
      ).rejects.toThrowError(AuthError);
    } finally {
      close();
    }
  });

  it('throws ACCOUNT_LOCKED when user is inactive', async () => {
    const { authService, userRepo, close } = setupTest();
    try {
      const admin = await authService.ensureInitialAdmin('adminPass');
      // Khóa tài khoản
      await userRepo.updateActive(admin!.id, false);

      await expect(
        authService.login({
          username: 'admin',
          password: 'adminPass',
        })
      ).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
      });
    } finally {
      close();
    }
  });

  it('changes password successfully and validates with new password', async () => {
    const { authService, close } = setupTest();
    try {
      const admin = await authService.ensureInitialAdmin('initialPassword123');

      // Đổi mật khẩu
      await authService.changePassword(admin!.id, {
        oldPassword: 'initialPassword123',
        newPassword: 'brandNewPassword456',
      });

      // Mật khẩu cũ không còn đăng nhập được
      await expect(
        authService.login({
          username: 'admin',
          password: 'initialPassword123',
        })
      ).rejects.toThrowError(AuthError);

      // Mật khẩu mới đăng nhập thành công
      const newLogin = await authService.login({
        username: 'admin',
        password: 'brandNewPassword456',
      });
      expect(newLogin.user.username).toBe('admin');
    } finally {
      close();
    }
  });
});
