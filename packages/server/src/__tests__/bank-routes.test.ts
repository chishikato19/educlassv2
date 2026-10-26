import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  runMigrations,
  UserRepository,
} from '@educlass/db';
import { buildServer } from '../app.js';
import { ScryptPasswordHasher } from '../auth/password-hasher.js';

describe('Bank Routes REST API (Task 2.2)', () => {
  it('handles question CRUD, tree grouping, matrix stats, and auto exam generation', async () => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    const userRepo = new UserRepository(conn.db);
    const hasher = new ScryptPasswordHasher();

    // 1. Tạo tài khoản giáo viên
    await userRepo.create({
      username: 'gv_toan_bank',
      passwordHash: await hasher.hash('pass123'),
      displayName: 'Thầy Hùng Toán',
      role: 'teacher',
    });

    const app = await buildServer({
      db: conn.db,
      autoSeedAdmin: true,
      fastifyOptions: { logger: false },
    });

    try {
      // Đăng nhập giáo viên lấy Token
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'gv_toan_bank', password: 'pass123' },
      });
      expect(loginRes.statusCode).toBe(200);
      const token = JSON.parse(loginRes.body).token as string;
      const headers = { authorization: `Bearer ${token}` };

      // 2. POST /api/bank/questions (Tạo 1 câu hỏi)
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/bank/questions',
        headers,
        payload: {
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Ứng dụng đạo hàm',
          lesson: 'Bài 1: Tính đơn điệu',
          difficulty: 'nb',
          type: 'mcq4',
          contentJson: JSON.stringify({ stem: { text: 'Cho hàm số f(x)...' } }),
          answerJson: JSON.stringify({ correct: 0 }),
          points: 10,
        },
      });
      expect(createRes.statusCode).toBe(201);
      const q1 = JSON.parse(createRes.body);
      expect(q1.id).toBeDefined();
      expect(q1.difficulty).toBe('nb');

      // 3. POST /api/bank/questions/batch (Thêm hàng loạt câu hỏi)
      const batchRes = await app.inject({
        method: 'POST',
        url: '/api/bank/questions/batch',
        headers,
        payload: {
          questions: [
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 1: Tính đơn điệu',
              difficulty: 'th',
              type: 'mcq4',
              contentJson: JSON.stringify({ stem: { text: 'Tìm khoảng đồng biến...' } }),
              answerJson: JSON.stringify({ correct: 1 }),
              points: 10,
            },
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 1: Tính đơn điệu',
              difficulty: 'vd',
              type: 'mcq4',
              contentJson: JSON.stringify({ stem: { text: 'Tìm m để hàm số...' } }),
              answerJson: JSON.stringify({ correct: 2 }),
              points: 10,
            },
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 2: Cực trị',
              difficulty: 'nb',
              type: 'mcq4',
              contentJson: JSON.stringify({ stem: { text: 'Số điểm cực trị là...' } }),
              answerJson: JSON.stringify({ correct: 0 }),
              points: 10,
            },
            {
              grade: 12,
              subject: 'Toán',
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 2: Cực trị',
              difficulty: 'th',
              type: 'mcq4',
              contentJson: JSON.stringify({ stem: { text: 'Giá trị cực đại là...' } }),
              answerJson: JSON.stringify({ correct: 3 }),
              points: 10,
            },
          ],
        },
      });
      expect(batchRes.statusCode).toBe(201);
      expect(JSON.parse(batchRes.body).count).toBe(4);

      // 4. GET /api/bank/tree (Lấy cây phân cấp Chương - Bài)
      const treeRes = await app.inject({
        method: 'GET',
        url: '/api/bank/tree?grade=12&subject=Toán',
        headers,
      });
      expect(treeRes.statusCode).toBe(200);
      const tree = JSON.parse(treeRes.body);
      expect(tree.length).toBe(1);
      expect(tree[0].chapter).toBe('Chương 1: Ứng dụng đạo hàm');
      expect(tree[0].lessons.length).toBe(2);

      // 5. GET /api/bank/questions (Lọc câu hỏi)
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/bank/questions?grade=12&subject=Toán&lesson=Bài 1: Tính đơn điệu&difficulty=nb',
        headers,
      });
      expect(listRes.statusCode).toBe(200);
      const listNb = JSON.parse(listRes.body);
      expect(listNb.length).toBe(1);

      // 6. GET /api/bank/questions/:id
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/bank/questions/${q1.id}`,
        headers,
      });
      expect(detailRes.statusCode).toBe(200);
      expect(JSON.parse(detailRes.body).id).toBe(q1.id);

      // 7. PUT /api/bank/questions/:id
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/bank/questions/${q1.id}`,
        headers,
        payload: {
          points: 15,
        },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(JSON.parse(updateRes.body).points).toBe(15);

      // 8. POST /api/bank/matrix-stats (Thống kê số câu sẵn có theo ma trận)
      const statsRes = await app.inject({
        method: 'POST',
        url: '/api/bank/matrix-stats',
        headers,
        payload: {
          grade: 12,
          subject: 'Toán',
          lessons: ['Bài 1: Tính đơn điệu', 'Bài 2: Cực trị'],
        },
      });
      expect(statsRes.statusCode).toBe(200);
      const statsData = JSON.parse(statsRes.body).stats;
      expect(statsData['Bài 1: Tính đơn điệu'].available.nb).toBe(1);
      expect(statsData['Bài 1: Tính đơn điệu'].available.th).toBe(1);
      expect(statsData['Bài 2: Cực trị'].available.th).toBe(1);

      // 9. POST /api/bank/generate-set (Sinh bộ đề ngẫu nhiên từ ma trận)
      const generateRes = await app.inject({
        method: 'POST',
        url: '/api/bank/generate-set',
        headers,
        payload: {
          title: 'Đề kiểm tra 15p Đạo hàm từ Ma trận',
          grade: 12,
          subject: 'Toán',
          matrix: [
            {
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 1: Tính đơn điệu',
              counts: { nb: 1, th: 1, vd: 0, vdc: 0 },
            },
            {
              chapter: 'Chương 1: Ứng dụng đạo hàm',
              lesson: 'Bài 2: Cực trị',
              counts: { nb: 1, th: 1, vd: 0, vdc: 0 },
            },
          ],
          shuffleQuestions: true,
          shuffleOptions: true,
        },
      });
      expect(generateRes.statusCode).toBe(201);
      const generated = JSON.parse(generateRes.body);
      expect(generated.success).toBe(true);
      expect(generated.setId).toBeDefined();
      expect(generated.totalQuestions).toBe(4);

      // Kiểm tra bộ đề vừa tạo có thể xem được qua API /api/question-sets/:id
      const setRes = await app.inject({
        method: 'GET',
        url: `/api/question-sets/${generated.setId}`,
        headers,
      });
      expect(setRes.statusCode).toBe(200);
      const createdSet = JSON.parse(setRes.body);
      expect(createdSet.questions.length).toBe(4);

      // 10. DELETE /api/bank/questions/:id
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/bank/questions/${q1.id}`,
        headers,
      });
      expect(delRes.statusCode).toBe(200);
      expect(JSON.parse(delRes.body).success).toBe(true);

      const afterDel = await app.inject({
        method: 'GET',
        url: `/api/bank/questions/${q1.id}`,
        headers,
      });
      expect(afterDel.statusCode).toBe(404);
    } finally {
      conn.close();
    }
  });
});
