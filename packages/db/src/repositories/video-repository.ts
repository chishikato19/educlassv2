import { desc, eq, like, or } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { videos, type VideoInsert, type VideoSelect } from '../schema/index.js';

export interface VideoFilter {
  category?: string | undefined;
  search?: string | undefined;
}

export class VideoRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi video mới
   */
  async create(
    data: Omit<VideoInsert, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string | undefined;
      createdAt?: number | undefined;
      updatedAt?: number | undefined;
    }
  ): Promise<VideoSelect> {
    const now = Date.now();
    const id = data.id ?? generateId();
    const insertPayload: VideoInsert = {
      ...data,
      id,
      category: (data.category || 'Khởi động').trim(),
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    await this.db.insert(videos).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không thể tìm thấy video vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm video theo ID
   */
  async findById(id: string): Promise<VideoSelect | null> {
    const res = await this.db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Danh sách video theo bộ lọc phân loại và tìm kiếm
   */
  async list(filter?: VideoFilter): Promise<VideoSelect[]> {
    let query = this.db.select().from(videos);

    if (filter?.category && filter.category.trim() !== '' && filter.category !== 'all') {
      const cat = filter.category.trim();
      query = query.where(eq(videos.category, cat)) as typeof query;
    }

    if (filter?.search && filter.search.trim() !== '') {
      const term = `%${filter.search.trim()}%`;
      query = query.where(
        or(like(videos.title, term), like(videos.description, term))
      ) as typeof query;
    }

    const rows = await query.orderBy(desc(videos.createdAt));
    return rows;
  }

  /**
   * Lấy danh sách các danh mục phân loại duy nhất
   */
  async listCategories(): Promise<string[]> {
    const rows = await this.db
      .select({ category: videos.category })
      .from(videos)
      .groupBy(videos.category);

    const categories = rows.map(r => r.category).filter(Boolean);
    const defaults = [
      'Khởi động',
      'Bài giảng',
      'Khoa học',
      'Toán học',
      'Tiếng Anh',
      'Kỹ năng sống',
    ];
    const merged = Array.from(new Set([...defaults, ...categories]));
    return merged;
  }

  /**
   * Cập nhật thông tin video
   */
  async update(
    id: string,
    data: Partial<Omit<VideoInsert, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<VideoSelect | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updatePayload: Partial<VideoInsert> = {
      ...data,
      updatedAt: Date.now(),
    };
    if (data.category) {
      updatePayload.category = data.category.trim();
    }

    await this.db.update(videos).set(updatePayload).where(eq(videos.id, id));
    return this.findById(id);
  }

  /**
   * Xóa video theo ID
   */
  async delete(id: string): Promise<boolean> {
    const res = await this.db.delete(videos).where(eq(videos.id, id));
    return (res.changes ?? 0) > 0;
  }
}
