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
