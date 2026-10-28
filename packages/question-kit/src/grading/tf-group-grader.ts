import {
  DEFAULT_TF_GROUP_SCALE,
  type TfGroupAnswer,
  type TfGroupQuestion,
  type TfGroupScale,
} from '../schemas/tf-group.js';
import type { GradeResult, TfGroupGradeItemDetail } from './types.js';

/**
 * Chấm điểm câu hỏi TF_GROUP theo thang điểm bậc thang (Graduated Scoring)
 * Mặc định theo chuẩn Bộ Giáo dục & Đào tạo Việt Nam:
 * - Đúng 1 ý: 0.1 của điểm câu (10%)
 * - Đúng 2 ý: 0.25 của điểm câu (25%)
 * - Đúng 3 ý: 0.5 của điểm câu (50%)
 * - Đúng 4 ý: 1.0 của điểm câu (100%)
 * - Đúng 0 ý: 0.0 (0%)
 */
export function gradeTfGroup(
  question: TfGroupQuestion,
  answer?: TfGroupAnswer | null,
  overrideScale?: Partial<TfGroupScale> | undefined
): GradeResult {
  const appliedScale: TfGroupScale = {
    ...DEFAULT_TF_GROUP_SCALE,
    ...(question.scale ?? {}),
    ...(overrideScale ?? {}),
  };

  const selectedList = answer?.selected ?? [null, null, null, null];

  const itemDetails: [
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
  ] = [
    {
      index: 0,
      selected: selectedList[0],
      correct: question.items[0].correct,
      isCorrect: selectedList[0] !== null && selectedList[0] === question.items[0].correct,
    },
    {
      index: 1,
      selected: selectedList[1],
      correct: question.items[1].correct,
      isCorrect: selectedList[1] !== null && selectedList[1] === question.items[1].correct,
    },
    {
      index: 2,
      selected: selectedList[2],
      correct: question.items[2].correct,
      isCorrect: selectedList[2] !== null && selectedList[2] === question.items[2].correct,
    },
    {
      index: 3,
      selected: selectedList[3],
      correct: question.items[3].correct,
      isCorrect: selectedList[3] !== null && selectedList[3] === question.items[3].correct,
    },
  ];

  const correctCount = itemDetails.filter(item => item.isCorrect).length as 0 | 1 | 2 | 3 | 4;
  const ratio = appliedScale[correctCount] ?? 0.0;
  const rawPoints = question.points * ratio;
  const pointsEarned = Math.round(rawPoints * 10000) / 10000;

  const isCorrect = ratio === 1.0;
  const isPartial = ratio > 0 && ratio < 1.0;

  let feedback: string;
  if (!answer || selectedList.every(s => s === null)) {
    feedback = 'Học sinh chưa trả lời câu hỏi này.';
  } else if (isCorrect) {
    feedback = 'Xuất sắc! Đúng cả 4/4 ý (100% điểm).';
  } else if (correctCount > 0) {
    feedback = `Đúng ${correctCount}/4 ý (${Math.round(ratio * 100)}% điểm).`;
  } else {
    feedback = 'Chưa đúng ý nào (0% điểm).';
  }

  return {
    questionId: question.id,
    type: 'tf_group',
    pointsPossible: question.points,
    pointsEarned,
    ratio,
    isCorrect,
    isPartial,
    feedback,
    details: {
      type: 'tf_group',
      correctCount,
      totalItems: 4,
      appliedScale,
      items: itemDetails,
    },
  };
}
