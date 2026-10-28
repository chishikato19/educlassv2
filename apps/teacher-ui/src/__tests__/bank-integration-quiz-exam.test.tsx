// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityMeta, ClassDto } from '@educlass/protocol';
import { ActivityPanel, type QuestionSetSummary } from '../components/ActivityPanel.js';
import { CreateExamModal } from '../components/CreateExamModal.js';
import { QuestionBankTab, type QuestionSetItem } from '../components/QuestionBankTab.js';
import { api } from '../api/client.js';

vi.mock('../api/client.js', () => ({
  api: {
    createExam: vi.fn().mockResolvedValue({ id: 'exam_123', title: 'Kỳ thi Toán Ma trận' }),
    getQuestionSets: vi.fn().mockResolvedValue([]),
    getQuestionSet: vi.fn().mockResolvedValue({ id: 'set_matrix_01', questions: [] }),
  },
}));

describe('Task 4.3: Integration between Question Bank Matrix and Quizizz / Exam', () => {
  const mockMatrixQuestionSet: QuestionSetSummary = {
    id: 'set_matrix_01',
    title: 'Đề Ôn Tập Ma Trận Học Kỳ 1',
    subject: 'Toán',
    grade: 12,
    questionCount: 4,
    tags: ['Sinh từ Ma trận', 'Khối 12', 'Toán'],
  };

  const mockNormalQuestionSet: QuestionSetSummary = {
    id: 'set_normal_01',
    title: 'Đề Tự Luận Nhập Tay',
    subject: 'Vật lý',
    grade: 11,
    questionCount: 5,
    tags: ['Ôn tập'],
  };

  const mockActivities: ActivityMeta[] = [
    {
      id: 'quiz-live',
      name: 'Quiz Trực Tiếp (Kahoot & Quizizz)',
      version: 1,
      icon: '🎮',
      description: 'Trò chơi trắc nghiệm thi đấu trực tiếp',
      capabilities: ['screen'],
      rewardTriggers: ['top3', 'correct_answer'],
    },
    {
      id: 'exam',
      name: 'Kỳ Thi Trực Tuyến',
      version: 1,
      icon: '📝',
      description: 'Kiểm tra trắc nghiệm độc lập',
      capabilities: ['screen'],
      rewardTriggers: ['score_threshold'],
    },
  ];

  it('ActivityPanel displays matrix indicator for sets generated from matrix and starts Quiz Live', async () => {
    const handleStartActivity = vi.fn().mockResolvedValue(undefined);
    const handleLoadQuestionSet = vi.fn().mockResolvedValue({
      questions: [
        {
          id: 'q_matrix_nb',
          type: 'mcq4',
          stem: { text: 'Cho hàm số y = f(x). Khẳng định nào sau đây đúng?', images: [] },
          options: [
            { text: 'Phương án A' },
            { text: 'Phương án B' },
            { text: 'Phương án C' },
            { text: 'Phương án D' },
          ],
          correct: 1,
          points: 10,
        },
        {
          id: 'q_matrix_th',
          type: 'tf',
          stem: { text: 'Đồ thị hàm số bậc ba luôn có tâm đối xứng.', images: [] },
          correct: true,
          points: 10,
        },
        {
          id: 'q_matrix_vd',
          type: 'short',
          stem: { text: 'Tìm giá trị lớn nhất của hàm số trên đoạn [0; 2].', images: [] },
          accepted: ['5', '5.0'],
          points: 10,
        },
      ],
    });

    render(
      <ActivityPanel
        activities={mockActivities}
        activeRun={null}
        questionSets={[mockMatrixQuestionSet, mockNormalQuestionSet]}
        onLoadQuestionSet={handleLoadQuestionSet}
        onStartActivity={handleStartActivity}
        onSendTeacherIntent={vi.fn()}
        onEndActivity={vi.fn()}
      />
    );

    // 1. Mở modal cấu hình cho Quiz Live
    const startQuizBtn = screen.getByTestId('btn-start-quiz-live');
    act(() => {
      fireEvent.click(startQuizBtn);
    });

    expect(screen.getByText('Cấu hình: Quiz Trực Tiếp (Kahoot & Quizizz)')).toBeDefined();

    // 2. Kiểm tra nhãn hiển thị trong dropdown bộ đề
    const selectElem = screen.getByRole('combobox');
    expect(
      screen.getByText('🎯 [Ma trận] Đề Ôn Tập Ma Trận Học Kỳ 1 (4 câu) - Toán')
    ).toBeDefined();
    expect(screen.getByText('Đề Tự Luận Nhập Tay (5 câu) - Vật lý')).toBeDefined();

    // 3. Chọn bộ đề sinh từ Ma trận
    act(() => {
      fireEvent.change(selectElem, { target: { value: 'set_matrix_01' } });
    });

    // Tiêu đề quiz tự động cập nhật
    const titleInput = screen.getByTestId('input-quiz-title') as HTMLInputElement;
    expect(titleInput.value).toBe('Đề Ôn Tập Ma Trận Học Kỳ 1');

    // 4. Chọn chế độ Quizizz (tự theo tốc độ học sinh)
    const quizizzRadio = screen.getByDisplayValue('quizizz');
    act(() => {
      fireEvent.click(quizizzRadio);
    });

    // 5. Bấm khởi chạy hoạt động
    const submitBtn = screen.getByTestId('btn-submit-start-activity');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 6. Kiểm tra onStartActivity nhận cấu hình chính xác
    expect(handleLoadQuestionSet).toHaveBeenCalledWith('set_matrix_01');
    expect(handleStartActivity).toHaveBeenCalledWith(
      'quiz-live',
      expect.objectContaining({
        title: 'Đề Ôn Tập Ma Trận Học Kỳ 1',
        mode: 'quizizz',
        questions: expect.arrayContaining([
          expect.objectContaining({
            id: 'q_matrix_nb',
            type: 'mcq4',
            stem: 'Cho hàm số y = f(x). Khẳng định nào sau đây đúng?',
            options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
            correctAnswer: 1,
          }),
          expect.objectContaining({
            id: 'q_matrix_th',
            type: 'tf',
            stem: 'Đồ thị hàm số bậc ba luôn có tâm đối xứng.',
            correctAnswer: true,
          }),
          expect.objectContaining({
            id: 'q_matrix_vd',
            type: 'short',
            stem: 'Tìm giá trị lớn nhất của hàm số trên đoạn [0; 2].',
            correctAnswer: ['5', '5.0'],
          }),
        ]),
      })
    );
  });

  it('CreateExamModal displays matrix badge and creates exam successfully', async () => {
    const mockClasses: ClassDto[] = [
      {
        id: 'class_12a1',
        name: '12A1',
        ownerId: 'teacher_1',
        year: 2026,
        createdAt: 1700000000000,
      },
    ];
    const mockQuestionSetsList: QuestionSetItem[] = [
      {
        id: 'set_matrix_01',
        ownerId: 'teacher_1',
        title: 'Đề Ma Trận Khối 12',
        subject: 'Toán',
        grade: 12,
        questionCount: 20,
        tags: ['Sinh từ Ma trận', 'Khối 12'],
        updatedAt: 1728100000000,
      },
    ];

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <CreateExamModal
        isOpen={true}
        onClose={handleClose}
        classes={mockClasses}
        onShowToast={vi.fn()}
        onSuccess={handleSuccess}
        questionSets={mockQuestionSetsList}
      />
    );

    // Kiểm tra dropdown hiển thị ký hiệu ma trận
    expect(screen.getByText('🎯 [Ma trận] Đề Ma Trận Khối 12 (20 câu)')).toBeDefined();

    // Bấm Submit tạo kỳ thi
    const submitBtn = screen.getByRole('button', { name: /Tạo kỳ thi ngay/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(api.createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'class_12a1',
          questionSetId: 'set_matrix_01',
          title: 'Đề Ma Trận Khối 12',
          subject: 'Toán',
        })
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('QuestionBankTab renders matrix badge on question set card', () => {
    const mockSets: QuestionSetItem[] = [
      {
        id: 'set_matrix_01',
        ownerId: 'teacher_1',
        title: 'Đề Kiểm Tra Định Kỳ Ma Trận',
        subject: 'Toán',
        grade: 12,
        tags: ['Sinh từ Ma trận', 'Khối 12'],
        questionCount: 15,
        updatedAt: 1728100000000,
      },
    ];

    render(
      <QuestionBankTab
        questionSets={mockSets}
        onCreateQuestionSet={vi.fn()}
        onDeleteQuestionSet={vi.fn()}
        onCloneQuestionSet={vi.fn()}
        onExportQuestionSet={vi.fn()}
        onImportQuestionSet={vi.fn()}
      />
    );

    expect(screen.getByTestId('badge-matrix-set_matrix_01')).toBeDefined();
    expect(screen.getByText('🎯 Ma trận')).toBeDefined();
  });
});
