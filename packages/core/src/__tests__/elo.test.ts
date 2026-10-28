import { describe, expect, it } from 'vitest';
import {
  balanceNTeamsByElo,
  balanceTwoTeamsByElo,
  calculateIndividualGameElo,
  calculateTeamMatchElo,
  getExpectedScore,
} from '../elo/elo.js';

describe('Elo Engine & Matchmaking', () => {
  describe('getExpectedScore', () => {
    it('returns 0.5 when both players have equal Elo', () => {
      expect(getExpectedScore(1000, 1000)).toBeCloseTo(0.5, 4);
    });

    it('returns higher expected score for higher Elo player', () => {
      const expHigher = getExpectedScore(1200, 1000);
      const expLower = getExpectedScore(1000, 1200);
      expect(expHigher).toBeGreaterThan(0.7);
      expect(expLower).toBeLessThan(0.3);
      expect(expHigher + expLower).toBeCloseTo(1.0, 4);
    });
  });

  describe('calculateIndividualGameElo', () => {
    it('increases Elo when performance is above expected', () => {
      // Học sinh 1000 Elo làm đúng 90% khi trung bình lớp 50%
      const { newElo, delta } = calculateIndividualGameElo(1000, 0.9, 0.5);
      expect(delta).toBeGreaterThan(0);
      expect(newElo).toBe(1000 + delta);
    });

    it('decreases Elo when performance is below expected', () => {
      // Học sinh 1200 Elo chỉ làm đúng 20%
      const { newElo, delta } = calculateIndividualGameElo(1200, 0.2, 0.5);
      expect(delta).toBeLessThan(0);
      expect(newElo).toBeLessThan(1200);
    });
  });

  describe('calculateTeamMatchElo', () => {
    it('updates team members based on match outcome and individual contribution', () => {
      const teamBlue = [
        { id: 'b1', elo: 1100, contribution: 25 }, // MVP
        { id: 'b2', elo: 1000, contribution: 5 }, // Đóng góp ít
      ];
      const teamRed = [
        { id: 'r1', elo: 1050, contribution: 15 },
        { id: 'r2', elo: 950, contribution: 10 },
      ];

      const results = calculateTeamMatchElo(teamBlue, teamRed, 'blue');
      expect(results['b1']?.delta).toBeGreaterThan(0);
      expect(results['b2']?.delta).toBeGreaterThan(0);
      // MVP b1 nhận nhiều hơn b2
      expect(results['b1']!.delta).toBeGreaterThan(results['b2']!.delta);

      expect(results['r1']?.delta).toBeLessThan(0);
      expect(results['r2']?.delta).toBeLessThan(0);
    });
  });

  describe('balanceTwoTeamsByElo', () => {
    it('balances two teams with close average Elo', () => {
      const students = [
        { id: 's1', displayName: 'Học sinh Giỏi 1', elo: 1400 },
        { id: 's2', displayName: 'Học sinh Giỏi 2', elo: 1350 },
        { id: 's3', displayName: 'Học sinh Khá 1', elo: 1150 },
        { id: 's4', displayName: 'Học sinh Khá 2', elo: 1100 },
        { id: 's5', displayName: 'Học sinh TB 1', elo: 950 },
        { id: 's6', displayName: 'Học sinh TB 2', elo: 900 },
      ];

      const balanced = balanceTwoTeamsByElo(students);
      expect(balanced.blue).toHaveLength(3);
      expect(balanced.red).toHaveLength(3);
      // Hai phe phải có trình độ sàn sàn nhau
      expect(balanced.deltaElo).toBeLessThanOrEqual(50);
    });

    it('handles empty or single candidate cleanly', () => {
      const empty = balanceTwoTeamsByElo([]);
      expect(empty.blue).toHaveLength(0);
      expect(empty.red).toHaveLength(0);
    });
  });

  describe('balanceNTeamsByElo', () => {
    it('distributes students across N groups with balanced Elo', () => {
      const students = [
        { id: 's1', displayName: 'HS 1', elo: 1300 },
        { id: 's2', displayName: 'HS 2', elo: 1250 },
        { id: 's3', displayName: 'HS 3', elo: 1200 },
        { id: 's4', displayName: 'HS 4', elo: 1100 },
        { id: 's5', displayName: 'HS 5', elo: 1050 },
        { id: 's6', displayName: 'HS 6', elo: 1000 },
      ];

      const groups = balanceNTeamsByElo(students, 3);
      expect(groups).toHaveLength(3);
      groups.forEach(g => {
        expect(g.members).toHaveLength(2);
      });
    });
  });
});
