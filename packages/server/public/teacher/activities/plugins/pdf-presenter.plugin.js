import { jsx as _jsx } from "react/jsx-runtime";
import { PdfPresenterTeacherPanel, } from '@educlass/activity-pdf-presenter';
/**
 * Host Component cho Chiếu & Chữa bài PDF/Word (Mô hình A: Cắt dãn khoảng trống)
 */
const PdfPresenterHostComponent = ({ state, onSendIntent }) => {
    return (_jsx(PdfPresenterTeacherPanel, { state: state, onSendIntent: intent => onSendIntent(intent) }));
};
export const pdfPresenterPlugin = {
    id: 'pdf-presenter',
    name: 'Chiếu & Chữa bài PDF/Word',
    icon: '📄',
    description: 'Chiếu tài liệu, chèn khoảng trống sửa bài (Mô hình A), vẽ lên đề bài và phát sóng đồng bộ cho học sinh',
    component: PdfPresenterHostComponent,
};
//# sourceMappingURL=pdf-presenter.plugin.js.map