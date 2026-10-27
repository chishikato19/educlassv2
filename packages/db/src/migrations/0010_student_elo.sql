-- Migration 0010: Thêm cột elo vào bảng students (mặc định 1000)
ALTER TABLE "students" ADD COLUMN "elo" INTEGER NOT NULL DEFAULT 1000;
CREATE INDEX IF NOT EXISTS "idx_students_elo" ON "students"("elo");
