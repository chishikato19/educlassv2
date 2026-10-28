import { jsx as _jsx } from "react/jsx-runtime";
import { ExamTeacherPanel } from '@educlass/activity-exam';
/**
 * Host Component riêng biệt cho Kỳ thi (Exam)
 */
const ExamHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(ExamTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const examPlugin = {
    id: 'exam',
    name: 'Kỳ thi Trực tiếp',
    icon: '📝',
    description: 'Tổ chức kỳ thi với đồng hồ đếm ngược, xáo đề, giám sát làm bài và xuất Excel',
    component: ExamHostComponent,
};
//# sourceMappingURL=exam.plugin.js.map