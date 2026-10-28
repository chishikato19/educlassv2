import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TeacherApiClient } from '../api/client.js';

describe('TeacherApiClient - Bank & Matrix APIs (Task 3.1)', () => {
  let client: TeacherApiClient;

  beforeEach(() => {
    client = new TeacherApiClient();
    client.setToken('mock_teacher_token');
  });

  it('calls getBankTree with correct params', async () => {
    const mockTree = [
      {
        chapter: 'Chương 1',
        lessons: [
          {
            lesson: 'Bài 1',
            totalQuestions: 5,
            countsByDifficulty: { nb: 2, th: 2, vd: 1, vdc: 0 },
          },
        ],
        totalQuestions: 5,
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockTree,
    } as unknown as Response);

    const tree = await client.getBankTree({ grade: 12, subject: 'Toán' });
    expect(tree).toEqual(mockTree);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/bank/tree?grade=12&subject=To%C3%A1n',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock_teacher_token',
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it('calls getBankQuestions with query filters', async () => {
    const mockQuestions = [
      {
        id: 'bq_1',
        ownerId: 'teacher_1',
        grade: 12,
        subject: 'Toán',
        chapter: 'Chương 1',
        lesson: 'Bài 1',
        difficulty: 'nb',
        type: 'mcq4',
        contentJson: '{}',
        answerJson: '{}',
        points: 10,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockQuestions,
    } as unknown as Response);

    const res = await client.getBankQuestions({
      grade: 12,
      subject: 'Toán',
      chapter: 'Chương 1',
      difficulty: 'nb',
    });
    expect(res).toEqual(mockQuestions);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/bank/questions?grade=12&subject=To%C3%A1n&chapter=Ch%C6%B0%C6%A1ng+1&difficulty=nb',
      expect.anything()
    );

    fetchSpy.mockRestore();
  });

  it('calls createBankQuestion and createBatchBankQuestions', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'bq_created' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 2 }),
      } as unknown as Response);

    const created = await client.createBankQuestion({
      grade: 12,
      subject: 'Toán',
      chapter: 'Chương 1',
      lesson: 'Bài 1',
      difficulty: 'nb',
      type: 'mcq4',
      contentJson: '{}',
      answerJson: '{}',
      points: 10,
    });
    expect(created.id).toBe('bq_created');

    const batchRes = await client.createBatchBankQuestions([
      {
        grade: 12,
        subject: 'Toán',
        chapter: 'Chương 1',
        lesson: 'Bài 1',
        difficulty: 'nb',
        type: 'mcq4',
        contentJson: '{}',
        answerJson: '{}',
        points: 10,
      },
    ]);
    expect(batchRes).toEqual({ success: true, count: 2 });

    fetchSpy.mockRestore();
  });

  it('calls updateBankQuestion and deleteBankQuestion', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'bq_1', points: 20 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, cleanedAssetsCount: 1 }),
      } as unknown as Response);

    const updated = await client.updateBankQuestion('bq_1', { points: 20 });
    expect(updated.points).toBe(20);

    const deleted = await client.deleteBankQuestion('bq_1');
    expect(deleted.cleanedAssetsCount).toBe(1);

    fetchSpy.mockRestore();
  });

  it('calls getMatrixStats and generateSetFromMatrix', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            'Bài 1': {
              chapter: 'Chương 1',
              lesson: 'Bài 1',
              available: { nb: 5, th: 3, vd: 2, vdc: 1 },
              total: 11,
            },
          },
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          setId: 'set_123',
          title: 'Đề thi tự sinh',
          totalQuestions: 10,
        }),
      } as unknown as Response);

    const stats = await client.getMatrixStats({
      grade: 12,
      subject: 'Toán',
      lessons: ['Bài 1'],
    });
    expect(stats.stats['Bài 1']?.total).toBe(11);

    const genRes = await client.generateSetFromMatrix({
      title: 'Đề thi tự sinh',
      grade: 12,
      subject: 'Toán',
      matrix: [
        {
          chapter: 'Chương 1',
          lesson: 'Bài 1',
          counts: { nb: 2, th: 2, vd: 0, vdc: 0 },
        },
      ],
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    expect(genRes.setId).toBe('set_123');

    fetchSpy.mockRestore();
  });
});
