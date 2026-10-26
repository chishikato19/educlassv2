import { z } from 'zod';
import type { ActivityContext, ActivityDefinition } from '@educlass/core';
import type { ActivityReject } from '@educlass/protocol';
import {
  stripAnswerKey,
  gradeQuestion,
  richTextToString,
  type Question,
} from '@educlass/question-kit';
import {
  ExamConfigSchema,
  ExamResultSchema,
  ExamStateSchema,
  type ExamConfig,
  type ExamResult,
  type ExamState,
  type ParticipantExamStatus,
} from './exam-schemas.js';
import {
  generateStudentExamVariant,
  unmapStudentAnswer,
} from './exam-shuffler.js';
import {
  calculateQuestionAnalysis,
  computeExamResults,
} from './exam-analytics.js';

interface ActiveExamData {
  questions: Question[];
  password: string | null;
}

// Lưu trữ bộ câu hỏi gốc và mật khẩu kỳ thi trên máy chủ theo runId
const activeExamConfigs = new Map<string, ActiveExamData>();

export function generateParticipantReviewData(
  rawQuestions: Question[],
  participant: ParticipantExamStatus
): Array<Record<string, unknown>> {
  const baseLabels = ['A', 'B', 'C', 'D'];
  const orderedQuestions = (() => {
    if (participant.questionOrder && participant.questionOrder.length > 0) {
      const qMap = new Map(rawQuestions.map(q => [q.id, q]));
      const list: Question[] = [];
      for (const qId of participant.questionOrder) {
        const found = qMap.get(qId);
        if (found) list.push(found);
      }
      for (const q of rawQuestions) {
        if (!list.some(l => l.id === q.id)) list.push(q);
      }
      return list;
    }
    return rawQuestions;
  })();

  return orderedQuestions.map((origQ, idx) => {
    const studentRawAnswer = participant.answers[origQ.id];
    const optionOrder = participant.optionOrders[origQ.id];
    const mappedAnswer = unmapStudentAnswer(origQ, studentRawAnswer, optionOrder);
    const grade = gradeQuestion(origQ, mappedAnswer);

    let renderedOptions: Array<{ index: number; label: string; text: string }> | undefined = undefined;
    let studentChoiceLabel: string | null = null;
    let correctChoiceLabel: string | null = null;

    if (origQ.type === 'mcq4' && Array.isArray(origQ.options)) {
      if (optionOrder && optionOrder.length === 4) {
        renderedOptions = [0, 1, 2, 3].map((pos) => {
          const origIndex = optionOrder[pos]!;
          return {
            index: pos,
            label: baseLabels[pos] ?? `${pos + 1}`,
            text: richTextToString(origQ.options[origIndex]!),
          };
        });
        if (typeof studentRawAnswer === 'number' && studentRawAnswer >= 0 && studentRawAnswer < 4) {
          studentChoiceLabel = baseLabels[studentRawAnswer] ?? `${studentRawAnswer + 1}`;
        } else if (typeof studentRawAnswer === 'object' && studentRawAnswer !== null && 'selected' in studentRawAnswer) {
          const sel = Number((studentRawAnswer as { selected: unknown }).selected);
          if (sel >= 0 && sel < 4) {
            studentChoiceLabel = baseLabels[sel] ?? `${sel + 1}`;
          }
        }
        const correctStudentPos = optionOrder.indexOf(origQ.correct);
        if (correctStudentPos >= 0) {
          correctChoiceLabel = baseLabels[correctStudentPos] ?? `${correctStudentPos + 1}`;
        }
      } else {
        renderedOptions = origQ.options.map((opt, optIdx) => ({
          index: optIdx,
          label: baseLabels[optIdx] ?? `${optIdx + 1}`,
          text: richTextToString(opt),
        }));
        if (typeof studentRawAnswer === 'number' && studentRawAnswer >= 0 && studentRawAnswer < 4) {
          studentChoiceLabel = baseLabels[studentRawAnswer] ?? `${studentRawAnswer + 1}`;
        }
        correctChoiceLabel = baseLabels[origQ.correct] ?? `${origQ.correct + 1}`;
      }
    }

    const stemImages =
      origQ.stem && typeof origQ.stem === 'object' && Array.isArray((origQ.stem as Record<string, unknown>)['images'])
        ? ((origQ.stem as Record<string, unknown>)['images'] as string[])
        : [];

    return {
      questionId: origQ.id,
      order: idx + 1,
      stemText: richTextToString(origQ.stem),
      stemImages,
      type: origQ.type,
      points: origQ.points,
      pointsEarned: grade.pointsEarned,
      isCorrect: grade.isCorrect,
      options: renderedOptions,
      studentAnswer: studentRawAnswer,
      studentChoiceLabel,
      correctAnswer: origQ.type === 'mcq4' ? correctChoiceLabel : (origQ.type === 'tf' ? origQ.correct : (origQ.type === 'short' ? origQ.accepted : (origQ as Record<string, unknown>)['correctAnswer'])),
      correctChoiceLabel,
      explanation: origQ.explanation ? richTextToString(origQ.explanation) : undefined,
    };
  });
}

export const ExamActivity: ActivityDefinition<
  ExamConfig,
  ExamState,
  ExamResult
> = {
  id: 'exam',
  name: 'Kỳ thi',
  version: 1,
  icon: '📝',
  description: 'Tổ chức kỳ thi trực tiếp: xáo câu/đáp án theo từng HS, đồng hồ đếm ngược, mật khẩu thi',
  capabilities: ['screen', 'files'],
  rewardTriggers: ['exam_finish', 'exam_high_score', 'exam_perfect'],
  configSchema: ExamConfigSchema,
  stateSchema: ExamStateSchema,
  resultSchema: ExamResultSchema,

  server: {
    onStart(ctx: ActivityContext, cfg: ExamConfig): ExamState {
      // Lưu trữ cấu hình gốc và mật khẩu vào bộ nhớ server
      const trimmedPassword = cfg.password ? cfg.password.trim() : null;
      activeExamConfigs.set(ctx.runId, {
        questions: cfg.questions,
        password: trimmedPassword && trimmedPassword.length > 0 ? trimmedPassword : null,
      });

      const publicQuestions = cfg.questions.map(stripAnswerKey);
      const hasPassword = Boolean(trimmedPassword && trimmedPassword.length > 0);

      return {
        title: cfg.title,
        durationMinutes: cfg.durationMinutes,
        hasPassword,
        shuffleQuestions: cfg.shuffleQuestions,
        shuffleOptions: cfg.shuffleOptions,
        allowViewScore: cfg.allowViewScore ?? true,
        allowViewReview: cfg.allowViewReview ?? true,
        examId: cfg.examId ?? null,
        batchIndex: cfg.batchIndex ?? 1,
        completedStudentIds: cfg.completedStudentIds ?? [],
        status: 'ready',
        startedAt: null,
        expiresAt: null,
        totalQuestions: cfg.questions.length,
        participants: {},
        publicQuestions,
      };
    },

    onTeacherIntent(
      ctx: ActivityContext,
      st: ExamState,
      intent: unknown
    ): ExamState {
      const teacherSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('open_exam') }),
        z.object({ type: z.literal('close_exam') }),
        z.object({
          type: z.literal('extend_time'),
          addMinutes: z.number().int().positive().default(5),
        }),
        z.object({
          type: z.literal('force_submit_student'),
          participantId: z.string().min(1),
        }),
        z.object({
          type: z.literal('extend_student_time'),
          participantId: z.string().min(1),
          addMinutes: z.number().int().positive().default(5),
        }),
      ]);

      const parsed = teacherSchema.safeParse(intent);
      if (!parsed.success) {
        return st;
      }

      const now = ctx.now();

      switch (parsed.data.type) {
        case 'open_exam': {
          if (st.status === 'in_progress') {
            return st;
          }
          const startedAt = now;
          const expiresAt = startedAt + st.durationMinutes * 60 * 1000;

          const updatedParticipants: Record<string, ParticipantExamStatus> = {};
          for (const [pid, p] of Object.entries(st.participants)) {
            const pStarted = p.startedAt ?? startedAt;
            const pExpires =
              p.individualExpiresAt ??
              (pStarted + st.durationMinutes * 60 * 1000 + (p.extendedMinutes ?? 0) * 60 * 1000);
            updatedParticipants[pid] = {
              ...p,
              startedAt: pStarted,
              individualExpiresAt: pExpires,
            };
          }

          return {
            ...st,
            status: 'in_progress',
            startedAt,
            expiresAt,
            participants: updatedParticipants,
          };
        }

        case 'close_exam': {
          const rawExamData = activeExamConfigs.get(ctx.runId);
          const originalQuestions = rawExamData ? rawExamData.questions : [];

          const updatedParticipants: Record<string, ParticipantExamStatus> = {};
          for (const [pid, p] of Object.entries(st.participants)) {
            const revData = p.reviewData ?? (originalQuestions.length > 0 ? generateParticipantReviewData(originalQuestions, p) : undefined);
            updatedParticipants[pid] = {
              ...p,
              reviewData: revData,
            };
          }

          const results = computeExamResults(originalQuestions, updatedParticipants);
          const questionAnalysis = calculateQuestionAnalysis(originalQuestions, updatedParticipants);

          return {
            ...st,
            status: 'closed',
            participants: updatedParticipants,
            results,
            questionAnalysis: questionAnalysis as unknown as Array<Record<string, unknown>>,
          };
        }

        case 'extend_time': {
          const addMs = parsed.data.addMinutes * 60 * 1000;
          const newExpiresAt = st.expiresAt ? st.expiresAt + addMs : now + addMs;
          const newDuration = st.durationMinutes + parsed.data.addMinutes;

          const updatedParticipants: Record<string, ParticipantExamStatus> = {};
          for (const [pid, p] of Object.entries(st.participants)) {
            updatedParticipants[pid] = {
              ...p,
              extendedMinutes: (p.extendedMinutes ?? 0) + parsed.data.addMinutes,
              individualExpiresAt: p.individualExpiresAt ? p.individualExpiresAt + addMs : null,
            };
          }

          return {
            ...st,
            durationMinutes: newDuration,
            expiresAt: newExpiresAt,
            participants: updatedParticipants,
          };
        }

        case 'force_submit_student': {
          const target = st.participants[parsed.data.participantId];
          if (!target || target.isSubmitted) {
            return st;
          }

          let studentResult: ExamResult | undefined = undefined;
          let reviewData: Array<Record<string, unknown>> | undefined = undefined;
          const rawExamData = activeExamConfigs.get(ctx.runId);
          if (rawExamData && rawExamData.questions) {
            const singleResultList = computeExamResults(rawExamData.questions, {
              [parsed.data.participantId]: {
                ...target,
                isSubmitted: true,
                submittedAt: now,
              },
            });
            studentResult = singleResultList[0];
            reviewData = generateParticipantReviewData(rawExamData.questions, target);
          }

          if (studentResult) {
            void ctx.grantReward(parsed.data.participantId, 'exam_finish', 30);
            if (studentResult.percentage >= 80) {
              void ctx.grantReward(parsed.data.participantId, 'exam_high_score', 20);
            }
            if (studentResult.percentage === 100) {
              void ctx.grantReward(parsed.data.participantId, 'exam_perfect', 50);
            }
          }

          const updated: ParticipantExamStatus = {
            ...target,
            isSubmitted: true,
            submittedAt: now,
            lastActiveAt: now,
            result: studentResult,
            reviewData,
            rewardGranted: true,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [parsed.data.participantId]: updated,
            },
          };
        }

        case 'extend_student_time': {
          const target = st.participants[parsed.data.participantId];
          if (!target) {
            return st;
          }

          const addMs = parsed.data.addMinutes * 60 * 1000;
          const currentBase = target.individualExpiresAt ?? st.expiresAt ?? now;
          const newIndividualExpires = currentBase + addMs;
          const updated: ParticipantExamStatus = {
            ...target,
            extendedMinutes: (target.extendedMinutes ?? 0) + parsed.data.addMinutes,
            individualExpiresAt: newIndividualExpires,
            lastActiveAt: now,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [parsed.data.participantId]: updated,
            },
          };
        }

        default:
          return st;
      }
    },

    onStudentIntent(
      ctx: ActivityContext,
      st: ExamState,
      participantId: string,
      intent: unknown
    ): ExamState | ActivityReject {
      const intentSchema = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('unlock_exam'),
          password: z.string().optional().default(''),
          displayName: z.string().optional(),
        }),
        z.object({
          type: z.literal('get_paper'),
          displayName: z.string().optional(),
        }),
        z.object({
          type: z.literal('save_answer'),
          questionId: z.string().min(1),
          answer: z.unknown(),
          displayName: z.string().optional(),
        }),
        z.object({
          type: z.literal('submit_exam'),
          displayName: z.string().optional(),
        }),
        z.object({
          type: z.literal('report_status'),
          currentQuestionId: z.string().optional(),
          currentQuestionIndex: z.number().int().nonnegative().optional(),
          isFocusLost: z.boolean().optional(),
          displayName: z.string().optional(),
        }),
      ]);

      const parsed = intentSchema.safeParse(intent);
      if (!parsed.success) {
        return {
          ok: false,
          code: 'INVALID_INTENT',
          reason: 'Dữ liệu hành động của thí sinh không hợp lệ',
        };
      }

      const rawExamData = activeExamConfigs.get(ctx.runId);
      if (!rawExamData) {
        return {
          ok: false,
          code: 'EXAM_NOT_FOUND',
          reason: 'Không tìm thấy dữ liệu đề thi gốc của kỳ thi này',
        };
      }

      const now = ctx.now();

      const incomingDisplayName =
        'displayName' in parsed.data &&
        typeof parsed.data.displayName === 'string' &&
        parsed.data.displayName.trim().length > 0
          ? parsed.data.displayName.trim()
          : null;

      const baseParticipant = st.participants[participantId];
      const participantDisplayName =
        incomingDisplayName ||
        (baseParticipant && !baseParticipant.displayName.startsWith('Thí sinh ')
          ? baseParticipant.displayName
          : incomingDisplayName || baseParticipant?.displayName || `Thí sinh ${participantId.slice(0, 4)}`);

      const existingParticipant: ParticipantExamStatus = baseParticipant
        ? { ...baseParticipant, displayName: participantDisplayName }
        : {
            participantId,
            displayName: participantDisplayName,
            authenticated: !st.hasPassword,
            startedAt: null,
            submittedAt: null,
            isSubmitted: false,
            answers: {},
            questionOrder: [],
            optionOrders: {},
            currentQuestionIndex: null,
            currentQuestionId: null,
            answeredCount: 0,
            progressPercent: 0,
            focusLostCount: 0,
            isFocusLost: false,
            lastActiveAt: now,
            extendedMinutes: 0,
            individualExpiresAt: null,
          };

      switch (parsed.data.type) {
        case 'unlock_exam': {
          const providedPassword = (parsed.data.password || '').trim();
          if (st.hasPassword) {
            if (rawExamData.password && rawExamData.password !== providedPassword) {
              return {
                ok: false,
                code: 'INCORRECT_PASSWORD',
                reason: 'Mật khẩu kỳ thi không chính xác. Vui lòng kiểm tra lại.',
              };
            }
          }

          // Mật khẩu đúng hoặc kỳ thi không yêu cầu mật khẩu
          const displayName = parsed.data.displayName || existingParticipant.displayName;

          // Sinh đề thi riêng cho thí sinh nếu chưa có
          let questionOrder = existingParticipant.questionOrder;
          let optionOrders = existingParticipant.optionOrders;
          if (questionOrder.length === 0) {
            const variant = generateStudentExamVariant(rawExamData.questions, {
              shuffleQuestions: st.shuffleQuestions,
              shuffleOptions: st.shuffleOptions,
              seed: `${ctx.runId}-${participantId}`,
            });
            questionOrder = variant.questionOrder;
            optionOrders = variant.optionOrders;
          }

          const studentStartedAt =
            st.status === 'in_progress'
              ? (existingParticipant.startedAt ?? now)
              : (existingParticipant.startedAt ?? null);
          const studentExpiresAt =
            studentStartedAt !== null
              ? (existingParticipant.individualExpiresAt ?? (studentStartedAt + st.durationMinutes * 60 * 1000 + (existingParticipant.extendedMinutes ?? 0) * 60 * 1000))
              : null;

          const updated: ParticipantExamStatus = {
            ...existingParticipant,
            displayName,
            authenticated: true,
            startedAt: studentStartedAt,
            individualExpiresAt: studentExpiresAt,
            lastActiveAt: now,
            questionOrder,
            optionOrders,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [participantId]: updated,
            },
          };
        }

        case 'get_paper': {
          if (st.hasPassword && !existingParticipant.authenticated) {
            return {
              ok: false,
              code: 'PASSWORD_REQUIRED',
              reason: 'Kỳ thi yêu cầu mật khẩu. Vui lòng nhập mật khẩu để mở đề thi.',
            };
          }

          const displayName = parsed.data.displayName || existingParticipant.displayName;

          let questionOrder = existingParticipant.questionOrder;
          let optionOrders = existingParticipant.optionOrders;
          if (questionOrder.length === 0) {
            const variant = generateStudentExamVariant(rawExamData.questions, {
              shuffleQuestions: st.shuffleQuestions,
              shuffleOptions: st.shuffleOptions,
              seed: `${ctx.runId}-${participantId}`,
            });
            questionOrder = variant.questionOrder;
            optionOrders = variant.optionOrders;
          }

          const studentStartedAt =
            st.status === 'in_progress'
              ? (existingParticipant.startedAt ?? now)
              : (existingParticipant.startedAt ?? null);
          const studentExpiresAt =
            studentStartedAt !== null
              ? (existingParticipant.individualExpiresAt ?? (studentStartedAt + st.durationMinutes * 60 * 1000 + (existingParticipant.extendedMinutes ?? 0) * 60 * 1000))
              : null;

          const updated: ParticipantExamStatus = {
            ...existingParticipant,
            displayName,
            authenticated: true,
            startedAt: studentStartedAt,
            individualExpiresAt: studentExpiresAt,
            lastActiveAt: now,
            questionOrder,
            optionOrders,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [participantId]: updated,
            },
          };
        }

        case 'save_answer': {
          if (st.status !== 'in_progress') {
            return {
              ok: false,
              code: 'EXAM_NOT_IN_PROGRESS',
              reason: 'Kỳ thi chưa bắt đầu hoặc đã kết thúc.',
            };
          }

          const studentStartedAt = existingParticipant.startedAt ?? now;
          const effectiveExpiresAt =
            existingParticipant.individualExpiresAt ?? (studentStartedAt + st.durationMinutes * 60 * 1000 + (existingParticipant.extendedMinutes ?? 0) * 60 * 1000);
          if (effectiveExpiresAt && now > effectiveExpiresAt) {
            return {
              ok: false,
              code: 'EXAM_EXPIRED',
              reason: 'Thời gian làm bài thi đã kết thúc.',
            };
          }

          if (existingParticipant.isSubmitted) {
            return {
              ok: false,
              code: 'ALREADY_SUBMITTED',
              reason: 'Bạn đã nộp bài thi rồi và không thể sửa đáp án.',
            };
          }

          const { questionId, answer } = parsed.data;
          const updatedAnswers = {
            ...existingParticipant.answers,
            [questionId]: answer,
          };

          const answeredCount = Object.keys(updatedAnswers).length;
          const progressPercent =
            st.totalQuestions > 0
              ? Math.round((answeredCount / st.totalQuestions) * 100)
              : 0;

          const qIdx = existingParticipant.questionOrder.indexOf(questionId);
          const currentQuestionIndex =
            qIdx >= 0 ? qIdx : existingParticipant.currentQuestionIndex;

          const updated: ParticipantExamStatus = {
            ...existingParticipant,
            startedAt: studentStartedAt,
            individualExpiresAt: effectiveExpiresAt,
            answers: updatedAnswers,
            answeredCount,
            progressPercent,
            currentQuestionId: questionId,
            currentQuestionIndex,
            lastActiveAt: now,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [participantId]: updated,
            },
          };
        }

        case 'report_status': {
          let focusLostCount = existingParticipant.focusLostCount ?? 0;
          let isFocusLost = existingParticipant.isFocusLost ?? false;

          if (parsed.data.isFocusLost !== undefined) {
            if (!isFocusLost && parsed.data.isFocusLost) {
              focusLostCount++;
            }
            isFocusLost = parsed.data.isFocusLost;
          }

          let currentQuestionId = existingParticipant.currentQuestionId ?? null;
          let currentQuestionIndex = existingParticipant.currentQuestionIndex ?? null;

          if (parsed.data.currentQuestionId) {
            currentQuestionId = parsed.data.currentQuestionId;
            const qIdx = existingParticipant.questionOrder.indexOf(
              parsed.data.currentQuestionId
            );
            if (qIdx >= 0) {
              currentQuestionIndex = qIdx;
            }
          }
          if (parsed.data.currentQuestionIndex !== undefined) {
            currentQuestionIndex = parsed.data.currentQuestionIndex;
          }

          const updated: ParticipantExamStatus = {
            ...existingParticipant,
            lastActiveAt: now,
            focusLostCount,
            isFocusLost,
            currentQuestionId,
            currentQuestionIndex,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [participantId]: updated,
            },
          };
        }

        case 'submit_exam': {
          if (existingParticipant.isSubmitted) {
            return {
              ok: false,
              code: 'ALREADY_SUBMITTED',
              reason: 'Bạn đã nộp bài thi từ trước.',
            };
          }

          let studentResult: ExamResult | undefined = undefined;
          let reviewData: Array<Record<string, unknown>> | undefined = undefined;

          const rawExamData = activeExamConfigs.get(ctx.runId);
          if (rawExamData && rawExamData.questions) {
            const singleResultList = computeExamResults(rawExamData.questions, {
              [participantId]: {
                ...existingParticipant,
                isSubmitted: true,
                submittedAt: now,
              },
            });
            studentResult = singleResultList[0];

            reviewData = generateParticipantReviewData(rawExamData.questions, existingParticipant);
          }

          if (studentResult) {
            void ctx.grantReward(participantId, 'exam_finish', 30);
            if (studentResult.percentage >= 80) {
              void ctx.grantReward(participantId, 'exam_high_score', 20);
            }
            if (studentResult.percentage === 100) {
              void ctx.grantReward(participantId, 'exam_perfect', 50);
            }
          }

          const updated: ParticipantExamStatus = {
            ...existingParticipant,
            isSubmitted: true,
            submittedAt: now,
            lastActiveAt: now,
            result: studentResult,
            reviewData,
            rewardGranted: true,
          };

          return {
            ...st,
            participants: {
              ...st.participants,
              [participantId]: updated,
            },
          };
        }

        default:
          return st;
      }
    },

    onEnd(ctx: ActivityContext, st: ExamState): ExamResult[] {
      const rawExamData = activeExamConfigs.get(ctx.runId);
      const originalQuestions = rawExamData ? rawExamData.questions : [];

      const results =
        st.results && st.results.length > 0
          ? st.results
          : computeExamResults(originalQuestions, st.participants);

      // Trao thưởng EXP theo bảng luật cho thí sinh chưa được trao khi nộp bài
      for (const res of results) {
        const pStatus = st.participants[res.participantId];
        if (pStatus?.rewardGranted) {
          continue;
        }

        // 1. Hoàn thành bài thi
        void ctx.grantReward(res.participantId, 'exam_finish', 30);

        // 2. Điểm giỏi (≥ 80%)
        if (res.percentage >= 80) {
          void ctx.grantReward(res.participantId, 'exam_high_score', 20);
        }

        // 3. Điểm tuyệt đối (100%)
        if (res.percentage === 100) {
          void ctx.grantReward(res.participantId, 'exam_perfect', 50);
        }
      }

      // Dọn dẹp bộ nhớ đệm cấu hình
      activeExamConfigs.delete(ctx.runId);

      return results;
    },
  },
};
