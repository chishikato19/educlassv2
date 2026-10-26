-- Migration 0003: Thêm cột academic_performance vào bảng students (mặc định 'dat': Đạt)
ALTER TABLE "students" ADD COLUMN "academic_performance" TEXT NOT NULL DEFAULT 'dat';
