declare module '*/public/student/js/state.js' {
  export const state: {
    participantId: string;
    studentName: string;
    studentChatMessages: Array<{
      id: string;
      text: string;
      fromParticipantId?: string;
      toParticipantId?: string;
      fromTeacher?: boolean;
    }>;
    unreadChatCount: number;
    isStudentChatOpen: boolean;
    isChatLocked: boolean;
    currentChatMode: string;
    currentQuestionIdx: number;
    hasAnsweredCurrentQuestion: boolean;
    myQuizQuestionOrder: number[] | null;
    currentRunId: string | null;
    pollAllowMultiple: boolean;
    pollChoices: number[];
    swissState: unknown;
    swissAnswers: Record<number, unknown>;
    swissLastRound: number;
    [key: string]: unknown;
  };
}

declare module '*/public/student/js/utils.js' {
  export function renderMath(text: string | null | undefined): string;
}

declare module '*/public/student/js/quiz.js' {
  export function resetQuizState(): void;
  export function handleActivityStateUpdate(runId: string, activityState: unknown): void;
  export function getStudentQuizQuestionOrder(totalQuestions: number, shuffle: boolean): number[];
  export function showQuizQuestion(quizState: unknown): void;
  export function handleSelectAnswer(optionIndex: number): Promise<void>;
  export function showQuestionReview(quizState: unknown): void;
  export function showLeaderboardStatus(quizState: unknown): void;
  export function showQuizFinished(quizState: unknown): void;
  export function showQuizizzAnswerReview(
    quizState: unknown,
    lastAns: unknown,
    selectedAnswer: unknown
  ): void;
  export function handleQuizReplay(): Promise<void>;
}

declare module '*/public/student/js/chat.js' {
  export function toggleStudentChatModal(): void;
  export function openStudentChatModal(): void;
  export function closeStudentChatModal(): void;
  export function updateChatBadge(): void;
  export function showChatToast(text: string): void;
  export function updateChatLockState(locked?: boolean, chatMode?: string): void;
  export function renderStudentChatMessages(): void;
  export function handleIncomingChatMessage(payload: {
    id: string;
    text: string;
    fromParticipantId?: string;
    toParticipantId?: string;
    fromTeacher?: boolean;
    fromParticipantName?: string;
  }): void;
  export function handleStudentSendChatMessage(): Promise<void>;
  export function handleStudentHandRaise(): Promise<void>;
  export function loadStudentChatHistory(): Promise<void>;
}

declare module '*/public/student/js/poll.js' {
  export function handleQuickPollUpdate(
    runId: string,
    pollState: {
      question?: string;
      allowMultiple?: boolean;
      options?: string[];
      votes?: Record<string, number[]>;
      isLocked?: boolean;
    }
  ): void;
  export function submitPollVote(choices: number[]): Promise<void>;
  export function handleSubmitPollMultiple(): void;
}

declare module '*/public/student/js/exam.js' {
  export function handleExamUpdate(runId: string, examStateData: unknown): void;
  export function getStudentExamQuestions(examStateData: {
    publicQuestions?: Array<{ id: string; type?: string; stem?: unknown; options?: unknown[] }>;
    participants?: Record<
      string,
      { questionOrder?: string[]; optionOrders?: Record<string, number[]> }
    >;
  }): Array<{ id: string; type?: string; stem?: unknown; options?: unknown[] }>;
  export function getStudentExamOptions(
    q: { id: string; type?: string; options?: unknown[] },
    examStateData: {
      participants?: Record<string, { optionOrders?: Record<string, number[]> }>;
    }
  ): unknown[];
  export function updateExamCountdown(examStateData: unknown): void;
  export function updateExamNavPalette(qList: unknown[]): void;
  export function renderExamQuestions(examStateData: unknown): void;
  export function handleSelectExamAnswer(questionId: string, answer: unknown): Promise<void>;
  export function handleSubmitExam(isAuto?: boolean): Promise<void>;
  export function toggleExamReview(): void;
  export function handleUnlockExam(): Promise<void>;
}

declare module '*/public/student/js/swiss.js' {
  export function handleSwissDuelUpdate(
    runId: string,
    swissStateData: {
      title?: string;
      currentRound?: number;
      totalRounds?: number;
      status?: string;
      participants?: Record<string, unknown>;
      matchups?: unknown[];
      countdownEndsAt?: number;
      leaderboard?: unknown[];
    }
  ): void;
  export function updateSwissCountdown(countdownEndsAt: number): void;
  export function renderSwissQuestions(questions: unknown[], isLocked: boolean): void;
  export function handleSelectSwissLocalAnswer(questionIndex: number, answer: unknown): void;
  export function handleInputSwissShortAnswer(questionIndex: number, text: string): void;
  export function updateSwissSubmitBtnState(): void;
  export function handleSubmitSwissRound(): Promise<void>;
  export function renderSwissAnswersReview(
    matchup: unknown,
    isP1: boolean,
    questions: unknown[]
  ): void;
  export function renderSwissMiniLeaderboard(leaderboard: unknown[]): void;
}

declare module '*/public/student/js/session.js' {
  export function onSessionCodeInput(val: string): void;
  export function loadSessionRoster(code: string): Promise<void>;
  export function renderRosterStudents(students: unknown[]): void;
  export function selectRosterStudent(st: unknown): void;
  export function filterRosterStudents(keyword: string): void;
  export function toggleGuestMode(toGuest: boolean): void;
  export function handleJoin(e: unknown): Promise<void>;
  export function showLobby(name: string): void;
  export function backToLobby(): void;
  export function handleDismissSubmittedExam(): void;
  export function connectWebSocket(code: string, sId: string, participant: unknown): void;
  export function startActivityPoller(): void;
  export function handleLeaveSession(): Promise<void>;
}

declare module '*/public/student/js/app.js' {
  export const state: unknown;
  export const renderMath: unknown;
  export const handleJoin: unknown;
  export const handleLeaveSession: unknown;
  export const handleSelectAnswer: unknown;
  export const handleSubmitExam: unknown;
  export const handleSubmitSwissRound: unknown;
  export const toggleStudentChatModal: unknown;
  export const openStudentChatModal: unknown;
  export const closeStudentChatModal: unknown;
  export const updateChatBadge: unknown;
  export const showChatToast: unknown;
  export const updateChatLockState: unknown;
  export const renderStudentChatMessages: unknown;
  export const handleIncomingChatMessage: unknown;
  export const handleStudentSendChatMessage: unknown;
  export const handleStudentHandRaise: unknown;
  export const loadStudentChatHistory: unknown;
  export const resetQuizState: unknown;
  export const handleActivityStateUpdate: unknown;
  export const getStudentQuizQuestionOrder: unknown;
  export const showQuizQuestion: unknown;
  export const showQuestionReview: unknown;
  export const showLeaderboardStatus: unknown;
  export const showQuizFinished: unknown;
  export const handleQuickPollUpdate: unknown;
  export const submitPollVote: unknown;
  export const handleSubmitPollMultiple: unknown;
  export const handleDismissSubmittedExam: unknown;
  export const handleExamUpdate: unknown;
  export const getStudentExamQuestions: unknown;
  export const getStudentExamOptions: unknown;
  export const updateExamCountdown: unknown;
  export const updateExamNavPalette: unknown;
  export const renderExamQuestions: unknown;
  export const handleSelectExamAnswer: unknown;
  export const toggleExamReview: unknown;
  export const handleUnlockExam: unknown;
  export const handleSwissDuelUpdate: unknown;
  export const updateSwissCountdown: unknown;
  export const renderSwissQuestions: unknown;
  export const handleSelectSwissLocalAnswer: unknown;
  export const handleInputSwissShortAnswer: unknown;
  export const updateSwissSubmitBtnState: unknown;
  export const renderSwissAnswersReview: unknown;
  export const renderSwissMiniLeaderboard: unknown;
  export const onSessionCodeInput: unknown;
  export const loadSessionRoster: unknown;
  export const renderRosterStudents: unknown;
  export const selectRosterStudent: unknown;
  export const filterRosterStudents: unknown;
  export const toggleGuestMode: unknown;
  export const showLobby: unknown;
  export const connectWebSocket: unknown;
  export const startActivityPoller: unknown;
  export const handleAssignmentUpdate: unknown;
  export const handleStudentFileSelected: unknown;
  export const handleClearSelectedStudentFile: unknown;
  export const handleShowResubmitForm: unknown;
  export const handleUploadAndSubmitAssignment: unknown;
  export const handleTerritoryWarUpdate: unknown;
  export const handleSelectTerritoryCell: unknown;
  export const handleSubmitTerritoryAnswer: unknown;
  export const handleCancelTerritoryCell: unknown;
}

declare module '*/public/student/js/assignment.js' {
  export function handleAssignmentUpdate(runId: string, assignmentState: unknown): void;
  export function handleStudentFileSelected(files: FileList | null): void;
  export function handleClearSelectedStudentFile(): void;
  export function handleShowResubmitForm(): void;
  export function handleUploadAndSubmitAssignment(): Promise<void>;
}

declare module '*/public/student/js/territory.js' {
  export function handleTerritoryWarUpdate(runId: string, territoryState: unknown): void;
  export function handleSelectTerritoryCell(cellId: string): Promise<void>;
  export function handleSubmitTerritoryAnswer(answer: unknown): Promise<void>;
  export function handleCancelTerritoryCell(): Promise<void>;
}
