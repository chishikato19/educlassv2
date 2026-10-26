import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('ClassRepository', () => {
  it('creates, retrieves, and filters classes by ownerId', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);

      const teacherA = await userRepo.create({
        username: 'gv_a',
        passwordHash: 'hash_a',
        displayName: 'Giáo viên A',
        role: 'teacher',
      });

      const teacherB = await userRepo.create({
        username: 'gv_b',
        passwordHash: 'hash_b',
        displayName: 'Giáo viên B',
        role: 'teacher',
      });

      // Tạo lớp cho GV A
      const classA1 = await classRepo.create({
        ownerId: teacherA.id,
        name: '10A1',
        year: 2026,
      });

      const classA2 = await classRepo.create({
        ownerId: teacherA.id,
        name: '10A2',
        year: 2026,
      });

      // Tạo lớp cho GV B
      const classB1 = await classRepo.create({
        ownerId: teacherB.id,
        name: '11B1',
        year: 2026,
      });

      expect(classA1.id).toBeDefined();
      expect(classA2.id).toBeDefined();
      expect(classB1.id).toBeDefined();

      // Lọc theo ownerId của GV A
      const classesOfA = await classRepo.list({ ownerId: teacherA.id });
      expect(classesOfA).toHaveLength(2);
      expect(classesOfA.map((c) => c.name)).toContain('10A1');
      expect(classesOfA.map((c) => c.name)).toContain('10A2');
      expect(classesOfA.map((c) => c.name)).not.toContain('11B1');

      // Lọc theo ownerId của GV B
      const classesOfB = await classRepo.list({ ownerId: teacherB.id });
      expect(classesOfB).toHaveLength(1);
      expect(classesOfB[0]?.name).toBe('11B1');

      // Không truyền filter (dành cho Admin)
      const allClasses = await classRepo.list();
      expect(allClasses).toHaveLength(3);

      // Cập nhật và xóa
      const updated = await classRepo.update(classA1.id, { name: '10A1 Chuyên Toán' });
      expect(updated?.name).toBe('10A1 Chuyên Toán');

      const deleted = await classRepo.deleteById(classA2.id);
      expect(deleted).toBe(true);

      const classesAfterDelete = await classRepo.list({ ownerId: teacherA.id });
      expect(classesAfterDelete).toHaveLength(1);
    } finally {
      close();
    }
  });
});
