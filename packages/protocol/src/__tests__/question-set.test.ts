import { describe, it, expect } from 'vitest';
import {
  CreateQuestionSetRequestSchema,
  EduclassPackageSchema,
  QuestionSetDtoSchema,
  UpdateQuestionSetRequestSchema,
} from '../question-set.js';

describe('QuestionSet Protocol Schemas (Task 2.3)', () => {
  it('validates QuestionSetDto correctly with tags and questionCount', () => {
    const valid = {
      id: 'set_123',
      ownerId: 'teacher_1',
      title: 'Đề kiểm tra 15 phút Giải tích 12',
      subject: 'Toán',
      grade: 12,
      tags: ['Giải tích', 'Chương 1', 'Khảo sát hàm số'],
      schemaVersion: 1,
      questionCount: 10,
      updatedAt: 1728100000000,
    };

    const parsed = QuestionSetDtoSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates CreateQuestionSetRequest with defaults', () => {
    const input = {
      title: 'Đề thi thử học kỳ 1',
      subject: 'Vật lý',
      grade: 10,
    };

    const parsed = CreateQuestionSetRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toEqual([]);
    }
  });

  it('rejects invalid grade in CreateQuestionSetRequest', () => {
    const input = {
      title: 'Đề thi',
      subject: 'Toán',
      grade: 15, // Out of range 1-12
    };

    const parsed = CreateQuestionSetRequestSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('validates UpdateQuestionSetRequest correctly', () => {
    const input = {
      title: 'Đề thi đã đổi tên',
      tags: ['Thẻ mới'],
    };

    const parsed = UpdateQuestionSetRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates EduclassPackage schema for export and import', () => {
    const pkg = {
      format: 'educlass',
      version: 1,
      exportedAt: 1728123456789,
      questionSet: {
        title: 'Bộ đề ôn tập Hóa học 11',
        subject: 'Hóa học',
        grade: 11,
        tags: ['Hữu cơ', 'Este - Lipit'],
      },
      questions: [
        {
          id: 'q_1',
          type: 'mcq4',
          stem: { text: 'Este có mùi chuối chín là?', images: [] },
          options: [
            { text: 'Isoamyl axetat', images: [] },
            { text: 'Benzyl axetat', images: [] },
            { text: 'Etyl fomat', images: [] },
            { text: 'Geranyl axetat', images: [] },
          ],
          correct: 0,
          points: 10,
        },
      ],
      assets: [
        {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'image/png',
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        },
      ],
    };

    const parsed = EduclassPackageSchema.safeParse(pkg);
    expect(parsed.success).toBe(true);
  });

  it('rejects EduclassPackage with incorrect format tag', () => {
    const badPkg = {
      format: 'other_format',
      version: 1,
      exportedAt: 1728123456789,
      questionSet: {
        title: 'Bộ đề',
        subject: 'Toán',
        grade: 12,
        tags: [],
      },
      questions: [],
    };

    const parsed = EduclassPackageSchema.safeParse(badPkg);
    expect(parsed.success).toBe(false);
  });
});
