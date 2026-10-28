import React from 'react';
import type { ClassDto, CreateSessionRequest, ParticipantDto, SessionDetailResponse, SessionReportDto, ChatMessageDto, ChatMode, HandRaiseItem } from '@educlass/protocol';
export interface SessionControlProps {
    classes: ClassDto[];
    activeSession?: SessionDetailResponse | null | undefined;
    participants?: ParticipantDto[] | undefined;
    sessionReport?: SessionReportDto | null | undefined;
    chatMessages?: ChatMessageDto[] | undefined;
    handRaises?: HandRaiseItem[] | undefined;
    chatLocked?: boolean | undefined;
    chatMode?: ChatMode | undefined;
    onOpenSession: (req: CreateSessionRequest) => Promise<void> | void;
    onCloseSession: (sessionId: string) => Promise<void> | void;
    onReleaseParticipant?: ((participantId: string) => Promise<void> | void) | undefined;
    onGrantReward?: ((participantId: string, exp: number, reason: string) => Promise<void> | void) | undefined;
    onResetReport?: (() => void) | undefined;
    onExportExcel?: ((sessionId: string) => Promise<void> | void) | undefined;
    onSendChatMessage?: ((payload: {
        content: string;
        toParticipantId?: string | null;
    }) => Promise<void> | void) | undefined;
    onToggleChatLock?: ((locked: boolean) => Promise<void> | void) | undefined;
    onChangeChatMode?: ((mode: ChatMode) => Promise<void> | void) | undefined;
    onResolveHandRaise?: ((handRaiseId: string) => Promise<void> | void) | undefined;
    hasActiveExam?: boolean | undefined;
    activeExamTitle?: string | undefined;
    activeExamBatch?: number | undefined;
}
export declare const SessionControl: React.FC<SessionControlProps>;
//# sourceMappingURL=SessionControl.d.ts.map