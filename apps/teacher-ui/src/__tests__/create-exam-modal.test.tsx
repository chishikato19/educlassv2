// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassDto } from '@educlass/protocol';
import { api, type QuestionSetItem } from '../api/client.js';
import { CreateExamModal } from '../components/CreateExamModal.js';

describe('CreateExamModal Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockClasses: ClassDto[] = [
    {
      id: 'cls_8a',
      name: 'Lớp 8A',
      year: 2026,
      ownerId: 'teacher_1',
      createdAt: 1000,
    },
    {
      id: 'cls_8b',
      name: 'Lớp 8B',
      year: 2026,
      ownerId: 'teacher_1',
      createdAt: 1000,
    },
  ];

  const mockQuestionSets: QuestionSetItem[] = [
    {
      id: 'qs_tin8',
      ownerId: 'teacher_1',
      title: 'Đề kiểm tra Tin học 8 HK1',
      subject: 'Tin học',
      grade: 8,
      tags: ['tin-hoc', 'hk1'],
      questionCount: 20,
      updatedAt: 2000,
    },
    {
      id: 'qs_toan8',
      ownerId: 'teacher_1',
      title: 'Đề kiểm tra Đại số 8',
      subject: 'Toán học',
      grade: 8,
      tags: ['toan'],
      questionCount: 15,
      updatedAt: 2100,
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'getQuestionSets').mockResolvedValue(mockQuestionSets);
    vi.spyOn(api, 'createExam').mockResolvedValue({
      id: 'exam_new',
      ownerId: 'teacher_1',
      classId: 'cls_8a',
      title: 'Đề kiểm tra Tin học 8 HK1',
      subject: 'Tin học',
      durationMinutes: 45,
      status: 'ready',
      currentBatch: 1,
      totalStudents: 40,
      submittedCount: 0,
      config: {
        shuffleQuestions: true,
        shuffleOptions: true,
        allowViewScore: true,
        allowViewReview: true,
        password: null,
      },
      records: [],
      questions: [],
      createdAt: 3000,
      updatedAt: 3000,
    });
  });

  it('hiển thị đầy đủ các trường thông tin và tự động nạp danh sách bộ đề', async () => {
    const showToast = vi.fn();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateExamModal
        isOpen={true}
        onClose={onClose}
        classes={mockClasses}
        questionSets={mockQuestionSets}
        onShowToast={showToast}
        onSuccess={onSuccess}
      />
    );

    // Kiểm tra tiêu đề modal
    expect(screen.getByText('Tạo Kỳ Thi Mới Theo Ca')).toBeDefined();

    // Kiểm tra các trường
    expect(screen.getByPlaceholderText(/VD: Kiểm tra 1 tiết/)).toBeDefined();
    expect(screen.getByText(/Lớp học áp dụng/)).toBeDefined();
    expect(screen.getByText(/Bộ đề từ Kho đề thi/)).toBeDefined();
    expect(screen.getByText(/Xáo trộn thứ tự câu hỏi/)).toBeDefined();
    expect(screen.getByText(/Xáo trộn thứ tự đáp án/)).toBeDefined();
  });

  it('báo lỗi khi để trống tiêu đề kỳ thi', async () => {
    const showToast = vi.fn();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateExamModal
        isOpen={true}
        onClose={onClose}
        classes={mockClasses}
        questionSets={mockQuestionSets}
        onShowToast={showToast}
        onSuccess={onSuccess}
      />
    );

    // Xóa tiêu đề nếu có
    const titleInput = screen.getByPlaceholderText(/VD: Kiểm tra 1 tiết/);
    fireEvent.change(titleInput, { target: { value: '' } });

    // Bấm nút Tạo kỳ thi
    const submitBtn = screen.getByText('➕ Tạo kỳ thi ngay');
    fireEvent.click(submitBtn);

    // Báo lỗi validation
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập tiêu đề kỳ thi.')).toBeDefined();
    });

    expect(api.createExam).not.toHaveBeenCalled();
  });

  it('cho phép chọn nhanh thời lượng làm bài qua các nút preset', async () => {
    const showToast = vi.fn();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateExamModal
        isOpen={true}
        onClose={onClose}
        classes={mockClasses}
        questionSets={mockQuestionSets}
        onShowToast={showToast}
        onSuccess={onSuccess}
      />
    );

    // Bấm nút preset 15 phút
    const btn15 = screen.getByText('15 phút');
    fireEvent.click(btn15);

    // Giá trị ô input chuyển thành 15
    const durationInput = screen.getByDisplayValue('15');
    expect(durationInput).toBeDefined();

    // Bấm nút preset 60 phút
    const btn60 = screen.getByText('60 phút');
    fireEvent.click(btn60);

    const durationInput60 = screen.getByDisplayValue('60');
    expect(durationInput60).toBeDefined();
  });

  it('gửi payload tạo kỳ thi chính xác lên backend khi submit', async () => {
    const showToast = vi.fn();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateExamModal
        isOpen={true}
        onClose={onClose}
        classes={mockClasses}
        questionSets={mockQuestionSets}
        onShowToast={showToast}
        onSuccess={onSuccess}
      />
    );

    // Nhập tiêu đề
    const titleInput = screen.getByPlaceholderText(/VD: Kiểm tra 1 tiết/);
    fireEvent.change(titleInput, { target: { value: 'Kiểm tra 1 tiết Tin 8 Đợt 1' } });

    // Bật xáo câu hỏi & xáo đáp án
    const shuffleQuestionsCheckbox = screen.getByLabelText(/Xáo trộn thứ tự câu hỏi/);
    fireEvent.click(shuffleQuestionsCheckbox);

    const shuffleOptionsCheckbox = screen.getByLabelText(/Xáo trộn thứ tự đáp án/);
    fireEvent.click(shuffleOptionsCheckbox);

    // Submit form
    const submitBtn = screen.getByText('➕ Tạo kỳ thi ngay');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'cls_8a',
          title: 'Kiểm tra 1 tiết Tin 8 Đợt 1',
          questionSetId: 'qs_tin8',
          config: expect.objectContaining({
            shuffleQuestions: true,
            shuffleOptions: true,
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('thành công'));
    });
  });
});
