/* eslint-disable */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection, runMigrations } from '../packages/db/dist/index.js';
import { buildServer } from '../packages/server/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Dò tìm IP mạng nội bộ (LAN IP)
function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const netList of Object.values(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }
  const preferred = candidates.find(
    (ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
  );
  return preferred || candidates[0] || '127.0.0.1';
}

async function main() {
  console.log('\n⏳ Đang khởi động máy chủ EduClass v2...');

  // 2. Chuẩn bị thư mục dữ liệu và CSDL SQLite bền vững
  const dataDir = path.join(rootDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'educlass.db');
  const conn = createDatabaseConnection({ filename: dbPath });
  const migrationsDir = path.join(rootDir, 'packages/db/src/migrations');
  runMigrations({ sqlite: conn.sqlite, migrationsDir });

  // 3. Khởi tạo Fastify Server
  const app = await buildServer({
    db: conn.db,
    autoSeedAdmin: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = '0.0.0.0';

  await app.listen({ port, host });

  const lanIp = getLanIp();
  const teacherUrl = `http://localhost:${port}/teacher`;
  const studentUrl = `http://${lanIp}:${port}/`;

  let version = '2.1.1';
  try {
    const protocol = await import('../packages/protocol/dist/index.js');
    if (protocol.APP_VERSION) version = protocol.APP_VERSION;
  } catch {
    // fallback
  }

  console.log('\n================================================================');
  console.log(`   🚀 EDUCLASS v2 (v${version}) — MÁY CHỦ LỚP HỌC ĐÃ SẴN SÀNG!  `);
  console.log('================================================================');
  console.log(`\n👨‍🏫 DÀNH CHO GIÁO VIÊN (trên máy tính này):`);
  console.log(`   👉 Đường dẫn: ${teacherUrl}`);
  console.log(`   👉 Tài khoản mặc định: admin  |  Mật khẩu: admin123`);
  console.log(`\n📱 DÀNH CHO HỌC SINH (trên điện thoại kết nối cùng mạng WiFi):`);
  console.log(`   👉 Đường dẫn: ${studentUrl}`);
  console.log(`\n📂 Dữ liệu lớp học được lưu tại: ${dbPath}`);
  console.log('----------------------------------------------------------------');
  console.log('💡 Hướng dẫn: Đang tự động mở trình duyệt giáo viên...');
  console.log('   Nhấn [Ctrl + C] tại cửa sổ này khi bạn muốn dừng máy chủ.\n');

  // 4. Tự động mở trình duyệt web giáo viên
  try {
    if (process.platform === 'win32') {
      exec(`start ${teacherUrl}`);
    } else if (process.platform === 'darwin') {
      exec(`open ${teacherUrl}`);
    } else {
      exec(`xdg-open ${teacherUrl}`);
    }
  } catch {
    // Bỏ qua nếu không thể mở trình duyệt tự động
  }

  // 5. Bắt tín hiệu tắt máy chủ
  const shutdown = async () => {
    console.log('\n🛑 Đang dừng máy chủ EduClass...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('\n❌ Không thể khởi động máy chủ:', err);
  process.exit(1);
});
