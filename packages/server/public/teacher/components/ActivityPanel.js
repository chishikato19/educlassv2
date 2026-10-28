import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { balanceTwoTeamsByElo } from '@educlass/core';
import { QuickPollTeacherPanel } from '@educlass/activity-quick-poll';
import { QuizLiveTeacherPanel } from '@educlass/activity-quiz-live';
import { ExamTeacherPanel } from '@educlass/activity-exam';
import { SwissDuelTeacherPanel } from '@educlass/activity-swiss-duel';
import { AssignmentTeacherPanel } from '@educlass/activity-assignment-hub';
import { PdfPresenterTeacherPanel } from '@educlass/activity-pdf-presenter';
import { ObjectCameraTeacherPanel } from '@educlass/activity-object-camera';
import { TerritoryTeacherPanel } from '@educlass/activity-territory-war';
import { ProjectGradingTeacherPanel } from '@educlass/activity-project-grading';
import { ArcadeDuelTeacherPanel } from '@educlass/activity-arcade-duel';
import { InteractiveBoardTeacherPanel } from '@educlass/activity-interactive-board';
import { CircuitTeacherPanel } from '@educlass/activity-circuit-race';
import { api } from '../api/client.js';
import { ErrorBoundary } from './ErrorBoundary.js';
// Bảng ánh xạ Teacher Panels
const teacherPanelRegistry = {
    'quick-poll': QuickPollTeacherPanel,
    'quiz-live': QuizLiveTeacherPanel,
    exam: ExamTeacherPanel,
    'swiss-duel': SwissDuelTeacherPanel,
    'assignment-hub': AssignmentTeacherPanel,
    'pdf-presenter': PdfPresenterTeacherPanel,
    'object-camera': ObjectCameraTeacherPanel,
    'territory-war': TerritoryTeacherPanel,
    'project-grading': ProjectGradingTeacherPanel,
    'arcade-duel': ArcadeDuelTeacherPanel,
    'interactive-board': InteractiveBoardTeacherPanel,
    'circuit-race': CircuitTeacherPanel,
};
/**
 * Đăng ký thêm Client Teacher Panel mới vào ActivityPanel
 */
export function registerTeacherPanel(activityId, panelComponent) {
    teacherPanelRegistry[activityId] = panelComponent;
}
function parseStemText(stem, fallback) {
    if (!stem)
        return fallback;
    if (typeof stem === 'string')
        return stem;
    if (typeof stem === 'object' && 'text' in stem) {
        return String(stem.text) || fallback;
    }
    return fallback;
}
function parseOptionText(opt, fallback) {
    if (!opt)
        return fallback;
    if (typeof opt === 'string')
        return opt;
    if (typeof opt === 'object' && 'text' in opt) {
        return String(opt.text) || fallback;
    }
    return String(opt);
}
function extractQuestionImage(q) {
    if (typeof q['image'] === 'string' && q['image'].trim()) {
        return q['image'].trim();
    }
    const stemObj = q['stem'];
    if (stemObj &&
        typeof stemObj === 'object' &&
        Array.isArray(stemObj.images) &&
        stemObj.images.length > 0) {
        const firstImg = stemObj.images[0];
        if (typeof firstImg === 'string' && firstImg.trim()) {
            const trimmed = firstImg.trim();
            return trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')
                ? trimmed
                : `/api/assets/${trimmed}`;
        }
    }
    return undefined;
}
function extractOptionImage(opt) {
    if (opt && typeof opt === 'object') {
        const optObj = opt;
        if (typeof optObj.image === 'string' && optObj.image.trim()) {
            const trimmed = optObj.image.trim();
            return trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')
                ? trimmed
                : `/api/assets/${trimmed}`;
        }
        if (Array.isArray(optObj.images) && optObj.images.length > 0) {
            const first = optObj.images[0];
            if (typeof first === 'string' && first.trim()) {
                const trimmed = first.trim();
                return trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')
                    ? trimmed
                    : `/api/assets/${trimmed}`;
            }
        }
    }
    return undefined;
}
function parseCorrectAnswer(q, optionsCount) {
    const raw = q['correct'] ?? q['correctAnswer'] ?? q['answer'] ?? q['correct_answer'];
    if (typeof raw === 'number') {
        if (raw >= 0 && raw < optionsCount)
            return raw;
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim().toUpperCase();
        const letterMap = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
        if (trimmed in letterMap)
            return letterMap[trimmed];
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 0 && num < optionsCount)
            return num;
    }
    return 0;
}
function parseTfCorrectAnswer(q) {
    const raw = q['correct'] ?? q['correctAnswer'] ?? q['answer'];
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'string') {
        const s = raw.trim().toLowerCase();
        if (s === 'true' || s === 'đúng' || s === 't' || s === '1')
            return true;
        if (s === 'false' || s === 'sai' || s === 'f' || s === '0')
            return false;
    }
    return Boolean(raw);
}
function parseShortCorrectAnswer(q) {
    const raw = q['correct'] ?? q['correctAnswer'] ?? q['accepted'] ?? q['answer'];
    if (Array.isArray(raw))
        return raw.map(x => String(x).trim());
    if (raw !== undefined && raw !== null)
        return [String(raw).trim()];
    return [''];
}
function prepareTerritoryParticipants(participants, students, balanceMode) {
    if (!participants || participants.length === 0)
        return [];
    const studentMap = new Map();
    if (students) {
        for (const s of students) {
            studentMap.set(s.id, s);
        }
    }
    // 1. Phân chia theo tổ / nhóm cố định của lớp
    if (balanceMode === 'groups') {
        const groupMap = new Map();
        const individualStudents = [];
        for (const p of participants) {
            const gName = p.teamName?.trim();
            if (gName) {
                if (!groupMap.has(gName))
                    groupMap.set(gName, []);
                groupMap.get(gName).push(p);
            }
            else {
                individualStudents.push(p);
            }
        }
        if (groupMap.size > 0) {
            const result = [];
            const groupNames = Array.from(groupMap.keys());
            groupNames.forEach((gName, gIdx) => {
                const assignedTeam = gIdx % 2 === 0 ? 'blue' : 'red';
                const members = groupMap.get(gName);
                for (const m of members) {
                    const elo = (m.studentId ? studentMap.get(m.studentId)?.elo : undefined) ?? m.elo ?? 1000;
                    result.push({
                        id: m.id,
                        displayName: m.displayName,
                        team: assignedTeam,
                        groupName: gName,
                        elo,
                    });
                }
            });
            let currentTeam = 'blue';
            for (const ind of individualStudents) {
                const elo = (ind.studentId ? studentMap.get(ind.studentId)?.elo : undefined) ?? ind.elo ?? 1000;
                result.push({
                    id: ind.id,
                    displayName: ind.displayName,
                    team: currentTeam,
                    groupName: null,
                    elo,
                });
                currentTeam = currentTeam === 'blue' ? 'red' : 'blue';
            }
            return result;
        }
    }
    // 2. Chế độ Elo (Cân bằng thực lực) hoặc Ngẫu nhiên
    const candidates = participants.map(p => {
        let elo = 1000;
        if (p.studentId && studentMap.has(p.studentId)) {
            elo = studentMap.get(p.studentId).elo ?? 1000;
        }
        else if (p.studentIds && p.studentIds.length > 0) {
            const studentElos = p.studentIds
                .map(id => studentMap.get(id)?.elo)
                .filter((e) => typeof e === 'number');
            if (studentElos.length > 0) {
                elo = Math.round(studentElos.reduce((a, b) => a + b, 0) / studentElos.length);
            }
        }
        else if (typeof p.elo === 'number') {
            elo = p.elo;
        }
        return {
            id: p.id,
            displayName: p.displayName,
            elo,
            groupName: p.teamName?.trim() || null,
        };
    });
    const balanced = balanceTwoTeamsByElo(candidates, {
        balanceMethod: balanceMode === 'random' ? 'random' : 'elo',
        jitter: balanceMode === 'elo',
    });
    const blueInitial = balanced.blue.map(b => ({
        id: b.id,
        displayName: b.displayName,
        team: 'blue',
        groupName: b.groupName,
        elo: b.elo,
    }));
    const redInitial = balanced.red.map(r => ({
        id: r.id,
        displayName: r.displayName,
        team: 'red',
        groupName: r.groupName,
        elo: r.elo,
    }));
    return [...blueInitial, ...redInitial];
}
/**
 * ActivityPanel - Bảng điều khiển Hoạt động & Trò chơi dành cho Giáo viên
 */
export const ActivityPanel = ({ activities, activeRun, activeRuns = [], onSelectActiveRun, questionSets = [], onLoadQuestionSet, isLoading = false, onOpenActivityWindow, onStartActivity, onSendTeacherIntent, onEndActivity, participants = [], students = [], classes = [], activeSession, }) => {
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    // Lớp học liên kết cho Kỳ thi
    const sessionClassId = activeSession?.session?.classId ||
        activeSession?.classId ||
        '';
    const [examClassId, setExamClassId] = useState(sessionClassId || (classes[0]?.id ?? ''));
    useEffect(() => {
        if (sessionClassId) {
            setExamClassId(sessionClassId);
        }
    }, [sessionClassId]);
    // Form cấu hình đơn giản cho Quick Poll
    const [pollQuestion, setPollQuestion] = useState('Bạn hiểu bài học hôm nay ở mức độ nào?');
    const [pollOptions, setPollOptions] = useState('Rất hiểu\nHiểu cơ bản\nCần giải thích lại');
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
    // Form cấu hình cho Quiz Live (Bao gồm các chế độ: Kahoot, Quizizz, Đấu Cờ Thụy Sỹ, Đại Chiến Lãnh Thổ, Đối Kháng 1vs1, Đấu Bóng Chuyền, Đại Chiến Xanh Đỏ)
    const [quizTitle, setQuizTitle] = useState('Thử thách Tri thức Lớp học');
    const [quizMode, setQuizMode] = useState('kahoot');
    const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(true);
    const [quizShuffleOptions, setQuizShuffleOptions] = useState(true);
    const [quizEnablePowerUps, setQuizEnablePowerUps] = useState(true);
    const [quizShowCorrectAnswer, setQuizShowCorrectAnswer] = useState(true);
    const [quizAllowReplay, setQuizAllowReplay] = useState(true);
    const [selectedQuestionSetId, setSelectedQuestionSetId] = useState('');
    // Cấu hình Đại Chiến Xanh Đỏ (thử nghiệm)
    const [factionTitle] = useState('Đại Chiến Xanh Đỏ (thử nghiệm)');
    const [factionTotalRounds, setFactionTotalRounds] = useState(5);
    const [factionQuestionsPerMatch, setFactionQuestionsPerMatch] = useState(2);
    const [factionTimeLimitPerQuestion, setFactionTimeLimitPerQuestion] = useState(20);
    const [factionPickPhaseSeconds, setFactionPickPhaseSeconds] = useState(15);
    const [factionShuffleQuestions, setFactionShuffleQuestions] = useState(true);
    const [factionShuffleOptions, setFactionShuffleOptions] = useState(true);
    const [factionAllowRecycle, setFactionAllowRecycle] = useState(true);
    // Cấu hình Đấu Bóng Chuyền (thử nghiệm)
    const [volleyballTitle] = useState('Giải Đấu Bóng Chuyền (thử nghiệm)');
    const [volleyballPoolMode, setVolleyballPoolMode] = useState('auto');
    const [volleyballTimeLimitPerQuestion, setVolleyballTimeLimitPerQuestion] = useState(30);
    const [volleyballShuffleQuestions, setVolleyballShuffleQuestions] = useState(true);
    const [volleyballShuffleOptions, setVolleyballShuffleOptions] = useState(true);
    // Form cấu hình cho Kỳ thi (Exam)
    const [examTitle, setExamTitle] = useState('Kỳ Thi Khảo Sát');
    const [examDuration, setExamDuration] = useState(45);
    const [examShuffleQuestions, setExamShuffleQuestions] = useState(true);
    const [examShuffleOptions, setExamShuffleOptions] = useState(true);
    const [examPassword, setExamPassword] = useState('');
    const [examAllowViewScore, setExamAllowViewScore] = useState(true);
    const [examAllowViewReview, setExamAllowViewReview] = useState(true);
    const [swissTitle, setSwissTitle] = useState('Đấu Cờ Thụy Sỹ');
    const [swissMode, setSwissMode] = useState('questions');
    const [swissTimeLimitMinutes, setSwissTimeLimitMinutes] = useState(10);
    const [swissTimeLimitPerQuestion, setSwissTimeLimitPerQuestion] = useState(30);
    const [swissShuffleQuestions, setSwissShuffleQuestions] = useState(true);
    const [swissShuffleOptions, setSwissShuffleOptions] = useState(true);
    // Cấu hình Đại Chiến Lãnh Thổ
    const [territoryTitle, setTerritoryTitle] = useState('Đại Chiến Lãnh Thổ');
    const [territoryMapSize, setTerritoryMapSize] = useState('7x7');
    const [territoryTimeLimitMinutes, setTerritoryTimeLimitMinutes] = useState(5);
    const [territoryEnableSuddenDeath, setTerritoryEnableSuddenDeath] = useState(false);
    const [territoryBalanceMode, setTerritoryBalanceMode] = useState('elo');
    // Cấu hình Đường Đua Tri Thức
    const [circuitTitle, setCircuitTitle] = useState('Đường Đua Tri Thức');
    const [circuitTrackLength, setCircuitTrackLength] = useState(50);
    const [circuitTimePerQuestion, setCircuitTimePerQuestion] = useState(20);
    const [circuitActionWindowSeconds, setCircuitActionWindowSeconds] = useState(10);
    const [circuitShuffleQuestions, setCircuitShuffleQuestions] = useState(true);
    const [circuitShuffleOptions, setCircuitShuffleOptions] = useState(true);
    const [circuitIndependentOrder, setCircuitIndependentOrder] = useState(false);
    // Cấu hình Đối Kháng 1vs1
    const [arcadeDuelTitle] = useState('Đối Kháng 1vs1');
    const [arcadeDuelMode, setArcadeDuelMode] = useState('sync_turn');
    const [arcadeDuelTimeLimitPerQuestion, setArcadeDuelTimeLimitPerQuestion] = useState(15);
    const [arcadeDuelTotalTimeLimit, setArcadeDuelTotalTimeLimit] = useState(90);
    const [arcadeDuelInventoryCapacity, setArcadeDuelInventoryCapacity] = useState(2);
    const [arcadeDuelDropCondition, setArcadeDuelDropCondition] = useState(2);
    const [arcadeDuelShuffleOptions, setArcadeDuelShuffleOptions] = useState(true);
    const [arcadeDuelEnablePowerUps, setArcadeDuelEnablePowerUps] = useState(true);
    // Cấu hình Thu - phát bài tập
    const [assignmentTitle, setAssignmentTitle] = useState('Thu - phát bài tập');
    const [assignmentInstructions, setAssignmentInstructions] = useState('');
    const [assignmentTargetDir, setAssignmentTargetDir] = useState('');
    const [assignmentAllowedExts, setAssignmentAllowedExts] = useState([]);
    const [assignmentMaxFileSizeMb, setAssignmentMaxFileSizeMb] = useState(50);
    const [assignmentAllowResubmit, setAssignmentAllowResubmit] = useState(true);
    const [assignmentDeadlineMinutes, setAssignmentDeadlineMinutes] = useState(null);
    // Cấu hình Bảng Tương Tác (Interactive Board)
    const [boardTitle, setBoardTitle] = useState('Bảng Tương Tác Lớp Học');
    const [boardPrompt, setBoardPrompt] = useState('');
    const [boardMaxGrade, setBoardMaxGrade] = useState(10);
    const [boardAllowDraw, setBoardAllowDraw] = useState(true);
    const [boardAllowImage, setBoardAllowImage] = useState(true);
    const [boardAllowComments, setBoardAllowComments] = useState(true);
    const [boardAllowReactions, setBoardAllowReactions] = useState(true);
    const [boardAllowPeerGrades, setBoardAllowPeerGrades] = useState(true);
    const [boardRequireApproval, setBoardRequireApproval] = useState(true);
    const [boardWorksheetEnabled, setBoardWorksheetEnabled] = useState(false);
    const [boardQuestionSetId, setBoardQuestionSetId] = useState('');
    // Cấu hình Chấm điểm Dự án đa chiều
    const [projectGradingTitle, setProjectGradingTitle] = useState('Chấm điểm Dự án');
    const [projectGradingMaxScore, setProjectGradingMaxScore] = useState(10);
    const [projectGradingWeightSelf, setProjectGradingWeightSelf] = useState(10);
    const [projectGradingWeightMember, setProjectGradingWeightMember] = useState(20);
    const [projectGradingWeightCross, setProjectGradingWeightCross] = useState(20);
    const [projectGradingWeightTeacher, setProjectGradingWeightTeacher] = useState(50);
    const [projectGradingGroups, setProjectGradingGroups] = useState([]);
    const [isLoadingClassGroups, setIsLoadingClassGroups] = useState(false);
    const [classGroupsLoadedMsg, setClassGroupsLoadedMsg] = useState(null);
    const handleFetchClassGroupsForGrading = async () => {
        if (!activeSession?.session?.classId) {
            const parts = participants || [];
            const count = Math.max(2, Math.min(4, parts.length || 4));
            const fallbackGroups = Array.from({ length: count }, (_, i) => ({
                id: `group_${i + 1}`,
                name: `Nhóm ${i + 1}`,
                leaderParticipantId: parts[i]?.id ?? null,
                leaderDisplayName: parts[i]?.displayName ?? null,
                memberParticipantIds: parts.filter((_, idx) => idx % count === i).map(p => p.id),
            }));
            setProjectGradingGroups(fallbackGroups);
            setClassGroupsLoadedMsg(`✓ Đã tạo ${fallbackGroups.length} nhóm từ danh sách học sinh hiện tại!`);
            return;
        }
        setIsLoadingClassGroups(true);
        setClassGroupsLoadedMsg(null);
        try {
            const res = await api.getClassGroups(activeSession.session.classId);
            if (res.groups.length === 0) {
                setClassGroupsLoadedMsg('ℹ️ Lớp học chưa có nhóm nào trong cơ sở dữ liệu.');
                return;
            }
            const mappedGroups = res.groups.map(g => {
                const leaderPart = participants?.find(p => p.studentId === g.leaderStudentId);
                const memberPartIds = g.members.map(m => participants?.find(p => p.studentId === m.id)?.id || m.id);
                return {
                    id: g.id,
                    name: g.name,
                    leaderParticipantId: leaderPart?.id ?? g.leaderStudentId ?? null,
                    leaderDisplayName: g.leader?.fullName ?? null,
                    memberParticipantIds: memberPartIds,
                };
            });
            setProjectGradingGroups(mappedGroups);
            setClassGroupsLoadedMsg(`✓ Đã nạp thành công ${mappedGroups.length} nhóm từ lớp học!`);
        }
        catch {
            setClassGroupsLoadedMsg('⚠️ Không thể tải danh sách nhóm từ lớp học.');
        }
        finally {
            setIsLoadingClassGroups(false);
        }
    };
    const [assignmentInitialFiles, setAssignmentInitialFiles] = useState([]);
    const [isSelectingDir, setIsSelectingDir] = useState(false);
    const handleSelectFolder = async () => {
        setIsSelectingDir(true);
        try {
            const res = await fetch('/api/system/select-folder', { method: 'POST' });
            if (res.ok) {
                const data = (await res.json());
                if (data.path) {
                    setAssignmentTargetDir(data.path);
                }
            }
        }
        catch {
            // bỏ qua
        }
        finally {
            setIsSelectingDir(false);
        }
    };
    const handleUseDefaultFolder = async () => {
        try {
            const res = await fetch('/api/system/default-submissions-dir');
            if (res.ok) {
                const data = (await res.json());
                const dir = data.defaultDir || data.fallbackDir || '';
                setAssignmentTargetDir(dir);
            }
        }
        catch {
            // bỏ qua
        }
    };
    // Cấu hình điểm số chi tiết từng câu trong Kỳ thi
    const [examCustomPoints, setExamCustomPoints] = useState({});
    const [targetTotalScore, setTargetTotalScore] = useState(10);
    const [bulkPointValue, setBulkPointValue] = useState(0.25);
    const [examPreviewQuestions, setExamPreviewQuestions] = useState([]);
    const [isLoadingExamQuestions, setIsLoadingExamQuestions] = useState(false);
    // Tự động nạp danh sách câu hỏi xem trước và khởi tạo điểm khi mở modal Kỳ thi
    useEffect(() => {
        if (!isConfigModalOpen || selectedActivity?.id !== 'exam')
            return;
        let isMounted = true;
        setIsLoadingExamQuestions(true);
        const loadQuestions = async () => {
            try {
                let rawList = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                }
                if (rawList.length === 0) {
                    rawList = [
                        { id: 'q1', type: 'mcq4', stem: { text: '2 + 2 = ?' }, points: 5 },
                        { id: 'q2', type: 'tf', stem: { text: 'Hà Nội là thủ đô của Việt Nam.' }, points: 5 },
                    ];
                }
                const parsed = rawList.map((item, idx) => {
                    const q = item;
                    const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                    const stemText = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                    const type = String(q['type'] || 'mcq4');
                    const defaultPoints = rawList.length > 2 ? 0.25 : 5;
                    const points = Number(q['points']) || defaultPoints;
                    return { id, stemText, type, points };
                });
                if (isMounted) {
                    setExamPreviewQuestions(parsed);
                    setExamCustomPoints(prev => {
                        const next = { ...prev };
                        parsed.forEach(q => {
                            if (next[q.id] === undefined) {
                                next[q.id] = q.points;
                            }
                        });
                        return next;
                    });
                }
            }
            catch {
                // bỏ qua lỗi
            }
            finally {
                if (isMounted)
                    setIsLoadingExamQuestions(false);
            }
        };
        loadQuestions();
        return () => {
            isMounted = false;
        };
    }, [isConfigModalOpen, selectedActivity?.id, selectedQuestionSetId, onLoadQuestionSet]);
    const totalCalculatedPoints = Math.round(examPreviewQuestions.reduce((sum, q) => sum + (examCustomPoints[q.id] ?? q.points), 0) * 100) / 100;
    const [errorMsg, setErrorMsg] = useState(null);
    const handleOpenConfig = (act) => {
        setSelectedActivity(act);
        setIsConfigModalOpen(true);
        setErrorMsg(null);
        if (act.id === 'assignment-hub') {
            void handleUseDefaultFolder();
        }
    };
    const handleCloseConfig = () => {
        setIsConfigModalOpen(false);
        setSelectedActivity(null);
        setErrorMsg(null);
        setAssignmentInitialFiles([]);
    };
    const handleSubmitStart = async (e) => {
        e.preventDefault();
        if (!selectedActivity)
            return;
        if (selectedActivity.id === 'quick-poll') {
            const trimmedQ = pollQuestion.trim();
            const optionsArr = pollOptions
                .split('\n')
                .map(o => o.trim())
                .filter(o => o.length > 0);
            if (!trimmedQ) {
                setErrorMsg('Vui lòng nhập nội dung câu hỏi.');
                return;
            }
            if (optionsArr.length < 2) {
                setErrorMsg('Cần ít nhất 2 phương án bình chọn.');
                return;
            }
            try {
                await onStartActivity('quick-poll', {
                    question: trimmedQ,
                    options: optionsArr,
                    allowMultiple: pollAllowMultiple,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
            }
        }
        else if (selectedActivity.id === 'quiz-live') {
            if (quizMode === 'swiss-duel') {
                try {
                    let swissQuestions = [];
                    if (selectedQuestionSetId && onLoadQuestionSet) {
                        const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                        const rawList = Array.isArray(loaded)
                            ? loaded
                            : loaded?.questions || [];
                        const validRawList = rawList.filter((qItem) => {
                            const q = qItem;
                            const qType = String(q['type'] || 'mcq4');
                            // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với Đấu cờ
                            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                        });
                        if (validRawList.length > 0) {
                            swissQuestions = validRawList.map((qItem, idx) => {
                                const q = qItem;
                                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                                const qType = String(q['type'] || 'mcq4');
                                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                                if (qType === 'tf') {
                                    return {
                                        id,
                                        type: 'tf',
                                        stem,
                                        correctAnswer: parseTfCorrectAnswer(q),
                                        timeLimit: 30,
                                        image,
                                    };
                                }
                                if (qType === 'short') {
                                    return {
                                        id,
                                        type: 'short',
                                        stem,
                                        correctAnswer: parseShortCorrectAnswer(q),
                                        timeLimit: 30,
                                        image,
                                    };
                                }
                                // mcq4
                                const rawOpts = Array.isArray(q['options'])
                                    ? q['options']
                                    : ['A', 'B', 'C', 'D'];
                                const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`));
                                const cAns = parseCorrectAnswer(q, options.length);
                                return {
                                    id,
                                    type: 'mcq4',
                                    stem,
                                    options,
                                    correctAnswer: cAns,
                                    timeLimit: 30,
                                    image,
                                };
                            });
                        }
                    }
                    if (swissQuestions.length === 0) {
                        swissQuestions = [
                            {
                                id: 'q1',
                                type: 'mcq4',
                                stem: 'Thủ đô của nước Việt Nam là gì?',
                                options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
                                correctAnswer: 0,
                                timeLimit: 30,
                            },
                            {
                                id: 'q2',
                                type: 'tf',
                                stem: 'Mặt trời mọc ở hướng Đông.',
                                correctAnswer: true,
                                timeLimit: 30,
                            },
                        ];
                    }
                    await onStartActivity('swiss-duel', {
                        title: quizTitle.trim() || swissTitle.trim() || 'Đấu Cờ Thụy Sỹ',
                        mode: swissMode,
                        timeLimitMinutes: Number(swissTimeLimitMinutes) || 10,
                        questions: swissQuestions,
                        pointsWin: 2,
                        pointsDraw: 1,
                        pointsLoss: 0,
                        timeLimitPerQuestion: Number(swissTimeLimitPerQuestion) || 30,
                        shuffleQuestions: swissShuffleQuestions,
                        shuffleOptions: swissShuffleOptions,
                    });
                    handleCloseConfig();
                }
                catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đấu Cờ Thụy Sỹ');
                }
                return;
            }
            if (quizMode === 'territory-war') {
                try {
                    let territoryQuestions = [];
                    if (selectedQuestionSetId && onLoadQuestionSet) {
                        const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                        const rawList = Array.isArray(loaded)
                            ? loaded
                            : loaded?.questions || [];
                        const validRawList = rawList.filter((qItem) => {
                            const q = qItem;
                            const qType = String(q['type'] || 'mcq4');
                            // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với cướp đất
                            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                        });
                        if (validRawList.length > 0) {
                            territoryQuestions = validRawList.map((qItem, idx) => {
                                const q = qItem;
                                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                                const qType = String(q['type'] || 'mcq4');
                                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                                if (qType === 'short') {
                                    return {
                                        id,
                                        stem,
                                        type: 'short',
                                        correctAnswer: parseShortCorrectAnswer(q),
                                        image,
                                        timeLimit: 30,
                                    };
                                }
                                if (qType === 'tf') {
                                    return {
                                        id,
                                        stem,
                                        type: 'tf',
                                        options: ['Đúng', 'Sai'],
                                        correctAnswer: parseTfCorrectAnswer(q),
                                        image,
                                        timeLimit: 30,
                                    };
                                }
                                // mcq4
                                const rawOpts = (q['options'] ||
                                    q['contentJson']?.options ||
                                    []);
                                const options = rawOpts.map((opt, oIdx) => parseOptionText(opt, `Phương án ${oIdx + 1}`));
                                let correctAnswer = options[0];
                                if (typeof q['correct'] === 'number') {
                                    correctAnswer = options[q['correct']] || options[0];
                                }
                                else if (typeof q['correctAnswer'] !== 'undefined') {
                                    correctAnswer = q['correctAnswer'];
                                }
                                return {
                                    id,
                                    stem,
                                    type: 'mcq4',
                                    options,
                                    correctAnswer,
                                    image,
                                    timeLimit: 30,
                                };
                            });
                        }
                    }
                    if (territoryQuestions.length === 0) {
                        territoryQuestions = [
                            {
                                id: 'tw_sample_1',
                                stem: 'Thủ đô của Việt Nam là thành phố nào?',
                                type: 'mcq4',
                                options: ['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh', 'Huế'],
                                correctAnswer: 'Hà Nội',
                                timeLimit: 30,
                            },
                            {
                                id: 'tw_sample_2',
                                stem: '2 + 2 x 2 bằng bao nhiêu?',
                                type: 'mcq4',
                                options: ['6', '8', '4', '10'],
                                correctAnswer: '6',
                                timeLimit: 30,
                            },
                            {
                                id: 'tw_sample_3',
                                stem: 'Mặt trời mọc ở hướng Đông, lặn ở hướng Tây.',
                                type: 'tf',
                                correctAnswer: true,
                                timeLimit: 30,
                            },
                        ];
                    }
                    const initialParticipants = prepareTerritoryParticipants(participants, students, territoryBalanceMode);
                    await onStartActivity('territory-war', {
                        title: quizTitle.trim() || territoryTitle.trim() || 'Đại Chiến Lãnh Thổ',
                        mapSize: territoryMapSize,
                        timeLimitMinutes: Number(territoryTimeLimitMinutes) || 5,
                        enableSuddenDeath: territoryEnableSuddenDeath,
                        shuffleQuestions: true,
                        shuffleAnswers: true,
                        allowLoopQuestions: true,
                        questions: territoryQuestions,
                        initialParticipants,
                        pointsPlain: 1,
                        pointsWatchtower: 5,
                        pointsSmallCastle: 10,
                        pointsBigCastle: 20,
                        pointsReinforce: 1,
                    });
                    handleCloseConfig();
                }
                catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Lãnh Thổ');
                }
                return;
            }
            if (quizMode === 'arcade-duel') {
                try {
                    let duelQuestions = [];
                    if (selectedQuestionSetId && onLoadQuestionSet) {
                        const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                        const rawList = Array.isArray(loaded)
                            ? loaded
                            : loaded?.questions || [];
                        if (rawList.length > 0) {
                            duelQuestions = rawList.map((qItem, idx) => {
                                const q = qItem;
                                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                                const rawOpts = Array.isArray(q['options'])
                                    ? q['options']
                                    : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
                                const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'][oIdx] ||
                                    `Phương án ${oIdx + 1}`));
                                const cAns = parseCorrectAnswer(q, options.length);
                                return {
                                    id,
                                    stem,
                                    options: options.slice(0, 4),
                                    correctAnswer: typeof cAns === 'number' ? cAns : 0,
                                    points: 100,
                                    ...(image ? { image } : {}),
                                };
                            });
                        }
                    }
                    if (duelQuestions.length === 0) {
                        duelQuestions = [
                            {
                                id: 'q1',
                                stem: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?',
                                options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'],
                                correctAnswer: 0,
                                points: 100,
                            },
                            {
                                id: 'q2',
                                stem: 'Mặt trời mọc ở hướng nào và lặn ở hướng nào?',
                                options: [
                                    'Mọc Đông - Lặn Tây',
                                    'Mọc Tây - Lặn Đông',
                                    'Mọc Nam - Lặn Bắc',
                                    'Mọc Bắc - Lặn Nam',
                                ],
                                correctAnswer: 0,
                                points: 100,
                            },
                        ];
                    }
                    await onStartActivity('arcade-duel', {
                        title: quizTitle.trim() || arcadeDuelTitle.trim() || 'Đối Kháng 1vs1',
                        mode: arcadeDuelMode,
                        questions: duelQuestions,
                        timeLimitPerQuestion: Number(arcadeDuelTimeLimitPerQuestion) || 15,
                        totalTimeLimit: Number(arcadeDuelTotalTimeLimit) || 90,
                        shuffleOptions: arcadeDuelShuffleOptions,
                        enablePowerUps: arcadeDuelEnablePowerUps,
                        keyBindings: {
                            blueKeys: {
                                option1: 'KeyA',
                                option2: 'KeyS',
                                option3: 'KeyD',
                                option4: 'KeyF',
                                powerUp: 'KeyQ',
                            },
                            redKeys: {
                                option1: 'Digit1',
                                option2: 'Digit2',
                                option3: 'Digit3',
                                option4: 'Digit4',
                                powerUp: 'Digit5',
                            },
                        },
                        inventoryCapacity: arcadeDuelInventoryCapacity,
                        dropCondition: arcadeDuelDropCondition,
                        freezePenaltyMs: 1500,
                        blueTeamName: 'Đội Xanh',
                        redTeamName: 'Đội Đỏ',
                    });
                    handleCloseConfig();
                }
                catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đối Kháng 1vs1');
                }
                return;
            }
            if (quizMode === 'volleyball-tournament') {
                try {
                    let vbQuestions = [];
                    if (selectedQuestionSetId && onLoadQuestionSet) {
                        const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                        const rawList = Array.isArray(loaded)
                            ? loaded
                            : loaded?.questions || [];
                        const validRawList = rawList.filter((qItem) => {
                            const q = qItem;
                            const qType = String(q['type'] || 'mcq4');
                            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                        });
                        if (validRawList.length > 0) {
                            vbQuestions = validRawList.map((qItem, idx) => {
                                const q = qItem;
                                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                                const qType = String(q['type'] || 'mcq4');
                                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                                if (qType === 'tf') {
                                    return {
                                        id,
                                        type: 'tf',
                                        stem,
                                        correctAnswer: parseTfCorrectAnswer(q),
                                        timeLimit: Number(volleyballTimeLimitPerQuestion) || 30,
                                        image,
                                    };
                                }
                                if (qType === 'short') {
                                    return {
                                        id,
                                        type: 'short',
                                        stem,
                                        correctAnswer: parseShortCorrectAnswer(q),
                                        timeLimit: Number(volleyballTimeLimitPerQuestion) || 30,
                                        image,
                                    };
                                }
                                const rawOpts = Array.isArray(q['options'])
                                    ? q['options']
                                    : ['A', 'B', 'C', 'D'];
                                const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`));
                                const cAns = parseCorrectAnswer(q, options.length);
                                return {
                                    id,
                                    type: 'mcq4',
                                    stem,
                                    options,
                                    correctAnswer: cAns,
                                    timeLimit: Number(volleyballTimeLimitPerQuestion) || 30,
                                    image,
                                };
                            });
                        }
                    }
                    if (vbQuestions.length === 0) {
                        vbQuestions = [
                            {
                                id: 'q1',
                                type: 'mcq4',
                                stem: 'Thủ đô của nước Việt Nam là gì?',
                                options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
                                correctAnswer: 0,
                                timeLimit: 30,
                            },
                            {
                                id: 'q2',
                                type: 'tf',
                                stem: 'Mặt trời mọc ở hướng Đông.',
                                correctAnswer: true,
                                timeLimit: 30,
                            },
                        ];
                    }
                    await onStartActivity('volleyball-tournament', {
                        title: quizTitle.trim() || volleyballTitle.trim() || 'Giải Đấu Bóng Chuyền (thử nghiệm)',
                        poolMode: volleyballPoolMode,
                        questions: vbQuestions,
                        pointsWin: 2,
                        pointsDraw: 1,
                        pointsLoss: 0,
                        timeLimitPerQuestion: Number(volleyballTimeLimitPerQuestion) || 30,
                        shuffleQuestions: volleyballShuffleQuestions,
                        shuffleOptions: volleyballShuffleOptions,
                    });
                    handleCloseConfig();
                }
                catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Giải Đấu Bóng Chuyền');
                }
                return;
            }
            if (quizMode === 'faction-duel') {
                try {
                    let fdQuestions = [];
                    if (selectedQuestionSetId && onLoadQuestionSet) {
                        const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                        const rawList = Array.isArray(loaded)
                            ? loaded
                            : loaded?.questions || [];
                        const validRawList = rawList.filter((qItem) => {
                            const q = qItem;
                            const qType = String(q['type'] || 'mcq4');
                            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                        });
                        if (validRawList.length > 0) {
                            fdQuestions = validRawList.map((qItem, idx) => {
                                const q = qItem;
                                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                                const qType = String(q['type'] || 'mcq4');
                                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                                if (qType === 'tf') {
                                    return {
                                        id,
                                        type: 'tf',
                                        stem: { text: stem, images: image ? [image] : undefined },
                                        correctAnswer: parseTfCorrectAnswer(q),
                                        timeLimitSeconds: Number(factionTimeLimitPerQuestion) || 20,
                                    };
                                }
                                if (qType === 'short') {
                                    return {
                                        id,
                                        type: 'short',
                                        stem: { text: stem, images: image ? [image] : undefined },
                                        correctAnswer: parseShortCorrectAnswer(q),
                                        timeLimitSeconds: Number(factionTimeLimitPerQuestion) || 20,
                                    };
                                }
                                const rawOpts = Array.isArray(q['options'])
                                    ? q['options']
                                    : ['A', 'B', 'C', 'D'];
                                const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`));
                                const cAns = parseCorrectAnswer(q, options.length);
                                return {
                                    id,
                                    type: 'mcq4',
                                    stem: { text: stem, images: image ? [image] : undefined },
                                    options: options.map((optText, oIdx) => ({
                                        id: String(oIdx),
                                        text: optText,
                                        isCorrect: Number(cAns) === oIdx,
                                    })),
                                    correctAnswer: String(cAns),
                                    timeLimitSeconds: Number(factionTimeLimitPerQuestion) || 20,
                                };
                            });
                        }
                    }
                    if (fdQuestions.length === 0) {
                        fdQuestions = [
                            {
                                id: 'q1',
                                type: 'mcq4',
                                stem: { text: 'Thủ đô của nước Việt Nam là gì?' },
                                options: [
                                    { id: '0', text: 'Hà Nội', isCorrect: true },
                                    { id: '1', text: 'Hồ Chí Minh', isCorrect: false },
                                    { id: '2', text: 'Đà Nẵng', isCorrect: false },
                                    { id: '3', text: 'Huế', isCorrect: false },
                                ],
                                correctAnswer: '0',
                                timeLimitSeconds: 20,
                            },
                            {
                                id: 'q2',
                                type: 'tf',
                                stem: { text: 'Mặt trời mọc ở hướng Đông.' },
                                correctAnswer: true,
                                timeLimitSeconds: 20,
                            },
                        ];
                    }
                    await onStartActivity('faction-duel', {
                        title: quizTitle.trim() || factionTitle.trim() || 'Đại Chiến Xanh Đỏ (thử nghiệm)',
                        totalRounds: Number(factionTotalRounds) || 5,
                        questionsPerMatch: Number(factionQuestionsPerMatch) || 2,
                        shuffleQuestions: factionShuffleQuestions,
                        shuffleOptions: factionShuffleOptions,
                        allowQuestionRecycle: factionAllowRecycle,
                        answerTimeSeconds: Number(factionTimeLimitPerQuestion) || 20,
                        pickPhaseSeconds: Number(factionPickPhaseSeconds) || 15,
                        questions: fdQuestions,
                    });
                    handleCloseConfig();
                }
                catch (err) {
                    setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Xanh Đỏ');
                }
                return;
            }
            try {
                let questionsToUse = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    const rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    if (rawList.length > 0) {
                        questionsToUse = rawList.map((qItem, idx) => {
                            const q = qItem;
                            const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                            const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                            const qType = String(q['type'] || 'mcq4');
                            const image = extractQuestionImage(q);
                            if (qType === 'tf') {
                                return {
                                    id,
                                    type: 'tf',
                                    stem,
                                    correctAnswer: parseTfCorrectAnswer(q),
                                    timeLimit: 20,
                                    points: 1000,
                                    ...(image ? { image } : {}),
                                };
                            }
                            if (qType === 'tf_group') {
                                const rawItems = Array.isArray(q['items'])
                                    ? q['items']
                                    : [];
                                const items = rawItems.map((it, itemIdx) => {
                                    const text = typeof it.text === 'object' &&
                                        it.text &&
                                        'text' in it.text
                                        ? String(it.text.text)
                                        : String(it.text || `Ý ${['a', 'b', 'c', 'd'][itemIdx] || itemIdx + 1}`);
                                    const correct = typeof it.correct === 'boolean'
                                        ? it.correct
                                        : String(it.correct).toLowerCase() === 'true';
                                    return {
                                        id: String(it.id || `item_${itemIdx}`),
                                        text,
                                        correct,
                                    };
                                });
                                const correctAnswer = items.map(it => it.correct);
                                return {
                                    id,
                                    type: 'tf_group',
                                    stem,
                                    items,
                                    correctAnswer,
                                    timeLimit: 30,
                                    points: 1000,
                                    ...(image ? { image } : {}),
                                };
                            }
                            if (qType === 'short') {
                                return {
                                    id,
                                    type: 'short',
                                    stem,
                                    correctAnswer: parseShortCorrectAnswer(q),
                                    timeLimit: 30,
                                    points: 1000,
                                    ...(image ? { image } : {}),
                                };
                            }
                            if (qType === 'matching') {
                                const rawLeft = Array.isArray(q['leftItems'])
                                    ? q['leftItems']
                                    : [];
                                const rawRight = Array.isArray(q['rightItems'])
                                    ? q['rightItems']
                                    : [];
                                const leftItems = rawLeft.map(it => ({
                                    id: String(it.id),
                                    text: typeof it.text === 'object' &&
                                        it.text &&
                                        'text' in it.text
                                        ? String(it.text.text)
                                        : String(it.text || ''),
                                }));
                                const rightItems = rawRight.map(it => ({
                                    id: String(it.id),
                                    text: typeof it.text === 'object' &&
                                        it.text &&
                                        'text' in it.text
                                        ? String(it.text.text)
                                        : String(it.text || ''),
                                }));
                                const cAns = typeof q['correctPairs'] === 'object' && q['correctPairs'] !== null
                                    ? q['correctPairs']
                                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                                        ? q['correctAnswer']
                                        : {};
                                return {
                                    id,
                                    type: 'matching',
                                    stem,
                                    leftItems,
                                    rightItems,
                                    correctAnswer: cAns,
                                    timeLimit: 30,
                                    points: 1000,
                                    ...(image ? { image } : {}),
                                };
                            }
                            if (qType === 'cloze_drag') {
                                const template = String(q['template'] || '');
                                const rawBlanks = Array.isArray(q['blanks'])
                                    ? q['blanks']
                                    : [];
                                const blanks = rawBlanks.map(b => {
                                    const item = { id: String(b.id) };
                                    if (typeof b.position === 'number') {
                                        item.position = b.position;
                                    }
                                    return item;
                                });
                                const wordBank = Array.isArray(q['wordBank']) ? q['wordBank'] : [];
                                const correctBlanksMap = typeof q['correctBlanks'] === 'object' && q['correctBlanks'] !== null
                                    ? q['correctBlanks']
                                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                                        ? q['correctAnswer']
                                        : {};
                                const cAns = { ...correctBlanksMap };
                                for (const b of rawBlanks) {
                                    if (b.answer && !cAns[b.id]) {
                                        cAns[b.id] = b.answer;
                                    }
                                }
                                return {
                                    id,
                                    type: 'cloze_drag',
                                    stem,
                                    template,
                                    blanks,
                                    wordBank,
                                    correctAnswer: cAns,
                                    timeLimit: 30,
                                    points: 1000,
                                    ...(image ? { image } : {}),
                                };
                            }
                            // mcq4
                            const rawOpts = Array.isArray(q['options'])
                                ? q['options']
                                : ['A', 'B', 'C', 'D'];
                            const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`));
                            const optionImages = rawOpts.map(o => extractOptionImage(o));
                            const hasAnyOptImg = optionImages.some(img => Boolean(img));
                            const cAns = parseCorrectAnswer(q, options.length);
                            return {
                                id,
                                type: 'mcq4',
                                stem,
                                options,
                                correctAnswer: cAns,
                                timeLimit: 20,
                                points: 1000,
                                ...(image ? { image } : {}),
                                ...(hasAnyOptImg ? { optionImages } : {}),
                            };
                        });
                    }
                }
                if (questionsToUse.length === 0) {
                    questionsToUse = [
                        {
                            id: 'q1',
                            type: 'mcq4',
                            stem: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?',
                            options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ'],
                            correctAnswer: 0,
                            timeLimit: 20,
                            points: 1000,
                        },
                        {
                            id: 'q2',
                            type: 'tf',
                            stem: 'Mặt trời mọc ở hướng Đông và lặn ở hướng Tây.',
                            correctAnswer: true,
                            timeLimit: 15,
                            points: 1000,
                        },
                    ];
                }
                await onStartActivity('quiz-live', {
                    title: quizTitle.trim() || 'Thử thách Tri thức Lớp học',
                    mode: quizMode,
                    questions: questionsToUse,
                    shuffleQuestions: quizShuffleQuestions,
                    shuffleOptions: quizShuffleOptions,
                    enablePowerUps: quizMode === 'quizizz' ? quizEnablePowerUps : false,
                    showCorrectAnswer: quizMode === 'quizizz' ? quizShowCorrectAnswer : false,
                    allowReplay: quizMode === 'quizizz' ? quizAllowReplay : false,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
            }
        }
        else if (selectedActivity.id === 'exam') {
            try {
                let examQuestions = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    const rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    if (rawList.length > 0) {
                        examQuestions = rawList.map((qItem, idx) => {
                            const q = qItem;
                            const stem = typeof q['stem'] === 'object' && q['stem']
                                ? q['stem']
                                : { text: parseStemText(q['stem'], `Câu hỏi ${idx + 1}`), images: [] };
                            const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                            const qType = String(q['type'] || 'mcq4');
                            const points = examCustomPoints[id] !== undefined
                                ? Number(examCustomPoints[id])
                                : Number(q['points']) || 1;
                            if (qType === 'tf') {
                                return {
                                    id,
                                    type: 'tf',
                                    stem,
                                    correct: parseTfCorrectAnswer(q),
                                    points,
                                };
                            }
                            if (qType === 'short') {
                                return {
                                    id,
                                    type: 'short',
                                    stem,
                                    accepted: parseShortCorrectAnswer(q),
                                    points,
                                };
                            }
                            if (qType === 'matching') {
                                const rawLeft = Array.isArray(q['leftItems'])
                                    ? q['leftItems']
                                    : [];
                                const rawRight = Array.isArray(q['rightItems'])
                                    ? q['rightItems']
                                    : [];
                                const leftItems = rawLeft.map(it => ({
                                    id: String(it.id),
                                    text: typeof it.text === 'object' && it.text
                                        ? it.text
                                        : { text: String(it.text || ''), images: [] },
                                }));
                                const rightItems = rawRight.map(it => ({
                                    id: String(it.id),
                                    text: typeof it.text === 'object' && it.text
                                        ? it.text
                                        : { text: String(it.text || ''), images: [] },
                                }));
                                const correctPairs = typeof q['correctPairs'] === 'object' && q['correctPairs'] !== null
                                    ? q['correctPairs']
                                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                                        ? q['correctAnswer']
                                        : {};
                                return {
                                    id,
                                    type: 'matching',
                                    stem,
                                    leftItems,
                                    rightItems,
                                    correctPairs,
                                    points,
                                };
                            }
                            if (qType === 'cloze_drag') {
                                const template = String(q['template'] || '');
                                const rawBlanks = Array.isArray(q['blanks'])
                                    ? q['blanks']
                                    : [];
                                const correctBlanksMap = typeof q['correctBlanks'] === 'object' && q['correctBlanks'] !== null
                                    ? q['correctBlanks']
                                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                                        ? q['correctAnswer']
                                        : {};
                                const blanks = rawBlanks.map(b => {
                                    const item = {
                                        id: String(b.id),
                                        answer: String(b.answer || correctBlanksMap[b.id] || ''),
                                    };
                                    if (b.hint) {
                                        item.hint = String(b.hint);
                                    }
                                    return item;
                                });
                                const wordBank = Array.isArray(q['wordBank']) ? q['wordBank'] : [];
                                return {
                                    id,
                                    type: 'cloze_drag',
                                    stem,
                                    template,
                                    blanks,
                                    wordBank,
                                    points,
                                };
                            }
                            // mcq4
                            const rawOpts = Array.isArray(q['options'])
                                ? q['options']
                                : ['A', 'B', 'C', 'D'];
                            const options = rawOpts.map((o) => {
                                if (typeof o === 'object' && o)
                                    return o;
                                return { text: String(o), images: [] };
                            });
                            const correct = parseCorrectAnswer(q, options.length);
                            return {
                                id,
                                type: 'mcq4',
                                stem,
                                options,
                                correct,
                                points,
                            };
                        });
                    }
                }
                if (examQuestions.length === 0) {
                    examQuestions = [
                        {
                            id: 'q1',
                            type: 'mcq4',
                            stem: { text: '2 + 2 = ?', images: [] },
                            options: [
                                { text: '3', images: [] },
                                { text: '4', images: [] },
                                { text: '5', images: [] },
                                { text: '6', images: [] },
                            ],
                            correct: 1,
                            points: examCustomPoints['q1'] !== undefined ? Number(examCustomPoints['q1']) : 5,
                        },
                        {
                            id: 'q2',
                            type: 'tf',
                            stem: { text: 'Hà Nội là thủ đô của Việt Nam.', images: [] },
                            correct: true,
                            points: examCustomPoints['q2'] !== undefined ? Number(examCustomPoints['q2']) : 5,
                        },
                    ];
                }
                await onStartActivity('exam', {
                    title: examTitle.trim() || 'Kỳ Thi Khảo Sát',
                    durationMinutes: Number(examDuration) || 45,
                    shuffleQuestions: examShuffleQuestions,
                    shuffleOptions: examShuffleOptions,
                    password: examPassword.trim() || undefined,
                    allowViewScore: examAllowViewScore,
                    allowViewReview: examAllowViewReview,
                    classId: examClassId || undefined,
                    questions: examQuestions,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu kỳ thi');
            }
        }
        else if (selectedActivity.id === 'swiss-duel') {
            try {
                let swissQuestions = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    const rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    const validRawList = rawList.filter((qItem) => {
                        const q = qItem;
                        const qType = String(q['type'] || 'mcq4');
                        // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng kéo ghép không phù hợp với Đấu cờ
                        return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                    });
                    if (validRawList.length > 0) {
                        swissQuestions = validRawList.map((qItem, idx) => {
                            const q = qItem;
                            const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                            const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                            const qType = String(q['type'] || 'mcq4');
                            const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                            if (qType === 'tf') {
                                return {
                                    id,
                                    type: 'tf',
                                    stem,
                                    correctAnswer: parseTfCorrectAnswer(q),
                                    timeLimit: 30,
                                    image,
                                };
                            }
                            if (qType === 'short') {
                                return {
                                    id,
                                    type: 'short',
                                    stem,
                                    correctAnswer: parseShortCorrectAnswer(q),
                                    timeLimit: 30,
                                    image,
                                };
                            }
                            // mcq4
                            const rawOpts = Array.isArray(q['options'])
                                ? q['options']
                                : ['A', 'B', 'C', 'D'];
                            const options = rawOpts.map((o, oIdx) => parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`));
                            const cAns = parseCorrectAnswer(q, options.length);
                            return {
                                id,
                                type: 'mcq4',
                                stem,
                                options,
                                correctAnswer: cAns,
                                timeLimit: 30,
                                image,
                            };
                        });
                    }
                }
                if (swissQuestions.length === 0) {
                    swissQuestions = [
                        {
                            id: 'q1',
                            type: 'mcq4',
                            stem: 'Thủ đô của nước Việt Nam là gì?',
                            options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
                            correctAnswer: 0,
                            timeLimit: 30,
                        },
                        {
                            id: 'q2',
                            type: 'tf',
                            stem: 'Mặt trời mọc ở hướng Đông.',
                            correctAnswer: true,
                            timeLimit: 30,
                        },
                    ];
                }
                await onStartActivity('swiss-duel', {
                    title: swissTitle.trim() || 'Đấu Cờ Thụy Sỹ',
                    mode: swissMode,
                    timeLimitMinutes: Number(swissTimeLimitMinutes) || 10,
                    questions: swissQuestions,
                    pointsWin: 2,
                    pointsDraw: 1,
                    pointsLoss: 0,
                    timeLimitPerQuestion: Number(swissTimeLimitPerQuestion) || 30,
                    shuffleQuestions: swissShuffleQuestions,
                    shuffleOptions: swissShuffleOptions,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đấu Cờ Thụy Sỹ');
            }
        }
        else if (selectedActivity.id === 'assignment-hub') {
            try {
                await onStartActivity('assignment-hub', {
                    title: assignmentTitle.trim() || 'Thu - phát bài tập',
                    instructions: assignmentInstructions.trim(),
                    targetDirectory: assignmentTargetDir.trim(),
                    materials: [],
                    allowedExtensions: assignmentAllowedExts,
                    maxFileSizeMb: Number(assignmentMaxFileSizeMb) || 50,
                    allowResubmit: assignmentAllowResubmit,
                    deadlineMinutes: assignmentDeadlineMinutes ? Number(assignmentDeadlineMinutes) : null,
                });
                // Nếu giáo viên có đính kèm tài liệu phát xuống trước: tự động tải lên và phát ngay
                if (assignmentInitialFiles.length > 0) {
                    for (const file of assignmentInitialFiles) {
                        try {
                            const base64Data = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });
                            const res = await fetch('/api/sessions/active/activities/current/assignment/materials', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: file.name,
                                    size: file.size,
                                    mime: file.type || 'application/octet-stream',
                                    base64: base64Data,
                                }),
                            });
                            if (res.ok) {
                                const material = await res.json();
                                onSendTeacherIntent({
                                    type: 'add_material',
                                    material,
                                });
                            }
                        }
                        catch (fileErr) {
                            console.error('Lỗi khi tải file tài liệu đính kèm ban đầu:', fileErr);
                        }
                    }
                }
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Thu - phát bài tập');
            }
        }
        else if (selectedActivity.id === 'territory-war') {
            try {
                let territoryQuestions = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    const rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    const validRawList = rawList.filter((qItem) => {
                        const q = qItem;
                        const qType = String(q['type'] || 'mcq4');
                        // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với cướp đất
                        return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
                    });
                    if (validRawList.length > 0) {
                        territoryQuestions = validRawList.map((qItem, idx) => {
                            const q = qItem;
                            const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                            const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                            const qType = String(q['type'] || 'mcq4');
                            const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                            if (qType === 'short') {
                                return {
                                    id,
                                    stem,
                                    type: 'short',
                                    correctAnswer: parseShortCorrectAnswer(q),
                                    image,
                                    timeLimit: 30,
                                };
                            }
                            if (qType === 'tf') {
                                return {
                                    id,
                                    stem,
                                    type: 'tf',
                                    options: ['Đúng', 'Sai'],
                                    correctAnswer: parseTfCorrectAnswer(q),
                                    image,
                                    timeLimit: 30,
                                };
                            }
                            // mcq4
                            const rawOpts = (q['options'] ||
                                q['contentJson']?.options ||
                                []);
                            const options = rawOpts.map((opt, oIdx) => parseOptionText(opt, `Phương án ${oIdx + 1}`));
                            let correctAnswer = options[0];
                            if (typeof q['correct'] === 'number') {
                                correctAnswer = options[q['correct']] || options[0];
                            }
                            else if (typeof q['correctAnswer'] !== 'undefined') {
                                correctAnswer = q['correctAnswer'];
                            }
                            return {
                                id,
                                stem,
                                type: 'mcq4',
                                options,
                                correctAnswer,
                                image,
                                timeLimit: 30,
                            };
                        });
                    }
                }
                if (territoryQuestions.length === 0) {
                    territoryQuestions = [
                        {
                            id: 'tw_sample_1',
                            stem: 'Thủ đô của Việt Nam là thành phố nào?',
                            type: 'mcq4',
                            options: ['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh', 'Huế'],
                            correctAnswer: 'Hà Nội',
                            timeLimit: 30,
                        },
                        {
                            id: 'tw_sample_2',
                            stem: '2 + 2 x 2 bằng bao nhiêu?',
                            type: 'mcq4',
                            options: ['6', '8', '4', '10'],
                            correctAnswer: '6',
                            timeLimit: 30,
                        },
                        {
                            id: 'tw_sample_3',
                            stem: 'Mặt trời mọc ở hướng Đông, lặn ở hướng Tây.',
                            type: 'tf',
                            correctAnswer: true,
                            timeLimit: 30,
                        },
                    ];
                }
                // Tự động phân chia quân đội vào 2 phe Xanh - Đỏ
                const initialParticipants = prepareTerritoryParticipants(participants, students, territoryBalanceMode);
                await onStartActivity('territory-war', {
                    title: territoryTitle.trim() || 'Đại Chiến Lãnh Thổ',
                    mapSize: territoryMapSize,
                    timeLimitMinutes: Number(territoryTimeLimitMinutes) || 5,
                    enableSuddenDeath: territoryEnableSuddenDeath,
                    shuffleQuestions: true,
                    shuffleAnswers: true,
                    allowLoopQuestions: true,
                    questions: territoryQuestions,
                    initialParticipants,
                    pointsPlain: 1,
                    pointsWatchtower: 5,
                    pointsSmallCastle: 10,
                    pointsBigCastle: 20,
                    pointsReinforce: 1,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Lãnh Thổ');
            }
        }
        else if (selectedActivity.id === 'project-grading') {
            try {
                let groupsToUse = projectGradingGroups;
                if (groupsToUse.length === 0) {
                    const parts = participants || [];
                    const count = Math.max(2, Math.min(4, parts.length || 4));
                    groupsToUse = Array.from({ length: count }, (_, i) => ({
                        id: `group_${i + 1}`,
                        name: `Nhóm ${i + 1}`,
                        leaderParticipantId: parts[i]?.id ?? null,
                        leaderDisplayName: parts[i]?.displayName ?? null,
                        memberParticipantIds: parts.filter((_, idx) => idx % count === i).map(p => p.id),
                    }));
                }
                await onStartActivity('project-grading', {
                    title: projectGradingTitle.trim() || 'Chấm điểm Dự án',
                    maxScore: Number(projectGradingMaxScore) || 10,
                    stepScore: 0.1,
                    weights: {
                        self: Number(projectGradingWeightSelf) || 10,
                        teamMember: Number(projectGradingWeightMember) || 20,
                        crossTeam: Number(projectGradingWeightCross) || 20,
                        teacher: Number(projectGradingWeightTeacher) || 50,
                    },
                    groups: groupsToUse,
                    allowFeedbackComment: true,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Chấm điểm Dự án');
            }
        }
        else if (selectedActivity.id === 'interactive-board') {
            try {
                let worksheetConfig = undefined;
                if (boardWorksheetEnabled && boardQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(boardQuestionSetId);
                    const rawQuestions = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    const targetSet = questionSets.find(s => s.id === boardQuestionSetId);
                    worksheetConfig = {
                        enabled: true,
                        questionSetId: boardQuestionSetId,
                        questionSetTitle: targetSet?.title || 'Phiếu bài tập',
                        questions: rawQuestions,
                    };
                }
                await onStartActivity('interactive-board', {
                    title: boardTitle.trim() || 'Bảng Tương Tác Lớp Học',
                    prompt: boardPrompt.trim() || 'Chia sẻ suy nghĩ và sản phẩm học tập của em',
                    maxGrade: Number(boardMaxGrade) || 10,
                    allowDraw: boardAllowDraw,
                    allowImage: boardAllowImage,
                    allowComments: boardAllowComments,
                    allowReactions: boardAllowReactions,
                    allowPeerGrades: boardAllowPeerGrades,
                    requireApproval: boardRequireApproval,
                    worksheet: worksheetConfig,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Bảng Tương Tác');
            }
        }
        else if (selectedActivity.id === 'circuit-race') {
            try {
                let circuitQuestions = [];
                if (selectedQuestionSetId && onLoadQuestionSet) {
                    const loaded = await onLoadQuestionSet(selectedQuestionSetId);
                    const rawList = Array.isArray(loaded)
                        ? loaded
                        : loaded?.questions || [];
                    if (rawList.length > 0) {
                        circuitQuestions = rawList.map((qItem, idx) => {
                            const q = qItem;
                            const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                            const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                            const qType = String(q['type'] || 'mcq4');
                            const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                            if (qType === 'short') {
                                return {
                                    id,
                                    stem,
                                    type: 'short',
                                    correctAnswer: parseShortCorrectAnswer(q),
                                    image,
                                    timeLimit: circuitTimePerQuestion,
                                };
                            }
                            if (qType === 'tf') {
                                return {
                                    id,
                                    stem,
                                    type: 'tf',
                                    correctAnswer: parseTfCorrectAnswer(q),
                                    image,
                                    timeLimit: circuitTimePerQuestion,
                                };
                            }
                            if (qType === 'tf_group') {
                                const rawItems = (q['items'] ||
                                    q['contentJson']?.items ||
                                    []);
                                const items = rawItems.map((it) => {
                                    const itRec = it;
                                    return {
                                        text: String(itRec['text'] || ''),
                                        correct: Boolean(itRec['correct']),
                                    };
                                });
                                return {
                                    id,
                                    stem,
                                    type: 'tf_group',
                                    items,
                                    image,
                                    timeLimit: circuitTimePerQuestion,
                                };
                            }
                            // mcq4
                            const rawOpts = (q['options'] ||
                                q['contentJson']?.options ||
                                []);
                            const options = rawOpts.map((opt, oIdx) => parseOptionText(opt, `Phương án ${oIdx + 1}`));
                            const correctIdx = Number(q['correct'] ?? q['answerJson']?.correct ?? 0);
                            return {
                                id,
                                stem,
                                type: 'mcq4',
                                options: options.length > 0 ? options : ['A', 'B', 'C', 'D'],
                                correctAnswer: correctIdx,
                                image,
                                timeLimit: circuitTimePerQuestion,
                            };
                        });
                    }
                }
                if (circuitQuestions.length === 0) {
                    circuitQuestions = [
                        {
                            id: 'q1',
                            type: 'mcq4',
                            stem: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?',
                            options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
                            correctAnswer: 0,
                            timeLimit: circuitTimePerQuestion,
                        },
                        {
                            id: 'q2',
                            type: 'tf',
                            stem: 'Mặt trời mọc ở hướng Đông và lặn ở hướng Tây.',
                            correctAnswer: true,
                            timeLimit: circuitTimePerQuestion,
                        },
                        {
                            id: 'q3',
                            type: 'tf_group',
                            stem: 'Xét tính đúng / sai của các khẳng định sau về tự nhiên:',
                            items: [
                                { text: 'Nước sôi ở 100°C ở điều kiện áp suất tiêu chuẩn.', correct: true },
                                { text: 'Âm thanh truyền nhanh nhất trong môi trường chân không.', correct: false },
                                { text: 'Cây xanh quang hợp giải phóng khí oxy.', correct: true },
                                { text: 'Trái Đất là hành tinh lớn nhất trong Hệ Mặt Trời.', correct: false },
                            ],
                            timeLimit: circuitTimePerQuestion,
                        },
                        {
                            id: 'q4',
                            type: 'short',
                            stem: 'Số nguyên tố chẵn duy nhất là số mấy?',
                            correctAnswer: ['2', 'hai'],
                            timeLimit: circuitTimePerQuestion,
                        },
                    ];
                }
                await onStartActivity('circuit-race', {
                    title: circuitTitle.trim() || 'Đường Đua Tri Thức',
                    trackLength: circuitTrackLength,
                    timePerQuestion: circuitTimePerQuestion,
                    actionWindowSeconds: circuitActionWindowSeconds,
                    shuffleQuestions: circuitShuffleQuestions,
                    shuffleOptions: circuitShuffleOptions,
                    independentStudentQuestionOrder: circuitIndependentOrder,
                    questions: circuitQuestions,
                });
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đường Đua Tri Thức');
            }
        }
        else {
            // Các hoạt động khác mặc định config rỗng
            try {
                await onStartActivity(selectedActivity.id, {});
                handleCloseConfig();
            }
            catch (err) {
                setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
            }
        }
    };
    // Trạng thái đang tải
    if (isLoading) {
        return (_jsxs("div", { className: "py-16 text-center text-gray-500", "data-testid": "activity-panel-loading", children: [_jsx("div", { className: "animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" }), _jsx("p", { className: "font-medium", children: "\u0110ang t\u1EA3i th\u00F4ng tin ho\u1EA1t \u0111\u1ED9ng..." })] }));
    }
    // 1. Lấy Teacher Panel tương ứng nếu đang có hoạt động chạy
    const PanelComponent = activeRun
        ? teacherPanelRegistry[activeRun.activityId]
        : undefined;
    return (_jsxs(_Fragment, { children: [activeRun ? (_jsxs("div", { className: "space-y-4", "data-testid": "activity-panel-running", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0", children: "\uD83E\uDE9F" }), _jsxs("div", { children: [_jsxs("div", { className: "font-extrabold text-slate-800 text-sm flex items-center gap-2", children: [_jsx("span", { children: "Ho\u1EA1t \u0111\u1ED9ng \u0111ang di\u1EC5n ra trong c\u1EEDa s\u1ED5 tr\u00ECnh chi\u1EBFu ri\u00EAng bi\u1EC7t" }), _jsx("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700", children: "2 M\u00E0n h\u00ECnh" })] }), _jsx("div", { className: "text-xs text-slate-500", children: "B\u1EA1n c\u00F3 th\u1EC3 k\u00E9o c\u1EEDa s\u1ED5 tr\u00ECnh chi\u1EBFu sang m\u00E1y chi\u1EBFu/m\u00E0n h\u00ECnh ph\u1EE5 (nh\u1EA5n F11 \u0111\u1EC3 chi\u1EBFu to\u00E0n m\u00E0n h\u00ECnh)." })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [['exam', 'quiz-live', 'swiss-duel'].includes(activeRun.activityId) &&
                                        !activeRuns.some(r => r.activityId === 'assignment-hub') && (_jsxs("button", { type: "button", onClick: () => {
                                            const assMeta = activities.find(a => a.id === 'assignment-hub') || {
                                                id: 'assignment-hub',
                                                name: 'Thu - phát bài tập',
                                                version: 1,
                                                icon: '📁',
                                                capabilities: [],
                                                rewardTriggers: ['submit'],
                                            };
                                            handleOpenConfig(assMeta);
                                        }, style: {
                                            backgroundColor: '#059669',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '8px 16px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            minHeight: '44px',
                                        }, className: "transition hover:bg-emerald-700 shadow-xs", title: "M\u1EDF th\u00EAm C\u1ED5ng Thu - ph\u00E1t b\u00E0i t\u1EADp ch\u1EA1y song song c\u00F9ng ho\u1EA1t \u0111\u1ED9ng hi\u1EC7n t\u1EA1i", children: [_jsx("span", { children: "\uD83D\uDCC1" }), _jsx("span", { children: "M\u1EDF th\u00EAm Thu - ph\u00E1t b\u00E0i (Song song)" })] })), activeRun.activityId === 'assignment-hub' &&
                                        !activeRuns.some(r => r.activityId === 'exam') && (_jsxs("button", { type: "button", onClick: () => {
                                            const examMeta = activities.find(a => a.id === 'exam') || {
                                                id: 'exam',
                                                name: 'Kỳ thi trắc nghiệm',
                                                version: 1,
                                                icon: '📝',
                                                capabilities: ['chat-lock'],
                                                rewardTriggers: ['finish', 'high_score'],
                                            };
                                            handleOpenConfig(examMeta);
                                        }, style: {
                                            backgroundColor: '#2563EB',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '8px 16px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            minHeight: '44px',
                                        }, className: "transition hover:bg-blue-700 shadow-xs", title: "Kh\u1EDFi ch\u1EA1y th\u00EAm K\u00EC thi tr\u1EAFc nghi\u1EC7m song song c\u00F9ng C\u1ED5ng thu b\u00E0i", children: [_jsx("span", { children: "\uD83D\uDCDD" }), _jsx("span", { children: "Kh\u1EDFi ch\u1EA1y th\u00EAm K\u00EC thi (Song song)" })] })), onOpenActivityWindow && (_jsx("button", { type: "button", onClick: onOpenActivityWindow, style: {
                                            backgroundColor: '#FFFFFF',
                                            color: '#1D4ED8',
                                            border: '2px solid #93C5FD',
                                            borderRadius: '12px',
                                            padding: '8px 16px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            minHeight: '44px',
                                        }, className: "transition hover:bg-blue-50 shadow-xs", title: "M\u1EDF l\u1EA1i c\u1EEDa s\u1ED5 tr\u00ECnh chi\u1EBFu n\u1EBFu b\u1EA1n \u0111\u00E3 l\u1EE1 t\u1EAFt", children: _jsx("span", { children: "\uD83E\uDE9F M\u1EDF c\u1EEDa s\u1ED5 tr\u00ECnh chi\u1EBFu (M\u00E0n h\u00ECnh 2)" }) })), _jsx("button", { type: "button", onClick: () => onEndActivity(activeRun.runId), style: {
                                            backgroundColor: '#DC2626',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '8px 16px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            minHeight: '44px',
                                        }, className: "transition hover:bg-red-700 shadow-xs", children: _jsx("span", { children: "\u23F9\uFE0F K\u1EBFt th\u00FAc ho\u1EA1t \u0111\u1ED9ng n\u00E0y" }) })] })] }), activeRuns && activeRuns.length > 1 && (_jsxs("div", { className: "flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto shadow-2xs", children: [_jsx("div", { className: "text-xs font-extrabold text-slate-500 uppercase px-2 shrink-0", children: "Ho\u1EA1t \u0111\u1ED9ng song song:" }), activeRuns.map(r => {
                                const isSelected = r.runId === activeRun.runId;
                                const meta = activities.find(a => a.id === r.activityId);
                                const icon = meta?.icon ||
                                    (r.activityId === 'exam'
                                        ? '📝'
                                        : r.activityId === 'assignment-hub'
                                            ? '📁'
                                            : '⚡');
                                const name = meta?.name || r.activityId;
                                return (_jsxs("button", { type: "button", onClick: () => onSelectActiveRun?.(r.runId), className: `flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs transition shrink-0 cursor-pointer ${isSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'}`, children: [_jsx("span", { children: icon }), _jsx("span", { children: name }), _jsx("span", { className: `w-2 h-2 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'} animate-pulse` })] }, r.runId));
                            })] })), PanelComponent ? (_jsx(ErrorBoundary, { fallback: error => (_jsxs("div", { className: "p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4 shadow-sm max-w-xl mx-auto my-6", children: [_jsx("div", { className: "text-4xl", children: "\u26A0\uFE0F" }), _jsxs("h3", { className: "text-lg font-bold text-slate-800", children: ["Kh\u00F4ng th\u1EC3 hi\u1EC3n th\u1ECB b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n ho\u1EA1t \u0111\u1ED9ng: ", activeRun.activityId] }), _jsx("p", { className: "text-xs text-rose-600 bg-rose-50 p-3 rounded-lg font-mono text-left max-h-24 overflow-y-auto", children: error?.message || String(error) }), _jsxs("div", { className: "flex justify-center gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => window.location.reload(), className: "min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition cursor-pointer", children: "\uD83D\uDD04 T\u1EA3i l\u1EA1i trang" }), _jsx("button", { type: "button", onClick: () => onEndActivity(activeRun.runId), className: "min-h-[44px] px-5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition cursor-pointer", children: "\u23F9\uFE0F K\u1EBFt th\u00FAc ho\u1EA1t \u0111\u1ED9ng" })] })] })), children: _jsx(PanelComponent, { runId: activeRun.runId, state: activeRun.state, onSendIntent: onSendTeacherIntent, onEndActivity: () => onEndActivity(activeRun.runId) }) })) : (_jsxs("div", { className: "p-6 bg-white rounded-xl border border-gray-200 text-center space-y-3", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800", children: ["\u0110ang ch\u1EA1y ho\u1EA1t \u0111\u1ED9ng: ", activeRun.activityId] }), _jsx("p", { className: "text-sm text-gray-500", children: "Ho\u1EA1t \u0111\u1ED9ng n\u00E0y ch\u01B0a c\u00F3 b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n t\u00F9y bi\u1EBFn tr\u00EAn giao di\u1EC7n n\u00E0y." }), _jsx("button", { type: "button", onClick: () => onEndActivity(activeRun.runId), className: "min-h-[48px] px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700", children: "\u23F9\uFE0F K\u1EBFt th\u00FAc ho\u1EA1t \u0111\u1ED9ng" })] }))] })) : (_jsxs("div", { className: "space-y-6", "data-testid": "activity-panel-lobby", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-800", children: "Ho\u1EA1t \u0111\u1ED9ng & Tr\u00F2 ch\u01A1i t\u01B0\u01A1ng t\u00E1c" }), _jsx("p", { className: "text-sm text-gray-500", children: "Ch\u1ECDn m\u1ED9t ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u t\u01B0\u01A1ng t\u00E1c th\u1EDDi gian th\u1EF1c v\u1EDBi h\u1ECDc sinh trong l\u1EDBp." })] }), activities.length === 0 ? (_jsxs("div", { className: "py-12 text-center border-2 border-dashed border-gray-200 rounded-xl", children: [_jsx("span", { className: "text-4xl block mb-2", children: "\uD83D\uDCE6" }), _jsx("p", { className: "text-gray-500 font-medium", children: "Ch\u01B0a c\u00F3 ho\u1EA1t \u0111\u1ED9ng n\u00E0o \u0111\u01B0\u1EE3c c\u00E0i \u0111\u1EB7t." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: activities
                            .filter(act => act.id !== 'swiss-duel' &&
                            act.id !== 'territory-war' &&
                            act.id !== 'arcade-duel' &&
                            act.id !== 'exam')
                            .map(act => {
                            const isQuizLive = act.id === 'quiz-live';
                            const displayName = act.name === 'Quiz Live' ? 'Quizz Live' : act.name;
                            const displayIcon = isQuizLive ? '⚡🎮' : act.icon;
                            const displayDescription = isQuizLive
                                ? 'Bộ 5 chế độ trắc nghiệm đỉnh cao: Kahoot nhịp GV, Quizizz tự do, Đấu Cờ Thụy Sỹ, Đại Chiến Lãnh Thổ và Đối Kháng 1vs1.'
                                : act.description;
                            return (_jsxs("div", { "data-testid": `activity-card-${act.id}`, className: "p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-3xl", children: displayIcon }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-lg font-bold text-gray-800", children: displayName }), isQuizLive && (_jsx("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xs", children: "4 CH\u1EBE \u0110\u1ED8" }))] }), _jsxs("span", { className: "text-xs text-gray-400", children: ["Phi\u00EAn b\u1EA3n v", act.version] })] })] }), displayDescription && (_jsx("p", { className: "text-sm text-gray-600 line-clamp-2", children: displayDescription })), isQuizLive && (_jsxs("div", { className: "pt-1 flex flex-wrap gap-1", children: [_jsx("span", { className: "px-1.5 py-0.5 rounded text-[11px] bg-red-50 text-red-700 border border-red-200 font-semibold", children: "\uD83D\uDD34\u25B2 Kahoot" }), _jsx("span", { className: "px-1.5 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200 font-semibold", children: "\u26A1 Quizizz" }), _jsx("span", { className: "px-1.5 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold", children: "\u265F\uFE0F \u0110\u1EA5u C\u1EDD Th\u1EE5y S\u1EF9" }), _jsx("span", { className: "px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold", children: "\u2694\uFE0F \u0110\u1EA1i Chi\u1EBFn L\u00E3nh Th\u1ED5" })] })), !isQuizLive && act.rewardTriggers.length > 0 && (_jsx("div", { className: "pt-1 flex flex-wrap gap-1", children: act.rewardTriggers.map((t, idx) => (_jsxs("span", { className: "px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 border border-amber-200", children: ["\u2B50 ", t] }, idx))) }))] }), _jsx("div", { className: "pt-4 mt-2 border-t border-gray-100 flex justify-end", children: _jsx("button", { type: "button", "data-testid": `btn-start-${act.id}`, onClick: () => handleOpenConfig(act), className: "min-h-[48px] px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 cursor-pointer", children: "\uD83D\uDE80 B\u1EAFt \u0111\u1EA7u" }) })] }, act.id));
                        }) }))] })), isConfigModalOpen && selectedActivity && (_jsx("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col p-6 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between border-b pb-3 shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: selectedActivity.icon }), _jsxs("h3", { className: "text-lg font-bold text-gray-800", children: ["C\u1EA5u h\u00ECnh: ", selectedActivity.name] })] }), _jsx("button", { type: "button", onClick: handleCloseConfig, className: "text-gray-400 hover:text-gray-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer", children: "\u00D7" })] }), errorMsg && (_jsx("div", { className: "p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 shrink-0 my-2", children: errorMsg })), _jsxs("form", { onSubmit: handleSubmitStart, className: "flex-1 overflow-y-auto space-y-4 pr-1.5 my-1", children: [selectedActivity.id === 'quick-poll' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["C\u00E2u h\u1ECFi b\u00ECnh ch\u1ECDn ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: pollQuestion, onChange: e => setPollQuestion(e.target.value), "data-testid": "input-poll-question", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["C\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (m\u1ED7i d\u00F2ng m\u1ED9t ph\u01B0\u01A1ng \u00E1n)", ' ', _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { rows: 4, required: true, value: pollOptions, onChange: e => setPollOptions(e.target.value), "data-testid": "textarea-poll-options", className: "w-full p-3 border rounded-lg text-sm" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: pollAllowMultiple, onChange: e => setPollAllowMultiple(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), "Cho ph\u00E9p ch\u1ECDn nhi\u1EC1u ph\u01B0\u01A1ng \u00E1n"] })] })) : selectedActivity.id === 'quiz-live' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-2", children: ["1. Ch\u1ECDn Ch\u1EBF \u0111\u1ED9 Thi \u0111\u1EA5u ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: [_jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'kahoot'
                                                                ? 'border-red-500 bg-red-50/60 text-red-900 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "kahoot", checked: quizMode === 'kahoot', onChange: () => {
                                                                        setQuizMode('kahoot');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(found.title);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-red-600 text-red-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\uD83D\uDD34\u25B2" }), _jsx("p", { className: "font-bold text-sm text-gray-900", children: "Kahoot Live" })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "Nh\u1ECBp theo GV, chi\u1EBFu m\u00E0n h\u00ECnh chung, \u0111ua top t\u1EEBng c\u00E2u" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'quizizz'
                                                                ? 'border-purple-500 bg-purple-50/60 text-purple-900 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "quizizz", checked: quizMode === 'quizizz', onChange: () => {
                                                                        setQuizMode('quizizz');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(found.title);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-purple-600 text-purple-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\u26A1\uD83C\uDFAF" }), _jsx("p", { className: "font-bold text-sm text-gray-900", children: "Quizizz T\u1EF1 do" })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "T\u1ED1c \u0111\u1ED9 c\u00E1 nh\u00E2n, b\u1EA3ng leo rank tr\u1EF1c ti\u1EBFp, c\u00E2u h\u1ECFi tr\u00EAn m\u00E1y HS" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'swiss-duel'
                                                                ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "swiss-duel", checked: quizMode === 'swiss-duel', onChange: () => {
                                                                        setQuizMode('swiss-duel');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(`Đấu Cờ: ${found.title}`);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-amber-600 text-amber-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\u265F\uFE0F\u2694\uFE0F" }), _jsx("p", { className: "font-bold text-sm text-gray-900", children: "\u0110\u1EA5u C\u1EDD Th\u1EE5y S\u1EF9" })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "\u0110\u1ED1i kh\u00E1ng 1-1 gh\u00E9p c\u1EB7p h\u1EC7 Th\u1EE5y S\u1EF9, \u0103n c\u1EDD khi tr\u1EA3 l\u1EDDi \u0111\u00FAng" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'territory-war'
                                                                ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "territory-war", checked: quizMode === 'territory-war', onChange: () => {
                                                                        setQuizMode('territory-war');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-blue-600 text-blue-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\uD83C\uDFF0\uD83D\uDEA9" }), _jsx("p", { className: "font-bold text-sm text-gray-900", children: "\u0110\u1EA1i Chi\u1EBFn L\u00E3nh Th\u1ED5" })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "Chia 2 phe Xanh - \u0110\u1ECF chi\u1EBFn thu\u1EADt, chi\u1EBFm c\u1EE9 \u0111i\u1EC3m b\u1EA3n \u0111\u1ED3" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'arcade-duel'
                                                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "arcade-duel", checked: quizMode === 'arcade-duel', onChange: () => {
                                                                        setQuizMode('arcade-duel');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(`Đối Kháng 1vs1: ${found.title}`);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-indigo-600 text-indigo-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\u2694\uFE0F\uD83E\uDD4A" }), _jsx("p", { className: "font-bold text-sm text-gray-900", children: "\u0110\u1ED1i Kh\u00E1ng 1vs1" })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "\u0110\u1EA5u 1-1 tr\u00EAn m\u00E0n h\u00ECnh GV, b\u00E0n ph\u00EDm chia \u0111\u00F4i, h\u1EC7 th\u1ED1ng v\u1EADt ph\u1EA9m & 2 ch\u1EBF \u0111\u1ED9" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'volleyball-tournament'
                                                                ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "volleyball-tournament", checked: quizMode === 'volleyball-tournament', onChange: () => {
                                                                        setQuizMode('volleyball-tournament');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(`Bóng Chuyền: ${found.title}`);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-emerald-600 text-emerald-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\uD83C\uDFD0\uD83C\uDFC6" }), _jsxs("p", { className: "font-bold text-sm text-gray-900", children: ["\u0110\u1EA5u B\u00F3ng Chuy\u1EC1n", ' ', _jsx("span", { className: "text-emerald-700 font-semibold", children: "(th\u1EED nghi\u1EC7m)" })] })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "Thi \u0111\u1EA5u v\u00F2ng b\u1EA3ng 3 l\u01B0\u1EE3t t\u00EDnh \u0111i\u1EC3m sau \u0111\u00F3 b\u1EAFt c\u1EB7p x\u1EBFp h\u1EA1ng 4 C\u00FAp ph\u00E2n t\u1EA7ng" })] })] }), _jsxs("label", { className: `p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${quizMode === 'faction-duel'
                                                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-xs'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`, children: [_jsx("input", { type: "radio", name: "quizMode", value: "faction-duel", checked: quizMode === 'faction-duel', onChange: () => {
                                                                        setQuizMode('faction-duel');
                                                                        if (selectedQuestionSetId) {
                                                                            const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                                                                            if (found)
                                                                                setQuizTitle(`Đại Chiến Xanh Đỏ: ${found.title}`);
                                                                        }
                                                                    }, className: "w-4 h-4 mt-0.5 accent-indigo-600 text-indigo-600 shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\u2694\uFE0F\uD83D\uDD35\uD83D\uDD34" }), _jsxs("p", { className: "font-bold text-sm text-gray-900", children: ["\u0110\u1EA1i Chi\u1EBFn Xanh \u0110\u1ECF", ' ', _jsx("span", { className: "text-indigo-700 font-semibold", children: "(th\u1EED nghi\u1EC7m)" })] })] }), _jsx("p", { className: "text-xs text-gray-600 mt-0.5 leading-snug", children: "Chia 2 phe c\u00E2n b\u1EB1ng Elo, l\u01B0\u1EE3t sau phe th\u1EAFng ch\u1ECDn \u0111\u1ED1i th\u1EE7 (15s), t\u00EDnh \u0111i\u1EC3m tr\u1ECDng s\u1ED1 l\u1EADt k\u00E8o" })] })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["2. T\u00EAn ho\u1EA1t \u0111\u1ED9ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: quizTitle, onChange: e => setQuizTitle(e.target.value), "data-testid": "input-quiz-title", placeholder: "V\u00ED d\u1EE5: Th\u1EED th\u00E1ch Tri th\u1EE9c L\u1EDBp h\u1ECDc", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: "3. Ch\u1ECDn b\u1ED9 c\u00E2u h\u1ECFi t\u1EEB Ng\u00E2n h\u00E0ng \u0111\u1EC1 thi" }), _jsxs("select", { value: selectedQuestionSetId, onChange: e => {
                                                        setSelectedQuestionSetId(e.target.value);
                                                        if (e.target.value) {
                                                            const found = questionSets?.find(s => s.id === e.target.value);
                                                            if (found) {
                                                                if (quizMode === 'swiss-duel') {
                                                                    setQuizTitle(`Đấu Cờ: ${found.title}`);
                                                                }
                                                                else if (quizMode === 'territory-war') {
                                                                    setQuizTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                                                                }
                                                                else if (quizMode === 'arcade-duel') {
                                                                    setQuizTitle(`Đối Kháng 1vs1: ${found.title}`);
                                                                }
                                                                else if (quizMode === 'volleyball-tournament') {
                                                                    setQuizTitle(`Bóng Chuyền: ${found.title}`);
                                                                }
                                                                else if (quizMode === 'faction-duel') {
                                                                    setQuizTitle(`Đại Chiến Xanh Đỏ: ${found.title}`);
                                                                }
                                                                else {
                                                                    setQuizTitle(found.title);
                                                                }
                                                            }
                                                        }
                                                    }, className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: "", children: "-- D\u00F9ng b\u1ED9 c\u00E2u h\u1ECFi m\u1EABu m\u1EB7c \u0111\u1ECBnh --" }), questionSets?.map(s => {
                                                            const isMatrix = s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                                                            return (_jsxs("option", { value: s.id, children: [isMatrix ? '🎯 [Ma trận] ' : '', s.title, " (", s.questionCount || 0, " c\u00E2u) - ", s.subject || 'Chung'] }, s.id));
                                                        })] })] }), _jsxs("div", { className: "pt-2 border-t border-gray-100", children: [(quizMode === 'kahoot' || quizMode === 'quizizz') && (_jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700", children: ["4. T\u00F9y ch\u1ECDn ch\u1EBF \u0111\u1ED9 ", quizMode === 'kahoot' ? 'Kahoot' : 'Quizizz'] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: quizShuffleQuestions, onChange: e => setQuizShuffleQuestions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi (m\u1ED7i h\u1ECDc sinh l\u00E0m th\u1EE9 t\u1EF1 kh\u00E1c nhau \u1EDF Quizizz)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: quizShuffleOptions, onChange: e => setQuizShuffleOptions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (A, B, C, D)" })] }), quizMode === 'quizizz' && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: quizEnablePowerUps, onChange: e => setQuizEnablePowerUps(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\u26A1 S\u1EED d\u1EE5ng v\u1EADt ph\u1EA9m h\u1ED7 tr\u1EE3 & t\u1EA5n c\u00F4ng (Power-ups)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: quizShowCorrectAnswer, onChange: e => setQuizShowCorrectAnswer(e.target.checked), className: "w-4 h-4 text-purple-600 rounded" }), _jsx("span", { children: "\uD83D\uDC41\uFE0F Cho ph\u00E9p h\u1ECDc sinh xem \u0111\u00E1p \u00E1n \u0111\u00FAng sau m\u1ED7i c\u00E2u" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: quizAllowReplay, onChange: e => setQuizAllowReplay(e.target.checked), className: "w-4 h-4 text-emerald-600 rounded" }), _jsx("span", { children: "\uD83D\uDD04 Cho ph\u00E9p h\u1ECDc sinh ch\u01A1i l\u1EA1i (l\u00E0m l\u1EA1i th\u00EAm nhi\u1EC1u l\u1EA7n khi ho\u00E0n th\u00E0nh)" })] })] }))] }), _jsx("p", { className: "text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border", children: quizMode === 'kahoot'
                                                                ? '💡 Chế độ Kahoot: Giáo viên điều khiển nhịp từng câu hỏi trên máy tính/màn chiếu. Học sinh nhìn màn chiếu để chọn 1 trong 4 màu tương ứng trên điện thoại.'
                                                                : '💡 Chế độ Quizizz: Học sinh tự đọc câu hỏi và làm bài trên điện thoại theo tốc độ riêng. Màn chiếu lớn tự động hiển thị bảng xếp hạng leo rank trực tiếp.' })] })), quizMode === 'swiss-duel' && (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700", children: "4. C\u00E0i \u0111\u1EB7t \u0110\u1EA5u C\u1EDD Th\u1EE5y S\u1EF9" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("label", { className: `p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'questions' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "swissMode", checked: swissMode === 'questions', onChange: () => setSwissMode('questions'), className: "accent-amber-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\u265F\uFE0F Theo kho c\u00E2u h\u1ECFi" }), _jsx("span", { className: "block text-[11px] text-gray-500 font-normal", children: "Thi h\u1EBFt c\u00E2u h\u1ECFi trong \u0111\u1EC1 th\u00EC d\u1EEBng" })] })] }), _jsxs("label", { className: `p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'time' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "swissMode", checked: swissMode === 'time', onChange: () => setSwissMode('time'), className: "accent-amber-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\u23F1\uFE0F Gi\u1EDBi h\u1EA1n th\u1EDDi gian" }), _jsxs("span", { className: "block text-[11px] text-gray-500 font-normal", children: ["\u0110\u1EBFm ng\u01B0\u1EE3c ", swissTimeLimitMinutes, " ph\u00FAt"] })] })] })] }), swissMode === 'time' && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi l\u01B0\u1EE3ng tr\u1EADn \u0111\u1EA5u (ph\u00FAt)" }), _jsxs("select", { value: swissTimeLimitMinutes, onChange: e => setSwissTimeLimitMinutes(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 5, children: "5 ph\u00FAt (Nhanh)" }), _jsx("option", { value: 10, children: "10 ph\u00FAt (Chu\u1EA9n)" }), _jsx("option", { value: 15, children: "15 ph\u00FAt" }), _jsx("option", { value: 20, children: "20 ph\u00FAt" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi gian suy ngh\u0129 m\u1ED7i c\u00E2u h\u1ECFi" }), _jsxs("select", { value: swissTimeLimitPerQuestion, onChange: e => setSwissTimeLimitPerQuestion(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 15, children: "15 gi\u00E2y" }), _jsx("option", { value: 20, children: "20 gi\u00E2y" }), _jsx("option", { value: 30, children: "30 gi\u00E2y (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: 45, children: "45 gi\u00E2y" }), _jsx("option", { value: 60, children: "60 gi\u00E2y" })] })] }), _jsxs("div", { className: "space-y-2 pt-2 border-t border-amber-200/60", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: swissShuffleQuestions, onChange: e => setSwissShuffleQuestions(e.target.checked), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: swissShuffleOptions, onChange: e => setSwissShuffleOptions(e.target.checked), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (A, B, C, D)" })] })] }), _jsx("p", { className: "text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200", children: "\uD83D\uDCA1 H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng gh\u00E9p c\u1EB7p h\u1ECDc sinh 1-1 theo h\u1EC7 Th\u1EE5y S\u1EF9. Tr\u1EA3 l\u1EDDi \u0111\u00FAng s\u1EBD \u0103n c\u1EDD \u0111\u1ED1i th\u1EE7, t\u00EDch \u0111i\u1EC3m x\u1EBFp h\u1EA1ng to\u00E0n l\u1EDBp!" })] })), quizMode === 'territory-war' && (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700", children: "4. C\u00E0i \u0111\u1EB7t \u0110\u1EA1i Chi\u1EBFn L\u00E3nh Th\u1ED5" }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "K\u00EDch th\u01B0\u1EDBc b\u1EA3n \u0111\u1ED3 chi\u1EBFn l\u01B0\u1EE3c" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('5x5'), className: `p-2.5 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '5x5'
                                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-sm font-bold", children: "5x5" }), _jsx("span", { className: "text-[10px] text-gray-500 block", children: "25 \u00F4 (Nhanh)" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('7x7'), className: `p-2.5 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '7x7'
                                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-sm font-bold", children: "7x7 \u2B50" }), _jsx("span", { className: "text-[10px] text-gray-500 block", children: "49 \u00F4 (C\u00E2n b\u1EB1ng)" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('9x9'), className: `p-2.5 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '9x9'
                                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-sm font-bold", children: "9x9" }), _jsx("span", { className: "text-[10px] text-gray-500 block", children: "81 \u00F4 (L\u1EDBn)" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi l\u01B0\u1EE3ng tr\u1EADn \u0111\u1EA5u (ph\u00FAt)" }), _jsxs("select", { value: territoryTimeLimitMinutes, onChange: e => setTerritoryTimeLimitMinutes(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 3, children: "3 ph\u00FAt" }), _jsx("option", { value: 5, children: "5 ph\u00FAt (Chu\u1EA9n)" }), _jsx("option", { value: 7, children: "7 ph\u00FAt" }), _jsx("option", { value: 10, children: "10 ph\u00FAt" }), _jsx("option", { value: 15, children: "15 ph\u00FAt" })] })] }), _jsx("div", { className: "flex items-end pb-1", children: _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: territoryEnableSuddenDeath, onChange: e => setTerritoryEnableSuddenDeath(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\u26A1 B\u1EADt Sudden Death" })] }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Ph\u01B0\u01A1ng th\u1EE9c ph\u00E2n chia qu\u00E2n \u0111\u1ED9i 2 phe" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('elo'), className: `p-2 rounded-xl border text-center transition cursor-pointer ${territoryBalanceMode === 'elo'
                                                                                ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-sm'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-xs font-bold", children: "\u2696\uFE0F C\u00E2n b\u1EB1ng Elo" }), _jsx("span", { className: "text-[10px] text-amber-700 block", children: "(Khuy\u00EAn d\u00F9ng)" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('random'), className: `p-2 rounded-xl border text-center transition cursor-pointer ${territoryBalanceMode === 'random'
                                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-sm'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-xs font-bold", children: "\uD83C\uDFB2 Ng\u1EABu nhi\u00EAn" }), _jsx("span", { className: "text-[10px] text-gray-500 block", children: "50/50" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('groups'), className: `p-2 rounded-xl border text-center transition cursor-pointer ${territoryBalanceMode === 'groups'
                                                                                ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-sm'
                                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-xs font-bold", children: "\uD83D\uDC65 Theo t\u1ED5/nh\u00F3m" }), _jsx("span", { className: "text-[10px] text-purple-700 block", children: "C\u00F3 s\u1EB5n" })] })] })] }), _jsx("p", { className: "text-xs text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200", children: "\uD83D\uDCA1 H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng chia h\u1ECDc sinh / nh\u00F3m v\u00E0o 2 phe Xanh v\u00E0 \u0110\u1ECF. Tr\u1EA3 l\u1EDDi \u0111\u00FAng \u0111\u1EC3 chi\u1EBFm c\u1EE9 \u0111i\u1EC3m b\u1EA3n \u0111\u1ED3!" })] })), quizMode === 'arcade-duel' && (_jsxs("div", { className: "space-y-4", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700", children: "4. C\u00E0i \u0111\u1EB7t \u0110\u1ED1i Kh\u00E1ng 1vs1" }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1.5", children: "Ch\u1EBF \u0111\u1ED9 thi \u0111\u1EA5u" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: [_jsxs("label", { className: `p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${arcadeDuelMode === 'sync_turn'
                                                                                ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900 shadow-xs'
                                                                                : 'hover:bg-gray-50 border-gray-200'}`, children: [_jsx("input", { type: "radio", name: "arcadeDuelMode", checked: arcadeDuelMode === 'sync_turn', onChange: () => setArcadeDuelMode('sync_turn'), className: "mt-0.5 accent-indigo-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\uD83C\uDFAF C\u00F9ng tr\u1EA3 l\u1EDDi (Chia 3)" }), _jsx("span", { className: "block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug", children: "Tr\u00EAn l\u00E0 c\u00E2u h\u1ECFi chung, d\u01B0\u1EDBi chia 2 b\u00EAn ch\u1ECDn \u0111\u00E1p \u00E1n b\u00ED m\u1EADt & l\u1EADt b\u00E0i c\u00F9ng l\u00FAc" })] })] }), _jsxs("label", { className: `p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${arcadeDuelMode === 'speed_race'
                                                                                ? 'bg-amber-50 border-amber-500 font-bold text-amber-900 shadow-xs'
                                                                                : 'hover:bg-gray-50 border-gray-200'}`, children: [_jsx("input", { type: "radio", name: "arcadeDuelMode", checked: arcadeDuelMode === 'speed_race', onChange: () => setArcadeDuelMode('speed_race'), className: "mt-0.5 accent-amber-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\uD83C\uDFCE\uFE0F \u0110ua t\u1ED1c \u0111\u1ED9 (Chia \u0111\u00F4i 50/50)" }), _jsx("span", { className: "block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug", children: "Ti\u1EBFn \u0111\u1ED9 \u0111\u1ED9c l\u1EADp, ai nhanh v\u00E0 \u0111\u00FAng th\u00EC qua c\u00E2u. Ch\u1ECDn sai b\u1ECB d\u1EEBng 1.5s" })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 items-end", children: [arcadeDuelMode === 'sync_turn' ? (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi gian m\u1ED7i c\u00E2u h\u1ECFi" }), _jsxs("select", { value: arcadeDuelTimeLimitPerQuestion, onChange: e => setArcadeDuelTimeLimitPerQuestion(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 10, children: "10 gi\u00E2y" }), _jsx("option", { value: 15, children: "15 gi\u00E2y (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: 20, children: "20 gi\u00E2y" }), _jsx("option", { value: 30, children: "30 gi\u00E2y" })] })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "T\u1ED5ng th\u1EDDi gian tr\u1EADn \u0111\u1EA5u" }), _jsxs("select", { value: arcadeDuelTotalTimeLimit, onChange: e => setArcadeDuelTotalTimeLimit(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 60, children: "60 gi\u00E2y (1 ph\u00FAt)" }), _jsx("option", { value: 90, children: "90 gi\u00E2y (1.5 ph\u00FAt - M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: 120, children: "120 gi\u00E2y (2 ph\u00FAt)" }), _jsx("option", { value: 180, children: "180 gi\u00E2y (3 ph\u00FAt)" })] })] })), _jsx("div", { className: "pb-2", children: _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: arcadeDuelShuffleOptions, onChange: e => setArcadeDuelShuffleOptions(e.target.checked), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o ph\u01B0\u01A1ng \u00E1n ch\u1ED1ng nh\u00ECn tr\u1ED9m" })] }) })] }), _jsxs("div", { className: "p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-800", children: [_jsx("input", { type: "checkbox", checked: arcadeDuelEnablePowerUps, onChange: e => setArcadeDuelEnablePowerUps(e.target.checked), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("span", { children: "\u26A1 K\u00EDch ho\u1EA1t v\u1EADt ph\u1EA9m h\u1ED7 tr\u1EE3 & t\u1EA5n c\u00F4ng (Power-ups)" })] }), arcadeDuelEnablePowerUps ? (_jsxs("div", { className: "grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "\u0110i\u1EC1u ki\u1EC7n nh\u1EADn v\u1EADt ph\u1EA9m" }), _jsxs("select", { value: arcadeDuelDropCondition, onChange: e => setArcadeDuelDropCondition(Number(e.target.value)), className: "w-full min-h-[40px] px-3 py-1.5 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 1, children: "\u0110\u00FAng 1 c\u00E2u nh\u1EADn ngay" }), _jsx("option", { value: 2, children: "\u0110\u00FAng 2 c\u00E2u li\u00EAn ti\u1EBFp (M\u1EB7c \u0111\u1ECBnh)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "S\u1EE9c ch\u1EE9a t\u00FAi \u0111\u1ED3" }), _jsxs("select", { value: arcadeDuelInventoryCapacity, onChange: e => setArcadeDuelInventoryCapacity(Number(e.target.value)), className: "w-full min-h-[40px] px-3 py-1.5 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 2, children: "T\u1ED1i \u0111a 2 v\u1EADt ph\u1EA9m (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: 3, children: "T\u1ED1i \u0111a 3 v\u1EADt ph\u1EA9m" })] })] })] })) : (_jsx("p", { className: "text-xs text-gray-500 pl-6", children: "Thi \u0111\u1EA5u thu\u1EA7n ki\u1EBFn th\u1EE9c, kh\u00F4ng s\u1EED d\u1EE5ng v\u1EADt ph\u1EA9m v\u00E0 ph\u00EDm ch\u1EE9c n\u0103ng." }))] }), _jsxs("div", { className: "p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-700 text-xs space-y-1.5 font-mono", children: [_jsx("p", { className: "font-bold text-amber-300", children: "\u2328\uFE0F B\u1ED0 TR\u00CD PH\u00CDM B\u00C0N PH\u00CDM GV:" }), _jsxs("p", { children: ["\uD83D\uDD35 ", _jsx("span", { className: "text-blue-300 font-bold", children: "\u0110\u1ED9i Xanh:" }), " \u0110\u00E1p \u00E1n", ' ', _jsx("span", { className: "text-white font-bold bg-slate-800 px-1 rounded", children: "A - S - D - F" }), arcadeDuelEnablePowerUps ? (_jsxs(_Fragment, { children: [' ', "| D\u00F9ng v\u1EADt ph\u1EA9m:", ' ', _jsx("span", { className: "text-amber-300 font-bold bg-slate-800 px-1 rounded", children: "Q" })] })) : null] }), _jsxs("p", { children: ["\uD83D\uDD34 ", _jsx("span", { className: "text-red-300 font-bold", children: "\u0110\u1ED9i \u0110\u1ECF:" }), " \u0110\u00E1p \u00E1n", ' ', _jsx("span", { className: "text-white font-bold bg-slate-800 px-1 rounded", children: "1 - 2 - 3 - 4" }), arcadeDuelEnablePowerUps ? (_jsxs(_Fragment, { children: [' ', "| D\u00F9ng v\u1EADt ph\u1EA9m:", ' ', _jsx("span", { className: "text-amber-300 font-bold bg-slate-800 px-1 rounded", children: "5" })] })) : null] })] })] })), quizMode === 'volleyball-tournament' && (_jsxs("div", { className: "space-y-4", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700", children: "4. C\u00E0i \u0111\u1EB7t \u0110\u1EA5u B\u00F3ng Chuy\u1EC1n (th\u1EED nghi\u1EC7m)" }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1.5", children: "Quy m\u00F4 b\u1EA3ng \u0111\u1EA5u" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5", children: [_jsxs("label", { className: `p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${volleyballPoolMode === 'auto'
                                                                                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                                                                : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "volleyballPoolMode", checked: volleyballPoolMode === 'auto', onChange: () => setVolleyballPoolMode('auto'), className: "accent-emerald-600 mt-0.5" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\u2728 T\u1EF1 \u0111\u1ED9ng" }), _jsx("span", { className: "text-[11px] text-gray-500 leading-tight block mt-0.5", children: "T\u1EF1 chia 4 ho\u1EB7c 8 b\u1EA3ng t\u00F9y s\u0129 s\u1ED1" })] })] }), _jsxs("label", { className: `p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${volleyballPoolMode === '4_pools'
                                                                                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                                                                : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "volleyballPoolMode", checked: volleyballPoolMode === '4_pools', onChange: () => setVolleyballPoolMode('4_pools'), className: "accent-emerald-600 mt-0.5" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "4 B\u1EA3ng (A-D)" }), _jsx("span", { className: "text-[11px] text-gray-500 leading-tight block mt-0.5", children: "Th\u00EDch h\u1EE3p cho 15 - 23 h\u1ECDc sinh" })] })] }), _jsxs("label", { className: `p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${volleyballPoolMode === '8_pools'
                                                                                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                                                                : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "volleyballPoolMode", checked: volleyballPoolMode === '8_pools', onChange: () => setVolleyballPoolMode('8_pools'), className: "accent-emerald-600 mt-0.5" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "8 B\u1EA3ng (A-H)" }), _jsx("span", { className: "text-[11px] text-gray-500 leading-tight block mt-0.5", children: "Th\u00EDch h\u1EE3p cho 24 - 40 h\u1ECDc sinh" })] })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi gian suy ngh\u0129 m\u1ED7i c\u00E2u h\u1ECFi (gi\u00E2y)" }), _jsxs("select", { value: volleyballTimeLimitPerQuestion, onChange: e => setVolleyballTimeLimitPerQuestion(Number(e.target.value)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 15, children: "15 gi\u00E2y (Nhanh)" }), _jsx("option", { value: 20, children: "20 gi\u00E2y" }), _jsx("option", { value: 30, children: "30 gi\u00E2y (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("option", { value: 45, children: "45 gi\u00E2y" }), _jsx("option", { value: 60, children: "60 gi\u00E2y (Nhi\u1EC1u b\u00E0i t\u1EADp t\u00EDnh to\u00E1n)" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-4 pt-1", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: volleyballShuffleQuestions, onChange: e => setVolleyballShuffleQuestions(e.target.checked), className: "w-4 h-4 text-emerald-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi qua c\u00E1c v\u00F2ng" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: volleyballShuffleOptions, onChange: e => setVolleyballShuffleOptions(e.target.checked), className: "w-4 h-4 text-emerald-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o ph\u01B0\u01A1ng \u00E1n A, B, C, D" })] })] })] })), quizMode === 'faction-duel' && (_jsxs("div", { className: "space-y-4", children: [_jsx("label", { className: "block text-sm font-bold text-gray-700", children: "4. C\u00E0i \u0111\u1EB7t \u0110\u1EA1i Chi\u1EBFn Xanh \u0110\u1ECF (th\u1EED nghi\u1EC7m)" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "S\u1ED1 c\u00E2u h\u1ECFi m\u1ED7i tr\u1EADn (1 - 5 c\u00E2u)" }), _jsx("input", { type: "number", min: 1, max: 5, value: factionQuestionsPerMatch, onChange: e => setFactionQuestionsPerMatch(Math.max(1, Math.min(5, Number(e.target.value) || 2))), className: "w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white" }), _jsx("p", { className: "text-[11px] text-gray-500 mt-1", children: "M\u1EB7c \u0111\u1ECBnh: 2 c\u00E2u h\u1ECFi/tr\u1EADn 1v1" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "S\u1ED1 v\u00F2ng \u0111\u1EA5u to\u00E0n tr\u1EADn (1 - 20 v\u00F2ng)" }), _jsx("input", { type: "number", min: 1, max: 20, value: factionTotalRounds, onChange: e => setFactionTotalRounds(Math.max(1, Math.min(20, Number(e.target.value) || 5))), className: "w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white" }), _jsx("p", { className: "text-[11px] text-gray-500 mt-1", children: "M\u1EB7c \u0111\u1ECBnh: 5 v\u00F2ng \u0111\u1EA5u" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi gian l\u00E0m b\u00E0i m\u1ED7i c\u00E2u (gi\u00E2y)" }), _jsx("input", { type: "number", min: 5, max: 120, value: factionTimeLimitPerQuestion, onChange: e => setFactionTimeLimitPerQuestion(Math.max(5, Math.min(120, Number(e.target.value) || 20))), className: "w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-gray-600 mb-1", children: "Th\u1EDDi gian ch\u1ECDn \u0111\u1ED1i th\u1EE7 (gi\u00E2y)" }), _jsx("input", { type: "number", min: 5, max: 60, value: factionPickPhaseSeconds, onChange: e => setFactionPickPhaseSeconds(Math.max(5, Math.min(60, Number(e.target.value) || 15))), className: "w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white" }), _jsx("p", { className: "text-[11px] text-gray-500 mt-1", children: "M\u1EB7c \u0111\u1ECBnh: 15 gi\u00E2y \u0111\u1EBFm ng\u01B0\u1EE3c" })] })] }), _jsxs("div", { className: "space-y-2 pt-2 border-t border-gray-100", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: factionShuffleQuestions, onChange: e => setFactionShuffleQuestions(e.target.checked), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi ng\u1EABu nhi\u00EAn" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: factionShuffleOptions, onChange: e => setFactionShuffleOptions(e.target.checked), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o ph\u01B0\u01A1ng \u00E1n A, B, C, D \u0111\u1ED9c l\u1EADp (ch\u1ED1ng nh\u00ECn b\u00E0i)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700", children: [_jsx("input", { type: "checkbox", checked: factionAllowRecycle, onChange: e => setFactionAllowRecycle(e.target.checked), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("span", { children: "\uD83D\uDD04 T\u1EF1 \u0111\u1ED9ng xoay v\u00F2ng l\u1EA5y l\u1EA1i c\u00E2u c\u0169 khi h\u1EBFt kho \u0111\u1EC1" })] })] })] }))] })] })) : selectedActivity.id === 'exam' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["L\u1EDBp l\u01B0u tr\u1EEF b\u00E1o c\u00E1o k\u1EF3 thi ", _jsx("span", { className: "text-red-500", children: "*" })] }), sessionClassId ? (_jsxs("div", { className: "px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 font-bold flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFEB" }), _jsxs("span", { children: ["L\u1EDBp: ", classes.find(c => c.id === sessionClassId)?.name || 'Hiện tại'] })] }), _jsx("span", { className: "text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100", children: "T\u1EF1 \u0111\u1ED9ng l\u01B0u v\u00E0o B\u00E1o c\u00E1o theo ca" })] })) : (_jsxs("div", { children: [_jsxs("select", { value: examClassId, onChange: e => setExamClassId(e.target.value), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white font-medium", children: [_jsx("option", { value: "", children: "-- Ch\u1ECDn l\u1EDBp \u0111\u1EC3 l\u01B0u b\u00E1o c\u00E1o k\u1EF3 thi --" }), classes.map(c => (_jsxs("option", { value: c.id, children: ["\uD83C\uDFEB L\u1EDBp ", c.name, " (", c.year ? `Niên khóa ${c.year}` : 'Chung', ")"] }, c.id)))] }), _jsxs("p", { className: "text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5", children: ["\uD83D\uDCA1 Phi\u00EAn n\u00E0y \u0111ang l\u00E0 ", _jsx("strong", { children: "Phi\u00EAn t\u1EF1 do" }), ". Ch\u1ECDn l\u1EDBp \u0111\u1EC3 to\u00E0n b\u1ED9 k\u1EBFt qu\u1EA3 th\u00ED sinh \u0111\u01B0\u1EE3c l\u01B0u ch\u00EDnh x\u00E1c v\u00E0o", ' ', _jsx("strong", { children: "B\u00E1o C\u00E1o & Qu\u1EA3n L\u00FD K\u1EF3 Thi Theo Ca" }), "."] })] }))] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["T\u00EAn k\u1EF3 thi ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: examTitle, onChange: e => setExamTitle(e.target.value), "data-testid": "input-exam-title", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1ECDn b\u1ED9 \u0111\u1EC1 thi t\u1EEB Ng\u00E2n h\u00E0ng c\u00E2u h\u1ECFi" }), _jsxs("select", { value: selectedQuestionSetId, onChange: e => {
                                                        setSelectedQuestionSetId(e.target.value);
                                                        if (e.target.value) {
                                                            const found = questionSets?.find(s => s.id === e.target.value);
                                                            if (found)
                                                                setExamTitle(found.title);
                                                        }
                                                    }, className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: "", children: "-- D\u00F9ng b\u1ED9 \u0111\u1EC1 thi m\u1EABu m\u1EB7c \u0111\u1ECBnh --" }), questionSets?.map(s => {
                                                            const isMatrix = s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                                                            return (_jsxs("option", { value: s.id, children: [isMatrix ? '🎯 [Ma trận] ' : '', s.title, " (", s.questionCount || 0, " c\u00E2u) - ", s.subject || 'Chung'] }, s.id));
                                                        })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Th\u1EDDi gian l\u00E0m b\u00E0i (ph\u00FAt) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "number", min: 1, max: 180, required: true, value: examDuration, onChange: e => setExamDuration(Number(e.target.value)), "data-testid": "input-exam-duration", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u1EADt kh\u1EA9u k\u1EF3 thi (t\u00F9y ch\u1ECDn)" }), _jsx("input", { type: "text", value: examPassword, onChange: e => setExamPassword(e.target.value), placeholder: "\u0110\u1EC3 tr\u1ED1ng n\u1EBFu kh\u00F4ng \u0111\u1EB7t", "data-testid": "input-exam-password", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] })] }), _jsxs("div", { className: "border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: "\u2696\uFE0F" }), _jsx("h4", { className: "font-bold text-xs sm:text-sm text-slate-800", children: "Ph\u00E2n b\u1ED5 & C\u1EA5u h\u00ECnh \u0111i\u1EC3m s\u1ED1 c\u00E2u h\u1ECFi" })] }), _jsxs("span", { className: "text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200", children: ["T\u1ED5ng: ", totalCalculatedPoints, " \u0111i\u1EC3m (", examPreviewQuestions.length, " c\u00E2u)"] })] }), _jsx("p", { className: "text-xs text-slate-600", children: "B\u1EA1n c\u00F3 th\u1EC3 chia \u0111\u1EC1u \u0111i\u1EC3m theo t\u1ED5ng \u0111i\u1EC3m mong mu\u1ED1n (v\u00ED d\u1EE5 \u0111\u1EC1 7 \u0111i\u1EC3m), g\u00E1n nhanh \u0111i\u1EC3m cho t\u1EA5t c\u1EA3 c\u00E2u, ho\u1EB7c ch\u1EC9nh s\u1EEDa th\u1EE7 c\u00F4ng t\u1EEBng c\u00E2u c\u1EE5 th\u1EC3." }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5", children: [_jsxs("div", { className: "p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-xs", children: [_jsx("label", { className: "text-xs font-bold text-slate-700", children: "\u2797 Chia \u0111\u1EC1u theo T\u1ED5ng \u0111i\u1EC3m mong mu\u1ED1n" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", step: "0.25", min: "0.5", value: targetTotalScore, onChange: e => setTargetTotalScore(Number(e.target.value)), className: "w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold", placeholder: "Vd: 7 ho\u1EB7c 10" }), _jsxs("button", { type: "button", onClick: () => {
                                                                                if (examPreviewQuestions.length === 0)
                                                                                    return;
                                                                                const pointPerQ = Math.round((targetTotalScore / examPreviewQuestions.length) * 100) /
                                                                                    100;
                                                                                const updated = {};
                                                                                examPreviewQuestions.forEach(q => {
                                                                                    updated[q.id] = pointPerQ;
                                                                                });
                                                                                setExamCustomPoints(updated);
                                                                            }, className: "flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer", children: ["Chia \u0111\u1EC1u (", examPreviewQuestions.length > 0
                                                                                    ? Math.round((targetTotalScore / examPreviewQuestions.length) * 100) /
                                                                                        100
                                                                                    : 0, "\u0111/c\u00E2u)"] })] })] }), _jsxs("div", { className: "p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-xs", children: [_jsx("label", { className: "text-xs font-bold text-slate-700", children: "\u2728 G\u00E1n c\u00F9ng \u0111i\u1EC3m cho t\u1EA5t c\u1EA3 c\u00E1c c\u00E2u" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", step: "0.05", min: "0", value: bulkPointValue, onChange: e => setBulkPointValue(Number(e.target.value)), className: "w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold", placeholder: "Vd: 0.25" }), _jsx("button", { type: "button", onClick: () => {
                                                                                const val = Number(bulkPointValue) || 0;
                                                                                const updated = {};
                                                                                examPreviewQuestions.forEach(q => {
                                                                                    updated[q.id] = val;
                                                                                });
                                                                                setExamCustomPoints(updated);
                                                                            }, className: "flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer", children: "\u00C1p d\u1EE5ng t\u1EA5t c\u1EA3" })] })] })] }), _jsxs("div", { className: "pt-1", children: [_jsxs("div", { className: "text-xs font-bold text-slate-700 mb-1 flex items-center justify-between", children: [_jsx("span", { children: "Ch\u1EC9nh s\u1EEDa \u0111i\u1EC3m t\u1EEBng c\u00E2u:" }), _jsx("span", { className: "text-[11px] text-slate-500 font-normal", children: "(Nh\u1EADp s\u1ED1 \u0111i\u1EC3m tr\u1EF1c ti\u1EBFp v\u00E0o t\u1EEBng \u00F4)" })] }), _jsx("div", { className: "max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-xs", children: isLoadingExamQuestions ? (_jsx("div", { className: "p-3 text-center text-xs text-slate-400", children: "\u0110ang n\u1EA1p danh s\u00E1ch c\u00E2u h\u1ECFi..." })) : examPreviewQuestions.length === 0 ? (_jsx("div", { className: "p-3 text-center text-xs text-slate-400", children: "Ch\u01B0a c\u00F3 c\u00E2u h\u1ECFi n\u00E0o." })) : (examPreviewQuestions.map((q, qIdx) => {
                                                                const curPoint = examCustomPoints[q.id] !== undefined
                                                                    ? examCustomPoints[q.id]
                                                                    : q.points;
                                                                return (_jsxs("div", { className: "p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0 flex-1", children: [_jsxs("span", { className: "font-extrabold text-slate-700 shrink-0", children: ["C\u00E2u ", qIdx + 1, ":"] }), _jsx("span", { className: "px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase shrink-0", children: q.type }), _jsx("span", { className: "text-slate-600 truncate", title: q.stemText, children: q.stemText })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("input", { type: "number", step: "0.05", min: "0", value: curPoint, onChange: e => {
                                                                                        const val = parseFloat(e.target.value);
                                                                                        setExamCustomPoints(prev => ({
                                                                                            ...prev,
                                                                                            [q.id]: isNaN(val) ? 0 : Math.max(0, val),
                                                                                        }));
                                                                                    }, className: "w-16 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500" }), _jsx("span", { className: "text-slate-500 text-[11px]", children: "\u0111" })] })] }, q.id));
                                                            })) })] })] }), _jsxs("div", { className: "flex flex-col gap-2 pt-1", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: examShuffleQuestions, onChange: e => setExamShuffleQuestions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 X\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi theo t\u1EEBng h\u1ECDc sinh" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: examShuffleOptions, onChange: e => setExamShuffleOptions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 X\u00E1o tr\u1ED9n \u0111\u00E1p \u00E1n c\u00E1c c\u00E2u tr\u1EAFc nghi\u1EC7m (A, B, C, D)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: examAllowViewScore, onChange: e => setExamAllowViewScore(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDCCA Cho ph\u00E9p h\u1ECDc sinh xem \u0111i\u1EC3m s\u1ED1 sau khi n\u1ED9p b\u00E0i" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: examAllowViewReview, onChange: e => setExamAllowViewReview(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD0D Cho ph\u00E9p h\u1ECDc sinh xem l\u1EA1i b\u00E0i l\u00E0m & \u0111\u00E1p \u00E1n sau khi n\u1ED9p" })] })] }), _jsx("p", { className: "text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border", children: "\uD83D\uDD12 Khi b\u1EADt m\u1EADt kh\u1EA9u, h\u1ECDc sinh b\u1EAFt bu\u1ED9c ph\u1EA3i nh\u1EADp \u0111\u00FAng m\u1EADt kh\u1EA9u \u0111\u1EC3 m\u1EDF kh\u00F3a \u0111\u1EC1 thi. H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng ch\u1EA5m \u0111i\u1EC3m theo b\u1EA3n g\u1ED1c \u0111\u1EC1 thi." })] })) : selectedActivity.id === 'swiss-duel' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["T\u00EAn gi\u1EA3i \u0111\u1EA5u ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: swissTitle, onChange: e => setSwissTitle(e.target.value), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1ECDn b\u1ED9 c\u00E2u h\u1ECFi t\u1EEB Ng\u00E2n h\u00E0ng \u0111\u1EC1 thi" }), _jsxs("select", { value: selectedQuestionSetId, onChange: e => {
                                                        setSelectedQuestionSetId(e.target.value);
                                                        if (e.target.value) {
                                                            const found = questionSets?.find(s => s.id === e.target.value);
                                                            if (found)
                                                                setSwissTitle(`Đấu Cờ: ${found.title}`);
                                                        }
                                                    }, className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: "", children: "-- S\u1EED d\u1EE5ng c\u00E2u h\u1ECFi m\u1EABu m\u1EB7c \u0111\u1ECBnh --" }), questionSets.map(set => (_jsxs("option", { value: set.id, children: [set.title, " (", set.questionCount || 0, " c\u00E2u)"] }, set.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1EBF \u0111\u1ED9 t\u1ED5 ch\u1EE9c v\u00F2ng \u0111\u1EA5u" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("label", { className: `p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'questions' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "swissMode", checked: swissMode === 'questions', onChange: () => setSwissMode('questions'), className: "accent-amber-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\u265F\uFE0F Theo kho c\u00E2u h\u1ECFi" }), _jsx("span", { className: "block text-[11px] text-gray-500 font-normal", children: "Thi h\u1EBFt c\u00E2u h\u1ECFi trong \u0111\u1EC1 th\u00EC d\u1EEBng (c\u1EA5m g\u1EB7p l\u1EA1i)" })] })] }), _jsxs("label", { className: `p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'time' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`, children: [_jsx("input", { type: "radio", name: "swissMode", checked: swissMode === 'time', onChange: () => setSwissMode('time'), className: "accent-amber-600" }), _jsxs("div", { children: [_jsx("span", { className: "block text-sm font-bold", children: "\u23F1\uFE0F Theo th\u1EDDi gian" }), _jsx("span", { className: "block text-[11px] text-gray-500 font-normal", children: "\u0110\u1EA5u tr\u01B0\u1EDDng li\u00EAn t\u1EE5c (cho ph\u00E9p g\u1EB7p l\u1EA1i & l\u1EB7p c\u00E2u h\u1ECFi)" })] })] })] })] }), swissMode === 'time' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi l\u01B0\u1EE3ng gi\u1EA3i \u0111\u1EA5u (ph\u00FAt)" }), _jsx("input", { type: "number", min: 1, max: 60, value: swissTimeLimitMinutes, onChange: e => setSwissTimeLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 10)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi gian suy ngh\u0129 m\u1ED7i c\u00E2u h\u1ECFi (gi\u00E2y)" }), _jsx("input", { type: "number", min: 5, max: 120, value: swissTimeLimitPerQuestion, onChange: e => setSwissTimeLimitPerQuestion(Math.max(5, parseInt(e.target.value, 10) || 30)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { className: "space-y-2 pt-2 border-t border-amber-200/60", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: swissShuffleQuestions, onChange: e => setSwissShuffleQuestions(e.target.checked), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: swissShuffleOptions, onChange: e => setSwissShuffleOptions(e.target.checked), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { children: "\uD83D\uDD00 \u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E1c ph\u01B0\u01A1ng \u00E1n l\u1EF1a ch\u1ECDn (A, B, C, D)" })] })] }), _jsxs("div", { className: "p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1", children: [_jsx("div", { className: "font-bold", children: "\u2696\uFE0F Quy t\u1EAFc t\u00EDnh \u0111i\u1EC3m c\u1EDD & Nh\u1ECBp \u0111\u1EA5u:" }), _jsxs("div", { children: ["\u2022 Th\u1EAFng tr\u1EADn (2 c\u00E2u): ", _jsx("b", { children: "+2 \u0111i\u1EC3m" }), " \u2022 H\u00F2a tr\u1EADn: ", _jsx("b", { children: "+1 \u0111i\u1EC3m" }), " \u2022 Thua tr\u1EADn:", ' ', _jsx("b", { children: "0 \u0111i\u1EC3m" })] }), _jsx("div", { children: "\u2022 B\u1EB1ng c\u00E2u \u0111\u00FAng l\u00E0 H\u00F2a tuy\u1EC7t \u0111\u1ED1i." }), _jsx("div", { children: "\u2022 Su\u1EA5t BYE (khi l\u1EBB ng\u01B0\u1EDDi): T\u1EF1 \u0111\u1ED9ng \u01B0u ti\u00EAn h\u1ECDc sinh nh\u00F3m cu\u1ED1i c\u00F9ng ch\u01B0a t\u1EEBng nh\u1EADn BYE (+2\u0111). N\u1EBFu nh\u00F3m cu\u1ED1i \u0111\u1EC1u \u0111\u00E3 nh\u1EADn th\u00EC reset \u0111\u1EC3 cho nh\u1EADn l\u1EA1i." }), _jsx("div", { children: "\u2022 Khi ng\u01B0\u1EDDi cu\u1ED1i c\u00F9ng n\u1ED9p b\u00E0i: H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng \u0111\u1EBFm ng\u01B0\u1EE3c 10 gi\u00E2y \u0111\u1EC3 b\u1ED1c th\u0103m v\u00F2ng k\u1EBF ti\u1EBFp." })] })] })) : selectedActivity.id === 'assignment-hub' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["T\u00EAn \u0111\u1EE3t thu b\u00E0i ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: assignmentTitle, onChange: e => setAssignmentTitle(e.target.value), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm", placeholder: "V\u00ED d\u1EE5: Th\u1EF1c h\u00E0nh Tin h\u1ECDc bu\u1ED5i 3" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "H\u01B0\u1EDBng d\u1EABn / D\u1EB7n d\u00F2 c\u1EE7a gi\u00E1o vi\u00EAn" }), _jsx("textarea", { rows: 3, value: assignmentInstructions, onChange: e => setAssignmentInstructions(e.target.value), className: "w-full px-3 py-2 border rounded-lg text-sm", placeholder: "V\u00ED d\u1EE5: C\u00E1c em l\u00E0m b\u00E0i th\u1EF1c h\u00E0nh theo \u0111\u1EC1 b\u00E0i \u0111\u00EDnh k\u00E8m, l\u01B0u file \u0111\u1ECBnh d\u1EA1ng Word ho\u1EB7c Excel v\u00E0 n\u1ED9p l\u1EA1i tr\u01B0\u1EDBc khi h\u1EBFt gi\u1EDD." })] }), _jsxs("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50/70 p-4 rounded-xl border-2 border-blue-300 space-y-2.5 shadow-xs", children: [_jsx("div", { className: "flex items-center justify-between flex-wrap gap-2", children: _jsxs("label", { className: "text-sm font-extrabold text-blue-900 flex items-center gap-2", children: [_jsx("span", { className: "text-lg", children: "\uD83D\uDCC1" }), _jsx("span", { children: "N\u01A1i l\u01B0u b\u00E0i n\u1ED9p c\u1EE7a h\u1ECDc sinh tr\u00EAn m\u00E1y t\u00EDnh" }), _jsx("span", { className: "text-red-500 font-bold", children: "*" })] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: assignmentTargetDir, onChange: e => {
                                                                setAssignmentTargetDir(e.target.value);
                                                            }, placeholder: "VD: C:\\Users\\Admin\\Desktop\\BaiThucHanh...", className: "flex-1 min-h-[44px] px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-gray-800 shadow-inner" }), _jsxs("button", { type: "button", onClick: handleSelectFolder, disabled: isSelectingDir, className: "min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-sm transition flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83D\uDCC1" }), _jsx("span", { children: isSelectingDir ? 'Đang mở...' : 'Chọn thư mục khác...' })] }), _jsx("button", { type: "button", onClick: handleUseDefaultFolder, className: "min-h-[44px] px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition", children: "Desktop" })] }), _jsx("p", { className: "text-[11px] text-blue-800/80 leading-relaxed", children: "\uD83D\uDCA1 B\u00E0i n\u1ED9p c\u1EE7a h\u1ECDc sinh (Word, Excel, \u1EA3nh, PDF...) s\u1EBD \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng l\u01B0u tr\u1EF1c ti\u1EBFp v\u00E0o th\u01B0 m\u1EE5c \u0111\u01B0\u1EE3c ch\u1ECDn n\u00E0y tr\u00EAn m\u00E1y t\u00EDnh c\u1EE7a b\u1EA1n." })] }), _jsxs("div", { className: "bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("label", { className: "text-sm font-bold text-blue-900 flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83D\uDCE2" }), " T\u00E0i li\u1EC7u ph\u00E1t xu\u1ED1ng cho h\u1ECDc sinh"] }), _jsx("p", { className: "text-[11px] text-blue-700/80", children: "\u0110\u00EDnh k\u00E8m file \u0111\u1EC1 b\u00E0i, h\u00ECnh \u1EA3nh, t\u00E0i li\u1EC7u \u0111\u1EC3 t\u1EF1 \u0111\u1ED9ng ph\u00E1t xu\u1ED1ng ngay khi b\u1EAFt \u0111\u1EA7u." })] }), _jsxs("label", { className: "min-h-[36px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0", children: [_jsx("span", { children: "\u2795" }), " Ch\u1ECDn t\u1EC7p \u0111\u00EDnh k\u00E8m", _jsx("input", { type: "file", multiple: true, className: "hidden", onChange: e => {
                                                                        if (e.target.files) {
                                                                            const files = Array.from(e.target.files);
                                                                            setAssignmentInitialFiles(prev => [...prev, ...files]);
                                                                            e.target.value = '';
                                                                        }
                                                                    } })] })] }), assignmentInitialFiles.length === 0 ? (_jsx("p", { className: "text-xs text-blue-600/70 italic bg-white/70 p-2.5 rounded-lg border border-dashed border-blue-200 text-center", children: "Ch\u01B0a ch\u1ECDn t\u1EC7p \u0111\u00EDnh k\u00E8m n\u00E0o. (Th\u1EA7y/C\u00F4 c\u0169ng c\u00F3 th\u1EC3 ph\u00E1t th\u00EAm t\u00E0i li\u1EC7u b\u1EA5t c\u1EE9 l\u00FAc n\u00E0o trong b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n)." })) : (_jsx("div", { className: "space-y-1.5 pt-1", children: assignmentInitialFiles.map((file, idx) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200 text-xs shadow-2xs", children: [_jsxs("span", { className: "font-semibold text-gray-800 truncate", title: file.name, children: ["\uD83D\uDCC4 ", file.name, " (", Math.round(file.size / 1024), " KB)"] }), _jsx("button", { type: "button", onClick: () => setAssignmentInitialFiles(prev => prev.filter((_, i) => i !== idx)), className: "text-red-500 hover:text-red-700 font-bold px-2 py-0.5 cursor-pointer rounded hover:bg-red-50", title: "B\u1ECF t\u1EC7p n\u00E0y", children: "\u2715" })] }, idx))) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("label", { className: "text-sm font-medium text-gray-700", children: "\u0110\u1ECBnh d\u1EA1ng t\u1EC7p cho ph\u00E9p n\u1ED9p" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("button", { type: "button", onClick: () => setAssignmentAllowedExts([]), className: `text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${assignmentAllowedExts.length === 0
                                                                        ? 'bg-blue-600 text-white font-bold'
                                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`, children: "M\u1ECDi lo\u1EA1i t\u1EC7p (M\u1EB7c \u0111\u1ECBnh)" }), _jsx("button", { type: "button", onClick: () => setAssignmentAllowedExts(['.docx', '.xlsx', '.pptx', '.pdf']), className: "text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition cursor-pointer", children: "Ch\u1EC9 Office / PDF" })] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: [
                                                        { label: 'Word (.docx)', ext: '.docx' },
                                                        { label: 'Excel (.xlsx)', ext: '.xlsx' },
                                                        { label: 'PowerPoint (.pptx)', ext: '.pptx' },
                                                        { label: 'Tệp PDF (.pdf)', ext: '.pdf' },
                                                        { label: 'Nén (.zip, .rar)', ext: '.zip' },
                                                        { label: 'Hình ảnh (.png, .jpg)', ext: '.png' },
                                                        { label: 'Văn bản / Code (.txt, .py)', ext: '.txt' },
                                                    ].map(item => {
                                                        const checked = assignmentAllowedExts.includes(item.ext);
                                                        return (_jsxs("label", { className: `p-2 border rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition ${checked
                                                                ? 'bg-blue-50 border-blue-300 font-semibold text-blue-800'
                                                                : 'bg-white'}`, children: [_jsx("input", { type: "checkbox", checked: checked, onChange: e => {
                                                                        if (e.target.checked) {
                                                                            setAssignmentAllowedExts(prev => [...prev, item.ext]);
                                                                        }
                                                                        else {
                                                                            setAssignmentAllowedExts(prev => prev.filter(x => x !== item.ext));
                                                                        }
                                                                    }, className: "w-3.5 h-3.5 text-blue-600 rounded" }), _jsx("span", { children: item.label })] }, item.ext));
                                                    }) }), assignmentAllowedExts.length === 0 ? (_jsxs("p", { className: "text-[11px] text-green-700 font-medium mt-1.5 flex items-center gap-1", children: [_jsx("span", { children: "\u2705" }), " M\u1EB7c \u0111\u1ECBnh: Cho ph\u00E9p h\u1ECDc sinh n\u1ED9p m\u1ECDi lo\u1EA1i t\u1EC7p (Word, Excel, \u1EA3nh, code, file n\u00E9n...)."] })) : (_jsxs("p", { className: "text-[11px] text-amber-700 mt-1.5 flex items-center gap-1", children: [_jsx("span", { children: "\u2139\uFE0F" }), " \u0110ang gi\u1EDBi h\u1EA1n ch\u1EC9 nh\u1EADn c\u00E1c \u0111\u1ECBnh d\u1EA1ng:", ' ', assignmentAllowedExts.join(', '), "."] }))] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Dung l\u01B0\u1EE3ng t\u1ED1i \u0111a m\u1ED7i t\u1EC7p (MB)" }), _jsx("input", { type: "number", min: 1, max: 500, value: assignmentMaxFileSizeMb, onChange: e => setAssignmentMaxFileSizeMb(Math.max(1, parseInt(e.target.value, 10) || 50)), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi h\u1EA1n n\u1ED9p b\u00E0i (ph\u00FAt, t\u00F9y ch\u1ECDn)" }), _jsx("input", { type: "number", min: 1, max: 180, value: assignmentDeadlineMinutes ?? '', onChange: e => {
                                                                const val = parseInt(e.target.value, 10);
                                                                setAssignmentDeadlineMinutes(val > 0 ? val : null);
                                                            }, placeholder: "Kh\u00F4ng gi\u1EDBi h\u1EA1n th\u1EDDi gian", className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm" })] })] }), _jsx("div", { className: "space-y-2 pt-1", children: _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700", children: [_jsx("input", { type: "checkbox", checked: assignmentAllowResubmit, onChange: e => setAssignmentAllowResubmit(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDD04 Cho ph\u00E9p h\u1ECDc sinh n\u1ED9p l\u1EA1i (ghi \u0111\u00E8 b\u00E0i m\u1EDBi) tr\u01B0\u1EDBc khi \u0111\u00F3ng c\u1ED5ng" })] }) })] })) : selectedActivity.id === 'object-camera' ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "p-4 rounded-xl bg-slate-900 text-white space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-400 font-bold text-sm", children: [_jsx("span", { children: "\uD83D\uDCF1" }), " Bi\u1EBFn \u0111i\u1EC7n tho\u1EA1i th\u00E0nh Camera v\u1EADt th\u1EC3 th\u00F4ng minh"] }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed", children: "Khi b\u1EA5m b\u1EAFt \u0111\u1EA7u, h\u1EC7 th\u1ED1ng s\u1EBD m\u1EDF b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n v\u00E0 m\u00E3 QR k\u1EBFt n\u1ED1i. Gi\u00E1o vi\u00EAn d\u00F9ng \u0111i\u1EC7n tho\u1EA1i qu\u00E9t m\u00E3 \u0111\u1EC3 ch\u1EE5p b\u00E0i l\u00E0m c\u1EE7a h\u1ECDc sinh b\u1EAFn ngay l\u00EAn m\u00E1y t\u00EDnh, xoay c\u1EAFt ph\u00F3ng to, d\u00F9ng b\u00FAt \u0111\u1ECF s\u1EEDa b\u00E0i v\u00E0 ph\u00E1t s\u00F3ng \u0111\u1ED3ng b\u1ED9 t\u1EE9c th\u1EDDi xu\u1ED1ng c\u1ED5ng h\u1ECDc sinh & m\u00E1y chi\u1EBFu!" })] }), _jsxs("div", { className: "flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800", children: [_jsx("span", { children: "\uD83D\uDEE1\uFE0F" }), _jsxs("span", { children: [_jsx("strong", { children: "B\u1EA3o m\u1EADt cao:" }), " Ch\u1EC9 gi\u00E1o vi\u00EAn qu\u00E9t m\u00E3 tr\u00EAn m\u00E1y t\u00EDnh m\u1EDBi c\u00F3 quy\u1EC1n ch\u1EE5p \u1EA3nh. To\u00E0n b\u1ED9 \u1EA3nh t\u1EA1m s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111\u01B0\u1EE3c d\u1ECDn s\u1EA1ch khi \u0111\u00F3ng ti\u1EBFt h\u1ECDc."] })] })] })) : selectedActivity.id === 'territory-war' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["T\u00EAn cu\u1ED9c chi\u1EBFn ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: territoryTitle, onChange: e => setTerritoryTitle(e.target.value), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm", placeholder: "V\u00ED d\u1EE5: \u0110\u1EA1i Chi\u1EBFn L\u00E3nh Th\u1ED5 - \u00D4n T\u1EADp Ch\u01B0\u01A1ng 2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1ECDn b\u1ED9 c\u00E2u h\u1ECFi t\u1EEB kho \u0111\u1EC1" }), _jsxs("select", { value: selectedQuestionSetId, onChange: e => {
                                                        setSelectedQuestionSetId(e.target.value);
                                                        if (e.target.value) {
                                                            const found = questionSets?.find(s => s.id === e.target.value);
                                                            if (found)
                                                                setTerritoryTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                                                        }
                                                    }, className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: "", children: "-- S\u1EED d\u1EE5ng c\u00E2u h\u1ECFi m\u1EABu m\u1EB7c \u0111\u1ECBnh --" }), questionSets?.map(s => {
                                                            const isMatrix = s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                                                            return (_jsxs("option", { value: s.id, children: [isMatrix ? '🎯 [Ma trận] ' : '', s.title, " (", s.questionCount || 0, " c\u00E2u)"] }, s.id));
                                                        })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "K\u00EDch th\u01B0\u1EDBc b\u1EA3n \u0111\u1ED3 chi\u1EBFn l\u01B0\u1EE3c" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('5x5'), className: `p-3 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '5x5'
                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-base", children: "5x5" }), _jsx("span", { className: "text-[11px] text-gray-500 block", children: "25 \u00F4 (Nhanh g\u1ECDn)" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('7x7'), className: `p-3 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '7x7'
                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-base", children: "7x7 \u2B50" }), _jsx("span", { className: "text-[11px] text-gray-500 block", children: "49 \u00F4 (C\u00E2n b\u1EB1ng)" })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryMapSize('9x9'), className: `p-3 rounded-xl border text-center transition cursor-pointer ${territoryMapSize === '9x9'
                                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("span", { className: "block text-base", children: "9x9" }), _jsx("span", { className: "text-[11px] text-gray-500 block", children: "81 \u00F4 (\u0110\u1EA1i chi\u1EBFn)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi l\u01B0\u1EE3ng tr\u1EADn \u0111\u1EA5u (ph\u00FAt)" }), _jsx("input", { type: "number", min: 1, max: 60, value: territoryTimeLimitMinutes, onChange: e => setTerritoryTimeLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 5)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { className: "bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-sm font-bold text-amber-950", children: [_jsx("input", { type: "checkbox", checked: territoryEnableSuddenDeath, onChange: e => setTerritoryEnableSuddenDeath(e.target.checked), className: "rounded-sm text-amber-600 focus:ring-amber-500 h-4 w-4" }), _jsx("span", { children: "\uD83D\uDC51 B\u1EADt lu\u1EADt Sudden Death (Th\u1EAFng Ngay L\u1EADp T\u1EE9c)" })] }), _jsxs("p", { className: "text-xs text-amber-800/90 leading-relaxed pl-6", children: ["(M\u1EB7c \u0111\u1ECBnh t\u1EAFt) N\u1EBFu b\u1EADt: Phe n\u00E0o c\u00F4ng ph\u00E1 \u0111\u01B0\u1EE3c", ' ', _jsx("strong", { children: "L\u00E2u \u0110\u00E0i L\u1EDBn (ch\u00EDnh t\u00E2m)" }), " ho\u1EB7c", ' ', _jsx("strong", { children: "C\u1EA3 2 L\u00E2u \u0110\u00E0i C\u00E1nh" }), " s\u1EBD gi\u00E0nh chi\u1EBFn th\u1EAFng chung cu\u1ED9c ngay m\u00E0 kh\u00F4ng c\u1EA7n ch\u1EDD h\u1EBFt gi\u1EDD!"] })] }), _jsxs("div", { className: "bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83D\uDC65" }), " Ph\u00E2n chia qu\u00E2n \u0111\u1ED9i (", participants.length, " h\u1ECDc sinh)"] }), _jsx("span", { className: "text-[11px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md", children: "2 phe Xanh & \u0110\u1ECF" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2", children: [_jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('elo'), className: `p-2.5 rounded-xl border text-left transition cursor-pointer ${territoryBalanceMode === 'elo'
                                                                ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-400'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("div", { className: "text-xs font-bold flex items-center gap-1", children: _jsx("span", { children: "\u2696\uFE0F C\u00E2n b\u1EB1ng Elo \u1EA9n" }) }), _jsx("p", { className: "text-[11px] text-amber-800 font-normal mt-0.5 leading-snug", children: "Khuy\u00EAn d\u00F9ng. C\u00E2n b\u1EB1ng th\u1EF1c l\u1EF1c d\u1EF1a tr\u00EAn phong \u0111\u1ED9 l\u00E0m b\u00E0i." })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('random'), className: `p-2.5 rounded-xl border text-left transition cursor-pointer ${territoryBalanceMode === 'random'
                                                                ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-400'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("div", { className: "text-xs font-bold flex items-center gap-1", children: _jsx("span", { children: "\uD83C\uDFB2 Ng\u1EABu nhi\u00EAn 50/50" }) }), _jsx("p", { className: "text-[11px] text-gray-500 font-normal mt-0.5 leading-snug", children: "Chia may r\u1EE7i xen k\u1EBD ng\u1EABu nhi\u00EAn gi\u1EEFa 2 phe." })] }), _jsxs("button", { type: "button", onClick: () => setTerritoryBalanceMode('groups'), className: `p-2.5 rounded-xl border text-left transition cursor-pointer ${territoryBalanceMode === 'groups'
                                                                ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-1 ring-purple-400'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`, children: [_jsx("div", { className: "text-xs font-bold flex items-center gap-1", children: _jsx("span", { children: "\uD83D\uDC65 Theo t\u1ED5 / nh\u00F3m" }) }), _jsx("p", { className: "text-[11px] text-purple-800 font-normal mt-0.5 leading-snug", children: "Gi\u1EEF nguy\u00EAn c\u00E1c t\u1ED5 h\u1ECDc t\u1EADp \u0111\u00E3 ph\u00E2n c\u1EE7a l\u1EDBp." })] })] }), _jsx("p", { className: "text-[11px] text-slate-500 italic", children: "* \u0110i\u1EC3m Elo \u1EA9n ho\u00E0n to\u00E0n v\u1EDBi h\u1ECDc sinh \u0111\u1EC3 tr\u00E1nh so s\u00E1nh ti\u00EAu c\u1EF1c. Sau khi tr\u1EADn \u0111\u1EA5u b\u1EAFt \u0111\u1EA7u, Th\u1EA7y/C\u00F4 v\u1EABn c\u00F3 th\u1EC3 \u0111\u1ED5i h\u1ECDc sinh qua l\u1EA1i gi\u1EEFa hai phe b\u1EA5t c\u1EE9 l\u00FAc n\u00E0o!" })] })] })) : selectedActivity.id === 'project-grading' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3", children: [_jsxs("div", { className: "sm:col-span-3", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "T\u00EAn d\u1EF1 \u00E1n / Ho\u1EA1t \u0111\u1ED9ng" }), _jsx("input", { type: "text", value: projectGradingTitle, onChange: e => setProjectGradingTitle(e.target.value), placeholder: "VD: B\u00E1o c\u00E1o D\u1EF1 \u00E1n STEM, Thuy\u1EBFt tr\u00ECnh L\u1ECBch s\u1EED...", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm", "data-testid": "input-project-grading-title" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Thang \u0111i\u1EC3m" }), _jsx("input", { type: "number", min: 1, max: 100, value: projectGradingMaxScore, onChange: e => setProjectGradingMaxScore(Number(e.target.value) || 10), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm text-center font-bold", "data-testid": "input-project-grading-max-score" })] })] }), _jsxs("div", { className: "bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-sm font-bold text-blue-900 block", children: "\uD83D\uDC65 C\u1EA5u tr\u00FAc nh\u00F3m h\u1ECDc sinh" }), _jsx("span", { className: "text-xs text-blue-700", children: projectGradingGroups.length > 0
                                                                        ? `Đã cấu hình ${projectGradingGroups.length} nhóm tham gia`
                                                                        : 'Chưa có nhóm. Bấm nút bên cạnh để lấy nhóm từ lớp!' })] }), _jsx("button", { type: "button", onClick: handleFetchClassGroupsForGrading, disabled: isLoadingClassGroups, className: "min-h-[40px] px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs", "data-testid": "btn-fetch-class-groups", children: isLoadingClassGroups ? 'Đang nạp...' : '👥 Lấy nhóm từ Lớp học' })] }), classGroupsLoadedMsg && (_jsx("p", { className: "text-xs font-semibold text-blue-800 m-0", children: classGroupsLoadedMsg })), projectGradingGroups.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 pt-1", children: projectGradingGroups.map(g => (_jsxs("span", { className: "text-xs px-2.5 py-1 bg-white border border-blue-200 rounded-md font-medium text-slate-700", children: [g.name, " (", g.memberParticipantIds.length, " HS)", ' ', g.leaderDisplayName ? `⭐ ${g.leaderDisplayName}` : ''] }, g.id))) }))] }), _jsxs("div", { className: "bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("span", { className: "text-sm font-bold text-slate-800", children: ["\u2696\uFE0F C\u1EA5u h\u00ECnh tr\u1ECDng s\u1ED1 \u0111i\u1EC3m (T\u1ED5ng:", ' ', projectGradingWeightSelf +
                                                                    projectGradingWeightMember +
                                                                    projectGradingWeightCross +
                                                                    projectGradingWeightTeacher, "%)"] }), _jsx("span", { className: "text-xs text-slate-500 font-medium", children: "Thang \u0111i\u1EC3m 10" })] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-slate-600 mb-1", children: "1. T\u1EF1 ch\u1EA5m (%)" }), _jsx("input", { type: "number", min: 0, max: 100, value: projectGradingWeightSelf, onChange: e => setProjectGradingWeightSelf(Number(e.target.value) || 0), className: "w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white", "data-testid": "input-weight-self" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-slate-600 mb-1", children: "2. T\u1ED5 ch\u1EA5m (%)" }), _jsx("input", { type: "number", min: 0, max: 100, value: projectGradingWeightMember, onChange: e => setProjectGradingWeightMember(Number(e.target.value) || 0), className: "w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white", "data-testid": "input-weight-member" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-slate-600 mb-1", children: "3. Ch\u00E9o nh\u00F3m (%)" }), _jsx("input", { type: "number", min: 0, max: 100, value: projectGradingWeightCross, onChange: e => setProjectGradingWeightCross(Number(e.target.value) || 0), className: "w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white", "data-testid": "input-weight-cross" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-semibold text-slate-600 mb-1", children: "4. Gi\u00E1o vi\u00EAn (%)" }), _jsx("input", { type: "number", min: 0, max: 100, value: projectGradingWeightTeacher, onChange: e => setProjectGradingWeightTeacher(Number(e.target.value) || 0), className: "w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white", "data-testid": "input-weight-teacher" })] })] })] })] })) : selectedActivity.id === 'interactive-board' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3", children: [_jsxs("div", { className: "sm:col-span-3", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ti\u00EAu \u0111\u1EC1 B\u1EA3ng T\u01B0\u01A1ng T\u00E1c" }), _jsx("input", { type: "text", value: boardTitle, onChange: e => setBoardTitle(e.target.value), placeholder: "VD: Tri\u1EC3n l\u00E3m b\u00E0i gi\u1EA3i To\u00E1n, Brainstorm \u00FD t\u01B0\u1EDFng STEM...", className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Thang \u0111i\u1EC3m" }), _jsx("input", { type: "number", min: 1, max: 100, value: boardMaxGrade, onChange: e => setBoardMaxGrade(Number(e.target.value) || 10), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm text-center font-bold" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1EE7 \u0111\u1EC1 / C\u00E2u h\u1ECFi y\u00EAu c\u1EA7u h\u1ECDc sinh l\u00E0m" }), _jsx("textarea", { value: boardPrompt, onChange: e => setBoardPrompt(e.target.value), placeholder: "VD: H\u00E3y v\u1EBD s\u01A1 \u0111\u1ED3 l\u1EF1c t\u00E1c d\u1EE5ng ho\u1EB7c ch\u1EE5p b\u00E0i l\u00E0m c\u00E2u 3 trong v\u1EDF n\u1ED9p l\u00EAn...", rows: 2, className: "w-full p-3 border rounded-lg text-sm resize-none" })] }), _jsxs("div", { className: "bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardRequireApproval, onChange: e => setBoardRequireApproval(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Duy\u1EC7t b\u00E0i tr\u01B0\u1EDBc khi hi\u1EC7n" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardAllowPeerGrades, onChange: e => setBoardAllowPeerGrades(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Cho ph\u00E9p ch\u1EA5m \u0111i\u1EC3m ch\u00E9o" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardAllowDraw, onChange: e => setBoardAllowDraw(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Cho ph\u00E9p v\u1EBD tay" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardAllowImage, onChange: e => setBoardAllowImage(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Cho ph\u00E9p ch\u1EE5p/t\u1EA3i \u1EA3nh" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardAllowComments, onChange: e => setBoardAllowComments(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Cho ph\u00E9p b\u00ECnh lu\u1EADn" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [_jsx("input", { type: "checkbox", checked: boardAllowReactions, onChange: e => setBoardAllowReactions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "Cho ph\u00E9p Like/Th\u1EA3 tim" })] })] }), _jsxs("div", { className: "p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-bold text-sm text-blue-900", children: [_jsx("input", { type: "checkbox", checked: boardWorksheetEnabled, onChange: e => setBoardWorksheetEnabled(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { children: "\uD83D\uDCDD Giao Phi\u1EBFu b\u00E0i t\u1EADp k\u00E8m theo" })] }), boardWorksheetEnabled && (_jsx("span", { className: "text-[11px] bg-blue-200 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full", children: "T\u1EF1 \u0111\u1ED9ng ch\u1EA5m \u0111i\u1EC3m" }))] }), boardWorksheetEnabled && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate-700 mb-1", children: "Ch\u1ECDn b\u1ED9 c\u00E2u h\u1ECFi c\u00F3 s\u1EB5n t\u1EEB ng\u00E2n h\u00E0ng:" }), _jsxs("select", { value: boardQuestionSetId, onChange: e => setBoardQuestionSetId(e.target.value), className: "w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white font-medium", children: [_jsx("option", { value: "", children: "-- Ch\u1ECDn m\u1ED9t b\u1ED9 c\u00E2u h\u1ECFi --" }), questionSets.map(qs => (_jsxs("option", { value: qs.id, children: [qs.title, " (", qs.questionCount ?? 0, " c\u00E2u)"] }, qs.id)))] }), boardQuestionSetId && (_jsx("p", { className: "text-[11px] text-blue-700 mt-1.5 font-medium", children: "\uD83D\uDCA1 H\u1ECDc sinh s\u1EBD l\u00E0m tr\u1EF1c ti\u1EBFp c\u00E1c c\u00E2u h\u1ECFi tr\u1EAFc nghi\u1EC7m, gh\u00E9p n\u1ED1i ho\u1EB7c \u0111i\u1EC1n t\u1EEB trong phi\u1EBFu n\u00E0y tr\u01B0\u1EDBc khi n\u1ED9p l\u00EAn b\u1EA3ng l\u1EDBp." }))] }))] })] })) : selectedActivity.id === 'circuit-race' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["T\u00EAn cu\u1ED9c \u0111ua ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: circuitTitle, onChange: e => setCircuitTitle(e.target.value), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm", placeholder: "V\u00ED d\u1EE5: \u0110\u01B0\u1EDDng \u0110ua Tri Th\u1EE9c - Chinh Ph\u1EE5c \u0110i\u1EC3m 10" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ch\u1ECDn b\u1ED9 c\u00E2u h\u1ECFi t\u1EEB kho \u0111\u1EC1" }), _jsxs("select", { value: selectedQuestionSetId, onChange: e => {
                                                        setSelectedQuestionSetId(e.target.value);
                                                        if (e.target.value) {
                                                            const found = questionSets?.find(s => s.id === e.target.value);
                                                            if (found)
                                                                setCircuitTitle(`Đường Đua: ${found.title}`);
                                                        }
                                                    }, className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: "", children: "-- S\u1EED d\u1EE5ng c\u00E2u h\u1ECFi m\u1EABu m\u1EB7c \u0111\u1ECBnh (MCQ, \u0110\u00FAng/Sai, Ch\u00F9m \u0110/S, Tr\u1EA3 l\u1EDDi ng\u1EAFn) --" }), questionSets?.map(s => (_jsxs("option", { value: s.id, children: [s.title, " (", s.questionCount ?? 0, " c\u00E2u)"] }, s.id)))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u0110\u1ED9 d\u00E0i \u0111\u01B0\u1EDDng \u0111ua" }), _jsxs("select", { value: circuitTrackLength, onChange: e => setCircuitTrackLength(Number(e.target.value)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 30, children: "30 \u00F4 (Ch\u1EB7ng ng\u1EAFn)" }), _jsx("option", { value: 50, children: "50 \u00F4 (Ti\u00EAu chu\u1EA9n)" }), _jsx("option", { value: 80, children: "80 \u00F4 (Ch\u1EB7ng d\u00E0i)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi gian m\u1ED7i c\u00E2u" }), _jsxs("select", { value: circuitTimePerQuestion, onChange: e => setCircuitTimePerQuestion(Number(e.target.value)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 15, children: "15 gi\u00E2y (T\u1ED1c \u0111\u1ED9)" }), _jsx("option", { value: 20, children: "20 gi\u00E2y (Ti\u00EAu chu\u1EA9n)" }), _jsx("option", { value: 30, children: "30 gi\u00E2y (Th\u01B0 th\u1EA3)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Th\u1EDDi gian d\u00F9ng th\u1EBB sau m\u1ED7i c\u00E2u (T\u1EF1 \u0111\u1ED9ng chuy\u1EC3n c\u00E2u)" }), _jsxs("select", { value: circuitActionWindowSeconds, onChange: e => setCircuitActionWindowSeconds(Number(e.target.value)), className: "w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white", children: [_jsx("option", { value: 5, children: "5 gi\u00E2y (Nhanh)" }), _jsx("option", { value: 10, children: "10 gi\u00E2y (Ti\u00EAu chu\u1EA9n - khuy\u1EBFn ngh\u1ECB)" }), _jsx("option", { value: 15, children: "15 gi\u00E2y (Th\u01B0 th\u1EA3)" }), _jsx("option", { value: 20, children: "20 gi\u00E2y (D\u00E0i)" })] })] }), _jsxs("div", { className: "space-y-2 pt-2 border-t border-gray-100", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: circuitShuffleQuestions, onChange: e => setCircuitShuffleQuestions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "\u0110\u1EA3o th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: circuitShuffleOptions, onChange: e => setCircuitShuffleOptions(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "\u0110\u1EA3o th\u1EE9 t\u1EF1 \u0111\u00E1p \u00E1n (A, B, C, D)" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: circuitIndependentOrder, onChange: e => setCircuitIndependentOrder(e.target.checked), className: "w-4 h-4 text-blue-600 rounded" }), _jsxs("span", { className: "text-sm font-medium text-gray-700", children: ["M\u1ED7i h\u1ECDc sinh th\u1EE9 t\u1EF1 c\u00E2u kh\u00E1c nhau", ' ', _jsx("span", { className: "text-blue-600 font-semibold", children: "(Ch\u1ED1ng nh\u00ECn b\u00E0i)" })] })] })] }), _jsxs("div", { className: "flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800", children: [_jsx("span", { children: "\uD83D\uDCA1" }), _jsx("span", { children: "T\u1EF1 \u0111\u1ED9ng h\u1ED7 tr\u1EE3 \u0111\u1EA7y \u0111\u1EE7 4 d\u1EA1ng: Tr\u1EAFc nghi\u1EC7m 4 l\u1EF1a ch\u1ECDn, \u0110\u00FAng/Sai \u0111\u01A1n, Ch\u00F9m \u0110\u00FAng/Sai (chu\u1EA9n BGD) v\u00E0 \u0110i\u1EC1n t\u1EEB/s\u1ED1 ng\u1EAFn. H\u1ECDc sinh tr\u1EA3 l\u1EDDi \u0111\u00FAng s\u1EBD gieo x\u00FAc x\u1EAFc v\u00E0 nh\u1EADn th\u1EBB b\u1ED5 tr\u1EE3!" })] })] })) : (_jsxs("p", { className: "text-sm text-gray-600", children: ["Nh\u1EA5n x\u00E1c nh\u1EADn \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u ngay ho\u1EA1t \u0111\u1ED9ng ", _jsx("strong", { children: selectedActivity.name }), "."] })), _jsxs("div", { className: "sticky bottom-0 bg-white pt-3 pb-1 border-t flex justify-end gap-3 mt-4 shrink-0 shadow-xs", children: [_jsx("button", { type: "button", onClick: handleCloseConfig, className: "min-h-[48px] px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer", children: "H\u1EE7y" }), _jsx("button", { type: "submit", "data-testid": "btn-submit-start-activity", className: "min-h-[48px] px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm cursor-pointer", children: activeRun ? '▶ Khởi chạy song song' : 'Bắt đầu ngay' })] })] })] }) }))] }));
};
//# sourceMappingURL=ActivityPanel.js.map