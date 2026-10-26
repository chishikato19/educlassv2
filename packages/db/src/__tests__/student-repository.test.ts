import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('StudentRepository', () => {
  it('creates, lists, updates, and deletes students', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_mai',
        passwordHash: 'hash_mai',
        displayName: 'Cô Mai',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '12A1',
        year: 2026,
      });

      // Tạo đơn lẻ
      const student1 = await studentRepo.create({
        classId: cls.id,
        fullName: 'Nguyễn Văn An',
        code: 'HS001',
        passwordHash: 'pin_hash_1',
      });

      expect(student1.id).toBeDefined();
      expect(student1.fullName).toBe('Nguyễn Văn An');
      expect(student1.code).toBe('HS001');
      expect(student1.exp).toBe(0);
      expect(student1.level).toBe(1);

      // Tạo hàng loạt (createMany)
      const batch = await studentRepo.createMany([
        { classId: cls.id, fullName: 'Trần Thị Bích', code: 'HS002' },
        { classId: cls.id, fullName: 'Lê Văn Cường', code: 'HS003' },
      ]);
      expect(batch).toHaveLength(2);

      // Đếm và liệt kê
      expect(await studentRepo.countByClassId(cls.id)).toBe(3);
      const allStudents = await studentRepo.listByClassId(cls.id);
      expect(allStudents).toHaveLength(3);

      // Cập nhật thông tin học sinh
      const updated = await studentRepo.update(student1.id, {
        fullName: 'Nguyễn Văn An (Trưởng lớp)',
      });
      expect(updated?.fullName).toBe('Nguyễn Văn An (Trưởng lớp)');

      // Đặt lại PIN
      const pinUpdated = await studentRepo.updatePin(student1.id, 'new_pin_hash');
      expect(pinUpdated?.passwordHash).toBe('new_pin_hash');

      // Reset / Xóa PIN
      const pinCleared = await studentRepo.updatePin(student1.id, null);
      expect(pinCleared?.passwordHash).toBeNull();

      // Xóa 1 học sinh
      const deleted = await studentRepo.deleteById(student1.id);
      expect(deleted).toBe(true);
      expect(await studentRepo.countByClassId(cls.id)).toBe(2);

      // Xóa toàn bộ học sinh trong lớp
      const countDeleted = await studentRepo.deleteByClassId(cls.id);
      expect(countDeleted).toBe(2);
      expect(await studentRepo.countByClassId(cls.id)).toBe(0);
    } finally {
      close();
    }
  });
});
