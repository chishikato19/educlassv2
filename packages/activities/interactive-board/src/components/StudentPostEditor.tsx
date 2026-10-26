import React, { useState } from 'react';
import type { BoardColor, BoardPost, BoardWorksheetConfig } from '@educlass/protocol';
import { TouchDrawingCanvas } from './TouchDrawingCanvas.js';
import { compressImage } from '../utils/image-compressor.js';

export interface StudentPostEditorProps {
  initialPost?: BoardPost | undefined;
  prompt: string;
  allowDraw: boolean;
  allowImage: boolean;
  worksheet?: BoardWorksheetConfig | undefined;
  onSubmit: (data: {
    text: string;
    drawingDataUrl?: string | undefined;
    imageUrl?: string | undefined;
    color: BoardColor;
    worksheetAnswers?: Record<string, unknown> | undefined;
  }) => void;
  onCancel: () => void;
}

type EditorTab = 'worksheet' | 'text' | 'draw' | 'image';

const NOTE_COLORS: { id: BoardColor; label: string; bgClass: string; hex: string }[] = [
  { id: 'yellow', label: 'Vàng', bgClass: 'bg-amber-100 border-amber-300', hex: '#FEF3C7' },
  { id: 'mint', label: 'Mint', bgClass: 'bg-emerald-100 border-emerald-300', hex: '#D1FAE5' },
  { id: 'blue', label: 'Xanh', bgClass: 'bg-blue-100 border-blue-300', hex: '#DBEAFE' },
  { id: 'pink', label: 'Hồng', bgClass: 'bg-pink-100 border-pink-300', hex: '#FCE7F3' },
  { id: 'purple', label: 'Tím', bgClass: 'bg-purple-100 border-purple-300', hex: '#EDE9FE' },
];

interface WorksheetQuestionViewItem {
  id: string;
  type?: string;
  stem?: unknown;
  points?: number;
  options?: unknown[];
  leftItems?: Array<{ id: string; text: unknown }>;
  rightItems?: Array<{ id: string; text: unknown }>;
  blanks?: Array<{ id: string; hint?: string }>;
  wordBank?: string[];
  template?: string;
  [key: string]: unknown;
}

function getText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'text' in val) return String((val as { text: unknown }).text);
  return '';
}

export const StudentPostEditor: React.FC<StudentPostEditorProps> = ({
  initialPost,
  prompt,
  allowDraw,
  allowImage,
  worksheet,
  onSubmit,
  onCancel,
}) => {
  const hasWorksheet = Boolean(worksheet?.enabled && (worksheet.questions?.length ?? 0) > 0);
  const [activeTab, setActiveTab] = useState<EditorTab>(hasWorksheet ? 'worksheet' : 'text');
  const [text, setText] = useState<string>(initialPost?.text || '');
  const [color, setColor] = useState<BoardColor>(initialPost?.color || 'yellow');
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | undefined>(
    initialPost?.drawingDataUrl
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialPost?.imageUrl);
  const [worksheetAnswers, setWorksheetAnswers] = useState<Record<string, unknown>>(
    (initialPost?.worksheetResult?.answers as Record<string, unknown>) || {}
  );
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý nén ảnh tự động khi học sinh tải ảnh từ camera hoặc máy
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setErrorMessage(null);
      const res = await compressImage(file, 1280, 0.75);
      setImageUrl(res.dataUrl);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi xử lý ảnh');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const hasText = text.trim().length > 0;
    const hasDraw = Boolean(drawingDataUrl);
    const hasImage = Boolean(imageUrl);
    const hasAnswers = Object.keys(worksheetAnswers).length > 0;

    if (!hasText && !hasDraw && !hasImage && !hasAnswers) {
      setErrorMessage(
        hasWorksheet
          ? 'Vui lòng hoàn thành bài tập hoặc nhập văn bản, vẽ tay, tải ảnh trước khi nộp bài'
          : 'Vui lòng nhập văn bản, vẽ tay hoặc đính kèm ảnh trước khi nộp bài'
      );
      return;
    }

    onSubmit({
      text: text.trim(),
      drawingDataUrl,
      imageUrl,
      color,
      worksheetAnswers: hasAnswers ? worksheetAnswers : undefined,
    });
  };

  const tabCount = (hasWorksheet ? 1 : 0) + 1 + (allowDraw ? 1 : 0) + (allowImage ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        {/* Header Modal */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <span>✍️</span> {initialPost ? 'Chỉnh sửa bài nộp' : 'Soạn bài nộp'}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{prompt}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Thanh chuyển đổi Tab: Phiếu bài tập / Văn bản / Vẽ tay / Ảnh */}
        <div
          className="grid gap-1 p-2 bg-slate-100 border-b border-slate-200"
          style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
        >
          {hasWorksheet && (
            <button
              type="button"
              onClick={() => setActiveTab('worksheet')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'worksheet'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <span>📋</span> Bài tập
              {Object.keys(worksheetAnswers).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'text'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <span>📝</span> Văn bản
            {text.trim() && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </button>

          {allowDraw && (
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'draw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <span>🎨</span> Vẽ tay
              {drawingDataUrl && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          )}

          {allowImage && (
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'image'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <span>📷</span> Ảnh chụp
              {imageUrl && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          )}
        </div>

        {/* Nội dung theo từng Tab */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 0: Phiếu bài tập */}
          {activeTab === 'worksheet' && hasWorksheet && worksheet && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-blue-900 text-sm">
                    {worksheet.questionSetTitle || 'Phiếu học tập tương tác'}
                  </h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Gồm {worksheet.questions.length} câu hỏi. Điểm số sẽ được tự động chấm khi nộp bài.
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-white text-blue-700 rounded-xl shadow-xs">
                  {Object.keys(worksheetAnswers).length}/{worksheet.questions.length} đã làm
                </span>
              </div>

              {/* Danh sách câu hỏi */}
              <div className="space-y-4">
                {worksheet.questions.map((qAny, qIdx) => {
                  const q = qAny as WorksheetQuestionViewItem;
                  return (
                    <div
                      key={q.id || qIdx}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5"
                    >
                      {/* Tiêu đề câu hỏi */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-extrabold text-slate-800 text-sm">
                          <span className="text-blue-600 mr-1.5">Câu {qIdx + 1}.</span>
                          <span>{getText(q.stem)}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          {q.points || 10}đ
                        </span>
                      </div>

                      {/* Dạng 1: MCQ4 */}
                      {q.type === 'mcq4' && Array.isArray(q.options) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt: unknown, optIdx: number) => {
                            const optText = getText(opt);
                            const currentSelected = (
                              worksheetAnswers[q.id] as { selected?: number } | undefined
                            )?.selected;
                            const isSelected = currentSelected === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  setWorksheetAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: { selected: optIdx },
                                  }));
                                }}
                                className={`min-h-[44px] p-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isSelected
                                      ? 'bg-white text-blue-600'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 break-words">{optText}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Dạng 2: TF (Đúng / Sai) */}
                      {q.type === 'tf' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {[
                            {
                              val: true,
                              label: '✅ Đúng',
                              bg: 'bg-emerald-600 text-white border-emerald-600',
                            },
                            {
                              val: false,
                              label: '❌ Sai',
                              bg: 'bg-rose-600 text-white border-rose-600',
                            },
                          ].map((btn) => {
                            const currentSelected = (
                              worksheetAnswers[q.id] as { selected?: boolean } | undefined
                            )?.selected;
                            const isSelected = currentSelected === btn.val;
                            return (
                              <button
                                key={String(btn.val)}
                                type="button"
                                onClick={() => {
                                  setWorksheetAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: { selected: btn.val },
                                  }));
                                }}
                                className={`min-h-[44px] p-2.5 rounded-xl border text-center text-xs sm:text-sm font-bold transition ${
                                  isSelected
                                    ? `${btn.bg} shadow-sm`
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Dạng 3: Matching (Ghép nối) */}
                      {q.type === 'matching' &&
                        Array.isArray(q.leftItems) &&
                        Array.isArray(q.rightItems) && (
                          <div className="space-y-2 pt-1">
                            <div className="text-[11px] text-slate-500 font-bold uppercase">
                              Ghép từng mục Cột A với mục tương ứng ở Cột B:
                            </div>
                            {q.leftItems.map(
                              (left: { id: string; text: unknown }, lIdx: number) => {
                                const currentPairs =
                                  (
                                    worksheetAnswers[q.id] as
                                      | { pairs?: Record<string, string | null> }
                                      | undefined
                                  )?.pairs || {};
                                const currentRightId = currentPairs[left.id] || '';

                                return (
                                  <div
                                    key={left.id}
                                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                  >
                                    <div className="text-xs sm:text-sm font-bold text-slate-800">
                                      {lIdx + 1}. {getText(left.text)}
                                    </div>
                                    <select
                                      value={currentRightId}
                                      onChange={(e) => {
                                        const newRightId = e.target.value || null;
                                        setWorksheetAnswers((prev) => {
                                          const oldObj =
                                            (prev[q.id] as {
                                              pairs?: Record<string, string | null>;
                                            }) || {};
                                          const updatedPairs = {
                                            ...(oldObj.pairs || {}),
                                            [left.id]: newRightId,
                                          };
                                          return { ...prev, [q.id]: { pairs: updatedPairs } };
                                        });
                                      }}
                                      className="min-h-[40px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">-- Ghép với Cột B --</option>
                                      {(q.rightItems ?? []).map(
                                        (right: { id: string; text: unknown }, rIdx: number) => (
                                          <option key={right.id} value={right.id}>
                                            {String.fromCharCode(65 + rIdx)}. {getText(right.text)}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                      {/* Dạng 4: Cloze Drag (Điền từ vào ô trống) */}
                      {q.type === 'cloze_drag' &&
                        Array.isArray(q.blanks) &&
                        Array.isArray(q.wordBank) && (
                          <div className="space-y-2.5 pt-1">
                            {/* Ngân hàng từ khóa */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                                Từ khóa lựa chọn:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {q.wordBank.map((word: string, wIdx: number) => (
                                  <span
                                    key={wIdx}
                                    className="bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold shadow-xs"
                                  >
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Đoạn văn bản mẫu */}
                            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                              {q.template}
                            </div>

                            {/* Điền các ô trống */}
                            <div className="space-y-1.5">
                              {q.blanks.map(
                                (b: { id: string; hint?: string }, bIdx: number) => {
                                  const currentFilled =
                                    (
                                      worksheetAnswers[q.id] as
                                        | { filled?: Record<string, string | null> }
                                        | undefined
                                    )?.filled || {};
                                  const currentVal = currentFilled[b.id] || '';

                                  return (
                                    <div
                                      key={b.id || bIdx}
                                      className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200"
                                    >
                                      <span className="text-xs font-bold text-slate-600 min-w-[70px]">
                                        Ô [{b.id}]:
                                      </span>
                                      <select
                                        value={currentVal}
                                        onChange={(e) => {
                                          const chosenWord = e.target.value || null;
                                          setWorksheetAnswers((prev) => {
                                            const oldObj =
                                              (prev[q.id] as {
                                                filled?: Record<string, string | null>;
                                              }) || {};
                                            const updatedFilled = {
                                              ...(oldObj.filled || {}),
                                              [b.id]: chosenWord,
                                            };
                                            return { ...prev, [q.id]: { filled: updatedFilled } };
                                          });
                                        }}
                                        className="flex-1 min-h-[40px] px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">-- Chọn từ điền vào --</option>
                                        {(q.wordBank ?? []).map((w: string, wIdx: number) => (
                                          <option key={wIdx} value={w}>
                                            {w}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* TAB 1: Soạn văn bản */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              {/* Chọn màu giấy note */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  MÀU GIẤY GHI CHÚ
                </label>
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`min-h-[44px] min-w-[44px] rounded-2xl border-2 transition flex items-center justify-center font-bold text-xs ${
                        color === c.id
                          ? 'border-blue-600 ring-2 ring-blue-200 scale-105 shadow-sm'
                          : 'border-transparent'
                      }`}
                    >
                      {color === c.id && <span className="text-blue-600">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  NỘI DUNG BÀI LÀM
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập nội dung câu trả lời hoặc suy nghĩ của bạn... (Hỗ trợ công thức Toán dạng $x^2 + y^2 = r^2$)"
                  rows={6}
                  className="w-full p-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-base resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Mẹo: Nhập công thức Toán học bằng cách kẹp giữa 2 dấu đô la, ví dụ: <code>$E = mc^2$</code>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Nét vẽ tay */}
          {activeTab === 'draw' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">
                BẢNG VẼ TAY CẢM ỨNG
              </label>
              <div className="h-72 w-full">
                <TouchDrawingCanvas
                  initialDataUrl={drawingDataUrl}
                  onChange={(url) => setDrawingDataUrl(url)}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Đính kèm hình ảnh */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 block">
                CHỤP HOẶC TẢI ẢNH BÀI LÀM
              </label>

              {imageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex flex-col items-center">
                  <img
                    src={imageUrl}
                    alt="Xem trước bài làm"
                    className="max-h-64 object-contain rounded-xl shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="mt-2 min-h-[44px] px-4 py-2 bg-rose-50 text-rose-600 font-bold text-sm rounded-xl hover:bg-rose-100 transition flex items-center gap-1.5"
                  >
                    <span>🗑️</span> Xóa ảnh này
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="text-4xl mb-2">📸</div>
                  <h4 className="font-bold text-slate-700 text-base">Chụp ảnh vở hoặc tải ảnh bài tập</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Hệ thống sẽ tự động tối ưu hóa và nén nhẹ ảnh trước khi nộp
                  </p>
                  <label className="inline-flex min-h-[48px] px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 cursor-pointer shadow-md shadow-blue-200 transition items-center gap-2">
                    <span>{isCompressing ? '⏳ Đang nén ảnh...' : '📷 Chọn ảnh hoặc Chụp ngay'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer thao tác */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isCompressing}
            className="min-h-[48px] rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <span>🚀</span> {initialPost ? 'Cập nhật bài nộp' : 'Nộp bài lên Thầy/Cô'}
          </button>
        </div>
      </div>
    </div>
  );
};
