import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';

describe('Owner-Based Access Control: Cross-Teacher Isolation (D5 PLAN.md)', () => {
  it('strictly prevents GV A from accessing GV B data while allowing Admin full access', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập Admin mặc định
      const adminLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'admin123',
        },
      });
      const adminToken = JSON.parse(adminLoginRes.body).token;

      // 2. Admin tạo tài khoản GV A và GV B
      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          username: 'gv_a',
          password: 'password123',
          displayName: 'Cô A',
          role: 'teacher',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          username: 'gv_b',
          password: 'password123',
          displayName: 'Thầy B',
          role: 'teacher',
        },
      });

      // 3. Đăng nhập lấy token cho GV A và GV B
      const gvALoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'gv_a', password: 'password123' },
      });
      const tokenA = JSON.parse(gvALoginRes.body).token;

      const gvBLoginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'gv_b', password: 'password123' },
      });
      const tokenB = JSON.parse(gvBLoginRes.body).token;

      // 4. GV A tạo 2 lớp học (Lớp 10A1, 10A2)
      const classA1Res = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '10A1', year: 2026 },
      });
      expect(classA1Res.statusCode).toBe(201);
      const classA1 = JSON.parse(classA1Res.body).class;

      const classA2Res = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '10A2', year: 2026 },
      });
      expect(classA2Res.statusCode).toBe(201);

      // 5. GV B tạo 1 lớp học (Lớp 11B1)
      const classB1Res = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { name: '11B1', year: 2026 },
      });
      expect(classB1Res.statusCode).toBe(201);
      const classB1 = JSON.parse(classB1Res.body).class;

      // 6. KIỂM TRA GET /api/classes (Danh sách):
      // - GV A CHỈ THẤY lớp của GV A, KHÔNG THẤY lớp của GV B
      const listARes = await app.inject({
        method: 'GET',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(listARes.statusCode).toBe(200);
      const listA = JSON.parse(listARes.body).classes;
      expect(listA).toHaveLength(2);
      expect(listA.map((c: { name: string }) => c.name)).toContain('10A1');
      expect(listA.map((c: { name: string }) => c.name)).toContain('10A2');
      expect(listA.map((c: { name: string }) => c.name)).not.toContain('11B1');

      // - GV B CHỈ THẤY lớp của GV B, KHÔNG THẤY lớp của GV A
      const listBRes = await app.inject({
        method: 'GET',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(listBRes.statusCode).toBe(200);
      const listB = JSON.parse(listBRes.body).classes;
      expect(listB).toHaveLength(1);
      expect(listB[0].name).toBe('11B1');

      // - Admin THẤY TOÀN BỘ lớp của cả GV A và GV B (D5 PLAN.md)
      const listAdminRes = await app.inject({
        method: 'GET',
        url: '/api/classes',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(listAdminRes.statusCode).toBe(200);
      const listAdmin = JSON.parse(listAdminRes.body).classes;
      expect(listAdmin).toHaveLength(3);

      // 7. KIỂM TRA TRUY CẬP CHÉO: GV A CỐ TÌNH ĐỌC LỚP CỦA GV B (GET /api/classes/:id)
      // -> Server PHẢI CHẶN VỚI 403 FORBIDDEN
      const crossReadRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(crossReadRes.statusCode).toBe(403);
      const crossReadBody = JSON.parse(crossReadRes.body);
      expect(crossReadBody.error.code).toBe('FORBIDDEN');

      // 8. KIỂM TRA TRUY CẬP CHÉO: GV A CỐ TÌNH SỬA LỚP CỦA GV B (PATCH /api/classes/:id)
      // -> Server PHẢI CHẶN VỚI 403 FORBIDDEN
      const crossUpdateRes = await app.inject({
        method: 'PATCH',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: 'Hack lớp 11B1' },
      });
      expect(crossUpdateRes.statusCode).toBe(403);
      expect(JSON.parse(crossUpdateRes.body).error.code).toBe('FORBIDDEN');

      // 9. KIỂM TRA TRUY CẬP CHÉO: GV A CỐ TÌNH XÓA LỚP CỦA GV B (DELETE /api/classes/:id)
      // -> Server PHẢI CHẶN VỚI 403 FORBIDDEN
      const crossDeleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(crossDeleteRes.statusCode).toBe(403);
      expect(JSON.parse(crossDeleteRes.body).error.code).toBe('FORBIDDEN');

      // 10. GV B đọc chính lớp của mình -> THÀNH CÔNG (200)
      const selfReadBRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(selfReadBRes.statusCode).toBe(200);
      expect(JSON.parse(selfReadBRes.body).class.name).toBe('11B1');

      // 11. Admin đọc lớp của GV B -> THÀNH CÔNG (200)
      const adminReadBRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminReadBRes.statusCode).toBe(200);
      expect(JSON.parse(adminReadBRes.body).class.name).toBe('11B1');

      // 12. Admin sửa và xóa lớp của GV B -> THÀNH CÔNG (200)
      const adminUpdateRes = await app.inject({
        method: 'PATCH',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: '11B1 - Được Admin cập nhật' },
      });
      expect(adminUpdateRes.statusCode).toBe(200);

      const adminDeleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/classes/${classB1.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminDeleteRes.statusCode).toBe(200);

      // 13. GV A đọc chính lớp của mình -> THÀNH CÔNG (200)
      const selfReadARes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classA1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(selfReadARes.statusCode).toBe(200);
      expect(JSON.parse(selfReadARes.body).class.name).toBe('10A1');
    } finally {
      await app.close();
    }
  });
});
