# Đặc tả Kỹ thuật: Ghép 2–3 Học sinh ngồi chung một máy (Multi-Student Device Pairing)

## Capability: `session-pairing`

Đặc tả này quy định các yêu cầu chức năng, phi chức năng và tiêu chí nghiệm thu (Acceptance Criteria) cho tính năng Ghép 2–3 học sinh trên cùng một máy tính hoặc thiết bị trong hệ thống EduClass v2.

---

### 1. Cấu hình Phiên học Ghép máy (`Teacher Session Settings`)

#### Requirement 1.1: Tùy chọn Mở phiên cho phép Ngồi chung máy
- Khi giáo viên mở phiên học mới (`POST /api/sessions`), hệ thống MUST cung cấp tùy chọn cấu hình:
  - `allowPairing: boolean` (mặc định: `false`).
  - `maxStudentsPerDevice: number` (chỉ cho phép các giá trị: `2` hoặc `3`; mặc định là `2`).
- Ràng buộc: Tùy chọn `allowPairing` chỉ có hiệu lực khi phiên học có liên kết với một lớp học (`classId` khác `null`) và `identityMode` là `roster_only` hoặc `roster_or_guest`.

#### Requirement 1.2: Phản hồi thông tin Phiên học cho Cổng Học sinh
- Endpoint tra cứu phiên theo mã (`GET /api/sessions/code/:code/roster`) MUST trả về các trường:
  - `allowPairing: boolean`
  - `maxStudentsPerDevice: number`

---

### 2. Trải nghiệm Chọn Danh tính Học sinh (`Student Identity Selection`)

#### Requirement 2.1: Chế độ Chọn nhiều bạn (Multi-Select Chips)
- Khi `allowPairing === true`, giao diện chọn tên (`PickIdentity`) MUST cho phép học sinh chọn từ 1 đến `maxStudentsPerDevice` bạn học sinh từ danh sách lớp.
- Thao tác:
  - Bấm vào một học sinh chưa bị chiếm: Thêm bạn đó vào khay **"Đã chọn"** (dạng thẻ Chips có nút `(x)` để xóa).
  - Bấm vào học sinh đã có trong khay: Bỏ chọn bạn đó.
  - Khi đã chọn đủ `maxStudentsPerDevice`, hệ thống MUST làm mờ các học sinh còn lại và hiển thị thông báo nhẹ: *"Đã chọn đủ số lượng tối đa cho 1 máy"*.
- Nút hành động chính cập nhật nhãn trực quan theo số lượng học sinh đã chọn:
  - 1 bạn: `Vào lớp (1 học sinh)`
  - 2 bạn: `Vào lớp cho 2 bạn (Tên A & Tên B)`
  - 3 bạn: `Vào lớp cho 3 bạn (Tên A, Tên B & Tên C)`

#### Requirement 2.2: Chống chọn trùng tên đồng thời (Atomic Name Locking - D7)
- Hệ thống MUST đảm bảo tính toàn vẹn: Khi một máy gửi yêu cầu vào lớp với danh sách `studentIds: [id1, id2, ...]`:
  - Server MUST kiểm tra đồng thời tất cả các học sinh trong danh sách:
    - Nếu có bất kỳ học sinh nào đang ở trạng thái `online` (đã được máy khác chọn), yêu cầu vào lớp MUST bị từ chối với mã lỗi `NAME_TAKEN`, kèm tên của học sinh đang bị chiếm.
    - Nếu tất cả học sinh đều hợp lệ, server MUST đánh dấu `isTaken = true` cho toàn bộ các học sinh đó trong cùng một xử lý.

#### Requirement 2.3: Xác thực Mã PIN cá nhân cho Từng Học sinh
- Nếu trong danh sách học sinh được chọn có ít nhất 1 bạn đã đặt mã PIN cá nhân:
  - Hệ thống MUST chuyển sang bước xác nhận PIN (`pin_team`).
  - Form xác thực MUST hiển thị rõ ràng ô nhập PIN tương ứng cho từng bạn có cài PIN (ví dụ: *"Nhập mã PIN của bạn Nguyễn Văn A"*).
  - Chỉ khi toàn bộ các mã PIN bắt buộc được xác thực chính xác, phiên làm việc mới được cấp token và vào lớp.

---

### 3. Mô hình Danh tính & Đồng bộ Dữ liệu (`Identity & Session State`)

#### Requirement 3.1: Đại diện Người tham gia (Participant)
- Một máy tính kết nối WebSocket chỉ duy trì **1 kết nối realtime (1 Participant)** với server.
- Bản ghi Participant MUST lưu trữ danh sách các mã học sinh liên kết: `studentIds: string[]`.
- Tên hiển thị (`displayName`) của Participant tự động ghép từ họ tên các bạn:
  - 2 bạn: `Họ tên A & Họ tên B`
  - 3 bạn: `Họ tên A, Họ tên B & Họ tên C`
- Trạng thái `identityLevel` của Participant:
  - Nếu tất cả các bạn đều xác thực tài khoản có mã PIN: `account`.
  - Nếu chọn từ danh sách lớp không có PIN: `roster`.

#### Requirement 3.2: Tương thích với các Hoạt động Plugin (`Activities Compatibility`)
- Các hoạt động trong lớp (Quiz Live, Game Đối kháng, Vòng quay, Bảng tương tác, v.v.) KHÔNG cần thay đổi giao diện hoạt động:
  - Máy tính này tương tác như một người chơi / đội chơi duy nhất.
  - Mọi câu trả lời, thao tác chạm hoặc bài nộp đều đại diện cho cả nhóm máy.

---

### 4. Cơ chế Gamification & Phân bổ EXP (EXP & Rewards - D8)

#### Requirement 4.1: Phân bổ Thưởng EXP Tự động
- Khi một Activity kích hoạt thưởng EXP thông qua `ctx.grantReward(participantId, trigger, qty)`:
  - Server MUST tra cứu bản ghi Participant để lấy danh sách `studentIds`.
  - Server MUST gọi `core/rewards.grant()` độc lập cho **từng học sinh** có trong nhóm máy.
  - Đối với mỗi học sinh có tài khoản (`identityLevel === 'account'`):
    - Điểm EXP tích lũy vĩnh viễn (`students.exp`) MUST được cộng đầy đủ 100% trong cùng transaction DB.
    - Một bản ghi `reward_log` riêng biệt MUST được tạo cho từng học sinh kèm `studentId` tương ứng.
    - Hệ thống MUST kiểm tra điều kiện thăng cấp (`level`) và trao danh hiệu (`titles`) cho từng bạn.

#### Requirement 4.2: Thông báo Thưởng trên Màn hình Học sinh
- Khi có sự kiện thưởng EXP, màn hình học sinh MUST hiển thị thông báo chúc mừng vinh danh cả nhóm:
  - Ví dụ: `+15 EXP cho cả 2 bạn (Nam Anh & Văn Bình)!`

---

### 5. Điểm danh & Báo cáo Tiết học (`Attendance & Reporting`)

#### Requirement 5.1: Điểm danh Đầy đủ
- Trong danh sách người tham gia của Giáo viên (`SessionControl`) và Báo cáo phiên học (`SessionReport`):
  - Tất cả các học sinh trong danh sách `studentIds` của các máy đều MUST được ghi nhận trạng thái **"Có mặt" (Present)**.
  - Bảng thống kê sĩ số lớp MUST tính đúng tổng số học sinh đang có mặt (không bị hụt sĩ số do ngồi chung máy).

#### Requirement 5.2: Báo cáo Tổng kết Phiên
- Khi kết thúc phiên học, báo cáo tổng kết cá nhân gửi về máy MUST hiển thị chi tiết điểm số chung của máy và EXP tích lũy riêng của từng bạn.
