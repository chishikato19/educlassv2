import type { Mcq4Answer, Mcq4Question } from '../schemas/mcq4.js';
import type { GradeResult } from './types.js';

/**
 * Chấm điểm câu hỏi MCQ4 (Trắc nghiệm 4 lựa chọn, chọn 1)
 */
export function gradeMcq4(
  question: Mcq4Question,
  answer?: Mcq4Answer | null
): GradeResult {
  const selected = answer?.selected ?? null;
  const isCorrect = selected !== null && selected === question.correct;
  const ratio = isCorrect ? 1.0 : 0.0;
  const pointsEarned = isCorrect ? question.points : 0;

  let feedback: string;
  if (selected === null) {
    feedback = 'Học sinh chưa trả lời câu hỏi này.';
  } else if (isCorrect) {
    feedback = 'Chính xác!';
  } else {
    feedback = 'Chưa chính xác.';
  }

  return {
    questionId: question.id,
    type: 'mcq4',
    pointsPossible: question.points,
    pointsEarned,
    ratio,
    isCorrect,
    isPartial: false,
    feedback,
    details: {
      type: 'mcq4',
      selected,
      correct: question.correct,
    },
  };
}
