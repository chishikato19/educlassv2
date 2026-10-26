import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { classes, users } from '../schema/index.js';

describe('Database Schema & Constraints', () => {
  it('applies initial schema and enables foreign key enforcement', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });

      // Chèn 1 giáo viên
      await db.insert(users).values({
        id: '01H7XTESTUSER000000000001',
        username: 'gv_an',
        passwordHash: 'hash123',
        displayName: 'Thầy An',
        role: 'teacher',
        createdAt: Date.now(),
      });

      // Chèn lớp học hợp lệ thuộc giáo viên đó
      await db.insert(classes).values({
        id: '01H7XTESTCLASS00000000001',
        ownerId: '01H7XTESTUSER000000000001',
        name: '12A1',
        year: 2026,
        createdAt: Date.now(),
      });

      const foundClasses = await db.select().from(classes);
      expect(foundClasses).toHaveLength(1);
      expect(foundClasses[0]?.name).toBe('12A1');

      // Thử chèn lớp học với owner_id không tồn tại -> bắt buộc ném lỗi FOREIGN KEY constraint
      await expect(
        db.insert(classes).values({
          id: '01H7XTESTCLASS00000000002',
          ownerId: 'NON_EXISTENT_USER',
          name: '12A2',
          year: 2026,
          createdAt: Date.now(),
        })
      ).rejects.toThrow(/FOREIGN KEY/i);
    } finally {
      close();
    }
  });

  it('enforces unique constraints on username', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });

      await db.insert(users).values({
        id: '01H7XTESTUSER000000000002',
        username: 'trung_ten',
        passwordHash: 'hash',
        displayName: 'Tên 1',
        role: 'teacher',
        createdAt: Date.now(),
      });

      await expect(
        db.insert(users).values({
          id: '01H7XTESTUSER000000000003',
          username: 'trung_ten',
          passwordHash: 'hash2',
          displayName: 'Tên 2',
          role: 'teacher',
          createdAt: Date.now(),
        })
      ).rejects.toThrow(/UNIQUE constraint failed/i);
    } finally {
      close();
    }
  });
});
