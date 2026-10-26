import React, { useMemo, useState } from 'react';
import type { BankCurriculumTreeNode } from '@educlass/protocol';

export const COMMON_SUBJECTS = [
  'Toán',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Tin học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lý',
  'GDCD',
  'Khoa học tự nhiên',
  'Lịch sử và Địa lý',
  'Công nghệ',
];

export const GRADES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export interface BankCurriculumTreeProps {
  tree: BankCurriculumTreeNode[];
  currentGrade: number;
  currentSubject: string;
  selectedChapter: string | null;
  selectedLesson: string | null;
  onGradeChange: (grade: number) => void;
  onSubjectChange: (subject: string) => void;
  onSelectLesson: (chapter: string, lesson: string) => void;
  onSelectChapter?: (chapter: string) => void;
  onClearSelection: () => void;
  isLoading?: boolean | undefined;
  className?: string | undefined;
}

export const BankCurriculumTree: React.FC<BankCurriculumTreeProps> = ({
  tree,
  currentGrade,
  currentSubject,
  selectedChapter,
  selectedLesson,
  onGradeChange,
  onSubjectChange,
  onSelectLesson,
  onSelectChapter,
  onClearSelection,
  isLoading = false,
  className = '',
}) => {
  // Quản lý các chương đang mở rộng trong Accordion
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    // Mặc định mở chương đang được chọn hoặc mở tất cả nếu có ít hơn 5 chương
    const initial = new Set<string>();
    if (selectedChapter) {
      initial.add(selectedChapter);
    } else {
      tree.slice(0, 4).forEach((node) => initial.add(node.chapter));
    }
    return initial;
  });

  // Tự động mở chương khi người dùng chọn một bài trong chương đó
  React.useEffect(() => {
    if (selectedChapter && !expandedChapters.has(selectedChapter)) {
      setExpandedChapters((prev) => new Set([...prev, selectedChapter]));
    }
  }, [selectedChapter]);

  const toggleChapter = (chapter: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapter)) {
        next.delete(chapter);
      } else {
        next.add(chapter);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedChapters(new Set(tree.map((node) => node.chapter)));
  };

  const collapseAll = () => {
    setExpandedChapters(new Set());
  };

  const totalQuestionsInTree = useMemo(() => {
    return tree.reduce((acc, curr) => acc + curr.totalQuestions, 0);
  }, [tree]);

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* 1. Header & Bộ Chọn Khối / Môn */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              Cây Phân Cấp Chương Trình
            </h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
            {totalQuestionsInTree} câu
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Chọn Khối */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Khối lớp
            </label>
            <select
              aria-label="Chọn khối lớp"
              value={currentGrade}
              onChange={(e) => onGradeChange(Number(e.target.value))}
              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] cursor-pointer"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Môn */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Môn học
            </label>
            <select
              aria-label="Chọn môn học"
              value={currentSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] cursor-pointer"
            >
              {COMMON_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nút bấm Chọn Toàn Bộ Môn / Thu gọn nhanh */}
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            onClick={onClearSelection}
            className={`font-medium transition-colors px-2 py-1 rounded-lg cursor-pointer ${
              !selectedChapter && !selectedLesson
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            Tất cả bài học
          </button>

          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={expandAll}
              title="Mở rộng tất cả chương"
              className="hover:text-blue-600 dark:hover:text-blue-400 px-1 py-0.5 rounded cursor-pointer"
            >
              Mở hết
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAll}
              title="Thu gọn tất cả chương"
              className="hover:text-blue-600 dark:hover:text-blue-400 px-1 py-0.5 rounded cursor-pointer"
            >
              Thu lại
            </button>
          </div>
        </div>
      </div>

      {/* 2. Danh Sách Cây Chương - Bài (Accordion) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải danh mục...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-xl mb-3">
              📚
            </div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Chưa có câu hỏi
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
              Môn {currentSubject} - Khối {currentGrade} chưa có bài học nào trong ngân hàng.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Gợi ý: Nhập tệp Word (.docx) để tạo chương bài tự động!
            </p>
          </div>
        ) : (
          tree.map((chapterNode) => {
            const isExpanded = expandedChapters.has(chapterNode.chapter);
            const isChapterSelected =
              selectedChapter === chapterNode.chapter && !selectedLesson;

            return (
              <div
                key={chapterNode.chapter}
                className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-800/40"
              >
                {/* Thanh Tiêu Đề Chương */}
                <div
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors select-none ${
                    isChapterSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200'
                  }`}
                  onClick={() => toggleChapter(chapterNode.chapter)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <span
                      className={`text-xs transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : 'rotate-0'
                      }`}
                    >
                      ▶
                    </span>
                    <span
                      className="text-xs font-bold truncate"
                      title={chapterNode.chapter}
                    >
                      {chapterNode.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {chapterNode.totalQuestions}
                    </span>
                    {onSelectChapter && (
                      <button
                        type="button"
                        title="Lọc toàn bộ chương này"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChapter(chapterNode.chapter);
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 cursor-pointer"
                      >
                        Chọn
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh Sách Bài Học Bên Trong Chương */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/40 dark:bg-zinc-900/30 p-1.5 space-y-1">
                    {chapterNode.lessons.length === 0 ? (
                      <div className="text-[11px] text-zinc-400 py-2 text-center italic">
                        Không có bài học
                      </div>
                    ) : (
                      chapterNode.lessons.map((lessonItem) => {
                        const isLessonSelected =
                          selectedChapter === chapterNode.chapter &&
                          selectedLesson === lessonItem.lesson;

                        return (
                          <button
                            key={lessonItem.lesson}
                            type="button"
                            onClick={() =>
                              onSelectLesson(chapterNode.chapter, lessonItem.lesson)
                            }
                            title={`${lessonItem.lesson} (${lessonItem.totalQuestions} câu)`}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all min-h-[40px] cursor-pointer ${
                              isLessonSelected
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="truncate pr-2 flex-1">
                              {lessonItem.lesson}
                            </span>

                            {/* Badge Số Câu và 4 Mức Độ */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isLessonSelected
                                    ? 'bg-white/25 text-white'
                                    : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                {lessonItem.totalQuestions}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
