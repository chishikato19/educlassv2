import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { RewardRepository } from '../repositories/reward-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { ParticipantRepository } from '../repositories/participant-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('RewardRules Repository (Task 3.2 DB)', () => {
  let rewardRepo: RewardRepository;
  let sessionRepo: SessionRepository;
  let participantRepo: ParticipantRepository;
  let userRepo: UserRepository;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    rewardRepo = new RewardRepository(conn.db);
    sessionRepo = new SessionRepository(conn.db);
    participantRepo = new ParticipantRepository(conn.db);
    userRepo = new UserRepository(conn.db);
  });

  it('seeds and retrieves global reward rules properly', async () => {
    const defaults = [
      { activityId: null, trigger: 'session_cap', exp: 200, enabled: true },
      { activityId: 'quiz_live', trigger: 'correct', exp: 10, enabled: true },
      { activityId: 'quiz_live', trigger: 'activity_cap', exp: 100, enabled: true },
    ];

    const seeded = await rewardRepo.seedGlobalRules(defaults);
    expect(seeded).toHaveLength(3);

    // Seed lại không bị nhân bản
    const secondSeed = await rewardRepo.seedGlobalRules(defaults);
    expect(secondSeed).toHaveLength(3);

    const globals = await rewardRepo.getGlobalRules();
    expect(globals).toHaveLength(3);
    expect(globals.every(r => r.scope === 'global')).toBe(true);
  });

  it('manages teacher rules (set, get, reset) with atomic transactions', async () => {
    const teacher = await userRepo.create({
      username: 'teacher_exp',
      passwordHash: 'hash123',
      displayName: 'Thầy Hưng',
      role: 'teacher',
    });

    // 1. Giáo viên đặt quy tắc tùy biến
    const teacherCustomRules = [
      { activityId: 'quiz_live', trigger: 'correct', exp: 25, enabled: true },
      { activityId: 'quiz_live', trigger: 'activity_cap', exp: 80, enabled: true },
      { activityId: null, trigger: 'session_cap', exp: 150, enabled: true },
    ];

    const saved = await rewardRepo.setTeacherRules(teacher.id, teacherCustomRules);
    expect(saved).toHaveLength(3);
    expect(saved.every(r => r.ownerId === teacher.id && r.scope === 'teacher')).toBe(true);

    const quizRule = saved.find(r => r.activityId === 'quiz_live' && r.trigger === 'correct');
    expect(quizRule?.exp).toBe(25);

    // 2. Giáo viên cập nhật lại bộ quy tắc (thay thế)
    const updatedRules = [{ activityId: 'quiz_live', trigger: 'correct', exp: 30, enabled: true }];
    const updated = await rewardRepo.setTeacherRules(teacher.id, updatedRules);
    expect(updated).toHaveLength(1);
    expect(updated[0]?.exp).toBe(30);

    // 3. Khôi phục mặc định (reset)
    await rewardRepo.resetTeacherRules(teacher.id);
    const afterReset = await rewardRepo.getTeacherRules(teacher.id);
    expect(afterReset).toHaveLength(0);
  });

  it('calculates participant exp totals for session and activity caps accurately', async () => {
    const teacher = await userRepo.create({
      username: 'teacher_caps',
      passwordHash: 'hash123',
      displayName: 'Cô Lan',
      role: 'teacher',
    });

    const session = await sessionRepo.create({
      joinCode: '888999',
      ownerId: teacher.id,
      identityMode: 'guest_only',
      allowTeams: false,
      openedAt: Date.now(),
    });

    const participant = await participantRepo.create({
      sessionId: session.id,
      identityLevel: 'guest',
      displayName: 'Học sinh A',
      joinedAt: Date.now(),
    });

    // Tạo các bản ghi reward_log
    await rewardRepo.createLog({
      sessionId: session.id,
      participantId: participant.id,
      exp: 10,
      reason: 'Hoạt động quiz_live: correct',
      persisted: false,
      ts: Date.now(),
    });

    await rewardRepo.createLog({
      sessionId: session.id,
      participantId: participant.id,
      exp: 20,
      reason: 'Hoạt động quiz_live: complete',
      persisted: false,
      ts: Date.now(),
    });

    await rewardRepo.createLog({
      sessionId: session.id,
      participantId: participant.id,
      exp: 5,
      reason: 'Hoạt động quick_poll: participate',
      persisted: false,
      ts: Date.now(),
    });

    // Kiểm tra tổng EXP
    const totalsQuiz = await rewardRepo.getParticipantExpTotals(
      session.id,
      participant.id,
      'quiz_live'
    );
    expect(totalsQuiz.sessionExp).toBe(35); // 10 + 20 + 5
    expect(totalsQuiz.activityExp).toBe(30); // 10 + 20

    const totalsPoll = await rewardRepo.getParticipantExpTotals(
      session.id,
      participant.id,
      'quick_poll'
    );
    expect(totalsPoll.sessionExp).toBe(35);
    expect(totalsPoll.activityExp).toBe(5);
  });
});
