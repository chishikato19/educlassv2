import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasResourceAccess, type OwnableResource } from '@educlass/core';
import { formatProtocolError, type UserDto } from '@educlass/protocol';
import { AuthError } from './auth-error.js';
import type { AuthService } from './auth-service.js';
import { createAuthenticateHook } from './plugin.js';

/**
 * Tạo preHandler hook kiểm tra quyền sở hữu tài nguyên theo quy tắc D5 PLAN.md:
 * - Giáo viên chỉ được truy cập tài nguyên do chính mình sở hữu (ownerId === user.id).
 * - Quản trị viên (admin) có toàn quyền truy cập tài nguyên của bất kỳ giáo viên nào.
 */
export function createOwnerGuard<T extends OwnableResource>(
  authService: AuthService,
  getResource: (request: FastifyRequest) => Promise<T | null | undefined>
) {
  const authenticate = createAuthenticateHook(authService);

  return async function ownerGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) {
      return;
    }

    const user = request.user;
    if (!user) {
      reply.status(401).send({ error: formatProtocolError('UNAUTHORIZED') });
      return;
    }

    const resource = await getResource(request);
    if (!resource) {
      reply
        .status(404)
        .send({ error: formatProtocolError('INTERNAL_ERROR', 'Không tìm thấy tài nguyên yêu cầu.') });
      return;
    }

    const isAllowed = hasResourceAccess(user, resource);
    if (!isAllowed) {
      reply.status(403).send({ error: formatProtocolError('FORBIDDEN') });
      return;
    }
  };
}

/**
 * Khẳng định quyền truy cập tài nguyên, ném ra AuthError nếu không có quyền
 */
export function assertOwnerAccess<T extends OwnableResource>(
  user: UserDto,
  resource: T | null | undefined,
  notFoundMessage = 'Không tìm thấy tài nguyên yêu cầu.'
): asserts resource is T {
  if (!resource) {
    throw new AuthError('INTERNAL_ERROR', notFoundMessage, 404);
  }

  if (!hasResourceAccess(user, resource)) {
    throw new AuthError('FORBIDDEN', undefined, 403);
  }
}
