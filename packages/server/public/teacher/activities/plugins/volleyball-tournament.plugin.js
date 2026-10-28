import { jsx as _jsx } from "react/jsx-runtime";
import { VolleyballTeacherPanel } from '@educlass/activity-volleyball-tournament';
/**
 * Host Component cho Giải Đấu Bóng Chuyền (thử nghiệm)
 */
const VolleyballTournamentHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(VolleyballTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const volleyballTournamentPlugin = {
    id: 'volleyball-tournament',
    name: 'Đấu Bóng Chuyền (thử nghiệm)',
    icon: '🏐',
    description: 'Thi đấu vòng bảng và bắt cặp xếp hạng 4 Cúp phân tầng theo thể thức bóng chuyền chuyên nghiệp',
    component: VolleyballTournamentHostComponent,
};
//# sourceMappingURL=volleyball-tournament.plugin.js.map