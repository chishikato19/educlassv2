import type { ShortAnswer, ShortQuestion } from '../schemas/short.js';
import type { GradeResult, ShortGradeDetails } from './types.js';

/**
 * Chấm điểm câu hỏi SHORT (Trả lời ngắn / Tự luận ngắn / Điền số)
 * Hỗ trợ:
 * - So khớp số học kèm dung sai sai phân (hỗ trợ cả 3.14 và 3,14 kiểu Việt Nam)
 * - So khớp chuỗi ký tự theo danh sách accepted (hỗ trợ tùy chọn caseSensitive, trimWhitespace)
 */
export function gradeShort(question: ShortQuestion, answer?: ShortAnswer | null): GradeResult {
  const rawText = answer?.text ?? '';
  const shouldTrim = question.trimWhitespace ?? true;
  const submitted = shouldTrim ? rawText.trim() : rawText;

  if (!answer || submitted.length === 0) {
    return {
      questionId: question.id,
      type: 'short',
      pointsPossible: question.points,
      pointsEarned: 0,
      ratio: 0.0,
      isCorrect: false,
      isPartial: false,
      feedback: 'Học sinh chưa trả lời câu hỏi này.',
      details: {
        type: 'short',
        submittedText: submitted,
        matchedBy: 'none',
        acceptedValues: question.accepted,
      },
    };
  }

  // 1. Kiểm tra theo quy tắc số học nếu có numeric rule
  if (question.numeric) {
    const normalizedNumberStr = submitted.replace(',', '.');
    const parsed = Number(normalizedNumberStr);

    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const tolerance = question.numeric.tolerance ?? 0;
      const diff = Math.abs(parsed - question.numeric.value);

      if (diff <= tolerance) {
        const details: ShortGradeDetails = {
          type: 'short',
          submittedText: submitted,
          matchedBy: 'numeric',
          acceptedValues: question.accepted,
          numericMatched: {
            expected: question.numeric.value,
            tolerance,
            actual: parsed,
            diff,
          },
        };

        return {
          questionId: question.id,
          type: 'short',
          pointsPossible: question.points,
          pointsEarned: question.points,
          ratio: 1.0,
          isCorrect: true,
          isPartial: false,
          feedback: 'Chính xác! Đáp số khớp với giá trị số quy định.',
          details,
        };
      }
    }
  }

  // 2. Kiểm tra theo danh sách các đáp án chữ được chấp nhận (accepted)
  const isCaseSensitive = question.caseSensitive ?? false;
  const compareSubmitted = isCaseSensitive ? submitted : submitted.toLowerCase();

  const matched = question.accepted.some(acc => {
    const cleanAcc = shouldTrim ? acc.trim() : acc;
    const compareAcc = isCaseSensitive ? cleanAcc : cleanAcc.toLowerCase();
    return compareSubmitted === compareAcc;
  });

  if (matched) {
    return {
      questionId: question.id,
      type: 'short',
      pointsPossible: question.points,
      pointsEarned: question.points,
      ratio: 1.0,
      isCorrect: true,
      isPartial: false,
      feedback: 'Chính xác!',
      details: {
        type: 'short',
        submittedText: submitted,
        matchedBy: 'text',
        acceptedValues: question.accepted,
      },
    };
  }

  // Không khớp cả số và chữ
  return {
    questionId: question.id,
    type: 'short',
    pointsPossible: question.points,
    pointsEarned: 0,
    ratio: 0.0,
    isCorrect: false,
    isPartial: false,
    feedback: 'Chưa chính xác.',
    details: {
      type: 'short',
      submittedText: submitted,
      matchedBy: 'none',
      acceptedValues: question.accepted,
    },
  };
}
