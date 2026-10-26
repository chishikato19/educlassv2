import { and, eq } from 'drizzle-orm';
import {
  DEFAULT_TITLES,
  evaluateStudentTitleRules,
} from '@educlass/core';
import type { StudentGamificationStats, TitleDto } from '@educlass/protocol';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import {
  studentTitles,
  titles,
  type StudentTitleSelect,
  type TitleInsert,
  type TitleSelect,
} from '../schema/index.js';

export class TitleRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Khởi tạo danh mục các danh hiệu mặc định vào CSDL nếu chưa tồn tại
   */
  async seedDefaultTitles(): Promise<TitleSelect[]> {
    const existing = await this.listAllTitles();
    const existingKeys = new Set(existing.map(t => t.key));

    const toInsert: TitleInsert[] = [];
    for (const def of DEFAULT_TITLES) {
      if (!existingKeys.has(def.key)) {
        toInsert.push({
          id: generateId(),
          key: def.key,
          name: def.name,
          iconKey: def.iconKey,
          ruleJson: JSON.stringify(def.rule),
        });
      }
    }

    if (toInsert.length > 0) {
      this.db.transaction((tx) => {
        for (const item of toInsert) {
          tx.insert(titles).values(item).run();
        }
      });
    }

    return this.listAllTitles();
  }

  /**
   * Lấy toàn bộ danh sách danh hiệu trong hệ thống
   */
  async listAllTitles(): Promise<TitleSelect[]> {
    return this.db.select().from(titles);
  }

  /**
   * Tìm danh hiệu theo key định danh duy nhất
   */
  async findByKey(key: string): Promise<TitleSelect | null> {
    const res = await this.db.select().from(titles).where(eq(titles.key, key)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Lấy danh sách danh hiệu mà học sinh đã được cấp
   */
  async getStudentTitles(studentId: string): Promise<Array<TitleSelect & { awardedAt: number; sessionId?: string | null }>> {
    const records = await this.db
      .select({
        id: titles.id,
        key: titles.key,
        name: titles.name,
        iconKey: titles.iconKey,
        ruleJson: titles.ruleJson,
        awardedAt: studentTitles.awardedAt,
        sessionId: studentTitles.sessionId,
      })
      .from(studentTitles)
      .innerJoin(titles, eq(studentTitles.titleId, titles.id))
      .where(eq(studentTitles.studentId, studentId));

    return records;
  }

  /**
   * Lấy tất cả danh hiệu được cấp trong một phiên học cụ thể (Task 5.4)
   */
  async getTitlesAwardedInSession(sessionId: string): Promise<
    Array<{
      studentId: string;
      titleId: string;
      titleKey: string;
      titleName: string;
      iconKey: string;
      awardedAt: number;
    }>
  > {
    const records = await this.db
      .select({
        studentId: studentTitles.studentId,
        titleId: titles.id,
        titleKey: titles.key,
        titleName: titles.name,
        iconKey: titles.iconKey,
        awardedAt: studentTitles.awardedAt,
      })
      .from(studentTitles)
      .innerJoin(titles, eq(studentTitles.titleId, titles.id))
      .where(eq(studentTitles.sessionId, sessionId));

    return records;
  }

  /**
   * Trao danh hiệu cho học sinh (idempotent: nếu đã có thì bỏ qua)
   */
  async awardTitle(
    studentId: string,
    titleId: string,
    sessionId?: string | null | undefined
  ): Promise<StudentTitleSelect | null> {
    const existing = await this.db
      .select()
      .from(studentTitles)
      .where(and(eq(studentTitles.studentId, studentId), eq(studentTitles.titleId, titleId)))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const id = generateId();
    const now = Date.now();
    await this.db.insert(studentTitles).values({
      id,
      studentId,
      titleId,
      awardedAt: now,
      sessionId: sessionId ?? null,
    });

    const created = await this.db
      .select()
      .from(studentTitles)
      .where(eq(studentTitles.id, id))
      .limit(1);

    return created[0] ?? null;
  }

  /**
   * Tự động đánh giá các luật danh hiệu và trao danh hiệu mới cho học sinh
   * Trả về danh sách các danh hiệu mới được cấp
   */
  async evaluateAndAwardTitles(
    studentId: string,
    stats: StudentGamificationStats,
    sessionId?: string | null | undefined
  ): Promise<TitleDto[]> {
    await this.seedDefaultTitles();
    const allTitles = await this.listAllTitles();
    const currentStudentTitles = await this.getStudentTitles(studentId);
    const ownedKeys = new Set(currentStudentTitles.map(t => t.key));

    const parsedTitles: TitleDto[] = allTitles.map(t => ({
      id: t.id,
      key: t.key,
      name: t.name,
      iconKey: t.iconKey,
      rule: JSON.parse(t.ruleJson) as TitleDto['rule'],
    }));

    const eligibleKeys = evaluateStudentTitleRules(stats, parsedTitles);
    const newAwarded: TitleDto[] = [];

    for (const key of eligibleKeys) {
      if (!ownedKeys.has(key)) {
        const titleEntity = allTitles.find(t => t.key === key);
        if (titleEntity) {
          await this.awardTitle(studentId, titleEntity.id, sessionId);
          const parsed = parsedTitles.find(t => t.key === key);
          if (parsed) {
            newAwarded.push({
              ...parsed,
              awardedAt: Date.now(),
              isUnlocked: true,
            });
          }
        }
      }
    }

    return newAwarded;
  }
}
