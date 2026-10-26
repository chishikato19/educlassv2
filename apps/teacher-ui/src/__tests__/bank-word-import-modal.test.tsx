// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BankWordImportModal } from '../components/BankWordImportModal.js';
import { api } from '../api/client.js';

describe('BankWordImportModal Component (Task 3.4)', () => {
  beforeEach(() => {
    vi.spyOn(api, 'ensureAuthenticated').mockResolvedValue();
    vi.spyOn(api, 'importWord').mockResolvedValue({
      questions: [
        {
          id: 'q_word_1',
          type: 'mcq4',
          difficulty: 'nb',
          chapter: 'Chương 1: Khảo sát hàm số',
          lesson: 'Bài 1: Tính đơn điệu',
          stem: { text: 'Cho hàm số $y = f(x)$...', images: [] },
          options: [
            { id: 'opt_0', text: 'Đáp án A' },
            { id: 'opt_1', text: 'Đáp án B' },
          ],
          correct: 0,
        },
      ],
      warnings: [],
      totalDetected: 1,
      successCount: 1,
    });
    vi.spyOn(api, 'createBatchBankQuestions').mockResolvedValue({
      success: true,
      count: 1,
    });
  });

  it('renders modal with drag and drop zone and default curriculum selectors', () => {
    render(
      <BankWordImportModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        currentGrade={12}
        currentSubject="Toán"
      />,
    );

    expect(screen.getByText('Nhập Câu Hỏi Word Vào Ngân Hàng')).toBeDefined();
    expect(
      screen.getByText('Kéo thả file Microsoft Word (.docx) vào đây'),
    ).toBeDefined();
    expect(screen.getByText('Chọn file từ máy tính')).toBeDefined();
    expect(screen.getByText('Khối lớp *')).toBeDefined();
    expect(screen.getByText('Môn học *')).toBeDefined();
  });

  it('parses file when uploaded and displays preview list', async () => {
    const handleSuccess = vi.fn();

    render(
      <BankWordImportModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
        currentGrade={12}
        currentSubject="Toán"
      />,
    );

    // Giả lập chọn file .docx
    const file = new File(['mock content'], 'de-toan-12.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/de-toan-12\.docx/)).toBeDefined();
    });
    expect(screen.getByText(/Đã nhận diện thành công 1 câu hỏi hợp lệ/)).toBeDefined();
    expect(screen.getByText('Câu 1')).toBeDefined();
    expect(screen.getByText(/Chương 1: Khảo sát hàm số ➔ Bài 1: Tính đơn điệu/)).toBeDefined();

    // Bấm nút Lưu vào Ngân hàng
    const saveBtn = screen.getByRole('button', {
      name: /Lưu vào Ngân hàng câu hỏi \(1 câu\)/i,
    });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(api.createBatchBankQuestions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          grade: 12,
          subject: 'Toán',
          chapter: 'Chương 1: Khảo sát hàm số',
          lesson: 'Bài 1: Tính đơn điệu',
          difficulty: 'nb',
        }),
      ]),
    );
    expect(handleSuccess).toHaveBeenCalledWith(1);
  });
});
