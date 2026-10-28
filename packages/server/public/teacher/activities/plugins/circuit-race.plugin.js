import { jsx as _jsx } from "react/jsx-runtime";
import { CircuitTeacherPanel } from '@educlass/activity-circuit-race';
/**
 * Host Component cho hoạt động Đường Đua Tri Thức
 */
const CircuitRaceHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(CircuitTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const circuitRacePlugin = {
    id: 'circuit-race',
    name: 'Đường Đua Tri Thức',
    icon: '🏎️',
    description: 'Trò chơi đua cờ đường đua gamification tương tác thời gian thực với thẻ bổ trợ và xúc xắc',
    component: CircuitRaceHostComponent,
};
//# sourceMappingURL=circuit-race.plugin.js.map