import { and, count, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { users } from '../schema/index.js';

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;

export class UserRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo tài khoản người dùng mới (tự động sinh id ULID nếu chưa có)
   */
  async create(
    data: Omit<UserInsert, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
  ): Promise<UserSelect> {
    const id = data.id ?? generateId();
    const createdAt = data.createdAt ?? Date.now();

    const insertPayload: UserInsert = {
      ...data,
      id,
      createdAt,
    };

    await this.db.insert(users).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy user vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm người dùng theo ID
   */
  async findById(id: string): Promise<UserSelect | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm người dùng theo username
   */
  async findByUsername(username: string): Promise<UserSelect | null> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy toàn bộ danh sách người dùng
   */
  async listAll(): Promise<UserSelect[]> {
    return this.db.select().from(users);
  }

  /**
   * Lấy danh sách giáo viên đang hoạt động (cho màn hình chọn hồ sơ đăng nhập)
   */
  async listActiveTeachers(): Promise<UserSelect[]> {
    return this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'teacher'), eq(users.active, true)));
  }

  /**
   * Cập nhật tên hiển thị
   */
  async updateDisplayName(id: string, displayName: string): Promise<UserSelect | null> {
    await this.db.update(users).set({ displayName }).where(eq(users.id, id));
    return this.findById(id);
  }

  /**
   * Cập nhật mật khẩu băm
   */
  async updatePasswordHash(id: string, passwordHash: string): Promise<UserSelect | null> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
    return this.findById(id);
  }

  /**
   * Khóa hoặc kích hoạt tài khoản
   */
  async updateActive(id: string, active: boolean): Promise<UserSelect | null> {
    await this.db.update(users).set({ active }).where(eq(users.id, id));
    return this.findById(id);
  }

  /**
   * Đếm số lượng tài khoản quản trị viên (admin)
   */
  async countAdmins(activeOnly = true): Promise<number> {
    const condition = activeOnly
      ? and(eq(users.role, 'admin'), eq(users.active, true))
      : eq(users.role, 'admin');

    const result = await this.db.select({ total: count() }).from(users).where(condition);
    return result[0]?.total ?? 0;
  }

  /**
   * Đếm tổng số lượng người dùng
   */
  async countUsers(): Promise<number> {
    const result = await this.db.select({ total: count() }).from(users);
    return result[0]?.total ?? 0;
  }

  /**
   * Xóa tài khoản theo ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id));
    return (result.changes ?? 0) > 0;
  }
}

