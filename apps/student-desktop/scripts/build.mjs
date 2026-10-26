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
}

// Sao chép window.html vào dist
fs.copyFileSync(path.join(rootDir, 'src/window.html'), path.join(distDir, 'window.html'));

// Đóng gói main.ts
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/main.ts')],
  outfile: path.join(distDir, 'main.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
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

console.info('Successfully bundled apps/student-desktop with esbuild!');
