import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Videos Routes (/api/videos)', () => {
  it('thực hiện đầy đủ CRUD video, lọc danh mục, tìm kiếm và bảo mật xác thực', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập admin lấy token
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'admin123' },
      });
      expect(adminLogin.statusCode).toBe(200);
      const token = JSON.parse(adminLogin.body).token;

      // 2. Không có token -> 401
      const unauthRes = await app.inject({
        method: 'GET',
        url: '/api/videos',
      });
      expect(unauthRes.statusCode).toBe(401);

      // 3. Lấy danh sách categories mặc định
      const catRes = await app.inject({
        method: 'GET',
        url: '/api/videos/categories',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(catRes.statusCode).toBe(200);
      const categories: string[] = JSON.parse(catRes.body).categories;
      expect(categories).toContain('Khởi động');

      // 4. Tạo video 1: Khởi động
      const createRes1 = await app.inject({
        method: 'POST',
        url: '/api/videos',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Bài hát khởi động vui nhộn',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Khởi động',
          description: 'Khởi động đầu giờ hứng khởi',
        },
      });
      expect(createRes1.statusCode).toBe(201);
      const created1 = JSON.parse(createRes1.body).video;
      expect(created1.youtubeId).toBe('dQw4w9WgXcQ');
      expect(created1.title).toBe('Bài hát khởi động vui nhộn');

      // 5. Tạo video 2: Toán học
      const createRes2 = await app.inject({
        method: 'POST',
        url: '/api/videos',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Học đếm số từ 1 đến 10',
          url: 'https://youtu.be/abcd1234XYZ',
          category: 'Toán học',
          description: 'Toán học vui',
        },
      });
      expect(createRes2.statusCode).toBe(201);
      const created2 = JSON.parse(createRes2.body).video;
      expect(created2.youtubeId).toBe('abcd1234XYZ');

      // 6. Báo lỗi khi link YouTube không hợp lệ
      const invalidRes = await app.inject({
        method: 'POST',
        url: '/api/videos',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Link hỏng',
          url: 'https://example.com/not-youtube',
          category: 'Khác',
        },
      });
      expect(invalidRes.statusCode).toBe(400);

      // 7. Lấy danh sách tất cả video
      const listAllRes = await app.inject({
        method: 'GET',
        url: '/api/videos',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(listAllRes.statusCode).toBe(200);
      const allVideos = JSON.parse(listAllRes.body).videos;
      expect(allVideos.length).toBe(2);

      // 8. Lọc theo danh mục
      const filterCatRes = await app.inject({
        method: 'GET',
        url: '/api/videos?category=Toán học',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(filterCatRes.statusCode).toBe(200);
      const catVideos = JSON.parse(filterCatRes.body).videos;
      expect(catVideos.length).toBe(1);
      expect(catVideos[0].id).toBe(created2.id);

      // 9. Tìm kiếm từ khóa
      const searchRes = await app.inject({
        method: 'GET',
        url: '/api/videos?search=khởi động',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(searchRes.statusCode).toBe(200);
      const searchVideos = JSON.parse(searchRes.body).videos;
      expect(searchVideos.length).toBe(1);
      expect(searchVideos[0].id).toBe(created1.id);

      // 10. Chỉnh sửa video
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/videos/${created1.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Bài hát khởi động năng lượng mới',
          description: 'Cập nhật mô tả',
        },
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.body).video;
      expect(updated.title).toBe('Bài hát khởi động năng lượng mới');
      expect(updated.description).toBe('Cập nhật mô tả');

      // 11. Xóa video
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/videos/${created2.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleteRes.statusCode).toBe(200);

      // 12. Kiểm tra lại danh sách chỉ còn 1 video
      const afterDelRes = await app.inject({
        method: 'GET',
        url: '/api/videos',
        headers: { authorization: `Bearer ${token}` },
      });
      const afterDelVideos = JSON.parse(afterDelRes.body).videos;
      expect(afterDelVideos.length).toBe(1);
      expect(afterDelVideos[0].id).toBe(created1.id);
    } finally {
      await app.close();
    }
  });
});
