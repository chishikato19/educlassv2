// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatBox } from '../components/ChatBox.js';
import type { ChatMessageDto, HandRaiseItem } from '@educlass/protocol';

describe('ChatBox Component (Task 5.2)', () => {
  const mockMessages: ChatMessageDto[] = [
    {
      id: 'm1',
      sessionId: 's1',
      fromTeacher: true,
      fromParticipantName: 'Thầy/Cô',
      toParticipantId: null,
      kind: 'text',
      text: 'Chào cả lớp!',
      ts: Date.now() - 60000,
    },
    {
      id: 'm2',
      sessionId: 's1',
      fromTeacher: false,
      fromParticipantId: 'p1',
      fromParticipantName: 'Học sinh An',
      toParticipantId: null,
      kind: 'text',
      text: 'Em chào thầy ạ!',
      ts: Date.now() - 30000,
    },
    {
      id: 'm3',
      sessionId: 's1',
      fromTeacher: false,
      fromParticipantId: 'p1',
      fromParticipantName: 'Học sinh An',
      toParticipantId: 'p1', // tin riêng với GV
      kind: 'text',
      text: 'Thầy ơi em bị mất mạng',
      ts: Date.now() - 10000,
    },
  ];

  it('renders public messages for students', () => {
    render(<ChatBox role="student" currentParticipantId="p1" messages={mockMessages} />);

    expect(screen.getByText('Chào cả lớp!')).toBeDefined();
    expect(screen.getByText('Em chào thầy ạ!')).toBeDefined();
    // Tab public không hiển thị tin riêng
    expect(screen.queryByText('Thầy ơi em bị mất mạng')).toBeNull();
  });

  it('switches to private tab and shows private messages', () => {
    render(<ChatBox role="student" currentParticipantId="p1" messages={mockMessages} />);

    const privateTab = screen.getByText(/Với Thầy\/Cô/i);
    fireEvent.click(privateTab);

    expect(screen.getByText('Thầy ơi em bị mất mạng')).toBeDefined();
  });

  it('displays chat locked banner and disables sending', () => {
    render(
      <ChatBox role="student" currentParticipantId="p1" messages={mockMessages} chatLocked={true} />
    );

    expect(screen.getByText(/Thầy\/cô đã tạm khóa trò chuyện trong lớp học/i)).toBeDefined();

    const input = screen.getByPlaceholderText(/Trò chuyện đang bị khóa/i);
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('allows student to click hand raise button and submit request', () => {
    const handleHandRaise = vi.fn();
    render(
      <ChatBox
        role="student"
        currentParticipantId="p1"
        messages={mockMessages}
        onHandRaise={handleHandRaise}
      />
    );

    const handRaiseBtn = screen.getByRole('button', { name: /✋ Xin giúp/i });
    fireEvent.click(handRaiseBtn);

    // Modal hiện ra
    expect(screen.getByText('Xin Thầy/Cô trợ giúp')).toBeDefined();

    // Nhập lý do và xác nhận
    const reasonInput = screen.getByPlaceholderText(/Em không nghe rõ âm thanh/i);
    fireEvent.change(reasonInput, { target: { value: 'Micro của em bị rè' } });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận giơ tay/i });
    fireEvent.click(confirmBtn);

    expect(handleHandRaise).toHaveBeenCalledWith('Micro của em bị rè');
  });

  it('allows teacher to view active hand raises and resolve them', () => {
    const activeHandRaises: HandRaiseItem[] = [
      {
        participantId: 'p2',
        participantName: 'Học sinh Bảo',
        requestedAt: Date.now(),
        message: 'Không thấy nút nộp bài',
      },
    ];

    const handleResolve = vi.fn();
    const handleToggleLock = vi.fn();

    render(
      <ChatBox
        role="teacher"
        messages={mockMessages}
        activeHandRaises={activeHandRaises}
        onResolveHandRaise={handleResolve}
        onToggleChatLock={handleToggleLock}
        chatLocked={false}
      />
    );

    // Giáo viên thấy tab "Cần giúp" có badge 1
    const handRaiseTab = screen.getByText(/Cần giúp/i);
    fireEvent.click(handRaiseTab);

    expect(screen.getByText('Học sinh Bảo')).toBeDefined();
    expect(screen.getByText(/"Không thấy nút nộp bài"/i)).toBeDefined();

    const resolveBtn = screen.getByRole('button', { name: /Đã hỗ trợ xong/i });
    fireEvent.click(resolveBtn);
    expect(handleResolve).toHaveBeenCalledWith('p2');

    // Nút khóa chat cho GV
    const lockBtn = screen.getByRole('button', { name: /🔓 Khóa chat/i });
    fireEvent.click(lockBtn);
    expect(handleToggleLock).toHaveBeenCalledWith(true);
  });

  it('khởi tạo với chatLocked = true mặc định cho GV', () => {
    const handleToggle = vi.fn();
    render(<ChatBox role="teacher" messages={[]} onToggleChatLock={handleToggle} />);

    const lockedBtn = screen.getByRole('button', { name: /🔒 Đang khóa chat/i });
    expect(lockedBtn).toBeDefined();
    fireEvent.click(lockedBtn);
    expect(handleToggle).toHaveBeenCalledWith(false);
  });
});
