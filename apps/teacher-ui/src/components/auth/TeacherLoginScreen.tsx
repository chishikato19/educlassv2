import React, { useCallback, useEffect, useState } from 'react';
import type { TeacherPublicProfile, UserDto } from '@educlass/protocol';
import { Toast, UI_COLORS } from '@educlass/ui-kit';
import { api } from '../../api/client.js';
import { PinModal } from './PinModal.js';
import { RegisterTeacherModal } from './RegisterTeacherModal.js';
import { AdminLoginModal } from './AdminLoginModal.js';

export interface TeacherLoginScreenProps {
  onLoginSuccess: (user: UserDto) => void;
}

// Bảng màu pastel ngẫu nhiên cho avatar giáo viên
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-amber-100 text-amber-700 border-amber-300',
  'bg-emerald-100 text-emerald-700 border-emerald-300',
  'bg-purple-100 text-purple-700 border-purple-300',
  'bg-rose-100 text-rose-700 border-rose-300',
  'bg-cyan-100 text-cyan-700 border-cyan-300',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0]!;
}

export const TeacherLoginScreen: React.FC<TeacherLoginScreenProps> = ({ onLoginSuccess }) => {
  const [teachers, setTeachers] = useState<TeacherPublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPublicProfile | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api.getTeachers();
      setTeachers(list);
    } catch {
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const handleSelectTeacher = (teacher: TeacherPublicProfile) => {
    setSelectedTeacher(teacher);
    setIsPinModalOpen(true);
  };

  const handleRegisterSuccess = (createdUser: UserDto) => {
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

  return (
    <div
      className="min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6"
      style={{ backgroundColor: UI_COLORS.background }}
    >
      {/* Tiêu đề ứng dụng */}
      <div className="max-w-4xl mx-auto w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
          🏫 Máy tính bục giảng / Phòng bộ môn
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          EduClass v2
        </h1>
        <p className="text-lg text-gray-600 mt-2 font-medium">
          Chọn tài khoản giáo viên để bắt đầu tiết học
        </p>
      </div>

      {/* Danh sách giáo viên */}
      <div className="max-w-4xl mx-auto w-full flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="font-semibold text-sm">Đang tải danh sách giáo viên...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {teachers.map((t) => {
              const colorClass = getAvatarColor(t.displayName || t.username);
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeacher(t)}
                  className="group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-400 transition-all duration-200 cursor-pointer flex flex-col items-center text-center transform hover:-translate-y-1"
                >
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-3 border-2 shadow-inner group-hover:scale-105 transition-transform duration-200 ${colorClass}`}
                  >
                    {t.displayName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {t.displayName}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    {t.subject ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        {t.subject}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Giáo viên</span>
                    )}
                  </div>
                  <div className="mt-4 text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Nhập PIN vào lớp ➔
                  </div>
                </div>
              );
            })}

            {/* Thẻ Thêm giáo viên mới */}
            <div
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-white/60 hover:bg-white rounded-3xl p-6 border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group min-h-[200px]"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-500 flex items-center justify-center text-3xl font-bold mb-2 group-hover:scale-110 transition-transform">
                +
              </div>
              <h4 className="text-base font-bold text-gray-700 group-hover:text-blue-600">
                Thêm giáo viên mới
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Tạo tài khoản riêng trên máy này
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chân trang: Đăng nhập quản trị viên & phiên bản */}
      <div className="max-w-4xl mx-auto w-full pt-8 border-t border-amber-200/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
        <button
          type="button"
          onClick={() => setIsAdminModalOpen(true)}
          className="hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>🔑</span> Đăng nhập Quản trị viên (Admin)
        </button>
        <span className="text-gray-400">
          EduClass v2 — Hệ thống Dạy học & Tương tác lớp học
        </span>
      </div>

      {/* Modals */}
      <PinModal
        teacher={selectedTeacher}
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedTeacher(null);
        }}
        onSuccess={(user) => {
          setIsPinModalOpen(false);
          onLoginSuccess(user);
        }}
      />

      <RegisterTeacherModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={(user) => {
          setIsAdminModalOpen(false);
          onLoginSuccess(user);
        }}
      />

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
