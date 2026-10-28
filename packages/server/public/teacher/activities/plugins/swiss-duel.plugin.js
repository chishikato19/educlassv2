import { jsx as _jsx } from "react/jsx-runtime";
import { SwissDuelTeacherPanel } from '@educlass/activity-swiss-duel';
/**
 * Host Component riêng biệt cho Đấu Cờ Thụy Sỹ (Swiss Duel)
 */
const SwissDuelHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(SwissDuelTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const swissDuelPlugin = {
    id: 'swiss-duel',
    name: 'Đấu Cờ Thụy Sỹ',
    icon: '♟️',
    description: 'Đấu trí đối kháng 1v1 theo thể thức Thụy Sỹ cổ điển: so tài 2 câu/vòng, thắng 2đ, hòa 1đ',
    component: SwissDuelHostComponent,
};
//# sourceMappingURL=swiss-duel.plugin.js.map