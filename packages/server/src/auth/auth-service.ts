import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterTeacherRequest,
  TeacherPublicProfile,
  UserDto,
} from '@educlass/protocol';
import type { UserRepository, UserSelect } from '@educlass/db';
import { AuthError } from './auth-error.js';
import type { PasswordHasher } from './password-hasher.js';
import type { TokenService } from './token-service.js';

export function toUserDto(user: UserSelect): UserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    subject: user.subject ?? undefined,
    avatar: user.avatar ?? undefined,
    role: user.role,
    active: Boolean(user.active),
    createdAt: user.createdAt,
  };
}

export function toTeacherPublicProfile(user: UserSelect): TeacherPublicProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    subject: user.subject ?? undefined,
    avatar: user.avatar ?? undefined,
    role: user.role,
  };
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Đăng nhập tài khoản giáo viên / quản trị viên
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.userRepo.findByUsername(request.username);
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', undefined, 401);
    }

    const isValidPassword = await this.passwordHasher.verify(request.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('INVALID_CREDENTIALS', undefined, 401);
    }

    if (!user.active) {
      throw new AuthError('ACCOUNT_LOCKED', undefined, 403);
    }

    const token = this.tokenService.createToken(user);

    return {
      token,
      user: toUserDto(user),
    };
  }

  /**
   * Xác thực và kiểm tra tính hợp lệ của phiên làm việc từ token
   */
  async validateSession(token: string): Promise<UserDto | null> {
    const payload = this.tokenService.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await this.userRepo.findById(payload.userId);
    if (!user || !user.active) {
      return null;
    }

    return toUserDto(user);
  }

  /**
   * Đổi mật khẩu cho người dùng hiện tại
   */
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', undefined, 404);
    }

    const isOldPasswordValid = await this.passwordHasher.verify(
      request.oldPassword,
      user.passwordHash
    );
    if (!isOldPasswordValid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Mật khẩu cũ không chính xác.', 400);
    }

    const newPasswordHash = await this.passwordHasher.hash(request.newPassword);
    await this.userRepo.updatePasswordHash(userId, newPasswordHash);
  }

  /**
   * Khởi tạo tài khoản quản trị viên mặc định nếu hệ thống chưa có người dùng nào
   */
  async ensureInitialAdmin(defaultPassword = 'admin123'): Promise<UserDto | null> {
    const totalUsers = await this.userRepo.countUsers();
    if (totalUsers > 0) {
      return null;
    }

    const passwordHash = await this.passwordHasher.hash(defaultPassword);
    const createdAdmin = await this.userRepo.create({
      username: 'admin',
      passwordHash,
      displayName: 'Quản trị viên',
      role: 'admin',
      active: true,
    });

    return toUserDto(createdAdmin);
  }

  /**
   * Lấy danh sách hồ sơ giáo viên đang hoạt động cho màn hình chọn tài khoản
   */
  async listActiveTeachers(): Promise<TeacherPublicProfile[]> {
    const list = await this.userRepo.listActiveTeachers();
    return list.map(toTeacherPublicProfile);
  }

  /**
   * Tự đăng ký tài khoản giáo viên mới với mã PIN mặc định 1234
   */
  async registerTeacher(request: RegisterTeacherRequest): Promise<UserDto> {
    const existing = await this.userRepo.findByUsername(request.username);
    if (existing) {
      throw new AuthError(
        'USER_ALREADY_EXISTS',
        'Tên đăng nhập này đã tồn tại, vui lòng chọn tên khác.',
        409
      );
    }

    const defaultPinHash = await this.passwordHasher.hash('1234');
    const created = await this.userRepo.create({
      username: request.username,
      displayName: request.displayName,
      subject: request.subject ?? null,
      role: 'teacher',
      passwordHash: defaultPinHash,
      active: true,
    });

    return toUserDto(created);
  }

  /**
   * Đặt lại mã PIN về mặc định 1234 (Phương án 2)
   */
  async resetPinToDefault(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'Không tìm thấy tài khoản người dùng.', 404);
    }

    const defaultPinHash = await this.passwordHasher.hash('1234');
    await this.userRepo.updatePasswordHash(userId, defaultPinHash);
  }
}
