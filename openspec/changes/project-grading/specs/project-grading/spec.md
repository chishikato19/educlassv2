# Đặc tả Kỹ thuật: Chấm điểm Dự án Đa chiều & Quản lý Nhóm Lớp học

## Capability: `project-grading`

Đặc tả này quy định các yêu cầu chức năng, phi chức năng và tiêu chí nghiệm thu (Acceptance Criteria) cho hệ thống Quản lý Nhóm lớp học và Hoạt động Chấm điểm Dự án đa chiều.

---

### 1. Quản lý Nhóm Học sinh theo Lớp học (`class-groups`)

#### Requirement 1.1: Cấu trúc Nhóm cố định theo Lớp
- Hệ thống MUST cho phép mỗi lớp học tạo và lưu trữ danh sách các nhóm/tổ học tập (`class_groups`).
- Mặc định khởi tạo gợi ý 4 nhóm: `Nhóm 1`, `Nhóm 2`, `Nhóm 3`, `Nhóm 4`.
- Mỗi nhóm MUST có tên (`name`), thứ tự (`orderIndex`) và tối đa một nhóm trưởng (`leaderStudentId`).

#### Requirement 1.2: Chia ngẫu nhiên (Chia đều)
- Hệ thống MUST cung cấp tính năng chia ngẫu nhiên toàn bộ học sinh trong lớp vào $N$ nhóm (mặc định $N = 4$).
- Thuật toán MUST bảo đảm số lượng học sinh giữa các nhóm chênh lệch không quá 1 học sinh:
  $$|Count(Group_A) - Count(Group_B)| \le 1$$
- Nếu một nhóm chưa có nhóm trưởng, hệ thống MAY tự động chỉ định ngẫu nhiên 1 học sinh làm nhóm trưởng tạm thời để hỗ trợ giáo viên.

#### Requirement 1.3: Di chuyển Học sinh giữa các Nhóm
- Giáo viên MUST có thể di chuyển bất kỳ học sinh nào từ Nhóm hiện tại sang Nhóm khác thông qua menu dropdown hoặc kéo thả.
- Khi một học sinh đang là Nhóm trưởng bị chuyển sang nhóm khác, vị trí nhóm trưởng của nhóm cũ sẽ chuyển về trống (`null`), tránh lỗi logic 1 học sinh làm nhóm trưởng ở 2 nhóm.

#### Requirement 1.4: Chỉ định Nhóm trưởng
- Giáo viên MUST có thể chỉ định hoặc hủy vai trò Nhóm trưởng cho bất kỳ học sinh nào trong nhóm bằng 1 thao tác chạm/click.
- Trong cùng một nhóm, khi chỉ định một học sinh mới làm nhóm trưởng, học sinh cũ sẽ tự động trở về thành viên bình thường.

---

### 2. Hoạt động Chấm điểm Dự án (`activity-project-grading`)

#### Requirement 2.1: Khởi tạo & Cấu hình Phiên chấm
- Giáo viên MUST có thể khởi chạy hoạt động Chấm điểm Dự án từ tab `Tiện ích / Hoạt động`.
- Hệ thống MUST cung cấp nút bấm **"Lấy nhóm từ Lớp học"**:
  - Khi bấm, tự động đồng bộ danh sách nhóm và nhóm trưởng của lớp trong phiên học hiện tại vào cấu hình hoạt động.
- Giáo viên MUST có thể tùy chỉnh trọng số (%) của 4 cột điểm:
  - Điểm cá nhân tự chấm ($W_{self}$, mặc định 10%)
  - Điểm tổ trưởng chấm thành viên ($W_{team}$, mặc định 20%)
  - Điểm các nhóm khác chấm chéo ($W_{cross}$, mặc định 20%)
  - Điểm giáo viên chấm ($W_{teacher}$, mặc định 50%)
  - Ràng buộc: $\sum W = 100\%$, mỗi trọng số $\ge 0\%$.

#### Requirement 2.2: Chế độ Chấm Tự do (Parallel Grading)
- Hoạt động MUST cho phép các đối tượng vào chấm đồng thời mà không bắt buộc theo thứ tự tuần tự:
  1. Mọi học sinh có thể vào tự chấm điểm cá nhân của mình.
  2. Các nhóm trưởng có thể vào chấm điểm các thành viên trong nhóm mình.
  3. Các nhóm trưởng có thể vào chấm điểm sản phẩm của các nhóm khác.
  4. Giáo viên có thể nhập điểm cho các nhóm hoặc từng học sinh bất kỳ lúc nào.
- Thang điểm chuẩn: 0.0 đến 10.0 (bước nhảy 0.1). Cho phép nhập ô ghi chú nhận xét ngắn gọn.

#### Requirement 2.3: Phân quyền Hiển thị Màn hình Học sinh
- **Đối với Thành viên bình thường (`isLeader = false`):**
  - Chỉ hiển thị form tự chấm điểm cá nhân: Thanh trượt/ô nhập điểm 0-10, ô nhận xét bản thân, nút `[Nộp đánh giá cá nhân]`.
- **Đối với Nhóm trưởng (`isLeader = true`):**
  - Hiển thị 3 tab/phần rõ ràng:
    1. *Tự đánh giá cá nhân:* Chấm điểm chính mình.
    2. *Đánh giá thành viên nhóm:* Danh sách các bạn trong nhóm, ô nhập điểm và nhận xét cho từng bạn.
    3. *Đánh giá nhóm khác:* Danh sách các nhóm còn lại, ô nhập điểm cho bài thuyết trình/sản phẩm của từng nhóm bạn.

#### Requirement 2.4: Luồng Đổi Học sinh trên Thiết bị Dùng chung (Kiosk Mode)
- Khi học sinh đã hoàn tất nộp điểm, màn hình MUST hiển thị thông báo chúc mừng kèm nút bấm nổi bật:
  **`[🔁 Hoàn thành & Đổi học sinh khác]`**.
- Khi chạm vào nút:
  - Client MUST xóa token định danh `educlass_participant_token` trong `localStorage`.
  - Client MUST giữ nguyên mã lớp `joinCode` hiện tại.
  - Chuyển màn hình về bước chọn tên học sinh (`step = 'identity'`).
  - Danh sách học sinh MUST hiển thị dấu tick xanh hoặc nhãn `[✓ Đã chấm]` cạnh tên học sinh đã hoàn thành để bạn tiếp theo dễ nhận biết.

#### Requirement 2.5: Bảng Tổng kết & Xuất Excel
- Màn hình Giáo viên MUST cập nhật tiến độ nộp điểm theo thời gian thực (WebSocket state patch).
- Hệ thống MUST tự động áp dụng công thức trọng số để tính Điểm Tổng kết ($Score_{final}$) cho toàn bộ học sinh trong lớp ngay khi có điểm mới.
- Giáo viên MUST có thể xuất file Excel báo cáo dự án bao gồm: STT, Họ tên, Nhóm, Điểm Tự chấm, Điểm Nhóm chấm, Điểm Chéo, Điểm GV, Điểm Tổng kết, Lời nhận xét.
