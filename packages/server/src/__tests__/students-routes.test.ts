import { describe, expect, it } from 'vitest';
import { buildServer } from '../app.js';
import { ExcelService } from '../services/excel-service.js';

describe('Students REST Routes & Import Flow (Task 1.3)', () => {
  it('supports manual student creation, editing, setting PIN, clipboard paste & xlsx preview, commit import, and cross-teacher guard', async () => {
    const app = await buildServer({
      fastifyOptions: { logger: false },
    });

    try {
      // 1. Đăng nhập Admin và tạo 2 giáo viên (GV A, GV B)
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

      const tokenA = JSON.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { username: 'gv_a', password: 'password123' },
          })
        ).body
      ).token;

      const tokenB = JSON.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { username: 'gv_b', password: 'password123' },
          })
        ).body
      ).token;

      // 2. GV A tạo lớp học 12A1
      const classRes = await app.inject({
        method: 'POST',
        url: '/api/classes',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { name: '12A1', year: 2026 },
      });
      const classId = JSON.parse(classRes.body).class.id;

      // 3. Thêm học sinh bằng tay (có mã PIN)
      const addStudentRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          fullName: 'Nguyễn Văn An',
          code: 'HS001',
          pin: '1234',
        },
      });
      expect(addStudentRes.statusCode).toBe(201);
      const student1 = JSON.parse(addStudentRes.body).student;
      expect(student1.fullName).toBe('Nguyễn Văn An');
      expect(student1.code).toBe('HS001');
      expect(student1.hasPin).toBe(true);

      // 4. Sửa thông tin học sinh
      const updateStudentRes = await app.inject({
        method: 'PATCH',
        url: `/api/classes/${classId}/students/${student1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          fullName: 'Nguyễn Văn An (Lớp trưởng)',
        },
      });
      expect(updateStudentRes.statusCode).toBe(200);
      expect(JSON.parse(updateStudentRes.body).student.fullName).toBe('Nguyễn Văn An (Lớp trưởng)');

      // 5. Đổi/Reset PIN học sinh
      // Đặt PIN mới
      const newPinRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students/${student1.id}/pin`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { pin: '9999' },
      });
      expect(newPinRes.statusCode).toBe(200);
      expect(JSON.parse(newPinRes.body).hasPin).toBe(true);

      // Xóa PIN (reset về null)
      const clearPinRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students/${student1.id}/pin`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { pin: null },
      });
      expect(clearPinRes.statusCode).toBe(200);
      expect(JSON.parse(clearPinRes.body).hasPin).toBe(false);

      // 6. Xem trước dán từ Excel (Clipboard paste)
      const pasteText = `STT\tHọ và tên\tMã HS\tMã PIN
1\tTrần Thị Bích\tHS002\t1111
2\tNguyễn Văn An (Lớp trưởng)\tHS001\t2222
3\tLê Văn Cường\tHS003\t3333`;

      const previewPasteRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students/preview-paste`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { text: pasteText },
      });
      expect(previewPasteRes.statusCode).toBe(200);
      const previewData = JSON.parse(previewPasteRes.body);
      expect(previewData.total).toBe(3);
      // Dòng 2 bị cảnh báo trùng học sinh đã có sẵn trong lớp (Nguyễn Văn An)
      expect(previewData.warningCount).toBe(1);
      expect(previewData.items[1].warnings.length).toBeGreaterThan(0);

      // 7. Xem trước tệp Excel (.xlsx preview)
      const excelService = new ExcelService();
      const templateBuf = excelService.generateTemplateBuffer();
      const fileBase64 = templateBuf.toString('base64');

      const previewXlsxRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students/preview-xlsx`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { fileBase64 },
      });
      expect(previewXlsxRes.statusCode).toBe(200);
      const xlsxPreview = JSON.parse(previewXlsxRes.body);
      expect(xlsxPreview.total).toBe(3);

      // 8. Xác nhận import học sinh vào lớp (Commit Import)
      const commitRes = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students/import`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          students: [
            { fullName: 'Trần Thị Bích', code: 'HS002', pin: '1111' },
            { fullName: 'Lê Văn Cường', code: 'HS003', pin: '3333' },
            { fullName: 'Nguyễn Văn An (Lớp trưởng)', code: 'HS001' }, // Trùng -> bị skipDuplicates bỏ qua
          ],
          skipDuplicates: true,
        },
      });
      expect(commitRes.statusCode).toBe(201);
      const commitBody = JSON.parse(commitRes.body);
      expect(commitBody.insertedCount).toBe(2); // Chỉ 2 em chưa trùng được thêm vào

      // 9. Lấy danh sách toàn bộ học sinh trong lớp
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      expect(listBody.total).toBe(3); // An + Bích + Cường

      // 10. KIỂM TRA CHẶN TRUY CẬP CHÉO: GV B cố tình thao tác trên học sinh lớp của GV A -> 403 FORBIDDEN
      const crossGetStudents = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(crossGetStudents.statusCode).toBe(403);

      const crossAddStudent = await app.inject({
        method: 'POST',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { fullName: 'Học sinh xâm nhập', code: 'HACK' },
      });
      expect(crossAddStudent.statusCode).toBe(403);

      // 11. Xóa 1 học sinh khỏi lớp
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/classes/${classId}/students/${student1.id}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(deleteRes.statusCode).toBe(200);

      const listAfterDelete = await app.inject({
        method: 'GET',
        url: `/api/classes/${classId}/students`,
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(JSON.parse(listAfterDelete.body).total).toBe(2);
    } finally {
      await app.close();
    }
  });
});
