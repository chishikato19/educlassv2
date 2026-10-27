# EduClass v2 — KẾ HOẠCH TỔNG (Nguồn sự thật cho AI)

> Mọi AI/dev thực hiện dự án PHẢI đọc file này + `AGENTS.md` trước khi code.
> Không tự ý đổi quyết định ở mục 1. Muốn đổi → tạo ADR trong `docs/adr/` và hỏi người dùng.

## 1. QUYẾT ĐỊNH ĐÃ CHỐT (không đổi)

| # | Quyết định |
|---|---|
| D1 | Tất cả máy giáo viên chạy **Windows**. Đóng gói bằng **Electron** + installer NSIS (tự thêm rule Firewall). |
| D2 | Học sinh dùng **trình duyệt** (điện thoại + máy bàn). Giao diện responsive, mobile-first, PWA. Không cài app. |
| D3 | **Nhiều tài khoản giáo viên.** Một máy chủ (server) chạy trên 1 máy Windows; GV đăng nhập bằng app desktop hoặc trình duyệt `/teacher`. Vai trò: `admin`, `teacher`. |
| D4 | **Nhiều phiên cùng lúc** (mỗi GV 1 phiên đang mở). Mỗi phiên có **mã vào lớp 6 ký tự** + QR. HS vào cổng → nhập mã hoặc chọn từ danh sách phiên đang mở. |
| D5 | Dữ liệu GV tách biệt: GV chỉ thấy lớp, kho đề, báo cáo của mình (admin thấy tất cả). Có chia sẻ đề (tùy chọn, chặng sau). |
| D6 | Ba cấp danh tính HS: `account` (tên + mật khẩu/PIN → LƯU EXP, danh hiệu), `roster` (chọn tên, không mật khẩu → KHÔNG lưu), `guest` (nickname tự nhập → KHÔNG lưu). |
| D7 | Phiên có cài đặt `identityMode`: `roster_only` (bắt buộc chọn tên, **tên không được trùng/đang được dùng**), `roster_or_guest`, `guest_only`. Khi chọn tên đã bị chiếm → báo rõ + nút "Báo GV mở lại". |
| D8 | **EXP cộng ở mọi loại hoạt động, gồm kỳ thi**, theo **bảng cài đặt EXP** (mục 6). Chỉ `account` được ghi vĩnh viễn; còn lại chỉ hiện trong báo cáo phiên. |
| D9 | Ngăn xếp: TypeScript strict, pnpm monorepo, Node 20+, Fastify + `ws`, SQLite (better-sqlite3) + Drizzle, Zod, React 18 + Vite + TailwindCSS, KaTeX, Vitest, Playwright. |
| D10 | Hết tiết: GV đóng phiên → tổng kết → ghi DB → HS bị đăng xuất, token vô hiệu. |
| D11 | Ngôn ngữ giao diện: Tiếng Việt (chuẩn bị i18n từ đầu, file `vi.json`). |
| D12 | Mỗi Activity = 1 plugin theo hợp đồng ở mục 4. Thêm tiện ích KHÔNG được sửa lõi. |

## 2. CẤU TRÚC THƯ MỤC (bắt buộc)

```
educlass/
├─ AGENTS.md                  # luật cho AI
├─ docs/  PLAN.md  adr/  activity-guide.md  protocol.md
├─ apps/
│  ├─ desktop/                # Electron: khởi chạy server, hiện IP/QR, tray
│  ├─ teacher-ui/             # React: giao diện GV
│  └─ student-ui/             # React PWA: cổng HS
├─ packages/
│  ├─ protocol/               # Zod: message WS, DTO REST, enum, mã lỗi  (KHÔNG phụ thuộc gói khác)
│  ├─ core/                   # Hàm thuần: session FSM, scoring, rewards, identity (KHÔNG I/O)
│  ├─ db/                     # Drizzle schema, migration, repository
│  ├─ server/                 # Fastify + WS gateway + auth + registry
│  ├─ question-kit/           # Model câu hỏi, chấm điểm, parser Word, KaTeX
│  ├─ ui-kit/                 # Design tokens + component chung (GV & HS)
│  └─ activities/
│     ├─ quiz-live/  exam/  random-picker/  poll/  group-maker/ ...
└─ tests/  e2e/  fixtures/word-samples/
```
**Luật phụ thuộc** (kiểm bằng `dependency-cruiser` trong CI, vi phạm = fail):
`protocol` ← `core` ← (`db`, `question-kit`) ← `server` / `activities` ← `apps`. UI không import `server`/`db`. `core` không import `db`.

## 3. MÔ HÌNH DỮ LIỆU (SQLite)

```
users(id, username UNIQUE, passwordHash, displayName, role[admin|teacher], active, createdAt)
classes(id, ownerId→users, name, year, createdAt)
students(id, classId, fullName, code?, passwordHash?, exp INT, level INT, avatarJson, createdAt)
titles(id, key UNIQUE, name, iconKey, ruleJson)          -- luật cấp danh hiệu dạng dữ liệu
student_titles(studentId, titleId, awardedAt, sessionId?)
question_sets(id, ownerId, title, subject, grade, tagsJson, schemaVersion, updatedAt)
questions(id, setId, order, type[mcq4|tf|tf_group|short], contentJson, answerJson, points)
assets(id, sha256 UNIQUE, mime, path, size)
sessions(id, ownerId, classId?, joinCode UNIQUE-while-open, status[open|closing|closed],
         identityMode, allowTeams, settingsJson, openedAt, closedAt)
participants(id, sessionId, studentId?, displayName, identityLevel[account|roster|guest],
             teamId?, status[online|offline], joinedAt, leftAt)
teams(id, sessionId, name)
activity_runs(id, sessionId, activityId, configJson, status[ready|running|ended], startedAt, endedAt)
activity_results(id, runId, participantId, scoreJson, rank?)  -- snapshot bất biến
exam_answers(id, runId, participantId, questionId, answerJson, ts)  -- append-only
reward_rules(id, ownerId?, scope[global|teacher], activityId?, trigger, exp, enabled)
reward_log(id, sessionId, participantId, studentId?, exp, reason, persisted BOOL, ts)
chat_messages(id, sessionId, fromParticipantId?, toParticipantId?, fromTeacher BOOL, text, ts)
session_reports(id, sessionId, snapshotJson, createdAt)       -- snapshot khi đóng
audit_log(id, userId?, action, targetJson, ts)
```
Quy tắc: id dạng ULID; `contentJson/answerJson/settingsJson` luôn đi qua Zod khi đọc/ghi; mọi migration có số phiên bản + tự backup file DB trước khi migrate.

### Câu hỏi (JSON chuẩn, `schemaVersion: 1`)
- `mcq4`: `{stem: RichText, options: [4×RichText], correct: 0..3}`
- `tf`: `{stem, correct: boolean}`
- `tf_group` (chuẩn BGD): `{stem, items: [4×{text, correct: boolean}]}`; điểm bậc thang cấu hình được (mặc định 1 ý=0.1, 2=0.25, 3=0.5, 4=1.0 của điểm câu).
- `short`: `{stem, accepted: string[], numeric?: {value, tolerance}}`
- `RichText = {text: string (LaTeX trong $...$), images?: assetId[]}`

## 4. HỢP ĐỒNG ACTIVITY (plugin)

```ts
interface ActivityModule<Cfg, St, Res> {
  id: string; name: string; version: number; icon: string
  configSchema: ZodType<Cfg>          // GV cấu hình khi bắt đầu
  stateSchema: ZodType<St>
  resultSchema: ZodType<Res>
  rewardTriggers: string[]            // vd: 'correct_answer','finish','top3','participation'
  server: {
    onStart(ctx, cfg): St
    onStudentIntent(ctx, st, participantId, intent): St | Reject
    onTeacherIntent(ctx, st, intent): St
    onEnd(ctx, st): Res[]             // kết quả từng participant
  }
  TeacherPanel: Component             // điều khiển + giám sát
  StudentView: Component              // màn HS
  ProjectorView?: Component
  capabilities?: ('files'|'screen'|'chat-lock')[]
}
```
- Đăng ký ở `packages/server/src/registry.ts` bằng 1 dòng import. Server chỉ gọi qua interface.
- `ctx` cung cấp: `grantReward(participantId, trigger, qty?)`, `broadcast`, `now()`, `rng`. Activity **không** truy cập DB trực tiếp.
- Mọi intent/state validate bằng Zod; state thay đổi chỉ ở server.

## 5. GIAO THỨC REALTIME

- Envelope: `{v:1, id, type, sessionId, ts, payload}`; `id` dùng chống xử lý trùng (idempotent).
- Hướng: client gửi **intent**; server xác thực → cập nhật → phát `state_patch` hoặc `snapshot`.
- Kết nối lại: HS giữ `participantToken` (localStorage) → `resume` → server trả `snapshot` (activity hiện tại + đáp án đã lưu). Thi: mỗi lần chọn đáp án lưu ngay ở server.
- Heartbeat 5s; mất >15s → `offline` (không xóa dữ liệu). Giám sát GV gom gói 1s/lần.
- Mã lỗi chuẩn trong `protocol/errors.ts` (vd `NAME_TAKEN`, `SESSION_CLOSED`, `BAD_CODE`, `FORBIDDEN`).

## 6. HỆ THỐNG EXP & CÀI ĐẶT

- Bảng `reward_rules`: GV vào **Cài đặt → EXP** để đặt cho từng activity & trigger.
  Ví dụ: Quiz Live: đúng 1 câu = 10, hoàn thành = 20, top1/2/3 = 50/30/20 · Exam: hoàn thành = 30, điểm ≥ 8 = +20 · Vòng quay: được chọn trả lời đúng = 15 · Chuyên cần (vào lớp) = 5.
- Ưu tiên: luật theo GV ghi đè luật global; có nút "Khôi phục mặc định". Cài trần EXP tối đa mỗi activity/phiên (chống lạm phát).
- Luồng duy nhất: Activity → `ctx.grantReward` → `core/rewards.grant()` → ghi `reward_log` (`persisted` = identityLevel==='account') → nếu persisted, cộng `students.exp` trong **cùng transaction** → kiểm tra lên level / danh hiệu.
- Công thức level cấu hình trong `core/levels.ts` (mặc định: level n cần `50*n*(n+1)/2` EXP tích lũy), có unit test.
- Nhóm: EXP tính cho từng thành viên (cài đặt: chia đều hoặc mỗi người nhận đủ).

## 7. THIẾT KẾ GIAO DIỆN

### 7.1 Design tokens (`packages/ui-kit/tokens`)
- Phong cách: **tươi sáng, thân thiện, bo tròn, nền sáng**. Không dùng nền tối cho HS (trừ tùy chọn).
- Màu: nền `#FFF9F0`/trắng; chính `#4F8CFF` (xanh dương); phụ: `#FFB020` (vàng), `#2ECC8F` (xanh lá, đúng), `#FF6B6B` (đỏ san hô, sai), `#9B6BFF` (tím), `#FF8AB3` (hồng). 4 màu đáp án Kahoot: đỏ/xanh/vàng/xanh lá **kèm hình khối ▲◆●■** (không chỉ dựa màu → người mù màu).
- Chữ: **Nunito** hoặc **Be Vietnam Pro** (hỗ trợ tiếng Việt) bundle offline (không dùng Google Fonts CDN). Cỡ thân HS ≥ 18px, tiêu đề 24–32px.
- Bo góc 16–24px, đổ bóng mềm, nút lớn.
- Chuyển động: ngắn (150–250ms), tôn trọng `prefers-reduced-motion`. Âm thanh: bật/tắt, mặc định tắt trên điện thoại.
- Tương phản chữ/nền ≥ 4.5:1.

### 7.2 Quy tắc UX cho HỌC SINH (bắt buộc)
1. **Tối đa 1 hành động chính mỗi màn hình**; một nút lớn nổi bật.
2. Vùng chạm ≥ **48×48px**, khoảng cách giữa nút ≥ 8px.
3. Luồng vào lớp ≤ **3 bước**: (1) Nhập mã / chọn phiên → (2) Chọn tên (tìm nhanh bằng ô lọc, danh sách chữ cái đầu) → (3) Nhập PIN (nếu có) → vào.
4. Danh sách tên: chữ lớn, tên đã bị chiếm làm mờ + chú thích "đang được dùng".
5. Màn hình chờ luôn có thông điệp rõ ("Chờ thầy/cô bắt đầu…") + animation nhẹ; không bao giờ màn trắng.
6. Phản hồi tức thì: bấm đáp án → đổi trạng thái ngay (optimistic) + xác nhận từ server.
7. Mất mạng: banner cam "Đang kết nối lại…", dữ liệu vẫn giữ, tự nối lại.
8. Mọi lỗi viết bằng tiếng Việt dễ hiểu, kèm hướng dẫn hành động ("Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô").
9. Thanh trên cố định (nhỏ gọn): avatar, EXP, nút 💬 chat, nút ✋ xin giúp. Chế độ thi ẩn bớt.
10. Điện thoại dọc là kích thước thiết kế chính; máy bàn dùng bố cục rộng hơn, **không** tạo bản riêng.
11. Hỗ trợ xoay ngang, zoom hình, cuộn mượt; chống kéo-để-refresh vô tình khi đang thi.
12. Cho phép ký tự công thức rõ nét (KaTeX, cỡ ≥ 1.1em), ảnh bấm để phóng to.

### 7.3 Màn hình HS (state machine)
`Gate(nhập mã)` → `PickIdentity` → `Lobby/Home` → `ActivityHost` → `SessionEnded(tổng kết cá nhân)`.
`Home` gồm: thẻ nhân vật, EXP/level, danh hiệu, trạng thái lớp, chat.
Chế độ thi (Azota-like): lưới câu (xám = chưa, xanh = đã, vàng = đánh dấu), tất cả câu cuộn dọc, đồng hồ, nút Nộp (xác nhận 2 bước).

### 7.4 Giao diện GV
- 5 tab: Lớp học · Kho đề · Phiên chơi · Kỳ thi · Tiện ích (+ Cài đặt EXP, Tài khoản).
- Thanh phiên toàn cục: mã lớp lớn, QR, số HS online, nút Đóng tiết.
- Mật độ thông tin cao hơn HS nhưng cùng bộ token/màu.
- Màn hình chiếu (projector) tách route, chữ rất lớn.

## 8. LỘ TRÌNH THỰC HIỆN (từng chặng, có checklist)



### CHẶNG 6 — Tiện ích (mỗi cái là plugin độc lập)
Vòng quay chọn HS · Chia nhóm · Bình chọn nhanh · Đồng hồ đếm · Điểm danh · Word cloud · Phiếu ra cửa.
- **DoD mỗi tiện ích:** không sửa `core`/`server` ngoài registry; có test + mục trong `activity-guide.md`.

### CHẶNG 7 — Nâng cao (sau)
- [x] **Thu - phát bài tập & Gửi/nhận tài liệu:** Module Activity độc lập `@educlass/activity-assignment-hub`, file server LAN nội bộ, lưu vào thư mục máy tính tùy ý GV chọn, xem trước Office (Word, Excel, PPTX), PDF, ảnh offline, phát tài liệu xuống học sinh qua popup tải về/xem trên trình duyệt.
- [x] **Chiếu & Chữa bài PDF/Word (Mô hình A):** Module Activity độc lập `@educlass/activity-pdf-presenter`, cắt dãn khoảng trống bảng trắng giữa các câu (Vertical Split & Push Gap), hỗ trợ hoa văn kẻ ô ly tập học sinh/dòng kẻ/trắng trơn, bộ bút viết & dạ quang vector, tự động render Word sang trang tài liệu, học sinh ở chế độ chỉ xem (Read-only) đồng bộ thời gian thực qua LAN kèm Projector View màn chiếu.
- [x] **Camera vật thể (Giai đoạn 1):** Module Activity độc lập `@educlass/activity-object-camera`, biến điện thoại thành máy chiếu vật thể thông minh. Quét mã QR bảo mật riêng cho giáo viên, tải ảnh trực tiếp từ máy tính, bộ công cụ xử lý ảnh toàn diện (xoay 90°, cắt xén crop, zoom, pan, tăng tương phản/scan đen trắng), vẽ sửa bài vector (bút đỏ, dạ quang, con dấu đúng/sai/sao, tẩy, hoàn tác), đồng bộ thời gian thực siêu nhẹ (Vector & Viewport) xuống Cổng học sinh và Máy chiếu (Projector View), cơ chế lưu trữ & dọn dẹp file tự động khi đóng phiên (Zero-trash) cùng 1-click dọn sạch ảnh tạm, thưởng EXP nóng cho học sinh có bài chữa.
- [x] **Đại Chiến Lãnh Thổ (Territory War):** Module Activity độc lập `@educlass/activity-territory-war`, chia 2 phe Xanh - Đỏ thời gian thực, bản đồ chiến lược 5x5 / 7x7 / 9x9 (Lâu đài lớn 5 HP, tháp canh 2 HP, lâu đài nhỏ 3 HP), cơ chế giằng co máu khi trung lập, chuyển quyền sở hữu dứt điểm khi hạ thành, luật liền kề 4 hướng, cơ chế khóa ô tránh xung đột, gia cố phòng thủ (+1đ), luật Sudden Death (chiếm Lâu Đài Lớn hoặc 2 Lâu Đài Cánh thắng ngay), âm thanh Web Audio offline, màn hình chiếu (ProjectorView) tỷ lệ vàng với thanh kéo co % lãnh thổ và BXH Tướng Lĩnh.
- [x] **Đối Kháng 1vs1 (Arcade Duel) & Lõi Vật Phẩm (Power-ups):** Module Activity độc lập `@educlass/activity-arcade-duel` tích hợp chung vào Game Hub Quizz Live trên màn hình GV không cần máy học sinh. Hỗ trợ 2 chế độ: Cùng trả lời (chia 3 màn hình, khóa đáp án bí mật & lật bài) và Đua tốc độ (chia đôi 50/50 dọc, phạt dừng 1.5s khi chọn sai rồi tự nhảy câu). Đảo thứ tự phương án độc lập chống nhìn trộm, cài đặt bàn phím công thái học (Xanh: `A,S,D,F,Q`; Đỏ: `1,2,3,4,5` bắt theo `event.code` chống xung đột Unikey). Tích hợp Lõi Hệ thống Vật phẩm (Power-ups) dùng chung (`@educlass/core/src/powerups`): 6 món (Khiên chặn đòn, Sấm sét x2, Kính 50/50, Đóng băng, Bom khói, Nam châm hút điểm), hàng đợi túi đồ FIFO 2-3 món dùng bằng 1 phím, 5 phổ tác động đa năng và Băng rôn Chiến sự Combat Feed.
- [x] **Bảng Tương Tác (Giai đoạn 3 - Teacher Suite & Projector View):** Hoàn thành bộ công cụ phía Giáo viên: Hàng đợi duyệt bài chờ duyệt (Duyệt nhanh, Yêu cầu sửa kèm lý do qua `TeacherRejectModal`, Xóa bài rác), Bảng bài đã duyệt theo bộ lọc (Tất cả, Tiêu điểm, Đã chấm, Nhiều Like, Trao giải), chấm điểm & nhận xét sư phạm GV `TeacherGradeModal`, trao giải vinh danh Top 1/2/3/Sáng tạo `TeacherAwardModal`, điều phối cấm chat cá nhân/toàn lớp, bình luận nổi bật GV; Màn hình chiếu lớn `InteractiveBoardProjectorView` với 2 chế độ: Toàn cảnh Wall Grid lộng lẫy và Chế độ Spotlight trung tâm viền vàng ánh kim phóng to chữa bài; đăng ký hoàn chỉnh vào `ActivityPanel` và danh bạ Plugin của `apps/teacher-ui`.
- [x] **Học sinh Desktop Client & Wake-on-Session (Giai đoạn 1 — UDP Discovery Beacon):** Ghi nhận ADR 0004 kiến trúc Hybrid (học sinh di động dùng Chrome quét QR, học sinh phòng máy tính dùng Desktop Client). Tạo schema `DiscoveryBeaconSchema` trong `packages/protocol`, triển khai `BeaconService` trong `packages/server` phát sóng gói tin UDP broadcast (port 54321) tự động đánh thức khi mở phiên (`SESSION_OPEN`), phát nhịp tim định kỳ (`SESSION_HEARTBEAT`) và báo đóng phiên (`SESSION_CLOSED`), tích hợp vào vòng đời mở/đóng phiên của `sessionsRoutes`.
- [x] **Học sinh Desktop Client & Wake-on-Session (Giai đoạn 2 — Core Agent & Cửa sổ Độc lập):** Xây dựng ứng dụng `apps/student-desktop`: Single-Instance (`app.requestSingleInstanceLock()`), System Tray khay hệ thống với menu điều khiển nhanh, khối `BeaconListener` lắng nghe UDP port 54321, tự động bung cửa sổ và nạp URL lớp học khi có tín hiệu `SESSION_OPEN`/`SESSION_HEARTBEAT`, tự động chuyển về màn hình chờ `window.html` khi có tín hiệu `SESSION_CLOSED`, cơ chế đóng cửa sổ `X` ẩn về khay hệ thống để tiếp tục chạy nền; cấu hình esbuild và electron-builder sẵn sàng đóng gói.
- [x] **Học sinh Desktop Client & Wake-on-Session (Giai đoạn 3 — Chế độ Thi An Toàn Exam Kiosk Mode):** Tích hợp Kiosk Lockdown trong `apps/student-desktop`: kích hoạt `setKiosk(true)`, `setAlwaysOnTop(true, 'screen-saver')`, `setFullScreen(true)`, chặn toàn bộ phím tắt chuyển ứng dụng/mở tab (`Alt+Tab`, `Alt+F4`, `Windows Key`, `Ctrl+N/T/W`, `F11/F12`), tự động refocus khi mất focus, cung cấp phím cứu hộ khẩn cấp giám thị `Ctrl + Shift + Alt + F12`; tích hợp cầu nối IPC 2 chiều `lockKioskMode()` / `unlockKioskMode()` trong `packages/activities/exam` và `packages/server/public/student/js/exam.js` tự động bật khi làm bài và giải phóng khi nộp bài hoặc hết giờ.
- [x] **Học sinh Desktop Client & Wake-on-Session (Giai đoạn 4 — Đóng gói NSIS & Triển khai Phòng Máy):** Thiết lập kịch bản NSIS (`build/installer.nsh`) tự động thêm rule Tường lửa Windows cho cổng UDP 54321 và tự tạo Shortcut trong `shell:startup` chạy nền (`--background`), hỗ trợ cài đặt im lặng hàng loạt (`/S`) cho 40 máy phòng tin; viết cẩm nang hướng dẫn triển khai và vận hành chi tiết trong `docs/student-client-guide.md`.
- [x] **Học sinh Desktop Client & Wake-on-Session (Giai đoạn 5 — Khóa tắt cửa sổ & Tự động bung cửa sổ Wake-on-Activity):** Vô hiệu hóa nút đóng đỏ [X] của cửa sổ Windows (`mainWindow.setClosable(false)`), chặn phím tắt `Alt+F4`, vô hiệu hóa mục "Thoát EduClass" trong khay hệ thống khi đang trong tiết học; cơ chế 2 kênh tự động bung cửa sổ lên trên cùng (Restore & Focus / Auto Bring-to-Front) qua Realtime WebSocket IPC và gói tin UDP Broadcast Beacon khi giáo viên mở bất kỳ hoạt động nào (Quiz, Exam, Poll, Vòng quay, Bảng tương tác, Thu phát bài...); tích hợp phím cứu hộ giám thị/giáo viên `Ctrl + Shift + Alt + F12` mở khóa khẩn cấp; xuất bản bộ cài đặt `EduClass Học Sinh Setup 2.1.1.exe` và `EduClass Học Sinh Portable 2.1.1.exe` ra thư mục gốc dự án.
- [x] **Ghép 2–3 học sinh ngồi chung 1 máy (Multi-Student Device Pairing):** Cho phép giáo viên cấu hình phiên học ghép 2–3 học sinh chung 1 máy (phòng máy thiếu máy tính hoặc hoạt động học tập theo đôi/ba). Cổng học sinh cho phép chọn nhiều bạn qua khay thẻ Chips, khóa tên đồng thời chống trùng tên (D7 Atomic Lock), nhập PIN cá nhân từng bạn, tự động ghép tên trang trọng "Tên A & Tên B" và phân bổ EXP tự động cho toàn bộ học sinh trong nhóm máy (D8 Rewards Fan-out).
- [x] **Đấu Cờ Thụy Sỹ (Swiss Duel) — Tùy chọn đảo câu hỏi & đảo đáp án:** Bổ sung cấu hình `shuffleQuestions` và `shuffleOptions` (mặc định bật) cho thể thức Đấu Cờ 1v1 Thụy Sỹ, xáo trộn câu hỏi và các phương án lựa chọn (A, B, C, D) kèm tự động cập nhật lại vị trí đáp án đúng, tích hợp checkbox công thái học vào cả Game Hub Quiz Live và Modal khởi chạy tiện ích độc lập trên Teacher UI.
- [x] **Đường Đua Tri Thức (Circuit Race):** Module Activity độc lập `@educlass/activity-circuit-race`, gamification đường đua 50–80 ô thời gian thực, cơ chế gieo xúc xắc, kho 14 thẻ bổ trợ chiến thuật (nam châm Top 1, móc câu người trước mặt, bẫy vỏ chuối, lốc xoáy, khiên hộ mệnh, gương phản đòn, nitro, phanh khẩn cấp, xúc xắc ma thuật, xúc xắc hoàng gia 6, phao cứu sinh 50/50, nhân đôi EXP...), hỗ trợ 4 dạng câu hỏi (MCQ, Đúng/Sai đơn, Chùm Đúng/Sai chuẩn BGD 4 ý, Trả lời ngắn), cơ chế túi đồ 2 thẻ, thông báo tác động tương tác kèm hiệu ứng hình ảnh/chiến sự, màn hình giáo viên/máy chiếu (ProjectorView) toàn cảnh đường đua và màn hình học sinh mobile tối ưu.
- [x] **Hệ Thống Vật Phẩm (Power-ups) Trực Quan Quizizz & Tối Ưu Câu Hỏi Đối Kháng (v2.2.17):** Hoàn thiện hệ thống túi đồ chiến thuật, hiệu ứng đóng băng, bom khói, khiên chắn, phản đòn và nút dùng nhanh `use_powerup` trên Cổng học sinh cho chế độ Quizizz; bổ sung hỗ trợ câu trả lời ngắn (Short Answer) và tự động lọc bỏ chùm đúng/sai cho Đấu Cờ Thụy Sỹ & Đại Chiến Lãnh Thổ; đóng gói phát hành bộ cài đặt và portable bản 2.2.17.
- [x] **Nâng Cấp Trải Nghiệm "Đường Đua Tri Thức" (Circuit Race v2.2.18):** Bản đồ uốn lượn 2D liên tục không cần cuộn ngang (Snake pattern 10 ô/hàng), di chuyển từng bước (Step-by-step hopping animation) sinh động, tự động chuyển vòng sau 10s dùng thẻ (Auto-advance qua nhịp `sync_tick`), tái cấu trúc bố cục màn hình GV & Màn chiếu Projector (4/5 bản đồ to rõ, 1/5 BXH & Sự kiện, loại bỏ câu hỏi trên màn hình chung), bộ tùy chọn đảo câu hỏi, đảo đáp án A/B/C/D & giao thứ tự câu hỏi ngẫu nhiên độc lập cho từng học sinh chống nhìn bài.
- [x] **Hệ Thống Điểm Trình Độ Ẩn (Hidden Elo / MMR) & Cân Bằng Đội Hình:** Module Elo độc lập trong `@educlass/core/src/elo`, thuật toán Snake Draft + Greedy Swap cân bằng quân lực hai phe cho Đại Chiến Lãnh Thổ (`territory-war`) và chia nhóm; tự động tích lũy/cập nhật Elo ẩn sau các trận Quizizz, Kahoot, Đại Chiến Lãnh Thổ, Đường Đua Tri Thức; lưu bền vững vào bảng `students` (Migration 0010); ẩn hoàn toàn với học sinh; bộ tùy chọn chia đội trực quan phía Giáo viên (Cân bằng Elo ẩn, Ngẫu nhiên, Theo tổ/nhóm).
- [x] **Đại Chiến Xanh Đỏ (thử nghiệm):** Module Activity độc lập `@educlass/activity-faction-duel`, chia 2 phe Xanh - Đỏ cân bằng tuyệt đối theo Elo ẩn (`balanceTwoTeamsByElo` Snake Draft ABBA). Lượt 1 ghép ngẫu nhiên 1-1; lượt 2 trở đi phe dẫn điểm được quyền tự do chọn đối thủ phe ít điểm trong 15s (khóa mục tiêu FCFS & chống lặp đối thủ). Thi đấu đồng loạt 1-5 câu (mặc định 2 câu), xử lý sĩ số lẻ bằng cơ chế Clone ngẫu nhiên (làm bài 1 lần, đấu song song 2 trận). Chấm điểm trận có trọng số Elo (+1đ kèo trên, +2đ cân kèo, +3đ kèo dưới lật kèo, +0.5đ hòa). Tùy chọn đảo câu hỏi, đảo đáp án A/B/C/D và tự động xoay vòng lấy lại câu cũ khi hết kho đề; giao diện Học sinh mobile-first (360x640), Màn chiếu Projector thanh kéo co Tug-of-War thời gian thực và Màn hình Giáo viên điều phối; đặt chung vị trí với Kahoot & Quizizz trong Game Hub.
- [ ] Chiếu slide đồng bộ trang · Chiếu màn hình (WebRTC) · Sao lưu/khôi phục · Chia sẻ đề giữa GV.

## 9. CHIẾN LƯỢC CHẤT LƯỢNG
- `core` & `question-kit` là hàm thuần, độ phủ test ≥ 90%.
- Test: unit → integration (server + SQLite in-memory) → E2E Playwright (1 GV + nhiều HS giả, cả viewport điện thoại) → load 50 client.
- Mọi dữ liệu vào/ra (WS, REST, file import, JSON trong DB) qua Zod.
- Truy cập: kiểm axe-core trên màn HS; kiểm bằng tay trên 1 điện thoại thật Android + iOS.
- Mỗi PR/commit: lint + typecheck + test + dependency-cruiser xanh.
- Log có cấu trúc + màn chẩn đoán cho GV (client online, độ trễ, IP).

## 10. RỦI RO
| Rủi ro | Giải pháp |
|---|---|
| WiFi trường bật cách ly client (AP isolation) | Màn chẩn đoán + hướng dẫn; GV bật hotspot dự phòng |
| Firewall chặn cổng | Installer tự thêm rule |
| IP đổi | Hiện IP + QR + mã lớp; mDNS tùy chọn |
| Parser Word/công thức sai | Quy ước định dạng + màn xem trước/sửa + bộ test mẫu |
| Gian lận khi thi | Chỉ phát hiện (mất focus), không hứa chặn tuyệt đối |
| Mật khẩu/dữ liệu HS | Chỉ lưu cục bộ; băm argon2; xuất/xóa dữ liệu theo yêu cầu |
