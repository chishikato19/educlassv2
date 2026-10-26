# Danh sách Công việc Triển khai: Kỳ thi theo ca & Quản lý Báo cáo Kỳ thi

## Giai đoạn 1: Schema CSDL & Giao thức (Protocol & DB)

- [x] 1.1 **Cập nhật Schema Database (`packages/db`)**:
  - Thêm bảng `exams` và `exam_records` vào `packages/db/src/schema/index.ts`.
  - Tạo file migration tăng dần hoặc chạy sync migration bảo đảm SQLite schema được cập nhật an toàn.
  - Viết repository hoặc hàm truy vấn cơ bản cho `exams` và `exam_records`.

- [x] 1.2 **Định nghĩa DTO & Zod Schemas (`packages/protocol`)**:
  - Tạo `packages/protocol/src/exam-management.ts`: các schema `CreateExamRequest`, `ExamListItemDto`, `ExamDetailDto`, `StartExamBatchRequest`, `ExamRecordDto`.
  - Export trong `packages/protocol/src/index.ts`.

---

## Giai đoạn 2: Máy chủ Backend REST APIs (`packages/server`)

- [x] 2.1 **Xây dựng Route `/api/exams` (`packages/server/src/routes/exams.ts`)**:
  - `GET /api/exams`: Danh sách kỳ thi kèm thống kê tiến độ (`submittedCount / totalStudents`, `currentBatch`).
  - `POST /api/exams`: Tạo mới kỳ thi gắn với lớp học và bộ đề.
  - `GET /api/exams/:id`: Chi tiết kỳ thi, danh sách điểm toàn bộ học sinh trong lớp (cả đã thi và chưa thi).
  - `POST /api/exams/:id/start-batch`: Kích hoạt ca thi tiếp theo trong phiên đang mở của GV.
  - `POST /api/exams/:id/pause-batch`: Tạm dừng ca thi, chuyển sang trạng thái `waiting_next_batch`.
  - `POST /api/exams/:id/finish`: Đóng hoàn tất toàn bộ kỳ thi.

- [x] 2.2 **Xuất Excel Báo cáo Kỳ thi Tổng hợp**:
  - Bổ sung hàm xuất Excel bảng điểm kỳ thi trong `excel-service.ts`: gom đầy đủ tất cả học sinh trong lớp, điểm số, số câu đúng, ca thi, ngày nộp.
  - Endpoint `GET /api/exams/:id/export-excel`.

---

## Giai đoạn 3: Tích hợp Hoạt động Thi & Khóa Thí sinh Đã thi

- [x] 3.1 **Tích hợp Tự động Lưu Kết quả vào `exam_records`**:
  - Trong logic xử lý khi học sinh nộp bài thi (hoặc khi kết thúc hoạt động `exam`), nếu activity run gắn với `examId`, tự động ghi nhận bản ghi vào `exam_records` với `batchIndex` tương ứng.
  - Bảo đảm EXP vẫn được trao thưởng bình thường qua `ctx.grantReward`.

- [x] 3.2 **Cơ chế Khóa Học sinh Đã thi ở Ca trước (`Student UI & Gate`)**:
  - Khi ca thi bắt đầu trong phiên, danh sách học sinh đã thi (`completedStudentIds`) được gửi xuống hoặc kiểm tra khi chọn tên.
  - Học sinh đã nộp ở Ca 1 sẽ không thể bấm chọn tên để thi lại ở Ca 2.

---

## Giai đoạn 4: Giao diện Giáo viên Tab "Báo cáo kỳ thi" (`apps/teacher-ui`)

- [x] 4.1 **Tạo Tab `ExamReportsTab` trong Teacher UI**:
  - Thêm tab `exam-reports` vào thanh điều hướng chính (`App.tsx`).
  - Danh sách kỳ thi trực quan: thẻ kỳ thi, tiến độ thanh phần trăm (`20/40 HS (50%)`), huy hiệu ca thi.
  - Nút bấm điều khiển: `[▶ Mở ca tiếp theo trong phiên này]`, `[⏸ Tạm dừng ca thi]`, `[Hoàn tất kỳ thi]`.

- [x] 4.2 **Modal Xem Báo cáo & Bảng điểm Chi tiết**:
  - Bảng điểm danh sách lớp từ STT 1 đến N: Họ tên, điểm, số câu đúng, ca thi (Ca 1 / Ca 2), thời gian nộp.
  - Biểu đồ phân bố phổ điểm đơn giản (Tốt, Khá, Đạt, Chưa đạt).
  - Nút `[📥 Tải bảng điểm Excel]`.

- [x] 4.3 **Modal Tạo Kỳ thi Mới**:
  - Form chọn lớp học, chọn bộ đề từ Kho đề, đặt thời lượng thi (phút), tùy chọn xáo đề / xáo đáp án.

---

## Giai đoạn 5: Kiểm tra & Nghiệm thu (Verification)

- [x] 5.1 **Kiểm tra Typecheck toàn dự án (`pnpm run typecheck`)**:
  - Bảo đảm không lỗi TypeScript, không import chéo, không gãy build.
- [x] 5.2 **Kiểm tra luồng thực tế (Simulation Test)**:
  - Tạo kỳ thi 40 học sinh $\rightarrow$ Mở Ca 1 với 20 em $\rightarrow$ Nộp bài $\rightarrow$ Tạm dừng ca 1 $\rightarrow$ Mở Ca 2 ở phiên mới $\rightarrow$ Kiểm tra 20 em Ca 1 bị khóa $\rightarrow$ 20 em Ca 2 nộp bài $\rightarrow$ Kiểm tra bảng điểm đủ 40 em $\rightarrow$ Xuất file Excel.
