import React, { useState } from 'react';
import type {
  ClassDto,
  CreateSessionRequest,
  IdentityMode,
  ParticipantDto,
  SessionDetailResponse,
  SessionReportDto,
  ChatMessageDto,
  ChatMode,
  HandRaiseItem,
} from '@educlass/protocol';
import { Button, Card, Modal, ChatBox, UI_COLORS, UI_RADII } from '@educlass/ui-kit';
import { SessionReportView } from './SessionReportView.js';

export interface SessionControlProps {
  classes: ClassDto[];
  activeSession?: SessionDetailResponse | null | undefined;
  participants?: ParticipantDto[] | undefined;
  sessionReport?: SessionReportDto | null | undefined;
  chatMessages?: ChatMessageDto[] | undefined;
  handRaises?: HandRaiseItem[] | undefined;
  chatLocked?: boolean | undefined;
  chatMode?: ChatMode | undefined;
  onOpenSession: (req: CreateSessionRequest) => Promise<void> | void;
  onCloseSession: (sessionId: string) => Promise<void> | void;
  onReleaseParticipant?: ((participantId: string) => Promise<void> | void) | undefined;
  onGrantReward?: ((participantId: string, exp: number, reason: string) => Promise<void> | void) | undefined;
  onResetReport?: (() => void) | undefined;
  onExportExcel?: ((sessionId: string) => Promise<void> | void) | undefined;
  onSendChatMessage?: ((payload: { content: string; toParticipantId?: string | null }) => Promise<void> | void) | undefined;
  onToggleChatLock?: ((locked: boolean) => Promise<void> | void) | undefined;
  onChangeChatMode?: ((mode: ChatMode) => Promise<void> | void) | undefined;
  onResolveHandRaise?: ((handRaiseId: string) => Promise<void> | void) | undefined;
  hasActiveExam?: boolean | undefined;
  activeExamTitle?: string | undefined;
  activeExamBatch?: number | undefined;
}

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

export const SessionControl: React.FC<SessionControlProps> = ({
  classes,
  activeSession,
  participants = [],
  sessionReport,
  chatMessages,
  handRaises,
  chatLocked,
  chatMode,
  onOpenSession,
  onCloseSession,
  onReleaseParticipant,
  onGrantReward,
  onResetReport,
  onExportExcel,
  onSendChatMessage,
  onToggleChatLock,
  onChangeChatMode,
  onResolveHandRaise,
  hasActiveExam,
  activeExamTitle,
  activeExamBatch,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [internalChatMessages, setInternalChatMessages] = useState<ChatMessageDto[]>([]);
  const [internalChatLocked, setInternalChatLocked] = useState(true);
  const [internalChatMode, setInternalChatMode] = useState<ChatMode>('locked');
  const [internalHandRaises, setInternalHandRaises] = useState<HandRaiseItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [identityMode, setIdentityMode] = useState<IdentityMode>('roster_or_guest');
  const [allowTeams, setAllowTeams] = useState<boolean>(false);
  const [allowPairing, setAllowPairing] = useState<boolean>(false);
  const [maxStudentsPerDevice, setMaxStudentsPerDevice] = useState<number>(2);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);

  const handleCopyJoinLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const joinCode = getSessionJoinCode(activeSession);
    const targetUrl =
      activeSession?.joinUrl ||
      (activeSession as unknown as { session?: { joinUrl?: string } })?.session?.joinUrl ||
      (joinCode ? `${window.location.origin}/?code=${joinCode}` : '');

    if (!targetUrl) return;

    let copied = false;

    // 1. Nếu đang chạy trong Electron: Dùng Electron native clipboard qua IPC (hoạt động 100% không phụ thuộc window focus)
    const electronAPI = (window as unknown as { electronAPI?: { copyText?: (t: string) => Promise<boolean> } }).electronAPI;
    if (typeof electronAPI?.copyText === 'function') {
      try {
        const ok = await electronAPI.copyText(targetUrl);
        if (ok) copied = true;
      } catch {
        // Fallback tiếp xuống Web API nếu có lỗi
      }
    }

    // 2. Nếu chưa copy thành công, thử navigator.clipboard.writeText
    if (!copied && typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        window.focus();
        await navigator.clipboard.writeText(targetUrl);
        copied = true;
      } catch {
        // Bị chặn do focus hoặc permission -> rơi xuống fallback execCommand
      }
    }

    // 3. Fallback textarea ẩn + execCommand('copy')
    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = targetUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) copied = true;
      } catch {
        // Bỏ qua lỗi copy
      }
    }

    if (copied) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const messages = chatMessages ?? internalChatMessages;
  const locked = chatLocked ?? internalChatLocked;
  const currentMode = chatMode ?? internalChatMode;
  const handRaisesList = handRaises ?? internalHandRaises;
  const unresolvedCount = handRaisesList.length;

  const handleSendChat = async (payload: { content: string; toParticipantId?: string | null }) => {
    if (onSendChatMessage) {
      await onSendChatMessage(payload);
    } else {
      const newMsg: ChatMessageDto = {
        id: `msg_${Date.now()}`,
        sessionId: getSessionId(activeSession) || 'sess_active',
        fromTeacher: true,
        fromParticipantId: null,
        fromParticipantName: 'Giáo viên',
        toParticipantId: payload.toParticipantId ?? null,
        kind: 'text',
        text: payload.content,
        ts: Date.now(),
      };
      setInternalChatMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleToggleLock = async (nextLock: boolean) => {
    if (onToggleChatLock) {
      await onToggleChatLock(nextLock);
    } else {
      setInternalChatLocked(nextLock);
      setInternalChatMode(nextLock ? 'locked' : 'open');
    }
  };

  const handleChangeChatMode = async (nextMode: ChatMode) => {
    if (onChangeChatMode) {
      await onChangeChatMode(nextMode);
    } else {
      setInternalChatMode(nextMode);
      setInternalChatLocked(nextMode === 'locked');
    }
    if (onToggleChatLock) {
      await onToggleChatLock(nextMode === 'locked');
    }
  };

  const handleResolveHandRaise = async (participantId: string) => {
    if (onResolveHandRaise) {
      await onResolveHandRaise(participantId);
    } else {
      setInternalHandRaises((prev) =>
        prev.filter((h) => h.participantId !== participantId)
      );
    }
  };

  // State cho Modal Thưởng EXP (Task 1.9)
  const [rewardTarget, setRewardTarget] = useState<ParticipantDto | null>(null);
  const [rewardExp, setRewardExp] = useState<number>(20);
  const [rewardReason, setRewardReason] = useState<string>('Thưởng phát biểu tích cực');
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardError, setRewardError] = useState('');

  const handleOpenSessionSubmit = async () => {
    setErrorMessage('');

    if (identityMode === 'roster_only' && !selectedClassId) {
      setErrorMessage('Chế độ bắt buộc chọn tên yêu cầu phải chọn một lớp học cụ thể.');
      return;
    }

    setLoading(true);
    try {
      await onOpenSession({
        classId: selectedClassId ? selectedClassId : null,
        identityMode,
        allowTeams,
        allowPairing,
        maxStudentsPerDevice,
      });
      setIsModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể mở phiên học.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleCloseSession = async () => {
    if (!activeSession || isClosing) return;
    const sid = getSessionId(activeSession);
    if (!sid) return;

    if (hasActiveExam) {
      const confirmMsg =
        `⚠️ Ca thi "${activeExamTitle || 'Kỳ thi'}" (Ca ${activeExamBatch || 1}) đang diễn ra!\n\n` +
        `Thầy/Cô có chắc chắn muốn kết thúc ca thi này và đóng tiết học không?\n\n` +
        `Toàn bộ bài nộp của học sinh sẽ được thu và lưu an toàn vào sổ điểm. Kỳ thi sẽ tự động sẵn sàng cho Ca ${(activeExamBatch || 1) + 1} ở tiết sau.`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    } else {
      if (!window.confirm('Thầy/cô có chắc chắn muốn kết thúc tiết học và đóng phiên này?')) {
        return;
      }
    }

    setIsClosing(true);
    try {
      await onCloseSession(sid);
    } finally {
      setIsClosing(false);
    }
  };

  // Màn hình khi phiên đang mở
  if (activeSession) {
    const rawClass = activeSession.className || (activeSession as unknown as { session?: { className?: string } }).session?.className;
    const joinCodeDisplay = getSessionJoinCode(activeSession);
    const joinUrlDisplay = activeSession.joinUrl || (activeSession as unknown as { session?: { joinUrl?: string } }).session?.joinUrl;
    const qrDataUrlDisplay = activeSession.qrDataUrl || (activeSession as unknown as { session?: { qrDataUrl?: string } }).session?.qrDataUrl;

    return (
      <>
        <Card data-testid="active-session-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${UI_COLORS.border}`,
              paddingBottom: '16px',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#E8F5E9',
                  color: UI_COLORS.success,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                ● ĐANG DIỄN RA
              </span>
              <h2 style={{ margin: 0, fontSize: '24px' }}>
                {rawClass ? `Lớp: ${rawClass}` : 'Phiên học tự do'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="ghost"
                onClick={() => setIsChatOpen(true)}
                data-testid="btn-open-chat"
                style={{
                  border: `1px solid ${UI_COLORS.primary}`,
                  color: UI_COLORS.primary,
                  fontWeight: 600,
                }}
              >
                💬 Trò chuyện & Trợ giúp {unresolvedCount > 0 ? `✋ (${unresolvedCount})` : ''}
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleCloseSession()}
                disabled={isClosing}
                data-testid="btn-close-session"
              >
                {isClosing ? 'Đang kết thúc...' : 'Kết thúc tiết học'}
              </Button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {/* Mã vào lớp 6 chữ số */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: `2px dashed ${UI_COLORS.primary}`,
                borderRadius: UI_RADII.card,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '16px', color: UI_COLORS.textMuted, marginBottom: '8px' }}>
                MÃ VÀO LỚP CHO HỌC SINH
              </div>
              <div
                style={{
                  fontSize: '54px',
                  fontWeight: 800,
                  letterSpacing: '8px',
                  color: UI_COLORS.primary,
                  fontFamily: 'monospace',
                }}
                data-testid="session-join-code"
              >
                {joinCodeDisplay}
              </div>
              {joinUrlDisplay && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                    🔗 Liên kết vào lớp cho học sinh:
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      wordBreak: 'break-all',
                      color: UI_COLORS.primary,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <a
                      href={joinUrlDisplay}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: UI_COLORS.primary,
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                      title="Mở liên kết học sinh trong tab mới"
                    >
                      {joinUrlDisplay}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyJoinLink}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: copiedLink ? '#DCFCE7' : '#FFFFFF',
                        color: copiedLink ? '#15803D' : '#334155',
                        border: copiedLink ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {copiedLink ? '✓ Đã sao chép!' : '📋 Sao chép link'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mã QR tham gia */}
            {qrDataUrlDisplay && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                }}
              >
                <img
                  src={qrDataUrlDisplay}
                  alt="Mã QR tham gia phiên học"
                  style={{ width: '200px', height: '200px', borderRadius: '12px' }}
                  data-testid="session-qr-image"
                />
                <span style={{ marginTop: '8px', fontSize: '14px', color: UI_COLORS.textMuted }}>
                  Học sinh quét mã để vào lớp ngay
                </span>
              </div>
            )}
          </div>

          {/* Danh sách người tham gia phiên học (Online / Offline & Mở lại tên) */}
          <div
            style={{
              borderTop: `1px solid ${UI_COLORS.border}`,
              paddingTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            data-testid="participants-section"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Người tham gia ({participants.filter((p) => p.status === 'online').length} Online / {participants.length} Tổng)
              </h3>
              <label
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={filterOnlineOnly}
                  onChange={(e) => setFilterOnlineOnly(e.target.checked)}
                />
                Chỉ hiện học sinh đang có mặt
              </label>
            </div>

            {(() => {
              const displayed = filterOnlineOnly
                ? participants.filter((p) => p.status === 'online')
                : participants;

              if (displayed.length === 0) {
                return (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: UI_RADII.card,
                      color: UI_COLORS.textMuted,
                      fontSize: '14px',
                    }}
                    data-testid="participants-empty"
                  >
                    {filterOnlineOnly && participants.length > 0
                      ? 'Tất cả học sinh đã rời khỏi lớp (offline).'
                      : `Chưa có học sinh nào tham gia. Mã vào lớp là ${joinCodeDisplay}.`}
                  </div>
                );
              }

              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                  data-testid="participants-list"
                >
                  {displayed.map((p) => {
                    const isOnline = p.status === 'online';
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 16px',
                        borderRadius: UI_RADII.card,
                        backgroundColor: isOnline ? '#FFFFFF' : '#F1F5F9',
                        border: `1px solid ${isOnline ? UI_COLORS.border : '#E2E8F0'}`,
                      }}
                      data-testid={`participant-row-${p.id}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: isOnline ? UI_COLORS.success : '#94A3B8',
                          }}
                          title={isOnline ? 'Online' : 'Offline'}
                          data-testid={`status-indicator-${p.id}`}
                        />
                        <div>
                          <span
                            style={{
                              fontWeight: 600,
                              color: isOnline ? UI_COLORS.text : '#64748B',
                            }}
                          >
                            {p.displayName}
                          </span>
                          {Boolean(p.studentIds && p.studentIds.length > 1) && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              data-testid={`pairing-badge-${p.id}`}
                            >
                              👥 {p.studentIds!.length} bạn chung máy
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: UI_COLORS.textMuted,
                            }}
                          >
                            ({p.identityLevel === 'account'
                              ? 'Tài khoản'
                              : p.identityLevel === 'roster'
                              ? 'Danh sách'
                              : 'Khách'}
                            {p.teamName ? ` • ${p.teamName}` : ''})
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isOnline && onGrantReward && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setRewardTarget(p);
                              setRewardExp(20);
                              setRewardReason('Thưởng phát biểu tích cực');
                              setRewardError('');
                            }}
                            style={{
                              minHeight: '36px',
                              padding: '4px 12px',
                              fontSize: '13px',
                              border: `1px solid ${UI_COLORS.primary}`,
                              color: UI_COLORS.primary,
                            }}
                            data-testid={`btn-reward-participant-${p.id}`}
                          >
                            🎁 Thưởng EXP
                          </Button>
                        )}
                        {isOnline && onReleaseParticipant && (
                          <Button
                            variant="ghost"
                            onClick={() => void onReleaseParticipant(p.id)}
                            style={{ minHeight: '36px', padding: '4px 12px', fontSize: '13px' }}
                            data-testid={`btn-release-participant-${p.id}`}
                          >
                            🔓 Mở lại tên
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        </div>
      </Card>

      {/* Modal Thưởng EXP (Task 1.9) */}
      <Modal
        isOpen={Boolean(rewardTarget)}
        onClose={() => setRewardTarget(null)}
        title={`🎁 Thưởng EXP cho ${rewardTarget?.displayName ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rewardTarget?.studentIds && rewardTarget.studentIds.length > 1 && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#15803D',
                fontWeight: 600,
              }}
              data-testid="pairing-reward-hint"
            >
              ℹ️ Máy này gồm {rewardTarget.studentIds.length} học sinh. Điểm EXP sẽ được tự động cộng đầy đủ cho từng bạn.
            </div>
          )}
          {rewardError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#FEF2F2',
                border: `1px solid ${UI_COLORS.error}`,
                borderRadius: UI_RADII.card,
                color: UI_COLORS.error,
                fontSize: '13px',
              }}
              data-testid="reward-error-message"
            >
              {rewardError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Mức thưởng EXP:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {[10, 20, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={rewardExp === amount ? 'primary' : 'ghost'}
                  onClick={() => setRewardExp(amount)}
                  style={{
                    flex: 1,
                    minHeight: '40px',
                    border: `1px solid ${rewardExp === amount ? UI_COLORS.primary : UI_COLORS.border}`,
                  }}
                  data-testid={`btn-exp-${amount}`}
                >
                  +{amount}
                </Button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={1000}
              value={rewardExp}
              onChange={(e) => setRewardExp(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              data-testid="input-reward-exp"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              Lý do thưởng:
            </label>
            <input
              type="text"
              value={rewardReason}
              onChange={(e) => setRewardReason(e.target.value)}
              placeholder="VD: Phát biểu tích cực, Tinh thần đồng đội..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: UI_RADII.card,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              data-testid="input-reward-reason"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button
              variant="ghost"
              onClick={() => setRewardTarget(null)}
              disabled={rewardLoading}
              data-testid="btn-cancel-reward"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!rewardTarget || !onGrantReward) return;
                setRewardLoading(true);
                setRewardError('');
                try {
                  await onGrantReward(
                    rewardTarget.id,
                    rewardExp,
                    rewardReason.trim() || 'Thưởng từ giáo viên'
                  );
                  setRewardTarget(null);
                } catch (err) {
                  setRewardError(err instanceof Error ? err.message : 'Không thể cộng thưởng.');
                } finally {
                  setRewardLoading(false);
                }
              }}
              disabled={rewardLoading}
              data-testid="btn-confirm-reward"
            >
              {rewardLoading ? 'Đang cộng...' : '🎁 Xác nhận thưởng'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Trò chuyện & Hỗ trợ (Task 5.2) */}
      <Modal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        title="💬 Trò chuyện & Yêu cầu trợ giúp"
      >
        <div style={{ height: '520px', display: 'flex', flexDirection: 'column' }} data-testid="session-chat-modal">
          <ChatBox
            role="teacher"
            messages={messages}
            activeHandRaises={handRaisesList}
            chatLocked={locked}
            chatMode={currentMode}
            onSendMessage={(content, toPartId) => void handleSendChat({ content, toParticipantId: toPartId ?? null })}
            onToggleChatLock={handleToggleLock}
            onChangeChatMode={handleChangeChatMode}
            onResolveHandRaise={handleResolveHandRaise}
          />
        </div>
      </Modal>
    </>
  );
}

  // Màn hình hiển thị Báo cáo tổng kết khi phiên đã đóng (Task 1.8 & Task 3.4)
  if (sessionReport && !activeSession) {
    return (
      <SessionReportView
        report={sessionReport}
        onExportExcel={onExportExcel}
        onNewSession={onResetReport ?? (() => setIsModalOpen(true))}
      />
    );
  }

  // Màn hình khi chưa có phiên nào mở
  return (
    <Card data-testid="open-session-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Bắt đầu phiên học tương tác</h2>
          <p style={{ margin: '6px 0 0 0', color: UI_COLORS.textMuted }}>
            Mở phiên để học sinh quét mã QR hoặc nhập mã 6 số tham gia tiết học.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          data-testid="btn-open-session-modal"
        >
          🚀 Mở phiên học
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cấu hình phiên học mới"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={() => void handleOpenSessionSubmit()}
              data-testid="btn-submit-open-session"
            >
              Bắt đầu phiên
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FFEBEE',
                color: UI_COLORS.error,
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              data-testid="session-error-message"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}
            >
              Chọn lớp học (hoặc để trống để tạo phiên tự do)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: `1px solid ${UI_COLORS.border}`,
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
              data-testid="select-class"
            >
              <option value="">-- Phiên tự do (Không theo danh sách lớp) --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}
            >
              Chế độ danh tính học sinh (Identity Mode)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="identityMode"
                  value="roster_or_guest"
                  checked={identityMode === 'roster_or_guest'}
                  onChange={() => setIdentityMode('roster_or_guest')}
                />
                <span>Chọn tên trong danh sách hoặc tự nhập nickname (Khuyên dùng)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="identityMode"
                  value="roster_only"
                  checked={identityMode === 'roster_only'}
                  onChange={() => setIdentityMode('roster_only')}
                  disabled={!selectedClassId}
                />
                <span style={{ opacity: selectedClassId ? 1 : 0.5 }}>
                  Bắt buộc chọn đúng tên trong danh sách lớp {!selectedClassId && '(cần chọn lớp)'}
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="identityMode"
                  value="guest_only"
                  checked={identityMode === 'guest_only'}
                  onChange={() => setIdentityMode('guest_only')}
                />
                <span>Chỉ tự do nhập nickname (Không dùng danh sách)</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowTeams}
                onChange={(e) => setAllowTeams(e.target.checked)}
                data-testid="checkbox-allow-teams"
              />
              <span style={{ fontWeight: 600 }}>Cho phép chia đội / nhóm học tập</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowPairing}
                onChange={(e) => setAllowPairing(e.target.checked)}
                data-testid="checkbox-allow-pairing"
              />
              <span style={{ fontWeight: 600 }}>Cho phép ghép 2–3 học sinh ngồi chung 1 máy</span>
            </label>
            {allowPairing && (
              <div
                style={{
                  marginLeft: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: UI_COLORS.textMuted }}>Số lượng tối đa mỗi máy:</span>
                <select
                  value={maxStudentsPerDevice}
                  onChange={(e) => setMaxStudentsPerDevice(Number(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${UI_COLORS.border}`,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                  data-testid="select-max-students-per-device"
                >
                  <option value={2}>2 học sinh / máy (Đôi bạn cùng tiến)</option>
                  <option value={3}>3 học sinh / máy (Nhóm 3 bạn)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Card>
  );
};
