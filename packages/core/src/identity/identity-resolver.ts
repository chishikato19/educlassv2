import type { IdentityLevel } from '@educlass/protocol';
import { normalizeVietnameseString } from '../students/import-parser.js';

export interface ResolveIdentityLevelParams {
  hasStudentAccount: boolean;
  hasPin: boolean;
  isPinVerified: boolean;
  isGuest: boolean;
}

/**
 * Xác định cấp bậc danh tính của học sinh theo nguyên tắc 3 cấp D6:
 * - account: có tài khoản + có PIN + xác thực PIN đúng -> LƯU EXP, danh hiệu
 * - roster: chọn tên trong danh sách nhưng không có mật khẩu/PIN -> KHÔNG lưu EXP
 * - guest: tự nhập nickname -> KHÔNG lưu EXP
 */
export function resolveIdentityLevel(params: ResolveIdentityLevelParams): IdentityLevel {
  if (params.hasStudentAccount) {
    if (params.hasPin) {
      if (params.isPinVerified) {
        return 'account';
      }
      throw new Error('Mã PIN không chính xác hoặc chưa được xác thực.');
    }
    return 'roster';
  }

  if (params.isGuest) {
    return 'guest';
  }

  return 'guest';
}

/**
 * Kiểm tra xem một tên hiển thị đã bị chiếm bởi học sinh khác đang online trong cùng phiên hay chưa (D7)
 */
export function isNameTaken(
  name: string,
  activeParticipants: ReadonlyArray<{ displayName: string; status: 'online' | 'offline' }>
): boolean {
  const normalizedTarget = normalizeVietnameseString(name).toLowerCase();
  return activeParticipants.some(
    p =>
      p.status === 'online' &&
      normalizeVietnameseString(p.displayName).toLowerCase() === normalizedTarget
  );
}
