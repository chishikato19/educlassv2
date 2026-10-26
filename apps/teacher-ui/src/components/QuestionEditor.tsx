import React, { useState } from 'react';
import type {
  Question,
  QuestionType,
  RichText,
  Mcq4Question,
  TfQuestion,
  TfGroupQuestion,
  ShortQuestion,
} from '@educlass/question-kit';
import {
  Mcq4QuestionSchema,
  TfQuestionSchema,
  TfGroupQuestionSchema,
  ShortQuestionSchema,
} from '@educlass/question-kit';
import { RichTextEditor } from './RichTextEditor.js';

export interface QuestionEditorProps {
  initialQuestion?: Question | undefined;
  onSave: (question: Question) => void;
  onCancel?: () => void;
}

function generateQuestionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const emptyRichText = (): RichText => ({ text: '', images: [] });

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialQuestion,
  onSave,
  onCancel,
}) => {
  // State loại câu hỏi
  const [type, setType] = useState<QuestionType>(initialQuestion?.type ?? 'mcq4');

  // Điểm số & lời giải thích
  const [points, setPoints] = useState<number>(initialQuestion?.points ?? 10);
  const [explanation, setExplanation] = useState<RichText>(
    initialQuestion?.explanation ?? emptyRichText(),
  );

  // Nội dung câu hỏi dẫn (stem)
  const [stem, setStem] = useState<RichText>(
    initialQuestion?.stem ?? emptyRichText(),
  );

  // State MCQ4: options là mảng tuple 4 phần tử tương ứng A, B, C, D
  const [mcqOptions, setMcqOptions] = useState<[RichText, RichText, RichText, RichText]>(() => {
    if (initialQuestion?.type === 'mcq4') {
      return initialQuestion.options;
    }
    return [emptyRichText(), emptyRichText(), emptyRichText(), emptyRichText()];
  });
  const [mcqCorrect, setMcqCorrect] = useState<number | null>(() => {
    if (initialQuestion?.type === 'mcq4') {
      return initialQuestion.correct;
    }
    return null;
  });

  // State TF
  const [tfCorrect, setTfCorrect] = useState<boolean | null>(() => {
    if (initialQuestion?.type === 'tf') {
      return initialQuestion.correct;
    }
    return null;
  });

  // State TF Group (4 items tương ứng a, b, c, d)
  const [tfGroupItems, setTfGroupItems] = useState<[RichText, RichText, RichText, RichText]>(() => {
    if (initialQuestion?.type === 'tf_group') {
      return [
        initialQuestion.items[0].text,
        initialQuestion.items[1].text,
        initialQuestion.items[2].text,
        initialQuestion.items[3].text,
      ];
    }
    return [emptyRichText(), emptyRichText(), emptyRichText(), emptyRichText()];
  });
  const [tfGroupAnswers, setTfGroupAnswers] = useState<[boolean, boolean, boolean, boolean]>(() => {
    if (initialQuestion?.type === 'tf_group') {
      return [
        initialQuestion.items[0].correct,
        initialQuestion.items[1].correct,
        initialQuestion.items[2].correct,
        initialQuestion.items[3].correct,
      ];
    }
    return [true, false, true, false];
  });

  // State Short Answer
  const [shortAccepted, setShortAccepted] = useState<string[]>(() => {
    if (initialQuestion?.type === 'short') {
      return initialQuestion.accepted;
    }
    return [''];
  });
  const [shortCaseSensitive, setShortCaseSensitive] = useState<boolean>(() => {
    if (initialQuestion?.type === 'short') {
      return initialQuestion.caseSensitive ?? false;
    }
    return false;
  });

  // Validation Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý lưu câu hỏi
  const handleSave = () => {
    setErrorMessage(null);

    if (!stem.text.trim()) {
      setErrorMessage('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    const qId = initialQuestion?.id ?? generateQuestionId();

    try {
      if (type === 'mcq4') {
        if (mcqCorrect === null) {
          setErrorMessage('Vui lòng chọn đáp án đúng cho câu trắc nghiệm (A, B, C hoặc D).');
          return;
        }

        const questionPayload: Mcq4Question = {
          id: qId,
          type: 'mcq4',
          points,
          stem,
          options: mcqOptions,
          correct: mcqCorrect,
          ...(explanation.text.trim() ? { explanation } : {}),
        };

        const parsed = Mcq4QuestionSchema.safeParse(questionPayload);
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi trắc nghiệm không hợp lệ.',
          );
          return;
        }

        onSave(parsed.data);
      } else if (type === 'tf') {
        if (tfCorrect === null) {
          setErrorMessage('Vui lòng chọn đáp án đúng cho câu hỏi Đúng / Sai.');
          return;
        }

        const questionPayload: TfQuestion = {
          id: qId,
          type: 'tf',
          points,
          stem,
          correct: tfCorrect,
          ...(explanation.text.trim() ? { explanation } : {}),
        };

        const parsed = TfQuestionSchema.safeParse(questionPayload);
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi Đúng / Sai không hợp lệ.',
          );
          return;
        }

        onSave(parsed.data);
      } else if (type === 'tf_group') {
        const questionPayload: TfGroupQuestion = {
          id: qId,
          type: 'tf_group',
          points,
          stem,
          items: [
            { text: tfGroupItems[0], correct: tfGroupAnswers[0] },
            { text: tfGroupItems[1], correct: tfGroupAnswers[1] },
            { text: tfGroupItems[2], correct: tfGroupAnswers[2] },
            { text: tfGroupItems[3], correct: tfGroupAnswers[3] },
          ],
          ...(explanation.text.trim() ? { explanation } : {}),
        };

        const parsed = TfGroupQuestionSchema.safeParse(questionPayload);
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi Đúng / Sai nhóm không hợp lệ.',
          );
          return;
        }

        onSave(parsed.data);
      } else if (type === 'short') {
        const filteredAccepted = shortAccepted.map((s) => s.trim()).filter((s) => s.length > 0);
        if (filteredAccepted.length === 0) {
          setErrorMessage('Vui lòng nhập ít nhất một đáp án được chấp nhận.');
          return;
        }

        const questionPayload: ShortQuestion = {
          id: qId,
          type: 'short',
          points,
          stem,
          accepted: filteredAccepted,
          caseSensitive: shortCaseSensitive,
          ...(explanation.text.trim() ? { explanation } : {}),
        };

        const parsed = ShortQuestionSchema.safeParse(questionPayload);
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.errors[0]?.message ?? 'Dữ liệu câu hỏi trả lời ngắn không hợp lệ.',
          );
          return;
        }

        onSave(parsed.data);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi lưu câu hỏi.');
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'] as const;
  const itemLabels = ['a', 'b', 'c', 'd'] as const;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      {/* Tiêu đề & Chọn loại câu hỏi */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Soạn câu hỏi mới</h2>

        {/* Tabs loại câu hỏi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            data-testid="tab-type-mcq4"
            onClick={() => setType('mcq4')}
            className={`px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${
              type === 'mcq4'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Trắc nghiệm 4 lựa chọn
          </button>
          <button
            type="button"
            data-testid="tab-type-tf"
            onClick={() => setType('tf')}
            className={`px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${
              type === 'tf'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Đúng / Sai
          </button>
          <button
            type="button"
            data-testid="tab-type-tf_group"
            onClick={() => setType('tf_group')}
            className={`px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${
              type === 'tf_group'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Đúng / Sai nhóm (BGD)
          </button>
          <button
            type="button"
            data-testid="tab-type-short"
            onClick={() => setType('short')}
            className={`px-3 py-2.5 text-sm font-semibold rounded-lg border min-h-[48px] flex items-center justify-center transition-colors ${
              type === 'short'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Trả lời ngắn
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div
          data-testid="editor-error-message"
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
        >
          <span className="font-bold">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Nội dung câu hỏi dẫn (Stem) */}
      <RichTextEditor
        label="Nội dung câu hỏi"
        value={stem}
        onChange={setStem}
        placeholder="Nhập nội dung câu hỏi, gõ $x^2$ hoặc $$\frac{a}{b}$$ để viết công thức toán KaTeX..."
        testIdPrefix="stem"
        minRows={4}
        required
      />

      {/* Khu vực nhập phương án / đáp án theo loại câu hỏi */}
      {type === 'mcq4' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800">
            Các lựa chọn (chọn 1 phương án đúng):
          </h3>
          {optionLabels.map((optLabel, idx) => (
            <div key={optLabel} className="flex items-start gap-3">
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-[48px] px-2 rounded hover:bg-gray-100">
                  <input
                    type="radio"
                    name="mcq-correct"
                    data-testid={`radio-option-correct-${optLabel}`}
                    checked={mcqCorrect === idx}
                    onChange={() => setMcqCorrect(idx)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-base text-gray-900">{optLabel}</span>
                </label>
              </div>
              <div className="flex-1">
                <RichTextEditor
                  value={mcqOptions[idx]!}
                  onChange={(val) => {
                    const newOpts = [...mcqOptions] as [RichText, RichText, RichText, RichText];
                    newOpts[idx] = val;
                    setMcqOptions(newOpts);
                  }}
                  placeholder={`Nội dung lựa chọn ${optLabel}...`}
                  testIdPrefix={`option-${optLabel}`}
                  minRows={2}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'tf' && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">Đáp án đúng:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="tf-correct"
                data-testid="radio-tf-true"
                checked={tfCorrect === true}
                onChange={() => setTfCorrect(true)}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-900">Đúng (True)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="tf-correct"
                data-testid="radio-tf-false"
                checked={tfCorrect === false}
                onChange={() => setTfCorrect(false)}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-900">Sai (False)</span>
            </label>
          </div>
        </div>
      )}

      {type === 'tf_group' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              4 Mệnh đề Đúng / Sai (Barem Bộ Giáo dục 0.1 - 0.25 - 0.5 - 1.0):
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              1 đúng: 0.1đ | 2 đúng: 0.25đ | 3 đúng: 0.5đ | 4 đúng: 1.0đ
            </span>
          </div>

          {itemLabels.map((itemLabel, idx) => (
            <div key={itemLabel} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-800">
                  Ý {itemLabel.toUpperCase()})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid={`item-${itemLabel}-true`}
                    onClick={() => {
                      const newAns = [...tfGroupAnswers] as [boolean, boolean, boolean, boolean];
                      newAns[idx] = true;
                      setTfGroupAnswers(newAns);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded min-h-[40px] transition-colors ${
                      tfGroupAnswers[idx] === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    data-testid={`item-${itemLabel}-false`}
                    onClick={() => {
                      const newAns = [...tfGroupAnswers] as [boolean, boolean, boolean, boolean];
                      newAns[idx] = false;
                      setTfGroupAnswers(newAns);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded min-h-[40px] transition-colors ${
                      tfGroupAnswers[idx] === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sai
                  </button>
                </div>
              </div>
              <RichTextEditor
                value={tfGroupItems[idx]!}
                onChange={(val) => {
                  const newItems = [...tfGroupItems] as [RichText, RichText, RichText, RichText];
                  newItems[idx] = val;
                  setTfGroupItems(newItems);
                }}
                placeholder={`Nội dung mệnh đề ${itemLabel.toUpperCase()}...`}
                testIdPrefix={`item-${itemLabel}`}
                minRows={2}
              />
            </div>
          ))}
        </div>
      )}

      {type === 'short' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Các đáp án được chấp nhận:</h3>
            <button
              type="button"
              data-testid="btn-add-accepted-answer"
              onClick={() => setShortAccepted((prev) => [...prev, ''])}
              className="px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 min-h-[48px] flex items-center gap-1"
            >
              + Thêm đáp án chấp nhận
            </button>
          </div>

          <div className="space-y-2">
            {shortAccepted.map((ans, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  data-testid={`input-accepted-answer-${idx}`}
                  value={ans}
                  onChange={(e) => {
                    const newArr = [...shortAccepted];
                    newArr[idx] = e.target.value;
                    setShortAccepted(newArr);
                  }}
                  placeholder={`Đáp án hợp lệ ${idx + 1} (vd: 3.14, ba phẩy mười bốn...)`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                />
                {shortAccepted.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShortAccepted((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md min-h-[48px]"
                    title="Xóa đáp án này"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={shortCaseSensitive}
              onChange={(e) => setShortCaseSensitive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Phân biệt chữ hoa / chữ thường</span>
          </label>
        </div>
      )}

      {/* Cài đặt điểm & Lời giải thích */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Điểm số câu hỏi:
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={points}
            onChange={(e) => setPoints(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
          />
        </div>
      </div>

      {/* Lời giải thích (tùy chọn) */}
      <RichTextEditor
        label="Lời giải thích / Hướng dẫn giải (tùy chọn)"
        value={explanation}
        onChange={setExplanation}
        placeholder="Nhập lời giải chi tiết giúp học sinh hiểu bài..."
        testIdPrefix="explanation"
        minRows={2}
      />

      {/* Các nút hành động */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg min-h-[48px] transition-colors"
          >
            Hủy bỏ
          </button>
        )}
        <button
          type="button"
          data-testid="btn-save-question"
          onClick={handleSave}
          className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm min-h-[48px] transition-colors"
        >
          Lưu câu hỏi
        </button>
      </div>
    </div>
  );
};
