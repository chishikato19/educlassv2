import { describe, expect, it } from 'vitest';
import {
  ArcadeDuelConfigSchema,
  DuelModeSchema,
  DuelQuestionSchema,
} from '../arcade-duel-schemas.js';
import {
  initPlayerState,
  shuffleQuestionOptions,
} from '../arcade-duel-logic.js';

describe('Activity: Arcade Duel', () => {
  const sampleQuestion = {
    id: 'q1',
    stem: 'Thủ đô của Việt Nam là gì?',
    options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
    correctAnswer: 0,
    points: 100,
  };

  describe('Schemas', () => {
    it('validates DuelModeSchema', () => {
      expect(DuelModeSchema.parse('sync_turn')).toBe('sync_turn');
      expect(DuelModeSchema.parse('speed_race')).toBe('speed_race');
      expect(() => DuelModeSchema.parse('invalid_mode')).toThrow();
    });

    it('validates DuelQuestionSchema', () => {
      const parsed = DuelQuestionSchema.parse(sampleQuestion);
      expect(parsed.id).toBe('q1');
      expect(parsed.options).toHaveLength(4);
      expect(parsed.correctAnswer).toBe(0);
    });

    it('validates ArcadeDuelConfigSchema', () => {
      const validConfig = {
        title: 'Trận đấu Đối Kháng Hè',
        mode: 'sync_turn' as const,
        questions: [sampleQuestion],
        timeLimitPerQuestion: 15,
        totalTimeLimit: 90,
      };

      const parsed = ArcadeDuelConfigSchema.parse(validConfig);
      expect(parsed.title).toBe('Trận đấu Đối Kháng Hè');
      expect(parsed.mode).toBe('sync_turn');
      expect(parsed.questions).toHaveLength(1);
    });
  });

  describe('Logic', () => {
    it('preserves the correct answer when shuffling question options', () => {
      const shuffled = shuffleQuestionOptions(sampleQuestion);
      expect(shuffled.options).toHaveLength(4);
      expect(shuffled.options[shuffled.correctIndex]).toBe('Hà Nội');
    });

    it('initializes player duel state correctly', () => {
      const bluePlayer = initPlayerState('blue', 'Đội Xanh', sampleQuestion, false, 3);
      expect(bluePlayer.teamId).toBe('blue');
      expect(bluePlayer.teamName).toBe('Đội Xanh');
      expect(bluePlayer.score).toBe(0);
      expect(bluePlayer.currentQuestionIndex).toBe(0);
      expect(bluePlayer.streak).toBe(0);
      expect(bluePlayer.currentOptions).toEqual(sampleQuestion.options);
      expect(bluePlayer.currentCorrectIndex).toBe(0);
      expect(bluePlayer.inventory.maxCapacity).toBe(3);
    });
  });
});
