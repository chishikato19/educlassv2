import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
export const RegisterTeacherModal = ({ isOpen, onClose, onSuccess, }) => {
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [subject, setSubject] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // Gợi ý tự động sinh username khi gõ tên hiển thị
    const handleDisplayNameChange = (e) => {
        const name = e.target.value;
        setDisplayName(name);
        setErrorMsg(null);
        // Nếu username chưa sửa hoặc trống, gợi ý username không dấu
        if (!username || username === sanitizeUsername(displayName)) {
            setUsername(sanitizeUsername(name));
        }
    };
    const sanitizeUsername = (str) => {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 30);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!displayName.trim()) {
            setErrorMsg('Vui lòng nhập họ và tên giáo viên');
            return;
        }
        if (!username.trim() || username.length < 2) {
            setErrorMsg('Tên đăng nhập phải có ít nhất 2 ký tự');
            return;
        }
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const user = await api.registerTeacher({
                displayName: displayName.trim(),
                username: username.trim().toLowerCase(),
                subject: subject.trim() || undefined,
            });
            // Reset form
            setDisplayName('');
            setUsername('');
            setSubject('');
            onSuccess(user);
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo tài khoản');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Th\u00EAm T\u00E0i Kho\u1EA3n Gi\u00E1o Vi\u00EAn M\u1EDBi", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 p-1", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["H\u1ECD v\u00E0 t\u00EAn gi\u00E1o vi\u00EAn ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { value: displayName, onChange: handleDisplayNameChange, placeholder: "VD: C\u00F4 Nguy\u1EC5n Mai, Th\u1EA7y L\u00EA Nam...", autoFocus: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["T\u00EAn \u0111\u0103ng nh\u1EADp (vi\u1EBFt li\u1EC1n kh\u00F4ng d\u1EA5u) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { value: username, onChange: e => {
                                setUsername(e.target.value);
                                setErrorMsg(null);
                            }, placeholder: "VD: mai.toan, nam.ly..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: "M\u00F4n h\u1ECDc ph\u1EE5 tr\u00E1ch (t\u00F9y ch\u1ECDn)" }), _jsx(Input, { value: subject, onChange: e => setSubject(e.target.value), placeholder: "VD: To\u00E1n h\u1ECDc, V\u1EADt l\u00FD, Ng\u1EEF v\u0103n, Tin h\u1ECDc..." })] }), _jsxs("div", { className: "p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start gap-2", children: [_jsx("span", { className: "text-base", children: "\u2139\uFE0F" }), _jsxs("div", { children: ["M\u00E3 PIN kh\u1EDFi t\u1EA1o m\u1EB7c \u0111\u1ECBnh s\u1EBD l\u00E0 ", _jsx("strong", { children: "1234" }), ". Th\u1EA7y/C\u00F4 c\u00F3 th\u1EC3 \u0111\u1ED5i m\u00E3 PIN c\u00E1 nh\u00E2n b\u1EA5t c\u1EE9 l\u00FAc n\u00E0o trong ph\u1EA7n C\u00E0i \u0111\u1EB7t sau khi \u0111\u0103ng nh\u1EADp."] })] }), errorMsg && (_jsx("div", { className: "text-sm text-red-500 font-semibold p-2 bg-red-50 rounded-xl border border-red-200", children: errorMsg })), _jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-gray-100", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, disabled: isLoading, children: "H\u1EE7y" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isLoading, children: isLoading ? 'Đang tạo...' : 'Tạo tài khoản' })] })] }) }));
};
//# sourceMappingURL=RegisterTeacherModal.js.map