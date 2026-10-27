import {
  rewards,
  calculateIndividualGameElo,
  calculateTeamMatchElo,
  type ActivityContext,
  type ActivityDefinition,
} from '@educlass/core';
import {
  generateId,
  ParticipantRepository,
  type ActivityRunRepository,
  type ActivityRunSelect,
  type ClassRepository,
  type ExamRecordRepository,
  type ExamRepository,
  type RewardRepository,
  type SessionRepository,
  type StudentRepository,
} from '@educlass/db';
import {
  createEnvelope,
  type ActivityReject,
  type ActivityRunDto,
} from '@educlass/protocol';
import type { WsGatewayManager } from '../ws/gateway.js';
import type { ActivityRegistry } from './registry.js';
import type { RewardRuleService } from '../rewards/reward-rule-service.js';
import type { BeaconService } from '../services/beacon-service.js';
import {
  cleanupSessionObjectCameraFiles,
  cleanupUnpinnedObjectCameraFiles,
} from '../services/object-camera-storage.js';

export interface ActiveSessionRun {
  run: ActivityRunSelect;
  activity: ActivityDefinition;
  state: unknown;
  revision: number;
}

export interface ActivityEngineOptions {
  registry: ActivityRegistry;
  activityRunRepo: ActivityRunRepository;
  rewardRepo?: RewardRepository | undefined;
  rewardRuleService?: RewardRuleService | undefined;
  sessionRepo?: SessionRepository | undefined;
  studentRepo?: StudentRepository | undefined;
  participantRepo?: ParticipantRepository | undefined;
  classRepo?: ClassRepository | undefined;
  wsManager?: WsGatewayManager | undefined;
  examRecordRepo?: ExamRecordRepository | undefined;
  examRepo?: ExamRepository | undefined;
  beaconService?: BeaconService | undefined;
}

export class ActivityEngine {
  private activeRuns = new Map<string, ActiveSessionRun>(); // runId -> ActiveSessionRun
  private broadcastTimers = new Map<string, NodeJS.Timeout>(); // `${sessionId}:${runId}` -> Timeout

  constructor(private options: ActivityEngineOptions) {}

  /**
   * Phát sóng cập nhật trạng thái tới các clients qua WebSocket (hỗ trợ gom/throttle khi có nhiều intent đồng thời)
   */
  private broadcastActiveState(
    sessionId: string,
    active: ActiveSessionRun,
    immediate = false
  ): void {
    if (!this.options.wsManager) return;
    const timerKey = `${sessionId}:${active.run.id}`;

    const doBroadcast = () => {
      this.broadcastTimers.delete(timerKey);
      if (!this.options.wsManager) return;
      this.options.wsManager.broadcastToSession(
        sessionId,
        createEnvelope({
          id: generateId(),
          type: 'activity_state',
          sessionId,
          payload: {
            runId: active.run.id,
            activityId: active.run.activityId,
            state: active.state,
            revision: active.revision,
            ts: Date.now(),
          },
        })
      );
    };

    if (immediate) {
      const existing = this.broadcastTimers.get(timerKey);
      if (existing) {
        clearTimeout(existing);
        this.broadcastTimers.delete(timerKey);
      }
      doBroadcast();
      return;
    }

    if (!this.broadcastTimers.has(timerKey)) {
      const timer = setTimeout(doBroadcast, 25);
      this.broadcastTimers.set(timerKey, timer);
    }
  }

  /**
   * Lấy danh sách các lượt chạy đang hoạt động trong phiên
   */
  private getRunsForSession(sessionId: string): ActiveSessionRun[] {
    const list: ActiveSessionRun[] = [];
    for (const item of this.activeRuns.values()) {
      if (item.run.sessionId === sessionId) {
        list.push(item);
      }
    }
    return list;
  }

  /**
   * Tìm lượt chạy theo sessionId và tùy chọn runId hoặc activityId
   */
  private findActiveRun(sessionId: string, runIdOrActivityId?: string): ActiveSessionRun | undefined {
    if (runIdOrActivityId) {
      // 1. Tìm chính xác theo runId
      const byRunId = this.activeRuns.get(runIdOrActivityId);
      if (
        byRunId &&
        (byRunId.run.sessionId === sessionId || sessionId === 'active' || sessionId === 'current' || !sessionId)
      ) {
        return byRunId;
      }
      // 2. Tìm theo activityId hoặc runId trong phiên
      for (const item of this.activeRuns.values()) {
        if (
          (item.run.sessionId === sessionId || sessionId === 'active' || sessionId === 'current' || !sessionId) &&
          (item.run.id === runIdOrActivityId || item.run.activityId === runIdOrActivityId)
        ) {
          return item;
        }
      }
    }

    // 3. Nếu không chỉ định runIdOrActivityId:
    // Ưu tiên trả về hoạt động chính (không phải assignment-hub), nếu không có mới trả về assignment-hub
    const sessionRuns = this.getRunsForSession(sessionId);
    if (sessionRuns.length === 0) {
      if (sessionId === 'active' || sessionId === 'current' || !sessionId) {
        return this.activeRuns.values().next().value;
      }
      return undefined;
    }

    const mainRun = sessionRuns.find((r) => r.run.activityId !== 'assignment-hub');
    return mainRun ?? sessionRuns[0];
  }

  /**
   * Tạo ActivityContext an toàn cho Activity plugin
   */
  private createContext(sessionId: string, runId: string, activityId?: string): ActivityContext {
    const currentActivityId = activityId ?? this.activeRuns.get(runId)?.activity.id ?? null;

    return {
      sessionId,
      runId,
      now: () => Date.now(),
      rng: () => Math.random(),
      broadcast: (payload: unknown) => {
        if (this.options.wsManager) {
          const env = createEnvelope({
            id: generateId(),
            type: 'activity_state',
            sessionId,
            payload,
          });
          this.options.wsManager.broadcastToSession(sessionId, env);
        }
      },
      sendToParticipant: (_participantId: string, _payload: unknown) => {
        // Có thể mở rộng gửi riêng qua WS client
      },
      grantReward: async (participantId: string, trigger: string, qty = 10) => {
        if (
          !this.options.rewardRepo ||
          !this.options.studentRepo ||
          !this.options.participantRepo
        ) {
          return;
        }

        const participant = await this.options.participantRepo.findById(participantId);
        if (!participant) return;

        let expToGrant = qty;
        let isCapped = false;
        let reason = currentActivityId ? `Hoạt động ${currentActivityId}: ${trigger}` : `Hoạt động: ${trigger}`;

        // Nếu có RewardRuleService: tính điểm theo luật GV và kiểm tra trần EXP chống lạm phát
        if (this.options.rewardRuleService) {
          let teacherId: string | null = null;
          if (this.options.sessionRepo) {
            const session = await this.options.sessionRepo.findById(sessionId);
            teacherId = session?.ownerId ?? null;
          }

          const calc = await this.options.rewardRuleService.calculateExpToGrant({
            sessionId,
            participantId,
            teacherId,
            activityId: currentActivityId,
            trigger,
            defaultExp: qty,
          });

          if (calc.isRuleDisabled || calc.expGranted <= 0) {
            return;
          }

          expToGrant = calc.expGranted;
          isCapped = calc.isCapped;
          if (isCapped) {
            reason += ' (đã áp trần EXP)';
          }
        }

        const studentIds = ParticipantRepository.getStudentIds(participant);

        const storageAdapter = {
          saveReward: async (rewardData: {
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
          }) => {
            await this.options.rewardRepo!.recordRewardTransaction({
              rewardLog: {
                id: generateId(),
                ...rewardData.rewardLog,
              },
              studentUpdate: rewardData.studentUpdate,
            });
          },
        };

        if (studentIds.length > 0) {
          // Phát thưởng độc lập cho từng học sinh trong nhóm máy
          for (const sId of studentIds) {
            let studentState = null;
            const studentAccount = await this.options.studentRepo.findById(sId);
            if (studentAccount) {
              studentState = {
                id: studentAccount.id,
                exp: studentAccount.exp,
                level: studentAccount.level,
              };
            }

            await rewards.grant(
              {
                participant: {
                  id: participant.id,
                  sessionId: participant.sessionId,
                  identityLevel: participant.identityLevel as 'account' | 'roster' | 'guest',
                  studentId: sId,
                },
                studentState,
                exp: expToGrant,
                reason,
              },
              storageAdapter
            );
          }
        } else {
          // Dành cho khách tự do không liên kết tài khoản
          await rewards.grant(
            {
              participant: {
                id: participant.id,
                sessionId: participant.sessionId,
                identityLevel: participant.identityLevel as 'account' | 'roster' | 'guest',
                studentId: null,
              },
              studentState: null,
              exp: expToGrant,
              reason,
            },
            storageAdapter
          );
        }
      },
    };
  }

  /**
   * Lưu hoặc cập nhật kết quả kỳ thi vào bảng exam_records nếu lượt chạy này gắn với một kỳ thi (examId)
   */
  private async persistExamRecordIfApplicable(
    active: ActiveSessionRun,
    participantId: string,
    targetStatus: 'in_progress' | 'submitted' = 'submitted'
  ): Promise<void> {
    if (!this.options.examRecordRepo || !this.options.participantRepo) {
      return;
    }

    if (active.run.activityId !== 'exam') {
      return;
    }

    let config: { examId?: string; batchIndex?: number } = {};
    try {
      config = JSON.parse(active.run.configJson) as { examId?: string; batchIndex?: number };
    } catch {
      return;
    }

    if (!config.examId) {
      return;
    }

    const participant = await this.options.participantRepo.findById(participantId);
    if (!participant) {
      return;
    }

    let studentId = participant.studentId;
    if (!studentId && this.options.studentRepo) {
      let targetClassId: string | null = null;
      if (this.options.sessionRepo) {
        const session = await this.options.sessionRepo.findById(active.run.sessionId);
        if (session?.classId) targetClassId = session.classId;
      }
      if (!targetClassId && this.options.examRepo && config.examId) {
        const examObj = await this.options.examRepo.findById(config.examId);
        if (examObj?.classId) targetClassId = examObj.classId;
      }

      if (targetClassId) {
        const students = await this.options.studentRepo.listByClassId(targetClassId);
        const match = students.find(
          (s) => s.fullName.trim().toLowerCase() === participant.displayName.trim().toLowerCase()
        );
        if (match) {
          studentId = match.id;
        }
      }
    }

    // Nếu học sinh tự do không thuộc danh sách lớp, dùng chính participant.id làm studentId để không bỏ sót bài thi
    if (!studentId) {
      studentId = participant.id;
    }

    // Nếu bài đã nộp (submitted), không cho phép ghi đè lại thành 'in_progress'
    const existing = await this.options.examRecordRepo.findByExamAndStudent(config.examId, studentId);
    if (existing && existing.status === 'submitted' && targetStatus === 'in_progress') {
      return;
    }

    const stateObj = active.state as {
      totalQuestions?: number;
      participants?: Record<
        string,
        {
          displayName?: string;
          isSubmitted?: boolean;
          submittedAt?: number | null;
          startedAt?: number | null;
          answers?: Record<string, unknown>;
          reviewData?: unknown;
          result?: {
            score?: number;
            maxScore?: number;
            percentage?: number;
            correctCount?: number;
            totalQuestions?: number;
          };
        }
      >;
    };

    const pState = stateObj.participants?.[participantId];
    if (!pState) {
      return;
    }

    if (targetStatus === 'submitted' && !pState.isSubmitted) {
      return;
    }

    const effectiveStatus: 'in_progress' | 'submitted' = pState.isSubmitted ? 'submitted' : targetStatus;
    const studentName = pState.displayName || participant.displayName || 'Học sinh';
    const batchIndex = typeof config.batchIndex === 'number' ? config.batchIndex : 1;
    const score = pState.result?.score ?? 0;
    const maxScore = pState.result?.maxScore ?? 10;
    const percentage = pState.result?.percentage ?? 0;
    const correctCount = pState.result?.correctCount ?? 0;
    const totalQuestions = pState.result?.totalQuestions ?? stateObj.totalQuestions ?? 1;
    const answersJson = JSON.stringify(pState.answers ?? {});
    const resultJson = pState.reviewData || pState.result ? JSON.stringify(pState.reviewData ?? pState.result ?? {}) : null;
    const timeSpentSeconds =
      pState.startedAt
        ? Math.max(
            0,
            Math.round(((pState.submittedAt ?? Date.now()) - pState.startedAt) / 1000)
          )
        : 0;
    const submittedAt = pState.submittedAt ?? (effectiveStatus === 'submitted' ? Date.now() : (pState.startedAt ?? Date.now()));

    try {
      await this.options.examRecordRepo.upsert({
        examId: config.examId,
        studentId,
        studentName,
        batchIndex,
        status: effectiveStatus,
        score,
        maxScore,
        percentage,
        correctCount,
        totalQuestions,
        answersJson,
        resultJson,
        timeSpentSeconds,
        submittedAt,
      });
    } catch (err) {
      console.error('[ActivityEngine] Lỗi upsert examRecord:', err);
    }
  }

  /**
   * Lưu kết quả của toàn bộ thí sinh vào exam_records khi kết thúc lượt chạy kỳ thi
   */
  private async persistAllExamRecordsOnEnd(active: ActiveSessionRun): Promise<void> {
    if (!this.options.examRecordRepo || !this.options.participantRepo) {
      return;
    }

    if (active.run.activityId !== 'exam') {
      return;
    }

    let config: { examId?: string; batchIndex?: number } = {};
    try {
      config = JSON.parse(active.run.configJson) as { examId?: string; batchIndex?: number };
    } catch {
      return;
    }

    if (!config.examId) {
      return;
    }

    const stateObj = active.state as {
      totalQuestions?: number;
      participants?: Record<
        string,
        {
          displayName?: string;
          isSubmitted?: boolean;
          submittedAt?: number | null;
          startedAt?: number | null;
          answers?: Record<string, unknown>;
          reviewData?: unknown;
          result?: {
            score?: number;
            maxScore?: number;
            percentage?: number;
            correctCount?: number;
            totalQuestions?: number;
          };
        }
      >;
    };

    if (!stateObj.participants) return;

    for (const [participantId, pState] of Object.entries(stateObj.participants)) {
      const participant = await this.options.participantRepo.findById(participantId);
      if (!participant) continue;

      let studentId = participant.studentId;
      if (!studentId && this.options.studentRepo) {
        let targetClassId: string | null = null;
        if (this.options.sessionRepo) {
          const session = await this.options.sessionRepo.findById(active.run.sessionId);
          if (session?.classId) targetClassId = session.classId;
        }
        if (!targetClassId && this.options.examRepo && config.examId) {
          const examObj = await this.options.examRepo.findById(config.examId);
          if (examObj?.classId) targetClassId = examObj.classId;
        }

        if (targetClassId) {
          const students = await this.options.studentRepo.listByClassId(targetClassId);
          const match = students.find(
            (s) => s.fullName.trim().toLowerCase() === participant.displayName.trim().toLowerCase()
          );
          if (match) {
            studentId = match.id;
          }
        }
      }
      if (!studentId) {
        studentId = participant.id;
      }
      const studentName = pState.displayName || participant.displayName || 'Học sinh';
      const batchIndex = typeof config.batchIndex === 'number' ? config.batchIndex : 1;
      const score = pState.result?.score ?? 0;
      const maxScore = pState.result?.maxScore ?? 10;
      const percentage = pState.result?.percentage ?? 0;
      const correctCount = pState.result?.correctCount ?? 0;
      const totalQuestions = pState.result?.totalQuestions ?? stateObj.totalQuestions ?? 1;
      const answersJson = JSON.stringify(pState.answers ?? {});
      const resultJson = JSON.stringify(pState.reviewData ?? pState.result ?? {});
      const timeSpentSeconds =
        pState.startedAt && pState.submittedAt
          ? Math.max(0, Math.round((pState.submittedAt - pState.startedAt) / 1000))
          : 0;
      const submittedAt = pState.submittedAt ?? Date.now();

      try {
        await this.options.examRecordRepo.upsert({
          examId: config.examId,
          studentId,
          studentName,
          batchIndex,
          status: 'submitted',
          score,
          maxScore,
          percentage,
          correctCount,
          totalQuestions,
          answersJson,
          resultJson,
          timeSpentSeconds,
          submittedAt,
        });
      } catch (err) {
        console.error('[ActivityEngine] Lỗi upsert examRecord cho học sinh ' + studentId + ':', err);
      }
    }
  }

  /**
   * Bắt đầu một lượt chạy Activity mới cho phiên học (hỗ trợ chạy song song kì thi & thu bài)
   */
  async startActivity(
    sessionId: string,
    activityId: string,
    rawConfig: unknown = {}
  ): Promise<{ run: ActivityRunDto; state: unknown }> {
    // 1. Kiểm tra Activity trong registry
    const activity = this.options.registry.get(activityId);
    if (!activity) {
      throw new Error(`Hoạt động "${activityId}" không tồn tại trong hệ thống.`);
    }

    // 2. Xử lý các hoạt động đang chạy trong phiên:
    // Quy tắc chạy song song:
    // - 'assignment-hub' là tiện ích nền: có thể chạy song song với hoạt động chính (exam, quiz-live...).
    // - Nếu mở 'assignment-hub' mới: đóng 'assignment-hub' cũ nếu có, giữ nguyên hoạt động chính.
    // - Nếu mở hoạt động chính mới: đóng hoạt động chính cũ, nhưng GIỮ NGUYÊN 'assignment-hub'.
    const existingRuns = this.getRunsForSession(sessionId);
    for (const existing of existingRuns) {
      if (activityId === 'assignment-hub') {
        if (existing.run.activityId === 'assignment-hub') {
          await this.endActivity(sessionId, existing.run.id);
        }
      } else {
        if (existing.run.activityId !== 'assignment-hub') {
          await this.endActivity(sessionId, existing.run.id);
        }
      }
    }

    // 3. Validate cấu hình bằng Zod configSchema
    const config = activity.configSchema.parse(rawConfig);

    // Nếu là hoạt động thi ('exam'), đảm bảo luôn có examId và batchIndex liên kết
    let finalConfig = config;
    if (activityId === 'exam') {
      const cfgObj = { ...(config as Record<string, unknown>) };
      if (!cfgObj['examId'] && this.options.sessionRepo && this.options.examRepo) {
        try {
          const session = await this.options.sessionRepo.findById(sessionId);
          if (session) {
            let targetClassId = (typeof cfgObj['classId'] === 'string' && cfgObj['classId']) ? cfgObj['classId'] : session.classId;

            // Nếu phiên tự do chưa có classId, tìm lớp có sẵn của giáo viên
            if (!targetClassId && this.options.classRepo) {
              const teacherClasses = await this.options.classRepo.list({ ownerId: session.ownerId });
              if (teacherClasses.length > 0) {
                targetClassId = teacherClasses[0]!.id;
              } else {
                // Nếu giáo viên chưa có bất kỳ lớp nào, tự tạo một lớp mặc định để lưu báo cáo kỳ thi
                const defaultClass = await this.options.classRepo.create({
                  ownerId: session.ownerId,
                  name: 'Lớp Chung (Tự do)',
                  year: new Date().getFullYear(),
                });
                targetClassId = defaultClass.id;
              }
            }

            if (targetClassId) {
              // Đồng bộ classId vào phiên học nếu phiên đang là tự do
              if (!session.classId) {
                try {
                  await this.options.sessionRepo.updateClassId(session.id, targetClassId);
                } catch {
                  // ignore nếu method không tồn tại
                }
              }

              const existingExam = await this.options.examRepo.findBySessionId(sessionId);
              if (existingExam) {
                cfgObj['examId'] = existingExam.id;
                cfgObj['batchIndex'] = existingExam.currentBatch;
              } else {
                const newExam = await this.options.examRepo.create({
                  ownerId: session.ownerId,
                  classId: targetClassId,
                  title: String(cfgObj['title'] || 'Kỳ thi theo ca').trim(),
                  subject: typeof cfgObj['subject'] === 'string' ? cfgObj['subject'] : null,
                  durationMinutes: typeof cfgObj['durationMinutes'] === 'number' ? cfgObj['durationMinutes'] : 45,
                  configJson: JSON.stringify(cfgObj),
                  questionsSnapshotJson: JSON.stringify(cfgObj['questions'] ?? []),
                  status: 'in_progress',
                  currentBatch: 1,
                });
                await this.options.examRepo.attachSession(newExam.id, sessionId, 1);
                cfgObj['examId'] = newExam.id;
                cfgObj['batchIndex'] = 1;
              }
              finalConfig = cfgObj as typeof config;
            }
          }
        } catch (e) {
          console.warn('[ActivityEngine] Không thể tự động liên kết examId:', e);
        }
      }
    }

    // 4. Khởi tạo runId và Context
    const runId = generateId();
    const ctx = this.createContext(sessionId, runId, activityId);

    // 5. Gọi lifecycle onStart của Activity
    const initialState = activity.server.onStart(ctx, finalConfig);
    activity.stateSchema.parse(initialState);

    // 6. Lưu vào CSDL bảng activity_runs
    const dbRun = await this.options.activityRunRepo.createRun({
      id: runId,
      sessionId,
      activityId,
      configJson: JSON.stringify(finalConfig),
      status: 'running',
      startedAt: Date.now(),
    });

    // 7. Lưu vào in-memory cache theo runId
    this.activeRuns.set(runId, {
      run: dbRun,
      activity,
      state: initialState,
      revision: 0,
    });

    // 8. Phát sóng WebSocket thông báo bắt đầu
    if (this.options.wsManager) {
      this.options.wsManager.broadcastToSession(
        sessionId,
        createEnvelope({
          id: generateId(),
          type: 'activity_start',
          sessionId,
          payload: {
            runId: dbRun.id,
            activityId: dbRun.activityId,
            config,
            startedAt: dbRun.startedAt,
          },
        })
      );

      this.options.wsManager.broadcastToSession(
        sessionId,
        createEnvelope({
          id: generateId(),
          type: 'activity_state',
          sessionId,
          payload: {
            runId: dbRun.id,
            activityId: dbRun.activityId,
            state: initialState,
            revision: 0,
            ts: Date.now(),
          },
        })
      );
    }

    // 8.1. Thông báo UDP Beacon Wake-on-Activity để máy học sinh tự động bung cửa sổ lên lại
    if (this.options.beaconService) {
      this.options.beaconService.notifyActivityStarted({
        activityId: dbRun.activityId,
        runId: dbRun.id,
      });
    }

    return {
      run: {
        id: dbRun.id,
        sessionId: dbRun.sessionId,
        activityId: dbRun.activityId,
        config,
        status: dbRun.status as 'ready' | 'running' | 'ended',
        startedAt: dbRun.startedAt,
        endedAt: dbRun.endedAt,
      },
      state: initialState,
    };
  }

  /**
   * Xử lý ý định hành động từ Học sinh
   */
  async handleStudentIntent(
    sessionId: string,
    participantId: string,
    runId: string,
    intent: unknown
  ): Promise<{ ok: true; state: unknown } | ActivityReject> {
    const active = this.findActiveRun(sessionId, runId);
    if (!active) {
      return {
        ok: false,
        reason: 'Lượt hoạt động này không còn khả dụng hoặc đã kết thúc.',
        code: 'RUN_NOT_ACTIVE',
      };
    }

    // Kiểm tra nếu là hoạt động thi và học sinh đã thi ở ca trước (completedStudentIds)
    if (active.run.activityId === 'exam' && this.options.participantRepo) {
      let examCfg: { completedStudentIds?: string[] } = {};
      try {
        examCfg = JSON.parse(active.run.configJson) as { completedStudentIds?: string[] };
      } catch {
        // ignore
      }
      if (examCfg.completedStudentIds && examCfg.completedStudentIds.length > 0) {
        const participant = await this.options.participantRepo.findById(participantId);
        if (participant?.studentId && examCfg.completedStudentIds.includes(participant.studentId)) {
          return {
            ok: false,
            code: 'ALREADY_SUBMITTED',
            reason: 'Em đã nộp bài thi ở ca trước và không thể làm lại.',
          };
        }
      }
    }

    // Đảm bảo tên hiển thị của học sinh luôn chính xác từ DB
    let enrichedIntent = intent;
    if (this.options.participantRepo && intent && typeof intent === 'object') {
      const intentObj = intent as Record<string, unknown>;
      if (!intentObj['displayName']) {
        const participant = await this.options.participantRepo.findById(participantId);
        if (participant?.displayName) {
          enrichedIntent = {
            ...intentObj,
            displayName: participant.displayName,
          };
        }
      }
    }

    const ctx = this.createContext(sessionId, active.run.id);
    const result = active.activity.server.onStudentIntent(
      ctx,
      active.state,
      participantId,
      enrichedIntent
    );

    if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
      return result as ActivityReject;
    }

    // Cập nhật trạng thái mới
    active.state = result;
    active.revision++;

    // Tự động lưu bản ghi bài thi nếu là hành động làm bài hoặc nộp bài
    if (
      active.run.activityId === 'exam' &&
      intent &&
      typeof intent === 'object' &&
      'type' in intent
    ) {
      const intentType = (intent as { type: unknown }).type;
      if (intentType === 'submit_exam') {
        try {
          await this.persistExamRecordIfApplicable(active, participantId, 'submitted');
        } catch {
          // ignore
        }
      } else if (
        intentType === 'get_paper' ||
        intentType === 'unlock_exam' ||
        intentType === 'save_answer' ||
        intentType === 'report_status'
      ) {
        try {
          await this.persistExamRecordIfApplicable(active, participantId, 'in_progress');
        } catch {
          // ignore
        }
      }
    }

    // Phát sóng trạng thái mới tới toàn phiên (throttled 25ms khi có nhiều student intent dồn dập)
    this.broadcastActiveState(sessionId, active, false);

    return { ok: true, state: active.state };
  }

  /**
   * Xử lý ý định điều khiển từ Giáo viên
   */
  async handleTeacherIntent(
    sessionId: string,
    runId: string,
    intent: unknown
  ): Promise<{ ok: true; state: unknown } | ActivityReject> {
    const active = this.findActiveRun(sessionId, runId);
    if (!active) {
      return {
        ok: false,
        reason: 'Lượt hoạt động này không còn khả dụng.',
        code: 'RUN_NOT_ACTIVE',
      };
    }

    const ctx = this.createContext(sessionId, active.run.id);
    const nextState = active.activity.server.onTeacherIntent(ctx, active.state, intent);

    active.activity.stateSchema.parse(nextState);
    active.state = nextState;
    active.revision++;

    // Tự động lưu bản ghi bài thi nếu giáo viên ép nộp bài hoặc đóng bài thi
    if (active.run.activityId === 'exam' && intent && typeof intent === 'object' && 'type' in intent) {
      const teacherIntentObj = intent as { type: unknown; participantId?: unknown };
      if (
        teacherIntentObj.type === 'force_submit_student' &&
        typeof teacherIntentObj.participantId === 'string'
      ) {
        try {
          await this.persistExamRecordIfApplicable(active, teacherIntentObj.participantId);
        } catch {
          // ignore
        }
      } else if (teacherIntentObj.type === 'close_exam') {
        try {
          await this.persistAllExamRecordsOnEnd(active);
        } catch {
          // ignore
        }
      }
    }

    // Phát sóng trạng thái mới ngay lập tức tới toàn phiên
    this.broadcastActiveState(sessionId, active, true);

    return { ok: true, state: active.state };
  }

  /**
   * Kết thúc lượt chạy Activity
   */
  async endActivity(
    sessionId: string,
    runId: string
  ): Promise<{ runId: string; activityId: string; results: unknown[]; endedAt: number }> {
    const active = this.findActiveRun(sessionId, runId);
    if (!active) {
      throw new Error('Lượt hoạt động không tồn tại hoặc đã kết thúc từ trước.');
    }

    const targetRunId = active.run.id;
    const timerKey = `${sessionId}:${targetRunId}`;

    // Hủy timer phát sóng đang chờ nếu có
    const pendingTimer = this.broadcastTimers.get(timerKey);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.broadcastTimers.delete(timerKey);
    }

    const endedAt = Date.now();
    const ctx = this.createContext(sessionId, targetRunId);

    // 1. Thu thập kết quả từ Activity plugin
    const rawResults = active.activity.server.onEnd(ctx, active.state);
    const results = rawResults.map((r) => active.activity.resultSchema.parse(r));

    // 2. Cập nhật trạng thái CSDL
    await this.options.activityRunRepo.updateRunStatus(targetRunId, 'ended', endedAt);

    // 3. Lưu snapshot kết quả vào CSDL
    if (results.length > 0) {
      try {
        let validResults = results;
        if (this.options.participantRepo) {
          const participants = await this.options.participantRepo.listBySessionId(sessionId);
          const validParticipantIds = new Set(participants.map((p) => p.id));
          validResults = results.filter((r) => {
            const item = r as Record<string, unknown>;
            const participantId = String(item['participantId'] ?? '');
            return (
              participantId !== '' &&
              participantId !== 'teacher' &&
              validParticipantIds.has(participantId)
            );
          });
        } else {
          validResults = results.filter((r) => {
            const item = r as Record<string, unknown>;
            const participantId = String(item['participantId'] ?? '');
            return participantId !== '' && participantId !== 'teacher';
          });
        }

        if (validResults.length > 0) {
          await this.options.activityRunRepo.saveResults(
            targetRunId,
            validResults.map((r) => {
              const item = r as Record<string, unknown>;
              const participantId = String(item['participantId'] ?? '');
              const rank = typeof item['rank'] === 'number' ? item['rank'] : null;
              return {
                participantId,
                scoreJson: JSON.stringify(item),
                rank,
              };
            })
          );
        }
      } catch (saveError) {
        console.error(`[ActivityEngine] Lỗi lưu activity_results cho runId ${targetRunId}:`, saveError);
      }
    }

    // 4. Lưu kết quả vĩnh viễn vào exam_records nếu là hoạt động kỳ thi
    if (active.run.activityId === 'exam') {
      try {
        await this.persistAllExamRecordsOnEnd(active);
      } catch {
        // ignore
      }
    }

    // 4.1. Tự động dọn sạch các file ảnh tạm chưa ghim nếu là hoạt động camera vật thể
    if (active.run.activityId === 'object-camera') {
      try {
        const cameraState = active.state as {
          photos?: Array<{ url: string; isPinned?: boolean }>;
        };
        const pinnedUrls = (cameraState?.photos || [])
          .filter((p) => p.isPinned)
          .map((p) => p.url);

        if (pinnedUrls.length === 0) {
          cleanupSessionObjectCameraFiles(sessionId);
        } else {
          await cleanupUnpinnedObjectCameraFiles(sessionId, pinnedUrls);
        }
      } catch (cleanErr) {
        console.warn(
          `[ActivityEngine] Lỗi dọn dẹp file tạm object-camera cho session ${sessionId}:`,
          cleanErr
        );
      }
    }

    // 4.2. Cập nhật điểm Elo ẩn cho học sinh dựa trên kết quả thi đấu/hoạt động
    try {
      await this.updateStudentEloOnEnd(active, results);
    } catch (eloErr) {
      console.warn(`[ActivityEngine] Lỗi cập nhật Elo ẩn cho session ${sessionId}:`, eloErr);
    }

    // 5. Xóa khỏi bộ nhớ theo runId
    this.activeRuns.delete(targetRunId);

    // 5. Phát sóng thông báo kết thúc
    if (this.options.wsManager) {
      this.options.wsManager.broadcastToSession(
        sessionId,
        createEnvelope({
          id: generateId(),
          type: 'activity_end',
          sessionId,
          payload: {
            runId: targetRunId,
            activityId: active.run.activityId,
            results,
            endedAt,
          },
        })
      );
    }

    // 5.1. Cập nhật Beacon Service
    if (this.options.beaconService) {
      this.options.beaconService.notifyActivityEnded();
    }

    return {
      runId: targetRunId,
      activityId: active.run.activityId,
      results,
      endedAt,
    };
  }

  /**
   * Lấy thông tin một lượt chạy Activity (mặc định là hoạt động chính, hoặc theo runId/activityId)
   */
  getActiveRun(
    sessionId: string,
    runIdOrActivityId?: string
  ): { run: ActivityRunDto; state: unknown } | null {
    const active = this.findActiveRun(sessionId, runIdOrActivityId);
    if (!active) return null;

    let parsedConfig: unknown = {};
    try {
      parsedConfig = JSON.parse(active.run.configJson);
    } catch {
      parsedConfig = {};
    }

    return {
      run: {
        id: active.run.id,
        sessionId: active.run.sessionId,
        activityId: active.run.activityId,
        config: parsedConfig,
        status: active.run.status as 'ready' | 'running' | 'ended',
        startedAt: active.run.startedAt,
        endedAt: active.run.endedAt,
      },
      state: active.state,
    };
  }

  /**
   * Lấy danh sách tất cả các lượt chạy đang hoạt động trong phiên (hỗ trợ chạy song song)
   */
  getActiveRuns(sessionId: string): Array<{ run: ActivityRunDto; state: unknown }> {
    const runs = this.getRunsForSession(sessionId);
    return runs.map((active) => {
      let parsedConfig: unknown = {};
      try {
        parsedConfig = JSON.parse(active.run.configJson);
      } catch {
        parsedConfig = {};
      }

      return {
        run: {
          id: active.run.id,
          sessionId: active.run.sessionId,
          activityId: active.run.activityId,
          config: parsedConfig,
          status: active.run.status as 'ready' | 'running' | 'ended',
          startedAt: active.run.startedAt,
          endedAt: active.run.endedAt,
        },
        state: active.state,
      };
    });
  }

  /**
   * Cập nhật điểm Elo ẩn cho học sinh khi kết thúc hoạt động
   */
  private async updateStudentEloOnEnd(
    active: ActiveSessionRun,
    results: unknown[]
  ): Promise<void> {
    if (!this.options.studentRepo || !this.options.participantRepo) return;
    if (results.length === 0) return;

    const activityId = active.run.activityId;
    const sessionId = active.run.sessionId;

    const participants = await this.options.participantRepo.listBySessionId(sessionId);
    const participantMap = new Map(participants.map((p) => [p.id, p]));

    // 1. Đối với trò chơi đồng đội 2 phe: Đại Chiến Lãnh Thổ (territory-war)
    if (activityId === 'territory-war') {
      const stateObj = active.state as {
        winnerTeam?: 'blue' | 'red' | 'draw' | null;
      };
      const winner = stateObj.winnerTeam ?? 'draw';

      const teamBlueInputs: Array<{ id: string; studentId: string; elo: number; contribution: number }> = [];
      const teamRedInputs: Array<{ id: string; studentId: string; elo: number; contribution: number }> = [];

      for (const raw of results) {
        const item = raw as Record<string, unknown>;
        const participantId = String(item['participantId'] ?? '');
        const team = item['team'] === 'blue' ? 'blue' : item['team'] === 'red' ? 'red' : null;
        if (!team) continue;

        const part = participantMap.get(participantId);
        if (!part) continue;

        // Lấy danh sách studentIds (cả đơn và ghép nhiều bạn 1 máy)
        const sIds = ParticipantRepository.getStudentIds(part);
        if (sIds.length === 0 && part.studentId) sIds.push(part.studentId);
        if (sIds.length === 0) continue;

        const contrib = Number(item['pointsContributed'] ?? item['score'] ?? 0);

        for (const sId of sIds) {
          const student = await this.options.studentRepo.findById(sId);
          if (student) {
            const elo = (student as { elo?: number }).elo ?? 1000;
            const entry = { id: participantId, studentId: sId, elo, contribution: contrib };
            if (team === 'blue') teamBlueInputs.push(entry);
            else teamRedInputs.push(entry);
          }
        }
      }

      if (teamBlueInputs.length > 0 || teamRedInputs.length > 0) {
        const matchResults = calculateTeamMatchElo(
          teamBlueInputs.map((b) => ({ id: b.studentId, elo: b.elo, contribution: b.contribution })),
          teamRedInputs.map((r) => ({ id: r.studentId, elo: r.elo, contribution: r.contribution })),
          winner
        );

        for (const [studentId, change] of Object.entries(matchResults)) {
          await this.options.studentRepo.update(studentId, { elo: change.newElo });
        }
      }
      return;
    }

    // 2. Đối với trò chơi cá nhân: Quiz Live / Quizizz / Kahoot / Đường Đua Tri Thức
    if (activityId === 'quiz-live' || activityId === 'circuit-race') {
      const validParticipants: Array<{
        studentId: string;
        accuracyRatio: number;
        currentElo: number;
      }> = [];

      let totalAccuracy = 0;

      for (const raw of results) {
        const item = raw as Record<string, unknown>;
        const participantId = String(item['participantId'] ?? '');
        const part = participantMap.get(participantId);
        if (!part) continue;

        const sIds = ParticipantRepository.getStudentIds(part);
        if (sIds.length === 0 && part.studentId) sIds.push(part.studentId);
        if (sIds.length === 0) continue;

        let accuracyRatio = 0.5;
        if (typeof item['accuracy'] === 'number') {
          accuracyRatio = Math.max(0, Math.min(1, item['accuracy'] / 100));
        } else if (typeof item['correctCount'] === 'number' && typeof item['totalQuestions'] === 'number' && item['totalQuestions'] > 0) {
          accuracyRatio = Math.max(0, Math.min(1, item['correctCount'] / item['totalQuestions']));
        }

        totalAccuracy += accuracyRatio;

        for (const sId of sIds) {
          const student = await this.options.studentRepo.findById(sId);
          if (student) {
            const currentElo = (student as { elo?: number }).elo ?? 1000;
            validParticipants.push({ studentId: sId, accuracyRatio, currentElo });
          }
        }
      }

      if (validParticipants.length > 0) {
        const avgAccuracy = totalAccuracy / Math.max(1, results.length);
        for (const vp of validParticipants) {
          const { newElo } = calculateIndividualGameElo(vp.currentElo, vp.accuracyRatio, avgAccuracy);
          await this.options.studentRepo.update(vp.studentId, { elo: newElo });
        }
      }
    }
  }
}
