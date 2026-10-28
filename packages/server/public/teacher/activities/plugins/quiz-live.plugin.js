import { jsx as _jsx } from "react/jsx-runtime";
import { QuizLiveTeacherPanel } from '@educlass/activity-quiz-live';
/**
 * Host Component riêng biệt cho Quiz Live (Kahoot & Quizizz)
 */
const QuizLiveHostComponent = ({ runId, state, onSendIntent, onEndActivity, }) => {
    return (_jsx(QuizLiveTeacherPanel, { runId: runId, state: state, onSendIntent: onSendIntent, onEndActivity: onEndActivity }));
};
export const quizLivePlugin = {
    id: 'quiz-live',
    name: 'Quiz Live (Kahoot & Quizizz)',
    icon: '🎮',
    description: 'Trò chơi trắc nghiệm trực tiếp dạng Kahoot hoặc Quizizz với âm thanh và bảng xếp hạng',
    component: QuizLiveHostComponent,
};
//# sourceMappingURL=quiz-live.plugin.js.map