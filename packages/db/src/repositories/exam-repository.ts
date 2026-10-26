import { and, desc, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { exams, type ExamInsert, type ExamSelect } from '../schema/index.js';

export interface ExamFilter {
  ownerId?: string | undefined;
  classId?: string | undefined;
  status?: ExamSelect['status'] | undefined;
}

export class ExamRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi kỳ thi mới
   */
  async create(
    data: Omit<ExamInsert, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string | undefined;
      createdAt?: number | undefined;
      updatedAt?: number | undefined;
    }
  ): Promise<ExamSelect> {
    const now = Date.now();
    const id = data.id ?? generateId();
    const insertPayload: ExamInsert = {
      ...data,
      id,
      currentBatch: data.currentBatch ?? 1,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    await this.db.insert(exams).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy kỳ thi vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm kỳ thi theo ID
   */
  async findById(id: string): Promise<ExamSelect | null> {
    const res = await this.db.select().from(exams).where(eq(exams.id, id)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Tìm kỳ thi đang gắn với một phiên học (activeSessionId)
   */
  async findBySessionId(sessionId: string): Promise<ExamSelect | null> {
    const res = await this.db
      .select()
      .from(exams)
      .where(eq(exams.activeSessionId, sessionId))
      .limit(1);
    return res[0] ?? null;
  }

  /**
   * Lấy danh sách kỳ thi theo bộ lọc
   */
  async list(filter?: ExamFilter): Promise<ExamSelect[]> {
    const conditions = [];

    if (filter?.ownerId) {
      conditions.push(eq(exams.ownerId, filter.ownerId));
    }
    if (filter?.classId) {
      conditions.push(eq(exams.classId, filter.classId));
    }
    if (filter?.status) {
      conditions.push(eq(exams.status, filter.status));
    }

    const query = conditions.length > 0
      ? this.db.select().from(exams).where(and(...conditions))
      : this.db.select().from(exams);

    return query.orderBy(desc(exams.createdAt));
  }

  /**
   * Cập nhật thông tin kỳ thi
   */
  async update(
    id: string,
    data: Partial<Omit<ExamInsert, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ExamSelect | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updatePayload: Partial<ExamInsert> = {
      ...data,
      updatedAt: Date.now(),
    };

    await this.db.update(exams).set(updatePayload).where(eq(exams.id, id));
    return this.findById(id);
  }

  /**
   * Gắn kỳ thi vào một phiên học và chuyển sang trạng thái in_progress
   */
  async attachSession(
    id: string,
    sessionId: string,
    batchIndex?: number
  ): Promise<ExamSelect | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const nextBatch = batchIndex ?? existing.currentBatch;
    return this.update(id, {
      activeSessionId: sessionId,
      status: 'in_progress',
      currentBatch: nextBatch,
    });
  }

  /**
   * Tạm dừng hoặc ngắt phiên khỏi kỳ thi
   */
  async detachSession(
    id: string,
    newStatus: ExamSelect['status'] = 'waiting_next_batch'
  ): Promise<ExamSelect | null> {
    return this.update(id, {
      activeSessionId: null,
      status: newStatus,
    });
  }

  /**
   * Xóa kỳ thi
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }
    await this.db.delete(exams).where(eq(exams.id, id));
    return true;
  }
}
