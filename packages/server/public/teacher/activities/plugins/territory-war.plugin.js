import { jsx as _jsx } from "react/jsx-runtime";
import { TerritoryTeacherPanel } from '@educlass/activity-territory-war';
/**
 * Host Component cho hoạt động Đại Chiến Lãnh Thổ
 */
const TerritoryWarHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(TerritoryTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const territoryWarPlugin = {
    id: 'territory-war',
    name: 'Đại Chiến Lãnh Thổ',
    icon: '🏰',
    description: 'Tranh đoạt lãnh thổ chiến thuật chia 2 phe Xanh - Đỏ thời gian thực với bản đồ lâu đài và tháp canh',
    component: TerritoryWarHostComponent,
};
//# sourceMappingURL=territory-war.plugin.js.map