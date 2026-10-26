const fs = require('node:fs');
const path = require('node:path');

/**
 * Hook sau khi electron-builder giải nén thư mục appOutDir
 * Đảm bảo file better_sqlite3.node luôn là bản biên dịch cho Electron ABI 132
 */
exports.default = async function afterPack(context) {
  console.info('[afterPack] Đang cập nhật better_sqlite3.node tương thích Electron...');
  const targetPath = path.join(
    context.appOutDir,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  );

  const sourceCandidates = [
    path.join(__dirname, '../bin/better_sqlite3_electron.node'),
    path.join(__dirname, '../../node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node'),
  ];

  const sourcePath = sourceCandidates.find(p => fs.existsSync(p));
  if (sourcePath && fs.existsSync(path.dirname(targetPath))) {
    fs.copyFileSync(sourcePath, targetPath);
    console.info(`[afterPack] Đã sao chép thành công file Electron binary: ${targetPath}`);
  } else {
    console.warn('[afterPack] Cảnh báo: Không tìm thấy nguồn binary hoặc thư mục đích:', {
      sourcePath,
      targetDir: path.dirname(targetPath),
    });
  }
};
