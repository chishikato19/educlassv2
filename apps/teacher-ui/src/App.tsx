import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActivityMeta,
  ChatMessageDto,
  ClassDto,
  CreateClassRequest,
  CreateSessionRequest,
  CreateStudentRequest,
  EduclassPackage,
  HandRaiseItem,
  ParticipantDto,
  RewardRuleDto,
  RewardRuleItemInput,
  SessionDetailResponse,
  SessionReportDto,
  StudentDto,
  AcademicPerformance,
  UserDto,
} from '@educlass/protocol';
import { APP_VERSION } from '@educlass/protocol';
import type { Mcq4Question, Question } from '@educlass/question-kit';
import { Button, Modal, Toast, UI_COLORS } from '@educlass/ui-kit';
import { api } from './api/client.js';
import { ActivityPanel, type ActiveRunData } from './components/ActivityPanel.js';
import { ClassTab } from './components/ClassTab.js';
import { ExpSettingsTab } from './components/ExpSettingsTab.js';
import { QuestionBankTab, type QuestionSetItem } from './components/QuestionBankTab.js';
import { BankQuestionTab } from './components/BankQuestionTab.js';
import { QuestionEditor } from './components/QuestionEditor.js';
import { QuestionCardPreview } from './components/QuestionCardPreview.js';
import { SessionControl } from './components/SessionControl.js';
import { SessionReportsTab } from './components/SessionReportsTab.js';
import { VideoLibraryTab } from './components/VideoLibraryTab.js';
import { RandomPickerTab } from './components/random-picker/RandomPickerTab.js';
import { ExamReportsTab } from './components/ExamReportsTab.js';
import { TeacherLoginScreen } from './components/auth/TeacherLoginScreen.js';
import { ChangePinModal } from './components/auth/ChangePinModal.js';
import { LogoutWarningModal } from './components/auth/LogoutWarningModal.js';
import { UpdateModal } from './components/UpdateModal.js';

export type TeacherTab = 'classes' | 'questions' | 'session' | 'videos' | 'random-picker' | 'exp' | 'report' | 'exam-reports';

function getSessionJoinCode(sessionData: SessionDetailResponse | null | undefined): string {
  if (!sessionData) return '';
  if (sessionData.session?.joinCode) return sessionData.session.joinCode;
  const raw = sessionData as unknown as { joinCode?: string };
  return raw.joinCode ?? '';
}

function getSessionId(sessionData: SessionDetailResponse | null | undefined): string {
  if (!sessionData) return '';
  if (sessionData.session?.id) return sessionData.session.id;
  const raw = sessionData as unknown as { id?: string };
  return raw.id ?? '';
}

export const App: React.FC = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState<TeacherTab>('session');
  const [questionsSubTab, setQuestionsSubTab] = useState<'bank' | 'sets'>('bank');

  // Classes & Students
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [students, setStudents] = useState<StudentDto[]>([]);

  // Question sets
  const [questionSets, setQuestionSets] = useState<QuestionSetItem[]>([]);
  const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(false);
  const [editingQuestionSet, setEditingQuestionSet] = useState<QuestionSetItem | null>(null);
  const [editingQuestionsList, setEditingQuestionsList] = useState<Question[]>([]);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] = useState<Question | null>(null);
  const [showAllEditorAnswers, setShowAllEditorAnswers] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Sessions & Realtime
  const [activeSession, setActiveSession] = useState<SessionDetailResponse | null>(null);
  const [participants, setParticipants] = useState<ParticipantDto[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageDto[]>([]);
  const [handRaises, setHandRaises] = useState<HandRaiseItem[]>([]);
  const [chatLocked, setChatLocked] = useState(false);
  const [sessionReport, setSessionReport] = useState<SessionReportDto | null>(null);

  // Activities
  const [activities, setActivities] = useState<ActivityMeta[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRunData[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const activeRun = useMemo(() => {
    if (activeRuns.length === 0) return null;
    return activeRuns.find((r) => r.runId === selectedRunId) || activeRuns[0] || null;
  }, [activeRuns, selectedRunId]);

  const activeExamRun = useMemo(() => {
    return activeRuns.find((r) => r.activityId === 'exam') || null;
  }, [activeRuns]);
  const hasActiveExam = Boolean(
    activeExamRun &&
    (activeExamRun.state as { status?: string })?.status === 'in_progress'
  );
  const activeExamTitle = (activeExamRun?.state as { title?: string })?.title || 'Kỳ thi';
  const activeExamBatch = (activeExamRun?.state as { batchIndex?: number })?.batchIndex || 1;

  // EXP Rules
  const [globalRules, setGlobalRules] = useState<RewardRuleDto[]>([]);
  const [teacherRules, setTeacherRules] = useState<RewardRuleDto[]>([]);
  const [sessionCap, setSessionCap] = useState<number | null>(null);
  const [activityCaps, setActivityCaps] = useState<Record<string, number>>({});

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Auth & Profile state
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [isChangePinOpen, setIsChangePinOpen] = useState<boolean>(false);
  const [isLogoutWarningOpen, setIsLogoutWarningOpen] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // 1. Tải danh sách lớp học
  const loadClasses = useCallback(async () => {
    try {
      const cls = await api.getClasses();
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0]?.id);
      }
    } catch {
      // Bỏ qua lỗi ban đầu nếu chưa có lớp
    }
  }, [selectedClassId]);

  // 2. Tải danh sách học sinh theo lớp
  const loadStudents = useCallback(async (classId: string) => {
    try {
      const stds = await api.getStudents(classId);
      setStudents(stds);
    } catch {
      setStudents([]);
    }
  }, []);

  // 3. Tải danh sách bộ đề
  const loadQuestionSets = useCallback(async () => {
    setIsQuestionBankLoading(true);
    try {
      const sets = await api.getQuestionSets();
      setQuestionSets(sets);
    } catch {
      setQuestionSets([]);
    } finally {
      setIsQuestionBankLoading(false);
    }
  }, []);

  // 4. Tải các plugin hoạt động
  const loadActivities = useCallback(async () => {
    try {
      const acts = await api.getActivities();
      setActivities(acts);
    } catch {
      setActivities([]);
    }
  }, []);

  // 5. Tải quy tắc EXP
  const loadRewardRules = useCallback(async () => {
    try {
      const data = await api.getRewardRules();
      setGlobalRules(data.globalRules);
      setTeacherRules(data.teacherRules);
      setSessionCap(data.sessionCap ?? null);
      setActivityCaps(data.activityCaps ?? {});
    } catch {
      // Bỏ qua
    }
  }, []);

  // Tải danh sách học sinh tham gia phiên học
  const loadParticipants = useCallback(async (sessionId: string) => {
    try {
      const list = await api.getParticipants(sessionId);
      if (Array.isArray(list)) {
        setParticipants(list);
      }
    } catch {
      // Bỏ qua lỗi
    }
  }, []);

  // Tải dữ liệu trò chuyện & trạng thái giơ tay
  const loadChatData = useCallback(async (sessionId: string) => {
    try {
      const [msgs, status] = await Promise.all([
        api.getChatMessages(sessionId),
        api.getChatStatus(sessionId),
      ]);
      setChatMessages(msgs);
      setChatLocked(status.chatLocked);
      setHandRaises(status.activeHandRaises || []);
    } catch {
      // Bỏ qua lỗi ban đầu
    }
  }, []);

  // 6. Kiểm tra phiên học hiện tại
  const checkActiveSession = useCallback(async () => {
    try {
      const s = await api.getActiveSession();
      if (s) {
        setActiveSession(s);
        const sId = getSessionId(s);
        void loadParticipants(sId);
        void loadChatData(sId);
      } else {
        setActiveSession(null);
        setParticipants([]);
      }
    } catch {
      setActiveSession(null);
    }
  }, [loadParticipants, loadChatData]);

  // Khi chọn lớp khác
  useEffect(() => {
    if (selectedClassId) {
      void loadStudents(selectedClassId);
    }
  }, [selectedClassId, loadStudents]);

  // Định kỳ đồng bộ danh sách học sinh tham gia phiên học (dự phòng song song với WebSocket)
  useEffect(() => {
    if (!activeSession) return;
    const sessionId = getSessionId(activeSession);
    void loadParticipants(sessionId);
    void loadChatData(sessionId);
    void api.getActiveActivities(sessionId).then((acts) => {
      if (Array.isArray(acts) && acts.length > 0) {
        setActiveRuns(acts);
      }
    });

    const interval = setInterval(() => {
      void loadParticipants(sessionId);
    }, 2500);

    return () => clearInterval(interval);
  }, [activeSession, loadParticipants, loadChatData]);

  // Khởi động nạp dữ liệu khi giáo viên đã đăng nhập
  useEffect(() => {
    if (!currentUser) return;
    void loadClasses();
    void loadQuestionSets();
    void loadActivities();
    void loadRewardRules();
    void checkActiveSession();
  }, [currentUser, loadClasses, loadQuestionSets, loadActivities, loadRewardRules, checkActiveSession]);

  // Kết nối WebSocket khi có phiên học hoạt động
  useEffect(() => {
    if (!activeSession) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return () => {};
    }

    const host = window.location.host || 'localhost:3000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const sId = getSessionId(activeSession);
    const wsUrl = `${protocol}//${host}/ws?sessionId=${sId}&role=teacher`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            v: 1,
            id: 'teacher_init_' + Date.now(),
            type: 'ping',
            sessionId: sId,
            ts: Date.now(),
            payload: { role: 'teacher' },
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          const type = envelope.type;
          const payload = envelope.payload;

          if (type === 'participant_joined' || type === 'JOIN_SESSION') {
            const p = payload.participant || {
              id: payload.participantId || `p_${Date.now()}`,
              displayName: payload.displayName || 'Học sinh',
              identityLevel: payload.identityLevel || 'guest',
              status: 'online',
            };
            setParticipants((prev) => {
              const exists = prev.some(
                (item) => item.id === p.id || (p.displayName && item.displayName === p.displayName)
              );
              if (exists) return prev;
              return [...prev, p];
            });
            showToast(`Học sinh "${p.displayName}" vừa vào phòng!`);
            void loadParticipants(sId);
          } else if (type === 'participant_left') {
            setParticipants((prev) => prev.filter((p) => p.id !== payload.participantId));
            void loadParticipants(sId);
          } else if (type === 'chat:new_message' || type === 'chat_message') {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
          } else if (type === 'chat:lock_state' || type === 'chat_locked') {
            setChatLocked(Boolean(payload.locked));
          } else if (type === 'chat:hand_raise' || type === 'hand_raised') {
            setHandRaises((prev) => {
              if (prev.some((h) => h.participantId === payload.participantId)) return prev;
              return [...prev, payload];
            });
            showToast(`✋ Học sinh "${payload.participantName || 'Học sinh'}" vừa gửi yêu cầu trợ giúp!`);
          } else if (type === 'chat:hand_raise_resolved' || type === 'hand_raise_resolved') {
            setHandRaises((prev) => prev.filter((h) => h.participantId !== payload.participantId));
          } else if (
            type === 'activity_state_patch' ||
            type === 'activity_snapshot' ||
            type === 'activity_state'
          ) {
            const nextState = payload.state ?? payload;
            const targetRunId = payload.runId;
            const targetActivityId = payload.activityId;

            setActiveRuns((prev) => {
              const idx = prev.findIndex(
                (r) =>
                  (targetRunId && r.runId === targetRunId) ||
                  (targetActivityId && r.activityId === targetActivityId)
              );
              if (idx >= 0) {
                const updated = [...prev];
                const old = updated[idx];
                if (old) {
                  updated[idx] = {
                    ...old,
                    state: nextState,
                    runId: targetRunId || old.runId,
                    activityId: targetActivityId || old.activityId,
                    config: payload.config || old.config,
                  };
                }
                return updated;
              }
              if (targetRunId && targetActivityId) {
                return [
                  ...prev,
                  {
                    runId: targetRunId,
                    activityId: targetActivityId,
                    state: nextState,
                    config: payload.config,
                  },
                ];
              }
              return prev;
            });
          } else if (type === 'activity_ended' || type === 'activity_end') {
            const endedRunId = payload?.runId;
            const endedActivityId = payload?.activityId;
            setActiveRuns((prev) => {
              if (endedRunId) {
                return prev.filter((r) => r.runId !== endedRunId);
              }
              if (endedActivityId) {
                return prev.filter((r) => r.activityId !== endedActivityId);
              }
              return [];
            });
            showToast('Hoạt động đã kết thúc.');
          }
        } catch {
          // Bỏ qua lỗi phân tích envelope
        }
      };

      return () => {
        socket.close();
      };
    } catch {
      // Bỏ qua lỗi kết nối socket
      return () => {};
    }
  }, [activeSession, loadParticipants]);

  // Handlers cho ClassTab
  const handleCreateClass = async (data: CreateClassRequest) => {
    const created = await api.createClass(data);
    await loadClasses();
    setSelectedClassId(created.id);
    showToast('Tạo lớp học thành công!');
  };

  const handleDeleteClass = async (classId: string) => {
    await api.deleteClass(classId);
    await loadClasses();
    showToast('Đã xóa lớp học.');
  };

  const handleCreateStudent = async (classId: string, data: CreateStudentRequest) => {
    try {
      await api.createStudent(classId, data);
      await loadStudents(classId);
      showToast('Thêm học sinh thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi thêm học sinh';
      showToast(msg);
      throw err;
    }
  };

  const handleSetStudentPin = async (studentId: string, pin: string | null) => {
    try {
      await api.setStudentPin(studentId, pin);
      if (selectedClassId) {
        await loadStudents(selectedClassId);
      }
      showToast(pin ? 'Đã cài đặt mã PIN cho học sinh.' : 'Đã xóa mã PIN.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đặt mã PIN';
      showToast(msg);
      throw err;
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await api.deleteStudent(studentId);
      if (selectedClassId) {
        await loadStudents(selectedClassId);
      }
      showToast('Đã xóa học sinh.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa học sinh';
      showToast(msg);
      throw err;
    }
  };

  const handleUpdateStudent = async (
    studentId: string,
    fullName: string,
    code?: string,
    academicPerformance?: AcademicPerformance
  ) => {
    if (!selectedClassId) return;
    try {
      await api.updateStudent(selectedClassId, studentId, {
        fullName,
        code,
        academicPerformance,
      });
      await loadStudents(selectedClassId);
      showToast('Cập nhật thông tin học sinh thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật học sinh';
      showToast(msg);
      throw err;
    }
  };

  const handleImportStudents = async (
    classId: string,
    importedList: CreateStudentRequest[],
    skipDuplicates: boolean
  ) => {
    try {
      const res = await api.importStudents(classId, importedList, skipDuplicates);
      await loadStudents(classId);
      const count = res.added ?? (res as { insertedCount?: number }).insertedCount ?? importedList.length;
      showToast(`Đã thêm thành công ${count} học sinh vào lớp!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi nhập học sinh';
      showToast(msg);
      throw err;
    }
  };

  // Handlers cho QuestionBankTab
  const handleCreateQuestionSet = async (data: {
    title: string;
    subject: string;
    grade: number;
    tags: string[];
  }) => {
    await api.createQuestionSet(data);
    await loadQuestionSets();
    showToast('Tạo bộ câu hỏi thành công!');
  };

  const handleDeleteQuestionSet = async (id: string) => {
    await api.deleteQuestionSet(id);
    await loadQuestionSets();
    showToast('Đã xóa bộ câu hỏi và các hình ảnh liên quan.');
  };

  const handleCloneQuestionSet = async (id: string, newTitle?: string) => {
    await api.cloneQuestionSet(id, newTitle);
    await loadQuestionSets();
    showToast('Nhân bản bộ câu hỏi thành công!');
  };

  const handleExportQuestionSet = async (id: string) => {
    const pkg = await api.exportQuestionSet(id);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bo-de-${id}.educlass`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file .educlass!');
  };

  const handleImportQuestionSet = async (pkg: EduclassPackage) => {
    await api.importQuestionSet(pkg);
    await loadQuestionSets();
    showToast('Nhập bộ câu hỏi thành công!');
  };

  const handleImportWordQuestions = async (data: {
    setInfo: { title: string; subject: string; grade: number; tags: string[] };
    questions: Question[];
  }) => {
    await api.createQuestionSet({
      ...data.setInfo,
      questions: data.questions,
    });
    await loadQuestionSets();
    showToast(`Đã nhập thành công ${data.questions.length} câu hỏi từ file Word!`);
  };

  // Mở trình soạn thảo câu hỏi
  const handleOpenQuestionEditor = async (item: QuestionSetItem) => {
    setEditingQuestionSet(item);
    try {
      const data = await api.getQuestionSet(item.id);
      setEditingQuestionsList((data.questions as Question[]) || []);
      setIsEditorModalOpen(true);
    } catch {
      setEditingQuestionsList([]);
      setIsEditorModalOpen(true);
    }
  };

  // Handlers cho SessionControl
  const handleOpenSession = async (req: CreateSessionRequest) => {
    try {
      const s = await api.createSession(req);
      setActiveSession(s);
      setParticipants([]);
      showToast(`Mở phiên học thành công! Mã phòng: ${getSessionJoinCode(s)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi mở phiên học';
      // Nếu có phiên cũ chưa đóng, thử giải phóng
      if (msg.includes('đang có một phiên học khác')) {
        await api.closeActiveSession();
        const s = await api.createSession(req);
        setActiveSession(s);
        setParticipants([]);
        showToast(`Đã đóng phiên cũ và mở phiên mới: ${getSessionJoinCode(s)}`);
      } else {
        showToast(msg);
      }
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const report = await api.closeSession(sessionId);
      setActiveSession(null);
      setParticipants([]);
      setActiveRuns([]);
      setSelectedRunId(null);
      setSessionReport(report);
      setActiveTab('report');
      showToast('Đã đóng phiên học và tạo báo cáo tổng kết.');
    } catch (err: unknown) {
      // Fallback đóng phiên đang mở nếu endpoint chính gặp sự cố
      try {
        await api.closeActiveSession();
        setActiveSession(null);
        setParticipants([]);
        setActiveRuns([]);
        setSelectedRunId(null);
        showToast('Đã kết thúc tiết học thành công.');
      } catch {
        const msg = err instanceof Error ? err.message : 'Không thể kết thúc tiết học.';
        showToast(msg);
      }
    }
  };

  const handleReleaseParticipant = async (participantId: string) => {
    if (!activeSession) return;
    await api.releaseParticipant(getSessionId(activeSession), participantId);
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    showToast('Đã mời học sinh ra khỏi phòng.');
  };

  const handleGrantReward = async (participantId: string, exp: number, reason: string) => {
    if (!activeSession) return;
    await api.grantReward(getSessionId(activeSession), participantId, exp, reason);
    showToast(`Đã tặng ${exp} EXP cho học sinh!`);
  };

  // Handlers cho Chat & Hỗ trợ học sinh (Task 5.2)
  const handleSendChatMessage = async (payload: { content: string; toParticipantId?: string | null }) => {
    if (!activeSession) return;
    const sessionId = getSessionId(activeSession);
    try {
      const msg = await api.sendChatMessage(sessionId, {
        text: payload.content,
        toParticipantId: payload.toParticipantId ?? null,
        kind: 'text',
      });
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      showToast('Đã gửi tin nhắn đến học sinh.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi tin nhắn';
      showToast(`Lỗi: ${msg}`);
    }
  };

  const handleToggleChatLock = async (locked: boolean) => {
    if (!activeSession) return;
    const sessionId = getSessionId(activeSession);
    try {
      const newLocked = await api.toggleChatLock(sessionId, locked);
      setChatLocked(newLocked);
      showToast(newLocked ? 'Đã khóa trò chuyện của học sinh.' : 'Đã mở khóa trò chuyện.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật';
      showToast(msg);
    }
  };

  const handleResolveHandRaise = async (participantId: string) => {
    if (!activeSession) return;
    const sessionId = getSessionId(activeSession);
    try {
      await api.resolveHandRaise(sessionId, participantId);
      setHandRaises((prev) => prev.filter((h) => h.participantId !== participantId));
    } catch {
      // Bỏ qua lỗi
    }
  };

  // Hàm mở cửa sổ trình chiếu riêng biệt cho hoạt động
  const openActivityWindow = (sessionId: string, runId: string) => {
    const url = `/teacher/?window=activity&sessionId=${encodeURIComponent(sessionId)}&runId=${encodeURIComponent(runId)}`;
    const winName = `EduClass_Activity_${sessionId}`;
    const win = window.open(
      url,
      winName,
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
    if (!win) {
      showToast('⚠️ Cửa sổ mới bị trình duyệt chặn pop-up. Bạn có thể bấm nút "Mở lại cửa sổ trình chiếu" ở bảng điều khiển.');
    } else {
      win.focus();
    }
  };

  // Handlers cho ActivityPanel
  const handleStartActivity = async (activityId: string, config: unknown) => {
    if (!activeSession) {
      showToast('Cần mở phiên học trước khi khởi chạy hoạt động!');
      return;
    }
    const sessionId = getSessionId(activeSession);
    const run = await api.startActivity(sessionId, activityId, config);
    const newRun: ActiveRunData = {
      runId: run.runId,
      activityId: run.activityId,
      state: run.state,
      config,
    };
    setActiveRuns((prev) => [...prev.filter((r) => r.runId !== run.runId), newRun]);
    setSelectedRunId(run.runId);
    showToast('Hoạt động đã bắt đầu! Đang mở cửa sổ trình chiếu...');
    openActivityWindow(sessionId, run.runId);
  };

  const handleSendTeacherIntent = async (intent: unknown) => {
    if (!activeRun || !activeSession) return;
    const sessionId = getSessionId(activeSession);
    try {
      const res = await api.sendTeacherIntent(sessionId, activeRun.runId, intent);
      if (res && res.state) {
        setActiveRuns((prev) =>
          prev.map((r) => (r.runId === activeRun.runId ? { ...r, state: res.state } : r))
        );
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi gửi lệnh điều khiển');
    }
  };

  const handleEndActivity = async (runId: string) => {
    if (!activeSession) return;
    const sessionId = getSessionId(activeSession);
    const endingRun = activeRuns.find((r) => r.runId === runId);
    try {
      await api.endActivity(sessionId, runId);
    } catch {
      // Bỏ qua lỗi nếu phiên/lượt chạy đã kết thúc từ trước
    }
    setActiveRuns((prev) => prev.filter((r) => r.runId !== runId));
    if (selectedRunId === runId) {
      setSelectedRunId(null);
    }
    if (endingRun?.activityId === 'quiz-live') {
      showToast('Đã kết thúc bài Quizizz và lưu bảng điểm vào tab Báo cáo & Tổng kết.');
    } else {
      showToast('Đã kết thúc hoạt động và trở về Bàn làm việc.');
    }
  };

  // Handlers cho ExpSettingsTab
  const handleSaveRewardRules = async (rules: RewardRuleItemInput[]) => {
    await api.saveRewardRules(rules);
    await loadRewardRules();
    showToast('Đã lưu cấu hình điểm EXP thành công!');
  };

  const handleResetRewardRules = async () => {
    await api.resetRewardRules();
    await loadRewardRules();
    showToast('Đã khôi phục quy tắc EXP mặc định.');
  };

  // Handlers cho Đăng xuất & Đổi giáo viên
  const handlePerformLogout = useCallback(async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveSession(null);
    setParticipants([]);
    setActiveRuns([]);
    setSelectedRunId(null);
    setClasses([]);
    setSelectedClassId(undefined);
    setStudents([]);
    setQuestionSets([]);
    showToast('Đã đăng xuất. Vui lòng chọn giáo viên cho tiết tiếp theo.');
  }, [showToast]);

  const handleRequestLogout = useCallback(() => {
    if (activeSession && activeSession.session?.status === 'open') {
      setIsLogoutWarningOpen(true);
    } else {
      void handlePerformLogout();
    }
  }, [activeSession, handlePerformLogout]);

  const handleCloseSessionAndLogout = useCallback(async () => {
    if (activeSession) {
      try {
        await api.closeSession(getSessionId(activeSession));
      } catch {
        try {
          await api.closeActiveSession();
        } catch {
          // Bỏ qua nếu phiên đã đóng
        }
      }
    }
    setIsLogoutWarningOpen(false);
    await handlePerformLogout();
  }, [activeSession, handlePerformLogout]);

  const handleKeepSessionAndLogout = useCallback(async () => {
    setIsLogoutWarningOpen(false);
    await handlePerformLogout();
  }, [handlePerformLogout]);

  if (!currentUser) {
    return (
      <TeacherLoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="teacher-app" style={{ minHeight: '100vh', backgroundColor: '#FFF9F0' }}>
      {/* 1. Header & Navbar */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: UI_COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✨</span> EduClass v2
          </div>
          <span
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              backgroundColor: '#EEF4FF',
              color: UI_COLORS.primary,
              borderRadius: '9999px',
              fontWeight: 600,
            }}
          >
            Giáo viên
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              borderRadius: '6px',
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              letterSpacing: '0.3px',
              cursor: 'pointer',
            }}
            onClick={() => setIsUpdateModalOpen(true)}
            title={`EduClass v${APP_VERSION} — Bấm để kiểm tra cập nhật`}
            data-testid="teacher-app-version-badge"
          >
            v{APP_VERSION}
          </span>
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              backgroundColor: '#F8FAFC',
              color: '#3B82F6',
              borderRadius: '6px',
              fontWeight: 700,
              border: '1px solid #BFDBFE',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Kiểm tra bản cập nhật mới từ GitHub"
          >
            <span>🔄</span> Cập nhật
          </button>
        </div>

        {/* Trạng thái phiên học hiện tại */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#E8FBF2',
                  border: '1px solid #2ECC8F',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#2ECC8F',
                  }}
                />
                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '15px' }}>
                  Phòng: <span style={{ color: UI_COLORS.primary }}>{getSessionJoinCode(activeSession)}</span>
                </span>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  ({participants.length} HS)
                </span>
              </div>

              <Button
                variant="secondary"
                style={{ padding: '8px 16px', fontSize: '14px', minHeight: '36px' }}
                onClick={() => setIsProjectorOpen(true)}
              >
                📽 Chiếu mã vào lớp
              </Button>
            </div>
          ) : (
            <div
              style={{
                fontSize: '13px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>●</span> Chưa mở phiên học
            </div>
          )}

          {/* Thông tin giáo viên & nút Đổi giáo viên / Đăng xuất */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #E2E8F0', paddingLeft: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '9999px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#DBEAFE',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 800,
                }}
              >
                {currentUser?.displayName?.charAt(0).toUpperCase() || 'G'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', lineHeight: '1.2' }}>
                  {currentUser?.displayName || 'Giáo viên'}
                </span>
                {currentUser?.subject && (
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: '1' }}>
                    {currentUser.subject}
                  </span>
                )}
              </div>
            </div>

            {/* Nút Đổi mã PIN */}
            <Button
              variant="ghost"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setIsChangePinOpen(true)}
              title="Đổi mã PIN cá nhân"
            >
              🔑 Đổi PIN
            </Button>

            {/* Nút Đăng xuất / Đổi giáo viên */}
            <Button
              variant="ghost"
              style={{ padding: '6px 12px', fontSize: '12px', color: '#EF4444', borderColor: '#FCA5A5' }}
              onClick={handleRequestLogout}
              title="Đăng xuất để đổi giáo viên khác"
            >
              ⏻ Đổi giáo viên
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Thanh Tabs chuyển hướng */}
      <nav
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('session')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'session' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'session' ? 700 : 500,
            color: activeTab === 'session' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🎮 Phiên học & Hoạt động
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'classes' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'classes' ? 700 : 500,
            color: activeTab === 'classes' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🏫 Lớp học & Học sinh
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'questions' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'questions' ? 700 : 500,
            color: activeTab === 'questions' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📚 Kho đề thi & Câu hỏi
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'videos' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'videos' ? 700 : 500,
            color: activeTab === 'videos' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🎬 Kho Video
        </button>

        <button
          onClick={() => setActiveTab('random-picker')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'random-picker' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'random-picker' ? 700 : 500,
            color: activeTab === 'random-picker' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🎲 Quay ngẫu nhiên
        </button>

        <button
          onClick={() => setActiveTab('exp')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'exp' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'exp' ? 700 : 500,
            color: activeTab === 'exp' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ⚡ Cài đặt Thưởng EXP
        </button>

        <button
          onClick={() => setActiveTab('exam-reports')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'exam-reports' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'exam-reports' ? 700 : 500,
            color: activeTab === 'exam-reports' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📝 Kỳ thi
        </button>

        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: activeTab === 'report' ? `3px solid ${UI_COLORS.primary}` : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'report' ? 700 : 500,
            color: activeTab === 'report' ? UI_COLORS.primary : '#64748B',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📊 Báo cáo & Tổng kết
        </button>
      </nav>

      {/* 3. Nội dung Tab */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        {activeTab === 'session' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SessionControl
              classes={classes}
              activeSession={activeSession}
              participants={participants}
              sessionReport={sessionReport}
              chatMessages={chatMessages}
              handRaises={handRaises}
              chatLocked={chatLocked}
              onSendChatMessage={handleSendChatMessage}
              onToggleChatLock={handleToggleChatLock}
              onResolveHandRaise={handleResolveHandRaise}
              onOpenSession={handleOpenSession}
              onCloseSession={handleCloseSession}
              onReleaseParticipant={handleReleaseParticipant}
              onGrantReward={handleGrantReward}
              onResetReport={() => setSessionReport(null)}
              hasActiveExam={hasActiveExam}
              activeExamTitle={activeExamTitle}
              activeExamBatch={activeExamBatch}
              onExportExcel={(sid) => {
                window.open(`/api/sessions/${sid}/export-excel`, '_blank');
              }}
            />

            {activeSession && (
              <ActivityPanel
                activities={activities}
                activeRun={activeRun}
                activeRuns={activeRuns}
                onSelectActiveRun={(runId) => setSelectedRunId(runId)}
                questionSets={questionSets}
                onLoadQuestionSet={(id) => api.getQuestionSet(id)}
                onOpenActivityWindow={() => {
                  if (activeRun) {
                    openActivityWindow(getSessionId(activeSession), activeRun.runId);
                  }
                }}
                onStartActivity={handleStartActivity}
                onSendTeacherIntent={handleSendTeacherIntent}
                onEndActivity={handleEndActivity}
                participants={participants}
                classes={classes}
                activeSession={activeSession}
              />
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <ClassTab
            classes={classes}
            selectedClassId={selectedClassId}
            students={students}
            onSelectClass={(id) => setSelectedClassId(id)}
            onCreateClass={handleCreateClass}
            onDeleteClass={handleDeleteClass}
            onCreateStudent={handleCreateStudent}
            onUpdateStudent={handleUpdateStudent}
            onSetStudentPin={handleSetStudentPin}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
          />
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            {/* Bộ chuyển đổi giữa Ngân hàng câu hỏi & Kho bộ đề thi */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuestionsSubTab('bank')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] cursor-pointer ${
                    questionsSubTab === 'bank'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  📖 Ngân hàng câu hỏi (Ma trận)
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionsSubTab('sets')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] cursor-pointer ${
                    questionsSubTab === 'sets'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  📚 Kho bộ đề thi ({questionSets.length})
                </button>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 pr-2 hidden md:block">
                {questionsSubTab === 'bank'
                  ? 'Kho câu hỏi phân cấp Khối - Môn - Chương - Bài & 4 mức độ nhận thức'
                  : 'Danh sách các bộ đề thi hoàn chỉnh dùng cho Quiz Live & Kỳ thi'}
              </div>
            </div>

            {questionsSubTab === 'bank' ? (
              <BankQuestionTab onShowToast={showToast} />
            ) : (
              <QuestionBankTab
                questionSets={questionSets}
                isLoading={isQuestionBankLoading}
                onRefresh={loadQuestionSets}
                onCreateQuestionSet={handleCreateQuestionSet}
                onDeleteQuestionSet={handleDeleteQuestionSet}
                onCloneQuestionSet={handleCloneQuestionSet}
                onExportQuestionSet={handleExportQuestionSet}
                onImportQuestionSet={handleImportQuestionSet}
                onOpenQuestionEditor={handleOpenQuestionEditor}
                onImportWordQuestions={handleImportWordQuestions}
              />
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <VideoLibraryTab onShowToast={showToast} />
        )}

        {activeTab === 'random-picker' && (
          <RandomPickerTab
            classes={classes}
            selectedClassId={selectedClassId}
            students={students}
            activeSessionId={activeSession ? getSessionId(activeSession) : null}
            participants={participants}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'exp' && (
          <ExpSettingsTab
            globalRules={globalRules}
            teacherRules={teacherRules}
            sessionCap={sessionCap}
            activityCaps={activityCaps}
            onSaveRules={handleSaveRewardRules}
            onResetRules={handleResetRewardRules}
          />
        )}

        {activeTab === 'exam-reports' && (
          <ExamReportsTab
            classes={classes}
            activeSession={activeSession}
            onShowToast={showToast}
            onViewDetails={(examId) => {
              showToast(`Xem chi tiết báo cáo kỳ thi: ${examId}`);
            }}
            onCreateExam={() => {
              showToast('Tính năng tạo kỳ thi mới sẽ xuất hiện ở modal tiếp theo.');
            }}
            onSessionCreatedAndStartExam={async (session) => {
              setActiveSession(session);
              setActiveTab('session');
              const sId = getSessionId(session);
              const acts = await api.getActiveActivities(sId);
              if (Array.isArray(acts) && acts.length > 0 && acts[0]) {
                setActiveRuns(acts);
                setSelectedRunId(acts[0].runId);
              }
            }}
            onSwitchToSessionTab={() => setActiveTab('session')}
          />
        )}

        {activeTab === 'report' && (
          <SessionReportsTab
            activeSession={activeSession}
            currentSessionReport={sessionReport}
            onNewSession={() => setActiveTab('session')}
            onExportExcel={(sid) => {
              window.open(`/api/sessions/${sid}/export-excel`, '_blank');
            }}
          />
        )}
      </main>

      {/* 4. Modal Trình chiếu Projector Mode */}
      {isProjectorOpen && activeSession && (
        <Modal
          isOpen={isProjectorOpen}
          title={`Phòng học: ${getSessionJoinCode(activeSession)}`}
          onClose={() => setIsProjectorOpen(false)}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ fontSize: '18px', color: '#475569', marginBottom: '16px' }}>
              Học sinh dùng điện thoại hoặc máy tính truy cập địa chỉ bên dưới:
            </p>
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                letterSpacing: '8px',
                color: UI_COLORS.primary,
                backgroundColor: '#EEF4FF',
                padding: '16px 24px',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '20px',
              }}
            >
              {getSessionJoinCode(activeSession)}
            </div>

            {activeSession.qrDataUrl && (
              <div style={{ marginBottom: '20px' }}>
                <img
                  src={activeSession.qrDataUrl}
                  alt="Mã QR vào lớp"
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '16px',
                    border: '2px solid #E2E8F0',
                  }}
                />
              </div>
            )}

            <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
              Hiện có <span style={{ color: UI_COLORS.primary }}>{participants.length}</span> học sinh đã vào phòng
            </p>

            <div style={{ marginTop: '24px' }}>
              <Button variant="primary" onClick={() => setIsProjectorOpen(false)}>
                Đóng màn hình chiếu
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Modal Soạn / Chỉnh sửa câu hỏi cho Bộ đề */}
      {isEditorModalOpen && editingQuestionSet && (
        <Modal
          isOpen={isEditorModalOpen}
          maxWidth="880px"
          title={`Chỉnh sửa bộ đề & câu hỏi — ${editingQuestionSet.title}`}
          onClose={() => {
            setIsEditorModalOpen(false);
            setCurrentEditingQuestion(null);
          }}
        >
          <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '4px' }}>
            {currentEditingQuestion ? (
              <div>
                <QuestionEditor
                  initialQuestion={currentEditingQuestion}
                  onSave={async (savedQ) => {
                    const idx = editingQuestionsList.findIndex((q) => q.id === savedQ.id);
                    let nextQuestions: Question[];
                    if (idx >= 0) {
                      nextQuestions = [...editingQuestionsList];
                      nextQuestions[idx] = savedQ;
                    } else {
                      nextQuestions = [...editingQuestionsList, savedQ];
                    }
                    setEditingQuestionsList(nextQuestions);
                    await api.updateQuestionSet(editingQuestionSet.id, {
                      questions: nextQuestions,
                    });
                    setCurrentEditingQuestion(null);
                    await loadQuestionSets();
                    showToast('Đã lưu câu hỏi!');
                  }}
                  onCancel={() => setCurrentEditingQuestion(null)}
                />
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '10px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                      Danh sách câu hỏi ({editingQuestionsList.length} câu)
                    </span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Hiển thị trực quan cả đề bài và đáp án đúng. Bấm &quot;Sửa câu&quot; để biên tập chi tiết.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      style={{ padding: '6px 12px', fontSize: '12.5px', minHeight: '36px' }}
                      onClick={() => setShowAllEditorAnswers((prev) => !prev)}
                      title={showAllEditorAnswers ? 'Thu gọn hiển thị đáp án' : 'Mở rộng hiển thị đầy đủ đáp án'}
                    >
                      {showAllEditorAnswers ? '👁️ Đang hiện đáp án' : '🙈 Đang ẩn đáp án'}
                    </Button>
                    <Button
                      variant="primary"
                      style={{ padding: '6px 14px', fontSize: '13px', minHeight: '36px' }}
                      onClick={() => {
                        const newQ: Mcq4Question = {
                          id: `q_${Date.now()}`,
                          type: 'mcq4',
                          stem: { text: '', images: [] },
                          options: [
                            { text: '', images: [] },
                            { text: '', images: [] },
                            { text: '', images: [] },
                            { text: '', images: [] },
                          ],
                          correct: 0,
                          points: 10,
                        };
                        setCurrentEditingQuestion(newQ);
                      }}
                    >
                      + Thêm câu hỏi mới
                    </Button>
                  </div>
                </div>

                {editingQuestionsList.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      color: '#64748B',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px dashed #CBD5E1',
                    }}
                  >
                    Bộ đề chưa có câu hỏi nào. Nhấn &quot;+ Thêm câu hỏi mới&quot; ở trên để bắt đầu soạn!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {editingQuestionsList.map((q, idx) => (
                      <QuestionCardPreview
                        key={q.id || idx}
                        question={q}
                        index={idx}
                        showAnswers={showAllEditorAnswers}
                        onEdit={() => setCurrentEditingQuestion(q)}
                        onDelete={async () => {
                          const nextQ = editingQuestionsList.filter((_, i) => i !== idx);
                          setEditingQuestionsList(nextQ);
                          await api.updateQuestionSet(editingQuestionSet.id, {
                            questions: nextQ,
                          });
                          await loadQuestionSets();
                          showToast('Đã xóa câu hỏi khỏi bộ đề.');
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Footer thông tin phiên bản */}
      <footer
        style={{
          textAlign: 'center',
          padding: '28px 16px',
          color: '#94A3B8',
          fontSize: '13px',
          borderTop: '1px solid #E2E8F0',
          marginTop: '48px',
        }}
      >
        <span>EduClass v2</span> • <span style={{ fontWeight: 600 }}>Phiên bản v{APP_VERSION}</span>
      </footer>

      {/* 5.5 Modals đổi PIN & Cảnh báo phiên khi đăng xuất */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        onSuccess={() => {
          setIsChangePinOpen(false);
          showToast('Đã đổi mã PIN cá nhân thành công!');
        }}
      />

      <LogoutWarningModal
        isOpen={isLogoutWarningOpen}
        classNameTitle={classes.find((c) => c.id === selectedClassId)?.name}
        joinCode={getSessionJoinCode(activeSession)}
        onClose={() => setIsLogoutWarningOpen(false)}
        onCloseSessionAndLogout={handleCloseSessionAndLogout}
        onKeepSessionAndLogout={handleKeepSessionAndLogout}
      />

      {/* 5.6 Modal cập nhật phần mềm (Auto-Update on-demand) */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        currentVersion={APP_VERSION}
      />

      {/* 6. Toast thông báo */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default App;
