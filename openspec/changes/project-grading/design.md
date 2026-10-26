# Thiết kế Kỹ thuật: Chấm điểm Dự án Đa chiều & Quản lý Nhóm Lớp học

## 1. Kiến trúc Tổng thể (Overall Architecture)

Tính năng bao gồm 2 phân hệ liên kết chặt chẽ:
1. **Phân hệ Quản lý Nhóm Lớp học (Class Group Management):** Tồn tại lâu dài ở mức Lớp học (`ClassTab`), lưu trong CSDL SQLite.
2. **Phân hệ Hoạt động Chấm điểm Dự án (Project Grading Activity):** Plugin Activity thời gian thực độc lập (`@educlass/activity-project-grading`), nạp cấu hình nhóm từ lớp học, điều phối chấm tự do, tổng hợp điểm số và xuất báo cáo.

```
+-------------------------------------------------------------------------------+
|                               TEACHER DESKTOP                                 |
|  +---------------------------+       +-------------------------------------+  |
|  |   ClassTab (Quản lý Lớp)  |       | ActivityPanel (Chấm điểm Dự án)     |  |
|  | - Chia đều ngẫu nhiên 4 tổ|       | - Nạp nhóm từ Lớp                   |  |
|  | - Kéo thả chuyển nhóm     |       | - Cài đặt trọng số (10-20-20-50%)   |  |
|  | - Chọn Nhóm trưởng ⭐     |       | - Bảng ma trận điểm Realtime        |  |
|  +-------------+-------------+       | - Nhập điểm GV & Xuất Excel         |  |
|                |                     +------------------+------------------+  |
+----------------|----------------------------------------|---------------------+
                 | REST API                               | WebSocket Intent
                 v                                        v
+-------------------------------------------------------------------------------+
|                             SERVER (Fastify + WS)                             |
|  - SQLite: `class_groups`, `students.group_id`                                |
|  - Activity Plugin Registry: `@educlass/activity-project-grading`             |
|  - Realtime State Store: Quản lý ma trận điểm và phát state patch              |
+-------------------------------------------------------------------------------+
                 ^                                        ^
                 | WebSocket Intent                       | WebSocket Intent
+----------------+-------------+       +------------------+------------------+
|      STUDENT UI (Thành viên) |       |      STUDENT UI (Nhóm trưởng ⭐)    |
| - [1] Tự chấm điểm cá nhân   |       | - [1] Tự chấm điểm cá nhân          |
| - Nút [Đổi học sinh khác 🔁] |       | - [2] Chấm từng thành viên nhóm     |
|                              |       | - [3] Chấm chéo các nhóm khác       |
|                              |       | - Nút [Đổi học sinh khác 🔁]        |
+------------------------------+       +-------------------------------------+
```

---

## 2. Mô hình Dữ liệu (Database Schema)

### 2.1 Bảng `class_groups` (Nhóm trong lớp học)
```sql
CREATE TABLE class_groups (
  id TEXT PRIMARY KEY,                       -- ULID
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- "Nhóm 1", "Nhóm 2", "Tổ 1", ...
  order_index INTEGER NOT NULL DEFAULT 0,
  leader_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_class_groups_class_id ON class_groups(class_id);
```

### 2.2 Cập nhật bảng `students`
Bổ sung cột `group_id`:
```sql
ALTER TABLE students ADD COLUMN group_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_students_group_id ON students(group_id);
```

---

## 3. Hoạt động Chấm điểm Dự án (`@educlass/activity-project-grading`)

### 3.1 Cấu hình hoạt động (`ProjectGradingConfig`)
```ts
export interface ProjectGradingWeights {
  self: number;        // Trọng số điểm cá nhân tự chấm (vd: 10)
  teamMember: number;  // Trọng số điểm tổ trưởng chấm thành viên (vd: 20)
  crossTeam: number;   // Trọng số điểm các nhóm khác chấm chéo (vd: 20)
  teacher: number;     // Trọng số điểm giáo viên chấm (vd: 50)
}

export interface ProjectGradingGroupConfig {
  id: string;                      // Mã nhóm trong phiên
  name: string;                    // Tên nhóm (Nhóm 1, Nhóm 2...)
  leaderParticipantId: string | null; // Participant ID của nhóm trưởng
  leaderDisplayName: string | null;
  memberParticipantIds: string[];  // Danh sách participant ID thành viên
}

export interface ProjectGradingConfig {
  title: string;                   // Tiêu đề dự án (vd: Báo cáo Dự án Stem)
  maxScore: number;                // Thang điểm (mặc định 10.0)
  stepScore: number;               // Bước nhảy điểm (mặc định 0.5 hoặc 0.1)
  weights: ProjectGradingWeights;  // Trọng số 4 cột điểm
  groups: ProjectGradingGroupConfig[];
  allowFeedbackComment: boolean;   // Cho phép viết nhận xét
}
```

### 3.2 Trạng thái hoạt động thời gian thực (`ProjectGradingState`)
```ts
export interface GradeEntry {
  score: number;
  comment?: string;
  updatedAt: number;
}

export interface ProjectGradingState {
  status: 'grading' | 'frozen' | 'ended';
  config: ProjectGradingConfig;

  // [1] Điểm cá nhân tự chấm: participantId -> GradeEntry
  selfGrades: Record<string, GradeEntry>;

  // [2] Điểm tổ trưởng chấm thành viên: leaderParticipantId -> Record<memberParticipantId, GradeEntry>
  teamMemberGrades: Record<string, Record<string, GradeEntry>>;

  // [3] Điểm nhóm trưởng chấm chéo nhóm khác: leaderParticipantId -> Record<targetGroupId, GradeEntry>
  crossTeamGrades: Record<string, Record<string, GradeEntry>>;

  // [4] Điểm giáo viên chấm:
  // - Cho từng nhóm: groupId -> GradeEntry
  // - Cho từng học sinh cá nhân (tùy chọn ghi đè): participantId -> GradeEntry
  teacherGroupGrades: Record<string, GradeEntry>;
  teacherStudentGrades: Record<string, GradeEntry>;
}
```

---

## 4. Công thức Tính điểm Tổng kết (Weighted Scoring Algorithm)

Với mỗi học sinh $p$ thuộc nhóm $g$ có nhóm trưởng là $L_g$:

1. **Điểm tự đánh giá cá nhân ($S_{self}$):**
   $$S_{self} = \text{selfGrades}[p]?.score \quad (\text{nếu chưa chấm: } 0 \text{ hoặc bỏ qua trọng số})$$

2. **Điểm tổ trưởng chấm ($S_{team}$):**
   * Nếu $p \neq L_g$ (thành viên):
     $$S_{team} = \text{teamMemberGrades}[L_g]?[p]?.score$$
   * Nếu $p = L_g$ (chính nhóm trưởng):
     $$S_{team} = S_{self} \quad (\text{hoặc trung bình điểm tổ trưởng tự nhận})$$

3. **Điểm các nhóm khác chấm chéo ($S_{cross}$):**
   Trung bình cộng điểm từ các nhóm trưởng của tất cả các nhóm khác $k \neq g$:
   $$S_{cross} = \frac{\sum_{k \neq g, L_k \in Leaders} \text{crossTeamGrades}[L_k]?[g]?.score}{N_{\text{nhóm đã chấm chéo}}}$$

4. **Điểm giáo viên ($S_{teacher}$):**
   Ưu tiên điểm GV chấm riêng cho cá nhân nếu có, ngược lại lấy điểm GV chấm cho nhóm $g$:
   $$S_{teacher} = \text{teacherStudentGrades}[p]?.score \;\; ?? \;\; \text{teacherGroupGrades}[g]?.score$$

5. **Điểm tổng kết chuẩn hóa ($Score_{final}$):**
   $$Score_{final} = \frac{W_1 \cdot S_{self} + W_2 \cdot S_{team} + W_3 \cdot S_{cross} + W_4 \cdot S_{teacher}}{W_1 + W_2 + W_3 + W_4}$$
   * Kết quả được làm tròn đến 1 chữ số thập phân (ví dụ: `8.7`).
   * Điểm EXP thưởng quy đổi tỉ lệ thuận với điểm số đạt được:
     $$EXP = \text{Round}\left(\frac{Score_{final}}{MaxScore} \times EXP_{config}\right)$$

---

## 5. Luồng Trải nghiệm Đổi học sinh (Kiosk / Shared Device Mode)

```
[Bắt đầu] 
   |
   v
[Học sinh A chọn tên / PIN] 
   |
   v
[Vào màn hình Chấm điểm Dự án]
   |- Nếu là Thành viên: Chỉ thấy Form [Tự đánh giá cá nhân]
   |- Nếu là Nhóm trưởng ⭐: Thấy 3 tab: [Tự chấm] | [Chấm thành viên] | [Chấm nhóm bạn]
   |
   v
[Bấm: Lưu & Hoàn thành đánh giá]
   |
   v
[Màn hình xác nhận thành công]
   +------------------------------------------------------+
   |  🎉 Bạn đã hoàn thành phần đánh giá của mình!        |
   |                                                      |
   |  [🔁 HOÀN THÀNH & ĐỔI HỌC SINH KHÁC] (Vùng chạm to)  |
   +------------------------------------------------------+
   |
   v (Click đổi người)
- Client gọi xóa `educlass_participant_token` trong localStorage.
- Giữ nguyên `joinCode` của phiên học hiện tại.
- Reset state client về màn hình chọn danh tính (`identity`).
- Hiển thị danh sách học sinh của lớp: Học sinh A hiển thị badge xanh `✓ Đã nộp`.
- Học sinh B tiếp tục chạm chọn tên mình và thực hiện chấm.
```

---

## 6. Giao diện Người dùng (UI/UX Design)

### 6.1 Tab Quản lý Nhóm Lớp học (`ClassTab`)
- **Bộ 4 cột thẻ nhóm trực quan:**
  - `Nhóm 1` (Tổ 1), `Nhóm 2` (Tổ 2), `Nhóm 3` (Tổ 3), `Nhóm 4` (Tổ 4) và cột `Chưa phân nhóm` (nếu có).
  - Mỗi thẻ học sinh hiển thị: Avatar, Họ tên, Mã định danh, Huy hiệu ⭐ Nhóm trưởng.
- **Thanh công cụ thao tác nhanh:**
  - `[🎲 Chia đều ngẫu nhiên]`: Modal cho phép chọn số nhóm (mặc định 4) -> Click -> Chia đều tức thì và tự động đề xuất nhóm trưởng.
  - `[⭐ Đặt làm nhóm trưởng]`: Bấm icon ngôi sao cạnh tên bất kỳ học sinh nào trong nhóm để chuyển vai trò nhóm trưởng.
  - `[⇄ Chuyển nhóm]`: Dropdown chọn nhanh nhóm mới hoặc kéo thả mượt mà.

### 6.2 Giao diện Điều khiển Giáo viên (`ActivityPanel`)
- **Thanh tiến độ 4 vòng (Realtime Progress Rings):**
  - Tự chấm: `38/40 HS (95%)`
  - Nhóm trưởng chấm thành viên: `4/4 Nhóm (100%)`
  - Nhóm trưởng chấm chéo: `4/4 Nhóm (100%)`
  - Điểm GV: `4/4 Nhóm`
- **Bảng ma trận điểm tổng hợp:**
  - Gom nhóm theo từng Tổ/Nhóm học sinh.
  - Cột: STT | Họ và tên | Vai trò | Điểm Tự chấm | Điểm Nhóm chấm | Điểm Chéo | Điểm GV | **Tổng kết** | Thao tác.
  - Ô điểm GV cho phép nhập trực tiếp dạng input inline nhanh chóng.
- **Nút hành động:**
  - `[🔒 Khóa chấm]` / `[🔓 Mở chấm lại]`
  - `[🖥 Chiếu vinh danh (Projector)]`
  - `[📥 Xuất Excel Báo cáo]`
