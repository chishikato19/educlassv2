import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { loadMigrationFiles, runMigrations } from '../migrator.js';

describe('Migrator & Automated Backup', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'educlass-db-test-'));
  });

  afterEach(async () => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Bỏ qua lỗi Windows khóa file tạm thời
        }
      }
    }
  });

  it('loads migration files successfully and sorts by version ascending', () => {
    const files = loadMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]?.version).toBe(1);
    expect(files[0]?.name).toBe('initial_schema');
  });

  it('runs migrations idempotently in-memory', () => {
    const { sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      const firstRun = runMigrations({ sqlite });
      expect(firstRun.appliedMigrations.length).toBeGreaterThan(0);
      expect(firstRun.backupPath).toBeNull();

      const secondRun = runMigrations({ sqlite });
      expect(secondRun.appliedMigrations).toHaveLength(0);
      expect(secondRun.backupPath).toBeNull();
    } finally {
      close();
    }
  });

  it('automatically backs up physical database file before applying new migrations', () => {
    const dbFilePath = path.join(tempDir, 'educlass.db');

    // 1. Khởi tạo DB lần đầu với version 1
    const conn1 = createDatabaseConnection({ path: dbFilePath });
    const res1 = runMigrations({
      sqlite: conn1.sqlite,
      dbPath: dbFilePath,
      customMigrations: [
        {
          version: 1,
          name: 'step1',
          sql: 'CREATE TABLE "step1" ("id" TEXT PRIMARY KEY, "val" TEXT);',
        },
      ],
    });
    expect(res1.appliedMigrations).toHaveLength(1);
    expect(res1.backupPath).toBeNull(); // Lần đầu DB rỗng nên chưa có dữ liệu cũ cần backup

    // Chèn dữ liệu để DB có nội dung
    conn1.sqlite.exec("INSERT INTO \"step1\" VALUES ('id1', 'hello');");
    conn1.close();

    // 2. Chạy tiếp migration version 2 trên file DB đã có dữ liệu -> phải tự động sinh file backup!
    const conn2 = createDatabaseConnection({ path: dbFilePath });
    const res2 = runMigrations({
      sqlite: conn2.sqlite,
      dbPath: dbFilePath,
      customMigrations: [
        {
          version: 1,
          name: 'step1',
          sql: 'CREATE TABLE "step1" ("id" TEXT PRIMARY KEY, "val" TEXT);',
        },
        {
          version: 2,
          name: 'step2',
          sql: 'CREATE TABLE "step2" ("id" TEXT PRIMARY KEY, "note" TEXT);',
        },
      ],
    });

    try {
      expect(res2.appliedMigrations).toHaveLength(1);
      expect(res2.appliedMigrations[0]?.version).toBe(2);
      expect(res2.backupPath).not.toBeNull();
      expect(typeof res2.backupPath).toBe('string');
      expect(fs.existsSync(res2.backupPath!)).toBe(true);

      // Kiểm tra file backup có dữ liệu của bảng step1
      const backupConn = createDatabaseConnection({ path: res2.backupPath! });
      const row = backupConn.sqlite.prepare('SELECT val FROM "step1" WHERE id = ?').get('id1') as {
        val: string;
      };
      expect(row.val).toBe('hello');
      backupConn.close();
    } finally {
      conn2.close();
    }
  });
});
