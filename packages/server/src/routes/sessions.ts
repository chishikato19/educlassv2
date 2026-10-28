import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import type { ActivityEngine } from '../activity/engine.js';
import { cleanupSessionObjectCameraFiles } from './object-camera.js';
import {
  generateJoinCode,
  isNameTaken,
  resolveIdentityLevel,
  rewards,
  transitionSession,
  type SessionFsmState,
} from '@educlass/core';
import {
  generateId,
  type ActivityResultSelect,
  type ActivityRunSelect,
  type ActivityRunRepository,
  type ClassRepository,
  type ExamRecordRepository,
  type ExamRepository,
  ParticipantRepository,
  type ParticipantSelect,
  type RewardLogSelect,
  type RewardRepository,
  type SessionReportRepository,
  type SessionReportSelect,
  type SessionRepository,
  type SessionSelect,
  type StudentRepository,
  type TeamRepository,
  type TitleRepository,
  type UserRepository,
} from '@educlass/db';
import {
  ActiveSessionsListResponseSchema,
  CloseSessionRequestSchema,
  CloseSessionResponseSchema,
  createEnvelope,
  CreateSessionRequestSchema,
  formatProtocolError,
  GrantRewardRequestSchema,
  GrantRewardResponseSchema,
  JoinCodeLookupResponseSchema,
  type ParticipantDto,
  ReleaseParticipantResponseSchema,
  type RewardLogDto,
  SessionDetailResponseSchema,
  type SessionDto,
  SessionParticipantsResponseSchema,
  type SessionReportDto,
  SessionReportResponseSchema,
  type SessionReportSnapshot,
  type SessionReportListItem,
  SessionReportsListResponseSchema,
  type QuizSummaryReport,
  QuizSummaryReportResponseSchema,
  QuizRunsListResponseSchema,
  SessionRosterResponseSchema,
  type SessionSettings,
  SessionSettingsSchema,
  StudentJoinRequestSchema,
  StudentJoinResponseSchema,
  StudentResumeRequestSchema,
  type StudentSessionSummaryItem,
  StudentSessionSummaryResponseSchema,
  type AvatarConfig,
} from '@educlass/protocol';
import type { AuthService } from '../auth/auth-service.js';
import type { PasswordHasher } from '../auth/password-hasher.js';
import { createAuthenticateHook } from '../auth/plugin.js';
import type { TokenService } from '../auth/token-service.js';
import { ExcelService } from '../services/excel-service.js';
import type { QrService } from '../services/qr-service.js';
import type { BeaconService } from '../services/beacon-service.js';
import { generateSessionAnalytics } from '../services/session-report-generator.js';
import type { WsGatewayManager } from '../ws/gateway.js';

export interface SessionsRoutesOptions {
  authService: AuthService;
  sessionRepo: SessionRepository;
  sessionReportRepo?: SessionReportRepository | undefined;
  rewardRepo?: RewardRepository | undefined;
  classRepo: ClassRepository;
  userRepo: UserRepository;
  studentRepo: StudentRepository;
  participantRepo: ParticipantRepository;
  teamRepo: TeamRepository;
  tokenService: TokenService;
  passwordHasher: PasswordHasher;
  qrService: QrService;
  wsManager?: WsGatewayManager | undefined;
  activityRunRepo?: ActivityRunRepository | undefined;
  excelService?: ExcelService | undefined;
  titleRepo?: TitleRepository | undefined;
  examRepo?: ExamRepository | undefined;
  examRecordRepo?: ExamRecordRepository | undefined;
  activityEngine?: ActivityEngine | undefined;
  beaconService?: BeaconService | undefined;
}

export function toParticipantDto(
  p: ParticipantSelect,
  teamName?: string | null,
  elo?: number
): ParticipantDto {
  const dto: ParticipantDto = {
    id: p.id,
    sessionId: p.sessionId,
    studentId: p.studentId ?? null,
    studentIds: ParticipantRepository.getStudentIds(p),
    displayName: p.displayName,
    identityLevel: p.identityLevel as 'account' | 'roster' | 'guest',
    teamId: p.teamId ?? null,
    teamName: teamName ?? null,
    status: p.status as 'online' | 'offline',
    joinedAt: p.joinedAt,
  };
  if (typeof elo === 'number') {
    dto.elo = elo;
  }
  return dto;
}

/**
 * Chuyển đổi bản ghi DB sang SessionDto chuẩn
 */
export function toSessionDto(s: SessionSelect): SessionDto {
  let settings: SessionSettings | undefined;
  if (s.settingsJson) {
    try {
      const parsed = JSON.parse(s.settingsJson) as unknown;
      const res = SessionSettingsSchema.safeParse(parsed);
      if (res.success) {
        settings = res.data;
      }
    } catch {
      settings = undefined;
    }
  }

  const dto: SessionDto = {
    id: s.id,
    ownerId: s.ownerId,
    joinCode: s.joinCode,
    status: s.status as 'open' | 'closing' | 'closed',
    identityMode: s.identityMode as 'roster_only' | 'roster_or_guest' | 'guest_only',
    allowTeams: s.allowTeams,
    allowPairing: settings?.allowPairing ?? false,
    maxStudentsPerDevice: settings?.maxStudentsPerDevice ?? 2,
    openedAt: s.openedAt,
  };

  if (s.classId) dto.classId = s.classId;
  if (s.closedAt) dto.closedAt = s.closedAt;
  if (settings) dto.settings = settings;

  return dto;
}

/**
 * Chuyển đổi bản ghi CSDL sang SessionReportDto
 */
export function toSessionReportDto(r: SessionReportSelect): SessionReportDto {
  const snapshot = JSON.parse(r.snapshotJson) as SessionReportSnapshot;
  return {
    id: r.id,
    sessionId: r.sessionId,
    snapshot,
    createdAt: r.createdAt,
  };
}

/**
 * Trích xuất và định dạng bảng điểm tổng kết cho một lượt thi Quizizz
 */
export function buildQuizSummaryFromRun(
  run: ActivityRunSelect,
  results: ActivityResultSelect[],
  sessionCode?: string,
  className?: string | null,
  runIndex?: number
): QuizSummaryReport {
  let quizTitle = 'Quizizz Live';
  let totalQuestions = 0;
  try {
    const cfg = JSON.parse(run.configJson) as { title?: string; questions?: unknown[] };
    if (cfg.title) quizTitle = cfg.title;
    if (Array.isArray(cfg.questions)) totalQuestions = cfg.questions.length;
  } catch {
    // ignore
  }

  const scoreboard: Array<{
    participantId: string;
    displayName: string;
    identityLevel: 'account' | 'roster' | 'guest';
    score: number;
    correctCount: number;
    totalQuestions: number;
    accuracy: number;
    expEarned: number;
    rank: number;
    teamName?: string | null;
  }> = [];

  for (const res of results) {
    try {
      const item = JSON.parse(res.scoreJson) as {
        displayName?: string;
        score?: number;
        correctCount?: number;
        totalQuestions?: number;
        accuracy?: number;
        rank?: number;
        identityLevel?: string;
        teamName?: string;
        expEarned?: number;
      };

      const sCount = Number(item.totalQuestions || totalQuestions);
      const cCount = Number(item.correctCount || 0);
      const acc =
        typeof item.accuracy === 'number'
          ? item.accuracy
          : sCount > 0
            ? Math.round((cCount / sCount) * 100)
            : 0;

      scoreboard.push({
        participantId: res.participantId,
        displayName: item.displayName || 'Học sinh',
        identityLevel: (item.identityLevel as 'account' | 'roster' | 'guest') || 'roster',
        teamName: item.teamName ?? null,
        score: Number(item.score || 0),
        correctCount: cCount,
        totalQuestions: sCount,
        accuracy: acc,
        expEarned: Number(item.expEarned || 0),
        rank: typeof res.rank === 'number' ? res.rank : 1,
      });
    } catch {
      // ignore
    }
  }

  scoreboard.sort((a, b) => b.score - a.score || b.correctCount - a.correctCount);
  scoreboard.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const totalParticipants = scoreboard.length;
  const averageScore =
    totalParticipants > 0
      ? Math.round(scoreboard.reduce((acc, s) => acc + s.score, 0) / totalParticipants)
      : 0;
  const averageAccuracy =
    totalParticipants > 0
      ? Math.round(scoreboard.reduce((acc, s) => acc + s.accuracy, 0) / totalParticipants)
      : 0;

  return {
    sessionId: run.sessionId,
    sessionCode,
    className: className ?? null,
    runId: run.id,
    runIndex,
    title: quizTitle,
    totalQuestions,
    totalParticipants,
    averageScore,
    averageAccuracy,
    scoreboard,
    difficultQuestions: [],
    startedAt: run.startedAt ?? undefined,
    endedAt: run.endedAt ?? undefined,
    isActive: run.status === 'running',
  };
}

/**
 * Chuyển đổi bản ghi CSDL sang RewardLogDto
 */
export function toRewardLogDto(r: RewardLogSelect): RewardLogDto {
  return {
    id: r.id,
    sessionId: r.sessionId,
    participantId: r.participantId,
    studentId: r.studentId ?? null,
    exp: r.exp,
    reason: r.reason,
    persisted: Boolean(r.persisted),
    ts: r.ts,
  };
}

export const sessionsRoutes: FastifyPluginAsync<SessionsRoutesOptions> = async (
  fastify,
  options
) => {
  const {
    authService,
    sessionRepo,
    sessionReportRepo,
    rewardRepo,
    classRepo,
    userRepo,
    studentRepo,
    participantRepo,
    teamRepo,
    tokenService,
    passwordHasher,
    qrService,
    wsManager,
    activityRunRepo,
    excelService,
    titleRepo,
    examRepo,
    examRecordRepo,
    activityEngine,
    beaconService,
  } = options;
  const authenticate = createAuthenticateHook(authService);

  function getLanIpAddress(): string {
    const interfaces = os.networkInterfaces();
    const candidates: string[] = [];

    for (const netList of Object.values(interfaces)) {
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          candidates.push(net.address);
        }
      }
    }

    if (candidates.length === 0) {
      return '127.0.0.1';
    }

    const wifiOrLan = candidates.find(
      ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
    );

    return wifiOrLan ?? candidates[0] ?? '127.0.0.1';
  }

  /**
   * Helper sinh URL và mã QR cho phiên
   */
  async function buildSessionDetails(
    session: SessionSelect,
    hostHeader?: string
  ): Promise<{
    session: SessionDto;
    className: string | null;
    joinUrl: string;
    qrDataUrl: string;
  }> {
    let className: string | null = null;
    if (session.classId) {
      const cls = await classRepo.findById(session.classId);
      if (cls) {
        className = cls.name;
      }
    }

    const lanIp = getLanIpAddress();
    let port = '3000';
    if (hostHeader && hostHeader.includes(':')) {
      const parts = hostHeader.split(':');
      if (parts[1]) port = parts[1];
    }

    // Nếu host là localhost hoặc 127.0.0.1 thì thay bằng IP LAN để học sinh quét QR bằng điện thoại truy cập được
    let host = hostHeader || `${lanIp}:${port}`;
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      host = `${lanIp}:${port}`;
    }

    const joinUrl = `http://${host}/?code=${session.joinCode}`;
    const qrDataUrl = await qrService.generateQrDataUrl(joinUrl);

    return {
      session: toSessionDto(session),
      className,
      joinUrl,
      qrDataUrl,
    };
  }

  /**
   * POST /api/sessions
   * Giáo viên mở một phiên học mới (chọn lớp hoặc tự do, identityMode, sinh mã 6 số + QR)
   */
  fastify.post('/api/sessions', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;

    // 1. Kiểm tra xem giáo viên đã có phiên nào đang active chưa (D4: mỗi GV 1 phiên đang mở)
    const existingActive = await sessionRepo.findActiveByOwnerId(user.id);
    if (existingActive) {
      return reply
        .status(409)
        .send(
          formatProtocolError(
            'TEACHER_ALREADY_HAS_ACTIVE_SESSION',
            'Thầy/cô đang có một phiên học khác đang mở. Vui lòng đóng phiên cũ trước khi mở phiên mới.'
          )
        );
    }

    // 2. Validate dữ liệu yêu cầu mở phiên
    const parseResult = CreateSessionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            parseResult.error.errors[0]?.message ?? 'Dữ liệu mở phiên không hợp lệ.',
            parseResult.error.flatten()
          )
        );
    }
    const data = parseResult.data;

    // 3. Nếu có chọn lớp: kiểm tra lớp tồn tại và thuộc về giáo viên (D5)
    const cleanClassId = data.classId && data.classId.trim() !== '' ? data.classId.trim() : null;
    let selectedClass = null;
    if (cleanClassId) {
      selectedClass = await classRepo.findById(cleanClassId);
      if (!selectedClass) {
        return reply
          .status(404)
          .send(formatProtocolError('CLASS_NOT_FOUND', 'Không tìm thấy lớp học được chọn.'));
      }
      if (selectedClass.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError(
              'FORBIDDEN',
              'Bạn không có quyền mở phiên cho lớp của giáo viên khác.'
            )
          );
      }
    }

    // 4. Sinh mã vào lớp 6 chữ số ngẫu nhiên duy nhất trong các phiên đang active
    const activeCodes = await sessionRepo.listActiveJoinCodes();
    const joinCode = generateJoinCode(activeCodes);

    // 5. Lưu phiên vào CSDL
    const effectiveSettings: SessionSettings = {
      ...(data.settings ?? {}),
      allowChat: data.settings?.allowChat ?? true,
      allowLateJoin: data.settings?.allowLateJoin ?? true,
      allowPairing: data.allowPairing ?? data.settings?.allowPairing ?? false,
      maxStudentsPerDevice: data.maxStudentsPerDevice ?? data.settings?.maxStudentsPerDevice ?? 2,
    };

    const createdSession = await sessionRepo.create({
      ownerId: user.id,
      classId: cleanClassId,
      joinCode,
      status: 'open',
      identityMode: data.identityMode,
      allowTeams: data.allowTeams,
      settingsJson: JSON.stringify(effectiveSettings),
      openedAt: Date.now(),
    });

    // 6. Xây dựng response chi tiết kèm joinUrl và qrDataUrl
    const hostHeader = request.headers.host;
    const details = await buildSessionDetails(createdSession, hostHeader);

    // 7. Bắn gói tin UDP Discovery Beacon để đánh thức các máy học sinh phòng máy tính
    if (beaconService) {
      const serverBaseUrl = new URL(details.joinUrl).origin;
      beaconService.startSessionBeacon({
        sessionId: createdSession.id,
        joinCode: createdSession.joinCode,
        serverUrl: serverBaseUrl,
        teacherName: user.displayName,
        className: details.className,
      });
    }

    return reply.status(201).send(SessionDetailResponseSchema.parse(details));
  });

  /**
   * GET /api/sessions/active
   * Lấy phiên học đang active của giáo viên hiện tại
   */
  fastify.get('/api/sessions/active', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;

    const activeSession = await sessionRepo.findActiveByOwnerId(user.id);
    if (!activeSession) {
      return reply
        .status(404)
        .send(
          formatProtocolError('SESSION_NOT_FOUND', 'Thầy/cô hiện không có phiên học nào đang mở.')
        );
    }

    const hostHeader = request.headers.host;
    const details = await buildSessionDetails(activeSession, hostHeader);
    return reply.send(SessionDetailResponseSchema.parse(details));
  });

  /**
   * GET /api/sessions
   * Trả về danh sách phiên học hoặc phiên active hiện tại của giáo viên
   */
  fastify.get('/api/sessions', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    const active = await sessionRepo.findActiveByOwnerId(user.id);
    if (!active) {
      return reply.send({ sessions: [] });
    }
    const hostHeader = request.headers.host;
    const details = await buildSessionDetails(active, hostHeader);
    return reply.send({
      sessions: [
        {
          ...details.session,
          className: details.className,
          joinUrl: details.joinUrl,
          qrDataUrl: details.qrDataUrl,
        },
      ],
    });
  });

  /**
   * POST /api/sessions/close-active
   * Đóng phiên active hiện tại của giáo viên (hữu ích khi cần giải phóng phiên cũ)
   */
  fastify.post(
    '/api/sessions/close-active',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const active = await sessionRepo.findActiveByOwnerId(user.id);
      if (!active) {
        return reply.send({ success: true, message: 'Không có phiên nào đang mở' });
      }
      await sessionRepo.updateStatus(active.id, 'closed', Date.now());
      if (beaconService) {
        const details = await buildSessionDetails(active, request.headers.host);
        const serverBaseUrl = new URL(details.joinUrl).origin;
        beaconService.sendSessionClosed({
          sessionId: active.id,
          joinCode: active.joinCode,
          serverUrl: serverBaseUrl,
        });
      }
      return reply.send({ success: true, closedSessionId: active.id });
    }
  );

  /**
   * GET /api/sessions/:id
   * Lấy chi tiết phiên học theo ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem thông tin phiên học này.')
          );
      }

      const hostHeader = request.headers.host;
      const details = await buildSessionDetails(session, hostHeader);
      return reply.send(SessionDetailResponseSchema.parse(details));
    }
  );

  /**
   * POST /api/sessions/:id/close
   * Đóng phiên học: closing → report snapshot → SESSION_CLOSED → đăng xuất tất cả (D10 / PLAN 1.8)
   */
  fastify.post<{ Params: { id: string }; Body?: unknown }>(
    '/api/sessions/:id/close',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(formatProtocolError('FORBIDDEN', 'Bạn không có quyền đóng phiên học này.'));
      }

      let report = sessionReportRepo ? await sessionReportRepo.findBySessionId(id) : null;

      if (session.status === 'closed' && report) {
        return reply.send(
          CloseSessionResponseSchema.parse({
            session: toSessionDto(session),
            report: toSessionReportDto(report),
          })
        );
      }

      const now = Date.now();
      const bodyParsed = request.body ? CloseSessionRequestSchema.safeParse(request.body) : null;
      const closeReason =
        (bodyParsed?.success ? bodyParsed.data.reason : undefined) ?? 'Tiết học kết thúc';

      // 1. Chuyển FSM sang closing (nếu đang open)
      const fsmInitial: SessionFsmState = {
        id: session.id,
        ownerId: session.ownerId,
        classId: session.classId ?? undefined,
        joinCode: session.joinCode,
        status: session.status as 'open' | 'closing' | 'closed',
        identityMode: session.identityMode as 'roster_only' | 'roster_or_guest' | 'guest_only',
        allowTeams: session.allowTeams,
        openedAt: session.openedAt,
        closedAt: session.closedAt ?? undefined,
      };

      // 0. Bảo vệ và lưu kết quả kỳ thi an toàn nếu phiên này có ca thi đang mở
      if (examRepo) {
        try {
          const activeExam = await examRepo.findBySessionId(id);
          if (activeExam) {
            if (activityEngine) {
              const active = activityEngine.getActiveRun(id);
              if (active) {
                try {
                  await activityEngine.endActivity(id, active.run.id);
                } catch {
                  // ignore
                }
              }
            }
            await examRepo.detachSession(activeExam.id, 'waiting_next_batch');
          }
        } catch (err) {
          console.warn('[SessionsRoutes] Lỗi tự động ngắt kỳ thi khi đóng phiên:', err);
        }
      }

      let currentFsm = fsmInitial;
      if (currentFsm.status === 'open') {
        currentFsm = transitionSession(currentFsm, {
          type: 'INITIATE_CLOSING',
          timestamp: now,
          reason: closeReason,
        });
        await sessionRepo.updateStatus(id, 'closing');
      }

      // 2. Thu thập dữ liệu và tạo Report Snapshot
      const participantsList = await participantRepo.listBySessionId(id);
      const teamsList = await teamRepo.listBySessionId(id);
      const teamMap = new Map(teamsList.map(t => [t.id, t.name]));

      let className: string | null = null;
      if (session.classId) {
        const cls = await classRepo.findById(session.classId);
        if (cls) className = cls.name;
      }

      const onlineCount = participantsList.filter(p => p.status === 'online').length;
      const offlineCount = participantsList.filter(p => p.status === 'offline').length;

      // Lấy avatar học sinh và danh hiệu mới trao tặng trong phiên (Task 5.4)
      const studentAvatars = new Map<string, AvatarConfig>();
      if (studentRepo) {
        for (const p of participantsList) {
          if (p.studentId && !studentAvatars.has(p.studentId)) {
            const st = await studentRepo.findById(p.studentId);
            if (st?.avatarJson) {
              try {
                studentAvatars.set(p.studentId, JSON.parse(st.avatarJson) as AvatarConfig);
              } catch {
                // ignore
              }
            }
          }
        }
      }

      const titlesAwarded: Array<{
        studentId: string;
        studentName: string;
        titleKey: string;
        titleName: string;
        iconKey: string;
      }> = [];
      if (titleRepo) {
        const sessionTitles = await titleRepo.getTitlesAwardedInSession(id);
        const studentNameMap = new Map(
          participantsList.filter(p => p.studentId).map(p => [p.studentId!, p.displayName])
        );
        for (const st of sessionTitles) {
          const studentName = studentNameMap.get(st.studentId) ?? 'Học sinh';
          titlesAwarded.push({
            studentId: st.studentId,
            studentName,
            titleKey: st.titleKey,
            titleName: st.titleName,
            iconKey: st.iconKey,
          });
        }
      }

      // Tổng hợp các chỉ số nâng cao: Scoreboard, Difficult Questions, Summary, Gamification (Task 3.4 & Task 5.4)
      const activityRuns = activityRunRepo ? await activityRunRepo.listRunsBySessionId(id) : [];
      const resultsByRun = new Map<string, ActivityResultSelect[]>();
      if (activityRunRepo) {
        for (const run of activityRuns) {
          const runResults = await activityRunRepo.findResultsByRunId(run.id);
          resultsByRun.set(run.id, runResults);
        }
      }
      const rewardLogs = rewardRepo ? await rewardRepo.listBySessionId(id) : [];
      const analytics = generateSessionAnalytics({
        participants: participantsList,
        teams: teamsList,
        activityRuns,
        resultsByRun,
        rewardLogs,
        studentAvatars,
        titlesAwarded,
      });

      const quizRuns: QuizSummaryReport[] = [];
      const quizLiveRuns = activityRuns.filter(r => r.activityId === 'quiz-live');
      quizLiveRuns.forEach((r, idx) => {
        const runResults = resultsByRun.get(r.id) ?? [];
        quizRuns.push(buildQuizSummaryFromRun(r, runResults, session.joinCode, className, idx + 1));
      });

      const snapshot: SessionReportSnapshot = {
        sessionId: session.id,
        sessionCode: session.joinCode,
        className,
        identityMode: session.identityMode as 'roster_only' | 'roster_or_guest' | 'guest_only',
        allowTeams: session.allowTeams,
        openedAt: session.openedAt,
        closedAt: now,
        totalParticipants: participantsList.length,
        onlineParticipants: onlineCount,
        offlineParticipants: offlineCount,
        participants: participantsList.map(p => ({
          id: p.id,
          studentId: p.studentId ?? null,
          displayName: p.displayName,
          identityLevel: p.identityLevel as 'account' | 'roster' | 'guest',
          teamName: (p.teamId ? teamMap.get(p.teamId) : null) ?? null,
          joinedAt: p.joinedAt,
          leftAt: p.status === 'online' ? now : (p.leftAt ?? now),
          avatar: p.studentId ? studentAvatars.get(p.studentId) : undefined,
        })),
        teams: teamsList.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: participantsList.filter(p => p.teamId === t.id).length,
        })),
        scoreboard: analytics.scoreboard,
        difficultQuestions: analytics.difficultQuestions,
        summary: analytics.summary,
        gamification: analytics.gamification,
        quizRuns,
      };

      if (!report && sessionReportRepo) {
        report = await sessionReportRepo.create({
          id: generateId(),
          sessionId: id,
          snapshotJson: JSON.stringify(snapshot),
          createdAt: now,
        });
      }

      // 3. Chuyển FSM sang closed
      if (currentFsm.status === 'closing') {
        currentFsm = transitionSession(currentFsm, {
          type: 'COMPLETE_CLOSING',
          timestamp: now,
          reportSnapshotId: report?.id,
        });
      }

      const closedSession = await sessionRepo.updateStatus(id, 'closed', now);

      // 4. Cập nhật toàn bộ người tham gia sang offline (đăng xuất tất cả theo D10)
      await participantRepo.markAllOfflineBySessionId(id, now);

      // 5. Phát thông điệp SESSION_CLOSED qua WebSocket và ngắt các kết nối của phiên
      if (wsManager) {
        const closeEnv = createEnvelope({
          id: generateId(),
          type: 'SESSION_CLOSED',
          sessionId: id,
          payload: {
            sessionId: id,
            reason: closeReason,
            message: 'Phiên học đã kết thúc. Cảm ơn các em!',
            reportId: report?.id,
            closedAt: now,
          },
        });
        wsManager.terminateSession(id, closeEnv);
      }

      // 6. Tự động dọn sạch rác ảnh tạm của Camera vật thể thuộc phiên này
      cleanupSessionObjectCameraFiles(id);

      // 7. Bắn gói tin UDP Discovery Beacon thông báo phiên đã đóng
      if (beaconService) {
        const details = await buildSessionDetails(session, request.headers.host);
        const serverBaseUrl = new URL(details.joinUrl).origin;
        beaconService.sendSessionClosed({
          sessionId: session.id,
          joinCode: session.joinCode,
          serverUrl: serverBaseUrl,
        });
      }

      const reportDto: SessionReportDto = report
        ? toSessionReportDto(report)
        : {
            id: generateId(),
            sessionId: id,
            snapshot,
            createdAt: now,
          };

      return reply.send(
        CloseSessionResponseSchema.parse({
          session: toSessionDto(closedSession),
          report: reportDto,
        })
      );
    }
  );

  /**
   * GET /api/sessions/:id/report
   * Xem báo cáo tổng kết của một phiên học (Có phân quyền Owner Guard theo D5)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/report',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem báo cáo của phiên học này.')
          );
      }

      if (!sessionReportRepo) {
        return reply
          .status(404)
          .send(formatProtocolError('INTERNAL_ERROR', 'Hệ thống báo cáo chưa được cấu hình.'));
      }

      const report = await sessionReportRepo.findBySessionId(id);
      if (!report) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'SESSION_NOT_FOUND',
              'Phiên học chưa kết thúc hoặc chưa có báo cáo tổng kết.'
            )
          );
      }

      return reply.send(
        SessionReportResponseSchema.parse({
          report: toSessionReportDto(report),
        })
      );
    }
  );

  /**
   * GET /api/sessions/:id/report/excel
   * Xuất báo cáo tổng kết phiên học ra file Excel (.xlsx) gồm 3 sheets:
   * 1. Tổng quan phiên
   * 2. Bảng điểm học sinh
   * 3. Câu hỏi sai nhiều
   * (Có phân quyền Owner Guard theo D5)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/report/excel',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền tải báo cáo của phiên học này.')
          );
      }

      if (!sessionReportRepo) {
        return reply
          .status(404)
          .send(formatProtocolError('INTERNAL_ERROR', 'Hệ thống báo cáo chưa được cấu hình.'));
      }

      const report = await sessionReportRepo.findBySessionId(id);
      if (!report) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'SESSION_NOT_FOUND',
              'Phiên học chưa kết thúc hoặc chưa có báo cáo tổng kết.'
            )
          );
      }

      const snapshot = JSON.parse(report.snapshotJson) as SessionReportSnapshot;
      const excelSvc = excelService ?? new ExcelService();
      const buffer = excelSvc.exportSessionReportBuffer(snapshot);

      const filename = `bao-cao-phien-${session.joinCode}.xlsx`;
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );

  /**
   * GET /api/sessions/:id/export-excel
   * Alias đường dẫn cho xuất Excel báo cáo tổng kết
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/export-excel',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }
      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền tải báo cáo của phiên học này.')
          );
      }
      if (!sessionReportRepo) {
        return reply
          .status(404)
          .send(formatProtocolError('INTERNAL_ERROR', 'Hệ thống báo cáo chưa được cấu hình.'));
      }

      const report = await sessionReportRepo.findBySessionId(id);
      if (!report) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'SESSION_NOT_FOUND',
              'Phiên học chưa kết thúc hoặc chưa có báo cáo tổng kết.'
            )
          );
      }

      const snapshot = JSON.parse(report.snapshotJson) as SessionReportSnapshot;
      const excelSvc = excelService ?? new ExcelService();
      const buffer = excelSvc.exportSessionReportBuffer(snapshot);
      const filename = `bao-cao-phien-${session.joinCode}.xlsx`;
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );

  /**
   * GET /api/sessions/reports
   * Danh sách lịch sử báo cáo các phiên học đã đóng của giáo viên
   */
  fastify.get('/api/sessions/reports', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    if (!sessionReportRepo) {
      return reply.send({ reports: [] });
    }

    const rawReports =
      user.role === 'admin'
        ? await sessionReportRepo.listAll(100)
        : await sessionReportRepo.listByOwnerId(user.id, 100);

    const items: SessionReportListItem[] = [];

    for (const r of rawReports) {
      try {
        const snapshot = JSON.parse(r.snapshotJson) as SessionReportSnapshot;

        let quizTitle = 'Quizizz Live';
        if (snapshot.difficultQuestions && snapshot.difficultQuestions.length > 0) {
          const firstDiff = snapshot.difficultQuestions[0];
          if (firstDiff && firstDiff.activityName) {
            quizTitle = firstDiff.activityName;
          }
        }

        let quizRuns = snapshot.quizRuns;
        if ((!quizRuns || quizRuns.length === 0) && activityRunRepo) {
          const rawRuns = await activityRunRepo.listRunsBySessionId(r.sessionId);
          const rawQuizRuns = rawRuns.filter(ar => ar.activityId === 'quiz-live');
          quizRuns = [];
          for (let i = 0; i < rawQuizRuns.length; i++) {
            const ar = rawQuizRuns[i]!;
            const results = await activityRunRepo.findResultsByRunId(ar.id);
            quizRuns.push(
              buildQuizSummaryFromRun(ar, results, r.sessionJoinCode, snapshot.className, i + 1)
            );
          }
        }

        items.push({
          id: r.id,
          sessionId: r.sessionId,
          sessionCode: r.sessionJoinCode || snapshot.sessionCode,
          className: snapshot.className ?? null,
          createdAt: r.createdAt,
          openedAt: r.sessionOpenedAt ?? snapshot.openedAt,
          closedAt: r.sessionClosedAt ?? snapshot.closedAt ?? r.createdAt,
          totalParticipants: snapshot.totalParticipants ?? snapshot.participants.length,
          quizTitle,
          summary: snapshot.summary,
          scoreboard: snapshot.scoreboard ?? [],
          snapshot,
          quizRuns: quizRuns || [],
        });
      } catch {
        // Bỏ qua bản ghi JSON hỏng
      }
    }

    return reply.send(SessionReportsListResponseSchema.parse({ reports: items }));
  });

  /**
   * GET /api/sessions/:id/quiz-summary
   * Lấy kết quả bài Quizizz mới nhất trong phiên (hỗ trợ xem ngay khi kết thúc bài Quizizz)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/quiz-summary',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }
      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem kết quả của phiên học này.')
          );
      }

      if (!activityRunRepo) {
        return reply.send({ summary: null });
      }

      const runs = await activityRunRepo.listRunsBySessionId(id);
      const quizRuns = runs.filter(r => r.activityId === 'quiz-live').reverse();
      const latestQuizRun = quizRuns[0];

      if (!latestQuizRun) {
        return reply.send({ summary: null });
      }

      let quizTitle = 'Quizizz Live';
      let totalQuestions = 0;
      try {
        const cfg = JSON.parse(latestQuizRun.configJson) as {
          title?: string;
          questions?: unknown[];
        };
        if (cfg.title) quizTitle = cfg.title;
        if (Array.isArray(cfg.questions)) totalQuestions = cfg.questions.length;
      } catch {
        // ignore
      }

      const results = await activityRunRepo.findResultsByRunId(latestQuizRun.id);
      const scoreboard: Array<{
        participantId: string;
        displayName: string;
        identityLevel: 'account' | 'roster' | 'guest';
        score: number;
        correctCount: number;
        totalQuestions: number;
        accuracy: number;
        expEarned: number;
        rank: number;
      }> = [];

      for (const res of results) {
        try {
          const item = JSON.parse(res.scoreJson) as {
            displayName?: string;
            score?: number;
            correctCount?: number;
            totalQuestions?: number;
            accuracy?: number;
            rank?: number;
            identityLevel?: string;
          };

          const sCount = Number(item.totalQuestions || totalQuestions);
          const cCount = Number(item.correctCount || 0);
          const acc =
            typeof item.accuracy === 'number'
              ? item.accuracy
              : sCount > 0
                ? Math.round((cCount / sCount) * 100)
                : 0;

          scoreboard.push({
            participantId: res.participantId,
            displayName: item.displayName || 'Học sinh',
            identityLevel: (item.identityLevel as 'account' | 'roster' | 'guest') || 'roster',
            score: Number(item.score || 0),
            correctCount: cCount,
            totalQuestions: sCount,
            accuracy: acc,
            expEarned: 0,
            rank: typeof res.rank === 'number' ? res.rank : 1,
          });
        } catch {
          // ignore
        }
      }

      scoreboard.sort((a, b) => a.rank - b.rank || b.score - a.score);
      scoreboard.forEach((item, idx) => {
        item.rank = idx + 1;
      });

      const totalParticipants = scoreboard.length;
      const averageScore =
        totalParticipants > 0
          ? Math.round(scoreboard.reduce((acc, s) => acc + s.score, 0) / totalParticipants)
          : 0;
      const averageAccuracy =
        totalParticipants > 0
          ? Math.round(scoreboard.reduce((acc, s) => acc + s.accuracy, 0) / totalParticipants)
          : 0;

      const summaryPayload = {
        sessionId: id,
        runId: latestQuizRun.id,
        title: quizTitle,
        totalQuestions,
        totalParticipants,
        averageScore,
        averageAccuracy,
        scoreboard,
        endedAt: latestQuizRun.endedAt ?? undefined,
      };

      return reply.send(QuizSummaryReportResponseSchema.parse({ summary: summaryPayload }));
    }
  );

  /**
   * GET /api/sessions/:id/quiz-runs
   * Lấy danh sách TẤT CẢ các lần thi Quizizz trong phiên học (hỗ trợ 1 phiên thi nhiều lần)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/quiz-runs',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }
      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem kết quả của phiên học này.')
          );
      }

      if (!activityRunRepo) {
        return reply.send({ runs: [] });
      }

      let className: string | null = null;
      if (session.classId) {
        const cls = await classRepo.findById(session.classId);
        if (cls) className = cls.name;
      }

      const runs = await activityRunRepo.listRunsBySessionId(id);
      const quizRuns = runs.filter(r => r.activityId === 'quiz-live');
      const items: QuizSummaryReport[] = [];

      for (let i = 0; i < quizRuns.length; i++) {
        const run = quizRuns[i]!;
        const results = await activityRunRepo.findResultsByRunId(run.id);
        items.push(buildQuizSummaryFromRun(run, results, session.joinCode, className, i + 1));
      }

      return reply.send(QuizRunsListResponseSchema.parse({ runs: items }));
    }
  );

  /**
   * GET /api/sessions/:id/quiz-runs/:runId/export-excel
   * Xuất file Excel bảng điểm cho một lần thi Quizizz cụ thể trong phiên
   */
  fastify.get<{ Params: { id: string; runId: string } }>(
    '/api/sessions/:id/quiz-runs/:runId/export-excel',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id, runId } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }
      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền tải báo cáo của phiên học này.')
          );
      }

      if (!activityRunRepo) {
        return reply
          .status(404)
          .send(formatProtocolError('INTERNAL_ERROR', 'Hệ thống báo cáo chưa được cấu hình.'));
      }

      const run = await activityRunRepo.findRunById(runId);
      if (!run || run.sessionId !== id) {
        return reply
          .status(404)
          .send(
            formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy lần thi Quizizz tương ứng.')
          );
      }

      let className: string | null = null;
      if (session.classId) {
        const cls = await classRepo.findById(session.classId);
        if (cls) className = cls.name;
      }

      const results = await activityRunRepo.findResultsByRunId(runId);
      const quizSummary = buildQuizSummaryFromRun(run, results, session.joinCode, className);

      const fakeSnapshot: SessionReportSnapshot = {
        sessionId: id,
        sessionCode: session.joinCode,
        className,
        identityMode: session.identityMode as 'roster_only' | 'roster_or_guest' | 'guest_only',
        allowTeams: session.allowTeams,
        openedAt: run.startedAt ?? session.openedAt,
        closedAt: run.endedAt ?? Date.now(),
        totalParticipants: quizSummary.totalParticipants,
        onlineParticipants: quizSummary.totalParticipants,
        offlineParticipants: 0,
        participants: quizSummary.scoreboard.map(s => ({
          id: s.participantId,
          displayName: s.displayName,
          identityLevel: s.identityLevel,
          teamName: s.teamName ?? null,
          joinedAt: run.startedAt ?? session.openedAt,
          leftAt: run.endedAt ?? Date.now(),
        })),
        teams: [],
        scoreboard: quizSummary.scoreboard,
        difficultQuestions: [],
        summary: {
          totalQuestions: quizSummary.totalQuestions,
          averageScore: quizSummary.averageScore,
          averageAccuracy: quizSummary.averageAccuracy,
          totalExpAwarded: 0,
        },
      };

      const excelSvc = excelService ?? new ExcelService();
      const buffer = excelSvc.exportSessionReportBuffer(fakeSnapshot);
      const safeTitle = (quizSummary.title || 'quizizz').replace(
        /[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g,
        '-'
      );
      const filename = `bang-diem-${safeTitle}-${session.joinCode}.xlsx`;

      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );

  /**
   * GET /api/sessions/lookup/:code
   * Cổng học sinh tra cứu thông tin phiên theo mã 6 ký tự (Không yêu cầu đăng nhập)
   */
  fastify.get<{ Params: { code: string } }>(
    '/api/sessions/lookup/:code',
    async (request, reply) => {
      const { code } = request.params;

      const activeSession = await sessionRepo.findActiveByJoinCode(code);
      if (!activeSession) {
        return reply
          .status(404)
          .send(
            formatProtocolError('BAD_CODE', 'Mã vào lớp không đúng hoặc phiên học đã kết thúc.')
          );
      }

      let className: string | null = null;
      if (activeSession.classId) {
        const cls = await classRepo.findById(activeSession.classId);
        if (cls) className = cls.name;
      }

      let lookupSettings: SessionSettings | undefined;
      if (activeSession.settingsJson) {
        try {
          lookupSettings = JSON.parse(activeSession.settingsJson);
        } catch {
          lookupSettings = undefined;
        }
      }

      const lookupResponse = {
        sessionId: activeSession.id,
        joinCode: activeSession.joinCode,
        status: activeSession.status as 'open' | 'closing' | 'closed',
        identityMode: activeSession.identityMode as
          'roster_only' | 'roster_or_guest' | 'guest_only',
        allowTeams: activeSession.allowTeams,
        allowPairing: lookupSettings?.allowPairing ?? false,
        maxStudentsPerDevice: lookupSettings?.maxStudentsPerDevice ?? 2,
        className,
        classId: activeSession.classId ?? null,
      };

      return reply.send(JoinCodeLookupResponseSchema.parse(lookupResponse));
    }
  );

  /**
   * GET /api/sessions/open-list
   * Lấy danh sách các phiên đang mở trên toàn mạng LAN để học sinh bấm chọn nhanh (Không cần đăng nhập)
   */
  fastify.get('/api/sessions/open-list', async (_request, reply) => {
    const activeSessions = await sessionRepo.listActiveSessions();

    const items = await Promise.all(
      activeSessions.map(async s => {
        let teacherName = 'Giáo viên';
        const owner = await userRepo.findById(s.ownerId);
        if (owner) teacherName = owner.displayName;

        let className: string | null = null;
        if (s.classId) {
          const cls = await classRepo.findById(s.classId);
          if (cls) className = cls.name;
        }

        let sSettings: SessionSettings | undefined;
        if (s.settingsJson) {
          try {
            sSettings = JSON.parse(s.settingsJson);
          } catch {
            sSettings = undefined;
          }
        }

        return {
          id: s.id,
          joinCode: s.joinCode,
          teacherName,
          className,
          identityMode: s.identityMode as 'roster_only' | 'roster_or_guest' | 'guest_only',
          allowTeams: s.allowTeams,
          allowPairing: sSettings?.allowPairing ?? false,
          maxStudentsPerDevice: sSettings?.maxStudentsPerDevice ?? 2,
          openedAt: s.openedAt,
        };
      })
    );

    return reply.send(ActiveSessionsListResponseSchema.parse({ sessions: items }));
  });

  /**
   * GET /api/sessions/code/:code/roster
   * Lấy danh sách học sinh của phiên cho HS chọn tên kèm trạng thái đã vào phòng chưa (D7)
   */
  fastify.get<{ Params: { code: string } }>(
    '/api/sessions/code/:code/roster',
    async (request, reply) => {
      const { code } = request.params;

      const activeSession = await sessionRepo.findActiveByJoinCode(code);
      if (!activeSession) {
        return reply
          .status(404)
          .send(
            formatProtocolError('BAD_CODE', 'Mã vào lớp không đúng hoặc phiên học đã kết thúc.')
          );
      }

      let className: string | null = null;
      let studentItems: Array<{
        id: string;
        fullName: string;
        hasPin: boolean;
        isTaken: boolean;
        isCompletedExam?: boolean;
      }> = [];

      if (activeSession.classId) {
        const cls = await classRepo.findById(activeSession.classId);
        if (cls) className = cls.name;

        const students = await studentRepo.listByClassId(activeSession.classId);
        const onlineParticipants = await participantRepo.findOnlineBySessionId(activeSession.id);
        const takenStudentIds = new Set<string>();
        for (const p of onlineParticipants) {
          const ids = ParticipantRepository.getStudentIds(p);
          for (const id of ids) {
            takenStudentIds.add(id);
          }
        }

        const completedStudentIds = new Set<string>();
        if (examRepo && examRecordRepo) {
          const exam = await examRepo.findBySessionId(activeSession.id);
          if (exam) {
            const records = await examRecordRepo.listByExam(exam.id);
            for (const r of records) {
              if (r.status === 'submitted') {
                completedStudentIds.add(r.studentId);
              }
            }
          }
        }

        studentItems = students.map(s => ({
          id: s.id,
          fullName: s.fullName,
          hasPin: Boolean(s.passwordHash),
          isTaken: takenStudentIds.has(s.id),
          isCompletedExam: completedStudentIds.has(s.id),
        }));
      }

      let rosterSettings: SessionSettings | undefined;
      if (activeSession.settingsJson) {
        try {
          rosterSettings = JSON.parse(activeSession.settingsJson);
        } catch {
          rosterSettings = undefined;
        }
      }

      const responsePayload = {
        sessionId: activeSession.id,
        className,
        identityMode: activeSession.identityMode as
          'roster_only' | 'roster_or_guest' | 'guest_only',
        allowTeams: activeSession.allowTeams,
        allowPairing: rosterSettings?.allowPairing ?? false,
        maxStudentsPerDevice: rosterSettings?.maxStudentsPerDevice ?? 2,
        students: studentItems,
      };

      return reply.send(SessionRosterResponseSchema.parse(responsePayload));
    }
  );

  /**
   * POST /api/sessions/join
   * Cổng HS vào lớp: Kiểm tra mã, danh tính (chọn tên hoặc khách), mã PIN, khóa tên trùng (D7), ghép nhóm
   */
  fastify.post('/api/sessions/join', async (request, reply) => {
    const parseResult = StudentJoinRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu yêu cầu vào lớp không hợp lệ.',
            parseResult.error.issues
          )
        );
    }

    const { joinCode, studentId, studentIds, nickname, pin, pins, teamName } = parseResult.data;

    const session = await sessionRepo.findActiveByJoinCode(joinCode);
    if (!session || session.status !== 'open') {
      return reply
        .status(404)
        .send(
          formatProtocolError('BAD_CODE', 'Mã vào lớp không đúng hoặc phiên học không còn mở.')
        );
    }

    // Chuẩn hóa danh sách ID học sinh (hỗ trợ cả chọn đơn và chọn ghép 2-3 bạn)
    const targetStudentIds: string[] =
      studentIds && studentIds.length > 0
        ? Array.from(new Set(studentIds))
        : studentId
          ? [studentId]
          : [];

    let sessionSettings: SessionSettings | undefined;
    if (session.settingsJson) {
      try {
        sessionSettings = JSON.parse(session.settingsJson);
      } catch {
        sessionSettings = undefined;
      }
    }
    const allowPairing = sessionSettings?.allowPairing ?? false;
    const maxStudentsPerDevice = sessionSettings?.maxStudentsPerDevice ?? 2;

    if (targetStudentIds.length > 1) {
      if (!allowPairing) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              'Phiên học này không bật chế độ ngồi chung máy (ghép đôi/nhóm).'
            )
          );
      }
      if (targetStudentIds.length > maxStudentsPerDevice) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              `Mỗi máy chỉ được ghép tối đa ${maxStudentsPerDevice} học sinh.`
            )
          );
      }
    }

    // Kiểm tra tương thích với identityMode của phiên
    if (session.identityMode === 'roster_only' && targetStudentIds.length === 0) {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            'Phiên học này chỉ cho phép học sinh chọn tên trong danh sách lớp.'
          )
        );
    }

    if (session.identityMode === 'guest_only' && targetStudentIds.length > 0) {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            'Phiên học này chỉ cho phép tham gia với tư cách khách tự do.'
          )
        );
    }

    let finalDisplayName = '';
    let finalStudentId: string | null = null;
    let finalStudentIds: string[] = [];
    let identityLevel: 'account' | 'roster' | 'guest';

    if (targetStudentIds.length > 0) {
      const loadedStudents = [];
      for (const sId of targetStudentIds) {
        const student = await studentRepo.findById(sId);
        if (!student) {
          return reply
            .status(404)
            .send(
              formatProtocolError(
                'STUDENT_NOT_FOUND',
                `Không tìm thấy học sinh trong hệ thống (ID: ${sId}).`
              )
            );
        }
        if (session.classId && student.classId !== session.classId) {
          return reply
            .status(400)
            .send(
              formatProtocolError(
                'INVALID_PAYLOAD',
                `Học sinh ${student.fullName} không thuộc lớp của phiên này.`
              )
            );
        }
        loadedStudents.push(student);
      }

      // Kiểm tra khóa tên trùng đồng thời theo D7 trước khi nhập/xác thực PIN
      const onlineParticipants = await participantRepo.findOnlineBySessionId(session.id);
      const takenStudentIdSet = new Set<string>();
      for (const p of onlineParticipants) {
        const pIds = ParticipantRepository.getStudentIds(p);
        for (const id of pIds) {
          takenStudentIdSet.add(id);
        }
      }

      for (const student of loadedStudents) {
        if (takenStudentIdSet.has(student.id)) {
          return reply
            .status(409)
            .send(
              formatProtocolError(
                'NAME_TAKEN',
                'Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô.'
              )
            );
        }
      }

      if (examRepo && examRecordRepo) {
        const exam = await examRepo.findBySessionId(session.id);
        if (exam) {
          for (const student of loadedStudents) {
            const record = await examRecordRepo.findByExamAndStudent(exam.id, student.id);
            if (record && record.status === 'submitted') {
              return reply
                .status(400)
                .send(
                  formatProtocolError(
                    'ALREADY_SUBMITTED',
                    `Học sinh ${student.fullName} đã hoàn thành bài thi ở ca trước và không thể tham gia làm bài lại.`
                  )
                );
            }
          }
        }
      }

      let anyHasPin = false;
      let allPinVerified = true;
      for (const student of loadedStudents) {
        const hasPassword = Boolean(student.passwordHash);
        if (hasPassword) {
          anyHasPin = true;
          const studentPin =
            pins?.[student.id] || (targetStudentIds.length === 1 ? pin : undefined);
          if (!studentPin) {
            return reply
              .status(401)
              .send(
                formatProtocolError(
                  'INVALID_PIN',
                  `Vui lòng nhập mã PIN của học sinh: ${student.fullName}`
                )
              );
          }
          const isValidPin = await passwordHasher.verify(studentPin, student.passwordHash!);
          if (!isValidPin) {
            return reply
              .status(401)
              .send(
                formatProtocolError(
                  'INVALID_PIN',
                  `Mã PIN của học sinh ${student.fullName} không chính xác.`
                )
              );
          }
        }
      }

      finalDisplayName = loadedStudents.map(s => s.fullName).join(' & ');
      finalStudentId = loadedStudents[0]!.id;
      finalStudentIds = loadedStudents.map(s => s.id);
      identityLevel = resolveIdentityLevel({
        hasStudentAccount: true,
        hasPin: anyHasPin,
        isPinVerified: anyHasPin && allPinVerified,
        isGuest: false,
      });
    } else if (nickname) {
      finalDisplayName = nickname.trim();
      finalStudentId = null;
      finalStudentIds = [];
      identityLevel = resolveIdentityLevel({
        hasStudentAccount: false,
        hasPin: false,
        isPinVerified: false,
        isGuest: true,
      });
    } else {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            'Vui lòng chọn tên trong danh sách hoặc nhập tên khách.'
          )
        );
    }

    // Kiểm tra khóa tên trùng đồng thời theo D7 cho khách tự do
    if (finalStudentIds.length === 0) {
      const onlineParticipants = await participantRepo.findOnlineBySessionId(session.id);
      const taken = isNameTaken(finalDisplayName, onlineParticipants);
      if (taken) {
        return reply
          .status(409)
          .send(
            formatProtocolError(
              'NAME_TAKEN',
              'Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô.'
            )
          );
      }
    }

    // Xử lý nhóm (nếu phiên cho phép nhóm)
    let assignedTeamId: string | null = null;
    let assignedTeamName: string | null = null;

    if (teamName && teamName.trim().length > 0) {
      if (!session.allowTeams) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              'Phiên học này không bật chế độ làm việc theo nhóm.'
            )
          );
      }

      const team = await teamRepo.findOrCreate(session.id, teamName.trim());
      assignedTeamId = team.id;
      assignedTeamName = team.name;
    }

    // Tìm xem học sinh đã có participant trong session này chưa (đang offline vào lại)
    let participant: ParticipantSelect | null = null;
    if (finalStudentIds.length > 0) {
      participant = await participantRepo.findBySessionAndAnyStudentId(session.id, finalStudentIds);
    }
    if (!participant) {
      participant = await participantRepo.findBySessionAndDisplayName(session.id, finalDisplayName);
    }

    const studentIdsJson = finalStudentIds.length > 0 ? JSON.stringify(finalStudentIds) : null;

    if (participant) {
      participant = await participantRepo.update(participant.id, {
        status: 'online',
        identityLevel,
        teamId: assignedTeamId ?? participant.teamId,
        studentId: finalStudentId ?? participant.studentId,
        studentIdsJson: studentIdsJson ?? participant.studentIdsJson,
        displayName: finalDisplayName,
      });
    } else {
      participant = await participantRepo.create({
        sessionId: session.id,
        studentId: finalStudentId,
        studentIdsJson,
        displayName: finalDisplayName,
        identityLevel,
        teamId: assignedTeamId,
        status: 'online',
        joinedAt: Date.now(),
      });
    }

    if (!assignedTeamName && participant.teamId) {
      const existingTeam = await teamRepo.findById(participant.teamId);
      if (existingTeam) {
        assignedTeamName = existingTeam.name;
      }
    }

    const participantToken = tokenService.createParticipantToken({
      participantId: participant.id,
      sessionId: session.id,
      identityLevel: participant.identityLevel,
    });

    let className: string | null = null;
    if (session.classId) {
      const cls = await classRepo.findById(session.classId);
      if (cls) className = cls.name;
    }

    const participantDto = toParticipantDto(participant, assignedTeamName);

    // Phát sóng sự kiện học sinh vào phòng cho toàn bộ phiên học (đặc biệt là màn hình giáo viên)
    if (wsManager) {
      wsManager.broadcastToSession(
        session.id,
        createEnvelope({
          id: generateId(),
          type: 'participant_joined',
          sessionId: session.id,
          payload: {
            participant: participantDto,
          },
        })
      );
    }

    return reply.status(200).send(
      StudentJoinResponseSchema.parse({
        participantToken,
        participant: participantDto,
        session: {
          id: session.id,
          joinCode: session.joinCode,
          status: session.status as 'open' | 'closing' | 'closed',
          className,
          allowTeams: session.allowTeams,
        },
      })
    );
  });

  /**
   * POST /api/sessions/resume
   * Khôi phục kết nối cho học sinh bằng participantToken (Resume/Reconnect)
   */
  fastify.post('/api/sessions/resume', async (request, reply) => {
    const parseResult = StudentResumeRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(
          formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu yêu cầu kết nối lại không hợp lệ.',
            parseResult.error.issues
          )
        );
    }

    const { participantToken } = parseResult.data;
    const tokenPayload = tokenService.verifyParticipantToken(participantToken);
    if (!tokenPayload) {
      return reply
        .status(401)
        .send(
          formatProtocolError('UNAUTHORIZED', 'Mã phiên học sinh không hợp lệ hoặc đã hết hạn.')
        );
    }

    const session = await sessionRepo.findById(tokenPayload.sessionId);
    if (!session || session.status === 'closed') {
      return reply
        .status(400)
        .send(formatProtocolError('SESSION_CLOSED', 'Phiên học đã kết thúc.'));
    }

    let participant = await participantRepo.findById(tokenPayload.participantId);
    if (!participant || participant.sessionId !== session.id) {
      return reply
        .status(404)
        .send(
          formatProtocolError(
            'PARTICIPANT_NOT_FOUND',
            'Không tìm thấy thông tin người tham gia trong phiên học.'
          )
        );
    }

    // Cập nhật trạng thái thành online
    participant = await participantRepo.update(participant.id, {
      status: 'online',
    });

    let teamName: string | null = null;
    if (participant.teamId) {
      const team = await teamRepo.findById(participant.teamId);
      if (team) teamName = team.name;
    }

    let className: string | null = null;
    if (session.classId) {
      const cls = await classRepo.findById(session.classId);
      if (cls) className = cls.name;
    }

    const participantDto = toParticipantDto(participant, teamName);

    if (wsManager) {
      wsManager.broadcastToSession(
        session.id,
        createEnvelope({
          id: generateId(),
          type: 'participant_joined',
          sessionId: session.id,
          payload: {
            participant: participantDto,
          },
        })
      );
    }

    return reply.status(200).send(
      StudentJoinResponseSchema.parse({
        participantToken,
        participant: participantDto,
        session: {
          id: session.id,
          joinCode: session.joinCode,
          status: session.status as 'open' | 'closing' | 'closed',
          className,
          allowTeams: session.allowTeams,
        },
      })
    );
  });

  /**
   * GET /api/sessions/:id/participants
   * GV xem danh sách người tham gia phiên học (online/offline)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/participants',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError(
              'FORBIDDEN',
              'Bạn không có quyền xem danh sách người tham gia của phiên này.'
            )
          );
      }

      const participantsList = await participantRepo.listBySessionId(session.id);
      const teamsList = await teamRepo.listBySessionId(session.id);
      const teamMap = new Map(teamsList.map(t => [t.id, t.name]));

      const onlineCount = participantsList.filter(p => p.status === 'online').length;
      const offlineCount = participantsList.filter(p => p.status === 'offline').length;
      const totalCount = participantsList.length;

      let eloMap = new Map<string, number>();
      if (session.classId && studentRepo) {
        try {
          const classStudents = await studentRepo.listByClassId(session.classId);
          eloMap = new Map(classStudents.map(s => [s.id, (s as { elo?: number }).elo ?? 1000]));
        } catch {
          // ignore
        }
      }

      const participantDtos = participantsList.map(p => {
        let elo: number | undefined;
        if (p.studentId && eloMap.has(p.studentId)) {
          elo = eloMap.get(p.studentId);
        }
        return toParticipantDto(p, p.teamId ? (teamMap.get(p.teamId) ?? null) : null, elo);
      });

      return reply.send(
        SessionParticipantsResponseSchema.parse({
          sessionId: session.id,
          onlineCount,
          offlineCount,
          totalCount,
          participants: participantDtos,
        })
      );
    }
  );

  /**
   * POST /api/sessions/:id/participants/:participantId/release
   * GV "mở lại tên" / ngắt kết nối một học sinh đang online (D7)
   */
  fastify.post<{ Params: { id: string; participantId: string } }>(
    '/api/sessions/:id/participants/:participantId/release',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id, participantId } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError('FORBIDDEN', 'Bạn không có quyền thao tác trên phiên học này.')
          );
      }

      const participant = await participantRepo.findById(participantId);
      if (!participant || participant.sessionId !== session.id) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'PARTICIPANT_NOT_FOUND',
              'Không tìm thấy người tham gia trong phiên học này.'
            )
          );
      }

      // Đưa trạng thái về offline và cập nhật leftAt để giải phóng tên
      const updated = await participantRepo.update(participant.id, {
        status: 'offline',
        leftAt: Date.now(),
      });

      if (wsManager) {
        wsManager.broadcastToSession(
          session.id,
          createEnvelope({
            id: generateId(),
            type: 'participant_left',
            sessionId: session.id,
            payload: {
              participantId: updated.id,
              displayName: updated.displayName,
            },
          })
        );
      }

      return reply.send(
        ReleaseParticipantResponseSchema.parse({
          success: true,
          participantId: updated.id,
          displayName: updated.displayName,
          status: updated.status,
        })
      );
    }
  );

  /**
   * POST /api/sessions/:id/leave
   * Học sinh tự rời phòng hoặc gửi beacon khi thoát trình duyệt
   */
  fastify.post<{
    Params: { id: string };
    Body?: { participantId?: string; participantToken?: string };
  }>('/api/sessions/:id/leave', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    let pId = body.participantId;
    if (!pId && body.participantToken) {
      const decoded = tokenService.verifyParticipantToken(body.participantToken);
      if (decoded) pId = decoded.participantId;
    }

    if (!pId) {
      return reply.send({ success: false, message: 'Thiếu participantId' });
    }

    try {
      const updated = await participantRepo.update(pId, {
        status: 'offline',
        leftAt: Date.now(),
      });

      if (wsManager) {
        wsManager.broadcastToSession(
          id,
          createEnvelope({
            id: generateId(),
            type: 'participant_left',
            sessionId: id,
            payload: {
              participantId: updated.id,
              displayName: updated.displayName,
              status: 'offline',
              leftAt: Date.now(),
            },
          })
        );
      }
    } catch {
      // Bỏ qua lỗi cập nhật nếu không tìm thấy participant
    }

    return reply.send({ success: true });
  });

  /**
   * POST /api/sessions/:id/rewards/grant
   * Thưởng EXP cho người tham gia phiên học (tuân thủ D6, D8: account mới lưu DB)
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/sessions/:id/rewards/grant',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError(
              'FORBIDDEN',
              'Bạn không có quyền cộng điểm thưởng trong phiên học này.'
            )
          );
      }

      if (session.status === 'closed') {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'SESSION_CLOSED',
              'Phiên học đã kết thúc, không thể cộng điểm thưởng.'
            )
          );
      }

      if (!rewardRepo) {
        return reply
          .status(500)
          .send(
            formatProtocolError(
              'INTERNAL_ERROR',
              'RewardRepository chưa được cấu hình trên máy chủ.'
            )
          );
      }

      const parseResult = GrantRewardRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(
            formatProtocolError(
              'INVALID_PAYLOAD',
              parseResult.error.errors[0]?.message ?? 'Dữ liệu thưởng không hợp lệ.',
              parseResult.error.flatten()
            )
          );
      }
      const data = parseResult.data;

      const participant = await participantRepo.findById(data.participantId);
      if (!participant || participant.sessionId !== session.id) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'PARTICIPANT_NOT_FOUND',
              'Không tìm thấy người tham gia trong phiên học này.'
            )
          );
      }

      const targetStudentIds = ParticipantRepository.getStudentIds(participant);

      let savedLog: RewardLogSelect | null = null;
      const storageAdapter = {
        async saveReward(rewardData: {
          rewardLog: {
            sessionId: string;
            participantId: string;
            studentId: string | null;
            exp: number;
            reason: string;
            persisted: boolean;
            ts: number;
          };
          studentUpdate?: {
            studentId: string;
            exp: number;
            level: number;
          };
        }) {
          savedLog = await rewardRepo!.recordRewardTransaction({
            rewardLog: {
              id: generateId(),
              ...rewardData.rewardLog,
            },
            studentUpdate: rewardData.studentUpdate,
          });
        },
      };

      let lastResult: Awaited<ReturnType<typeof rewards.grant>> | null = null;

      if (targetStudentIds.length > 0) {
        for (const sId of targetStudentIds) {
          let studentState: { id: string; exp: number; level: number } | null = null;
          const student = await studentRepo.findById(sId);
          if (student) {
            studentState = {
              id: student.id,
              exp: student.exp,
              level: student.level,
            };
          }

          lastResult = await rewards.grant(
            {
              participant: {
                id: participant.id,
                sessionId: session.id,
                identityLevel: participant.identityLevel as 'account' | 'roster' | 'guest',
                studentId: sId,
              },
              studentState,
              exp: data.exp,
              reason: data.reason,
              timestamp: Date.now(),
            },
            storageAdapter
          );
        }
      } else {
        lastResult = await rewards.grant(
          {
            participant: {
              id: participant.id,
              sessionId: session.id,
              identityLevel: participant.identityLevel as 'account' | 'roster' | 'guest',
              studentId: null,
            },
            studentState: null,
            exp: data.exp,
            reason: data.reason,
            timestamp: Date.now(),
          },
          storageAdapter
        );
      }

      const result = lastResult!;

      if (wsManager) {
        const rewardEnvelope = createEnvelope({
          id: generateId(),
          type: 'REWARD_GRANTED',
          sessionId: session.id,
          payload: {
            participantId: participant.id,
            exp: data.exp,
            reason: data.reason,
            persisted: result.persisted,
            newTotalExp: result.newTotalExp,
            newLevel: result.newLevel,
            leveledUp: result.leveledUp,
            ts: result.rewardLog.ts,
          },
        });
        wsManager.broadcastToSession(session.id, rewardEnvelope);
      }

      const logDto: RewardLogDto = savedLog
        ? toRewardLogDto(savedLog)
        : {
            id: generateId(),
            sessionId: session.id,
            participantId: participant.id,
            studentId: participant.studentId ?? null,
            exp: data.exp,
            reason: data.reason,
            persisted: result.persisted,
            ts: result.rewardLog.ts,
          };

      return reply.send(
        GrantRewardResponseSchema.parse({
          success: true,
          persisted: result.persisted,
          expGranted: result.expGranted,
          studentId: result.studentId,
          newTotalExp: result.newTotalExp,
          newLevel: result.newLevel,
          leveledUp: result.leveledUp,
          rewardLog: logDto,
        })
      );
    }
  );

  /**
   * GET /api/sessions/:id/rewards
   * Lấy lịch sử thưởng của phiên học
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/sessions/:id/rewards',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply
          .status(403)
          .send(
            formatProtocolError(
              'FORBIDDEN',
              'Bạn không có quyền xem lịch sử thưởng của phiên học này.'
            )
          );
      }

      if (!rewardRepo) {
        return reply.send([]);
      }

      const logs = await rewardRepo.listBySessionId(session.id);
      return reply.send(logs.map(toRewardLogDto));
    }
  );

  /**
   * GET /api/sessions/:id/student-summary/:participantId
   * Lấy màn tổng kết cuối tiết cho học sinh (EXP nhận, danh hiệu mới, cảnh báo mã PIN) (Task 5.3)
   */
  fastify.get<{ Params: { id: string; participantId: string } }>(
    '/api/sessions/:id/student-summary/:participantId',
    async (request, reply) => {
      const { id, participantId } = request.params;

      const session = await sessionRepo.findById(id);
      if (!session) {
        return reply
          .status(404)
          .send(formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học tương ứng.'));
      }

      const participant = await participantRepo.findById(participantId);
      if (!participant || participant.sessionId !== session.id) {
        return reply
          .status(404)
          .send(
            formatProtocolError(
              'PARTICIPANT_NOT_FOUND',
              'Không tìm thấy thông tin người tham gia trong phiên học.'
            )
          );
      }

      let teamName: string | null = null;
      if (participant.teamId) {
        const team = await teamRepo.findById(participant.teamId);
        teamName = team?.name ?? null;
      }

      // Lấy lịch sử thưởng EXP của participant này trong session
      let totalExpEarned = 0;
      const expBreakdown: { reason: string; exp: number; ts: number }[] = [];
      if (rewardRepo) {
        const logs = await rewardRepo.listBySessionId(session.id);
        const participantLogs = logs.filter(l => l.participantId === participantId);
        for (const log of participantLogs) {
          totalExpEarned += log.exp;
          expBreakdown.push({
            reason: log.reason,
            exp: log.exp,
            ts: log.ts,
          });
        }
      }

      let currentLevel = 1;
      let totalAccumulatedExp = 0;
      const leveledUp = false;
      let avatarConfig = undefined;
      const newTitlesAwarded: { key: string; name: string; iconKey: string }[] = [];

      if (participant.studentId) {
        const student = await studentRepo.findById(participant.studentId);
        if (student) {
          totalAccumulatedExp = student.exp;
          currentLevel = student.level;
          if (student.avatarJson) {
            try {
              avatarConfig = JSON.parse(student.avatarJson);
            } catch {
              avatarConfig = undefined;
            }
          }
        }

        if (titleRepo) {
          const studentTitles = await titleRepo.getStudentTitles(participant.studentId);
          // Lọc những danh hiệu được cấp trong chính phiên học này (sessionId)
          const sessionTitles = studentTitles.filter(t => t.sessionId === session.id);
          for (const st of sessionTitles) {
            newTitlesAwarded.push({
              key: st.key,
              name: st.name,
              iconKey: st.iconKey,
            });
          }
        }
      }

      const isAccount = participant.identityLevel === 'account';
      const summaryData: StudentSessionSummaryItem = {
        sessionId: session.id,
        sessionCode: session.joinCode,
        participantId: participant.id,
        studentId: participant.studentId ?? null,
        displayName: participant.displayName,
        identityLevel: participant.identityLevel as 'account' | 'roster' | 'guest',
        teamName,
        totalExpEarned,
        persistedExp: isAccount,
        currentLevel,
        totalAccumulatedExp,
        leveledUp,
        expBreakdown,
        newTitlesAwarded,
        avatar: avatarConfig,
        reminderPinLogin: !isAccount,
      };

      return reply.send(
        StudentSessionSummaryResponseSchema.parse({
          summary: summaryData,
        })
      );
    }
  );
};
