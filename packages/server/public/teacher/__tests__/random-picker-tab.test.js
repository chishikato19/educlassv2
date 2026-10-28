import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RandomPickerTab } from '../components/random-picker/RandomPickerTab.js';
import { api } from '../api/client.js';
class MockResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = MockResizeObserver;
}
describe('RandomPickerTab Component', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });
    const mockClasses = [
        {
            id: 'class_1',
            name: 'Lớp 10A1',
            year: 2026,
            ownerId: 'teacher_1',
            createdAt: 1000,
        },
    ];
    const mockStudents = [
        {
            id: 'st_1',
            classId: 'class_1',
            fullName: 'Nguyễn Văn An',
            code: 'HS01',
            hasPin: false,
            exp: 0,
            level: 1,
            academicPerformance: 'tot',
            createdAt: 1000,
        },
        {
            id: 'st_2',
            classId: 'class_1',
            fullName: 'Trần Thị Bình',
            code: 'HS02',
            hasPin: false,
            exp: 0,
            level: 1,
            academicPerformance: 'kha',
            createdAt: 1000,
        },
        {
            id: 'st_3',
            classId: 'class_1',
            fullName: 'Lê Văn Cường',
            code: 'HS03',
            hasPin: false,
            exp: 0,
            level: 1,
            academicPerformance: 'dat',
            createdAt: 1000,
        },
    ];
    beforeEach(() => {
        vi.spyOn(api, 'grantReward').mockResolvedValue();
        if (typeof HTMLCanvasElement !== 'undefined') {
            HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
                if (type === '2d') {
                    return {
                        imageSmoothingEnabled: true,
                        fillRect: vi.fn(),
                        clearRect: vi.fn(),
                        getImageData: vi.fn(() => ({ data: new Array(4) })),
                        putImageData: vi.fn(),
                        createImageData: vi.fn(() => []),
                        setTransform: vi.fn(),
                        drawImage: vi.fn(),
                        save: vi.fn(),
                        fillText: vi.fn(),
                        restore: vi.fn(),
                        beginPath: vi.fn(),
                        moveTo: vi.fn(),
                        lineTo: vi.fn(),
                        closePath: vi.fn(),
                        stroke: vi.fn(),
                        translate: vi.fn(),
                        scale: vi.fn(),
                        rotate: vi.fn(),
                        arc: vi.fn(),
                        fill: vi.fn(),
                        measureText: vi.fn(() => ({ width: 0 })),
                        transform: vi.fn(),
                        rect: vi.fn(),
                        clip: vi.fn(),
                        resetTransform: vi.fn(),
                    };
                }
                return null;
            });
        }
    });
    it('renders correctly with class list and 5 cards in card_flip mode', () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'card_flip', animationDurationMs: 10 } }));
        expect(screen.getByText(/Quay Số Ngẫu Nhiên — Gọi Học Sinh/i)).toBeDefined();
        expect(screen.getByText(/Học sinh đầu tiên/i)).toBeDefined();
        expect(screen.getByText(/Đã tải/i)).toBeDefined();
        expect(screen.getAllByText(/3/i).length).toBeGreaterThan(0);
    });
    it('executes pick and reveals card and result modal', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'card_flip', animationDurationMs: 10 } }));
        const pickBtn = screen.getByRole('button', { name: /Học sinh đầu tiên/i });
        await act(async () => {
            fireEvent.click(pickBtn);
        });
        // Sau khi xốc bài, giáo viên click 1 lá bài để lật mở
        const firstCard = screen.getByLabelText('Lá bài số 1');
        await act(async () => {
            fireEvent.click(firstCard);
        });
        // Modal kết quả mở ra
        await waitFor(() => {
            expect(screen.getByText(/KẾT QUẢ GỌI HỌC SINH/i)).toBeDefined();
        }, { timeout: 2000 });
        // Thấy các nút hành động trong modal
        expect(screen.getByRole('button', { name: /Trả lời đúng/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Cho vào hàng chờ/i })).toBeDefined();
    });
    it('secret bias button picks a good student (academicPerformance = tot)', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'card_flip', animationDurationMs: 10 } }));
        // Tìm nút ẩn bí mật sát bên phải
        const secretBtn = screen.getByRole('button', { name: /Chọn ngẫu nhiên/i });
        await act(async () => {
            fireEvent.click(secretBtn);
        });
        // Giáo viên click 1 lá bài để lật mở
        const firstCard = screen.getByLabelText('Lá bài số 1');
        await act(async () => {
            fireEvent.click(firstCard);
        });
        await waitFor(() => {
            expect(screen.getByText(/KẾT QUẢ GỌI HỌC SINH/i)).toBeDefined();
        }, { timeout: 2000 });
        // Học sinh tốt là "Nguyễn Văn An"
        expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThan(0);
        // Học lực không còn hiển thị trong giao diện quay ngẫu nhiên theo yêu cầu 4
        expect(screen.queryByText(/Học lực:/i)).toBeNull();
    });
    it('supports moving student to queue and grading from queue bar', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'card_flip', animationDurationMs: 10 } }));
        const pickBtn = screen.getByRole('button', { name: /Học sinh đầu tiên/i });
        await act(async () => {
            fireEvent.click(pickBtn);
        });
        // Giáo viên click 1 lá bài để lật mở
        const firstCard = screen.getByLabelText('Lá bài số 1');
        await act(async () => {
            fireEvent.click(firstCard);
        });
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Cho vào hàng chờ/i })).toBeDefined();
        }, { timeout: 2000 });
        // Bấm "Cho vào hàng chờ"
        const queueBtn = screen.getByRole('button', { name: /Cho vào hàng chờ/i });
        await act(async () => {
            fireEvent.click(queueBtn);
        });
        // Kiểm tra hàng chờ xuất hiện
        expect(screen.getByText(/Học sinh đang lên bảng làm bài/i)).toBeDefined();
        // Bấm chấm đúng từ hàng chờ
        const gradeCorrectBtn = screen.getByText(/✓ Đúng/i);
        await act(async () => {
            fireEvent.click(gradeCorrectBtn);
        });
        expect(showToast).toHaveBeenCalled();
    });
    it('parses pasted Excel text into students list', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { animationDurationMs: 10 } }));
        // Chuyển sang tab Excel
        const excelTabBtn = screen.getByRole('button', { name: /Dán Từ Excel/i });
        await act(async () => {
            fireEvent.click(excelTabBtn);
        });
        const textarea = screen.getByPlaceholderText(/1\. Nguyễn Văn An/i);
        await act(async () => {
            fireEvent.change(textarea, {
                target: {
                    value: '1\tĐỗ Thị Dung\ttot\n2\tPhạm Hoàng Nam\tkha',
                },
            });
        });
        const loadExcelBtn = screen.getByRole('button', { name: /Nạp Danh Sách Học Sinh/i });
        await act(async () => {
            fireEvent.click(loadExcelBtn);
        });
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Đã nạp 2 học sinh'));
    });
    it('supports Mystery Box mode with 3 gift boxes and Monty Hall reveal', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'mystery_box', animationDurationMs: 10 } }));
        // Kiểm tra hiển thị tiêu đề chế độ và 3 hộp quà
        expect(screen.getAllByText(/Hộp quà bí mật/i).length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Hộp quà số 1')).toBeDefined();
        expect(screen.getByLabelText('Hộp quà số 2')).toBeDefined();
        expect(screen.getByLabelText('Hộp quà số 3')).toBeDefined();
        // Bấm nút quay chính để xốc hộp quà
        const pickBtn = screen.getByRole('button', { name: /Học sinh đầu tiên/i });
        await act(async () => {
            fireEvent.click(pickBtn);
        });
        // Bấm chọn hộp quà số 2
        const box2 = screen.getByLabelText('Hộp quà số 2');
        await act(async () => {
            fireEvent.click(box2);
        });
        // Chờ ResultModal hiển thị sau khi hoàn tất nhịp mở
        await waitFor(() => {
            expect(screen.getByText(/KẾT QUẢ GỌI HỌC SINH/i)).toBeDefined();
        }, { timeout: 3500 });
    }, 10000);
    it('supports Slot Machine mode with tens and units reels', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'slot_machine', animationDurationMs: 10 } }));
        // Kiểm tra hiển thị tiêu đề và 2 cửa sổ quay
        expect(screen.getAllByText(/Máy quay số/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/HÀNG CHỤC/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/HÀNG ĐƠN VỊ/i).length).toBeGreaterThan(0);
        // Bấm nút quay
        const pickBtn = screen.getByRole('button', { name: /Học sinh đầu tiên/i });
        await act(async () => {
            fireEvent.click(pickBtn);
        });
        // Chờ ResultModal hiển thị sau khi 2 trục dừng quay
        await waitFor(() => {
            expect(screen.getByText(/KẾT QUẢ GỌI HỌC SINH/i)).toBeDefined();
        }, { timeout: 5500 });
    }, 15000);
    it('supports Duck Hunt (Bắn vịt) mode', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'duck_hunt', animationDurationMs: 10 } }));
        // Kiểm tra hiển thị tiêu đề và trường bắn
        expect(screen.getAllByText(/🎯 Bắn vịt/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/TRƯỜNG BẮN HỘI CHỢ/i)).toBeDefined();
        expect(screen.getByText(/Chế độ ẩn/i)).toBeDefined();
    });
    it('supports Elimination Grid (Đấu trường sinh tồn) mode', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'elimination_grid', animationDurationMs: 10 } }));
        // Kiểm tra hiển thị tiêu đề chế độ Đấu trường sinh tồn
        expect(screen.getAllByText(/⚔️ Đấu trường sinh tồn/i).length).toBeGreaterThan(0);
        // Kiểm tra các ô học sinh xuất hiện với tên chính và số thứ tự
        expect(screen.getByText('An')).toBeDefined();
        expect(screen.getByText('Bình')).toBeDefined();
        expect(screen.getByText('Cường')).toBeDefined();
        expect(screen.getByText('#1')).toBeDefined();
        expect(screen.getByText('#2')).toBeDefined();
        expect(screen.getByText('#3')).toBeDefined();
    });
    it('supports Marble Race (Đua bi rơi Pinball) mode', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { mode: 'marble_race', animationDurationMs: 10 } }));
        // Kiểm tra hiển thị tiêu đề chế độ Đua bi rơi Pinball
        expect(screen.getAllByText(/⚪ Đua bi rơi Pinball/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/3 học sinh/i)).toBeDefined();
        expect(screen.getByText(/Sẵn Sàng.*Thả Bi/i)).toBeDefined();
    });
    it('renders Random Mode (Chế độ ngẫu nhiên) welcome stage by default with 10 mini-games badges', () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { animationDurationMs: 10 } }));
        // Mặc định là chế độ ngẫu nhiên
        expect(screen.getByText(/Chế độ Ngẫu nhiên — Mỗi lượt 1 trò chơi bất ngờ/i)).toBeDefined();
        expect(screen.getByText(/Sẵn Sàng Khởi Động Vòng Quay Bí Ẩn/i)).toBeDefined();
        expect(screen.getByText(/10 Mini-game sẵn sàng trong danh sách/i)).toBeDefined();
        expect(screen.getAllByText(/Lật thẻ bài/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Hộp quà bí mật/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Đua bi Pinball/i).length).toBeGreaterThan(0);
    });
    it('executes pick in Random Mode and triggers a sub-mode', async () => {
        const showToast = vi.fn();
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2); // Chọn sub-mode slot_machine
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { animationDurationMs: 10 } }));
        // Bấm nút quay
        const pickBtn = screen.getByRole('button', { name: /Học sinh đầu tiên/i });
        await act(async () => {
            fireEvent.click(pickBtn);
        });
        // Sân khấu đã chuyển sang một trò chơi cụ thể (không còn ở sân khấu chào đón ban đầu)
        expect(screen.queryByText(/Sẵn Sàng Khởi Động Vòng Quay Bí Ẩn/i)).toBeNull();
        // Tiêu đề hiển thị chỉ dẫn sub-mode
        expect(screen.getByText(/🎲 Ngẫu nhiên ➜/i)).toBeDefined();
        randomSpy.mockRestore();
    });
    it('secret bias button in Random Mode selects a good student and excludes Pinball and Duck Hunt', async () => {
        const showToast = vi.fn();
        render(_jsx(RandomPickerTab, { classes: mockClasses, selectedClassId: "class_1", students: mockStudents, onShowToast: showToast, initialSettings: { animationDurationMs: 10 } }));
        // Bấm nút ẩn bí mật bias_good
        const secretBtn = screen.getByRole('button', { name: /Chọn ngẫu nhiên/i });
        await act(async () => {
            fireEvent.click(secretBtn);
        });
        // Chế độ được chọn không bao giờ là Pinball hay Bắn vịt
        expect(screen.queryByText(/TRƯỜNG BẮN HỘI CHỢ/i)).toBeNull();
        expect(screen.queryByText(/3 viên bi cùng tranh tài/i)).toBeNull();
    });
});
//# sourceMappingURL=random-picker-tab.test.js.map