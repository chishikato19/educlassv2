import type { FastifyPluginAsync } from 'fastify';
import {
  formatProtocolError,
  SetRewardRulesRequestSchema,
  type GetRewardRulesResponse,
  type ResetRewardRulesResponse,
  type RewardRuleDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';
import type { RewardRuleService } from '../rewards/reward-rule-service.js';

export interface RewardRulesRoutesOptions {
  authService: AuthService;
  rewardRuleService: RewardRuleService;
}

interface RuleLike {
  id?: string | undefined;
  ownerId?: string | null | undefined;
  scope?: 'global' | 'teacher' | undefined;
  activityId?: string | null | undefined;
  trigger: string;
  exp: number;
  enabled?: boolean | undefined;
}

function toRewardRuleDto(r: RuleLike): RewardRuleDto {
  return {
    id: r.id ?? `${r.activityId ?? '__global__'}_${r.trigger}`,
    ownerId: r.ownerId ?? null,
    scope: r.scope ?? 'global',
    activityId: r.activityId ?? null,
    trigger: r.trigger,
    exp: r.exp,
    enabled: r.enabled ?? true,
  };
}

export const rewardRulesRoutes: FastifyPluginAsync<RewardRulesRoutesOptions> = async (
  fastify,
  options
) => {
  const { authService, rewardRuleService } = options;
  const authenticate = createAuthenticateHook(authService);

  /**
   * GET /api/reward-rules
   * Lấy cấu hình quy tắc thưởng EXP của giáo viên hiện tại
   * (bao gồm luật toàn cục, luật riêng, luật có hiệu lực sau khi ghi đè, và trần EXP)
   */
  fastify.get<{ Reply: GetRewardRulesResponse }>(
    '/api/reward-rules',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send(formatProtocolError('UNAUTHORIZED', 'Chưa xác thực danh tính') as never);
      }

      const info = await rewardRuleService.getRulesForTeacher(user.id);

      return reply.send({
        globalRules: info.globalRules.map(toRewardRuleDto),
        teacherRules: info.teacherRules.map(toRewardRuleDto),
        effectiveRules: info.effectiveRules.map(toRewardRuleDto),
        sessionCap: info.sessionCap,
        activityCaps: info.activityCaps,
      });
    }
  );

  /**
   * PUT /api/reward-rules
   * Cập nhật danh sách quy tắc thưởng và trần EXP của giáo viên
   */
  fastify.put(
    '/api/reward-rules',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send(formatProtocolError('UNAUTHORIZED', 'Chưa xác thực danh tính') as never);
      }

      const parseResult = SetRewardRulesRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu quy tắc thưởng không hợp lệ') as never);
      }

      const info = await rewardRuleService.saveTeacherRules(user.id, parseResult.data.rules);

      return reply.send({
        globalRules: info.globalRules.map(toRewardRuleDto),
        teacherRules: info.teacherRules.map(toRewardRuleDto),
        effectiveRules: info.effectiveRules.map(toRewardRuleDto),
        sessionCap: info.sessionCap,
        activityCaps: info.activityCaps,
      });
    }
  );

  /**
   * POST /api/reward-rules/reset
   * Khôi phục cài đặt EXP của giáo viên về mặc định hệ thống
   */
  fastify.post<{ Reply: ResetRewardRulesResponse }>(
    '/api/reward-rules/reset',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send(formatProtocolError('UNAUTHORIZED', 'Chưa xác thực danh tính') as never);
      }

      const info = await rewardRuleService.resetTeacherRules(user.id);

      return reply.send({
        success: true,
        message: 'Đã khôi phục toàn bộ cài đặt EXP về mặc định hệ thống',
        effectiveRules: info.effectiveRules.map(toRewardRuleDto),
      });
    }
  );
};
