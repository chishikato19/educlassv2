# Thiết kế Kỹ thuật: Ghép 2–3 Học sinh ngồi chung một máy (Multi-Student Device Pairing)

## 1. Kiến trúc Tổng thể (Overall Architecture)

```
+---------------------------------------------------------------------------------------+
|                                    TEACHER DESKTOP                                    |
|   Modal Mở Phiên Học:                                                                 |
|   [v] Cho phép ghép 2–3 học sinh chung 1 máy                                          |
|   Giới hạn: [ Tối đa 2 bạn v ]                                                        |
+-------------------------------------------+-------------------------------------------+
                                            | REST API: POST /api/sessions
                                            v
+---------------------------------------------------------------------------------------+
|                                SERVER (Fastify + WS)                                  |
|  - Schema `sessions.settings_json`: `{ allowPairing: true, maxStudentsPerDevice: 2 }`  |
|  - Bảng `participants`: lưu `student_ids_json: '["std_1", "std_2"]'`                  |
|  - Endpoint `/api/sessions/join`: Khóa đồng thời (Atomic Lock) các bạn được chọn      |
|  - Module Rewards Fan-out: Tự động cộng EXP cho TẤT CẢ học sinh trong máy             |
+-------------------------------------------+-------------------------------------------+
                                            ^
                                            | REST API: POST /api/sessions/join
                                            | (Gửi kèm: studentIds: ["std_1", "std_2"])
+-------------------------------------------+-------------------------------------------+
|                                    STUDENT PWA                                        |
|  Màn hình Chọn Danh Tính (PickIdentity):                                              |
|  +---------------------------------------------------------------------------------+  |
|  |  Đã chọn: [ Đỗ Nam Anh (x) ] [ Trần Văn Bình (x) ]                              |  |
|  |  [ Ô lọc tìm kiếm: An...                    ]                                   |  |
|  |  ( ) Đỗ Nam Anh        ( ) Trần Văn Bình       ( ) Lê Thu Cúc                    |  |
|  |                                                                                 |  |
|  |  [ NÚT CHÍNH: VÀO LỚP CHO 2 BẠN (Nam Anh & Văn Bình) -> ]                        |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Thiết kế Giao thức & DTO (`packages/protocol`)

### 2.1 Cập nhật `SessionSettingsSchema`

Mở rộng cấu hình phiên học:

```ts
export const SessionSettingsSchema = z.object({
  maxParticipants: z.number().int().positive().optional(),
  allowChat: z.boolean().default(true),
  allowLateJoin: z.boolean().default(true),
  // Cấu hình ghép máy
  allowPairing: z.boolean().default(false),
  maxStudentsPerDevice: z.union([z.literal(2), z.literal(3)]).default(2),
});
```

### 2.2 Cập nhật `StudentJoinRequestSchema`

Hỗ trợ gửi mảng `studentIds` và từ điển `pins`:

```ts
export const StudentJoinRequestSchema = z
  .object({
    joinCode: z.string().length(6),
    studentId: z.string().min(1).optional(), // Dành cho phiên cá nhân đơn lẻ
    studentIds: z.array(z.string().min(1)).optional(), // Dành cho phiên ghép máy 2-3 bạn
    nickname: z.string().min(1).max(50).optional(),
    pin: z.string().optional(), // PIN đơn
    pins: z.record(z.string(), z.string()).optional(), // Map: { [studentId]: pin }
    teamName: z.string().min(1).max(30).optional(),
  })
  .refine(
    data =>
      Boolean(data.studentId || (data.studentIds && data.studentIds.length > 0) || data.nickname),
    {
      message: 'Vui lòng chọn học sinh trong danh sách hoặc nhập nickname.',
      path: ['studentIds'],
    }
  );
```

### 2.3 Cập nhật `ParticipantDtoSchema`

Bổ sung mảng `studentIds` để client và server cùng nhận diện các học sinh thuộc máy:

```ts
export const ParticipantDtoSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  studentId: z.string().nullable().optional(), // ID đại diện chính (học sinh đầu tiên)
  studentIds: z.array(z.string()).default([]), // Danh sách toàn bộ các học sinh trên máy
  displayName: z.string().min(1), // Tên ghép hiển thị
  identityLevel: IdentityLevelSchema,
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  status: ParticipantStatusSchema,
  joinedAt: z.number().int().positive(),
});
```

### 2.4 Cập nhật `SessionRosterResponseSchema`

Bổ sung cờ cấu hình ghép máy xuống cho Client:

```ts
export const SessionRosterResponseSchema = z.object({
  sessionId: z.string().min(1),
  className: z.string().nullable().optional(),
  identityMode: IdentityModeSchema,
  allowTeams: z.boolean(),
  allowPairing: z.boolean().default(false),
  maxStudentsPerDevice: z.number().default(2),
  students: z.array(StudentRosterItemSchema),
});
```

---

## 3. Thiết kế Cơ sở Dữ liệu (`packages/db`)

### 3.1 Bảng `participants`

Thêm cột `student_ids_json` dạng `text`:

```sql
ALTER TABLE participants ADD COLUMN student_ids_json TEXT;
```

- Giá trị lưu trữ: JSON array các chuỗi ULID, ví dụ: `'["01JABC...", "01JXYZ..."]'`.
- Tương thích ngược: Nếu `student_ids_json` null hoặc rỗng, hệ thống tự động fallback về `[studentId]`.

---

## 4. Xử lý Nghiệp vụ Phía Server (`packages/server`)

### 4.1 Quy trình Xử lý Vào lớp (`POST /api/sessions/join`)

1. **Trích xuất danh sách học sinh:**
   - Nếu client gửi `studentIds`, lấy mảng `targetStudentIds = Array.from(new Set(studentIds))`.
   - Kiểm tra ràng buộc số lượng: `targetStudentIds.length <= maxStudentsPerDevice`.
2. **Kiểm tra hợp lệ:**
   - Tra cứu toàn bộ các học sinh từ `studentRepo.findByIds(targetStudentIds)`.
   - Đảm bảo tất cả các học sinh đều thuộc `session.classId`.
3. **Kiểm tra chống chọn trùng (D7 Atomic Lock):**
   - Lấy danh sách các `onlineParticipants` trong phiên.
   - Tập hợp các `takenStudentIds` từ các participant đang online.
   - Nếu bất kỳ `targetStudentId` nào nằm trong `takenStudentIds`, trả về lỗi:
     `NAME_TAKEN: "Học sinh [Tên bạn bị trùng] đang được bạn khác đăng nhập."`.
4. **Xác thực mã PIN:**
   - Đối với mỗi học sinh có `passwordHash`:
     - Lấy mã PIN tương ứng từ payload `pins[studentId]` hoặc `pin`.
     - Dùng `passwordHasher.verify()` để kiểm tra. Nếu sai, trả về lỗi `INVALID_PIN`.
5. **Khởi tạo Participant:**
   - Ghép họ tên: `displayName = students.map(s => s.fullName).join(' & ')`.
   - Lưu `studentIdsJson: JSON.stringify(targetStudentIds)`.
   - Cấp `participantToken` lưu trữ phiên làm việc của máy.

### 4.2 Cơ chế Thưởng EXP Tự động (Rewards Fan-out - D8)

Khi Activity gọi `ctx.grantReward(participantId, trigger, qty)`:

1. Server tra cứu bản ghi Participant để lấy danh sách `studentIds`.
2. Duyệt qua từng `studentId`:
   - Kiểm tra quyền lợi lưu trữ vĩnh viễn (`identityLevel === 'account'`).
   - Gọi `rewards.grant(studentId, trigger, qty)`.
   - Cộng `exp` vào bảng `students` cho từng học sinh trong cùng transaction.
   - Ghi bản ghi `reward_log` riêng biệt cho từng bạn.
   - Kiểm tra điều kiện tăng cấp `level` và danh hiệu `titles`.
3. Bắn sự kiện realtime `educlass:reward_granted` xuống client để hiển thị hiệu ứng chúc mừng cho cả máy.

---

## 5. Thiết kế Giao diện Người dùng (UX/UI)

### 5.1 Giao diện Giáo viên (`apps/teacher-ui`)

- **Modal Mở phiên học (`SessionControl.tsx`):**
  - Thêm cụm điều khiển:
    ```tsx
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="checkbox"
        checked={allowPairing}
        onChange={e => setAllowPairing(e.target.checked)}
      />
      <span>Cho phép ghép 2–3 học sinh ngồi chung 1 máy</span>
    </label>;
    {
      allowPairing && (
        <div style={{ marginLeft: '24px', marginTop: '6px' }}>
          <span>Tối đa mỗi máy: </span>
          <select
            value={maxStudentsPerDevice}
            onChange={e => setMaxStudentsPerDevice(Number(e.target.value))}
          >
            <option value={2}>2 học sinh / máy (Đôi bạn cùng tiến)</option>
            <option value={3}>3 học sinh / máy (Nhóm nhỏ)</option>
          </select>
        </div>
      );
    }
    ```

### 5.2 Giao diện Học sinh (`apps/student-ui`)

- **Khay thẻ học sinh đã chọn (Chips Bar):**
  - Nằm cố định ngay phía trên danh sách chọn tên.
  - Mỗi thẻ hiển thị: `[ 👤 Họ và tên  ✕ ]`.
  - Bấm vào dấu `✕` để bỏ chọn ngay lập tức.
- **Danh sách học sinh:**
  - Học sinh đã được chọn: Đổi màu nền xanh dương nhạt (`#E8F1FF`), viền xanh đậm kèm icon tích xanh `✓`.
  - Học sinh đang bị máy khác chiếm (`isTaken`): Màu xám mờ + nhãn _"Đang online"_.
- **Nút hành động chính:**
  - Tự động thay đổi kích thước và nội dung:
    - Chưa chọn bạn nào: `Vui lòng chọn học sinh` (disabled).
    - Đã chọn 1 bạn: `Vào lớp (1 học sinh: Nam Anh)`.
    - Đã chọn 2 bạn: `Vào lớp cho 2 bạn (Nam Anh & Văn Bình)`.
