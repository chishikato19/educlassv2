import { and, desc, eq, inArray } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import {
  activityResults,
  activityRuns,
  type ActivityResultSelect,
  type ActivityRunSelect,
} from '../schema/index.js';

export interface CreateActivityRunParams {
  id?: string;
  sessionId: string;
  activityId: string;
  configJson: string;
  status?: 'ready' | 'running' | 'ended';
  startedAt?: number;
}

export interface SaveActivityResultParams {
  id?: string;
  participantId: string;
  scoreJson: string;
  rank?: number | null;
}

export class ActivityRunRepository {
  constructor(private db: EduClassDatabase) {}

  /**
   * Tạo lượt chạy Activity mới
   */
  async createRun(params: CreateActivityRunParams): Promise<ActivityRunSelect> {
    const id = params.id ?? generateId();
    const startedAt = params.startedAt ?? Date.now();
    const status = params.status ?? 'running';

    const [created] = await this.db
      .insert(activityRuns)
      .values({
        id,
        sessionId: params.sessionId,
        activityId: params.activityId,
        configJson: params.configJson,
        status,
        startedAt,
        endedAt: null,
      })
      .returning();

    return created!;
  }

  /**
   * Tìm lượt chạy theo ID
   */
  async findRunById(id: string): Promise<ActivityRunSelect | null> {
    const [run] = await this.db.select().from(activityRuns).where(eq(activityRuns.id, id)).limit(1);

    return run ?? null;
  }

  /**
   * Tìm lượt chạy đang mở (ready hoặc running) của một phiên
   */
  async findActiveRunBySessionId(sessionId: string): Promise<ActivityRunSelect | null> {
    const [run] = await this.db
      .select()
      .from(activityRuns)
      .where(
        and(
          eq(activityRuns.sessionId, sessionId),
          inArray(activityRuns.status, ['ready', 'running'])
        )
      )
      .orderBy(desc(activityRuns.startedAt))
      .limit(1);

    return run ?? null;
  }

  /**
   * Lấy danh sách tất cả các lượt chạy trong một phiên học
   */
  async listRunsBySessionId(sessionId: string): Promise<ActivityRunSelect[]> {
    return this.db
      .select()
      .from(activityRuns)
      .where(eq(activityRuns.sessionId, sessionId))
      .orderBy(activityRuns.startedAt);
  }

  /**
   * Cập nhật trạng thái lượt chạy
   */
  async updateRunStatus(
    id: string,
    status: 'ready' | 'running' | 'ended',
    endedAt?: number
  ): Promise<ActivityRunSelect | null> {
    const [updated] = await this.db
      .update(activityRuns)
      .set({
        status,
        ...(endedAt !== undefined ? { endedAt } : {}),
      })
      .where(eq(activityRuns.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Lưu snapshot kết quả bất biến của người tham gia
   */
  async saveResults(
    runId: string,
    results: SaveActivityResultParams[]
  ): Promise<ActivityResultSelect[]> {
    if (results.length === 0) return [];

    const rows = results.map(r => ({
      id: r.id ?? generateId(),
      runId,
      participantId: r.participantId,
      scoreJson: r.scoreJson,
      rank: r.rank ?? null,
    }));

    return this.db.insert(activityResults).values(rows).returning();
  }

  /**
   * Lấy danh sách kết quả của một lượt chạy
   */
  async findResultsByRunId(runId: string): Promise<ActivityResultSelect[]> {
    return this.db.select().from(activityResults).where(eq(activityResults.runId, runId));
  }
}
