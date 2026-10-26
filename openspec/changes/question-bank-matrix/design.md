# Thiết kế Kỹ thuật: Ngân hàng Câu hỏi & Ma trận Đề thi (Technical Design)

## 1. Kiến trúc Tổng thể & Phân lớp (Architecture & Data Flow)

```
[apps/teacher-ui]
   │
   ├── Tab Ngân hàng: QuestionBankTab / BankQuestionEditor / WordImportModal
   └── Tab Kho đề: MatrixImportModal (Bảng Ma trận 2 chiều)
         │
         │ REST API (Fastify)
         ▼
[packages/server]
   │
   ├── BankRoutes: /api/bank/tree, /api/bank/questions, /api/bank/matrix-stats, /api/bank/generate-set
   └── QuestionSetRoutes: /api/question-sets (đã có sẵn)
         │
         ├── Zod Validation (`packages/protocol`)
         ├── Word Parser & KaTeX (`packages/question-kit`)
         └── Drizzle ORM Repository (`packages/db`)
               │
               ▼
        [SQLite Database]
         ├── bank_questions (Kho câu hỏi gốc)
         ├── question_sets (Bộ đề)
         └── questions (Snapshot câu hỏi trong đề)
```

---

## 2. Thiết kế Cơ sở Dữ liệu (Database Schema)

### Bổ sung bảng `bank_questions` trong `packages/db/src/schema/index.ts`:

```ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

export const bankQuestions = sqliteTable('bank_questions', {
  id: text('id').primaryKey(), // ULID
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Cây phân cấp cố định
  grade: integer('grade').notNull(),        // 1..12
  subject: text('subject').notNull(),       // 'Toán', 'Vật lí', 'Hóa học'...
  chapter: text('chapter').notNull(),       // 'Chương 1: Khảo sát hàm số'
  lesson: text('lesson').notNull(),         // 'Bài 1: Tính đơn điệu'
  
  // 4 mức độ nhận thức chuẩn Bộ GD&ĐT
  difficulty: text('difficulty', { 
    enum: ['nb', 'th', 'vd', 'vdc'] 
  }).notNull(),
  
  // Dạng câu hỏi (chuẩn question-kit)
  type: text('type', { 
    enum: ['mcq4', 'tf', 'tf_group', 'short'] 
  }).notNull(),
  
  contentJson: text('content_json').notNull(), // Nội dung câu hỏi + phương án (RichText + KaTeX)
  answerJson: text('answer_json').notNull(),   // Đáp án đúng + lời giải chi tiết
  points: integer('points').notNull().default(10),
  
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  ownerGradeSubjectIdx: index('bank_q_owner_grade_sub_idx').on(table.ownerId, table.grade, table.subject),
  lessonDiffIdx: index('bank_q_lesson_diff_idx').on(table.lesson, table.difficulty),
}));
```

---

## 3. Thiết kế Protocol & Giao thức (packages/protocol)

### 3.1 Schemas Zod:
```ts
// packages/protocol/src/schemas/bank.ts
import { z } from 'zod';

export const DifficultyLevelSchema = z.enum(['nb', 'th', 'vd', 'vdc']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const BankQuestionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  grade: z.number().int().min(1).max(12),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  lesson: z.string().min(1),
  difficulty: DifficultyLevelSchema,
  type: z.enum(['mcq4', 'tf', 'tf_group', 'short']),
  contentJson: z.string(),
  answerJson: z.string(),
  points: z.number().int().positive().default(10),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type BankQuestion = z.infer<typeof BankQuestionSchema>;

// Ma trận yêu cầu bốc câu hỏi cho 1 bài học
export const MatrixLessonRowSchema = z.object({
  chapter: z.string(),
  lesson: z.string(),
  counts: z.object({
    nb: z.number().int().nonnegative().default(0),
    th: z.number().int().nonnegative().default(0),
    vd: z.number().int().nonnegative().default(0),
    vdc: z.number().int().nonnegative().default(0),
  }),
});
export type MatrixLessonRow = z.infer<typeof MatrixLessonRowSchema>;

// Yêu cầu sinh bộ đề từ ma trận
export const MatrixGenerateRequestSchema = z.object({
  title: z.string().min(1),
  grade: z.number().int().min(1).max(12),
  subject: z.string().min(1),
  matrix: z.array(MatrixLessonRowSchema).min(1),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
});
export type MatrixGenerateRequest = z.infer<typeof MatrixGenerateRequestSchema>;

// Thống kê số câu sẵn có trong kho theo từng bài & mức độ
export const MatrixStatsResponseSchema = z.record(
  z.string(), // key là lesson name
  z.object({
    chapter: z.string(),
    available: z.object({
      nb: z.number().int().nonnegative(),
      th: z.number().int().nonnegative(),
      vd: z.number().int().nonnegative(),
      vdc: z.number().int().nonnegative(),
    }),
  })
);
export type MatrixStatsResponse = z.infer<typeof MatrixStatsResponseSchema>;
```

---

## 4. Thiết kế REST API (packages/server)

Cung cấp các API tại prefix `/api/bank`:

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/bank/tree?grade=12&subject=Toán` | Lấy cây phân cấp Chương - Bài kèm tổng số câu của từng bài |
| `GET` | `/api/bank/questions?grade=12&subject=Toán&lesson=Bài 1&difficulty=nb` | Lọc danh sách câu hỏi trong ngân hàng |
| `POST` | `/api/bank/questions` | Thêm mới 1 câu hỏi vào ngân hàng |
| `PUT` | `/api/bank/questions/:id` | Cập nhật câu hỏi ngân hàng |
| `DELETE` | `/api/bank/questions/:id` | Xóa câu hỏi khỏi ngân hàng |
| `POST` | `/api/bank/matrix-stats` | Nhận danh sách `lessons[]`, trả về số lượng câu có sẵn theo 4 mức độ |
| `POST` | `/api/bank/generate-set` | Thuật toán bốc ngẫu nhiên theo ma trận $\rightarrow$ Tự động tạo `question_sets` mới và trả về ID bộ đề |

### Thuật toán Bốc ngẫu nhiên & Sinh đề (`/api/bank/generate-set`):
1. Với mỗi `row` trong `matrix`:
   - Với mỗi mức độ $d \in \{\text{'nb'}, \text{'th'}, \text{'vd'}, \text{'vdc'}\}$:
     - Số lượng cần lấy: $k = \text{row.counts}[d]$.
     - Nếu $k > 0$: Truy vấn ngẫu nhiên từ kho:
       ```sql
       SELECT * FROM bank_questions 
       WHERE owner_id = :ownerId AND lesson = :lesson AND difficulty = :d
       ORDER BY RANDOM() LIMIT :k;
       ```
2. Thu thập danh sách câu hỏi đã bốc.
3. Nếu bật `shuffleQuestions`: Đảo ngẫu nhiên vị trí các câu.
4. Mở Transaction CSDL:
   - Insert vào bảng `question_sets` (title, subject, grade, tags...).
   - Insert tuần tự vào bảng `questions` (setId, orderIndex, type, contentJson, answerJson, points).
5. Trả về `{ success: true, setId: newSetId, totalQuestions: total }`.

---

## 5. Mở rộng Parser Word (packages/question-kit)

Nâng cấp hàm `parseWordDocument` trong `word-parser.ts`:
- **Nhận diện Chương & Bài**:
  - Regex: `/^\[(Chương|Chuong)\s*:\s*(.+?)\]/i`
  - Regex: `/^\[(Bài|Bai)\s*:\s*(.+?)\]/i`
- **Nhận diện Mức độ**:
  - Regex: `/^\[(NB|TH|VD|VDC|M1|M2|M3|M4)\]/i`
  - Ánh xạ:
    - `NB` hoặc `M1` $\rightarrow$ `nb`
    - `TH` hoặc `M2` $\rightarrow$ `th`
    - `VD` hoặc `M3` $\rightarrow$ `vd`
    - `VDC` hoặc `M4` $\rightarrow$ `vdc`
- Giữ nguyên cơ chế chuyển đổi công thức toán MathType/OMML sang KaTeX $\LaTeX$ và trích xuất hình ảnh.

---

## 6. Thiết kế Giao diện Teacher UI (apps/teacher-ui)

### 6.1 Giao diện Quản lý Ngân hàng câu hỏi (`QuestionBankTab`)
- Tách làm 2 chế độ xem hoặc thêm tab phụ: **Ngân hàng câu hỏi** (kho gốc) & **Bộ đề thi** (danh sách đề thi đã tạo).
- **Cột trái**: Bộ chọn Khối, Môn; Cây thư mục Chương - Bài dạng Accordion có badge đếm số lượng câu.
- **Cột phải**:
  - Hàng lọc mức độ: `Tất cả` | `[NB] Nhận biết` | `[TH] Thông hiểu` | `[VD] Vận dụng` | `[VDC] Vận dụng cao`.
  - Ô tìm kiếm text.
  - Danh sách thẻ câu hỏi (card) hiển thị rõ đề bài (render KaTeX), các phương án lựa chọn, đáp án đúng (tô xanh) và lời giải chi tiết (nếu có).

### 6.2 Giao diện Modal Ma trận Đề thi (`MatrixImportModal`)
- Nằm trong tab **Kho đề** (Question Sets).
- **Bước 1**: Chọn Khối, Môn $\rightarrow$ Checkbox cây bài học cần ra đề.
- **Bước 2**: Bảng lưới 2 chiều:
  - Hàng: Các bài học đã chọn.
  - Cột: 4 mức độ nhận thức (NB, TH, VD, VDC) và Cột Tổng.
  - Ô nhập: `[ Cần lấy ] / [ Sẵn có ]`.
  - Tự động kiểm tra tính hợp lệ: Nếu nhập quá số lượng sẵn có, ô chuyển viền đỏ và báo lỗi ngay dưới chân bảng.
- **Hàng tổng kết**: Hiển thị tổng số câu và tỷ lệ phần trăm phân bố đề thi.
- **Hành động**:
  - Bấm "Xem trước danh sách câu": Bốc thử nghiệm, hiển thị danh sách các câu đã bốc, hỗ trợ nút 🔄 để đổi câu khác cùng tiêu chí.
  - Bấm "Tạo bộ đề thi": Tạo bản ghi trong `question_sets` và chuyển hướng đến trang chỉnh sửa hoặc cho phép mở chơi Quizizz ngay lập tức.
