// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionEditor } from '../components/QuestionEditor.js';
import type { Question } from '@educlass/question-kit';

describe('QuestionEditor (apps/teacher-ui - Task 2.2)', () => {
  it('renders default MCQ4 form with stem, 4 options and KaTeX preview', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // Check Question Type Tabs
    expect(screen.getByTestId('tab-type-mcq4')).toBeDefined();
    expect(screen.getByTestId('tab-type-tf')).toBeDefined();
    expect(screen.getByTestId('tab-type-tf_group')).toBeDefined();
    expect(screen.getByTestId('tab-type-short')).toBeDefined();

    // Check Stem input
    const stemInput = screen.getByTestId('input-stem-text');
    expect(stemInput).toBeDefined();

    // Type math formula into stem
    act(() => {
      fireEvent.change(stemInput, {
        target: { value: 'Giải phương trình $x^2 - 4 = 0$' },
      });
    });

    // Verify KaTeX preview is rendered
    const katexPreview = screen.getByTestId('preview-stem-katex');
    expect(katexPreview).toBeDefined();
    expect(katexPreview.innerHTML).toContain('katex');
  });

  it('validates required fields and reports error when saving empty question', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    const saveBtn = screen.getByTestId('btn-save-question');
    act(() => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('editor-error-message')).toBeDefined();
  });

  it('creates and saves a valid MCQ4 question with points and explanation', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // 1. Enter stem
    act(() => {
      fireEvent.change(screen.getByTestId('input-stem-text'), {
        target: { value: 'Thủ đô của Việt Nam là gì?' },
      });
    });

    // 2. Enter 4 options
    act(() => {
      fireEvent.change(screen.getByTestId('input-option-A-text'), {
        target: { value: 'Hà Nội' },
      });
      fireEvent.change(screen.getByTestId('input-option-B-text'), {
        target: { value: 'TP. Hồ Chí Minh' },
      });
      fireEvent.change(screen.getByTestId('input-option-C-text'), {
        target: { value: 'Đà Nẵng' },
      });
      fireEvent.change(screen.getByTestId('input-option-D-text'), {
        target: { value: 'Huế' },
      });
    });

    // 3. Select correct option A (index 0)
    act(() => {
      fireEvent.click(screen.getByTestId('radio-option-correct-A'));
    });

    // 4. Save question
    act(() => {
      fireEvent.click(screen.getByTestId('btn-save-question'));
    });

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0]![0] as Question;
    expect(saved.type).toBe('mcq4');
    if (saved.type === 'mcq4') {
      expect(saved.stem.text).toBe('Thủ đô của Việt Nam là gì?');
      expect(saved.options[0].text).toBe('Hà Nội');
      expect(saved.correct).toBe(0);
    }
  });

  it('supports image attachment with SHA-256 hash in stem', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // Simulate file input change
    const file = new File(['fake-image-bytes-educlass'], 'diagram.png', {
      type: 'image/png',
    });
    const stemFileInput = screen.getByTestId('file-input-stem');

    await act(async () => {
      fireEvent.change(stemFileInput, {
        target: { files: [file] },
      });
    });

    // Wait for async compression & state update to render thumbnail
    await waitFor(() => {
      const thumbnails = screen.getAllByTestId('image-thumbnail');
      expect(thumbnails.length).toBeGreaterThan(0);
    });
  });

  it('supports removing attached image', async () => {
    const handleSave = vi.fn();
    render(
      <QuestionEditor
        onSave={handleSave}
        initialQuestion={{
          id: 'q_test_img',
          type: 'tf',
          points: 10,
          stem: {
            text: 'Câu hỏi có ảnh minh họa',
            images: ['data:image/png;base64,sampleimagebytes'],
          },
          correct: true,
        }}
      />,
    );

    // Initial thumbnail should exist
    expect(screen.getAllByTestId('image-thumbnail').length).toBe(1);

    // Click remove image button
    const removeBtn = screen.getByTestId('btn-remove-image-stem-0');
    act(() => {
      fireEvent.click(removeBtn);
    });

    // Thumbnail should be removed
    expect(screen.queryAllByTestId('image-thumbnail').length).toBe(0);
  });

  it('supports True/False question type (tf)', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // Switch tab to tf
    act(() => {
      fireEvent.click(screen.getByTestId('tab-type-tf'));
    });

    // Enter stem
    act(() => {
      fireEvent.change(screen.getByTestId('input-stem-text'), {
        target: { value: 'Mặt trời mọc ở hướng Đông.' },
      });
    });

    // Select True
    act(() => {
      fireEvent.click(screen.getByTestId('radio-tf-true'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('btn-save-question'));
    });

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0]![0] as Question;
    expect(saved.type).toBe('tf');
    if (saved.type === 'tf') {
      expect(saved.correct).toBe(true);
    }
  });

  it('supports True/False Group question type (tf_group) with 4 items', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // Switch to tf_group
    act(() => {
      fireEvent.click(screen.getByTestId('tab-type-tf_group'));
    });

    // Enter stem
    act(() => {
      fireEvent.change(screen.getByTestId('input-stem-text'), {
        target: { value: 'Cho hàm số $y = x^2$. Xét tính đúng/sai của các mệnh đề sau:' },
      });
    });

    // Enter 4 items
    act(() => {
      fireEvent.change(screen.getByTestId('input-item-a-text'), {
        target: { value: 'Hàm số đồng biến trên $(0; +\\infty)$' },
      });
      fireEvent.change(screen.getByTestId('input-item-b-text'), {
        target: { value: 'Hàm số nghịch biến trên $(0; +\\infty)$' },
      });
      fireEvent.change(screen.getByTestId('input-item-c-text'), {
        target: { value: 'Đồ thị đi qua điểm $O(0;0)$' },
      });
      fireEvent.change(screen.getByTestId('input-item-d-text'), {
        target: { value: 'Hàm số có giá trị nhỏ nhất bằng $-1$' },
      });
    });

    // Set answers: a=True, b=False, c=True, d=False
    act(() => {
      fireEvent.click(screen.getByTestId('item-a-true'));
      fireEvent.click(screen.getByTestId('item-b-false'));
      fireEvent.click(screen.getByTestId('item-c-true'));
      fireEvent.click(screen.getByTestId('item-d-false'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('btn-save-question'));
    });

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0]![0] as Question;
    expect(saved.type).toBe('tf_group');
    if (saved.type === 'tf_group') {
      expect(saved.items[0].correct).toBe(true);
      expect(saved.items[1].correct).toBe(false);
      expect(saved.items[2].correct).toBe(true);
      expect(saved.items[3].correct).toBe(false);
    }
  });

  it('supports Short Answer question type (short) with multiple accepted answers', async () => {
    const handleSave = vi.fn();
    render(<QuestionEditor onSave={handleSave} />);

    // Switch to short
    act(() => {
      fireEvent.click(screen.getByTestId('tab-type-short'));
    });

    // Enter stem
    act(() => {
      fireEvent.change(screen.getByTestId('input-stem-text'), {
        target: { value: 'Nước đóng băng ở bao nhiêu độ C?' },
      });
    });

    // Enter first accepted answer
    act(() => {
      fireEvent.change(screen.getByTestId('input-accepted-answer-0'), {
        target: { value: '0' },
      });
    });

    // Add another accepted answer
    act(() => {
      fireEvent.click(screen.getByTestId('btn-add-accepted-answer'));
    });

    act(() => {
      fireEvent.change(screen.getByTestId('input-accepted-answer-1'), {
        target: { value: '0 độ' },
      });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('btn-save-question'));
    });

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0]![0] as Question;
    expect(saved.type).toBe('short');
    if (saved.type === 'short') {
      expect(saved.accepted).toEqual(['0', '0 độ']);
    }
  });
});
