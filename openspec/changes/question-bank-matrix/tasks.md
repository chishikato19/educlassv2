# Danh sách Công việc Triển khai: Ngân hàng Câu hỏi & Ma trận Đề thi (Tasks)

> **Lưu ý:** Tuyệt đối tuân thủ quy tắc `AGENTS.md` khi triển khai:
> - Chỉ thực hiện đúng 1 task tại một thời điểm.
> - Sau mỗi task: chạy kiểm tra nhanh `pnpm run typecheck` (`tsc -b`), không tự ý chạy Vitest / Lint trừ khi người dùng yêu cầu.
> - Cập nhật trạng thái `[x]` sau khi hoàn thành.

---

## Giai đoạn 1: Database & Protocol

- [x] **1.1. Protocol Schemas & Types:**
  - Khai báo enum mức độ nhận thức: `DifficultyLevelSchema` (`nb`, `th`, `vd`, `vdc`) trong `packages/protocol`.
  - Khai báo DTOs: `BankQuestionSchema`, `MatrixLessonRowSchema`, `MatrixGenerateRequestSchema`, `MatrixStatsResponseSchema`.
  - Export từ `packages/protocol/src/index.ts`.
  - Kiểm tra `pnpm run typecheck`.

- [x] **1.2. Database Schema & Migration:**
  - Thêm bảng `bank_questions` vào `packages/db/src/schema/index.ts` kèm chỉ mục tối ưu.
  - Tạo file migration SQLite mới đánh số tăng dần trong `packages/db/src/migrations/`.
  - Viết repository hàm CRUD cho `bank_questions` trong `packages/db`.
  - Kiểm tra `pnpm run typecheck`.

---

## Giai đoạn 2: Question-Kit & Backend REST API

- [x] **2.1. Nâng cấp Word Parser trong Question-Kit:**
  - Mở rộng regex trong `packages/question-kit/src/word/word-parser.ts` để nhận diện tiền tố mức độ `[NB]`, `[TH]`, `[VD]`, `[VDC]`.
  - Nhận diện nhãn phân loại `[Chương: ...]` và `[Bài: ...]`.
  - Bổ sung metadata `difficulty`, `chapter`, `lesson` vào đối tượng kết quả phân tích.
  - Kiểm tra `pnpm run typecheck`.

- [x] **2.2. Xây dựng REST API Ngân hàng câu hỏi trong Server:**
  - Tạo file router mới `packages/server/src/routes/bank.ts`.
  - Cài đặt endpoint `GET /api/bank/tree`: Lấy cây Chương - Bài kèm số lượng câu.
  - Cài đặt endpoint `GET /api/bank/questions`: Lọc danh sách câu hỏi theo Khối, Môn, Bài, Mức độ.
  - Cài đặt endpoint `POST /api/bank/questions`: Thêm mới câu hỏi.
  - Cài đặt endpoint `PUT /api/bank/questions/:id` và `DELETE /api/bank/questions/:id`.
  - Cài đặt endpoint `POST /api/bank/matrix-stats`: Thống kê số lượng câu sẵn có cho danh sách bài học.
  - Cài đặt endpoint `POST /api/bank/generate-set`: Thuật toán bốc ngẫu nhiên theo ma trận và lưu snapshot vào `question_sets`.
  - Đăng ký route vào Fastify server trong `packages/server/src/app.ts`.
  - Kiểm tra `pnpm run typecheck`.

---

## Giai đoạn 3: Giao diện Quản lý Ngân hàng & Import Word (Teacher UI)

- [x] **3.1. API Client trong Teacher UI:**
  - Bổ sung các phương thức gọi API ngân hàng câu hỏi vào `apps/teacher-ui/src/api/client.ts`.
  - Kiểm tra `pnpm run typecheck`.

- [x] **3.2. Thành phần Cây Bài học & Bộ lọc Mức độ:**
  - Xây dựng component `BankCurriculumTree`: Cây danh mục Khối $\rightarrow$ Môn $\rightarrow$ Chương $\rightarrow$ Bài dạng Accordion có badge đếm câu.
  - Xây dựng thanh lọc mức độ `DifficultyFilterBar` với 4 màu badge chuẩn (`NB`, `TH`, `VD`, `VDC`).
  - Kiểm tra `pnpm run typecheck`.

- [x] **3.3. Màn hình Quản lý Ngân hàng câu hỏi (`BankQuestionTab`):**
  - Tích hợp vào màn hình chính của giáo viên (tùy chọn chuyển đổi giữa "Ngân hàng câu hỏi" và "Kho bộ đề").
  - Hiển thị danh sách câu hỏi theo dạng thẻ (card), render công thức KaTeX, các phương án, đáp án đúng và lời giải.
  - Nút thêm mới, chỉnh sửa, xóa câu hỏi ngân hàng.
  - Kiểm tra `pnpm run typecheck`.

- [x] **3.4. Modal Import Word vào Ngân hàng:**
  - Xây dựng `BankWordImportModal`: Cho phép kéo thả file Word, chọn Khối - Môn - Chương - Bài mặc định (nếu trong file không có nhãn).
  - Hiển thị bảng xem trước các câu hỏi đã nhận diện được kèm nhãn mức độ và bài học trước khi xác nhận lưu vào kho.
  - Kiểm tra `pnpm run typecheck`.

---

## Giai đoạn 4: Giao diện Ma trận Đề thi & Tích hợp Quizizz / Exam

- [x] **4.1. Modal Cấu hình Ma trận Đề thi (`MatrixImportModal`):**
  - Nằm trong tab **Kho đề** (`QuestionBankTab` hiện tại).
  - Giao diện chọn bài học $\rightarrow$ Bảng lưới 2 chiều (Bài học $\times$ 4 Mức độ).
  - Tích hợp gọi API `/api/bank/matrix-stats` để hiện số câu sẵn có trong từng ô `[ Cần lấy ] / [ Sẵn có ]`.
  - Logic validate cảnh báo viền đỏ khi nhập quá số câu trong kho.
  - Hàng tổng kết tính tổng số câu và tỷ lệ % tự động.
  - Kiểm tra `pnpm run typecheck`.

- [x] **4.2. Xem trước kết quả bốc đề & Đổi câu tương đương (Review & Swap):**
  - Modal phụ hoặc bước xem trước danh sách câu vừa bốc.
  - Hỗ trợ nút 🔄 Đổi câu khác cùng mức độ và bài học nếu giáo viên chưa ưng ý.
  - Nút xác nhận lưu vào Bộ đề (`question_sets`).
  - Kiểm tra `pnpm run typecheck`.

- [x] **4.3. Tích hợp Trực tiếp với Quizizz (`quiz-live`) & Kỳ thi (`exam`):**
  - Kiểm tra luồng sử dụng: Bộ đề vừa tạo từ ma trận lập tức xuất hiện trong dropdown chọn đề của hoạt động `quiz-live` (chế độ Quizizz) và `exam`.
  - Kiểm tra khởi chạy phòng chơi trực tiếp với đề thi vừa sinh.
  - Kiểm tra `pnpm run typecheck`.
