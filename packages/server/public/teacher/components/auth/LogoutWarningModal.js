import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Modal } from '@educlass/ui-kit';
export const LogoutWarningModal = ({ isOpen, classNameTitle, joinCode, onClose, onCloseSessionAndLogout, onKeepSessionAndLogout, }) => {
    const [isLoading, setIsLoading] = useState(false);
    const handleCloseSessionAndLogout = async () => {
        setIsLoading(true);
        try {
            await onCloseSessionAndLogout();
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleKeepSessionAndLogout = async () => {
        setIsLoading(true);
        try {
            await onKeepSessionAndLogout();
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: "C\u1EA3nh B\u00E1o: Ti\u1EBFt D\u1EA1y \u0110ang M\u1EDF!", children: _jsxs("div", { className: "space-y-4 p-1", children: [_jsxs("div", { className: "p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3", children: [_jsx("span", { className: "text-3xl", children: "\u26A0\uFE0F" }), _jsxs("div", { children: [_jsx("h4", { className: "font-bold text-amber-900 text-base", children: "Ti\u1EBFt d\u1EA1y v\u1EABn \u0111ang ho\u1EA1t \u0111\u1ED9ng!" }), _jsxs("p", { className: "text-sm text-gray-700 mt-1", children: ["L\u1EDBp: ", _jsx("strong", { children: classNameTitle || 'Tiết dạy tự do' }), joinCode && (_jsxs(_Fragment, { children: [' ', "\u2014 M\u00E3 v\u00E0o l\u1EDBp:", ' ', _jsx("strong", { className: "tracking-wider text-blue-600 font-mono", children: joinCode })] }))] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "H\u1ECDc sinh v\u1EABn \u0111ang k\u1EBFt n\u1ED1i trong ph\u00F2ng h\u1ECDc. Th\u1EA7y/C\u00F4 mu\u1ED1n x\u1EED l\u00FD phi\u00EAn h\u1ECDc n\u00E0y nh\u01B0 th\u1EBF n\u00E0o tr\u01B0\u1EDBc khi \u0111\u0103ng xu\u1EA5t?" })] })] }), _jsxs("div", { className: "flex flex-col gap-2.5 pt-2", children: [_jsx(Button, { variant: "danger", onClick: handleCloseSessionAndLogout, disabled: isLoading, className: "w-full justify-center text-sm py-2.5", children: isLoading ? 'Đang đóng tiết & đăng xuất...' : '1. Đóng tiết, lưu kết quả & Đăng xuất' }), _jsx(Button, { variant: "secondary", onClick: handleKeepSessionAndLogout, disabled: isLoading, className: "w-full justify-center text-sm py-2.5", children: "2. V\u1EABn gi\u1EEF phi\u00EAn ch\u1EA1y ng\u1EA7m & \u0110\u0103ng xu\u1EA5t" }), _jsx(Button, { variant: "ghost", onClick: onClose, disabled: isLoading, className: "w-full justify-center text-sm py-2", children: "3. Quay l\u1EA1i ti\u1EBFp t\u1EE5c d\u1EA1y" })] })] }) }));
};
//# sourceMappingURL=LogoutWarningModal.js.map