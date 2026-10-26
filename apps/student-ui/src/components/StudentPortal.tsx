import React, { useState, useEffect } from 'react';
import {
  type SessionRosterResponse,
  type StudentJoinRequest,
  type StudentJoinResponse,
  type StudentRosterItem,
  type ChatMessageDto,
  type StudentSessionSummaryItem,
  type AvatarConfig,
  APP_VERSION,
} from '@educlass/protocol';
import {
  AvatarCustomizer,
  Banner,
  Button,
  Card,
  ChatBox,
  Input,
  Modal,
  StudentAvatar,
  StudentSessionSummaryView,
  UI_COLORS,
  UI_RADII,
  UI_SPACING,
  UI_TYPOGRAPHY,
} from '@educlass/ui-kit';

export interface StudentRewardEvent {
  exp: number;
  reason: string;
  persisted: boolean;
  newTotalExp?: number | null | undefined;
  newLevel?: number | null | undefined;
  leveledUp?: boolean | undefined;
}

export interface StudentPortalProps {
  initialJoinCode?: string | undefined;
  initialParticipantToken?: string | undefined;
  apiBaseUrl?: string | undefined;
  chatMessages?: ChatMessageDto[] | undefined;
  chatLocked?: boolean | undefined;
  initialSummaryData?: StudentSessionSummaryItem | undefined;
  onJoinSuccess?: ((data: StudentJoinResponse) => void) | undefined;
  onSessionClosed?: (() => void) | undefined;
  onRewardReceived?: ((reward: StudentRewardEvent) => void) | undefined;
  onSendChatMessage?: ((payload: { content: string; toParticipantId?: string | null }) => Promise<void> | void) | undefined;
  onRequestHandRaise?: ((reason?: string) => Promise<void> | void) | undefined;
  customRosterFetcher?: ((code: string) => Promise<SessionRosterResponse>) | undefined;
  customJoinHandler?: ((req: StudentJoinRequest) => Promise<StudentJoinResponse>) | undefined;
  customResumeHandler?: ((token: string) => Promise<StudentJoinResponse>) | undefined;
  customSummaryFetcher?: ((sessionId: string, participantId: string) => Promise<StudentSessionSummaryItem>) | undefined;
  customWsListener?: ((onClosed: (reason?: string) => void, onReward?: (reward: StudentRewardEvent) => void) => () => void) | undefined;
}

type Step = 'code' | 'identity' | 'pin_team' | 'joined' | 'session_closed';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  initialJoinCode = '',
  initialParticipantToken = '',
  apiBaseUrl = '',
  chatMessages,
  chatLocked,
  initialSummaryData,
  onJoinSuccess,
  onSessionClosed,
  onRewardReceived,
  onSendChatMessage,
  onRequestHandRaise,
  customRosterFetcher,
  customJoinHandler,
  customResumeHandler,
  customSummaryFetcher,
  customWsListener,
}) => {
  const [step, setStep] = useState<Step>(
    initialParticipantToken ? 'joined' : initialJoinCode ? 'identity' : 'code'
  );
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [rosterData, setRosterData] = useState<SessionRosterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trò chuyện & Xin giúp (Task 5.2)
  const [showChatModal, setShowChatModal] = useState(false);
  const [internalChatMessages, setInternalChatMessages] = useState<ChatMessageDto[]>([]);
  const [internalChatLocked] = useState(false);

  const messages = chatMessages ?? internalChatMessages;
  const locked = chatLocked ?? internalChatLocked;

  // Danh tính được chọn
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterItem | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<StudentRosterItem[]>([]);
  const [nickname, setNickname] = useState('');

  // PIN & Nhóm
  const [pin, setPin] = useState('');
  const [pins, setPins] = useState<Record<string, string>>({});
  const [teamName, setTeamName] = useState('');

  // Kết quả sau khi vào lớp
  const [joinResult, setJoinResult] = useState<StudentJoinResponse | null>(null);
  const [lastParticipant, setLastParticipant] = useState<StudentJoinResponse['participant'] | null>(null);

  // Thông báo thưởng EXP realtime & Lịch sử nhận thưởng (Task 1.9 & Task 5.3)
  const [rewardNotification, setRewardNotification] = useState<StudentRewardEvent | null>(null);
  const [rewardsHistory, setRewardsHistory] = useState<StudentRewardEvent[]>([]);
  const [sessionSummary, setSessionSummary] = useState<StudentSessionSummaryItem | null>(
    initialSummaryData ?? null
  );

  // Modal báo thầy cô
  const [showTeacherReportModal, setShowTeacherReportModal] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Avatar Mascot (Phòng thay đồ học sinh)
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarToast, setAvatarToast] = useState<string | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('educlass_student_avatar');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      base: 'cat',
      color: '#4F8CFF',
      headwear: 'straw',
      glasses: 'none',
      outfit: 'school_uniform',
      wings: 'none',
      held: 'pencil',
    };
  });

  const handleSaveAvatar = async (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('educlass_student_avatar', JSON.stringify(newConfig));
      } catch {
        // ignore
      }
    }

    if (joinResult?.participant.studentId) {
      try {
        await fetch(`${apiBaseUrl}/api/students/${joinResult.participant.studentId}/avatar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: newConfig }),
        });
      } catch {
        // offline or network error, local state preserved
      }
    }

    setShowAvatarModal(false);
    setAvatarToast('✨ Đã lưu diện mạo mới cho Mascot của bạn!');
    setTimeout(() => setAvatarToast(null), 3000);
  };

  const handleSendChat = async (payload: { content: string; toParticipantId?: string | null }) => {
    if (onSendChatMessage) {
      await onSendChatMessage(payload);
    } else {
      const newMsg: ChatMessageDto = {
        id: `msg_${Date.now()}`,
        sessionId: joinResult?.session.id ?? 'sess_1',
        fromTeacher: false,
        fromParticipantId: joinResult?.participant.id ?? 'part_me',
        fromParticipantName: joinResult?.participant.displayName ?? 'Học sinh',
        toParticipantId: payload.toParticipantId ?? null,
        kind: 'text',
        text: payload.content,
        ts: Date.now(),
      };
      setInternalChatMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleRequestHandRaise = async (reason?: string) => {
    if (onRequestHandRaise) {
      await onRequestHandRaise(reason);
    } else {
      const handMsg: ChatMessageDto = {
        id: `msg_hand_${Date.now()}`,
        sessionId: joinResult?.session.id ?? 'sess_1',
        fromTeacher: false,
        fromParticipantId: joinResult?.participant.id ?? 'part_me',
        fromParticipantName: joinResult?.participant.displayName ?? 'Học sinh',
        toParticipantId: null,
        kind: 'hand_raise',
        text: reason ? `Đã giơ tay xin trợ giúp: ${reason}` : 'Đã giơ tay xin trợ giúp từ giáo viên',
        ts: Date.now(),
      };
      setInternalChatMessages((prev) => [...prev, handMsg]);
    }
  };

  // Tự động khôi phục phiên nếu có participantToken hoặc tải roster nếu có mã
  useEffect(() => {
    const savedToken =
      initialParticipantToken ||
      (typeof window !== 'undefined'
        ? window.localStorage.getItem('educlass_participant_token')
        : null);

    if (savedToken) {
      void resumeSession(savedToken);
    } else if (initialJoinCode && initialJoinCode.length === 6) {
      void fetchRoster(initialJoinCode);
    }
  }, [initialJoinCode, initialParticipantToken]);

  async function resumeSession(token: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      let resData: StudentJoinResponse;
      if (customResumeHandler) {
        resData = await customResumeHandler(token);
      } else {
        const res = await fetch(`${apiBaseUrl}/api/sessions/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantToken: token }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Phiên học đã kết thúc hoặc token không hợp lệ.');
        }
        resData = json as StudentJoinResponse;
      }

      setJoinResult(resData);
      setLastParticipant(resData.participant);
      setJoinCode(resData.session.joinCode);
      setStep('joined');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('educlass_participant_token', resData.participantToken);
      }
      if (onJoinSuccess) {
        onJoinSuccess(resData);
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('educlass_participant_token');
      }
      const msg = err instanceof Error ? err.message : 'Không thể tiếp tục phiên học.';
      if (msg.includes('SESSION_CLOSED')) {
        setStep('session_closed');
        if (onSessionClosed) {
          onSessionClosed();
        }
      } else {
        setErrorMsg(msg);
        setStep('code');
      }
    } finally {
      setLoading(false);
    }
  }

  // Lắng nghe sự kiện phiên bị đóng & thưởng EXP realtime (Task 1.8, 1.9 & Task 5.3)
  useEffect(() => {
    if (step !== 'joined') return undefined;

    const handleClosed = () => {
      const p = joinResult?.participant || lastParticipant;
      const s = joinResult?.session;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('educlass_participant_token');
      }
      setStep('session_closed');

      if (s?.id && p?.id) {
        if (customSummaryFetcher) {
          void customSummaryFetcher(s.id, p.id).then((sum) => setSessionSummary(sum)).catch(() => {});
        } else if (apiBaseUrl) {
          void fetch(`${apiBaseUrl}/api/sessions/${s.id}/student-summary/${p.id}`)
            .then((res) => res.json())
            .then((json) => {
              if (json && json.summary) {
                setSessionSummary(json.summary);
              }
            })
            .catch(() => {});
        }
      }

      if (onSessionClosed) {
        onSessionClosed();
      }
    };

    const handleReward = (reward: StudentRewardEvent) => {
      setRewardNotification(reward);
      setRewardsHistory((prev) => [...prev, reward]);
      if (onRewardReceived) {
        onRewardReceived(reward);
      }
    };

    if (customWsListener) {
      const cleanup = customWsListener(handleClosed, handleReward);
      return cleanup;
    }

    if (typeof window !== 'undefined') {
      const closedListener = () => {
        handleClosed();
      };
      const rewardListener = (e: Event) => {
        const customEvent = e as CustomEvent<StudentRewardEvent>;
        if (customEvent.detail) {
          handleReward(customEvent.detail);
        }
      };
      window.addEventListener('educlass:session_closed', closedListener);
      window.addEventListener('educlass:reward_granted', rewardListener);
      return () => {
        window.removeEventListener('educlass:session_closed', closedListener);
        window.removeEventListener('educlass:reward_granted', rewardListener);
      };
    }

    return undefined;
  }, [step, customWsListener, onSessionClosed, onRewardReceived]);

  // Lắng nghe sự kiện chuyển đổi học sinh (Kiosk Mode / Đổi học sinh khác)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSwitchStudent = () => {
      window.localStorage.removeItem('educlass_participant_token');
      setJoinResult(null);
      setSelectedStudent(null);
      setSelectedStudents([]);
      setNickname('');
      setPin('');
      setPins({});
      setTeamName('');
      setErrorMsg(null);
      if (joinCode && joinCode.length === 6) {
        void fetchRoster(joinCode);
        setStep('identity');
      } else {
        setStep('code');
      }
    };

    window.addEventListener('educlass:switch-student', handleSwitchStudent);
    return () => {
      window.removeEventListener('educlass:switch-student', handleSwitchStudent);
    };
  }, [joinCode]);

  async function fetchRoster(codeToFetch: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      let data: SessionRosterResponse;
      if (customRosterFetcher) {
        data = await customRosterFetcher(codeToFetch);
      } else {
        const res = await fetch(`${apiBaseUrl}/api/sessions/code/${codeToFetch}/roster`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Không tìm thấy phòng học hoặc mã không hợp lệ.');
        }
        data = json as SessionRosterResponse;
      }

      setRosterData(data);
      setJoinCode(codeToFetch);
      setStep('identity');

      // Nếu phiên guest_only, chuyển thẳng sang guest mode
      if (data.identityMode === 'guest_only') {
        setIsGuestMode(true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi kiểm tra mã.');
      setStep('code');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = joinCode.trim();
    if (clean.length !== 6) {
      setErrorMsg('Vui lòng nhập đúng 6 chữ số mã vào lớp.');
      return;
    }
    void fetchRoster(clean);
  }

  function handleSelectStudent(student: StudentRosterItem) {
    if (student.isCompletedExam) {
      setErrorMsg('Bạn đã hoàn thành bài thi ở ca trước. Vui lòng nhường máy cho bạn ca sau.');
      return;
    }
    if (student.isTaken) {
      setErrorMsg('Tên này đang có bạn dùng. Chọn tên khác hoặc bấm Báo thầy/cô.');
      return;
    }
    setErrorMsg(null);

    if (rosterData?.allowPairing) {
      const isAlreadySelected = selectedStudents.some((s) => s.id === student.id);
      if (isAlreadySelected) {
        setSelectedStudents((prev) => prev.filter((s) => s.id !== student.id));
      } else {
        const maxLimit = rosterData.maxStudentsPerDevice ?? 2;
        if (selectedStudents.length >= maxLimit) {
          setErrorMsg(`Máy này chỉ được ghép tối đa ${maxLimit} bạn. Bạn có thể bỏ bớt bạn đã chọn trước đó.`);
          return;
        }
        setSelectedStudents((prev) => [...prev, student]);
      }
      return;
    }

    setSelectedStudent(student);
    setSelectedStudents([student]);
    setIsGuestMode(false);

    // Nếu học sinh có PIN hoặc phiên có bật nhóm, chuyển sang bước PIN/nhóm
    if (student.hasPin || rosterData?.allowTeams) {
      setStep('pin_team');
    } else {
      // Vào lớp ngay
      void submitJoin({
        joinCode,
        studentId: student.id,
      });
    }
  }

  function handleRemoveSelectedStudent(studentId: string) {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== studentId));
  }

  function handleProceedPairing() {
    if (selectedStudents.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một học sinh để tiếp tục.');
      return;
    }
    setErrorMsg(null);
    setIsGuestMode(false);

    const hasAnyPin = selectedStudents.some((s) => s.hasPin);
    if (hasAnyPin || rosterData?.allowTeams) {
      setStep('pin_team');
    } else {
      if (selectedStudents.length === 1) {
        void submitJoin({
          joinCode,
          studentId: selectedStudents[0]!.id,
        });
      } else {
        void submitJoin({
          joinCode,
          studentIds: selectedStudents.map((s) => s.id),
        });
      }
    }
  }

  function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setErrorMsg('Vui lòng nhập tên của bạn.');
      return;
    }
    setErrorMsg(null);
    setIsGuestMode(true);
    setSelectedStudent(null);
    setSelectedStudents([]);

    if (rosterData?.allowTeams) {
      setStep('pin_team');
    } else {
      void submitJoin({
        joinCode,
        nickname: cleanNickname,
      });
    }
  }

  async function submitJoin(req: StudentJoinRequest) {
    setLoading(true);
    setErrorMsg(null);
    try {
      let resData: StudentJoinResponse;
      if (customJoinHandler) {
        resData = await customJoinHandler(req);
      } else {
        const res = await fetch(`${apiBaseUrl}/api/sessions/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Không thể vào lớp. Vui lòng kiểm tra lại.');
        }
        resData = json as StudentJoinResponse;
      }

      setJoinResult(resData);
      setLastParticipant(resData.participant);
      setStep('joined');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('educlass_participant_token', resData.participantToken);
      }
      if (onJoinSuccess) {
        onJoinSuccess(resData);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi vào lớp.');
    } finally {
      setLoading(false);
    }
  }

  function handlePinTeamSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isGuestMode) {
      const payload: StudentJoinRequest = {
        joinCode,
        nickname: nickname.trim(),
        ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
      };
      void submitJoin(payload);
      return;
    }

    if (selectedStudents.length > 1) {
      const pinRequiredStudents = selectedStudents.filter((s) => s.hasPin);
      for (const s of pinRequiredStudents) {
        if (!pins[s.id]?.trim()) {
          setErrorMsg(`Vui lòng nhập mã PIN cho bạn ${s.fullName}.`);
          return;
        }
      }

      const payload: StudentJoinRequest = {
        joinCode,
        studentIds: selectedStudents.map((s) => s.id),
        ...(pinRequiredStudents.length > 0 ? { pins } : {}),
        ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
      };
      void submitJoin(payload);
      return;
    }

    const activeStudent = selectedStudents[0] || selectedStudent;
    const resolvedPin = pin.trim() || (activeStudent ? pins[activeStudent.id]?.trim() : '');

    if (activeStudent?.hasPin && !resolvedPin) {
      setErrorMsg('Vui lòng nhập mã PIN tài khoản của bạn.');
      return;
    }

    const payload: StudentJoinRequest = {
      joinCode,
      ...(activeStudent
        ? {
            studentId: activeStudent.id,
            ...(resolvedPin ? { pin: resolvedPin } : {}),
          }
        : {}),
      ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
    };

    void submitJoin(payload);
  }

  function handleReportTeacher() {
    setReportSent(true);
    setTimeout(() => {
      setShowTeacherReportModal(false);
      setReportSent(false);
    }, 2000);
  }

  const computedSummary: StudentSessionSummaryItem = sessionSummary || {
    sessionId: joinResult?.session.id || 'sess_current',
    sessionCode: joinResult?.session.joinCode || joinCode || '123456',
    participantId: joinResult?.participant.id || lastParticipant?.id || 'part_me',
    studentId: joinResult?.participant.studentId || lastParticipant?.studentId || null,
    displayName: joinResult?.participant.displayName || lastParticipant?.displayName || nickname || 'Học sinh',
    identityLevel: (joinResult?.participant.identityLevel || lastParticipant?.identityLevel || (isGuestMode ? 'guest' : 'roster')) as 'roster' | 'account' | 'guest',
    teamName: joinResult?.participant.teamName || lastParticipant?.teamName || teamName || null,
    totalExpEarned: rewardsHistory.reduce((acc, r) => acc + (r.exp || 0), 0),
    persistedExp: (joinResult?.participant.identityLevel || lastParticipant?.identityLevel) === 'account',
    currentLevel:
      rewardsHistory.length > 0 && typeof rewardsHistory[rewardsHistory.length - 1]?.newLevel === 'number'
        ? (rewardsHistory[rewardsHistory.length - 1]!.newLevel as number)
        : 1,
    totalAccumulatedExp:
      rewardsHistory.length > 0 && typeof rewardsHistory[rewardsHistory.length - 1]?.newTotalExp === 'number'
        ? (rewardsHistory[rewardsHistory.length - 1]!.newTotalExp as number)
        : 0,
    leveledUp: rewardsHistory.some((r) => Boolean(r.leveledUp)),
    expBreakdown: rewardsHistory.map((r, i) => ({
      exp: r.exp,
      reason: r.reason || 'Điểm thưởng trong lớp',
      ts: Date.now() - (rewardsHistory.length - i) * 60000,
    })),
    newTitlesAwarded: [],
    avatar: undefined,
    reminderPinLogin: (joinResult?.participant.identityLevel || lastParticipant?.identityLevel || (isGuestMode ? 'guest' : 'roster')) !== 'account',
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: UI_COLORS.background,
    fontFamily: UI_TYPOGRAPHY.fontFamily,
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
  };

  return (
    <main style={containerStyle} data-testid="student-portal-container">
      {/* Bước 1: Nhập mã phòng */}
      {step === 'code' && (
        <Card title="Cổng vào lớp EduClass">
          {errorMsg && (
            <div style={{ marginBottom: '16px' }}>
              <Banner type="error" message={errorMsg} />
            </div>
          )}

          <form onSubmit={handleCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Mã vào lớp (6 số)"
              placeholder="VD: 123456"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoFocus
              data-testid="input-join-code"
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              data-testid="btn-submit-code"
            >
              Tiếp tục
            </Button>
          </form>
        </Card>
      )}

      {/* Bước 2: Chọn tên hoặc nhập khách */}
      {step === 'identity' && rosterData && (
        <Card
          title={`Phòng học #${joinCode}`}
          subtitle="Bước 2: Chọn tên bạn hoặc tham gia với tư cách khách"
        >
          {errorMsg && (
            <div style={{ marginBottom: '16px' }}>
              <Banner
                type="warning"
                message={errorMsg}
                actionText={errorMsg.includes('Báo thầy/cô') ? 'Báo GV' : undefined}
                onAction={errorMsg.includes('Báo thầy/cô') ? () => setShowTeacherReportModal(true) : undefined}
              />
            </div>
          )}

          {rosterData.identityMode !== 'roster_only' && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: `2px solid ${UI_COLORS.border}`,
                paddingBottom: '8px',
              }}
            >
              {rosterData.identityMode !== 'guest_only' && (
                <button
                  type="button"
                  onClick={() => setIsGuestMode(false)}
                  style={{
                    flex: 1,
                    minHeight: UI_SPACING.minTouchTarget,
                    border: 'none',
                    background: !isGuestMode ? UI_COLORS.primary : 'transparent',
                    color: !isGuestMode ? '#FFFFFF' : UI_COLORS.text,
                    fontWeight: 600,
                    borderRadius: UI_RADII.button,
                    cursor: 'pointer',
                  }}
                  data-testid="tab-roster"
                >
                  Danh sách lớp
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsGuestMode(true)}
                style={{
                  flex: 1,
                  minHeight: UI_SPACING.minTouchTarget,
                  border: 'none',
                  background: isGuestMode ? UI_COLORS.primary : 'transparent',
                  color: isGuestMode ? '#FFFFFF' : UI_COLORS.text,
                  fontWeight: 600,
                  borderRadius: UI_RADII.button,
                  cursor: 'pointer',
                }}
                data-testid="tab-guest"
              >
                Khách tự do
              </button>
            </div>
          )}

          {!isGuestMode && rosterData.identityMode !== 'guest_only' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rosterData.allowPairing && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#F0F9FF',
                    borderRadius: UI_RADII.card,
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  data-testid="pairing-info-banner"
                >
                  <span>👥</span>
                  <span>
                    Phiên học cho phép <strong>{rosterData.maxStudentsPerDevice ?? 2} bạn</strong> ngồi chung máy. Hãy chọn tên các bạn ngồi cùng.
                  </span>
                </div>
              )}

              {rosterData.allowPairing && selectedStudents.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: UI_RADII.card,
                    border: '1px solid #BFDBFE',
                  }}
                  data-testid="selected-chips-tray"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                      Đã chọn ({selectedStudents.length}/{rosterData.maxStudentsPerDevice ?? 2} bạn):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents([])}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#64748B',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      data-testid="btn-clear-selection"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedStudents.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #93C5FD',
                          borderRadius: '9999px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1E40AF',
                        }}
                        data-testid={`selected-chip-${s.id}`}
                      >
                        <span>👤 {s.fullName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedStudent(s.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#64748B',
                            fontWeight: 700,
                            padding: '0 2px',
                          }}
                          title="Bỏ chọn"
                          data-testid={`btn-remove-chip-${s.id}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={handleProceedPairing}
                    data-testid="btn-proceed-pairing"
                    style={{ marginTop: '4px' }}
                  >
                    {`Vào lớp cho ${selectedStudents.length} bạn (${selectedStudents.map((s) => s.fullName).join(' & ')}) →`}
                  </Button>
                </div>
              )}

              <span style={{ fontSize: '14px', color: UI_COLORS.textMuted }}>
                {rosterData.allowPairing
                  ? 'Bấm chọn tên các bạn chung máy:'
                  : 'Chọn đúng tên của bạn trong danh sách:'}
              </span>
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '4px',
                }}
                data-testid="roster-list"
              >
                {rosterData.students.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: UI_COLORS.textMuted }}>
                    Lớp chưa có học sinh nào.
                  </div>
                ) : (
                  rosterData.students.map((student) => {
                    const isTaken = student.isTaken;
                    const isCompleted = Boolean(student.isCompletedExam);
                    const isDisabled = isTaken || isCompleted;
                    const isSelected = selectedStudents.some((s) => s.id === student.id);

                    let bg: string = '#FFFFFF';
                    let borderColor: string = UI_COLORS.border;
                    let textColor: string = UI_COLORS.text;

                    if (isCompleted) {
                      bg = '#F0FDF4';
                      borderColor = '#86EFAC';
                      textColor = '#166534';
                    } else if (isTaken) {
                      bg = '#F1F5F9';
                      borderColor = '#CBD5E1';
                      textColor = '#94A3B8';
                    } else if (isSelected) {
                      bg = '#EFF6FF';
                      borderColor = '#3B82F6';
                      textColor = '#1D4ED8';
                    }

                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        disabled={isDisabled}
                        style={{
                          minHeight: UI_SPACING.minTouchTarget,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          border: `2px solid ${borderColor}`,
                          borderRadius: UI_RADII.card,
                          backgroundColor: bg,
                          color: textColor,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                          opacity: isTaken ? 0.6 : (isCompleted ? 0.85 : 1),
                        }}
                        data-testid={`student-item-${student.id}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{student.fullName}</span>
                          {student.hasPin && <span title="Có mã PIN">🔒</span>}
                        </div>
                        {isCompleted ? (
                          <span
                            style={{
                              fontSize: '12px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            data-testid={`badge-completed-${student.id}`}
                          >
                            ✓ Đã hoàn thành
                          </span>
                        ) : isTaken ? (
                          <span style={{ fontSize: '12px', color: UI_COLORS.error, fontWeight: 500 }}>
                            Đang dùng
                          </span>
                        ) : isSelected ? (
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#2563EB',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            data-testid={`chip-status-${student.id}`}
                          >
                            ✓ Đã chọn
                          </span>
                        ) : rosterData.allowPairing ? (
                          <span style={{ fontSize: '14px', color: UI_COLORS.primary }}>+ Ghép bạn</span>
                        ) : (
                          <span style={{ fontSize: '14px', color: UI_COLORS.primary }}>Chọn →</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {isGuestMode && (
            <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Họ và tên hoặc biệt danh của bạn"
                placeholder="VD: Minh Khang"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
                data-testid="input-guest-name"
              />
              <Button type="submit" variant="primary" fullWidth loading={loading} data-testid="btn-submit-guest">
                Tiếp tục
              </Button>
            </form>
          )}

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setStep('code');
                setErrorMsg(null);
              }}
              data-testid="btn-back-to-code"
            >
              ← Đổi mã
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowTeacherReportModal(true)}
              data-testid="btn-report-teacher"
            >
              Báo thầy/cô
            </Button>
          </div>
        </Card>
      )}

      {/* Bước 3: Nhập mã PIN và/hoặc chọn nhóm */}
      {step === 'pin_team' && (
        <Card
          title="Xác nhận & Vào lớp"
          subtitle={
            selectedStudents.length > 1
              ? `Ghép ${selectedStudents.length} bạn: ${selectedStudents.map((s) => s.fullName).join(' & ')}`
              : `Học sinh: ${selectedStudents[0]?.fullName || selectedStudent?.fullName || nickname}`
          }
        >
          {errorMsg && (
            <div style={{ marginBottom: '16px' }}>
              <Banner type="error" message={errorMsg} />
            </div>
          )}

          <form onSubmit={handlePinTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedStudents.length > 1 ? (
              selectedStudents
                .filter((s) => s.hasPin)
                .map((s) => (
                  <Input
                    key={s.id}
                    type="password"
                    label={`Mã PIN của ${s.fullName} (4-6 số)`}
                    placeholder="••••"
                    maxLength={6}
                    value={pins[s.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPins((prev) => ({ ...prev, [s.id]: val }));
                    }}
                    autoFocus={selectedStudents.filter((s) => s.hasPin)[0]?.id === s.id}
                    data-testid={`input-pin-${s.id}`}
                  />
                ))
            ) : (
              (selectedStudents[0]?.hasPin || selectedStudent?.hasPin) && (
                <Input
                  type="password"
                  label="Mã PIN của bạn (4-6 số)"
                  placeholder="••••"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                  data-testid="input-pin"
                />
              )
            )}

            {rosterData?.allowTeams && (
              <Input
                label="Tên đội / nhóm (2–3 học sinh)"
                placeholder="VD: Nhóm 1, Siêu Nhân..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                helperText="Nếu bạn làm việc theo nhóm, hãy nhập cùng tên nhóm với bạn mình."
                data-testid="input-team-name"
              />
            )}

            <Button
              type="submit"
              variant="kahoot_green"
              fullWidth
              loading={loading}
              data-testid="btn-enter-room"
            >
              {selectedStudents.length > 1
                ? `Vào lớp cho cả ${selectedStudents.length} bạn!`
                : 'Vào lớp ngay!'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setStep('identity');
                setErrorMsg(null);
              }}
              data-testid="btn-back-to-identity"
            >
              ← Quay lại chọn tên
            </Button>
          </form>
        </Card>
      )}

      {/* Bước 4: Đã vào phòng thành công (Waiting Room) */}
      {step === 'joined' && joinResult && (
        <Card
          title="🎉 Chào mừng bạn vào lớp!"
          subtitle={`Phòng học #${joinResult.session.joinCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            {avatarToast && (
              <Banner type="success" message={avatarToast} />
            )}

            <div
              style={{
                padding: '20px 16px',
                borderRadius: UI_RADII.card,
                backgroundColor: '#F8FAFC',
                border: `2px dashed ${UI_COLORS.primary}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <StudentAvatar config={avatarConfig} size="xl" showBorder />

              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: UI_COLORS.text }}>
                  {joinResult.participant.displayName}
                </div>
                {Boolean(joinResult.participant.studentIds && joinResult.participant.studentIds.length > 1) && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    data-testid="paired-students-badge"
                  >
                    <span>👥</span>
                    <span>Nhóm ghép {joinResult.participant.studentIds!.length} bạn chung máy</span>
                  </div>
                )}
                <div style={{ fontSize: '14px', color: UI_COLORS.textMuted, marginTop: '2px' }}>
                  {joinResult.participant.identityLevel === 'account' && '⭐ Học sinh có tài khoản (Được lưu EXP)'}
                  {joinResult.participant.identityLevel === 'roster' && '📋 Học sinh trong danh sách (Không lưu EXP)'}
                  {joinResult.participant.identityLevel === 'guest' && '👤 Khách tự do'}
                </div>
                {joinResult.participant.teamName && (
                  <div style={{ marginTop: '4px', fontWeight: 600, color: UI_COLORS.secondary }}>
                    Đội/Nhóm: {joinResult.participant.teamName}
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={() => setShowAvatarModal(true)}
                style={{ marginTop: '4px', minHeight: '44px', fontWeight: 700 }}
                data-testid="btn-open-avatar-customizer"
              >
                👗 Đổi diện mạo Mascot
              </Button>
            </div>

            {rewardNotification && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: UI_RADII.card,
                  backgroundColor: '#FEF3C7',
                  border: `2px solid ${UI_COLORS.warning}`,
                  color: '#92400E',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  textAlign: 'left',
                }}
                data-testid="reward-notification-banner"
              >
                <div style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎁</span>
                  <span>
                    {joinResult.participant.studentIds && joinResult.participant.studentIds.length > 1
                      ? `Thưởng +${rewardNotification.exp} EXP cho cả nhóm (${joinResult.participant.displayName})!`
                      : `Bạn vừa được thưởng +${rewardNotification.exp} EXP!`}
                  </span>
                </div>
                <div style={{ fontSize: '13px' }}>
                  Lý do: <em>{rewardNotification.reason}</em>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {rewardNotification.persisted ? (
                    joinResult.participant.studentIds && joinResult.participant.studentIds.length > 1 ? (
                      <span style={{ color: UI_COLORS.success }}>
                        🚀 Cả {joinResult.participant.studentIds.length} bạn đều được lưu EXP vĩnh viễn vào tài khoản cá nhân!
                      </span>
                    ) : rewardNotification.leveledUp ? (
                      <span style={{ color: UI_COLORS.success }}>
                        🚀 Lên Level {rewardNotification.newLevel}! (Tổng: {rewardNotification.newTotalExp} EXP)
                      </span>
                    ) : (
                      <span>Tổng tích lũy: {rewardNotification.newTotalExp} EXP</span>
                    )
                  ) : (
                    <span style={{ color: '#B45309' }}>
                      ℹ️ Điểm tạm thời trong phiên. Đăng nhập bằng PIN để lưu EXP vĩnh viễn!
                    </span>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                padding: '12px',
                backgroundColor: '#ECFDF5',
                borderRadius: UI_RADII.card,
                color: UI_COLORS.success,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              data-testid="waiting-room-status"
            >
              <span>🟢</span>
              <span>Đã sẵn sàng! Đang chờ thầy/cô bắt đầu bài học...</span>
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowChatModal(true)}
              fullWidth
              style={{ minHeight: '48px', fontSize: '15px', fontWeight: 600 }}
              data-testid="btn-open-student-chat"
            >
              💬 Trò chuyện & ✋ Xin giúp
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('educlass_participant_token');
                }
                setJoinResult(null);
                setSelectedStudent(null);
                setSelectedStudents([]);
                setPins({});
                setStep('code');
              }}
              style={{ alignSelf: 'center', marginTop: '4px' }}
              data-testid="btn-leave-room"
            >
              Rời phòng
            </Button>
          </div>
        </Card>
      )}

      {/* Bước 5: Tiết học đã kết thúc & Màn tổng kết cuối tiết cho HS (Task 1.8 & Task 5.3) */}
      {step === 'session_closed' && (
        <div style={{ width: '100%' }} data-testid="session-closed-notice">
          <StudentSessionSummaryView
            summary={computedSummary}
            onRejoin={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('educlass_participant_token');
              }
              setJoinResult(null);
              setLastParticipant(null);
              setSessionSummary(null);
              setRewardsHistory([]);
              setJoinCode('');
              setRosterData(null);
              setSelectedStudent(null);
              setSelectedStudents([]);
              setPins({});
              setNickname('');
              setPin('');
              setTeamName('');
              setErrorMsg(null);
              setStep('code');
            }}
          />
        </div>
      )}

      {/* Modal Báo thầy/cô */}
      <Modal
        isOpen={showTeacherReportModal}
        onClose={() => setShowTeacherReportModal(false)}
        title="Báo cáo thầy/cô"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reportSent ? (
            <Banner
              type="success"
              message="Đã gửi thông báo! Yêu cầu của bạn đã được chuyển tới màn hình của giáo viên để hỗ trợ mở lại tên."
            />
          ) : (
            <>
              <p style={{ margin: 0, color: UI_COLORS.text }}>
                Bạn gặp sự cố tên bị trùng hoặc không vào được lớp? Bấm nút xác nhận bên dưới để gửi
                tín hiệu tới màn hình giáo viên.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  onClick={() => setShowTeacherReportModal(false)}
                  data-testid="btn-modal-cancel"
                >
                  Hủy
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReportTeacher}
                  data-testid="btn-modal-confirm-report"
                >
                  Gửi báo cáo
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Trò chuyện & Xin giúp học sinh (Task 5.2) */}
      <Modal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="💬 Trò chuyện & ✋ Xin giúp"
      >
        <div style={{ height: '480px', display: 'flex', flexDirection: 'column' }} data-testid="student-chat-modal">
          <ChatBox
            role="student"
            currentParticipantId={joinResult?.participant.id}
            currentUserName={joinResult?.participant.displayName}
            messages={messages}
            chatLocked={locked}
            onSendMessage={(content, toPartId) => void handleSendChat({ content, toParticipantId: toPartId ?? null })}
            onHandRaise={handleRequestHandRaise}
          />
        </div>
      </Modal>

      {/* Modal Phòng thay đồ Mascot */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="👗 Phòng Thay Đồ Mascot"
      >
        <AvatarCustomizer
          currentConfig={avatarConfig}
          onSave={handleSaveAvatar}
          onCancel={() => setShowAvatarModal(false)}
        />
      </Modal>

      {/* Footer phiên bản ứng dụng */}
      <footer
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94A3B8',
          paddingBottom: '16px',
        }}
        data-testid="student-portal-version"
      >
        EduClass v{APP_VERSION}
      </footer>
    </main>
  );
};
