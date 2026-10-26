import React from 'react';
import type { BoardColor, BoardState } from '@educlass/protocol';

export interface InteractiveBoardProjectorViewProps {
  runId: string;
  state: BoardState;
  onSendIntent?: ((intent: unknown) => void) | undefined;
  onClose?: (() => void) | undefined;
}

const COLOR_THEMES: Record<BoardColor, { card: string; header: string; pill: string }> = {
  yellow: { card: 'bg-amber-50/95 border-amber-300', header: 'text-amber-950', pill: 'bg-amber-100 text-amber-900' },
  mint: { card: 'bg-emerald-50/95 border-emerald-300', header: 'text-emerald-950', pill: 'bg-emerald-100 text-emerald-900' },
  blue: { card: 'bg-blue-50/95 border-blue-300', header: 'text-blue-950', pill: 'bg-blue-100 text-blue-900' },
  pink: { card: 'bg-pink-50/95 border-pink-300', header: 'text-pink-950', pill: 'bg-pink-100 text-pink-900' },
  purple: { card: 'bg-purple-50/95 border-purple-300', header: 'text-purple-950', pill: 'bg-purple-100 text-purple-900' },
};

export const InteractiveBoardProjectorView: React.FC<InteractiveBoardProjectorViewProps> = ({
  state,
  onSendIntent,
  onClose,
}) => {
  if (!state || !state.config) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#FFF9F0] text-slate-500 p-8">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-bold text-base">Đang tải Màn Chiếu Lớp Học...</span>
      </div>
    );
  }

  const postsObj = state.posts || {};
  const approvedPosts = Object.values(postsObj).filter((p) => p.status === 'approved');
  const spotlightPost = approvedPosts.find((p) => p.isSpotlight);

  const totalHearts = approvedPosts.reduce((acc, p) => acc + (p.hearts || []).length, 0);
  const totalLikes = approvedPosts.reduce((acc, p) => acc + (p.likes || []).length, 0);

  return (
    <div className="flex flex-col h-full w-full bg-[#FFF9F0] text-slate-800 p-6 md:p-8 font-sans select-none overflow-hidden">
      {/* 1. Header màn chiếu lớn */}
      <div className="flex items-center justify-between border-b-2 border-amber-200 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">📌</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
              {state.config.title}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 font-medium mt-1">
            {state.config.prompt}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-amber-200 font-extrabold text-blue-600 text-xl flex items-center gap-2">
            <span>📝</span>
            <span>{approvedPosts.length} Bài nộp</span>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-amber-200 font-extrabold text-rose-500 text-xl flex items-center gap-2">
            <span>❤️</span>
            <span>{totalHearts + totalLikes} Tương tác</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm transition shadow-sm flex items-center gap-1.5 cursor-pointer ml-2"
              title="Quay lại Bàn quản trị Giáo viên"
            >
              <span>✕</span>
              <span>Đóng Màn Chiếu</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CHẾ ĐỘ 1: TIÊU ĐIỂM CHỮA BÀI (SPOTLIGHT MODE) */}
      {spotlightPost ? (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border-4 border-amber-400 ring-8 ring-amber-200/50 shadow-2xl p-6 md:p-8 overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header Spotlight */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🌟</span>
              <div>
                <span className="text-xs font-black uppercase text-amber-600 tracking-widest">
                  TIÊU ĐIỂM BÀI LÀM XUẤT SẮC
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800">
                  {spotlightPost.authorName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {spotlightPost.rankAward && (
                <div className="text-base font-black px-4 py-2 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center gap-1.5 shadow-xs">
                  <span>
                    {spotlightPost.rankAward === 'top1'
                      ? '🏆 Quán quân'
                      : spotlightPost.rankAward === 'top2'
                      ? '🥈 Á quân'
                      : spotlightPost.rankAward === 'top3'
                      ? '🥉 Quý quân'
                      : '💡 Sáng tạo'}
                  </span>
                </div>
              )}
              {spotlightPost.peerAverageScore !== null && (
                <div className="text-xl font-black px-4 py-2 bg-blue-100 text-blue-700 rounded-2xl flex items-center gap-1.5 shadow-xs">
                  <span>📊</span>
                  <span>TB: {spotlightPost.peerAverageScore}★</span>
                </div>
              )}
              {spotlightPost.teacherGrade !== null && (
                <div className="text-xl font-black px-4 py-2 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-1.5 shadow-xs">
                  <span>✍️</span>
                  <span>Điểm GV: {spotlightPost.teacherGrade} đ</span>
                </div>
              )}
              {onSendIntent && (
                <button
                  type="button"
                  onClick={() => onSendIntent({ type: 'toggle_spotlight', postId: spotlightPost.id })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl border border-slate-300 transition flex items-center gap-1 cursor-pointer ml-1"
                  title="Dừng chiếu phóng to bài này, quay lại bảng chung"
                >
                  <span>✕</span>
                  <span>Thoát Tiêu Điểm</span>
                </button>
              )}
            </div>
          </div>

          {/* Nội dung trung tâm của Spotlight: 2 cột lớn */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 overflow-hidden">
            {/* Cột trái: Văn bản và Ảnh / Nét vẽ lớn (Chiếm 8 cột) */}
            <div className="md:col-span-8 flex flex-col overflow-y-auto pr-2 space-y-4">
              {spotlightPost.text && (
                <div className="p-5 bg-amber-50/50 rounded-3xl border border-amber-200">
                  <p className="text-2xl md:text-3xl text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {spotlightPost.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {spotlightPost.drawingDataUrl && (
                  <div className="rounded-3xl border-2 border-slate-200 bg-white p-3 flex flex-col items-center justify-center shadow-md">
                    <span className="text-xs font-bold text-slate-400 mb-2">🎨 NÉT VẼ TAY</span>
                    <img
                      src={spotlightPost.drawingDataUrl}
                      alt="Nét vẽ tay phóng to"
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                )}
                {spotlightPost.imageUrl && (
                  <div className="rounded-3xl border-2 border-slate-200 bg-white p-3 flex flex-col items-center justify-center shadow-md">
                    <span className="text-xs font-bold text-slate-400 mb-2">📷 ẢNH CHỤP BÀI LÀM</span>
                    <img
                      src={spotlightPost.imageUrl}
                      alt="Ảnh bài làm phóng to"
                      className="max-h-80 w-full object-contain rounded-2xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Lời nhận xét GV & Bình luận góp ý từ cả lớp (Chiếm 4 cột) */}
            <div className="md:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 p-5 flex flex-col overflow-hidden">
              <h3 className="font-extrabold text-slate-700 text-base mb-3 flex items-center gap-2">
                <span>💬</span> Nhận xét & Đánh giá ({(spotlightPost.comments || []).length})
              </h3>

              {spotlightPost.teacherFeedback && (
                <div className="p-3.5 bg-amber-100 border border-amber-300 rounded-2xl text-amber-950 mb-3 shadow-xs">
                  <div className="font-bold text-xs flex items-center gap-1.5 mb-1">
                    <span>⭐</span> Lời khen từ Giáo viên:
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{spotlightPost.teacherFeedback}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {(spotlightPost.comments || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Chưa có bình luận nhận xét nào
                  </div>
                ) : (
                  (spotlightPost.comments || []).map((cm) => (
                    <div
                      key={cm.id}
                      className={`p-3 rounded-2xl border text-sm ${
                        cm.isTeacher
                          ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1 font-bold">
                        <span>{cm.isTeacher ? '⭐ Giáo viên' : cm.authorName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(cm.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="break-words leading-relaxed">{cm.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. CHẾ ĐỘ 2: BẢNG LỚP TOÀN CẢNH (MASONRY WALL GRID) */
        <div className="flex-1 overflow-y-auto pr-1">
          {approvedPosts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
              <span className="text-6xl mb-3">🎨</span>
              <h3 className="text-2xl font-bold text-slate-600">Đang chờ các bài làm được nộp và phê duyệt...</h3>
              <p className="text-base text-slate-400 mt-1">
                Các sản phẩm học tập sẽ xuất hiện sinh động tại đây khi Thầy/Cô duyệt bài
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {approvedPosts.map((post) => {
                const theme = COLOR_THEMES[post.color] || COLOR_THEMES.yellow;

                return (
                  <div
                    key={post.id}
                    className={`rounded-3xl border-2 p-5 shadow-sm transition flex flex-col justify-between ${
                      post.isPinned ? 'ring-2 ring-amber-400' : ''
                    } ${theme.card}`}
                  >
                    <div>
                      {/* Tiêu đề thẻ tác giả */}
                      <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-white font-black text-base text-slate-800 flex items-center justify-center shadow-xs">
                            {post.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-black text-slate-800 text-lg">{post.authorName}</span>
                          </div>
                        </div>

                        {post.rankAward && (
                          <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-xl shadow-xs">
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

                      {/* Thân bài */}
                      <div className="space-y-3">
                        {post.worksheetResult && (
                          <div className="p-3 bg-white/95 rounded-2xl border border-indigo-200 shadow-xs flex items-center justify-between">
                            <span className="font-black text-indigo-950 text-sm flex items-center gap-1.5">
                              <span>📝</span> Phiếu bài tập:
                            </span>
                            <span className="font-extrabold text-sm px-3 py-1 bg-indigo-100 text-indigo-800 rounded-xl">
                              Đúng {post.worksheetResult.correctCount}/{post.worksheetResult.totalCount} ({post.worksheetResult.autoScore}/{post.worksheetResult.maxScore}đ)
                            </span>
                          </div>
                        )}

                        {post.text && (
                          <p className="text-slate-800 text-base font-medium leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
                            {post.text}
                          </p>
                        )}

                        {post.drawingDataUrl && (
                          <div className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1">
                            <img
                              src={post.drawingDataUrl}
                              alt="Nét vẽ"
                              className="w-full max-h-40 object-contain"
                            />
                          </div>
                        )}

                        {post.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-black/10 bg-white p-1">
                            <img
                              src={post.imageUrl}
                              alt="Ảnh chụp bài làm"
                              className="w-full max-h-40 object-cover rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Điểm số & Tương tác */}
                    <div className="pt-3 mt-3 border-t border-black/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.peerAverageScore !== null && (
                          <span className="text-xs font-extrabold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-xl">
                            TB: {post.peerAverageScore}★
                          </span>
                        )}
                        {post.teacherGrade !== null && (
                          <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl">
                            GV: {post.teacherGrade} đ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <span>❤️ {(post.hearts || []).length}</span>
                        <span>👍 {(post.likes || []).length}</span>
                        <span>💬 {(post.comments || []).length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
