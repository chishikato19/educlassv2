import { and, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { participants, teams } from '../schema/index.js';

export type TeamInsert = typeof teams.$inferInsert;
export type TeamSelect = typeof teams.$inferSelect;

export class TeamRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một đội / nhóm mới trong phiên
   */
  async create(sessionId: string, name: string): Promise<TeamSelect> {
    const id = generateId();
    await this.db.insert(teams).values({
      id,
      sessionId,
      name,
    });
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy team vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm nhóm theo id
   */
  async findById(id: string): Promise<TeamSelect | null> {
    const result = await this.db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm theo tên trong phiên hoặc tạo mới nếu chưa tồn tại
   */
  async findOrCreate(sessionId: string, name: string): Promise<TeamSelect> {
    const existing = await this.db
      .select()
      .from(teams)
      .where(and(eq(teams.sessionId, sessionId), eq(teams.name, name)))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    return this.create(sessionId, name);
  }

  /**
   * Lấy danh sách nhóm trong phiên kèm số lượng thành viên
   */
  async listBySessionId(sessionId: string): Promise<Array<TeamSelect & { memberCount: number }>> {
    const sessionTeams = await this.db.select().from(teams).where(eq(teams.sessionId, sessionId));
    const sessionParticipants = await this.db
      .select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId));

    return sessionTeams.map(team => {
      const memberCount = sessionParticipants.filter(
        p => p.teamId === team.id && p.status === 'online'
      ).length;
      return {
        ...team,
        memberCount,
      };
    });
  }
}
