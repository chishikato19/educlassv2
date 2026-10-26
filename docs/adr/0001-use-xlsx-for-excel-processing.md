# ADR 0001: Sử dụng thư viện `xlsx` (SheetJS) để xử lý file Excel (.xlsx)

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày:** 2026-10-05
- **Tác giả:** EduClass Core Team

## Ngữ cảnh
Kế hoạch tổng thể `docs/PLAN.md` đặt ra các yêu cầu xử lý bảng tính:
- **Task 1.3:** Import file `.xlsx` danh sách học sinh vào lớp.
- **Task 3.4 & 4.4:** Xuất báo cáo điểm, kết quả thi và phân tích câu sai ra định dạng Excel (.xlsx).

Mục 1 Quyết định D9 liệt kê các công nghệ chính (TypeScript, Fastify, SQLite, React, Vite...) nhưng chưa chỉ định cụ thể thư viện đọc/ghi bảng tính Excel offline. Theo luật `AGENTS.md`: *"Không thêm thư viện mới nếu chưa nêu trong D9, trừ khi ghi ADR"*.

## Quyết định
Chọn thư viện `xlsx` (SheetJS) làm giải pháp tiêu chuẩn xử lý file bảng tính Excel trong hệ thống EduClass:
1. Thư viện hoạt động 100% ngoại tuyến (offline), không phụ thuộc vào Microsoft Office, kết nối mạng hay dịch vụ đám mây.
2. Hỗ trợ đọc cả buffer file `.xlsx` khi người dùng upload từ trình duyệt và parse trực tiếp thành mảng dữ liệu.
3. Hỗ trợ tạo và xuất file `.xlsx` cho các báo cáo thống kê ở các chặng tiếp theo.

## Hệ quả
- Thêm `xlsx` vào danh sách `dependencies` của `@educlass/server`.
- Cần cấu hình và bọc logic đọc bảng tính trong service chuyên trách để kiểm tra kiểu và validate bằng Zod trước khi đưa vào cơ sở dữ liệu.
