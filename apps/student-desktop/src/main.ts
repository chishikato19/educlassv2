import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { BeaconListener } from './beacon-listener.js';
import type { DiscoveryBeaconPayload } from '@educlass/protocol';

// 1. Kiểm tra Single-Instance: Chỉ duy nhất 1 tiến trình EduClass Student chạy trên máy
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let beaconListener: BeaconListener | null = null;
let isQuitting = false;

let currentSession: DiscoveryBeaconPayload | null = null;
let lastSeenActivityRunId: string | null = null;
let isTeacherEmergencyUnlock = false;

/**
 * Tạo icon khay hệ thống (System Tray) vector / bitmap an toàn
 */
function getTrayIcon(): NativeImage {
  // Tạo icon 16x16 RGBA xanh dương biểu tượng EduClass
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 7) {
        buffer[idx] = 79; // R (#4F8CFF)
        buffer[idx + 1] = 140; // G
        buffer[idx + 2] = 255; // B
        buffer[idx + 3] = 255; // A
      } else {
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

/**
 * Cập nhật Menu chuột phải của System Tray
 */
function updateTrayMenu(): void {
  if (!tray) return;

  const isInActiveSession = currentSession !== null && !isTeacherEmergencyUnlock;
  const statusLabel = currentSession
    ? `Lớp: ${currentSession.className || 'Phiên học'} (${currentSession.joinCode})`
    : 'Trạng thái: Đang chờ lớp học...';

  const contextMenu = Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Mở cửa sổ lớp học',
      click: () => bringWindowToFront(),
    },
    {
      label: 'Tải lại trang (F5)',
      click: () => mainWindow?.reload(),
    },
    { type: 'separator' },
    {
      label: isInActiveSession ? 'Thoát EduClass (Đang trong giờ học)' : 'Thoát EduClass',
      enabled: !isInActiveSession,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(currentSession ? `EduClass: ${statusLabel}` : 'EduClass Học Sinh (Chạy nền)');
}

/**
 * Tự động bung cửa sổ lên trên cùng (Auto Bring-to-Front / Restore & Focus)
 * Đảm bảo học sinh không thể ẩn/thu nhỏ khi có hoạt động mới từ giáo viên
 */
function bringWindowToFront(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.focus();
  mainWindow.flashFrame(true);

  // Sau 1.2s nhả alwaysOnTop để học sinh thao tác bình thường (trừ khi đang trong Kiosk mode)
  setTimeout(() => {
    if (!isKioskMode && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(false);
    }
  }, 1200);
}

/**
 * Hiển thị và đưa cửa sổ chính lên trên cùng
 */
function showMainWindow(): void {
  bringWindowToFront();
}

let isKioskMode = false;

/**
 * Kích hoạt chế độ thi an toàn (Exam Kiosk Mode):
 * - Toàn màn hình (Fullscreen)
 * - Giữ cửa sổ luôn ở trên cùng (Always on top)
 * - Chặn phím tắt chuyển ứng dụng
 */
function enableKioskMode(): void {
  if (!mainWindow || mainWindow.isDestroyed() || isKioskMode) return;
  isKioskMode = true;

  try {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setKiosk(true);
    mainWindow.setFullScreen(true);
    mainWindow.show();
    mainWindow.focus();

    mainWindow.webContents.send('kiosk-status-changed', true);
    console.info('[StudentDesktop] Đã kích hoạt Chế độ Thi An Toàn (Exam Kiosk Mode)');
  } catch (err) {
    console.warn('[StudentDesktop] Lỗi bật Kiosk Mode:', err);
  }
}

/**
 * Giải phóng chế độ thi an toàn
 */
function disableKioskMode(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !isKioskMode) return;
  isKioskMode = false;

  try {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setKiosk(false);
    mainWindow.setFullScreen(false);

    mainWindow.webContents.send('kiosk-status-changed', false);
    console.info('[StudentDesktop] Đã hủy kích hoạt Chế độ Thi An Toàn');
  } catch (err) {
    console.warn('[StudentDesktop] Lỗi tắt Kiosk Mode:', err);
  }
}

/**
 * Tạo cửa sổ chính độc lập cho học sinh
 */
function createMainWindow(): void {
  const isBackgroundMode =
    process.argv.includes('--background') || process.argv.includes('--hidden');

  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 420,
    minHeight: 600,
    show: !isBackgroundMode,
    title: 'EduClass Học Sinh',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const waitingHtmlPath = path.join(__dirname, 'window.html');
  mainWindow.loadFile(waitingHtmlPath);

  // Khóa nút đóng X nếu đang trong phiên học
  if (currentSession !== null && !isTeacherEmergencyUnlock) {
    try {
      mainWindow.setClosable(false);
    } catch {
      // Bỏ qua lỗi nếu nền tảng không hỗ trợ setClosable
    }
  }

  // Chặn phím tắt thoát khi đang trong phiên học hoặc Kiosk mode
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // 1. Phím tắt cứu hộ khẩn cấp cho Giám thị / Giáo viên: Ctrl + Shift + Alt + F12
    if (input.control && input.shift && input.alt && input.key.toLowerCase() === 'f12') {
      event.preventDefault();
      isTeacherEmergencyUnlock = true;
      disableKioskMode();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setClosable(true);
      }
      updateTrayMenu();
      console.info(
        '[StudentDesktop] Đã kích hoạt phím cứu hộ giám thị / giáo viên (Emergency Unlock)'
      );
      return;
    }

    const key = input.key.toLowerCase();

    // 2. Chặn Alt + F4 khi đang trong phiên học hoặc Kiosk mode
    if ((currentSession !== null || isKioskMode) && !isTeacherEmergencyUnlock) {
      if (input.alt && key === 'f4') {
        event.preventDefault();
        bringWindowToFront();
        return;
      }
    }

    // 3. Chặn các phím thoát khi đang ở Kiosk mode
    if (isKioskMode) {
      // Chặn F11, F12, DevTools
      if (key === 'f11' || key === 'f12' || (input.control && input.shift && key === 'i')) {
        event.preventDefault();
        return;
      }
      // Chặn Alt + Space, Alt + Tab
      if (input.alt && (key === ' ' || key === 'tab')) {
        event.preventDefault();
        return;
      }
      // Chặn Ctrl + N, Ctrl + T, Ctrl + W
      if (input.control && (key === 'n' || key === 't' || key === 'w')) {
        event.preventDefault();
        return;
      }
      // Chặn Windows key, Ctrl + Escape
      if (key === 'meta' || (input.control && key === 'escape')) {
        event.preventDefault();
        return;
      }
    }
  });

  // Tự động kéo focus lại nếu bị mất focus trong lúc thi
  mainWindow.on('blur', () => {
    if (isKioskMode && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        if (isKioskMode && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      }, 50);
    }
  });

  // Khi học sinh ấn nút X: Chặn tắt khi đang trong phiên học
  mainWindow.on('close', event => {
    if (!isQuitting) {
      event.preventDefault();
      if ((currentSession !== null || isKioskMode) && !isTeacherEmergencyUnlock) {
        // Đang trong giờ học: Không cho đóng và không cho ẩn, tự động nảy bung lên lại
        bringWindowToFront();
      } else {
        // Ngoài giờ học: Ẩn vào khay hệ thống, không tắt tiến trình nền
        mainWindow?.hide();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Xử lý khi có tiến trình thứ 2 cố mở (học sinh click đúp icon ngoài Desktop)
app.on('second-instance', () => {
  showMainWindow();
});

app.whenReady().then(async () => {
  // 1. Tạo System Tray
  try {
    tray = new Tray(getTrayIcon());
    tray.on('double-click', () => showMainWindow());
    updateTrayMenu();
  } catch (err) {
    console.warn('[StudentDesktop] Không thể tạo tray icon:', err);
  }

  // 2. Tạo cửa sổ chính
  createMainWindow();

  // 3. Khởi động UDP Beacon Listener (Wake-on-Session)
  beaconListener = new BeaconListener();

  beaconListener.on('session-opened', payload => {
    handleSessionBeacon(payload);
  });

  beaconListener.on('session-heartbeat', payload => {
    // 1. Nếu học sinh chưa vào lớp (hoặc phiên khác), tự động kết nối
    if (!currentSession || currentSession.sessionId !== payload.sessionId) {
      handleSessionBeacon(payload);
      return;
    }

    currentSession = payload;

    // 2. Tự động bung cửa sổ lên trên nếu phát hiện giáo viên vừa mở hoạt động mới
    if (payload.activityRunId && payload.activityRunId !== lastSeenActivityRunId) {
      lastSeenActivityRunId = payload.activityRunId;
      console.info(
        '[StudentDesktop] Giáo viên mở hoạt động mới (Wake-on-Activity):',
        payload.currentActivityId,
        payload.activityRunId
      );
      bringWindowToFront();
    }
  });

  beaconListener.on('session-closed', payload => {
    if (currentSession && currentSession.sessionId === payload.sessionId) {
      currentSession = null;
      lastSeenActivityRunId = null;
      isTeacherEmergencyUnlock = false;
      disableKioskMode();
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          mainWindow.setClosable(true);
        } catch {
          // Bỏ qua lỗi nếu nền tảng không hỗ trợ setClosable
        }
        const waitingHtmlPath = path.join(__dirname, 'window.html');
        mainWindow.loadFile(waitingHtmlPath);
        mainWindow.webContents.send('session-closed');
      }
      updateTrayMenu();
    }
  });

  try {
    await beaconListener.start();
    console.info('[StudentDesktop] Đang lắng nghe UDP Beacon Wake-on-Session trên cổng 54321...');
  } catch (err) {
    console.warn('[StudentDesktop] Lỗi khởi động BeaconListener:', err);
  }
});

/**
 * Xử lý khi bắt được phiên học từ giáo viên: Đánh thức và nạp URL vào lớp
 */
function handleSessionBeacon(payload: DiscoveryBeaconPayload): void {
  currentSession = payload;
  lastSeenActivityRunId = payload.activityRunId ?? null;
  updateTrayMenu();

  if (!mainWindow) {
    createMainWindow();
  } else if (!isTeacherEmergencyUnlock) {
    try {
      mainWindow.setClosable(false);
    } catch {
      // Bỏ qua lỗi nếu nền tảng không hỗ trợ setClosable
    }
  }

  const joinUrl = `${payload.serverUrl}/?code=${payload.joinCode}`;

  if (mainWindow && !mainWindow.isDestroyed()) {
    // Thông báo cho màn hình chờ
    mainWindow.webContents.send('session-detected', {
      serverUrl: payload.serverUrl,
      joinCode: payload.joinCode,
      teacherName: payload.teacherName,
      className: payload.className,
    });

    // Sau 350ms, nạp thẳng URL vào lớp và đưa cửa sổ lên trên
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(joinUrl);
        mainWindow.setTitle(
          `EduClass Học Sinh — ${payload.className || 'Lớp học'} (${payload.teacherName || 'Giáo viên'})`
        );
        bringWindowToFront();
      }
    }, 350);
  }
}

// IPC: Kéo cửa sổ lên trên khi có hoạt động mới từ Web client
ipcMain.on('bring-to-front', () => {
  bringWindowToFront();
});

// IPC: Kết nối thủ công
ipcMain.on('manual-connect', (_event, { urlOrIp, joinCode }) => {
  let targetUrl = urlOrIp.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `http://${targetUrl}`;
  }
  if (!targetUrl.includes(':') && !targetUrl.includes('/', 8)) {
    targetUrl = `${targetUrl}:3000`;
  }
  if (joinCode && joinCode.trim() !== '') {
    targetUrl = `${targetUrl}/?code=${joinCode.trim()}`;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(targetUrl);
    mainWindow.setTitle('EduClass Học Sinh');
    showMainWindow();
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// IPC: Chế độ thi an toàn (Exam Kiosk Mode)
ipcMain.on('kiosk-lock', () => {
  enableKioskMode();
});

ipcMain.on('kiosk-unlock', () => {
  disableKioskMode();
});

ipcMain.handle('kiosk-is-locked', () => {
  return isKioskMode;
});

// Dọn dẹp an toàn khi tắt app
app.on('before-quit', async () => {
  isQuitting = true;
  disableKioskMode();
  if (beaconListener) {
    await beaconListener.stop();
    beaconListener = null;
  }
});

app.on('window-all-closed', () => {
  // Trên Windows, khi đóng hết cửa sổ thì app vẫn chạy nền ở khay hệ thống trừ khi isQuitting = true
  if (isQuitting) {
    app.quit();
  }
});
