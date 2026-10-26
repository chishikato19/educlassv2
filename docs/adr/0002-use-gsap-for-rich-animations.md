# ADR 0002: Sử dụng thư viện GSAP (GreenSock) cho các hoạt ảnh tương tác phức tạp

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày:** 2026-10-09
- **Tác giả:** EduClass Team

## Ngữ cảnh
Trong phân hệ tiện ích gọi học sinh ngẫu nhiên (Random Picker) và các hoạt động tương tác phòng học:
- Cần các hiệu ứng chuyển động timeline phức tạp nhiều giai đoạn:
  1. **Slot Machine & Quay tên (Name Roller)**: Chuyển động cuộn dải nội dung với tốc độ giảm tốc dài (prolonged ease-out deceleration) tạo cảm giác hồi hộp, nín thở.
  2. **Bộ bài ma thuật (Magic Deck)**: Chuyển động xào bài (riffle/orbit shuffle) gom tụ giữa rồi chia tuần tự ra lưới 3x3.
  3. **Bắn bóng bay (Balloon Pop)**: Bóng bay bồng bềnh lơ lửng và nổ bung mảnh vỡ.
- Viết thuần CSS keyframes cho các chuỗi timeline tuần tự nhiều lớp rất cồng kềnh, khó điều khiển thời gian động và khó tái sử dụng.
- Theo quy định `AGENTS.md`: *"Không thêm thư viện mới nếu chưa nêu trong D9, trừ khi ghi ADR"*.

## Quyết định
Chọn thư viện **GSAP** (`gsap`) làm giải pháp tiêu chuẩn cho các hoạt ảnh tương tác nhiều giai đoạn:
1. GSAP là thư viện chuẩn công nghiệp về timeline animation, hoạt động 100% ngoại tuyến (offline), không cần kết nối mạng hay tải thêm tài nguyên bên ngoài.
2. Hiệu năng tối ưu cao (60 FPS), tiêu tốn rất ít CPU/RAM trên các dòng máy tính trường học cấu hình vừa và thấp.
3. Cung cấp API điều khiển timeline tuần tự (`gsap.timeline()`) mạnh mẽ, dễ quản lý vòng đời chuyển động và hủy/dọn dẹp (cleanup) khi React unmount.

## Hệ quả
- Thêm `gsap` vào danh sách `dependencies` của `apps/teacher-ui`.
- Duy trì kiến trúc module hóa độc lập: mỗi chế độ quay nằm trong một file component riêng (`modes/SlotMachineMode.tsx`, `modes/NameRollerMode.tsx`, `modes/BalloonPopMode.tsx`, `modes/MagicDeckMode.tsx`), GSAP chỉ được sử dụng trong phạm vi component chuyên trách.
