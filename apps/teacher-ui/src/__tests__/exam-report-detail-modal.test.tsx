// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamDetailDto } from '@educlass/protocol';
import { api } from '../api/client.js';
import { ExamReportDetailModal } from '../components/ExamReportDetailModal.js';

describe('ExamReportDetailModal Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockExamDetail: ExamDetailDto = {
    id: 'exam_1',
    ownerId: 'teacher_1',
    classId: 'cls_8a',
    className: 'Lớp 8A',
    title: 'Kiểm tra 1 tiết Tin học Kỳ 1',
    subject: 'Tin học',
    durationMinutes: 45,
    status: 'in_progress',
    currentBatch: 2,
    totalStudents: 40,
    submittedCount: 2,
    config: {
      shuffleQuestions: false,
      shuffleOptions: false,
      allowViewScore: true,
      allowViewReview: true,
      password: null,
    },
    records: [
      {
        id: 'rec_1',
        examId: 'exam_1',
        studentId: 'std_1',
        studentName: 'Nguyễn Văn An',
        studentCode: 'HS001',
        batchIndex: 1,
        status: 'submitted',
        score: 9.0,
        maxScore: 10,
        percentage: 90,
        correctCount: 9,
        totalQuestions: 10,
        answers: {},
        result: null,
        timeSpentSeconds: 1250,
        submittedAt: 1700000000000,
      },
      {
        id: 'rec_2',
        examId: 'exam_1',
        studentId: 'std_2',
        studentName: 'Trần Thị Bình',
        studentCode: 'HS002',
        batchIndex: 2,
        status: 'submitted',
        score: 4.5,
        maxScore: 10,
        percentage: 45,
        correctCount: 4,
        totalQuestions: 10,
        answers: {},
        result: null,
        timeSpentSeconds: 980,
        submittedAt: 1700003600000,
      },
    ],
    questions: [],
    stats: {
      averageScore: 6.8,
      highestScore: 9.0,
      lowestScore: 4.5,
      gradeDistribution: {
        tot: 1,
        kha: 0,
        dat: 0,
        chuaDat: 1,
      },
      questionAnalysis: [
        {
          questionId: 'q1',
          order: 1,
          correctRatio: 100,
          correctCount: 2,
          totalAnswered: 2,
        },
        {
          questionId: 'q2',
          order: 2,
          correctRatio: 50,
          correctCount: 1,
          totalAnswered: 2,
        },
      ],
    },
    createdAt: 1699990000000,
    updatedAt: 1700004000000,
  };

  beforeEach(() => {
    vi.spyOn(api, 'getExamDetail').mockResolvedValue(mockExamDetail);
  });

  it('nạp và hiển thị đầy đủ thông tin kỳ thi, thống kê điểm số và phổ điểm', async () => {
    const showToast = vi.fn();
    const onClose = vi.fn();

    render(
      <ExamReportDetailModal
        examId="exam_1"
        isOpen={true}
        onClose={onClose}
        onShowToast={showToast}
      />
    );

    // Chờ nạp API xong
    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Tin học Kỳ 1')).toBeDefined();
    });

    // Thống kê số liệu
    expect(screen.getByText('6.8 / 10')).toBeDefined();
    expect(screen.getAllByText('9').length).toBeGreaterThan(0); // highest
    expect(screen.getAllByText('4.5').length).toBeGreaterThan(0); // lowest

    // Phổ điểm
    expect(screen.getByText(/Giỏi \/ Tốt/)).toBeDefined();
    expect(screen.getAllByText(/Chưa đạt/).length).toBeGreaterThan(0);

    // Bảng điểm học sinh
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    expect(screen.getByText('Trần Thị Bình')).toBeDefined();
    expect(screen.getAllByText('Ca 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ca 2').length).toBeGreaterThan(0);
  });

  it('lọc danh sách học sinh theo ca thi', async () => {
    const showToast = vi.fn();
    const onClose = vi.fn();

    render(
      <ExamReportDetailModal
        examId="exam_1"
        isOpen={true}
        onClose={onClose}
        onShowToast={showToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('Trần Thị Bình')).toBeDefined();
    });

    // Chọn lọc Ca 1
    const select = screen.getByDisplayValue('Tất cả các ca');
    fireEvent.change(select, { target: { value: '1' } });

    // Chỉ còn Nguyễn Văn An (Ca 1), Trần Thị Bình (Ca 2) bị ẩn
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    expect(screen.queryByText('Trần Thị Bình')).toBeNull();
  });

  it('gọi api.downloadExamExcel khi bấm nút Tải bảng điểm Excel', async () => {
    const downloadSpy = vi.spyOn(api, 'downloadExamExcel').mockResolvedValue(undefined);
    const showToast = vi.fn();
    const onClose = vi.fn();

    render(
      <ExamReportDetailModal
        examId="exam_1"
        isOpen={true}
        onClose={onClose}
        onShowToast={showToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Tin học Kỳ 1')).toBeDefined();
    });

    const exportBtn = screen.getByText(/Tải bảng điểm Excel/);
    fireEvent.click(exportBtn);

    expect(downloadSpy).toHaveBeenCalledWith('exam_1', 'Kiểm tra 1 tiết Tin học Kỳ 1');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Đang tải bảng điểm Excel'));
  });
});
