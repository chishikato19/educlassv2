import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { ClassRepository } from '../repositories/class-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { TitleRepository } from '../repositories/title-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('TitleRepository & Student Avatar', () => {
  it('seeds default titles and prevents duplicate insertion', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const titleRepo = new TitleRepository(db);

      const firstSeed = await titleRepo.seedDefaultTitles();
      expect(firstSeed.length).toBeGreaterThanOrEqual(8);

      const secondSeed = await titleRepo.seedDefaultTitles();
      expect(secondSeed).toHaveLength(firstSeed.length);

      const rookie = await titleRepo.findByKey('tan_binh');
      expect(rookie).not.toBeNull();
      expect(rookie?.name).toBe('Tân binh lớp học');
    } finally {
      close();
    }
  });

  it('awards titles to student and prevents duplicate student titles', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);
      const titleRepo = new TitleRepository(db);

      await titleRepo.seedDefaultTitles();

      const teacher = await userRepo.create({
        username: 'gv_hung',
        passwordHash: 'hash',
        displayName: 'Thầy Hùng',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '10A3',
        year: 2026,
      });

      const student = await studentRepo.create({
        classId: cls.id,
        fullName: 'Ngô Bảo Châu',
        code: 'HS009',
      });

      const rookie = (await titleRepo.findByKey('tan_binh'))!;
      const award1 = await titleRepo.awardTitle(student.id, rookie.id);
      expect(award1).not.toBeNull();
      expect(award1?.titleId).toBe(rookie.id);

      // Trao lần 2 không gây lỗi và trả về bản ghi đã có
      const award2 = await titleRepo.awardTitle(student.id, rookie.id);
      expect(award2).not.toBeNull();
      expect(award2?.id).toBe(award1?.id);

      const studentTitles = await titleRepo.getStudentTitles(student.id);
      expect(studentTitles).toHaveLength(1);
      expect(studentTitles[0]?.key).toBe('tan_binh');
    } finally {
      close();
    }
  });

  it('evaluates student rules and automatically awards eligible titles', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);
      const titleRepo = new TitleRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_quyen',
        passwordHash: 'hash',
        displayName: 'Cô Quyên',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '11B1',
        year: 2026,
      });

      const student = await studentRepo.create({
        classId: cls.id,
        fullName: 'Lê Hoàng Long',
        exp: 300,
        level: 3,
      });

      // Đánh giá với stats đủ điều kiện nhận danh hiệu
      const newlyAwarded = await titleRepo.evaluateAndAwardTitles(student.id, {
        exp: 300,
        level: 3,
        examHighScores: 2,
        examPerfects: 0,
        quizStreak: 0,
        attendanceSessions: 1,
      });

      expect(newlyAwarded.length).toBeGreaterThanOrEqual(2);
      const keys = newlyAwarded.map((t) => t.key);
      expect(keys).toContain('tan_binh');
      expect(keys).toContain('cham_chi');

      // Đánh giá lần 2 không nhận lại những cái đã có
      const secondRound = await titleRepo.evaluateAndAwardTitles(student.id, {
        exp: 300,
        level: 3,
        examHighScores: 2,
        examPerfects: 0,
        quizStreak: 0,
        attendanceSessions: 1,
      });
      expect(secondRound).toHaveLength(0);
    } finally {
      close();
    }
  });

  it('updates student avatar configuration JSON', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const classRepo = new ClassRepository(db);
      const studentRepo = new StudentRepository(db);

      const teacher = await userRepo.create({
        username: 'gv_lan',
        passwordHash: 'hash',
        displayName: 'Cô Lan',
        role: 'teacher',
      });

      const cls = await classRepo.create({
        ownerId: teacher.id,
        name: '6A',
        year: 2026,
      });

      const student = await studentRepo.create({
        classId: cls.id,
        fullName: 'Phạm Nhật Vượng',
      });
      expect(student.avatarJson).toBeNull();

      const avatarConfig = {
        base: 'dragon',
        color: '#FFB020',
        headwear: 'crown',
        glasses: 'sunglasses',
        outfit: 'wizard_robe',
      };

      const updated = await studentRepo.updateAvatar(student.id, JSON.stringify(avatarConfig));
      expect(updated).not.toBeNull();
      expect(updated?.avatarJson).toBe(JSON.stringify(avatarConfig));

      const reloaded = await studentRepo.findById(student.id);
      expect(reloaded?.avatarJson).toBe(JSON.stringify(avatarConfig));
    } finally {
      close();
    }
  });
});
