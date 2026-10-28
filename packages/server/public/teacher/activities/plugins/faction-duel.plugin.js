import { jsx as _jsx } from "react/jsx-runtime";
import { FactionDuelTeacherPanel } from '@educlass/activity-faction-duel';
/**
 * Host Component cho Đại Chiến Xanh Đỏ (thử nghiệm)
 */
const FactionDuelHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(FactionDuelTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const factionDuelPlugin = {
    id: 'faction-duel',
    name: 'Đại Chiến Xanh Đỏ (thử nghiệm)',
    icon: '⚔️',
    description: 'Đại chiến chia 2 phe Xanh - Đỏ cân bằng theo Elo, cơ chế 15s chọn đối thủ và tính điểm trọng số lật kèo',
    component: FactionDuelHostComponent,
};
//# sourceMappingURL=faction-duel.plugin.js.map