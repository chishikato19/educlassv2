import { describe, expect, it } from 'vitest';
import {
  ActivityRunStatusSchema,
  IdentityLevelSchema,
  IdentityModeSchema,
  ParticipantStatusSchema,
  QuestionTypeSchema,
  SessionStatusSchema,
  UserRoleSchema,
} from '../enums.js';

describe('Protocol Enums', () => {
  describe('UserRoleSchema', () => {
    it('validates allowed user roles', () => {
      expect(UserRoleSchema.parse('admin')).toBe('admin');
      expect(UserRoleSchema.parse('teacher')).toBe('teacher');
    });

    it('rejects invalid roles', () => {
      expect(() => UserRoleSchema.parse('student')).toThrow();
      expect(() => UserRoleSchema.parse('guest')).toThrow();
    });
  });

  describe('SessionStatusSchema', () => {
    it('validates open, closing, closed', () => {
      expect(SessionStatusSchema.parse('open')).toBe('open');
      expect(SessionStatusSchema.parse('closing')).toBe('closing');
      expect(SessionStatusSchema.parse('closed')).toBe('closed');
    });

    it('rejects invalid session status', () => {
      expect(() => SessionStatusSchema.parse('pending')).toThrow();
      expect(() => SessionStatusSchema.parse('archived')).toThrow();
    });
  });

  describe('IdentityModeSchema', () => {
    it('validates roster_only, roster_or_guest, guest_only', () => {
      expect(IdentityModeSchema.parse('roster_only')).toBe('roster_only');
      expect(IdentityModeSchema.parse('roster_or_guest')).toBe('roster_or_guest');
      expect(IdentityModeSchema.parse('guest_only')).toBe('guest_only');
    });

    it('rejects invalid modes', () => {
      expect(() => IdentityModeSchema.parse('anonymous')).toThrow();
    });
  });

  describe('IdentityLevelSchema', () => {
    it('validates account, roster, guest', () => {
      expect(IdentityLevelSchema.parse('account')).toBe('account');
      expect(IdentityLevelSchema.parse('roster')).toBe('roster');
      expect(IdentityLevelSchema.parse('guest')).toBe('guest');
    });

    it('rejects invalid identity level', () => {
      expect(() => IdentityLevelSchema.parse('teacher')).toThrow();
    });
  });

  describe('ParticipantStatusSchema', () => {
    it('validates online and offline', () => {
      expect(ParticipantStatusSchema.parse('online')).toBe('online');
      expect(ParticipantStatusSchema.parse('offline')).toBe('offline');
    });

    it('rejects invalid participant status', () => {
      expect(() => ParticipantStatusSchema.parse('away')).toThrow();
    });
  });

  describe('ActivityRunStatusSchema', () => {
    it('validates ready, running, ended', () => {
      expect(ActivityRunStatusSchema.parse('ready')).toBe('ready');
      expect(ActivityRunStatusSchema.parse('running')).toBe('running');
      expect(ActivityRunStatusSchema.parse('ended')).toBe('ended');
    });

    it('rejects invalid activity run status', () => {
      expect(() => ActivityRunStatusSchema.parse('paused')).toThrow();
    });
  });

  describe('QuestionTypeSchema', () => {
    it('validates mcq4, tf, tf_group, short, matching, cloze_drag', () => {
      expect(QuestionTypeSchema.parse('mcq4')).toBe('mcq4');
      expect(QuestionTypeSchema.parse('tf')).toBe('tf');
      expect(QuestionTypeSchema.parse('tf_group')).toBe('tf_group');
      expect(QuestionTypeSchema.parse('short')).toBe('short');
      expect(QuestionTypeSchema.parse('matching')).toBe('matching');
      expect(QuestionTypeSchema.parse('cloze_drag')).toBe('cloze_drag');
    });

    it('rejects invalid question types', () => {
      expect(() => QuestionTypeSchema.parse('essay')).toThrow();
    });
  });
});
