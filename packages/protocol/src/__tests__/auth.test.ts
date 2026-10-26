import { describe, expect, it } from 'vitest';
import {
  AdminCreateUserRequestSchema,
  AdminResetPasswordRequestSchema,
  AdminUpdateUserStatusRequestSchema,
  ChangePasswordRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  UserDtoSchema,
} from '../auth.js';

describe('Auth Protocol Schemas', () => {
  it('validates UserDto correctly', () => {
    const valid = {
      id: '01HR0000000000000000000000',
      username: 'teacher_mai',
      displayName: 'Cô Mai',
      role: 'teacher',
      active: true,
      createdAt: 1710000000000,
    };
    const parsed = UserDtoSchema.parse(valid);
    expect(parsed.username).toBe('teacher_mai');
    expect(parsed.role).toBe('teacher');

    expect(() =>
      UserDtoSchema.parse({
        ...valid,
        role: 'superadmin', // Invalid role
      })
    ).toThrow();
  });

  it('validates LoginRequest and trims username', () => {
    const valid = {
      username: '  teacher_lan  ',
      password: 'password123',
    };
    const parsed = LoginRequestSchema.parse(valid);
    expect(parsed.username).toBe('teacher_lan');
    expect(parsed.password).toBe('password123');

    expect(() => LoginRequestSchema.parse({ username: '', password: '123' })).toThrow();
    expect(() => LoginRequestSchema.parse({ username: 'lan', password: '' })).toThrow();
  });

  it('validates LoginResponse structure', () => {
    const valid = {
      token: 'jwt-or-bearer-token-string',
      user: {
        id: '01HR0000000000000000000000',
        username: 'admin',
        displayName: 'Quản trị viên',
        role: 'admin',
        active: true,
        createdAt: 1710000000000,
      },
    };
    const parsed = LoginResponseSchema.parse(valid);
    expect(parsed.token).toBe('jwt-or-bearer-token-string');
    expect(parsed.user.role).toBe('admin');
  });

  it('validates ChangePasswordRequest requiring min 4 chars for new password', () => {
    const valid = {
      oldPassword: 'oldSecretPassword',
      newPassword: 'newStrongPassword123',
    };
    expect(ChangePasswordRequestSchema.parse(valid)).toEqual(valid);

    expect(() =>
      ChangePasswordRequestSchema.parse({
        oldPassword: 'old',
        newPassword: '123', // < 4 chars
      })
    ).toThrow();
  });

  it('validates AdminCreateUserRequest rules', () => {
    const valid = {
      username: 'gv_toan_01',
      password: 'password123',
      displayName: 'Thầy Toán',
      role: 'teacher',
    };
    const parsed = AdminCreateUserRequestSchema.parse(valid);
    expect(parsed.username).toBe('gv_toan_01');

    // Username chứa ký tự không hợp lệ như khoảng trắng
    expect(() =>
      AdminCreateUserRequestSchema.parse({
        ...valid,
        username: 'gv toan',
      })
    ).toThrow();

    // Mật khẩu quá ngắn
    expect(() =>
      AdminCreateUserRequestSchema.parse({
        ...valid,
        password: '123',
      })
    ).toThrow();
  });

  it('validates AdminUpdateUserStatusRequest and AdminResetPasswordRequest', () => {
    expect(AdminUpdateUserStatusRequestSchema.parse({ active: false })).toEqual({ active: false });
    expect(AdminResetPasswordRequestSchema.parse({ newPassword: 'newPassword99' })).toEqual({
      newPassword: 'newPassword99',
    });

    expect(() => AdminResetPasswordRequestSchema.parse({ newPassword: 'short' })).toThrow();
  });
});
