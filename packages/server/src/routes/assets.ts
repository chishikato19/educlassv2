import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AssetRepository } from '@educlass/db';
import { UploadAssetRequestSchema } from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface AssetsRoutesOptions {
  authService: AuthService;
  assetRepo: AssetRepository;
  assetsDir?: string | undefined;
}

function getExtensionForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

export const assetsRoutes: FastifyPluginAsync<AssetsRoutesOptions> = async (fastify, options) => {
  const { authService, assetRepo } = options;
  const authenticate = createAuthenticateHook(authService);
  const storageDir = options.assetsDir ?? path.join(process.cwd(), 'data', 'assets');

  // Đảm bảo thư mục lưu trữ tồn tại
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  /**
   * POST /api/assets
   * Tải ảnh lên máy chủ, nén/lưu theo SHA-256 hash và chống trùng lặp dữ liệu
   */
  fastify.post('/api/assets', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = UploadAssetRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dữ liệu tải lên không hợp lệ',
        details: parseResult.error.format(),
      });
    }

    const { base64, mime: rawMime } = parseResult.data;

    let mime = rawMime ?? 'image/jpeg';
    let base64Data = base64;

    // Phân tích header data url nếu có (vd data:image/png;base64,....)
    const dataUrlMatch = base64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (dataUrlMatch && dataUrlMatch[1] && dataUrlMatch[2]) {
      mime = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return reply.status(400).send({ error: 'Nội dung file không hợp lệ hoặc rỗng' });
    }

    // Tính mã băm SHA-256
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const ext = getExtensionForMime(mime);
    const fileName = `${sha256}.${ext}`;
    const filePath = path.join(storageDir, fileName);

    // Ghi file ra đĩa nếu chưa có
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    // Lưu vào database với tính năng deduplication theo SHA-256
    const { asset, isNew } = await assetRepo.findOrCreate({
      sha256,
      mime,
      path: filePath,
      size: buffer.length,
    });

    const statusCode = isNew ? 201 : 200;
    return reply.status(statusCode).send({
      id: asset.id,
      sha256: asset.sha256,
      mime: asset.mime,
      size: asset.size,
      url: `/api/assets/${asset.sha256}`,
    });
  });

  /**
   * GET /api/assets/:hash
   * Phục vụ file ảnh theo mã SHA-256 (cho phép cache vĩnh viễn immutable)
   */
  fastify.get('/api/assets/:hash', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const asset = await assetRepo.findBySha256(hash);

    if (!asset || !fs.existsSync(asset.path)) {
      return reply.status(404).send({ error: 'Không tìm thấy hình ảnh' });
    }

    const fileStream = fs.createReadStream(asset.path);
    return reply
      .header('Content-Type', asset.mime)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(fileStream);
  });

  /**
   * GET /api/assets/id/:id
   * Phục vụ file ảnh theo ID
   */
  fastify.get('/api/assets/id/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await assetRepo.findById(id);

    if (!asset || !fs.existsSync(asset.path)) {
      return reply.status(404).send({ error: 'Không tìm thấy hình ảnh' });
    }

    const fileStream = fs.createReadStream(asset.path);
    return reply
      .header('Content-Type', asset.mime)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(fileStream);
  });
};
