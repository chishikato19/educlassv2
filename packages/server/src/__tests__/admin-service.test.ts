import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { AdminService } from '../auth/admin-service.js';
import { AuthService } from '../auth/auth-service.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';
import { TokenService } from '../auth/token-service.js';

describe('AdminService', () => {
  function setupTest() {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite });
    const userRepo = new UserRepository(db);
    const passwordHasher = new ScryptPasswordHasher();
    const tokenService = new TokenService('admin-test-secret-key-32charslong!');
    const authService = new AuthService(userRepo, passwordHasher, tokenService);
    const adminService = new AdminService(userRepo, passwordHasher);
    return { userRepo, passwordHasher, tokenService, authService, adminService, close };
  }

  it('creates teacher, lists users, and rejects duplicate username', async () => {
    const { authService, adminService, close } = setupTest();
    try {
      await authService.ensureInitialAdmin('admin123');

      const teacher = await adminService.createUser({
        username: 'gv_tuan',
        password: 'password123',
        displayName: 'Thầy Tuấn',
        role: 'teacher',
      });

      expect(teacher.username).toBe('gv_tuan');
      expect(teacher.role).toBe('teacher');
      expect(teacher.active).toBe(true);

      const list = await adminService.listUsers();
      expect(list).toHaveLength(2); // admin + gv_tuan

      // Tạo trùng username
      await expect(
        adminService.createUser({
          username: 'gv_tuan',
          password: 'anotherPassword',
          displayName: 'Thầy Tuấn Trùng',
          role: 'teacher',
        })
      ).rejects.toMatchObject({
        code: 'USER_ALREADY_EXISTS',
      });
    } finally {
      close();
    }
  });

  it('locks and unlocks user status with safety guards', async () => {
    const { authService, adminService, close } = setupTest();
    try {
      const admin = await authService.ensureInitialAdmin('admin123');

      const teacher = await adminService.createUser({
        username: 'gv_nga',
        password: 'password123',
        displayName: 'Cô Nga',
        role: 'teacher',
      });

      // Admin khóa giáo viên
      const lockedTeacher = await adminService.updateUserStatus(
        teacher.id,
        { active: false },
        admin!.id
      );
      expect(lockedTeacher.active).toBe(false);

      // Admin mở khóa giáo viên
      const unlockedTeacher = await adminService.updateUserStatus(
        teacher.id,
        { active: true },
        admin!.id
      );
      expect(unlockedTeacher.active).toBe(true);

      // Admin không thể tự khóa tài khoản của chính mình
      await expect(
        adminService.updateUserStatus(admin!.id, { active: false }, admin!.id)
      ).rejects.toMatchObject({
        code: 'CANNOT_LOCK_SELF',
      });

      // Tạo admin thứ hai
      const admin2 = await adminService.createUser({
        username: 'admin_phu',
        password: 'adminPassword2',
        displayName: 'Admin Phụ',
        role: 'admin',
      });

      // Admin 1 có thể khóa admin 2 vì còn admin 1 hoạt động
      const lockedAdmin2 = await adminService.updateUserStatus(
        admin2.id,
        { active: false },
        admin!.id
      );
      expect(lockedAdmin2.active).toBe(false);

      // Không thể khóa admin 1 bởi vì hiện chỉ còn 1 admin active
      await expect(
        adminService.updateUserStatus(admin!.id, { active: false }, 'some-other-id')
      ).rejects.toMatchObject({
        code: 'CANNOT_LOCK_LAST_ADMIN',
      });
    } finally {
      close();
    }
  });

  it('resets user password allowing them to login with new password', async () => {
    const { authService, adminService, close } = setupTest();
    try {
      await authService.ensureInitialAdmin('admin123');

      const teacher = await adminService.createUser({
        username: 'gv_quang',
        password: 'initialSecretPassword',
        displayName: 'Thầy Quang',
        role: 'teacher',
      });

      // Admin reset mật khẩu cho giáo viên
      await adminService.resetUserPassword(teacher.id, {
        newPassword: 'resetPassword789',
      });

      // Giáo viên đăng nhập bằng mật khẩu mới
      const login = await authService.login({
        username: 'gv_quang',
        password: 'resetPassword789',
      });
      expect(login.user.username).toBe('gv_quang');

      // Mật khẩu cũ bị vô hiệu
      await expect(
        authService.login({
          username: 'gv_quang',
          password: 'initialSecretPassword',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    } finally {
      close();
    }
  });
});
