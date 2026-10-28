import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Modal, UI_COLORS, UI_RADII, UI_SHADOWS, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { ExamReportDetailModal } from './ExamReportDetailModal.js';
import { CreateExamModal } from './CreateExamModal.js';
import { EditExamModal } from './EditExamModal.js';
import { CloneExamModal } from './CloneExamModal.js';
import { MoveExamModal } from './MoveExamModal.js';
import { CreateFolderModal } from './CreateFolderModal.js';
import { getAllExamFolders, getBreadcrumbs, getImmediateSubFolders, countExamsInFolder, normalizeFolderPath, } from '../utils/exam-folders.js';
function getSessionId(sessionData) {
    if (!sessionData)
        return '';
    if (sessionData.session?.id)
        return sessionData.session.id;
    const raw = sessionData;
    return raw.id ?? '';
}
function getSessionJoinCode(sessionData) {
    if (!sessionData)
        return '';
    if (sessionData.session?.joinCode)
        return sessionData.session.joinCode;
    const raw = sessionData;
    return raw.joinCode ?? '';
}
export const ExamReportsTab = ({ classes, activeSession, onShowToast, onViewDetails, onCreateExam, onSessionCreatedAndStartExam, onSwitchToSessionTab, }) => {
    const [exams, setExams] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedFolder, setSelectedFolder] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    // Dialog xác nhận hành động
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null,
        exam: null,
        isSubmitting: false,
    });
    // Modal xem báo cáo & bảng điểm chi tiết
    const [detailModalExamId, setDetailModalExamId] = useState(null);
    // Modal tạo kỳ thi mới
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // Modal chỉnh sửa & sao chép kỳ thi
    const [editingExam, setEditingExam] = useState(null);
    const [cloningExam, setCloningExam] = useState(null);
    // Quản lý & Di chuyển Thư mục đa cấp
    const [currentFolderPath, setCurrentFolderPath] = useState('');
    const [movingExam, setMovingExam] = useState(null);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [folderModalParentPath, setFolderModalParentPath] = useState('');
    // Danh sách toàn bộ các thư mục (gộp từ exams và localStorage)
    const allFolders = useMemo(() => {
        return getAllExamFolders(exams);
    }, [exams]);
    const breadcrumbs = useMemo(() => {
        return getBreadcrumbs(currentFolderPath);
    }, [currentFolderPath]);
    const subFolders = useMemo(() => {
        return getImmediateSubFolders(currentFolderPath, allFolders);
    }, [currentFolderPath, allFolders]);
    const activeSessionId = useMemo(() => getSessionId(activeSession), [activeSession]);
    const activeSessionCode = useMemo(() => getSessionJoinCode(activeSession), [activeSession]);
    // Nạp danh sách kỳ thi
    const loadExams = useCallback(async (silent = false) => {
        if (!silent)
            setIsLoading(true);
        try {
            const list = await api.getExams({
                classId: selectedClassId !== 'all' ? selectedClassId : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            setExams(list);
        }
        catch {
            if (!silent)
                onShowToast('Không thể tải danh sách kỳ thi. Vui lòng thử lại.');
        }
        finally {
            if (!silent)
                setIsLoading(false);
        }
    }, [selectedClassId, statusFilter, onShowToast]);
    useEffect(() => {
        void loadExams();
    }, [loadExams]);
    // Tự động làm mới danh sách kỳ thi định kỳ để cập nhật tiến độ nộp bài trực tiếp (Vấn đề 4)
    useEffect(() => {
        const hasActiveExam = exams.some(e => e.status === 'in_progress');
        const intervalTime = hasActiveExam ? 4000 : 10000;
        const interval = setInterval(() => {
            void loadExams(true);
        }, intervalTime);
        return () => clearInterval(interval);
    }, [exams, loadExams]);
    const handleCloseDetailModal = useCallback(() => {
        setDetailModalExamId(null);
    }, []);
    // Lọc tìm kiếm theo tên đề thi, môn, thư mục và vị trí cây thư mục hiện tại
    const filteredExams = useMemo(() => {
        return exams.filter(e => {
            const eNormFolder = normalizeFolderPath(e.folder);
            // 1. Nếu người dùng chọn lọc theo dropdown Thư mục cụ thể:
            if (selectedFolder !== 'all') {
                if (selectedFolder === '__none__') {
                    if (eNormFolder)
                        return false;
                }
                else if (eNormFolder !== normalizeFolderPath(selectedFolder)) {
                    return false;
                }
            }
            else if (!searchQuery.trim()) {
                // 2. Khi đang duyệt theo Breadcrumb (và không có từ khóa tìm kiếm):
                if (!currentFolderPath) {
                    // Thư mục gốc: chỉ hiển thị các đề thi ở thư mục gốc (chưa phân loại)
                    if (eNormFolder)
                        return false;
                }
                else {
                    // Thư mục con: chỉ hiển thị các đề thi thuộc thư mục này
                    if (eNormFolder !== currentFolderPath)
                        return false;
                }
            }
            if (!searchQuery.trim())
                return true;
            const q = searchQuery.toLowerCase();
            const matchTitle = e.title.toLowerCase().includes(q);
            const matchSubject = e.subject?.toLowerCase().includes(q) ?? false;
            const matchClass = e.className?.toLowerCase().includes(q) ?? false;
            const matchFolder = e.folder?.toLowerCase().includes(q) ?? false;
            return matchTitle || matchSubject || matchClass || matchFolder;
        });
    }, [exams, searchQuery, selectedFolder, currentFolderPath]);
    // Xử lý mở ca thi trong phiên hiện tại hoặc tự động tạo phiên mới
    const handleOpenStartBatchDialog = (exam) => {
        setConfirmModal({
            isOpen: true,
            type: 'start_batch',
            exam,
            isSubmitting: false,
        });
    };
    // Xử lý tạm dừng ca thi
    const handleOpenPauseBatchDialog = (exam) => {
        setConfirmModal({
            isOpen: true,
            type: 'pause_batch',
            exam,
            isSubmitting: false,
        });
    };
    // Xử lý hoàn tất kỳ thi
    const handleOpenFinishDialog = (exam) => {
        setConfirmModal({
            isOpen: true,
            type: 'finish',
            exam,
            isSubmitting: false,
        });
    };
    // Xử lý xóa kỳ thi
    const handleOpenDeleteDialog = (exam) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete',
            exam,
            isSubmitting: false,
        });
    };
    // Thực thi hành động sau khi xác nhận trong Modal
    const handleConfirmAction = async () => {
        const { type, exam } = confirmModal;
        if (!type || !exam)
            return;
        setConfirmModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            if (type === 'start_batch') {
                const nextBatch = exam.status === 'waiting_next_batch' ? exam.currentBatch + 1 : exam.currentBatch;
                if (!activeSessionId) {
                    // Chưa có phiên mở: Tự động mở phiên mới theo đúng lớp của kỳ thi (1-click)
                    const newSession = await api.createSession({
                        classId: exam.classId,
                        identityMode: 'roster_only',
                        allowTeams: false,
                    });
                    const sId = getSessionId(newSession);
                    const sCode = getSessionJoinCode(newSession);
                    await api.startExamBatch(exam.id, {
                        sessionId: sId,
                        batchIndex: nextBatch,
                    });
                    onShowToast(`🎉 Đã mở phòng học ${sCode} (Lớp ${exam.className}) và kích hoạt Ca ${nextBatch} của "${exam.title}"!`);
                    if (onSessionCreatedAndStartExam) {
                        await onSessionCreatedAndStartExam(newSession);
                    }
                }
                else {
                    // Đã có phiên mở: Khởi chạy vào phiên hiện tại
                    await api.startExamBatch(exam.id, {
                        sessionId: activeSessionId,
                        batchIndex: nextBatch,
                    });
                    onShowToast(`🎉 Đã kích hoạt Ca ${nextBatch} của "${exam.title}" trong phòng ${activeSessionCode}!`);
                    onSwitchToSessionTab?.();
                }
            }
            else if (type === 'pause_batch') {
                await api.pauseExamBatch(exam.id);
                onShowToast(`⏸ Đã tạm dừng Ca ${exam.currentBatch}. Kết quả của học sinh đã thi được lưu an toàn.`);
            }
            else if (type === 'finish') {
                await api.finishExam(exam.id);
                onShowToast(`🏁 Đã hoàn tất kỳ thi "${exam.title}". Sổ điểm đã được khóa an toàn.`);
            }
            else if (type === 'delete') {
                await api.deleteExam(exam.id);
                onShowToast(`🗑 Đã xóa kỳ thi "${exam.title}".`);
            }
            setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false });
            void loadExams();
        }
        catch (err) {
            const msg = err instanceof Error
                ? err.message
                : 'Đã xảy ra lỗi khi thực hiện hành động. Vui lòng thử lại.';
            onShowToast(`Lỗi: ${msg}`);
            setConfirmModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };
    // Tải file Excel
    const handleDownloadExcel = async (examId, examTitle) => {
        try {
            onShowToast(`📥 Đang xuất file Excel bảng điểm "${examTitle}"...`);
            await api.downloadExamExcel(examId, examTitle);
            onShowToast(`✓ Tải bảng điểm "${examTitle}" thành công!`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể tải file báo cáo Excel';
            onShowToast(`Lỗi: ${msg}`);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [_jsxs(Card, { children: [_jsxs("div", { style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '16px',
                        }, children: [_jsxs("div", { children: [_jsxs("h2", { style: {
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: UI_COLORS.text,
                                            margin: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }, children: [_jsx("span", { children: "\uD83D\uDCDD" }), " Qu\u1EA3n L\u00FD & B\u00E1o C\u00E1o K\u1EF3 Thi Theo Ca"] }), _jsx("p", { style: { margin: '4px 0 0 0', fontSize: '14px', color: UI_COLORS.textMuted }, children: "L\u01B0u tr\u1EEF b\u00E1o c\u00E1o k\u1EF3 thi l\u00E2u d\u00E0i. H\u1ED7 tr\u1EE3 chia ca thi (Ti\u1EBFt 1 / Ti\u1EBFt 2) chung m\u1ED9t b\u1EA3ng \u0111i\u1EC3m t\u1ED5ng h\u1EE3p." })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "secondary", onClick: () => void loadExams(false), disabled: isLoading, style: { minHeight: UI_SPACING.minTouchTarget }, children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" }), _jsx(Button, { variant: "primary", onClick: () => {
                                            setIsCreateModalOpen(true);
                                            onCreateExam?.();
                                        }, style: { minHeight: UI_SPACING.minTouchTarget, fontWeight: 600 }, children: "\u2795 T\u1EA1o k\u1EF3 thi m\u1EDBi" })] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            alignItems: 'center',
                            paddingTop: '16px',
                            borderTop: `1px solid ${UI_COLORS.border}`,
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }, children: "L\u1EDBp h\u1ECDc:" }), _jsxs("select", { value: selectedClassId, onChange: e => setSelectedClassId(e.target.value), style: {
                                            padding: '8px 12px',
                                            borderRadius: UI_RADII.input,
                                            border: `1px solid ${UI_COLORS.border}`,
                                            backgroundColor: '#FFFFFF',
                                            fontSize: '14px',
                                            color: UI_COLORS.text,
                                            minHeight: '40px',
                                            cursor: 'pointer',
                                        }, children: [_jsxs("option", { value: "all", children: ["T\u1EA5t c\u1EA3 c\u00E1c l\u1EDBp (", classes.length, ")"] }), classes.map(c => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }, children: "Tr\u1EA1ng th\u00E1i:" }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), style: {
                                            padding: '8px 12px',
                                            borderRadius: UI_RADII.input,
                                            border: `1px solid ${UI_COLORS.border}`,
                                            backgroundColor: '#FFFFFF',
                                            fontSize: '14px',
                                            color: UI_COLORS.text,
                                            minHeight: '40px',
                                            cursor: 'pointer',
                                        }, children: [_jsx("option", { value: "all", children: "T\u1EA5t c\u1EA3 tr\u1EA1ng th\u00E1i" }), _jsx("option", { value: "in_progress", children: "\uD83D\uDFE2 \u0110ang m\u1EDF ca" }), _jsx("option", { value: "waiting_next_batch", children: "\u23F8 Ch\u1EDD ca ti\u1EBFp theo" }), _jsx("option", { value: "ready", children: "\u25CB Ch\u01B0a k\u00EDch ho\u1EA1t" }), _jsx("option", { value: "finished", children: "\u2713 \u0110\u00E3 ho\u00E0n th\u00E0nh" })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 600, color: UI_COLORS.text }, children: "Th\u01B0 m\u1EE5c:" }), _jsxs("select", { value: selectedFolder, onChange: e => setSelectedFolder(e.target.value), style: {
                                            padding: '8px 12px',
                                            borderRadius: UI_RADII.input,
                                            border: `1px solid ${UI_COLORS.border}`,
                                            backgroundColor: '#FFFFFF',
                                            fontSize: '14px',
                                            color: UI_COLORS.text,
                                            minHeight: '40px',
                                            cursor: 'pointer',
                                        }, children: [_jsxs("option", { value: "all", children: ["\uD83D\uDCC1 T\u1EA5t c\u1EA3 th\u01B0 m\u1EE5c (", allFolders.length, ")"] }), allFolders.map(f => {
                                                const count = countExamsInFolder(f, exams, true);
                                                const depth = f.split('/').length - 1;
                                                const leaf = f.split('/').pop() || f;
                                                return (_jsxs("option", { value: f, children: ['\u00A0'.repeat(depth * 3), "\uD83D\uDCC2 ", leaf, " (", count, " \u0111\u1EC1)"] }, f));
                                            }), _jsxs("option", { value: "__none__", children: ["\uD83D\uDCC4 Ch\u01B0a ph\u00E2n lo\u1EA1i (", exams.filter(ex => !ex.folder).length, ")"] })] })] }), _jsx("div", { style: { flex: '1 1 200px' }, children: _jsx("input", { type: "text", placeholder: "\uD83D\uDD0D T\u00ECm theo t\u00EAn b\u00E0i thi, m\u00F4n h\u1ECDc...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '8px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '40px',
                                    } }) })] })] }), activeSession ? (_jsx("div", { style: {
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: UI_RADII.card,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\uD83D\uDCA1" }), _jsxs("span", { style: { fontSize: '14px', color: '#1E40AF' }, children: ["Phi\u00EAn h\u1ECDc \u0111ang m\u1EDF:", ' ', _jsxs("strong", { style: { color: UI_COLORS.primary }, children: ["Ph\u00F2ng ", activeSessionCode] }), ". Th\u1EA7y/C\u00F4 c\u00F3 th\u1EC3 b\u1EA5m ", _jsx("strong", { children: "\"\u25B6 M\u1EDF ca thi trong phi\u00EAn n\u00E0y\"" }), " tr\u00EAn b\u1EA5t k\u1EF3 k\u1EF3 thi n\u00E0o \u0111\u1EC3 h\u1ECDc sinh v\u00E0o l\u00E0m b\u00E0i."] })] }) })) : (_jsxs("div", { style: {
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: UI_RADII.card,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\u2139\uFE0F" }), _jsxs("span", { style: { fontSize: '14px', color: '#92400E' }, children: ["Hi\u1EC7n ch\u01B0a c\u00F3 phi\u00EAn h\u1ECDc n\u00E0o m\u1EDF. \u0110\u1EC3 t\u1ED5 ch\u1EE9c ca thi cho h\u1ECDc sinh, Th\u1EA7y/C\u00F4 vui l\u00F2ng chuy\u1EC3n sang tab ", _jsx("strong", { children: "\"Phi\u00EAn h\u1ECDc & Ho\u1EA1t \u0111\u1ED9ng\"" }), " \u0111\u1EC3 m\u1EDF phi\u00EAn h\u1ECDc tr\u01B0\u1EDBc."] })] })), _jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${UI_COLORS.border}`,
                    borderRadius: UI_RADII.card,
                    padding: '12px 16px',
                    boxShadow: UI_SHADOWS.card,
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                        }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }, children: breadcrumbs.map((crumb, idx) => {
                                    const isLast = idx === breadcrumbs.length - 1;
                                    return (_jsxs(React.Fragment, { children: [idx > 0 && (_jsx("span", { style: { color: '#94A3B8', fontWeight: 700, margin: '0 2px' }, children: "\u203A" })), _jsxs("button", { type: "button", onClick: () => {
                                                    setCurrentFolderPath(crumb.path);
                                                    setSelectedFolder('all');
                                                }, style: {
                                                    background: isLast ? '#EEF4FF' : 'none',
                                                    border: isLast ? '1px solid #BFDBFE' : 'none',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    color: isLast ? UI_COLORS.primary : '#475569',
                                                    fontWeight: isLast ? 800 : 500,
                                                    fontSize: '13.5px',
                                                    cursor: isLast ? 'default' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }, children: [idx === 0 ? '' : '📁 ', crumb.name] })] }, crumb.path));
                                }) }), _jsx(Button, { variant: "ghost", onClick: () => {
                                    setFolderModalParentPath(currentFolderPath);
                                    setIsCreateFolderModalOpen(true);
                                }, style: {
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    backgroundColor: '#F8FAFC',
                                    borderColor: '#CBD5E1',
                                    color: '#334155',
                                    padding: '6px 12px',
                                    minHeight: '34px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }, children: "\uD83D\uDCC1+ Th\u01B0 m\u1EE5c m\u1EDBi" })] }), subFolders.length > 0 && (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '10px',
                            paddingTop: '6px',
                            borderTop: '1px solid #F1F5F9',
                        }, children: subFolders.map(sub => {
                            const count = countExamsInFolder(sub.fullPath, exams, true);
                            return (_jsxs("div", { onClick: () => {
                                    setCurrentFolderPath(sub.fullPath);
                                    setSelectedFolder('all');
                                }, style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }, onMouseEnter: e => {
                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                    e.currentTarget.style.borderColor = '#BFDBFE';
                                }, onMouseLeave: e => {
                                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\uD83D\uDCC2" }), _jsx("div", { style: {
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    color: UI_COLORS.text,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }, title: sub.name, children: sub.name })] }), _jsxs("span", { style: {
                                            fontSize: '11px',
                                            color: UI_COLORS.textMuted,
                                            fontWeight: 600,
                                            backgroundColor: '#FFFFFF',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #E2E8F0',
                                            flexShrink: 0,
                                        }, children: [count, " \u0111\u1EC1"] })] }, sub.fullPath));
                        }) }))] }), isLoading ? (_jsx(Card, { children: _jsxs("div", { style: { textAlign: 'center', padding: '48px 16px', color: UI_COLORS.textMuted }, children: [_jsx("div", { style: { fontSize: '32px', marginBottom: '8px' }, children: "\u23F3" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 600 }, children: "\u0110ang t\u1EA3i danh s\u00E1ch k\u1EF3 thi..." })] }) })) : filteredExams.length === 0 ? (_jsx(Card, { children: _jsxs("div", { style: { textAlign: 'center', padding: '48px 16px', color: UI_COLORS.textMuted }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '12px' }, children: "\uD83D\uDCCB" }), _jsx("h3", { style: {
                                fontSize: '18px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                margin: '0 0 8px 0',
                            }, children: exams.length === 0 ? 'Chưa có kỳ thi nào' : 'Không tìm thấy kỳ thi phù hợp' }), _jsx("p", { style: { fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }, children: exams.length === 0
                                ? 'Thầy/Cô hãy bấm nút "Tạo kỳ thi mới" để thiết lập bài kiểm tra 1 tiết hoặc thi học kỳ chia theo nhiều ca máy.'
                                : 'Thầy/Cô vui lòng kiểm tra lại bộ lọc lớp hoặc từ khóa tìm kiếm.' }), exams.length === 0 && (_jsx(Button, { variant: "primary", onClick: () => {
                                setIsCreateModalOpen(true);
                                onCreateExam?.();
                            }, style: { minHeight: UI_SPACING.minTouchTarget, fontWeight: 600 }, children: "\u2795 T\u1EA1o k\u1EF3 thi \u0111\u1EA7u ti\u00EAn ngay" }))] }) })) : (_jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: '18px',
                }, children: filteredExams.map(exam => {
                    const total = exam.totalStudents || 0;
                    const submitted = exam.submittedCount || 0;
                    const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;
                    // Xác định màu sắc badge và thanh tiến độ
                    let statusBadge = {
                        text: '○ Chưa kích hoạt (Ca 1)',
                        bg: '#F3E8FF',
                        color: '#6B21A8',
                        border: '#D8B4FE',
                    };
                    if (exam.status === 'in_progress') {
                        statusBadge = {
                            text: `● Đang mở Ca ${exam.currentBatch}${exam.activeSessionJoinCode ? ` (Phòng ${exam.activeSessionJoinCode})` : ''}`,
                            bg: '#DCFCE7',
                            color: '#166534',
                            border: '#86EFAC',
                        };
                    }
                    else if (exam.status === 'waiting_next_batch') {
                        statusBadge = {
                            text: `⏸ Chờ ca tiếp theo (Đã thi Ca ${exam.currentBatch})`,
                            bg: '#FEF3C7',
                            color: '#92400E',
                            border: '#FDE68A',
                        };
                    }
                    else if (exam.status === 'finished') {
                        statusBadge = {
                            text: '✓ Đã hoàn thành kỳ thi',
                            bg: '#DBEAFE',
                            color: '#1E40AF',
                            border: '#93C5FD',
                        };
                    }
                    let progressColor = UI_COLORS.primary;
                    if (percent === 100) {
                        progressColor = '#16A34A';
                    }
                    else if (percent < 50) {
                        progressColor = '#F59E0B';
                    }
                    const canStartBatch = exam.status === 'ready' || exam.status === 'waiting_next_batch';
                    return (_jsxs("div", { style: {
                            backgroundColor: '#FFFFFF',
                            borderRadius: UI_RADII.card,
                            border: `1px solid ${exam.status === 'in_progress' ? '#86EFAC' : UI_COLORS.border}`,
                            boxShadow: exam.status === 'in_progress'
                                ? '0 4px 14px rgba(34, 197, 94, 0.15)'
                                : UI_SHADOWS.card,
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            position: 'relative',
                        }, children: [_jsxs("div", { children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                        }, children: [_jsx("h3", { style: {
                                                    margin: 0,
                                                    fontSize: '17px',
                                                    fontWeight: 700,
                                                    color: UI_COLORS.text,
                                                    lineHeight: 1.3,
                                                    flex: 1,
                                                }, children: exam.title }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("button", { type: "button", title: "Ch\u1EC9nh s\u1EEDa thi\u1EBFt l\u1EADp k\u1EF3 thi", onClick: () => setEditingExam(exam), style: {
                                                            background: '#F1F5F9',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            color: '#334155',
                                                            fontSize: '12.5px',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: 600,
                                                        }, children: "\u270F\uFE0F S\u1EEDa" }), _jsx("button", { type: "button", title: "Sao ch\u00E9p k\u1EF3 thi sang l\u1EDBp kh\u00E1c", onClick: () => setCloningExam(exam), style: {
                                                            background: '#F1F5F9',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            color: '#334155',
                                                            fontSize: '12.5px',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: 600,
                                                        }, children: "\uD83D\uDCCB Copy" }), _jsx("button", { type: "button", title: "Di chuy\u1EC3n k\u1EF3 thi v\u00E0o th\u01B0 m\u1EE5c kh\u00E1c", onClick: () => setMovingExam(exam), style: {
                                                            background: '#F1F5F9',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            color: '#334155',
                                                            fontSize: '12.5px',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: 600,
                                                        }, children: "\uD83D\uDCC1 Chuy\u1EC3n" }), _jsx("button", { type: "button", title: "X\u00F3a k\u1EF3 thi", onClick: () => handleOpenDeleteDialog(exam), style: {
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px 6px',
                                                            color: '#94A3B8',
                                                            fontSize: '14px',
                                                            borderRadius: '4px',
                                                        }, children: "\uD83D\uDDD1\uFE0F" })] })] }), _jsxs("div", { style: {
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginTop: '8px',
                                        }, children: [_jsx("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: statusBadge.bg,
                                                    color: statusBadge.color,
                                                    border: `1px solid ${statusBadge.border}`,
                                                }, children: statusBadge.text }), exam.folder && (_jsxs("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F3E8FF',
                                                    color: '#7E22CE',
                                                    border: '1px solid #E9D5FF',
                                                }, children: ["\uD83D\uDCC1 ", exam.folder] })), exam.className && (_jsxs("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F1F5F9',
                                                    color: '#475569',
                                                }, children: ["\uD83C\uDFEB ", exam.className] })), exam.subject && (_jsxs("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F1F5F9',
                                                    color: '#475569',
                                                }, children: ["\uD83D\uDCD6 ", exam.subject] })), _jsxs("span", { style: { fontSize: '12px', color: UI_COLORS.textMuted }, children: ["\u23F1\uFE0F ", exam.durationMinutes, " ph\u00FAt"] })] })] }), _jsxs("div", { style: { backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px' }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '13px',
                                            marginBottom: '6px',
                                        }, children: [_jsx("span", { style: { fontWeight: 600, color: UI_COLORS.text }, children: "Ti\u1EBFn \u0111\u1ED9 ho\u00E0n th\u00E0nh:" }), _jsxs("span", { style: { fontWeight: 700, color: progressColor }, children: [submitted, "/", total, " HS (", percent, "%)"] })] }), _jsx("div", { style: {
                                            width: '100%',
                                            height: '8px',
                                            backgroundColor: '#E2E8F0',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                        }, children: _jsx("div", { style: {
                                                width: `${Math.min(percent, 100)}%`,
                                                height: '100%',
                                                backgroundColor: progressColor,
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease',
                                            } }) }), _jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '12px',
                                            color: UI_COLORS.textMuted,
                                            marginTop: '8px',
                                        }, children: [_jsxs("span", { children: ["\u0110i\u1EC3m trung b\u00ECnh:", ' ', _jsx("strong", { style: {
                                                            color: exam.averageScore != null ? UI_COLORS.text : UI_COLORS.textMuted,
                                                        }, children: exam.averageScore != null
                                                            ? `${exam.averageScore} / ${exam.maxScore ?? 10}`
                                                            : 'Chưa có' })] }), _jsxs("span", { children: ["Ca hi\u1EC7n t\u1EA1i: ", _jsxs("strong", { children: ["Ca ", exam.currentBatch] })] })] }), exam.status === 'in_progress' && (_jsxs("div", { style: {
                                            marginTop: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '12px',
                                            color: '#1E40AF',
                                            fontWeight: 600,
                                        }, children: [_jsx("span", { children: "\u26A1 \u0110ang l\u00E0m b\u00E0i thi:" }), _jsxs("strong", { style: { color: '#2563EB' }, children: [exam.inProgressCount ?? 0, " h\u1ECDc sinh"] })] }))] }), _jsxs("div", { style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    marginTop: 'auto',
                                }, children: [exam.status === 'in_progress' ? (_jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsxs(Button, { variant: "ghost", onClick: () => handleOpenPauseBatchDialog(exam), style: {
                                                    flex: 1,
                                                    minHeight: UI_SPACING.minTouchTarget,
                                                    borderColor: '#FDE68A',
                                                    color: '#B45309',
                                                    fontWeight: 700,
                                                    backgroundColor: '#FFFBEB',
                                                }, children: ["\u23F8 T\u1EA1m d\u1EEBng ca ", exam.currentBatch] }), _jsx(Button, { variant: "ghost", onClick: () => handleOpenFinishDialog(exam), style: {
                                                    minHeight: UI_SPACING.minTouchTarget,
                                                    color: '#DC2626',
                                                    borderColor: '#FECACA',
                                                    backgroundColor: '#FEF2F2',
                                                    fontWeight: 700,
                                                }, children: "\uD83C\uDFC1 K\u1EBFt th\u00FAc k\u1EF3 thi" })] })) : exam.status !== 'finished' ? (_jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx(Button, { variant: "primary", onClick: () => handleOpenStartBatchDialog(exam), disabled: !canStartBatch, style: {
                                                    flex: 1,
                                                    minHeight: UI_SPACING.minTouchTarget,
                                                    fontWeight: 700,
                                                    backgroundColor: '#2563EB',
                                                    color: '#FFFFFF',
                                                }, children: exam.status === 'waiting_next_batch'
                                                    ? !activeSessionId
                                                        ? `🚀 Tiếp tục Ca ${exam.currentBatch + 1} (Tự động mở phiên)`
                                                        : `▶ Mở Ca ${exam.currentBatch + 1} trong phiên này`
                                                    : !activeSessionId
                                                        ? '🚀 Bắt đầu Ca 1 (Tự động mở phiên)'
                                                        : '▶ Mở Ca 1 trong phiên này' }), _jsx(Button, { variant: "ghost", onClick: () => handleOpenFinishDialog(exam), style: {
                                                    minHeight: UI_SPACING.minTouchTarget,
                                                    fontSize: '13px',
                                                    color: '#DC2626',
                                                    borderColor: '#FECACA',
                                                    backgroundColor: '#FEF2F2',
                                                    fontWeight: 600,
                                                }, children: "\uD83C\uDFC1 Ho\u00E0n t\u1EA5t" })] })) : null, _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                                    setDetailModalExamId(exam.id);
                                                    onViewDetails?.(exam.id);
                                                }, style: {
                                                    flex: 1,
                                                    minHeight: '40px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    backgroundColor: '#EFF6FF',
                                                    borderColor: '#BFDBFE',
                                                    color: '#1D4ED8',
                                                }, children: "\uD83D\uDCCA Xem b\u1EA3ng \u0111i\u1EC3m & Ph\u00E2n t\u00EDch" }), _jsx(Button, { variant: "ghost", onClick: () => handleDownloadExcel(exam.id, exam.title), disabled: submitted === 0, title: submitted === 0
                                                    ? 'Chưa có bài thi nào nộp để xuất bảng điểm'
                                                    : 'Tải file Excel', style: {
                                                    minHeight: '40px',
                                                    fontSize: '13px',
                                                    padding: '8px 12px',
                                                    fontWeight: 600,
                                                    backgroundColor: submitted === 0 ? '#F1F5F9' : '#ECFDF5',
                                                    borderColor: submitted === 0 ? '#CBD5E1' : '#A7F3D0',
                                                    color: submitted === 0 ? '#94A3B8' : '#047857',
                                                }, children: "\uD83D\uDCE5 Excel" })] })] })] }, exam.id));
                }) })), confirmModal.isOpen && confirmModal.exam && (_jsx(Modal, { isOpen: confirmModal.isOpen, title: confirmModal.type === 'start_batch'
                    ? `Xác nhận mở Ca ${confirmModal.exam.status === 'waiting_next_batch' ? confirmModal.exam.currentBatch + 1 : 1}`
                    : confirmModal.type === 'pause_batch'
                        ? `Tạm dừng Ca ${confirmModal.exam.currentBatch}`
                        : confirmModal.type === 'finish'
                            ? 'Hoàn tất toàn bộ kỳ thi'
                            : 'Xóa kỳ thi', onClose: () => !confirmModal.isSubmitting &&
                    setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false }), children: _jsxs("div", { style: { padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [confirmModal.type === 'start_batch' && (_jsx(_Fragment, { children: !activeSessionId ? (_jsxs(_Fragment, { children: [_jsxs("p", { style: { margin: 0, fontSize: '15px', color: UI_COLORS.text }, children: ["Th\u1EA7y/C\u00F4 c\u00F3 mu\u1ED1n", ' ', _jsxs("strong", { children: ["t\u1EF1 \u0111\u1ED9ng m\u1EDF phi\u00EAn h\u1ECDc m\u1EDBi cho l\u1EDBp \"", confirmModal.exam.className || 'Lớp học', "\""] }), ' ', "v\u00E0 b\u1EAFt \u0111\u1EA7u", ' ', _jsx("strong", { children: confirmModal.exam.status === 'waiting_next_batch'
                                                    ? `Ca ${confirmModal.exam.currentBatch + 1}`
                                                    : 'Ca 1' }), ' ', "c\u1EE7a k\u1EF3 thi ", _jsxs("strong", { children: ["\"", confirmModal.exam.title, "\""] }), " ngay b\u00E2y gi\u1EDD kh\u00F4ng?"] }), _jsxs("div", { style: {
                                            backgroundColor: '#EFF6FF',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #BFDBFE',
                                            fontSize: '13px',
                                            color: '#1E40AF',
                                            lineHeight: 1.5,
                                        }, children: ["\uD83D\uDE80 ", _jsx("strong", { children: "T\u1EF1 \u0111\u1ED9ng 1-ch\u1EA1m (1-click):" }), " H\u1EC7 th\u1ED1ng s\u1EBD t\u1EF1 \u0111\u1ED9ng t\u1EA1o m\u1ED9t phi\u00EAn h\u1ECDc m\u1EDBi theo \u0111\u00FAng danh s\u00E1ch l\u1EDBp, c\u1EA5p m\u00E3 PIN ph\u00F2ng h\u1ECDc v\u00E0 k\u00EDch ho\u1EA1t ca thi ngay l\u1EADp t\u1EE9c. Th\u1EA7y/C\u00F4 kh\u00F4ng c\u1EA7n ph\u1EA3i ra ngo\u00E0i t\u1EA1o phi\u00EAn h\u1ECDc th\u1EE7 c\u00F4ng tr\u01B0\u1EDBc!"] }), _jsxs("div", { style: {
                                            backgroundColor: '#F8FAFC',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '12px',
                                            color: '#475569',
                                            lineHeight: 1.4,
                                        }, children: ["\uD83D\uDEE1\uFE0F ", _jsx("strong", { children: "Kh\u00F3a th\u00ED sinh ca tr\u01B0\u1EDBc:" }), " Nh\u1EEFng h\u1ECDc sinh \u0111\u00E3 ho\u00E0n th\u00E0nh b\u00E0i thi \u1EDF c\u00E1c ca tr\u01B0\u1EDBc s\u1EBD t\u1EF1 \u0111\u1ED9ng b\u1ECB kh\u00F3a danh t\u00EDnh, ch\u1EC9 nh\u1EEFng h\u1ECDc sinh ch\u01B0a thi m\u1EDBi \u0111\u01B0\u1EE3c v\u00E0o l\u00E0m b\u00E0i."] })] })) : (_jsxs(_Fragment, { children: [_jsxs("p", { style: { margin: 0, fontSize: '15px', color: UI_COLORS.text }, children: ["Th\u1EA7y/C\u00F4 c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n m\u1EDF", ' ', _jsx("strong", { children: confirmModal.exam.status === 'waiting_next_batch'
                                                    ? `Ca ${confirmModal.exam.currentBatch + 1}`
                                                    : 'Ca 1' }), ' ', "c\u1EE7a b\u00E0i thi ", _jsxs("strong", { children: ["\"", confirmModal.exam.title, "\""] }), " v\u00E0o ph\u00F2ng h\u1ECDc", ' ', _jsx("strong", { style: { color: UI_COLORS.primary }, children: activeSessionCode }), ' ', "kh\u00F4ng?"] }), _jsxs("div", { style: {
                                            backgroundColor: '#EFF6FF',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #BFDBFE',
                                            fontSize: '13px',
                                            color: '#1E40AF',
                                            lineHeight: 1.5,
                                        }, children: ["\uD83D\uDEE1\uFE0F ", _jsx("strong", { children: "C\u01A1 ch\u1EBF kh\u00F3a an to\u00E0n:" }), " Nh\u1EEFng h\u1ECDc sinh \u0111\u00E3 ho\u00E0n th\u00E0nh b\u00E0i thi \u1EDF c\u00E1c ca tr\u01B0\u1EDBc s\u1EBD t\u1EF1 \u0111\u1ED9ng b\u1ECB kh\u00F3a tr\u00EAn c\u1ED5ng ch\u1ECDn t\u00EAn. Ch\u1EC9 nh\u1EEFng h\u1ECDc sinh ch\u01B0a l\u00E0m b\u00E0i m\u1EDBi c\u00F3 th\u1EC3 ch\u1ECDn t\u00EAn v\u00E0 tham gia l\u00E0m b\u00E0i thi tr\u1ECDn v\u1EB9n", ' ', confirmModal.exam.durationMinutes, " ph\u00FAt."] })] })) })), confirmModal.type === 'pause_batch' && (_jsxs(_Fragment, { children: [_jsxs("p", { style: { margin: 0, fontSize: '15px', color: UI_COLORS.text }, children: ["Th\u1EA7y/C\u00F4 c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n t\u1EA1m d\u1EEBng", ' ', _jsxs("strong", { children: ["Ca ", confirmModal.exam.currentBatch] }), " c\u1EE7a b\u00E0i thi", ' ', _jsxs("strong", { children: ["\"", confirmModal.exam.title, "\""] }), " kh\u00F4ng?"] }), _jsxs("div", { style: {
                                        backgroundColor: '#FFFBEB',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #FDE68A',
                                        fontSize: '13px',
                                        color: '#92400E',
                                        lineHeight: 1.5,
                                    }, children: ["\uD83D\uDCBE To\u00E0n b\u1ED9 k\u1EBFt qu\u1EA3 b\u00E0i n\u1ED9p c\u1EE7a h\u1ECDc sinh Ca ", confirmModal.exam.currentBatch, " \u0111\u00E3 \u0111\u01B0\u1EE3c ghi nh\u1EADn an to\u00E0n v\u00E0o h\u1EC7 th\u1ED1ng. Th\u1EA7y/C\u00F4 c\u00F3 th\u1EC3 y\u00EAn t\u00E2m k\u1EBFt th\u00FAc ti\u1EBFt h\u1ECDc n\u00E0y, sang ti\u1EBFt sau m\u1EDF phi\u00EAn m\u1EDBi v\u00E0 b\u1EA5m", ' ', _jsxs("strong", { children: ["\"\u25B6 M\u1EDF Ca ", confirmModal.exam.currentBatch + 1, "\""] }), " \u0111\u1EC3 ti\u1EBFp t\u1EE5c cho h\u1ECDc sinh ca sau."] })] })), confirmModal.type === 'finish' && (_jsxs(_Fragment, { children: [_jsxs("p", { style: { margin: 0, fontSize: '15px', color: UI_COLORS.text }, children: ["Th\u1EA7y/C\u00F4 c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n", ' ', _jsxs("strong", { children: ["ch\u1ED1t ho\u00E0n t\u1EA5t k\u1EF3 thi \"", confirmModal.exam.title, "\""] }), " kh\u00F4ng?"] }), _jsx("div", { style: {
                                        backgroundColor: '#FEF2F2',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #FECACA',
                                        fontSize: '13px',
                                        color: '#991B1B',
                                        lineHeight: 1.5,
                                    }, children: "\u26A0\uFE0F Sau khi ch\u1ED1t ho\u00E0n t\u1EA5t, k\u1EF3 thi s\u1EBD chuy\u1EC3n sang tr\u1EA1ng th\u00E1i k\u1EBFt th\u00FAc v\u00E0 kh\u00F4ng th\u1EC3 m\u1EDF th\u00EAm ca m\u1EDBi. Th\u1EA7y/C\u00F4 v\u1EABn c\u00F3 th\u1EC3 xem l\u1EA1i b\u00E1o c\u00E1o chi ti\u1EBFt v\u00E0 t\u1EA3i file Excel b\u1EA5t k\u1EF3 l\u00FAc n\u00E0o." })] })), confirmModal.type === 'delete' && (_jsxs(_Fragment, { children: [_jsxs("p", { style: { margin: 0, fontSize: '15px', color: UI_COLORS.text }, children: ["Th\u1EA7y/C\u00F4 c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n ", _jsx("strong", { children: "x\u00F3a v\u0129nh vi\u1EC5n" }), " k\u1EF3 thi", ' ', _jsxs("strong", { children: ["\"", confirmModal.exam.title, "\""] }), " c\u00F9ng to\u00E0n b\u1ED9 b\u00E0i n\u1ED9p li\u00EAn quan kh\u00F4ng?"] }), _jsx("div", { style: {
                                        backgroundColor: '#FEF2F2',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #FECACA',
                                        fontSize: '13px',
                                        color: '#991B1B',
                                    }, children: "\u26A0\uFE0F H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c!" })] })), _jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                marginTop: '16px',
                            }, children: [_jsx(Button, { variant: "ghost", disabled: confirmModal.isSubmitting, onClick: () => setConfirmModal({ isOpen: false, type: null, exam: null, isSubmitting: false }), style: {
                                        minHeight: '44px',
                                        backgroundColor: '#F1F5F9',
                                        borderColor: '#CBD5E1',
                                        color: '#334155',
                                        fontWeight: 600,
                                    }, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { variant: confirmModal.type === 'delete' || confirmModal.type === 'finish'
                                        ? 'danger'
                                        : 'primary', disabled: confirmModal.isSubmitting, onClick: handleConfirmAction, style: {
                                        backgroundColor: confirmModal.type === 'delete' || confirmModal.type === 'finish'
                                            ? '#DC2626'
                                            : '#2563EB',
                                        borderColor: confirmModal.type === 'delete' || confirmModal.type === 'finish'
                                            ? '#DC2626'
                                            : '#2563EB',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        minHeight: '44px',
                                        padding: '10px 24px',
                                        boxShadow: confirmModal.type === 'delete' || confirmModal.type === 'finish'
                                            ? '0 4px 12px rgba(220, 38, 38, 0.25)'
                                            : '0 4px 12px rgba(37, 99, 235, 0.25)',
                                    }, children: confirmModal.isSubmitting
                                        ? 'Đang xử lý...'
                                        : confirmModal.type === 'delete'
                                            ? '🗑️ Xác nhận xóa'
                                            : confirmModal.type === 'finish'
                                                ? '🏁 Xác nhận hoàn tất'
                                                : confirmModal.type === 'pause_batch'
                                                    ? '⏸️ Xác nhận tạm dừng'
                                                    : !activeSessionId
                                                        ? '🚀 Mở phiên mới & Bắt đầu Ca thi'
                                                        : '▶️ Xác nhận mở Ca thi' })] })] }) })), _jsx(ExamReportDetailModal, { examId: detailModalExamId, isOpen: Boolean(detailModalExamId), onClose: handleCloseDetailModal, onShowToast: onShowToast }), _jsx(CreateExamModal, { isOpen: isCreateModalOpen, classes: classes, initialClassId: selectedClassId !== 'all' ? selectedClassId : undefined, activeSession: activeSession, existingFolders: allFolders, onClose: () => setIsCreateModalOpen(false), onShowToast: onShowToast, onSuccess: () => {
                    void loadExams();
                } }), _jsx(EditExamModal, { isOpen: Boolean(editingExam), exam: editingExam, existingFolders: allFolders, onClose: () => setEditingExam(null), onShowToast: onShowToast, onSuccess: () => {
                    void loadExams();
                } }), _jsx(CloneExamModal, { isOpen: Boolean(cloningExam), exam: cloningExam, classes: classes, onClose: () => setCloningExam(null), onShowToast: onShowToast, onSuccess: () => {
                    void loadExams();
                } }), _jsx(MoveExamModal, { isOpen: Boolean(movingExam), exam: movingExam, allFolders: allFolders, onClose: () => setMovingExam(null), onShowToast: onShowToast, onSuccess: () => {
                    void loadExams();
                } }), _jsx(CreateFolderModal, { isOpen: isCreateFolderModalOpen, initialParentPath: folderModalParentPath, allFolders: allFolders, onClose: () => setIsCreateFolderModalOpen(false), onShowToast: onShowToast, onSuccess: newPath => {
                    setCurrentFolderPath(newPath);
                    setSelectedFolder('all');
                    void loadExams();
                } })] }));
};
//# sourceMappingURL=ExamReportsTab.js.map