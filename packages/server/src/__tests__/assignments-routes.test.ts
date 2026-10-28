import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from '../app.js';
import * as XLSX from 'xlsx';

describe('Assignments Server Routes & Hub (@educlass/activity-assignment-hub)', () => {
  let app: FastifyInstance;
  let teacherToken: string;
  let sessionId: string;
  let participantId: string;
  const tempSubmissionsDir = path.join(process.cwd(), 'data', 'test_submissions');

  beforeEach(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });
    await app.ready();

    if (!fs.existsSync(tempSubmissionsDir)) {
      fs.mkdirSync(tempSubmissionsDir, { recursive: true });
    }

    // 1. Đăng nhập Admin & Tạo Giáo viên
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
        username: 'teacher_assignment_test',
        displayName: 'Cô Giáo Tin Học',
        password: 'password123',
        role: 'teacher',
      },
    });

    const teacherLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'teacher_assignment_test', password: 'password123' },
    });
    teacherToken = teacherLogin.json().token;

    // 2. Mở phiên
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        identityMode: 'guest_only',
        allowTeams: false,
      },
    });
    expect(sessionRes.statusCode).toBe(201);
    const sessionData = sessionRes.json().session;
    sessionId = sessionData.id;
    const joinCode = sessionData.joinCode;

    // 3. Học sinh tham gia
    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/sessions/join',
      payload: {
        joinCode,
        nickname: 'Nguyễn Văn Minh',
      },
    });
    expect(joinRes.statusCode).toBe(200);
    participantId = joinRes.json().participant.id;
  });

  afterEach(async () => {
    await app.close();
    if (fs.existsSync(tempSubmissionsDir)) {
      try {
        fs.rmSync(tempSubmissionsDir, { recursive: true, force: true });
      } catch {
        // bỏ qua
      }
    }
  });

  it('provides default submissions directory and system path routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/system/default-submissions-dir',
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.fallbackDir).toBeDefined();

    // Thử open-path với đường dẫn không tồn tại -> 404
    const notFoundRes = await app.inject({
      method: 'POST',
      url: '/api/system/open-path',
      payload: { path: 'Z:/duong_dan_khong_ton_tai_123' },
    });
    expect(notFoundRes.statusCode).toBe(404);
  });

  it('runs assignment-hub activity: materials upload, student submission, file preview', async () => {
    // 1. Khởi động lượt chạy assignment-hub
    const startRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/start`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        activityId: 'assignment-hub',
        config: {
          title: 'Thực hành Tạo Bảng Tính Excel',
          instructions: 'Các em nộp tệp bài làm Excel (.xlsx)',
          targetDirectory: tempSubmissionsDir,
          materials: [],
          allowedExtensions: ['.xlsx', '.docx', '.txt'],
          maxFileSizeMb: 25,
          allowResubmit: true,
        },
      },
    });

    expect(startRes.statusCode).toBe(200);
    const runId = startRes.json().run.id;

    // 2. Giáo viên tải tệp tài liệu phát xuống (Phương án A)
    const sampleDocContent = Buffer.from('Noi dung de thi Word mau').toString('base64');
    const matRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/${runId}/assignment/materials`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        name: 'DeBaiThucHanh.docx',
        size: 512,
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        base64: sampleDocContent,
      },
    });

    expect(matRes.statusCode).toBe(200);
    const materialData = matRes.json();
    expect(materialData.id).toBeDefined();
    expect(materialData.name).toBe('DeBaiThucHanh.docx');

    // Tải tệp tài liệu qua endpoint download
    const dlMatRes = await app.inject({
      method: 'GET',
      url: materialData.url,
    });
    expect(dlMatRes.statusCode).toBe(200);
    expect(dlMatRes.headers['content-disposition']).toContain('DeBaiThucHanh.docx');

    // 3. Tạo một file Excel hợp lệ để học sinh nộp bài
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Họ và Tên', 'Điểm Toán', 'Điểm Văn'],
      ['Nguyễn Văn Minh', 9, 8.5],
      ['Trần Thị Lan', 8, 9],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const excelBase64 = Buffer.from(excelBuffer).toString('base64');

    // 4. Học sinh nộp tệp bài làm
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/${runId}/assignment/submit`,
      payload: {
        participantId,
        displayName: 'Nguyễn Văn Minh',
        filename: 'BaiLam_BangDiem.xlsx',
        fileSize: excelBuffer.length,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64: excelBase64,
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitData = submitRes.json();
    expect(submitData.ok).toBe(true);
    expect(submitData.submission.fileName).toBe('BaiLam_BangDiem.xlsx');
    expect(fs.existsSync(submitData.submission.storedPath)).toBe(true);

    // 5. Kiểm tra tải bài nộp của học sinh
    const dlSubRes = await app.inject({
      method: 'GET',
      url: submitData.submission.downloadUrl,
    });
    expect(dlSubRes.statusCode).toBe(200);
    expect(dlSubRes.headers['content-disposition']).toContain('BaiLam_BangDiem.xlsx');

    // 6. Kiểm tra trích xuất bản xem trước (Preview Excel)
    const previewRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/activities/${runId}/assignment/preview/${participantId}`,
    });
    expect(previewRes.statusCode).toBe(200);
    const previewData = previewRes.json();
    expect(previewData.type).toBe('xlsx');
    expect(previewData.sheets).toBeDefined();
    expect(previewData.sheets.length).toBeGreaterThan(0);
    expect(previewData.sheets[0].name).toBe('BangDiem');
    expect(previewData.sheets[0].data[0]).toEqual(['Họ và Tên', 'Điểm Toán', 'Điểm Văn']);

    // 7. Thử nộp tệp văn bản text xem preview text
    const textBase64 = Buffer.from(
      'Day la doan ma nguon Python:\nprint("Hello EduClass")'
    ).toString('base64');
    const submitTextRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/${runId}/assignment/submit`,
      payload: {
        participantId,
        displayName: 'Nguyễn Văn Minh',
        filename: 'script.txt',
        fileSize: 48,
        mime: 'text/plain',
        base64: textBase64,
      },
    });
    expect(submitTextRes.statusCode).toBe(200);

    const previewTextRes = await app.inject({
      method: 'GET',
      url: `/api/sessions/${sessionId}/activities/${runId}/assignment/preview/${participantId}`,
    });
    expect(previewTextRes.statusCode).toBe(200);
    const previewTextData = previewTextRes.json();
    expect(previewTextData.type).toBe('text');
    expect(previewTextData.content).toContain('print("Hello EduClass")');

    // 8. Kết thúc hoạt động thu bài
    const endRes = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/activities/end`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { runId },
    });
    expect(endRes.statusCode).toBe(200);
  });
});
