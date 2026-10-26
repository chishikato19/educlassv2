import type { FastifyPluginAsync } from 'fastify';
import type { StudentRepository, TitleRepository } from '@educlass/db';
import {
  AvatarConfigSchema,
  formatProtocolError,
  StudentGamificationStatsSchema,
  type AvatarConfig,
  type StudentGamificationStats,
  type TitleDto,
} from '@educlass/protocol';

export interface TitlesRoutesOptions {
  titleRepo: TitleRepository;
  studentRepo: StudentRepository;
}

export const titlesRoutes: FastifyPluginAsync<TitlesRoutesOptions> = async (
  fastify,
  options
) => {
  const { titleRepo, studentRepo } = options;

  /**
   * GET /api/titles
   * Lấy danh sách toàn bộ danh hiệu trong hệ thống (kèm điều kiện luật)
   */
  fastify.get('/api/titles', async (_request, reply) => {
    await titleRepo.seedDefaultTitles();
    const all = await titleRepo.listAllTitles();

    const dtos: TitleDto[] = all.map((t) => {
      let rule = { conditions: [] };
      try {
        rule = JSON.parse(t.ruleJson);
      } catch {
        rule = { conditions: [] };
      }

      return {
        id: t.id,
        key: t.key,
        name: t.name,
        iconKey: t.iconKey,
        rule,
      };
    });

    return reply.status(200).send({
      titles: dtos,
      total: dtos.length,
    });
  });

  /**
   * GET /api/students/:studentId/profile
   * Lấy hồ sơ game hóa của học sinh (Avatar, EXP, Level, danh hiệu đã đạt)
   */
  fastify.get<{ Params: { studentId: string } }>(
    '/api/students/:studentId/profile',
    async (request, reply) => {
      const { studentId } = request.params;
      const student = await studentRepo.findById(studentId);
      if (!student) {
        return reply.status(404).send({
          error: formatProtocolError('STUDENT_NOT_FOUND'),
        });
      }

      // Đảm bảo default titles đã có
      await titleRepo.seedDefaultTitles();
      const awarded = await titleRepo.getStudentTitles(studentId);

      // Parse avatar config
      let avatar: AvatarConfig = {
        base: 'cat',
        color: '#4F8CFF',
        headwear: 'none',
        glasses: 'none',
        outfit: 'default',
        wings: 'none',
        held: 'none',
      };

      if (student.avatarJson) {
        try {
          const parsed = JSON.parse(student.avatarJson);
          const validated = AvatarConfigSchema.safeParse(parsed);
          if (validated.success) {
            avatar = validated.data;
          }
        } catch {
          // Giữ avatar mặc định nếu parse lỗi
        }
      }

      const titlesDto: TitleDto[] = awarded.map((t) => {
        let rule = { conditions: [] };
        try {
          rule = JSON.parse(t.ruleJson);
        } catch {
          rule = { conditions: [] };
        }
        return {
          id: t.id,
          key: t.key,
          name: t.name,
          iconKey: t.iconKey,
          rule,
          awardedAt: t.awardedAt,
          isUnlocked: true,
        };
      });

      return reply.status(200).send({
        studentId: student.id,
        fullName: student.fullName,
        exp: student.exp,
        level: student.level,
        avatar,
        titles: titlesDto,
      });
    }
  );


  /**
   * POST /api/students/:studentId/titles/evaluate
   * Đánh giá và tự động cấp danh hiệu mới dựa trên thành tích tích lũy
   */
  fastify.post<{ Params: { studentId: string } }>(
    '/api/students/:studentId/titles/evaluate',
    async (request, reply) => {
      const { studentId } = request.params;
      const student = await studentRepo.findById(studentId);
      if (!student) {
        return reply.status(404).send({
          error: formatProtocolError('STUDENT_NOT_FOUND'),
        });
      }

      let stats: StudentGamificationStats = {
        exp: student.exp,
        level: student.level,
        examHighScores: 0,
        examPerfects: 0,
        quizStreak: 0,
        attendanceSessions: 0,
      };

      if (request.body) {
        const bodyParse = StudentGamificationStatsSchema.safeParse(request.body);
        if (bodyParse.success) {
          stats = bodyParse.data;
        }
      }

      const awarded = await titleRepo.evaluateAndAwardTitles(studentId, stats);

      return reply.status(200).send({
        success: true,
        awarded,
      });
    }
  );
};
