import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import {
  bankQuestions,
  type BankQuestionInsert,
  type BankQuestionSelect,
} from '../schema/index.js';

export interface BankQuestionFilter {
  ownerId?: string | undefined;
  grade?: number | undefined;
  subject?: string | undefined;
  chapter?: string | undefined;
  lesson?: string | undefined;
  difficulty?: BankQuestionSelect['difficulty'] | undefined;
  type?: BankQuestionSelect['type'] | undefined;
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface BankCurriculumTreeResult {
  chapter: string;
  lessons: Array<{
    lesson: string;
    totalQuestions: number;
    countsByDifficulty: {
      nb: number;
      th: number;
      vd: number;
      vdc: number;
    };
  }>;
  totalQuestions: number;
}

export class BankQuestionRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo một câu hỏi mới trong ngân hàng
   */
  async create(
    data: Omit<BankQuestionInsert, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string | undefined;
      createdAt?: number | undefined;
      updatedAt?: number | undefined;
    },
  ): Promise<BankQuestionSelect> {
    const now = Date.now();
    const id = data.id ?? generateId();
    const insertPayload: BankQuestionInsert = {
      ...data,
      id,
      points: data.points ?? 10,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    await this.db.insert(bankQuestions).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy câu hỏi ngân hàng vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tạo nhiều câu hỏi cùng lúc (phục vụ import Word)
   */
  async createMany(
    items: Array<
      Omit<BankQuestionInsert, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string | undefined;
        createdAt?: number | undefined;
        updatedAt?: number | undefined;
      }
    >,
  ): Promise<number> {
    if (items.length === 0) return 0;
    const now = Date.now();
    const payloads: BankQuestionInsert[] = items.map((item) => ({
      ...item,
      id: item.id ?? generateId(),
      points: item.points ?? 10,
      createdAt: item.createdAt ?? now,
      updatedAt: item.updatedAt ?? now,
    }));

    await this.db.insert(bankQuestions).values(payloads);
    return payloads.length;
  }

  /**
   * Tìm câu hỏi theo ID
   */
  async findById(id: string): Promise<BankQuestionSelect | null> {
    const res = await this.db
      .select()
      .from(bankQuestions)
      .where(eq(bankQuestions.id, id))
      .limit(1);
    return res[0] ?? null;
  }

  /**
   * Cập nhật thông tin câu hỏi
   */
  async update(
    id: string,
    data: Partial<Omit<BankQuestionInsert, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<BankQuestionSelect | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updatePayload: Partial<BankQuestionInsert> = {
      ...data,
      updatedAt: Date.now(),
    };

    await this.db
      .update(bankQuestions)
      .set(updatePayload)
      .where(eq(bankQuestions.id, id));

    return this.findById(id);
  }

  /**
   * Xóa một câu hỏi theo ID
   */
  async delete(id: string): Promise<boolean> {
    const res = await this.db
      .delete(bankQuestions)
      .where(eq(bankQuestions.id, id));
    return (res.changes ?? 0) > 0;
  }

  /**
   * Xóa nhiều câu hỏi theo danh sách ID
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.db
      .delete(bankQuestions)
      .where(inArray(bankQuestions.id, ids));
    return res.changes ?? 0;
  }

  /**
   * Lấy danh sách câu hỏi theo bộ lọc
   */
  async list(filter?: BankQuestionFilter): Promise<BankQuestionSelect[]> {
    const conditions = [];

    if (filter?.ownerId) {
      conditions.push(eq(bankQuestions.ownerId, filter.ownerId));
    }
    if (filter?.grade !== undefined) {
      conditions.push(eq(bankQuestions.grade, filter.grade));
    }
    if (filter?.subject) {
      conditions.push(eq(bankQuestions.subject, filter.subject));
    }
    if (filter?.chapter) {
      conditions.push(eq(bankQuestions.chapter, filter.chapter));
    }
    if (filter?.lesson) {
      conditions.push(eq(bankQuestions.lesson, filter.lesson));
    }
    if (filter?.difficulty) {
      conditions.push(eq(bankQuestions.difficulty, filter.difficulty));
    }
    if (filter?.type) {
      conditions.push(eq(bankQuestions.type, filter.type));
    }
    if (filter?.search?.trim()) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(bankQuestions.contentJson, term),
          like(bankQuestions.answerJson, term),
        ),
      );
    }

    let query = this.db
      .select()
      .from(bankQuestions)
      .orderBy(desc(bankQuestions.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    if (filter?.limit) {
      query = query.limit(filter.limit) as typeof query;
    }
    if (filter?.offset) {
      query = query.offset(filter.offset) as typeof query;
    }

    return query;
  }

  /**
   * Lấy cây phân cấp Chương - Bài kèm số lượng câu hỏi và phân bố mức độ
   */
  async getCurriculumTree(
    ownerId: string,
    grade: number,
    subject: string,
  ): Promise<BankCurriculumTreeResult[]> {
    const rows = await this.db
      .select({
        chapter: bankQuestions.chapter,
        lesson: bankQuestions.lesson,
        difficulty: bankQuestions.difficulty,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(bankQuestions)
      .where(
        and(
          eq(bankQuestions.ownerId, ownerId),
          eq(bankQuestions.grade, grade),
          eq(bankQuestions.subject, subject),
        ),
      )
      .groupBy(
        bankQuestions.chapter,
        bankQuestions.lesson,
        bankQuestions.difficulty,
      );

    // Gom nhóm theo Chapter -> Lesson
    const chapterMap = new Map<
      string,
      Map<string, { nb: number; th: number; vd: number; vdc: number; total: number }>
    >();

    for (const r of rows) {
      if (!chapterMap.has(r.chapter)) {
        chapterMap.set(r.chapter, new Map());
      }
      const lessonMap = chapterMap.get(r.chapter)!;
      if (!lessonMap.has(r.lesson)) {
        lessonMap.set(r.lesson, { nb: 0, th: 0, vd: 0, vdc: 0, total: 0 });
      }
      const counts = lessonMap.get(r.lesson)!;
      const count = Number(r.count) || 0;
      if (r.difficulty === 'nb') counts.nb += count;
      else if (r.difficulty === 'th') counts.th += count;
      else if (r.difficulty === 'vd') counts.vd += count;
      else if (r.difficulty === 'vdc') counts.vdc += count;
      counts.total += count;
    }

    const result: BankCurriculumTreeResult[] = [];
    for (const [chapter, lessonMap] of chapterMap.entries()) {
      let chapterTotal = 0;
      const lessons = [];
      for (const [lesson, c] of lessonMap.entries()) {
        chapterTotal += c.total;
        lessons.push({
          lesson,
          totalQuestions: c.total,
          countsByDifficulty: {
            nb: c.nb,
            th: c.th,
            vd: c.vd,
            vdc: c.vdc,
          },
        });
      }
      result.push({
        chapter,
        lessons,
        totalQuestions: chapterTotal,
      });
    }

    return result;
  }

  /**
   * Lấy số câu sẵn có theo từng bài học cho Bảng Ma trận
   */
  async getMatrixStats(
    ownerId: string,
    grade: number,
    subject: string,
    lessons?: string[],
  ): Promise<
    Record<
      string,
      {
        chapter: string;
        lesson: string;
        available: { nb: number; th: number; vd: number; vdc: number };
        total: number;
      }
    >
  > {
    const conditions = [
      eq(bankQuestions.ownerId, ownerId),
      eq(bankQuestions.grade, grade),
      eq(bankQuestions.subject, subject),
    ];

    if (lessons && lessons.length > 0) {
      conditions.push(inArray(bankQuestions.lesson, lessons));
    }

    const rows = await this.db
      .select({
        chapter: bankQuestions.chapter,
        lesson: bankQuestions.lesson,
        difficulty: bankQuestions.difficulty,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(bankQuestions)
      .where(and(...conditions))
      .groupBy(
        bankQuestions.chapter,
        bankQuestions.lesson,
        bankQuestions.difficulty,
      );

    const stats: Record<
      string,
      {
        chapter: string;
        lesson: string;
        available: { nb: number; th: number; vd: number; vdc: number };
        total: number;
      }
    > = {};

    for (const r of rows) {
      let stat = stats[r.lesson];
      if (!stat) {
        stat = {
          chapter: r.chapter,
          lesson: r.lesson,
          available: { nb: 0, th: 0, vd: 0, vdc: 0 },
          total: 0,
        };
        stats[r.lesson] = stat;
      }
      const count = Number(r.count) || 0;
      if (r.difficulty === 'nb') stat.available.nb += count;
      else if (r.difficulty === 'th') stat.available.th += count;
      else if (r.difficulty === 'vd') stat.available.vd += count;
      else if (r.difficulty === 'vdc') stat.available.vdc += count;
      stat.total += count;
    }

    return stats;
  }

  /**
   * Bốc ngẫu nhiên k câu hỏi theo Bài học và Mức độ
   */
  async pickRandom(
    ownerId: string,
    lesson: string,
    difficulty: BankQuestionSelect['difficulty'],
    limit: number,
  ): Promise<BankQuestionSelect[]> {
    if (limit <= 0) return [];
    return this.db
      .select()
      .from(bankQuestions)
      .where(
        and(
          eq(bankQuestions.ownerId, ownerId),
          eq(bankQuestions.lesson, lesson),
          eq(bankQuestions.difficulty, difficulty),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(limit);
  }

  /**
   * Kiểm tra xem mã băm SHA-256 của ảnh có đang được câu hỏi nào trong ngân hàng tham chiếu không
   */
  async isAssetReferenced(sha256: string): Promise<boolean> {
    const term = `%${sha256}%`;
    const res = await this.db
      .select({ id: bankQuestions.id })
      .from(bankQuestions)
      .where(
        or(
          like(bankQuestions.contentJson, term),
          like(bankQuestions.answerJson, term),
        ),
      )
      .limit(1);
    return res.length > 0;
  }
}
