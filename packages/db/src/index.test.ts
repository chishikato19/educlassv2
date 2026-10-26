import { describe, expect, it } from 'vitest';
import {
  createDatabaseConnection,
  DB_MODULE_NAME,
  generateId,
  loadMigrationFiles,
  runMigrations,
  UserRepository,
  users,
} from './index.js';

describe('packages/db exports', () => {
  it('exports core modules, repositories and schemas', () => {
    expect(DB_MODULE_NAME).toBe('db');
    expect(createDatabaseConnection).toBeDefined();
    expect(runMigrations).toBeDefined();
    expect(loadMigrationFiles).toBeDefined();
    expect(UserRepository).toBeDefined();
    expect(users).toBeDefined();
    expect(generateId).toBeDefined();
  });
});
