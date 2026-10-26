import { z } from 'zod';

/**
 * Danh sách mã lỗi chuẩn trong giao thức EduClass v2
 */
export const ERROR_CODES = {
  BAD_CODE: 'BAD_CODE',
  SESSION_CLOSED: 'SESSION_CLOSED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  NAME_TAKEN: 'NAME_TAKEN',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_PIN: 'INVALID_PIN',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  ACTIVITY_NOT_RUNNING: 'ACTIVITY_NOT_RUNNING',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  CANNOT_LOCK_LAST_ADMIN: 'CANNOT_LOCK_LAST_ADMIN',
  CANNOT_LOCK_SELF: 'CANNOT_LOCK_SELF',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  STUDENT_ALREADY_EXISTS: 'STUDENT_ALREADY_EXISTS',
  TEACHER_ALREADY_HAS_ACTIVE_SESSION: 'TEACHER_ALREADY_HAS_ACTIVE_SESSION',
  ROSTER_REQUIRED_FOR_ROSTER_MODE: 'ROSTER_REQUIRED_FOR_ROSTER_MODE',
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  QUESTION_SET_NOT_FOUND: 'QUESTION_SET_NOT_FOUND',
  CHAT_LOCKED: 'CHAT_LOCKED',
  EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
  ALREADY_SUBMITTED: 'ALREADY_SUBMITTED',
  BANK_QUESTION_NOT_FOUND: 'BANK_QUESTION_NOT_FOUND',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
} as const;

export const ErrorCodeSchema = z.enum([
  'BAD_CODE',
  'SESSION_CLOSED',
  'SESSION_NOT_FOUND',
  'NAME_TAKEN',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'INVALID_PAYLOAD',
  'INVALID_PIN',
  'STUDENT_NOT_FOUND',
  'ACTIVITY_NOT_RUNNING',
  'INTERNAL_ERROR',
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'USER_NOT_FOUND',
  'USER_ALREADY_EXISTS',
  'CANNOT_LOCK_LAST_ADMIN',
  'CANNOT_LOCK_SELF',
  'CLASS_NOT_FOUND',
  'STUDENT_ALREADY_EXISTS',
  'TEACHER_ALREADY_HAS_ACTIVE_SESSION',
  'ROSTER_REQUIRED_FOR_ROSTER_MODE',
  'PARTICIPANT_NOT_FOUND',
  'QUESTION_SET_NOT_FOUND',
  'CHAT_LOCKED',
  'EXAM_NOT_FOUND',
  'ALREADY_SUBMITTED',
  'BANK_QUESTION_NOT_FOUND',
  'GROUP_NOT_FOUND',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Thông điệp lỗi tiếng Việt thân thiện mặc định theo PLAN 7.2
 */
export const ERROR_MESSAGES_VI: Record<ErrorCode, string> = {
  BAD_CODE: 'Mã vào lớp không đúng hoặc phiên chưa được mở.',
  SESSION_CLOSED: 'Phiên học đã kết thúc.',
  SESSION_NOT_FOUND: 'Không tìm thấy phiên học tương ứng.',
  NAME_TAKEN: 'Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô.',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  INVALID_PAYLOAD: 'Dữ liệu gửi lên không đúng định dạng quy định.',
  INVALID_PIN: 'Mã PIN không chính xác. Vui lòng thử lại.',
  STUDENT_NOT_FOUND: 'Không tìm thấy thông tin học sinh trong danh sách lớp.',
  ACTIVITY_NOT_RUNNING: 'Hoạt động hiện không trong trạng thái đang diễn ra.',
  INTERNAL_ERROR: 'Đã xảy ra lỗi máy chủ. Vui lòng thông báo cho thầy/cô.',
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
  USER_NOT_FOUND: 'Không tìm thấy người dùng này trong hệ thống.',
  USER_ALREADY_EXISTS: 'Tên đăng nhập đã tồn tại trong hệ thống.',
  CANNOT_LOCK_LAST_ADMIN: 'Không thể khóa tài khoản quản trị viên duy nhất trong hệ thống.',
  CANNOT_LOCK_SELF: 'Bạn không thể tự khóa tài khoản của chính mình.',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp học tương ứng.',
  STUDENT_ALREADY_EXISTS: 'Học sinh với mã này đã tồn tại trong lớp.',
  TEACHER_ALREADY_HAS_ACTIVE_SESSION:
    'Thầy/cô đang có một phiên học khác đang mở. Vui lòng đóng phiên cũ trước khi mở phiên mới.',
  ROSTER_REQUIRED_FOR_ROSTER_MODE:
    'Chế độ bắt buộc chọn tên yêu cầu phải chọn một lớp học.',
  PARTICIPANT_NOT_FOUND: 'Không tìm thấy người tham gia phiên học tương ứng.',
  QUESTION_SET_NOT_FOUND: 'Không tìm thấy bộ câu hỏi tương ứng.',
  CHAT_LOCKED: 'Thầy/cô đã tạm khóa tính năng trò chuyện trong phiên học.',
  EXAM_NOT_FOUND: 'Không tìm thấy kỳ thi tương ứng.',
  ALREADY_SUBMITTED:
    'Học sinh này đã hoàn thành bài thi ở ca trước và không thể tham gia làm bài lại.',
  BANK_QUESTION_NOT_FOUND: 'Không tìm thấy câu hỏi trong ngân hàng câu hỏi.',
  GROUP_NOT_FOUND: 'Không tìm thấy nhóm học sinh tương ứng.',
};

/**
 * Schema payload mô tả lỗi trả về qua WebSocket hoặc REST
 */
export const ProtocolErrorPayloadSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ProtocolErrorPayload = z.infer<typeof ProtocolErrorPayloadSchema>;

/**
 * Tạo nhanh payload lỗi với thông điệp tiếng Việt mặc định hoặc tùy chỉnh
 */
export function formatProtocolError(
  code: ErrorCode,
  customMessage?: string,
  details?: unknown
): ProtocolErrorPayload {
  return {
    code,
    message: customMessage ?? ERROR_MESSAGES_VI[code],
    ...(details !== undefined ? { details } : {}),
  };
}
