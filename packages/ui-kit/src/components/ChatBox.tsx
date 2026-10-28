import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessageDto, HandRaiseItem } from '@educlass/protocol';
import { Button } from './Button.js';
import { UI_TYPOGRAPHY } from '../tokens/index.js';

export interface ChatBoxProps {
  /** Danh sách tin nhắn phòng học */
  messages: ChatMessageDto[];
  /** Vai trò người dùng đang xem ('teacher' | 'student') */
  role: 'teacher' | 'student';
  /** ID người tham gia của học sinh hiện tại */
  currentParticipantId?: string | undefined;
  /** Tên hiển thị người dùng hiện tại */
  currentUserName?: string | undefined;
  /** Trạng thái phòng chat có đang bị khóa hay không */
  chatLocked?: boolean | undefined;
  /** Chế độ trò chuyện: 'locked' | 'teacher_only' | 'open' */
  chatMode?: 'locked' | 'teacher_only' | 'open' | undefined;
  /** Danh sách học sinh đang giơ tay xin giúp */
  activeHandRaises?: HandRaiseItem[] | undefined;
  /** Hàm callback khi gửi tin nhắn */
  onSendMessage?: ((text: string, toParticipantId?: string | null) => void) | undefined;
  /** Hàm callback khi Giáo viên bật/tắt khóa chat */
  onToggleChatLock?: ((locked: boolean) => void) | undefined;
  /** Hàm callback khi Giáo viên thay đổi chế độ chat */
  onChangeChatMode?: ((mode: 'locked' | 'teacher_only' | 'open') => void) | undefined;
  /** Hàm callback khi Học sinh giơ tay xin trợ giúp */
  onHandRaise?: ((message?: string) => void) | undefined;
  /** Hàm callback khi Giáo viên hạ tay học sinh */
  onResolveHandRaise?: ((participantId: string) => void) | undefined;
  /** Chiều cao khung chat */
  height?: number | string | undefined;
  className?: string | undefined;
}

/**
 * Component Khung Trò Chuyện & Trợ Giúp (ChatBox)
 * Hỗ trợ chat chung cả lớp, chat riêng với GV, khóa chat và nút giơ tay ✋
 */
export const ChatBox: React.FC<ChatBoxProps> = ({
  messages = [],
  role = 'student',
  currentParticipantId,
  currentUserName = 'Bạn',
  chatLocked = true,
  chatMode,
  activeHandRaises = [],
  onSendMessage,
  onToggleChatLock,
  onChangeChatMode,
  onHandRaise,
  onResolveHandRaise,
  height = '480px',
  className = '',
}) => {
  // Tab chat: 'public' (Toàn lớp) hoặc 'private' (Riêng với GV / HS)
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'hand_raises'>('public');
  const [inputText, setInputText] = useState('');
  const [handRaiseMsg, setHandRaiseMsg] = useState('');
  const [showHandRaiseModal, setShowHandRaiseModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Kiểm tra xem chính học sinh này đã giơ tay chưa
  const isSelfHandRaised =
    role === 'student' &&
    currentParticipantId &&
    activeHandRaises.some(h => h.participantId === currentParticipantId);

  // Lọc tin nhắn theo Tab
  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'public') {
      return msg.toParticipantId === null || msg.toParticipantId === undefined;
    }
    if (activeTab === 'private') {
      if (role === 'student') {
        // Học sinh trong tab Riêng: xem tin nhắn riêng giữa mình và GV
        return msg.toParticipantId === currentParticipantId;
      }
      // Giáo viên trong tab Riêng: hiện tất cả tin riêng giữa GV và học sinh
      return msg.toParticipantId !== null && msg.toParticipantId !== undefined;
    }
    return true;
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (role === 'student' && chatLocked && activeTab === 'public') {
      return;
    }

    if (onSendMessage) {
      if (activeTab === 'private') {
        if (role === 'student') {
          // HS gửi riêng cho GV: toParticipantId đánh dấu là chính mình
          onSendMessage(trimmed, currentParticipantId ?? 'teacher');
        } else {
          // GV gửi riêng
          onSendMessage(trimmed, null);
        }
      } else {
        // Tin chung cả lớp
        onSendMessage(trimmed, null);
      }
    }
    setInputText('');
  };

  const handleConfirmHandRaise = () => {
    if (onHandRaise) {
      onHandRaise(handRaiseMsg.trim() || undefined);
    }
    setHandRaiseMsg('');
    setShowHandRaiseModal(false);
  };

  return (
    <div
      data-testid="chat-box-container"
      className={`educlass-chat-box flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
      style={{
        height,
        fontFamily: UI_TYPOGRAPHY.fontFamily,
      }}
    >
      {/* 1. Header: Chuyển đổi Tab & Nút hành động */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`min-h-[40px] px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'public'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💬 Toàn lớp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('private')}
            className={`min-h-[40px] px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'private'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔒 {role === 'student' ? 'Với Thầy/Cô' : 'Tin nhắn riêng'}
          </button>

          {role === 'teacher' && (
            <button
              type="button"
              onClick={() => setActiveTab('hand_raises')}
              className={`min-h-[40px] px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'hand_raises'
                  ? 'bg-white text-amber-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✋ Cần giúp
              {activeHandRaises.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {activeHandRaises.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Nút chức năng riêng theo Role */}
        <div className="flex items-center gap-2">
          {role === 'teacher' ? (
            <div className="flex items-center gap-1.5">
              <select
                value={chatMode ?? (chatLocked ? 'locked' : 'open')}
                onChange={e => {
                  const newMode = e.target.value as 'locked' | 'teacher_only' | 'open';
                  if (onChangeChatMode) {
                    onChangeChatMode(newMode);
                  } else if (onToggleChatLock) {
                    onToggleChatLock(newMode === 'locked');
                  }
                }}
                className="text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-300 bg-white shadow-2xs outline-none cursor-pointer text-slate-800"
                title="Quyền trò chuyện trong lớp"
                data-testid="chat-mode-select"
              >
                <option value="locked">🔒 Khóa chat</option>
                <option value="teacher_only">👨‍🏫 Chỉ chat với GV</option>
                <option value="open">📢 Mở cả lớp</option>
              </select>
              <Button
                variant={chatLocked ? 'danger' : 'secondary'}
                onClick={() => {
                  const nextLock = !chatLocked;
                  onToggleChatLock?.(nextLock);
                  if (onChangeChatMode) {
                    onChangeChatMode(nextLock ? 'locked' : 'open');
                  }
                }}
                title={chatLocked ? 'Bấm để mở khóa trò chuyện' : 'Bấm để tạm khóa trò chuyện'}
              >
                {chatLocked ? '🔒 Đang khóa chat' : '🔓 Khóa chat'}
              </Button>
            </div>
          ) : (
            <Button
              variant={isSelfHandRaised ? 'secondary' : 'primary'}
              disabled={Boolean(isSelfHandRaised)}
              onClick={() => setShowHandRaiseModal(true)}
              className="font-bold flex items-center gap-1"
            >
              {isSelfHandRaised ? '✋ Đã xin giúp' : '✋ Xin giúp'}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Cảnh báo khi phòng chat bị khóa */}
      {chatLocked && activeTab === 'public' && (
        <div
          className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-semibold"
          role="alert"
        >
          <span>🔒 Thầy/cô đã tạm khóa trò chuyện trong lớp học.</span>
          {role === 'student' && (
            <span className="text-[11px] font-normal text-amber-700">
              (Em vẫn có thể bấm nút ✋ Xin giúp)
            </span>
          )}
        </div>
      )}

      {/* 3. Danh sách học sinh đang giơ tay (khi GV chọn Tab 'hand_raises') */}
      {role === 'teacher' && activeTab === 'hand_raises' ? (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50">
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Danh sách học sinh đang cần hỗ trợ ({activeHandRaises.length})
          </div>
          {activeHandRaises.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm py-12">
              <span className="text-3xl mb-2">🎉</span>
              <span>Hiện không có bạn nào cần hỗ trợ.</span>
            </div>
          ) : (
            activeHandRaises.map(item => (
              <div
                key={item.participantId}
                className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-xl shadow-xs"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>✋</span>
                    <span>{item.participantName}</span>
                  </div>
                  {item.message && (
                    <div className="text-xs text-slate-600 mt-1 italic">
                      &quot;{item.message}&quot;
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(item.requestedAt).toLocaleTimeString('vi-VN')}
                  </div>
                </div>

                <Button variant="primary" onClick={() => onResolveHandRaise?.(item.participantId)}>
                  Đã hỗ trợ xong
                </Button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* 4. Vùng hiển thị tin nhắn chat */
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-slate-50/50">
          {filteredMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs md:text-sm py-12 select-none">
              <span className="text-3xl mb-1">💬</span>
              <span>Chưa có tin nhắn nào trong phòng.</span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Hãy là người đầu tiên gửi lời chào!
              </span>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isOwn =
                role === 'teacher'
                  ? msg.fromTeacher
                  : msg.fromParticipantId === currentParticipantId;
              const isHandRaise = msg.kind === 'hand_raise';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] md:max-w-[75%] ${
                    isOwn ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  {/* Tên người gửi */}
                  <div className="flex items-center gap-1 mb-0.5 px-1 text-[11px] text-slate-500 font-medium">
                    {msg.fromTeacher ? (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded-sm text-[10px]">
                        Thầy/Cô
                      </span>
                    ) : (
                      <span>{isOwn ? currentUserName : msg.fromParticipantName}</span>
                    )}
                    {msg.toParticipantId && (
                      <span className="text-[10px] text-amber-600 font-semibold">[Riêng]</span>
                    )}
                  </div>

                  {/* Bóng chat */}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-2xs break-words ${
                      isHandRaise
                        ? 'bg-amber-100 border border-amber-300 text-amber-950 rounded-tl-sm'
                        : isOwn
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Thời gian */}
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                    {new Date(msg.ts).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 5. Khung nhập tin nhắn */}
      {activeTab !== 'hand_raises' && (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-2.5 bg-white border-t border-slate-200"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={role === 'student' && chatLocked && activeTab === 'public'}
            placeholder={
              role === 'student' && chatLocked && activeTab === 'public'
                ? 'Trò chuyện đang bị khóa...'
                : activeTab === 'private'
                  ? role === 'student'
                    ? 'Gửi tin nhắn riêng tới Thầy/Cô...'
                    : 'Gửi tin nhắn riêng...'
                  : 'Nhập tin nhắn...'
            }
            className="flex-1 min-h-[48px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={
              !inputText.trim() || (role === 'student' && chatLocked && activeTab === 'public')
            }
            className="min-h-[48px] px-4 font-semibold shrink-0 cursor-pointer"
          >
            Gửi
          </Button>
        </form>
      )}

      {/* 6. Modal Học sinh gửi tín hiệu giơ tay ✋ xin giúp */}
      {showHandRaiseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="text-2xl">✋</span>
              <span>Xin Thầy/Cô trợ giúp</span>
            </div>

            <p className="text-xs text-slate-600">
              Thầy/cô sẽ nhận được thông báo ngay lập tức. Em có thể nhập thêm lý do bên dưới (không
              bắt buộc):
            </p>

            <input
              type="text"
              value={handRaiseMsg}
              onChange={e => setHandRaiseMsg(e.target.value)}
              placeholder="Vd: Em không nghe rõ âm thanh, câu hỏi bị lỗi..."
              className="min-h-[48px] px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowHandRaiseModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleConfirmHandRaise}>
                Xác nhận giơ tay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
