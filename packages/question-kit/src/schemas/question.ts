import { z } from 'zod';
import {
  Mcq4AnswerSchema,
  Mcq4PublicQuestionSchema,
  Mcq4QuestionSchema,
  type Mcq4Answer,
  type Mcq4PublicQuestion,
  type Mcq4Question,
} from './mcq4.js';
import {
  ShortAnswerSchema,
  ShortPublicQuestionSchema,
  ShortQuestionSchema,
  type ShortAnswer,
  type ShortPublicQuestion,
  type ShortQuestion,
} from './short.js';
import {
  TfGroupAnswerSchema,
  TfGroupPublicQuestionSchema,
  TfGroupQuestionSchema,
  type TfGroupAnswer,
  type TfGroupPublicQuestion,
  type TfGroupQuestion,
} from './tf-group.js';
import {
  TfAnswerSchema,
  TfPublicQuestionSchema,
  TfQuestionSchema,
  type TfAnswer,
  type TfPublicQuestion,
  type TfQuestion,
} from './tf.js';

import {
  MatchingAnswerSchema,
  MatchingPublicQuestionSchema,
  MatchingQuestionSchema,
  type MatchingAnswer,
  type MatchingPublicQuestion,
  type MatchingQuestion,
} from './matching.js';
import {
  ClozeDragAnswerSchema,
  ClozeDragPublicQuestionSchema,
  ClozeDragQuestionSchema,
  type ClozeDragAnswer,
  type ClozeDragPublicQuestion,
  type ClozeDragQuestion,
} from './cloze-drag.js';

/**
 * Union phân biệt đầy đủ cho câu hỏi (bao gồm đáp án đúng)
 */
export const QuestionSchema = z.discriminatedUnion('type', [
  Mcq4QuestionSchema,
  TfQuestionSchema,
  TfGroupQuestionSchema,
  ShortQuestionSchema,
  MatchingQuestionSchema,
  ClozeDragQuestionSchema,
]);
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = Question['type'];

/**
 * Union phân biệt cho câu hỏi công khai dành cho học sinh (đã loại bỏ đáp án đúng)
 */
export const QuestionPublicSchema = z.discriminatedUnion('type', [
  Mcq4PublicQuestionSchema,
  TfPublicQuestionSchema,
  TfGroupPublicQuestionSchema,
  ShortPublicQuestionSchema,
  MatchingPublicQuestionSchema,
  ClozeDragPublicQuestionSchema,
]);
export type QuestionPublic = z.infer<typeof QuestionPublicSchema>;

/**
 * Union phân biệt cho câu trả lời của học sinh
 */
export const StudentAnswerSchema = z.discriminatedUnion('type', [
  Mcq4AnswerSchema,
  TfAnswerSchema,
  TfGroupAnswerSchema,
  ShortAnswerSchema,
  MatchingAnswerSchema,
  ClozeDragAnswerSchema,
]);
export type StudentAnswer = z.infer<typeof StudentAnswerSchema>;

export type {
  Mcq4Question,
  Mcq4PublicQuestion,
  Mcq4Answer,
  TfQuestion,
  TfPublicQuestion,
  TfAnswer,
  TfGroupQuestion,
  TfGroupPublicQuestion,
  TfGroupAnswer,
  ShortQuestion,
  ShortPublicQuestion,
  ShortAnswer,
  MatchingQuestion,
  MatchingPublicQuestion,
  MatchingAnswer,
  ClozeDragQuestion,
  ClozeDragPublicQuestion,
  ClozeDragAnswer,
};
