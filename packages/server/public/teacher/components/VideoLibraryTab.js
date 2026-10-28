import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl, } from '@educlass/protocol';
import { Button, Card, Input, Modal } from '@educlass/ui-kit';
import { api } from '../api/client.js';
export const VideoLibraryTab = ({ onShowToast }) => {
    const onShowToastRef = useRef(onShowToast);
    onShowToastRef.current = onShowToast;
    const [videos, setVideos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    // Modal xem video
    const [playingVideo, setPlayingVideo] = useState(null);
    // Modal thêm / chỉnh sửa video
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [formTitle, setFormTitle] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formCategory, setFormCategory] = useState('Khởi động');
    const [formCustomCategory, setFormCustomCategory] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    // Modal xác nhận xóa
    const [deletingVideo, setDeletingVideo] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Tải danh sách categories
    const loadCategories = useCallback(async () => {
        try {
            const cats = await api.getVideoCategories();
            setCategories(cats);
        }
        catch {
            setCategories([
                'Khởi động',
                'Bài giảng',
                'Khoa học',
                'Toán học',
                'Tiếng Anh',
                'Kỹ năng sống',
            ]);
        }
    }, []);
    // Tải danh sách videos
    const loadVideos = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await api.getVideos({
                category: selectedCategory === 'all' ? undefined : selectedCategory,
                search: searchTerm.trim() || undefined,
            });
            setVideos(list);
        }
        catch {
            onShowToastRef.current('Không thể tải danh sách video');
        }
        finally {
            setIsLoading(false);
        }
    }, [selectedCategory, searchTerm]);
    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);
    useEffect(() => {
        void loadVideos();
    }, [loadVideos]);
    // Mở modal thêm mới
    const handleOpenAddModal = () => {
        setEditingVideo(null);
        setFormTitle('');
        setFormUrl('');
        setFormCategory('Khởi động');
        setFormCustomCategory('');
        setFormDescription('');
        setIsEditModalOpen(true);
    };
    // Mở modal chỉnh sửa
    const handleOpenEditModal = (video) => {
        setEditingVideo(video);
        setFormTitle(video.title);
        setFormUrl(video.url);
        if (categories.includes(video.category)) {
            setFormCategory(video.category);
            setFormCustomCategory('');
        }
        else {
            setFormCategory('custom');
            setFormCustomCategory(video.category);
        }
        setFormDescription(video.description || '');
        setIsEditModalOpen(true);
    };
    // Lưu video (Thêm mới hoặc Cập nhật)
    const handleSaveVideo = async (e) => {
        e.preventDefault();
        const trimmedTitle = formTitle.trim();
        const trimmedUrl = formUrl.trim();
        const resolvedCategory = formCategory === 'custom' ? formCustomCategory.trim() : formCategory;
        if (!trimmedTitle) {
            onShowToast('Vui lòng nhập tiêu đề video');
            return;
        }
        if (!trimmedUrl) {
            onShowToast('Vui lòng nhập đường dẫn YouTube');
            return;
        }
        const detectedId = extractYouTubeId(trimmedUrl);
        if (!detectedId) {
            onShowToast('Đường dẫn YouTube không hợp lệ hoặc không trích xuất được Video ID');
            return;
        }
        if (!resolvedCategory) {
            onShowToast('Vui lòng chọn hoặc nhập phân loại danh mục');
            return;
        }
        setIsSaving(true);
        try {
            if (editingVideo) {
                await api.updateVideo(editingVideo.id, {
                    title: trimmedTitle,
                    url: trimmedUrl,
                    category: resolvedCategory,
                    description: formDescription.trim(),
                });
                onShowToast('Đã cập nhật video thành công');
            }
            else {
                await api.createVideo({
                    title: trimmedTitle,
                    url: trimmedUrl,
                    category: resolvedCategory,
                    description: formDescription.trim(),
                });
                onShowToast('Đã thêm video mới vào kho');
            }
            setIsEditModalOpen(false);
            await loadCategories();
            await loadVideos();
        }
        catch (err) {
            const msg = err instanceof Error
                ? err.message
                : editingVideo
                    ? 'Lỗi khi cập nhật video'
                    : 'Lỗi khi thêm video';
            onShowToast(msg);
        }
        finally {
            setIsSaving(false);
        }
    };
    // Xóa video
    const handleConfirmDelete = async () => {
        if (!deletingVideo)
            return;
        setIsDeleting(true);
        try {
            await api.deleteVideo(deletingVideo.id);
            onShowToast('Đã xóa video khỏi kho');
            setDeletingVideo(null);
            await loadCategories();
            await loadVideos();
        }
        catch {
            onShowToast('Lỗi khi xóa video');
        }
        finally {
            setIsDeleting(false);
        }
    };
    // Mở cửa sổ trình chiếu máy chiếu (Màn hình 2)
    const handleOpenProjector = (video) => {
        const url = `/teacher/?window=video&youtubeId=${encodeURIComponent(video.youtubeId)}&title=${encodeURIComponent(video.title)}`;
        window.open(url, `EduClass_Video_${video.youtubeId}`, 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    };
    // Preview YouTube ID khi đang nhập form
    const previewYoutubeId = extractYouTubeId(formUrl.trim());
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83C\uDFAC" }), _jsx("h1", { className: "text-2xl font-bold text-slate-800", children: "Kho Video H\u1ECDc Li\u1EC7u & Kh\u1EDFi \u0110\u1ED9ng" })] }), _jsx("p", { className: "text-sm text-slate-500 mt-1", children: "L\u01B0u tr\u1EEF li\u00EAn k\u1EBFt video YouTube d\u00F9ng kh\u1EDFi \u0111\u1ED9ng ti\u1EBFt h\u1ECDc ho\u1EB7c kho h\u1ECDc li\u1EC7u. Ph\u00E1t tr\u1EF1c ti\u1EBFp kh\u00F4ng qu\u1EA3ng c\u00E1o theo d\u00F5i." })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { variant: "primary", onClick: handleOpenAddModal, className: "flex items-center gap-1.5 whitespace-nowrap shadow-md hover:shadow-lg transition", children: [_jsx("span", { className: "text-lg font-bold leading-none", children: "+" }), " Th\u00EAm Video M\u1EDBi"] }) })] }), _jsxs("div", { className: "flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none", children: [_jsxs("button", { type: "button", onClick: () => setSelectedCategory('all'), className: `px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${selectedCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`, children: ["T\u1EA5t c\u1EA3 (", videos.length, ")"] }), categories.map(cat => (_jsx("button", { type: "button", onClick: () => setSelectedCategory(cat), className: `px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`, children: cat }, cat)))] }), _jsx("div", { className: "w-full lg:w-72 shrink-0", children: _jsx(Input, { value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "\uD83D\uDD0D T\u00ECm ki\u1EBFm video...", className: "w-full" }) })] }), isLoading ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200", children: [_jsx("div", { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" }), _jsx("p", { className: "text-slate-500 text-sm", children: "\u0110ang t\u1EA3i kho video..." })] })) : videos.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center px-4", children: [_jsx("div", { className: "h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-3 text-slate-400", children: "\uD83D\uDCFD\uFE0F" }), _jsx("h3", { className: "text-lg font-semibold text-slate-700", children: "Ch\u01B0a c\u00F3 video n\u00E0o" }), _jsx("p", { className: "text-sm text-slate-500 max-w-md mt-1", children: searchTerm || selectedCategory !== 'all'
                            ? 'Không tìm thấy video phù hợp với tiêu chí lọc hoặc từ khóa.'
                            : 'Hãy lưu lại các liên kết video YouTube yêu thích để mở phát nhanh chóng trong mỗi tiết học.' }), _jsx(Button, { variant: "secondary", onClick: handleOpenAddModal, className: "mt-4", children: "+ Th\u00EAm video \u0111\u1EA7u ti\u00EAn" })] })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: videos.map(v => {
                    const thumbUrl = getYouTubeThumbnailUrl(v.youtubeId);
                    return (_jsxs(Card, { className: "overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-200 border-slate-200 group", children: [_jsxs("div", { children: [_jsxs("div", { className: "relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer", onClick: () => setPlayingVideo(v), children: [_jsx("img", { src: thumbUrl, alt: v.title, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300", loading: "lazy" }), _jsx("div", { className: "absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center", children: _jsx("div", { className: "h-12 w-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform", children: _jsx("span", { className: "text-xl ml-0.5", children: "\u25B6" }) }) }), _jsx("div", { className: "absolute top-2.5 left-2.5", children: _jsx("span", { className: "px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm shadow-sm", children: v.category }) })] }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-bold text-slate-800 line-clamp-2 text-base leading-snug group-hover:text-blue-600 transition-colors cursor-pointer", onClick: () => setPlayingVideo(v), title: v.title, children: v.title }), v.description && (_jsx("p", { className: "text-xs text-slate-500 line-clamp-2 mt-1.5", title: v.description, children: v.description }))] })] }), _jsxs("div", { className: "p-4 pt-0 mt-2 border-t border-slate-100 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 flex-1", children: [_jsx("button", { type: "button", onClick: () => setPlayingVideo(v), className: "flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition", title: "Ph\u00E1t tr\u1EF1c ti\u1EBFp t\u1EA1i \u0111\u00E2y", children: "\u25B6 Ph\u00E1t" }), _jsx("button", { type: "button", onClick: () => handleOpenProjector(v), className: "flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition", title: "Chi\u1EBFu ra m\u00E0n h\u00ECnh 2 (M\u00E1y chi\u1EBFu)", children: "\uD83E\uDE9F M\u00E1y chi\u1EBFu" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => handleOpenEditModal(v), className: "p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition", title: "Ch\u1EC9nh s\u1EEDa th\u00F4ng tin", children: "\u270F\uFE0F" }), _jsx("button", { type: "button", onClick: () => setDeletingVideo(v), className: "p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition", title: "X\u00F3a video kh\u1ECFi kho", children: "\uD83D\uDDD1\uFE0F" })] })] })] }, v.id));
                }) })), playingVideo && (_jsx(Modal, { isOpen: true, onClose: () => setPlayingVideo(null), title: `🎬 ${playingVideo.title}`, maxWidth: "960px", children: _jsxs("div", { className: "w-full space-y-4", children: [_jsx("div", { className: "relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl", children: _jsx("iframe", { src: getYouTubeEmbedUrl(playingVideo.youtubeId, true), title: playingVideo.title, allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen", allowFullScreen: true, className: "absolute inset-0 h-full w-full border-0" }) }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2", children: [_jsxs("div", { children: [_jsx("span", { className: "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800", children: playingVideo.category }), playingVideo.description && (_jsx("p", { className: "text-sm text-slate-600 mt-1", children: playingVideo.description }))] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx(Button, { variant: "secondary", onClick: () => handleOpenProjector(playingVideo), className: "flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100", children: "\uD83E\uDE9F M\u1EDF m\u00E0n h\u00ECnh ri\u00EAng (Chi\u1EBFu m\u00E1y chi\u1EBFu)" }), _jsx(Button, { variant: "secondary", onClick: () => setPlayingVideo(null), children: "\u0110\u00F3ng" })] })] })] }) })), isEditModalOpen && (_jsx(Modal, { isOpen: true, onClose: () => !isSaving && setIsEditModalOpen(false), title: editingVideo ? '✏️ Chỉnh Sửa Video' : '➕ Thêm Video YouTube Mới', children: _jsxs("form", { onSubmit: e => void handleSaveVideo(e), className: "space-y-4 w-full box-border", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold text-slate-700 mb-1", children: ["\u0110\u01B0\u1EDDng d\u1EABn YouTube (URL ho\u1EB7c ID) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { value: formUrl, onChange: e => setFormUrl(e.target.value), placeholder: "https://www.youtube.com/watch?v=... ho\u1EB7c youtu.be/...", required: true, className: "w-full" }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "H\u1ED7 tr\u1EE3 m\u1ECDi \u0111\u1ECBnh d\u1EA1ng li\u00EAn k\u1EBFt YouTube (watch, shorts, youtu.be ho\u1EB7c m\u00E3 11 k\u00FD t\u1EF1)." })] }), previewYoutubeId && (_jsxs("div", { className: "rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2.5 flex items-center gap-3", children: [_jsx("img", { src: getYouTubeThumbnailUrl(previewYoutubeId), alt: "Preview", className: "w-24 aspect-video object-cover rounded-lg shadow-sm" }), _jsxs("div", { className: "text-xs text-slate-600", children: [_jsxs("div", { className: "font-semibold text-emerald-600 flex items-center gap-1", children: ["\u2713 \u0110\u00E3 nh\u1EADn di\u1EC7n ID:", ' ', _jsx("code", { className: "font-mono bg-white px-1 py-0.5 rounded border border-slate-200", children: previewYoutubeId })] }), _jsx("div", { className: "text-slate-400 mt-0.5", children: "S\u1EBD ph\u00E1t qua ch\u1EBF \u0111\u1ED9 b\u1EA3o v\u1EC7 quy\u1EC1n ri\u00EAng t\u01B0 kh\u00F4ng qu\u1EA3ng c\u00E1o." })] })] })), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold text-slate-700 mb-1", children: ["Ti\u00EAu \u0111\u1EC1 video ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { value: formTitle, onChange: e => setFormTitle(e.target.value), placeholder: "VD: Kh\u1EDFi \u0111\u1ED9ng v\u1EADn \u0111\u1ED9ng vui nh\u1ED9n...", required: true, className: "w-full" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold text-slate-700 mb-1", children: ["Ph\u00E2n lo\u1EA1i danh m\u1EE5c ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { value: formCategory, onChange: e => setFormCategory(e.target.value), className: "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100", children: [categories.map(c => (_jsx("option", { value: c, children: c }, c))), _jsx("option", { value: "custom", children: "+ Th\u00EAm danh m\u1EE5c m\u1EDBi..." })] }), formCategory === 'custom' && (_jsx("div", { className: "mt-2", children: _jsx(Input, { value: formCustomCategory, onChange: e => setFormCustomCategory(e.target.value), placeholder: "Nh\u1EADp t\u00EAn danh m\u1EE5c m\u1EDBi...", required: true, className: "w-full" }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-slate-700 mb-1", children: "Ghi ch\u00FA / M\u00F4 t\u1EA3 (t\u00F9y ch\u1ECDn)" }), _jsx("textarea", { value: formDescription, onChange: e => setFormDescription(e.target.value), placeholder: "Ghi ch\u00FA n\u1ED9i dung video, \u0111\u1ED1i t\u01B0\u1EE3ng ho\u1EB7c th\u1EDDi \u0111i\u1EC3m s\u1EED d\u1EE5ng...", rows: 3, className: "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-3 border-t border-slate-100", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: () => setIsEditModalOpen(false), disabled: isSaving, children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", type: "submit", disabled: isSaving, children: isSaving ? 'Đang lưu...' : editingVideo ? 'Cập nhật' : 'Thêm video' })] })] }) })), deletingVideo && (_jsx(Modal, { isOpen: true, onClose: () => !isDeleting && setDeletingVideo(null), title: "\u26A0\uFE0F X\u00E1c Nh\u1EADn X\u00F3a Video", children: _jsxs("div", { className: "space-y-4 w-full box-border", children: [_jsxs("p", { className: "text-sm text-slate-600", children: ["B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\u00F3a video", ' ', _jsxs("strong", { className: "text-slate-900 font-semibold", children: ["\"", deletingVideo.title, "\""] }), " kh\u1ECFi kho h\u1ECDc li\u1EC7u kh\u00F4ng? H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c."] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeletingVideo(null), disabled: isDeleting, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { variant: "danger", onClick: () => void handleConfirmDelete(), disabled: isDeleting, children: isDeleting ? 'Đang xóa...' : 'Xác nhận xóa' })] })] }) }))] }));
};
//# sourceMappingURL=VideoLibraryTab.js.map