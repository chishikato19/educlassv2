import type {
  ActivityMeta,
  ClassDto,
  CreateClassRequest,
  CreateSessionRequest,
  CreateStudentRequest,
  EduclassPackage,
  ParticipantDto,
  RewardRuleDto,
  RewardRuleItemInput,
  SessionDetailResponse,
  SessionDto,
  SessionReportDto,
  SessionReportListItem,
  QuizSummaryReport,
  StudentDto,
  UpdateStudentRequest,
  ChatMessageDto,
  VideoDto,
  CreateVideoRequest,
  UpdateVideoRequest,
  CreateExamRequest,
  UpdateExamRequest,
  CloneExamRequest,
  StartExamBatchRequest,
  PauseExamBatchRequest,
  FinishExamRequest,
  ExamListItemDto,
  ExamDetailDto,
  StudentExamEligibilityDto,
  BankQuestionDto,
  CreateBankQuestionRequest,
  UpdateBankQuestionRequest,
  BankCurriculumTreeNode,
  MatrixStatsRequest,
  MatrixStatsResponse,
  MatrixGenerateRequest,
  DifficultyLevel,
  QuestionType,
  ClassGroupDto,
  ClassGroupOverviewResponse,
  CreateClassGroupRequest,
  UpdateClassGroupRequest,
  RandomizeGroupsRequest,
  UserDto,
  TeacherPublicProfile,
  RegisterTeacherRequest,
} from '@educlass/protocol';

export interface QuestionSetItem {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  grade: number;
  tags: string[];
  questionCount: number;
  updatedAt: number;
}

const API_BASE = '/api';

export class TeacherApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('educlass_teacher_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('educlass_teacher_token', token);
      } else {
        localStorage.removeItem('educlass_teacher_token');
      }
    }
  }

  async login(
    username = 'admin',
    password = 'admin123'
  ): Promise<{ token: string; user: UserDto }> {
    const res = await this.request<{ token: string; user: UserDto }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async getTeachers(): Promise<TeacherPublicProfile[]> {
    const res = await this.request<{ teachers: TeacherPublicProfile[] }>('/auth/teachers');
    return res.teachers;
  }

  async registerTeacher(data: RegisterTeacherRequest): Promise<UserDto> {
    const res = await this.request<{ user: UserDto }>('/auth/register-teacher', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async resetPin(userId: string): Promise<void> {
    await this.request<{ success: boolean }>('/auth/reset-pin', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<UserDto | null> {
    if (!this.token) return null;
    try {
      const res = await this.request<{ user: UserDto }>('/auth/me');
      return res.user;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  async ensureAuthenticated(): Promise<void> {
    if (this.token) {
      try {
        await this.request('/auth/me');
      } catch {
        this.setToken(null);
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry = false
  ): Promise<T> {
    if (!this.token && !endpoint.startsWith('/auth/')) {
      await this.ensureAuthenticated();
    }

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (options.body !== undefined && options.body !== null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.setToken(null);
      }

      let errMsg = `Lỗi yêu cầu máy chủ (${res.status})`;
      try {
        const errorJson = (await res.json()) as {
          message?: string;
          error?: string | { code?: string; message?: string };
        };
        if (typeof errorJson.error === 'string') {
          errMsg = errorJson.error;
        } else if (
          errorJson.error &&
          typeof errorJson.error === 'object' &&
          'message' in errorJson.error &&
          typeof errorJson.error.message === 'string'
        ) {
          errMsg = errorJson.error.message;
        } else if (typeof errorJson.message === 'string') {
          errMsg = errorJson.message;
        }
      } catch {
        // bỏ qua nếu response không phải JSON
      }
      throw new Error(errMsg);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return (await res.json()) as T;
  }

  // Classes
  async getClasses(): Promise<ClassDto[]> {
    try {
      const res = await this.request<{ classes?: ClassDto[] } | ClassDto[]>('/classes');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.classes)) return res.classes;
      return [];
    } catch {
      return [];
    }
  }

  async createClass(req: CreateClassRequest): Promise<ClassDto> {
    return this.request<ClassDto>('/classes', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async deleteClass(classId: string): Promise<void> {
    return this.request<void>(`/classes/${classId}`, {
      method: 'DELETE',
    });
  }

  // Students
  async getStudents(classId: string): Promise<StudentDto[]> {
    try {
      const res = await this.request<{ students?: StudentDto[] } | StudentDto[]>(
        `/classes/${classId}/students`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.students)) return res.students;
      return [];
    } catch {
      return [];
    }
  }

  async createStudent(classId: string, req: CreateStudentRequest): Promise<StudentDto> {
    return this.request<StudentDto>(`/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updateStudent(
    classId: string,
    studentId: string,
    req: UpdateStudentRequest
  ): Promise<StudentDto> {
    const res = await this.request<{ student: StudentDto }>(
      `/classes/${classId}/students/${studentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(req),
      }
    );
    return res.student;
  }

  async deleteStudent(studentId: string): Promise<void> {
    return this.request<void>(`/students/${studentId}`, {
      method: 'DELETE',
    });
  }

  async setStudentPin(studentId: string, pin: string | null): Promise<void> {
    return this.request<void>(`/students/${studentId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin }),
    });
  }

  async importStudents(
    classId: string,
    students: CreateStudentRequest[],
    skipDuplicates: boolean
  ): Promise<{ added: number }> {
    return this.request<{ added: number }>(`/classes/${classId}/students/import`, {
      method: 'POST',
      body: JSON.stringify({ students, skipDuplicates }),
    });
  }

  // Question sets
  async getQuestionSets(): Promise<QuestionSetItem[]> {
    try {
      const res = await this.request<
        | {
            questionSets?: Array<{
              id: string;
              ownerId: string;
              title: string;
              subject: string;
              grade: number;
              tags: string[];
              questionCount?: number;
              questions?: unknown[];
              updatedAt: number;
            }>;
          }
        | Array<{
            id: string;
            ownerId: string;
            title: string;
            subject: string;
            grade: number;
            tags: string[];
            questionCount?: number;
            questions?: unknown[];
            updatedAt: number;
          }>
      >('/question-sets');

      const raw = Array.isArray(res) ? res : (res?.questionSets ?? []);

      return raw.map(item => ({
        id: item.id,
        ownerId: item.ownerId,
        title: item.title,
        subject: item.subject,
        grade: item.grade,
        tags: item.tags ?? [],
        questionCount: item.questionCount ?? (item.questions?.length || 0),
        updatedAt: item.updatedAt || Date.now(),
      }));
    } catch {
      return [];
    }
  }

  async createQuestionSet(data: {
    title: string;
    subject: string;
    grade: number;
    tags: string[];
    questions?: unknown[];
  }): Promise<{ id: string }> {
    const res = await this.request<{ questionSet?: { id: string }; id?: string }>(
      '/question-sets',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return { id: res.questionSet?.id ?? res.id ?? '' };
  }

  async getQuestionSet(id: string): Promise<{
    questionSet: QuestionSetItem & { questions: unknown[] };
    questions: unknown[];
  }> {
    const res = await this.request<{
      questionSet?: QuestionSetItem & { questions?: unknown[] };
      questions?: unknown[];
    }>(`/question-sets/${id}`);

    const qList = res.questions ?? res.questionSet?.questions ?? [];
    return {
      questionSet: {
        ...(res.questionSet as QuestionSetItem & { questions: unknown[] }),
        questions: qList,
      },
      questions: qList,
    };
  }

  async updateQuestionSet(
    id: string,
    data: {
      title?: string;
      subject?: string;
      grade?: number;
      tags?: string[];
      questions?: unknown[];
    }
  ): Promise<void> {
    return this.request<void>(`/question-sets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuestionSet(id: string): Promise<void> {
    return this.request<void>(`/question-sets/${id}`, {
      method: 'DELETE',
    });
  }

  async cloneQuestionSet(id: string, newTitle?: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/question-sets/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ title: newTitle }),
    });
  }

  async exportQuestionSet(id: string): Promise<EduclassPackage> {
    return this.request<EduclassPackage>(`/question-sets/${id}/export`);
  }

  async importQuestionSet(pkg: EduclassPackage): Promise<{ id: string }> {
    return this.request<{ id: string }>('/question-sets/import', {
      method: 'POST',
      body: JSON.stringify(pkg),
    });
  }

  async importWord<T = unknown>(base64: string): Promise<T> {
    return this.request<T>('/question-sets/import-word', {
      method: 'POST',
      body: JSON.stringify({ base64 }),
    });
  }

  // Sessions
  async getActiveSession(): Promise<SessionDetailResponse | null> {
    try {
      const res = await this.request<SessionDetailResponse | { session?: unknown }>(
        '/sessions/active'
      );
      if (!res) return null;

      // 1. Trường hợp chuẩn: { session: { id, joinCode, ... }, className, joinUrl, qrDataUrl }
      if (
        'session' in res &&
        res.session &&
        typeof res.session === 'object' &&
        'joinCode' in (res.session as Record<string, unknown>)
      ) {
        return res as SessionDetailResponse;
      }

      // 2. Trường hợp lồng: { session: { session: ... } }
      if (
        'session' in res &&
        res.session &&
        typeof res.session === 'object' &&
        'session' in (res.session as Record<string, unknown>)
      ) {
        return res.session as unknown as SessionDetailResponse;
      }

      // 3. Trường hợp server trả về SessionDto phẳng: { id, joinCode, status, ... }
      if ('joinCode' in (res as Record<string, unknown>)) {
        return {
          session: res as unknown as SessionDetailResponse['session'],
          className: (res as unknown as { className?: string }).className ?? null,
          joinUrl: (res as unknown as { joinUrl?: string }).joinUrl,
          qrDataUrl: (res as unknown as { qrDataUrl?: string }).qrDataUrl,
        };
      }

      return res as unknown as SessionDetailResponse;
    } catch {
      return null;
    }
  }

  async createSession(req: CreateSessionRequest): Promise<SessionDetailResponse> {
    return this.request<SessionDetailResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async closeSession(sessionId: string): Promise<SessionReportDto> {
    const res = await this.request<
      { session?: SessionDto; report?: SessionReportDto } | SessionReportDto
    >(`/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Giáo viên kết thúc tiết học' }),
    });
    if (res && typeof res === 'object' && 'report' in res && res.report) {
      return res.report;
    }
    return res as SessionReportDto;
  }

  async closeActiveSession(): Promise<SessionReportDto | null> {
    try {
      return await this.request<SessionReportDto>('/sessions/close-active', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch {
      return null;
    }
  }

  async getSessionReport(sessionId: string): Promise<SessionReportDto> {
    return this.request<SessionReportDto>(`/sessions/${sessionId}/report`);
  }

  async getSessionReports(): Promise<SessionReportListItem[]> {
    try {
      const res = await this.request<{ reports: SessionReportListItem[] }>('/sessions/reports');
      return res.reports || [];
    } catch {
      return [];
    }
  }

  async getActiveQuizSummary(sessionId: string): Promise<QuizSummaryReport | null> {
    try {
      const res = await this.request<{ summary: QuizSummaryReport | null }>(
        `/sessions/${sessionId}/quiz-summary`
      );
      return res.summary;
    } catch {
      return null;
    }
  }

  async getQuizRuns(sessionId: string): Promise<QuizSummaryReport[]> {
    try {
      const res = await this.request<{ runs: QuizSummaryReport[] }>(
        `/sessions/${sessionId}/quiz-runs`
      );
      return res.runs || [];
    } catch {
      return [];
    }
  }

  async getParticipants(sessionId: string): Promise<ParticipantDto[]> {
    try {
      const res = await this.request<
        | {
            participants?: ParticipantDto[];
          }
        | ParticipantDto[]
      >(`/sessions/${sessionId}/participants`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.participants)) return res.participants;
      return [];
    } catch {
      return [];
    }
  }

  async releaseParticipant(sessionId: string, participantId: string): Promise<void> {
    try {
      await this.request<void>(`/sessions/${sessionId}/participants/${participantId}/release`, {
        method: 'POST',
      });
    } catch {
      await this.request<void>(`/sessions/${sessionId}/release-participant`, {
        method: 'POST',
        body: JSON.stringify({ participantId }),
      });
    }
  }

  async grantReward(
    sessionId: string,
    participantId: string,
    exp: number,
    reason: string
  ): Promise<void> {
    try {
      await this.request<void>(`/sessions/${sessionId}/rewards/grant`, {
        method: 'POST',
        body: JSON.stringify({ participantId, exp, reason }),
      });
    } catch {
      await this.request<void>(`/sessions/${sessionId}/rewards`, {
        method: 'POST',
        body: JSON.stringify({ participantId, exp, reason }),
      });
    }
  }

  // Activities
  async getActivities(): Promise<ActivityMeta[]> {
    try {
      const res = await this.request<{ activities?: ActivityMeta[] } | ActivityMeta[]>(
        '/activities'
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.activities)) return res.activities;
    } catch {
      // Fallback
    }
    return [
      {
        id: 'quiz-live',
        name: 'Quiz Live (Kahoot / Quizizz)',
        version: 1,
        icon: '⚡',
        capabilities: ['chat-lock'],
        rewardTriggers: ['correct_answer', 'finish', 'top3', 'speed_streak'],
      },
      {
        id: 'quick-poll',
        name: 'Bình chọn nhanh (Poll)',
        version: 1,
        icon: '📊',
        capabilities: [],
        rewardTriggers: ['participation'],
      },
      {
        id: 'exam',
        name: 'Kỳ thi trắc nghiệm',
        version: 1,
        icon: '📝',
        capabilities: ['chat-lock'],
        rewardTriggers: ['finish', 'high_score'],
      },
      {
        id: 'assignment-hub',
        name: 'Thu - phát bài tập',
        version: 1,
        icon: '📁',
        capabilities: [],
        rewardTriggers: ['submit'],
      },
      {
        id: 'swiss-duel',
        name: 'Đấu Cờ Thụy Sỹ (Swiss Duel)',
        version: 1,
        icon: '⚔️',
        capabilities: ['chat-lock'],
        rewardTriggers: ['win', 'draw', 'finish'],
      },
      {
        id: 'pdf-presenter',
        name: 'Trình chiếu PDF & Slide',
        version: 1,
        icon: '📑',
        capabilities: [],
        rewardTriggers: [],
      },
      {
        id: 'object-camera',
        name: 'Camera vật thể (Soi bài)',
        version: 1,
        icon: '📷',
        capabilities: [],
        rewardTriggers: [],
      },
      {
        id: 'territory-war',
        name: 'Đại Chiến Lãnh Thổ (Chiếm đất)',
        version: 1,
        icon: '🚩',
        capabilities: ['chat-lock'],
        rewardTriggers: ['capture', 'win', 'sudden_death'],
      },
    ];
  }

  async getCurrentActivity(
    sessionId: string,
    options?: { activityId?: string; runId?: string }
  ): Promise<{ run: { id: string; activityId: string; config?: unknown } | null; state: unknown }> {
    try {
      const q = new URLSearchParams();
      if (options?.activityId) q.set('activityId', options.activityId);
      if (options?.runId) q.set('runId', options.runId);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await this.request<{
        run: { id: string; activityId: string; config?: unknown } | null;
        state: unknown;
      }>(`/sessions/${sessionId}/activities/current${queryStr}`);
    } catch {
      return { run: null, state: null };
    }
  }

  async getActiveActivities(
    sessionId: string
  ): Promise<Array<{ runId: string; activityId: string; state: unknown; config?: unknown }>> {
    try {
      const res = await this.request<{
        activeRuns: Array<{
          run: { id: string; activityId: string; config?: unknown };
          state: unknown;
        }>;
      }>(`/sessions/${sessionId}/activities/active`);
      if (res && Array.isArray(res.activeRuns)) {
        return res.activeRuns.map(item => ({
          runId: item.run.id,
          activityId: item.run.activityId,
          state: item.state,
          config: item.run.config,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  async startActivity(
    sessionId: string,
    activityId: string,
    config: unknown
  ): Promise<{ runId: string; activityId: string; state: unknown }> {
    try {
      const res = await this.request<{
        run?: { id: string; activityId: string };
        runId?: string;
        activityId?: string;
        state: unknown;
      }>(`/sessions/${sessionId}/activities/start`, {
        method: 'POST',
        body: JSON.stringify({ activityId, config }),
      });
      return {
        runId: res.run?.id ?? res.runId ?? '',
        activityId: res.run?.activityId ?? res.activityId ?? activityId,
        state: res.state,
      };
    } catch {
      return this.request<{ runId: string; activityId: string; state: unknown }>(
        '/activities/run',
        {
          method: 'POST',
          body: JSON.stringify({ sessionId, activityId, config }),
        }
      );
    }
  }

  async sendTeacherIntent(
    arg1: string,
    arg2: unknown,
    arg3?: unknown
  ): Promise<{ state: unknown }> {
    let sessionId = '';
    let runId = '';
    let intent: unknown = null;
    if (arg3 !== undefined) {
      sessionId = arg1;
      runId = arg2 as string;
      intent = arg3;
    } else {
      runId = arg1;
      intent = arg2;
    }

    if (sessionId) {
      try {
        return await this.request<{ state: unknown }>(
          `/sessions/${sessionId}/activities/teacher-intent`,
          {
            method: 'POST',
            body: JSON.stringify({ runId, intent }),
          }
        );
      } catch {
        // Fallback
      }
    }
    return this.request<{ state: unknown }>(`/activities/runs/${runId}/intent`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, intent }),
    });
  }

  async endActivity(arg1: string, arg2?: string): Promise<{ results: unknown[] }> {
    let sessionId = '';
    let runId = '';
    if (arg2) {
      sessionId = arg1;
      runId = arg2;
    } else {
      runId = arg1;
    }

    if (sessionId) {
      try {
        return await this.request<{ results: unknown[] }>(`/sessions/${sessionId}/activities/end`, {
          method: 'POST',
          body: JSON.stringify({ runId }),
        });
      } catch {
        // Fallback
      }
    }
    return this.request<{ results: unknown[] }>(`/activities/runs/${runId}/end`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  // EXP / Reward Rules
  async getRewardRules(): Promise<{
    globalRules: RewardRuleDto[];
    teacherRules: RewardRuleDto[];
    effectiveRules: RewardRuleDto[];
    sessionCap?: number | null;
    activityCaps?: Record<string, number>;
  }> {
    try {
      const res = await this.request<{
        globalRules?: RewardRuleDto[];
        teacherRules?: RewardRuleDto[];
        effectiveRules?: RewardRuleDto[];
        sessionCap?: number | null;
        activityCaps?: Record<string, number>;
      }>('/reward-rules');

      return {
        globalRules: Array.isArray(res?.globalRules) ? res.globalRules : [],
        teacherRules: Array.isArray(res?.teacherRules) ? res.teacherRules : [],
        effectiveRules: Array.isArray(res?.effectiveRules) ? res.effectiveRules : [],
        sessionCap: res?.sessionCap ?? null,
        activityCaps: res?.activityCaps ?? {},
      };
    } catch {
      return {
        globalRules: [],
        teacherRules: [],
        effectiveRules: [],
        sessionCap: null,
        activityCaps: {},
      };
    }
  }

  async saveRewardRules(rules: RewardRuleItemInput[]): Promise<void> {
    return this.request<void>('/reward-rules', {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    });
  }

  async resetRewardRules(): Promise<void> {
    return this.request<void>('/reward-rules/mine', {
      method: 'DELETE',
    });
  }

  // Chat & Trợ giúp GV <-> HS
  async sendChatMessage(
    sessionId: string,
    payload: { text: string; toParticipantId?: string | null; kind?: 'text' | 'hand_raise' }
  ): Promise<ChatMessageDto> {
    const res = await this.request<{ success: boolean; message: ChatMessageDto }>(
      `/sessions/${sessionId}/chat/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessageDto[]> {
    try {
      const res = await this.request<{ messages: ChatMessageDto[] }>(
        `/sessions/${sessionId}/chat/messages`
      );
      return Array.isArray(res?.messages) ? res.messages : [];
    } catch {
      return [];
    }
  }

  async getChatStatus(sessionId: string): Promise<{
    chatLocked: boolean;
    activeHandRaises: Array<{
      participantId: string;
      participantName: string;
      requestedAt: number;
      message?: string;
    }>;
  }> {
    try {
      return await this.request<{
        chatLocked: boolean;
        activeHandRaises: Array<{
          participantId: string;
          participantName: string;
          requestedAt: number;
          message?: string;
        }>;
      }>(`/sessions/${sessionId}/chat/status`);
    } catch {
      return { chatLocked: false, activeHandRaises: [] };
    }
  }

  async toggleChatLock(sessionId: string, locked: boolean): Promise<boolean> {
    const res = await this.request<{ success: boolean; chatLocked: boolean }>(
      `/sessions/${sessionId}/chat/lock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ locked }),
      }
    );
    return res.chatLocked;
  }

  async resolveHandRaise(sessionId: string, participantId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}/chat/hand-raise/resolve`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  }

  // --- KHO LƯU VIDEO HỌC LIỆU YOUTUBE ---

  async getVideos(params?: {
    category?: string | undefined;
    search?: string | undefined;
  }): Promise<VideoDto[]> {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'all') {
      q.set('category', params.category);
    }
    if (params?.search && params.search.trim()) {
      q.set('search', params.search.trim());
    }
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<{ videos: VideoDto[] }>(`/videos${qs}`);
    return res?.videos ?? [];
  }

  async getVideoCategories(): Promise<string[]> {
    const res = await this.request<{ categories: string[] }>('/videos/categories');
    return res?.categories ?? [];
  }

  async createVideo(data: CreateVideoRequest): Promise<VideoDto> {
    const res = await this.request<{ video: VideoDto }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.video;
  }

  async updateVideo(id: string, data: UpdateVideoRequest): Promise<VideoDto> {
    const res = await this.request<{ video: VideoDto }>(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.video;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/videos/${id}`, {
      method: 'DELETE',
    });
    return !!res?.success;
  }

  // --- QUẢN LÝ KỲ THI THEO CA & BÁO CÁO KỲ THI LÂU DÀI ---

  async getExams(params?: {
    classId?: string | undefined;
    status?: string | undefined;
    folder?: string | undefined;
  }): Promise<ExamListItemDto[]> {
    const q = new URLSearchParams();
    if (params?.classId) {
      q.set('classId', params.classId);
    }
    if (params?.status && params.status !== 'all') {
      q.set('status', params.status);
    }
    if (params?.folder && params.folder !== 'all') {
      q.set('folder', params.folder);
    }
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<{ exams: ExamListItemDto[] }>(`/exams${qs}`);
    return res?.exams ?? [];
  }

  async cloneExam(id: string, data: CloneExamRequest): Promise<{ exam: ExamDetailDto }> {
    return this.request<{ exam: ExamDetailDto }>(`/exams/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExamDetail(id: string): Promise<ExamDetailDto> {
    const res = await this.request<{ exam: ExamDetailDto }>(`/exams/${id}`);
    return res.exam;
  }

  async createExam(data: CreateExamRequest): Promise<ExamDetailDto> {
    const res = await this.request<{ exam: ExamDetailDto }>('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.exam;
  }

  async updateExam(id: string, data: UpdateExamRequest): Promise<unknown> {
    const res = await this.request<{ exam: unknown }>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.exam;
  }

  async deleteExam(id: string): Promise<boolean> {
    const res = await this.request<{ ok: boolean }>(`/exams/${id}`, {
      method: 'DELETE',
    });
    return !!res?.ok;
  }

  async startExamBatch(id: string, data: StartExamBatchRequest): Promise<unknown> {
    const res = await this.request<{ ok: boolean; exam: unknown }>(`/exams/${id}/start-batch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async pauseExamBatch(id: string, data?: PauseExamBatchRequest): Promise<unknown> {
    const res = await this.request<{ ok: boolean; exam: unknown }>(`/exams/${id}/pause-batch`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    });
    return res;
  }

  async finishExam(id: string, data?: FinishExamRequest): Promise<unknown> {
    const res = await this.request<{ ok: boolean; exam: unknown }>(`/exams/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify(data ?? { confirm: true }),
    });
    return res;
  }

  async getExamEligibility(id: string): Promise<{ students: StudentExamEligibilityDto[] }> {
    return this.request<{ students: StudentExamEligibilityDto[] }>(`/exams/${id}/eligibility`);
  }

  async downloadExamExcel(id: string, title?: string): Promise<void> {
    if (!this.token) {
      await this.ensureAuthenticated();
    }
    const tokenParam = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    const res = await fetch(`${API_BASE}/exams/${id}/export-excel${tokenParam}`, {
      method: 'GET',
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } })?.error?.message ||
          'Không thể tải file báo cáo Excel'
      );
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (title || id).replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `BangDiem_${safeTitle}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async downloadSessionExcel(sessionId: string): Promise<void> {
    if (!this.token) {
      await this.ensureAuthenticated();
    }
    const tokenParam = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/export-excel${tokenParam}`, {
      method: 'GET',
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } })?.error?.message ||
          'Không thể tải file Excel phiên học'
      );
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCao_PhienHoc_${sessionId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // ================= NGÂN HÀNG CÂU HỎI & MA TRẬN ĐỀ THI =================

  /**
   * Lấy cây phân cấp Khối -> Môn -> Chương -> Bài kèm số lượng câu hỏi
   */
  async getBankTree(params?: {
    grade?: number;
    subject?: string;
  }): Promise<BankCurriculumTreeNode[]> {
    const q = new URLSearchParams();
    if (params?.grade !== undefined) q.set('grade', String(params.grade));
    if (params?.subject) q.set('subject', params.subject);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<BankCurriculumTreeNode[]>(`/bank/tree${qs}`);
    return Array.isArray(res) ? res : [];
  }

  /**
   * Lọc và tìm kiếm danh sách câu hỏi trong ngân hàng
   */
  async getBankQuestions(params?: {
    grade?: number;
    subject?: string;
    chapter?: string;
    lesson?: string;
    difficulty?: DifficultyLevel;
    type?: QuestionType;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<BankQuestionDto[]> {
    const q = new URLSearchParams();
    if (params?.grade !== undefined) q.set('grade', String(params.grade));
    if (params?.subject) q.set('subject', params.subject);
    if (params?.chapter) q.set('chapter', params.chapter);
    if (params?.lesson) q.set('lesson', params.lesson);
    if (params?.difficulty) q.set('difficulty', params.difficulty);
    if (params?.type) q.set('type', params.type);
    if (params?.search) q.set('search', params.search);
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    if (params?.offset !== undefined) q.set('offset', String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<BankQuestionDto[]>(`/bank/questions${qs}`);
    return Array.isArray(res) ? res : [];
  }

  /**
   * Lấy chi tiết một câu hỏi ngân hàng
   */
  async getBankQuestionDetail(id: string): Promise<BankQuestionDto> {
    return this.request<BankQuestionDto>(`/bank/questions/${id}`);
  }

  /**
   * Tạo câu hỏi mới vào ngân hàng
   */
  async createBankQuestion(data: CreateBankQuestionRequest): Promise<BankQuestionDto> {
    return this.request<BankQuestionDto>('/bank/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Tạo hàng loạt câu hỏi vào ngân hàng (sau khi phân tích Word)
   */
  async createBatchBankQuestions(
    questions: CreateBankQuestionRequest[]
  ): Promise<{ success: boolean; count: number }> {
    return this.request<{ success: boolean; count: number }>('/bank/questions/batch', {
      method: 'POST',
      body: JSON.stringify({ questions }),
    });
  }

  /**
   * Cập nhật câu hỏi ngân hàng
   */
  async updateBankQuestion(id: string, data: UpdateBankQuestionRequest): Promise<BankQuestionDto> {
    return this.request<BankQuestionDto>(`/bank/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Xóa câu hỏi ngân hàng và dọn ảnh mồ côi
   */
  async deleteBankQuestion(id: string): Promise<{ success: boolean; cleanedAssetsCount: number }> {
    return this.request<{ success: boolean; cleanedAssetsCount: number }>(`/bank/questions/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Thống kê số lượng câu sẵn có cho cấu hình ma trận
   */
  async getMatrixStats(data: MatrixStatsRequest): Promise<MatrixStatsResponse> {
    return this.request<MatrixStatsResponse>('/bank/matrix-stats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Sinh bộ đề ngẫu nhiên từ ma trận câu hỏi và lưu vào kho đề thi
   */
  async generateSetFromMatrix(
    data: MatrixGenerateRequest
  ): Promise<{ success: boolean; setId: string; title: string; totalQuestions: number }> {
    return this.request<{
      success: boolean;
      setId: string;
      title: string;
      totalQuestions: number;
    }>('/bank/generate-set', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Bốc ngẫu nhiên câu hỏi theo ma trận để xem trước và đổi câu tương đương (Task 4.2)
   */
  async previewSetFromMatrix(
    data: MatrixGenerateRequest
  ): Promise<{ questions: BankQuestionDto[]; totalQuestions: number }> {
    return this.request<{ questions: BankQuestionDto[]; totalQuestions: number }>(
      '/bank/preview-set',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Lấy cấu trúc toàn bộ nhóm trong lớp kèm thành viên
   */
  async getClassGroups(classId: string): Promise<ClassGroupOverviewResponse> {
    return this.request<ClassGroupOverviewResponse>(`/classes/${classId}/groups`);
  }

  /**
   * Tạo một nhóm học sinh mới trong lớp
   */
  async createClassGroup(
    classId: string,
    data: CreateClassGroupRequest
  ): Promise<{ group: ClassGroupDto }> {
    return this.request<{ group: ClassGroupDto }>(`/classes/${classId}/groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cập nhật thông tin nhóm (tên, thứ tự)
   */
  async updateClassGroup(
    groupId: string,
    data: UpdateClassGroupRequest
  ): Promise<{ success: boolean; group: ClassGroupDto }> {
    return this.request<{ success: boolean; group: ClassGroupDto }>(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh
   */
  async randomizeClassGroups(
    classId: string,
    data: RandomizeGroupsRequest
  ): Promise<ClassGroupOverviewResponse> {
    return this.request<ClassGroupOverviewResponse>(`/classes/${classId}/groups/randomize`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Gán hoặc chuyển học sinh sang nhóm mới (hoặc null để bỏ nhóm)
   */
  async assignStudentGroup(
    studentId: string,
    groupId: string | null
  ): Promise<{ success: boolean; student: StudentDto | null }> {
    return this.request<{ success: boolean; student: StudentDto | null }>(
      `/students/${studentId}/group`,
      {
        method: 'PUT',
        body: JSON.stringify({ groupId }),
      }
    );
  }

  /**
   * Chỉ định hoặc thay đổi nhóm trưởng cho nhóm
   */
  async assignGroupLeader(
    groupId: string,
    studentId: string | null
  ): Promise<{ success: boolean; group: ClassGroupDto | null }> {
    return this.request<{ success: boolean; group: ClassGroupDto | null }>(
      `/groups/${groupId}/leader`,
      {
        method: 'PUT',
        body: JSON.stringify({ studentId }),
      }
    );
  }

  /**
   * Xóa một nhóm
   */
  async deleteClassGroup(groupId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new TeacherApiClient();
