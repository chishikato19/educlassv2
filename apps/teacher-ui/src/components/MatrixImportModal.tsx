import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BankCurriculumTreeNode,
  BankQuestionDto,
  DifficultyLevel,
  LessonAvailableCounts,
  MatrixCounts,
  MatrixGenerateRequest,
} from '@educlass/protocol';
import { renderLatexInText } from '@educlass/question-kit';
import { api } from '../api/client.js';
import { COMMON_SUBJECTS, GRADES } from './BankCurriculumTree.js';
import { getDifficultyBadgeInfo } from './DifficultyFilterBar.js';

export interface MatrixImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSetId: string) => void;
  initialGrade?: number | undefined;
  initialSubject?: string | undefined;
}

interface SelectedLessonItem {
  chapter: string;
  lesson: string;
}

interface ParsedMcqContent {
  stem: { text: string; images?: string[] };
  options?: Array<{ id: string; text: string; images?: string[] }>;
}

interface ParsedAnswer {
  correct?: number | string | boolean | Record<string, boolean>;
  explanation?: string;
  acceptedAnswers?: string[];
}

export const MatrixImportModal: React.FC<MatrixImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialGrade = 12,
  initialSubject = 'Toán',
}) => {
  // Quản lý bước: 'config' (Cấu hình ma trận) hoặc 'preview' (Xem trước & Đổi câu)
  const [step, setStep] = useState<'config' | 'preview'>('config');

  // Cấu hình chung
  const [title, setTitle] = useState<string>('Đề thi sinh từ Ma trận');
  const [grade, setGrade] = useState<number>(initialGrade);
  const [subject, setSubject] = useState<string>(initialSubject);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);

  // Cây bài học ngân hàng & bài học đã chọn
  const [tree, setTree] = useState<BankCurriculumTreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [selectedLessons, setSelectedLessons] = useState<SelectedLessonItem[]>([]);

  // Thống kê số câu sẵn có theo từng bài (statsMap)
  const [statsMap, setStatsMap] = useState<Record<string, LessonAvailableCounts>>({});
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  // Số lượng câu muốn bốc theo từng bài (lesson -> MatrixCounts)
  const [countsMap, setCountsMap] = useState<Record<string, MatrixCounts>>({});

  // Danh sách câu hỏi vừa bốc (dành cho bước Review & Swap)
  const [previewQuestions, setPreviewQuestions] = useState<BankQuestionDto[]>([]);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [swapMessage, setSwapMessage] = useState<string | null>(null);

  // Trạng thái sinh đề
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Tải cây bài học ngân hàng theo Khối và Môn
  const loadTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const data = await api.getBankTree({ grade, subject });
      setTree(data);

      // Mặc định chọn 2-3 bài đầu tiên nếu chưa chọn bài nào
      if (selectedLessons.length === 0 && data.length > 0) {
        const initialSelected: SelectedLessonItem[] = [];
        for (const chapterNode of data) {
          for (const les of chapterNode.lessons) {
            if (les.totalQuestions > 0) {
              initialSelected.push({
                chapter: chapterNode.chapter,
                lesson: les.lesson,
              });
              if (initialSelected.length >= 3) break;
            }
          }
          if (initialSelected.length >= 3) break;
        }
        setSelectedLessons(initialSelected);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục cây bài học:', err);
      setTree([]);
    } finally {
      setIsLoadingTree(false);
    }
  }, [grade, subject]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 2. Tải thống kê số câu sẵn có theo các bài học đã chọn
  useEffect(() => {
    if (selectedLessons.length === 0) {
      setStatsMap({});
      return;
    }

    let isMounted = true;
    setIsLoadingStats(true);

    const lessonsList = selectedLessons.map(l => l.lesson);
    api
      .getMatrixStats({ grade, subject, lessons: lessonsList })
      .then(res => {
        if (isMounted) {
          setStatsMap(res.stats || {});
        }
      })
      .catch(err => {
        console.error('Lỗi khi tải thống kê ma trận:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [grade, subject, selectedLessons]);

  // Toggle chọn một bài học
  const handleToggleLesson = (chapter: string, lesson: string) => {
    setSelectedLessons(prev => {
      const exists = prev.some(l => l.chapter === chapter && l.lesson === lesson);
      if (exists) {
        const next = prev.filter(l => !(l.chapter === chapter && l.lesson === lesson));
        setCountsMap(cm => {
          const updated = { ...cm };
          delete updated[lesson];
          return updated;
        });
        return next;
      } else {
        return [...prev, { chapter, lesson }];
      }
    });
  };

  // Cập nhật số câu muốn bốc cho một bài
  const handleUpdateCount = (lesson: string, diff: DifficultyLevel, valStr: string) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0);
    setCountsMap(prev => {
      const current = prev[lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 };
      return {
        ...prev,
        [lesson]: {
          ...current,
          [diff]: num,
        },
      };
    });
  };

  // 3. Tính toán tổng số câu và kiểm tra hợp lệ
  const totals = useMemo(() => {
    let totalNb = 0;
    let totalTh = 0;
    let totalVd = 0;
    let totalVdc = 0;
    let hasOverflow = false;

    for (const item of selectedLessons) {
      const counts = countsMap[item.lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 };
      const available = statsMap[item.lesson]?.available || { nb: 0, th: 0, vd: 0, vdc: 0 };

      totalNb += counts.nb;
      totalTh += counts.th;
      totalVd += counts.vd;
      totalVdc += counts.vdc;

      if (
        counts.nb > available.nb ||
        counts.th > available.th ||
        counts.vd > available.vd ||
        counts.vdc > available.vdc
      ) {
        hasOverflow = true;
      }
    }

    const totalQuestions = totalNb + totalTh + totalVd + totalVdc;
    return {
      nb: totalNb,
      th: totalTh,
      vd: totalVd,
      vdc: totalVdc,
      total: totalQuestions,
      hasOverflow,
    };
  }, [selectedLessons, countsMap, statsMap]);

  // 4. Chuyển sang bước Xem trước & Đổi câu (Review & Swap)
  const handleGoToPreview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề cho bộ đề thi');
      return;
    }
    if (selectedLessons.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một bài học vào ma trận');
      return;
    }
    if (totals.total === 0) {
      setErrorMessage('Vui lòng nhập số câu cần bốc (tổng số câu phải lớn hơn 0)');
      return;
    }
    if (totals.hasOverflow) {
      setErrorMessage(
        'Có câu hỏi yêu cầu vượt quá số lượng sẵn có trong kho. Vui lòng kiểm tra các ô màu đỏ!'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const requestPayload: MatrixGenerateRequest = {
        title: title.trim(),
        grade,
        subject: subject.trim(),
        matrix: selectedLessons.map(l => ({
          chapter: l.chapter,
          lesson: l.lesson,
          counts: countsMap[l.lesson] || { nb: 0, th: 0, vd: 0, vdc: 0 },
        })),
        shuffleQuestions,
        shuffleOptions,
      };

      const res = await api.previewSetFromMatrix(requestPayload);
      setPreviewQuestions(res.questions);
      setSwapMessage(null);
      setStep('preview');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi bốc câu hỏi từ ma trận');
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Tính năng Đổi câu tương đương (Swap Question)
  const handleSwapQuestion = async (index: number) => {
    const currentQ = previewQuestions[index];
    if (!currentQ) return;

    setSwappingIndex(index);
    setSwapMessage(null);

    try {
      // Tìm các câu hỏi cùng bài học và cùng mức độ trong ngân hàng
      const candidates = await api.getBankQuestions({
        grade,
        subject,
        chapter: currentQ.chapter,
        lesson: currentQ.lesson,
        difficulty: currentQ.difficulty,
      });

      // Lọc bỏ những câu đã nằm trong danh sách hiện tại
      const currentIds = new Set(previewQuestions.map(q => q.id));
      const availableCandidates = candidates.filter(q => !currentIds.has(q.id));

      if (availableCandidates.length > 0) {
        // Bốc ngẫu nhiên 1 câu tương đương
        const replacement =
          availableCandidates[Math.floor(Math.random() * availableCandidates.length)]!;
        const updated = [...previewQuestions];
        updated[index] = replacement;
        setPreviewQuestions(updated);
        setSwapMessage(`Đã đổi thành công Câu ${index + 1} sang một câu hỏi tương đương khác!`);
      } else {
        setSwapMessage(`Kho không còn câu hỏi nào khác ở "${currentQ.lesson}" với mức độ này.`);
      }
    } catch (err) {
      console.error('Lỗi khi đổi câu hỏi tương đương:', err);
      setSwapMessage('Không thể đổi câu hỏi lúc này!');
    } finally {
      setSwappingIndex(null);
    }
  };

  // 6. Xác nhận lưu bộ đề vào Question Sets
  const handleConfirmSave = async () => {
    if (previewQuestions.length === 0) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const snapshotQuestions = previewQuestions.map(bq => {
        let content: Record<string, unknown> = {};
        let answer: Record<string, unknown> = {};
        try {
          content = JSON.parse(bq.contentJson) as Record<string, unknown>;
        } catch {
          // fallback
        }
        try {
          answer = JSON.parse(bq.answerJson) as Record<string, unknown>;
        } catch {
          // fallback
        }
        return {
          type: bq.type,
          points: bq.points,
          ...content,
          ...answer,
        };
      });

      const newSet = await api.createQuestionSet({
        title: title.trim(),
        subject: subject.trim(),
        grade,
        tags: ['Sinh từ Ma trận', `Khối ${grade}`, subject.trim()],
        questions: snapshotQuestions,
      });

      onSuccess(newSet.id);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi lưu bộ đề thi');
    } finally {
      setIsGenerating(false);
    }
  };

  const levels: DifficultyLevel[] = ['nb', 'th', 'vd', 'vdc'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg">
              🎯
            </span>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {step === 'config'
                  ? 'Bốc Câu Hỏi Theo Ma Trận Đề Thi'
                  : `Xem Trước & Đổi Câu — ${title}`}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {step === 'config'
                  ? 'Tự động bốc ngẫu nhiên câu hỏi theo chuẩn 4 mức độ nhận thức của Bộ GD&ĐT'
                  : 'Kiểm tra nội dung câu hỏi và đổi câu tương đương cùng mức độ nếu cần'}
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

        {/* BƯỚC 1: CẤU HÌNH MA TRẬN */}
        {step === 'config' && (
          <form onSubmit={handleGoToPreview} className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* 1. THIẾT LẬP THÔNG TIN BỘ ĐỀ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tiêu đề bộ đề mới *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra 1 tiết Đại số 12 - Ma trận chuẩn"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Khối lớp *
                </label>
                <select
                  value={grade}
                  onChange={e => {
                    setGrade(Number(e.target.value));
                    setSelectedLessons([]);
                  }}
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
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Môn học *
                </label>
                <select
                  value={subject}
                  onChange={e => {
                    setSubject(e.target.value);
                    setSelectedLessons([]);
                  }}
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 min-h-[40px] cursor-pointer"
                >
                  {COMMON_SUBJECTS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. CHỌN BÀI HỌC VÀO MA TRẬN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Chọn các bài học cần đưa vào đề thi ({selectedLessons.length} bài đã chọn):
                </label>
                <span className="text-[11px] text-zinc-500">
                  Bấm vào các bài bên dưới để thêm/bớt khỏi bảng ma trận
                </span>
              </div>

              <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 max-h-40 overflow-y-auto space-y-2">
                {isLoadingTree ? (
                  <div className="py-4 text-center text-xs text-zinc-400">
                    Đang tải danh mục bài học...
                  </div>
                ) : tree.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-400">
                    Kho ngân hàng chưa có câu hỏi nào cho {subject} Khối {grade}. Hãy thêm câu hỏi
                    hoặc nhập từ Word trước!
                  </div>
                ) : (
                  tree.map(chapterNode => (
                    <div key={chapterNode.chapter} className="space-y-1">
                      <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {chapterNode.chapter}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {chapterNode.lessons.map(les => {
                          const isSelected = selectedLessons.some(
                            l => l.chapter === chapterNode.chapter && l.lesson === les.lesson
                          );

                          return (
                            <button
                              key={les.lesson}
                              type="button"
                              onClick={() => handleToggleLesson(chapterNode.chapter, les.lesson)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <span>{les.lesson}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                {les.totalQuestions}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. BẢNG MA TRẬN 2 CHIỀU (BÀI HỌC × 4 MỨC ĐỘ) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Bảng Cấu Hình Ma Trận Số Câu
                </h4>
                {isLoadingStats && (
                  <span className="text-xs text-purple-600 animate-pulse">
                    Đang đồng bộ số câu có sẵn trong kho...
                  </span>
                )}
              </div>

              {selectedLessons.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-400">
                  Chưa chọn bài học nào. Hãy chọn ít nhất một bài học ở danh sách phía trên!
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 font-bold">
                        <th className="p-3 min-w-[200px]">Bài học / Chương</th>
                        {levels.map(diff => {
                          const info = getDifficultyBadgeInfo(diff);
                          return (
                            <th key={diff} className="p-3 text-center min-w-[130px]">
                              <span className="inline-flex items-center gap-1">
                                <span>{info.shapeIcon}</span>
                                <span>{info.label}</span>
                              </span>
                            </th>
                          );
                        })}
                        <th className="p-3 text-center min-w-[80px]">Tổng câu</th>
                        <th className="p-3 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                      {selectedLessons.map(item => {
                        const counts = countsMap[item.lesson] || {
                          nb: 0,
                          th: 0,
                          vd: 0,
                          vdc: 0,
                        };
                        const available = statsMap[item.lesson]?.available || {
                          nb: 0,
                          th: 0,
                          vd: 0,
                          vdc: 0,
                        };
                        const rowTotal = counts.nb + counts.th + counts.vd + counts.vdc;

                        return (
                          <tr
                            key={item.lesson}
                            className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="p-3">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                {item.lesson}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate max-w-[220px]">
                                {item.chapter}
                              </div>
                            </td>

                            {levels.map(diff => {
                              const val = counts[diff];
                              const avail = available[diff];
                              const isOver = val > avail;

                              return (
                                <td key={diff} className="p-2 text-center align-top">
                                  <div className="inline-flex flex-col items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={avail}
                                      value={val === 0 ? '' : val}
                                      onChange={e =>
                                        handleUpdateCount(item.lesson, diff, e.target.value)
                                      }
                                      placeholder="0"
                                      className={`w-18 text-center text-xs font-bold py-1.5 px-2 rounded-xl border focus:outline-none focus:ring-2 ${
                                        isOver
                                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 ring-rose-500'
                                          : val > 0
                                            ? 'border-purple-400 bg-purple-50/40 text-purple-900 dark:bg-purple-950/30 dark:text-purple-200'
                                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                      }`}
                                    />
                                    <span
                                      className={`text-[10px] mt-1 font-semibold ${
                                        isOver ? 'text-rose-600 font-bold' : 'text-zinc-400'
                                      }`}
                                    >
                                      {isOver ? `Kho có ${avail}!` : `Có sẵn: ${avail}`}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}

                            <td className="p-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                              {rowTotal}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleLesson(item.chapter, item.lesson)}
                                title="Bỏ bài này khỏi ma trận"
                                className="text-zinc-400 hover:text-rose-600 cursor-pointer text-sm"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/90 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100">
                        <td className="p-3">
                          <div>TỔNG CỘNG ĐỀ THI:</div>
                          <div className="text-[11px] font-normal text-zinc-500">
                            Tỷ lệ phân bổ ma trận
                          </div>
                        </td>
                        {levels.map(diff => {
                          const sum = totals[diff];
                          const pct = totals.total > 0 ? Math.round((sum / totals.total) * 100) : 0;
                          const info = getDifficultyBadgeInfo(diff);

                          return (
                            <td key={diff} className="p-3 text-center">
                              <div className="text-sm text-purple-700 dark:text-purple-300">
                                {sum} câu
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                {pct}% ({info.shortLabel})
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center text-base text-purple-600 font-extrabold">
                          {totals.total} câu
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* 4. CÁC TÙY CHỌN TRỘN ĐỀ */}
            <div className="flex flex-wrap items-center gap-6 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={e => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>🔀 Tự động xáo trộn thứ tự các câu hỏi</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={e => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>🔀 Tự động đảo thứ tự các phương án lựa chọn (A, B, C, D)</span>
              </label>
            </div>

            {/* Footer Bước 1 */}
            <div className="pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={
                  isGenerating ||
                  totals.total === 0 ||
                  totals.hasOverflow ||
                  selectedLessons.length === 0
                }
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating
                  ? 'Đang bốc câu hỏi...'
                  : `👁️ Xem trước & Đổi câu (${totals.total} câu)`}
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 2: XEM TRƯỚC & ĐỔI CÂU TƯƠNG ĐƯƠNG (REVIEW & SWAP) */}
        {step === 'preview' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Thanh Thông Báo / Status */}
            {swapMessage && (
              <div className="p-3 text-xs rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-center justify-between">
                <span>{swapMessage}</span>
                <button
                  type="button"
                  onClick={() => setSwapMessage(null)}
                  className="text-xs text-purple-500 hover:text-purple-800 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  Danh sách {previewQuestions.length} câu hỏi đã bốc:
                </span>
                <span className="text-zinc-500">
                  (Bấm nút "🔄 Đổi câu" trên từng câu để bốc câu hỏi khác cùng mức độ)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('config')}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
              >
                ← Chỉnh sửa lại ma trận
              </button>
            </div>

            {/* Danh Sách Câu Hỏi Xem Trước Dạng Card */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {previewQuestions.map((q, idx) => {
                const diffInfo = getDifficultyBadgeInfo(q.difficulty);
                let parsedContent: ParsedMcqContent = { stem: { text: q.contentJson } };
                let parsedAnswer: ParsedAnswer = {};

                try {
                  parsedContent = JSON.parse(q.contentJson);
                } catch {
                  // Fallback
                }

                try {
                  parsedAnswer = JSON.parse(q.answerJson);
                } catch {
                  // Fallback
                }

                const isSwappingThis = swappingIndex === idx;

                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 space-y-3 shadow-xs hover:border-purple-300 transition-all"
                  >
                    {/* Header Thẻ Câu Hỏi */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                          Câu {idx + 1}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${diffInfo.badgeClass}`}
                        >
                          <span>{diffInfo.shapeIcon}</span>
                          <span>{diffInfo.label}</span>
                        </span>

                        <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                          {q.lesson}
                        </span>

                        <span className="text-xs font-semibold text-zinc-500">{q.points} điểm</span>
                      </div>

                      {/* NÚT ĐỔI CÂU TƯƠNG ĐƯƠNG */}
                      <button
                        type="button"
                        disabled={isSwappingThis}
                        onClick={() => handleSwapQuestion(idx)}
                        title="Bốc một câu hỏi khác trong kho cùng bài và cùng mức độ này"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-colors min-h-[36px] cursor-pointer disabled:opacity-60"
                      >
                        <span className={isSwappingThis ? 'animate-spin' : ''}>🔄</span>
                        <span>{isSwappingThis ? 'Đang đổi...' : 'Đổi câu khác'}</span>
                      </button>
                    </div>

                    {/* Nội Dung Đề Bài */}
                    <div
                      className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderLatexInText(parsedContent.stem?.text || q.contentJson),
                      }}
                    />

                    {/* Phương Án Trắc Nghiệm */}
                    {parsedContent.options && parsedContent.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {parsedContent.options.map((opt, optIdx) => {
                          const isCorrect =
                            parsedAnswer.correct === optIdx ||
                            parsedAnswer.correct === opt.id ||
                            parsedAnswer.correct === opt.text;
                          const optLabel = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`flex items-start gap-2 p-2 rounded-xl border text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200 font-semibold'
                                  : 'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                {isCorrect ? '✓' : optLabel}
                              </span>
                              <div
                                className="flex-1 overflow-x-auto"
                                dangerouslySetInnerHTML={{
                                  __html: renderLatexInText(opt.text),
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Bước 2 */}
            <div className="pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep('config')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 min-h-[44px] cursor-pointer"
              >
                ← Quay lại ma trận
              </button>

              <button
                type="button"
                disabled={isGenerating || previewQuestions.length === 0}
                onClick={handleConfirmSave}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25 min-h-[44px] cursor-pointer disabled:opacity-50 transition-all"
              >
                {isGenerating
                  ? 'Đang lưu bộ đề...'
                  : `💾 Xác nhận lưu vào Kho bộ đề (${previewQuestions.length} câu)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
