import type { FastifyPluginAsync } from 'fastify';
import type {
  ClassRepository,
  ExamInsert,
  ExamRecordRepository,
  ExamRecordSelect,
  ExamRepository,
  ExamSelect,
  QuestionItemData,
  QuestionSetRepository,
  SessionRepository,
  StudentRepository,
  StudentSelect,
  ParticipantRepository,
} from '@educlass/db';
import {
  CloneExamRequestSchema,
  CreateExamRequestSchema,
  ExamDetailDtoSchema,
  ExamListItemDtoSchema,
  formatProtocolError,
  StartExamBatchRequestSchema,
  StudentExamEligibilityDtoSchema,
  UpdateExamRequestSchema,
  type ExamDetailDto,
  type ExamListItemDto,
  type ExamRecordDto,
  type ExamStats,
} from '@educlass/protocol';
import type { ActivityEngine } from '../activity/engine.js';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthenticateHook } from '../auth/plugin.js';
import type { ExcelService } from '../services/excel-service.js';

export interface ExamsRoutesOptions {
  authService: AuthService;
  examRepo: ExamRepository;
  examRecordRepo: ExamRecordRepository;
  classRepo: ClassRepository;
  studentRepo: StudentRepository;
  questionSetRepo: QuestionSetRepository;
  sessionRepo: SessionRepository;
  activityEngine: ActivityEngine;
  excelService: ExcelService;
  participantRepo?: ParticipantRepository;
}

/**
 * Phục hồi các trường của câu hỏi từ database (contentJson + answerJson)
 */
function restoreQuestionsFromItems(rawQuestions: QuestionItemData[]): unknown[] {
  return rawQuestions.map(q => {
    let content: Record<string, unknown> = {};
    let answer: Record<string, unknown> = {};
    try {
      content = JSON.parse(q.contentJson) as Record<string, unknown>;
    } catch {
      // ignore
    }
    try {
      answer = JSON.parse(q.answerJson) as Record<string, unknown>;
    } catch {
      // ignore
    }
    return {
      id: q.id,
      type: q.type,
      points: q.points,
      orderIndex: q.orderIndex,
      ...content,
      ...answer,
    };
  });
}

/**
 * Tính toán thống kê phổ điểm và phân tích câu hỏi
 */
function calculateExamStats(
  records: ExamRecordSelect[],
  rawQuestions: Array<Record<string, unknown>>
): ExamStats {
  let examMaxScore = 10;
  if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
    const sumPts = rawQuestions.reduce(
      (acc, q) => acc + (typeof q['points'] === 'number' ? q['points'] : 1),
      0
    );
    if (sumPts > 0) {
      examMaxScore = Math.round(sumPts * 100) / 100;
    }
  } else if (records.length > 0 && records[0]?.maxScore) {
    examMaxScore = records[0].maxScore;
  }

  const submitted = records.filter(r => r.status === 'submitted');
  if (submitted.length === 0) {
    return {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      maxScore: examMaxScore,
      gradeDistribution: { tot: 0, kha: 0, dat: 0, chuaDat: 0 },
      questionAnalysis: rawQuestions.map((q, idx) => ({
        questionId: typeof q['id'] === 'string' ? q['id'] : `q${idx + 1}`,
        order: idx + 1,
        correctRatio: 0,
        correctCount: 0,
        totalAnswered: 0,
      })),
    };
  }

  const scores = submitted.map(r => r.score);
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const averageScore = Math.round((totalScore / submitted.length) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  const gradeDistribution = {
    tot: submitted.filter(r => r.score >= 0.8 * examMaxScore).length,
    kha: submitted.filter(r => r.score >= 0.65 * examMaxScore && r.score < 0.8 * examMaxScore)
      .length,
    dat: submitted.filter(r => r.score >= 0.5 * examMaxScore && r.score < 0.65 * examMaxScore)
      .length,
    chuaDat: submitted.filter(r => r.score < 0.5 * examMaxScore).length,
  };

  const questionAnalysis = rawQuestions.map((q, idx) => {
    const qId = typeof q['id'] === 'string' ? q['id'] : `q${idx + 1}`;
    let correctCount = 0;
    let totalAnswered = 0;

    for (const r of submitted) {
      try {
        let isAnswered = false;
        let isCorrect = false;

        // 1. Kiểm tra từ answersJson
        const answers = JSON.parse(r.answersJson || '{}') as Record<string, unknown>;
        if (
          answers[qId] !== undefined ||
          answers[`q_${idx + 1}`] !== undefined ||
          answers[`q${idx + 1}`] !== undefined
        ) {
          isAnswered = true;
        }

        // 2. Kiểm tra từ resultJson (thường là reviewData mảng hoặc result object)
        if (r.resultJson) {
          const res = JSON.parse(r.resultJson) as unknown;
          if (Array.isArray(res)) {
            // Trường hợp reviewData là danh sách các câu hỏi
            const found = res.find(
              it =>
                it &&
                typeof it === 'object' &&
                ('questionId' in it || 'id' in it || 'order' in it) &&
                (it.questionId === qId || it.id === qId || it.order === idx + 1)
            ) as { isCorrect?: boolean; correct?: boolean; pointsEarned?: number } | undefined;

            if (found) {
              isAnswered = true;
              if (
                found.isCorrect === true ||
                found.correct === true ||
                (typeof found.pointsEarned === 'number' && found.pointsEarned > 0)
              ) {
                isCorrect = true;
              }
            }
          } else if (res && typeof res === 'object') {
            const mapObj = res as Record<string, unknown>;
            const found = (mapObj[qId] || mapObj[`q_${idx + 1}`] || mapObj[`q${idx + 1}`]) as
              { isCorrect?: boolean; correct?: boolean; pointsEarned?: number } | undefined;

            if (found) {
              isAnswered = true;
              if (
                found.isCorrect === true ||
                found.correct === true ||
                (typeof found.pointsEarned === 'number' && found.pointsEarned > 0)
              ) {
                isCorrect = true;
              }
            }
          }
        }

        // 3. Fallback trực tiếp từ đáp án học sinh nếu resultJson chưa có kết quả câu này
        if (!isCorrect && isAnswered) {
          const studentAns = answers[qId] ?? answers[`q_${idx + 1}`] ?? answers[`q${idx + 1}`];
          const correctKey = q['correct'] ?? (q as Record<string, unknown>)['correctAnswer'];
          if (studentAns !== undefined && correctKey !== undefined) {
            if (studentAns === correctKey) {
              isCorrect = true;
            } else if (
              typeof studentAns === 'object' &&
              studentAns !== null &&
              'selected' in (studentAns as Record<string, unknown>)
            ) {
              if (
                Number((studentAns as Record<string, unknown>)['selected']) === Number(correctKey)
              ) {
                isCorrect = true;
              }
            }
          }
        }

        if (isAnswered) {
          totalAnswered++;
        }
        if (isCorrect) {
          correctCount++;
        }
      } catch {
        // ignore
      }
    }

    // Nếu học sinh đã nộp bài nhưng chưa đánh dấu answered từng câu, lấy mẫu số là toàn bộ bài nộp
    const effectiveTotalAnswered = totalAnswered > 0 ? totalAnswered : submitted.length;
    const correctRatio =
      effectiveTotalAnswered > 0 ? Math.round((correctCount / effectiveTotalAnswered) * 100) : 0;

    return {
      questionId: qId,
      order: idx + 1,
      correctRatio,
      correctCount,
      totalAnswered: effectiveTotalAnswered,
    };
  });

  return {
    averageScore,
    highestScore,
    lowestScore,
    maxScore: examMaxScore,
    gradeDistribution,
    questionAnalysis,
  };
}

/**
 * Chuyển đổi bản ghi DB sang DTO
 */
function toRecordDto(r: ExamRecordSelect): ExamRecordDto {
  let answers: Record<string, unknown> = {};
  let result: unknown = null;
  try {
    answers = JSON.parse(r.answersJson) as Record<string, unknown>;
  } catch {
    // ignore
  }
  try {
    if (r.resultJson) {
      result = JSON.parse(r.resultJson);
    }
  } catch {
    // ignore
  }

  return {
    id: r.id,
    examId: r.examId,
    studentId: r.studentId,
    studentName: r.studentName,
    batchIndex: r.batchIndex,
    status: r.status,
    score: r.score,
    maxScore: r.maxScore,
    percentage: r.percentage,
    correctCount: r.correctCount,
    totalQuestions: r.totalQuestions,
    answers,
    result,
    timeSpentSeconds: r.timeSpentSeconds,
    submittedAt: r.submittedAt,
  };
}

export const examsRoutes: FastifyPluginAsync<ExamsRoutesOptions> = async (fastify, options) => {
  const {
    authService,
    examRepo,
    examRecordRepo,
    classRepo,
    studentRepo,
    questionSetRepo,
    sessionRepo,
    activityEngine,
    excelService,
    participantRepo,
  } = options;
  const authenticate = createAuthenticateHook(authService);

  /**
   * GET /api/exams
   * Lấy danh sách kỳ thi của giáo viên (kèm thống kê tiến độ nộp bài)
   */
  fastify.get('/api/exams', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    const query = request.query as {
      classId?: string;
      status?: ExamSelect['status'];
      folder?: string;
    };

    const examList = await examRepo.list({
      ownerId: user.role === 'admin' ? undefined : user.id,
      classId: query.classId,
      status: query.status,
    });

    const items: ExamListItemDto[] = [];
    for (const exam of examList) {
      let examConfig: Record<string, unknown> = {};
      try {
        examConfig = JSON.parse(exam.configJson) as Record<string, unknown>;
      } catch {
        // ignore
      }
      const folder =
        typeof examConfig.folder === 'string' && examConfig.folder.trim()
          ? examConfig.folder.trim()
          : null;

      // Lọc theo thư mục nếu có query.folder
      if (query.folder !== undefined && query.folder !== '') {
        if (query.folder === '__none__' || query.folder === 'uncategorized') {
          if (folder !== null) continue;
        } else if (folder !== query.folder) {
          continue;
        }
      }

      const cls = await classRepo.findById(exam.classId);
      const classStudents = await studentRepo.listByClassId(exam.classId);
      const records = await examRecordRepo.listByExam(exam.id);
      const submitted = records.filter(r => r.status === 'submitted');
      let inProgressCount = records.filter(r => r.status === 'in_progress').length;

      if (exam.activeSessionId) {
        const activeRun = activityEngine.getActiveRun(exam.activeSessionId);
        if (activeRun && activeRun.run.activityId === 'exam') {
          const stateObj = activeRun.state as {
            participants?: Record<string, { isSubmitted?: boolean }>;
          };
          if (stateObj?.participants) {
            const liveInProgress = Object.values(stateObj.participants).filter(
              p => !p.isSubmitted
            ).length;
            inProgressCount = Math.max(inProgressCount, liveInProgress);
          }
        }
      }

      let avgScore: number | null = null;
      if (submitted.length > 0) {
        const total = submitted.reduce((sum, r) => sum + r.score, 0);
        avgScore = Math.round((total / submitted.length) * 10) / 10;
      }

      let activeSessionJoinCode: string | null = null;
      if (exam.activeSessionId) {
        const sess = await sessionRepo.findById(exam.activeSessionId);
        if (sess) {
          activeSessionJoinCode = sess.joinCode;
        }
      }

      const classStudentIds = new Set(classStudents.map(s => s.id));
      const extraGuestCount = records.filter(r => !classStudentIds.has(r.studentId)).length;
      const totalStudents = Math.max(1, classStudents.length + extraGuestCount);

      let examMaxScore = 10;
      try {
        const rawQs = JSON.parse(exam.questionsSnapshotJson || '[]') as Array<
          Record<string, unknown>
        >;
        if (Array.isArray(rawQs) && rawQs.length > 0) {
          const sumPts = rawQs.reduce(
            (sum, q) => sum + (typeof q['points'] === 'number' ? q['points'] : 1),
            0
          );
          if (sumPts > 0) {
            examMaxScore = Math.round(sumPts * 100) / 100;
          }
        } else if (records.length > 0 && records[0]?.maxScore) {
          examMaxScore = records[0].maxScore;
        }
      } catch {
        if (records.length > 0 && records[0]?.maxScore) {
          examMaxScore = records[0].maxScore;
        }
      }

      items.push(
        ExamListItemDtoSchema.parse({
          id: exam.id,
          ownerId: exam.ownerId,
          classId: exam.classId,
          className: cls?.name,
          title: exam.title,
          subject: exam.subject,
          folder,
          durationMinutes: exam.durationMinutes,
          status: exam.status,
          currentBatch: exam.currentBatch,
          activeSessionId: exam.activeSessionId,
          activeSessionJoinCode,
          totalStudents,
          submittedCount: submitted.length,
          inProgressCount,
          averageScore: avgScore,
          maxScore: examMaxScore,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
        })
      );
    }

    return reply.status(200).send({ exams: items });
  });

  /**
   * POST /api/exams
   * Tạo kỳ thi mới gắn với một lớp học và bộ đề
   */
  fastify.post('/api/exams', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    const parsed = CreateExamRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Dữ liệu tạo kỳ thi không hợp lệ',
          parsed.error.issues
        ),
      });
    }

    const { classId, title, subject, questionSetId, durationMinutes, config } = parsed.data;

    // Kiểm tra quyền đối với lớp học
    const cls = await classRepo.findById(classId);
    if (!cls) {
      return reply.status(404).send({
        error: formatProtocolError('CLASS_NOT_FOUND', 'Không tìm thấy lớp học'),
      });
    }
    if (cls.ownerId !== user.id && user.role !== 'admin') {
      return reply.status(403).send({
        error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền quản lý lớp học này'),
      });
    }

    // Nạp câu hỏi: ưu tiên danh sách câu hỏi đã được giáo viên phân bổ điểm từ client, nếu không thì lấy từ questionSetId
    let resolvedQuestions: unknown[] = [];
    if (parsed.data.questions && parsed.data.questions.length > 0) {
      resolvedQuestions = parsed.data.questions;
    } else if (questionSetId) {
      const qSet = await questionSetRepo.findWithQuestions(questionSetId);
      if (!qSet) {
        return reply.status(404).send({
          error: formatProtocolError('QUESTION_SET_NOT_FOUND', 'Không tìm thấy bộ đề câu hỏi'),
        });
      }
      resolvedQuestions = restoreQuestionsFromItems(qSet.questions);
    }

    if (resolvedQuestions.length === 0) {
      return reply.status(400).send({
        error: formatProtocolError(
          'INVALID_PAYLOAD',
          'Kỳ thi phải có ít nhất 1 câu hỏi từ bộ đề hoặc danh sách câu hỏi.'
        ),
      });
    }

    const created = await examRepo.create({
      ownerId: user.id,
      classId,
      title: title.trim(),
      subject: subject ? subject.trim() : null,
      durationMinutes: durationMinutes ?? 45,
      configJson: JSON.stringify(config ?? {}),
      questionsSnapshotJson: JSON.stringify(resolvedQuestions),
      status: 'ready',
      currentBatch: 1,
    });

    return reply.status(201).send({ exam: created });
  });

  /**
   * GET /api/exams/:id
   * Chi tiết kỳ thi, danh sách điểm toàn bộ học sinh và thống kê phổ điểm
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/exams/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }

      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền xem kỳ thi này.'),
        });
      }

      const cls = await classRepo.findById(exam.classId);
      const classStudents = await studentRepo.listByClassId(exam.classId);
      const dbRecords = await examRecordRepo.listByExam(exam.id);

      let questions: Array<Record<string, unknown>> = [];
      try {
        questions = JSON.parse(exam.questionsSnapshotJson) as Array<Record<string, unknown>>;
      } catch {
        // ignore
      }

      let examConfig = {};
      try {
        examConfig = JSON.parse(exam.configJson);
      } catch {
        // ignore
      }

      let activeSessionJoinCode: string | null = null;
      if (exam.activeSessionId) {
        const sess = await sessionRepo.findById(exam.activeSessionId);
        if (sess) {
          activeSessionJoinCode = sess.joinCode;
        }
      }

      const stats = calculateExamStats(dbRecords, questions);

      // Xây dựng danh sách tổng thể toàn bộ học sinh trong lớp kết hợp CSDL và trạng thái thời gian thực
      const studentRecordMap = new Map<string, ExamRecordDto>();

      // 1. Nạp tất cả bản ghi đã lưu từ CSDL
      for (const r of dbRecords) {
        studentRecordMap.set(r.studentId, toRecordDto(r));
      }

      // 2. Nếu có phiên đang mở, đồng bộ trạng thái thí sinh đang làm bài từ ActivityEngine
      if (exam.activeSessionId) {
        const activeRun = activityEngine.getActiveRun(exam.activeSessionId);
        if (activeRun && activeRun.run.activityId === 'exam') {
          const stateObj = activeRun.state as {
            participants?: Record<
              string,
              {
                displayName?: string;
                isSubmitted?: boolean;
                startedAt?: number | null;
                submittedAt?: number | null;
                answers?: Record<string, unknown>;
                result?: {
                  score?: number;
                  maxScore?: number;
                  percentage?: number;
                  correctCount?: number;
                };
              }
            >;
          };

          if (stateObj?.participants && participantRepo) {
            const sessionParticipants = await participantRepo.listBySessionId(exam.activeSessionId);
            for (const p of sessionParticipants) {
              const live = stateObj.participants[p.id];
              if (!live) continue;

              let sId = p.studentId;
              if (!sId) {
                const match = classStudents.find(
                  cs => cs.fullName.trim().toLowerCase() === p.displayName.trim().toLowerCase()
                );
                if (match) sId = match.id;
              }
              if (!sId) {
                sId = p.id;
              }

              const existing = studentRecordMap.get(sId);
              if (existing && existing.status === 'submitted') continue;

              const timeSpent = live.startedAt
                ? Math.max(
                    0,
                    Math.round(((live.submittedAt ?? Date.now()) - live.startedAt) / 1000)
                  )
                : 0;

              studentRecordMap.set(sId, {
                id: existing?.id ?? `live_${p.id}`,
                examId: exam.id,
                studentId: sId,
                studentName: p.displayName || existing?.studentName || 'Học sinh',
                studentCode: classStudents.find(cs => cs.id === sId)?.code ?? null,
                batchIndex: exam.currentBatch,
                status: live.isSubmitted ? 'submitted' : 'in_progress',
                score: live.result?.score ?? 0,
                maxScore: live.result?.maxScore ?? 10,
                percentage: live.result?.percentage ?? 0,
                correctCount: live.result?.correctCount ?? 0,
                totalQuestions: questions.length || 1,
                answers: live.answers ?? {},
                result: live.result ?? null,
                timeSpentSeconds: timeSpent,
                submittedAt: live.submittedAt ?? live.startedAt ?? Date.now(),
              });
            }
          }
        }
      }

      // 3. Đối với tất cả học sinh còn lại trong danh sách lớp chưa tham gia thi:
      for (const student of classStudents) {
        if (!studentRecordMap.has(student.id)) {
          studentRecordMap.set(student.id, {
            id: `not_started_${student.id}`,
            examId: exam.id,
            studentId: student.id,
            studentName: student.fullName,
            studentCode: student.code ?? null,
            batchIndex: exam.currentBatch,
            status: 'not_started',
            score: 0,
            maxScore: 10,
            percentage: 0,
            correctCount: 0,
            totalQuestions: questions.length || 1,
            answers: {},
            result: null,
            timeSpentSeconds: 0,
            submittedAt: 0,
          });
        }
      }

      const formattedRecords = Array.from(studentRecordMap.values());
      const classStudentIds = new Set(classStudents.map(s => s.id));
      const extraGuestCount = formattedRecords.filter(
        r => !classStudentIds.has(r.studentId) && r.status !== 'not_started'
      ).length;
      const computedTotalStudents = Math.max(1, classStudents.length + extraGuestCount);

      const detail: ExamDetailDto = ExamDetailDtoSchema.parse({
        id: exam.id,
        ownerId: exam.ownerId,
        classId: exam.classId,
        className: cls?.name,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        config: examConfig,
        status: exam.status,
        currentBatch: exam.currentBatch,
        activeSessionId: exam.activeSessionId,
        activeSessionJoinCode,
        totalStudents: computedTotalStudents,
        submittedCount: formattedRecords.filter(r => r.status === 'submitted').length,
        records: formattedRecords,
        questions,
        stats,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      });

      return reply.status(200).send({ exam: detail });
    }
  );

  /**
   * PUT /api/exams/:id
   * Cập nhật thông tin cấu hình kỳ thi
   */
  fastify.put<{ Params: { id: string } }>(
    '/api/exams/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền chỉnh sửa kỳ thi này.'),
        });
      }

      const parsed = UpdateExamRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu cập nhật không hợp lệ',
            parsed.error.issues
          ),
        });
      }

      const updateData: Partial<Omit<ExamInsert, 'id' | 'createdAt' | 'updatedAt'>> = {};
      if (parsed.data.title !== undefined) {
        updateData.title = parsed.data.title.trim();
      }
      if (parsed.data.subject !== undefined) {
        updateData.subject = parsed.data.subject ? parsed.data.subject.trim() : null;
      }
      if (parsed.data.durationMinutes !== undefined) {
        updateData.durationMinutes = parsed.data.durationMinutes;
      }
      if (parsed.data.config !== undefined) {
        let currentConfig: Record<string, unknown> = {};
        try {
          currentConfig = JSON.parse(exam.configJson) as Record<string, unknown>;
        } catch {
          // ignore
        }
        updateData.configJson = JSON.stringify({
          ...currentConfig,
          ...parsed.data.config,
        });
      }

      const updated = await examRepo.update(id, updateData);

      return reply.status(200).send({ exam: updated });
    }
  );

  /**
   * POST /api/exams/:id/clone
   * Sao chép kỳ thi sang lớp khác (giữ nguyên bộ câu hỏi snapshot & cấu hình)
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/exams/:id/clone',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền sao chép kỳ thi này.'),
        });
      }

      const parsed = CloneExamRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu sao chép không hợp lệ',
            parsed.error.issues
          ),
        });
      }

      const { targetClassId, newTitle } = parsed.data;
      const targetClass = await classRepo.findById(targetClassId);
      if (!targetClass) {
        return reply.status(404).send({
          error: formatProtocolError('CLASS_NOT_FOUND', 'Không tìm thấy lớp học đích.'),
        });
      }
      if (targetClass.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError(
            'FORBIDDEN',
            'Bạn không có quyền thêm kỳ thi vào lớp học này.'
          ),
        });
      }

      const title = newTitle && newTitle.trim() ? newTitle.trim() : `${exam.title} (Bản sao)`;

      const created = await examRepo.create({
        ownerId: user.id,
        classId: targetClassId,
        title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        configJson: exam.configJson,
        questionsSnapshotJson: exam.questionsSnapshotJson,
        status: 'ready',
        currentBatch: 1,
      });

      return reply.status(201).send({ exam: created });
    }
  );

  /**
   * DELETE /api/exams/:id
   * Xóa kỳ thi
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/exams/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền xóa kỳ thi này.'),
        });
      }

      await examRepo.delete(id);
      return reply.status(200).send({ ok: true });
    }
  );

  /**
   * POST /api/exams/:id/start-batch
   * Kích hoạt ca thi tiếp theo trong một phiên học đang mở
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/exams/:id/start-batch',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển kỳ thi này.'),
        });
      }
      if (exam.status === 'finished') {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            'Kỳ thi đã kết thúc hoàn toàn, không thể mở thêm ca mới.'
          ),
        });
      }

      const parsed = StartExamBatchRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: formatProtocolError(
            'INVALID_PAYLOAD',
            'Dữ liệu mở ca thi không hợp lệ',
            parsed.error.issues
          ),
        });
      }

      const { sessionId, batchIndex } = parsed.data;
      const session = await sessionRepo.findById(sessionId);
      if (!session) {
        return reply.status(404).send({
          error: formatProtocolError('SESSION_NOT_FOUND', 'Không tìm thấy phiên học.'),
        });
      }
      if (session.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển phiên học này.'),
        });
      }
      if (session.status !== 'open') {
        return reply.status(400).send({
          error: formatProtocolError(
            'SESSION_CLOSED',
            'Phiên học đã đóng. Vui lòng mở phiên học mới trước.'
          ),
        });
      }

      // Xác định ca thi (nếu đang chờ ca tiếp thì tăng currentBatch)
      const nextBatch =
        batchIndex ??
        (exam.status === 'waiting_next_batch' ? exam.currentBatch + 1 : exam.currentBatch);

      // Lấy danh sách học sinh đã thi ở các ca trước để khóa danh tính
      const existingRecords = await examRecordRepo.listByExam(exam.id);
      const completedStudentIds = existingRecords
        .filter(r => r.status === 'submitted')
        .map(r => r.studentId);

      // Gắn kỳ thi vào phiên trong CSDL
      const updatedExam = await examRepo.attachSession(exam.id, sessionId, nextBatch);

      // Khởi chạy hoạt động thi trong ActivityEngine
      let questions: unknown[] = [];
      try {
        questions = JSON.parse(exam.questionsSnapshotJson);
      } catch {
        // ignore
      }

      let rawConfig: Record<string, unknown> = {};
      try {
        rawConfig = JSON.parse(exam.configJson) as Record<string, unknown>;
      } catch {
        // ignore
      }

      await activityEngine.startActivity(sessionId, 'exam', {
        ...rawConfig,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        questions,
        examId: exam.id,
        batchIndex: nextBatch,
        completedStudentIds,
      });

      return reply.status(200).send({ ok: true, exam: updatedExam });
    }
  );

  /**
   * POST /api/exams/:id/pause-batch
   * Tạm dừng ca thi hiện tại để chờ ca tiếp theo
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/exams/:id/pause-batch',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền điều khiển kỳ thi này.'),
        });
      }

      // Ngắt phiên và chuyển trạng thái sang waiting_next_batch
      if (exam.activeSessionId) {
        const active = activityEngine.getActiveRun(exam.activeSessionId);
        if (active) {
          try {
            await activityEngine.endActivity(exam.activeSessionId, active.run.id);
          } catch {
            // ignore nếu activity đã dừng
          }
        }
      }

      const updatedExam = await examRepo.detachSession(id, 'waiting_next_batch');
      return reply.status(200).send({ ok: true, exam: updatedExam });
    }
  );

  /**
   * POST /api/exams/:id/finish
   * Hoàn tất toàn bộ kỳ thi
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/exams/:id/finish',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền kết thúc kỳ thi này.'),
        });
      }

      if (exam.activeSessionId) {
        const active = activityEngine.getActiveRun(exam.activeSessionId);
        if (active) {
          try {
            await activityEngine.endActivity(exam.activeSessionId, active.run.id);
          } catch {
            // ignore
          }
        }
      }

      const updatedExam = await examRepo.detachSession(id, 'finished');
      return reply.status(200).send({ ok: true, exam: updatedExam });
    }
  );

  /**
   * GET /api/exams/:id/eligibility
   * Danh sách học sinh trong lớp và trạng thái điều kiện dự thi (ai đã thi, ai chưa thi)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/exams/:id/eligibility',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền truy cập kỳ thi này.'),
        });
      }

      const classStudents = await studentRepo.listByClassId(exam.classId);
      const records = await examRecordRepo.listByExam(exam.id);
      const recordMap = new Map(records.map(r => [r.studentId, r]));

      const result = classStudents.map((st: StudentSelect) => {
        const rec = recordMap.get(st.id);
        const isSubmitted = rec?.status === 'submitted';
        return StudentExamEligibilityDtoSchema.parse({
          studentId: st.id,
          fullName: st.fullName,
          code: st.code,
          alreadySubmitted: isSubmitted,
          batchIndex: rec?.batchIndex,
          score: rec?.score,
        });
      });

      return reply.status(200).send({ students: result });
    }
  );

  /**
   * GET /api/exams/:id/export-excel
   * Xuất file Excel báo cáo tổng hợp kết quả kỳ thi (bảng điểm toàn bộ lớp, phổ điểm, phân tích câu hỏi)
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/exams/:id/export-excel',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;

      const exam = await examRepo.findById(id);
      if (!exam) {
        return reply.status(404).send({
          error: formatProtocolError('EXAM_NOT_FOUND', 'Không tìm thấy kỳ thi này.'),
        });
      }
      if (exam.ownerId !== user.id && user.role !== 'admin') {
        return reply.status(403).send({
          error: formatProtocolError('FORBIDDEN', 'Bạn không có quyền tải báo cáo kỳ thi này.'),
        });
      }

      const cls = await classRepo.findById(exam.classId);
      const classStudents = await studentRepo.listByClassId(exam.classId);
      const dbRecords = await examRecordRepo.listByExam(exam.id);

      let questions: Array<Record<string, unknown>> = [];
      try {
        questions = JSON.parse(exam.questionsSnapshotJson) as Array<Record<string, unknown>>;
      } catch {
        // ignore
      }

      const stats = calculateExamStats(dbRecords, questions);

      const buffer = excelService.exportExamReportBuffer({
        exam: {
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          durationMinutes: exam.durationMinutes,
          createdAt: exam.createdAt,
        },
        className: cls?.name ?? 'Lớp học',
        students: classStudents.map(st => ({
          id: st.id,
          fullName: st.fullName,
          code: st.code,
        })),
        records: dbRecords.map(r => ({
          studentId: r.studentId,
          studentName: r.studentName,
          batchIndex: r.batchIndex,
          status: r.status,
          score: r.score,
          maxScore: r.maxScore,
          percentage: r.percentage,
          correctCount: r.correctCount,
          totalQuestions: r.totalQuestions,
          timeSpentSeconds: r.timeSpentSeconds,
          submittedAt: r.submittedAt,
          answersJson: r.answersJson,
          resultJson: r.resultJson,
        })),
        questions,
        stats,
      });

      const filename = `BangDiem_${exam.id}.xlsx`;
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    }
  );
};
