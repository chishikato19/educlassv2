import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('UserRepository (Sample Repository)', () => {
  it('creates user with auto-generated ULID and retrieves by id or username', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);

      const created = await userRepo.create({
        username: 'gv_huong',
        passwordHash: 'hash_secret_pwd',
        displayName: 'Cô Hường',
        role: 'teacher',
      });

      expect(created.id).toBeDefined();
      expect(created.id.length).toBe(26); // Chuẩn độ dài ULID
      expect(created.username).toBe('gv_huong');
      expect(created.displayName).toBe('Cô Hường');
      expect(created.role).toBe('teacher');
      expect(created.active).toBe(true);

      const byId = await userRepo.findById(created.id);
      expect(byId).not.toBeNull();
      expect(byId?.username).toBe('gv_huong');

      const byUsername = await userRepo.findByUsername('gv_huong');
      expect(byUsername).not.toBeNull();
      expect(byUsername?.id).toBe(created.id);
    } finally {
      close();
    }
  });

  it('lists all users and updates display name', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);

      await userRepo.create({
        username: 'admin_root',
        passwordHash: 'hash_root',
        displayName: 'Admin Trường',
        role: 'admin',
      });

      await userRepo.create({
        username: 'gv_minh',
        passwordHash: 'hash_minh',
        displayName: 'Thầy Minh',
        role: 'teacher',
      });

      const all = await userRepo.listAll();
      expect(all).toHaveLength(2);

      const foundMinh = await userRepo.findByUsername('gv_minh');
      expect(foundMinh).not.toBeNull();

      const updated = await userRepo.updateDisplayName(foundMinh!.id, 'Thầy Nguyễn Văn Minh');
      expect(updated?.displayName).toBe('Thầy Nguyễn Văn Minh');
    } finally {
      close();
    }
  });

  it('updates password hash and active status, counts admins and users', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);

      const admin = await userRepo.create({
        username: 'admin_01',
        passwordHash: 'hash_admin_old',
        displayName: 'Quản trị viên',
        role: 'admin',
      });

      const teacher = await userRepo.create({
        username: 'gv_hoa',
        passwordHash: 'hash_hoa_old',
        displayName: 'Cô Hoa',
        role: 'teacher',
      });

      expect(await userRepo.countUsers()).toBe(2);
      expect(await userRepo.countAdmins()).toBe(1);

      // Cập nhật mật khẩu
      const updatedTeacher = await userRepo.updatePasswordHash(teacher.id, 'hash_hoa_new');
      expect(updatedTeacher?.passwordHash).toBe('hash_hoa_new');

      // Khóa tài khoản giáo viên
      const lockedTeacher = await userRepo.updateActive(teacher.id, false);
      expect(lockedTeacher?.active).toBe(false);

      // Thử khóa admin và kiểm tra countAdmins
      await userRepo.updateActive(admin.id, false);
      expect(await userRepo.countAdmins(true)).toBe(0); // Không còn admin active nào
      expect(await userRepo.countAdmins(false)).toBe(1); // Tổng số admin vẫn là 1

      // Kích hoạt lại admin
      await userRepo.updateActive(admin.id, true);
      expect(await userRepo.countAdmins(true)).toBe(1);

      // Xóa giáo viên
      const deleted = await userRepo.deleteById(teacher.id);
      expect(deleted).toBe(true);
      expect(await userRepo.countUsers()).toBe(1);
    } finally {
      close();
    }
  });
});
