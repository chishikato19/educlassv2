import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
export const CloneExamModal = ({ isOpen, onClose, exam, classes, onShowToast, onSuccess, }) => {
    const [targetClassId, setTargetClassId] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // Khi modal mở, khởi tạo lớp nhận khác với lớp hiện tại (nếu có)
    useEffect(() => {
        if (isOpen && exam) {
            // Ưu tiên chọn lớp khác lớp gốc
            const otherClass = classes.find(c => c.id !== exam.classId) || classes[0];
            const initialClassId = otherClass ? otherClass.id : exam.classId;
            setTargetClassId(initialClassId);
            const targetClassName = classes.find(c => c.id === initialClassId)?.name;
            setNewTitle(targetClassName ? `${exam.title} - ${targetClassName}` : `${exam.title} (Bản sao)`);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, exam, classes]);
    // Cập nhật tiêu đề gợi ý khi đổi lớp nhận
    const handleClassChange = (selectedId) => {
        setTargetClassId(selectedId);
        if (exam) {
            const cls = classes.find(c => c.id === selectedId);
            setNewTitle(cls ? `${exam.title} - ${cls.name}` : `${exam.title} (Bản sao)`);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!exam)
            return;
        if (!targetClassId) {
            setError('Vui lòng chọn lớp học nhận kỳ thi');
            return;
        }
        if (!newTitle.trim()) {
            setError('Vui lòng nhập tiêu đề kỳ thi mới');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.cloneExam(exam.id, {
                targetClassId,
                newTitle: newTitle.trim(),
            });
            const clsName = classes.find(c => c.id === targetClassId)?.name || 'lớp mới';
            onShowToast(`📋 Đã sao chép kỳ thi sang ${clsName} thành công!`);
            onSuccess();
            onClose();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể sao chép kỳ thi';
            setError(msg);
            onShowToast(`Lỗi: ${msg}`);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen || !exam)
        return null;
    return (_jsx(Modal, { isOpen: isOpen, maxWidth: "540px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '22px' }, children: "\uD83D\uDCCB" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }, children: "Sao Ch\u00E9p K\u1EF3 Thi Sang L\u1EDBp Kh\u00E1c" }), _jsx("div", { style: { fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }, children: "Nh\u00E2n b\u1EA3n to\u00E0n b\u1ED9 c\u00E2u h\u1ECFi, m\u1EE9c \u0111i\u1EC3m t\u1EEBng c\u00E2u v\u00E0 thi\u1EBFt l\u1EADp sang m\u1ED9t l\u1EDBp h\u1ECDc m\u1EDBi" })] })] }), onClose: () => !isSubmitting && onClose(), children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }, children: [_jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: UI_RADII.card,
                        padding: '12px 14px',
                        fontSize: '13px',
                        lineHeight: 1.5,
                    }, children: [_jsx("div", { style: { color: UI_COLORS.textMuted, fontSize: '12px', fontWeight: 600 }, children: "K\u1EF2 THI G\u1ED0C:" }), _jsx("div", { style: { fontWeight: 700, color: UI_COLORS.text, fontSize: '14px', marginTop: '2px' }, children: exam.title }), _jsxs("div", { style: {
                                display: 'flex',
                                gap: '12px',
                                marginTop: '6px',
                                color: '#475569',
                                fontSize: '12.5px',
                            }, children: [_jsxs("span", { children: ["\uD83C\uDFEB L\u1EDBp: ", _jsx("strong", { children: exam.className || 'Chưa rõ' })] }), _jsxs("span", { children: ["\u23F1\uFE0F ", _jsxs("strong", { children: [exam.durationMinutes, " ph\u00FAt"] })] }), exam.subject && (_jsxs("span", { children: ["\uD83D\uDCD6 M\u00F4n: ", _jsx("strong", { children: exam.subject })] }))] })] }), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["L\u1EDBp h\u1ECDc nh\u1EADn k\u1EF3 thi sao ch\u00E9p ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("select", { value: targetClassId, onChange: e => handleClassChange(e.target.value), disabled: isSubmitting, style: {
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: UI_RADII.input,
                                border: `1px solid ${error && !targetClassId ? '#DC2626' : UI_COLORS.border}`,
                                fontSize: '14px',
                                backgroundColor: '#FFFFFF',
                                color: UI_COLORS.text,
                                minHeight: '44px',
                                cursor: 'pointer',
                            }, children: classes.length === 0 ? (_jsx("option", { value: "", children: "Ch\u01B0a c\u00F3 l\u1EDBp h\u1ECDc n\u00E0o trong h\u1EC7 th\u1ED1ng" })) : (classes.map(c => (_jsxs("option", { value: c.id, children: ["\uD83C\uDFEB ", c.name, " ", c.id === exam.classId ? '(Lớp hiện tại)' : ''] }, c.id)))) })] }), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["Ti\u00EAu \u0111\u1EC1 k\u1EF3 thi m\u1EDBi ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("input", { type: "text", value: newTitle, onChange: e => {
                                setNewTitle(e.target.value);
                                if (error)
                                    setError('');
                            }, disabled: isSubmitting, placeholder: "VD: Ki\u1EC3m tra 1 ti\u1EBFt Tin h\u1ECDc - L\u1EDBp 10A2", style: {
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: UI_RADII.input,
                                border: `1px solid ${error && !newTitle.trim() ? '#DC2626' : UI_COLORS.border}`,
                                fontSize: '14px',
                                minHeight: '44px',
                            } }), error && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: error }))] }), _jsxs("div", { style: {
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12.5px',
                        color: '#1E40AF',
                        lineHeight: 1.4,
                    }, children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "L\u1EE3i \u00EDch:" }), " B\u00E0i thi m\u1EDBi \u0111\u01B0\u1EE3c t\u1EA1o \u1EDF tr\u1EA1ng th\u00E1i ", _jsx("em", { children: "Ch\u01B0a k\u00EDch ho\u1EA1t" }), ", gi\u1EEF nguy\u00EAn to\u00E0n b\u1ED9 ng\u00E2n h\u00E0ng c\u00E2u h\u1ECFi, thang \u0111i\u1EC3m t\u1EEBng c\u00E2u v\u00E0 c\u00E1c t\u00F9y ch\u1ECDn x\u00E1o tr\u1ED9n/xem \u0111i\u1EC3m \u0111\u1EC3 th\u1EA7y c\u00F4 t\u1ED5 ch\u1EE9c thi cho l\u1EDBp kh\u00E1c m\u00E0 kh\u00F4ng c\u1EA7n nh\u1EADp l\u1EA1i t\u1EEB \u0111\u1EA7u."] }), _jsxs("div", { style: {
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
                            }, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isSubmitting || classes.length === 0, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                fontWeight: 700,
                                padding: '10px 20px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                            }, children: isSubmitting ? 'Đang sao chép...' : '📋 Xác nhận sao chép' })] })] }) }));
};
//# sourceMappingURL=CloneExamModal.js.map