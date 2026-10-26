import type { QuestionType } from '@educlass/protocol';
import type { TfGroupScale } from '../schemas/tf-group.js';

export interface Mcq4GradeDetails {
  type: 'mcq4';
  selected: number | null;
  correct: number;
}

export interface TfGradeDetails {
  type: 'tf';
  selected: boolean | null;
  correct: boolean;
}

export interface TfGroupGradeItemDetail {
  index: number;
  selected: boolean | null;
  correct: boolean;
  isCorrect: boolean;
}

export interface TfGroupGradeDetails {
  type: 'tf_group';
  correctCount: number;
  totalItems: 4;
  appliedScale: TfGroupScale;
  items: [
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
    TfGroupGradeItemDetail,
  ];
}

export interface ShortGradeDetails {
  type: 'short';
  submittedText: string;
  matchedBy: 'numeric' | 'text' | 'none';
  acceptedValues: string[];
  numericMatched?:
    | {
        expected: number;
        tolerance: number;
        actual: number;
        diff: number;
      }
    | undefined;
}

export interface MatchingPairDetail {
  leftId: string;
  selectedRightId: string | null;
  correctRightId: string;
  isCorrect: boolean;
}

export interface MatchingGradeDetails {
  type: 'matching';
  correctCount: number;
  totalItems: number;
  pairs: MatchingPairDetail[];
}

export interface ClozeBlankDetail {
  blankId: string;
  selected: string | null;
  correct: string;
  isCorrect: boolean;
}

export interface ClozeDragGradeDetails {
  type: 'cloze_drag';
  correctCount: number;
  totalBlanks: number;
  blanks: ClozeBlankDetail[];
}

export type GradeDetails =
  | Mcq4GradeDetails
  | TfGradeDetails
  | TfGroupGradeDetails
  | ShortGradeDetails
  | MatchingGradeDetails
  | ClozeDragGradeDetails;

/**
 * Kết quả chấm điểm tiêu chuẩn cho một câu hỏi
 */
export interface GradeResult {
  questionId: string;
  type: QuestionType;
  /** Điểm tối đa của câu hỏi */
  pointsPossible: number;
  /** Điểm thực tế đạt được */
  pointsEarned: number;
  /** Tỷ lệ điểm đạt được (từ 0.0 đến 1.0) */
  ratio: number;
  /** Đúng hoàn toàn 100% (ratio === 1.0) */
  isCorrect: boolean;
  /** Đúng một phần (0 < ratio < 1.0, vd câu tf_group) */
  isPartial: boolean;
  /** Nhận xét / giải thích ngắn gọn */
  feedback?: string | undefined;
  /** Chi tiết chi tiết từng ý / đáp án */
  details: GradeDetails;
}
