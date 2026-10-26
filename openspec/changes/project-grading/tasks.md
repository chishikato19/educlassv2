# Danh sách Công việc Triển khai: Chấm điểm Dự án Đa chiều & Quản lý Nhóm Lớp học

## Giai đoạn 1: Cơ sở Dữ liệu & Giao thức (DB & Protocol)

- [x] 1.1 **Cập nhật Schema Database (`packages/db`)**:
  - Thêm bảng `class_groups` vào `packages/db/src/schema/index.ts` (id, classId, name, orderIndex, leaderStudentId, createdAt).
  - Bổ sung cột `groupId` vào bảng `students` liên kết tới `class_groups`.
  - Tạo migration an toàn cho SQLite `0006_class_groups_schema.sql` và tích hợp `migrator.ts`.
  - Viết repository `ClassGroupRepository` và cập nhật `StudentRepository`: lấy nhóm theo lớp, chia đều ngẫu nhiên theo số nhóm tùy chỉnh, chuyển nhóm, đổi nhóm trưởng.

- [x] 1.2 **Định nghĩa DTO & Zod Schemas (`packages/protocol`)**:
  - Tạo `packages/protocol/src/class-groups.ts`:
    - `ClassGroupDto`, `CreateClassGroupRequest`, `UpdateClassGroupRequest`, `AssignGroupLeaderRequest`, `RandomizeGroupsRequest` (hỗ trợ số nhóm tùy chỉnh `groupCount: 2..30`).
  - Tạo `packages/protocol/src/project-grading.ts`:
    - `ProjectGradingWeightsSchema`, `ProjectGradingConfigSchema`, `ProjectGradingStateSchema`, `GradeEntrySchema`, các intents chấm tự do `SubmitSelfGradeIntent`, `SubmitTeamMemberGradeIntent`, `SubmitCrossTeamGradeIntent`, `SubmitTeacherGradeIntent`.
  - Bổ sung `groupId` vào `StudentDtoSchema` trong `packages/protocol/src/student.ts`.
  - Export trong `packages/protocol/src/index.ts`.

---

## Giai đoạn 2: Quản lý Nhóm trong Lớp học (Backend API & Teacher UI)

- [x] 2.1 **Xây dựng Backend REST API cho Nhóm Lớp học (`packages/server`)**:
  - `GET /api/classes/:id/groups`: Danh sách nhóm kèm danh sách thành viên và nhóm trưởng.
  - `POST /api/classes/:id/groups`: Tạo nhóm mới (hoặc khởi tạo 4 nhóm mặc định).
  - `POST /api/classes/:id/groups/randomize`: Chia đều ngẫu nhiên toàn bộ học sinh lớp vào $N$ nhóm.
  - `PUT /api/students/:id/group`: Di chuyển học sinh sang nhóm mới.
  - `PUT /api/groups/:id/leader`: Chỉ định hoặc đổi nhóm trưởng.
  - `DELETE /api/groups/:id`: Xóa nhóm (đưa học sinh về trạng thái chưa phân nhóm).

- [x] 2.2 **Giao diện Quản lý Nhóm trong `ClassTab` (`apps/teacher-ui`)**:
  - Thêm tab phụ / chế độ xem "Tổ / Nhóm học tập" trong màn hình chi tiết Lớp học.
  - Hiển thị 4 cột nhóm dạng thẻ trực quan (Card layout).
  - Nút bấm `[🎲 Chia đều ngẫu nhiên]` (hộp thoại chọn 4 nhóm, chạy animation chia mượt mà).
  - Tính năng chuyển nhóm: Kéo thả hoặc bấm nút `[⇄ Chuyển nhóm]` trên từng học sinh.
  - Nút bấm vương miện/ngôi sao `[⭐]` để chọn hoặc đổi Nhóm trưởng.

---

## Giai đoạn 3: Xây dựng Module Hoạt động Chấm điểm Dự án (`@educlass/activity-project-grading`)

- [x] 3.1 **Tạo Package Mới `packages/activities/project-grading`**:
  - Khởi tạo `package.json`, `tsconfig.json` tuân thủ chuẩn plugin Activity của EduClass v2.
  - Khai báo triển khai `ActivityModule<ProjectGradingConfig, ProjectGradingState, ProjectGradingResult>`.
  - Đăng ký plugin trong `packages/server/src/registry.ts`.

- [x] 3.2 **Xử lý State Machine & Intents ở Server (`server.ts`)**:
  - `onStart`: Khởi tạo state chấm tự do với cấu hình trọng số và danh sách nhóm.
  - `onStudentIntent`: Xử lý lưu điểm cá nhân, điểm tổ trưởng chấm thành viên, điểm chấm chéo nhóm khác (validate quyền hạn và thang điểm).
  - `onTeacherIntent`: Xử lý giáo viên nhập điểm (theo nhóm hoặc cá nhân), khóa/mở chấm.
  - `onEnd`: Tổng hợp điểm cuối cùng theo công thức trọng số, trả về kết quả xếp hạng.

---

## Giai đoạn 4: Giao diện Học sinh & Luồng Đổi Học sinh (Student UI & Kiosk Mode)

- [x] 4.1 **Màn hình Học sinh Chấm điểm Dự án (`StudentView.tsx`)**:
  - Kiểm tra vai trò:
    - Nếu là thành viên: Hiển thị form tự chấm điểm cá nhân (thang 0-10, vùng chạm $\ge 48$px, ô nhận xét).
    - Nếu là nhóm trưởng ⭐: Hiển thị 3 tab rõ ràng (Tự chấm, Chấm thành viên nhóm mình, Chấm các nhóm bạn).
  - Phản hồi lưu điểm ngay lập tức (optimistic UI) kèm xác nhận từ WebSocket.

- [x] 4.2 **Cơ chế Đổi Học sinh trên Cùng Thiết bị (Kiosk / Shared Device)**:
  - Khi hoàn thành gửi điểm, hiển thị màn hình chúc mừng với nút to rõ:
    **`[🔁 Hoàn thành & Đổi học sinh khác]`**.
  - Xử lý xóa token phiên trong `localStorage`, giữ nguyên mã lớp `joinCode`, chuyển mượt về danh sách chọn tên học sinh.
  - Đánh dấu huy hiệu xanh `[✓ Đã chấm]` cạnh tên học sinh đã nộp để học sinh sau không chọn nhầm.

---

## Giai đoạn 5: Màn hình Giáo viên, Tổng kết & Xuất Excel (Teacher Panel & Projector)

- [x] 5.1 **Giao diện Điều khiển Giáo viên (`TeacherPanel.tsx`)**:
  - Modal bắt đầu hoạt động:
    - Nút **"Lấy nhóm từ Lớp học"** nạp cấu hình nhóm và nhóm trưởng sẵn có.
    - Cấu hình trọng số % cho 4 cột điểm (Cá nhân, Nội bộ, Chéo, GV - tổng 100%).
  - Bảng điều khiển thời gian thực (Realtime Dashboard):
    - 4 vòng tròn tiến độ nộp bài (HS tự chấm, Nhóm trưởng chấm nội bộ, Nhóm trưởng chấm chéo, Điểm GV).
    - Bảng ma trận điểm tổng hợp từng nhóm, từng học sinh.
    - Cho phép GV nhập điểm nhanh trực tiếp vào ô điểm GV.
  - Nút `[Khóa chấm / Chốt điểm]`.

- [x] 5.2 **Màn hình Chiếu Vinh danh (`ProjectorView.tsx`)**:
  - Màn hình chữ lớn dành cho máy chiếu lớp học: Top nhóm có điểm dự án cao nhất, biểu đồ so sánh 4 nhóm.

- [x] 5.3 **Xuất Báo cáo Excel Bảng điểm Dự án**:
  - Tích hợp hàm xuất file Excel bảng tổng hợp đầy đủ 4 cột điểm, điểm tổng kết, xếp loại và nhận xét.

---

## Giai đoạn 6: Kiểm thử & Nghiệm thu (Verification & Polish)

- [x] 6.1 Unit test thuật toán chia nhóm đều ngẫu nhiên và công thức tính điểm trọng số.
- [x] 6.2 Kiểm tra Typecheck toàn diện (`pnpm run typecheck`).
- [x] 6.3 Kiểm tra hiển thị responsive trên thiết bị di động (viewport 360×640) và máy tính phòng tin học.
