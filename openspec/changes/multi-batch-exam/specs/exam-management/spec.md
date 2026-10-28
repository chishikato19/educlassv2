# Đặc tả yêu cầu: Quản lý Kỳ thi & Tổ chức Thi theo ca (Multi-batch Exam)

## 1. Yêu cầu hệ thống (Requirements)

### REQ-1: Quản lý Thực thể Kỳ thi Lâu dài (Persistent Exam Entity)

- Hệ thống phải cho phép Giáo viên tạo và lưu trữ Kỳ thi độc lập với các phiên học trực tiếp.
- Mỗi kỳ thi phải gắn với một Lớp học (`classId`), một Bộ đề câu hỏi (`questionSetId` hoặc danh sách câu hỏi snapshot), và cấu hình làm bài (`durationMinutes`, `shuffleQuestions`, `shuffleOptions`, `showScoreAfterSubmit`).
- Trạng thái của Kỳ thi gồm:
  - `ready`: Đã tạo, sẵn sàng phát đề.
  - `in_progress`: Đang tổ chức thi trong một phiên học cụ thể.
  - `waiting_next_batch`: Tạm dừng giữa các ca thi, đang chờ ca tiếp theo (ví dụ: Ca 1 thi xong, chờ Ca 2).
  - `finished`: Đã kết thúc toàn bộ kỳ thi, đóng sổ điểm.

### REQ-2: Điều phối Ca thi qua Phiên học (Cross-session Batch Dispatching)

- Khi giáo viên đang có một phiên học mở (`activeSession`), giáo viên có thể vào Tab Báo cáo kỳ thi và chọn một kỳ thi đang ở trạng thái `ready` hoặc `waiting_next_batch` để **"Mở ca thi trong phiên hiện tại"**.
- Hệ thống liên kết kỳ thi với phiên hiện tại (`activeSessionId = session.id`) và chuyển trạng thái sang `in_progress`.
- Trong phiên đó, hoạt động thi sẽ tự động khởi chạy với cấu hình và câu hỏi của kỳ thi được chọn.

### REQ-3: Khóa Danh tính Học sinh Đã thi & Chống thi trùng

- Khi kỳ thi được kích hoạt trong một phiên, danh sách học sinh của lớp được phân định rõ 2 nhóm:
  - **Nhóm đã thi (Completed):** Đã nộp bài ở các ca trước $\rightarrow$ Hiển thị nhãn "Đã thi (Điểm: X)" trên giao diện chọn tên hoặc danh sách lớp. Bị vô hiệu hóa (disabled), không thể bấm vào để làm bài lại.
  - **Nhóm chưa thi (Pending):** Chưa làm bài $\rightarrow$ Có thể bấm chọn tên, vào làm bài với đầy đủ thời gian quy định.
- Nếu học sinh cố tình gửi intent làm bài khi đã có bản ghi nộp bài, máy chủ phải từ chối với mã lỗi `ALREADY_SUBMITTED`.

### REQ-4: Tích hợp Kết quả & Tự động Gom Điểm số (Unified Results Aggregation)

- Mỗi học sinh khi hoàn thành bài thi sẽ được lưu bản ghi vào bảng `exam_records` gắn trực tiếp với `examId`.
- Dữ liệu lưu trữ gồm: `studentId`, `studentName`, `score`, `percentage`, `correctCount`, `totalQuestions`, `answersJson`, `gradedResultJson`, `batchNumber` (ca mấy), `submittedAt`.
- Điểm số của Ca 1, Ca 2 và các ca sau được tự động tích hợp vào một bảng tổng hợp duy nhất của kỳ thi mà không bị chia cắt theo phiên.

### REQ-5: Báo cáo Kỳ thi Tổng hợp & Xuất Excel

- Tab Báo cáo kỳ thi phải hiển thị:
  - Tiến độ thi tổng thể: Số học sinh đã thi / Tổng sĩ số lớp (ví dụ `20/40 HS (50%)`).
  - Danh sách bảng điểm cả lớp từ STT 1 đến N (sắp xếp theo tên hoặc STT danh sách lớp).
  - Phổ điểm trực quan (Tốt, Khá, Đạt, Chưa đạt).
  - Tỉ lệ trả lời đúng/sai của từng câu hỏi trong đề thi.
- Hỗ trợ xuất file Excel chuẩn bảng điểm gồm: STT, Họ và tên, Mã học sinh, Điểm số, Số câu đúng, Ca thi, Thời gian nộp bài.

---

## 2. Kịch bản sử dụng (Scenarios)

### Kịch bản 1: Tổ chức Ca 1 cho 20 học sinh đầu tiên

- **Given:** Giáo viên mở phiên học Tiết 1 cho Lớp 8A (40 học sinh, phòng máy có 20 máy).
- **When:** Giáo viên phát động kỳ thi "Kiểm tra 1 tiết Toán" thời lượng 45 phút. 20 học sinh Ca 1 ngồi vào máy, chọn tên của mình và làm bài.
- **Then:** 20 học sinh nộp bài thành công, điểm số được ghi nhận vào `exam_records`.
- **When:** Hết Tiết 1, giáo viên bấm "Đóng ca 1 / Tạm dừng kỳ thi".
- **Then:** Kỳ thi chuyển sang trạng thái `waiting_next_batch`, tiến độ ghi nhận: `20/40 học sinh đã thi`. Giáo viên đóng phiên học Tiết 1 an toàn.

### Kịch bản 2: Tiếp tục Ca 2 cho 20 học sinh còn lại ở Tiết 2

- **Given:** Sang Tiết 2 (hoặc hôm sau), giáo viên mở phiên học mới (Mã lớp mới).
- **When:** Giáo viên vào tab **Báo cáo kỳ thi**, chọn bài thi "Kiểm tra 1 tiết Toán" và bấm **"Mở ca tiếp theo trong phiên này"**.
- **Then:** Kỳ thi được nạp vào phiên Tiết 2.
- **When:** 20 học sinh Ca 2 ngồi vào máy, truy cập cổng học sinh.
- **Then:** Trên màn hình chọn tên, 20 bạn Ca 1 hiển thị trạng thái xám mờ "Đã hoàn thành". 20 bạn Ca 2 chọn tên của mình và bắt đầu làm bài trọn vẹn 45 phút.
- **When:** 20 bạn Ca 2 nộp bài và giáo viên bấm "Hoàn tất kỳ thi".
- **Then:** Kỳ thi chuyển sang `finished`. Tiến độ đạt `40/40 học sinh (100%)`.

### Kịch bản 3: Giáo viên xuất báo cáo tổng hợp nộp tổ chuyên môn

- **Given:** Kỳ thi đã kết thúc với đầy đủ dữ liệu của cả Ca 1 và Ca 2.
- **When:** Giáo viên mở tab **Báo cáo kỳ thi** và bấm **"Xuất Excel"**.
- **Then:** Hệ thống tạo file Excel `.xlsx` gồm toàn bộ 40 học sinh của lớp, đầy đủ điểm số, xếp loại và thời gian thi, không thiếu sót bất kỳ học sinh nào của cả 2 ca.
