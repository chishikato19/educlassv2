import { describe, expect, it } from 'vitest';
import { QUESTION_KIT_VERSION, isValidQuestionKitProtocol } from './index.js';

describe('question-kit module', () => {
  it('has question kit version 1', () => {
    expect(QUESTION_KIT_VERSION).toBe(1);
  });

  it('validates protocol', () => {
    expect(isValidQuestionKitProtocol()).toBe(true);
  });
});
