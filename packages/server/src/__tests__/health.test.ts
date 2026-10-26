import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Server Health Endpoint', () => {
  it('returns status ok and current timestamp on GET /health', async () => {
    const app = await buildServer({ fastifyOptions: { logger: false } });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(typeof body.time).toBe('number');
    expect(body.v).toBe(1);

    await app.close();
  });
});
