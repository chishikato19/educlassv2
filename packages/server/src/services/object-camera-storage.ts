import fs from 'node:fs';
import path from 'node:path';

export function getObjectCameraTempBaseDir(customBaseDir?: string | undefined): string {
  return customBaseDir ?? path.join(process.cwd(), 'data', 'temp', 'object-camera');
}

/**
 * Phân tích URL file ảnh camera vật thể để trích xuất sessionId và filename an toàn
 * URL có định dạng: /api/object-camera/files/:sessionId/:filename
 */
export function parseObjectCameraFileUrl(
  fileUrl: string
): { sessionId: string; filename: string } | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;

  const match = fileUrl.match(/\/api\/object-camera\/files\/([^/?#]+)\/([^/?#]+)/);
  if (!match || !match[1] || !match[2]) return null;

  try {
    const rawSessionId = decodeURIComponent(match[1]);
    const rawFilename = decodeURIComponent(match[2]);

    const safeSessionId = path.basename(rawSessionId);
    const safeFilename = path.basename(rawFilename);

    if (!safeSessionId || !safeFilename) return null;

    return { sessionId: safeSessionId, filename: safeFilename };
  } catch {
    return null;
  }
}

/**
 * Xóa vĩnh viễn một file ảnh camera vật thể cụ thể khỏi ổ đĩa máy tính
 * Ngăn chặn tuyệt đối lỗ hổng Directory Traversal (..)
 */
export async function deleteObjectCameraFile(
  params: {
    url?: string | undefined;
    sessionId?: string | undefined;
    filename?: string | undefined;
  },
  tempBaseDir?: string | undefined
): Promise<boolean> {
  const baseDir = getObjectCameraTempBaseDir(tempBaseDir);

  let targetSessionId = params.sessionId ? path.basename(params.sessionId) : '';
  let targetFilename = params.filename ? path.basename(params.filename) : '';

  if ((!targetSessionId || !targetFilename) && params.url) {
    const parsed = parseObjectCameraFileUrl(params.url);
    if (parsed) {
      targetSessionId = parsed.sessionId;
      targetFilename = parsed.filename;
    }
  }

  if (!targetSessionId || !targetFilename) {
    return false;
  }

  const sessionDir = path.resolve(baseDir, targetSessionId);
  const targetFilePath = path.resolve(sessionDir, targetFilename);

  // Bảo vệ an toàn: đường dẫn đích phải nằm hoàn toàn trong thư mục của session
  if (!targetFilePath.startsWith(sessionDir) || targetFilePath === sessionDir) {
    console.warn(`[ObjectCameraStorage] Cảnh báo đường dẫn không an toàn: ${targetFilePath}`);
    return false;
  }

  try {
    if (fs.existsSync(targetFilePath)) {
      await fs.promises.unlink(targetFilePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[ObjectCameraStorage] Lỗi khi xóa file ảnh vật lý ${targetFilePath}:`, err);
    return false;
  }
}

/**
 * Dọn sạch các file ảnh tạm chưa được ghim trong một phiên học
 * Chỉ giữ lại các file có tên nằm trong danh sách keepUrlsOrFilenames
 */
export async function cleanupUnpinnedObjectCameraFiles(
  sessionId: string,
  keepUrlsOrFilenames: string[],
  tempBaseDir?: string | undefined
): Promise<number> {
  const baseDir = getObjectCameraTempBaseDir(tempBaseDir);
  const safeSessionId = path.basename(sessionId);
  const sessionDir = path.resolve(baseDir, safeSessionId);

  if (!fs.existsSync(sessionDir)) {
    return 0;
  }

  // Thu thập danh sách filename cần giữ
  const keepSet = new Set<string>();
  for (const item of keepUrlsOrFilenames) {
    if (!item) continue;
    const parsed = parseObjectCameraFileUrl(item);
    if (parsed) {
      keepSet.add(parsed.filename);
    } else {
      keepSet.add(path.basename(item));
    }
  }

  let deletedCount = 0;
  try {
    const entries = await fs.promises.readdir(sessionDir);
    for (const entry of entries) {
      const safeEntry = path.basename(entry);
      if (!keepSet.has(safeEntry)) {
        const filePath = path.join(sessionDir, safeEntry);
        try {
          await fs.promises.unlink(filePath);
          deletedCount++;
        } catch (unlinkErr) {
          console.warn(`[ObjectCameraStorage] Không thể xóa file ${filePath}:`, unlinkErr);
        }
      }
    }
  } catch (err) {
    console.error(`[ObjectCameraStorage] Lỗi quét dọn thư mục session ${safeSessionId}:`, err);
  }

  return deletedCount;
}

/**
 * Xóa vĩnh viễn toàn bộ thư mục lưu ảnh tạm của một session (khi đóng session hoặc không có ảnh ghim)
 */
export function cleanupSessionObjectCameraFiles(
  sessionId: string,
  tempBaseDir?: string | undefined
): void {
  try {
    const baseDir = getObjectCameraTempBaseDir(tempBaseDir);
    const safeSessionId = path.basename(sessionId);
    const sessionDir = path.resolve(baseDir, safeSessionId);

    if (!sessionDir.startsWith(baseDir) || sessionDir === baseDir) {
      return;
    }

    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[ObjectCameraStorage] Lỗi khi dọn dẹp thư mục tạm session ${sessionId}:`, err);
  }
}

/**
 * Tự động dọn dẹp các thư mục tạm cũ (ví dụ > 24 giờ) còn sót lại do tắt máy đột ngột
 */
export async function cleanupStaleObjectCameraFiles(
  maxAgeMs: number = 24 * 60 * 60 * 1000,
  tempBaseDir?: string | undefined
): Promise<number> {
  const baseDir = getObjectCameraTempBaseDir(tempBaseDir);
  if (!fs.existsSync(baseDir)) return 0;

  let cleanedCount = 0;
  const now = Date.now();

  try {
    const sessions = await fs.promises.readdir(baseDir);
    for (const sDir of sessions) {
      const fullPath = path.join(baseDir, sDir);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          const age = now - stat.mtimeMs;
          if (age > maxAgeMs) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            cleanedCount++;
          }
        }
      } catch {
        // Bỏ qua lỗi stat từng thư mục
      }
    }
  } catch {
    // Bỏ qua nếu không đọc được thư mục gốc
  }

  return cleanedCount;
}
