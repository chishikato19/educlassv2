import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
} else {
  const installerDir = path.join(distDir, 'installer');
  if (fs.existsSync(installerDir)) {
    try {
      fs.rmSync(installerDir, { recursive: true, force: true });
    } catch {
      // Bỏ qua nếu có file tạm đang giải phóng
    }
  }
}

// Sao chép window.html vào dist
fs.copyFileSync(path.join(rootDir, 'src/window.html'), path.join(distDir, 'window.html'));

// Sao chép migrations vào dist
const migrationsSrc = path.resolve(rootDir, '../../packages/db/src/migrations');
const migrationsDest = path.join(distDir, 'migrations');
if (fs.existsSync(migrationsSrc)) {
  fs.cpSync(migrationsSrc, migrationsDest, { recursive: true });
}

// Sao chép teacher-ui dist vào server public teacher
const teacherUiDist = path.resolve(rootDir, '../teacher-ui/dist');
const serverPublicTeacher = path.resolve(rootDir, '../../packages/server/public/teacher');
if (fs.existsSync(teacherUiDist)) {
  if (fs.existsSync(serverPublicTeacher)) {
    fs.rmSync(serverPublicTeacher, { recursive: true, force: true });
  }
  fs.mkdirSync(serverPublicTeacher, { recursive: true });
  fs.cpSync(teacherUiDist, serverPublicTeacher, { recursive: true });
}

// Đóng gói main.ts
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/main.ts')],
  outfile: path.join(distDir, 'main.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron', 'better-sqlite3'],
  banner: {
    js: "const importMetaUrl = require('node:url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': 'importMetaUrl',
  },
  sourcemap: true,
});

// Đóng gói preload.ts
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/preload.ts')],
  outfile: path.join(distDir, 'preload.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
});

console.info('Successfully bundled apps/desktop with esbuild!');
