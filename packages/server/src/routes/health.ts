import type { FastifyPluginAsync } from 'fastify';
import { APP_VERSION, PROTOCOL_VERSION } from '@educlass/protocol';

export const healthRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      time: Date.now(),
      v: PROTOCOL_VERSION,
      version: APP_VERSION,
    };
  });

  fastify.get('/version', async () => {
    return {
      version: APP_VERSION,
      protocolVersion: PROTOCOL_VERSION,
    };
  });

  fastify.get('/api/version', async () => {
    return {
      version: APP_VERSION,
      protocolVersion: PROTOCOL_VERSION,
    };
  });
};
