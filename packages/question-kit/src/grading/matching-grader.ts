import type { MatchingAnswer, MatchingQuestion } from '../schemas/matching.js';
import type { GradeResult, MatchingPairDetail } from './types.js';

/**
 * Chấm điểm câu hỏi ghép nối (Matching)
 * Cho phép tính điểm theo tỷ lệ số cặp ghép đúng (Partial credit).
 */
export function gradeMatching(
  question: MatchingQuestion,
  answer?: MatchingAnswer | null
): GradeResult {
  const studentPairs = answer?.pairs ?? {};
  const totalItems = question.leftItems.length;

  let correctCount = 0;
  const pairDetails: MatchingPairDetail[] = question.leftItems.map((item) => {
    const leftId = item.id;
    const correctRightId = question.correctPairs[leftId] ?? '';
    const selectedRightId = studentPairs[leftId] ?? null;
    const isPairCorrect = Boolean(
      selectedRightId && correctRightId && selectedRightId === correctRightId
    );

    if (isPairCorrect) {
      correctCount++;
    }

    return {
      leftId,
      selectedRightId,
      correctRightId,
      isCorrect: isPairCorrect,
    };
  });

  const ratio = totalItems > 0 ? Number((correctCount / totalItems).toFixed(4)) : 0;
  const pointsEarned = Number((question.points * ratio).toFixed(2));
  const isCorrect = ratio === 1.0;
  const isPartial = ratio > 0 && ratio < 1.0;

  let feedback: string;
  if (Object.keys(studentPairs).length === 0) {
    feedback = 'Học sinh chưa ghép nối cặp nào.';
  } else if (isCorrect) {
    feedback = `Ghép đúng toàn bộ ${correctCount}/${totalItems} cặp!`;
  } else if (isPartial) {
    feedback = `Ghép đúng ${correctCount}/${totalItems} cặp.`;
  } else {
    feedback = 'Chưa ghép đúng cặp nào.';
  }

  return {
    questionId: question.id,
    type: 'matching',
    pointsPossible: question.points,
    pointsEarned,
    ratio,
    isCorrect,
    isPartial,
    feedback,
    details: {
      type: 'matching',
      correctCount,
      totalItems,
      pairs: pairDetails,
    },
  };
}
