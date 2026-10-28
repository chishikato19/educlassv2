import React, { useMemo, useState } from 'react';
import type { ExamRecordDto } from '@educlass/protocol';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { renderLatexInText, resolveAssetUrl } from '@educlass/question-kit';

export interface StudentExamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ExamRecordDto | null;
  questions: Array<Record<string, unknown>>;
  className?: string | undefined;
  examTitle?: string | undefined;
}

interface ParsedQuestionReview {
  questionId: string;
  order: number;
  stemText: string;
  stemImages: string[];
  type: string;
  points: number;
  pointsEarned: number;
  isCorrect: boolean;
  options?:
    | Array<{ index: number; label: string; text: string; images?: string[] | undefined }>
    | undefined;
  items?:
    | Array<{
        index: number;
        label: string;
        text: string;
        images?: string[] | undefined;
        studentAnswer: boolean | null;
        studentChoiceLabel: string;
        correctAnswer: boolean;
        correctChoiceLabel: string;
        isCorrect: boolean;
      }>
    | undefined;
  acceptedAnswers?: string[] | undefined;
  studentChoiceLabel: string | null;
  correctChoiceLabel: string | null;
  studentRawAnswer: unknown;
  correctRawAnswer: unknown;
  explanation?: string | undefined;
}

const BASE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function richTextToString(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return '';
  const obj = raw as Record<string, unknown>;
  if (typeof obj['text'] === 'string') return obj['text'];
  if (Array.isArray(obj['runs'])) {
    return (obj['runs'] as Array<Record<string, unknown>>)
      .map(r => (typeof r['text'] === 'string' ? r['text'] : ''))
      .join('');
  }
  return '';
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

function formatDateTime(ts: number): string {
  if (!ts || ts <= 0) return '—';
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const dd = pad(d.getDate());
  const mo = pad(d.getMonth() + 1);
  return `${hh}:${mm}:${ss} ${dd}/${mo}`;
}

export const StudentExamReviewModal: React.FC<StudentExamReviewModalProps> = ({
  isOpen,
  onClose,
  record,
  questions,
  className,
  examTitle,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong'>('all');
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Chuyển đổi dữ liệu câu trả lời của học sinh thành danh sách câu hỏi review trực quan
  const parsedReviews: ParsedQuestionReview[] = useMemo(() => {
    if (!record) return [];

    // 1. Nếu trong record.result đã có reviewData (do activity exam trả về)
    if (record.result && Array.isArray(record.result)) {
      const rawList = record.result as Array<Record<string, unknown>>;
      return rawList.map((item, idx) => {
        const order = typeof item['order'] === 'number' ? item['order'] : idx + 1;
        const qId = String(item['questionId'] || item['id'] || `q${order}`);
        const origQ =
          questions.find(q => q['id'] === qId || q['orderIndex'] === order - 1) ?? questions[idx];

        const stemText =
          typeof item['stemText'] === 'string' && item['stemText'].trim()
            ? item['stemText']
            : origQ
              ? richTextToString(origQ['stem'])
              : `Câu hỏi ${order}`;

        let stemImages: string[] = [];
        if (Array.isArray(item['stemImages']) && item['stemImages'].length > 0) {
          stemImages = item['stemImages'] as string[];
        } else if (origQ) {
          if (
            origQ['stem'] &&
            typeof origQ['stem'] === 'object' &&
            Array.isArray((origQ['stem'] as Record<string, unknown>)['images'])
          ) {
            stemImages = (origQ['stem'] as Record<string, unknown>)['images'] as string[];
          } else if (Array.isArray(origQ['images'])) {
            stemImages = origQ['images'] as string[];
          }
        }

        const type = String(item['type'] || (origQ ? origQ['type'] : 'mcq4'));
        const points =
          typeof item['points'] === 'number'
            ? item['points']
            : origQ && typeof origQ['points'] === 'number'
              ? origQ['points']
              : 0.5;
        const pointsEarned = typeof item['pointsEarned'] === 'number' ? item['pointsEarned'] : 0;
        const isCorrect = item['isCorrect'] === true || item['correct'] === true;

        let options: Array<{ index: number; label: string; text: string; images?: string[] }> = [];
        if (Array.isArray(item['options'])) {
          options = (item['options'] as Array<Record<string, unknown>>).map((opt, oIdx) => {
            let optImages: string[] = [];
            if (Array.isArray(opt['images'])) {
              optImages = opt['images'] as string[];
            } else if (origQ && Array.isArray(origQ['options'])) {
              const origOpt = origQ['options'][oIdx];
              if (
                origOpt &&
                typeof origOpt === 'object' &&
                Array.isArray((origOpt as Record<string, unknown>)['images'])
              ) {
                optImages = (origOpt as Record<string, unknown>)['images'] as string[];
              }
            }
            return {
              index: typeof opt['index'] === 'number' ? opt['index'] : oIdx,
              label: String(opt['label'] || BASE_LABELS[oIdx] || `${oIdx + 1}`),
              text: richTextToString(opt['text'] || opt),
              images: optImages,
            };
          });
        }

        const items = Array.isArray(item['items'])
          ? (item['items'] as Array<Record<string, unknown>>).map((it, idx) => ({
              index: typeof it['index'] === 'number' ? it['index'] : idx,
              label: String(it['label'] || ['a', 'b', 'c', 'd'][idx] || `${idx + 1}`),
              text: richTextToString(it['text'] || it),
              images: Array.isArray(it['images']) ? (it['images'] as string[]) : undefined,
              studentAnswer: typeof it['studentAnswer'] === 'boolean' ? it['studentAnswer'] : null,
              studentChoiceLabel: String(
                it['studentChoiceLabel'] ||
                  (it['studentAnswer'] === true
                    ? 'Đúng'
                    : it['studentAnswer'] === false
                      ? 'Sai'
                      : '—')
              ),
              correctAnswer: it['correctAnswer'] === true,
              correctChoiceLabel: String(
                it['correctChoiceLabel'] || (it['correctAnswer'] === true ? 'Đúng' : 'Sai')
              ),
              isCorrect: it['isCorrect'] === true,
            }))
          : undefined;

        const acceptedAnswers = Array.isArray(item['acceptedAnswers'])
          ? (item['acceptedAnswers'] as string[])
          : origQ && Array.isArray((origQ as Record<string, unknown>)['acceptedAnswers'])
            ? ((origQ as Record<string, unknown>)['acceptedAnswers'] as string[])
            : undefined;

        const studentChoiceLabel = item['studentChoiceLabel']
          ? String(item['studentChoiceLabel'])
          : null;
        const correctChoiceLabel = item['correctChoiceLabel']
          ? String(item['correctChoiceLabel'])
          : null;
        const explanation =
          typeof item['explanation'] === 'string' && item['explanation'].trim()
            ? item['explanation']
            : origQ && origQ['explanation']
              ? richTextToString(origQ['explanation'])
              : undefined;

        return {
          questionId: qId,
          order,
          stemText,
          stemImages,
          type,
          points,
          pointsEarned,
          isCorrect,
          options,
          items,
          acceptedAnswers,
          studentChoiceLabel,
          correctChoiceLabel,
          studentRawAnswer: item['studentAnswer'],
          correctRawAnswer: item['correctAnswer'],
          explanation,
        };
      });
    }

    // 2. Fallback: Tự tái tạo từ questions và answers của học sinh
    const answers = (record.answers || {}) as Record<string, unknown>;
    return questions.map((q, idx) => {
      const order = idx + 1;
      const qId = String(q['id'] || `q${order}`);
      const stemText = richTextToString(q['stem']) || `Câu hỏi ${order}`;
      const stemImages =
        q['stem'] &&
        typeof q['stem'] === 'object' &&
        Array.isArray((q['stem'] as Record<string, unknown>)['images'])
          ? ((q['stem'] as Record<string, unknown>)['images'] as string[])
          : Array.isArray(q['images'])
            ? (q['images'] as string[])
            : [];
      const type = String(q['type'] || 'mcq4');
      const points = typeof q['points'] === 'number' ? q['points'] : 0.5;

      const rawAns = answers[qId] ?? answers[`q_${order}`] ?? answers[`q${order}`];

      let options: Array<{ index: number; label: string; text: string; images?: string[] }> = [];
      let items: ParsedQuestionReview['items'] = undefined;
      let acceptedAnswers: string[] | undefined = undefined;
      let studentChoiceLabel: string | null = null;
      let correctChoiceLabel: string | null = null;
      let isCorrect = false;
      let pointsEarned = 0;

      const correctRaw = q['correct'] ?? (q as Record<string, unknown>)['correctAnswer'];

      if (type === 'mcq4' && Array.isArray(q['options'])) {
        options = (q['options'] as unknown[]).map((opt, optIdx) => {
          let optImages: string[] = [];
          if (
            typeof opt === 'object' &&
            opt !== null &&
            Array.isArray((opt as Record<string, unknown>)['images'])
          ) {
            optImages = (opt as Record<string, unknown>)['images'] as string[];
          }
          return {
            index: optIdx,
            label: BASE_LABELS[optIdx] ?? `${optIdx + 1}`,
            text: richTextToString(opt),
            images: optImages,
          };
        });

        if (typeof rawAns === 'number' && rawAns >= 0 && rawAns < options.length) {
          studentChoiceLabel = BASE_LABELS[rawAns] ?? `${rawAns + 1}`;
        } else if (typeof rawAns === 'string' && rawAns.length === 1) {
          studentChoiceLabel = rawAns.toUpperCase();
        }

        if (typeof correctRaw === 'number' && correctRaw >= 0 && correctRaw < options.length) {
          correctChoiceLabel = BASE_LABELS[correctRaw] ?? `${correctRaw + 1}`;
        } else if (typeof correctRaw === 'string') {
          correctChoiceLabel = correctRaw.toUpperCase();
        }

        if (studentChoiceLabel && correctChoiceLabel && studentChoiceLabel === correctChoiceLabel) {
          isCorrect = true;
        } else if (rawAns !== undefined && correctRaw !== undefined && rawAns === correctRaw) {
          isCorrect = true;
        }
        pointsEarned = isCorrect ? points : 0;
      } else if (type === 'tf') {
        options = [
          { index: 0, label: 'Đúng', text: 'Đúng' },
          { index: 1, label: 'Sai', text: 'Sai' },
        ];
        const studentBool =
          typeof rawAns === 'boolean'
            ? rawAns
            : rawAns === 'true' || rawAns === 1
              ? true
              : rawAns === 'false' || rawAns === 0
                ? false
                : null;
        const correctBool =
          typeof correctRaw === 'boolean'
            ? correctRaw
            : correctRaw === 'true' || correctRaw === 1
              ? true
              : false;

        studentChoiceLabel = studentBool === true ? 'Đúng' : studentBool === false ? 'Sai' : null;
        correctChoiceLabel = correctBool ? 'Đúng' : 'Sai';
        isCorrect = studentBool !== null && studentBool === correctBool;
        pointsEarned = isCorrect ? points : 0;
      } else if (type === 'tf_group') {
        const origItems = Array.isArray(q['items'])
          ? (q['items'] as Array<Record<string, unknown>>)
          : [];
        let rawArr: Array<boolean | null> = [null, null, null, null];
        if (Array.isArray(rawAns)) {
          rawArr = rawAns.map(v =>
            typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : null
          );
        } else if (
          rawAns &&
          typeof rawAns === 'object' &&
          Array.isArray((rawAns as Record<string, unknown>)['selected'])
        ) {
          rawArr = ((rawAns as Record<string, unknown>)['selected'] as unknown[]).map(v =>
            typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : null
          );
        }

        let countCorrect = 0;
        items = origItems.map((it, itIdx) => {
          const itStudent = rawArr[itIdx] ?? null;
          const itCorrect = Boolean(it['correct']);
          const itIsCorrect = itStudent !== null && itStudent === itCorrect;
          if (itIsCorrect) countCorrect++;
          return {
            index: itIdx,
            label: ['a', 'b', 'c', 'd'][itIdx] || `${itIdx + 1}`,
            text: richTextToString(it['text'] || it),
            images: Array.isArray(it['images']) ? (it['images'] as string[]) : undefined,
            studentAnswer: itStudent,
            studentChoiceLabel: itStudent === true ? 'Đúng' : itStudent === false ? 'Sai' : '—',
            correctAnswer: itCorrect,
            correctChoiceLabel: itCorrect ? 'Đúng' : 'Sai',
            isCorrect: itIsCorrect,
          };
        });

        // Barem Bộ GD: 1 ý = 0.1, 2 ý = 0.25, 3 ý = 0.5, 4 ý = 1.0 (nhân hệ số points / 1.0)
        const fraction =
          countCorrect === 4
            ? 1.0
            : countCorrect === 3
              ? 0.5
              : countCorrect === 2
                ? 0.25
                : countCorrect === 1
                  ? 0.1
                  : 0;
        pointsEarned = points * fraction;
        isCorrect = countCorrect === 4;
      } else if (type === 'short') {
        acceptedAnswers = Array.isArray(q['acceptedAnswers'])
          ? (q['acceptedAnswers'] as string[])
          : correctRaw !== undefined
            ? [String(correctRaw)]
            : [];
        const studentStr = rawAns !== undefined && rawAns !== null ? String(rawAns).trim() : '';
        const normStudent = studentStr.toLowerCase().replace(/\s+/g, ' ');
        isCorrect =
          normStudent !== '' &&
          acceptedAnswers.some(
            acc => acc.trim().toLowerCase().replace(/\s+/g, ' ') === normStudent
          );
        pointsEarned = isCorrect ? points : 0;
        studentChoiceLabel = studentStr || null;
        correctChoiceLabel = acceptedAnswers.join(' hoặc ');
      } else {
        if (
          rawAns !== undefined &&
          correctRaw !== undefined &&
          String(rawAns).trim().toLowerCase() === String(correctRaw).trim().toLowerCase()
        ) {
          isCorrect = true;
        }
        pointsEarned = isCorrect ? points : 0;
      }

      return {
        questionId: qId,
        order,
        stemText,
        stemImages,
        type,
        points,
        pointsEarned,
        isCorrect,
        options,
        items,
        acceptedAnswers,
        studentChoiceLabel,
        correctChoiceLabel,
        studentRawAnswer: rawAns,
        correctRawAnswer: correctRaw,
        explanation: q['explanation'] ? richTextToString(q['explanation']) : undefined,
      };
    });
  }, [record, questions]);

  // Lọc câu hỏi theo Đúng / Sai
  const filteredReviews = useMemo(() => {
    if (filterType === 'correct') {
      return parsedReviews.filter(q => q.isCorrect);
    }
    if (filterType === 'wrong') {
      return parsedReviews.filter(q => !q.isCorrect);
    }
    return parsedReviews;
  }, [parsedReviews, filterType]);

  const correctCount = parsedReviews.filter(q => q.isCorrect).length;
  const wrongCount = parsedReviews.length - correctCount;

  if (!isOpen || !record) return null;

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="840px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📝</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }}>
              Chi Tiết Bài Làm: {record.studentName}
            </div>
            <div style={{ fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
              {className ? `Lớp: ${className}` : ''}{' '}
              {record.studentCode ? `• Mã HS: ${record.studentCode}` : ''} • Ca thi{' '}
              {record.batchIndex}
              {examTitle ? ` • Đề: ${examTitle}` : ''}
            </div>
          </div>
        </div>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
        {/* 1. Thẻ tổng quan kết quả bài thi */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: UI_RADII.card,
            padding: '14px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Điểm số */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor:
                  record.score >= 0.5 * (record.maxScore || 10) ? '#DCFCE7' : '#FEE2E2',
                border: `2px solid ${record.score >= 0.5 * (record.maxScore || 10) ? '#86EFAC' : '#FCA5A5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 900,
                color: record.score >= 0.5 * (record.maxScore || 10) ? '#15803D' : '#DC2626',
              }}
            >
              {record.score}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: UI_COLORS.text }}>
                ĐIỂM ĐẠT ĐƯỢC: {record.score} / {record.maxScore || 10}đ
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                Đúng <strong>{correctCount}</strong> / {parsedReviews.length} câu (
                {record.percentage}%)
              </div>
            </div>
          </div>

          {/* Thời gian làm bài & Nộp bài */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#475569' }}>
            <div>
              <div style={{ color: UI_COLORS.textMuted, fontSize: '11px', fontWeight: 600 }}>
                THỜI GIAN LÀM
              </div>
              <div style={{ fontWeight: 700, color: UI_COLORS.text, marginTop: '2px' }}>
                ⏱️ {record.timeSpentSeconds > 0 ? formatSeconds(record.timeSpentSeconds) : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: UI_COLORS.textMuted, fontSize: '11px', fontWeight: 600 }}>
                NỘP BÀI LÚC
              </div>
              <div style={{ fontWeight: 700, color: UI_COLORS.text, marginTop: '2px' }}>
                📅 {formatDateTime(record.submittedAt)}
              </div>
            </div>
          </div>

          {/* Trạng thái */}
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: record.status === 'submitted' ? '#DCFCE7' : '#FEF3C7',
              color: record.status === 'submitted' ? '#166534' : '#92400E',
              border: `1px solid ${record.status === 'submitted' ? '#BBF7D0' : '#FDE68A'}`,
            }}
          >
            {record.status === 'submitted' ? '✓ Đã nộp bài hoàn tất' : '⏳ Đang làm bài'}
          </span>
        </div>

        {/* 2. Bộ lọc câu hỏi: Tất cả / Câu đúng / Câu sai */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: `1px solid ${filterType === 'all' ? UI_COLORS.primary : '#E2E8F0'}`,
              backgroundColor: filterType === 'all' ? '#EEF4FF' : '#FFFFFF',
              color: filterType === 'all' ? UI_COLORS.primary : '#475569',
              fontWeight: filterType === 'all' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Tất cả ({parsedReviews.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('correct')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: `1px solid ${filterType === 'correct' ? '#16A34A' : '#E2E8F0'}`,
              backgroundColor: filterType === 'correct' ? '#F0FDF4' : '#FFFFFF',
              color: filterType === 'correct' ? '#16A34A' : '#475569',
              fontWeight: filterType === 'correct' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✓ Câu đúng ({correctCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('wrong')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: `1px solid ${filterType === 'wrong' ? '#DC2626' : '#E2E8F0'}`,
              backgroundColor: filterType === 'wrong' ? '#FEF2F2' : '#FFFFFF',
              color: filterType === 'wrong' ? '#DC2626' : '#475569',
              fontWeight: filterType === 'wrong' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✗ Câu sai ({wrongCount})
          </button>
        </div>

        {/* 3. Danh sách chi tiết từng câu hỏi và phương án lựa chọn */}
        <div
          style={{
            maxHeight: '480px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingRight: '4px',
          }}
        >
          {filteredReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: UI_COLORS.textMuted }}>
              Không có câu hỏi nào trong danh mục này.
            </div>
          ) : (
            filteredReviews.map(q => {
              const hasAnswered =
                q.studentChoiceLabel !== null ||
                (q.studentRawAnswer !== undefined &&
                  q.studentRawAnswer !== null &&
                  q.studentRawAnswer !== '') ||
                (q.items && q.items.some(it => it.studentAnswer !== null));
              const isPartial = !q.isCorrect && q.pointsEarned > 0;

              return (
                <div
                  key={q.questionId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${q.isCorrect ? '#BBF7D0' : isPartial ? '#FDE68A' : hasAnswered ? '#FECACA' : '#E2E8F0'}`,
                    borderRadius: UI_RADII.card,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Dòng Header câu: Câu X, Điểm số, Huy hiệu Đúng/Sai */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                        }}
                      >
                        Câu {q.order}
                      </span>
                      <span
                        style={{ fontSize: '12px', fontWeight: 600, color: UI_COLORS.textMuted }}
                      >
                        ({q.pointsEarned > 0 ? `+${q.pointsEarned}đ` : '0đ'} / {q.points}đ)
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        backgroundColor: q.isCorrect
                          ? '#DCFCE7'
                          : isPartial
                            ? '#FEF3C7'
                            : hasAnswered
                              ? '#FEE2E2'
                              : '#F1F5F9',
                        color: q.isCorrect
                          ? '#166534'
                          : isPartial
                            ? '#92400E'
                            : hasAnswered
                              ? '#991B1B'
                              : '#475569',
                        border: `1px solid ${
                          q.isCorrect
                            ? '#86EFAC'
                            : isPartial
                              ? '#FCD34D'
                              : hasAnswered
                                ? '#FCA5A5'
                                : '#CBD5E1'
                        }`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {q.isCorrect
                        ? '✓ ĐÚNG'
                        : isPartial
                          ? `✓ ĐÚNG 1 PHẦN (+${q.pointsEarned}đ)`
                          : hasAnswered
                            ? '✗ SAI'
                            : '⚪ CHƯA LÀM'}
                    </span>
                  </div>

                  {/* Nội dung đề câu hỏi (Render công thức toán KaTeX) */}
                  <div
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: UI_COLORS.text,
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderLatexInText(q.stemText),
                    }}
                  />

                  {/* Ảnh minh họa câu hỏi nếu có */}
                  {q.stemImages && q.stemImages.length > 0 && (
                    <div
                      style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '4px 0' }}
                    >
                      {q.stemImages.map((imgUrl, iIdx) => {
                        const resolvedUrl = resolveAssetUrl(imgUrl);
                        return (
                          <img
                            key={iIdx}
                            src={resolvedUrl}
                            alt={`Minh họa câu ${q.order}`}
                            onClick={() => setPreviewImg(resolvedUrl)}
                            title="Nhấn để phóng to ảnh"
                            style={{
                              maxHeight: '180px',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              cursor: 'zoom-in',
                              backgroundColor: '#FFFFFF',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* 1. Trắc nghiệm 4 lựa chọn (MCQ4) */}
                  {(q.type === 'mcq4' ||
                    (!q.items && q.type !== 'tf' && q.type !== 'short' && q.type !== 'tf_group')) &&
                    q.options &&
                    q.options.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          marginTop: '4px',
                        }}
                      >
                        {q.options.map(opt => {
                          const isStudentPick = q.studentChoiceLabel === opt.label;
                          const isCorrectOpt = q.correctChoiceLabel === opt.label;

                          let optBg = '#F8FAFC';
                          let optBorder = '#E2E8F0';
                          let optColor = '#334155';

                          if (isCorrectOpt) {
                            optBg = '#F0FDF4';
                            optBorder = '#86EFAC';
                            optColor = '#166534';
                          }
                          if (isStudentPick && !isCorrectOpt) {
                            optBg = '#FEF2F2';
                            optBorder = '#FCA5A5';
                            optColor = '#991B1B';
                          }

                          return (
                            <div
                              key={opt.index}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: optBg,
                                border: `1.5px solid ${optBorder}`,
                                color: optColor,
                                fontSize: '13.5px',
                                lineHeight: 1.4,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 800,
                                  width: '22px',
                                  height: '22px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  backgroundColor: isCorrectOpt
                                    ? '#16A34A'
                                    : isStudentPick
                                      ? '#DC2626'
                                      : '#CBD5E1',
                                  color: isCorrectOpt || isStudentPick ? '#FFFFFF' : '#334155',
                                  fontSize: '12px',
                                  flexShrink: 0,
                                  marginTop: '1px',
                                }}
                              >
                                {opt.label}
                              </span>
                              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderLatexInText(opt.text),
                                  }}
                                />
                                {opt.images && opt.images.length > 0 && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px',
                                      flexWrap: 'wrap',
                                      marginTop: '6px',
                                    }}
                                  >
                                    {opt.images.map((imgUrl, oImgIdx) => {
                                      const optResolved = resolveAssetUrl(imgUrl);
                                      return (
                                        <img
                                          key={oImgIdx}
                                          src={optResolved}
                                          alt={`Hình phương án ${opt.label}`}
                                          onClick={() => setPreviewImg(optResolved)}
                                          title="Nhấn để phóng to ảnh"
                                          style={{
                                            maxHeight: '120px',
                                            maxWidth: '100%',
                                            objectFit: 'contain',
                                            borderRadius: '4px',
                                            border: '1px solid #CBD5E1',
                                            cursor: 'zoom-in',
                                            backgroundColor: '#FFFFFF',
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {isStudentPick && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: isCorrectOpt ? '#DCFCE7' : '#FEE2E2',
                                      color: isCorrectOpt ? '#166534' : '#DC2626',
                                      border: `1px solid ${isCorrectOpt ? '#86EFAC' : '#FCA5A5'}`,
                                    }}
                                  >
                                    {isCorrectOpt ? '✓ Bạn chọn (Đúng)' : '✗ Bạn chọn'}
                                  </span>
                                )}
                                {isCorrectOpt && !isStudentPick && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#DCFCE7',
                                      color: '#166534',
                                      border: '1px solid #86EFAC',
                                    }}
                                  >
                                    ✓ Đáp án đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* 2. Đúng / Sai đơn (TF) */}
                  {q.type === 'tf' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      {[
                        { val: true, label: 'Đúng', icon: '✔' },
                        { val: false, label: 'Sai', icon: '✖' },
                      ].map(item => {
                        const isCorrectOpt =
                          q.correctChoiceLabel === item.label ||
                          (item.val ? q.correctRawAnswer === true : q.correctRawAnswer === false);
                        const isStudentPick =
                          q.studentChoiceLabel === item.label ||
                          (item.val ? q.studentRawAnswer === true : q.studentRawAnswer === false);

                        let bg = '#F8FAFC';
                        let border = '#E2E8F0';
                        let color = '#334155';

                        if (isCorrectOpt) {
                          bg = '#F0FDF4';
                          border = '#86EFAC';
                          color = '#166534';
                        }
                        if (isStudentPick && !isCorrectOpt) {
                          bg = '#FEF2F2';
                          border = '#FCA5A5';
                          color = '#991B1B';
                        }

                        return (
                          <div
                            key={item.label}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              backgroundColor: bg,
                              border: `1.5px solid ${border}`,
                              color,
                              fontSize: '13.5px',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {isStudentPick && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isCorrectOpt ? '#DCFCE7' : '#FEE2E2',
                                    color: isCorrectOpt ? '#166534' : '#DC2626',
                                    border: `1px solid ${isCorrectOpt ? '#86EFAC' : '#FCA5A5'}`,
                                  }}
                                >
                                  {isCorrectOpt ? '✓ Bạn chọn (Đúng)' : '✗ Bạn chọn'}
                                </span>
                              )}
                              {isCorrectOpt && !isStudentPick && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#DCFCE7',
                                    color: '#166534',
                                    border: '1px solid #86EFAC',
                                  }}
                                >
                                  ✓ Đáp án đúng
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Đúng / Sai chùm (TF_GROUP) */}
                  {q.type === 'tf_group' && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#475569',
                          marginBottom: '2px',
                        }}
                      >
                        Chi tiết 4 mệnh đề Đúng / Sai (Barem Bộ Giáo dục 0.1 - 0.25 - 0.5 - 1.0):
                      </div>
                      {(q.items || []).map((it, itIdx) => {
                        const itStudent = it.studentAnswer;
                        const itCorrect = it.correctAnswer;
                        const itIsCorrect = it.isCorrect;

                        let itemBg = '#F8FAFC';
                        let itemBorder = '#E2E8F0';
                        let itemColor = '#334155';

                        if (itIsCorrect) {
                          itemBg = '#F0FDF4';
                          itemBorder = '#86EFAC';
                          itemColor = '#166534';
                        } else if (itStudent !== null) {
                          itemBg = '#FEF2F2';
                          itemBorder = '#FCA5A5';
                          itemColor = '#991B1B';
                        }

                        return (
                          <div
                            key={itIdx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              backgroundColor: itemBg,
                              border: `1.5px solid ${itemBorder}`,
                              color: itemColor,
                              fontSize: '13px',
                              lineHeight: 1.4,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  width: '20px',
                                  height: '20px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  backgroundColor: itIsCorrect
                                    ? '#16A34A'
                                    : itStudent !== null
                                      ? '#DC2626'
                                      : '#CBD5E1',
                                  color: itIsCorrect || itStudent !== null ? '#FFFFFF' : '#334155',
                                  fontSize: '11px',
                                  flexShrink: 0,
                                  marginTop: '1px',
                                }}
                              >
                                {it.label}
                              </span>
                              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderLatexInText(it.text),
                                  }}
                                />
                                {it.images && it.images.length > 0 && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px',
                                      flexWrap: 'wrap',
                                      marginTop: '6px',
                                    }}
                                  >
                                    {it.images.map((imgUrl, imgIdx) => {
                                      const imgResolved = resolveAssetUrl(imgUrl);
                                      return (
                                        <img
                                          key={imgIdx}
                                          src={imgResolved}
                                          alt={`Hình ý ${it.label}`}
                                          onClick={() => setPreviewImg(imgResolved)}
                                          title="Nhấn để phóng to ảnh"
                                          style={{
                                            maxHeight: '100px',
                                            maxWidth: '100%',
                                            objectFit: 'contain',
                                            borderRadius: '4px',
                                            border: '1px solid #CBD5E1',
                                            cursor: 'zoom-in',
                                            backgroundColor: '#FFFFFF',
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Thanh trạng thái lựa chọn của học sinh vs đáp án */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                fontSize: '11.5px',
                                borderTop: '1px dashed #CBD5E1',
                                paddingTop: '4px',
                                marginTop: '2px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: UI_COLORS.textMuted }}>HS chọn:</span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor:
                                      itStudent === true
                                        ? '#DCFCE7'
                                        : itStudent === false
                                          ? '#FEE2E2'
                                          : '#F1F5F9',
                                    color:
                                      itStudent === true
                                        ? '#166534'
                                        : itStudent === false
                                          ? '#991B1B'
                                          : '#64748b',
                                    border: `1px solid ${itStudent === true ? '#86EFAC' : itStudent === false ? '#FCA5A5' : '#E2E8F0'}`,
                                  }}
                                >
                                  {it.studentChoiceLabel ||
                                    (itStudent === true
                                      ? 'Đúng'
                                      : itStudent === false
                                        ? 'Sai'
                                        : 'Chưa chọn')}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: UI_COLORS.textMuted }}>Đáp án đúng:</span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: itCorrect ? '#16A34A' : '#DC2626',
                                    color: '#FFFFFF',
                                  }}
                                >
                                  {itCorrect ? 'Đúng' : 'Sai'}
                                </span>
                              </div>
                              <span style={{ fontWeight: 800, fontSize: '13px' }}>
                                {itIsCorrect
                                  ? '✅ Đúng'
                                  : itStudent !== null
                                    ? '❌ Sai'
                                    : '⚪ Chưa làm'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Trả lời ngắn (SHORT) */}
                  {q.type === 'short' && (
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: UI_COLORS.textMuted }}>
                          Học sinh trả lời:
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: q.isCorrect ? '#DCFCE7' : '#FEE2E2',
                            color: q.isCorrect ? '#166534' : '#991B1B',
                            border: `1px solid ${q.isCorrect ? '#86EFAC' : '#FCA5A5'}`,
                          }}
                        >
                          {q.studentRawAnswer !== undefined &&
                          q.studentRawAnswer !== null &&
                          String(q.studentRawAnswer).trim() !== ''
                            ? String(q.studentRawAnswer)
                            : 'Chưa trả lời'}
                        </span>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: q.isCorrect ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {q.isCorrect ? '✓ Chính xác (+điểm)' : '✗ Chưa chính xác'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: UI_COLORS.textMuted }}>
                          Đáp án chấp nhận:
                        </span>
                        <strong style={{ color: '#16A34A', fontSize: '13.5px' }}>
                          {q.acceptedAnswers && q.acceptedAnswers.length > 0
                            ? q.acceptedAnswers.join(' hoặc ')
                            : q.correctChoiceLabel ||
                              (q.correctRawAnswer !== undefined ? String(q.correctRawAnswer) : '—')}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* 5. Dạng câu hỏi khác (Điền từ / Tự luận dự phòng nếu không thuộc 4 loại trên) */}
                  {q.type !== 'mcq4' &&
                    q.type !== 'tf' &&
                    q.type !== 'tf_group' &&
                    q.type !== 'short' &&
                    (!q.options || q.options.length === 0) && (
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '13px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600, color: UI_COLORS.textMuted }}>
                            Học sinh trả lời:
                          </span>
                          <strong
                            style={{ color: q.isCorrect ? '#16A34A' : '#DC2626' }}
                            dangerouslySetInnerHTML={{
                              __html:
                                q.studentRawAnswer !== undefined
                                  ? renderLatexInText(String(q.studentRawAnswer))
                                  : 'Chưa có câu trả lời',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600, color: UI_COLORS.textMuted }}>
                            Đáp án chính xác:
                          </span>
                          <strong
                            style={{ color: '#16A34A' }}
                            dangerouslySetInnerHTML={{
                              __html:
                                q.correctRawAnswer !== undefined
                                  ? renderLatexInText(String(q.correctRawAnswer))
                                  : '—',
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Lời giải thích / Ghi chú nếu có (Render KaTeX) */}
                  {q.explanation && (
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: '#1E40AF',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>💡 Lời giải:</span>
                      <div
                        style={{ flex: 1 }}
                        dangerouslySetInnerHTML={{
                          __html: renderLatexInText(q.explanation),
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Nút Đóng */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: `1px solid ${UI_COLORS.border}`,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            style={{
              minHeight: UI_SPACING.minTouchTarget,
              backgroundColor: '#F1F5F9',
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 600,
              padding: '8px 24px',
            }}
          >
            Đóng
          </Button>
        </div>
      </div>

      {/* Modal phóng to xem ảnh chi tiết */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            cursor: 'zoom-out',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{ position: 'relative', maxWidth: '95vw', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={previewImg}
              alt="Ảnh phóng to"
              style={{
                maxWidth: '92vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                backgroundColor: '#FFFFFF',
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
