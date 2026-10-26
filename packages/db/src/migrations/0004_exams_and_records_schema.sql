-- Migration 0004: Thêm bảng exams và exam_records cho tính năng Kỳ thi theo ca & Báo cáo kỳ thi lâu dài
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
