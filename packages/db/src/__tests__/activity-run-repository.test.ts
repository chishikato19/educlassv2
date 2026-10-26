import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseConnection, type EduClassDatabase } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ActivityRunRepository } from '../repositories/activity-run-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ParticipantRepository } from '../repositories/participant-repository.js';

describe('ActivityRunRepository (packages/db)', () => {
  let db: EduClassDatabase;
  let activityRunRepo: ActivityRunRepository;
  let sessionRepo: SessionRepository;
  let userRepo: UserRepository;
  let participantRepo: ParticipantRepository;
  let teacherId: string;
  let sessionId: string;
  let participantId: string;

  beforeEach(async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    db = conn.db;

    activityRunRepo = new ActivityRunRepository(db);
    sessionRepo = new SessionRepository(db);
    userRepo = new UserRepository(db);
    participantRepo = new ParticipantRepository(db);

    const teacher = await userRepo.create({
      username: 'teacher_act',
      displayName: 'Thầy Hoạt Động',
      passwordHash: 'hash',
      role: 'teacher',
    });
    teacherId = teacher.id;

    const session = await sessionRepo.create({
      ownerId: teacherId,
      joinCode: 'ACT123',
      status: 'open',
      identityMode: 'roster_or_guest',
      openedAt: Date.now(),
    });
    sessionId = session.id;

    const participant = await participantRepo.create({
      sessionId,
      displayName: 'Học sinh A',
      identityLevel: 'guest',
      status: 'online',
      joinedAt: Date.now(),
    });
    participantId = participant.id;
  });

  it('creates, finds, and updates an activity run lifecycle', async () => {
    // 1. Tạo lượt chạy mới
    const run = await activityRunRepo.createRun({
      sessionId,
      activityId: 'quick-poll',
      configJson: JSON.stringify({ question: 'Bạn có thích học không?' }),
      status: 'running',
    });

    expect(run.id).toBeDefined();
    expect(run.activityId).toBe('quick-poll');
    expect(run.status).toBe('running');
    expect(run.endedAt).toBeNull();

    // 2. Tìm lượt chạy đang active
    const activeRun = await activityRunRepo.findActiveRunBySessionId(sessionId);
    expect(activeRun?.id).toBe(run.id);

    // 3. Kết thúc lượt chạy
    const now = Date.now();
    const updated = await activityRunRepo.updateRunStatus(run.id, 'ended', now);
    expect(updated?.status).toBe('ended');
    expect(updated?.endedAt).toBe(now);

    // Không còn active run
    const noActive = await activityRunRepo.findActiveRunBySessionId(sessionId);
    expect(noActive).toBeNull();

    // 4. Lưu kết quả snapshot
    const results = await activityRunRepo.saveResults(run.id, [
      {
        participantId,
        scoreJson: JSON.stringify({ choice: 'Có' }),
        rank: 1,
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.runId).toBe(run.id);
    expect(results[0]?.rank).toBe(1);

    // 5. Truy vấn kết quả theo runId
    const foundResults = await activityRunRepo.findResultsByRunId(run.id);
    expect(foundResults).toHaveLength(1);
    expect(foundResults[0]?.participantId).toBe(participantId);

    // 6. Truy vấn danh sách tất cả các lượt chạy trong phiên
    const allRuns = await activityRunRepo.listRunsBySessionId(sessionId);
    expect(allRuns).toHaveLength(1);
    expect(allRuns[0]?.id).toBe(run.id);
  });
});
