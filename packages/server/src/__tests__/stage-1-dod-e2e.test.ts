import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  runMigrations,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Chặng 1 Definition of Done - E2E Verification', () => {
  it('E2E: 2 GV mở 2 phiên song song; 30 HS vào đủ 3 cấp; tên trùng bị chặn; đóng phiên; chỉ account có EXP trong DB', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const studentRepo = new StudentRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo 2 GV: Teacher Alpha và Teacher Beta
    await userRepo.create({
      username: 'teacher_alpha',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Alpha',
      role: 'teacher',
    });

    await userRepo.create({
      username: 'teacher_beta',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Cô Beta',
      role: 'teacher',
    });

    const app = await buildServer({ db: conn.db, autoSeedAdmin: true });

    try {
      // 2. Đăng nhập 2 GV
      const loginARes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_alpha', password: 'pass123' },
      });
      expect(loginARes.statusCode).toBe(200);
      const tokenA = JSON.parse(loginARes.body).token as string;

      const loginBRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_beta', password: 'pass123' },
      });
      expect(loginBRes.statusCode).toBe(200);
      const tokenB = JSON.parse(loginBRes.body).token as string;

      // 3. Mỗi GV tạo 1 lớp học
      const classARes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '10 Tin Chuyên', year: 2026 },
      });
      expect(classARes.statusCode).toBe(201);
      const classAId = JSON.parse(classARes.body).class.id as string;

      const classBRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { name: '11 Toán Chuyên', year: 2026 },
      });
      expect(classBRes.statusCode).toBe(201);
      const classBId = JSON.parse(classBRes.body).class.id as string;

      // Thêm 5 học sinh có PIN (account) và 5 học sinh không PIN (roster) cho Lớp A
      const studentsAAccount: Array<{ id: string; fullName: string }> = [];
      const studentsARoster: Array<{ id: string; fullName: string }> = [];

      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: `/api/classes/${classAId}/students`,
          headers: { authorization: `Bearer ${tokenA}` },
          payload: { fullName: `Lớp A - Account ${i}`, pin: `123${i}` },
        });
        expect(res.statusCode).toBe(201);
        studentsAAccount.push(JSON.parse(res.body).student);
      }

      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: `/api/classes/${classAId}/students`,
          headers: { authorization: `Bearer ${tokenA}` },
          payload: { fullName: `Lớp A - Roster ${i}` },
        });
        expect(res.statusCode).toBe(201);
        studentsARoster.push(JSON.parse(res.body).student);
      }

      // Thêm 5 học sinh có PIN (account) và 5 học sinh không PIN (roster) cho Lớp B
      const studentsBAccount: Array<{ id: string; fullName: string }> = [];
      const studentsBRoster: Array<{ id: string; fullName: string }> = [];

      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: `/api/classes/${classBId}/students`,
          headers: { authorization: `Bearer ${tokenB}` },
          payload: { fullName: `Lớp B - Account ${i}`, pin: `234${i}` },
        });
        expect(res.statusCode).toBe(201);
        studentsBAccount.push(JSON.parse(res.body).student);
      }

      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: `/api/classes/${classBId}/students`,
          headers: { authorization: `Bearer ${tokenB}` },
          payload: { fullName: `Lớp B - Roster ${i}` },
        });
        expect(res.statusCode).toBe(201);
        studentsBRoster.push(JSON.parse(res.body).student);
      }

      // 4. 2 GV mở 2 phiên song song
      const openSessionARes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          classId: classAId,
          identityMode: 'roster_or_guest',
          allowTeams: true,
        },
      });
      expect(openSessionARes.statusCode).toBe(201);
      const sessionA = JSON.parse(openSessionARes.body).session;

      const openSessionBRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          classId: classBId,
          identityMode: 'roster_or_guest',
          allowTeams: true,
        },
      });
      expect(openSessionBRes.statusCode).toBe(201);
      const sessionB = JSON.parse(openSessionBRes.body).session;

      expect(sessionA.joinCode).not.toBe(sessionB.joinCode);
      expect(sessionA.status).toBe('open');
      expect(sessionB.status).toBe('open');

      // 5. 30 HS vào đủ 3 cấp danh tính (15 vào phiên A, 15 vào phiên B)
      const participantsA: Array<{ id: string; identityLevel: string; studentId: string | null }> =
        [];
      const participantsB: Array<{ id: string; identityLevel: string; studentId: string | null }> =
        [];

      // Phiên A: 5 Account
      for (let i = 0; i < 5; i++) {
        const s = studentsAAccount[i]!;
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionA.joinCode,
            studentId: s.id,
            pin: `123${i + 1}`,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('account');
        participantsA.push(p);
      }

      // Phiên A: 5 Roster
      for (let i = 0; i < 5; i++) {
        const s = studentsARoster[i]!;
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionA.joinCode,
            studentId: s.id,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('roster');
        participantsA.push(p);
      }

      // Phiên A: 5 Guest
      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionA.joinCode,
            nickname: `Khách A ${i}`,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('guest');
        participantsA.push(p);
      }

      // Phiên B: 5 Account
      for (let i = 0; i < 5; i++) {
        const s = studentsBAccount[i]!;
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionB.joinCode,
            studentId: s.id,
            pin: `234${i + 1}`,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('account');
        participantsB.push(p);
      }

      // Phiên B: 5 Roster
      for (let i = 0; i < 5; i++) {
        const s = studentsBRoster[i]!;
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionB.joinCode,
            studentId: s.id,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('roster');
        participantsB.push(p);
      }

      // Phiên B: 5 Guest
      for (let i = 1; i <= 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/sessions/join',
          payload: {
            joinCode: sessionB.joinCode,
            nickname: `Khách B ${i}`,
          },
        });
        expect(res.statusCode).toBe(200);
        const p = JSON.parse(res.body).participant;
        expect(p.identityLevel).toBe('guest');
        participantsB.push(p);
      }

      // Tổng cộng đủ 30 người tham gia (15 ở A, 15 ở B)
      expect(participantsA).toHaveLength(15);
      expect(participantsB).toHaveLength(15);

      // 6. Kiểm tra tên trùng bị chặn
      // Cố tình vào Phiên A với nickname đã có sẵn đang online
      const duplicateGuestRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode: sessionA.joinCode,
          nickname: 'Khách A 1',
        },
      });
      expect(duplicateGuestRes.statusCode).toBe(409);
      expect(JSON.parse(duplicateGuestRes.body).code).toBe('NAME_TAKEN');

      // Cố tình chọn cùng 1 studentId đang online
      const duplicateStudentRes = await app.inject({
        method: 'POST',
        url: '/api/sessions/join',
        payload: {
          joinCode: sessionA.joinCode,
          studentId: studentsAAccount[0]!.id,
          pin: '1231',
        },
      });
      expect(duplicateStudentRes.statusCode).toBe(409);
      expect(JSON.parse(duplicateStudentRes.body).code).toBe('NAME_TAKEN');

      // 7. GV thưởng điểm cho học sinh cả 3 cấp danh tính
      // GV A thưởng cho HS 1 (Account), HS 6 (Roster), HS 11 (Guest)
      const rewardA1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionA.id}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: participantsA[0]!.id,
          exp: 60,
          reason: 'Phát biểu đúng',
        },
      });
      expect(rewardA1Res.statusCode).toBe(200);
      expect(JSON.parse(rewardA1Res.body).persisted).toBe(true);

      const rewardA2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionA.id}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: participantsA[5]!.id, // Roster
          exp: 40,
          reason: 'Hăng hái xây dựng bài',
        },
      });
      expect(rewardA2Res.statusCode).toBe(200);
      expect(JSON.parse(rewardA2Res.body).persisted).toBe(false);

      const rewardA3Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionA.id}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          participantId: participantsA[10]!.id, // Guest
          exp: 25,
          reason: 'Tham gia sôi nổi',
        },
      });
      expect(rewardA3Res.statusCode).toBe(200);
      expect(JSON.parse(rewardA3Res.body).persisted).toBe(false);

      // GV B thưởng cho HS 1 (Account), HS 6 (Roster), HS 11 (Guest) của phiên B
      const rewardB1Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionB.id}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          participantId: participantsB[0]!.id,
          exp: 80,
          reason: 'Làm bài nhanh nhất',
        },
      });
      expect(rewardB1Res.statusCode).toBe(200);
      expect(JSON.parse(rewardB1Res.body).persisted).toBe(true);

      const rewardB2Res = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionB.id}/rewards/grant`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          participantId: participantsB[5]!.id,
          exp: 30,
          reason: 'Đóng góp nhóm',
        },
      });
      expect(rewardB2Res.statusCode).toBe(200);
      expect(JSON.parse(rewardB2Res.body).persisted).toBe(false);

      // 8. Đóng cả 2 phiên
      const closeARes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionA.id}/close`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(closeARes.statusCode).toBe(200);
      expect(JSON.parse(closeARes.body).session.status).toBe('closed');
      expect(JSON.parse(closeARes.body).report.snapshot.totalParticipants).toBe(15);

      const closeBRes = await app.inject({
        method: 'POST',
        url: `/api/sessions/${sessionB.id}/close`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(closeBRes.statusCode).toBe(200);
      expect(JSON.parse(closeBRes.body).session.status).toBe('closed');
      expect(JSON.parse(closeBRes.body).report.snapshot.totalParticipants).toBe(15);

      // 9. KHẲNG ĐỊNH QUAN TRỌNG NHẤT:
      // "Chỉ account có EXP trong DB"
      // Lớp A:
      const studentA1Db = await studentRepo.findById(studentsAAccount[0]!.id);
      expect(studentA1Db?.exp).toBe(60);
      expect(studentA1Db?.level).toBe(2);

      const studentA2Db = await studentRepo.findById(studentsARoster[0]!.id);
      expect(studentA2Db?.exp).toBe(0);
      expect(studentA2Db?.level).toBe(1);

      // Lớp B:
      const studentB1Db = await studentRepo.findById(studentsBAccount[0]!.id);
      expect(studentB1Db?.exp).toBe(80);
      expect(studentB1Db?.level).toBe(2);

      const studentB2Db = await studentRepo.findById(studentsBRoster[0]!.id);
      expect(studentB2Db?.exp).toBe(0);
      expect(studentB2Db?.level).toBe(1);

      // Toàn bộ các học sinh roster khác không được thưởng cũng vẫn 0 EXP
      for (const r of studentsARoster) {
        const s = await studentRepo.findById(r.id);
        expect(s?.exp).toBe(0);
      }
      for (const r of studentsBRoster) {
        const s = await studentRepo.findById(r.id);
        expect(s?.exp).toBe(0);
      }
    } finally {
      await app.close();
      conn.sqlite.close();
    }
  }, 15000);
});
