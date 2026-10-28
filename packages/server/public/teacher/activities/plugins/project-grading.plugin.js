import { jsx as _jsx } from "react/jsx-runtime";
import { ProjectGradingTeacherPanel } from '@educlass/activity-project-grading';
/**
 * Host Component cho hoạt động Chấm điểm Dự án đa chiều
 */
const ProjectGradingHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(ProjectGradingTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const projectGradingPlugin = {
    id: 'project-grading',
    name: 'Chấm Điểm Dự Án',
    icon: '📋',
    description: 'Đánh giá dự án đa chiều 4 cột điểm: Tự chấm, Tổ chấm, Chéo nhóm và Giáo viên',
    component: ProjectGradingHostComponent,
};
//# sourceMappingURL=project-grading.plugin.js.map