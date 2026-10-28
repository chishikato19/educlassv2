import { describe, expect, it } from 'vitest';
import {
  CloseSessionResponseSchema,
  CreateSessionRequestSchema,
  ReleaseParticipantResponseSchema,
  ParticipantDtoSchema,
  SessionClosedPayloadSchema,
  SessionDtoSchema,
  SessionFsmEventTypeSchema,
  SessionParticipantsResponseSchema,
  SessionReportDtoSchema,
  SessionReportSnapshotSchema,
  SessionSettingsSchema,
  StudentJoinRequestSchema,
  StudentResumeRequestSchema,
  StudentSessionSummaryItemSchema,
  StudentSessionSummaryResponseSchema,
  SessionGamificationSummarySchema,
} from '../session.js';

describe('Session Protocol Schemas (packages/protocol)', () => {
  it('validates SessionFsmEventType enum', () => {
    expect(SessionFsmEventTypeSchema.parse('INITIATE_CLOSING')).toBe('INITIATE_CLOSING');
    expect(SessionFsmEventTypeSchema.parse('COMPLETE_CLOSING')).toBe('COMPLETE_CLOSING');
    expect(SessionFsmEventTypeSchema.parse('FORCE_CLOSE')).toBe('FORCE_CLOSE');

    expect(() => SessionFsmEventTypeSchema.parse('INVALID_EVENT')).toThrow();
  });

  it('validates SessionSettingsSchema with defaults', () => {
    const settings = SessionSettingsSchema.parse({});
    expect(settings.allowChat).toBe(true);
    expect(settings.allowLateJoin).toBe(true);

    const custom = SessionSettingsSchema.parse({
      maxParticipants: 45,
      allowChat: false,
      allowLateJoin: false,
    });
    expect(custom.maxParticipants).toBe(45);
    expect(custom.allowChat).toBe(false);
  });

  it('validates a complete SessionDtoSchema', () => {
    const sessionData = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      ownerId: 'teacher_1',
      classId: 'class_1',
      joinCode: '123456',
      status: 'open',
      identityMode: 'roster_or_guest',
      allowTeams: false,
      settings: {
        allowChat: true,
        allowLateJoin: true,
      },
      openedAt: 1700000000000,
    };

    const parsed = SessionDtoSchema.parse(sessionData);
    expect(parsed.id).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(parsed.joinCode).toBe('123456');
    expect(parsed.status).toBe('open');
  });

  it('rejects invalid join code length or invalid status', () => {
    expect(() =>
      SessionDtoSchema.parse({
        id: 'session_1',
        ownerId: 'teacher_1',
        joinCode: '123', // Must be 6 characters
        status: 'open',
        identityMode: 'roster_only',
        allowTeams: false,
        openedAt: 1700000000000,
      })
    ).toThrow();

    expect(() =>
      SessionDtoSchema.parse({
        id: 'session_1',
        ownerId: 'teacher_1',
        joinCode: '123456',
        status: 'archived', // Not in ['open', 'closing', 'closed']
        identityMode: 'roster_only',
        allowTeams: false,
        openedAt: 1700000000000,
      })
    ).toThrow();
  });

  describe('CreateSessionRequestSchema validation', () => {
    it('allows guest_only or roster_or_guest without classId', () => {
      const guestReq = CreateSessionRequestSchema.parse({
        identityMode: 'guest_only',
        allowTeams: true,
      });
      expect(guestReq.identityMode).toBe('guest_only');
      expect(guestReq.allowTeams).toBe(true);
      expect(guestReq.classId).toBeUndefined();

      const hybridReq = CreateSessionRequestSchema.parse({
        identityMode: 'roster_or_guest',
      });
      expect(hybridReq.identityMode).toBe('roster_or_guest');
      expect(hybridReq.allowTeams).toBe(false);
    });

    it('requires classId when identityMode is roster_only', () => {
      // Có classId -> Hợp lệ
      const validRosterReq = CreateSessionRequestSchema.parse({
        classId: 'class_123',
        identityMode: 'roster_only',
      });
      expect(validRosterReq.classId).toBe('class_123');

      // Thiếu classId -> Thất bại
      expect(() =>
        CreateSessionRequestSchema.parse({
          identityMode: 'roster_only',
        })
      ).toThrow(/roster_only/i);
    });
  });

  describe('StudentJoinRequestSchema validation', () => {
    it('accepts join request with studentId or nickname', () => {
      const rosterReq = StudentJoinRequestSchema.parse({
        joinCode: '123456',
        studentId: 'std_01',
        pin: '1234',
      });
      expect(rosterReq.studentId).toBe('std_01');
      expect(rosterReq.pin).toBe('1234');

      const guestReq = StudentJoinRequestSchema.parse({
        joinCode: '654321',
        nickname: 'Hero99',
        teamName: 'Đội 1',
      });
      expect(guestReq.nickname).toBe('Hero99');
      expect(guestReq.teamName).toBe('Đội 1');
    });

    it('rejects when both studentId and nickname are missing', () => {
      expect(() =>
        StudentJoinRequestSchema.parse({
          joinCode: '123456',
        })
      ).toThrow();
    });
  });

  describe('Reconnect & Participants Management Schemas (Task 1.7)', () => {
    it('validates StudentResumeRequestSchema', () => {
      const valid = StudentResumeRequestSchema.parse({ participantToken: 'valid_token_xyz' });
      expect(valid.participantToken).toBe('valid_token_xyz');

      expect(() => StudentResumeRequestSchema.parse({ participantToken: '' })).toThrow();
    });

    it('validates SessionParticipantsResponseSchema', () => {
      const payload = {
        sessionId: 'sess_1',
        onlineCount: 1,
        offlineCount: 1,
        totalCount: 2,
        participants: [
          {
            id: 'p_1',
            sessionId: 'sess_1',
            displayName: 'Nguyễn Văn An',
            identityLevel: 'account',
            status: 'online',
            joinedAt: 1700000000000,
          },
          {
            id: 'p_2',
            sessionId: 'sess_1',
            displayName: 'Trần Thị Bình',
            identityLevel: 'roster',
            status: 'offline',
            joinedAt: 1700000000000,
          },
        ],
      };

      const parsed = SessionParticipantsResponseSchema.parse(payload);
      expect(parsed.totalCount).toBe(2);
      expect(parsed.onlineCount).toBe(1);
      expect(parsed.participants[0]?.status).toBe('online');
    });

    it('validates ReleaseParticipantResponseSchema', () => {
      const valid = ReleaseParticipantResponseSchema.parse({
        success: true,
        participantId: 'p_1',
        displayName: 'Nguyễn Văn An',
        status: 'offline',
      });
      expect(valid.success).toBe(true);
      expect(valid.status).toBe('offline');
    });
  });

  describe('Session Closing, Report Snapshots & WS Notification Schemas (Task 1.8)', () => {
    it('validates SessionReportSnapshotSchema and SessionReportDtoSchema', () => {
      const snapshot = {
        sessionId: 'sess_1',
        sessionCode: '123456',
        className: '10A1',
        identityMode: 'roster_or_guest' as const,
        allowTeams: true,
        openedAt: 1700000000000,
        closedAt: 1700003600000,
        totalParticipants: 2,
        onlineParticipants: 0,
        offlineParticipants: 2,
        participants: [
          {
            id: 'p_1',
            studentId: 'st_1',
            displayName: 'Nguyễn Văn An',
            identityLevel: 'account' as const,
            teamName: 'Đội 1',
            joinedAt: 1700000100000,
            leftAt: 1700003600000,
          },
          {
            id: 'p_2',
            studentId: null,
            displayName: 'Khách Minh',
            identityLevel: 'guest' as const,
            teamName: null,
            joinedAt: 1700000200000,
            leftAt: 1700003600000,
          },
        ],
        teams: [
          {
            id: 'tm_1',
            name: 'Đội 1',
            memberCount: 1,
          },
        ],
      };

      const parsedSnapshot = SessionReportSnapshotSchema.parse(snapshot);
      expect(parsedSnapshot.totalParticipants).toBe(2);
      expect(parsedSnapshot.participants).toHaveLength(2);

      const reportDto = SessionReportDtoSchema.parse({
        id: 'rep_1',
        sessionId: 'sess_1',
        snapshot: parsedSnapshot,
        createdAt: 1700003600000,
      });
      expect(reportDto.id).toBe('rep_1');
      expect(reportDto.snapshot.sessionCode).toBe('123456');
    });

    it('validates CloseSessionResponseSchema', () => {
      const response = {
        session: {
          id: 'sess_1',
          ownerId: 'gv_1',
          joinCode: '123456',
          status: 'closed' as const,
          identityMode: 'roster_or_guest' as const,
          allowTeams: false,
          openedAt: 1700000000000,
          closedAt: 1700003600000,
        },
        report: {
          id: 'rep_1',
          sessionId: 'sess_1',
          snapshot: {
            sessionId: 'sess_1',
            sessionCode: '123456',
            identityMode: 'roster_or_guest' as const,
            allowTeams: false,
            openedAt: 1700000000000,
            closedAt: 1700003600000,
            totalParticipants: 0,
            onlineParticipants: 0,
            offlineParticipants: 0,
            participants: [],
            teams: [],
          },
          createdAt: 1700003600000,
        },
      };

      const parsed = CloseSessionResponseSchema.parse(response);
      expect(parsed.session.status).toBe('closed');
      expect(parsed.report.id).toBe('rep_1');
    });

    it('validates SessionClosedPayloadSchema for realtime notifications', () => {
      const payload = {
        sessionId: 'sess_1',
        reason: 'Hết tiết học',
        message: 'Phiên học đã kết thúc. Cảm ơn các em!',
        reportId: 'rep_1',
        closedAt: 1700003600000,
      };

      const parsed = SessionClosedPayloadSchema.parse(payload);
      expect(parsed.sessionId).toBe('sess_1');
      expect(parsed.closedAt).toBe(1700003600000);
    });

    it('validates SessionReportSnapshotSchema with scoreboard, difficultQuestions and summary', () => {
      const detailedSnapshot = {
        sessionId: 'sess_1',
        sessionCode: '123456',
        className: '10A1',
        identityMode: 'roster_or_guest' as const,
        allowTeams: false,
        openedAt: 1700000000000,
        closedAt: 1700003600000,
        totalParticipants: 2,
        onlineParticipants: 0,
        offlineParticipants: 2,
        participants: [
          {
            id: 'p1',
            displayName: 'Trần Văn An',
            identityLevel: 'account' as const,
            joinedAt: 1700000100000,
          },
        ],
        teams: [],
        scoreboard: [
          {
            participantId: 'p1',
            displayName: 'Trần Văn An',
            identityLevel: 'account' as const,
            score: 2850,
            correctCount: 3,
            totalQuestions: 3,
            accuracy: 100,
            expEarned: 45,
            rank: 1,
          },
        ],
        difficultQuestions: [
          {
            questionId: 'q2',
            activityId: 'quiz-live',
            activityName: 'Quiz Live',
            stem: 'Hàm số nào sau đây đồng biến?',
            totalAttempts: 25,
            correctCount: 8,
            incorrectCount: 17,
            errorRate: 68,
          },
        ],
        summary: {
          totalQuestions: 3,
          averageScore: 2400,
          averageAccuracy: 84.5,
          totalExpAwarded: 120,
        },
      };

      const parsed = SessionReportSnapshotSchema.parse(detailedSnapshot);
      expect(parsed.scoreboard).toHaveLength(1);
      expect(parsed.scoreboard[0]?.score).toBe(2850);
      expect(parsed.difficultQuestions).toHaveLength(1);
      expect(parsed.difficultQuestions[0]?.errorRate).toBe(68);
      expect(parsed.summary?.averageScore).toBe(2400);
    });

    it('validates StudentSessionSummaryItemSchema for account and guest students (Task 5.3)', () => {
      // 1. Học sinh có tài khoản (Account): lưu vĩnh viễn, không cần nhắc mã PIN
      const accountSummary = {
        sessionId: 'sess_1',
        sessionCode: '123456',
        participantId: 'part_acc_1',
        studentId: 'st_1',
        displayName: 'Nguyễn Văn Account',
        identityLevel: 'account' as const,
        teamName: 'Đội Sao Băng',
        totalExpEarned: 85,
        persistedExp: true,
        currentLevel: 4,
        totalAccumulatedExp: 385,
        leveledUp: true,
        expBreakdown: [
          { reason: 'Phát biểu đúng câu khó', exp: 20, ts: 1700001000000 },
          { reason: 'Hoàn thành Quiz Live', exp: 65, ts: 1700002000000 },
        ],
        newTitlesAwarded: [{ key: 'sieu_cap', name: 'Siêu cấp tiến bộ', iconKey: 'rocket' }],
        avatar: {
          base: 'fox' as const,
          color: '#FF6B6B',
          headwear: 'cap' as const,
          glasses: 'sunglasses' as const,
          outfit: 'hoodie' as const,
        },
        reminderPinLogin: false,
      };

      const parsedAccount = StudentSessionSummaryItemSchema.parse(accountSummary);
      expect(parsedAccount.totalExpEarned).toBe(85);
      expect(parsedAccount.persistedExp).toBe(true);
      expect(parsedAccount.reminderPinLogin).toBe(false);
      expect(parsedAccount.leveledUp).toBe(true);
      expect(parsedAccount.newTitlesAwarded).toHaveLength(1);

      // 2. Học sinh khách/roster: không lưu vĩnh viễn, bật cờ reminderPinLogin
      const guestSummary = {
        sessionId: 'sess_1',
        sessionCode: '123456',
        participantId: 'part_guest_1',
        displayName: 'Khách Minh',
        identityLevel: 'guest' as const,
        totalExpEarned: 40,
        persistedExp: false,
        expBreakdown: [{ reason: 'Điểm trả lời câu hỏi', exp: 40, ts: 1700001500000 }],
        reminderPinLogin: true,
      };

      const parsedGuest = StudentSessionSummaryItemSchema.parse(guestSummary);
      expect(parsedGuest.totalExpEarned).toBe(40);
      expect(parsedGuest.persistedExp).toBe(false);
      expect(parsedGuest.reminderPinLogin).toBe(true);
      expect(parsedGuest.currentLevel).toBe(1);

      const resp = StudentSessionSummaryResponseSchema.parse({ summary: parsedGuest });
      expect(resp.summary.displayName).toBe('Khách Minh');
    });

    it('validates SessionGamificationSummarySchema for teacher whole-class summary (Task 5.4)', () => {
      const gamificationData = {
        topPodium: [
          {
            rank: 1,
            participantId: 'p_1',
            displayName: 'Nguyễn Văn An',
            score: 2500,
            expEarned: 100,
            accuracy: 95,
            identityLevel: 'account' as const,
            teamName: 'Đội Rồng Lửa',
            avatar: {
              base: 'cat' as const,
              color: '#4F8CFF',
              headwear: 'crown' as const,
              glasses: 'none' as const,
              outfit: 'wizard_robe' as const,
            },
          },
          {
            rank: 2,
            participantId: 'p_2',
            displayName: 'Trần Thị Bình',
            score: 2100,
            expEarned: 70,
            accuracy: 85,
            identityLevel: 'roster' as const,
          },
        ],
        newTitlesAwarded: [
          {
            studentId: 'st_1',
            studentName: 'Nguyễn Văn An',
            titleKey: 'chien_than_quiz',
            titleName: 'Chiến thần trắc nghiệm',
            iconKey: 'trophy',
          },
        ],
        identityStats: {
          accountCount: 1,
          rosterCount: 1,
          guestCount: 0,
          persistedExpTotal: 100,
          unpersistedExpTotal: 70,
        },
        rosterNeedingPin: [
          {
            studentId: 'st_2',
            displayName: 'Trần Thị Bình',
            expEarned: 70,
          },
        ],
      };

      const parsed = SessionGamificationSummarySchema.parse(gamificationData);
      expect(parsed.topPodium).toHaveLength(2);
      expect(parsed.topPodium[0]?.displayName).toBe('Nguyễn Văn An');
      expect(parsed.newTitlesAwarded[0]?.titleName).toBe('Chiến thần trắc nghiệm');
      expect(parsed.identityStats.accountCount).toBe(1);
      expect(parsed.identityStats.unpersistedExpTotal).toBe(70);
      expect(parsed.rosterNeedingPin).toHaveLength(1);

      // Kiểm tra nhúng vào SessionReportSnapshotSchema
      const snapshotWithGamification = SessionReportSnapshotSchema.parse({
        sessionId: 'sess_10',
        sessionCode: '654321',
        identityMode: 'roster_or_guest' as const,
        allowTeams: true,
        openedAt: 1000,
        closedAt: 2000,
        totalParticipants: 2,
        onlineParticipants: 0,
        offlineParticipants: 2,
        participants: [],
        teams: [],
        gamification: parsed,
      });

      expect(snapshotWithGamification.gamification?.topPodium).toHaveLength(2);
      expect(snapshotWithGamification.gamification?.identityStats.persistedExpTotal).toBe(100);
    });
  });

  describe('Multi-Student Device Pairing Schemas (Task 1.1)', () => {
    it('validates SessionSettingsSchema with allowPairing and maxStudentsPerDevice', () => {
      const defaultSettings = SessionSettingsSchema.parse({});
      expect(defaultSettings.allowPairing).toBeUndefined();
      expect(defaultSettings.maxStudentsPerDevice).toBeUndefined();

      const customPairing = SessionSettingsSchema.parse({
        allowPairing: true,
        maxStudentsPerDevice: 3,
      });
      expect(customPairing.allowPairing).toBe(true);
      expect(customPairing.maxStudentsPerDevice).toBe(3);
    });

    it('validates StudentJoinRequestSchema with multiple studentIds and pins map', () => {
      const pairJoin = StudentJoinRequestSchema.parse({
        joinCode: '123456',
        studentIds: ['st_1', 'st_2'],
        pins: {
          st_1: '1234',
          st_2: '5678',
        },
      });
      expect(pairJoin.studentIds).toEqual(['st_1', 'st_2']);
      expect(pairJoin.pins).toEqual({ st_1: '1234', st_2: '5678' });
      expect(pairJoin.studentId).toBeUndefined();
    });

    it('validates ParticipantDtoSchema with studentIds array', () => {
      const participant = ParticipantDtoSchema.parse({
        id: 'part_pair_1',
        sessionId: 'sess_1',
        studentId: 'st_1',
        studentIds: ['st_1', 'st_2', 'st_3'],
        displayName: 'An & Bình & Cúc',
        identityLevel: 'account',
        status: 'online',
        joinedAt: Date.now(),
      });
      expect(participant.studentIds).toHaveLength(3);
      expect(participant.displayName).toBe('An & Bình & Cúc');
    });
  });
});
