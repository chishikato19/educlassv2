import React, { useState, useEffect } from 'react';
import type {
  ActivityMeta,
  ClassDto,
  ParticipantDto,
  SessionDetailResponse,
  StudentDto,
} from '@educlass/protocol';
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
import type { ProjectGradingGroupConfig } from '@educlass/protocol';
import { api } from '../api/client.js';
import { ErrorBoundary } from './ErrorBoundary.js';

export interface ActiveRunData<St = unknown, Cfg = unknown> {
  runId: string;
  activityId: string;
  state: St;
  config?: Cfg;
}

export interface QuestionSetSummary {
  id: string;
  title: string;
  subject?: string;
  grade?: number;
  questionCount?: number;
  tags?: string[];
}

export interface ActivityPanelProps {
  activities: ActivityMeta[];
  activeRun: ActiveRunData | null;
  activeRuns?: ActiveRunData[];
  onSelectActiveRun?: (runId: string) => void;
  questionSets?: QuestionSetSummary[];
  onLoadQuestionSet?: (id: string) => Promise<unknown>;
  isLoading?: boolean;
  onOpenActivityWindow?: () => void;
  onStartActivity: (activityId: string, config: unknown) => Promise<void> | void;
  onSendTeacherIntent: (intent: unknown) => void;
  onEndActivity: (runId: string) => Promise<void> | void;
  participants?: ParticipantDto[];
  students?: StudentDto[];
  classes?: ClassDto[];
  activeSession?: SessionDetailResponse | null;
}

export interface TeacherPanelComponentProps<St = unknown> {
  runId: string;
  state: St;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
}

// Bảng ánh xạ Teacher Panels
const teacherPanelRegistry: Record<
  string,
  React.ComponentType<TeacherPanelComponentProps<never>>
> = {
  'quick-poll': QuickPollTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'quiz-live': QuizLiveTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  exam: ExamTeacherPanel as unknown as React.ComponentType<TeacherPanelComponentProps<never>>,
  'swiss-duel': SwissDuelTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'assignment-hub': AssignmentTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'pdf-presenter': PdfPresenterTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'object-camera': ObjectCameraTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'territory-war': TerritoryTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'project-grading': ProjectGradingTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'arcade-duel': ArcadeDuelTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'interactive-board': InteractiveBoardTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
  'circuit-race': CircuitTeacherPanel as unknown as React.ComponentType<
    TeacherPanelComponentProps<never>
  >,
};

/**
 * Đăng ký thêm Client Teacher Panel mới vào ActivityPanel
 */
export function registerTeacherPanel(
  activityId: string,
  panelComponent: React.ComponentType<TeacherPanelComponentProps<never>>
): void {
  teacherPanelRegistry[activityId] = panelComponent;
}

function parseStemText(stem: unknown, fallback: string): string {
  if (!stem) return fallback;
  if (typeof stem === 'string') return stem;
  if (typeof stem === 'object' && 'text' in (stem as Record<string, unknown>)) {
    return String((stem as { text: string }).text) || fallback;
  }
  return fallback;
}

function parseOptionText(opt: unknown, fallback: string): string {
  if (!opt) return fallback;
  if (typeof opt === 'string') return opt;
  if (typeof opt === 'object' && 'text' in (opt as Record<string, unknown>)) {
    return String((opt as { text: string }).text) || fallback;
  }
  return String(opt);
}

function extractQuestionImage(q: Record<string, unknown>): string | undefined {
  if (typeof q['image'] === 'string' && q['image'].trim()) {
    return q['image'].trim();
  }
  const stemObj = q['stem'] as { images?: unknown[] } | undefined;
  if (
    stemObj &&
    typeof stemObj === 'object' &&
    Array.isArray(stemObj.images) &&
    stemObj.images.length > 0
  ) {
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

function extractOptionImage(opt: unknown): string | undefined {
  if (opt && typeof opt === 'object') {
    const optObj = opt as { images?: unknown[]; image?: unknown };
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

function parseCorrectAnswer(q: Record<string, unknown>, optionsCount: number): number {
  const raw = q['correct'] ?? q['correctAnswer'] ?? q['answer'] ?? q['correct_answer'];
  if (typeof raw === 'number') {
    if (raw >= 0 && raw < optionsCount) return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toUpperCase();
    const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
    if (trimmed in letterMap) return letterMap[trimmed]!;
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num < optionsCount) return num;
  }
  return 0;
}

function parseTfCorrectAnswer(q: Record<string, unknown>): boolean {
  const raw = q['correct'] ?? q['correctAnswer'] ?? q['answer'];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'true' || s === 'đúng' || s === 't' || s === '1') return true;
    if (s === 'false' || s === 'sai' || s === 'f' || s === '0') return false;
  }
  return Boolean(raw);
}

function parseShortCorrectAnswer(q: Record<string, unknown>): string[] {
  const raw = q['correct'] ?? q['correctAnswer'] ?? q['accepted'] ?? q['answer'];
  if (Array.isArray(raw)) return raw.map(x => String(x).trim());
  if (raw !== undefined && raw !== null) return [String(raw).trim()];
  return [''];
}

function prepareTerritoryParticipants(
  participants: ParticipantDto[] | undefined,
  students: StudentDto[] | undefined,
  balanceMode: 'elo' | 'random' | 'groups'
): Array<{
  id: string;
  displayName: string;
  team: 'blue' | 'red';
  groupName: string | null;
  elo?: number;
}> {
  if (!participants || participants.length === 0) return [];

  const studentMap = new Map<string, StudentDto>();
  if (students) {
    for (const s of students) {
      studentMap.set(s.id, s);
    }
  }

  // 1. Phân chia theo tổ / nhóm cố định của lớp
  if (balanceMode === 'groups') {
    const groupMap = new Map<string, ParticipantDto[]>();
    const individualStudents: ParticipantDto[] = [];

    for (const p of participants) {
      const gName = p.teamName?.trim();
      if (gName) {
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        groupMap.get(gName)!.push(p);
      } else {
        individualStudents.push(p);
      }
    }

    if (groupMap.size > 0) {
      const result: Array<{
        id: string;
        displayName: string;
        team: 'blue' | 'red';
        groupName: string | null;
        elo?: number;
      }> = [];

      const groupNames = Array.from(groupMap.keys());
      groupNames.forEach((gName, gIdx) => {
        const assignedTeam: 'blue' | 'red' = gIdx % 2 === 0 ? 'blue' : 'red';
        const members = groupMap.get(gName)!;
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

      let currentTeam: 'blue' | 'red' = 'blue';
      for (const ind of individualStudents) {
        const elo =
          (ind.studentId ? studentMap.get(ind.studentId)?.elo : undefined) ?? ind.elo ?? 1000;
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
      elo = studentMap.get(p.studentId)!.elo ?? 1000;
    } else if (p.studentIds && p.studentIds.length > 0) {
      const studentElos = p.studentIds
        .map(id => studentMap.get(id)?.elo)
        .filter((e): e is number => typeof e === 'number');
      if (studentElos.length > 0) {
        elo = Math.round(studentElos.reduce((a, b) => a + b, 0) / studentElos.length);
      }
    } else if (typeof p.elo === 'number') {
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
    team: 'blue' as const,
    groupName: b.groupName,
    elo: b.elo,
  }));

  const redInitial = balanced.red.map(r => ({
    id: r.id,
    displayName: r.displayName,
    team: 'red' as const,
    groupName: r.groupName,
    elo: r.elo,
  }));

  return [...blueInitial, ...redInitial];
}

/**
 * ActivityPanel - Bảng điều khiển Hoạt động & Trò chơi dành cho Giáo viên
 */
export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  activities,
  activeRun,
  activeRuns = [],
  onSelectActiveRun,
  questionSets = [],
  onLoadQuestionSet,
  isLoading = false,
  onOpenActivityWindow,
  onStartActivity,
  onSendTeacherIntent,
  onEndActivity,
  participants = [],
  students = [],
  classes = [],
  activeSession,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<ActivityMeta | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Lớp học liên kết cho Kỳ thi
  const sessionClassId =
    (activeSession?.session as { classId?: string })?.classId ||
    (activeSession as unknown as { classId?: string })?.classId ||
    '';
  const [examClassId, setExamClassId] = useState<string>(sessionClassId || (classes[0]?.id ?? ''));

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
  const [quizMode, setQuizMode] = useState<
    | 'kahoot'
    | 'quizizz'
    | 'swiss-duel'
    | 'territory-war'
    | 'arcade-duel'
    | 'volleyball-tournament'
    | 'faction-duel'
  >('kahoot');
  const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(true);
  const [quizShuffleOptions, setQuizShuffleOptions] = useState(true);
  const [quizEnablePowerUps, setQuizEnablePowerUps] = useState(true);
  const [quizShowCorrectAnswer, setQuizShowCorrectAnswer] = useState(true);
  const [quizAllowReplay, setQuizAllowReplay] = useState(true);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string>('');

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
  const [volleyballPoolMode, setVolleyballPoolMode] = useState<'auto' | '4_pools' | '8_pools'>(
    'auto'
  );
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
  const [swissMode, setSwissMode] = useState<'questions' | 'time'>('questions');
  const [swissTimeLimitMinutes, setSwissTimeLimitMinutes] = useState(10);
  const [swissTimeLimitPerQuestion, setSwissTimeLimitPerQuestion] = useState(30);
  const [swissShuffleQuestions, setSwissShuffleQuestions] = useState(true);
  const [swissShuffleOptions, setSwissShuffleOptions] = useState(true);

  // Cấu hình Đại Chiến Lãnh Thổ
  const [territoryTitle, setTerritoryTitle] = useState('Đại Chiến Lãnh Thổ');
  const [territoryMapSize, setTerritoryMapSize] = useState<'5x5' | '7x7' | '9x9'>('7x7');
  const [territoryTimeLimitMinutes, setTerritoryTimeLimitMinutes] = useState(5);
  const [territoryEnableSuddenDeath, setTerritoryEnableSuddenDeath] = useState(false);
  const [territoryBalanceMode, setTerritoryBalanceMode] = useState<'elo' | 'random' | 'groups'>(
    'elo'
  );

  // Cấu hình Đường Đua Tri Thức
  const [circuitTitle, setCircuitTitle] = useState('Đường Đua Tri Thức');
  const [circuitTrackLength, setCircuitTrackLength] = useState<number>(50);
  const [circuitTimePerQuestion, setCircuitTimePerQuestion] = useState<number>(20);
  const [circuitActionWindowSeconds, setCircuitActionWindowSeconds] = useState<number>(10);
  const [circuitShuffleQuestions, setCircuitShuffleQuestions] = useState<boolean>(true);
  const [circuitShuffleOptions, setCircuitShuffleOptions] = useState<boolean>(true);
  const [circuitIndependentOrder, setCircuitIndependentOrder] = useState<boolean>(false);

  // Cấu hình Đối Kháng 1vs1
  const [arcadeDuelTitle] = useState('Đối Kháng 1vs1');
  const [arcadeDuelMode, setArcadeDuelMode] = useState<'sync_turn' | 'speed_race'>('sync_turn');
  const [arcadeDuelTimeLimitPerQuestion, setArcadeDuelTimeLimitPerQuestion] = useState(15);
  const [arcadeDuelTotalTimeLimit, setArcadeDuelTotalTimeLimit] = useState(90);
  const [arcadeDuelInventoryCapacity, setArcadeDuelInventoryCapacity] = useState<2 | 3>(2);
  const [arcadeDuelDropCondition, setArcadeDuelDropCondition] = useState<1 | 2>(2);
  const [arcadeDuelShuffleOptions, setArcadeDuelShuffleOptions] = useState(true);
  const [arcadeDuelEnablePowerUps, setArcadeDuelEnablePowerUps] = useState(true);

  // Cấu hình Thu - phát bài tập
  const [assignmentTitle, setAssignmentTitle] = useState('Thu - phát bài tập');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [assignmentTargetDir, setAssignmentTargetDir] = useState('');
  const [assignmentAllowedExts, setAssignmentAllowedExts] = useState<string[]>([]);
  const [assignmentMaxFileSizeMb, setAssignmentMaxFileSizeMb] = useState(50);
  const [assignmentAllowResubmit, setAssignmentAllowResubmit] = useState(true);
  const [assignmentDeadlineMinutes, setAssignmentDeadlineMinutes] = useState<number | null>(null);

  // Cấu hình Bảng Tương Tác (Interactive Board)
  const [boardTitle, setBoardTitle] = useState('Bảng Tương Tác Lớp Học');
  const [boardPrompt, setBoardPrompt] = useState('');
  const [boardMaxGrade, setBoardMaxGrade] = useState<number>(10);
  const [boardAllowDraw, setBoardAllowDraw] = useState(true);
  const [boardAllowImage, setBoardAllowImage] = useState(true);
  const [boardAllowComments, setBoardAllowComments] = useState(true);
  const [boardAllowReactions, setBoardAllowReactions] = useState(true);
  const [boardAllowPeerGrades, setBoardAllowPeerGrades] = useState(true);
  const [boardRequireApproval, setBoardRequireApproval] = useState(true);
  const [boardWorksheetEnabled, setBoardWorksheetEnabled] = useState(false);
  const [boardQuestionSetId, setBoardQuestionSetId] = useState<string>('');

  // Cấu hình Chấm điểm Dự án đa chiều
  const [projectGradingTitle, setProjectGradingTitle] = useState('Chấm điểm Dự án');
  const [projectGradingMaxScore, setProjectGradingMaxScore] = useState<number>(10);
  const [projectGradingWeightSelf, setProjectGradingWeightSelf] = useState<number>(10);
  const [projectGradingWeightMember, setProjectGradingWeightMember] = useState<number>(20);
  const [projectGradingWeightCross, setProjectGradingWeightCross] = useState<number>(20);
  const [projectGradingWeightTeacher, setProjectGradingWeightTeacher] = useState<number>(50);
  const [projectGradingGroups, setProjectGradingGroups] = useState<ProjectGradingGroupConfig[]>([]);
  const [isLoadingClassGroups, setIsLoadingClassGroups] = useState(false);
  const [classGroupsLoadedMsg, setClassGroupsLoadedMsg] = useState<string | null>(null);

  const handleFetchClassGroupsForGrading = async () => {
    if (!activeSession?.session?.classId) {
      const parts = participants || [];
      const count = Math.max(2, Math.min(4, parts.length || 4));
      const fallbackGroups: ProjectGradingGroupConfig[] = Array.from({ length: count }, (_, i) => ({
        id: `group_${i + 1}`,
        name: `Nhóm ${i + 1}`,
        leaderParticipantId: parts[i]?.id ?? null,
        leaderDisplayName: parts[i]?.displayName ?? null,
        memberParticipantIds: parts.filter((_, idx) => idx % count === i).map(p => p.id),
      }));
      setProjectGradingGroups(fallbackGroups);
      setClassGroupsLoadedMsg(
        `✓ Đã tạo ${fallbackGroups.length} nhóm từ danh sách học sinh hiện tại!`
      );
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

      const mappedGroups: ProjectGradingGroupConfig[] = res.groups.map(g => {
        const leaderPart = participants?.find(p => p.studentId === g.leaderStudentId);
        const memberPartIds = g.members.map(
          m => participants?.find(p => p.studentId === m.id)?.id || m.id
        );

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
    } catch {
      setClassGroupsLoadedMsg('⚠️ Không thể tải danh sách nhóm từ lớp học.');
    } finally {
      setIsLoadingClassGroups(false);
    }
  };
  const [assignmentInitialFiles, setAssignmentInitialFiles] = useState<File[]>([]);
  const [isSelectingDir, setIsSelectingDir] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelectingDir(true);
    try {
      const res = await fetch('/api/system/select-folder', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as {
          path?: string | null;
        };
        if (data.path) {
          setAssignmentTargetDir(data.path);
        }
      }
    } catch {
      // bỏ qua
    } finally {
      setIsSelectingDir(false);
    }
  };

  const handleUseDefaultFolder = async () => {
    try {
      const res = await fetch('/api/system/default-submissions-dir');
      if (res.ok) {
        const data = (await res.json()) as {
          defaultDir?: string;
          fallbackDir?: string;
        };
        const dir = data.defaultDir || data.fallbackDir || '';
        setAssignmentTargetDir(dir);
      }
    } catch {
      // bỏ qua
    }
  };

  // Cấu hình điểm số chi tiết từng câu trong Kỳ thi
  const [examCustomPoints, setExamCustomPoints] = useState<Record<string, number>>({});
  const [targetTotalScore, setTargetTotalScore] = useState<number>(10);
  const [bulkPointValue, setBulkPointValue] = useState<number>(0.25);
  const [examPreviewQuestions, setExamPreviewQuestions] = useState<
    Array<{ id: string; stemText: string; type: string; points: number }>
  >([]);
  const [isLoadingExamQuestions, setIsLoadingExamQuestions] = useState(false);

  // Tự động nạp danh sách câu hỏi xem trước và khởi tạo điểm khi mở modal Kỳ thi
  useEffect(() => {
    if (!isConfigModalOpen || selectedActivity?.id !== 'exam') return;

    let isMounted = true;
    setIsLoadingExamQuestions(true);

    const loadQuestions = async () => {
      try {
        let rawList: unknown[] = [];
        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
        }

        if (rawList.length === 0) {
          rawList = [
            { id: 'q1', type: 'mcq4', stem: { text: '2 + 2 = ?' }, points: 5 },
            { id: 'q2', type: 'tf', stem: { text: 'Hà Nội là thủ đô của Việt Nam.' }, points: 5 },
          ];
        }

        const parsed = rawList.map((item, idx) => {
          const q = item as Record<string, unknown>;
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
      } catch {
        // bỏ qua lỗi
      } finally {
        if (isMounted) setIsLoadingExamQuestions(false);
      }
    };

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [isConfigModalOpen, selectedActivity?.id, selectedQuestionSetId, onLoadQuestionSet]);

  const totalCalculatedPoints =
    Math.round(
      examPreviewQuestions.reduce((sum, q) => sum + (examCustomPoints[q.id] ?? q.points), 0) * 100
    ) / 100;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenConfig = (act: ActivityMeta) => {
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

  const handleSubmitStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;

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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
      }
    } else if (selectedActivity.id === 'quiz-live') {
      if (quizMode === 'swiss-duel') {
        try {
          let swissQuestions: unknown[] = [];
          if (selectedQuestionSetId && onLoadQuestionSet) {
            const loaded = await onLoadQuestionSet(selectedQuestionSetId);
            const rawList = Array.isArray(loaded)
              ? loaded
              : (loaded as { questions?: unknown[] })?.questions || [];
            const validRawList = rawList.filter((qItem: unknown) => {
              const q = qItem as Record<string, unknown>;
              const qType = String(q['type'] || 'mcq4');
              // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với Đấu cờ
              return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
            });
            if (validRawList.length > 0) {
              swissQuestions = validRawList.map((qItem: unknown, idx: number) => {
                const q = qItem as Record<string, unknown>;
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
                  ? (q['options'] as unknown[])
                  : ['A', 'B', 'C', 'D'];
                const options = rawOpts.map((o: unknown, oIdx: number) =>
                  parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`)
                );
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
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đấu Cờ Thụy Sỹ');
        }
        return;
      }

      if (quizMode === 'territory-war') {
        try {
          let territoryQuestions: unknown[] = [];
          if (selectedQuestionSetId && onLoadQuestionSet) {
            const loaded = await onLoadQuestionSet(selectedQuestionSetId);
            const rawList = Array.isArray(loaded)
              ? loaded
              : (loaded as { questions?: unknown[] })?.questions || [];
            const validRawList = rawList.filter((qItem: unknown) => {
              const q = qItem as Record<string, unknown>;
              const qType = String(q['type'] || 'mcq4');
              // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với cướp đất
              return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
            });
            if (validRawList.length > 0) {
              territoryQuestions = validRawList.map((qItem: unknown, idx: number) => {
                const q = qItem as Record<string, unknown>;
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
                  (q['contentJson'] as { options?: unknown[] })?.options ||
                  []) as unknown[];
                const options = rawOpts.map((opt, oIdx) =>
                  parseOptionText(opt, `Phương án ${oIdx + 1}`)
                );
                let correctAnswer: unknown = options[0];
                if (typeof q['correct'] === 'number') {
                  correctAnswer = options[q['correct']] || options[0];
                } else if (typeof q['correctAnswer'] !== 'undefined') {
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

          const initialParticipants = prepareTerritoryParticipants(
            participants,
            students,
            territoryBalanceMode
          );

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
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Lãnh Thổ');
        }
        return;
      }

      if (quizMode === 'arcade-duel') {
        try {
          let duelQuestions: Array<{
            id: string;
            stem: string;
            options: string[];
            correctAnswer: number;
            points: number;
            image?: string | undefined;
          }> = [];

          if (selectedQuestionSetId && onLoadQuestionSet) {
            const loaded = await onLoadQuestionSet(selectedQuestionSetId);
            const rawList = Array.isArray(loaded)
              ? loaded
              : (loaded as { questions?: unknown[] })?.questions || [];
            if (rawList.length > 0) {
              duelQuestions = rawList.map((qItem: unknown, idx: number) => {
                const q = qItem as Record<string, unknown>;
                const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
                const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
                const image = typeof q['image'] === 'string' ? q['image'] : undefined;
                const rawOpts = Array.isArray(q['options'])
                  ? (q['options'] as unknown[])
                  : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
                const options = rawOpts.map((o: unknown, oIdx: number) =>
                  parseOptionText(
                    o,
                    ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'][oIdx] ||
                      `Phương án ${oIdx + 1}`
                  )
                );
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
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đối Kháng 1vs1');
        }
        return;
      }

      if (quizMode === 'volleyball-tournament') {
        try {
          let vbQuestions: unknown[] = [];
          if (selectedQuestionSetId && onLoadQuestionSet) {
            const loaded = await onLoadQuestionSet(selectedQuestionSetId);
            const rawList = Array.isArray(loaded)
              ? loaded
              : (loaded as { questions?: unknown[] })?.questions || [];
            const validRawList = rawList.filter((qItem: unknown) => {
              const q = qItem as Record<string, unknown>;
              const qType = String(q['type'] || 'mcq4');
              return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
            });
            if (validRawList.length > 0) {
              vbQuestions = validRawList.map((qItem: unknown, idx: number) => {
                const q = qItem as Record<string, unknown>;
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
                  ? (q['options'] as unknown[])
                  : ['A', 'B', 'C', 'D'];
                const options = rawOpts.map((o: unknown, oIdx: number) =>
                  parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`)
                );
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
            title:
              quizTitle.trim() || volleyballTitle.trim() || 'Giải Đấu Bóng Chuyền (thử nghiệm)',
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
        } catch (err: unknown) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Giải Đấu Bóng Chuyền'
          );
        }
        return;
      }

      if (quizMode === 'faction-duel') {
        try {
          let fdQuestions: unknown[] = [];
          if (selectedQuestionSetId && onLoadQuestionSet) {
            const loaded = await onLoadQuestionSet(selectedQuestionSetId);
            const rawList = Array.isArray(loaded)
              ? loaded
              : (loaded as { questions?: unknown[] })?.questions || [];
            const validRawList = rawList.filter((qItem: unknown) => {
              const q = qItem as Record<string, unknown>;
              const qType = String(q['type'] || 'mcq4');
              return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
            });
            if (validRawList.length > 0) {
              fdQuestions = validRawList.map((qItem: unknown, idx: number) => {
                const q = qItem as Record<string, unknown>;
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
                  ? (q['options'] as unknown[])
                  : ['A', 'B', 'C', 'D'];
                const options = rawOpts.map((o: unknown, oIdx: number) =>
                  parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`)
                );
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
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Xanh Đỏ');
        }
        return;
      }

      try {
        let questionsToUse: Array<{
          id: string;
          type: 'mcq4' | 'tf' | 'tf_group' | 'short' | 'matching' | 'cloze_drag';
          stem: string;
          options?: string[];
          correctAnswer: number | boolean | string | string[] | boolean[] | Record<string, string>;
          timeLimit: number;
          points: number;
          leftItems?: Array<{ id: string; text: string }>;
          rightItems?: Array<{ id: string; text: string }>;
          template?: string;
          blanks?: Array<{ id: string; position?: number }>;
          wordBank?: string[];
          items?: Array<{ id: string; text: string; correct?: boolean }>;
        }> = [];

        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          const rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];

          if (rawList.length > 0) {
            questionsToUse = rawList.map((qItem: unknown, idx: number) => {
              const q = qItem as Record<string, unknown>;
              const stem = parseStemText(q['stem'], `Câu hỏi ${idx + 1}`);
              const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
              const qType = String(q['type'] || 'mcq4');
              const image = extractQuestionImage(q);

              if (qType === 'tf') {
                return {
                  id,
                  type: 'tf' as const,
                  stem,
                  correctAnswer: parseTfCorrectAnswer(q),
                  timeLimit: 20,
                  points: 1000,
                  ...(image ? { image } : {}),
                };
              }

              if (qType === 'tf_group') {
                const rawItems = Array.isArray(q['items'])
                  ? (q['items'] as Array<Record<string, unknown>>)
                  : [];
                const items = rawItems.map((it, itemIdx) => {
                  const text =
                    typeof it.text === 'object' &&
                    it.text &&
                    'text' in (it.text as Record<string, unknown>)
                      ? String((it.text as { text: unknown }).text)
                      : String(it.text || `Ý ${['a', 'b', 'c', 'd'][itemIdx] || itemIdx + 1}`);
                  const correct =
                    typeof it.correct === 'boolean'
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
                  type: 'tf_group' as const,
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
                  type: 'short' as const,
                  stem,
                  correctAnswer: parseShortCorrectAnswer(q),
                  timeLimit: 30,
                  points: 1000,
                  ...(image ? { image } : {}),
                };
              }

              if (qType === 'matching') {
                const rawLeft = Array.isArray(q['leftItems'])
                  ? (q['leftItems'] as Array<{ id: string; text: unknown }>)
                  : [];
                const rawRight = Array.isArray(q['rightItems'])
                  ? (q['rightItems'] as Array<{ id: string; text: unknown }>)
                  : [];
                const leftItems = rawLeft.map(it => ({
                  id: String(it.id),
                  text:
                    typeof it.text === 'object' &&
                    it.text &&
                    'text' in (it.text as Record<string, unknown>)
                      ? String((it.text as { text: unknown }).text)
                      : String(it.text || ''),
                }));
                const rightItems = rawRight.map(it => ({
                  id: String(it.id),
                  text:
                    typeof it.text === 'object' &&
                    it.text &&
                    'text' in (it.text as Record<string, unknown>)
                      ? String((it.text as { text: unknown }).text)
                      : String(it.text || ''),
                }));
                const cAns =
                  typeof q['correctPairs'] === 'object' && q['correctPairs'] !== null
                    ? (q['correctPairs'] as Record<string, string>)
                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                      ? (q['correctAnswer'] as Record<string, string>)
                      : {};

                return {
                  id,
                  type: 'matching' as const,
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
                  ? (q['blanks'] as Array<{ id: string; answer?: string; position?: number }>)
                  : [];
                const blanks = rawBlanks.map(b => {
                  const item: { id: string; position?: number } = { id: String(b.id) };
                  if (typeof b.position === 'number') {
                    item.position = b.position;
                  }
                  return item;
                });
                const wordBank = Array.isArray(q['wordBank']) ? (q['wordBank'] as string[]) : [];
                const correctBlanksMap =
                  typeof q['correctBlanks'] === 'object' && q['correctBlanks'] !== null
                    ? (q['correctBlanks'] as Record<string, string>)
                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                      ? (q['correctAnswer'] as Record<string, string>)
                      : {};
                const cAns: Record<string, string> = { ...correctBlanksMap };
                for (const b of rawBlanks) {
                  if (b.answer && !cAns[b.id]) {
                    cAns[b.id] = b.answer;
                  }
                }

                return {
                  id,
                  type: 'cloze_drag' as const,
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
                ? (q['options'] as unknown[])
                : ['A', 'B', 'C', 'D'];
              const options = rawOpts.map((o: unknown, oIdx: number) =>
                parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`)
              );
              const optionImages = rawOpts.map(o => extractOptionImage(o));
              const hasAnyOptImg = optionImages.some(img => Boolean(img));

              const cAns = parseCorrectAnswer(q, options.length);

              return {
                id,
                type: 'mcq4' as const,
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
      }
    } else if (selectedActivity.id === 'exam') {
      try {
        let examQuestions: unknown[] = [];
        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          const rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
          if (rawList.length > 0) {
            examQuestions = rawList.map((qItem: unknown, idx: number) => {
              const q = qItem as Record<string, unknown>;
              const stem =
                typeof q['stem'] === 'object' && q['stem']
                  ? q['stem']
                  : { text: parseStemText(q['stem'], `Câu hỏi ${idx + 1}`), images: [] };
              const id = q['id'] ? String(q['id']) : `q_${idx + 1}`;
              const qType = String(q['type'] || 'mcq4');
              const points =
                examCustomPoints[id] !== undefined
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
                  ? (q['leftItems'] as Array<{ id: string; text: unknown }>)
                  : [];
                const rawRight = Array.isArray(q['rightItems'])
                  ? (q['rightItems'] as Array<{ id: string; text: unknown }>)
                  : [];
                const leftItems = rawLeft.map(it => ({
                  id: String(it.id),
                  text:
                    typeof it.text === 'object' && it.text
                      ? it.text
                      : { text: String(it.text || ''), images: [] },
                }));
                const rightItems = rawRight.map(it => ({
                  id: String(it.id),
                  text:
                    typeof it.text === 'object' && it.text
                      ? it.text
                      : { text: String(it.text || ''), images: [] },
                }));
                const correctPairs =
                  typeof q['correctPairs'] === 'object' && q['correctPairs'] !== null
                    ? (q['correctPairs'] as Record<string, string>)
                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                      ? (q['correctAnswer'] as Record<string, string>)
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
                  ? (q['blanks'] as Array<{ id: string; answer?: string; hint?: string }>)
                  : [];
                const correctBlanksMap =
                  typeof q['correctBlanks'] === 'object' && q['correctBlanks'] !== null
                    ? (q['correctBlanks'] as Record<string, string>)
                    : typeof q['correctAnswer'] === 'object' && q['correctAnswer'] !== null
                      ? (q['correctAnswer'] as Record<string, string>)
                      : {};
                const blanks = rawBlanks.map(b => {
                  const item: { id: string; answer: string; hint?: string } = {
                    id: String(b.id),
                    answer: String(b.answer || correctBlanksMap[b.id] || ''),
                  };
                  if (b.hint) {
                    item.hint = String(b.hint);
                  }
                  return item;
                });
                const wordBank = Array.isArray(q['wordBank']) ? (q['wordBank'] as string[]) : [];

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
                ? (q['options'] as unknown[])
                : ['A', 'B', 'C', 'D'];
              const options = rawOpts.map((o: unknown) => {
                if (typeof o === 'object' && o) return o;
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu kỳ thi');
      }
    } else if (selectedActivity.id === 'swiss-duel') {
      try {
        let swissQuestions: unknown[] = [];
        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          const rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
          const validRawList = rawList.filter((qItem: unknown) => {
            const q = qItem as Record<string, unknown>;
            const qType = String(q['type'] || 'mcq4');
            // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng kéo ghép không phù hợp với Đấu cờ
            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
          });
          if (validRawList.length > 0) {
            swissQuestions = validRawList.map((qItem: unknown, idx: number) => {
              const q = qItem as Record<string, unknown>;
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
                ? (q['options'] as unknown[])
                : ['A', 'B', 'C', 'D'];
              const options = rawOpts.map((o: unknown, oIdx: number) =>
                parseOptionText(o, ['A', 'B', 'C', 'D'][oIdx] || `Phương án ${oIdx + 1}`)
              );
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đấu Cờ Thụy Sỹ');
      }
    } else if (selectedActivity.id === 'assignment-hub') {
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
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const res = await fetch(
                '/api/sessions/active/activities/current/assignment/materials',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: file.name,
                    size: file.size,
                    mime: file.type || 'application/octet-stream',
                    base64: base64Data,
                  }),
                }
              );
              if (res.ok) {
                const material = await res.json();
                onSendTeacherIntent({
                  type: 'add_material',
                  material,
                });
              }
            } catch (fileErr) {
              console.error('Lỗi khi tải file tài liệu đính kèm ban đầu:', fileErr);
            }
          }
        }

        handleCloseConfig();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Thu - phát bài tập');
      }
    } else if (selectedActivity.id === 'territory-war') {
      try {
        let territoryQuestions: unknown[] = [];
        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          const rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
          const validRawList = rawList.filter((qItem: unknown) => {
            const q = qItem as Record<string, unknown>;
            const qType = String(q['type'] || 'mcq4');
            // Tự động bỏ qua dạng câu chùm đúng sai (tf_group) và các dạng phức hợp không phù hợp với cướp đất
            return qType !== 'tf_group' && qType !== 'matching' && qType !== 'cloze_drag';
          });
          if (validRawList.length > 0) {
            territoryQuestions = validRawList.map((qItem: unknown, idx: number) => {
              const q = qItem as Record<string, unknown>;
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
                (q['contentJson'] as { options?: unknown[] })?.options ||
                []) as unknown[];
              const options = rawOpts.map((opt, oIdx) =>
                parseOptionText(opt, `Phương án ${oIdx + 1}`)
              );
              let correctAnswer: unknown = options[0];
              if (typeof q['correct'] === 'number') {
                correctAnswer = options[q['correct']] || options[0];
              } else if (typeof q['correctAnswer'] !== 'undefined') {
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
        const initialParticipants = prepareTerritoryParticipants(
          participants,
          students,
          territoryBalanceMode
        );

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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đại Chiến Lãnh Thổ');
      }
    } else if (selectedActivity.id === 'project-grading') {
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Chấm điểm Dự án');
      }
    } else if (selectedActivity.id === 'interactive-board') {
      try {
        let worksheetConfig: unknown = undefined;
        if (boardWorksheetEnabled && boardQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(boardQuestionSetId);
          const rawQuestions = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Bảng Tương Tác');
      }
    } else if (selectedActivity.id === 'circuit-race') {
      try {
        let circuitQuestions: unknown[] = [];
        if (selectedQuestionSetId && onLoadQuestionSet) {
          const loaded = await onLoadQuestionSet(selectedQuestionSetId);
          const rawList = Array.isArray(loaded)
            ? loaded
            : (loaded as { questions?: unknown[] })?.questions || [];
          if (rawList.length > 0) {
            circuitQuestions = rawList.map((qItem: unknown, idx: number) => {
              const q = qItem as Record<string, unknown>;
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
                  (q['contentJson'] as { items?: unknown[] })?.items ||
                  []) as unknown[];
                const items = rawItems.map((it: unknown) => {
                  const itRec = it as Record<string, unknown>;
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
                (q['contentJson'] as { options?: unknown[] })?.options ||
                []) as unknown[];
              const options = rawOpts.map((opt, oIdx) =>
                parseOptionText(opt, `Phương án ${oIdx + 1}`)
              );
              const correctIdx = Number(
                q['correct'] ?? (q['answerJson'] as { correct?: unknown })?.correct ?? 0
              );
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
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu Đường Đua Tri Thức');
      }
    } else {
      // Các hoạt động khác mặc định config rỗng
      try {
        await onStartActivity(selectedActivity.id, {});
        handleCloseConfig();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi bắt đầu hoạt động');
      }
    }
  };

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <div className="py-16 text-center text-gray-500" data-testid="activity-panel-loading">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="font-medium">Đang tải thông tin hoạt động...</p>
      </div>
    );
  }

  // 1. Lấy Teacher Panel tương ứng nếu đang có hoạt động chạy
  const PanelComponent = activeRun
    ? (teacherPanelRegistry[activeRun.activityId] as
        React.ComponentType<TeacherPanelComponentProps<unknown>> | undefined)
    : undefined;

  return (
    <>
      {activeRun ? (
        <div className="space-y-4" data-testid="activity-panel-running">
          {/* Banner cửa sổ trình chiếu độc lập */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                🪟
              </div>
              <div>
                <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <span>Hoạt động đang diễn ra trong cửa sổ trình chiếu riêng biệt</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                    2 Màn hình
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Bạn có thể kéo cửa sổ trình chiếu sang máy chiếu/màn hình phụ (nhấn F11 để chiếu
                  toàn màn hình).
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['exam', 'quiz-live', 'swiss-duel'].includes(activeRun.activityId) &&
                !activeRuns.some(r => r.activityId === 'assignment-hub') && (
                  <button
                    type="button"
                    onClick={() => {
                      const assMeta = activities.find(a => a.id === 'assignment-hub') || {
                        id: 'assignment-hub',
                        name: 'Thu - phát bài tập',
                        version: 1,
                        icon: '📁',
                        capabilities: [],
                        rewardTriggers: ['submit'],
                      };
                      handleOpenConfig(assMeta);
                    }}
                    style={{
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
                    }}
                    className="transition hover:bg-emerald-700 shadow-xs"
                    title="Mở thêm Cổng Thu - phát bài tập chạy song song cùng hoạt động hiện tại"
                  >
                    <span>📁</span>
                    <span>Mở thêm Thu - phát bài (Song song)</span>
                  </button>
                )}
              {activeRun.activityId === 'assignment-hub' &&
                !activeRuns.some(r => r.activityId === 'exam') && (
                  <button
                    type="button"
                    onClick={() => {
                      const examMeta = activities.find(a => a.id === 'exam') || {
                        id: 'exam',
                        name: 'Kỳ thi trắc nghiệm',
                        version: 1,
                        icon: '📝',
                        capabilities: ['chat-lock'],
                        rewardTriggers: ['finish', 'high_score'],
                      };
                      handleOpenConfig(examMeta);
                    }}
                    style={{
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
                    }}
                    className="transition hover:bg-blue-700 shadow-xs"
                    title="Khởi chạy thêm Kì thi trắc nghiệm song song cùng Cổng thu bài"
                  >
                    <span>📝</span>
                    <span>Khởi chạy thêm Kì thi (Song song)</span>
                  </button>
                )}
              {onOpenActivityWindow && (
                <button
                  type="button"
                  onClick={onOpenActivityWindow}
                  style={{
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
                  }}
                  className="transition hover:bg-blue-50 shadow-xs"
                  title="Mở lại cửa sổ trình chiếu nếu bạn đã lỡ tắt"
                >
                  <span>🪟 Mở cửa sổ trình chiếu (Màn hình 2)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onEndActivity(activeRun.runId)}
                style={{
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
                }}
                className="transition hover:bg-red-700 shadow-xs"
              >
                <span>⏹️ Kết thúc hoạt động này</span>
              </button>
            </div>
          </div>

          {/* Thanh chuyển đổi Tab khi có nhiều hoạt động song song */}
          {activeRuns && activeRuns.length > 1 && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <div className="text-xs font-extrabold text-slate-500 uppercase px-2 shrink-0">
                Hoạt động song song:
              </div>
              {activeRuns.map(r => {
                const isSelected = r.runId === activeRun.runId;
                const meta = activities.find(a => a.id === r.activityId);
                const icon =
                  meta?.icon ||
                  (r.activityId === 'exam'
                    ? '📝'
                    : r.activityId === 'assignment-hub'
                      ? '📁'
                      : '⚡');
                const name = meta?.name || r.activityId;
                return (
                  <button
                    key={r.runId}
                    type="button"
                    onClick={() => onSelectActiveRun?.(r.runId)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-green-300' : 'bg-green-500'
                      } animate-pulse`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {PanelComponent ? (
            <ErrorBoundary
              fallback={error => (
                <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4 shadow-sm max-w-xl mx-auto my-6">
                  <div className="text-4xl">⚠️</div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Không thể hiển thị bảng điều khiển hoạt động: {activeRun.activityId}
                  </h3>
                  <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg font-mono text-left max-h-24 overflow-y-auto">
                    {error?.message || String(error)}
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
                    >
                      🔄 Tải lại trang
                    </button>
                    <button
                      type="button"
                      onClick={() => onEndActivity(activeRun.runId)}
                      className="min-h-[44px] px-5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition cursor-pointer"
                    >
                      ⏹️ Kết thúc hoạt động
                    </button>
                  </div>
                </div>
              )}
            >
              <PanelComponent
                runId={activeRun.runId}
                state={activeRun.state}
                onSendIntent={onSendTeacherIntent}
                onEndActivity={() => onEndActivity(activeRun.runId)}
              />
            </ErrorBoundary>
          ) : (
            <div className="p-6 bg-white rounded-xl border border-gray-200 text-center space-y-3">
              <h3 className="text-lg font-bold text-gray-800">
                Đang chạy hoạt động: {activeRun.activityId}
              </h3>
              <p className="text-sm text-gray-500">
                Hoạt động này chưa có bảng điều khiển tùy biến trên giao diện này.
              </p>
              <button
                type="button"
                onClick={() => onEndActivity(activeRun.runId)}
                className="min-h-[48px] px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                ⏹️ Kết thúc hoạt động
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6" data-testid="activity-panel-lobby">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hoạt động & Trò chơi tương tác</h2>
            <p className="text-sm text-gray-500">
              Chọn một hoạt động để bắt đầu tương tác thời gian thực với học sinh trong lớp.
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <span className="text-4xl block mb-2">📦</span>
              <p className="text-gray-500 font-medium">Chưa có hoạt động nào được cài đặt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities
                .filter(
                  act =>
                    act.id !== 'swiss-duel' &&
                    act.id !== 'territory-war' &&
                    act.id !== 'arcade-duel' &&
                    act.id !== 'exam'
                )
                .map(act => {
                  const isQuizLive = act.id === 'quiz-live';
                  const displayName = act.name === 'Quiz Live' ? 'Quizz Live' : act.name;
                  const displayIcon = isQuizLive ? '⚡🎮' : act.icon;
                  const displayDescription = isQuizLive
                    ? 'Bộ 5 chế độ trắc nghiệm đỉnh cao: Kahoot nhịp GV, Quizizz tự do, Đấu Cờ Thụy Sỹ, Đại Chiến Lãnh Thổ và Đối Kháng 1vs1.'
                    : act.description;

                  return (
                    <div
                      key={act.id}
                      data-testid={`activity-card-${act.id}`}
                      className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{displayIcon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-800">{displayName}</h3>
                              {isQuizLive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xs">
                                  4 CHẾ ĐỘ
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">Phiên bản v{act.version}</span>
                          </div>
                        </div>

                        {displayDescription && (
                          <p className="text-sm text-gray-600 line-clamp-2">{displayDescription}</p>
                        )}

                        {isQuizLive && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-red-50 text-red-700 border border-red-200 font-semibold">
                              🔴▲ Kahoot
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                              ⚡ Quizizz
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              ♟️ Đấu Cờ Thụy Sỹ
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                              ⚔️ Đại Chiến Lãnh Thổ
                            </span>
                          </div>
                        )}

                        {!isQuizLive && act.rewardTriggers.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {act.rewardTriggers.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                ⭐ {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-2 border-t border-gray-100 flex justify-end">
                        <button
                          type="button"
                          data-testid={`btn-start-${act.id}`}
                          onClick={() => handleOpenConfig(act)}
                          className="min-h-[48px] px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          🚀 Bắt đầu
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modal cấu hình khi bắt đầu Activity (dùng chung cho cả mở mới và chạy song song) */}
      {isConfigModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedActivity.icon}</span>
                <h3 className="text-lg font-bold text-gray-800">
                  Cấu hình: {selectedActivity.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseConfig}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 shrink-0 my-2">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={handleSubmitStart}
              className="flex-1 overflow-y-auto space-y-4 pr-1.5 my-1"
            >
              {selectedActivity.id === 'quick-poll' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Câu hỏi bình chọn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pollQuestion}
                      onChange={e => setPollQuestion(e.target.value)}
                      data-testid="input-poll-question"
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Các phương án lựa chọn (mỗi dòng một phương án){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={pollOptions}
                      onChange={e => setPollOptions(e.target.value)}
                      data-testid="textarea-poll-options"
                      className="w-full p-3 border rounded-lg text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={pollAllowMultiple}
                      onChange={e => setPollAllowMultiple(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Cho phép chọn nhiều phương án
                  </label>
                </>
              ) : selectedActivity.id === 'quiz-live' ? (
                <>
                  {/* 1. Bộ chọn 4 chế độ */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      1. Chọn Chế độ Thi đấu <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Chế độ 1: Kahoot */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'kahoot'
                            ? 'border-red-500 bg-red-50/60 text-red-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="kahoot"
                          checked={quizMode === 'kahoot'}
                          onChange={() => {
                            setQuizMode('kahoot');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(found.title);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-red-600 text-red-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🔴▲</span>
                            <p className="font-bold text-sm text-gray-900">Kahoot Live</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Nhịp theo GV, chiếu màn hình chung, đua top từng câu
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 2: Quizizz */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'quizizz'
                            ? 'border-purple-500 bg-purple-50/60 text-purple-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="quizizz"
                          checked={quizMode === 'quizizz'}
                          onChange={() => {
                            setQuizMode('quizizz');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(found.title);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-purple-600 text-purple-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">⚡🎯</span>
                            <p className="font-bold text-sm text-gray-900">Quizizz Tự do</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Tốc độ cá nhân, bảng leo rank trực tiếp, câu hỏi trên máy HS
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 3: Đấu Cờ Thụy Sỹ */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'swiss-duel'
                            ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="swiss-duel"
                          checked={quizMode === 'swiss-duel'}
                          onChange={() => {
                            setQuizMode('swiss-duel');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(`Đấu Cờ: ${found.title}`);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-amber-600 text-amber-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">♟️⚔️</span>
                            <p className="font-bold text-sm text-gray-900">Đấu Cờ Thụy Sỹ</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Đối kháng 1-1 ghép cặp hệ Thụy Sỹ, ăn cờ khi trả lời đúng
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 4: Đại Chiến Lãnh Thổ */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'territory-war'
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="territory-war"
                          checked={quizMode === 'territory-war'}
                          onChange={() => {
                            setQuizMode('territory-war');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-blue-600 text-blue-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🏰🚩</span>
                            <p className="font-bold text-sm text-gray-900">Đại Chiến Lãnh Thổ</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Chia 2 phe Xanh - Đỏ chiến thuật, chiếm cứ điểm bản đồ
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 5: Đối Kháng 1vs1 */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'arcade-duel'
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="arcade-duel"
                          checked={quizMode === 'arcade-duel'}
                          onChange={() => {
                            setQuizMode('arcade-duel');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(`Đối Kháng 1vs1: ${found.title}`);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-indigo-600 text-indigo-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">⚔️🥊</span>
                            <p className="font-bold text-sm text-gray-900">Đối Kháng 1vs1</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Đấu 1-1 trên màn hình GV, bàn phím chia đôi, hệ thống vật phẩm & 2 chế
                            độ
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 6: Đấu Bóng Chuyền (thử nghiệm) */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'volleyball-tournament'
                            ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="volleyball-tournament"
                          checked={quizMode === 'volleyball-tournament'}
                          onChange={() => {
                            setQuizMode('volleyball-tournament');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(`Bóng Chuyền: ${found.title}`);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-emerald-600 text-emerald-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🏐🏆</span>
                            <p className="font-bold text-sm text-gray-900">
                              Đấu Bóng Chuyền{' '}
                              <span className="text-emerald-700 font-semibold">(thử nghiệm)</span>
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Thi đấu vòng bảng 3 lượt tính điểm sau đó bắt cặp xếp hạng 4 Cúp phân
                            tầng
                          </p>
                        </div>
                      </label>

                      {/* Chế độ 7: Đại Chiến Xanh Đỏ (thử nghiệm) */}
                      <label
                        className={`p-3 border-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                          quizMode === 'faction-duel'
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quizMode"
                          value="faction-duel"
                          checked={quizMode === 'faction-duel'}
                          onChange={() => {
                            setQuizMode('faction-duel');
                            if (selectedQuestionSetId) {
                              const found = questionSets?.find(s => s.id === selectedQuestionSetId);
                              if (found) setQuizTitle(`Đại Chiến Xanh Đỏ: ${found.title}`);
                            }
                          }}
                          className="w-4 h-4 mt-0.5 accent-indigo-600 text-indigo-600 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">⚔️🔵🔴</span>
                            <p className="font-bold text-sm text-gray-900">
                              Đại Chiến Xanh Đỏ{' '}
                              <span className="text-indigo-700 font-semibold">(thử nghiệm)</span>
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            Chia 2 phe cân bằng Elo, lượt sau phe thắng chọn đối thủ (15s), tính
                            điểm trọng số lật kèo
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 2. Tên hoạt động */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      2. Tên hoạt động <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={quizTitle}
                      onChange={e => setQuizTitle(e.target.value)}
                      data-testid="input-quiz-title"
                      placeholder="Ví dụ: Thử thách Tri thức Lớp học"
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    />
                  </div>

                  {/* 3. Bộ câu hỏi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      3. Chọn bộ câu hỏi từ Ngân hàng đề thi
                    </label>
                    <select
                      value={selectedQuestionSetId}
                      onChange={e => {
                        setSelectedQuestionSetId(e.target.value);
                        if (e.target.value) {
                          const found = questionSets?.find(s => s.id === e.target.value);
                          if (found) {
                            if (quizMode === 'swiss-duel') {
                              setQuizTitle(`Đấu Cờ: ${found.title}`);
                            } else if (quizMode === 'territory-war') {
                              setQuizTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                            } else if (quizMode === 'arcade-duel') {
                              setQuizTitle(`Đối Kháng 1vs1: ${found.title}`);
                            } else if (quizMode === 'volleyball-tournament') {
                              setQuizTitle(`Bóng Chuyền: ${found.title}`);
                            } else if (quizMode === 'faction-duel') {
                              setQuizTitle(`Đại Chiến Xanh Đỏ: ${found.title}`);
                            } else {
                              setQuizTitle(found.title);
                            }
                          }
                        }
                      }}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Dùng bộ câu hỏi mẫu mặc định --</option>
                      {questionSets?.map(s => {
                        const isMatrix =
                          s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                        return (
                          <option key={s.id} value={s.id}>
                            {isMatrix ? '🎯 [Ma trận] ' : ''}
                            {s.title} ({s.questionCount || 0} câu) - {s.subject || 'Chung'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 4. Cài đặt chi tiết theo chế độ đã chọn */}
                  <div className="pt-2 border-t border-gray-100">
                    {(quizMode === 'kahoot' || quizMode === 'quizizz') && (
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Tùy chọn chế độ {quizMode === 'kahoot' ? 'Kahoot' : 'Quizizz'}
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={quizShuffleQuestions}
                              onChange={e => setQuizShuffleQuestions(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span>
                              🔀 Đảo thứ tự câu hỏi (mỗi học sinh làm thứ tự khác nhau ở Quizizz)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={quizShuffleOptions}
                              onChange={e => setQuizShuffleOptions(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span>🔀 Đảo thứ tự các phương án lựa chọn (A, B, C, D)</span>
                          </label>
                          {quizMode === 'quizizz' && (
                            <>
                              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={quizEnablePowerUps}
                                  onChange={e => setQuizEnablePowerUps(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span>⚡ Sử dụng vật phẩm hỗ trợ & tấn công (Power-ups)</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={quizShowCorrectAnswer}
                                  onChange={e => setQuizShowCorrectAnswer(e.target.checked)}
                                  className="w-4 h-4 text-purple-600 rounded"
                                />
                                <span>👁️ Cho phép học sinh xem đáp án đúng sau mỗi câu</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={quizAllowReplay}
                                  onChange={e => setQuizAllowReplay(e.target.checked)}
                                  className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span>
                                  🔄 Cho phép học sinh chơi lại (làm lại thêm nhiều lần khi hoàn
                                  thành)
                                </span>
                              </label>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                          {quizMode === 'kahoot'
                            ? '💡 Chế độ Kahoot: Giáo viên điều khiển nhịp từng câu hỏi trên máy tính/màn chiếu. Học sinh nhìn màn chiếu để chọn 1 trong 4 màu tương ứng trên điện thoại.'
                            : '💡 Chế độ Quizizz: Học sinh tự đọc câu hỏi và làm bài trên điện thoại theo tốc độ riêng. Màn chiếu lớn tự động hiển thị bảng xếp hạng leo rank trực tiếp.'}
                        </p>
                      </div>
                    )}

                    {quizMode === 'swiss-duel' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Cài đặt Đấu Cờ Thụy Sỹ
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label
                            className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'questions' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type="radio"
                              name="swissMode"
                              checked={swissMode === 'questions'}
                              onChange={() => setSwissMode('questions')}
                              className="accent-amber-600"
                            />
                            <div>
                              <span className="block text-sm font-bold">♟️ Theo kho câu hỏi</span>
                              <span className="block text-[11px] text-gray-500 font-normal">
                                Thi hết câu hỏi trong đề thì dừng
                              </span>
                            </div>
                          </label>
                          <label
                            className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'time' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type="radio"
                              name="swissMode"
                              checked={swissMode === 'time'}
                              onChange={() => setSwissMode('time')}
                              className="accent-amber-600"
                            />
                            <div>
                              <span className="block text-sm font-bold">⏱️ Giới hạn thời gian</span>
                              <span className="block text-[11px] text-gray-500 font-normal">
                                Đếm ngược {swissTimeLimitMinutes} phút
                              </span>
                            </div>
                          </label>
                        </div>
                        {swissMode === 'time' && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Thời lượng trận đấu (phút)
                            </label>
                            <select
                              value={swissTimeLimitMinutes}
                              onChange={e => setSwissTimeLimitMinutes(Number(e.target.value))}
                              className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                              <option value={5}>5 phút (Nhanh)</option>
                              <option value={10}>10 phút (Chuẩn)</option>
                              <option value={15}>15 phút</option>
                              <option value={20}>20 phút</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Thời gian suy nghĩ mỗi câu hỏi
                          </label>
                          <select
                            value={swissTimeLimitPerQuestion}
                            onChange={e => setSwissTimeLimitPerQuestion(Number(e.target.value))}
                            className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                          >
                            <option value={15}>15 giây</option>
                            <option value={20}>20 giây</option>
                            <option value={30}>30 giây (Mặc định)</option>
                            <option value={45}>45 giây</option>
                            <option value={60}>60 giây</option>
                          </select>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-amber-200/60">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={swissShuffleQuestions}
                              onChange={e => setSwissShuffleQuestions(e.target.checked)}
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span>🔀 Đảo thứ tự câu hỏi</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={swissShuffleOptions}
                              onChange={e => setSwissShuffleOptions(e.target.checked)}
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span>🔀 Đảo thứ tự các phương án lựa chọn (A, B, C, D)</span>
                          </label>
                        </div>
                        <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                          💡 Hệ thống tự động ghép cặp học sinh 1-1 theo hệ Thụy Sỹ. Trả lời đúng sẽ
                          ăn cờ đối thủ, tích điểm xếp hạng toàn lớp!
                        </p>
                      </div>
                    )}

                    {quizMode === 'territory-war' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Cài đặt Đại Chiến Lãnh Thổ
                        </label>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Kích thước bản đồ chiến lược
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setTerritoryMapSize('5x5')}
                              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                                territoryMapSize === '5x5'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-sm font-bold">5x5</span>
                              <span className="text-[10px] text-gray-500 block">25 ô (Nhanh)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTerritoryMapSize('7x7')}
                              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                                territoryMapSize === '7x7'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-sm font-bold">7x7 ⭐</span>
                              <span className="text-[10px] text-gray-500 block">
                                49 ô (Cân bằng)
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTerritoryMapSize('9x9')}
                              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                                territoryMapSize === '9x9'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-sm font-bold">9x9</span>
                              <span className="text-[10px] text-gray-500 block">81 ô (Lớn)</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Thời lượng trận đấu (phút)
                            </label>
                            <select
                              value={territoryTimeLimitMinutes}
                              onChange={e => setTerritoryTimeLimitMinutes(Number(e.target.value))}
                              className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                              <option value={3}>3 phút</option>
                              <option value={5}>5 phút (Chuẩn)</option>
                              <option value={7}>7 phút</option>
                              <option value={10}>10 phút</option>
                              <option value={15}>15 phút</option>
                            </select>
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                checked={territoryEnableSuddenDeath}
                                onChange={e => setTerritoryEnableSuddenDeath(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span>⚡ Bật Sudden Death</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Phương thức phân chia quân đội 2 phe
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setTerritoryBalanceMode('elo')}
                              className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                territoryBalanceMode === 'elo'
                                  ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-sm'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-xs font-bold">⚖️ Cân bằng Elo</span>
                              <span className="text-[10px] text-amber-700 block">
                                (Khuyên dùng)
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTerritoryBalanceMode('random')}
                              className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                territoryBalanceMode === 'random'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-sm'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-xs font-bold">🎲 Ngẫu nhiên</span>
                              <span className="text-[10px] text-gray-500 block">50/50</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTerritoryBalanceMode('groups')}
                              className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                territoryBalanceMode === 'groups'
                                  ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold shadow-sm'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="block text-xs font-bold">👥 Theo tổ/nhóm</span>
                              <span className="text-[10px] text-purple-700 block">Có sẵn</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                          💡 Hệ thống tự động chia học sinh / nhóm vào 2 phe Xanh và Đỏ. Trả lời
                          đúng để chiếm cứ điểm bản đồ!
                        </p>
                      </div>
                    )}

                    {quizMode === 'arcade-duel' && (
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Cài đặt Đối Kháng 1vs1
                        </label>

                        {/* Chọn chế độ chơi */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Chế độ thi đấu
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label
                              className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                                arcadeDuelMode === 'sync_turn'
                                  ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900 shadow-xs'
                                  : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name="arcadeDuelMode"
                                checked={arcadeDuelMode === 'sync_turn'}
                                onChange={() => setArcadeDuelMode('sync_turn')}
                                className="mt-0.5 accent-indigo-600"
                              />
                              <div>
                                <span className="block text-sm font-bold">
                                  🎯 Cùng trả lời (Chia 3)
                                </span>
                                <span className="block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                                  Trên là câu hỏi chung, dưới chia 2 bên chọn đáp án bí mật & lật
                                  bài cùng lúc
                                </span>
                              </div>
                            </label>

                            <label
                              className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                                arcadeDuelMode === 'speed_race'
                                  ? 'bg-amber-50 border-amber-500 font-bold text-amber-900 shadow-xs'
                                  : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name="arcadeDuelMode"
                                checked={arcadeDuelMode === 'speed_race'}
                                onChange={() => setArcadeDuelMode('speed_race')}
                                className="mt-0.5 accent-amber-600"
                              />
                              <div>
                                <span className="block text-sm font-bold">
                                  🏎️ Đua tốc độ (Chia đôi 50/50)
                                </span>
                                <span className="block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                                  Tiến độ độc lập, ai nhanh và đúng thì qua câu. Chọn sai bị dừng
                                  1.5s
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Thời gian & Đảo phương án */}
                        <div className="grid grid-cols-2 gap-3 items-end">
                          {arcadeDuelMode === 'sync_turn' ? (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Thời gian mỗi câu hỏi
                              </label>
                              <select
                                value={arcadeDuelTimeLimitPerQuestion}
                                onChange={e =>
                                  setArcadeDuelTimeLimitPerQuestion(Number(e.target.value))
                                }
                                className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                              >
                                <option value={10}>10 giây</option>
                                <option value={15}>15 giây (Mặc định)</option>
                                <option value={20}>20 giây</option>
                                <option value={30}>30 giây</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Tổng thời gian trận đấu
                              </label>
                              <select
                                value={arcadeDuelTotalTimeLimit}
                                onChange={e => setArcadeDuelTotalTimeLimit(Number(e.target.value))}
                                className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                              >
                                <option value={60}>60 giây (1 phút)</option>
                                <option value={90}>90 giây (1.5 phút - Mặc định)</option>
                                <option value={120}>120 giây (2 phút)</option>
                                <option value={180}>180 giây (3 phút)</option>
                              </select>
                            </div>
                          )}

                          <div className="pb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                checked={arcadeDuelShuffleOptions}
                                onChange={e => setArcadeDuelShuffleOptions(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span>🔀 Đảo phương án chống nhìn trộm</span>
                            </label>
                          </div>
                        </div>

                        {/* Tùy chọn vật phẩm (Power-ups) */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-800">
                            <input
                              type="checkbox"
                              checked={arcadeDuelEnablePowerUps}
                              onChange={e => setArcadeDuelEnablePowerUps(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span>⚡ Kích hoạt vật phẩm hỗ trợ & tấn công (Power-ups)</span>
                          </label>

                          {arcadeDuelEnablePowerUps ? (
                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Điều kiện nhận vật phẩm
                                </label>
                                <select
                                  value={arcadeDuelDropCondition}
                                  onChange={e =>
                                    setArcadeDuelDropCondition(Number(e.target.value) as 1 | 2)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 border rounded-lg text-sm bg-white"
                                >
                                  <option value={1}>Đúng 1 câu nhận ngay</option>
                                  <option value={2}>Đúng 2 câu liên tiếp (Mặc định)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Sức chứa túi đồ
                                </label>
                                <select
                                  value={arcadeDuelInventoryCapacity}
                                  onChange={e =>
                                    setArcadeDuelInventoryCapacity(Number(e.target.value) as 2 | 3)
                                  }
                                  className="w-full min-h-[40px] px-3 py-1.5 border rounded-lg text-sm bg-white"
                                >
                                  <option value={2}>Tối đa 2 vật phẩm (Mặc định)</option>
                                  <option value={3}>Tối đa 3 vật phẩm</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 pl-6">
                              Thi đấu thuần kiến thức, không sử dụng vật phẩm và phím chức năng.
                            </p>
                          )}
                        </div>

                        {/* Hướng dẫn phím bấm */}
                        <div className="p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-700 text-xs space-y-1.5 font-mono">
                          <p className="font-bold text-amber-300">⌨️ BỐ TRÍ PHÍM BÀN PHÍM GV:</p>
                          <p>
                            🔵 <span className="text-blue-300 font-bold">Đội Xanh:</span> Đáp án{' '}
                            <span className="text-white font-bold bg-slate-800 px-1 rounded">
                              A - S - D - F
                            </span>
                            {arcadeDuelEnablePowerUps ? (
                              <>
                                {' '}
                                | Dùng vật phẩm:{' '}
                                <span className="text-amber-300 font-bold bg-slate-800 px-1 rounded">
                                  Q
                                </span>
                              </>
                            ) : null}
                          </p>
                          <p>
                            🔴 <span className="text-red-300 font-bold">Đội Đỏ:</span> Đáp án{' '}
                            <span className="text-white font-bold bg-slate-800 px-1 rounded">
                              1 - 2 - 3 - 4
                            </span>
                            {arcadeDuelEnablePowerUps ? (
                              <>
                                {' '}
                                | Dùng vật phẩm:{' '}
                                <span className="text-amber-300 font-bold bg-slate-800 px-1 rounded">
                                  5
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    )}

                    {quizMode === 'volleyball-tournament' && (
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Cài đặt Đấu Bóng Chuyền (thử nghiệm)
                        </label>

                        {/* Chọn chế độ chia bảng */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Quy mô bảng đấu
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <label
                              className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                                volleyballPoolMode === 'auto'
                                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="volleyballPoolMode"
                                checked={volleyballPoolMode === 'auto'}
                                onChange={() => setVolleyballPoolMode('auto')}
                                className="accent-emerald-600 mt-0.5"
                              />
                              <div>
                                <span className="block text-sm font-bold">✨ Tự động</span>
                                <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                                  Tự chia 4 hoặc 8 bảng tùy sĩ số
                                </span>
                              </div>
                            </label>

                            <label
                              className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                                volleyballPoolMode === '4_pools'
                                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="volleyballPoolMode"
                                checked={volleyballPoolMode === '4_pools'}
                                onChange={() => setVolleyballPoolMode('4_pools')}
                                className="accent-emerald-600 mt-0.5"
                              />
                              <div>
                                <span className="block text-sm font-bold">4 Bảng (A-D)</span>
                                <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                                  Thích hợp cho 15 - 23 học sinh
                                </span>
                              </div>
                            </label>

                            <label
                              className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                                volleyballPoolMode === '8_pools'
                                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 shadow-xs'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="volleyballPoolMode"
                                checked={volleyballPoolMode === '8_pools'}
                                onChange={() => setVolleyballPoolMode('8_pools')}
                                className="accent-emerald-600 mt-0.5"
                              />
                              <div>
                                <span className="block text-sm font-bold">8 Bảng (A-H)</span>
                                <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                                  Thích hợp cho 24 - 40 học sinh
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Thời gian làm mỗi câu */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Thời gian suy nghĩ mỗi câu hỏi (giây)
                          </label>
                          <select
                            value={volleyballTimeLimitPerQuestion}
                            onChange={e =>
                              setVolleyballTimeLimitPerQuestion(Number(e.target.value))
                            }
                            className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white"
                          >
                            <option value={15}>15 giây (Nhanh)</option>
                            <option value={20}>20 giây</option>
                            <option value={30}>30 giây (Mặc định)</option>
                            <option value={45}>45 giây</option>
                            <option value={60}>60 giây (Nhiều bài tập tính toán)</option>
                          </select>
                        </div>

                        {/* Tùy chọn đảo câu hỏi & phương án */}
                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={volleyballShuffleQuestions}
                              onChange={e => setVolleyballShuffleQuestions(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span>🔀 Đảo thứ tự câu hỏi qua các vòng</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={volleyballShuffleOptions}
                              onChange={e => setVolleyballShuffleOptions(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span>🔀 Đảo phương án A, B, C, D</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {quizMode === 'faction-duel' && (
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">
                          4. Cài đặt Đại Chiến Xanh Đỏ (thử nghiệm)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Số câu hỏi mỗi trận (1 - 5 câu)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={factionQuestionsPerMatch}
                              onChange={e =>
                                setFactionQuestionsPerMatch(
                                  Math.max(1, Math.min(5, Number(e.target.value) || 2))
                                )
                              }
                              className="w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                              Mặc định: 2 câu hỏi/trận 1v1
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Số vòng đấu toàn trận (1 - 20 vòng)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={factionTotalRounds}
                              onChange={e =>
                                setFactionTotalRounds(
                                  Math.max(1, Math.min(20, Number(e.target.value) || 5))
                                )
                              }
                              className="w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Mặc định: 5 vòng đấu</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Thời gian làm bài mỗi câu (giây)
                            </label>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={factionTimeLimitPerQuestion}
                              onChange={e =>
                                setFactionTimeLimitPerQuestion(
                                  Math.max(5, Math.min(120, Number(e.target.value) || 20))
                                )
                              }
                              className="w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Thời gian chọn đối thủ (giây)
                            </label>
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={factionPickPhaseSeconds}
                              onChange={e =>
                                setFactionPickPhaseSeconds(
                                  Math.max(5, Math.min(60, Number(e.target.value) || 15))
                                )
                              }
                              className="w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm bg-white"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                              Mặc định: 15 giây đếm ngược
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={factionShuffleQuestions}
                              onChange={e => setFactionShuffleQuestions(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span>🔀 Đảo thứ tự câu hỏi ngẫu nhiên</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={factionShuffleOptions}
                              onChange={e => setFactionShuffleOptions(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span>🔀 Đảo phương án A, B, C, D độc lập (chống nhìn bài)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={factionAllowRecycle}
                              onChange={e => setFactionAllowRecycle(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span>🔄 Tự động xoay vòng lấy lại câu cũ khi hết kho đề</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : selectedActivity.id === 'exam' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lớp lưu trữ báo cáo kỳ thi <span className="text-red-500">*</span>
                    </label>
                    {sessionClassId ? (
                      <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>🏫</span>
                          <span>
                            Lớp: {classes.find(c => c.id === sessionClassId)?.name || 'Hiện tại'}
                          </span>
                        </div>
                        <span className="text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100">
                          Tự động lưu vào Báo cáo theo ca
                        </span>
                      </div>
                    ) : (
                      <div>
                        <select
                          value={examClassId}
                          onChange={e => setExamClassId(e.target.value)}
                          className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white font-medium"
                        >
                          <option value="">-- Chọn lớp để lưu báo cáo kỳ thi --</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>
                              🏫 Lớp {c.name} ({c.year ? `Niên khóa ${c.year}` : 'Chung'})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5">
                          💡 Phiên này đang là <strong>Phiên tự do</strong>. Chọn lớp để toàn bộ kết
                          quả thí sinh được lưu chính xác vào{' '}
                          <strong>Báo Cáo & Quản Lý Kỳ Thi Theo Ca</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên kỳ thi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      data-testid="input-exam-title"
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chọn bộ đề thi từ Ngân hàng câu hỏi
                    </label>
                    <select
                      value={selectedQuestionSetId}
                      onChange={e => {
                        setSelectedQuestionSetId(e.target.value);
                        if (e.target.value) {
                          const found = questionSets?.find(s => s.id === e.target.value);
                          if (found) setExamTitle(found.title);
                        }
                      }}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Dùng bộ đề thi mẫu mặc định --</option>
                      {questionSets?.map(s => {
                        const isMatrix =
                          s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                        return (
                          <option key={s.id} value={s.id}>
                            {isMatrix ? '🎯 [Ma trận] ' : ''}
                            {s.title} ({s.questionCount || 0} câu) - {s.subject || 'Chung'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian làm bài (phút) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        required
                        value={examDuration}
                        onChange={e => setExamDuration(Number(e.target.value))}
                        data-testid="input-exam-duration"
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mật khẩu kỳ thi (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={examPassword}
                        onChange={e => setExamPassword(e.target.value)}
                        placeholder="Để trống nếu không đặt"
                        data-testid="input-exam-password"
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Khối Cấu hình Điểm số từng câu hỏi (Yêu cầu 6) */}
                  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">⚖️</span>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                          Phân bổ & Cấu hình điểm số câu hỏi
                        </h4>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Tổng: {totalCalculatedPoints} điểm ({examPreviewQuestions.length} câu)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Bạn có thể chia đều điểm theo tổng điểm mong muốn (ví dụ đề 7 điểm), gán nhanh
                      điểm cho tất cả câu, hoặc chỉnh sửa thủ công từng câu cụ thể.
                    </p>

                    {/* Bộ công cụ chia nhanh */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                      {/* Công cụ 1: Chia đều tổng điểm */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-xs">
                        <label className="text-xs font-bold text-slate-700">
                          ➗ Chia đều theo Tổng điểm mong muốn
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.25"
                            min="0.5"
                            value={targetTotalScore}
                            onChange={e => setTargetTotalScore(Number(e.target.value))}
                            className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold"
                            placeholder="Vd: 7 hoặc 10"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (examPreviewQuestions.length === 0) return;
                              const pointPerQ =
                                Math.round((targetTotalScore / examPreviewQuestions.length) * 100) /
                                100;
                              const updated: Record<string, number> = {};
                              examPreviewQuestions.forEach(q => {
                                updated[q.id] = pointPerQ;
                              });
                              setExamCustomPoints(updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Chia đều (
                            {examPreviewQuestions.length > 0
                              ? Math.round((targetTotalScore / examPreviewQuestions.length) * 100) /
                                100
                              : 0}
                            đ/câu)
                          </button>
                        </div>
                      </div>

                      {/* Công cụ 2: Áp dụng cùng 1 mức điểm cho tất cả các câu */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-xs">
                        <label className="text-xs font-bold text-slate-700">
                          ✨ Gán cùng điểm cho tất cả các câu
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={bulkPointValue}
                            onChange={e => setBulkPointValue(Number(e.target.value))}
                            className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold"
                            placeholder="Vd: 0.25"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = Number(bulkPointValue) || 0;
                              const updated: Record<string, number> = {};
                              examPreviewQuestions.forEach(q => {
                                updated[q.id] = val;
                              });
                              setExamCustomPoints(updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Áp dụng tất cả
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách câu hỏi chi tiết để chỉnh sửa thủ công từng câu */}
                    <div className="pt-1">
                      <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Chỉnh sửa điểm từng câu:</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (Nhập số điểm trực tiếp vào từng ô)
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-xs">
                        {isLoadingExamQuestions ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Đang nạp danh sách câu hỏi...
                          </div>
                        ) : examPreviewQuestions.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Chưa có câu hỏi nào.
                          </div>
                        ) : (
                          examPreviewQuestions.map((q, qIdx) => {
                            const curPoint =
                              examCustomPoints[q.id] !== undefined
                                ? examCustomPoints[q.id]
                                : q.points;
                            return (
                              <div
                                key={q.id}
                                className="p-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="font-extrabold text-slate-700 shrink-0">
                                    Câu {qIdx + 1}:
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                                    {q.type}
                                  </span>
                                  <span className="text-slate-600 truncate" title={q.stemText}>
                                    {q.stemText}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={curPoint}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      setExamCustomPoints(prev => ({
                                        ...prev,
                                        [q.id]: isNaN(val) ? 0 : Math.max(0, val),
                                      }));
                                    }}
                                    className="w-16 px-1.5 py-1 border border-slate-300 rounded-lg text-center font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-slate-500 text-[11px]">đ</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={examShuffleQuestions}
                        onChange={e => setExamShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>🔀 Xáo trộn thứ tự câu hỏi theo từng học sinh</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={examShuffleOptions}
                        onChange={e => setExamShuffleOptions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>🔀 Xáo trộn đáp án các câu trắc nghiệm (A, B, C, D)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={examAllowViewScore}
                        onChange={e => setExamAllowViewScore(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>📊 Cho phép học sinh xem điểm số sau khi nộp bài</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={examAllowViewReview}
                        onChange={e => setExamAllowViewReview(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>🔍 Cho phép học sinh xem lại bài làm & đáp án sau khi nộp</span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border">
                    🔒 Khi bật mật khẩu, học sinh bắt buộc phải nhập đúng mật khẩu để mở khóa đề
                    thi. Hệ thống tự động chấm điểm theo bản gốc đề thi.
                  </p>
                </>
              ) : selectedActivity.id === 'swiss-duel' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên giải đấu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={swissTitle}
                      onChange={e => setSwissTitle(e.target.value)}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chọn bộ câu hỏi từ Ngân hàng đề thi
                    </label>
                    <select
                      value={selectedQuestionSetId}
                      onChange={e => {
                        setSelectedQuestionSetId(e.target.value);
                        if (e.target.value) {
                          const found = questionSets?.find(s => s.id === e.target.value);
                          if (found) setSwissTitle(`Đấu Cờ: ${found.title}`);
                        }
                      }}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Sử dụng câu hỏi mẫu mặc định --</option>
                      {questionSets.map(set => (
                        <option key={set.id} value={set.id}>
                          {set.title} ({set.questionCount || 0} câu)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chế độ tổ chức vòng đấu
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'questions' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="radio"
                          name="swissMode"
                          checked={swissMode === 'questions'}
                          onChange={() => setSwissMode('questions')}
                          className="accent-amber-600"
                        />
                        <div>
                          <span className="block text-sm font-bold">♟️ Theo kho câu hỏi</span>
                          <span className="block text-[11px] text-gray-500 font-normal">
                            Thi hết câu hỏi trong đề thì dừng (cấm gặp lại)
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition ${swissMode === 'time' ? 'bg-amber-50 border-amber-400 font-bold text-amber-900' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="radio"
                          name="swissMode"
                          checked={swissMode === 'time'}
                          onChange={() => setSwissMode('time')}
                          className="accent-amber-600"
                        />
                        <div>
                          <span className="block text-sm font-bold">⏱️ Theo thời gian</span>
                          <span className="block text-[11px] text-gray-500 font-normal">
                            Đấu trường liên tục (cho phép gặp lại & lặp câu hỏi)
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {swissMode === 'time' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời lượng giải đấu (phút)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={swissTimeLimitMinutes}
                        onChange={e =>
                          setSwissTimeLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 10))
                        }
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian suy nghĩ mỗi câu hỏi (giây)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={swissTimeLimitPerQuestion}
                      onChange={e =>
                        setSwissTimeLimitPerQuestion(
                          Math.max(5, parseInt(e.target.value, 10) || 30)
                        )
                      }
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-amber-200/60">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={swissShuffleQuestions}
                        onChange={e => setSwissShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span>🔀 Đảo thứ tự câu hỏi</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={swissShuffleOptions}
                        onChange={e => setSwissShuffleOptions(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span>🔀 Đảo thứ tự các phương án lựa chọn (A, B, C, D)</span>
                    </label>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="font-bold">⚖️ Quy tắc tính điểm cờ & Nhịp đấu:</div>
                    <div>
                      • Thắng trận (2 câu): <b>+2 điểm</b> • Hòa trận: <b>+1 điểm</b> • Thua trận:{' '}
                      <b>0 điểm</b>
                    </div>
                    <div>• Bằng câu đúng là Hòa tuyệt đối.</div>
                    <div>
                      • Suất BYE (khi lẻ người): Tự động ưu tiên học sinh nhóm cuối cùng chưa từng
                      nhận BYE (+2đ). Nếu nhóm cuối đều đã nhận thì reset để cho nhận lại.
                    </div>
                    <div>
                      • Khi người cuối cùng nộp bài: Hệ thống tự động đếm ngược 10 giây để bốc thăm
                      vòng kế tiếp.
                    </div>
                  </div>
                </>
              ) : selectedActivity.id === 'assignment-hub' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên đợt thu bài <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={assignmentTitle}
                      onChange={e => setAssignmentTitle(e.target.value)}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      placeholder="Ví dụ: Thực hành Tin học buổi 3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hướng dẫn / Dặn dò của giáo viên
                    </label>
                    <textarea
                      rows={3}
                      value={assignmentInstructions}
                      onChange={e => setAssignmentInstructions(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Ví dụ: Các em làm bài thực hành theo đề bài đính kèm, lưu file định dạng Word hoặc Excel và nộp lại trước khi hết giờ."
                    />
                  </div>

                  {/* BẢNG THÔNG BÁO: NƠI LƯU BÀI NỘP TRÊN MÁY TÍNH */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 p-4 rounded-xl border-2 border-blue-300 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
                        <span className="text-lg">📁</span>
                        <span>Nơi lưu bài nộp của học sinh trên máy tính</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={assignmentTargetDir}
                        onChange={e => {
                          setAssignmentTargetDir(e.target.value);
                        }}
                        placeholder="VD: C:\Users\Admin\Desktop\BaiThucHanh..."
                        className="flex-1 min-h-[44px] px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-gray-800 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        disabled={isSelectingDir}
                        className="min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-sm transition flex items-center gap-1.5"
                      >
                        <span>📁</span>
                        <span>{isSelectingDir ? 'Đang mở...' : 'Chọn thư mục khác...'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleUseDefaultFolder}
                        className="min-h-[44px] px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
                      >
                        Desktop
                      </button>
                    </div>

                    <p className="text-[11px] text-blue-800/80 leading-relaxed">
                      💡 Bài nộp của học sinh (Word, Excel, ảnh, PDF...) sẽ được tự động lưu trực
                      tiếp vào thư mục được chọn này trên máy tính của bạn.
                    </p>
                  </div>

                  {/* Đính kèm tài liệu phát xuống trước cho học sinh */}
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                          <span>📢</span> Tài liệu phát xuống cho học sinh
                        </label>
                        <p className="text-[11px] text-blue-700/80">
                          Đính kèm file đề bài, hình ảnh, tài liệu để tự động phát xuống ngay khi
                          bắt đầu.
                        </p>
                      </div>
                      <label className="min-h-[36px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0">
                        <span>➕</span> Chọn tệp đính kèm
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={e => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setAssignmentInitialFiles(prev => [...prev, ...files]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>

                    {assignmentInitialFiles.length === 0 ? (
                      <p className="text-xs text-blue-600/70 italic bg-white/70 p-2.5 rounded-lg border border-dashed border-blue-200 text-center">
                        Chưa chọn tệp đính kèm nào. (Thầy/Cô cũng có thể phát thêm tài liệu bất cứ
                        lúc nào trong bảng điều khiển).
                      </p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {assignmentInitialFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200 text-xs shadow-2xs"
                          >
                            <span
                              className="font-semibold text-gray-800 truncate"
                              title={file.name}
                            >
                              📄 {file.name} ({Math.round(file.size / 1024)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setAssignmentInitialFiles(prev => prev.filter((_, i) => i !== idx))
                              }
                              className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5 cursor-pointer rounded hover:bg-red-50"
                              title="Bỏ tệp này"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Định dạng tệp cho phép nộp
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAssignmentAllowedExts([])}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                            assignmentAllowedExts.length === 0
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Mọi loại tệp (Mặc định)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAssignmentAllowedExts(['.docx', '.xlsx', '.pptx', '.pdf'])
                          }
                          className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition cursor-pointer"
                        >
                          Chỉ Office / PDF
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Word (.docx)', ext: '.docx' },
                        { label: 'Excel (.xlsx)', ext: '.xlsx' },
                        { label: 'PowerPoint (.pptx)', ext: '.pptx' },
                        { label: 'Tệp PDF (.pdf)', ext: '.pdf' },
                        { label: 'Nén (.zip, .rar)', ext: '.zip' },
                        { label: 'Hình ảnh (.png, .jpg)', ext: '.png' },
                        { label: 'Văn bản / Code (.txt, .py)', ext: '.txt' },
                      ].map(item => {
                        const checked = assignmentAllowedExts.includes(item.ext);
                        return (
                          <label
                            key={item.ext}
                            className={`p-2 border rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition ${
                              checked
                                ? 'bg-blue-50 border-blue-300 font-semibold text-blue-800'
                                : 'bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setAssignmentAllowedExts(prev => [...prev, item.ext]);
                                } else {
                                  setAssignmentAllowedExts(prev =>
                                    prev.filter(x => x !== item.ext)
                                  );
                                }
                              }}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {assignmentAllowedExts.length === 0 ? (
                      <p className="text-[11px] text-green-700 font-medium mt-1.5 flex items-center gap-1">
                        <span>✅</span> Mặc định: Cho phép học sinh nộp mọi loại tệp (Word, Excel,
                        ảnh, code, file nén...).
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                        <span>ℹ️</span> Đang giới hạn chỉ nhận các định dạng:{' '}
                        {assignmentAllowedExts.join(', ')}.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dung lượng tối đa mỗi tệp (MB)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={assignmentMaxFileSizeMb}
                        onChange={e =>
                          setAssignmentMaxFileSizeMb(
                            Math.max(1, parseInt(e.target.value, 10) || 50)
                          )
                        }
                        className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời hạn nộp bài (phút, tùy chọn)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={assignmentDeadlineMinutes ?? ''}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          setAssignmentDeadlineMinutes(val > 0 ? val : null);
                        }}
                        placeholder="Không giới hạn thời gian"
                        className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={assignmentAllowResubmit}
                        onChange={e => setAssignmentAllowResubmit(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>🔄 Cho phép học sinh nộp lại (ghi đè bài mới) trước khi đóng cổng</span>
                    </label>
                  </div>
                </>
              ) : selectedActivity.id === 'object-camera' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <span>📱</span> Biến điện thoại thành Camera vật thể thông minh
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Khi bấm bắt đầu, hệ thống sẽ mở bảng điều khiển và mã QR kết nối. Giáo viên
                      dùng điện thoại quét mã để chụp bài làm của học sinh bắn ngay lên máy tính,
                      xoay cắt phóng to, dùng bút đỏ sửa bài và phát sóng đồng bộ tức thời xuống
                      cổng học sinh & máy chiếu!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    <span>🛡️</span>
                    <span>
                      <strong>Bảo mật cao:</strong> Chỉ giáo viên quét mã trên máy tính mới có quyền
                      chụp ảnh. Toàn bộ ảnh tạm sẽ tự động được dọn sạch khi đóng tiết học.
                    </span>
                  </div>
                </div>
              ) : selectedActivity.id === 'territory-war' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên cuộc chiến <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={territoryTitle}
                      onChange={e => setTerritoryTitle(e.target.value)}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      placeholder="Ví dụ: Đại Chiến Lãnh Thổ - Ôn Tập Chương 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chọn bộ câu hỏi từ kho đề
                    </label>
                    <select
                      value={selectedQuestionSetId}
                      onChange={e => {
                        setSelectedQuestionSetId(e.target.value);
                        if (e.target.value) {
                          const found = questionSets?.find(s => s.id === e.target.value);
                          if (found) setTerritoryTitle(`Đại Chiến Lãnh Thổ: ${found.title}`);
                        }
                      }}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Sử dụng câu hỏi mẫu mặc định --</option>
                      {questionSets?.map(s => {
                        const isMatrix =
                          s.tags?.some(t => t.toLowerCase().includes('ma trận')) || false;
                        return (
                          <option key={s.id} value={s.id}>
                            {isMatrix ? '🎯 [Ma trận] ' : ''}
                            {s.title} ({s.questionCount || 0} câu)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kích thước bản đồ chiến lược
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTerritoryMapSize('5x5')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                          territoryMapSize === '5x5'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="block text-base">5x5</span>
                        <span className="text-[11px] text-gray-500 block">25 ô (Nhanh gọn)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTerritoryMapSize('7x7')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                          territoryMapSize === '7x7'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="block text-base">7x7 ⭐</span>
                        <span className="text-[11px] text-gray-500 block">49 ô (Cân bằng)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTerritoryMapSize('9x9')}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                          territoryMapSize === '9x9'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="block text-base">9x9</span>
                        <span className="text-[11px] text-gray-500 block">81 ô (Đại chiến)</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời lượng trận đấu (phút)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={territoryTimeLimitMinutes}
                      onChange={e =>
                        setTerritoryTimeLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 5))
                      }
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-amber-950">
                      <input
                        type="checkbox"
                        checked={territoryEnableSuddenDeath}
                        onChange={e => setTerritoryEnableSuddenDeath(e.target.checked)}
                        className="rounded-sm text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>👑 Bật luật Sudden Death (Thắng Ngay Lập Tức)</span>
                    </label>
                    <p className="text-xs text-amber-800/90 leading-relaxed pl-6">
                      (Mặc định tắt) Nếu bật: Phe nào công phá được{' '}
                      <strong>Lâu Đài Lớn (chính tâm)</strong> hoặc{' '}
                      <strong>Cả 2 Lâu Đài Cánh</strong> sẽ giành chiến thắng chung cuộc ngay mà
                      không cần chờ hết giờ!
                    </p>
                  </div>

                  {/* Phân chia đội / nhóm tự động */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <span>👥</span> Phân chia quân đội ({participants.length} học sinh)
                      </span>
                      <span className="text-[11px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md">
                        2 phe Xanh & Đỏ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTerritoryBalanceMode('elo')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          territoryBalanceMode === 'elo'
                            ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-400'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>⚖️ Cân bằng Elo ẩn</span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-normal mt-0.5 leading-snug">
                          Khuyên dùng. Cân bằng thực lực dựa trên phong độ làm bài.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTerritoryBalanceMode('random')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          territoryBalanceMode === 'random'
                            ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-400'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>🎲 Ngẫu nhiên 50/50</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                          Chia may rủi xen kẽ ngẫu nhiên giữa 2 phe.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTerritoryBalanceMode('groups')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          territoryBalanceMode === 'groups'
                            ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-1 ring-purple-400'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>👥 Theo tổ / nhóm</span>
                        </div>
                        <p className="text-[11px] text-purple-800 font-normal mt-0.5 leading-snug">
                          Giữ nguyên các tổ học tập đã phân của lớp.
                        </p>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      * Điểm Elo ẩn hoàn toàn với học sinh để tránh so sánh tiêu cực. Sau khi trận
                      đấu bắt đầu, Thầy/Cô vẫn có thể đổi học sinh qua lại giữa hai phe bất cứ lúc
                      nào!
                    </p>
                  </div>
                </>
              ) : selectedActivity.id === 'project-grading' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên dự án / Hoạt động
                      </label>
                      <input
                        type="text"
                        value={projectGradingTitle}
                        onChange={e => setProjectGradingTitle(e.target.value)}
                        placeholder="VD: Báo cáo Dự án STEM, Thuyết trình Lịch sử..."
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                        data-testid="input-project-grading-title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thang điểm
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={projectGradingMaxScore}
                        onChange={e => setProjectGradingMaxScore(Number(e.target.value) || 10)}
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm text-center font-bold"
                        data-testid="input-project-grading-max-score"
                      />
                    </div>
                  </div>

                  {/* Nạp nhóm từ lớp học */}
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-bold text-blue-900 block">
                          👥 Cấu trúc nhóm học sinh
                        </span>
                        <span className="text-xs text-blue-700">
                          {projectGradingGroups.length > 0
                            ? `Đã cấu hình ${projectGradingGroups.length} nhóm tham gia`
                            : 'Chưa có nhóm. Bấm nút bên cạnh để lấy nhóm từ lớp!'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleFetchClassGroupsForGrading}
                        disabled={isLoadingClassGroups}
                        className="min-h-[40px] px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                        data-testid="btn-fetch-class-groups"
                      >
                        {isLoadingClassGroups ? 'Đang nạp...' : '👥 Lấy nhóm từ Lớp học'}
                      </button>
                    </div>

                    {classGroupsLoadedMsg && (
                      <p className="text-xs font-semibold text-blue-800 m-0">
                        {classGroupsLoadedMsg}
                      </p>
                    )}

                    {projectGradingGroups.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {projectGradingGroups.map(g => (
                          <span
                            key={g.id}
                            className="text-xs px-2.5 py-1 bg-white border border-blue-200 rounded-md font-medium text-slate-700"
                          >
                            {g.name} ({g.memberParticipantIds.length} HS){' '}
                            {g.leaderDisplayName ? `⭐ ${g.leaderDisplayName}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cấu hình trọng số 4 thành phần */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">
                        ⚖️ Cấu hình trọng số điểm (Tổng:{' '}
                        {projectGradingWeightSelf +
                          projectGradingWeightMember +
                          projectGradingWeightCross +
                          projectGradingWeightTeacher}
                        %)
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Thang điểm 10</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          1. Tự chấm (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={projectGradingWeightSelf}
                          onChange={e => setProjectGradingWeightSelf(Number(e.target.value) || 0)}
                          className="w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white"
                          data-testid="input-weight-self"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          2. Tổ chấm (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={projectGradingWeightMember}
                          onChange={e => setProjectGradingWeightMember(Number(e.target.value) || 0)}
                          className="w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white"
                          data-testid="input-weight-member"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          3. Chéo nhóm (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={projectGradingWeightCross}
                          onChange={e => setProjectGradingWeightCross(Number(e.target.value) || 0)}
                          className="w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white"
                          data-testid="input-weight-cross"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          4. Giáo viên (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={projectGradingWeightTeacher}
                          onChange={e =>
                            setProjectGradingWeightTeacher(Number(e.target.value) || 0)
                          }
                          className="w-full h-10 px-2.5 border rounded-lg text-center font-bold text-sm bg-white"
                          data-testid="input-weight-teacher"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : selectedActivity.id === 'interactive-board' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiêu đề Bảng Tương Tác
                      </label>
                      <input
                        type="text"
                        value={boardTitle}
                        onChange={e => setBoardTitle(e.target.value)}
                        placeholder="VD: Triển lãm bài giải Toán, Brainstorm ý tưởng STEM..."
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thang điểm
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={boardMaxGrade}
                        onChange={e => setBoardMaxGrade(Number(e.target.value) || 10)}
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm text-center font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chủ đề / Câu hỏi yêu cầu học sinh làm
                    </label>
                    <textarea
                      value={boardPrompt}
                      onChange={e => setBoardPrompt(e.target.value)}
                      placeholder="VD: Hãy vẽ sơ đồ lực tác dụng hoặc chụp bài làm câu 3 trong vở nộp lên..."
                      rows={2}
                      className="w-full p-3 border rounded-lg text-sm resize-none"
                    />
                  </div>

                  {/* Các tùy chọn tính năng */}
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardRequireApproval}
                        onChange={e => setBoardRequireApproval(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Duyệt bài trước khi hiện</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardAllowPeerGrades}
                        onChange={e => setBoardAllowPeerGrades(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Cho phép chấm điểm chéo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardAllowDraw}
                        onChange={e => setBoardAllowDraw(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Cho phép vẽ tay</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardAllowImage}
                        onChange={e => setBoardAllowImage(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Cho phép chụp/tải ảnh</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardAllowComments}
                        onChange={e => setBoardAllowComments(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Cho phép bình luận</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={boardAllowReactions}
                        onChange={e => setBoardAllowReactions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Cho phép Like/Thả tim</span>
                    </label>
                  </div>

                  {/* Phiếu học tập đính kèm (Interactive Worksheet) */}
                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-blue-900">
                        <input
                          type="checkbox"
                          checked={boardWorksheetEnabled}
                          onChange={e => setBoardWorksheetEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>📝 Giao Phiếu bài tập kèm theo</span>
                      </label>
                      {boardWorksheetEnabled && (
                        <span className="text-[11px] bg-blue-200 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full">
                          Tự động chấm điểm
                        </span>
                      )}
                    </div>

                    {boardWorksheetEnabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chọn bộ câu hỏi có sẵn từ ngân hàng:
                        </label>
                        <select
                          value={boardQuestionSetId}
                          onChange={e => setBoardQuestionSetId(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-white font-medium"
                        >
                          <option value="">-- Chọn một bộ câu hỏi --</option>
                          {questionSets.map(qs => (
                            <option key={qs.id} value={qs.id}>
                              {qs.title} ({qs.questionCount ?? 0} câu)
                            </option>
                          ))}
                        </select>
                        {boardQuestionSetId && (
                          <p className="text-[11px] text-blue-700 mt-1.5 font-medium">
                            💡 Học sinh sẽ làm trực tiếp các câu hỏi trắc nghiệm, ghép nối hoặc điền
                            từ trong phiếu này trước khi nộp lên bảng lớp.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : selectedActivity.id === 'circuit-race' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên cuộc đua <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={circuitTitle}
                      onChange={e => setCircuitTitle(e.target.value)}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm"
                      placeholder="Ví dụ: Đường Đua Tri Thức - Chinh Phục Điểm 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chọn bộ câu hỏi từ kho đề
                    </label>
                    <select
                      value={selectedQuestionSetId}
                      onChange={e => {
                        setSelectedQuestionSetId(e.target.value);
                        if (e.target.value) {
                          const found = questionSets?.find(s => s.id === e.target.value);
                          if (found) setCircuitTitle(`Đường Đua: ${found.title}`);
                        }
                      }}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">
                        -- Sử dụng câu hỏi mẫu mặc định (MCQ, Đúng/Sai, Chùm Đ/S, Trả lời ngắn) --
                      </option>
                      {questionSets?.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.questionCount ?? 0} câu)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Độ dài đường đua
                      </label>
                      <select
                        value={circuitTrackLength}
                        onChange={e => setCircuitTrackLength(Number(e.target.value))}
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value={30}>30 ô (Chặng ngắn)</option>
                        <option value={50}>50 ô (Tiêu chuẩn)</option>
                        <option value={80}>80 ô (Chặng dài)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian mỗi câu
                      </label>
                      <select
                        value={circuitTimePerQuestion}
                        onChange={e => setCircuitTimePerQuestion(Number(e.target.value))}
                        className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value={15}>15 giây (Tốc độ)</option>
                        <option value={20}>20 giây (Tiêu chuẩn)</option>
                        <option value={30}>30 giây (Thư thả)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian dùng thẻ sau mỗi câu (Tự động chuyển câu)
                    </label>
                    <select
                      value={circuitActionWindowSeconds}
                      onChange={e => setCircuitActionWindowSeconds(Number(e.target.value))}
                      className="w-full min-h-[48px] px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value={5}>5 giây (Nhanh)</option>
                      <option value={10}>10 giây (Tiêu chuẩn - khuyến nghị)</option>
                      <option value={15}>15 giây (Thư thả)</option>
                      <option value={20}>20 giây (Dài)</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={circuitShuffleQuestions}
                        onChange={e => setCircuitShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Đảo thứ tự câu hỏi</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={circuitShuffleOptions}
                        onChange={e => setCircuitShuffleOptions(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Đảo thứ tự đáp án (A, B, C, D)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={circuitIndependentOrder}
                        onChange={e => setCircuitIndependentOrder(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Mỗi học sinh thứ tự câu khác nhau{' '}
                        <span className="text-blue-600 font-semibold">(Chống nhìn bài)</span>
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <span>💡</span>
                    <span>
                      Tự động hỗ trợ đầy đủ 4 dạng: Trắc nghiệm 4 lựa chọn, Đúng/Sai đơn, Chùm
                      Đúng/Sai (chuẩn BGD) và Điền từ/số ngắn. Học sinh trả lời đúng sẽ gieo xúc xắc
                      và nhận thẻ bổ trợ!
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Nhấn xác nhận để bắt đầu ngay hoạt động <strong>{selectedActivity.name}</strong>.
                </p>
              )}

              <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t flex justify-end gap-3 mt-4 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={handleCloseConfig}
                  className="min-h-[48px] px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-start-activity"
                  className="min-h-[48px] px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  {activeRun ? '▶ Khởi chạy song song' : 'Bắt đầu ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
