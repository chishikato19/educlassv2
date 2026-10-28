import type React from 'react';
/**
 * Props chuẩn mực được truyền cho mọi Host Component của tiện ích/ứng dụng
 */
export interface ActivityHostProps<TState = unknown> {
    runId: string;
    sessionId: string;
    state: TState;
    onSendIntent: (intent: unknown) => void;
    onEndActivity: () => void;
}
/**
 * Định nghĩa chuẩn của một Plugin Tiện ích/Hoạt động trên Teacher UI
 */
export interface ActivityHostPlugin<TState = unknown> {
    id: string;
    name: string;
    icon: string;
    description?: string;
    component: React.ComponentType<ActivityHostProps<TState>>;
}
//# sourceMappingURL=types.d.ts.map