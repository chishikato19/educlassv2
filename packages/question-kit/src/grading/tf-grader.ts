import type { TfAnswer, TfQuestion } from '../schemas/tf.js';
import type { GradeResult } from './types.js';

/**
 * Chấm điểm câu hỏi TF (Đúng / Sai đơn lẻ)
 */
export function gradeTf(question: TfQuestion, answer?: TfAnswer | null): GradeResult {
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
    type: 'tf',
    pointsPossible: question.points,
    pointsEarned,
    ratio,
    isCorrect,
    isPartial: false,
    feedback,
    details: {
      type: 'tf',
      selected,
      correct: question.correct,
    },
  };
}
