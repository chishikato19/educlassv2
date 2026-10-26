// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BankCurriculumTree } from '../components/BankCurriculumTree.js';
import type { BankCurriculumTreeNode } from '@educlass/protocol';

describe('BankCurriculumTree Component (Task 3.2)', () => {
  const mockTree: BankCurriculumTreeNode[] = [
    {
      chapter: 'Chương 1: Ứng dụng đạo hàm',
      totalQuestions: 15,
      lessons: [
        {
          lesson: 'Bài 1: Tính đơn điệu',
          totalQuestions: 8,
          countsByDifficulty: { nb: 4, th: 2, vd: 1, vdc: 1 },
        },
        {
          lesson: 'Bài 2: Cực trị hàm số',
          totalQuestions: 7,
          countsByDifficulty: { nb: 3, th: 2, vd: 2, vdc: 0 },
        },
      ],
    },
    {
      chapter: 'Chương 2: Hàm số lũy thừa',
      totalQuestions: 5,
      lessons: [
        {
          lesson: 'Bài 1: Lũy thừa',
          totalQuestions: 5,
          countsByDifficulty: { nb: 2, th: 2, vd: 1, vdc: 0 },
        },
      ],
    },
  ];

  it('renders curriculum tree with grade, subject, and chapter accordions', () => {
    const onGradeChange = vi.fn();
    const onSubjectChange = vi.fn();
    const onSelectLesson = vi.fn();
    const onClearSelection = vi.fn();

    render(
      <BankCurriculumTree
        tree={mockTree}
        currentGrade={12}
        currentSubject="Toán"
        selectedChapter={null}
        selectedLesson={null}
        onGradeChange={onGradeChange}
        onSubjectChange={onSubjectChange}
        onSelectLesson={onSelectLesson}
        onClearSelection={onClearSelection}
      />,
    );

    // Kiểm tra render tổng số câu (15 + 5 = 20 câu)
    expect(screen.getByText('20 câu')).toBeDefined();
    expect(screen.getByText('Chương 1: Ứng dụng đạo hàm')).toBeDefined();
    expect(screen.getByText('Chương 2: Hàm số lũy thừa')).toBeDefined();
    expect(screen.getByText('Bài 1: Tính đơn điệu')).toBeDefined();
  });

  it('allows clicking on a lesson to filter questions', () => {
    const onSelectLesson = vi.fn();

    render(
      <BankCurriculumTree
        tree={mockTree}
        currentGrade={12}
        currentSubject="Toán"
        selectedChapter="Chương 1: Ứng dụng đạo hàm"
        selectedLesson={null}
        onGradeChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onSelectLesson={onSelectLesson}
        onClearSelection={vi.fn()}
      />,
    );

    const lessonBtn = screen.getByTitle('Bài 1: Tính đơn điệu (8 câu)');
    fireEvent.click(lessonBtn);
    expect(onSelectLesson).toHaveBeenCalledWith(
      'Chương 1: Ứng dụng đạo hàm',
      'Bài 1: Tính đơn điệu',
    );
  });

  it('renders friendly empty state when tree is empty', () => {
    render(
      <BankCurriculumTree
        tree={[]}
        currentGrade={10}
        currentSubject="Vật lý"
        selectedChapter={null}
        selectedLesson={null}
        onGradeChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onSelectLesson={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByText('Chưa có câu hỏi')).toBeDefined();
    expect(
      screen.getByText('Môn Vật lý - Khối 10 chưa có bài học nào trong ngân hàng.'),
    ).toBeDefined();
  });
});
