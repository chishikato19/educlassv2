# Đề xuất: Giải Đấu Vòng Bảng & Bắt Cặp Xếp Hạng (Volleyball Tournament Cup)

## 1. Bối cảnh & Vấn đề (Context & Motivation)

Hiện tại, EduClass v2 đã có chế độ **Đấu Cờ Thụy Sỹ (`@educlass/activity-swiss-duel`)**, trong đó học sinh thi đấu 1v1 trên các bàn đấu, mỗi lượt cùng trả lời 2 câu hỏi. Tuy nhiên:

1. **Thiếu tính giai đoạn và kịch tính giải đấu**: Thể thức Thụy Sỹ chỉ tích lũy điểm dần đều qua từng vòng trên một bảng xếp hạng chung duy nhất, thiếu đi cảm giác phân đoạn rõ rệt (vượt qua vòng bảng, lọt vào vòng loại trực tiếp, cạnh tranh tranh cúp).
2. **Khó theo dõi toàn cục trong lớp học**: Khi toàn lớp 30–40 học sinh nằm chung một danh sách dài, học sinh khó hình dung đối thủ tiếp theo của mình là ai và không có mục tiêu cục bộ ngắn hạn (như "phải thắng bạn này để giành vé Nhất bảng").
3. **Mong muốn trải nghiệm giải đấu thể thao học đường**: Thể thức bóng chuyền (Volleyball Cup / Olympic) với **Vòng bảng (Pool Stage) $\rightarrow$ Bắt cặp xếp hạng theo tầng (Placement Brackets)** là mô hình hoàn hảo nhất cho giáo dục:
   - Học sinh được chia vào các bảng nhỏ 4 người/bảng, thi đấu vòng tròn thân thiện.
   - Giai đoạn 2 phân tầng thành 4 Cúp (Kim Cương, Vàng, Bạc, Đồng) tương ứng với vị trí đạt được: **100% học sinh đều thi đấu đến trận cuối cùng** với các đối thủ ngang trình độ, không ai bị loại sớm ra rìa.

---

## 2. Mục tiêu (Goals)

1. **Kế thừa 100% cơ chế trận đấu 2 câu hỏi**: Mỗi trận đấu trên từng bàn giữa 2 học sinh vẫn giữ nguyên quy tắc quen thuộc: cùng trả lời 2 câu hỏi, tính điểm Thắng (2đ) / Hòa (1đ) / Thua (0đ) và đếm tổng số câu đúng.
2. **Cơ chế Thích Ứng Bảng Đấu Tự Động (Adaptive Pool Algorithm)**:
   - Sĩ số từ **15 đến 23 học sinh** $\rightarrow$ Tự động kích hoạt **4 BẢNG (Pool A, B, C, D)** (mỗi bảng 4–5 em).
   - Sĩ số từ **24 đến 40 học sinh** $\rightarrow$ Tự động kích hoạt **8 BẢNG (Pool A $\rightarrow$ H)** (mỗi bảng 3–5 em).
   - Giáo viên vẫn có thể tùy chọn cố định 4 bảng hoặc 8 bảng trong modal cài đặt.
3. **Hai giai đoạn thi đấu rõ ràng & Tinh gọn thời gian (5 lượt đấu = 10 câu hỏi)**:
   - **Giai đoạn 1 (Vòng bảng)**: Đúng 3 lượt đấu vòng tròn (6 câu hỏi).
   - **Giai đoạn 2 (Bắt cặp Xếp hạng / Placement Playoffs)**: Đúng 2 lượt đấu (Bán kết + Chung kết phân nhánh) (4 câu hỏi).
   - Tổng thời lượng chơi: 10–12 phút, vừa vặn tuyệt đối trong tiết học 45 phút.
4. **Phân tầng 4 Cúp Vinh Danh (Kim Cương, Vàng, Bạc, Đồng)**:
   - Mọi học sinh đều có động lực chiến đấu đến phút chót để giành ngôi vô địch tại Cúp của mình.
5. **Giao diện Màn Chiếu (Projector View) chuyên nghiệp**:
   - Trực quan hóa bảng tổng sắp các bảng đấu và cây thi đấu (Bracket Tree) thể thao lộng lẫy.

---

## 3. Phạm vi Triển khai (Scope)

### Trong phạm vi (In-Scope):

- **Gói Activity Độc Lập Mới**: `packages/activities/volleyball-tournament` (`@educlass/activity-volleyball-tournament`).
- **Lõi Thuật toán & Schemas**:
  - `volleyball-schemas.ts`: State machine, Config, Matchup, Pool, PlacementBracket, Results.
  - `volleyball-pools.ts`: Thuật toán chia bảng, sinh lịch thi đấu vòng tròn Round-Robin, tính BXH bảng.
  - `volleyball-brackets.ts`: Thuật toán bốc thăm chéo bắt cặp phân hạng (Kim Cương, Vàng, Bạc, Đồng).
  - `volleyball-scoring.ts`: Đánh giá 2 câu hỏi trong trận, so khớp đáp án, tính thời gian và kết quả trận.
  - `volleyball-activity.ts`: Plugin hoàn chỉnh tuân thủ hợp đồng `ActivityModule<Cfg, St, Res>`.
- **Giao diện Người dùng**:
  - `VolleyballTeacherPanel.tsx`: Điều khiển luồng giải đấu, chuyển giai đoạn, giám sát bàn đấu.
  - `VolleyballStudentView.tsx`: Màn hình thi đấu 2 câu hỏi, xem BXH bảng của mình, theo dõi nhánh cúp.
  - `VolleyballProjectorView.tsx`: Màn chiếu trực tiếp chia bảng (4 hoặc 8 bảng) và cây thi đấu Bracket Playoff.
- **Tích hợp Hệ Thống**:
  - Đăng ký vào danh bạ Activity Registry tại `packages/server/src/registry.ts`.
  - Tích hợp vào Game Hub và thanh tiện ích của `apps/teacher-ui`.
  - Cấu hình phân phối EXP theo chuẩn D8 (podium Kim Cương, Vàng, Bạc, Đồng).

### Ngoài phạm vi (Out-of-Scope):

- Không thay đổi kiến trúc cơ sở dữ liệu cốt lõi (`packages/db`) hay thay đổi giao thức nền tảng Fastify/WS.
- Không áp dụng cho thi đấu tổ đội trên cùng 1 máy (đã có tính năng ghép máy chung xử lý ở tầng ngoài).
