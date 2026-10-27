# Danh Sách Công Việc Triển Khai: Giải Đấu Vòng Bảng & Bắt Cặp Xếp Hạng (Volleyball Tournament)

## Giai đoạn 1: Khởi Tạo Package & Mô Hình Dữ Liệu (Schemas)

- [ ] 1.1 **Khởi tạo thư mục package `@educlass/activity-volleyball-tournament`**:
  - Tạo `packages/activities/volleyball-tournament/package.json` và `tsconfig.json`.
  - Khai báo dependencies: `@educlass/core`, `@educlass/protocol`, `@educlass/ui-kit`, `zod`, `react`.
  - Cập nhật pnpm workspace và tsconfig project references nếu cần.

- [ ] 1.2 **Định nghĩa Schemas dữ liệu (`src/volleyball-schemas.ts`)**:
  - `VolleyballQuestionSchema`: câu hỏi, đáp án, thời gian làm bài.
  - `VolleyballMatchupSchema`: dữ liệu bàn đấu, điểm 2 câu, thời gian, trạng thái kết quả.
  - `PoolStandingEntrySchema` & `VolleyballPoolSchema`: thông tin bảng đấu, BXH nội bộ bảng.
  - `PlacementBracketSchema`: thông tin 4 Cúp (Kim Cương, Vàng, Bạc, Đồng), các trận Bán kết & Chung kết.
  - `VolleyballTournamentStateSchema`: state máy trạng thái (lobby, pool_stage, intermission, bracket_stage, finished).
  - `VolleyballConfigSchema`: cấu hình giáo viên (poolMode: auto/4_pools/8_pools, số câu hỏi, thời gian).
  - `VolleyballIntentSchema`: các intent từ học sinh (`submit_answer`) và giáo viên (`start_tournament`, `next_round`, `finish`).

---

## Giai đoạn 2: Thuật Toán Phân Bảng, Bắt Cặp & Chấm Điểm (Algorithms & Logic)

- [ ] 2.1 **Thuật toán Phân Bảng & Sinh Lịch Vòng Tròn (`src/volleyball-pools.ts`)**:
  - Hàm `determinePoolCount(participantCount, poolMode)`: quyết định 4 bảng ($\le 23$ HS) hoặc 8 bảng ($\ge 24$ HS).
  - Hàm `distributeIntoPools(participants, poolCount)`: xáo trộn và chia đều vào các bảng.
  - Hàm `generatePoolSchedule(pools)`: sinh lịch thi đấu 3 lượt vòng tròn cho các bảng (xử lý trường hợp lẻ học sinh có BYE).
  - Hàm `calculatePoolStandings(pool, completedMatchups)`: tính điểm, số câu đúng, đối đầu và thời gian để xếp hạng #1, #2, #3, #4.
  - Viết unit tests kiểm tra toàn diện trong `__tests__/volleyball-pools.test.ts`.

- [ ] 2.2 **Thuật toán Bắt Cặp Phân Tầng 4 Cúp (`src/volleyball-brackets.ts`)**:
  - Hàm `generatePlacementBrackets(pools, poolCount)`: bốc thăm chéo các bạn cùng thứ hạng vào 4 Cúp (Kim Cương, Vàng, Bạc, Đồng).
  - Hàm `advanceBracketMatchups(bracket, roundIndex, results)`: cập nhật cặp đấu Chung kết và Tranh hạng ba sau vòng Bán kết.
  - Hàm `calculateFinalStandings(brackets)`: ánh xạ kết quả các trận chung kết ra thứ hạng tuyệt đối từ #1 đến #N toàn lớp.
  - Viết unit tests kiểm tra trong `__tests__/volleyball-brackets.test.ts`.

- [ ] 2.3 **Lõi Chấm Điểm & Đánh Giá Trận Đấu (`src/volleyball-scoring.ts`)**:
  - Kế thừa và tái sử dụng bộ chấm 2 câu hỏi từ logic đấu cờ.
  - Hàm `evaluateMatchup(matchup, rawQuestions)`: xác định `player1_win`, `player2_win` hoặc `draw`.

---

## Giai đoạn 3: Triển Khai Server FSM Activity Plugin (Activity Module)

- [ ] 3.1 **Xây dựng `VolleyballTournamentActivity` (`src/volleyball-activity.ts`)**:
  - Triển khai `onStart(ctx, cfg)`: khởi tạo state, phân bảng, sinh lịch 3 lượt vòng bảng, chuẩn bị 2 câu đầu tiên.
  - Triển khai `onStudentIntent(ctx, st, participantId, intent)`:
    - Tiếp nhận câu trả lời cho câu 1 và câu 2.
    - Cập nhật điểm và thời gian làm bài của học sinh.
    - Khi cả 2 học sinh cùng hoàn thành hoặc hết giờ $\rightarrow$ tự động chốt kết quả bàn đấu.
  - Triển khai `onTeacherIntent(ctx, st, intent)`:
    - Chuyển lượt đấu (`next_round`).
    - Chuyển giai đoạn từ Vòng bảng sang Vòng Playoff (`start_brackets`).
    - Kết thúc sớm hoặc bỏ qua câu.
  - Triển khai `onEnd(ctx, st)`: trao thưởng EXP theo chuẩn D8 cho Quán quân 4 Cúp, xuất kết quả `ActivityResults`.

- [ ] 3.2 **Kiểm thử Luồng Activity (`__tests__/volleyball-activity.test.ts`)**:
  - Test mô phỏng trọn vẹn 1 giải đấu: 16 học sinh qua 3 lượt vòng bảng $\rightarrow$ 2 lượt vòng xếp hạng $\rightarrow$ tổng kết trao cúp.

---

## Giai đoạn 4: Xây Dựng Giao Diện Người Dùng (UI Components)

- [ ] 4.1 **Giao diện Học sinh (`src/components/VolleyballStudentView.tsx`)**:
  - Tối ưu mobile-first 360x640, phím bấm đáp án $\ge 48\times 48\text{px}$.
  - Header thể thao: Tên bảng đấu của mình, tên đối thủ, tỷ số 2 câu.
  - Màn hình giải lao giữa lượt: Xem BXH bảng của mình, biết trước đối thủ trận sau.
  - Màn hình Playoff: Huy hiệu Cúp Kim Cương / Vàng / Bạc / Đồng.

- [ ] 4.2 **Giao diện Màn Chiếu (`src/components/VolleyballProjectorView.tsx`)**:
  - Chế độ 4 Bảng (15–23 HS): 4 cột to rõ, tỷ số nhảy realtime khi học sinh chọn bài.
  - Chế độ 8 Bảng (24–40 HS): Grid 2x4 gọn gàng kèm khung "Sân đấu tâm điểm".
  - Chế độ Playoff: Sơ đồ Bracket thể thao 4 cây nhánh đấu với hiệu ứng cúp lộng lẫy.

- [ ] 4.3 **Giao diện Bảng Điều Khiển Giáo Viên (`src/components/VolleyballTeacherPanel.tsx`)**:
  - Cấu hình khởi chạy: Chọn chế độ bảng (Tự động / 4 bảng / 8 bảng), xem danh sách học sinh.
  - Điều khiển thời gian thực: Đồng hồ đếm ngược, nút Chốt lượt nhanh, nút Chuyển vòng xếp hạng.
  - Danh sách giám sát các bàn đấu trực tiếp.

---

## Giai đoạn 5: Tích Hợp Hệ Thống & Kiểm Tra Toàn Diện (System Integration)

- [ ] 5.1 **Đăng ký Activity Plugin vào Hệ thống**:
  - Đăng ký vào `packages/server/src/registry.ts`.
  - Thêm biểu tượng 🏐 và cấu hình modal mở hoạt động trong `apps/teacher-ui`.
  - Cấu hình quy tắc EXP mặc định trong bảng `reward_rules`.

- [ ] 5.2 **Kiểm thử Kiểm tra Tính Toàn Vẹn**:
  - Chạy kiểm tra nhanh `pnpm run typecheck` (`tsc -b`) đảm bảo không lỗi kiểu và không đứt gãy phụ thuộc.
  - Cập nhật tài liệu hướng dẫn trong `docs/activity-guide.md` và ghi nhận changelog trong `docs/CHANGELOG.md`.
