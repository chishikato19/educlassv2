import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  runMigrations,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Student Join Flow & Identity Resolution (Task 1.6)', () => {
  it('supports full student join flow with 3-tier identity, PIN verification, duplicate name lock (D7), and teams', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo giáo viên
    await userRepo.create({
      username: 'teacher_lan',
      passwordHash: await hasher.hash('teachpass123'),
      displayName: 'Cô Lan',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // Đăng nhập GV
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_lan', password: 'teachpass123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const teacherToken = JSON.parse(loginRes.body).token as string;

      // Tạo lớp "12 Chuyên Toán"
      const createClassRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { name: '12 Chuyên Toán', year: 2026 },
      });
      expect(createClassRes.statusCode).toBe(201);
      const classId = JSON.parse(createClassRes.body).class.id as string;

      // Tạo 2 học sinh:
      // - HS 1: "Nguyễn Văn An" có đặt PIN "1234"
      // - HS 2: "Trần Thị Bình" không đặt PIN
      const createStudent1Res = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { fullName: 'Nguyễn Văn An', pin: '1234' },
      });
      expect(createStudent1Res.statusCode).toBe(201);
      const student1 = JSON.parse(createStudent1Res.body).student;

      const createStudent2Res = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: { fullName: 'Trần Thị Bình' },
      });
      expect(createStudent2Res.statusCode).toBe(201);
      const student2 = JSON.parse(createStudent2Res.body).student;

      // GV mở phiên học gắn với lớp, cho phép cả danh sách hoặc khách, bật nhóm
      const createSessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          classId,
          identityMode: 'roster_or_guest',
          allowTeams: true,
        },
      });
      expect(createSessionRes.statusCode).toBe(201);
      const sessionData = JSON.parse(createSessionRes.body).session;
      const joinCode = sessionData.joinCode as string;

      // 2. HS kiểm tra roster: GET /api/sessions/code/:code/roster
      const rosterRes1 = await app.inject({
        method: 'GET',
        url: `/api/sessions/code/${joinCode}/roster`,
      });
      expect(rosterRes1.statusCode).toBe(200);
      const rosterBody1 = JSON.parse(rosterRes1.body);
      expect(rosterBody1.students).toHaveLength(2);
      expect(rosterBody1.students[0].fullName).toBe('Nguyễn Văn An');
      expect(rosterBody1.students[0].hasPin).toBe(true);
      expect(rosterBody1.students[0].isTaken).toBe(false);
      expect(rosterBody1.students[1].fullName).toBe('Trần Thị Bình');
      expect(rosterBody1.students[1].hasPin).toBe(false);
      expect(rosterBody1.students[1].isTaken).toBe(false);

      // 3. HS 1 vào lớp:
      // a. Không gửi PIN -> 401 INVALID_PIN
      const joinNoPinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, studentId: student1.id },
      });
      expect(joinNoPinRes.statusCode).toBe(401);
      expect(JSON.parse(joinNoPinRes.body).code).toBe('INVALID_PIN');

      // b. Sai PIN -> 401 INVALID_PIN
      const joinWrongPinRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode, studentId: student1.id, pin: '9999' },
      });
      expect(joinWrongPinRes.statusCode).toBe(401);
      expect(JSON.parse(joinWrongPinRes.body).code).toBe('INVALID_PIN');

      // c. Đúng PIN -> 200, cấp token, identityLevel = 'account', gán nhóm 'Nhóm Rồng Vàng'
      const joinSuccessRes1 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentId: student1.id,
          pin: '1234',
          teamName: 'Nhóm Rồng Vàng',
        },
      });
      expect(joinSuccessRes1.statusCode).toBe(200);
      const joinBody1 = JSON.parse(joinSuccessRes1.body);
      expect(joinBody1.participantToken).toBeDefined();
      expect(joinBody1.participant.displayName).toBe('Nguyễn Văn An');
      expect(joinBody1.participant.identityLevel).toBe('account');
      expect(joinBody1.participant.teamName).toBe('Nhóm Rồng Vàng');
      expect(joinBody1.participant.status).toBe('online');

      // 4. Kiểm tra khóa tên trùng (D7):
      // Người khác cố vào bằng tên "Nguyễn Văn An" khi đang online -> 409 NAME_TAKEN
      const joinDuplicateRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentId: student1.id,
          pin: '1234',
        },
      });
      expect(joinDuplicateRes.statusCode).toBe(409);
      expect(JSON.parse(joinDuplicateRes.body).code).toBe('NAME_TAKEN');

      // Người khác cố vào với nickname trùng "nguyen van an" -> 409 NAME_TAKEN
      const joinDuplicateGuestRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: '  nguyễn văn an  ',
        },
      });
      expect(joinDuplicateGuestRes.statusCode).toBe(409);
      expect(JSON.parse(joinDuplicateGuestRes.body).code).toBe('NAME_TAKEN');

      // 5. Kiểm tra roster sau khi HS 1 đã vào:
      const rosterRes2 = await app.inject({
        method: 'GET',
        url: `/api/sessions/code/${joinCode}/roster`,
      });
      expect(rosterRes2.statusCode).toBe(200);
      const rosterBody2 = JSON.parse(rosterRes2.body);
      const takenAn = rosterBody2.students.find((r: { id: string }) => r.id === student1.id);
      expect(takenAn.isTaken).toBe(true);

      // 6. HS 2 (không có PIN) vào lớp -> identityLevel = 'roster', chung nhóm 'Nhóm Rồng Vàng'
      const joinSuccessRes2 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          studentId: student2.id,
          teamName: 'Nhóm Rồng Vàng',
        },
      });
      expect(joinSuccessRes2.statusCode).toBe(200);
      const joinBody2 = JSON.parse(joinSuccessRes2.body);
      expect(joinBody2.participant.identityLevel).toBe('roster');
      expect(joinBody2.participant.teamName).toBe('Nhóm Rồng Vàng');
      expect(joinBody2.participant.teamId).toBe(joinBody1.participant.teamId);

      // 7. Khách tự do (guest) vào lớp -> identityLevel = 'guest'
      const joinSuccessRes3 = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Bạn Khách Hoa',
        },
      });
      expect(joinSuccessRes3.statusCode).toBe(200);
      const joinBody3 = JSON.parse(joinSuccessRes3.body);
      expect(joinBody3.participant.identityLevel).toBe('guest');
      expect(joinBody3.participant.displayName).toBe('Bạn Khách Hoa');
      expect(joinBody3.participant.teamName).toBeNull();
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  }, 15000);

  it('enforces identityMode restrictions (roster_only and guest_only)', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    await userRepo.create({
      username: 'teacher_hien',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Cô Hiền',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_hien', password: 'pass123' },
      });
      const token = JSON.parse(loginRes.body).token as string;

      // Tạo lớp và học sinh
      const clsRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: '11B2' },
      });
      const classId = JSON.parse(clsRes.body).class.id as string;

      const stRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Lê Hoàng Long' },
      });
      const studentId = JSON.parse(stRes.body).student.id as string;

      // 1. Tạo session roster_only
      const s1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token}` },
        payload: { classId, identityMode: 'roster_only', allowTeams: false },
      });
      const s1Code = JSON.parse(s1Res.body).session.joinCode as string;

      // Cố vào bằng guest (nickname) -> 400 INVALID_PAYLOAD
      const guestJoinRosterOnly = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: s1Code, nickname: 'Khách A' },
      });
      expect(guestJoinRosterOnly.statusCode).toBe(400);
      expect(JSON.parse(guestJoinRosterOnly.body).code).toBe('INVALID_PAYLOAD');

      // Gửi teamName khi allowTeams = false -> 400 INVALID_PAYLOAD
      const teamJoinNotAllowed = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: s1Code, studentId, teamName: 'Đội 1' },
      });
      expect(teamJoinNotAllowed.statusCode).toBe(400);
      expect(JSON.parse(teamJoinNotAllowed.body).code).toBe('INVALID_PAYLOAD');

      // Đóng session 1 trước khi tạo session 2
      await app.inject({
        method: 'POST',
        url: `/api/sessions/${JSON.parse(s1Res.body).session.id}/close`,
        headers: { authorization: `Bearer ${token}` },
      });

      // 2. Tạo session guest_only
      const s2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${token}` },
        payload: { identityMode: 'guest_only' },
      });
      const s2Code = JSON.parse(s2Res.body).session.joinCode as string;

      // Cố vào bằng studentId -> 400 INVALID_PAYLOAD
      const studentJoinGuestOnly = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: { joinCode: s2Code, studentId },
      });
      expect(studentJoinGuestOnly.statusCode).toBe(400);
      expect(JSON.parse(studentJoinGuestOnly.body).code).toBe('INVALID_PAYLOAD');
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  });
});
