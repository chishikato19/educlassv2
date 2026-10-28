# Đề xuất: Tính năng Kỳ thi theo ca & Quản lý Báo cáo Kỳ thi lâu dài

## 1. Bối cảnh & Vấn đề (Context & Motivation)

Hiện tại trong EduClass v2:

- Hoạt động `ExamActivity` đang chạy hoàn toàn phụ thuộc vào vòng đời của một phiên học trực tiếp (`session`). Dữ liệu làm bài được lưu tạm thời trong RAM máy chủ giáo viên (`activeExamConfigs`), và chỉ được đóng gói vào `session_reports` dưới dạng một khối JSON snapshot gộp khi phiên học kết thúc.
- **Thực tế trường học:** Tại hầu hết các trường phổ thông ở Việt Nam, phòng thực hành tin học chỉ có khoảng 20 máy tính, trong khi sĩ số lớp học thường từ 35 - 45 học sinh. Do đó, giáo viên bắt buộc phải **chia ca thi**:
  - **Tiết 1 (Ca 1):** 20 học sinh đầu tiên vào máy, làm bài trọn vẹn và nộp bài.
  - **Tiết 2 hoặc ngày hôm sau (Ca 2):** 20 học sinh còn lại ngồi vào máy, tiếp tục bài kiểm tra đó.
- **Hạn chế hiện tại:**
  1. Khi hết Tiết 1, giáo viên đóng phiên thì phiên đó kết thúc. Sang Tiết 2 mở phiên mới, kỳ thi bị tách rời thành 2 đợt chạy độc lập, sinh ra 2 báo cáo riêng biệt. Giáo viên phải mất thời gian ghép thủ công 2 file Excel điểm số.
  2. Chưa có một trung tâm quản lý (Tab Báo cáo kỳ thi riêng) để theo dõi tiến độ thi của cả lớp (ví dụ: `20/40 HS đã nộp (50%)`), tạm dừng kỳ thi để chờ ca tiếp theo, và tiếp tục phát đề cho ca sau trong một phiên học mới.
  3. Thiếu cơ chế ngăn chặn học sinh Ca 1 thi lại lần 2 hoặc thi hộ bạn khác ở Ca 2.

## 2. Mục tiêu (Goals)

1. **Tab Báo cáo kỳ thi chuyên biệt (Teacher UI):**
   - Lưu trữ danh sách toàn bộ các kỳ thi đã tạo, đang tổ chức, chờ ca tiếp theo, hoặc đã hoàn tất.
   - Cung cấp cái nhìn tổng quan về tiến độ thi của cả lớp (ví dụ: `20/40 học sinh đã thi`).
   - Cung cấp nút hành động: `[▶ Mở ca tiếp theo trong phiên này]`, `[📊 Xem bảng điểm chi tiết]`, `[📥 Xuất Excel]`.
2. **Cơ chế Kỳ thi theo ca (Multi-batch / Cross-session Exam):**
   - Một kỳ thi có thể kéo dài qua nhiều phiên học (`sessions`), gom chung toàn bộ kết quả của các ca vào một kỳ thi duy nhất (`examId`).
   - Từng học sinh làm bài trọn vẹn một mạch, nộp bài là chốt điểm.
   - Khi ca 1 hoàn tất, kỳ thi chuyển sang trạng thái chờ ca kế tiếp (`waiting_next_batch`).
   - Khi mở ca 2 ở phiên mới: Những học sinh đã thi ở Ca 1 bị khóa cứng danh tính trên giao diện chọn tên, chỉ những học sinh chưa thi mới được vào làm bài.
3. **Báo cáo tổng hợp tập trung (Single Source of Truth):**
   - Tự động tích hợp điểm số của tất cả các ca (Ca 1 + Ca 2 + Ca bổ sung) vào một bảng điểm danh sách lớp từ STT 1 đến 40.
   - Xuất ra 1 file Excel duy nhất chuẩn mẫu nộp tổ chuyên môn.
   - Biểu đồ phổ điểm và ma trận phân tích câu hỏi dựa trên dữ liệu của toàn bộ học sinh trong lớp.

## 3. Phạm vi (Scope)

- **Trong phạm vi (In-Scope):**
  - Schema CSDL mới: Bảng `exams` và `exam_records` lưu trữ độc lập với `sessions`.
  - Backend API: REST endpoints quản lý kỳ thi (tạo, cập nhật trạng thái, gắn kỳ thi vào phiên hiện tại, lấy tiến độ, xuất Excel).
  - Giao diện Giáo viên: Bổ sung Tab `Kỳ thi & Báo cáo` (`TeacherTab = 'exam-reports'`), tích hợp bảng điểm, phổ điểm, ma trận phân tích và xuất Excel.
  - Tích hợp Phiên học & Học sinh: Khóa học sinh đã nộp bài, cho phép học sinh chưa thi làm bài, đồng bộ kết quả trực tiếp vào kỳ thi.
- **Ngoài phạm vi (Out-of-Scope):**
  - Tạm dừng đồng hồ giữa chừng của từng học sinh (học sinh khi đã vào máy sẽ làm một mạch trọn vẹn cho tới khi nộp bài hoặc hết giờ).
  - Chấm tự luận bằng AI (giữ nguyên các dạng câu hỏi hiện có: trắc nghiệm 4 lựa chọn, đúng/sai, nhóm đúng/sai BGD, điền khuyết ngắn).

## 4. Tác động kiến trúc (Architectural Impact)

- Không phá vỡ kiến trúc plugin Activity hiện tại (`@educlass/activity-exam` vẫn chịu trách nhiệm giao diện làm bài thi của HS).
- Nâng cấp tầng dữ liệu: Tách thực thể bài thi lâu dài (`exams`) ra khỏi thực thể phiên tương tác ngắn hạn (`sessions`).
- Tuân thủ quy tắc phụ thuộc: `protocol` (schema/DTO) $\rightarrow$ `db` (bảng mới) $\rightarrow$ `server` (routes mới) $\rightarrow$ `teacher-ui` & `student-ui`.
