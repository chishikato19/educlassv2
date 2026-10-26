import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index.js';

export type EduClassDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnectionOptions {
  path?: string;
  inMemory?: boolean;
  verbose?: boolean;
}

export interface DatabaseConnection {
  db: EduClassDatabase;
  sqlite: DatabaseType;
  path: string;
  close: () => void;
}

/**
 * Khởi tạo kết nối SQLite với better-sqlite3 và Drizzle ORM
 * Luôn bật FOREIGN KEYS = ON và WAL mode nếu lưu trên đĩa
 */
export function createDatabaseConnection(
  options: DatabaseConnectionOptions = {}
): DatabaseConnection {
  const isInMemory = options.inMemory ?? (!options.path || options.path === ':memory:');
  const dbPath = isInMemory ? ':memory:' : (options.path as string);

  const sqlite: DatabaseType = new Database(dbPath, {
    verbose: options.verbose ? (msg: unknown) => console.info(msg) : undefined,
  });

  // Luôn bắt buộc bật foreign keys trong SQLite
  sqlite.pragma('foreign_keys = ON');

  // Nếu lưu trên đĩa, bật WAL mode để tối ưu hiệu năng ghi đồng thời
  if (!isInMemory) {
    sqlite.pragma('journal_mode = WAL');
  }

  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    path: dbPath,
    close: () => {
      sqlite.close();
    },
  };
}
