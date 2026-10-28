import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Button, Modal } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
export const PinModal = ({ teacher, isOpen, onClose, onSuccess }) => {
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetSuccessMsg, setResetSuccessMsg] = useState(null);
    // Reset state khi mở modal với giáo viên mới
    useEffect(() => {
        if (isOpen) {
            setPin('');
            setErrorMsg(null);
            setShowResetConfirm(false);
            setResetSuccessMsg(null);
            setIsLoading(false);
        }
    }, [isOpen, teacher]);
    const handleSubmitPin = useCallback(async (pinToSubmit) => {
        if (!teacher || isLoading)
            return;
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await api.login(teacher.username, pinToSubmit);
            onSuccess(res.user);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Mã PIN không chính xác';
            setErrorMsg(message.includes('Mật khẩu') || message.includes('CREDENTIALS')
                ? 'Mã PIN không đúng (Mặc định: 1234).'
                : message);
            setPin('');
        }
        finally {
            setIsLoading(false);
        }
    }, [teacher, isLoading, onSuccess]);
    const handleDigit = useCallback((digit) => {
        if (pin.length < 4 && !isLoading) {
            const newPin = pin + digit;
            setPin(newPin);
            setErrorMsg(null);
            if (newPin.length === 4) {
                handleSubmitPin(newPin);
            }
        }
    }, [pin, isLoading, handleSubmitPin]);
    const handleDelete = useCallback(() => {
        if (pin.length > 0 && !isLoading) {
            setPin(prev => prev.slice(0, -1));
            setErrorMsg(null);
        }
    }, [pin, isLoading]);
    const handleClear = useCallback(() => {
        setPin('');
        setErrorMsg(null);
    }, []);
    // Lắng nghe bàn phím vật lý
    useEffect(() => {
        if (!isOpen || showResetConfirm)
            return;
        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleDigit(e.key);
            }
            else if (e.key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showResetConfirm, handleDigit, handleDelete, onClose]);
    // Xử lý Quên mã PIN (Phương án 2: xác nhận 1 chạm)
    const handleConfirmReset = async () => {
        if (!teacher)
            return;
        setIsLoading(true);
        try {
            await api.resetPin(teacher.id);
            setShowResetConfirm(false);
            setResetSuccessMsg('Đã đặt lại mã PIN về 1234. Vui lòng nhập 1234 để vào tiết dạy.');
            setPin('');
            setErrorMsg(null);
        }
        catch {
            setErrorMsg('Không thể đặt lại mã PIN. Vui lòng thử lại.');
        }
        finally {
            setIsLoading(false);
        }
    };
    if (!teacher)
        return null;
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "Nh\u1EADp m\u00E3 PIN Gi\u00E1o vi\u00EAn", children: _jsxs("div", { className: "flex flex-col items-center p-2 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-black mb-2 shadow-sm border border-blue-200", children: teacher.displayName.charAt(0).toUpperCase() }), _jsx("h3", { className: "text-xl font-bold text-gray-800", children: teacher.displayName }), teacher.subject && (_jsx("span", { className: "text-sm px-2.5 py-0.5 mt-1 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100", children: teacher.subject })), showResetConfirm ? (_jsxs("div", { className: "w-full mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left", children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-800 font-bold mb-2", children: [_jsx("span", { className: "text-xl", children: "\u26A0\uFE0F" }), " \u0110\u1EB7t l\u1EA1i m\u00E3 PIN v\u1EC1 m\u1EB7c \u0111\u1ECBnh?"] }), _jsxs("p", { className: "text-sm text-gray-600 mb-4", children: ["M\u00E3 PIN c\u1EE7a t\u00E0i kho\u1EA3n ", _jsx("strong", { children: teacher.displayName }), " s\u1EBD \u0111\u01B0\u1EE3c \u0111\u1EB7t l\u1EA1i v\u1EC1", ' ', _jsx("strong", { children: "1234" }), "."] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "danger", style: { padding: '6px 12px', fontSize: '13px' }, onClick: handleConfirmReset, disabled: isLoading, children: isLoading ? 'Đang đặt lại...' : 'Xác nhận đặt lại về 1234' }), _jsx(Button, { variant: "ghost", style: { padding: '6px 12px', fontSize: '13px' }, onClick: () => setShowResetConfirm(false), disabled: isLoading, children: "H\u1EE7y" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex gap-3 my-6 justify-center", children: [0, 1, 2, 3].map(index => {
                                const isFilled = index < pin.length;
                                return (_jsx("div", { className: `w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-150 border-2 ${isFilled
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-md scale-105'
                                        : 'bg-white border-gray-300 text-transparent'}`, children: isFilled ? '●' : '' }, index));
                            }) }), errorMsg && (_jsx("div", { className: "text-sm text-red-500 font-semibold mb-3 animate-bounce", children: errorMsg })), resetSuccessMsg && (_jsx("div", { className: "text-sm text-emerald-600 font-semibold mb-3 bg-emerald-50 p-2 rounded-xl border border-emerald-200", children: resetSuccessMsg })), _jsxs("div", { className: "grid grid-cols-3 gap-2.5 w-64 max-w-full mb-3", children: [['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (_jsx("button", { type: "button", onClick: () => handleDigit(digit), disabled: isLoading, className: "h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer", children: digit }, digit))), _jsx("button", { type: "button", onClick: handleClear, disabled: isLoading, className: "h-14 rounded-2xl bg-gray-50 hover:bg-red-50 text-sm font-bold text-gray-500 hover:text-red-600 border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer", children: "X\u00F3a h\u1EBFt" }), _jsx("button", { type: "button", onClick: () => handleDigit('0'), disabled: isLoading, className: "h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer", children: "0" }), _jsx("button", { type: "button", onClick: handleDelete, disabled: isLoading, className: "h-14 rounded-2xl bg-gray-50 hover:bg-amber-50 text-xl font-bold text-gray-600 hover:text-amber-600 border border-gray-200 transition-transform active:scale-95 flex items-center justify-center cursor-pointer", title: "X\u00F3a k\u00FD t\u1EF1 cu\u1ED1i", children: "\u232B" })] }), _jsx("div", { className: "mt-2", children: _jsx("button", { type: "button", onClick: () => setShowResetConfirm(true), className: "text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 cursor-pointer transition-colors", children: "Qu\u00EAn m\u00E3 PIN? (\u0110\u1EB7t l\u1EA1i v\u1EC1 1234)" }) })] }))] }) }));
};
//# sourceMappingURL=PinModal.js.map