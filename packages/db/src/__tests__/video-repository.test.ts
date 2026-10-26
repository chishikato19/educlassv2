import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { VideoRepository } from '../repositories/video-repository.js';

describe('VideoRepository', () => {
  it('creates, retrieves, filters, updates and deletes videos', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const videoRepo = new VideoRepository(db);

      // 1. Tạo video
      const v1 = await videoRepo.create({
        title: 'Video khởi động năng lượng cơ thể',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtubeId: 'dQw4w9WgXcQ',
        category: 'Khởi động',
        description: 'Bài hát vận động 3 phút đầu giờ',
        duration: '3:33',
        tagsJson: JSON.stringify(['van-dong', 'khoi-dong']),
      });

      expect(v1.id).toBeDefined();
      expect(v1.title).toBe('Video khởi động năng lượng cơ thể');
      expect(v1.youtubeId).toBe('dQw4w9WgXcQ');
      expect(v1.category).toBe('Khởi động');

      const v2 = await videoRepo.create({
        title: 'Thí nghiệm khúc xạ ánh sáng',
        youtubeUrl: 'https://youtu.be/abc123xyz89',
        youtubeId: 'abc123xyz89',
        category: 'Khoa học',
        description: 'Vật lý 9 bài khúc xạ',
      });

      // 2. Tìm theo ID
      const found = await videoRepo.findById(v1.id);
      expect(found).not.toBeNull();
      expect(found?.title).toBe(v1.title);

      // 3. Lấy danh sách không lọc
      const all = await videoRepo.list();
      expect(all.length).toBe(2);

      // 4. Lọc theo danh mục
      const filteredCat = await videoRepo.list({ category: 'Khoa học' });
      expect(filteredCat.length).toBe(1);
      expect(filteredCat[0]?.id).toBe(v2.id);

      // 5. Tìm kiếm theo từ khóa
      const searchRes = await videoRepo.list({ search: 'khúc xạ' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0]?.id).toBe(v2.id);

      // 6. Lấy danh mục
      const categories = await videoRepo.listCategories();
      expect(categories).toContain('Khởi động');
      expect(categories).toContain('Khoa học');

      // 7. Cập nhật
      const updated = await videoRepo.update(v1.id, {
        title: 'Video khởi động năng lượng (Đã đổi tên)',
        category: 'Vận động',
      });
      expect(updated?.title).toBe('Video khởi động năng lượng (Đã đổi tên)');
      expect(updated?.category).toBe('Vận động');

      // 8. Xóa
      const deleted = await videoRepo.delete(v2.id);
      expect(deleted).toBe(true);
      const afterDelete = await videoRepo.findById(v2.id);
      expect(afterDelete).toBeNull();
    } finally {
      close();
    }
  });
});
