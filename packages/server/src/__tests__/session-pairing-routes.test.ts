import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  runMigrations,
  ClassRepository,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Multi-Student Device Pairing Server Routes (Stage 2)', () => {
  it('supports pairing 2 students on 1 machine, atomic locking, and fan-out rewards', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const classRepo = new ClassRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo giáo viên và lớp học
    const teacher = await userRepo.create({
      username: 'teacher_pair',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Hoàng',
      role: 'teacher',
    });

    const cls = await classRepo.create({
      ownerId: teacher.id,
      name: 'Lớp 10A1',
      year: 2026,
    });

    // Tạo 3 học sinh
    const s1 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Đỗ Nam Anh',
      exp: 10,
      level: 1,
    });
    const s2 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Trần Văn Bình',
      exp: 20,
      level: 1,
    });
    const s3 = await studentRepo.create({
      classId: cls.id,
      fullName: 'Lê Thu Cúc',
      exp: 30,
      level: 1,
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // Đăng nhập giáo viên
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_pair', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;

      // 2. Giáo viên mở phiên có bật ghép máy: allowPairing: true, maxStudentsPerDevice: 2
      const openSessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          classId: cls.id,
          identityMode: 'roster_only',
          allowTeams: true,
          allowPairing: true,
          maxStudentsPerDevice: 2,
        },
      });
      expect(openSessionRes.statusCode).toBe(201);
      const sessionData = JSON.parse(openSessionRes.body).session;
      const joinCode = sessionData.joinCode as string;
      const sessionId = sessionData.id as string;

      // 3. Tra cứu roster của phiên -> kiểm tra cờ allowPairing
      const rosterRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/code/${joinCode}/roster`,
      });
      expect(rosterRes.statusCode).toBe(200);
      const rosterJson = JSON.parse(rosterRes.body);
      expect(rosterJson.allowPairing).toBe(true);
      expect(rosterJson.maxStudentsPerDevice).toBe(2);
      expect(rosterJson.students).toHaveLength(3);

      // 4. Thử ghép 3 bạn khi max là 2 -> phải bị từ chối
      const joinFailRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentIds: [s1.id, s2.id, s3.id],
        },
      });
      expect(joinFailRes.statusCode).toBe(400);

      // 5. Ghép 2 bạn (s1 và s2) trên 1 máy -> thành công
      const joinSuccessRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentIds: [s1.id, s2.id],
        },
      });
      expect(joinSuccessRes.statusCode).toBe(200);
      const joinSuccessJson = JSON.parse(joinSuccessRes.body);
      const participant = joinSuccessJson.participant;
      expect(participant.displayName).toBe('Đỗ Nam Anh & Trần Văn Bình');
      expect(participant.studentIds).toEqual([s1.id, s2.id]);
      const pId = participant.id as string;

      // 6. Kiểm tra chống chọn trùng (D7): Máy khác vào chọn lại s2 -> bị từ chối NAME_TAKEN
      const conflictRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentIds: [s2.id],
        },
      });
      expect(conflictRes.statusCode).toBe(409);

      // Kiểm tra lại danh sách roster: Cả s1 và s2 đều phải isTaken = true
      const rosterAfterJoin = await app.inject({
        method: 'GET',
        url: `/api/sessions/code/${joinCode}/roster`,
      });
      const rosterAfterJson = JSON.parse(rosterAfterJoin.body);
      const takenMap = new Map(rosterAfterJson.students.map((s: { id: string; isTaken: boolean }) => [s.id, s.isTaken]));
      expect(takenMap.get(s1.id)).toBe(true);
      expect(takenMap.get(s2.id)).toBe(true);
      expect(takenMap.get(s3.id)).toBe(false);

      // 7. Kiểm tra phân bổ EXP tự động (Rewards Fan-out - D8)
      const grantRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          participantId: pId,
          exp: 25,
          reason: 'Trả lời xuất sắc câu hỏi nhóm',
        },
      });
      expect(grantRes.statusCode).toBe(200);

      // Kiểm tra EXP trong CSDL: Cả s1 và s2 đều được cộng 25 EXP
      const updatedS1 = await studentRepo.findById(s1.id);
      const updatedS2 = await studentRepo.findById(s2.id);
      const updatedS3 = await studentRepo.findById(s3.id);

      expect(updatedS1?.exp).toBe(10 + 25);
      expect(updatedS2?.exp).toBe(20 + 25);
      expect(updatedS3?.exp).toBe(30); // s3 không ngồi máy này, giữ nguyên
    } finally {
      await app.close();
      conn.close();
    }
  });
});
