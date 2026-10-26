import type { FastifyReply, FastifyRequest } from 'fastify';
import { formatProtocolError, type UserDto } from '@educlass/protocol';
import type { AuthService } from './auth-service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserDto;
  }
}

/**
 * Hook xác thực người dùng từ Bearer token trong Authorization header
 */
export function createAuthenticateHook(authService: AuthService) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader) {
      const [scheme, parsedToken] = authHeader.split(' ');
      if (scheme?.toLowerCase() === 'bearer') {
        token = parsedToken;
      }
    }

    if (!token && request.query && typeof request.query === 'object' && 'token' in request.query) {
      const queryToken = (request.query as Record<string, unknown>).token;
      if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
        token = queryToken.trim();
      }
    }

    if (!token) {
      reply.status(401).send({ error: formatProtocolError('UNAUTHORIZED') });
      return;
    }

    const user = await authService.validateSession(token);
    if (!user) {
      reply.status(401).send({ error: formatProtocolError('UNAUTHORIZED') });
      return;
    }

    request.user = user;
  };
}

/**
 * Hook yêu cầu quyền Quản trị viên (admin)
 */
export function createRequireAdminHook(authService: AuthService) {
  const authenticate = createAuthenticateHook(authService);

  return async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) {
      return;
    }

    if (request.user?.role !== 'admin') {
      reply.status(403).send({ error: formatProtocolError('FORBIDDEN') });
      return;
    }
  };
}
