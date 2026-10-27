# CHANGELOG

## [2.2.19] - 2026-10-27

### Chế Độ Chơi: Đại Chiến Xanh Đỏ (thử nghiệm)
- **Module Activity Mới (`packages/activities/faction-duel`)**:
  - Hoạt động thi đấu chia 2 phe Xanh - Đỏ cân bằng lực lượng dựa trên điểm trình độ ẩn Elo (`balanceTwoTeamsByElo` Snake Draft ABBA).
  - Lượt 1: Bốc thăm ngẫu nhiên 1-1 giữa 2 phe.
  - Lượt 2 trở đi: Phe nhiều điểm hơn được quyền tự do chọn đối thủ bên phe ít điểm hơn trong 15 giây (khóa mục tiêu First-Come First-Served & kiểm tra luật không lặp đối thủ cũ). Hết 15 giây tự động ghép ngẫu nhiên (Auto-Random Fallback).
  - Thi đấu đồng loạt: Tất cả các cặp đấu cùng nhận và trả lời câu hỏi đồng thời trên thiết bị cá nhân (1–5 câu hỏi, mặc định 2 câu).
  - Cơ chế Phân thân (Clone): Chọn ngẫu nhiên 1 học sinh bên phe ít người khi sĩ số lẻ để đấu song song với 2 đối thủ, chỉ làm bài 1 lần duy nhất.
  - Tính điểm có trọng số Elo: Kèo dưới lật kèo thắng nhận +3đ, cân kèo nhận +2đ, kèo trên nhận +1đ, hòa nhận +0.5đ mỗi bên.
  - Tùy chọn linh hoạt: Đảo câu hỏi, đảo đáp án A/B/C/D độc lập chống nhìn bài, tự động xoay vòng lấy lại câu cũ khi hết kho đề.
  - Màn hình Học sinh mobile-first (360x640), Màn hình Màn chiếu (ProjectorView) với thanh kéo co năng lượng Tug-of-War theo thời gian thực và Màn hình Giáo viên điều phối.
  - Đặt chung vị trí với Kahoot, Quizizz, Đấu Cờ Thụy Sỹ trong Modal Game Hub (`apps/teacher-ui`) dưới tên hiển thị **"Đại Chiến Xanh Đỏ (thử nghiệm)"**.

### Chế Độ Chơi: Giải Đấu Bóng Chuyền (thử nghiệm)
- **Module Activity Mới (`packages/activities/volleyball-tournament`)**:
  - Thể thức giải đấu bóng chuyền học đường: Vòng bảng thi đấu vòng tròn 3 lượt tính điểm sau đó bắt cặp xếp hạng phân tầng 4 Cúp (Kim Cương, Vàng, Bạc, Đồng).
  - Kế thừa cơ chế trận đấu 2 câu hỏi/trận quen thuộc từ Đấu cờ (Thắng 2đ, Hòa 1đ, Thua 0đ).
  - Thuật toán thích ứng tự động: Tự động chia 4 Bảng (khi 15-23 HS) hoặc 8 Bảng (khi 24-40 HS).
  - Màn hình Học sinh mobile-first (360x640), Màn hình Giáo viên điều khiển lượt đấu, và Màn chiếu Projector trực quan hóa vòng bảng & cây nhánh đấu Playoff.
  - Tích hợp vào chung danh mục với Kahoot & Quizizz trong Modal Game Hub (`apps/teacher-ui`) dưới tên hiển thị **"Đấu Bóng Chuyền (thử nghiệm)"**.


## [2.2.18] - 2026-10-27

### Hệ Thống Điểm Trình Độ Ẩn (Hidden Elo / MMR) & Cân Bằng Đội Hình

1. **Lõi Đánh Giá Năng Lực Ẩn (`packages/core/src/elo`)**:
   - Xây dựng module tính toán Elo thuần túy (`elo.ts`): Điểm mặc định khởi điểm 1000, biên độ an toàn `[100, 3000]`.
   - `calculateIndividualGameElo`: Tính biến động Elo cho bài thi trắc nghiệm cá nhân (Quizizz, Kahoot / Quiz Live, Đường Đua Tri Thức) dựa trên tương quan kết quả thực tế vs điểm kỳ vọng so với mặt bằng chung của lớp.
   - `calculateTeamMatchElo`: Tính biến động Elo cho trận đấu đối kháng đồng đội 2 phe (Đại Chiến Lãnh Thổ) dựa trên chênh lệch Elo trung bình giữa hai đội, kết hợp hệ số đóng góp cá nhân (Personal Contribution Modifier: số ô chiếm đóng, gia cố, số câu đúng) để khen thưởng xứng đáng cho MVP và hạn chế người chơi không hoạt động.
   - `balanceTwoTeamsByElo`: Thuật toán phân bổ quân đội 2 phe Xanh - Đỏ tối ưu kết hợp giữa sắp xếp Elo giảm dần, phân bổ Rắn leo thang (Snake Draft: ABBA BAAB...) và tinh chỉnh hoán vị Greedy Swap (Karmarkar-Karp heuristic) sao cho $|\sum \text{Elo}_{Blue} - \sum \text{Elo}_{Red}| \approx 0$, kèm tham số Jitter tự nhiên chống trùng lặp.
   - `balanceNTeamsByElo`: Thuật toán chia đều học sinh có phong độ cao vào $N$ tổ/nhóm học tập.

2. **Lưu Trữ Bền Vững & Migration CSDL (`packages/db`)**:
   - Thêm cột `elo` (mặc định 1000) và index `idx_students_elo` vào bảng `students` qua Migration `0010_student_elo.sql`.
   - Bổ sung cơ chế bảo vệ tự phục hồi schema guard trong `ensureSchemaIntegrity(sqlite)`.
   - Mở rộng `StudentRepository`: Hỗ trợ cập nhật `elo`, `updateElo`, `updateEloBatch`.

3. **Cập Nhật Ngầm Sau Mỗi Trận Đấu (`packages/server`)**:
   - `ActivityEngine.endActivity()`: Tự động phân tích kết quả khi kết thúc hoạt động (`territory-war`, `quiz-live`, `circuit-race`), truy xuất học sinh qua `studentId` hoặc nhóm máy ghép đôi, tính toán và lưu điểm Elo mới vào DB một cách an toàn.
   - Điểm Elo được ẩn hoàn toàn phía Cổng học sinh, chỉ phục vụ thuật toán phân chia đội hình và giao diện giáo viên để tránh tâm lý so bì tiêu cực.

4. **Tích Hợp Cân Bằng Quân Lực Trong Đại Chiến Lãnh Thổ (`packages/activities/territory-war` & `apps/teacher-ui`)**:
   - `TerritoryParticipantInitSchema` & `TerritoryParticipantSchema`: Hỗ trợ lưu trữ thuộc tính `elo` cho từng chiến binh.
   - Thao tác "⚖️ Cân Bằng" (`auto_balance_teams`) trên màn hình Giáo viên tự động gọi thuật toán `balanceTwoTeamsByElo` để tái cân bằng quân số 2 bên theo thực lực.
   - `ActivityPanel.tsx`: Bổ sung bộ 3 tùy chọn chia đội trực quan trong cả Game Hub và Modal độc lập:
     * `⚖️ Cân bằng Elo ẩn` (Khuyên dùng)
     * `🎲 Ngẫu nhiên 50/50`
     * `👥 Theo tổ / nhóm đã chia`


### Tích Hợp Hệ Thống Tự Động Cập Nhật (Auto-Update On-Demand) & CI/CD GitHub Releases

1. **Cấu Hình Tự Động Đóng Gói Lên GitHub Releases (`.github/workflows/release.yml`)**:
   - Thiết lập luồng GitHub Actions tự động build, test và đẩy bộ cài đặt Windows NSIS (`Setup.exe`), file vi sai (`.blockmap`) và `latest.yml` thẳng lên mục GitHub Releases chính thức mỗi khi gắn `git tag v*`.
   - Cập nhật `.gitignore` chặn toàn bộ file binary `*.exe`, `*.blockmap`, `*.node` để bảo vệ dung lượng và tính toàn vẹn của repo Git.

2. **IPC Quản Lý Cập Nhật Phía Desktop (`apps/desktop`)**:
   - Tích hợp `electron-updater` với chế độ chủ động `autoDownload = false` và `autoInstallOnAppQuit = false` (chỉ tải và cài đặt khi giáo viên cho phép, tuyệt đối không tự ý ngắt quãng buổi dạy).
   - Bổ sung IPC handlers: `check-for-update`, `start-download-update`, `quit-and-install` và lắng nghe sự kiện tiến độ `download-progress`, `update-downloaded`.
   - Expose an toàn qua `preload.ts` vào `window.electronAPI`.

3. **Giao Diện Kiểm Tra & Nâng Cấp Phiên Bản (`apps/teacher-ui`)**:
   - Tạo mới `UpdateModal.tsx`: Hiển thị thông tin phiên bản hiện tại, phiên bản mới nhất, ghi chú phát hành, nút [Để sau] và [Tải & Cập nhật ngay], thanh tiến trình tải %, và nút [Khởi động lại ngay].
   - Tích hợp nút `[🔄 Cập nhật]` và sự kiện bấm vào huy hiệu phiên bản `v{APP_VERSION}` trên header bàn làm việc giáo viên.
   - Bổ sung nút kiểm tra cập nhật nhanh trên cửa sổ Launcher (`window.html`).

### Nâng Cấp Toàn Diện Trải Nghiệm "Đường Đua Tri Thức" (Circuit Race)

1. **Bản Đồ Đường Đua 2D Zigzag Uốn Lượn (Snake Pattern)**:
   - `CircuitTrackView.tsx`: Chuyển đổi hoàn toàn cơ chế hiển thị từ 1 hàng ngang cuộn sang bản đồ uốn lượn 2D (10 ô/hàng, zigzag đảo chiều hàng chẵn/lẻ) hiển thị trọn vẹn toàn bộ 30/50/80 ô cùng lúc trên màn hình, không cần cuộn ngang.
   - Thêm chỉ báo hướng rẽ ("Vòng cua tiếp") sinh động giữa các hàng.

2. **Hoạt Họa Di Chuyển Từng Bước (Step-by-Step Hopping Animation)**:
   - `CircuitTrackView.tsx`: Tích hợp bộ đếm bước chuyển động `animatedPositions`. Khi học sinh gieo xúc xắc hoặc bị ảnh hưởng bởi thẻ bổ trợ, avatar sẽ nhảy từng ô một (220ms/bước) kèm hiệu ứng nảy (bounce/hop) trực quan, đem lại cảm giác di chuyển chân thực và hào hứng cho cả lớp.

3. **Cơ Chế Tự Động Chuyển Vòng & Cửa Sổ Dùng Thẻ (Auto-Advance)**:
   - `circuit-schemas.ts` & `circuit-activity.ts`: Bổ sung `actionWindowSeconds` (mặc định 10s, có thể chỉnh 5s, 10s, 15s, 20s).
   - Tích hợp nhịp đồng bộ `sync_tick` từ máy giáo viên/máy chiếu: Sau khi học sinh làm bài xong hoặc hết thời gian làm bài, hệ thống tự động mở cửa sổ dùng thẻ 10 giây; khi hết 10 giây sẽ tự động tính toán lăn bánh và chuyển ngay sang câu hỏi tiếp theo mà không cần giáo viên phải thao tác thủ công.

4. **Tái Cấu Trúc Bố Cục Màn Hình Giáo Viên & Màn Chiếu (Projector Layout)**:
   - `CircuitTeacherPanel.tsx` & `CircuitProjectorView.tsx`: Loại bỏ hoàn toàn khối hiển thị câu hỏi trên màn hình chung.
   - Dành trọn vẹn 4/5 diện tích bên phải cho Bản đồ đường đua siêu to, trực quan.
   - 1/5 diện tích bên trái dành cho Bảng xếp hạng Top dẫn đầu (kèm huy hiệu 🥇🥈🥉) và Bảng tin chiến sự (Battle Logs) thời gian thực.
   - Header hiển thị đếm ngược thời gian to rõ: "LÀM BÀI: CÒN Xs" và "DÙNG THẺ: CÒN Ys".

5. **Bộ Tùy Chọn Đảo Câu Hỏi, Đảo Đáp Án & Thứ Tự Câu Hỏi Độc Lập Cho Từng Học Sinh**:
   - `circuit-schemas.ts` & `circuit-logic.ts`: Thêm `shuffleList` (thuật toán Fisher-Yates) và `shuffleQuestionOptions` để đảo thứ tự đáp án $A,B,C,D$.
   - Tùy chọn `independentStudentQuestionOrder`: Tự sinh thứ tự câu hỏi ngẫu nhiên độc lập cho từng học sinh (`assignedQuestionOrder` và `assignedQuestion`), ngăn chặn hoàn toàn việc nhìn bài nhau trong lớp.
   - `CircuitStudentView.tsx` & `packages/server/public/student/js/circuit.js`: Tự động ưu tiên hiển thị câu hỏi độc lập được giao cho học sinh.
   - `apps/teacher-ui/src/components/ActivityPanel.tsx`: Bổ sung đầy đủ 3 checkbox cấu hình trong modal khởi tạo: "Đảo thứ tự câu hỏi", "Đảo thứ tự đáp án (A, B, C, D)", và "Mỗi học sinh thứ tự câu khác nhau (Chống nhìn bài)".

### Nâng Cấp Hệ Thống Vật Phẩm (Power-ups) Cho Học Sinh Ở Chế Độ Quizizz

1. **Giao Diện Túi Đồ & Hiệu Ứng Chiến Đấu Thời Gian Thực Cho Học Sinh (`packages/server/public/student/`)**:
   - `index.html`: Bổ sung thanh túi đồ chiến thuật (`#quiz-inventory-bar`) hiển thị các ô chứa vật phẩm nhặt được kèm hiệu ứng phát sáng cho vật phẩm kế tiếp (`.powerup-slot-next`), nút kích hoạt nhanh `⚡ DÙNG [Tên vật phẩm]`.
   - Bổ sung lớp phủ đóng băng (`#quiz-freeze-overlay`) kèm đồng hồ đếm ngược khi bị đối thủ tấn công bằng Đóng Băng, lớp sương mù (`#quiz-smoke-overlay`) khi trúng Bom Khói.
   - Thêm cụm huy hiệu trạng thái buff (`#quiz-active-buffs`) hiển thị trực quan khi đang kích hoạt Khiên hộ thể (🛡️), Phản đòn (🪞), hoặc Sấm sét x2 điểm (⚡).
   - Thêm banner thông báo chiến sự (`#quiz-combat-notification`) khi nhặt được vật phẩm, tấn công, phòng thủ hoặc phản đòn thành công.
2. **Logic Tương Tác Vật Phẩm Phía Học Sinh (`packages/server/public/student/js/quiz.js`)**:
   - Triển khai `updateQuizCombatUI(quizState, myProgress)`: Đồng bộ trạng thái vật phẩm từ máy chủ, đếm ngược thời gian tan hiệu ứng đóng băng/khói mù, tự động làm mờ và vô hiệu hóa các đáp án sai khi dùng Kính soi 50/50 (`hiddenOptions`), khóa tương tác khi bị đóng băng.
   - Triển khai `handleUsePowerUp()`: Gửi intent `use_powerup` lên server ngay lập tức để giải phóng vật phẩm đầu tiên trong hàng đợi, đồng thời cập nhật UI tức thì cho học sinh.
   - `resetQuizState()`: Tự động dọn sạch overlay và reset túi đồ khi bắt đầu bài thi mới.

### Tối Ưu Hóa Dạng Câu Hỏi Cho Đấu Cờ Thụy Sỹ & Đại Chiến Lãnh Thổ

1. **Hỗ Trợ Câu Trả Lời Ngắn (Short Answer)**:
   - Tích hợp dạng câu hỏi điền số/từ ngắn vào vòng xoay câu hỏi của Đấu Cờ Thụy Sỹ và Đại Chiến Lãnh Thổ, kiểm tra khớp đáp án chính xác.
2. **Tự Động Bỏ Qua Chùm Đúng/Sai (TF-Group)**:
   - Loại trừ câu hỏi chùm đúng sai ra khỏi danh sách câu hỏi của các chế độ đối kháng nhịp nhanh để bảo đảm tính công bằng và thời lượng mỗi lượt đấu.

## [2.2.16] - 2026-10-26

### Phát Triển & Triển Khai Hoạt Động Mới: Đường Đua Tri Thức (Circuit Race)

1. **Khởi Tạo Package Mới `@educlass/activity-circuit-race`**:
   - `circuit-schemas.ts`: Xây dựng đầy đủ Zod Schemas cho cấu hình (`CircuitConfigSchema`), thẻ bổ trợ (`CardSchema`, `CardTypeSchema`), các loại ô đường đua (`TrackTileSchema`, `TileTypeSchema`), bẫy vỏ chuối (`BananaTrapSchema`), 4 dạng câu hỏi (`CircuitQuestionSchema`), trạng thái FSM (`CircuitStateSchema`), intents học sinh/giáo viên và kết quả (`CircuitResultSchema`).
   - `circuit-logic.ts`: Triển khai các hàm thuần cốt lõi: `generateTrack` (sinh bản đồ 30/50/80 ô với ô Tăng tốc, Sa lầy, Rương may mắn, Checkpoint), `drawRandomCard`, `gradeCircuitAnswer` (chấm tự động 100% cho 4 dạng câu hỏi: MCQ, Đúng/Sai đơn, Chùm Đúng/Sai chuẩn BGD 4 ý $a,b,c,d$ với thang điểm phân tầng, Điền ngắn), `applyCardEffect` (thi hành 14 loại thẻ bổ trợ chiến thuật với tương tác đa chiều, khiên hộ mệnh, gương phản đòn), `resolveMovement` (kích hoạt ô đặc biệt, trượt vỏ chuối).
   - `circuit-activity.ts`: Đóng gói `ActivityDefinition` chuẩn hợp đồng PLAN.md với vòng đời `onStart`, `onStudentIntent`, `onTeacherIntent`, `onEnd`, tích hợp thưởng EXP vĩnh viễn `ctx.grantReward` (`correct_answer`, `streak_3`, `podium_win`, `race_finish`).
   - `circuit-logic.test.ts`: Viết bộ unit test toàn diện kiểm tra sinh đường đua, rút thẻ, chấm điểm câu hỏi và cơ chế can thiệp tương tác.

2. **Thiết Kế Giao Diện UI/UX Chuyên Nghiệp**:
   - `CircuitTrackView.tsx`: Hiển thị bàn cờ đường đua uốn lượn trực quan, phân biệt rõ các ô sự kiện, gom cụm avatar khi đứng chung ô, viền nổi bật vị trí người chơi hiện tại.
   - `CircuitCardInventory.tsx`: Túi đồ chiến thuật hiển thị tối đa 2 thẻ bổ trợ, hỗ trợ nút dùng thẻ và vứt thẻ quy đổi EXP.
   - `CircuitStudentView.tsx`: Giao diện di động dọc (chuẩn 360×640), vùng chạm $\ge 48\text{px}$, tích hợp thẻ câu hỏi đa dạng (hỗ trợ công thức và hình ảnh), hiệu ứng gieo xúc xắc và cửa sổ dùng thẻ chiến thuật, banner rung chuông cảnh báo khi bị đối thủ tác động.
   - `CircuitTeacherPanel.tsx`: Bảng điều khiển dành cho giáo viên với nút mở cửa sổ dùng thẻ, chuyển vòng, thống kê tỷ lệ đúng trực tiếp, bảng xếp hạng Top dẫn đầu và bảng tin chiến sự Live Feed.
   - `CircuitProjectorView.tsx`: Màn hình chiếu lớp học toàn cảnh với độ phân giải cao, camera theo dõi tay đua, ticker chiến sự thời gian thực và bục vinh quang Podium vinh danh Top 1, 2, 3 rực rỡ.

3. **Tích Hợp Vào Toàn Bộ Hệ Thống EduClass v2**:
   - `packages/server/src/activity/registry.ts`: Đăng ký `CircuitRaceActivity` vào danh mục hoạt động mặc định.
   - `apps/teacher-ui`: Tạo plugin `circuit-race.plugin.tsx`, đăng ký vào `activityPluginsRegistry`, bổ sung tùy chọn khởi chạy Đường Đua Tri Thức kèm cấu hình độ dài đường đua và thời gian mỗi câu trong `ActivityPanel.tsx`.
   - `apps/student-ui`: Đăng ký `CircuitStudentView` vào `ActivityHost.tsx`.
   - Biên dịch TypeScript toàn bộ monorepo (`tsc -b`) xanh sạch 100%.

### Đấu Cờ Thụy Sỹ: Tối Ưu Độ Bền Bỉ Khi Học Sinh Vào Trễ, Rớt Mạng / Thoát Ra, Hoặc Vào Lại

1. **Cơ Chế Tự Động Chốt Vòng Đấu Khi Hết Giờ (Auto-Timeout cho Vòng Đấu)**:
   - `swiss-activity.ts`: Thêm hàm `checkAndFinalizeRoundTimeout`. Khi hiệp đấu vượt quá thời gian làm bài của 2 câu hỏi (+ 3s ân hạn trễ mạng), hệ thống tự động chốt điểm cho những học sinh chưa nộp bài (do rớt mạng hoặc thoát ra), tính thắng/thua/hòa công bằng cho đối thủ và kích hoạt đếm ngược 10s sang vòng mới, ngăn chặn hoàn toàn việc cả lớp bị kẹt lại khi có học sinh bỏ cuộc hoặc tắt máy.
2. **Xử Lý Học Sinh Vào Trễ & Đang Chờ Bốc Thăm Vòng Tiếp Theo**:
   - `SwissDuelStudentView.tsx`: Bổ sung màn hình chờ riêng biệt (`!myMatchup`) thông báo rõ ràng cho học sinh vào trễ biết hiệp hiện tại đang diễn ra và các em sẽ tự động được bốc thăm ghép bàn ở vòng kế tiếp. Tự động gửi intent `join_tournament` khi mount nếu chưa có trong danh sách.
   - `swiss.js`: Nâng cấp giao diện chờ sang thẻ thông báo chuyên nghiệp, thân thiện trên trình duyệt web học sinh.
   - `SwissDuelTeacherPanel.tsx`: Thêm thanh banner thông báo cho giáo viên biết danh sách học sinh vừa vào phòng đấu đang chờ bốc thăm ở vòng kế tiếp, kèm nút bấm *"Bốc thăm lại ngay"* nếu chưa có bàn nào hoàn thành ở vòng đó.

## [2.2.14] - 2026-10-26

### Sửa Lỗi Không Nhập Được Tên Lớp Học Khi Bấm Thêm Lớp (`ClassTab`, `Modal`, `desktop/main.ts`)

1. **Khắc phục lỗi mất tiêu điểm (focus) ô nhập tên lớp học (`ClassTab.tsx`, `Modal.tsx`)**:
   - **Nguyên nhân**: Khi bấm "+ Thêm lớp học", nút bấm giữ tiêu điểm và sự kiện click của trình duyệt ngăn `autoFocus` đặt con trỏ vào ô nhập. Người dùng bấm phím thì ký tự không vào input. Ngoài ra, khi mở cửa sổ giáo viên từ ứng dụng Desktop (Electron), cửa sổ không được gọi `.focus()` trực tiếp khiến OS không trao quyền gõ bàn phím cho tới khi người dùng thoát ra vào lại cửa sổ.
   - **Giải pháp**:
     - `ClassTab.tsx`: Bổ sung `classNameInputRef` và `useEffect` tự động kích hoạt `focus()` và `select()` ngay khi mở modal; dọn sạch state `newClassName` mỗi khi mở/đóng modal; thêm nút bấm "+ Thêm lớp học ngay" ở trạng thái rỗng.
     - `packages/ui-kit/src/components/Modal.tsx`: Tự động tìm kiếm phần tử `[autofocus]` hoặc `input`/`textarea` đầu tiên bên trong modal để gọi `.focus()` sau khi modal hiển thị; chặn nổi bọt sự kiện click trên thẻ card modal `onClick={e => e.stopPropagation()}` và bảo đảm `pointerEvents: 'auto'`.
     - `packages/ui-kit/src/components/Input.tsx`: Bổ sung `pointerEvents: 'auto'` trên `containerStyle`.
     - `apps/desktop/src/main.ts`: Khi mở `teacherWindow`, gắn các listener `ready-to-show` và `did-finish-load` đồng thời gọi `teacherWindow.show()` và `teacherWindow.focus()` để Windows OS luôn kích hoạt bàn phím ngay lập tức.
     - Đồng bộ và build lại Vite bundle mới nhất vào `packages/server/public/teacher/`.
     - Bổ sung unit test kiểm tra mở modal và nhập tên lớp thành công trong `class-tab.test.tsx`.


## [2.2.13] - 2026-10-24

### Quizizz: Khắc Phục Hiện Tượng Reset Input Câu Trả Lời Ngắn & Hỗ Trợ Đầy Đủ Câu Đúng/Sai Chùm (tf_group)

1. **Khắc phục lỗi reset input đang gõ ở câu hỏi trả lời ngắn (`quiz.js`, `state.js`)**:
   - **Nguyên nhân**: Poller chu kỳ 1–2 giây gọi `showQuizQuestion()` liên tục ghi đè `optionsContainer.innerHTML`, hủy component DOM input và tạo lại từ đầu, khiến nội dung học sinh vừa nhập bị xóa và mất focus.
   - **Giải pháp**:
     - Thêm cờ `renderedQuestionIdx` trong `state.js`.
     - Trong `showQuizQuestion()`, kiểm tra nếu câu hỏi hiện tại đã được render (`state.renderedQuestionIdx === qIdx`) và container đã có phần tử, lập tức bỏ qua việc vẽ lại DOM, chỉ cập nhật thanh tiến trình và streak header.
     - Reset `state.renderedQuestionIdx = -1` khi đổi câu hỏi hoặc reset trạng thái quiz.

2. **Hỗ trợ đầy đủ câu hỏi Đúng/Sai chùm (`tf_group` 4 ý a, b, c, d) chuẩn Bộ GD&ĐT 2025**:
   - **Schema & Type (`quiz-schemas.ts`)**:
     - Thêm `'tf_group'` vào `QuizQuestionTypeSchema`.
     - Thêm trường `items` (mảng các ý con với `text` và `correct`) vào `QuizQuestionSchema` và phiên bản công khai trong `QuizLiveStateSchema`.
     - Mở rộng kiểu dữ liệu `correctAnswer` hỗ trợ `z.array(z.boolean())` và `z.record(z.string(), z.boolean())`.
   - **Chấm điểm & Khởi tạo (`quiz-activity.ts`)**:
     - Thêm case `'tf_group'` trong `checkAnswerCorrectness()`: kiểm tra chính xác từng ý với mảng boolean học sinh chọn.
     - Ẩn đáp án đúng của từng ý trong `items` ở `sanitizedQuestions` trước khi phát sóng cho học sinh.
   - **Chuyển đổi câu hỏi Giáo viên (`ActivityPanel.tsx`)**:
     - Bổ sung nhánh xử lý `qType === 'tf_group'` chuyển đổi từ Ngân hàng đề thi / Đề thi Word sang cấu trúc Quiz Live với 4 ý a, b, c, d.
   - **Giao diện Học sinh (`quiz.js`, `quiz-views.tsx`)**:
     - Thêm render giao diện chọn Đúng / Sai dạng toggle button xanh/đỏ cho từng ý a, b, c, d kèm nút "Gửi câu trả lời Đúng / Sai".
     - Thêm hàm `handleSelectTfGroupItem()` và `handleSubmitQuizTfGroup()` kiểm tra tình trạng chưa chọn ý trước khi gửi.
     - Hỗ trợ màn hình đối chiếu đáp án chi tiết (`showQuizizzAnswerReview`) cho dạng câu hỏi `tf_group`: hiển thị rõ ràng từng ý đã khớp hay chưa khớp với đáp án đúng.
   - Toàn bộ monorepo pass `pnpm run typecheck` (`tsc -b`) không lỗi. Đã sync cập nhật vào bản build.

3. **Tối ưu hóa câu hỏi cho Đấu Cờ (Swiss Duel) & Đại Chiến Lãnh Thổ (Territory War)**:
   - **Bổ sung câu trả lời ngắn (`short`)**:
     - `ActivityPanel.tsx`: Cập nhật logic load câu hỏi cho cả 2 chế độ, hỗ trợ đầy đủ `type: 'short'` và parse danh sách đáp án được chấp nhận `parseShortCorrectAnswer`.
     - `territory-logic.ts`: Hàm `checkTerritoryAnswerCorrectness` hỗ trợ kiểm tra mảng các đáp án đúng `string[]` khi học sinh công thành hoặc gia cố ô đất.
     - `TerritoryStudentView.tsx`: Thêm sự kiện phím `Enter` trên ô nhập câu trả lời ngắn để học sinh nộp bài công thành tức thì.
   - **Tự động lọc bỏ câu chùm Đúng/Sai (`tf_group`)**:
     - Cả 2 chế độ Đấu Cờ và Đại Chiến Lãnh Thổ tự động lọc bỏ (filter out) dạng câu `tf_group` khi giáo viên chọn đề thi hỗn hợp, đảm bảo nhịp độ thi đấu thời gian thực và trải nghiệm trực quan không bị nghẽn/tràn màn hình.


### Chế độ chơi Đấu Cờ Thụy Sỹ (Swiss Duel) — Tùy Chọn Cho Phép Đảo Câu Hỏi & Đảo Đáp Án

1. **Mở Rộng Schema & Logic Cấu Hình (`@educlass/activity-swiss-duel`)**:
   - `packages/activities/swiss-duel/src/swiss-schemas.ts`:
     - Bổ sung `shuffleQuestions: z.boolean().optional().default(true)` vào `SwissDuelConfigSchema` và `SwissDuelStateSchema`.
     - Bổ sung `shuffleOptions: z.boolean().optional().default(true)` vào `SwissDuelConfigSchema` và `SwissDuelStateSchema`.
   - `packages/activities/swiss-duel/src/swiss-scoring.ts`:
     - Xuất khẩu hàm `toOptionIndex(val)`.
     - Thêm hàm `shuffleList(array, rng)` thực hiện xáo trộn Fisher-Yates ngẫu nhiên an toàn.
     - Thêm hàm `shuffleQuestionOptions(question, rng)` xáo trộn phương án `mcq4` và tính toán lại vị trí `correctAnswer` tương ứng với đáp án đúng ban đầu.
   - `packages/activities/swiss-duel/src/swiss-activity.ts`:
     - Trong `server.onStart`: Tự động đảo câu hỏi khi `shuffleQuestions: true` (mặc định) và đảo phương án đáp án `mcq4` khi `shuffleOptions: true` (mặc định).
     - Giữ nguyên toàn bộ logic đồng bộ các hiệp đấu và chấm điểm 2 câu/hiệp giữa 2 học sinh cùng bàn đấu.
   - `packages/activities/swiss-duel/src/components/SwissDuelTeacherPanel.tsx`:
     - Hiển thị badge trực quan `🔀 Đảo câu` và `🔀 Đảo đáp án` trên thanh tiêu đề giáo viên khi tùy chọn đang kích hoạt.

2. **Giao Diện Giáo Viên (`apps/teacher-ui/src/components/ActivityPanel.tsx`)**:
   - Thêm state `swissShuffleQuestions` (mặc định `true`) và `swissShuffleOptions` (mặc định `true`).
   - Tích hợp 2 checkbox điều khiển có nhãn rõ ràng, thân thiện tiếng Việt vào cả 2 luồng khởi chạy:
     - Luồng 1: Khởi chạy Đấu Cờ Thụy Sỹ từ Game Hub Quiz Live (`quizMode === 'swiss-duel'`).
     - Luồng 2: Khởi chạy Đấu Cờ Thụy Sỹ từ modal khởi chạy tiện ích độc lập (`selectedActivity.id === 'swiss-duel'`).
   - Truyền đầy đủ `shuffleQuestions` và `shuffleOptions` vào payload `onStartActivity('swiss-duel', ...)`.

3. **Kiểm Tra & Độ Phủ Test**:
   - Thêm unit test kiểm tra `shuffleList` và `shuffleQuestionOptions` bảo đảm đảo phương án và giữ nguyên tính chính xác của `correctAnswer` trong `swiss-scoring.test.ts`.
   - Thêm unit test trong `swiss-activity.test.ts` kiểm tra giá trị mặc định là `true`, cũng như mô phỏng nộp bài thi thành công khi đảo đáp án.
   - `pnpm run typecheck` (`tsc -b`) đạt 100% xanh không lỗi trên toàn bộ monorepo.

## [2.2.11] - 2026-10-24

### Ghép 2–3 Học Sinh Ngồi Chung 1 Máy (Multi-Student Device Pairing) — Giai Đoạn 4 & 5: Giao Diện Học Sinh & Nghiệm Thu Toàn Diện

1. **Khay Thẻ Chips Chọn Nhiều Bạn (`StudentPortal.tsx`)**:
   - Khi phiên bật `allowPairing: true`, hiển thị banner hướng dẫn ghép máy và cho phép chọn từ 1 đến `maxStudentsPerDevice` học sinh.
   - Thêm khay thẻ Chips `[ 👤 Họ và tên ✕ ]` phía trên danh sách, cho phép xem nhanh và bấm xóa từng bạn hoặc xóa tất cả.
   - Nút hành động CTA động: `Vào lớp cho 2 bạn (Tên A & Tên B) →`.
   - Giới hạn trần số lượng tối đa với thông báo cảnh báo thân thiện tiếng Việt.

2. **Xác Thực Mã PIN Cá Nhân Từng Bạn (`step: pin_team`)**:
   - Tự động hiển thị các ô nhập PIN riêng biệt cho từng bạn có cài mật khẩu trong nhóm ghép (`input-pin-{studentId}`).
   - Kiểm tra đầy đủ mã PIN của tất cả học sinh trước khi gửi `StudentJoinRequest`.

3. **Màn Hình Chờ & Vinh Danh Thưởng EXP Nhóm**:
   - Thẻ người chơi (Player Card) hiển thị huy hiệu `👥 Nhóm ghép X bạn chung máy`.
   - Banner chúc mừng khi nhận thưởng EXP realtime vinh danh cả nhóm máy: `🎁 Thưởng +X EXP cho cả nhóm (Tên A & Tên B)! Tất cả các bạn đều được ghi nhận EXP vào tài khoản cá nhân!`.
   - Viết bài test tích hợp hoàn chỉnh tại `apps/student-ui/src/__tests__/student-portal.test.tsx`.

4. **Kiểm Tra & Nghiệm Thu**:
   - Chạy `pnpm run typecheck` (`tsc -b`) xanh 100% không lỗi trên toàn bộ 6 packages và 3 apps.
   - Cập nhật tài liệu Kế hoạch tổng `docs/PLAN.md` và `openspec/changes/multi-student-device-pairing/tasks.md`.

## [2.2.10] - 2026-10-24

### Ghép 2–3 Học Sinh Ngồi Chung 1 Máy (Multi-Student Device Pairing) — Giai Đoạn 3: Giao Diện Giáo Viên (Teacher UI)

1. **Cấu hình Ghép máy Trong Modal Mở Phiên (`SessionControl.tsx`)**:
   - Thêm checkbox `Cho phép ghép 2–3 học sinh ngồi chung 1 máy` và dropdown số lượng `Tối đa 2 bạn / máy` hoặc `Tối đa 3 bạn / máy`.
   - Kết nối dữ liệu vào payload `onOpenSession` (`allowPairing`, `maxStudentsPerDevice`).

2. **Giám sát & Quản lý Người Tham gia Ghép Đôi / Ba**:
   - Hiển thị huy hiệu trực quan `👥 X bạn chung máy` bên cạnh tên máy ghép trong danh sách người tham gia (`data-testid="pairing-badge-{id}"`).
   - Modal Thưởng EXP: Hiển thị ghi chú giải thích cơ chế phân bổ EXP tự động cho tất cả học sinh trong nhóm máy khi giáo viên phát thưởng trực tiếp.
   - Bổ sung unit tests cho cấu hình ghép máy trong `apps/teacher-ui/src/__tests__/session-control.test.tsx`.

## [2.2.9] - 2026-10-24

### Ghép 2–3 Học Sinh Ngồi Chung 1 Máy (Multi-Student Device Pairing) — Giai Đoạn 2: Xử Lý Phía Server & Thưởng Fan-out

1. **Endpoint Vào Lớp Đa Chủ Thể (`POST /api/sessions/join`)**:
   - `packages/server/src/routes/sessions.ts`:
     - Tiếp nhận `studentIds?: string[]` và `pins?: Record<string, string>`.
     - Kiểm tra trần số lượng $\le maxStudentsPerDevice$ khi phiên bật `allowPairing`.
     - Kiểm tra toàn bộ học sinh hợp lệ thuộc về `classId` của phiên.
     - Khóa đồng thời (Atomic Lock theo D7): Duyệt qua danh sách học sinh online để từ chối ngay lập tức nếu bất kỳ học sinh nào trong nhóm máy đã bị máy khác đăng nhập.
     - Xác thực mã PIN cá nhân cho từng học sinh có đặt mật khẩu.
     - Tự động ghép họ tên trang trọng `displayName = loadedStudents.map(s => s.fullName).join(' & ')`.
     - Lưu trữ danh sách `studentIdsJson` trong bản ghi `participants`.

2. **Cơ Chế Phân Bổ EXP Tự Động (Rewards Fan-out theo D8)**:
   - `packages/server/src/activity/engine.ts`:
     - Khi `ctx.grantReward()` được gọi, tự động trích xuất `studentIds` thông qua `ParticipantRepository.getStudentIds(participant)`.
     - Duyệt qua từng học sinh để gọi `rewards.grant()`, cộng EXP vào CSDL vĩnh viễn cho tất cả các học sinh ngồi chung máy trong cùng transaction.
   - `POST /api/sessions/:id/rewards/grant`:
     - Hỗ trợ giáo viên thưởng EXP trực tiếp cho máy đôi/nhóm, tự động phân phối đều hoặc nhận đủ cho từng bạn.

3. **Tra Cứu Phiên & Roster (`/roster`, `/lookup`, `/open-list`)**:
   - `GET /api/sessions/code/:code/roster`: Đánh dấu `isTaken = true` cho toàn bộ học sinh trong nhóm máy, truyền thông tin `allowPairing` và `maxStudentsPerDevice` về Cổng học sinh.
   - Viết bài test tích hợp hoàn chỉnh tại `packages/server/src/__tests__/session-pairing-routes.test.ts`.

### Ghép 2–3 Học Sinh Ngồi Chung 1 Máy (Multi-Student Device Pairing) — Giai Đoạn 1: Giao Thức & CSDL

1. **Giao Thức & Zod DTO (`@educlass/protocol`)**:
   - `packages/protocol/src/session.ts`:
     - Mở rộng `SessionSettingsSchema`, `SessionDtoSchema`, `CreateSessionRequestSchema`, `JoinCodeLookupResponseSchema`, `ActiveSessionItemSchema`, `SessionRosterResponseSchema`: Thêm cấu hình `allowPairing?: boolean` và `maxStudentsPerDevice?: number` (chọn 2 hoặc 3 học sinh/máy).
     - Mở rộng `StudentJoinRequestSchema`: Bổ sung mảng `studentIds?: string[]` và map mật khẩu `pins?: Record<string, string>`, cho phép gửi danh sách nhiều học sinh cùng vào lớp trên 1 thiết bị.
     - Mở rộng `ParticipantDtoSchema`: Bổ sung `studentIds?: string[]`.
   - Viết test case kiểm thử toàn diện cho các schema mới trong `packages/protocol/src/__tests__/session.test.ts`.

2. **Cơ Sở Dữ Liệu & Repository (`@educlass/db`)**:
   - `packages/db/src/schema/index.ts`: Bổ sung cột `studentIdsJson: text('student_ids_json')` vào bảng `participants`.
   - `packages/db/src/migrations/0009_participant_student_ids.sql`: Tạo migration SQLite thêm cột `student_ids_json` cho bảng `participants`.
   - `packages/db/src/migrator.ts`: Cập nhật `EMBEDDED_MIGRATIONS` (version 9) và tự động rà soát `ensureSchemaIntegrity`.
   - `packages/db/src/repositories/participant-repository.ts`:
     - Bổ sung hàm tiện ích tĩnh `getStudentIds(participant)` trích xuất danh sách học sinh từ JSON hoặc fallback về `studentId`.
     - Thêm `findBySessionAndAnyStudentId(sessionId, studentIds)` và `findOnlineBySessionAndAnyStudentId(sessionId, studentIds)` phục vụ kiểm tra chống chọn trùng và tìm kiếm theo phiên.
   - Viết unit tests kiểm thử tại `packages/db/src/__tests__/participant-repository.test.ts`.


### Tùy Chọn Cho Phép Học Sinh Chơi Lại / Làm Lại Nhiều Lần Trong Quizizz (`quiz-live`)

1. **Giao Thức & Cấu Hình (`@educlass/activity-quiz-live`)**:
   - `quiz-schemas.ts`:
     - Thêm trường `allowReplay?: boolean` vào `QuizLiveConfigSchema` và `QuizLiveStateSchema`.
     - Thêm trường `replayCount?: number` (số lần đã chơi lại) và `bestScore?: number` (điểm cao nhất bảo lưu qua các lượt chơi) vào `ParticipantQuizProgressSchema`.
   - `quiz-activity.ts`:
     - Bổ sung bộ xử lý intent học sinh `restart_quiz`: Khi học sinh gửi yêu cầu chơi lại và giáo viên có bật `allowReplay`, server lưu giữ điểm cao nhất `bestScore = Math.max(bestScore, score)`, tăng `replayCount`, đồng thời làm mới lại tiến trình làm bài (`score = 0, currentIndex = 0, isCompleted = false, answers = {}`) để học sinh quay lại làm từ Câu 1.
     - Cập nhật hàm `buildLeaderboard`: Điểm xếp hạng của học sinh trên bảng xếp hạng được bảo lưu dựa trên `effectiveScore = Math.max(bestScore, score)`, giúp học sinh yên tâm chơi lại để cải thiện điểm mà không sợ bị mất thứ hạng đã đạt được.

2. **Giao Diện Giáo Viên (`apps/teacher-ui`)**:
   - `ActivityPanel.tsx`:
     - Thêm state `quizAllowReplay` (mặc định bật `true`).
     - Bổ sung tùy chọn checkbox trong mục Cấu hình Quizizz:
       *"🔄 Cho phép học sinh chơi lại (làm lại thêm nhiều lần khi hoàn thành)"*.
     - Truyền cấu hình `allowReplay` lên máy chủ khi bắt đầu bài Quizizz.

3. **Cổng Học Sinh (`public/student/` & `QuizLiveStudentView`)**:
   - `packages/server/public/student/index.html` & `js/quiz.js`:
     - Trên màn hình hoàn thành bài thi (`#quiz-finished-view`): Khi bài Quizizz cho phép chơi lại, hiển thị nút bấm to bản nổi bật **"🔄 Chơi lại lần nữa"** và thống kê số lượt đã chơi kèm điểm cao nhất đạt được.
     - Hàm `handleQuizReplay()`: Gửi intent `restart_quiz` lên máy chủ và tự động đưa học sinh quay lại màn hình làm bài mượt mà.
   - `packages/activities/quiz-live/src/quiz-views.tsx`:
     - Tích hợp nút `🔄 Chơi lại lần nữa` trên React component `QuizLiveStudentView` cho ứng dụng học sinh desktop.

### Khắc Phục Lỗi Mở File Mẫu Word (`de-thi-mau-educlass.docx`) Bị Lỗi XML Schema (Location: Part:/word/document.xml, line:39)

1. **Khắc Phục Cấu Trúc DrawingML Tuân Thủ Chuẩn ECMA-376 (`@educlass/question-kit`)**:
   - `packages/question-kit/src/word/fixtures-generator.ts`:
     - Nguyên nhân: Thẻ `<w:drawing>` cho hình ảnh minh họa ở Câu 4 (tại dòng 39 của `word/document.xml`) trước đây chỉ chứa thẻ `<wp:inline>` và `<a:graphicData>` mà thiếu các phần tử bắt buộc theo đặc tả OpenXML DrawingML của Microsoft Office (thiếu `<wp:extent>`, `<wp:docPr>`, `<pic:nvPicPr>`, `<pic:spPr>`), khiến Microsoft Word từ chối nạp XML và báo lỗi: `Location: Part:/word/document.xml, line:39, column 0`.
     - Bổ sung hàm tiện ích `createInlineDrawingXml(docPrId, name, rId, cx, cy)` tạo cấu trúc XML DrawingML hoàn chỉnh, hợp lệ 100% theo chuẩn ECMA-376 ISO/IEC 29500:
       - Khai báo đầy đủ namespaces: `xmlns:wp`, `xmlns:a`, `xmlns:pic` trên gốc `<w:document>`.
       - Định nghĩa đúng kích thước chuẩn EMU (`wp:extent`), thuộc tính phi trực quan (`wp:docPr`), khóa khung hình (`wp:cNvGraphicFramePr`), thông tin hình vẽ (`pic:nvPicPr`, `pic:blipFill`, `pic:spPr`).
     - Tái tạo lại toàn bộ các file mẫu Word:
       - `tests/fixtures/word-samples/de-thi-mau-educlass.docx`
       - `tests/fixtures/word-samples/sample-5-geography-images.docx`
       - Đồng bộ sang `packages/question-kit/tests/fixtures/word-samples/`.
   - Kiểm thử thực tế với Microsoft Word 16.0 (COM Automation): Mở thành công 100% tất cả các file mẫu mà không còn bất kỳ cảnh báo hay lỗi nào.

## [2.2.6] - 2026-10-24

### Cập Nhật Chọn Thư Mục Lưu Bài Nộp: Giữ Nguyên Đúng Thư Mục Được Chọn (Không Đánh Thêm Số Thứ Tự)

1. **Giữ Nguyên Chính Xác Thư Mục Được Chọn (`packages/server` & `apps/teacher-ui`)**:
   - Khi giáo viên chọn thư mục trên máy tính qua hộp thoại Windows hoặc nhập đường dẫn lưu bài nộp: Hệ thống lưu đúng thư mục được chọn đó, không tự ý đánh thêm số thứ tự `(1), (2)...` như trước.
   - Endpoint `POST /api/system/select-folder`: Khi giáo viên chọn thư mục qua hộp thoại `FolderBrowserDialog`, trả về trực tiếp đường dẫn đã chọn `selectedPath`.
   - Endpoint `POST /api/system/resolve-target-dir`: Trả về trực tiếp đường dẫn được nhập hoặc chọn.
   - Giao diện giáo viên (`ActivityPanel.tsx`):
     - Gỡ bỏ huy hiệu và cảnh báo tự động đánh số thứ tự khi chọn thư mục đã tồn tại.
     - Khi mở modal Thu - phát bài hoặc nhấn nút "📁 Chọn thư mục khác...", đường dẫn được cập nhật chuẩn xác theo đúng ý của giáo viên.
     - Cập nhật thông điệp hướng dẫn rõ ràng: *"Bài nộp của học sinh (Word, Excel, ảnh, PDF...) sẽ được tự động lưu trực tiếp vào thư mục được chọn này trên máy tính của bạn."*

2. **Đóng Gói & Phát Hành Máy Chủ Di Động**:
   - Biên dịch thành công gói giao diện giáo viên `teacher-ui` và đồng bộ sang máy chủ `packages/server/public/teacher/`.
   - Đóng gói file máy chủ di động độc lập [`EduClass v2 Portable 2.2.0.exe`](file:///e:/educlassv2/EduClass%20v2%20Portable%202.2.0.exe) (~106MB) và [`EduClass v2 Portable 2.0.0.exe`](file:///e:/educlassv2/EduClass%20v2%20Portable%202.0.0.exe) tại thư mục gốc dự án.
   - Typecheck toàn bộ dự án (`tsc -b`) đạt 100% xanh.

## [2.2.5] - 2026-10-22

### Nâng Cấp Giao Diện Học Sinh Full Màn Hình & Trải Nghiệm Xem Lại Đáp Án Quizizz

1. **Giao Diện Học Sinh Full Màn Hình (Immersive Mode)**:
   - `packages/server/public/student/index.html`:
     - Gỡ bỏ giới hạn bó hẹp `max-width: 480px` của `#quiz-view`, mở rộng card làm bài toàn màn hình máy tính (`width: 96vw; max-width: 1280px; min-height: calc(100vh - 36px)`), tự động tương thích mượt mà trên cả desktop, laptop và tablet.
     - Thiết kế lại Header Quiz: Tích hợp thanh tiến trình câu hỏi (Progress Bar) phần trăm chạy mượt mà theo từng câu, badge số câu hỏi to rõ (`clamp(16px, 2vw, 22px)`), huy hiệu Streak & Điểm số rực rỡ.
     - Phóng to Đề bài câu hỏi (`#quiz-stem`): Font chữ lớn (`clamp(20px, 3vw, 36px)`), căn giữa rõ nét, viền bo tròn thẩm mỹ, hỗ trợ hiển thị ảnh câu hỏi to rõ ở chính giữa màn hình.
     - Phóng to 4 Nút đáp án Kahoot/Quizizz (`.btn-kahoot-large`): Tăng chiều cao lên `clamp(96px, 15vh, 170px)`, ký hiệu hình khối (`▲, ◆, ●, ■`) kích thước lớn `clamp(26px, 3.2vw, 42px)`, chữ phương án to `clamp(17px, 2.2vw, 26px)`, hỗ trợ hiển thị cả hình ảnh phương án.
     - Phóng to giao diện các câu hỏi Đúng/Sai (`tf`), Điền khuyết (`cloze_drag`, `short`) và Nối cột (`matching`).

2. **Khắc Phục Lỗi Dừng Lại Xem Đáp Án Đúng Ở Chế Độ Quizizz**:
   - `packages/server/public/student/js/state.js` & `packages/server/public/student/js/quiz.js`:
     - Bổ sung cờ điều phối `state.isViewingQuizizzFeedback`: Khi học sinh đang xem kết quả và đáp án đúng, hệ thống chặn hoàn toàn việc WebSocket và Activity Poller tự động gọi `showQuizQuestion` làm chuyển câu sớm.
     - Xây dựng màn hình Xem lại Đáp án Toàn diện (`showQuizizzAnswerReview`):
       - Banner Đúng/Sai to bản rực rỡ kèm số điểm đạt được và chuỗi đúng liên tiếp.
       - Giữ nguyên đề bài và hình ảnh để học sinh dễ đối chiếu.
       - Đánh dấu nổi bật phương án đúng (`✔ ĐÁP ÁN ĐÚNG` nền xanh lá) và phương án học sinh đã chọn nếu chọn sai (`✖ BẠN ĐÃ CHỌN` nền đỏ).
       - Hiển thị khung lời giải thích chi tiết (`lastAns.explanation`) màu vàng kem sang trọng.
       - Nút bấm to bản **"Câu tiếp theo ➔"** (hoặc **"🏆 Xem kết quả cuối bài ➔"** ở câu cuối) giúp học sinh chủ động hoàn toàn việc chuyển câu sau khi đã đọc và hiểu kỹ đáp án.

3. **Đồng Bộ Giao Diện Client React (`@educlass/activity-quiz-live`)**:
   - `packages/activities/quiz-live/src/quiz-views.tsx`: Mở rộng màn hình học sinh `QuizLiveStudentView` từ `max-w-sm` sang `w-full max-w-4xl min-h-[85vh]`, phóng to cỡ chữ đề bài, nút đáp án và banner phản hồi.

### Hỗ Trợ Lưu Trữ & Hiển Thị Đầy Đủ Từng Lần Thi Quizizz Trong Phiên (Nhiều Lần Thi)

1. **Giao thức & Dữ liệu (`packages/protocol`)**:
   - `packages/protocol`: Mở rộng `QuizSummaryReportSchema` với các trường `runId`, `runIndex` (Lần 1, Lần 2, Lần 3...), `isActive` và `startedAt`. Bổ sung trường `quizRuns: QuizSummaryReport[]` vào cả `SessionReportSnapshotSchema` và `SessionReportListItemSchema`. Định nghĩa `QuizRunsListResponseSchema`.

2. **Backend Fastify Server (`packages/server`)**:
   - `packages/server/src/routes/sessions.ts`:
     - Xây dựng hàm `buildQuizSummaryFromRun`: Trích xuất và định dạng bảng điểm độc lập cho từng lượt chạy Quizizz (họ tên, điểm số, tỉ lệ đúng, vị thứ).
     - Khi đóng phiên (`POST /api/sessions/:id/close`): Tự động trích xuất tất cả các lần thi Quizizz trong phiên thành mảng `quizRuns` lưu vào `snapshotJson`, bảo toàn dữ liệu độc lập của từng lần thi.
     - Endpoint `GET /api/sessions/:id/quiz-runs`: Lấy danh sách toàn bộ các lần thi Quizizz trong phiên (hỗ trợ cả phiên đang mở lẫn phiên đã kết thúc).
     - Endpoint `GET /api/sessions/:id/quiz-runs/:runId/export-excel`: Xuất file Excel bảng điểm riêng cho từng lần thi Quizizz cụ thể.
     - Endpoint `GET /api/sessions/reports`: Trả về mảng `quizRuns` cho mỗi phiên (tự động trích xuất các lượt chạy của phiên cũ để tương thích ngược).

3. **Giao diện Giáo Viên (`apps/teacher-ui`)**:
   - `apps/teacher-ui/src/api/client.ts`: Bổ sung hàm `getQuizRuns(sessionId)`.
   - `apps/teacher-ui/src/components/SessionReportsTab.tsx`:
     - Tách biệt từng lần thi Quizizz (Lần 1, Lần 2, Lần 3...) thành các mục riêng có thể chọn độc lập trên danh sách bên trái.
     - Click vào lần thi nào -> hiển thị bảng điểm, 4 thẻ thống kê và xếp hạng chuẩn xác của CHÍNH LẦN THI ĐÓ.
     - Bổ sung mục "📊 Tổng kết cả phiên" khi phiên có từ 2 lần thi trở lên.
     - Nút "📥 Xuất file Excel lần thi này" tải đúng bảng điểm của lần thi đang chọn.

### Lưu Trữ & Báo Cáo Tổng Kết Quizizz Vào Tab Báo Cáo Tổng Kết

1. **Giao thức & Dữ liệu (`packages/protocol` & `packages/db`)**:
   - `packages/protocol`: Định nghĩa schema `SessionReportListItemSchema`, `SessionReportsListResponseSchema`, `QuizSummaryReportSchema`, `QuizSummaryReportResponseSchema` chuẩn hóa dữ liệu báo cáo danh sách và tóm tắt bài Quizizz.
   - `packages/db`: Bổ sung phương thức `listByOwnerId(ownerId, limit)` và `listAll(limit)` trong `SessionReportRepository`, hỗ trợ truy vấn danh sách báo cáo các phiên đã đóng của giáo viên kèm mã phòng, lớp học và snapshot tổng kết.

2. **Backend Fastify Server (`packages/server`)**:
   - `packages/server/src/routes/sessions.ts`:
     - Bổ sung endpoint `GET /api/sessions/reports`: Trả về danh sách lịch sử báo cáo các phiên học đã đóng của giáo viên (kèm scoreboard, tổng số học sinh, tóm tắt điểm và độ chính xác).
     - Bổ sung endpoint `GET /api/sessions/:id/quiz-summary`: Trích xuất kết quả bài Quizizz mới nhất vừa chạy trong phiên (kể cả khi phiên đang mở), phục vụ xem ngay báo cáo sau khi hoàn thành bài Quiz.
     - Bổ sung alias route `GET /api/sessions/:id/export-excel` đồng bộ với giao diện Teacher UI.

3. **Giao diện Giáo Viên (`apps/teacher-ui`)**:
   - `apps/teacher-ui/src/api/client.ts`: Tích hợp các hàm gọi API `getSessionReports()` và `getActiveQuizSummary(sessionId)`.
   - `apps/teacher-ui/src/components/SessionReportsTab.tsx`: Xây dựng tab Báo Cáo Tổng Kết hoàn chỉnh:
     - Bảng tổng kết kết quả Quizizz chuẩn 4 trường dữ liệu trọng tâm: **Vị thứ (#1 👑, #2 🥈, #3 🥉...)**, **Họ và tên học sinh** (kèm loại danh tính), **Điểm số** (phông số lớn nổi bật), **Tỉ lệ đúng** (thanh tiến trình mini trực quan, % chính xác và số câu đúng/tổng câu).
     - Bảng điều khiển lịch sử: Cho phép chọn và xem lại bất kỳ bài Quizizz/phiên học nào đã lưu trong CSDL, không bao giờ bị mất khi F5 tải lại trang hay tắt ứng dụng.
     - Hỗ trợ hiển thị trực tiếp bài Quizizz vừa làm xong trong phiên hiện tại với huy hiệu `✨ Bài Quizizz tiết này`.
     - 4 thẻ thống kê nhanh: Tổng học sinh, Điểm trung bình, Tỉ lệ đúng trung bình và Tổng số câu hỏi.
     - Hỗ trợ xuất file Excel bảng điểm với 1 click (`📥 Xuất file Excel`).
     - Hỗ trợ chuyển đổi nhanh giữa chế độ "📋 Bảng điểm Quizizz" và "🏆 Vinh danh & Câu khó".
   - `apps/teacher-ui/src/App.tsx`: Tích hợp `SessionReportsTab` vào tab `📊 Báo cáo & Tổng kết`, bổ sung thông báo toast khi kết thúc bài Quizizz.

## [2.2.3] - 2026-10-22

### Tối Ưu Dung Lượng Gói Cài Đặt Desktop (Giảm ~56% từ 252 MB xuống 110 MB)

1. **Dọn Rác Bản Build Cũ & Chuẩn Hóa Cấu Hình Đóng Gói (`apps/desktop` & `apps/teacher-ui`)**:
   - `apps/teacher-ui/vite.config.ts`: Bật `emptyOutDir: true` để Vite tự động xóa các file hash cũ trước khi build, giải phóng 320+ file build rác (~166 MB) bị tích lũy trong thư mục `dist/assets`.
   - `apps/desktop/scripts/build.mjs`: Tự động làm sạch thư mục `packages/server/public/teacher` trước khi đồng bộ bản build mới từ `teacher-ui/dist`.
   - `apps/desktop/electron-builder.json`:
     - Chuyển `compression` sang `maximum` (nén LZMA2 tối đa của NSIS / 7-Zip).
     - Loại bỏ nhân bản dư thừa `teacher-ui` trong `extraResources` (sử dụng 1 nguồn thống nhất duy nhất tại `resources/public/teacher`).
     - Cấu hình loại trừ file sourcemap `!**/*.map` và bản copy tĩnh trùng lặp `!**/node_modules/@educlass/server/public/**` khỏi `app.asar`.
   - `apps/desktop/src/main.ts`: Ưu tiên tìm giao diện tại `resources/public/teacher` để đồng bộ với cấu hình `extraResources`.
   - **Kết quả**:
     - `app.asar` giảm từ 284.6 MB xuống 68.7 MB (-216 MB).
     - Thư mục `public` giảm từ 170.4 MB xuống 9.6 MB (-160.8 MB).
     - Bộ cài `EduClass v2 Setup` giảm từ **252.7 MB xuống 110.7 MB** (-142 MB, giảm ~56%).
     - Bản chạy ngay `EduClass v2 Portable` giảm từ **252.5 MB xuống 110.5 MB** (-142 MB, giảm ~56%).
     - Đảm bảo giữ nguyên 100% tính năng và cấu hình mạng LAN / quyền dữ liệu người dùng.

### Khắc Phục Lỗi Khởi Động Khi Cài Đặt Setup (EPERM: operation not permitted)

1. **Chuyển Toàn Bộ Thư Mục Dữ Liệu Ghi Sang UserData (`%APPDATA%`)**:
   - **Nguyên nhân**: Khi cài đặt qua file Setup NSIS vào thư mục hệ thống `C:\Program Files\EduClass v2`, ứng dụng chạy dưới quyền người dùng thông thường (non-admin) không có quyền ghi/tạo thư mục trong `C:\Program Files`. Backend server trước đây mặc định dùng `path.join(process.cwd(), 'data')` để tạo `data/assets`, `data/submissions`, `data/materials`, `data/temp`, dẫn đến lỗi `EPERM: operation not permitted, mkdir 'C:\Program Files\EduClass v2\data\assets'`.
   - `packages/server/src/app.ts`: Mở rộng `BuildServerOptions` nhận `dataDir`, `submissionsDir`, `materialsDir`, `tempDir`. Tự động phân giải thư mục lưu trữ an toàn theo `options.dataDir ?? (options.dbPath ? path.dirname(options.dbPath) : path.join(process.cwd(), 'data'))`. Truyền đầy đủ `resolvedAssetsDir`, `resolvedSubmissionsDir`, `resolvedMaterialsDir`, `resolvedTempDir` vào `assetsRoutes`, `questionSetsRoutes`, `bankRoutes`, `assignmentsRoutes`, `objectCameraRoutes`.
   - `packages/server/src/routes/assignments.ts`: Bổ sung `materialsBaseDir` vào `AssignmentsRoutesOptions`, thay thế hoàn toàn `process.cwd()` bằng `defaultMaterialsBaseDir`.
   - `apps/desktop/src/server-runner.ts`: Cập nhật `EmbeddedServerOptions` nhận `dataDir` và `assetsDir`, chuyển tiếp cho `buildServer`.
   - `apps/desktop/src/main.ts`: Khởi tạo `dataDir = path.join(app.getPath('userData'), 'data')` và `assetsDir = path.join(dataDir, 'assets')`, truyền vào `startEmbeddedServer`. Đảm bảo toàn bộ database SQLite, ảnh assets, bài nộp học sinh và tài liệu luôn được ghi vào `%APPDATA%\EduClass v2\data` có đầy đủ quyền đọc/ghi.
   - Đóng gói và cập nhật bộ cài mới: `EduClass v2 Setup 2.2.0.exe` và `EduClass v2 Portable 2.2.0.exe` ra thư mục gốc.

## [2.2.2] - 2026-10-22

### Đấu Cờ Thụy Sỹ (`@educlass/activity-swiss-duel` & `apps/teacher-ui`)

1. **Hiển thị Full Màn Hình & Tự Động Chia Tỉ Lệ Các Bàn Cờ Vừa Khung**:
   - `ActivityHostWindow.tsx`: Bổ sung `swiss-duel` vào danh sách `isFullScreenActivity` và `isDarkActivity`. Thiết lập giao diện toàn màn hình không padding thừa (`p-0 overflow-hidden`), đồng bộ màu nền vân gỗ mun hoàng gia (`#150c06`) và viền header thanh điều khiển độc lập theo phong cách cờ vua cổ điển.
   - `ChessTheme.tsx`:
     - Xây dựng thuật toán `calculateOptimalBoardGrid(count, containerWidth, containerHeight)` tự động phân bổ số cột (`cols`) và số hàng (`rows`) tối ưu theo diện tích thực tế màn hình/khung chứa (thông qua `ResizeObserver`), duy trì tỉ lệ khung hình bàn cờ (~1.7:1).
     - Bổ sung `CHESS_SCALE_MAP` và 6 cấp độ co giãn linh hoạt (`xl`, `lg`, `md`, `sm`, `xs`, `2xs`), tự động tinh chỉnh padding, kích thước font chữ tên học sinh, điểm số, quân cờ và trạng thái bàn đấu.
   - `SwissDuelTeacherPanel.tsx`:
     - Chuyển container chính sang kích thước full màn hình (`w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden`), loại bỏ giới hạn chiều rộng cũ (`max-w-6xl mx-auto`).
     - Tích hợp `ResizeObserver` bắt chính xác kích thước khung thực tế để dàn lưới các bàn cờ vừa khít 100% chiều cao và chiều rộng, không bị tràn hay yêu cầu cuộn khi có nhiều cặp đấu (hỗ trợ hiển thị mượt mà từ 2 đến 40+ bàn).
     - Bổ sung giao diện trạng thái rỗng thân thiện khi chưa khởi tạo bàn đấu.
     - Tinh gọn header và thanh chuyển tab, tối đa hóa diện tích hiển thị cho các bàn cờ.
   - `SwissDuelProjectorView.tsx`: Đồng bộ cơ chế lưới thích ứng `calculateOptimalBoardGrid` cho màn hình máy chiếu, đảm bảo toàn bộ các bàn cờ đều hiển thị trọn vẹn ở khung hình 16:9.

## [2.2.1] - 2026-10-22

### Giao Diện Soạn & Chỉnh Sửa Câu Hỏi Bộ Đề (`apps/teacher-ui`)

1. **Hiển thị trực quan cả đề bài lẫn đáp án trong danh sách chỉnh sửa câu hỏi**:
   - `apps/teacher-ui/src/components/QuestionCardPreview.tsx`: Tạo component thẻ xem trước câu hỏi hỗ trợ hiển thị đầy đủ:
     - Header: Số thứ tự câu, huy hiệu loại câu hỏi (`mcq4`, `tf`, `tf_group`, `short`, `matching`), số điểm, và nút "Sửa câu" / "Xóa".
     - Thân câu hỏi: Đề bài kết xuất công thức toán KaTeX (`renderLatexInText`) và hình ảnh minh họa (`resolveAssetUrl`).
     - Đáp án:
       - Với `mcq4`: Hiển thị lưới các phương án A, B, C, D (công thức toán, hình ảnh); phương án đúng được viền xanh, nền xanh ngọc và nhãn "✓ Đáp án đúng".
       - Với `tf`: Hiển thị rõ đáp án chuẩn `ĐÚNG (True)` hoặc `SAI (False)`.
       - Với `tf_group`: Hiển thị 4 ý a), b), c), d) kèm huy hiệu `✓ ĐÚNG` / `✗ SAI` cho từng ý.
       - Với `short`: Hiển thị các đáp án được chấp nhận dạng tag.
       - Với `matching`: Hiển thị các cặp nối đúng.
       - Lời giải thích: Hiển thị hộp ghi chú lời giải nếu có.
   - `apps/teacher-ui/src/App.tsx`: Nâng cấp modal chỉnh sửa bộ đề sang `maxWidth="880px"` và tích hợp `QuestionCardPreview`, bổ sung nút chuyển đổi bật/tắt hiển thị đáp án (`showAllEditorAnswers`).
   - `apps/teacher-ui/src/components/QuestionBankTab.tsx`: Đổi tên nút thành `✏️ Soạn / Chỉnh sửa câu hỏi`.
   - `apps/teacher-ui/src/components/BankQuestionTab.tsx`: Bổ sung hiển thị đáp án cho câu hỏi dạng True/False.

2. **Đóng gói phát hành bộ cài Portable và Setup**:
   - Cập nhật cấu hình NSIS installer trong `apps/desktop/electron-builder.json` và `apps/student-desktop/electron-builder.json`.
   - Biên dịch và đóng gói hoàn chỉnh cả 2 định dạng Portable (.exe) và Setup installer (.exe) cho Giáo viên (EduClass v2) và Học sinh (EduClass Học Sinh).
   - Xuất các file thực thi trực tiếp tại thư mục gốc dự án.

### Khắc Phục Lỗi Nhận Diện Đề Thi Word (`@educlass/question-kit`)

1. **Khắc phục lỗi nuốt nội dung câu hỏi khi stem chứa từ khóa "Chọn..."**:
   - `packages/question-kit/src/word/word-parser.ts`: Cải tiến regex `trailingAnsRegex` bắt đáp án cuối câu. Trước đây regex `(?:Đáp án|Chọn)[:\s]*([^\n<]+)` quá lỏng lẻo khiến các câu hỏi trắc nghiệm có stem bắt đầu bằng động từ mệnh lệnh như `Chọn phương án SAI:` hoặc `Chọn câu đúng:` bị match nhầm từ `Chọn`, dẫn đến việc slice cắt bỏ toàn bộ stem và 4 phương án A, B, C, D của câu hỏi.
   - Thắt chặt từ khóa `Chọn` chỉ kích hoạt khi có định dạng đáp án cụ thể (`Chọn\s*[:=]\s*([A-Da-d0-9]|Đúng|Sai|True|False)\b`).
   - Bổ sung rào chắn bảo vệ: Nếu phía sau vị trí match vẫn còn chứa các phương án trắc nghiệm A, B, C, D thì hủy bỏ match đáp án cuối câu, giữ nguyên toàn bộ nội dung stem và các lựa chọn.
   - Bổ sung unit test hồi quy trong `packages/question-kit/src/__tests__/word-parser.test.ts`.
   - Kết quả: File `giua ki 1.docx` nhận diện thành công 24/24 câu trắc nghiệm MCQ4 (100%), không còn lỗi hay cảnh báo.

### Tính Năng Xem Đáp Án Đúng Sau Mỗi Câu Ở Chế Độ Quizizz (`quiz-live`)

1. **Cấu hình & Giao Thức (`@educlass/activity-quiz-live`)**:
   - `quiz-schemas.ts`: Thêm trường `showCorrectAnswer?: boolean` vào `QuizLiveConfigSchema` và `QuizLiveStateSchema`. Mở rộng `ParticipantAnswerRecordSchema` và `ParticipantQuizProgressSchema.lastAnswer` với `correctAnswer`, `explanation`, `selectedAnswer`.
   - `quiz-activity.ts`: Khi `showCorrectAnswer` được bật ở chế độ Quizizz, server trả về `correctAnswer` và `explanation` trong `lastAnswer` và `answers[qIndex]` ngay sau khi học sinh nộp câu trả lời (`submit_answer`), bảo đảm không để lộ đáp án trước khi làm bài.
   - `quiz-views.tsx`: Thêm giao diện phản hồi tức thì (`shouldShowImmediateFeedback`) trên màn hình học sinh `QuizLiveStudentView`:
     - Banner thông báo đúng/sai kèm số điểm đạt được và chuỗi streak liên tiếp.
     - Hiển thị stem và hình ảnh câu hỏi.
     - Đánh dấu nổi bật phương án đúng (`✔ ĐÁP ÁN ĐÚNG`) và phương án học sinh đã chọn (`✖ BẠN ĐÃ CHỌN`), kèm lời giải thích chi tiết (`explanation`).
     - Nút "Câu tiếp theo ➔" (hoặc "Xem kết quả bài Quiz 🏆" ở câu cuối) giúp học sinh chủ động chuyển câu sau khi đã xem và học hỏi từ đáp án.

2. **Giao Diện Giáo Viên (`apps/teacher-ui`)**:
   - `ActivityPanel.tsx`: Thêm tùy chọn checkbox *"👁️ Cho phép học sinh xem đáp án đúng sau mỗi câu"* trong mục cấu hình chế độ Quizizz Tự do.

3. **Cổng Học Sinh Web Client (`packages/server/public/student/js/quiz.js`)**:
   - Khắc phục `handleSelectAnswer` truyền đúng `answer`.
   - Khi `showCorrectAnswer` được bật, hiển thị chi tiết đáp án đúng, highlight phương án lựa chọn và nút bấm chuyển câu thay vì tự động nhảy câu sau 1 giây.

4. **Đóng Gói Ứng Dụng**:
   - Build và đóng gói lại ứng dụng `EduClass v2 Portable 2.2.0.exe` tại thư mục gốc và `apps/desktop/dist/installer/`.



## [2.2.0] - 2026-10-19

### Kiểm Thử Toàn Trình Ngân Hàng Đề -> Rút Đề Thi Quizizz -> Chơi Quizizz (Hình Ảnh Câu Hỏi & Đáp Án, Đa Dạng Câu Hỏi)

1. **Hỗ Trợ Hình Ảnh Toàn Diện Cho Quiz Live / Quizizz (`@educlass/activity-quiz-live`)**:
   - `quiz-schemas.ts`: Mở rộng `QuizQuestionSchema` và `QuizLiveStateSchema` hỗ trợ trường `optionImages?: (string | null | undefined)[]` cho các phương án trắc nghiệm `mcq4`.
   - `quiz-activity.ts`: Đồng bộ `optionImages` khi khởi tạo câu hỏi công khai và giữ nguyên tương ứng từng cặp text-ảnh khi xáo trộn phương án `shuffleOptions`.
   - `quiz-views.tsx`:
     - Bổ sung hiển thị `currentQ.image` trên giao diện học sinh `QuizLiveStudentView`.
     - Bổ sung kết xuất hình ảnh phương án đáp án `currentQ.optionImages[idx]` trên cả 3 màn hình: Học sinh (`StudentView`), Giáo viên (`TeacherPanel`), và Màn chiếu (`ProjectorView`).

2. **Chuyển Đổi Dữ Liệu Bộ Đề Sang Quizizz (`apps/teacher-ui/src/components/ActivityPanel.tsx`)**:
   - Tự động bóc tách ảnh câu hỏi `extractQuestionImage` (từ `q.image` hoặc `stem.images[0]`) và ảnh đáp án `extractOptionImage` (từ `opt.images[0]`) khi chuyển đổi câu hỏi từ ngân hàng đề/bộ đề sang `quiz-live`.
   - Hỗ trợ đầy đủ tất cả các dạng câu hỏi: `mcq4`, `tf`, `short`, `matching`, `cloze_drag`.

3. **Bộ File Kiểm Thử & Kịch Bản Chạy Tự Động**:
   - Tạo file test tích hợp hệ thống `packages/server/src/__tests__/bank-to-quizizz-integration.test.ts` kiểm thử toàn trình từ nạp ngân hàng đề, thống kê ma trận, sinh đề ngẫu nhiên, mở phiên học, học sinh vào lớp và tự tiến độ giải quyết từng dạng câu hỏi, dùng vật phẩm power-up và tổng kết điểm/EXP.
   - Tạo file test giao diện React Vitest `apps/teacher-ui/src/__tests__/bank-quizizz-images-integration.test.tsx` kiểm thử khởi động Quizizz và render ảnh câu hỏi & đáp án trên `StudentView`.
   - Tạo script chạy thử nghiệm trực tiếp `scripts/test-bank-quizizz.ts` hiển thị chi tiết từng bước trên terminal qua lệnh `npx tsx scripts/test-bank-quizizz.ts`.



### Nâng Cấp Toàn Diện Phiên Bản 2.2.0 & Hoàn Thành Giai Đoạn 2 (Matching & Cloze Drag Trong Word Importer, Exam & Quiz Live)

1. **Nâng Cấp Phiên Bản 2.2.0 Toàn Bộ Monorepo**:
   - Nâng cấp `APP_VERSION` và `EDUCLASS_VERSION` từ `2.1.1` lên `2.2.0` tại `packages/protocol/src/version.ts`.
   - Đồng bộ version `2.2.0` tại tất cả các file `package.json` (`root`, `apps/desktop`, `apps/teacher-ui`, `apps/student-desktop`, `packages/server`).

2. **Trình Phân Tích Nhập File Word (`packages/question-kit/src/word/word-parser.ts`)**:
   - Nhận diện và trích xuất tự động câu hỏi ghép nối (`matching`):
     - Bóc tách danh sách cột A (1, 2, 3...) và cột B (a, b, c...) từ bảng hoặc văn bản đánh số.
     - Phân tích khối đáp án ghép chuẩn dạng `1-a, 2-c` hoặc `1->b, 2->a` hoặc `1: a; 2: b`.
   - Nhận diện và trích xuất tự động câu hỏi điền từ khuyết (`cloze_drag`):
     - Tự động nhận diện từ khóa cần điền nằm trong dấu ngoặc vuông `[từ_khóa]` trong đoạn văn bản.
     - Chuyển đổi thành cấu trúc template `[blank_1]`, `[blank_2]` kèm mảng `blanks`.
     - Tự động tổng hợp ngân hàng từ khóa (`wordBank`), bao gồm cả các từ gây nhiễu nếu giáo viên ghi chú `Từ khóa: ...`.

3. **Chế Độ Kỳ Thi Tập Trung (`packages/activities/exam`)**:
   - `exam-shuffler.ts`: Hỗ trợ ánh xạ ngược câu trả lời của thí sinh (`unmapStudentAnswer`) cho `matching` và `cloze_drag` để chấm điểm chính xác khi xáo trộn đề bài và phương án.
   - `exam-views.tsx`:
     - Cập nhật hàm nhận diện câu đã trả lời `isQuestionAnswered()` cho các cặp nối và ô điền khuyết.
     - Thêm giao diện làm bài trực quan, thân thiện màn hình cảm ứng (touch target ≥ 48px, dropdown chọn cặp ghép cột A-B và ô điền khuyết).
   - `packages/server/public/student/js/exam.js`:
     - Bổ sung kết xuất giao diện và lưu trữ tức thì câu hỏi `matching` và `cloze_drag` cho học sinh trên trình duyệt web và di động.
     - Cập nhật Question Palette và kiểm tra câu chưa làm trước khi nộp bài cho `matching` và `cloze_drag`.

4. **Chế Độ Trò Chơi Trắc Nghiệm Trực Tiếp (`packages/activities/quiz-live`)**:
   - `quiz-schemas.ts`: Mở rộng `QuizQuestionTypeSchema` với `'matching'` và `'cloze_drag'`, bổ sung các trường `leftItems`, `rightItems`, `template`, `blanks`, `wordBank` và mở rộng `correctAnswer` cho dữ liệu record.
   - `quiz-activity.ts`: Bổ sung chấm điểm tức thì `checkAnswerCorrectness` cho `matching` và `cloze_drag`, thưởng điểm tốc độ, chuỗi streak và rơi vật phẩm power-up ở chế độ Quizizz.
   - `packages/server/public/student/js/quiz.js`: Hỗ trợ làm bài và nộp câu trả lời cho cả câu hỏi ghép nối và điền từ khuyết ngay trên giao diện học sinh.

5. **Bộ Khởi Động Hoạt Động Của Giáo Viên (`apps/teacher-ui/src/components/ActivityPanel.tsx`)**:
   - Ánh xạ đầy đủ các câu hỏi dạng `matching` và `cloze_drag` từ bộ câu hỏi đã tải sang định dạng cấu hình của `quiz-live` và `exam`.
   - Tuân thủ quy chuẩn nghiêm ngặt `exactOptionalPropertyTypes: true` của TypeScript.

6. **Biên Dịch & Đóng Gói Bộ Chạy Windows 2.2.0**:
   - Toàn bộ monorepo vượt qua kiểm tra kiểu dữ liệu `pnpm run typecheck` (`tsc -b`).
   - Biên dịch thành công gói giao diện giáo viên `@educlass/teacher-ui`.
   - Đóng gói thành công file chạy độc lập `EduClass v2 Portable 2.2.0.exe` (160 MB) tại thư mục gốc dự án `E:\educlassv2\`.

## [2.1.1] - 2026-10-19

### Phiếu Học Tập Tương Tác Trên Bảng Tương Tác & Thêm Dạng Câu Hỏi Ghép Nối, Điền Từ (Giai Đoạn 1)

1. **Chuẩn Hóa Bộ Câu Hỏi Mới Trong Question Kit & Giao Thức (`@educlass/question-kit` & `@educlass/protocol`)**:
   - Bổ sung 2 loại câu hỏi mới vào hệ thống:
     - `matching`: Câu hỏi ghép nối (Cột A và Cột B, học sinh ghép cặp tương ứng).
     - `cloze_drag`: Câu hỏi điền từ vào ô trống (Đoạn văn bản có đánh dấu ô trống và ngân hàng từ khóa word bank).
   - Thiết lập đầy đủ Schemas Zod: `MatchingQuestionSchema`, `MatchingPublicQuestionSchema`, `MatchingAnswerSchema`, `ClozeDragQuestionSchema`, `ClozeDragPublicQuestionSchema`, `ClozeDragAnswerSchema`.
   - Xây dựng thuật toán chấm điểm tự động đa mức điểm (partial grading): `gradeMatching()` và `gradeClozeDrag()` trong `packages/question-kit/src/grading/`.
   - Cập nhật hàm bóc tách dữ liệu an toàn `stripAnswerKey()` để gửi câu hỏi xuống máy học sinh mà không lộ đáp án đúng.
   - Đồng bộ kiểu dữ liệu bảng `questions` và `bank_questions` trong `@educlass/db` để cho phép lưu trữ và tái sử dụng `matching` & `cloze_drag` trong toàn bộ ngân hàng câu hỏi và bộ đề thi.

2. **Tích Hợp Chế Độ Phiếu Học Tập Vào Bảng Tương Tác (`packages/protocol/src/interactive-board.ts`)**:
   - Mở rộng `BoardConfigSchema` với `worksheet?: BoardWorksheetConfig` (`enabled`, `questionSetId`, `questionSetTitle`, `questions`).
   - Mở rộng `BoardPostSchema` lưu trữ snapshot kết quả chấm điểm `worksheetResult` (`autoScore`, `maxScore`, `correctCount`, `totalCount`, `answers`).
   - Cập nhật intent nộp bài `submit_post` cho phép học sinh gửi kèm `worksheetAnswers`.

3. **Xử Lý Nghiệp Vụ & Tự Động Chấm Điểm Tại Máy Chủ (`packages/activities/interactive-board`)**:
   - Trong `interactive-board-activity.ts`: Khi nhận intent `submit_post`, máy chủ tự động đối chiếu và chấm điểm từng câu hỏi trong phiếu thông qua `gradeQuestion()`, quy đổi điểm số theo thang điểm cấu hình `maxGrade`, và lưu vào bài nộp của học sinh.
   - Trong `interactive-board-logic.ts`: Che giấu `worksheetResult` của các bạn học khác đối với học sinh chưa nộp bài (Server-side Gating), đảm bảo tính công bằng và chống sao chép đáp án.

4. **Giao Diện Giáo Viên & Màn Chiếu Lớp Học (`apps/teacher-ui`)**:
   - `ActivityPanel.tsx`: Bổ sung tùy chọn chọn bộ câu hỏi có sẵn để phát động dưới dạng Phiếu học tập tương tác khi khởi động Bảng tương tác.
   - `InteractiveBoardTeacherPanel.tsx` & `InteractiveBoardProjectorView.tsx`: Hiển thị huy hiệu điểm số tự động chấm của từng bài nộp (`📋 Phiếu bài tập: Đúng X/Y câu (Zđ)`) trên thẻ bài của học sinh và khi phóng to tiêu điểm (Spotlight).

5. **Giao Diện Học Sinh Làm Bài & Xem Bảng (`@educlass/activities` & `packages/server/public/student/js/interactive-board.js`)**:
   - Hỗ trợ làm bài trắc nghiệm chọn 1 (`mcq4`), đúng sai (`tf`), ghép nối (`matching`), điền từ (`cloze_drag`) ngay trong tab "Bài tập" của trình soạn thảo.
   - Cho phép học sinh vừa trả lời phiếu bài tập, vừa bổ sung chú thích văn bản, vẽ tay hoặc chụp ảnh đính kèm.
   - Thẻ bài học sinh sau khi nộp và được duyệt hiển thị rõ kết quả phiếu bài tập để cả lớp cùng quan sát, bình luận và chấm điểm chéo.

6. **Biên Dịch & Đóng Gói Bộ Chạy Windows**:
   - Vượt qua kiểm tra kiểu dữ liệu TypeScript nghiêm ngặt `pnpm run typecheck` (`tsc -b`).
   - Đóng gói thành công file chạy độc lập `EduClass v2 Portable 2.1.1.exe` tại thư mục gốc dự án.


### Khóa Tắt Cửa Sổ Trong Giờ Học & Tự Động Bung Cửa Sổ Lên Lại (Auto Bring-to-Front)

1. **Khóa Tuyệt Đối Khả Năng Tắt Cửa Sổ Của Học Sinh Khi Đang Trong Tiết Học (`apps/student-desktop`)**:
   - Vô hiệu hóa nút đóng đỏ (`X`) trên thanh tiêu đề Windows: Gọi `mainWindow.setClosable(false)` ngay khi vào tiết học, nút `X` bị mờ và không thể nhấn.
   - Chặn triệt để phím tắt đóng ứng dụng `Alt + F4` qua sự kiện `before-input-event` khi đang có tiết học mở.
   - Vô hiệu hóa mục "Thoát EduClass" trong menu chuột phải System Tray (`enabled: false`), hiển thị nhãn "(Đang trong giờ học)".
   - Nếu học sinh tìm cách đóng cửa sổ: sự kiện `close` bị chặn và tự động đưa cửa sổ quay trở lại màn hình chính (`bringWindowToFront()`).
   - Cung cấp phím cứu hộ giám thị/giáo viên `Ctrl + Shift + Alt + F12` để mở khóa khẩn cấp (`isTeacherEmergencyUnlock`) trong trường hợp cần thao tác kỹ thuật trên máy học sinh.

2. **Cơ Chế Tự Động Bung Cửa Sổ Lên Lại Khi Giáo Viên Mở Hoạt Động Mới (Wake-on-Activity)**:
   - **Kênh Realtime WebSocket IPC**: Khi giáo viên mở bất kỳ hoạt động nào (Quiz trắc nghiệm, Kỳ thi, Biểu quyết nhanh, Bảng tương tác, Thu phát bài tập, Đối kháng, Đánh giá dự án...), client học sinh nhận sự kiện `activity_state` hoặc `activity_start` và lập tức gọi `window.educlassStudent?.bringToFront?.()`.
   - **Kênh UDP Broadcast Mạng LAN**: Mở rộng `DiscoveryBeaconPayload` với `currentActivityId` và `activityRunId`. `BeaconService` tự động phát sóng chùm gói tin nhịp tim ngay khi giáo viên mở hoạt động (`notifyActivityStarted`). `BeaconListener` trên máy học sinh phát hiện hoạt động mới sẽ tự động khôi phục nếu đang thu nhỏ (`restore()`), đưa lên trên cùng (`setAlwaysOnTop(true)`), chớp sáng thanh tác vụ (`flashFrame(true)`) và lấy lại tiêu điểm (`focus()`).
   - Tự động hoàn trả quyền thao tác bình thường cho học sinh sau 1.2 giây bung cửa sổ nếu không phải chế độ thi Kiosk.

3. **Cập Nhật Đóng Gói Bộ Cài Đặt Mới**:
   - Biên dịch và đóng gói lại bản cài đặt `EduClass Học Sinh Setup 2.1.1.exe` và bản chạy trực tiếp `EduClass Học Sinh Portable 2.1.1.exe` đặt trực tiếp tại thư mục gốc dự án `E:\educlassv2\`.

### Khắc Phục Lỗi Màn Hình Trắng Bảng Tương Tác & Tăng Cường Phòng Vệ Dữ Liệu

1. **Khắc Phục Biến Chưa Khai Báo Tại Client Học Sinh (`packages/server/public/student/js/interactive-board.js`)**:
   - Sửa lỗi runtime `ReferenceError: hasSubmitted is not defined` khiến hàm kết xuất `renderInteractiveBoardView` dừng đột ngột và gây hiện tượng bảng trắng trên trình duyệt học sinh.
   - Định nghĩa chính xác `hasSubmitted = Boolean(myPost && (myPost.text || myPost.imageUrl || myPost.drawingDataUrl))` ngay khi khởi tạo hàm kết xuất.

2. **Bổ Sung Khối Bảo Vệ Dữ Liệu Rỗng (Null/Undefined Guards) Toàn Diện**:
   - `InteractiveBoardTeacherPanel.tsx`: Thêm màn hình loading an toàn khi `state` hoặc `state.config` chưa đồng bộ; bảo vệ `(post.likes || []).length`, `(post.hearts || []).length`, `(post.comments || []).length`, `Object.keys(post.peerGrades || {})`.
   - `InteractiveBoardProjectorView.tsx`: Thêm màn hình chờ chiếu; bảo vệ toàn bộ các truy cập thuộc tính mảng của bài nộp khi phóng to tiêu điểm (spotlight) và bảng tổng quan cả lớp.
   - `InteractiveBoardStudentView.tsx`: Bảo vệ `post.hearts`, `post.likes`, `post.comments`, `post.peerGrades`.
   - `PeerGradesDetailModal.tsx` & `PeerGradingModal.tsx`: Bảo vệ `post.peerGrades || {}` chống lỗi khi dữ liệu chấm chéo rỗng.

3. **Cơ Chế Cách Ly Sự Cố Cấp Component (ErrorBoundary Resilience)**:
   - Nâng cấp `ErrorBoundary` hỗ trợ thuộc tính tùy biến `fallback` để render giao diện thông báo lỗi cục bộ kèm nút "Tải lại" và "Kết thúc hoạt động", ngăn chặn việc một plugin hoạt động gặp lỗi làm sập toàn bộ giao diện quản trị giáo viên (`ActivityPanel.tsx`) hoặc màn chiếu độc lập (`ActivityHostWindow.tsx`).

4. **Đóng Gói Lại Bản Portable 2.1.1 / 2.1.0**:
   - Biên dịch thành công gói Vite Teacher UI và Desktop Core.
   - Xuất bản file chạy `EduClass v2 Portable 2.1.1.exe` và `EduClass v2 Portable 2.1.0.exe` ra thư mục gốc dự án.

### Học Sinh Desktop Client & Đánh Thức Tự Động (Wake-on-Session) — Giai Đoạn 1

1. **Ghi Nhận Kiến Trúc Kép (Hybrid Architecture) (`docs/adr/0004-student-desktop-client-hybrid.md`)**:
   - Giữ nguyên 100% khả năng truy cập qua trình duyệt Web (Chrome, Safari) cho học sinh dùng điện thoại/tablet theo chuẩn D2.
   - Bổ sung tùy chọn bộ cài đặt / file chạy Desktop Client chạy nền cho phòng máy tính trường học (PC Windows).

2. **Giao Thức Khám Phá Mạng Nội Bộ UDP Beacon (`@educlass/protocol`)**:
   - Định nghĩa `DiscoveryBeaconPayloadSchema`, `DiscoveryBeaconTypeSchema` (`SESSION_OPEN`, `SESSION_HEARTBEAT`, `SESSION_CLOSED`) và cổng mặc định `DEFAULT_DISCOVERY_PORT = 54321`.

3. **Dịch Vụ Phát Sóng Tự Động Phía Máy Chủ (`@educlass/server`)**:
   - Xây dựng `BeaconService` sử dụng module chuẩn `node:dgram`: phát chùm 3 gói tin `SESSION_OPEN` khi mở phiên, duy trì nhịp tim `SESSION_HEARTBEAT` mỗi 5s cho máy bật sau, và phát chùm 3 gói tin `SESSION_CLOSED` khi đóng phiên.
   - Tích hợp tự động vào vòng đời mở phiên (`POST /api/sessions`), đóng phiên (`POST /api/sessions/:id/close`), giải phóng phiên (`POST /api/sessions/close-active`), và hook giải phóng socket an toàn `onClose`.
   - Viết unit test hoàn chỉnh cho `BeaconService` trong `packages/server/src/__tests__/beacon-service.test.ts`.

### Học Sinh Desktop Client & Đánh Thức Tự Động (Wake-on-Session) — Giai Đoạn 2

1. **Khởi Tạo Ứng Dụng Desktop Học Sinh Mới (`apps/student-desktop`)**:
   - Thiết lập cấu trúc module trong Monorepo: `package.json`, `tsconfig.json`, `scripts/build.mjs`, `electron-builder.json`.
   - Cơ chế Single-Instance (`app.requestSingleInstanceLock()`): Chặn tuyệt đối mở nhiều phiên bản trùng lặp; khi click icon Desktop sẽ đưa cửa sổ đang chạy nền lên trước (`show()`, `focus()`, `restore()`).

2. **Chạy Nền Khay Hệ Thống (System Tray) & Đóng Ẩn Cửa Sổ**:
   - Khởi tạo System Tray Icon vector nhận diện EduClass với menu chuột phải: Trạng thái phiên hiện tại, Mở màn hình lớp học, Tải lại (F5), Thoát hoàn toàn.
   - Khi học sinh bấm nút `X` (đóng cửa sổ): Ứng dụng tự động ẩn về khay hệ thống, không tắt tiến trình nền để luôn sẵn sàng nghe ngóng tín hiệu mở lớp.

3. **Khối Lắng Nghe UDP Beacon (`BeaconListener`) & Đánh Thức Tự Động**:
   - Lắng nghe gói tin phát sóng trên cổng UDP `54321`.
   - Tự động bắt sự kiện `SESSION_OPEN` và `SESSION_HEARTBEAT`: Phân tích Zod schema, trích xuất `serverUrl` và `joinCode`, tự động bung cửa sổ và nạp trực tiếp `${serverUrl}/?code=${joinCode}`.
   - Tự động bắt sự kiện `SESSION_CLOSED`: Tự động quay về màn hình chờ `window.html` và cập nhật khay hệ thống.
   - Viết unit test hoàn chỉnh cho `BeaconListener` trong `apps/student-desktop/src/__tests__/beacon-listener.test.ts`.

4. **Màn Hình Chờ Tìm Lớp Sáng Tươi Thân Thiện (`window.html`)**:
   - Giao diện radar quét mạng LAN theo đúng chuẩn thiết kế EduClass v2 (#FFF9F0, badge xanh lá nhấp nháy, animation pulse nhẹ nhàng).
   - Tích hợp ngăn kéo nhập IP / Mã vào lớp thủ công phòng khi WiFi chặn UDP broadcast.

### Học Sinh Desktop Client & Đánh Thức Tự Động (Wake-on-Session) — Giai Đoạn 3

1. **Chế Độ Thi An Toàn Lockdown Trên Desktop Client (`apps/student-desktop`)**:
   - Hàm `enableKioskMode()`: Kích hoạt `setKiosk(true)`, `setAlwaysOnTop(true, 'screen-saver')`, `setFullScreen(true)` và giữ cửa sổ luôn hiển thị trên cùng.
   - Bắt sự kiện `before-input-event` chặn triệt để các tổ hợp phím thoát và chuyển ứng dụng: `Alt + Tab`, `Alt + F4`, `Alt + Space`, `Windows Key`, `Ctrl + Esc`, `Ctrl + N/T/W`, `F11`, `F12`.
   - Cơ chế tự động kéo lại focus khi cửa sổ bị mất focus (`window.on('blur')`).
   - Cung cấp phím tắt cứu hộ giám thị/giáo viên khẩn cấp: `Ctrl + Shift + Alt + F12` để giải phóng Kiosk mode tức thời khi máy tính gặp sự cố.

2. **Cầu Nối IPC Hai Chiều An Toàn (`src/preload.ts`)**:
   - Mở rộng cầu nối `window.educlassStudent`: `lockKioskMode()`, `unlockKioskMode()`, `isKioskLocked()`, `onKioskStatusChanged(callback)`.

3. **Tích Hợp Tự Động Với Phân Hệ Kỳ Thi (Exam Activity)**:
   - `packages/activities/exam/src/exam-views.tsx`: Thêm `useEffect` tự động kích hoạt `lockKioskMode()` khi bài thi bắt đầu (`in_progress`) và giải phóng `unlockKioskMode()` khi thí sinh nộp bài hoặc hết giờ.
   - `packages/server/public/student/js/exam.js`: Tự động gọi `lockKioskMode()` khi render bài thi và `unlockKioskMode()` khi thí sinh nộp bài thành công hoặc quay về phòng chờ.
   - Tự động giải phóng Kiosk mode an toàn khi giáo viên đóng phiên (`session-closed`) hoặc khi thoát ứng dụng.

### Học Sinh Desktop Client & Đánh Thức Tự Động (Wake-on-Session) — Giai Đoạn 4

1. **Kịch Bản Đóng Gói Bộ Cài Đặt NSIS (`apps/student-desktop/build/installer.nsh`)**:
   - Tự động thêm quy tắc Tường lửa Windows Firewall (`netsh advfirewall`) cho cổng UDP Discovery `54321` ngay khi cài đặt, tự động xóa khi gỡ cài đặt.
   - Tự động tạo Shortcut trong thư mục `shell:startup` để khởi động cùng Windows ở chế độ nền (`--background`).
   - Cấu hình `electron-builder.json` hỗ trợ xuất bản đồng thời bản Cài đặt NSIS và bản chạy trực tiếp Portable.

2. **Hỗ Trợ Triển Khai Hàng Loạt Phòng Máy (Silent Install)**:
   - Hỗ trợ tham số `/S` cài đặt im lặng chỉ trong 3 giây cho toàn bộ 40 máy phòng tin học qua script mạng hoặc Group Policy.

3. **Cẩm Nang Triển Khai & Vận Hành (`docs/student-client-guide.md`)**:
   - Soạn thảo tài liệu hướng dẫn hoàn chỉnh dành cho Giáo viên & Quản trị viên phòng máy: cài đặt 1-click, silent install, chạy portable, cơ chế Wake-on-Session, chế độ thi an toàn, phím tắt cứu hộ giám thị (`Ctrl + Shift + Alt + F12`) và bảng xử lý sự cố mạng/tường lửa.

### Hoàn Thiện Tích Hợp Mascot Avatar & Sửa Lỗi Giao Diện Giáo Viên

1. **Sửa Lỗi Không Gõ Được Tên Lớp Học (`apps/teacher-ui`, `@educlass/ui-kit`)**:
   - Nâng cấp component `Input`: Hỗ trợ `React.forwardRef`, tự động sinh và liên kết `id` với `<label htmlFor={inputId}>`, đảm bảo `pointerEvents: 'auto'`, `cursor: 'text'` và `userSelect: 'text'`.
   - Bọc form chuẩn `onSubmit` với phím Enter cho modal "Thêm lớp học mới" trong `ClassTab`.
   - Đóng gói và cập nhật trực tiếp bundle Vite mới nhất vào `packages/server/public/teacher/`.

2. **Tích Hợp Trực Tiếp Mascot Hoạt Hình Cho Cổng Học Sinh (`packages/server/public/student`)**:
   - Tạo module `packages/server/public/student/js/avatar.js` kết xuất Layered SVG thuần túy (offline, vector sắc nét).
   - Hiển thị nhân vật Mascot sinh động và nút `[👗 Đổi diện mạo Mascot]` trực tiếp trên màn hình Vào lớp (`#join-view`) và Phòng chờ (`#lobby-view`).
   - Modal phòng thay đồ thiết kế responsive linh hoạt (2 cột trên Desktop, 1 cột trên Mobile), mở khóa 100% trang phục, tích hợp nút `🎲 Đổi ngẫu nhiên`, tự động lưu `localStorage` và đồng bộ qua API `PATCH /api/students/:id/avatar`.

3. **Đóng Gói Ứng Dụng Portable Windows**:
   - Nâng cấp đồng bộ phiên bản toàn bộ hệ thống lên `2.1.1`.
   - Đóng gói bản chạy trực tiếp không cần cài đặt `EduClass v2 Portable 2.1.1.exe`.

## [2.1.0] - 2026-10-17

### Hệ Thống Nhân Vật Đại Diện Học Sinh (Mascot Avatar & Customizer)

1. **Mở Rộng Giao Thức Avatar (`@educlass/protocol`)**:
   - Bổ sung phụ kiện văn hóa Việt Nam: Nón Lá (`straw`), Đôi cánh (`angel`, `bat`), Đạo cụ cầm tay (`pencil`, `wand`) vào `AvatarConfigSchema`.
   - Bổ sung `UpdateAvatarRequestSchema` và tích hợp `avatar`/`avatarJson` vào `StudentDtoSchema`.

2. **Nâng Cấp Thư Viện Giao Diện (`@educlass/ui-kit`)**:
   - `StudentAvatar`: Vẽ nét vector SVG thuần túy cho Nón Lá, Cánh thiên thần, Cánh tiểu quỷ, Bút chì to, Đũa thần.
   - `AvatarCustomizer`: Tự động co giãn Responsive hỗ trợ cả Điện thoại (1 cột) và Máy tính (2 cột); Mở khóa 100% trang phục cho mọi học sinh; Tích hợp nút `🎲 Đổi ngẫu nhiên`.

3. **Cổng Học Sinh (`apps/student-ui`) & Máy Chủ (`packages/server`)**:
   - Thêm nút `👗 Đổi diện mạo Mascot` và modal phòng thay đồ trực tiếp trong phòng chờ vào lớp (`StudentPortal`).
   - Endpoint `PATCH /api/students/:studentId/avatar` lưu trữ trực tiếp vào cột `avatarJson` trong SQLite.

### Bảng Tương Tác (Interactive Board) — Khởi Tạo Giai Đoạn 1 (Protocol & Server State Engine)

1. **Nâng Cấp Phiên Bản Hệ Thống lên 2.1.0**:
   - Đồng bộ số hiệu phiên bản `2.1.0` trên toàn bộ monorepo (`package.json`, `apps/desktop`, `apps/teacher-ui`, `apps/student-ui`, `packages/protocol/src/version.ts` và `packages/server`).

2. **Giao Thức Dữ Liệu Chuẩn Bảng Tương Tác (`@educlass/protocol`)**:
   - Xây dựng Zod Schemas hoàn chỉnh: `BoardConfigSchema`, `BoardPostSchema`, `BoardCommentSchema`, `PeerGradeSchema`, `BoardStateSchema`, `BoardStudentIntentSchema`, `BoardTeacherIntentSchema`, `BoardStudentResultSchema`.
   - Hỗ trợ đầy đủ các hình thức nội dung: Văn bản (KaTeX công thức toán học), Nét vẽ tay cảm ứng (Canvas drawing data URL), Hình ảnh chụp/tải lên và bảng 5 màu giấy ghi chú (Vàng, Mint, Xanh dương, Hồng, Tím).

3. **Chấm Điểm Chéo (Peer Grading) & Tính Điểm Trung Bình**:
   - Cho phép học sinh chấm điểm bài của bạn học khác (thang điểm 0 đến `maxGrade`), ngăn chặn tuyệt đối việc tự chấm điểm bài của chính mình.
   - Thuật toán `calculatePeerAverage`: Tự động tính toán điểm trung bình cộng do các bạn chấm, làm tròn 1 chữ số thập phân (`peerAverageScore`).
   - Lưu trữ minh bạch danh sách người chấm (`peerGrades: Record<string, PeerGrade>`) giúp người xem bấm vào thẻ bài làm để biết chi tiết ai chấm mấy điểm.

4. **Cơ Chế Bảo Mật & Che Nội Dung Phía Server (Server-side Content Gating)**:
   - Học sinh chỉ được mở khóa xem bài của bạn bè sau khi chính bản thân đã hoàn thành nộp bài làm.
   - Hàm `maskStateForStudent`: Tự động che toàn bộ văn bản, hình ảnh, nét vẽ tay và bình luận bài của bạn bè đối với học sinh chưa nộp bài, chỉ giữ lại hiệu ứng thẻ khóa mờ bí mật để kích thích tinh thần đóng góp tự giác.

5. **Quy Trình Kiểm Duyệt & Quyền Quản Trị Giáo Viên**:
   - Mặc định bài nộp của học sinh ở trạng thái chờ duyệt (`pending`); chỉ khi giáo viên phê duyệt (`approve_post` hoặc `approve_all`) thì bài mới hiển thị lên bảng chung của lớp.
   - Giáo viên nắm toàn quyền điều phối: Xóa bài rác, xóa bình luận tiêu cực, viết nhận xét nổi bật của GV (`isTeacher: true`), cấm bình luận 1 học sinh cụ thể hoặc khóa bình luận toàn bộ cả lớp (`isGlobalMuted`).
   - Giáo viên cho điểm trực tiếp (`teacherGrade`), viết nhận xét sư phạm (`teacherFeedback`), trao giải danh hiệu Quán quân / Á quân / Quý quân / Sáng tạo (`rankAward`) và bật chế độ Spotlight chiếu phóng to lên màn chiếu.

6. **Tích Hợp Hệ Thống EXP Theo Chuẩn EduClass v2**:
   - Tự động kích hoạt các trigger thưởng EXP khi đóng hoạt động (`onEnd`): Thưởng nộp bài được duyệt (`submit`), Điểm giỏi GV (`grade_excellent`), Giải Top (`top3`), Bài được yêu thích nhất (`popular`) và Học sinh tích cực chấm điểm bạn bè (`top_reviewer`).

7. **Kiểm Thử Đơn Vị Độc Lập**:
   - Bộ test suite `interactive-board.test.ts` kiểm thử toàn diện logic tính điểm trung bình, phân quyền chấm điểm chéo, cấm chat, cơ chế che nội dung bảo mật và chu trình nộp - duyệt - chấm - kết thúc nhận thưởng EXP.

### Bảng Tương Tác (Interactive Board) — Giai Đoạn 2 (Client Suite & Giao Diện Học Sinh Hoàn Chỉnh)

1. **Bảng Vẽ Tay Cảm Ứng Mini (`TouchDrawingCanvas`)**:
   - Tối ưu hóa chuyên sâu cho màn hình cảm ứng điện thoại (mobile-first, viewport 360×640) và bút Stylus; xử lý `touch-action: none` chống trôi màn hình.
   - Trang bị công cụ: Bút viết (`pen`) và Tẩy (`eraser`); 3 cỡ nét (3px, 6px, 12px) với vùng chạm ≥ 48px; 4 màu mực cơ bản (Đen, Đỏ, Xanh dương, Xanh lá).
   - Hỗ trợ đầy đủ Hoàn tác (Undo) tới 15 bước lịch sử và Xóa hết (Clear), xuất ra định dạng ảnh trong suốt PNG Data URL.

2. **Bộ Nén Ảnh Phía Client Tự Động (`compressImage`)**:
   - Tự động thu nhỏ ảnh chụp vở hoặc tài liệu tải lên về kích thước tối đa 1280px bằng HTML5 Canvas và nén chất lượng JPEG/WebP (0.75).
   - Giảm dung lượng file từ 5–10MB xuống còn ~100–200KB, loại bỏ hoàn toàn nguy cơ nghẽn mạng WiFi nội bộ LAN của trường học khi hàng chục học sinh cùng nộp bài.

3. **Cửa Sổ Soạn & Nộp Bài 3 Tab (`StudentPostEditor`)**:
   - Giao diện trực quan chia 3 tab linh hoạt:
     - **Tab 1: Văn bản**: Ô nhập nội dung, hướng dẫn công thức Toán học KaTeX kẹp giữa `$công thức$`, chọn 5 màu giấy note pastel (Vàng, Mint, Xanh dương, Hồng, Tím).
     - **Tab 2: Nét vẽ tay**: Tích hợp trực tiếp `TouchDrawingCanvas`.
     - **Tab 3: Ảnh chụp/Tải lên**: Chụp ảnh hoặc chọn file ảnh, xem trước thumbnail kèm nút xóa ảnh.
   - Nút nộp bài lớn (chiều cao ≥ 48px) kèm kiểm tra tính hợp lệ dữ liệu.

4. **Giao Diện Học Sinh Đầy Đủ (`InteractiveBoardStudentView`)**:
   - Banner bài của tôi: Hiển thị trạng thái rõ ràng (`⏳ Đang chờ duyệt`, `✅ Đã phê duyệt`, hoặc `⚠️ Cần sửa lại` kèm lý do và nút Chỉnh sửa bài).
   - Hiệu ứng bảo mật: Che bài của bạn bè nếu học sinh chưa nộp bài; tự động giải mã hiển thị đầy đủ ngay sau khi nộp.
   - Tương tác thời gian thực: Thả tim (❤️), Thích (👍), nút mở bình luận nhận xét, và phóng to ảnh nét cao (Lightbox).

5. **Hộp Thoại Chấm Điểm Bạn Học (`PeerGradingModal`) & Xem Chi Tiết Điểm (`PeerGradesDetailModal`)**:
   - `PeerGradingModal`: Cho phép học sinh chọn nhanh các mức điểm (5, 6, 7, 8, 9, 10đ) hoặc thanh trượt điều chỉnh, gửi điểm chấm lên máy chủ.
   - `PeerGradesDetailModal`: Nhấn vào nhãn "TB: X★" trên bất kỳ thẻ bài nào để mở cửa sổ xem điểm trung bình tổng quan và danh sách chi tiết từng bạn học đã chấm mấy điểm.

6. **Tích Hợp Hoàn Chỉnh Vào Ứng Dụng Học Sinh (`apps/student-ui`)**:
   - Đăng ký `InteractiveBoardStudentView` vào `studentViewRegistry` trong `ActivityHost.tsx`, liên kết workspace `@educlass/activity-interactive-board`.

### Bảng Tương Tác (Interactive Board) — Giai Đoạn 3 (Teacher Suite & Projector View Hoàn Chỉnh)

1. **Bảng Điều Khiển Giáo Viên Chuyên Nghiệp (`InteractiveBoardTeacherPanel`)**:
   - **Hàng đợi chờ duyệt bài (Approval Queue)**: Cột trái chuyên dụng với huy hiệu đếm bài chờ duyệt, hiển thị chi tiết tên HS, nội dung chữ, thumbnail ảnh và nét vẽ; nút `✓ Duyệt` tức thì, nút `✕ Yêu cầu sửa` (mở popup lý do) và nút `Duyệt tất cả` nhanh gọn.
   - **Bảng lớp trực quan theo 5 tab bộ lọc**: Lọc nhanh *Tất cả*, *Tiêu điểm*, *Đã chấm điểm GV*, *Nhiều like/tim nhất*, và *Đã trao giải thưởng*.
   - **Thao tác 1-chạm trên từng bài nộp**:
     - 🌟 **Spotlight**: Chiếu nổi bật bài làm lên trung tâm màn chiếu lớn cho cả lớp cùng học tập, đối chiếu.
     - 📌 **Ghim bài (Pin)**: Ghim bài mẫu lên đầu bảng.
     - ✍️ **Chấm điểm GV (`TeacherGradeModal`)**: Nhập điểm số đánh giá trực tiếp kèm lời nhận xét sư phạm.
     - 🏆 **Trao giải danh hiệu (`TeacherAwardModal`)**: Trao các danh hiệu danh giá: Quán quân (Top 1), Á quân (Top 2), Quý quân (Top 3) hoặc Ý tưởng sáng tạo.
     - 💬 **Bình luận nổi bật của GV**: Ô gửi nhận xét mang huy hiệu "⭐ Giáo viên" màu vàng nổi bật, kèm quyền xóa các bình luận học sinh vi phạm.
     - 🔇 **Quản trị cấm bình luận**: Cấm chat 1 học sinh cụ thể hoặc nút khóa bình luận toàn lớp khi cần giữ trật tự.
     - 🛑 **Quản lý phiên nộp**: Chuyển trạng thái linh hoạt giữa *Đang nhận bài* và *Chỉ thảo luận*.

2. **Màn Hình Chiếu Lớp Học Lớn (`InteractiveBoardProjectorView`)**:
   - Tối ưu hóa cho màn chiếu lớn và TV thông minh (tỷ lệ 16:9, độ tương phản cao, chữ cỡ lớn 28–32px đọc rõ từ cự ly 10 mét).
   - **Chế độ Toàn cảnh (Masonry Wall Grid)**: Các thẻ bài làm nhiều màu sắc tự động co giãn lưới, hiển thị tên tác giả, văn bản, ảnh chụp, nét vẽ, điểm trung bình `TB: X★`, điểm GV và số lượng tương tác.
   - **Chế độ Tiêu điểm Chữa bài (Spotlight Mode)**: Khi giáo viên bấm Spotlight một bài, toàn bộ màn chiếu lập tức chuyển cảnh phóng to bài làm đó lên trung tâm với viền vàng ánh kim lấp lánh; hiển thị cực đại văn bản bài làm, ảnh chụp/nét vẽ độ nét cao cùng các lời nhận xét góp ý của bạn bè và Thầy/Cô.

3. **Tích Hợp Hoàn Chỉnh Vào Ứng Dụng Giáo Viên (`apps/teacher-ui`)**:
   - Xây dựng plugin `interactiveBoardPlugin` và đăng ký vào `activityPluginsRegistry` trong `src/activities/index.ts`.
   - Đăng ký `InteractiveBoardTeacherPanel` vào `teacherPanelRegistry` và biểu mẫu cấu hình khởi chạy đợt hoạt động trong `ActivityPanel.tsx`.

4. **Cổng Web Học Sinh Ngoại Tuyến Trực Tiếp (`packages/server/public/student`)**:
   - Triển khai `interactive-board.js` và thẻ giao diện `#interactive-board-view` trong `index.html`.
   - Học sinh dùng điện thoại kết nối qua WiFi/quét mã QR truy cập tức thì: hỗ trợ đầy đủ bộ công cụ nộp bài 3 tab (soạn chữ KaTeX, vẽ tay cảm ứng với ngón tay/stylus, chụp ảnh nén tự động), xem bài đã duyệt, thả tim/like, bình luận góp ý và chấm điểm bạn bè.

### Đóng Gói Ứng Dụng Độc Lập Portable (Windows)

1. **Sửa Lỗi Xung Đột Định Tuyến Fastify (`PATCH /api/students/:studentId/avatar`)**:
   - Loại bỏ route khai báo trùng lặp trong `packages/server/src/routes/titles.ts`, chuẩn hóa xử lý tại `packages/server/src/routes/students.ts`.
   - Khắc phục triệt để lỗi ngoại lệ `Method 'PATCH' already declared for route '/api/students/:studentId/avatar'` khiến máy chủ Fastify không khởi động được.

2. **Khắc Phục Giao Diện Học Sinh & Xử Lý Nộp Bài Bảng Tương Tác**:
   - Sửa lỗi reset giao diện vẽ tay / soạn thảo văn bản khi máy chủ gửi WebSocket state update trong `interactive-board.js`.
   - Chuẩn hóa luồng gửi bài qua HTTP REST `POST /api/sessions/:id/activities/student-intent`, bổ sung `authorName` và `feedback` vào schema giao thức `@educlass/protocol`.

3. **Nâng Cấp Chấm Điểm Tùy Chọn & Màn Chiếu Lớp Học Bảng Tương Tác**:
   - **Chấm điểm tùy ý (`TeacherGradeModal`)**: Cho phép giáo viên tự do nhập bất kỳ mức điểm nào (hỗ trợ số lẻ thập phân 0.1đ như 7.2đ, 8.5đ, 9.8đ) qua ô nhập số trực tiếp hoặc thanh trượt điều chỉnh, bên cạnh các nút bấm nhanh tiện lợi.
   - **Tối ưu Nút Chiếu & Trình Chiếu (`InteractiveBoardProjectorView`)**:
     - Bổ sung nút `📺 Màn Chiếu Cả Lớp` trực tiếp trên thanh công cụ quản trị giáo viên và overlay toàn màn hình, giúp giáo viên dễ dàng quan sát và trình chiếu kể cả khi chỉ sử dụng 1 màn hình laptop.
     - Nút `🌟 Chiếu` bài làm: Tự động kích hoạt hiệu ứng Tiêu điểm (Spotlight) phóng to bài làm lên trung tâm màn chiếu, hiển thị banner thông báo nổi bật kèm nút `📺 Mở Màn Chiếu Xem Ngay` và `👁️ Xem chiếu`.
     - Tích hợp cửa sổ trình chiếu độc lập (`ActivityHostWindow`) hiển thị trực tiếp `InteractiveBoardProjectorView` khi chiếu ra máy chiếu / TV lớp học.
   - **Bảo mật Bài Làm Học Sinh (Content Gating)**:
     - Học sinh bắt buộc phải hoàn thành nộp bài làm của mình thì mới mở khóa xem nội dung, sản phẩm của các bạn khác trong lớp trên cả Cổng Web học sinh (`interactive-board.js`) và Giao diện React (`InteractiveBoardStudentView.tsx`).

4. **Đóng Gói Cập Nhật Bản Thực Thi Portable 2.1.0**:
   - Xuất xưởng file chạy trực tiếp không cần cài đặt mới nhất: `EduClass v2 Portable 2.1.0.exe` (Dung lượng: ~157.6 MB / 157,601,223 bytes) tại thư mục gốc dự án.

## [2.0.91] - 2026-10-17

### Tính Năng Đăng Nhập Giáo Viên (Multi-Teacher Profile Switcher)

1. **Màn Hình Chọn Hồ Sơ Giáo Viên (`TeacherLoginScreen`)**:
   - Hiển thị danh thiếp giáo viên dạng lưới với Avatar màu sắc sinh động, Họ và tên và Môn học phụ trách.
   - Thẻ `+ Thêm giáo viên mới` cho phép giáo viên tự tạo hồ sơ nhanh chóng trên cùng máy tính với mã PIN khởi tạo mặc định là `1234`.
   - Mỗi lần vào dạy (mở app hoặc sau khi đăng xuất) bắt buộc phải chọn hồ sơ và nhập mã PIN để vào bàn làm việc.

2. **Nhập Mã PIN 4 Số & Quên Mã PIN (Phương án 2: Reset 1-chạm về 1234)**:
   - Hộp thoại nhập PIN 4 số hỗ trợ cả bàn phím cứng máy tính lẫn bàn phím số cảm ứng on-screen (Numpad).
   - Nút `Quên mã PIN?`: Hiển thị hộp thoại xác nhận 1-chạm đặt lại mã PIN về mặc định `1234` nhanh chóng, tiện lợi khi thầy/cô quên PIN.

3. **Đổi Mã PIN Cá Nhân & Đăng Xuất Thông Minh**:
   - Menu cá nhân góc trên bên phải hiển thị tên và môn học của giáo viên đang dạy, kèm nút `🔑 Đổi PIN` cá nhân.
   - Nút `⏻ Đổi giáo viên`: Cho phép chuyển nhanh sang tài khoản thầy/cô khác giữa các tiết học.
   - Cảnh báo khi phiên chưa đóng (`LogoutWarningModal`): Nếu tiết dạy vẫn đang mở, hệ thống cảnh báo rõ ràng kèm 3 lựa chọn (*Đóng tiết & Đăng xuất*, *Vẫn giữ phiên chạy ngầm*, hoặc *Hủy bỏ*).

4. **Tách Biệt Dữ Liệu Tuyệt Đối (D5 PLAN.md)**:
   - Giáo viên chỉ thấy danh sách lớp học, ngân hàng đề thi, bài thi và báo cáo phiên của chính mình.
   - Thêm cột `subject` và `avatar` trong bảng `users` cùng migration `0007_user_subject.sql`.

5. **Hiển Thị Tên Học Sinh Trong Kỳ Thi & Bảng Điểm**:
   - **Header khi làm bài**: Bổ sung huy hiệu thí sinh `👤 [Tên học sinh]` trên thanh tiêu đề cố định ở cả giao diện Web học sinh (`packages/server/public/student/`) và React Student View (`ExamStudentView`), giúp học sinh luôn an tâm biết mình đang đăng nhập đúng tài khoản.
   - **Thông báo điểm số & nộp bài**: Hiển thị rõ ràng họ tên học sinh trên thẻ thông báo nộp bài, trong khối kết quả điểm thi (`Thí sinh: [Họ và tên]`), và đầu danh sách xem lại bài thi chi tiết.

## [2.0.90] - 2026-10-17

### Quản Lý Kỳ Thi: Cấu Trúc Thư Mục Đa Cấp & Xem Trực Tiếp Chi Tiết Bài Làm Học Sinh

1. **Cấu Trúc Thư Mục Phân Cấp & Di Chuyển Kỳ Thi (Nested Folders & Move Exams)**:
   - **Tổ chức thư mục con đa cấp**: Hỗ trợ đường dẫn phân cấp không giới hạn cấp độ (ví dụ: `Khối 10 / Tin học / Giữa HK1`).
   - **Thanh điều hướng Breadcrumb**: Thêm thanh chỉ mục thư mục trực quan (`🏠 Tất cả kỳ thi › 📁 Khối 10 › 📂 Tin học`) giúp giáo viên dễ dàng di chuyển nhanh giữa các cấp thư mục hoặc trở về thư mục gốc.
   - **Thẻ thư mục con (Sub-folder Tiles)**: Hiển thị danh sách các thư mục con ngay dưới breadcrumb kèm số lượng đề thi trong từng thư mục; nhấn vào thư mục nào sẽ lập tức đi sâu vào thư mục đó.
   - **Tạo thư mục mới linh hoạt (`CreateFolderModal`)**: Nút `📁+ Thư mục mới` cho phép tạo thư mục gốc hoặc chỉ định thư mục cha để tạo thư mục con tại chỗ.
   - **Di chuyển kỳ thi (`MoveExamModal`)**: Bổ sung nút `📁 Chuyển` trên từng thẻ bài thi; giáo viên có thể chọn cây thư mục để di chuyển bài thi sang thư mục con, tạo thư mục mới để chuyển vào, hoặc đưa ra ngoài thư mục gốc (chưa phân loại).

2. **Xem Trực Tiếp Kết Quả & Phương Án Làm Bài Của Học Sinh (`StudentExamReviewModal`)**:
   - **Xem bài trực tiếp 1-chạm**: Trong bảng điểm chi tiết của kỳ thi, giáo viên có thể nhấp chuột trực tiếp vào dòng của học sinh hoặc nút **👁️ Xem bài** để mở cửa sổ xem toàn bộ bài làm.
   - **Thống kê tổng quan học sinh**: Hiển thị điểm số đạt được, tỉ lệ phần trăm, số câu đúng / sai, thời gian làm bài thực tế và thời điểm nộp bài.
   - **Bộ lọc câu hỏi**: Hỗ trợ lọc nhanh: *Tất cả*, *Chỉ câu đúng*, *Chỉ câu làm sai*.
   - **Chi tiết từng câu hỏi**: Hiển thị đầy đủ đề bài, hình ảnh minh họa (nếu có), các phương án lựa chọn A, B, C, D kèm đánh dấu trực quan (viền xanh đáp án đúng, viền đỏ đáp án học sinh chọn sai, nhãn `✓ Bạn chọn (Đúng)` / `✗ Bạn chọn (Sai)`), câu hỏi dạng điền từ và lời giải thích chi tiết.

3. **Hiển Thị Công Thức Toán Học KaTeX & Xem Ảnh Minh Họa Nét Cao**:
   - **Render công thức toán KaTeX tự động**: Tích hợp `renderLatexInText` từ `@educlass/question-kit` cho tất cả câu hỏi, phương án lựa chọn A-B-C-D, đáp án điền từ và lời giải thích trong cửa sổ xem bài thi của học sinh.
   - **Xử lý hình ảnh đính kèm**: Dùng `resolveAssetUrl` giải mã chính xác hình ảnh ở cả phần đề bài và các phương án chọn (hỗ trợ hình ảnh import từ file Word).
   - **Lightbox xem ảnh lớn**: Bấm vào bất kỳ hình vẽ hay sơ đồ nào để phóng to toàn màn hình xem chi tiết độ nét cao.

4. **Chuẩn Hóa Điểm Trung Bình & Phổ Điểm Theo Thang Điểm Thực Tế Của Đề Thi**:
   - **Sửa mẫu số điểm trung bình**: Thẻ kỳ thi ở tab Kỳ thi và modal báo cáo không còn bị gán cứng `/ 10`. Hệ thống tự động tính toán tổng điểm tối đa của đề thi dựa trên trọng số điểm các câu hỏi (`exam.maxScore`), hiển thị chính xác (ví dụ `2.3 / 7`).
   - **Phổ điểm co giãn động**: Các khoảng phân loại Giỏi/Tốt (≥80%), Khá (65%–80%), Đạt (50%–65%) và Chưa đạt (<50%) tự động điều chỉnh theo đúng thang điểm đề thi thay vì mức điểm cố định 8.0, 6.5, 5.0.

## [2.0.89] - 2026-10-16

### Quản Lý Kỳ Thi: Nâng Cấp Báo Cáo Excel Chi Tiết Từng Câu, Sửa Lỗi Phân Tích Câu Hỏi, Chỉnh Sửa Đề Thi, Cấu Trúc Thư Mục & Sao Chép Kỳ Thi Sang Lớp Khác

1. **Nâng Cấp Báo Cáo Xuất Excel Bảng Điểm Tổng Hợp**:
   - **Bổ sung cột "Lớp"**: Đặt ngay sau cột "Họ và tên" học sinh.
   - **Bổ sung chi tiết phương án từng câu**: Thêm các cột câu hỏi `Câu 1 (Xđ)`, `Câu 2 (Xđ)`... ngay sau cột "Thời điểm nộp bài". Mỗi ô ghi rõ phương án học sinh chọn kèm trạng thái Đúng/Sai (ví dụ: `A (Đúng)`, `C (Sai)`).
   - **Căn chỉnh độ rộng cột và bố cục**: Cấu hình tự động co giãn độ rộng cột (`!cols`) cho cả 3 trang tính (Bảng điểm lớp, Phổ điểm & Xếp loại, Phân tích câu hỏi), căn giữa điểm số và thời gian, chống tràn/cắt cụt chữ.

2. **Khắc Phục Lỗi Phân Tích Câu Hỏi (0% Đúng)**:
   - Sửa hàm `calculateExamStats` trong `packages/server/src/routes/exams.ts`: Hỗ trợ đọc cả dạng mảng reviewData của hoạt động thi lẫn map đối tượng, có cơ chế đối chiếu đáp án trực tiếp từ `answersJson`. Tỉ lệ đúng và số lượt đúng của từng câu được tính toán chính xác 100%.

3. **Bổ Sung Tính Năng Chỉnh Sửa Thiết Lập Kỳ Thi**:
   - Thêm nút **✏️ Sửa** trên góc từng thẻ kỳ thi trong tab "Kỳ thi".
   - Cho phép giáo viên cập nhật: Tiêu đề kỳ thi, môn học, thời lượng làm bài, thư mục phân loại, mật khẩu vào thi và các tùy chọn chống gian lận (đảo câu, đảo đáp án, xem điểm, xem lại bài).
   - Endpoint `PUT /api/exams/:id` tự động merge cấu hình an toàn mà không làm mất các trường dữ liệu khác.

4. **Bổ Sung Cấu Trúc Thư Mục Lưu Trữ Kỳ Thi**:
   - Hỗ trợ trường `folder` trong cấu hình kỳ thi, cho phép giáo viên phân loại kỳ thi (ví dụ: "Giữa HK1", "Cuối HK1", "Kiểm tra 15p", "Ôn tập").
   - Thêm bộ lọc Thư mục trên thanh công cụ: Lọc theo từng thư mục cụ thể kèm số lượng bài thi, hoặc bài thi chưa phân loại.
   - Hiển thị huy hiệu `📁 [Tên thư mục]` nổi bật trên thẻ bài thi.
   - Khi tạo kỳ thi mới (`CreateExamModal`), có ô nhập thư mục kèm gợi ý danh sách thư mục đã có.

5. **Bổ Sung Nút Sao Chép Kỳ Thi Sang Lớp Khác**:
   - Thêm nút **📋 Copy** trên góc từng thẻ bài thi.
   - Modal `CloneExamModal` cho phép chọn lớp học nhận kỳ thi và đặt tiêu đề mới (mặc định gợi ý theo tên lớp mới).
   - Endpoint `POST /api/exams/:id/clone`: Nhân bản 1-click giữ nguyên toàn bộ bộ câu hỏi snapshot, thang điểm từng câu đã chia và cấu hình thi sang lớp mới ở trạng thái sẵn sàng thi.

## [2.0.88] - 2026-10-16

### Quản Lý Kỳ Thi: Tự Động Mở Phiên Học 1-Chạm, Sửa Lỗi Xuất Excel, Tùy Chọn Phân Bổ Điểm & Tập Trung Tab Kỳ Thi

1. **Tiếp Tục Kỳ Thi Tự Động Mở Phiên Học (1-Click Auto-Open Session)**:
   - Gỡ bỏ điều kiện chặn `activeSessionId` khiến nút mở ca thi bị vô hiệu hóa khi chưa có phiên học.
   - Khi thầy/cô bấm **"🚀 Bắt đầu Ca 1 (Tự động mở phiên)"** hoặc **"🚀 Tiếp tục Ca X (Tự động mở phiên)"**, hệ thống tự động tạo phiên học mới theo đúng danh sách lớp của kỳ thi, cấp mã PIN phòng học và kích hoạt ca thi ngay lập tức, sau đó chuyển thẳng vào màn hình làm việc của phiên học.

2. **Khắc Phục Lỗi Xuất Excel `UNAUTHORIZED`**:
   - `packages/server/src/auth/plugin.ts`: Bổ sung cơ chế đọc token dự phòng từ `request.query.token` ngoài header `Authorization: Bearer <token>`.
   - `apps/teacher-ui/src/api/client.ts`: Bổ sung phương thức `downloadExamExcel` và `downloadSessionExcel` thực hiện tải file qua `fetch` có token xác thực, xử lý Blob và tải file mượt mà, không lo bị chặn popup hay hết hạn phiên.

3. **Bổ Sung Tùy Chọn Phân Bổ Điểm Cho Câu Hỏi Trong Tạo Kỳ Thi Mới**:
   - Giao diện `CreateExamModal.tsx` tự động nạp danh sách câu hỏi khi chọn bộ đề, hiển thị tổng số câu và tổng điểm bài thi thời gian thực.
   - Cung cấp các công cụ phân bổ điểm:
     * 🎯 **Chia đều 10 điểm**: Tự động tính toán điểm cơ bản và phân bổ phần dư chính xác tới từng 0.01 điểm để tổng điểm đạt đúng 10.00đ.
     * 🎯 **Chia đều 7 điểm**: Tự động tính toán phân bổ đều đạt đúng 7.00đ.
     * ⚙️ **Chia theo tổng điểm tùy chọn**: Nhập tổng điểm mong muốn và bấm "Chia đều".
     * 🔢 **Gán cùng mức điểm**: Nhập điểm mỗi câu (vd 0.25đ, 0.5đ, 1đ...) và gán cho toàn bộ câu hỏi.
     * 👁️ **Chỉnh sửa điểm từng câu**: Bảng danh sách trực quan cho phép thầy/cô xem tóm tắt nội dung câu hỏi và nhập điểm riêng cho từng câu.
   - `packages/server/src/routes/exams.ts`: Ưu tiên lưu snapshot danh sách câu hỏi kèm điểm số tùy chỉnh mà giáo viên đã phân bổ.

4. **Tập Trung Tính Năng Về Tab "📝 Kỳ thi"**:
   - Đổi tên tab `"📝 Báo cáo Kỳ thi"` thành `"📝 Kỳ thi"` trên thanh điều hướng chính.
   - Trong phiên học (`ActivityPanel.tsx`), ẩn thẻ hoạt động kỳ thi khỏi danh sách lựa chọn chung để tránh trùng lặp và phân tán, tập trung toàn bộ nghiệp vụ tổ chức và quản lý kỳ thi về tab "Kỳ thi".

## [2.0.87] - 2026-10-16

### Quay Gọi Học Sinh: Khắc Phục Lỗi Khởi Tạo Bất Đồng Bộ Trong Đua Vịt & Bắn Vịt Khi Chuyển Chế Độ Ngẫu Nhiên

1. **Khắc Phục Hiện Tượng "Đua Vịt Không Thấy Vịt Mà Vẫn Chọn Được Học Sinh" (`duck_race`)**:
   - **Nguyên nhân**: Khi ở chế độ ngẫu nhiên chuyển sang Đua Vịt, component `DuckRaceMode` vừa được mount lên DOM thì component cha đã lập tức kích hoạt `isPicking = true` và timer 10.5 giây. Trong khi đó PixiJS v8 khởi tạo canvas bất đồng bộ (`await app.init()`) mất 200-300ms, khiến logic spawn vịt bị bỏ qua do `raceContainerRef.current` chưa sẵn sàng.
   - **Giải pháp**:
     * Đưa logic spawn đàn vịt vào hàm tập trung `spawnFlock` và tự động gọi ngay sau khi PixiJS vẽ xong dòng sông.
     * Bổ sung cờ hàng đợi `pendingStartRaceRef`. Nếu component cha đã kích hoạt đua từ trước khi canvas sẵn sàng, ngay khi PixiJS init xong sẽ lập tức kích hoạt chuỗi đếm ngược 3..2..1..GO và xuất phát bơi đua rẽ sóng hoàn hảo, không còn hiện tượng mất vịt.

2. **Khắc Phục Lỗi "Sang Chế Độ Bắn Vịt Không Nhấn Bắt Đầu Được" (`duck_hunt`)**:
   - **Nguyên nhân**: Tương tự, khi `DuckHuntMode` vừa mount với `isPicking = true`, hàm `executeHuntSequence` bị thoát sớm do đàn vịt chưa kịp nạp vào Pixi scene, dẫn đến `isPicking` bị kẹt ở `true` trên component cha. Khi đó, điều kiện `if (!isPicking)` của canvas và thuộc tính `disabled={isPicking}` của các nút bấm đã vô hiệu hóa hoàn toàn tương tác của người dùng.
   - **Giải pháp**:
     * Bổ sung cờ hàng đợi `pendingHuntRef`. Khi PixiJS và đàn vịt khởi tạo xong, hệ thống tự động khởi động ngắm bắn mượt mà.
     * Cập nhật điều kiện click canvas và nút "Bắn ngẫu nhiên": chỉ dựa vào `!isHuntingRef.current` (chưa đang trong nhịp bắn) thay vì phụ thuộc `isPicking`. Thầy cô có thể nhấp chuột trực tiếp lên màn hình hoặc bấm nút "Bắn ngẫu nhiên" / "Học sinh tiếp theo" bất cứ lúc nào để bắt đầu phát bắn.

## [2.0.86] - 2026-10-16

### Quay Gọi Học Sinh (`random-picker`): Bổ Sung Chế Độ "Dãy Bóng Số" (`ball_elimination`)

1. **Ý Tưởng & Cơ Chế Hoạt Động (Phương Án 1 - Dãy Bóng Số Sinh Tồn)**:
   - Sân khấu xuất hiện **1 dãy 10 quả bóng**, đánh số ngẫu nhiên lộn xộn từ `0` tới `9` với tạo hình bóng thể thao / bi-a 3D bóng bẩy, nổi bật trên nền kính mờ.
   - Hỗ trợ các quả bóng có số trùng nhau (đặc biệt khi số thứ tự là số lặp kép như `11, 22, 33, 44`).
   - Từng quả bóng nổ/biến mất ngẫu nhiên tại các vị trí bất kỳ với nhịp nổ nhanh dần rồi chậm lại dồn dập kịch tính kèm hiệu ứng âm thanh pop, đếm nhịp và nổ hạt.
   - **Giai đoạn cuối**:
     * Nếu STT học sinh < 10: Còn lại duy nhất **1 quả bóng** tương ứng với số thứ tự đó (vd: số 5).
     * Nếu STT học sinh ≥ 10: Còn lại đúng **2 quả bóng** (hàng chục và hàng đơn vị, vd: 2 và 7). Hai quả bóng bay vào giữa màn hình, hợp nhất ghép thành số thứ tự (vd: `STT 27`).
   - Xướng tên vinh danh học sinh trúng đích với pháo hoa rực rỡ và mở cửa sổ kết quả cho điểm/EXP.

2. **Tích Hợp Toàn Diện Vào Hệ Thống**:
   - Khai báo mode `ball_elimination` trong `packages/protocol` (`RandomPickerModeIdSchema`).
   - Đăng ký vào danh sách các trò chơi của chế độ ngẫu nhiên `ALL_RANDOM_SUB_MODES` và hỗ trợ cả tính năng gọi học sinh học lực tốt (`BIAS_GOOD_COMPATIBLE_SUB_MODES`).
   - Đồng bộ hoàn hảo qua BroadcastChannel sang màn hình máy chiếu (Projector View).

## [2.0.85] - 2026-10-16

### Hệ Thống & Giao Diện: Bổ Sung Hiển Thị Phiên Bản (Version Badge) Trên Toàn Bộ Ứng Dụng

1. **Định Danh Phiên Bản Tập Trung (`@educlass/protocol`)**:
   - Định nghĩa hằng số phiên bản chuẩn `APP_VERSION = '2.0.85'` và `EDUCLASS_VERSION = '2.0.85'` trong `packages/protocol/src/version.ts`.
   - Đồng bộ trường `version: "2.0.85"` qua tất cả các gói: root `package.json`, `@educlass/protocol`, `@educlass/server`, `@educlass/teacher-ui`, `@educlass/student-ui`, `@educlass/desktop`.

2. **Giao Diện Giáo Viên (`apps/teacher-ui`)**:
   - Header thanh điều hướng: Bổ sung huy hiệu phiên bản nổi bật (`v2.0.85`) đặt ngay cạnh nhãn "Giáo viên" với tooltip và `data-testid="teacher-app-version-badge"`.
   - Footer chân trang: Bổ sung dòng thông tin bản quyền và phiên bản `EduClass v2 • Phiên bản v2.0.85`.

3. **Cổng Học Sinh (`apps/student-ui`)**:
   - Chân trang học sinh: Hiển thị tinh tế `EduClass v2.0.85` ở tất cả các bước (nhập mã phòng, chọn tên, trong tiết học và tổng kết).

4. **Ứng Dụng Desktop Electron (`apps/desktop`)**:
   - Tiêu đề cửa sổ máy chủ: `EduClass v2 (v2.0.85) — Máy chủ Lớp học`.
   - Tiêu đề cửa sổ giáo viên: `EduClass v2 (v2.0.85) — Bàn Làm Việc Giáo Viên`.
   - Bảng điều khiển Server (`window.html`): Hiển thị huy hiệu `v2.0.85` ngay cạnh tiêu đề `EduClass v2` và tự động cập nhật qua IPC.
   - Khay hệ thống (System Tray): Tooltip hiển thị đầy đủ `EduClass v2 (v2.0.85) — Máy chủ đang hoạt động`.

5. **Máy Chủ Fastify (`packages/server`) & Khởi Động Console (`scripts/start.js`)**:
   - API `/health`, `/version`, `/api/version` trả về trường `version: "2.0.85"` cùng với `v: 1` (protocol version).
   - Console `scripts/start.js` in rõ ràng phiên bản `🚀 EDUCLASS v2 (v2.0.85)` khi khởi động.

## [2.0.84] - 2026-10-16

### Quay Gọi Học Sinh (`random-picker`): Bổ Sung Chế Độ "Ngẫu Nhiên" (Đổi Mini-game Mỗi Lượt Quay)

1. **Chế Độ Ngẫu Nhiên Mặc Định Đầu Tiên**:
   - Thêm chế độ `random_mode` với tên hiển thị **`🎲 Ngẫu nhiên`** ở vị trí đầu tiên trong dropdown và đặt làm cấu hình mặc định ban đầu (`mode: 'random_mode'`).
   - **Giao diện lần đầu tiên**: Hiển thị sân khấu chào đón độc đáo (`RandomWelcomeStage`) với icon xúc xắc 3D lung linh, thông điệp hướng dẫn rõ ràng và danh sách huy hiệu 10 mini-game sẵn sàng khởi động.
   - **Giao diện các lượt sau**: Sân khấu giữ nguyên trò chơi vừa hoàn tất của lượt trước để giáo viên và học sinh dễ dàng theo dõi kết quả.

2. **Thuật Toán Bốc Trò Chơi Ngẫu Nhiên & Quy Tắc Không Lặp Trò Liên Tiếp**:
   - Khi bấm "Học sinh đầu tiên" hoặc "Học sinh tiếp theo", hệ thống bốc ngẫu nhiên 1 trong các mini-game khác và lập tức kích hoạt sân khấu của trò đó.
   - Áp dụng cơ chế **chống lặp lại trò chơi của 1 lượt ngay trước đó** (`lastPlayedMode`) để mỗi lượt quay luôn là một trải nghiệm mới lạ, không bị trùng lặp.

3. **Tương Thích Tính Năng Ẩn Chọn Học Sinh Học Lực Tốt (`bias_good`)**:
   - Khi bấm nút bí mật `✦` (chọn học sinh học lực tốt), hệ thống tự động **loại trừ các chế độ mô phỏng vật lý không định trước mục tiêu** (như Pinball `marble_race` và Bắn vịt `duck_hunt`).
   - Chỉ bốc ngẫu nhiên trong danh sách các trò chơi hỗ trợ định trước kết quả (`card_flip`, `mystery_box`, `slot_machine`, `name_roller`, `balloon_pop`, `magic_deck`, `duck_race`, `elimination_grid`), đảm bảo 100% học sinh được xướng tên là học sinh có học lực tốt (`tot`) đúng theo ý đồ sư phạm.

4. **Giữ Nguyên Cách Thao Tác Của Từng Chế Độ**:
   - Các trò tương tác (chọn lá bài, mở hộp quà, bắn bóng bay, rút bài ma thuật) vẫn giữ trọn vẹn thao tác click lật mở của thầy cô hoặc học sinh.
   - Các trò tự động (đua vịt, bắn vịt, cuộn tên, máy quay số, đua bi rơi pinball, sinh tồn) tự động diễn hoạt kịch tính đến khi có kết quả.

## [2.0.83] - 2026-10-16

### Đấu Trường Sinh Tồn (`elimination_grid`): Bổ Sung Thời Gian Đợi 1 Giây Trước Khi Bắt Đầu Loại

1. **Khắc Phục Hiện Tượng Vừa Nhấn "Chơi Lại" Thì Học Sinh Bị Loại Ngay Lập Tức**:
   - Trước đây khi kết thúc một lượt quay và nhấn "Chơi lại" (hoặc "Học sinh tiếp theo"), sau 200ms học sinh đầu tiên đã bị loại ngay lập tức khiến giáo viên và học sinh chưa kịp nhìn thấy toàn bộ bảng học sinh được khôi phục.
   - Thêm trạng thái `phase: 'ready'` và thiết lập thời gian chờ chuẩn **1 giây (1000ms)** trước khi đợt loại đầu tiên diễn ra.

2. **Trải Nghiệm Hiển Thị Khởi Động Đấu Trường**:
   - Trong suốt 1 giây này, 100% học sinh xuất hiện nguyên vẹn trên lưới bàn cờ với màu sắc rực rỡ và số thứ tự rõ ràng.
   - Thanh trạng thái hiển thị thông báo: `⚔️ ĐẤU TRƯỜNG SINH TỒN: Chuẩn bị khởi tranh...`, huy hiệu đếm hiển thị đầy đủ tổng số học sinh (ví dụ `35 / 35 ô`).
   - Sau đúng 1 giây (1000ms), Vòng 1 chính thức bắt đầu và lần lượt loại các bạn để tiến về mốc Top 5 ở giây thứ 6.0, đảm bảo toàn bộ tiến trình vẫn trọn vẹn trong khoảng 10 giây.

## [2.0.82] - 2026-10-16

### Cấu Hình Hoạt Động: Tùy Chọn Bật/Tắt Sử Dụng Vật Phẩm (Power-ups) Cho Đối Kháng 1vs1 & Quizizz

1. **Tùy Chọn Bật/Tắt Vật Phẩm Trong Đối Kháng 1vs1 (`@educlass/activity-arcade-duel`)**:
   - Bổ sung cấu hình `enablePowerUps` (mặc định: `true`) vào `ArcadeDuelConfigSchema`.
   - Giao diện cài đặt GV trong `ActivityPanel`: Thêm checkbox bật/tắt rõ ràng với mô tả trực quan. Khi tắt, ẩn các thiết lập con (điều kiện nhận, sức chứa túi) và ẩn gợi ý phím Q/5.
   - Khi tắt vật phẩm (`enablePowerUps: false`):
     * Không tặng vật phẩm khi đạt chuỗi trả lời đúng (`grantPowerUp` được bỏ qua).
     * Bỏ qua việc nhấn phím kích hoạt vật phẩm (`handleUsePowerUp` trả về ngay).
     * Ẩn thanh túi đồ (`PowerUpQueueBar`) của cả Đội Xanh và Đội Đỏ ở cả 2 chế độ **Cùng trả lời (Sync Turn)** và **Đua tốc độ (Speed Race)**.
     * Cập nhật thông điệp sàn đấu trong `CombatFeedBar`: chỉ hướng dẫn chọn đáp án bằng bàn phím.

2. **Tùy Chọn Bật/Tắt Vật Phẩm Trong Quizizz (`@educlass/activity-quiz-live`)**:
   - Giao diện cài đặt GV trong `ActivityPanel`: Bổ sung checkbox "⚡ Sử dụng vật phẩm hỗ trợ & tấn công (Power-ups)" cho riêng chế độ Quizizz.
   - Khi khởi chạy Quizizz, giá trị `enablePowerUps` được truyền chính xác vào cấu hình hoạt động.
   - Khi tắt vật phẩm (`enablePowerUps: false`):
     * Không tặng vật phẩm khi trả lời đúng liên tiếp; không hiển thị túi đồ cá nhân trên điện thoại học sinh.
     * Chặn lệnh `use_powerup` nếu có gửi từ client.

## [2.0.81] - 2026-10-16

### Đua Bi (Marble Race): Kịch Tính Hóa Máng Trượt Với Khe Rơi Đường Tắt & Vạch Tăng Tốc Turbo Neon

1. **Kết Hợp Đột Phá: Khe Rơi Đường Tắt (Shortcut Gaps) & Vạch Tăng Tốc (Turbo Boost Pads)**:
   - Áp dụng trên 2 chặng máng trượt uốn lượn: **Chặng 1 Bản đồ Hẻm Núi Bánh Răng** và **Chặng 6 Bản đồ Vương Quốc Pinball**.
   - Khắc phục triệt để hiện tượng trượt đều đều, giữ nguyên thứ hạng và thiếu tính đột biến trước đây.

2. **3 Khe Rơi Đường Tắt (Shortcut Drop Gaps)**:
   - Cắt xẻ 3 máng trượt dài thành 6 đoạn, mở ra các khe rơi tự do rộng 90px ở khu vực trung tâm ($x: 360 \to 450$).
   - Bi trượt ở làn trong có thể rơi sớm xuyên tầng xuống ngay máng bên dưới, rút ngắn quãng đường và tạo cơ hội lội ngược dòng ngoạn mục.
   - Hiển thị nhãn phát sáng neon hướng dẫn trực quan `🕳️ ĐƯỜNG TẮT ⬇`.

3. **3 Dải Vạch Tăng Tốc Turbo Neon (Turbo Speed Boost Pads)**:
   - Đặt trên các khúc cua ngoài của máng trượt với hiệu ứng mũi tên neon động `>>>` và nhãn `⚡TURBO`.
   - Khi bi chạm vạch tăng tốc:
     * Nhận lực phóng gia tốc cực mạnh ($+5.2 \times \text{hệ số}$ trượt theo chiều nghiêng của máng).
     * Mở giới hạn tốc độ tối đa từ $9.2$ lên **$14.0\text{px/frame}$** trong $480\text{ms}$.
     * Phát âm thanh bứt tốc nitro điện tử sống động (`playTurboBoost()`).
     * Hiển thị vệt đuôi hào quang năng lượng điện quang bao bọc quanh bi trong suốt thời gian tăng tốc.



### Quizizz: Tích Hợp Hệ Thống Vật Phẩm, Khiên Phản Đòn (45s) & Thông Báo Chiến Sự Hàng Dưới Cùng

1. **Vật Phẩm Mới: "Khiên Phản Đòn" (Reflect Shield - 🪞) & Chuẩn Hóa Thời Gian Khiên (45 Giây)**:
   - Thêm vật phẩm **Khiên Phản Đòn (🪞)**: Khi được kích hoạt, khiên duy trì trong **45 giây** hoặc cho đến khi **bị đối thủ tấn công 1 lần**. Khi đối thủ phóng chiêu (Đóng băng, Bom khói, Nam châm hút điểm), đòn tấn công lập tức bị dội ngược lại về chính kẻ xuất chiêu!
   - Chuẩn hóa thời gian **Khiên Hộ Thể (🛡️)** lên chuẩn **45 giây** (hoặc bị tấn công 1 lần thì vỡ để bảo vệ chủ nhân).
   - Khi dội ngược đòn Nam châm hút điểm: kẻ tấn công bị cướp ngược lại 100 điểm sang cho người sở hữu Khiên Phản Đòn.

2. **Tích Hợp Toàn Diện Hệ Thống Vật Phẩm Vào Chế Độ Quizizz (`@educlass/activity-quiz-live`)**:
   - Tặng vật phẩm ngẫu nhiên khi học sinh trả lời đúng liên tiếp (tùy chọn 1 hoặc 2 câu liên tiếp theo cấu hình).
   - Túi đồ cá nhân dạng hàng đợi FIFO sức chứa 2–3 món, giao diện túi đồ cảm ứng trực quan (vùng chạm $\ge 48\text{px}$) với nút "DÙNG" tiện lợi.
   - Cơ chế Auto-Targeting thông minh: Tự động nhắm vào đối thủ xếp ngay trên mình trên bảng xếp hạng (`rank - 1`), nếu đang đứng Top 1 thì tự động nhắm vào Top 2 đang bám đuổi.
   - Đầy đủ các hiệu ứng bổ trợ:
     * **Sấm Sét x2 (⚡)**: Nhân đôi điểm số cho câu trả lời đúng tiếp theo.
     * **Kính Soi 50/50 (🎯)**: Làm mờ và vô hiệu hóa 2 phương án sai ở câu hiện tại.
     * **Đóng Băng (❄️)**: Khóa thao tác trả lời của đối thủ trong 2 giây kèm lớp phủ băng tuyết sinh động và đếm lùi thời gian.
     * **Bom Khói (🌫️)**: Che mờ màn hình câu hỏi của đối thủ trong 3 giây.
     * **Nam Châm Hút Điểm (🧲)**: Cướp 100 điểm từ đối thủ.

3. **Thông Báo Chiến Sự Cá Nhân Ở Hàng Dưới Cùng (Bottom Row Notification)**:
   - Hiển thị trực tiếp ở hàng dưới cùng trên màn hình của cả **Người tấn công** và **Người bị tấn công** theo 4 chủ đề màu sắc trực quan:
     * **Phản đòn (Tím Neon 🪞)**: Cảnh báo kẻ tấn công bị dội ngược chiêu thức, đồng thời chúc mừng chủ nhân đã dội ngược đòn đánh.
     * **Phòng thủ (Xanh Ngọc 🛡️)**: Thông báo khiên đã bảo vệ thành công hoặc báo cho kẻ tấn công biết đòn đánh đã bị chặn đứng.
     * **Tấn công (Đỏ Hồng ⚔️)**: Thông báo đòn đánh phóng trúng đích hoặc cảnh báo người chơi đang bị trúng chiêu.
     * **Thông tin (Xanh Dương 🎁)**: Thông báo nhận vật phẩm mới hoặc kích hoạt bùa lợi thành công.
   - Tích hợp nút đóng nhanh, hiển thị bền bỉ trên toàn bộ các trạng thái màn hình học sinh (kể cả khi đã hoàn thành hoặc đang chờ).

4. **Đồng Bộ Bảng Xếp Hạng Trực Tiếp & Màn Chiếu Giáo Viên**:
   - Hiển thị dải tin tức chiến sự (Combat Feed Ticker) thời gian thực ở phần đầu bảng điều khiển Quizizz và màn hình máy chiếu.
   - Hiển thị huy hiệu trạng thái sinh động cạnh tên học sinh trên bảng xếp hạng trực tiếp: `🪞` (Khiên Phản Đòn), `🛡️` (Khiên Hộ Thể), `❄️` (Bị Đóng Băng), `⚡` (x2 Điểm).

## [2.0.79] - 2026-10-15

### Hoạt Động & Tiện Ích: Ra Mắt "Đối Kháng 1vs1" (Arcade Duel) & Lõi Hệ Thống Vật Phẩm (Power-ups)

1. **Hoạt Động Đối Kháng 1vs1 (`@educlass/activity-arcade-duel`)**:
   - Hoạt động dành cho phòng học truyền thống: 2 học sinh đại diện bục giảng thi đấu trực tiếp trên màn hình máy tính GV/máy chiếu, không cần điện thoại hay máy tính học sinh.
   - Hỗ trợ **2 chế độ thi đấu**:
     * **Cùng trả lời (Sync Turn)**: Màn hình chia 3 (trên là câu hỏi chung, dưới chia đôi 2 bên chọn đáp án bí mật và lật bài cùng lúc).
     * **Đua tốc độ (Speed Race)**: Màn hình chia đôi 50/50 dọc với thanh giằng co (Tug-of-war) tỉ số. Tiến độ độc lập, chọn sai bị dừng 1.5s rồi tự động chuyển câu tiếp theo.
   - Bố trí bàn phím công thái học bắt theo `event.code` (chống xung đột gõ tiếng Việt Unikey):
     * Đội Xanh (Trái): Đáp án `A, S, D, F` | Kích hoạt vật phẩm `Q`.
     * Đội Đỏ (Phải): Đáp án `1, 2, 3, 4` | Kích hoạt vật phẩm `5`.
   - Đảo thứ tự phương án độc lập giữa 2 bên để chống nhìn trộm bài nhau.
   - Tích hợp trực tiếp vào Game Hub Quizz Live trong `ActivityPanel.tsx` bên cạnh Kahoot, Quizizz, Đấu Cờ và Lãnh Thổ.
   - Hỗ trợ màn hình Khán đài (Spectator View) cho Cổng Học sinh với nút cổ vũ trực tiếp.

2. **Lõi Hệ Thống Vật Phẩm Dùng Chung (Universal Power-up Engine)**:
   - Kiến trúc chuẩn hóa trong `@educlass/protocol` và `@educlass/core/src/powerups`:
     * Bộ 6 vật phẩm tinh hoa: 🛡️ Khiên Hộ Thể (chặn đứng đòn tấn công), ⚡ Sấm Sét x2, 🎯 Kính Soi 50/50, ❄️ Đóng Băng (2s), 🌫️ Bom Khói (3s), 🧲 Nam Châm Hút Điểm.
     * Cơ chế túi đồ hàng đợi (FIFO queue) sức chứa 2 hoặc 3 món, kích hoạt tuần tự chỉ bằng **1 phím duy nhất** (`Q` hoặc `5`).
     * Cơ chế tặng đồ thông minh theo chuỗi đúng (1 câu hoặc 2 câu liên tiếp).
     * 5 phạm vi tác động (`self`, `opponent`, `leader`, `neighbors`, `all_opponents`) sẵn sàng tái sử dụng cho Quizizz và các hoạt động khác.
     * Băng rôn Chiến sự Combat Feed kèm hiệu ứng Web Audio offline sống động.

## [2.0.78] - 2026-10-15

### Hoạt Động & Tiện Ích: Hợp Nhất 4 Chế Độ Trắc Nghiệm Vào Tiện Ích Duy Nhất "Quizz Live"

1. **Gom Nhóm 4 Chế Độ Thi Đấu Trong Quizz Live**:
   - Tối ưu hóa giao diện danh sách hoạt động của Giáo viên: Ẩn các thẻ phân mảnh đơn lẻ (`swiss-duel`, `territory-war`), quy hoạch tập trung vào một thẻ duy nhất mang tên **Quizz Live** với huy hiệu nổi bật `4 CHẾ ĐỘ` cùng bộ nhãn trực quan (🔴▲ Kahoot Live, ⚡ Quizizz Tự do, ♟️ Đấu Cờ Thụy Sỹ, ⚔️ Đại Chiến Lãnh Thổ).
   - Modal cấu hình hỗ trợ bộ chọn 4 chế độ thi đấu trực quan với icon và hướng dẫn chi tiết về lối chơi, nhịp độ và màn chiếu:
     * **Kahoot Live**: Nhịp theo GV, chiếu màn hình chung, đua top từng câu.
     * **Quizizz Tự do**: Tốc độ cá nhân, tự động đảo câu/đáp án, bảng leo rank trực tiếp.
     * **Đấu Cờ Thụy Sỹ (Swiss Duel)**: Đối kháng 1v1 ghép cặp theo hệ Thụy Sỹ, trả lời đúng ăn cờ đối thủ.
     * **Đại Chiến Lãnh Thổ (Territory War)**: Chia 2 phe Xanh - Đỏ chiến thuật, chiếm cứ điểm bản đồ.

2. **Dùng Chung Kho Bộ Đề & Cài Đặt Chuyên Sâu Từng Chế Độ**:
   - Sử dụng chung bộ chọn câu hỏi từ Ngân hàng đề thi / Đề ma trận cho cả 4 chế độ.
   - Hiển thị bảng điều khiển cài đặt riêng thích ứng linh hoạt theo từng chế độ đã chọn:
     * Kahoot / Quizizz: Tùy chọn đảo câu hỏi, đảo phương án, tính điểm tốc độ và chuỗi streak.
     * Đấu Cờ Thụy Sỹ: Tùy chọn chế độ tổ chức vòng đấu (theo kho câu hỏi / theo thời gian), cấu hình thời gian suy nghĩ mỗi câu hỏi.
     * Đại Chiến Lãnh Thổ: Tùy chọn kích thước bản đồ chiến lược (5x5, 7x7, 9x9), thời lượng cuộc chiến và luật Sudden Death.
   - Khởi chạy chính xác engine tương ứng (`quiz-live` mode kahoot/quizizz, `swiss-duel`, `territory-war`), bảo toàn 100% tính toàn vẹn của logic chấm điểm, tính EXP thưởng và trải nghiệm học sinh/màn chiếu.

## [2.0.77] - 2026-10-15

### Bắn Vịt (`duck_hunt`): Tự Động Chuyển Ngắm Sang Vịt Khác Khi Vịt Đang Nhắm Chạm Biên

1. **Khắc Phục Hiện Tượng Tâm Bị Bỏ Lại Khi Vịt Chạm Biên**:
   - Trước đây khi vịt tiến vào mép biên, ticker ngắt bám theo khiến tâm ngắm dừng lại ở thành viền trong khi vịt tiếp tục bơi đi.
   - Bổ sung hàm kiểm tra `isDuckNearBorder` và cờ tín hiệu `borderHitRef`:
     * Khi tâm ngắm đang bay tới hoặc đang bám theo một chú vịt, nếu chú vịt đó bơi tới vùng cận biên ($x > 1000\text{px}$ khi bơi sang phải hoặc $x < 200\text{px}$ khi bơi sang trái), hệ thống lập tức ngắt chu kỳ bám theo hiện tại.
     * Vòng lặp rà soát tức thì chọn một chú vịt an toàn khác đang bơi ở trung tâm sân khấu và lia tâm ngắm chuyển sang chú vịt mới ngay lập tức.
     * Chú vịt mục tiêu chung kết (`targetDuck`) cũng được kiểm tra liên tục, nếu vô tình chạm biên sẽ đổi ngay sang vịt an toàn khác trước khi khóa mục tiêu nổ súng.
   - Kết quả: Tâm ngắm chuyển động mượt mà, liên tục, sống động và không bao giờ bị bỏ rơi hay khựng lại ở mép biên.

## [2.0.76] - 2026-10-15

### Đấu Trường Sinh Tồn (`elimination_grid`): Tinh Chỉnh Thời Lượng Vòng 1 (0.2s - 6.0s) & Giảm 0.4s Các Vòng Còn Lại

1. **Vòng 1 (0.2s - 6.0s)**:
   - Kéo dài thời lượng Vòng 1 lên $5.8\text{s}$ (từ $0.2\text{s}$ tới chính xác mốc $6.0\text{s}$), tăng thời gian phân bổ cho mỗi lượt loại học sinh (nhịp độ mượt mà, rõ ràng, không bị loại quá nhanh).
   - Vòng 1 chốt danh sách Top 5 sống sót tại đúng $6.0\text{s}$.

2. **Các Vòng/Giai Đoạn Còn Lại Giảm 0.4 Giây**:
   - **Dừng công bố Top 5**: Giảm từ $1.1\text{s}$ xuống **$0.7\text{s}$** ($700\text{ms}$).
   - **Vòng 2 (Top 5 -> Top 3)**: Giảm từ $1.6\text{s}$ xuống **$1.2\text{s}$** ($1200\text{ms}$), hai bạn rời cuộc chơi tại mốc $6.9\text{s}$ và $7.4\text{s}$.
   - **Dừng công bố Top 3**: Giảm từ $1.2\text{s}$ xuống **$0.8\text{s}$** ($800\text{ms}$).
   - **Vòng 3 (Chung kết Top 3 -> 1)**: Giảm từ $2.0\text{s}$ xuống **$1.6\text{s}$** ($1600\text{ms}$), loại ở $8.9\text{s}$ (đưa về đối đầu 1 vs 1) và $9.7\text{s}$.
   - **Thời điểm xướng tên Winner**: Hoàn tất ở mốc $10.3\text{s}$, đảm bảo trọn vẹn mục tiêu thời gian khoảng 10 giây.

## [2.0.75] - 2026-10-15

### Đua Bi Rơi Pinball (`marble_race`): Thông Thoáng Hành Lang Máng Trượt & Kéo Dài Cầu Bập Bênh Cả 2 Bản Đồ

1. **Loại Bỏ Nấm Nảy & Đinh Gây Kẹt Bi Ở Đầu Rơi Máng Trượt**:
   - **Bản đồ 2 (Hẻm Núi Bánh Răng) Chặng 1:** Loại bỏ $3$ nấm nảy lò xo ở mép rơi và $2$ cọc đinh kim cương trên máng; hành lang rơi giữa các máng đạt độ thông thoáng $180\text{px}$ thênh thang, bi lướt vùn vụt và rơi tự do sang máng tiếp theo trơn tru không còn điểm nghẽn.
   - **Bản đồ 1 (Vương Quốc Pinball) Chặng 6:** Loại bỏ $2$ nấm nảy ở mép cua máng zíc-zắc, bảo đảm bi trượt dốc cao tốc rơi mượt mà thẳng vào phễu cổ chai chung kết mà không bao giờ bị dội ngược hay kẹt lại.

2. **Kéo Dài Kích Thước Cầu Bập Bênh Ở Cả 2 Bản Đồ (Longer See-Saws)**:
   - **Bản đồ 1 (Chặng 4 - Cầu bập bênh liên hoàn):** Tăng kích thước 3 cầu bập bênh từ $320\text{px} / 290\text{px} / 290\text{px}$ lên **$460\text{px} / 420\text{px} / 420\text{px}$**.
   - **Bản đồ 2 (Chặng 5 - Cầu bập bênh đôi đối xứng):** Tăng kích thước 2 cầu bập bênh từ $330\text{px}$ lên **$460\text{px}$**.
   - Quãng đường bi lăn trên các bản bập bênh dài hơn, tạo đòn bẩy chúi lắc rõ rệt và đem lại hiệu ứng thị giác như những nhịp cầu treo khổng lồ.

## [2.0.74] - 2026-10-15

### Nâng Cấp Bắn Vịt (Duck Hunt Mode): Tránh Khuất Biên, Rà 5-10 Vịt & Không Bao Giờ Khuyết Vịt

1. **Khắc Phục Hiện Tượng Nhắm Vào Vịt Sát Biên Hoặc Bị Khuất Sau Rèm**:
   - Tối ưu giới hạn an toàn tâm ngắm: Nâng `MIN_CROSSHAIR_X = 140`, `MAX_CROSSHAIR_X = 1060`, `MIN_CROSSHAIR_Y = 100`, `MAX_CROSSHAIR_Y = 510`.
   - Thuật toán `getSafeDucks` & `getSafeTargetDucks` chọn vịt động tại từng bước dựa theo hướng bơi và chiều dài hành lang an toàn:
     * Vịt bơi sang phải: Tọa độ $x \le 750$ (đảm bảo còn $> 400\text{px}$ đường bơi thênh thang sang phải, tuyệt đối không bao giờ chạm rèm phải $x = 1152$).
     * Vịt bơi sang trái: Tọa độ $x \ge 450$ (đảm bảo còn $> 400\text{px}$ đường bơi thênh thang sang trái, tuyệt đối không bao giờ chạm rèm trái $x = 48$).
   - Trong `ticker`, nếu vịt đang bám theo vô tình tiến vào vùng cận biên ($\le 200\text{px}$ hoặc $\ge 1000\text{px}$), tâm ngắm tự động ngắt tracking giữ vị trí trong màn hình.

2. **Lướt Qua Từ 5 Đến 10 Chú Vịt Trước Khi Chốt Mục Tiêu**:
   - Số lượt di chuyển dao động ngẫu nhiên chuẩn xác từ 5 đến 10 vịt (`Math.floor(Math.random() * 6) + 5`).
   - Tâm ngắm di chuyển lướt nhịp nhàng qua từng chú vịt mồi (`hopDuration: 0.3s – 0.42s`), kèm âm thanh tick reel rộn ràng và hiển thị tiến độ rà soát trực tiếp (`(1/N)`, `(2/N)`... đến chú vịt cuối cùng).
   - Đến chú vịt thứ $N$, tâm ngắm khóa chặt mục tiêu, nhấp nháy đỏ cảnh báo và phát âm thanh khóa mục tiêu trước khi nổ súng.

3. **Bắn Trúng Không Bị Khuyết Vịt (Bảo Toàn Đầy Đủ Đàn Vịt)**:
   - Loại bỏ việc ẩn hoặc làm biến mất con vịt bị trúng đạn.
   - Khi súng nổ: Chú vịt ngửa người ra sau trên bản lề cơ học (`rotation: 0.8, y: +22px`) kèm hiệu ứng tóe lửa nòng súng, lông bay tứ tung và rung giật màn hình.
   - Tọa độ $x$ của chú vịt vẫn tiếp tục bơi đều trên băng chuyền ray trượt của hàng bơi. Sau 750ms, chú vịt bật lò xo dựng đứng dậy (`back.out(2.5)`) với thẻ tên màu vàng Gold rực rỡ và tiếp tục bơi cùng đàn.
   - Đàn vịt luôn đầy đủ 100%, hàng lối đều đặn và không bao giờ bị khuyết bất kỳ ô vịt nào.

## [2.0.73] - 2026-10-15

### Khắc Phục Bố Cục Sân Khấu & Thuật Toán Săn Bắn Vịt Trực Tiếp Trên Màn Hình (Duck Hunt Mode)

1. **Khắc Phục Triệt Để Bố Cục Sân Khấu & Mảng Đen 40% Bên Phải**:
   - Loại bỏ inline-style cố định kích thước (`1100px`) do PixiJS sinh ra khi khởi tạo, thiết lập chuẩn tỉ lệ 2:1 (`GALLERY_WIDTH = 1200`, `GALLERY_HEIGHT = 600`).
   - Thiết lập canvas `width: 100%`, `height: 100%`, `display: block` và đặt giới hạn `containerWidthStyle` co giãn mượt mà theo viewport (`min(96vw, 1200px)` ở chế độ thường và `min(96vw, calc((100vh - 125px) * 2))` ở chế độ toàn màn hình).
   - Căn giữa trường bắn hội chợ hoàn hảo, không còn tình trạng lệch trái hay xuất hiện mảng đen khổng lồ bên phải.

2. **Thuật Toán Săn Bắn Trực Tiếp Trên Màn Hình (Không Chọn Trước Học Sinh Ngoài Màn Hình)**:
   - Bỏ hoàn toàn việc chọn trước học sinh từ danh sách thí sinh khi bắt đầu quay.
   - Thuật toán quét trực tiếp các chú vịt đang bơi an toàn trên màn hình thực tế (`150 <= x <= GALLERY_WIDTH - 150`).
   - Tâm ngắm lia qua 3 chú vịt mồi nhử trên màn hình với tốc độ bám sát tự nhiên (0.8s/con), sau đó chuyển sang bám sát và khóa chặt con vịt mục tiêu trong 1.2s.
   - Nổ súng bắn hạ, hiệu ứng tóe lửa tia chớp và lông bay tung tóe, con vịt trúng đạn lật ngửa chìm xuống biến mất hoàn toàn.
   - Kết quả trúng thưởng được lấy chính xác từ chú vịt bị bắn trúng, đảm bảo đồng bộ 100% tên học sinh giữa trường bắn và bảng kết quả vinh danh.

3. **Đồng Bộ Giao Diện & Màn Hình Máy Chiếu**:
   - Đồng bộ luồng hoàn tất và nổ pháo hoa trên cả giao diện giáo viên (`RandomPickerTab`) và màn hình máy chiếu (`RandomPickerProjectorWindow`).
   - Ẩn nút quay phụ bên ngoài để giao diện gọn gàng, tập trung vào trường bắn.

## [2.0.72] - 2026-10-15

### Chuẩn Hóa Thời Lượng Chế Độ Đấu Trường Sinh Tồn (Elimination Grid) Chuẩn 10 Giây

1. **Định Chuẩn Thời Lượng Toàn Vòng Quay Chính Xác 10 Giây**:
   - Tái cấu trúc và tính toán phân bổ dòng thời gian (Timing Budget) từ lúc giáo viên bấm quay cho đến thời điểm chính xác tìm ra người chiến thắng:
     - **0.0s – 0.2s (200ms)**: Khởi động vòng đấu.
     - **0.2s – 4.0s (3.8s)**: Vòng 1 (Loại bão táp) — Các ô lần lượt biến mất với nhịp điệu đều đặn, đếm lùi về đúng 5 ô sống sót.
     - **4.0s – 5.1s (1.1s)**: Dừng nín thở công bố TOP 5, 5 ô rực sáng viền Cyan kèm âm thanh chấn động dramatic hit và nhịp tim dội.
     - **5.1s – 6.7s (1.6s)**: Vòng 2 — Loại trừ tiếp 2 ô, rút gọn còn đúng 3 ô.
     - **6.7s – 7.9s (1.2s)**: Dừng nín thở công bố TOP 3, 3 ô rực sáng viền vàng Gold bước vào chung kết.
     - **7.9s – 9.9s (2.0s)**: Vòng 3 (Chung kết) — Loại 1 ô đưa về màn đối đầu trực tiếp 1 vs 1 kịch tính, sau đó loại nốt ô áp chót.
     - **10.0s**: Chốt hạ chính xác người may mắn được chọn! Ô chiến thắng tỏa sáng vương miện 👑, nổ pháo hoa rực rỡ và phát nhạc chiến thắng ăn mừng.

2. **Tương Thích Mọi Sĩ Số Lớp Học**:
   - Thuật toán phân bổ tự động điều chỉnh linh hoạt cho cả lớp đông (> 5 học sinh) lẫn lớp nhỏ (2–5 học sinh), luôn bảo đảm tổng thời lượng đạt mốc chuẩn xấp xỉ 10 giây.
   - Đồng bộ thời gian nổ pháo hoa và kết thúc trạng thái quay trên cả màn hình máy chiếu (`RandomPickerProjectorWindow`) và giao diện giáo viên (`RandomPickerTab`).

## [2.0.71] - 2026-10-15

### Đua Bi Rơi Pinball (`marble_race`): Gia Tốc Trượt Máng Kịch Tính & Giữ Trọn Màn Hình Kết Thúc Vinh Danh Quán Quân

1. **Gia Tốc Máng Trượt Tốc Độ Cao & Tăng Tính Gay Cấn Bất Ngờ (Ramp Slide Boost)**:
   - **Khắc phục triệt để hiện tượng hãm tốc độ:** Trước đây va chạm tường nhân hệ số hãm $0.95$ qua mỗi khung hình khiến các viên bi khi lăn trên máng trượt bị giảm tốc độ nghiêm trọng và bò chậm chạp.
   - **Tách cơ chế vật lý máng trượt:** Nhận diện riêng máng trượt nghiêng (Slanted Ramp), loại bỏ triệt để hệ số cản, đồng thời truyền vector gia tốc trượt dốc $+0.58$ dọc theo độ nghiêng máng.
   - **Tối ưu hình học máng trượt và bổ sung nấm nảy phản hồi:**
     * *Bản đồ 2 (Hẻm Núi Bánh Răng) Chặng 1:* Tăng độ dốc 3 máng Slalom đan chéo từ $\Delta y = 110\text{px}$ lên $180\text{px}$, bổ sung $3$ nấm nảy lò xo phản hồi tại mép rơi của mỗi máng và các cọc đinh kim cương phân tách luồng bi.
     * *Bản đồ 1 (Vương Quốc Pinball) Chặng 6:* Tăng độ dốc máng zíc-zắc từ $150\text{px}$ lên $200\text{px}$, bổ sung $2$ nấm nảy lò xo tại 2 góc cua hất bi sang máng kế tiếp với gia tốc cực lớn.
     * Nâng ngưỡng vận tốc tối đa lên $9.2\text{px/frame}$, tạo cảm giác lao vùn vụt, va đập nảy lửa và tạo bất ngờ lật kèo liên tục.

2. **Giữ Nguyên Màn Hình Kết Thúc & Khóa Camera Tại Vạch Đích (No Start Screen Reset)**:
   - **Khắc phục lỗi nhảy về màn hình khởi động:** Trước đây khi viên bi đầu tiên cán đích, hàm hoàn tất cập nhật `selectedStudent`, làm kích hoạt hook `useEffect` khởi tạo lại toàn bộ bi và reset camera về $0$, đồng thời bật lại màn hình "Sẵn sàng mở cổng thả bi".
   - **Cố định chu kỳ đua:** Dùng `prevIsPickingRef` đảm bảo chỉ khởi tạo lại bi khi bắt đầu cuộc đua mới; mọi thay đổi `selectedStudent` sau khi cán đích không làm xáo trộn đường đua.
   - **Khóa camera tại vạch đích:** Khi đã có quán quân, camera dừng cố định tại vạch đích vinh danh người về nhất, không bị trôi ngược lên theo các viên bi đi sau.
   - **Giao diện vinh danh hoành tráng:** Giữ cố định Banner Quán Quân Vương Miện `👑` trên đường đua và hiển thị nút bấm `🏁 ĐUA VÒNG MỚI (BẢN ĐỒ NGẪU NHIÊN)` để sẵn sàng cho lượt tiếp theo.

## [2.0.70] - 2026-10-14

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 6: Kiểm Thử Toàn Diện, Nghiệm Thu & Hoàn Thiện (Verification & Polish)

1. **Bộ Kiểm Thử REST API Quản Lý Nhóm & Chia Nhóm Đều (`class-groups-routes.test.ts`)**:
   - Kiểm thử tạo nhóm riêng lẻ (`POST /api/classes/:classId/groups`).
   - Kiểm thử thuật toán xáo trộn Fisher-Yates và chia đều học sinh vào $N$ nhóm (`POST /api/classes/:classId/groups/randomize`), xác minh tính chất chênh lệch sĩ số giữa các nhóm tối đa 1 thành viên ($\max - \min \le 1$).
   - Kiểm thử chỉ định nhóm trưởng (`PUT /api/groups/:groupId/leader`).
   - Kiểm thử di chuyển học sinh giữa các nhóm (`PUT /api/students/:studentId/group`).
   - Kiểm thử rào chắn bảo vệ quyền sở hữu giáo viên (Cross-teacher access guard), từ chối truy cập 403 đối với giáo viên khác lớp.

2. **Bộ Kiểm Thử Xuất File Bảng Điểm Dự Án (`excel-service.test.ts`)**:
   - Kiểm thử xuất buffer `.xlsx` bảng điểm dự án đa chiều `exportProjectGradingBuffer`.
   - Kiểm thử cấu trúc 10 cột, tiêu đề trọng số, thông tin lớp học, điểm tổng kết và nhận xét đóng góp.

3. **Bộ Kiểm Thử Hoạt Động & Giao Diện (@educlass/activity-project-grading)**:
   - `project-grading.test.ts`: FSM máy trạng thái, 4 chiều chấm điểm, tính điểm tổng kết có trọng số, cấp thưởng EXP.
   - `project-grading-views.test.tsx`: Bảng điều khiển giáo viên, 4 đồng hồ tiến độ nộp bài, lưu điểm nhóm, khóa chấm, máy chiếu và bảng vàng vinh danh.
   - `project-grading-student-view.test.tsx`: Màn hình học sinh tự chấm, 3 tab nhóm trưởng, và luồng kiosk đổi người trên thiết bị chung.
   - **Kết quả: 24/24 unit test vượt qua 100%**.

4. **Kiểm Tra Typecheck & Tiêu Chuẩn Giao Diện (DoD)**:
   - `pnpm run typecheck` (`tsc -b`) đạt 100% xanh toàn bộ 19 package/ứng dụng trong monorepo.
   - Tuân thủ nghiêm ngặt quy chuẩn thiết kế di động (viewport $360 \times 640$, vùng chạm $\ge 48$px, không dùng CDN ngoài, chuỗi ngôn ngữ tiếng Việt hoàn toàn).

## [2.0.69] - 2026-10-14

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 5: Màn Hình Giáo Viên, Tổng Kết & Xuất Báo Cáo Excel (Teacher Panel, Projector & Excel)

1. **Bảng Điều Khiển Giáo Viên Thời Gian Thực (`ProjectGradingTeacherPanel.tsx`)**:
   - Tích hợp 4 đồng hồ tiến độ nộp bài thời gian thực: Tự chấm cá nhân, Nhóm trưởng chấm nội bộ, Nhóm trưởng chấm chéo nhóm khác, Giáo viên chấm điểm.
   - Bảng ma trận tổng hợp đa chiều chi tiết theo từng nhóm và từng học sinh: hiển thị 4 cột điểm con, điểm tổng kết tức thời theo trọng số, xếp hạng và ý kiến đóng góp/nhận xét.
   - Bộ công cụ Giáo viên chấm điểm (Teacher Grading Hub):
     * Nhập nhanh điểm nhóm dự án (tự động áp dụng làm điểm mặc định cho mọi thành viên nhóm).
     * Nhập điểm ghi đè (override) riêng biệt cho từng cá nhân khi học sinh có mức độ đóng góp khác nhau.
   - Nút bật/tắt chốt điểm nhanh (`[Khóa chấm / Chốt điểm]`) chuyển trạng thái sang `frozen` hoặc `grading`.
   - Nút kích hoạt chế độ Máy chiếu lớp học (`[📽️ Chế độ Máy chiếu]`).
   - Nút kết thúc hoạt động trao thưởng kinh nghiệm và vinh danh.

2. **Màn Hình Chiếu Lớp Học Vinh Danh (`ProjectGradingProjectorView.tsx`)**:
   - Thiết kế giao diện tối chuẩn tỷ lệ 16:9 với font chữ lớn và tương phản cao, tối ưu hiển thị trên màn chiếu / tivi lớp học.
   - 2 chế độ hiển thị linh hoạt:
     * **Ma trận tiến độ (Matrix View):** Quan sát trực quan trạng thái nộp bài của từng nhóm và từng thành viên.
     * **Bục vinh danh (Podium View):** Bục trao giải Top 1 (Vàng), Top 2 (Bạc), Top 3 (Đồng) kèm hiệu ứng cúp huy chương và bảng xếp hạng đầy đủ cả lớp.

3. **Xuất Báo Cáo Bảng Điểm Excel / CSV Đa Chiều**:
   - Server-side: `exportProjectGradingBuffer` trong `packages/server/src/services/excel-service.ts` xuất file `.xlsx` chuyên nghiệp với tiêu đề trọng số cấu hình, 10 cột dữ liệu (STT, Họ tên, Nhóm, Vai trò, 4 cột điểm con, Điểm tổng kết, Xếp loại, Nhận xét) và độ rộng cột tự động.
   - Client-side: Tích hợp nút xuất tải trực tiếp file CSV mã hóa UTF-8 BOM (`\uFEFF`) ngay tại Teacher Panel, hỗ trợ mở ngay lập tức trên Microsoft Excel mọi phiên bản mà không lỗi font chữ tiếng Việt.

4. **Tích Hợp Vào Bảng Điều Khiển Giáo Viên (`ActivityPanel.tsx`)**:
   - Thêm nút **`👥 Lấy nhóm từ Lớp học`** trong modal khởi tạo: tự động kết nối API `/api/classes/:classId/groups` nạp cấu trúc nhóm và nhóm trưởng sẵn có từ lớp học; fallback chia đều học sinh khi phiên học tự do.
   - Bộ cấu hình trực quan: Tên dự án, Thang điểm tùy chọn ($1..100$), và 4 thanh/ô nhập trọng số % ($W_1, W_2, W_3, W_4$).
   - Đăng ký plugin `ProjectGradingTeacherPanel` và plugin `@educlass/activity-project-grading` vào `teacherPanelRegistry` và danh mục hoạt động giáo viên.
   - Viết bộ unit test `project-grading-views.test.tsx` kiểm thử toàn diện Teacher Panel và Projector View.

## [2.0.68] - 2026-10-14

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 4: Giao Diện Học Sinh & Cơ Chế Đổi Học Sinh (Student UI & Kiosk Mode)

1. **Giao Diện Học Sinh Chấm Điểm Dự Án (`ProjectGradingStudentView.tsx`)**:
   - Tối ưu hóa chuẩn mobile-first (viewport $360 \times 640$, vùng chạm tối thiểu $\ge 48$px, màu đi kèm hình khối, thông báo tiếng Việt thân thiện).
   - Phân định giao diện trực quan theo vai trò người học:
     * **Thành viên bình thường:** Form tự đánh giá cá nhân (Cột 1) với bộ nhập số trực tiếp kèm nút bước nhảy $(\pm 0.5)$, dải nút chọn nhanh điểm ($7..10$đ), ô tự nhận xét phần việc đóng góp, nút lưu điểm $\ge 48$px.
     * **Nhóm trưởng (⭐):** 3 Tab chuyển đổi mượt mà kèm huy hiệu tiến độ thời gian thực:
       - `👤 Tự chấm`: Tự chấm điểm cá nhân của nhóm trưởng.
       - `👥 Thành viên`: Danh sách các thành viên trong nhóm kèm ô chấm điểm và nhận xét cho từng bạn.
       - `🔄 Nhóm bạn`: Danh sách các nhóm khác trong lớp kèm ô chấm chéo sản phẩm và thuyết trình nhóm bạn.
   - Xử lý trạng thái khóa chấm (`frozen`) và xử lý an toàn khi học sinh chưa phân nhóm.

2. **Cơ Chế Đổi Học Sinh Trên Cùng Thiết Bị (Kiosk / Shared Device Mode)**:
   - Nút nổi bật **`[🔁 Hoàn thành & Đổi học sinh khác]`** hiển thị sau khi hoàn thành hoặc luôn có sẵn ở chân trang.
   - Hộp thoại Modal xác nhận bảo đảm học sinh không vô tình bấm nhầm.
   - Khi xác nhận: Tự động xóa token phiên `educlass_participant_token`, giữ nguyên mã lớp `joinCode`, kích hoạt sự kiện `educlass:switch-student` đưa ngay về danh sách chọn tên học sinh (roster picker) mà không cần quét lại mã QR hay nhập lại mã phòng 6 ký tự.
   - Tích hợp và đăng ký `ProjectGradingStudentView` vào `ActivityHost.tsx` của `apps/student-ui`.
   - Viết trọn bộ unit test `project-grading-student-view.test.tsx`.

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 3: Module Hoạt Động Chấm Điểm Dự Án (`@educlass/activity-project-grading`)

1. **Khởi tạo Activity Package (`packages/activities/project-grading`)**:
   - Khởi tạo package tuân thủ chuẩn plugin Activity của EduClass v2: `package.json`, `tsconfig.json` tích hợp composite build và project references.
   - Kết nối package vào cấu hình monorepo `pnpm-workspace.yaml`, root `tsconfig.json`, `packages/server/package.json` và `packages/server/tsconfig.json`.
   - Đăng ký `ProjectGradingActivity` trực tiếp vào `defaultActivityRegistry` tại `packages/server/src/activity/registry.ts`.

2. **Hạt Nhân Tính Toán & Xếp Hạng Đa Chiều (`project-grading-logic.ts`)**:
   - Xây dựng thuật toán tính điểm tổng kết $\text{FinalScore} = \frac{\sum S_i \times W_i}{\sum W_i}$ chuẩn hóa theo trọng số cấu hình ($W_1$ Tự chấm, $W_2$ Tổ chấm thành viên, $W_3$ Chéo nhóm, $W_4$ Giáo viên).
   - Xử lý linh hoạt trường hợp thiếu cột điểm hoặc nhóm trưởng tự đánh giá.
   - Tính toán xếp hạng (Rank 1, 2, 3...) theo điểm tổng kết và tự động thu thập toàn bộ phản hồi, nhận xét của các chiều đánh giá.
   - Thống kê tiến độ chấm điểm thời gian thực `calculateGradingProgress` phục vụ màn hình giáo viên và máy chiếu.

3. **State Machine & Intent Handlers Server (`project-grading-activity.ts`)**:
   - `onStart`: Khởi tạo state chấm tự do song song với cấu hình trọng số và danh sách nhóm tham gia.
   - `onStudentIntent`:
     * Nhánh `submit_self_grade`: Học sinh tự chấm điểm cá nhân (thang $0..10$, bước nhảy $0.1$), tặng thưởng EXP chuyên cần (`participation`).
     * Nhánh `submit_team_member_grade`: Chỉ nhóm trưởng mới được chấm điểm thành viên trong nhóm mình, bảo vệ an toàn phân quyền (`NOT_A_LEADER`, `STUDENT_NOT_IN_GROUP`).
     * Nhánh `submit_cross_team_grade`: Nhóm trưởng chấm chéo các nhóm bạn, ngăn chặn tự chấm chéo nhóm mình (`CANNOT_GRADE_OWN_GROUP`).
     * Kiểm tra trạng thái khóa chấm (`GRADING_LOCKED`) và thang điểm hợp lệ.
   - `onTeacherIntent`:
     * Nhánh `submit_teacher_grade`: Giáo viên chấm điểm cho cả nhóm hoặc chấm điểm riêng cho từng học sinh.
     * Nhánh `set_grading_status`: Giáo viên khóa (`frozen`) hoặc mở lại lượt chấm (`grading`).
   - `onEnd`: Tổng kết điểm, xếp hạng và trao thưởng EXP (`finish` 10 EXP, `top3` lần lượt 15, 10, 5 EXP).
   - Viết trọn bộ unit test `project-grading.test.ts`.

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 2: Backend REST API & Teacher UI

1. **Backend REST API cho Nhóm Lớp học (`packages/server`)**:
   - Xây dựng router `packages/server/src/routes/class-groups.ts` với đầy đủ các endpoint:
     * `GET /api/classes/:classId/groups`: Lấy tổng quan danh sách nhóm, thành viên, nhóm trưởng và học sinh chưa phân nhóm.
     * `POST /api/classes/:classId/groups`: Tạo nhóm mới theo tên tùy chỉnh.
     * `POST /api/classes/:classId/groups/randomize`: Thuật toán chia đều ngẫu nhiên Fisher-Yates toàn bộ học sinh vào $N$ nhóm ($N = 2..30$), hỗ trợ tùy chọn tự động chọn nhóm trưởng và đặt tên nhóm/tổ.
     * `PUT /api/students/:studentId/group`: Di chuyển học sinh sang nhóm mới hoặc đưa về chưa phân nhóm.
     * `PUT /api/groups/:groupId/leader`: Chỉ định hoặc thay đổi nhóm trưởng (⭐).
     * `PATCH /api/groups/:groupId`: Đổi tên nhóm hoặc thứ tự hiển thị.
     * `DELETE /api/groups/:groupId`: Xóa nhóm an toàn (học sinh trong nhóm tự động chuyển về chưa phân nhóm).
   - Đăng ký `classGroupRepo` và `classGroupsRoutes` trong `packages/server/src/app.ts`.
   - Cập nhật DTO học sinh trả về `groupId` trong `packages/server/src/routes/students.ts`.

2. **Giao Diện Quản Lý Nhóm Học Tập Giáo Viên (`apps/teacher-ui`)**:
   - Bổ sung các phương thức gọi API nhóm vào `apps/teacher-ui/src/api/client.ts`.
   - Xây dựng component `ClassGroupsView.tsx`:
     * Bố cục thẻ trực quan (Card Layout) hiển thị các nhóm học tập, số lượng thành viên, huy hiệu nhóm trưởng (⭐).
     * Modal Chia đều ngẫu nhiên: Cho phép tùy chỉnh số nhóm ($2..20$), tiền tố "Nhóm" / "Tổ", tùy chọn tự động chỉ định nhóm trưởng.
     * Tính năng chuyển nhóm mượt mà: Menu dropdown chuyển từng học sinh sang nhóm khác hoặc rời nhóm.
     * Tính năng chỉ định nhóm trưởng trực quan bằng 1 click vào biểu tượng ngôi sao ⭐.
     * Khu vực quản lý học sinh chưa phân nhóm với dropdown phân bổ nhanh vào các nhóm hiện có.
     * CRUD nhóm: Thêm nhóm thủ công, sửa tên nhóm, xóa nhóm an toàn.
   - Tích hợp điều hướng Sub-Tab trong `ClassTab.tsx` giữa "📋 Danh sách học sinh" và "👥 Tổ / Nhóm học tập".

### Chấm Điểm Dự Án Đa Chiều & Quản Lý Nhóm Lớp Học — Giai đoạn 1: Database Schema & Protocol

1. **Database Schema (`packages/db`)**:
   - Thêm bảng `class_groups` (id, classId, name, orderIndex, leaderStudentId, createdAt) để lưu trữ nhóm/tổ học sinh cố định theo lớp.
   - Bổ sung cột `group_id` vào bảng `students` để liên kết học sinh với nhóm.
   - Thêm file migration `0006_class_groups_schema.sql` và cập nhật `EMBEDDED_MIGRATIONS` kèm cơ chế tự phục hồi `ensureSchemaIntegrity` trong `migrator.ts`.
   - Xây dựng `ClassGroupRepository`: CRUD nhóm, gán/đổi nhóm trưởng, chuyển nhóm học sinh, lấy cấu trúc tổng quan kèm thành viên và học sinh chưa phân nhóm.
   - Tích hợp thuật toán chia đều ngẫu nhiên `randomizeGroups` hỗ trợ số nhóm tùy chỉnh ($N = 2..30$) và tự động chỉ định nhóm trưởng.
   - Cập nhật `StudentRepository` hỗ trợ lọc và cập nhật `groupId`.
   - Viết trọn bộ unit test `class-group-repository.test.ts`.

2. **Zod Schemas & DTO Protocol (`packages/protocol`)**:
   - Tạo `class-groups.ts`: các DTO `ClassGroupDto`, `ClassGroupWithMembersDto`, `CreateClassGroupRequest`, `UpdateClassGroupRequest`, `AssignGroupLeaderRequest`, `RandomizeGroupsRequest` (hỗ trợ số lượng nhóm tùy chỉnh).
   - Tạo `project-grading.ts`: cấu hình hoạt động, trọng số 4 cột điểm ($W_1$ Cá nhân, $W_2$ Nội bộ, $W_3$ Chéo, $W_4$ Giáo viên), mô hình trạng thái thời gian thực và các intents chấm tự do.
   - Bổ sung `groupId` vào `StudentDtoSchema` trong `student.ts`.
   - Export đầy đủ trong `packages/protocol/src/index.ts`.


### Đua Bi Rơi Pinball (Marble Race): Bổ Sung Bản Đồ Mới "Hẻm Núi Bánh Răng" & Cơ Chế Chọn Bản Đồ Ngẫu Nhiên

1. **Thêm Bản Đồ Đua Thứ 2: "⚙️ Hẻm Núi Bánh Răng" (Gear Canyon)**:
   - **Chủ đề thị giác Cơ Khí Steampunk:** Tông màu đồng thau, vàng hổ phách và xanh ngọc bích, lưới sàn ánh đồng mờ kết hợp hệ thống tường bao kim loại viền sáng.
   - **Cấu trúc 7 chặng chướng ngại vật hoàn toàn mới lạ so với Map 1:**
     * *Chặng 1:* Máng trượt Slalom đan chéo tốc độ cao kèm cọc gờ nảy phân tách bi.
     * *Chặng 2:* Bộ đôi Bánh răng Khổng lồ song hành (Twin Spinners sải cánh $105$px quay ngược chiều cuốn bi).
     * *Chặng 3:* Rừng đinh Pachinko ma trận Kim Cương đồng thau mở rộng từ tâm ra 2 cánh kèm nấm nảy hông.
     * *Chặng 4:* Bộ ba Tuabin hút lốc xoáy tam giác (Triple Vortex Turbines: 2 xoáy trên, 1 xoáy hút lớn trung tâm).
     * *Chặng 5:* Cầu bập bênh đôi đối xứng ($330$px) dẫn dòng so le.
     * *Chặng 6:* Ma trận nấm nảy Pinball liên hoàn ($8$ nấm nảy cỡ lớn xếp 3 tầng tổ ong kèm cánh quạt quét trung tâm).
     * *Chặng 7:* Phễu cổ chai hướng dòng vào vạch đích vinh quang.

2. **Cơ Chế Chọn Bản Đồ Ngẫu Nhiên (Random Map Selection)**:
   - Tự động bốc ngẫu nhiên một bản đồ (`🔮 Vương Quốc Pinball` hoặc `⚙️ Hẻm Núi Bánh Răng`) mỗi khi mở cuộc đua hoặc mỗi lượt thả bi mới.
   - Bổ sung nút bấm / Badge hiển thị bản đồ trên Header HUD, cho phép xem tên và chủ đề bản đồ, đồng thời có thể click đổi ngẫu nhiên sang bản đồ khác khi đang ở chế độ chờ.
   - Toàn bộ nền lưới, hiệu ứng ánh sáng tường bao, nhãn mốc 7 chặng và cơ chế vật lý chướng ngại vật chuyển đổi mượt mà theo đúng bản đồ đang đua.

## [2.0.66] - 2026-10-13

### Bắn Vịt (Duck Hunt): Giải Quyết Triệt Để Lỗi Bắn Không Chính Xác & Tối Ưu Tỉ Lệ Khung Hình Không Để Trống 4 Phía

1. **Khắc Phục Triệt Để Lỗi "Bắn Không Chính Xác"**:
   - **Nguyên nhân gốc rễ:** 
     - Trước đây hệ thống bốc thăm ngẫu nhiên một học sinh từ danh sách 52 em ở ngoài màn hình, sau đó cố gắng teleport chú vịt đó vào màn hình khiến chú vịt bị dịch chuyển đột ngột và đè chồng lên chú vịt khác đang bơi ở cùng tọa độ.
     - Ngoài ra, tốc độ bơi quá nhanh (120px/s) kết hợp chuỗi ngắm kéo dài 7 giây khiến chú vịt bơi ra khỏi biên màn hình hoặc chạm mép trước khi nổ súng, làm tâm ngắm bị chặn lại ở mép biên và bắn vào khoảng không.
   - **Giải pháp triệt để 100%:**
     - **Nguyên lý tương tác trực quan thực tế:** Khi bấm nút "Bắn ngẫu nhiên", hệ thống quét danh sách các chú vịt **ĐANG THỰC SỰ BƠI RÕ RÀNG TRÊN MÀN HÌNH** và có đường bơi an toàn ở khu vực trung tâm sân khấu.
     - Chọn chú vịt mục tiêu trực tiếp từ các chú vịt đang bơi đó (vẫn tuân thủ đầy đủ chiến lược chọn theo học lực `bias_good` và loại trừ học sinh đã gọi `excludeCalled`).
     - Tốc độ bơi được điều chỉnh êm ái (từ 2.2px/frame giảm xuống 0.95–1.25px/frame), giúp chú vịt thong dong lướt giữa sân khấu.
     - Tâm ngắm lia qua 3–4 chú vịt mồi nhử khác trên màn hình (đọc rõ tên từng bạn kèm âm thanh click), sau đó chuyển hướng khóa chặt vào chú vịt mục tiêu đang bơi, nhấp nháy đỏ và nổ súng ĐOÀNG!
     - Tên chú vịt bị bắn trúng trùng khớp $100\%$ với tên người chiến thắng trên thanh trạng thái, bảng kết quả và modal chấm điểm EXP.

2. **Khắc Phục Triệt Để Hiện Tượng Trống 4 Phía (Trái, Phải, Trên, Dưới)**:
   - **Nguyên nhân để trống:**
     - Trước đây tỷ lệ sân khấu cố định 1000x440 ($2.27 : 1$) quá dẹt so với màn hình 16:9 ($1.77 : 1$). Khi canvas bị giới hạn chiều cao, chiều rộng của nó co lại trong khi thẻ cha rộng 1400–1800px, tạo ra 2 mảng đen khổng lồ ở 2 bên.
     - Ở chế độ Toàn màn hình (`isFullscreen`), thuộc tính `justify-between` đẩy header lên đỉnh và nút bấm xuống đáy, tạo ra 2 khoảng trống tím đen mênh mông ở trên và dưới.
   - **Giải pháp tính toán kích thước thông minh:**
     - Tăng kích thước logic của sân khấu lên **1100 x 560** (tỷ lệ $1.96 : 1$, tiệm cận tỷ lệ màn hình máy tính và máy chiếu chuẩn), giúp các hàng vịt cao ráo, thoáng mát và rèm đỏ bao phủ trọn vẹn.
     - Tính toán chiều rộng khung trường bắn theo công thức tự động: `width: min(96vw, calc((100vh - 120px) * 1.964))`, đảm bảo Canvas và thanh Header luôn có **cùng chiều rộng $100\%$**, loại bỏ hoàn toàn 2 dải đen thừa ở hai bên.
     - Chuyển layout sang `justify-center` gom cụm hợp lý, ẩn tiêu đề mô tả dài dòng khi Fullscreen, đưa trường bắn thành tâm điểm hoành tráng chiếm $\approx 80\%$ chiều cao màn hình, nút bấm nằm ngay sát dưới sân khấu.
     - **Triệt tiêu hoàn toàn 4 khoảng trống, giao diện phủ kín đầy đặn và rực rỡ như một game thùng hội chợ thực thụ.**

## [2.0.65] - 2026-10-13

### Đồng Bộ Chuẩn Xác Người Về Nhất Thực Tế & Tối Giản Đồ Họa Đua Bi Pinball (`marble_race`)

1. **Hiển Thị Đúng Tên Người Về Nhất Thực Tế (Physical Winner Synchronization)**:
   - **Nguyên nhân lệch tên:** Trước đó khi bấm thả bi, hệ thống chọn trước học sinh mục tiêu (`target`) đưa vào state `selectedStudent`. Trong quá trình đua, nếu một viên bi khác vượt lên và chạm đích đầu tiên trong mô phỏng vật lý, giao diện popup vinh danh và modal chấm điểm lại hiển thị theo học sinh mục tiêu cũ thay vì viên bi thực tế vừa cán đích số 1.
   - **Giải pháp triệt để:**
     * Trong `MarbleRaceMode.tsx`, khi viên bi đầu tiên cán vạch đích thực tế ($y \ge 4780$px), lưu trữ trạng thái `actualWinner = winner.student` và gửi trực tiếp học sinh này qua callback `onMarbleRaceComplete(winner.student)`.
     * Banner vinh danh trên đường đua hiển thị chính xác $100\%$ tên `actualWinner.name`.
     * Cả `RandomPickerTab` và màn chiếu `RandomPickerProjectorWindow` lập tức cập nhật `setSelectedStudent(winnerStudent)` theo đúng viên bi cán đích thực tế, đảm bảo bảng kết quả chấm điểm `ResultModal` luôn khớp tuyệt đối với viên bi chiến thắng mà cả lớp nhìn thấy.

2. **Tối Giản Đồ Họa Quả Banh (Flat & Clean Visuals)**:
   - **Bỏ hoàn toàn hiệu ứng bóng đổ theo sau quả banh (Trail):** Loại bỏ vệt mờ đuôi chuyển động, loại bỏ bóng elip dưới đáy bi.
   - **Bỏ hiệu ứng ánh sáng chói/bóng đổ 3D (No Radial Highlights):** Thay thế chuyển sắc 3D chói sáng bằng màu đơn sắc phẳng (Solid Color), viền trắng $2.5$px phân cách sắc nét và chữ in tên học sinh đậm nét tương phản cao, giúp tên học sinh cực kỳ dễ nhìn và không gây rối mắt khi lăn qua chướng ngại vật.


### Chế Độ Bắn Vịt (Duck Hunt): Đồng Bộ Tuyệt Đối Học Sinh Được Chọn & Mở Rộng Toàn Màn Hình Khổ Lớn

1. **Khắc Phục Lỗi Lệch Tên Giữa Bảng Thông Báo Và Tâm Ngắm Dưới Sân Khấu**:
   - **Nguyên nhân:** Trước đây hệ thống tự động hoán đổi (swap) học sinh giữa chú vịt đang bơi và chú vịt của người được chọn nếu chú vịt của học sinh đó chưa nằm trong vùng an toàn, dẫn đến tình trạng trên bảng hiển thị một học sinh trong khi tâm ngắm dưới sân khấu lại lia vào và bắn chú vịt mang tên học sinh khác.
   - **Giải pháp:**
     - Loại bỏ hoàn toàn cơ chế hoán đổi vịt (swap) dễ gây nhầm lẫn. Chú vịt mục tiêu (`targetDuck`) bắt buộc 100% phải là con vịt mang tên chính xác của học sinh được chọn (`selectedStudent`).
     - Tự động hồi sinh chú vịt nếu đã bị bắn ở lượt trước, đảm bảo thẻ tên luôn khớp tuyệt đối.
     - Tự động đưa tọa độ chú vịt mục tiêu vào cung bơi an toàn ở vùng trung tâm sân khấu (180–240px khi bơi sang phải, 760–820px khi bơi sang trái), giúp chú vịt thong thả bơi qua giữa màn hình và được tâm ngắm khóa trúng 100%.
     - Chuỗi ngắm bắn gồm 3–5 chú vịt mồi nhử lướt qua để tạo kịch tính, sau đó khóa cứng vào đúng chú vịt mục tiêu, nổ súng và hiển thị tên người chiến thắng đồng bộ tuyệt đối trên toàn bộ giao diện.

2. **Mở Rộng Kích Thước Trường Bắn Khổ Lớn & Bung Toàn Màn Hình**:
   - Gỡ bỏ hoàn toàn giới hạn cố định `max-w-[1000px]`.
   - Ở chế độ bình thường: Khung trường bắn mở rộng lên `max-w-[min(1400px,96vw)]`, chiếm trọn vẹn không gian hiển thị của máy tính giáo viên.
   - Ở chế độ Toàn màn hình (`isFullscreen`) và Màn hình Máy chiếu (`ProjectorWindow`): Khung trường bắn bung cực đại `max-w-[min(1800px,96vw)]` với chiều cao `max-h-[78vh]`, canvas PixiJS tự động co giãn to tràn viền theo đúng tỷ lệ 1000/440, hiển thị cực kỳ hoành tráng, rõ nét trên mọi màn hình Full HD, 2K và máy chiếu.

## [2.0.63] - 2026-10-13

### Tối Ưu Kích Thước Ô & Tự Động Co Giãn Cỡ Chữ Cho Chế Độ Đấu Trường Sinh Tồn (Elimination Grid)

1. **Khắc Phục Hiện Tượng Tên Bị Cắt Dấu Ba Chấm ("...")**:
   - **Nguyên nhân:** Trước đây khi số lượng học sinh lớn (40–55 học sinh) hoặc màn hình có độ phân giải nhỏ, các ô bị chia thành quá nhiều cột (12–14 cột) khiến chiều rộng mỗi ô chỉ còn 60–70px, trong khi font chữ cố định `text-lg`/`text-xl` khiến các tên có từ 4–7 ký tự (như *Khánh*, *Khang*, *Dương*, *Nguyên*, *Phương*, *K'Dương*, v.v.) bị tràn viền và Tailwind tự động cắt thành `Kh...`, `Du...`, `K'...`.
   - **Giải pháp:**
     - Tự động tính toán cỡ chữ chính xác theo từng tên học sinh (`getStudentFontSizePx(name, cellW, cellH)`): tên ngắn (2–3 chữ cái như *An*, *Na*, *Đạt*) phóng to tối đa 26–30px; tên dài (5–7 chữ cái) tự động thu về 13–18px vừa khít tuyệt đối với chiều ngang ô.
     - Loại bỏ thuộc tính `truncate` cắt chữ, thay bằng căn giữa không xuống dòng (`whitespace-nowrap overflow-hidden text-center`), bảo đảm **100% học sinh hiển thị đầy đủ tên, không bao giờ bị cắt thành dấu ba chấm**.
     - Hỗ trợ chuẩn xác các tên có tiền tố dân tộc thiểu số (như *K'*, *H'*).

2. **Cân Bằng Tỷ Lệ Gần Vuông Thông Minh Cho Màn Hình Nhỏ**:
   - Điều chỉnh thuật toán phân bổ cột/hàng: ưu tiên tỷ lệ gần vuông chuẩn nằm ngang (aspect ratio $1.15$ đến $1.38$ lần chiều cao), không để ô bị biến dạng thành hình chữ nhật đứng (cao hơn rộng).
   - Tăng diện tích chiều ngang khả dụng lên hơn 30%, giúp các tên tiếng Việt có độ dài thông thường dễ dàng hiển thị trọn vẹn mà vẫn giữ nguyên bố cục bàn cờ gọn gàng, không bị tràn màn hình hay sinh thanh cuộn dọc.

## [2.0.62] - 2026-10-13

### Nâng Cấp Báo Cáo & Quản Lý Kỳ Thi Theo Ca: Cập Nhật Tiến Độ Thời Gian Thực, Lưu Học Sinh Tự Do & Chống Nhấp Nháy

1. **Sửa Lỗi Không Nhập Lại Được Tiêu Đề Khi Xóa Trắng (`CreateExamModal.tsx`)**:
   - **Nguyên nhân:** Khắc phục lỗi `useEffect` tự động điền lại tiêu đề của bộ đề mỗi khi ô tiêu đề bị xóa trắng (`title === ''`).
   - **Giải pháp:** Sử dụng cờ khởi tạo `isInitializedRef` để chỉ điền tiêu đề mặc định đúng 1 lần khi nạp bộ đề; loại bỏ `title` và `subject` khỏi dependencies của `useEffect`, giúp thầy/cô thoải mái xóa trắng và nhập tiêu đề mới.

2. **Khắc Phục Hiện Tượng Nhấp Nháy & Tải Lại Liên Tục Khi Xem Bảng Điểm (`ExamReportDetailModal.tsx`)**:
   - Khắc phục lỗi dependency `onClose` và `onShowToast` bị thay đổi reference giữa các lần render của component cha khiến modal liên tục gọi lại `fetchDetail(false)` và nhảy về spinner toàn màn hình.
   - Ổn định callback bằng React refs; điều chỉnh điều kiện hiển thị spinner: chỉ hiển thị biểu tượng tải dữ liệu toàn màn hình khi chưa có dữ liệu bài thi (`isLoading && !exam`). Khi đã có dữ liệu, các chu kỳ làm mới sẽ cập nhật ngầm tại chỗ (silent update), giữ nguyên bảng điểm liên tục, hoàn toàn không giật hay tải lại màn hình.

3. **Hỗ Trợ Toàn Diện Học Sinh Tự Do Trong Báo Cáo Kỳ Thi & Cảnh Báo Thông Minh**:
   - **Cơ chế lưu học sinh tự do:** Tại máy chủ (`packages/server/src/activity/engine.ts` & `exams.ts`), hỗ trợ tự động đối chiếu danh sách lớp theo cả `session.classId` lẫn `exam.classId`. Nếu học sinh vào bằng tên tự do không thuộc danh sách lớp, hệ thống tự động gán `studentId = participant.id`, bảo đảm **100% học sinh tự do đều được lưu đầy đủ bài làm, điểm số và câu trả lời vào CSDL**, không bao giờ bị bỏ sót.
   - **Cảnh báo trực quan trên giao diện (`CreateExamModal.tsx`):** Khi giáo viên đang ở *Phiên tự do* mà tạo kỳ thi theo lớp, hệ thống hiển thị banner cảnh báo thông minh: thông báo học sinh tự do vẫn sẽ được lưu kết quả vào báo cáo, đồng thời hướng dẫn giáo viên nên tạo phiên học theo đúng lớp nếu muốn học sinh đăng nhập đúng tài khoản và mã lớp chính thức.

4. **Tự Động Cập Nhật Tiến Độ Trực Tiếp Trên Tab Quản Lý Kỳ Thi (`ExamReportsTab.tsx`)**:
   - Bổ sung cơ chế nạp ngầm danh sách kỳ thi tự động (chu kỳ 4s khi có ca đang thi và 10s khi chờ ca), giúp thanh tiến độ %, số học sinh đang làm bài và số bài đã nộp tự động nhảy số theo thời gian thực mà giáo viên không cần phải chuyển đổi qua lại giữa các tab.



### Khắc Phục Triệt Để Lỗi Báo Người Được Chọn Trước Khi Viên Bi Về Đích Trong Đua Bi Pinball

1. **Chuyển Đổi Sang Cơ Chế Báo Kết Quả Sự Kiện (Event-Driven Completion)**:
   - **Nguyên nhân cốt lõi:** Trước đây hệ thống sử dụng bộ hẹn giờ mù (`setTimeout` cố định) ở component cha `RandomPickerTab` và `RandomPickerProjectorWindow`. Khi đường đua được mở rộng lên 5000px với 7 chặng, thời gian rơi thực tế phụ thuộc vào va chạm vật lý nên bộ hẹn giờ hết trước khi viên bi kịp rơi tới đích, dẫn đến popup kết quả bật lên khi bi còn đang ở lưng chừng đường đua.
   - **Giải pháp triệt để:**
     * Loại bỏ 100% các bộ hẹn giờ mù cố định trong `RandomPickerTab` và `RandomPickerProjectorWindow`.
     * Bổ sung callback `onMarbleRaceComplete` trong `RandomPickerModeProps`.
     * Trong `MarbleRaceMode.tsx`, chỉ khi viên bi mục tiêu **chạm mốc vạch đích vật lý thực tế** ($y \ge 4780$px) trong vòng lặp Render 60 FPS, hệ thống mới phát hiệu ứng pháo hoa, xướng tên vinh danh và gọi `onMarbleRaceComplete`.
     * Sau khi bi chạm vạch đích, hệ thống giữ camera quan sát viên bi đội vương miện thêm $2.2$ giây rồi mới mở `ResultModal` để thầy cô chấm điểm.

2. **Khắc Phục Lỗi Bị Kẹt Lốc Xoáy Ở Chặng 2**:
   - Tinh chỉnh hàm `applyVortexPhysics` để luôn có lực đẩy trôi xuống dưới ($+0.18$px/frame), bảo đảm bi xoay lốc cuốn 1-2 vòng đẹp mắt rồi trôi mượt mà xuống các chặng tiếp theo, không bao giờ bị lực hút kéo ngược lên trên.


### Tẩy Vùng Đa Năng & Cố Định Tuyệt Đối Nét Vẽ Khi Thêm Khoảng Trống Sửa Bài PDF/Word (`pdf-presenter`)

1. **Nút Thu Gọn / Mở Rộng Thanh Công Cụ Chỗ Sửa Bài (`SinglePageCanvas`)**:
   - Thêm nút thu gọn `▲ Ẩn` và hỗ trợ click vào tiêu đề `✂️ Chỗ #1: ▲` để gập gọn thanh điều khiển.
   - Khi thu gọn, thanh co lại thành một nút/badge nhỏ xíu `✂️ Chỗ #1 (260px) ▾` nép sát lề phải, hoàn toàn không che đề bài và nét vẽ chữ viết bên dưới.
   - Click vào nút thu gọn sẽ bung mở lại toàn bộ các công cụ `+60px`, `-60px`, đổi kiểu ô ly/dòng kẻ/trắng và nút xóa.

2. **Công Cụ Tẩy Chọn Vùng (Area / Box Eraser)**:
   - Thêm chế độ tẩy chọn vùng trực quan: Giáo viên chỉ cần kéo chuột quét một vùng hình chữ nhật (hiển thị khung viền đỏ nét đứt mờ trực quan) để xóa đồng thời toàn bộ chữ viết thường và vệt dạ quang (highlighter) nằm trong hoặc chạm vào vùng đó.
   - Hỗ trợ cả thao tác click nhẹ (xóa theo điểm bán kính 20px) và kéo chọn diện rộng.
   - Thêm intent `remove_strokes` trong schema giao thức và `PdfPresenterActivity` để loại bỏ hoàn toàn các nét đã chọn khỏi state.

2. **Cố Định Nét Vẽ Tuyệt Đối Khi Thêm Chỗ Sửa Bài & Bấm +60px**:
   - Khắc phục triệt để hiện tượng nét vẽ bị trôi tụt xuống dưới khi chèn khoảng trống mới hoặc bấm nút `+60px` mở rộng chỗ sửa bài.
   - Chuyển đổi hệ tọa độ điểm nét vẽ (`y`) sang pixel Y logic cố định (`rawY`) thay vì tỉ lệ tương đối $0..1$ của chiều cao canvas (vốn tăng lên khi chèn khoảng trống).
   - Nâng cấp bộ kết xuất canvas (`canvas-gap-engine.ts` và `pdf-presenter.js` trên cổng học sinh) hỗ trợ hàm `getPointY` tương thích cả dữ liệu cũ và dữ liệu mới: Nét vẽ giữ nguyên vị trí pixel tuyệt đối, bất biến khi khoảng trống sửa bài được thêm hoặc dãn rộng.

3. **Đóng Gói Phiên Bản Portable Mới**:
   - Đóng gói thành công file thực thi di động: `EduClass v2 Portable 2.0.0.exe` tại thư mục gốc `E:\educlassv2\`.

## [2.0.59] - 2026-10-13

### Hỏi Nơi Lưu Bài Khi Mở Thu Bài & Bảng Lựa Chọn Hoạt Động Song Song Cho Học Sinh

1. **Hỏi Vị Trí Lưu Bài & Tự Động Đánh Số Thứ Tự Khi Trùng Thư Mục (`packages/server` & `apps/teacher-ui`)**:
   - Khi giáo viên mở tính năng Thu - phát bài (`assignment-hub`), khối cấu hình **"📁 Nơi lưu bài nộp của học sinh trên máy tính"** được đưa lên vị trí trang trọng hàng đầu trong modal cấu hình.
   - Tự động điền sẵn đường dẫn lưu bài mặc định trên Desktop (`Desktop/EduClass_BaiNop_<Ngay>`) kèm nút "📂 Chọn thư mục khác" và "Desktop".
   - Tích hợp hàm giải quyết xung đột thư mục thông minh `resolveUniqueSubmissionDirectory`: Nếu thư mục đã tồn tại trên ổ cứng máy tính, hệ thống tự động đánh thêm số thứ tự tiếp theo `(1), (2), (3)...` (ví dụ `EduClass_BaiNop_2026-10-13 (1)`).
   - Bổ sung endpoint `POST /api/system/resolve-target-dir` và nâng cấp endpoint `POST /api/system/select-folder` (hộp thoại Windows `FolderBrowserDialog`): Tự động phát hiện trùng lặp, thêm số thứ tự và gắn cờ cảnh báo màu cam nổi bật trên giao diện giáo viên.

2. **Bảng Chọn Hoạt Động Song Song Cho Học Sinh (Kỳ Thi & Thu - Phát Bài Tập) (`packages/server/public/student/`)**:
   - Khắc phục triệt để hiện tượng học sinh mới vào lớp bị tự động ép vào Kỳ thi khi đang có nhiều hoạt động chạy cùng lúc.
   - Khi có từ 2 hoạt động song song trở lên (Kỳ thi trắc nghiệm và Thu - phát bài tập thực hành):
     * Cổng học sinh hiển thị bảng lựa chọn trực quan lớn (`#activity-chooser-box`) với 2 thẻ lựa chọn: **📝 Kỳ thi trắc nghiệm** và **📁 Thu - phát bài tập**. Học sinh được toàn quyền quyết định tham gia hoạt động nào trước.
     * Khi học sinh đang làm bài thi: Hiển thị thanh thông báo song song kèm nút **"📁 Chuyển sang Nộp bài thực hành"** và nút **"🔄 Đổi hoạt động"** ở góc trên. Học sinh có thể nộp bài thực hành trước mà không bị mất tiến trình bài thi.
     * Khi học sinh đang ở màn hình Thu - phát bài: Hiển thị nút **"📝 Quay lại Kỳ thi trắc nghiệm"** (hoặc **"📊 Xem kết quả thi"** nếu đã nộp bài thi) và nút **"🔄 Đổi hoạt động"** để chuyển đổi qua lại mượt mà, linh hoạt.

## [2.0.58] - 2026-10-13

### Nâng Cấp Toàn Diện Đua Bi Rơi Pinball: 7 Chặng Liên Hoàn, Bảng Tổng Sắp & 4 Kịch Bản Đua Kịch Tính

1. **Điều Chỉnh Tốc Độ Rơi & Hiển Thị Tên Học Sinh Rõ Nét**:
   - Giảm trọng lực từ $0.38 \to 0.20$ và giới hạn tốc độ rơi cực đại từ $15 \to 7.2$ px/frame, giúp bi rơi êm ái, kéo dài thời gian cuộc đua (~18 giây) để cả lớp dễ dàng theo dõi.
   - Tăng đường kính viên bi lên $46$px ($r = 23$px) và nâng cỡ chữ tên học sinh lên $12$px bold kèm viền bóng đổ đậm tương phản, hiển thị rõ mồn một từng tên học sinh.

2. **Mở Rộng Đường Đua Lên 7 Chặng (Cao 5000px)**:
   - **Chặng 0**: Cổng xuất phát có khóa xả bi đồng loạt.
   - **Chặng 1**: Rừng đinh cản Pachinko 9 hàng so le.
   - **Chặng 2 [MỚI]**: Phễu lốc xoáy đôi (Twin Vortex Whirlpools) hút và xoay tròn bi chậm rãi trước khi xả ra.
   - **Chặng 3**: Nấm nảy Pinball Bumpers & 3 cánh quạt xoay 4 nan.
   - **Chặng 4 [MỚI]**: Cầu bập bênh liên hoàn (Triple See-Saws) nghiêng qua lại theo trọng lượng bi đè lên.
   - **Chặng 5 [MỚI]**: Ma trận gờ giảm tốc Slalom (Speed Bumps Slalom) lượn lách uốn lượn.
   - **Chặng 6**: 3 máng dốc zíc-zắc dốc dài cao tốc.
   - **Chặng 7**: Phễu cổ chai hội tụ và vạch đích ca-rô mạ vàng.

3. **Màn Hình Linh Hoạt Khi Fullscreen**:
   - Khi ở chế độ toàn màn hình, khung Canvas tự động mở rộng theo chiều cao màn hình thực tế ($720$px - $950$px) thay vì cố định $580$px.

4. **Bảng Tổng Sắp Trực Tiếp (Live Leaderboard Top 5)**:
   - Thêm panel HUD trực tiếp ở góc trên bên phải hiển thị thứ hạng Top 5 học sinh đang dẫn đầu theo thời gian thực (kèm biểu tượng 🥇, 🥈, 🥉, màu bi và khoảng cách đến đích).

5. **Tích Hợp 4 Kịch Bản Cuộc Đua Kịch Tính (Race Scenarios)**:
   - **Kẻ Thống Trị (Wire-to-Wire)**: Viên bi chiến thắng bứt tốc dẫn đầu từ đầu đến cuối.
   - **Hỗn Chiến Phút Chót (Chaos Bottleneck)**: Tốp 5-8 viên bi chen chúc so kè ngang ngửa suốt 6 chặng, chỉ phân định thắng thua ở tích tắc cuối cùng tại cổ chai.
   - **Cú Lội Ngược Dòng (Comeback)**: Ban đầu lẹt đẹt ở nhóm sau, bứt tốc ngoạn mục ở các máng trượt chặng cuối để về nhất.
   - **Song Mã Tranh Hùng (Duel)**: Chọn 1 kình địch (Rival) so kè 1 chọi 1, hoán đổi vị trí liên tục cho tới vạch đích.


### Sửa Lỗi "Không Tìm Thấy Lượt Thu Bài Đang Hoạt Động" Khi Chạy Song Song Cùng Kì Thi

1. **Khắc Phục Lỗi Phân Giải Lượt Chạy Hoạt Động (`packages/server/src/routes/assignments.ts`)**:
   - **Nguyên nhân cốt lõi:** Khi Kì thi và Thu - phát bài tập cùng chạy song song trong một tiết học, phương thức `getActiveRun(sessionId)` trước đây được gọi mà không truyền tham số `activityId`. Theo luật ưu tiên đa nhiệm của máy chủ, nó trả về hoạt động chính (`exam`), dẫn đến kiểm tra `activeState.run.activityId !== 'assignment-hub'` bị sai và trả về mã lỗi 400 *"Không tìm thấy lượt thu bài đang hoạt động"*.
   - **Giải pháp:** Xây dựng hàm `getActiveAssignmentRun(activityEngine, sessionId, runId)` thông minh:
     * Tìm chính xác theo `runId` nếu có và khớp `assignment-hub`.
     * Tìm theo `activityId = 'assignment-hub'` trong phiên làm việc.
     * Quét danh sách toàn bộ các hoạt động chạy song song để lấy đúng lượt chạy `assignment-hub`, hoàn toàn không bị nhầm sang `exam`.
     * Cập nhật đồng bộ cho cả 5 endpoint: nộp bài (`submit`), tải lên tài liệu (`materials`), tải tài liệu (`download`), tải bài nộp học sinh và xem trước Office/PDF (`preview`).

2. **Cập Nhật Giao Diện Học Sinh (`packages/server/public/student/js/assignment.js`)**:
   - Tự động kết xuất lại giao diện nộp bài ngay khi chuyển từ màn hình thi sang màn hình nộp bài thực hành (`renderAssignmentUI`).

3. **Đóng Gói & Phát Hành**:
   - Chạy `vite build` và copy toàn bộ gói `teacher-ui` sang máy chủ.
   - Biên dịch lại file đóng gói máy chủ di động `EduClass v2 Portable 2.0.0.exe`.
   - Kiểm tra `pnpm run typecheck` (`tsc -b`) xanh 100%.

## [2.0.56] - 2026-10-13

### Bổ Sung Chế Độ Đua Bi Rơi Pinball Liên Hoàn (Marble Race) Trong Tiện Ích Quay Ngẫu Nhiên

1. **Ý Tưởng & Trải Nghiệm Lớp Học**:
   - Thêm chế độ quay ngẫu nhiên mới `marble_race` ("⚪ Đua bi rơi Pinball") vào tab **Quay ngẫu nhiên** (`RandomPickerTab`) trên máy Giáo viên.
   - Hoàn toàn độc lập với phiên học online: hoạt động ngoại tuyến (offline 100%), giáo viên chọn lớp hoặc nhập danh sách học sinh và bấm quay bất cứ lúc nào.
   - Mỗi học sinh trong lớp là một viên bi tròn rực rỡ có in tên viết tắt, cùng rơi từ cổng thả bi trên đỉnh qua đường đua cao liên hoàn.

2. **Cấu Trúc Đường Đua Liên Hoàn Đa Chặng (Multi-Stage Gauntlet Track)**:
   - **Chặng 0 (Cổng xuất phát)**: Chốt giữ bi, mở ra khi bấm quay thả toàn bộ các viên bi đồng loạt.
   - **Chặng 1 (Rừng đinh Pachinko / Pegboard)**: 9 hàng đinh so le làm bi nảy tưng bừng ngẫu nhiên, phát tiếng lách cách kim loại giòn tan.
   - **Chặng 2 (Cánh quạt xoay & Nấm bẫy nảy Pinball Bumpers)**: 5 nấm lò xo neon hất văng cực mạnh và 3 cánh quạt 4 nan xoay tròn liên tục tạo đột biến thứ hạng.
   - **Chặng 3 (Máng trượt zíc-zắc dốc)**: 3 dải máng trượt nghiêng dẫn luồng bi bứt tốc ngoạn mục.
   - **Chặng 4 (Phễu cổ chai & Vạch đích)**: Thu hẹp dòng chảy dồn về ống hẹp vạch đích, hiệu ứng Slow-motion + hào quang vinh danh khi viên bi về nhất chạm đích.

3. **Công Nghệ & Tích Hợp**:
   - **HTML5 Canvas 2D + Physics Engine riêng biệt**: Mô phỏng va chạm hạt, đoạn thẳng, đinh tròn và cánh quạt xoay mượt mà 60 FPS, camera cuộn tự động bám theo tốp bi dẫn đầu.
   - **Web Audio API**: Bổ sung âm thanh va đập đinh cản Pachinko (`playMarblePegBounce`), nấm lò xo Bumper (`playPinballBumper`) và còi hiệu mở cổng (`playMarbleDropStart`).
   - **Đồng Bộ Máy Chiếu (Projector View)**: Đồng bộ tức thì sang cửa sổ trình chiếu độc lập của giáo viên qua BroadcastChannel.


### Khắc Phục Triệt Để Lỗi Không Mở Được File PDF & Word Trong Tính Năng Chiếu & Chữa Bài

1. **Khắc Phục Lỗi Mở File PDF (Thiếu Worker Script Offline)**:
   - Nguyên nhân: Trước đây PDF.js v4 không tìm thấy file `pdf.worker.mjs` trên origin cục bộ của ứng dụng, dẫn đến lỗi thất bại khi khởi tạo worker.
   - Giải pháp:
     * Tự động sao chép file `pdf.worker.mjs` vào thư mục tĩnh của giáo viên (`apps/teacher-ui/public/pdf.worker.mjs` và `packages/server/public/teacher/pdf.worker.mjs`).
     * Thêm hàm `ensurePdfWorkerConfigured()` tự động cấu hình `pdfjsLib.GlobalWorkerOptions.workerSrc` chuẩn xác theo origin hiện tại, giúp PDF.js hoạt động hoàn toàn offline 100% trong Electron và trình duyệt.

2. **Khắc Phục Lỗi Mở File Word (.docx) (Lỗi Tainted Canvas SecurityError Trong Chromium)**:
   - Nguyên nhân: Trước đây việc vẽ nội dung HTML sang canvas sử dụng SVG `<foreignObject>`. Trong Chromium/Electron, bất kỳ SVG nào chứa `foreignObject` khi vẽ lên canvas đều khiến canvas bị đánh dấu "tainted" (nhiễm bẩn), làm cho lệnh `canvas.toDataURL()` quăng ngoại lệ bảo mật `SecurityError: Tainted canvases may not be exported` và báo lỗi sai định dạng.
   - Giải pháp:
     * Viết lại hoàn toàn hàm `renderHtmlToCanvas` bằng bộ **Native Canvas 2D HTML Renderer** độc lập.
     * Duyệt qua cấu trúc cây DOM thực tế của tài liệu: tự động ngắt dòng thông minh (`drawWrappedText`), căn lề, vẽ tiêu đề (`H1`, `H2`, `H3`), đoạn văn (`P`), danh sách gạch đầu dòng (`UL`, `OL`, `LI`), bảng biểu (`TABLE`), và hình ảnh nhúng (`IMG`).
     * Loại bỏ 100% việc dùng SVG foreignObject, bảo đảm Canvas luôn sạch sẽ, xuất Data URL Base64 tức thì không bao giờ bị lỗi bảo mật.

3. **Cải Thiện Thông Báo Lỗi Rõ Ràng**:
   - Khi có lỗi phát sinh trong quá trình đọc file, hiển thị chính xác thông điệp lỗi kỹ thuật (`err.message`) thay vì chỉ hiện thông báo chung chung.

4. **Đóng Gói Bản Portable Mới**:
   - Biên dịch và đóng gói thành công [`EduClass v2 Portable 2.0.0.exe`](file:///e:/educlassv2/EduClass%20v2%20Portable%202.0.0.exe) (~102MB) tại thư mục gốc dự án.

## [2.0.54] - 2026-10-13

### Khắc Phục Triệt Để Lệch Học Sinh Ngắm Bắn & Tâm Ngắm Trong Chế Độ Bắn Vịt (Duck Hunt)

1. **Thuật Toán Đón Đầu Động Thời Gian Thực (Dynamic Target Interception)**:
   - Thay thế việc tween tĩnh tới tọa độ cố định bằng cơ chế `animateCrosshairToDuck` nội suy thời gian thực từng frame 60 FPS theo tọa độ thực tế của chú vịt đang bơi.
   - Tâm ngắm đón đầu chính xác và tiếp đất $100\%$ ngay trên tâm thân chú vịt, triệt tiêu hoàn toàn độ lệch vận tốc (trước đó vịt bơi đi 70px - 100px trong lúc tâm ngắm đang bay khiến tâm ngắm rơi vào khoảng trống hoặc con vịt khác phía sau).

2. **Đồng Bộ Hoàn Toàn Thời Điểm Hiển Thị Tên Học Sinh Với Vị Trí Tâm Ngắm**:
   - Chỉ cập nhật nhãn trạng thái ("Đang ngắm: [Tên HS]", phát tiếng tick, vịt giật nảy) khi tâm ngắm **đã đáp trúng đích** lên chú vịt đó, thay vì cập nhật sớm từ lúc bắt đầu bay như trước.
   - Khi tâm ngắm dừng lại quan sát ($0.35s - 0.45s$), cơ chế Ticker tiếp quản giữ tâm ngắm và spotlight dính chặt chính xác vào chú vịt đang bơi.

3. **Cơ Chế Hoán Đổi Học Sinh Nguyên Tử (Atomic Swap) - Loại Bỏ 100% Trùng Lặp Tên**:
   - Nếu chú vịt ban đầu của học sinh trúng giải đang ở ngoài màn hình, hệ thống thực hiện hoán đổi 2 chiều giữa chú vịt đó và chú vịt an toàn ở giữa màn hình.
   - Bảo đảm trên sân khấu mỗi học sinh chỉ có duy nhất 1 chú vịt, không bao giờ có 2 chú vịt trùng tên khiến người dùng nhìn nhầm con vịt ở hàng khác.

4. **Khóa Chặt Mục Tiêu Chốt Hạ Cho Đến Khi Nổ Súng**:
   - Giữ nguyên trạng thái bám đuổi (`trackingDuckRef = targetDuck`) trong suốt thời gian nhấp nháy đỏ báo động khẩn cấp cho đến tận thời điểm nổ súng (ĐOÀNG!).
   - Tâm nổ súng và chùm lông vũ văng ra lấy chính xác từ tọa độ thực tế của chú vịt đích tại thời khắc trúng đạn, không lệch dù chỉ 1 pixel.

## [2.0.53] - 2026-10-13

### Tinh Chỉnh Nâng Cấp Chế Độ Đấu Trường Sinh Tồn (Elimination Grid)

1. **Hiển Thị Tên Kèm Số Thứ Tự (Lược Bỏ Họ & Tên Đệm)**:
   - Tự động bóc tách chỉ lấy tên chính của học sinh (từ cuối cùng trong họ tên), ví dụ "Nguyễn Văn An" hiển thị là `#1` và `An`.
   - Huy hiệu số thứ tự `#1`, `#2` đặt ở góc trên, tên chính nằm ngay trung tâm ô.
   - Khi rê chuột vào ô vẫn có tooltip hiển thị đầy đủ họ tên chuẩn của học sinh.

2. **Giảm Tốc Độ Biến Mất Chậm Rãi & Nghẹt Thở**:
   - Vòng 1: Tăng độ giãn cách giữa các lượt loại lên 240ms – 380ms để cả lớp kịp theo dõi từng ô biến mất và số lượng đếm lùi.
   - Nhịp dừng công bố TOP 5 tăng lên 1.8s (kèm âm thanh chấn động dramatic hit và nhịp tim dội).
   - Vòng 2 (Top 5 ➔ Top 3): Mỗi ô rung lắc 320ms rồi mới biến mất, cách nhau 1.25s. Dừng 2.0s trước khi bước vào chung kết.
   - Vòng 3 (Top 3 ➔ 1): Loại 1 ô để đưa về màn đối đầu 1 vs 1 kịch tính trong 1.8s trước khi loại nốt ô áp chót để tìm ra người chiến thắng.
   - Đồng bộ thời gian hoàn thành chính xác qua callback `onEliminationComplete`, không dùng timeout ước lượng.

3. **Cố Định Vị Trí Ô Khi Học Sinh Bị Loại (Chống Dồn Lại)**:
   - Thay vì loại bỏ phần tử khỏi DOM khiến các ô dồn lại xê dịch, hệ thống chuyển ô bị loại thành ô tàng hình (invisible placeholder) giữ nguyên chính xác chiều rộng và chiều cao trên lưới.
   - Toàn bộ các ô học sinh còn sống sót luôn giữ nguyên 100% vị trí hàng và cột ban đầu từ đầu đến cuối vòng quay.

4. **Chuyển Thành Hình Gần Vuông & Thuật Toán Tối Ưu Chống Tràn Màn Hình**:
   - Tích hợp `ResizeObserver` đo đạc kích thước thực tế vùng bàn cờ.
   - Tự động duyệt tìm số cột $C$ tối ưu để cực đại hóa kích thước ô gần vuông (tỷ lệ xấp xỉ 1:1 hoặc 1.1:1) vừa khít tuyệt đối trong diện tích khung nhìn.
   - Khống chế chiều rộng và chiều cao tổng của lưới luôn nhỏ hơn hoặc bằng vùng arena, **triệt tiêu 100% hiện tượng tràn màn hình hay xuất hiện thanh cuộn**.
   - Tự động tăng cỡ chữ tối đa theo kích thước ô (`text-2xl` đến `text-4xl`), giúp tên học sinh to, đậm, rõ nét và dễ quan sát từ khoảng cách xa trong lớp học.

## [2.0.52] - 2026-10-13

### Sửa Lỗi Modal Cấu Hình Khi Mở Hoạt Động Song Song (Thu - phát bài & Kì thi)

1. **Khắc phục lỗi không hiện popup cấu hình (`apps/teacher-ui/src/components/ActivityPanel.tsx`)**:
   - **Nguyên nhân:** Trước đây khi có hoạt động đang chạy (`activeRun` khác null), component trả về sớm (`if (activeRun) return ...`) mà không bao gồm khối `<Modal>` cấu hình ở cuối, khiến sự kiện nhấn nút "Mở thêm Thu - phát bài (Song song)" hay "Khởi chạy thêm Kì thi (Song song)" cập nhật `isConfigModalOpen = true` nhưng modal không được kết xuất vào DOM.
   - **Giải pháp:** Tái cấu trúc JSX trả về theo dạng React Fragment đồng nhất `<> {activeRun ? <RunningView /> : <LobbyView />} {configModal} </>`. Modal cấu hình luôn nằm ở cấp ngoài cùng của component, sẵn sàng hiển thị cả khi chưa chạy hoạt động và khi mở thêm hoạt động song song.
   - Bổ sung fallback an toàn cho metadata hoạt động (`assignment-hub`, `exam`, `quiz-live`, `swiss-duel`), đảm bảo không bị `undefined` khi gọi `handleOpenConfig`.

2. **Cập nhật danh sách hoạt động dự phòng (`apps/teacher-ui/src/api/client.ts`)**:
   - Bổ sung đầy đủ 8 hoạt động chuẩn vào danh sách fallback của `getActivities()` (`assignment-hub`, `exam`, `quiz-live`, `quick-poll`, `swiss-duel`, `pdf-presenter`, `object-camera`, `territory-war`), chống lỗi thiếu metadata khi mạng nội bộ tải chậm.

3. **Biên dịch & Đồng bộ**:
   - Chạy `vite build` và copy toàn bộ gói giao diện mới nhất sang `packages/server/public/teacher/`.
   - Kiểm tra `pnpm run typecheck` (`tsc -b`) xanh 100%.

## [2.0.51] - 2026-10-13

### Ngân hàng Câu hỏi & Ma trận Đề thi (Giai đoạn 1 & 2: Database, Protocol & Parser)

1. **Enum Mức độ Nhận thức Chuẩn Bộ GD&ĐT (`packages/protocol/src/enums.ts`)**:
   - Bổ sung `DifficultyLevelSchema`: gồm 4 mức `nb` (Nhận biết), `th` (Thông hiểu), `vd` (Vận dụng), `vdc` (Vận dụng cao).

2. **DTO & Validation Schemas Ngân hàng & Ma trận (`packages/protocol/src/bank.ts`)**:
   - Khai báo `BankQuestionDtoSchema`, `CreateBankQuestionRequestSchema`, `UpdateBankQuestionRequestSchema` cho kho câu hỏi gốc.
   - Khai báo `MatrixCountsSchema`, `MatrixLessonRowSchema`, `MatrixGenerateRequestSchema` cho thuật toán sinh đề theo ma trận bài học.
   - Khai báo `MatrixStatsRequestSchema`, `MatrixStatsResponseSchema`, `BankCurriculumTreeNodeSchema` phục vụ truy vấn số lượng câu sẵn có và hiển thị cây chương trình.
   - Export toàn bộ qua `packages/protocol/src/index.ts`, kiểm tra typecheck xanh 100%.

3. **Database Schema & Migration Bảng `bank_questions` (`packages/db`)**:
   - Thêm bảng `bank_questions` vào `packages/db/src/schema/index.ts` kèm 3 chỉ mục tối ưu (`ownerId`, `grade + subject`, `lesson + difficulty`).
   - Tạo file migration SQLite mới `packages/db/src/migrations/0005_bank_questions_schema.sql` và tích hợp migration v5 vào `EMBEDDED_MIGRATIONS` cùng cơ chế tự phục hồi `ensureSchemaIntegrity` trong `migrator.ts`.
   - Viết `BankQuestionRepository` toàn diện: hỗ trợ tạo đơn/batch (`create`, `createMany`), cập nhật, xóa đơn/batch, lọc đa tiêu chí, tính cây phân cấp chương trình (`getCurriculumTree`), thống kê ma trận số lượng sẵn có (`getMatrixStats`), bốc ngẫu nhiên (`pickRandom`), và kiểm tra dùng chung hình ảnh (`isAssetReferenced`).
   - Bổ sung bộ test `packages/db/src/__tests__/bank-question-repository.test.ts`, kiểm tra typecheck xanh 100%.

4. **Nâng cấp Word Parser Nhận Diện Mức Độ & Cây Bài Học (`packages/question-kit`)**:
   - Mở rộng 4 schema câu hỏi (`mcq4`, `tf`, `tf_group`, `short`) để hỗ trợ metadata `difficulty`, `chapter`, `lesson`.
   - Nâng cấp `parseWordHtmlContent` trong `packages/question-kit/src/word/word-parser.ts`:
     * Tự động nhận diện nhãn phân cấp `[Chương: ...]` và `[Bài: ...]` ở đầu file hoặc giữa các khối câu hỏi, đồng thời cập nhật trạng thái `currentChapter` và `currentLesson` xuyên suốt tài liệu.
     * Tự động nhận diện tiền tố mức độ nhận thức `[NB]`, `[TH]`, `[VD]`, `[VDC]` (hoặc `[M1]` - `[M4]`) ở cả trước và sau số thứ tự câu hỏi (`[NB] Câu 1:` hoặc `Câu 1 [NB]:`).
     * Tự động làm sạch các thẻ metadata khỏi đề bài để nội dung hiển thị trong sáng, chuyên nghiệp.
     * Trả về `detectedChapter` và `detectedLesson` trong kết quả phân tích `ParsedWordExamResult`.
   - Bổ sung bộ test `packages/question-kit/src/__tests__/word-parser-difficulty.test.ts`, kiểm tra typecheck xanh 100%.

5. **REST API Ngân Hàng Câu Hỏi & Sinh Đề Theo Ma Trận (`packages/server`)**:
   - Xây dựng router mới `packages/server/src/routes/bank.ts` và tích hợp vào Fastify trong `packages/server/src/app.ts`.
   - Cài đặt đầy đủ các endpoints chuẩn RESTful:
     * `GET /api/bank/tree`: Truy xuất cây phân cấp Khối -> Môn -> Chương -> Bài kèm số lượng câu hỏi của giáo viên.
     * `GET /api/bank/questions`: Truy vấn và phân trang danh sách câu hỏi theo các bộ lọc (`grade`, `subject`, `chapter`, `lesson`, `difficulty`, `search`).
     * `POST /api/bank/questions`: Tạo câu hỏi đơn lẻ, tự động bóc tách và lưu trữ hình ảnh Base64 vào Asset Repository.
     * `POST /api/bank/questions/batch`: Nhập hàng loạt câu hỏi từ file Word phân tích được vào kho chung.
     * `PUT /api/bank/questions/:id`: Cập nhật nội dung câu hỏi với phân quyền tác giả (`ownerId`) hoặc quản trị viên.
     * `DELETE /api/bank/questions/:id`: Xóa câu hỏi khỏi ngân hàng và tự động dọn dẹp các tệp hình ảnh mồ côi (`cleanupOrphanAssets`) nếu không còn được sử dụng ở bất kỳ câu hỏi ngân hàng hoặc bộ đề thi nào khác.
     * `POST /api/bank/matrix-stats`: Thống kê số lượng câu hỏi sẵn có theo từng mức độ nhận biết (`nb`, `th`, `vd`, `vdc`) cho bảng cấu hình ma trận.
     * `POST /api/bank/generate-set`: Bốc ngẫu nhiên câu hỏi theo cấu hình ma trận, hỗ trợ tùy chọn xáo trộn (`shuffleQuestions`), và lưu trực tiếp snapshot độc lập vào bảng bộ đề (`question_sets`).
   - Bổ sung bộ test tích hợp API `packages/server/src/__tests__/bank-routes.test.ts`, kiểm tra typecheck xanh 100%.

6. **API Client Ngân Hàng Câu Hỏi & Ma Trận Trong Teacher UI (`apps/teacher-ui/src/api/client.ts`)**:
   - Bổ sung các kiểu dữ liệu và DTOs từ `@educlass/protocol` (`BankQuestionDto`, `CreateBankQuestionRequest`, `UpdateBankQuestionRequest`, `BankCurriculumTreeNode`, `MatrixStatsRequest`, `MatrixStatsResponse`, `MatrixGenerateRequest`, `DifficultyLevel`, `QuestionType`).
   - Cài đặt đầy đủ các phương thức gọi API trong `TeacherApiClient`:
     * `getBankTree`: Lấy cây chương trình theo Khối và Môn học kèm thống kê câu hỏi.
     * `getBankQuestions`: Lọc danh sách câu hỏi theo đa tiêu chí (Khối, Môn, Chương, Bài, Mức độ nhận thức, Từ khóa tìm kiếm, Phân trang).
     * `getBankQuestionDetail`: Xem chi tiết một câu hỏi trong ngân hàng.
     * `createBankQuestion`: Tạo câu hỏi đơn lẻ kèm xử lý ảnh inline.
     * `createBatchBankQuestions`: Tạo hàng loạt câu hỏi sau khi nhập từ Word.
     * `updateBankQuestion`: Cập nhật nội dung câu hỏi ngân hàng.
     * `deleteBankQuestion`: Xóa câu hỏi và dọn dẹp tài nguyên ảnh mồ côi.
     * `getMatrixStats`: Truy vấn số câu sẵn có theo từng bài và mức độ nhận thức cho bảng ma trận.
     * `generateSetFromMatrix`: Sinh bộ đề ngẫu nhiên từ cấu hình ma trận và lưu vào kho đề thi.
   - Bổ sung bộ test `apps/teacher-ui/src/__tests__/bank-client.test.ts`, kiểm tra typecheck xanh 100%.

7. **Thành Phần Cây Bài Học & Bộ Lọc Mức Độ Nhận Thức (`apps/teacher-ui`)**:
   - Xây dựng component `DifficultyFilterBar` (`apps/teacher-ui/src/components/DifficultyFilterBar.tsx`):
     * Cung cấp 4 huy hiệu mức độ chuẩn Bộ GD&ĐT: `nb` (Nhận biết - Xanh lá ●), `th` (Thông hiểu - Xanh dương ■), `vd` (Vận dụng - Vàng cam ▲), `vdc` (Vận dụng cao - Đỏ hồng ◆) đi kèm hình khối nhận diện hình học chuẩn UX Plan.
     * Hỗ trợ nút lọc "Tất cả" và hiển thị số lượng thống kê câu hỏi trực tiếp trên từng nút bấm.
     * Đảm bảo diện tích chạm tối thiểu $\ge 44-48\text{px}$ và hỗ trợ chế độ gọn `compact`.
   - Xây dựng component `BankCurriculumTree` (`apps/teacher-ui/src/components/BankCurriculumTree.tsx`):
     * Hiển thị cây phân cấp `Khối (1-12) → Môn học → Chương → Bài` theo định dạng Accordion mượt mà, hỗ trợ mở rộng/thu gọn nhanh từng chương hoặc toàn bộ cây.
     * Hiển thị badge thống kê số lượng câu hỏi theo từng cấp chương/bài.
     * Trạng thái giao diện đầy đủ: đang tải (skeleton/spinner), rỗng (empty state với thông điệp hướng dẫn nhập Word tiếng Việt thân thiện).
   - Bổ sung bộ test cho cả hai components: `difficulty-filter-bar.test.tsx` và `bank-curriculum-tree.test.tsx`, kiểm tra typecheck xanh 100%.

8. **Màn Hình Quản Lý Ngân Hàng Câu Hỏi & Tích Hợp Giao Diện Giáo Viên (`apps/teacher-ui`)**:
   - Xây dựng màn hình `BankQuestionTab` (`apps/teacher-ui/src/components/BankQuestionTab.tsx`):
     * Cột trái: Cây bài học `BankCurriculumTree` lọc theo Khối $\rightarrow$ Môn $\rightarrow$ Chương $\rightarrow$ Bài.
     * Cột phải: Thanh công cụ tìm kiếm từ khóa, thanh lọc mức độ `DifficultyFilterBar`, các thẻ câu hỏi trực quan hiển thị công thức toán KaTeX (`renderLatexInText`), các phương án lựa chọn với phương án đúng có viền và dấu kiểm `✓`, kèm lời giải chi tiết.
     * Hỗ trợ modal soạn mới và chỉnh sửa câu hỏi ngân hàng đầy đủ tham số (Chương, Bài, Mức độ nhận thức, Điểm số, Nội dung KaTeX, 4 phương án, Đáp án đúng, Lời giải).
     * Hỗ trợ xóa câu hỏi kèm modal cảnh báo xác nhận và tự động làm mới cây/danh sách.
   - Tích hợp bộ chuyển đổi Tab con (Sub-tab Switcher) trong màn hình `App.tsx`:
     * Cho phép giáo viên chuyển đổi linh hoạt giữa "📖 Ngân hàng câu hỏi (Ma trận)" và "📚 Kho bộ đề thi".
   - Bổ sung bộ test `apps/teacher-ui/src/__tests__/bank-question-tab.test.tsx`, kiểm tra typecheck xanh 100%.

9. **Modal Nhập File Word Vào Ngân Hàng Câu Hỏi (`apps/teacher-ui`)**:
   - Xây dựng component `BankWordImportModal` (`apps/teacher-ui/src/components/BankWordImportModal.tsx`):
     * Cho phép kéo thả hoặc duyệt tập tin Microsoft Word (.docx).
     * Thiết lập cấu hình dự phòng: Khối lớp (1-12), Môn học, Chương mặc định, Bài mặc định, và Mức độ nhận thức mặc định (áp dụng khi trong file Word không gắn nhãn).
     * Phân tích tệp trực tiếp và hiển thị bảng xem trước (Preview Table): nhận diện đầy đủ số câu hợp lệ, công thức toán KaTeX, các phương án, đáp án đúng, nhãn phân cấp chương bài và mức độ nhận thức.
     * Cho phép giáo viên tinh chỉnh nhanh mức độ (`NB`, `TH`, `VD`, `VDC`) cho từng câu hỏi trực tiếp trên danh sách xem trước.
     * Nút **"Lưu vào Ngân hàng câu hỏi"**: chuyển đổi và lưu hàng loạt qua endpoint `POST /api/bank/questions/batch`, tự động làm mới cây chương trình và danh sách câu hỏi.
   - Tích hợp `BankWordImportModal` trực tiếp vào thanh công cụ của `BankQuestionTab`.
   - Bổ sung bộ test `apps/teacher-ui/src/__tests__/bank-word-import-modal.test.tsx`, kiểm tra typecheck xanh 100%.

10. **Modal Cấu Hình Ma Trận Đề Thi & Bốc Đề Tự Động (`apps/teacher-ui`)**:
    - Xây dựng component `MatrixImportModal` (`apps/teacher-ui/src/components/MatrixImportModal.tsx`):
      * Thiết lập thông tin bộ đề mới: Tiêu đề, Khối lớp (1-12), Môn học.
      * Tự động đồng bộ cây bài học và cho phép giáo viên tích chọn các bài học cần đưa vào cấu trúc đề thi.
      * Bảng ma trận 2 chiều (Bài học $\times$ 4 Mức độ nhận thức): hiển thị ô nhập số câu cần lấy kèm số lượng câu sẵn có trong kho `Có sẵn: X` lấy thời gian thực qua `POST /api/bank/matrix-stats`.
      * Cơ chế kiểm tra hợp lệ thời gian thực (Real-time Validation): nếu số lượng yêu cầu vượt quá số câu sẵn có trong kho thì lập tức viền đỏ ô nhập, hiển thị cảnh báo đỏ và khóa nút submit.
      * Hàng tổng kết ma trận: tính tổng số câu theo từng mức độ nhận thức, tổng số câu toàn bài thi và tỷ lệ phân bổ phần trăm (`%`).
      * Tùy chọn xáo trộn ngẫu nhiên thứ tự câu hỏi (`shuffleQuestions`) và các phương án lựa chọn (`shuffleOptions`).
      * Gọi endpoint `POST /api/bank/generate-set` để bốc ngẫu nhiên câu hỏi theo cấu hình ma trận và lưu snapshot độc lập vào kho đề thi (`question_sets`).
    - Bổ sung nút **"🎯 Bốc từ Ngân hàng (Ma trận)"** trên thanh tác vụ của `QuestionBankTab` để mở modal.
    - Bổ sung bộ test `apps/teacher-ui/src/__tests__/matrix-import-modal.test.tsx`, kiểm tra typecheck xanh 100%.

11. **Xem Trước Kết Quả Bốc Đề & Đổi Câu Tương Đương — Review & Swap (`apps/teacher-ui` & `packages/server`)**:
    - Bổ sung endpoint backend `POST /api/bank/preview-set`: hỗ trợ bốc ngẫu nhiên câu hỏi theo cấu hình ma trận nhưng chưa lưu vào cơ sở dữ liệu để phục vụ kiểm tra và phê duyệt.
    - Bổ sung method `previewSetFromMatrix` trong `TeacherApiClient`.
    - Nâng cấp `MatrixImportModal` thành quy trình 2 bước trực quan:
      * **Bước 1**: Cấu hình ma trận số câu và bấm "👁️ Xem trước & Đổi câu".
      * **Bước 2 (Review & Swap)**: Hiển thị toàn bộ câu hỏi vừa bốc theo dạng thẻ chi tiết (đề bài KaTeX, các phương án lựa chọn, đáp án đúng, mức độ nhận thức).
      * Trang bị nút **"🔄 Đổi câu khác"** cho từng câu hỏi: tự động tìm kiếm câu hỏi tương đương trong cùng bài học và cùng mức độ nhận thức từ kho ngân hàng để thay thế trực tiếp, kèm thông báo trạng thái.
      * Nút **"💾 Xác nhận lưu vào Kho bộ đề"**: tạo bộ đề thi hoàn chỉnh trong `question_sets` sau khi giáo viên đã hoàn toàn ưng ý với danh sách câu hỏi.
    - Cập nhật bộ test `apps/teacher-ui/src/__tests__/matrix-import-modal.test.tsx` bao phủ toàn bộ luồng Review & Swap, kiểm tra typecheck xanh 100%.

12. **Tích Hợp Trực Tiếp Ngân Hàng Câu Hỏi & Ma Trận Đề Thi Với Quizizz / Kahoot (`quiz-live`) & Kỳ Thi (`exam`)**:
    - Chuẩn hóa luồng lưu snapshot câu hỏi từ Ma trận vào `question_sets`: tự động giải nén các trường `contentJson` và `answerJson` thành cấu trúc câu hỏi chuẩn (`stem`, `options`, `correct`, `explanation`, `points`), đồng thời nâng cấp `transformQuestionsForDb` trên server để hỗ trợ trực tiếp các đối tượng đã được đóng gói mà không bị lồng chuỗi JSON 2 lần.
    - Bổ sung trường `tags?: string[]` trong `QuestionSetSummary` của `ActivityPanel`.
    - Nhận diện và gắn nhãn biểu tượng trực quan `🎯 [Ma trận]` cho mọi bộ đề được sinh từ ma trận trong dropdown lựa chọn của:
      * Hoạt động trắc nghiệm trực tiếp `quiz-live` (chế độ Quizizz học sinh làm bài tự do theo tốc độ & chế độ Kahoot nhịp thi đấu theo giáo viên).
      * Hoạt động kỳ thi trắc nghiệm độc lập `exam` trong `ActivityPanel`.
      * Hộp thoại tạo kỳ thi mới `CreateExamModal`.
      * Hoạt động đấu trường lãnh thổ `territory-war`.
    - Hiển thị badge nhận diện nổi bật `🎯 Ma trận` trên từng thẻ bộ đề trong tab Kho bộ đề thi (`QuestionBankTab`).
    - Bổ sung bộ test tích hợp toàn diện `apps/teacher-ui/src/__tests__/bank-integration-quiz-exam.test.tsx`, kiểm tra typecheck monorepo xanh 100%.

## [2.0.50] - 2026-10-12

### Sửa Lỗi Sao Chép Link Vào Lớp & Lỗi Truy Cập Cổng Học Sinh Bị Chuyển Hướng Thành /?

1. **Khắc Phục Lỗi Sao Chép Link (Phải Thu Nhỏ Mới Nhấn Được)**:
   - **Nguyên nhân**: Khi cửa sổ giáo viên (`teacherWindow`) vừa khởi tạo hoặc đóng modal, Chromium siết chặt chính sách bảo mật Document Focus khiến `navigator.clipboard.writeText` bị từ chối (`DOMException: Document is not focused`), đồng thời khối `try...catch` trước đây nuốt lỗi mà không chuyển sang nhánh fallback `document.execCommand('copy')`.
   - **Giải pháp**:
     * Bổ sung IPC `copy-text` sử dụng native Electron `clipboard.writeText` trong Electron Main process và phơi bày qua `preload.ts` vào `teacherWindow`, giúp việc sao chép thành công 100% không phụ thuộc focus của DOM.
     * Nâng cấp hàm sao chép đa tầng trong `SessionControl.tsx`: ưu tiên native Electron clipboard $\rightarrow$ fallback `navigator.clipboard.writeText` $\rightarrow$ fallback thẻ `textarea` ẩn kết hợp `execCommand('copy')`.
     * Chuẩn hóa URL sao chép, tự động fallback từ `joinUrlDisplay` hoặc mã phòng `joinCode` nếu `activeSession.joinUrl` bị lồng.

2. **Khắc Phục Lỗi Học Sinh Mở Link Bị Chuyển Thành `http://192.168.1.11:3000/?` & Không Vào Được**:
   - **Nguyên nhân**: File `packages/server/public/student/js/app.js` bị lỗi cú pháp thiếu dấu đóng `} from './assignment.js';`, khiến toàn bộ script module học sinh bị crash ngay từ đầu. Khi học sinh bấm nút "🚀 Vào lớp ngay" (hoặc nhấn Enter), sự kiện `onsubmit` gặp `ReferenceError: handleJoin is not defined` và không gọi được `event.preventDefault()`, dẫn đến form submit theo hành vi mặc định (GET request) chuyển hướng trang thành `/?` và reload đơ giao diện.
   - **Giải pháp**:
     * Sửa dứt điểm lỗi cú pháp trong `packages/server/public/student/js/app.js`, đảm bảo nạp module thành công và tự động nhận diện mã phòng từ tham số URL `?code=ABCXYZ`.
     * Bổ sung `action="javascript:void(0)"` và `event.preventDefault()` trực tiếp trên thẻ `<form id="join-form">` trong `index.html` của cổng học sinh để chống triệt để tình trạng reload về `/?`.
     * Tự động quét và cấu hình đúng đường dẫn thư mục `studentUiDir` trong Electron `main.ts` khi khởi động máy chủ nhúng Fastify.

## [2.0.49] - 2026-10-12

### Thêm Chế Độ Mới Cho Tiện Ích Quay Random: Đấu Trường Sinh Tồn (Elimination Grid)

1. **Hiển Thị Đầy Đủ Tên Học Sinh Trong Các Ô Chữ Nhật**:
   - Hiển thị toàn bộ học sinh trong danh sách quay lên màn hình theo bố cục lưới các ô hình chữ nhật cân đối, hiện đại, phối màu gradient tươi sáng kèm số thứ tự/mã học sinh.
   - Lưới tự động co giãn thông minh (từ 2 đến 8 cột) theo sĩ số lớp học và tương thích hoàn hảo mọi độ phân giải (máy tính giáo viên, màn hình máy chiếu, bảng tương tác).

2. **Cơ Chế Loại Trừ Dần Qua 3 Giai Đoạn Kịch Tính (Còn 5 Ô -> Còn 3 Ô -> Còn 1 Ô)**:
   - **Vòng 1 (Loại bão táp)**: Các ô học sinh biến mất dần theo nhịp âm thanh dồn dập cho đến khi trên màn hình chỉ còn lại **5 ô chữ nhật** của 5 bạn xuất sắc nhất. Dừng lại 1.2s công bố và tỏa sáng với hiệu ứng hào quang xanh Cyan.
   - **Vòng 2 (Tranh tài Top 3)**: Từ 5 ô tiếp tục rung lắc và loại trừ dứt khoát 2 ô, để lại đúng **3 ô chữ nhật** bước vào vòng chung kết. Dừng lại 1.3s với âm thanh nhịp tim dội hồi hộp và viền ánh kim Gold.
   - **Vòng 3 (Chung kết nghẹt thở)**: Đối đầu kịch tính từ 3 ô rút xuống 2 ô đối đầu (1 vs 1), sau đó loại ô áp chót để còn lại duy nhất **1 ô chiến thắng**.

3. **Vinh Quang & Tương Tác Đồng Bộ Toàn Diện**:
   - Ô học sinh chiến thắng cuối cùng phóng to nổi bật, đội vương miện 👑, nổ pháo hoa chúc mừng rực rỡ và phát nhạc thắng cuộc.
   - Đồng bộ thời gian thực qua `BroadcastChannel` giữa bảng điều khiển của giáo viên và cửa sổ máy chiếu (`RandomPickerProjectorWindow`).
   - Tự động mở hộp thoại chấm điểm EXP hoặc đưa học sinh vào hàng chờ lên bảng.

## [2.0.48] - 2026-10-12

### Tinh Chỉnh Hoàn Thiện Chế Độ Bắn Vịt (Duck Hunt): Che Kín Màn Hình Spotlight 2600x2600, Điều Chỉnh Nhịp Ngắm Chậm Rãi & Khống Chế Tâm Ngắm Luôn Trong Khung Hình

1. **Khắc Phục Lỗi Lộ Vùng Sáng Ở Biên (Spotlight Che Phủ Tuyệt Đối $2600 \times 2600$)**:
   - Nâng cấp kích thước Canvas Spotlight từ $1800 \times 1800$ lên $2600 \times 2600$ với tâm $cx = 1300, cy = 1300$.
   - Sử dụng cơ chế `destination-out` khoét sạch lỗ ngắm mềm mại mờ dần ở tâm, toàn bộ diện tích còn lại phủ màu đen sẫm đặc `rgba(0,0,0,0.94)` ra tận bán kính $1300px$ (vượt xa đường chéo lớn nhất của sân khấu $\approx 1000px$).
   - Dù tâm ngắm có di chuyển ra sát 4 mép biên hay các góc, toàn bộ màn hình luôn được che phủ đen đều, triệt tiêu 100% hiện tượng lộ vệt sáng ở biên đối diện.

2. **Điều Chỉnh Tốc Độ Lia & Bám Vịt Chậm Rãi, Kịch Tính, Dễ Quan Sát**:
   - Giảm số bước lướt qua xuống 4 – 6 chú vịt, tăng thời gian lia súng giữa các vịt lên **0.42s – 0.62s** (hãm phanh chậm dần).
   - Tại mỗi chú vịt được lia qua, tâm ngắm dừng lại và bơi cùng chú vịt đó trong **0.35s – 0.45s**, vịt nảy nhẹ, phát âm thanh tick rõ ràng và thanh trạng thái hiển thị tên học sinh, giúp giáo viên và cả lớp kịp nhìn rõ và đọc to tên trước khi chuyển sang mục tiêu tiếp theo.
   - Đồng bộ thời gian nổ pháo hoa và mở `ResultModal` trong `RandomPickerTab.tsx` khớp hoàn hảo với nhịp bắn mới.

3. **Khống Chế Tâm Ngắm Tuyệt Đối Không Bị Kéo Ra Ngoài Màn Hình**:
   - Thiết lập giới hạn cứng `clampCrosshairX` và `clampCrosshairY` trong khoảng an toàn $[85, 915] \times [55, 385]$ cho cả Pixi Ticker, chuột rê và các hiệu ứng GSAP.
   - Bộ lọc thông minh `getSafeVisibleDucks(margin)` chỉ chọn các chú vịt đang bơi có quỹ đạo hướng vào sâu trong sân khấu (vịt bơi sang phải cách mép phải $\ge 180px$, vịt bơi sang trái cách mép trái $\ge 180px$).
   - Cơ chế tự ngắt bám (`trackingDuckRef = null`) nếu con vịt bơi chạm mép biên, đảm bảo tâm ngắm luôn dừng lại bên trong sân khấu, không bao giờ bị kéo ra ngoài màn hình.

## [2.0.47] - 2026-10-11

### Đồng Bộ Vòng Đời Hình Ảnh Khi Lưu Và Xóa Đề Thi (Chống Rác Ổ Đĩa & Quản Lý CAS Tập Trung)

1. **Tự Động Bóc Tách & Chuyển Đổi Ảnh Base64 Thành CAS Asset Khi Lưu Đề**:
   - Khi giáo viên tạo hoặc cập nhật bộ đề (`POST /api/question-sets`, `PUT /api/question-sets/:id`, `PUT /api/question-sets/:id/questions`):
   - Mọi hình ảnh (bao gồm ảnh tải từ file Word, upload trực tiếp hoặc chuỗi Base64 Data URL nhúng trong câu hỏi/phương án) đều được tự động tính mã băm SHA-256, ghi ra tập tin vật lý trong kho CAS (`data/assets/${hash}.${ext}`) và tạo bản ghi trong bảng `assets` (`AssetRepository.findOrCreate`).
   - Chuỗi Base64 dài trong câu hỏi được thay thế bằng URL chuẩn `/api/assets/${hash}` và mã hash tương ứng, giúp cơ sở dữ liệu SQLite siêu nhẹ và toàn bộ hình ảnh được quản lý tập trung.

2. **Dọn Sạch Toàn Bộ Hình Ảnh Trên Đĩa Và Cơ Sở Dữ Liệu Khi Xóa Đề Thi**:
   - Khi giáo viên xóa bộ đề (`DELETE /api/question-sets/:id`):
   - Hệ thống quét và bóc tách toàn bộ các mã SHA-256 của tất cả các ảnh có trong đề thi đó.
   - Xóa bộ đề và các câu hỏi trong database.
   - Kiểm tra đa đề thi an toàn: Với từng mã ảnh, hệ thống kiểm tra xem mã hash đó có còn được bất kỳ câu hỏi nào trong các bộ đề khác tham chiếu hay không (`QuestionSetRepository.isAssetReferenced`).
   - Nếu không còn đề nào khác dùng chung, hệ thống xóa vĩnh viễn tệp ảnh vật lý trên ổ đĩa (`data/assets/${hash}.*`) và xóa bản ghi trong bảng `assets` (`AssetRepository.deleteBySha256`), đảm bảo không để lại file rác trên máy tính.

3. **Dọn Rác Asset Mồ Côi Khi Cập Nhật Câu Hỏi**:
   - Khi giáo viên chỉnh sửa bộ đề và gỡ bỏ câu hỏi hoặc thay đổi ảnh:
   - Hệ thống tự động phát hiện các ảnh cũ không còn được sử dụng và dọn sạch khỏi đĩa và database nếu không còn đề nào khác tham chiếu.

4. **Xác Nhận Xóa Rõ Ràng & Thân Thiện Trên Giao Diện**:
   - Thêm hộp thoại xác nhận khi bấm nút xóa bộ đề trong `QuestionBankTab`: *"Bạn có chắc chắn muốn xóa bộ đề ... không? Tất cả câu hỏi và hình ảnh trong bộ đề này sẽ bị xóa khỏi hệ thống."*
   - Cập nhật thông báo phản hồi: *"Đã xóa bộ câu hỏi và các hình ảnh liên quan."*

## [2.0.46] - 2026-10-11

### Nâng Cấp Cơ Chế Xóa Sạch Dữ Liệu Hình Ảnh Camera Vật Thể (Bảo Vệ Quyền Riêng Tư & Chống Rác Ổ Đĩa)

1. **Xóa Vĩnh Viễn File Vật Lý Ngay Lập Tức Khi Bấm Nút Xóa [×]**:
   - Khi giáo viên xóa một bức ảnh trên khay ảnh: Hệ thống không chỉ xóa khỏi trạng thái hiển thị trong RAM/WebSocket mà còn gọi API xóa vĩnh viễn file ảnh vật lý tương ứng khỏi thư mục tạm trên ổ đĩa máy tính (`data/temp/object-camera/<sessionId>/...`).
   - Tuyệt đối không để lại file rác hoặc hình ảnh bài làm của học sinh sau khi đã bị xóa.

2. **Dọn Rác Triệt Để Toàn Bộ Ảnh Tạm Chưa Ghim Khi Bấm [🗑️ Dọn rác]**:
   - Bổ sung endpoint `POST /api/object-camera/cleanup-unpinned`: Quét toàn bộ thư mục tạm của phiên học và xóa vĩnh viễn tất cả các file ảnh chưa được giáo viên ghim lưu trữ (`isPinned: false`).
   - Giữ lại an toàn những bài học sinh xuất sắc đã được ghim làm tư liệu (`📌`).

3. **Tự Động Dọn Dẹp Khi Kết Thúc Hoạt Động & Đóng Tiết Học**:
   - Tích hợp hook trong `ActivityEngine.endActivity()`: Tự động dọn sạch các file ảnh tạm chưa ghim của camera vật thể khi chuyển hoạt động hoặc kết thúc chữa bài.
   - Khi đóng phiên học (`sessions.closeSession`): Dọn sạch toàn bộ thư mục của phiên đó.
   - Khi khởi động server: Tự động quét và dọn sạch các thư mục session tạm cũ (> 24 giờ) còn sót lại trong trường hợp giáo viên tắt máy đột ngột.

4. **Quản Lý Vòng Đời Thống Nhất Cho Ảnh Tải Từ Máy Tính**:
   - Cập nhật luồng nạp ảnh từ máy tính (nút "Thêm ảnh từ máy" hoặc kéo thả): Upload qua API để lưu vào hệ thống file tạm quản lý thống nhất, tránh phình to gói tin WebSocket broadcast làm nghẽn mạng LAN lớp học, đồng thời đảm bảo khi xóa cũng được dọn sạch khỏi ổ đĩa.

## [2.0.45] - 2026-10-11

### Nâng Cấp Toàn Diện Tính Năng Chiếu & Chữa Bài PDF / Word (Mô Hình A)

1. **Khắc Phục Lỗi Mở File PDF & Word Bị Trắng Trơn**:
   - Xây dựng module kết xuất tài liệu thực tế `document-loader.ts`:
     * File PDF: Tích hợp `pdfjs-dist` kết xuất từng trang tài liệu thành hình ảnh canvas A4 độ nét cao, xuất chuỗi Data URL Base64 (`pageImages`).
     * File Word (`.docx`): Tích hợp `mammoth` trích xuất nội dung HTML chuẩn, tự động phân trang logic (`paginateHtmlContent`) và kết xuất từng trang ra canvas A4 qua SVG foreignObject.
     * Cung cấp tài liệu mẫu có sẵn để giáo viên trình chiếu thử nghiệm ngay lập tức.
   - Loại bỏ cơ chế vẽ hình chữ nhật rỗng giả lập trước đây, đảm bảo nội dung đề bài hiển thị rõ nét 100%.

2. **Bổ Sung Nút Bật / Tắt Chiếu Xuống Học Sinh (Phát Sóng Trực Tiếp)**:
   - Thêm trạng thái `isStudentBroadcastEnabled` trong `PdfPresenterState` và intent `toggle_student_broadcast`.
   - Bổ sung nút công tắc nổi bật trên thanh công cụ giáo viên: **[📡 Chiếu HS: BẬT]** / **[⏸️ Tạm dừng chiếu HS]**.
   - Cổng học sinh và màn chiếu tự động hiển thị màn hình chờ mượt mà khi giáo viên tạm dừng chiếu và mở lại tức thì khi bật phát sóng.

3. **Hiển Thị Cuộn Liên Tục Tất Cả Các Trang (Scroll All Pages)**:
   - Chuyển đổi toàn diện từ chế độ lật từng trang đơn lẻ sang chế độ cuộn liên tục từ trang 1 đến trang cuối cùng trên tất cả các màn hình (Bảng điều khiển giáo viên, Màn chiếu Projector, và Cổng học sinh).
   - Bổ sung thanh nhảy trang nhanh (`[Trang 1] [Trang 2] ... [Trang N]`) giúp giáo viên cuộn mượt mà đến bất kỳ trang nào ngay lập tức.

4. **Động Cơ Cắt Dãn Khoảng Trống Mô Hình A: Dạt Phần Đề Xuống Dưới Tạo Chỗ Sửa Bài**:
   - Nâng cấp `canvas-gap-engine.ts`:
     * Khi giáo viên bấm **[+ Chèn chỗ sửa bài]**, hệ thống cắt lát nội dung tại tọa độ `splitYRatio`. Phần đề phía trên giữ nguyên, phần khoảng trống (ô ly / dòng kẻ / trắng) được chèn vào giữa, và **toàn bộ nội dung đề bài phía dưới được dạt xuống phía dưới** theo đúng chiều cao `gapHeightPx`.
     * Tích hợp thanh điều khiển linh hoạt tại từng khoảng trống: Tăng `+60px`, Giảm `-60px`, Đổi kiểu nền (Ô ly / Dòng kẻ / Trắng tinh), và nút Xóa chỗ sửa bài.
   - Đồng bộ hóa toàn bộ các trang, lát cắt và nét bút viết (Bút đỏ, Dạ quang, Tẩy xóa, Laser) xuống cổng học sinh VanillaJS (`pdf-presenter.js`) và màn chiếu lớn theo thời gian thực (WebSocket & Polling).

5. **Đóng Gói Bản Portable Mới**:
   - Biên dịch và đóng gói thành công `EduClass v2 Portable 2.0.0.exe` (~101MB) tại thư mục gốc của dự án.

## [2.0.44] - 2026-10-11

### Nâng Cấp Bảng Theo Dõi Quizizz Live Tràn Viền Full Màn Hình

1. **Hiển Thị Tràn Viền Full Màn Hình (Edge-to-Edge) Cho Bảng Giám Sát Quizizz**:
   - Khắc phục tình trạng bảng theo dõi bị bọc trong khung thẻ hẹp (`max-w-6xl`) với khoảng trắng xám lớn bao quanh trên máy chiếu/màn hình độc lập.
   - Cập nhật `ActivityHostWindow.tsx`: Tự động nhận diện hoạt động `quiz-live` chế độ `quizizz`, kích hoạt giao diện tối màu vũ trụ (`bg-[#0a0718]`), loại bỏ padding và giới hạn chiều rộng thừa, cho phép bảng theo dõi bung tràn viền 100% chiều rộng và chiều cao viewport.
   - Nâng cấp `QuizLiveTeacherPanel`: Chuyển bố cục sang Flexbox linh hoạt (`w-full h-full flex-1 min-h-0`), cho phép danh sách bảng xếp hạng (Leaderboard) và phân tích câu hỏi (Questions) mở rộng toàn bộ không gian dọc còn lại thay vì giới hạn cố định 500px.
   - Bổ sung nút tiện ích bật/tắt toàn màn hình (`⛶`) trực tiếp trên thanh công cụ Quizizz.

## [2.0.43] - 2026-10-11

### Nâng Cấp Nhập Đề Thi Từ Word (.docx): Hiển Thị Đầy Đủ Hình Ảnh, Hỗ Trợ Đánh Dấu Đáp Án Đa Dạng & Bổ Sung File Mẫu Chuẩn

1. **Khắc Phục Lỗi Hiển Thị Hình Ảnh Cả Ở Câu Hỏi Và Đáp Án**:
   - Bổ sung hàm tiện ích `resolveAssetUrl()` chuẩn hóa các nguồn hình ảnh: tự động ánh xạ mã băm SHA-256 sang endpoint `/api/assets/:hash`, giữ nguyên Data URL Base64 và đường dẫn tuyệt đối/tương đối.
   - Nâng cấp `cleanHtmlToTextAndImages()` trong `word-parser.ts` để quét và trích xuất triệt để tất cả thẻ hình ảnh từ Word (hỗ trợ `data-asset`, `/api/assets/`, `data:image/...`).
   - Cập nhật modal xem trước đề thi `WordImportModal.tsx`: Hiển thị ảnh minh họa sắc nét ở cả câu hỏi dẫn (`stem.images`), các phương án lựa chọn (`options.images`) và các ý con đúng/sai (`items.text.images`).
   - Cập nhật giao diện làm bài thi học sinh (`ExamStudentView`) và xem lại bài thi giáo viên (`ExamTeacherPanel`, `RichTextEditor`): Hiển thị hình ảnh cho từng phương án lựa chọn A, B, C, D và từng ý a, b, c, d.

2. **Bổ Sung Đa Dạng Cách Đánh Dấu Đáp Án Đúng**:
   - Hỗ trợ đánh dấu bằng **dấu sao `*` đằng trước hoặc sau phương án**: Nhận diện `*A.`, `* A.`, `A*.`, `*a)`, v.v., tự động dọn sạch dấu sao ở nội dung văn bản.
   - Hỗ trợ đánh dấu bằng **bôi phương án (in đậm `<b>`, `<strong>`)**: Nhận diện thông minh khi phương án duy nhất được in đậm nhãn hoặc toàn bộ nội dung.
   - Hỗ trợ đánh dấu bằng **bôi màu / highlight**: Nhận diện thẻ `<mark>`, `background-color`, màu chữ đỏ/xanh nổi bật.
   - Duy trì chuẩn gạch chân (`<u>`) và dòng `Đáp án: [A-D]` truyền thống.

3. **Bổ Sung File Word Mẫu Chuẩn Đầy Đủ Các Dạng Câu Hỏi**:
   - Tạo file Word mẫu chuẩn `de-thi-mau-educlass.docx` tích hợp đầy đủ 4 dạng câu hỏi:
     + Trắc nghiệm 4 lựa chọn (MCQ4) kèm công thức Toán OMML, hình ảnh minh họa ở câu hỏi và đáp án, đa dạng cách đánh dấu (gạch chân, dấu `*`, bôi đậm).
     + Đúng / Sai theo nhóm câu hỏi (TF Group 4 ý a, b, c, d chuẩn Bộ Giáo Dục 2025) kèm nhãn `[Đúng]`, `[Sai]`.
     + Đúng / Sai đơn lẻ (TF) kèm dòng `Đáp án: Đúng`.
     + Trả lời ngắn (Short Answer) kèm dòng `Đáp án: [kết quả]` và `Hướng dẫn giải`.
   - Cập nhật API `GET /api/question-sets/templates/word` và hướng dẫn trực quan trong `WordImportModal.tsx`.

### Nâng Cấp Đại Chiến Lãnh Thổ: Bỏ Hiệu Ứng Kiếm Nhảy Rối Mắt & Bổ Sung Bảng Tổng Kết Điểm Số Từng Người Chơi

1. **Hiển Thị Tĩnh 2 Thanh Kiếm Trong Ô Giao Tranh (Loại Bỏ Hiệu Ứng Nhảy Tưng Tưng)**:
   - Sửa `TerritoryGrid.tsx`: Loại bỏ lớp hiệu ứng `animate-bounce` trên biểu tượng 2 thanh kiếm (`⚔️`). Biểu tượng kiếm và tên người chơi công thành hiển thị tĩnh, rõ nét, nằm gọn gàng bên trong ô đất, không còn giật nảy gây rối mắt trên màn chiếu và bảng điều khiển.

2. **Bảng Tổng Kết Phe Thắng & Điểm Số Từng Người Chơi (Projector, Teacher & Student)**:
   - **Màn chiếu lớp học (`TerritoryProjectorView.tsx`)**:
     * Banner vinh danh phe thắng (Phe Xanh / Phe Đỏ / Hòa điểm) và tỉ số chung cuộc.
     * Cung cấp các chế độ xem linh hoạt qua tab: `[◫ Song Song 2 Phe]` (xem cùng lúc 2 phe cạnh nhau), `[🏆 Toàn Bộ Lớp]` (xếp hạng 1..N toàn quân), `[🔵 Phe Xanh]` và `[🔴 Phe Đỏ]`.
     * Hiển thị điểm số cá nhân rõ nét (`+X điểm`), huy chương 🥇🥈🥉, chi tiết đóng góp (🏰 ô chiếm, 🛡️ gia cố, ✓ câu đúng) và huy hiệu phe thắng.
   - **Bảng điều khiển giáo viên (`TerritoryTeacherPanel.tsx`)**:
     * Bổ sung bảng tổng kết kết quả trận đấu và bảng điểm đóng góp của từng người chơi ngay trên laptop giáo viên.
   - **Cổng học sinh (`territory.js` & `index.html`, `TerritoryStudentView.tsx`)**:
     * Thêm thẻ điểm đóng góp cá nhân nổi bật (`Đóng góp của bạn: +X điểm`).
     * Thêm bảng xếp hạng điểm số tướng lĩnh toàn phòng cuộn mượt mà trên mobile (viewport 360x640), giúp mỗi em biết rõ thứ hạng và đóng góp của mình và đồng đội.

## [2.0.41] - 2026-10-11

### Nâng Cấp Hoàn Thiện Chế Độ Bắn Vịt (Duck Hunt): Hiệu Ứng Spotlight, Bám Sát Vịt Bơi, Lia Ngắm Trên Màn Hình & Ẩn Vịt Sau Khi Bắn

1. **Hiệu Ứng Spotlight Vignette Làm Tối Xung Quanh Tâm Ngắm**:
   - Thay thế cơ chế `Graphics.cut()` bằng Canvas 2D radial gradient texture bọc trong `Sprite` PixiJS (`1800x1800`), tâm lỗ ngắm sáng rõ nét, viền mờ mềm mại (vignette) và xung quanh phủ bóng đêm mờ điện ảnh (`alpha: 0.95`).
   - Spotlight di chuyển mượt mà 60 FPS cùng tâm ngắm, tạo cảm giác tập trung cao độ vào mục tiêu đang rà soát.

2. **Tâm Ngắm Bám Sát Theo Tốc Độ Bơi Của Vịt (Dynamic Tracking)**:
   - Cơ chế bám đuổi trực tiếp trong Pixi Ticker (`trackingDuckRef`): Khi ngắm vịt mồi (Giai đoạn 1) hoặc khóa mục tiêu chốt hạ (Giai đoạn 3), tâm ngắm và đèn spotlight dính chặt chính xác từng pixel theo tốc độ bơi thực tế của chú vịt, không còn bị tụt lại phía sau.

3. **Chỉ Nhắm Vào Vịt Đang Hiển Thị Trên Màn Hình**:
   - Bộ lọc `getVisibleAliveDucks()` loại bỏ hoàn toàn các con vịt đang ở ngoài màn hình ($< 120$ hoặc $> 880$).
   - Đảm bảo chú vịt mục tiêu trúng giải và toàn bộ các bước ngắm luôn diễn ra trong tầm mắt quan sát của giáo viên và học sinh.

4. **Lia Ngắm Tự Nhiên, Không Bay Loạn Xạ**:
   - Thuật toán chọn bước lướt qua (hop sequence) ưu tiên các chú vịt ở cự ly vừa phải và chuyển đổi hàng ray hợp lý, loại bỏ tình trạng tâm ngắm nhảy giật ngang đảo chiều 180 độ.

5. **Ẩn Chú Vịt Bị Bắn, Không Nằm Ở Giữa Màn Hình**:
   - Loại bỏ hoàn toàn hiệu ứng kéo con vịt ra giữa sân khấu và phóng to đứng im.
   - Khi nổ súng: nổ tia lửa, văng lông vũ, rung giật màn hình, chú vịt bị bắn giật nảy rồi ngã nghiêng, chìm xuống dưới thanh ray và mờ dần biến mất (`alpha: 0`, `visible: false`).
   - Tên học sinh trúng giải được vinh danh nổi bật qua banner cúp vàng chân trang và ResultModal.

## [2.0.40] - 2026-10-10

### Cải Tiến Camera Vật Thể: Mã QR & Link LAN Rõ Ràng (Offline), Zoom & Di Chuyển Độc Lập Khi So Sánh 2 Ảnh

1. **Khắc Phục Lỗi Quét Mã QR & Sinh Đường Link Kết Nối Mạng LAN Rõ Ràng**:
   - Thêm endpoint backend `GET /api/object-camera/connect-info`: Tự động dò tìm địa chỉ IP mạng Wi-Fi LAN cục bộ của máy tính (ưu tiên dải 192.168.x, 10.x, 172.x) thay thế hoàn toàn `localhost`, giúp điện thoại quét mã là vào được ngay trang chụp bài mà không bị trỏ về chính nó.
   - Sử dụng thư viện `qrcode` nội bộ sinh ảnh QR code dạng Data URL Base64 PNG chạy hoàn toàn Offline, không phụ thuộc vào dịch vụ Internet ngoài (`api.qrserver.com`).
   - Modal hiển thị thông tin mạng LAN chi tiết, dòng liên kết trực tiếp font mono rõ ràng và nút **[📋 Sao chép]** nhanh vào clipboard để giáo viên có thể gõ tay hoặc sao chép tiện lợi.

2. **Tách Biệt Zoom / Pan / Xoay / Cắt Ảnh Độc Lập Trong Chế Độ So Sánh 2 Ảnh**:
   - Nâng cấp `ObjectCameraStateSchema` bổ sung `compareViewport` riêng biệt cho khung ảnh thứ 2, đồng thời bổ sung cờ `target?: 'primary' | 'secondary'` cho intent `UPDATE_VIEWPORT` và `RESET_VIEWPORT`.
   - Khi ở chế độ so sánh (chia đôi dọc hoặc ngang): Thao tác lăn chuột (Zoom), giữ chuột kéo ảnh (Pan), nút Xoay 90°, Cắt ảnh (Crop), Bộ lọc (Filter) và Fit màn hình ở khung ảnh nào chỉ tác động riêng lên khung ảnh đó, không còn tình trạng cả 2 ảnh bị dịch chuyển hoặc phóng to đồng thời.
   - Thêm thanh chọn khung đang điều khiển trên Toolbar: `[1️⃣ Ảnh 1]` và `[2️⃣ Ảnh 2]` giúp giáo viên dễ dàng chuyển đổi nhanh khung ảnh cần tinh chỉnh.
   - Đồng bộ hiển thị độc lập sang cả cổng Học sinh (`ObjectCameraStudentView.tsx`, `object-camera.js`) và màn hình Máy chiếu (`ObjectCameraProjectorView.tsx`).

3. **Đóng Gói Bản Portable Mới Nhất**:
   - Biên dịch và đóng gói hoàn tất tệp thực thi `EduClass v2 Portable 2.0.0.exe` (~96 MB) đặt tại thư mục gốc dự án.

## [2.0.39] - 2026-10-10

### Đồng Bộ Hoàn Thiện Cổng Học Sinh Cho Hoạt Động Đại Chiến Lãnh Thổ (Territory War)

1. **Khắc Phục Tình Trạng Học Sinh Kẹt Ở Phòng Chờ Khi Giáo Viên Mở Đại Chiến Lãnh Thổ**:
   - Bổ sung nhánh xử lý `activityId === 'territory-war'` trong `session.js` cho cả luồng WebSocket realtime (`activity_state`) và luồng kiểm tra định kỳ (`startActivityPoller`).
   - Tự động ẩn `#lobby-view` và mở `#territory-war-view` ngay khi giáo viên bấm Bắt đầu trận chiến.
   - Xử lý hoàn tất trận đấu và dọn dẹp trạng thái khi trận chiến kết thúc (`activity_end`).

2. **Xây Dựng Module Chuyên Biệt `territory.js` Cho Cổng Học Sinh**:
   - Tạo module `packages/server/public/student/js/territory.js`: kết xuất bản đồ SVG chiến sự tương tác theo chuẩn 4 hướng (kề cạnh), hiển thị cấp độ gia cố, máu ô đất, huy hiệu phe Xanh/Đỏ, thanh kéo co tỉ lệ đất và âm thanh tổng hợp Web Audio API thuần (100% offline, không tải tài nguyên bên ngoài).
   - Modal câu hỏi công thành (`tw-question-modal`) với kích thước vùng chạm tối thiểu ≥ 48px, hỗ trợ nộp đáp án và rút lui nhường ô.
   - Cơ chế hồi chiêu phạt hiển thị đếm ngược khi trả lời sai câu hỏi.

3. **Giao Diện HTML & Khai Báo Mô-đun Chuẩn TypeScript**:
   - Thêm khung màn hình `#territory-war-view` và `#tw-question-modal` vào `packages/server/public/student/index.html`.
   - Gắn đầy đủ hàm tương tác vào `window` và `export` trong `app.js`.
   - Cập nhật khai báo type trong `student-modules.d.ts` và danh sách module tĩnh trong `student-modules.test.ts`.

## [2.0.38] - 2026-10-10

### Nâng Cấp Hoạt Động Đại Chiến Lãnh Thổ: Tắt Mặc Định Sudden Death, Tự Động Chia Phe Theo Nhóm & Phóng To Bản Đồ 3/5 Màn Hình

1. **Mặc Định Tắt Sudden Death (`enableSuddenDeath: false`)**:
   - Cập nhật cả schema phía server (`TerritoryWarConfigSchema`, `TerritoryWarStateSchema`) và state khởi tạo form cấu hình (`ActivityPanel.tsx`): Luật Sudden Death (chiếm lâu đài lớn hoặc 2 lâu đài cánh thắng ngay) được chuyển về mặc định tắt (`false`). Trận đấu diễn ra theo trọn vẹn thời lượng quy định và xếp hạng điểm số cuối cùng, giáo viên có thể tích chọn nếu muốn chơi chế độ kết thúc nhanh.

2. **Tự Động Phân Chia Học Sinh / Nhóm Vào 2 Phe Xanh - Đỏ Cụ Thể**:
   - Khi bấm **Bắt đầu ngay** từ modal cấu hình: Hệ thống tự động quét danh sách người tham gia (`participants`) trong phiên học. Nếu học sinh đã có nhóm (`teamName`), hệ thống tự động phân bổ xen kẽ các nhóm vào Phe Xanh và Phe Đỏ. Học sinh tự do được chia đều 50/50 vào 2 phe.
   - Thêm trường `initialParticipants` vào `TerritoryWarConfigSchema` và gán sẵn quân số vào `st.participants` ngay tại thời điểm khởi tạo (`onStart`).
   - Bổ sung intent `assign_group_team` và `swap_teams` trong `TerritoryTeacherIntentSchema`: Cho phép giáo viên hoán đổi cả nhóm học sinh qua lại giữa Xanh và Đỏ chỉ với 1 click, hoặc chuyển từng học sinh lẻ, cũng như cân bằng tự động hoặc hoán đổi sân.

3. **Phóng To Bản Đồ Chiến Sự Chiếm ~3/5 (60%) Diện Tích Màn Hình**:
   - Nâng cấp `TerritoryGrid.tsx`: Bổ sung thuộc tính `className` linh hoạt, kích thước mặc định mở rộng lên `w-full max-w-[min(65vw,78vh)] aspect-square`.
   - Nâng cấp `TerritoryProjectorView.tsx`: Cột bản đồ chiến sự chiếm trọn 8/12 cột (~66.7% bề ngang) và chiều cao tối ưu `max-h-[76vh]`, bản đồ hiển thị to rõ, trực quan chiếm trọn 3/5 màn hình máy chiếu lớp học.
   - Nâng cấp `TerritoryTeacherPanel.tsx`: Bản đồ chiến sự được bố trí chiếm 7/12 cột (~60% bề ngang) với kích thước `max-w-[560px]`, bên cạnh là bảng điều khiển chuyển đổi theo nhóm và từng học sinh.

## [2.0.37] - 2026-10-10

### Khắc Phục Triệt Để Lỗi "FOREIGN KEY constraint failed" Khi Mở Hoạt Động & Mở Phiên Học

1. **Khắc Phục Vi Phạm Khóa Ngoại Trong `object-camera`**:
   - `object-camera` là tiện ích máy chiếu vật thể hỗ trợ giảng dạy, không chấm điểm cá nhân học sinh. Đã điều chỉnh hàm `onEnd()` trả về danh sách kết quả rỗng `[]` (tương tự như `pdf-presenter`), chấm dứt việc phát sinh bản ghi `{ participantId: 'teacher' }` vào bảng `activity_results` (bảng vốn có khóa ngoại tham chiếu tới `participants.id`).

2. **Cơ Chế Phòng Thủ Đa Lớp Trong `ActivityEngine` (`packages/server/src/activity/engine.ts`)**:
   - Tại bước lưu kết quả hoạt động (`saveResults` trong `endActivity`): Tự động lọc bỏ các bản ghi không hợp lệ (`participantId` rỗng, `'teacher'`, hoặc không nằm trong danh sách người tham gia thực tế của phiên `participants`).
   - Bọc khối lệnh lưu `activity_results` và `exam_records` bằng `try / catch` phòng thủ an toàn, bảo đảm mọi lỗi phát sinh ở tầng snapshot/kết quả không làm đứt đoạn hoặc hủy bỏ tiến trình khởi chạy hoạt động mới (`startActivity`) hay chuyển đổi hoạt động.

3. **Chuẩn Hóa `classId` Khi Mở Phiên Học (`packages/server/src/routes/sessions.ts`)**:
   - Chuẩn hóa trường `classId`: nếu client gửi chuỗi rỗng `""` hoặc chuỗi toàn khoảng trắng khi mở phiên tự do, hệ thống tự động quy đổi thành `null`, ngăn chặn lỗi vi phạm khóa ngoại SQLite trên trường `sessions.class_id` tham chiếu `classes.id`.

## [2.0.36] - 2026-10-10

### Nâng Cấp Giao Diện Camera Vật Thể: Full Màn Hình 100vh, So Sánh 2 Ảnh & Công Tắc Chiếu Học Sinh

1. **Giao Diện Full Màn Hình 100vh Tràn Viền (Loại Bỏ Khoảng Trắng Thừa)**:
   - Sửa `ActivityHostWindow.tsx`: Loại bỏ ràng buộc `max-w-7xl` và lớp đệm padding `p-4 md:p-6` khi chạy tiện ích Camera vật thể, giúp giao diện chiếm trọn vẹn 100% diện tích màn hình máy tính và máy chiếu, không còn khoảng trống màu trắng/xám dư thừa bên dưới.
   - Toàn bộ khoảng giữa màn hình (`Central Stage`) được giải phóng để hiển thị ảnh bài làm với kích thước lớn tối đa.

2. **Tái Cấu Trúc Bố Cục Đáy (Bottom Bar & Filmstrip)**:
   - Ghim cố định thanh **"Bài làm của: [Chọn học sinh]"** (bên trái) và **"Thưởng nóng: [+10 EXP] [+20 EXP] [+50 EXP]"** (bên phải) sát mép dưới cùng của màn hình.
   - Đặt **Khay ảnh phiên (Filmstrip Carousel)** nằm ngay phía trên thanh đáy, cho phép cuộn ngang xem thumbnail, bấm chọn ảnh nhanh, xóa ảnh `[X]` và ghim lưu trữ `[📌]`.

3. **Tính Năng So Sánh 2 Ảnh Đồng Thời (Dual-Image Comparison)**:
   - Bổ sung 3 chế độ xem trên thanh công cụ: **[🖼️ 1 Ảnh]**, **[◫ So sánh Dọc (Trái | Phải)]**, **[⬓ So sánh Ngang (Trên | Dưới)]**.
   - Hỗ trợ chọn và tương tác độc lập: Giáo viên bấm vào Khung 1 hoặc Khung 2 để kích hoạt mục tiêu và chọn ảnh từ khay ảnh.
   - Nét vẽ bút đỏ, dạ quang và con dấu chấm bài được gắn chính xác theo từng ảnh, không bị lẫn lộn giữa 2 bài giải.

4. **Công Tắc Chiếu Xuống Màn Hình Học Sinh (Student Broadcast Controller)**:
   - Bổ sung nút công tắc nổi bật trên thanh điều khiển: **[📡 Chiếu HS: BẬT]** (xanh lá) / **[⏸️ Tạm dừng chiếu HS]** (màu cam).
   - Khi Tắt: Màn hình học sinh hiển thị thông điệp chờ lịch sự (*"Thầy/Cô đang chấm bài... Hãy chú ý lắng nghe nhé!"*), giáo viên thoải mái xoay, cắt, chọn bài và chấm nháp trên máy tính.
   - Khi Bật: Toàn bộ ảnh (kể cả chế độ so sánh 2 ảnh) và các nét bút đỏ lập tức đồng bộ thời gian thực xuống cổng học sinh.

5. **Đồng Bộ Hoàn Hảo Cổng Học Sinh & Máy Chiếu**:
   - Cập nhật cả `ObjectCameraStudentView.tsx` và `ObjectCameraProjectorView.tsx` để tự động chia đôi màn hình khi giáo viên chuyển sang chế độ so sánh 2 bài giải.

## [2.0.35] - 2026-10-10

### Nâng Cấp Toàn Diện Chế Độ Bắn Vịt (Duck Hunt): Giãn Cách Vịt, Hiệu Ứng Spotlight, Nhịp Điệu 3 Giai Đoạn & 10 Skin Màu Sắc

1. **Khắc Phục Vịt Quá Dày & Chống Đè Lên Nhau**:
   - Phân bổ học sinh riêng biệt theo 3 hàng ray với khoảng cách an toàn tối thiểu **260px** giữa các chú vịt.
   - Ứng dụng chu kỳ tuần hoàn toán học `laneTrackLength = N * spacing`, bảo đảm khoảng cách giữa mọi chú vịt trong hàng luôn cố định 100%, không bao giờ dồn toa hay đè lên nhau.

2. **Hiệu Ứng Spotlight Làm Tối Xung Quanh Tâm Ngắm**:
   - Tạo lớp phủ bóng đêm (`alpha: 0.72`) bao trùm sân khấu với lỗ tròn khoét sáng quang học (radius 100px) bám theo tâm ngắm, tạo hiệu ứng tập trung cao độ (tunnel vision) vào chú vịt đang bị nhắm.

3. **Chuẩn Hóa Nhịp Điệu Săn Bắn 3 Giai Đoạn (Rà Mồi ➔ Lướt 5–10 Vịt ➔ Chốt Hạ)**:
   - **Giai đoạn 1 (Rà theo vịt mồi 1.0s):** Tâm ngắm bay tới và bám sát một chú vịt đang bơi trong 1.0 giây với âm thanh rà mục tiêu.
   - **Giai đoạn 2 (Lướt qua 5 tới 10 vịt):** Lướt nhảy zíc zắc qua 5–10 chú vịt tiếp theo với âm thanh lách cách roulette và nhịp hãm phanh chậm dần đều.
   - **Giai đoạn 3 (Khóa cứng & Nổ súng):** Khóa cứng vịt đích trong 0.6s, nhấp nháy đỏ nín thở -> BẮN ĐOÀNG! nổ súng, rung màn hình, lông vũ văng tứ phía và vinh danh phóng to 2x ra giữa màn hình.

4. **10 Phong Cách / Màu Sắc Vịt Độc Đáo (Duck Skins)**:
   - Thiết kế 10 skin màu sắc và phụ kiện phong phú: Vàng cổ điển, Thiên nga trắng (vương miện vàng), Vịt cổ xanh hoang dã (khăn cổ), Hồng kẹo ngọt (nơ hồng), Xanh da trời (kính râm ngầu), Xanh cốm (mũ thể thao), Tím mộng mơ (mũ ảo thuật), Cam hoàng hôn, Ngọc lam biển (kính phi công), Socola nâu.

## [2.0.34] - 2026-10-10

### Chạy Song Song Kì Thi & Thu - Phát Bài Tập (Phương Án A)

1. **Kiến Trúc Đa Hoạt Động Cấp Máy Chủ (`packages/server/src/activity/engine.ts`)**:
   - Chuyển đổi cấu trúc quản lý `activeRuns` từ `Map<sessionId, ActiveActivityRun>` sang `Map<runId, ActiveActivityRun>`, cho phép nhiều hoạt động chạy độc lập trong cùng một tiết học.
   - Thiết lập quy tắc hoạt động song song: Hoạt động nền **Thu - phát bài tập** (`assignment-hub`) cùng tồn tại với các hoạt động tương tác như **Kỳ thi** (`exam`), **Quiz Live**, **Swiss Duel**. Mở thêm hoạt động nền không làm gián đoạn bài thi đang diễn ra của học sinh khác.
   - Tách biệt bộ đệm điều tiết broadcast (`broadcastTimers`) theo cặp `${sessionId}:${runId}`, đảm bảo tần suất phát sóng dữ liệu giữa các hoạt động hoàn toàn độc lập.
   - Bổ sung hàm `getActiveRuns(sessionId)` và mở rộng `findActiveRun(sessionId, runIdOrActivityId)` duy trì tương thích ngược 100% cho các API trước đây.

2. **Giao Thức & REST API (`packages/protocol`, `packages/server/src/routes/activities.ts`)**:
   - Bổ sung `ActiveActivitiesResponseSchema` và `ActiveActivitiesResponse` trong `@educlass/protocol`.
   - Thêm REST API `GET /api/sessions/:id/activities/active` trả về danh sách tất cả các lượt chạy đang hoạt động trong phiên.
   - Nâng cấp `GET /api/sessions/:id/activities/current` hỗ trợ query parameters `?activityId=` và `?runId=`.

3. **Giao Diện Học Sinh (`packages/server/public/student/`)**:
   - **Chống cướp màn hình (Anti-hijack):** Khi học sinh đang làm bài thi trắc nghiệm, các gói tin cập nhật của hoạt động thu bài thực hành được lưu vào bộ đệm ngầm (`state.assignmentState`), không chuyển hướng hay làm mất tập trung của học sinh.
   - **Chuyển tiếp mượt mà ngay khi nộp bài thi:** Khi học sinh nộp bài thi xong, giao diện hiển thị ngay hộp thông báo kèm nút **"📁 Tiếp tục nộp bài thực hành ➔"** để học sinh nộp file Word/Excel/PowerPoint.
   - **Hỗ trợ chuyển đổi qua lại:** Thanh tiêu đề của màn hình Nộp bài có nút quay lại xem kết quả bài thi; màn hình sảnh chờ (Lobby) hiển thị banner thông báo giáo viên đang mở nộp bài tập.
   - Đảm bảo gửi file nộp bài đúng `runId` của hoạt động Thu bài (`state.assignmentRunId`).

4. **Bảng Điều Khiển Giáo Viên (`apps/teacher-ui/`)**:
   - **Thanh chuyển đổi tab đa hoạt động:** Hiển thị danh sách các hoạt động đang chạy song song (`Hoạt động song song: [📝 Kì thi] [📁 Thu - phát bài]`), giáo viên có thể chuyển đổi quan sát và điều khiển tức thời mà không phải dừng hoạt động nào.
   - **Phím tắt khởi chạy song song:** Khi đang mở kỳ thi, xuất hiện nút nhanh `📁 Mở thêm Thu - phát bài`; khi đang mở thu bài tập, xuất hiện nút nhanh `📝 Khởi chạy thêm Kì thi`.
   - **Cửa sổ trình chiếu độc lập (`ActivityHostWindow`):** Phân lập các luồng sự kiện WebSocket và trạng thái theo `runId`, bảo đảm mở cửa sổ trình chiếu cho kỳ thi hoặc bài tập không bị nhiễu chéo dữ liệu.

## [2.0.33] - 2026-10-10

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 1.1 (Cập nhật Schema CSDL & Migration)

1. **Schema CSDL SQLite (`packages/db`)**:
   - Thêm bảng `exams`: Quản lý thực thể kỳ thi lâu dài theo lớp học (`classId`), độc lập với phiên học ngắn hạn. Hỗ trợ cấu hình `durationMinutes`, `configJson`, `questionsSnapshotJson`, trạng thái kỳ thi (`ready`, `in_progress`, `waiting_next_batch`, `finished`), ca hiện tại `currentBatch`, và phiên liên kết `activeSessionId`.
   - Thêm bảng `exam_records`: Lưu kết quả làm bài của từng học sinh theo `examId` và `studentId`. Hỗ trợ phân biệt ca thi `batchIndex`, điểm số, phần trăm, số câu đúng, chi tiết đáp án `answersJson` và kết quả chấm `resultJson`.

2. **Migration & Tự Động Đồng Bộ CSDL**:
   - Tạo file migration `packages/db/src/migrations/0004_exams_and_records_schema.sql`.
   - Tích hợp version 4 vào `EMBEDDED_MIGRATIONS` và schema guard `ensureSchemaIntegrity` trong `packages/db/src/migrator.ts`.

3. **Repositories & Unit Tests**:
   - Xây dựng `ExamRepository` (`create`, `findById`, `list`, `attachSession`, `detachSession`, `update`, `delete`).
   - Xây dựng `ExamRecordRepository` (`create`, `upsert`, `findById`, `findByExamAndStudent`, `listByExam`, `listByStudent`, `delete`).
   - Viết unit test `packages/db/src/__tests__/exam-repository.test.ts` kiểm thử toàn diện luồng tạo kỳ thi $\rightarrow$ mở Ca 1 $\rightarrow$ nộp bài $\rightarrow$ tạm dừng Ca 1 $\rightarrow$ mở Ca 2 ở phiên mới $\rightarrow$ nộp bài $\rightarrow$ tổng hợp kết quả cả 2 ca.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 1.2 (Định nghĩa DTO & Zod Schemas Protocol)

1. **Giao thức & Hợp đồng DTO (`packages/protocol`)**:
   - Thêm enum `ExamStatusSchema` (`ready`, `in_progress`, `waiting_next_batch`, `finished`) và `ExamRecordStatusSchema` (`in_progress`, `submitted`) vào `enums.ts`.
   - Tạo module `packages/protocol/src/exam-management.ts` cung cấp đầy đủ các Zod schema: `CreateExamRequestSchema`, `UpdateExamRequestSchema`, `StartExamBatchRequestSchema`, `PauseExamBatchRequestSchema`, `FinishExamRequestSchema`, `ExamRecordDtoSchema`, `ExamListItemDtoSchema`, `ExamDetailDtoSchema`, `ExamStatsSchema`, `ExamGradeDistributionSchema`, `StudentExamEligibilityDtoSchema`.
   - Re-export toàn bộ qua `packages/protocol/src/index.ts`.
   - Viết unit test `packages/protocol/src/__tests__/exam-management.test.ts` kiểm tra tính hợp lệ và các điều kiện biên của schema.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 2.1 (Xây dựng Route Backend `/api/exams`)

1. **REST Endpoints (`packages/server/src/routes/exams.ts`)**:
   - `GET /api/exams`: Lấy danh sách kỳ thi của giáo viên kèm thống kê tiến độ nộp bài (`submittedCount / totalStudents`), ca thi hiện tại và điểm trung bình.
   - `POST /api/exams`: Khởi tạo kỳ thi mới từ một lớp học và bộ đề hoặc danh sách câu hỏi trực tiếp (tự động snapshot câu hỏi vào CSDL).
   - `GET /api/exams/:id`: Lấy chi tiết kỳ thi, danh sách điểm toàn bộ học sinh trong lớp, biểu đồ phổ điểm (`tot`, `kha`, `dat`, `chuaDat`) và ma trận phân tích độ đúng từng câu hỏi.
   - `PUT /api/exams/:id`: Cập nhật tiêu đề, môn học, thời lượng và cấu hình kỳ thi.
   - `DELETE /api/exams/:id`: Xóa kỳ thi và các bài làm liên quan.
   - `POST /api/exams/:id/start-batch`: Kích hoạt ca thi tiếp theo trong phiên học đang mở của giáo viên, tự động chuyển danh sách học sinh đã nộp ở ca trước (`completedStudentIds`) xuống ActivityEngine để khóa danh tính.
   - `POST /api/exams/:id/pause-batch`: Tạm dừng ca thi hiện tại, kết thúc lượt thi trong phiên và chuyển trạng thái sang `waiting_next_batch`.
   - `POST /api/exams/:id/finish`: Chốt hoàn tất toàn bộ kỳ thi.
   - `GET /api/exams/:id/eligibility`: Kiểm tra điều kiện dự thi của từng học sinh trong lớp (đã nộp hay chưa).
2. **Đăng ký Server & Tests**:
   - Khởi tạo và decorate `examRepo`, `examRecordRepo` trong `packages/server/src/app.ts`.
   - Viết integration test `packages/server/src/__tests__/exam-management-routes.test.ts` kiểm thử toàn bộ vòng đời kỳ thi qua REST API.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 2.2 (Xuất Excel Báo Cáo Kỳ Thi Tổng Hợp 3 Sheets)

1. **Excel Export Service (`packages/server/src/services/excel-service.ts`)**:
   - Thêm phương thức `exportExamReportBuffer(input: ExamExportInput): Buffer`.
   - Tạo file bảng tính chuẩn `.xlsx` gồm 3 trang tính (sheets):
     - **Sheet 1 — Bảng điểm lớp:** Tóm tắt thông tin kỳ thi (tên bài, môn, lớp, sĩ số, số HS dự thi, điểm TB, cao/thấp nhất), kèm bảng điểm toàn bộ học sinh trong lớp (STT, Mã HS, Họ tên, Trạng thái "Đã hoàn thành" / "Chưa dự thi", Ca thi, Điểm số, Thang điểm, Tỉ lệ đúng %, Số câu đúng, Tổng câu, Thời gian làm bài, Thời điểm nộp).
     - **Sheet 2 — Phổ điểm:** Bảng thống kê xếp loại học lực theo 4 mức chuẩn (Giỏi/Tốt, Khá, Đạt, Chưa đạt) kèm số lượng và tỉ lệ phần trăm.
     - **Sheet 3 — Phân tích câu hỏi:** Ma trận thống kê từng câu hỏi (STT, Mã câu hỏi, Tỉ lệ làm đúng %, Số học sinh làm đúng, Tổng số lượt trả lời).
2. **REST Endpoint Export Excel (`packages/server/src/routes/exams.ts`)**:
   - Thêm `GET /api/exams/:id/export-excel` với phân quyền Owner Guard và Admin.
   - Trả về buffer với header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` và `Content-Disposition: attachment; filename="BangDiem_<examId>.xlsx"`.
3. **Integration Test**:
   - Bổ sung test case kiểm tra export Excel trong `packages/server/src/__tests__/exam-management-routes.test.ts` xác thực đầy đủ 3 sheets và dữ liệu học sinh của cả 2 ca.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 3.1 (Tích Hợp Tự Động Lưu Kết Quả & Trao Thưởng EXP)

1. **Schema Hoạt Động Thi (`packages/activities/exam`)**:
   - Mở rộng `ExamConfigSchema` và `ExamStateSchema` hỗ trợ các trường ca thi: `examId`, `batchIndex`, `completedStudentIds`.
   - Thêm cờ `rewardGranted` vào `ParticipantExamStatusSchema` để trao thưởng EXP ngay lập tức khi học sinh nộp bài (`submit_exam` hoặc GV `force_submit_student`), đồng thời chống trùng lặp điểm thưởng khi kỳ thi kết thúc (`onEnd`).
2. **Tự Động Ghi Bản Ghi Kỳ Thi (`packages/server/src/activity/engine.ts`)**:
   - Thêm `examRecordRepo` vào `ActivityEngineOptions` và khởi tạo trong `app.ts`.
   - Thêm phương thức `persistExamRecordIfApplicable`: Tự động trích xuất thông tin bài làm (`studentId`, `batchIndex`, `score`, `percentage`, `correctCount`, `answersJson`, `resultJson`, `timeSpentSeconds`) và ghi nhận vào bảng `exam_records` qua `examRecordRepo.upsert`.
   - Thêm phương thức `persistAllExamRecordsOnEnd`: Chốt toàn bộ kết quả của các học sinh trong phiên khi hoạt động thi kết thúc hoặc đóng ca.
   - Cơ chế khóa danh tính cấp máy chủ (REQ-3): Từ chối các ý định làm bài (`get_paper`, `save_answer`, `submit_exam`) từ các thí sinh đã nộp ở ca trước với mã lỗi `ALREADY_SUBMITTED`.
3. **Integration Test Toàn Diện**:
   - Viết test suite `packages/server/src/__tests__/exam-activity-persistence.test.ts` mô phỏng toàn bộ quy trình: Mở Tiết 1 $\rightarrow$ HS1 thi Ca 1 $\rightarrow$ Nộp bài $\rightarrow$ Ghi `exam_records` & nhận EXP $\rightarrow$ Đóng Tiết 1 $\rightarrow$ Mở Tiết 2 $\rightarrow$ Mở Ca 2 $\rightarrow$ HS1 bị chặn `ALREADY_SUBMITTED` $\rightarrow$ HS2 thi Ca 2 và nộp bài $\rightarrow$ Tích hợp đủ 2 ca vào 1 kỳ thi.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 3.2 (Khóa Học Sinh Đã Thi ở Ca Trước tại Cổng Học Sinh)

1. **Mở Rộng Giao Thức & CSDL**:
   - Thêm phương thức `findBySessionId(sessionId)` trong `ExamRepository`.
   - Bổ sung trường tùy chọn `isCompletedExam?: boolean` vào `StudentRosterItemSchema` trong `@educlass/protocol`.
   - Thêm mã lỗi chuẩn `ALREADY_SUBMITTED` vào `ERROR_CODES`, `ErrorCodeSchema` và `ERROR_MESSAGES_VI` trong `@educlass/protocol`.
2. **Bảo Vệ Đa Lớp Cấp Máy Chủ (`packages/server/src/routes/sessions.ts`)**:
   - Route `GET /api/sessions/code/:code/roster`: Tự động tra cứu kỳ thi gắn với phiên học và tập hợp danh sách các học sinh đã nộp bài (`status === 'submitted'`), gán cờ `isCompletedExam: true` để giao diện học sinh hiển thị trực quan.
   - Route `POST /api/sessions/join`: Kiểm tra nghiêm ngặt `findByExamAndStudent`. Nếu học sinh đã có bài nộp ở ca trước, từ chối tham gia với mã lỗi HTTP 400 `ALREADY_SUBMITTED` và thông điệp tiếng Việt dễ hiểu.
3. **Giao Diện Cổng Chọn Tên Học Sinh (`apps/student-ui/src/components/StudentPortal.tsx`)**:
   - Vô hiệu hóa nút chọn tên đối với học sinh có `isCompletedExam = true`.
   - Hiển thị badge xanh nổi bật `✓ Đã hoàn thành` bên cạnh tên học sinh đã thi.
   - Nếu học sinh cố tình bấm hoặc thao tác, hiển thị thông báo thân thiện: *"Bạn đã hoàn thành bài thi ở ca trước. Vui lòng nhường máy cho bạn ca sau."*.
4. **Màn Hình Khóa Trong Hoạt Động Thi (`packages/activities/exam/src/exam-views.tsx`)**:
   - Bổ sung màn hình khóa `isLockedFromPreviousBatch` giải thích rõ ràng kết quả đã được ghi nhận vào hệ thống nếu thí sinh mở giao diện thi.
5. **Unit & Integration Tests**:
   - Viết test case trong `apps/student-ui/src/__tests__/student-portal.test.tsx` xác thực hành vi disable, badge và chặn click của học sinh đã thi ca trước.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 4.1 (Tạo Tab ExamReportsTab trong Teacher UI)

1. **Client API Mở Rộng (`apps/teacher-ui/src/api/client.ts`)**:
   - Bổ sung các phương thức tương tác với REST API `/api/exams`: `getExams`, `getExamDetail`, `createExam`, `updateExam`, `deleteExam`, `startExamBatch`, `pauseExamBatch`, `finishExam`, `getExamEligibility`.
2. **Component Quản Lý & Báo Cáo Kỳ Thi (`apps/teacher-ui/src/components/ExamReportsTab.tsx`)**:
   - Xây dựng giao diện Tab trực quan, tuân thủ nghiêm ngặt Design Token (`ui-kit`) và kích thước cảm ứng $\ge 48$px.
   - Bộ lọc linh hoạt: lọc theo lớp học, lọc theo trạng thái (`all`, `in_progress`, `waiting_next_batch`, `ready`, `finished`), ô tìm kiếm nhanh theo tiêu đề và môn học.
   - Thẻ kỳ thi trực quan (Exam Card): hiển thị thông tin bài thi, môn học, lớp học, thời lượng, huy hiệu trạng thái ca thi (`● Đang mở Ca X`, `⏸ Chờ ca tiếp theo`, `✓ Đã hoàn thành`), thanh tiến độ % nộp bài (`submitted/total HS`), và điểm trung bình lớp.
   - Nút điều phối ca thi:
     - `[▶ Mở Ca tiếp theo trong phiên này]`: Kích hoạt ca thi vào phòng học hiện tại của giáo viên, tự động khóa danh tính học sinh đã thi ở ca trước.
     - `[⏸ Tạm dừng ca thi]`: Dừng ca thi hiện tại để chuyển sang trạng thái chờ ca sau, lưu an toàn toàn bộ bài đã nộp.
     - `[🏁 Hoàn tất kỳ thi]`: Chốt sổ điểm và kết thúc kỳ thi vĩnh viễn.
     - `[📊 Xem bảng điểm & Phân tích]`, `[📥 Tải Excel]`: Tải file `.xlsx` bảng điểm đầy đủ 3 sheets.
   - Trạng thái rỗng và đang tải với thông điệp hướng dẫn rõ ràng.
3. **Tích Hợp Điều Hướng (`apps/teacher-ui/src/App.tsx`)**:
   - Thêm tab `'exam-reports'` (`📝 Báo cáo Kỳ thi`) vào thanh menu điều hướng chính của Giáo viên.
4. **Unit Tests**:
   - Viết test suite `apps/teacher-ui/src/__tests__/exam-reports-tab.test.tsx` kiểm thử toàn diện danh sách kỳ thi, các thao tác mở ca, tạm dừng ca và trạng thái rỗng.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 4.2 (Modal Xem Báo Cáo & Bảng Điểm Chi Tiết)

1. **Component Modal Báo Cáo Chi Tiết (`apps/teacher-ui/src/components/ExamReportDetailModal.tsx`)**:
   - **Tóm tắt chỉ số**: Sĩ số & Tiến độ nộp bài (`submitted/total HS`), Điểm trung bình cả lớp (thang điểm 10.0), Điểm cao nhất, Điểm thấp nhất.
   - **Biểu đồ phổ điểm trực quan (Grade Distribution)**: Thanh xếp loại ngang (Stacked Bar) phân loại 4 mức chuẩn: Giỏi / Tốt ($\ge 8.0$), Khá (6.5 – 7.9), Đạt (5.0 – 6.4), Chưa đạt ($< 5.0$) kèm số lượng và phần trăm học sinh.
   - **Bảng điểm học sinh**: Danh sách học sinh đầy đủ các cột: STT, Họ và tên, Mã học sinh, Ca thi (Ca 1 / Ca 2), Số câu đúng, Điểm số, Xếp loại học lực, Thời gian làm bài (phút:giây), Thời điểm nộp bài.
   - **Bộ lọc & Sắp xếp**: Hỗ trợ lọc theo Ca thi (`Ca 1`, `Ca 2`), tìm kiếm theo tên hoặc mã HS, sắp xếp động theo tên, điểm số, ca thi, thời gian nộp.
   - **Phân tích câu hỏi (Question Analysis)**: Tab phân tích độ đúng từng câu hỏi từ Câu 1 đến Câu N kèm tỉ lệ %, màu sắc cảnh báo câu có độ sai cao.
   - **Tải Excel**: Nút `[📥 Tải bảng điểm Excel]` gọi tải trực tiếp file `.xlsx` 3 sheets.
2. **Tích hợp Tương tác**:
   - Tích hợp trực tiếp vào nút `[📊 Xem bảng điểm & Phân tích]` trên từng thẻ kỳ thi trong `ExamReportsTab`.
3. **Unit Tests**:
   - Viết test suite `apps/teacher-ui/src/__tests__/exam-report-detail-modal.test.tsx` kiểm thử hiển thị thống kê, bảng điểm học sinh, lọc theo ca thi và tải file Excel.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Task 4.3 (Modal Tạo Kỳ Thi Mới)

1. **Component Modal Tạo Kỳ Thi (`apps/teacher-ui/src/components/CreateExamModal.tsx`)**:
   - Form thiết lập trực quan: Tiêu đề kỳ thi, Môn học, Lớp học áp dụng, Chọn bộ đề từ Kho đề thi (kèm số lượng câu hỏi).
   - Tự động gợi ý điền tiêu đề bài thi và môn học khi giáo viên chọn bộ đề từ Kho đề.
   - Thiết lập thời lượng thi linh hoạt với các nút preset bấm nhanh: `15 phút`, `30 phút`, `45 phút`, `60 phút`, `90 phút`.
   - Cấu hình chuyên sâu chống gian lận & công bố kết quả:
     - 🔀 **Xáo trộn thứ tự câu hỏi**: Mỗi học sinh nhận đề với thứ tự câu hỏi ngẫu nhiên khác nhau.
     - 🔀 **Xáo trộn thứ tự đáp án (A, B, C, D)**: Đảo ngẫu nhiên các lựa chọn trong từng câu.
     - 👁️ **Cho xem điểm sau khi nộp**: Học sinh biết kết quả ngay khi bấm nộp bài.
     - 📝 **Cho xem lại bài & đáp án đúng**: Học sinh xem lại câu đúng/sai và lời giải sau khi nộp bài.
     - 🔒 **Mã bảo vệ đề thi**: Mật khẩu tùy chọn yêu cầu nhập trước khi làm bài.
   - Validation dữ liệu chặt chẽ và thông báo lỗi tiếng Việt dễ hiểu.
2. **Tích hợp Vào Tab Báo Cáo (`ExamReportsTab.tsx`)**:
   - Nút `[➕ Tạo kỳ thi mới]` ở thanh công cụ và nút `[➕ Tạo kỳ thi đầu tiên ngay]` ở trạng thái rỗng kích hoạt trực tiếp `CreateExamModal`.
   - Tự động làm mới danh sách bài thi ngay sau khi tạo thành công.
3. **Unit Tests**:
   - Viết test suite `apps/teacher-ui/src/__tests__/create-exam-modal.test.tsx` kiểm thử nạp form, validation dữ liệu, các nút chọn nhanh thời lượng và gửi request tạo kỳ thi thành công.

### Kỳ Thi Theo Ca & Báo Cáo Kỳ Thi Lâu Dài — Giai Đoạn 5 (Kiểm Tra & Nghiệm Thu Toàn Diện)

1. **Kiểm Tra Typecheck Toàn Diện (`pnpm run typecheck`)**:
   - Chạy `tsc -b` trên toàn bộ monorepo (`packages/protocol`, `packages/db`, `packages/core`, `packages/ui-kit`, `packages/question-kit`, `packages/server`, `apps/teacher-ui`, `apps/student-ui`). Toàn bộ vượt qua không có bất kỳ lỗi cú pháp hoặc kiểu dữ liệu nào.
2. **Kịch Bản Mô Phỏng Thực Tế 40 Học Sinh / 2 Ca Thi (`packages/server/src/__tests__/exam-multi-batch-simulation.test.ts`)**:
   - Mô phỏng lớp 40 học sinh:
     - **Ca 1 (Tiết 1):** 20 học sinh đầu tham gia, làm bài, nộp bài, điểm số được ghi nhận vào `exam_records` với `batchIndex = 1`. Giáo viên tạm dừng ca 1 (`pause-batch`) và đóng Tiết 1 an toàn.
     - **Ca 2 (Tiết 2):** Giáo viên mở phiên mới, kích hoạt Ca 2 (`start-batch`). Cổng chọn tên (`roster`) hiển thị badge đã thi cho 20 em Ca 1; nếu cố tình join bị từ chối `ALREADY_SUBMITTED`. 20 học sinh Ca 2 tham gia và nộp bài với `batchIndex = 2`.
     - **Tổng hợp & Báo cáo:** Kỳ thi kết thúc (`finished`), tổng hợp đầy đủ 40/40 học sinh (100%), tính toán phổ điểm, phân tích câu hỏi chính xác.
     - **Xuất Excel:** API trả về file `.xlsx` bảng điểm đầy đủ 3 sheets với định dạng nhị phân chuẩn.

## [2.0.32] - 2026-10-09

### Ra Mắt Hoạt Động "Đại Chiến Lãnh Thổ" (Territory War) — Game Chiến Thuật Thời Gian Thực Chia 2 Phe Đối Kháng

1. **Module Activity Độc Lập Chuẩn Kiến Trúc (`@educlass/activity-territory-war`)**:
   - Triển khai đầy đủ theo hợp đồng plugin `ActivityModule`: `territory-schemas.ts`, `territory-logic.ts`, `territory-activity.ts`, `TerritoryGrid.tsx`, `TerritoryStudentView.tsx`, `TerritoryProjectorView.tsx`, `TerritoryTeacherPanel.tsx`.
   - Đăng ký vào hệ thống qua 1 dòng import tại `packages/server/src/activity/registry.ts`, `apps/teacher-ui/src/activities/index.ts`, `apps/teacher-ui/src/components/ActivityPanel.tsx` và `apps/student-ui/src/components/ActivityHost.tsx`.

2. **Quy Tắc Bản Đồ & Vị Trí Chiến Lược (5x5, 7x7, 9x9)**:
   - Căn cứ xuất phát 2 phe: Cột $x=0$ (Căn cứ Phe Xanh) và Cột $x=N-1$ (Căn cứ Phe Đỏ).
   - Lâu Đài Lớn (5 HP, 20 điểm, gia cố tối đa 4 lần) tọa lạc tại chính tâm bản đồ.
   - 2 Tháp Canh (2 HP, 5 điểm, gia cố tối đa 2 lần) ở trên và dưới chia đôi bản đồ theo trục dọc.
   - 2 Lâu Đài Nhỏ (3 HP, 10 điểm, gia cố tối đa 3 lần) ở hai cánh Đông - Tây của Lâu Đài Lớn.
   - Các ô Đất thường (1 HP, 1 điểm, gia cố tối đa 1 lần).

3. **Cơ Chế Chiến Đấu, Giằng Co Máu & Khóa Ô Tranh Chấp (Concurrency Safe)**:
   - **Luật liền kề 4 hướng:** Học sinh chỉ được tấn công các ô có cạnh kề (Đông - Tây - Nam - Bắc) với lãnh thổ phe mình đang kiểm soát.
   - **Khóa ô thời gian thực (Occupied Lock):** Khi một học sinh chạm vào ô, ô đó lập tức khóa (`lockedBy`), ngăn người khác can thiệp.
   - **Cơ chế giằng co máu khi Trung Lập:** Đòn đánh đúng tích lũy $HP$ nghiêng dần về phe tấn công, đạt max $HP$ thì chiếm thành công.
   - **Cơ chế dứt điểm khi Đã Có Chủ Quyền:** Khi ô đã thuộc về 1 phe, đối phương công phá phải bóc hết lớp gia cố phòng thủ trước, sau đó trừ máu gốc về 0 là **chuyển quyền sở hữu ngay lập tức cho phe tấn công** (không giằng co nữa).
   - **Gia cố phòng thủ:** Thành viên cùng phe trả lời đúng trên ô phe mình sẽ tăng cấp giáp bảo vệ và cộng thêm +1 điểm cho đội.
   - **Hồi chiêu 3s:** Khi trả lời sai, học sinh chịu thời gian hồi chiêu 3s để nhường lượt cho đồng đội khác.

4. **Điều Kiện Kết Thúc & Luật Thắng Sudden Death**:
   - Tùy chọn luật Sudden Death: Phe nào đánh chiếm được **Lâu Đài Lớn** hoặc **Cả 2 Lâu Đài Nhỏ** sẽ giành chiến thắng chung cuộc ngay lập tức.
   - Tính điểm theo thời gian (3 phút, 5 phút, 10 phút) hoặc giáo viên bấm nút "Kết thúc sớm".

5. **Giao Diện Đa Thiết Bị & Âm Thanh Offline**:
   - **Học sinh (StudentView):** Tối ưu mobile-first 360x640, highlight ô hợp lệ, modal câu hỏi lớn với 4 phím màu kèm hình khối Kahoot (▲◆●■, $\ge 48\text{px}$).
   - **Màn chiếu (ProjectorView):** Bố cục tỷ lệ vàng $70\% : 30\%$, thanh kéo co % lãnh thổ thời gian thực, bản đồ SVG lớn và Bảng xếp hạng Tướng lĩnh hai phe.
   - **Bảng điều khiển (TeacherPanel):** Cân bằng quân đội 1-click, đổi phe cho học sinh, nút mở nhanh màn chiếu lớp học.
   - **Hiệu ứng âm thanh:** Sử dụng Web Audio API synthesizer offline 100% cho tiếng kiếm chém, kèn xuất trận, khiên giáp và thất bại.

## [2.0.31] - 2026-10-09

### Ra Mắt Hoạt Động "Camera Vật Thể" (Giai Đoạn 1) — Biến Điện Thoại Thành Máy Soi Bài Thông Minh

1. **Module Activity Độc Lập Chuẩn Kiến Trúc (`@educlass/activity-object-camera`)**:
   - Đóng gói hoàn chỉnh theo hợp đồng plugin `ActivityModule`: `object-camera-schemas.ts`, `object-camera-activity.ts`, `ObjectCameraTeacherPanel.tsx`, `ObjectCameraStudentView.tsx`, `ObjectCameraProjectorView.tsx`.
   - Đăng ký vào hệ thống qua 1 dòng import tại `packages/server/src/activity/registry.ts`, `apps/teacher-ui/src/activities/index.ts`, `apps/teacher-ui/src/components/ActivityPanel.tsx` và `apps/student-ui/src/components/ActivityHost.tsx`.

2. **Cơ Chế Bảo Mật & Kết Nối "Chỉ Giáo Viên Chụp" (Teacher-Only Guard)**:
   - Mã QR và liên kết chụp ảnh (`/snap?token=...`) chỉ hiển thị độc quyền trong Modal bảo mật trên máy tính của giáo viên (tuyệt đối không hiện trên máy chiếu hay cổng học sinh).
   - Trang Webapp Mobile siêu nhẹ (Zero-Install) dành cho điện thoại GV: gọi trực tiếp Camera sau gốc của máy, có chế độ "Tự động gửi ngay sau khi chụp" để chụp liên tục nhiều bài khi đi quanh lớp, nén ảnh tự động trước khi POST qua mạng LAN.
   - Hỗ trợ đổi mã token mới (`REGENERATE_TOKEN`) và nút khóa cổng chụp tức thì (`TOGGLE_LOCK_CAPTURE`).

3. **Bộ Công Cụ Xử Lý Ảnh & Chữa Bài Trực Quan (Visualizer Canvas)**:
   - Xoay 90° từng nhịp (`rotation: 0 | 90 | 180 | 270`).
   - Cắt xén (Crop rect tool) để loại bỏ mép bàn, viền thừa của vở.
   - Bộ lọc ảnh tài liệu: Tăng tương phản (`contrast(1.6) brightness(1.1)`) và Trắng đen (`grayscale(1) contrast(1.8)`) giúp nền vở sáng trắng và chữ viết tay rõ nét như máy scan.
   - Bộ bút sửa bài: Bút mực đỏ/xanh/đen với thanh trượt cỡ nét, Bút dạ quang vàng neon bán trong suốt, Con dấu sư phạm Đúng (✓), Sai (✗), Sao khen thưởng (★), Tẩy, Hoàn tác (Undo) và Xóa sạch nét.
   - Điều hướng khung nhìn: Pan kéo di chuyển tự do, Zoom lăn chuột 20% – 500% và nút Vừa màn hình (Fit).
   - Hỗ trợ tải file ảnh trực tiếp từ máy tính giáo viên lên bảng.
   - Nút xuất file ảnh PNG hoàn chỉnh ghép ảnh bài làm và các nét bút đỏ về máy tính để gửi phụ huynh.

4. **Đồng Bộ Thời Gian Thực Siêu Nhẹ (Vector & Viewport Sync)**:
   - Tải file ảnh gốc 1 lần duy nhất qua HTTP nội bộ (`/api/object-camera/files/:sessionId/:filename`).
   - Mọi thao tác xoay, cắt, zoom, pan và các nét vẽ vector được đồng bộ thời gian thực qua WebSocket dưới dạng gói tin siêu nhẹ (~50 bytes), không stream video nặng nề, giữ nguyên độ nét 60 FPS trên màn hình học sinh (mobile-first 360×640) và máy chiếu.

5. **Cơ Chế Lưu Trữ Tạm & Tự Động Dọn Dẹp File (Zero-Trash Lifecycle)**:
   - Mặc định lưu ảnh tạm vào thư mục `data/temp/object-camera/<sessionId>/`.
   - Khay ảnh dưới đáy (Filmstrip): xem thumbnail, nút [X] xóa ngay từng ảnh, nút [📌] ghim bài mẫu vào kho tư liệu.
   - Nút "Dọn rác": 1 click xóa toàn bộ ảnh tạm chưa được ghim.
   - Cơ chế tự hủy khi đóng phiên: Khi giáo viên kết thúc tiết học, hệ thống tự động xóa sạch thư mục tạm của phiên, không để lại rác trên ổ cứng máy tính.

6. **Tích Hợp Khen Thưởng EXP Trực Tiếp**:
   - Gắn bài làm với học sinh trong danh sách lớp; nút bấm nhanh "+10 EXP", "+20 EXP", "+50 EXP" phát sóng hiệu ứng chúc mừng nổ pháo hoa trên màn hình học sinh và banner vinh danh trên máy chiếu.

## [2.0.30] - 2026-10-09

### Nâng Cấp Hoạt Động Thu - Phát Bài Tập: Trình Xem Trước & Đánh Số Lần Nộp

1. **Khắc Phục Lỗi Tràn Khung Trắng Xem Trước File Word (.docx)**:
   - Sửa cấu trúc container từ Flexbox centering sang layout khối dòng chảy (`min-h-fit`, cuộn dọc độc lập), giúp trang giấy mở rộng toàn vẹn 100% theo nội dung thực tế, không còn bị cắt xén hay tràn ra ngoài nền xám.
2. **Hiển Thị Bảng Biểu & Đường Viền Lưới (Word & Excel)**:
   - Cung cấp style CSS chuyên dụng cho bảng trong file Word với viền rõ nét (`1px solid #475569`), padding chuẩn và màu nền xen kẽ.
   - Thêm tiêu đề cột (A, B, C...) và số hàng (1, 2, 3...) cùng đường lưới ô chuẩn cho bảng tính Excel; sử dụng `defval: ''` tránh mất ô rỗng.
3. **Xem Trực Tiếp File PDF Trong Trình Duyệt (Không Bắt Tải Về)**:
   - Thêm tham số `?inline=true` tại endpoint tải file để trả về header `Content-Disposition: inline` với MIME `application/pdf`, cho phép trình duyệt hiển thị PDF trực tiếp trong iframe xem trước mà không ép tải về máy tính.
4. **Bổ Sung Nút "Đổi Học Sinh" / Thoát Tài Khoản**:
   - Thêm nút "🚪 Đổi học sinh" ở thanh tiêu đề và khối đã nộp bài tại cổng học sinh (`assignment-view` và component `AssignmentStudentView.tsx`), hỗ trợ các phòng máy tin học có nhiều học sinh thay phiên nộp bài trên cùng một máy tính.
5. **Tự Động Đánh Số Lần Nộp Bài Cho Cùng Học Sinh**:
   - Khi một học sinh nộp lại tệp cùng tên, hệ thống tự động đánh số tăng dần trên đĩa (`_lan2.docx`, `_lan3.docx`...) và hiển thị huy hiệu `(Lần 2)`, `(Lần 3)` trên giao diện danh sách giáo viên, tránh ghi đè làm mất bài cũ.
6. **Bổ Sung Khu Vực Đính Kèm Phát Tài Liệu Ngay Lúc Cấu Hình & Làm Nổi Bật Trong Bảng Điều Khiển**:
   - Cho phép giáo viên đính kèm sẵn các file đề bài, hình ảnh, tài liệu mẫu ngay tại hộp thoại cấu hình ban đầu (`ActivityPanel.tsx`) để tự động phát cho học sinh ngay khi mở cổng.
   - Nâng cấp khối "📢 Tài liệu phát xuống cho học sinh" trong bảng điều khiển giáo viên (`AssignmentTeacherPanel.tsx`): hiển thị nút kêu gọi hành động (CTA) nổi bật và nút bấm rõ ràng khi chưa có tệp hoặc muốn phát thêm tệp mới.


### Khắc Phục Lỗi Chế Độ Bắn Vịt (Duck Hunt): Tự Động Nạp Vịt Khi Mở, Rê Chuột Tâm Ngắm & Kích Hoạt Quay Chuẩn

1. **Khắc Phục Lỗi `Cannot read properties of null (reading 'remove')`**:
   - Bổ sung kiểm tra an toàn `app?.ticker?.remove(...)` khi unmount chế độ đua vịt (`DuckRaceMode`) và dọn dẹp các DisplayObject trong `DuckHuntMode`.

2. **Khắc Phục Vịt Không Hiện Khi Mới Mở Chế Độ**:
   - Gọi trực tiếp `rebuildDucks` ngay khi khởi tạo xong Pixi Application Canvas thay vì chờ useEffect phụ thuộc, giúp đàn vịt bơi ngang ngay lập tức khi mở tab.

3. **Khắc Phục Nút Quay Bắn & Tâm Ngắm Đứng Yên**:
   - Bổ sung `case 'duck_hunt': handleTriggerPickDuckHunt(strategy)` trong `handleTriggerPick` của `RandomPickerTab.tsx` và nhánh xử lý tương ứng trên `RandomPickerProjectorWindow.tsx`.
   - Bổ sung tính năng rê chuột điều khiển tâm ngắm tự do trước khi nổ súng.
   - Sửa lỗi text hiển thị tên học sinh bị lộn ngược khi phóng to bằng cách chỉ nghiêng ngã thân vịt (`duckBody`) trong khi bảng tên vinh danh vẫn giữ thẳng đứng hướng lên và viền vàng rực rỡ.

## [2.0.28] - 2026-10-09

### Ra Mắt Tính Năng Chiếu & Chữa Bài PDF/Word (Mô Hình A: Cắt Dãn Khoảng Trống)

1. **Module Activity Độc Lập `@educlass/activity-pdf-presenter`**:
   - Tuân thủ hợp đồng Activity Plugin (D12), đăng ký sạch sẽ vào ActivityRegistry server và Client UI.
   - Hỗ trợ chiếu tài liệu PDF và tự động trích xuất/phân trang file Word (.docx) sang các trang tài liệu chuẩn A4.

2. **Cơ Chế Cắt Dãn Khoảng Trống (Mô Hình A — Vertical Split & Push Gap)**:
   - Cho phép giáo viên click vào bất kỳ vị trí nào giữa các câu hỏi để chèn khoảng trống viết lời giải.
   - Nửa trên trang giữ nguyên, nửa dưới tự động đẩy xuống; ở giữa chèn vùng bảng trắng với tùy chọn hoa văn:
     + 📐 Ô ly tập học sinh (lưới caro xanh nhạt chuẩn vở ô ly 4 ly / 5 ly).
     + 📝 Dòng kẻ ngang vở viết.
     + ⬜ Trắng trơn.
   - Kèm thanh trượt co dãn chiều cao trực tiếp (100px - 700px) và nút xóa khôi phục trang gốc.

3. **Bộ Công Cụ Bút Vẽ Vector Đè Lên Trang**:
   - 🖊️ Bút viết chữa bài (Đỏ, xanh, lá, đen, cam; nét 2px, 4px, 6px).
   - 🖍️ Bút dạ quang (Highlighter - vàng, xanh neon, hồng neon; blend multiply mềm mượt không che chữ đề bài).
   - 🧹 Tẩy (Eraser), Hoàn tác (Undo) và Xóa sạch trang.
   - 🔴 Con trỏ Laser Pointer thời gian thực dẫn dắt ánh nhìn học sinh.

4. **Học Sinh Ở Chế Độ Chỉ Xem (Read-Only) & Màn Chiếu Projector**:
   - Học sinh chỉ xem, tự động bám theo giáo viên theo thời gian thực (độ trễ <50ms qua mạng LAN).
   - Hỗ trợ chế độ xem lại trang cũ với nút nổi quay về vị trí thầy cô đang giảng.
   - Projector View toàn màn hình độ nét cao, ẩn thanh công cụ cho máy chiếu lớp học.

## [2.0.27] - 2026-10-09

### Nâng Cấp Đua Vịt: Chiếm 4/5 Màn Hình, Loại Bỏ Text Kịch Bản & Thêm 2 Kịch Bản Mới

1. **Màn Hình Đua Vịt Mở Rộng Chiếm 4/5 Màn Hình**:
   - Tăng chiều cao dòng sông từ `440px` lên `580px` (`usableHeight` tăng lên 470px), chiều rộng mở rộng tối đa `max-w-[96vw]` (lên đến 1550px).
   - Tối ưu phân bổ đàn vịt zíc zắc và giãn nở tự nhiên theo chiều dài sông (`flockSpread`), khắc phục triệt để hiện tượng đàn vịt bị dồn thành 1 cột dọc đứng như trước.

2. **Loại Bỏ Hoàn Toàn Tên Kịch Bản & Thanh Tiến Độ %**:
   - Xóa bỏ huy hiệu badge kịch bản (ví dụ "Song mã tranh hùng", "Lội ngược dòng...") và dòng mô tả để không làm lộ kịch bản trước khi đua.
   - Xóa bỏ hiển thị "100%" và thanh tiến độ màu vàng, giữ cho khung đua tập trung, thoáng đãng và sạch sẽ tuyệt đối.

3. **Bổ Sung 2 Kịch Bản Đua Mới (Tổng Cộng 5 Kịch Bản Phong Phú)**:
   - **Kịch bản 4: Hỗn chiến bầy vịt (Chaos Sprint)**: Cả đàn vịt chen chúc cuộn sóng xô đẩy nhau, vị trí dẫn đầu liên tục hoán đổi giữa nhiều chú vịt; ở 15% chặng cuối, chú vịt mục tiêu bất ngờ lách khe hẹp bứt tốc phi mã cán đích.
   - **Kịch bản 5: Tam mã phân tranh (Triple Threat)**: Ba chú vịt (Target và 2 đối thủ Rival 1, Rival 2) cùng bứt tốp tạo thành thế chân vạc tam mã, so kè 3 pha lệch nhau $120^\circ$ và cùng lao vào vạch đích trong tích tắc (chênh lệch chỉ vài centimet).

## [2.0.26] - 2026-10-09

### Tinh Chỉnh Đua Vịt: Ẩn Màu Mục Tiêu, Tách Tên Gọn Gàng & Khắc Phục Lỗi Chờ Đích

1. **Tuyệt Đối Không Tô Màu Vịt Nhất Từ Trước**:
   - Mọi chú vịt đều có màu thân, cánh, mỏ ngẫu nhiên/tuần tự theo bảng màu tự nhiên, không thiên vị hoặc gán màu vàng riêng biệt cho chú vịt thắng cuộc.
   - Bảng tên trên đầu vịt đồng bộ nền trắng viền xám đậm tương phản cao cho tất cả học sinh; loại bỏ hiệu ứng phát sáng sớm khi đang bơi để đảm bảo 100% kịch tính và bất ngờ đến tận vạch đích.

2. **Tách Họ Tên — Thu Gọn Bảng Tên Không Tốn Diện Tích**:
   - Thuật toán `buildStudentDisplayNameMap` tự động trích xuất TÊN chính (từ cuối cùng) của học sinh (vd: "Nguyễn Văn An" -> "An", "Trần Thị Kim Ngân" -> "Ngân").
   - Xử lý thông minh khi có học sinh trùng tên trong cùng một lớp: tự động bổ sung chữ cái đầu của họ (vd: "An (N.)" vs "An (T.)").
   - Bảng tên được thu gọn kích thước (cao 18px thay vì 22px, padding gọn), giúp nhìn rõ các chú vịt bơi lội, không che khuất nhau.

3. **Thuật Toán Chuyển Động Tự Nhiên — Khắc Phục Triệt Để Lỗi Dừng Chờ Ở Vạch Đích**:
   - Xây dựng lại các hàm tiến trình $progress(p)$ cho cả 3 kịch bản đảm bảo đạo hàm vận tốc luôn dương ($v > 0$) trên toàn bộ chặng đua: đàn vịt luôn liên tục bơi tiến lên phía trước.
   - Nhóm dẫn đầu trong kịch bản Lội ngược dòng (Comeback) chỉ tiến sát vạch đích ở $98.5\%$ tại thời điểm $p = 1.0$ khi vịt chiến thắng vừa bứt tốc qua vạch đích ở $101.5\%$.
   - Tuyệt đối không còn tình trạng chú vịt khác bơi tới vạch đích quá sớm rồi phải khựng lại chờ vịt chiến thắng.

## [2.0.25] - 2026-10-09

### Ra Mắt Chế Độ Bắn Vịt (Duck Hunt) Phong Cách Stopwatch Với Pixi.js & GSAP

1. **Trường Bắn Hội Chợ 3 Hàng (Carnival Shooting Gallery)**:
   - Dựng bối cảnh hội chợ cổ điển trên nền WebGL Canvas 60 FPS: 3 thanh ray gỗ trượt ngược chiều, rèm nhung đỏ viền trên cùng bóng đèn tròn carnival vàng ấm.
   - Các chú vịt vàng mang biển tên học sinh to, rõ nét, nền trắng viền đậm tương phản cao, lắc lư bồng bềnh tự nhiên theo sóng nước.

2. **Cơ Chế Săn Lùng Roulette Hunting (5–10 Chú Vịt Trước Khi Chốt)**:
   - Tâm ngắm súng săn (Reticle Crosshair) lướt zíc zắc nhảy qua từ 5 đến 10 chú vịt ngẫu nhiên giữa 3 hàng với tốc độ hãm phanh (chậm dần đều).
   - Mỗi lần tâm ngắm đáp qua 1 chú vịt: phát tiếng lách cách roulette (`soundManager.playReelTick`), chú vịt giật nảy 1.18x và sáng viền cảnh báo.
   - Tại chú vịt cuối cùng (mục tiêu chốt): Khóa tâm ngắm (Lock-on pulse 0.3s) -> NỔ SÚNG vang rền (`soundManager.playGunshot`) -> Muzzle Flash vàng rực -> Rung màn hình (Screen Shake) -> Lông vũ văng tứ phía -> Vịt ngã gục -> Phóng to 2x ra giữa màn hình vinh danh tên học sinh cùng tiếng chuông chiến thắng (`soundManager.playWinner`).

3. **Linh Hoạt Chế Độ Ẩn (Mystery Mode)**:
   - Tích hợp công tắc chuyển đổi linh hoạt giữa "Hiện tên học sinh" và "Chế độ ẩn (Dấu ? bí mật)".

## [2.0.24] - 2026-10-09

### Ra Mắt Trò Chơi Đua Vịt (Duck Race) Đỉnh Cao Với Pixi.js & 3 Kịch Bản Gay Cấn

1. **Kiến Trúc & Đồ Họa WebGL (ADR 0003)**:
   - Thông qua `docs/adr/0003-use-pixijs-for-duck-race.md`: Tích hợp thư viện đồ họa 2D WebGL `pixi.js@8.22.0` phục vụ render mượt mà 60 FPS đàn vịt bơi trên dòng sông lớn.
   - Hoàn toàn độc lập, 100% offline, không dùng CDN.
   - Hỗ trợ Flock Stacking (các chú vịt có thể bơi đè lên nhau chân thực với Z-index phân tầng Y tự nhiên, lắc lư theo sóng nước và bọt nước rẽ sóng sinh động).

2. **3 Kịch Bản Đua Kịch Tính (Race Director)**:
   - Hệ thống tự động chọn ngẫu nhiên 1 trong 3 kịch bản mỗi lượt đua:
     * **Cú lội ngược dòng thần thánh (Comeback)**: Vịt đích xuất phát ở nhóm sau, âm thầm bám đuổi và bứt tốc ngoạn mục ở nửa sau chặng đua để cán đích đầu tiên.
     * **Song mã tranh hùng (Duel / Photo Finish)**: Vịt đích và một chú vịt đối thủ bứt tốp so kè từng centimet suốt chặng đua, rượt đuổi nghẹt thở và chiến thắng sát nút ở vạch đích.
     * **Ngôi sao cô độc (Wire-to-Wire)**: Vịt đích vươn lên dẫn đầu ngay từ phát còi xuất phát và gồng mình bảo vệ ngôi đầu trước sự bám đuổi quyết liệt của đàn vịt bám sát phía sau.

3. **Hệ Thống Trải Nghiệm & Âm Thanh Toàn Diện**:
   - Camera tracking trượt mượt mà theo chú vịt dẫn đầu suốt hành trình từ vạch xuất phát tới vạch đích caro.
   - Hiệu ứng đếm ngược 3... 2... 1... GO!, tiếng còi lệnh xuất phát (`playWhistle`), tiếng quác quác vui nhộn (`playQuack`), và tiếng bọt nước rẽ sóng (`playWaterSplash`).
   - Tích hợp bục vinh danh Quán quân đường đua, pháo hoa nổ chúc mừng, mở modal chấm điểm EXP và hàng chờ lên bảng.
   - Đồng bộ hoàn hảo giữa màn hình Giáo viên và Máy chiếu (Màn hình 2) qua `BroadcastChannel`.

## [2.0.23] - 2026-10-09

### Tinh Chỉnh Đỉnh Cao 5 Tính Năng Quay Random: 3 Nhịp Cuộn Kịch Tính, Xào Bài 3D & Phóng To Nổ Bóng

1. **Giao Diện Quay Random Toàn Cục**:
   - Hàng chờ lên bảng (`QueueBar`) luôn ghim chắc chắn ở dưới cùng màn hình (`mt-auto` trong fullscreen và đáy tab trong chế độ thường).
   - Bỏ dòng chữ "còn ... học sinh có thể gọi" dưới nút quay chính theo đúng yêu cầu.
   - Bỏ toàn bộ dòng chữ trong ngoặc bên cạnh tên chế độ quay: Chuẩn hóa thành các tên ngắn gọn: *Lật thẻ bài*, *Hộp quà bí mật*, *Máy quay số*, *Cuộn họ tên*, *Bắn bóng bay*, *Bộ bài ma thuật*.

2. **Cuộn Họ Tên (Name Roller) — Kịch Tính 3 Nhịp**:
   - Bỏ đường chỉ đỏ ở giữa; mở rộng khung hộp hiển thị chiếm 1/2 màn hình với chữ tên học sinh kích thước lớn (`text-4xl` đến `text-6xl`).
   - Tích hợp GSAP timeline chuẩn 3 nhịp:
     * **Nhịp 1: Tăng tốc cực nhanh (1.5s)**: Cuộn tít mù qua khung nhìn tạo cảm giác sôi động và công bằng tuyệt đối.
     * **Nhịp 2: Giảm tốc từ từ (2.0s)**: Tốc độ chậm dần, tên từng bạn bắt đầu đọc được rõ ràng khi trôi qua.
     * **Nhịp 3: Cực chậm & Nín thở (2.1s)**: Từng cái tên trượt qua thật chậm, khựng lại một nhịp ở bạn áp chót khiến cả lớp nín thở, rồi trôi thêm một nhịp nhẹ cuối cùng và CHỐT chính xác học sinh may mắn.

3. **Máy Quay Số (Slot Machine) — Phóng To & Sửa Lệch Tâm**:
   - Bỏ đường đỏ ở giữa ở cả hai ô Hàng chục và Hàng đơn vị.
   - Phóng to máy quay số hoành tráng (chiều rộng 560px, ô số 150px, số font mono `9xl` cực lớn).
   - Khắc phục triệt để lỗi hàng đơn vị chạy nhanh lại lần hai: cuộn chậm dần đều suốt 3.8s không gián đoạn, dừng chính xác 100% tại tâm chính giữa ô số, không bị cắt nửa hay lệch vị trí.

4. **Bộ Bài Ma Thuật (Magic Deck) — Quy Trình 3 Bước Rõ Rệt**:
   - **Bước 1**: Ban đầu hiển thị duy nhất **1 cỗ bài ma thuật** xếp chồng 3D ở chính giữa bàn.
   - **Bước 2**: Khi bấm quay, cỗ bài thực hiện hiệu ứng xào bài rõ rệt (tách làm 2 tụ, tráo qua lại riffle shuffle đan xen với âm thanh xào xạc `soundManager.playCardShuffle()`).
   - **Bước 3**: Sau khi xào xong, từng lá bài lần lượt bay vút (deal) ra 9 vị trí trong lưới 3x3 để chờ Thầy/Cô chọn lá bài lật mở.

5. **Bắn Bóng Bay (Balloon Pop) — Hiệu Ứng Phóng To Tên Từ Tâm Bóng**:
   - Khi bấm chọn quả bóng: bóng nổ tung với tia lửa và mảnh vỡ rực rỡ.
   - Ngay tại tâm quả bóng vừa nổ, thẻ tên học sinh nhỏ xíu bắt đầu phóng to dần lên (`scale: 0.05` -> `scale: 1.0` với GSAP elastic ease) thành bảng vinh danh lớn rực rỡ và pháo hoa chúc mừng.

6. **Đóng Gói & Nghiệm Thu**:
   - TypeScript strict (`tsc -b`) đạt 100% chuẩn xác, 0 lỗi.
   - Đóng gói thành công bản portable: `apps/desktop/dist/installer/EduClass v2 Portable 2.0.0.exe`.

## [2.0.22] - 2026-10-09

### Nâng Cấp Hệ Thống Quay Số: Tích Hợp GSAP, Thêm 3 Chế Độ Hoạt Họa Đỉnh Cao & Module Hóa Độc Lập

1. **Kiến Trúc & Thư Viện Hoạt Họa (ADR 0002)**:
   - Viết và thông qua `docs/adr/0002-use-gsap-for-rich-animations.md`: Bổ sung thư viện chuyên biệt `gsap` phục vụ hoạt họa vật lý và hiệu ứng phức tạp (timeline shuffle bài, cuộn dải số mượt mà, bóng lơ lửng).
   - Duy trì nghiêm ngặt kiến trúc module hoá độc lập trong `apps/teacher-ui/src/components/random-picker/modes/`: mỗi chế độ là một component độc lập, tự đóng gói animation và vòng đời GSAP.

2. **Cải Tiến Máy Quay Số (Slot Machine) — Cuộn Chậm Dần Êm Ái**:
   - Tái cấu trúc cuộn 3 chu kỳ (30 ô số) bằng GSAP với easing `power3.out` (Hàng chục, 2.2s) và `power4.out` (Hàng đơn vị, 3.2s).
   - Khắc phục triệt để hiện tượng nhấp nháy tại chỗ; cuộn lướt qua từng con số chậm dần từ từ tạo độ ma sát hồi hộp chân thực trước khi chốt kết quả.

3. **Chế Độ Mới 1: Vòng Quay Tên Học Sinh (Name Roller)**:
   - Cửa sổ lớn duy nhất cuộn danh sách tên học sinh với vạch ngắm laser đỏ căn giữa và bóng gương kính 3D.
   - Cơ chế GSAP cuộn dải tên trong 4.5s: lúc đầu quay nhanh vù vù, sau đó lướt chậm dần từ từ kéo dài thời gian để tạo cảm giác hồi hộp cho cả lớp trước khi dừng tại học sinh may mắn.

4. **Chế Độ Mới 2: Bắn Bóng Bay May Mắn (Balloon Pop)**:
   - 8 quả bóng bay nhiều màu sắc chuyển động bồng bềnh lơ lửng ngẫu nhiên (GSAP sine loop).
   - Thầy/Cô hoặc học sinh bấm chọn 1 quả bóng: bóng nổ BÙM bung mảnh vỡ rực rỡ kèm âm thanh tổng hợp Web Audio API và biểu ngữ tên học sinh.

5. **Chế Độ Mới 3: Bộ Bài Ma Thuật (Magic Deck 3x3)**:
   - Tụ bài ma thuật ở trung tâm thực hiện animation gom tụ, xáo bài tráo qua lại (riffle shuffle), sau đó phóng 9 lá bài xếp đều vào ma trận 3x3.
   - Cho phép bấm chọn 1 lá bài bất kỳ để lật mở danh tính học sinh được gọi lên bảng.

6. **Giữ Nguyên Vẹn Luồng Nghiệp Vụ & Đồng Bộ Máy Chiếu**:
   - Tích hợp liền mạch với trang cộng điểm EXP (`ResultModal`), hàng chờ lên bảng (`QueueBar`), hỗ trợ dán danh sách từ Excel hoặc chọn từ lớp học.
   - Đồng bộ thời gian thực đa màn hình sang màn chiếu máy chiếu (`RandomPickerProjectorWindow`) qua `BroadcastChannel` cho cả 6 chế độ quay.
   - Kiểm tra kiểu dữ liệu TypeScript strict `tsc -b` đạt 100% chuẩn xác.

## [2.0.21] - 2026-10-09

### Nâng Cấp Quay Số Ngẫu Nhiên: Hộp Quà Bí Mật, Máy Quay Số (Slot Machine) & Pháo Hoa

1. **Phân Tách Module & Bổ Sung Chế Độ Quay Mới (Clean Architecture)**:
   - `packages/protocol/src/random-picker.ts`: Bổ sung `slot_machine` vào `RandomPickerModeIdSchema`.
   - `apps/teacher-ui/src/components/random-picker/modes/MysteryBoxMode.tsx`:
     * Chế độ 3 hộp quà bí mật phong cách Monty Hall: Giáo viên/học sinh chọn 1 hộp quà, 2 hộp phụ không được chọn rung lắc và mở trước ("Suýt trúng"), sau đó hộp trúng thưởng mới bật tung nắp và lộ diện học sinh.
   - `apps/teacher-ui/src/components/random-picker/modes/SlotMachineMode.tsx`:
     * Chế độ máy quay số arcade 2 cuộn số (Hàng chục và Hàng đơn vị): Hiển thị cần gạt tương tác, cuộn số tốc độ cao, Hàng chục dừng trước tạo hồi hộp, Hàng đơn vị dừng sau chốt số và mở bảng tên học sinh.
   - `apps/teacher-ui/src/components/random-picker/effects/FireworksCanvas.tsx`:
     * Component pháo hoa nổ Native HTML5 Canvas (0 KB dependency, 100% offline): Mô phỏng tên lửa pháo bay lên, nổ tung thành hàng chục hạt phát sáng lấp lánh đa màu sắc có trọng lực và phai mờ mượt mà 60 FPS.
   - `apps/teacher-ui/src/components/random-picker/sound.ts`:
     * Bổ sung âm thanh tổng hợp Web Audio API (offline, không dùng tệp MP3 ngoài): Âm thanh chọn hộp, mở hộp trượt, mở hộp thắng, quay slot, dừng slot, và tiếng nổ pháo hoa bùng nổ.

2. **Giữ Nguyên Vẹn Luồng Nghiệp Vụ Cốt Lõi**:
   - Tích hợp liền mạch với trang cộng điểm EXP (`ResultModal`), hàng chờ lên bảng (`QueueBar`), hỗ trợ dán danh sách từ Excel hoặc chọn từ lớp học.
   - Đồng bộ thời gian thực đa màn hình sang màn chiếu máy chiếu (`RandomPickerProjectorWindow`) qua `BroadcastChannel`.


### Ra Mắt Phân Hệ Mới: Thu - Phát Bài Tập (@educlass/activity-assignment-hub)

1. **Khởi Tạo Gói Activity Plugin Mới Theo Chuẩn Kiến Trúc Clean Architecture**:
   - Phân hệ hoạt động độc lập theo hợp đồng PLAN.md mục 4 (`@educlass/activity-assignment-hub`):
     * `assignment-schemas.ts`: Zod schema kiểm soát toàn diện Config, State, Intent, Submission, Material và Result.
     * `assignment-activity.ts`: FSM máy chủ (`onStart`, `onStudentIntent`, `onTeacherIntent`, `onEnd`), tích hợp cơ chế thưởng EXP khi nộp bài và chống nộp khi đã khóa cổng.
     * `components/AssignmentPreviewModal.tsx`: Trình xem trước tài liệu đa định dạng Offline trực tiếp trên máy GV (Word .docx qua render HTML, Excel .xlsx qua lưới SheetJS kẻ ô, PowerPoint .pptx trích xuất slide, PDF viewer, Hình ảnh, Mã nguồn/Text, và nút mở trực tiếp bằng phần mềm mặc định của máy tính).
     * `components/AssignmentTeacherPanel.tsx`: Bảng điều khiển quản lý thời gian thực cho GV: danh sách học sinh nộp bài, thời gian, dung lượng, nút mở thư mục lưu máy tính, khóa/mở cổng nộp bài, phát thêm tài liệu.
     * `components/AssignmentStudentView.tsx`: Giao diện nộp bài cho học sinh (hỗ trợ kéo thả, kiểm tra định dạng và dung lượng file, nộp lại bài, tải tài liệu phát).
     * `components/AssignmentProjectorView.tsx`: Màn chiếu lớn 16:9 với thanh tiến độ hoàn thành cả lớp và ma trận trạng thái nộp bài của từng học sinh.
     * `assignment-views.tsx` & `index.ts`: Đóng gói giao diện và hook vòng đời cho monorepo.

2. **Dịch Vụ Phía Máy Chủ & Tương Tác Hệ Thống Windows**:
   - `packages/server/src/routes/assignments.ts`:
     * API nộp bài an toàn, bảo vệ chống Path Traversal (`sanitizeFileName`), ghi tệp trực tiếp vào thư mục tùy ý GV chọn trên máy tính.
     * Tích hợp trích xuất bản xem trước Offline: Word qua `renderDocxToHtml` (`mammoth`), Excel qua `xlsx`, PowerPoint qua `extractPptxSummary` (`jszip`).
     * `POST /api/system/select-folder`: Mở hộp thoại chọn thư mục Windows Native qua PowerShell `FolderBrowserDialog`.
     * `POST /api/system/open-path`: Mở thư mục hoặc tệp trực tiếp trong Windows Explorer hoặc phần mềm máy tính tương ứng.
     * `GET /api/system/default-submissions-dir`: Thư mục lưu bài nộp mặc định (ưu tiên Desktop máy giáo viên).

3. **Cổng Học Sinh Module Hóa (student/index.html & js/assignment.js)**:
   - Module `packages/server/public/student/js/assignment.js` tích hợp vào hệ thống:
     * Nhận tài liệu giáo viên phát xuống theo **Phương án A**: Tự động bật popup/toast thông báo tài liệu mới kèm nút mở xem trực tiếp trên tab mới hoặc tải về máy.
     * Khu vực kéo thả / chọn file nộp bài với phản hồi trạng thái tức thì, kiểm tra định dạng/dung lượng, và thông báo thành công.
     * Cho phép nộp đè nếu GV cho phép và chưa khóa cổng.

4. **Kiểm Thử & Đảm Bảo Chất Lượng (DoD)**:
   - Bộ kiểm thử `packages/activities/assignment-hub/src/__tests__/assignment.test.tsx` (FSM lifecycle, TeacherPanel, StudentView, ProjectorView).
   - Bộ kiểm thử `packages/server/src/__tests__/assignments-routes.test.ts` (Quy trình nộp file, tải file, trích xuất xem trước Word/Excel/Text, mở thư mục hệ thống).
   - Đảm bảo kiểm tra kiểu dữ liệu TypeScript (`pnpm run typecheck` - `tsc -b`) xanh 100%, 0 lỗi.

## [2.0.19] - 2026-10-09

### Module Hóa Toàn Diện Cổng Học Sinh (student/index.html)

1. **Tách File Script ~2.500 Dòng Thành Kiến Trúc Module ES6 Tinh Gọn**:
   - Chuyển toàn bộ inline script trong `packages/server/public/student/index.html` (từ 2.966 dòng xuống còn 851 dòng) sang kiến trúc module hoá chuẩn ES6 tại thư mục `packages/server/public/student/js/`.
   - Cấu trúc các module chuyên trách:
     * `state.js`: Quản lý tập trung toàn bộ state phản ứng (Session, Roster, Quiz Live, Quick Poll, Exam, Swiss Duel, Chat & Help).
     * `utils.js`: Tiện ích render công thức Toán học KaTeX Offline (hỗ trợ $...$, $$...$$, \(...\), \[...\]).
     * `chat.js`: Quản lý hệ thống Trò chuyện & Xin Thầy/Cô giúp đỡ (Task 5.2), lọc tin nhắn riêng tư, các trạng thái khóa chat.
     * `quiz.js`: Quản lý cơ chế chơi Quiz Live (chế độ Kahoot nhịp GV & Quizizz tự tốc độ, xáo trộn câu, phản hồi chuỗi streak).
     * `poll.js`: Hoạt động Bình chọn nhanh (Quick Poll: đơn chọn / đa chọn, hiển thị trạng thái khóa).
     * `exam.js`: Hoạt động Kỳ thi (nhận đề cá nhân hóa, đồng hồ đếm ngược, lưu đáp án tức thì, lưới câu hỏi palette, nộp bài, xem lại đáp án & giải thích).
     * `swiss.js`: Hoạt động Đấu Cờ Thụy Sỹ 1v1 (bốc thăm theo điểm, đếm ngược vòng đấu, nộp bài 2 câu, ván đấu review, mini leaderboard).
     * `session.js`: Quản lý vòng đời phiên học (nhập mã, tải danh sách lớp roster, chọn học sinh, PIN, WebSocket gateway, activity poller, rời phòng).
     * `app.js`: Entry point chính, kết nối các module, tự động nhận diện URL params (?code=...), beacon dọn dẹp khi tắt tab, và gắn các hàm tương tác lên `window` đảm bảo tương thích 100% với các inline HTML event handler.

2. **Kiểm Thử Toàn Diện & Tuân Thủ Kiến Trúc (DoD)**:
   - Bổ sung test suite `packages/server/src/__tests__/student-modules.test.ts` (14 unit & integration tests) kiểm tra hoạt động của KaTeX, quản lý câu hỏi, bảo mật tin nhắn chat, xáo trộn đề thi, và kiểm tra Fastify Static phục vụ đầy đủ tất cả các module JS với MIME type chuẩn `application/javascript`.
   - Đảm bảo đồ thị phụ thuộc là Directed Acyclic Graph (DAG), vượt qua `dependency-cruiser` (0 circular dependencies), `tsc -b` (strict TypeScript, không dùng `any`), `eslint .`, và toàn bộ 530+ tests monorepo xanh 100%.

## [2.0.18] - 2026-10-08

### Tối Ưu Đấu Cờ Thụy Sỹ (Thời Gian Vòng Đấu, Gia Hạn Thời Gian, Nút Nộp Bài) & Quyền Trò Chuyện Riêng Với Giáo Viên

1. **Đồng Hồ Vòng Đấu Riêng Cho Học Sinh (Swiss Duel Round Timer)**:
   - Giao diện học sinh tại mỗi vòng đấu chỉ hiển thị tổng thời gian câu hỏi của vòng đó (ví dụ: 2 câu × 30s = 60s), không hiển thị thời gian của cả trò chơi.
   - Thời gian tổng của cả giải đấu chỉ hiển thị ở màn hình Giáo viên và Máy chiếu.

2. **Hộp Thoại Khi Hết Giờ Giải Đấu & Tùy Chọn Cộng Thêm Thời Gian**:
   - Khi hết thời gian thi đấu (chế độ theo thời gian), hệ thống dừng tự động kết thúc vội vã và hiển thị thông báo/modal nổi bật cho Giáo viên lựa chọn:
     * Cộng thêm thời gian: `+1 phút`, `+2 phút`, `+5 phút`.
     * Hoặc bấm `Kết thúc giải đấu` để chốt kết quả và chuyển sang bảng xếp hạng tổng kết.

3. **Cố Định Nút Nộp Bài Học Sinh (Sticky Submit Button)**:
   - Sửa lỗi nút nộp bài bị ẩn khi bốc thăm vòng đấu.
   - Cố định nút nộp bài ở chân trang (`position: sticky; bottom: 12px; z-index: 50`) kèm thanh tiến độ lựa chọn (`0/2`, `1/2`, `2/2 câu`), có hiệu ứng viền vàng phát sáng khi hoàn thành đủ câu để học sinh luôn dễ dàng nhìn thấy và thao tác ngay cả trên màn hình di động nhỏ.

4. **Nâng Cấp Hệ Thống Trò Chuyện & Trợ Giúp (Chat & Help)**:
   - **Mặc định khóa chat**: Phòng chat khởi tạo ở trạng thái khóa theo yêu cầu sư phạm để học sinh tập trung làm bài.
   - **Tùy chọn 3 chế độ trò chuyện**:
     * 🔒 *Khóa chat (`locked`)*: Tạm khóa trao đổi toàn lớp.
     * 👨‍🏫 *Chỉ chat với GV (`teacher_only`)*: Học sinh chỉ được gửi tin nhắn riêng cho Giáo viên; các học sinh khác trong lớp hoàn toàn không thấy tin nhắn này.
     * 📢 *Mở cả lớp (`open`)*: Cho phép học sinh trò chuyện chung.
   - **Bảo mật tuyệt đối**: Lọc luồng truyền tin nhắn WebSocket và REST API tại máy chủ, đảm bảo gói tin riêng tư chỉ gửi tới Giáo viên và học sinh gửi tin, không broadcast tới máy học sinh khác.

## [2.0.17] - 2026-10-08

### Tối Ưu & Sửa Toàn Diện 7 Vấn Đề Chế Độ Đấu Cờ Thụy Sỹ (Swiss Duel)

1. **Sửa Ghép Cặp Vòng 1**: Tự động bốc thăm lại (auto re-pairing) khi học sinh kết nối vào vòng 1, đảm bảo khi có 4 học sinh sẽ tạo đủ 2 bàn đấu cho cả 4 em cùng thi đấu (thay vì chỉ ghép 2 em đầu tiên). Bổ sung nút "Bốc thăm lại vòng" cho Giáo viên.
2. **Tự Động Bốc Thăm Vòng Tiếp Sau 10 Giây**: Tích hợp timer tự động chuyển tiếp vòng đấu khi đếm ngược 10s kết thúc ở cả phía Client (Teacher Panel, Student UI) và Server.
3. **Hiển Thị Đáp Án Chi Tiết & Hỗ Trợ Câu Trả Lời Ngắn (Short Answer)**: Hiển thị rõ câu nào đúng, câu nào sai, đáp án bạn chọn và đáp án chính xác sau mỗi hiệp đấu. Hỗ trợ ô input nhập câu trả lời ngắn mượt mà.
4. **Sửa Triệt Để Lỗi Font Chữ Tiếng Việt Bị Tách Dấu Sắc**: Thay thế font serif Windows gây tách dấu ("Đâ´u Cờ", "Bố´ c", "Kê´ t") bằng hệ thống typography Segoe UI / sans-serif chuẩn, loại bỏ thuộc tính tracking gây lỗi ligature.
5. **Thêm Cài Đặt Thời Gian Cho Mỗi Câu Hỏi**: Bổ sung trường cấu hình thời gian suy nghĩ mỗi câu hỏi (5s - 120s) trên modal cài đặt của Giáo viên.
6. **Bổ Sung Nút Nộp Bài & Khắc Phục Lỗi Tăng Điểm Ảo Khi Chọn Lại Đáp Án**: Cho phép học sinh tự do thay đổi lựa chọn trước khi bấm "Xác nhận nộp bài"; chỉ tính điểm duy nhất 1 lần khi nộp; khóa lựa chọn sau khi nộp bài để ngăn chặn gian lận/chọn lại.
7. **Đồng Hồ Đếm Ngược Giải Đấu Theo Thời Gian**: Bổ sung đồng hồ đếm ngược trực tiếp thời lượng giải đấu ở góc màn hình của cả Giáo viên, Máy chiếu và Học sinh. Tự động kết thúc giải đấu khi hết giờ.

## [2.0.16] - 2026-10-08

### Ra Mắt Chế Độ Mới: Đấu Cờ Thụy Sỹ (Swiss Duel Quiz) — Thể Thức Đối Kháng 1v1 Hoàng Gia Cổ Điển

1. **Khởi tạo và Đăng ký Gói Hoạt Động Mới (`@educlass/activity-swiss-duel`)**:
   - Chế độ hoạt động độc lập, ngang hàng với Quiz Live và Kỳ thi (Exam).
   - Tách thành các module riêng biệt dễ bảo trì và nâng cấp:
     * `swiss-schemas.ts`: Toàn bộ Zod schemas kiểm soát hợp đồng Config, State, Intent, Matchup, Participant, Leaderboard, Result.
     * `swiss-scoring.ts`: Quy tắc tính điểm Thắng 2đ, Hòa 1đ, Thua 0đ (bằng điểm nhau là Hòa tuyệt đối), xếp hạng Thụy Sỹ kết hợp hệ số đối thủ Buchholz.
     * `swiss-pairing.ts`: Thuật toán bốc thăm Thụy Sỹ thông minh, ghép cặp theo nhóm điểm từ trên xuống (down-float), kiểm soát rematch theo thể thức thi đấu, tự động phát hiện số lượng lẻ để trao suất BYE.
     * `swiss-activity.ts`: Vòng đời máy chủ chuẩn `ActivityDefinition` (`onStart`, `onStudentIntent`, `onTeacherIntent`, `onEnd`), tích hợp trao thưởng EXP game hóa.
     * `components/ChessTheme.tsx`: Thiết kế phong cách cờ vua cổ điển (Classic Chess: quân cờ ♔ ♕ ♖ ♗ ♘ ♙, vân gỗ mun trầm ấm, viền vàng kim, giấy da ngà, KaTeX Offline).
     * `components/SwissDuelStudentView.tsx`: Giao diện 1v1 học sinh mobile-first với 2 câu hỏi/vòng, bảng thi đấu, vinh danh suất BYE (+2đ), đếm ngược 10s.
     * `components/SwissDuelTeacherPanel.tsx`: Bảng điều khiển Giáo viên quản lý ma trận bàn đấu trực tiếp, điều khiển đếm ngược (bỏ qua, tạm dừng, tiếp tục).
     * `components/SwissDuelProjectorView.tsx`: Màn chiếu trình chiếu 16:9 với ma trận bàn đấu động, bảng xếp hạng 10s và bục vinh danh Podium Top 3.
     * `swiss-views.tsx` & `index.ts`: Đóng gói giao diện và hook vòng đời cho monorepo.

2. **Quy tắc Nghiệp vụ Chuẩn Xác theo Thảo luận**:
   - **Mỗi trận đấu 2 câu hỏi**: Thắng được 2 điểm, Hòa được 1 điểm, Thua được 0 điểm.
   - **Xử lý Suất BYE (Miễn đấu khi lẻ học sinh)**:
     * Suất BYE luôn được chọn ưu tiên từ nhóm điểm thấp nhất (nhóm cuối cùng).
     * Kỳ thủ nhận suất BYE được cộng thẳng +2 điểm vào bảng xếp hạng.
     * Nếu tất cả kỳ thủ ở nhóm cuối đều đã từng nhận suất BYE, hệ thống tự động reset lại quyền nhận BYE để chọn lại công bằng.
   - **Hai chế độ tổ chức**:
     * *Theo kho câu hỏi*: Thi hết số câu hỏi trong đề thì kết thúc giải đấu; cấm gặp lại nhau (no rematch).
     * *Theo thời gian*: Đấu trường đếm ngược theo thời lượng tùy chọn; cho phép gặp lại nhau và lặp lại câu hỏi ngẫu nhiên.
   - **Nhịp trận mượt mà**: Khi tất cả các bàn hoàn thành nộp bài, hệ thống tự động đếm ngược **10 giây** trước khi bốc thăm vòng kế tiếp; giáo viên có thể bấm bỏ qua để sang vòng ngay lập tức hoặc tạm dừng để giải thích đề bài.

3. **Mở Cửa Sổ Trình Chiếu Độc Lập**:
   - Khi khởi chạy Đấu Cờ Thụy Sỹ từ Dashboard, hệ thống tự động mở cửa sổ trình chiếu độc lập (`window=activity`), cho phép giáo viên chiếu lên màn hình máy chiếu thứ 2 trong khi vẫn giữ bảng điều khiển ở màn hình chính.

4. **Tích hợp Đồng Bộ Cổng Học Sinh & Monorepo**:
   - Giao diện Cổng Học Sinh (`packages/server/public/student/index.html` và React `ActivityHost`) hỗ trợ đầy đủ nhận tín hiệu WebSocket/polling cho `swiss-duel`.
   - Toàn bộ test suite monorepo xanh 100% (Typecheck, Lint, Tests, Dependency cruiser).


### Hoàn thiện Quay Thẻ Bài Fullscreen, Tối ưu Tỷ lệ Kahoot & Bảng Tiến độ Quizizz Dark Cosmic

1. **Quay random, lật bài (Random Picker)**:
   - **Hiển thị đầy đủ Bảng kết quả (ResultModal) khi Full màn hình**: Đưa `ResultModal` vào bên trong container `arenaRef` để không bị API Fullscreen của trình duyệt ẩn mất.
   - **Tích hợp Dock Hàng chờ học sinh (QueueBar Dock) ngay trong chế độ Full màn hình**:
     * Khi giáo viên nhấn phóng to toàn màn hình và có học sinh trong hàng chờ, một dock hàng chờ hiện đại mờ kính hiển thị ngay dưới sàn quay.
     * Cho phép giáo viên theo dõi học sinh đang lên bảng và trực tiếp chấm điểm `✓ Đúng (+EXP)`, `✕ Sai`, hoặc `✕ Xóa` ngay trong chế độ Full màn hình mà không cần thu nhỏ cửa sổ.

2. **Chế độ Kahoot (Kahoot Pace)**:
   - **Tỷ lệ hiển thị hoàn hảo**: Khung câu hỏi chiếm đúng ~2/5 màn hình (`h-[38vh] min-h-[160px] max-h-[40vh]`), khung 4 đáp án mở rộng chiếm ~3/5 màn hình (`flex-1 min-h-[220px]`).
   - **Vừa vặn toàn bộ chiều cao màn hình**: Tổng thể vừa khít 100vh không gây tràn trang hay xuất hiện thanh cuộn không mong muốn cả trên giao diện Giáo viên và Màn chiếu máy chiếu.
   - **Tự động co giãn cỡ chữ (Auto font sizing)**: Xây dựng cơ chế thông minh tự động giảm cỡ chữ cho câu hỏi dài (`getQuestionStemClass`) và đáp án nhiều chữ (`getOptionTextClass`), đảm bảo luôn vừa khít trong khung hình.

3. **Chế độ Quizizz - Màn hình Tiến độ Làm bài Dark Cosmic**:
   - Thiết kế lại hoàn toàn giao diện theo chuẩn Quizizz Dark Cosmic:
     * **Header**: Mã tham gia `JOIN CODE` nổi bật, cụm nút âm thanh, toàn màn hình và kết thúc bài thi.
     * **Thanh Accuracy tổng quan lớp học**:
       + Khối xanh lá bên trái hiển thị tổng số câu trả lời đúng của cả lớp.
       + Vòng tròn mặt trăng ở trung tâm hiển thị tỷ lệ chính xác chung `% Accuracy` có bóng đổ neon rực rỡ.
       + Khối đỏ hồng bên phải hiển thị tổng số câu trả lời sai của cả lớp.
     * **Tabs chuyển đổi**: `Leaderboard` (Bảng xếp hạng) và `Questions` (Phân tích câu hỏi).
     * **Tính năng lọc**: Checkbox `Show only top 5` kèm hiển thị số lượng học sinh tham gia và số học sinh đã hoàn thành.
     * **Bảng Leaderboard**:
       + Thứ hạng (Rank), Avatar hoạt hình đa màu sắc tạo ngẫu nhiên theo ID học sinh.
       + Họ tên học sinh, số câu đúng/tổng số câu đã làm và % chính xác cá nhân.
       + Huy hiệu chuỗi đúng liên tiếp (`🔥 Streak`).
       + **Thanh tiến độ Đúng / Sai 2 màu của từng học sinh**: Phần trăm câu đúng màu xanh lá (`#2ECC8F`) và phần trăm câu sai màu đỏ hồng (`#FF5252`).
       + Điểm số nổi bật.
     * **Tab Questions**: Phân tích chi tiết từng câu hỏi trong đề thi với tỷ lệ % đúng / sai và thanh tiến độ tương ứng.

4. **Đóng gói phát hành bộ cài đặt & Portable mới**:
   - Biên dịch và đóng gói hoàn tất các file phát hành mới nhất:
     * `apps/desktop/dist/installer/EduClass v2 Setup 2.0.0.exe` (126.1 MB)
     * `apps/desktop/dist/installer/EduClass v2 Portable 2.0.0.exe` (125.9 MB)
     * Thư mục Portable giải nén sẵn: `apps/desktop/dist/installer/win-unpacked`

## [2.0.14] - 2026-10-08

### Nâng cấp Trải nghiệm Kỳ thi (Exam) & Hoàn thiện Quy trình Trình chiếu Kahoot
1. **Kỳ thi (Exam) - Cài đặt kỳ thi có nhiều câu hỏi**:
   - Khung modal cài đặt kỳ thi được thiết kế cấu trúc cuộn linh hoạt (`max-h-[90vh] flex flex-col`), nội dung cấu hình cuộn độc lập (`overflow-y-auto pr-1.5`).
   - Cố định thanh nút hành động ở chân modal (`sticky bottom-0 bg-white pt-3 pb-1 border-t`), đảm bảo nút "Bắt đầu ngay" và "Hủy" luôn hiển thị rõ ràng dù đề thi có hàng chục câu hỏi.

2. **Kỳ thi (Exam) - Bảng điều hướng câu hỏi bám dính khi cuộn (Sticky Palette)**:
   - Trên màn hình thiết bị di động của học sinh (viewport nhỏ ≤ 768px), thanh danh sách số thứ tự câu hỏi (`#exam-nav-palette`) tự động cố định ở cạnh trên màn hình (`position: sticky; top: 8px; z-index: 40;`) kèm hiệu ứng mờ kính `backdrop-blur`.
   - Học sinh khi cuộn xuống làm các câu hỏi dài vẫn luôn nhìn thấy bảng tiến độ và số câu để chuyển nhanh giữa các câu hỏi mà không phải cuộn ngược lên đầu trang.

3. **Kỳ thi (Exam) - Chặn nộp bài khi chưa làm hết số lượng câu hỏi**:
   - Khi học sinh bấm nút "Nộp bài", hệ thống kiểm tra số lượng câu chưa trả lời. Nếu còn câu chưa làm, hiển thị thông báo chi tiết danh sách các câu còn thiếu (ví dụ: `Bạn chưa hoàn thành câu: 2, 5... Vui lòng hoàn thành tất cả các câu trước khi nộp bài!`).
   - Tự động cuộn đến và làm nổi bật câu chưa làm đầu tiên, đồng thời khóa không cho nộp bài cho đến khi đã làm đầy đủ (trừ trường hợp hết thời gian quy định máy chủ sẽ tự động thu bài).
   - Trong giao diện React học sinh (`ExamStudentView`), nút xác nhận nộp bài trong hộp thoại bị vô hiệu hóa khi còn câu chưa hoàn thành.

4. **Kỳ thi (Exam) - Báo cáo Excel chính xác 100%**:
   - Khắc phục căn nguyên khiến Sheet "Tổng hợp", Sheet "Phân tích câu hỏi" và Sheet "Ma trận làm bài" hiển thị toàn bộ là `(Sai)`: Khi kỳ thi diễn ra, danh sách câu hỏi public bị loại bỏ đáp án (`stripAnswerKey`) để chống gian lận. Khi xuất Excel, hàm chấm điểm đọc câu hỏi public không có đáp án đúng dẫn đến luôn trả về `false`.
   - Khắc phục triệt để bằng cách đọc kết quả chấm điểm chuẩn xác từ `reviewData` của học sinh (đã được máy chủ chấm bằng bộ câu hỏi gốc có đáp án).
   - Dữ liệu trong tất cả các sheet phản ánh chính xác kết quả thực tế của học sinh.

5. **Kahoot - Khung hiển thị câu hỏi và các phương án cỡ lớn (Toàn màn hình & Màn chiếu)**:
   - Phóng to khung câu hỏi nổi bật: văn bản câu hỏi đạt cỡ `text-2xl md:text-3xl lg:text-4xl` font-black, bo góc mềm mại, hiển thị rõ ràng từ khoảng cách xa trong lớp học.
   - 4 khối phương án Kahoot (Đỏ ▲, Xanh dương ◆, Vàng ●, Xanh lá ■) kích thước lớn (`min-h-[90px] md:min-h-[110px]`), cỡ chữ lớn `text-xl md:text-2xl`, biểu tượng hình khối đậm nét.
   - Hỗ trợ hiển thị hình ảnh đính kèm câu hỏi căn giữa sắc nét.

6. **Kahoot - Tách riêng Bảng xếp hạng và Quy trình nhịp trình chiếu chuẩn xác**:
   - Tách biệt hoàn toàn: Khi đang ở màn hình câu hỏi, **KHÔNG hiển thị Bảng xếp hạng** bên dưới. Khi đang ở Bảng xếp hạng, **KHÔNG hiển thị câu hỏi**.
   - Quy trình điều khiển tuần tự trực quan:
     * **Bước 1 (Hiện câu hỏi)**: Cả lớp cùng theo dõi câu hỏi và gửi câu trả lời. Nút hành động chính: "Tiếp theo: Bảng Xếp Hạng 📊" (kèm tùy chọn "Khóa & Xem đáp án" nếu muốn giảng giải trước).
     * **Bước 2 (Hiện Bảng xếp hạng)**: Giáo viên nhấn "Tiếp theo", màn hình chuyển sang Bảng xếp hạng tạm thời (Top 3 dẫn đầu + toàn bộ danh sách lớp). Nút hành động chính chuyển thành "Tiếp theo: Câu hỏi tiếp theo ➡".
     * **Bước 3 (Hiện câu hỏi tiếp theo)**: Giáo viên nhấn "Tiếp theo", chuyển sang câu hỏi tiếp theo.
     * Ở câu cuối cùng, nút chuyển thành "Tiếp theo: Tổng Kết & Trao Giải 🏁" dẫn tới bục vinh danh Quán quân.

7. **Đóng gói phát hành bộ cài đặt & Portable mới**:
   - Đã biên dịch lại và đóng gói trọn vẹn:
     * `apps/desktop/dist/installer/EduClass v2 Setup 2.0.0.exe`
     * `apps/desktop/dist/installer/EduClass v2 Portable 2.0.0.exe`
     * `apps/desktop/dist/installer/win-unpacked`

## [2.0.13] - 2026-10-08

### Khắc phục kích thước phát video & Triệt để lỗi xáo trộn câu hỏi / đáp án Kỳ thi
1. **Kho Video (Video Library)**:
   - Mở rộng khung modal phát video YouTube từ mặc định 560px lên **960px chuẩn rạp chiếu** (`maxWidth="960px"`), tỷ lệ 16:9 (`aspect-video`), bo góc mềm mại và vừa vặn hoàn hảo với mọi kích thước video không còn bị bóp hẹp.
   - Nâng cấp `Modal` component trong `@educlass/ui-kit` hỗ trợ tùy biến linh hoạt `maxWidth` và `contentStyle`.

2. **Kỳ thi (Exam) - Khắc phục triệt để lỗi hiển thị xáo trộn & Lệch đáp án**:
   - **Thứ tự câu hỏi của từng học sinh**:
     * Học sinh nhận và hiển thị đề thi theo đúng thứ tự xáo trộn cá nhân hóa (`questionOrder`) từ máy chủ thay vì danh sách câu hỏi gốc tĩnh.
     * Cả màn hình làm bài của học sinh (`student/index.html`), bảng điều hướng câu hỏi (`Question Palette`), màn hình xem lại kết quả (`reviewData`) và giao diện giám sát chi tiết của giáo viên (`ExamViews.tsx`) đều được đồng bộ 100% theo thứ tự câu của học sinh.
   - **Xáo trộn 4 đáp án (MCQ4) & Chấm điểm chính xác tuyệt đối**:
     * Hiển thị 4 lựa chọn A, B, C, D trên giao diện học sinh theo đúng thứ tự hoán vị ngẫu nhiên (`optionOrders[q.id]`).
     * Khi học sinh bấm chọn nút A (vị trí 0), hệ thống lưu và nộp đáp án vị trí 0; máy chủ thực hiện giải mã ánh xạ ngược (`unmapStudentAnswer`) về đúng đáp án gốc tương ứng để chấm điểm chính xác.
     * Màn hình xem lại bài làm (`reviewData`) của học sinh và của giáo viên hiển thị đúng các lựa chọn theo các nhãn A, B, C, D mà học sinh đã nhìn thấy trong lúc làm bài, gắn nhãn chính xác "Bạn đã chọn" và "Đáp án đúng".
   - **Cơ chế tải đề tự động khi vào thi**:
     * Tự động gửi intent `get_paper` ngay khi học sinh truy cập đề thi để nhận bảng xáo câu hỏi và lựa chọn cá nhân hóa; tự động làm mới giao diện ngay khi nhận dữ liệu từ server mà không bị lag DOM cũ.

3. **Đóng gói phát hành bản Desktop mới**:
   - Đã biên dịch lại toàn bộ và xuất xưởng bộ cài đặt / portable mới nhất tại:
     * `apps/desktop/dist/installer/EduClass v2 Setup 2.0.0.exe`
     * `apps/desktop/dist/installer/EduClass v2 Portable 2.0.0.exe`

## [2.0.12] - 2026-10-08

### Khắc phục triệt để lỗi 500 Internal Server Error (Kho video & Thêm học sinh) bằng Động cơ Migration Nhúng Tự Phục Hồi (Self-Healing Embedded Migrations)
1. **Nguyên nhân gốc rễ**:
   - Khi ứng dụng Desktop được đóng gói thành tệp nhị phân độc lập (`dist/main.cjs` qua esbuild), các tệp `.sql` vật lý trong thư mục `packages/db/src/migrations` không nằm trong đường dẫn `__dirname` thời gian chạy (runtime).
   - Hàm `loadMigrationFiles` khi không tìm thấy thư mục migrations trên đĩa đã rơi về cấu hình ban đầu chỉ có phiên bản 1 (`initial_schema`).
   - CSDL thực tế đã tồn tại trên máy người dùng (`%APPDATA%\@educlass\desktop\data\educlass.sqlite`) đã ghi nhận phiên bản 1 nên không áp dụng tiếp migration 2 (tạo bảng `videos`) và migration 3 (thêm cột `academic_performance` vào bảng `students`).
   - Khi người dùng bấm lưu video hoặc thêm học sinh, SQLite quăng lỗi `no such table: videos` và `table students has no column named academic_performance`, dẫn tới phản hồi HTTP 500 Internal Server Error.
2. **Khắc phục dứt điểm & Bảo đảm an toàn tuyệt đối**:
   - **Embedded Migrations tĩnh (`EMBEDDED_MIGRATIONS`)**: Nhúng toàn bộ mã SQL của các migration v1, v2, v3 trực tiếp vào mã nguồn TypeScript `packages/db/src/migrator.ts`. Dù ứng dụng chạy từ mã nguồn, chạy từ `dist/`, từ gói nhị phân bundle hay trong file nén `app.asar`, các migration luôn luôn hiện diện đầy đủ 100%.
   - **Cơ chế Tự phục hồi Cấu trúc CSDL (`ensureSchemaIntegrity`)**: Tự động rà soát qua `PRAGMA table_info` và tạo bổ sung ngay lập tức bảng `videos` cũng như cột `academic_performance` trong bảng `students` nếu phát hiện thiếu, bảo đảm CSDL luôn hoàn thiện trước khi server mở cổng nhận request.
   - **Xử lý Idempotent cho ALTER TABLE**: Trong `runMigrations`, bắt và bỏ qua an toàn lỗi `duplicate column name` khi cột đã có sẵn, giúp migration chạy mượt mà trên mọi trạng thái CSDL.
   - **Sao chép migrations vào build desktop**: Bổ sung bước copy thư mục `migrations` sang `apps/desktop/dist/migrations` trong `scripts/build.mjs`.
   - **Đã kiểm chứng & Nâng cấp thành công**: Đã chạy thử nghiệm di trú trên tập tin CSDL thật tại `%APPDATA%\@educlass\desktop\data\educlass.sqlite`, hệ thống đã tự động sao lưu an toàn và nâng cấp bổ sung đầy đủ bảng `videos` và cột `students.academic_performance`.

## [2.0.11] - 2026-10-08

### Khắc phục toàn diện 5 phản hồi người dùng & Cập nhật Bản cài đặt / Portable mới nhất
1. **Kho Video (Video Library)**:
   - Khắc phục triệt để hiện tượng trang tự tải lại / nhấp nháy liên tục sau vài giây (cố định tham chiếu callback `showToast` bằng `useRef` và `useCallback`, dập tắt re-render loop giữa tab và modal).
   - Nâng cấp bộ nhận diện đường dẫn YouTube (`extractYouTubeId`) tương thích toàn diện: hỗ trợ domain di động `m.youtube.com`, query params phức hợp (`?v=...&feature=...`), live streams, shorts, youtu.be.
   - Thiết kế lại form modal Thêm video mới: áp dụng `box-border`, giới hạn `maxHeight: 90vh`, thanh cuộn nội dung độc lập trong modal, header/footer cố định không bao giờ tràn ra ngoài khung bao.
2. **Lớp học & Quản lý Học sinh (ClassTab & Students API)**:
   - Sửa lỗi không bấm được "Xác nhận nhập học sinh" từ Excel: tính toán số lượng hợp lệ `importableCount` bao gồm cả các dòng có cảnh báo (warning), chỉ loại trừ dòng có lỗi (error).
   - Xử lý tương thích mã PIN: loại bỏ mã PIN rỗng hoặc ngắn hơn 4 ký tự trước khi gửi lên API để không bị Schema Validation 400 Bad Request từ chối.
   - Thêm thủ công từng học sinh: kiểm tra ngay mã PIN nếu nhập phải có ít nhất 4 ký tự số, bổ sung trạng thái chờ xử lý (loading state) và khối `try/catch` hiển thị thông báo lỗi thân thiện.
3. **Quay ngẫu nhiên - Lật thẻ bài (Card Flip Mode)**:
   - Giáo viên tự tay bấm lật thẻ: Khi bấm "Bắt đầu quay", 5 lá bài úp xuống chờ tương tác; giáo viên click chọn lá bài bất kỳ để lật mở học sinh trúng chọn thay vì ứng dụng tự động mở.
   - Phối màu nổi bật chuẩn nhận diện: Lá bài được lật trúng học sinh mang **màu vàng kim rực rỡ** (`bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500`), các lá bài còn lại có **màu trắng sạch sẽ**.
4. **Quay ngẫu nhiên - Học lực**:
   - Ẩn hoàn toàn hiển thị phân loại học lực trong cả thẻ bài thi đấu và bảng thông báo kết quả chúc mừng theo đúng yêu cầu.
5. **Quay ngẫu nhiên - Chế độ Toàn màn hình**:
   - Tối ưu hóa Toàn màn hình (Fullscreen): gắn `requestFullscreen` trực tiếp vào khu vực đấu trường lật thẻ bài (Arena), ẩn toàn bộ thanh chọn nguồn danh sách và bảng thống kê/cài đặt.
   - Bổ sung nút bấm phóng to / thu nhỏ trực quan trực tiếp bên trong đấu trường để giáo viên thao tác tiện lợi.
6. **Đóng gói phát hành bộ cài đặt & Portable mới**:
   - Biên dịch và cập nhật đầy đủ mã nguồn mới nhất vào:
     - `apps/desktop/dist/installer/EduClass v2 Portable 2.0.0.exe` (122.8 MB)
     - `apps/desktop/dist/installer/EduClass v2 Setup 2.0.0.exe` (123.0 MB)
     - `apps/desktop/dist/installer/win-unpacked/EduClass v2.exe`

## [2.0.10] - 2026-10-08

### Phát triển tiện ích: Quay Số Ngẫu Nhiên Gọi Học Sinh (Random Student Picker)
1. **Mục tiêu & Đặc tả nghiệp vụ**:
   - Tiện ích gọi học sinh ngẫu nhiên công bằng, sinh động trong lớp học.
   - Hỗ trợ 2 nguồn danh sách học sinh: Lấy tự động từ Lớp học có sẵn HOẶC Copy/dán trực tiếp từ bảng Excel (tự động phân tích STT, mã HS, họ tên, học lực).
   - Kiến trúc module mở rộng: Mỗi chế độ quay nằm ở một file riêng biệt (`CardFlipMode.tsx`, sẵn sàng bổ sung Vòng quay may mắn, Hộp quà bí mật).
   - Chế độ Lật thẻ bài thần bí (5 thẻ úp xuống, hiệu ứng 3D flip xoay bài, âm thanh Whoosh lật bài & Fanfare chiến thắng bằng Web Audio API 100% offline).
   - Quy trình tương tác sau khi chọn học sinh:
     - `✅ Trả lời đúng`: Thưởng EXP (cấu hình linh hoạt, mặc định +10 EXP, tự động ghi nhận vào session nếu có).
     - `❌ Trả lời sai`: Đánh dấu đã gọi, không cộng điểm.
     - `⏳ Cho vào hàng chờ`: Đưa học sinh lên bảng làm bài, hiển thị tại thanh Hàng chờ (QueueBar) để chấm điểm sau; trong thời gian đó giáo viên tiếp tục quay gọi học sinh khác.
     - `⏭️ Bỏ qua`: Không tính lượt.
   - Quản lý Hàng chờ (QueueBar / Bench): Thiết kế gọn đẹp, hỗ trợ 1-click chấm Đúng (+EXP) hoặc Sai (0) ngay khi học sinh trên bảng hoàn thành bài làm.
   - Tính năng ẩn chọn học sinh khá/giỏi (Secret Bias):
     - Bổ sung trường Học lực (`tot`, `kha`, `dat`, `chua_dat`) vào học sinh trong Database, Protocol, REST API và giao diện quản lý lớp.
     - Thiết kế nút bấm liền khối: Nút quay chính ("🎲 Học sinh đầu tiên" / "🎲 Học sinh tiếp theo") và Nút ẩn bí mật mép phải được tích hợp thành một khối duy nhất, cùng màu nền/gradient, chỉ có họa tiết nhỏ thanh lịch ở mép. Người ngoài nhìn vào thấy là một nút bấm duy nhất; bấm vào mép phải sẽ tự động kích hoạt chế độ ưu tiên gọi học sinh có học lực tốt.
   - Trình chiếu & Máy chiếu (Màn hình 2):
     - Hỗ trợ chế độ Toàn màn hình (F11) trực tiếp trong giao diện.
     - Nút "Mở Màn Hình Máy Chiếu" mở cửa sổ chiếu độc lập `window=random-picker`, đồng bộ trạng thái hai chiều qua `BroadcastChannel`. Cửa sổ Electron Desktop hỗ trợ mở cửa sổ này mượt mà.
2. **Cơ sở dữ liệu & Protocol (`packages/db`, `packages/protocol`)**:
   - Migration `0003_student_academic_performance.sql`: Thêm cột `academic_performance` vào bảng `students`.
   - Schema & Repository Drizzle: Hỗ trợ `academicPerformance` trong `StudentRepository` (`create`, `createMany`, `update`).
   - Protocol `packages/protocol/src/random-picker.ts`: Định nghĩa `PickerStudent`, `RandomPickerModeId`, `RandomPickerSettings`, `PickerQueueItem`, và thuật toán `pickStudentFromCandidates`.
3. **Giao diện & Kiểm thử (`apps/teacher-ui`)**:
   - Quản lý lớp học (`ClassTab.tsx`): Thêm cột Học lực với dropdown màu sắc tương ứng; modal Thêm học sinh hỗ trợ chọn Học lực.
   - Module `apps/teacher-ui/src/components/random-picker/`: `types.ts`, `sound.ts`, `modes/CardFlipMode.tsx`, `modes/index.ts`, `QueueBar.tsx`, `ResultModal.tsx`, `RandomPickerTab.tsx`, `RandomPickerProjectorWindow.tsx`.
   - Kết nối vào Navbar `App.tsx` tab **🎲 Quay ngẫu nhiên** và router `main.tsx`.
   - Kiểm thử: Bộ unit tests `random-picker-tab.test.tsx` (5 tests), 100% tests monorepo (349 tests) đạt chuẩn xanh hoàn hảo.
4. **Đóng gói phiên bản Portable & Bộ cài đặt Windows (`apps/desktop/dist/installer`)**:
   - Cập nhật cấu hình `electron-builder.json` hỗ trợ đồng thời cả 2 định dạng: `nsis` (bản cài đặt) và `portable` (bản chạy ngay không cần cài đặt).
   - Đóng gói đầy đủ các gói phát hành mới nhất chứa toàn bộ các sửa đổi và tiện ích mới:
     - `EduClass v2 Portable 2.0.0.exe` (121.8 MB): Bản Portable 1-click độc lập, không cần cài đặt.
     - `EduClass v2 Setup 2.0.0.exe` (122.0 MB): Bộ cài đặt Windows với trình hướng dẫn cài đặt NSIS và cấu hình tường lửa tự động.
     - `win-unpacked`: Thư mục Portable giải nén sẵn, chứa `EduClass v2.exe` chạy ngay tức thì.
   - Tích hợp tài nguyên UI mới nhất (`teacher-ui` & `public`), `better-sqlite3` native cho Electron và đường dẫn lưu trữ CSDL bền vững tại `%APPDATA%/EduClass v2/data/`.

## [2.0.9] - 2026-10-08

### Phát triển tiện ích: Kho Lưu Video Học Liệu & Khởi Động (Video Library)
1. **Mục tiêu & Đặc tả nghiệp vụ**:
   - Lưu trữ các đường dẫn video YouTube phục vụ khởi động tiết học, củng cố kiến thức hoặc làm kho học liệu phong phú.
   - Phát video trực tiếp không bị quảng cáo làm phiền (sử dụng chuẩn chính thức `youtube-nocookie.com/embed` với Privacy-Enhanced Mode, `rel=0`, `modestbranding=1`).
   - Phân loại video linh hoạt theo các danh mục: Khởi động, Bài giảng, Khoa học, Toán học, Tiếng Anh, Kỹ năng sống, hoặc thêm danh mục mới theo ý muốn.
   - Quản lý đầy đủ chức năng: Thêm mới (nhận diện URL/ID tự động + xem trước thumbnail), Tìm kiếm theo từ khóa, Lọc theo danh mục, Chỉnh sửa và Xóa video khỏi kho.
   - Hỗ trợ chiếu ra Màn hình 2 / Máy chiếu: Cung cấp nút `[🪟 Mở màn hình riêng (Chiếu máy chiếu)]` mở cửa sổ độc lập toàn màn hình chuẩn rạp chiếu, giúp giáo viên vừa chiếu video cho học sinh xem trên máy chiếu vừa điều khiển lớp học trên laptop. Không đồng bộ phát xuống màn hình của học sinh.
2. **Cơ sở dữ liệu & Kiến trúc (`packages/db`)**:
   - Tạo migration số tăng dần `0002_videos_schema.sql` (bảng `videos`, các index `idx_videos_category` và `idx_videos_created_at`).
   - Định nghĩa schema Drizzle bảng `videos` trong `packages/db/src/schema/index.ts`.
   - Xây dựng `VideoRepository` với đầy đủ các phương thức `create`, `findById`, `list` (lọc category & từ khóa), `listCategories`, `update`, `delete`.
   - Bộ unit test `video-repository.test.ts` đạt 100% pass.
3. **Giao thức & DTO (`packages/protocol`)**:
   - Thêm `packages/protocol/src/video.ts` định nghĩa `VideoDto`, `CreateVideoRequestSchema`, `UpdateVideoRequestSchema`.
   - Bộ hàm tiện ích: `extractYouTubeId` (hỗ trợ mọi định dạng URL YouTube và mã 11 ký tự), `getYouTubeThumbnailUrl`, `getYouTubeEmbedUrl`.
   - Bộ unit test `video.test.ts` đạt 100% pass (11 tests).
4. **Máy chủ REST API (`packages/server`)**:
   - Tạo route `packages/server/src/routes/videos.ts` với các endpoint: `GET /api/videos`, `GET /api/videos/categories`, `POST /api/videos`, `PUT /api/videos/:id`, `DELETE /api/videos/:id`.
   - Tích hợp và decorate `videoRepo` vào Fastify instance trong `packages/server/src/app.ts`.
   - Bộ unit test `videos-routes.test.ts` đạt 100% pass.
5. **Giao diện Teacher UI & Trình chiếu Máy chiếu (`apps/teacher-ui`)**:
   - Bổ sung tab **🎬 Kho Video** trên thanh điều hướng chính của `App.tsx`.
   - Component `VideoLibraryTab.tsx`: Bộ lọc danh mục, ô tìm kiếm từ khóa, lưới video card với thumbnail tự động, modal xem video trực tiếp, modal thêm/sửa video có live thumbnail preview, modal xác nhận xóa an toàn.
   - Component `VideoProjectorWindow.tsx`: Cửa sổ trình chiếu độc lập giao diện rạp phim tối giản (Theatre view), hỗ trợ bật/tắt toàn màn hình F11 và đóng cửa sổ.
   - Cập nhật `apps/desktop/src/main.ts`: Cấu hình Electron `setWindowOpenHandler` cho phép mở pop-up `window=video` độc lập với kích thước 1280×800.
   - Bộ unit test `video-library-tab.test.tsx` đạt 100% pass (4 tests).
6. **Kiểm thử toàn diện**:
   - Chạy kiểm tra nghiêm ngặt `pnpm lint`, `pnpm typecheck`, `pnpm deps:check` và `pnpm test` (toàn bộ 12 gói monorepo, hơn 480 tests đều xanh 100%).

## [2.0.8] - 2026-10-08

### Khắc phục cửa sổ trình chiếu Electron, Kỳ thi tính giờ trọn vẹn cho học sinh vào sau & Hoàn thiện Trò chuyện - Trợ giúp hai chiều
1. **Khắc phục lỗi Cửa sổ trình chiếu mới không hiện trong Electron Desktop**:
   - Sửa `setWindowOpenHandler` trong `apps/desktop/src/main.ts`: Cho phép `url.includes('window=activity')` tạo `BrowserWindow` riêng biệt của Electron (`action: 'allow'`) với kích thước 1280×800, tiêu đề "EduClass v2 — Trình Chiếu Hoạt Động", cho phép kéo thả sang màn hình 2/máy chiếu (thay vì bị chặn nhầm bởi `action: 'deny'`).
   - Thêm nút `[🪟 Mở cửa sổ trình chiếu (Màn hình 2)]` với styling nổi bật trong bảng điều khiển và thông báo toast hỗ trợ nếu trình duyệt chặn pop-up.
2. **Kỳ thi (Exam): Tính giờ trọn vẹn từ lúc mở đề cho học sinh vào sau**:
   - Trong `packages/activities/exam/src/exam-activity.ts`: Khi học sinh vào sau mở đề (`get_paper` hoặc `unlock_exam`), thời điểm bắt đầu `startedAt` được gán chính xác bằng thời điểm học sinh bắt đầu làm bài (`now`), và hạn làm bài cá nhân `individualExpiresAt = now + (durationMinutes * 60 * 1000)`.
   - Học sinh vào sau được hưởng trọn vẹn 100% thời lượng làm bài, không bị trừ bớt thời gian do vào muộn hơn giờ giáo viên mở đề.
   - Thêm unit test kiểm chứng `allows late-joining students full exam duration calculated from their own start time` trong `exam-activity.test.ts` (100% passed).
3. **Hoàn thiện tính năng Trò chuyện & Yêu cầu trợ giúp (GV ↔ HS)**:
   - Giáo viên: Bổ sung các phương thức API client `sendChatMessage`, `getChatMessages`, `getChatStatus`, `toggleChatLock`, `resolveHandRaise` trong `apps/teacher-ui/src/api/client.ts`.
   - Kết nối đầy đủ handler `onSendChatMessage`, `onToggleChatLock`, `onResolveHandRaise` vào `SessionControl.tsx` và `App.tsx`, đồng bộ dữ liệu chat định kỳ và qua WebSocket `chat:new_message`, `chat:lock_state`, `chat:hand_raise`.
   - Học sinh (`packages/server/public/student/index.html`): Bổ sung Nút nổi 💬 / ✋ góc màn hình kèm huy hiệu tin nhắn mới, Modal trò chuyện hai chiều với Thầy/Cô, Banner thông báo trượt Toast khi có tin nhắn từ Giáo viên, và nút "✋ Xin Thầy/Cô giúp" gửi yêu cầu trợ giúp tức thời lên bảng điều khiển của giáo viên.
4. **Giao diện thanh công cụ Kỳ thi**:
   - Thêm `@source "../../../packages"` vào `apps/teacher-ui/src/index.css` để Tailwind v4 quét đầy đủ classes.
   - Bổ sung inline styling màu sắc rõ ràng cho các nút `Thu bài & Khóa thi` (đỏ), `Xuất Excel (.xlsx)` (xanh lá), `Kết thúc Kỳ thi & Trở về` (đen) bảo đảm luôn hiển thị chữ và màu sắc sắc nét.

## [2.0.7] - 2026-10-08

### Tách độc lập tất cả ứng dụng/tiện ích thành các Module Plugin riêng biệt & Hỗ trợ Cửa sổ Trình chiếu Độc lập (2 Màn hình)
1. **Kiến trúc Plugin Module Độc lập (`apps/teacher-ui/src/activities/`)**:
   - Định nghĩa interface chuẩn `ActivityHostPlugin` và `ActivityHostProps` trong `types.ts`.
   - Tách biệt hoàn toàn từng tiện ích/ứng dụng thành các file plugin riêng lẻ:
     - `plugins/quiz-live.plugin.tsx`: Điều khiển và trình chiếu Quiz Live (Kahoot & Quizizz).
     - `plugins/quick-poll.plugin.tsx`: Điều khiển và trình chiếu Bình chọn nhanh (Poll).
     - `plugins/exam.plugin.tsx`: Điều khiển và giám sát Kỳ thi trực tiếp.
   - Quản lý tập trung qua `activityPluginsRegistry` trong `index.ts`. Để thêm ứng dụng mới trong tương lai, chỉ cần tạo file plugin độc lập và đăng ký 1 dòng, không ảnh hưởng tới mã nguồn hiện có.
2. **Cửa sổ Trình chiếu Độc lập (`ActivityHostWindow.tsx`)**:
   - Khi giáo viên bắt đầu bất kỳ hoạt động nào (Kahoot, Quizizz, Bình chọn nhanh, Kỳ thi), hệ thống tự động mở một cửa sổ mới độc lập (`window.open`) dành riêng cho việc trình chiếu.
   - Giáo viên có thể tự do kéo cửa sổ này sang máy chiếu hoặc màn hình phụ thứ hai và nhấn F11 để trình chiếu toàn màn hình.
   - Cửa sổ mới sở hữu thanh tiêu đề chuyên nghiệp: hiển thị trạng thái kết nối thời gian thực, nút Toàn màn hình F11, nút Kết thúc hoạt động và nút Đóng.
3. **Đồng bộ thời gian thực hai chiều (Dual-Screen Sync)**:
   - Cả cửa sổ chính và cửa sổ trình chiếu đều duy trì kết nối WebSocket song song với máy chủ, chia sẻ phiên làm việc tức thời.
   - Trên cửa sổ chính: Hiển thị banner thông báo hoạt động đang diễn ra trên cửa sổ riêng kèm nút `[🪟 Mở lại cửa sổ trình chiếu]` (nếu lỡ tắt) và `[⏹️ Kết thúc hoạt động]`, đồng thời vẫn giữ bảng điều khiển để giáo viên có thể quan sát và thao tác từ màn hình laptop chính.
4. **Kiểm thử & Tiêu chuẩn chất lượng**:
   - Bổ sung bộ kiểm thử `activity-plugins.test.tsx` xác minh việc nạp đúng các plugin.
   - Toàn bộ `teacher-ui` đạt 100% test pass (11/11 test files, 48/48 tests).
   - Kiểm tra nghiêm ngặt `pnpm lint`, `pnpm typecheck` và `pnpm deps:check` xanh hoàn toàn.

## [2.0.6] - 2026-10-08

### Hoàn thiện 5 nâng cấp cho Kỳ thi (Exam): Hiển thị tên học sinh thật, Công thức toán học & Ảnh bài làm, Nút bấm chữ rõ ràng, Xuất Excel tổng hợp thời gian & lựa chọn, Phân bổ điểm linh hoạt
1. **Hiển thị đúng tên học sinh thay vì fallback "Thí sinh 01M4"**:
   - Client học sinh tự động gửi intent `get_paper` kèm `displayName: studentName` ngay khi vào kỳ thi, đồng thời gửi kèm `displayName` trong mọi intent (`save_answer`, `submit_exam`, `report_status`, `unlock_exam`).
   - Máy chủ `exam-activity.ts` luôn cập nhật và giữ tên thật của học sinh trong danh sách thí sinh, không bao giờ rơi vào fallback `Thí sinh 01M4`.
2. **Chi tiết bài làm học sinh render công thức toán học KaTeX và hình ảnh**:
   - Tích hợp `renderLatexInText` từ `@educlass/question-kit` vào Modal xem chi tiết bài làm của học sinh (cho cả stem, options và explanation).
   - Hiển thị đầy đủ hình ảnh đính kèm của câu hỏi (`stemImages`) trên cả giao diện giáo viên và học sinh.
   - Thẻ câu hỏi thiết kế hiện đại, tương phản cao, badge trạng thái Đúng/Sai/Chưa làm sắc nét.
3. **Các nút bấm Kỳ thi hiển thị chữ đầy đủ và rõ ràng**:
   - Cố định font chữ đậm, kích thước tối thiểu `minHeight: 44px`, `whiteSpace: nowrap`, `flexShrink: 0` cho các nút điều khiển: `🚀 Mở đề & Bắt đầu tính giờ`, `⏱️ +5 phút (Toàn lớp)`, `🔒 Thu bài & Khóa thi`, `📥 Xuất Excel (.xlsx)`, `⏹️ Kết thúc Kỳ thi & Trở về`.
   - Các nút trong bảng thí sinh: `⏱️ +5 phút`, `🔒 Thu bài`, `👁️ Xem bài`. Nút `📋 Lưới câu` trên học sinh luôn hiện chữ trên mọi kích thước màn hình.
4. **Nâng cấp báo cáo xuất Excel (.xlsx) cho Kỳ thi**:
   - Sheet 2 *Bảng điểm học sinh*: Bổ sung thêm 2 cột "Thời gian bắt đầu làm bài" và "Thời gian làm bài" (định dạng phút:giây `mm:ss`, ví dụ `15:30`).
   - Bổ sung Sheet 3 *Tổng hợp*: Gồm Hạng, Mã thí sinh, Họ và tên, Điểm, Số câu đúng, Tổng số câu, Thời gian bắt đầu làm, Thời gian làm bài, và phương án lựa chọn cụ thể từng câu của mỗi học sinh (`A (Đúng)`, `C (Sai)`,...).
5. **Cấu hình & Phân bổ điểm số linh hoạt từng câu hỏi**:
   - Trong modal mở Kỳ thi của giáo viên: Nạp danh sách câu hỏi xem trước kèm công cụ phân bổ điểm nhanh.
   - Hỗ trợ "Chia đều theo Tổng điểm mong muốn" (ví dụ đề 7 điểm chia đều 28 câu = 0.25 điểm/câu).
   - Hỗ trợ "Gán cùng điểm cho tất cả các câu" (ví dụ nhập 0.25 áp dụng toàn bộ).
   - Hỗ trợ chỉnh sửa/nhập thủ công điểm số cho từng câu hỏi cụ thể, kèm badge cập nhật trực tiếp tổng điểm toàn bộ đề thi.

## [2.0.5] - 2026-10-08

### Hoàn thiện 7 tính năng và khắc phục lỗi: Nút bấm Quizizz, Chuyển chế độ Kahoot sang Quizizz, Kỳ thi (Exam) đếm giờ riêng, Bảng câu hỏi bên phải, Xem điểm & đáp án, Báo cáo & Xuất Excel
1. **Sửa 2 nút bấm ở chế độ Quizizz**:
   - Cố định kích thước 2 nút điều khiển `🏁 Thu bài & Tổng kết Quizizz` và `⏹️ Kết thúc Quiz & Trở về` với font chữ đậm, nền màu xanh/đỏ rõ ràng, `minHeight: 44px`, không bao giờ bị co rút thành icon nhỏ.
2. **Khắc phục triệt để lỗi chuyển từ Kahoot sang Quizizz**:
   - Bổ sung hàm `resetQuizState()` xóa sạch toàn bộ trạng thái ván chơi cũ (`currentQuestionIdx = -1`, `hasAnsweredCurrentQuestion = false`, `myQuizQuestionOrder = null`, xóa feedback, streak và các class `selected`/`disabled` trên 4 nút Kahoot).
   - Tự động kích hoạt khi `currentRunId !== runId`, khi nhận sự kiện kết thúc hoạt động `activity_end` và khi trở về phòng chờ `showLobby`.
3. **Kỳ thi: Thoát ra để học sinh khác vào không bị hiển thị bài làm của học sinh trước**:
   - Trong `handleLeaveSession()`, xóa sạch toàn bộ `examAnswers = {}`, `examState = null`, `examIsSubmitted = false`, dọn sạch DOM `#exam-questions-list` và `#exam-nav-grid`.
   - Trong `handleExamUpdate()`, chỉ nạp câu trả lời của chính học sinh hiện tại (`myStatus.answers`), tuyệt đối không merge với dữ liệu trong bộ nhớ của học sinh trước đó.
4. **Kỳ thi: Thời gian làm bài tính từ thời điểm học sinh vào làm bài**:
   - Máy chủ tự động ghi nhận mốc `startedAt` và `individualExpiresAt` riêng biệt cho từng thí sinh kể từ thời điểm mở đề làm bài, không phụ thuộc vào giờ giáo viên mở phòng thi.
   - Đồng hồ đếm ngược trên màn hình học sinh đếm theo thời gian cá nhân của thí sinh đó và tự động nộp bài khi hết giờ cá nhân.
5. **Kỳ thi: Bảng câu hỏi chuyển sang BÊN PHẢI**:
   - Tái cấu trúc giao diện làm bài của học sinh sang layout 2 cột hiện đại: Cột trái hiển thị đề bài câu hỏi và nút Nộp bài; Cột phải hiển thị Bảng câu hỏi (Question Palette) dạng `sticky` cố định khi cuộn trang, lưới ô số câu 4 cột trực quan.
   - Tự động điều chỉnh linh hoạt trên màn hình điện thoại di động (responsive).
6. **Kỳ thi: Tùy chọn cho học sinh xem điểm & xem đáp án chi tiết sau khi thi**:
   - Thêm 2 tùy chọn cấu hình trong modal mở kỳ thi của giáo viên: `Cho phép học sinh xem điểm số sau khi nộp bài` (`allowViewScore`) và `Cho phép học sinh xem lại bài làm & đáp án sau khi nộp` (`allowViewReview`).
   - Tự động chấm điểm ngay khi học sinh bấm nộp bài. Học sinh có thể xem thẻ điểm số và bấm nút `🔍 Xem lại bài làm & Đáp án đúng` để xem danh sách câu hỏi kèm công thức Toán KaTeX, đáp án đã chọn (xanh/đỏ), đáp án đúng và lời giải chi tiết.
7. **Kỳ thi: Báo cáo, xuất Excel, xem trực tiếp kết quả bài làm của từng học sinh**:
   - Thêm nút `👁️ Xem bài` tại mỗi thẻ thí sinh trong bảng giám sát trực tiếp cũng như bảng điểm tổng kết; mở Modal xem chi tiết toàn bộ các câu hỏi và câu trả lời của thí sinh đó.
   - Thêm nút `📥 Xuất Excel (.xlsx)` nổi bật trên thanh công cụ điều khiển của giáo viên, cho phép xuất file Excel gồm 4 bảng tính chuyên nghiệp: Tổng quan & Phổ điểm, Bảng điểm học sinh, Phân tích câu hỏi, và Ma trận làm bài.

## [2.0.4] - 2026-10-08

### Khắc phục toàn diện 6 vấn đề: Bảng chọn tên lớp HS, Lỗi kết thúc sớm Quizizz khi đảo đề, Nút thoát hoạt động rõ ràng, Giãn cách giao diện Kỳ thi, Question Palette HS & Thoát nộp bài Kỳ thi
1. **Bảng chọn tên theo danh sách lớp (Roster Mode) trên cổng Học sinh**:
   - Tự động nhận diện `code` từ URL param khi quét mã QR hoặc gõ mã phòng 6 ký tự, gọi `GET /api/sessions/code/:code/roster` để tải danh sách học sinh.
   - Hiển thị bảng chọn tên dạng lưới thẻ học sinh (`roster-card`) với ô tìm kiếm nhanh; hiển thị huy hiệu `(Đã vào)` đối với học sinh đang có mặt, ngăn trùng tên.
   - Hỗ trợ tài khoản có mã PIN: tự động mở ô nhập PIN bảo vệ trước khi vào lớp. Hỗ trợ chế độ kết hợp `roster_or_guest` cho phép chuyển đổi linh hoạt giữa chọn danh sách lớp và nhập tên khách.
2. **Sửa lỗi Quizizz tự kết thúc bài sớm khi đảo câu hỏi**:
   - Trong `quiz-activity.ts`, thay thế cách tính `isCompleted` dựa trên chỉ số câu `qIndex + 1` bằng cách đếm tổng số câu đã làm thực tế (`totalAnswered = Object.keys(existingProgress.answers).length + 1`).
   - Khắc phục triệt để lỗi học sinh làm trúng câu cuối của đề ở lượt đầu tiên bị hệ thống hiểu nhầm là đã hoàn thành bài thi.
3. **Nút kết thúc & thoát hoạt động rõ ràng, có chữ báo đầy đủ**:
   - Ở màn hình tổng kết Quiz Live: Thay thế icon lá cờ đơn lẻ bằng 2 nút hành động rõ ràng: `⏹️ Thoát Bài Quiz & Về Bàn Làm Việc` và `🔄 Quay Lại Chọn Hoạt Động Khác`.
   - Nâng cấp nút kết thúc hoạt động trên header của cả Quiz Live và Kỳ thi (Exam): hiển thị chữ báo nổi bật `⏹️ Kết thúc Kỳ thi & Trở về` thay vì nút vuông icon nhỏ.
4. **Điều chỉnh giao diện Kỳ thi giáo viên (ExamTeacherPanel) thoáng mắt, đẹp mắt**:
   - Tăng độ giãn cách giữa các dòng thông tin thời lượng, mật khẩu, tiến độ thi.
   - Phân chia danh sách thí sinh thành các thẻ card riêng biệt với viền bo tròn, padding rộng rãi `p-4`, cách biệt rõ ràng giữa tiến độ làm bài và cảnh báo rời màn hình.
5. **Bảng câu hỏi đã làm / chưa làm trong Kỳ thi cho học sinh (Question Navigation Palette)**:
   - Tích hợp thanh điều hướng câu hỏi dính (`sticky`) trên đầu bài thi của học sinh: hiển thị tiến độ `Đã làm: X/Y câu`.
   - Hiển thị lưới nút số câu `[1✓] [2] [3✓]`: câu đã trả lời đổi màu xanh lá đậm kèm dấu tích `✓`, câu chưa làm nền xám.
   - Nhấn vào số câu tự động cuộn mượt (`scrollIntoView`) tới câu hỏi tương ứng và tạo hiệu ứng nhấp nháy viền để học sinh nhận biết ngay.
6. **Sửa vòng lặp ép màn hình nộp bài Kỳ thi & Nút thoát cho học sinh khác thi chung máy**:
   - Thêm cờ `examSubmittedDismissed` để ngăn polling ép học sinh quay lại màn hình nộp bài khi đã bấm "Về phòng chờ của lớp".
   - Bổ sung nút nổi bật màu đỏ `🚪 Thoát để học sinh khác đăng nhập` tại màn hình nộp bài thi, giải phóng token và đưa ngay về form đăng nhập chọn tên sạch sẽ cho học sinh tiếp theo tham gia thi chung máy.
7. **Sửa lỗi tắt ứng dụng vẫn còn tiến trình ngầm trong Task Manager & lỗi EADDRINUSE 0.0.0.0:3000**:
   - Loại bỏ hành vi ẩn cửa sổ vào khay khi người dùng bấm dấu X đỏ. Khi bấm X, ứng dụng sẽ kích hoạt quy trình thoát hoàn toàn (`cleanupAndExit`).
   - Đảm bảo đóng Fastify server, hủy toàn bộ các cửa sổ và tray icon trước khi thoát bằng `app.exit(0)`, xóa sạch 100% tiến trình con trong Task Manager.
   - Sửa Single Instance Lock: Khi mở app lần 2 trong lúc app đang chạy, tiến trình mới sẽ lập tức thoát ngay bằng `app.exit(0)` thay vì tiếp tục chạy `whenReady` gây đụng cổng.
   - Thêm cơ chế tự động giải phóng cổng (`freePortIfOccupied(3000)`) trên Windows trước khi khởi động Fastify, đảm bảo không bao giờ bị dính lỗi `listen EADDRINUSE: address already in use 0.0.0.0:3000`.

## [2.0.3] - 2026-10-08

### Khắc phục toàn diện 6 lỗi: KaTeX HS, Giao diện Quizizz GV, Phát đề thi Kỳ thi (Exam), Đảo câu hỏi HS, Nút kết thúc & Báo cáo kết thúc tiết học
1. **Hiển thị công thức Toán học KaTeX trên giao diện học sinh**:
   - Khắc phục đường dẫn nạp tài nguyên KaTeX offline trong `student/index.html` sang đường dẫn tương đối `./vendor/katex/katex.min.css` và `./vendor/katex/katex.min.js`.
   - Cấu hình server `serve-ui.ts` mở rộng route tĩnh `/student/` phục vụ đúng thư mục tài nguyên học sinh và font KaTeX offline.
   - Hỗ trợ hàm `renderMath` chuẩn hóa các dạng công thức `$x^2$`, `${x}^{2}$`, `$$...$$`, `\(...\)`, `\[...\]` cho cả Quiz Live và Kỳ thi (Exam).
2. **Giao diện Quizizz phía Giáo viên tinh gọn theo mô hình Quizizz chuẩn**:
   - Ẩn hoàn toàn khối câu hỏi và các lựa chọn đáp án trên màn hình giáo viên khi chạy chế độ Quizizz (vì học sinh làm theo tốc độ riêng của từng bạn).
   - Thay thế bằng **Bảng Tiến Độ & Kết Quả Trực Tiếp Toàn Lớp**: thanh tiến độ hoàn thành chung, bảng chi tiết từng học sinh (Hạng, Tên, Tiến độ câu đang làm, Số câu đúng, Chuỗi streak, Điểm số thời gian thực).
   - Tích hợp 2 nút điều khiển chuyên dụng cho Quizizz: `🏁 Thu bài & Tổng kết Quizizz` và `⏹️ Kết thúc Quiz & Trở về`.
3. **Phát đề thi Kỳ thi (Exam) hoàn chỉnh xuống học sinh**:
   - Bổ sung màn hình Kỳ thi `#exam-view` hoàn chỉnh trong cổng học sinh `student/index.html`.
   - Hỗ trợ toàn bộ quy trình làm bài thi: xác thực mật khẩu đề thi (nếu có), màn hình chờ mở đề, đồng hồ đếm ngược thời gian thực, hiển thị danh sách câu hỏi kèm công thức toán học KaTeX, tự động lưu đáp án (`save_answer`), và nút nộp bài thi (`submit_exam`) có hộp thoại xác nhận an toàn.
   - Hiển thị kết quả điểm số và xếp hạng của học sinh ngay sau khi nộp bài hoặc khi giáo viên thu bài.
4. **Cài đặt đảo câu hỏi & đảo đáp án độc lập cho từng học sinh ở Quizizz**:
   - Bổ sung 2 checkbox trực quan trong modal khởi động Quiz Live:
     - `🔀 Đảo thứ tự câu hỏi (mỗi học sinh làm thứ tự khác nhau ở Quizizz)`
     - `🔀 Đảo thứ tự các phương án lựa chọn (A, B, C, D)`
   - Phía học sinh: Tạo hoán vị câu hỏi ngẫu nhiên độc lập (`myQuizQuestionOrder`), đảm bảo mỗi học sinh làm đề theo thứ tự khác nhau, khi nộp bài gửi đúng chỉ số câu hỏi gốc để máy chủ chấm điểm chính xác.
5. **Nút kết thúc Kỳ thi luôn sẵn sàng**:
   - Bổ sung nút `⏹️ Kết thúc Kỳ thi & Trở về` (gọi `doEnd()`) trực tiếp tại thanh điều khiển trên cùng của `ExamTeacherPanel`, cho phép giáo viên đóng kỳ thi và quay về Bàn làm việc bất cứ lúc nào.
6. **Sửa triệt để lỗi "Cannot read properties of undefined (reading 'gamification')" khi kết thúc tiết học**:
   - Khắc phục `client.ts`: unwrap đúng `res.report` từ response `{ session, report }` của endpoint `POST /api/sessions/:id/close`.
   - Bọc phòng vệ an toàn trong `TeacherSessionSummaryView.tsx` với fallback snapshot đầy đủ các trường, loại bỏ hoàn toàn lỗi crash khi kết thúc tiết học.

### Khắc phục triệt để hiển thị Toán học, Chế độ Quizizz tự tốc độ & Điều khiển Quiz Live
- **Hiển thị công thức Toán học KaTeX offline (Cả GV & HS)**:
  - Tích hợp KaTeX offline (`katex.min.js`, `katex.min.css`, fonts) vào trang học sinh `packages/server/public/student/vendor/katex/`.
  - Hỗ trợ phân tích cú pháp biểu thức toán học `$x^2$`, `${x}^{2}$`, `$$...$$`, `\(...\)`, `\[...\]` bằng KaTeX tự động cho đề bài câu hỏi và các phương án lựa chọn.
  - Phía Giáo viên: Sử dụng `renderLatexInText` từ `@educlass/question-kit` cho `QuizLiveStudentView`, `QuizLiveTeacherPanel`, và `QuizLiveProjectorView`.
- **Sửa lỗi nhận diện đáp án đúng & thống kê lượt chọn**:
  - Viết hàm `parseCorrectAnswer`, `parseTfCorrectAnswer`, `parseShortCorrectAnswer` chuẩn hóa đáp án từ Ngân hàng câu hỏi, hỗ trợ đầy đủ các định dạng số `0..3`, chữ cái `'A'..'D'`, boolean, và string.
  - Nâng cấp `checkAnswerCorrectness` trong `quiz-activity.ts` sử dụng `toOptionIndex` và `toBooleanVal`, đảm bảo học sinh chọn đáp án đúng luôn được cộng điểm, tăng streak và ghi nhận thống kê chính xác.
- **Sửa lỗi Bảng xếp hạng hiển thị mã rút gọn "Học sinh 01M4"**:
  - Gửi kèm `displayName` thật của học sinh trong payload gửi bài `submit_answer`.
  - Máy chủ `engine.ts` tự động tra cứu `participantRepo` và đính kèm `displayName` chính thức của học sinh vào mọi intent, giúp Leaderboard luôn hiển thị đúng họ tên thật của học sinh.
- **Bổ sung màn hình kết thúc & Nút trở về Bàn làm việc**:
  - Bổ sung màn hình tổng kết hoàn thành bài Quiz cho Giáo viên khi `state.status === 'finished'` với bục vinh danh Top 3 và nút nổi bật: `🏁 KẾT THÚC HOẠT ĐỘNG & TRỞ VỀ BÀN LÀM VIỆC`.
  - Luôn hiển thị nút `⏹️ Kết thúc Quiz` màu đỏ ở góc thanh điều khiển trên cùng tại mọi thời điểm.
- **Chế độ Quizizz (Tự theo tốc độ riêng của học sinh)**:
  - Học sinh làm bài theo chỉ số tiến độ riêng (`myProgress.currentIndex`), không bị phụ thuộc vào câu hỏi hiện tại của giáo viên.
  - Sau khi chọn đáp án, hệ thống hiển thị kết quả đúng/sai và tự động chuyển mượt sang câu tiếp theo sau 1 giây.
  - Trên màn hình Giáo viên: Hiển thị thanh tiến độ làm bài chung của cả lớp (`Đã xong: X/Y học sinh`).
- **Chọn bộ đề thi từ Ngân hàng câu hỏi cho cả Quizizz & Kỳ thi (Exam)**:
  - Bổ sung dropdown chọn bộ câu hỏi từ Ngân hàng đề thi cho cả Quiz Live (Kahoot / Quizizz) và Kỳ thi (`exam`), tự động nạp đề và chuyển đổi cấu trúc câu hỏi mượt mà.

## [2.0.1] - 2026-10-08

### Sửa lỗi tương tác Realtime Học sinh - Giáo viên & Tái đóng gói ứng dụng
- **Sửa lỗi không kết thúc được tiết học (Lỗi 3)**:
  - Cấu hình Fastify Content Type Parser chấp nhận body rỗng `application/json` thành `{}` thay vì quăng lỗi 400 `FST_ERR_CTP_EMPTY_JSON_BODY`.
  - Chuẩn hóa `client.ts`: chỉ thêm header `Content-Type: application/json` khi có body; gọi `closeSession(id)` kèm body `{ reason }` và bổ sung phương thức fallback an toàn `closeActiveSession()`.
  - Cập nhật giao diện `SessionControl`: hiển thị trạng thái đang kết thúc tiết học và disable nút chống bấm trùng lặp.
- **Sửa lỗi học sinh thoát nhưng giáo viên vẫn thấy (Lỗi 2)**:
  - WebSocket Gateway: liên kết `participantId` trực tiếp vào kết nối socket, tự động cập nhật CSDL `status = 'offline'` và phát sóng sự kiện `participant_left` ngay khi ngắt kết nối.
  - Bổ sung endpoint REST `POST /api/sessions/:id/leave` hỗ trợ học sinh rời lớp chủ động hoặc qua `navigator.sendBeacon` khi đóng tab/trình duyệt (`beforeunload`, `pagehide`).
  - Cập nhật giao diện giáo viên: bổ sung tùy chọn bộ lọc "Chỉ hiện học sinh đang có mặt" (mặc định bật).
- **Sửa lỗi học sinh không thấy bình chọn (Lỗi 1)**:
  - Bổ sung giao diện và bộ điều khiển Quick Poll (`#poll-view`) trong `student/index.html`.
  - Hỗ trợ đồng bộ trạng thái bình chọn qua WebSocket và long-polling, cho phép học sinh biểu quyết trực tiếp và hiển thị phản hồi tức thì.
- **Sửa lỗi Kahoot không cho chọn bộ đề & không chuyển câu tiếp theo (Lỗi 4)**:
  - Bổ sung dropdown chọn bộ câu hỏi từ Ngân hàng đề thi trong modal mở Quiz Live, tự động ánh xạ câu hỏi trắc nghiệm sang định dạng câu hỏi Kahoot.
  - Thêm nút "Chuyển câu tiếp theo ➡" ngay trong trạng thái đang chạy câu hỏi để giáo viên linh hoạt điều khiển.
  - Xử lý đồng bộ WebSocket nhận gói tin `activity_state` và cập nhật tức thì trạng thái câu hỏi trên giao diện.
- **Biên dịch và đóng gói hoàn chỉnh phiên bản 2.0.0**:
  - Biên dịch lại toàn bộ `apps/teacher-ui` (Vite production bundle) và đồng bộ tài nguyên sang máy chủ.
  - Đóng gói mới bộ cài đặt Windows độc lập `apps/desktop/dist/installer/EduClass v2 Setup 2.0.0.exe` (102.7 MB) và bản portable `EduClass v2.exe`.

## [2.0.0] - 2026-10-07

### Đóng gói ứng dụng React Teacher UI & Xuất bộ cài đặt Windows .exe độc lập
- **Xây dựng ứng dụng hoàn chỉnh cho `apps/teacher-ui`**:
  - Tạo `App.tsx` tích hợp toàn bộ các tab chức năng:
    - 🏫 `ClassTab`: Quản lý lớp học, dán học sinh từ clipboard/Excel, cài đặt PIN.
    - 📚 `QuestionBankTab`: Quản lý bộ đề, soạn câu hỏi trực tiếp (`QuestionEditor`), nhập đề từ file Word `.docx` (`WordImportModal`), xuất/nhập gói `.educlass`.
    - 🎮 `SessionControl` & `ActivityPanel`: Mở phòng học, mã PIN 6 số, QR code, danh sách HS online/offline, chat trực tiếp, giơ tay, khởi chạy Quiz Live (Kahoot 4 màu & Quizizz tự do).
    - ⚡ `ExpSettingsTab`: Cài đặt quy tắc điểm EXP, trần EXP chống lạm phát điểm, khôi phục mặc định.
    - 📊 `SessionReportView`: Xem tổng kết phiên, vinh danh Top 3, xuất file Excel `.xlsx`.
  - Thiết lập Vite bundler (`vite.config.ts`), biên dịch offline KaTeX fonts, CSS tokens vào `apps/teacher-ui/dist`.
  - Viết bộ unit test `apps/teacher-ui/src/__tests__/app.test.tsx` (10/10 test files, 46/46 tests pass).
- **Tích hợp vào `apps/desktop`**:
  - Mở rộng Electron Main Process (`apps/desktop/src/main.ts`) hỗ trợ mở cửa sổ Bàn Làm Việc Giáo Viên riêng biệt (`BrowserWindow` 1280x850) hoặc mở trên trình duyệt bên ngoài.
  - Cập nhật giao diện điều khiển máy chủ `window.html` và System Tray menu.
  - Cấu hình phục vụ tĩnh `teacher-ui` từ `extraResources` khi chạy ứng dụng đã đóng gói.
- **Khắc phục triệt để lỗi khởi động Electron Main Process & Native Module**:
  - Khắc phục lỗi `ERR_UNKNOWN_FILE_EXTENSION .ts`: Sử dụng `esbuild` đóng gói toàn bộ server và dependencies thành một file CommonJS duy nhất `dist/main.cjs`.
  - Giải quyết lỗi lệch ABI native module (`better_sqlite3.node` NODE_MODULE_VERSION 127 vs 132): Tạo hook `afterPack` tự động tích hợp binary biên dịch riêng cho Electron ABI 132 vào thư mục đóng gói `app.asar.unpacked`.
  - Lưu trữ cơ sở dữ liệu SQLite bền vững trên máy tính người dùng tại `%APPDATA%/@educlass/desktop/data/educlass.sqlite` với WAL mode.
- **Khắc phục triệt để lỗi màn hình trắng trơn & phản hồi nút bấm trên Windows**:
  - *Sửa lỗi Buffer is not defined*: Bổ sung browser-safe base64 và polyfill `Buffer` trong `main.tsx`, lazy evaluation cho các module đọc file Word trong `question-kit`.
  - *Sửa lỗi TypeError e.map*: Chuẩn hóa cơ chế unwrap dữ liệu mảng an toàn cho các endpoint REST (`/api/classes`, `/api/question-sets`, `/api/activities`) và tự động xác thực token giáo viên mặc định `admin` / `admin123`.
  - *Sửa lỗi nút bấm không phản hồi*: Đăng ký sự kiện `did-finish-load` trước `loadFile`, bổ sung IPC hai chiều `get-server-info` và `open-external` uỷ quyền cho Electron Main process mở trình duyệt mặc định hệ thống.
- **Khắc phục giao diện Nhập đề thi từ file Word (.docx) & Tích hợp TailwindCSS D9**:
  - *Tích hợp TailwindCSS (@tailwindcss/vite)*: Cài đặt và cấu hình theo chuẩn ngăn xếp D9 trong PLAN.md, tạo bundle 53KB CSS hỗ trợ toàn bộ utility classes (flex, grid, transitions, animations).
  - *Sửa lỗi Modal bị bung thành khối thô dưới trang*: Bổ sung lớp style fixed overlay (`position: fixed`, `backdrop-filter`, `z-index: 9999`) và card dialog bo góc 16px chuẩn Design System, giúp modal luôn nổi popup trên màn hình.
  - *Ẩn hoàn toàn thẻ input file mặc định*: Bổ sung `style={{ display: 'none' }}` triệt tiêu thanh chọn tệp thô kệch của trình duyệt, thay thế bằng khu vực kéo thả (drag & drop) và nhấp chọn tệp hiện đại.
  - *Sửa lỗi "Máy chủ không thể phân tích file Word"*: Chuẩn hóa phương thức `api.importWord(base64)` trong `client.ts` tự động đính kèm token xác thực `Authorization: Bearer <token>`, phân tích cú pháp đề Word, công thức toán OMML sang LaTeX và trích xuất ảnh CAS mượt mà.
  - *Khắc phục vòng phụ thuộc kiến trúc*: Tách `QuestionSetItem` khỏi vòng import chéo giữa `client.ts` và `QuestionBankTab.tsx`, `pnpm deps:check` đạt chuẩn 0 vi phạm (1,020 modules).
- **Khắc phục lỗi lưu câu hỏi Ngân hàng đề thi & Khởi chạy Hoạt động (Quiz Live, Bình chọn, Kỳ thi)**:
  - *Lưu câu hỏi từ file Word và Soạn thủ công*: Bổ sung trường `questions` vào `CreateQuestionSetRequestSchema` và `UpdateQuestionSetRequestSchema`. Cập nhật các endpoint `POST /api/question-sets` và `PUT /api/question-sets/:id` tự động chuyển đổi danh sách câu hỏi thành `contentJson` / `answerJson` để lưu bền vững vào bảng SQLite `questions` qua `questionSetRepo`.
  - *Khôi phục dữ liệu câu hỏi chi tiết*: Cập nhật `GET /api/question-sets/:id` tự động giải mã `contentJson` và `answerJson` thành model `Question` đầy đủ. Bổ sung `api.getQuestionSet(id)` có xác thực Bearer token, giúp mở modal soạn câu hỏi tải đúng danh sách câu đã lưu.
  - *Sửa lỗi "Not Found" khi Bắt đầu hoạt động*: Đồng bộ endpoint khởi chạy `/api/sessions/:id/activities/start`, gửi intent `/api/sessions/:id/activities/teacher-intent`, và kết thúc `/api/sessions/:id/activities/end`. Bổ sung alias route song song `/api/activities/run` trên máy chủ Fastify để tương thích hoàn toàn.
- **Đóng gói bộ cài đặt Windows NSIS (`.exe`)**:
  - Cấu hình `electron-builder.json` và kịch bản NSIS tự động cấu hình Windows Firewall cho cổng 3000.
  - Biên dịch và đóng gói thành công file cài đặt độc lập: `EduClass v2 Setup 2.0.0.exe` (105.8 MB) và bản portable unpacked tại `apps/desktop/dist/installer/win-unpacked/EduClass v2.exe`.
  - Tích hợp tài nguyên tĩnh hoàn chỉnh vào thư mục `resources/teacher-ui` và `resources/public`.

## [0.1.0] - 2026-10-05

### Task 0.1: Khởi tạo monorepo pnpm, TS strict, ESLint, Prettier, Vitest, dependency-cruiser, CI
- Thiết lập cấu trúc monorepo với pnpm workspace (`apps/*`, `packages/*`, `packages/activities/*`).
- Thiết lập TypeScript strict mode ở mức cao nhất (`tsconfig.base.json`), cấm `any`.
- Thiết lập cấu hình ESLint flat config (`eslint.config.mjs`) với rule cấm `any` (`@typescript-eslint/no-explicit-any: error`).
- Thiết lập Prettier và cấu hình `.prettierignore`.
- Cấu hình Vitest (`vitest.config.ts`) và viết bộ unit tests khung cho tất cả 9 packages/apps.
- Thiết lập dependency-cruiser (`.dependency-cruiser.cjs`) thực thi nghiêm ngặt luật phụ thuộc kiến trúc theo PLAN.md mục 2.
- Thiết lập GitHub Actions CI workflow (`.github/workflows/ci.yml`) tự động chạy lint, typecheck, test, deps:check.
- Đã nghiệm thu và vượt qua toàn bộ: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm deps:check`.

### Task 0.2: `protocol`: envelope, mã lỗi, enum trạng thái (+ test schema)
- Định nghĩa định dạng phong bì tin nhắn chuẩn `Envelope: {v:1, id, type, sessionId, ts, payload}` kèm factory `createEnvelope` và schema generic `createEnvelopeSchema`.
- Định nghĩa danh mục mã lỗi chuẩn `ErrorCode` (`NAME_TAKEN`, `SESSION_CLOSED`, `BAD_CODE`, `FORBIDDEN`, `UNAUTHORIZED`, `INVALID_PAYLOAD`, ...) cùng thông điệp tiếng Việt thân thiện theo PLAN 7.2 và helper `formatProtocolError`.
- Định nghĩa đầy đủ các enum trạng thái hệ thống: `UserRole`, `SessionStatus`, `IdentityMode`, `IdentityLevel`, `ParticipantStatus`, `ActivityRunStatus`, `QuestionType`, `RewardScope`.
- Tạo tài liệu giao thức chi tiết tại `docs/protocol.md`.
- Viết bộ unit test toàn diện cho envelope, error codes và enums với 100% test xanh (37/37 tests pass).

### Task 0.3: `db`: Drizzle, hệ migration + backup tự động, repo mẫu
- Khởi tạo kiến trúc CSDL SQLite với `better-sqlite3` và `drizzle-orm`, hỗ trợ cả chế độ in-memory (`:memory:`) và chế độ file đĩa (bật `PRAGMA foreign_keys = ON` và `PRAGMA journal_mode = WAL`).
- Định nghĩa đầy đủ toàn bộ 19 bảng mô hình dữ liệu theo PLAN.md mục 3 trong `packages/db/src/schema/index.ts` (`users`, `classes`, `students`, `titles`, `student_titles`, `question_sets`, `questions`, `assets`, `sessions`, `participants`, `teams`, `activity_runs`, `activity_results`, `exam_answers`, `reward_rules`, `reward_log`, `chat_messages`, `session_reports`, `audit_log`, `_migrations`).
- Tích hợp chuẩn ID dạng ULID (26 ký tự) thông qua thư viện `ulidx`.
- Xây dựng hệ thống migration đánh số phiên bản tăng dần `0001_initial_schema.sql` cùng cơ chế idempotent và tự động sao lưu an toàn tập tin CSDL (`.backup-<timestamp>-v<targetVersion>.db`) trước khi áp dụng bất kỳ migration mới nào.
- Xây dựng Repository mẫu `UserRepository` với các hàm CRUD `create()`, `findById()`, `findByUsername()`, `listAll()`, `updateDisplayName()`.
- Viết bộ unit test toàn diện cho Schema & ràng buộc khóa ngoại, Migrator & Auto-backup, và UserRepository mẫu với 100% test xanh (43/43 tests pass).

### Task 0.4: `server`: Fastify, WS gateway, health, serve static 2 UI
- Xây dựng Fastify server trong `packages/server/src/app.ts` tích hợp `@fastify/websocket`, `@fastify/static`, và endpoint `/health`.
- Triển khai endpoint `GET /health` trả về trạng thái máy chủ, timestamp và phiên bản giao thức `v: 1`.
- Triển khai WebSocket Gateway tại `packages/server/src/ws/gateway.ts` (endpoint `/ws`) với `WsGatewayManager`:
  - Xác thực nghiêm ngặt phong bì tin nhắn theo `EnvelopeSchema` của `@educlass/protocol`.
  - Trả về mã lỗi `INVALID_PAYLOAD` khi tin nhắn không đúng định dạng Envelope hoặc không phải JSON.
  - Xử lý tin nhắn heartbeat `ping` -> phản hồi `pong`.
  - Quản lý danh sách kết nối client, hỗ trợ broadcast trong phiên (`broadcastToSession`) và gửi trực tiếp.
- Triển khai plugin phục vụ tài nguyên tĩnh `packages/server/src/static/serve-ui.ts` cho 2 giao diện:
  - Teacher UI tại route prefix `/teacher` (hỗ trợ SPA fallback và chuyển hướng).
  - Student UI PWA tại route `/`.
- Viết bộ unit/integration test toàn diện cho Health endpoint, WebSocket Gateway và phục vụ static với 100% test xanh (50/50 tests pass).

### Task 0.5: `ui-kit`: tokens + Button, Card, Input, Modal, Toast, Banner (có Storybook hoặc trang demo)
- Triển khai toàn bộ Design Tokens theo PLAN.md mục 7.1 & 7.2:
  - Bảng màu tươi sáng (`#4F8CFF`, `#FFF9F0`, `#2ECC8F`, `#FF6B6B`, `#FFB020`, ...).
  - 4 màu đáp án Kahoot kèm bắt buộc ký hiệu hình khối (▲◆●■) hỗ trợ học sinh mù màu.
  - Quy chuẩn vùng chạm tối thiểu ≥ 48px và khoảng cách giữa các nút ≥ 8px.
  - Quy chuẩn kiểu chữ: cỡ chữ thân HS ≥ 18px, tiêu đề 24-32px.
  - Quy chuẩn bo góc 16-24px và đổ bóng mềm.
- Triển khai 6 Components cốt lõi tuân thủ nghiêm ngặt quy tắc UX:
  - `Button`: vùng chạm ≥ 48px, các biến thể ngữ nghĩa và 4 biến thể Kahoot (đỏ ▲, xanh dương ◆, vàng ●, xanh lá ■), loading và disabled states.
  - `Card`: bo góc 20px, đổ bóng mềm, hỗ trợ tiêu đề, phụ đề và chân thẻ.
  - `Input`: chiều cao ≥ 48px, cỡ chữ ≥ 18px, hỗ trợ nhãn và thông báo lỗi tiếng Việt dễ hiểu.
  - `Modal`: hộp thoại accessible, backdrop mờ, hỗ trợ phím Escape và nút đóng.
  - `Toast`: thông báo nổi phản hồi nhanh với tự động biến mất và nút tắt.
  - `Banner`: thanh cảnh báo trên đầu (đặc biệt hỗ trợ thông báo mất mạng "Đang kết nối lại...").
- Xây dựng trang Demo tương tác:
  - `DemoPage.tsx` dạng React component tương tác trực tiếp.
  - `packages/ui-kit/demo/index.html` trang demo tĩnh ngoại tuyến (không phụ thuộc CDN).
- Viết bộ unit test toàn diện cho Tokens và tất cả 6 Components với 100% test xanh (65/65 tests pass).

### Task 0.6: `desktop`: Electron khởi chạy server, hiện IP LAN + QR, installer + rule Firewall
- Triển khai tiện ích mạng `apps/desktop/src/network.ts`: tự động dò tìm địa chỉ IP mạng nội bộ (LAN IP) của máy Windows giáo viên, ưu tiên dải 192.168.x hoặc 10.x.
- Triển khai module `apps/desktop/src/qr.ts`: tạo mã QR dạng base64 Data URL và SVG (dùng thư viện `qrcode`) cho link học sinh truy cập vào lớp.
- Triển khai Embedded Server Runner `apps/desktop/src/server-runner.ts`: khởi chạy Fastify server nhúng lắng nghe trên `0.0.0.0` cho phép toàn bộ thiết bị trong mạng WiFi truy cập, tự động sinh link truy cập LAN và mã QR tương ứng.
- Xây dựng giao diện máy chủ Desktop Electron `apps/desktop/src/main.ts`, `preload.ts` và `window.html`: hiển thị trạng thái server, mã QR, link IP LAN và hỗ trợ System Tray.
- Thiết lập kịch bản NSIS installer `apps/desktop/build/installer.nsh` và `apps/desktop/electron-builder.json` tự động tạo rule Windows Firewall cho cổng 3000 (`netsh advfirewall firewall add/delete rule`) khi cài đặt và gỡ cài đặt (đáp ứng D1 PLAN.md).
- Viết bộ unit test toàn diện cho network utilities, sinh QR, khởi chạy server nhúng, và cấu hình script Firewall với 100% test xanh (75/75 tests pass).

### Task 1.1: Auth GV (đăng nhập, phiên, đổi mật khẩu); admin tạo/khóa/reset tài khoản GV
- Mở rộng giao thức `packages/protocol`:
  - Bổ sung các mã lỗi mới vào `ErrorCodeSchema`: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `USER_NOT_FOUND`, `USER_ALREADY_EXISTS`, `CANNOT_LOCK_LAST_ADMIN`, `CANNOT_LOCK_SELF` cùng thông điệp tiếng Việt thân thiện.
  - Định nghĩa Zod schemas & DTO trong `packages/protocol/src/auth.ts`: `UserDtoSchema`, `LoginRequestSchema`, `LoginResponseSchema`, `ChangePasswordRequestSchema`, `AdminCreateUserRequestSchema`, `AdminUpdateUserStatusRequestSchema`, `AdminResetPasswordRequestSchema`, `AdminUsersListResponseSchema`.
- Nâng cấp `packages/db`:
  - Mở rộng `UserRepository` với các hàm `updatePasswordHash`, `updateActive`, `countAdmins`, `countUsers`, `deleteById`.
- Triển khai xác thực & dịch vụ trong `packages/server`:
  - `ScryptPasswordHasher`: băm mật khẩu chuẩn RFC 7914 với salt ngẫu nhiên, memory-hard, so sánh hằng thời gian (`crypto.timingSafeEqual`) hoàn toàn dùng `node:crypto` tích hợp sẵn.
  - `TokenService`: sinh và xác minh token HMAC-SHA256 gọn nhẹ, an toàn, hỗ trợ thời hạn hết hạn.
  - `AuthService`: xử lý đăng nhập, xác thực phiên (kiểm tra tài khoản active), đổi mật khẩu cá nhân, tự động tạo tài khoản admin mặc định (`admin` / `admin123`) nếu cơ sở dữ liệu chưa có người dùng.
  - `AdminService`: quản trị viên lấy danh sách người dùng, tạo tài khoản giáo viên mới (chống trùng username), khóa/mở khóa tài khoản (có chốt an toàn chống tự khóa chính mình và chống khóa admin duy nhất), đặt lại mật khẩu cho giáo viên.
  - Fastify Hooks & Routes: `authenticate`, `requireAdmin`, routes `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/change-password` và routes quản trị `/api/admin/users`, `/api/admin/users/:id/status`, `/api/admin/users/:id/reset-password`.
- Viết bộ kiểm thử toàn diện: 7 file test mới (`auth.test.ts`, `user-repository.test.ts`, `password-hasher.test.ts`, `token-service.test.ts`, `auth-service.test.ts`, `admin-service.test.ts`, `auth-routes.test.ts`, `admin-routes.test.ts`) với 100% test xanh (98/98 tests pass).

### Task 1.2: Phân quyền theo owner (middleware + test chéo GV A không đọc dữ liệu GV B)
- Triển khai pure policy trong `packages/core/src/auth/policy.ts`:
  - `hasResourceAccess(user, resource)`: Giáo viên chỉ được truy cập tài nguyên do mình sở hữu (`ownerId === user.id`); Quản trị viên (Admin) luôn có toàn quyền truy cập bất kỳ tài nguyên nào (tuân thủ nguyên tắc D5 PLAN.md).
  - `getOwnerFilterId(user)`: Xác định điều kiện lọc SQL khi truy vấn danh sách (Admin trả về `undefined` để lấy toàn bộ dữ liệu; Giáo viên trả về `user.id` để chỉ lấy dữ liệu của mình).
- Nâng cấp `packages/protocol`:
  - Bổ sung mã lỗi `CLASS_NOT_FOUND` vào `ErrorCodeSchema`.
  - Định nghĩa DTO và Zod schemas cho Lớp học (`ClassDtoSchema`, `CreateClassRequestSchema`, `UpdateClassRequestSchema`, `ClassListResponseSchema`).
- Nâng cấp `packages/db`:
  - Triển khai `ClassRepository` với các phương thức tạo, tìm kiếm theo ID, liệt kê kèm lọc theo `ownerId`, cập nhật và xóa lớp học.
- Triển khai Owner Guard Middleware & Routes trong `packages/server`:
  - `createOwnerGuard(authService, getResource)`: Fastify preHandler hook chặn mọi truy cập trái phép của giáo viên khác với mã lỗi 403 `FORBIDDEN`, chỉ cho phép chủ sở hữu hoặc Quản trị viên.
  - `assertOwnerAccess(user, resource)`: Helper ném lỗi `AuthError` nếu vi phạm quyền sở hữu.
  - Routes lớp học `/api/classes` với đầy đủ CRUD và tích hợp `createOwnerGuard`.
- Viết bộ kiểm thử toàn diện:
  - Unit tests cho Policy (`policy.test.ts`), ClassRepository (`class-repository.test.ts`), Owner Guard (`owner-guard.test.ts`).
  - Integration test kiểm tra chéo thực tế (`classes-cross-access.test.ts`): Mô phỏng GV A và GV B cùng Admin, khẳng định GV A không thấy và không thể đọc/sửa/xóa lớp của GV B (bị từ chối 403 `FORBIDDEN`), trong khi Admin có toàn quyền quản lý dữ liệu của cả 2 giáo viên.
  - 100% test xanh (113/113 tests pass).

### Task 1.3: Tab Lớp: thêm lớp, thêm HS tay, dán từ Excel (xem trước + báo trùng/thiếu), import .xlsx, sửa/xóa, đặt/reset PIN
- Lưu trữ quyết định kiến trúc: Lập `docs/adr/0001-use-xlsx-for-excel-processing.md` ghi nhận việc sử dụng thư viện `xlsx` (SheetJS) phục vụ xử lý bảng tính offline an toàn, tuân thủ tôn chỉ không dùng CDN.
- Nâng cấp `packages/protocol`:
  - Bổ sung mã lỗi `STUDENT_ALREADY_EXISTS` vào danh mục lỗi.
  - Định nghĩa DTO và Zod schema cho học sinh (`StudentDtoSchema`, `CreateStudentRequestSchema`, `UpdateStudentRequestSchema`, `SetStudentPinRequestSchema`, `StudentImportRowSchema`, `StudentPreviewItemSchema`, `StudentImportPreviewResponseSchema`, `PreviewPasteRequestSchema`, `PreviewXlsxRequestSchema`, `CommitStudentImportRequestSchema`).
- Triển khai bộ phân tích dữ liệu thuần túy (pure logic) trong `packages/core`:
  - `parseClipboardText`: Tự động nhận diện định dạng phân tách Tab/CSV, phát hiện dòng tiêu đề thông minh tiếng Việt ("STT", "Họ và tên", "Họ đệm" + "Tên", "Mã HS", "Mã PIN"), gọt Byte Order Mark (BOM) UTF-8/UTF-16, chuẩn hóa khoảng trắng tiếng Việt.
  - `validateAndPreviewStudents`: Hàm thuần túy kiểm tra dữ liệu học sinh nhập vào, đánh dấu lỗi thiếu họ tên, cảnh báo trùng lặp mã/họ tên trong cùng lô nhập hoặc trùng với học sinh đang có trong lớp.
- Nâng cấp `packages/db`:
  - Triển khai `StudentRepository` với đầy đủ các hàm CRUD: `create`, `createMany` (hỗ trợ nhập hàng loạt trong cùng transaction), `findById`, `listByClassId`, `countByClassId`, `update`, `updatePin`, `deleteById`, `deleteByClassId`.
- Nâng cấp `packages/server`:
  - Triển khai `ExcelService`: Phân tích tệp `.xlsx` an toàn (bảo vệ trước tệp rỗng/hỏng), chuyển đổi dạng sheet sang TSV UTF-8 để sử dụng bộ parser đồng nhất của core, tạo template Excel mẫu danh sách học sinh chuẩn tải về máy.
  - Xây dựng các route REST `/api/classes/:classId/students` với đầy đủ: thêm học sinh tay, sửa thông tin, đặt/reset mã PIN, xóa học sinh, xem trước dữ liệu dán từ clipboard (`/preview-paste`), xem trước dữ liệu từ tệp `.xlsx` tải lên (`/preview-xlsx`), xác nhận ghi vào DB (`/import-commit`), tải tệp mẫu (`/template-excel`), bảo vệ cách ly dữ liệu giữa các giáo viên qua `Owner Guard`.
- Triển khai giao diện Teacher UI (`apps/teacher-ui`):
  - Đồng bộ React 18 theo quy định D9; tích hợp Design System của `ui-kit`.
  - Triển khai component `ClassTab`: danh sách lớp học, thêm lớp mới, bảng danh sách học sinh theo lớp hiển thị rõ trạng thái mã PIN, modal thêm học sinh tay, modal đặt/reset PIN, modal nhập từ Excel (cho phép dán trực tiếp từ clipboard, tải tệp `.xlsx`, bảng xem trước phân loại chi tiết dòng hợp lệ / dòng lỗi / dòng cảnh báo trùng lặp, và nút xác nhận nhập).
- Toàn bộ 4 lệnh kiểm tra chất lượng đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 42 files, 131 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.4: `core/session` FSM (open→closing→closed) + test bảng chuyển trạng thái
- Định nghĩa trong `packages/protocol`:
  - `SessionFsmEventTypeSchema` (`INITIATE_CLOSING`, `COMPLETE_CLOSING`, `FORCE_CLOSE`).
  - `SessionSettingsSchema` và `SessionDtoSchema`.
  - Bộ unit tests cho protocol session schema (`session.test.ts`).
- Triển khai FSM thuần túy (pure logic, no I/O) trong `packages/core/src/session/session-fsm.ts`:
  - Mô hình trạng thái: `open` -> `closing` -> `closed` (kèm `FORCE_CLOSE` cho phép đóng khẩn cấp).
  - Ma trận chuyển trạng thái tĩnh `SESSION_TRANSITION_TABLE`.
  - Class lỗi chuyên biệt `SessionTransitionError` (`INVALID_TRANSITION`, `INVALID_TIMESTAMP`).
  - Các hàm chuyển trạng thái thuần túy: `transitionSession` (bất biến, trả về frozen state mới), `tryTransitionSession` (Result pattern).
  - Các hàm kiểm tra nghiệp vụ: `canAcceptParticipants` (chỉ true khi `open`), `isSessionActive` (true khi `open`/`closing`), `isSessionClosing`, `isSessionClosed`, `canTransition`, `getNextStatus`, `getAllowedEvents`.
- Viết bộ kiểm thử ma trận chuyển trạng thái toàn diện (`session-fsm.test.ts`):
  - 20 unit tests bao phủ toàn bộ bảng chuyển trạng thái (mọi cặp state - event), kiểm tra tính bất biến (immutability), kiểm tra thứ tự mốc thời gian (timestamp validation) và các hàm helper queries.
- Toàn bộ 4 lệnh kiểm tra chất lượng đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 44 files, 155 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.5: Mở phiên: chọn lớp/tự do, `identityMode`, mã 6 ký tự, QR; nhiều phiên đồng thời
- Nâng cấp `packages/protocol`:
  - Bổ sung mã lỗi `TEACHER_ALREADY_HAS_ACTIVE_SESSION` và `ROSTER_REQUIRED_FOR_ROSTER_MODE`.
  - Định nghĩa DTO & schemas: `CreateSessionRequestSchema` (kèm validation refine bắt buộc chọn lớp khi ở chế độ `roster_only`), `SessionDetailResponseSchema`, `JoinCodeLookupResponseSchema`, `ActiveSessionsListResponseSchema`.
- Triển khai thuật toán thuần túy trong `packages/core`:
  - `generateJoinCode(existingCodes, rng)`: Sinh mã vào lớp 6 chữ số ngẫu nhiên (`100000`..`999999`), kiểm tra chống trùng lặp với danh sách mã đang hoạt động.
  - `isValidJoinCode(code)`: Kiểm tra cú pháp mã vào lớp.
- Nâng cấp `packages/db`:
  - Triển khai `SessionRepository`: `create`, `findById`, `findActiveByJoinCode`, `findActiveByOwnerId`, `listActiveSessions`, `listActiveJoinCodes`, `listByOwnerId`, `updateStatus`.
- Nâng cấp `packages/server`:
  - Triển khai `QrService`: Tích hợp thư viện `qrcode` offline, tạo DataURL hình ảnh base64 chuẩn nét hiển thị trực tiếp trên giao diện.
  - Xây dựng REST routes `/api/sessions`:
    - `POST /api/sessions`: Mở phiên học mới, kiểm tra mỗi GV tối đa 1 phiên mở (D4), kiểm tra phân quyền sở hữu lớp (D5), tự động sinh mã 6 số + ảnh QR.
    - `GET /api/sessions/active`: Lấy phiên đang hoạt động của giáo viên.
    - `GET /api/sessions/:id`: Xem chi tiết phiên (có Owner Guard).
    - `POST /api/sessions/:id/close`: Đóng phiên học.
    - `GET /api/sessions/lookup/:code`: Cổng học sinh tra cứu thông tin phiên theo mã 6 số (công khai không cần auth).
    - `GET /api/sessions/open-list`: Cổng học sinh xem danh sách các phiên đang mở trên toàn mạng LAN.
- Triển khai giao diện Teacher UI (`apps/teacher-ui`):
  - Triển khai component `SessionControl`:
    - Màn hình mở phiên: modal chọn lớp học hoặc tự do, cấu hình chế độ danh tính `identityMode`, tùy chọn chia nhóm `allowTeams`.
    - Màn hình phiên đang diễn ra: hiển thị mã vào lớp 6 chữ số cỡ lớn (54px), hiển thị mã QR trực quan, link vào lớp, và nút "Kết thúc tiết học".
- Toàn bộ 4 lệnh kiểm tra chất lượng đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 48 files, 165 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.6: Cổng HS: nhập mã → chọn tên/khách → PIN → vào; khóa tên trùng (D7); nhóm 2–3 HS
- Nâng cấp `packages/protocol`:
  - Bổ sung schema: `StudentRosterItemSchema`, `SessionRosterResponseSchema`, `ParticipantDtoSchema`, `StudentJoinRequestSchema`, `StudentJoinResponseSchema`, `TeamDtoSchema`.
- Triển khai logic cốt lõi trong `packages/core`:
  - `resolveIdentityLevel`: Phân giải chính xác 3 cấp danh tính theo quyết định D6 (`account`: lưu EXP; `roster`: không lưu EXP; `guest`: không lưu EXP).
  - `isNameTaken`: Kiểm tra khóa tên trùng theo quyết định D7 không phân biệt hoa thường và chuẩn hóa dấu tiếng Việt (`normalizeVietnameseString`).
- Nâng cấp `packages/db`:
  - Triển khai `ParticipantRepository`: `create`, `findById`, `listBySessionId`, `findBySessionAndStudentId`, `findBySessionAndDisplayName`, `findOnlineBySessionId`, `update`, `updateStatus`, `updateTeam`.
  - Triển khai `TeamRepository`: `create`, `findById`, `findOrCreate`, `listBySessionId` (kèm đếm số thành viên online).
- Nâng cấp `packages/server`:
  - Cập nhật `TokenService`: Hỗ trợ ký điện tử và xác thực `ParticipantToken` (HMAC-SHA256).
  - Bổ sung REST endpoints trong `sessionsRoutes`:
    - `GET /api/sessions/code/:code/roster`: Cung cấp danh sách học sinh của lớp cho HS chọn tên kèm cờ `isTaken: boolean` và `hasPin: boolean`.
    - `POST /api/sessions/join`: Xử lý toàn bộ luồng HS vào lớp: kiểm tra phiên mở, kiểm tra `identityMode` (`roster_only`, `roster_or_guest`, `guest_only`), xác thực mã PIN nếu có, kiểm tra khóa tên trùng (409 `NAME_TAKEN`), ghép/tạo nhóm nếu phiên cho phép (`allowTeams`), cấp `participantToken`.
  - Viết integration tests toàn diện cho toàn bộ luồng vào lớp với 100% test xanh.
- Triển khai giao diện Student Portal (`apps/student-ui`):
  - Thiết kế mobile-first tuân thủ PLAN 7.2 (viewport 360×640, vùng chạm tối thiểu ≥ 48px).
  - Triển khai component `StudentPortal` theo luồng ≤ 3 bước:
    - Bước 1: Nhập mã phòng 6 chữ số (hoặc tự động tải qua URL query param).
    - Bước 2: Chọn tên trong danh sách lớp hoặc nhập nickname khách (tên đang có người dùng bị làm mờ, có nút "Báo thầy/cô").
    - Bước 3: Nhập mã PIN (nếu tài khoản có PIN) & nhập tên nhóm 2–3 HS (nếu phiên bật nhóm).
    - Bước 4: Màn hình phòng chờ (Waiting room) hiển thị rõ cấp bậc danh tính và trạng thái sẵn sàng.
  - Tích hợp Modal báo thầy/cô khi bị trùng tên hoặc sự cố.
  - Viết unit & integration tests cho `StudentPortal` trên viewport 360×640 với 100% test xanh.
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 52 files, 182 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.7: Reconnect bằng participantToken; GV thấy danh sách online/offline; GV "mở lại tên"
- Nâng cấp `packages/protocol`:
  - Bổ sung mã lỗi `PARTICIPANT_NOT_FOUND` vào `ErrorCodeSchema`.
  - Định nghĩa schemas & DTO: `StudentResumeRequestSchema`, `SessionParticipantsResponseSchema`, `ReleaseParticipantResponseSchema`.
- Nâng cấp `packages/server`:
  - Bổ sung 3 REST endpoints trong `sessionsRoutes`:
    - `POST /api/sessions/resume`: Xác thực `participantToken`, kiểm tra phiên chưa đóng, phục hồi trạng thái người tham gia thành `online` và trả về snapshot phiên.
    - `GET /api/sessions/:id/participants`: Danh sách học sinh tham gia kèm đếm `onlineCount`, `offlineCount`, `totalCount`, tên đội (bảo vệ nghiêm ngặt bằng Owner Guard D5).
    - `POST /api/sessions/:id/participants/:participantId/release`: Cho phép giáo viên giải phóng tên bị kẹt/ngắt kết nối đưa học sinh về `offline`, giải phóng tên cho học sinh khác vào phòng (D7).
  - Viết integration test toàn diện `packages/server/src/__tests__/session-reconnect-release.test.ts`.
- Nâng cấp giao diện Teacher UI (`apps/teacher-ui`):
  - Bổ sung khối "Người tham gia phiên học" trong `SessionControl`:
    - Hiển thị tổng số người tham gia, số lượng đang trực tuyến (`onlineCount / totalCount`).
    - Danh sách người tham gia với chỉ báo trạng thái online/offline bằng màu kèm nhãn.
    - Nút hành động "🔓 Mở lại tên" cho phép giáo viên giải phóng tên đang online để học sinh vào lại khi gặp sự cố mạng hoặc kẹt tên.
- Nâng cấp giao diện Student UI (`apps/student-ui`):
  - Cơ chế tự động khôi phục phiên học (reconnect flow) trong `StudentPortal`:
    - Tự động lưu `participantToken` vào `localStorage` khi vào lớp thành công.
    - Tự động gửi yêu cầu resume khôi phục phiên học khi tải lại trang nếu phát hiện token hợp lệ.
    - Fallback về màn hình nhập mã nếu phiên đã kết thúc hoặc token không hợp lệ kèm thông báo lỗi thân thiện bằng tiếng Việt.
    - Nút "Rời phòng" xóa token khỏi bộ nhớ cục bộ và đưa về màn hình chính.
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 53 files, 189 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.8: Đóng phiên: closing → report snapshot → SESSION_CLOSED → đăng xuất tất cả
- Nâng cấp `packages/protocol`:
  - Bổ sung các Zod schemas & DTO:
    - `SessionReportSnapshotSchema`: Snapshot tổng kết phiên học (thông tin phiên, lớp, thời gian mở/đóng, số lượng học sinh, danh sách người tham gia, đội/nhóm).
    - `SessionReportDtoSchema`, `CloseSessionRequestSchema`, `CloseSessionResponseSchema`, `SessionReportResponseSchema`.
    - `SessionClosedPayloadSchema`: Định nghĩa nội dung thông điệp realtime khi phiên học kết thúc.
- Nâng cấp `packages/db`:
  - Triển khai `SessionReportRepository`: tạo và truy vấn báo cáo theo ID hoặc `sessionId`.
  - Nâng cấp `ParticipantRepository`: bổ sung `markAllOfflineBySessionId` để tự động đưa toàn bộ học sinh trong phiên về `offline` và ghi nhận `leftAt` khi phiên đóng.
- Nâng cấp `packages/server`:
  - `WsGatewayManager`: thêm phương thức `terminateSession(sessionId, closeEnvelope)` phát thông điệp `SESSION_CLOSED` tới toàn bộ client trong phòng và ngắt kết nối an toàn.
  - Cập nhật REST routes trong `sessionsRoutes`:
    - `POST /api/sessions/:id/close`: Thực hiện chuẩn chu trình FSM: chuyển sang `closing` → thu thập dữ liệu và tạo `SessionReportSnapshot` lưu vào `session_reports` → chuyển sang `closed` → đánh dấu tất cả người tham gia `offline` (D10) → gửi broadcast `SESSION_CLOSED` qua WebSocket → vô hiệu hóa token và ngắt kết nối.
    - `GET /api/sessions/:id/report`: Cho phép giáo viên sở hữu hoặc Admin xem lại báo cáo tổng kết phiên học (bảo vệ bằng Owner Guard D5).
  - Viết integration test toàn diện `packages/server/src/__tests__/session-close-report.test.ts`.
- Nâng cấp giao diện Teacher UI (`apps/teacher-ui`):
  - Component `SessionControl`:
    - Hỗ trợ hiển thị thẻ Báo cáo tổng kết phiên học (`session-report-card`) khi phiên đóng: hiển thị 3 chỉ số thống kê (tổng người tham gia, trực tuyến khi đóng, số đội nhóm), danh sách học sinh kèm thời gian vào, nút "Mở phiên học mới".
- Nâng cấp giao diện Student UI (`apps/student-ui`):
  - Component `StudentPortal`:
    - Lắng nghe sự kiện `SESSION_CLOSED`: tự động xóa `participantToken` trong `localStorage` (đăng xuất tất cả), chuyển sang màn hình thông báo thân thiện "Tiết học đã kết thúc! Bạn đã được đăng xuất an toàn", kèm nút "Vào phiên học khác".
    - Khi khôi phục phiên (`resume`) với phiên đã đóng: tự động chuyển sang màn hình phiên đã kết thúc.
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass
  - `pnpm typecheck`: Pass
  - `pnpm test`: 55 files, 197 tests pass
  - `pnpm deps:check`: 0 violations

### Task 1.9: core/rewards.grant + reward_log + nút thử thưởng; unit test cả 3 cấp danh tính
- Nâng cấp `packages/protocol`:
  - Định nghĩa các Zod schemas & DTO cho hệ thống điểm thưởng:
    - `GrantRewardRequestSchema`: { participantId, exp, reason }
    - `RewardLogDtoSchema`: { id, sessionId, participantId, studentId, exp, reason, persisted, ts }
    - `GrantRewardResponseSchema`: { success, persisted, expGranted, studentId, newTotalExp, newLevel, leveledUp, rewardLog }
    - `RewardNotificationPayloadSchema`: Thông điệp realtime gửi tới client học sinh khi nhận thưởng.
- Nâng cấp `packages/core`:
  - Module `levels`:
    - Triển khai công thức bậc thang kinh nghiệm tích lũy theo PLAN mục 6: Cấp \(n\) cần \(50 \times n \times (n+1) / 2\) EXP tích lũy.
    - Cung cấp `calculateLevel`, `getCumulativeExpForLevel`, `getExpProgress` (hàm thuần túy, $O(1)$).
  - Module `rewards`:
    - Triển khai `grantReward` / `rewards.grant` phân biệt nghiêm ngặt 3 cấp danh tính theo quyết định thiết kế D6 & D8:
      - Cấp `account`: `persisted = true`, EXP và Level được cập nhật vĩnh viễn vào CSDL (`students.exp`, `students.level`) và ghi vào `reward_log`.
      - Cấp `roster` & `guest`: `persisted = false`, chỉ ghi vào `reward_log` của phiên học, tuyệt đối không thay đổi EXP trong bảng `students`.
    - Thiết kế giao diện `RewardStorageAdapter` giữ `packages/core` là thuần túy không phụ thuộc I/O.
- Nâng cấp `packages/db`:
  - Triển khai `RewardRepository`:
    - `recordRewardTransaction`: Lưu bản ghi vào bảng `reward_log` và cập nhật `students` trong **CÙNG MỘT TRANSACTION NGUYÊN TỬ (Atomic)** SQLite.
    - `listBySessionId`, `listByStudentId`, `listByParticipantId`.
- Nâng cấp `packages/server`:
  - Bổ sung 2 REST endpoints trong `sessionsRoutes`:
    - `POST /api/sessions/:id/rewards/grant`: Xác thực quyền sở hữu (Owner Guard D5), kiểm tra phiên đang mở, gọi `rewards.grant()`, phát broadcast WebSocket `REWARD_GRANTED` tới phòng học.
    - `GET /api/sessions/:id/rewards`: Lấy danh sách lịch sử thưởng của phiên (bảo vệ bằng D5).
  - Viết integration test toàn diện `packages/server/src/__tests__/rewards-routes.test.ts`.
  - Viết bài kiểm thử Chặng 1 E2E DoD `packages/server/src/__tests__/stage-1-dod-e2e.test.ts`:
    - 2 GV mở 2 phiên song song (`10 Tin Chuyên` và `11 Toán Chuyên`).
    - 30 HS tham gia trải đều cả 3 cấp danh tính (`account`, `roster`, `guest`).
    - Tên trùng và học sinh trùng đang online bị chặn 409 `NAME_TAKEN`.
    - GV thưởng điểm cho cả 3 cấp danh tính, ghi log đầy đủ.
    - Đóng 2 phiên học sinh ra báo cáo snapshot.
    - Khẳng định: CHỈ các học sinh `account` mới có EXP và Level cập nhật trong DB (`students`), các học sinh `roster` và `guest` giữ nguyên 0 EXP.
- Nâng cấp giao diện Teacher UI (`apps/teacher-ui`):
  - Component `SessionControl`:
    - Bổ sung nút thử thưởng "🎁 Thưởng EXP" bên cạnh mỗi học sinh đang online.
    - Hộp thoại Modal thưởng EXP với các nút chọn nhanh (+10, +20, +50, +100 EXP), ô nhập số lượng tùy chọn, và ô nhập lý do thưởng.
    - Bổ sung unit test trong `apps/teacher-ui/src/__tests__/session-control.test.tsx`.
- Nâng cấp giao diện Student UI (`apps/student-ui`):
  - Component `StudentPortal`:
    - Lắng nghe sự kiện WebSocket `REWARD_GRANTED`.
    - Hiển thị banner chúc mừng nổi bật khi nhận thưởng kèm thông báo rõ ràng về việc lưu điểm vĩnh viễn (đối với `account`) hoặc tạm thời (nhắc nhở đặt PIN đối với `roster`/`guest`).
    - Bổ sung unit test trong `apps/student-ui/src/__tests__/student-portal.test.tsx`.
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi)
  - `pnpm test`: 61 test files, 213 tests pass
  - `pnpm deps:check`: 0 violations

### Task 2.1: question-kit: schema 4 loại + hàm chấm (bao gồm bậc thang tf_group) + test bảng
- Triển khai `packages/question-kit`:
  - Module `rich-text`:
    - `RichTextSchema`: { text, images: assetId[] }. Hỗ trợ công thức toán học LaTeX trong `$...$` hoặc `$$...$$`.
    - Helper `toRichText`, `richTextToString`, `hasLatexFormula` (nhận diện LaTeX regex).
  - Module schemas 4 loại câu hỏi:
    - `mcq4`: Trắc nghiệm 4 lựa chọn (chính xác 4 options), `correct: 0..3`. `Mcq4QuestionSchema`, `Mcq4PublicQuestionSchema`, `Mcq4AnswerSchema`.
    - `tf`: Đúng / Sai đơn lẻ, `correct: boolean`. `TfQuestionSchema`, `TfPublicQuestionSchema`, `TfAnswerSchema`.
    - `tf_group`: Đúng / Sai nhóm 4 ý chuẩn Bộ Giáo dục & Đào tạo. `TfGroupQuestionSchema`, `TfGroupPublicQuestionSchema`, `TfGroupAnswerSchema`.
      - Hỗ trợ thang điểm bậc thang (Graduated Scale) theo chuẩn BGD: đúng 1 ý = 0.1, 2 ý = 0.25, 3 ý = 0.5, 4 ý = 1.0 của điểm câu. Cho phép ghi đè scale tùy chỉnh.
    - `short`: Trả lời ngắn / Tự luận ngắn / Điền số. `ShortQuestionSchema`, `ShortPublicQuestionSchema`, `ShortAnswerSchema`.
      - Hỗ trợ so khớp văn bản `accepted: string[]` kèm tùy chọn `caseSensitive`, `trimWhitespace`.
      - Hỗ trợ so khớp số học `numeric: { value, tolerance }` với dung sai sai phân, hỗ trợ cả định dạng số thập phân dấu phẩy kiểu Việt Nam (`3,14` vs `3.14`).
    - `question`: Discriminated unions `QuestionSchema`, `QuestionPublicSchema`, `StudentAnswerSchema`.
  - Module chấm điểm (`grading/`):
    - `gradeMcq4`: Chấm trắc nghiệm 4 lựa chọn, phát hiện bỏ trống hoặc sai.
    - `gradeTf`: Chấm đúng/sai đơn lẻ.
    - `gradeTfGroup`: Chấm theo thang điểm bậc thang BGD (0 ý: 0%, 1 ý: 10%, 2 ý: 25%, 3 ý: 50%, 4 ý: 100%) và custom scale, tính toán chi tiết từng ý, cờ `isCorrect`, `isPartial`.
    - `gradeShort`: Chấm tự luận ngắn kết hợp so khớp số học kèm dung sai và so khớp chữ.
    - `gradeQuestion`: Bộ điều phối chấm điểm tổng hợp cho mọi loại câu hỏi, bắt lỗi không khớp loại câu hỏi hoặc sai questionId.
  - Module bảo mật dữ liệu (`sanitize.ts`):
    - `stripAnswerKey`: Chuyển đổi an toàn `Question` -> `QuestionPublic` loại bỏ hoàn toàn đáp án đúng, barem điểm và lời giải trước khi gửi xuống client học sinh.
  - Bộ kiểm thử toàn diện:
    - `schemas.test.ts`: Kiểm thử schema Zod, RichText, nhận diện LaTeX, xác thực bắt buộc 4 options/items, và `stripAnswerKey`.
    - `table-grading.test.ts`: Kiểm thử theo bảng (Table-driven tests) cho cả 4 loại câu hỏi với đầy đủ ma trận các trường hợp (MCQ4 5 cases, TF 5 cases, TF_GROUP 7 cases ma trận BGD + custom scale, SHORT 9 text cases + 9 numeric cases, và hàm tổng hợp `gradeQuestion`).
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 63 test files, 258 tests pass (100%)
  - `pnpm deps:check`: 0 violations (481 modules, 1174 dependencies)

### Task 2.2: Trình soạn: nhập tay, KaTeX preview, ảnh ở câu hỏi/đáp án (dán, kéo thả, nén ảnh, lưu theo hash)
- Tích hợp KaTeX Rendering ngoại tuyến hoàn toàn (`packages/question-kit`):
  - Cài đặt thư viện `katex` và kiểu dữ liệu `@types/katex` theo chuẩn ngăn xếp D9 trong PLAN.md.
  - Xây dựng module `katex-renderer`:
    - `renderLatex`: Render công thức LaTeX an toàn với fallback không làm sập ứng dụng khi cú pháp sai.
    - `parseMathSegments`: Phân tích chuỗi văn bản hỗn hợp thành các khối `text`, `inline-math` (`$...$`, `\(...\)`), `display-math` (`$$...$$`, `\[...\]`).
    - `renderLatexInText`: Render văn bản chứa công thức toán ra HTML kèm mã hóa ký tự HTML an toàn chống XSS.
    - Bộ unit test `katex-renderer.test.ts` (7/7 tests pass).
- Xử lý ảnh & Tính mã băm SHA-256 (`packages/question-kit/src/assets`):
  - Xây dựng module `image-processor`:
    - `calculateSha256`: Tính toán mã băm SHA-256 nhất quán (hỗ trợ cả Web Crypto API và Node.js crypto).
    - `compressImage`: Nén ảnh phía máy khách bằng HTML5 Canvas giữ nguyên tỷ lệ, điều chỉnh kích thước tối đa và độ nén, tương thích môi trường thử nghiệm không có DOM/jsdom.
    - `fileToDataUrl`: Chuyển đổi Blob thành base64 data URL để xem trước ngay lập tức khi ngoại tuyến.
    - `extractImagesFromDataTransfer`: Trích xuất file ảnh từ dữ liệu clipboard (Paste) và drag-and-drop.
    - Bộ unit test `image-processor.test.ts` (6/6 tests pass).
- Cơ sở dữ liệu & Kho lưu trữ Assets (`packages/db`):
  - Xây dựng `AssetRepository`: các hàm `create()`, `findById()`, `findBySha256()`, `findOrCreate()` (chống lưu trùng lặp dữ liệu deduplication theo mã băm SHA-256).
  - Bộ unit test `asset-repository.test.ts` (2/2 tests pass).
- REST API quản lý Assets (`packages/server`):
  - Endpoint `POST /api/assets`: Nhận dữ liệu ảnh base64/upload từ giáo viên đã đăng nhập, tính SHA-256, lưu tập tin đĩa và lưu CSDL, trả về thông tin asset `{ id, sha256, mime, size, url }` (HTTP 201 cho ảnh mới, 200 cho ảnh đã tồn tại).
  - Endpoint `GET /api/assets/:hash`: Phục vụ tập tin ảnh công khai theo mã băm với tiêu đề HTTP `Cache-Control: public, max-age=31536000, immutable`.
  - Endpoint `GET /api/assets/id/:id`: Phục vụ tập tin ảnh theo ID.
  - Tích hợp vào `app.ts` và bộ integration test `assets-routes.test.ts` (1/1 test pass).
- Giao diện Trình soạn thảo câu hỏi (`apps/teacher-ui`):
  - Xây dựng component `RichTextEditor`:
    - Soạn thảo văn bản và hiển thị khung xem trước KaTeX tức thì khi gõ công thức toán.
    - Đính kèm ảnh: nút chọn file, hỗ trợ dán ảnh (Paste Ctrl+V) và kéo thả ảnh (Drag & Drop).
    - Tự động nén ảnh trên trình duyệt trước khi lưu.
    - Hiển thị danh sách thumbnail ảnh đã đính kèm và nút xóa ảnh với vùng chạm ≥ 48px.
  - Xây dựng component `QuestionEditor`:
    - Hỗ trợ đầy đủ 4 loại câu hỏi theo Task 2.1: `mcq4` (4 lựa chọn), `tf` (Đúng/Sai), `tf_group` (nhóm 4 ý với barem Bộ GD&ĐT), `short` (trả lời ngắn với nhiều đáp án chấp nhận và tùy chọn phân biệt hoa thường).
    - Tùy chỉnh điểm số (`points`) và lời giải thích (`explanation`).
    - Xác thực nghiêm ngặt bằng Zod schemas của `question-kit` trước khi lưu, thông báo lỗi tiếng Việt rõ ràng.
    - Bộ unit test toàn diện `question-editor.test.tsx` (8/8 tests pass).
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 68 test files, 282 tests pass (100%)
  - `pnpm deps:check`: 0 violations (518 modules, 1284 dependencies)

### Task 2.3: Quản lý bộ đề: thư mục/thẻ, tìm kiếm, nhân bản, xuất/nhập file `.educlass`
- Định nghĩa giao thức và schemas (`packages/protocol`):
  - Định nghĩa schemas: `QuestionSetDtoSchema`, `CreateQuestionSetRequestSchema`, `UpdateQuestionSetRequestSchema`, `EduclassAssetPackageSchema`, `EduclassPackageSchema`.
  - Bổ sung mã lỗi `QUESTION_SET_NOT_FOUND` kèm thông điệp tiếng Việt thân thiện trong `errors.ts`.
  - Bộ unit test `question-set.test.ts` (6/6 tests pass).
- Cơ sở dữ liệu & Quản lý bộ đề (`packages/db`):
  - Xây dựng `QuestionSetRepository` với các hàm nghiệp vụ:
    - `create()`: Tạo bộ đề kèm các câu hỏi ban đầu.
    - `findById()` & `findWithQuestions()`: Truy vấn bộ đề kèm số lượng câu hỏi và danh sách câu hỏi sắp xếp theo thứ tự `orderIndex`.
    - `list()`: Hỗ trợ phân quyền `ownerId`, tìm kiếm theo tiêu đề/môn học (`search`), lọc theo thẻ phân loại (`tag`), môn học (`subject`), khối lớp (`grade`).
    - `update()` & `updateQuestions()`: Cập nhật thông tin bộ đề và thay thế/sắp xếp danh sách câu hỏi.
    - `clone()`: Nhân bản bộ đề cho giáo viên đang đăng nhập, sao chép toàn bộ câu hỏi sang ID mới.
    - `deleteById()`: Xóa bộ đề và xóa cascade các câu hỏi.
  - Bộ unit test `question-set-repository.test.ts` (1/1 test pass).
- REST API quản lý bộ đề (`packages/server`):
  - Xây dựng routes `packages/server/src/routes/question-sets.ts`:
    - `GET /api/question-sets`: Lấy danh sách bộ đề theo phân quyền (giáo viên chỉ thấy bộ đề của mình theo D5, admin thấy tất cả); hỗ trợ tìm kiếm và lọc thẻ.
    - `POST /api/question-sets`: Tạo mới bộ đề cho giáo viên đăng nhập.
    - `GET /api/question-sets/:id`: Lấy chi tiết bộ đề và danh sách câu hỏi (bảo vệ quyền truy cập qua Owner Guard).
    - `PUT /api/question-sets/:id`: Cập nhật thông tin bộ đề (Owner Guard).
    - `PUT /api/question-sets/:id/questions`: Cập nhật danh sách câu hỏi trong bộ đề, xác thực bằng `QuestionSchema`.
    - `POST /api/question-sets/:id/clone`: Nhân bản bộ đề cho giáo viên hiện tại.
    - `GET /api/question-sets/:id/export`: Xuất bộ đề ra gói file `.educlass` tự chứa toàn bộ câu hỏi và hình ảnh CAS nhúng base64.
    - `POST /api/question-sets/import`: Nhập gói file `.educlass`, tự động trích xuất và lưu trữ hình ảnh vào CAS `AssetRepository` và tạo bộ đề mới cho giáo viên.
    - `DELETE /api/question-sets/:id`: Xóa bộ đề (Owner Guard).
  - Tích hợp vào `app.ts` và bộ integration test `question-sets-routes.test.ts` (1/1 test pass).
- Giao diện Quản lý bộ đề (`apps/teacher-ui`):
  - Xây dựng component `QuestionBankTab`:
    - Hiển thị danh sách bộ đề dạng thẻ (cards) trực quan, hiển thị môn học, khối lớp, số lượng câu hỏi, danh sách tags badge.
    - Thanh tìm kiếm theo thời gian thực và các chip tag cho phép lọc nhanh theo danh mục/thẻ phân loại.
    - Modal tạo bộ đề mới với xác thực form đầy đủ, chọn môn học và khối lớp 1-12.
    - Nút nhập tập tin `.educlass` từ máy tính (đọc qua Web File API 100% ngoại tuyến) và xuất file `.educlass` tải về máy.
    - Các nút thao tác nhân bản, chỉnh sửa câu hỏi, xóa bộ đề với vùng chạm chuẩn ≥ 48px.
    - Xử lý đầy đủ trạng thái đang tải (loading) và trạng thái danh sách rỗng (empty state).
  - Bộ unit test `question-bank-tab.test.tsx` (6/6 tests pass).
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 72 test files, 296 tests pass (100%)
  - `pnpm deps:check`: 0 violations (542 modules, 1366 dependencies)

### Task 2.4: Import Word: mammoth + quy ước định dạng + OMML→LaTeX + màn xem trước/sửa lỗi + file mẫu tải về
- Chuyển đổi công thức toán học OMML sang LaTeX (`packages/question-kit`):
  - Xây dựng module `omml-to-latex.ts` giải mã cây XML công thức Office Math Markup Language (OMML) của Word sang chuẩn LaTeX KaTeX.
  - Hỗ trợ toàn diện các cấu trúc toán: phân số (`m:f` -> `\frac{num}{den}`), số mũ (`m:sSup` -> `base^{sup}`), chỉ số (`m:sSub` -> `base_{sub}`), vừa mũ vừa chỉ số (`m:sSubSup`), căn thức (`m:rad` -> `\sqrt{}` / `\sqrt[n]{}`), tích phân / tổng (`m:nary` -> `\int`, `\sum`), ngoặc đơn / ngoặc vuông / dấu giá trị tuyệt đối (`m:d` -> `\left(...\right)`), hàm giới hạn (`m:limLow` -> `\lim_{...}`), và ánh xạ bảng ký hiệu toán học Unicode sang mã lệnh LaTeX.
  - Hàm `replaceOmmlInXml(documentXml)` tiền xử lý tập tin `word/document.xml` bên trong file `.docx` nén bằng `jszip` trước khi chuyển giao cho bộ chuyển đổi HTML.
  - Bộ unit test `omml-to-latex.test.ts` (9/9 tests pass).
- Bộ phân tích tài liệu đề thi Word (`packages/question-kit`):
  - Xây dựng module `word-parser.ts` tích hợp `mammoth` và `jszip` phân tích định dạng chuẩn:
    - Nhận diện linh hoạt câu hỏi theo các tiền tố tiếng Việt: `Câu 1:`, `Câu 1.`, `Bài 1:`, `Bài 1.`, `1.`, `1:`...
    - Tự động nhận dạng 4 loại câu hỏi:
      - Trắc nghiệm 4 lựa chọn (`mcq4`): nhận diện phương án A, B, C, D; phát hiện đáp án đúng thông qua gạch chân (`<u>`), in đậm, dấu hoa thị (`*`), hoặc dòng `Đáp án: A`.
      - Đúng/Sai 4 ý chuẩn Bộ Giáo dục THPT 2025 (`tf_group`): nhận diện 4 ý a), b), c), d); tự động dò tìm trạng thái đúng/sai theo nhãn `[Đúng]`, `[Sai]`, `(Đúng)`, `(Sai)`, `[Đ]`, `[S]`...
      - Trả lời ngắn (`short`): nhận diện câu hỏi kèm đáp án qua dòng `Đáp án: [nội dung/số]`.
      - Đúng/Sai đơn (`tf`).
    - Tự động trích xuất hình ảnh nhúng qua custom image converter của mammoth, băm mã hóa SHA-256 nội dung, chuyển thành đường dẫn asset CAS `/api/assets/<hash>`, và trả về danh sách tài nguyên hình ảnh nhúng base64.
    - Cung cấp báo cáo phân tích chi tiết: danh sách câu hỏi hợp lệ `questions`, danh sách cảnh báo `warnings` (kèm vị trí và lý do), tổng số câu phát hiện `totalDetected` và số câu thành công `successCount`.
  - Bộ unit test `word-parser.test.ts` (7/7 tests pass).
- Bộ 5 file Word mẫu thực tế & Kiểm thử độ chính xác (DoD ≥ 95%):
  - Xây dựng module sinh tài liệu mẫu thực tế `fixtures-generator.ts` tạo 5 file docx chuẩn vào `tests/fixtures/word-samples/`:
    1. `sample-1-math-mcq.docx`: Đề Toán MCQ4 có chứa công thức OMML (phân số, số mũ, căn thức, tích phân).
    2. `sample-2-physics-tf-group.docx`: Đề Vật lý Đúng/Sai 4 ý (a, b, c, d) chuẩn cấu trúc đề thi tốt nghiệp THPT 2025.
    3. `sample-3-chemistry-short.docx`: Đề Hóa học dạng câu hỏi trả lời ngắn.
    4. `sample-4-biology-mixed.docx`: Đề Sinh học tổng hợp cả 3 dạng MCQ4, TF Group và Short.
    5. `sample-5-geography-images.docx`: Đề Địa lý có nhúng hình ảnh biểu đồ thực tế.
  - Bộ unit test `word-fixtures.test.ts` kiểm chứng cả 5 file mẫu đạt độ chính xác 100% (vượt tiêu chuẩn DoD ≥ 95%).
- REST API Máy chủ (`packages/server`):
  - `GET /api/question-sets/templates/word`: Endpoint phục vụ tải trực tiếp file mẫu Word chuẩn về máy tính của giáo viên.
  - `POST /api/question-sets/import-word`: Endpoint nhận dữ liệu base64 file Word, gọi bộ phân tích, tự động lưu trữ hình ảnh trích xuất vào kho CAS `AssetRepository`, và trả về kết quả phân tích cấu trúc câu hỏi.
  - Bộ integration test `question-sets-routes.test.ts` (pass 100%).
- Giao diện Màn xem trước & Sửa lỗi (`apps/teacher-ui`):
  - Xây dựng modal `WordImportModal`:
    - Cho phép chọn/kéo thả file `.docx` hoặc bấm nút tải file mẫu chuẩn về máy tính.
    - Hiển thị thống kê số câu hợp lệ, tỷ lệ thành công và danh sách các câu hỏi bị lỗi kèm cảnh báo chi tiết.
    - Màn hình xem trước & sửa lỗi: cho phép giáo viên kiểm tra nội dung, sửa nhanh đáp án đúng của từng câu MCQ (radio button) và từng ý Đúng/Sai (toggle button), xóa câu không đạt, và chỉnh sửa thông tin tiêu đề/môn học/khối lớp/thẻ phân loại trước khi lưu vào ngân hàng đề thi.
  - Tích hợp nút `📄 Nhập từ Word (.docx)` vào thanh công cụ `QuestionBankTab`.
  - Bộ unit test `word-import-modal.test.tsx` (2/2 tests pass) và `question-bank-tab.test.tsx` (7/7 tests pass).
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 76 test files, 322 tests pass (100%)
  - `pnpm deps:check`: 0 violations (568 modules, 1441 dependencies)

### Task 3.1: Registry + ActivityHost (HS) + ActivityPanel (GV); tài liệu activity-guide.md
- Khung giao thức Activity (`packages/protocol`):
  - Bổ sung `packages/protocol/src/activity.ts`:
    - Định nghĩa schema metadata (`ActivityMetaSchema`), quyền năng (`ActivityCapabilitySchema`), lý do từ chối intent (`ActivityRejectSchema`).
    - Định nghĩa DTO cho phiên chạy hoạt động (`ActivityRunDtoSchema`) và kết quả lưu trữ (`ActivityResultDtoSchema`).
    - Định nghĩa phong bì WebSocket: `activity_start`, `activity_state`, `activity_intent`, `activity_end`.
    - Định nghĩa các REST request/response schemas cho khởi chạy, gửi intent và kết thúc hoạt động.
  - Bộ unit test `activity.test.ts` (pass 100%).
- Khung lõi Core & Plugin Contract (`packages/core`):
  - Bổ sung `packages/core/src/activity/types.ts`:
    - Khởi tạo hợp đồng Activity Plugin theo đúng PLAN.md mục 4 (`ActivityDefinition`, `ActivityContext`, `ActivityServerHandler`).
    - Quy định bất biến: Activity chỉ tương tác qua `ActivityContext` (`ctx`), không truy cập cơ sở dữ liệu hay WebSocket thô.
    - Thao tác thưởng EXP chỉ thông qua `ctx.grantReward()` liên kết với `core/rewards.grant()`.
  - Bổ sung `packages/core/src/activity/validator.ts` xác thực cấu hình, trạng thái và kết quả hoạt động qua Zod.
  - Bộ unit test `activity-validator.test.ts` (pass 100%).
- Cơ sở dữ liệu CSDL (`packages/db`):
  - Xây dựng `ActivityRunRepository` (`packages/db/src/repositories/activity-run-repository.ts`):
    - Quản lý vòng đời lưu trữ các phiên chạy hoạt động `activity_runs` (`createRun`, `findRunById`, `findActiveRunBySessionId`, `updateRunStatus`).
    - Lưu trữ kết quả hoạt động `activity_results` (`saveResults`, `findResultsByRunId`).
  - Xuất các kiểu dữ liệu Drizzle tương ứng trong `packages/db/src/schema/index.ts`.
  - Bộ unit test `activity-run-repository.test.ts` (pass 100%).
- Activity Plugin chuẩn đầu tiên `@educlass/activity-quick-poll` (`packages/activities/quick-poll`):
  - Triển khai `QuickPollActivity` tuân thủ đầy đủ hợp đồng `ActivityDefinition`:
    - Server Handler: quản lý danh sách bình chọn, tính toán phân phối phiếu bầu, xử lý intent học sinh (`vote`), intent giáo viên (`reveal`, `close`), tính điểm thưởng EXP tham gia.
    - `QuickPollStudentView`: Giao diện bình chọn trực quan trên di động, hỗ trợ màn hình nhỏ 360×640, nút bấm lựa chọn ≥ 48px, phản hồi trạng thái đã bỏ phiếu và kết quả bình chọn.
    - `QuickPollTeacherPanel`: Giao diện điều phối trực tiếp của giáo viên, hiển thị biểu đồ phân bổ phiếu bầu theo thời gian thực, nút công bố kết quả và chốt hoạt động.
  - Bộ unit test `quick-poll.test.tsx` (pass 100%).
- Server Engine & Registry (`packages/server`):
  - `ActivityRegistry`: Nạp danh mục hoạt động tập trung, hỗ trợ đăng ký Activity mới bằng 1 dòng import.
  - `ActivityEngine`: Quản lý in-memory state của các hoạt động đang chạy, đồng bộ WebSocket broadcast, bảo đảm tính nguyên tử khi trao thưởng EXP qua `core/rewards.grant()` kết hợp SQLite transaction.
  - REST Endpoints tại `/api/activities`:
    - `GET /api/activities`: Lấy danh sách activity đã đăng ký trong Registry.
    - `GET /api/activities/current`: Lấy thông tin phiên hoạt động đang diễn ra.
    - `POST /api/activities/start`: Khởi động một hoạt động mới trong phiên học.
    - `POST /api/activities/student-intent`: Tiếp nhận hành động từ học sinh.
    - `POST /api/activities/teacher-intent`: Tiếp nhận chỉ thị điều khiển từ giáo viên.
    - `POST /api/activities/end`: Kết thúc hoạt động và lưu kết quả vào CSDL.
  - Bộ integration test `activities-routes.test.ts` (pass 100%).
- Giao diện Học sinh (`apps/student-ui`):
  - Xây dựng component `ActivityHost`:
    - Tự động bắt tín hiệu và hiển thị view tương ứng của hoạt động đang diễn ra.
    - Xử lý mượt mà các trạng thái: chưa có hoạt động (màn chờ thân thiện), phiên đóng, hoạt động chưa hỗ trợ.
  - Bộ unit test `activity-host.test.tsx` (pass 100%).
- Giao diện Giáo viên (`apps/teacher-ui`):
  - Xây dựng component `ActivityPanel`:
    - Lobby lựa chọn hoạt động dạng thẻ trực quan (Quick Poll, Vòng quay, Quiz...).
    - Modal cấu hình trước khi bắt đầu (nhập câu hỏi, danh sách lựa chọn, EXP thưởng).
    - Render `TeacherPanel` của plugin khi đang chạy kèm nút kết thúc hoạt động an toàn.
  - Bộ unit test `activity-panel.test.tsx` (pass 100%).
- Tài liệu kỹ thuật:
  - Tạo `docs/activity-guide.md`: Cẩm nang hướng dẫn chuẩn từng bước tạo Activity Plugin mới cho EduClass v2.
  - Cập nhật `docs/protocol.md`: Bổ sung chi tiết các WS envelopes và REST API cho Activity framework.
- Toàn bộ 4 lệnh kiểm tra chất lượng monorepo đều vượt qua 100%:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 83 test files, 345 tests pass (100%)
  - `pnpm deps:check`: 0 violations (628 modules, 1621 dependencies)

### Task 3.2: Cài đặt EXP (UI + `reward_rules` + ưu tiên global/teacher + trần EXP)
- **Giao thức & DTO (`packages/protocol`)**:
  - Bổ sung `RewardRuleDtoSchema`, `RewardRuleItemInputSchema`, `SetRewardRulesRequestSchema`, `GetRewardRulesResponseSchema`, `ResetRewardRulesResponseSchema`.
  - Bộ test `reward.test.ts` (pass 100%).
- **Lõi nghiệp vụ & Thuật toán chống lạm phát (`packages/core`)**:
  - `DEFAULT_GLOBAL_REWARD_RULES`: Danh mục luật thưởng chuẩn hệ thống (quiz_correct, streak, quick_poll, exam_grade_10, attendance, activity_cap, session_cap).
  - `resolveEffectiveRewardRules`: Thuật toán hợp nhất luật thưởng, ưu tiên tuyệt đối Teacher Rules ghi đè Global Rules theo từng cặp `(activityId, trigger)`.
  - `calculateCappedExp`: Thuật toán tính toán thưởng EXP có kiểm soát trần chống lạm phát điểm (trần hoạt động `activity_cap` và trần phiên học `session_cap`).
  - Bộ test `reward-rules.test.ts` (pass 100%).
- **Cơ sở dữ liệu (`packages/db`)**:
  - Mở rộng `RewardRepository`: `getGlobalRules`, `getTeacherRules`, `setTeacherRules`, `resetTeacherRules`, `seedGlobalRules`, `getParticipantExpTotals`.
  - Bộ test `reward-rules-repository.test.ts` (pass 100%).
- **Server Services & REST Routes (`packages/server`)**:
  - `RewardRuleService`: Quản lý nạp luật hiệu lực, lưu cấu hình riêng của giáo viên, tính toán EXP thưởng và kiểm tra trần session/activity theo thời gian thực.
  - Tích hợp `RewardRuleService` vào `ActivityEngine` và `ctx.grantReward()` để tự động áp trần EXP cho mọi hoạt động lớp học.
  - REST Endpoints tại `/api/reward-rules`:
    - `GET /api/reward-rules`: Lấy danh sách luật thưởng hiệu lực và luật riêng của giáo viên.
    - `PUT /api/reward-rules`: Cập nhật cấu hình thưởng riêng cho giáo viên hiện tại.
    - `POST /api/reward-rules/reset`: Đặt lại cấu hình thưởng về mặc định toàn cục.
  - Tích hợp bảo vệ xác thực Bearer token và kiểm tra quyền giáo viên/admin.
  - Bộ test `reward-rules-routes.test.ts` (pass 100%).
- **Giao diện Cài đặt Giáo viên (`apps/teacher-ui`)**:
  - Xây dựng component `ExpSettingsTab`:
    - Phân nhóm quy tắc trực quan theo 6 danh mục: Trần EXP chống lạm phát, Quiz Live, Bình chọn nhanh, Bài thi, Vòng quay may mắn, Điểm danh chuyên cần.
    - Cho phép bật/tắt từng quy tắc, tùy chỉnh số điểm thưởng EXP/trần điểm với vùng chạm tối thiểu ≥ 48px và cỡ chữ tiêu chuẩn.
    - Nhãn chỉ báo phân biệt rõ ràng quy tắc "Mặc định hệ thống" và "Đã tùy chỉnh bởi giáo viên".
    - Nút "Lưu cài đặt" với thông báo phản hồi và nút "Đặt lại mặc định" có modal xác nhận an toàn.
  - Bộ test `exp-settings-tab.test.tsx` (pass 100%).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 87 test files, 365 tests pass (100% xanh toàn bộ 10 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (652 modules, 1701 dependencies)

### Task 3.3: Quiz Live: chế độ Kahoot (nhịp GV) và Quizizz (tự tốc độ), điểm theo tốc độ, streak, bảng xếp hạng, màn chiếu
- **Activity Plugin độc lập (`packages/activities/quiz-live`)**:
  - Khởi tạo package `@educlass/activity-quiz-live` tuân thủ đầy đủ chuẩn Activity Definition (PLAN D12, mục 4).
  - Triển khai Zod schemas: `QuizLiveConfigSchema`, `QuizLiveStateSchema`, `QuizLiveResultSchema`, `QuizQuestionSchema`, `LeaderboardEntrySchema`.
  - **Thuật toán tính điểm (`quiz-scoring.ts`)**:
    - Tính điểm theo tốc độ phản hồi (Speed-based scoring): cơ sở 1000 điểm, giảm dần tuyến tính theo thời gian làm bài từ 100% (0s) xuống tối thiểu 50% (hết giờ).
    - Thưởng chuỗi đúng liên tiếp (Streak Bonus): cộng dồn từ câu đúng thứ 2 (+100, +200... tối đa +500 điểm). Trả lời sai reset chuỗi về 0.
  - **Server Lifecycle (`quiz-activity.ts`)**:
    - `onStart`: Khởi tạo trạng thái, ẩn đáp án đúng đối với client, hỗ trợ xáo trộn câu hỏi và phương án.
    - `onStudentIntent`: Chấm điểm tức thì, cập nhật điểm, chuỗi streak, thống kê tỷ lệ lựa chọn của cả lớp, tự động cấp thưởng EXP `quiz_correct` (10 EXP) và `streak` (5 EXP khi chuỗi ≥ 3).
    - `onTeacherIntent`: Điều khiển nhịp điệu thi đấu cho chế độ Kahoot (`show_review` mở đáp án, `show_leaderboard` mở bảng xếp hạng, `next_question` chuyển câu, `finish_quiz`).
    - `onEnd`: Sắp xếp bảng xếp hạng cuối cùng, cấp thưởng bục vinh quang `top1` (50 EXP), `top2` (30 EXP), `top3` (20 EXP), và `finish` (20 EXP hoàn thành) cho tất cả học sinh.
  - **Giao diện người dùng (`quiz-views.tsx`)**:
    - `QuizLiveStudentView`: Tối ưu mobile-first 360×640, 4 khối màu Kahoot kèm hình khối chuẩn (▲◆●■) chống mù màu, nút bấm vùng chạm ≥ 48px, màn hình phản hồi đúng/sai tức thì kèm hiệu ứng streak 🔥, màn hình tổng kết vị trí cá nhân.
    - `QuizLiveTeacherPanel`: Cụm nút điều phối tiến trình thi đấu, biểu đồ phân bổ phương án chọn thời gian thực, bảng xếp hạng trực tiếp.
    - `QuizLiveProjectorView`: Thiết kế 16:9 chuyên dụng cho máy chiếu lớp học, chữ lớn, đếm ngược lớn, hiển thị số lượng HS đã nộp, biểu đồ cột phương án chọn, và bục vinh quang Podium 3 bậc (🥇🥈🥉).
  - Bộ test của package `quiz-live`: `quiz-scoring.test.ts`, `quiz-activity.test.ts`, `quiz-views.test.tsx` (pass 100%).
- **Tích hợp Monorepo & Server**:
  - Đăng ký `QuizLiveActivity` vào `ActivityRegistry` tại `packages/server/src/activity/registry.ts`.
  - Đăng ký `QuizLiveStudentView` vào `studentViewRegistry` tại `apps/student-ui/src/components/ActivityHost.tsx`.
  - Đăng ký `QuizLiveTeacherPanel` và cấu hình thi đấu vào `apps/teacher-ui/src/components/ActivityPanel.tsx`.
  - Bộ integration test `quiz-live-routes.test.ts` trong `packages/server` (pass 100%).
  - Cập nhật tài liệu kỹ thuật `docs/activity-guide.md` mục 8.
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 91 test files, 378 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (679 modules, 1764 dependencies)

### Task 3.4: Báo cáo phiên: bảng điểm, câu sai nhiều, xuất Excel
- **Giao thức & Dữ liệu (`packages/protocol` & `packages/db`)**:
  - Bổ sung `SessionStudentScoreItemSchema`, `SessionDifficultQuestionItemSchema`, `SessionReportSummarySchema` vào `packages/protocol/src/session.ts`.
  - Mở rộng `SessionReportSnapshotSchema` bao gồm `scoreboard`, `difficultQuestions` và `summary`.
  - Bổ sung `ActivityRunRepository.listRunsBySessionId(sessionId)` và phương thức lấy kết quả hoạt động trong `packages/db`.
  - Lưu trữ chi tiết câu trả lời `answers` trong kết quả lượt chạy `QuizLiveResult` để phục vụ phân tích chi tiết.
- **Tổng hợp chỉ số & Xuất Excel (`packages/server`)**:
  - Xây dựng module `session-report-generator.ts`:
    - `scoreboard`: Tính toán tổng điểm, số câu đúng/tổng số câu, độ chính xác (%), EXP nhận được, tự động xếp hạng Top 1, 2, 3...
    - `difficultQuestions`: Phân tích tỷ lệ sai từng câu hỏi trong phiên, tự động nhận diện câu sai nhiều và xếp giảm dần theo tỷ lệ sai.
    - `summary`: Điểm trung bình, độ chính xác trung bình, tổng số câu hỏi và tổng EXP đã trao.
  - Tích hợp tính toán tự động khi đóng phiên trong `POST /api/sessions/:id/close`.
  - Mở rộng `ExcelService.exportSessionReportBuffer(snapshot)`: tạo file bảng tính `.xlsx` gồm 3 trang tính tiếng Việt chuẩn không lỗi font: "Tổng quan phiên", "Bảng điểm học sinh", "Câu hỏi sai nhiều".
  - Endpoint REST `GET /api/sessions/:id/report/excel` có xác thực Owner Guard (chỉ giáo viên sở hữu phiên hoặc admin mới tải được).
  - Bộ test: `session-report-generator.test.ts`, `excel-service.test.ts`, `session-report-export.test.ts` (pass 100%).
- **Giao diện Báo cáo Giáo viên (`apps/teacher-ui`)**:
  - Xây dựng component `SessionReportView.tsx` với giao diện chuyên nghiệp:
    - 6 thẻ chỉ số: Sĩ số, Trực tuyến khi đóng, Số đội, Điểm trung bình, Độ chính xác TB, Tổng EXP đã trao.
    - Tab "Bảng điểm học sinh": huy hiệu vàng/bạc/đồng (🥇🥈🥉), điểm số, số câu đúng, EXP nhận, kèm fallback danh sách người tham gia.
    - Tab "Câu hỏi sai nhiều": hiển thị nội dung câu hỏi, tỷ lệ sai %, nhãn cảnh báo đỏ nếu tỷ lệ sai ≥ 50% kèm khuyến nghị giảng lại.
    - Nút "Xuất Excel (.xlsx)" với trạng thái loading và phản hồi lỗi.
  - Tích hợp vào `SessionControl.tsx` và export trong `apps/teacher-ui/src/index.ts`.
  - Bộ unit test `session-report-view.test.tsx` (pass 100%).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 90 test files, 351 tests pass (100% xanh toàn bộ 10 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (694 modules, 1813 dependencies)

### Task 3.5: Load test 50 client giả lập + ngắt mạng ngẫu nhiên (DoD Chặng 3)
- **Tối ưu hóa hiệu năng máy chủ Realtime (`packages/server`)**:
  - Tối ưu `ActivityEngine`: loại bỏ việc phân tích trùng lặp toàn bộ cấu trúc trạng thái qua Zod (`stateSchema.parse`) ở từng student intent nộp bài, giúp giảm thiểu nghẽn CPU trên luồng chính.
  - Xây dựng cơ chế phát sóng có điều tiết (`broadcastActiveState` throttled 25ms): gom các cập nhật bảng điểm dồn dập từ 50 học sinh nộp đồng thời, giảm tải 95% lưu lượng phát socket thừa trong khi vẫn đảm bảo độ trễ trạng thái tức thì cho client.
  - Duy trì phát sóng tức thì (`immediate = true`) đối với các sự kiện chuyển câu hỏi (`handleTeacherIntent`) và kết thúc hoạt động (`endActivity`).
- **Mô phỏng tải & Kiểm định phục hồi sự cố mạng (`packages/server/src/__tests__/stage-3-load-resilience.test.ts`)**:
  - Khởi tạo phiên học với 50 học sinh giả lập kết nối WebSocket và tham gia thi đấu Quiz Live đồng thời (3 câu hỏi).
  - Đo thời gian phản hồi của 150 lượt nộp bài từ 50 học sinh:
    - Min latency: 2.57ms
    - Average latency: 26.93ms
    - p50 latency: 17.31ms
    - **p95 latency: 91.69ms** (đạt và vượt xa tiêu chuẩn DoD Chặng 3: p95 < 300ms).
  - Giả lập ngắt kết nối mạng đột ngột đối với 15 học sinh (30% tổng số người tham gia) ở giữa bài thi (câu 2).
  - 15 học sinh bị rớt mạng thực hiện luồng khôi phục (`POST /api/sessions/resume`), kết nối lại WebSocket và lấy trạng thái hoạt động hiện tại qua `GET /api/sessions/:id/activities/current`:
    - Khôi phục chính xác câu hỏi hiện tại, bảo toàn nguyên vẹn điểm số, chuỗi streak và lịch sử đáp án các câu trước.
    - Học sinh tiếp tục nộp các câu hỏi còn lại bình thường.
  - Kiểm tra tính toàn vẹn dữ liệu (Data Integrity):
    - Toàn bộ 50 học sinh hoàn thành bài thi với dữ liệu điểm số, streak đầy đủ.
    - Báo cáo tổng kết phiên học (`session_reports`) ghi nhận đầy đủ 50 học sinh trong bảng điểm, không bị mất mát hay sai lệch bất kỳ thông tin nào do việc rớt mạng.
- **Kiểm định chất lượng Definition of Done Chặng 3**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 91 test files, 352 tests pass (100% xanh toàn bộ 10 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (697 modules, 1824 dependencies cruised)

### Task 4.1: Tạo kỳ thi: đề, thời gian, xáo câu/đáp án theo từng HS (chấm theo bản gốc), mở/đóng, mật khẩu kỳ thi tùy chọn
- **Tạo package mới `@educlass/activity-exam` (`packages/activities/exam`)**:
  - `exam-schemas.ts`: Khai báo Zod schemas cho `ExamConfigSchema` (tiêu đề, thời lượng phút, cờ xáo câu `shuffleQuestions`, cờ xáo đáp án `shuffleOptions`, mật khẩu tùy chọn `password`, danh sách câu hỏi gốc `Question[]`), `ParticipantExamStatusSchema` (trạng thái xác thực mật khẩu, bộ câu hỏi và ánh xạ đáp án hoán vị riêng cho thí sinh, đáp án đã lưu, trạng thái nộp bài), `ExamStateSchema` và `ExamResultSchema`.
  - `exam-shuffler.ts`: Triển khai thuật toán PRNG Mulberry32 kết hợp bộ băm djb2 tạo số ngẫu nhiên tất định từ seed định danh của từng thí sinh:
    - Xáo thứ tự câu hỏi và hoán vị các đáp án trắc nghiệm (`mcq4`) riêng biệt cho từng học sinh, loại bỏ hoàn toàn đáp án đúng qua `stripAnswerKey`.
    - Triển khai hàm ánh xạ ngược `unmapStudentAnswer`: khôi phục đáp án học sinh đã chọn về chỉ số của câu hỏi gốc, cho phép hàm chấm điểm `gradeQuestion` từ `@educlass/question-kit` chấm điểm chính xác 100% đối chiếu với bản gốc.
  - `exam-activity.ts`: Plugin `ExamActivity` tuân thủ Activity Plugin Contract (`ActivityDefinition`):
    - `onStart`: Khởi tạo kỳ thi ở trạng thái `ready`, chuẩn bị câu hỏi công khai và ẩn mật khẩu/đáp án.
    - `onTeacherIntent`: `open_exam` (mở đề thi và kích hoạt đồng hồ đếm ngược `expiresAt`), `close_exam` (thu bài thi/khóa kỳ thi), `extend_time` (cộng thêm thời gian làm bài).
    - `onStudentIntent`: `unlock_exam` (kiểm tra mật khẩu bảo vệ), `get_paper` (cung cấp đề thi cá nhân hóa đã xáo), `save_answer` (tự lưu đáp án từng câu với kiểm tra ràng buộc thời gian và chưa nộp bài), `submit_exam` (nộp bài thi sớm).
    - `onEnd`: Tự động chấm điểm toàn bộ bài thi theo bản gốc bằng `gradeQuestion` và trao thưởng EXP qua `ctx.grantReward`.
  - `exam-views.tsx`: Giao diện React điều khiển cho Giáo viên (`ExamTeacherPanel`) và giao diện hiển thị kỳ thi cho Học sinh (`ExamStudentView`).
- **Tích hợp Monorepo & UI/Server**:
  - Đăng ký package `@educlass/activity-exam` vào `packages/server`, `apps/teacher-ui`, `apps/student-ui`, `tsconfig.json`.
  - Cập nhật `defaultActivityRegistry` trong `packages/server/src/activity/registry.ts`.
  - Tích hợp modal thiết lập Kỳ thi và `ExamTeacherPanel` trong `apps/teacher-ui/src/components/ActivityPanel.tsx`.
  - Tích hợp `ExamStudentView` trong `apps/student-ui/src/components/ActivityHost.tsx`.
  - Cập nhật tài liệu kỹ thuật `docs/activity-guide.md` (mục 9).
- **Bộ kiểm thử toàn diện**:
  - `packages/activities/exam/src/__tests__/exam-shuffler.test.ts` (4 unit tests PRNG & unmap).
  - `packages/activities/exam/src/__tests__/exam-activity.test.ts` (5 unit tests lifecycle & intents).
  - `packages/activities/exam/src/__tests__/exam-views.test.tsx` (4 component tests GV/HS views).
  - `packages/server/src/__tests__/exam-routes.test.ts` (1 integration test kiểm tra trọn vẹn luồng tạo kỳ thi, đặt mật khẩu, mở/đóng, xáo câu độc lập 2 HS và chấm điểm đúng theo bản gốc).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 95 test files, 365 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (724 modules, 1901 dependencies cruised)

### Task 4.2: Giao diện làm bài (7.3): lưới câu, đánh dấu, đồng hồ, tự lưu từng lần chọn, nộp 2 bước, tự nộp hết giờ
- **Triển khai Giao diện làm bài thi hoàn chỉnh cho Học sinh (`ExamStudentView` trong `@educlass/activity-exam`)**:
  - **Lưới câu (Question Matrix / Grid theo PLAN 7.3)**:
    - Bảng ô số câu hỏi trực quan (1..N) theo thứ tự đề thi cá nhân hóa của thí sinh.
    - 3 trạng thái màu sắc chuẩn:
      - Xám (`bg-slate-100 text-slate-700`): Câu chưa trả lời.
      - Xanh dương (`bg-blue-600 text-white`): Câu đã trả lời / đã lưu.
      - Vàng hổ phách (`bg-amber-400 text-amber-950 border-amber-500`): Câu đang đánh dấu xem lại (kèm icon 🚩).
    - Tương tác điều hướng: Nhấp vào số câu cuộn mượt (`scrollIntoView`) tới chính xác thẻ câu hỏi đó. Hỗ trợ cả lưới câu cố định ở đầu bài và Modal lưới câu xem nhanh trên màn hình di động (360×640).
  - **Đồng hồ đếm ngược (Countdown Timer) & Tự nộp hết giờ**:
    - Hiển thị nổi bật trên Sticky Header: format `mm:ss` thời gian còn lại tính từ `state.expiresAt`.
    - Cảnh báo trực quan theo ngưỡng: màu xanh bình thường (> 5 phút), màu vàng cam (≤ 5 phút), màu đỏ san hô kèm hiệu ứng nhấp nháy `animate-pulse` khi sắp hết giờ (≤ 1 phút).
    - **Tự động nộp bài khi hết giờ (Auto-submit on time up)**: Guard kiểm tra `currentTime >= expiresAt`, tự động kích hoạt gửi intent `submit_exam` và khóa tương tác làm bài.
  - **Tự lưu từng lần chọn (Auto-save on select)**:
    - Cơ chế cập nhật tức thì (optimistic local update) dưới 16ms kèm gửi intent `save_answer` tới server.
    - Hỗ trợ đầy đủ 4 loại câu hỏi:
      - `mcq4`: 4 phương án trắc nghiệm với vùng chạm `min-h-[48px]`, khoảng cách ≥ 8px, nhãn A B C D rõ nét, ánh xạ đúng theo bảng hoán vị `optionOrders` của thí sinh.
      - `tf`: 2 nút Đúng (xanh lá ✔) / Sai (đỏ san hô ✖) lớn, vùng chạm `min-h-[48px]`.
      - `tf_group`: Chùm 4 phát biểu a, b, c, d với 2 nút Đúng / Sai riêng biệt cho từng ý.
      - `short`: Ô nhập câu trả lời ngắn `min-h-[48px]`.
    - Badge "✓ Đã lưu" trực quan bên cạnh từng câu hỏi khi đã ghi nhận câu trả lời.
  - **Đánh dấu câu hỏi xem lại (Bookmark)**:
    - Nút bấm `🚩 Đánh dấu` / `🚩 Đã đánh dấu` ở đầu mỗi thẻ câu hỏi, đồng bộ trạng thái màu vàng tức thì lên Lưới câu hỏi.
  - **Nộp bài 2 bước (2-Step Submit Confirmation)**:
    - Bước 1: Bấm nút "Nộp bài" lớn trên Sticky Header hoặc ở cuối bài thi.
    - Bước 2: Hiển thị Modal tóm tắt số câu đã làm, số câu chưa làm, số câu đánh dấu xem lại và thời gian còn lại. Cảnh báo nổi bật `⚠️` nếu học sinh vẫn còn câu chưa trả lời. Nút "Tiếp tục làm bài" và nút "Xác nhận nộp" (gửi `submit_exam`).
  - **Khôi phục trạng thái (Resume / Reconnect)**:
    - Khởi tạo và tự động đồng bộ `answers` từ `state.participants[participantId].answers`, bảo toàn 100% câu trả lời khi rớt mạng hoặc tải lại trình duyệt.
- **Tích hợp & Kiểm thử**:
  - Mở rộng bộ unit tests trong `packages/activities/exam/src/__tests__/exam-views.test.tsx` (tăng lên 6 tests, pass 100%).
  - Bổ sung unit test tích hợp trong `apps/student-ui/src/__tests__/activity-host.test.tsx` (kiểm tra `ActivityHost` render `ExamStudentView` khi kỳ thi đang diễn ra).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 95 test files, 368 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (724 modules, 1902 dependencies cruised)

### Task 4.3: Giám sát live: câu đang làm, % hoàn thành, mất focus, đứng im; thu bài hộ, cộng giờ
- **Mở rộng Schema & Giao thức Giám sát Kỳ thi (`ParticipantExamStatusSchema` trong `@educlass/activity-exam`)**:
  - Bổ sung các trường dữ liệu theo dõi thời gian thực:
    - `currentQuestionIndex`, `currentQuestionId`: Chỉ số và định danh câu hỏi thí sinh đang thao tác.
    - `answeredCount`, `progressPercent`: Số lượng câu đã trả lời và phần trăm hoàn thành bài thi (0 - 100%).
    - `focusLostCount`, `isFocusLost`: Số lần rời khỏi tab/cửa sổ làm bài thi và cờ báo hiệu thí sinh hiện có đang rời màn hình hay không.
    - `lastActiveAt`: Dấu thời gian hoạt động gần nhất để phục vụ cơ chế phát hiện đứng im (idle).
    - `extendedMinutes`, `individualExpiresAt`: Số phút và thời điểm hết giờ riêng khi được giáo viên cộng giờ.
- **Xử lý Intent trên Server (`ExamActivity.server`)**:
  - `report_status` (Học sinh): Nhận cập nhật trạng thái mất focus (`blur`/`visibilitychange`), câu hỏi đang tương tác, cập nhật `lastActiveAt` và tăng số lần rời tab `focusLostCount`.
  - `save_answer` (Học sinh): Tự động tính toán lại `answeredCount`, `progressPercent` và cập nhật `lastActiveAt`.
  - `force_submit_student` (Giáo viên): Cho phép giáo viên thu bài hộ thí sinh ngay tức thì khi phát hiện vi phạm quy chế hoặc sự cố, cập nhật `isSubmitted = true` và khóa quyền sửa bài.
  - `extend_student_time` (Giáo viên): Cộng thêm thời gian làm bài riêng cho từng thí sinh chỉ định (`individualExpiresAt`), hỗ trợ bù giờ cho học sinh gặp sự cố mạng hoặc thiết bị.
- **Nâng cấp Bảng Giám sát Thời gian thực của Giáo viên (`ExamTeacherPanel`)**:
  - Thống kê sĩ số tổng quan: Tổng số thí sinh vào phòng, số thí sinh đang làm bài, số thí sinh đã nộp, và số thí sinh có cảnh báo.
  - Bộ lọc thí sinh linh hoạt (Tabs): "Tất cả", "Đang làm", "Đã nộp", và "Có cảnh báo" (lọc nhanh các thí sinh rời màn hình hoặc đứng im).
  - Ô tìm kiếm thí sinh theo tên realtime (`searchName`).
  - Danh sách bảng giám sát chi tiết từng thí sinh:
    - Câu đang làm (`Câu X/N`) kèm mã định danh câu.
    - Tiến độ hoàn thành trực quan với thanh Progress bar và tỷ lệ phần trăm (0 - 100%).
    - Cảnh báo mất focus: Hiển thị nhãn cảnh báo đỏ `🔴 Đang rời màn hình!` khi thí sinh đang ở ngoài tab, và nhãn vàng `⚠️ Mất focus: X lần` ghi nhận tổng số lần rời tab.
    - Cảnh báo đứng im (Idle Detection): Tự động phát hiện và cảnh báo `💤 Đứng im Xp` khi thí sinh không có tương tác nào trong ≥ 2 phút.
    - Nút thao tác tương tác nhanh: Nút "+5p" cộng giờ riêng và nút "Thu bài hộ" (kèm popup xác nhận tránh bấm nhầm).
- **Nâng cấp Giao diện Học sinh (`ExamStudentView`)**:
  - Tự động bắt sự kiện `blur`, `focus` trên window và `visibilitychange` trên document để gửi intent `report_status` lên máy chủ.
  - Hiển thị Banner cảnh báo màu đỏ viền đậm trên giao diện khi học sinh rời khỏi màn hình làm bài, nhắc nhở giữ trật tự và tuân thủ quy chế thi.
  - Tự động đồng bộ câu đang làm khi học sinh cuộn hoặc tương tác vào từng thẻ câu hỏi.
  - Tự động tính toán đồng hồ đếm ngược theo hạn giờ riêng `individualExpiresAt` và hiển thị huy hiệu "+Xp cộng thêm" khi được giáo viên cộng giờ.
- **Bộ kiểm thử toàn diện**:
  - `packages/activities/exam/src/__tests__/exam-activity.test.ts`: Bổ sung unit test kiểm tra toàn diện intent `report_status`, `force_submit_student` và `extend_student_time` (6/6 tests pass).
  - `packages/activities/exam/src/__tests__/exam-views.test.tsx`: Bổ sung 2 component tests cho `ExamTeacherPanel` (giám sát mất focus, đứng im, thu bài hộ, cộng giờ) và `ExamStudentView` (bắt sự kiện mất focus) (8/8 tests pass).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 95 test files, 370 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (724 modules, 1902 dependencies cruised)

### Task 4.4: Báo cáo: phổ điểm, tỷ lệ sai từng câu, xuất Excel; EXP kỳ thi theo bảng luật (Hoàn thành Chặng 4)
- **Mô-đun Phân tích & Báo cáo Kỳ thi (`exam-analytics.ts` trong `@educlass/activity-exam`)**:
  - `calculateScoreDistribution`:
    - Tính toán toàn diện các chỉ số thống kê kết quả bài thi: Điểm trung bình, Điểm cao nhất, Điểm thấp nhất, Điểm trung vị, Số lượng đạt và Tỷ lệ đạt (%) chuẩn mực.
    - Phân bố 5 dải phổ điểm chuẩn: Dưới 5.0 (Yếu/Kém), 5.0 - < 6.5 (Trung bình), 6.5 - < 8.0 (Khá), 8.0 - < 9.0 (Giỏi), 9.0 - 10.0 (Xuất sắc) kèm số lượng, tỷ lệ phần trăm và danh sách học sinh.
  - `calculateQuestionAnalysis`:
    - Thống kê chi tiết từng câu hỏi trong đề gốc: Số lượt làm bài, số bạn đúng, số bạn sai, tỷ lệ làm sai (%), số thí sinh bỏ trống.
    - Tự động phân tích các phương án nhiễu (Distractor Analysis) cho câu trắc nghiệm `mcq4` để giáo viên nắm bắt bẫy/lỗi học sinh thường mắc phải nhất.
  - `computeExamResults`:
    - Hàm thuần chấm điểm học sinh đối chiếu chuẩn xác với bộ câu hỏi gốc sau khi đã unmap đáp án cá nhân hóa của từng thí sinh, xếp hạng rank giảm dần theo điểm số.
  - `generateExamExcelWorkbook` & `exportExamExcelBuffer`:
    - Xuất tệp bảng tính Excel (`.xlsx`) chuyên nghiệp với đầy đủ 4 Sheets:
      1. **Tổng quan & Phổ điểm**: Thông số kỳ thi, chỉ số thống kê (TB, max, min, median, pass rate), bảng phân bố 5 dải phổ điểm.
      2. **Bảng điểm học sinh**: Hạng, Mã thí sinh, Họ tên, Điểm số, Điểm tối đa, Phần trăm %, Số câu đúng / Tổng câu, Thời gian nộp bài.
      3. **Phân tích câu hỏi**: Thứ tự câu, Mã câu, Loại câu, Điểm, Số lượt làm, Số đúng, Số sai, Tỷ lệ sai (%), Số bỏ trống.
      4. **Ma trận làm bài**: Bảng chéo Thí sinh × Từng câu hỏi (Đúng ✔ / Sai ✖ / Bỏ trống -).
- **Tích hợp Bảng luật EXP kỳ thi (`DEFAULT_GLOBAL_REWARD_RULES` trong `@educlass/core`)**:
  - Bổ sung đầy đủ các trigger kỳ thi: `exam_finish` (30 EXP), `exam_high_score` (20 EXP), `exam_perfect` (50 EXP) và trần EXP `activity_cap` (100 EXP).
  - Kết nối với `ExamActivity.server.onEnd` tự động cấp thưởng EXP theo đúng bảng luật của giáo viên và kiểm tra trần chống lạm phát.
- **Nâng cấp Bảng điều khiển Giáo viên (`ExamTeacherPanel` trong `@educlass/activity-exam`)**:
  - Thanh chuyển đổi Tab: `📋 Giám sát phòng thi` và `📊 Báo cáo & Phổ điểm`.
  - Nút tải tệp Excel ngay trên giao diện `📥 Xuất Excel (.xlsx)` (hoạt động offline 100% trong trình duyệt).
  - Thẻ KPI trực quan: Điểm trung bình, Điểm cao nhất, Điểm thấp nhất, Tỷ lệ đạt (%).
  - Biểu đồ phổ điểm thanh ngang với màu sắc phân biệt và độ rộng tỷ lệ %.
  - Bảng phân tích câu hỏi sắp xếp theo tỷ lệ sai giảm dần, tự động gắn nhãn đỏ cảnh báo `⚠️ Sai nhiều: X%` với các câu có tỷ lệ sai ≥ 50%.
  - Bảng xếp hạng học sinh kèm huy hiệu 🥇🥈🥉.
- **Nghiệm thu Definition of Done (DoD) Chặng 4**:
  - Kiểm thử tình huống đóng trình duyệt/mất mạng giữa bài: HS làm dở bài, tải lại trình duyệt, khôi phục nguyên vẹn 100% các câu đã làm, tiếp tục làm bài và nộp bài thành công.
- **Bộ kiểm thử toàn diện**:
  - `packages/activities/exam/src/__tests__/exam-analytics.test.ts`: 5 unit tests kiểm tra phổ điểm, phân tích câu hỏi, chấm điểm unmapping và xuất Excel 4 sheets.
  - `packages/activities/exam/src/__tests__/exam-views.test.tsx`: Bổ sung component tests kiểm tra render tab Báo cáo, Phổ điểm, Bảng điểm và nút Xuất Excel (9/9 tests pass).
  - `packages/activities/exam/src/__tests__/exam-activity.test.ts`: Bổ sung test case nghiệm thu DoD Chặng 4 về khôi phục đáp án khi rớt mạng / vào lại (7/7 tests pass).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 96 test files, 378 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (730 modules, 1926 dependencies cruised)

### Task 5.1: Nhân vật (bộ avatar SVG), EXP/level bar, danh hiệu (luật dạng dữ liệu), trang phục cơ bản
- **Bộ Avatar Vector SVG Ngoại tuyến 100% (`@educlass/ui-kit` & `@educlass/protocol`)**:
  - `StudentAvatar`: Component hiển thị nhân vật dạng vector SVG thuần túy, không dùng thư viện ngoài/CDN hay icon font, hỗ trợ sắc nét từ `xs` (28px) đến `2xl` (128px).
  - 8 nhân vật cơ bản thân thiện: Mèo thông thái (`cat`), Cáo nhanh trí (`fox`), Gấu cần cù (`bear`), Cú uyên bác (`owl`), Thỏ năng động (`rabbit`), Rồng dũng cảm (`dragon`), Robot công nghệ (`robot`), Cánh cụt khám phá (`penguin`).
  - Phụ kiện mũ nón (`headwear`): Băng đô thể thao, Mũ lưỡi trai, Tai nghe cá tính, Mũ cử nhân, Vương miện hoàng gia.
  - Phụ kiện khuôn mặt & kính (`glasses`): Kính cận tri thức, Kính râm cực ngầu, Má hồng ngôi sao.
  - Trang phục thân (`outfit`): Áo phông cơ bản, Đồng phục học sinh, Áo Hoodie, Áo bóng rổ, Áo choàng pháp sư.
- **Thanh Tiến độ Level & EXP (`ExpLevelBar`)**:
  - Component hiển thị huy hiệu Cấp độ (`Level`) bo tròn gradient sắc nét và thanh tiến độ EXP mượt mà.
  - Tự động tính toán tỷ lệ tiến độ % dựa trên công thức cấp độ tích lũy chuẩn EduClass v2.
- **Danh hiệu với Luật Dạng Dữ liệu (Data-Driven Rules) (`@educlass/core` & `@educlass/db`)**:
  - Schema Zod định nghĩa cấu trúc dữ liệu `TitleRule` gồm các điều kiện (`TitleCondition`): `min_exp`, `min_level`, `exam_high_scores`, `exam_perfect`, `quiz_streak`, `attendance_sessions`.
  - Bộ 8 danh hiệu mặc định trong hệ thống: Tân binh lớp học (`tan_binh`), Học sinh chăm chỉ (`cham_chi`), Siêu cấp tiến bộ (`sieu_cap`), Học bá uyên bác (`hoc_ba`), Thủ khoa trường thi (`thu_khoa`), Điểm mười hoàn hảo (`diem_muoi`), Tia chớp tốc độ (`vua_toc_do`), Đại sư tri thức (`dai_su`).
  - Hàm thuần `evaluateStudentTitleRules` và `isTitleEligible` kiểm tra dữ liệu thành tích học sinh đối chiếu điều kiện để tự động cấp danh hiệu.
  - `TitleRepository` trong `@educlass/db`: Lưu trữ danh mục danh hiệu, bảng quan hệ `student_titles`, `seedDefaultTitles()`, `getStudentTitles()`, `awardTitle()` và `evaluateAndAwardTitles()`.
- **Bộ Tùy biến Diện mạo Học sinh (`AvatarCustomizer`)**:
  - Cho phép học sinh xem trước trực tiếp (Live Preview) kích thước lớn khi thay đổi các bộ phận nhân vật, màu nền, mũ nón, kính mắt, trang phục.
  - Kiểm tra mở khóa theo cấp độ (`unlockLevel`) và danh hiệu đặc biệt (`unlockTitleKey`); hiển thị biểu tượng ổ khóa 🔒 và ghi chú cấp độ cần đạt cho các món đồ chưa mở khóa.
  - Vùng chạm tương tác đạt chuẩn ≥ 48px, tương thích hoàn toàn viewport điện thoại học sinh 360×640.
- **Hệ thống API REST Server (`@educlass/server`)**:
  - `GET /api/titles`: Lấy danh sách toàn bộ danh hiệu hệ thống kèm luật điều kiện.
  - `GET /api/students/:studentId/profile`: Lấy hồ sơ game hóa của học sinh (avatar, exp, level, danh hiệu đã đạt).
  - `PATCH /api/students/:studentId/avatar`: Lưu cấu hình avatar của học sinh (xác thực nghiêm ngặt bằng Zod `UpdateAvatarRequestSchema`).
  - `POST /api/students/:studentId/titles/evaluate`: Tự động đánh giá và trao danh hiệu mới.
- **Bộ kiểm thử toàn diện**:
  - `packages/core/src/__tests__/gamification.test.ts`: 8 unit tests kiểm tra mở khóa trang phục, điều kiện danh hiệu và hàm đánh giá.
  - `packages/db/src/__tests__/title-repository.test.ts`: 4 integration tests kiểm tra seed danh hiệu, trao danh hiệu idempotent, tự động đánh giá và lưu avatar JSON.
  - `packages/ui-kit/src/__tests__/gamification-components.test.tsx`: 8 component tests kiểm tra `StudentAvatar`, `ExpLevelBar`, `TitleBadge`, `AvatarCustomizer`.
  - `packages/server/src/__tests__/titles-routes.test.ts`: 2 integration tests kiểm tra các endpoints titles, profile, avatar update và title evaluation.
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 100 test files, 398 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (769 modules, 2041 dependencies cruised)

### Task 5.2: Chat GV↔HS (chung/riêng), GV khóa chat, nút ✋ xin giúp
- **Giao thức & Schema Zod (`@educlass/protocol`)**:
  - `ChatMessageKindSchema`: Hỗ trợ 2 phân loại tin nhắn `text` và `hand_raise`.
  - `ChatMessageDtoSchema`: Định dạng tin nhắn chuẩn trong phiên (`id`, `sessionId`, `fromParticipantId`, `fromParticipantName`, `toParticipantId`, `toParticipantName`, `fromTeacher`, `kind`, `text`, `ts`).
  - `SendChatMessageRequestSchema`: Xác thực gửi tin nhắn chat, hỗ trợ chat toàn lớp (`toParticipantId = null`) hoặc chat riêng với GV/HS (`toParticipantId = participantId`).
  - `ToggleChatLockRequestSchema`: Giáo viên điều khiển khóa/mở chat (`locked: boolean`).
  - `HandRaiseItemSchema`, `HandRaiseRequestSchema`, `ResolveHandRaiseRequestSchema`: Quản lý yêu cầu xin trợ giúp ✋ của học sinh.
  - Mã lỗi chuẩn `CHAT_LOCKED`: "Thầy/cô đã tạm khóa tính năng trò chuyện trong phiên học."
- **Cơ sở dữ liệu & ChatRepository (`@educlass/db`)**:
  - `ChatRepository`: Quản lý tạo tin nhắn `createMessage()`, phân quyền xem tin nhắn bảo mật `listMessages()` (học sinh chỉ thấy tin chung + tin riêng của mình; GV thấy toàn bộ tin nhắn), kiểm tra trạng thái khóa `isChatLocked()`, đổi trạng thái khóa `setChatLocked()`.
  - Quản lý danh sách xin giúp: `addHandRaise()`, `getActiveHandRaises()`, `resolveHandRaise()`.
  - Unit test `packages/db/src/__tests__/chat-repository.test.ts` (2 tests pass 100%).
- **Server REST API & WebSocket Realtime Broadcast (`@educlass/server`)**:
  - `GET /api/sessions/:sessionId/chat/messages`: Lấy lịch sử chat (phân quyền theo token GV hoặc HS).
  - `POST /api/sessions/:sessionId/chat/messages`: Gửi tin nhắn mới (chặn khi chat bị khóa đối với học sinh), tự động phát sóng realtime `chat:new_message` qua WS.
  - `PATCH /api/sessions/:sessionId/chat/lock`: Giáo viên bật/tắt khóa chat, phát sóng realtime `chat:lock_state`.
  - `POST /api/sessions/:sessionId/chat/hand-raise`: Học sinh bấm nút ✋ xin giúp, phát sóng realtime `chat:hand_raise`.
  - `POST /api/sessions/:sessionId/chat/hand-raise/resolve`: Giáo viên đánh dấu đã hỗ trợ xong, phát sóng realtime `chat:hand_raise_resolved`.
  - `GET /api/sessions/:sessionId/chat/status`: Lấy trạng thái khóa chat và danh sách giơ tay hiện tại.
  - Integration test `packages/server/src/__tests__/chat-routes.test.ts` (1 test pass 100%).
- **Component ChatBox Giao diện (`@educlass/ui-kit`)**:
  - `ChatBox`: Component khung chat hỗ trợ chuyển tab "Toàn lớp" (chung) và "Với Thầy/Cô" (riêng).
  - Banner cảnh báo khi chat bị khóa, tự động vô hiệu hóa ô nhập chat đối với học sinh.
  - Nút ✋ "Xin giúp" kèm modal nhập lý do cho học sinh.
  - Nút Khóa/Mở chat và tab danh sách giơ tay kèm nút "Đã hỗ trợ xong" cho giáo viên.
  - Component test `packages/ui-kit/src/__tests__/chat-box.test.tsx` (5 tests pass 100%).
- **Tích hợp Teacher UI (`apps/teacher-ui`)**:
  - `SessionControl`: Bổ sung nút "💬 Trò chuyện & Trợ giúp" kèm huy hiệu số học sinh đang giơ tay `✋ (N)`.
  - Modal quản lý chat giáo viên: xem tin nhắn chung/riêng, bật/tắt khóa chat, xem và giải quyết yêu cầu trợ giúp.
  - Component test `apps/teacher-ui/src/__tests__/session-control.test.tsx` (7 tests pass 100%).
- **Tích hợp Student UI (`apps/student-ui`)**:
  - `StudentPortal`: Bổ sung nút "💬 Trò chuyện & ✋ Xin giúp" tại màn hình phòng chờ.
  - Modal chat học sinh: gửi tin nhắn chung/riêng tới GV, hiển thị banner khi bị khóa chat, bấm nút ✋ xin giúp kèm lý do.
  - Component test `apps/student-ui/src/__tests__/student-portal.test.tsx` (11 tests pass 100%).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 102 test files, 406 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (790 modules, 2118 dependencies cruised)

### Task 5.3: Màn tổng kết cuối tiết cho HS (EXP nhận, danh hiệu mới; với roster/guest hiển thị "Đăng nhập bằng PIN để lưu EXP lần sau")
- **Giao thức & Schema Zod (`@educlass/protocol`)**:
  - `StudentSessionSummaryItemSchema`: Cấu trúc tóm tắt thành tích phiên học cho học sinh gồm `sessionId`, `sessionCode`, `participantId`, `studentId`, `displayName`, `identityLevel`, `teamName`, `totalExpEarned`, `persistedExp`, `currentLevel`, `totalAccumulatedExp`, `leveledUp`, `expBreakdown` (`reason`, `exp`, `ts`), `newTitlesAwarded` (`key`, `name`, `iconKey`), `avatar`, `reminderPinLogin`.
  - `StudentSessionSummaryResponseSchema`: Xác thực payload trả về của endpoint tra cứu tổng kết học sinh.
  - Unit test `packages/protocol/src/__tests__/session.test.ts` (16/16 tests pass).
- **Cơ sở dữ liệu & Server REST API (`@educlass/db` & `@educlass/server`)**:
  - `TitleRepository`: Nâng cấp `getStudentTitles()` để lấy thông tin `sessionId` được cấp danh hiệu.
  - Endpoint `GET /api/sessions/:id/student-summary/:participantId`:
    - Tính toán chính xác tổng EXP nhận trong phiên học từ `reward_log`.
    - Lọc danh hiệu mới trao tặng cho học sinh trong phiên học từ `TitleRepository`.
    - Lấy thông tin cấp độ và tổng EXP tích lũy nếu là tài khoản học sinh (`studentRepo`).
    - Gán cờ `persistedExp: isAccount` và cờ `reminderPinLogin: !isAccount` (đối với học sinh `roster` và `guest`).
  - Integration test `packages/server/src/__tests__/session-close-report.test.ts` (pass 100%).
- **Component StudentSessionSummaryView (`@educlass/ui-kit`)**:
  - `StudentSessionSummaryView`:
    - Hiển thị Avatar học sinh với cấu hình từ server, tên học sinh và cấp độ danh tính.
    - Thẻ EXP nhận được nổi bật (+EXP) kèm huy hiệu thăng cấp (Level Up) nếu có.
    - Thanh tiến độ kinh nghiệm `ExpLevelBar` và tổng EXP tích lũy đối với học sinh có tài khoản.
    - Danh sách chi tiết các lần nhận thưởng EXP (`expBreakdown`) và danh hiệu mới đạt được (`newTitlesAwarded` kèm `TitleBadge`).
    - Thẻ nhắc nhở nổi bật cho học sinh `roster` và `guest`: **"Đăng nhập bằng PIN để lưu EXP lần sau!"** giải thích số EXP chưa được lưu vĩnh viễn và hướng dẫn cấp PIN.
    - Thẻ xác nhận an toàn cho học sinh `account`: **"Toàn bộ EXP đã được lưu vĩnh viễn vào tài khoản của bạn!"**.
    - Nút bấm hành động duy nhất đạt chuẩn PLAN 7.2 (vùng chạm ≥ 48px): "🚀 Vào phiên học khác".
  - Component test `packages/ui-kit/src/__tests__/student-session-summary-view.test.tsx` (3 tests pass 100%).
- **Tích hợp Student UI (`apps/student-ui`)**:
  - `StudentPortal`:
    - Tự động chuyển sang màn hình tổng kết cuối tiết khi nhận sự kiện phiên đóng từ WebSocket hoặc khi resume gặp lỗi `SESSION_CLOSED`.
    - Tính toán tổng kết dự phòng mượt mà từ lịch sử realtime `rewardsHistory` và thông tin phiên hiện tại khi ngoại tuyến hoặc chưa fetch xong từ API.
    - Nút "Vào phiên học khác" dọn sạch trạng thái và quay về bước nhập mã phòng.
  - Component test `apps/student-ui/src/__tests__/student-portal.test.tsx` (13 tests pass 100%).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
### Task 5.4: Khung tổng kết phiên cho GV (toàn lớp)
- **Giao thức & Schema Zod (`@educlass/protocol`)**:
  - Mở rộng `SessionGamificationSummarySchema`:
    - `topPodium`: Top 3 học sinh xuất sắc nhất phiên học (rank 1, 2, 3 kèm `participantId`, `displayName`, `score`, `expEarned`, `accuracy`, `identityLevel`, `teamName`, `avatar`).
    - `newTitlesAwarded`: Danh sách học sinh đạt danh hiệu mới trong phiên học (`studentId`, `studentName`, `titleKey`, `titleName`, `iconKey`).
    - `identityStats`: Thống kê phân loại 3 cấp danh tính và lưu trữ EXP toàn lớp (`accountCount`, `rosterCount`, `guestCount`, `persistedExpTotal`, `unpersistedExpTotal`).
    - `rosterNeedingPin`: Danh sách học sinh `roster` đạt EXP nhưng chưa nhập mã PIN cá nhân (`studentId`, `displayName`, `expEarned`).
  - Bổ sung `gamification?: SessionGamificationSummary` và `avatar?: AvatarConfig` vào `SessionReportSnapshotSchema` và `SessionStudentScoreItemSchema`.
  - Unit test `packages/protocol/src/__tests__/session.test.ts` (17/17 tests pass).
- **Cơ sở dữ liệu & Server Analytics (`@educlass/db` & `@educlass/server`)**:
  - `TitleRepository`: Triển khai `getTitlesAwardedInSession(sessionId)` truy vấn danh hiệu mở khóa trong phiên học kèm thông tin chi tiết.
  - `generateSessionAnalytics`: Tự động tổng hợp Top 3 bục vinh danh, thống kê danh tính, danh sách HS roster cần PIN, và danh hiệu mới mở khóa vào snapshot báo cáo phiên.
  - Endpoint `POST /api/sessions/:id/close`: Tích hợp truy vấn danh hiệu mới và lưu trữ snapshot gamification vào DB khi đóng phiên.
  - Server unit & integration test: `session-report-generator.test.ts` và `session-close-report.test.ts` (pass 100%).
- **Component TeacherSessionSummaryView (`@educlass/ui-kit`)**:
  - Bục vinh danh Top 3 (Podium) trang trọng: Rank 1 (👑 Vàng kim cao nhất ở giữa), Rank 2 (🥈 Bạc bên trái), Rank 3 (🥉 Đồng bên phải) với `StudentAvatar` SVG, điểm số, EXP và tỉ lệ chính xác.
  - Spotlight Danh hiệu mới mở khóa toàn lớp (`newTitlesAwarded`) với `TitleBadge` và thông điệp chúc mừng.
  - Thống kê Danh tính & An toàn lưu EXP: Phân bố số lượng HS và EXP theo 3 cấp (`account`, `roster`, `guest`), cùng cảnh báo danh sách học sinh `roster` cần nhập PIN.
  - Chế độ Màn chiếu lớp học (Projector Mode): Toàn màn hình với cỡ chữ lớn, nền tối sang trọng phục vụ trình chiếu trên TV/máy chiếu lớp học, hỗ trợ thoát bằng phím ESC.
  - Điều hướng 3 tabs: 🏆 Vinh danh & Game hóa, 📊 Bảng điểm học sinh, ⚠️ Câu hỏi sai nhiều; cùng nút Xuất Excel và Mở phiên mới.
  - Component test `packages/ui-kit/src/__tests__/teacher-session-summary-view.test.tsx` (5 tests pass 100%).
- **Tích hợp Teacher UI (`apps/teacher-ui`)**:
  - `SessionReportView`: Tích hợp `TeacherSessionSummaryView` từ `@educlass/ui-kit`, hỗ trợ chuyển đổi giữa chế độ thông thường và chế độ Màn chiếu lớp học.
  - Component test `apps/teacher-ui/src/__tests__/session-report-view.test.tsx` (5 tests pass 100%).
- **Kiểm định chất lượng Definition of Done**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 105 test files, 420 tests pass (100% xanh toàn bộ 11 packages & apps monorepo)
  - `pnpm deps:check`: 0 violations (802 modules, 2174 dependencies cruised)

### Cổng Web Giáo Viên: Quản lý chi tiết & Chỉnh sửa Lớp học, Học sinh, Bộ đề và Soạn câu hỏi
- **Quản lý Lớp học & Học sinh (`packages/server/public/teacher/index.html`)**:
  - Bổ sung nút hành động trên mỗi thẻ Lớp học: `[👥 Danh sách học sinh]`, `[✏️ Sửa]`, `[🗑️ Xóa]`.
  - Triển khai Modal `modal-class-students`:
    - Xem danh sách học sinh theo bảng rõ ràng (STT, Mã HS, Họ tên, Trạng thái PIN, Cấp độ, EXP).
    - Biểu mẫu thêm nhanh học sinh vào lớp (Họ tên, Mã HS, Mã PIN) gọi `POST /api/classes/:classId/students`.
    - Đặt lại hoặc hủy mã PIN học sinh gọi `POST /api/classes/:classId/students/:studentId/pin`.
    - Xóa học sinh khỏi lớp kèm xác nhận gọi `DELETE /api/classes/:classId/students/:studentId`.
  - Triển khai Modal `modal-edit-class`: Sửa tên lớp và năm học gọi `PATCH /api/classes/:id`.
  - Xóa lớp học kèm cảnh báo dữ liệu học sinh liên quan gọi `DELETE /api/classes/:id`.
- **Quản lý Bộ đề & Soạn câu hỏi trắc nghiệm**:
  - Bổ sung nút hành động trên mỗi thẻ Bộ đề: `[📝 Soạn / Sửa câu hỏi]`, `[✏️ Sửa]`, `[🗑️ Xóa]`.
  - Triển khai Modal `modal-manage-questions`:
    - Xem danh sách câu hỏi trắc nghiệm (MCQ) trực quan với 4 lựa chọn A, B, C, D và nhãn xanh lá nổi bật cho đáp án đúng.
    - Biểu mẫu soạn câu hỏi mới / chỉnh sửa câu hỏi đã có: Đề bài, 4 phương án, chọn đáp án đúng (A/B/C/D), điểm số.
    - Xóa câu hỏi khỏi bộ đề và nạp câu hỏi lên form để chỉnh sửa.
    - Tự động chuẩn hóa và lưu trữ danh sách câu hỏi lên máy chủ qua `PUT /api/question-sets/:id/questions`.
  - Triển khai Modal `modal-edit-qset`: Sửa tiêu đề, môn học, khối lớp gọi `PUT /api/question-sets/:id`.
  - Xóa bộ đề kèm hộp thoại xác nhận gọi `DELETE /api/question-sets/:id`.
- **Kiểm định chất lượng toàn diện**:
  - `pnpm lint`: Pass (0 lỗi)
  - `pnpm typecheck`: Pass (0 lỗi, `tsc -b`)
  - `pnpm test`: 105 test files, 420 tests pass (100% xanh toàn bộ)
  - `pnpm deps:check`: 0 violations

### Mở rộng Cổng Giáo Viên & Học Sinh: Nhập Word, Copy Dán Excel & Chơi Kahoot / Quizizz Trực Tiếp
- **Nhập đề thi từ file Word (`.docx`)**:
  - Tích hợp nút `[📥 Nhập đề từ Word (.docx)]` và nút `[📄 Tải file Word mẫu]`.
  - Tự động bóc tách câu hỏi, phương án A/B/C/D, nhận diện đáp án đúng, công thức KaTeX và tạo ngay bộ đề hoặc nạp vào bộ đề đang soạn.
- **Copy dán học sinh từ Excel vào Lớp học**:
  - Tích hợp nút `[📋 Copy dán / Nhập từ Excel]` trong modal danh sách học sinh.
  - Cho phép dán trực tiếp dữ liệu từ Excel (`POST /api/classes/:classId/students/preview-paste`), xem trước số học sinh hợp lệ/trùng lặp và xác nhận nhập vào lớp (`/api/classes/:classId/students/import`).
  - Sửa lỗi phân tích: Chỉ cần cột Họ và tên là hợp lệ, mã học sinh và mã PIN là tùy chọn; hiển thị danh sách học sinh nhận diện trực tiếp trên giao diện để giáo viên xác nhận.
- **Mở và điều khiển trò chơi Kahoot & Quizizz Live & Quản lý phiên học**:
  - Giáo viên: Tích hợp nút `[⚡ Mở Quiz Live (Kahoot / Quizizz)]` ngay trên thanh Banner phiên học.
    - Cho phép chọn Bộ đề câu hỏi, chọn phong cách (Kahoot dẫn dắt theo câu hoặc Quizizz tự do), cài đặt thời gian và điểm số.
    - Bảng điều khiển trực tiếp trên màn hình giáo viên: Xem số học sinh đã nộp bài, chuyển câu tiếp theo (`next_question`), hiện đáp án & review (`show_review`), bảng xếp hạng (`show_leaderboard`) và kết thúc quiz (`end`).
    - Sửa lỗi đồng bộ phiên học active: Bổ sung endpoint `GET /api/sessions` và `POST /api/sessions/close-active`, tự động giải phóng phiên cũ nếu bị kẹt khi giáo viên mở phiên mới.
  - Học sinh: Giao diện Cổng Học Sinh (`packages/server/public/student/index.html`) tự động chuyển sang chế độ chơi với 4 nút đáp án màu phong cách Kahoot (Đỏ ▲, Xanh dương ◆, Vàng ●, Xanh lá ■), hiển thị điểm số tức thì, chuỗi đúng (streak) và màn hình vinh danh khi hoàn thành.





