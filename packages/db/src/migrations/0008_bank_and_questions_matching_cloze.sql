-- Migration 0008: Cập nhật CHECK constraint cho bảng questions và bank_questions để hỗ trợ 'matching' và 'cloze_drag'

-- 1. Bảng questions
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

-- 2. Bảng bank_questions
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
