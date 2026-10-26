import type {
  AdminCreateUserRequest,
  AdminResetPasswordRequest,
  AdminUpdateUserStatusRequest,
  UserDto,
} from '@educlass/protocol';
import type { UserRepository } from '@educlass/db';
import { AuthError } from './auth-error.js';
import { toUserDto } from './auth-service.js';
import type { PasswordHasher } from './password-hasher.js';

export class AdminService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  /**
   * Lấy danh sách toàn bộ người dùng trong hệ thống
   */
  async listUsers(): Promise<UserDto[]> {
    const allUsers = await this.userRepo.listAll();
    return allUsers.map(toUserDto);
  }

  /**
   * Tạo tài khoản giáo viên hoặc quản trị viên mới
   */
  async createUser(request: AdminCreateUserRequest): Promise<UserDto> {
    const existing = await this.userRepo.findByUsername(request.username);
    if (existing) {
      throw new AuthError('USER_ALREADY_EXISTS', undefined, 409);
    }

    const passwordHash = await this.passwordHasher.hash(request.password);
    const created = await this.userRepo.create({
      username: request.username,
      passwordHash,
      displayName: request.displayName,
      role: request.role,
      active: true,
    });

    return toUserDto(created);
  }

  /**
   * Khóa hoặc kích hoạt tài khoản người dùng
   */
  async updateUserStatus(
    targetUserId: string,
    request: AdminUpdateUserStatusRequest,
    requestingAdminId: string
  ): Promise<UserDto> {
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new AuthError('USER_NOT_FOUND', undefined, 404);
    }

    // Không được tự khóa tài khoản của chính mình
    if (targetUserId === requestingAdminId && !request.active) {
      throw new AuthError('CANNOT_LOCK_SELF', undefined, 400);
    }

    // Nếu khóa một admin, bảo đảm còn ít nhất một admin hoạt động khác
    if (targetUser.role === 'admin' && !request.active) {
      const activeAdminsCount = await this.userRepo.countAdmins(true);
      if (activeAdminsCount <= 1) {
        throw new AuthError('CANNOT_LOCK_LAST_ADMIN', undefined, 400);
      }
    }

    const updated = await this.userRepo.updateActive(targetUserId, request.active);
    if (!updated) {
      throw new AuthError('USER_NOT_FOUND', undefined, 404);
    }

    return toUserDto(updated);
  }

  /**
   * Quản trị viên đặt lại mật khẩu cho tài khoản người dùng
   */
  async resetUserPassword(
    targetUserId: string,
    request: AdminResetPasswordRequest
  ): Promise<void> {
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new AuthError('USER_NOT_FOUND', undefined, 404);
    }

    const newPasswordHash = await this.passwordHasher.hash(request.newPassword);
    await this.userRepo.updatePasswordHash(targetUserId, newPasswordHash);
  }
}
