# Đề xuất: Tính năng Ngân hàng Câu hỏi & Sinh đề theo Ma trận Kiến thức

## 1. Bối cảnh & Vấn đề (Context & Motivation)

Hiện tại trong EduClass v2:
- Câu hỏi chỉ tồn tại gắn liền bên trong từng "Bộ đề" đơn lẻ (`question_sets` 1-N `questions`). Nếu giáo viên muốn sử dụng lại câu hỏi cho đề khác, họ phải sao chép hoặc nhập lại từ đầu.
- **Thực tế giảng dạy phổ thông tại Việt Nam:**
  - Giáo viên xây dựng và tích lũy câu hỏi theo **phân phối chương trình môn học**: Khối lớp $\rightarrow$ Môn học $\rightarrow$ Chương / Chuyên đề $\rightarrow$ Bài học cụ thể.
  - Chuẩn khảo thí của Bộ GD&ĐT quy định 4 mức độ nhận thức cố định: **Nhận biết (NB)**, **Thông hiểu (TH)**, **Vận dụng (VD)**, **Vận dụng cao (VDC)**.
  - Khi ra đề kiểm tra (15 phút, 1 tiết, giữa kỳ, học kỳ) hoặc tổ chức ôn tập đầu giờ, giáo viên luôn lập **Ma trận đề thi**: Ví dụ: *Bài 1 lấy 3 câu TH, 2 câu NB; Bài 2 lấy 2 câu NB, 1 câu VD...*
- **Hạn chế hiện tại:**
  1. Thiếu một **Ngân hàng câu hỏi tập trung (Item Bank)** để lưu trữ, gắn nhãn bài học và phân loại 4 mức độ nhận thức độc lập với các bộ đề thi.
  2. Không có công cụ **Ma trận đề thi** để giáo viên trích xuất hoặc sinh đề ngẫu nhiên từ ngân hàng theo số lượng câu định sẵn của từng bài và mức độ.
  3. Hoạt động đấu trí trực tiếp **Quiz Live (chế độ Quizizz / Kahoot)** và **Kỳ thi (Exam)** đang phải phụ thuộc vào việc soạn sẵn từng bộ đề thủ công, chưa thể chọn nhanh câu hỏi từ ngân hàng bài học để khởi chạy ngay trong lớp học.

## 2. Mục tiêu (Goals)

1. **Ngân hàng câu hỏi tập trung (Centralized Item Bank):**
   - Phân cấp cố định: `Khối (1-12) → Môn học → Chương → Bài học`.
   - Phân loại chuẩn 4 mức độ của Bộ GD&ĐT: `nb` (Nhận biết), `th` (Thông hiểu), `vd` (Vận dụng), `vdc` (Vận dụng cao).
   - Lưu trữ trong bảng CSDL chuyên biệt `bank_questions`, hỗ trợ đầy đủ các dạng câu hỏi hiện có của `@educlass/question-kit` (`mcq4`, `tf`, `tf_group`, `short`), công thức $\LaTeX$ KaTeX và hình ảnh.
2. **Nhập / Xuất câu hỏi thông minh (Smart Word Import):**
   - Mở rộng bộ phân tích Word (.docx) để tự động nhận diện nhãn mức độ: `[NB]`, `[TH]`, `[VD]`, `[VDC]`.
   - Tự động nhận diện cấu trúc bài học qua tiêu đề `[Chương: ...]` và `[Bài: ...]`, hoặc cho phép chọn trực tiếp trên giao diện import.
3. **Bộ sinh đề theo Ma trận (Matrix Exam Generator):**
   - Trong Kho đề (`Question Sets`), giáo viên có thể mở modal **"Nhập theo Ma trận từ Ngân hàng"**.
   - Chọn các bài học tham gia đề thi $\rightarrow$ Hiển thị **bảng ma trận lưới 2 chiều** (Bài học $\times$ 4 Mức độ).
   - Tự động đếm số câu sẵn có trong kho, cho phép giáo viên nhập số lượng câu cần bốc cho từng ô.
   - Thuật toán bốc ngẫu nhiên (hoặc chọn lọc thủ công) $\rightarrow$ Snapshot câu hỏi sang Bộ đề thi mới (`question_sets`).
4. **Tích hợp tức thì với Quizizz / Kahoot & Kỳ thi:**
   - Bộ đề sinh ra từ ma trận có thể dùng ngay cho hoạt động `quiz-live` (chế độ chơi tự do Quizizz hoặc đồng bộ Kahoot) và `exam` (Kỳ thi online).

## 3. Phạm vi (Scope)

- **Trong phạm vi (In-Scope):**
  - **Database & Protocol**:
    - Schema CSDL mới: Bảng `bank_questions` trong SQLite (Drizzle ORM) kèm chỉ mục đa cột tối ưu cho việc truy vấn ma trận.
    - Zod schemas / DTOs trong `packages/protocol`: `BankQuestion`, `DifficultyLevel` (`nb` | `th` | `vd` | `vdc`), `MatrixConfig`, `MatrixStatsResponse`.
  - **Backend API (packages/server)**:
    - CRUD câu hỏi ngân hàng (`/api/bank/questions`).
    - API thống kê số lượng câu sẵn có theo cây bài học và mức độ (`/api/bank/matrix-stats`).
    - API sinh đề theo ma trận và tự động lưu vào bộ đề (`/api/bank/generate-set`).
  - **Question-Kit (packages/question-kit)**:
    - Mở rộng Word parser để bóc tách nhãn `[NB]`, `[TH]`, `[VD]`, `[VDC]` và metadata chương/bài.
  - **Teacher UI (apps/teacher-ui)**:
    - Giao diện Quản lý Ngân hàng câu hỏi: Cây thư mục Khối - Môn - Chương - Bài, bộ lọc mức độ, tìm kiếm, xem trước, sửa/xóa câu hỏi.
    - Modal Nhập từ Word vào Ngân hàng.
    - Modal "Tạo đề theo Ma trận" trong Kho đề: Bảng lưới ma trận nhập số lượng câu, cảnh báo vượt ngưỡng, xem trước danh sách câu bốc và đổi câu tương đương.
- **Ngoài phạm vi (Out-of-Scope):**
  - Tự động sinh nội dung câu hỏi bằng AI/LLM (giáo viên tự soạn hoặc nhập từ file Word đề cương có sẵn).
  - Phân quyền chia sẻ ngân hàng câu hỏi dùng chung giữa các trường học qua mạng Internet (hệ thống chạy Localhost / LAN offline theo D1-D3).

## 4. Tác động kiến trúc (Architectural Impact)

- **Tính bất biến của đề thi (Exam Immutability):** Tách biệt rành mạch giữa `bank_questions` (kho câu hỏi gốc) và `question_sets` + `questions` (bộ đề thi). Khi sinh đề, câu hỏi được copy snapshot sang bộ đề, đảm bảo chỉnh sửa trong ngân hàng sau này không làm sai lệch kết quả các bài kiểm tra đã lưu.
- **Tuân thủ phân lớp gói (PLAN D9, Mục 2):**
  - `packages/protocol`: Khai báo enum và schema Zod không phụ thuộc gói khác.
  - `packages/db`: Bổ sung migration bảng `bank_questions`.
  - `packages/question-kit`: Mở rộng parser Word thuần túy không đụng DB.
  - `packages/server`: Cung cấp REST endpoints cho teacher-ui.
  - `apps/teacher-ui`: Giao diện trực quan tuân thủ design tokens của `ui-kit`.
