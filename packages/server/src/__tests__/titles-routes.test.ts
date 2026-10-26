import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Gamification & Titles Routes (Task 5.1)', () => {
  it('supports listing titles, fetching student profile, updating avatar, and evaluating titles', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. GET /api/titles
      const titlesRes = await app.inject({
        method: 'GET',
        url: '/api/titles',
      });
      expect(titlesRes.statusCode).toBe(200);
      const titlesData = JSON.parse(titlesRes.body);
      expect(titlesData.total).toBeGreaterThanOrEqual(8);
      expect(titlesData.titles.some((t: { key: string }) => t.key === 'tan_binh')).toBe(true);

      // 2. Tạo một lớp và một học sinh để kiểm tra
      const teacher = await app.userRepo.create({
        username: 'gv_title_test',
        passwordHash: 'hash',
        displayName: 'Thầy Hào',
        role: 'teacher',
      });

      const classCreated = await app.classRepo.create({
        ownerId: teacher.id,
        name: 'Lớp 10A1',
        year: 2026,
      });

      const student = await app.studentRepo.create({
        classId: classCreated.id,
        fullName: 'Nguyễn Văn Nam',
        exp: 250,
        level: 2,
      });

      // 3. GET /api/students/:studentId/profile
      const profileRes = await app.inject({
        method: 'GET',
        url: `/api/students/${student.id}/profile`,
      });
      expect(profileRes.statusCode).toBe(200);
      const profile = JSON.parse(profileRes.body);
      expect(profile.studentId).toBe(student.id);
      expect(profile.fullName).toBe('Nguyễn Văn Nam');
      expect(profile.avatar.base).toBe('cat'); // Mặc định là cat
      expect(profile.exp).toBe(250);
      expect(profile.level).toBe(2);

      // 4. PATCH /api/students/:studentId/avatar
      const newAvatarConfig = {
        avatar: {
          base: 'bear',
          color: '#FFB020',
          headwear: 'cap',
          glasses: 'glasses',
          outfit: 'hoodie',
        },
      };

      const updateAvatarRes = await app.inject({
        method: 'PATCH',
        url: `/api/students/${student.id}/avatar`,
        payload: newAvatarConfig,
      });
      expect(updateAvatarRes.statusCode).toBe(200);
      const updated = JSON.parse(updateAvatarRes.body);
      expect(updated.success).toBe(true);
      expect(updated.avatar.base).toBe('bear');

      // Kiểm tra lại bằng GET profile xem avatar đã cập nhật chưa
      const refetched = await app.inject({
        method: 'GET',
        url: `/api/students/${student.id}/profile`,
      });
      const refetchedProfile = JSON.parse(refetched.body);
      expect(refetchedProfile.avatar.base).toBe('bear');
      expect(refetchedProfile.avatar.headwear).toBe('cap');

      // 5. POST /api/students/:studentId/titles/evaluate
      const evalRes = await app.inject({
        method: 'POST',
        url: `/api/students/${student.id}/titles/evaluate`,
        payload: {
          exp: 250,
          level: 2,
          examHighScores: 3,
          examPerfects: 0,
          quizStreak: 0,
          attendanceSessions: 1,
        },
      });
      expect(evalRes.statusCode).toBe(200);
      const evalData = JSON.parse(evalRes.body);
      expect(evalData.success).toBe(true);
      expect(evalData.awarded.length).toBeGreaterThanOrEqual(1);

      // Hồ sơ học sinh giờ đây phải chứa các danh hiệu vừa được cấp
      const profileWithTitles = await app.inject({
        method: 'GET',
        url: `/api/students/${student.id}/profile`,
      });
      const dataWithTitles = JSON.parse(profileWithTitles.body);
      expect(dataWithTitles.titles.length).toBeGreaterThanOrEqual(1);
      expect(dataWithTitles.titles.some((t: { key: string }) => t.key === 'tan_binh')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('handles 404 for non-existent student', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/students/non-existent-student/profile',
      });
      expect(profileRes.statusCode).toBe(404);

      const avatarRes = await app.inject({
        method: 'PATCH',
        url: '/api/students/non-existent-student/avatar',
        payload: {
          avatar: {
            base: 'cat',
            color: '#4F8CFF',
            headwear: 'none',
            glasses: 'none',
            outfit: 'default',
          },
        },
      });
      expect(avatarRes.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
