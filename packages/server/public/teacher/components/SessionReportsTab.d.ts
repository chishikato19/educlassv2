import React from 'react';
import type { SessionDetailResponse, SessionReportDto, SessionReportSnapshot, SessionStudentScoreItem } from '@educlass/protocol';
export interface SessionReportsTabProps {
    activeSession?: SessionDetailResponse | null | undefined;
    currentSessionReport?: SessionReportDto | null | undefined;
    onNewSession?: (() => void) | undefined;
    onExportExcel?: ((sessionId: string) => void) | undefined;
}
export interface QuizReportEntry {
    key: string;
    type: 'quiz_run' | 'session_total';
    sessionId: string;
    sessionCode: string;
    className: string;
    runId?: string | undefined;
    runIndex?: number | undefined;
    title: string;
    timeStr: string;
    timestamp: number;
    totalParticipants: number;
    averageScore: number;
    averageAccuracy: number;
    totalQuestions: number;
    scoreboard: SessionStudentScoreItem[];
    isActive?: boolean | undefined;
    snapshot?: SessionReportSnapshot | undefined;
}
export declare const SessionReportsTab: React.FC<SessionReportsTabProps>;
//# sourceMappingURL=SessionReportsTab.d.ts.map