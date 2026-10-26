import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';

export interface ServeUiOptions {
  teacherUiDir?: string | undefined;
  studentUiDir?: string | undefined;
}

const __filename = typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

function ensurePlaceholderDir(dirPath: string, name: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title></head><body><h1>EduClass v2 - ${name}</h1><p>Giao diện đang sẵn sàng...</p></body></html>`;
    fs.writeFileSync(path.join(dirPath, 'index.html'), html, 'utf-8');
  }
  return dirPath;
}

export const serveUiPlugin: FastifyPluginAsync<ServeUiOptions> = async (
  fastify: FastifyInstance,
  options
) => {
  const defaultFallbackDir = path.resolve(__dirname, '../../public');
  const teacherDir =
    options.teacherUiDir ??
    ensurePlaceholderDir(path.join(defaultFallbackDir, 'teacher'), 'Teacher Portal');
  const studentDir =
    options.studentUiDir ??
    ensurePlaceholderDir(path.join(defaultFallbackDir, 'student'), 'Student Portal');

  // Đảm bảo thư mục tồn tại
  if (!fs.existsSync(teacherDir)) {
    ensurePlaceholderDir(teacherDir, 'Teacher Portal');
  }
  if (!fs.existsSync(studentDir)) {
    ensurePlaceholderDir(studentDir, 'Student Portal');
  }

  // 1. Phục vụ Teacher UI tại /teacher/
  await fastify.register(fastifyStatic, {
    root: teacherDir,
    prefix: '/teacher/',
    decorateReply: true,
  });

  // Chuyển hướng hoặc phục vụ index.html khi truy cập /teacher (không có slash)
  fastify.get('/teacher', async (_, reply) => {
    return reply.sendFile('index.html', teacherDir);
  });

  // 2. Phục vụ Student UI tại /student/ và root /
  await fastify.register(fastifyStatic, {
    root: studentDir,
    prefix: '/student/',
    decorateReply: false,
  });

  fastify.get('/student', async (_, reply) => {
    return reply.sendFile('index.html', studentDir);
  });

  await fastify.register(fastifyStatic, {
    root: studentDir,
    prefix: '/',
    decorateReply: false,
  });

  // 3. Fallback cho các đường dẫn SPA khi không tìm thấy file tĩnh
  fastify.setNotFoundHandler(async (request, reply) => {
    const cleanUrl = request.url.split('?')[0] ?? '';
    // Nếu là yêu cầu API hoặc file tài nguyên có đuôi (.js, .css, .png...) thì trả về 404
    if (cleanUrl.startsWith('/api/') || /\.[a-zA-Z0-9]+$/.test(cleanUrl)) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    if (cleanUrl.startsWith('/teacher')) {
      return reply.sendFile('index.html', teacherDir);
    }
    return reply.sendFile('index.html', studentDir);
  });
};
