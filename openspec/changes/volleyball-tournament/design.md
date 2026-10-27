# Thiết Kế Kỹ Thuật: Giải Đấu Vòng Bảng & Bắt Cặp Xếp Hạng (Volleyball Tournament)

## 1. Kiến Trúc Tổng Thể & Vị Trí Module

Module được tổ chức thành một Activity Plugin độc lập đặt tại `packages/activities/volleyball-tournament`:

```
packages/activities/volleyball-tournament/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                     # Entry point & export ActivityModule
    ├── volleyball-schemas.ts         # Zod schemas: Config, State, Matchup, Pool, Bracket
    ├── volleyball-pools.ts           # Thuật toán phân bảng, sinh lịch thi đấu Round-Robin
    ├── volleyball-brackets.ts        # Thuật toán bắt cặp chéo phân tầng 4 Cúp Playoff
    ├── volleyball-scoring.ts         # Đánh giá câu trả lời 2 câu, tính kết quả trận đấu
    ├── volleyball-activity.ts        # FSM Server logic (onStart, onStudentIntent, onTeacherIntent, onEnd)
    ├── components/
    │   ├── VolleyballTeacherPanel.tsx   # Giao diện điều khiển giáo viên
    │   ├── VolleyballStudentView.tsx    # Giao diện thi đấu học sinh (Mobile-first 360x640)
    │   └── VolleyballProjectorView.tsx  # Giao diện màn chiếu (Vòng bảng + Cây Playoff)
    └── __tests__/
        ├── volleyball-pools.test.ts
        ├── volleyball-brackets.test.ts
        └── volleyball-activity.test.ts
```

---

## 2. Máy Trạng Thái Hoạt Động (Finite State Machine - FSM)

```
       +-------------------------------------------------------+
       |                        LOBBY                          |
       |  (Học sinh vào phòng, GV cấu hình câu hỏi & số bảng)  |
       +-------------------------------------------------------+
                                   |
                     GV bấm "BẮT ĐẦU VÒNG BẢNG"
                                   v
       +-------------------------------------------------------+
       |                      POOL_STAGE                       |
       |  - Chia 4 hoặc 8 bảng.                                |
       |  - Lượt 1 -> Lượt 2 -> Lượt 3 (mỗi lượt 2 câu).      |
       |  - Các bàn đấu đồng thời. Tự động tính điểm & BXH.    |
       +-------------------------------------------------------+
                                   |
                       Hoàn thành Lượt 3 vòng bảng
                                   v
       +-------------------------------------------------------+
       |               POOL_STAGE_INTERMISSION                 |
       |  - Tạm dừng ngắn: xem BXH tổng kết vòng bảng.         |
       |  - GV bấm "TIẾN VÀO VÒNG BẮT CẶP XẾP HẠNG".          |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                     BRACKET_STAGE                     |
       |  - Phân tầng 4 Cúp: Kim Cương, Vàng, Bạc, Đồng.       |
       |  - Lượt 4: Bán kết phân nhánh.                       |
       |  - Lượt 5: Chung kết & Tranh hạng ba.                |
       +-------------------------------------------------------+
                                   |
                        Hoàn thành Chung kết Cúp
                                   v
       +-------------------------------------------------------+
       |                       FINISHED                        |
       |  - Vinh danh Nhà vô địch 4 Cúp.                      |
       |  - Cộng EXP thưởng theo D8 và cấp danh hiệu.          |
       +-------------------------------------------------------+
```

---

## 3. Cấu Trúc Dữ Liệu (Zod Schemas)

### 3.1 Bảng đấu & Trận đấu
```typescript
export const VolleyballMatchupSchema = z.object({
  tableNumber: z.number(),
  stage: z.enum(['pool', 'bracket']),
  poolId: z.string().optional(),          // 'A' | 'B' | ... nếu là vòng bảng
  tier: z.enum(['diamond', 'gold', 'silver', 'bronze']).optional(), // nếu là playoff
  matchType: z.enum(['round_robin', 'semi_final', 'final', 'third_place']),
  player1Id: z.string(),
  player2Id: z.string(),
  player1Score: z.number().default(0),    // Số câu đúng trong 2 câu (0, 1, 2)
  player2Score: z.number().default(0),
  player1Answered: z.boolean().default(false),
  player2Answered: z.boolean().default(false),
  player1Answers: z.record(z.unknown()).default({}),
  player2Answers: z.record(z.unknown()).default({}),
  player1TimeMs: z.number().default(0),
  player2TimeMs: z.number().default(0),
  result: z.enum(['player1_win', 'player2_win', 'draw', 'in_progress']).default('in_progress'),
});
```

### 3.2 Bảng Xếp Hạng Bảng Đấu (Pool Standings Entry)
```typescript
export const PoolStandingEntrySchema = z.object({
  rankInPool: z.number(),
  participantId: z.string(),
  displayName: z.string(),
  tournamentPoints: z.number().default(0), // Thắng: 2, Hòa: 1, Thua: 0
  matchesWon: z.number().default(0),
  matchesDrawn: z.number().default(0),
  matchesLost: z.number().default(0),
  correctCount: z.number().default(0),
  totalTimeMs: z.number().default(0),
});
```

---

## 4. Thuật Toán Bắt Cặp & Phân Nhánh (Algorithms)

### 4.1 Thuật toán Chia Bảng Thích Ứng (Adaptive Pool Assignment)
1. Kiểm tra sĩ số `N = participants.length`.
2. Nếu `config.poolMode === 'auto'`:
   - $N \le 23 \implies \text{poolCount} = 4$.
   - $N \ge 24 \implies \text{poolCount} = 8$.
3. Xáo trộn ngẫu nhiên danh sách học sinh: `shuffled = shuffle(participants)`.
4. Dàn học sinh vào các bảng theo thuật toán chia dư:
   - Học sinh thứ $i$ được xếp vào bảng `String.fromCharCode(65 + (i % poolCount))`.
   - Kết quả: Các bảng luôn có sĩ số chênh lệch tối đa 1 người (ví dụ: 18 học sinh $\implies$ 2 bảng 5 em, 2 bảng 4 em).

### 4.2 Thuật toán Sinh Lịch Vòng Tròn (Round-Robin 3 Lượt)
- Với bảng 4 người `[P1, P2, P3, P4]`:
  - Lượt 1: (P1 vs P2), (P3 vs P4)
  - Lượt 2: (P1 vs P3), (P2 vs P4)
  - Lượt 3: (P1 vs P4), (P2 vs P3)
- Với bảng 5 người: Thêm 1 suất ảo `DUMMY_BYE`. Bạn nào gặp `DUMMY_BYE` trong lượt đó sẽ nhận lượt nghỉ và được bảo lưu điểm trung bình.

### 4.3 Thuật toán Phân Tầng Bắt Cặp Playoff (4 Cúp)
Sau khi tính xong BXH vòng bảng:
- **Nhánh Kim Cương (Diamond)**: Lấy `rankInPool === 1` của tất cả các bảng.
  - Với 4 bảng (A, B, C, D):
    - Bán kết 1: `Nhất A` vs `Nhất D`
    - Bán kết 2: `Nhất B` vs `Nhất C`
    - Chung kết: `Thắng BK1` vs `Thắng BK2` (Xếp hạng 1 & 2 toàn lớp)
    - Tranh 3-4: `Thua BK1` vs `Thua BK2` (Xếp hạng 3 & 4 toàn lớp)
- **Nhánh Vàng (Gold)**: Lấy `rankInPool === 2` của tất cả các bảng.
  - Tương tự, phân định thứ hạng từ #5 đến #8 toàn lớp.
- **Nhánh Bạc (Silver)**: Lấy `rankInPool === 3` $\implies$ Phân định thứ hạng từ #9 đến #12 toàn lớp.
- **Nhánh Đồng (Bronze)**: Lấy `rankInPool === 4 & 5` $\implies$ Phân định thứ hạng từ #13 đến #16+ toàn lớp.

---

## 5. Thiết Kế Giao Diện (UI/UX)

### 5.1 Giao diện Học sinh (Student View - Mobile First 360x640)
- **Header cố định**: Tên bảng đấu của mình (`BẢNG B`), đối thủ trận hiện tại (`Đối thủ: Lê Bảo Châu`), tỷ số tạm thời.
- **Khu vực làm bài**: 2 câu hỏi cuộn nhẹ hoặc chuyển tab câu 1 / câu 2; các nút bấm lựa chọn đáp án to rõ $\ge 48\times 48\text{px}$, màu sắc tươi sáng kèm ký hiệu khối (▲, ◆, ●, ■).
- **Màn hình nghỉ giữa lượt**: Thẻ tóm tắt kết quả trận vừa đấu, BXH trực tiếp của bảng mình.

### 5.2 Giao diện Màn Chiếu (Projector View)
- **Giai đoạn Vòng bảng**:
  - Với 4 bảng: Chia 4 cột thẻ thể thao lớn (Bảng A, Bảng B, Bảng C, Bảng D) hiển thị trạng thái từng cặp đấu.
  - Với 8 bảng: Lưới 2 hàng $\times$ 4 cột kèm khung "Sân đấu tâm điểm" (Spotlight Match) phóng to trận đấu kịch tính nhất.
- **Giai đoạn Playoff (Bracket)**:
  - Hiển thị 4 cây nhánh đấu Bracket thể thao với các biểu tượng Cúp Kim Cương, Cúp Vàng, Cúp Bạc, Cúp Đồng rực rỡ.
