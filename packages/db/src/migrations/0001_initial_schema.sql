-- Migration 0001: Khởi tạo toàn bộ mô hình dữ liệu SQLite EduClass v2
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
