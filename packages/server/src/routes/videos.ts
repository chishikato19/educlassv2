import type { FastifyPluginAsync } from 'fastify';
import type { VideoRepository, VideoSelect } from '@educlass/db';
import {
  CreateVideoRequestSchema,
  extractYouTubeId,
  formatProtocolError,
  UpdateVideoRequestSchema,
  type VideoDto,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';

export interface VideosRoutesOptions {
  authService: AuthService;
  videoRepo: VideoRepository;
}

export function toVideoDto(v: VideoSelect): VideoDto {
  return {
    id: v.id,
    title: v.title,
    url: v.youtubeUrl,
    youtubeId: v.youtubeId,
    category: v.category,
    description: v.description ?? '',
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export const videosRoutes: FastifyPluginAsync<VideosRoutesOptions> = async (fastify, options) => {
  const { authService, videoRepo } = options;
  const authenticate = createAuthenticateHook(authService);

  /**
   * GET /api/videos/categories
   * Lấy danh sách danh mục phân loại video
   */
  fastify.get('/api/videos/categories', { preHandler: authenticate }, async (_request, reply) => {
    const categories = await videoRepo.listCategories();
    return reply.status(200).send({ categories });
  });

  /**
   * GET /api/videos
   * Lấy danh sách video (hỗ trợ lọc theo category và search từ khóa)
   */
  fastify.get('/api/videos', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { category?: string; search?: string };
    const list = await videoRepo.list({
      category: query.category,
      search: query.search,
    });
    return reply.status(200).send({
      videos: list.map(toVideoDto),
    });
  });

  /**
   * POST /api/videos
   * Thêm đường dẫn video YouTube mới vào kho
   */
  fastify.post('/api/videos', { preHandler: authenticate }, async (request, reply) => {
    const parseResult = CreateVideoRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Dữ liệu video không hợp lệ',
          parseResult.error.format()
        ),
      });
    }

    const { title, url, category, description } = parseResult.data;
    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Đường dẫn YouTube không hợp lệ hoặc không trích xuất được Video ID. Vui lòng kiểm tra lại liên kết.'
        ),
      });
    }

    const created = await videoRepo.create({
      title,
      youtubeUrl: url,
      youtubeId,
      category,
      description: description ?? '',
    });

    return reply.status(201).send({ video: toVideoDto(created) });
  });

  /**
   * PUT /api/videos/:id
   * Chỉnh sửa thông tin video
   */
  fastify.put('/api/videos/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateVideoRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Dữ liệu cập nhật video không hợp lệ',
          parseResult.error.format()
        ),
      });
    }

    const updateData: {
      title?: string;
      youtubeUrl?: string;
      youtubeId?: string;
      category?: string;
      description?: string;
    } = {};

    if (parseResult.data.title !== undefined) updateData.title = parseResult.data.title;
    if (parseResult.data.category !== undefined) updateData.category = parseResult.data.category;
    if (parseResult.data.description !== undefined)
      updateData.description = parseResult.data.description;

    if (parseResult.data.url) {
      const youtubeId = extractYouTubeId(parseResult.data.url);
      if (!youtubeId) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            'Đường dẫn YouTube mới không hợp lệ hoặc không trích xuất được Video ID.'
          ),
        });
      }
      updateData.youtubeUrl = parseResult.data.url;
      updateData.youtubeId = youtubeId;
    }

    const updated = await videoRepo.update(id, updateData);
    if (!updated) {
      return reply.status(404).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Không tìm thấy video cần chỉnh sửa'),
      });
    }

    return reply.status(200).send({ video: toVideoDto(updated) });
  });

  /**
   * DELETE /api/videos/:id
   * Xóa video khỏi kho
   */
  fastify.delete('/api/videos/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await videoRepo.delete(id);
    if (!success) {
      return reply.status(404).send({
        error: formatProtocolError('INVALID_PAYLOAD', 'Không tìm thấy video để xóa'),
      });
    }

    return reply.status(200).send({ success: true });
  });
};
