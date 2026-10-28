import React, { useState } from 'react';
import type { BoardColor, BoardPost, BoardState } from '@educlass/protocol';
import { TeacherGradeModal } from './TeacherGradeModal.js';
import { TeacherAwardModal } from './TeacherAwardModal.js';
import { TeacherRejectModal } from './TeacherRejectModal.js';
import { PeerGradesDetailModal } from './PeerGradesDetailModal.js';
import { InteractiveBoardProjectorView } from './InteractiveBoardProjectorView.js';

export interface InteractiveBoardTeacherPanelProps {
  runId: string;
  state: BoardState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity?: (() => void) | undefined;
}

type FilterTab = 'all' | 'spotlight' | 'graded' | 'popular' | 'ranked';

const COLOR_STYLES: Record<BoardColor, { card: string; header: string }> = {
  yellow: { card: 'bg-amber-50/90 border-amber-200', header: 'bg-amber-100/70 text-amber-900' },
  mint: {
    card: 'bg-emerald-50/90 border-emerald-200',
    header: 'bg-emerald-100/70 text-emerald-900',
  },
  blue: { card: 'bg-blue-50/90 border-blue-200', header: 'bg-blue-100/70 text-blue-900' },
  pink: { card: 'bg-pink-50/90 border-pink-200', header: 'bg-pink-100/70 text-pink-900' },
  purple: { card: 'bg-purple-50/90 border-purple-200', header: 'bg-purple-100/70 text-purple-900' },
};

export const InteractiveBoardTeacherPanel: React.FC<InteractiveBoardTeacherPanelProps> = ({
  runId,
  state,
  onSendIntent,
  onEndActivity,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [gradingPost, setGradingPost] = useState<BoardPost | null>(null);
  const [awardingPost, setAwardingPost] = useState<BoardPost | null>(null);
  const [rejectingPost, setRejectingPost] = useState<BoardPost | null>(null);
  const [viewingGradesPost, setViewingGradesPost] = useState<BoardPost | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [teacherCommentInput, setTeacherCommentInput] = useState<string>('');
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [showProjectorView, setShowProjectorView] = useState<boolean>(false);

  if (!state || !state.config) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 text-slate-500 p-8">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-bold text-sm">Đang tải dữ liệu Bảng Tương Tác...</span>
      </div>
    );
  }

  const postsObj = state.posts || {};
  const postsList = Object.values(postsObj);
  const pendingPosts = postsList.filter(p => p.status === 'pending');
  const approvedPosts = postsList.filter(p => p.status === 'approved');
  const activeSpotlightPost = approvedPosts.find(p => p.isSpotlight);

  // Lọc bài đã duyệt theo bộ lọc
  const filteredApprovedPosts = approvedPosts.filter(post => {
    if (filter === 'spotlight') return post.isSpotlight;
    if (filter === 'graded') return post.teacherGrade !== null;
    if (filter === 'popular') return (post.likes || []).length + (post.hearts || []).length > 0;
    if (filter === 'ranked') return post.rankAward !== null;
    return true;
  });

  // Gửi bình luận của giáo viên
  const handleSendTeacherComment = (postId: string) => {
    if (!teacherCommentInput.trim()) return;
    onSendIntent({
      type: 'teacher_comment',
      postId,
      content: teacherCommentInput.trim(),
    });
    setTeacherCommentInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 font-sans select-none overflow-hidden">
      {/* 1. Thanh tiêu đề & Điều khiển trung tâm */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📌</span>
            <h1 className="text-lg md:text-xl font-black text-slate-800">{state.config.title}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                state.status === 'accepting'
                  ? 'bg-emerald-100 text-emerald-800'
                  : state.status === 'discussion_only'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              {state.status === 'accepting'
                ? '📥 Đang nhận bài'
                : state.status === 'discussion_only'
                  ? '💬 Chỉ thảo luận'
                  : '⏹ Đã kết thúc'}
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{state.config.prompt}</p>
        </div>

        {/* Thanh công cụ quản trị của giáo viên */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Duyệt tất cả */}
          {pendingPosts.length > 0 && (
            <button
              type="button"
              onClick={() => onSendIntent({ type: 'approve_all' })}
              className="min-h-[42px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 animate-pulse"
            >
              <span>✓</span> Duyệt tất cả ({pendingPosts.length})
            </button>
          )}

          {/* Khóa / Mở bình luận toàn lớp */}
          <button
            type="button"
            onClick={() => onSendIntent({ type: 'toggle_global_mute' })}
            className={`min-h-[42px] px-3.5 py-2 font-bold text-xs rounded-xl border transition flex items-center gap-1.5 ${
              state.isGlobalMuted
                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>{state.isGlobalMuted ? '🔇' : '💬'}</span>
            <span>{state.isGlobalMuted ? 'Mở bình luận cả lớp' : 'Khóa bình luận cả lớp'}</span>
          </button>

          {/* Chuyển chế độ nhận bài / chỉ thảo luận */}
          <button
            type="button"
            onClick={() =>
              onSendIntent({
                type: 'toggle_status',
                status: state.status === 'accepting' ? 'discussion_only' : 'accepting',
              })
            }
            className="min-h-[42px] px-3.5 py-2 bg-white text-slate-700 border border-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <span>{state.status === 'accepting' ? '🛑' : '📥'}</span>
            <span>{state.status === 'accepting' ? 'Dừng nhận bài nộp' : 'Mở lại nhận bài'}</span>
          </button>

          {/* Mở Màn Chiếu Cả Lớp */}
          <button
            type="button"
            onClick={() => setShowProjectorView(true)}
            className="min-h-[42px] px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Mở màn chiếu lớn của lớp (Xem toàn cảnh hoặc bài chiếu phóng to)"
          >
            <span>📺</span>
            <span>Màn Chiếu Cả Lớp</span>
            {activeSpotlightPost && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
          </button>

          {/* Nút Kết thúc hoạt động */}
          {onEndActivity && (
            <button
              type="button"
              onClick={onEndActivity}
              className="min-h-[42px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>⏹</span> Kết thúc hoạt động
            </button>
          )}
        </div>
      </div>

      {/* Banner thông báo bài đang được chiếu tiêu điểm */}
      {activeSpotlightPost && (
        <div className="mx-4 mt-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5 text-xs md:text-sm font-black">
            <span className="text-2xl animate-bounce">🌟</span>
            <div>
              <span>
                Đang chiếu bài của <strong>{activeSpotlightPost.authorName}</strong> lên Tiêu điểm
                Màn Chiếu!
              </span>
              <p className="text-[11px] text-amber-100 font-normal">
                Bài làm đang được phóng to nổi bật cho toàn bộ học sinh quan sát
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProjectorView(true)}
              className="px-3.5 py-2 bg-white text-amber-900 rounded-xl font-extrabold text-xs hover:bg-amber-50 transition shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>📺</span>
              <span>Mở Màn Chiếu Xem Ngay</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSendIntent({ type: 'toggle_spotlight', postId: activeSpotlightPost.id })
              }
              className="px-3 py-2 bg-amber-700/80 hover:bg-amber-800 text-white rounded-xl font-bold text-xs transition cursor-pointer"
              title="Dừng chiếu bài này"
            >
              ✕ Dừng chiếu
            </button>
          </div>
        </div>
      )}

      {/* 2. Thân giao diện chính: 2 khu vực (Hàng đợi & Bảng lớp) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* CỘT TRÁI: Hàng đợi chờ duyệt (Chiếm 4 cột trên desktop) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-extrabold text-slate-800 text-sm">
                Hàng đợi chờ duyệt ({pendingPosts.length})
              </h2>
            </div>
            {pendingPosts.length > 0 && (
              <button
                type="button"
                onClick={() => onSendIntent({ type: 'approve_all' })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Duyệt nhanh hết
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingPosts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center">
                <span className="text-3xl mb-1">🎉</span>
                <span className="text-xs font-medium">Không có bài nào đang chờ duyệt</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Bài nộp của học sinh sẽ hiển thị tại đây để Thầy/Cô kiểm duyệt
                </span>
              </div>
            ) : (
              pendingPosts.map(post => (
                <div
                  key={post.id}
                  className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-black text-xs flex items-center justify-center">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {post.authorName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Nội dung bài nộp xem trước */}
                  {post.text && (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap break-words bg-white/80 p-2 rounded-xl border border-amber-100">
                      {post.text}
                    </p>
                  )}

                  {/* Ảnh hoặc nét vẽ thu nhỏ */}
                  <div className="flex items-center gap-2">
                    {post.drawingDataUrl && (
                      <div
                        onClick={() => setZoomImageUrl(post.drawingDataUrl || null)}
                        className="w-16 h-16 rounded-xl border border-slate-200 bg-white overflow-hidden cursor-pointer"
                        title="Bấm để xem nét vẽ"
                      >
                        <img
                          src={post.drawingDataUrl}
                          alt="Vẽ tay"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    {post.imageUrl && (
                      <div
                        onClick={() => setZoomImageUrl(post.imageUrl || null)}
                        className="w-16 h-16 rounded-xl border border-slate-200 bg-white overflow-hidden cursor-pointer"
                        title="Bấm để xem ảnh"
                      >
                        <img
                          src={post.imageUrl}
                          alt="Ảnh chụp"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Các nút duyệt / từ chối */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSendIntent({ type: 'delete_post', postId: post.id })}
                      className="min-h-[36px] px-2.5 py-1 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-semibold"
                      title="Xóa bài rác"
                    >
                      🗑️
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingPost(post)}
                      className="min-h-[36px] px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition"
                    >
                      ✕ Yêu cầu sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendIntent({ type: 'approve_post', postId: post.id })}
                      className="min-h-[36px] px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition"
                    >
                      ✓ Duyệt
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Bảng bài đã duyệt & công khai (Chiếm 8 cột trên desktop) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header Bảng lớp & Bộ lọc */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-slate-800 text-sm">
                Bài đã duyệt & công khai ({approvedPosts.length})
              </h2>
            </div>

            {/* Các tab bộ lọc */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'spotlight', label: '🌟 Tiêu điểm' },
                { id: 'graded', label: '✍️ Đã chấm' },
                { id: 'popular', label: '❤️ Nhiều Like' },
                { id: 'ranked', label: '🏆 Trao giải' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as FilterTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filter === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lưới các bài đăng của cả lớp */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredApprovedPosts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                <span className="text-4xl mb-2">📌</span>
                <span className="text-sm font-semibold text-slate-600">
                  Chưa có bài nào trong mục này
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  Duyệt bài từ hàng đợi bên trái để hiển thị lên bảng lớp
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredApprovedPosts.map(post => {
                  const style = COLOR_STYLES[post.color] || COLOR_STYLES.yellow;
                  const isMuted = state.mutedParticipants.includes(post.participantId);

                  return (
                    <div
                      key={post.id}
                      className={`rounded-3xl border p-4 shadow-xs flex flex-col justify-between transition ${
                        post.isSpotlight ? 'ring-4 ring-amber-400 shadow-md' : ''
                      } ${style.card}`}
                    >
                      <div>
                        {/* Tiêu đề thẻ: Tên HS + Ghim + Spotlight + Giải thưởng */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-black/5 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white font-black text-xs text-slate-700 flex items-center justify-center shadow-xs">
                              {post.authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 text-sm">
                                {post.authorName}
                              </span>
                              {post.studentCode && (
                                <span className="text-[10px] text-slate-400 ml-1">
                                  ({post.studentCode})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Nút Ghim */}
                            <button
                              type="button"
                              onClick={() => onSendIntent({ type: 'toggle_pin', postId: post.id })}
                              className={`p-1.5 rounded-lg text-xs transition ${
                                post.isPinned
                                  ? 'bg-amber-400 text-white'
                                  : 'text-slate-400 hover:bg-black/5'
                              }`}
                              title={post.isPinned ? 'Bỏ ghim' : 'Ghim bài'}
                            >
                              📌
                            </button>

                            {/* Huy hiệu Spotlight */}
                            {post.isSpotlight && (
                              <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                                🌟 Tiêu điểm
                              </span>
                            )}

                            {/* Huy hiệu Giải thưởng */}
                            {post.rankAward && (
                              <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {post.rankAward === 'top1'
                                  ? '🏆 Quán quân'
                                  : post.rankAward === 'top2'
                                    ? '🥈 Á quân'
                                    : post.rankAward === 'top3'
                                      ? '🥉 Quý quân'
                                      : '💡 Sáng tạo'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Thân bài nộp */}
                        <div className="space-y-2.5">
                          {post.worksheetResult && (
                            <div className="p-3 bg-white/90 rounded-2xl border border-indigo-200 shadow-xs space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                                <span className="flex items-center gap-1.5">
                                  <span>📝</span> Phiếu bài tập:
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                  Đúng {post.worksheetResult.correctCount}/
                                  {post.worksheetResult.totalCount} câu (
                                  {post.worksheetResult.autoScore}/{post.worksheetResult.maxScore}đ)
                                </span>
                              </div>
                            </div>
                          )}

                          {post.text && (
                            <p className="text-slate-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {post.text}
                            </p>
                          )}

                          {post.drawingDataUrl && (
                            <div
                              onClick={() => setZoomImageUrl(post.drawingDataUrl || null)}
                              className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1 cursor-pointer"
                            >
                              <img
                                src={post.drawingDataUrl}
                                alt="Nét vẽ"
                                className="w-full max-h-48 object-contain rounded-xl"
                              />
                            </div>
                          )}

                          {post.imageUrl && (
                            <div
                              onClick={() => setZoomImageUrl(post.imageUrl || null)}
                              className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1 cursor-pointer"
                            >
                              <img
                                src={post.imageUrl}
                                alt="Ảnh bài tập"
                                className="w-full max-h-48 object-cover rounded-xl"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chân thẻ: Điểm số & Thanh công cụ của GV */}
                      <div className="pt-3 mt-3 border-t border-black/5 space-y-2.5">
                        {/* Hàng điểm số & Thả tim/like */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {/* Nút xem chi tiết điểm bạn học chấm */}
                            {state.config.allowPeerGrades && (
                              <button
                                type="button"
                                onClick={() => setViewingGradesPost(post)}
                                className="font-bold text-blue-700 bg-blue-100/90 hover:bg-blue-200 px-2.5 py-1 rounded-xl transition flex items-center gap-1"
                                title="Bấm để xem danh sách bạn bè chấm điểm"
                              >
                                <span>📊</span>
                                <span>
                                  TB:{' '}
                                  {post.peerAverageScore !== null
                                    ? `${post.peerAverageScore}★`
                                    : 'Chưa có'}
                                </span>
                                <span className="text-[10px] text-blue-500 font-normal">
                                  ({Object.keys(post.peerGrades || {}).length})
                                </span>
                              </button>
                            )}

                            {/* Điểm của giáo viên */}
                            <span
                              className={`font-extrabold px-2.5 py-1 rounded-xl ${
                                post.teacherGrade !== null
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {post.teacherGrade !== null
                                ? `GV: ${post.teacherGrade} đ`
                                : 'Chưa chấm GV'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-500 font-bold">
                            <span>❤️ {(post.hearts || []).length}</span>
                            <span>👍 {(post.likes || []).length}</span>
                          </div>
                        </div>

                        {/* Thanh công cụ hành động của giáo viên */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1">
                            {/* Spotlight */}
                            <button
                              type="button"
                              onClick={() =>
                                onSendIntent({ type: 'toggle_spotlight', postId: post.id })
                              }
                              className={`min-h-[36px] px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                                post.isSpotlight
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                              title="Chiếu phóng to trung tâm màn chiếu"
                            >
                              <span>🌟</span>
                              <span>{post.isSpotlight ? 'Đang chiếu' : 'Chiếu'}</span>
                            </button>

                            {post.isSpotlight && (
                              <button
                                type="button"
                                onClick={() => setShowProjectorView(true)}
                                className="min-h-[36px] px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-[11px] rounded-xl transition flex items-center gap-1 cursor-pointer"
                                title="Xem ngay bài này trên Màn Chiếu Lớp Học"
                              >
                                <span>👁️ Xem chiếu</span>
                              </button>
                            )}

                            {/* Chấm điểm */}
                            <button
                              type="button"
                              onClick={() => setGradingPost(post)}
                              className="min-h-[36px] px-2.5 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <span>✍️</span> Chấm điểm
                            </button>

                            {/* Trao giải */}
                            <button
                              type="button"
                              onClick={() => setAwardingPost(post)}
                              className="min-h-[36px] px-2.5 py-1 bg-white hover:bg-slate-100 text-amber-700 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <span>🏆</span> Trao giải
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Bình luận */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCommentsPostId(
                                  expandedCommentsPostId === post.id ? null : post.id
                                )
                              }
                              className="min-h-[36px] px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <span>💬</span> {(post.comments || []).length}
                            </button>

                            {/* Cấm chat học sinh này */}
                            <button
                              type="button"
                              onClick={() =>
                                onSendIntent({
                                  type: 'toggle_mute_student',
                                  participantId: post.participantId,
                                })
                              }
                              className={`min-h-[36px] p-2 rounded-xl text-xs transition ${
                                isMuted
                                  ? 'bg-rose-100 text-rose-700 font-bold'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              }`}
                              title={isMuted ? 'Bỏ cấm chat em này' : 'Cấm em này bình luận'}
                            >
                              {isMuted ? '🔇' : '🗣️'}
                            </button>

                            {/* Xóa bài */}
                            <button
                              type="button"
                              onClick={() => onSendIntent({ type: 'delete_post', postId: post.id })}
                              className="min-h-[36px] p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs transition"
                              title="Xóa bài làm này"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Vùng bình luận chi tiết (Accordion) */}
                        {expandedCommentsPostId === post.id && (
                          <div className="pt-2 border-t border-black/5 space-y-2">
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                              {(post.comments || []).length === 0 ? (
                                <p className="text-[11px] text-slate-400 text-center py-2">
                                  Chưa có bình luận nào
                                </p>
                              ) : (
                                (post.comments || []).map(cm => (
                                  <div
                                    key={cm.id}
                                    className={`p-2 rounded-xl text-xs flex items-start justify-between gap-2 ${
                                      cm.isTeacher
                                        ? 'bg-amber-100/90 border border-amber-300 text-amber-950 font-medium'
                                        : 'bg-white/80 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1.5 font-bold mb-0.5">
                                        <span>{cm.isTeacher ? '⭐ Giáo viên' : cm.authorName}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          {new Date(cm.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                      <p className="break-words">{cm.content}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onSendIntent({
                                          type: 'delete_comment',
                                          postId: post.id,
                                          commentId: cm.id,
                                        })
                                      }
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded text-xs"
                                      title="Xóa bình luận vi phạm"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Ô nhập bình luận nổi bật của GV */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={teacherCommentInput}
                                onChange={e => setTeacherCommentInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSendTeacherComment(post.id);
                                }}
                                placeholder="Viết nhận xét với tư cách Giáo viên..."
                                className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendTeacherComment(post.id)}
                                disabled={!teacherCommentInput.trim()}
                                className="min-h-[38px] px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition"
                              >
                                Gửi
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Các Modal nghiệp vụ của Giáo viên */}
      {gradingPost && (
        <TeacherGradeModal
          post={gradingPost}
          maxGrade={state.config.maxGrade}
          onGrade={(grade, feedback) =>
            onSendIntent({
              type: 'grade_post',
              postId: gradingPost.id,
              grade,
              feedback,
            })
          }
          onClose={() => setGradingPost(null)}
        />
      )}

      {awardingPost && (
        <TeacherAwardModal
          post={awardingPost}
          onAward={rank =>
            onSendIntent({
              type: 'award_rank',
              postId: awardingPost.id,
              rank,
            })
          }
          onClose={() => setAwardingPost(null)}
        />
      )}

      {rejectingPost && (
        <TeacherRejectModal
          post={rejectingPost}
          onReject={reason =>
            onSendIntent({
              type: 'reject_post',
              postId: rejectingPost.id,
              reason,
            })
          }
          onClose={() => setRejectingPost(null)}
        />
      )}

      {viewingGradesPost && (
        <PeerGradesDetailModal
          post={viewingGradesPost}
          maxGrade={state.config.maxGrade}
          onClose={() => setViewingGradesPost(null)}
        />
      )}

      {/* Lightbox xem ảnh lớn */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <img
            src={zoomImageUrl}
            alt="Phóng to ảnh"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Cửa sổ Màn Chiếu Lớp Học phóng to toàn màn hình */}
      {showProjectorView && (
        <div className="fixed inset-0 z-50 bg-[#FFF9F0] flex flex-col overflow-hidden animate-in fade-in duration-200">
          <InteractiveBoardProjectorView
            runId={runId}
            state={state}
            onSendIntent={onSendIntent}
            onClose={() => setShowProjectorView(false)}
          />
        </div>
      )}
    </div>
  );
};
