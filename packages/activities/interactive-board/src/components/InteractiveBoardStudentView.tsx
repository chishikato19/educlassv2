import React, { useState } from 'react';
import type { BoardColor, BoardPost, BoardReactionType, BoardState } from '@educlass/protocol';
import { StudentPostEditor } from './StudentPostEditor.js';
import { PeerGradingModal } from './PeerGradingModal.js';
import { PeerGradesDetailModal } from './PeerGradesDetailModal.js';

export interface InteractiveBoardStudentViewProps {
  runId: string;
  state: BoardState;
  participantId: string;
  studentName?: string | undefined;
  onSendIntent: (intent: unknown) => void;
  onSwitchStudent?: (() => void) | undefined;
}

const COLOR_CLASSES: Record<BoardColor, { card: string; badge: string }> = {
  yellow: { card: 'bg-amber-50/90 border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  mint: { card: 'bg-emerald-50/90 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  blue: { card: 'bg-blue-50/90 border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  pink: { card: 'bg-pink-50/90 border-pink-200', badge: 'bg-pink-100 text-pink-800' },
  purple: { card: 'bg-purple-50/90 border-purple-200', badge: 'bg-purple-100 text-purple-800' },
};

export const InteractiveBoardStudentView: React.FC<InteractiveBoardStudentViewProps> = ({
  state,
  participantId,
  studentName,
  onSendIntent,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [gradingPost, setGradingPost] = useState<BoardPost | null>(null);
  const [viewingGradesPost, setViewingGradesPost] = useState<BoardPost | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  if (!state || !state.config) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#FFF9F0] text-slate-500 p-8">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-bold text-sm">Đang tải Bảng Tương Tác...</span>
      </div>
    );
  }

  const postsObj = state.posts || {};
  const myPost = participantId ? postsObj[participantId] : undefined;
  const hasSubmitted = Boolean(
    myPost && (myPost.text || myPost.imageUrl || myPost.drawingDataUrl || myPost.worksheetResult)
  );

  const postsList = Object.values(postsObj);
  const approvedPosts = postsList.filter(
    p => p.status === 'approved' || (participantId && p.participantId === participantId)
  );

  // Gửi bài nộp lên Thầy/Cô
  const handleSubmitPost = (data: {
    text: string;
    drawingDataUrl?: string | undefined;
    imageUrl?: string | undefined;
    color: BoardColor;
    worksheetAnswers?: Record<string, unknown> | undefined;
  }) => {
    onSendIntent({
      type: 'submit_post',
      text: data.text,
      drawingDataUrl: data.drawingDataUrl,
      imageUrl: data.imageUrl,
      color: data.color,
      authorName: studentName,
      worksheetAnswers: data.worksheetAnswers,
    });
    setIsEditorOpen(false);
  };

  // Thả cảm xúc Like/Heart
  const handleReact = (postId: string, reaction: BoardReactionType) => {
    onSendIntent({
      type: 'react_post',
      postId,
      reaction,
    });
  };

  // Chấm điểm bạn học
  const handleGradePeer = (postId: string, score: number, feedback?: string) => {
    onSendIntent({
      type: 'grade_peer_post',
      postId,
      score,
      feedback,
      authorName: studentName,
    });
  };

  // Gửi bình luận
  const handleAddComment = (postId: string) => {
    if (!commentInput.trim()) return;
    onSendIntent({
      type: 'add_comment',
      postId,
      content: commentInput.trim(),
      authorName: studentName,
    });
    setCommentInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#FFF9F0] text-slate-800 font-sans select-none overflow-hidden">
      {/* 1. Header Bảng Tương Tác */}
      <div className="bg-white px-4 py-3 border-b border-amber-200/80 shadow-sm flex items-center justify-between">
        <div className="flex-1 mr-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📌</span>
            <h1 className="font-extrabold text-slate-800 text-base md:text-lg line-clamp-1">
              {state.config.title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{state.config.prompt}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasSubmitted ? (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="min-h-[44px] px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <span>✏️</span> Sửa bài
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-200 transition flex items-center gap-1.5 animate-pulse"
            >
              <span>🚀</span> Nộp bài ngay
            </button>
          )}
        </div>
      </div>

      {/* 2. Thân cuộn chính */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Banner trạng thái bài nộp của bản thân */}
        {myPost ? (
          <div
            className={`p-3.5 rounded-2xl border shadow-sm ${
              myPost.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200'
                : myPost.status === 'rejected'
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {myPost.status === 'approved' ? '✅' : myPost.status === 'rejected' ? '⚠️' : '⏳'}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Bài làm của bạn</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {myPost.status === 'approved'
                      ? 'Bài của bạn đã được Thầy/Cô duyệt và hiển thị cho cả lớp!'
                      : myPost.status === 'rejected'
                        ? `Thầy/Cô yêu cầu chỉnh sửa: ${myPost.rejectionReason || 'Chưa đạt yêu cầu'}`
                        : 'Bài đang chờ Thầy/Cô duyệt trước khi hiển thị cho các bạn.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="text-xs font-bold px-3 py-1.5 bg-white border border-current rounded-xl transition"
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl text-white shadow-lg shadow-blue-200 text-center">
            <span className="text-3xl block mb-1">✍️</span>
            <h3 className="font-extrabold text-lg">Chia sẻ ý tưởng & bài làm của bạn!</h3>
            <p className="text-xs text-blue-100 mt-1 max-w-sm mx-auto">
              Viết chữ, vẽ tay hoặc chụp ảnh vở nộp lên để cùng xem và chấm điểm bài làm của cả lớp.
            </p>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="mt-3.5 min-h-[48px] px-6 py-2.5 bg-white text-blue-600 font-extrabold text-sm rounded-2xl shadow-md hover:bg-blue-50 transition"
            >
              BẮT ĐẦU NỘP BÀI
            </button>
          </div>
        )}

        {/* Thông báo khóa bài nếu chưa nộp */}
        {!hasSubmitted ? (
          <div className="p-8 bg-amber-50/90 border-2 border-dashed border-amber-300 rounded-3xl text-center space-y-3">
            <span className="text-5xl block animate-pulse">🔒</span>
            <h3 className="font-extrabold text-lg text-amber-950">
              Nội dung bài làm của cả lớp đang tạm ẩn
            </h3>
            <p className="text-sm text-amber-800 max-w-md mx-auto leading-relaxed">
              Bạn cần <strong>hoàn thành nộp bài làm của mình</strong> trước thì mới mở khóa xem sản
              phẩm của các bạn khác và cùng tham gia thả tim, góp ý, chấm điểm!
            </p>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="mt-2 min-h-[48px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-200 transition"
            >
              🚀 NỘP BÀI NGAY ĐỂ MỞ KHÓA
            </button>
          </div>
        ) : (
          /* 3. Lưới các bài đăng (Classroom Grid) khi đã nộp bài */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {approvedPosts.map(post => {
              const isMyOwn = post.participantId === participantId;
              const isLocked = Boolean(post.isLocked);
              const colorStyle = COLOR_CLASSES[post.color] || COLOR_CLASSES.yellow;

              const hasHeart = (post.hearts || []).includes(participantId);
              const hasLike = (post.likes || []).includes(participantId);
              const peerReviewCount = Object.keys(post.peerGrades || {}).length;

              return (
                <div
                  key={post.id}
                  className={`rounded-3xl border p-4 shadow-sm transition flex flex-col justify-between ${
                    post.isSpotlight ? 'ring-4 ring-amber-400 shadow-md' : ''
                  } ${isLocked ? 'bg-slate-100 border-dashed border-slate-300' : colorStyle.card}`}
                >
                  <div>
                    {/* Tiêu đề thẻ bài: Tên tác giả + Huy hiệu */}
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white font-black text-xs text-slate-700 flex items-center justify-center shadow-xs">
                          {post.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm">
                            {isMyOwn ? `${post.authorName} (Bạn)` : post.authorName}
                          </span>
                          {isLocked && (
                            <span className="text-[10px] text-slate-400 block">
                              Bài nộp đang bị khóa
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Huy hiệu xếp hạng hoặc Spotlight */}
                      <div className="flex items-center gap-1">
                        {post.isSpotlight && (
                          <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            🌟 Tiêu điểm
                          </span>
                        )}
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

                    {/* Nội dung bài nộp */}
                    {isLocked ? (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-center">
                        <span className="text-3xl mb-1">🔒</span>
                        <span className="text-xs font-semibold">Nộp bài của bạn để mở khóa</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Kết quả Phiếu bài tập (nếu có) */}
                        {post.worksheetResult && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3 py-2 flex items-center justify-between text-xs text-blue-900 font-bold shadow-xs">
                            <span className="flex items-center gap-1.5">
                              <span>📋</span> Phiếu bài tập:
                            </span>
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[11px] font-black">
                              Đúng {post.worksheetResult.correctCount}/
                              {post.worksheetResult.totalCount} (
                              {post.worksheetResult.autoScore.toFixed(1)}/
                              {post.worksheetResult.maxScore}đ)
                            </span>
                          </div>
                        )}

                        {/* Văn bản bài làm */}
                        {post.text && (
                          <p className="text-slate-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {post.text}
                          </p>
                        )}

                        {/* Nét vẽ tay */}
                        {post.drawingDataUrl && (
                          <div className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1">
                            <img
                              src={post.drawingDataUrl}
                              alt="Nét vẽ tay"
                              className="w-full max-h-48 object-contain rounded-xl"
                            />
                          </div>
                        )}

                        {/* Ảnh chụp vở / tài liệu */}
                        {post.imageUrl && (
                          <div
                            onClick={() => setZoomImageUrl(post.imageUrl || null)}
                            className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1 cursor-pointer group relative"
                          >
                            <img
                              src={post.imageUrl}
                              alt="Ảnh chụp bài làm"
                              className="w-full max-h-48 object-cover rounded-xl group-hover:scale-102 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-bold">
                              🔍 Nhấn để phóng to
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phần chân thẻ: Điểm số, Cảm xúc & Bình luận */}
                  {!isLocked && (
                    <div className="pt-3 mt-3 border-t border-black/5 space-y-2">
                      {/* Hàng 1: Điểm số (Điểm TB bạn học chấm + Điểm GV) */}
                      <div className="flex items-center justify-between text-xs">
                        {/* Nút bấm xem chi tiết ai chấm mấy điểm */}
                        {state.config.allowPeerGrades && (
                          <button
                            type="button"
                            onClick={() => setViewingGradesPost(post)}
                            className="font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-2 py-1 rounded-xl transition flex items-center gap-1"
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
                              ({peerReviewCount})
                            </span>
                          </button>
                        )}

                        {post.teacherGrade !== null && (
                          <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-xl">
                            GV: {post.teacherGrade} đ
                          </span>
                        )}
                      </div>

                      {/* Hàng 2: Nút tương tác Thả tim, Like, Chấm điểm & Bình luận */}
                      <div className="flex items-center justify-between pt-1">
                        {/* Thả tim ❤️ & Like 👍 */}
                        {state.config.allowReactions && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReact(post.id, 'heart')}
                              className={`min-h-[40px] px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                                hasHeart
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-white/80 hover:bg-white text-slate-600'
                              }`}
                            >
                              <span>❤️</span>
                              <span>{(post.hearts || []).length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReact(post.id, 'like')}
                              className={`min-h-[40px] px-2.5 py-1 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                                hasLike
                                  ? 'bg-blue-500 text-white shadow-xs'
                                  : 'bg-white/80 hover:bg-white text-slate-600'
                              }`}
                            >
                              <span>👍</span>
                              <span>{(post.likes || []).length}</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {/* Nút Chấm điểm bạn học (Không hiện trên bài của chính mình) */}
                          {state.config.allowPeerGrades && !isMyOwn && (
                            <button
                              type="button"
                              onClick={() => setGradingPost(post)}
                              className="min-h-[40px] px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
                            >
                              <span>⭐</span> Chấm điểm
                            </button>
                          )}

                          {/* Nút mở danh sách bình luận */}
                          {state.config.allowComments && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCommentsPostId(
                                  expandedCommentsPostId === post.id ? null : post.id
                                )
                              }
                              className="min-h-[40px] px-2.5 py-1 bg-white/80 hover:bg-white text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <span>💬</span>
                              <span>{(post.comments || []).length}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vùng bình luận mở rộng (Accordion) */}
                      {expandedCommentsPostId === post.id && (
                        <div className="pt-2 border-t border-black/5 space-y-2">
                          {/* Danh sách bình luận */}
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                            {(post.comments || []).length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-2">
                                Chưa có bình luận nào
                              </p>
                            ) : (
                              (post.comments || []).map(cm => (
                                <div
                                  key={cm.id}
                                  className={`p-2 rounded-xl text-xs ${
                                    cm.isTeacher
                                      ? 'bg-amber-100/90 border border-amber-300 text-amber-900 font-medium'
                                      : 'bg-white/80 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold mb-0.5">
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
                              ))
                            )}
                          </div>

                          {/* Form gửi bình luận */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={commentInput}
                              onChange={e => setCommentInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder={
                                state.isGlobalMuted
                                  ? 'Thầy/Cô đã khóa bình luận'
                                  : 'Nhận xét góp ý cho bạn...'
                              }
                              disabled={state.isGlobalMuted}
                              className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              disabled={state.isGlobalMuted || !commentInput.trim()}
                              className="min-h-[40px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition"
                            >
                              Gửi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal Soạn / Chỉnh sửa bài nộp */}
      {isEditorOpen && (
        <StudentPostEditor
          initialPost={myPost}
          prompt={state.config.prompt}
          allowDraw={state.config.allowDraw}
          allowImage={state.config.allowImage}
          worksheet={state.config.worksheet}
          onSubmit={handleSubmitPost}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}

      {/* 5. Modal Chấm điểm bạn học */}
      {gradingPost && (
        <PeerGradingModal
          post={gradingPost}
          currentParticipantId={participantId}
          maxGrade={state.config.maxGrade}
          onGrade={score => handleGradePeer(gradingPost.id, score)}
          onClose={() => setGradingPost(null)}
        />
      )}

      {/* 6. Modal Xem chi tiết ai chấm mấy điểm */}
      {viewingGradesPost && (
        <PeerGradesDetailModal
          post={viewingGradesPost}
          maxGrade={state.config.maxGrade}
          onClose={() => setViewingGradesPost(null)}
        />
      )}

      {/* 7. Lightbox phóng to ảnh chụp */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <img
            src={zoomImageUrl}
            alt="Phóng to ảnh bài làm"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
