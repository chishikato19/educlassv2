// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  Mcq4Question,
  TfQuestion,
  TfGroupQuestion,
  ShortQuestion,
} from '@educlass/question-kit';
import { QuestionCardPreview } from '../components/QuestionCardPreview.js';

describe('QuestionCardPreview Component', () => {
  const mcqQuestion: Mcq4Question = {
    id: 'q1',
    type: 'mcq4',
    stem: { text: 'Thủ đô của Việt Nam là gì?', images: [] },
    options: [
      { text: 'Hà Nội', images: [] },
      { text: 'TP. Hồ Chí Minh', images: [] },
      { text: 'Đà Nẵng', images: [] },
      { text: 'Huế', images: [] },
    ],
    correct: 0,
    points: 10,
    explanation: { text: 'Hà Nội là thủ đô từ năm 1976.', images: [] },
  };

  it('renders MCQ4 question stem, all options, and marks correct answer', () => {
    render(
      <QuestionCardPreview question={mcqQuestion} index={0} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText('Câu 1')).toBeDefined();
    expect(screen.getByText('Trắc nghiệm 4 lựa chọn')).toBeDefined();
    expect(screen.getByText('10 điểm')).toBeDefined();
    expect(screen.getByText(/Thủ đô của Việt Nam là gì\?/)).toBeDefined();

    expect(screen.getByText('Hà Nội')).toBeDefined();
    expect(screen.getByText('TP. Hồ Chí Minh')).toBeDefined();
    expect(screen.getByText('Đà Nẵng')).toBeDefined();
    expect(screen.getByText('Huế')).toBeDefined();

    expect(screen.getByText('✓ Đáp án đúng')).toBeDefined();
    expect(screen.getByText(/Hà Nội là thủ đô từ năm 1976/)).toBeDefined();
  });

  it('renders True/False question and correct answer badge', () => {
    const tfQuestion: TfQuestion = {
      id: 'q2',
      type: 'tf',
      stem: { text: 'Trái Đất quay quanh Mặt Trời.', images: [] },
      correct: true,
      points: 5,
    };

    render(
      <QuestionCardPreview question={tfQuestion} index={1} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText('Câu 2')).toBeDefined();
    expect(screen.getByText('Đúng / Sai')).toBeDefined();
    expect(screen.getByText(/Trái Đất quay quanh Mặt Trời/)).toBeDefined();
    expect(screen.getByText('ĐÚNG (True)')).toBeDefined();
  });

  it('renders TF Group question with 4 statements and their individual T/F status', () => {
    const tfGroupQuestion: TfGroupQuestion = {
      id: 'q3',
      type: 'tf_group',
      stem: { text: 'Cho hàm số y = f(x):', images: [] },
      items: [
        { text: { text: 'Hàm số đồng biến trên R', images: [] }, correct: true },
        { text: { text: 'Hàm số có 2 cực trị', images: [] }, correct: false },
        { text: { text: 'Đồ thị cắt trục tung tại (0, 1)', images: [] }, correct: true },
        { text: { text: 'Giá trị nhỏ nhất bằng 0', images: [] }, correct: false },
      ],
      points: 10,
    };

    render(
      <QuestionCardPreview
        question={tfGroupQuestion}
        index={2}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Câu 3')).toBeDefined();
    expect(screen.getByText('Đúng / Sai 4 ý (BGD)')).toBeDefined();
    expect(screen.getByText(/Hàm số đồng biến trên R/)).toBeDefined();
    expect(screen.getByText(/Hàm số có 2 cực trị/)).toBeDefined();
    expect(screen.getAllByText('✓ ĐÚNG').length).toBe(2);
    expect(screen.getAllByText('✗ SAI').length).toBe(2);
  });

  it('renders Short Answer question with accepted values', () => {
    const shortQuestion: ShortQuestion = {
      id: 'q4',
      type: 'short',
      stem: { text: 'Năm diễn ra Cách mạng Tháng Tám?', images: [] },
      accepted: ['1945'],
      points: 5,
    };

    render(
      <QuestionCardPreview question={shortQuestion} index={3} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText('Câu 4')).toBeDefined();
    expect(screen.getByText('Trả lời ngắn')).toBeDefined();
    expect(screen.getByText('1945')).toBeDefined();
  });

  it('triggers onEdit and onDelete callbacks', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QuestionCardPreview
        question={mcqQuestion}
        index={0}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    fireEvent.click(screen.getByText('Sửa câu'));
    expect(handleEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Xóa'));
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('hides answers when showAnswers is false', () => {
    render(
      <QuestionCardPreview
        question={mcqQuestion}
        index={0}
        showAnswers={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/Thủ đô của Việt Nam là gì\?/)).toBeDefined();
    expect(screen.queryByText('✓ Đáp án đúng')).toBeNull();
  });
});
