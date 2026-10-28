import type { Question, StudentAnswer } from '../schemas/question.js';
import type { TfGroupScale } from '../schemas/tf-group.js';
import { gradeMcq4 } from './mcq4-grader.js';
import { gradeShort } from './short-grader.js';
import { gradeTfGroup } from './tf-group-grader.js';
import { gradeTf } from './tf-grader.js';
import { gradeMatching } from './matching-grader.js';
import { gradeClozeDrag } from './cloze-drag-grader.js';
import type { GradeResult } from './types.js';

export interface GradeOptions {
  /** Ghi đè thang điểm bậc thang cho câu tf_group */
  overrideTfGroupScale?: Partial<TfGroupScale> | undefined;
}

/**
 * Hàm chấm điểm tổng quát cho bất kỳ loại câu hỏi nào trong EduClass v2
 */
export function gradeQuestion(
  question: Question,
  answer?: StudentAnswer | null,
  options?: GradeOptions | undefined
): GradeResult {
  // Nếu học sinh gửi answer của loại câu hỏi khác hoặc sai questionId
  if (answer && (answer.type !== question.type || answer.questionId !== question.id)) {
    return {
      questionId: question.id,
      type: question.type,
      pointsPossible: question.points,
      pointsEarned: 0,
      ratio: 0.0,
      isCorrect: false,
      isPartial: false,
      feedback: 'Đáp án không khớp với mã hoặc loại câu hỏi.',
      details: {
        type: question.type,
        ...(question.type === 'mcq4' ? { selected: null, correct: question.correct } : {}),
        ...(question.type === 'tf' ? { selected: null, correct: question.correct } : {}),
        ...(question.type === 'tf_group'
          ? {
              correctCount: 0,
              totalItems: 4,
              appliedScale: question.scale ?? { 0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 },
              items: [
                { index: 0, selected: null, correct: question.items[0].correct, isCorrect: false },
                { index: 1, selected: null, correct: question.items[1].correct, isCorrect: false },
                { index: 2, selected: null, correct: question.items[2].correct, isCorrect: false },
                { index: 3, selected: null, correct: question.items[3].correct, isCorrect: false },
              ],
            }
          : {}),
        ...(question.type === 'short'
          ? { submittedText: '', matchedBy: 'none' as const, acceptedValues: question.accepted }
          : {}),
        ...(question.type === 'matching'
          ? {
              correctCount: 0,
              totalItems: question.leftItems.length,
              pairs: question.leftItems.map(item => ({
                leftId: item.id,
                selectedRightId: null,
                correctRightId: question.correctPairs[item.id] ?? '',
                isCorrect: false,
              })),
            }
          : {}),
        ...(question.type === 'cloze_drag'
          ? {
              correctCount: 0,
              totalBlanks: question.blanks.length,
              blanks: question.blanks.map(blank => ({
                blankId: blank.id,
                selected: null,
                correct: blank.answer,
                isCorrect: false,
              })),
            }
          : {}),
      } as GradeResult['details'],
    };
  }

  switch (question.type) {
    case 'mcq4':
      return gradeMcq4(question, answer?.type === 'mcq4' ? answer : null);

    case 'tf':
      return gradeTf(question, answer?.type === 'tf' ? answer : null);

    case 'tf_group':
      return gradeTfGroup(
        question,
        answer?.type === 'tf_group' ? answer : null,
        options?.overrideTfGroupScale
      );

    case 'short':
      return gradeShort(question, answer?.type === 'short' ? answer : null);

    case 'matching':
      return gradeMatching(question, answer?.type === 'matching' ? answer : null);

    case 'cloze_drag':
      return gradeClozeDrag(question, answer?.type === 'cloze_drag' ? answer : null);
  }
}
