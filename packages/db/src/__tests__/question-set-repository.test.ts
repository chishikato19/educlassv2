import { describe, expect, it } from 'vitest';
import { createDatabaseConnection } from '../connection.js';
import { runMigrations } from '../migrator.js';
import { QuestionSetRepository } from '../repositories/question-set-repository.js';
import { UserRepository } from '../repositories/user-repository.js';

describe('QuestionSetRepository', () => {
  it('creates, retrieves with questions, filters, clones and deletes question sets', async () => {
    const { db, sqlite, close } = createDatabaseConnection({ inMemory: true });
    try {
      runMigrations({ sqlite });
      const userRepo = new UserRepository(db);
      const questionSetRepo = new QuestionSetRepository(db);

      const teacherA = await userRepo.create({
        username: 'teacher_a',
        passwordHash: 'hash_a',
        displayName: 'Thầy Tuấn',
        role: 'teacher',
      });

      const teacherB = await userRepo.create({
        username: 'teacher_b',
        passwordHash: 'hash_b',
        displayName: 'Cô Lan',
        role: 'teacher',
      });

      // 1. Tạo bộ đề cho Thầy Tuấn kèm câu hỏi
      const setA = await questionSetRepo.create({
        ownerId: teacherA.id,
        title: 'Kiểm tra 15 phút Hàm số 12',
        subject: 'Toán',
        grade: 12,
        tags: ['Giải tích', 'Khảo sát hàm số'],
        questions: [
          {
            type: 'mcq4',
            contentJson: JSON.stringify({ stem: { text: 'Hàm số đồng biến khi nào?' } }),
            answerJson: JSON.stringify({ correct: 0 }),
            points: 10,
          },
          {
            type: 'tf',
            contentJson: JSON.stringify({ stem: { text: 'Đạo hàm của hằng số bằng 0?' } }),
            answerJson: JSON.stringify({ correct: true }),
            points: 10,
          },
        ],
      });

      expect(setA.id).toBeDefined();
      expect(setA.title).toBe('Kiểm tra 15 phút Hàm số 12');
      expect(setA.tags).toEqual(['Giải tích', 'Khảo sát hàm số']);
      expect(setA.questionCount).toBe(2);

      // 2. Tạo thêm 1 bộ đề cho Thầy Tuấn và 1 bộ đề cho Cô Lan
      await questionSetRepo.create({
        ownerId: teacherA.id,
        title: 'Ôn tập Hình học không gian',
        subject: 'Toán',
        grade: 12,
        tags: ['Hình học'],
      });

      await questionSetRepo.create({
        ownerId: teacherB.id,
        title: 'Kiểm tra 1 tiết Quang học',
        subject: 'Vật lý',
        grade: 11,
        tags: ['Quang học'],
      });

      // 3. Kiểm tra findWithQuestions
      const setWithQuestions = await questionSetRepo.findWithQuestions(setA.id);
      expect(setWithQuestions).not.toBeNull();
      expect(setWithQuestions?.questions).toHaveLength(2);
      expect(setWithQuestions?.questions[0]?.orderIndex).toBe(0);
      expect(setWithQuestions?.questions[1]?.orderIndex).toBe(1);

      // 4. Lọc theo ownerId
      const listA = await questionSetRepo.list({ ownerId: teacherA.id });
      expect(listA).toHaveLength(2);

      const listB = await questionSetRepo.list({ ownerId: teacherB.id });
      expect(listB).toHaveLength(1);
      expect(listB[0]?.title).toBe('Kiểm tra 1 tiết Quang học');

      // 5. Tìm kiếm theo search text
      const searchRes = await questionSetRepo.list({ ownerId: teacherA.id, search: 'Hình học' });
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0]?.title).toBe('Ôn tập Hình học không gian');

      // 6. Lọc theo tag
      const tagRes = await questionSetRepo.list({ tag: 'Giải tích' });
      expect(tagRes).toHaveLength(1);
      expect(tagRes[0]?.id).toBe(setA.id);

      // 7. Lọc theo subject & grade
      const mathGrade12 = await questionSetRepo.list({ subject: 'Toán', grade: 12 });
      expect(mathGrade12).toHaveLength(2);

      // 8. Cập nhật thông tin bộ đề
      const updated = await questionSetRepo.update(setA.id, {
        title: 'Kiểm tra 15 phút Hàm số 12 (Nâng cao)',
        tags: ['Giải tích', 'Nâng cao'],
      });
      expect(updated?.title).toBe('Kiểm tra 15 phút Hàm số 12 (Nâng cao)');
      expect(updated?.tags).toEqual(['Giải tích', 'Nâng cao']);

      // 9. Cập nhật danh sách câu hỏi
      const updatedQuestions = await questionSetRepo.updateQuestions(setA.id, [
        {
          type: 'short',
          contentJson: JSON.stringify({ stem: { text: 'Tính đạo hàm của x^2' } }),
          answerJson: JSON.stringify({ acceptedAnswers: ['2x'] }),
          points: 10,
        },
      ]);
      expect(updatedQuestions).toHaveLength(1);
      const recheckedSet = await questionSetRepo.findWithQuestions(setA.id);
      expect(recheckedSet?.questions).toHaveLength(1);
      expect(recheckedSet?.questions[0]?.type).toBe('short');

      // 10. Nhân bản bộ đề (Clone)
      const cloned = await questionSetRepo.clone(setA.id, teacherB.id, {
        newTitle: 'Bản sao Kiểm tra 15 phút',
      });
      expect(cloned.id).not.toBe(setA.id);
      expect(cloned.ownerId).toBe(teacherB.id);
      expect(cloned.title).toBe('Bản sao Kiểm tra 15 phút');

      const clonedWithQuestions = await questionSetRepo.findWithQuestions(cloned.id);
      expect(clonedWithQuestions?.questions).toHaveLength(1);
      expect(clonedWithQuestions?.questions[0]?.id).not.toBe(recheckedSet?.questions[0]?.id);
      expect(clonedWithQuestions?.questions[0]?.type).toBe('short');

      // 11. Xóa bộ đề và kiểm tra cascade
      const deleted = await questionSetRepo.deleteById(setA.id);
      expect(deleted).toBe(true);

      const findDeleted = await questionSetRepo.findById(setA.id);
      expect(findDeleted).toBeNull();
    } finally {
      close();
    }
  });
});
