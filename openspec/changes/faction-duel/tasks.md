# Danh Sách Công Việc Triển Khai: Đại Chiến Xanh Đỏ Theo Elo (Faction Duel)

## Giai đoạn 1: Khởi Tạo Package & Mô Hình Dữ Liệu (Schemas)

- [ ] 1.1 **Khởi tạo thư mục package `@educlass/activity-faction-duel`**:
  - Tạo `packages/activities/faction-duel/package.json` và `tsconfig.json`.
  - Khai báo dependencies: `@educlass/core`, `@educlass/protocol`, `@educlass/ui-kit`, `zod`, `react`.
  - Đăng ký vào pnpm workspace và tsconfig solution.

- [ ] 1.2 **Định nghĩa Schemas dữ liệu (`src/faction-schemas.ts`)**:
  - `FactionMemberSchema`: Thông tin thành viên, phe Xanh/Đỏ, Elo, trạng thái clone.
  - `FactionQuestionSchema`: Định nghĩa câu hỏi, phương án, đáp án và thời gian.
  - `FactionMatchupSchema`: Dữ liệu cặp đấu 1v1, câu trả lời, thời gian làm bài, điểm trọng số Elo.
  - `FactionDuelStateSchema`: State toàn cục (lobby, team_reveal, round_active, round_eval, pick_phase, finished).
  - `FactionDuelConfigSchema`: Cấu hình giáo viên:
    - `totalRounds`: Số vòng đấu (mặc định 5).
    - `questionsPerMatch`: Tùy chọn số câu mỗi trận (1–5, mặc định 2).
    - `shuffleQuestions`: Đảo ngẫu nhiên câu hỏi (mặc định true).
    - `shuffleOptions`: Đảo ngẫu nhiên đáp án A/B/C/D (mặc định true).
    - `allowQuestionRecycle`: Lấy lại các câu hỏi cũ khi hết kho đề (mặc định true).
    - `answerTimeSeconds`: Thời gian trả lời mỗi câu (mặc định 20s).
    - `pickPhaseSeconds`: Thời gian chọn đối thủ (mặc định 15s).
  - `FactionDuelIntentSchema`: Các intent (`select_opponent`, `submit_answer`, `start_activity`, `next_round`, `finish`).
  - `FactionDuelResultSchema`: Bảng tổng kết kết quả cá nhân và kết quả phe thắng/thua.

---

## Giai đoạn 2: Thuật Toán Ghép Cặp, Clone Ngẫu Nhiên & Chấm Điểm Trọng Số Elo

- [ ] 2.1 **Thuật toán Chia Đội & Ghép Cặp Lượt 1 (`src/faction-draft.ts`)**:
  - Tích hợp `balanceTwoTeamsByElo` để phân bổ học sinh vào 2 phe Xanh - Đỏ cân bằng Elo.
  - Xử lý sĩ số lẻ: Hàm `selectRandomClone` chọn ngẫu nhiên 1 bạn bên phe ít người để nhân bản vị trí thi đấu.
  - Hàm `generateRound1Pairings`: Ghép cặp ngẫu nhiên hoàn toàn 1-1 giữa 2 phe.
  - Viết unit tests kiểm tra chia đội và ghép cặp ban đầu trong `__tests__/faction-draft.test.ts`.

- [ ] 2.2 **Thuật toán Pha Chọn Đấu Thủ 15 Giây (`src/faction-draft.ts`)**:
  - Hàm `handleSelectOpponent`: Xử lý khóa mục tiêu (First-Come First-Served), kiểm tra luật không lặp đối thủ.
  - Hàm `resolvePickPhaseTimeout`: Thuật toán tự động ghép ngẫu nhiên (Auto-Random Fallback) khi hết 15 giây.
  - Viết unit tests kiểm tra trường hợp tranh chấp chọn đối thủ cùng lúc và fallback hết giờ.

- [ ] 2.3 **Lõi Chấm Điểm & Trọng Số Elo (`src/faction-scoring.ts`)**:
  - Hàm `evaluateFactionMatchup`: Đánh giá đúng/sai, thời gian làm bài để xác định người thắng.
  - Hàm `calculateEloWeightedPoints`: Tính điểm trận theo trọng số Elo (+1 / +2 / +3 điểm / 0.5 hòa).
  - Hàm `aggregateTeamScores`: Tổng hợp điểm lũy kế của 2 phe Xanh - Đỏ sau mỗi lượt đấu.
  - Hàm `getQuestionsForRound`: Lấy số lượng câu hỏi cấu hình được, hỗ trợ đảo câu hỏi, đảo đáp án A/B/C/D độc lập và xoay vòng kho đề khi hết câu cũ.
  - Viết unit tests kiểm tra các trường hợp lật kèo (Underdog), đảo đáp án và xoay vòng câu hỏi trong `__tests__/faction-scoring.test.ts`.

---

## Giai đoạn 3: Triển Khai Server FSM Activity Plugin (Activity Module)

- [ ] 3.1 **Xây dựng `FactionDuelActivity` (`src/faction-activity.ts`)**:
  - Triển khai `onStart(ctx, cfg)`: Khởi tạo 2 phe theo Elo, chuẩn bị câu hỏi lượt 1.
  - Triển khai `onStudentIntent(ctx, st, participantId, intent)`:
    - Xử lý intent `select_opponent` trong pha 15s.
    - Xử lý intent `submit_answer` trong pha thi đấu.
    - Tự động chuyển trạng thái khi tất cả các cặp hoàn thành bài làm.
  - Triển khai `onTeacherIntent(ctx, st, intent)`:
    - Bắt đầu trận đấu (`start_activity`), ép kết thúc 15s (`skip_pick_phase`), chuyển vòng (`next_round`).
  - Triển khai `onEnd(ctx, st)`: Tổng kết điểm, vinh danh phe chiến thắng, trao thưởng EXP D8 (cộng thưởng thêm cho Underdog MVP).

- [ ] 3.2 **Kiểm thử Tích hợp Toàn diện (`__tests__/faction-activity.test.ts`)**:
  - Test mô phỏng trọn vẹn luồng chơi: Chia đội $\rightarrow$ Đấu Lượt 1 $\rightarrow$ Phe thắng chọn đối thủ Lượt 2 $\rightarrow$ Tổng kết trao cúp.

---

## Giai đoạn 4: Giao Diện Người Dùng (UI Components)

- [ ] 4.1 **Giao diện Học sinh `FactionDuelStudentView.tsx` (Mobile 360x640)**:
  - Màn hình công bố đội (Xanh / Đỏ) rực rỡ với màu sắc đặc trưng.
  - Màn hình 15s Chọn Đối Thủ:
    - Đội thắng: Lưới thẻ đối thủ, nhãn điểm thưởng (+1/+2/+3), nút chọn nhanh $\ge 48\text{px}$.
    - Đội thua: Màn hình chờ kịch tính "Ai sẽ thách đấu bạn?".
  - Màn hình Làm bài 1v1: Giao diện trả lời câu hỏi trực quan, phản hồi tức thì.
  - Màn hình Kết quả trận: Báo rõ số điểm mang về cho đội nhà.

- [ ] 4.2 **Giao diện Màn Chiếu `FactionDuelProjectorView.tsx`**:
  - Thiết kế sân đấu 2 phe: Xanh vs Đỏ.
  - Thanh kéo co tỷ lệ điểm số Tug-of-War ở trung tâm với hiệu ứng chuyển động rung lắc.
  - Hoạt cảnh tia sét ghép cặp thời gian thực trong 15s Pick Phase.
  - Băng rôn chiến sự vinh danh các pha lật kèo Underdog ngoạn mục.

- [ ] 4.3 **Giao diện Giáo viên `FactionDuelTeacherPanel.tsx`**:
  - Thanh trạng thái thời gian thực: Danh sách các cặp đấu đang làm bài.
  - Bảng tổng điểm và nút điều khiển linh hoạt cho giáo viên.

---

## Giai đoạn 5: Đăng Ký Hệ Thống & Hoàn Thiện Nghiệm Thu

- [ ] 5.1 **Đăng ký Activity Plugin vào Hệ thống**:
  - Thêm `@educlass/activity-faction-duel` vào `packages/server/src/registry.ts`.
  - Tích hợp biểu tượng và cấu hình mở nhanh trên `apps/teacher-ui`.
- [ ] 5.2 **Cập nhật Tài liệu & Quy chuẩn**:
  - Bổ sung hướng dẫn vận hành vào `docs/activity-guide.md`.
  - Cập nhật mục 8 trong `docs/PLAN.md` và ghi nhận lịch sử vào `docs/CHANGELOG.md`.
- [ ] 5.3 **Kiểm tra Chất lượng**:
  - Đảm bảo `pnpm run typecheck` (`tsc -b`) xanh sạch 100%.
