# Hướng dẫn Phát triển Activity Plugin (activity-guide.md)

Tài liệu này là chuẩn mực bắt buộc cho việc xây dựng các tiện ích tương tác, trò chơi lớp học và hoạt động thời gian thực (**Activity Plugins**) trong dự án **EduClass v2**.

---

## 1. Triết lý Thiết kế (Design Principles)

Theo quy định **D12** trong `docs/PLAN.md`:
> **Mỗi Activity = 1 plugin theo hợp đồng mục 4 PLAN.md. Thêm tiện ích KHÔNG được sửa mã nguồn lõi (Core Engine).**

Các nguyên tắc bắt buộc:
1. **Server-Authoritative**: Mọi trạng thái (State) chỉ thay đổi ở Server. Client chỉ gửi **Intent** (ý định hành động).
2. **Context Cô lập (Isolation)**: Activity chỉ tương tác với môi trường thông qua `ActivityContext` (`ctx`). **TUYỆT ĐỐI CẤM** Activity truy cập trực tiếp cơ sở dữ liệu (DB), bảng SQLite, hoặc WebSocket socket thô.
3. **Thưởng EXP qua Lõi**: Mọi điểm EXP chỉ được cấp qua `ctx.grantReward()` để chạy qua `core/rewards.grant()`. Không được tự ý sửa điểm học sinh.
4. **Zod Validation trên mọi ranh giới**: Cấu hình (`configSchema`), trạng thái (`stateSchema`), kết quả (`resultSchema`) đều phải validate nghiêm ngặt bằng Zod.
5. **Offline 100%**: Không dùng CDN, không phụ thuộc kết nối Internet.

---

## 2. Cấu trúc Thư mục Chuẩn của 1 Activity Plugin

Mỗi Activity được đặt trong một gói pnpm độc lập tại thư mục `packages/activities/<id>/`:

```
packages/activities/quick-poll/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                # Entrypoint xuất khẩu toàn bộ module
    ├── poll-activity.ts        # Schemas & Logic vòng đời Server
    ├── poll-views.tsx          # Giao diện React (StudentView, TeacherPanel)
    └── __tests__/
        └── quick-poll.test.tsx # Unit tests kiểm thử toàn diện
```

### File `package.json` mẫu:
```json
{
  "name": "@educlass/activity-quick-poll",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@educlass/protocol": "workspace:*",
    "@educlass/core": "workspace:*",
    "zod": "^3.24.2"
  },
  "peerDependencies": {
    "react": "^18.3.1"
  }
}
```

---

## 3. Hợp đồng Activity Module (`ActivityDefinition`)

Một Activity Module chuẩn cài đặt interface `ActivityDefinition<Cfg, St, Res>` từ `@educlass/core`:

```ts
import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import { z } from 'zod';

export const QuickPollActivity: ActivityDefinition<
  QuickPollConfig,
  QuickPollState,
  QuickPollResult
> = {
  id: 'quick-poll',                     // Mã định danh duy nhất (slug)
  name: 'Bình Chọn Nhanh',              // Tên hiển thị tiếng Việt
  version: 1,                           // Phiên bản tăng dần
  icon: '📊',                           // Emoji hoặc SVG icon đại diện
  description: 'Thăm dò ý kiến thời gian thực trong lớp học',
  capabilities: ['screen'],             // Khả năng: 'files' | 'screen' | 'chat-lock'
  rewardTriggers: ['participation'],    // Các sự kiện kích hoạt thưởng EXP

  // Schemas Zod bắt buộc
  configSchema: QuickPollConfigSchema,
  stateSchema: QuickPollStateSchema,
  resultSchema: QuickPollResultSchema,

  // Các hàm xử lý vòng đời phía Server
  server: {
    onStart(ctx: ActivityContext, cfg: QuickPollConfig): QuickPollState { ... },
    onStudentIntent(ctx: ActivityContext, st: QuickPollState, participantId: string, intent: unknown): QuickPollState | ActivityReject { ... },
    onTeacherIntent(ctx: ActivityContext, st: QuickPollState, intent: unknown): QuickPollState { ... },
    onEnd(ctx: ActivityContext, st: QuickPollState): QuickPollResult[] { ... },
  },
};
```

---

## 4. Ngữ cảnh Thực thi (`ActivityContext`)

`ctx` được truyền vào tất cả các hàm vòng đời server của Activity:

```ts
export interface ActivityContext {
  sessionId: string;            // ID phiên học hiện tại
  runId: string;                // ID của lượt chạy Activity này
  now(): number;                // Timestamp hiện tại (ms)
  rng(): number;                // Hàm sinh số ngẫu nhiên [0, 1) có kiểm soát
  broadcast(payload: unknown): void; // Phát sóng trạng thái tới toàn bộ học sinh
  sendToParticipant(participantId: string, payload: unknown): void; // Gửi riêng
  grantReward(participantId: string, trigger: string, qty?: number): Promise<void> | void; // Thưởng EXP
}
```

> [!IMPORTANT]
> **Quy tắc thưởng EXP**:
> Khi một hành động của học sinh thỏa mãn điều kiện thưởng (ví dụ: trả lời đúng, nộp bài hoàn thành, lọt top 3), hãy gọi:
> `void ctx.grantReward(participantId, 'correct_answer', 10);`
> Hệ thống Core sẽ tự động kiểm tra loại tài khoản (chỉ lưu vĩnh viễn với `account`), tính toán thăng cấp Level, và ghi nhật ký `reward_log`.

---

## 5. Chi tiết Vòng đời Server

### 5.1 `onStart(ctx, cfg): St`
- Gọi một lần duy nhất khi Giáo viên bắt đầu lượt chạy.
- Khởi tạo và trả về đối tượng State ban đầu.
- State này sẽ được Engine tự động phát sóng (`activity_start` & `activity_state`) tới các client qua WebSocket.

### 5.2 `onStudentIntent(ctx, st, participantId, intent): St | ActivityReject`
- Gọi khi Học sinh gửi một Intent (qua WebSocket hoặc REST).
- Cần validate `intent` bằng Zod schema.
- **Nếu Intent không hợp lệ hoặc điều kiện không cho phép** (ví dụ: trò chơi đã bị khóa, lượt đã hết giờ):
  Trả về đối tượng từ chối:
  ```ts
  return {
    ok: false,
    reason: 'Bình chọn đã bị khóa bởi giáo viên',
    code: 'POLL_LOCKED',
  };
  ```
- **Nếu Intent hợp lệ**:
  Tính toán và trả về State mới. Engine sẽ tự động tăng số hiệu `revision` và broadcast State mới cho cả lớp.

### 5.3 `onTeacherIntent(ctx, st, intent): St`
- Gọi khi Giáo viên điều khiển hoạt động (ví dụ: chuyển câu hỏi, khóa/mở nhận bài, reset kết quả).
- Trả về State mới để cập nhật cho toàn phiên.

### 5.4 `onEnd(ctx, st): Res[]`
- Gọi khi Giáo viên hoặc Hệ thống kết thúc lượt chạy.
- Tính toán danh sách kết quả bất biến cho các học sinh tham gia.
- Dữ liệu này được lưu vào bảng `activity_results` của SQLite và phát sóng `activity_end` cho tất cả học sinh xem tổng kết.

---

## 6. Xây dựng Giao diện Người dùng (React Views)

Mỗi Activity cần cung cấp 2 Views chính:

### 6.1 `StudentView` (Màn hình Học sinh)
- Nằm trong điện thoại hoặc máy bàn của học sinh.
- **Mobile-First**: Tối ưu hiển thị ở viewport di động **360 × 640** trước tiên.
- **Vùng chạm tối thiểu ≥ 48px** cho mọi nút bấm và phương án lựa chọn.
- Nhận props chuẩn:
  ```ts
  export interface StudentViewProps<St = unknown> {
    runId: string;
    state: St;
    participantId: string;
    onSendIntent: (intent: unknown) => void;
    disabled?: boolean;
  }
  ```

### 6.2 `TeacherPanel` (Bảng Điều khiển Giáo viên)
- Nằm trong app Electron hoặc trình duyệt `/teacher` của giáo viên.
- Hiển thị thống kê trực tiếp theo thời gian thực (số lượng tham gia, tỷ lệ lựa chọn, bảng xếp hạng).
- Cung cấp các nút điều khiển (Khóa, Chuyển tiếp, Kết thúc hoạt động).
- Nhận props chuẩn:
  ```ts
  export interface TeacherPanelProps<St = unknown> {
    runId: string;
    state: St;
    onSendIntent: (intent: unknown) => void;
    onEndActivity: () => void;
  }
  ```

---

## 7. Đăng ký Plugin vào Hệ thống (1 dòng import)

### Phía Server:
Mở file `packages/server/src/activity/registry.ts`, thêm 1 dòng import:
```ts
import { QuickPollActivity } from '@educlass/activity-quick-poll';
import { QuizLiveActivity } from '@educlass/activity-quiz-live';

defaultActivityRegistry.register(QuickPollActivity as ActivityDefinition);
defaultActivityRegistry.register(QuizLiveActivity as ActivityDefinition);
```

### Phía Client (Student UI & Teacher UI):
- `apps/student-ui/src/components/ActivityHost.tsx`:
  ```ts
  import { QuickPollStudentView } from '@educlass/activity-quick-poll';
  import { QuizLiveStudentView } from '@educlass/activity-quiz-live';

  studentViewRegistry['quick-poll'] = QuickPollStudentView;
  studentViewRegistry['quiz-live'] = QuizLiveStudentView;
  ```
- `apps/teacher-ui/src/components/ActivityPanel.tsx`:
  ```ts
  import { QuickPollTeacherPanel } from '@educlass/activity-quick-poll';
  import { QuizLiveTeacherPanel } from '@educlass/activity-quiz-live';

  teacherPanelRegistry['quick-poll'] = QuickPollTeacherPanel;
  teacherPanelRegistry['quiz-live'] = QuizLiveTeacherPanel;
  ```

---

## 8. Chuẩn Hoạt Động Quiz Live (`@educlass/activity-quiz-live`)
- **Hai chế độ thi đấu**:
  - `kahoot`: Giáo viên dẫn dắt nhịp độ từng câu hỏi (`in_question` -> `question_review` -> `leaderboard` -> `next_question`), toàn bộ học sinh cùng làm 1 câu tại một thời điểm.
  - `quizizz`: Học sinh tự do làm bài theo tốc độ riêng (self-paced). Bảng xếp hạng trực tiếp cập nhật theo thời gian thực.
- **Tính điểm theo tốc độ (Speed-based scoring)**:
  - Điểm cơ sở: 1000 điểm cho mỗi câu đúng.
  - Trả lời càng nhanh điểm càng cao: giảm tuyến tính từ 100% điểm (0s) xuống tối thiểu 50% điểm (hết giờ).
- **Chuỗi đúng liên tiếp (Streak Bonus)**:
  - Trả lời đúng liên tiếp: chuỗi x2 (+100), x3 (+200)... tối đa +500 điểm thưởng.
  - Trả lời sai: reset chuỗi về 0.
- **Bảng xếp hạng (Leaderboard) & Màn chiếu (ProjectorView)**:
  - Màn chiếu tỷ lệ 16:9 với font chữ lớn dành cho máy chiếu lớp học.
  - Phân bổ lựa chọn với 4 khối màu Kahoot đặc trưng (▲◆●■).
  - Bục vinh danh Podium 3 bậc (🥇🥈🥉) khi kết thúc bài thi.
- **Thưởng EXP tích hợp**:
  - `quiz_correct`: 10 EXP khi trả lời đúng 1 câu.
  - `streak`: 5 EXP khi đạt chuỗi đúng ≥ 3 câu.
  - `top1` / `top2` / `top3`: 50 / 30 / 20 EXP cho học sinh trên bục vinh quang.
  - `finish`: 20 EXP cho tất cả học sinh hoàn thành bài quiz.

---

## 9. Chuẩn Hoạt Động Kỳ Thi Trực Tiếp (`@educlass/activity-exam`)
- **Tạo kỳ thi & Định thời gian**:
  - Giáo viên cấu hình tiêu đề kỳ thi, thời lượng làm bài (`durationMinutes`: ví dụ 15, 45, 60 phút).
  - Tích hợp kho đề hoặc danh sách câu hỏi đa dạng: trắc nghiệm 4 lựa chọn (`mcq4`), đúng/sai (`tf`), đúng/sai 4 ý chuẩn BGD (`tf_group`), trả lời ngắn (`short`).
- **Xáo câu hỏi & xáo đáp án theo từng học sinh (Per-student Shuffling)**:
  - Tùy chọn `shuffleQuestions`: tự động hoán vị ngẫu nhiên thứ tự câu hỏi riêng biệt cho từng thí sinh.
  - Tùy chọn `shuffleOptions`: tự động hoán vị ngẫu nhiên 4 phương án trắc nghiệm A, B, C, D của các câu `mcq4`.
  - Sinh đề thi ngẫu nhiên xác định (deterministic seed) theo từng `participantId`, đảm bảo học sinh tải lại trang không bị đổi đề giữa chừng.
  - Loại bỏ hoàn toàn đáp án đúng (`stripAnswerKey`) trước khi chuyển tới client học sinh.
  - Ánh xạ ngược đáp án (`unmapStudentAnswer`): server tự động ánh xạ lựa chọn của học sinh trên đề xáo về đúng đáp án tương ứng trên đề gốc để chấm điểm đối chiếu với **bản gốc** (Original Question).
- **Mở / Đóng kỳ thi & Mật khẩu bảo vệ**:
  - Trạng thái kỳ thi: `ready` (chờ bắt đầu) -> `in_progress` (đang làm bài, tính giờ) -> `closed` (đã thu bài / khóa thi).
  - Mật khẩu kỳ thi tùy chọn (`password`): học sinh bắt buộc phải nhập đúng mật khẩu (`unlock_exam`) mới mở được đề thi.
  - Giáo viên có quyền gia hạn thời gian làm bài (`extend_time` +5 phút) hoặc khóa thi khẩn cấp (`close_exam`).
- **Thưởng EXP tích hợp**:
  - `exam_finish`: 30 EXP khi hoàn thành nộp bài thi.
  - `exam_high_score`: 20 EXP thưởng thêm khi đạt điểm giỏi (≥ 80%).
  - `exam_perfect`: 50 EXP thưởng thêm khi đạt điểm tuyệt đối (100%).

---

## 10. Danh mục Kiểm thử Bắt buộc (Testing Checklist)

Trước khi nghiệm thu một Activity Plugin:
- [ ] **Unit Test Server**: Kiểm thử `onStart`, `onStudentIntent` (cả trường hợp hợp lệ và bị từ chối), `onTeacherIntent`, `onEnd`.
- [ ] **Unit Test Views**: Kiểm thử `StudentView` (click nút gửi intent, hiển thị kết quả) và `TeacherPanel`.
- [ ] **Zod Schema**: Cố ý gửi dữ liệu sai cấu trúc để kiểm chứng schema bắt lỗi.
- [ ] **Offline Check**: Không chứa bất kỳ URL CDN bên ngoài nào.
- [ ] **Viewport 360x640**: Kiểm thử giao diện học sinh trên màn hình điện thoại nhỏ.

