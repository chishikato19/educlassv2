// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionBankTab, type QuestionSetItem } from '../components/QuestionBankTab.js';

describe('QuestionBankTab UI Component (apps/teacher-ui)', () => {
  const mockSets: QuestionSetItem[] = [
    {
      id: 'set_1',
      ownerId: 'teacher_1',
      title: 'Kiểm tra 15 phút Giải tích 12',
      subject: 'Toán',
      grade: 12,
      tags: ['Giải tích', 'Chương 1'],
      questionCount: 10,
      updatedAt: 1728100000000,
    },
    {
      id: 'set_2',
      ownerId: 'teacher_1',
      title: 'Ôn tập Quang học 11',
      subject: 'Vật lý',
      grade: 11,
      tags: ['Quang học', 'Thấu kính'],
      questionCount: 5,
      updatedAt: 1728200000000,
    },
    {
      id: 'set_3',
      ownerId: 'teacher_1',
      title: 'Hình học không gian 12',
      subject: 'Toán',
      grade: 12,
      tags: ['Hình học', 'Khối đa diện'],
      questionCount: 15,
      updatedAt: 1728300000000,
    },
  ];

  it('renders question sets list, tags, and summary statistics', () => {
    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    expect(screen.getByText('Kiểm tra 15 phút Giải tích 12')).toBeDefined();
    expect(screen.getByText('Ôn tập Quang học 11')).toBeDefined();
    expect(screen.getByText('Hình học không gian 12')).toBeDefined();

    expect(screen.getByText('10 câu hỏi')).toBeDefined();
    expect(screen.getByText('5 câu hỏi')).toBeDefined();
    expect(screen.getByText('15 câu hỏi')).toBeDefined();

    // Hiển thị tags
    expect(screen.getByText('#Quang học')).toBeDefined();
    expect(screen.getByText('#Khối đa diện')).toBeDefined();
  });

  it('filters question sets by search text and by selected tag', () => {
    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    // 1. Tìm kiếm theo text
    const searchInput = screen.getByTestId('input-search-question-sets');
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Quang học' } });
    });

    expect(screen.getByText('Ôn tập Quang học 11')).toBeDefined();
    expect(screen.queryByText('Kiểm tra 15 phút Giải tích 12')).toBeNull();

    // Xóa ô tìm kiếm
    act(() => {
      fireEvent.change(searchInput, { target: { value: '' } });
    });
    expect(screen.getByText('Kiểm tra 15 phút Giải tích 12')).toBeDefined();

    // 2. Lọc theo tag chip
    const tagChip = screen.getByTestId('tag-filter-Hình học');
    act(() => {
      fireEvent.click(tagChip);
    });

    expect(screen.getByText('Hình học không gian 12')).toBeDefined();
    expect(screen.queryByText('Ôn tập Quang học 11')).toBeNull();
  });

  it('opens create question set modal and submits form', async () => {
    const handleCreate = vi.fn();
    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={handleCreate}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    const openCreateBtn = screen.getByTestId('btn-open-create-set');
    act(() => {
      fireEvent.click(openCreateBtn);
    });

    const titleInput = screen.getByTestId('input-set-title');
    const subjectInput = screen.getByTestId('input-set-subject');
    const gradeSelect = screen.getByTestId('select-set-grade');
    const tagsInput = screen.getByTestId('input-set-tags');

    act(() => {
      fireEvent.change(titleInput, { target: { value: 'Đề Hóa học hữu cơ' } });
      fireEvent.change(subjectInput, { target: { value: 'Hóa học' } });
      fireEvent.change(gradeSelect, { target: { value: '11' } });
      fireEvent.change(tagsInput, { target: { value: 'Hóa học, Hữu cơ' } });
    });

    const submitBtn = screen.getByTestId('btn-submit-create-set');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleCreate).toHaveBeenCalledWith({
      title: 'Đề Hóa học hữu cơ',
      subject: 'Hóa học',
      grade: 11,
      tags: ['Hóa học', 'Hữu cơ'],
    });
  });

  it('triggers clone, delete and export callbacks', async () => {
    const handleClone = vi.fn();
    const handleDelete = vi.fn();
    const handleExport = vi.fn();

    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={handleDelete}
        onCloneQuestionSet={handleClone}
        onExportQuestionSet={handleExport}
        onImportQuestionSet={vi.fn()}
      />,
    );

    // Nhân bản set_1
    const cloneBtn = screen.getByTestId('btn-clone-set_1');
    await act(async () => {
      fireEvent.click(cloneBtn);
    });
    expect(handleClone).toHaveBeenCalledWith('set_1');

    // Xuất set_1
    const exportBtn = screen.getByTestId('btn-export-set_1');
    await act(async () => {
      fireEvent.click(exportBtn);
    });
    expect(handleExport).toHaveBeenCalledWith('set_1');

    // Xóa set_1
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtn = screen.getByTestId('btn-delete-set_1');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    expect(handleDelete).toHaveBeenCalledWith('set_1');
  });

  it('handles .educlass file import via file reader', async () => {
    const handleImport = vi.fn();

    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={handleImport}
      />,
    );

    const fileInput = screen.getByTestId('input-import-educlass');
    const fakePackage = {
      format: 'educlass',
      version: 1,
      exportedAt: 1728123456789,
      questionSet: {
        title: 'Đề thi nhập khẩu',
        subject: 'Sinh học',
        grade: 10,
        tags: ['Di truyền'],
      },
      questions: [],
      assets: [],
    };

    const file = new File([JSON.stringify(fakePackage)], 'test.educlass', {
      type: 'application/json',
    });
    file.text = () => Promise.resolve(JSON.stringify(fakePackage));

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(handleImport).toHaveBeenCalledWith(fakePackage);
  });

  it('renders empty and loading states correctly', () => {
    const { rerender } = render(
      <QuestionBankTab
        questionSets={[]}
        isLoading={true}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    expect(screen.getByText(/Đang tải danh sách bộ đề/i)).toBeDefined();

    rerender(
      <QuestionBankTab
        questionSets={[]}
        isLoading={false}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    expect(screen.getByText(/Chưa có bộ câu hỏi nào/i)).toBeDefined();
  });

  it('opens Word import modal when clicking Word import button', () => {
    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />,
    );

    const openWordBtn = screen.getByTestId('btn-open-word-import');
    act(() => {
      fireEvent.click(openWordBtn);
    });

    expect(screen.getByText('Nhập đề thi từ file Word (.docx)')).toBeDefined();
    expect(screen.getByText(/Hỗ trợ tự động chuyển công thức toán OMML sang LaTeX/i)).toBeDefined();
  });
});
