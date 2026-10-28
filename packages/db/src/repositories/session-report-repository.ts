import { desc, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { sessionReports, sessions } from '../schema/index.js';

export type SessionReportInsert = typeof sessionReports.$inferInsert;
export type SessionReportSelect = typeof sessionReports.$inferSelect;

export interface SessionReportWithSession {
  id: string;
  sessionId: string;
  snapshotJson: string;
  createdAt: number;
  sessionJoinCode: string;
  sessionOpenedAt: number;
  sessionClosedAt: number | null;
  classId: string | null;
}

export class SessionReportRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi báo cáo snapshot tổng kết phiên
   */
  async create(
    data: Omit<SessionReportInsert, 'id'> & { id?: string | undefined }
  ): Promise<SessionReportSelect> {
    const id = data.id ?? generateId();
    const insertPayload: SessionReportInsert = {
      ...data,
      id,
    };

    await this.db.insert(sessionReports).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy báo cáo vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm báo cáo theo ID
   */
  async findById(id: string): Promise<SessionReportSelect | null> {
    const result = await this.db
      .select()
      .from(sessionReports)
      .where(eq(sessionReports.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm báo cáo mới nhất của một phiên học theo sessionId
   */
  async findBySessionId(sessionId: string): Promise<SessionReportSelect | null> {
    const result = await this.db
      .select()
      .from(sessionReports)
      .where(eq(sessionReports.sessionId, sessionId))
      .orderBy(desc(sessionReports.createdAt))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách báo cáo các phiên của một giáo viên (sắp xếp theo thời gian mới nhất)
   */
  async listByOwnerId(ownerId: string, limit = 50): Promise<SessionReportWithSession[]> {
    const results = await this.db
      .select({
        id: sessionReports.id,
        sessionId: sessionReports.sessionId,
        snapshotJson: sessionReports.snapshotJson,
        createdAt: sessionReports.createdAt,
        sessionJoinCode: sessions.joinCode,
        sessionOpenedAt: sessions.openedAt,
        sessionClosedAt: sessions.closedAt,
        classId: sessions.classId,
      })
      .from(sessionReports)
      .innerJoin(sessions, eq(sessionReports.sessionId, sessions.id))
      .where(eq(sessions.ownerId, ownerId))
      .orderBy(desc(sessionReports.createdAt))
      .limit(limit);

    return results;
  }

  /**
   * Lấy danh sách tất cả các báo cáo phiên (dành cho Admin)
   */
  async listAll(limit = 50): Promise<SessionReportWithSession[]> {
    const results = await this.db
      .select({
        id: sessionReports.id,
        sessionId: sessionReports.sessionId,
        snapshotJson: sessionReports.snapshotJson,
        createdAt: sessionReports.createdAt,
        sessionJoinCode: sessions.joinCode,
        sessionOpenedAt: sessions.openedAt,
        sessionClosedAt: sessions.closedAt,
        classId: sessions.classId,
      })
      .from(sessionReports)
      .innerJoin(sessions, eq(sessionReports.sessionId, sessions.id))
      .orderBy(desc(sessionReports.createdAt))
      .limit(limit);

    return results;
  }
}
