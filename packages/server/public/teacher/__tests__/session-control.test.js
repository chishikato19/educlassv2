import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionControl } from '../components/SessionControl.js';
describe('SessionControl UI Component (apps/teacher-ui)', () => {
    const mockClasses = [
        {
            id: 'class_1',
            ownerId: 'teacher_1',
            name: '12A1',
            year: 2026,
            createdAt: 1000,
        },
        {
            id: 'class_2',
            ownerId: 'teacher_1',
            name: '12A2',
            year: 2026,
            createdAt: 1050,
        },
    ];
    it('renders open session card when inactive, opens modal and triggers onOpenSession', async () => {
        const handleOpenSession = vi.fn();
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: null, onOpenSession: handleOpenSession, onCloseSession: vi.fn() }));
        // Màn hình khởi đầu
        expect(screen.getByTestId('open-session-card')).toBeDefined();
        const openBtn = screen.getByTestId('btn-open-session-modal');
        act(() => {
            fireEvent.click(openBtn);
        });
        // Chọn lớp 12A1
        const selectClass = screen.getByTestId('select-class');
        act(() => {
            fireEvent.change(selectClass, { target: { value: 'class_1' } });
        });
        // Bật chia nhóm
        const teamsCheckbox = screen.getByTestId('checkbox-allow-teams');
        act(() => {
            fireEvent.click(teamsCheckbox);
        });
        // Bấm nút Mở phiên
        const submitBtn = screen.getByTestId('btn-submit-open-session');
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(handleOpenSession).toHaveBeenCalledWith({
            classId: 'class_1',
            identityMode: 'roster_or_guest',
            allowTeams: true,
            allowPairing: false,
            maxStudentsPerDevice: 2,
        });
    });
    it('allows teacher to configure multi-student pairing (Task 3.1 & 3.2)', async () => {
        const handleOpenSession = vi.fn();
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: null, onOpenSession: handleOpenSession, onCloseSession: vi.fn() }));
        act(() => {
            fireEvent.click(screen.getByTestId('btn-open-session-modal'));
        });
        const selectClass = screen.getByTestId('select-class');
        act(() => {
            fireEvent.change(selectClass, { target: { value: 'class_1' } });
        });
        // Bật ghép máy
        const pairingCheckbox = screen.getByTestId('checkbox-allow-pairing');
        act(() => {
            fireEvent.click(pairingCheckbox);
        });
        // Chọn tối đa 3 bạn / máy
        const selectMax = screen.getByTestId('select-max-students-per-device');
        act(() => {
            fireEvent.change(selectMax, { target: { value: '3' } });
        });
        const submitBtn = screen.getByTestId('btn-submit-open-session');
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(handleOpenSession).toHaveBeenCalledWith({
            classId: 'class_1',
            identityMode: 'roster_or_guest',
            allowTeams: false,
            allowPairing: true,
            maxStudentsPerDevice: 3,
        });
    });
    it('validates that roster_only requires selecting a class', async () => {
        const handleOpenSession = vi.fn();
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: null, onOpenSession: handleOpenSession, onCloseSession: vi.fn() }));
        act(() => {
            fireEvent.click(screen.getByTestId('btn-open-session-modal'));
        });
        // Chọn lớp trước để enable radio roster_only, sau đó chọn lại rỗng
        const selectClass = screen.getByTestId('select-class');
        act(() => {
            fireEvent.change(selectClass, { target: { value: 'class_1' } });
        });
        const rosterOnlyRadio = screen.getByRole('radio', {
            name: /Bắt buộc chọn đúng tên/i,
        });
        act(() => {
            fireEvent.click(rosterOnlyRadio);
        });
        // Bỏ chọn lớp (đưa về "")
        act(() => {
            fireEvent.change(selectClass, { target: { value: '' } });
        });
        // Bấm submit
        await act(async () => {
            fireEvent.click(screen.getByTestId('btn-submit-open-session'));
        });
        // Phải hiển thị lỗi và không gọi onOpenSession
        expect(handleOpenSession).not.toHaveBeenCalled();
        expect(screen.getByTestId('session-error-message')).toBeDefined();
        expect(screen.getByText(/Chế độ bắt buộc chọn tên yêu cầu phải chọn một lớp học/i)).toBeDefined();
    });
    it('displays 6-digit join code, QR code and handles close session when active', async () => {
        const handleCloseSession = vi.fn();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const activeSession = {
            session: {
                id: 'session_active_123',
                ownerId: 'teacher_1',
                classId: 'class_1',
                joinCode: '556677',
                status: 'open',
                identityMode: 'roster_or_guest',
                allowTeams: false,
                openedAt: 1000,
            },
            className: '12A1',
            joinUrl: 'http://192.168.1.10:3000/?code=556677',
            qrDataUrl: 'data:image/png;base64,mockQrCodeData',
        };
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: activeSession, onOpenSession: vi.fn(), onCloseSession: handleCloseSession }));
        // Kiểm tra thông tin hiển thị
        expect(screen.getByTestId('active-session-card')).toBeDefined();
        expect(screen.getByTestId('session-join-code').textContent).toBe('556677');
        expect(screen.getByText(/Lớp: 12A1/i)).toBeDefined();
        const qrImg = screen.getByTestId('session-qr-image');
        expect(qrImg.src).toBe('data:image/png;base64,mockQrCodeData');
        // Bấm nút đóng phiên
        const closeBtn = screen.getByTestId('btn-close-session');
        await act(async () => {
            fireEvent.click(closeBtn);
        });
        expect(handleCloseSession).toHaveBeenCalledWith('session_active_123');
    });
    it('renders online/offline participants and allows teacher to release participant name (Task 1.7)', async () => {
        const handleReleaseParticipant = vi.fn();
        const activeSession = {
            session: {
                id: 'session_active_123',
                ownerId: 'teacher_1',
                classId: 'class_1',
                joinCode: '556677',
                status: 'open',
                identityMode: 'roster_or_guest',
                allowTeams: true,
                openedAt: 1000,
            },
            className: '12A1',
            joinUrl: 'http://192.168.1.10:3000/?code=556677',
            qrDataUrl: 'data:image/png;base64,mockQrCodeData',
        };
        const mockParticipants = [
            {
                id: 'part_1',
                sessionId: 'session_active_123',
                displayName: 'Nguyễn Văn An',
                identityLevel: 'account',
                teamName: 'Đội Rồng',
                status: 'online',
                joinedAt: 1000,
            },
            {
                id: 'part_2',
                sessionId: 'session_active_123',
                displayName: 'Trần Thị Bình',
                identityLevel: 'roster',
                status: 'offline',
                joinedAt: 1005,
            },
        ];
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: activeSession, participants: mockParticipants, onOpenSession: vi.fn(), onCloseSession: vi.fn(), onReleaseParticipant: handleReleaseParticipant }));
        // Kiểm tra thống kê: 1 Online / 2 Tổng
        expect(screen.getByText(/Người tham gia \(1 Online \/ 2 Tổng\)/i)).toBeDefined();
        // Học sinh 1 hiển thị online và có nút "Mở lại tên"
        expect(screen.getByText(/Nguyễn Văn An/i)).toBeDefined();
        const releaseBtn = screen.getByTestId('btn-release-participant-part_1');
        expect(releaseBtn).toBeDefined();
        // Bấm nút Mở lại tên
        await act(async () => {
            fireEvent.click(releaseBtn);
        });
        expect(handleReleaseParticipant).toHaveBeenCalledWith('part_1');
        // Học sinh 2 hiển thị offline và không có nút "Mở lại tên"
        expect(screen.getByText(/Trần Thị Bình/i)).toBeDefined();
        expect(screen.queryByTestId('btn-release-participant-part_2')).toBeNull();
    });
    it('renders session report summary card when session is closed (Task 1.8)', async () => {
        const handleResetReport = vi.fn();
        const mockReport = {
            id: 'rep_123',
            sessionId: 'sess_closed_1',
            snapshot: {
                sessionId: 'sess_closed_1',
                sessionCode: '654321',
                className: '12A1',
                identityMode: 'roster_or_guest',
                allowTeams: true,
                openedAt: 1000,
                closedAt: 4600,
                totalParticipants: 3,
                onlineParticipants: 2,
                offlineParticipants: 1,
                participants: [
                    {
                        id: 'p_1',
                        studentId: 'st_1',
                        displayName: 'Nguyễn Văn An',
                        identityLevel: 'account',
                        teamName: 'Đội 1',
                        joinedAt: 1100,
                        leftAt: 4600,
                    },
                    {
                        id: 'p_2',
                        studentId: null,
                        displayName: 'Khách Minh',
                        identityLevel: 'guest',
                        teamName: 'Đội 1',
                        joinedAt: 1200,
                        leftAt: 4600,
                    },
                ],
                teams: [
                    {
                        id: 't_1',
                        name: 'Đội 1',
                        memberCount: 2,
                    },
                ],
                scoreboard: [],
                difficultQuestions: [],
            },
            createdAt: 4600,
        };
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: null, sessionReport: mockReport, onOpenSession: vi.fn(), onCloseSession: vi.fn(), onResetReport: handleResetReport }));
        // Xác nhận hiển thị card báo cáo
        expect(screen.getByTestId('session-report-card')).toBeDefined();
        expect(screen.getByText(/Báo cáo phiên học: 12A1/i)).toBeDefined();
        expect(screen.getByText(/654321/i)).toBeDefined();
        // Thống kê chỉ số
        expect(screen.getByTestId('report-stat-total').textContent).toBe('3');
        expect(screen.getByTestId('report-stat-online').textContent).toBe('2');
        expect(screen.getByTestId('report-stat-teams').textContent).toBe('1');
        // Danh sách học sinh trong báo cáo
        expect(screen.getByTestId('report-participant-p_1')).toBeDefined();
        expect(screen.getByText(/Nguyễn Văn An/i)).toBeDefined();
        expect(screen.getByText(/Khách Minh/i)).toBeDefined();
        // Bấm nút Mở phiên học mới từ báo cáo
        const newSessionBtn = screen.getByTestId('btn-new-session-from-report');
        act(() => {
            fireEvent.click(newSessionBtn);
        });
        expect(handleResetReport).toHaveBeenCalledTimes(1);
    });
    it('supports granting EXP rewards via test reward button and modal (Task 1.9)', async () => {
        const handleGrantReward = vi.fn();
        const activeSession = {
            session: {
                id: 'session_active',
                ownerId: 'teacher_1',
                classId: 'class_1',
                joinCode: '123456',
                status: 'open',
                identityMode: 'roster_or_guest',
                allowTeams: false,
                openedAt: 1000,
            },
            className: '12A1',
            joinUrl: 'http://127.0.0.1:3000/?code=123456',
        };
        const participants = [
            {
                id: 'p_account',
                sessionId: 'session_active',
                studentId: 's_1',
                displayName: 'Nguyễn Văn Account',
                identityLevel: 'account',
                teamId: null,
                status: 'online',
                joinedAt: 1050,
            },
        ];
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: activeSession, participants: participants, onOpenSession: vi.fn(), onCloseSession: vi.fn(), onGrantReward: handleGrantReward }));
        // Tìm nút thử thưởng 🎁 Thưởng EXP
        const rewardBtn = screen.getByTestId('btn-reward-participant-p_account');
        expect(rewardBtn).toBeDefined();
        // Bấm nút thử thưởng -> Mở modal
        act(() => {
            fireEvent.click(rewardBtn);
        });
        // Chọn mức thưởng +50 EXP
        const exp50Btn = screen.getByTestId('btn-exp-50');
        act(() => {
            fireEvent.click(exp50Btn);
        });
        // Nhập lý do thưởng
        const reasonInput = screen.getByTestId('input-reward-reason');
        act(() => {
            fireEvent.change(reasonInput, { target: { value: 'Trả lời xuất sắc' } });
        });
        // Bấm Xác nhận thưởng
        const confirmBtn = screen.getByTestId('btn-confirm-reward');
        await act(async () => {
            fireEvent.click(confirmBtn);
        });
        expect(handleGrantReward).toHaveBeenCalledWith('p_account', 50, 'Trả lời xuất sắc');
    });
    it('opens chat modal and handles chat controls for teacher (Task 5.2)', async () => {
        const handleToggleLock = vi.fn();
        const handleResolveHand = vi.fn();
        const handleSendChat = vi.fn();
        const activeSession = {
            session: {
                id: 'sess_1',
                ownerId: 'teacher_1',
                classId: 'class_1',
                joinCode: '123456',
                status: 'open',
                identityMode: 'roster_or_guest',
                allowTeams: false,
                openedAt: 1000,
            },
            className: '12A1',
            joinUrl: 'http://127.0.0.1:3000/?code=123456',
        };
        const mockHandRaises = [
            {
                participantId: 'p_1',
                participantName: 'Em Nam',
                requestedAt: 1000,
                message: 'Chưa hiểu câu hỏi số 2',
            },
        ];
        render(_jsx(SessionControl, { classes: mockClasses, activeSession: activeSession, handRaises: mockHandRaises, chatLocked: false, onOpenSession: vi.fn(), onCloseSession: vi.fn(), onToggleChatLock: handleToggleLock, onResolveHandRaise: handleResolveHand, onSendChatMessage: handleSendChat }));
        // Nút chat có hiển thị badge học sinh giơ tay
        const chatBtn = screen.getByTestId('btn-open-chat');
        expect(chatBtn.textContent).toContain('✋ (1)');
        // Bấm nút mở chat modal
        act(() => {
            fireEvent.click(chatBtn);
        });
        expect(screen.getByTestId('session-chat-modal')).toBeDefined();
        expect(screen.getByTestId('chat-box-container')).toBeDefined();
        // Khóa chat
        const toggleLockBtn = screen.getByRole('button', { name: /🔓 Khóa chat/i });
        await act(async () => {
            fireEvent.click(toggleLockBtn);
        });
        expect(handleToggleLock).toHaveBeenCalledWith(true);
        // Chuyển sang tab giơ tay xin giúp
        const handsTab = screen.getByText(/Cần giúp/i);
        act(() => {
            fireEvent.click(handsTab);
        });
        expect(screen.getByText(/Em Nam/i)).toBeDefined();
        expect(screen.getByText(/Chưa hiểu câu hỏi số 2/i)).toBeDefined();
        // Bấm giải quyết hỗ trợ
        const resolveBtn = screen.getByRole('button', { name: /Đã hỗ trợ xong/i });
        await act(async () => {
            fireEvent.click(resolveBtn);
        });
        expect(handleResolveHand).toHaveBeenCalledWith('p_1');
    });
});
//# sourceMappingURL=session-control.test.js.map