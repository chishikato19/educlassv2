# Danh sách Công việc Triển khai: Ghép 2–3 Học sinh ngồi chung một máy (Multi-Student Device Pairing)

## Giai đoạn 1: Giao thức & Cơ sở Dữ liệu (Protocol & DB)

- [x] 1.1 **Cập nhật Giao thức & DTO (`packages/protocol`)**:
  - Mở rộng `SessionSettingsSchema` với `allowPairing: boolean` và `maxStudentsPerDevice: 2 | 3`.
  - Mở rộng `StudentJoinRequestSchema` hỗ trợ `studentIds: string[]` và `pins: Record<string, string>`.
  - Mở rộng `ParticipantDtoSchema` với `studentIds: string[]`.
  - Mở rộng `SessionRosterResponseSchema` trả về `allowPairing` và `maxStudentsPerDevice`.
  - Cập nhật exports và unit tests cho schema trong `packages/protocol`.

- [x] 1.2 **Cập nhật Schema & Repository Cơ sở Dữ liệu (`packages/db`)**:
  - Thêm cột `student_ids_json` vào bảng `participants` trong `packages/db/src/schema/index.ts`.
  - Viết migration SQLite an toàn đánh số tiếp theo (`0009_participant_student_ids.sql`) và cập nhật `migrator.ts`.
  - Cập nhật `participant-repository.ts`: hỗ trợ lưu trữ và truy vấn danh sách `studentIds` theo phiên.

---

## Giai đoạn 2: Xử lý Phía Server & Cơ chế Thưởng Fan-out (Server & Rewards)

- [x] 2.1 **Nâng cấp Endpoint Vào lớp (`packages/server/src/routes/sessions.ts`)**:
  - Tại `POST /api/sessions/join`:
    - Tiếp nhận mảng `studentIds` (hoặc đơn `studentId`).
    - Kiểm tra số lượng $\le maxStudentsPerDevice$ nếu phiên bật `allowPairing`.
    - Kiểm tra tính hợp lệ của tất cả học sinh (thuộc lớp của phiên).
    - Kiểm tra chống chọn trùng đồng thời (D7 Atomic Lock): Không có học sinh nào trong mảng đang online ở máy khác.
    - Kiểm tra mã PIN cá nhân cho từng học sinh có đặt mật khẩu.
    - Ghép tên hiển thị `displayName` tự động dạng `"Tên A & Tên B"`.
    - Lưu danh sách `studentIds` vào bản ghi `participant` và trả về token phiên.

- [x] 2.2 **Nâng cấp Cơ chế Thưởng EXP Tự động (Rewards Fan-out - D8)**:
  - Khi `ctx.grantReward()` được gọi cho 1 `participantId`:
    - Tra cứu danh sách `studentIds` liên kết với máy.
    - Thực hiện vòng lặp phát thưởng `core/rewards.grant()` cho toàn bộ các học sinh có tài khoản trong nhóm.
    - Lưu bản ghi `reward_log` riêng biệt và cập nhật `students.exp` trong transaction.
    - Bắn sự kiện realtime cập nhật thông tin thưởng cho học sinh và giáo viên.

- [x] 2.3 **Điểm danh & Báo cáo Tiết học Toàn diện**:
  - Cập nhật endpoint `/api/sessions/:id/participants` và tổng kết phiên:
    - Đảm bảo tất cả học sinh trong nhóm máy đều hiển thị trạng thái "Có mặt" trong báo cáo.

---

## Giai đoạn 3: Giao diện Giáo viên (Teacher UI)

- [x] 3.1 **Cấu hình Ghép máy trong Modal Mở phiên (`apps/teacher-ui/src/components/SessionControl.tsx`)**:
  - Thêm checkbox `Cho phép ghép 2–3 học sinh ngồi chung 1 máy`.
  - Thêm dropdown chọn số lượng tối đa (`2 học sinh / máy` hoặc `3 học sinh / máy`).
  - Gửi cấu hình vào `CreateSessionRequest`.

- [x] 3.2 **Hiển thị Giám sát Học sinh Ghép đôi/ba**:
  - Trong danh sách người tham gia tiết học:
    - Hiển thị huy hiệu nhóm đôi/ba `[👥 2 bạn]` hoặc `[👥 3 bạn]`.
    - Hiển thị danh sách đầy đủ tên các bạn ngồi chung máy.
    - Nút giải phóng tên (Kick/Mở lại tên) cho phép giải phóng đồng thời hoặc từng bạn.

---

## Giai đoạn 4: Giao diện Học sinh (Student UI)

- [x] 4.1 **Màn hình Chọn Danh tính Đa chọn (Multi-select Chips in `StudentPortal.tsx`)**:
  - Khi phiên có `allowPairing === true`:
    - Cho phép bấm chọn từ 1 đến `maxStudentsPerDevice` học sinh.
    - Hiển thị khay thẻ Chips cố định phía trên: `[ 👤 Họ và tên  ✕ ]`.
    - Hạn chế chọn quá số lượng cho phép kèm thông báo hướng dẫn trực quan.
    - Cập nhật nút chính theo số lượng: `Vào lớp cho 2 bạn (A & B)`.

- [x] 4.2 **Xác thực Mã PIN Cá nhân Đồng thời (`Step: pin_team`)**:
  - Nếu trong các bạn được chọn có bạn cài mã PIN:
    - Hiển thị form nhập mã PIN tương ứng cho từng bạn.
    - Hỗ trợ nút quay lại chọn tên nếu gõ sai PIN.

- [x] 4.3 **Màn hình Chờ & Vinh danh Nhóm Học sinh**:
  - Thẻ người chơi (Player Card) hiển thị biểu tượng đôi bạn và avatar ghép.
  - Banner chúc mừng khi nhận EXP hiển thị vinh danh cả nhóm máy: `✨ +15 EXP cho cả 2 bạn (A & B)!`.

---

## Giai đoạn 5: Kiểm tra & Nghiệm thu (Verification & Typecheck)

- [x] 5.1 **Kiểm tra Kiểu dữ liệu & Biên dịch (`pnpm run typecheck`)**:
  - Chạy `pnpm run typecheck` đảm bảo toàn bộ monorepo (protocol, core, db, server, teacher-ui, student-ui) xanh 100% không lỗi.

- [x] 5.2 **Cập nhật Tài liệu Hướng dẫn & Nhật ký**:
  - Cập nhật `docs/CHANGELOG.md` ghi nhận hoàn thành tính năng.
  - Đánh dấu hoàn thành trong kế hoạch tổng `docs/PLAN.md`.
