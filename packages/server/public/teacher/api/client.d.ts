import type { ActivityMeta, ClassDto, CreateClassRequest, CreateSessionRequest, CreateStudentRequest, EduclassPackage, ParticipantDto, RewardRuleDto, RewardRuleItemInput, SessionDetailResponse, SessionReportDto, SessionReportListItem, QuizSummaryReport, StudentDto, UpdateStudentRequest, ChatMessageDto, VideoDto, CreateVideoRequest, UpdateVideoRequest, CreateExamRequest, UpdateExamRequest, CloneExamRequest, StartExamBatchRequest, PauseExamBatchRequest, FinishExamRequest, ExamListItemDto, ExamDetailDto, StudentExamEligibilityDto, BankQuestionDto, CreateBankQuestionRequest, UpdateBankQuestionRequest, BankCurriculumTreeNode, MatrixStatsRequest, MatrixStatsResponse, MatrixGenerateRequest, DifficultyLevel, QuestionType, ClassGroupDto, ClassGroupOverviewResponse, CreateClassGroupRequest, UpdateClassGroupRequest, RandomizeGroupsRequest, UserDto, TeacherPublicProfile, RegisterTeacherRequest } from '@educlass/protocol';
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
export declare class TeacherApiClient {
    private token;
    constructor();
    getToken(): string | null;
    setToken(token: string | null): void;
    login(username?: string, password?: string): Promise<{
        token: string;
        user: UserDto;
    }>;
    getTeachers(): Promise<TeacherPublicProfile[]>;
    registerTeacher(data: RegisterTeacherRequest): Promise<UserDto>;
    resetPin(userId: string): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    logout(): Promise<void>;
    getMe(): Promise<UserDto | null>;
    ensureAuthenticated(): Promise<void>;
    private request;
    getClasses(): Promise<ClassDto[]>;
    createClass(req: CreateClassRequest): Promise<ClassDto>;
    deleteClass(classId: string): Promise<void>;
    getStudents(classId: string): Promise<StudentDto[]>;
    createStudent(classId: string, req: CreateStudentRequest): Promise<StudentDto>;
    updateStudent(classId: string, studentId: string, req: UpdateStudentRequest): Promise<StudentDto>;
    deleteStudent(studentId: string): Promise<void>;
    setStudentPin(studentId: string, pin: string | null): Promise<void>;
    importStudents(classId: string, students: CreateStudentRequest[], skipDuplicates: boolean): Promise<{
        added: number;
    }>;
    getQuestionSets(): Promise<QuestionSetItem[]>;
    createQuestionSet(data: {
        title: string;
        subject: string;
        grade: number;
        tags: string[];
        questions?: unknown[];
    }): Promise<{
        id: string;
    }>;
    getQuestionSet(id: string): Promise<{
        questionSet: QuestionSetItem & {
            questions: unknown[];
        };
        questions: unknown[];
    }>;
    updateQuestionSet(id: string, data: {
        title?: string;
        subject?: string;
        grade?: number;
        tags?: string[];
        questions?: unknown[];
    }): Promise<void>;
    deleteQuestionSet(id: string): Promise<void>;
    cloneQuestionSet(id: string, newTitle?: string): Promise<{
        id: string;
    }>;
    exportQuestionSet(id: string): Promise<EduclassPackage>;
    importQuestionSet(pkg: EduclassPackage): Promise<{
        id: string;
    }>;
    importWord<T = unknown>(base64: string): Promise<T>;
    getActiveSession(): Promise<SessionDetailResponse | null>;
    createSession(req: CreateSessionRequest): Promise<SessionDetailResponse>;
    closeSession(sessionId: string): Promise<SessionReportDto>;
    closeActiveSession(): Promise<SessionReportDto | null>;
    getSessionReport(sessionId: string): Promise<SessionReportDto>;
    getSessionReports(): Promise<SessionReportListItem[]>;
    getActiveQuizSummary(sessionId: string): Promise<QuizSummaryReport | null>;
    getQuizRuns(sessionId: string): Promise<QuizSummaryReport[]>;
    getParticipants(sessionId: string): Promise<ParticipantDto[]>;
    releaseParticipant(sessionId: string, participantId: string): Promise<void>;
    grantReward(sessionId: string, participantId: string, exp: number, reason: string): Promise<void>;
    getActivities(): Promise<ActivityMeta[]>;
    getCurrentActivity(sessionId: string, options?: {
        activityId?: string;
        runId?: string;
    }): Promise<{
        run: {
            id: string;
            activityId: string;
            config?: unknown;
        } | null;
        state: unknown;
    }>;
    getActiveActivities(sessionId: string): Promise<Array<{
        runId: string;
        activityId: string;
        state: unknown;
        config?: unknown;
    }>>;
    startActivity(sessionId: string, activityId: string, config: unknown): Promise<{
        runId: string;
        activityId: string;
        state: unknown;
    }>;
    sendTeacherIntent(arg1: string, arg2: unknown, arg3?: unknown): Promise<{
        state: unknown;
    }>;
    endActivity(arg1: string, arg2?: string): Promise<{
        results: unknown[];
    }>;
    getRewardRules(): Promise<{
        globalRules: RewardRuleDto[];
        teacherRules: RewardRuleDto[];
        effectiveRules: RewardRuleDto[];
        sessionCap?: number | null;
        activityCaps?: Record<string, number>;
    }>;
    saveRewardRules(rules: RewardRuleItemInput[]): Promise<void>;
    resetRewardRules(): Promise<void>;
    sendChatMessage(sessionId: string, payload: {
        text: string;
        toParticipantId?: string | null;
        kind?: 'text' | 'hand_raise';
    }): Promise<ChatMessageDto>;
    getChatMessages(sessionId: string): Promise<ChatMessageDto[]>;
    getChatStatus(sessionId: string): Promise<{
        chatLocked: boolean;
        activeHandRaises: Array<{
            participantId: string;
            participantName: string;
            requestedAt: number;
            message?: string;
        }>;
    }>;
    toggleChatLock(sessionId: string, locked: boolean): Promise<boolean>;
    resolveHandRaise(sessionId: string, participantId: string): Promise<void>;
    getVideos(params?: {
        category?: string | undefined;
        search?: string | undefined;
    }): Promise<VideoDto[]>;
    getVideoCategories(): Promise<string[]>;
    createVideo(data: CreateVideoRequest): Promise<VideoDto>;
    updateVideo(id: string, data: UpdateVideoRequest): Promise<VideoDto>;
    deleteVideo(id: string): Promise<boolean>;
    getExams(params?: {
        classId?: string | undefined;
        status?: string | undefined;
        folder?: string | undefined;
    }): Promise<ExamListItemDto[]>;
    cloneExam(id: string, data: CloneExamRequest): Promise<{
        exam: ExamDetailDto;
    }>;
    getExamDetail(id: string): Promise<ExamDetailDto>;
    createExam(data: CreateExamRequest): Promise<ExamDetailDto>;
    updateExam(id: string, data: UpdateExamRequest): Promise<unknown>;
    deleteExam(id: string): Promise<boolean>;
    startExamBatch(id: string, data: StartExamBatchRequest): Promise<unknown>;
    pauseExamBatch(id: string, data?: PauseExamBatchRequest): Promise<unknown>;
    finishExam(id: string, data?: FinishExamRequest): Promise<unknown>;
    getExamEligibility(id: string): Promise<{
        students: StudentExamEligibilityDto[];
    }>;
    downloadExamExcel(id: string, title?: string): Promise<void>;
    downloadSessionExcel(sessionId: string): Promise<void>;
    /**
     * Lấy cây phân cấp Khối -> Môn -> Chương -> Bài kèm số lượng câu hỏi
     */
    getBankTree(params?: {
        grade?: number;
        subject?: string;
    }): Promise<BankCurriculumTreeNode[]>;
    /**
     * Lọc và tìm kiếm danh sách câu hỏi trong ngân hàng
     */
    getBankQuestions(params?: {
        grade?: number;
        subject?: string;
        chapter?: string;
        lesson?: string;
        difficulty?: DifficultyLevel;
        type?: QuestionType;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<BankQuestionDto[]>;
    /**
     * Lấy chi tiết một câu hỏi ngân hàng
     */
    getBankQuestionDetail(id: string): Promise<BankQuestionDto>;
    /**
     * Tạo câu hỏi mới vào ngân hàng
     */
    createBankQuestion(data: CreateBankQuestionRequest): Promise<BankQuestionDto>;
    /**
     * Tạo hàng loạt câu hỏi vào ngân hàng (sau khi phân tích Word)
     */
    createBatchBankQuestions(questions: CreateBankQuestionRequest[]): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Cập nhật câu hỏi ngân hàng
     */
    updateBankQuestion(id: string, data: UpdateBankQuestionRequest): Promise<BankQuestionDto>;
    /**
     * Xóa câu hỏi ngân hàng và dọn ảnh mồ côi
     */
    deleteBankQuestion(id: string): Promise<{
        success: boolean;
        cleanedAssetsCount: number;
    }>;
    /**
     * Thống kê số lượng câu sẵn có cho cấu hình ma trận
     */
    getMatrixStats(data: MatrixStatsRequest): Promise<MatrixStatsResponse>;
    /**
     * Sinh bộ đề ngẫu nhiên từ ma trận câu hỏi và lưu vào kho đề thi
     */
    generateSetFromMatrix(data: MatrixGenerateRequest): Promise<{
        success: boolean;
        setId: string;
        title: string;
        totalQuestions: number;
    }>;
    /**
     * Bốc ngẫu nhiên câu hỏi theo ma trận để xem trước và đổi câu tương đương (Task 4.2)
     */
    previewSetFromMatrix(data: MatrixGenerateRequest): Promise<{
        questions: BankQuestionDto[];
        totalQuestions: number;
    }>;
    /**
     * Lấy cấu trúc toàn bộ nhóm trong lớp kèm thành viên
     */
    getClassGroups(classId: string): Promise<ClassGroupOverviewResponse>;
    /**
     * Tạo một nhóm học sinh mới trong lớp
     */
    createClassGroup(classId: string, data: CreateClassGroupRequest): Promise<{
        group: ClassGroupDto;
    }>;
    /**
     * Cập nhật thông tin nhóm (tên, thứ tự)
     */
    updateClassGroup(groupId: string, data: UpdateClassGroupRequest): Promise<{
        success: boolean;
        group: ClassGroupDto;
    }>;
    /**
     * Chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh
     */
    randomizeClassGroups(classId: string, data: RandomizeGroupsRequest): Promise<ClassGroupOverviewResponse>;
    /**
     * Gán hoặc chuyển học sinh sang nhóm mới (hoặc null để bỏ nhóm)
     */
    assignStudentGroup(studentId: string, groupId: string | null): Promise<{
        success: boolean;
        student: StudentDto | null;
    }>;
    /**
     * Chỉ định hoặc thay đổi nhóm trưởng cho nhóm
     */
    assignGroupLeader(groupId: string, studentId: string | null): Promise<{
        success: boolean;
        group: ClassGroupDto | null;
    }>;
    /**
     * Xóa một nhóm
     */
    deleteClassGroup(groupId: string): Promise<{
        success: boolean;
    }>;
}
export declare const api: TeacherApiClient;
//# sourceMappingURL=client.d.ts.map