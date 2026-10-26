import { eq } from 'drizzle-orm';
import type { EduClassDatabase } from '../connection.js';
import { generateId } from '../id.js';
import { assets } from '../schema/index.js';

export type AssetInsert = typeof assets.$inferInsert;
export type AssetSelect = typeof assets.$inferSelect;

export class AssetRepository {
  constructor(private readonly db: EduClassDatabase) {}

  /**
   * Tạo bản ghi asset mới
   */
  async create(
    data: Omit<AssetInsert, 'id'> & { id?: string | undefined },
  ): Promise<AssetSelect> {
    const id = data.id ?? generateId();
    const insertPayload: AssetInsert = {
      ...data,
      id,
    };
    await this.db.insert(assets).values(insertPayload);
    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Không tìm thấy asset vừa tạo với id: ${id}`);
    }
    return created;
  }

  /**
   * Tìm asset theo ID
   */
  async findById(id: string): Promise<AssetSelect | null> {
    const res = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Tìm asset theo mã SHA-256 (Content-Addressable)
   */
  async findBySha256(sha256: string): Promise<AssetSelect | null> {
    const res = await this.db.select().from(assets).where(eq(assets.sha256, sha256)).limit(1);
    return res[0] ?? null;
  }

  /**
   * Tìm hoặc tạo asset mới (deduplication tự động theo hash)
   */
  async findOrCreate(
    data: Omit<AssetInsert, 'id'> & { id?: string | undefined },
  ): Promise<{ asset: AssetSelect; isNew: boolean }> {
    const existing = await this.findBySha256(data.sha256);
    if (existing) {
      return { asset: existing, isNew: false };
    }
    const created = await this.create(data);
    return { asset: created, isNew: true };
  }

  /**
   * Xóa asset theo mã SHA-256
   */
  async deleteBySha256(sha256: string): Promise<boolean> {
    const res = await this.db.delete(assets).where(eq(assets.sha256, sha256));
    return (res.changes ?? 0) > 0;
  }

  /**
   * Xóa asset theo ID
   */
  async deleteById(id: string): Promise<boolean> {
    const res = await this.db.delete(assets).where(eq(assets.id, id));
    return (res.changes ?? 0) > 0;
  }
}
