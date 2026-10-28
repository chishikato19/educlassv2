import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Card, Modal, ChatBox, UI_COLORS, UI_RADII } from '@educlass/ui-kit';
import { SessionReportView } from './SessionReportView.js';
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
export const SessionControl = ({ classes, activeSession, participants = [], sessionReport, chatMessages, handRaises, chatLocked, chatMode, onOpenSession, onCloseSession, onReleaseParticipant, onGrantReward, onResetReport, onExportExcel, onSendChatMessage, onToggleChatLock, onChangeChatMode, onResolveHandRaise, hasActiveExam, activeExamTitle, activeExamBatch, }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [internalChatMessages, setInternalChatMessages] = useState([]);
    const [internalChatLocked, setInternalChatLocked] = useState(true);
    const [internalChatMode, setInternalChatMode] = useState('locked');
    const [internalHandRaises, setInternalHandRaises] = useState([]);
    const [copiedLink, setCopiedLink] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [identityMode, setIdentityMode] = useState('roster_or_guest');
    const [allowTeams, setAllowTeams] = useState(false);
    const [allowPairing, setAllowPairing] = useState(false);
    const [maxStudentsPerDevice, setMaxStudentsPerDevice] = useState(2);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);
    const handleCopyJoinLink = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const joinCode = getSessionJoinCode(activeSession);
        const targetUrl = activeSession?.joinUrl ||
            activeSession?.session?.joinUrl ||
            (joinCode ? `${window.location.origin}/?code=${joinCode}` : '');
        if (!targetUrl)
            return;
        let copied = false;
        // 1. Nếu đang chạy trong Electron: Dùng Electron native clipboard qua IPC (hoạt động 100% không phụ thuộc window focus)
        const electronAPI = window.electronAPI;
        if (typeof electronAPI?.copyText === 'function') {
            try {
                const ok = await electronAPI.copyText(targetUrl);
                if (ok)
                    copied = true;
            }
            catch {
                // Fallback tiếp xuống Web API nếu có lỗi
            }
        }
        // 2. Nếu chưa copy thành công, thử navigator.clipboard.writeText
        if (!copied &&
            typeof navigator !== 'undefined' &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function') {
            try {
                window.focus();
                await navigator.clipboard.writeText(targetUrl);
                copied = true;
            }
            catch {
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
                if (ok)
                    copied = true;
            }
            catch {
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
    const handleSendChat = async (payload) => {
        if (onSendChatMessage) {
            await onSendChatMessage(payload);
        }
        else {
            const newMsg = {
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
            setInternalChatMessages(prev => [...prev, newMsg]);
        }
    };
    const handleToggleLock = async (nextLock) => {
        if (onToggleChatLock) {
            await onToggleChatLock(nextLock);
        }
        else {
            setInternalChatLocked(nextLock);
            setInternalChatMode(nextLock ? 'locked' : 'open');
        }
    };
    const handleChangeChatMode = async (nextMode) => {
        if (onChangeChatMode) {
            await onChangeChatMode(nextMode);
        }
        else {
            setInternalChatMode(nextMode);
            setInternalChatLocked(nextMode === 'locked');
        }
        if (onToggleChatLock) {
            await onToggleChatLock(nextMode === 'locked');
        }
    };
    const handleResolveHandRaise = async (participantId) => {
        if (onResolveHandRaise) {
            await onResolveHandRaise(participantId);
        }
        else {
            setInternalHandRaises(prev => prev.filter(h => h.participantId !== participantId));
        }
    };
    // State cho Modal Thưởng EXP (Task 1.9)
    const [rewardTarget, setRewardTarget] = useState(null);
    const [rewardExp, setRewardExp] = useState(20);
    const [rewardReason, setRewardReason] = useState('Thưởng phát biểu tích cực');
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể mở phiên học.';
            setErrorMessage(msg);
        }
        finally {
            setLoading(false);
        }
    };
    const [isClosing, setIsClosing] = useState(false);
    const handleCloseSession = async () => {
        if (!activeSession || isClosing)
            return;
        const sid = getSessionId(activeSession);
        if (!sid)
            return;
        if (hasActiveExam) {
            const confirmMsg = `⚠️ Ca thi "${activeExamTitle || 'Kỳ thi'}" (Ca ${activeExamBatch || 1}) đang diễn ra!\n\n` +
                `Thầy/Cô có chắc chắn muốn kết thúc ca thi này và đóng tiết học không?\n\n` +
                `Toàn bộ bài nộp của học sinh sẽ được thu và lưu an toàn vào sổ điểm. Kỳ thi sẽ tự động sẵn sàng cho Ca ${(activeExamBatch || 1) + 1} ở tiết sau.`;
            if (!window.confirm(confirmMsg)) {
                return;
            }
        }
        else {
            if (!window.confirm('Thầy/cô có chắc chắn muốn kết thúc tiết học và đóng phiên này?')) {
                return;
            }
        }
        setIsClosing(true);
        try {
            await onCloseSession(sid);
        }
        finally {
            setIsClosing(false);
        }
    };
    // Màn hình khi phiên đang mở
    if (activeSession) {
        const rawClass = activeSession.className ||
            activeSession.session?.className;
        const joinCodeDisplay = getSessionJoinCode(activeSession);
        const joinUrlDisplay = activeSession.joinUrl ||
            activeSession.session?.joinUrl;
        const qrDataUrlDisplay = activeSession.qrDataUrl ||
            activeSession.session?.qrDataUrl;
        return (_jsxs(_Fragment, { children: [_jsx(Card, { "data-testid": "active-session-card", children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: `1px solid ${UI_COLORS.border}`,
                                    paddingBottom: '16px',
                                }, children: [_jsxs("div", { children: [_jsx("span", { style: {
                                                    display: 'inline-block',
                                                    backgroundColor: '#E8F5E9',
                                                    color: UI_COLORS.success,
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: 700,
                                                    marginBottom: '6px',
                                                }, children: "\u25CF \u0110ANG DI\u1EC4N RA" }), _jsx("h2", { style: { margin: 0, fontSize: '24px' }, children: rawClass ? `Lớp: ${rawClass}` : 'Phiên học tự do' })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsxs(Button, { variant: "ghost", onClick: () => setIsChatOpen(true), "data-testid": "btn-open-chat", style: {
                                                    border: `1px solid ${UI_COLORS.primary}`,
                                                    color: UI_COLORS.primary,
                                                    fontWeight: 600,
                                                }, children: ["\uD83D\uDCAC Tr\u00F2 chuy\u1EC7n & Tr\u1EE3 gi\u00FAp ", unresolvedCount > 0 ? `✋ (${unresolvedCount})` : ''] }), _jsx(Button, { variant: "danger", onClick: () => void handleCloseSession(), disabled: isClosing, "data-testid": "btn-close-session", children: isClosing ? 'Đang kết thúc...' : 'Kết thúc tiết học' })] })] }), _jsxs("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '24px',
                                    alignItems: 'center',
                                }, children: [_jsxs("div", { style: {
                                            backgroundColor: '#EFF6FF',
                                            border: `2px dashed ${UI_COLORS.primary}`,
                                            borderRadius: UI_RADII.card,
                                            padding: '24px',
                                            textAlign: 'center',
                                        }, children: [_jsx("div", { style: { fontSize: '16px', color: UI_COLORS.textMuted, marginBottom: '8px' }, children: "M\u00C3 V\u00C0O L\u1EDAP CHO H\u1ECCC SINH" }), _jsx("div", { style: {
                                                    fontSize: '54px',
                                                    fontWeight: 800,
                                                    letterSpacing: '8px',
                                                    color: UI_COLORS.primary,
                                                    fontFamily: 'monospace',
                                                }, "data-testid": "session-join-code", children: joinCodeDisplay }), joinUrlDisplay && (_jsxs("div", { style: {
                                                    marginTop: '16px',
                                                    padding: '10px 14px',
                                                    backgroundColor: '#F8FAFC',
                                                    borderRadius: '10px',
                                                    border: '1px solid #E2E8F0',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    alignItems: 'center',
                                                }, children: [_jsx("div", { style: { fontSize: '12px', fontWeight: 600, color: '#64748B' }, children: "\uD83D\uDD17 Li\u00EAn k\u1EBFt v\u00E0o l\u1EDBp cho h\u1ECDc sinh:" }), _jsxs("div", { style: {
                                                            fontSize: '13px',
                                                            wordBreak: 'break-all',
                                                            color: UI_COLORS.primary,
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                        }, children: [_jsx("a", { href: joinUrlDisplay, target: "_blank", rel: "noopener noreferrer", style: {
                                                                    color: UI_COLORS.primary,
                                                                    textDecoration: 'underline',
                                                                    fontWeight: 600,
                                                                }, title: "M\u1EDF li\u00EAn k\u1EBFt h\u1ECDc sinh trong tab m\u1EDBi", children: joinUrlDisplay }), _jsx("button", { type: "button", onClick: handleCopyJoinLink, style: {
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
                                                                }, children: copiedLink ? '✓ Đã sao chép!' : '📋 Sao chép link' })] })] }))] }), qrDataUrlDisplay && (_jsxs("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            padding: '16px',
                                        }, children: [_jsx("img", { src: qrDataUrlDisplay, alt: "M\u00E3 QR tham gia phi\u00EAn h\u1ECDc", style: { width: '200px', height: '200px', borderRadius: '12px' }, "data-testid": "session-qr-image" }), _jsx("span", { style: { marginTop: '8px', fontSize: '14px', color: UI_COLORS.textMuted }, children: "H\u1ECDc sinh qu\u00E9t m\u00E3 \u0111\u1EC3 v\u00E0o l\u1EDBp ngay" })] }))] }), _jsxs("div", { style: {
                                    borderTop: `1px solid ${UI_COLORS.border}`,
                                    paddingTop: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                }, "data-testid": "participants-section", children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                        }, children: [_jsxs("h3", { style: { margin: 0, fontSize: '18px', fontWeight: 700 }, children: ["Ng\u01B0\u1EDDi tham gia (", participants.filter(p => p.status === 'online').length, " Online /", ' ', participants.length, " T\u1ED5ng)"] }), _jsxs("label", { style: {
                                                    fontSize: '13px',
                                                    color: '#475569',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }, children: [_jsx("input", { type: "checkbox", checked: filterOnlineOnly, onChange: e => setFilterOnlineOnly(e.target.checked) }), "Ch\u1EC9 hi\u1EC7n h\u1ECDc sinh \u0111ang c\u00F3 m\u1EB7t"] })] }), (() => {
                                        const displayed = filterOnlineOnly
                                            ? participants.filter(p => p.status === 'online')
                                            : participants;
                                        if (displayed.length === 0) {
                                            return (_jsx("div", { style: {
                                                    textAlign: 'center',
                                                    padding: '24px',
                                                    backgroundColor: '#F8FAFC',
                                                    borderRadius: UI_RADII.card,
                                                    color: UI_COLORS.textMuted,
                                                    fontSize: '14px',
                                                }, "data-testid": "participants-empty", children: filterOnlineOnly && participants.length > 0
                                                    ? 'Tất cả học sinh đã rời khỏi lớp (offline).'
                                                    : `Chưa có học sinh nào tham gia. Mã vào lớp là ${joinCodeDisplay}.` }));
                                        }
                                        return (_jsx("div", { style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                maxHeight: '300px',
                                                overflowY: 'auto',
                                            }, "data-testid": "participants-list", children: displayed.map(p => {
                                                const isOnline = p.status === 'online';
                                                return (_jsxs("div", { style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '10px 16px',
                                                        borderRadius: UI_RADII.card,
                                                        backgroundColor: isOnline ? '#FFFFFF' : '#F1F5F9',
                                                        border: `1px solid ${isOnline ? UI_COLORS.border : '#E2E8F0'}`,
                                                    }, "data-testid": `participant-row-${p.id}`, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: {
                                                                        display: 'inline-block',
                                                                        width: '10px',
                                                                        height: '10px',
                                                                        borderRadius: '50%',
                                                                        backgroundColor: isOnline ? UI_COLORS.success : '#94A3B8',
                                                                    }, title: isOnline ? 'Online' : 'Offline', "data-testid": `status-indicator-${p.id}` }), _jsxs("div", { children: [_jsx("span", { style: {
                                                                                fontWeight: 600,
                                                                                color: isOnline ? UI_COLORS.text : '#64748B',
                                                                            }, children: p.displayName }), Boolean(p.studentIds && p.studentIds.length > 1) && (_jsxs("span", { style: {
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
                                                                            }, "data-testid": `pairing-badge-${p.id}`, children: ["\uD83D\uDC65 ", p.studentIds.length, " b\u1EA1n chung m\u00E1y"] })), _jsxs("span", { style: {
                                                                                marginLeft: '8px',
                                                                                fontSize: '12px',
                                                                                color: UI_COLORS.textMuted,
                                                                            }, children: ["(", p.identityLevel === 'account'
                                                                                    ? 'Tài khoản'
                                                                                    : p.identityLevel === 'roster'
                                                                                        ? 'Danh sách'
                                                                                        : 'Khách', p.teamName ? ` • ${p.teamName}` : '', ")"] })] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [isOnline && onGrantReward && (_jsx(Button, { variant: "ghost", onClick: () => {
                                                                        setRewardTarget(p);
                                                                        setRewardExp(20);
                                                                        setRewardReason('Thưởng phát biểu tích cực');
                                                                        setRewardError('');
                                                                    }, style: {
                                                                        minHeight: '36px',
                                                                        padding: '4px 12px',
                                                                        fontSize: '13px',
                                                                        border: `1px solid ${UI_COLORS.primary}`,
                                                                        color: UI_COLORS.primary,
                                                                    }, "data-testid": `btn-reward-participant-${p.id}`, children: "\uD83C\uDF81 Th\u01B0\u1EDFng EXP" })), isOnline && onReleaseParticipant && (_jsx(Button, { variant: "ghost", onClick: () => void onReleaseParticipant(p.id), style: { minHeight: '36px', padding: '4px 12px', fontSize: '13px' }, "data-testid": `btn-release-participant-${p.id}`, children: "\uD83D\uDD13 M\u1EDF l\u1EA1i t\u00EAn" }))] })] }, p.id));
                                            }) }));
                                    })()] })] }) }), _jsx(Modal, { isOpen: Boolean(rewardTarget), onClose: () => setRewardTarget(null), title: `🎁 Thưởng EXP cho ${rewardTarget?.displayName ?? ''}`, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [rewardTarget?.studentIds && rewardTarget.studentIds.length > 1 && (_jsxs("div", { style: {
                                    padding: '8px 12px',
                                    backgroundColor: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#15803D',
                                    fontWeight: 600,
                                }, "data-testid": "pairing-reward-hint", children: ["\u2139\uFE0F M\u00E1y n\u00E0y g\u1ED3m ", rewardTarget.studentIds.length, " h\u1ECDc sinh. \u0110i\u1EC3m EXP s\u1EBD \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng c\u1ED9ng \u0111\u1EA7y \u0111\u1EE7 cho t\u1EEBng b\u1EA1n."] })), rewardError && (_jsx("div", { style: {
                                    padding: '10px 12px',
                                    backgroundColor: '#FEF2F2',
                                    border: `1px solid ${UI_COLORS.error}`,
                                    borderRadius: UI_RADII.card,
                                    color: UI_COLORS.error,
                                    fontSize: '13px',
                                }, "data-testid": "reward-error-message", children: rewardError })), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }, children: "M\u1EE9c th\u01B0\u1EDFng EXP:" }), _jsx("div", { style: { display: 'flex', gap: '8px', marginBottom: '8px' }, children: [10, 20, 50, 100].map(amount => (_jsxs(Button, { type: "button", variant: rewardExp === amount ? 'primary' : 'ghost', onClick: () => setRewardExp(amount), style: {
                                                flex: 1,
                                                minHeight: '40px',
                                                border: `1px solid ${rewardExp === amount ? UI_COLORS.primary : UI_COLORS.border}`,
                                            }, "data-testid": `btn-exp-${amount}`, children: ["+", amount] }, amount))) }), _jsx("input", { type: "number", min: 1, max: 1000, value: rewardExp, onChange: e => setRewardExp(Math.max(1, parseInt(e.target.value, 10) || 1)), style: {
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: `1px solid ${UI_COLORS.border}`,
                                            borderRadius: UI_RADII.card,
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                        }, "data-testid": "input-reward-exp" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }, children: "L\u00FD do th\u01B0\u1EDFng:" }), _jsx("input", { type: "text", value: rewardReason, onChange: e => setRewardReason(e.target.value), placeholder: "VD: Ph\u00E1t bi\u1EC3u t\u00EDch c\u1EF1c, Tinh th\u1EA7n \u0111\u1ED3ng \u0111\u1ED9i...", style: {
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: `1px solid ${UI_COLORS.border}`,
                                            borderRadius: UI_RADII.card,
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                        }, "data-testid": "input-reward-reason" })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => setRewardTarget(null), disabled: rewardLoading, "data-testid": "btn-cancel-reward", children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", onClick: async () => {
                                            if (!rewardTarget || !onGrantReward)
                                                return;
                                            setRewardLoading(true);
                                            setRewardError('');
                                            try {
                                                await onGrantReward(rewardTarget.id, rewardExp, rewardReason.trim() || 'Thưởng từ giáo viên');
                                                setRewardTarget(null);
                                            }
                                            catch (err) {
                                                setRewardError(err instanceof Error ? err.message : 'Không thể cộng thưởng.');
                                            }
                                            finally {
                                                setRewardLoading(false);
                                            }
                                        }, disabled: rewardLoading, "data-testid": "btn-confirm-reward", children: rewardLoading ? 'Đang cộng...' : '🎁 Xác nhận thưởng' })] })] }) }), _jsx(Modal, { isOpen: isChatOpen, onClose: () => setIsChatOpen(false), title: "\uD83D\uDCAC Tr\u00F2 chuy\u1EC7n & Y\u00EAu c\u1EA7u tr\u1EE3 gi\u00FAp", children: _jsx("div", { style: { height: '520px', display: 'flex', flexDirection: 'column' }, "data-testid": "session-chat-modal", children: _jsx(ChatBox, { role: "teacher", messages: messages, activeHandRaises: handRaisesList, chatLocked: locked, chatMode: currentMode, onSendMessage: (content, toPartId) => void handleSendChat({ content, toParticipantId: toPartId ?? null }), onToggleChatLock: handleToggleLock, onChangeChatMode: handleChangeChatMode, onResolveHandRaise: handleResolveHandRaise }) }) })] }));
    }
    // Màn hình hiển thị Báo cáo tổng kết khi phiên đã đóng (Task 1.8 & Task 3.4)
    if (sessionReport && !activeSession) {
        return (_jsx(SessionReportView, { report: sessionReport, onExportExcel: onExportExcel, onNewSession: onResetReport ?? (() => setIsModalOpen(true)) }));
    }
    // Màn hình khi chưa có phiên nào mở
    return (_jsxs(Card, { "data-testid": "open-session-card", children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: '24px' }, children: "B\u1EAFt \u0111\u1EA7u phi\u00EAn h\u1ECDc t\u01B0\u01A1ng t\u00E1c" }), _jsx("p", { style: { margin: '6px 0 0 0', color: UI_COLORS.textMuted }, children: "M\u1EDF phi\u00EAn \u0111\u1EC3 h\u1ECDc sinh qu\u00E9t m\u00E3 QR ho\u1EB7c nh\u1EADp m\u00E3 6 s\u1ED1 tham gia ti\u1EBFt h\u1ECDc." })] }), _jsx(Button, { variant: "primary", onClick: () => {
                            setErrorMessage('');
                            setIsModalOpen(true);
                        }, "data-testid": "btn-open-session-modal", children: "\uD83D\uDE80 M\u1EDF phi\u00EAn h\u1ECDc" })] }), _jsx(Modal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), title: "C\u1EA5u h\u00ECnh phi\u00EAn h\u1ECDc m\u1EDBi", footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => setIsModalOpen(false), children: "H\u1EE7y" }), _jsx(Button, { variant: "primary", loading: loading, onClick: () => void handleOpenSessionSubmit(), "data-testid": "btn-submit-open-session", children: "B\u1EAFt \u0111\u1EA7u phi\u00EAn" })] }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [errorMessage && (_jsx("div", { style: {
                                backgroundColor: '#FFEBEE',
                                color: UI_COLORS.error,
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                            }, "data-testid": "session-error-message", children: errorMessage })), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }, children: "Ch\u1ECDn l\u1EDBp h\u1ECDc (ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 t\u1EA1o phi\u00EAn t\u1EF1 do)" }), _jsxs("select", { value: selectedClassId, onChange: e => setSelectedClassId(e.target.value), style: {
                                        width: '100%',
                                        minHeight: '48px',
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '16px',
                                        boxSizing: 'border-box',
                                    }, "data-testid": "select-class", children: [_jsx("option", { value: "", children: "-- Phi\u00EAn t\u1EF1 do (Kh\u00F4ng theo danh s\u00E1ch l\u1EDBp) --" }), classes.map(cls => (_jsxs("option", { value: cls.id, children: [cls.name, " (", cls.year, ")"] }, cls.id)))] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }, children: "Ch\u1EBF \u0111\u1ED9 danh t\u00EDnh h\u1ECDc sinh (Identity Mode)" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "identityMode", value: "roster_or_guest", checked: identityMode === 'roster_or_guest', onChange: () => setIdentityMode('roster_or_guest') }), _jsx("span", { children: "Ch\u1ECDn t\u00EAn trong danh s\u00E1ch ho\u1EB7c t\u1EF1 nh\u1EADp nickname (Khuy\u00EAn d\u00F9ng)" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "identityMode", value: "roster_only", checked: identityMode === 'roster_only', onChange: () => setIdentityMode('roster_only'), disabled: !selectedClassId }), _jsxs("span", { style: { opacity: selectedClassId ? 1 : 0.5 }, children: ["B\u1EAFt bu\u1ED9c ch\u1ECDn \u0111\u00FAng t\u00EAn trong danh s\u00E1ch l\u1EDBp ", !selectedClassId && '(cần chọn lớp)'] })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "radio", name: "identityMode", value: "guest_only", checked: identityMode === 'guest_only', onChange: () => setIdentityMode('guest_only') }), _jsx("span", { children: "Ch\u1EC9 t\u1EF1 do nh\u1EADp nickname (Kh\u00F4ng d\u00F9ng danh s\u00E1ch)" })] })] })] }), _jsx("div", { children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: allowTeams, onChange: e => setAllowTeams(e.target.checked), "data-testid": "checkbox-allow-teams" }), _jsx("span", { style: { fontWeight: 600 }, children: "Cho ph\u00E9p chia \u0111\u1ED9i / nh\u00F3m h\u1ECDc t\u1EADp" })] }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: allowPairing, onChange: e => setAllowPairing(e.target.checked), "data-testid": "checkbox-allow-pairing" }), _jsx("span", { style: { fontWeight: 600 }, children: "Cho ph\u00E9p gh\u00E9p 2\u20133 h\u1ECDc sinh ng\u1ED3i chung 1 m\u00E1y" })] }), allowPairing && (_jsxs("div", { style: {
                                        marginLeft: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        fontSize: '14px',
                                    }, children: [_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "S\u1ED1 l\u01B0\u1EE3ng t\u1ED1i \u0111a m\u1ED7i m\u00E1y:" }), _jsxs("select", { value: maxStudentsPerDevice, onChange: e => setMaxStudentsPerDevice(Number(e.target.value)), style: {
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: `1px solid ${UI_COLORS.border}`,
                                                fontSize: '14px',
                                                fontWeight: 600,
                                            }, "data-testid": "select-max-students-per-device", children: [_jsx("option", { value: 2, children: "2 h\u1ECDc sinh / m\u00E1y (\u0110\u00F4i b\u1EA1n c\u00F9ng ti\u1EBFn)" }), _jsx("option", { value: 3, children: "3 h\u1ECDc sinh / m\u00E1y (Nh\u00F3m 3 b\u1EA1n)" })] })] }))] })] }) })] }));
};
//# sourceMappingURL=SessionControl.js.map