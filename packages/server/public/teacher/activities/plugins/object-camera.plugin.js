import { jsx as _jsx } from "react/jsx-runtime";
import { ObjectCameraTeacherPanel, } from '@educlass/activity-object-camera';
/**
 * Host Component cho Tiện ích Camera vật thể
 */
const ObjectCameraHostComponent = ({ state, onSendIntent }) => {
    return (_jsx(ObjectCameraTeacherPanel, { state: state, onSendIntent: intent => onSendIntent(intent) }));
};
export const objectCameraPlugin = {
    id: 'object-camera',
    name: 'Camera vật thể',
    icon: '📷',
    description: 'Biến điện thoại thành máy chiếu vật thể thông minh. Quét mã QR chụp bài, xoay cắt zoom, sửa bài trực tiếp và đồng bộ tới học sinh & máy chiếu.',
    component: ObjectCameraHostComponent,
};
//# sourceMappingURL=object-camera.plugin.js.map