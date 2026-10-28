# Đề xuất: Tính năng Ghép 2–3 Học sinh ngồi chung một máy (Multi-Student Device Pairing)

## 1. Bối cảnh & Vấn đề (Context & Motivation)

Tại hầu hết các trường phổ thông tại Việt Nam (Tiểu học, THCS, THPT), phòng thực hành tin học thường đối mặt với bài toán cơ sở vật chất:

- Sĩ số lớp trung bình từ **35 – 45 học sinh**.
- Số máy tính hoạt động ổn định trong phòng máy thường dao động từ **20 – 25 máy**.
- Do đó, giáo viên bắt buộc phải tổ chức cho học sinh ngồi học theo mô hình: **2 học sinh 1 máy (Đôi bạn cùng tiến / Pair Work)** hoặc **3 học sinh 1 máy (Nhóm nhỏ / Small Group)**.

### Hạn chế của hệ thống EduClass v2 hiện tại:

1. **Mô hình "1 máy = 1 học sinh":** Màn hình vào lớp (`PickIdentity`) chỉ cho phép bấm chọn đúng 1 học sinh trong danh sách. Bạn ngồi cạnh không thể chọn tên mình vì trình duyệt đã vào phòng.
2. **Học sinh bị ghi nhận "vắng mặt":** Bạn thứ 2/thứ 3 ngồi cùng máy không được ghi nhận điểm danh, danh sách lớp trên máy giáo viên hiển thị bạn đó chưa vào lớp (`isTaken = false`).
3. **Mất quyền lợi EXP & Danh hiệu (Vi phạm D6 & D8):** Khi máy đó trả lời đúng câu hỏi Quizizz, chiến thắng game đối kháng hay được khen thưởng, EXP chỉ cộng cho bạn đầu tiên; bạn thứ 2 không nhận được EXP hay huy hiệu vào hồ sơ cá nhân.
4. **Tùy chọn `allowTeams` hiện tại chưa đúng kịch bản:** Tùy chọn _"Cho phép chia đội/nhóm"_ hiện tại là mô hình **nhóm phân tán** (mỗi học sinh ngồi 1 máy riêng rồi tự gõ cùng tên text nhóm), không giải quyết được bài toán ngồi chung máy vật lý.

---

## 2. Mục tiêu (Goals)

1. **Cấu hình phiên linh hoạt từ phía Giáo viên (`Teacher-UI`):**
   - Giáo viên khi mở phiên học có thể bật tùy chọn: `☑ Cho phép ghép 2–3 học sinh chung 1 máy`.
   - Cài đặt số lượng tối đa trên 1 máy: `2 học sinh` hoặc `tối đa 3 học sinh`.
2. **Trải nghiệm chọn danh tính nhanh tại Cổng học sinh (`Student-UI`):**
   - Học sinh có thể chọn 2 hoặc 3 bạn cùng lúc ngay trên màn hình chọn tên thông qua khay thẻ trực quan (**Multi-select Chips**).
   - Tên hiển thị ghép tự động, trang trọng: `Nguyễn Văn A & Trần Thị B`.
   - Vẫn đảm bảo quy tắc **≤ 3 bước vào lớp** và **vùng chạm ≥ 48×48px**.
3. **Cơ chế chống chọn trùng đa chiều (D7 Name Locking):**
   - Khi máy gửi yêu cầu vào lớp, toàn bộ các học sinh được chọn đều được server khóa trạng thái `isTaken = true`, các máy khác trong phòng không thể chọn trùng bất kỳ bạn nào trong số đó.
4. **Phân bổ EXP công bằng & Điểm danh đa chủ thể (Gamification & D8):**
   - Mọi học sinh ngồi cùng máy đều được ghi nhận trạng thái **"Có mặt"** trong phiên học và báo cáo tổng kết.
   - Khi máy nhận thưởng EXP từ bất kỳ hoạt động nào (Quiz, Vòng quay, Bảng tương tác, Khen thưởng giáo viên), hệ thống tự động cộng EXP vào tài khoản cá nhân vĩnh viễn cho **tất cả** học sinh trong nhóm máy đó.
5. **Hỗ trợ xác thực mã PIN cá nhân:**
   - Nếu trong nhóm có bạn đã đặt mã PIN cá nhân, hệ thống cho phép xác thực PIN nhanh gọn trước khi chính thức vào lớp.

---

## 3. Phạm vi (Scope)

### Trong phạm vi (In-Scope):

- **Giao thức & DTO (`packages/protocol`)**:
  - Mở rộng `CreateSessionRequest`: bổ sung cấu hình ghép máy `allowPairing` và `maxStudentsPerDevice`.
  - Mở rộng `StudentJoinRequest`: bổ sung mảng `studentIds: string[]`.
  - Mở rộng `ParticipantDto`: bổ sung mảng `studentIds: string[]` và `studentNames?: string[]`.
- **Cơ sở dữ liệu (`packages/db`)**:
  - Lưu cấu hình ghép máy trong `sessions.settings_json`.
  - Cập nhật bảng `participants` hỗ trợ lưu danh sách học sinh liên kết (chuỗi JSON `student_ids_json`).
- **Xử lý phía Server (`packages/server`)**:
  - Endpoint `POST /api/sessions/join`: Xác thực hợp lệ toàn bộ học sinh, kiểm tra PIN, khóa tên đồng thời cho các bạn được chọn.
  - Lõi phần thưởng (`rewards`): Khi có lệnh thưởng điểm/EXP cho 1 `participant`, tự động phát thưởng và ghi log độc lập cho từng học sinh liên kết.
  - Điểm danh và báo cáo phiên: Đưa toàn bộ các học sinh liên kết vào báo cáo phiên với trạng thái có mặt.
- **Giao diện Giáo viên (`apps/teacher-ui`)**:
  - Modal Mở phiên học: Tùy chọn bật ghép máy và giới hạn số học sinh/máy.
  - Bảng giám sát học sinh online: Hiển thị biểu tượng nhóm đôi/ba và danh sách các bạn ngồi cùng máy.
- **Giao diện Học sinh (`apps/student-ui`)**:
  - Màn hình `PickIdentity`: Chế độ chọn nhiều bạn kèm khay thẻ Chips xem trước, tìm kiếm lọc nhanh, cảnh báo khi quá số lượng cho phép.
  - Màn hình xác thực PIN: Nhập mã PIN cho bạn có cài đặt mật khẩu.

### Ngoài phạm vi (Out-of-Scope):

- Kỳ thi trắc nghiệm bảo mật cao cá nhân (Exam Kiosk): Ở chế độ thi nghiêm ngặt, phiên thi sẽ khuyến nghị hoặc bắt buộc chế độ 1 học sinh / 1 máy (hoặc dùng tính năng Thi nhiều ca / Multi-batch Exam đã có).
