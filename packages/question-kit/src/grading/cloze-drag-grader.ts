import type { ClozeDragAnswer, ClozeDragQuestion } from '../schemas/cloze-drag.js';
import type { ClozeBlankDetail, GradeResult } from './types.js';

/**
 * Chấm điểm câu hỏi kéo thả từ vào ô trống (Cloze Drag-and-Drop)
 * So sánh không phân biệt hoa thường và khoảng trắng thừa ở 2 đầu.
 * Cho phép tính điểm theo tỷ lệ số ô trống điền đúng (Partial credit).
 */
export function gradeClozeDrag(
  question: ClozeDragQuestion,
  answer?: ClozeDragAnswer | null
): GradeResult {
  const studentFilled = answer?.filled ?? {};
  const totalBlanks = question.blanks.length;

  let correctCount = 0;
  const blankDetails: ClozeBlankDetail[] = question.blanks.map((blank) => {
    const blankId = blank.id;
    const correctWord = blank.answer.trim();
    const selectedWord = studentFilled[blankId] ? studentFilled[blankId]!.trim() : null;

    const isBlankCorrect = Boolean(
      selectedWord && selectedWord.toLowerCase() === correctWord.toLowerCase()
    );

    if (isBlankCorrect) {
      correctCount++;
    }

    return {
      blankId,
      selected: selectedWord,
      correct: correctWord,
      isCorrect: isBlankCorrect,
    };
  });

  const ratio = totalBlanks > 0 ? Number((correctCount / totalBlanks).toFixed(4)) : 0;
  const pointsEarned = Number((question.points * ratio).toFixed(2));
  const isCorrect = ratio === 1.0;
  const isPartial = ratio > 0 && ratio < 1.0;

  let feedback: string;
  if (Object.keys(studentFilled).length === 0) {
    feedback = 'Học sinh chưa điền từ vào ô trống nào.';
  } else if (isCorrect) {
    feedback = `Điền đúng toàn bộ ${correctCount}/${totalBlanks} vị trí!`;
  } else if (isPartial) {
    feedback = `Điền đúng ${correctCount}/${totalBlanks} vị trí.`;
  } else {
    feedback = 'Chưa điền đúng vị trí nào.';
  }

  return {
    questionId: question.id,
    type: 'cloze_drag',
    pointsPossible: question.points,
    pointsEarned,
    ratio,
    isCorrect,
    isPartial,
    feedback,
    details: {
      type: 'cloze_drag',
      correctCount,
      totalBlanks,
      blanks: blankDetails,
    },
  };
}
