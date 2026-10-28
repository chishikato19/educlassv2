import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS, UI_RADII, UI_SPACING } from '@educlass/ui-kit';
import { normalizeFolderPath, saveCustomFolder } from '../utils/exam-folders.js';
export const CreateFolderModal = ({ isOpen, onClose, initialParentPath = '', allFolders, onShowToast, onSuccess, }) => {
    const [folderName, setFolderName] = useState('');
    const [parentPath, setParentPath] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        if (isOpen) {
            setFolderName('');
            setParentPath(normalizeFolderPath(initialParentPath));
            setError('');
        }
    }, [isOpen, initialParentPath]);
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = folderName.trim().replace(/[/\\?%*:|"<>]/g, '');
        if (!trimmed) {
            setError('Vui lòng nhập tên thư mục hợp lệ');
            return;
        }
        const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
        saveCustomFolder(fullPath);
        onShowToast(`📁 Đã tạo thư mục "${fullPath}" thành công!`);
        onSuccess(fullPath);
        onClose();
    };
    if (!isOpen)
        return null;
    const previewPath = parentPath
        ? `${parentPath}/${folderName.trim() || '...'}`
        : folderName.trim() || '...';
    return (_jsx(Modal, { isOpen: isOpen, maxWidth: "480px", title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '22px' }, children: "\uD83D\uDCC1" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '17px', fontWeight: 800, color: UI_COLORS.text }, children: "T\u1EA1o Th\u01B0 M\u1EE5c K\u1EF3 Thi M\u1EDBi" }), _jsx("div", { style: { fontSize: '12.5px', color: UI_COLORS.textMuted, marginTop: '2px' }, children: "T\u1EA1o th\u01B0 m\u1EE5c ho\u1EB7c th\u01B0 m\u1EE5c con \u0111\u1EC3 s\u1EAFp x\u1EBFp c\u00E1c b\u00E0i ki\u1EC3m tra ng\u0103n n\u1EAFp" })] })] }), onClose: onClose, children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }, children: [_jsxs("div", { children: [_jsx("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: "V\u1ECB tr\u00ED (Th\u01B0 m\u1EE5c cha)" }), _jsxs("select", { value: parentPath, onChange: e => setParentPath(e.target.value), style: {
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: UI_RADII.input,
                                border: `1px solid ${UI_COLORS.border}`,
                                fontSize: '14px',
                                backgroundColor: '#FFFFFF',
                                color: UI_COLORS.text,
                                minHeight: '44px',
                                cursor: 'pointer',
                            }, children: [_jsx("option", { value: "", children: "\uD83C\uDFE0 [Th\u01B0 m\u1EE5c g\u1ED1c]" }), allFolders.map(f => {
                                    const depth = f.split('/').length - 1;
                                    const leaf = f.split('/').pop() || f;
                                    return (_jsxs("option", { value: f, children: ['\u00A0'.repeat(depth * 3), "\uD83D\uDCC2 ", leaf, " (", f, ")"] }, f));
                                })] })] }), _jsxs("div", { children: [_jsxs("label", { style: {
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: UI_COLORS.text,
                                marginBottom: '6px',
                            }, children: ["T\u00EAn th\u01B0 m\u1EE5c m\u1EDBi ", _jsx("span", { style: { color: '#DC2626' }, children: "*" })] }), _jsx("input", { type: "text", placeholder: "VD: Gi\u1EEFa HK1, 15 Ph\u00FAt, Tin h\u1ECDc 10...", value: folderName, onChange: e => {
                                setFolderName(e.target.value);
                                if (error)
                                    setError('');
                            }, autoFocus: true, style: {
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: UI_RADII.input,
                                border: `1px solid ${error ? '#DC2626' : UI_COLORS.border}`,
                                fontSize: '14px',
                                minHeight: '44px',
                            } }), error && (_jsx("span", { style: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }, children: error }))] }), _jsxs("div", { style: {
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12.5px',
                        color: '#1E40AF',
                    }, children: ["\u0110\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EE5c s\u1EBD t\u1EA1o:", ' ', _jsxs("strong", { style: { color: UI_COLORS.primary }, children: ["\uD83D\uDCC1 ", previewPath] })] }), _jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '8px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${UI_COLORS.border}`,
                    }, children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                backgroundColor: '#F1F5F9',
                                borderColor: '#CBD5E1',
                                color: '#334155',
                                fontWeight: 600,
                            }, children: "H\u1EE7y b\u1ECF" }), _jsx(Button, { type: "submit", variant: "primary", style: {
                                minHeight: UI_SPACING.minTouchTarget,
                                fontWeight: 700,
                                padding: '10px 22px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                            }, children: "\u2795 T\u1EA1o th\u01B0 m\u1EE5c" })] })] }) }));
};
//# sourceMappingURL=CreateFolderModal.js.map