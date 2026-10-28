import React from 'react';
import type { ActivityMeta, ClassDto, ParticipantDto, SessionDetailResponse, StudentDto } from '@educlass/protocol';
export interface ActiveRunData<St = unknown, Cfg = unknown> {
    runId: string;
    activityId: string;
    state: St;
    config?: Cfg;
}
export interface QuestionSetSummary {
    id: string;
    title: string;
    subject?: string;
    grade?: number;
    questionCount?: number;
    tags?: string[];
}
export interface ActivityPanelProps {
    activities: ActivityMeta[];
    activeRun: ActiveRunData | null;
    activeRuns?: ActiveRunData[];
    onSelectActiveRun?: (runId: string) => void;
    questionSets?: QuestionSetSummary[];
    onLoadQuestionSet?: (id: string) => Promise<unknown>;
    isLoading?: boolean;
    onOpenActivityWindow?: () => void;
    onStartActivity: (activityId: string, config: unknown) => Promise<void> | void;
    onSendTeacherIntent: (intent: unknown) => void;
    onEndActivity: (runId: string) => Promise<void> | void;
    participants?: ParticipantDto[];
    students?: StudentDto[];
    classes?: ClassDto[];
    activeSession?: SessionDetailResponse | null;
}
export interface TeacherPanelComponentProps<St = unknown> {
    runId: string;
    state: St;
    onSendIntent: (intent: unknown) => void;
    onEndActivity: () => void;
}
/**
 * Đăng ký thêm Client Teacher Panel mới vào ActivityPanel
 */
export declare function registerTeacherPanel(activityId: string, panelComponent: React.ComponentType<TeacherPanelComponentProps<never>>): void;
/**
 * ActivityPanel - Bảng điều khiển Hoạt động & Trò chơi dành cho Giáo viên
 */
export declare const ActivityPanel: React.FC<ActivityPanelProps>;
//# sourceMappingURL=ActivityPanel.d.ts.map