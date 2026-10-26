import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { BankQuestionRepository } from '../repositories/bank-question-repository.js';
import { users } from '../schema/index.js';

describe('BankQuestionRepository (Task 1.2)', () => {
  it('creates, lists, aggregates curriculum tree and matrix stats', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      // 1. Chạy migrations để khởi tạo toàn bộ cấu trúc DB gồm migration 5
      const migResult = runMigrations({ sqlite });
      expect(migResult.appliedMigrations.length).toBeGreaterThan(0);

      const bankRepo = new BankQuestionRepository(db);

      // 2. Tạo User (GV sở hữu)
      const teacherId = '01H7XTESTTEACHER0000000001';
      await db.insert(users).values({
        id: teacherId,
        username: 'gv_toan12',
        passwordHash: 'hash123',
        displayName: 'Thầy Hùng',
        role: 'teacher',
        createdAt: Date.now(),
      });

      // 3. Tạo một câu hỏi đơn lẻ
      const q1 = await bankRepo.create({
        ownerId: teacherId,
        grade: 12,
        subject: 'Toán',
        chapter: 'Chương 1: Ứng dụng đạo hàm',
        lesson: 'Bài 1: Tính đơn điệu',
        difficulty: 'nb',
        type: 'mcq4',
        contentJson: JSON.stringify({ stem: { text: 'Cho hàm số f(x)...', images: ['sha256_mock_asset_1'] } }),
        answerJson: JSON.stringify({ correct: 0 }),
      });
      expect(q1.id).toBeDefined();
      expect(q1.difficulty).toBe('nb');

      // 4. Batch insert nhiều câu hỏi vào các bài và mức độ khác nhau
      const batchCount = await bankRepo.createMany([
        {
          ownerId: teacherId,
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Ứng dụng đạo hàm',
          lesson: 'Bài 1: Tính đơn điệu',
          difficulty: 'th',
          type: 'mcq4',
          contentJson: JSON.stringify({ stem: { text: 'Tìm khoảng đồng biến...' } }),
          answerJson: JSON.stringify({ correct: 1 }),
        },
        {
          ownerId: teacherId,
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Ứng dụng đạo hàm',
          lesson: 'Bài 1: Tính đơn điệu',
          difficulty: 'vd',
          type: 'mcq4',
          contentJson: JSON.stringify({ stem: { text: 'Tìm m để hàm số...' } }),
          answerJson: JSON.stringify({ correct: 2 }),
        },
        {
          ownerId: teacherId,
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Ứng dụng đạo hàm',
          lesson: 'Bài 2: Cực trị của hàm số',
          difficulty: 'nb',
          type: 'mcq4',
          contentJson: JSON.stringify({ stem: { text: 'Điểm cực đại là...' } }),
          answerJson: JSON.stringify({ correct: 0 }),
        },
        {
          ownerId: teacherId,
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Ứng dụng đạo hàm',
          lesson: 'Bài 2: Cực trị của hàm số',
          difficulty: 'th',
          type: 'mcq4',
          contentJson: JSON.stringify({ stem: { text: 'Số điểm cực trị là...' } }),
          answerJson: JSON.stringify({ correct: 3 }),
        },
      ]);
      expect(batchCount).toBe(4);

      // 5. Cập nhật câu hỏi
      const updatedQ1 = await bankRepo.update(q1.id, {
        points: 20,
        difficulty: 'th',
      });
      expect(updatedQ1?.points).toBe(20);
      expect(updatedQ1?.difficulty).toBe('th');

      // 6. Lọc danh sách câu hỏi
      const listTh = await bankRepo.list({
        ownerId: teacherId,
        grade: 12,
        subject: 'Toán',
        lesson: 'Bài 1: Tính đơn điệu',
        difficulty: 'th',
      });
      expect(listTh.length).toBe(2); // q1 vừa đổi sang th + câu batch insert th

      // 7. Lấy Cây phân cấp bài học
      const tree = await bankRepo.getCurriculumTree(teacherId, 12, 'Toán');
      expect(tree.length).toBe(1);
      expect(tree[0]!.chapter).toBe('Chương 1: Ứng dụng đạo hàm');
      expect(tree[0]!.lessons.length).toBe(2);

      const b1 = tree[0]!.lessons.find((l) => l.lesson === 'Bài 1: Tính đơn điệu');
      expect(b1).toBeDefined();
      expect(b1?.totalQuestions).toBe(3);
      expect(b1?.countsByDifficulty.th).toBe(2);
      expect(b1?.countsByDifficulty.vd).toBe(1);

      // 8. Lấy Thống kê cho Bảng Ma trận
      const stats = await bankRepo.getMatrixStats(teacherId, 12, 'Toán', [
        'Bài 1: Tính đơn điệu',
        'Bài 2: Cực trị của hàm số',
      ]);
      expect(stats['Bài 1: Tính đơn điệu']).toBeDefined();
      expect(stats['Bài 1: Tính đơn điệu']!.available.th).toBe(2);
      expect(stats['Bài 2: Cực trị của hàm số']!.available.nb).toBe(1);

      // 9. Bốc ngẫu nhiên câu hỏi
      const picked = await bankRepo.pickRandom(teacherId, 'Bài 1: Tính đơn điệu', 'th', 1);
      expect(picked.length).toBe(1);
      expect(picked[0]!.lesson).toBe('Bài 1: Tính đơn điệu');
      expect(picked[0]!.difficulty).toBe('th');

      // 10. Kiểm tra tham chiếu asset
      const isRef = await bankRepo.isAssetReferenced('sha256_mock_asset_1');
      expect(isRef).toBe(true);

      const isNotRef = await bankRepo.isAssetReferenced('sha256_non_existent');
      expect(isNotRef).toBe(false);

      // 11. Xóa câu hỏi
      const deleted = await bankRepo.delete(q1.id);
      expect(deleted).toBe(true);
      const afterDelete = await bankRepo.findById(q1.id);
      expect(afterDelete).toBeNull();
    } finally {
      close();
    }
  });
});
