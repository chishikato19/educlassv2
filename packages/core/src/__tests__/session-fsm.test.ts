import { describe, expect, it } from 'vitest';
import type { SessionStatus } from '@educlass/protocol';
import {
  canAcceptParticipants,
  canTransition,
  getAllowedEvents,
  getNextStatus,
  isSessionActive,
  isSessionClosed,
  isSessionClosing,
  SESSION_TRANSITION_TABLE,
  type SessionFsmEvent,
  type SessionFsmState,
  SessionTransitionError,
  transitionSession,
  tryTransitionSession,
} from '../session/session-fsm.js';

describe('Session FSM - State Transition Table (Task 1.4)', () => {
  const baseOpenState: SessionFsmState = Object.freeze({
    id: 'session_01',
    ownerId: 'teacher_01',
    classId: 'class_01',
    joinCode: '654321',
    status: 'open',
    identityMode: 'roster_only',
    allowTeams: false,
    openedAt: 1000,
  });

  const baseClosingState: SessionFsmState = Object.freeze({
    ...baseOpenState,
    status: 'closing',
    closingAt: 2000,
    closeReason: 'Giáo viên bấm kết thúc tiết học',
  });

  const baseClosedState: SessionFsmState = Object.freeze({
    ...baseClosingState,
    status: 'closed',
    closedAt: 3000,
    reportSnapshotId: 'snapshot_99',
  });

  describe('Ma trận chuyển trạng thái đầy đủ (State Transition Matrix)', () => {
    // Định nghĩa bảng ma trận kỳ vọng: [CurrentStatus, EventType, ExpectedStatusOrError]
    const transitionMatrix: Array<{
      currentStatus: SessionStatus;
      event: SessionFsmEvent;
      expectedSuccess: boolean;
      expectedNextStatus?: SessionStatus;
    }> = [
      // 1. Từ trạng thái 'open'
      {
        currentStatus: 'open',
        event: { type: 'INITIATE_CLOSING', timestamp: 1500, reason: 'Hết giờ làm bài' },
        expectedSuccess: true,
        expectedNextStatus: 'closing',
      },
      {
        currentStatus: 'open',
        event: { type: 'FORCE_CLOSE', timestamp: 1600, reason: 'Hủy phiên đột xuất' },
        expectedSuccess: true,
        expectedNextStatus: 'closed',
      },
      {
        currentStatus: 'open',
        event: { type: 'COMPLETE_CLOSING', timestamp: 1500, reportSnapshotId: 'rep_1' },
        expectedSuccess: false,
      },

      // 2. Từ trạng thái 'closing'
      {
        currentStatus: 'closing',
        event: { type: 'COMPLETE_CLOSING', timestamp: 2500, reportSnapshotId: 'rep_final' },
        expectedSuccess: true,
        expectedNextStatus: 'closed',
      },
      {
        currentStatus: 'closing',
        event: { type: 'FORCE_CLOSE', timestamp: 2600, reason: 'Buộc đóng ngay' },
        expectedSuccess: true,
        expectedNextStatus: 'closed',
      },
      {
        currentStatus: 'closing',
        event: { type: 'INITIATE_CLOSING', timestamp: 2200 },
        expectedSuccess: false,
      },

      // 3. Từ trạng thái 'closed' (Terminal state - không nhận bất kỳ event nào)
      {
        currentStatus: 'closed',
        event: { type: 'INITIATE_CLOSING', timestamp: 3500 },
        expectedSuccess: false,
      },
      {
        currentStatus: 'closed',
        event: { type: 'COMPLETE_CLOSING', timestamp: 3500 },
        expectedSuccess: false,
      },
      {
        currentStatus: 'closed',
        event: { type: 'FORCE_CLOSE', timestamp: 3500 },
        expectedSuccess: false,
      },
    ];

    it.each(transitionMatrix)(
      'Kiểm tra $currentStatus với $event.type -> success: $expectedSuccess',
      ({ currentStatus, event, expectedSuccess, expectedNextStatus }) => {
        // Kiểm tra hàm thuần túy canTransition
        expect(canTransition(currentStatus, event.type)).toBe(expectedSuccess);

        // Kiểm tra hàm getNextStatus
        if (expectedSuccess) {
          expect(getNextStatus(currentStatus, event.type)).toBe(expectedNextStatus);
        } else {
          expect(getNextStatus(currentStatus, event.type)).toBeNull();
        }

        // Chọn state khởi đầu phù hợp với currentStatus
        const stateMap: Record<SessionStatus, SessionFsmState> = {
          open: baseOpenState,
          closing: baseClosingState,
          closed: baseClosedState,
        };
        const currentState = stateMap[currentStatus]!;

        if (expectedSuccess) {
          const nextState = transitionSession(currentState, event);
          expect(nextState.status).toBe(expectedNextStatus);

          const result = tryTransitionSession(currentState, event);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.state.status).toBe(expectedNextStatus);
          }
        } else {
          expect(() => transitionSession(currentState, event)).toThrowError(SessionTransitionError);

          const result = tryTransitionSession(currentState, event);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe('INVALID_TRANSITION');
            expect(result.error.attemptedEvent).toBe(event.type);
            expect(result.error.currentStatus).toBe(currentStatus);
          }
        }
      }
    );
  });

  describe('Chi tiết luồng đóng phiên chuẩn: open -> closing -> closed', () => {
    it('thực hiện tuần tự 2 bước đóng phiên và lưu giữ đầy đủ thông tin metadata', () => {
      // Bước 1: GV yêu cầu đóng phiên (open -> closing)
      const closingEvent: SessionFsmEvent = {
        type: 'INITIATE_CLOSING',
        timestamp: 1200,
        reason: 'Hết giờ tiết 4',
      };
      const closingState = transitionSession(baseOpenState, closingEvent);

      expect(closingState.status).toBe('closing');
      expect(closingState.closingAt).toBe(1200);
      expect(closingState.closeReason).toBe('Hết giờ tiết 4');
      expect(closingState.closedAt).toBeUndefined();

      // Bước 2: Server hoàn tất tạo báo cáo tổng kết snapshot (closing -> closed)
      const completeEvent: SessionFsmEvent = {
        type: 'COMPLETE_CLOSING',
        timestamp: 1300,
        reportSnapshotId: 'snapshot_report_abc123',
      };
      const closedState = transitionSession(closingState, completeEvent);

      expect(closedState.status).toBe('closed');
      expect(closedState.closingAt).toBe(1200);
      expect(closedState.closedAt).toBe(1300);
      expect(closedState.closeReason).toBe('Hết giờ tiết 4');
      expect(closedState.reportSnapshotId).toBe('snapshot_report_abc123');
    });

    it('hỗ trợ FORCE_CLOSE từ open trực tiếp sang closed', () => {
      const forceCloseEvent: SessionFsmEvent = {
        type: 'FORCE_CLOSE',
        timestamp: 1500,
        reason: 'Mất điện đột ngột',
      };
      const closedState = transitionSession(baseOpenState, forceCloseEvent);

      expect(closedState.status).toBe('closed');
      expect(closedState.closingAt).toBe(1500);
      expect(closedState.closedAt).toBe(1500);
      expect(closedState.closeReason).toBe('Mất điện đột ngột');
    });
  });

  describe('Tính bất biến dữ liệu (Immutability)', () => {
    it('không làm thay đổi (mutate) object trạng thái ban đầu', () => {
      const originalOpenedAt = baseOpenState.openedAt;
      const nextState = transitionSession(baseOpenState, {
        type: 'INITIATE_CLOSING',
        timestamp: 1500,
      });

      expect(baseOpenState.status).toBe('open');
      expect(baseOpenState.openedAt).toBe(originalOpenedAt);
      expect(nextState).not.toBe(baseOpenState);
      expect(Object.isFrozen(nextState)).toBe(true);
    });
  });

  describe('Kiểm tra tính nhất quán của mốc thời gian (Timestamp Validation)', () => {
    it('từ chối sự kiện có timestamp nhỏ hơn openedAt', () => {
      expect(() =>
        transitionSession(baseOpenState, {
          type: 'INITIATE_CLOSING',
          timestamp: 500, // Nhỏ hơn openedAt (1000)
        })
      ).toThrowError(/không thể nhỏ hơn thời điểm mở phiên/i);
    });

    it('từ chối COMPLETE_CLOSING có timestamp nhỏ hơn closingAt', () => {
      expect(() =>
        transitionSession(baseClosingState, {
          type: 'COMPLETE_CLOSING',
          timestamp: 1500, // Nhỏ hơn closingAt (2000)
        })
      ).toThrowError(/không thể nhỏ hơn thời điểm bắt đầu đóng phiên/i);
    });
  });

  describe('Các hàm truy vấn trạng thái nghiệp vụ (Helper Queries)', () => {
    it('canAcceptParticipants: chỉ chấp nhận khi phiên đang open', () => {
      expect(canAcceptParticipants('open')).toBe(true);
      expect(canAcceptParticipants('closing')).toBe(false);
      expect(canAcceptParticipants('closed')).toBe(false);
    });

    it('isSessionActive: true khi open hoặc closing', () => {
      expect(isSessionActive('open')).toBe(true);
      expect(isSessionActive('closing')).toBe(true);
      expect(isSessionActive('closed')).toBe(false);
    });

    it('isSessionClosing: chỉ true khi closing', () => {
      expect(isSessionClosing('open')).toBe(false);
      expect(isSessionClosing('closing')).toBe(true);
      expect(isSessionClosing('closed')).toBe(false);
    });

    it('isSessionClosed: chỉ true khi closed', () => {
      expect(isSessionClosed('open')).toBe(false);
      expect(isSessionClosed('closing')).toBe(false);
      expect(isSessionClosed('closed')).toBe(true);
    });

    it('getAllowedEvents: trả về danh sách event hợp lệ chính xác theo bảng chuyển trạng thái', () => {
      expect(getAllowedEvents('open')).toEqual(['INITIATE_CLOSING', 'FORCE_CLOSE']);
      expect(getAllowedEvents('closing')).toEqual(['COMPLETE_CLOSING', 'FORCE_CLOSE']);
      expect(getAllowedEvents('closed')).toEqual([]);
    });

    it('SESSION_TRANSITION_TABLE định nghĩa đúng cấu trúc trạng thái', () => {
      expect(SESSION_TRANSITION_TABLE.open?.INITIATE_CLOSING).toBe('closing');
      expect(SESSION_TRANSITION_TABLE.open?.FORCE_CLOSE).toBe('closed');
      expect(SESSION_TRANSITION_TABLE.closing?.COMPLETE_CLOSING).toBe('closed');
      expect(SESSION_TRANSITION_TABLE.closing?.FORCE_CLOSE).toBe('closed');
      expect(Object.keys(SESSION_TRANSITION_TABLE.closed ?? {})).toHaveLength(0);
    });
  });
});
