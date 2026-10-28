// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MatrixImportModal } from '../components/MatrixImportModal.js';
import { api } from '../api/client.js';

describe('MatrixImportModal Component (Task 4.1 & 4.2)', () => {
  const mockTree = [
    {
      chapter: 'Chương 1: Khảo sát hàm số',
      totalQuestions: 10,
      lessons: [
        {
          lesson: 'Bài 1: Tính đơn điệu',
          totalQuestions: 10,
          countsByDifficulty: { nb: 4, th: 3, vd: 2, vdc: 1 },
        },
      ],
    },
  ];

  const mockStats = {
    stats: {
      'Bài 1: Tính đơn điệu': {
        chapter: 'Chương 1: Khảo sát hàm số',
        lesson: 'Bài 1: Tính đơn điệu',
        available: { nb: 4, th: 3, vd: 2, vdc: 1 },
        total: 10,
      },
    },
  };

  const mockPickedQuestions = [
    {
      id: 'bq_picked_1',
      ownerId: 'teacher_1',
      grade: 12,
      subject: 'Toán',
      chapter: 'Chương 1: Khảo sát hàm số',
      lesson: 'Bài 1: Tính đơn điệu',
      difficulty: 'nb' as const,
      type: 'mcq4' as const,
      contentJson: JSON.stringify({
        stem: { text: 'Câu hỏi nhận biết 1: Hàm số đồng biến khi nào?' },
        options: [
          { id: 'opt_0', text: "f'(x) > 0" },
          { id: 'opt_1', text: "f'(x) < 0" },
        ],
      }),
      answerJson: JSON.stringify({ correct: 0 }),
      points: 10,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const mockReplacementQuestion = {
    id: 'bq_replacement_2',
    ownerId: 'teacher_1',
    grade: 12,
    subject: 'Toán',
    chapter: 'Chương 1: Khảo sát hàm số',
    lesson: 'Bài 1: Tính đơn điệu',
    difficulty: 'nb' as const,
    type: 'mcq4' as const,
    contentJson: JSON.stringify({
      stem: { text: 'Câu hỏi nhận biết 2 thay thế: Khẳng định nào đúng?' },
      options: [
        { id: 'opt_0', text: 'A' },
        { id: 'opt_1', text: 'B' },
      ],
    }),
    answerJson: JSON.stringify({ correct: 1 }),
    points: 10,
    createdAt: 2000,
    updatedAt: 2000,
  };

  beforeEach(() => {
    vi.spyOn(api, 'getBankTree').mockResolvedValue(mockTree);
    vi.spyOn(api, 'getMatrixStats').mockResolvedValue(mockStats);
    vi.spyOn(api, 'previewSetFromMatrix').mockResolvedValue({
      questions: mockPickedQuestions,
      totalQuestions: 1,
    });
    vi.spyOn(api, 'getBankQuestions').mockResolvedValue([mockReplacementQuestion]);
    vi.spyOn(api, 'createQuestionSet').mockResolvedValue({
      id: 'set_created_matrix_123',
      ownerId: 'teacher_1',
      title: 'Đề thi sinh từ Ma trận',
      subject: 'Toán',
      grade: 12,
      tags: [],
      questions: [],
      createdAt: 1000,
      updatedAt: 1000,
    } as unknown as { id: string });
  });

  it('renders modal with matrix grid and available counts', async () => {
    await act(async () => {
      render(
        <MatrixImportModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          initialGrade={12}
          initialSubject="Toán"
        />
      );
    });

    expect(screen.getByText('Bốc Câu Hỏi Theo Ma Trận Đề Thi')).toBeDefined();
    expect(screen.getByText('Bảng Cấu Hình Ma Trận Số Câu')).toBeDefined();
    expect(screen.getAllByText('Bài 1: Tính đơn điệu')[0]).toBeDefined();
    expect(screen.getByText('Có sẵn: 4')).toBeDefined();
    expect(screen.getByText('Có sẵn: 3')).toBeDefined();
  });

  it('warns in red and blocks submit when required count exceeds available', async () => {
    await act(async () => {
      render(
        <MatrixImportModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          initialGrade={12}
          initialSubject="Toán"
        />
      );
    });

    const inputs = screen.getAllByPlaceholderText('0');
    const nbInput = inputs[0]!;

    await act(async () => {
      fireEvent.change(nbInput, { target: { value: '10' } });
    });

    expect(screen.getByText('Kho có 4!')).toBeDefined();

    const submitBtn = screen.getByRole('button', {
      name: /Xem trước & Đổi câu/i,
    });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('navigates to Review & Swap step, swaps question, and confirms saving set', async () => {
    const handleSuccess = vi.fn();

    await act(async () => {
      render(
        <MatrixImportModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
          initialGrade={12}
          initialSubject="Toán"
        />
      );
    });

    const inputs = screen.getAllByPlaceholderText('0');
    const nbInput = inputs[0]!;

    // Nhập 1 câu NB
    await act(async () => {
      fireEvent.change(nbInput, { target: { value: '1' } });
    });

    const previewBtn = screen.getByRole('button', {
      name: /Xem trước & Đổi câu \(1 câu\)/i,
    });
    expect((previewBtn as HTMLButtonElement).disabled).toBe(false);

    // Chuyển sang Bước 2 (Review & Swap)
    await act(async () => {
      fireEvent.click(previewBtn);
    });

    // Kiểm tra đã vào bước 2: hiển thị câu hỏi vừa bốc
    expect(screen.getByText('Xem Trước & Đổi Câu — Đề thi sinh từ Ma trận')).toBeDefined();
    expect(screen.getByText(/Câu hỏi nhận biết 1: Hàm số đồng biến/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Đổi câu khác/i })).toBeDefined();

    // Bấm nút "Đổi câu khác"
    const swapBtn = screen.getByRole('button', { name: /Đổi câu khác/i });
    await act(async () => {
      fireEvent.click(swapBtn);
    });

    // Kiểm tra câu hỏi đã được đổi sang câu thay thế
    expect(screen.getByText(/Câu hỏi nhận biết 2 thay thế: Khẳng định nào đúng\?/)).toBeDefined();

    // Bấm "Xác nhận lưu vào Kho bộ đề"
    const confirmSaveBtn = screen.getByRole('button', {
      name: /Xác nhận lưu vào Kho bộ đề \(1 câu\)/i,
    });
    await act(async () => {
      fireEvent.click(confirmSaveBtn);
    });

    expect(api.createQuestionSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Đề thi sinh từ Ma trận',
        grade: 12,
        subject: 'Toán',
        questions: expect.arrayContaining([
          expect.objectContaining({
            type: 'mcq4',
            points: 10,
          }),
        ]),
      })
    );
    expect(handleSuccess).toHaveBeenCalledWith('set_created_matrix_123');
  });
});
