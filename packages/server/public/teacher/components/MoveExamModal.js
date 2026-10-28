import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { api } from '../api/client.js';
import { normalizeFolderPath, saveCustomFolder } from '../utils/exam-folders.js';
export const MoveExamModal = ({ isOpen, onClose, exam, allFolders, onShowToast, onSuccess, }) => {
    const [selectedFolder, setSelectedFolder] = useState('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (isOpen && exam) {
            setSelectedFolder(normalizeFolderPath(exam.folder));
            setIsCreatingNew(false);
            setNewFolderName('');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, exam]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!exam)
            return;
        let targetPath = selectedFolder;
        if (isCreatingNew) {
            const trimmed = newFolderName.trim();
            if (!trimmed) {
                setError('Vui lòng nhập tên thư mục mới');
                return;
            }
            targetPath = selectedFolder ? `${selectedFolder}/${trimmed}` : trimmed;
            saveCustomFolder(targetPath);
        }
        setIsSubmitting(true);
        try {
            await api.updateExam(exam.id, {
                config: {
                    folder: targetPath ? targetPath : null,
                },
            });
            const destName = targetPath ? `thư mục "${targetPath}"` : 'Thư mục gốc (Chưa phân loại)';
            onShowToast(`📁 Đã chuyển kỳ thi "${exam.title}" sang ${destName}!`);
            onSuccess();
            onClose();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể di chuyển kỳ thi';
            setError(msg);
            onShowToast(`Lỗi: ${msg}`);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen || !exam)
        return null;
    const currentNorm = normalizeFolderPath(exam.folder);
    return (_jsx(Modal, { isOpen: isOpen, maxWidth: "520px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '22px' }, children: "\uD83D\uDCC1" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }, children: "Di Chuy\u1EC3n K\u1EF3 Thi V\u00E0o Th\u01B0 M\u1EE5c" }), _jsx("div", { style: { fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }, children: "Ch\u1ECDn th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF m\u1EDBi ho\u1EB7c t\u1EA1o th\u01B0 m\u1EE5c con cho b\u00E0i thi" })] })] }), onClose: () => !isSubmitting && onClose(), children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }, children: [_jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: UI_RADII.card,
                        padding: '12px 14px',
                        fontSize: '13px',
                    }, children: [_jsx("div", { style: { color: UI_COLORS.textMuted, fontSize: '11.5px', fontWeight: 600 }, children: "K\u1EF2 THI \u0110ANG CHUY\u1EC2N:" }), _jsx("div", { style: { fontWeight: 700, color: UI_COLORS.text, fontSize: '14.5px', marginTop: '2px' }, children: exam.title }), _jsxs("div", { style: { marginTop: '6px', fontSize: '12.5px', color: '#475569' }, children: ["V\u1ECB tr\u00ED hi\u1EC7n t\u1EA1i:", ' ', _jsx("strong", { children: currentNorm ? `📁 ${currentNorm}` : '🏠 Thư mục gốc (Chưa phân loại)' })] })] }), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["Ch\u1ECDn th\u01B0 m\u1EE5c \u0111\u00EDch ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsxs("div", { style: {
                                maxHeight: '220px',
                                overflowY: 'auto',
                                border: `1px solid ${UI_COLORS.border}`,
                                borderRadius: UI_RADII.input,
                                backgroundColor: '#FFFFFF',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                            }, children: [_jsxs("div", { onClick: () => setSelectedFolder(''), style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedFolder === '' ? '#EEF4FF' : 'transparent',
                                        color: selectedFolder === '' ? UI_COLORS.primary : UI_COLORS.text,
                                        fontWeight: selectedFolder === '' ? 700 : 500,
                                        fontSize: '13.5px',
                                    }, children: [_jsx("span", { children: "\uD83C\uDFE0" }), _jsx("span", { children: "Th\u01B0 m\u1EE5c g\u1ED1c (Kh\u00F4ng ph\u00E2n lo\u1EA1i)" })] }), allFolders.map(f => {
                                    const depth = f.split('/').length - 1;
                                    const leafName = f.split('/').pop() || f;
                                    const isSelected = selectedFolder === f;
                                    return (_jsxs("div", { onClick: () => setSelectedFolder(f), style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 10px',
                                            paddingLeft: `${10 + depth * 20}px`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? '#EEF4FF' : 'transparent',
                                            color: isSelected ? UI_COLORS.primary : UI_COLORS.text,
                                            fontWeight: isSelected ? 700 : 500,
                                            fontSize: '13.5px',
                                        }, children: [_jsx("span", { children: depth > 0 ? '📂' : '📁' }), _jsx("span", { children: leafName }), _jsx("span", { style: { fontSize: '11px', color: UI_COLORS.textMuted, marginLeft: 'auto' }, children: f })] }, f));
                                })] })] }), _jsxs("div", { style: {
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 12px',
                    }, children: [_jsxs("label", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: UI_COLORS.text,
                            }, children: [_jsx("input", { type: "checkbox", checked: isCreatingNew, onChange: e => setIsCreatingNew(e.target.checked), style: { accentColor: UI_COLORS.primary } }), _jsx("span", { children: "\u2795 T\u1EA1o th\u01B0 m\u1EE5c con m\u1EDBi b\u00EAn trong v\u1ECB tr\u00ED \u0111\u00E3 ch\u1ECDn" })] }), isCreatingNew && (_jsxs("div", { style: { marginTop: '8px' }, children: [_jsx("input", { type: "text", placeholder: "Nh\u1EADp t\u00EAn th\u01B0 m\u1EE5c con m\u1EDBi (VD: Gi\u1EEFa HK1)...", value: newFolderName, onChange: e => {
                                        setNewFolderName(e.target.value);
                                        if (error)
                                            setError('');
                                    }, style: {
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '8px 12px',
                                        borderRadius: UI_RADII.input,
                                        border: `1px solid ${error ? '#DC2626' : UI_COLORS.border}`,
                                        fontSize: '13px',
                                    } }), _jsxs("div", { style: { fontSize: '11.5px', color: UI_COLORS.textMuted, marginTop: '4px' }, children: ["\u0110\u01B0\u1EDDng d\u1EABn s\u1EBD t\u1EA1o:", ' ', _jsx("strong", { children: selectedFolder
                                                ? `${selectedFolder}/${newFolderName || '...'}`
                                                : newFolderName || '...' })] })] }))] }), error && _jsx("div", { style: { fontSize: '12px', color: '#DC2626' }, children: error }), _jsxs("div", { style: {
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
                                padding: '10px 22px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                            }, children: isSubmitting ? 'Đang chuyển...' : '📁 Xác nhận di chuyển' })] })] }) }));
};
//# sourceMappingURL=MoveExamModal.js.map