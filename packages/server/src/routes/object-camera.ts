import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import type { ObjectCameraState } from '@educlass/activity-object-camera';

export interface ObjectCameraRoutesOptions {
  tempBaseDir?: string;
}

function getLanIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const netList of Object.values(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  if (candidates.length === 0) {
    return '127.0.0.1';
  }

  const wifiOrLan = candidates.find(
    ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
  );

  return wifiOrLan ?? candidates[0] ?? '127.0.0.1';
}

import {
  cleanupSessionObjectCameraFiles,
  deleteObjectCameraFile,
  cleanupUnpinnedObjectCameraFiles,
  cleanupStaleObjectCameraFiles,
  parseObjectCameraFileUrl,
} from '../services/object-camera-storage.js';

export {
  cleanupSessionObjectCameraFiles,
  deleteObjectCameraFile,
  cleanupUnpinnedObjectCameraFiles,
  cleanupStaleObjectCameraFiles,
  parseObjectCameraFileUrl,
};

export const objectCameraRoutes: FastifyPluginAsync<ObjectCameraRoutesOptions> = async (
  fastify,
  options
) => {
  const tempBaseDir =
    options.tempBaseDir ?? path.join(process.cwd(), 'data', 'temp', 'object-camera');

  if (!fs.existsSync(tempBaseDir)) {
    fs.mkdirSync(tempBaseDir, { recursive: true });
  }

  // Tự động dọn dẹp các thư mục ảnh tạm cũ còn sót lại nếu ứng dụng từng bị tắt máy đột ngột
  cleanupStaleObjectCameraFiles(24 * 60 * 60 * 1000, tempBaseDir).catch(() => {});

  /**
   * GET /api/object-camera/connect-info
   * Cung cấp URL mạng LAN rõ ràng và mã QR offline (Base64 PNG) để điện thoại kết nối
   */
  fastify.get<{ Querystring: { token?: string } }>(
    '/api/object-camera/connect-info',
    async (request, reply) => {
      const token = request.query.token || '';
      const lanIp = getLanIpAddress();

      let port = '3000';
      const hostHeader = request.headers.host;
      if (hostHeader && hostHeader.includes(':')) {
        const parts = hostHeader.split(':');
        if (parts[1]) port = parts[1];
      }

      const snapUrl = `http://${lanIp}:${port}/snap?token=${encodeURIComponent(token)}`;

      let qrDataUrl = '';
      if (fastify.qrService) {
        qrDataUrl = await fastify.qrService.generateQrDataUrl(snapUrl);
      }

      return reply.send({
        ok: true,
        lanIp,
        port,
        snapUrl,
        qrDataUrl,
      });
    }
  );

  /**
   * GET /snap
   * Trang Webapp Mobile siêu nhẹ dành riêng cho điện thoại Giáo viên (Zero-Install)
   */
  fastify.get<{ Querystring: { token?: string } }>('/snap', async (request, reply) => {
    const token = request.query.token || '';

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>EduClass • Camera Chụp Bài</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0F172A; color: #F8FAFC; min-height: 100vh; display: flex; flex-direction: column; }
    .header { background: #1E293B; padding: 14px 16px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 16px; font-weight: 700; color: #38BDF8; display: flex; align-items: center; gap: 8px; }
    .container { flex: 1; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .preview-box { width: 100%; max-width: 380px; height: 380px; background: #020617; border: 2px dashed #334155; border-radius: 20px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; margin-bottom: 20px; }
    .preview-img { width: 100%; height: 100%; object-fit: contain; display: none; }
    .empty-state { color: #64748B; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .snap-btn { background: #10B981; color: white; border: none; border-radius: 50%; width: 76px; height: 76px; font-size: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); transition: transform 0.1s; }
    .snap-btn:active { transform: scale(0.92); }
    .send-btn { width: 100%; max-width: 380px; background: #3B82F6; color: white; border: none; padding: 15px; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; display: none; margin-top: 10px; }
    .send-btn:active { background: #2563EB; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10B981; color: #020617; font-weight: 700; padding: 12px 24px; border-radius: 30px; font-size: 14px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); display: none; z-index: 100; }
    .rotate-btn { position: absolute; bottom: 12px; right: 12px; background: rgba(30, 41, 59, 0.85); color: white; border: none; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; display: none; }
    .toggle-row { margin-top: 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>📷</span> Camera Soi Bài Giáo Viên</h1>
    <span style="font-size: 12px; background: #064E3B; color: #34D399; padding: 3px 8px; border-radius: 6px;">Đã kết nối</span>
  </div>

  <div class="container">
    <div class="preview-box" id="previewBox">
      <img id="previewImg" class="preview-img" alt="Xem trước bài làm" />
      <button class="rotate-btn" id="rotateBtn">🔄 Xoay 90°</button>
      <div class="empty-state" id="emptyState">
        <span style="font-size: 48px;">📸</span>
        <span>Bấm nút chụp bên dưới để lấy bài học sinh</span>
      </div>
    </div>

    <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;" />

    <button class="snap-btn" id="snapBtn">📷</button>
    <button class="send-btn" id="sendBtn">🚀 Gửi Lên Máy Tính Ngay</button>

    <div class="toggle-row">
      <input type="checkbox" id="autoSendToggle" checked />
      <label for="autoSendToggle">Tự động gửi ngay sau khi chụp</label>
    </div>
  </div>

  <div class="toast" id="toast">✅ Đã gửi bài lên máy tính thành công!</div>

  <script>
    const token = ${JSON.stringify(token)};
    const cameraInput = document.getElementById('cameraInput');
    const snapBtn = document.getElementById('snapBtn');
    const sendBtn = document.getElementById('sendBtn');
    const previewImg = document.getElementById('previewImg');
    const emptyState = document.getElementById('emptyState');
    const rotateBtn = document.getElementById('rotateBtn');
    const toast = document.getElementById('toast');
    const autoSendToggle = document.getElementById('autoSendToggle');

    let currentBase64 = null;
    let rotation = 0;

    snapBtn.addEventListener('click', () => cameraInput.click());

    cameraInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawBase64 = event.target.result;
        compressAndDisplay(rawBase64);
      };
      reader.readAsDataURL(file);
    });

    function compressAndDisplay(dataUrl) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 2160;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        currentBase64 = canvas.toDataURL('image/jpeg', 0.88);
        previewImg.src = currentBase64;
        previewImg.style.display = 'block';
        emptyState.style.display = 'none';
        rotateBtn.style.display = 'block';
        sendBtn.style.display = 'block';

        if (autoSendToggle.checked) {
          sendPhoto();
        }
      };
      img.src = dataUrl;
    }

    rotateBtn.addEventListener('click', () => {
      if (!currentBase64) return;
      rotation = (rotation + 90) % 360;
      previewImg.style.transform = 'rotate(' + rotation + 'deg)';
    });

    sendBtn.addEventListener('click', sendPhoto);

    async function sendPhoto() {
      if (!currentBase64) return;
      sendBtn.disabled = true;
      sendBtn.innerText = '⏳ Đang truyền qua mạng LAN...';

      try {
        const res = await fetch('/api/object-camera/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token,
            base64: currentBase64,
            filename: 'bai_hoc_sinh_' + Date.now() + '.jpg'
          })
        });

        const data = await res.json();
        if (res.ok) {
          showToast();
          sendBtn.innerText = '✅ Đã gửi! Bấm để gửi lại nếu cần';
        } else {
          alert('Lỗi: ' + (data.error || 'Không thể gửi ảnh'));
          sendBtn.innerText = '🚀 Thử gửi lại';
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
        sendBtn.innerText = '🚀 Thử gửi lại';
      } finally {
        sendBtn.disabled = false;
      }
    }

    function showToast() {
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }
  </script>
</body>
</html>`;

    reply.type('text/html').send(html);
  });

  /**
   * POST /api/object-camera/upload
   * Nhận ảnh chụp từ điện thoại Giáo viên qua mã token bảo mật
   */
  fastify.post<{
    Body: {
      token: string;
      base64: string;
      filename?: string;
      studentId?: string;
      studentName?: string;
    };
  }>(
    '/api/object-camera/upload',
    { bodyLimit: 50 * 1024 * 1024 }, // Hỗ trợ ảnh lên đến 50MB
    async (request, reply) => {
      const { token, base64, filename, studentId, studentName } = request.body;

      if (!token || !base64) {
        return reply.status(400).send({ error: 'Thiếu mã token hoặc dữ liệu hình ảnh' });
      }

      // 1. Tìm kiếm lượt chạy ObjectCameraActivity đang diễn ra có token trùng khớp
      let matchedSessionId: string | null = null;
      let matchedRunId: string | null = null;
      let matchedState: ObjectCameraState | null = null;

      // Duyệt qua tất cả các session đang mở
      const openSessions = await fastify.sessionRepo.listActiveSessions();
      for (const session of openSessions) {
        const activeRun = fastify.activityEngine.getActiveRun(session.id);
        if (activeRun && activeRun.run.activityId === 'object-camera') {
          const st = activeRun.state as ObjectCameraState;
          if (st.uploadToken === token) {
            matchedSessionId = session.id;
            matchedRunId = activeRun.run.id;
            matchedState = st;
            break;
          }
        }
      }

      if (!matchedSessionId || !matchedRunId || !matchedState) {
        return reply.status(403).send({
          error: 'Mã kết nối không hợp lệ hoặc phiên Camera vật thể đã kết thúc',
        });
      }

      if (matchedState.isCaptureLocked) {
        return reply.status(403).send({
          error: 'Giáo viên đã khóa cổng nhận ảnh',
        });
      }

      // 2. Xử lý lưu ảnh vào thư mục tạm của phiên
      const sessionTempDir = path.join(tempBaseDir, matchedSessionId);
      if (!fs.existsSync(sessionTempDir)) {
        fs.mkdirSync(sessionTempDir, { recursive: true });
      }

      let mime = 'image/jpeg';
      let cleanBase64 = base64;
      const match = base64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (match && match[1] && match[2]) {
        mime = match[1];
        cleanBase64 = match[2];
      }

      const buffer = Buffer.from(cleanBase64, 'base64');
      const hash = createHash('sha256').update(buffer).digest('hex').substring(0, 16);
      const ext = mime.includes('png') ? 'png' : 'jpg';
      const safeFilename = `${hash}_${Date.now()}.${ext}`;
      const filePath = path.join(sessionTempDir, safeFilename);

      await fs.promises.writeFile(filePath, buffer);

      const fileUrl = `/api/object-camera/files/${matchedSessionId}/${safeFilename}`;
      const photoId = `photo-${Date.now()}-${hash.substring(0, 6)}`;

      // 3. Dispatch intent ADD_PHOTO vào ActivityEngine để cập nhật bảng điều khiển GV & Học sinh ngay tức khắc!
      try {
        await fastify.activityEngine.handleTeacherIntent(matchedSessionId, matchedRunId, {
          type: 'ADD_PHOTO',
          photo: {
            id: photoId,
            name: filename || `Bài chụp lúc ${new Date().toLocaleTimeString('vi-VN')}`,
            url: fileUrl,
            width: 1920,
            height: 1080,
            capturedAt: Date.now(),
            studentId,
            studentName,
            isPinned: false,
          },
        });
      } catch (err) {
        fastify.log.warn({ err }, 'Không thể gửi intent ADD_PHOTO tự động');
      }

      return reply.send({
        ok: true,
        photoId,
        url: fileUrl,
        message: 'Tải ảnh lên thành công',
      });
    }
  );

  /**
   * GET /api/object-camera/files/:sessionId/:filename
   * Cung cấp file ảnh tĩnh cho các thiết bị trong mạng LAN
   */
  fastify.get<{ Params: { sessionId: string; filename: string } }>(
    '/api/object-camera/files/:sessionId/:filename',
    async (request, reply) => {
      const { sessionId, filename } = request.params;
      const safeFilename = path.basename(filename);
      const filePath = path.join(tempBaseDir, sessionId, safeFilename);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: 'Không tìm thấy hình ảnh' });
      }

      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

      const stream = fs.createReadStream(filePath);
      return reply.type(contentType).send(stream);
    }
  );

  /**
   * POST /api/object-camera/delete-file
   * Xóa vĩnh viễn một file ảnh vật lý cụ thể khỏi ổ đĩa máy tính
   */
  fastify.post<{
    Body: {
      url?: string;
      sessionId?: string;
      filename?: string;
    };
  }>('/api/object-camera/delete-file', async (request, reply) => {
    const body = request.body;
    const deleteParams: { url?: string; sessionId?: string; filename?: string } = {};
    if (body?.url) deleteParams.url = body.url;
    if (body?.sessionId) deleteParams.sessionId = body.sessionId;
    if (body?.filename) deleteParams.filename = body.filename;
    const deleted = await deleteObjectCameraFile(deleteParams, tempBaseDir);
    return reply.send({
      ok: true,
      deleted,
      message: deleted ? 'Đã xóa file vĩnh viễn khỏi máy tính' : 'Không tìm thấy file để xóa',
    });
  });

  /**
   * POST /api/object-camera/cleanup-unpinned
   * Dọn sạch tất cả các file ảnh tạm chưa ghim trong phiên
   */
  fastify.post<{
    Body: {
      sessionId?: string;
      keepUrls?: string[];
    };
  }>('/api/object-camera/cleanup-unpinned', async (request, reply) => {
    const { sessionId: rawSessionId, keepUrls = [] } = request.body || {};
    let targetSessionId = rawSessionId;

    if (!targetSessionId && keepUrls.length > 0 && keepUrls[0]) {
      const parsed = parseObjectCameraFileUrl(keepUrls[0]);
      if (parsed) {
        targetSessionId = parsed.sessionId;
      }
    }

    if (!targetSessionId) {
      const openSessions = await fastify.sessionRepo.listActiveSessions();
      for (const session of openSessions) {
        const activeRun = fastify.activityEngine.getActiveRun(session.id);
        if (activeRun && activeRun.run.activityId === 'object-camera') {
          targetSessionId = session.id;
          break;
        }
      }
    }

    if (!targetSessionId) {
      return reply.status(400).send({ error: 'Không xác định được phiên để dọn rác ảnh' });
    }

    const deletedCount = await cleanupUnpinnedObjectCameraFiles(
      targetSessionId,
      keepUrls,
      tempBaseDir
    );

    return reply.send({
      ok: true,
      sessionId: targetSessionId,
      deletedCount,
      message: `Đã dọn dẹp ${deletedCount} file ảnh tạm khỏi máy tính`,
    });
  });

  /**
   * DELETE /api/object-camera/files/:sessionId/:filename
   * Xóa một file ảnh cụ thể theo URL param
   */
  fastify.delete<{ Params: { sessionId: string; filename: string } }>(
    '/api/object-camera/files/:sessionId/:filename',
    async (request, reply) => {
      const { sessionId, filename } = request.params;
      const deleted = await deleteObjectCameraFile({ sessionId, filename }, tempBaseDir);
      return reply.send({ ok: true, deleted });
    }
  );

  /**
   * DELETE /api/sessions/:sessionId/activities/:runId/object-camera/clear-all
   * Dọn dẹp tất cả các file tạm trong thư mục của phiên
   */
  fastify.delete<{ Params: { sessionId: string; runId: string } }>(
    '/api/sessions/:sessionId/activities/:runId/object-camera/clear-all',
    async (request, reply) => {
      const { sessionId } = request.params;
      cleanupSessionObjectCameraFiles(sessionId, tempBaseDir);
      return reply.send({ ok: true, message: 'Đã dọn sạch toàn bộ ảnh tạm' });
    }
  );
};
