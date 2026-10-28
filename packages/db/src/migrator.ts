import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database as DatabaseType } from 'better-sqlite3';
import { generateId } from './id.js';

export interface MigrationFile {
  version: number;
  name: string;
  sql: string;
}

export interface MigrationOptions {
  sqlite: DatabaseType;
  dbPath?: string | undefined;
  migrationsDir?: string | undefined;
  customMigrations?: MigrationFile[] | undefined;
}

export interface MigrationResult {
  appliedMigrations: Array<{ version: number; name: string }>;
  backupPath: string | null;
}

const __filename = typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "_migrations" (
  "id" TEXT PRIMARY KEY,
  "version" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "applied_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK("role" IN ('admin', 'teacher')),
  "active" INTEGER NOT NULL DEFAULT 1,
  "created_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "classes" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "students" (
  "id" TEXT PRIMARY KEY,
  "class_id" TEXT NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "full_name" TEXT NOT NULL,
  "code" TEXT,
  "password_hash" TEXT,
  "exp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "avatar_json" TEXT,
  "created_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "titles" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "icon_key" TEXT NOT NULL,
  "rule_json" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "student_titles" (
  "id" TEXT PRIMARY KEY,
  "student_id" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "title_id" TEXT NOT NULL REFERENCES "titles"("id") ON DELETE CASCADE,
  "awarded_at" INTEGER NOT NULL,
  "session_id" TEXT
);
CREATE TABLE IF NOT EXISTS "question_sets" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "tags_json" TEXT,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "questions" (
  "id" TEXT PRIMARY KEY,
  "set_id" TEXT NOT NULL REFERENCES "question_sets"("id") ON DELETE CASCADE,
  "order_index" INTEGER NOT NULL,
  "type" TEXT NOT NULL CHECK("type" IN ('mcq4', 'tf', 'tf_group', 'short')),
  "content_json" TEXT NOT NULL,
  "answer_json" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 10
);
CREATE TABLE IF NOT EXISTS "assets" (
  "id" TEXT PRIMARY KEY,
  "sha256" TEXT NOT NULL UNIQUE,
  "mime" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "size" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "class_id" TEXT REFERENCES "classes"("id") ON DELETE SET NULL,
  "join_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open' CHECK("status" IN ('open', 'closing', 'closed')),
  "identity_mode" TEXT NOT NULL CHECK("identity_mode" IN ('roster_only', 'roster_or_guest', 'guest_only')),
  "allow_teams" INTEGER NOT NULL DEFAULT 0,
  "settings_json" TEXT,
  "opened_at" INTEGER NOT NULL,
  "closed_at" INTEGER
);
CREATE TABLE IF NOT EXISTS "teams" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "participants" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "student_id" TEXT REFERENCES "students"("id") ON DELETE SET NULL,
  "display_name" TEXT NOT NULL,
  "identity_level" TEXT NOT NULL CHECK("identity_level" IN ('account', 'roster', 'guest')),
  "team_id" TEXT REFERENCES "teams"("id") ON DELETE SET NULL,
  "status" TEXT NOT NULL DEFAULT 'online' CHECK("status" IN ('online', 'offline')),
  "joined_at" INTEGER NOT NULL,
  "left_at" INTEGER
);
CREATE TABLE IF NOT EXISTS "activity_runs" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "activity_id" TEXT NOT NULL,
  "config_json" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready' CHECK("status" IN ('ready', 'running', 'ended')),
  "started_at" INTEGER NOT NULL,
  "ended_at" INTEGER
);
CREATE TABLE IF NOT EXISTS "activity_results" (
  "id" TEXT PRIMARY KEY,
  "run_id" TEXT NOT NULL REFERENCES "activity_runs"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "score_json" TEXT NOT NULL,
  "rank" INTEGER
);
CREATE TABLE IF NOT EXISTS "exam_answers" (
  "id" TEXT PRIMARY KEY,
  "run_id" TEXT NOT NULL REFERENCES "activity_runs"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "question_id" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "answer_json" TEXT NOT NULL,
  "ts" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "reward_rules" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT REFERENCES "users"("id") ON DELETE CASCADE,
  "scope" TEXT NOT NULL CHECK("scope" IN ('global', 'teacher')),
  "activity_id" TEXT,
  "trigger" TEXT NOT NULL,
  "exp" INTEGER NOT NULL,
  "enabled" INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS "reward_log" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "student_id" TEXT REFERENCES "students"("id") ON DELETE SET NULL,
  "exp" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "persisted" INTEGER NOT NULL DEFAULT 0,
  "ts" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "from_participant_id" TEXT REFERENCES "participants"("id") ON DELETE SET NULL,
  "to_participant_id" TEXT REFERENCES "participants"("id") ON DELETE SET NULL,
  "from_teacher" INTEGER NOT NULL DEFAULT 0,
  "text" TEXT NOT NULL,
  "ts" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "session_reports" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "snapshot_json" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "target_json" TEXT,
  "ts" INTEGER NOT NULL
);
`;

export const EMBEDDED_MIGRATIONS: MigrationFile[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: 'videos_schema',
    sql: `
CREATE TABLE IF NOT EXISTS "videos" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "youtube_url" TEXT NOT NULL,
  "youtube_id" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Khởi động',
  "description" TEXT,
  "duration" TEXT,
  "tags_json" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_videos_category" ON "videos"("category");
CREATE INDEX IF NOT EXISTS "idx_videos_created_at" ON "videos"("created_at");
`,
  },
  {
    version: 3,
    name: 'student_academic_performance',
    sql: `ALTER TABLE "students" ADD COLUMN "academic_performance" TEXT NOT NULL DEFAULT 'dat';`,
  },
  {
    version: 4,
    name: 'exams_and_records_schema',
    sql: `
CREATE TABLE IF NOT EXISTS "exams" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "class_id" TEXT NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "subject" TEXT,
  "duration_minutes" INTEGER NOT NULL DEFAULT 45,
  "config_json" TEXT NOT NULL,
  "questions_snapshot_json" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready' CHECK("status" IN ('ready', 'in_progress', 'waiting_next_batch', 'finished')),
  "current_batch" INTEGER NOT NULL DEFAULT 1,
  "active_session_id" TEXT REFERENCES "sessions"("id") ON DELETE SET NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "exam_records" (
  "id" TEXT PRIMARY KEY,
  "exam_id" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "student_id" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "student_name" TEXT NOT NULL,
  "batch_index" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'submitted' CHECK("status" IN ('in_progress', 'submitted')),
  "score" REAL NOT NULL DEFAULT 0,
  "max_score" REAL NOT NULL DEFAULT 10,
  "percentage" REAL NOT NULL DEFAULT 0,
  "correct_count" INTEGER NOT NULL DEFAULT 0,
  "total_questions" INTEGER NOT NULL DEFAULT 0,
  "answers_json" TEXT NOT NULL,
  "result_json" TEXT,
  "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
  "submitted_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_exams_owner_id" ON "exams"("owner_id");
CREATE INDEX IF NOT EXISTS "idx_exams_class_id" ON "exams"("class_id");
CREATE INDEX IF NOT EXISTS "idx_exams_status" ON "exams"("status");
CREATE INDEX IF NOT EXISTS "idx_exam_records_exam_id" ON "exam_records"("exam_id");
CREATE INDEX IF NOT EXISTS "idx_exam_records_student_id" ON "exam_records"("student_id");
`,
  },
  {
    version: 5,
    name: 'bank_questions_schema',
    sql: `
CREATE TABLE IF NOT EXISTS "bank_questions" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "chapter" TEXT NOT NULL,
  "lesson" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('nb', 'th', 'vd', 'vdc')),
  "type" TEXT NOT NULL CHECK("type" IN ('mcq4', 'tf', 'tf_group', 'short')),
  "content_json" TEXT NOT NULL,
  "answer_json" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 10,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_bank_questions_owner_id" ON "bank_questions"("owner_id");
CREATE INDEX IF NOT EXISTS "idx_bank_questions_grade_subject" ON "bank_questions"("grade", "subject");
    CREATE INDEX IF NOT EXISTS "idx_bank_questions_lesson_diff" ON "bank_questions"("lesson", "difficulty");
`,
  },
  {
    version: 6,
    name: 'class_groups_schema',
    sql: `
CREATE TABLE IF NOT EXISTS "class_groups" (
  "id" TEXT PRIMARY KEY,
  "class_id" TEXT NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "leader_student_id" TEXT REFERENCES "students"("id") ON DELETE SET NULL,
  "created_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_class_groups_class_id" ON "class_groups"("class_id");

ALTER TABLE "students" ADD COLUMN "group_id" TEXT REFERENCES "class_groups"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_students_group_id" ON "students"("group_id");
`,
  },
  {
    version: 7,
    name: 'user_subject',
    sql: `
ALTER TABLE "users" ADD COLUMN "subject" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
`,
  },
  {
    version: 8,
    name: 'bank_and_questions_matching_cloze',
    sql: `
CREATE TABLE IF NOT EXISTS "questions_new" (
  "id" TEXT PRIMARY KEY,
  "set_id" TEXT NOT NULL REFERENCES "question_sets"("id") ON DELETE CASCADE,
  "order_index" INTEGER NOT NULL,
  "type" TEXT NOT NULL CHECK("type" IN ('mcq4', 'tf', 'tf_group', 'short', 'matching', 'cloze_drag')),
  "content_json" TEXT NOT NULL,
  "answer_json" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 10
);

INSERT INTO "questions_new" SELECT * FROM "questions";
DROP TABLE "questions";
ALTER TABLE "questions_new" RENAME TO "questions";
CREATE INDEX IF NOT EXISTS "idx_questions_set_id" ON "questions"("set_id");

CREATE TABLE IF NOT EXISTS "bank_questions_new" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "chapter" TEXT NOT NULL,
  "lesson" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('nb', 'th', 'vd', 'vdc')),
  "type" TEXT NOT NULL CHECK("type" IN ('mcq4', 'tf', 'tf_group', 'short', 'matching', 'cloze_drag')),
  "content_json" TEXT NOT NULL,
  "answer_json" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 10,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

INSERT INTO "bank_questions_new" SELECT * FROM "bank_questions";
DROP TABLE "bank_questions";
ALTER TABLE "bank_questions_new" RENAME TO "bank_questions";

CREATE INDEX IF NOT EXISTS "idx_bank_questions_owner_id" ON "bank_questions"("owner_id");
CREATE INDEX IF NOT EXISTS "idx_bank_questions_grade_subject" ON "bank_questions"("grade", "subject");
CREATE INDEX IF NOT EXISTS "idx_bank_questions_lesson_diff" ON "bank_questions"("lesson", "difficulty");
`,
  },
  {
    version: 9,
    name: 'participant_student_ids',
    sql: `ALTER TABLE "participants" ADD COLUMN "student_ids_json" TEXT;`,
  },
  {
    version: 10,
    name: 'student_elo',
    sql: `
ALTER TABLE "students" ADD COLUMN "elo" INTEGER NOT NULL DEFAULT 1000;
CREATE INDEX IF NOT EXISTS "idx_students_elo" ON "students"("elo");
`,
  },
];

/**
 * Đảm bảo tính toàn vẹn của cấu trúc CSDL (Self-healing schema guard)
 * Đảm bảo các bảng và cột luôn tồn tại ngay cả khi migration ở trạng thái không đồng bộ
 */
export function ensureSchemaIntegrity(sqlite: DatabaseType): void {
  // 1. Đảm bảo bảng videos luôn tồn tại
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "videos" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "youtube_url" TEXT NOT NULL,
      "youtube_id" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Khởi động',
      "description" TEXT,
      "duration" TEXT,
      "tags_json" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_videos_category" ON "videos"("category");
    CREATE INDEX IF NOT EXISTS "idx_videos_created_at" ON "videos"("created_at");
  `);

  // 2. Đảm bảo cột academic_performance và elo luôn tồn tại trong bảng students
  try {
    const studentColumns = sqlite.prepare('PRAGMA table_info("students")').all() as Array<{
      name: string;
    }>;
    const hasAcademicPerformance = studentColumns.some(col => col.name === 'academic_performance');
    if (!hasAcademicPerformance && studentColumns.length > 0) {
      sqlite.exec(
        'ALTER TABLE "students" ADD COLUMN "academic_performance" TEXT NOT NULL DEFAULT \'dat\';'
      );
    }
    const hasElo = studentColumns.some(col => col.name === 'elo');
    if (!hasElo && studentColumns.length > 0) {
      sqlite.exec('ALTER TABLE "students" ADD COLUMN "elo" INTEGER NOT NULL DEFAULT 1000;');
      sqlite.exec('CREATE INDEX IF NOT EXISTS "idx_students_elo" ON "students"("elo");');
    }
  } catch {
    // Bỏ qua nếu bảng students chưa được tạo
  }

  // 3. Đảm bảo bảng exams và exam_records luôn tồn tại
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "exams" (
        "id" TEXT PRIMARY KEY,
        "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "class_id" TEXT NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "subject" TEXT,
        "duration_minutes" INTEGER NOT NULL DEFAULT 45,
        "config_json" TEXT NOT NULL,
        "questions_snapshot_json" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ready' CHECK("status" IN ('ready', 'in_progress', 'waiting_next_batch', 'finished')),
        "current_batch" INTEGER NOT NULL DEFAULT 1,
        "active_session_id" TEXT REFERENCES "sessions"("id") ON DELETE SET NULL,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "exam_records" (
        "id" TEXT PRIMARY KEY,
        "exam_id" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
        "student_id" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "student_name" TEXT NOT NULL,
        "batch_index" INTEGER NOT NULL DEFAULT 1,
        "status" TEXT NOT NULL DEFAULT 'submitted' CHECK("status" IN ('in_progress', 'submitted')),
        "score" REAL NOT NULL DEFAULT 0,
        "max_score" REAL NOT NULL DEFAULT 10,
        "percentage" REAL NOT NULL DEFAULT 0,
        "correct_count" INTEGER NOT NULL DEFAULT 0,
        "total_questions" INTEGER NOT NULL DEFAULT 0,
        "answers_json" TEXT NOT NULL,
        "result_json" TEXT,
        "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
        "submitted_at" INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS "idx_exams_owner_id" ON "exams"("owner_id");
      CREATE INDEX IF NOT EXISTS "idx_exams_class_id" ON "exams"("class_id");
      CREATE INDEX IF NOT EXISTS "idx_exams_status" ON "exams"("status");
      CREATE INDEX IF NOT EXISTS "idx_exam_records_exam_id" ON "exam_records"("exam_id");
      CREATE INDEX IF NOT EXISTS "idx_exam_records_student_id" ON "exam_records"("student_id");
    `);
  } catch {
    // Bỏ qua nếu lỗi
  }

  // 4. Đảm bảo bảng bank_questions luôn tồn tại
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "bank_questions" (
        "id" TEXT PRIMARY KEY,
        "owner_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "grade" INTEGER NOT NULL,
        "subject" TEXT NOT NULL,
        "chapter" TEXT NOT NULL,
        "lesson" TEXT NOT NULL,
        "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('nb', 'th', 'vd', 'vdc')),
        "type" TEXT NOT NULL CHECK("type" IN ('mcq4', 'tf', 'tf_group', 'short', 'matching', 'cloze_drag')),
        "content_json" TEXT NOT NULL,
        "answer_json" TEXT NOT NULL,
        "points" INTEGER NOT NULL DEFAULT 10,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS "idx_bank_questions_owner_id" ON "bank_questions"("owner_id");
      CREATE INDEX IF NOT EXISTS "idx_bank_questions_grade_subject" ON "bank_questions"("grade", "subject");
      CREATE INDEX IF NOT EXISTS "idx_bank_questions_lesson_diff" ON "bank_questions"("lesson", "difficulty");
    `);
  } catch {
    // Bỏ qua nếu lỗi
  }

  // 5. Đảm bảo bảng class_groups và cột group_id trong bảng students luôn tồn tại
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "class_groups" (
        "id" TEXT PRIMARY KEY,
        "class_id" TEXT NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "order_index" INTEGER NOT NULL DEFAULT 0,
        "leader_student_id" TEXT REFERENCES "students"("id") ON DELETE SET NULL,
        "created_at" INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_class_groups_class_id" ON "class_groups"("class_id");
    `);

    const studentColumns = sqlite.prepare('PRAGMA table_info("students")').all() as Array<{
      name: string;
    }>;
    const hasGroupId = studentColumns.some(col => col.name === 'group_id');
    if (!hasGroupId && studentColumns.length > 0) {
      sqlite.exec(
        'ALTER TABLE "students" ADD COLUMN "group_id" TEXT REFERENCES "class_groups"("id") ON DELETE SET NULL;'
      );
      sqlite.exec('CREATE INDEX IF NOT EXISTS "idx_students_group_id" ON "students"("group_id");');
    }
    // 6. Đảm bảo cột subject và avatar luôn tồn tại trong bảng users
    try {
      const userColumns = sqlite.prepare('PRAGMA table_info("users")').all() as Array<{
        name: string;
      }>;
      const hasSubject = userColumns.some(col => col.name === 'subject');
      if (!hasSubject && userColumns.length > 0) {
        sqlite.exec('ALTER TABLE "users" ADD COLUMN "subject" TEXT;');
      }
      const hasAvatar = userColumns.some(col => col.name === 'avatar');
      if (!hasAvatar && userColumns.length > 0) {
        sqlite.exec('ALTER TABLE "users" ADD COLUMN "avatar" TEXT;');
      }
    } catch {
      // Bỏ qua nếu lỗi
    }

    // 7. Đảm bảo cột student_ids_json luôn tồn tại trong bảng participants
    try {
      const participantColumns = sqlite
        .prepare('PRAGMA table_info("participants")')
        .all() as Array<{ name: string }>;
      const hasStudentIds = participantColumns.some(col => col.name === 'student_ids_json');
      if (!hasStudentIds && participantColumns.length > 0) {
        sqlite.exec('ALTER TABLE "participants" ADD COLUMN "student_ids_json" TEXT;');
      }
    } catch {
      // Bỏ qua nếu lỗi
    }
  } catch {
    // Bỏ qua nếu lỗi
  }
}

/**
 * Đọc danh sách file migration từ thư mục và sắp xếp theo version tăng dần
 * Nếu thư mục không tồn tại hoặc lỗi (ví dụ trong môi trường đóng gói bundle/asar),
 * tự động sử dụng danh sách EMBEDDED_MIGRATIONS tích hợp sẵn.
 */
export function loadMigrationFiles(dirPath?: string): MigrationFile[] {
  const migrationsDirectory = dirPath ?? path.resolve(__dirname, 'migrations');

  if (fs.existsSync(migrationsDirectory)) {
    try {
      const files = fs
        .readdirSync(migrationsDirectory)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (files.length > 0) {
        return files.map(fileName => {
          const match = fileName.match(/^(\d+)_(.+)\.sql$/);
          if (!match || !match[1] || !match[2]) {
            throw new Error(
              `File migration không hợp lệ: "${fileName}". Định dạng bắt buộc: <số_phiên_bản>_<tên>.sql (vd: 0001_initial_schema.sql)`
            );
          }

          const version = parseInt(match[1], 10);
          const name = match[2];
          const sql = fs.readFileSync(path.join(migrationsDirectory, fileName), 'utf-8');

          return { version, name, sql };
        });
      }
    } catch {
      // Fallback xuống EMBEDDED_MIGRATIONS
    }
  }

  return EMBEDDED_MIGRATIONS;
}

/**
 * Tự động sao lưu tập tin CSDL trước khi thực hiện migration
 */
export function backupDatabaseFile(dbPath: string, nextVersion: number): string | null {
  if (!dbPath || dbPath === ':memory:' || !fs.existsSync(dbPath)) {
    return null;
  }

  const stats = fs.statSync(dbPath);
  if (stats.size === 0) {
    return null;
  }

  const timestamp = Date.now();
  const parsed = path.parse(dbPath);
  const backupFileName = `${parsed.name}.backup-${timestamp}-v${nextVersion}${parsed.ext || '.db'}`;
  const backupPath = path.join(parsed.dir, backupFileName);

  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

/**
 * Thực thi các migration chưa chạy và ghi nhận vào bảng _migrations
 * Luôn backup file DB trước khi áp dụng bất kỳ migration mới nào
 */
export function runMigrations(options: MigrationOptions): MigrationResult {
  const { sqlite, dbPath, migrationsDir, customMigrations } = options;

  // 1. Tạo bảng _migrations nếu chưa tồn tại
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "id" TEXT PRIMARY KEY,
      "version" INTEGER NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "applied_at" INTEGER NOT NULL
    );
  `);

  // 2. Lấy danh sách version đã áp dụng
  const appliedRows = sqlite
    .prepare('SELECT version FROM "_migrations" ORDER BY version ASC')
    .all() as Array<{ version: number }>;
  const appliedVersionSet = new Set(appliedRows.map(row => row.version));

  // 3. Tải danh sách migration cần kiểm tra
  const allMigrations = (customMigrations ?? loadMigrationFiles(migrationsDir)).sort(
    (a, b) => a.version - b.version
  );

  const pendingMigrations = allMigrations.filter(m => !appliedVersionSet.has(m.version));

  if (pendingMigrations.length === 0) {
    ensureSchemaIntegrity(sqlite);
    return {
      appliedMigrations: [],
      backupPath: null,
    };
  }

  // 4. Tự động backup CSDL trước khi chạy migration nếu DB đã có migration trước đó
  const shouldBackup = appliedVersionSet.size > 0;
  const firstPendingVersion = pendingMigrations[0]?.version ?? 1;
  const backupPath =
    dbPath && shouldBackup ? backupDatabaseFile(dbPath, firstPendingVersion) : null;

  // 5. Thực thi từng migration tuần tự trong transaction
  const appliedMigrations: Array<{ version: number; name: string }> = [];

  const runMigrationTx = sqlite.transaction((migration: MigrationFile) => {
    try {
      sqlite.exec(migration.sql);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate column name')) {
        // Cột đã tồn tại từ trước (idempotent), an toàn bỏ qua
      } else {
        throw err;
      }
    }
    sqlite
      .prepare(
        'INSERT INTO "_migrations" ("id", "version", "name", "applied_at") VALUES (?, ?, ?, ?)'
      )
      .run(generateId(), migration.version, migration.name, Date.now());
  });

  for (const migration of pendingMigrations) {
    runMigrationTx(migration);
    appliedMigrations.push({ version: migration.version, name: migration.name });
  }

  // Luôn chạy ensureSchemaIntegrity để bảo đảm cấu trúc CSDL hoàn toàn sẵn sàng
  ensureSchemaIntegrity(sqlite);

  return {
    appliedMigrations,
    backupPath,
  };
}
