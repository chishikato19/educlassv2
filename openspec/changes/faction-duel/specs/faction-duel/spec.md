# Đặc Tả Yêu Cầu: Đại Chiến Xanh Đỏ Theo Elo (Faction Duel)

## 1. Yêu cầu Khởi tạo & Phân Đội (Team Formation)

### 1.1 Cân bằng Elo 2 Phe

- **GIAO THỨC**: Khi giáo viên bắt đầu hoạt động, hệ thống tiếp nhận danh sách học sinh tham gia (`participants`).
- **THUẬT TOÁN**: Gọi hàm `balanceTwoTeamsByElo(candidates, { balanceMethod: 'elo', jitter: true })` từ `@educlass/core/src/elo`.
- **KẾT QUẢ**:
  - Phân bổ học sinh vào 2 phe: `teamBlue` và `teamRed`.
  - Tính điểm Elo trung bình mỗi phe: `blueAvgElo` và `redAvgElo`.
  - Đảm bảo chênh lệch Elo giữa 2 đội là nhỏ nhất có thể.

### 1.2 Xử lý Sĩ số Lẻ (Odd Count & Clone)

- **ĐIỀU KIỆN**: Nếu số lượng thành viên giữa 2 đội chênh lệch (ví dụ 1 phe $N$ người, 1 phe $N+1$ người):
  - Hệ thống chọn **ngẫu nhiên** 1 học sinh bên phe ít người hơn để gán nhãn `isClone: true` cho lượt đấu đó.
  - Mỗi lượt đấu mới sẽ chọn lại người clone ngẫu nhiên khác nhau để đảm bảo công bằng.
  - Học sinh được clone chỉ làm bài 1 lần duy nhất trên máy của mình. Kết quả làm bài sẽ được đưa vào 2 cặp đấu riêng biệt với 2 thành viên của phe đối phương.

---

## 2. Quy trình Ghép Cặp (Pairing & Drafting Phase)

### 2.1 Lượt 1 (Mở màn)

- Hệ thống ghép cặp ngẫu nhiên hoàn toàn 1-1 giữa các thành viên của `teamBlue` và `teamRed`.
- Nếu có học sinh clone, học sinh đó được ghép với 2 người bên phe đông hơn.

### 2.2 Lượt 2 trở đi: Pha Chọn Đấu Thủ 15 Giây (15s Pick Phase)

- **XÁC ĐỊNH PHE ƯU TIÊN**:
  - So sánh tổng điểm tích lũy: Đội có tổng điểm cao hơn là **Phe Thắng (Attacking Team)**.
  - Nếu hòa điểm: Hệ thống tung đồng xu hoặc bốc thăm ngẫu nhiên một phe được quyền chọn trước.
- **HỌC SINH PHE THẮNG**:
  - Màn hình hiển thị danh sách thành viên phe thua dạng lưới thẻ bài.
  - Mỗi thẻ hiển thị: Tên học sinh, điểm Elo/Hạng, nhãn điểm thưởng (+1, +2, +3đ).
  - Có thể bấm chọn bất kỳ đối thủ nào chưa bị chọn và chưa từng đấu trước đó.
  - Khi bấm chọn, hệ thống gửi intent `select_opponent`.
- **KHÓA MỤC TIÊU (First-Come First-Served Lock)**:
  - Khi đối thủ $T$ được chọn bởi học sinh $S$, hệ thống lập tức khóa đối thủ $T$ (`isClaimed: true`).
  - Toàn bộ các học sinh khác phe thắng thấy thẻ của $T$ chuyển sang trạng thái đã bị chiếm.
- **QUY TẮC KHÔNG LẶP LẠI (No Repeat Rule)**:
  - Người chơi $S$ không thể chọn đối thủ $T$ nếu $S$ và $T$ đã từng đấu với nhau ở các lượt trước.
  - Ngoại lệ: Chỉ cho phép chọn lại nếu tất cả các đối thủ khả dụng khác đều đã từng đấu.
- **HẾT GIỜ 15 GIÂY (Auto-Random Fallback)**:
  - Khi đồng hồ 15s kết thúc, các thành viên chưa kịp chọn hoặc chưa bị chọn sẽ được hệ thống tự động ghép ngẫu nhiên thành các cặp đấu hợp lệ.

---

## 3. Quy trình Thi Đấu Đồng Loạt (Simultaneous Duel)

### 3.1 Cấu trúc Trận đấu & Cấu Hình Câu Hỏi

- **Số câu mỗi trận (`questionsPerMatch`)**: Giáo viên có thể tùy chọn từ 1 đến 5 câu (mặc định: **2 câu**).
- **Xáo trộn ngẫu nhiên (Shuffling)**:
  - `shuffleQuestions`: Mặc định bật `true`, đảo thứ tự câu hỏi ngẫu nhiên trong mỗi trận đấu.
  - `shuffleOptions`: Mặc định bật `true`, đảo thứ tự các phương án lựa chọn (A, B, C, D) độc lập giữa các học sinh để chống nhìn trộm, tự động cập nhật lại vị trí đáp án đúng.
- **Cơ chế Xoay vòng Câu hỏi (Recycle/Loop Pool)**:
  - Nếu kho câu hỏi của giáo viên có số lượng ít hơn tổng số câu cần dùng cho các vòng đấu, hệ thống tự động xoay vòng lấy lại các câu hỏi đã xuất hiện ở các vòng trước (xáo trộn lại thứ tự) để trận đấu diễn ra liền mạch không bị ngắt quãng.
- Tất cả các cặp đấu cùng nhận chung bộ câu hỏi của lượt đó và làm bài đồng thời trên thiết bị cá nhân.
- Giao diện thi đấu hỗ trợ trắc nghiệm 4 lựa chọn (MCQ), Đúng/Sai đơn (TF) và Trả lời ngắn (Short Answer).

### 3.2 Đánh giá Kết quả Trận & Trọng số Elo

- So sánh số câu đúng giữa 2 người chơi trong cặp đấu:
  - Ai có nhiều câu đúng hơn $\rightarrow$ Thắng trận.
  - Nếu bằng số câu đúng $\rightarrow$ So sánh tổng thời gian hoàn thành (ai nhanh hơn thì thắng).
  - Nếu bằng cả thời gian (hoặc cùng sai) $\rightarrow$ Hòa trận.
- **TÍNH ĐIỂM TRẬN CÓ TRỌNG SỐ ELO**:
  - Gọi $Elo_{winner}$ và $Elo_{loser}$:
    - Nếu $Elo_{winner} - Elo_{loser} > 100$: Thắng kèo trên $\rightarrow$ **+1 điểm** cho đội thắng.
    - Nếu $|Elo_{winner} - Elo_{loser}| \le 100$: Thắng cân kèo $\rightarrow$ **+2 điểm** cho đội thắng.
    - Nếu $Elo_{loser} - Elo_{winner} > 100$: Kèo dưới lật kèo $\rightarrow$ **+3 điểm** cho đội thắng.
  - Khi hòa trận: Mỗi đội được **+0.5 điểm**.
  - Khi thua trận: **0 điểm**.
- **CỘNG DỒN ĐIỂM ĐỘI**: Tổng điểm mỗi đội là tổng điểm của tất cả các trận đấu thành viên đội đó tham gia (bao gồm cả các trận của người được clone).

---

## 4. Giao diện & Hiển Thị (UI/UX)

### 4.1 Màn hình Học sinh (Student View)

- Responsive mobile-first (360x640).
- Màn hình Pick Phase:
  - Đối với phe thắng: Danh sách đối thủ, đồng hồ đếm ngược 15s to rõ, nút chọn nhanh.
  - Đối với phe thua: Trạng thái "Đang chờ đối thủ thách đấu..." kèm đồng hồ 15s.
- Màn hình Thi đấu: 2 câu hỏi làm bài mượt mà, phản hồi lập tức.

### 4.2 Màn hình Máy Chiếu (Projector View)

- Bố cục phân đôi 2 phe Xanh - Đỏ.
- Thanh kéo co tỷ lệ điểm số ở giữa.
- Hiệu ứng tia sét / đường nối khi các cặp đấu được xác lập trong 15s Pick Phase.
- Bảng tin chiến sự hiển thị các pha "Lật Kèo Ngoạn Mục (+3đ)".

### 4.3 Màn hình Giáo viên (Teacher Panel)

- Điều khiển vòng đấu (Bắt đầu, Tạm dừng, Bỏ qua câu, Kết thúc).
- Giám sát tiến độ làm bài của tất cả các bàn đấu theo thời gian thực.
