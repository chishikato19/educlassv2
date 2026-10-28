import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Toast, UI_COLORS } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
import { PinModal } from './PinModal.js';
import { RegisterTeacherModal } from './RegisterTeacherModal.js';
import { AdminLoginModal } from './AdminLoginModal.js';
// Bảng màu pastel ngẫu nhiên cho avatar giáo viên
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 border-blue-300',
    'bg-amber-100 text-amber-700 border-amber-300',
    'bg-emerald-100 text-emerald-700 border-emerald-300',
    'bg-purple-100 text-purple-700 border-purple-300',
    'bg-rose-100 text-rose-700 border-rose-300',
    'bg-cyan-100 text-cyan-700 border-cyan-300',
];
function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}
export const TeacherLoginScreen = ({ onLoginSuccess }) => {
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const loadTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await api.getTeachers();
            setTeachers(list);
        }
        catch {
            setTeachers([]);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        loadTeachers();
    }, [loadTeachers]);
    const handleSelectTeacher = (teacher) => {
        setSelectedTeacher(teacher);
        setIsPinModalOpen(true);
    };
    const handleRegisterSuccess = (createdUser) => {
        setIsRegisterModalOpen(false);
        setToastMessage(`Đã tạo tài khoản cho ${createdUser.displayName}! Mã PIN ban đầu là 1234.`);
        loadTeachers();
        // Mở ngay ô nhập PIN cho tài khoản vừa tạo
        setSelectedTeacher({
            id: createdUser.id,
            username: createdUser.username,
            displayName: createdUser.displayName,
            subject: createdUser.subject,
            avatar: createdUser.avatar,
            role: createdUser.role,
        });
        setIsPinModalOpen(true);
    };
    return (_jsxs("div", { className: "min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6", style: { backgroundColor: UI_COLORS.background }, children: [_jsxs("div", { className: "max-w-4xl mx-auto w-full text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3", children: "\uD83C\uDFEB M\u00E1y t\u00EDnh b\u1EE5c gi\u1EA3ng / Ph\u00F2ng b\u1ED9 m\u00F4n" }), _jsx("h1", { className: "text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight", children: "EduClass v2" }), _jsx("p", { className: "text-lg text-gray-600 mt-2 font-medium", children: "Ch\u1ECDn t\u00E0i kho\u1EA3n gi\u00E1o vi\u00EAn \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u ti\u1EBFt h\u1ECDc" })] }), _jsx("div", { className: "max-w-4xl mx-auto w-full flex-1", children: isLoading ? (_jsxs("div", { className: "flex flex-col items-center justify-center p-12 text-gray-400", children: [_jsx("div", { className: "w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" }), _jsx("span", { className: "font-semibold text-sm", children: "\u0110ang t\u1EA3i danh s\u00E1ch gi\u00E1o vi\u00EAn..." })] })) : (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5", children: [teachers.map(t => {
                            const colorClass = getAvatarColor(t.displayName || t.username);
                            return (_jsxs("div", { onClick: () => handleSelectTeacher(t), className: "group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-400 transition-all duration-200 cursor-pointer flex flex-col items-center text-center transform hover:-translate-y-1", children: [_jsx("div", { className: `w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-3 border-2 shadow-inner group-hover:scale-105 transition-transform duration-200 ${colorClass}`, children: t.displayName.charAt(0).toUpperCase() }), _jsx("h3", { className: "text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1", children: t.displayName }), _jsx("div", { className: "mt-1 flex items-center gap-1.5", children: t.subject ? (_jsx("span", { className: "text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100", children: t.subject })) : (_jsx("span", { className: "text-xs text-gray-400 italic", children: "Gi\u00E1o vi\u00EAn" })) }), _jsx("div", { className: "mt-4 text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", children: "Nh\u1EADp PIN v\u00E0o l\u1EDBp \u2794" })] }, t.id));
                        }), _jsxs("div", { onClick: () => setIsRegisterModalOpen(true), className: "bg-white/60 hover:bg-white rounded-3xl p-6 border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group min-h-[200px]", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-500 flex items-center justify-center text-3xl font-bold mb-2 group-hover:scale-110 transition-transform", children: "+" }), _jsx("h4", { className: "text-base font-bold text-gray-700 group-hover:text-blue-600", children: "Th\u00EAm gi\u00E1o vi\u00EAn m\u1EDBi" }), _jsx("p", { className: "text-xs text-gray-400 mt-1", children: "T\u1EA1o t\u00E0i kho\u1EA3n ri\u00EAng tr\u00EAn m\u00E1y n\u00E0y" })] })] })) }), _jsxs("div", { className: "max-w-4xl mx-auto w-full pt-8 border-t border-amber-200/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3", children: [_jsxs("button", { type: "button", onClick: () => setIsAdminModalOpen(true), className: "hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors", children: [_jsx("span", { children: "\uD83D\uDD11" }), " \u0110\u0103ng nh\u1EADp Qu\u1EA3n tr\u1ECB vi\u00EAn (Admin)"] }), _jsx("span", { className: "text-gray-400", children: "EduClass v2 \u2014 H\u1EC7 th\u1ED1ng D\u1EA1y h\u1ECDc & T\u01B0\u01A1ng t\u00E1c l\u1EDBp h\u1ECDc" })] }), _jsx(PinModal, { teacher: selectedTeacher, isOpen: isPinModalOpen, onClose: () => {
                    setIsPinModalOpen(false);
                    setSelectedTeacher(null);
                }, onSuccess: user => {
                    setIsPinModalOpen(false);
                    onLoginSuccess(user);
                } }), _jsx(RegisterTeacherModal, { isOpen: isRegisterModalOpen, onClose: () => setIsRegisterModalOpen(false), onSuccess: handleRegisterSuccess }), _jsx(AdminLoginModal, { isOpen: isAdminModalOpen, onClose: () => setIsAdminModalOpen(false), onSuccess: user => {
                    setIsAdminModalOpen(false);
                    onLoginSuccess(user);
                } }), toastMessage && _jsx(Toast, { message: toastMessage, onClose: () => setToastMessage(null) })] }));
};
//# sourceMappingURL=TeacherLoginScreen.js.map