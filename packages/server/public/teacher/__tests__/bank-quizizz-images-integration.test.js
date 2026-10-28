import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityPanel } from '../components/ActivityPanel.js';
import { QuizLiveStudentView } from '@educlass/activity-quiz-live';
describe('UI Test: Question Bank to Quizizz with Question & Option Images', () => {
    const mockQuizizzSet = {
        id: 'set_matrix_quizizz_01',
        title: 'Bộ Đề Toán Ma Trận Có Hình Ảnh',
        subject: 'Toán',
        grade: 12,
        questionCount: 4,
        tags: ['Sinh từ Ma trận', 'Khối 12', 'Toán'],
    };
    const mockActivities = [
        {
            id: 'quiz-live',
            name: 'Quiz Trực Tiếp (Kahoot & Quizizz)',
            version: 1,
            icon: '⚡🎮',
            description: 'Trò chơi trắc nghiệm thi đấu trực tiếp',
            capabilities: ['screen'],
            rewardTriggers: ['top3', 'quiz_correct', 'streak'],
        },
    ];
    it('ActivityPanel correctly converts questions with images in stem and options and triggers Quizizz start', async () => {
        const handleStartActivity = vi.fn().mockResolvedValue(undefined);
        const handleLoadQuestionSet = vi.fn().mockResolvedValue({
            questions: [
                {
                    id: 'q_mcq_with_images',
                    type: 'mcq4',
                    stem: {
                        text: 'Đồ thị nào dưới đây là đồ thị của hàm số $y = x^3 - 3x$?',
                        images: ['hash_stem_graph_123'],
                    },
                    options: [
                        { text: 'Phương án A', images: ['hash_opt_a'] },
                        { text: 'Phương án B', images: ['hash_opt_b'] },
                        { text: 'Phương án C', images: ['hash_opt_c'] },
                        { text: 'Phương án D', images: ['hash_opt_d'] },
                    ],
                    correct: 0,
                    points: 1000,
                },
                {
                    id: 'q_tf_with_image',
                    type: 'tf',
                    stem: {
                        text: 'Hàm số đồng biến trên khoảng $(-\\infty; -1)$ như hình vẽ.',
                        images: ['hash_stem_tf_456'],
                    },
                    correct: true,
                    points: 1000,
                },
                {
                    id: 'q_short_with_image',
                    type: 'short',
                    stem: {
                        text: 'Có bao nhiêu điểm cực trị của hàm số trong khoảng $(-2; 2)$?',
                        images: ['hash_stem_short_789'],
                    },
                    accepted: ['2', 'hai'],
                    points: 1000,
                },
                {
                    id: 'q_matching',
                    type: 'matching',
                    stem: { text: 'Ghép nối đồ thị hàm số và tiệm cận tương ứng:' },
                    leftItems: [{ id: 'l1', text: 'Hàm số $y = \\frac{2x+1}{x-1}$' }],
                    rightItems: [{ id: 'r1', text: 'TCĐ: $x = 1$, TCN: $y = 2$' }],
                    correctPairs: { l1: 'r1' },
                    points: 1000,
                },
            ],
        });
        render(_jsx(ActivityPanel, { activities: mockActivities, activeRun: null, questionSets: [mockQuizizzSet], onLoadQuestionSet: handleLoadQuestionSet, onStartActivity: handleStartActivity, onSendTeacherIntent: vi.fn(), onEndActivity: vi.fn() }));
        // 1. Mở Modal cấu hình Quiz Live
        const startQuizBtn = screen.getByTestId('btn-start-quiz-live');
        act(() => {
            fireEvent.click(startQuizBtn);
        });
        // 2. Chọn bộ đề sinh từ ma trận
        const selectElem = screen.getByRole('combobox');
        act(() => {
            fireEvent.change(selectElem, { target: { value: 'set_matrix_quizizz_01' } });
        });
        // 3. Chọn chế độ Quizizz (Học sinh tự làm bài theo tốc độ cá nhân)
        const quizizzRadio = screen.getByDisplayValue('quizizz');
        act(() => {
            fireEvent.click(quizizzRadio);
        });
        // 4. Nhấn nút Bắt đầu
        const submitBtn = screen.getByTestId('btn-submit-start-activity');
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        // 5. Kiểm tra payload truyền cho onStartActivity
        expect(handleLoadQuestionSet).toHaveBeenCalledWith('set_matrix_quizizz_01');
        expect(handleStartActivity).toHaveBeenCalledWith('quiz-live', expect.objectContaining({
            title: 'Bộ Đề Toán Ma Trận Có Hình Ảnh',
            mode: 'quizizz',
            questions: expect.arrayContaining([
                // Câu hỏi MCQ4: có ảnh ở câu hỏi và mảng ảnh ở các phương án
                expect.objectContaining({
                    id: 'q_mcq_with_images',
                    type: 'mcq4',
                    stem: 'Đồ thị nào dưới đây là đồ thị của hàm số $y = x^3 - 3x$?',
                    image: '/api/assets/hash_stem_graph_123',
                    options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
                    optionImages: [
                        '/api/assets/hash_opt_a',
                        '/api/assets/hash_opt_b',
                        '/api/assets/hash_opt_c',
                        '/api/assets/hash_opt_d',
                    ],
                    correctAnswer: 0,
                }),
                // Câu hỏi Đúng/Sai: có ảnh câu hỏi
                expect.objectContaining({
                    id: 'q_tf_with_image',
                    type: 'tf',
                    stem: 'Hàm số đồng biến trên khoảng $(-\\infty; -1)$ như hình vẽ.',
                    image: '/api/assets/hash_stem_tf_456',
                    correctAnswer: true,
                }),
                // Câu hỏi Trả lời ngắn: có ảnh câu hỏi
                expect.objectContaining({
                    id: 'q_short_with_image',
                    type: 'short',
                    stem: 'Có bao nhiêu điểm cực trị của hàm số trong khoảng $(-2; 2)$?',
                    image: '/api/assets/hash_stem_short_789',
                    correctAnswer: ['2', 'hai'],
                }),
            ]),
        }));
    });
    it('QuizLiveStudentView renders question image and option images correctly for students', () => {
        const mockState = {
            title: 'Đề Thi Quizizz Trực Tuyến',
            mode: 'quizizz',
            status: 'in_question',
            currentQuestionIndex: 0,
            totalQuestions: 1,
            questions: [
                {
                    id: 'q1',
                    type: 'mcq4',
                    stem: 'Nhận diện đồ thị hình vẽ bên:',
                    image: '/api/assets/sample_graph_image.png',
                    options: ['Đồ thị A', 'Đồ thị B', 'Đồ thị C', 'Đồ thị D'],
                    optionImages: [
                        '/api/assets/opt_a.png',
                        '/api/assets/opt_b.png',
                        '/api/assets/opt_c.png',
                        '/api/assets/opt_d.png',
                    ],
                    timeLimit: 30,
                    points: 1000,
                },
            ],
            questionStartedAt: Date.now(),
            timeLimit: 30,
            participants: {
                p_student_1: {
                    participantId: 'p_student_1',
                    displayName: 'Học sinh Tuấn',
                    score: 0,
                    correctCount: 0,
                    currentStreak: 0,
                    maxStreak: 0,
                    currentIndex: 0,
                    isCompleted: false,
                    answers: {},
                    lastAnswer: null,
                    inventory: { maxCapacity: 2, queue: [] },
                    activeEffects: [],
                    personalNotification: null,
                    hiddenOptions: [],
                },
            },
            leaderboard: [],
            questionStats: { totalResponses: 0, optionCounts: {}, correctCount: 0 },
        };
        render(_jsx(QuizLiveStudentView, { runId: "run_test_1", state: mockState, participantId: "p_student_1", onSendIntent: vi.fn() }));
        // Kiểm tra ảnh của câu hỏi được render
        const stemImg = screen.getByAltText('Hình ảnh câu hỏi');
        expect(stemImg).toBeDefined();
        expect(stemImg.src).toContain('/api/assets/sample_graph_image.png');
        // Kiểm tra ảnh của 4 phương án được render
        const optAImg = screen.getByAltText('Ảnh đáp án ▲');
        expect(optAImg).toBeDefined();
        expect(optAImg.src).toContain('/api/assets/opt_a.png');
        const optBImg = screen.getByAltText('Ảnh đáp án ◆');
        expect(optBImg).toBeDefined();
        expect(optBImg.src).toContain('/api/assets/opt_b.png');
    });
});
//# sourceMappingURL=bank-quizizz-images-integration.test.js.map