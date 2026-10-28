import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type {
  BankCurriculumTreeNode,
  BankQuestionDto,
  CreateBankQuestionRequest,
  DifficultyLevel,
  QuestionType,
  UpdateBankQuestionRequest,
} from '@educlass/protocol';
import { renderLatexInText } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { BankCurriculumTree } from './BankCurriculumTree.js';
import { DifficultyFilterBar, getDifficultyBadgeInfo } from './DifficultyFilterBar.js';
import { BankWordImportModal } from './BankWordImportModal.js';

export interface BankQuestionTabProps {
  onShowToast?: (message: string) => void;
  onOpenWordImport?: () => void;
  className?: string | undefined;
}

interface ParsedMcqContent {
  stem: { text: string; images?: string[] | undefined };
  options?: Array<{ id: string; text: string; images?: string[] | undefined }> | undefined;
}

interface ParsedAnswer {
  correct?: number | string | boolean | Record<string, boolean> | undefined;
  explanation?: string | undefined;
  acceptedAnswers?: string[] | undefined;
}

export const BankQuestionTab: React.FC<BankQuestionTabProps> = ({
  onShowToast,
  onOpenWordImport,
  className = '',
}) => {
  // 1. Phân cấp lọc
  const [grade, setGrade] = useState<number>(12);
  const [subject, setSubject] = useState<string>('Toán');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 2. Dữ liệu
  const [tree, setTree] = useState<BankCurriculumTreeNode[]>([]);
  const [questions, setQuestions] = useState<BankQuestionDto[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  // 3. Modal Soạn / Sửa câu hỏi
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestionDto | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Form states cho Modal soạn câu hỏi
  const [formChapter, setFormChapter] = useState<string>('');
  const [formLesson, setFormLesson] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>('nb');
  const [formType, setFormType] = useState<QuestionType>('mcq4');
  const [formPoints, setFormPoints] = useState<number>(10);
  const [formStemText, setFormStemText] = useState<string>('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState<string>('');

  // 4. Modal xác nhận xóa
  const [questionToDelete, setQuestionToDelete] = useState<BankQuestionDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 5. Modal Nhập từ Word
  const [isWordModalOpen, setIsWordModalOpen] = useState<boolean>(false);

  const searchInputId = useId();

  // Tải cây phân cấp
  const loadTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const data = await api.getBankTree({ grade, subject });
      setTree(data);
    } catch (err) {
      console.error('Lỗi khi tải cây chương trình:', err);
      setTree([]);
    } finally {
      setIsLoadingTree(false);
    }
  }, [grade, subject]);

  // Tải danh sách câu hỏi
  const loadQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const queryParams: Parameters<typeof api.getBankQuestions>[0] = {
        grade,
        subject,
      };
      if (selectedChapter) queryParams.chapter = selectedChapter;
      if (selectedLesson) queryParams.lesson = selectedLesson;
      if (selectedDifficulty !== 'all') queryParams.difficulty = selectedDifficulty;
      if (searchTerm.trim()) queryParams.search = searchTerm.trim();

      const data = await api.getBankQuestions(queryParams);
      setQuestions(data);
    } catch (err) {
      console.error('Lỗi khi tải câu hỏi ngân hàng:', err);
      setQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [grade, subject, selectedChapter, selectedLesson, selectedDifficulty, searchTerm]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Thống kê số lượng theo 4 mức độ của danh sách hiện tại
  const currentCounts = useMemo(() => {
    const counts = { nb: 0, th: 0, vd: 0, vdc: 0 };
    for (const q of questions) {
      if (q.difficulty in counts) {
        counts[q.difficulty as DifficultyLevel]++;
      }
    }
    return counts;
  }, [questions]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingQuestion(null);
    setFormChapter(selectedChapter || 'Chương 1');
    setFormLesson(selectedLesson || 'Bài 1');
    setFormDifficulty('nb');
    setFormType('mcq4');
    setFormPoints(10);
    setFormStemText('');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormExplanation('');
    setEditorError(null);
    setIsEditorOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (q: BankQuestionDto) => {
    setEditingQuestion(q);
    setFormChapter(q.chapter);
    setFormLesson(q.lesson);
    setFormDifficulty(q.difficulty);
    setFormType(q.type);
    setFormPoints(q.points);

    try {
      const content = JSON.parse(q.contentJson) as ParsedMcqContent;
      setFormStemText(content.stem?.text || '');
      if (content.options && content.options.length > 0) {
        setFormOptions(content.options.map(o => o.text));
      } else {
        setFormOptions(['', '', '', '']);
      }
    } catch {
      setFormStemText(q.contentJson);
      setFormOptions(['', '', '', '']);
    }

    try {
      const answer = JSON.parse(q.answerJson) as ParsedAnswer;
      if (typeof answer.correct === 'number') {
        setFormCorrectIndex(answer.correct);
      } else {
        setFormCorrectIndex(0);
      }
      setFormExplanation(answer.explanation || '');
    } catch {
      setFormCorrectIndex(0);
      setFormExplanation('');
    }

    setEditorError(null);
    setIsEditorOpen(true);
  };

  // Lưu câu hỏi (Thêm mới hoặc Cập nhật)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStemText.trim()) {
      setEditorError('Vui lòng nhập nội dung câu hỏi');
      return;
    }
    if (!formChapter.trim()) {
      setEditorError('Vui lòng nhập tên chương');
      return;
    }
    if (!formLesson.trim()) {
      setEditorError('Vui lòng nhập tên bài');
      return;
    }

    // Đóng gói nội dung theo chuẩn Mcq4
    const contentPayload: ParsedMcqContent = {
      stem: { text: formStemText.trim() },
      options: formOptions.map((text, idx) => ({
        id: `opt_${idx}`,
        text: text.trim(),
      })),
    };

    const answerPayload: ParsedAnswer = {
      correct: formCorrectIndex,
      ...(formExplanation.trim() ? { explanation: formExplanation.trim() } : {}),
    };

    setIsSaving(true);
    setEditorError(null);

    try {
      if (editingQuestion) {
        // Cập nhật
        const updateData: UpdateBankQuestionRequest = {
          grade,
          subject,
          chapter: formChapter.trim(),
          lesson: formLesson.trim(),
          difficulty: formDifficulty,
          type: formType,
          points: formPoints,
          contentJson: JSON.stringify(contentPayload),
          answerJson: JSON.stringify(answerPayload),
        };
        await api.updateBankQuestion(editingQuestion.id, updateData);
        onShowToast?.('Đã cập nhật câu hỏi ngân hàng!');
      } else {
        // Tạo mới
        const createData: CreateBankQuestionRequest = {
          grade,
          subject,
          chapter: formChapter.trim(),
          lesson: formLesson.trim(),
          difficulty: formDifficulty,
          type: formType,
          points: formPoints,
          contentJson: JSON.stringify(contentPayload),
          answerJson: JSON.stringify(answerPayload),
        };
        await api.createBankQuestion(createData);
        onShowToast?.('Đã thêm câu hỏi vào ngân hàng!');
      }

      setIsEditorOpen(false);
      await Promise.all([loadQuestions(), loadTree()]);
    } catch (err: unknown) {
      setEditorError(err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi');
    } finally {
      setIsSaving(false);
    }
  };

  // Xác nhận xóa câu hỏi
  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteBankQuestion(questionToDelete.id);
      let msg = 'Đã xóa câu hỏi khỏi ngân hàng!';
      if (res.cleanedAssetsCount > 0) {
        msg += ` (Đã dọn dẹp ${res.cleanedAssetsCount} tệp ảnh mồ côi)`;
      }
      onShowToast?.(msg);
      setQuestionToDelete(null);
      await Promise.all([loadQuestions(), loadTree()]);
    } catch (err) {
      console.error('Lỗi khi xóa câu hỏi:', err);
      onShowToast?.('Không thể xóa câu hỏi!');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-5 min-h-[640px] ${className}`}>
      {/* CỘT TRÁI: CÂY BÀI HỌC THEO PHÂN CẤP */}
      <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
        <BankCurriculumTree
          tree={tree}
          currentGrade={grade}
          currentSubject={subject}
          selectedChapter={selectedChapter}
          selectedLesson={selectedLesson}
          onGradeChange={newGrade => {
            setGrade(newGrade);
            setSelectedChapter(null);
            setSelectedLesson(null);
          }}
          onSubjectChange={newSubj => {
            setSubject(newSubj);
            setSelectedChapter(null);
            setSelectedLesson(null);
          }}
          onSelectLesson={(chap, les) => {
            setSelectedChapter(chap);
            setSelectedLesson(les);
          }}
          onSelectChapter={chap => {
            setSelectedChapter(chap);
            setSelectedLesson(null);
          }}
          onClearSelection={() => {
            setSelectedChapter(null);
            setSelectedLesson(null);
          }}
          isLoading={isLoadingTree}
        />
      </div>

      {/* CỘT PHẢI: KHÔNG GIAN DUYỆT & QUẢN LÝ CÂU HỎI */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden p-5 space-y-4">
        {/* Header Thanh Công Cụ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <span>Khối {grade}</span>
              <span>•</span>
              <span>{subject}</span>
              {selectedChapter && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[200px]" title={selectedChapter}>
                    {selectedChapter}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>
                {selectedLesson ||
                  (selectedChapter ? 'Tất cả bài trong chương' : 'Toàn bộ câu hỏi')}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {questions.length} câu
              </span>
            </h2>
          </div>

          {/* Các nút tác vụ nhanh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (onOpenWordImport) {
                  onOpenWordImport();
                } else {
                  setIsWordModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors min-h-[44px] cursor-pointer"
            >
              <span>📄</span>
              <span>Nhập từ Word</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors min-h-[44px] cursor-pointer"
            >
              <span>+</span>
              <span>Thêm câu hỏi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadTree();
                loadQuestions();
              }}
              title="Làm mới dữ liệu"
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors min-h-[44px] cursor-pointer"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Thanh Tìm Kiếm & Bộ Lọc Mức Độ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <DifficultyFilterBar
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            counts={currentCounts}
            totalCount={questions.length}
          />

          <div className="relative min-w-[220px]">
            <input
              id={searchInputId}
              type="text"
              placeholder="Tìm kiếm nội dung đề bài..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
          </div>
        </div>

        {/* DANH SÁCH CÂU HỎI */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-1">
          {isLoadingQuestions ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Đang tải câu hỏi ngân hàng...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-2xl mb-3">
                📝
              </div>
              <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Không tìm thấy câu hỏi phù hợp
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                {searchTerm
                  ? 'Không có câu hỏi nào khớp với từ khóa tìm kiếm.'
                  : 'Chưa có câu hỏi nào trong mục này. Bạn có thể thêm câu hỏi thủ công hoặc nhập hàng loạt từ tệp Word (.docx).'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] cursor-pointer"
                >
                  + Soạn câu hỏi ngay
                </button>
                {onOpenWordImport && (
                  <button
                    type="button"
                    onClick={onOpenWordImport}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px] cursor-pointer"
                  >
                    📄 Nhập từ file Word
                  </button>
                )}
              </div>
            </div>
          ) : (
            questions.map((q, index) => {
              const diffInfo = getDifficultyBadgeInfo(q.difficulty);
              let parsedContent: ParsedMcqContent = { stem: { text: q.contentJson } };
              let parsedAnswer: ParsedAnswer = {};

              try {
                parsedContent = JSON.parse(q.contentJson);
              } catch {
                // Giữ nguyên chuỗi gốc
              }

              try {
                parsedAnswer = JSON.parse(q.answerJson);
              } catch {
                // Giữ nguyên
              }

              return (
                <div
                  key={q.id}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs space-y-3"
                >
                  {/* Dòng Header Thẻ Câu Hỏi */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">
                        Câu {index + 1}
                      </span>

                      {/* Badge Mức Độ Nhận Thức Kèm Hình Khối */}
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${diffInfo.badgeClass}`}
                      >
                        <span>{diffInfo.shapeIcon}</span>
                        <span>{diffInfo.label}</span>
                      </span>

                      {/* Badge Phân Cấp Chương & Bài */}
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        {q.lesson}
                      </span>

                      {/* Điểm Số */}
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {q.points} điểm
                      </span>
                    </div>

                    {/* Nút Sửa / Xóa */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(q)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionToDelete(q)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Nội Dung Đề Bài (Render KaTeX) */}
                  <div
                    className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{
                      __html: renderLatexInText(parsedContent.stem?.text || q.contentJson),
                    }}
                  />

                  {/* Danh Sách Phương Án Trắc Nghiệm */}
                  {parsedContent.options && parsedContent.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {parsedContent.options.map((opt, optIdx) => {
                        const isCorrect =
                          parsedAnswer.correct === optIdx ||
                          parsedAnswer.correct === opt.id ||
                          parsedAnswer.correct === opt.text;

                        const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs leading-snug transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200 font-medium ring-1 ring-emerald-300'
                                : 'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {isCorrect ? '✓' : optionLabel}
                            </span>
                            <div
                              className="flex-1 overflow-x-auto"
                              dangerouslySetInnerHTML={{
                                __html: renderLatexInText(opt.text),
                              }}
                            />
                            {isCorrect && (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Trường hợp câu Đúng/Sai đơn lẻ */}
                  {typeof parsedAnswer.correct === 'boolean' &&
                    (!parsedContent.options || parsedContent.options.length === 0) && (
                      <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs flex items-center gap-2">
                        <span className="font-bold text-zinc-600 dark:text-zinc-400">
                          Đáp án chuẩn:
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold border ${
                            parsedAnswer.correct
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {parsedAnswer.correct ? '✓ ĐÚNG (True)' : '✗ SAI (False)'}
                        </span>
                      </div>
                    )}

                  {/* Lời Giải Thích (Nếu Có) */}
                  {parsedAnswer.explanation && (
                    <div className="text-xs p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <span className="font-bold flex-shrink-0">💡 Lời giải:</span>
                      <div
                        className="flex-1 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderLatexInText(parsedAnswer.explanation),
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL SOẠN / CHỈNH SỬA CÂU HỎI */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {editingQuestion ? 'Chỉnh sửa câu hỏi ngân hàng' : 'Thêm câu hỏi mới vào ngân hàng'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-6 space-y-4">
              {editorError && (
                <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {editorError}
                </div>
              )}

              {/* Nhập Chương & Bài */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tên chương *
                  </label>
                  <input
                    type="text"
                    required
                    value={formChapter}
                    onChange={e => setFormChapter(e.target.value)}
                    placeholder="VD: Chương 1: Ứng dụng đạo hàm"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tên bài học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLesson}
                    onChange={e => setFormLesson(e.target.value)}
                    placeholder="VD: Bài 1: Tính đơn điệu"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Mức độ nhận thức & Điểm số */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mức độ nhận thức (Bộ GD&ĐT) *
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] cursor-pointer"
                  >
                    <option value="nb">● Nhận biết (NB)</option>
                    <option value="th">■ Thông hiểu (TH)</option>
                    <option value="vd">▲ Vận dụng (VD)</option>
                    <option value="vdc">◆ Vận dụng cao (VDC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Điểm số
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formPoints}
                    onChange={e => setFormPoints(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Nội dung đề bài */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nội dung câu hỏi (Hỗ trợ công thức toán $...$ hoặc $$...$$) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formStemText}
                  onChange={e => setFormStemText(e.target.value)}
                  placeholder="Nhập nội dung đề bài, ví dụ: Cho hàm số $y = f(x)$ có bảng biến thiên như sau..."
                  className="w-full text-xs font-medium p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 4 Phương án trắc nghiệm */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Các phương án lựa chọn (Chọn nút tròn để chỉ định đáp án đúng) *
                </label>
                {formOptions.map((optText, optIdx) => {
                  const label = String.fromCharCode(65 + optIdx);
                  const isChecked = formCorrectIndex === optIdx;

                  return (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option-group"
                        checked={isChecked}
                        onChange={() => setFormCorrectIndex(optIdx)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title={`Chọn ${label} là đáp án đúng`}
                      />
                      <span className="w-5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        {label}.
                      </span>
                      <input
                        type="text"
                        value={optText}
                        onChange={e => {
                          const updated = [...formOptions];
                          updated[optIdx] = e.target.value;
                          setFormOptions(updated);
                        }}
                        placeholder={`Nội dung phương án ${label}`}
                        className={`flex-1 text-xs font-medium px-3 py-2 rounded-xl border min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Lời giải thích */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Lời giải chi tiết (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="Nhập hướng dẫn giải hoặc lời giải chi tiết..."
                  className="w-full text-xs font-medium p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nút Submit */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 min-h-[44px] cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 text-xl">
              🗑️
            </div>
            <div>
              <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1">
                Xóa câu hỏi khỏi ngân hàng?
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hành động này không thể hoàn tác. Các tệp ảnh mồ côi (nếu không còn dùng ở đề thi
                nào) sẽ được tự động dọn dẹp sạch sẽ.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setQuestionToDelete(null)}
                className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[44px] cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NHẬP TỪ WORD VÀO NGÂN HÀNG */}
      {isWordModalOpen && (
        <BankWordImportModal
          isOpen={isWordModalOpen}
          currentGrade={grade}
          currentSubject={subject}
          currentChapter={selectedChapter}
          currentLesson={selectedLesson}
          onClose={() => setIsWordModalOpen(false)}
          onSuccess={count => {
            onShowToast?.(`Đã nhập thành công ${count} câu hỏi vào ngân hàng!`);
            loadTree();
            loadQuestions();
          }}
        />
      )}
    </div>
  );
};
