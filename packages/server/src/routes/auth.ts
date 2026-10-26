import type { FastifyPluginAsync } from 'fastify';
import {
  ChangePasswordRequestSchema,
  formatProtocolError,
  LoginRequestSchema,
  RegisterTeacherRequestSchema,
  ResetTeacherPinRequestSchema,
} from '@educlass/protocol';
import { AuthError } from '../auth/auth-error.js';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface AuthRoutesOptions {
  authService: AuthService;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, options) => {
  const { authService } = options;
  const authenticate = createAuthenticateHook(authService);

  /**
   * GET /api/auth/teachers
   * Lấy danh sách hồ sơ giáo viên đang hoạt động cho màn hình chọn tài khoản
   */
  fastify.get('/api/auth/teachers', async (_request, reply) => {
    try {
      const teachers = await authService.listActiveTeachers();
      return reply.status(200).send({ teachers });
    } catch {
      return reply.status(500).send({
        error: formatProtocolError('INTERNAL_ERROR'),
      });
    }
  });

  /**
   * POST /api/auth/register-teacher
   * Giáo viên tự tạo tài khoản mới với mã PIN mặc định 1234
   */
  fastify.post('/api/auth/register-teacher', async (request, reply) => {
    const parseResult = RegisterTeacherRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu đăng ký không hợp lệ',
          parseResult.error.format()
        ),
      });
    }

    try {
      const user = await authService.registerTeacher(parseResult.data);
      return reply.status(201).send({ user });
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
   * POST /api/auth/reset-pin
   * Đặt lại mã PIN về mặc định 1234 (Phương án 2)
   */
  fastify.post('/api/auth/reset-pin', async (request, reply) => {
    const parseResult = ResetTeacherPinRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ',
          parseResult.error.format()
        ),
      });
    }

    try {
      await authService.resetPinToDefault(parseResult.data.userId);
      return reply.status(200).send({
        success: true,
        message: 'Đã đặt lại mã PIN về mặc định 1234.',
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
  });

  /**
   * POST /api/auth/login
   * Đăng nhập người dùng bằng tên tài khoản và mật khẩu
   */
  fastify.post('/api/auth/login', async (request, reply) => {
    const parseResult = LoginRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu đăng nhập không hợp lệ',
          parseResult.error.format()
        ),
      });
      return;
    }

    try {
      const response = await authService.login(parseResult.data);
      return reply.status(200).send(response);
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
   * GET /api/auth/me
   * Lấy thông tin tài khoản hiện tại từ phiên đăng nhập (token)
   */
  fastify.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
    return reply.status(200).send({
      user: request.user,
    });
  });

  /**
   * POST /api/auth/logout
   * Đăng xuất phiên hiện tại
   */
  fastify.post('/api/auth/logout', { preHandler: authenticate }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
    });
  });

  /**
   * POST /api/auth/change-password
   * Đổi mật khẩu hoặc mã PIN cá nhân cho người dùng đang đăng nhập
   */
  fastify.post('/api/auth/change-password', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = ChangePasswordRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          parseResult.error.errors[0]?.message ?? 'Dữ liệu đổi mật khẩu không hợp lệ',
          parseResult.error.format()
        ),
      });
      return;
    }

    try {
      await authService.changePassword(request.user!.id, parseResult.data);
      return reply.status(200).send({
        success: true,
        message: 'Đổi mã PIN / mật khẩu thành công.',
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
  });
};
