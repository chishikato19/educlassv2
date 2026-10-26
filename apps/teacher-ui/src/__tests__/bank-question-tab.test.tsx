// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BankQuestionTab } from '../components/BankQuestionTab.js';
import { api } from '../api/client.js';

describe('BankQuestionTab Component (Task 3.3)', () => {
  const mockTree = [
    {
      chapter: 'Chương 1: Khảo sát hàm số',
      totalQuestions: 5,
      lessons: [
        {
          lesson: 'Bài 1: Tính đơn điệu',
          totalQuestions: 5,
          countsByDifficulty: { nb: 2, th: 2, vd: 1, vdc: 0 },
        },
      ],
    },
  ];

  const mockQuestions = [
    {
      id: 'bq_test_1',
      ownerId: 'teacher_1',
      grade: 12,
      subject: 'Toán',
      chapter: 'Chương 1: Khảo sát hàm số',
      lesson: 'Bài 1: Tính đơn điệu',
      difficulty: 'nb' as const,
      type: 'mcq4' as const,
      contentJson: JSON.stringify({
        stem: { text: 'Cho hàm số $y = f(x)$ đồng biến trên $(a; b)$...' },
        options: [
          { id: 'opt_0', text: '$f\'(x) \\ge 0$' },
          { id: 'opt_1', text: '$f\'(x) \\le 0$' },
          { id: 'opt_2', text: '$f\'(x) < 0$' },
          { id: 'opt_3', text: '$f\'(x) = 0$' },
        ],
      }),
      answerJson: JSON.stringify({
        correct: 0,
        explanation: 'Theo định lý về tính đơn điệu của hàm số.',
      }),
      points: 10,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'getBankTree').mockResolvedValue(mockTree);
    vi.spyOn(api, 'getBankQuestions').mockResolvedValue(mockQuestions);
  });

  it('renders question cards with badges, KaTeX formulas, and options', async () => {
    await act(async () => {
      render(<BankQuestionTab />);
    });

    // Kiểm tra header & badge
    expect(screen.getByText('Câu 1')).toBeDefined();
    expect(screen.getAllByText('Nhận biết')[0]).toBeDefined();
    expect(screen.getByText('Bài 1: Tính đơn điệu')).toBeDefined();
    expect(screen.getByText('10 điểm')).toBeDefined();

    // Kiểm tra render options A, B, C, D
    expect(screen.getByText('✓')).toBeDefined(); // Phương án đúng
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('C')).toBeDefined();
    expect(screen.getByText('D')).toBeDefined();

    // Kiểm tra lời giải
    expect(screen.getByText(/Theo định lý về tính đơn điệu/)).toBeDefined();
  });

  it('opens create modal when clicking "+ Thêm câu hỏi"', async () => {
    await act(async () => {
      render(<BankQuestionTab />);
    });

    const createBtn = screen.getByRole('button', { name: /\+ Thêm câu hỏi/i });
    await act(async () => {
      fireEvent.click(createBtn);
    });

    expect(screen.getByText('Thêm câu hỏi mới vào ngân hàng')).toBeDefined();
    expect(screen.getByText('Lưu câu hỏi')).toBeDefined();
  });

  it('opens confirmation modal when clicking "Xóa"', async () => {
    await act(async () => {
      render(<BankQuestionTab />);
    });

    const deleteBtn = screen.getByRole('button', { name: 'Xóa' });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByText('Xóa câu hỏi khỏi ngân hàng?')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Xóa ngay' })).toBeDefined();
  });
});
