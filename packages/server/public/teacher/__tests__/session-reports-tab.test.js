import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client.js';
import { SessionReportsTab } from '../components/SessionReportsTab.js';
describe('SessionReportsTab Component', () => {
    const mockReports = [
        {
            id: 'rep-1',
            sessionId: 'sess-1',
            sessionCode: '123456',
            className: 'Lớp 10A1',
            createdAt: 1700000000000,
            totalParticipants: 2,
            quizTitle: 'Kiểm tra 15 phút Toán',
            summary: {
                totalQuestions: 10,
                averageScore: 1600,
                averageAccuracy: 85,
                totalExpAwarded: 50,
            },
            scoreboard: [
                {
                    participantId: 'p-1',
                    displayName: 'Nguyễn Văn An',
                    identityLevel: 'roster',
                    score: 1800,
                    correctCount: 9,
                    totalQuestions: 10,
                    accuracy: 90,
                    expEarned: 30,
                    rank: 1,
                },
                {
                    participantId: 'p-2',
                    displayName: 'Trần Thị Bình',
                    identityLevel: 'roster',
                    score: 1400,
                    correctCount: 8,
                    totalQuestions: 10,
                    accuracy: 80,
                    expEarned: 20,
                    rank: 2,
                },
            ],
        },
    ];
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(api, 'getSessionReports').mockResolvedValue(mockReports);
        vi.spyOn(api, 'getQuizRuns').mockResolvedValue([]);
    });
    it('renders title, loads reports, and displays Quizizz summary table with required columns', async () => {
        await act(async () => {
            render(_jsx(SessionReportsTab, {}));
        });
        // Tiêu đề tab
        expect(screen.getByText('📊 Báo Cáo & Tổng Kết Quizizz')).toBeDefined();
        // Tên bài quiz trong danh sách và thẻ chi tiết
        expect(screen.getAllByText('Kiểm tra 15 phút Toán').length).toBeGreaterThan(0);
        // Bảng tổng kết có đủ họ tên, điểm số, tỉ lệ đúng, vị thứ
        expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
        expect(screen.getByText('Trần Thị Bình')).toBeDefined();
        expect(screen.getByText('90%')).toBeDefined();
        expect(screen.getByText('80%')).toBeDefined();
        expect(screen.getByText(/1,800/)).toBeDefined();
        expect(screen.getByText(/1,400/)).toBeDefined();
    });
    it('handles Excel export trigger when clicking export button', async () => {
        const handleExport = vi.fn();
        await act(async () => {
            render(_jsx(SessionReportsTab, { onExportExcel: handleExport }));
        });
        const exportBtn = screen.getByText('📥 Xuất file Excel');
        fireEvent.click(exportBtn);
        expect(handleExport).toHaveBeenCalledWith('sess-1');
    });
    it('displays multiple quizizz runs in a single session separately (Task: 1 phien thi nhieu lan quizizz)', async () => {
        const multiRunQuizList = [
            {
                sessionId: 'sess-active',
                runId: 'run-1',
                runIndex: 1,
                title: 'Lần 1: Khởi động Toán',
                totalQuestions: 5,
                totalParticipants: 1,
                averageScore: 1000,
                averageAccuracy: 100,
                difficultQuestions: [],
                scoreboard: [
                    {
                        participantId: 'p-1',
                        displayName: 'Học Sinh A',
                        identityLevel: 'roster',
                        score: 1000,
                        correctCount: 5,
                        totalQuestions: 5,
                        accuracy: 100,
                        expEarned: 20,
                        rank: 1,
                    },
                ],
            },
            {
                sessionId: 'sess-active',
                runId: 'run-2',
                runIndex: 2,
                title: 'Lần 2: Luyện tập nâng cao',
                totalQuestions: 10,
                totalParticipants: 1,
                averageScore: 1800,
                averageAccuracy: 90,
                difficultQuestions: [],
                scoreboard: [
                    {
                        participantId: 'p-1',
                        displayName: 'Học Sinh A',
                        identityLevel: 'roster',
                        score: 1800,
                        correctCount: 9,
                        totalQuestions: 10,
                        accuracy: 90,
                        expEarned: 30,
                        rank: 1,
                    },
                ],
            },
        ];
        vi.spyOn(api, 'getQuizRuns').mockResolvedValue(multiRunQuizList);
        await act(async () => {
            render(_jsx(SessionReportsTab, { activeSession: {
                    session: {
                        id: 'sess-active',
                        ownerId: 'teacher-1',
                        joinCode: '999888',
                        status: 'open',
                        identityMode: 'roster_or_guest',
                        allowTeams: false,
                        openedAt: 1000,
                    },
                    className: 'Lớp 11A2',
                    joinUrl: 'http://localhost/join',
                } }));
        });
        // Cả 2 lần thi đều xuất hiện trong danh sách
        expect(screen.getAllByText(/Lần 1: Khởi động Toán/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Lần 2: Luyện tập nâng cao/).length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=session-reports-tab.test.js.map