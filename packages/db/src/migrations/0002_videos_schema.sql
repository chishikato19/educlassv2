-- Migration 0002: Thêm bảng videos lưu trữ kho video học liệu YouTube
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
