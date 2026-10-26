import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app.js';

describe('Serve Static 2 UI (Teacher UI & Student UI)', () => {
  let app: FastifyInstance;
  let tempRoot: string;
  let studentDir: string;
  let teacherDir: string;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'educlass-static-test-'));
    studentDir = path.join(tempRoot, 'student-dist');
    teacherDir = path.join(tempRoot, 'teacher-dist');

    fs.mkdirSync(studentDir, { recursive: true });
    fs.mkdirSync(teacherDir, { recursive: true });

    fs.writeFileSync(
      path.join(studentDir, 'index.html'),
      '<html><body>Student Portal</body></html>'
    );
    fs.writeFileSync(path.join(studentDir, 'app.js'), 'console.log("student");');

    fs.writeFileSync(
      path.join(teacherDir, 'index.html'),
      '<html><body>Teacher Portal</body></html>'
    );
    fs.writeFileSync(path.join(teacherDir, 'admin.js'), 'console.log("teacher");');

    app = await buildServer({
      fastifyOptions: { logger: false },
      studentUiDir: studentDir,
      teacherUiDir: teacherDir,
    });
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(tempRoot)) {
      try {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      } catch {
        // Bỏ qua lỗi khóa file tạm thời trên Windows
      }
    }
  });

  it('serves student portal at root / and assets', async () => {
    const resRoot = await app.inject({ method: 'GET', url: '/' });
    expect(resRoot.statusCode).toBe(200);
    expect(resRoot.body).toContain('Student Portal');

    const resAsset = await app.inject({ method: 'GET', url: '/app.js' });
    expect(resAsset.statusCode).toBe(200);
    expect(resAsset.body).toContain('console.log("student");');
  });

  it('serves teacher portal at /teacher and /teacher/ assets', async () => {
    const resTeacher = await app.inject({ method: 'GET', url: '/teacher' });
    expect(resTeacher.statusCode).toBe(200);
    expect(resTeacher.body).toContain('Teacher Portal');

    const resTeacherAsset = await app.inject({ method: 'GET', url: '/teacher/admin.js' });
    expect(resTeacherAsset.statusCode).toBe(200);
    expect(resTeacherAsset.body).toContain('console.log("teacher");');
  });
});
