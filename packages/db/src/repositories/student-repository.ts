import { and, count, eq, isNull } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { students } from '../schema/index.js';

export type StudentInsert = typeof students.$inferInsert;
export type StudentSelect = typeof students.$inferSelect;

export interface UpdateStudentData {
  fullName?: string | undefined;
  code?: string | null | undefined;
  passwordHash?: string | null | undefined;
  academicPerformance?: 'tot' | 'kha' | 'dat' | 'chua_dat' | undefined;
  groupId?: string | null | undefined;
  elo?: number | undefined;
}

export class StudentRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một học sinh mới trong lớp
   */
  async create(
    data: Omit<StudentInsert, 'id' | 'createdAt' | 'exp' | 'level'> & {
      id?: string;
      createdAt?: number;
      exp?: number;
      level?: number;
    }
  ): Promise<StudentSelect> {
    const id = data.id ?? generateId();
    const createdAt = data.createdAt ?? Date.now();
    const exp = data.exp ?? 0;
    const level = data.level ?? 1;

    const insertPayload: StudentInsert = {
      ...data,
      id,
      createdAt,
      exp,
      level,
    };

    await this.db.insert(students).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy học sinh vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tạo nhiều học sinh cùng lúc (batch insert)
   */
  async createMany(
    items: Array<
      Omit<StudentInsert, 'id' | 'createdAt' | 'exp' | 'level'> & {
        id?: string;
        createdAt?: number;
        exp?: number;
        level?: number;
      }
    >
  ): Promise<StudentSelect[]> {
    if (items.length === 0) {
      return [];
    }

    const now = Date.now();
    const payloads: StudentInsert[] = items.map((item) => ({
      ...item,
      id: item.id ?? generateId(),
      createdAt: item.createdAt ?? now,
      exp: item.exp ?? 0,
      level: item.level ?? 1,
    }));

    await this.db.insert(students).values(payloads);

    const insertedIds = payloads.map((p) => p.id);
    const result: StudentSelect[] = [];
    for (const id of insertedIds) {
      const s = await this.findById(id);
      if (s) {
        result.push(s);
      }
    }
    return result;
  }

  /**
   * Tìm học sinh theo ID
   */
  async findById(id: string): Promise<StudentSelect | null> {
    const result = await this.db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách học sinh theo lớp
   */
  async listByClassId(classId: string): Promise<StudentSelect[]> {
    return this.db.select().from(students).where(eq(students.classId, classId));
  }

  /**
   * Đếm tổng số học sinh trong một lớp
   */
  async countByClassId(classId: string): Promise<number> {
    const result = await this.db
      .select({ total: count() })
      .from(students)
      .where(eq(students.classId, classId));
    return result[0]?.total ?? 0;
  }

  /**
   * Cập nhật thông tin học sinh
   */
  async update(id: string, data: UpdateStudentData): Promise<StudentSelect | null> {
    const valuesToUpdate: {
      fullName?: string;
      code?: string | null;
      passwordHash?: string | null;
      academicPerformance?: 'tot' | 'kha' | 'dat' | 'chua_dat';
      groupId?: string | null;
    } = {};
    if (data.fullName !== undefined) {
      valuesToUpdate.fullName = data.fullName;
    }
    if (data.code !== undefined) {
      valuesToUpdate.code = data.code;
    }
    if (data.passwordHash !== undefined) {
      valuesToUpdate.passwordHash = data.passwordHash;
    }
    if (data.academicPerformance !== undefined) {
      valuesToUpdate.academicPerformance = data.academicPerformance;
    }
    if (data.groupId !== undefined) {
      valuesToUpdate.groupId = data.groupId;
    }
    if (data.elo !== undefined) {
      (valuesToUpdate as Record<string, unknown>).elo = data.elo;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      await this.db.update(students).set(valuesToUpdate).where(eq(students.id, id));
    }
    return this.findById(id);
  }

  /**
   * Cập nhật điểm Elo ẩn cho học sinh
   */
  async updateElo(id: string, elo: number): Promise<StudentSelect | null> {
    await this.db.update(students).set({ elo }).where(eq(students.id, id));
    return this.findById(id);
  }

  /**
   * Cập nhật hàng loạt điểm Elo cho nhiều học sinh
   */
  async updateEloBatch(updates: Array<{ id: string; elo: number }>): Promise<void> {
    for (const u of updates) {
      await this.db.update(students).set({ elo: u.elo }).where(eq(students.id, u.id));
    }
  }

  /**
   * Lấy danh sách học sinh theo nhóm trong lớp
   */
  async listByGroupId(groupId: string): Promise<StudentSelect[]> {
    return this.db.select().from(students).where(eq(students.groupId, groupId));
  }

  /**
   * Lấy danh sách học sinh chưa phân nhóm trong lớp
   */
  async listUnassignedByClassId(classId: string): Promise<StudentSelect[]> {
    return this.db
      .select()
      .from(students)
      .where(and(eq(students.classId, classId), isNull(students.groupId)));
  }

  /**
   * Đặt hoặc xóa mã PIN của học sinh
   */
  async updatePin(id: string, passwordHash: string | null): Promise<StudentSelect | null> {
    await this.db.update(students).set({ passwordHash }).where(eq(students.id, id));
    return this.findById(id);
  }

  /**
   * Cập nhật cấu hình Avatar / Trang phục của học sinh
   */
  async updateAvatar(id: string, avatarJson: string): Promise<StudentSelect | null> {
    await this.db.update(students).set({ avatarJson }).where(eq(students.id, id));
    return this.findById(id);
  }

  /**
   * Xóa một học sinh theo ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.delete(students).where(eq(students.id, id));
    return (result.changes ?? 0) > 0;
  }

  /**
   * Xóa toàn bộ học sinh trong một lớp
   */
  async deleteByClassId(classId: string): Promise<number> {
    const result = await this.db.delete(students).where(eq(students.classId, classId));
    return result.changes ?? 0;
  }
}
