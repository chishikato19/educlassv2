import { ulid } from 'ulidx';

/**
 * Sinh chuỗi định danh ULID 26 ký tự sắp xếp theo thời gian
 */
export function generateId(): string {
  return ulid();
}
