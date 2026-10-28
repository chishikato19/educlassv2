import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App.js';

// Mock API client
vi.mock('../api/client.js', () => ({
  api: {
    getTeachers: vi
      .fn()
      .mockResolvedValue([
        { id: 'u1', username: 'mai.toan', displayName: 'Cô Mai', role: 'teacher' },
      ]),
    login: vi.fn().mockResolvedValue({
      token: 'fake-token',
      user: {
        id: 'u1',
        username: 'mai.toan',
        displayName: 'Cô Mai',
        role: 'teacher',
        active: true,
        createdAt: Date.now(),
      },
    }),
    registerTeacher: vi.fn().mockResolvedValue({
      id: 'u2',
      username: 'nam.ly',
      displayName: 'Thầy Nam',
      role: 'teacher',
      active: true,
      createdAt: Date.now(),
    }),
    resetPin: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getClasses: vi
      .fn()
      .mockResolvedValue([
        { id: 'c1', name: 'Lớp 10A1', year: 2026, ownerId: 'u1', createdAt: Date.now() },
      ]),
    getStudents: vi.fn().mockResolvedValue([
      {
        id: 's1',
        classId: 'c1',
        fullName: 'Nguyễn Văn An',
        code: 'HS01',
        hasPin: false,
        exp: 50,
        createdAt: Date.now(),
      },
    ]),
    getQuestionSets: vi.fn().mockResolvedValue([
      {
        id: 'qs1',
        ownerId: 'u1',
        title: 'Đề Toán ôn tập',
        subject: 'Toán',
        grade: 10,
        tags: ['toan'],
        questionCount: 5,
        updatedAt: Date.now(),
      },
    ]),
    getActivities: vi
      .fn()
      .mockResolvedValue([
        { id: 'quiz-live', name: 'Quiz Live', version: '1.0.0', author: 'EduClass' },
      ]),
    getRewardRules: vi.fn().mockResolvedValue({
      globalRules: [],
      teacherRules: [],
      effectiveRules: [],
      sessionCap: 100,
      activityCaps: {},
    }),
    getActiveSession: vi.fn().mockResolvedValue(null),
    ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
    getBankTree: vi.fn().mockResolvedValue([]),
    getBankQuestions: vi.fn().mockResolvedValue([]),
  },
}));

async function loginTeacher() {
  await waitFor(() => {
    expect(screen.getByText('Cô Mai')).toBeDefined();
  });
  fireEvent.click(screen.getByText('Cô Mai'));
  await waitFor(() => {
    expect(screen.getByText(/Nhập mã PIN Giáo viên/i)).toBeDefined();
  });
  fireEvent.click(screen.getByText('1'));
  fireEvent.click(screen.getByText('2'));
  fireEvent.click(screen.getByText('3'));
  fireEvent.click(screen.getByText('4'));
}

describe('Teacher App Shell (apps/teacher-ui)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders teacher login screen first, then unlocks to dashboard on PIN entry', async () => {
    render(<App />);

    expect(screen.getByText(/Chọn tài khoản giáo viên/i)).toBeDefined();
    await loginTeacher();

    await waitFor(() => {
      expect(screen.getAllByText(/EduClass v2/i).length).toBeGreaterThan(0);
      expect(screen.getByTestId('teacher-app-version-badge')).toBeDefined();
      expect(screen.getByText(/Phiên học & Hoạt động/i)).toBeDefined();
      expect(screen.getByText(/Lớp học & Học sinh/i)).toBeDefined();
      expect(screen.getByText(/Kho đề thi & Câu hỏi/i)).toBeDefined();
      expect(screen.getByText(/Cài đặt Thưởng EXP/i)).toBeDefined();
      expect(screen.getByText(/Báo cáo & Tổng kết/i)).toBeDefined();
      expect(screen.getByText('⏻ Đổi giáo viên')).toBeDefined();
    });
  });

  it('switches to Lớp học tab and renders class list', async () => {
    render(<App />);
    await loginTeacher();

    await waitFor(() => {
      expect(screen.getByText(/Lớp học & Học sinh/i)).toBeDefined();
    });

    const classTabBtn = screen.getByText(/Lớp học & Học sinh/i);
    fireEvent.click(classTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('class-item-c1')).toBeDefined();
    });
  });

  it('switches to Kho đề thi tab and renders question sets', async () => {
    render(<App />);
    await loginTeacher();

    await waitFor(() => {
      expect(screen.getByText(/Kho đề thi & Câu hỏi/i)).toBeDefined();
    });

    const questionsTabBtn = screen.getByText(/Kho đề thi & Câu hỏi/i);
    fireEvent.click(questionsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Kho bộ đề thi/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText(/Kho bộ đề thi/i));

    await waitFor(() => {
      expect(screen.getByText(/Đề Toán ôn tập/)).toBeDefined();
    });
  });

  it('switches to Cài đặt EXP tab and renders rules', async () => {
    render(<App />);
    await loginTeacher();

    await waitFor(() => {
      expect(screen.getByText(/Cài đặt Thưởng EXP/i)).toBeDefined();
    });

    const expTabBtn = screen.getByText(/Cài đặt Thưởng EXP/i);
    fireEvent.click(expTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cài đặt Quy tắc & Thưởng EXP/i)).toBeDefined();
    });
  });
});
