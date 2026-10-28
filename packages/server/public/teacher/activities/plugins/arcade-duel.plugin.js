import { jsx as _jsx } from "react/jsx-runtime";
import { ArcadeDuelTeacherPanel, } from '@educlass/activity-arcade-duel';
/**
 * Host Component cho hoạt động Đối Kháng 1vs1
 */
const ArcadeDuelHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(ArcadeDuelTeacherPanel, { runId: runId, initialState: state, config: state ? state.config : undefined, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const arcadeDuelPlugin = {
    id: 'arcade-duel',
    name: 'Đối Kháng 1vs1',
    icon: '⚔️',
    description: 'Đấu trường 1-1 trên màn hình GV với 2 chế độ (cùng trả lời / tốc độ), bàn phím chia đôi và hệ thống vật phẩm',
    component: ArcadeDuelHostComponent,
};
//# sourceMappingURL=arcade-duel.plugin.js.map