import { eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { classes } from '../schema/index.js';

export type ClassInsert = typeof classes.$inferInsert;
export type ClassSelect = typeof classes.$inferSelect;

export interface UpdateClassData {
  name?: string | undefined;
  year?: number | undefined;
}

export class ClassRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một lớp học mới
   */
  async create(
    data: Omit<ClassInsert, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
  ): Promise<ClassSelect> {
    const id = data.id ?? generateId();
    const createdAt = data.createdAt ?? Date.now();

    const insertPayload: ClassInsert = {
      ...data,
      id,
      createdAt,
    };

    await this.db.insert(classes).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy lớp học vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm lớp học theo ID
   */
  async findById(id: string): Promise<ClassSelect | null> {
    const result = await this.db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách lớp học, hỗ trợ lọc theo ownerId (giáo viên sở hữu)
   */
  async list(filter?: { ownerId?: string }): Promise<ClassSelect[]> {
    if (filter?.ownerId) {
      return this.db.select().from(classes).where(eq(classes.ownerId, filter.ownerId));
    }
    return this.db.select().from(classes);
  }

  /**
   * Cập nhật thông tin lớp học (tên, năm học)
   */
  async update(id: string, data: UpdateClassData): Promise<ClassSelect | null> {
    const valuesToUpdate: { name?: string; year?: number } = {};
    if (data.name !== undefined) {
      valuesToUpdate.name = data.name;
    }
    if (data.year !== undefined) {
      valuesToUpdate.year = data.year;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      await this.db.update(classes).set(valuesToUpdate).where(eq(classes.id, id));
    }
    return this.findById(id);
  }

  /**
   * Xóa lớp học theo ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.delete(classes).where(eq(classes.id, id));
    return (result.changes ?? 0) > 0;
  }
}
