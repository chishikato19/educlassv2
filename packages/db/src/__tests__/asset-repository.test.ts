import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabaseConnection, type EduClassDatabase } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { AssetRepository } from '../repositories/asset-repository.js';

describe('AssetRepository', () => {
  let db: EduClassDatabase;
  let repo: AssetRepository;

  beforeEach(() => {
    const conn = createDatabaseConnection({ inMemory: true });
    runMigrations({ sqlite: conn.sqlite });
    db = conn.db;
    repo = new AssetRepository(db);
  });

  it('creates an asset and finds it by id and sha256', async () => {
    const asset = await repo.create({
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      mime: 'image/png',
      path: 'uploads/e3b0c442.png',
      size: 1024,
    });

    expect(asset.id).toBeDefined();
    expect(asset.sha256).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(asset.mime).toBe('image/png');
    expect(asset.size).toBe(1024);

    const foundById = await repo.findById(asset.id);
    expect(foundById?.id).toBe(asset.id);

    const foundBySha = await repo.findBySha256(asset.sha256);
    expect(foundBySha?.id).toBe(asset.id);
  });

  it('deduplicates existing asset using findOrCreate', async () => {
    const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    const res1 = await repo.findOrCreate({
      sha256: sha,
      mime: 'image/jpeg',
      path: 'uploads/aaa.jpg',
      size: 2048,
    });
    expect(res1.isNew).toBe(true);

    const res2 = await repo.findOrCreate({
      sha256: sha,
      mime: 'image/jpeg',
      path: 'uploads/different-path.jpg',
      size: 2048,
    });
    expect(res2.isNew).toBe(false);
    expect(res2.asset.id).toBe(res1.asset.id);
    expect(res2.asset.path).toBe(res1.asset.path);
  });
});
