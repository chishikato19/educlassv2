import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildServer } from '../app.js';
import { calculateSha256 } from '@educlass/question-kit';

describe('Assets REST Routes (Task 2.2)', () => {
  let app: FastifyInstance;
  let tempAssetsDir: string;
  let teacherToken: string;

  beforeEach(async () => {
    tempAssetsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'educlass-assets-test-'));
    app = await buildServer({
      assetsDir: tempAssetsDir,
    });
    await app.ready();

    // Login as default admin to get a valid token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'admin123',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    teacherToken = loginRes.json().token;
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tempAssetsDir, { recursive: true, force: true });
  });

  it('uploads an image via base64, dedupes by SHA-256 hash, and serves image by hash', async () => {
    // 1. Prepare raw buffer and compute expected SHA-256
    const rawBytes = Buffer.from('FAKE-IMAGE-CONTENT-FOR-TESTING-PURPOSES-12345');
    const expectedHash = await calculateSha256(rawBytes);
    const base64Data = `data:image/png;base64,${rawBytes.toString('base64')}`;

    // 2. Upload asset
    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        base64: base64Data,
        mime: 'image/png',
      },
    });

    expect(uploadRes.statusCode).toBe(201);
    const uploaded = uploadRes.json();
    expect(uploaded.sha256).toBe(expectedHash);
    expect(uploaded.mime).toBe('image/png');
    expect(uploaded.size).toBe(rawBytes.length);
    expect(uploaded.url).toBe(`/api/assets/${expectedHash}`);

    // Verify file exists on disk
    const onDiskFiles = fs.readdirSync(tempAssetsDir);
    expect(onDiskFiles.some(f => f.includes(expectedHash))).toBe(true);

    // 3. Duplicate upload returns the same asset without duplicating file
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        base64: base64Data,
        mime: 'image/png',
      },
    });

    expect(dupRes.statusCode).toBe(200);
    const dupUploaded = dupRes.json();
    expect(dupUploaded.id).toBe(uploaded.id);
    expect(dupUploaded.sha256).toBe(expectedHash);

    // 4. GET /api/assets/:hash serves image bytes with immutable cache header
    const serveRes = await app.inject({
      method: 'GET',
      url: `/api/assets/${expectedHash}`,
    });

    expect(serveRes.statusCode).toBe(200);
    expect(serveRes.headers['content-type']).toBe('image/png');
    expect(serveRes.headers['cache-control']).toContain('immutable');
    expect(serveRes.rawPayload).toEqual(rawBytes);

    // 5. GET /api/assets/:hash with non-existent hash returns 404
    const notFoundRes = await app.inject({
      method: 'GET',
      url: '/api/assets/0000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(notFoundRes.statusCode).toBe(404);
  });
});
