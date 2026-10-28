import type { IdentityMode, SessionFsmEventType, SessionStatus } from '@educlass/protocol';

/**
 * Trạng thái đầy đủ của Phiên học trong máy trạng thái hữu hạn (FSM)
 */
export interface SessionFsmState {
  readonly id: string;
  readonly ownerId: string;
  readonly classId?: string | undefined;
  readonly joinCode: string;
  readonly status: SessionStatus;
  readonly identityMode: IdentityMode;
  readonly allowTeams: boolean;
  readonly openedAt: number;
  readonly closingAt?: number | undefined;
  readonly closedAt?: number | undefined;
  readonly closeReason?: string | undefined;
  readonly reportSnapshotId?: string | undefined;
}

/**
 * Các sự kiện chuyển trạng thái trong Session FSM
 */
export type SessionFsmEvent =
  | {
      readonly type: 'INITIATE_CLOSING';
      readonly timestamp: number;
      readonly reason?: string | undefined;
    }
  | {
      readonly type: 'COMPLETE_CLOSING';
      readonly timestamp: number;
      readonly reportSnapshotId?: string | undefined;
    }
  | {
      readonly type: 'FORCE_CLOSE';
      readonly timestamp: number;
      readonly reason?: string | undefined;
    };

/**
 * Bảng chuyển trạng thái chuẩn (State Transition Table) cho Session FSM
 * Quy định rõ trạng thái kế tiếp từ mỗi trạng thái hiện tại ứng với từng loại sự kiện.
 */
export const SESSION_TRANSITION_TABLE: Record<
  SessionStatus,
  Readonly<Partial<Record<SessionFsmEventType, SessionStatus>>>
> = {
  open: {
    INITIATE_CLOSING: 'closing',
    FORCE_CLOSE: 'closed',
  },
  closing: {
    COMPLETE_CLOSING: 'closed',
    FORCE_CLOSE: 'closed',
  },
  closed: {},
};

/**
 * Lỗi chuyển trạng thái FSM không hợp lệ
 */
export class SessionTransitionError extends Error {
  readonly currentStatus: SessionStatus;
  readonly attemptedEvent: SessionFsmEventType;
  readonly allowedEvents: readonly SessionFsmEventType[];
  readonly code: 'INVALID_TRANSITION' | 'INVALID_TIMESTAMP';

  constructor(
    message: string,
    currentStatus: SessionStatus,
    attemptedEvent: SessionFsmEventType,
    allowedEvents: readonly SessionFsmEventType[],
    code: 'INVALID_TRANSITION' | 'INVALID_TIMESTAMP' = 'INVALID_TRANSITION'
  ) {
    super(message);
    this.name = 'SessionTransitionError';
    this.currentStatus = currentStatus;
    this.attemptedEvent = attemptedEvent;
    this.allowedEvents = allowedEvents;
    this.code = code;
  }
}

/**
 * Lấy danh sách các sự kiện được phép kích hoạt từ trạng thái hiện tại
 */
export function getAllowedEvents(status: SessionStatus): readonly SessionFsmEventType[] {
  const transitions = SESSION_TRANSITION_TABLE[status] ?? {};
  return Object.keys(transitions) as SessionFsmEventType[];
}

/**
 * Kiểm tra xem một sự kiện có được phép chuyển từ trạng thái hiện tại hay không
 */
export function canTransition(status: SessionStatus, eventType: SessionFsmEventType): boolean {
  return SESSION_TRANSITION_TABLE[status]?.[eventType] !== undefined;
}

/**
 * Lấy trạng thái kế tiếp nếu chuyển đổi hợp lệ, hoặc null nếu không hợp lệ
 */
export function getNextStatus(
  status: SessionStatus,
  eventType: SessionFsmEventType
): SessionStatus | null {
  return SESSION_TRANSITION_TABLE[status]?.[eventType] ?? null;
}

/**
 * Kiểm tra xem phiên có đang chấp nhận học sinh mới tham gia hay không
 * (Chỉ cho phép khi phiên đang ở trạng thái 'open')
 */
export function canAcceptParticipants(status: SessionStatus): boolean {
  return status === 'open';
}

/**
 * Kiểm tra xem phiên có đang hoạt động (chưa kết thúc hoàn toàn) hay không
 */
export function isSessionActive(status: SessionStatus): boolean {
  return status === 'open' || status === 'closing';
}

/**
 * Kiểm tra xem phiên có đang trong tiến trình đóng (tạo snapshot/báo cáo) hay không
 */
export function isSessionClosing(status: SessionStatus): boolean {
  return status === 'closing';
}

/**
 * Kiểm tra xem phiên đã kết thúc hoàn toàn (trạng thái terminal) hay chưa
 */
export function isSessionClosed(status: SessionStatus): boolean {
  return status === 'closed';
}

/**
 * Thực hiện chuyển trạng thái phiên (Hàm thuần túy, bất biến)
 * Ném SessionTransitionError nếu sự kiện không hợp lệ hoặc timestamp vi phạm thứ tự thời gian.
 */
export function transitionSession(
  currentState: Readonly<SessionFsmState>,
  event: Readonly<SessionFsmEvent>
): SessionFsmState {
  const nextStatus = getNextStatus(currentState.status, event.type);
  const allowed = getAllowedEvents(currentState.status);

  if (!nextStatus) {
    throw new SessionTransitionError(
      `Không thể thực hiện sự kiện '${event.type}' khi phiên đang ở trạng thái '${currentState.status}'. Các sự kiện hợp lệ: [${allowed.join(', ')}]`,
      currentState.status,
      event.type,
      allowed,
      'INVALID_TRANSITION'
    );
  }

  // Kiểm tra tính nhất quán của thời gian
  if (event.timestamp < currentState.openedAt) {
    throw new SessionTransitionError(
      `Thời điểm thực hiện sự kiện (${event.timestamp}) không thể nhỏ hơn thời điểm mở phiên (${currentState.openedAt}).`,
      currentState.status,
      event.type,
      allowed,
      'INVALID_TIMESTAMP'
    );
  }

  if (currentState.closingAt !== undefined && event.timestamp < currentState.closingAt) {
    throw new SessionTransitionError(
      `Thời điểm kết thúc phiên (${event.timestamp}) không thể nhỏ hơn thời điểm bắt đầu đóng phiên (${currentState.closingAt}).`,
      currentState.status,
      event.type,
      allowed,
      'INVALID_TIMESTAMP'
    );
  }

  // Xây dựng trạng thái mới dựa trên loại sự kiện
  switch (event.type) {
    case 'INITIATE_CLOSING': {
      return Object.freeze({
        ...currentState,
        status: nextStatus,
        closingAt: event.timestamp,
        closeReason: event.reason ?? currentState.closeReason,
      });
    }

    case 'COMPLETE_CLOSING': {
      return Object.freeze({
        ...currentState,
        status: nextStatus,
        closedAt: event.timestamp,
        reportSnapshotId: event.reportSnapshotId ?? currentState.reportSnapshotId,
      });
    }

    case 'FORCE_CLOSE': {
      return Object.freeze({
        ...currentState,
        status: nextStatus,
        closingAt: currentState.closingAt ?? event.timestamp,
        closedAt: event.timestamp,
        closeReason: event.reason ?? currentState.closeReason ?? 'Buộc đóng phiên',
      });
    }
  }
}

/**
 * Thực hiện chuyển trạng thái an toàn (trả về kiểu Result, không ném exception)
 */
export function tryTransitionSession(
  currentState: Readonly<SessionFsmState>,
  event: Readonly<SessionFsmEvent>
):
  | { readonly success: true; readonly state: SessionFsmState }
  | { readonly success: false; readonly error: SessionTransitionError } {
  try {
    const nextState = transitionSession(currentState, event);
    return { success: true, state: nextState };
  } catch (err) {
    if (err instanceof SessionTransitionError) {
      return { success: false, error: err };
    }
    throw err;
  }
}
