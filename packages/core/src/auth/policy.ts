import type { UserRole } from '@educlass/protocol';

export interface AuthUserContext {
  id: string;
  role: UserRole;
}

export interface OwnableResource {
  ownerId: string;
}

/**
 * Kiểm tra xem người dùng có quyền truy cập (đọc/ghi) tài nguyên có chủ sở hữu hay không.
 * - Admin luôn có toàn quyền truy cập bất kỳ tài nguyên nào (theo D5 PLAN.md).
 * - Giáo viên (teacher) chỉ có quyền truy cập khi id của giáo viên trùng với ownerId của tài nguyên.
 */
export function hasResourceAccess(
  user: AuthUserContext,
  resource: OwnableResource
): boolean {
  if (user.role === 'admin') {
    return true;
  }
  return user.id === resource.ownerId;
}

/**
 * Xác định điều kiện lọc theo chủ sở hữu (ownerId) khi truy vấn danh sách tài nguyên.
 * - Admin không bị giới hạn (trả về undefined), xem được tất cả dữ liệu theo D5 PLAN.md.
 * - Giáo viên bị giới hạn theo user.id của chính mình.
 */
export function getOwnerFilterId(user: AuthUserContext): string | undefined {
  if (user.role === 'admin') {
    return undefined;
  }
  return user.id;
}
