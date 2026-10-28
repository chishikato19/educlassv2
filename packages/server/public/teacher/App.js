import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION } from '@educlass/protocol';
import { Button, Modal, Toast, UI_COLORS } from '@educlass/ui-kit';
import { api } from './api/client.js';
import { ActivityPanel } from './components/ActivityPanel.js';
import { ClassTab } from './components/ClassTab.js';
import { ExpSettingsTab } from './components/ExpSettingsTab.js';
import { QuestionBankTab } from './components/QuestionBankTab.js';
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
function getSessionJoinCode(sessionData) {
    if (!sessionData)
        return '';
    if (sessionData.session?.joinCode)
        return sessionData.session.joinCode;
    const raw = sessionData;
    return raw.joinCode ?? '';
}
function getSessionId(sessionData) {
    if (!sessionData)
        return '';
    if (sessionData.session?.id)
        return sessionData.session.id;
    const raw = sessionData;
    return raw.id ?? '';
}
export const App = () => {
    // Tabs
    const [activeTab, setActiveTab] = useState('session');
    const [questionsSubTab, setQuestionsSubTab] = useState('bank');
    // Classes & Students
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(undefined);
    const [students, setStudents] = useState([]);
    // Question sets
    const [questionSets, setQuestionSets] = useState([]);
    const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(false);
    const [editingQuestionSet, setEditingQuestionSet] = useState(null);
    const [editingQuestionsList, setEditingQuestionsList] = useState([]);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [currentEditingQuestion, setCurrentEditingQuestion] = useState(null);
    const [showAllEditorAnswers, setShowAllEditorAnswers] = useState(true);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    // Sessions & Realtime
    const [activeSession, setActiveSession] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [handRaises, setHandRaises] = useState([]);
    const [chatLocked, setChatLocked] = useState(false);
    const [sessionReport, setSessionReport] = useState(null);
    // Activities
    const [activities, setActivities] = useState([]);
    const [activeRuns, setActiveRuns] = useState([]);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const activeRun = useMemo(() => {
        if (activeRuns.length === 0)
            return null;
        return activeRuns.find(r => r.runId === selectedRunId) || activeRuns[0] || null;
    }, [activeRuns, selectedRunId]);
    const activeExamRun = useMemo(() => {
        return activeRuns.find(r => r.activityId === 'exam') || null;
    }, [activeRuns]);
    const hasActiveExam = Boolean(activeExamRun && activeExamRun.state?.status === 'in_progress');
    const activeExamTitle = activeExamRun?.state?.title || 'Kỳ thi';
    const activeExamBatch = activeExamRun?.state?.batchIndex || 1;
    // EXP Rules
    const [globalRules, setGlobalRules] = useState([]);
    const [teacherRules, setTeacherRules] = useState([]);
    const [sessionCap, setSessionCap] = useState(null);
    const [activityCaps, setActivityCaps] = useState({});
    // UI state
    const [toastMessage, setToastMessage] = useState(null);
    const [isProjectorOpen, setIsProjectorOpen] = useState(false);
    const wsRef = useRef(null);
    // Auth & Profile state
    const [currentUser, setCurrentUser] = useState(null);
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [isLogoutWarningOpen, setIsLogoutWarningOpen] = useState(false);
    const showToast = useCallback((msg) => {
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
        }
        catch {
            // Bỏ qua lỗi ban đầu nếu chưa có lớp
        }
    }, [selectedClassId]);
    // 2. Tải danh sách học sinh theo lớp
    const loadStudents = useCallback(async (classId) => {
        try {
            const stds = await api.getStudents(classId);
            setStudents(stds);
        }
        catch {
            setStudents([]);
        }
    }, []);
    // 3. Tải danh sách bộ đề
    const loadQuestionSets = useCallback(async () => {
        setIsQuestionBankLoading(true);
        try {
            const sets = await api.getQuestionSets();
            setQuestionSets(sets);
        }
        catch {
            setQuestionSets([]);
        }
        finally {
            setIsQuestionBankLoading(false);
        }
    }, []);
    // 4. Tải các plugin hoạt động
    const loadActivities = useCallback(async () => {
        try {
            const acts = await api.getActivities();
            setActivities(acts);
        }
        catch {
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
        }
        catch {
            // Bỏ qua
        }
    }, []);
    // Tải danh sách học sinh tham gia phiên học
    const loadParticipants = useCallback(async (sessionId) => {
        try {
            const list = await api.getParticipants(sessionId);
            if (Array.isArray(list)) {
                setParticipants(list);
            }
        }
        catch {
            // Bỏ qua lỗi
        }
    }, []);
    // Tải dữ liệu trò chuyện & trạng thái giơ tay
    const loadChatData = useCallback(async (sessionId) => {
        try {
            const [msgs, status] = await Promise.all([
                api.getChatMessages(sessionId),
                api.getChatStatus(sessionId),
            ]);
            setChatMessages(msgs);
            setChatLocked(status.chatLocked);
            setHandRaises(status.activeHandRaises || []);
        }
        catch {
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
            }
            else {
                setActiveSession(null);
                setParticipants([]);
            }
        }
        catch {
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
        if (!activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        void loadParticipants(sessionId);
        void loadChatData(sessionId);
        void api.getActiveActivities(sessionId).then(acts => {
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
        if (!currentUser)
            return;
        void loadClasses();
        void loadQuestionSets();
        void loadActivities();
        void loadRewardRules();
        void checkActiveSession();
    }, [
        currentUser,
        loadClasses,
        loadQuestionSets,
        loadActivities,
        loadRewardRules,
        checkActiveSession,
    ]);
    // Kết nối WebSocket khi có phiên học hoạt động
    useEffect(() => {
        if (!activeSession) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return () => { };
        }
        const host = window.location.host || 'localhost:3000';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const sId = getSessionId(activeSession);
        const wsUrl = `${protocol}//${host}/ws?sessionId=${sId}&role=teacher`;
        try {
            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    v: 1,
                    id: 'teacher_init_' + Date.now(),
                    type: 'ping',
                    sessionId: sId,
                    ts: Date.now(),
                    payload: { role: 'teacher' },
                }));
            };
            socket.onmessage = event => {
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
                        setParticipants(prev => {
                            const exists = prev.some(item => item.id === p.id || (p.displayName && item.displayName === p.displayName));
                            if (exists)
                                return prev;
                            return [...prev, p];
                        });
                        showToast(`Học sinh "${p.displayName}" vừa vào phòng!`);
                        void loadParticipants(sId);
                    }
                    else if (type === 'participant_left') {
                        setParticipants(prev => prev.filter(p => p.id !== payload.participantId));
                        void loadParticipants(sId);
                    }
                    else if (type === 'chat:new_message' || type === 'chat_message') {
                        setChatMessages(prev => {
                            if (prev.some(m => m.id === payload.id))
                                return prev;
                            return [...prev, payload];
                        });
                    }
                    else if (type === 'chat:lock_state' || type === 'chat_locked') {
                        setChatLocked(Boolean(payload.locked));
                    }
                    else if (type === 'chat:hand_raise' || type === 'hand_raised') {
                        setHandRaises(prev => {
                            if (prev.some(h => h.participantId === payload.participantId))
                                return prev;
                            return [...prev, payload];
                        });
                        showToast(`✋ Học sinh "${payload.participantName || 'Học sinh'}" vừa gửi yêu cầu trợ giúp!`);
                    }
                    else if (type === 'chat:hand_raise_resolved' || type === 'hand_raise_resolved') {
                        setHandRaises(prev => prev.filter(h => h.participantId !== payload.participantId));
                    }
                    else if (type === 'activity_state_patch' ||
                        type === 'activity_snapshot' ||
                        type === 'activity_state') {
                        const nextState = payload.state ?? payload;
                        const targetRunId = payload.runId;
                        const targetActivityId = payload.activityId;
                        setActiveRuns(prev => {
                            const idx = prev.findIndex(r => (targetRunId && r.runId === targetRunId) ||
                                (targetActivityId && r.activityId === targetActivityId));
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
                    }
                    else if (type === 'activity_ended' || type === 'activity_end') {
                        const endedRunId = payload?.runId;
                        const endedActivityId = payload?.activityId;
                        setActiveRuns(prev => {
                            if (endedRunId) {
                                return prev.filter(r => r.runId !== endedRunId);
                            }
                            if (endedActivityId) {
                                return prev.filter(r => r.activityId !== endedActivityId);
                            }
                            return [];
                        });
                        showToast('Hoạt động đã kết thúc.');
                    }
                }
                catch {
                    // Bỏ qua lỗi phân tích envelope
                }
            };
            return () => {
                socket.close();
            };
        }
        catch {
            // Bỏ qua lỗi kết nối socket
            return () => { };
        }
    }, [activeSession, loadParticipants]);
    // Handlers cho ClassTab
    const handleCreateClass = async (data) => {
        const created = await api.createClass(data);
        await loadClasses();
        setSelectedClassId(created.id);
        showToast('Tạo lớp học thành công!');
    };
    const handleDeleteClass = async (classId) => {
        await api.deleteClass(classId);
        await loadClasses();
        showToast('Đã xóa lớp học.');
    };
    const handleCreateStudent = async (classId, data) => {
        try {
            await api.createStudent(classId, data);
            await loadStudents(classId);
            showToast('Thêm học sinh thành công!');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi thêm học sinh';
            showToast(msg);
            throw err;
        }
    };
    const handleSetStudentPin = async (studentId, pin) => {
        try {
            await api.setStudentPin(studentId, pin);
            if (selectedClassId) {
                await loadStudents(selectedClassId);
            }
            showToast(pin ? 'Đã cài đặt mã PIN cho học sinh.' : 'Đã xóa mã PIN.');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi đặt mã PIN';
            showToast(msg);
            throw err;
        }
    };
    const handleDeleteStudent = async (studentId) => {
        try {
            await api.deleteStudent(studentId);
            if (selectedClassId) {
                await loadStudents(selectedClassId);
            }
            showToast('Đã xóa học sinh.');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi xóa học sinh';
            showToast(msg);
            throw err;
        }
    };
    const handleUpdateStudent = async (studentId, fullName, code, academicPerformance) => {
        if (!selectedClassId)
            return;
        try {
            await api.updateStudent(selectedClassId, studentId, {
                fullName,
                code,
                academicPerformance,
            });
            await loadStudents(selectedClassId);
            showToast('Cập nhật thông tin học sinh thành công!');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật học sinh';
            showToast(msg);
            throw err;
        }
    };
    const handleImportStudents = async (classId, importedList, skipDuplicates) => {
        try {
            const res = await api.importStudents(classId, importedList, skipDuplicates);
            await loadStudents(classId);
            const count = res.added ?? res.insertedCount ?? importedList.length;
            showToast(`Đã thêm thành công ${count} học sinh vào lớp!`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi nhập học sinh';
            showToast(msg);
            throw err;
        }
    };
    // Handlers cho QuestionBankTab
    const handleCreateQuestionSet = async (data) => {
        await api.createQuestionSet(data);
        await loadQuestionSets();
        showToast('Tạo bộ câu hỏi thành công!');
    };
    const handleDeleteQuestionSet = async (id) => {
        await api.deleteQuestionSet(id);
        await loadQuestionSets();
        showToast('Đã xóa bộ câu hỏi và các hình ảnh liên quan.');
    };
    const handleCloneQuestionSet = async (id, newTitle) => {
        await api.cloneQuestionSet(id, newTitle);
        await loadQuestionSets();
        showToast('Nhân bản bộ câu hỏi thành công!');
    };
    const handleExportQuestionSet = async (id) => {
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
    const handleImportQuestionSet = async (pkg) => {
        await api.importQuestionSet(pkg);
        await loadQuestionSets();
        showToast('Nhập bộ câu hỏi thành công!');
    };
    const handleImportWordQuestions = async (data) => {
        await api.createQuestionSet({
            ...data.setInfo,
            questions: data.questions,
        });
        await loadQuestionSets();
        showToast(`Đã nhập thành công ${data.questions.length} câu hỏi từ file Word!`);
    };
    // Mở trình soạn thảo câu hỏi
    const handleOpenQuestionEditor = async (item) => {
        setEditingQuestionSet(item);
        try {
            const data = await api.getQuestionSet(item.id);
            setEditingQuestionsList(data.questions || []);
            setIsEditorModalOpen(true);
        }
        catch {
            setEditingQuestionsList([]);
            setIsEditorModalOpen(true);
        }
    };
    // Handlers cho SessionControl
    const handleOpenSession = async (req) => {
        try {
            const s = await api.createSession(req);
            setActiveSession(s);
            setParticipants([]);
            showToast(`Mở phiên học thành công! Mã phòng: ${getSessionJoinCode(s)}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi mở phiên học';
            // Nếu có phiên cũ chưa đóng, thử giải phóng
            if (msg.includes('đang có một phiên học khác')) {
                await api.closeActiveSession();
                const s = await api.createSession(req);
                setActiveSession(s);
                setParticipants([]);
                showToast(`Đã đóng phiên cũ và mở phiên mới: ${getSessionJoinCode(s)}`);
            }
            else {
                showToast(msg);
            }
        }
    };
    const handleCloseSession = async (sessionId) => {
        try {
            const report = await api.closeSession(sessionId);
            setActiveSession(null);
            setParticipants([]);
            setActiveRuns([]);
            setSelectedRunId(null);
            setSessionReport(report);
            setActiveTab('report');
            showToast('Đã đóng phiên học và tạo báo cáo tổng kết.');
        }
        catch (err) {
            // Fallback đóng phiên đang mở nếu endpoint chính gặp sự cố
            try {
                await api.closeActiveSession();
                setActiveSession(null);
                setParticipants([]);
                setActiveRuns([]);
                setSelectedRunId(null);
                showToast('Đã kết thúc tiết học thành công.');
            }
            catch {
                const msg = err instanceof Error ? err.message : 'Không thể kết thúc tiết học.';
                showToast(msg);
            }
        }
    };
    const handleReleaseParticipant = async (participantId) => {
        if (!activeSession)
            return;
        await api.releaseParticipant(getSessionId(activeSession), participantId);
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        showToast('Đã mời học sinh ra khỏi phòng.');
    };
    const handleGrantReward = async (participantId, exp, reason) => {
        if (!activeSession)
            return;
        await api.grantReward(getSessionId(activeSession), participantId, exp, reason);
        showToast(`Đã tặng ${exp} EXP cho học sinh!`);
    };
    // Handlers cho Chat & Hỗ trợ học sinh (Task 5.2)
    const handleSendChatMessage = async (payload) => {
        if (!activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        try {
            const msg = await api.sendChatMessage(sessionId, {
                text: payload.content,
                toParticipantId: payload.toParticipantId ?? null,
                kind: 'text',
            });
            setChatMessages(prev => {
                if (prev.some(m => m.id === msg.id))
                    return prev;
                return [...prev, msg];
            });
            showToast('Đã gửi tin nhắn đến học sinh.');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể gửi tin nhắn';
            showToast(`Lỗi: ${msg}`);
        }
    };
    const handleToggleChatLock = async (locked) => {
        if (!activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        try {
            const newLocked = await api.toggleChatLock(sessionId, locked);
            setChatLocked(newLocked);
            showToast(newLocked ? 'Đã khóa trò chuyện của học sinh.' : 'Đã mở khóa trò chuyện.');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi cập nhật';
            showToast(msg);
        }
    };
    const handleResolveHandRaise = async (participantId) => {
        if (!activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        try {
            await api.resolveHandRaise(sessionId, participantId);
            setHandRaises(prev => prev.filter(h => h.participantId !== participantId));
        }
        catch {
            // Bỏ qua lỗi
        }
    };
    // Hàm mở cửa sổ trình chiếu riêng biệt cho hoạt động
    const openActivityWindow = (sessionId, runId) => {
        const url = `/teacher/?window=activity&sessionId=${encodeURIComponent(sessionId)}&runId=${encodeURIComponent(runId)}`;
        const winName = `EduClass_Activity_${sessionId}`;
        const win = window.open(url, winName, 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
        if (!win) {
            showToast('⚠️ Cửa sổ mới bị trình duyệt chặn pop-up. Bạn có thể bấm nút "Mở lại cửa sổ trình chiếu" ở bảng điều khiển.');
        }
        else {
            win.focus();
        }
    };
    // Handlers cho ActivityPanel
    const handleStartActivity = async (activityId, config) => {
        if (!activeSession) {
            showToast('Cần mở phiên học trước khi khởi chạy hoạt động!');
            return;
        }
        const sessionId = getSessionId(activeSession);
        const run = await api.startActivity(sessionId, activityId, config);
        const newRun = {
            runId: run.runId,
            activityId: run.activityId,
            state: run.state,
            config,
        };
        setActiveRuns(prev => [...prev.filter(r => r.runId !== run.runId), newRun]);
        setSelectedRunId(run.runId);
        showToast('Hoạt động đã bắt đầu! Đang mở cửa sổ trình chiếu...');
        openActivityWindow(sessionId, run.runId);
    };
    const handleSendTeacherIntent = async (intent) => {
        if (!activeRun || !activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        try {
            const res = await api.sendTeacherIntent(sessionId, activeRun.runId, intent);
            if (res && res.state) {
                setActiveRuns(prev => prev.map(r => (r.runId === activeRun.runId ? { ...r, state: res.state } : r)));
            }
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : 'Lỗi gửi lệnh điều khiển');
        }
    };
    const handleEndActivity = async (runId) => {
        if (!activeSession)
            return;
        const sessionId = getSessionId(activeSession);
        const endingRun = activeRuns.find(r => r.runId === runId);
        try {
            await api.endActivity(sessionId, runId);
        }
        catch {
            // Bỏ qua lỗi nếu phiên/lượt chạy đã kết thúc từ trước
        }
        setActiveRuns(prev => prev.filter(r => r.runId !== runId));
        if (selectedRunId === runId) {
            setSelectedRunId(null);
        }
        if (endingRun?.activityId === 'quiz-live') {
            showToast('Đã kết thúc bài Quizizz và lưu bảng điểm vào tab Báo cáo & Tổng kết.');
        }
        else {
            showToast('Đã kết thúc hoạt động và trở về Bàn làm việc.');
        }
    };
    // Handlers cho ExpSettingsTab
    const handleSaveRewardRules = async (rules) => {
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
        }
        else {
            void handlePerformLogout();
        }
    }, [activeSession, handlePerformLogout]);
    const handleCloseSessionAndLogout = useCallback(async () => {
        if (activeSession) {
            try {
                await api.closeSession(getSessionId(activeSession));
            }
            catch {
                try {
                    await api.closeActiveSession();
                }
                catch {
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
        return (_jsx(TeacherLoginScreen, { onLoginSuccess: user => {
                setCurrentUser(user);
            } }));
    }
    return (_jsxs("div", { className: "teacher-app", style: { minHeight: '100vh', backgroundColor: '#FFF9F0' }, children: [_jsxs("header", { style: {
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '12px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("div", { style: {
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    color: UI_COLORS.primary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }, children: [_jsx("span", { children: "\u2728" }), " EduClass v2"] }), _jsx("span", { style: {
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    backgroundColor: '#EEF4FF',
                                    color: UI_COLORS.primary,
                                    borderRadius: '9999px',
                                    fontWeight: 600,
                                }, children: "Gi\u00E1o vi\u00EAn" }), _jsxs("span", { style: {
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#475569',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    border: '1px solid #CBD5E1',
                                    letterSpacing: '0.3px',
                                    cursor: 'pointer',
                                }, onClick: () => setIsUpdateModalOpen(true), title: `EduClass v${APP_VERSION} — Bấm để kiểm tra cập nhật`, "data-testid": "teacher-app-version-badge", children: ["v", APP_VERSION] }), _jsxs("button", { onClick: () => setIsUpdateModalOpen(true), style: {
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
                                }, title: "Ki\u1EC3m tra b\u1EA3n c\u1EADp nh\u1EADt m\u1EDBi t\u1EEB GitHub", children: [_jsx("span", { children: "\uD83D\uDD04" }), " C\u1EADp nh\u1EADt"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '16px' }, children: [activeSession ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            backgroundColor: '#E8FBF2',
                                            border: '1px solid #2ECC8F',
                                            padding: '6px 14px',
                                            borderRadius: '9999px',
                                        }, children: [_jsx("span", { style: {
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#2ECC8F',
                                                } }), _jsxs("span", { style: { fontWeight: 700, color: '#1E293B', fontSize: '15px' }, children: ["Ph\u00F2ng:", ' ', _jsx("span", { style: { color: UI_COLORS.primary }, children: getSessionJoinCode(activeSession) })] }), _jsxs("span", { style: { color: '#64748B', fontSize: '13px' }, children: ["(", participants.length, " HS)"] })] }), _jsx(Button, { variant: "secondary", style: { padding: '8px 16px', fontSize: '14px', minHeight: '36px' }, onClick: () => setIsProjectorOpen(true), children: "\uD83D\uDCFD Chi\u1EBFu m\u00E3 v\u00E0o l\u1EDBp" })] })) : (_jsxs("div", { style: {
                                    fontSize: '13px',
                                    color: '#64748B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }, children: [_jsx("span", { children: "\u25CF" }), " Ch\u01B0a m\u1EDF phi\u00EAn h\u1ECDc"] })), _jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderLeft: '1px solid #E2E8F0',
                                    paddingLeft: '16px',
                                }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '4px 10px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '9999px',
                                        }, children: [_jsx("div", { style: {
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
                                                }, children: currentUser?.displayName?.charAt(0).toUpperCase() || 'G' }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsx("span", { style: { fontSize: '13px', fontWeight: 700, color: '#1E293B', lineHeight: '1.2' }, children: currentUser?.displayName || 'Giáo viên' }), currentUser?.subject && (_jsx("span", { style: { fontSize: '11px', color: '#64748B', lineHeight: '1' }, children: currentUser.subject }))] })] }), _jsx(Button, { variant: "ghost", style: { padding: '6px 10px', fontSize: '12px' }, onClick: () => setIsChangePinOpen(true), title: "\u0110\u1ED5i m\u00E3 PIN c\u00E1 nh\u00E2n", children: "\uD83D\uDD11 \u0110\u1ED5i PIN" }), _jsx(Button, { variant: "ghost", style: {
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            color: '#EF4444',
                                            borderColor: '#FCA5A5',
                                        }, onClick: handleRequestLogout, title: "\u0110\u0103ng xu\u1EA5t \u0111\u1EC3 \u0111\u1ED5i gi\u00E1o vi\u00EAn kh\u00E1c", children: "\u23FB \u0110\u1ED5i gi\u00E1o vi\u00EAn" })] })] })] }), _jsxs("nav", { style: {
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '0 24px',
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                }, children: [_jsx("button", { onClick: () => setActiveTab('session'), style: {
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
                        }, children: "\uD83C\uDFAE Phi\u00EAn h\u1ECDc & Ho\u1EA1t \u0111\u1ED9ng" }), _jsx("button", { onClick: () => setActiveTab('classes'), style: {
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
                        }, children: "\uD83C\uDFEB L\u1EDBp h\u1ECDc & H\u1ECDc sinh" }), _jsx("button", { onClick: () => setActiveTab('questions'), style: {
                            padding: '14px 18px',
                            border: 'none',
                            borderBottom: activeTab === 'questions'
                                ? `3px solid ${UI_COLORS.primary}`
                                : '3px solid transparent',
                            backgroundColor: 'transparent',
                            fontWeight: activeTab === 'questions' ? 700 : 500,
                            color: activeTab === 'questions' ? UI_COLORS.primary : '#64748B',
                            cursor: 'pointer',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }, children: "\uD83D\uDCDA Kho \u0111\u1EC1 thi & C\u00E2u h\u1ECFi" }), _jsx("button", { onClick: () => setActiveTab('videos'), style: {
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
                        }, children: "\uD83C\uDFAC Kho Video" }), _jsx("button", { onClick: () => setActiveTab('random-picker'), style: {
                            padding: '14px 18px',
                            border: 'none',
                            borderBottom: activeTab === 'random-picker'
                                ? `3px solid ${UI_COLORS.primary}`
                                : '3px solid transparent',
                            backgroundColor: 'transparent',
                            fontWeight: activeTab === 'random-picker' ? 700 : 500,
                            color: activeTab === 'random-picker' ? UI_COLORS.primary : '#64748B',
                            cursor: 'pointer',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }, children: "\uD83C\uDFB2 Quay ng\u1EABu nhi\u00EAn" }), _jsx("button", { onClick: () => setActiveTab('exp'), style: {
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
                        }, children: "\u26A1 C\u00E0i \u0111\u1EB7t Th\u01B0\u1EDFng EXP" }), _jsx("button", { onClick: () => setActiveTab('exam-reports'), style: {
                            padding: '14px 18px',
                            border: 'none',
                            borderBottom: activeTab === 'exam-reports'
                                ? `3px solid ${UI_COLORS.primary}`
                                : '3px solid transparent',
                            backgroundColor: 'transparent',
                            fontWeight: activeTab === 'exam-reports' ? 700 : 500,
                            color: activeTab === 'exam-reports' ? UI_COLORS.primary : '#64748B',
                            cursor: 'pointer',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }, children: "\uD83D\uDCDD K\u1EF3 thi" }), _jsx("button", { onClick: () => setActiveTab('report'), style: {
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
                        }, children: "\uD83D\uDCCA B\u00E1o c\u00E1o & T\u1ED5ng k\u1EBFt" })] }), _jsxs("main", { style: { maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }, children: [activeTab === 'session' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsx(SessionControl, { classes: classes, activeSession: activeSession, participants: participants, sessionReport: sessionReport, chatMessages: chatMessages, handRaises: handRaises, chatLocked: chatLocked, onSendChatMessage: handleSendChatMessage, onToggleChatLock: handleToggleChatLock, onResolveHandRaise: handleResolveHandRaise, onOpenSession: handleOpenSession, onCloseSession: handleCloseSession, onReleaseParticipant: handleReleaseParticipant, onGrantReward: handleGrantReward, onResetReport: () => setSessionReport(null), hasActiveExam: hasActiveExam, activeExamTitle: activeExamTitle, activeExamBatch: activeExamBatch, onExportExcel: sid => {
                                    window.open(`/api/sessions/${sid}/export-excel`, '_blank');
                                } }), activeSession && (_jsx(ActivityPanel, { activities: activities, activeRun: activeRun, activeRuns: activeRuns, onSelectActiveRun: runId => setSelectedRunId(runId), questionSets: questionSets, onLoadQuestionSet: id => api.getQuestionSet(id), onOpenActivityWindow: () => {
                                    if (activeRun) {
                                        openActivityWindow(getSessionId(activeSession), activeRun.runId);
                                    }
                                }, onStartActivity: handleStartActivity, onSendTeacherIntent: handleSendTeacherIntent, onEndActivity: handleEndActivity, participants: participants, students: students, classes: classes, activeSession: activeSession }))] })), activeTab === 'classes' && (_jsx(ClassTab, { classes: classes, selectedClassId: selectedClassId, students: students, onSelectClass: id => setSelectedClassId(id), onCreateClass: handleCreateClass, onDeleteClass: handleDeleteClass, onCreateStudent: handleCreateStudent, onUpdateStudent: handleUpdateStudent, onSetStudentPin: handleSetStudentPin, onDeleteStudent: handleDeleteStudent, onImportStudents: handleImportStudents })), activeTab === 'questions' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs", children: [_jsxs("div", { className: "inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl", children: [_jsx("button", { type: "button", onClick: () => setQuestionsSubTab('bank'), className: `px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] cursor-pointer ${questionsSubTab === 'bank'
                                                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`, children: "\uD83D\uDCD6 Ng\u00E2n h\u00E0ng c\u00E2u h\u1ECFi (Ma tr\u1EADn)" }), _jsxs("button", { type: "button", onClick: () => setQuestionsSubTab('sets'), className: `px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] cursor-pointer ${questionsSubTab === 'sets'
                                                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`, children: ["\uD83D\uDCDA Kho b\u1ED9 \u0111\u1EC1 thi (", questionSets.length, ")"] })] }), _jsx("div", { className: "text-xs text-zinc-500 dark:text-zinc-400 pr-2 hidden md:block", children: questionsSubTab === 'bank'
                                            ? 'Kho câu hỏi phân cấp Khối - Môn - Chương - Bài & 4 mức độ nhận thức'
                                            : 'Danh sách các bộ đề thi hoàn chỉnh dùng cho Quiz Live & Kỳ thi' })] }), questionsSubTab === 'bank' ? (_jsx(BankQuestionTab, { onShowToast: showToast })) : (_jsx(QuestionBankTab, { questionSets: questionSets, isLoading: isQuestionBankLoading, onRefresh: loadQuestionSets, onCreateQuestionSet: handleCreateQuestionSet, onDeleteQuestionSet: handleDeleteQuestionSet, onCloneQuestionSet: handleCloneQuestionSet, onExportQuestionSet: handleExportQuestionSet, onImportQuestionSet: handleImportQuestionSet, onOpenQuestionEditor: handleOpenQuestionEditor, onImportWordQuestions: handleImportWordQuestions }))] })), activeTab === 'videos' && _jsx(VideoLibraryTab, { onShowToast: showToast }), activeTab === 'random-picker' && (_jsx(RandomPickerTab, { classes: classes, selectedClassId: selectedClassId, students: students, activeSessionId: activeSession ? getSessionId(activeSession) : null, participants: participants, onShowToast: showToast })), activeTab === 'exp' && (_jsx(ExpSettingsTab, { globalRules: globalRules, teacherRules: teacherRules, sessionCap: sessionCap, activityCaps: activityCaps, onSaveRules: handleSaveRewardRules, onResetRules: handleResetRewardRules })), activeTab === 'exam-reports' && (_jsx(ExamReportsTab, { classes: classes, activeSession: activeSession, onShowToast: showToast, onViewDetails: examId => {
                            showToast(`Xem chi tiết báo cáo kỳ thi: ${examId}`);
                        }, onCreateExam: () => {
                            showToast('Tính năng tạo kỳ thi mới sẽ xuất hiện ở modal tiếp theo.');
                        }, onSessionCreatedAndStartExam: async (session) => {
                            setActiveSession(session);
                            setActiveTab('session');
                            const sId = getSessionId(session);
                            const acts = await api.getActiveActivities(sId);
                            if (Array.isArray(acts) && acts.length > 0 && acts[0]) {
                                setActiveRuns(acts);
                                setSelectedRunId(acts[0].runId);
                            }
                        }, onSwitchToSessionTab: () => setActiveTab('session') })), activeTab === 'report' && (_jsx(SessionReportsTab, { activeSession: activeSession, currentSessionReport: sessionReport, onNewSession: () => setActiveTab('session'), onExportExcel: sid => {
                            window.open(`/api/sessions/${sid}/export-excel`, '_blank');
                        } }))] }), isProjectorOpen && activeSession && (_jsx(Modal, { isOpen: isProjectorOpen, title: `Phòng học: ${getSessionJoinCode(activeSession)}`, onClose: () => setIsProjectorOpen(false), children: _jsxs("div", { style: { textAlign: 'center', padding: '20px' }, children: [_jsx("p", { style: { fontSize: '18px', color: '#475569', marginBottom: '16px' }, children: "H\u1ECDc sinh d\u00F9ng \u0111i\u1EC7n tho\u1EA1i ho\u1EB7c m\u00E1y t\u00EDnh truy c\u1EADp \u0111\u1ECBa ch\u1EC9 b\u00EAn d\u01B0\u1EDBi:" }), _jsx("div", { style: {
                                fontSize: '64px',
                                fontWeight: 900,
                                letterSpacing: '8px',
                                color: UI_COLORS.primary,
                                backgroundColor: '#EEF4FF',
                                padding: '16px 24px',
                                borderRadius: '16px',
                                display: 'inline-block',
                                marginBottom: '20px',
                            }, children: getSessionJoinCode(activeSession) }), activeSession.qrDataUrl && (_jsx("div", { style: { marginBottom: '20px' }, children: _jsx("img", { src: activeSession.qrDataUrl, alt: "M\u00E3 QR v\u00E0o l\u1EDBp", style: {
                                    width: '260px',
                                    height: '260px',
                                    borderRadius: '16px',
                                    border: '2px solid #E2E8F0',
                                } }) })), _jsxs("p", { style: { fontSize: '16px', fontWeight: 600, color: '#1E293B' }, children: ["Hi\u1EC7n c\u00F3 ", _jsx("span", { style: { color: UI_COLORS.primary }, children: participants.length }), " h\u1ECDc sinh \u0111\u00E3 v\u00E0o ph\u00F2ng"] }), _jsx("div", { style: { marginTop: '24px' }, children: _jsx(Button, { variant: "primary", onClick: () => setIsProjectorOpen(false), children: "\u0110\u00F3ng m\u00E0n h\u00ECnh chi\u1EBFu" }) })] }) })), isEditorModalOpen && editingQuestionSet && (_jsx(Modal, { isOpen: isEditorModalOpen, maxWidth: "880px", title: `Chỉnh sửa bộ đề & câu hỏi — ${editingQuestionSet.title}`, onClose: () => {
                    setIsEditorModalOpen(false);
                    setCurrentEditingQuestion(null);
                }, children: _jsx("div", { style: { maxHeight: '78vh', overflowY: 'auto', padding: '4px' }, children: currentEditingQuestion ? (_jsx("div", { children: _jsx(QuestionEditor, { initialQuestion: currentEditingQuestion, onSave: async (savedQ) => {
                                const idx = editingQuestionsList.findIndex(q => q.id === savedQ.id);
                                let nextQuestions;
                                if (idx >= 0) {
                                    nextQuestions = [...editingQuestionsList];
                                    nextQuestions[idx] = savedQ;
                                }
                                else {
                                    nextQuestions = [...editingQuestionsList, savedQ];
                                }
                                setEditingQuestionsList(nextQuestions);
                                await api.updateQuestionSet(editingQuestionSet.id, {
                                    questions: nextQuestions,
                                });
                                setCurrentEditingQuestion(null);
                                await loadQuestionSets();
                                showToast('Đã lưu câu hỏi!');
                            }, onCancel: () => setCurrentEditingQuestion(null) }) })) : (_jsxs("div", { children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                    flexWrap: 'wrap',
                                    gap: '10px',
                                    paddingBottom: '12px',
                                    borderBottom: '1px solid #E2E8F0',
                                }, children: [_jsxs("div", { children: [_jsxs("span", { style: { fontWeight: 700, fontSize: '15px', color: '#1E293B' }, children: ["Danh s\u00E1ch c\u00E2u h\u1ECFi (", editingQuestionsList.length, " c\u00E2u)"] }), _jsx("p", { style: { margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }, children: "Hi\u1EC3n th\u1ECB tr\u1EF1c quan c\u1EA3 \u0111\u1EC1 b\u00E0i v\u00E0 \u0111\u00E1p \u00E1n \u0111\u00FAng. B\u1EA5m \"S\u1EEDa c\u00E2u\" \u0111\u1EC3 bi\u00EAn t\u1EADp chi ti\u1EBFt." })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Button, { variant: "secondary", style: { padding: '6px 12px', fontSize: '12.5px', minHeight: '36px' }, onClick: () => setShowAllEditorAnswers(prev => !prev), title: showAllEditorAnswers
                                                    ? 'Thu gọn hiển thị đáp án'
                                                    : 'Mở rộng hiển thị đầy đủ đáp án', children: showAllEditorAnswers ? '👁️ Đang hiện đáp án' : '🙈 Đang ẩn đáp án' }), _jsx(Button, { variant: "primary", style: { padding: '6px 14px', fontSize: '13px', minHeight: '36px' }, onClick: () => {
                                                    const newQ = {
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
                                                }, children: "+ Th\u00EAm c\u00E2u h\u1ECFi m\u1EDBi" })] })] }), editingQuestionsList.length === 0 ? (_jsx("div", { style: {
                                    textAlign: 'center',
                                    padding: '36px 16px',
                                    color: '#64748B',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '12px',
                                    border: '1px dashed #CBD5E1',
                                }, children: "B\u1ED9 \u0111\u1EC1 ch\u01B0a c\u00F3 c\u00E2u h\u1ECFi n\u00E0o. Nh\u1EA5n \"+ Th\u00EAm c\u00E2u h\u1ECFi m\u1EDBi\" \u1EDF tr\u00EAn \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u so\u1EA1n!" })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: editingQuestionsList.map((q, idx) => (_jsx(QuestionCardPreview, { question: q, index: idx, showAnswers: showAllEditorAnswers, onEdit: () => setCurrentEditingQuestion(q), onDelete: async () => {
                                        const nextQ = editingQuestionsList.filter((_, i) => i !== idx);
                                        setEditingQuestionsList(nextQ);
                                        await api.updateQuestionSet(editingQuestionSet.id, {
                                            questions: nextQ,
                                        });
                                        await loadQuestionSets();
                                        showToast('Đã xóa câu hỏi khỏi bộ đề.');
                                    } }, q.id || idx))) }))] })) }) })), _jsxs("footer", { style: {
                    textAlign: 'center',
                    padding: '28px 16px',
                    color: '#94A3B8',
                    fontSize: '13px',
                    borderTop: '1px solid #E2E8F0',
                    marginTop: '48px',
                }, children: [_jsx("span", { children: "EduClass v2" }), " \u2022 ", _jsxs("span", { style: { fontWeight: 600 }, children: ["Phi\u00EAn b\u1EA3n v", APP_VERSION] })] }), _jsx(ChangePinModal, { isOpen: isChangePinOpen, onClose: () => setIsChangePinOpen(false), onSuccess: () => {
                    setIsChangePinOpen(false);
                    showToast('Đã đổi mã PIN cá nhân thành công!');
                } }), _jsx(LogoutWarningModal, { isOpen: isLogoutWarningOpen, classNameTitle: classes.find(c => c.id === selectedClassId)?.name, joinCode: getSessionJoinCode(activeSession), onClose: () => setIsLogoutWarningOpen(false), onCloseSessionAndLogout: handleCloseSessionAndLogout, onKeepSessionAndLogout: handleKeepSessionAndLogout }), _jsx(UpdateModal, { isOpen: isUpdateModalOpen, onClose: () => setIsUpdateModalOpen(false), currentVersion: APP_VERSION }), toastMessage && (_jsx(Toast, { message: toastMessage, type: "info", onClose: () => setToastMessage(null) }))] }));
};
export default App;
//# sourceMappingURL=App.js.map