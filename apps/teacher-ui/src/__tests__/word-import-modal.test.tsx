// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordImportModal } from '../components/WordImportModal.js';
import type { Question } from '@educlass/question-kit';

describe('WordImportModal UI Component (apps/teacher-ui)', () => {
  const mockQuestions: Question[] = [
    {
      id: 'q_1',
      type: 'mcq4',
      stem: { text: 'Cho hàm số $y=f(x)$. Đạo hàm của $x^2$ là:', images: [] },
      options: [
        { text: '$x$', images: [] },
        { text: '$2x$', images: [] },
        { text: '$3x$', images: [] },
        { text: '$4x$', images: [] },
      ],
      correct: 1,
      points: 10,
    },
    {
      id: 'q_2',
      type: 'short',
      stem: { text: 'Khối lượng mol của O2 là bao nhiêu?', images: [] },
      accepted: ['32'],
      points: 10,
    },
  ];

  it('renders modal with upload prompt and template download button', () => {
    const handleClose = vi.fn();
    const handleDownloadTemplate = vi.fn();

    render(
      <WordImportModal
        isOpen={true}
        onClose={handleClose}
        onDownloadTemplate={handleDownloadTemplate}
        onParseDocx={vi.fn()}
        onSaveQuestions={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nhập đề thi từ file Word \(\.docx\)/i)).toBeDefined();
    expect(screen.getByTestId('btn-download-word-template')).toBeDefined();
    expect(screen.getByTestId('input-file-word')).toBeDefined();

    const downloadBtn = screen.getByTestId('btn-download-word-template');
    act(() => {
      fireEvent.click(downloadBtn);
    });
    expect(handleDownloadTemplate).toHaveBeenCalled();
  });

  it('shows preview and error editing interface when questions are parsed', async () => {
    const handleSave = vi.fn();

    render(
      <WordImportModal
        isOpen={true}
        initialParsedResult={{
          questions: mockQuestions,
          warnings: [
            {
              questionIndex: 2,
              questionNumberStr: '3',
              rawText: 'Câu bị lỗi định dạng',
              reason: 'Thiếu phương án D',
            },
          ],
          totalDetected: 3,
          successCount: 2,
        }}
        onClose={vi.fn()}
        onDownloadTemplate={vi.fn()}
        onParseDocx={vi.fn()}
        onSaveQuestions={handleSave}
      />,
    );

    // Kiểm tra thống kê
    expect(screen.getByText(/Hợp lệ: 2\/3 câu/i)).toBeDefined();
    expect(screen.getByText(/1 cảnh báo/i)).toBeDefined();

    // Hiển thị danh sách câu hỏi xem trước
    expect(screen.getByText(/Đạo hàm của \$x\^2\$ là:/i)).toBeDefined();
    expect(screen.getByText(/Khối lượng mol của O2 là bao nhiêu\?/i)).toBeDefined();

    // Cho phép đổi đáp án đúng của câu 1 từ B (1) sang A (0)
    const radioOption0 = screen.getByTestId('radio-correct-0-0');
    act(() => {
      fireEvent.click(radioOption0);
    });

    // Điền form bộ đề
    const titleInput = screen.getByTestId('input-word-set-title');
    act(() => {
      fireEvent.change(titleInput, { target: { value: 'Bộ đề từ file Word' } });
    });

    // Bấm nút Lưu vào ngân hàng đề
    const saveBtn = screen.getByTestId('btn-save-word-questions');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalled();
    const saveCall = handleSave.mock.calls[0]![0];
    expect(saveCall.setInfo.title).toBe('Bộ đề từ file Word');
    expect(saveCall.questions).toHaveLength(2);
    // Câu 1 đã được đổi đáp án đúng sang index 0
    expect(saveCall.questions[0].correct).toBe(0);
  });
});
