import { and, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { participants } from '../schema/index.js';

export type ParticipantInsert = typeof participants.$inferInsert;
export type ParticipantSelect = typeof participants.$inferSelect;

export class ParticipantRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi người tham gia phiên học mới
   */
  async create(
    data: Omit<ParticipantInsert, 'id'> & { id?: string | undefined }
  ): Promise<ParticipantSelect> {
    const id = data.id ?? generateId();
    const insertPayload: ParticipantInsert = {
      ...data,
      id,
    };

    await this.db.insert(participants).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy participant vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm người tham gia theo ID
   */
  async findById(id: string): Promise<ParticipantSelect | null> {
    const result = await this.db
      .select()
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Lấy danh sách tất cả người tham gia trong một phiên
   */
  async listBySessionId(sessionId: string): Promise<ParticipantSelect[]> {
    return this.db.select().from(participants).where(eq(participants.sessionId, sessionId));
  }

  /**
   * Tìm người tham gia theo sessionId và studentId
   */
  async findBySessionAndStudentId(
    sessionId: string,
    studentId: string
  ): Promise<ParticipantSelect | null> {
    const result = await this.db
      .select()
      .from(participants)
      .where(and(eq(participants.sessionId, sessionId), eq(participants.studentId, studentId)))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Tìm người tham gia theo sessionId và displayName
   */
  async findBySessionAndDisplayName(
    sessionId: string,
    displayName: string
  ): Promise<ParticipantSelect | null> {
    const result = await this.db
      .select()
      .from(participants)
      .where(and(eq(participants.sessionId, sessionId), eq(participants.displayName, displayName)))
      .limit(1);
    return result[0] ?? null;
  }

  /**
   * Cập nhật trạng thái online/offline của người tham gia
   */
  async updateStatus(
    id: string,
    status: 'online' | 'offline',
    leftAt?: number
  ): Promise<ParticipantSelect> {
    const updateValues: Partial<ParticipantInsert> = { status };
    if (leftAt !== undefined) {
      updateValues.leftAt = leftAt;
    }

    await this.db.update(participants).set(updateValues).where(eq(participants.id, id));
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Không tìm thấy participant có id: ${id}`);
    }
    return updated;
  }

  /**
   * Lấy danh sách người tham gia đang online trong một phiên
   */
  async findOnlineBySessionId(sessionId: string): Promise<ParticipantSelect[]> {
    return this.db
      .select()
      .from(participants)
      .where(and(eq(participants.sessionId, sessionId), eq(participants.status, 'online')));
  }

  /**
   * Đánh dấu toàn bộ người tham gia trong phiên về trạng thái offline khi kết thúc phiên (D10)
   */
  async markAllOfflineBySessionId(sessionId: string, leftAt: number = Date.now()): Promise<void> {
    await this.db
      .update(participants)
      .set({ status: 'offline', leftAt })
      .where(and(eq(participants.sessionId, sessionId), eq(participants.status, 'online')));
  }

  /**
   * Cập nhật thông tin người tham gia
   */
  async update(
    id: string,
    data: Partial<Omit<ParticipantInsert, 'id' | 'sessionId'>>
  ): Promise<ParticipantSelect> {
    await this.db.update(participants).set(data).where(eq(participants.id, id));
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Không tìm thấy participant có id: ${id}`);
    }
    return updated;
  }

  /**
   * Cập nhật đội / nhóm của người tham gia
   */
  async updateTeam(id: string, teamId: string | null): Promise<ParticipantSelect> {
    await this.db.update(participants).set({ teamId }).where(eq(participants.id, id));
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Không tìm thấy participant có id: ${id}`);
    }
    return updated;
  }

  /**
   * Trích xuất danh sách tất cả các studentId gắn với participant (hỗ trợ cả ghép đôi/nhóm)
   */
  static getStudentIds(participant: ParticipantSelect): string[] {
    if (participant.studentIdsJson) {
      try {
        const parsed = JSON.parse(participant.studentIdsJson);
        if (Array.isArray(parsed)) {
          const list = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
          if (list.length > 0) return list;
        }
      } catch {
        // Fallback xuống studentId đơn
      }
    }
    return participant.studentId ? [participant.studentId] : [];
  }

  /**
   * Trích xuất danh sách studentId từ bản ghi participant
   */
  getStudentIds(participant: ParticipantSelect): string[] {
    return ParticipantRepository.getStudentIds(participant);
  }

  /**
   * Tìm người tham gia trong phiên có chứa bất kỳ học sinh nào trong danh sách
   */
  async findBySessionAndAnyStudentId(
    sessionId: string,
    studentIds: string[]
  ): Promise<ParticipantSelect | null> {
    if (studentIds.length === 0) return null;
    const targetSet = new Set(studentIds);
    const sessionParticipants = await this.listBySessionId(sessionId);

    for (const p of sessionParticipants) {
      const pStudentIds = this.getStudentIds(p);
      if (pStudentIds.some(id => targetSet.has(id))) {
        return p;
      }
    }
    return null;
  }

  /**
   * Tìm người tham gia ĐANG ONLINE trong phiên có chứa bất kỳ học sinh nào trong danh sách
   */
  async findOnlineBySessionAndAnyStudentId(
    sessionId: string,
    studentIds: string[]
  ): Promise<ParticipantSelect | null> {
    if (studentIds.length === 0) return null;
    const targetSet = new Set(studentIds);
    const onlineParticipants = await this.findOnlineBySessionId(sessionId);

    for (const p of onlineParticipants) {
      const pStudentIds = this.getStudentIds(p);
      if (pStudentIds.some(id => targetSet.has(id))) {
        return p;
      }
    }
    return null;
  }
}

