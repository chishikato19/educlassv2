import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
export const EditExamModal = ({ isOpen, onClose, exam, existingFolders, onShowToast, onSuccess, }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [folder, setFolder] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(45);
    // Config states
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [shuffleOptions, setShuffleOptions] = useState(false);
    const [allowViewScore, setAllowViewScore] = useState(true);
    const [allowViewReview, setAllowViewReview] = useState(true);
    const [password, setPassword] = useState('');
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // Nạp dữ liệu cấu hình khi modal mở
    useEffect(() => {
        if (!isOpen || !exam)
            return;
        setTitle(exam.title);
        setSubject(exam.subject || '');
        setFolder(exam.folder || '');
        setDurationMinutes(exam.durationMinutes);
        setError('');
        let isMounted = true;
        setIsLoadingDetail(true);
        api
            .getExamDetail(exam.id)
            .then(detail => {
            if (!isMounted)
                return;
            const cfg = detail.config || {};
            if (cfg.folder !== undefined && cfg.folder !== null) {
                setFolder(String(cfg.folder));
            }
            setShuffleQuestions(Boolean(cfg.shuffleQuestions));
            setShuffleOptions(Boolean(cfg.shuffleOptions));
            setAllowViewScore(cfg.allowViewScore !== false);
            setAllowViewReview(cfg.allowViewReview !== false);
            setPassword(cfg.password ? String(cfg.password) : '');
        })
            .catch(() => {
            // Nếu không load được detail, giữ nguyên giá trị tóm tắt
        })
            .finally(() => {
            if (isMounted)
                setIsLoadingDetail(false);
        });
        return () => {
            isMounted = false;
        };
    }, [isOpen, exam]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!exam)
            return;
        if (!title.trim()) {
            setError('Tiêu đề kỳ thi không được để trống');
            return;
        }
        if (!durationMinutes || durationMinutes <= 0) {
            setError('Thời lượng làm bài tối thiểu là 1 phút');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.updateExam(exam.id, {
                title: title.trim(),
                subject: subject.trim() ? subject.trim() : null,
                durationMinutes,
                config: {
                    shuffleQuestions,
                    shuffleOptions,
                    allowViewScore,
                    allowViewReview,
                    password: password.trim() ? password.trim() : null,
                    folder: folder.trim() ? folder.trim() : null,
                },
            });
            onShowToast(`✏️ Đã cập nhật thiết lập kỳ thi "${title.trim()}" thành công!`);
            onSuccess();
            onClose();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể cập nhật kỳ thi';
            setError(msg);
            onShowToast(`Lỗi: ${msg}`);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen || !exam)
        return null;
    return (_jsx(Modal, { isOpen: isOpen, maxWidth: "620px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '22px' }, children: "\u270F\uFE0F" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }, children: "Ch\u1EC9nh S\u1EEDa Thi\u1EBFt L\u1EADp K\u1EF3 Thi" }), _jsx("div", { style: { fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }, children: "C\u1EADp nh\u1EADt ti\u00EAu \u0111\u1EC1, m\u00F4n, th\u1EDDi gian l\u00E0m b\u00E0i, th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF v\u00E0 t\u00F9y ch\u1ECDn thi" })] })] }), onClose: () => !isSubmitting && onClose(), children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }, children: [isLoadingDetail && (_jsx("div", { style: {
                        padding: '8px 12px',
                        backgroundColor: '#EFF6FF',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        color: '#1E40AF',
                    }, children: "\u23F3 \u0110ang n\u1EA1p thi\u1EBFt l\u1EADp chi ti\u1EBFt c\u1EE7a k\u1EF3 thi..." })), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["Ti\u00EAu \u0111\u1EC1 k\u1EF3 thi ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("input", { type: "text", value: title, onChange: e => {
                                setTitle(e.target.value);
                                if (error)
                                    setError('');
                            }, placeholder: "VD: Ki\u1EC3m tra 1 ti\u1EBFt Tin h\u1ECDc", disabled: isSubmitting, style: {
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: UI_RADII.input,
                                border: `1px solid ${error && !title.trim() ? '#DC2626' : UI_COLORS.border}`,
                                fontSize: '14px',
                                minHeight: '44px',
                            } }), error && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: error }))] }), _jsxs("div", { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: '1 1 180px' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: "M\u00F4n h\u1ECDc" }), _jsx("input", { type: "text", value: subject, onChange: e => setSubject(e.target.value), placeholder: "VD: Tin h\u1ECDc, To\u00E1n...", disabled: isSubmitting, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '44px',
                                    } })] }), _jsxs("div", { style: { flex: '1 1 200px' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: UI_COLORS.text,
                                        marginBottom: '6px',
                                    }, children: "\uD83D\uDCC1 Th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF" }), _jsx("input", { type: "text", list: "edit-exam-folder-datalist", value: folder, onChange: e => setFolder(e.target.value), placeholder: "VD: Gi\u1EEFa HK1, 15 Ph\u00FAt...", disabled: isSubmitting, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        minHeight: '44px',
                                    } }), _jsx("datalist", { id: "edit-exam-folder-datalist", children: existingFolders.map(f => (_jsx("option", { value: f }, f))) })] })] }), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["Th\u1EDDi l\u01B0\u1EE3ng l\u00E0m b\u00E0i (ph\u00FAt) ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }, children: [_jsx("input", { type: "number", min: 1, max: 180, value: durationMinutes, onChange: e => {
                                        const val = parseInt(e.target.value, 10);
                                        setDurationMinutes(isNaN(val) ? 0 : val);
                                    }, disabled: isSubmitting, style: {
                                        width: '100px',
                                        padding: '10px 12px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        minHeight: '40px',
                                    } }), [15, 30, 45, 60, 90].map(mins => (_jsxs("button", { type: "button", onClick: () => setDurationMinutes(mins), disabled: isSubmitting, style: {
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: `1px solid ${durationMinutes === mins ? UI_COLORS.primary : UI_COLORS.border}`,
                                        backgroundColor: durationMinutes === mins ? '#EEF4FF' : '#F8FAFC',
                                        color: durationMinutes === mins ? UI_COLORS.primary : '#475569',
                                        fontWeight: durationMinutes === mins ? 700 : 500,
                                        fontSize: '12.5px',
                                        cursor: 'pointer',
                                    }, children: [mins, " ph\u00FAt"] }, mins)))] })] }), _jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: UI_RADII.card,
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }, children: [_jsx("div", { style: {
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '2px',
                            }, children: "\u2699\uFE0F T\u00F9y ch\u1ECDn thi & Tr\u1EA3 k\u1EBFt qu\u1EA3" }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13.5px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: shuffleQuestions, onChange: e => setShuffleQuestions(e.target.checked), disabled: isSubmitting, style: { accentColor: UI_COLORS.primary } }), _jsx("span", { children: "X\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 c\u00E2u h\u1ECFi" })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13.5px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: shuffleOptions, onChange: e => setShuffleOptions(e.target.checked), disabled: isSubmitting, style: { accentColor: UI_COLORS.primary } }), _jsx("span", { children: "X\u00E1o tr\u1ED9n th\u1EE9 t\u1EF1 c\u00E1c l\u1EF1a ch\u1ECDn \u0111\u00E1p \u00E1n (A, B, C, D)" })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13.5px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: allowViewScore, onChange: e => setAllowViewScore(e.target.checked), disabled: isSubmitting, style: { accentColor: UI_COLORS.primary } }), _jsx("span", { children: "Cho h\u1ECDc sinh xem \u0111i\u1EC3m s\u1ED1 sau khi n\u1ED9p b\u00E0i" })] }), _jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13.5px',
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: allowViewReview, onChange: e => setAllowViewReview(e.target.checked), disabled: isSubmitting, style: { accentColor: UI_COLORS.primary } }), _jsx("span", { children: "Cho xem l\u1EA1i \u0111\u1EC1 v\u00E0 \u0111\u00E1p \u00E1n chi ti\u1EBFt sau khi n\u1ED9p" })] }), _jsxs("div", { style: { marginTop: '2px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }, children: [_jsx("label", { style: {
                                        display: 'block',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        color: UI_COLORS.text,
                                        marginBottom: '4px',
                                    }, children: "\uD83D\uDD12 M\u1EADt kh\u1EA9u v\u00E0o thi (\u0110\u1EC3 tr\u1ED1ng n\u1EBFu kh\u00F4ng y\u00EAu c\u1EA7u):" }), _jsx("input", { type: "text", value: password, onChange: e => setPassword(e.target.value), placeholder: "VD: 123456", disabled: isSubmitting, style: {
                                        width: '100%',
                                        maxWidth: '220px',
                                        boxSizing: 'border-box',
                                        padding: '6px 10px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${UI_COLORS.border}`,
                                        fontSize: '13px',
                                    } })] })] }), _jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '8px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${UI_COLORS.border}`,
                    }, children: [_jsx(Button, { type: "button", variant: "ghost", disabled: isSubmitting, onClick: onClose, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                backgroundColor: '#F1F5F9',
                                borderColor: '#CBD5E1',
                                color: '#334155',
                                fontWeight: 600,
                            }, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isSubmitting, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                fontWeight: 700,
                                padding: '10px 20px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                            }, children: isSubmitting ? 'Đang lưu...' : '💾 Lưu thay đổi' })] })] }) }));
};
//# sourceMappingURL=EditExamModal.js.map