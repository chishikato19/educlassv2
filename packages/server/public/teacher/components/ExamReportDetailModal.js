import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { StudentExamReviewModal } from './StudentExamReviewModal.js';
function formatSeconds(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}
function formatDateTime(ts) {
    if (!ts || ts <= 0)
        return '—';
    const d = new Date(ts);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const dd = pad(d.getDate());
    const mo = pad(d.getMonth() + 1);
    return `${hh}:${mm}:${ss} ${dd}/${mo}`;
}
function getGradeClassification(score) {
    if (score >= 8.0) {
        return { label: 'Tốt (Giỏi)', color: '#166534', bg: '#DCFCE7' };
    }
    if (score >= 6.5) {
        return { label: 'Khá', color: '#1E40AF', bg: '#DBEAFE' };
    }
    if (score >= 5.0) {
        return { label: 'Đạt (TB)', color: '#92400E', bg: '#FEF3C7' };
    }
    return { label: 'Chưa đạt', color: '#991B1B', bg: '#FEE2E2' };
}
export const ExamReportDetailModal = ({ examId, isOpen, onClose, onShowToast, }) => {
    const [exam, setExam] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchStudent, setSearchStudent] = useState('');
    const [batchFilter, setBatchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('stt');
    const [sortOrder, setSortOrder] = useState('asc');
    const [activeTab, setActiveTab] = useState('roster');
    const [reviewRecord, setReviewRecord] = useState(null);
    const onShowToastRef = React.useRef(onShowToast);
    onShowToastRef.current = onShowToast;
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;
    const fetchDetail = React.useCallback((silent = false) => {
        if (!examId)
            return;
        if (!silent) {
            setIsLoading(true);
        }
        else {
            setIsRefreshing(true);
        }
        api
            .getExamDetail(examId)
            .then(data => {
            setExam(data);
        })
            .catch(() => {
            if (!silent) {
                onShowToastRef.current('Không thể tải chi tiết bài thi. Vui lòng thử lại.');
                onCloseRef.current();
            }
        })
            .finally(() => {
            if (!silent)
                setIsLoading(false);
            setIsRefreshing(false);
        });
    }, [examId]);
    useEffect(() => {
        if (!isOpen || !examId) {
            setExam(null);
            return;
        }
        // Nạp lần đầu khi mở modal
        fetchDetail(false);
        // Tự động làm mới dữ liệu ngầm mỗi 5 giây, cập nhật tại chỗ không giật màn hình
        const interval = setInterval(() => {
            fetchDetail(true);
        }, 5000);
        return () => {
            clearInterval(interval);
        };
    }, [isOpen, examId, fetchDetail]);
    // Danh sách các ca thi có trong dữ liệu
    const availableBatches = useMemo(() => {
        if (!exam || !exam.records)
            return [1];
        const set = new Set();
        for (const r of exam.records) {
            if (r.status !== 'not_started') {
                set.add(r.batchIndex);
            }
        }
        if (set.size === 0)
            set.add(1);
        return Array.from(set).sort((a, b) => a - b);
    }, [exam]);
    // Điểm tối đa chuẩn của bài thi
    const examMaxScore = useMemo(() => {
        if (exam?.stats?.maxScore)
            return exam.stats.maxScore;
        if (exam?.questions && exam.questions.length > 0) {
            const sum = exam.questions.reduce((acc, q) => acc + (typeof q['points'] === 'number' ? q['points'] : 1), 0);
            if (sum > 0)
                return Math.round(sum * 100) / 100;
        }
        if (exam?.records && exam.records.length > 0 && exam.records[0]?.maxScore) {
            return exam.records[0].maxScore;
        }
        return 10;
    }, [exam]);
    // Ngưỡng điểm phân loại động theo thang điểm của bài thi
    const scoreThresholds = useMemo(() => {
        const pTot = Math.round(0.8 * examMaxScore * 10) / 10;
        const pKha = Math.round(0.65 * examMaxScore * 10) / 10;
        const pDat = Math.round(0.5 * examMaxScore * 10) / 10;
        return {
            totLabel: `Giỏi / Tốt (≥ ${pTot})`,
            khaLabel: `Khá (${pKha} – ${Math.round((pTot - 0.1) * 10) / 10})`,
            datLabel: `Đạt (${pDat} – ${Math.round((pKha - 0.1) * 10) / 10})`,
            chuaDatLabel: `Chưa đạt (< ${pDat})`,
        };
    }, [examMaxScore]);
    // Lọc và sắp xếp danh sách bài thi
    const filteredRecords = useMemo(() => {
        if (!exam || !exam.records)
            return [];
        let list = [...exam.records];
        if (batchFilter !== 'all') {
            const bIndex = parseInt(batchFilter, 10);
            list = list.filter(r => r.batchIndex === bIndex);
        }
        if (statusFilter !== 'all') {
            list = list.filter(r => r.status === statusFilter);
        }
        if (searchStudent.trim()) {
            const q = searchStudent.toLowerCase().trim();
            list = list.filter(r => r.studentName.toLowerCase().includes(q) ||
                (r.studentCode?.toLowerCase().includes(q) ?? false));
        }
        list.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'name') {
                cmp = a.studentName.localeCompare(b.studentName, 'vi');
            }
            else if (sortField === 'score') {
                cmp = a.score - b.score;
            }
            else if (sortField === 'batch') {
                cmp = a.batchIndex - b.batchIndex;
            }
            else if (sortField === 'status') {
                const orderWeight = {
                    submitted: 1,
                    in_progress: 2,
                    not_started: 3,
                };
                cmp = (orderWeight[a.status] ?? 99) - (orderWeight[b.status] ?? 99);
            }
            else if (sortField === 'time') {
                cmp = a.timeSpentSeconds - b.timeSpentSeconds;
            }
            else if (sortField === 'submittedAt') {
                cmp = a.submittedAt - b.submittedAt;
            }
            else {
                // Mặc định sắp xếp theo tên hoặc id
                cmp = a.studentName.localeCompare(b.studentName, 'vi');
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [exam, batchFilter, statusFilter, searchStudent, sortField, sortOrder]);
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        }
        else {
            setSortField(field);
            setSortOrder('asc');
        }
    };
    const handleDownloadExcel = async () => {
        if (!examId)
            return;
        try {
            onShowToast(`📥 Đang tải bảng điểm Excel "${exam?.title ?? ''}"...`);
            await api.downloadExamExcel(examId, exam?.title);
            onShowToast(`✓ Tải bảng điểm "${exam?.title ?? ''}" thành công!`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể tải file báo cáo Excel';
            onShowToast(`Lỗi: ${msg}`);
        }
    };
    if (!isOpen)
        return null;
    const totalSubmitted = exam?.records
        ? exam.records.filter(r => r.status === 'submitted').length
        : 0;
    const inProgressCount = exam?.records
        ? exam.records.filter(r => r.status === 'in_progress').length
        : 0;
    const notStartedCount = exam?.records
        ? exam.records.filter(r => r.status === 'not_started').length
        : 0;
    const totalStudents = exam?.totalStudents ?? (exam?.records ? exam.records.length : 0);
    const percentComplete = totalStudents > 0 ? Math.round((totalSubmitted / totalStudents) * 100) : 0;
    const stats = exam?.stats;
    const gradeDist = stats?.gradeDistribution;
    return (_jsxs(_Fragment, { children: [_jsx(Modal, { isOpen: isOpen, maxWidth: "1020px", title: _jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '24px' }, children: "\uD83D\uDCCA" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '18px', fontWeight: 800, color: UI_COLORS.text }, children: exam ? exam.title : 'Chi tiết kỳ thi' }), exam && (_jsxs("div", { style: {
                                                fontSize: '13px',
                                                color: UI_COLORS.textMuted,
                                                fontWeight: 500,
                                                marginTop: '2px',
                                            }, children: [exam.className ? `Lớp: ${exam.className}` : '', ' ', exam.subject ? `• Môn: ${exam.subject}` : '', " \u2022 Th\u1EDDi gian:", ' ', exam.durationMinutes, " ph\u00FAt \u2022 Ca hi\u1EC7n t\u1EA1i: Ca ", exam.currentBatch] }))] })] }), exam && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => fetchDetail(true), disabled: isLoading || isRefreshing, style: {
                                        minHeight: UI_SPACING.minTouchTarget,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        padding: '8px 12px',
                                        backgroundColor: '#F1F5F9',
                                        borderColor: '#CBD5E1',
                                        color: '#334155',
                                    }, children: isRefreshing ? '⏳ Đang tải...' : '🔄 Làm mới' }), _jsx(Button, { variant: "primary", onClick: handleDownloadExcel, disabled: totalSubmitted === 0, style: {
                                        minHeight: UI_SPACING.minTouchTarget,
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        padding: '8px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }, children: "\uD83D\uDCE5 T\u1EA3i b\u1EA3ng \u0111i\u1EC3m Excel" })] }))] }), onClose: onClose, children: isLoading && !exam ? (_jsxs("div", { style: { textAlign: 'center', padding: '60px 20px', color: UI_COLORS.textMuted }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '12px' }, children: "\u23F3" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 600 }, children: "\u0110ang n\u1EA1p d\u1EEF li\u1EC7u b\u1EA3ng \u0111i\u1EC3m & ph\u1ED5 \u0111i\u1EC3m..." })] })) : !exam ? (_jsx("div", { style: { textAlign: 'center', padding: '40px 20px', color: UI_COLORS.textMuted }, children: "Kh\u00F4ng t\u00ECm th\u1EA5y d\u1EEF li\u1EC7u k\u1EF3 thi." })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }, children: [_jsxs("div", { style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: '12px',
                            }, children: [_jsxs("div", { style: {
                                        backgroundColor: '#F8FAFC',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        borderRadius: UI_RADII.card,
                                        padding: '12px 14px',
                                    }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }, children: "\u0110\u00C3 N\u1ED8P B\u00C0I" }), _jsxs("div", { style: { fontSize: '20px', fontWeight: 800, color: '#16A34A', marginTop: '2px' }, children: [totalSubmitted, "/", totalStudents, ' ', _jsxs("span", { style: { fontSize: '13px', fontWeight: 600 }, children: ["(", percentComplete, "%)"] })] }), _jsx("div", { style: {
                                                width: '100%',
                                                height: '6px',
                                                backgroundColor: '#E2E8F0',
                                                borderRadius: '3px',
                                                marginTop: '8px',
                                                overflow: 'hidden',
                                            }, children: _jsx("div", { style: {
                                                    width: `${Math.min(percentComplete, 100)}%`,
                                                    height: '100%',
                                                    backgroundColor: '#16A34A',
                                                } }) })] }), _jsxs("div", { style: {
                                        backgroundColor: inProgressCount > 0 ? '#EFF6FF' : '#F8FAFC',
                                        border: `1px solid ${inProgressCount > 0 ? '#BFDBFE' : UI_COLORS.border}`,
                                        borderRadius: UI_RADII.card,
                                        padding: '12px 14px',
                                    }, children: [_jsx("div", { style: {
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: inProgressCount > 0 ? '#1E40AF' : UI_COLORS.textMuted,
                                            }, children: "\u0110ANG L\u00C0M B\u00C0I" }), _jsxs("div", { style: {
                                                fontSize: '20px',
                                                fontWeight: 800,
                                                color: inProgressCount > 0 ? '#2563EB' : UI_COLORS.text,
                                                marginTop: '2px',
                                            }, children: [inProgressCount, ' ', _jsx("span", { style: { fontSize: '13px', fontWeight: 600 }, children: "h\u1ECDc sinh" })] }), _jsx("div", { style: {
                                                fontSize: '11px',
                                                color: inProgressCount > 0 ? '#3B82F6' : UI_COLORS.textMuted,
                                                marginTop: '4px',
                                            }, children: inProgressCount > 0 ? '⚡ Đang làm bài trực tiếp' : 'Không có HS đang thi' })] }), _jsxs("div", { style: {
                                        backgroundColor: '#F8FAFC',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        borderRadius: UI_RADII.card,
                                        padding: '12px 14px',
                                    }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }, children: "CH\u01AFA L\u00C0M B\u00C0I" }), _jsxs("div", { style: { fontSize: '20px', fontWeight: 800, color: '#64748B', marginTop: '2px' }, children: [notStartedCount, ' ', _jsx("span", { style: { fontSize: '13px', fontWeight: 600 }, children: "h\u1ECDc sinh" })] }), _jsx("div", { style: { fontSize: '11px', color: UI_COLORS.textMuted, marginTop: '4px' }, children: "Ch\u1EDD ca sau ho\u1EB7c v\u1EAFng" })] }), _jsxs("div", { style: {
                                        backgroundColor: '#F8FAFC',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        borderRadius: UI_RADII.card,
                                        padding: '12px 14px',
                                    }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, color: UI_COLORS.textMuted }, children: "\u0110I\u1EC2M TRUNG B\u00CCNH" }), _jsx("div", { style: { fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }, children: stats && totalSubmitted > 0 ? `${stats.averageScore} / ${examMaxScore}` : '—' }), _jsxs("div", { style: { fontSize: '11px', color: UI_COLORS.textMuted, marginTop: '4px' }, children: ["Thang \u0111i\u1EC3m ", examMaxScore, ".0"] })] }), _jsxs("div", { style: {
                                        backgroundColor: '#F0FDF4',
                                        border: '1px solid #BBF7D0',
                                        borderRadius: UI_RADII.card,
                                        padding: '12px 14px',
                                    }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, color: '#166534' }, children: "\u0110I\u1EC2M CAO NH\u1EA4T" }), _jsx("div", { style: { fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }, children: stats && totalSubmitted > 0 ? `${stats.highestScore}` : '—' }), _jsx("div", { style: { fontSize: '11px', color: '#166534', marginTop: '4px' }, children: "\uD83C\uDF1F T\u1ED1t nh\u1EA5t l\u1EDBp" })] }), _jsxs("div", { style: {
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: UI_RADII.card,
                                        padding: '14px 16px',
                                    }, children: [_jsx("div", { style: { fontSize: '12px', fontWeight: 600, color: '#991B1B' }, children: "\u0110I\u1EC2M TH\u1EA4P NH\u1EA4T" }), _jsx("div", { style: { fontSize: '22px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }, children: stats && totalSubmitted > 0 ? `${stats.lowestScore}` : '—' }), _jsx("div", { style: { fontSize: '12px', color: '#991B1B', marginTop: '4px' }, children: "C\u1EA7n quan t\u00E2m b\u1ED3i d\u01B0\u1EE1ng" })] })] }), gradeDist && totalSubmitted > 0 && (_jsxs("div", { style: {
                                backgroundColor: '#FFFFFF',
                                border: `1px solid ${UI_COLORS.border}`,
                                borderRadius: UI_RADII.card,
                                padding: '16px 20px',
                                boxShadow: UI_SHADOWS.card,
                            }, children: [_jsxs("div", { style: {
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '12px',
                                    }, children: ["\uD83D\uDCC8 Ph\u00E2n b\u1ED1 ph\u1ED5 \u0111i\u1EC3m to\u00E0n l\u1EDBp (", totalSubmitted, " b\u00E0i \u0111\u00E3 n\u1ED9p)"] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        height: '14px',
                                        borderRadius: '7px',
                                        overflow: 'hidden',
                                        marginBottom: '14px',
                                        backgroundColor: '#E2E8F0',
                                    }, children: [gradeDist.tot > 0 && (_jsx("div", { title: `Tốt: ${gradeDist.tot} HS`, style: {
                                                width: `${(gradeDist.tot / totalSubmitted) * 100}%`,
                                                backgroundColor: '#16A34A',
                                            } })), gradeDist.kha > 0 && (_jsx("div", { title: `Khá: ${gradeDist.kha} HS`, style: {
                                                width: `${(gradeDist.kha / totalSubmitted) * 100}%`,
                                                backgroundColor: '#2563EB',
                                            } })), gradeDist.dat > 0 && (_jsx("div", { title: `Đạt: ${gradeDist.dat} HS`, style: {
                                                width: `${(gradeDist.dat / totalSubmitted) * 100}%`,
                                                backgroundColor: '#F59E0B',
                                            } })), gradeDist.chuaDat > 0 && (_jsx("div", { title: `Chưa đạt: ${gradeDist.chuaDat} HS`, style: {
                                                width: `${(gradeDist.chuaDat / totalSubmitted) * 100}%`,
                                                backgroundColor: '#DC2626',
                                            } }))] }), _jsxs("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                        gap: '10px',
                                    }, children: [_jsxs("div", { style: {
                                                backgroundColor: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: {
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#16A34A',
                                                            } }), _jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: '#166534' }, children: scoreThresholds.totLabel })] }), _jsxs("span", { style: { fontSize: '14px', fontWeight: 800, color: '#166534' }, children: [gradeDist.tot, ' ', _jsxs("small", { style: { fontWeight: 500, fontSize: '11px' }, children: ["(", Math.round((gradeDist.tot / totalSubmitted) * 100), "%)"] })] })] }), _jsxs("div", { style: {
                                                backgroundColor: '#EFF6FF',
                                                border: '1px solid #BFDBFE',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: {
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#2563EB',
                                                            } }), _jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: '#1E40AF' }, children: scoreThresholds.khaLabel })] }), _jsxs("span", { style: { fontSize: '14px', fontWeight: 800, color: '#1E40AF' }, children: [gradeDist.kha, ' ', _jsxs("small", { style: { fontWeight: 500, fontSize: '11px' }, children: ["(", Math.round((gradeDist.kha / totalSubmitted) * 100), "%)"] })] })] }), _jsxs("div", { style: {
                                                backgroundColor: '#FFFBEB',
                                                border: '1px solid #FDE68A',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: {
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#F59E0B',
                                                            } }), _jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: '#92400E' }, children: scoreThresholds.datLabel })] }), _jsxs("span", { style: { fontSize: '14px', fontWeight: 800, color: '#92400E' }, children: [gradeDist.dat, ' ', _jsxs("small", { style: { fontWeight: 500, fontSize: '11px' }, children: ["(", Math.round((gradeDist.dat / totalSubmitted) * 100), "%)"] })] })] }), _jsxs("div", { style: {
                                                backgroundColor: '#FEF2F2',
                                                border: '1px solid #FECACA',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: {
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#DC2626',
                                                            } }), _jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: '#991B1B' }, children: scoreThresholds.chuaDatLabel })] }), _jsxs("span", { style: { fontSize: '14px', fontWeight: 800, color: '#991B1B' }, children: [gradeDist.chuaDat, ' ', _jsxs("small", { style: { fontWeight: 500, fontSize: '11px' }, children: ["(", Math.round((gradeDist.chuaDat / totalSubmitted) * 100), "%)"] })] })] })] })] })), _jsxs("div", { style: {
                                display: 'flex',
                                gap: '8px',
                                borderBottom: `1px solid ${UI_COLORS.border}`,
                                paddingBottom: '8px',
                            }, children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('roster'), style: {
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: activeTab === 'roster' ? UI_COLORS.primary : 'transparent',
                                        color: activeTab === 'roster' ? '#FFFFFF' : UI_COLORS.textMuted,
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                    }, children: ["\uD83D\uDCCB B\u1EA3ng \u0111i\u1EC3m h\u1ECDc sinh (", filteredRecords.length, ")"] }), stats?.questionAnalysis && stats.questionAnalysis.length > 0 && (_jsxs("button", { type: "button", onClick: () => setActiveTab('questions'), style: {
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: activeTab === 'questions' ? UI_COLORS.primary : 'transparent',
                                        color: activeTab === 'questions' ? '#FFFFFF' : UI_COLORS.textMuted,
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                    }, children: ["\uD83D\uDD0D Ph\u00E2n t\u00EDch \u0111\u1ED9 \u0111\u00FAng t\u1EEBng c\u00E2u (", stats.questionAnalysis.length, " c\u00E2u)"] }))] }), activeTab === 'roster' && (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }, children: [_jsxs("div", { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: UI_COLORS.textMuted }, children: "Ca thi:" }), _jsxs("select", { value: batchFilter, onChange: e => setBatchFilter(e.target.value), style: {
                                                                padding: '6px 12px',
                                                                borderRadius: UI_RADII.input,
                                                                border: `1px solid ${UI_COLORS.border}`,
                                                                fontSize: '13px',
                                                                color: UI_COLORS.text,
                                                                minHeight: '36px',
                                                            }, children: [_jsx("option", { value: "all", children: "T\u1EA5t c\u1EA3 c\u00E1c ca" }), availableBatches.map(b => (_jsxs("option", { value: b.toString(), children: ["Ca ", b] }, b)))] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: UI_COLORS.textMuted }, children: "Tr\u1EA1ng th\u00E1i:" }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), style: {
                                                                padding: '6px 12px',
                                                                borderRadius: UI_RADII.input,
                                                                border: `1px solid ${UI_COLORS.border}`,
                                                                fontSize: '13px',
                                                                color: UI_COLORS.text,
                                                                minHeight: '36px',
                                                            }, children: [_jsxs("option", { value: "all", children: ["T\u1EA5t c\u1EA3 (", exam.records.length, ")"] }), _jsxs("option", { value: "submitted", children: ["\u2713 \u0110\u00E3 n\u1ED9p b\u00E0i (", totalSubmitted, ")"] }), _jsxs("option", { value: "in_progress", children: ["\u23F3 \u0110ang l\u00E0m b\u00E0i (", inProgressCount, ")"] }), _jsxs("option", { value: "not_started", children: ["\u26AA Ch\u01B0a thi (", notStartedCount, ")"] })] })] })] }), _jsx("div", { style: { minWidth: '220px', flex: '0 1 300px' }, children: _jsx("input", { type: "text", placeholder: "\uD83D\uDD0D T\u00ECm theo t\u00EAn ho\u1EB7c m\u00E3 HS...", value: searchStudent, onChange: e => setSearchStudent(e.target.value), style: {
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '6px 12px',
                                                    borderRadius: UI_RADII.input,
                                                    border: `1px solid ${UI_COLORS.border}`,
                                                    fontSize: '13px',
                                                    minHeight: '36px',
                                                } }) })] }), filteredRecords.length === 0 ? (_jsx("div", { style: {
                                        textAlign: 'center',
                                        padding: '36px 16px',
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: '8px',
                                        color: UI_COLORS.textMuted,
                                    }, children: exam.records.length === 0
                                        ? 'Chưa có học sinh nào nộp bài thi.'
                                        : 'Không tìm thấy học sinh phù hợp với bộ lọc.' })) : (_jsx("div", { style: {
                                        overflowX: 'auto',
                                        border: `1px solid ${UI_COLORS.border}`,
                                        borderRadius: UI_RADII.card,
                                        maxHeight: '440px',
                                        overflowY: 'auto',
                                    }, children: _jsxs("table", { style: {
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: '13px',
                                            textAlign: 'left',
                                        }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                                        backgroundColor: '#F1F5F9',
                                                        borderBottom: `2px solid ${UI_COLORS.border}`,
                                                        color: '#334155',
                                                        position: 'sticky',
                                                        top: 0,
                                                        zIndex: 1,
                                                    }, children: [_jsxs("th", { style: { padding: '10px 12px', width: '48px', cursor: 'pointer' }, onClick: () => handleSort('stt'), children: ["STT ", sortField === 'stt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsxs("th", { style: { padding: '10px 12px', cursor: 'pointer' }, onClick: () => handleSort('name'), children: ["H\u1ECD v\u00E0 t\u00EAn", ' ', sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsxs("th", { style: { padding: '10px 12px', width: '80px', cursor: 'pointer' }, onClick: () => handleSort('batch'), children: ["Ca thi ", sortField === 'batch' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsxs("th", { style: { padding: '10px 12px', width: '130px', cursor: 'pointer' }, onClick: () => handleSort('status'), children: ["Tr\u1EA1ng th\u00E1i", ' ', sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsx("th", { style: { padding: '10px 12px', width: '100px' }, children: "S\u1ED1 c\u00E2u \u0111\u00FAng" }), _jsxs("th", { style: { padding: '10px 12px', width: '90px', cursor: 'pointer' }, onClick: () => handleSort('score'), children: ["\u0110i\u1EC3m s\u1ED1 ", sortField === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsx("th", { style: { padding: '10px 12px', width: '110px' }, children: "X\u1EBFp lo\u1EA1i" }), _jsxs("th", { style: { padding: '10px 12px', width: '110px', cursor: 'pointer' }, onClick: () => handleSort('time'), children: ["L\u00E0m b\u00E0i ", sortField === 'time' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsxs("th", { style: { padding: '10px 12px', width: '140px', cursor: 'pointer' }, onClick: () => handleSort('submittedAt'), children: ["N\u1ED9p l\u00FAc", ' ', sortField === 'submittedAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''] }), _jsx("th", { style: { padding: '10px 12px', width: '110px', textAlign: 'center' }, children: "B\u00E0i l\u00E0m" })] }) }), _jsx("tbody", { children: filteredRecords.map((r, index) => {
                                                    const isSubmitted = r.status === 'submitted';
                                                    const isInProgress = r.status === 'in_progress';
                                                    const isNotStarted = r.status === 'not_started';
                                                    const grade = getGradeClassification(r.score);
                                                    return (_jsxs("tr", { style: {
                                                            borderBottom: `1px solid ${UI_COLORS.border}`,
                                                            backgroundColor: isInProgress
                                                                ? '#F0F9FF'
                                                                : index % 2 === 0
                                                                    ? '#FFFFFF'
                                                                    : '#F8FAFC',
                                                            cursor: isSubmitted || isInProgress ? 'pointer' : 'default',
                                                        }, onClick: () => (isSubmitted || isInProgress) && setReviewRecord(r), children: [_jsx("td", { style: {
                                                                    padding: '10px 12px',
                                                                    fontWeight: 600,
                                                                    color: UI_COLORS.textMuted,
                                                                }, children: index + 1 }), _jsxs("td", { style: { padding: '10px 12px' }, children: [_jsx("div", { style: {
                                                                            fontWeight: 700,
                                                                            color: isSubmitted ? '#1D4ED8' : UI_COLORS.text,
                                                                            textDecoration: isSubmitted ? 'underline' : 'none',
                                                                        }, children: r.studentName }), r.studentCode && (_jsxs("div", { style: { fontSize: '11px', color: UI_COLORS.textMuted }, children: ["M\u00E3: ", r.studentCode] }))] }), _jsx("td", { style: { padding: '10px 12px' }, children: isNotStarted ? (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) : (_jsxs("span", { style: {
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#EFF6FF',
                                                                        color: '#1E40AF',
                                                                        border: '1px solid #BFDBFE',
                                                                    }, children: ["Ca ", r.batchIndex] })) }), _jsx("td", { style: { padding: '10px 12px' }, children: isSubmitted ? (_jsx("span", { style: {
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#DCFCE7',
                                                                        color: '#166534',
                                                                        border: '1px solid #BBF7D0',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                    }, children: "\u2713 \u0110\u00E3 n\u1ED9p b\u00E0i" })) : isInProgress ? (_jsx("span", { style: {
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#FEF3C7',
                                                                        color: '#92400E',
                                                                        border: '1px solid #FDE68A',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                    }, children: "\u23F3 \u0110ang l\u00E0m b\u00E0i" })) : (_jsx("span", { style: {
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#F1F5F9',
                                                                        color: '#64748B',
                                                                        border: '1px solid #E2E8F0',
                                                                    }, children: "\u26AA Ch\u01B0a thi" })) }), _jsx("td", { style: { padding: '10px 12px', color: UI_COLORS.text }, children: isSubmitted ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: r.correctCount }), " / ", r.totalQuestions, ' ', _jsxs("span", { style: { fontSize: '11px', color: UI_COLORS.textMuted }, children: ["(", r.percentage, "%)"] })] })) : isInProgress ? (_jsx("span", { style: { color: '#2563EB', fontSize: '12px', fontWeight: 600 }, children: r.correctCount > 0
                                                                        ? `${r.correctCount}/${r.totalQuestions}`
                                                                        : 'Đang làm...' })) : (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { padding: '10px 12px' }, children: isSubmitted ? (_jsx("span", { style: {
                                                                        fontSize: '15px',
                                                                        fontWeight: 800,
                                                                        color: r.score >= 5 ? '#15803D' : '#DC2626',
                                                                    }, children: r.score })) : isInProgress ? (_jsx("span", { style: { color: '#D97706', fontSize: '12px', fontWeight: 700 }, children: "\u0110ang ch\u1EA5m" })) : (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { padding: '10px 12px' }, children: isSubmitted ? (_jsx("span", { style: {
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: grade.bg,
                                                                        color: grade.color,
                                                                    }, children: grade.label })) : (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { padding: '10px 12px', color: '#475569' }, children: isSubmitted || (isInProgress && r.timeSpentSeconds > 0) ? (_jsxs(_Fragment, { children: ["\u23F1\uFE0F ", formatSeconds(r.timeSpentSeconds)] })) : isInProgress ? (_jsx("span", { style: { fontSize: '12px', color: '#2563EB' }, children: "V\u1EEBa v\u00E0o" })) : (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { padding: '10px 12px', color: '#64748B', fontSize: '12px' }, children: isSubmitted ? (formatDateTime(r.submittedAt)) : isInProgress ? (_jsx("span", { style: { color: '#D97706', fontWeight: 600 }, children: "\u0110ang thi..." })) : (_jsx("span", { style: { color: UI_COLORS.textMuted }, children: "\u2014" })) }), _jsx("td", { style: { padding: '8px 12px', textAlign: 'center' }, children: isSubmitted ? (_jsx("button", { type: "button", onClick: e => {
                                                                        e.stopPropagation();
                                                                        setReviewRecord(r);
                                                                    }, style: {
                                                                        padding: '4px 10px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #BFDBFE',
                                                                        backgroundColor: '#EFF6FF',
                                                                        color: '#1D4ED8',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                    }, title: "Nh\u1EA5n \u0111\u1EC3 xem tr\u1EF1c ti\u1EBFp c\u00E1c c\u00E2u h\u1ECFi v\u00E0 \u0111\u00E1p \u00E1n h\u1ECDc sinh \u0111\u00E3 ch\u1ECDn", children: "\uD83D\uDC41\uFE0F Xem b\u00E0i" })) : isInProgress ? (_jsx("button", { type: "button", onClick: e => {
                                                                        e.stopPropagation();
                                                                        setReviewRecord(r);
                                                                    }, style: {
                                                                        padding: '4px 8px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #FDE68A',
                                                                        backgroundColor: '#FFFBEB',
                                                                        color: '#B45309',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                    }, title: "Xem c\u00E1c c\u00E2u h\u1ECDc sinh \u0111\u00E3 tr\u1EA3 l\u1EDDi", children: "\uD83D\uDC41\uFE0F Xem d\u1EDF" })) : (_jsx("span", { style: { color: UI_COLORS.textMuted, fontSize: '11px' }, children: "\u2014" })) })] }, r.id));
                                                }) })] }) }))] })), activeTab === 'questions' && stats?.questionAnalysis && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsx("div", { style: { fontSize: '13px', color: UI_COLORS.textMuted }, children: "Th\u1ED1ng k\u00EA t\u1EC9 l\u1EC7 tr\u1EA3 l\u1EDDi \u0111\u00FAng theo t\u1EEBng c\u00E2u h\u1ECFi trong \u0111\u1EC1 thi. M\u00E0u \u0111\u1ECF/cam bi\u1EC3u th\u1ECB c\u00E2u h\u1ECFi c\u00F3 t\u1EC9 l\u1EC7 sai cao c\u1EA7n ch\u00FA \u00FD \u00F4n t\u1EADp." }), _jsx("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                        gap: '12px',
                                    }, children: stats.questionAnalysis.map(q => {
                                        let barColor = '#16A34A';
                                        if (q.correctRatio < 50)
                                            barColor = '#DC2626';
                                        else if (q.correctRatio < 70)
                                            barColor = '#F59E0B';
                                        return (_jsxs("div", { style: {
                                                backgroundColor: '#F8FAFC',
                                                border: `1px solid ${UI_COLORS.border}`,
                                                borderRadius: '8px',
                                                padding: '12px',
                                            }, children: [_jsxs("div", { style: {
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '6px',
                                                    }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: '14px', color: UI_COLORS.text }, children: ["C\u00E2u ", q.order] }), _jsxs("span", { style: { fontWeight: 800, fontSize: '14px', color: barColor }, children: [q.correctRatio, "%"] })] }), _jsx("div", { style: {
                                                        width: '100%',
                                                        height: '6px',
                                                        backgroundColor: '#E2E8F0',
                                                        borderRadius: '3px',
                                                        overflow: 'hidden',
                                                        marginBottom: '8px',
                                                    }, children: _jsx("div", { style: {
                                                            width: `${q.correctRatio}%`,
                                                            height: '100%',
                                                            backgroundColor: barColor,
                                                        } }) }), _jsxs("div", { style: { fontSize: '11px', color: UI_COLORS.textMuted }, children: ["\u0110\u00FAng: ", _jsx("strong", { children: q.correctCount }), " / ", q.totalAnswered, " l\u01B0\u1EE3t"] })] }, q.questionId));
                                    }) })] }))] })) }), _jsx(StudentExamReviewModal, { isOpen: Boolean(reviewRecord), onClose: () => setReviewRecord(null), record: reviewRecord, questions: exam?.questions || [], className: exam?.className, examTitle: exam?.title })] }));
};
//# sourceMappingURL=ExamReportDetailModal.js.map