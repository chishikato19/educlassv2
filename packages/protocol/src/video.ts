import { z } from 'zod';

/**
 * Trích xuất YouTube Video ID (11 ký tự) từ nhiều định dạng URL khác nhau hoặc chuỗi ID trực tiếp
 */
export function extractYouTubeId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();

  // Nếu người dùng nhập trực tiếp ID 11 ký tự
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Các regex phổ biến của YouTube
  // youtu.be/<id>
  const shortMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // youtube.com/watch?v=<id> hoặc m.youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // youtube.com/embed/<id> hoặc youtube-nocookie.com/embed/<id>
  const embedMatch = trimmed.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // youtube.com/live/<id>
  const liveMatch = trimmed.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch && liveMatch[1]) {
    return liveMatch[1];
  }

  // Bất kỳ query param v=11 ký tự nào
  const genericVMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (genericVMatch && genericVMatch[1]) {
    return genericVMatch[1];
  }

  return null;
}

/**
 * Tạo URL nhúng YouTube không quảng cáo theo dõi (Privacy-Enhanced Mode via youtube-nocookie.com)
 */
export function getYouTubeEmbedUrl(youtubeId: string, autoplay = true): string {
  const ap = autoplay ? '1' : '0';
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=${ap}&rel=0&modestbranding=1`;
}

/**
 * Lấy URL ảnh thu nhỏ chất lượng cao của YouTube
 */
export function getYouTubeThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export const VideoDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  youtubeId: z.string().min(1),
  category: z.string().default('Khởi động'),
  description: z.string().optional().default(''),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type VideoDto = z.infer<typeof VideoDtoSchema>;

export const CreateVideoRequestSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề video không được để trống'),
  url: z.string().trim().min(1, 'Đường dẫn YouTube không được để trống'),
  category: z.string().trim().min(1).default('Khởi động'),
  description: z.string().trim().optional().default(''),
});
export type CreateVideoRequest = z.infer<typeof CreateVideoRequestSchema>;

export const UpdateVideoRequestSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề video không được để trống').optional(),
  url: z.string().trim().min(1, 'Đường dẫn YouTube không được để trống').optional(),
  category: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
});
export type UpdateVideoRequest = z.infer<typeof UpdateVideoRequestSchema>;
