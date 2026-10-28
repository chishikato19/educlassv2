# Thiết kế Kỹ thuật: Kỳ thi theo ca & Quản lý Báo cáo Kỳ thi lâu dài

## 1. Kiến trúc Tổng thể (Architecture Overview)

Tách biệt rõ 2 tầng:

- **Tầng Phiên học Thời gian thực (Real-time Session):** Quản lý kết nối WebSocket, người dùng online/offline, mã vào lớp 6 ký tự.
- **Tầng Kỳ thi Lâu dài (Persistent Exam Management):** Quản lý thực thể kỳ thi, các ca thi liên phiên, chốt kết quả và báo cáo theo lớp.

```text
+--------------------------------------------------------------------------+
|                            TEACHER INTERFACE                             |
|  [Tab Lớp học]  [Tab Kho đề]  [Tab Phiên học]  [Tab Báo cáo kỳ thi]      |
+--------------------------------------------------------------------------+
                                       │ REST / WS
                                       ▼
+--------------------------------------------------------------------------+
|                           SERVER FASTIFY API                             |
|  /api/exams (CRUD, get, list, stats, batch dispatch, export excel)      |
+--------------------------------------------------------------------------+
                                       │ Drizzle ORM
                                       ▼
+--------------------------------------------------------------------------+
|                             SQLITE DATABASE                              |
|                                                                          |
|  [exams]                                  [exam_records]                 |
|  ├── id (ULID)                            ├── id (ULID)                  |
|  ├── class_id                             ├── exam_id (FK -> exams)      |
|  ├── title                                ├── student_id (FK -> students)|
|  ├── duration_minutes                     ├── student_name               |
|  ├── questions_snapshot                   ├── batch_index (Ca 1, 2...)   |
|  ├── status (ready/running/waiting/done)  ├── score, percentage          |
|  └── active_session_id                    └── answers_json, result_json  |
+--------------------------------------------------------------------------+
```

---

## 2. Mô hình Dữ liệu (SQLite Drizzle Schema)

Được định nghĩa trong `packages/db/src/schema/index.ts`:

### 2.1 Bảng `exams`

```ts
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(), // ULID
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject'),
  durationMinutes: integer('duration_minutes').notNull().default(45),
  configJson: text('config_json').notNull(), // { shuffleQuestions, shuffleOptions, allowViewScore... }
  questionsSnapshotJson: text('questions_snapshot_json').notNull(), // Lưu cứng đề thi gốc tại lúc tạo
  status: text('status', {
    enum: ['ready', 'in_progress', 'waiting_next_batch', 'finished'],
  })
    .notNull()
    .default('ready'),
  currentBatch: integer('current_batch').notNull().default(1),
  activeSessionId: text('active_session_id').references(() => sessions.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

### 2.2 Bảng `exam_records`

```ts
export const examRecords = sqliteTable('exam_records', {
  id: text('id').primaryKey(), // ULID
  examId: text('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  batchIndex: integer('batch_index').notNull().default(1),
  status: text('status', {
    enum: ['in_progress', 'submitted'],
  })
    .notNull()
    .default('submitted'),
  score: real('score').notNull().default(0),
  maxScore: real('max_score').notNull().default(10),
  percentage: real('percentage').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  answersJson: text('answers_json').notNull(), // { [questionId]: studentAnswer }
  resultJson: text('result_json'), // Chi tiết từng câu đúng/sai, lời giải
  timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
  submittedAt: integer('submitted_at').notNull(),
});
```

---

## 3. Giao diện Lập trình REST API (Fastify Endpoints)

Định nghĩa trong `packages/server/src/routes/exams.ts`:

1. `GET /api/exams`: Lấy danh sách kỳ thi của GV (kèm thống kê: tổng sĩ số lớp, số HS đã nộp, điểm TB).
2. `POST /api/exams`: Khởi tạo kỳ thi mới từ một bộ đề (`questionSetId`) và gắn với một lớp (`classId`).
3. `GET /api/exams/:id`: Lấy chi tiết kỳ thi, danh sách bài làm của từng học sinh (`exam_records`), ma trận phân tích câu hỏi và phổ điểm.
4. `POST /api/exams/:id/start-batch`: Gắn kỳ thi vào một phiên học đang mở (`sessionId`), nâng `currentBatch` nếu là ca tiếp theo, chuyển trạng thái sang `in_progress`.
5. `POST /api/exams/:id/pause-batch`: Tạm dừng ca thi hiện tại, ngắt liên kết phiên, chuyển trạng thái sang `waiting_next_batch`.
6. `POST /api/exams/:id/finish`: Chốt hoàn tất toàn bộ kỳ thi, chuyển trạng thái sang `finished`.
7. `GET /api/exams/:id/export-excel`: Xuất file Excel bảng điểm toàn diện của cả lớp theo mẫu chuẩn.

---

## 4. Tích hợp Hoạt động Thi & Khóa Thí sinh Đã thi

1. **Khởi chạy trong Phiên:**
   - Khi GV bấm "Mở ca trong phiên này", server tạo một `activity_run` với `activityId = 'exam'` trong phiên đó.
   - Config của run này chứa `examId`, `batchIndex`, và danh sách `completedStudentIds` (những em đã thi ở ca trước).
2. **Tại Cổng Học sinh (Student UI):**
   - Khi HS vào màn hình chọn tên trong danh sách lớp:
     - Những em có `studentId` nằm trong `completedStudentIds` sẽ hiển thị badge xanh `Đã hoàn thành` và nút chọn bị làm mờ (disabled).
     - Chỉ những em chưa thi mới có thể bấm chọn tên để vào làm bài.
3. **Khi Nộp bài:**
   - Hoạt động `ExamActivity` chấm điểm xong sẽ vừa trả kết quả về `activity_results` của phiên, vừa ghi bản ghi vĩnh viễn vào bảng `exam_records` với `exam_id = examId` và `batch_index = currentBatch`.
   - Trao thưởng EXP theo cơ chế lõi của hệ thống.

---

## 5. Thiết kế Giao diện Giáo viên (Teacher UI)

Thêm Tab `exam-reports` vào `apps/teacher-ui`:

- **Thanh lọc:** Tất cả · Đang mở ca · Chờ ca tiếp theo · Đã hoàn thành.
- **Thẻ kỳ thi (Exam Card):**
  - Tên đề thi, môn học, lớp học.
  - Thanh tiến độ (Progress bar): `20/40 học sinh (50%)`.
  - Huy hiệu trạng thái:
    - Vàng: `Chờ ca tiếp theo (Đã thi Ca 1)`
    - Xanh lá: `Đang diễn ra (Ca 2)`
    - Xanh dương: `Đã hoàn thành`
  - Các nút hành động:
    - `[ ▶ Mở ca tiếp theo trong phiên này ]` (Chỉ kích hoạt khi GV có phiên đang mở).
    - `[ ⏸ Tạm dừng ca thi ]` (Khi hết tiết Ca 1).
    - `[ 📊 Xem bảng điểm & Phân tích ]` (Mở modal/màn hình chi tiết).
    - `[ 📥 Xuất Excel ]` (Tải file bảng điểm).
