import React from 'react';
import type { SessionReportDto } from '@educlass/protocol';
export interface SessionReportViewProps {
    report: SessionReportDto;
    defaultTab?: 'gamification' | 'scoreboard' | 'difficult' | undefined;
    onExportExcel?: ((sessionId: string) => Promise<void> | void) | undefined;
    onNewSession?: (() => void) | undefined;
}
/**
 * Giao diện Báo cáo & Tổng kết phiên học cho Giáo viên (Task 3.4 & Task 5.4)
 * Sử dụng TeacherSessionSummaryView từ @educlass/ui-kit với đầy đủ:
 * - Bục vinh danh Top 3 (Podium) & Spotlight danh hiệu mở khóa
 * - Thống kê an toàn lưu trữ EXP theo 3 cấp danh tính
 * - Chế độ Màn chiếu lớp học (Projector Mode)
 * - Bảng điểm chi tiết & Phân tích câu hỏi sai nhiều
 */
export declare const SessionReportView: React.FC<SessionReportViewProps>;
//# sourceMappingURL=SessionReportView.d.ts.map