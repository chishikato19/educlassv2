import { describe, expect, it } from 'vitest';
import { createDatabaseConnection, runMigrations, UserRepository } from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Reward Grant REST Routes & Identity Level Persistence (Task 1.9)', () => {
  it('correctly handles rewards across account, roster, and guest identity levels with D6/D8 rules', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo 2 GV (GV A và GV B)
    await userRepo.create({
      username: 'teacher_reward_a',
      passwordHash: await hasher.hash('password123'),
      displayName: 'Thầy Tuấn',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'teacher_reward_b',
      passwordHash: await hasher.hash('password123'),
      displayName: 'Cô Mai',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // Đăng nhập GV A
      const loginARes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_reward_a', password: 'password123' },
      });
      expect(loginARes.statusCode).toBe(200);
      const tokenA = JSON.parse(loginARes.body).token as string;

      // Đăng nhập GV B
      const loginBRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_reward_b', password: 'password123' },
      });
      expect(loginBRes.statusCode).toBe(200);
      const tokenB = JSON.parse(loginBRes.body).token as string;

      // GV A tạo lớp và học sinh
      const classRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '10A Lý', year: 2026 },
      });
      expect(classRes.statusCode).toBe(201);
      const classId = JSON.parse(classRes.body).class.id as string;

      // Thêm 2 học sinh vào lớp: 1 bạn có PIN (account), 1 bạn không PIN (roster)
      const student1Res = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { fullName: 'Nguyễn Văn Account', pin: '1234' },
      });
      expect(student1Res.statusCode).toBe(201);
      const student1 = JSON.parse(student1Res.body).student;

      const student2Res = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { fullName: 'Trần Thị Roster' }, // Không có PIN
      });
      expect(student2Res.statusCode).toBe(201);
      const student2 = JSON.parse(student2Res.body).student;

      // GV A mở phiên học (roster_or_guest)
      const openSessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          classId,
          identityMode: 'roster_or_guest',
          allowTeams: false,
        },
      });
      expect(openSessionRes.statusCode).toBe(201);
      const sessionData = JSON.parse(openSessionRes.body);
      const sessionId = sessionData.session.id as string;
      const joinCode = sessionData.session.joinCode as string;

      // 3 học sinh tham gia phiên:
      // HS 1: Account (chọn tên trong danh sách + nhập PIN đúng)
      const join1Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          displayName: 'Nguyễn Văn Account',
          studentId: student1.id,
          pin: '1234',
        },
      });
      expect(join1Res.statusCode).toBe(200);
      const p1 = JSON.parse(join1Res.body).participant;
      expect(p1.identityLevel).toBe('account');

      // HS 2: Roster (chọn tên trong danh sách, học sinh không có PIN)
      const join2Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          displayName: 'Trần Thị Roster',
          studentId: student2.id,
        },
      });
      expect(join2Res.statusCode).toBe(200);
      const p2 = JSON.parse(join2Res.body).participant;
      expect(p2.identityLevel).toBe('roster');

      // HS 3: Guest (học sinh tự do)
      const join3Res = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode,
          nickname: 'Khách Vãng Lai',
        },
      });
      expect(join3Res.statusCode).toBe(200);
      const p3 = JSON.parse(join3Res.body).participant;
      expect(p3.identityLevel).toBe('guest');

      // TEST 1: Thưởng cho HS 1 (account)
      const grantP1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: p1.id,
          exp: 60,
          reason: 'Phát biểu đúng câu khó',
        },
      });
      expect(grantP1Res.statusCode).toBe(200);
      const grantP1 = JSON.parse(grantP1Res.body);
      expect(grantP1.success).toBe(true);
      expect(grantP1.persisted).toBe(true);
      expect(grantP1.expGranted).toBe(60);
      expect(grantP1.studentId).toBe(student1.id);
      expect(grantP1.newTotalExp).toBe(60);
      expect(grantP1.newLevel).toBe(2); // 60 EXP >= 50 EXP nên lên Level 2
      expect(grantP1.leveledUp).toBe(true);
      expect(grantP1.rewardLog.persisted).toBe(true);

      // Kiểm tra DB students thực sự được cập nhật cho HS 1
      const checkClassStudentsRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(checkClassStudentsRes.statusCode).toBe(200);
      const classStudentsList = JSON.parse(checkClassStudentsRes.body).students;
      const student1Db = classStudentsList.find((s: { id: string }) => s.id === student1.id);
      expect(student1Db.exp).toBe(60);
      expect(student1Db.level).toBe(2);

      // TEST 2: Thưởng cho HS 2 (roster)
      const grantP2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: p2.id,
          exp: 30,
          reason: 'Hăng hái xây dựng bài',
        },
      });
      expect(grantP2Res.statusCode).toBe(200);
      const grantP2 = JSON.parse(grantP2Res.body);
      expect(grantP2.success).toBe(true);
      expect(grantP2.persisted).toBe(false);
      expect(grantP2.expGranted).toBe(30);
      expect(grantP2.newTotalExp).toBeNull();
      expect(grantP2.rewardLog.persisted).toBe(false);

      // Kiểm tra DB students của HS 2 TUYỆT ĐỐI KHÔNG ĐƯỢC TĂNG EXP (tuân thủ D6/D8)
      const checkClassStudentsRes2 = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(checkClassStudentsRes2.statusCode).toBe(200);
      const classStudentsList2 = JSON.parse(checkClassStudentsRes2.body).students;
      const student2Db = classStudentsList2.find((s: { id: string }) => s.id === student2.id);
      expect(student2Db.exp).toBe(0);
      expect(student2Db.level).toBe(1);

      // TEST 3: Thưởng cho HS 3 (guest)
      const grantP3Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: p3.id,
          exp: 20,
          reason: 'Tương tác tốt',
        },
      });
      expect(grantP3Res.statusCode).toBe(200);
      const grantP3 = JSON.parse(grantP3Res.body);
      expect(grantP3.success).toBe(true);
      expect(grantP3.persisted).toBe(false);
      expect(grantP3.studentId).toBeNull();
      expect(grantP3.newTotalExp).toBeNull();
      expect(grantP3.rewardLog.persisted).toBe(false);

      // TEST 4: Lấy danh sách lịch sử thưởng của phiên GET /api/sessions/:id/rewards
      const listRewardsRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/rewards`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(listRewardsRes.statusCode).toBe(200);
      const rewardsList = JSON.parse(listRewardsRes.body);
      expect(rewardsList).toHaveLength(3);
      // Mới nhất trước: HS 3 (20 EXP), rồi HS 2 (30 EXP), rồi HS 1 (60 EXP)
      expect(rewardsList[0].participantId).toBe(p3.id);
      expect(rewardsList[1].participantId).toBe(p2.id);
      expect(rewardsList[2].participantId).toBe(p1.id);

      // TEST 5: Owner Guard D5 - GV B không thể thưởng trong phiên của GV A
      const forbiddenGrantRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          participantId: p1.id,
          exp: 10,
        },
      });
      expect(forbiddenGrantRes.statusCode).toBe(403);

      const forbiddenListRes = await app.inject({
        method: 'GET',
        url: `/api/sessions/${sessionId}/rewards`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(forbiddenListRes.statusCode).toBe(403);

      // TEST 6: Đóng phiên học -> không thể thưởng sau khi phiên đã đóng
      const closeRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/close`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(closeRes.statusCode).toBe(200);

      const grantAfterCloseRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: p1.id,
          exp: 10,
        },
      });
      expect(grantAfterCloseRes.statusCode).toBe(400);
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  });
});
