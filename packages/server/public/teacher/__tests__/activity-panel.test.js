import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityPanel } from '../components/ActivityPanel.js';
describe('ActivityPanel UI Component (apps/teacher-ui)', () => {
    const mockActivities = [
        {
            id: 'quick-poll',
            name: 'Bình Chọn Nhanh',
            version: 1,
            icon: '📊',
            description: 'Khảo sát ý kiến lớp học',
            capabilities: ['screen'],
            rewardTriggers: ['participation'],
        },
        {
            id: 'quiz-live',
            name: 'Quiz Trực Tiếp',
            version: 1,
            icon: '⚡',
            description: 'Đua top câu hỏi tốc độ',
            capabilities: ['screen'],
            rewardTriggers: ['top3', 'correct_answer'],
        },
    ];
    it('renders activity lobby with cards and metadata', () => {
        render(_jsx(ActivityPanel, { activities: mockActivities, activeRun: null, onStartActivity: vi.fn(), onSendTeacherIntent: vi.fn(), onEndActivity: vi.fn() }));
        expect(screen.getByTestId('activity-panel-lobby')).toBeDefined();
        expect(screen.getByText('Bình Chọn Nhanh')).toBeDefined();
        expect(screen.getByText('Quiz Trực Tiếp')).toBeDefined();
        expect(screen.getByText('⭐ participation')).toBeDefined();
    });
    it('opens config modal and submits to start activity', async () => {
        const handleStart = vi.fn();
        render(_jsx(ActivityPanel, { activities: mockActivities, activeRun: null, onStartActivity: handleStart, onSendTeacherIntent: vi.fn(), onEndActivity: vi.fn() }));
        const startBtn = screen.getByTestId('btn-start-quick-poll');
        act(() => {
            fireEvent.click(startBtn);
        });
        expect(screen.getByText('Cấu hình: Bình Chọn Nhanh')).toBeDefined();
        const qInput = screen.getByTestId('input-poll-question');
        const optInput = screen.getByTestId('textarea-poll-options');
        act(() => {
            fireEvent.change(qInput, { target: { value: 'Bạn có thích toán không?' } });
            fireEvent.change(optInput, { target: { value: 'Có\nKhông' } });
        });
        const submitBtn = screen.getByTestId('btn-submit-start-activity');
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(handleStart).toHaveBeenCalledWith('quick-poll', {
            question: 'Bạn có thích toán không?',
            options: ['Có', 'Không'],
            allowMultiple: false,
        });
    });
    it('renders running activity panel when activeRun exists', () => {
        const handleEnd = vi.fn();
        render(_jsx(ActivityPanel, { activities: mockActivities, activeRun: {
                runId: 'run_123',
                activityId: 'quick-poll',
                state: {
                    question: 'Bạn thích ăn gì?',
                    options: ['Phở', 'Bánh mì'],
                    votes: { p1: [0] },
                    allowMultiple: false,
                    isLocked: false,
                },
            }, onStartActivity: vi.fn(), onSendTeacherIntent: vi.fn(), onEndActivity: handleEnd }));
        expect(screen.getByTestId('activity-panel-running')).toBeDefined();
        expect(screen.getByText('Bạn thích ăn gì?')).toBeDefined();
        expect(screen.getByText(/1 người đã bình chọn/i)).toBeDefined();
        const endBtn = screen.getByTestId('btn-end-poll-activity');
        act(() => {
            fireEvent.click(endBtn);
        });
        expect(handleEnd).toHaveBeenCalledWith('run_123');
    });
    it('renders loading state correctly', () => {
        render(_jsx(ActivityPanel, { activities: [], activeRun: null, isLoading: true, onStartActivity: vi.fn(), onSendTeacherIntent: vi.fn(), onEndActivity: vi.fn() }));
        expect(screen.getByTestId('activity-panel-loading')).toBeDefined();
        expect(screen.getByText(/Đang tải thông tin hoạt động/i)).toBeDefined();
    });
});
//# sourceMappingURL=activity-panel.test.js.map