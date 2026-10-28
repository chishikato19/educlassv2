import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, UI_COLORS, UI_RADII, UI_SHADOWS } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { SessionReportView } from './SessionReportView.js';
function getSessionId(sessionData) {
    if (!sessionData)
        return '';
    if (sessionData.session?.id)
        return sessionData.session.id;
    const raw = sessionData;
    return raw.id ?? '';
}
function formatDateTime(ts) {
    if (!ts)
        return '';
    const d = new Date(ts);
    return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
function formatTimeOnly(ts) {
    if (!ts)
        return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
export const SessionReportsTab = ({ activeSession, currentSessionReport, onNewSession, onExportExcel, }) => {
    const [reports, setReports] = useState([]);
    const [activeQuizRuns, setActiveQuizRuns] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('quiz_table');
    const activeSessionId = getSessionId(activeSession);
    // 1. Tải danh sách báo cáo lịch sử và toàn bộ các lần thi Quizizz trong phiên hiện tại
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [list, activeRuns] = await Promise.all([
                api.getSessionReports(),
                activeSessionId ? api.getQuizRuns(activeSessionId) : Promise.resolve([]),
            ]);
            setReports(list);
            setActiveQuizRuns(activeRuns);
            // Tự động chọn mục đầu tiên nếu chưa chọn
            setSelectedKey(prevKey => {
                if (prevKey)
                    return prevKey;
                if (activeRuns.length > 0) {
                    const lastActive = activeRuns[activeRuns.length - 1];
                    return `active_${lastActive?.runId || 'last'}`;
                }
                if (list.length > 0 && list[0]) {
                    const firstReport = list[0];
                    if (firstReport.quizRuns && firstReport.quizRuns.length > 0) {
                        return `${firstReport.id}_${firstReport.quizRuns[firstReport.quizRuns.length - 1]?.runId}`;
                    }
                    return firstReport.id;
                }
                return null;
            });
        }
        catch {
            // ignore
        }
        finally {
            setIsLoading(false);
        }
    }, [activeSessionId]);
    useEffect(() => {
        void loadData();
    }, [loadData]);
    // Cập nhật khi nhận report mới
    useEffect(() => {
        if (currentSessionReport) {
            void loadData();
        }
    }, [currentSessionReport, loadData]);
    // 2. Phẳng hóa toàn bộ các lần thi Quizizz thành danh sách có thể chọn riêng biệt
    const allEntries = useMemo(() => {
        const entries = [];
        // A. Các lần thi Quizizz trong phiên hiện tại đang mở
        if (activeSession && activeQuizRuns.length > 0) {
            activeQuizRuns.forEach((run, idx) => {
                entries.push({
                    key: `active_${run.runId || idx}`,
                    type: 'quiz_run',
                    sessionId: activeSessionId,
                    sessionCode: activeSession.session?.joinCode || '',
                    className: activeSession.className || 'Tiết học hiện tại',
                    runId: run.runId,
                    runIndex: run.runIndex ?? idx + 1,
                    title: run.title || `Quizizz Lần ${idx + 1}`,
                    timeStr: run.endedAt
                        ? formatTimeOnly(run.endedAt)
                        : run.startedAt
                            ? formatTimeOnly(run.startedAt)
                            : 'Vừa xong',
                    timestamp: run.endedAt ?? run.startedAt ?? Date.now(),
                    totalParticipants: run.totalParticipants,
                    averageScore: run.averageScore,
                    averageAccuracy: run.averageAccuracy,
                    totalQuestions: run.totalQuestions,
                    scoreboard: run.scoreboard,
                    isActive: true,
                });
            });
        }
        // B. Các lần thi Quizizz trong các phiên đã đóng trong CSDL
        reports.forEach(r => {
            const qRuns = r.quizRuns || [];
            if (qRuns.length > 0) {
                // Từng lần thi riêng biệt
                qRuns.forEach((run, idx) => {
                    entries.push({
                        key: `${r.id}_${run.runId || idx}`,
                        type: 'quiz_run',
                        sessionId: r.sessionId,
                        sessionCode: r.sessionCode,
                        className: r.className || 'Phiên học',
                        runId: run.runId,
                        runIndex: run.runIndex ?? idx + 1,
                        title: run.title || `Quizizz Lần ${idx + 1}`,
                        timeStr: run.endedAt ? formatDateTime(run.endedAt) : formatDateTime(r.createdAt),
                        timestamp: run.endedAt ?? r.createdAt,
                        totalParticipants: run.totalParticipants,
                        averageScore: run.averageScore,
                        averageAccuracy: run.averageAccuracy,
                        totalQuestions: run.totalQuestions,
                        scoreboard: run.scoreboard,
                        isActive: false,
                    });
                });
                // Nếu có từ 2 lần thi trở lên trong phiên, thêm 1 mục Tổng hợp toàn phiên
                if (qRuns.length >= 2) {
                    entries.push({
                        key: `${r.id}_total`,
                        type: 'session_total',
                        sessionId: r.sessionId,
                        sessionCode: r.sessionCode,
                        className: r.className || 'Phiên học',
                        title: `📊 Tổng kết cả phiên (${qRuns.length} lần thi)`,
                        timeStr: formatDateTime(r.createdAt),
                        timestamp: r.createdAt,
                        totalParticipants: r.totalParticipants,
                        averageScore: r.summary?.averageScore ?? 0,
                        averageAccuracy: r.summary?.averageAccuracy ?? 0,
                        totalQuestions: r.summary?.totalQuestions ?? 0,
                        scoreboard: r.scoreboard,
                        isActive: false,
                        snapshot: r.snapshot,
                    });
                }
            }
            else {
                // Phiên cũ chỉ có 1 snapshot tổng hợp
                entries.push({
                    key: r.id,
                    type: 'quiz_run',
                    sessionId: r.sessionId,
                    sessionCode: r.sessionCode,
                    className: r.className || 'Phiên học',
                    title: r.quizTitle || 'Quizizz Live',
                    timeStr: formatDateTime(r.createdAt),
                    timestamp: r.createdAt,
                    totalParticipants: r.totalParticipants,
                    averageScore: r.summary?.averageScore ?? 0,
                    averageAccuracy: r.summary?.averageAccuracy ?? 0,
                    totalQuestions: r.summary?.totalQuestions ?? 0,
                    scoreboard: r.scoreboard,
                    isActive: false,
                    snapshot: r.snapshot,
                });
            }
        });
        return entries;
    }, [activeSession, activeSessionId, activeQuizRuns, reports]);
    // Lọc theo từ khóa tìm kiếm
    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim())
            return allEntries;
        const q = searchQuery.toLowerCase();
        return allEntries.filter(item => {
            const title = item.title.toLowerCase();
            const code = item.sessionCode.toLowerCase();
            const cls = item.className.toLowerCase();
            return title.includes(q) || code.includes(q) || cls.includes(q);
        });
    }, [allEntries, searchQuery]);
    // Mục báo cáo đang được chọn để hiển thị
    const selectedEntry = useMemo(() => {
        if (!selectedKey)
            return allEntries[0] || null;
        return allEntries.find(e => e.key === selectedKey) || allEntries[0] || null;
    }, [allEntries, selectedKey]);
    // Xử lý xuất Excel cho lần thi đang chọn
    const handleExport = (entry) => {
        if (entry.type === 'quiz_run' && entry.runId) {
            window.open(`/api/sessions/${entry.sessionId}/quiz-runs/${entry.runId}/export-excel`, '_blank');
            return;
        }
        if (onExportExcel) {
            onExportExcel(entry.sessionId);
        }
        else {
            window.open(`/api/sessions/${entry.sessionId}/export-excel`, '_blank');
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    backgroundColor: '#FFFFFF',
                    padding: '20px 24px',
                    borderRadius: UI_RADII.card,
                    boxShadow: UI_SHADOWS.card,
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: '22px', fontWeight: 800, color: UI_COLORS.text }, children: "\uD83D\uDCCA B\u00E1o C\u00E1o & T\u1ED5ng K\u1EBFt Quizizz" }), _jsx("p", { style: { margin: '4px 0 0 0', fontSize: '14px', color: UI_COLORS.textMuted }, children: "L\u01B0u tr\u1EEF chi ti\u1EBFt t\u1EEBng l\u1EA7n thi Quizizz trong phi\u00EAn, b\u1EA3o to\u00E0n b\u1EA3ng x\u1EBFp h\u1EA1ng, \u0111i\u1EC3m s\u1ED1 v\u00E0 t\u1EC9 l\u1EC7 ch\u00EDnh x\u00E1c." })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx(Button, { variant: "secondary", onClick: () => void loadData(), disabled: isLoading, children: isLoading ? 'Đang nạp...' : '🔄 Làm mới' }), selectedEntry && (_jsx(Button, { variant: "primary", onClick: () => handleExport(selectedEntry), children: "\uD83D\uDCE5 Xu\u1EA5t file Excel l\u1EA7n thi n\u00E0y" }))] })] }), _jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: '340px 1fr',
                    gap: '20px',
                    alignItems: 'start',
                }, children: [_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: _jsx(Card, { children: _jsxs("div", { style: { padding: '4px' }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '12px',
                                        }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: '15px', color: UI_COLORS.text }, children: ["\uD83C\uDFAF Danh s\u00E1ch c\u00E1c l\u1EA7n thi (", allEntries.length, ")"] }), activeQuizRuns.length > 1 && (_jsxs("span", { style: {
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#059669',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                }, children: ["Ti\u1EBFt n\u00E0y: ", activeQuizRuns.length, " l\u1EA7n thi"] }))] }), _jsx("input", { type: "text", placeholder: "T\u00ECm theo t\u00EAn b\u00E0i, m\u00E3 ph\u00F2ng...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), style: {
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${UI_COLORS.border}`,
                                            fontSize: '13px',
                                            marginBottom: '12px',
                                            boxSizing: 'border-box',
                                        } }), _jsx("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            maxHeight: '560px',
                                            overflowY: 'auto',
                                        }, children: filteredEntries.length === 0 ? (_jsx("div", { style: {
                                                textAlign: 'center',
                                                padding: '32px 8px',
                                                color: UI_COLORS.textMuted,
                                                fontSize: '13px',
                                            }, children: "Ch\u01B0a c\u00F3 l\u1EA7n thi Quizizz n\u00E0o \u0111\u01B0\u1EE3c l\u01B0u tr\u1EEF." })) : (filteredEntries.map(item => {
                                            const isSelected = selectedKey === item.key;
                                            const isTotal = item.type === 'session_total';
                                            return (_jsxs("div", { onClick: () => {
                                                    setSelectedKey(item.key);
                                                    setViewMode(isTotal ? 'full_report' : 'quiz_table');
                                                }, style: {
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    border: isSelected
                                                        ? `2px solid ${item.isActive ? UI_COLORS.success : UI_COLORS.primary}`
                                                        : `1px solid ${UI_COLORS.border}`,
                                                    backgroundColor: isSelected
                                                        ? item.isActive
                                                            ? '#ECFDF5'
                                                            : '#EFF6FF'
                                                        : item.isActive
                                                            ? '#F0FDF4'
                                                            : isTotal
                                                                ? '#F8FAFC'
                                                                : '#FFFFFF',
                                                    transition: 'all 0.15s ease',
                                                }, children: [_jsxs("div", { style: {
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [item.isActive ? (_jsx("span", { style: {
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            backgroundColor: '#10B981',
                                                                            color: '#FFFFFF',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '6px',
                                                                        }, children: item.runIndex ? `LẦN ${item.runIndex} (TIẾT NÀY)` : 'TIẾT NÀY' })) : item.runIndex ? (_jsxs("span", { style: {
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            backgroundColor: '#E2E8F0',
                                                                            color: '#475569',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '6px',
                                                                        }, children: ["L\u1EA7n ", item.runIndex] })) : null, _jsxs("span", { style: {
                                                                            fontWeight: 700,
                                                                            fontSize: '12px',
                                                                            color: UI_COLORS.primary,
                                                                        }, children: ["M\u00E3: ", item.sessionCode] })] }), _jsx("span", { style: { fontSize: '11px', color: UI_COLORS.textMuted }, children: item.timeStr })] }), _jsx("div", { style: {
                                                            fontWeight: isTotal ? 700 : 600,
                                                            fontSize: '14px',
                                                            color: item.isActive ? '#065F46' : UI_COLORS.text,
                                                            marginTop: '6px',
                                                        }, children: item.title }), _jsxs("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted, marginTop: '3px' }, children: [item.className ? `${item.className} • ` : '', "\uD83D\uDC65 ", item.totalParticipants, " h\u1ECDc sinh \u2022 \uD83C\uDFAF \u0110TB:", ' ', item.averageScore.toLocaleString()] })] }, item.key));
                                        })) })] }) }) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: !selectedEntry ? (_jsx(Card, { children: _jsxs("div", { style: { textAlign: 'center', padding: '60px 20px', color: UI_COLORS.textMuted }, children: [_jsx("p", { style: { fontSize: '18px', fontWeight: 700, color: UI_COLORS.text }, children: "Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u b\u00E0i thi Quizizz" }), _jsx("p", { style: { fontSize: '14px', maxWidth: '440px', margin: '8px auto 20px' }, children: "Khi h\u1ECDc sinh ho\u00E0n th\u00E0nh b\u1EA5t k\u1EF3 l\u1EA7n thi Quizizz n\u00E0o trong ti\u1EBFt h\u1ECDc, k\u1EBFt qu\u1EA3 t\u1EEBng l\u1EA7n s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111\u01B0\u1EE3c l\u01B0u v\u00E0 hi\u1EC3n th\u1ECB ri\u00EAng bi\u1EC7t t\u1EA1i \u0111\u00E2y." }), onNewSession && (_jsx(Button, { variant: "primary", onClick: onNewSession, children: "B\u1EAFt \u0111\u1EA7u phi\u00EAn h\u1ECDc ngay" }))] }) })) : (_jsxs(_Fragment, { children: [_jsxs(Card, { children: [_jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '12px',
                                            }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("h3", { style: {
                                                                        margin: 0,
                                                                        fontSize: '20px',
                                                                        fontWeight: 800,
                                                                        color: UI_COLORS.text,
                                                                    }, children: selectedEntry.title }), selectedEntry.isActive && (_jsx("span", { style: {
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        backgroundColor: '#10B981',
                                                                        color: '#FFFFFF',
                                                                        padding: '3px 8px',
                                                                        borderRadius: '12px',
                                                                    }, children: selectedEntry.runIndex
                                                                        ? `Lần thi ${selectedEntry.runIndex} (Tiết này)`
                                                                        : 'Vừa làm xong' }))] }), _jsxs("div", { style: { fontSize: '13px', color: UI_COLORS.textMuted, marginTop: '4px' }, children: ["M\u00E3 ph\u00F2ng: ", _jsx("strong", { children: selectedEntry.sessionCode }), " \u2022 L\u1EDBp:", ' ', _jsx("strong", { children: selectedEntry.className }), " \u2022 Th\u1EDDi gian:", ' ', selectedEntry.timeStr] })] }), selectedEntry.snapshot && (_jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx(Button, { variant: viewMode === 'quiz_table' ? 'primary' : 'secondary', onClick: () => setViewMode('quiz_table'), children: "\uD83D\uDCCB B\u1EA3ng \u0111i\u1EC3m" }), _jsx(Button, { variant: viewMode === 'full_report' ? 'primary' : 'secondary', onClick: () => setViewMode('full_report'), children: "\uD83C\uDFC6 Vinh danh & C\u00E2u kh\u00F3" })] }))] }), _jsxs("div", { style: {
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                                gap: '12px',
                                                marginTop: '16px',
                                                paddingTop: '16px',
                                                borderTop: `1px solid ${UI_COLORS.border}`,
                                            }, children: [_jsxs("div", { style: {
                                                        backgroundColor: '#F8FAFC',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "S\u1ED1 h\u1ECDc sinh d\u1EF1 thi" }), _jsx("div", { style: {
                                                                fontSize: '20px',
                                                                fontWeight: 800,
                                                                color: UI_COLORS.primary,
                                                                marginTop: '2px',
                                                            }, children: selectedEntry.totalParticipants })] }), _jsxs("div", { style: {
                                                        backgroundColor: '#F8FAFC',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "\u0110i\u1EC3m trung b\u00ECnh" }), _jsx("div", { style: {
                                                                fontSize: '20px',
                                                                fontWeight: 800,
                                                                color: UI_COLORS.text,
                                                                marginTop: '2px',
                                                            }, children: selectedEntry.averageScore.toLocaleString() })] }), _jsxs("div", { style: {
                                                        backgroundColor: '#F8FAFC',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "T\u1EC9 l\u1EC7 \u0111\u00FAng TB" }), _jsxs("div", { style: {
                                                                fontSize: '20px',
                                                                fontWeight: 800,
                                                                color: selectedEntry.averageAccuracy >= 70
                                                                    ? UI_COLORS.success
                                                                    : UI_COLORS.warning,
                                                                marginTop: '2px',
                                                            }, children: [selectedEntry.averageAccuracy, "%"] })] }), _jsxs("div", { style: {
                                                        backgroundColor: '#F8FAFC',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: "T\u1ED5ng s\u1ED1 c\u00E2u" }), _jsx("div", { style: {
                                                                fontSize: '20px',
                                                                fontWeight: 800,
                                                                color: UI_COLORS.text,
                                                                marginTop: '2px',
                                                            }, children: selectedEntry.totalQuestions > 0
                                                                ? selectedEntry.totalQuestions
                                                                : selectedEntry.scoreboard[0]?.totalQuestions || '—' })] })] })] }), viewMode === 'full_report' && selectedEntry.snapshot && (_jsx(SessionReportView, { report: {
                                        id: selectedEntry.key,
                                        sessionId: selectedEntry.sessionId,
                                        snapshot: selectedEntry.snapshot,
                                        createdAt: selectedEntry.timestamp,
                                    }, onExportExcel: () => handleExport(selectedEntry), onNewSession: onNewSession })), viewMode === 'quiz_table' && (_jsxs(Card, { children: [_jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '14px',
                                            }, children: [_jsxs("div", { style: { fontWeight: 800, fontSize: '16px', color: UI_COLORS.text }, children: ["\uD83D\uDCCB B\u1EA3ng \u0110i\u1EC3m Chi Ti\u1EBFt (", selectedEntry.scoreboard.length, " h\u1ECDc sinh)"] }), _jsx("div", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: selectedEntry.runIndex
                                                        ? `Kết quả của Lần thi số ${selectedEntry.runIndex}`
                                                        : 'Kết quả bài thi' })] }), selectedEntry.scoreboard.length === 0 ? (_jsx("div", { style: {
                                                textAlign: 'center',
                                                padding: '36px',
                                                color: UI_COLORS.textMuted,
                                                backgroundColor: '#F8FAFC',
                                                borderRadius: '10px',
                                            }, children: "Kh\u00F4ng c\u00F3 d\u1EEF li\u1EC7u b\u00E0i l\u00E0m c\u1EE7a h\u1ECDc sinh trong l\u1EA7n thi n\u00E0y." })) : (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: {
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    textAlign: 'left',
                                                    fontSize: '14px',
                                                }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                                                backgroundColor: '#F1F5F9',
                                                                borderBottom: `2px solid ${UI_COLORS.border}`,
                                                                color: '#475569',
                                                                fontWeight: 700,
                                                                fontSize: '13px',
                                                            }, children: [_jsx("th", { style: { padding: '12px 14px', width: '90px', textAlign: 'center' }, children: "V\u1ECA TH\u1EE8" }), _jsx("th", { style: { padding: '12px 14px' }, children: "H\u1ECC V\u00C0 T\u00CAN" }), _jsx("th", { style: { padding: '12px 14px', textAlign: 'right', width: '150px' }, children: "\u0110I\u1EC2M S\u1ED0" }), _jsx("th", { style: { padding: '12px 14px', textAlign: 'center', width: '220px' }, children: "T\u1EC8 L\u1EC6 \u0110\u00DANG" })] }) }), _jsx("tbody", { children: selectedEntry.scoreboard.map(item => {
                                                            const isTop1 = item.rank === 1;
                                                            const isTop2 = item.rank === 2;
                                                            const isTop3 = item.rank === 3;
                                                            return (_jsxs("tr", { style: {
                                                                    borderBottom: `1px solid ${UI_COLORS.border}`,
                                                                    backgroundColor: isTop1
                                                                        ? '#FEFCE8'
                                                                        : isTop2
                                                                            ? '#F8FAFC'
                                                                            : isTop3
                                                                                ? '#FFF7ED'
                                                                                : '#FFFFFF',
                                                                    transition: 'background-color 0.15s ease',
                                                                }, children: [_jsx("td", { style: { padding: '14px', textAlign: 'center' }, children: _jsx("div", { style: {
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                width: '36px',
                                                                                height: '36px',
                                                                                borderRadius: '50%',
                                                                                fontWeight: 800,
                                                                                fontSize: '15px',
                                                                                backgroundColor: isTop1
                                                                                    ? '#F59E0B'
                                                                                    : isTop2
                                                                                        ? '#64748B'
                                                                                        : isTop3
                                                                                            ? '#D97706'
                                                                                            : '#E2E8F0',
                                                                                color: isTop1 || isTop2 || isTop3 ? '#FFFFFF' : '#334155',
                                                                                boxShadow: isTop1
                                                                                    ? '0 2px 8px rgba(245, 158, 11, 0.4)'
                                                                                    : 'none',
                                                                            }, children: isTop1
                                                                                ? '👑 1'
                                                                                : isTop2
                                                                                    ? '🥈 2'
                                                                                    : isTop3
                                                                                        ? '🥉 3'
                                                                                        : item.rank }) }), _jsx("td", { style: { padding: '14px' }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsx("span", { style: {
                                                                                        fontWeight: 700,
                                                                                        fontSize: '15px',
                                                                                        color: UI_COLORS.text,
                                                                                    }, children: item.displayName }), _jsxs("span", { style: {
                                                                                        fontSize: '12px',
                                                                                        color: UI_COLORS.textMuted,
                                                                                        marginTop: '2px',
                                                                                    }, children: [item.identityLevel === 'account' && '⭐ Có tài khoản', item.identityLevel === 'roster' && '📋 Danh sách lớp', item.identityLevel === 'guest' && '👤 Khách tự do', item.teamName && ` • Đội: ${item.teamName}`] })] }) }), _jsxs("td", { style: { padding: '14px', textAlign: 'right' }, children: [_jsxs("div", { style: {
                                                                                    fontSize: '17px',
                                                                                    fontWeight: 800,
                                                                                    color: isTop1 ? '#D97706' : UI_COLORS.primary,
                                                                                }, children: [item.score.toLocaleString(), ' ', _jsx("span", { style: { fontSize: '12px', fontWeight: 600 }, children: "\u0111i\u1EC3m" })] }), item.expEarned > 0 && (_jsxs("div", { style: {
                                                                                    fontSize: '12px',
                                                                                    fontWeight: 600,
                                                                                    color: UI_COLORS.success,
                                                                                }, children: ["+", item.expEarned, " EXP"] }))] }), _jsx("td", { style: { padding: '14px', textAlign: 'center' }, children: _jsxs("div", { style: {
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsxs("span", { style: {
                                                                                                fontWeight: 800,
                                                                                                fontSize: '15px',
                                                                                                color: item.accuracy >= 70
                                                                                                    ? UI_COLORS.success
                                                                                                    : item.accuracy >= 50
                                                                                                        ? '#F59E0B'
                                                                                                        : UI_COLORS.error,
                                                                                            }, children: [item.accuracy, "%"] }), _jsxs("span", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: ["(\u0110\u00FAng ", item.correctCount, "/", item.totalQuestions, " c\u00E2u)"] })] }), _jsx("div", { style: {
                                                                                        width: '120px',
                                                                                        height: '6px',
                                                                                        backgroundColor: '#E2E8F0',
                                                                                        borderRadius: '3px',
                                                                                        overflow: 'hidden',
                                                                                    }, children: _jsx("div", { style: {
                                                                                            width: `${Math.min(100, Math.max(0, item.accuracy))}%`,
                                                                                            height: '100%',
                                                                                            backgroundColor: item.accuracy >= 70
                                                                                                ? UI_COLORS.success
                                                                                                : item.accuracy >= 50
                                                                                                    ? '#F59E0B'
                                                                                                    : UI_COLORS.error,
                                                                                            borderRadius: '3px',
                                                                                        } }) })] }) })] }, item.participantId));
                                                        }) })] }) }))] }))] })) })] })] }));
};
//# sourceMappingURL=SessionReportsTab.js.map