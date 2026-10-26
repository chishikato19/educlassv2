import { and, desc, eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { examRecords, type ExamRecordInsert, type ExamRecordSelect } from '../schema/index.js';

export class ExamRecordRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi kết quả bài thi của học sinh
   */
  async create(
    data: Omit<ExamRecordInsert, 'id' | 'submittedAt'> & {
      id?: string | undefined;
      submittedAt?: number | undefined;
    }
  ): Promise<ExamRecordSelect> {
    const id = data.id ?? generateId();
    const submittedAt = data.submittedAt ?? Date.now();
    const insertPayload: ExamRecordInsert = {
      ...data,
      id,
      submittedAt,
    };

    await this.db.insert(examRecords).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy bản ghi bài thi vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tạo mới hoặc cập nhật bản ghi thi của học sinh trong một kỳ thi (Upsert)
   */
  async upsert(
    data: Omit<ExamRecordInsert, 'id' | 'submittedAt'> & {
      id?: string | undefined;
      submittedAt?: number | undefined;
    }
  ): Promise<ExamRecordSelect> {
    const existing = await this.findByExamAndStudent(data.examId, data.studentId);
    if (existing) {
      const updatePayload: Partial<ExamRecordInsert> = {
        studentName: data.studentName,
        batchIndex: data.batchIndex,
        status: data.status,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.percentage,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        answersJson: data.answersJson,
        resultJson: data.resultJson,
        timeSpentSeconds: data.timeSpentSeconds,
        submittedAt: data.submittedAt ?? Date.now(),
      };
      await this.db.update(examRecords).set(updatePayload).where(eq(examRecords.id, existing.id));
      const updated = await this.findById(existing.id);
      return updated!;
    }

    return this.create(data);
  }

  /**
   * Tìm bản ghi theo ID
   */
  async findById(id: string): Promise<ExamRecordSelect | null> {
    const res = await this.db.select().from(examRecords).where(eq(examRecords.id, id)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Tìm bản ghi của học sinh trong một kỳ thi cụ thể
   */
  async findByExamAndStudent(examId: string, studentId: string): Promise<ExamRecordSelect | null> {
    const res = await this.db
      .select()
      .from(examRecords)
      .where(and(eq(examRecords.examId, examId), eq(examRecords.studentId, studentId)))
      .limit(1);
    return res[0] ?? null;
  }

  /**
   * Lấy danh sách kết quả bài thi theo kỳ thi
   */
  async listByExam(examId: string): Promise<ExamRecordSelect[]> {
    return this.db
      .select()
      .from(examRecords)
      .where(eq(examRecords.examId, examId))
      .orderBy(desc(examRecords.submittedAt));
  }

  /**
   * Lấy lịch sử tất cả các bài thi của một học sinh
   */
  async listByStudent(studentId: string): Promise<ExamRecordSelect[]> {
    return this.db
      .select()
      .from(examRecords)
      .where(eq(examRecords.studentId, studentId))
      .orderBy(desc(examRecords.submittedAt));
  }

  /**
   * Xóa bản ghi bài thi
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }
    await this.db.delete(examRecords).where(eq(examRecords.id, id));
    return true;
  }
}
