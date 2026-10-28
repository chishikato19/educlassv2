import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client.js';
import { VideoLibraryTab } from '../components/VideoLibraryTab.js';
describe('VideoLibraryTab Component', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });
    const mockVideos = [
        {
            id: 'v_1',
            title: 'Khởi động vận động vui nhộn',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            youtubeId: 'dQw4w9WgXcQ',
            category: 'Khởi động',
            description: 'Bài hát đầu giờ tràn đầy năng lượng',
            createdAt: 1000,
            updatedAt: 1000,
        },
        {
            id: 'v_2',
            title: 'Thí nghiệm tán sắc ánh sáng',
            url: 'https://youtu.be/abcd1234XYZ',
            youtubeId: 'abcd1234XYZ',
            category: 'Khoa học',
            description: 'Vật lý quang học',
            createdAt: 2000,
            updatedAt: 2000,
        },
    ];
    beforeEach(() => {
        vi.spyOn(api, 'getVideoCategories').mockResolvedValue(['Khởi động', 'Khoa học', 'Toán học']);
        vi.spyOn(api, 'getVideos').mockResolvedValue(mockVideos);
    });
    it('hiển thị danh sách video và phân loại danh mục', async () => {
        const showToast = vi.fn();
        render(_jsx(VideoLibraryTab, { onShowToast: showToast }));
        // Đợi tải xong
        await waitFor(() => {
            expect(screen.getByText('Khởi động vận động vui nhộn')).toBeDefined();
            expect(screen.getByText('Thí nghiệm tán sắc ánh sáng')).toBeDefined();
        });
        // Tiêu đề trang
        expect(screen.getByText(/Kho Video Học Liệu & Khởi Động/i)).toBeDefined();
        // Nút thêm video
        expect(screen.getByText(/Thêm Video Mới/i)).toBeDefined();
    });
    it('mở modal phát video khi bấm nút Phát', async () => {
        const showToast = vi.fn();
        render(_jsx(VideoLibraryTab, { onShowToast: showToast }));
        await waitFor(() => {
            expect(screen.getByText('Khởi động vận động vui nhộn')).toBeDefined();
        });
        const playButtons = screen.getAllByRole('button', { name: /▶ Phát/i });
        fireEvent.click(playButtons[0]);
        await waitFor(() => {
            expect(screen.getByText(/🎬 Khởi động vận động vui nhộn/i)).toBeDefined();
        });
    });
    it('mở modal thêm mới và gửi dữ liệu tạo video', async () => {
        const createSpy = vi.spyOn(api, 'createVideo').mockResolvedValue({
            id: 'v_3',
            title: 'Video toán vui',
            url: 'https://youtu.be/math1234567',
            youtubeId: 'math1234567',
            category: 'Toán học',
            description: '',
            createdAt: 3000,
            updatedAt: 3000,
        });
        const showToast = vi.fn();
        render(_jsx(VideoLibraryTab, { onShowToast: showToast }));
        await waitFor(() => {
            expect(screen.getByText('Khởi động vận động vui nhộn')).toBeDefined();
        });
        // Mở modal thêm mới
        const addButton = screen.getByText(/Thêm Video Mới/i);
        fireEvent.click(addButton);
        expect(screen.getByText(/➕ Thêm Video YouTube Mới/i)).toBeDefined();
        // Điền form
        const urlInput = screen.getByPlaceholderText(/https:\/\/www.youtube.com\/watch\?v=\.\.\./i);
        const titleInput = screen.getByPlaceholderText(/VD: Khởi động vận động vui nhộn\.\.\./i);
        fireEvent.change(urlInput, { target: { value: 'https://youtu.be/math1234567' } });
        fireEvent.change(titleInput, { target: { value: 'Video toán vui' } });
        // Submit form
        const submitBtn = screen.getByRole('button', { name: /^Thêm video$/i });
        fireEvent.click(submitBtn);
        await waitFor(() => {
            expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Video toán vui',
                url: 'https://youtu.be/math1234567',
            }));
        });
    });
    it('mở modal xác nhận xóa và gọi API xóa video', async () => {
        const deleteSpy = vi.spyOn(api, 'deleteVideo').mockResolvedValue(true);
        const showToast = vi.fn();
        render(_jsx(VideoLibraryTab, { onShowToast: showToast }));
        await waitFor(() => {
            expect(screen.getByText('Khởi động vận động vui nhộn')).toBeDefined();
        });
        // Click nút xóa của card thứ 2
        const delButtons = screen.getAllByTitle('Xóa video khỏi kho');
        fireEvent.click(delButtons[1]);
        await waitFor(() => {
            expect(screen.getByText(/⚠️ Xác Nhận Xóa Video/i)).toBeDefined();
        });
        const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i });
        fireEvent.click(confirmBtn);
        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith('v_2');
            expect(showToast).toHaveBeenCalledWith('Đã xóa video khỏi kho');
        });
    });
});
//# sourceMappingURL=video-library-tab.test.js.map