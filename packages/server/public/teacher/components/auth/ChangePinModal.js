import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Input, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
export const ChangePinModal = ({ isOpen, onClose, onSuccess }) => {
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!oldPin) {
            setErrorMsg('Vui lòng nhập mã PIN hiện tại');
            return;
        }
        if (newPin.length < 4) {
            setErrorMsg('Mã PIN mới phải có ít nhất 4 ký tự');
            return;
        }
        if (newPin !== confirmPin) {
            setErrorMsg('Mã PIN mới và xác nhận mã PIN không khớp nhau');
            return;
        }
        setIsLoading(true);
        setErrorMsg(null);
        try {
            await api.changePassword(oldPin, newPin);
            setOldPin('');
            setNewPin('');
            setConfirmPin('');
            onSuccess();
        }
        catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Đổi mã PIN thất bại');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "\u0110\u1ED5i M\u00E3 PIN C\u00E1 Nh\u00E2n", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 p-1", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["M\u00E3 PIN hi\u1EC7n t\u1EA1i ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { type: "password", maxLength: 10, value: oldPin, onChange: e => setOldPin(e.target.value), placeholder: "M\u1EB7c \u0111\u1ECBnh ban \u0111\u1EA7u l\u00E0 1234", autoFocus: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["M\u00E3 PIN m\u1EDBi (4 s\u1ED1) ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { type: "password", maxLength: 10, value: newPin, onChange: e => setNewPin(e.target.value), placeholder: "Nh\u1EADp 4 s\u1ED1 m\u1EDBi (VD: 5678)" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-bold text-gray-700 mb-1", children: ["X\u00E1c nh\u1EADn m\u00E3 PIN m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { type: "password", maxLength: 10, value: confirmPin, onChange: e => setConfirmPin(e.target.value), placeholder: "Nh\u1EADp l\u1EA1i m\u00E3 PIN m\u1EDBi" })] }), errorMsg && (_jsx("div", { className: "text-sm text-red-500 font-semibold p-2 bg-red-50 rounded-xl border border-red-200", children: errorMsg })), _jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-gray-100", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, disabled: isLoading, children: "H\u1EE7y" }), _jsx(Button, { type: "submit", variant: "primary", disabled: isLoading, children: isLoading ? 'Đang cập nhật...' : 'Lưu mã PIN mới' })] })] }) }));
};
//# sourceMappingURL=ChangePinModal.js.map