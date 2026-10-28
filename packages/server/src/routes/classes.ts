import type { FastifyPluginAsync } from 'fastify';
import { getOwnerFilterId } from '@educlass/core';
import type { ClassRepository, ClassSelect } from '@educlass/db';
import {
  CreateClassRequestSchema,
  formatProtocolError,
  UpdateClassRequestSchema,
  type ClassDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createOwnerGuard } from '../auth/owner-guard.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface ClassesRoutesOptions {
  authService: AuthService;
  classRepo: ClassRepository;
}

export function toClassDto(cls: ClassSelect): ClassDto {
  return {
    id: cls.id,
    ownerId: cls.ownerId,
    name: cls.name,
    year: cls.year,
    createdAt: cls.createdAt,
  };
}

export const classesRoutes: FastifyPluginAsync<ClassesRoutesOptions> = async (fastify, options) => {
  const { authService, classRepo } = options;
  const authenticate = createAuthenticateHook(authService);
  const classOwnerGuard = createOwnerGuard(authService, async request => {
    const { id } = request.params as { id: string };
    return classRepo.findById(id);
  });

  /**
   * GET /api/classes
   * Lấy danh sách lớp học theo phân quyền:
   * - Giáo viên: chỉ thấy danh sách lớp của chính mình (D5 PLAN.md)
   * - Admin: thấy toàn bộ danh sách lớp của tất cả giáo viên (D5 PLAN.md)
   */
  fastify.get('/api/classes', { preHandler: authenticate }, async (request, reply) => {
    const ownerFilterId = getOwnerFilterId(request.user!);
    const filter = ownerFilterId ? { ownerId: ownerFilterId } : undefined;
    const list = await classRepo.list(filter);
    return reply.status(200).send({
      classes: list.map(toClassDto),
    });
  });

  /**
   * POST /api/classes
   * Tạo lớp học mới, gán ownerId là tài khoản đang đăng nhập
   */
  fastify.post('/api/classes', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = CreateClassRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu tạo lớp không hợp lệ',
          parseResult.error.format()
        ),
      });
      return;
    }

    const created = await classRepo.create({
      ownerId: request.user!.id,
      name: parseResult.data.name,
      year: parseResult.data.year,
    });

    return reply.status(201).send({
      class: toClassDto(created),
    });
  });

  /**
   * GET /api/classes/:id
   * Xem thông tin chi tiết một lớp học:
   * - Giáo viên khác (không phải chủ sở hữu) bị từ chối 403 FORBIDDEN (D5)
   * - Chủ sở hữu hoặc Admin được phép xem
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/classes/:id',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const cls = await classRepo.findById(request.params.id);
      if (!cls) {
        reply.status(404).send({ error: formatProtocolError('CLASS_NOT_FOUND') });
        return;
      }
      return reply.status(200).send({ class: toClassDto(cls) });
    }
  );

  /**
   * PATCH /api/classes/:id
   * Cập nhật thông tin lớp học:
   * - Giáo viên khác (không phải chủ sở hữu) bị từ chối 403 FORBIDDEN (D5)
   * - Chủ sở hữu hoặc Admin được phép cập nhật
   */
  fastify.patch<{ Params: { id: string } }>(
    '/api/classes/:id',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const parseResult = UpdateClassRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu cập nhật lớp không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      const updated = await classRepo.update(request.params.id, parseResult.data);
      if (!updated) {
        reply.status(404).send({ error: formatProtocolError('CLASS_NOT_FOUND') });
        return;
      }
      return reply.status(200).send({ class: toClassDto(updated) });
    }
  );

  /**
   * DELETE /api/classes/:id
   * Xóa lớp học:
   * - Giáo viên khác bị từ chối 403 FORBIDDEN (D5)
   * - Chủ sở hữu hoặc Admin được phép xóa
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/classes/:id',
    { preHandler: classOwnerGuard },
    async (request, reply) => {
      const deleted = await classRepo.deleteById(request.params.id);
      if (!deleted) {
        reply.status(404).send({ error: formatProtocolError('CLASS_NOT_FOUND') });
        return;
      }
      return reply.status(200).send({ success: true });
    }
  );
};
