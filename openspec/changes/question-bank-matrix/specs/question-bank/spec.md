# Đặc tả Kỹ thuật: Ngân hàng Câu hỏi & Ma trận Đề thi (Question Bank & Exam Matrix)

## 1. Tổng quan Năng lực (Capability Overview)

Module cung cấp khả năng quản lý kho câu hỏi tập trung có cấu trúc phân cấp chặt chẽ theo chương trình giáo dục phổ thông, gắn nhãn mức độ nhận thức của Bộ GD&ĐT, và công cụ ma trận để tạo đề kiểm tra hoặc tạo bài Quizizz/Kahoot tự động theo số lượng mong muốn.

---

## 2. Các Yêu cầu & Kịch bản Chi tiết (Requirements & Scenarios)

### Yêu cầu 1: Phân cấp Kiến thức & Quản lý Câu hỏi trong Ngân hàng

Hệ thống PHẢI cho phép lưu trữ và tổ chức câu hỏi theo cấu trúc phân cấp cố định: `Khối (1-12) → Môn học → Chương → Bài học`.

- **Kịch bản 1.1: Thêm mới câu hỏi vào Ngân hàng**
  - **Giả sử:** Giáo viên đang ở màn hình Quản lý Ngân hàng câu hỏi.
  - **Khi:** Giáo viên chọn Khối 12, Môn Toán, nhập Chương "Chương 1: Khảo sát hàm số", Bài "Bài 1: Tính đơn điệu", chọn mức độ "Thông hiểu (TH)" và nhập nội dung câu hỏi trắc nghiệm `mcq4`.
  - **Thì:** Hệ thống lưu câu hỏi vào bảng `bank_questions` với đầy đủ metadata phân loại và trả về bản ghi vừa tạo.

- **Kịch bản 1.2: Lọc và duyệt cây thư mục bài học**
  - **Giả sử:** Giáo viên đã nạp nhiều câu hỏi vào ngân hàng.
  - **Khi:** Giáo viên chọn Khối 12, Môn Toán trên thanh lọc.
  - **Thì:** Hệ thống hiển thị cây danh mục các Chương và Bài học kèm số lượng câu hỏi hiện có trong từng bài (ví dụ: _Bài 1: Tính đơn điệu (25 câu)_).

---

### Yêu cầu 2: Bốn Mức độ Nhận thức Chuẩn Bộ GD&ĐT

Hệ thống PHẢI áp dụng cố định 4 mức độ nhận thức:

1. `nb` - Nhận biết (Recognition / Knowledge)
2. `th` - Thông hiểu (Comprehension / Understanding)
3. `vd` - Vận dụng (Application)
4. `vdc` - Vận dụng cao (High-level Application / Advanced)

- **Kịch bản 2.1: Gán và hiển thị mức độ nhận thức**
  - **Khi:** Giáo viên xem danh sách câu hỏi trong một bài học.
  - **Thì:** Mỗi câu hỏi hiển thị huy hiệu (badge) màu sắc rõ ràng tương ứng:
    - `[NB] Nhận biết`: Màu xanh dương (`#3B82F6`)
    - `[TH] Thông hiểu`: Màu xanh lá (`#10B981`)
    - `[VD] Vận dụng`: Màu cam vàng (`#F59E0B`)
    - `[VDC] Vận dụng cao`: Màu đỏ tím (`#EF4444`)
  - **Và:** Giáo viên có thể bấm các nút lọc trên đầu để chỉ xem câu hỏi thuộc mức độ cụ thể.

---

### Yêu cầu 3: Nhập Câu hỏi Thông minh từ File Word (.docx)

Hệ thống PHẢI hỗ trợ phân tích file Word có chứa các thẻ nhận diện phân loại bài học và mức độ nhận thức.

- **Kịch bản 3.1: Nhập file Word có nhãn mức độ**
  - **Giả sử:** File Word chứa nội dung dạng:
    ```text
    [Chương: Chương 1. Hàm số]
    [Bài: Bài 1. Tính đơn điệu]
    [NB] Câu 1. Cho hàm số y = f(x)...
    A. Đồng biến    B. Nghịch biến    C. Không đổi    D. Tuần hoàn
    [TH] Câu 2. Cho bảng biến thiên...
    ```
  - **Khi:** Giáo viên tải file lên qua modal Import Word.
  - **Thì:** Hệ thống tự động bóc tách từng câu hỏi, gán đúng `chapter = 'Chương 1. Hàm số'`, `lesson = 'Bài 1. Tính đơn điệu'`, và `difficulty = 'nb'` cho câu 1, `difficulty = 'th'` cho câu 2.

- **Kịch bản 3.2: Nhập file Word không có nhãn cấu trúc**
  - **Giả sử:** File Word chỉ chứa các câu hỏi `Câu 1`, `Câu 2` mà không có nhãn `[Chương]` hoặc `[Bài]`.
  - **Khi:** Giáo viên chọn trước Khối, Môn, Chương, Bài trên giao diện trước khi bấm Tải lên.
  - **Thì:** Toàn bộ câu hỏi trong file sẽ được tự động gán vào Chương và Bài đã chọn trên giao diện.

---

### Yêu cầu 4: Bảng Ma trận Đề thi & Kiểm soát Số lượng Câu hỏi

Tại Kho đề (`Question Sets`), hệ thống PHẢI cung cấp giao diện bảng ma trận 2 chiều để cấu hình số lượng câu hỏi cần bốc cho từng bài học theo từng mức độ.

- **Kịch bản 4.1: Hiển thị số lượng câu sẵn có trong kho (Available Counts)**
  - **Khi:** Giáo viên tích chọn 2 bài học (Bài 1 và Bài 2) trong modal Ma trận.
  - **Thì:** Hệ thống gửi truy vấn `matrix-stats` và hiển thị bảng lưới với các ô:
    - Hàng: Từng bài học được chọn.
    - Cột: 4 mức độ (NB, TH, VD, VDC).
    - Nội dung mỗi ô: Hiển thị ô nhập `[ Cần lấy ]` kèm nhãn số lượng tối đa hiện có trong kho `/ [Sẵn có]`.

- **Kịch bản 4.2: Cảnh báo nhập quá số lượng trong kho**
  - **Khi:** Tại ô Bài 1 - Vận dụng cao (VDC), trong kho chỉ có 2 câu, nhưng giáo viên nhập số lượng là `3`.
  - **Thì:** Ô nhập chuyển sang viền đỏ, hiển thị thông báo lỗi "Vượt quá số câu có sẵn trong kho (tối đa 2 câu)", và nút "Sinh đề" bị vô hiệu hóa (disabled).

- **Kịch bản 4.3: Tính tổng số câu và cơ cấu tỷ lệ tự động**
  - **Khi:** Giáo viên thay đổi số lượng ở bất kỳ ô nào trong ma trận.
  - **Thì:** Hàng "Tổng cộng" ở đáy bảng tự động cập nhật tổng số câu và tỷ lệ phần trăm của từng mức độ (ví dụ: _NB: 4 câu (40%), TH: 3 câu (30%), VD: 2 câu (20%), VDC: 1 câu (10%) - Tổng: 10 câu_).

---

### Yêu cầu 5: Thuật toán Sinh đề Ngẫu nhiên & Snapshot Bất biến

Hệ thống PHẢI bốc ngẫu nhiên các câu hỏi thỏa mãn đúng ma trận và tạo ra một Bộ đề độc lập.

- **Kịch bản 5.1: Sinh đề và xem trước (Preview & Swap)**
  - **Khi:** Giáo viên cấu hình xong ma trận hợp lệ và bấm nút "Sinh đề".
  - **Thì:** Hệ thống bốc ngẫu nhiên đúng số lượng câu từ `bank_questions` theo từng ô `(lesson, difficulty)`.
  - **Và:** Hiển thị danh sách câu hỏi đã bốc cho giáo viên xem trước.
  - **Và:** Cung cấp nút 🔄 "Đổi câu khác" cạnh mỗi câu: Khi bấm, hệ thống sẽ bốc một câu hỏi khác trong kho cùng bài và cùng mức độ đó để thay thế.

- **Kịch bản 5.2: Tạo Bộ đề độc lập (Snapshot)**
  - **Khi:** Giáo viên xác nhận "Đưa vào Bộ đề".
  - **Thì:** Hệ thống copy toàn bộ nội dung câu hỏi sang bảng `questions` gắn với một `setId` mới trong bảng `question_sets`.
  - **Và:** Mọi thao tác sửa/xóa câu hỏi trong `bank_questions` sau này KHÔNG làm thay đổi nội dung của bộ đề thi vừa tạo.

---

### Yêu cầu 6: Tích hợp với Hoạt động Quizizz / Kahoot (`quiz-live`) & Kỳ thi (`exam`)

Bộ đề tạo từ ma trận PHẢI có khả năng đưa ngay vào phòng chơi trực tiếp hoặc kỳ thi trực tuyến.

- **Kịch bản 6.1: Khởi chạy Quizizz từ Bộ đề Ma trận**
  - **Khi:** Giáo viên chuyển sang tab Phiên chơi (`ActivityPanel`) và chọn hoạt động `quiz-live`.
  - **Và:** Chọn Bộ đề vừa được tạo từ ma trận, chọn chế độ chơi `quizizz`.
  - **Thì:** Toàn bộ câu hỏi trong bộ đề được nạp vào bài Quiz, học sinh tham gia bằng điện thoại có thể bắt đầu làm bài tự do theo tốc độ cá nhân.
