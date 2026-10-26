/**
 * Kiểm tra xem một mã vào lớp có hợp lệ không (đúng 6 chữ số)
 */
export function isValidJoinCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Sinh mã vào lớp 6 chữ số ngẫu nhiên (từ 100000 đến 999999).
 * Đảm bảo không trùng với các mã đang được dùng trong `existingCodes`.
 * 
 * @param existingCodes Tập hợp các mã đang được sử dụng bởi các phiên mở khác
 * @param rng Hàm sinh số ngẫu nhiên [0, 1), mặc định là Math.random
 */
export function generateJoinCode(
  existingCodes?: ReadonlySet<string> | Set<string>,
  rng: () => number = Math.random
): string {
  const maxAttempts = 10000;
  for (let i = 0; i < maxAttempts; i++) {
    // Sinh số nguyên ngẫu nhiên từ 100000 đến 999999
    const num = Math.floor(rng() * 900000) + 100000;
    const code = num.toString();
    if (!existingCodes || !existingCodes.has(code)) {
      return code;
    }
  }

  // Trường hợp hiếm hoi cạn kiệt không gian số ngẫu nhiên
  throw new Error('Không thể sinh mã vào lớp duy nhất sau nhiều lần thử.');
}
