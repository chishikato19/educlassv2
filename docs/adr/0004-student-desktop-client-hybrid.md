# ADR 0004: Mô hình Kép (Hybrid) — Hỗ trợ Ứng dụng Desktop Client cho Học sinh song song với Trình duyệt Chrome

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày:** 2026-10-18
- **Tác giả:** EduClass Team

## Ngữ cảnh
Quyết định **D2** trong `docs/PLAN.md` quy định:
> *"Học sinh dùng trình duyệt (điện thoại + máy bàn). Giao diện responsive, mobile-first, PWA. Không cài app."*

Quy định này rất hiệu quả cho học sinh sử dụng thiết bị di động (điện thoại, máy tính bảng) nhờ tính linh hoạt: chỉ cần quét mã QR là vào lớp ngay.

Tuy nhiên, trong bối cảnh thực tế tại các **Phòng máy tính trường học (Computer Lab)** với 30–50 máy bàn chạy Windows:
1. **Địa chỉ IP thay đổi & Gõ nhầm:** Học sinh phải tự mở trình duyệt và gõ địa chỉ IP máy chủ giáo viên (dạng `http://192.168.x.x:3000`). Nếu mạng dùng DHCP đổi IP hoặc học sinh gõ sai dấu chấm, việc vào lớp bị gián đoạn, mất 5–10 phút đầu giờ của cả lớp.
2. **Khó quản lý tập trung & Thiếu tập trung:** Học sinh dễ mở thêm tab để chơi game, xem YouTube hoặc lướt web ngoài ý muốn trong giờ học.
3. **Gian lận khi kiểm tra (Exam):** Trình duyệt không thể ngăn chặn học sinh dùng `Alt + Tab`, phím Windows hay mở ứng dụng tra cứu đáp án.
4. **Nhu cầu đồng bộ tức thời:** Giáo viên muốn khi bấm "Mở phiên", toàn bộ 40 máy tính phòng học sẽ đồng loạt tự động bật ứng dụng vào lớp, không cần thao tác thủ công từng máy.

## Quyết định
Thực hiện kiến trúc **Mô hình Kép (Hybrid Architecture)**:
1. **Kênh 1 — Thiết bị Di động (Mobile/Tablet):** Giữ nguyên 100% tinh thần D2. Học sinh dùng trình duyệt (Chrome, Safari) quét mã QR hoặc nhập mã 6 số để vào lớp, hoàn toàn không cần cài đặt ứng dụng.
2. **Kênh 2 — Phòng máy tính (PC Windows):** Bổ sung bộ cài đặt / file chạy ứng dụng chuyên dụng (`EduClass Student Client`):
   - **Chạy nền siêu nhẹ (Standby):** Khởi động cùng Windows, ẩn ở khay hệ thống (System Tray), chiếm < 5MB RAM, chỉ lắng nghe tín hiệu phát sóng từ máy giáo viên.
   - **Tự động đánh thức khi mở phiên (Wake-on-Session):** Máy chủ giáo viên phát gói tin UDP Broadcast trong mạng LAN (`packages/protocol` & `packages/server/src/services/beacon-service.ts`). Ngay khi nhận được gói tin, ứng dụng học sinh tự động bung cửa sổ độc lập (Managed Window) nạp thẳng giao diện `apps/student-ui`.
   - **Cửa sổ độc lập (WebView2):** Dùng chung 100% mã nguồn giao diện `apps/student-ui` hiện có, không trùng lặp mã UI.
   - **Tự động đóng khi hết tiết:** Khi giáo viên bấm "Đóng phiên", máy chủ phát tín hiệu kết thúc, ứng dụng học sinh tự động đóng cửa sổ và trở lại trạng thái chạy nền.
   - **Chế độ thi an toàn (Exam Kiosk Mode):** Hỗ trợ toàn màn hình và khóa các phím chuyển ứng dụng khi đang làm bài thi.

## Hệ quả
- Trong `packages/protocol`: Bổ sung Zod schema cho gói tin khám phá mạng LAN `DiscoveryBeaconSchema`.
- Trong `packages/server`: Bổ sung `BeaconService` sử dụng module chuẩn `node:dgram` (không thêm thư viện bên ngoài), tự động phát sóng UDP khi phiên mở, phát nhịp tim định kỳ, và phát thông báo khi phiên đóng.
- Tích hợp vòng đời Beacon vào các endpoint mở/đóng phiên của `sessionsRoutes`.
- Chuẩn bị nền tảng cho ứng dụng Client máy học sinh trong các giai đoạn tiếp theo.
