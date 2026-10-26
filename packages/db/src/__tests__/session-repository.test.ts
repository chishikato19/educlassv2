import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('SessionRepository (Task 1.5)', () => {
  it('supports creating, finding active sessions, and updating session status', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const sessionRepo = new SessionRepository(db);

      const teacher1 = await userRepo.create({
        username: 'teacher_01',
        passwordHash: 'hash_01',
        displayName: 'Thầy Hùng',
        role: 'teacher',
      });

      const teacher2 = await userRepo.create({
        username: 'teacher_02',
        passwordHash: 'hash_02',
        displayName: 'Cô Lan',
        role: 'teacher',
      });

      const class1 = await classRepo.create({
        ownerId: teacher1.id,
        name: '12A1',
        year: 2026,
      });

      // 1. GV1 mở phiên có chọn lớp
      const session1 = await sessionRepo.create({
        ownerId: teacher1.id,
        classId: class1.id,
        joinCode: '112233',
        status: 'open',
        identityMode: 'roster_only',
        allowTeams: false,
        openedAt: 1000,
      });

      expect(session1.id).toBeDefined();
      expect(session1.status).toBe('open');
      expect(session1.classId).toBe(class1.id);

      // 2. GV2 mở phiên tự do (không chọn lớp) - D4: nhiều phiên đồng thời
      const session2 = await sessionRepo.create({
        ownerId: teacher2.id,
        classId: null,
        joinCode: '445566',
        status: 'open',
        identityMode: 'guest_only',
        allowTeams: true,
        openedAt: 1050,
      });

      expect(session2.id).toBeDefined();
      expect(session2.classId).toBeNull();
      expect(session2.joinCode).toBe('445566');

      // 3. Tra cứu phiên active theo ownerId
      const active1 = await sessionRepo.findActiveByOwnerId(teacher1.id);
      expect(active1?.id).toBe(session1.id);

      const active2 = await sessionRepo.findActiveByOwnerId(teacher2.id);
      expect(active2?.id).toBe(session2.id);

      // 4. Tra cứu theo joinCode
      const foundByCode = await sessionRepo.findActiveByJoinCode('112233');
      expect(foundByCode?.id).toBe(session1.id);

      // 5. Liệt kê các phiên active và mã active
      const activeList = await sessionRepo.listActiveSessions();
      expect(activeList).toHaveLength(2);

      const activeCodes = await sessionRepo.listActiveJoinCodes();
      expect(activeCodes.has('112233')).toBe(true);
      expect(activeCodes.has('445566')).toBe(true);

      // 6. Cập nhật trạng thái sang closing rồi closed
      const closing = await sessionRepo.updateStatus(session1.id, 'closing');
      expect(closing.status).toBe('closing');

      const closed = await sessionRepo.updateStatus(session1.id, 'closed', 2000);
      expect(closed.status).toBe('closed');
      expect(closed.closedAt).toBe(2000);

      // Sau khi đóng, GV1 không còn phiên active nào
      const noActive1 = await sessionRepo.findActiveByOwnerId(teacher1.id);
      expect(noActive1).toBeNull();

      // Không tìm thấy theo code của phiên đã đóng
      const notFoundClosed = await sessionRepo.findActiveByJoinCode('112233');
      expect(notFoundClosed).toBeNull();
    } finally {
      close();
    }
  });
});
