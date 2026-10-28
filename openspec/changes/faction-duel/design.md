# Thiết Kế Kỹ Thuật: Đại Chiến Xanh Đỏ Theo Elo (Faction Duel)

## 1. Kiến Trúc Tổng Thể & Vị Trí Module

Module được tổ chức dưới dạng Activity Plugin độc lập tuân thủ hợp đồng kiến trúc của EduClass v2:

```
packages/activities/faction-duel/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                      # Entry point & export FactionDuelActivity
    ├── faction-schemas.ts            # Zod schemas: Config, State, Matchup, PickPhase, Results
    ├── faction-draft.ts              # Thuật toán bắt cặp, 15s pick phase, khóa mục tiêu, clone
    ├── faction-scoring.ts            # Đánh giá 1v1, trọng số Elo (+1/+2/+3), điểm đội
    ├── faction-activity.ts           # Máy trạng thái Server FSM (onStart, onStudentIntent, onTeacherIntent, onEnd)
    ├── components/
    │   ├── FactionDuelTeacherPanel.tsx   # Điều khiển giáo viên & cấu hình số câu, đảo đề
    │   ├── FactionDuelStudentView.tsx    # Giao diện học sinh (Pick phase + Thi đấu 1v1)
    │   └── FactionDuelProjectorView.tsx  # Giao diện màn chiếu (Thanh kéo co Xanh - Đỏ)
    └── __tests__/
        ├── faction-draft.test.ts     # Test ghép cặp, khóa mục tiêu, clone ngẫu nhiên
        ├── faction-scoring.test.ts   # Test chấm điểm & trọng số Elo
        └── faction-activity.test.ts  # Test vòng đời FSM, xoay vòng câu hỏi
```

---

## 2. Máy Trạng Thái Hoạt Động (Finite State Machine - FSM)

```
        +-------------------------------------------------------+
        |                        LOBBY                          |
        |   - Học sinh vào phòng.                               |
        |   - GV chọn bộ câu hỏi & cấu hình số vòng đấu.        |
        +-------------------------------------------------------+
                                    │
                     GV bấm "BẮT ĐẦU ĐẠI CHIẾN"
                                    ▼
        +-------------------------------------------------------+
        |                     TEAM_REVEAL                       |
        |   - Phân chia Xanh - Đỏ theo Elo (Snake Draft).       |
        |   - Animation công bố 2 phe trên Máy chiếu (3-5s).    |
        +-------------------------------------------------------+
                                    │
                                    ▼
        +-------------------------------------------------------+
        |                      ROUND_INIT                       |
        |   - Lượt 1: Bốc thăm ngẫu nhiên 1v1.                  |
        |   - Nếu lẻ: Chọn ngẫu nhiên 1 bạn Clone song hành.    |
        +-------------------------------------------------------+
                                    │
                                    ▼
        +-------------------------------------------------------+
        |                     ROUND_ACTIVE                      |
        |   - Đồng loạt làm bài (1-2 câu hỏi).                  |
        |   - Nhận đáp án realtime từ tất cả học sinh.          |
        +-------------------------------------------------------+
                                    │
                 Tất cả hoàn thành hoặc hết thời gian
                                    ▼
        +-------------------------------------------------------+
        |                    ROUND_EVALUATION                   |
        |   - Đánh giá kết quả từng cặp đấu.                    |
        |   - Áp dụng trọng số Elo (+1/+2/+3đ) cho người thắng. |
        |   - Cập nhật thanh kéo co điểm tổng Đội Xanh - Đỏ.   |
        +-------------------------------------------------------+
                                    │
        Chưa hết số vòng            │            Đã hết số vòng
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
+-------------------------------+                       +-------------------------------+
|          PICK_PHASE           |                       |           FINISHED            |
| - Đếm ngược 15 giây.          |                       | - Vinh danh Phe Chiến Thắng!  |
| - Phe nhiều điểm hơn CHỌN     |                       | - Vinh danh MVP & Underdog.   |
|   đối thủ phe ít điểm hơn.    |                       | - Trao thưởng EXP theo D8.    |
| - Khóa mục tiêu FCFS.         |                       +-------------------------------+
| - Hết giờ: Auto-random.       |
+-------------------------------+
        │
        ▼
(Quay lại ROUND_ACTIVE cho Lượt tiếp theo)
```

---

## 3. Cấu Trúc Dữ Liệu & Zod Schemas (`faction-schemas.ts`)

```typescript
export interface FactionDuelConfig {
  totalRounds: number; // Mặc định: 5 vòng
  questionsPerMatch: number; // Tùy chọn số câu mỗi trận (1 - 5, mặc định: 2)
  shuffleQuestions: boolean; // Đảo câu hỏi (mặc định: true)
  shuffleOptions: boolean; // Đảo đáp án A, B, C, D (mặc định: true)
  allowQuestionRecycle: boolean; // Cho phép lấy lại câu cũ khi hết (mặc định: true)
  answerTimeSeconds: number; // Thời gian mỗi câu (mặc định: 20s)
  pickPhaseSeconds: number; // Thời gian chọn đối thủ (mặc định: 15s)
}

export interface FactionMember {
  participantId: string;
  displayName: string;
  elo: number;
  team: 'blue' | 'red';
  isClone?: boolean;
}

export interface FactionMatchup {
  id: string; // ID cặp đấu
  roundIndex: number;
  blueParticipantId: string;
  redParticipantId: string;
  isCloneMatch?: boolean; // Đánh dấu trận có học sinh clone

  // Trạng thái bài làm của 2 bên
  blueAnswers: Record<string, { answer: unknown; timeMs: number; isCorrect?: boolean }>;
  redAnswers: Record<string, { answer: unknown; timeMs: number; isCorrect?: boolean }>;

  // Kết quả
  status: 'pending' | 'in_progress' | 'completed';
  winner?: 'blue' | 'red' | 'draw';
  awardedPoints: { blue: number; red: number }; // Điểm sau khi nhân trọng số Elo
  isUnderdogWin?: boolean; // Đánh dấu pha lật kèo (+3đ)
}

export interface FactionDuelState {
  phase: 'lobby' | 'team_reveal' | 'round_active' | 'round_eval' | 'pick_phase' | 'finished';
  currentRound: number;
  totalRounds: number;

  teamBlue: FactionMember[];
  teamRed: FactionMember[];

  scoreBlue: number; // Tổng điểm lũy kế phe Xanh
  scoreRed: number; // Tổng điểm lũy kế phe Đỏ

  currentMatchups: FactionMatchup[];
  matchHistory: { round: number; p1: string; p2: string }[];

  // Thông tin trong pha chọn đối thủ 15 giây
  pickPhase?: {
    attackingTeam: 'blue' | 'red';
    expiresAt: number; // Timestamp hết hạn 15s
    claimedTargetIds: string[]; // Danh sách đối thủ đã bị chọn/khóa
  };

  cloneParticipantId?: string; // Người được chọn clone ngẫu nhiên ở vòng này
  questions: FactionQuestion[];
}
```

---

## 4. Thuật Toán Lõi

### 4.1 Cơ chế Phân thân khi lẻ sĩ số (`handleOddClone`)

```typescript
export function selectRandomClone(
  smallerTeam: FactionMember[],
  previousClones: string[],
  rng: () => number
): FactionMember {
  // Ưu tiên chọn những bạn chưa từng được làm clone ở các vòng trước
  const eligible = smallerTeam.filter(m => !previousClones.includes(m.participantId));
  const pool = eligible.length > 0 ? eligible : smallerTeam;
  const chosenIndex = Math.floor(rng() * pool.length);
  return pool[chosenIndex]!;
}
```

### 4.2 Tính điểm Trọng số Elo (`calculateEloWeightedPoints`)

```typescript
export function calculateMatchPoints(
  winnerElo: number,
  loserElo: number,
  isDraw: boolean
): { winnerPoints: number; loserPoints: number; isUnderdog: boolean } {
  if (isDraw) {
    return { winnerPoints: 0.5, loserPoints: 0.5, isUnderdog: false };
  }

  const eloDiff = winnerElo - loserElo;
  if (eloDiff < -100) {
    // Kèo dưới thắng người hơn mình > 100 Elo
    return { winnerPoints: 3.0, loserPoints: 0.0, isUnderdog: true };
  } else if (eloDiff <= 100) {
    // Cân kèo trong biên độ 100 điểm Elo
    return { winnerPoints: 2.0, loserPoints: 0.0, isUnderdog: false };
  } else {
    // Kèo trên thắng người kém mình > 100 Elo
    return { winnerPoints: 1.0, loserPoints: 0.0, isUnderdog: false };
  }
}
```

### 4.3 Xử lý Khóa Mục Tiêu & Fallback 15s (`resolvePickPhase`)

- Khi người chơi phe thắng bấm chọn: Xác thực (1) mục tiêu chưa bị ai khóa, (2) chưa từng đấu trước đó.
- Nếu hợp lệ: Cập nhật `claimedTargetIds.push(targetId)` và tạo ngay cặp đấu `FactionMatchup`.
- Khi hết 15s: Lọc danh sách những bạn chưa ghép đôi, gọi hàm shuffle ngẫu nhiên ghép cặp tự động.

### 4.4 Thuật toán Lấy Câu Hỏi & Xoay Vòng Tái Sử Dụng (`getQuestionsForRound`)

```typescript
export function getQuestionsForRound(
  pool: FactionQuestion[],
  roundIndex: number,
  countPerMatch: number,
  options: { shuffleQuestions?: boolean; allowRecycle?: boolean; rng?: () => number }
): FactionQuestion[] {
  if (pool.length === 0) return [];
  const needed = countPerMatch;
  const questions: FactionQuestion[] = [];

  for (let i = 0; i < needed; i++) {
    const rawIdx = roundIndex * countPerMatch + i;
    const finalIdx =
      options.allowRecycle !== false ? rawIdx % pool.length : Math.min(rawIdx, pool.length - 1);
    questions.push(pool[finalIdx]!);
  }

  return options.shuffleQuestions ? shuffleList(questions, options.rng) : questions;
}
```

---

## 5. Thiết Kế Giao Diện Người Dùng (UI/UX)

1. **Student View (Mobile 360x640):**
   - Vòng chọn đối thủ (15s): Thẻ bài viền sáng, huy hiệu sao/elo, nút "Thách Đấu" to rõ ($\ge 48\text{px}$). Thẻ nào bị bạn khác chọn sẽ có animation mờ và đóng dấu "ĐÃ CÓ ĐỐI THỦ".
   - Vòng thi đấu: Tương tự Swiss Duel nhưng có huy hiệu màu phe (Xanh hoặc Đỏ) trên góc màn hình.
2. **Projector View (Màn Chiếu Lớp Học):**
   - Bố cục 2 phe hoành tráng: Xanh (Băng giá) vs Đỏ (Hỏa diệm).
   - Thanh kéo co Tug-of-War ở vị trí trung tâm, rung chuyển khi có điểm số mới.
   - Chiến sự rực lửa: Hiển thị popup hiệu ứng "LẬT KÈO NGOẠN MỤC: +3 ĐIỂM!".
3. **Teacher Panel:**
   - Bảng giám sát tổng quan trạng thái tất cả các bàn đấu.
   - Nút can thiệp nhanh: Bỏ qua 15s để vào đấu ngay, Kết thúc sớm trận đấu.
