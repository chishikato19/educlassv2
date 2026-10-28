import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import { startEmbeddedServer, type EmbeddedServerInstance } from './server-runner.js';

// Cấu hình cập nhật phiên bản: Chỉ tải và cài đặt khi người dùng đồng ý (Manual on-demand)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// Đảm bảo chỉ có duy nhất 1 phiên bản EduClass chạy cùng lúc
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Thoát ngay lập tức nếu đã có phiên bản khác đang chạy, không chạy tiếp bất kỳ lifecycle nào
  app.exit(0);
}

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

let mainWindow: BrowserWindow | null = null;
let teacherWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverInstance: EmbeddedServerInstance | null = null;
let isCleaningUp = false;

/**
 * Tự động giải phóng cổng mạng nếu có tiến trình zombie cũ đang chiếm cổng (Self-healing trên Windows)
 */
function freePortIfOccupied(port: number): void {
  if (process.platform !== 'win32') return;
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const lines = output.split('\n');
    const currentPid = process.pid;

    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = parseInt(pidStr ?? '', 10);
        if (pid && pid !== currentPid) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.info(
              `[Auto-Recovery] Đã giải phóng cổng ${port} bị chiếm bởi tiến trình cũ PID ${pid}`
            );
          } catch {
            // Bỏ qua nếu tiến trình đã tắt
          }
        }
      }
    }
  } catch {
    // Không có tiến trình chiếm cổng
  }
}

/**
 * Quy trình đóng ứng dụng sạch sẽ 100%, không để lại tiến trình ngầm trong Task Manager
 */
async function cleanupAndExit(): Promise<void> {
  if (isCleaningUp) return;
  isCleaningUp = true;

  try {
    if (tray) {
      try {
        tray.destroy();
      } catch {
        // bỏ qua
      }
      tray = null;
    }
    if (teacherWindow && !teacherWindow.isDestroyed()) {
      try {
        teacherWindow.destroy();
      } catch {
        // bỏ qua
      }
      teacherWindow = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.destroy();
      } catch {
        // bỏ qua
      }
      mainWindow = null;
    }
    if (serverInstance) {
      await serverInstance.stop();
      serverInstance = null;
    }
  } catch (err) {
    console.error('[Cleanup Error]', err);
  } finally {
    app.exit(0);
  }
}

function openTeacherWindow(targetUrl?: string) {
  const teacherUrl =
    targetUrl ||
    (serverInstance
      ? `http://localhost:${serverInstance.port}/teacher`
      : 'http://localhost:3000/teacher');

  if (teacherWindow) {
    if (teacherWindow.isMinimized()) teacherWindow.restore();
    teacherWindow.show();
    teacherWindow.focus();
    return;
  }

  teacherWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: `EduClass v2 (v${app.getVersion()}) — Bàn Làm Việc Giáo Viên`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(currentDir, 'preload.js'),
    },
  });

  teacherWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    if (level >= 2) {
      console.warn(`[TeacherUI] [L${level}] ${message} (${sourceId}:${line})`);
    }
  });

  // Cho phép mở cửa sổ trình chiếu hoạt động độc lập, video & quay số (Màn hình 2) bên trong Electron
  teacherWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('window=activity') ||
      url.includes('window=video') ||
      url.includes('window=random-picker')
    ) {
      const isVideo = url.includes('window=video');
      const isRandomPicker = url.includes('window=random-picker');
      const windowTitle = isVideo
        ? 'EduClass v2 — Trình Chiếu Video Học Liệu'
        : isRandomPicker
          ? 'EduClass v2 — Trình Chiếu Quay Số Ngẫu Nhiên'
          : 'EduClass v2 — Trình Chiếu Hoạt Động';

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 800,
          minWidth: 900,
          minHeight: 600,
          title: windowTitle,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }
    if (url.includes('/api/')) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Chặn việc điều hướng cửa sổ giáo viên sang trang khác (như trang học sinh), mở trang đó ra trình duyệt ngoài
  teacherWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (!parsed.pathname.startsWith('/teacher')) {
        event.preventDefault();
        void shell.openExternal(url);
      }
    } catch {
      // Bỏ qua lỗi URL
    }
  });

  // Đảm bảo cửa sổ được hiển thị và nhận tiêu điểm (focus) đầy đủ trên Windows OS
  teacherWindow.once('ready-to-show', () => {
    teacherWindow?.show();
    teacherWindow?.focus();
  });

  teacherWindow.webContents.on('did-finish-load', () => {
    teacherWindow?.focus();
  });

  void teacherWindow.loadURL(teacherUrl);
  teacherWindow.show();
  teacherWindow.focus();

  teacherWindow.on('closed', () => {
    teacherWindow = null;
  });
}

async function createMainWindow(serverInfo: EmbeddedServerInstance) {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 720,
    resizable: false,
    title: `EduClass v2 (v${app.getVersion()}) — Máy chủ Lớp học`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(currentDir, 'preload.js'),
    },
  });

  const localTeacherUrl = `http://localhost:${serverInfo.port}/teacher`;

  // Gửi thông tin server qua webContents khi trang nạp xong
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('server-info', {
      studentUrl: serverInfo.studentUrl,
      teacherUrl: localTeacherUrl,
      teacherLanUrl: serverInfo.teacherUrl,
      qrDataUrl: serverInfo.qrDataUrl,
      port: serverInfo.port,
      lanIp: serverInfo.lanIp,
      version: app.getVersion(),
    });
  });

  const htmlPath = path.join(currentDir, 'window.html');
  await mainWindow.loadFile(htmlPath);
  mainWindow.show();
  mainWindow.focus();

  // Khi đóng cửa sổ chính (bấm dấu X) -> Thoát hẳn toàn bộ ứng dụng
  mainWindow.on('close', () => {
    void cleanupAndExit();
  });
}

function createTray(serverInfo: EmbeddedServerInstance) {
  const iconCandidates = [
    path.join(currentDir, '../build/icon.ico'),
    path.join(currentDir, 'icon.ico'),
    process.resourcesPath ? path.join(process.resourcesPath, 'icon.ico') : '',
  ];
  const iconPath = iconCandidates.find(p => Boolean(p) && fs.existsSync(p));
  if (!iconPath) {
    return;
  }

  // Tạo tray menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `EduClass: ${serverInfo.studentUrl}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '🖥 Mở Bàn Làm Việc Giáo Viên',
      click: () => {
        openTeacherWindow(serverInfo.teacherUrl);
      },
    },
    {
      label: '🌐 Mở trong Trình duyệt web',
      click: async () => {
        await shell.openExternal(serverInfo.teacherUrl);
      },
    },
    {
      label: 'Hiện/Ẩn Bảng điều khiển Server',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát ứng dụng hoàn toàn',
      click: () => {
        void cleanupAndExit();
      },
    },
  ]);

  tray = new Tray(iconPath);
  tray.setToolTip(`EduClass v2 (v${app.getVersion()}) — Máy chủ đang hoạt động`);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// Xử lý IPC từ Renderer
ipcMain.handle('get-server-info', () => {
  if (!serverInstance) return null;
  return {
    studentUrl: serverInstance.studentUrl,
    teacherUrl: `http://localhost:${serverInstance.port}/teacher`,
    teacherLanUrl: serverInstance.teacherUrl,
    qrDataUrl: serverInstance.qrDataUrl,
    port: serverInstance.port,
    lanIp: serverInstance.lanIp,
    version: app.getVersion(),
  };
});

ipcMain.handle('copy-text', (_, text: string) => {
  if (typeof text === 'string') {
    clipboard.writeText(text);
    return true;
  }
  return false;
});

ipcMain.on('open-external', (_, targetUrl?: string) => {
  const url =
    targetUrl ||
    (serverInstance
      ? `http://localhost:${serverInstance.port}/teacher`
      : 'http://localhost:3000/teacher');
  void shell.openExternal(url);
});

// Lắng nghe yêu cầu mở cửa sổ giáo viên từ IPC
ipcMain.on('open-teacher-window', (_, targetUrl?: string) => {
  const url =
    targetUrl ||
    (serverInstance
      ? `http://localhost:${serverInstance.port}/teacher`
      : 'http://localhost:3000/teacher');
  openTeacherWindow(url);
});

// --- Quản lý Cập nhật Phiên bản (Auto-Update On-Demand) ---
ipcMain.handle('check-for-update', async () => {
  try {
    if (!app.isPackaged) {
      return {
        hasUpdate: false,
        currentVersion: app.getVersion(),
        devMode: true,
        message: 'Ứng dụng đang chạy ở môi trường phát triển (Dev Mode).',
      };
    }
    const result = await autoUpdater.checkForUpdates();
    if (!result || !result.updateInfo) {
      return {
        hasUpdate: false,
        currentVersion: app.getVersion(),
      };
    }
    const latestVersion = result.updateInfo.version;
    const hasUpdate = latestVersion !== app.getVersion();
    return {
      hasUpdate,
      currentVersion: app.getVersion(),
      latestVersion,
      releaseNotes:
        typeof result.updateInfo.releaseNotes === 'string' ? result.updateInfo.releaseNotes : null,
      releaseDate: result.updateInfo.releaseDate,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      hasUpdate: false,
      currentVersion: app.getVersion(),
      error: errorMsg,
    };
  }
});

ipcMain.handle('start-download-update', async () => {
  try {
    if (!app.isPackaged) {
      return {
        success: false,
        error: 'Không thể tải cập nhật trong môi trường phát triển (Dev Mode).',
      };
    }
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

autoUpdater.on('download-progress', progressObj => {
  const payload = {
    percent: Math.round(progressObj.percent),
    transferred: progressObj.transferred,
    total: progressObj.total,
    bytesPerSecond: progressObj.bytesPerSecond,
  };
  if (teacherWindow && !teacherWindow.isDestroyed()) {
    teacherWindow.webContents.send('update-download-progress', payload);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-download-progress', payload);
  }
});

autoUpdater.on('update-downloaded', info => {
  const payload = {
    version: info.version,
  };
  if (teacherWindow && !teacherWindow.isDestroyed()) {
    teacherWindow.webContents.send('update-downloaded', payload);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', payload);
  }
});

// Xử lý khi người dùng mở lại app lần 2: đưa ngay cửa sổ hiện tại lên phía trước
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  if (teacherWindow) {
    if (teacherWindow.isMinimized()) teacherWindow.restore();
    teacherWindow.show();
    teacherWindow.focus();
  }
});

app
  .whenReady()
  .then(async () => {
    // Tìm đường dẫn UI giáo viên tối ưu
    const candidates = [
      path.join(currentDir, '../../teacher-ui/dist'),
      path.join(currentDir, '../public/teacher'),
      path.join(currentDir, '../../server/public/teacher'),
      process.resourcesPath ? path.join(process.resourcesPath, 'public/teacher') : '',
      process.resourcesPath ? path.join(process.resourcesPath, 'teacher-ui') : '',
    ];
    const teacherUiDir = candidates.find(c => Boolean(c) && fs.existsSync(c));

    // Tìm đường dẫn Cổng học sinh tối ưu
    const studentCandidates = [
      path.join(currentDir, '../../server/public/student'),
      path.join(currentDir, '../public/student'),
      path.join(currentDir, '../../packages/server/public/student'),
      process.resourcesPath ? path.join(process.resourcesPath, 'public/student') : '',
      process.resourcesPath ? path.join(process.resourcesPath, 'student-ui') : '',
    ];
    const studentUiDir = studentCandidates.find(c => Boolean(c) && fs.existsSync(c));

    // Đường dẫn CSDL và dữ liệu người dùng bền vững trên máy tính người dùng (%APPDATA%/EduClass v2/data)
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'educlass.sqlite');
    const assetsDir = path.join(dataDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Tự động giải phóng cổng 3000 nếu có tiến trình zombie cũ đang chiếm giữ
    freePortIfOccupied(3000);

    // 1. Khởi động Fastify server nhúng
    serverInstance = await startEmbeddedServer({
      port: 3000,
      host: '0.0.0.0',
      teacherUiDir,
      studentUiDir,
      dbPath,
      dataDir,
      assetsDir,
    });

    // 2. Tạo cửa sổ chính và khay hệ thống
    await createMainWindow(serverInstance);
    try {
      createTray(serverInstance);
    } catch {
      // Bỏ qua nếu môi trường headless hoặc thiếu icon file trong test
    }
  })
  .catch((err: unknown) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Startup Error]', err);
    dialog.showErrorBox(
      'Lỗi khởi động EduClass v2',
      `Máy chủ EduClass không thể khởi động:\n${errorMsg}\n\nVui lòng kiểm tra lại tiến trình hệ thống.`
    );
    void cleanupAndExit();
  });

app.on('before-quit', event => {
  if (!isCleaningUp) {
    event.preventDefault();
    void cleanupAndExit();
  }
});

app.on('window-all-closed', () => {
  void cleanupAndExit();
});
