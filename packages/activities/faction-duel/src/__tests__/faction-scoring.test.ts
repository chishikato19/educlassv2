import { describe, it, expect } from 'vitest';
import { checkAnswerCorrectness } from '../faction-scoring.js';
import type { FactionQuestion } from '../faction-schemas.js';

describe('checkAnswerCorrectness', () => {
  it('đánh giá đúng đáp án trắc nghiệm mcq4 theo option id', () => {
    const q: FactionQuestion = {
      id: 'q1',
      stem: { text: 'Thủ đô của Việt Nam là gì?' },
      type: 'mcq4',
      options: [
        { id: 'opt-a', text: 'Hà Nội', isCorrect: true },
        { id: 'opt-b', text: 'TP.HCM', isCorrect: false },
      ],
    };

    expect(checkAnswerCorrectness(q, 'opt-a')).toBe(true);
    expect(checkAnswerCorrectness(q, 'opt-b')).toBe(false);
  });

  it('đánh giá đúng đáp án đúng/sai tf', () => {
    const q: FactionQuestion = {
      id: 'q2',
      stem: { text: 'Mặt trời mọc ở hướng đông?' },
      type: 'tf',
      correctAnswer: true,
    };

    expect(checkAnswerCorrectness(q, true)).toBe(true);
    expect(checkAnswerCorrectness(q, false)).toBe(false);
    expect(checkAnswerCorrectness(q, 'true')).toBe(true);
  });

  it('đánh giá đúng đáp án trả lời ngắn short', () => {
    const q: FactionQuestion = {
      id: 'q3',
      stem: { text: 'Điền tên tác giả Truyện Kiều' },
      type: 'short',
      correctAnswer: 'Nguyễn Du',
    };

    expect(checkAnswerCorrectness(q, 'Nguyễn Du')).toBe(true);
    expect(checkAnswerCorrectness(q, 'nguyễn du')).toBe(true);
    expect(checkAnswerCorrectness(q, 'Hồ Chí Minh')).toBe(false);
  });
});
