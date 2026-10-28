import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpSettingsTab } from '../components/ExpSettingsTab.js';
describe('ExpSettingsTab UI Component (apps/teacher-ui)', () => {
    afterEach(() => cleanup());
    const mockEffectiveRules = [
        {
            id: 'rule_1',
            ownerId: null,
            scope: 'global',
            activityId: null,
            trigger: 'session_cap',
            exp: 200,
            enabled: true,
        },
        {
            id: 'rule_2',
            ownerId: null,
            scope: 'global',
            activityId: 'quiz_live',
            trigger: 'correct',
            exp: 10,
            enabled: true,
        },
        {
            id: 'rule_3',
            ownerId: null,
            scope: 'global',
            activityId: 'quiz_live',
            trigger: 'activity_cap',
            exp: 100,
            enabled: true,
        },
        {
            id: 'rule_4',
            ownerId: null,
            scope: 'global',
            activityId: 'quick_poll',
            trigger: 'participate',
            exp: 10,
            enabled: true,
        },
    ];
    it('renders EXP settings tab with categories and rule rows', () => {
        render(_jsx(ExpSettingsTab, { effectiveRules: mockEffectiveRules, teacherRules: [], onSaveRules: vi.fn(), onResetRules: vi.fn() }));
        // Kiểm tra tiêu đề chính
        expect(screen.getByText(/Cài đặt Quy tắc & Thưởng EXP/i)).toBeDefined();
        // Kiểm tra các danh mục chính
        expect(screen.getAllByText(/Trần EXP Chống Lạm Phát/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Quiz Live/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Bình chọn nhanh/i).length).toBeGreaterThan(0);
        // Kiểm tra hiển thị mức EXP hiện tại
        const sessionCapInput = screen.getByLabelText(/Số EXP cho Trần EXP toàn phiên/i);
        expect(sessionCapInput.value).toBe('200');
        const quizCorrectInput = screen.getByLabelText(/Số EXP cho Trả lời đúng 1 câu/i);
        expect(quizCorrectInput.value).toBe('10');
    });
    it('allows changing EXP value and toggling rule enable/disable', () => {
        render(_jsx(ExpSettingsTab, { effectiveRules: mockEffectiveRules, teacherRules: [], onSaveRules: vi.fn(), onResetRules: vi.fn() }));
        const quizCorrectInput = screen.getByLabelText(/Số EXP cho Trả lời đúng 1 câu/i);
        fireEvent.change(quizCorrectInput, { target: { value: '25' } });
        expect(quizCorrectInput.value).toBe('25');
        const toggleCheckbox = screen.getByLabelText(/Bật\/tắt Trả lời đúng 1 câu/i);
        expect(toggleCheckbox.checked).toBe(true);
        fireEvent.click(toggleCheckbox);
        expect(toggleCheckbox.checked).toBe(false);
    });
    it('calls onSaveRules with updated payload when clicking Lưu cài đặt', async () => {
        const onSaveRules = vi.fn().mockResolvedValue(undefined);
        render(_jsx(ExpSettingsTab, { effectiveRules: mockEffectiveRules, teacherRules: [], onSaveRules: onSaveRules, onResetRules: vi.fn() }));
        // Chỉnh sửa điểm
        const sessionCapInput = screen.getByLabelText(/Số EXP cho Trần EXP toàn phiên/i);
        fireEvent.change(sessionCapInput, { target: { value: '250' } });
        // Bấm nút Lưu cài đặt
        const saveButton = screen.getByRole('button', { name: /Lưu cài đặt/i });
        await act(async () => {
            fireEvent.click(saveButton);
        });
        expect(onSaveRules).toHaveBeenCalledTimes(1);
        const firstCall = onSaveRules.mock.calls[0];
        expect(firstCall).toBeDefined();
        const savedRules = firstCall[0];
        const savedSessionCap = savedRules.find((r) => r.activityId === null && r.trigger === 'session_cap');
        expect(savedSessionCap?.exp).toBe(250);
        // Toast thành công xuất hiện
        expect(screen.getByText(/Đã lưu cấu hình thưởng EXP thành công/i)).toBeDefined();
    });
    it('opens confirmation modal and calls onResetRules when confirming reset', async () => {
        const onResetRules = vi.fn().mockResolvedValue(undefined);
        render(_jsx(ExpSettingsTab, { effectiveRules: mockEffectiveRules, teacherRules: [], onSaveRules: vi.fn(), onResetRules: onResetRules }));
        // Bấm nút Khôi phục mặc định
        const resetBtn = screen.getByRole('button', { name: /Khôi phục mặc định/i });
        fireEvent.click(resetBtn);
        // Modal xác nhận xuất hiện
        expect(screen.getByText(/Xác nhận khôi phục mặc định/i)).toBeDefined();
        // Bấm nút Xác nhận khôi phục trong modal
        const confirmBtn = screen.getByRole('button', { name: /Xác nhận khôi phục/i });
        await act(async () => {
            fireEvent.click(confirmBtn);
        });
        expect(onResetRules).toHaveBeenCalledTimes(1);
    });
    it('renders loading state when isLoading is true', () => {
        render(_jsx(ExpSettingsTab, { isLoading: true, onSaveRules: vi.fn(), onResetRules: vi.fn() }));
        expect(screen.getByText(/Đang tải dữ liệu cấu hình EXP/i)).toBeDefined();
    });
});
//# sourceMappingURL=exp-settings-tab.test.js.map