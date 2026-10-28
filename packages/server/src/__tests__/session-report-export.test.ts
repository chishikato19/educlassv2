import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  ActivityRunRepository,
  ClassRepository,
  createDatabaseConnection,
  ParticipantRepository,
  RewardRepository,
  runMigrations,
  SessionReportRepository,
  SessionRepository,
  StudentRepository,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';
import { TokenService } from '../auth/token-service.js';

describe('Session Report & Excel Export Integration', () => {
  it('creates complete report snapshot with scoreboard & difficult questions and exports Excel', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const db = conn.db;

    const userRepo = new UserRepository(db);
    const sessionRepo = new SessionRepository(db);
    const sessionReportRepo = new SessionReportRepository(db);
    const participantRepo = new ParticipantRepository(db);
    const activityRunRepo = new ActivityRunRepository(db);
    const rewardRepo = new RewardRepository(db);
    const passwordHasher = new ScryptPasswordHasher();
    const tokenService = new TokenService();

    const classRepo = new ClassRepository(db);
    const studentRepo = new StudentRepository(db);

    const app = await buildServer({
      db,
      userRepo,
      classRepo,
      studentRepo,
      sessionRepo,
      sessionReportRepo,
      participantRepo,
      activityRunRepo,
      rewardRepo,
      tokenService,
      autoSeedAdmin: false,
    });

    // 1. Tạo 2 giáo viên: GV chính (owner) và GV khác
    const passwordHash = await passwordHasher.hash('password123');
    const teacher1 = await userRepo.create({
      id: 'teacher-1',
      username: 'teacher1',
      passwordHash,
      displayName: 'Cô Thảo',
      role: 'teacher',
    });
    const teacher2 = await userRepo.create({
      id: 'teacher-2',
      username: 'teacher2',
      passwordHash,
      displayName: 'Thầy Hùng',
      role: 'teacher',
    });

    const token1 = tokenService.createToken({
      id: teacher1.id,
      username: teacher1.username,
      role: teacher1.role as 'teacher',
    });
    const token2 = tokenService.createToken({
      id: teacher2.id,
      username: teacher2.username,
      role: teacher2.role as 'teacher',
    });

    // 2. Tạo lớp học và 2 học sinh
    const cls = await classRepo.create({
      id: 'class-1',
      ownerId: teacher1.id,
      name: 'Lớp 10A1',
      year: 2026,
    });

    const s1 = await studentRepo.create({
      id: 'HS01',
      classId: cls.id,
      fullName: 'Học sinh An',
      code: 'HS01',
    });

    const s2 = await studentRepo.create({
      id: 'HS02',
      classId: cls.id,
      fullName: 'Học sinh Bình',
      code: 'HS02',
    });

    // 3. Tạo phiên học cho teacher1 gắn với lớp học
    const session = await sessionRepo.create({
      id: 'sess-100',
      ownerId: teacher1.id,
      classId: cls.id,
      joinCode: 'TEST99',
      status: 'open',
      identityMode: 'roster_or_guest',
      allowTeams: false,
      openedAt: Date.now() - 3600000,
    });

    // 4. Thêm 2 học sinh tham gia
    const p1 = await participantRepo.create({
      id: 'p-1',
      sessionId: session.id,
      studentId: s1.id,
      displayName: 'Học sinh An',
      identityLevel: 'roster',
      status: 'online',
      joinedAt: session.openedAt + 1000,
    });
    const p2 = await participantRepo.create({
      id: 'p-2',
      sessionId: session.id,
      studentId: s2.id,
      displayName: 'Học sinh Bình',
      identityLevel: 'roster',
      status: 'online',
      joinedAt: session.openedAt + 2000,
    });

    // 4. Tạo 1 lượt chạy Quiz với kết quả câu hỏi
    const run = await activityRunRepo.createRun({
      id: 'run-quiz-1',
      sessionId: session.id,
      activityId: 'quiz-live',
      configJson: JSON.stringify({
        title: 'Quiz Địa Lý Việt Nam',
        questions: [
          { id: 'q-1', stem: 'Thủ đô của Việt Nam là gì?' },
          { id: 'q-2', stem: 'Sông Hồng chảy qua thành phố nào?' },
        ],
      }),
      status: 'ended',
      startedAt: session.openedAt + 10000,
    });

    // p1 đúng cả 2 câu; p2 đúng câu 1, sai câu 2
    await activityRunRepo.saveResults(run.id, [
      {
        participantId: p1.id,
        scoreJson: JSON.stringify({
          score: 2000,
          correctCount: 2,
          totalQuestions: 2,
          answers: {
            '0': { isCorrect: true },
            '1': { isCorrect: true },
          },
        }),
        rank: 1,
      },
      {
        participantId: p2.id,
        scoreJson: JSON.stringify({
          score: 1000,
          correctCount: 1,
          totalQuestions: 2,
          answers: {
            '0': { isCorrect: true },
            '1': { isCorrect: false },
          },
        }),
        rank: 2,
      },
    ]);

    // Thưởng EXP cho p1 và p2
    await rewardRepo.createLog({
      sessionId: session.id,
      participantId: p1.id,
      studentId: p1.studentId,
      exp: 60,
      reason: 'quiz_top1',
      persisted: true,
      ts: session.openedAt + 30000,
    });
    await rewardRepo.createLog({
      sessionId: session.id,
      participantId: p2.id,
      studentId: p2.studentId,
      exp: 30,
      reason: 'quiz_top2',
      persisted: true,
      ts: session.openedAt + 30000,
    });

    // 5. Đóng phiên qua POST /api/sessions/:id/close
    const closeRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.id}/close`,
      headers: { authorization: `Bearer ${token1}` },
      payload: { reason: 'Hoàn thành tiết học' },
    });

    expect(closeRes.statusCode).toBe(200);
    const closeData = JSON.parse(closeRes.body) as {
      session: { status: string };
      report: {
        snapshot: {
          scoreboard: Array<{ displayName: string; score: number; rank: number }>;
          difficultQuestions: Array<{ questionId: string; errorRate: number }>;
          summary: { averageScore: number; averageAccuracy: number; totalExpAwarded: number };
        };
      };
    };

    expect(closeData.session.status).toBe('closed');
    const { scoreboard, difficultQuestions, summary } = closeData.report.snapshot;

    // Scoreboard có 2 học sinh, p1 rank 1
    expect(scoreboard).toHaveLength(2);
    expect(scoreboard[0]?.displayName).toBe('Học sinh An');
    expect(scoreboard[0]?.score).toBe(2000);
    expect(scoreboard[0]?.rank).toBe(1);

    // Difficult Questions: q-2 sai 1/2 (50%)
    expect(difficultQuestions).toHaveLength(2);
    expect(difficultQuestions[0]?.questionId).toBe('q-2');
    expect(difficultQuestions[0]?.errorRate).toBe(50);

    // Summary
    expect(summary.averageScore).toBe(1500);
    expect(summary.averageAccuracy).toBe(75);
    expect(summary.totalExpAwarded).toBe(90);

    // 6. Test GET /api/sessions/:id/report (Owner Guard)
    const viewReportRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/report`,
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(viewReportRes.statusCode).toBe(200);

    // 7. Test GET /api/sessions/:id/report/excel (Tải file Excel)
    const excelRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/report/excel`,
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(excelRes.statusCode).toBe(200);
    expect(excelRes.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(excelRes.headers['content-disposition']).toContain(
      `bao-cao-phien-${session.joinCode}.xlsx`
    );

    // Phân tích workbook trả về
    const excelBuffer = excelRes.rawPayload;
    expect(excelBuffer.length).toBeGreaterThan(0);
    const wb = XLSX.read(excelBuffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Tổng quan phiên', 'Bảng điểm học sinh', 'Câu hỏi sai nhiều']);

    // 8. Test Forbidden với teacher2
    const forbiddenRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${session.id}/report/excel`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(forbiddenRes.statusCode).toBe(403);
  });
});
