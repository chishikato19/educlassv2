import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
export const AdminLoginModal = ({ isOpen, onClose, onSuccess }) => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setErrorMsg('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await api.login(username.trim(), password);
            onSuccess(res.user);
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không đúng');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "\u0110\u0103ng nh\u1EADp Qu\u1EA3n tr\u1ECB vi\u00EAn (Admin)", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 p-1", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: "T\u00EAn \u0111\u0103ng nh\u1EADp" }), _jsx(Input, { value: username, onChange: e => setUsername(e.target.value), placeholder: "admin", autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: "M\u1EADt kh\u1EA9u" }), _jsx(Input, { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "Nh\u1EADp m\u1EADt kh\u1EA9u qu\u1EA3n tr\u1ECB vi\u00EAn" })] }), errorMsg && (_jsx("div", { className: "text-sm text-red-500 font-semibold p-2 bg-red-50 rounded-xl border border-red-200", children: errorMsg })), _jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-gray-100", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, disabled: isLoading, children: "H\u1EE7y" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isLoading, children: isLoading ? 'Đang xác thực...' : 'Đăng nhập' })] })] }) }));
};
//# sourceMappingURL=AdminLoginModal.js.map