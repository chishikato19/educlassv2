import { and, asc, eq, like, ne, or } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { questionSets, questions } from '../schema/index.js';

export interface QuestionSetData {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  grade: number;
  tags: string[];
  schemaVersion: number;
  questionCount: number;
  updatedAt: number;
}

export interface QuestionItemData {
  id: string;
  setId: string;
  orderIndex: number;
  type: (typeof questions.$inferSelect)['type'];
  contentJson: string;
  answerJson: string;
  points: number;
}

export interface QuestionSetWithQuestions extends QuestionSetData {
  questions: QuestionItemData[];
}

export interface CreateQuestionInput {
  id?: string;
  type: (typeof questions.$inferInsert)['type'];
  contentJson: string;
  answerJson: string;
  points?: number;
}

export interface CreateQuestionSetData {
  id?: string;
  ownerId: string;
  title: string;
  subject: string;
  grade: number;
  tags?: string[];
  schemaVersion?: number;
  updatedAt?: number;
  questions?: CreateQuestionInput[];
}

export interface UpdateQuestionSetData {
  title?: string | undefined;
  subject?: string | undefined;
  grade?: number | undefined;
  tags?: string[] | undefined;
  updatedAt?: number | undefined;
}

export interface ListQuestionSetFilter {
  ownerId?: string;
  search?: string;
  tag?: string;
  subject?: string;
  grade?: number;
}

export class QuestionSetRepository {
  constructor(private readonly db: EduClassDatabase) {}

  private parseTags(tagsJson: string | null): string[] {
    if (!tagsJson) return [];
    try {
      const parsed = JSON.parse(tagsJson);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Tạo mới bộ câu hỏi và các câu hỏi đi kèm (nếu có)
   */
  async create(data: CreateQuestionSetData): Promise<QuestionSetData> {
    const id = data.id ?? generateId();
    const now = data.updatedAt ?? Date.now();
    const tags = data.tags ?? [];

    await this.db.insert(questionSets).values({
      id,
      ownerId: data.ownerId,
      title: data.title,
      subject: data.subject,
      grade: data.grade,
      tagsJson: JSON.stringify(tags),
      schemaVersion: data.schemaVersion ?? 1,
      updatedAt: now,
    });

    if (data.questions && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        if (q) {
          await this.db.insert(questions).values({
            id: q.id ?? generateId(),
            setId: id,
            orderIndex: i,
            type: q.type,
            contentJson: q.contentJson,
            answerJson: q.answerJson,
            points: q.points ?? 10,
          });
        }
      }
    }

    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy bộ câu hỏi vừa tạo: ${id}`);
    }
    return created;
  }

  /**
   * Tìm bộ câu hỏi theo ID (kèm số lượng câu hỏi)
   */
  async findById(id: string): Promise<QuestionSetData | null> {
    const sets = await this.db.select().from(questionSets).where(eq(questionSets.id, id)).limit(1);

    const set = sets[0];
    if (!set) return null;

    const allQuestions = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.setId, id));

    return {
      id: set.id,
      ownerId: set.ownerId,
      title: set.title,
      subject: set.subject,
      grade: set.grade,
      tags: this.parseTags(set.tagsJson),
      schemaVersion: set.schemaVersion,
      questionCount: allQuestions.length,
      updatedAt: set.updatedAt,
    };
  }

  /**
   * Lấy chi tiết bộ câu hỏi kèm danh sách câu hỏi
   */
  async findWithQuestions(id: string): Promise<QuestionSetWithQuestions | null> {
    const set = await this.findById(id);
    if (!set) return null;

    const questionList = await this.db
      .select()
      .from(questions)
      .where(eq(questions.setId, id))
      .orderBy(asc(questions.orderIndex));

    return {
      ...set,
      questions: questionList.map(q => ({
        id: q.id,
        setId: q.setId,
        orderIndex: q.orderIndex,
        type: q.type,
        contentJson: q.contentJson,
        answerJson: q.answerJson,
        points: q.points,
      })),
    };
  }

  /**
   * Lấy danh sách bộ đề có bộ lọc
   */
  async list(filter?: ListQuestionSetFilter): Promise<QuestionSetData[]> {
    const conditions = [];

    if (filter?.ownerId) {
      conditions.push(eq(questionSets.ownerId, filter.ownerId));
    }
    if (filter?.subject) {
      conditions.push(eq(questionSets.subject, filter.subject));
    }
    if (filter?.grade !== undefined) {
      conditions.push(eq(questionSets.grade, filter.grade));
    }
    if (filter?.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(or(like(questionSets.title, pattern), like(questionSets.subject, pattern)));
    }
    if (filter?.tag) {
      const tagPattern = `%"${filter.tag}"%`;
      conditions.push(like(questionSets.tagsJson, tagPattern));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sets = whereClause
      ? await this.db.select().from(questionSets).where(whereClause)
      : await this.db.select().from(questionSets);

    // Lấy count của câu hỏi cho từng set
    const allSetIds = sets.map(s => s.id);
    const countMap = new Map<string, number>();

    if (allSetIds.length > 0) {
      const allQ = await this.db.select({ setId: questions.setId }).from(questions);
      for (const q of allQ) {
        countMap.set(q.setId, (countMap.get(q.setId) ?? 0) + 1);
      }
    }

    return sets.map(set => ({
      id: set.id,
      ownerId: set.ownerId,
      title: set.title,
      subject: set.subject,
      grade: set.grade,
      tags: this.parseTags(set.tagsJson),
      schemaVersion: set.schemaVersion,
      questionCount: countMap.get(set.id) ?? 0,
      updatedAt: set.updatedAt,
    }));
  }

  /**
   * Cập nhật thông tin bộ đề
   */
  async update(id: string, data: UpdateQuestionSetData): Promise<QuestionSetData | null> {
    const updateValues: Record<string, unknown> = {
      updatedAt: data.updatedAt ?? Date.now(),
    };

    if (data.title !== undefined) updateValues.title = data.title;
    if (data.subject !== undefined) updateValues.subject = data.subject;
    if (data.grade !== undefined) updateValues.grade = data.grade;
    if (data.tags !== undefined) updateValues.tagsJson = JSON.stringify(data.tags);

    await this.db.update(questionSets).set(updateValues).where(eq(questionSets.id, id));
    return this.findById(id);
  }

  /**
   * Cập nhật toàn bộ câu hỏi trong bộ đề (thay thế)
   */
  async updateQuestions(
    setId: string,
    newQuestions: CreateQuestionInput[]
  ): Promise<QuestionItemData[]> {
    // Xóa câu hỏi cũ
    await this.db.delete(questions).where(eq(questions.setId, setId));

    // Thêm các câu hỏi mới
    for (let i = 0; i < newQuestions.length; i++) {
      const q = newQuestions[i];
      if (q) {
        await this.db.insert(questions).values({
          id: q.id ?? generateId(),
          setId,
          orderIndex: i,
          type: q.type,
          contentJson: q.contentJson,
          answerJson: q.answerJson,
          points: q.points ?? 10,
        });
      }
    }

    // Cập nhật updatedAt của bộ đề
    await this.db
      .update(questionSets)
      .set({ updatedAt: Date.now() })
      .where(eq(questionSets.id, setId));

    const result = await this.db
      .select()
      .from(questions)
      .where(eq(questions.setId, setId))
      .orderBy(asc(questions.orderIndex));

    return result.map(q => ({
      id: q.id,
      setId: q.setId,
      orderIndex: q.orderIndex,
      type: q.type,
      contentJson: q.contentJson,
      answerJson: q.answerJson,
      points: q.points,
    }));
  }

  /**
   * Nhân bản bộ đề
   */
  async clone(
    id: string,
    newOwnerId: string,
    options?: { newTitle?: string | undefined } | undefined
  ): Promise<QuestionSetData> {
    const original = await this.findWithQuestions(id);
    if (!original) {
      throw new Error(`Không tìm thấy bộ câu hỏi để nhân bản: ${id}`);
    }

    const newTitle = options?.newTitle ?? `Bản sao của ${original.title}`;

    return this.create({
      ownerId: newOwnerId,
      title: newTitle,
      subject: original.subject,
      grade: original.grade,
      tags: [...original.tags],
      schemaVersion: original.schemaVersion,
      questions: original.questions.map(q => ({
        type: q.type,
        contentJson: q.contentJson,
        answerJson: q.answerJson,
        points: q.points,
      })),
    });
  }

  /**
   * Xóa bộ đề và câu hỏi đi kèm
   */
  async deleteById(id: string): Promise<boolean> {
    await this.db.delete(questions).where(eq(questions.setId, id));
    const result = await this.db.delete(questionSets).where(eq(questionSets.id, id));
    return (result.changes ?? 0) > 0;
  }

  /**
   * Kiểm tra xem một mã băm ảnh SHA-256 có còn được tham chiếu bởi bất kỳ câu hỏi nào trong DB không
   * Có thể loại trừ một setId cụ thể (ví dụ bộ đề chuẩn bị xóa hoặc đang cập nhật)
   */
  async isAssetReferenced(sha256: string, excludeSetId?: string): Promise<boolean> {
    const pattern = `%${sha256}%`;
    const conditions = [
      or(like(questions.contentJson, pattern), like(questions.answerJson, pattern)),
    ];

    if (excludeSetId) {
      conditions.push(ne(questions.setId, excludeSetId));
    }

    const matched = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...conditions))
      .limit(1);

    return matched.length > 0;
  }
}
