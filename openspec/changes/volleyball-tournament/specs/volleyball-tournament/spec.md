# Đặc tả Kỹ thuật: Giải Đấu Vòng Bảng & Bắt Cặp Xếp Hạng (Volleyball Tournament)

## 1. Cấu hình Hoạt động (Activity Configuration)

- **RQ-01.1 (Bộ câu hỏi)**: Giáo viên nạp danh sách tối thiểu 10 câu hỏi (`mcq4`, `tf`, `short`). Mỗi câu có thời gian giới hạn (mặc định 30s).
- **RQ-01.2 (Chế độ bảng đấu)**: Cấu hình `poolMode`:
  - `'auto'` (mặc định): Tự động chọn 4 bảng nếu $\le 23$ học sinh; chọn 8 bảng nếu $\ge 24$ học sinh.
  - `'4_pools'`: Bắt buộc chia 4 bảng (Pool A, B, C, D).
  - `'8_pools'`: Bắt buộc chia 8 bảng (Pool A $\rightarrow$ H).
- **RQ-01.3 (Tùy chọn xáo trộn)**: Hỗ trợ `shuffleQuestions` (đảo thứ tự câu hỏi qua các vòng) và `shuffleOptions` (đảo vị trí A, B, C, D độc lập).

---

## 2. Phân Bảng & Lịch Thi Đấu Vòng Bảng (Pool Stage)

- **RQ-02.1 (Phân bổ học sinh)**: Hệ thống xáo trộn ngẫu nhiên danh sách học sinh có mặt và phân bổ đều vào các bảng. Chênh lệch số lượng giữa bảng đông nhất và bảng ít nhất không quá 1 học sinh.
- **RQ-02.2 (Lịch thi đấu Vòng tròn 3 Lượt)**:
  - Với bảng 4 học sinh: Sinh sẵn lịch thi đấu 3 lượt (Round 1, Round 2, Round 3), mỗi bạn thi đấu đúng 3 trận với 3 bạn còn lại trong bảng.
  - Với bảng 3 hoặc 5 học sinh: Xử lý suất nghỉ (BYE) hoặc bắt cặp sao cho mỗi học sinh thi đấu số trận tương đương.
- **RQ-02.3 (Thi đấu song song)**: Trong mỗi lượt đấu, toàn bộ các cặp đấu ở tất cả các bảng diễn ra đồng thời trên các bàn thi đấu độc lập.

---

## 3. Cơ Chế Trận Đấu (Match Execution)

- **RQ-03.1 (2 câu hỏi mỗi trận)**: Mỗi trận đấu gồm đúng 2 câu hỏi. Hai học sinh trong bàn cùng làm đồng thời.
- **RQ-03.2 (Cách tính điểm trận)**:
  - Thắng: Điểm trận = 2 (khi số câu đúng $Score_1 > Score_2$).
  - Hòa: Điểm trận = 1 (khi số câu đúng $Score_1 = Score_2$).
  - Thua: Điểm trận = 0 (khi số câu đúng $Score_1 < Score_2$).
- **RQ-03.3 (Dữ liệu trận đấu)**: Ghi nhận trạng thái trả lời, đáp án lựa chọn, thời gian bấm đáp án (ms) của từng học sinh để phục vụ phân định thứ hạng khi bằng điểm.

---

## 4. Xếp Hạng Vòng Bảng (Pool Standings & Tie-breakers)

- **RQ-04.1 (Tiêu chí xếp hạng nội bộ bảng)**: Khi kết thúc 3 lượt đấu vòng bảng, học sinh trong từng bảng được xếp hạng theo thứ tự ưu tiên:
  1. Tổng điểm trận đấu (`tournamentPoints`) giảm dần.
  2. Tổng số câu trả lời đúng (`correctCount`) giảm dần.
  3. Kết quả đối đầu trực tiếp (`headToHeadWins`) giữa các bạn bằng điểm.
  4. Tổng thời gian trả lời (`totalTimeMs`) tăng dần (ai nhanh hơn xếp trên).
- **RQ-04.2 (Phân loại thứ bậc)**: Xác định rõ thứ bậc của từng bạn trong bảng: Hạng 1 (Nhất bảng), Hạng 2 (Nhì bảng), Hạng 3 (Ba bảng), Hạng 4 (Tư bảng).

---

## 5. Bắt Cặp Phân Tầng Xếp Hạng (Placement Brackets)

- **RQ-05.1 (Khởi tạo 4 Cúp Phân Tầng)**:
  - **Cúp Kim Cương (Diamond Tier)**: Gồm các bạn HẠNG 1 của tất cả các bảng $\rightarrow$ Tranh ngôi Vô địch toàn lớp.
  - **Cúp Vàng (Gold Tier)**: Gồm các bạn HẠNG 2 của tất cả các bảng $\rightarrow$ Tranh phân hạng top 2.
  - **Cúp Bạc (Silver Tier)**: Gồm các bạn HẠNG 3 của tất cả các bảng $\rightarrow$ Tranh phân hạng top 3.
  - **Cúp Đồng (Bronze Tier)**: Gồm các bạn HẠNG 4 (và Hạng 5 nếu có) $\rightarrow$ Tranh phân hạng khuyến khích.
- **RQ-05.2 (Tiến trình Nhánh Đấu Playoff - 2 Lượt)**:
  - **Lượt 1 (Bán kết phân nhánh)**:
    - Với 4 bảng: Nhất A gặp Nhất D; Nhất B gặp Nhất C (áp dụng tương tự cho các cúp khác).
  - **Lượt 2 (Chung kết & Tranh hạng ba)**:
    - 2 bạn thắng Bán kết gặp nhau tranh ngôi Quán quân của Cúp đó.
    - 2 bạn thua Bán kết gặp nhau tranh vị trí tiếp theo.
- **RQ-05.3 (Xác định Thứ hạng Tuyệt đối Toàn lớp)**:
  - Thứ hạng cuối cùng từ #1 đến #N được ánh xạ chính xác từ kết quả trận Chung kết/Tranh hạng 3 của từng nhánh Cúp.

---

## 6. Giao Diện & Vinh Danh (UI/UX & Rewards)

- **RQ-06.1 (Màn hình Học sinh)**:
  - Hiển thị thông tin bảng đấu của mình, đối thủ hiện tại, 2 câu hỏi làm bài với nút bấm $\ge 48\times 48\text{px}$.
  - Giữa các lượt: Xem được bảng điểm của bảng mình và đối thủ trận kế tiếp.
  - Vòng xếp hạng: Hiển thị huy hiệu Cúp đang tranh tài.
- **RQ-06.2 (Màn hình Máy chiếu)**:
  - Vòng bảng: Cột bảng A, B, C, D (với 4 bảng) hoặc Grid 2x4 (với 8 bảng) hiển thị trực tiếp điểm số các bàn.
  - Vòng xếp hạng: Cây thi đấu Bracket thể thao với hiệu ứng trực quan sinh động.
- **RQ-06.3 (EXP & Thưởng chuẩn D8)**:
  - Vô địch Cúp Kim Cương (Quán quân toàn lớp): +60 EXP.
  - Á quân Kim Cương: +45 EXP; Hạng ba Kim Cương: +35 EXP.
  - Vô địch Cúp Vàng (Hạng 5 toàn lớp): +30 EXP.
  - Vô địch Cúp Bạc: +25 EXP; Vô địch Cúp Đồng: +20 EXP.
  - Thưởng trận thắng: +5 EXP mỗi trận thắng; Đúng mỗi câu: +2 EXP.
