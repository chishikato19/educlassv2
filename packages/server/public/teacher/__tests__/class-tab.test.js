import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClassTab } from '../components/ClassTab.js';
describe('ClassTab UI Component (apps/teacher-ui)', () => {
    const mockClasses = [
        {
            id: 'class_1',
            ownerId: 'teacher_1',
            name: '12A1',
            year: 2026,
            createdAt: Date.now(),
        },
        {
            id: 'class_2',
            ownerId: 'teacher_1',
            name: '12A2',
            year: 2026,
            createdAt: Date.now(),
        },
    ];
    const mockStudents = [
        {
            id: 's_1',
            classId: 'class_1',
            fullName: 'Nguyễn Văn An',
            code: 'HS001',
            hasPin: true,
            exp: 100,
            level: 1,
            academicPerformance: 'tot',
            createdAt: Date.now(),
        },
        {
            id: 's_2',
            classId: 'class_1',
            fullName: 'Trần Thị Bích',
            code: 'HS002',
            hasPin: false,
            exp: 0,
            level: 1,
            academicPerformance: 'dat',
            createdAt: Date.now(),
        },
    ];
    it('renders class list and student table with PIN status', () => {
        const handleSelectClass = vi.fn();
        render(_jsx(ClassTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onSelectClass: handleSelectClass, onCreateClass: vi.fn(), onCreateStudent: vi.fn(), onSetStudentPin: vi.fn(), onDeleteStudent: vi.fn(), onImportStudents: vi.fn() }));
        // Kiểm tra tên các lớp
        expect(screen.getByText(/12A1 \(2026\)/i)).toBeDefined();
        expect(screen.getByText(/12A2 \(2026\)/i)).toBeDefined();
        // Kiểm tra danh sách học sinh
        expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
        expect(screen.getByText('HS001')).toBeDefined();
        expect(screen.getByText('Đã đặt PIN')).toBeDefined();
        expect(screen.getByText('Trần Thị Bích')).toBeDefined();
        expect(screen.getByText('Chưa có PIN')).toBeDefined();
    });
    it('opens add student modal and triggers onCreateStudent callback', async () => {
        const handleCreateStudent = vi.fn();
        render(_jsx(ClassTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onSelectClass: vi.fn(), onCreateClass: vi.fn(), onCreateStudent: handleCreateStudent, onSetStudentPin: vi.fn(), onDeleteStudent: vi.fn(), onImportStudents: vi.fn() }));
        const addBtn = screen.getByTestId('btn-add-student');
        act(() => {
            fireEvent.click(addBtn);
        });
        const nameInput = screen.getByPlaceholderText(/Nguyễn Văn An/i);
        act(() => {
            fireEvent.change(nameInput, { target: { value: 'Lê Văn Cường' } });
        });
        const submitBtn = screen.getByTestId('btn-submit-add-student');
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(handleCreateStudent).toHaveBeenCalledWith('class_1', {
            fullName: 'Lê Văn Cường',
            academicPerformance: 'dat',
        });
    });
    it('handles paste from Excel, generates preview, and confirms import', async () => {
        const handleImportStudents = vi.fn();
        render(_jsx(ClassTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onSelectClass: vi.fn(), onCreateClass: vi.fn(), onCreateStudent: vi.fn(), onSetStudentPin: vi.fn(), onDeleteStudent: vi.fn(), onImportStudents: handleImportStudents }));
        // Mở modal import
        const importBtn = screen.getByTestId('btn-import-excel');
        act(() => {
            fireEvent.click(importBtn);
        });
        // Dán dữ liệu
        const textarea = screen.getByTestId('textarea-paste-excel');
        const pasteContent = `STT\tMã HS\tHọ và tên\tMã PIN
1\tHS003\tPhạm Văn Đạt\t1234
2\tHS004\tHoàng Thị Mai\t5678`;
        act(() => {
            fireEvent.change(textarea, { target: { value: pasteContent } });
        });
        // Bấm xem trước
        const previewBtn = screen.getByTestId('btn-preview-paste');
        act(() => {
            fireEvent.click(previewBtn);
        });
        // Kiểm tra kết quả xem trước
        expect(screen.getByText(/Hợp lệ: 2/i)).toBeDefined();
        expect(screen.getByText('Phạm Văn Đạt')).toBeDefined();
        expect(screen.getByText('Hoàng Thị Mai')).toBeDefined();
        // Bấm xác nhận nhập
        const confirmBtn = screen.getByTestId('btn-confirm-import');
        await act(async () => {
            fireEvent.click(confirmBtn);
        });
        expect(handleImportStudents).toHaveBeenCalledWith('class_1', [
            { fullName: 'Phạm Văn Đạt', code: 'HS003', pin: '1234' },
            { fullName: 'Hoàng Thị Mai', code: 'HS004', pin: '5678' },
        ], true);
    });
    it('opens add class modal, allows entering class name immediately, and creates class', async () => {
        const handleCreateClass = vi.fn().mockResolvedValue(undefined);
        render(_jsx(ClassTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onSelectClass: vi.fn(), onCreateClass: handleCreateClass, onCreateStudent: vi.fn(), onSetStudentPin: vi.fn(), onDeleteStudent: vi.fn(), onImportStudents: vi.fn() }));
        // Bấm nút thêm lớp học
        const addClassBtn = screen.getByTestId('btn-add-class');
        act(() => {
            fireEvent.click(addClassBtn);
        });
        // Modal xuất hiện và có ô nhập tên lớp
        const classNameInput = screen.getByTestId('input-class-name');
        expect(classNameInput).toBeDefined();
        expect(classNameInput.value).toBe('');
        // Nhập tên lớp học ngay lập tức
        act(() => {
            fireEvent.change(classNameInput, { target: { value: '12A3' } });
        });
        expect(classNameInput.value).toBe('12A3');
        // Bấm Lưu lớp học
        const saveClassBtn = screen.getByTestId('btn-save-class');
        await act(async () => {
            fireEvent.click(saveClassBtn);
        });
        expect(handleCreateClass).toHaveBeenCalledWith({
            name: '12A3',
            year: new Date().getFullYear(),
        });
    });
});
//# sourceMappingURL=class-tab.test.js.map