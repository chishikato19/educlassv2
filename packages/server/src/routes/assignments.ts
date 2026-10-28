import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { renderDocxToHtml, extractPptxSummary } from '@educlass/question-kit';
import * as XLSX from 'xlsx';

export interface AssignmentsRoutesOptions {
  submissionsBaseDir?: string;
  materialsBaseDir?: string;
}

import type { ActivityRunDto } from '@educlass/protocol';

function sanitizeFileName(name: string): string {
  // Loại bỏ các ký tự nguy hiểm cho hệ thống tệp và chống path traversal
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.\.+/g, '.');
}

/**
 * Trợ giúp tìm kiếm chính xác lượt chạy Thu - phát bài tập (assignment-hub)
 * Đảm bảo hoạt động chuẩn xác cả khi chạy độc lập lẫn khi chạy song song với Kì thi
 */
function getActiveAssignmentRun(
  activityEngine: {
    getActiveRun: (
      sessionId: string,
      runIdOrActivityId?: string
    ) => { run: ActivityRunDto; state: unknown } | null;
    getActiveRuns: (sessionId: string) => Array<{ run: ActivityRunDto; state: unknown }>;
  },
  sessionId: string,
  runId?: string
): { run: ActivityRunDto; state: unknown } | null {
  // 1. Nếu có runId cụ thể và khác 'current': tìm chính xác theo runId
  if (runId && runId !== 'current') {
    const byRun = activityEngine.getActiveRun(sessionId, runId);
    if (byRun && byRun.run.activityId === 'assignment-hub') {
      return byRun;
    }
    const byRunActive = activityEngine.getActiveRun('active', runId);
    if (byRunActive && byRunActive.run.activityId === 'assignment-hub') {
      return byRunActive;
    }
  }

  // 2. Tìm theo activityId = 'assignment-hub' trong session cụ thể
  if (sessionId && sessionId !== 'active' && sessionId !== 'current') {
    const bySession = activityEngine.getActiveRun(sessionId, 'assignment-hub');
    if (bySession && bySession.run.activityId === 'assignment-hub') {
      return bySession;
    }
  }

  // 3. Quét danh sách các lượt chạy trong session cụ thể
  if (sessionId && sessionId !== 'active' && sessionId !== 'current') {
    const sessionRuns = activityEngine.getActiveRuns(sessionId) || [];
    const foundInSession = sessionRuns.find(r => r.run.activityId === 'assignment-hub');
    if (foundInSession) {
      return foundInSession;
    }
  }

  // 4. Tìm kiếm dự phòng trên toàn bộ các phiên active
  const byActive = activityEngine.getActiveRun('active', 'assignment-hub');
  if (byActive && byActive.run.activityId === 'assignment-hub') {
    return byActive;
  }

  const globalRuns = activityEngine.getActiveRuns('active') || [];
  const foundGlobal = globalRuns.find(r => r.run.activityId === 'assignment-hub');
  if (foundGlobal) {
    return foundGlobal;
  }

  return null;
}

export const assignmentsRoutes: FastifyPluginAsync<AssignmentsRoutesOptions> = async (
  fastify,
  options
) => {
  const defaultBaseDir =
    options.submissionsBaseDir ?? path.join(process.cwd(), 'data', 'submissions');
  const defaultMaterialsBaseDir =
    options.materialsBaseDir ?? path.join(process.cwd(), 'data', 'materials');

  if (!fs.existsSync(defaultBaseDir)) {
    fs.mkdirSync(defaultBaseDir, { recursive: true });
  }

  /**
   * GET /api/system/default-submissions-dir
   * Trả về thư mục lưu bài mặc định (ngoài Desktop)
   */
  fastify.get('/api/system/default-submissions-dir', async (_request, reply) => {
    const defaultDesktopDir = path.join(os.homedir(), 'Desktop', 'EduClass_BaiNop');
    return reply.send({
      defaultDir: defaultDesktopDir,
      fallbackDir: defaultBaseDir,
    });
  });

  /**
   * POST /api/system/resolve-target-dir
   * Chuẩn hóa đường dẫn thư mục lưu bài
   */
  fastify.post<{ Body: { path?: string } }>(
    '/api/system/resolve-target-dir',
    async (request, reply) => {
      const inputPath = request.body?.path;
      const base =
        inputPath && inputPath.trim()
          ? inputPath.trim()
          : path.join(os.homedir(), 'Desktop', 'EduClass_BaiNop');
      return reply.send({
        finalDir: path.resolve(base),
        originalDir: base,
      });
    }
  );

  /**
   * POST /api/system/select-folder
   * Mở hộp thoại chọn thư mục Windows Native qua PowerShell FolderBrowserDialog
   */
  fastify.post('/api/system/select-folder', async (_request, reply) => {
    if (process.platform !== 'win32') {
      return reply.send({
        path: defaultBaseDir,
        originalPath: defaultBaseDir,
      });
    }

    try {
      const selectedPath = await new Promise<string>((resolve, reject) => {
        const psCmd =
          `Add-Type -AssemblyName System.Windows.Forms; ` +
          `$f = New-Object System.Windows.Forms.FolderBrowserDialog; ` +
          `$f.Description = 'Chọn thư mục lưu bài nộp của học sinh'; ` +
          `$f.ShowNewFolderButton = $true; ` +
          `if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }`;

        exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: false }, (err, stdout) => {
          if (err) {
            return reject(err);
          }
          const trimmed = stdout.trim();
          resolve(trimmed);
        });
      });

      if (selectedPath && fs.existsSync(selectedPath)) {
        return reply.send({
          path: selectedPath,
          originalPath: selectedPath,
        });
      }
      return reply.send({ path: null });
    } catch {
      return reply.send({ path: null });
    }
  });

  /**
   * POST /api/system/open-path
   * Mở thư mục hoặc tệp trực tiếp trong Windows Explorer hoặc ứng dụng mặc định
   */
  fastify.post<{ Body: { path: string } }>('/api/system/open-path', async (request, reply) => {
    const targetPath = request.body?.path;
    if (!targetPath || typeof targetPath !== 'string') {
      return reply.status(400).send({ error: 'Đường dẫn không hợp lệ' });
    }

    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) {
      return reply.status(404).send({ error: 'Đường dẫn không tồn tại trên máy tính' });
    }

    if (process.platform === 'win32') {
      const isDir = fs.statSync(resolved).isDirectory();
      if (isDir) {
        exec(`explorer.exe "${resolved}"`);
      } else {
        exec(`start "" "${resolved}"`);
      }
    } else {
      exec(`xdg-open "${resolved}"`);
    }

    return reply.send({ ok: true });
  });

  /**
   * POST /api/sessions/:sessionId/activities/:runId/assignment/submit
   * Học sinh nộp tệp bài làm
   */
  fastify.post<{
    Params: { sessionId: string; runId: string };
    Body: {
      participantId: string;
      displayName: string;
      studentCode?: string;
      filename: string;
      fileSize: number;
      mime?: string;
      base64: string;
    };
  }>(
    '/api/sessions/:sessionId/activities/:runId/assignment/submit',
    { bodyLimit: 150 * 1024 * 1024 },
    async (request, reply) => {
      let { sessionId, runId } = request.params;
      const { participantId, displayName, studentCode, filename, fileSize, mime, base64 } =
        request.body;

      if (!participantId || !displayName || !filename || !base64) {
        return reply.status(400).send({ error: 'Dữ liệu nộp bài không đầy đủ' });
      }

      // 1. Kiểm tra lượt chạy Activity đang diễn ra (hỗ trợ cả sessionId hoặc runId)
      const activeState = getActiveAssignmentRun(fastify.activityEngine, sessionId, runId);

      if (!activeState) {
        return reply.status(400).send({ error: 'Không tìm thấy lượt thu bài đang hoạt động' });
      }

      // Chuẩn hóa sessionId và runId từ thông tin activeRun thực tế
      sessionId = activeState.run.sessionId;
      runId = activeState.run.id;

      const state = activeState.state as Record<string, unknown>;
      if (state.isLocked) {
        return reply.status(403).send({ error: 'Cổng thu bài đã được giáo viên đóng' });
      }

      // Ràng buộc định dạng nếu GV cấu hình (mặc định mảng rỗng [] nghĩa là nhận mọi loại tệp)
      const allowedExts = (state.allowedExtensions as string[]) || [];
      if (allowedExts.length > 0) {
        const ext = path.extname(filename).toLowerCase();
        const isAllowed = allowedExts.some(
          a => a.toLowerCase() === ext || a.toLowerCase() === ext.replace('.', '')
        );
        if (!isAllowed) {
          return reply.status(400).send({
            error: `Định dạng tệp "${ext}" không được chấp nhận. Chỉ chấp nhận: ${allowedExts.join(', ')}`,
          });
        }
      }

      // 2. Xác định thư mục đích
      let targetDir = (state.targetDirectory as string) || '';
      if (!targetDir || !targetDir.trim()) {
        targetDir = path.join(defaultBaseDir, `${sessionId}_${runId}`);
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 3. Giải mã và ghi tệp ra đĩa an toàn (tách Data URL prefix chính xác không phụ thuộc MIME)
      const commaIdx = base64.indexOf(',');
      const rawBase64 = commaIdx !== -1 ? base64.slice(commaIdx + 1) : base64;
      const buffer = Buffer.from(rawBase64, 'base64');

      const safeOrigName = sanitizeFileName(filename);
      const safeStudentName = sanitizeFileName(displayName);
      const safeCode = studentCode ? `${sanitizeFileName(studentCode)}_` : '';

      const origExt = path.extname(safeOrigName);
      const origBaseName = path.basename(safeOrigName, origExt);

      let attempt = 1;
      let finalFileName = `${safeCode}${safeStudentName}_${origBaseName}${origExt}`;
      let finalFilePath = path.join(targetDir, finalFileName);

      // Nếu tệp cùng tên đã tồn tại trên đĩa, tự động đánh số lần 2, lần 3...
      while (fs.existsSync(finalFilePath)) {
        attempt++;
        finalFileName = `${safeCode}${safeStudentName}_${origBaseName}_lan${attempt}${origExt}`;
        finalFilePath = path.join(targetDir, finalFileName);
      }

      fs.writeFileSync(finalFilePath, buffer);

      const displayFileName =
        attempt > 1 ? `${origBaseName} (Lần ${attempt})${origExt}` : safeOrigName;

      // 4. Tạo thông tin bài nộp
      const downloadUrl = `/api/sessions/${sessionId}/activities/${runId}/assignment/submissions/${participantId}/download`;
      const submission = {
        participantId,
        studentName: displayName,
        studentCode,
        fileName: displayFileName,
        storedPath: finalFilePath,
        fileSize: buffer.length || fileSize,
        mimeType: mime || 'application/octet-stream',
        submittedAt: Date.now(),
        downloadUrl,
        status: 'submitted' as const,
      };

      // 5. Cập nhật FSM thông qua activityEngine
      const result = await fastify.activityEngine.handleStudentIntent(
        sessionId,
        participantId,
        runId,
        {
          type: 'submit_assignment',
          submission,
        }
      );

      if ('ok' in result && result.ok === false) {
        return reply.status(400).send({ error: result.reason });
      }

      return reply.send({
        ok: true,
        submission,
      });
    }
  );

  /**
   * POST /api/sessions/:sessionId/activities/:runId/assignment/materials
   * Giáo viên tải file tài liệu phát xuống cho học sinh
   */
  fastify.post<{
    Params: { sessionId: string; runId: string };
    Body: {
      name: string;
      size: number;
      mime?: string;
      base64: string;
    };
  }>(
    '/api/sessions/:sessionId/activities/:runId/assignment/materials',
    { bodyLimit: 150 * 1024 * 1024 },
    async (request, reply) => {
      let { sessionId, runId } = request.params;
      const { name, size, mime, base64 } = request.body;

      if (!name || !base64) {
        return reply.status(400).send({ error: 'Dữ liệu file tài liệu không đầy đủ' });
      }

      const activeState = getActiveAssignmentRun(fastify.activityEngine, sessionId, runId);
      if (activeState) {
        sessionId = activeState.run.sessionId;
        runId = activeState.run.id;
      }

      const materialsDir = path.join(defaultMaterialsBaseDir, `${sessionId}_${runId}`);
      if (!fs.existsSync(materialsDir)) {
        fs.mkdirSync(materialsDir, { recursive: true });
      }

      const commaIdx = base64.indexOf(',');
      const rawBase64 = commaIdx !== -1 ? base64.slice(commaIdx + 1) : base64;
      const buffer = Buffer.from(rawBase64, 'base64');

      const materialId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const safeName = sanitizeFileName(name);
      const filePath = path.join(materialsDir, `${materialId}_${safeName}`);

      fs.writeFileSync(filePath, buffer);

      const downloadUrl = `/api/sessions/${sessionId}/activities/${runId}/assignment/materials/${materialId}/download`;

      const material = {
        id: materialId,
        name: safeName,
        size: buffer.length || size,
        mime: mime || 'application/octet-stream',
        url: downloadUrl,
        uploadedAt: Date.now(),
      };

      return reply.send(material);
    }
  );

  /**
   * GET /api/sessions/:sessionId/activities/:runId/assignment/materials/:materialId/download
   * Học sinh và giáo viên tải tệp tài liệu
   */
  fastify.get<{
    Params: { sessionId: string; runId: string; materialId: string };
  }>(
    '/api/sessions/:sessionId/activities/:runId/assignment/materials/:materialId/download',
    async (request, reply) => {
      const { materialId } = request.params;
      let { sessionId, runId } = request.params;
      const activeState = getActiveAssignmentRun(fastify.activityEngine, sessionId, runId);
      if (activeState) {
        sessionId = activeState.run.sessionId;
        runId = activeState.run.id;
      }

      let materialsDir = path.join(defaultMaterialsBaseDir, `${sessionId}_${runId}`);
      if (!fs.existsSync(materialsDir)) {
        const baseDir = defaultMaterialsBaseDir;
        if (fs.existsSync(baseDir)) {
          const subdirs = fs.readdirSync(baseDir);
          for (const s of subdirs) {
            const checkPath = path.join(baseDir, s);
            try {
              if (fs.statSync(checkPath).isDirectory()) {
                const matched = fs.readdirSync(checkPath).find(f => f.startsWith(`${materialId}_`));
                if (matched) {
                  materialsDir = checkPath;
                  break;
                }
              }
            } catch {
              // Bỏ qua lỗi truy cập thư mục con
            }
          }
        }
      }

      if (!fs.existsSync(materialsDir)) {
        return reply.status(404).send({ error: 'Không tìm thấy tài liệu' });
      }

      const files = fs.readdirSync(materialsDir);
      const targetFile = files.find(f => f.startsWith(`${materialId}_`));

      if (!targetFile) {
        return reply.status(404).send({ error: 'Không tìm thấy tệp tài liệu yêu cầu' });
      }

      const filePath = path.join(materialsDir, targetFile);
      const originalName = targetFile.replace(`${materialId}_`, '');
      const stream = fs.createReadStream(filePath);

      reply.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(originalName)}"`
      );
      reply.header('Content-Type', 'application/octet-stream');
      return reply.send(stream);
    }
  );

  /**
   * GET /api/sessions/:sessionId/activities/:runId/assignment/submissions/:participantId/download
   * Tải tệp bài nộp của học sinh
   */
  fastify.get<{
    Params: { sessionId: string; runId: string; participantId: string };
    Querystring: { inline?: string };
  }>(
    '/api/sessions/:sessionId/activities/:runId/assignment/submissions/:participantId/download',
    async (request, reply) => {
      const { participantId } = request.params;
      let { sessionId, runId } = request.params;
      const isInline = request.query?.inline === 'true' || request.query?.inline === '1';

      const activeState = getActiveAssignmentRun(fastify.activityEngine, sessionId, runId);
      if (!activeState) {
        return reply.status(404).send({ error: 'Lượt thu bài không tồn tại' });
      }

      sessionId = activeState.run.sessionId;
      runId = activeState.run.id;

      const state = activeState.state as {
        submissions?: Record<string, { storedPath?: string; fileName?: string }>;
      };
      const sub = state.submissions?.[participantId];

      if (!sub?.storedPath || !fs.existsSync(sub.storedPath)) {
        return reply.status(404).send({ error: 'Tệp bài nộp không tồn tại trên máy chủ' });
      }

      const fileName = sub.fileName || path.basename(sub.storedPath);
      const ext = path.extname(fileName).toLowerCase();
      const stream = fs.createReadStream(sub.storedPath);

      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (
        ['.txt', '.md', '.json', '.c', '.cpp', '.py', '.pas', '.java', '.js', '.ts'].includes(ext)
      ) {
        mimeType = 'text/plain; charset=utf-8';
      }

      if (isInline) {
        reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        reply.header('Content-Type', mimeType);
      } else {
        reply.header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileName)}"`
        );
        reply.header('Content-Type', 'application/octet-stream');
      }
      return reply.send(stream);
    }
  );

  /**
   * GET /api/sessions/:sessionId/activities/:runId/assignment/preview/:participantId
   * Trích xuất nội dung xem trước tài liệu: Word, Excel, PPTX, PDF, Ảnh, Text
   */
  fastify.get<{
    Params: { sessionId: string; runId: string; participantId: string };
  }>(
    '/api/sessions/:sessionId/activities/:runId/assignment/preview/:participantId',
    async (request, reply) => {
      const { participantId } = request.params;
      let { sessionId, runId } = request.params;

      const activeState = getActiveAssignmentRun(fastify.activityEngine, sessionId, runId);
      if (!activeState) {
        return reply.status(404).send({ error: 'Lượt thu bài không tồn tại' });
      }

      sessionId = activeState.run.sessionId;
      runId = activeState.run.id;

      const state = activeState.state as {
        submissions?: Record<string, { storedPath?: string; fileName?: string }>;
      };
      const sub = state.submissions?.[participantId];

      if (!sub?.storedPath || !fs.existsSync(sub.storedPath)) {
        return reply.status(404).send({ error: 'Tệp bài nộp không tồn tại trên máy chủ' });
      }

      const filePath = sub.storedPath;
      const fileName = sub.fileName || path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const downloadUrl = `/api/sessions/${sessionId}/activities/${runId}/assignment/submissions/${participantId}/download`;

      try {
        // 1. Hình ảnh
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
          return reply.send({
            type: 'image',
            url: `${downloadUrl}?inline=true`,
          });
        }

        // 2. Tệp PDF (hiển thị trực tiếp trong trình duyệt, không bắt tải về)
        if (ext === '.pdf') {
          return reply.send({
            type: 'pdf',
            url: `${downloadUrl}?inline=true`,
          });
        }

        // 3. Tệp Word (.docx)
        if (ext === '.docx') {
          const buffer = fs.readFileSync(filePath);
          const html = await renderDocxToHtml(buffer);
          return reply.send({
            type: 'docx',
            html,
          });
        }

        // 4. Bảng tính Excel (.xlsx, .xls) - Giữ nguyên lưới ô chuẩn
        if (['.xlsx', '.xls', '.csv'].includes(ext)) {
          const workbook = XLSX.readFile(filePath);
          const sheets = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            if (!sheet) return { name, data: [] };
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
            // Lấy tối đa 200 dòng đầu để xem trước
            return {
              name,
              data: data.slice(0, 200),
            };
          });

          return reply.send({
            type: 'xlsx',
            sheets,
          });
        }

        // 5. Trình chiếu PowerPoint (.pptx)
        if (ext === '.pptx') {
          const buffer = fs.readFileSync(filePath);
          const slides = await extractPptxSummary(buffer);
          return reply.send({
            type: 'pptx',
            slides,
          });
        }

        // 6. Tệp văn bản / Code
        if (
          [
            '.txt',
            '.md',
            '.json',
            '.c',
            '.cpp',
            '.py',
            '.pas',
            '.java',
            '.js',
            '.ts',
            '.html',
            '.css',
          ].includes(ext)
        ) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return reply.send({
            type: 'text',
            content: content.slice(0, 50000), // Tối đa 50KB ký tự
          });
        }

        // 7. Định dạng khác
        return reply.send({
          type: 'binary',
          url: downloadUrl,
          fileName,
        });
      } catch (err) {
        return reply.send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Không thể xem trước tệp',
          url: downloadUrl,
        });
      }
    }
  );
};
