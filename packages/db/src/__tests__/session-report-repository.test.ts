import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { SessionReportRepository } from '../repositories/session-report-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('SessionReportRepository', () => {
  it('creates and finds session report snapshots by sessionId and id', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });

    const userRepo = new UserRepository(conn.db);
    const sessionRepo = new SessionRepository(conn.db);
    const reportRepo = new SessionReportRepository(conn.db);

    const user = await userRepo.create({
      username: 'teacher_test',
      passwordHash: 'hash123',
      displayName: 'Giáo viên Test',
      role: 'teacher',
    });

    const session = await sessionRepo.create({
      ownerId: user.id,
      joinCode: '112233',
      status: 'open',
      identityMode: 'roster_or_guest',
      allowTeams: true,
      openedAt: Date.now(),
    });

    const snapshotData = {
      sessionId: session.id,
      sessionCode: session.joinCode,
      totalParticipants: 5,
      onlineParticipants: 5,
      offlineParticipants: 0,
    };

    const report = await reportRepo.create({
      sessionId: session.id,
      snapshotJson: JSON.stringify(snapshotData),
      createdAt: Date.now(),
    });

    expect(report.id).toBeDefined();
    expect(report.sessionId).toBe(session.id);
    expect(JSON.parse(report.snapshotJson)).toEqual(snapshotData);

    const foundById = await reportRepo.findById(report.id);
    expect(foundById).not.toBeNull();
    expect(foundById?.id).toBe(report.id);

    const foundBySession = await reportRepo.findBySessionId(session.id);
    expect(foundBySession).not.toBeNull();
    expect(foundBySession?.id).toBe(report.id);

    const nonExistent = await reportRepo.findBySessionId('non_existent_session');
    expect(nonExistent).toBeNull();

    // Kiểm tra listByOwnerId và listAll
    const ownerReports = await reportRepo.listByOwnerId(user.id);
    expect(ownerReports.length).toBe(1);
    expect(ownerReports[0]?.sessionId).toBe(session.id);
    expect(ownerReports[0]?.sessionJoinCode).toBe('112233');

    const allReports = await reportRepo.listAll();
    expect(allReports.length).toBe(1);
    expect(allReports[0]?.sessionId).toBe(session.id);
  });
});
