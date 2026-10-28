import { describe, expect, it } from 'vitest';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  CreateVideoRequestSchema,
  UpdateVideoRequestSchema,
} from '../video.js';

describe('Video Protocol & Helpers', () => {
  describe('extractYouTubeId', () => {
    it('trích xuất đúng ID từ URL youtube.com/watch?v=...', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('http://youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe(
        'dQw4w9WgXcQ'
      );
    });

    it('trích xuất đúng ID từ URL youtu.be/...', () => {
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
    });

    it('trích xuất đúng ID từ URL youtube.com/shorts/...', () => {
      expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('trích xuất đúng ID từ URL youtube.com/embed/... hoặc nocookie', () => {
      expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(
        'dQw4w9WgXcQ'
      );
    });

    it('chấp nhận nhập trực tiếp chuỗi YouTube ID 11 ký tự', () => {
      expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('trả về null nếu URL không hợp lệ hoặc rỗng', () => {
      expect(extractYouTubeId('')).toBeNull();
      expect(extractYouTubeId('https://google.com')).toBeNull();
      expect(extractYouTubeId('https://facebook.com/watch?v=123')).toBeNull();
    });
  });

  describe('getYouTubeEmbedUrl', () => {
    it('sinh link embed youtube-nocookie đúng chuẩn bảo vệ quyền riêng tư', () => {
      const embedUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ', true);
      expect(embedUrl).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1'
      );

      const noAutoplayUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ', false);
      expect(noAutoplayUrl).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1'
      );
    });
  });

  describe('getYouTubeThumbnailUrl', () => {
    it('sinh link thumbnail hqdefault', () => {
      expect(getYouTubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      );
    });
  });

  describe('Validation Schemas', () => {
    it('hợp lệ khi dữ liệu CreateVideoRequest đầy đủ', () => {
      const parsed = CreateVideoRequestSchema.parse({
        title: 'Video khởi động vui nhộn',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        category: 'Khởi động',
        description: 'Bài hát tiếng Anh vui nhộn',
      });
      expect(parsed.title).toBe('Video khởi động vui nhộn');
      expect(parsed.category).toBe('Khởi động');
    });

    it('báo lỗi khi CreateVideoRequest rỗng tiêu đề hoặc URL', () => {
      expect(() =>
        CreateVideoRequestSchema.parse({
          title: '   ',
          url: 'https://youtu.be/dQw4w9WgXcQ',
        })
      ).toThrow();

      expect(() =>
        CreateVideoRequestSchema.parse({
          title: 'Tiêu đề',
          url: '',
        })
      ).toThrow();
    });

    it('validate UpdateVideoRequest hợp lệ', () => {
      const parsed = UpdateVideoRequestSchema.parse({
        title: 'Tiêu đề mới',
      });
      expect(parsed.title).toBe('Tiêu đề mới');
    });
  });
});
