# Giao thức EduClass v2 (Protocol Specification)

## 1. Phong bì tin nhắn (Envelope)

Mọi tin nhắn trao đổi qua WebSocket hoặc REST Event stream đều bắt buộc tuân thủ cấu trúc phong bì chuẩn:

```json
{
  "v": 1,
  "id": "msg_01J9...",
  "type": "intent:join",
  "sessionId": "01J9...",
  "ts": 1728123456789,
  "payload": {}
}
```

### Các trường trong Envelope:
| Trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `v` | `1` | Có | Phiên bản giao thức, hiện tại là `1`. |
| `id` | `string` | Có | Định danh duy nhất của tin nhắn, dùng chống xử lý trùng lặp (idempotent). |
| `type` | `string` | Có | Loại tin nhắn (ví dụ `intent:join`, `state_patch`, `snapshot`, `error`). |
| `sessionId` | `string \| null` | Có | ID phiên học tương ứng (`null` khi chưa gắn phiên, ví dụ kiểm tra sức khỏe). |
| `ts` | `number` | Có | Thời gian gửi tính bằng epoch milliseconds (`Date.now()`). |
| `payload` | `any` (Zod validated) | Có | Dữ liệu nội dung chi tiết theo từng loại tin nhắn. |

---

## 2. Mã lỗi chuẩn (Error Codes)

Định nghĩa trong `packages/protocol/src/errors.ts`:

| Mã lỗi (`code`) | Mô tả & Thông điệp tiếng Việt mặc định |
|---|---|
| `BAD_CODE` | Mã vào lớp không đúng hoặc phiên chưa được mở. |
| `SESSION_CLOSED` | Phiên học đã kết thúc. |
| `SESSION_NOT_FOUND` | Không tìm thấy phiên học tương ứng. |
| `NAME_TAKEN` | Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô. |
| `FORBIDDEN` | Bạn không có quyền thực hiện hành động này. |
| `UNAUTHORIZED` | Phiên đăng nhập không hợp lệ hoặc đã hết hạn. |
| `INVALID_PAYLOAD` | Dữ liệu gửi lên không đúng định dạng quy định. |
| `INVALID_PIN` | Mã PIN không chính xác. Vui lòng thử lại. |
| `STUDENT_NOT_FOUND` | Không tìm thấy thông tin học sinh trong danh sách lớp. |
| `ACTIVITY_NOT_RUNNING` | Hoạt động hiện không trong trạng thái đang diễn ra. |
| `INTERNAL_ERROR` | Đã xảy ra lỗi máy chủ. Vui lòng thông báo cho thầy/cô. |

### Cấu trúc Payload lỗi:
```json
{
  "code": "NAME_TAKEN",
  "message": "Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô.",
  "details": {}
}
```

---

## 3. Các Enum trạng thái chuẩn

### 3.1 Vai trò người dùng (`UserRole`)
- `admin`: Quản trị viên hệ thống trường.
- `teacher`: Giáo viên.

### 3.2 Trạng thái phiên học (`SessionStatus`)
- `open`: Đang mở, học sinh có thể tham gia.
- `closing`: Đang hoàn tất, chuẩn bị kết xuất báo cáo và ghi điểm.
- `closed`: Đã đóng hoàn toàn, học sinh bị đăng xuất, token vô hiệu.

### 3.3 Chế độ danh tính phiên (`IdentityMode`)
- `roster_only`: Bắt buộc chọn từ danh sách học sinh của lớp (tên không trùng).
- `roster_or_guest`: Cho phép chọn từ danh sách hoặc tự nhập tên khách.
- `guest_only`: Toàn bộ người tham gia tự do nhập nickname khách.

### 3.4 Cấp bậc danh tính (`IdentityLevel`)
- `account`: Học sinh có tài khoản + PIN/mật khẩu -> EXP và danh hiệu được lưu vĩnh viễn vào CSDL.
- `roster`: Chọn tên trong danh sách, không có mật khẩu -> không lưu EXP vĩnh viễn.
- `guest`: Khách vãng lai tự nhập tên -> không lưu EXP vĩnh viễn.

### 3.5 Trạng thái người tham gia (`ParticipantStatus`)
- `online`: Đang kết nối mạng (nhận heartbeat đều đặn ≤ 15s).
- `offline`: Mất kết nối mạng quá 15s (dữ liệu làm bài vẫn được bảo lưu).

### 3.6 Trạng thái lượt chạy hoạt động (`ActivityRunStatus`)
- `ready`: Hoạt động đã được cấu hình, sẵn sàng bắt đầu.
- `running`: Đang diễn ra, học sinh gửi intent tương tác.
- `ended`: Hoạt động đã kết thúc, chốt kết quả và điểm thưởng.

### 3.7 Loại câu hỏi (`QuestionType`)
- `mcq4`: Trắc nghiệm 4 lựa chọn (chọn 1 đáp án đúng).
- `tf`: Đúng / Sai (1 mệnh đề).
- `tf_group`: Đúng / Sai chùm 4 ý (chuẩn Bộ Giáo Dục).
- `short`: Trả lời ngắn / điền số.

---

## 4. Giao thức Hoạt động tương tác (Activity Messages)

Định nghĩa trong `packages/protocol/src/activity.ts`:

### 4.1 WebSocket Envelope Types
| `type` | Chiều | Mô tả |
|---|---|---|
| `activity_start` | Server → Client | Báo hiệu một lượt chạy Activity mới bắt đầu (`runId`, `activityId`, `config`). |
| `activity_state` | Server → Client | Phát sóng trạng thái thời gian thực (`runId`, `activityId`, `state`, `revision`). |
| `activity_intent` | Client → Server | Học sinh hoặc Giáo viên gửi ý định hành động (`runId`, `intent`). |
| `activity_end` | Server → Client | Báo hiệu lượt chạy kết thúc kèm snapshot kết quả (`runId`, `results`, `endedAt`). |

### 4.2 REST Endpoints
- `GET /api/sessions/:id/activities`: Danh mục các hoạt động có sẵn.
- `GET /api/sessions/:id/activities/current`: Lấy lượt chạy và trạng thái hiện tại.
- `POST /api/sessions/:id/activities/start`: Giáo viên bắt đầu lượt chạy mới.
- `POST /api/sessions/:id/activities/teacher-intent`: Giáo viên gửi ý định điều khiển.
- `POST /api/sessions/:id/activities/student-intent`: Học sinh gửi ý định hành động (REST fallback).
- `POST /api/sessions/:id/activities/end`: Giáo viên kết thúc lượt chạy.

