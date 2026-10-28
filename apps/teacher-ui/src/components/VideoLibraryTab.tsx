import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  type VideoDto,
} from '@educlass/protocol';
import { Button, Card, Input, Modal } from '@educlass/ui-kit';
import { api } from '../api/client.js';

export interface VideoLibraryTabProps {
  onShowToast: (message: string) => void;
}

export const VideoLibraryTab: React.FC<VideoLibraryTabProps> = ({ onShowToast }) => {
  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;

  const [videos, setVideos] = useState<VideoDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal xem video
  const [playingVideo, setPlayingVideo] = useState<VideoDto | null>(null);

  // Modal thêm / chỉnh sửa video
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingVideo, setEditingVideo] = useState<VideoDto | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Khởi động');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal xác nhận xóa
  const [deletingVideo, setDeletingVideo] = useState<VideoDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Tải danh sách categories
  const loadCategories = useCallback(async () => {
    try {
      const cats = await api.getVideoCategories();
      setCategories(cats);
    } catch {
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
    } catch {
      onShowToastRef.current('Không thể tải danh sách video');
    } finally {
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
  const handleOpenEditModal = (video: VideoDto) => {
    setEditingVideo(video);
    setFormTitle(video.title);
    setFormUrl(video.url);
    if (categories.includes(video.category)) {
      setFormCategory(video.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('custom');
      setFormCustomCategory(video.category);
    }
    setFormDescription(video.description || '');
    setIsEditModalOpen(true);
  };

  // Lưu video (Thêm mới hoặc Cập nhật)
  const handleSaveVideo = async (e: React.FormEvent) => {
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
      } else {
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
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : editingVideo
            ? 'Lỗi khi cập nhật video'
            : 'Lỗi khi thêm video';
      onShowToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Xóa video
  const handleConfirmDelete = async () => {
    if (!deletingVideo) return;
    setIsDeleting(true);
    try {
      await api.deleteVideo(deletingVideo.id);
      onShowToast('Đã xóa video khỏi kho');
      setDeletingVideo(null);
      await loadCategories();
      await loadVideos();
    } catch {
      onShowToast('Lỗi khi xóa video');
    } finally {
      setIsDeleting(false);
    }
  };

  // Mở cửa sổ trình chiếu máy chiếu (Màn hình 2)
  const handleOpenProjector = (video: VideoDto) => {
    const url = `/teacher/?window=video&youtubeId=${encodeURIComponent(video.youtubeId)}&title=${encodeURIComponent(video.title)}`;
    window.open(
      url,
      `EduClass_Video_${video.youtubeId}`,
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  // Preview YouTube ID khi đang nhập form
  const previewYoutubeId = extractYouTubeId(formUrl.trim());

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <h1 className="text-2xl font-bold text-slate-800">Kho Video Học Liệu & Khởi Động</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Lưu trữ liên kết video YouTube dùng khởi động tiết học hoặc kho học liệu. Phát trực tiếp
            không quảng cáo theo dõi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 whitespace-nowrap shadow-md hover:shadow-lg transition"
          >
            <span className="text-lg font-bold leading-none">+</span> Thêm Video Mới
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả ({videos.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full lg:w-72 shrink-0">
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 Tìm kiếm video..."
            className="w-full"
          />
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-slate-500 text-sm">Đang tải kho video...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center px-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-3 text-slate-400">
            📽️
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Chưa có video nào</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1">
            {searchTerm || selectedCategory !== 'all'
              ? 'Không tìm thấy video phù hợp với tiêu chí lọc hoặc từ khóa.'
              : 'Hãy lưu lại các liên kết video YouTube yêu thích để mở phát nhanh chóng trong mỗi tiết học.'}
          </p>
          <Button variant="secondary" onClick={handleOpenAddModal} className="mt-4">
            + Thêm video đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map(v => {
            const thumbUrl = getYouTubeThumbnailUrl(v.youtubeId);
            return (
              <Card
                key={v.id}
                className="overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-200 border-slate-200 group"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div
                    className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer"
                    onClick={() => setPlayingVideo(v)}
                  >
                    <img
                      src={thumbUrl}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl ml-0.5">▶</span>
                      </div>
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-sm shadow-sm">
                        {v.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3
                      className="font-bold text-slate-800 line-clamp-2 text-base leading-snug group-hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={() => setPlayingVideo(v)}
                      title={v.title}
                    >
                      {v.title}
                    </h3>
                    {v.description && (
                      <p
                        className="text-xs text-slate-500 line-clamp-2 mt-1.5"
                        title={v.description}
                      >
                        {v.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 pt-0 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setPlayingVideo(v)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                      title="Phát trực tiếp tại đây"
                    >
                      ▶ Phát
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenProjector(v)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                      title="Chiếu ra màn hình 2 (Máy chiếu)"
                    >
                      🪟 Máy chiếu
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(v)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                      title="Chỉnh sửa thông tin"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingVideo(v)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Xóa video khỏi kho"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Phát Video Trực Tiếp */}
      {playingVideo && (
        <Modal
          isOpen={true}
          onClose={() => setPlayingVideo(null)}
          title={`🎬 ${playingVideo.title}`}
          maxWidth="960px"
        >
          <div className="w-full space-y-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
              <iframe
                src={getYouTubeEmbedUrl(playingVideo.youtubeId, true)}
                title={playingVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {playingVideo.category}
                </span>
                {playingVideo.description && (
                  <p className="text-sm text-slate-600 mt-1">{playingVideo.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => handleOpenProjector(playingVideo)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  🪟 Mở màn hình riêng (Chiếu máy chiếu)
                </Button>
                <Button variant="secondary" onClick={() => setPlayingVideo(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Thêm Mới / Chỉnh Sửa Video */}
      {isEditModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isSaving && setIsEditModalOpen(false)}
          title={editingVideo ? '✏️ Chỉnh Sửa Video' : '➕ Thêm Video YouTube Mới'}
        >
          <form onSubmit={e => void handleSaveVideo(e)} className="space-y-4 w-full box-border">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Đường dẫn YouTube (URL hoặc ID) <span className="text-red-500">*</span>
              </label>
              <Input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... hoặc youtu.be/..."
                required
                className="w-full"
              />
              <p className="text-xs text-slate-400 mt-1">
                Hỗ trợ mọi định dạng liên kết YouTube (watch, shorts, youtu.be hoặc mã 11 ký tự).
              </p>
            </div>

            {/* Thumbnail Preview khi phát hiện URL hợp lệ */}
            {previewYoutubeId && (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2.5 flex items-center gap-3">
                <img
                  src={getYouTubeThumbnailUrl(previewYoutubeId)}
                  alt="Preview"
                  className="w-24 aspect-video object-cover rounded-lg shadow-sm"
                />
                <div className="text-xs text-slate-600">
                  <div className="font-semibold text-emerald-600 flex items-center gap-1">
                    ✓ Đã nhận diện ID:{' '}
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                      {previewYoutubeId}
                    </code>
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Sẽ phát qua chế độ bảo vệ quyền riêng tư không quảng cáo.
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tiêu đề video <span className="text-red-500">*</span>
              </label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="VD: Khởi động vận động vui nhộn..."
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Phân loại danh mục <span className="text-red-500">*</span>
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="custom">+ Thêm danh mục mới...</option>
              </select>

              {formCategory === 'custom' && (
                <div className="mt-2">
                  <Input
                    value={formCustomCategory}
                    onChange={e => setFormCustomCategory(e.target.value)}
                    placeholder="Nhập tên danh mục mới..."
                    required
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Ghi chú / Mô tả (tùy chọn)
              </label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Ghi chú nội dung video, đối tượng hoặc thời điểm sử dụng..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : editingVideo ? 'Cập nhật' : 'Thêm video'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Xác Nhận Xóa Video */}
      {deletingVideo && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setDeletingVideo(null)}
          title="⚠️ Xác Nhận Xóa Video"
        >
          <div className="space-y-4 w-full box-border">
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa video{' '}
              <strong className="text-slate-900 font-semibold">"{deletingVideo.title}"</strong> khỏi
              kho học liệu không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingVideo(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
