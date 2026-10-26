import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDocxBuffer } from '@educlass/question-kit';
import { buildServer } from '../app.js';

describe('Question Sets Routes (Task 2.3)', () => {
  it('handles CRUD, access isolation, search, clone, export and import .educlass', async () => {
    const tempDir = path.join(process.cwd(), 'temp_test_assets_' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    const app = await buildServer({
      fastifyOptions: { logger: false },
      assetsDir: tempDir,
    });

    try {
      // 1. Admin login & create 2 teachers
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'admin123' },
      });
      const adminToken = JSON.parse(adminLogin.body).token;

      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          username: 'teacher_1',
          password: 'pass123',
          displayName: 'Cô Mai',
          role: 'teacher',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          username: 'teacher_2',
          password: 'pass123',
          displayName: 'Thầy Hưng',
          role: 'teacher',
        },
      });

      const t1Login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_1', password: 'pass123' },
      });
      const token1 = JSON.parse(t1Login.body).token;

      const t2Login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'teacher_2', password: 'pass123' },
      });
      const token2 = JSON.parse(t2Login.body).token;

      // 2. Cô Mai tải lên 1 asset ảnh trước
      const base64Pixel =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const uploadRes = await app.inject({
        method: 'POST',
        url: '/api/assets',
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          base64: base64Pixel,
          mime: 'image/png',
        },
      });
      expect(uploadRes.statusCode).toBe(201);
      const assetSha = JSON.parse(uploadRes.body).sha256;

      // 3. Cô Mai tạo bộ đề Toán 12
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          title: 'Đề kiểm tra Khảo sát hàm số',
          subject: 'Toán',
          grade: 12,
          tags: ['Giải tích', 'Khảo sát hàm số'],
        },
      });
      expect(createRes.statusCode).toBe(201);
      const set1 = JSON.parse(createRes.body).questionSet;
      expect(set1.id).toBeDefined();
      expect(set1.title).toBe('Đề kiểm tra Khảo sát hàm số');
      expect(set1.tags).toEqual(['Giải tích', 'Khảo sát hàm số']);

      // 4. Cô Mai thêm câu hỏi vào bộ đề
      const updateQuestionsRes = await app.inject({
        method: 'PUT',
        url: `/api/question-sets/${set1.id}/questions`,
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          questions: [
            {
              type: 'mcq4',
              stem: {
                text: 'Cho hàm số có đồ thị như hình vẽ:',
                images: [assetSha],
              },
              options: [
                { text: 'Đồng biến trên R', images: [] },
                { text: 'Nghịch biến trên R', images: [] },
                { text: 'Có 2 điểm cực trị', images: [] },
                { text: 'Không có cực trị', images: [] },
              ],
              correct: 2,
              points: 10,
            },
          ],
        },
      });
      expect(updateQuestionsRes.statusCode).toBe(200);
      const qList = JSON.parse(updateQuestionsRes.body).questions;
      expect(qList).toHaveLength(1);

      // 5. Thầy Hưng (t2) cố truy cập bộ đề của Cô Mai -> 403 Forbidden
      const t2AccessRes = await app.inject({
        method: 'GET',
        url: `/api/question-sets/${set1.id}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(t2AccessRes.statusCode).toBe(403);

      // 6. Danh sách bộ đề: Cô Mai thấy 1 bộ đề, Thầy Hưng thấy 0 bộ đề, Admin thấy 1 bộ đề
      const t1ListRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(t1ListRes.body).questionSets).toHaveLength(1);

      const t2ListRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(JSON.parse(t2ListRes.body).questionSets).toHaveLength(0);

      const adminListRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(JSON.parse(adminListRes.body).questionSets).toHaveLength(1);

      // 7. Lọc theo search và tag
      const searchRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets?search=Khảo sát',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(searchRes.body).questionSets).toHaveLength(1);

      const tagRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets?tag=Giải tích',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(tagRes.body).questionSets).toHaveLength(1);

      const wrongTagRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets?tag=Hình học',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(wrongTagRes.body).questionSets).toHaveLength(0);

      // 8. Nhân bản bộ đề (Clone): Thầy Hưng nhân bản bộ đề của Cô Mai
      const cloneRes = await app.inject({
        method: 'POST',
        url: `/api/question-sets/${set1.id}/clone`,
        headers: { authorization: `Bearer ${token2}` },
        payload: {
          title: 'Đề kiểm tra do Thầy Hưng sao chép',
        },
      });
      expect(cloneRes.statusCode).toBe(201);
      const clonedSet = JSON.parse(cloneRes.body).questionSet;
      expect(clonedSet.id).not.toBe(set1.id);
      expect(clonedSet.title).toBe('Đề kiểm tra do Thầy Hưng sao chép');
      expect(clonedSet.ownerId).not.toBe(set1.ownerId);

      // Giờ Thầy Hưng đã có 1 bộ đề
      const t2NewList = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(JSON.parse(t2NewList.body).questionSets).toHaveLength(1);

      // 9. Xuất file .educlass (Export)
      const exportRes = await app.inject({
        method: 'GET',
        url: `/api/question-sets/${set1.id}/export`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(exportRes.statusCode).toBe(200);
      const educlassData = JSON.parse(exportRes.body);
      expect(educlassData.format).toBe('educlass');
      expect(educlassData.version).toBe(1);
      expect(educlassData.questionSet.title).toBe('Đề kiểm tra Khảo sát hàm số');
      expect(educlassData.questions).toHaveLength(1);
      expect(educlassData.assets).toHaveLength(1);
      expect(educlassData.assets[0].sha256).toBe(assetSha);
      expect(educlassData.assets[0].base64).toBe(base64Pixel);

      // 10. Nhập file .educlass (Import)
      // Thầy Hưng nhập file .educlass của Cô Mai thành bộ đề mới của Thầy Hưng
      const importRes = await app.inject({
        method: 'POST',
        url: '/api/question-sets/import',
        headers: { authorization: `Bearer ${token2}` },
        payload: educlassData,
      });
      expect(importRes.statusCode).toBe(201);
      const importedSet = JSON.parse(importRes.body).questionSet;
      expect(importedSet.title).toBe('Đề kiểm tra Khảo sát hàm số');

      const t2AfterImport = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(JSON.parse(t2AfterImport.body).questionSets).toHaveLength(2);

      // 11. Xóa bộ đề: Thầy Hưng không xóa được đề của Cô Mai (403), nhưng Cô Mai xóa được
      const deleteFailRes = await app.inject({
        method: 'DELETE',
        url: `/api/question-sets/${set1.id}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(deleteFailRes.statusCode).toBe(403);

      const deleteSuccessRes = await app.inject({
        method: 'DELETE',
        url: `/api/question-sets/${set1.id}`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(deleteSuccessRes.statusCode).toBe(200);

      const t1AfterDelete = await app.inject({
        method: 'GET',
        url: '/api/question-sets',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(t1AfterDelete.body).questionSets).toHaveLength(0);

      // 12. Tải file Word mẫu (GET /api/question-sets/templates/word)
      const templateRes = await app.inject({
        method: 'GET',
        url: '/api/question-sets/templates/word',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(templateRes.statusCode).toBe(200);
      expect(templateRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(templateRes.rawPayload.length).toBeGreaterThan(100);

      // 13. Nhập đề từ file Word (POST /api/question-sets/import-word)
      const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/word-samples/sample-1-math-mcq.docx');
      let docxBase64: string;
      if (fs.existsSync(fixturePath)) {
        docxBase64 = fs.readFileSync(fixturePath).toString('base64');
      } else {
        const testBuf = await createDocxBuffer(`
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Câu hỏi 1</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. </w:t></w:r><w:r><w:t>A</w:t></w:r></w:p>
          <w:p><w:r><w:t>B. B</w:t></w:r></w:p>
          <w:p><w:r><w:t>C. C</w:t></w:r></w:p>
          <w:p><w:r><w:t>D. D</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Câu hỏi 2</w:t></w:r></w:p>
          <w:p><w:r><w:t>A. A</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>B. </w:t></w:r><w:r><w:t>B</w:t></w:r></w:p>
          <w:p><w:r><w:t>C. C</w:t></w:r></w:p>
          <w:p><w:r><w:t>D. D</w:t></w:r></w:p>
        `);
        docxBase64 = testBuf.toString('base64');
      }

      const importWordRes = await app.inject({
        method: 'POST',
        url: '/api/question-sets/import-word',
        headers: { authorization: `Bearer ${token1}` },
        payload: {
          base64: docxBase64,
        },
      });
      expect(importWordRes.statusCode).toBe(200);
      const wordData = JSON.parse(importWordRes.body);
      expect(wordData.questions).toHaveLength(2);
      expect(wordData.totalDetected).toBe(2);
      expect(wordData.successCount).toBe(2);
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});

