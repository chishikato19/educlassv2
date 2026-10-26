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
