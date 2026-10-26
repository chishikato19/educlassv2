import { and, desc, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import {
  rewardLog,
  rewardRules,
  students,
  type RewardRuleInsert,
  type RewardRuleSelect,
} from '../schema/index.js';

export type RewardLogInsert = typeof rewardLog.$inferInsert;
export type RewardLogSelect = typeof rewardLog.$inferSelect;


export interface StudentRewardUpdate {
  studentId: string;
  exp: number;
  level: number;
}

export class RewardRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi nhật ký thưởng
   */
  async createLog(
    data: Omit<RewardLogInsert, 'id'> & { id?: string | undefined }
  ): Promise<RewardLogSelect> {
    const id = data.id ?? generateId();
    const insertPayload: RewardLogInsert = {
      ...data,
      id,
    };
    await this.db.insert(rewardLog).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không tìm thấy reward_log vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm bản ghi nhật ký thưởng theo ID
   */
  async findById(id: string): Promise<RewardLogSelect | null> {
    const res = await this.db.select().from(rewardLog).where(eq(rewardLog.id, id)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Lấy danh sách nhật ký thưởng trong một phiên học
   */
  async listBySessionId(sessionId: string): Promise<RewardLogSelect[]> {
    return this.db
      .select()
      .from(rewardLog)
      .where(eq(rewardLog.sessionId, sessionId))
      .orderBy(desc(rewardLog.ts));
  }

  /**
   * Lấy lịch sử thưởng của một học sinh
   */
  async listByStudentId(studentId: string): Promise<RewardLogSelect[]> {
    return this.db
      .select()
      .from(rewardLog)
      .where(eq(rewardLog.studentId, studentId))
      .orderBy(desc(rewardLog.ts));
  }

  /**
   * Lấy lịch sử thưởng của một người tham gia (participant)
   */
  async listByParticipantId(participantId: string): Promise<RewardLogSelect[]> {
    return this.db
      .select()
      .from(rewardLog)
      .where(eq(rewardLog.participantId, participantId))
      .orderBy(desc(rewardLog.ts));
  }

  /**
   * Thực hiện lưu nhật ký thưởng và cập nhật EXP / Level của học sinh
   * trong CÙNG MỘT TRANSACTION nguyên tử (Atomic) theo PLAN mục 6 & AGENTS.md
   */
  async recordRewardTransaction(data: {
    rewardLog: Omit<RewardLogInsert, 'id'> & { id?: string | undefined };
    studentUpdate?: StudentRewardUpdate | undefined;
  }): Promise<RewardLogSelect> {
    const logId = data.rewardLog.id ?? generateId();
    const logPayload: RewardLogInsert = {
      ...data.rewardLog,
      id: logId,
    };

    this.db.transaction((tx) => {
      tx.insert(rewardLog).values(logPayload).run();
      if (data.studentUpdate) {
        tx.update(students)
          .set({
            exp: data.studentUpdate.exp,
            level: data.studentUpdate.level,
          })
          .where(eq(students.id, data.studentUpdate.studentId))
          .run();
      }
    });

    const created = await this.findById(logId);
    if (!created) {
      throw new Error(`Không thể tìm thấy reward_log sau transaction: ${logId}`);
    }
    return created;
  }

  /**
   * Lấy danh sách quy tắc thưởng theo bộ lọc
   */
  async listRules(filter?: {
    ownerId?: string | null | undefined;
    scope?: 'global' | 'teacher' | undefined;
  }): Promise<RewardRuleSelect[]> {
    if (filter?.scope && filter.ownerId !== undefined) {
      if (filter.ownerId === null) {
        return this.db
          .select()
          .from(rewardRules)
          .where(and(eq(rewardRules.scope, filter.scope)));
      }
      return this.db
        .select()
        .from(rewardRules)
        .where(and(eq(rewardRules.scope, filter.scope), eq(rewardRules.ownerId, filter.ownerId)));
    }
    if (filter?.scope) {
      return this.db.select().from(rewardRules).where(eq(rewardRules.scope, filter.scope));
    }
    if (filter?.ownerId) {
      return this.db.select().from(rewardRules).where(eq(rewardRules.ownerId, filter.ownerId));
    }
    return this.db.select().from(rewardRules);
  }

  /**
   * Lấy danh sách quy tắc thưởng mặc định toàn cục
   */
  async getGlobalRules(): Promise<RewardRuleSelect[]> {
    return this.db.select().from(rewardRules).where(eq(rewardRules.scope, 'global'));
  }

  /**
   * Lấy danh sách quy tắc thưởng riêng của giáo viên
   */
  async getTeacherRules(teacherId: string): Promise<RewardRuleSelect[]> {
    return this.db
      .select()
      .from(rewardRules)
      .where(and(eq(rewardRules.scope, 'teacher'), eq(rewardRules.ownerId, teacherId)));
  }

  /**
   * Lưu toàn bộ danh sách quy tắc thưởng của giáo viên trong 1 transaction nguyên tử
   */
  async setTeacherRules(
    teacherId: string,
    rules: Array<{
      activityId?: string | null | undefined;
      trigger: string;
      exp: number;
      enabled?: boolean | undefined;
    }>
  ): Promise<RewardRuleSelect[]> {
    this.db.transaction((tx) => {
      // 1. Xóa các quy tắc cũ của giáo viên này
      tx.delete(rewardRules).where(eq(rewardRules.ownerId, teacherId)).run();

      // 2. Chèn danh sách quy tắc mới
      for (const r of rules) {
        const payload: RewardRuleInsert = {
          id: generateId(),
          ownerId: teacherId,
          scope: 'teacher',
          activityId: r.activityId ?? null,
          trigger: r.trigger,
          exp: r.exp,
          enabled: r.enabled ?? true,
        };
        tx.insert(rewardRules).values(payload).run();
      }
    });

    return this.getTeacherRules(teacherId);
  }

  /**
   * Khôi phục cài đặt EXP của giáo viên về mặc định (xóa toàn bộ quy tắc riêng của GV)
   */
  async resetTeacherRules(teacherId: string): Promise<void> {
    this.db.delete(rewardRules).where(eq(rewardRules.ownerId, teacherId)).run();
  }

  /**
   * Khởi tạo các quy tắc thưởng toàn cục nếu chưa tồn tại
   */
  async seedGlobalRules(
    defaults: ReadonlyArray<{
      activityId?: string | null | undefined;
      trigger: string;
      exp: number;
      enabled?: boolean | undefined;
    }>
  ): Promise<RewardRuleSelect[]> {
    const existing = await this.getGlobalRules();
    if (existing.length > 0) {
      return existing;
    }

    this.db.transaction((tx) => {
      for (const d of defaults) {
        const payload: RewardRuleInsert = {
          id: generateId(),
          ownerId: null,
          scope: 'global',
          activityId: d.activityId ?? null,
          trigger: d.trigger,
          exp: d.exp,
          enabled: d.enabled ?? true,
        };
        tx.insert(rewardRules).values(payload).run();
      }
    });

    return this.getGlobalRules();
  }

  /**
   * Tính tổng EXP mà một người tham gia (participant) đã nhận trong phiên và trong activity
   */
  async getParticipantExpTotals(
    sessionId: string,
    participantId: string,
    activityId?: string | null | undefined
  ): Promise<{ sessionExp: number; activityExp: number }> {
    const logs = await this.db
      .select()
      .from(rewardLog)
      .where(and(eq(rewardLog.sessionId, sessionId), eq(rewardLog.participantId, participantId)));

    let sessionExp = 0;
    let activityExp = 0;

    for (const log of logs) {
      sessionExp += log.exp;
      if (activityId && log.reason.toLowerCase().includes(activityId.toLowerCase())) {
        activityExp += log.exp;
      }
    }

    return { sessionExp, activityExp };
  }
}

