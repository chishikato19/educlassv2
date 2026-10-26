import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { ParticipantRepository } from '../repositories/participant-repository.js';
import { RewardRepository } from '../repositories/reward-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('RewardRepository (Task 1.9)', () => {
  it('creates log, lists logs, and performs atomic transaction updating student EXP & level', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });

    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const sessionRepo = new SessionRepository(conn.db);
    const participantRepo = new ParticipantRepository(conn.db);
    const rewardRepo = new RewardRepository(conn.db);

    const teacher = await userRepo.create({
      username: 'teacher_reward_test',
      passwordHash: 'hash',
      displayName: 'GV Test',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: '10A1',
      year: 2026,
    });

    const student = await studentRepo.create({
      classId: cls.id,
      fullName: 'Nguyễn Văn An',
      exp: 20,
      level: 1,
    });

    const session = await sessionRepo.create({
      ownerId: teacher.id,
      classId: cls.id,
      joinCode: '123123',
      status: 'open',
      identityMode: 'roster_or_guest',
      allowTeams: false,
      openedAt: Date.now(),
    });

    const participant = await participantRepo.create({
      sessionId: session.id,
      studentId: student.id,
      displayName: student.fullName,
      identityLevel: 'account',
      status: 'online',
      joinedAt: Date.now(),
    });

    // 1. Ghi nhận log đơn thuần
    const singleLog = await rewardRepo.createLog({
      sessionId: session.id,
      participantId: participant.id,
      studentId: null,
      exp: 10,
      reason: 'Tham gia lớp',
      persisted: false,
      ts: Date.now(),
    });
    expect(singleLog.id).toBeDefined();
    expect(singleLog.exp).toBe(10);
    expect(singleLog.persisted).toBe(false);

    // 2. Ghi nhận reward transaction nguyên tử (atomic): vừa lưu reward_log vừa cập nhật student
    const txLog = await rewardRepo.recordRewardTransaction({
      rewardLog: {
        sessionId: session.id,
        participantId: participant.id,
        studentId: student.id,
        exp: 30,
        reason: 'Làm đúng câu hỏi khó',
        persisted: true,
        ts: Date.now(),
      },
      studentUpdate: {
        studentId: student.id,
        exp: 50,
        level: 2,
      },
    });
    expect(txLog.id).toBeDefined();
    expect(txLog.persisted).toBe(true);
    expect(txLog.exp).toBe(30);

    // Kiểm tra học sinh đã được cập nhật EXP và Level trong CSDL
    const updatedStudent = await studentRepo.findById(student.id);
    expect(updatedStudent?.exp).toBe(50);
    expect(updatedStudent?.level).toBe(2);

    // 3. Kiểm tra các hàm list
    const sessionLogs = await rewardRepo.listBySessionId(session.id);
    expect(sessionLogs).toHaveLength(2);

    const studentLogs = await rewardRepo.listByStudentId(student.id);
    expect(studentLogs).toHaveLength(1);
    expect(studentLogs[0]?.id).toBe(txLog.id);

    const participantLogs = await rewardRepo.listByParticipantId(participant.id);
    expect(participantLogs).toHaveLength(2);
  });
});
