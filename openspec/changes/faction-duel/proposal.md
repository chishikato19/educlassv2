# Đề xuất: Đại Chiến Xanh Đỏ Theo Elo (Faction Duel)

## 1. Bối cảnh & Động lực (Context & Motivation)

Trong các lớp học hiện đại, các hoạt động tương tác nhóm thường gặp phải 3 vấn đề cố hữu:

1. **Mất cân bằng trình độ ban đầu:** Khi chia nhóm tự do hoặc ngẫu nhiên hoàn toàn, một đội có thể quy tụ quá nhiều bạn giỏi dẫn đến trận đấu một chiều, làm giảm động lực thi đấu của cả lớp.
2. **Chiến thuật "bắt nạt" bạn yếu (Bullying/Farming):** Trong các trò chơi cho phép chọn đối thủ, đội mạnh thường có xu hướng nhắm vào những bạn có học lực yếu bên đội đối phương để kiếm điểm dễ dàng, gây tâm lý tự ti, tổn thương cho học sinh.
3. **Thời gian chờ đợi và xử lý sĩ số lẻ:** Các trò chơi đối kháng 1v1 thường gặp khó khăn khi sĩ số lớp lẻ (buộc 1 bạn phải ngồi ngoài làm "khán giả") hoặc thời gian bắt cặp quá lâu làm gián đoạn tiết học.

**Đại Chiến Xanh Đỏ (Faction Duel)** ra đời nhằm giải quyết trọn vẹn các thách thức trên thông qua sự kết hợp giữa:

- **Cân bằng Elo tự động:** Chia 2 phe Xanh - Đỏ cân bằng lực lượng dựa trên điểm trình độ ẩn (Elo/MMR).
- **Cơ chế săn đuổi 15 giây:** Phe thắng ở mỗi lượt được quyền chọn đối thủ phe thua.
- **Tính điểm có trọng số Elo:** Kèo dưới thắng nhận thưởng đột biến (+3đ), kèo trên thắng chỉ nhận điểm cơ sở (+1đ), kích thích chiến thuật và bảo vệ học sinh yếu.
- **Cơ chế Phân thân (Clone):** Xử lý sĩ số lẻ hoàn toàn tự động, người được clone làm bài 1 lần nhưng đấu song song với 2 đối thủ.
- **Tùy biến câu hỏi linh hoạt:** Cho phép giáo viên tùy chọn số câu mỗi trận (mặc định 2 câu), tự động đảo câu hỏi & đảo đáp án A/B/C/D, tự động xoay vòng tái sử dụng câu hỏi khi hết kho đề.

---

## 2. Mục tiêu (Goals)

1. **Phân chia 2 phe Xanh - Đỏ cân bằng tuyệt đối:** Sử dụng thuật toán Snake Draft (ABBA) và Partition Swap từ `packages/core/src/elo` để tối thiểu hóa chênh lệch Elo giữa 2 đội.
2. **Thi đấu đồng loạt, không thời gian chết:** Tất cả các cặp đấu 1v1 cùng nhận và làm bài câu hỏi đồng thời trên thiết bị học sinh (Mobile/Desktop).
3. **Pha Chọn Đấu Thủ kịch tính trong 15 giây (15s Pick Phase):**
   - Đội nhiều điểm hơn ở lượt trước được quyền chọn đối thủ bên phe ít điểm hơn.
   - Chọn tự do (First-Come First-Served Lock).
   - Chặn lặp lại đối thủ đã từng đấu (No-repeat opponent) trừ khi không còn lựa chọn.
   - Hết 15s tự động Auto-Random hoàn tất ghép cặp.
4. **Trọng số điểm Elo công bằng:**
   - Thắng người Elo cao hơn: **+3 điểm** (Lật kèo!).
   - Thắng người ngang Elo ($\pm 100$): **+2 điểm**.
   - Thắng người Elo thấp hơn: **+1 điểm**.
   - Hòa: **+0.5 điểm** mỗi bên.
   - Thua: **0 điểm**.
5. **Cơ chế Clone khi lẻ người:** Chọn ngẫu nhiên 1 bạn bên phe ít người để đấu với 2 bạn bên phe đông người, chỉ làm bài 1 lần, kết quả nhân đôi so khớp độc lập.
6. **Màn hình máy chiếu (Projector View) rực lửa:** Thanh kéo co tổng điểm Xanh - Đỏ thời gian thực kèm hiệu ứng chọn đối thủ sống động.

---

## 3. Phạm vi Triển khai (Scope)

### Trong phạm vi (In-Scope):

- Package Activity mới: `packages/activities/faction-duel` (`@educlass/activity-faction-duel`).
- Lõi thuật toán & Schemas:
  - `faction-schemas.ts`: State machine, Matchup, PickPhase, Config, Results.
  - `faction-draft.ts`: Logic 15s pick phase, khóa mục tiêu, kiểm tra lịch sử đấu, auto-random fallback, clone handling.
  - `faction-scoring.ts`: Đánh giá câu hỏi 1v1, tính điểm trận có trọng số Elo, cộng dồn điểm đội.
  - `faction-activity.ts`: Plugin hoàn chỉnh tuân thủ hợp đồng `ActivityModule<Cfg, St, Res>`.
- Giao diện người dùng:
  - `FactionDuelTeacherPanel.tsx`: Điều khiển vòng đấu, giám sát cặp đấu, xem bảng điểm 2 phe.
  - `FactionDuelStudentView.tsx`: Màn hình 15s chọn đối thủ (với phe thắng) / chờ bị chọn (với phe thua), màn hình thi đấu 1v1 đồng loạt.
  - `FactionDuelProjectorView.tsx`: Toàn cảnh chiến trường Xanh - Đỏ, thanh kéo co % điểm, tia sét ghép cặp đối đầu.
- Tích hợp hệ thống:
  - Đăng ký vào Activity Registry tại `packages/server/src/registry.ts`.
  - Tích hợp vào Game Hub và danh bạ tiện ích của Teacher UI.
  - Cấu hình trao thưởng EXP theo chuẩn D8 (Team bonus + MVP cá nhân).

### Ngoài phạm vi (Out-of-Scope):

- Không thay đổi cấu trúc bảng cơ sở dữ liệu (`packages/db`).
- Không can thiệp vào các hoạt động khác.
