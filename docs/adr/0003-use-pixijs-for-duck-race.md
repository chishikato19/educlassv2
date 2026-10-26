# ADR 0003: Tích hợp thư viện Pixi.js cho Chế độ Đua Vịt (Duck Race)

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Để bổ sung chế độ quay số gọi học sinh mới: **Đua vịt (Duck Race)** theo phong cách tương tự Stopwatch, với sĩ số cả lớp từ 35–45 học sinh cùng bơi trên một dòng sông cuộn ngang, xuất hiện các yêu cầu kỹ thuật đặc biệt:
1. Vẽ đồng thời 40–50 chú vịt cao su chuyển động tự do, chen chúc đè lên nhau (flock stacking với Z-index phân tầng Y), kèm hiệu ứng bọt nước và bảng tên học sinh.
2. Hiệu ứng đồ họa mặt nước mượt mà (gợn sóng, phản chiếu, rẽ sóng).
3. Đạt hiệu năng chuẩn 60 FPS trên mọi loại phần cứng phòng học (kể cả máy tính để bàn cũ hoặc máy chiếu).

Nếu sử dụng DOM nodes thuần, việc render 45 phần tử phức tạp di chuyển liên tục sẽ gây tái bố cục (layout thrashing) và giật khung hình. Nếu sử dụng Phaser thì quá cồng kềnh (>1MB) và mang tính game engine toàn phần. `Pixi.js` là giải pháp cân bằng hoàn hảo: một thư viện chuyên biệt về 2D WebGL/WebGPU rendering, cực nhẹ (~180KB - 250KB), sprite batching mạnh mẽ và tích hợp liền mạch vào React component.

## Quyết định
1. Thêm gói `pixi.js` vào dependencies của gói `apps/teacher-ui`.
2. Đóng gói toàn bộ logic đồ họa của Pixi.js bên trong module độc lập `apps/teacher-ui/src/components/random-picker/modes/duck-race/`.
3. Khi React component unmount hoặc chuyển tab, luôn gọi hàm dọn dẹp `app.destroy(true, { children: true, texture: true })` để giải phóng bộ nhớ WebGL hoàn toàn, ngăn chặn memory leak.
4. Phối hợp nhịp nhàng với `gsap` (đã duyệt ở ADR 0002) để điều phối kịch bản di chuyển của đàn vịt theo 3 kịch bản đua kịch tính.

## Hệ quả
- **Tích cực:**
  - Tận dụng khả năng tăng tốc phần cứng WebGL của Pixi.js, chạy 45 chú vịt siêu mượt mà không drop FPS.
  - Hỗ trợ phân tầng chiều sâu 3D (Z-index sorting) và cho phép các chú vịt chen chúc, trôi đè lên nhau tự nhiên.
  - Hoạt động 100% offline, không cần kết nối internet hay CDN.
- **Tiêu cực:**
  - Tăng nhẹ dung lượng gói bundle của `apps/teacher-ui` (~200KB minified).
