# Hướng Dẫn Triển Khai & Vận Hành EduClass Student Client
## (Dành Cho Giáo Viên & Quản Trị Viên Phòng Máy Tính)

---

## 1. Tổng Quan Kiến Trúc Kép (Hybrid Architecture)

Hệ thống EduClass v2 hỗ trợ song song 2 kênh kết nối học sinh:
1. **Thiết bị Di động (Điện thoại / Tablet):** Học sinh quét mã QR bằng camera/Zalo/Chrome để vào lớp trực tiếp trên trình duyệt web, không cần cài đặt bất kỳ phần mềm nào (chuẩn D2).
2. **Phòng Máy Tính Trường Học (PC Windows):** Máy tính được cài đặt ứng dụng **EduClass Student Client** (`apps/student-desktop`). Ứng dụng chạy ngầm siêu nhẹ (< 5MB RAM) và **tự động bung cửa sổ vào lớp khi giáo viên mở phiên (Wake-on-Session)**, đồng thời hỗ trợ **chế độ thi an toàn (Exam Kiosk Lockdown)**.

```
       [MÁY CHỦ GIÁO VIÊN]
              │
    Bấm "BẮT ĐẦU PHIÊN HỌC"
              │
    ┌─────────┴────────────────────────┐
    ▼                                  ▼
[KÊNH DI ĐỘNG]                 [KÊNH PHÒNG MÁY TÍNH]
Quét mã QR bằng Chrome         40 máy tính chạy ngầm bắt sóng UDP
Vào lớp ngay trên web          Đồng loạt TỰ ĐỘNG BẬT CỬA SỔ VÀO LỚP!
```

---

## 2. Các Hình Thức Triển Khai Cho Phòng Máy Tính

### Hình thức 1: Cài đặt thông thường (1-Click Install)
- Chạy file `EduClass-Hoc-Sinh-Setup-2.1.1.exe`.
- Trình cài đặt NSIS sẽ tự động:
  1. Sao chép tệp ứng dụng vào thư mục máy tính.
  2. Tự động thêm quy tắc Tường lửa Windows Firewall cho cổng UDP `54321`.
  3. Tự động tạo Shortcut trong thư mục `shell:startup` để phần mềm tự khởi động cùng Windows ở chế độ nền (`--background`).

---

### Hình thức 2: Triển khai hàng loạt cho 40 máy phòng tin (Silent Install) ⭐
Dành cho cán bộ IT hoặc giáo viên tin học cài đặt đồng loạt qua mạng LAN, lệnh PowerShell, hoặc phần mềm quản lý phòng máy:

Chỉ cần thêm tham số `/S` (viết hoa):
```cmd
"EduClass-Hoc-Sinh-Setup-2.1.1.exe" /S
```
* **Thời gian thực thi:** ~3 giây / máy.
* **Đặc điểm:** Không hiển thị bất kỳ hộp thoại nào, tự động cấp quyền Tường lửa và tự kích hoạt chạy nền ngay lập tức.

---

### Hình thức 3: Bản chạy trực tiếp không cần cài đặt (Portable)
- Sao chép file `EduClass Học Sinh Portable 2.1.1.exe` vào Desktop hoặc ổ đĩa mạng dùng chung.
- Học sinh click đúp là mở ngay lập tức, không ghi vào Registry hệ thống.

---

## 3. Cơ Chế Hoạt Động Thực Tế Trong Giờ Học

### Khi bật máy tính phòng tin:
- Ứng dụng tự động khởi động ở chế độ chạy nền (`--background`).
- Biểu tượng EduClass màu xanh dương hiển thị nhỏ gọn ở **Khay hệ thống (System Tray)** góc dưới bên phải màn hình.
- Tiêu tốn cực ít tài nguyên hệ thống (< 5MB RAM, 0% CPU), học sinh vẫn sử dụng máy tính làm việc và học tập các môn khác bình thường.

### Khi Giáo viên bấm "Mở phiên học":
- Máy chủ giáo viên phát gói tin UDP Broadcast trong mạng LAN.
- Toàn bộ máy học sinh phòng tin tự động bắt được tín hiệu, **tự bung cửa sổ ứng dụng độc lập** và nạp thẳng vào lớp của thầy/cô.
- Học sinh không cần gõ địa chỉ IP, không cần nhập link.

### Khi Giáo viên bấm "Đóng phiên" (Hết tiết học):
- Máy chủ giáo viên phát tín hiệu đóng phiên.
- Cửa sổ ứng dụng học sinh tự động đóng lại, trả lại màn hình Desktop Windows bình thường và quay về chế độ chạy nền chờ tiết học sau.

### Học sinh bấm nút `X` (Đóng cửa sổ):
- Ứng dụng **không bị tắt** mà chỉ ẩn về khay hệ thống để tiếp tục nghe ngóng tín hiệu từ giáo viên cho các tiết học tiếp theo.
- Muốn tắt hoàn toàn: Click chuột phải vào biểu tượng khay hệ thống $\rightarrow$ Chọn **"Thoát EduClass"**.

---

## 4. Chế Độ Thi An Toàn (Exam Kiosk Mode)

Khi giáo viên phát đề kiểm tra (Exam Activity):
1. Cửa sổ ứng dụng học sinh **tự động phóng to toàn màn hình (Fullscreen)** và được ghim lên trên cùng (`AlwaysOnTop`).
2. **Khóa các phím chuyển ứng dụng:**
   - Vô hiệu hóa `Alt + Tab`, `Alt + F4`, `Alt + Space`.
   - Vô hiệu hóa phím `Windows` (`Meta`), `Ctrl + Esc`, `Ctrl + Shift + Esc`.
   - Vô hiệu hóa `Ctrl + N`, `Ctrl + T`, `Ctrl + W`, `F11`, `F12`.
3. **Tự động phòng vệ khi mất focus:** Nếu học sinh tìm cách chuyển ứng dụng, hệ thống tự động kéo focus trở lại ngay lập tức và ghi nhận số lần rời màn hình gửi về bảng giám sát của giáo viên.
4. **Tự động giải phóng Kiosk:** Ngay khi học sinh bấm "Nộp bài" thành công hoặc khi hết giờ làm bài, ứng dụng tự động mở khóa về chế độ cửa sổ bình thường.

---

## 5. Phím Tắt Cứu Hộ Dành Cho Giám Thị / Giáo Viên

Trong trường hợp máy tính học sinh bị sự cố mạng hoặc cần can thiệp kỹ thuật khẩn cấp trong lúc thi:

> 🔑 **Tổ hợp phím thoát Kiosk khẩn cấp:**  
> Bấm đồng thời: **`Ctrl + Shift + Alt + F12`**

Hệ thống sẽ lập tức giải phóng chế độ toàn màn hình và cho phép giám thị thao tác bình thường trên máy tính.

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Tình huống | Nguyên nhân | Cách xử lý |
|---|---|---|
| **Máy HS không tự động bật cửa sổ khi GV mở phiên** | Tường lửa Windows trên máy HS chặn cổng UDP 54321 | Chạy lệnh sau bằng quyền Administrator: <br>`netsh advfirewall firewall add rule name="EduClass Student Discovery" dir=in action=allow protocol=UDP localport=54321 profile=any` |
| **Mạng WiFi trường bật chế độ AP Isolation (cách ly client)** | Router WiFi ngăn các máy trong mạng nhìn thấy nhau | Mở cửa sổ EduClass HS $\rightarrow$ Bấm *"Nhập địa chỉ máy chủ thủ công"* $\rightarrow$ Gõ IP máy giáo viên (vd `192.168.1.15`). Hoặc GV bật Hotspot trên laptop cho cả lớp bắt. |
| **Học sinh vô tình tắt mất app chạy ngầm** | Học sinh bấm Exit trong khay hệ thống | Click đúp icon `EduClass Học Sinh` ngoài màn hình Desktop để kích hoạt lại. |
