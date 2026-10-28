// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassDto, ExamListItemDto, SessionDetailResponse } from '@educlass/protocol';
import { api } from '../api/client.js';
import { ExamReportsTab } from '../components/ExamReportsTab.js';

describe('ExamReportsTab Component', () => {
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

  const mockSession: SessionDetailResponse = {
    session: {
      id: 'sess_live',
      classId: 'cls_8a',
      joinCode: '888999',
      status: 'open',
      ownerId: 'teacher_1',
      identityMode: 'roster_only',
      allowTeams: false,
      openedAt: 2000,
    },
  };

  const mockExams: ExamListItemDto[] = [
    {
      id: 'exam_1',
      ownerId: 'teacher_1',
      classId: 'cls_8a',
      className: 'Lớp 8A',
      title: 'Kiểm tra 1 tiết Tin học',
      subject: 'Tin học',
      durationMinutes: 45,
      status: 'waiting_next_batch',
      currentBatch: 1,
      totalStudents: 40,
      submittedCount: 20,
      averageScore: 8.5,
      createdAt: 1000,
      updatedAt: 1200,
    },
    {
      id: 'exam_2',
      ownerId: 'teacher_1',
      classId: 'cls_8a',
      className: 'Lớp 8A',
      title: 'Thi thử học kỳ 1',
      subject: 'Toán học',
      durationMinutes: 60,
      status: 'in_progress',
      currentBatch: 2,
      activeSessionId: 'sess_live',
      activeSessionJoinCode: '888999',
      totalStudents: 40,
      submittedCount: 15,
      averageScore: 7.2,
      createdAt: 2000,
      updatedAt: 2200,
    },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'getExams').mockResolvedValue(mockExams);
    vi.spyOn(api, 'startExamBatch').mockResolvedValue({ ok: true, exam: {} });
    vi.spyOn(api, 'pauseExamBatch').mockResolvedValue({ ok: true, exam: {} });
    vi.spyOn(api, 'finishExam').mockResolvedValue({ ok: true, exam: {} });
  });

  it('hiển thị danh sách các kỳ thi và thông tin tiến độ', async () => {
    const showToast = vi.fn();
    render(
      <ExamReportsTab classes={mockClasses} activeSession={mockSession} onShowToast={showToast} />
    );

    // Chờ nạp dữ liệu xong
    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Tin học')).toBeDefined();
      expect(screen.getByText('Thi thử học kỳ 1')).toBeDefined();
    });

    // Kiểm tra thông tin tiến độ
    expect(screen.getByText(/20\/40 HS \(50%\)/)).toBeDefined();
    expect(screen.getByText(/15\/40 HS \(38%\)/)).toBeDefined();

    // Kiểm tra huy hiệu trạng thái
    expect(screen.getByText(/Chờ ca tiếp theo \(Đã thi Ca 1\)/)).toBeDefined();
    expect(screen.getByText(/Đang mở Ca 2 \(Phòng 888999\)/)).toBeDefined();
  });

  it('mở modal xác nhận khi bấm mở ca tiếp theo trong phiên học', async () => {
    const showToast = vi.fn();
    render(
      <ExamReportsTab classes={mockClasses} activeSession={mockSession} onShowToast={showToast} />
    );

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra 1 tiết Tin học')).toBeDefined();
    });

    // Bấm nút "▶ Mở Ca 2 trong phiên này"
    const startBatchBtn = screen.getByText('▶ Mở Ca 2 trong phiên này');
    fireEvent.click(startBatchBtn);

    // Modal hiển thị
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận mở Ca 2/)).toBeDefined();
      expect(screen.getByText(/Cơ chế khóa an toàn/)).toBeDefined();
    });

    // Bấm nút Xác nhận
    const confirmBtn = screen.getByText(/Xác nhận mở Ca thi/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.startExamBatch).toHaveBeenCalledWith('exam_1', {
        sessionId: 'sess_live',
        batchIndex: 2,
      });
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Đã kích hoạt Ca 2'));
    });
  });

  it('mở modal xác nhận khi bấm tạm dừng ca thi đang mở', async () => {
    const showToast = vi.fn();
    render(
      <ExamReportsTab classes={mockClasses} activeSession={mockSession} onShowToast={showToast} />
    );

    await waitFor(() => {
      expect(screen.getByText('Thi thử học kỳ 1')).toBeDefined();
    });

    // Bấm nút "⏸ Tạm dừng ca 2"
    const pauseBtn = screen.getByText('⏸ Tạm dừng ca 2');
    fireEvent.click(pauseBtn);

    // Modal hiển thị
    await waitFor(() => {
      expect(screen.getByText(/Tạm dừng Ca 2/)).toBeDefined();
      expect(screen.getByText(/kết quả bài nộp của học sinh Ca 2 đã được ghi nhận/)).toBeDefined();
    });

    // Bấm nút Xác nhận
    const confirmBtn = screen.getByText(/Xác nhận.*tạm dừng/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.pauseExamBatch).toHaveBeenCalledWith('exam_2');
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Đã tạm dừng Ca 2'));
    });
  });

  it('hiển thị giao diện rỗng khi không có kỳ thi nào', async () => {
    vi.spyOn(api, 'getExams').mockResolvedValue([]);
    const showToast = vi.fn();
    render(
      <ExamReportsTab classes={mockClasses} activeSession={mockSession} onShowToast={showToast} />
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa có kỳ thi nào')).toBeDefined();
    });
  });
});
