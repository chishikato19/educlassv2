import React, { useId, useState } from 'react';
import type { CreateBankQuestionRequest, DifficultyLevel, QuestionType } from '@educlass/protocol';
import { renderLatexInText, type Question } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { COMMON_SUBJECTS, GRADES } from './BankCurriculumTree.js';
import { getDifficultyBadgeInfo } from './DifficultyFilterBar.js';

export interface BankWordImportWarning {
  questionIndex: number;
  questionNumberStr?: string | undefined;
  rawText: string;
  reason: string;
}

export interface BankWordParsedData {
  questions: Array<
    Question & {
      difficulty?: DifficultyLevel | undefined;
      chapter?: string | undefined;
      lesson?: string | undefined;
    }
  >;
  warnings: BankWordImportWarning[];
  totalDetected: number;
  successCount: number;
}

export interface BankWordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  currentGrade?: number | undefined;
  currentSubject?: string | undefined;
  currentChapter?: string | null | undefined;
  currentLesson?: string | null | undefined;
}

export const BankWordImportModal: React.FC<BankWordImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentGrade = 12,
  currentSubject = 'Toán',
  currentChapter = null,
  currentLesson = null,
}) => {
  // Trạng thái cấu hình mặc định (khi file Word không có nhãn)
  const [grade, setGrade] = useState<number>(currentGrade);
  const [subject, setSubject] = useState<string>(currentSubject);
  const [defaultChapter, setDefaultChapter] = useState<string>(
    currentChapter || 'Chương 1: Kiến thức nền tảng'
  );
  const [defaultLesson, setDefaultLesson] = useState<string>(currentLesson || 'Bài 1: Tổng quan');
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>('nb');

  // Trạng thái xử lý file & xem trước
  const [parsedData, setParsedData] = useState<BankWordParsedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const fileInputId = useId();

  if (!isOpen) return null;

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64 ?? '');
        };
        reader.onerror = () => reject(new Error('Không thể đọc file từ thiết bị'));
        reader.readAsDataURL(file);
      } else {
        file
          .arrayBuffer()
          .then(buf => {
            if (typeof Buffer !== 'undefined') {
              resolve(Buffer.from(buf).toString('base64'));
            } else {
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]!);
              }
              resolve(window.btoa(binary));
            }
          })
          .catch(reject);
      }
    });
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMessage('Vui lòng chọn tập tin Microsoft Word định dạng .docx');
      return;
    }

    setSelectedFileName(file.name);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.ensureAuthenticated();
      const base64 = await readFileAsBase64(file);
      const data = await api.importWord<BankWordParsedData>(base64);
      setParsedData(data);
    } catch (err: unknown) {
      let msg = 'Có lỗi khi đọc và phân tích file Word. Vui lòng kiểm tra lại định dạng file.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message);
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      void processFile(file);
    }
  };

  // Cập nhật mức độ câu hỏi xem trước
  const handleUpdateItemDifficulty = (index: number, newDiff: DifficultyLevel) => {
    if (!parsedData) return;
    const nextQuestions = [...parsedData.questions];
    const target = nextQuestions[index];
    if (target) {
      nextQuestions[index] = { ...target, difficulty: newDiff };
      setParsedData({ ...parsedData, questions: nextQuestions });
    }
  };

  // Lưu hàng loạt câu hỏi vào ngân hàng
  const handleSaveToBank = async () => {
    if (!parsedData || parsedData.questions.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const bankItems: CreateBankQuestionRequest[] = parsedData.questions.map(q => {
        const itemChapter = q.chapter?.trim() || defaultChapter.trim() || 'Chương 1';
        const itemLesson = q.lesson?.trim() || defaultLesson.trim() || 'Bài 1';
        const itemDifficulty = (q.difficulty as DifficultyLevel) || defaultDifficulty;
        const itemType = (q.type as QuestionType) || 'mcq4';

        // Tách contentJson và answerJson
        let contentJson = '{}';
        let answerJson = '{}';

        if (q.type === 'mcq4') {
          contentJson = JSON.stringify({
            stem: q.stem,
            options: q.options,
          });
          answerJson = JSON.stringify({
            correct: q.correct,
            ...(q.explanation ? { explanation: q.explanation.text } : {}),
          });
        } else if (q.type === 'tf') {
          contentJson = JSON.stringify({
            stem: q.stem,
          });
          answerJson = JSON.stringify({
            correct: q.correct,
            ...(q.explanation ? { explanation: q.explanation.text } : {}),
          });
        } else if (q.type === 'tf_group') {
          contentJson = JSON.stringify({
            stem: q.stem,
            items: q.items,
          });
          answerJson = JSON.stringify({
            items: q.items.map(it => it.correct),
            ...(q.explanation ? { explanation: q.explanation.text } : {}),
          });
        } else if (q.type === 'short') {
          contentJson = JSON.stringify({
            stem: q.stem,
          });
          answerJson = JSON.stringify({
            acceptedAnswers: q.accepted,
            ...(q.explanation ? { explanation: q.explanation.text } : {}),
          });
        } else {
          contentJson = JSON.stringify(q);
          answerJson = JSON.stringify({
            correct: (q as unknown as { correct?: unknown }).correct,
          });
        }

        return {
          grade,
          subject: subject.trim(),
          chapter: itemChapter,
          lesson: itemLesson,
          difficulty: itemDifficulty,
          type: itemType,
          points: (q as unknown as { points?: number }).points ?? 10,
          contentJson,
          answerJson,
        };
      });

      const res = await api.createBatchBankQuestions(bankItems);
      onSuccess(res.count);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi vào ngân hàng');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-base">
              📄
            </span>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Nhập Câu Hỏi Word Vào Ngân Hàng
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tự động nhận diện [Chương], [Bài] và mức độ [NB], [TH], [VD], [VDC]
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* VÙNG THIẾT LẬP THÔNG TIN MẶC ĐỊNH (ÁP DỤNG KHI FILE THIẾU NHÃN) */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              1. Cấu hình phân cấp mặc định
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Khối lớp *
                </label>
                <select
                  value={grade}
                  onChange={e => setGrade(Number(e.target.value))}
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer"
                >
                  {GRADES.map(g => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Môn học *
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer"
                >
                  {COMMON_SUBJECTS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Chương mặc định
                </label>
                <input
                  type="text"
                  value={defaultChapter}
                  onChange={e => setDefaultChapter(e.target.value)}
                  placeholder="VD: Chương 1"
                  className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Bài mặc định
                </label>
                <input
                  type="text"
                  value={defaultLesson}
                  onChange={e => setDefaultLesson(e.target.value)}
                  placeholder="VD: Bài 1"
                  className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Mức độ mặc định nếu câu không gắn nhãn:
              </span>
              <div className="flex items-center gap-2">
                {(['nb', 'th', 'vd', 'vdc'] as const).map(diff => {
                  const info = getDifficultyBadgeInfo(diff);
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDefaultDifficulty(diff)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        defaultDifficulty === diff ? info.activeBtnClass : info.inactiveBtnClass
                      }`}
                    >
                      {info.shapeIcon} {info.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* VÙNG KÉO THẢ FILE WORD */}
          {!parsedData ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/30'
              }`}
            >
              <input
                id={fileInputId}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-3xl mb-3 shadow-xs">
                📄
              </div>

              <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Kéo thả file Microsoft Word (.docx) vào đây
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-4">
                Hệ thống tự động phát hiện các nhãn cú pháp [Chương: ...], [Bài: ...], [NB], [TH],
                [VD], [VDC] và hình ảnh đính kèm.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 min-h-[44px] cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'Đang đọc và phân tích file...' : 'Chọn file từ máy tính'}
                </button>
              </div>

              {/* Hướng dẫn cú pháp nhanh */}
              <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-left text-xs text-zinc-500 space-y-1 max-w-lg mx-auto">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  💡 Mẹo định dạng chuẩn:
                </p>
                <p>
                  • Phân chia bài học: Gõ{' '}
                  <code className="text-blue-600 font-mono">[Chương: 1]</code> hoặc{' '}
                  <code className="text-blue-600 font-mono">[Bài: Tính đơn điệu]</code>.
                </p>
                <p>
                  • Mức độ nhận thức: Gõ{' '}
                  <code className="text-emerald-600 font-mono">[NB] Câu 1:</code> hoặc{' '}
                  <code className="text-rose-600 font-mono">Câu 2 [VDC]:</code>.
                </p>
              </div>
            </div>
          ) : (
            /* VÙNG XEM TRƯỚC KẾT QUẢ PHÂN TÍCH */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">✅</span>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Tệp: {selectedFileName}
                    </span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Đã nhận diện thành công {parsedData.questions.length} câu hỏi hợp lệ.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParsedData(null);
                    setSelectedFileName('');
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:underline px-2 py-1 cursor-pointer"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Danh sách các câu hỏi xem trước */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {parsedData.questions.map((q, idx) => {
                  const effectiveDiff = q.difficulty || defaultDifficulty;
                  const diffInfo = getDifficultyBadgeInfo(effectiveDiff);
                  const effectiveChapter = q.chapter || defaultChapter;
                  const effectiveLesson = q.lesson || defaultLesson;

                  return (
                    <div key={idx} className="p-3 bg-white dark:bg-zinc-800/40 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                            Câu {idx + 1}
                          </span>

                          {/* Chọn nhanh mức độ cho từng câu */}
                          <select
                            value={effectiveDiff}
                            onChange={e =>
                              handleUpdateItemDifficulty(idx, e.target.value as DifficultyLevel)
                            }
                            className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer ${diffInfo.badgeClass}`}
                          >
                            <option value="nb">● NB - Nhận biết</option>
                            <option value="th">■ TH - Thông hiểu</option>
                            <option value="vd">▲ VD - Vận dụng</option>
                            <option value="vdc">◆ VDC - Vận dụng cao</option>
                          </select>

                          {/* Nhãn bài học */}
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            {effectiveChapter} ➔ {effectiveLesson}
                          </span>
                        </div>
                      </div>

                      {/* Nội dung đề bài */}
                      <div
                        className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderLatexInText(q.stem?.text || ''),
                        }}
                      />

                      {/* Phương án đúng */}
                      {q.type === 'mcq4' && (
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                          <span>Đáp án đúng:</span>
                          <span className="font-bold text-emerald-600">
                            {typeof (q as { correct?: unknown }).correct === 'number'
                              ? String.fromCharCode(65 + (q as { correct: number }).correct)
                              : String((q as { correct?: unknown }).correct ?? '')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer"
          >
            Hủy bỏ
          </button>

          {parsedData && (
            <button
              type="button"
              disabled={isSaving || parsedData.questions.length === 0}
              onClick={handleSaveToBank}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 min-h-[44px] cursor-pointer disabled:opacity-60"
            >
              {isSaving
                ? 'Đang lưu vào ngân hàng...'
                : `Lưu vào Ngân hàng câu hỏi (${parsedData.questions.length} câu)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
