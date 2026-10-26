import type { FastifyPluginAsync } from 'fastify';
import {
  AdminCreateUserRequestSchema,
  AdminResetPasswordRequestSchema,
  AdminUpdateUserStatusRequestSchema,
  formatProtocolError,
} from '@educlass/protocol';
import type { AdminService } from '../auth/admin-service.js';
import { AuthError } from '../auth/auth-error.js';
import type { AuthService } from '../auth/auth-service.js';
import { createRequireAdminHook } from '../auth/plugin.js';

export interface AdminRoutesOptions {
  authService: AuthService;
  adminService: AdminService;
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (fastify, options) => {
  const { authService, adminService } = options;
  const requireAdmin = createRequireAdminHook(authService);

  /**
   * GET /api/admin/users
   * Lấy danh sách toàn bộ người dùng trong hệ thống
   */
  fastify.get('/api/admin/users', { preHandler: requireAdmin }, async (_request, reply) => {
    try {
      const users = await adminService.listUsers();
      return reply.status(200).send({ users });
    } catch {
      return reply.status(500).send({
        error: formatProtocolError('INTERNAL_ERROR'),
      });
    }
  });

  /**
   * POST /api/admin/users
   * Quản trị viên tạo tài khoản giáo viên/quản trị viên mới
   */
  fastify.post('/api/admin/users', { preHandler: requireAdmin }, async (request, reply) => {
    const parseResult = AdminCreateUserRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu tạo tài khoản không hợp lệ',
          parseResult.error.format()
        ),
      });
      return;
    }

    try {
      const createdUser = await adminService.createUser(parseResult.data);
      return reply.status(201).send({ user: createdUser });
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return reply.status(err.statusCode).send({
          error: formatProtocolError(err.code, err.message),
        });
      }
      return reply.status(500).send({
        error: formatProtocolError('INTERNAL_ERROR'),
      });
    }
  });

  /**
   * PATCH /api/admin/users/:id/status
   * Khóa hoặc kích hoạt tài khoản người dùng
   */
  fastify.patch<{ Params: { id: string } }>(
    '/api/admin/users/:id/status',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const parseResult = AdminUpdateUserStatusRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu cập nhật trạng thái không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      try {
        const updatedUser = await adminService.updateUserStatus(
          id,
          parseResult.data,
          request.user!.id
        );
        return reply.status(200).send({ user: updatedUser });
      } catch (err: unknown) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({
            error: formatProtocolError(err.code, err.message),
          });
        }
        return reply.status(500).send({
          error: formatProtocolError('INTERNAL_ERROR'),
        });
      }
    }
  );

  /**
   * POST /api/admin/users/:id/reset-password
   * Đặt lại mật khẩu cho tài khoản người dùng
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/admin/users/:id/reset-password',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const parseResult = AdminResetPasswordRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Mật khẩu mới không hợp lệ',
            parseResult.error.format()
          ),
        });
        return;
      }

      try {
        await adminService.resetUserPassword(id, parseResult.data);
        return reply.status(200).send({
          success: true,
          message: 'Đặt lại mật khẩu thành công.',
        });
      } catch (err: unknown) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({
            error: formatProtocolError(err.code, err.message),
          });
        }
        return reply.status(500).send({
          error: formatProtocolError('INTERNAL_ERROR'),
        });
      }
    }
  );
};
