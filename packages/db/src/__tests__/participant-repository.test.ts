import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { ParticipantRepository } from '../repositories/participant-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { TeamRepository } from '../repositories/team-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('ParticipantRepository & TeamRepository (Task 1.6)', () => {
  it('manages participants and teams within a session', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const sessionRepo = new SessionRepository(db);
      const participantRepo = new ParticipantRepository(db);
      const teamRepo = new TeamRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_1',
        passwordHash: 'hash',
        displayName: 'Thầy Hùng',
        role: 'teacher',
      });

      const session = await sessionRepo.create({
        ownerId: teacher.id,
        joinCode: '112233',
        status: 'open',
        identityMode: 'roster_or_guest',
        allowTeams: true,
        openedAt: 1000,
      });

      // Tạo nhóm
      const team1 = await teamRepo.findOrCreate(session.id, 'Đội Rồng Lửa');
      expect(team1.name).toBe('Đội Rồng Lửa');

      // Tạo participant 1 trong nhóm
      const p1 = await participantRepo.create({
        sessionId: session.id,
        displayName: 'Nguyễn Văn An',
        identityLevel: 'roster',
        teamId: team1.id,
        status: 'online',
        joinedAt: 1010,
      });
      expect(p1.id).toBeDefined();
      expect(p1.displayName).toBe('Nguyễn Văn An');

      // Tạo participant 2 (khách, chưa nhóm)
      const p2 = await participantRepo.create({
        sessionId: session.id,
        displayName: 'Bé Hạt Dẻ',
        identityLevel: 'guest',
        status: 'online',
        joinedAt: 1020,
      });
      expect(p2.id).toBeDefined();

      // Kiểm tra danh sách participants của session
      const list = await participantRepo.listBySessionId(session.id);
      expect(list).toHaveLength(2);

      // Tra cứu theo displayName
      const foundP1 = await participantRepo.findBySessionAndDisplayName(
        session.id,
        'Nguyễn Văn An'
      );
      expect(foundP1?.id).toBe(p1.id);

      // Kiểm tra danh sách team kèm memberCount
      const teams = await teamRepo.listBySessionId(session.id);
      expect(teams).toHaveLength(1);
      expect(teams[0]?.memberCount).toBe(1);

      // Cho participant 2 vào cùng nhóm
      await participantRepo.updateTeam(p2.id, team1.id);
      const teamsUpdated = await teamRepo.listBySessionId(session.id);
      expect(teamsUpdated[0]?.memberCount).toBe(2);

      // Cập nhật trạng thái offline
      const p1Offline = await participantRepo.updateStatus(p1.id, 'offline', 2000);
      expect(p1Offline.status).toBe('offline');
      expect(p1Offline.leftAt).toBe(2000);

      // Member count online chỉ còn 1
      const teamsAfterOffline = await teamRepo.listBySessionId(session.id);
      expect(teamsAfterOffline[0]?.memberCount).toBe(1);

      // Task 1.2: Kiểm tra lưu trữ studentIdsJson cho nhóm học sinh 2-3 bạn trên 1 máy
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);
      const testClass = await classRepo.create({
        ownerId: teacher.id,
        name: 'Lớp 10A1',
        year: 2026,
      });
      const st1 = await studentRepo.create({
        classId: testClass.id,
        fullName: 'Nam Anh',
      });
      const st2 = await studentRepo.create({
        classId: testClass.id,
        fullName: 'Văn Bình',
      });

      const pPair = await participantRepo.create({
        sessionId: session.id,
        displayName: 'Nam Anh & Văn Bình',
        studentId: st1.id,
        studentIdsJson: JSON.stringify([st1.id, st2.id]),
        identityLevel: 'account',
        status: 'online',
        joinedAt: 3000,
      });
      expect(pPair.studentIdsJson).toBe(JSON.stringify([st1.id, st2.id]));

      const extractedIds = ParticipantRepository.getStudentIds(pPair);
      expect(extractedIds).toEqual([st1.id, st2.id]);

      // Tìm kiếm theo bất kỳ studentId nào
      const foundBySt2 = await participantRepo.findBySessionAndAnyStudentId(session.id, [st2.id]);
      expect(foundBySt2?.id).toBe(pPair.id);

      const foundOnlineBySt1 = await participantRepo.findOnlineBySessionAndAnyStudentId(
        session.id,
        [st1.id]
      );
      expect(foundOnlineBySt1?.id).toBe(pPair.id);

      // Không tìm thấy nếu ID không tồn tại
      const notFound = await participantRepo.findBySessionAndAnyStudentId(session.id, ['st_999']);
      expect(notFound).toBeNull();
    } finally {
      close();
    }
  });
});
