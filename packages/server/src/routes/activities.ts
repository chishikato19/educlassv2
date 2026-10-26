import type { FastifyPluginAsync } from 'fastify';
import {
  ActiveActivitiesResponseSchema,
  ActivityListResponseSchema,
  CurrentActivityResponseSchema,
  EndActivityRequestSchema,
  EndActivityResponseSchema,
  formatProtocolError,
  StartActivityRequestSchema,
  StartActivityResponseSchema,
  StudentIntentRequestSchema,
  TeacherIntentRequestSchema,
} from '@educlass/protocol';
import type { SessionRepository } from '@educlass/db';
import type { ActivityEngine } from '../activity/engine.js';
import type { ActivityRegistry } from '../activity/registry.js';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';
import type { TokenService } from '../auth/token-service.js';

export interface ActivitiesRoutesOptions {
  authService: AuthService;
  tokenService: TokenService;
  sessionRepo: SessionRepository;
  registry: ActivityRegistry;
  activityEngine: ActivityEngine;
}

export const activitiesRoutes: FastifyPluginAsync<ActivitiesRoutesOptions> = async (
  fastify,
  options
) => {
  const { authService, tokenService, sessionRepo, registry, activityEngine } = options;
  const authenticate = createAuthenticateHook(authService);

  /**
   * GET /api/activities
   * Lấy danh sách tất cả các Activity có sẵn trong hệ thống
   */
  fastify.get(
    '/api/activities',
    { preHandler: authenticate },
    async (_request, reply) => {
      const activities = registry.list();
      return reply.send(ActivityListResponseSchema.parse({ activities }));
    }
  );

  /**
   * GET /api/sessions/:id/activities
   * Lấy danh sách các Activity có sẵn trong hệ thống
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/activities',
    { preHandler: authenticate },
    async (_request, reply) => {
      const activities = registry.list();
      return reply.send(ActivityListResponseSchema.parse({ activities }));
    }
  );

  /**
   * GET /api/sessions/:id/activities/current
   * Lấy thông tin lượt chạy Activity hiện tại của phiên (kèm state, hỗ trợ filter theo activityId hoặc runId)
   */
  fastify.get<{ Params: { id: string }; Querystring: { activityId?: string; runId?: string } }>(
    '/api/sessions/:id/activities/current',
    async (request, reply) => {
      const { id: sessionId } = request.params;
      const { activityId, runId } = request.query;
      const current = activityEngine.getActiveRun(sessionId, runId || activityId);

      return reply.send(
        CurrentActivityResponseSchema.parse({
          run: current?.run ?? null,
          state: current?.state ?? null,
        })
      );
    }
  );

  /**
   * GET /api/sessions/:id/activities/active
   * Lấy danh sách tất cả các lượt chạy Activity đang hoạt động trong phiên (hỗ trợ chạy song song)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/activities/active',
    async (request, reply) => {
      const { id: sessionId } = request.params;
      const activeRuns = activityEngine.getActiveRuns(sessionId);

      return reply.send(
        ActiveActivitiesResponseSchema.parse({
          activeRuns,
        })
      );
    }
  );

  /**
   * POST /api/sessions/:id/activities/start
   * Giáo viên bắt đầu một lượt chạy Activity mới
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/sessions/:id/activities/start',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id: sessionId } = request.params;

      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển phiên học này.'));
      }

      const parseResult = StartActivityRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              'Dữ liệu bắt đầu hoạt động không hợp lệ.',
              parseResult.error.issues
            )
          );
      }

      const { activityId, config } = parseResult.data;

      try {
        const result = await activityEngine.startActivity(sessionId, activityId, config);
        return reply.status(200).send(StartActivityResponseSchema.parse(result));
      } catch (err: unknown) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              err instanceof Error ? err.message : 'Không thể bắt đầu hoạt động'
            )
          );
      }
    }
  );

  /**
   * POST /api/sessions/:id/activities/teacher-intent
   * Giáo viên gửi ý định điều khiển hoạt động
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/sessions/:id/activities/teacher-intent',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id: sessionId } = request.params;

      const session = await sessionRepo.findById(sessionId);
      if (!session || (session.ownerId !== user.id && user.role !== 'admin')) {
        return reply
          .status(403)
          .send(formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển phiên học này.'));
      }

      const parseResult = TeacherIntentRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu ý định không hợp lệ.'));
      }

      const { runId, intent } = parseResult.data;
      const res = await activityEngine.handleTeacherIntent(sessionId, runId, intent);

      if ('ok' in res && res.ok === false) {
        return reply.status(400).send(res);
      }

      return reply.send(res);
    }
  );

  /**
   * POST /api/sessions/:id/activities/student-intent
   * Học sinh gửi ý định hành động (REST fallback)
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/sessions/:id/activities/student-intent',
    async (request, reply) => {
      const { id: sessionId } = request.params;

      const parseResult = StudentIntentRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu ý định không hợp lệ.'));
      }

      const { participantToken, runId, intent } = parseResult.data;
      const payload = tokenService.verifyParticipantToken(participantToken);
      if (!payload || payload.sessionId !== sessionId) {
        return reply
          .status(401)
          .send(formatProtocolError('UNAUTHORIZED', 'Mã xác thực học sinh không hợp lệ.'));
      }

      const res = await activityEngine.handleStudentIntent(
        sessionId,
        payload.participantId,
        runId,
        intent
      );

      if ('ok' in res && res.ok === false) {
        return reply.status(400).send(res);
      }

      return reply.send(res);
    }
  );

  /**
   * POST /api/sessions/:id/activities/end
   * Giáo viên kết thúc lượt chạy Activity
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/sessions/:id/activities/end',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id: sessionId } = request.params;

      const session = await sessionRepo.findById(sessionId);
      if (!session || (session.ownerId !== user.id && user.role !== 'admin')) {
        return reply
          .status(403)
          .send(formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển phiên học này.'));
      }

      const parseResult = EndActivityRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(formatProtocolError('INVALID_PAYLOAD', 'Dữ liệu kết thúc không hợp lệ.'));
      }

      const { runId } = parseResult.data;
      try {
        const result = await activityEngine.endActivity(sessionId, runId);
        return reply.send(EndActivityResponseSchema.parse(result));
      } catch (err: unknown) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              err instanceof Error ? err.message : 'Không thể kết thúc hoạt động'
            )
          );
      }
    }
  );

  /**
   * POST /api/activities/run
   * Tiện ích khởi chạy Activity (alias hỗ trợ cả gọi trực tiếp từ UI)
   */
  fastify.post(
    '/api/activities/run',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const body = (request.body as { sessionId?: string; activityId?: string; config?: unknown }) ?? {};
      const sessionId = body.sessionId;
      const activityId = body.activityId;

      if (!sessionId || !activityId) {
        return reply
          .status(400)
          .send(formatProtocolError('INVALID_PAYLOAD', 'Thiếu sessionId hoặc activityId.'));
      }

      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển phiên học này.'));
      }

      try {
        const result = await activityEngine.startActivity(sessionId, activityId, body.config ?? {});
        return reply.status(200).send({
          runId: result.run.id,
          activityId: result.run.activityId,
          run: result.run,
          state: result.state,
        });
      } catch (err: unknown) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              err instanceof Error ? err.message : 'Không thể bắt đầu hoạt động'
            )
          );
      }
    }
  );

  /**
   * POST /api/activities/runs/:runId/intent
   * Tiện ích gửi intent giáo viên (alias)
   */
  fastify.post(
    '/api/activities/runs/:runId/intent',
    { preHandler: authenticate },
    async (request, reply) => {
      const { runId } = request.params as { runId: string };
      const body = (request.body as { intent?: unknown; sessionId?: string }) ?? {};

      let sessionId = body.sessionId;
      if (!sessionId) {
        const user = request.user;
        if (user) {
          const activeSess = await sessionRepo.findActiveByOwnerId(user.id);
          if (activeSess) sessionId = activeSess.id;
        }
      }

      if (!sessionId) {
        return reply.status(404).send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên đang chạy của hoạt động.'));
      }

      const res = await activityEngine.handleTeacherIntent(sessionId, runId, body.intent);
      if ('ok' in res && res.ok === false) {
        return reply.status(400).send(res);
      }
      return reply.send(res);
    }
  );

  /**
   * POST /api/activities/runs/:runId/end
   * Tiện ích kết thúc hoạt động (alias)
   */
  fastify.post(
    '/api/activities/runs/:runId/end',
    { preHandler: authenticate },
    async (request, reply) => {
      const { runId } = request.params as { runId: string };
      const body = (request.body as { sessionId?: string }) ?? {};

      let sessionId = body.sessionId;
      if (!sessionId) {
        const user = request.user;
        if (user) {
          const activeSess = await sessionRepo.findActiveByOwnerId(user.id);
          if (activeSess) sessionId = activeSess.id;
        }
      }

      if (!sessionId) {
        return reply.status(404).send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên đang chạy của hoạt động.'));
      }

      try {
        const result = await activityEngine.endActivity(sessionId, runId);
        return reply.send(result);
      } catch (err: unknown) {
        return reply.status(400).send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            err instanceof Error ? err.message : 'Không thể kết thúc hoạt động'
          )
        );
      }
    }
  );
};
