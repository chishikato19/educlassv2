import { jsx as _jsx } from "react/jsx-runtime";
import { AssignmentTeacherPanel } from '@educlass/activity-assignment-hub';
/**
 * Host Component riêng biệt cho Thu - phát bài tập (Assignment Hub)
 */
const AssignmentHubHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(AssignmentTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const assignmentHubPlugin = {
    id: 'assignment-hub',
    name: 'Thu - phát bài tập',
    icon: '📁',
    description: 'Mở cổng thu bài tập của học sinh, tải tài liệu phát và xem trước bài nộp trực tiếp',
    component: AssignmentHubHostComponent,
};
//# sourceMappingURL=assignment-hub.plugin.js.map