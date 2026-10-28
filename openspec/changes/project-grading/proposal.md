# Đề xuất: Tính năng Chấm điểm Dự án Đa chiều & Quản lý Nhóm Lớp học

## 1. Bối cảnh & Vấn đề (Context & Motivation)

Trong phương pháp dạy học theo định hướng phát triển phẩm chất và năng lực (GDPT 2018), **Dạy học dự án (Project-Based Learning - PBL)** và hoạt động làm việc nhóm là hình thức tổ chức dạy học phổ biến. Một thách thức lớn của giáo viên là đánh giá kết quả dự án một cách công bằng, khách quan và toàn diện.

Mô hình đánh giá dự án chuẩn giáo dục hiện đại đòi hỏi **đánh giá đa chiều 360 độ**, kết hợp 4 nguồn dữ liệu:

1. **Điểm cá nhân tự đánh giá:** Học sinh tự chấm điểm mức độ tham gia, nỗ lực và đóng góp của bản thân.
2. **Điểm tổ trưởng/nhóm trưởng chấm thành viên:** Nhóm trưởng đánh giá trách nhiệm và mức độ hoàn thành nhiệm vụ của từng bạn trong nhóm.
3. **Điểm các nhóm khác chấm chéo:** Nhóm trưởng (đại diện nhóm) đánh giá sản phẩm, báo cáo và phần thuyết trình của các nhóm bạn.
4. **Điểm giáo viên chấm:** Giáo viên đánh giá chuyên môn cho toàn nhóm hoặc từng cá nhân.

### Thực tế phòng học tại Việt Nam và hạn chế hiện tại:

1. **Chưa có cấu trúc nhóm cố định theo lớp học:** Hiện tại EduClass v2 chỉ có chia nhóm tạm thời trong từng phiên học (`teams`). Khi giáo viên mở tiết học mới, thông tin nhóm bị mất, giáo viên phải tạo lại từ đầu.
2. **Thiếu công cụ chia nhóm linh hoạt:** Chưa có tính năng chia đều học sinh ngẫu nhiên vào 4 nhóm (hoặc N nhóm) và kéo thả di chuyển học sinh giữa các nhóm ngay trong phần quản lý lớp học.
3. **Chưa có module Chấm điểm dự án:** Chưa có cơ chế thu thập đồng thời 4 cột điểm, tính điểm tổng kết theo trọng số (%) tùy biến và xuất báo cáo tổng hợp.
4. **Học sinh dùng chung máy tính / thiết bị (Kiosk Mode):** Tại các phòng thực hành tin học hoặc khi học sinh dùng chung điện thoại/máy tính bàn trong lớp, học sinh cần chấm xong, bấm "Đổi người" để bạn khác ngồi vào máy chọn tên chấm tiếp mà không bị lộ kết quả hay lỗi token.

---

## 2. Mục tiêu (Goals)

1. **Quản lý Nhóm học sinh trong Lớp học (`ClassTab`):**
   - Hỗ trợ tạo và lưu danh sách nhóm cố định theo lớp học (mặc định 4 nhóm: Nhóm 1, Nhóm 2, Nhóm 3, Nhóm 4 hoặc tùy chỉnh).
   - Thuật toán **Chia ngẫu nhiên (chia đều)** toàn bộ học sinh trong lớp vào các nhóm.
   - Giao diện kéo thả hoặc chọn chuyển đổi học sinh qua lại giữa các nhóm mượt mà.
   - Chỉ định Nhóm trưởng (Leader) cho từng nhóm (hiển thị biểu tượng vương miện/ngôi sao ⭐).
2. **Module Hoạt động Chấm điểm Dự án (`@educlass/activity-project-grading`):**
   - Giáo viên mở hoạt động, bấm **"Lấy nhóm từ Lớp học"** để nạp ngay cơ cấu nhóm và nhóm trưởng sẵn có.
   - Cho phép cấu hình **Trọng số (%) cho 4 cột điểm** (Cá nhân $W_1$, Nội bộ $W_2$, Chéo $W_3$, Giáo viên $W_4$; $\sum = 100\%$).
   - Nhập điểm trực tiếp theo thang điểm 10 (bước nhảy 0.1) kèm ghi chú nhận xét tùy chọn.
   - **Chế độ chấm tự do (All-in-one / Parallel):** Học sinh, nhóm trưởng và giáo viên có thể vào chấm các mục thuộc quyền hạn của mình cùng một lúc mà không bị khóa pha tuần tự.
3. **Luồng đổi học sinh dùng chung thiết bị (Shared Device / Kiosk Mode):**
   - Học sinh chấm xong có nút bấm lớn: `[🔁 Hoàn thành & Đổi học sinh khác]`.
   - Hệ thống xóa token phiên của thiết bị, giữ lại mã lớp `joinCode`, chuyển về danh sách chọn tên để học sinh tiếp theo vào chấm ngay.
   - Đánh dấu học sinh đã chấm xong bằng huy hiệu xanh để tránh chọn nhầm.
4. **Bảng tổng hợp điểm thời gian thực & Xuất Excel:**
   - Bảng ma trận theo dõi tiến độ nộp điểm theo thời gian thực (Ai đã nộp, ai chưa).
   - Tự động tính điểm tổng kết có trọng số cho từng học sinh.
   - Hỗ trợ màn chiếu (ProjectorView) công bố vinh danh các nhóm xuất sắc.
   - Xuất file Excel bảng điểm chi tiết 4 cột + điểm tổng kết + nhận xét.

---

## 3. Phạm vi (Scope)

### Trong phạm vi (In-Scope):

- **Cơ sở dữ liệu (`packages/db`)**:
  - Thêm bảng `class_groups` (id, classId, name, orderIndex, leaderStudentId, createdAt).
  - Thêm trường `groupId` vào bảng `students` để liên kết học sinh với nhóm trong lớp.
- **Giao thức & DTO (`packages/protocol`)**:
  - DTO và schema cho quản lý nhóm lớp học (`ClassGroupDto`, `CreateClassGroupRequest`, `AssignGroupLeaderRequest`, `RandomizeGroupsRequest`).
  - DTO và schema cho hoạt động Chấm điểm Dự án (`ProjectGradingConfig`, `ProjectGradingState`, `ProjectGradingResult`).
- **Backend API & Realtime (`packages/server`)**:
  - CRUD nhóm lớp học, API chia nhóm ngẫu nhiên, API chuyển nhóm.
  - Tích hợp Activity plugin `@educlass/activity-project-grading` vào registry của server.
- **Giao diện Giáo viên (`apps/teacher-ui`)**:
  - Tab con Quản lý Nhóm trong `ClassTab`: Chia ngẫu nhiên, chuyển nhóm, gán nhóm trưởng.
  - Giao diện điều khiển hoạt động Chấm điểm dự án: Cài đặt trọng số, nhập điểm GV, bảng ma trận realtime, xuất Excel.
- **Giao diện Học sinh (`apps/student-ui`)**:
  - Phân quyền giao diện theo vai trò (Thành viên vs Nhóm trưởng).
  - Form nhập điểm trực quan (vùng chạm $\ge 48$px, slider hoặc ô nhập số to rõ).
  - Nút chuyển đổi tài khoản / đổi bạn khác vào chấm trên cùng thiết bị.

### Ngoài phạm vi (Out-of-Scope):

- Soạn thảo Rubric ma trận tiêu chí phức tạp nhiều cấp độ (chốt nhập điểm trực tiếp thang 10 kèm nhận xét).
- Chấm bài tập đính kèm file dung lượng lớn (hoạt động này tập trung vào khâu hội đồng chấm điểm và tổng hợp kết quả dự án).

---

## 4. Tác động kiến trúc (Architectural Impact)

- Tuân thủ nguyên tắc **D12** của EduClass v2: Module chấm điểm dự án là một plugin Activity độc lập `@educlass/activity-project-grading`, không sửa đổi logic lõi của máy chủ ngoài việc đăng ký registry.
- Tuân thủ luật phụ thuộc monorepo: `protocol` $\rightarrow$ `db` $\rightarrow$ `server` / `activities` $\rightarrow$ `apps`.
- Hoạt động hoàn toàn Offline trong mạng LAN nội bộ phòng máy tính trường học.
