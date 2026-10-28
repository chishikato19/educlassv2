import { jsx as _jsx } from "react/jsx-runtime";
import { TeacherSessionSummaryView } from '@educlass/ui-kit';
/**
 * Giao diện Báo cáo & Tổng kết phiên học cho Giáo viên (Task 3.4 & Task 5.4)
 * Sử dụng TeacherSessionSummaryView từ @educlass/ui-kit với đầy đủ:
 * - Bục vinh danh Top 3 (Podium) & Spotlight danh hiệu mở khóa
 * - Thống kê an toàn lưu trữ EXP theo 3 cấp danh tính
 * - Chế độ Màn chiếu lớp học (Projector Mode)
 * - Bảng điểm chi tiết & Phân tích câu hỏi sai nhiều
 */
export const SessionReportView = ({ report, defaultTab, onExportExcel, onNewSession, }) => {
    return (_jsx(TeacherSessionSummaryView, { report: report, defaultTab: defaultTab, onExportExcel: onExportExcel, onNewSession: onNewSession }));
};
//# sourceMappingURL=SessionReportView.js.map