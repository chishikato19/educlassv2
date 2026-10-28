import { jsx as _jsx } from "react/jsx-runtime";
import { QuickPollTeacherPanel } from '@educlass/activity-quick-poll';
/**
 * Host Component riêng biệt cho Bình chọn nhanh (Quick Poll)
 */
const QuickPollHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(QuickPollTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const quickPollPlugin = {
    id: 'quick-poll',
    name: 'Bình chọn nhanh',
    icon: '📊',
    description: 'Thăm dò ý kiến và biểu quyết thời gian thực với biểu đồ trực quan',
    component: QuickPollHostComponent,
};
//# sourceMappingURL=quick-poll.plugin.js.map