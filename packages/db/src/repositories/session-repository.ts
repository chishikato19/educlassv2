import { and, desc, eq, inArray } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { sessions } from '../schema/index.js';

export type SessionInsert = typeof sessions.$inferInsert;
export type SessionSelect = typeof sessions.$inferSelect;

export class SessionRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một phiên học mới
   */
  async create(
    data: Omit<SessionInsert, 'id'> & { id?: string | undefined }
  ): Promise<SessionSelect> {
    const id = data.id ?? generateId();
    const insertPayload: SessionInsert = {
      ...data,
      id,
    };

    await this.db.insert(sessions).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy phiên vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm phiên học theo ID
   */
  async findById(id: string): Promise<SessionSelect | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm phiên học đang mở theo mã vào lớp 6 chữ số
   */
  async findActiveByJoinCode(joinCode: string): Promise<SessionSelect | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.joinCode, joinCode), inArray(sessions.status, ['open', 'closing'])))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm phiên học đang mở (active) của một giáo viên cụ thể
   */
  async findActiveByOwnerId(ownerId: string): Promise<SessionSelect | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.ownerId, ownerId), inArray(sessions.status, ['open', 'closing'])))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách tất cả các phiên đang mở (active) trên toàn hệ thống
   */
  async listActiveSessions(): Promise<SessionSelect[]> {
    return this.db
      .select()
      .from(sessions)
      .where(inArray(sessions.status, ['open', 'closing']))
      .orderBy(desc(sessions.openedAt));
  }

  /**
   * Lấy tập hợp tất cả các mã vào lớp đang được sử dụng bởi các phiên active
   */
  async listActiveJoinCodes(): Promise<Set<string>> {
    const active = await this.listActiveSessions();
    return new Set(active.map(s => s.joinCode));
  }

  /**
   * Lấy danh sách lịch sử các phiên của một giáo viên
   */
  async listByOwnerId(ownerId: string, limit = 50): Promise<SessionSelect[]> {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.ownerId, ownerId))
      .orderBy(desc(sessions.openedAt))
      .limit(limit);
  }

  /**
   * Cập nhật trạng thái của phiên (ví dụ: closing, closed)
   */
  async updateStatus(
    id: string,
    status: 'open' | 'closing' | 'closed',
    closedAt?: number
  ): Promise<SessionSelect> {
    const updateValues: Partial<SessionInsert> = { status };
    if (closedAt !== undefined) {
      updateValues.closedAt = closedAt;
    }

    await this.db.update(sessions).set(updateValues).where(eq(sessions.id, id));
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Không tìm thấy phiên có id ${id} để cập nhật trạng thái.`);
    }
    return updated;
  }

  /**
   * Cập nhật lớp học (classId) cho phiên
   */
  async updateClassId(id: string, classId: string): Promise<SessionSelect> {
    await this.db.update(sessions).set({ classId }).where(eq(sessions.id, id));
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Không tìm thấy phiên có id ${id} để cập nhật classId.`);
    }
    return updated;
  }
}
