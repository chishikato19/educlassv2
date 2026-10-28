import { jsx as _jsx } from "react/jsx-runtime";
import { InteractiveBoardProjectorView } from '@educlass/activity-interactive-board';
/**
 * Host Component cho Bảng Tương Tác trên Màn Chiếu Lớp Học (Cửa sổ trình chiếu độc lập)
 */
const InteractiveBoardHostComponent = ({ runId, state, onSendIntent, }) => {
    return (_jsx(InteractiveBoardProjectorView, { runId: runId, state: state, onSendIntent: onSendIntent }));
};
export const interactiveBoardPlugin = {
    id: 'interactive-board',
    name: 'Bảng Tương Tác (Màn Chiếu)',
    icon: '📌',
    description: 'Màn chiếu cộng tác và triển lãm sản phẩm học tập: chữ, nét vẽ tay, hình ảnh, chấm điểm chéo và tiêu điểm chữa bài',
    component: InteractiveBoardHostComponent,
};
//# sourceMappingURL=interactive-board.plugin.js.map