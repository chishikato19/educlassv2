import React from 'react';
import type { Question } from '@educlass/question-kit';
import { renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';

export interface QuestionCardPreviewProps {
  question: Question;
  index: number;
  showAnswers?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function getQuestionTypeBadge(type: string): { label: string; badgeClass: string } {
  switch (type) {
    case 'mcq4':
      return {
        label: 'Trắc nghiệm 4 lựa chọn',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'tf':
      return {
        label: 'Đúng / Sai',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'tf_group':
      return {
        label: 'Đúng / Sai 4 ý (BGD)',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'short':
      return {
        label: 'Trả lời ngắn',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'matching':
      return {
        label: 'Nối cặp',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      };
    case 'cloze_drag':
      return {
        label: 'Kéo thả khuyết',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    default:
      return {
        label: type,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

function getRichTextString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'text' in val) {
    return String((val as { text: unknown }).text || '');
  }
  return '';
}

function getRichTextImages(val: unknown): string[] {
  if (typeof val === 'object' && val !== null && 'images' in val) {
    const imgs = (val as { images: unknown }).images;
    if (Array.isArray(imgs)) {
      return imgs.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

export const QuestionCardPreview: React.FC<QuestionCardPreviewProps> = ({
  question,
  index,
  showAnswers = true,
  onEdit,
  onDelete,
}) => {
  const typeInfo = getQuestionTypeBadge(question.type);
  const stemText = getRichTextString(question.stem);
  const stemImages = getRichTextImages(question.stem);
  const explanationText = getRichTextString(question.explanation);

  return (
    <div
      data-testid={`question-preview-card-${index}`}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs transition hover:border-slate-300 space-y-3"
    >
      {/* Header thanh công cụ câu hỏi */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            Câu {index + 1}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${typeInfo.badgeClass}`}>
            {typeInfo.label}
          </span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {question.points ?? 10} điểm
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 min-h-[32px]"
            title="Chỉnh sửa chi tiết câu hỏi này"
          >
            <span>✏️</span>
            <span>Sửa câu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn xóa Câu ${index + 1} này không?`)) {
                onDelete();
              }
            }}
            className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 min-h-[32px]"
            title="Xóa câu hỏi khỏi bộ đề"
          >
            <span>🗑️</span>
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Nội dung đề bài (stem) hỗ trợ công thức toán KaTeX */}
      <div className="space-y-2">
        <div
          className="text-sm font-semibold text-slate-800 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: renderLatexInText(stemText || '(Chưa có nội dung câu hỏi)'),
          }}
        />

        {/* Ảnh minh họa của đề bài nếu có */}
        {stemImages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {stemImages.map((img, i) => (
              <img
                key={i}
                src={resolveAssetUrl(img)}
                alt={`Ảnh minh họa câu ${index + 1}`}
                className="max-h-48 rounded-lg border border-slate-200 object-contain bg-white shadow-xs"
              />
            ))}
          </div>
        )}
      </div>

      {/* Khu vực hiển thị đáp án & các phương án */}
      {showAnswers && (
        <div className="pt-1 border-t border-slate-50">
          {/* 1. Trắc nghiệm 4 lựa chọn (MCQ4) */}
          {question.type === 'mcq4' && Array.isArray(question.options) && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <span>🎯 Các phương án lựa chọn:</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Phương án viền xanh kèm nhãn &quot;Đáp án đúng&quot;)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.options.map((opt, optIdx) => {
                  const optText = getRichTextString(opt);
                  const optImages = getRichTextImages(opt);
                  const isCorrect = question.correct === optIdx;
                  const optLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

                  return (
                    <div
                      key={optIdx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs leading-relaxed transition-all ${
                        isCorrect
                          ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium shadow-xs ring-1 ring-emerald-300'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isCorrect ? '✓' : optLetter}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{optLetter}.</span>
                          <span
                            className="overflow-x-auto"
                            dangerouslySetInnerHTML={{
                              __html: renderLatexInText(optText || '(Trống)'),
                            }}
                          />
                          {isCorrect && (
                            <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Đáp án đúng
                            </span>
                          )}
                        </div>
                        {optImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {optImages.map((img, i) => (
                              <img
                                key={i}
                                src={resolveAssetUrl(img)}
                                alt={`Ảnh lựa chọn ${optLetter}`}
                                className="max-h-24 rounded-md border border-slate-200 object-contain bg-white"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Đúng / Sai đơn lẻ (TF) */}
          {question.type === 'tf' && (
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Đáp án chuẩn:</span>
              {question.correct === true ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  <span>✓</span>
                  <span>ĐÚNG (True)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold">
                  <span>✗</span>
                  <span>SAI (False)</span>
                </span>
              )}
            </div>
          )}

          {/* 3. Đúng / Sai 4 ý THPT (TF Group) */}
          {question.type === 'tf_group' && Array.isArray(question.items) && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-600 mb-1">
                Xét tính Đúng/Sai của từng ý:
              </div>
              <div className="space-y-1.5">
                {question.items.map((item, itemIdx) => {
                  const itemText = getRichTextString(item.text);
                  const itemImages = getRichTextImages(item.text);
                  const isCorrect = item.correct === true;
                  const itemLetter = String.fromCharCode(97 + itemIdx) + ')'; // a), b), c), d)

                  return (
                    <div
                      key={itemIdx}
                      className={`flex items-start justify-between gap-3 p-2 rounded-lg border text-xs ${
                        isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/50 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold mr-1.5 text-slate-800">{itemLetter}</span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: renderLatexInText(itemText),
                          }}
                        />
                        {itemImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5 ml-4">
                            {itemImages.map((img, i) => (
                              <img
                                key={i}
                                src={resolveAssetUrl(img)}
                                alt={`Ảnh ý ${itemLetter}`}
                                className="max-h-24 rounded border border-slate-200 object-contain bg-white"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {isCorrect ? '✓ ĐÚNG' : '✗ SAI'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Trả lời ngắn / Điền số (Short) */}
          {question.type === 'short' && (
            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex items-center gap-2 flex-wrap">
              <span className="font-bold text-blue-900 shrink-0">🔑 Đáp án được chấp nhận:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(question.accepted || []).map((ans, aIdx) => (
                  <span
                    key={aIdx}
                    className="px-2 py-0.5 rounded bg-white text-blue-800 border border-blue-300 font-mono font-bold text-xs shadow-2xs"
                  >
                    {ans}
                  </span>
                ))}
              </div>
              {question.caseSensitive && (
                <span className="text-[11px] text-slate-500 italic">
                  (Phân biệt chữ hoa / thường)
                </span>
              )}
            </div>
          )}

          {/* 5. Nối cặp (Matching) */}
          {question.type === 'matching' && Array.isArray((question as unknown as { pairs?: unknown[] }).pairs) && (
            <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 text-xs space-y-1.5">
              <span className="font-bold text-cyan-900">🔗 Các cặp nối đúng:</span>
              <div className="space-y-1">
                {((question as unknown as { pairs: Array<{ left: unknown; right: unknown }> }).pairs).map((pair, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-cyan-100">
                    <span className="font-medium text-slate-800">{getRichTextString(pair.left)}</span>
                    <span className="text-cyan-600 font-bold">⟷</span>
                    <span className="font-medium text-slate-800">{getRichTextString(pair.right)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lời giải thích / Hướng dẫn giải nếu có */}
          {explanationText && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <span className="font-bold shrink-0">💡 Lời giải:</span>
              <div
                className="flex-1 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderLatexInText(explanationText),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
