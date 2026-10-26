import React, { useEffect, useMemo, useState } from 'react';
import type { ClassDto, SessionDetailResponse } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api, type QuestionSetItem } from '../api/client.js';

export interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassDto[];
  onShowToast: (message: string) => void;
  onSuccess: (createdExam: unknown) => void;
  initialClassId?: string | undefined;
  questionSets?: QuestionSetItem[] | undefined;
  activeSession?: SessionDetailResponse | null | undefined;
  existingFolders?: string[] | undefined;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  isOpen,
  onClose,
  classes,
  onShowToast,
  onSuccess,
  initialClassId,
  questionSets: propQuestionSets,
  activeSession,
  existingFolders = [],
}) => {
  const [questionSets, setQuestionSets] = useState<QuestionSetItem[]>(propQuestionSets || []);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [folder, setFolder] = useState('');
  const [classId, setClassId] = useState(initialClassId || (classes[0]?.id ?? ''));
  const [questionSetId, setQuestionSetId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);

  // Câu hỏi & Phân bổ điểm số
  const [questions, setQuestions] = useState<Array<Record<string, unknown>>>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [targetTotalScore, setTargetTotalScore] = useState<number>(10);
  const [scorePerQuestionInput, setScorePerQuestionInput] = useState<number>(0.5);
  const [showQuestionDetailList, setShowQuestionDetailList] = useState(false);

  // Config states
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [allowViewScore, setAllowViewScore] = useState(true);
  const [allowViewReview, setAllowViewReview] = useState(true);
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const isInitializedRef = React.useRef(false);

  // Reset form khi modal mở/đóng
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setTitle('');
      setSubject('');
      setFolder('');
      setQuestions([]);
      setShowQuestionDetailList(false);
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Nạp danh sách bộ đề nếu chưa có
  useEffect(() => {
    if (!isOpen) return;

    if (propQuestionSets && propQuestionSets.length > 0) {
      setQuestionSets(propQuestionSets);
      if (!questionSetId && propQuestionSets[0]) {
        setQuestionSetId(propQuestionSets[0].id);
        if (!isInitializedRef.current) {
          setTitle(propQuestionSets[0].title);
          setSubject(propQuestionSets[0].subject || '');
          isInitializedRef.current = true;
        }
      }
      return;
    }

    let isMounted = true;
    setIsLoadingSets(true);
    api
      .getQuestionSets()
      .then((sets) => {
        if (!isMounted) return;
        setQuestionSets(sets);
        if (sets.length > 0 && !questionSetId) {
          setQuestionSetId(sets[0]!.id);
          if (!isInitializedRef.current) {
            setTitle(sets[0]!.title);
            setSubject(sets[0]!.subject || '');
            isInitializedRef.current = true;
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          onShowToast('Không thể nạp danh sách bộ đề từ kho câu hỏi.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSets(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, propQuestionSets, questionSetId, onShowToast]);

  // Cập nhật classId mặc định
  useEffect(() => {
    if (initialClassId) {
      setClassId(initialClassId);
    } else if (classes.length > 0 && !classId) {
      setClassId(classes[0]!.id);
    }
  }, [initialClassId, classes, classId]);

  // Nạp chi tiết câu hỏi từ bộ đề được chọn để phân bổ điểm
  useEffect(() => {
    if (!questionSetId) {
      setQuestions([]);
      return;
    }
    let isMounted = true;
    setIsLoadingQuestions(true);
    api
      .getQuestionSet(questionSetId)
      .then((qs) => {
        if (!isMounted) return;
        const rawQs = (qs.questions as Array<Record<string, unknown>>) || [];
        const mapped = rawQs.map((q, idx) => ({
          ...q,
          id: q['id'] || `q_${idx + 1}`,
          points: typeof q['points'] === 'number' && (q['points'] as number) > 0 ? q['points'] : 1,
        }));
        setQuestions(mapped);
      })
      .catch(() => {
        if (isMounted) setQuestions([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingQuestions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [questionSetId]);

  // Khi giáo viên chọn một bộ đề khác, gợi ý tự động điền tiêu đề & môn
  const handleSelectQuestionSet = (setId: string) => {
    setQuestionSetId(setId);
    const chosen = questionSets.find((q) => q.id === setId);
    if (chosen) {
      setTitle(chosen.title);
      if (chosen.subject) {
        setSubject(chosen.subject);
      }
    }
  };

  // Tính tổng điểm hiện tại của toàn bộ câu hỏi
  const currentTotalScore = useMemo(() => {
    const sum = questions.reduce((acc, q) => acc + (typeof q['points'] === 'number' ? (q['points'] as number) : 0), 0);
    return Math.round(sum * 100) / 100;
  }, [questions]);

  // Chia đều tổng điểm cho tất cả câu hỏi
  const handleDistributeTotalScore = (totalTarget: number) => {
    if (questions.length === 0 || totalTarget <= 0) return;
    const n = questions.length;
    const base = Math.floor((totalTarget / n) * 100) / 100;
    const remainderCents = Math.round((totalTarget - base * n) * 100);

    const updated = questions.map((q, idx) => {
      const extra = idx < remainderCents ? 0.01 : 0;
      const pts = Math.round((base + extra) * 100) / 100;
      return {
        ...q,
        points: pts,
      };
    });
    setQuestions(updated);
    onShowToast(`🎯 Đã chia đều ${totalTarget} điểm cho ${n} câu hỏi! (Mỗi câu ~${base}đ)`);
  };

  // Gán cùng một mức điểm cho tất cả câu hỏi
  const handleApplySameScore = (pts: number) => {
    if (questions.length === 0 || pts <= 0) return;
    const updated = questions.map((q) => ({
      ...q,
      points: pts,
    }));
    setQuestions(updated);
    const newTotal = Math.round(pts * questions.length * 100) / 100;
    onShowToast(`🎯 Đã gán ${pts} điểm cho toàn bộ ${questions.length} câu (Tổng: ${newTotal}đ)`);
  };

  // Sửa điểm riêng của từng câu hỏi
  const handleUpdateQuestionPoint = (idx: number, newPoint: number) => {
    const updated = [...questions];
    if (updated[idx]) {
      updated[idx] = {
        ...updated[idx],
        points: Math.max(0, Math.round(newPoint * 100) / 100),
      };
      setQuestions(updated);
    }
  };

  const getQuestionSnippet = (q: Record<string, unknown>, fallbackIdx: number): string => {
    const stem = q['stem'];
    if (typeof stem === 'string') return stem;
    if (typeof stem === 'object' && stem !== null && 'text' in stem) {
      return String((stem as { text: unknown }).text || `Câu hỏi ${fallbackIdx + 1}`);
    }
    return `Câu hỏi ${fallbackIdx + 1}`;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors['title'] = 'Vui lòng nhập tiêu đề kỳ thi.';
    }
    if (!classId) {
      errors['classId'] = 'Vui lòng chọn lớp học áp dụng.';
    }
    if (!questionSetId) {
      errors['questionSetId'] = 'Vui lòng chọn một bộ đề từ Kho đề thi.';
    }
    if (!durationMinutes || durationMinutes <= 0) {
      errors['durationMinutes'] = 'Thời gian làm bài tối thiểu là 1 phút.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const created = await api.createExam({
        classId,
        title: title.trim(),
        subject: subject.trim() ? subject.trim() : null,
        questionSetId,
        questions: questions.length > 0 ? questions : undefined,
        durationMinutes,
        config: {
          shuffleQuestions,
          shuffleOptions,
          allowViewScore,
          allowViewReview,
          password: password.trim() ? password.trim() : null,
          folder: folder.trim() ? folder.trim() : null,
        },
      });

      onShowToast(`🎉 Tạo kỳ thi "${title.trim()}" thành công!`);
      onSuccess(created);
      onClose();
    } catch {
      onShowToast('Đã xảy ra lỗi khi tạo kỳ thi. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="680px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📝</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }}>
              Tạo Kỳ Thi Mới Theo Ca
            </div>
            <div style={{ fontSize: '13px', color: UI_COLORS.textMuted, fontWeight: 500, marginTop: '2px' }}>
              Thiết lập bài kiểm tra lưu trữ lâu dài, chia ca thi độc lập cho cả lớp
            </div>
          </div>
        </div>
      }
      onClose={() => !isSubmitting && onClose()}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0' }}>
        {/* 1. Tên bài thi & Môn học */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 300px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
              Tiêu đề kỳ thi <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Kiểm tra 1 tiết Tin học - Giữa HK1"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors['title']) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${formErrors['title'] ? '#DC2626' : UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
            {formErrors['title'] && (
              <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                {formErrors['title']}
              </span>
            )}
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
              Môn học
            </label>
            <input
              type="text"
              placeholder="VD: Tin học, Toán..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
          </div>

          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
              📁 Thư mục lưu trữ
            </label>
            <input
              type="text"
              list="create-exam-folder-datalist"
              placeholder="VD: Giữa HK1, 15 Phút..."
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                minHeight: '44px',
              }}
            />
            <datalist id="create-exam-folder-datalist">
              {existingFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>

        {/* 2. Chọn Lớp học & Chọn Bộ đề thi */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {/* Lớp học */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
              Lớp học áp dụng <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                if (formErrors['classId']) setFormErrors((prev) => ({ ...prev, classId: '' }));
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${formErrors['classId'] ? '#DC2626' : UI_COLORS.border}`,
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: UI_COLORS.text,
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              {classes.length === 0 ? (
                <option value="">Chưa có lớp nào trong hệ thống</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏫 {c.name}
                  </option>
                ))
              )}
            </select>
            {formErrors['classId'] && (
              <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                {formErrors['classId']}
              </span>
            )}
          </div>

          {/* Bộ đề từ Kho đề */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
              Bộ đề từ Kho đề thi <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={questionSetId}
              onChange={(e) => {
                handleSelectQuestionSet(e.target.value);
                if (formErrors['questionSetId']) setFormErrors((prev) => ({ ...prev, questionSetId: '' }));
              }}
              disabled={isLoadingSets}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${formErrors['questionSetId'] ? '#DC2626' : UI_COLORS.border}`,
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: UI_COLORS.text,
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              {isLoadingSets ? (
                <option value="">Đang nạp kho câu hỏi...</option>
              ) : questionSets.length === 0 ? (
                <option value="">Chưa có bộ đề nào trong Kho đề</option>
              ) : (
                questionSets.map((qs) => {
                  const isMatrix = qs.tags?.some((t) => t.toLowerCase().includes('ma trận')) || false;
                  return (
                    <option key={qs.id} value={qs.id}>
                      {isMatrix ? '🎯 [Ma trận] ' : '📚 '}{qs.title} ({qs.questionCount} câu)
                    </option>
                  );
                })
              )}
            </select>
            {formErrors['questionSetId'] && (
              <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                {formErrors['questionSetId']}
              </span>
            )}
          </div>
        </div>

        {/* 2.5 Phân bổ điểm cho câu hỏi trong kỳ thi */}
        {questionSetId && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: UI_RADII.card,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚖️</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: UI_COLORS.text }}>
                  Phân Bổ Điểm Cho Câu Hỏi
                </span>
                {isLoadingQuestions && (
                  <span style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>
                    (Đang nạp câu hỏi...)
                  </span>
                )}
                {!isLoadingQuestions && questions.length > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      backgroundColor: '#E2E8F0',
                      color: '#334155',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {questions.length} câu
                  </span>
                )}
              </div>

              {/* Tag tổng điểm hiện tại */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: currentTotalScore === 10 || currentTotalScore === 7 ? '#DCFCE7' : '#EFF6FF',
                  border: `1px solid ${currentTotalScore === 10 || currentTotalScore === 7 ? '#86EFAC' : '#BFDBFE'}`,
                  color: currentTotalScore === 10 || currentTotalScore === 7 ? '#15803D' : '#1D4ED8',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <span>Tổng điểm:</span>
                <strong style={{ fontSize: '15px' }}>{currentTotalScore}</strong>
                <span>điểm</span>
              </div>
            </div>

            {questions.length > 0 && (
              <>
                {/* Các nút chia đều nhanh 10đ / 7đ */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: UI_COLORS.textMuted, fontWeight: 600 }}>
                    Chia nhanh:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDistributeTotalScore(10)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🎯 Chia đều 10 điểm ({Math.floor((10 / questions.length) * 100) / 100}đ/câu)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistributeTotalScore(7)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🎯 Chia đều 7 điểm ({Math.floor((7 / questions.length) * 100) / 100}đ/câu)
                  </button>
                </div>

                {/* Tùy chỉnh tổng điểm hoặc gán đồng đều */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '14px',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px dashed #E2E8F0',
                  }}
                >
                  {/* Nhập tổng điểm tùy ý */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>Tổng điểm:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.5}
                      value={targetTotalScore}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTargetTotalScore(isNaN(val) ? 0 : val);
                      }}
                      style={{
                        width: '65px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDistributeTotalScore(targetTotalScore)}
                      disabled={targetTotalScore <= 0}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#1E293B',
                        cursor: 'pointer',
                      }}
                    >
                      Chia đều
                    </button>
                  </div>

                  {/* Gán điểm mỗi câu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>Mỗi câu:</span>
                    <input
                      type="number"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={scorePerQuestionInput}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setScorePerQuestionInput(isNaN(val) ? 0 : val);
                      }}
                      style={{
                        width: '65px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: UI_COLORS.textMuted }}>đ</span>
                    <button
                      type="button"
                      onClick={() => handleApplySameScore(scorePerQuestionInput)}
                      disabled={scorePerQuestionInput <= 0}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#1E293B',
                        cursor: 'pointer',
                      }}
                    >
                      Gán tất cả
                    </button>
                  </div>

                  {/* Nút bật/tắt danh sách chi tiết */}
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setShowQuestionDetailList((prev) => !prev)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: showQuestionDetailList ? '#EEF2FF' : '#FFFFFF',
                        border: '1px solid #C7D2FE',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#4338CA',
                        cursor: 'pointer',
                      }}
                    >
                      {showQuestionDetailList ? '▲ Thu gọn danh sách câu' : `👁️ Sửa điểm từng câu (${questions.length} câu)`}
                    </button>
                  </div>
                </div>

                {/* Danh sách bảng chỉnh sửa điểm từng câu */}
                {showQuestionDetailList && (
                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', width: '45px' }}>Câu</th>
                          <th style={{ padding: '6px 8px', width: '90px' }}>Loại câu</th>
                          <th style={{ padding: '6px 8px' }}>Nội dung câu hỏi</th>
                          <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Điểm số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((q, idx) => {
                          const pts = typeof q['points'] === 'number' ? (q['points'] as number) : 1;
                          const qType = String(q['type'] || 'mcq4');
                          const typeLabel =
                            qType === 'mcq4'
                              ? 'Trắc nghiệm'
                              : qType === 'tf'
                              ? 'Đúng/Sai'
                              : qType === 'short'
                              ? 'Điền ngắn'
                              : qType;

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#334155' }}>
                                #{idx + 1}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#64748B' }}>
                                <span
                                  style={{
                                    backgroundColor: '#F1F5F9',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                  }}
                                >
                                  {typeLabel}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '6px 8px',
                                  color: '#1E293B',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={getQuestionSnippet(q, idx)}
                              >
                                {getQuestionSnippet(q, idx)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  value={pts}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleUpdateQuestionPoint(idx, isNaN(val) ? 0 : val);
                                  }}
                                  style={{
                                    width: '65px',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textAlign: 'right',
                                  }}
                                />
                                <span style={{ marginLeft: '4px', fontSize: '11px', color: '#64748B' }}>đ</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Cảnh báo Phiên tự do khi tạo Kỳ thi theo lớp */}
        {(() => {
          const currentSessionClassId =
            activeSession?.session?.classId ??
            (activeSession as { classId?: string | null })?.classId ??
            null;
          const isFreeSession = Boolean(activeSession) && !currentSessionClassId;
          const selectedClass = classes.find((c) => c.id === classId);
          if (!isFreeSession) return null;

          return (
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderRadius: UI_RADII.card,
                padding: '12px 16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
              <div style={{ fontSize: '12.5px', color: '#92400E', lineHeight: 1.5 }}>
                <strong style={{ color: '#B45309' }}>Lưu ý: Tiết học hiện tại đang là Phiên tự do!</strong>
                <div style={{ marginTop: '2px' }}>
                  Kỳ thi này được gắn với <strong>{selectedClass?.name || 'Lớp đã chọn'}</strong>, nhưng phiên học hiện tại không chọn danh sách lớp (học sinh chỉ gõ tên tự do khi vào phòng).
                </div>
                <div style={{ marginTop: '4px', color: '#15803D', fontWeight: 600 }}>
                  ✓ Hệ thống vẫn tự động lưu đầy đủ điểm số và bài thi của học sinh tự do vào báo cáo.
                </div>
                <div style={{ marginTop: '2px', color: '#B45309' }}>
                  💡 Để học sinh tự động đăng nhập đúng mã và danh sách lớp chính thức, thầy/cô nên kết thúc phiên hiện tại và <u>Tạo phiên mới theo lớp {selectedClass?.name || ''}</u>.
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. Thời gian làm bài (phút) */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '6px' }}>
            Thời lượng làm bài (phút) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              max={180}
              value={durationMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setDurationMinutes(isNaN(val) ? 0 : val);
              }}
              style={{
                width: '110px',
                padding: '10px 14px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '14px',
                fontWeight: 700,
                minHeight: '44px',
              }}
            />

            {/* Các nút bấm chọn nhanh thời lượng */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${durationMinutes === mins ? UI_COLORS.primary : UI_COLORS.border}`,
                    backgroundColor: durationMinutes === mins ? '#EEF4FF' : '#F8FAFC',
                    color: durationMinutes === mins ? UI_COLORS.primary : '#475569',
                    fontWeight: durationMinutes === mins ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    minHeight: '40px',
                  }}
                >
                  {mins} phút
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Cấu hình & Tùy chọn bài thi */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: UI_RADII.card,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: UI_COLORS.text, marginBottom: '2px' }}>
            ⚙️ Tùy chọn chống gian lận & Trả kết quả
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: UI_COLORS.primary, cursor: 'pointer' }}
            />
            <span>
              <strong>Xáo trộn thứ tự câu hỏi:</strong> Mỗi học sinh nhận đề với thứ tự câu hỏi ngẫu nhiên khác nhau.
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: UI_COLORS.primary, cursor: 'pointer' }}
            />
            <span>
              <strong>Xáo trộn thứ tự đáp án (A, B, C, D):</strong> Đảo ngẫu nhiên vị trí các lựa chọn trong từng câu.
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={allowViewScore}
              onChange={(e) => setAllowViewScore(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: UI_COLORS.primary, cursor: 'pointer' }}
            />
            <span>
              <strong>Cho xem điểm sau khi nộp:</strong> Hiển thị điểm số ngay khi học sinh hoàn thành bài thi.
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              color: UI_COLORS.text,
            }}
          >
            <input
              type="checkbox"
              checked={allowViewReview}
              onChange={(e) => setAllowViewReview(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: UI_COLORS.primary, cursor: 'pointer' }}
            />
            <span>
              <strong>Cho xem lại bài & đáp án đúng:</strong> Học sinh có thể xem lại các câu đúng/sai sau khi nộp.
            </span>
          </label>

          {/* Mật khẩu bảo vệ */}
          <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: UI_COLORS.text, marginBottom: '6px' }}>
              🔒 Mật khẩu vào thi (Tùy chọn, để trống nếu không yêu cầu):
            </label>
            <input
              type="text"
              placeholder="VD: 123456"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '240px',
                boxSizing: 'border-box',
                padding: '8px 12px',
                borderRadius: UI_RADII.input,
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {/* Nút Hủy & Xác nhận tạo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              backgroundColor: '#F1F5F9',
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            Hủy bỏ
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || classes.length === 0}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              fontWeight: 700,
              padding: '10px 24px',
            }}
          >
            {isSubmitting ? 'Đang tạo kỳ thi...' : '➕ Tạo kỳ thi ngay'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
