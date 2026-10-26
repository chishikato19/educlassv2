export * from './rich-text.js';
export * from './schemas/mcq4.js';
export * from './schemas/tf.js';
export * from './schemas/tf-group.js';
export * from './schemas/short.js';
export * from './schemas/matching.js';
export * from './schemas/cloze-drag.js';
export * from './schemas/question.js';
export * from './grading/types.js';
export * from './grading/mcq4-grader.js';
export * from './grading/tf-grader.js';
export * from './grading/tf-group-grader.js';
export * from './grading/short-grader.js';
export * from './grading/matching-grader.js';
export * from './grading/cloze-drag-grader.js';
export * from './grading/grader.js';
export * from './sanitize.js';
export * from './katex/katex-renderer.js';
export * from './assets/image-processor.js';
export * from './word/omml-to-latex.js';
export * from './word/word-parser.js';
export * from './word/fixtures-generator.js';

import { ProtocolVersionSchema } from '@educlass/protocol';

export const QUESTION_KIT_VERSION = 1;

export function isValidQuestionKitProtocol(): boolean {
  return ProtocolVersionSchema.safeParse(QUESTION_KIT_VERSION).success;
}
